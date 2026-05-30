#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
  MARK_KASHEF_BASELINE_SOURCE_ID,
  MARK_KASHEF_BASELINE_TARGET_KEY,
  MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
} from '../lib/god-mode-youtube-end-to-end-extractor.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'MARK-KASHEF-LAST-50-API-EVIDENCE-GAP-001'
const NEXT_CARD_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001'
const LEGACY_WORKSPACE_REPORT_ID = 'batch:mark-kashef-last-50:20260523221531'
const PLAN_PATH = 'docs/process/mark-kashef-last-50-api-evidence-gap-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/MARK-KASHEF-LAST-50-API-EVIDENCE-GAP-001.json'
const SCRIPT_PATH = 'scripts/process-mark-kashef-last-50-api-evidence-gap-check.mjs'
const CLOSEOUT_KEY = 'mark-kashef-last-50-api-evidence-gap-v1'
const ACTOR = 'mark-kashef-last-50-api-evidence-gap'

const API_REPORT_IDS = [
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
]

const NOT_NEXT = [
  'Do not mark MARK-KASHEF-LAST-50-BASELINE-001 done while any current Mark pool video lacks accepted Gemini API full-watch evidence.',
  'Do not count Gemini Workspace/subscription browser-eyes output as accepted full YouTube video/audio/visual API evidence.',
  'Do not run live Gemini, browser automation, Skool, MyICOR, comments, private/auth/community/course sources, purchases, downloads, forms, or external writes from this proof.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not auto-create backlog cards from Mark recommendations.',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
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

async function readRepoJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function normalizeVideoIdFromRow(row = {}) {
  return text(row.external_id || row.video_id || row.metadata?.videoId)
}

function sortedUnique(values = []) {
  return Array.from(new Set(list(values).map(text).filter(Boolean))).sort()
}

async function loadMarkEvidenceSnapshot() {
  const pool = createPool()
  try {
    const [
      markPool,
      apiReportRows,
      legacyReportRows,
      apiAtomRows,
      apiHitRows,
      workspaceAtomRows,
      directorRows,
    ] = await Promise.all([
      pool.query(
        `
          SELECT external_id, metadata
          FROM source_crawl_items
          WHERE target_key = $1
            AND source_id = $2
            AND metadata->>'creatorId' = 'mark-kashef'
          ORDER BY COALESCE((metadata->>'rank')::int, 9999), external_id ASC
          LIMIT 50
        `,
        [MARK_KASHEF_BASELINE_TARGET_KEY, MARK_KASHEF_BASELINE_SOURCE_ID],
      ),
      pool.query(
        `
          SELECT report_artifact_id, metadata, structured_output_json, updated_at
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = ANY($1::text[])
        `,
        [API_REPORT_IDS],
      ),
      pool.query(
        `
          SELECT report_artifact_id, metadata, structured_output_json, updated_at
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
        `,
        [LEGACY_WORKSPACE_REPORT_ID],
      ),
      pool.query(
        `
          SELECT DISTINCT metadata->>'sourceVideoId' AS video_id
          FROM intelligence_atoms
          WHERE report_artifact_id = ANY($1::text[])
            AND metadata->>'sourceVideoId' IS NOT NULL
        `,
        [API_REPORT_IDS],
      ),
      pool.query(
        `
          SELECT DISTINCT metadata->>'sourceVideoId' AS video_id
          FROM intelligence_atom_hits
          WHERE report_artifact_id = ANY($1::text[])
            AND metadata->>'sourceVideoId' IS NOT NULL
        `,
        [API_REPORT_IDS],
      ),
      pool.query(
        `
          SELECT DISTINCT COALESCE(metadata->>'sourceVideoId', metadata->>'videoId') AS video_id
          FROM intelligence_atoms
          WHERE report_artifact_id = $1
            AND COALESCE(metadata->>'sourceVideoId', metadata->>'videoId') IS NOT NULL
        `,
        [LEGACY_WORKSPACE_REPORT_ID],
      ),
      pool.query(
        `
          SELECT report_artifact_id, updated_at, structured_output_json, cardinality(input_atom_ids) AS input_atom_count
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = 'director:dev-team-intelligence-director-001:aios-mission-v0'
          LIMIT 1
        `,
      ),
    ])

    const markRows = markPool.rows.map(row => ({
      videoId: normalizeVideoIdFromRow(row),
      title: text(row.metadata?.title),
      rank: Number(row.metadata?.rank || 9999),
      publicNoAuth: row.metadata?.publicNoAuth !== false,
      privateOrPaidAccess: row.metadata?.privateOrPaidAccess === true,
    })).filter(row => row.videoId)
    const markVideoIds = sortedUnique(markRows.map(row => row.videoId))
    const apiAtomVideoIds = sortedUnique(apiAtomRows.rows.map(row => row.video_id))
    const apiHitVideoIds = sortedUnique(apiHitRows.rows.map(row => row.video_id))
    const workspaceVideoIds = sortedUnique(workspaceAtomRows.rows.map(row => row.video_id))
    const apiCoveredVideoIds = markVideoIds.filter(videoId =>
      apiAtomVideoIds.includes(videoId) && apiHitVideoIds.includes(videoId),
    )
    const missingApiVideoIds = markVideoIds.filter(videoId => !apiCoveredVideoIds.includes(videoId))
    const legacyWorkspaceOnlyVideoIds = missingApiVideoIds.filter(videoId => workspaceVideoIds.includes(videoId))
    const reportsById = new Map(apiReportRows.rows.map(row => [row.report_artifact_id, row]))
    const legacyReport = legacyReportRows.rows[0] || null
    const directorReport = directorRows.rows[0] || null

    return {
      markRows,
      markVideoIds,
      apiAtomVideoIds,
      apiHitVideoIds,
      apiCoveredVideoIds,
      missingApiVideoIds,
      legacyWorkspaceOnlyVideoIds,
      acceptedApiReports: API_REPORT_IDS.map(reportId => reportsById.get(reportId) || null),
      legacyWorkspaceReport: legacyReport,
      directorReport,
    }
  } finally {
    await pool.end()
  }
}

function reportUsesApiFullWatch(row = null) {
  if (!row) return false
  const metadataRoute = text(row.metadata?.fullWatchRoute)
  const structuredRoute = text(row.structured_output_json?.snapshot?.route?.fullVideoWatchRoute)
  return metadataRoute === 'gemini_api_youtube_url_video_understanding' ||
    structuredRoute === 'gemini_api_youtube_url_video_understanding'
}

function reportNoExternalWrites(row = null) {
  if (!row) return false
  const metadataExternal = row.metadata?.externalWrites
  const structuredExternal = row.structured_output_json?.externalWrites
  const legacyExternal = row.structured_output_json?.noExternalWrites
  return metadataExternal === false || structuredExternal === false || legacyExternal === true
}

function buildRepairCard() {
  return {
    id: CARD_ID,
    title: 'Block false Mark last-50 API closeout',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 9,
    source: 'Live Mark evidence audit after attempted closeout review',
    summary: 'Add a fail-closed no-spend proof that distinguishes accepted Gemini API full-watch evidence from older Gemini Workspace/subscription browser-eyes output before Mark last-50 can close.',
    whyItMatters: 'The system was about to treat Mark as 50/50 API complete even though six videos only had older non-API evidence. False green extraction proof would put weak source truth into Director and Scoper decisions.',
    nextAction: `Closed under ${CLOSEOUT_KEY}. Keep ${MARK_KASHEF_LAST_50_BASELINE_CARD_ID} parked until the six exact gap videos are rewatched through Gemini API under Steve-approved live budget or explicitly split.`,
    statusNote: 'Done. The no-spend proof measures the current Mark pool, accepted API report atom/hit coverage, and the older workspace-only batch separately. Current result: 44/50 accepted API-covered Mark videos; 6 workspace-only videos are blocked from false closeout.',
    owner: 'Foundation Builder',
  }
}

async function upsertRepairBacklogCard() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `upsert and close ${CARD_ID}`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const card = buildRepairCard()
  const pool = createPool()
  try {
    const beforeResult = await pool.query('SELECT * FROM backlog_items WHERE id = $1', [CARD_ID])
    await pool.query(
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
      [
        card.id,
        card.title,
        card.team,
        card.lane,
        card.priority,
        card.rank,
        card.source,
        card.summary,
        card.whyItMatters,
        card.nextAction,
        card.statusNote,
        card.owner,
      ],
    )
    await pool.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb)
      `,
      [
        beforeResult.rows.length ? 'backlog_status_changed' : 'backlog_created',
        'backlog_items',
        CARD_ID,
        ACTOR,
        `${beforeResult.rows.length ? 'Updated' : 'Created'} backlog item ${CARD_ID}: ${card.title}`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, lane: card.lane, priority: card.priority }),
      ],
    )
  } finally {
    await pool.end()
  }
}

function buildYoutubeCatchupSprintItem(existing = {}) {
  return {
    ...existing,
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    planRef: 'docs/process/youtube-creator-god-mode-catchup-001-plan.md',
    definitionOfDone: 'Approved public YouTube creator catch-up has an honest baseline readback, dry-run selection plan, budget gate, long-course routing, resource/source-packet/Hands disposition, and no false major build promotion while creator baselines remain incomplete.',
    proofCommands: [
      'npm run process:youtube-creator-god-mode-catchup-check -- --json',
      'npm run process:youtube-god-mode-autonomous-watch-scheduler-check -- --json --dry-run',
      'npm run process:dev-team-hub-v0-check -- --json',
    ],
    readinessBlockerCleared: 'Mark false API closeout is parked; public YouTube catch-up planning can continue without spending live Gemini budget.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: [
        'lib/youtube-creator-god-mode-catchup.js',
        'lib/youtube-god-mode-autonomous-watch-scheduler.js',
        'lib/youtube-latest-20-full-watch-runner.js',
        'lib/dev-team-hub.js',
      ],
      existingDocs: [
        'docs/process/youtube-creator-god-mode-catchup-001-plan.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
      ],
      existingScripts: [
        'scripts/process-youtube-creator-god-mode-catchup-check.mjs',
        'scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs',
        'scripts/process-dev-team-hub-v0-check.mjs',
      ],
      existingPolicy: [
        'Public YouTube comments are operator-excluded.',
        'Live Gemini/API full-watch spend requires fresh Steve approval.',
        'Skool, MyICOR, paid/private/auth/community/course sources require source-specific approval.',
      ],
      reused: [
        'source_crawl_items daily-watch pool',
        'persisted Gemini API full-watch batches',
        'source value grader',
        'resource/source-packet/Hands status readbacks',
      ],
      notRebuilt: [
        'No new crawler.',
        'No comments extractor.',
        'No private/auth session.',
        'No automatic backlog promotion.',
      ],
      exactGap: 'Parent creator catch-up is incomplete; Mark has six exact videos needing accepted Gemini API evidence before Mark baseline can close.',
      overBroadRisk: 'Treating metadata, transcript, subscription/browser-eyes, or comments as full God Mode video/audio/visual extraction.',
      readyBy: 'Steve May 25-26 YouTube catch-up and God Mode extractor priority.',
      readyAt: '2026-05-26T00:00:00-04:00',
    },
    returnedReason: null,
    metadata: {
      ...(existing.metadata || {}),
      afterMarkApiGapGate: true,
      activeBlockerReason: 'Continue no-spend public YouTube catch-up planning while Mark API gap waits on approved live budget.',
      markApiGapCardId: CARD_ID,
      commentsStatus: 'operator_excluded',
      liveGeminiBudgetRequiredBeforeApply: true,
    },
  }
}

function buildReturnedMarkSprintItem(existing = {}, evidence = {}) {
  return {
    ...existing,
    cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
    stage: 'returned',
    returnedReason: `API evidence gap: ${evidence.missingApiVideoIds.join(', ')} only have older workspace/subscription evidence, so Mark closeout is parked until approved API rewatch or explicit split.`,
    metadata: {
      ...(existing.metadata || {}),
      markApiEvidenceGapCardId: CARD_ID,
      acceptedApiCoveredVideoCount: evidence.apiCoveredVideoIds.length,
      markPoolVideoCount: evidence.markVideoIds.length,
      missingAcceptedApiVideoIds: evidence.missingApiVideoIds,
      legacyWorkspaceOnlyVideoIds: evidence.legacyWorkspaceOnlyVideoIds,
      markLast50CurrentPoolWatched: evidence.apiCoveredVideoIds.length,
      markLast50CurrentPoolRemaining: evidence.missingApiVideoIds.length,
      markLast50CurrentPoolComplete: false,
      falseCloseoutBlocked: true,
    },
  }
}

function buildSprintItems(previous = {}, evidence = {}) {
  const originalItems = list(previous.items).map(item => JSON.parse(JSON.stringify(item)))
  const withoutNext = originalItems.filter(item => item.cardId !== NEXT_CARD_ID)
  const nextItems = []
  let insertedNext = false
  for (const item of withoutNext) {
    if (item.cardId === MARK_KASHEF_LAST_50_BASELINE_CARD_ID) {
      nextItems.push(buildReturnedMarkSprintItem(item, evidence))
      nextItems.push(buildYoutubeCatchupSprintItem())
      insertedNext = true
    } else {
      nextItems.push(item)
    }
  }
  if (!insertedNext) nextItems.push(buildYoutubeCatchupSprintItem())
  return nextItems.map((item, index) => ({
    ...item,
    order: index + 1,
    sprintOrder: index + 1,
  }))
}

async function parkMarkGapAndAdvanceSprint(evidence = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `park ${MARK_KASHEF_LAST_50_BASELINE_CARD_ID} API gap and advance Current Sprint blocker`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await upsertRepairBacklogCard()
  await updateBacklogItem(MARK_KASHEF_LAST_50_BASELINE_CARD_ID, {
    lane: 'parked',
    nextAction: `Do not close Mark baseline. Rewatch these six videos through Gemini API only after Steve approves live budget, or explicitly split them: ${evidence.missingApiVideoIds.join(', ')}.`,
    statusNote: `Parked by ${CARD_ID}. Exact no-spend proof found ${evidence.apiCoveredVideoIds.length}/${evidence.markVideoIds.length} current Mark pool videos with accepted API atom+hit evidence. Missing accepted API evidence: ${evidence.missingApiVideoIds.join(', ')}. Those six are legacy workspace/subscription browser-eyes only, not accepted Mark last-50 API closeout proof.`,
  }, ACTOR)
  await updateBacklogItem(NEXT_CARD_ID, {
    lane: 'scoped',
    nextAction: 'Use no-spend catch-up readback plus scheduler dry-run to choose the next public YouTube batch. Live full-watch apply still waits for fresh Steve-approved Gemini budget.',
    statusNote: `Active next public YouTube planning lane after Mark false closeout was blocked by ${CARD_ID}. Parent catch-up remains open; comments are operator-excluded; private/auth sources remain blocked.`,
  }, ACTOR)
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        status: 'active',
        activeBlockerCardId: NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'mark_api_evidence_gap_parked_youtube_catchup_scoping',
          activeBlockerCardId: NEXT_CARD_ID,
          markApiEvidenceGapCardId: CARD_ID,
          markAcceptedApiCoveredVideoCount: evidence.apiCoveredVideoIds.length,
          markPoolVideoCount: evidence.markVideoIds.length,
          markMissingAcceptedApiVideoIds: evidence.missingApiVideoIds,
          markLegacyWorkspaceOnlyVideoIds: evidence.legacyWorkspaceOnlyVideoIds,
          markLast50CurrentPoolWatched: evidence.apiCoveredVideoIds.length,
          markLast50CurrentPoolRemaining: evidence.missingApiVideoIds.length,
          markLast50CurrentPoolComplete: false,
          nextAction: 'Continue no-spend YouTube catch-up readback/scheduler planning; live Gemini full-watch apply waits for Steve-approved budget.',
          noLiveProviderSpendFromThisGate: true,
          noExternalWrites: true,
          commentsStatus: 'operator_excluded',
        },
      },
      items: buildSprintItems(previous, evidence),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId,
      reason: 'Mark closeout failed exact API evidence audit; park gap and keep safe YouTube catch-up planning moving.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      packageJson,
      planSource,
      approvalValidation,
      evidence,
      smallBatchSource,
      currentPlanSource,
      currentStateSource,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(PLAN_PATH),
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      loadMarkEvidenceSnapshot(),
      readRepoFile('scripts/process-mark-kashef-god-mode-small-batch-check.mjs'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
    ])

    const acceptedReportsPresent = evidence.acceptedApiReports.every(Boolean)
    const acceptedReportsAreApi = evidence.acceptedApiReports.every(reportUsesApiFullWatch)
    const acceptedReportsNoExternal = evidence.acceptedApiReports.every(reportNoExternalWrites)
    const markPoolPublic = evidence.markRows.every(row => row.publicNoAuth === true && row.privateOrPaidAccess === false)
    const coverageBalances = evidence.apiCoveredVideoIds.length + evidence.missingApiVideoIds.length === evidence.markVideoIds.length
    const legacyWorkspaceExplainsGap = evidence.legacyWorkspaceOnlyVideoIds.length === evidence.missingApiVideoIds.length
    const legacyMode = text(evidence.legacyWorkspaceReport?.structured_output_json?.extractionMode)
    const directorRefreshedAfterLegacy = evidence.directorReport?.updated_at &&
      evidence.legacyWorkspaceReport?.updated_at &&
      new Date(evidence.directorReport.updated_at).getTime() > new Date(evidence.legacyWorkspaceReport.updated_at).getTime()
    const parentCloseoutAllowed = evidence.missingApiVideoIds.length === 0

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planSource.includes(CARD_ID) && planSource.includes('44/50') && planSource.includes('workspace/subscription'), 'plan records exact current gap and non-API boundary', PLAN_PATH)
    addCheck(checks, packageJson.scripts?.['process:mark-kashef-last-50-api-evidence-gap-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused API evidence gap proof', packageJson.scripts?.['process:mark-kashef-last-50-api-evidence-gap-check'] || 'missing')
    addCheck(checks, evidence.markVideoIds.length === 50 && evidence.markRows.length === 50, 'current Mark pool has exactly 50 rows with video IDs', `${evidence.markRows.length}/${evidence.markVideoIds.length}`)
    addCheck(checks, markPoolPublic, 'current Mark pool is public/no-auth and not private/paid', evidence.markRows.filter(row => !row.publicNoAuth || row.privateOrPaidAccess).map(row => row.videoId).join(', ') || 'ok')
    addCheck(checks, acceptedReportsPresent, 'accepted API report artifacts exist', API_REPORT_IDS.join(', '))
    addCheck(checks, acceptedReportsAreApi, 'accepted report artifacts use Gemini API full-watch route', API_REPORT_IDS.join(', '))
    addCheck(checks, acceptedReportsNoExternal, 'accepted API reports have no external writes', API_REPORT_IDS.join(', '))
    addCheck(checks, coverageBalances, 'API atom+hit coverage is measured exactly against current Mark pool', `${evidence.apiCoveredVideoIds.length}+${evidence.missingApiVideoIds.length}=${evidence.markVideoIds.length}`)
    addCheck(checks, evidence.apiCoveredVideoIds.length === 44 && evidence.missingApiVideoIds.length === 6, 'current false-closeout dogfood detects 44/50 accepted API coverage', evidence.missingApiVideoIds.join(', '))
    addCheck(checks, legacyMode === 'gemini_workspace_subscription_browser_eyes', 'legacy workspace/subscription batch is classified as non-API evidence', legacyMode || 'missing')
    addCheck(checks, legacyWorkspaceExplainsGap, 'all missing API videos are only explained by legacy workspace/subscription evidence', evidence.legacyWorkspaceOnlyVideoIds.join(', '))
    addCheck(checks, directorRefreshedAfterLegacy, 'Director was refreshed after the older workspace batch', evidence.directorReport?.updated_at ? String(evidence.directorReport.updated_at) : 'missing')
    addCheck(checks, !parentCloseoutAllowed, 'parent Mark closeout is blocked until API gap is resolved', evidence.missingApiVideoIds.join(', '))
    addCheck(checks, !smallBatchSource.includes("OR metadata->>'sourceVideoId' IS NOT NULL"), 'small-batch watched-id query no longer overcounts unrelated/sourceVideoId evidence', 'broad sourceVideoId clause absent')
    addCheck(checks, currentPlanSource.includes(CARD_ID) && currentPlanSource.includes('44/50'), 'current plan documents Mark API gap truth', 'docs/rebuild/current-plan.md')
    addCheck(checks, currentStateSource.includes(CARD_ID) && currentStateSource.includes('44/50'), 'current state documents Mark API gap truth', 'docs/rebuild/current-state.md')

    if (args.closeCard) {
      await parkMarkGapAndAdvanceSprint(evidence)
      const [cards, sprint] = await Promise.all([
        getBacklogItemsByIds([CARD_ID, MARK_KASHEF_LAST_50_BASELINE_CARD_ID, NEXT_CARD_ID]),
        getActiveFoundationCurrentSprint(),
      ])
      const cardById = new Map(cards.map(card => [card.id, card]))
      const markItem = list(sprint.items).find(item => item.cardId === MARK_KASHEF_LAST_50_BASELINE_CARD_ID)
      const nextItem = list(sprint.items).find(item => item.cardId === NEXT_CARD_ID)
      addCheck(checks, cardById.get(CARD_ID)?.lane === 'done', 'repair card is closed in live backlog', cardById.get(CARD_ID)?.lane || 'missing')
      addCheck(checks, cardById.get(MARK_KASHEF_LAST_50_BASELINE_CARD_ID)?.lane === 'parked', 'parent Mark baseline is parked, not falsely closed', cardById.get(MARK_KASHEF_LAST_50_BASELINE_CARD_ID)?.lane || 'missing')
      addCheck(checks, sprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint active blocker advances to public YouTube catch-up planning', sprint.sprint?.activeBlockerCardId || 'missing')
      addCheck(checks, markItem?.stage === 'returned', 'Current Sprint returns Mark with exact API gap', markItem?.stage || 'missing')
      addCheck(checks, nextItem?.stage === 'scoping', 'Current Sprint contains YouTube catch-up as scoped active blocker', nextItem?.stage || 'missing')
      addCheck(checks, sprint.sprint?.metadata?.markLast50CurrentPoolComplete === false, 'Current Sprint no longer claims Mark last-50 API pool complete', String(sprint.sprint?.metadata?.markLast50CurrentPoolComplete))
      addCheck(checks, Number(sprint.sprint?.metadata?.markLast50CurrentPoolWatched || 0) === evidence.apiCoveredVideoIds.length, 'Current Sprint Mark watched count uses accepted API coverage', String(sprint.sprint?.metadata?.markLast50CurrentPoolWatched || 0))
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : args.closeCard ? 'gap_parked' : 'api_gap_detected',
      cardId: CARD_ID,
      parentCardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      parentCloseoutAllowed,
      evidence: {
        markPoolVideoCount: evidence.markVideoIds.length,
        acceptedApiCoveredVideoCount: evidence.apiCoveredVideoIds.length,
        missingAcceptedApiVideoCount: evidence.missingApiVideoIds.length,
        missingAcceptedApiVideoIds: evidence.missingApiVideoIds,
        legacyWorkspaceOnlyVideoIds: evidence.legacyWorkspaceOnlyVideoIds,
        acceptedApiReportIds: API_REPORT_IDS,
        legacyWorkspaceReportId: LEGACY_WORKSPACE_REPORT_ID,
        directorUpdatedAt: evidence.directorReport?.updated_at || null,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Mark Kashef API evidence gap proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Mark Kashef API evidence gap proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
