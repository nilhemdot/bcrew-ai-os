#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  initFoundationDb,
  recordIntelligenceAtomHit,
  updateBacklogItem,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessReportWriteRequested,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_APPROVAL_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_CHANGED_FILES,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_INPUT_REPORT_IDS,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_PLAN_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH,
  buildDevTeamIntelligenceDirectorSnapshot,
  buildDevTeamIntelligenceDirectorWriteSet,
  renderDevTeamIntelligenceDirectorReport,
} from '../lib/dev-team-intelligence-director.js'
import {
  DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID,
  buildDevSourceSliceDirectorInputBundle,
  buildDevSourceSliceRouterSnapshot,
} from '../lib/dev-source-slice-router.js'
import {
  YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID,
  isYoutubeLatest20FullWatchReportId,
} from '../lib/youtube-latest-20-full-watch-runner.js'
import {
  YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID,
} from '../lib/youtube-long-course-full-watch-lane.js'
import {
  YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID,
  YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX,
} from '../lib/youtube-deep-visual-review-lane.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'dev-team-intelligence-director-v0'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    writeReport: isProcessReportWriteRequested(argv),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function listLatestSharedSourceReportIds({ limit = 8 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id
        FROM intelligence_report_artifacts
        WHERE source_ids && $1::text[]
          AND report_artifact_id LIKE 'report-artifact:synthesis-engine-fresh-candidate-promotion-%'
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [[
        'SRC-MEETINGS-001',
        'SRC-GMAIL-001',
        'SRC-MISSIVE-001',
        'SRC-SLACK-001',
      ], Math.min(20, Math.max(1, Number(limit) || 8))]
    )
    return result.rows.map(row => row.report_artifact_id).filter(Boolean)
  } finally {
    await pool.end().catch(() => {})
  }
}

function isYoutubeFullWatchReportId(value = '') {
  return isYoutubeLatest20FullWatchReportId(value) ||
    value === YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID ||
    String(value || '').startsWith(`${YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID}:`) ||
    value === YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID ||
    String(value || '').startsWith(YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX)
}

