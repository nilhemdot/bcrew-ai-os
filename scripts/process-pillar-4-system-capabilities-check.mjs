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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PILLAR_4_APPROVAL_PATH,
  PILLAR_4_CARD_ID,
  PILLAR_4_CHANGED_FILES,
  PILLAR_4_CLOSEOUT_KEY,
  PILLAR_4_CLOSEOUT_PATH,
  PILLAR_4_JSON_PATH,
  PILLAR_4_MARKDOWN_PATH,
  PILLAR_4_NEXT_CARD_ID,
  PILLAR_4_NOT_NEXT_BOUNDARIES,
  PILLAR_4_PLAN_PATH,
  PILLAR_4_PROOF_COMMANDS,
  PILLAR_4_SCRIPT_PATH,
  PILLAR_4_SPRINT_ID,
  buildPillar4SystemCapabilitiesDogfoodProof,
  buildPillar4SystemCapabilitiesJson,
  buildPillar4SystemCapabilitiesMarkdown,
  buildPillar4SystemCapabilitiesSnapshot,
  evaluatePillar4SystemCapabilitiesSnapshot,
} from '../lib/pillar-4-system-capabilities.js'
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
const ACTOR = 'codex-pillar-4-system-capabilities'

function parseArgs(argv = process.argv.slice(2)) {
  let baseUrl = 'http://127.0.0.1:3000'
  for (const arg of argv) {
    if (String(arg).startsWith('--baseUrl=')) baseUrl = String(arg).slice('--baseUrl='.length)
  }
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    writeReport: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport] }),
    baseUrl,
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

async function fetchJsonWithMetrics(baseUrl, routePath) {
  const started = Date.now()
  const response = await fetch(new URL(routePath, baseUrl), { redirect: 'manual' })
  const body = await response.text()
  let json = null
  try {
    json = body ? JSON.parse(body) : null
  } catch {}
  return {
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - started,
    bytes: Buffer.byteLength(body, 'utf8'),
    json,
  }
}

