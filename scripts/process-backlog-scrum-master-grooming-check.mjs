#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BACKLOG_GROOMING_CLASSIFICATIONS,
  BACKLOG_GROOMING_DUPLICATE_ALIASES,
  BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES,
  BACKLOG_SCRUM_MASTER_GROOMING_APPROVAL_PATH,
  BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID,
  BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_KEY,
  BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_PATH,
  BACKLOG_SCRUM_MASTER_GROOMING_PLAN_PATH,
  BACKLOG_SCRUM_MASTER_GROOMING_SCRIPT_PATH,
  BACKLOG_SCRUM_MASTER_GROOMING_SPRINT_ID,
  FOUNDATION_NEXT_SPRINT_QUEUE_PATH,
  buildBacklogGroomingDogfoodProof,
  classifyBacklogGroomingItems,
  evaluateBacklogGroomingQueue,
  getDuplicateAliasStatus,
  isThinBacklogCard,
} from '../lib/backlog-scrum-master-grooming.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

function buildDoneCardIntegrityScan({ cards = [], activeSprint = null, bundles = BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES, closeouts = [] } = {}) {
  const activeCardIds = new Set((activeSprint?.items || [])
    .filter(item => !['done_this_sprint', 'complete_review', 'closed'].includes(String(item.stage || '').trim()))
    .map(item => item.cardId))
  const nextCardIds = new Set(bundles.flatMap(bundle => bundle.cards || []))
  const closeoutCardIds = new Set(closeouts.flatMap(closeout => closeout.backlogIds || []))
  const doneCards = cards.filter(card => card.lane === 'done')
  const blockingIssues = []
  const warnings = []

  for (const card of doneCards) {
    if (activeCardIds.has(card.id) || nextCardIds.has(card.id)) {
      blockingIssues.push({
        cardId: card.id,
        issue: 'done_card_referenced_as_active_or_next',
      })
    }

    const closeoutText = [
      card.source,
      card.nextAction,
      card.statusNote,
    ].filter(Boolean).join(' ')
    const hasProofText = /(proof|verified|foundation:verify|npm run|closeout|closed on|shipped|commit|sha|docs\/handoffs)/i.test(closeoutText)
    if (!hasProofText && !closeoutCardIds.has(card.id)) {
      warnings.push({
        cardId: card.id,
        issue: 'legacy_done_card_has_weak_closeout_or_proof_text',
      })
    }
  }

  return {
    doneCount: doneCards.length,
    blockingIssues,
    warnings,
  }
}

function buildAliasIntegrity(cards = []) {
  return BACKLOG_GROOMING_DUPLICATE_ALIASES.map(alias => {
    const card = cards.find(item => item.id === alias.cardId)
    return {
      cardId: alias.cardId,
      canonicalId: alias.canonicalId,
      exists: Boolean(card),
      ...getDuplicateAliasStatus(card || { id: alias.cardId }),
    }
  })
}

