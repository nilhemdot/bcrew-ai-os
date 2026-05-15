#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID,
  buildFoundationStrategySourceSnapshotSplitDogfoodProof,
  buildSyntheticStrategySourceSnapshotRows,
  evaluateFoundationStrategySourceSnapshotSplit,
} from '../lib/foundation-strategy-source-snapshots.js'
import {
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const repoRoot = process.cwd()

function hasArg(name) {
  return process.argv.includes(name) || process.argv.includes(`${name}=true`)
}

function addFinding(findings, ok, check, detail) {
  findings.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function lineCount(relativePath) {
  const source = await readRepoFile(relativePath)
  return source.split('\n').length
}

async function main() {
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const moduleSource = await readRepoFile('lib/foundation-strategy-source-snapshots.js')
  const scriptSource = await readRepoFile(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH)
  const planSource = await readRepoFile(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH)
  const afterLines = await lineCount('lib/foundation-db.js')
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
  })
  const evaluation = evaluateFoundationStrategySourceSnapshotSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const dogfood = buildFoundationStrategySourceSnapshotSplitDogfoodProof({ afterLines })
  const syntheticRows = buildSyntheticStrategySourceSnapshotRows()
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID)
  const currentSprintOk = activeSprint.sprint?.sprintId === FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID &&
    ['building_now', 'done_this_sprint'].includes(activeItem?.stage)
  const latestPlanCritic = planCriticRuns[0] || null
  const planCriticOk = latestPlanCritic?.status === 'pass' && Number(latestPlanCritic?.score) >= 9.8
  const packageJson = JSON.parse(await readRepoFile('package.json'))

  const findings = []
  addFinding(findings, approval.ok, 'approval file validates', approval.ok ? approval.mode : approval.failures.map(f => f.check).join(', '))
  addFinding(findings, currentSprintOk, 'Current Sprint has the card building or done', activeItem ? `${activeSprint.sprint?.sprintId}:${activeItem.stage}` : 'missing active item')
  addFinding(findings, planCriticOk, 'Plan Critic pass is logged', latestPlanCritic ? `${latestPlanCritic.status} ${latestPlanCritic.score}` : 'missing')
  addFinding(findings, evaluation.ok, 'module extraction shape is valid', JSON.stringify(evaluation))
  addFinding(findings, dogfood.ok, 'dogfood rejects old inline builder ownership', JSON.stringify(dogfood))
  addFinding(findings, syntheticRows.bhagRows.length === 2 && syntheticRows.engineRow.sourceId === 'SRC-FREEDOM-ENGINE-001', 'synthetic row proof preserves source-backed row shape', JSON.stringify(syntheticRows))
  addFinding(findings, !/^import .*google-delegated/m.test(scriptSource), 'focused proof avoids live Google reads', 'script does not import Google delegated readers')
  addFinding(findings, !/import\s*{[^}]*upsertFoundationCurrentSprintOverlay/.test(scriptSource) && !/import\s*{[^}]*updateBacklogItem/.test(scriptSource), 'focused proof is read-only', 'script does not import live DB mutators')
  addFinding(findings, packageJson.scripts?.['process:foundation-strategy-source-snapshot-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-strategy-source-snapshot-split-check'] || 'missing')
  addFinding(findings, await fileExists(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH), 'plan exists', FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH)
  addFinding(findings, await fileExists(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH), 'approval exists', FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH)
  addFinding(findings, moduleSource.includes("'Benson Crew Bhag Builder'!K4:L13") && moduleSource.includes("'Agent Engine'!A1:K10"), 'source ranges are preserved in the module', 'BHAG and Agent Engine ranges present')
  addFinding(findings, foundationDbSource.includes('getDocSourceSnapshot(BHAG_DOC_PATH)') && foundationDbSource.includes('getLiveBhagSourceSnapshot()'), 'doc snapshot dispatch still calls delegated builders', 'BHAG and Agent Engine dispatch present')
  addFinding(findings, afterLines < FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES, 'foundation-db.js line count decreased', `${FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES}->${afterLines}`)
  addFinding(findings, FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY === 'foundation-strategy-source-snapshot-split-v1', 'closeout key is stable', FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY,
    afterLines,
    beforeLines: FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES,
    dogfood,
    evaluation,
    findings,
    failures,
  }

  if (hasArg('--json')) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation Strategy source snapshot split check: ${summary.ok ? 'PASS' : 'FAIL'}`)
    findings.forEach(finding => console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check} -> ${finding.detail}`))
  }

  if (!summary.ok) process.exitCode = 1
  process.exit(summary.ok ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
