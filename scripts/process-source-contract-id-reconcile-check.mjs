#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildConnectorCredentialRegistrySnapshot } from '../lib/connector-credential-registry.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
  getSourceContractRegistrySnapshot,
} from '../lib/foundation-db.js'
import { buildSourceContractRegistryRows } from '../lib/source-contract-registry-table.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'SOURCE-CONTRACT-ID-RECONCILE-001'
const SPRINT_ID = 'source-contract-id-reconcile-2026-05-16'
const PLAN_PATH = 'docs/process/source-contract-id-reconcile-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/SOURCE-CONTRACT-ID-RECONCILE-001.json'

const REQUIRED_GOOGLE_TYPE_SOURCE_IDS = [
  'SRC-GDOCS-001',
  'SRC-GSLIDES-001',
  'SRC-GSHEETS-001',
]

const OUT_OF_SCOPE_SOURCE_IDS = [
  'SRC-GA4-001',
  'SRC-GSC-001',
  'SRC-GBP-001',
  'SRC-WEB-001',
  'SRC-REDDIT-001',
  'SRC-GITHUB-001',
  'SRC-TWITTER-001',
  'SRC-TELEGRAM-IN-001',
  'SRC-WHATSAPP-001',
  'SRC-ZOOM-001',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function byId(rows = [], key = 'sourceId') {
  return new Map((rows || []).map(row => [row?.[key], row]).filter(([id]) => Boolean(id)))
}

function rowByKey(snapshot, key) {
  return (snapshot.rows || []).find(row => row.key === key) || null
}

function missingRequiredSourceIds(snapshot) {
  return (snapshot.rows || [])
    .filter(row => ['google-delegated-drive', 'google-delegated-sheets'].includes(row.key))
    .flatMap(row => row.missingSourceIds || [])
    .filter(sourceId => REQUIRED_GOOGLE_TYPE_SOURCE_IDS.includes(sourceId))
}

function removeRequiredGoogleTypeContracts(contracts = []) {
  const blocked = new Set(REQUIRED_GOOGLE_TYPE_SOURCE_IDS)
  return contracts.filter(contract => !blocked.has(contract.sourceId))
}

function summarizeRows(rows = []) {
  return rows
    .map(row => `${row.key}:present=${(row.presentSourceIds || []).join('|') || 'none'} missing=${(row.missingSourceIds || []).join('|') || 'none'}`)
    .join('; ')
}

function hasLiveMutationPath(source = '') {
  return /createBacklogItem\s*\(|updateBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|writeFile\s*\(|fs\.writeFile/i.test(source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const sourceById = byId(sourceContracts)
  const expectedRegistryRows = buildSourceContractRegistryRows(sourceContracts)
  const currentRegistry = buildConnectorCredentialRegistrySnapshot({
    sourceContracts,
    sourceConnectors,
    now: new Date('2026-05-16T23:10:00.000Z'),
  })
  const oldFailureRegistry = buildConnectorCredentialRegistrySnapshot({
    sourceContracts: removeRequiredGoogleTypeContracts(sourceContracts),
    sourceConnectors,
    now: new Date('2026-05-16T23:10:00.000Z'),
  })
  const googleDriveRow = rowByKey(currentRegistry, 'google-delegated-drive')
  const googleSheetsRow = rowByKey(currentRegistry, 'google-delegated-sheets')
  const oldFailureMissing = missingRequiredSourceIds(oldFailureRegistry)
  const currentMissing = missingRequiredSourceIds(currentRegistry)

  const [
    approval,
    activeSprint,
    planCriticRuns,
    sourceContractsSource,
    sourceRegistryDoc,
    currentStateDoc,
    packageSource,
    scriptSource,
    registrySnapshot,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('package.json'),
    readRepoFile('scripts/process-source-contract-id-reconcile-check.mjs'),
    getSourceContractRegistrySnapshot(),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const outOfScopePresent = OUT_OF_SCOPE_SOURCE_IDS.filter(sourceId => sourceById.has(sourceId))
  const requiredRows = REQUIRED_GOOGLE_TYPE_SOURCE_IDS.map(sourceId => sourceById.get(sourceId)).filter(Boolean)
  const requiredActiveRegistryIds = new Set((registrySnapshot.registryRows || [])
    .filter(row => row.active)
    .map(row => row.sourceId))

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH,
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === SPRINT_ID && ['building_now', 'done_this_sprint'].includes(activeItem?.stage),
    'Current Sprint has this card at Building Now or Done This Sprint',
    `${activeSprint.sprint?.sprintId || 'missing'} / ${activeItem?.stage || 'missing'}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:source-contract-id-reconcile-check'] === 'node --env-file-if-exists=.env scripts/process-source-contract-id-reconcile-check.mjs',
    'package exposes focused source-contract ID reconcile proof',
    packageJson.scripts?.['process:source-contract-id-reconcile-check'] || 'missing',
  )
  addCheck(
    checks,
    REQUIRED_GOOGLE_TYPE_SOURCE_IDS.every(sourceId => sourceById.has(sourceId)),
    'Google Docs, Slides, and Sheets type source contracts exist',
    requiredRows.map(row => `${row.sourceId}:${row.status}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    googleDriveRow &&
      REQUIRED_GOOGLE_TYPE_SOURCE_IDS.slice(0, 2).every(sourceId => googleDriveRow.presentSourceIds.includes(sourceId)) &&
      !REQUIRED_GOOGLE_TYPE_SOURCE_IDS.slice(0, 2).some(sourceId => googleDriveRow.missingSourceIds.includes(sourceId)),
    'Google Drive credential row no longer reports Docs/Slides source IDs missing',
    googleDriveRow ? summarizeRows([googleDriveRow]) : 'missing google-delegated-drive row',
  )
  addCheck(
    checks,
    googleSheetsRow &&
      googleSheetsRow.presentSourceIds.includes('SRC-GSHEETS-001') &&
      !googleSheetsRow.missingSourceIds.includes('SRC-GSHEETS-001'),
    'Google Sheets credential row no longer reports Sheets source ID missing',
    googleSheetsRow ? summarizeRows([googleSheetsRow]) : 'missing google-delegated-sheets row',
  )
  addCheck(
    checks,
    currentMissing.length === 0,
    'current registry has no missing Google Workspace type source IDs',
    currentMissing.join(', ') || 'none',
  )
  addCheck(
    checks,
    REQUIRED_GOOGLE_TYPE_SOURCE_IDS.every(sourceId => oldFailureMissing.includes(sourceId)),
    'dogfood recreates the old missing-source failure when the three contracts are removed',
    oldFailureMissing.join(', ') || 'dogfood did not recreate failure',
  )
  addCheck(
    checks,
    sourceById.get('SRC-GSLIDES-001')?.status === 'Scoped, not extracted' &&
      /not.*proof.*Slides extraction is live/i.test(sourceById.get('SRC-GSLIDES-001')?.boundaryNote || ''),
    'Slides source identity does not fake extraction readiness',
    `${sourceById.get('SRC-GSLIDES-001')?.status || 'missing'} / ${sourceById.get('SRC-GSLIDES-001')?.boundaryNote || 'missing boundary'}`,
  )
  addCheck(
    checks,
    ['SRC-GDOCS-001', 'SRC-GSHEETS-001'].every(sourceId => sourceById.get(sourceId)?.validation === 'Not Signed Off'),
    'Docs and Sheets type identities are readable metadata, not signed-off source truth',
    ['SRC-GDOCS-001', 'SRC-GSHEETS-001'].map(sourceId => `${sourceId}:${sourceById.get(sourceId)?.validation || 'missing'}`).join(', '),
  )
  addCheck(
    checks,
    outOfScopePresent.length === 0,
    'out-of-scope auth/manual source IDs were not promoted into source contracts',
    outOfScopePresent.join(', ') || 'none promoted',
  )
  addCheck(
    checks,
    registrySnapshot.evaluation.ok === true &&
      registrySnapshot.evaluation.summary.expectedCount === expectedRegistryRows.length &&
      registrySnapshot.evaluation.summary.activeCount === expectedRegistryRows.length &&
      REQUIRED_GOOGLE_TYPE_SOURCE_IDS.every(sourceId => requiredActiveRegistryIds.has(sourceId)),
    'live DB source_contract_registry was apply-synced to the reconciled source contracts',
    JSON.stringify(registrySnapshot.evaluation.summary),
  )
  addCheck(
    checks,
    REQUIRED_GOOGLE_TYPE_SOURCE_IDS.every(sourceId => sourceRegistryDoc.includes(sourceId)) &&
      currentStateDoc.includes('39 active source-contract rows') &&
      currentStateDoc.includes(CARD_ID),
    'operator docs name the reconciled IDs without stale source-count truth',
    REQUIRED_GOOGLE_TYPE_SOURCE_IDS.filter(sourceId => !sourceRegistryDoc.includes(sourceId)).join(', ') || 'docs updated',
  )
  addCheck(
    checks,
    REQUIRED_GOOGLE_TYPE_SOURCE_IDS.every(sourceId => sourceContractsSource.includes(sourceId)) &&
      !hasLiveMutationPath(scriptSource),
    'implementation is source-contract metadata plus read-only proof, not credential/provider mutation',
    hasLiveMutationPath(scriptSource) ? 'proof script mutation token found' : 'read-only proof source',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    planPath: PLAN_PATH,
    approvalPath: APPROVAL_PATH,
    summary: {
      sourceContractCount: sourceContracts.length,
      registryExpectedCount: registrySnapshot.evaluation.summary.expectedCount,
      registryActiveCount: registrySnapshot.evaluation.summary.activeCount,
      requiredGoogleTypeSourceIds: REQUIRED_GOOGLE_TYPE_SOURCE_IDS,
      currentMissing,
      oldFailureMissing,
      googleDriveRow: googleDriveRow ? {
        presentSourceIds: googleDriveRow.presentSourceIds,
        missingSourceIds: googleDriveRow.missingSourceIds,
      } : null,
      googleSheetsRow: googleSheetsRow ? {
        presentSourceIds: googleSheetsRow.presentSourceIds,
        missingSourceIds: googleSheetsRow.missingSourceIds,
      } : null,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source contract ID reconcile check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
