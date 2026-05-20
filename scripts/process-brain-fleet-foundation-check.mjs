#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BRAIN_FLEET_FOUNDATION_APPROVAL_PATH,
  BRAIN_FLEET_FOUNDATION_CARD_ID as CARD_ID,
  BRAIN_FLEET_FOUNDATION_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BRAIN_FLEET_FOUNDATION_NEXT_CARD_ID as NEXT_CARD_ID,
  BRAIN_FLEET_FOUNDATION_PLAN_PATH as PLAN_PATH,
  BRAIN_FLEET_FOUNDATION_SCRIPT_PATH as SCRIPT_PATH,
  BRAIN_FLEET_FOUNDATION_SPRINT_ID as SPRINT_ID,
  BRAIN_FLEET_NO_AUTH_NOT_NEXT,
  buildBrainFleetFoundationSnapshot,
  buildSyntheticBrainFleetFoundationProof,
  evaluateBrainFleetFoundation,
  planBrainFleetRoute,
} from '../lib/brain-fleet-foundation.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getLlmRuntimeSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
const ACTOR = 'codex-brain-fleet-foundation'

const CHANGED_FILES = [
  'lib/brain-fleet-foundation.js',
  SCRIPT_PATH,
  PLAN_PATH,
  BRAIN_FLEET_FOUNDATION_APPROVAL_PATH,
  'docs/handoffs/2026-05-20-brain-fleet-foundation-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-model-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  const seen = new Set()
  const output = []
  for (const value of values.map(normalizeText).filter(Boolean)) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function git(args = []) {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `brain-fleet-foundation-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      summary: buildPlanCriticResultSummary(planReview),
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const run = buildPlanCriticRun(planReview)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,$8,$9::text[],$10::jsonb,$11::jsonb,$12)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        run.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        planReview.gateDecision?.fullVerifyRequired === true,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(run.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` before live provider probes or extractor proof.`
      : 'Build and prove the no-auth Brain Fleet contract over existing llm_credentials/llm_routes only; no live provider probes or credential mutation.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; Brain Fleet v1 is a no-auth contract/interface over the existing LLM router and credential registry, with provider execution blocked until Harlan auth, quota ledger, and capability registry cards ship.`
      : `Building \`${CLOSEOUT_KEY}\`; no provider calls, live probes, credential mutation, source writes, or extractor runtime work are in scope.`,
  }
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function cloneSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order || item.sprintOrder,
    stage: item.stage || 'scoping',
    planRef: item.planRef || null,
    definitionOfDone: item.definitionOfDone || '',
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || null,
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || null,
    metadata: item.metadata || {},
  }
}

function buildBrainFleetSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  const proofCommands = [
    'node --check lib/brain-fleet-foundation.js scripts/process-brain-fleet-foundation-check.mjs',
    'npm run process:brain-fleet-foundation-check -- --close-card --json',
    'npm run process:system-health-nightly-audit-check -- --json',
    'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
    'npm run backlog:hygiene -- --json',
    'npm run foundation:verify -- --json-summary',
    `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${BRAIN_FLEET_FOUNDATION_APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
  ]
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Brain Fleet v1 exposes a provider-agnostic no-auth contract over existing llm_credentials/llm_routes, reuses the LLM router and credential registry, rejects raw prompt/provider execution, and proves no live provider probe, credential mutation, or source write occurs.',
    proofCommands,
    notNextBoundaries: BRAIN_FLEET_NO_AUTH_NOT_NEXT,
    existingWorkCheck: {
      existingCode: [
        'lib/llm-router.js',
        'lib/llm-credential-registry.js',
        'lib/foundation-llm-runtime-store.js',
        'lib/llm-hub-capacity.js',
      ],
      existingDocs: [
        'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
        'docs/handoffs/2026-05-20-orchestrator-brain-fleet-extractor-checkpoint.md',
        'docs/process/llm-router-001-plan.md',
        'docs/process/llm-credential-registry-001-plan.md',
      ],
      existingScripts: [
        'process:llm-router-check',
        'process:llm-credential-registry-check',
        'process:llm-hub-capacity-check',
      ],
      existingPolicy: [
        'Brain Fleet is not a subscription farm.',
        'Provider execution waits for auth escalation, quota ledger, and capability registry.',
        'Green means raw green; do not hide Foundation health failures.',
        'No live provider probes from the no-auth contract card.',
      ],
      reused: 'Existing route planner, credential registry policy snapshot, and live llm_credentials/llm_routes truth.',
      exactGap: 'Brain Fleet needs a thin provider-agnostic contract before Harlan auth, quota ledger, capability registry, and live provider probes.',
      notRebuilt: 'No new router, no new credential registry, no provider probe runner, no extractor runtime, no auth loop, no quota ledger.',
      overBroadRisk: 'This card can drift into live provider probes or extraction. It must stay contract-only.',
      readyBy: 'Steve approved Brain Fleet foundation after System Health watch cleared and Foundation gates were green.',
      readyAt: '2026-05-20T13:55:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      noAuthContractOnly: true,
      noLiveProviderProbes: true,
      reusedLlmRouter: true,
      reusedCredentialRegistry: true,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildHarlanNextItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    planRef: cloned.planRef || 'docs/process/harlan-auth-escalation-loop-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Old-system auth escalation pattern is harvested into Foundation/Harlan extractor auth-needed flow with simulated 2FA/auth-needed, dedup/no-spam, timeout/fail-closed, DONE/retry/resume, and no credential mutation.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:harlan-auth-escalation-loop-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify',
    ],
    notNextBoundaries: unique([
      ...(cloned.notNextBoundaries || []),
      'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from Harlan auth escalation v1.',
      'Do not send external messages except approved Steve-only test or dry-run proof.',
      'Do not broad-crawl paid/private sources.',
      'Do not mutate credentials.',
      'Do not run live provider probes until auth-needed flow and quota ledger are ready.',
    ]),
    existingWorkCheck: {
      existingCode: [
        '/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs',
        '/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs',
        '/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs',
        '/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts',
        '/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts',
      ],
      existingDocs: [
        '/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md',
        'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      ],
      existingScripts: [
        'auth-escalate.cjs',
        'browser-auth.cjs',
        'myicor-auth.cjs',
      ],
      existingPolicy: [
        'No credential mutation.',
        'No external messages except approved Steve-only test or dry-run proof.',
        'Paid/private source auth must fail closed until Steve approval/DONE.',
        'Dedup/no-spam and timeout/fail-closed behavior are required.',
      ],
      reused: 'Old BCrew-Buddy auth escalation, browser auth, web extractor wait-state, reply context, and auth escalation protocol.',
      notRebuilt: 'Do not invent a new auth loop, provider probe path, credential manager, extractor crawler, or message sender.',
      exactGap: 'Before live provider probes or paid/private extraction, jobs need an auth_needed -> blocked-auth -> Steve approval/DONE -> reverify -> resume/fail-closed loop.',
      overBroadRisk: 'This card can drift into live source crawling, provider probes, credential mutation, or unapproved messages.',
      readyBy: 'Steve ordered old-system auth-loop harvest immediately after Brain Fleet foundation.',
      readyAt: '2026-05-20T13:55:00-04:00',
    },
    metadata: {
      ...(cloned.metadata || {}),
      closeoutKey: null,
      authEscalationNext: true,
      noCredentialMutation: true,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const brainItem = buildBrainFleetSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 3 }, { closeCard, currentHead })
  const harlanItem = buildHarlanNextItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: brainItem.order + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return brainItem
    if (item.cardId === NEXT_CARD_ID) return harlanItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(brainItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(harlanItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Brain Fleet backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'brain_fleet_foundation_closed_harlan_next' : 'brain_fleet_foundation_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: harvest old-system auth-needed escalation loop before live provider probes.`
            : `${CARD_ID}: ship no-auth Brain Fleet contract only; no live provider probes.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          noLiveProviderProbes: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve approved starting BRAIN-FLEET-FOUNDATION-001 after raw-green Foundation gates cleared.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    llmRouterSource,
    credentialRegistrySource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/brain-fleet-foundation.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/llm-router.js'),
    readRepoFile('lib/llm-credential-registry.js'),
  ])

  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: BRAIN_FLEET_FOUNDATION_APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P0' },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Full ship gate because Brain Fleet touches routing contracts and live sprint truth, while provider execution remains blocked.',
  })
  const llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
  const snapshot = buildBrainFleetFoundationSnapshot({ llmRuntime })
  const syntheticProof = await buildSyntheticBrainFleetFoundationProof()
  const livePlan = await planBrainFleetRoute({
    request: {
      workload: 'extraction',
      hubKey: 'foundation',
      caller: 'process-brain-fleet-foundation-check',
      inputArtifactRef: 'artifact://synthetic/brain-fleet-foundation/no-auth-contract',
    },
  })
  const evaluation = evaluateBrainFleetFoundation({
    moduleSource,
    scriptSource,
    planSource,
    packageJson,
    llmRouterSource,
    credentialRegistrySource,
    snapshot,
    syntheticProof,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || BRAIN_FLEET_FOUNDATION_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Brain Fleet foundation', buildPlanCriticResultSummary(planReview))
  addCheck(checks, evaluation.ok, 'Brain Fleet foundation evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  addCheck(checks, livePlan.routeContract?.proofBoundary === 'no_auth_no_probe_no_provider_execution', 'live route plan returns no-auth contract boundary', `${livePlan.routeContract?.routeKey || 'missing'} ${livePlan.routeContract?.provider || ''}/${livePlan.routeContract?.model || ''}`)
  addCheck(checks, livePlan.routeContract?.readiness?.canExecute === false, 'live route contract blocks execution before follow-on cards', (livePlan.routeContract?.readiness?.stopConditions || []).join(', '))
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry links Brain Fleet foundation card', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, packageJson.scripts?.['process:brain-fleet-foundation-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused Brain Fleet proof', packageJson.scripts?.['process:brain-fleet-foundation-check'] || 'missing')

  let preliminaryFailures = checks.filter(check => !check.ok)
  if (!preliminaryFailures.length && (args.apply || args.closeCard)) {
    await ensureLiveState({ closeCard: args.closeCard, planReview })
  }

  const [activeSprint, cards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const brainCard = cards.find(card => card.id === CARD_ID) || null
  const nextCard = cards.find(card => card.id === NEXT_CARD_ID) || null
  const brainItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const expectedActive = args.closeCard ? NEXT_CARD_ID : CARD_ID
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches Brain Fleet state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, brainCard && brainCard.lane === (args.closeCard ? 'done' : (args.apply ? 'executing' : brainCard.lane)), 'Brain Fleet backlog lane matches check posture', brainCard ? `${brainCard.id}:${brainCard.lane}` : 'missing')
  addCheck(checks, brainItem && brainItem.stage === (args.closeCard ? 'done_this_sprint' : (args.apply ? 'building_now' : brainItem.stage)), 'Brain Fleet sprint item stage matches check posture', brainItem ? `${brainItem.cardId}:${brainItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances Harlan auth escalation as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    closeCard: args.closeCard,
    snapshot: {
      status: snapshot.status,
      summary: snapshot.summary,
      providerExecutionAllowed: snapshot.providerExecutionAllowed,
      liveProviderProbesAllowed: snapshot.liveProviderProbesAllowed,
    },
    livePlan: {
      routeKey: livePlan.routeContract?.routeKey || null,
      provider: livePlan.routeContract?.provider || null,
      model: livePlan.routeContract?.model || null,
      accountLabel: livePlan.routeContract?.accountLabel || null,
      canExecute: livePlan.routeContract?.readiness?.canExecute === true,
      stopConditions: livePlan.routeContract?.readiness?.stopConditions || [],
    },
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    syntheticProof,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brain Fleet foundation check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main()
  .catch(async error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    await closeFoundationDb().catch(() => {})
    process.exitCode = 1
  })
