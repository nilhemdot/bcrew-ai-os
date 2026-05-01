#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
  buildAgentFeedbackCompanyEmailPolicyStatus,
} from '../lib/agent-feedback-company-email-policy.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db.js'

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
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-company-email-policy-check')
  const [
    foundationHub,
    foundationBuildLog,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
  ])
  const status = await buildAgentFeedbackCompanyEmailPolicyStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
  })

  console.log('Agent Feedback Company Email policy proof')
  console.log(`  Card: ${AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Steve eligible: ${status.summary.steveEligible ? 'yes' : 'no'}`)
  console.log(`  Steve recipient source: ${status.summary.steveRecipientSource || 'missing'}`)
  console.log(`  Steve BCC deduped roles: ${status.summary.steveBccDedupedRoles.join(', ') || 'none'}`)
  console.log(`  Georgia eligible: ${status.summary.georgiaEligible ? 'yes' : 'no'}`)
  console.log(`  Georgia recipient source: ${status.summary.georgiaRecipientSource || 'missing'}`)
  console.log(`  Synthetic external eligible: ${status.summary.syntheticExternalEligible ? 'yes' : 'no'}`)
  console.log(`  Synthetic external recipient source: ${status.summary.syntheticExternalRecipientSource || 'missing'}`)
  console.log(`  Auto-send Company Email candidates: ${status.summary.autoSendCompanyEmailCandidates}/${status.summary.autoSendCandidates}`)
  console.log(`  Reminder Company Email candidates: ${status.summary.reminderCompanyEmailCandidates}/${status.summary.reminderCandidates}`)
  console.log(`  Personal Email blockers: ${status.summary.personalEmailBlockers.length ? status.summary.personalEmailBlockers.join(', ') : 'none'}`)
  console.log(`  Steve allowlist can live-send with both keys: ${status.summary.steveAllowlistCanLiveSendWithBothKeys ? 'yes' : 'no'}`)
  console.log(`  Production-all requires separate approval: ${status.summary.productionAllRequiresSeparateApproval ? 'yes' : 'no'}`)
  console.log(`  Gmail sent: ${status.summary.gmailSent ? 'yes' : 'no'}`)
  console.log(`  ClickUp Requested written: ${status.summary.clickUpRequestedWritten ? 'yes' : 'no'}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb()
})
