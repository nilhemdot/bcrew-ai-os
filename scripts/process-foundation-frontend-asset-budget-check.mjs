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
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_FRONTEND_ASSET_BUDGET_APPROVAL_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID,
  buildFoundationFrontendAssetBudgetDogfoodProof,
  measureFoundationFrontendAssetsFromRepo,
  measureFoundationFrontendAssetsFromServer,
} from '../lib/foundation-frontend-asset-budgets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 5000,
    skipServer: false,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--skipServer' || arg === '--skipServer=true') args.skipServer = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function stageOk(stage = '') {
  return ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    nightlyAuditSource,
    foundationVerifySource,
    operatorBudgetVerifierSource,
    foundationHtmlSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_FRONTEND_ASSET_BUDGET_APPROVAL_PATH,
      cardId: FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID]),
    readText('package.json'),
    readText('lib/foundation-frontend-asset-budgets.js'),
    readText(FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH),
    readText('lib/code-quality-nightly-audit.js'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-operator-budget-verifier.js'),
    readText('public/foundation.html'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationFrontendAssetBudgetDogfoodProof()
  const repoSnapshot = await measureFoundationFrontendAssetsFromRepo({ repoRoot })
  const liveSnapshot = args.skipServer
    ? null
    : await measureFoundationFrontendAssetsFromServer({
      repoRoot,
      baseUrl: args.baseUrl,
      timeoutMs: args.timeoutMs,
    })

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has frontend asset budget card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to frontend asset budget while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    card?.lane === 'done' || (activeItem && stageOk(activeItem.stage)),
    'Current Sprint item has active stage truth before closeout',
    activeItem ? `${activeItem.cardId}:${activeItem.stage}` : `card lane=${card?.lane || 'missing'}`,
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.healthy.status === 'healthy' &&
      dogfood.oversizedScript.status === 'risk' &&
      dogfood.noStoreLargeScript.status === 'review' &&
      dogfood.missingAsset.status === 'risk' &&
      dogfood.aggregateBloat.status === 'risk',
    'dogfood proves oversized/missing assets fail and no-store assets warn',
    dogfood.invariant,
  )
  addCheck(
    checks,
    repoSnapshot.rows.length >= 4 &&
      repoSnapshot.rows.some(row => row.path === 'public/foundation.js') &&
      repoSnapshot.rows.some(row => row.path === 'public/foundation-router.js') &&
      repoSnapshot.summary.totalBytes > 0 &&
      repoSnapshot.summary.totalGzipBytes > 0 &&
      repoSnapshot.summary.riskCount === 0,
    'repo snapshot discovers Foundation HTML assets dynamically',
    `assets=${repoSnapshot.summary.assetCount} total=${repoSnapshot.summary.totalBytes}B gzip=${repoSnapshot.summary.totalGzipBytes}B status=${repoSnapshot.status}`,
  )
  if (!args.skipServer) {
    addCheck(
      checks,
      liveSnapshot &&
        liveSnapshot.summary.missingCount === 0 &&
        liveSnapshot.rows.every(row => row.served === true && row.httpStatus === 200) &&
        liveSnapshot.status !== 'risk',
      'live server snapshot serves every Foundation asset without risk-level budget failure',
      liveSnapshot
        ? `assets=${liveSnapshot.summary.assetCount} noStore=${liveSnapshot.summary.noStoreCount} total=${liveSnapshot.summary.totalBytes}B status=${liveSnapshot.status}`
        : 'missing live snapshot',
    )
  }
  addCheck(
    checks,
    repoSnapshot.reportOnly === true &&
      repoSnapshot.readOnly === true &&
      repoSnapshot.autoFixes === false &&
      repoSnapshot.writesBacklog === false,
    'frontend asset budget snapshot is report-only and read-only',
    JSON.stringify({
      reportOnly: repoSnapshot.reportOnly,
      readOnly: repoSnapshot.readOnly,
      autoFixes: repoSnapshot.autoFixes,
      writesBacklog: repoSnapshot.writesBacklog,
    }),
  )
  addCheck(
    checks,
    moduleSource.includes('discoverFoundationFrontendAssetRefs') &&
      moduleSource.includes('measureFoundationFrontendAssetsFromRepo') &&
      moduleSource.includes('measureFoundationFrontendAssetsFromServer') &&
      moduleSource.includes('buildFoundationFrontendAssetBudgetDogfoodProof'),
    'focused module owns asset discovery, repo/server measurement, budget rows, and dogfood proof',
    'lib/foundation-frontend-asset-budgets.js',
  )
  addCheck(
    checks,
    nightlyAuditSource.includes('measureFoundationFrontendAssetsFromRepo') &&
      nightlyAuditSource.includes('assetBudgetSnapshot') &&
      nightlyAuditSource.includes('FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID'),
    'nightly code-quality audit consumes frontend asset budget snapshot',
    'lib/code-quality-nightly-audit.js',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-frontend-asset-budget-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:foundation-frontend-asset-budget-check'] || 'missing',
  )
  addCheck(
    checks,
    scriptIsReadOnly(scriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    await repoFileExists(FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_FRONTEND_ASSET_BUDGET_APPROVAL_PATH),
    'plan and approval files exist',
    `${FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH} / ${FOUNDATION_FRONTEND_ASSET_BUDGET_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationHtmlSource.includes('/foundation-router.js') &&
      foundationHtmlSource.includes('/foundation.js') &&
      foundationHtmlSource.includes('/styles.css'),
    'Foundation HTML remains the source for asset discovery',
    'public/foundation.html script/link tags',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID') &&
      operatorBudgetVerifierSource.includes('buildFoundationFrontendAssetBudgetDogfoodProof') &&
      operatorBudgetVerifierSource.includes('FOUNDATION-FRONTEND-ASSET-BUDGET-001 tracks served Foundation JS/CSS asset budgets'),
    'foundation verifier has ID-named frontend asset budget coverage',
    'root verifier delegates asset budget inputs and operator-budget verifier owns dogfood coverage',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-foundation-frontend-asset-budget-closeout.md') &&
        currentPlan.includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY) &&
        currentState.includes(FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      repoStatus: repoSnapshot.status,
      liveStatus: liveSnapshot?.status || 'skipped',
      repoTotalBytes: repoSnapshot.summary.totalBytes,
      repoTotalGzipBytes: repoSnapshot.summary.totalGzipBytes,
    },
    repoSnapshot,
    liveSnapshot,
    dogfood,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
