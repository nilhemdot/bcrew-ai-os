#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'FOUNDATION-STAB-CAPTURE-001'
const SPRINT_ID = 'foundation-audit-reliability-2026-05-16'
const CLOSEOUT_KEY = 'foundation-stab-capture-v1'
const PLAN_REF = 'docs/process/foundation-stab-capture-001-plan.md'
const APPROVAL_REF = 'docs/process/approvals/FOUNDATION-STAB-CAPTURE-001.json'
const HANDOFF_REF = 'docs/handoffs/2026-05-16-foundation-stab-capture.md'

const PROPOSAL_CARD_IDS = [
  'SYSTEM-HEALTH-NIGHTLY-AUDIT-001',
  'SCHEDULED-JOB-STALENESS-DASHBOARD-001',
  'DOC-ARTIFACT-BLOAT-GUARD-001',
  'NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001',
  'PROCESS-WIP-PROTOCOL-001',
  'HISTORICAL-VERIFIER-ACTIVE-SPRINT-DECOUPLE-001',
  'CONNECTOR-COMPLETION-SPRINT',
  'BUILD-INTEL-EXTRACTION-IMPLEMENTATION',
  'E2E-STAGING-HARNESS-001',
  'MULTI-WORKER-DISPATCH-001',
  'PILLAR-4-SYSTEM-CAPABILITIES-001',
  'PILLAR-5-AGENT-INVENTORY-001',
  'REPLY-WATCHING-LOOP',
  'TELEGRAM-BOTS-001',
  'MARKETING-PIPELINE-REBUILD',
  'DEPARTMENT-DIRECTORS-001',
  'MASTER-DIRECTOR-001',
  'CANVA-CLIENT-MARKETING-VIDEO-LAB-REVIEW-001',
  'FOUNDATION-IA-UI-RESTRUCTURE',
]

const EXISTING_DEDUPE_IDS = [
  'ACTION-ROUTER-001',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const allIds = [CARD_ID, ...PROPOSAL_CARD_IDS, ...EXISTING_DEDUPE_IDS]
  const [approval, cards, activeSprint, planCriticRuns, handoff, scriptSource] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_REF, cardId: CARD_ID }),
    getBacklogItemsByIds(allIds),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readText(HANDOFF_REF),
    readText('scripts/process-foundation-stab-capture-check.mjs'),
  ])
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const sprintCardIds = new Set((activeSprint.items || []).map(item => item.cardId))
  const proposalCards = PROPOSAL_CARD_IDS.map(id => cardMap.get(id)).filter(Boolean)
  const missingProposalIds = PROPOSAL_CARD_IDS.filter(id => !cardMap.has(id))
  const proposalExecutionLeaks = proposalCards.filter(card => card.lane === 'executing')
  const proposalSprintLeaks = PROPOSAL_CARD_IDS.filter(id => sprintCardIds.has(id))
  const thinProposalCards = proposalCards.filter(card =>
    !String(card.summary || '').trim() ||
    !String(card.whyItMatters || '').trim() ||
    !String(card.nextAction || '').trim() ||
    !String(card.statusNote || '').includes('Proposal-only capture')
  )
  const actionRouter = cardMap.get('ACTION-ROUTER-001')
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID)
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|upsertFoundationCurrentSprintOverlay\s*\(|fs\.writeFile|writeFile\s*\(/i

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_REF)
  addCheck(checks, cardMap.get(CARD_ID)?.lane === 'executing' || cardMap.get(CARD_ID)?.lane === 'done', 'active capture card exists in executing/done lane', `${CARD_ID}:${cardMap.get(CARD_ID)?.lane || 'missing'}`)
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeItem && ['building_now', 'done_this_sprint'].includes(activeItem.stage), 'Current Sprint contains capture card only as active/done work', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${activeItem?.stage || 'missing'}` : 'missing sprint')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, missingProposalIds.length === 0, 'all proposal cards exist in live backlog', missingProposalIds.join(', ') || `${proposalCards.length}/${PROPOSAL_CARD_IDS.length}`)
  addCheck(checks, proposalExecutionLeaks.length === 0, 'proposal cards did not enter executing', proposalExecutionLeaks.map(card => `${card.id}:${card.lane}`).join(', ') || 'none')
  addCheck(checks, proposalSprintLeaks.length === 0, 'proposal cards were not added to Current Sprint', proposalSprintLeaks.join(', ') || 'none')
  addCheck(checks, thinProposalCards.length === 0, 'proposal cards have summary, why, next action, and proposal-only status note', thinProposalCards.map(card => card.id).join(', ') || 'all enriched')
  addCheck(checks, actionRouter?.lane === 'done', 'ACTION-ROUTER-001 was deduped, not recreated', actionRouter ? `${actionRouter.id}:${actionRouter.lane}` : 'missing')
  addCheck(checks, handoff.includes('SYSTEM-HEALTH-NIGHTLY-AUDIT-001') && handoff.includes('SCHEDULED-JOB-STALENESS-DASHBOARD-001') && handoff.includes('ACTION-ROUTER-001 already exists'), 'handoff records created/enriched/deduped proposal list', HANDOFF_REF)
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof is read-only after capture', 'scripts/process-foundation-stab-capture-check.mjs')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    closeoutKey: CLOSEOUT_KEY,
    proposalCardIds: PROPOSAL_CARD_IDS,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation stab capture check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
