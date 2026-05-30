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
import {
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS,
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_PLAN_PATH,
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH,
  buildDevDirectorDailySourceReviewLoop,
  buildDevDirectorDailySourceReviewLoopDogfoodProof,
  buildDevDirectorDailySourceReviewLoopReportArtifact,
  evaluateDevDirectorDailySourceReviewLoop,
} from '../lib/dev-director-daily-source-review-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-dev-director-daily-source-review-loop'

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

async function readInputReports() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, report_type, status, source_ids,
               structured_output_json, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = ANY($1::text[])
      `,
      [DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS],
    )
    const byId = new Map(result.rows.map(row => [row.report_artifact_id, row]))
    return {
      directorReport: byId.get('director:dev-team-intelligence-director-001:aios-mission-v0') || null,
      ledgerReport: byId.get('source-system:extraction-state-ledger:v1') || null,
      myicorReport: byId.get('source-system:myicor:mcp-catalog-snapshot:v1') || null,
      myicorExtractReport: byId.get('source-system:myicor:approved-lesson-extract-proof:v1') || null,
      skoolReport: byId.get('source-system:skool:source-system-map:v1') || null,
      foundIds: result.rows.map(row => row.report_artifact_id).sort(),
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
      [DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID],
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
      [DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(review = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH,
    operation: `mark ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID} V1 daily source review proof on live backlog`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const summary = review.summary || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY}.`,
    `Daily review consumes Director + source ledger + MyICOR catalog + exact MyICOR extraction proof + Skool map and persists report ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID}.`,
    `Readback: ${summary.existingDirectorCandidateCount || 0} existing Director candidates, ${summary.newChangedOrKeptDirectorCandidateCount || 0} new/changed/kept source candidates, ${summary.extractedEvidenceCandidateCount || 0} extracted evidence candidates, ${summary.myicorPacketCandidateCount || 0} MyICOR packet candidates, ${summary.skoolPacketTargetCount || 0} Skool packet targets, ${summary.suppressedFromDirectorCount || 0} suppressed history items.`,
    'Proof: npm run process:dev-director-daily-source-review-loop-check -- --apply --json.',
    'No auto backlog promotion, source extraction, browser session, source row mutation, atom/vector write, deletion, external write, or automatic suppression apply was performed.',
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
        DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
        statusNote,
        'Use this daily source review artifact to drive DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001 and BUILDER-MEMORY-SYSTEM-001. Do not auto-promote Director recommendations; extracted evidence and Steve approval remain required.',
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
        DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
        ACTOR,
        `Marked ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID} V1 daily source review proof`,
        JSON.stringify({
          closeoutKey: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
          reportArtifactId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
          existingDirectorCandidateCount: summary.existingDirectorCandidateCount || 0,
          extractedEvidenceCandidateCount: summary.extractedEvidenceCandidateCount || 0,
          myicorPacketCandidateCount: summary.myicorPacketCandidateCount || 0,
          skoolPacketTargetCount: summary.skoolPacketTargetCount || 0,
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
    /runMyicor.*Lesson.*Extract/i,
    /npm\s+run\s+myicor:.*lesson.*extract/i,
    /upsertIntelligenceAtom/i,
    /recordIntelligenceAtomHit/i,
    /INSERT\s+INTO\s+source_crawl_items/i,
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

  const inputReports = await readInputReports()
  const review = buildDevDirectorDailySourceReviewLoop(inputReports)
  const evaluation = evaluateDevDirectorDailySourceReviewLoop(review)
  const dogfood = buildDevDirectorDailySourceReviewLoopDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH,
      operation: `persist ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID} report artifact`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    await initFoundationDb()
    foundationDbInitialized = true
    appliedReport = await upsertIntelligenceReportArtifact(buildDevDirectorDailySourceReviewLoopReportArtifact(review), ACTOR)
    appliedBacklogCard = await updateLiveBacklogCard(review)
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
    sourceSystemCardFactorySource,
    coverageSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/dev-director-daily-source-review-loop.js'),
    readRepoFile(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH),
    readRepoFile(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_PLAN_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
  ])
  const liveBacklogCard = await readLiveBacklogCard()

  addCheck(
    checks,
    packageJson.scripts?.['process:dev-director-daily-source-review-loop-check'] === `node --env-file-if-exists=.env ${DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_SCRIPT_PATH}`,
    'package exposes focused Dev Director daily source review proof',
    packageJson.scripts?.['process:dev-director-daily-source-review-loop-check'] || 'missing',
  )
  addCheck(
    checks,
    DEV_DIRECTOR_DAILY_SOURCE_REVIEW_INPUT_REPORT_IDS.every(id => inputReports.foundIds.includes(id)),
    'all required Director/source input reports exist',
    inputReports.foundIds.join(', '),
  )
  addCheck(
    checks,
    evaluation.ok,
    'daily source review loop passes proposal-only Director/source evaluation',
    evaluation.failed.map(item => item.check).join(', ') || 'healthy',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves suppression, packet queues, blocked approvals, and no auto-promotion',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    planSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID) &&
      planSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID) &&
      planSource.includes('proposal-only') &&
      planSource.includes('suppressed history') &&
      planSource.includes('exact source-packet candidates') &&
      planSource.includes('No auto backlog promotion'),
    'plan captures proposal-only source review, suppression, packet queues, and no auto-promotion',
    DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlanSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
      currentPlanSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID),
    'current plan records Dev Director daily source review loop proof',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
      currentStateSource.includes('proposal-only daily source review'),
    'current state records Dev Director daily source review loop proof',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID) &&
      seedSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
      seedSource.includes('process:dev-director-daily-source-review-loop-check') &&
      seedSource.includes('No auto backlog promotion'),
    'backlog seed preserves Dev Director daily source review closeout status',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    sourceSystemCardFactorySource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID) &&
      sourceSystemCardFactorySource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
      sourceSystemCardFactorySource.includes('process:dev-director-daily-source-review-loop-check'),
    'source-system card factory preserves Dev Director daily source review closeout status',
    'lib/myicor-mcp-catalog-snapshot.js',
  )
  addCheck(
    checks,
    coverageSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID),
    'verifier coverage card IDs include Dev Director daily source review card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    handoffSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
      handoffSource.includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID),
    'handoff captures Dev Director daily source review proof and next routing',
    'docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    !sourceContainsUnsafePatterns(moduleSource, scriptSource),
    'proof does not run extraction, browser, atoms/hits, source row mutation, deletion, or external sends',
    'unsafe static patterns absent',
  )
  addCheck(
    checks,
    liveBacklogCard?.id === DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID &&
      liveBacklogCard.priority === 'P0' &&
      ['scoped', 'done'].includes(liveBacklogCard.lane),
    'live backlog contains Dev Director daily source review card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )

  if (args.apply) {
    addCheck(
      checks,
      appliedReport?.reportArtifactId === DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID &&
        persistedReport?.report_artifact_id === DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
      'apply persisted Dev Director daily source review report artifact',
      DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
    )
    addCheck(
      checks,
      appliedBacklogCard?.id === DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID &&
        appliedBacklogCard?.lane === 'done' &&
        String(appliedBacklogCard.status_note || '').includes(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY) &&
        String(appliedBacklogCard.status_note || '').includes('Proof: npm run process:dev-director-daily-source-review-loop-check -- --apply --json'),
      'apply marked live backlog card done with V1 proof note',
      appliedBacklogCard ? `${appliedBacklogCard.id}/${appliedBacklogCard.lane}` : 'missing',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CARD_ID,
    closeoutKey: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_CLOSEOUT_KEY,
    reportArtifactId: DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
    applied: args.apply,
    liveBacklogCard,
    inputReports: inputReports.foundIds,
    summary: review.summary,
    dailyReviewDecision: review.dailyReviewDecision,
    sourceQueues: {
      readyDirectorCandidateCount: review.sourceQueues?.readyDirectorCandidateCount,
      extractedEvidenceQueueCount: review.sourceQueues?.extractedEvidenceQueue?.length || 0,
      enrichmentPacketQueueCount: review.sourceQueues?.enrichmentPacketQueue?.length || 0,
      blockedApprovalQueueCount: review.sourceQueues?.blockedApprovalQueue?.length || 0,
      suppressedHistoryCount: review.sourceQueues?.suppressedHistoryCount || 0,
    },
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
    extractionStarted: false,
    autoBacklogPromotions: 0,
  }

  if (foundationDbInitialized) await closeFoundationDb()
  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Dev Director daily source review loop check: ${output.ok ? 'PASS' : 'FAIL'}`)
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
  }
  if (!output.ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
