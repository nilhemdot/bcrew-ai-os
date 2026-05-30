#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  MARKETING_VIDEO_LAB_LIVE_SAFETY_APPROVAL_PATH as APPROVAL_PATH,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_CARD_ID as CARD_ID,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_NEXT_CARD_ID as NEXT_CARD_ID,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_PLAN_PATH as PLAN_PATH,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_SCRIPT_PATH as SCRIPT_PATH,
  MARKETING_VIDEO_LAB_LIVE_SAFETY_SUMMARY_MARKER,
  buildMarketingVideoLiveSafetyDogfoodProof,
  validateMarketingVideoAssets,
} from '../lib/marketing-video-lab.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'
const CHANGED_FILES = [
  'lib/marketing-video-lab.js',
  SCRIPT_PATH,
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
  'docs/marketing/video-lab/README.md',
  'lib/foundation-build-closeout-cleanup-records.js',
  'package.json',
]
const PROOF_COMMANDS = [
  'node --check lib/marketing-video-lab.js scripts/process-marketing-video-lab-check.mjs scripts/process-marketing-video-lab-live-safety-check.mjs',
  'npm run process:marketing-video-lab-check -- --json',
  'npm run process:marketing-video-lab-live-safety-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --closeoutKey=marketing-video-lab-live-safety-v1',
  'npm run process:foundation-ship -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --commitRef=HEAD',
]
const SLICE_CLOSEOUT_KEY = 'trusted-assistant-loop-v1'
const SLICE_PLAN_PATH = 'docs/process/slice-001-trusted-assistant-loop-plan.md'
const SLICE_APPROVAL_PATH = 'docs/process/approvals/SLICE-001.json'
const SLICE_PROOF_COMMANDS = [
  'node --check lib/trusted-assistant-loop.js scripts/process-slice-001-check.mjs',
  'npm run process:slice-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
]
const NOT_NEXT = [
  'No live provider video generation or provider spend.',
  'No Google/FAL/Canva route integration.',
  'No Marketing Hub UI or home-nav wiring.',
  'No credential mutation, key rotation, provider config change, or source access change.',
  'No external writes, sends, Drive permission mutation, or paid/browser-auth work.',
  'No broad extraction or private backfill.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]
const CONTINUATION_ITEMS = [
  { cardId: 'SLICE-001', title: 'Define and prove the first trusted assistant loop', owner: 'Foundation Agent Runtime' },
  { cardId: CARD_ID, title: 'Harden Marketing Video Lab live generation safety before route wiring', owner: 'Foundation Safety' },
  { cardId: NEXT_CARD_ID, title: 'Build the AI-assisted strategy planning workflow', owner: 'Strategic Intelligence' },
  { cardId: 'STRATEGY-009', title: 'Clean Strategy Package UI/UX for live planning', owner: 'Strategy UX' },
  { cardId: 'KPI-APPT-QUALITY-001', title: 'Build KPI appointment quality audit for stacking and outcomes', owner: 'Sales Data Quality' },
  { cardId: 'KPI-LEAD-VALIDATION-001', title: 'Surface KPI fake-lead and lead-source validation problems', owner: 'Sales Data Quality' },
  { cardId: 'INTEL-THREAD-CONTEXT-001', title: 'Add full thread context to evidence proof', owner: 'Strategic Intelligence' },
  { cardId: 'SCOPER-UI-001', title: 'Render gap-resolving Scoper output in the Strategy Hub', owner: 'Strategy UX' },
  { cardId: 'SOURCE-001', title: 'Revalidate Gmail as a rebuild source contract', owner: 'Source Contracts' },
  { cardId: 'SOURCE-002', title: 'Revalidate Google Calendar as a rebuild source contract', owner: 'Source Contracts' },
  { cardId: 'SOURCE-003', title: 'Revalidate Google Drive as a rebuild source contract', owner: 'Source Contracts' },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Harden Marketing Video Lab live generation safety before route wiring',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 20,
    source: 'Deep audit live-safety finding and Marketing Video Lab dry-run closeout.',
    summary: 'Fix the two live-safety findings before any route wiring: concurrent submits must not create duplicate running jobs, and fake/sample/private/local asset URLs must fail live validation.',
    whyItMatters: 'The live video tool should become real, but it cannot expose paid generation until duplicate spend and fake asset submissions are blocked at the backend.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless raw health or repeated-failure gates go red.`
      : 'Add reusable submit locking and live URL validation dogfood; do not call providers, spend budget, or wire routes.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; concurrent mock submit and placeholder/private/local asset rejection are proven before route integration.`
      : `Executing ${CLOSEOUT_KEY}; safety primitives/proof only, no live provider spend or route wiring.`,
    owner: 'Foundation Safety',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/marketing-video-lab.js',
      'lib/marketing-video-providers.js',
      'lib/marketing-video-prompts.js',
      'scripts/process-marketing-video-lab-check.mjs',
    ],
    existingDocs: [
      'docs/process/marketing-video-lab-001-plan.md',
      'docs/marketing/video-lab/README.md',
    ],
    existingScripts: [
      'scripts/process-marketing-video-lab-check.mjs',
    ],
    existingPolicy: [
      'Marketing Video Lab stays dry-run/no-spend until live route integration has a separate approved card.',
      'Provider calls, provider spend, credential mutation, and external writes are not allowed in this safety card.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    reused: [
      'Marketing Video Lab dry-run payloads',
      'prompt compiler',
      'provider cost estimator',
      'synthetic asset validation',
      'mock lifecycle proof',
    ],
    exactGap: 'Dry-run proof did not prove duplicate running submit rejection or live asset URL rejection.',
    overBroadRisk: 'The card can drift into live provider route wiring or paid generation. V1 is safety primitives and proof only.',
    readyBy: 'Steve',
    readyAt: '2026-05-20T01:42:00-04:00',
    notRebuilt: [
      'No provider route integration.',
      'No live video generation.',
      'No Marketing Hub UI.',
      'No provider spend.',
    ],
  }
}

