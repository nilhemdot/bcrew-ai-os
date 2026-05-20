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
  MEMORY_003_APPROVAL_PATH,
  MEMORY_003_CARD_ID,
  MEMORY_003_CHANGED_FILES,
  MEMORY_003_CLOSEOUT_KEY,
  MEMORY_003_CLOSEOUT_PATH,
  MEMORY_003_MANIFEST_PATH,
  MEMORY_003_NEXT_CARD_ID,
  MEMORY_003_NOT_NEXT_BOUNDARIES,
  MEMORY_003_PLAN_PATH,
  MEMORY_003_PROOF_COMMANDS,
  MEMORY_003_README_PATH,
  MEMORY_003_SCRIPT_PATH,
  MEMORY_003_SPRINT_ID,
  buildConversationArchiveDogfoodProof,
  buildConversationArchiveManifestJson,
  buildConversationArchiveManifestMarkdown,
  buildConversationArchiveSnapshot,
  evaluateConversationArchiveSnapshot,
} from '../lib/memory-003-conversation-archive.js'
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
const ACTOR = 'codex-memory-003-conversation-archive'

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

async function writeGeneratedArchiveFiles(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MEMORY_003_SCRIPT_PATH,
    operation: 'write generated conversation archive manifest files',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  await fs.mkdir(path.join(repoRoot, 'docs/conversation-archive'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, MEMORY_003_MANIFEST_PATH), buildConversationArchiveManifestJson(snapshot), 'utf8')
  await fs.writeFile(path.join(repoRoot, MEMORY_003_README_PATH), buildConversationArchiveManifestMarkdown(snapshot), 'utf8')
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MEMORY_003_CARD_ID,
    title: 'Capture full conversations in a browsable archive',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 3,
    source: 'Memory and operating-system direction; Steve-approved gold-capture sprint.',
    summary: 'Store full assistant chats, meeting transcripts, and key operating conversations in a structured archive the team can browse by date, source, participant/topic proxies, fidelity class, and linked decisions/backlog IDs.',
    whyItMatters: 'If raw conversations disappear into chat tools or local logs, the system loses implementation history, auditability, lessons learned, and reusable business IP.',
    nextAction: closeCard
      ? `Done under ${MEMORY_003_CLOSEOUT_KEY}; proof: ${MEMORY_003_CLOSEOUT_PATH}, ${MEMORY_003_MANIFEST_PATH}, npm run process:memory-003-conversation-archive-check -- --write-report --close-card --json, foundation:verify. Continue ${MEMORY_003_NEXT_CARD_ID} to turn archived conversations into lessons/IP without rereading everything manually.`
      : 'Build the conversation archive model, generated manifest, fidelity classes, privacy boundaries, and first ingest paths.',
    statusNote: closeCard
      ? `Closed v1 under ${MEMORY_003_CLOSEOUT_KEY}: generated metadata-only conversation archive manifest, fidelity classes, ingest paths, and privacy boundary are in repo truth. Closeout: ${MEMORY_003_CLOSEOUT_PATH}.`
      : 'Executing v1: archive model first; no lessons/IP extraction before the archive exists.',
    owner: 'Foundation Memory',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `memory-003-${stableRunId(MEMORY_003_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: MEMORY_003_CARD_ID,
      closeoutKey: MEMORY_003_CLOSEOUT_KEY,
    },
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-db.js live backlog and Current Sprint helpers',
      'lib/approval-integrity.js approval validation',
      'lib/process-plan-critic.js plan scoring',
      'lib/process-write-guard.js explicit process-check write posture',
      'shared_communication_artifacts archive ledger',
    ],
    existingDocs: [
      'docs/source-notes/shared-communications.md archive rule',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-full-convo-steve-chat-reconstructed.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-harlan-transcript-promotion-review.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/MANIFEST.md',
    ],
    existingScripts: [
      'scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs',
      'scripts/process-data-002-check.mjs',
      'scripts/sync-meeting-notes-archive.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    existingPolicy: [
      'Private local memory stays private',
      'Chat Archive Discipline',
      'No reconstructed handoff may claim raw transcript fidelity',
      'Blockers block unsafe actions, not the whole sprint',
    ],
    reused: 'Reused tracked handoff/archive evidence, shared-communications archive ledger, approval integrity, Plan Critic, process write guard, backlog store, and Current Sprint overlay helpers.',
    notRebuilt: 'Did not rebuild shared-comms archive, meeting transcript sync, raw chat export tooling, summarization, retrieval, or lessons/IP extraction.',
    exactGap: 'Foundation had high-value conversation artifacts and backlog cards, but no generated browseable archive model with fidelity classes, privacy boundaries, and linked backlog/decision metadata.',
    overBroadRisk: 'This can drift into private chat scraping, external model upload, broad lessons extraction, or content production. V1 is metadata-only archive indexing and generated manifest proof.',
    readyBy: 'Steve approved continuing the gold-capture sprint after making sure discussed work was carded and not lost.',
    readyAt: '2026-05-19T19:55:00-04:00',
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
        MEMORY_003_CARD_ID,
        MEMORY_003_PLAN_PATH,
        planReview.status,
        planReview.score,
        MEMORY_003_CHANGED_FILES,
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

async function collectSharedCommunicationArchiveCounts() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT artifact_type, count(*)::int AS count
        FROM shared_communication_artifacts
        WHERE artifact_type IN ('meeting_note','meeting_transcript','email_thread','missive_thread','slack_thread','video_transcript')
        GROUP BY artifact_type
        ORDER BY artifact_type
      `,
    )
    return Object.fromEntries(result.rows.map(row => [row.artifact_type, Number(row.count || 0)]))
  } finally {
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint(planReview) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MEMORY_003_SCRIPT_PATH,
    operation: 'close MEMORY-003 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogItem(MEMORY_003_CARD_ID, buildCardRow({ closeCard: true }), ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const existingItems = activeSprint.items || []
  const items = existingItems.map((item, index) => {
    if (item.cardId === MEMORY_003_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: MEMORY_003_PLAN_PATH,
        definitionOfDone: 'Conversation archive model, generated manifest, fidelity classes, privacy boundaries, ingest paths, and linked backlog/decision browse metadata are live without reading private local memory.',
        proofCommands: MEMORY_003_PROOF_COMMANDS,
        nextAction: `Continue ${MEMORY_003_NEXT_CARD_ID}; archive exists before lessons/IP extraction.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...MEMORY_003_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: MEMORY_003_CLOSEOUT_KEY,
          approvalRef: MEMORY_003_APPROVAL_PATH,
          archiveManifest: MEMORY_003_MANIFEST_PATH,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === MEMORY_003_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: item.stage || 'scoping',
        nextAction: 'Use the conversation archive manifest as input to extract lessons learned and reusable IP under explicit privacy/redaction rules.',
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(activeSprint.sprint || {}),
        sprintId: activeSprint.sprint?.sprintId || MEMORY_003_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: MEMORY_003_NEXT_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: MEMORY_003_CARD_ID,
          nextAction: `Continue ${MEMORY_003_NEXT_CARD_ID}; conversation archive v1 is ready.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'MEMORY-003 closes the archive prerequisite and advances to lessons/IP extraction.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || null,
      reason: 'MEMORY-003 closes and advances the active blocker.',
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
    closeoutDoc,
    manifestDocBefore,
    readmeDocBefore,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(MEMORY_003_PLAN_PATH),
    readRepoFile('lib/memory-003-conversation-archive.js'),
    readRepoFile(MEMORY_003_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(MEMORY_003_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(MEMORY_003_MANIFEST_PATH, { optional: true }),
    readRepoFile(MEMORY_003_README_PATH, { optional: true }),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: MEMORY_003_APPROVAL_PATH,
    cardId: MEMORY_003_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: { id: MEMORY_003_CARD_ID, priority: 'P1' },
    changedFiles: MEMORY_003_CHANGED_FILES,
    declaredRisk: planText,
  })

  let snapshot = await buildConversationArchiveSnapshot({ repoRoot })
  if (args.writeReport) {
    await writeGeneratedArchiveFiles(snapshot)
    snapshot = await buildConversationArchiveSnapshot({ repoRoot })
  } else if (manifestDocBefore) {
    try {
      const existingManifest = JSON.parse(manifestDocBefore)
      if (existingManifest?.generatedAt) snapshot.generatedAt = existingManifest.generatedAt
    } catch {}
  }
  const expectedManifestJson = buildConversationArchiveManifestJson(snapshot)
  const expectedReadme = buildConversationArchiveManifestMarkdown(snapshot)
  const manifestDoc = args.writeReport ? expectedManifestJson : manifestDocBefore
  const readmeDoc = args.writeReport ? expectedReadme : readmeDocBefore
  const snapshotEval = evaluateConversationArchiveSnapshot(snapshot)
  const dogfood = buildConversationArchiveDogfoodProof()

  await initFoundationDb()
  if (args.closeCard) {
    await closeCardAndAdvanceSprint(planReview)
  }
  const activeSprint = await getActiveFoundationCurrentSprint()
  const backlogCards = await getBacklogItemsByIds([MEMORY_003_CARD_ID, MEMORY_003_NEXT_CARD_ID])
  const planCriticRuns = await getPlanCriticRunsByCardIds([MEMORY_003_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  await closeFoundationDb()
  const sharedArchiveCounts = await collectSharedCommunicationArchiveCounts()

  const card = backlogCards.find(item => item.id === MEMORY_003_CARD_ID) || null
  const nextCard = backlogCards.find(item => item.id === MEMORY_003_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === MEMORY_003_CARD_ID)
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === MEMORY_003_NEXT_CARD_ID)
  const closeout = closeouts.find(record => record.key === MEMORY_003_CLOSEOUT_KEY)
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === MEMORY_003_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', MEMORY_003_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for MEMORY-003', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['research', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === MEMORY_003_NEXT_CARD_ID, 'next live backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:memory-003-conversation-archive-check'] === `node --env-file-if-exists=.env ${MEMORY_003_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:memory-003-conversation-archive-check'] || 'missing')
  addCheck(checks, snapshotEval.ok, 'conversation archive snapshot is healthy', snapshotEval.failed.map(item => item.check).join('; ') || `${snapshot.summary.recordCount} records`)
  addCheck(checks, dogfood.ok, 'dogfood keeps transcript fidelity honest', dogfood.invariant)
  addCheck(checks, manifestDoc === expectedManifestJson, 'generated JSON manifest matches current archive snapshot', MEMORY_003_MANIFEST_PATH)
  addCheck(checks, readmeDoc === expectedReadme, 'generated browsable README matches current archive snapshot', MEMORY_003_README_PATH)
  addCheck(checks, snapshot.records.some(record => record.path.includes('full-convo') && record.fidelityClass === 'reconstructed_near_verbatim'), 'full-convo artifacts are labeled reconstructed unless native-export proof exists', 'full-convo -> reconstructed_near_verbatim')
  addCheck(checks, Number(sharedArchiveCounts.meeting_transcript || 0) > 0 || Number(sharedArchiveCounts.meeting_note || 0) > 0, 'existing meeting archive ingest path has local ledger evidence', JSON.stringify(sharedArchiveCounts))
  addCheck(checks, moduleSource.includes('PRIVATE_LOCAL_PATH_RE') && moduleSource.includes('MEMORY.md') && moduleSource.includes('USER.md'), 'module excludes private local memory paths', 'private local file guard present')
  addCheck(checks, moduleSource.includes('SECRET_RE') && scriptSource.includes('writeGeneratedArchiveFiles'), 'archive model scans for secret-like content and writes reports only with explicit flag', 'secret scan + write-report guard')
  addCheck(checks, closeout && closeout.backlogIds?.includes(MEMORY_003_CARD_ID), 'closeout registry includes MEMORY-003', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(MEMORY_003_CLOSEOUT_KEY) && closeoutDoc.includes('No private local memory'), 'closeout handoff exists and states privacy boundary', MEMORY_003_CLOSEOUT_PATH)
  addCheck(checks, activeSprint.sprint?.sprintId === MEMORY_003_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks MEMORY-003 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === MEMORY_003_NEXT_CARD_ID, 'close-card advances active blocker to MEMORY-004', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem, 'next sprint item remains visible after close', nextSprintItem?.cardId || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: MEMORY_003_CARD_ID,
    closeoutKey: MEMORY_003_CLOSEOUT_KEY,
    snapshotSummary: snapshot.summary,
    sharedArchiveCounts,
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
    console.log(`MEMORY-003 conversation archive check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
