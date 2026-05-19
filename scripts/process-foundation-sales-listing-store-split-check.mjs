#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_SPRINT_ID,
  buildFoundationSalesListingStoreSplitDogfoodProof,
  buildSyntheticFoundationSalesListingStoreBehaviorProof,
  evaluateFoundationSalesListingStoreSplit,
} from '../lib/foundation-sales-listing-store.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const repoRoot = process.cwd()

function hasArg(name) {
  return process.argv.includes(name) || process.argv.includes(`${name}=true`)
}

function addFinding(findings, ok, check, detail) {
  findings.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function containsJoinedToken(source, parts) {
  return String(source || '').includes(parts.join(''))
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
  const moduleSource = await readRepoFile('lib/foundation-sales-listing-store.js')
  const scriptSource = await readRepoFile(FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH)
  const planSource = await readRepoFile(FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH)
  const afterLines = await lineCount('lib/foundation-db.js')
  const activeSprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_SALES_LISTING_STORE_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID,
  })
  const evaluation = evaluateFoundationSalesListingStoreSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
    afterLines,
  })
  const dogfood = await buildFoundationSalesListingStoreSplitDogfoodProof({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
    afterLines,
  })
  const syntheticBehavior = await buildSyntheticFoundationSalesListingStoreBehaviorProof()
  const card = cards.find(item => item.id === FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID)
  const currentSprintOk = (
    activeSprint.sprint?.sprintId === FOUNDATION_SALES_LISTING_STORE_SPLIT_SPRINT_ID &&
    ['building_now', 'done_this_sprint'].includes(activeItem?.stage)
  ) || (
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID) &&
    await fileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-foundation-sales-listing-store-split-closeout.md')
  )
  const latestPlanCritic = planCriticRuns[0] || null
  const planCriticOk = latestPlanCritic?.status === 'pass' && Number(latestPlanCritic?.score) >= 9.8
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const importLines = scriptSource.split('\n').filter(line => line.trim().startsWith('import ')).join('\n')

  const hasLiveConnectorToken = [
    ['..', '/lib/', 'openai'],
    ['..', '/lib/', 'anthropic'],
    ['..', '/lib/', 'gemini'],
    ['..', '/lib/', 'canva'],
    ['..', '/lib/', 'missive'],
    ['..', '/lib/', 'gmail'],
    ['..', '/lib/', 'slack'],
    ['..', '/lib/', 'clickup'],
    ['google', '-delegated'],
    ['drive', '-client'],
  ].some(parts => containsJoinedToken(importLines, parts))
  const hasLiveMutator = [
    ['create', 'BacklogItem('],
    ['update', 'BacklogItem('],
    ['upsert', 'FoundationCurrentSprintOverlay'],
    ['upsert', 'SalesListingAssignment('],
    ['sync', 'SalesListingCases'],
    ['IN', 'SERT INTO '],
    ['UP', 'DATE sales_listing_assignments'],
    ['DE', 'LETE FROM '],
  ].some(parts => containsJoinedToken(scriptSource, parts))

  const findings = []
  addFinding(findings, approval.ok, 'approval file validates', approval.ok ? approval.mode : approval.failures.map(f => f.check).join(', '))
  addFinding(findings, currentSprintOk, 'Current Sprint has the card building or done', activeItem ? `${activeSprint.sprint?.sprintId}:${activeItem.stage}` : `${card?.lane || 'missing'} / ${closeout?.key || 'missing closeout'}`)
  addFinding(findings, planCriticOk, 'Plan Critic pass is logged', latestPlanCritic ? `${latestPlanCritic.status} ${latestPlanCritic.score}` : 'missing')
  addFinding(findings, evaluation.ok, 'module extraction shape is valid', JSON.stringify(evaluation))
  addFinding(findings, dogfood.ok, 'dogfood rejects old inline Sales Listing ownership', JSON.stringify(dogfood))
  addFinding(findings, syntheticBehavior.ok, 'synthetic Sales Listing store behavior is preserved', JSON.stringify(syntheticBehavior))
  addFinding(findings, !hasLiveConnectorToken, 'focused proof avoids live connectors and providers', 'script uses source reads and synthetic fake pool behavior only')
  addFinding(findings, !hasLiveMutator, 'focused proof is read-only', 'script does not import/call live Sales Listing mutators or raw writes')
  addFinding(findings, packageJson.scripts?.['process:foundation-sales-listing-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-sales-listing-store-split-check'] || 'missing')
  addFinding(findings, await fileExists(FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH), 'plan exists', FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH)
  addFinding(findings, await fileExists(FOUNDATION_SALES_LISTING_STORE_SPLIT_APPROVAL_PATH), 'approval exists', FOUNDATION_SALES_LISTING_STORE_SPLIT_APPROVAL_PATH)
  addFinding(findings, planSource.includes('split/extraction plan') && planSource.toLowerCase().includes('no clickup read') && planSource.toLowerCase().includes('no clickup write'), 'plan satisfies architecture-rule split language', 'large-file split plan is explicit')
  addFinding(findings, foundationDbSource.includes('createFoundationSalesListingStore({') && foundationDbSource.includes('export const upsertSalesListingAssignment = foundationSalesListingStore.upsertSalesListingAssignment'), 'foundation-db.js delegates public Sales Listing exports', 'store wrapper exports present')
  addFinding(findings, afterLines < FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES && afterLines < 5000, 'foundation-db.js line count decreases below architecture-risk line', `${FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES}->${afterLines}`)
  addFinding(findings, FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY === 'foundation-sales-listing-store-split-v1', 'closeout key is stable', FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY,
    afterLines,
    beforeLines: FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
    dogfood,
    syntheticBehavior,
    evaluation,
    findings,
    failures,
  }

  if (hasArg('--json')) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation Sales Listing store split check: ${summary.ok ? 'PASS' : 'FAIL'}`)
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
