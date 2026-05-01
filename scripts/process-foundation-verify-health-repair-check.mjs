#!/usr/bin/env node

import process from 'node:process'
import {
  buildAgentOnboardingFeedbackSystemStatus,
} from '../lib/agent-onboarding-feedback-system.js'
import {
  buildAgentFeedbackRealUserSubmitRepairStatus,
} from '../lib/agent-feedback-real-user-submit-repair.js'
import {
  buildDailyExecSummaryStatus,
} from '../lib/foundation-daily-exec-summary.js'
import {
  buildFoundationVerifyHealthRepairStatus,
  FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
  FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
} from '../lib/foundation-verify-health-repair.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const [
    foundationHub,
    foundationBuildLog,
    sourceOfTruth,
    ownersReviewQueue,
    opsHub,
    dailySummary,
    changeLog,
    changesApi,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=20'),
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/owners/review-queue'),
    fetchJson(baseUrl, '/api/ops-hub'),
    fetchJson(baseUrl, '/api/foundation/daily-summary?date=2026-04-30&days=7'),
    fetchJson(baseUrl, '/api/foundation/change-log?limit=100'),
    fetchJson(baseUrl, '/api/foundation/changes?limit=100'),
  ])

  const dailyExecSummaryStatus = await buildDailyExecSummaryStatus({
    repoRoot: process.cwd(),
    dailySummary,
    buildLog: foundationBuildLog,
    changeLog,
    changesApi,
    foundationHub,
  })
  const agentOnboardingFeedbackSystemStatus = await buildAgentOnboardingFeedbackSystemStatus({
    repoRoot: process.cwd(),
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
    ownersReviewQueue,
    opsHub,
  })
  const agentFeedbackRealUserSubmitRepairStatus = await buildAgentFeedbackRealUserSubmitRepairStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    includeDuplicateProbe: false,
  })
  const status = await buildFoundationVerifyHealthRepairStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    dailyExecSummaryStatus,
    agentOnboardingFeedbackSystemStatus,
    agentFeedbackRealUserSubmitRepairStatus,
  })

  console.log('Foundation verify health repair proof')
  console.log(`  Card: ${FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID}`)
  console.log(`  Closeout: ${FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Dashboard commit: ${status.summary.dashboardCommit || 'missing'}`)
  console.log(`  Worker commit: ${status.summary.workerCommit || 'missing'}`)
  console.log(`  Daily summary status: ${status.summary.dailyStatus || 'missing'}`)
  console.log(`  Latest builds represented: ${status.summary.latestRecentBuildsRepresented}/5`)
  console.log(`  Agent Onboarding status: ${status.summary.onboardingStatus || 'missing'}`)
  console.log(`  Chris source-state current: ${status.summary.chrisMetadataCurrent ? 'yes' : 'no'}`)
  console.log(`  Real-user repair status: ${status.summary.realUserRepairStatus || 'missing'}`)
  console.log(`  Production auto-send enabled: ${status.summary.productionAutoSendEnabled ? 'yes' : 'no'}`)
  console.log(`  Closeout owns only health repair: ${status.summary.closeoutOwnsOnlyHealthRepair ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`FOUNDATION_VERIFY_HEALTH_REPAIR_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
