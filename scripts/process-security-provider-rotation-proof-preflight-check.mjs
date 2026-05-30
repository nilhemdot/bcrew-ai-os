#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  FUBZAHND_APP_CONFIG_PATH,
  SECURITY_006_CARD_ID,
  SECURITY_PROVIDER_ROTATION_PROOF_CARD_ID as CARD_ID,
  SECURITY_PROVIDER_ROTATION_PROOF_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_APPROVAL_PATH as APPROVAL_PATH,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CHANGED_FILES as CHANGED_FILES,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CLOSEOUT_PATH as CLOSEOUT_PATH,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_LEDGER_PATH as LEDGER_PATH,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_PLAN_PATH as PLAN_PATH,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_PROOF_COMMANDS as PROOF_COMMANDS,
  SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_SCRIPT_PATH as SCRIPT_PATH,
  buildSecurityProviderRotationProofPreflightDogfood,
  buildSecurityProviderRotationProofPreflightLedger,
  collectSensitiveRawValues,
  evaluateSecurityProviderRotationProofPreflightLedger,
  parseAppConfigMetadata,
  validateNoSecretLedger,
} from '../lib/security-provider-rotation-proof-preflight.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-security-provider-rotation-proof-preflight'
const RETURNED_REASON = 'No-secret provider-rotation preflight is complete; real rotation, revocation, retirement, or live/dead-key proof remains provider-side and approval-bound.'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function buildReturnedSprintItem(previousItem = {}) {
  return {
    ...previousItem,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    order: previousItem.order || previousItem.sprintOrder || 2,
    stage: 'returned',
    planRef: PLAN_PATH,
    definitionOfDone: 'SECURITY-PROVIDER-ROTATION-PROOF-001 remains unshipped until provider-side rotation, revocation, retirement, or dead-key proof exists without raw secret values in repo truth.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'No-secret preflight only; provider-side proof is not cleared.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: previousItem.existingWorkCheck || {
      existingWorkReviewed: true,
      doctrineReviewed: true,
      liveBacklogChecked: true,
      noDuplicateCard: true,
      noConflictingCloseout: true,
      notes: 'Preflight only. Existing FUBZahnd source note, SECURITY-006, and SECURITY-PROVIDER-ROTATION-PROOF-001 backlog truth were reused.',
    },
    returnedReason: RETURNED_REASON,
    metadata: {
      ...(previousItem.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalBoundary: 'Provider-side account-owner action is required before any credential can be marked rotated, revoked, retired, or dead.',
      preflightOnly: true,
    },
  }
}

async function updateLiveState() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'mark SECURITY-PROVIDER-ROTATION-PROOF-001 returned pending provider-side proof',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  await updateBacklogItem(CARD_ID, {
    lane: 'scoped',
    nextAction: 'Blocked pending provider-side rotation, revocation, retirement, or dead-key proof from the relevant account owners. No-secret FUBZahnd App.config exposure ledger preflight is complete; do not mark credentials closed until proof references exist without raw values.',
    statusNote: 'No-secret preflight completed under `security-provider-rotation-proof-preflight-v1`. The ledger identifies Ambition/KPI webhooks, Follow Up Boss, SMTP mail server, SQL Server, and Supabase exposure classes from App.config metadata only. No raw values, hashes, auth calls, provider calls, or rotations were run.',
  }, ACTOR)
  await updateBacklogItem(SECURITY_006_CARD_ID, {
    lane: 'scoped',
    nextAction: 'Use the SECURITY-PROVIDER-ROTATION-PROOF-001 no-secret ledger as the provider/account checklist, then rotate, revoke, retire, or prove dead each exposed credential with owner-supplied proof references. Do not copy values into docs or chat.',
    statusNote: 'Backlog hygiene pass on 2026-04-28 moved this out of executing because no same-session provider-side rotation/retirement proof is active in the repo. FUBZahnd App.config exposure is now triaged in the no-secret ledger `docs/process/security-provider-rotation-proof-ledger.json`, but SECURITY-006 remains scoped because provider-side closure proof is still missing.',
  }, ACTOR)

  const previous = await getActiveFoundationCurrentSprint()
  const previousItems = Array.isArray(previous?.items) ? previous.items : []
  const hasItem = previousItems.some(item => item.cardId === CARD_ID)
  const nextItems = (hasItem ? previousItems : [
    ...previousItems,
    { cardId: CARD_ID, order: previousItems.length + 1 },
  ]).map(item => item.cardId === CARD_ID ? buildReturnedSprintItem(item) : item)

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: previous?.sprint?.sprintId || 'security-provider-rotation-proof-preflight-2026-05-18',
        status: 'active',
        goal: previous?.sprint?.goal || 'Keep P0 security proof blockers explicit while Foundation continues safe work.',
        activeBlockerCardId: CARD_ID,
        metadata: {
          ...(previous?.sprint?.metadata || {}),
          currentStatus: 'blocked_returned',
          nextAction: 'SECURITY-PROVIDER-ROTATION-PROOF-001 is returned pending provider-side proof. Continue the next safe Foundation card from repo truth.',
          closeoutKey: CLOSEOUT_KEY,
          approvalBoundary: 'Actual rotation/revocation/retirement and live/dead-key proof require provider-side owner action.',
        },
      },
      items: nextItems,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'SECURITY-PROVIDER-ROTATION-PROOF-001 preflight completed as no-secret metadata only and must return pending provider-side proof.',
    },
  )
}

