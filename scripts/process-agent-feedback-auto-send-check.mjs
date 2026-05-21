#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
  AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
  buildAgentFeedbackAutoSendStatus,
} from '../lib/agent-feedback-auto-send.js'
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
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-auto-send-check')
  const [
    foundationHubSummary,
    foundationBuildLog,
    opsHub,
    autoSendCardDetail,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
    fetchJson(baseUrl, '/api/ops-hub'),
    fetchJson(baseUrl, `/api/foundation/backlog/${AGENT_FEEDBACK_AUTO_SEND_CARD_ID}`),
  ])
  const foundationHub = mergeBacklogCardDetail(foundationHubSummary, autoSendCardDetail.card)
  const status = await buildAgentFeedbackAutoSendStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    opsHub,
  })

  console.log('Agent Feedback auto-send readiness proof')
  console.log(`  Card: ${AGENT_FEEDBACK_AUTO_SEND_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Runtime mode: ${status.summary.mode}`)
  console.log(`  Candidates inspected: ${status.summary.candidatesInspected}`)
  console.log(`  Would send: ${status.summary.wouldSendCount}`)
  console.log(`  Sent: ${status.summary.sentCount}`)
  console.log(`  Skipped: ${status.summary.skippedCount}`)
  console.log(`  Blocked: ${status.summary.blockedCount}`)
  console.log(`  Warnings: ${status.summary.warningCount}`)
  console.log(`  Repairs: ${status.summary.repairCount}`)
  console.log(`  Georgia Day-30 action: ${status.summary.georgiaDay30Action}`)
  console.log(`  Georgia Day-30 eligible: ${status.summary.georgiaDay30Eligible ? 'yes' : 'no'}`)
  console.log(`  Georgia recipient source: ${status.summary.georgiaDay30RecipientSource || 'missing'}`)
  const georgiaDay30BccRolesApplied = Array.isArray(status.summary.georgiaDay30BccRolesApplied)
    ? status.summary.georgiaDay30BccRolesApplied
    : []
  console.log(`  BCC roles applied: ${georgiaDay30BccRolesApplied.join(', ') || 'none'}`)
  console.log(`  Default cannot send: ${status.summary.defaultCannotSend ? 'yes' : 'no'}`)
  console.log(`  Toggle alone cannot send: ${status.summary.toggleAloneCannotSend ? 'yes' : 'no'}`)
  console.log(`  Allowlist alone cannot send: ${status.summary.allowlistAloneCannotSend ? 'yes' : 'no'}`)
  console.log(`  Both keys required: ${status.summary.bothKeysRequired ? 'yes' : 'no'}`)
  console.log(`  Production-all requires separate approval: ${status.summary.productionAllRequiresSeparateApproval ? 'yes' : 'no'}`)
  console.log(`  Live guard decision: ${status.summary.liveGuardDecision}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`  Auto-send card lane: ${status.summary.autoSendCardLane || 'missing'}`)
  console.log(`  Georgia send follow-up lane: ${status.summary.georgiaSendCardLane || 'missing'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_AUTO_SEND_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