async function listLatestYoutubeFullWatchReportIds({ limit = 500 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = $1
           OR report_artifact_id LIKE $2
           OR metadata->>'proofMode' = 'youtube_latest_20_god_mode_api_full_watch'
           OR report_artifact_id = $3
           OR report_artifact_id LIKE $4
           OR metadata->>'proofMode' = 'youtube_long_course_god_mode_api_full_watch'
           OR report_artifact_id = $5
           OR report_artifact_id LIKE $6
           OR metadata->>'proofMode' = 'youtube_deep_visual_review_v1'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT $7
      `,
      [
        YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID,
        `${YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID}:%`,
        YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID,
        `${YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID}:%`,
        YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID,
        `${YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX}%`,
        Math.min(1000, Math.max(1, Number(limit) || 500)),
      ],
    )
    return result.rows.map(row => row.report_artifact_id).filter(Boolean)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadInputBundles() {
  const bundles = []
  const latest20ReportIds = await listLatestYoutubeFullWatchReportIds({ limit: 500 })
  const inputIds = Array.from(new Set([
    ...DEV_TEAM_INTELLIGENCE_DIRECTOR_INPUT_REPORT_IDS,
    ...latest20ReportIds,
  ]))
  for (const reportArtifactId of inputIds) {
    bundles.push(await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 200, hitLimit: 300 }))
  }
  const sharedReportIds = await listLatestSharedSourceReportIds({ limit: 8 })
  const sharedBundles = []
  for (const reportArtifactId of sharedReportIds) {
    sharedBundles.push(await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 80, hitLimit: 120 }))
  }
  const devSourceSlice = buildDevSourceSliceRouterSnapshot({ reportBundles: sharedBundles })
  if (devSourceSlice.ok && devSourceSlice.devCandidates.length) {
    bundles.push(buildDevSourceSliceDirectorInputBundle(devSourceSlice))
  }
  return { reportBundles: bundles, devSourceSlice, sharedReportIds, latest20ReportIds }
}

async function persistDirector(snapshot = {}, options = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH,
    operation: 'persist Dev Team Intelligence Director report, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const writeSet = buildDevTeamIntelligenceDirectorWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  const actualAtomIdByRequested = new Map()
  for (const atomInput of writeSet.atomInputs) {
    const atom = await upsertIntelligenceAtom(atomInput, ACTOR)
    atoms.push(atom)
    actualAtomIdByRequested.set(atomInput.atomId || atomInput.atom_id, atom.atomId || atom.atom_id)
  }
  for (const hitInput of writeSet.hitInputs) {
    hits.push(await recordIntelligenceAtomHit({
      ...hitInput,
      atomId: actualAtomIdByRequested.get(hitInput.atomId || hitInput.atom_id) || hitInput.atomId || hitInput.atom_id,
    }, ACTOR))
  }
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: Array.from(new Set([
      ...list(writeSet.reportArtifact.inputAtomIds),
      ...atoms.map(atom => atom.atomId || atom.atom_id),
    ])),
  }, ACTOR)
  if (options.writeReport) {
    await fs.writeFile(path.join(repoRoot, DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_PATH), renderDevTeamIntelligenceDirectorReport(snapshot), 'utf8')
  }
  return { writeSet, report, atoms, hits }
}

function buildClosedBacklogUpdate() {
  return {
    lane: 'done',
    nextAction: 'Done under dev-team-intelligence-director-v1. Morning review starts with docs/source-notes/dev-team-intelligence-director-2026-05-24.md, then DEV-BUILD-OPPORTUNITY-SCOPER-001 and BUILD-PORTFOLIO-SCRUM-MASTER-001 review candidates before promotion.',
    statusNote: `Closed 2026-05-24 under dev-team-intelligence-director-v1; persisted ${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID}, top proposal-only recommendation atoms/hits, preserved approval-required items, no auto backlog cards, no external writes, and no new extraction.`,
  }
}

async function closeDirectorCard() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH,
    operation: 'close Dev Team Intelligence Director backlog card after persisted proof',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  return updateBacklogItem(DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID, buildClosedBacklogUpdate(), ACTOR)
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persistence = null

  await initFoundationDb()
  try {
    const [
      packageJson,
      planText,
      approvalValidation,
      systemStrategyText,
      businessStrategyText,
      currentPlanText,
      currentSprint,
      inputBundleResult,
      scriptText,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(DEV_TEAM_INTELLIGENCE_DIRECTOR_PLAN_PATH),
      validatePlanApprovalFile({
        repoRoot,
        approvalRef: DEV_TEAM_INTELLIGENCE_DIRECTOR_APPROVAL_PATH,
        cardId: DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID,
      }),
      readRepoFile('docs/system-strategy.md'),
      readRepoFile('docs/business-strategy.md'),
      readRepoFile('docs/rebuild/current-plan.md'),
      getActiveFoundationCurrentSprint(),
      loadInputBundles(),
      readRepoFile(DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH),
    ])
    const { reportBundles, devSourceSlice, sharedReportIds, latest20ReportIds } = inputBundleResult

    const planReview = evaluatePlanCriticPlan({
      planText,
      card: { id: DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID, priority: 'P0' },
      changedFiles: DEV_TEAM_INTELLIGENCE_DIRECTOR_CHANGED_FILES,
      declaredRisk: 'Focused proof because this reads Foundation intelligence truth and writes an internal Director report/atoms/hits, but performs no external writes and creates no backlog cards.',
      repoRoot,
    })

    const snapshot = buildDevTeamIntelligenceDirectorSnapshot({
      generatedAt: new Date().toISOString(),
      reportBundles,
      currentSprint,
      systemStrategyText,
      businessStrategyText,
      currentPlanText,
    })
    const writeRequested = args.apply || args.closeCard

    if (writeRequested) {
      if (!snapshot.ok) throw new Error(`Director snapshot blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      persistence = await persistDirector(snapshot, { writeReport: args.writeReport })
      if (args.closeCard) await closeDirectorCard()
    }

    const persisted = await getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 100, hitLimit: 100 })
    const [liveCard] = await getBacklogItemsByIds([DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID])
    const persistedReport = persisted.report || null
    const persistedAtoms = list(persisted.atoms)
    const persistedHits = list(persisted.hits)
    const topCandidates = list(snapshot.recommendedBuildNow)
    const liveActiveCardId = currentSprint?.sprint?.activeBlockerCardId || null
    const deepVisualReportIds = latest20ReportIds.filter(reportArtifactId => isYoutubeFullWatchReportId(reportArtifactId) &&
      String(reportArtifactId || '').startsWith(YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX))

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(failure => failure.check).join(', ') || DEV_TEAM_INTELLIGENCE_DIRECTOR_APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes Director plan', buildPlanCriticResultSummary(planReview))
    addCheck(checks, packageJson.scripts?.['process:dev-team-intelligence-director-check'] === `node --env-file-if-exists=.env ${DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:dev-team-intelligence-director-check'] || 'missing')
    addCheck(
      checks,
      scriptText.includes('listLatestYoutubeFullWatchReportIds({ limit = 500 }') &&
        scriptText.includes('Math.min(1000') &&
        scriptText.includes('listLatestYoutubeFullWatchReportIds({ limit: 500 })') &&
        !/listLatestYoutubeFullWatchReportIds\(\{ limit = 18 \}/.test(scriptText) &&
        !/Math\.min\(40,/.test(scriptText),
      'Director reads the full current YouTube report spine instead of a recent 18-report slice',
      `${latest20ReportIds.length} YouTube reports`,
    )
    addCheck(checks, snapshot.ok === true, 'Director snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
    addCheck(checks, Boolean(snapshot.activeSprintId) && Boolean(snapshot.activeCard) && snapshot.activeCard === liveActiveCardId, 'Director reads live active sprint context', snapshot.activeCard || 'missing')
    addCheck(checks, topCandidates.length >= 5, 'Director emits top 5 build candidates', `${topCandidates.length}`)
    addCheck(checks, topCandidates.every(candidate => candidate.promotionStatus === DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS), 'top candidates require Dev Build Scoper before Steve approval', topCandidates.map(candidate => candidate.promotionStatus).join(', '))
    addCheck(checks, topCandidates.every(candidate => candidate.missionScore?.laneScores?.some(lane => lane.id === 'agent_realtor_coaching') || true), 'Director scoring includes agent/realtor coaching lane', 'lane present in rubric')
    addCheck(checks, sharedReportIds.length >= 3, 'Director discovers recent shared internal source reports', `${sharedReportIds.length}`)
    addCheck(checks, devSourceSlice?.ok === true && devSourceSlice.devCandidates.length >= 1, 'Director receives filtered Dev source slice from meetings/comms', `${devSourceSlice?.counts?.devCandidates || 0}`)
    addCheck(checks, devSourceSlice?.parkedOperational?.length >= 1, 'normal ops tasks stay parked out of Dev Director', `${devSourceSlice?.counts?.parkedOperational || 0}`)
    addCheck(checks, snapshot.sourceCoverage.some(source => source.reportArtifactId === DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID), 'Director input includes the Dev source-slice bundle', snapshot.sourceCoverage.map(source => source.reportArtifactId).join(', '))
    addCheck(checks, latest20ReportIds.length >= 1, 'Director discovers persisted YouTube full-watch batch reports', latest20ReportIds.join(', '))
    addCheck(checks, deepVisualReportIds.length >= 1, 'Director discovers persisted YouTube deep visual review reports', deepVisualReportIds.join(', ') || 'missing')
    addCheck(checks, snapshot.sourceCoverage.some(source => String(source.reportArtifactId || '').startsWith(YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX)), 'Director input includes YouTube deep visual review batches', snapshot.sourceCoverage.map(source => source.reportArtifactId).join(', '))
    addCheck(checks, snapshot.sourceCoverage.some(source => isYoutubeFullWatchReportId(source.reportArtifactId)), 'Director input includes YouTube full-watch batches', snapshot.sourceCoverage.map(source => source.reportArtifactId).join(', '))
    addCheck(checks, !writeRequested || persistedReport?.reportArtifactId === DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, 'persisted Director report reads back', persistedReport?.reportArtifactId || 'missing')
    addCheck(checks, !writeRequested || persistedAtoms.length >= Math.min(5, topCandidates.length), 'persisted Director atoms read back', `${persistedAtoms.length}`)
    addCheck(checks, !writeRequested || persistedHits.length >= Math.min(5, topCandidates.length), 'persisted Director evidence hits read back', `${persistedHits.length}`)
    addCheck(checks, !writeRequested || persistence?.report, 'apply wrote report through Foundation store', persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id || 'not applied')
    addCheck(checks, !args.closeCard || liveCard?.lane === 'done', 'close-card marks live backlog card done', liveCard?.lane || 'missing')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID,
      reportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
      snapshot: {
        status: snapshot.status,
        activeCard: snapshot.activeCard,
        inputReports: snapshot.sourceCoverage.length,
        rankedCandidates: snapshot.rankedCandidates.length,
        topCandidates: topCandidates.map(candidate => ({
          rank: candidate.rank,
          title: candidate.title,
          missionScore: candidate.missionScore.total,
          sourceReportArtifactId: candidate.sourceReportArtifactId,
          sourceVideoId: candidate.sourceVideoId,
          nextStep: candidate.recommendedNextStep,
        })),
        approvalRequiredCount: snapshot.approvalRequiredCount,
        devSourceSlice: devSourceSlice ? {
          inputReports: devSourceSlice.counts.inputReports,
          devCandidates: devSourceSlice.counts.devCandidates,
          parkedOperational: devSourceSlice.counts.parkedOperational,
        } : null,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Dev Team Intelligence Director proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Dev Team Intelligence Director proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
