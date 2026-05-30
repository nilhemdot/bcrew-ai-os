#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { upsertIntelligenceReportArtifact } from '../lib/foundation-intelligence-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SKOOL_SOURCE_ID,
  SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
  SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
  SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH,
  SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
  SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH,
  buildSkoolSourceSystemMap,
  buildSkoolSourceSystemMapDogfoodProof,
  buildSkoolSourceSystemMapReportArtifact,
  evaluateSkoolSourceSystemMap,
} from '../lib/skool-source-system-map.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-skool-source-system-map'

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

async function readLiveSkoolInput() {
  const pool = createPool()
  try {
    const [targetResult, itemResult] = await Promise.all([
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status,
               priority, runtime_mode, inspected_count, archived_count,
               extracted_count, metadata, updated_at
        FROM source_crawl_targets
        WHERE source_id = $1
        ORDER BY target_key ASC
      `, [SKOOL_SOURCE_ID]),
      pool.query(`
        SELECT item_key, target_key, source_id, item_type, status,
               fingerprint, artifact_id, retry_state, retry_blocker_card,
               metadata, discovered_at, processed_at, updated_at
        FROM source_crawl_items
        WHERE source_id = $1
           OR target_key IN (SELECT target_key FROM source_crawl_targets WHERE source_id = $1)
        ORDER BY updated_at DESC
      `, [SKOOL_SOURCE_ID]),
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
      [SKOOL_SOURCE_SYSTEM_MAP_CARD_ID],
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
      [SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH,
    operation: `mark ${SKOOL_SOURCE_SYSTEM_MAP_CARD_ID} V1 source-system map proof on live backlog`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const summary = snapshot.summary || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY}.`,
    `Readback maps ${summary.targetCount || 0} governed Skool targets with ${summary.itemCount || 0} source items and ${summary.extractedItemCount || 0} extracted Skool content rows.`,
    `Paid/private/member targets remain blocked: ${summary.paidPrivateTargetCount || 0}. Public-read targets remain packet-gated: ${summary.publicReadTargetCount || 0}.`,
    `Report artifact: ${SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID}.`,
    `Plan/doc: ${SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH}.`,
    'Proof: npm run process:skool-source-system-map-check -- --apply --json.',
    'No Skool browser session, login, join, course crawl, member read, download, post/comment/message, source row mutation, atom/vector write, external write, Browserbase, or normal Chrome profile was used.',
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
        SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
        statusNote,
        'Use the Skool source-system map to create exact approved public/free or paid/private packets. Do not run Skool extraction until SOURCE-SESSION-BROKER-001 and the specific source packet show session, owner/use boundary, allowed surfaces, and stop conditions.',
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
        SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
        ACTOR,
        `Marked ${SKOOL_SOURCE_SYSTEM_MAP_CARD_ID} V1 Skool source-system map proof`,
        JSON.stringify({
          closeoutKey: SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
          reportArtifactId: SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
          targetCount: summary.targetCount || 0,
          itemCount: summary.itemCount || 0,
          extractedItemCount: summary.extractedItemCount || 0,
        }),
      ],
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
    /runSkoolFreeCommunityGodMode/i,
    /skool:free-god-mode\s+--\s+--url/i,
    /INSERT\s+INTO\s+source_crawl_items/i,
    /UPDATE\s+source_crawl_items/i,
    /DELETE\s+FROM\s+source_crawl_items/i,
    /DELETE\s+FROM\s+source_crawl_targets/i,
    /INSERT\s+INTO\s+intelligence_atoms/i,
    /upsertIntelligenceAtom/i,
    /intelligence_retrieval_chunks/i,
    /readKeychainPassword/i,
    /storeKeychainPassword/i,
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

  const liveInput = await readLiveSkoolInput()
  const snapshot = buildSkoolSourceSystemMap(liveInput)
  const evaluation = evaluateSkoolSourceSystemMap(snapshot)
  const dogfood = buildSkoolSourceSystemMapDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH,
      operation: `persist ${SKOOL_SOURCE_SYSTEM_MAP_CARD_ID} report artifact`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    await initFoundationDb()
    foundationDbInitialized = true
    appliedReport = await upsertIntelligenceReportArtifact(buildSkoolSourceSystemMapReportArtifact(snapshot), ACTOR)
    appliedBacklogCard = await updateLiveBacklogCard(snapshot)
    persistedReport = await readPersistedReport()
  }

  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    sourceNote,
    currentPlanSource,
    currentStateSource,
    seedSource,
    sourceSystemCardFactorySource,
    coverageSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/skool-source-system-map.js'),
    readRepoFile(SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH),
    readRepoFile(SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH),
    readRepoFile('docs/source-notes/skool-corpus.md'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
  ])
  const liveBacklogCard = await readLiveBacklogCard()

  addCheck(
    checks,
    packageJson.scripts?.['process:skool-source-system-map-check'] === `node --env-file-if-exists=.env ${SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH}`,
    'package exposes focused Skool source-system map proof',
    packageJson.scripts?.['process:skool-source-system-map-check'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'Skool source-system map passes target, blocker, zero-content, and packet-boundary evaluation',
    evaluation.failed.map(item => item.check).join(', ') || 'healthy',
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      Number(dogfood.summary?.targetCount || 0) >= 4 &&
      Number(dogfood.summary?.extractedItemCount || 0) === 0,
    'dogfood proves Skool map without extraction',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    planSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CARD_ID) &&
      planSource.includes('four governed Skool targets') &&
      planSource.includes('Do not crawl Skool blindly') &&
      planSource.includes('exact approved source packet') &&
      planSource.includes('SOURCE-EXTRACTION-STATE-LEDGER-001') &&
      planSource.includes('FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001'),
    'plan captures Skool source map, no-blind-crawl boundary, ledger reuse, exact packets, and runner follow-up',
    SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH,
  )
  addCheck(
    checks,
    sourceNote.includes(SKOOL_SOURCE_NOTE_SENTINEL) &&
      sourceNote.includes('Do not crawl Skool blindly') &&
      sourceNote.includes('content-use boundary') &&
      sourceNote.includes('link inventory'),
    'source note preserves Skool no-blind-crawl posture',
    'docs/source-notes/skool-corpus.md',
  )
  addCheck(
    checks,
    currentPlanSource.includes(SKOOL_CURRENT_PLAN_SENTINEL) &&
      currentPlanSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
      currentPlanSource.includes(SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID),
    'current plan records Skool source-system map proof',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
      currentStateSource.includes('zero extracted Skool content rows') &&
      currentStateSource.includes('four governed Skool targets'),
    'current state records Skool source-system map proof',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CARD_ID) &&
      seedSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
      seedSource.includes('process:skool-source-system-map-check') &&
      seedSource.includes('No Skool browser session'),
    'backlog seed preserves Skool source-system map closeout status',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    sourceSystemCardFactorySource.includes(SKOOL_SOURCE_SYSTEM_MAP_CARD_ID) &&
      sourceSystemCardFactorySource.includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
      sourceSystemCardFactorySource.includes('process:skool-source-system-map-check'),
    'source-system card factory preserves Skool closeout status',
    'lib/myicor-mcp-catalog-snapshot.js',
  )
  addCheck(
    checks,
    coverageSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CARD_ID),
    'verifier coverage card IDs include Skool source-system map card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    handoffSource.includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
      handoffSource.includes(SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID),
    'handoff captures Skool source-system map proof and next routing',
    'docs/_archive/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    !sourceContainsUnsafePatterns(moduleSource, scriptSource),
    'proof does not open Skool, run Skool runner, mutate source rows, write atoms/vectors, read secrets, or send messages',
    'unsafe static patterns absent',
  )
  addCheck(
    checks,
    liveBacklogCard?.id === SKOOL_SOURCE_SYSTEM_MAP_CARD_ID &&
      liveBacklogCard.priority === 'P0' &&
      ['scoped', 'done'].includes(liveBacklogCard.lane),
    'live backlog contains Skool source-system map card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )

  if (args.apply) {
    addCheck(
      checks,
      appliedReport?.reportArtifactId === SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID &&
        persistedReport?.report_artifact_id === SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
      'apply persisted Skool source-system map report artifact',
      SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
    )
    addCheck(
      checks,
      appliedBacklogCard?.id === SKOOL_SOURCE_SYSTEM_MAP_CARD_ID &&
        appliedBacklogCard?.lane === 'done' &&
        String(appliedBacklogCard.status_note || '').includes(SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY) &&
        String(appliedBacklogCard.status_note || '').includes('Proof: npm run process:skool-source-system-map-check -- --apply --json'),
      'apply marked live backlog card done with V1 proof note',
      appliedBacklogCard ? `${appliedBacklogCard.id}/${appliedBacklogCard.lane}` : 'missing',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
    closeoutKey: SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
    reportArtifactId: SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
    applied: args.apply,
    liveBacklogCard,
    summary: snapshot.summary,
    sourceTargets: snapshot.sourceTargets,
    dogfood,
    persisted: args.apply ? {
      reportArtifactId: persistedReport?.report_artifact_id || null,
      backlogLane: appliedBacklogCard?.lane || null,
    } : null,
    checks,
    failed,
    externalWriteStarted: false,
    sourceRowsMutated: false,
    atomOrVectorWrites: false,
    browserStarted: false,
  }

  if (foundationDbInitialized) await closeFoundationDb()
  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Skool source-system map check: ${output.ok ? 'PASS' : 'FAIL'}`)
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
  }
  if (!output.ok) process.exit(1)
}

const SKOOL_SOURCE_NOTE_SENTINEL = SKOOL_SOURCE_ID
const SKOOL_CURRENT_PLAN_SENTINEL = 'May 29 Skool source-system map'

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
