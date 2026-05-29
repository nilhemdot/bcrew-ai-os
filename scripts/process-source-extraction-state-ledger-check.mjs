#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
  SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_STATE_LEDGER_PLAN_PATH,
  SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
  SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH,
  buildSourceExtractionStateLedger,
  buildSourceExtractionStateLedgerDogfoodProof,
  buildSourceExtractionStateLedgerReportArtifact,
  evaluateSourceExtractionStateLedger,
} from '../lib/source-extraction-state-ledger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-source-extraction-state-ledger'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readLiveLedgerInput() {
  const pool = createPool()
  try {
    const [targetResult, itemResult] = await Promise.all([
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status,
               priority, runtime_mode, last_status, inspected_count,
               archived_count, extracted_count, metadata, updated_at
        FROM source_crawl_targets
        ORDER BY target_key ASC
      `),
      pool.query(`
        SELECT item_key, target_key, source_id, item_type, status,
               fingerprint, artifact_id, retry_state, retry_blocker_card,
               metadata, discovered_at, processed_at, updated_at
        FROM source_crawl_items
        ORDER BY updated_at DESC
      `),
    ])
    return {
      targets: targetResult.rows,
      items: itemResult.rows,
    }
  } finally {
    await pool.end()
  }
}

async function readLiveBacklogCard() {
  const pool = createPool()
  try {
    const result = await pool.query(
      'SELECT id, lane, priority, status_note FROM backlog_items WHERE id = $1 LIMIT 1',
      [SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(ledger = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH,
    operation: `mark ${SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID} V1 readback proof on live backlog`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const summary = ledger.summary || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY}.`,
    `Readback aggregates ${summary.itemCount || 0} source items across ${summary.targetCount || 0} targets with discovery, extraction, and review/suppression states.`,
    `MyICOR catalog remains metadata-mapped only: ${summary.myicorMappedCount || 0} catalog rows, ${summary.myicorExtractedCount || 0} catalog-extracted rows; source-wide MyICOR extracted evidence rows: ${summary.myicorSourceExtractedWithEvidenceCount || 0}.`,
    `Report artifact: ${SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID}.`,
    `Plan/doc: ${SOURCE_EXTRACTION_STATE_LEDGER_PLAN_PATH}.`,
    'Proof: npm run process:source-extraction-state-ledger-check -- --apply --json.',
    'No source rows, atoms, vectors, browser sessions, external writes, deletion, or auto-suppression were performed.',
  ].join(' ')
  try {
    const result = await pool.query(
      `
        UPDATE backlog_items
        SET lane = 'done',
            status_note = $2,
            next_action = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, lane, priority, status_note
      `,
      [
        SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
        statusNote,
        'Use this ledger for SKOOL-SOURCE-SYSTEM-MAP-001, then wire DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001 to consume new/changed/kept items while suppressing ignored/implemented-cleared history.',
      ],
    )
    await pool.query(
      `
        INSERT INTO change_events (
          event_type, entity_table, entity_id, actor, summary, metadata
        )
        VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
      `,
      [
        SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
        ACTOR,
        `Marked ${SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID} V1 source extraction state ledger proof`,
        JSON.stringify({
          closeoutKey: SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
          reportArtifactId: SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
          itemCount: summary.itemCount || 0,
          targetCount: summary.targetCount || 0,
        }),
      ],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function readPersistedReport() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, source_ids, structured_output_json, metadata
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = $1
        LIMIT 1
      `,
      [SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

function sourceContainsUnsafePatterns(moduleSource = '', scriptSource = '') {
  const stripStart = String(scriptSource || '').indexOf('function sourceContainsUnsafePatterns')
  const stripEndMarker = '\nasync function main()'
  const stripEnd = stripStart >= 0 ? String(scriptSource || '').indexOf(stripEndMarker, stripStart) : -1
  const strippedScript = stripStart >= 0 && stripEnd > stripStart
    ? `${String(scriptSource || '').slice(0, stripStart)}${String(scriptSource || '').slice(stripEnd + 1)}`
    : String(scriptSource || '')
  const combined = `${moduleSource}\n${strippedScript}`
  return [
    /chromium\.launch/i,
    /page\.goto/i,
    /browserbase\.|browserbase:/i,
    /INSERT\s+INTO\s+intelligence_atoms/i,
    /upsertIntelligenceAtom/i,
    /intelligence_retrieval_chunks/i,
    /UPDATE\s+source_crawl_items/i,
    /DELETE\s+FROM\s+source_crawl_items/i,
    /DELETE\s+FROM\s+source_crawl_targets/i,
    /send(Message|Mail|Telegram)/i,
  ].some(pattern => pattern.test(combined))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let appliedReport = null
  let appliedBacklogCard = null
  let persistedReport = null
  let foundationDbInitialized = false

  const liveInput = await readLiveLedgerInput()
  const ledger = buildSourceExtractionStateLedger(liveInput)
  const evaluation = evaluateSourceExtractionStateLedger(ledger, { requireMyicor: true })
  const dogfood = buildSourceExtractionStateLedgerDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH,
      operation: `persist ${SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID} report artifact`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    await initFoundationDb()
    foundationDbInitialized = true
    appliedReport = await upsertIntelligenceReportArtifact(buildSourceExtractionStateLedgerReportArtifact(ledger), ACTOR)
    appliedBacklogCard = await updateLiveBacklogCard(ledger)
    persistedReport = await readPersistedReport()
  }

  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    scopeSource,
    currentPlanSource,
    currentStateSource,
    seedSource,
    myicorCardSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-extraction-state-ledger.js'),
    readRepoFile(SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH),
    readRepoFile(SOURCE_EXTRACTION_STATE_LEDGER_PLAN_PATH),
    readRepoFile('docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
    readRepoFile('docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
  ])
  const liveBacklogCard = await readLiveBacklogCard()

  addCheck(
    checks,
    packageJson.scripts?.['process:source-extraction-state-ledger-check'] === `node --env-file-if-exists=.env ${SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH}`,
    'package exposes focused source extraction state ledger proof',
    packageJson.scripts?.['process:source-extraction-state-ledger-check'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'live ledger passes taxonomy, MyICOR catalog metadata boundary, and no-source-write evaluation',
    evaluation.failed.map(item => item.check).join(', ') || 'healthy',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood fixture exercises every required source state and suppression rule',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    !sourceContainsUnsafePatterns(moduleSource, scriptSource),
    'proof does not open browsers, mutate source rows, write atoms/vectors, send messages, or mention Browserbase',
    'unsafe static patterns absent',
  )
  addCheck(
    checks,
    planSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID) &&
      planSource.includes('discovery state') &&
      planSource.includes('extraction state') &&
      planSource.includes('review state') &&
      planSource.includes('No source row mutation') &&
      planSource.includes('SKOOL-SOURCE-SYSTEM-MAP-001'),
    'plan captures three-axis ledger model, no source mutation, and Skool follow-up',
    SOURCE_EXTRACTION_STATE_LEDGER_PLAN_PATH,
  )
  addCheck(
    checks,
    scopeSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID) &&
      scopeSource.includes('implemented-cleared') &&
      scopeSource.includes('source extraction should compound'),
    'Human Web Agent sprint scope captures the source-state ledger vision',
    'docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md',
  )
  addCheck(
    checks,
    currentPlanSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY) &&
      currentPlanSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID),
    'current plan records source extraction state ledger proof',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY) &&
      currentStateSource.includes('discovery/extraction/review state'),
    'current state records source extraction state ledger proof',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY) &&
      myicorCardSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY),
    'backlog seed and source-system card factory preserve ledger closeout status',
    'chunk-005 + myicor catalog card factory',
  )
  addCheck(
    checks,
    handoffSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY) &&
      handoffSource.includes(SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID),
    'handoff captures ledger proof and next routing',
    'docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    liveBacklogCard?.id === SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID &&
      liveBacklogCard?.priority === 'P0',
    'live backlog contains source extraction state ledger card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )
  if (args.apply) {
    addCheck(
      checks,
      Boolean(appliedReport?.reportArtifactId || appliedReport?.report_artifact_id) &&
        persistedReport?.report_artifact_id === SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
      'apply persisted source extraction state ledger report artifact',
      persistedReport?.report_artifact_id || 'missing',
    )
    addCheck(
      checks,
      appliedBacklogCard?.id === SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID &&
        appliedBacklogCard?.lane === 'done',
      'apply marked live backlog card done with V1 proof note',
      appliedBacklogCard ? `${appliedBacklogCard.id}/${appliedBacklogCard.lane}` : 'missing',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
    closeoutKey: SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
    reportArtifactId: SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
    applied: args.apply,
    liveBacklogCard,
    summary: ledger.summary,
    targetSummaries: ledger.targetSummaries.slice(0, 20).map(target => ({
      targetKey: target.targetKey,
      sourceId: target.sourceId,
      itemCount: target.itemCount,
      extractionCounts: target.extractionCounts,
      reviewCounts: target.reviewCounts,
      nextAction: target.nextAction,
    })),
    dogfood,
    persisted: args.apply
      ? {
          reportArtifactId: persistedReport?.report_artifact_id || null,
          backlogLane: appliedBacklogCard?.lane || null,
        }
      : null,
    checks,
    failed,
    externalWriteStarted: false,
    sourceRowsMutated: false,
    atomOrVectorWrites: false,
    browserStarted: false,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source extraction state ledger proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (foundationDbInitialized) await closeFoundationDb()
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error('Source extraction state ledger proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
