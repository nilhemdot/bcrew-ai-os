#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildSyntheticBuildLogOwnershipProof,
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
} from '../lib/foundation-build-log.js'
import {
  FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH,
  FOUNDATION_BUILD_LOG_BEHAVIOR_PATH,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH,
  buildSyntheticFoundationBuildLogRegistrySplitProof,
  countTextLines,
  evaluateFoundationBuildLogRegistrySplit,
} from '../lib/foundation-build-log-monolith-slice.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const APPROVAL_PATH = 'docs/process/approvals/CLEANUP-003.json'

function parseArgs(argv = process.argv.slice(2)) {
  return Object.fromEntries(argv.map(arg => {
    const normalized = arg.replace(/^--/, '')
    const [key, ...rest] = normalized.split('=')
    return [key, rest.length ? rest.join('=') : true]
  }))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    behaviorSource,
    recordsSource,
    packageSource,
    approvalValidation,
    planCriticRuns,
    activeSprint,
  ] = await Promise.all([
    readRepoFile(FOUNDATION_BUILD_LOG_BEHAVIOR_PATH),
    readRepoFile(FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH),
    readRepoFile('package.json'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: APPROVAL_PATH,
      cardId: FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID,
    }),
    getPlanCriticRunsByCardIds([FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(error => ({ error })),
  ])

  const closeouts = getFoundationBuildCloseouts()
  const validation = getFoundationBuildCloseoutValidation()
  const ownershipProof = buildSyntheticBuildLogOwnershipProof()
  const syntheticProof = buildSyntheticFoundationBuildLogRegistrySplitProof()
  const packageJson = JSON.parse(packageSource)
  const behaviorLineCount = countTextLines(behaviorSource)
  const recordLineCount = countTextLines(recordsSource)
  const splitEvaluation = evaluateFoundationBuildLogRegistrySplit({
    behaviorLineCount,
    recordLineCount,
    closeoutCount: validation.closeoutCount,
    invalidCloseoutCount: (validation.invalidCloseoutKeys || []).length,
    behaviorImportsRecords: behaviorSource.includes('./foundation-build-closeout-records.js') ||
      behaviorSource.includes('./build-closeout-data-source.js'),
    behaviorEmbedsRecords: behaviorSource.includes('const closeoutRecords = [') || behaviorSource.includes('export const closeoutRecords = ['),
    recordsExportCloseouts: recordsSource.includes('export const closeoutRecords = ['),
    recordsEmbedBehavior: recordsSource.includes('function normalizeList') || recordsSource.includes('export function'),
    ownershipProofOk: ownershipProof.ok === true,
  })

  const sprintItem = activeSprint.items?.find(item => item.backlogId === FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID) || null
  const historicalCloseoutOwnsCard = closeouts.some(closeout =>
    closeout.key === FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY &&
      (Array.isArray(closeout.backlogIds) ? closeout.backlogIds : []).includes(FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID)
  )
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'Plan approval file is valid v2', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists before build', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === 'foundation-build-log-monolith-slice-2026-05-13' || historicalCloseoutOwnsCard, 'active sprint or historical closeout owns the monolith slice sprint', historicalCloseoutOwnsCard ? FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY : activeSprint.sprint?.sprintId || activeSprint.error?.message || 'missing')
  addCheck(checks, ['building_now', 'done_this_sprint'].includes(sprintItem?.stage) || historicalCloseoutOwnsCard, 'CLEANUP-003 reached Building Now, Done This Sprint, or historical closeout', historicalCloseoutOwnsCard ? FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY : sprintItem?.stage || 'missing')
  addCheck(checks, splitEvaluation.ok, 'real split layout passes evaluator', splitEvaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || `${behaviorLineCount}/${recordLineCount}`)
  addCheck(checks, syntheticProof.ok && syntheticProof.unsplit.ok === false && syntheticProof.split.ok === true, 'dogfood proof rejects unsplit oversized build-log and accepts split shape', `unsplit=${syntheticProof.unsplit.ok} split=${syntheticProof.split.ok}`)
  addCheck(checks, closeouts.some(closeout => closeout.key === 'foundation-performance-v1') && closeouts.some(closeout => closeout.key === 'plan-critic-architectural-rules-v1'), 'recent closeout keys still resolve through actual function path', closeouts.slice(0, 3).map(closeout => closeout.key).join(', '))
  addCheck(checks, (validation.invalidCloseoutKeys || []).length === 0 && validation.closeoutCount >= 100, 'closeout validation stays clean after split', `${validation.closeoutCount} closeouts`)
  addCheck(checks, ownershipProof.ok === true, 'existing build-log ownership proof still passes', ownershipProof.ok ? 'ownership ok' : 'ownership failed')
  addCheck(checks, packageJson.scripts?.['process:foundation-build-log-monolith-slice-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-build-log-monolith-slice-check'] || 'missing')
  addCheck(checks, behaviorSource.includes('export { FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION }'), 'schema version remains exported from behavior module', 'compat export present')
  addCheck(checks, recordsSource.includes('FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION'), 'data module owns schema version and records', FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH)

  await closeFoundationDb()

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID,
    closeoutKey: FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY,
    checks,
    failed,
    splitEvaluation,
    syntheticProof,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Foundation build-log monolith slice proof')
    checks.forEach(check => console.log(`${check.ok ? '✓' : '✗'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`))
  }

  if (!result.ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
