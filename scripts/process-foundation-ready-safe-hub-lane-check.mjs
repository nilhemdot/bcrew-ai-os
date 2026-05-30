#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildConnectorUptimeSnapshot,
} from '../lib/connector-uptime-monitor.js'
import {
  FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS,
  FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY,
  FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID,
  buildHubConsumerContract,
  buildHubConsumerFixture,
  validateHubConsumerContractPayload,
} from '../lib/hub-consumer-contract.js'
import {
  buildHubWorkDogfoodProof,
  loadHubWorkOwnershipMatrix,
  validateHubWorkManifest,
} from '../lib/hub-work-check.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_CONFIGS = {
  'HUB-CONSUMER-CONTRACT-001': {
    planRef: 'docs/process/hub-consumer-contract-001-plan.md',
    approvalRef: 'docs/process/approvals/HUB-CONSUMER-CONTRACT-001.json',
  },
  'HUB-SANDBOX-WORKFLOW-001': {
    planRef: 'docs/process/hub-sandbox-workflow-001-plan.md',
    approvalRef: 'docs/process/approvals/HUB-SANDBOX-WORKFLOW-001.json',
  },
  'SHARED-FILE-INTEGRATION-GATE-001': {
    planRef: 'docs/process/shared-file-integration-gate-001-plan.md',
    approvalRef: 'docs/process/approvals/SHARED-FILE-INTEGRATION-GATE-001.json',
  },
  'SOURCE-TO-HUB-PROOF-001': {
    planRef: 'docs/process/source-to-hub-proof-001-plan.md',
    approvalRef: 'docs/process/approvals/SOURCE-TO-HUB-PROOF-001.json',
  },
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length).trim()
  }
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function doctrineOk(item = {}) {
  return Boolean(
    item.planRef &&
    item.definitionOfDone &&
    Array.isArray(item.proofCommands) &&
    item.proofCommands.length &&
    Array.isArray(item.notNextBoundaries) &&
    item.notNextBoundaries.length &&
    item.existingWorkCheck &&
    Object.keys(item.existingWorkCheck).length
  )
}

function selectedCardIds(cardArg) {
  if (!cardArg) return FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS
  if (!FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS.includes(cardArg)) {
    throw new Error(`Unknown Foundation Ready safe hub lane card: ${cardArg}`)
  }
  return [cardArg]
}

function buildSourceToHubProof() {
  const connectorUptime = buildConnectorUptimeSnapshot()
  const hubs = ['sales', 'ops', 'marketing', 'strategy']
  const contracts = hubs.map(hubKey => ({
    hubKey,
    contract: buildHubConsumerContract({ hubKey, connectorUptime }),
  }))
  const validations = contracts.map(entry => ({
    hubKey: entry.hubKey,
    validation: validateHubConsumerContractPayload(entry.contract),
    sourceIds: [
      ...new Set((entry.contract.payloads.sourceHealth.rows || []).flatMap(row => row.sourceIds || [])),
    ],
  }))
  return {
    ok: validations.every(entry => entry.validation.ok && entry.sourceIds.length > 0),
    connectorSummary: connectorUptime.summary,
    validations,
  }
}

function buildSharedFileIntegrationProof(matrix) {
  const base = {
    schemaVersion: 1,
    hub: 'marketing',
    cardId: 'MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001',
    changedFiles: ['docs/marketing/video-lab/server-route-review-request.md'],
    requestedSharedFiles: ['server.js', 'lib/security-access.js'],
    proofCommands: ['npm run foundation:verify'],
    handoffRef: 'docs/marketing/video-lab/server-route-review-request.md',
    committed: false,
    pushed: false,
  }
  const unapproved = validateHubWorkManifest(base, {
    matrix,
    knownCardIds: ['MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001'],
  })
  const approved = validateHubWorkManifest({
    ...base,
    coordination: {
      mainSessionApproved: true,
      reason: 'Main session approved shared route integration after reviewing the hub request.',
    },
  }, {
    matrix,
    knownCardIds: ['MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001'],
  })
  return {
    ok: !unapproved.ok &&
      unapproved.integrationRequired === true &&
      approved.ok &&
      approved.integrationRequired === true,
    unapproved: {
      ok: unapproved.ok,
      integrationRequired: unapproved.integrationRequired,
      failures: unapproved.failures,
    },
    approved: {
      ok: approved.ok,
      integrationRequired: approved.integrationRequired,
      failures: approved.failures,
    },
  }
}

function buildHubSandboxProof(matrix) {
  const manifest = {
    schemaVersion: 1,
    hub: 'marketing',
    cardId: 'MARKETING-VIDEO-LAB-001',
    changedFiles: [
      'public/marketing.js',
      'fixtures/hubs/marketing/foundation-source-health.json',
    ],
    proofCommands: ['npm run foundation:verify'],
    handoffRef: 'docs/process/hub-sandbox-workflow.md',
    committed: false,
    pushed: false,
  }
  const valid = validateHubWorkManifest(manifest, {
    matrix,
    knownCardIds: ['MARKETING-VIDEO-LAB-001'],
  })
  const foundationFile = validateHubWorkManifest({
    ...manifest,
    changedFiles: ['public/marketing.js', 'lib/foundation-db.js'],
  }, {
    matrix,
    knownCardIds: ['MARKETING-VIDEO-LAB-001'],
  })
  return {
    ok: valid.ok && !foundationFile.ok,
    valid: {
      ok: valid.ok,
      failures: valid.failures,
      classifications: valid.classifications,
    },
    foundationFile: {
      ok: foundationFile.ok,
      failures: foundationFile.failures,
      classifications: foundationFile.classifications,
    },
  }
}

