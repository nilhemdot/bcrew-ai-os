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
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'CONNECTOR-COMPLETION-SPRINT'
const SPRINT_ID = 'connector-completion-prep-2026-05-16'
const PLAN_PATH = 'docs/process/connector-completion-sprint-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/CONNECTOR-COMPLETION-SPRINT.json'
const MATRIX_PATH = 'docs/handoffs/2026-05-16-connector-completion-prep-matrix.md'

const NO_AUTH_CARD_IDS = [
  'SOURCE-CONTRACT-ID-RECONCILE-001',
  'GCAL-ATOM-SCHEDULE-001',
]

const REQUIRED_MATRIX_SNIPPETS = [
  'ready_no_auth',
  'auth_required',
  'manual_decision',
  'SRC-GDOCS-001',
  'SRC-GSLIDES-001',
  'SRC-GSHEETS-001',
  'SRC-GA4-001',
  'SRC-GSC-001',
  'SRC-GBP-001',
  'SRC-WEB-001',
  'SRC-REDDIT-001',
  'SRC-GITHUB-001',
  'SRC-TWITTER-001',
  'SOURCE-CONTRACT-ID-RECONCILE-001',
  'GCAL-ATOM-SCHEDULE-001',
  'BUILD-INTEL-EXTRACTION-IMPLEMENTATION',
  'no credential or provider mutation',
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

function unique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].sort()
}

function sourceIdsUsedByJobs(jobs = []) {
  return new Set(jobs.flatMap(job => Array.isArray(job.sourceIds) ? job.sourceIds : []))
}

function classifyRegistryRows(registryRows = []) {
  const rowsWithMissingSourceIds = registryRows.filter(row => Array.isArray(row.missingSourceIds) && row.missingSourceIds.length)
  const blockedRows = registryRows.filter(row => row.status === 'blocked')
  const noAuthSourceContractIds = unique(rowsWithMissingSourceIds
    .filter(row => ['google-delegated-drive', 'google-delegated-sheets'].includes(row.key))
    .flatMap(row => row.missingSourceIds))
  const authRequiredSourceIds = unique(blockedRows.flatMap(row => row.sourceIds || []))
  const missingSourceIds = unique(rowsWithMissingSourceIds.flatMap(row => row.missingSourceIds || []))
  return {
    rowsWithMissingSourceIds,
    blockedRows,
    noAuthSourceContractIds,
    authRequiredSourceIds,
    missingSourceIds,
  }
}

