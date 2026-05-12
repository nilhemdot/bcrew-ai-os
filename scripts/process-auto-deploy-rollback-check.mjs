#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  AUTO_DEPLOY_DASHBOARD_LABEL,
  AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
  AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
  AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
  AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
  AUTO_DEPLOY_WORKER_LABEL,
  buildSyntheticAutoDeployRollbackProof,
} from '../lib/auto-deploy-rollback.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function isTrue(value) {
  return value === true || value === 'true' || value === '1'
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(process.cwd(), relativePath), 'utf8')
}

function includesAll(text, needles) {
  return needles.every(needle => String(text || '').includes(needle))
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function runRunnerDryRun() {
  const { stdout } = await execFile('node', [
    '--env-file-if-exists=.env',
    AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
    '--skipFetch=true',
    '--targetRef=HEAD',
    '--json=true',
  ], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024 * 4,
  })
  return JSON.parse(stdout)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const json = isTrue(args.json)
  const findings = []
  const repoRoot = process.cwd()
  const [
    packageText,
    planText,
    runnerSource,
    proofScriptSource,
    librarySource,
    foundationVerifySource,
    foundationCurrentSprintSource,
    foundationDbSource,
    foundationBuildLogSource,
    currentPlanText,
    currentStateText,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(AUTO_DEPLOY_ROLLBACK_PLAN_PATH),
    readRepoFile(AUTO_DEPLOY_ROLLBACK_RUNNER_PATH),
    readRepoFile(AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH),
    readRepoFile('lib/auto-deploy-rollback.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-build-log.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageText)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText,
    card: { id: AUTO_DEPLOY_ROLLBACK_CARD_ID, priority: 'P1' },
    changedFiles: [
      AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
      AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
      'lib/auto-deploy-rollback.js',
      AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
      AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    declaredRisk: planText,
  })
  const syntheticProof = buildSyntheticAutoDeployRollbackProof()
  const runnerDryRun = await runRunnerDryRun()
  const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents')
  const dashboardLaunchAgentExists = await fileExists(path.join(launchAgentsDir, `${AUTO_DEPLOY_DASHBOARD_LABEL}.plist`))
  const workerLaunchAgentExists = await fileExists(path.join(launchAgentsDir, `${AUTO_DEPLOY_WORKER_LABEL}.plist`))

  await initFoundationDb()
  const sprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([AUTO_DEPLOY_ROLLBACK_CARD_ID])
  await closeFoundationDb()
  const autoDeployCard = cards.find(card => card.id === AUTO_DEPLOY_ROLLBACK_CARD_ID)
  const sprintStage = (sprint.items || []).find(item => item.cardId === AUTO_DEPLOY_ROLLBACK_CARD_ID)?.stage || ''
  const activeBlockerCardId = sprint.sprint?.activeBlockerCardId || null

  addFinding(findings, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, '9.8 approval file is valid', approval.failures?.map(item => item.check).join(', ') || '')
  addFinding(findings, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic approves the Auto Deploy rollback plan', buildPlanCriticResultSummary(planCritic))
  addFinding(findings, syntheticProof.ok, 'synthetic deploy rollback proof passes', JSON.stringify(syntheticProof.summary))
  addFinding(findings, syntheticProof.summary.dirtyWorktreeRejected && syntheticProof.summary.missingTargetRejected && syntheticProof.summary.failedHealthRollsBack, 'synthetic proof rejects dirty/no-target and rolls back failed health', JSON.stringify(syntheticProof.summary))
  addFinding(findings, ['dry_run_ready', 'dry_run_blocked'].includes(runnerDryRun.status) && runnerDryRun.apply === false, 'runner dry-run executes without mutation', runnerDryRun.status || 'missing')
  addFinding(findings, dashboardLaunchAgentExists && workerLaunchAgentExists, 'dashboard and worker LaunchAgent plists are visible', `${AUTO_DEPLOY_DASHBOARD_LABEL}=${dashboardLaunchAgentExists} ${AUTO_DEPLOY_WORKER_LABEL}=${workerLaunchAgentExists}`)
  addFinding(findings, packageJson.scripts?.['auto-deploy:rollback'] === `node --env-file-if-exists=.env ${AUTO_DEPLOY_ROLLBACK_RUNNER_PATH}`, 'package exposes auto-deploy runner')
  addFinding(findings, packageJson.scripts?.['process:auto-deploy-rollback-check'] === `node --env-file-if-exists=.env ${AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH}`, 'package exposes focused proof script')
  addFinding(findings, autoDeployCard?.lane === 'done' && String(autoDeployCard?.statusNote || '').includes(AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY), 'AUTO-DEPLOY-ROLLBACK-001 is done with closeout proof', autoDeployCard?.lane || 'missing')
  addFinding(findings, sprintStage === 'done_this_sprint', 'Auto Deploy rollback moved to Done This Sprint', sprintStage || 'missing')
  addFinding(findings, activeBlockerCardId === AUTO_DEPLOY_ROLLBACK_CARD_ID, 'Current Sprint remains pinned to Auto Deploy rollback for sprint closeout', activeBlockerCardId || 'missing')
  addFinding(findings, includesAll(librarySource, [
    'buildAutoDeployPlan',
    'buildAutoDeployHealthStatus',
    'buildRollbackDecision',
    'buildSyntheticAutoDeployRollbackProof',
    'dirty_worktree',
    'failedHealthRollsBack',
  ]), 'library owns deploy plan, health, rollback, and behavior proof')
  addFinding(findings, includesAll(runnerSource, [
    'isTrue(args.apply)',
    "['merge', '--ff-only', targetRef]",
    'git reset',
    'waitForFoundationHealth',
    'dirtyFiles',
    'AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY',
  ]), 'runner has guarded apply, fast-forward, health, and rollback paths')
  addFinding(findings, includesAll(proofScriptSource, [
    AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
    'synthetic deploy rollback proof passes',
    'runner dry-run executes without mutation',
  ]), 'focused proof script checks behavior and dry-run runner')
  addFinding(findings, includesAll(foundationCurrentSprintSource, [
    AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    'process:auto-deploy-rollback-check',
    'auto-deploy rollback',
  ]), 'Current Sprint seed records Auto Deploy closeout')
  addFinding(findings, includesAll(foundationDbSource, [
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
    AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    'previous SHA',
  ]), 'Foundation backlog seed records Auto Deploy closeout')
  addFinding(findings, includesAll(foundationBuildLogSource, [
    AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
    AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  ]), 'Recent Work closeout record exists')
  addFinding(findings, includesAll(foundationVerifySource, [
    'buildSyntheticAutoDeployRollbackProof',
    'AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY',
    'AUTO-DEPLOY-ROLLBACK-001 adds Mac mini deploy rollback behavior proof',
  ]), 'canonical verifier covers Auto Deploy rollback')
  addFinding(findings, includesAll(currentPlanText, [
    AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
    'previous SHA',
  ]), 'current plan records Auto Deploy closeout')
  addFinding(findings, includesAll(currentStateText, [
    AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    AUTO_DEPLOY_ROLLBACK_CARD_ID,
    'rollback',
  ]), 'current state records Auto Deploy closeout')

  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
    closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
    },
    syntheticProof: syntheticProof.summary,
    runnerDryRun: {
      status: runnerDryRun.status,
      planStatus: runnerDryRun.plan?.status || null,
      blockers: runnerDryRun.plan?.blockers || [],
    },
    sprintStage,
    activeBlockerCardId,
    findings,
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Auto Deploy rollback proof')
    console.log(`  Status: ${result.status}`)
    console.log(`  Plan Critic: ${buildPlanCriticResultSummary(planCritic)}`)
    console.log(`  Dry-run: ${runnerDryRun.status}`)
    console.log(`  Sprint stage: ${sprintStage || 'missing'}`)
    if (findings.length) {
      console.log('Findings')
      findings.forEach(finding => console.log(`  - ${finding.check}: ${finding.detail}`))
    }
    console.log(`${AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER} ${JSON.stringify(result)}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(error => {
  console.error('Auto Deploy rollback proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
