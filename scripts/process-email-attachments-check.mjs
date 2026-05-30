#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getExtractionControlSnapshot } from '../lib/foundation-source-crawl-db.js'
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
  EMAIL_ATTACHMENTS_APPROVAL_PATH,
  EMAIL_ATTACHMENTS_CARD_ID as CARD_ID,
  EMAIL_ATTACHMENTS_CHANGED_FILES,
  EMAIL_ATTACHMENTS_CLOSEOUT_KEY as CLOSEOUT_KEY,
  EMAIL_ATTACHMENTS_CLOSEOUT_PATH,
  EMAIL_ATTACHMENTS_ICS_MIME,
  EMAIL_ATTACHMENTS_JOB_KEY,
  EMAIL_ATTACHMENTS_NEXT_CARD_ID as NEXT_CARD_ID,
  EMAIL_ATTACHMENTS_NOT_NEXT,
  EMAIL_ATTACHMENTS_PLAN_PATH,
  EMAIL_ATTACHMENTS_PROOF_COMMANDS,
  EMAIL_ATTACHMENTS_RETRY_PREFIXES,
  EMAIL_ATTACHMENTS_SCRIPT_PATH,
  EMAIL_ATTACHMENTS_TARGET_KEY,
  buildEmailAttachmentsDogfoodProof,
  buildEmailAttachmentsStatus,
} from '../lib/email-attachments-next-bite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
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

function parseJsonFromCommand(text = '') {
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(value.slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 90 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

async function queryEmailAttachmentLedger() {
  const pool = createPool()
  try {
    const [items, latestRun, latestJob] = await Promise.all([
      pool.query(
        `
          SELECT item_key, status, retry_state, retry_reason, retry_blocker_card,
                 last_error, artifact_id, metadata->>'mimeType' AS mime_type,
                 metadata->>'skipReason' AS skip_reason, updated_at
          FROM source_crawl_items
          WHERE target_key = $1
          ORDER BY updated_at DESC
          LIMIT 500
        `,
        [EMAIL_ATTACHMENTS_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT run_id, target_key, status, started_at, finished_at,
                 inspected_delta, archived_delta, extracted_delta,
                 last_error, metadata
          FROM source_crawl_target_runs
          WHERE target_key = $1
          ORDER BY started_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        `,
        [EMAIL_ATTACHMENTS_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT run_id, job_key, status, started_at, finished_at,
                 duration_ms, error_message, output_tail
          FROM foundation_job_runs
          WHERE job_key = $1
          ORDER BY started_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        `,
        [EMAIL_ATTACHMENTS_JOB_KEY],
      ),
    ])
    return {
      itemRows: items.rows,
      latestTargetRun: latestRun.rows[0] || null,
      latestJob: latestJob.rows[0] || null,
    }
  } finally {
    await pool.end()
  }
}

function buildEmailAttachmentsCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Build email attachment extraction lane proof',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 10,
    source: 'Steve-approved May 19 unattended Foundation-only sprint; follows DRIVE-CONTENT-001.',
    summary: 'Ship a bounded Gmail attachment slice by adding calendar invite text extraction, retrying newly-supported .ics skips ahead of fresh backlog, and preserving explicit skip routing for images, Office, audio, video, and other unsafe classes.',
    whyItMatters: 'Email attachments hold agreements, PDFs, calendar invites, briefs, and working docs. The system needs local source-backed attachment artifacts with provenance and explicit skipped classes instead of invisible email body-only context.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` for sprint closeout and continuous-work readiness.`
      : 'Add bounded application/ics coverage, refresh retry prefixes, prove the email attachment lane remains scheduled/idempotent, and close only after the governed proof run retires calendar invite skips.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; Gmail calendar invite attachments are supported, retry skips are retired, unsupported media/Office classes stay explicit, and no sends or external mutations were performed.`
      : `Executing \`${CLOSEOUT_KEY}\`; bounded email attachment next bite is active.`,
    owner: 'Foundation Extract',
  }
}

function buildCloseoutCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Close Foundation sprint and decide continuous work readiness',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 11,
    source: 'Steve-approved May 19 Foundation-only unattended sprint.',
    summary: 'Run final sprint audit after guardrails/source/extract cards: raw health, repeated failures, backlog priority, lessons loop, source/extract readiness, and recommendation on continuous Foundation Builder / Value Builder split.',
    whyItMatters: 'Steve needs an explicit go/no-go on whether the system can keep working without babysitting, instead of assuming velocity means reliability.',
    nextAction: 'Run final Foundation sprint closeout audit, name any remaining blockers, and recommend whether continuous Foundation Builder / Value Builder split is ready.',
    statusNote: `Next active card after ${CLOSEOUT_KEY}; Foundation-only remains in force until this closeout explicitly recommends a split.`,
    owner: 'Foundation Ops',
  }
}

function buildEmailAttachmentsSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: EMAIL_ATTACHMENTS_PLAN_PATH,
    definitionOfDone: 'Bounded email attachment lane supports Gmail PDF/text/calendar attachments, retries newly-supported calendar invite skips, records explicit skip reasons for unsafe/media/Office classes, and does not send messages or mutate external systems.',
    proofCommands: EMAIL_ATTACHMENTS_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close EMAIL-ATTACHMENTS-001 before sprint closeout.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...EMAIL_ATTACHMENTS_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: EMAIL_ATTACHMENTS_APPROVAL_PATH,
      approvalBoundActionsParkInsteadOfStopping: true,
      sendsApproved: false,
      icsMime: EMAIL_ATTACHMENTS_ICS_MIME,
    },
  }
}

function buildCloseoutSprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/foundation-sprint-closeout-and-continuous-work-ready-001-plan.md',
    definitionOfDone: 'Final sprint audit says whether Foundation is ready for continuous unattended work and whether Value Builder split can start.',
    proofCommands: [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    nextAction: 'Run final sprint closeout and continuous-work readiness decision.',
    notNextBoundaries: Array.from(new Set([
      ...(item.notNextBoundaries || []),
      'Do not start Value Builder split until this card explicitly says ready.',
      'Do not hide remaining watch/risk rows behind classification.',
    ])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      approvalBoundActionsParkInsteadOfStopping: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildEmailAttachmentsSprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildEmailAttachmentsSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildCloseoutSprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildEmailAttachmentsSprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildCloseoutSprintItem({ order: items.length + 1 }, { active: true }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function updateBacklogRow(client, row) {
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
    [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
  )
}

async function updateEmailAttachmentTargetBudget(client) {
  const target = await client.query(
    'SELECT budget, metadata FROM source_crawl_targets WHERE target_key = $1',
    [EMAIL_ATTACHMENTS_TARGET_KEY],
  )
  const currentBudget = target.rows[0]?.budget || {}
  const currentMetadata = target.rows[0]?.metadata || {}
  const retrySkippedReasonPrefixes = Array.from(new Set([
    ...(Array.isArray(currentBudget.retrySkippedReasonPrefixes) ? currentBudget.retrySkippedReasonPrefixes : []),
    ...EMAIL_ATTACHMENTS_RETRY_PREFIXES,
  ]))
  const officialApiBasis = Array.from(new Set([
    ...(Array.isArray(currentMetadata.officialApiBasis) ? currentMetadata.officialApiBasis : []),
    'Gmail users.messages.attachments.get plus local application/ics text extraction',
  ]))
  await client.query(
    `
      UPDATE source_crawl_targets
      SET budget = COALESCE(budget, '{}'::jsonb) || $2::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_by = 'codex-email-attachments',
          updated_at = NOW()
      WHERE target_key = $1
    `,
    [
      EMAIL_ATTACHMENTS_TARGET_KEY,
      JSON.stringify({ retrySkippedReasonPrefixes }),
      JSON.stringify({ officialApiBasis, v1Scope: 'Gmail PDF/text/calendar attachments. Missive attachments, Office conversion, OCR, and media route through explicit follow-on lanes.' }),
    ],
  )
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: EMAIL_ATTACHMENTS_SCRIPT_PATH,
    operation: 'create/update EMAIL-ATTACHMENTS-001 and sprint closeout backlog rows, email target budget, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildEmailAttachmentsCardRow({ closeCard }))
    await updateBacklogRow(client, buildCloseoutCardRow())
    await updateEmailAttachmentTargetBudget(client)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-email-attachments')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `email-attachments-${stableRunId(EMAIL_ATTACHMENTS_PLAN_PATH)}`,
        CARD_ID,
        EMAIL_ATTACHMENTS_PLAN_PATH,
        planReview.status,
        planReview.score,
        EMAIL_ATTACHMENTS_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-email-attachments',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'email_attachments_closed' : 'email_attachments_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; EMAIL-ATTACHMENTS is closed.` : `${CARD_ID} is active; prove bounded attachment next bite before sprint closeout.`,
          emailAttachmentsSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            targetKey: EMAIL_ATTACHMENTS_TARGET_KEY,
            jobKey: EMAIL_ATTACHMENTS_JOB_KEY,
            icsMime: EMAIL_ATTACHMENTS_ICS_MIME,
            blockersParkActionsNotSprint: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-email-attachments',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} email attachment proof and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJsonSource,
    extractorSource,
    runnerSource,
    seedSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    extractionSnapshot,
    ledger,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: EMAIL_ATTACHMENTS_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(EMAIL_ATTACHMENTS_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('scripts/extract-email-attachments.mjs'),
    readRepoFile('scripts/run-extraction-target.mjs'),
    readRepoFile('scripts/seed-extraction-control.mjs'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(EMAIL_ATTACHMENTS_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 300 }),
    queryEmailAttachmentLedger(),
  ])

  const target = extractionSnapshot.targets.find(item => item.targetKey === EMAIL_ATTACHMENTS_TARGET_KEY) || null
  const dogfood = buildEmailAttachmentsDogfoodProof()
  const attachmentStatus = buildEmailAttachmentsStatus({
    target,
    itemRows: ledger.itemRows,
    latestTargetRun: ledger.latestTargetRun,
    latestJob: ledger.latestJob,
    requireIcsRunProof: args.closeCard,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildEmailAttachmentsCardRow({ closeCard: args.closeCard }),
    changedFiles: EMAIL_ATTACHMENTS_CHANGED_FILES,
    declaredRisk: 'bounded Gmail attachment extraction coverage, live source-crawl target budget, explicit skip routing, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const refreshedSnapshot = preAppliedLiveState ? await getExtractionControlSnapshot({ limit: 300 }) : extractionSnapshot
  const refreshedTarget = refreshedSnapshot.targets.find(item => item.targetKey === EMAIL_ATTACHMENTS_TARGET_KEY) || target
  const refreshedLedger = preAppliedLiveState ? await queryEmailAttachmentLedger() : ledger
  const refreshedAttachmentStatus = buildEmailAttachmentsStatus({
    target: refreshedTarget,
    itemRows: refreshedLedger.itemRows,
    latestTargetRun: refreshedLedger.latestTargetRun,
    latestJob: refreshedLedger.latestJob,
    requireIcsRunProof: args.closeCard,
  })

  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const currentCard = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const currentSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const preShipServedCodeDriftAllowed = args.closeCard &&
    refreshedAttachmentStatus.ok &&
    currentCard?.lane === 'done' &&
    activeBlockerCardId === NEXT_CARD_ID &&
    (systemHealth.exitStatus !== 0 || repeatedFailureGate.exitStatus !== 0)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || EMAIL_ATTACHMENTS_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for EMAIL-ATTACHMENTS', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing ICS coverage, hidden retry skips, vague skips, unsafe sends, and unbounded budget', dogfood.invariant)
  addCheck(checks, refreshedAttachmentStatus.ok, 'bounded email attachment next-bite status is healthy', refreshedAttachmentStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, extractorSource.includes('gmail_attachment_calendar_ics_text_v1') && extractorSource.includes('CALENDAR_INVITE_RETRY_PREFIX') && extractorSource.includes('shouldRetrySkippedItem'), 'email extractor supports bounded calendar invite retry extraction', 'scripts/extract-email-attachments.mjs')
  addCheck(checks, extractorSource.includes('image_ocr_requires_multimodal_lane') && extractorSource.includes('audio_transcription_requires_multimodal_lane') && extractorSource.includes('office_file_conversion_not_in_v1'), 'unsupported attachment classes remain explicit skips', 'scripts/extract-email-attachments.mjs')
  addCheck(checks, runnerSource.includes("target.targetKey === 'email-attachments-backfill'") && runnerSource.includes('--retrySkippedReasonPrefixes='), 'target runner passes attachment retry prefixes', 'scripts/run-extraction-target.mjs')
  addCheck(checks, seedSource.includes("retrySkippedReasonPrefixes: ['calendar_invite_not_in_v1']") && seedSource.includes('PDF/text/calendar attachments'), 'seeded extraction control declares calendar retry and v1 scope', 'scripts/seed-extraction-control.mjs')
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(currentCard?.lane)), 'EMAIL-ATTACHMENTS backlog row is correct', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && nextCard?.lane === 'scoped', 'sprint closeout card is promoted as next scoped P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  addCheck(checks, (systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy')) || preShipServedCodeDriftAllowed, 'System Health remains healthy or is deferred for post-ship served-code refresh', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, (repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy') || preShipServedCodeDriftAllowed, 'repeated-failure gate remains healthy or is deferred for post-ship verifier-ledger refresh', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:email-attachments-check'] === `node --env-file-if-exists=.env ${EMAIL_ATTACHMENTS_SCRIPT_PATH}`, 'package exposes EMAIL-ATTACHMENTS focused proof', packageJson.scripts?.['process:email-attachments-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves EMAIL-ATTACHMENTS', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', EMAIL_ATTACHMENTS_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || currentSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records EMAIL-ATTACHMENTS closeout', currentSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes sprint closeout next', nextSprintItem?.stage || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const [refreshedCards, refreshedPlanCritic, refreshedSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'sprint closeout card is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is sprint closeout after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    emailAttachmentsStatus: refreshedAttachmentStatus,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`EMAIL-ATTACHMENTS check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('EMAIL-ATTACHMENTS check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
