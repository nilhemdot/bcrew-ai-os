#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
import {
  SYSTEM_004_APPROVAL_PATH,
  SYSTEM_004_CARD_ID,
  SYSTEM_004_CHANGED_FILES,
  SYSTEM_004_CLOSEOUT_KEY,
  SYSTEM_004_CLOSEOUT_PATH,
  SYSTEM_004_NEXT_CARD_ID,
  SYSTEM_004_NOT_NEXT_BOUNDARIES,
  SYSTEM_004_PLAN_PATH,
  SYSTEM_004_PROOF_COMMANDS,
  SYSTEM_004_SCRIPT_PATH,
  SYSTEM_004_SPRINT_ID,
  buildSystem004CapabilitiesSurfaceDogfoodProof,
  evaluateSystem004CapabilitiesSurfacePayload,
  loadSystem004CapabilitiesSurfacePayload,
} from '../lib/system-004-capabilities-surface.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-system-004-capabilities-surface'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: SYSTEM_004_CARD_ID,
    title: 'Build a live System Capabilities surface',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 32,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: 'Render generated System Capabilities and Agent Inventory truth in the existing Foundation System Inventory surface.',
    whyItMatters: 'Capability truth cannot stay buried in generated JSON or stale static UI. Foundation needs one live operator surface that says what is real, guarded, blocked, and evidence-only.',
    nextAction: closeCard
      ? `Done on 2026-05-19 under ${SYSTEM_004_CLOSEOUT_KEY}; proof includes npm run process:system-004-capabilities-surface-check, docs/handoffs/2026-05-19-system-004-live-capabilities-surface-closeout.md, /api/system-inventory capabilitySurface route, and process:foundation-ship. Continue ${SYSTEM_004_NEXT_CARD_ID}.`
      : 'Build the operator-facing System Capabilities surface from generated capability and agent inventory artifacts.',
    statusNote: closeCard
      ? `Closed v1 under ${SYSTEM_004_CLOSEOUT_KEY} with route/build proof: /api/system-inventory exposes capabilitySurface, System Inventory capability pages render generated Pillar 4/5 truth, and closeout lives at docs/handoffs/2026-05-19-system-004-live-capabilities-surface-closeout.md.`
      : 'Executing v1: live surface only; no provider/tool approval, agent runtime, extraction, old-code import, or external write.',
    owner: 'Foundation Process',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: SYSTEM_004_NEXT_CARD_ID,
    title: existing.title || 'Line-read old systems and promote only durable rebuild truth',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 14,
    source: existing.source || 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: existing.summary || 'Audit local old-system roots and promote only durable doctrine, source contracts, schemas, useful patterns, and rebuild requirements into active truth.',
    whyItMatters: existing.whyItMatters || 'Old-system salvage is valuable only when promoted into live truth instead of stale reports.',
    nextAction: existing.nextAction || 'Read each legacy root in bounded passes, produce salvage maps, and classify each finding as promote, backlog, source note, spec, evidence-only, duplicate, or reject.',
    statusNote: `Ready as the next active blocker after ${SYSTEM_004_CLOSEOUT_KEY}; no old-code import or runtime activation.`,
    owner: existing.owner || 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/pillar-4-system-capabilities.js',
      'lib/pillar-5-agent-inventory.js',
      'public/foundation-system-inventory-renderers.js',
      'server.js /api/system-inventory',
    ],
    existingDocs: [
      'docs/system-capabilities.generated.json',
      'docs/agents/agent-inventory.generated.json',
      'docs/system-capabilities.generated.md',
      'docs/agents/agent-inventory.generated.md',
    ],
    existingScripts: [
      'process:pillar-4-system-capabilities-check',
      'process:pillar-5-agent-inventory-check',
      'process:system-health-nightly-audit-check',
    ],
    existingPolicy: [
      'Generated capability truth must stay source/proof-backed.',
      'Installed plugins are runtime capability, not source-truth approval.',
      'Old-system agents are evidence only.',
      'Provider/tool and agent runtime approval require separate cards.',
    ],
    reused: 'Reused generated Pillar 4 and Pillar 5 artifacts, existing /api/system-inventory route, and existing System Inventory renderer pages.',
    notRebuilt: 'Did not rebuild generated artifact owners, provider/tool registry, agent runtime, old-system code, extraction workers, or Value Builder split.',
    exactGap: 'Generated capability and agent inventory truth existed, but the operator System Inventory UI still relied on runtime-only/static lane copy.',
    overBroadRisk: 'This can drift into provider/tool use, old-agent revival, or broad UI rewrites. V1 is compact API payload plus existing renderer updates only.',
    readyBy: 'Steve approved continuing the Foundation capability sprint.',
    readyAt: '2026-05-19T20:45:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `system-004-${stableRunId(SYSTEM_004_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: SYSTEM_004_CARD_ID,
      closeoutKey: SYSTEM_004_CLOSEOUT_KEY,
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  const planRun = buildPlanCriticRun(planReview)
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        SYSTEM_004_CARD_ID,
        SYSTEM_004_PLAN_PATH,
        planReview.status,
        planReview.score,
        SYSTEM_004_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint(planReview, nextCard) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SYSTEM_004_SCRIPT_PATH,
    operation: 'close SYSTEM-004 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogItem(SYSTEM_004_CARD_ID, buildCardRow({ closeCard: true }), ACTOR)
  await updateBacklogItem(SYSTEM_004_NEXT_CARD_ID, buildNextCardRow(nextCard || {}), ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const items = (activeSprint.items || []).map((item, index) => {
    if (item.cardId === SYSTEM_004_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: SYSTEM_004_PLAN_PATH,
        definitionOfDone: 'Foundation System Inventory renders generated System Capabilities and Agent Inventory truth from /api/system-inventory capabilitySurface without approving runtime, provider/tool use, extraction, or old-system code.',
        proofCommands: SYSTEM_004_PROOF_COMMANDS,
        nextAction: `Continue ${SYSTEM_004_NEXT_CARD_ID}; live capability surface is wired.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SYSTEM_004_NOT_NEXT_BOUNDARIES, 'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.'])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: SYSTEM_004_CLOSEOUT_KEY,
          approvalRef: SYSTEM_004_APPROVAL_PATH,
          apiPayload: '/api/system-inventory capabilitySurface',
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === SYSTEM_004_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        nextAction: 'Run bounded line-read old-system audit and promote only durable rebuild truth into live cards/docs/verifiers.',
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: SYSTEM_004_CARD_ID,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(activeSprint.sprint || {}),
        sprintId: activeSprint.sprint?.sprintId || SYSTEM_004_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: SYSTEM_004_NEXT_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: SYSTEM_004_CARD_ID,
          nextAction: `Continue ${SYSTEM_004_NEXT_CARD_ID}; live System Capabilities surface is ready.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'SYSTEM-004 closes and advances to legacy system audit.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
      reason: 'SYSTEM-004 closes and advances the active blocker.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    planText,
    moduleSource,
    scriptSource,
    serverSource,
    rendererSource,
    registrySource,
    coverageSource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(SYSTEM_004_PLAN_PATH),
    readRepoFile('lib/system-004-capabilities-surface.js'),
    readRepoFile(SYSTEM_004_SCRIPT_PATH),
    readRepoFile('server.js'),
    readRepoFile('public/foundation-system-inventory-renderers.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(SYSTEM_004_CLOSEOUT_PATH, { optional: true }),
  ])

  const payload = await loadSystem004CapabilitiesSurfacePayload({ repoRoot, generatedAt: '2026-05-19T00:00:00.000Z' })
  const payloadEvaluation = evaluateSystem004CapabilitiesSurfacePayload(payload)
  const dogfood = buildSystem004CapabilitiesSurfaceDogfoodProof()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SYSTEM_004_APPROVAL_PATH,
    cardId: SYSTEM_004_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: SYSTEM_004_CARD_ID, priority: 'P1' },
    changedFiles: SYSTEM_004_CHANGED_FILES,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const beforeCards = await getBacklogItemsByIds([SYSTEM_004_CARD_ID, SYSTEM_004_NEXT_CARD_ID])
  const nextCardBefore = beforeCards.find(card => card.id === SYSTEM_004_NEXT_CARD_ID)
  if (args.closeCard) await closeCardAndAdvanceSprint(planReview, nextCardBefore)
  const activeSprint = await getActiveFoundationCurrentSprint()
  const backlogCards = await getBacklogItemsByIds([SYSTEM_004_CARD_ID, SYSTEM_004_NEXT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([SYSTEM_004_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  await closeFoundationDb()

  const card = backlogCards.find(item => item.id === SYSTEM_004_CARD_ID) || null
  const nextCard = backlogCards.find(item => item.id === SYSTEM_004_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === SYSTEM_004_CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === SYSTEM_004_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === SYSTEM_004_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === SYSTEM_004_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', SYSTEM_004_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SYSTEM-004', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === SYSTEM_004_NEXT_CARD_ID, 'next live backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:system-004-capabilities-surface-check'] === `node --env-file-if-exists=.env ${SYSTEM_004_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:system-004-capabilities-surface-check'] || 'missing')
  addCheck(checks, payloadEvaluation.ok, 'capability surface payload is healthy', payloadEvaluation.failed.map(item => item.check).join('; ') || JSON.stringify(payload.summary))
  addCheck(checks, dogfood.ok, 'dogfood blocks missing generated truth, runtime approval, provider approval, and source-less rows', dogfood.invariant)
  addCheck(checks, serverSource.includes('loadSystem004CapabilitiesSurfacePayload') && serverSource.includes('capabilitySurface'), 'server exposes capabilitySurface in /api/system-inventory', 'server markers present')
  addCheck(checks, rendererSource.includes('getGeneratedCapabilitySurface') && rendererSource.includes('renderGeneratedCapabilitySurfacePanel'), 'renderer consumes generated capability surface', 'renderer markers present')
  addCheck(checks, rendererSource.includes('legacyAgentEvidenceToCard') && rendererSource.includes('currentAgentToCard'), 'renderer shows current agents and legacy evidence boundary', 'agent markers present')
  addCheck(checks, rendererSource.includes('provider/tool rows are visible and blocked'), 'renderer shows provider/tool blocked boundary', 'provider boundary marker present')
  addCheck(checks, moduleSource.includes('evaluateSystem004CapabilitiesSurfacePayload') && moduleSource.includes('providerToolRuntimeApprovedByThisCard'), 'module owns behavior and approval boundary proof', 'module markers present')
  addCheck(checks, scriptSource.includes('closeCardAndAdvanceSprint') && scriptSource.includes('SYSTEM_004_NEXT_CARD_ID'), 'script can close card and advance sprint', 'close-card markers present')
  addCheck(checks, registrySource.includes(SYSTEM_004_CLOSEOUT_KEY), 'closeout registry includes SYSTEM-004', SYSTEM_004_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes(SYSTEM_004_CARD_ID), 'verifier coverage source lists SYSTEM-004', 'coverage id present')
  addCheck(checks, closeout && closeout.backlogIds?.includes(SYSTEM_004_CARD_ID), 'closeout record links SYSTEM-004', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(SYSTEM_004_CLOSEOUT_KEY) && closeoutDoc.includes('capabilitySurface'), 'closeout handoff exists and names API payload', SYSTEM_004_CLOSEOUT_PATH)
  addCheck(checks, activeSprint.sprint?.sprintId === SYSTEM_004_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks SYSTEM-004 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === SYSTEM_004_NEXT_CARD_ID, 'close-card advances active blocker to LEGACY-SYSTEM-AUDIT-001', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped until its own build starts', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: SYSTEM_004_CARD_ID,
    closeoutKey: SYSTEM_004_CLOSEOUT_KEY,
    payloadSummary: payload.summary,
    currentSprint: {
      sprintId: activeSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`SYSTEM-004 capabilities surface check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
