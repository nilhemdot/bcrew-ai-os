#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
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
  PILLAR_5_APPROVAL_PATH,
  PILLAR_5_CARD_ID,
  PILLAR_5_CHANGED_FILES,
  PILLAR_5_CLOSEOUT_KEY,
  PILLAR_5_CLOSEOUT_PATH,
  PILLAR_5_JSON_PATH,
  PILLAR_5_MARKDOWN_PATH,
  PILLAR_5_NEXT_CARD_ID,
  PILLAR_5_NOT_NEXT_BOUNDARIES,
  PILLAR_5_PLAN_PATH,
  PILLAR_5_PROOF_COMMANDS,
  PILLAR_5_SCRIPT_PATH,
  PILLAR_5_SPRINT_ID,
  buildPillar5AgentInventoryDogfoodProof,
  buildPillar5AgentInventoryJson,
  buildPillar5AgentInventoryMarkdown,
  buildPillar5AgentInventorySnapshot,
  evaluatePillar5AgentInventorySnapshot,
} from '../lib/pillar-5-agent-inventory.js'
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
const ACTOR = 'codex-pillar-5-agent-inventory'
const oldRepoRoot = path.join(os.homedir(), 'bcrew-buddy-reference')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    writeReport: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport] }),
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

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function writeGeneratedFiles(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: PILLAR_5_SCRIPT_PATH,
    operation: 'write generated Pillar 5 Agent Inventory artifacts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  await fs.mkdir(path.join(repoRoot, 'docs/agents'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, PILLAR_5_JSON_PATH), buildPillar5AgentInventoryJson(snapshot), 'utf8')
  await fs.writeFile(path.join(repoRoot, PILLAR_5_MARKDOWN_PATH), buildPillar5AgentInventoryMarkdown(snapshot), 'utf8')
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: PILLAR_5_CARD_ID,
    title: 'Generate live agent and job inventory with honest status',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 6,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: 'Build an honest generated inventory of current Foundation agents, old-system agent evidence, harvested scout/research skills, and governed Foundation jobs.',
    whyItMatters: 'The old system rotted through agent sprawl and fake status confidence. Foundation needs generated agent/job inventory before agents, scouts, or parallel builders scale.',
    nextAction: closeCard
      ? `Done under ${PILLAR_5_CLOSEOUT_KEY}; generated artifacts: ${PILLAR_5_JSON_PATH}, ${PILLAR_5_MARKDOWN_PATH}. Continue ${PILLAR_5_NEXT_CARD_ID}.`
      : 'Build the live generated agent inventory from agent registry, capability boundaries, old-system agent roster, and proof-backed status.',
    statusNote: closeCard
      ? `Closed v1 under ${PILLAR_5_CLOSEOUT_KEY}: current agents, old-system agent evidence, harvested skills, and governed jobs are inventoried with honest status and no runtime approval.`
      : 'Executing v1: generated inventory only; no agent runtime, old-code import, hidden worker, model call, extraction, or external write.',
    owner: 'Foundation Process',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: PILLAR_5_NEXT_CARD_ID,
    title: existing.title || 'Build a live System Capabilities surface',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 7,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: existing.summary || 'Render the generated capabilities and agent/job inventory as a live operator surface without hand-maintained claims.',
    whyItMatters: existing.whyItMatters || 'Generated artifacts need a usable operator surface so capability truth does not stay buried in files.',
    nextAction: 'Build the operator-facing System Capabilities surface from generated capability and agent inventory artifacts.',
    statusNote: `Ready as the next active blocker after ${PILLAR_5_CLOSEOUT_KEY}; surface only, no provider/runtime approval.`,
    owner: existing.owner || 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/agent-capability-registry.js',
      'lib/foundation-jobs.js',
      'lib/pillar-4-system-capabilities.js',
      'lib/old-system-agent-onboarding-harvest.js',
      'scripts/process-old-system-research-team-harvest-check.mjs',
    ],
    existingDocs: [
      'docs/system-capabilities.generated.json',
      'docs/audits/2026-05-19-old-system-research-team-harvest.json',
      'docs/agents/old-system-agent-onboarding-harvest.md',
      'docs/specs/2026-05-15-foundation-ia-rebuild-game-plan.md',
    ],
    existingScripts: [
      'scripts/process-agent-capability-registry-check.mjs',
      'scripts/process-old-system-research-team-harvest-check.mjs',
      'scripts/process-pillar-4-system-capabilities-check.mjs',
      'process:system-health-nightly-audit-check',
    ],
    existingPolicy: [
      'Old-system agent records are evidence only until rebuilt through Foundation source/capability/runtime cards.',
      'Agent capability declarations are not live runtime approval.',
      'No hidden workers or subagents may be launched from inventory work.',
      'Private profile data, team emails, chat IDs, memories, and secrets must not be copied into generated repo artifacts.',
      'Generated inventory should distinguish current guarded agents, legacy evidence rows, harvested scout/skill patterns, and governed jobs.',
    ],
    reused: 'Reused agent capability registry, Foundation job definitions, old-system research harvest output, old-system agent roster metadata, Pillar 4 generated capabilities, Plan Critic, approval integrity, and Current Sprint overlay helpers.',
    notRebuilt: 'Did not rebuild old agents, import old prompts/code, launch Harlan/Crewbert, run model calls, start extraction, mutate source systems, or build the UI surface.',
    exactGap: 'Pillar 4 generated system capabilities, but detailed agent/job inventory remained split across old-system files, current registry, and job definitions.',
    overBroadRisk: 'This can drift into agent runtime or old-agent revival. V1 is generated inventory and honest status only.',
    readyBy: 'Steve approved continuing the Foundation capability sprint.',
    readyAt: '2026-05-19T20:45:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `pillar-5-${stableRunId(PILLAR_5_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: PILLAR_5_CARD_ID,
      closeoutKey: PILLAR_5_CLOSEOUT_KEY,
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
        PILLAR_5_CARD_ID,
        PILLAR_5_PLAN_PATH,
        planReview.status,
        planReview.score,
        PILLAR_5_CHANGED_FILES,
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
    scriptPath: PILLAR_5_SCRIPT_PATH,
    operation: 'close PILLAR-5 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogItem(PILLAR_5_CARD_ID, buildCardRow({ closeCard: true }), ACTOR)
  await updateBacklogItem(PILLAR_5_NEXT_CARD_ID, buildNextCardRow(nextCard || {}), ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const items = (activeSprint.items || []).map((item, index) => {
    if (item.cardId === PILLAR_5_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: PILLAR_5_PLAN_PATH,
        definitionOfDone: 'Generated Agent Inventory artifact exists from current agent capability registry, old-system agent roster evidence, old-system research harvest, and governed Foundation job definitions; unsafe live legacy/runtime/import variants fail closed.',
        proofCommands: PILLAR_5_PROOF_COMMANDS,
        nextAction: `Continue ${PILLAR_5_NEXT_CARD_ID}; agent/job inventory is generated and no runtime has been approved.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...PILLAR_5_NOT_NEXT_BOUNDARIES, 'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.'])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: PILLAR_5_CLOSEOUT_KEY,
          approvalRef: PILLAR_5_APPROVAL_PATH,
          generatedJson: PILLAR_5_JSON_PATH,
          generatedMarkdown: PILLAR_5_MARKDOWN_PATH,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === PILLAR_5_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        nextAction: 'Build the operator-facing System Capabilities surface from generated capabilities and agent inventory truth.',
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: PILLAR_5_CARD_ID,
          requiredBeforeOperatorCapabilityScale: true,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(activeSprint.sprint || {}),
        sprintId: activeSprint.sprint?.sprintId || PILLAR_5_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: PILLAR_5_NEXT_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: PILLAR_5_CARD_ID,
          nextAction: `Continue ${PILLAR_5_NEXT_CARD_ID}; generated Agent Inventory v1 is ready.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'PILLAR-5 closes Agent Inventory and advances to live System Capabilities surface.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
      reason: 'PILLAR-5 closes and advances the active blocker.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const oldAgentDataPath = path.join(oldRepoRoot, 'dashboard', 'agent-data.json')
  const oldResearchHarvestPath = 'docs/audits/2026-05-19-old-system-research-team-harvest.json'
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
    oldAgentData,
    oldResearchHarvest,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(PILLAR_5_PLAN_PATH),
    readRepoFile('lib/pillar-5-agent-inventory.js'),
    readRepoFile(PILLAR_5_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(PILLAR_5_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(PILLAR_5_JSON_PATH, { optional: true }),
    readRepoFile(PILLAR_5_MARKDOWN_PATH, { optional: true }),
    readJsonFile(oldAgentDataPath),
    readRepoJson(oldResearchHarvestPath),
  ])

  let snapshot = buildPillar5AgentInventorySnapshot({ oldAgentData, oldResearchHarvest })
  if (!args.writeReport && generatedJsonBefore) {
    try {
      const existing = JSON.parse(generatedJsonBefore)
      if (existing?.generatedAt) snapshot = buildPillar5AgentInventorySnapshot({ oldAgentData, oldResearchHarvest, generatedAt: existing.generatedAt })
    } catch {}
  }
  const expectedJson = buildPillar5AgentInventoryJson(snapshot)
  const expectedMarkdown = buildPillar5AgentInventoryMarkdown(snapshot)
  if (args.writeReport) await writeGeneratedFiles(snapshot)
  const generatedJson = args.writeReport ? expectedJson : generatedJsonBefore
  const generatedMarkdown = args.writeReport ? expectedMarkdown : generatedMarkdownBefore
  const snapshotEvaluation = evaluatePillar5AgentInventorySnapshot(snapshot)
  const dogfood = buildPillar5AgentInventoryDogfoodProof()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PILLAR_5_APPROVAL_PATH,
    cardId: PILLAR_5_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: PILLAR_5_CARD_ID, priority: 'P1' },
    changedFiles: PILLAR_5_CHANGED_FILES,
    declaredRisk: planText,
  })

  await initFoundationDb()
  const beforeCards = await getBacklogItemsByIds([PILLAR_5_CARD_ID, PILLAR_5_NEXT_CARD_ID])
  const nextCardBefore = beforeCards.find(card => card.id === PILLAR_5_NEXT_CARD_ID)
  if (args.closeCard) await closeCardAndAdvanceSprint(planReview, nextCardBefore)
  const activeSprint = await getActiveFoundationCurrentSprint()
  const backlogCards = await getBacklogItemsByIds([PILLAR_5_CARD_ID, PILLAR_5_NEXT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([PILLAR_5_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  await closeFoundationDb()

  const card = backlogCards.find(item => item.id === PILLAR_5_CARD_ID) || null
  const nextCard = backlogCards.find(item => item.id === PILLAR_5_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === PILLAR_5_CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === PILLAR_5_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === PILLAR_5_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === PILLAR_5_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', PILLAR_5_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for PILLAR-5', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === PILLAR_5_NEXT_CARD_ID, 'next live backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:pillar-5-agent-inventory-check'] === `node --env-file-if-exists=.env ${PILLAR_5_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:pillar-5-agent-inventory-check'] || 'missing')
  addCheck(checks, snapshotEvaluation.ok, 'Agent Inventory snapshot is healthy', snapshotEvaluation.failed.map(item => item.check).join('; ') || `${snapshot.summary.currentAgentCount + snapshot.summary.legacyAgentCount} agent rows`)
  addCheck(checks, dogfood.ok, 'dogfood blocks source-less, live-legacy, runtime-approved, old-code-import, and private-leak rows', dogfood.invariant)
  addCheck(checks, generatedJson === expectedJson, 'generated JSON matches current inventory snapshot', PILLAR_5_JSON_PATH)
  addCheck(checks, generatedMarkdown === expectedMarkdown, 'generated markdown matches current inventory snapshot', PILLAR_5_MARKDOWN_PATH)
  addCheck(checks, snapshot.sourceMaterial.evidenceFiles.includes('~/bcrew-buddy-reference/dashboard/agent-data.json'), 'old agent inventory evidence path is recorded', snapshot.sourceMaterial.evidenceFiles.join(', '))
  addCheck(checks, snapshot.summary.legacyStatusCounts.WORKING >= 1 && snapshot.summary.runtimeApprovedAgentCount === 0, 'old WORKING rows stay evidence-only with no runtime approval', JSON.stringify(snapshot.summary.legacyStatusCounts))
  addCheck(checks, moduleSource.includes('buildPillar5AgentInventoryDogfoodProof') && moduleSource.includes('legacy_claim_working_evidence_only'), 'module owns behavior proof and honest legacy status', 'module markers present')
  addCheck(checks, scriptSource.includes('writeGeneratedFiles') && scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.writeReport'), 'generated files write only behind explicit flag', 'write-report guard present')
  addCheck(checks, registrySource.includes(PILLAR_5_CLOSEOUT_KEY), 'closeout registry includes PILLAR-5', PILLAR_5_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes(PILLAR_5_CARD_ID), 'verifier coverage source lists PILLAR-5', 'coverage id present')
  addCheck(checks, closeout && closeout.backlogIds?.includes(PILLAR_5_CARD_ID), 'closeout record links PILLAR-5', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(PILLAR_5_CLOSEOUT_KEY) && closeoutDoc.includes('Old-system agents are evidence only'), 'closeout handoff exists and states evidence-only boundary', PILLAR_5_CLOSEOUT_PATH)
  addCheck(checks, activeSprint.sprint?.sprintId === PILLAR_5_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks PILLAR-5 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === PILLAR_5_NEXT_CARD_ID, 'close-card advances active blocker to SYSTEM-004', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped until its own build starts', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: PILLAR_5_CARD_ID,
    closeoutKey: PILLAR_5_CLOSEOUT_KEY,
    snapshotSummary: snapshot.summary,
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
    console.log(`PILLAR-5 Agent Inventory check: ${result.status}`)
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
