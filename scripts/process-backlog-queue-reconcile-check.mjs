#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'BACKLOG-QUEUE-RECONCILE-001'
const CLOSEOUT_KEY = 'backlog-queue-reconcile-v1'
const PLAN_PATH = 'docs/process/backlog-queue-reconcile-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/BACKLOG-QUEUE-RECONCILE-001.json'
const QUEUE_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-next-sprint-queue.md'
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-backlog-queue-reconcile-closeout.md'
const SCRIPT_PATH = 'scripts/process-backlog-queue-reconcile-check.mjs'

const REQUIRED_QUEUE_MAPPINGS = new Map([
  ['BACKLOG-QUEUE-RECONCILE-001', 'BACKLOG-QUEUE-RECONCILE-001'],
  ['SYSTEM-HEALTH-RED-TO-GREEN-001', 'SYSTEM-HEALTH-NIGHTLY-AUDIT-001'],
  ['CRITICAL-ROOTS-UNDER-3K-PHASE-1', 'CRITICAL-ROOTS-UNDER-3K-PHASE-1'],
  ['NO-AUTH-CONNECTOR-COMPLETION-001', 'CONNECTOR-COMPLETION-SPRINT'],
])

const ALIAS_ENRICHMENT_TARGETS = [
  ['SYSTEM-HEALTH-RED-TO-GREEN-001', 'SYSTEM-HEALTH-NIGHTLY-AUDIT-001'],
  ['NO-AUTH-CONNECTOR-COMPLETION-001', 'CONNECTOR-COMPLETION-SPRINT'],
]

const CARD_ID_PATTERN = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g

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
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
}

function extractCardIds(text = '') {
  return unique(String(text || '').match(CARD_ID_PATTERN) || [])
}

function extractLiveBacklogCards(text = '') {
  const cards = []
  const pattern = /^\s*(?:\d+\.\s*)?Live backlog card:\s*`?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`?/gmi
  let match = pattern.exec(text)
  while (match) {
    cards.push(match[1])
    match = pattern.exec(text)
  }
  return unique(cards)
}

function extractQueueAliases(text = '') {
  const aliases = new Map()
  const pattern = /^\s*(?:Former queue label|Queue alias|Alias):\s*`?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`?\s*(?:->|=>|maps to|covered by)\s*`?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`?/gmi
  let match = pattern.exec(text)
  while (match) {
    aliases.set(match[1], match[2])
    match = pattern.exec(text)
  }
  return aliases
}

function extractBareCardLines(text = '') {
  const cards = []
  const pattern = /^\s*Card:\s*`?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`?/gmi
  let match = pattern.exec(text)
  while (match) {
    cards.push(match[1])
    match = pattern.exec(text)
  }
  return unique(cards)
}

function evaluateQueueDoc({ text = '', liveCardIds = [], requiredMappings = REQUIRED_QUEUE_MAPPINGS } = {}) {
  const live = new Set(liveCardIds)
  const aliases = extractQueueAliases(text)
  const liveBacklogCards = extractLiveBacklogCards(text)
  const bareCardLines = extractBareCardLines(text)
  const allIds = extractCardIds(text)

  const missingLiveBacklogCards = liveBacklogCards.filter(id => !live.has(id))
  const missingBareCardLines = bareCardLines.filter(id => !live.has(id))
  const aliasTargetsMissing = [...aliases.entries()]
    .filter(([, target]) => !live.has(target))
    .map(([alias, target]) => `${alias}->${target}`)
  const unqualifiedMissingIds = allIds.filter(id => !live.has(id) && !aliases.has(id))
  const requiredMappingFailures = [...requiredMappings.entries()]
    .filter(([label, expectedTarget]) => {
      if (label === expectedTarget) return !live.has(label)
      return aliases.get(label) !== expectedTarget || !live.has(expectedTarget)
    })
    .map(([label, expectedTarget]) => `${label}->${aliases.get(label) || 'missing'} expected ${expectedTarget}`)

  const ok = missingLiveBacklogCards.length === 0 &&
    missingBareCardLines.length === 0 &&
    aliasTargetsMissing.length === 0 &&
    unqualifiedMissingIds.length === 0 &&
    requiredMappingFailures.length === 0

  return {
    ok,
    liveBacklogCards,
    aliases: Object.fromEntries(aliases.entries()),
    allIds,
    missingLiveBacklogCards,
    missingBareCardLines,
    aliasTargetsMissing,
    unqualifiedMissingIds,
    requiredMappingFailures,
  }
}

