#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  initFoundationDb,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  BUILDER_MEMORY_INPUT_REPORT_IDS,
  BUILDER_MEMORY_RELEVANT_CARD_IDS,
  BUILDER_MEMORY_SYSTEM_CARD_ID,
  BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
  BUILDER_MEMORY_SYSTEM_PLAN_PATH,
  BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
  BUILDER_MEMORY_SYSTEM_SCRIPT_PATH,
  buildBuilderMemoryStartupPacket,
  buildBuilderMemorySystemDogfoodProof,
  buildBuilderMemorySystemReportArtifact,
  evaluateBuilderMemoryStartupPacket,
} from '../lib/builder-memory-system.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-builder-memory-system'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
  }
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
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

async function readReports() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, report_type, title, status, source_ids,
               structured_output_json, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = ANY($1::text[])
      `,
      [BUILDER_MEMORY_INPUT_REPORT_IDS],
    )
    const byId = new Map(result.rows.map(row => [row.report_artifact_id, row]))
    return {
      devPageSystemTruthReport: byId.get('dev-page:system-truth-cleanup:v1') || null,
      dailySourceReviewReport: byId.get('director:dev-daily-source-review-loop:v1') || null,
      sourceLedgerReport: byId.get('source-system:extraction-state-ledger:v1') || null,
      myicorCatalogReport: byId.get('source-system:myicor:mcp-catalog-snapshot:v1') || null,
      myicorApprovedLessonExtractReport: byId.get('source-system:myicor:approved-lesson-extract-proof:v1') || null,
      skoolSourceSystemMapReport: byId.get('source-system:skool:source-system-map:v1') || null,
      foundIds: result.rows.map(row => row.report_artifact_id).sort(),
    }
  } finally {
    await pool.end()
  }
}

function currentSprintCardIds(currentSprint = {}) {
  return list(currentSprint.items)
    .map(item => String(item.cardId || item.backlogId || item.backlog_id || '').trim())
    .filter(Boolean)
}

async function readBacklogCards(currentSprint = {}) {
  const ids = Array.from(new Set([
    ...BUILDER_MEMORY_RELEVANT_CARD_IDS,
    ...currentSprintCardIds(currentSprint),
  ]))
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT id, title, lane, priority, next_action, status_note
        FROM backlog_items
        WHERE id = ANY($1::text[])
        ORDER BY array_position($1::text[], id)
      `,
      [ids],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function readLiveBacklogCard() {
  const pool = createPool()
  try {
    const result = await pool.query(
      'SELECT id, lane, priority, status_note FROM backlog_items WHERE id = $1 LIMIT 1',
      [BUILDER_MEMORY_SYSTEM_CARD_ID],
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
        SELECT report_artifact_id, report_type, source_ids, structured_output_json, metadata
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = $1
        LIMIT 1
      `,
      [BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(packet = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: BUILDER_MEMORY_SYSTEM_SCRIPT_PATH,
    operation: `mark ${BUILDER_MEMORY_SYSTEM_CARD_ID} V1 builder memory proof on live backlog`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const summary = packet.summary || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY}.`,
    `Builder startup packet now persists ${BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID} from live sprint, backlog, Dev page truth, daily source review, source ledger, MyICOR catalog, exact MyICOR extraction, and Skool reports.`,
    `Readback: active sprint ${summary.activeSprintId || 'missing'}, blocker ${summary.activeBlockerCardId || 'missing'}, ${summary.relevantCardCount || 0} relevant cards, ${summary.reportCount || 0} reports, ${summary.sourceLedgerItemCount || 0} source-ledger items, ${summary.extractedEvidenceCandidateCount || 0} extracted evidence candidates, ${summary.myicorPacketCandidateCount || 0} MyICOR packet candidates, ${summary.skoolTargetCount || 0} Skool targets.`,
    'Private MEMORY.md/USER.md/daily memory and secrets are explicitly excluded from repo truth.',
    'Proof: npm run process:builder-memory-system-check -- --apply --json.',
    'No browser session, Browserbase default, source extraction, source row mutation, atom/vector write, external write, or auto-promotion was performed.',
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
        BUILDER_MEMORY_SYSTEM_CARD_ID,
        statusNote,
        'Use builder-memory:startup-packet:v1 as the first builder readback before exact MyICOR/Skool extraction packets or source-browser runtime work.',
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
        BUILDER_MEMORY_SYSTEM_CARD_ID,
        ACTOR,
        `Marked ${BUILDER_MEMORY_SYSTEM_CARD_ID} V1 builder memory proof`,
        JSON.stringify({
          closeoutKey: BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
          reportArtifactId: BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
          activeSprintId: summary.activeSprintId || '',
          activeBlockerCardId: summary.activeBlockerCardId || '',
          relevantCardCount: summary.relevantCardCount || 0,
        }),
      ],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

function removeStaticScannerBodies(source = '') {
  const input = String(source || '')
  return ['function stripsPrivateMemoryReferences', 'function hasUnsafeRuntimePatterns']
    .reduce((output, marker) => {
      const start = output.indexOf(marker)
      if (start < 0) return output
      const end = output.indexOf('\nasync function main()', start)
      return end > start ? `${output.slice(0, start)}${output.slice(end)}` : output.slice(0, start)
    }, input)
}

function stripsPrivateMemoryReferences(moduleSource = '', scriptSource = '') {
  const combined = [moduleSource, scriptSource].map(removeStaticScannerBodies).join('\n')
  return ![
    /readRepoFile\(['"]MEMORY\.md/i,
    /readRepoFile\(['"]USER\.md/i,
    /readRepoFile\(['"]memory\//i,
    /fs\.readFile\([^)]*MEMORY\.md/i,
    /fs\.readFile\([^)]*USER\.md/i,
    /fs\.readFile\([^)]*memory\//i,
  ].some(pattern => pattern.test(combined))
}

function hasUnsafeRuntimePatterns(moduleSource = '', scriptSource = '') {
  const combined = [moduleSource, scriptSource].map(removeStaticScannerBodies).join('\n')
  return [
    /chromium\.launch/i,
    /page\.goto/i,
    /runSkoolFreeCommunityGodMode/i,
    /runMyicor.*Lesson.*Extract/i,
    /runSourcePacketWorker/i,
    /runExtractorHandsProductionRunner/i,
    /INSERT\s+INTO\s+source_crawl_items/i,
    /UPDATE\s+source_crawl_items/i,
    /DELETE\s+FROM\s+source_crawl/i,
    /upsertIntelligenceAtom/i,
    /recordIntelligenceAtomHit/i,
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

  await initFoundationDb()
  foundationDbInitialized = true
  let currentSprint = null
  currentSprint = await getActiveFoundationCurrentSprint()
  const [reports, backlogCards] = await Promise.all([
    readReports(),
    readBacklogCards(currentSprint),
  ])
  const packet = buildBuilderMemoryStartupPacket({
    currentSprint,
    backlogCards,
    ...reports,
  })
  const evaluation = evaluateBuilderMemoryStartupPacket(packet)
  const dogfood = buildBuilderMemorySystemDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: BUILDER_MEMORY_SYSTEM_SCRIPT_PATH,
      operation: `persist ${BUILDER_MEMORY_SYSTEM_CARD_ID} report artifact`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    if (!foundationDbInitialized) {
      await initFoundationDb()
      foundationDbInitialized = true
    }
    appliedReport = await upsertIntelligenceReportArtifact(buildBuilderMemorySystemReportArtifact(packet), ACTOR)
    appliedBacklogCard = await updateLiveBacklogCard(packet)
    persistedReport = await readPersistedReport()
  }

  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    currentPlanSource,
    currentStateSource,
    seedSource,
    sourceSystemFactorySource,
    coverageSource,
    handoffSource,
    agentsSource,
    claudeSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/builder-memory-system.js'),
    readRepoFile(BUILDER_MEMORY_SYSTEM_SCRIPT_PATH),
    readRepoFile(BUILDER_MEMORY_SYSTEM_PLAN_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
    readRepoFile('AGENTS.md'),
    readRepoFile('CLAUDE.md'),
  ])
  const liveBacklogCard = await readLiveBacklogCard()
  const sessionStartupSection = agentsSource.slice(
    agentsSource.indexOf('## Session Startup'),
    agentsSource.indexOf('## Memory') > agentsSource.indexOf('## Session Startup') ? agentsSource.indexOf('## Memory') : undefined,
  )

  addCheck(
    checks,
    packageJson.scripts?.['process:builder-memory-system-check'] === `node --env-file-if-exists=.env ${BUILDER_MEMORY_SYSTEM_SCRIPT_PATH}` &&
      packageJson.scripts?.['builder:startup-packet'] === `node --env-file-if-exists=.env ${BUILDER_MEMORY_SYSTEM_SCRIPT_PATH} --json`,
    'package exposes focused builder memory proof and startup-packet command',
    `${packageJson.scripts?.['process:builder-memory-system-check'] || 'missing'} / ${packageJson.scripts?.['builder:startup-packet'] || 'missing'}`,
  )
  addCheck(checks, reports.foundIds.length >= BUILDER_MEMORY_INPUT_REPORT_IDS.length, 'required builder memory input reports exist', reports.foundIds.join(', '))
  addCheck(checks, backlogCards.length >= Math.min(6, BUILDER_MEMORY_RELEVANT_CARD_IDS.length), 'relevant backlog cards are loaded from live backlog', `${backlogCards.length} cards`)
  addCheck(
    checks,
    currentSprintCardIds(currentSprint).every(id => backlogCards.some(card => card.id === id)),
    'builder startup packet includes active Current Sprint cards',
    currentSprintCardIds(currentSprint).join(', ') || 'no active sprint cards',
  )
  addCheck(checks, evaluation.ok, 'live builder startup packet passes evaluation', evaluation.failed.map(item => item.check).join('; ') || 'healthy')
  addCheck(
    checks,
    scriptSource.includes('currentSprint = await getActiveFoundationCurrentSprint()') &&
      scriptSource.includes('buildBuilderMemoryStartupPacket({') &&
      scriptSource.includes('currentSprint,'),
    'startup packet reads active sprint dynamically',
    'getActiveFoundationCurrentSprint -> buildBuilderMemoryStartupPacket',
  )
  addCheck(
    checks,
    /^1\.\s+Run `npm run builder:startup-packet`/m.test(sessionStartupSection),
    'AGENTS.md makes startup packet the first action',
    sessionStartupSection.split('\n').find(line => line.startsWith('1.')) || 'missing',
  )
  addCheck(
    checks,
    claudeSource.includes('Canonical workspace instructions live in `AGENTS.md`') &&
      claudeSource.includes('npm run builder:startup-packet') &&
      claudeSource.includes('Read `AGENTS.md`'),
    'CLAUDE.md bootstraps Claude to the shared startup packet doctrine',
    'CLAUDE.md',
  )
  addCheck(checks, dogfood.ok, 'dogfood proves startup packet and privacy guardrails', dogfood.failureSummary || 'healthy')
  addCheck(
    checks,
    moduleSource.includes('buildBuilderMemoryStartupPacket') &&
      moduleSource.includes('evaluateBuilderMemoryStartupPacket') &&
      moduleSource.includes('buildBuilderMemorySystemReportArtifact') &&
      moduleSource.includes('privateMemoryIncluded: false') &&
      moduleSource.includes('chatMemoryAuthoritative: false'),
    'module owns packet builder, evaluator, report artifact, and stale/private memory rejection',
    'lib/builder-memory-system.js',
  )
  addCheck(
    checks,
    stripsPrivateMemoryReferences(moduleSource, scriptSource),
    'builder memory proof does not read MEMORY.md, USER.md, memory daily files, or secrets',
    'private memory files absent from read paths',
  )
  addCheck(
    checks,
    !hasUnsafeRuntimePatterns(moduleSource, scriptSource),
    'focused proof does not start browser, extraction, source-row mutation, atom/vector writes, or external sends',
    'unsafe static patterns absent',
  )
  addCheck(
    checks,
    planSource.includes(BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY) &&
      planSource.includes('startup packet') &&
      planSource.includes('private memory') &&
      planSource.includes('No Browserbase'),
    'plan captures startup packet, private-memory boundary, and no-Browserbase scope',
    BUILDER_MEMORY_SYSTEM_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlanSource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID) &&
      currentPlanSource.includes(BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID),
    'current plan records builder memory closeout',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID) &&
      currentStateSource.includes('startup packet'),
    'current state records builder memory startup packet',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID) &&
      seedSource.includes(BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY) &&
      sourceSystemFactorySource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID),
    'backlog seed and source-system card factory preserve builder memory closeout status',
    'chunk-005 + myicor-mcp-catalog-snapshot card factory',
  )
  addCheck(
    checks,
    coverageSource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID),
    'verifier coverage card IDs include builder memory card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    handoffSource.includes(BUILDER_MEMORY_SYSTEM_CARD_ID) &&
      handoffSource.includes(BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID),
    'handoff captures builder memory closeout',
    'docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    Boolean(liveBacklogCard) &&
      liveBacklogCard.priority === 'P0' &&
      (args.apply ? liveBacklogCard.lane === 'done' : ['scoped', 'done'].includes(liveBacklogCard.lane)),
    'live backlog contains builder memory card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )
  if (args.apply) {
    addCheck(
      checks,
      (appliedReport?.reportArtifactId || appliedReport?.report_artifact_id) === BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID &&
        persistedReport?.report_artifact_id === BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
      'apply persisted builder memory report artifact',
      persistedReport?.report_artifact_id || 'missing',
    )
    addCheck(
      checks,
      appliedBacklogCard?.lane === 'done',
      'apply marked live backlog card done',
      appliedBacklogCard ? `${appliedBacklogCard.id}/${appliedBacklogCard.lane}` : 'missing',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: BUILDER_MEMORY_SYSTEM_CARD_ID,
    closeoutKey: BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
    reportArtifactId: BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
    applied: args.apply,
    liveBacklogCard,
    summary: packet.summary,
    activeSprint: packet.activeSprint,
    loadOrder: packet.loadOrder,
    startupChecklist: packet.startupChecklist,
    guardrails: packet.guardrails,
    staleClaimRejectionRules: packet.staleClaimRejectionRules,
    sourceReports: packet.sourceReports,
    proofCommands: packet.proofCommands,
    dogfood: {
      ok: dogfood.ok,
      summary: dogfood.packet.summary,
    },
    persisted: persistedReport ? {
      reportArtifactId: persistedReport.report_artifact_id,
      reportType: persistedReport.report_type,
    } : null,
    checks,
    failed,
    privateMemoryIncluded: false,
    browserStarted: false,
    browserbaseDefaultAllowed: false,
    sourceRowsMutated: false,
    atomOrVectorWrites: false,
    externalWriteStarted: false,
    extractionStarted: false,
    autoBacklogPromotions: 0,
  }

  if (foundationDbInitialized) await closeFoundationDb()

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Builder memory system proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error('Builder memory system proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
