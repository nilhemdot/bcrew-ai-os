#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
  buildAgentOnboardingFeedbackSystemStatus,
} from '../lib/agent-onboarding-feedback-system.js'

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
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
    ownersReviewQueue,
    opsHub,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
    fetchJson(baseUrl, '/api/owners/review-queue'),
    fetchJson(baseUrl, '/api/ops-hub'),
  ])

  const status = await buildAgentOnboardingFeedbackSystemStatus({
    repoRoot: process.cwd(),
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
    ownersReviewQueue,
    opsHub,
  })

  console.log('Agent Onboarding Feedback system proof')
  console.log(`  Card: ${AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Grouped systems: ${status.summary.groupedSystemCountBefore} -> ${status.summary.groupedSystemCount}`)
  console.log(`  Baseline systems preserved: ${status.summary.baselinePreservedCount}/${status.summary.groupedSystemCountBefore}`)
  console.log(`  Agent Onboarding systems: ${status.summary.agentOnboardingSystemCount}`)
  console.log(`  Agent Onboarding group count: ${status.summary.agentOnboardingGroupCount}`)
  console.log(`  Implementation state: ${status.summary.implementationState}`)
  console.log(`  Send card lane: ${status.summary.sendCardLane}`)
  console.log(`  Empty-group audit lane: ${status.summary.emptyAuditLane}`)
  console.log(`  Georgia due metadata proof: ${status.summary.georgiaDue ? 'yes' : 'no'}`)
  console.log(`  Chris current source-state proof: ${status.summary.chrisMetadataCurrent ? 'yes' : 'no'}`)
  console.log(`  Privacy metadata-only proof: ${status.summary.privacyMetadataOnly ? 'yes' : 'no'}`)
  console.log(`  Closeout owns only card: ${status.summary.closeoutOwnsOnlyAgentOnboarding ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_ONBOARDING_FEEDBACK_SYSTEM ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
