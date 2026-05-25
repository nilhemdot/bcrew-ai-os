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
  BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH,
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH,
  BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH,
  buildBuildIntelSourceValueGraderDogfoodProof,
  buildBuildIntelSourceValueGraderSnapshot,
  buildBuildIntelSourceValueGraderWriteSet,
  renderBuildIntelSourceValueGraderReport,
} from '../lib/build-intel-source-value-grader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'build-intel-source-value-grader-v1'

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

async function loadFullWatchReports({ limit = 40 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, title, structured_output_json, action_required_items, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
           OR report_artifact_id LIKE 'batch:youtube-latest-20:api-full-watch-v1%'
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT $1
      `,
      [Math.min(80, Math.max(1, Number(limit) || 40))],
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadDirectorReport() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, title, structured_output_json, metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = 'director:dev-team-intelligence-director-001:aios-mission-v0'
        LIMIT 1
      `,
    )
    return result.rows[0] || null
  } finally {
    await pool.end().catch(() => {})
  }
}

async function persistSnapshot(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH,
    operation: 'persist Build Intel source-value grader report',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildBuildIntelSourceValueGraderWriteSet(snapshot)
  const report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  await fs.writeFile(path.join(repoRoot, BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH), renderBuildIntelSourceValueGraderReport(snapshot), 'utf8')
  return { report, writeSet }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persistence = null

  await initFoundationDb()

  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    dogfood,
    reports,
    directorReport,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH),
    readRepoFile('lib/build-intel-source-value-grader.js'),
    readRepoFile(BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH),
    buildBuildIntelSourceValueGraderDogfoodProof(),
    loadFullWatchReports(),
    loadDirectorReport(),
  ])

  const snapshot = buildBuildIntelSourceValueGraderSnapshot({ reports, directorReport })

  if (args.apply) {
    persistence = await persistSnapshot(snapshot)
  }

  addCheck(checks, packageJson.scripts?.['process:build-intel-source-value-grader-check'] === 'node --env-file-if-exists=.env scripts/process-build-intel-source-value-grader-check.mjs', 'package exposes focused source-value grader proof', packageJson.scripts?.['process:build-intel-source-value-grader-check'] || 'missing')
  addCheck(checks, /lane-specific grades/i.test(planSource) && /realtor AI coaching\/training value/i.test(planSource), 'plan requires lane-specific source grades', BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH)
  addCheck(checks, /realtor_ai_training/.test(moduleSource) && /aios_dev_build/.test(moduleSource), 'module separates realtor training from AIOS build grading', 'lib/build-intel-source-value-grader.js')
  addCheck(checks, scriptSource.includes('upsertIntelligenceReportArtifact') && scriptSource.includes('renderBuildIntelSourceValueGraderReport'), 'focused proof can persist a reviewable report', BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves ranking, lane split, no volume-only S grade, and throttling', JSON.stringify(dogfood.cases))
  addCheck(checks, reports.length >= 3, 'live full-watch reports are available', `${reports.length}`)
  addCheck(checks, Boolean(directorReport), 'live Dev Director report is available', directorReport?.report_artifact_id || 'missing')
  addCheck(checks, snapshot.ok === true, 'source-value grader snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.sourceGrades.length >= 5, 'source-value grader ranks multiple creators', `${snapshot.sourceGrades.length}`)
  addCheck(checks, snapshot.sourceGrades.some(source => source.primaryLane === 'realtor_ai_training' || source.laneScores.some(lane => lane.laneId === 'realtor_ai_training' && ['A', 'S'].includes(lane.grade))), 'realtor training value is preserved as a lane', snapshot.sourceGrades.map(source => `${source.creator}:${source.primaryLane}`).join(', '))
  addCheck(checks, snapshot.externalWrites === false && snapshot.noAutoBacklogPromotion === true, 'grader remains report-only', `${snapshot.externalWrites}/${snapshot.noAutoBacklogPromotion}`)
  if (args.apply) {
    addCheck(checks, persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id, 'persisted source-value grader report reads back', persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id || 'missing')
  }

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : snapshot.status,
    cardId: BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
    reportArtifactId: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
    checks,
    failed: failures,
    snapshot: {
      status: snapshot.status,
      sourceCount: snapshot.sourceGrades.length,
      topDevBuildSources: snapshot.topDevBuildSources.slice(0, 8).map(source => ({
        creatorId: source.creatorId,
        creator: source.creator,
        devBuildGrade: source.devBuildGrade,
        overallGrade: source.overallGrade,
        primaryUse: source.primaryUse,
        watchRecommendation: source.watchRecommendation,
        watchedVideos: source.watchedVideos,
        buildCandidates: source.buildCandidates,
        bestDirectorRank: source.bestDirectorRank,
      })),
      topByLane: snapshot.topByLane,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Build Intel Source Value Grader check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