function docContainsBundles(queueDoc = '') {
  const missing = []
  for (const bundle of BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES) {
    if (!queueDoc.includes(bundle.bundleId)) missing.push(bundle.bundleId)
    for (const cardId of bundle.cards || []) {
      if (!queueDoc.includes(cardId)) missing.push(`${bundle.bundleId}:${cardId}`)
    }
  }
  return { ok: missing.length === 0, missing }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    queueDoc,
    packageSource,
    approval,
    snapshot,
    activeSprint,
    planCriticRuns,
  ] = await Promise.all([
    readRepoFile(BACKLOG_SCRUM_MASTER_GROOMING_PLAN_PATH),
    readRepoFile(FOUNDATION_NEXT_SPRINT_QUEUE_PATH),
    readRepoFile('package.json'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BACKLOG_SCRUM_MASTER_GROOMING_APPROVAL_PATH,
      cardId: BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID,
    }),
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID]),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const cards = snapshot.backlogItems || []
  const cardsById = new Map(cards.map(card => [card.id, card]))
  const groomingCard = cardsById.get(BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID) || null
  const groomingSprintItem = (activeSprint.items || []).find(item => item.cardId === BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_KEY) || null
  const grooming = classifyBacklogGroomingItems(cards)
  const queueEvaluation = evaluateBacklogGroomingQueue({ cards, activeSprint, bundles: BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES })
  const dogfood = buildBacklogGroomingDogfoodProof(cards)
  const doneIntegrity = buildDoneCardIntegrityScan({ cards, activeSprint, bundles: BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES, closeouts })
  const aliasIntegrity = buildAliasIntegrity(cards)
  const bundleDoc = docContainsBundles(queueDoc)
  const highPriorityThin = grooming.classifications.filter(item =>
    ['P0', 'P1'].includes(item.priority) &&
      item.thin &&
      item.classification !== BACKLOG_GROOMING_CLASSIFICATIONS.staleParked &&
      item.classification !== BACKLOG_GROOMING_CLASSIFICATIONS.duplicateAlias &&
      item.classification !== BACKLOG_GROOMING_CLASSIFICATIONS.blocked
  )

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || BACKLOG_SCRUM_MASTER_GROOMING_APPROVAL_PATH)
  addCheck(checks, /Review all non-done/i.test(planSource) && planSource.includes('missing card') && planSource.includes('thin card') && planSource.includes('done card'), 'plan captures grooming scope and queue drift failure modes', BACKLOG_SCRUM_MASTER_GROOMING_PLAN_PATH)
  addCheck(checks, packageJson.scripts?.['process:backlog-scrum-master-grooming-check'] === `node --env-file-if-exists=.env ${BACKLOG_SCRUM_MASTER_GROOMING_SCRIPT_PATH}`, 'package exposes focused grooming proof', packageJson.scripts?.['process:backlog-scrum-master-grooming-check'] || 'missing')
  addCheck(checks, Boolean(groomingCard) && ['executing', 'done'].includes(groomingCard.lane), 'live backlog has grooming sprint card', groomingCard ? `${groomingCard.id}/${groomingCard.lane}` : 'missing')
  addCheck(checks, Boolean(groomingSprintItem) && [BACKLOG_SCRUM_MASTER_GROOMING_SPRINT_ID].includes(activeSprint.sprint?.sprintId), 'Current Sprint truth references grooming card', groomingSprintItem ? `${activeSprint.sprint?.sprintId}/${groomingSprintItem.stage}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, grooming.counts.total >= 200 && grooming.classifications.every(item => item.classification), 'all non-done backlog cards are classified', `${grooming.counts.total} non-done cards`)
  addCheck(checks, highPriorityThin.length === 0, 'thin high-priority cards are enriched or explicitly classified blocked/stale/duplicate', highPriorityThin.map(item => item.cardId).join(', ') || 'none')
  addCheck(checks, aliasIntegrity.every(item => item.exists && item.ok), 'duplicate/overlapping cards carry explicit alias/superseded target', JSON.stringify(aliasIntegrity))
  addCheck(checks, queueEvaluation.ok, 'active/next sprint queue excludes missing, thin, duplicate, stale/parked, and done cards', JSON.stringify(queueEvaluation.failures))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe queue references', JSON.stringify(dogfood))
  addCheck(checks, doneIntegrity.blockingIssues.length === 0, 'done cards are not referenced as active/next work', JSON.stringify(doneIntegrity.blockingIssues))
  addCheck(checks, bundleDoc.ok, 'next-sprint queue doc lists groomed sprint bundles and live cards', bundleDoc.missing.join(', ') || FOUNDATION_NEXT_SPRINT_QUEUE_PATH)
  addCheck(checks, closeout?.backlogIds?.includes(BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID), 'closeout registry owns grooming card', closeout?.key || 'missing')
  addCheck(checks, closeout?.whereItLives?.includes(BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_PATH), 'closeout registry records grooming closeout handoff', closeout?.whereItLives?.join(', ') || 'missing')
  addCheck(checks, !/Harlan\/Fal\/voice feature work|live Agent Feedback auto-send/i.test(planSource) || /Do not touch Harlan, Fal, voice/i.test(planSource), 'plan preserves off-scope feature boundaries', 'no hub/Canva/Fal/voice/Harlan/connector feature work')

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID,
    closeoutKey: BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_KEY,
    checks,
    failures,
    counts: grooming.counts,
    classificationCounts: grooming.counts.byClassification,
    buildReadyCount: grooming.counts.buildReady,
    doneIntegrity,
    aliasIntegrity,
    nextSprintBundles: BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES,
    queueEvaluation,
    dogfood,
    activeSprint: {
      sprintId: activeSprint.sprint?.sprintId || null,
      stage: groomingSprintItem?.stage || null,
      activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Backlog scrum master grooming check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
    console.log(`Non-done reviewed: ${grooming.counts.total}; build-ready: ${grooming.counts.buildReady}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
