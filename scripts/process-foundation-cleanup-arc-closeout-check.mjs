#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'FOUNDATION-CLEANUP-ARC-CLOSEOUT-001'
const SPRINT_ID = 'foundation-audit-reliability-2026-05-16'
const CLOSEOUT_KEY = 'foundation-cleanup-arc-closeout-v1'
const PLAN_REF = 'docs/process/foundation-cleanup-arc-closeout-001-plan.md'
const APPROVAL_REF = 'docs/process/approvals/FOUNDATION-CLEANUP-ARC-CLOSEOUT-001.json'
const HANDOFF_REF = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-foundation-cleanup-arc-closeout.md'

const REQUIRED_NEXT_CARDS = [
  'SYSTEM-HEALTH-NIGHTLY-AUDIT-001',
  'SCHEDULED-JOB-STALENESS-DASHBOARD-001',
  'NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001',
  'DOC-ARTIFACT-BLOAT-GUARD-001',
  'PROCESS-WIP-PROTOCOL-001',
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

async function lineCount(relativePath) {
  const text = await readText(relativePath)
  return text.split('\n').length
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [approval, cards, activeSprint, planCriticRuns, handoff, scriptSource, lineCounts] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_REF, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID, ...REQUIRED_NEXT_CARDS]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readText(HANDOFF_REF),
    readText('scripts/process-foundation-cleanup-arc-closeout-check.mjs'),
    Promise.all([
      lineCount('server.js'),
      lineCount('lib/foundation-db.js'),
      lineCount('public/foundation.js'),
      lineCount('scripts/foundation-verify.mjs'),
    ]),
  ])
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID)
  const [serverLines, foundationDbLines, foundationJsLines, verifierLines] = lineCounts
  const missingNextCards = REQUIRED_NEXT_CARDS.filter(id => !cardMap.has(id))
  const handoffLineCount = handoff.split('\n').length
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|upsertFoundationCurrentSprintOverlay\s*\(|fs\.writeFile|writeFile\s*\(/i

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_REF)
  addCheck(checks, cardMap.get(CARD_ID)?.lane === 'executing' || cardMap.get(CARD_ID)?.lane === 'done', 'cleanup closeout card exists in executing/done lane', `${CARD_ID}:${cardMap.get(CARD_ID)?.lane || 'missing'}`)
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeItem && ['building_now', 'done_this_sprint'].includes(activeItem.stage), 'Current Sprint contains cleanup closeout card as active/done work', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${activeItem?.stage || 'missing'}` : 'missing sprint')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, handoffLineCount <= 90, 'cleanup arc handoff stays concise', `${handoffLineCount} lines`)
  addCheck(checks, handoff.includes('Still Not Good Enough') && handoff.includes('Do not overtrust yet') && handoff.includes('No broad "foundation is done" claim'), 'handoff names remaining risk and avoids overclaiming done', HANDOFF_REF)
  addCheck(checks, serverLines < 5000 && foundationDbLines < 5000 && foundationJsLines < 5000 && verifierLines > 10000, 'handoff file-size status matches repo reality', `server=${serverLines} db=${foundationDbLines} frontend=${foundationJsLines} verifier=${verifierLines}`)
  addCheck(checks, missingNextCards.length === 0, 'recommended next reliability cards exist in live backlog', missingNextCards.join(', ') || REQUIRED_NEXT_CARDS.join(', '))
  addCheck(checks, REQUIRED_NEXT_CARDS.every(id => handoff.includes(id)), 'handoff names the next system-health reliability sprint cards', REQUIRED_NEXT_CARDS.filter(id => !handoff.includes(id)).join(', ') || 'all present')
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof is read-only', 'scripts/process-foundation-cleanup-arc-closeout-check.mjs')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    closeoutKey: CLOSEOUT_KEY,
    lineCounts: { serverLines, foundationDbLines, foundationJsLines, verifierLines, handoffLineCount },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation cleanup arc closeout check: ${result.status}`)
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