function buildDogfoodProof(liveCardIds = []) {
  const missingCard = evaluateQueueDoc({
    liveCardIds,
    requiredMappings: new Map(),
    text: [
      '# Synthetic Queue',
      '',
      'Card: HANDOFF-ONLY-LABEL-001',
    ].join('\n'),
  })
  const aliasedCard = evaluateQueueDoc({
    liveCardIds,
    requiredMappings: new Map(),
    text: [
      '# Synthetic Queue',
      '',
      'Live backlog card: `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`',
      'Former queue label: `HANDOFF-ONLY-LABEL-001` -> `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`',
    ].join('\n'),
  })
  const missingAliasTarget = evaluateQueueDoc({
    liveCardIds,
    requiredMappings: new Map(),
    text: [
      '# Synthetic Queue',
      '',
      'Former queue label: `HANDOFF-ONLY-LABEL-001` -> `MISSING-LIVE-CARD-001`',
    ].join('\n'),
  })

  return {
    ok: missingCard.ok === false && aliasedCard.ok === true && missingAliasTarget.ok === false,
    missingCardRejected: missingCard.ok === false,
    explicitAliasAccepted: aliasedCard.ok === true,
    missingAliasTargetRejected: missingAliasTarget.ok === false,
    invariant: 'handoff-only labels fail unless they map to an existing live backlog card',
  }
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    queueDoc,
    planSource,
    packageSource,
    approval,
    snapshot,
    activeSprint,
    planCriticRuns,
  ] = await Promise.all([
    readRepoFile(QUEUE_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile('package.json'),
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const backlogById = new Map((snapshot.backlogItems || []).map(card => [card.id, card]))
  const liveCardIds = [...backlogById.keys()]
  const queueEvaluation = evaluateQueueDoc({ text: queueDoc, liveCardIds })
  const dogfood = buildDogfoodProof(liveCardIds)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const card = backlogById.get(CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, /handoff-only[^.]+fail/i.test(planSource) && planSource.includes('FOUNDATION-SURFACE-UPDATES-001'), 'plan captures guardrail and not-next boundary', PLAN_PATH)
  addCheck(checks, Boolean(card) && ['executing', 'done'].includes(card.lane), 'live backlog has active reconcile card', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:backlog-queue-reconcile-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused queue reconcile proof', packageJson.scripts?.['process:backlog-queue-reconcile-check'] || 'missing')
  addCheck(checks, queueEvaluation.ok, 'queue doc references live cards or explicit aliases only', JSON.stringify({
    liveBacklogCards: queueEvaluation.liveBacklogCards,
    aliases: queueEvaluation.aliases,
    missing: queueEvaluation.unqualifiedMissingIds,
    requiredMappingFailures: queueEvaluation.requiredMappingFailures,
  }))
  addCheck(checks, dogfood.ok, 'dogfood rejects handoff-only labels without live-card alias', JSON.stringify(dogfood))
  for (const [alias, target] of ALIAS_ENRICHMENT_TARGETS) {
    const targetCard = backlogById.get(target)
    const targetText = [
      targetCard?.source,
      targetCard?.summary,
      targetCard?.nextAction,
      targetCard?.statusNote,
    ].filter(Boolean).join(' ')
    addCheck(checks, Boolean(targetCard) && targetText.includes(alias), `existing live card carries alias context for ${alias}`, targetCard ? target : 'missing')
  }
  addCheck(checks, closeout?.backlogIds?.includes(CARD_ID), 'closeout record owns active reconcile card', closeout?.key || 'missing')
  addCheck(checks, closeout?.whereItLives?.includes(QUEUE_PATH) && closeout?.whereItLives?.includes(CLOSEOUT_PATH), 'closeout records queue doc and closeout handoff', closeout?.whereItLives?.join(', ') || 'missing')
  addCheck(checks, Boolean(sprintItem) && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint truth references reconcile card', sprintItem ? `${activeSprint.sprint?.sprintId}/${sprintItem.stage}` : 'missing')
  addCheck(checks, !/public\/assets/i.test(queueDoc) && /Do not touch Harlan, Fal, voice/i.test(queueDoc), 'queue reconcile doc avoids Harlan/Fal/voice/mockup scope', 'not-next only')

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    checks,
    failures,
    queueEvaluation,
    dogfood,
    mappedLabels: Object.fromEntries(REQUIRED_QUEUE_MAPPINGS.entries()),
    activeSprint: {
      sprintId: activeSprint.sprint?.sprintId || null,
      stage: sprintItem?.stage || null,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Backlog queue reconcile check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
