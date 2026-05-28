#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  buildFoundationReviewSprintBaseline,
  buildFoundationReviewSprintStatus,
  FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH,
  FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
  loadFoundationReviewSprintArtifact,
  writeFoundationReviewSprintArtifact,
} from '../lib/foundation-review-sprint.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getFoundationSnapshot,
  initFoundationDb,
  recordActionRouteCuration,
} from '../lib/foundation-db.js'
import { buildBacklogHygieneSnapshot } from '../lib/backlog-hygiene.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function getRepoHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    maxBuffer: 1024 * 64,
  })
  return String(stdout || '').trim()
}

async function buildLiveStatus() {
  await initFoundationDb()
  const foundation = await getFoundationSnapshot()
  const actionRouter = await getActionRouterSnapshot({ limit: 500 })
  const hygiene = buildBacklogHygieneSnapshot({
    backlogItems: foundation.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
  })
  const artifact = await loadFoundationReviewSprintArtifact()
  const status = buildFoundationReviewSprintStatus({
    artifact,
    backlogItems: foundation.backlogItems || [],
    actionRouter,
    hygiene,
  })
  return { foundation, actionRouter, hygiene, artifact, status }
}

async function writeBaseline() {
  await initFoundationDb()
  const foundation = await getFoundationSnapshot()
  const actionRouter = await getActionRouterSnapshot({ limit: 500 })
  const baseline = buildFoundationReviewSprintBaseline({
    repoHead: await getRepoHead(),
    foundation,
    actionRouter,
  })
  const artifact = {
    schemaVersion: baseline.schemaVersion,
    closeoutKey: FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
    artifactPath: FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH,
    baseline,
    proof: {
      lastCheckedAt: null,
      status: 'baseline-captured',
    },
  }
  await writeFoundationReviewSprintArtifact(artifact)
  return artifact
}

async function recordActionRouteCurationMetadata(artifact) {
  const dispositions = artifact?.baseline?.actionReview?.pendingRoutes || []
  for (const disposition of dispositions) {
    await recordActionRouteCuration(disposition.routeId, {
      ...disposition,
      closeoutKey: FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
      reviewedBy: 'Steve-approved Foundation 1100 Review Sprint',
    }, 'foundation-review-sprint')
  }
  return dispositions.length
}

async function writeProof(status) {
  const artifact = await loadFoundationReviewSprintArtifact()
  if (!artifact) throw new Error(`${FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH} is missing.`)
  const nextArtifact = {
    ...artifact,
    proof: {
      lastCheckedAt: new Date().toISOString(),
      status: status.status,
      summary: status.summary,
      findingCount: status.findings.length,
    },
  }
  await writeFoundationReviewSprintArtifact(nextArtifact)
  return nextArtifact
}

async function main() {
  const args = parseArgs()
  const checks = []

  if (boolArg(args.writeBaseline)) {
    const artifact = await writeBaseline()
    console.log(`Foundation 1100 baseline written: ${FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH}`)
    console.log(`  Backlog cards: ${artifact.baseline.counts.backlogCards}`)
    console.log(`  Hygiene findings: ${artifact.baseline.counts.hygieneFindings}`)
    console.log(`  Pending routes: ${artifact.baseline.counts.actionRoutesPending}`)
    console.log(`  Research dispositions: ${artifact.baseline.researchCuration.dispositions.length}`)
    return
  }

  let { artifact, status } = await buildLiveStatus()
  if (boolArg(args.recordActionReviewCuration)) {
    const count = await recordActionRouteCurationMetadata(artifact)
    console.log(`Recorded Foundation 1100 curation metadata on ${count} action route(s).`)
    ;({ artifact, status } = await buildLiveStatus())
  }
  if (boolArg(args.writeProof)) {
    await writeProof(status)
    ;({ artifact, status } = await buildLiveStatus())
  }

  console.log('Foundation 1100 Review Sprint proof')
  console.log(`  Closeout: ${FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY}`)
  console.log(`  Artifact: ${FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Wrapper cards done: ${status.summary.wrapperCardsDone}/${status.summary.wrapperCardCount}`)
  console.log(`  Hygiene: ${status.summary.currentHygieneCritical} critical / ${status.summary.currentHygieneWarnings} warnings`)
  console.log(`  Action routes curated: ${status.summary.actionRoutesCurated}/${status.summary.actionRoutesSnapshotted}`)
  console.log(`  Research dispositions: ${status.summary.researchCardsDispositionOnly}/${status.summary.researchCardsSnapshotted}`)
  console.log(`  Phase G order count: ${status.summary.phaseGOrderCount}`)

  ensure(checks, Boolean(artifact), 'baseline artifact exists', artifact ? FOUNDATION_REVIEW_SPRINT_ARTIFACT_PATH : 'missing')
  ensure(checks, status.status === 'healthy', 'Foundation 1100 status is healthy', status.status)
  ensure(
    checks,
    status.summary.wrapperCardsDone === status.summary.wrapperCardCount,
    'all sprint wrapper cards are done',
    `${status.summary.wrapperCardsDone}/${status.summary.wrapperCardCount}`,
  )
  ensure(
    checks,
    status.summary.actionRoutesCurated === 18,
    'all snapped action routes have curation metadata',
    `${status.summary.actionRoutesCurated}/18`,
  )
  ensure(
    checks,
    status.summary.actionRoutesAppliedBySprint === 0,
    'no action routes were applied by the cleanup sprint',
    `${status.summary.actionRoutesAppliedBySprint} applied`,
  )
  ensure(
    checks,
    status.summary.researchCardsDispositionOnly === 102,
    'all research cards are disposition-only',
    `${status.summary.researchCardsDispositionOnly}/102`,
  )
  ensure(checks, status.summary.phaseGOrderCount === 6, 'Phase G readiness order is recorded', `${status.summary.phaseGOrderCount}/6`)

  for (const finding of status.findings) {
    ensure(
      checks,
      finding.severity !== 'critical',
      `no critical finding: ${finding.type}`,
      finding.issue,
    )
  }

  console.log('')
  for (const check of checks) {
    const prefix = check.ok ? 'PASS' : 'FAIL'
    console.log(`${prefix} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  const failed = checks.filter(check => !check.ok)
  console.log('')
  console.log(`FOUNDATION_1100_REVIEW_SUMMARY ${JSON.stringify({
    status: status.status,
    wrapperCardsDone: status.summary.wrapperCardsDone,
    actionRoutesCurated: status.summary.actionRoutesCurated,
    researchCardsDispositionOnly: status.summary.researchCardsDispositionOnly,
    phaseGOrderCount: status.summary.phaseGOrderCount,
    findingCount: status.findings.length,
  })}`)
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation 1100 Review Sprint proof failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
