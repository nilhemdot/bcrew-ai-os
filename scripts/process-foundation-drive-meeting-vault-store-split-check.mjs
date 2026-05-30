#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SPRINT_ID,
  buildFoundationDriveMeetingVaultStoreSplitDogfoodProof,
  buildSyntheticFoundationDriveMeetingVaultStoreBehaviorProof,
  evaluateFoundationDriveMeetingVaultStoreSplit,
} from '../lib/foundation-drive-meeting-vault-store.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

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
  const moduleSource = await readRepoFile('lib/foundation-drive-meeting-vault-store.js')
  const scriptSource = await readRepoFile(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH)
  const planSource = await readRepoFile(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH)
  const afterLines = await lineCount('lib/foundation-db.js')
  const activeSprint = await getActiveFoundationCurrentSprint()
  const cards = await getBacklogItemsByIds([FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID,
  })
  const evaluation = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
    afterLines,
  })
  const dogfood = await buildFoundationDriveMeetingVaultStoreSplitDogfoodProof({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines: FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
    afterLines,
  })
  const syntheticBehavior = await buildSyntheticFoundationDriveMeetingVaultStoreBehaviorProof()
  const card = cards.find(item => item.id === FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID)
  const currentSprintOk = (
    activeSprint.sprint?.sprintId === FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SPRINT_ID &&
    ['building_now', 'done_this_sprint'].includes(activeItem?.stage)
  ) || (
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID) &&
    await fileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-foundation-drive-meeting-vault-store-split-closeout.md')
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
    ['record', 'DriveAccessPreflightRun('],
    ['record', 'MeetingVaultAclAudit('],
    ['record', 'MeetingVaultAutoEnforcementRun('],
    ['IN', 'SERT INTO '],
    ['UP', 'DATE drive_access_'],
    ['UP', 'DATE meeting_vault_'],
    ['DE', 'LETE FROM '],
  ].some(parts => containsJoinedToken(scriptSource, parts))

  const findings = []
  addFinding(findings, approval.ok, 'approval file validates', approval.ok ? approval.mode : approval.failures.map(f => f.check).join(', '))
  addFinding(findings, currentSprintOk, 'Current Sprint has the card building or done', activeItem ? `${activeSprint.sprint?.sprintId}:${activeItem.stage}` : `${card?.lane || 'missing'} / ${closeout?.key || 'missing closeout'}`)
  addFinding(findings, planCriticOk, 'Plan Critic pass is logged', latestPlanCritic ? `${latestPlanCritic.status} ${latestPlanCritic.score}` : 'missing')
  addFinding(findings, evaluation.ok, 'module extraction shape is valid', JSON.stringify(evaluation))
  addFinding(findings, dogfood.ok, 'dogfood rejects old inline Drive/Meeting Vault ownership', JSON.stringify(dogfood))
  addFinding(findings, syntheticBehavior.ok, 'synthetic Drive/Meeting Vault proof-store behavior is preserved', JSON.stringify(syntheticBehavior))
  addFinding(findings, !hasLiveConnectorToken, 'focused proof avoids live connectors and providers', 'script uses source reads and synthetic fake pool/client behavior only')
  addFinding(findings, !hasLiveMutator, 'focused proof is read-only', 'script does not import/call live Drive/Meeting Vault mutators or raw writes')
  addFinding(findings, packageJson.scripts?.['process:foundation-drive-meeting-vault-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-drive-meeting-vault-store-split-check'] || 'missing')
  addFinding(findings, await fileExists(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH), 'plan exists', FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH)
  addFinding(findings, await fileExists(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_APPROVAL_PATH), 'approval exists', FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_APPROVAL_PATH)
  addFinding(findings, planSource.includes('split/extraction plan') && planSource.toLowerCase().includes('no drive permission mutation'), 'plan satisfies architecture-rule split language', 'large-file split plan is explicit')
  addFinding(findings, foundationDbSource.includes('createFoundationDriveMeetingVaultStore({') && foundationDbSource.includes('export const recordMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.recordMeetingVaultAutoEnforcementRun'), 'foundation-db.js delegates public Drive/Meeting Vault exports', 'store wrapper exports present')
  addFinding(findings, afterLines < FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES, 'foundation-db.js line count decreased', `${FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES}->${afterLines}`)
  addFinding(findings, FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY === 'foundation-drive-meeting-vault-store-split-v1', 'closeout key is stable', FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY)

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY,
    afterLines,
    beforeLines: FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
    dogfood,
    syntheticBehavior,
    evaluation,
    findings,
    failures,
  }

  if (hasArg('--json')) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation Drive/Meeting Vault store split check: ${summary.ok ? 'PASS' : 'FAIL'}`)
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
