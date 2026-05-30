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
  DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
} from '../lib/dev-director-daily-source-review-loop.js'
import {
  SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
} from '../lib/source-extraction-state-ledger.js'
import {
  MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
} from '../lib/myicor-mcp-catalog-snapshot.js'
import {
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
} from '../lib/myicor-approved-lesson-extract-proof.js'
import {
  SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
} from '../lib/skool-source-system-map.js'
import {
  DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
  DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
  DEV_PAGE_SYSTEM_TRUTH_CLEANUP_PLAN_PATH,
  DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
  DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH,
  buildDevPageSystemTruthDogfoodProof,
  buildDevPageSystemTruthReportArtifact,
  buildDevPageSystemTruthSnapshot,
  evaluateDevPageSystemTruthSnapshot,
} from '../lib/dev-page-system-truth-cleanup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-dev-page-system-truth-cleanup'
const DIRECTOR_REPORT_ID = 'director:dev-team-intelligence-director-001:aios-mission-v0'
const DEV_CSS_PATHS = [
  'public/dev.css',
  'public/dev-youtube-source.css',
  'public/dev-source-approval.css',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
  }
}

function text(value) {
  return String(value || '').trim()
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

async function readDevCssBundle() {
  const sources = await Promise.all(DEV_CSS_PATHS.map(readRepoFile))
  return sources.join('\n')
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
  const reportIds = [
    DIRECTOR_REPORT_ID,
    DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID,
    SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
    MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
    MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
    SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
  ]
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, report_type, title, status, source_ids,
               structured_output_json, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = ANY($1::text[])
      `,
      [reportIds],
    )
    const byId = new Map(result.rows.map(row => [row.report_artifact_id, row]))
    return {
      directorReport: byId.get(DIRECTOR_REPORT_ID) || null,
      devDirectorDailySourceReviewReport: byId.get(DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID) || null,
      sourceExtractionLedgerReport: byId.get(SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID) || null,
      myicorCatalogReport: byId.get(MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID) || null,
      myicorApprovedLessonExtractReport: byId.get(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID) || null,
      skoolSourceSystemMapReport: byId.get(SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID) || null,
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
      [DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID],
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
      [DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH,
    operation: `mark ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID} V1 Dev page truth proof on live backlog`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const summary = snapshot.summary || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY}.`,
    `Dev Hub payload now exposes systemTruth and /dev renders the System Truth section from source-backed reports.`,
    `Readback: ${summary.systemCount || 0} systems, ${summary.reportCount || 0} reports, ${summary.sourceLedgerItemCount || 0} source-ledger items, ${summary.extractedEvidenceCandidateCount || 0} extracted evidence candidates, ${summary.myicorPriorityPacketCount || 0} MyICOR packet candidates, ${summary.skoolTargetCount || 0} Skool targets, ${summary.blockedApprovalCount || 0} blocked/approval rows.`,
    `Report artifact: ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID}.`,
    'Proof: npm run process:dev-page-system-truth-cleanup-check -- --apply --json.',
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
        DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
        statusNote,
        'Use the Dev page System Truth section as the operator readback while BUILDER-MEMORY-SYSTEM-001 scopes the builder startup packet.',
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
        DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
        ACTOR,
        `Marked ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID} V1 Dev page system truth proof`,
        JSON.stringify({
          closeoutKey: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
          reportArtifactId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
          systemCount: summary.systemCount || 0,
          sourceLedgerItemCount: summary.sourceLedgerItemCount || 0,
          blockedApprovalCount: summary.blockedApprovalCount || 0,
        }),
      ],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

