#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_APPROVAL_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CHANGED_FILES,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PLAN_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PROOF_COMMANDS,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SOURCE_ID,
  MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SPRINT_ID,
  buildMarkMSkoolExtractionPreflightDogfoodProof,
  buildMarkMSkoolExtractionPreflightSnapshot,
  renderMarkMSkoolExtractionPreflightReport,
} from '../lib/mark-m-skool-extraction-preflight.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const PRIOR_CARD_ID = 'MYICOR-EXTRACTION-PREFLIGHT-001'
const AUTH_BOUNDARY_CARD_ID = 'COURSE-SOURCE-AUTH-BOUNDARY-001'

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

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-contract-validation-layer.js',
      'lib/connector-credential-registry.js',
      'lib/course-source-auth-boundary.js',
      'lib/mark-m-skool-extraction-preflight.js',
      'lib/myicor-extraction-preflight.js',
    ],
    existingDocs: [
      'docs/source-notes/skool-corpus.md',
      'docs/handoffs/2026-05-18-course-source-auth-boundary-closeout.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-13-source-extraction-gap-triage.md',
      'docs/process/course-source-auth-boundary-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-course-source-auth-boundary-check.mjs',
      'scripts/process-myicor-extraction-preflight-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingCards: [
      AUTH_BOUNDARY_CARD_ID,
      PRIOR_CARD_ID,
      MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
      MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Private, paid, course, Skool, MyICOR, Loom, and authorized-browser sources are approval-bound.',
      'Skool source note says not to crawl Skool blindly and requires approved access path/content-use boundary.',
      'Metadata-only preflight may capture source identity, owner, access label, risk notes, and approval packet draft.',
      'Posts, comments, member data, lessons, videos, screenshots, transcripts, and summaries cannot be copied before source-specific approval.',
    ],
    reused: [
      'SRC-SKOOL-001 source contract',
      'skool-access connector blocker',
      'course source auth boundary approval fields',
      'MyICOR preflight pattern for paid/private source gating',
    ],
    notRebuilt: [
      'No Skool connector.',
      'No browser worker.',
      'No extractor runtime.',
      'No community crawler, post/comment extractor, transcript fetcher, screenshot/keyframe capture, model call, or downstream writer.',
    ],
    exactGap: 'Mark M Skool needs a source/auth/community preflight packet that captures approval fields and blocks private community access until Steve approves a source-specific run.',
    overBroadRisk: 'This can drift into Skool login, community inventory, course crawling, post/comment extraction, member-data reads, video extraction, screenshots, summaries, or downstream knowledge writes. V1 is metadata-only preflight.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T19:05:00.000-04:00',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
    title: 'Preflight Mark M Skool course extraction source contract',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 17,
    source: '2026-05-18 extractor/source-auth priority queue',
    summary: 'Create the Mark M Skool extraction preflight: source identity, auth owner, course/community map, post/video/comment types, permission posture, extraction limits, artifact storage, privacy boundaries, and approval path.',
    whyItMatters: 'Skool is private/community-based source material. Foundation needs the source/auth packet before any browser worker, extractor, or agent can touch community or course material without confusing preflight with approval.',
    nextAction: closeCard
      ? `Done under ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY}. Continue ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID} from repo truth.`
      : 'Build metadata-only preflight. Do not open Skool, use private auth, crawl, extract posts/comments/member data/videos, screenshot, summarize, call models, or write downstream outputs.',
    statusNote: closeCard
      ? `Closed under \`${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY}\`; source/auth packet is metadata-only and Skool extraction remains blocked pending source-specific approval.`
      : `Executing under \`${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY}\`; metadata-only source/auth preflight, no Skool private access.`,
    owner: 'Steve + Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PLAN_PATH,
    definitionOfDone: 'Skool source/auth preflight exists with source contract truth, blocked connector posture, complete approval-field draft, uninspected community/course map skeleton, artifact/content-use policy, dogfood proof, and no Skool private access or content extraction.',
    proofCommands: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PROOF_COMMANDS,
    readinessBlockerCleared: `${PRIOR_CARD_ID} closed paid-course preflight boundaries and ${AUTH_BOUNDARY_CARD_ID} closed source-auth approval matrix.`,
    notNextBoundaries: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_APPROVAL_PATH,
      closeoutKey: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      packetRef: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH,
      sourceId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SOURCE_ID,
      recommendedNext: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
      privateSourcePreflightOnly: true,
      liveExtractionApproved: false,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Mark Kashef public /goal Build Intel packet is scoped/proven from public source truth without private Skool access or unapproved extraction.',
    proofCommands: [
      'scope-first: verify source URL/source class and approval boundary before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID} closed Skool private-community preflight boundaries.`,
    notNextBoundaries: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
      nextAfterCloseoutKey: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
      privateSourcePreflightOnly: false,
      liveExtractionApproved: false,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
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
        INSERT INTO plan_critic_runs (run_id, card_id, plan_ref, status, score, max_score, pass_threshold, priority, gate_level, full_verify_required, changed_files, findings, result, requested_by)
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-mark-m-skool-extraction-preflight')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `mark-m-skool-extraction-preflight-${stableRunId(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PLAN_PATH)}`,
        MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
        MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PLAN_PATH,
        planReview.status,
        planReview.score,
        MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-mark-m-skool-extraction-preflight',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID}.`,
        JSON.stringify({ closeoutKey: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH,
    operation: 'create/update Mark M Skool preflight card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SPRINT_ID,
        status: 'active',
        goal: 'Close Mark M Skool private-community source/auth preflight without accessing private content.',
        activeBlockerCardId: closeCard ? MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID : MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-mark-m-skool-extraction-preflight',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID} from repo truth.`
            : 'Write Skool metadata-only source/auth preflight and keep private access blocked.',
          priorityOrder: [
            MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
            MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
            'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001',
          ],
          notNext: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Source contract, connector credential, validation profile, and source-auth row all prove Skool is blocked pending approval.',
            'Approval packet draft names every required field without granting extraction.',
            'Dogfood rejects missing source truth, unsafe approval, paid/private auth, live extraction, copied community content, inspected community map, downstream writes, and model calls.',
            'No Skool private access, posts, comments, member data, lessons, transcripts, screenshots, downloads, model calls, or downstream writes occur.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-mark-m-skool-extraction-preflight',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized Mark M Skool as source-auth preflight only after MyICOR preflight.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })
  if (writeRequested && !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    verifierSource,
    closeoutRecordsSource,
    packetDoc,
    closeoutDoc,
    currentPlan,
    currentState,
    sourceNote,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_APPROVAL_PATH, cardId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID }),
    getBacklogItemsByIds([MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID, PRIOR_CARD_ID, AUTH_BOUNDARY_CARD_ID, MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile('lib/mark-m-skool-extraction-preflight.js'),
    readRepoFile(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH),
    readRepoFile(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/source-notes/skool-corpus.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID) || null
  const priorCard = cards.find(item => item.id === PRIOR_CARD_ID) || null
  const authBoundaryCard = cards.find(item => item.id === AUTH_BOUNDARY_CARD_ID) || null
  const nextCard = cards.find(item => item.id === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const snapshot = buildMarkMSkoolExtractionPreflightSnapshot()
  const dogfood = buildMarkMSkoolExtractionPreflightDogfoodProof()
  const renderedReport = renderMarkMSkoolExtractionPreflightReport(snapshot)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || MARK_M_SKOOL_EXTRACTION_PREFLIGHT_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live Mark M Skool preflight card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, priorCard?.lane === 'done', 'MyICOR preflight prerequisite is closed', priorCard ? `${priorCard.id}:${priorCard.lane}` : 'missing')
  addCheck(checks, authBoundaryCard?.lane === 'done', 'course source auth boundary prerequisite is closed', authBoundaryCard ? `${authBoundaryCard.id}:${authBoundaryCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Mark Kashef public Build Intel card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains Mark M Skool preflight item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next Mark Kashef card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'Mark M Skool preflight snapshot is ready', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.metadataOnly === true && snapshot.preflightOnly === true && snapshot.approvedExtraction === false, 'preflight stays metadata-only and extraction-blocked', JSON.stringify({ metadataOnly: snapshot.metadataOnly, approvedExtraction: snapshot.approvedExtraction }))
  addCheck(checks, snapshot.sourceContract?.sourceId === MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SOURCE_ID && snapshot.connectorCredential?.status === 'blocked', 'repo truth proves source contract and connector blocker', `${snapshot.sourceContract?.sourceId || 'missing'} / ${snapshot.connectorCredential?.status || 'missing'}`)
  addCheck(checks, snapshot.approvalPacketDraft?.sourceSpecificApprovalGranted === false && snapshot.summary?.approvalFieldGapCount === 0, 'approval packet draft is complete without granting approval', JSON.stringify({ fields: snapshot.summary?.approvalFieldCount, gaps: snapshot.summary?.approvalFieldGapCount }))
  addCheck(checks, snapshot.summary?.communityMapInspected === false && snapshot.summary?.privateContentViolationCount === 0, 'community map and private content remain uninspected/uncopied', JSON.stringify({ communityMapInspected: snapshot.summary?.communityMapInspected, contentViolations: snapshot.summary?.privateContentViolationCount }))
  addCheck(checks, snapshot.summary?.unsafeSideEffectCount === 0, 'no side effects occurred', JSON.stringify(snapshot.sideEffects))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Skool preflight variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, packetDoc.includes('Approval Packet Draft') && packetDoc.includes('Do Not Start'), 'preflight packet doc exists and names approval boundary', MARK_M_SKOOL_EXTRACTION_PREFLIGHT_PACKET_PATH)
  addCheck(checks, closeoutDoc.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID) && closeoutDoc.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Triage') && renderedReport.includes('Expected Content Types'), 'rendered report summarizes Skool preflight', 'report renderer')
  addCheck(checks, sourceNote.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SOURCE_ID) && sourceNote.includes('Do not crawl Skool blindly'), 'source note preserves no-blind-crawl posture', 'docs/source-notes/skool-corpus.md')
  addCheck(checks, verifierSource.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID) && verifierSource.includes('buildMarkMSkoolExtractionPreflightDogfoodProof'), 'intelligence/audit verifier covers Skool preflight', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY), 'closeout registry includes Skool preflight closeout', MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) && currentPlan.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY) && currentState.includes(MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:mark-m-skool-extraction-preflight-check'] === `node --env-file-if-exists=.env ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH}`, 'package registers focused proof script', 'process:mark-m-skool-extraction-preflight-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'Skool preflight module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      sourceId: snapshot.sourceId,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
    failures: failed,
  }

  await closeFoundationDb()
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Mark M Skool extraction preflight check: ${result.ok ? 'PASS' : 'FAIL'} (${result.summary.passed}/${result.summary.total})`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