async function main() {
  const args = parseArgs()
  const cardIds = selectedCardIds(args.card)
  const findings = []
  const requiredFiles = [
    'lib/hub-consumer-contract.js',
    'lib/hub-work-check.js',
    'docs/process/hub-consumer-contract.md',
    'docs/process/hub-sandbox-workflow.md',
    'docs/process/hub-file-ownership-matrix.json',
    'fixtures/hubs/marketing/foundation-source-health.json',
    'scripts/process-foundation-ready-safe-hub-lane-check.mjs',
    ...cardIds.flatMap(cardId => [CARD_CONFIGS[cardId].planRef, CARD_CONFIGS[cardId].approvalRef]),
  ]

  for (const file of requiredFiles) {
    addFinding(findings, await exists(file), 'required Foundation Ready safe hub lane artifact exists', file)
  }

  const approvals = []
  for (const cardId of cardIds) {
    const approval = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: CARD_CONFIGS[cardId].approvalRef,
      cardId,
    })
    approvals.push(approval)
    addFinding(
      findings,
      approval.ok && Number(approval.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      approval.failures?.map(item => item.check).join(', ') || approval.approval?.approvedPlanRef || 'ok',
    )
  }

  const [activeSprint, cards, planCriticRuns, matrix] = await Promise.all([
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
    loadHubWorkOwnershipMatrix({ repoRoot }),
  ])

  addFinding(
    findings,
    activeSprint.sprint?.sprintId === FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID,
    'Current Sprint is Foundation Ready Safe Hub Lane',
    activeSprint.sprint?.sprintId || 'missing',
  )
  addFinding(
    findings,
    cardIds.every(cardId => (activeSprint.items || []).some(item => item.cardId === cardId && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage))),
    'selected cards are Sprint Ready or later',
    (activeSprint.items || []).map(item => `${item.cardId}:${item.stage}`).join(', '),
  )
  addFinding(
    findings,
    cardIds.every(cardId => doctrineOk((activeSprint.items || []).find(item => item.cardId === cardId))),
    'selected cards have populated doctrine',
    (activeSprint.items || []).filter(item => cardIds.includes(item.cardId) && !doctrineOk(item)).map(item => item.cardId).join(', ') || 'ok',
  )
  addFinding(
    findings,
    cardIds.every(cardId => cards.some(card => card.id === cardId && !['research', 'parked'].includes(card.lane))),
    'selected cards exist in live backlog outside research/parked lanes',
    cards.map(card => `${card.id}:${card.lane}/${card.stage || 'no-stage'}`).join(', '),
  )
  addFinding(
    findings,
    cardIds.every(cardId => planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)),
    'selected cards have durable Plan Critic pass rows',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', '),
  )

  if (!args.card || cardIds.includes('HUB-CONSUMER-CONTRACT-001')) {
    const fixtures = ['sales', 'ops', 'marketing', 'strategy'].map(hubKey => ({
      hubKey,
      contract: buildHubConsumerFixture({ hubKey }),
    }))
    const fixtureValidations = fixtures.map(entry => ({
      hubKey: entry.hubKey,
      validation: validateHubConsumerContractPayload(entry.contract),
    }))
    addFinding(
      findings,
      fixtureValidations.every(entry => entry.validation.ok),
      'hub consumer contract fixtures are read-only and valid',
      fixtureValidations.map(entry => `${entry.hubKey}:${entry.validation.ok}`).join(', '),
    )
  }

  if (!args.card || cardIds.includes('HUB-SANDBOX-WORKFLOW-001')) {
    const sandboxProof = buildHubSandboxProof(matrix)
    addFinding(
      findings,
      sandboxProof.ok,
      'hub sandbox workflow allows hub-owned fixture edits and rejects Foundation internals',
      JSON.stringify({
        valid: sandboxProof.valid.ok,
        foundationFile: sandboxProof.foundationFile.ok,
      }),
    )
  }

  if (!args.card || cardIds.includes('SHARED-FILE-INTEGRATION-GATE-001')) {
    const dogfood = buildHubWorkDogfoodProof({
      matrix,
      knownCardIds: ['HUB-001', 'MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001'],
    })
    const sharedProof = buildSharedFileIntegrationProof(matrix)
    addFinding(
      findings,
      dogfood.ok && sharedProof.ok,
      'shared-file integration gate dogfood stops unapproved shared route requests',
      JSON.stringify({
        hubWorkDogfood: dogfood.ok,
        sharedProof: sharedProof.ok,
      }),
    )
  }

  if (!args.card || cardIds.includes('SOURCE-TO-HUB-PROOF-001')) {
    const sourceToHub = buildSourceToHubProof()
    addFinding(
      findings,
      sourceToHub.ok,
      'real connector uptime source health flows into every hub contract',
      sourceToHub.validations.map(entry => `${entry.hubKey}:${entry.validation.ok}:${entry.sourceIds.length} sourceIds`).join(', '),
    )
  }

  const failures = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failures.length === 0,
    sprintId: FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID,
    closeoutKey: FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY,
    selectedCardIds: cardIds,
    findingCount: findings.length,
    failureCount: failures.length,
    findings,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    for (const finding of findings) {
      console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check}${finding.detail ? ` - ${finding.detail}` : ''}`)
    }
    console.log(summary.ok ? 'Foundation Ready safe hub lane proof passed.' : 'Foundation Ready safe hub lane proof failed.')
  }

  await closeFoundationDb().catch(() => {})
  process.exit(summary.ok ? 0 : 1)
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack : error)
  await closeFoundationDb().catch(() => {})
  process.exit(1)
})