function compactLedgerSummary(ledger = {}) {
  return {
    schemaVersion: ledger.schemaVersion,
    cardId: ledger.cardId,
    companionCardId: ledger.companionCardId,
    closeoutKey: ledger.closeoutKey,
    preflightOnly: ledger.preflightOnly,
    status: ledger.status,
    summary: ledger.summary,
    exposureIds: (ledger.exposureRows || []).map(row => row.exposureId),
  }
}

async function buildStatus(args = {}) {
  const writeRequested = args.apply || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })
  if (writeRequested) {
    await updateLiveState()
  }

  const [
    planSource,
    approval,
    packageJson,
    moduleSource,
    scriptSource,
    ledger,
    closeoutRecords,
    closeoutDoc,
    currentPlan,
    currentState,
    sourceNote,
    appConfigText,
    cards,
    sprint,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/security-provider-rotation-proof-preflight.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(LEDGER_PATH).then(JSON.parse),
    getFoundationBuildCloseouts(),
    readRepoFile(CLOSEOUT_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/source-notes/fub-zahnd-middleware.md'),
    fs.readFile(FUBZAHND_APP_CONFIG_PATH, 'utf8'),
    getBacklogItemsByIds([CARD_ID, SECURITY_006_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])

  const checks = []
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: CARD_ID,
      title: 'Prove provider-side rotation or retirement for exposed credentials',
      lane: 'scoped',
      priority: 'P0',
      rank: 4,
      summary: 'Preflight provider-side credential closure with a no-secret ledger, then keep real rotation proof blocked pending provider-owner action.',
      whyItMatters: 'Foundation cannot treat exposed credentials as closed until provider-side proof exists without copying secrets into repo truth.',
      nextAction: 'Blocked pending provider-side proof after no-secret preflight.',
      statusNote: RETURNED_REASON,
    },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'P0 security preflight; no raw values, hashes, provider calls, auth repair, external writes, or credential rotation.',
    repoRoot,
  })
  const rawValues = collectSensitiveRawValues(appConfigText)
  const runtimeLedger = buildSecurityProviderRotationProofPreflightLedger({
    appConfigText,
    generatedAt: ledger.generatedAt,
    sourcePath: FUBZAHND_APP_CONFIG_PATH,
  })
  const dogfood = buildSecurityProviderRotationProofPreflightDogfood()
  const noSecretLedger = validateNoSecretLedger(ledger, rawValues)
  const runtimeNoSecretLedger = validateNoSecretLedger(runtimeLedger, rawValues)
  const ledgerEvaluation = evaluateSecurityProviderRotationProofPreflightLedger(ledger)
  const runtimeEvaluation = evaluateSecurityProviderRotationProofPreflightLedger(runtimeLedger)
  const closeout = closeoutRecords.find(record => record.key === CLOSEOUT_KEY) || null
  const card = cards.find(item => item.id === CARD_ID) || null
  const security006 = cards.find(item => item.id === SECURITY_006_CARD_ID) || null
  const packageScript = packageJson.scripts?.['process:security-provider-rotation-proof-preflight-check']
  const currentSprint = await buildFoundationCurrentSprintStatus({
    sprint: sprint?.sprint,
    items: sprint?.items || [],
    backlogItems: cards,
    closeouts: closeoutRecords,
  })
  const runtimeMetadata = parseAppConfigMetadata(appConfigText)

  for (const check of approval.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, approval.ok, 'approval file integrity passes', approval.mode || 'missing')
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes at 9.8+', `${planReview.score}/10`)
  addCheck(checks, dogfood.ok, 'dogfood rejects raw leakage, missing groups, and false provider closure', dogfood.invariant)
  addCheck(checks, runtimeMetadata.length >= 35, 'real FUBZahnd App.config metadata is readable without printing values', `${runtimeMetadata.length} metadata rows`)
  addCheck(checks, noSecretLedger.ok, 'static ledger stores no raw secret values or hashes', noSecretLedger.findings.join(', ') || 'clean')
  addCheck(checks, runtimeNoSecretLedger.ok, 'runtime-built ledger stores no raw secret values or hashes', runtimeNoSecretLedger.findings.join(', ') || 'clean')
  addCheck(checks, ledgerEvaluation.ok, 'static ledger remains blocked pending provider-side proof', ledgerEvaluation.findings.join(', ') || JSON.stringify(ledgerEvaluation.summary))
  addCheck(checks, runtimeEvaluation.ok, 'runtime-built ledger remains blocked pending provider-side proof', runtimeEvaluation.findings.join(', ') || JSON.stringify(runtimeEvaluation.summary))
  addCheck(checks, JSON.stringify(compactLedgerSummary(ledger)) === JSON.stringify(compactLedgerSummary(runtimeLedger)), 'static ledger matches runtime metadata summary', `sha=${sha256(JSON.stringify(compactLedgerSummary(ledger))).slice(0, 12)}`)
  addCheck(checks, packageScript === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
  addCheck(checks, moduleSource.includes('validateNoSecretLedger') && scriptSource.includes('collectSensitiveRawValues'), 'function-path proof owns no-secret behavior', 'module/script wired')
  addCheck(checks, closeout?.status === 'blocked-preflight', 'closeout registry marks blocked-preflight', closeout?.status || 'missing')
  addCheck(checks, closeout?.backlogIds?.includes(CARD_ID) && closeout?.backlogIds?.includes(SECURITY_006_CARD_ID), 'closeout links provider card and SECURITY-006', (closeout?.backlogIds || []).join(', ') || 'missing')
  addCheck(checks, closeout?.proofCommands?.some(command => command.includes('foundation:verify')), 'closeout includes foundation:verify proof', (closeout?.proofCommands || []).join(' | ') || 'missing')
  addCheck(checks, closeoutDoc.includes(CLOSEOUT_KEY) && closeoutDoc.includes('No raw values'), 'handoff records no-secret closeout boundary', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentState.includes(CLOSEOUT_KEY), 'current plan/state name the preflight boundary', 'plan/state updated')
  addCheck(checks, sourceNote.includes('SECURITY-006') && sourceNote.includes('Do not quote those values'), 'FUBZahnd source note keeps security warning', 'warning present')
  addCheck(
    checks,
    card?.lane === 'scoped' && (!writeRequested || /No-secret preflight completed/.test(card?.statusNote || '')),
    writeRequested ? 'live provider-proof card remains scoped after preflight' : 'live provider-proof card remains scoped before apply',
    card ? `${card.lane}: ${card.statusNote}` : 'missing',
  )
  addCheck(
    checks,
    security006?.lane === 'scoped' && (!writeRequested || /no-secret ledger/i.test(security006?.statusNote || '')),
    writeRequested ? 'live SECURITY-006 remains scoped after preflight' : 'live SECURITY-006 remains scoped before apply',
    security006 ? `${security006.lane}: ${security006.statusNote}` : 'missing',
  )
  addCheck(checks, currentSprint.status === 'risk' || currentSprint.status === 'healthy', 'Current Sprint status is computable after returned preflight', currentSprint.status)
  addCheck(checks, NOT_NEXT.every(boundary => planSource.includes(boundary) || closeoutDoc.includes(boundary)), 'not-next approval boundaries are recorded', `${NOT_NEXT.length} boundaries`)

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    planReview: { status: planReview.status, score: planReview.score },
    ledger: compactLedgerSummary(ledger),
    runtimeMetadata: {
      rowCount: runtimeMetadata.length,
      sensitiveRawValuesInspectedNotPrinted: rawValues.length,
    },
    dogfood: {
      ok: dogfood.ok,
      invariant: dogfood.invariant,
    },
  }
}

async function main() {
  const args = parseArgs()
  const status = await buildStatus(args)
  if (args.json) {
    console.log(JSON.stringify(status, null, 2))
  } else {
    console.log('Security provider rotation proof preflight')
    for (const check of status.checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${status.checks.length - status.failed.length}/${status.checks.length} checks passed`)
  }
  if (!status.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Security provider rotation proof preflight failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