function buildTrustedLoopExistingWorkCheck() {
  return {
    existingCode: [
      'lib/trusted-assistant-loop.js',
      'lib/harlan-operator-loop.js',
      'lib/agent-live-answer-preflight-gate.js',
    ],
    existingDocs: [
      'docs/agents/trusted-assistant-loop.md',
      'docs/agents/harlan.md',
      'docs/process/slice-001-trusted-assistant-loop-plan.md',
    ],
    existingScripts: [
      'scripts/process-slice-001-check.mjs',
    ],
    existingPolicy: [
      'Trusted assistant loop V1 is read-only by default.',
      'External writes, provider/model calls, broad extraction, credential mutation, and Drive permission mutation stay approval-bound.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    reused: [
      'live-answer preflight',
      'capability registry',
      'Harlan operator loop',
      'source contract registry',
    ],
    notRebuilt: [
      'No Harlan runtime launch.',
      'No provider/model call.',
      'No live extraction or external write.',
    ],
    exactGap: 'SLICE-001 closed the first trusted assistant loop gate before this safety card.',
    overBroadRisk: 'Do not widen SLICE-001 into live runtime work while closing this card.',
    readyBy: 'Steve',
    readyAt: '2026-05-20T01:55:00-04:00',
  }
}

function buildSprintItem({ item, order, closeCard = false, stage = 'building_now' } = {}) {
  const isTarget = item.cardId === CARD_ID
  const isTrustedLoop = item.cardId === 'SLICE-001'
  const stageValue = item.cardId === 'SLICE-001'
    ? 'done_this_sprint'
    : isTarget
      ? closeCard ? 'done_this_sprint' : normalizeStage(stage)
      : item.cardId === NEXT_CARD_ID && closeCard ? 'scoping' : 'scoping'
  return {
    cardId: item.cardId,
    order,
    stage: stageValue,
    planRef: isTarget ? PLAN_PATH : isTrustedLoop ? SLICE_PLAN_PATH : null,
    definitionOfDone: isTarget
      ? 'Concurrent mock submit allows one running job and rejects the duplicate; live validation rejects placeholder/sample/private/local/mock asset URLs; proof shows no provider spend or route wiring; full gates pass.'
      : isTrustedLoop
        ? 'Trusted assistant loop contract is done with read-only scope, approval boundaries, focused proof, verifier coverage, and Recent Work closeout.'
      : 'Scope and build only after the active blocker reaches this card and a focused plan/proof exists.',
    proofCommands: isTarget ? PROOF_COMMANDS : isTrustedLoop ? SLICE_PROOF_COMMANDS : [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: isTarget ? 'SLICE-001 opened the trusted assistant loop gate; this card hardens the next safe surface before route wiring.' : `${CARD_ID} closes the Marketing Video Lab safety gate.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: isTarget ? buildExistingWorkCheck() : item.cardId === 'SLICE-001' ? buildTrustedLoopExistingWorkCheck() : undefined,
    metadata: {
      owner: item.owner,
      closeoutKey: isTarget ? CLOSEOUT_KEY : isTrustedLoop ? SLICE_CLOSEOUT_KEY : null,
      approvalRef: isTarget ? APPROVAL_PATH : isTrustedLoop ? SLICE_APPROVAL_PATH : null,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview }) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = EXCLUDED.lane,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-marketing-video-live-safety')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `marketing-video-live-safety-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-marketing-video-live-safety',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, stage }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `create/update ${CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Prove one trusted assistant loop and then continue safe Foundation surfaces without widening too early.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'next_scoping' : normalizeStage(stage),
          startedBy: 'codex-marketing-video-live-safety',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship Marketing Video Lab backend safety only; no provider spend or route wiring.',
          priorityOrder: CONTINUATION_ITEMS.map(item => item.cardId),
          notNext: NOT_NEXT,
          exitCriteria: [
            'Concurrent mock submit allows one running job and rejects the duplicate.',
            'Live validation rejects placeholder/sample/private/local/mock asset URLs.',
            'No provider spend, provider calls, route wiring, UI wiring, external writes, or credential mutation occurs.',
          ],
        },
      },
      items: CONTINUATION_ITEMS.map((item, index) => buildSprintItem({ item, order: index + 1, closeCard, stage })),
    },
    'codex-marketing-video-live-safety',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved continuous Foundation execution; close Marketing Video Lab live-safety gate and keep moving.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Marketing Video Lab paid-provider safety before route wiring',
    repoRoot,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([CARD_ID, NEXT_CARD_ID, ...sprintCardIds]))
  const [
    approval,
    packageJson,
    labSource,
    scriptSource,
    coverageSource,
    readmeSource,
    closeoutRecordsSource,
    closeoutDoc,
    cards,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/marketing-video-lab.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/marketing/video-lab/README.md'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items, backlogItems: cards, closeouts, planCriticRuns })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const dogfood = await buildMarketingVideoLiveSafetyDogfoodProof()
  const placeholderKeys = dogfood.placeholderValidation.findings.map(finding => finding.key)
  const localKeys = dogfood.localValidation.findings.map(finding => finding.key)
  const privateKeys = dogfood.privateValidation.findings.map(finding => finding.key)
  const mockKeys = dogfood.mockSchemeValidation.findings.map(finding => finding.key)
  const readOnlyScript = ![
    ['fetch', '('].join(''),
    ['ax', 'ios'].join(''),
    ['child', '_process'].join(''),
    ['foundation', ':job'].join(''),
  ].some(token => scriptSource.includes(token))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'closeout keeps next card scoped instead of stopping', nextSprintItem ? `${NEXT_CARD_ID}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, dogfood.ok, 'live-safety dogfood passes', JSON.stringify(dogfood.summary))
  addCheck(checks, dogfood.summary.acceptedCount === 1 && dogfood.summary.rejectedCount === 1, 'concurrent mock submit allows one job and rejects duplicate', JSON.stringify(dogfood.concurrentResults))
  addCheck(checks, placeholderKeys.includes('live_asset_placeholder_url'), 'live validation rejects placeholder/sample URLs', placeholderKeys.join(', '))
  addCheck(checks, localKeys.includes('live_asset_private_or_local_url') || localKeys.includes('live_asset_requires_https'), 'live validation rejects localhost/non-HTTPS URLs', localKeys.join(', '))
  addCheck(checks, privateKeys.includes('live_asset_private_or_local_url'), 'live validation rejects private network URLs', privateKeys.join(', '))
  addCheck(checks, mockKeys.includes('live_asset_non_http_url') && mockKeys.includes('live_asset_mock_source_type'), 'live validation rejects mock scheme/source type', mockKeys.join(', '))
  addCheck(checks, dogfood.providerSpendUsd === 0 && dogfood.liveProviderCalls === 0, 'proof has no live provider calls or spend', `calls=${dogfood.liveProviderCalls} spend=${dogfood.providerSpendUsd}`)
  addCheck(checks, packageJson.scripts?.['process:marketing-video-lab-live-safety-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:marketing-video-lab-live-safety-check'] || 'missing')
  addCheck(checks, labSource.includes('submitMarketingVideoMockJobWithLock') && labSource.includes('validateMarketingVideoLiveAssetSource') && labSource.includes('buildMarketingVideoLiveSafetyDogfoodProof'), 'core lab module owns live-safety primitives', 'lib/marketing-video-lab.js')
  addCheck(checks, coverageSource.includes('MARKETING_VIDEO_LAB_LIVE_SAFETY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include live-safety card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, readmeSource.includes('live-safety gate') && readmeSource.includes('no provider spend'), 'Marketing Video Lab docs explain live-safety gate', 'docs/marketing/video-lab/README.md')
  addCheck(checks, readOnlyScript, 'focused proof avoids provider calls, subprocesses, and job launches', SCRIPT_PATH)
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('no provider spend') && closeoutDoc.includes('concurrent mock submit'), 'closeout documents no-spend safety proof', CLOSEOUT_PATH)
  addCheck(checks, validateMarketingVideoAssets({ assets: [], live: true }).ok === false, 'empty live asset set fails template validation', 'required-role failure')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    closeoutKey: CLOSEOUT_KEY,
    liveGenerationAttempted: false,
    providerSpendUsd: 0,
    checkCount: checks.length,
    failedCount: failed.length,
    summary: dogfood.summary,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`${MARKETING_VIDEO_LAB_LIVE_SAFETY_SUMMARY_MARKER} ${JSON.stringify(result.summary)}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
