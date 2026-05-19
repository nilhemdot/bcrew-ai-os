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
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  listSourceCrawlItems,
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
  MEETING_VIDEO_APPROVAL_PATH,
  MEETING_VIDEO_CARD_ID,
  MEETING_VIDEO_CHANGED_FILES,
  MEETING_VIDEO_CLOSEOUT_KEY,
  MEETING_VIDEO_CLOSEOUT_PATH,
  MEETING_VIDEO_NEXT_CARD_ID,
  MEETING_VIDEO_PLAN_PATH,
  MEETING_VIDEO_PROOF_COMMANDS,
  MEETING_VIDEO_SCRIPT_PATH,
  VIDEO_CONTENT_TARGET_KEY,
  VIDEO_INVENTORY_TARGET_KEY,
  buildMeetingVideoDogfoodProof,
  buildMeetingVideoPreflightStatus,
} from '../lib/meeting-video-proof.js'
import {
  WEB_GODMODE_CARD_ID,
  WEB_GODMODE_SPRINT_CARD_ORDER,
  WEB_GODMODE_SPRINT_ID,
} from '../lib/web-godmode-extractor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function cardIds() {
  return Array.from(new Set([
    MEETING_VIDEO_CARD_ID,
    MEETING_VIDEO_NEXT_CARD_ID,
    WEB_GODMODE_CARD_ID,
    'LOOM-001',
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

async function listMeetingRecordingArtifacts({ limit = 200 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, title, content_text,
               artifact_updated_at, updated_at, metadata
        FROM shared_communication_artifacts
        WHERE source_id = 'SRC-MEETINGS-001'
          AND artifact_type = 'meeting_note'
          AND (
            content_text ILIKE '%Meeting records%Recording%'
            OR title ILIKE '%Recording%'
          )
        ORDER BY artifact_updated_at DESC NULLS LAST, updated_at DESC
        LIMIT $1
      `,
      [Math.min(500, Math.max(1, Number(limit) || 200))],
    )
    return result.rows.map(row => ({
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      title: row.title,
      contentText: row.content_text,
      artifactUpdatedAt: row.artifact_updated_at,
      updatedAt: row.updated_at,
      metadata: row.metadata || {},
    }))
  } finally {
    await pool.end()
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/web-godmode-extractor.js',
      'lib/multimodal-extractor-contract.js',
      'scripts/extract-video-content.mjs',
      'scripts/inventory-video-links.mjs',
      'lib/foundation-source-crawl-store.js',
    ],
    existingDocs: [
      'docs/source-notes/video-link-inventory.md',
      'docs/source-notes/shared-communications.md',
      'docs/handoffs/2026-05-19-web-godmode-closeout.md',
      'docs/handoffs/2026-05-19-loom-extraction-preflight-closeout.md',
    ],
    existingSystems: [
      'shared_communication_artifacts meeting_note/meeting_transcript archive',
      'source_crawl_items video-link-inventory manifest',
      'video-content-extract-backfill YouTube subtitle transcript lane',
      'WEB-GODMODE-001 request boundary and multimodal envelope',
    ],
    reused: [
      'Existing meeting notes/transcripts are read locally.',
      'Existing video manifest rows are read locally.',
      'Existing YouTube transcript artifacts are treated as reusable evidence.',
      'Private Drive/Zoom/Loom/Skool media reads stay approval-bound.',
    ],
    notRebuilt: [
      'No Google Meet/Drive recording locator.',
      'No Zoom recording fetch.',
      'No Loom provider/browser run.',
      'No Skool browser session.',
      'No transcription/vision/OCR/model run over private meeting media.',
      'No atoms, KB, action routes, vectors, or downstream writes.',
    ],
    exactGap: 'Meeting notes can show recording labels and the video manifest has media links, but there is no approved live meeting media locator/reviewer yet.',
    overBroadRisk: 'This can become private meeting recording scraping if it launches Drive/Zoom/browser/provider work before a source-specific Steve-approved run packet.',
  }
}

function buildCardRow({ closeCard = false, preflight } = {}) {
  return {
    id: MEETING_VIDEO_CARD_ID,
    title: 'Review videos and recordings linked from meeting notes',
    scope: 'foundation',
    lane: closeCard ? 'scoped' : 'executing',
    priority: 'P0',
    rank: 7,
    source: 'Video link inventory source note + Steve 2026-05-19 GOD-mode extraction sprint.',
    summary: 'Preflight the meeting-linked video review lane by prioritizing local meeting notes with recording labels, local video-link inventory rows, existing YouTube transcript evidence, and platform-specific approval boundaries.',
    whyItMatters: 'Gemini notes and transcripts miss context that can live in recordings, demos, screenshares, Drive videos, Looms, Zoom recordings, and embedded videos. The system needs a governed queue before it can review that private media safely.',
    nextAction: closeCard
      ? `Blocked-preflight parked. Live meeting media locator/review requires a source-specific approval packet. Continue ${MEETING_VIDEO_NEXT_CARD_ID} now.`
      : 'Build meeting-video preflight, validate platform/access/rights routing, and park live private media review if approval is missing.',
    statusNote: closeCard
      ? `Blocked-preflight under \`${MEETING_VIDEO_CLOSEOUT_KEY}\`; not marked done. Local proof found ${preflight?.queue?.meetingRecordingArtifactCount || 0} meeting-note recording labels and ${preflight?.queue?.meetingLinkedVideoLinkCount || 0} meeting-linked/prioritized video links; live Drive/Zoom/Loom/private media review remains approval-bound.`
      : `Executing \`${MEETING_VIDEO_CLOSEOUT_KEY}\`; live meeting media reads must remain blocked unless an approved source-specific packet exists.`,
    owner: 'Foundation Extraction',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `meeting-video-preflight-${stableRunId(MEETING_VIDEO_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: MEETING_VIDEO_CARD_ID,
      closeoutKey: MEETING_VIDEO_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, preflight } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, preflight })
  const planRun = buildPlanCriticRun(planReview)
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
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-meeting-video-preflight')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        MEETING_VIDEO_CARD_ID,
        MEETING_VIDEO_PLAN_PATH,
        planReview.status,
        planReview.score,
        MEETING_VIDEO_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
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

function mergeSprintItems(previous = {}, { closeCard = false } = {}) {
  const existingById = new Map((previous.items || []).map(item => [item.cardId, item]))
  return WEB_GODMODE_SPRINT_CARD_ORDER.map((cardId, index) => {
    const existing = existingById.get(cardId) || {}
    if (cardId === MEETING_VIDEO_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'returned',
        returnedReason: 'Live meeting media locator/review is approval-bound. Preflight proof and run packet are parked under meeting-video-preflight-v1; continue safe sprint work.',
        closeoutKey: MEETING_VIDEO_CLOSEOUT_KEY,
        proofCommands: MEETING_VIDEO_PROOF_COMMANDS,
        nextAction: `Await Steve approval for exact meeting media run packet; continue ${MEETING_VIDEO_NEXT_CARD_ID} now.`,
        definitionOfDone: existing.definitionOfDone || 'Meeting video live review is parked unless Steve approves exact source/use/storage/provider boundaries.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No private Drive/Meet/Zoom/Loom media read, provider call, authorized browser session, transcript/media download, screenshot/keyframe storage, credential mutation, Drive permission mutation, external send, or public exposure.',
          'MEETING-VAULT-ACL-001 Phase B and Drive permissions remain out of scope.',
        ],
      }
    }
    if (cardId === MEETING_VIDEO_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Continue safe Skool access-path proof work; park live private/provider operations if approval-bound.',
      }
    }
    return {
      ...existing,
      cardId,
      order: index + 1,
    }
  })
}

async function ensureLiveState({ closeCard = false, planReview, preflight } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MEETING_VIDEO_SCRIPT_PATH,
    operation: 'upsert meeting-video preflight card, Plan Critic row, and Current Sprint parked state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, preflight })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: WEB_GODMODE_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? MEETING_VIDEO_NEXT_CARD_ID : MEETING_VIDEO_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'meeting_video_preflight_parked_next_skool' : 'meeting_video_preflight_active',
          lastClosedCardId: closeCard ? MEETING_VIDEO_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `MEETING-VIDEO-001 live media review is parked approval-bound. Continue ${MEETING_VIDEO_NEXT_CARD_ID}.`
            : 'Finish meeting-video preflight or park approval-bound live operation.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-meeting-video-preflight',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || WEB_GODMODE_SPRINT_ID,
      reason: 'Steve operating rule: blockers block unsafe actions, not the whole sprint.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()
  const [
    planSource,
    approval,
    cards,
    packageJson,
    sourceNote,
    sharedCommsNote,
    webGodmodeSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(MEETING_VIDEO_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: MEETING_VIDEO_APPROVAL_PATH, cardId: MEETING_VIDEO_CARD_ID }),
    getBacklogItemsByIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile('docs/source-notes/video-link-inventory.md'),
    readRepoFile('docs/source-notes/shared-communications.md'),
    readRepoFile('lib/web-godmode-extractor.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(MEETING_VIDEO_CLOSEOUT_PATH, { optional: true }),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: MEETING_VIDEO_CHANGED_FILES,
    declaredRisk: 'private meeting recording/media approval boundary and blocked-preflight sprint progression',
    repoRoot,
  })
  const [videoItems, extractionItems, meetingArtifacts] = await Promise.all([
    listSourceCrawlItems({ targetKey: VIDEO_INVENTORY_TARGET_KEY, status: 'succeeded', limit: 200, order: 'desc' }),
    listSourceCrawlItems({ targetKey: VIDEO_CONTENT_TARGET_KEY, limit: 200, order: 'desc' }),
    listMeetingRecordingArtifacts({ limit: 200 }),
  ])
  const preflight = buildMeetingVideoPreflightStatus({ videoItems, extractionItems, meetingArtifacts })
  const dogfood = buildMeetingVideoDogfoodProof()
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview, preflight })
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const planCriticRuns = await getPlanCriticRunsByCardIds([...cardIds(), ...sprintCardIds])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const card = (await getBacklogItemsByIds([MEETING_VIDEO_CARD_ID])).find(item => item.id === MEETING_VIDEO_CARD_ID) || cards.find(item => item.id === MEETING_VIDEO_CARD_ID) || null
  const webCard = cards.find(item => item.id === WEB_GODMODE_CARD_ID) || null
  const loomCard = cards.find(item => item.id === 'LOOM-001') || null
  const nextCard = cards.find(item => item.id === MEETING_VIDEO_NEXT_CARD_ID) || null
  const meetingItem = (activeSprint.items || []).find(item => item.cardId === MEETING_VIDEO_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === MEETING_VIDEO_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === MEETING_VIDEO_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || MEETING_VIDEO_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for meeting-video preflight', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === MEETING_VIDEO_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, webCard?.lane === 'done', 'WEB-GODMODE prerequisite is done', webCard ? `${webCard.id}:${webCard.lane}` : 'missing')
  addCheck(checks, loomCard && ['scoped', 'returned', 'research', 'done'].includes(loomCard.lane), 'LOOM predecessor is parked or closed, not blocking all work', loomCard ? `${loomCard.id}:${loomCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'scoped' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live meeting-video card exists and stays not-done for blocked preflight', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Skool card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, preflight.ok && preflight.status === 'blocked_pending_approval', 'meeting-video preflight parks live media review behind approval', preflight.status)
  addCheck(checks, preflight.queue.videoLinkCount >= 50, 'local video manifest is populated', String(preflight.queue.videoLinkCount))
  addCheck(checks, preflight.queue.meetingRecordingArtifactCount >= 5, 'local meeting notes include recording labels', String(preflight.queue.meetingRecordingArtifactCount))
  addCheck(checks, preflight.queue.decisions.length >= 5 && preflight.queue.blockedActions.length >= 3, 'platform decision matrix has blocking actions', `${preflight.queue.decisions.length}/${preflight.queue.blockedActions.length}`)
  addCheck(checks, ['google_drive', 'zoom', 'loom', 'skool'].every(platform => preflight.queue.decisions.some(row => row.platform === platform)), 'decision matrix covers private video platforms', preflight.queue.decisions.map(row => row.platform).join(', '))
  addCheck(checks, preflight.approvalPacket.canRunNow === false && preflight.approvalPacket.status === 'approval_required', 'run packet refuses live meeting media run without approval', preflight.approvalPacket.status)
  addCheck(checks, preflight.blockedObservationSummary.ok === false && preflight.blockedObservationSummary.failureCodes.includes('browser_session_preflight_required'), 'WEB-GODMODE blocks private meeting observation without preflight', preflight.blockedObservationSummary.failureCodes.join(', '))
  addCheck(checks, preflight.approvedObservationSummary.ok === true && preflight.approvedObservationSummary.liveBrowserLaunched === false && preflight.approvedObservationSummary.networkFetched === false, 'synthetic approved meeting observation stays no-network', JSON.stringify(preflight.approvedObservationSummary))
  addCheck(checks, preflight.multimodal.ok === true, 'meeting-video multimodal envelope validates in synthetic approval mode', preflight.multimodal.findings.join(', ') || 'healthy')
  addCheck(checks, dogfood.ok === true, 'dogfood proves meeting-linked prioritization, transcript reuse, and private blocking', dogfood.checks.map(item => `${item.check}:${item.ok}`).join('; '))
  addCheck(checks, Object.values(preflight.sideEffects).every(value => value === false), 'preflight starts no live side effects', JSON.stringify(preflight.sideEffects))
  addCheck(checks, sourceNote.includes('Zoom recordings -> router-ledged transcription/vision') && sourceNote.includes('Drive video files -> Drive media extractor'), 'video source note preserves meeting-video follow-up boundary', 'docs/source-notes/video-link-inventory.md')
  addCheck(checks, sharedCommsNote.includes('meeting-note current-day sync') || sharedCommsNote.includes('SRC-MEETINGS-001'), 'shared communications note keeps meeting source boundary visible', 'docs/source-notes/shared-communications.md')
  addCheck(checks, webGodmodeSource.includes('authorized private source without preflight blocks'), 'WEB-GODMODE dogfoods private source preflight blocking', 'lib/web-godmode-extractor.js')
  addCheck(checks, packageJson.scripts?.['process:meeting-video-check'] === `node --env-file-if-exists=.env ${MEETING_VIDEO_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:meeting-video-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(MEETING_VIDEO_CLOSEOUT_KEY) && closeoutRegistrySource.includes('blocked-preflight') && closeoutRegistrySource.includes(MEETING_VIDEO_CARD_ID), 'closeout registry source includes blocked-preflight record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'blocked-preflight' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(MEETING_VIDEO_CARD_ID), 'build closeout lookup resolves blocked-preflight record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(MEETING_VIDEO_CLOSEOUT_PATH), 'closeout handoff exists', MEETING_VIDEO_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('not marked done') && closeoutDoc.includes(MEETING_VIDEO_NEXT_CARD_ID), 'closeout states not marked done and next card', MEETING_VIDEO_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === MEETING_VIDEO_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, meetingItem?.stage === 'returned' && Boolean(meetingItem.returnedReason), 'Current Sprint parks meeting-video as returned with reason', meetingItem ? `${meetingItem.stage}:${meetingItem.returnedReason || 'missing reason'}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after parking meeting-video preflight', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: MEETING_VIDEO_CARD_ID,
    closeoutKey: MEETING_VIDEO_CLOSEOUT_KEY,
    nextCardId: MEETING_VIDEO_NEXT_CARD_ID,
    preflight,
    dogfood,
    existingWork: buildExistingWorkCheck(),
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Meeting-video preflight check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Meeting-video preflight check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
