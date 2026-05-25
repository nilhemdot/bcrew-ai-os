#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getIntelligenceReportBundle,
} from '../lib/foundation-db.js'
import {
  DEV_SOURCE_SLICE_ROUTER_APPROVAL_PATH,
  DEV_SOURCE_SLICE_ROUTER_CARD_ID,
  DEV_SOURCE_SLICE_ROUTER_PLAN_PATH,
  DEV_SOURCE_SLICE_ROUTER_SCRIPT_PATH,
  buildDevSourceSliceDirectorInputBundle,
  buildDevSourceSliceRouterDogfoodProof,
  buildDevSourceSliceRouterSnapshot,
} from '../lib/dev-source-slice-router.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    limit: Number(argv.find(arg => String(arg).startsWith('--limit='))?.split('=')[1] || 8),
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

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    planSource,
    routerSource,
    approvalValidation,
    dogfood,
    reportIds,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(DEV_SOURCE_SLICE_ROUTER_PLAN_PATH),
    readRepoFile('lib/dev-source-slice-router.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: DEV_SOURCE_SLICE_ROUTER_APPROVAL_PATH,
      cardId: DEV_SOURCE_SLICE_ROUTER_CARD_ID,
    }),
    buildDevSourceSliceRouterDogfoodProof(),
    listLatestSharedSourceReportIds({ limit: args.limit }),
  ])

  const reportBundles = []
  for (const reportArtifactId of reportIds) {
    reportBundles.push(await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 80, hitLimit: 120 }))
  }
  const snapshot = buildDevSourceSliceRouterSnapshot({ reportBundles })
  const directorBundle = buildDevSourceSliceDirectorInputBundle(snapshot)
  const sourceIds = new Set(snapshot.sourceCoverage.flatMap(source => source.sourceIds))

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || DEV_SOURCE_SLICE_ROUTER_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:dev-source-slice-router-check'] === 'node --env-file-if-exists=.env scripts/process-dev-source-slice-router-check.mjs', 'package exposes focused source-slice proof', packageJson.scripts?.['process:dev-source-slice-router-check'] || 'missing')
  addCheck(
    checks,
    /park normal (ops tasks|operational follow-up)/i.test(planSource) && /Dev (Intelligence )?Director/i.test(planSource),
    'plan defines source pond to Dev slice boundary',
    DEV_SOURCE_SLICE_ROUTER_PLAN_PATH,
  )
  addCheck(checks, /park_operational_followup/.test(routerSource) && /dev_director_candidate/.test(routerSource), 'router has explicit Dev vs ops-only routes', 'lib/dev-source-slice-router.js')
  addCheck(checks, dogfood.ok === true, 'dogfood routes system/workflow items and parks commission follow-up', JSON.stringify(dogfood.cases))
  addCheck(checks, reportIds.length >= 3, 'latest shared source reports are discovered from Foundation', `${reportIds.length}`)
  addCheck(checks, ['SRC-MEETINGS-001', 'SRC-MISSIVE-001'].every(sourceId => sourceIds.has(sourceId)) && (sourceIds.has('SRC-GMAIL-001') || sourceIds.has('SRC-SLACK-001')), 'live source coverage includes meetings/comms sources', Array.from(sourceIds).join(', '))
  addCheck(checks, snapshot.ok === true, 'live source-slice snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.devCandidates.length >= 1, 'live Dev candidates are available for Director input', `${snapshot.devCandidates.length}`)
  addCheck(checks, snapshot.parkedOperational.length >= 1, 'live ops-only candidates are parked out of Dev Director', `${snapshot.parkedOperational.length}`)
  addCheck(checks, directorBundle.report.topFindings.length === Math.min(20, snapshot.devCandidates.length), 'Director input bundle contains filtered Dev candidates only', `${directorBundle.report.topFindings.length}`)
  addCheck(checks, snapshot.externalWrites === false && snapshot.proposalOnly === true, 'source-slice router is read-only/proposal-only', `${snapshot.proposalOnly}/${snapshot.externalWrites}`)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: DEV_SOURCE_SLICE_ROUTER_CARD_ID,
    checks,
    failures,
    reportIds,
    snapshot: {
      status: snapshot.status,
      counts: snapshot.counts,
      sourceCoverage: snapshot.sourceCoverage,
      topDevCandidates: snapshot.devCandidates.slice(0, 8).map(candidate => ({
        title: candidate.title,
        score: candidate.classification.relevance.score,
        sourceIds: candidate.sourceIds,
        sourceReportArtifactId: candidate.sourceReportArtifactId,
      })),
      parkedOperational: snapshot.parkedOperational.slice(0, 5).map(candidate => candidate.title),
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Dev Source Slice Router check')
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
