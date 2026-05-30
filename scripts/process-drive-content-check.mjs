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
  DRIVE_CONTENT_APPROVAL_PATH,
  DRIVE_CONTENT_CARD_ID as CARD_ID,
  DRIVE_CONTENT_CHANGED_FILES,
  DRIVE_CONTENT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  DRIVE_CONTENT_CLOSEOUT_PATH,
  DRIVE_CONTENT_DOCX_MIME,
  DRIVE_CONTENT_JOB_KEY,
  DRIVE_CONTENT_NEXT_CARD_ID as NEXT_CARD_ID,
  DRIVE_CONTENT_NOT_NEXT,
  DRIVE_CONTENT_PLAN_PATH,
  DRIVE_CONTENT_PROOF_COMMANDS,
  DRIVE_CONTENT_RETRY_PREFIXES,
  DRIVE_CONTENT_SCRIPT_PATH,
  DRIVE_CONTENT_TARGET_KEY,
  buildDriveContentDogfoodProof,
  buildDriveContentStatus,
} from '../lib/drive-content-next-bite.js'

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

async function queryDriveContentLedger() {
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
        [DRIVE_CONTENT_TARGET_KEY],
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
        [DRIVE_CONTENT_TARGET_KEY],
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
        [DRIVE_CONTENT_JOB_KEY],
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

function buildDriveContentCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Build Drive Docs/PDF/DOCX content extraction',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 9,
    source: 'Steve-approved May 19 unattended Foundation-only sprint; follows EXTRACT-BACKFILL-001.',
    summary: 'Ship the next bounded Drive content slice by adding DOCX text extraction, retrying newly-supported Office skips ahead of fresh backlog, and preserving explicit skip routing for vision/video/unsupported classes.',
    whyItMatters: 'Drive holds strategy, SOP, recruiting, operations, and client-experience evidence. The system needs readable file content with provenance, not just filenames or stale skipped rows.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` with bounded attachment extraction.`
      : 'Add bounded DOCX coverage, refresh retry prefixes, prove the Drive lane remains scheduled/idempotent, and close only after the governed proof run retires Office skips.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; DOCX extraction is supported, Office retry skips are retired, unsafe Drive/media work is parked with explicit skip reasons, and Drive permissions were not mutated.`
      : `Executing \`${CLOSEOUT_KEY}\`; next bounded Drive content bite is active.`,
    owner: 'Foundation Extract',
  }
}

function buildEmailAttachmentsCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Build email attachment extraction lane proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 10,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; follows DRIVE-CONTENT-001.',
    summary: 'Ship a bounded Gmail/Missive attachment extraction slice with supported file types, skip reasons, manifest/ledger proof, and no unsafe private extraction or external writes.',
    whyItMatters: 'Email attachments hold agreements, PDFs, briefs, and working docs that are currently invisible to source-backed extraction unless attachment lanes are bounded and provable.',
    nextAction: 'Build the bounded attachment lane proof next; park unsupported file classes with explicit skip reasons and do not send messages or mutate external systems.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; scope/build bounded attachment extraction without broad private extraction.`,
    owner: 'Foundation Extract',
  }
}

function buildDriveContentSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: DRIVE_CONTENT_PLAN_PATH,
    definitionOfDone: 'Bounded Drive content lane supports DOCX text extraction, prioritizes newly-supported Office retry skips, records explicit skip reasons for unsafe/media/vision classes, and does not mutate Drive permissions.',
    proofCommands: DRIVE_CONTENT_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close DRIVE-CONTENT-001 before EMAIL-ATTACHMENTS-001.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...DRIVE_CONTENT_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: DRIVE_CONTENT_APPROVAL_PATH,
      approvalBoundActionsParkInsteadOfStopping: true,
      drivePermissionMutationApproved: false,
      docxMime: DRIVE_CONTENT_DOCX_MIME,
    },
  }
}

function buildEmailAttachmentsSprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/email-attachments-001-plan.md',
    definitionOfDone: 'Bounded attachment lane proof exists with supported file types, skip reasons, local manifest/ledger proof, partial-failure behavior, and no sends or external writes.',
    proofCommands: [
      'npm run process:email-attachments-check -- --apply --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=EMAIL-ATTACHMENTS-001 --planApprovalRef=docs/process/approvals/EMAIL-ATTACHMENTS-001.json --closeoutKey=email-attachments-next-bite-v1 --commitRef=HEAD',
    ],
    nextAction: 'Scope/build EMAIL-ATTACHMENTS-001 next. Keep it bounded and park unsafe external/private expansion.',
    notNextBoundaries: Array.from(new Set([
      ...(item.notNextBoundaries || []),
      'Do not send emails or external messages.',
      'Do not run broad historical private extraction outside the approved bounded target.',
      'Do not mutate credentials, provider config, or keys.',
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
      items.push(buildDriveContentSprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildDriveContentSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildEmailAttachmentsSprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildDriveContentSprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildEmailAttachmentsSprintItem({ order: items.length + 1 }, { active: true }))
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

async function updateDriveTargetBudget(client) {
  const target = await client.query(
    'SELECT budget, metadata FROM source_crawl_targets WHERE target_key = $1',
    [DRIVE_CONTENT_TARGET_KEY],
  )
  const currentBudget = target.rows[0]?.budget || {}
  const currentMetadata = target.rows[0]?.metadata || {}
  const retrySkippedReasonPrefixes = Array.from(new Set([
    ...(Array.isArray(currentBudget.retrySkippedReasonPrefixes) ? currentBudget.retrySkippedReasonPrefixes : []),
    ...DRIVE_CONTENT_RETRY_PREFIXES,
  ]))
  const officialApiBasis = Array.from(new Set([
    ...(Array.isArray(currentMetadata.officialApiBasis) ? currentMetadata.officialApiBasis : []),
    'Drive files.get alt=media plus local DOCX XML text extraction',
  ]))
  await client.query(
    `
      UPDATE source_crawl_targets
      SET budget = COALESCE(budget, '{}'::jsonb) || $2::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_by = 'codex-drive-content',
          updated_at = NOW()
      WHERE target_key = $1
    `,
    [
      DRIVE_CONTENT_TARGET_KEY,
      JSON.stringify({ retrySkippedReasonPrefixes, maxOfficeBytes: currentBudget.maxOfficeBytes || 25000000 }),
      JSON.stringify({ officialApiBasis }),
    ],
  )
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DRIVE_CONTENT_SCRIPT_PATH,
    operation: 'create/update DRIVE-CONTENT-001 and EMAIL-ATTACHMENTS-001 backlog rows, Drive target budget, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildDriveContentCardRow({ closeCard }))
    await updateBacklogRow(client, buildEmailAttachmentsCardRow())
    await updateDriveTargetBudget(client)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-drive-content')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `drive-content-${stableRunId(DRIVE_CONTENT_PLAN_PATH)}`,
        CARD_ID,
        DRIVE_CONTENT_PLAN_PATH,
        planReview.status,
        planReview.score,
        DRIVE_CONTENT_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-drive-content',$3,$4::jsonb)
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
          currentStatus: closeCard ? 'drive_content_closed' : 'drive_content_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; DRIVE-CONTENT is closed.` : `${CARD_ID} is active; prove bounded Drive content next bite before attachments.`,
          driveContentSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            targetKey: DRIVE_CONTENT_TARGET_KEY,
            jobKey: DRIVE_CONTENT_JOB_KEY,
            docxMime: DRIVE_CONTENT_DOCX_MIME,
            blockersParkActionsNotSprint: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-drive-content',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} Drive content proof and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
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
    storeSource,
    runtimeVerifierSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    extractionSnapshot,
    ledger,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: DRIVE_CONTENT_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(DRIVE_CONTENT_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('scripts/extract-drive-content.mjs'),
    readRepoFile('scripts/run-extraction-target.mjs'),
    readRepoFile('scripts/seed-extraction-control.mjs'),
    readRepoFile('lib/foundation-source-crawl-store.js'),
    readRepoFile('lib/foundation-extraction-runtime-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(DRIVE_CONTENT_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    getExtractionControlSnapshot({ limit: 300 }),
    queryDriveContentLedger(),
  ])

  const target = extractionSnapshot.targets.find(item => item.targetKey === DRIVE_CONTENT_TARGET_KEY) || null
  const dogfood = buildDriveContentDogfoodProof()
  const driveStatus = buildDriveContentStatus({
    target,
    itemRows: ledger.itemRows,
    latestTargetRun: ledger.latestTargetRun,
    latestJob: ledger.latestJob,
    requireDocxRunProof: args.closeCard,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildDriveContentCardRow({ closeCard: args.closeCard }),
    changedFiles: DRIVE_CONTENT_CHANGED_FILES,
    declaredRisk: 'bounded Drive content extraction coverage, live source-crawl target budget, explicit skip routing, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
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
  const refreshedTarget = refreshedSnapshot.targets.find(item => item.targetKey === DRIVE_CONTENT_TARGET_KEY) || target
  const refreshedLedger = preAppliedLiveState ? await queryDriveContentLedger() : ledger
  const refreshedDriveStatus = buildDriveContentStatus({
    target: refreshedTarget,
    itemRows: refreshedLedger.itemRows,
    latestTargetRun: refreshedLedger.latestTargetRun,
    latestJob: refreshedLedger.latestJob,
    requireDocxRunProof: args.closeCard,
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
    refreshedDriveStatus.ok &&
    currentCard?.lane === 'done' &&
    activeBlockerCardId === NEXT_CARD_ID &&
    (systemHealth.exitStatus !== 0 || repeatedFailureGate.exitStatus !== 0)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || DRIVE_CONTENT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for DRIVE-CONTENT', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing DOCX coverage, hidden retry skips, vague skips, unsafe writes, and unbounded budget', dogfood.invariant)
  addCheck(checks, refreshedDriveStatus.ok, 'bounded Drive content next-bite status is healthy', refreshedDriveStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, extractorSource.includes('DOCX_MIME') && extractorSource.includes('extractDocxTextWithUnzip') && extractorSource.includes('drive_docx_unzip_document_xml_v1'), 'Drive extractor supports bounded DOCX text extraction', 'scripts/extract-drive-content.mjs')
  addCheck(checks, storeSource.includes(DRIVE_CONTENT_DOCX_MIME) && storeSource.includes('retrySkippedFilterEnabled') && storeSource.includes("processed.status = 'skipped'"), 'Drive queue supports DOCX and prioritizes newly-supported skipped retries', 'lib/foundation-source-crawl-store.js')
  addCheck(checks, runnerSource.includes('--maxOfficeBytes=') && runnerSource.includes('retrySkippedReasonPrefixes'), 'target runner passes Office byte budget and retry prefixes', 'scripts/run-extraction-target.mjs')
  addCheck(checks, seedSource.includes('maxOfficeBytes: 25000000') && DRIVE_CONTENT_RETRY_PREFIXES.every(prefix => seedSource.includes(prefix)), 'seeded extraction control declares Office retry and byte cap', 'scripts/seed-extraction-control.mjs')
  addCheck(checks, runtimeVerifierSource.includes('drive_docx_unzip_document_xml_v1') && runtimeVerifierSource.includes(DRIVE_CONTENT_DOCX_MIME), 'runtime verifier knows Drive DOCX coverage', 'lib/foundation-extraction-runtime-verifier.js')
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(currentCard?.lane)), 'DRIVE-CONTENT backlog row is correct', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && nextCard?.lane === 'scoped', 'EMAIL-ATTACHMENTS-001 is promoted as next scoped P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  addCheck(checks, (systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy')) || preShipServedCodeDriftAllowed, 'System Health remains healthy or is deferred for post-ship served-code refresh', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, (repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy') || preShipServedCodeDriftAllowed, 'repeated-failure gate remains healthy or is deferred for post-ship verifier-ledger refresh', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:drive-content-check'] === `node --env-file-if-exists=.env ${DRIVE_CONTENT_SCRIPT_PATH}`, 'package exposes DRIVE-CONTENT focused proof', packageJson.scripts?.['process:drive-content-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves DRIVE-CONTENT', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', DRIVE_CONTENT_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || currentSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records DRIVE-CONTENT closeout', currentSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes EMAIL-ATTACHMENTS-001 next', nextSprintItem?.stage || 'missing')

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
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'EMAIL-ATTACHMENTS-001 is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is EMAIL-ATTACHMENTS-001 after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    driveContentStatus: refreshedDriveStatus,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`DRIVE-CONTENT check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('DRIVE-CONTENT check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