function hasLiveMutationPath(source = '') {
  return /createBacklogItem\s*\(|updateBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|writeFile\s*\(|fs\.writeFile/i.test(source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const jobs = getFoundationJobDefinitions()
  const registry = buildConnectorCredentialRegistrySnapshot({ sourceContracts, sourceConnectors })
  const classified = classifyRegistryRows(registry.rows)
  const jobSourceIds = sourceIdsUsedByJobs(jobs)

  const [
    approval,
    activeSprint,
    planCriticRuns,
    snapshot,
    matrixSource,
    scriptSource,
    packageSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getFoundationSnapshot(),
    readRepoFile(MATRIX_PATH),
    readRepoFile('scripts/process-connector-completion-prep-check.mjs'),
    readRepoFile('package.json'),
  ])
  await closeFoundationDb()

  const backlogById = new Map((snapshot.backlogItems || []).map(card => [card.id, card]))
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const packageJson = JSON.parse(packageSource)
  const noAuthCards = NO_AUTH_CARD_IDS.map(id => backlogById.get(id)).filter(Boolean)
  const card = backlogById.get(CARD_ID) || null
  const googleCalendar = registry.rows.find(row => row.key === 'google-delegated-calendar') || null
  const unscheduledVerifiedSources = sourceContracts
    .filter(source => ['verified', 'pending', 'gap', 'proposed'].includes(source.group))
    .filter(source => !jobSourceIds.has(source.sourceId))
    .map(source => source.sourceId)

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH,
  )
  addCheck(
    checks,
    (
      activeSprint.sprint?.sprintId === SPRINT_ID &&
        (
          (activeSprint.sprint?.activeBlockerCardId === CARD_ID && activeItem?.stage === 'building_now') ||
          (!activeSprint.sprint?.activeBlockerCardId && activeItem?.stage === 'done_this_sprint')
        )
    ) ||
      (card?.lane === 'done' && String(card.statusNote || '').includes('connector-completion-prep-v1')),
    'Current Sprint has connector completion at Building Now or Done This Sprint, or verified closeout',
    `${activeSprint.sprint?.sprintId || 'missing'} / blocker=${activeSprint.sprint?.activeBlockerCardId || 'missing'} / stage=${activeItem?.stage || 'missing'} / lane=${card?.lane || 'missing'}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:connector-completion-prep-check'] === 'node --env-file-if-exists=.env scripts/process-connector-completion-prep-check.mjs',
    'package exposes focused connector completion prep proof',
    packageJson.scripts?.['process:connector-completion-prep-check'] || 'missing',
  )
  addCheck(
    checks,
    REQUIRED_MATRIX_SNIPPETS.every(snippet => matrixSource.includes(snippet)),
    'matrix captures no-auth, auth-required, manual-decision, and backlog routing rows',
    REQUIRED_MATRIX_SNIPPETS.filter(snippet => !matrixSource.includes(snippet)).join(', ') || MATRIX_PATH,
  )
  addCheck(
    checks,
    classified.noAuthSourceContractIds.includes('SRC-GDOCS-001') &&
      classified.noAuthSourceContractIds.includes('SRC-GSLIDES-001') &&
      classified.noAuthSourceContractIds.includes('SRC-GSHEETS-001'),
    'registry-derived no-auth source-contract gaps are identified',
    classified.noAuthSourceContractIds.join(', '),
  )
  addCheck(
    checks,
    googleCalendar?.status === 'available' &&
      googleCalendar?.blocksConnectorHealth === false &&
      Boolean(googleCalendar?.readinessNote),
    'Google Calendar atom scheduling remains readiness work, not auth outage',
    `${googleCalendar?.status || 'missing'} / ${googleCalendar?.readinessNote || 'missing note'}`,
  )
  addCheck(
    checks,
    noAuthCards.length === NO_AUTH_CARD_IDS.length &&
      noAuthCards.every(card => ['scoped', 'ranked', 'research'].includes(card.lane)) &&
      noAuthCards.every(card => String(card.statusNote || '').includes('connector-completion-prep-v1')),
    'concrete no-auth follow-up cards are present without being auto-started',
    noAuthCards.map(card => `${card.id}:${card.lane}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    ['BUILD-INTEL-EXTRACTION-IMPLEMENTATION', 'SOURCE-016', 'SOURCE-011'].every(id => {
      const card = backlogById.get(id)
      return card &&
        card.lane !== 'done' &&
        (
          card.source === 'connector-completion-prep-v1' ||
          String(card.statusNote || '').includes('connector-completion-prep-v1') ||
          String(card.nextAction || '').includes('connector-completion-prep-v1')
        )
    }),
    'auth/manual-decision follow-ups are parked on existing backlog cards',
    ['BUILD-INTEL-EXTRACTION-IMPLEMENTATION', 'SOURCE-016', 'SOURCE-011']
      .map(id => `${id}:${backlogById.get(id)?.lane || 'missing'}`)
      .join(', '),
  )
  addCheck(
    checks,
    classified.blockedRows.length >= 8 &&
      classified.blockedRows.some(row => row.key === 'google-ads') &&
      classified.blockedRows.some(row => row.key === 'skool-access') &&
      classified.blockedRows.some(row => row.key === 'myicro-access'),
    'auth-required rows remain blocked and explicitly parked',
    classified.blockedRows.map(row => row.key).join(', '),
  )
  addCheck(
    checks,
    unscheduledVerifiedSources.includes('SRC-GCAL-001') &&
      unscheduledVerifiedSources.includes('SRC-CREATOR-WATCHLIST-001'),
    'idle source list includes the expected readiness candidates',
    unscheduledVerifiedSources.slice(0, 20).join(', '),
  )
  addCheck(
    checks,
    !hasLiveMutationPath(scriptSource),
    'focused proof is read-only and cannot mutate backlog, sprint, schema, reports, or source systems',
    hasLiveMutationPath(scriptSource) ? 'mutation token found' : 'read-only proof source',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    planPath: PLAN_PATH,
    approvalPath: APPROVAL_PATH,
    matrixPath: MATRIX_PATH,
    summary: {
      sourceContractCount: sourceContracts.length,
      connectorCount: sourceConnectors.length,
      jobDefinitionCount: jobs.length,
      registryRowCount: registry.rows.length,
      registryRowsWithMissingSourceIds: classified.rowsWithMissingSourceIds.length,
      noAuthSourceContractIds: classified.noAuthSourceContractIds,
      authRequiredSourceIds: classified.authRequiredSourceIds,
      unscheduledVerifiedSources,
      noAuthCards: noAuthCards.map(card => ({ id: card.id, lane: card.lane, priority: card.priority })),
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Connector completion prep check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