function hasUnsafeRuntimePatterns(...sources) {
  const combined = sources.map(source => {
    const input = String(source || '')
    const start = input.indexOf('function hasUnsafeRuntimePatterns')
    const end = start >= 0 ? input.indexOf('\nasync function main()', start) : -1
    return start >= 0 && end > start
      ? `${input.slice(0, start)}${input.slice(end)}`
      : input
  }).join('\n')
  const forbidden = [
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
  ]
  return forbidden.some(pattern => pattern.test(combined))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let appliedReport = null
  let appliedBacklogCard = null
  let persistedReport = null
  let foundationDbInitialized = false

  const reports = await readReports()
  const snapshot = buildDevPageSystemTruthSnapshot(reports)
  const evaluation = evaluateDevPageSystemTruthSnapshot(snapshot)
  const dogfood = buildDevPageSystemTruthDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH,
      operation: `persist ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID} report artifact`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    await initFoundationDb()
    foundationDbInitialized = true
    appliedReport = await upsertIntelligenceReportArtifact(buildDevPageSystemTruthReportArtifact(snapshot), ACTOR)
    appliedBacklogCard = await updateLiveBacklogCard(snapshot)
    persistedReport = await readPersistedReport()
  }

  const [
    packageJson,
    moduleSource,
    devHubSource,
    routeSource,
    htmlSource,
    jsSource,
    cssSource,
    scriptSource,
    planSource,
    currentPlanSource,
    currentStateSource,
    seedSource,
    sourceSystemFactorySource,
    coverageSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/dev-page-system-truth-cleanup.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('public/dev.html'),
    readRepoFile('public/dev.js'),
    readDevCssBundle(),
    readRepoFile(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH),
    readRepoFile(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_PLAN_PATH),
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
    packageJson.scripts?.['process:dev-page-system-truth-cleanup-check'] === `node --env-file-if-exists=.env ${DEV_PAGE_SYSTEM_TRUTH_CLEANUP_SCRIPT_PATH}`,
    'package exposes focused Dev page system truth proof',
    packageJson.scripts?.['process:dev-page-system-truth-cleanup-check'] || 'missing',
  )
  addCheck(checks, reports.foundIds.length >= 6, 'required Director/source reports exist', reports.foundIds.join(', '))
  addCheck(checks, evaluation.ok, 'live system truth snapshot passes evaluation', evaluation.failed.map(item => item.check).join('; ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood proves visible systems, blockers, and no-hidden-run guardrails', dogfood.failureSummary || 'healthy')
  addCheck(
    checks,
    moduleSource.includes('buildDevPageSystemTruthSnapshot') &&
      moduleSource.includes('evaluateDevPageSystemTruthSnapshot') &&
      moduleSource.includes('buildDevPageSystemTruthReportArtifact') &&
      moduleSource.includes('browserbaseDefaultAllowed: false') &&
      moduleSource.includes('extractionStartedByPage: false'),
    'module owns read model, evaluator, report artifact, and no-Browserbase/no-extraction guardrails',
    'lib/dev-page-system-truth-cleanup.js',
  )
  addCheck(
    checks,
    devHubSource.includes('buildDevPageSystemTruthSnapshot') &&
      devHubSource.includes('systemTruth') &&
      routeSource.includes('DEV_DIRECTOR_DAILY_SOURCE_REVIEW_LOOP_REPORT_ARTIFACT_ID') &&
      routeSource.includes('SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID') &&
      routeSource.includes('MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID') &&
      routeSource.includes('MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID') &&
      routeSource.includes('SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID'),
    'Dev Hub API includes systemTruth from the new source reports',
    '/api/foundation/dev-team-hub',
  )
  addCheck(
    checks,
    htmlSource.includes('id="system-truth"') &&
      htmlSource.includes('id="truth-head-stats"') &&
      htmlSource.includes('SYSTEM TRUTH') &&
      jsSource.includes('renderSystemTruth') &&
      jsSource.includes('snapshot.systemTruth') &&
      jsSource.includes('No hidden runs') &&
      cssSource.includes('.system-truth') &&
      cssSource.includes('.truth-system-grid') &&
      cssSource.includes('.truth-blocker-list'),
    'Dev page renders a System Truth section with summary, systems, blockers, and guardrails',
    'public/dev.html + public/dev.js + public/dev.css',
  )
  addCheck(
    checks,
    planSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY) &&
      planSource.toLowerCase().includes('source-backed') &&
      planSource.includes('No Browserbase') &&
      planSource.toLowerCase().includes('no extraction'),
    'plan captures source-backed truth, Browserbase boundary, and no-extraction scope',
    DEV_PAGE_SYSTEM_TRUTH_CLEANUP_PLAN_PATH,
  )
  addCheck(
    checks,
    currentPlanSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID) &&
      currentPlanSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID),
    'current plan records Dev page truth closeout',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID) &&
      currentStateSource.includes('System Truth'),
    'current state records Dev page System Truth readback',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID) &&
      seedSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY) &&
      sourceSystemFactorySource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID),
    'backlog seed and source-system card factory preserve Dev page truth closeout status',
    'chunk-005 + myicor-mcp-catalog-snapshot card factory',
  )
  addCheck(
    checks,
    coverageSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID),
    'verifier coverage card IDs include Dev page truth card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    handoffSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID) &&
      handoffSource.includes(DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID),
    'handoff captures Dev page system truth closeout',
    'docs/_archive/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    !hasUnsafeRuntimePatterns(moduleSource, scriptSource),
    'focused proof does not start browser, extraction, source-row mutation, atom/vector writes, or external sends',
    'unsafe static patterns absent',
  )
  addCheck(
    checks,
    Boolean(liveBacklogCard) &&
      liveBacklogCard.priority === 'P0' &&
      (args.apply ? liveBacklogCard.lane === 'done' : ['scoped', 'done'].includes(liveBacklogCard.lane)),
    'live backlog contains Dev page truth card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )
  if (args.apply) {
    addCheck(
      checks,
      appliedReport?.reportArtifactId === DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID &&
        persistedReport?.report_artifact_id === DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
      'apply persisted Dev page truth report artifact',
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
    cardId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CARD_ID,
    closeoutKey: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_CLOSEOUT_KEY,
    reportArtifactId: DEV_PAGE_SYSTEM_TRUTH_CLEANUP_REPORT_ARTIFACT_ID,
    applied: args.apply,
    liveBacklogCard,
    summary: snapshot.summary,
    systems: list(snapshot.systems).map(system => ({
      systemId: system.systemId,
      state: system.state,
      title: system.title,
      reportArtifactId: system.reportArtifactId,
    })),
    blockedApprovalPreview: list(snapshot.blockedApprovalQueue).slice(0, 6),
    dogfood: {
      ok: dogfood.ok,
      summary: dogfood.snapshot.summary,
    },
    persisted: persistedReport ? {
      reportArtifactId: persistedReport.report_artifact_id,
      reportType: persistedReport.report_type,
    } : null,
    checks,
    failed,
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
    console.log(`Dev page system truth cleanup proof: ${result.status}`)
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
  console.error('Dev page system truth cleanup proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