async function writeGeneratedFiles(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: PILLAR_4_SCRIPT_PATH,
    operation: 'write generated Pillar 4 System Capabilities artifacts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  await fs.writeFile(path.join(repoRoot, PILLAR_4_JSON_PATH), buildPillar4SystemCapabilitiesJson(snapshot), 'utf8')
  await fs.writeFile(path.join(repoRoot, PILLAR_4_MARKDOWN_PATH), buildPillar4SystemCapabilitiesMarkdown(snapshot), 'utf8')
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: PILLAR_4_CARD_ID,
    title: 'Generate live system capabilities inventory',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 5,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: 'Produce a live docs/system-capabilities equivalent from actual routes, jobs, connectors, skills, provider/tool registries, agent registry, and source contracts.',
    whyItMatters: 'The OS needs generated capability truth so builders and future agents cannot rely on stale docs, chat claims, or hidden runtime assumptions.',
    nextAction: closeCard
      ? `Done under ${PILLAR_4_CLOSEOUT_KEY}; generated artifacts: ${PILLAR_4_JSON_PATH}, ${PILLAR_4_MARKDOWN_PATH}. Continue ${PILLAR_4_NEXT_CARD_ID}.`
      : 'Build the live-generated capabilities inventory from system inventory, route/job/source/tool truth, and proof-backed capability status.',
    statusNote: closeCard
      ? `Closed v1 under ${PILLAR_4_CLOSEOUT_KEY}: generated System Capabilities from source contracts, connectors, route/surface map, job definitions, runtime skills/plugins, provider/tool registry, and agent registry.`
      : 'Executing v1: generated capability inventory only; no provider calls, external writes, agent runtime launch, or manual capability claims.',
    owner: 'Foundation Process',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: PILLAR_4_NEXT_CARD_ID,
    title: existing.title || 'Generate live agent inventory',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 6,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: existing.summary || 'Generate a live agent inventory from current agent registry, old-system research team harvest, capabilities, owners, statuses, and approval boundaries.',
    whyItMatters: existing.whyItMatters || 'The old system rotted partly through agent sprawl. Agent inventory needs generated truth before new agents or scout teams scale.',
    nextAction: 'Build the live generated agent inventory from agent registry, capability boundaries, old-system agent roster, and proof-backed status.',
    statusNote: `Ready as the next active blocker after ${PILLAR_4_CLOSEOUT_KEY}; do not start agent runtime or Value Builder split.`,
    owner: existing.owner || 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/foundation-surface-map.js',
      'lib/foundation-jobs.js',
      'lib/foundation-identity-surface.js',
      'lib/foundation-up-capability-registry.js',
      'lib/agent-capability-registry.js',
      'server.js /api/system-inventory',
    ],
    existingDocs: [
      'docs/process/foundation-up-capability-registry-001-plan.md',
      'docs/process/agent-capability-registry-001-plan.md',
      'docs/process/foundation-identity-001-plan.md',
      'docs/conversation-archive/LESSONS-IP-MANIFEST.json',
    ],
    existingScripts: [
      'scripts/process-foundation-up-capability-registry-check.mjs',
      'scripts/process-agent-capability-registry-check.mjs',
      'scripts/process-foundation-identity-check.mjs',
      'process:system-health-nightly-audit-check',
    ],
    existingPolicy: [
      'Capabilities must be generated from source-backed registries and runtime APIs, not hand-maintained claims.',
      'Provider/tool capability registration does not approve runtime use, paid spend, or external mutation.',
      'Agent capability declaration does not approve live agent runtime or side effects.',
      'Installed plugins are runtime capabilities, not business source-truth signoff.',
      'Private local files may appear only as metadata-safe boundaries, never copied content.',
    ],
    reused: 'Reused live source contracts, source connectors, grouped source systems, Foundation surface map, job definitions, runtime system inventory API, Foundation-up capability registry, and agent capability registry.',
    notRebuilt: 'Did not rebuild the System Inventory UI, agent inventory, provider clients, source contracts, job runner, plugin discovery, or runtime capabilities.',
    exactGap: 'Capability truth existed in scattered registries and API payloads. This card generates one source-backed System Capabilities artifact with proof and approval boundaries.',
    overBroadRisk: 'This can drift into approving provider/tool use or live agent runtime. V1 is generated inventory only.',
    readyBy: 'Steve approved continuing card-by-card through the Foundation capability sprint.',
    readyAt: '2026-05-19T20:30:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `pillar-4-${stableRunId(PILLAR_4_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: PILLAR_4_CARD_ID,
      closeoutKey: PILLAR_4_CLOSEOUT_KEY,
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
        PILLAR_4_CARD_ID,
        PILLAR_4_PLAN_PATH,
        planReview.status,
        planReview.score,
        PILLAR_4_CHANGED_FILES,
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
    scriptPath: PILLAR_4_SCRIPT_PATH,
    operation: 'close PILLAR-4 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogItem(PILLAR_4_CARD_ID, buildCardRow({ closeCard: true }), ACTOR)
  await updateBacklogItem(PILLAR_4_NEXT_CARD_ID, buildNextCardRow(nextCard || {}), ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const items = (activeSprint.items || []).map((item, index) => {
    if (item.cardId === PILLAR_4_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: PILLAR_4_PLAN_PATH,
        definitionOfDone: 'Generated System Capabilities artifact exists from live source contracts, source connectors, surfaces/routes, job definitions, runtime skills/plugins, provider/tool registry, and agent capability registry; unsafe over-claim variants fail closed.',
        proofCommands: PILLAR_4_PROOF_COMMANDS,
        nextAction: `Continue ${PILLAR_4_NEXT_CARD_ID}; System Capabilities is generated and provider/tool use remains approval-bound.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...PILLAR_4_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: PILLAR_4_CLOSEOUT_KEY,
          approvalRef: PILLAR_4_APPROVAL_PATH,
          generatedJson: PILLAR_4_JSON_PATH,
          generatedMarkdown: PILLAR_4_MARKDOWN_PATH,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === PILLAR_4_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        nextAction: 'Build live-generated Agent Inventory from registry truth, old-system scout/agent harvest, owners, statuses, and approval boundaries.',
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: PILLAR_4_CARD_ID,
          requiredBeforeAgentScale: true,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(activeSprint.sprint || {}),
        sprintId: activeSprint.sprint?.sprintId || PILLAR_4_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: PILLAR_4_NEXT_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: PILLAR_4_CARD_ID,
          nextAction: `Continue ${PILLAR_4_NEXT_CARD_ID}; generated System Capabilities v1 is ready.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'PILLAR-4 closes System Capabilities and advances to live Agent Inventory.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
      reason: 'PILLAR-4 closes and advances the active blocker.',
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
    registrySource,
    coverageSource,
    closeoutDoc,
    generatedJsonBefore,
    generatedMarkdownBefore,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(PILLAR_4_PLAN_PATH),
    readRepoFile('lib/pillar-4-system-capabilities.js'),
    readRepoFile(PILLAR_4_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(PILLAR_4_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(PILLAR_4_JSON_PATH, { optional: true }),
    readRepoFile(PILLAR_4_MARKDOWN_PATH, { optional: true }),
  ])

  const systemInventoryRoute = await fetchJsonWithMetrics(args.baseUrl, '/api/system-inventory')
  const systemInventory = systemInventoryRoute.json || {}
  let snapshot = buildPillar4SystemCapabilitiesSnapshot({ systemInventory })
  if (!args.writeReport && generatedJsonBefore) {
    try {
      const existing = JSON.parse(generatedJsonBefore)
      if (existing?.generatedAt) snapshot = buildPillar4SystemCapabilitiesSnapshot({ systemInventory, generatedAt: existing.generatedAt })
    } catch {}
  }
  const expectedJson = buildPillar4SystemCapabilitiesJson(snapshot)
  const expectedMarkdown = buildPillar4SystemCapabilitiesMarkdown(snapshot)
  if (args.writeReport) await writeGeneratedFiles(snapshot)

  const generatedJson = args.writeReport ? expectedJson : generatedJsonBefore
  const generatedMarkdown = args.writeReport ? expectedMarkdown : generatedMarkdownBefore
  const snapshotEvaluation = evaluatePillar4SystemCapabilitiesSnapshot(snapshot)
  const dogfood = buildPillar4SystemCapabilitiesDogfoodProof()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PILLAR_4_APPROVAL_PATH,
    cardId: PILLAR_4_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: PILLAR_4_CARD_ID, priority: 'P1' },
    changedFiles: PILLAR_4_CHANGED_FILES,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const beforeCards = await getBacklogItemsByIds([PILLAR_4_CARD_ID, PILLAR_4_NEXT_CARD_ID])
  const nextCardBefore = beforeCards.find(card => card.id === PILLAR_4_NEXT_CARD_ID)
  if (args.closeCard) await closeCardAndAdvanceSprint(planReview, nextCardBefore)
  const activeSprint = await getActiveFoundationCurrentSprint()
  const backlogCards = await getBacklogItemsByIds([PILLAR_4_CARD_ID, PILLAR_4_NEXT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([PILLAR_4_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  await closeFoundationDb()

  const card = backlogCards.find(item => item.id === PILLAR_4_CARD_ID) || null
  const nextCard = backlogCards.find(item => item.id === PILLAR_4_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === PILLAR_4_CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === PILLAR_4_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === PILLAR_4_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === PILLAR_4_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, systemInventoryRoute.ok && systemInventoryRoute.bytes < 2_000_000, '/api/system-inventory returns bounded live inventory', `${systemInventoryRoute.status}/${systemInventoryRoute.durationMs}ms/${systemInventoryRoute.bytes}B`)
  addCheck(checks, approval.ok, 'approval validates at 9.8+', PILLAR_4_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for PILLAR-4', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === PILLAR_4_NEXT_CARD_ID, 'next live backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:pillar-4-system-capabilities-check'] === `node --env-file-if-exists=.env ${PILLAR_4_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:pillar-4-system-capabilities-check'] || 'missing')
  addCheck(checks, snapshotEvaluation.ok, 'System Capabilities snapshot is healthy', snapshotEvaluation.failed.map(item => item.check).join('; ') || `${snapshot.summary.capabilityRows} rows`)
  addCheck(checks, dogfood.ok, 'dogfood blocks source-less, over-claimed, secret-leaking, mutating, and missing-runtime rows', dogfood.invariant)
  addCheck(checks, generatedJson === expectedJson, 'generated JSON matches current live capability snapshot', PILLAR_4_JSON_PATH)
  addCheck(checks, generatedMarkdown === expectedMarkdown, 'generated markdown matches current live capability snapshot', PILLAR_4_MARKDOWN_PATH)
  addCheck(checks, snapshot.sourceMaterial.modules.includes('lib/source-contracts.js') && snapshot.sourceMaterial.apiRoutes.includes('/api/system-inventory'), 'snapshot records live source material', snapshot.sourceMaterial.modules.join(', '))
  addCheck(checks, snapshot.summary.blockedProviderRows >= 4, 'provider/tool capabilities remain blocked by default', String(snapshot.summary.blockedProviderRows))
  addCheck(checks, moduleSource.includes('buildPillar4SystemCapabilitiesDogfoodProof') && moduleSource.includes('provider_tool_capability'), 'module owns behavior proof and provider boundary', 'module markers present')
  addCheck(checks, scriptSource.includes('writeGeneratedFiles') && scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.writeReport'), 'generated files write only behind explicit flag', 'write-report guard present')
  addCheck(checks, registrySource.includes(PILLAR_4_CLOSEOUT_KEY), 'closeout registry includes PILLAR-4', PILLAR_4_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes(PILLAR_4_CARD_ID), 'verifier coverage source lists PILLAR-4', 'coverage id present')
  addCheck(checks, closeout && closeout.backlogIds?.includes(PILLAR_4_CARD_ID), 'closeout record links PILLAR-4', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(PILLAR_4_CLOSEOUT_KEY) && closeoutDoc.includes('Provider/tool runtime use remains blocked'), 'closeout handoff exists and states provider boundary', PILLAR_4_CLOSEOUT_PATH)
  addCheck(checks, activeSprint.sprint?.sprintId === PILLAR_4_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks PILLAR-4 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === PILLAR_4_NEXT_CARD_ID, 'close-card advances active blocker to PILLAR-5', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped until its own build starts', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: PILLAR_4_CARD_ID,
    closeoutKey: PILLAR_4_CLOSEOUT_KEY,
    snapshotSummary: snapshot.summary,
    systemInventoryRoute: {
      status: systemInventoryRoute.status,
      durationMs: systemInventoryRoute.durationMs,
      bytes: systemInventoryRoute.bytes,
    },
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
    console.log(`PILLAR-4 System Capabilities check: ${result.status}`)
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
