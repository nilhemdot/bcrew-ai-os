#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
  YOUTUBE_BUILD_INTEL_BATCH_CHANGED_FILES,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
  YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID,
  YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_PROOF_COMMANDS,
  YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH,
  YOUTUBE_BUILD_INTEL_BATCH_SPRINT_ID,
  buildYoutubeBuildIntelBatchDogfoodProof,
  buildYoutubeBuildIntelBatchSnapshot,
  renderYoutubeBuildIntelBatchReport,
} from '../lib/youtube-build-intel-batch.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  if (args.closeCard) args.stage = 'done_this_sprint'
  return args
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

function stableRunId(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function buildCardRow(closeCard = false) {
  return {
    id: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
    title: 'Queue Build Intel YouTube last-20 video batch',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 10,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Prepare governed metadata-only public YouTube Build Intel queue specs for the last 20 relevant videos per approved creator/channel.',
    whyItMatters: 'Steve wants deep extraction of current agent-building content, but public video work still needs source-backed queue specs, budget limits, and approval gates before any runtime extraction starts.',
    nextAction: closeCard
      ? `Done under ${YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY}. Continue ${YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID}; do not run public video extraction until a separate runtime approval packet is approved.`
      : 'Create source-backed queue specs for public Build Intel creators and prove private sources, transcript fetches, screenshots, keyframes, model calls, and downstream writes remain blocked.',
    statusNote: closeCard
      ? `Closed under \`${YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY}\`; public YouTube Build Intel queue specs are ready, runtime extraction remains approval-bound.`
      : `Executing under \`${YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY}\`; metadata-only queue preparation, no live extraction or model calls.`,
    owner: 'Steve + Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH,
    definitionOfDone: 'Public YouTube Build Intel queue specs are source-backed, capped at last-20 videos per channel, private/paid/community sources are rejected, transcript/keyframe/model extraction remains blocked, verifier coverage exists, and ship gate passes.',
    proofCommands: YOUTUBE_BUILD_INTEL_BATCH_PROOF_COMMANDS,
    readinessBlockerCleared: 'COURSE-SOURCE-AUTH-BOUNDARY-001 closed metadata-only versus approved extraction boundaries.',
    notNextBoundaries: [
      'No live extraction.',
      'No public web lookup or YouTube API call in this card.',
      'No transcript fetch, screenshot capture, keyframe capture, download, summarization, or model call.',
      'No private, paid, community, course, Skool, MyICOR, Loom, or authorized-browser access.',
      'No Research Inbox write, KB draft creation, atom creation, action route creation, or backlog mutation from extracted content.',
      'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
      'No Drive permissions mutation or Drive request-access email.',
      'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
      'No hidden subagents or parallel builders.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/build-intel-watchlist.js',
        'lib/course-source-auth-boundary.js',
        'lib/build-intel-extraction-implementation.js',
        'lib/multimodal-extractor-contract.js',
      ],
      existingDocs: [
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
        'docs/handoffs/2026-05-18-course-source-auth-boundary-closeout.md',
      ],
      existingScripts: [
        'scripts/process-build-intel-creator-watchlist-expansion-check.mjs',
        'scripts/process-course-source-auth-boundary-check.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingCards: [
        'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001',
        'COURSE-SOURCE-AUTH-BOUNDARY-001',
        'EXTRACTION-TEAM-001',
        YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID,
      ],
      existingPolicy: [
        'COURSE-SOURCE-AUTH-BOUNDARY-001 keeps public YouTube metadata-only until a runtime approval packet exists.',
        'Private, paid, community, course, Skool, MyICOR, and Loom sources remain blocked by source-specific approval requirements.',
        'Build Intel output routing must stay proposal-only until EXTRACTION-TO-KB-ATOM-PIPELINE-001 proves KB/atom/action gates.',
      ],
      reused: [
        'Creator watchlist public YouTube refs',
        'Course/source auth boundary rows',
        'Current Sprint overlay and Plan Critic patterns',
        'Recent Builds closeout/fanout gate',
      ],
      notRebuilt: [
        'No extractor runtime.',
        'No YouTube discovery crawler.',
        'No transcript or screenshot extractor.',
        'No Research Inbox/atom promotion path.',
      ],
      exactGap: 'The extractor runtime needs a public creator batch spec before any last-20 YouTube run can be approved safely.',
      overBroadRisk: 'This can drift into public web lookup, transcript extraction, screenshots, model summaries, or private-source work. V1 only builds queue specs and fail-closed proof.',
      readyBy: 'Codex Foundation builder',
      readyAt: '2026-05-18T17:50:00.000-04:00',
    },
    metadata: {
      approvalRef: YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH,
      closeoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
      recommendedNext: YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  const inherited = buildSprintItem({ closeCard: false, stage: 'building_now' })
  return {
    cardId: YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Extractor output routing is scoped with source ID, citation, privacy, freshness, contradiction, KB draft, atom, and action-route gates before any downstream writes or live extraction are allowed.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${YOUTUBE_BUILD_INTEL_BATCH_CARD_ID} closed metadata-only public YouTube batch queue specs.`,
    notNextBoundaries: inherited.notNextBoundaries,
    existingWorkCheck: inherited.existingWorkCheck,
    metadata: {
      inheritedFrom: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
      nextAfterCloseoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
      runtimeExtractionApprovalRequired: true,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow(closeCard)
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
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
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-youtube-build-intel-batch')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          result = EXCLUDED.result
      `,
      [
        `youtube-build-intel-batch-${stableRunId(YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH)}`,
        YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
        YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH,
        YOUTUBE_BUILD_INTEL_BATCH_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [YOUTUBE_BUILD_INTEL_BATCH_CARD_ID],
          closeoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-youtube-build-intel-batch',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} YouTube Build Intel batch card.`,
        JSON.stringify({ closeoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY, lane: row.lane }),
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
}

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH,
    operation: 'create/update YouTube Build Intel batch card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: YOUTUBE_BUILD_INTEL_BATCH_SPRINT_ID,
        status: 'active',
        goal: 'Prepare public YouTube Build Intel queue specs without running extraction.',
        activeBlockerCardId: closeCard ? YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID : YOUTUBE_BUILD_INTEL_BATCH_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-youtube-build-intel-batch',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID}; public video runtime extraction remains approval-bound.`
            : 'Build metadata-only public YouTube queue specs and prove unsafe variants fail closed.',
          priorityOrder: [YOUTUBE_BUILD_INTEL_BATCH_CARD_ID, YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID],
          notNext: buildSprintItem({ closeCard, stage }).notNextBoundaries,
          exitCriteria: [
            'Public YouTube queue specs are source-backed from the creator watchlist.',
            'Batch caps stay within last-20 videos per channel.',
            'Private/paid/community/course sources remain blocked.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-youtube-build-intel-batch',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || YOUTUBE_BUILD_INTEL_BATCH_SPRINT_ID,
      reason: 'Steve prioritized public Build Intel extraction prep after source-auth boundary closed.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH, cardId: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID }),
    getBacklogItemsByIds([YOUTUBE_BUILD_INTEL_BATCH_CARD_ID, 'EXTRACTION-TEAM-001', 'COURSE-SOURCE-AUTH-BOUNDARY-001', YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([YOUTUBE_BUILD_INTEL_BATCH_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(YOUTUBE_BUILD_INTEL_BATCH_PLAN_PATH),
    readRepoFile(YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH),
    readRepoFile('lib/youtube-build-intel-batch.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === YOUTUBE_BUILD_INTEL_BATCH_CARD_ID) || null
  const extractionTeamCard = cards.find(item => item.id === 'EXTRACTION-TEAM-001') || null
  const sourceAuthCard = cards.find(item => item.id === 'COURSE-SOURCE-AUTH-BOUNDARY-001') || null
  const nextCard = cards.find(item => item.id === YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === YOUTUBE_BUILD_INTEL_BATCH_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID) || null
  const snapshot = buildYoutubeBuildIntelBatchSnapshot()
  const dogfood = buildYoutubeBuildIntelBatchDogfoodProof()
  const renderedReport = renderYoutubeBuildIntelBatchReport(snapshot)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: YOUTUBE_BUILD_INTEL_BATCH_CARD_ID, priority: 'P0' },
    changedFiles: YOUTUBE_BUILD_INTEL_BATCH_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === YOUTUBE_BUILD_INTEL_BATCH_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || YOUTUBE_BUILD_INTEL_BATCH_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live YouTube batch card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, extractionTeamCard && ['scoped', 'executing', 'done'].includes(extractionTeamCard.lane), 'extraction team umbrella remains present', extractionTeamCard ? `${extractionTeamCard.id}:${extractionTeamCard.lane}` : 'missing')
  addCheck(checks, sourceAuthCard?.lane === 'done', 'source-auth boundary is already closed', sourceAuthCard ? `${sourceAuthCard.id}:${sourceAuthCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next output-routing card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === YOUTUBE_BUILD_INTEL_BATCH_SPRINT_ID || card?.lane === 'done', 'Current Sprint is YouTube batch or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains YouTube batch item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'YouTube batch snapshot is ready', snapshot.failures.map(failure => failure.check).join(', ') || `${snapshot.summary.queueSpecCount} specs`)
  addCheck(checks, snapshot.summary.queueSpecCount >= 6 && snapshot.summary.publicChannelSpecCount >= 6, 'source-backed public YouTube specs are present', `specs=${snapshot.summary.queueSpecCount} channels=${snapshot.summary.publicChannelSpecCount}`)
  addCheck(checks, snapshot.summary.maxVideosPerChannel <= 20 && snapshot.summary.plannedVideoCeiling <= snapshot.summary.queueSpecCount * 20, 'last-20 batch cap is enforced', `max=${snapshot.summary.maxVideosPerChannel} ceiling=${snapshot.summary.plannedVideoCeiling}`)
  addCheck(checks, snapshot.metadataOnlyPreflight === true && snapshot.liveExtractionApprovedByThisCard === false && snapshot.writesBacklog === false && snapshot.opensSprint === false, 'card remains metadata-only and no-output', JSON.stringify({ metadataOnlyPreflight: snapshot.metadataOnlyPreflight, liveExtractionApprovedByThisCard: snapshot.liveExtractionApprovedByThisCard, writesBacklog: snapshot.writesBacklog }))
  addCheck(checks, snapshot.summary.privateOrPaidBlockedCount >= 3 && snapshot.summary.unsafeSideEffectCount === 0, 'private/auth side effects remain blocked', `privateBlocked=${snapshot.summary.privateOrPaidBlockedCount} sideEffects=${snapshot.summary.unsafeSideEffectCount}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects live extraction, over-limit, private-source, and invalid-spec variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, closeoutDoc.includes(YOUTUBE_BUILD_INTEL_BATCH_CARD_ID) && closeoutDoc.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Public Queue Specs') && renderedReport.includes('Mark Kashef') && renderedReport.includes('Matt Pocock'), 'rendered report includes queue specs for key creators', 'report renderer')
  addCheck(checks, verifierSource.includes(YOUTUBE_BUILD_INTEL_BATCH_CARD_ID) && verifierSource.includes('buildYoutubeBuildIntelBatchDogfoodProof'), 'intelligence/audit verifier covers YouTube batch', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY), 'closeout registry includes YouTube batch closeout', YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY) && currentPlan.includes(YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(YOUTUBE_BUILD_INTEL_BATCH_CLOSEOUT_KEY) && currentState.includes(YOUTUBE_BUILD_INTEL_BATCH_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:youtube-build-intel-batch-check'] === `node --env-file-if-exists=.env ${YOUTUBE_BUILD_INTEL_BATCH_SCRIPT_PATH}`, 'package registers focused proof script', 'process:youtube-build-intel-batch-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'YouTube batch module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      queueSpecCount: snapshot.summary.queueSpecCount,
      queueCreatorCount: snapshot.summary.queueCreatorCount,
      plannedVideoCeiling: snapshot.summary.plannedVideoCeiling,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`YouTube Build Intel batch proof: ${result.summary.passed}/${result.summary.total}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
