#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID,
  buildFoundationFubLeadSourceStoreSplitDogfoodProof,
  buildSyntheticFubLeadSourceStoreBehaviorProof,
  evaluateFoundationFubLeadSourceStoreSplit,
} from '../lib/foundation-fub-lead-source-store.js'
import {
  closeFoundationDb,
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
  const moduleSource = await readRepoFile('lib/foundation-fub-lead-source-store.js')
  const scriptSource = await readRepoFile(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH)
  const planSource = await readRepoFile(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH)
  const afterLines = await lineCount('lib/foundation-db.js')
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
  })
  const evaluation = evaluateFoundationFubLeadSourceStoreSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    beforeLines: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const dogfood = buildFoundationFubLeadSourceStoreSplitDogfoodProof({ afterLines })
  const syntheticBehavior = await buildSyntheticFubLeadSourceStoreBehaviorProof()
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID)
  const currentSprintOk = activeSprint.sprint?.sprintId === FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID &&
    ['building_now', 'done_this_sprint'].includes(activeItem?.stage)
  const latestPlanCritic = planCriticRuns[0] || null
  const planCriticOk = latestPlanCritic?.status === 'pass' && Number(latestPlanCritic?.score) >= 9.8
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const importLines = scriptSource.split('\n').filter(line => line.trim().startsWith('import ')).join('\n')

  const findings = []
  addFinding(findings, approval.ok, 'approval file validates', approval.ok ? approval.mode : approval.failures.map(f => f.check).join(', '))
  addFinding(findings, currentSprintOk, 'Current Sprint has the card building or done', activeItem ? `${activeSprint.sprint?.sprintId}:${activeItem.stage}` : 'missing active item')
  addFinding(findings, planCriticOk, 'Plan Critic pass is logged', latestPlanCritic ? `${latestPlanCritic.status} ${latestPlanCritic.score}` : 'missing')
  addFinding(findings, evaluation.ok, 'module extraction shape is valid', JSON.stringify(evaluation))
  addFinding(findings, dogfood.ok, 'dogfood rejects old inline FUB lead-source store ownership', JSON.stringify(dogfood))
  addFinding(findings, syntheticBehavior.ok, 'synthetic FUB lead-source store behavior is preserved', JSON.stringify(syntheticBehavior))
  addFinding(findings, !/from ['"]\.\.\/lib\/(?:fub|clickup)/i.test(importLines), 'focused proof avoids live FUB refresh calls', 'script uses fake pool/client behavior only')
  addFinding(
    findings,
    !/import\s*{[^}]*upsertFoundationCurrentSprintOverlay/.test(scriptSource) &&
      !/import\s*{[^}]*updateBacklogItem/.test(scriptSource) &&
      !/import\s*{[^}]*createBacklogItem/.test(scriptSource) &&
      !/await\s+upsertFoundationCurrentSprintOverlay\s*\(/.test(scriptSource) &&
      !/await\s+updateBacklogItem\s*\(/.test(scriptSource) &&
      !/await\s+createBacklogItem\s*\(/.test(scriptSource) &&
      !/INSERT\s+INTO\s+/i.test(scriptSource) &&
      !/UPDATE\s+[a-z_]+/i.test(scriptSource) &&
      !/DELETE\s+FROM\s+/i.test(scriptSource),
    'focused proof is read-only',
    'script does not import/call live DB mutators or raw writes',
  )
  addFinding(findings, packageJson.scripts?.['process:foundation-fub-lead-source-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-fub-lead-source-store-split-check'] || 'missing')
  addFinding(findings, await fileExists(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH), 'plan exists', FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH)
  addFinding(findings, await fileExists(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH), 'approval exists', FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH)
  addFinding(findings, planSource.includes('split/extraction plan') && planSource.toLowerCase().includes('no new responsibility'), 'plan satisfies architecture-rule split language', 'large-file split plan is explicit')
  addFinding(findings, foundationDbSource.includes('createFubLeadSourceStore({') && foundationDbSource.includes('export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules'), 'foundation-db.js delegates public FUB lead-source exports', 'store wrapper exports present')
  addFinding(findings, afterLines < FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES, 'foundation-db.js line count decreased', `${FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES}->${afterLines}`)
  addFinding(findings, FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY === 'foundation-fub-lead-source-store-split-v1', 'closeout key is stable', FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY,
    afterLines,
    beforeLines: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
    dogfood,
    syntheticBehavior,
    evaluation,
    findings,
    failures,
  }

  if (hasArg('--json')) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation FUB lead-source store split check: ${summary.ok ? 'PASS' : 'FAIL'}`)
    findings.forEach(finding => console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check} -> ${finding.detail}`))
  }

  process.exit(summary.ok ? 0 : 1)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
