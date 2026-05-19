#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_WIP_PROTOCOL_APPROVAL_PATH,
  PROCESS_WIP_PROTOCOL_CARD_ID,
  PROCESS_WIP_PROTOCOL_CLOSEOUT_KEY,
  PROCESS_WIP_PROTOCOL_FINDING_KEY,
  PROCESS_WIP_PROTOCOL_PLAN_PATH,
  PROCESS_WIP_PROTOCOL_SCRIPT_PATH,
  PROCESS_WIP_PROTOCOL_SPRINT_ID,
  buildProcessWipProtocolDogfoodProof,
} from '../lib/process-wip-protocol.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

function planCriticHasWipFinding(result = {}) {
  return (result.findings || []).some(finding => finding.key === PROCESS_WIP_PROTOCOL_FINDING_KEY)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    planText,
    approval,
    protocolSource,
    architectureRulesSource,
    planCriticSource,
    scriptSource,
    activeSprint,
    cards,
    planCriticRuns,
    dogfood,
  ] = await Promise.all([
    readJson('package.json'),
    readText(PROCESS_WIP_PROTOCOL_PLAN_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: PROCESS_WIP_PROTOCOL_APPROVAL_PATH,
      cardId: PROCESS_WIP_PROTOCOL_CARD_ID,
    }),
    readText('lib/process-wip-protocol.js'),
    readText('lib/plan-critic-architectural-rules.js'),
    readText('lib/process-plan-critic.js'),
    readText(PROCESS_WIP_PROTOCOL_SCRIPT_PATH),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getBacklogItemsByIds([PROCESS_WIP_PROTOCOL_CARD_ID]),
    getPlanCriticRunsByCardIds([PROCESS_WIP_PROTOCOL_CARD_ID]),
    buildProcessWipProtocolDogfoodProof(),
  ])

  const card = cards.find(item => item.id === PROCESS_WIP_PROTOCOL_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === PROCESS_WIP_PROTOCOL_CARD_ID)
  const changedFiles = [
    PROCESS_WIP_PROTOCOL_PLAN_PATH,
    PROCESS_WIP_PROTOCOL_APPROVAL_PATH,
    'lib/process-wip-protocol.js',
    'lib/plan-critic-architectural-rules.js',
    'lib/process-plan-critic.js',
    PROCESS_WIP_PROTOCOL_SCRIPT_PATH,
    'scripts/process-plan-critic-architectural-rules-check.mjs',
    'lib/foundation-build-closeout-tightening-records.js',
    'package.json',
    'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-process-wip-protocol-closeout.md',
  ]
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: { id: PROCESS_WIP_PROTOCOL_CARD_ID, priority: 'P0' },
    changedFiles,
    declaredRisk: planText,
    architecturalRules: true,
  })
  const sideWorkPlan = evaluatePlanCriticPlan({
    planText: `
# SYNTHETIC-SIDE-WORK-NO-COORDINATION-001 Plan

## What
Marketing Video Lab side build from a separate chat will add a FAL live route, update server route wiring, add package scripts, commit, and push.

## Why
Steve and the team need quality and speed while Harlan and marketing hub work keeps moving.

## Acceptance Criteria
- The proof calls the actual function path evaluatePlanCriticPlan.
- Substring-only proof is rejected.
- Dogfood proof uses synthetic side-work plans.
- Proof command is npm run process:process-wip-protocol-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- Full process:foundation-ship runs before push.

## Details
Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, and full based on blast radius.

## Risks
Repair path is fail closed and revise the plan.

## Tests
Run npm run process:process-wip-protocol-check.

## Not Next
Do not stop for Foundation review.
`,
    card: { id: 'SYNTHETIC-SIDE-WORK-NO-COORDINATION-001', priority: 'P0' },
    changedFiles: ['public/marketing.js', 'lib/marketing-video-live.js', 'server.js', 'package.json'],
    declaredRisk: 'off-scope hub side build touches shared route and package files',
    architecturalRules: true,
  })
  const coordinatedPlan = evaluatePlanCriticPlan({
    planText: `
# SYNTHETIC-COORDINATED-SIDE-WORK-001 Plan

## What
Build a narrow V1 coordinated Marketing Video Lab route handoff card. Marketing Video Lab requested shared files for server.js and lib/security-access.js. Main-session approved coordination owns the route integration and process:hub-work-check validates the handoff.

## Why
Steve and the team need quality and speed while hub chats keep moving, and the useful operator value is preventing surprise shared-file commits.

## Acceptance Criteria
- The proof calls the actual function path evaluatePlanCriticPlan.
- Substring-only proof is rejected.
- Dogfood proof uses synthetic side-work plans.
- Proof command is npm run process:process-wip-protocol-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- No hub chat commits or pushes; full process:foundation-ship runs before push in the main session.

## Details
Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, and full based on blast radius. Split plan: server.js stays a thin wrapper with no new responsibility; route behavior lives in a module boundary. The route proof has a performance budget under 5 seconds and under 1 MB with curl --max-time and time_total/bytes output. requestedSharedFiles are server.js and lib/security-access.js.

## Risks
Repair path is fail closed and revise the plan if coordination evidence is missing.

## Tests
Run npm run process:process-wip-protocol-check and process:foundation-ship.

## Not Next
Do not build broad hub features, autonomous dev behavior, or any shared file without main-session coordination.
`,
    card: { id: 'SYNTHETIC-COORDINATED-SIDE-WORK-001', priority: 'P0' },
    changedFiles: ['public/marketing.js', 'docs/marketing/video-lab/server-route-review-request.md', 'server.js', 'lib/security-access.js'],
    declaredRisk: 'coordinated side work touches shared route and security files',
    architecturalRules: true,
  })
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|upsertFoundationCurrentSprintOverlay\s*\(|fs\.writeFile|writeFile\s*\(/i

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || PROCESS_WIP_PROTOCOL_APPROVAL_PATH)
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in scoped/executing/done', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === PROCESS_WIP_PROTOCOL_SPRINT_ID && activeItem && ['building_now', 'done_this_sprint'].includes(activeItem.stage), 'Current Sprint contains PROCESS-WIP-PROTOCOL-001 as active/done work', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${activeItem?.stage || 'missing'}` : 'missing sprint')
  addCheck(checks, planCriticRuns.some(run => run.cardId === PROCESS_WIP_PROTOCOL_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, selfReview.status === 'pass' && selfReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'approved WIP plan passes Plan Critic with architecture rules enabled', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, dogfood.ok, 'dogfood protocol accepts hub-only/coordinated plans and rejects uncoordinated shared-file side work', JSON.stringify({
    offScopeMarketing: dogfood.offScopeMarketing?.ok,
    offScopeHarlan: dogfood.offScopeHarlan?.ok,
    hubOnly: dogfood.hubOnly?.ok,
    coordinatedShared: dogfood.coordinatedShared?.ok,
  }))
  addCheck(checks, sideWorkPlan.status === 'revise' && planCriticHasWipFinding(sideWorkPlan), 'Plan Critic rejects uncoordinated side-work shared-file plan', buildPlanCriticResultSummary(sideWorkPlan))
  addCheck(checks, coordinatedPlan.status === 'pass' && !planCriticHasWipFinding(coordinatedPlan), 'Plan Critic accepts coordinated shared-file side-work plan', buildPlanCriticResultSummary(coordinatedPlan))
  addCheck(checks, packageJson.scripts?.['process:process-wip-protocol-check'] === `node --env-file-if-exists=.env ${PROCESS_WIP_PROTOCOL_SCRIPT_PATH}`, 'package exposes focused WIP proof', packageJson.scripts?.['process:process-wip-protocol-check'] || 'missing')
  addCheck(checks, protocolSource.includes('evaluateProcessWipProtocolPlan') && protocolSource.includes('buildProcessWipProtocolDogfoodProof') && protocolSource.includes(PROCESS_WIP_PROTOCOL_FINDING_KEY), 'protocol module owns deterministic evaluator and dogfood proof', 'lib/process-wip-protocol.js')
  addCheck(checks, architectureRulesSource.includes('evaluateProcessWipProtocolPlan') && architectureRulesSource.includes('PROCESS_WIP_PROTOCOL_FINDING_KEY'), 'Plan Critic architecture rules integrate WIP protocol evaluator', 'lib/plan-critic-architectural-rules.js')
  addCheck(checks, planCriticSource.includes('offScopeSideWorkNoCoordination') && planCriticSource.includes('coordinatedSideWork'), 'Plan Critic synthetic architecture proof covers WIP side-work cases', 'lib/process-plan-critic.js')
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof is read-only', PROCESS_WIP_PROTOCOL_SCRIPT_PATH)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: PROCESS_WIP_PROTOCOL_CARD_ID,
    sprintId: PROCESS_WIP_PROTOCOL_SPRINT_ID,
    closeoutKey: PROCESS_WIP_PROTOCOL_CLOSEOUT_KEY,
    selfReview: {
      status: selfReview.status,
      score: selfReview.score,
      findings: selfReview.findings,
    },
    dogfood,
    sideWorkPlan: {
      status: sideWorkPlan.status,
      score: sideWorkPlan.score,
      findings: sideWorkPlan.findings,
    },
    coordinatedPlan: {
      status: coordinatedPlan.status,
      score: coordinatedPlan.score,
      findings: coordinatedPlan.findings,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Process WIP protocol check: ${result.status}`)
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
