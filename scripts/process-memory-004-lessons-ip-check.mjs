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
  MEMORY_004_APPROVAL_PATH,
  MEMORY_004_CARD_ID,
  MEMORY_004_CHANGED_FILES,
  MEMORY_004_CLOSEOUT_KEY,
  MEMORY_004_CLOSEOUT_PATH,
  MEMORY_004_MANIFEST_PATH,
  MEMORY_004_NEXT_CARD_ID,
  MEMORY_004_NOT_NEXT_BOUNDARIES,
  MEMORY_004_PLAN_PATH,
  MEMORY_004_PROOF_COMMANDS,
  MEMORY_004_README_PATH,
  MEMORY_004_SCRIPT_PATH,
  MEMORY_004_SPRINT_ID,
  buildLessonsIpDogfoodProof,
  buildLessonsIpManifestJson,
  buildLessonsIpMarkdown,
  buildLessonsIpSnapshot,
  evaluateLessonsIpSnapshot,
  readConversationArchiveManifest,
} from '../lib/memory-004-lessons-ip.js'
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
const ACTOR = 'codex-memory-004-lessons-ip'

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

async function writeGeneratedFiles(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MEMORY_004_SCRIPT_PATH,
    operation: 'write generated MEMORY-004 lesson/IP workflow files',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  await fs.mkdir(path.join(repoRoot, 'docs/conversation-archive'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, MEMORY_004_MANIFEST_PATH), buildLessonsIpManifestJson(snapshot), 'utf8')
  await fs.writeFile(path.join(repoRoot, MEMORY_004_README_PATH), buildLessonsIpMarkdown(snapshot), 'utf8')
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MEMORY_004_CARD_ID,
    title: 'Turn archived conversations into lessons learned and reusable IP',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 4,
    source: 'Founder IP capture direction; Steve-approved Foundation gold-capture sprint.',
    summary: 'Use the conversation archive to generate source-linked lesson, timeline, quote-review, and reusable IP candidates without rereading every chat manually.',
    whyItMatters: 'The build history is valuable IP only if it becomes searchable, source-linked, privacy-aware output lanes instead of disappearing into chats and handoffs.',
    nextAction: closeCard
      ? `Done under ${MEMORY_004_CLOSEOUT_KEY}; proof: ${MEMORY_004_CLOSEOUT_PATH}, ${MEMORY_004_MANIFEST_PATH}, npm run process:memory-004-lessons-ip-check -- --write-report --close-card --json, foundation:verify. Continue ${MEMORY_004_NEXT_CARD_ID}.`
      : 'Generate the metadata-only lesson/IP workflow, approval rules, and proof before any polished content production.',
    statusNote: closeCard
      ? `Closed v1 under ${MEMORY_004_CLOSEOUT_KEY} on 2026-05-20: source-linked lessons/IP workflow is generated from MEMORY-003 without raw private text or external model use. Closeout/proof: ${MEMORY_004_CLOSEOUT_PATH}.`
      : 'Executing v1: source-linked workflow only; no polished content, external model upload, or raw private excerpts.',
    owner: 'Foundation Memory',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: MEMORY_004_NEXT_CARD_ID,
    title: existing.title || 'Generate live system capabilities inventory',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 5,
    source: 'Steve-approved Foundation gold-capture and capability sprint.',
    summary: existing.summary || 'Produce a live docs/system-capabilities equivalent from actual routes, jobs, connectors, skills, and source contracts.',
    whyItMatters: existing.whyItMatters || 'The OS needs a live capability inventory so future agents and builders do not rely on stale docs or claims.',
    nextAction: 'Build the live-generated capabilities inventory from system inventory, route/job/source truth, and proof-backed capability status.',
    statusNote: `Ready as the next active blocker after ${MEMORY_004_CLOSEOUT_KEY}; no longer proposal-only for this sprint.`,
    owner: existing.owner || 'Foundation Process',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `memory-004-${stableRunId(MEMORY_004_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: MEMORY_004_CARD_ID,
      closeoutKey: MEMORY_004_CLOSEOUT_KEY,
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
        MEMORY_004_CARD_ID,
        MEMORY_004_PLAN_PATH,
        planReview.status,
        planReview.score,
        MEMORY_004_CHANGED_FILES,
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

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/memory-003-conversation-archive.js archive manifest',
      'lib/foundation-lessons-learned-loop.js behavior-changing lesson action rules',
      'lib/intelligence-atoms.js and intelligence synthesis spine',
      'lib/approval-integrity.js approval validation',
      'lib/process-plan-critic.js plan scoring',
      'lib/process-write-guard.js explicit process-check writes',
    ],
    existingDocs: [
      'docs/conversation-archive/MANIFEST.json',
      'docs/conversation-archive/README.md',
      'docs/handoffs/2026-05-19-memory-003-conversation-archive-closeout.md',
      'docs/process/foundation-lessons-learned-loop-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-memory-003-conversation-archive-check.mjs',
      'scripts/process-foundation-lessons-learned-loop-check.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    existingPolicy: [
      'Private memory stays private',
      'Lessons must become behavior-changing actions, not documentation-only notes',
      'Reconstructed handoffs are not exact transcripts',
      'Blockers block unsafe actions, not the whole sprint',
    ],
    reused: 'Reused MEMORY-003 archive truth, Foundation lessons loop rules, approval integrity, Plan Critic, process write guard, backlog store, and Current Sprint overlay helpers.',
    notRebuilt: 'Did not rebuild the lessons scheduler, intelligence atom store, synthesis engine, retrieval, Action Router, or polished content surfaces.',
    exactGap: 'MEMORY-003 preserved archive metadata, but the operator still needed a deterministic way to turn the archive into lesson, timeline, quote-review, and reusable-IP work queues without rereading every artifact.',
    overBroadRisk: 'This can drift into private transcript summarization, external model upload, or polished content production. V1 is metadata-only workflow generation and source routing.',
    readyBy: 'Steve approved continuing the Foundation gold-capture sprint after MEMORY-003 shipped.',
    readyAt: '2026-05-20T00:15:00-04:00',
  }
}

async function closeCardAndAdvanceSprint(planReview, nextCard) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MEMORY_004_SCRIPT_PATH,
    operation: 'close MEMORY-004 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogItem(MEMORY_004_CARD_ID, buildCardRow({ closeCard: true }), ACTOR)
  await updateBacklogItem(MEMORY_004_NEXT_CARD_ID, buildNextCardRow(nextCard || {}), ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const existingItems = activeSprint.items || []
  const items = existingItems.map((item, index) => {
    if (item.cardId === MEMORY_004_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: MEMORY_004_PLAN_PATH,
        definitionOfDone: 'Conversation archive rolls into source-linked lessons, timelines, quote-review candidates, reusable IP candidates, and privacy/approval rules without raw private text or external model use.',
        proofCommands: MEMORY_004_PROOF_COMMANDS,
        nextAction: `Continue ${MEMORY_004_NEXT_CARD_ID}; lessons/IP workflow exists and is not polished content yet.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...MEMORY_004_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: MEMORY_004_CLOSEOUT_KEY,
          approvalRef: MEMORY_004_APPROVAL_PATH,
          lessonsIpManifest: MEMORY_004_MANIFEST_PATH,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === MEMORY_004_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        nextAction: 'Scope/build live-generated System Capabilities from actual route/job/source/tool truth.',
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: MEMORY_004_CARD_ID,
          requiredBeforeContinuousWork: true,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(activeSprint.sprint || {}),
        sprintId: activeSprint.sprint?.sprintId || MEMORY_004_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: MEMORY_004_NEXT_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: MEMORY_004_CARD_ID,
          nextAction: `Continue ${MEMORY_004_NEXT_CARD_ID}; conversation lessons/IP workflow v1 is ready.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'MEMORY-004 closes lessons/IP workflow and advances to live System Capabilities.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
      reason: 'MEMORY-004 closes and advances the active blocker.',
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
    manifestDocBefore,
    readmeDocBefore,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(MEMORY_004_PLAN_PATH),
    readRepoFile('lib/memory-004-lessons-ip.js'),
    readRepoFile(MEMORY_004_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(MEMORY_004_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(MEMORY_004_MANIFEST_PATH, { optional: true }),
    readRepoFile(MEMORY_004_README_PATH, { optional: true }),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: MEMORY_004_APPROVAL_PATH,
    cardId: MEMORY_004_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: MEMORY_004_CARD_ID, priority: 'P1' },
    changedFiles: MEMORY_004_CHANGED_FILES,
    declaredRisk: planText,
  })

  const archiveManifest = await readConversationArchiveManifest({ repoRoot })
  let snapshot = buildLessonsIpSnapshot({ manifest: archiveManifest })
  if (args.writeReport) {
    await writeGeneratedFiles(snapshot)
  } else if (manifestDocBefore) {
    try {
      const existingManifest = JSON.parse(manifestDocBefore)
      if (existingManifest?.generatedAt) snapshot = buildLessonsIpSnapshot({ manifest: archiveManifest, generatedAt: existingManifest.generatedAt })
    } catch {}
  }
  const expectedManifestJson = buildLessonsIpManifestJson(snapshot)
  const expectedReadme = buildLessonsIpMarkdown(snapshot)
  const manifestDoc = args.writeReport ? expectedManifestJson : manifestDocBefore
  const readmeDoc = args.writeReport ? expectedReadme : readmeDocBefore
  const snapshotEval = evaluateLessonsIpSnapshot(snapshot)
  const dogfood = buildLessonsIpDogfoodProof()

  await initFoundationDb()
  const beforeCards = await getBacklogItemsByIds([MEMORY_004_CARD_ID, MEMORY_004_NEXT_CARD_ID])
  const nextCardBefore = beforeCards.find(card => card.id === MEMORY_004_NEXT_CARD_ID)
  if (args.closeCard) {
    await closeCardAndAdvanceSprint(planReview, nextCardBefore)
  }
  const activeSprint = await getActiveFoundationCurrentSprint()
  const backlogCards = await getBacklogItemsByIds([MEMORY_004_CARD_ID, MEMORY_004_NEXT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([MEMORY_004_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  await closeFoundationDb()

  const card = backlogCards.find(item => item.id === MEMORY_004_CARD_ID) || null
  const nextCard = backlogCards.find(item => item.id === MEMORY_004_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === MEMORY_004_CARD_ID)
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === MEMORY_004_NEXT_CARD_ID)
  const closeout = closeouts.find(record => record.key === MEMORY_004_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === MEMORY_004_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', MEMORY_004_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for MEMORY-004', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['research', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === MEMORY_004_NEXT_CARD_ID, 'next live backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:memory-004-lessons-ip-check'] === `node --env-file-if-exists=.env ${MEMORY_004_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:memory-004-lessons-ip-check'] || 'missing')
  addCheck(checks, snapshotEval.ok, 'lessons/IP workflow snapshot is healthy', snapshotEval.failed.map(item => item.check).join('; ') || `${snapshot.summary.sourceLinkedOutputCount} source-linked outputs`)
  addCheck(checks, dogfood.ok, 'dogfood blocks source-less, raw-text, external-model, and unapproved quote output', dogfood.invariant)
  addCheck(checks, manifestDoc === expectedManifestJson, 'generated lesson/IP JSON manifest matches current archive snapshot', MEMORY_004_MANIFEST_PATH)
  addCheck(checks, readmeDoc === expectedReadme, 'generated lesson/IP README matches current archive snapshot', MEMORY_004_README_PATH)
  addCheck(checks, snapshot.inputManifest?.cardId === 'MEMORY-003' && snapshot.inputManifest?.closeoutKey === 'memory-003-conversation-archive-v1', 'MEMORY-004 consumes MEMORY-003 archive closeout truth', JSON.stringify(snapshot.inputManifest))
  addCheck(checks, snapshot.privacyBoundary.includes('No raw private transcript text') && snapshot.externalModelUse === false, 'privacy boundary blocks private raw text and external model use', snapshot.privacyBoundary)
  addCheck(checks, moduleSource.includes('buildLessonsIpDogfoodProof') && moduleSource.includes('quoteText'), 'module includes dogfood for raw quote leakage', 'dogfood present')
  addCheck(checks, scriptSource.includes('writeGeneratedFiles') && scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.writeReport'), 'generated files write only behind explicit flag', 'write-report guard present')
  addCheck(checks, registrySource.includes(MEMORY_004_CLOSEOUT_KEY), 'closeout registry includes MEMORY-004', MEMORY_004_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes('MEMORY-004'), 'verifier coverage source lists MEMORY-004', 'coverage id present')
  addCheck(checks, closeout && closeout.backlogIds?.includes(MEMORY_004_CARD_ID), 'closeout record links MEMORY-004', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(MEMORY_004_CLOSEOUT_KEY) && closeoutDoc.includes('No raw private'), 'closeout handoff exists and states privacy boundary', MEMORY_004_CLOSEOUT_PATH)
  addCheck(checks, activeSprint.sprint?.sprintId === MEMORY_004_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks MEMORY-004 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === MEMORY_004_NEXT_CARD_ID, 'close-card advances active blocker to PILLAR-4', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped until its own plan/proof starts', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: MEMORY_004_CARD_ID,
    closeoutKey: MEMORY_004_CLOSEOUT_KEY,
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
    console.log(`MEMORY-004 lessons/IP workflow check: ${result.status}`)
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
