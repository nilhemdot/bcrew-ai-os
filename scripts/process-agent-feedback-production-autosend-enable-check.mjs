#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
} from '../lib/agent-feedback-auto-send.js'
import {
  buildAgentFeedbackProductionAutoSendEnableStatus,
} from '../lib/agent-feedback-production-autosend-dry-run.js'
import { assertFoundationDbReadyForReadOnlyGate } from '../lib/foundation-db.js'

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

function mergeBacklogCardDetail(foundationHub, card) {
  if (!card?.id) return foundationHub
  const backlogItems = Array.isArray(foundationHub.backlogItems) ? foundationHub.backlogItems : []
  const existing = backlogItems.find(item => item.id === card.id)
  return {
    ...foundationHub,
    backlogItems: existing
      ? backlogItems.map(item => item.id === card.id ? { ...item, ...card } : item)
      : [...backlogItems, card],
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-production-autosend-enable-check')
  const [
    foundationHubSummary,
    foundationBuildLog,
    opsHub,
    productionCardDetail,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
    fetchJson(baseUrl, '/api/ops-hub'),
    fetchJson(baseUrl, `/api/foundation/backlog/${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID}`),
  ])
  const foundationHub = mergeBacklogCardDetail(foundationHubSummary, productionCardDetail.card)
  const status = await buildAgentFeedbackProductionAutoSendEnableStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    opsHub,
  })

  console.log('Agent Feedback production auto-send enable proof')
  console.log(`  Card: ${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Production enabled: ${status.summary.productionAutoSendEnabled ? 'yes' : 'no'}`)
  console.log(`  Live guard: ${status.summary.liveGuardDecision || 'missing'}`)
  console.log(`  Send window: ${status.summary.sendWindow || 'missing'}${status.summary.sendWindowOpen ? ' / open now' : ' / closed now'}`)
  console.log(`  Last run: ${status.summary.lastRunStatus || 'missing'} ${status.summary.lastRunAt || ''}`.trim())
  console.log(`  Next run: ${status.summary.nextRunAt || 'missing'}`)
  console.log(`  Sent: ${status.summary.sentCount}`)
  console.log(`  Skipped: ${status.summary.skippedCount}`)
  console.log(`  Blocked: ${status.summary.blockedCount}`)
  console.log(`  Warnings: ${status.summary.warningCount}`)
  console.log(`  Repairs: ${status.summary.repairCount}`)
  console.log(`  Reminder mode: ${status.summary.remindersMode || 'missing'}`)
  console.log(`  Metadata-only: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`  Card lane: ${status.summary.cardLane || 'missing'}`)
  console.log(`  Closeout state: ${status.summary.closeoutStatus || 'missing'} / ${status.summary.closeoutAcceptanceState || 'missing'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
