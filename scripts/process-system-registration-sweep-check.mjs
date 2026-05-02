#!/usr/bin/env node

import process from 'node:process'
import {
  buildSystemRegistrationSweepStatus,
  SYSTEM_REGISTRATION_SWEEP_CARD_ID,
  SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
} from '../lib/system-registration-sweep.js'

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
  const [sourceOfTruth, foundationHub, foundationBuildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=120'),
  ])

  const status = await buildSystemRegistrationSweepStatus({
    repoRoot: process.cwd(),
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
  })

  console.log('System registration sweep proof')
  console.log(`  Card: ${SYSTEM_REGISTRATION_SWEEP_CARD_ID}`)
  console.log(`  Closeout: ${SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Grouped systems: ${status.summary.groupedSystemCount}`)
  console.log(`  Shipped system requirements: ${status.summary.shippedSystemRequirementCount}`)
  console.log(`  Missing shipped systems: ${status.summary.missingShippedSystemCount}`)
  console.log(`  GLS visible: ${status.summary.glsSystemVisible ? 'yes' : 'no'}`)
  console.log(`  GLS service area: ${status.summary.glsServiceArea || 'missing'}`)
  console.log(`  GLS implementation: ${status.summary.glsImplementationState || 'missing'}`)
  console.log(`  GLS source truth: ${status.summary.glsSourceTruthCorrect ? 'yes' : 'no'}`)
  console.log(`  GLS supporting evidence: ${status.summary.glsSupportingEvidenceCorrect ? 'yes' : 'no'}`)
  console.log(`  GLS routes: ${status.summary.glsRoutesVisible ? 'yes' : 'no'}`)
  console.log(`  Agent Onboarding Feedback visible: ${status.summary.agentOnboardingFeedbackVisible ? 'yes' : 'no'}`)
  console.log(`  Agent Onboarding Feedback live: ${status.summary.agentOnboardingFeedbackLive ? 'yes' : 'no'}`)
  console.log(`  Closeout owns only card: ${status.summary.closeoutOwnsOnlySweep ? 'yes' : 'no'}`)
  for (const shipped of status.shippedSystems) {
    console.log(`  ${shipped.systemId}: ${shipped.visible ? 'visible' : 'missing'} / ${shipped.implementationState || 'missing'} / ${shipped.serviceArea || 'missing'}`)
  }
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`SYSTEM_REGISTRATION_SWEEP ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
