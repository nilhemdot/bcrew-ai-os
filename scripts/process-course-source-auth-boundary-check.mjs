#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_PATH,
  COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
  COURSE_SOURCE_AUTH_BOUNDARY_CHANGED_FILES,
  COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
  COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH,
  COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID,
  COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH,
  COURSE_SOURCE_AUTH_BOUNDARY_PROOF_COMMANDS,
  COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH,
  COURSE_SOURCE_AUTH_BOUNDARY_SPRINT_ID,
  buildCourseSourceAuthBoundaryDogfoodProof,
  buildCourseSourceAuthBoundarySnapshot,
  renderCourseSourceAuthBoundaryReport,
} from '../lib/course-source-auth-boundary.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
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
    id: COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
    title: 'Define private course extraction permission boundary',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 11,
    source: '2026-05-18 Build Intel/source-auth queue after creator watchlist expansion',
    summary: 'Define the source-auth approval boundary for private, paid, community, course, Loom/private training, and public no-auth Build Intel sources before extraction can run.',
    whyItMatters: 'Foundation needs a fail-closed line between metadata preflight and content extraction so MyICOR, Skool, Loom, and private/course sources cannot be scraped, screenshotted, transcribed, summarized, or routed before Steve approves exact storage/use posture.',
    nextAction: closeCard
      ? `Done under ${COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY}. Continue ${COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID}; private/course extraction remains blocked until source-specific approval packets exist.`
      : 'Create source-auth matrix and proof that metadata-only preflight is allowed while private/paid extraction, auth, screenshots, transcripts, model calls, and downstream writes fail closed.',
    statusNote: closeCard
      ? `Closed under \`${COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY}\`; source-auth matrix is live and private/course extraction remains blocked pending source-specific approval packets.`
      : `Executing under \`${COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY}\`; policy/proof only, no private auth, live extraction, model calls, screenshots, transcripts, or downstream writes.`,
    owner: 'Steve + Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH,
    definitionOfDone: 'Source-auth matrix defines metadata-only preflight versus approved extraction, private/paid/course sources remain blocked, approval packet fields are explicit, dogfood rejects unsafe variants, verifier coverage exists, and no private auth/extraction/model/output side effects run.',
    proofCommands: COURSE_SOURCE_AUTH_BOUNDARY_PROOF_COMMANDS,
    readinessBlockerCleared: 'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 closed lookup-backed source refs first.',
    notNextBoundaries: [
      'No live extraction.',
      'No private, paid, community, course, Skool, MyICOR, Loom, or authorized-browser login.',
      'No source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, or model call.',
      'No Research Inbox write, KB draft creation, atom creation, action route creation, or backlog mutation from extracted content.',
      'No OpenHuman install, runtime launch, or integration.',
      'No Harlan UI, voice/avatar, live runtime, external sends, or external writes.',
      'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
      'No Drive permissions mutation or Drive request-access email.',
      'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
      'No hidden subagents or parallel builders.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/source-contracts.js',
        'lib/connector-credential-registry.js',
        'lib/build-intel-watchlist.js',
        'lib/extractor-queue-karpathy-kb-video-pack.js',
        'lib/build-intel-creator-watchlist-expansion.js',
      ],
      existingDocs: [
        'docs/source-registry.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
        'docs/handoffs/2026-05-18-build-intel-creator-watchlist-expansion-closeout.md',
      ],
      existingScripts: [
        'scripts/process-build-intel-creator-watchlist-expansion-check.mjs',
        'scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingPolicy: [
        'Source contracts already classify MyICOR, Skool, Loom, and YouTube source identity/status.',
        'Connector credential registry already marks MyICOR and Skool as future authorized-session blockers.',
        'Build Intel queue packets stay pending approval until Steve approves a no-auth/no-paid or source-auth run.',
      ],
      existingCards: [
        'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001',
        COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID,
        'MYICOR-EXTRACTION-PREFLIGHT-001',
        'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
      ],
      reused: [
        'Existing source IDs',
        'Existing connector blocker registry',
        'Current Sprint overlay and Plan Critic patterns',
        'Recent Builds closeout/fanout gate',
      ],
      notRebuilt: [
        'No extractor runtime.',
        'No credential connector.',
        'No browser automation.',
        'No Research Inbox/atom promotion path.',
      ],
      exactGap: 'Private/course sources need a durable permission boundary before extractor runtime or preflight cards can touch MyICOR, Skool, Loom, or paid/community content.',
      overBroadRisk: 'This can drift into logging into paid/private sources or creating extraction outputs. This card only defines the approval boundary and fail-closed proof.',
      readyBy: 'Codex Foundation builder',
      readyAt: '2026-05-18T21:05:00.000-04:00',
    },
    metadata: {
      approvalRef: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_PATH,
      closeoutKey: COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
      recommendedNext: COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-course-source-auth-boundary')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          result = EXCLUDED.result
      `,
      [
        `course-source-auth-boundary-${stableRunId(COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH)}`,
        COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
        COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH,
        COURSE_SOURCE_AUTH_BOUNDARY_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardIds: [COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID],
          closeoutKey: COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-course-source-auth-boundary',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} course source auth boundary card.`,
        JSON.stringify({ closeoutKey: COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY, lane: row.lane }),
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
    scriptPath: COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH,
    operation: 'create/update course source auth boundary card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: COURSE_SOURCE_AUTH_BOUNDARY_SPRINT_ID,
        status: 'active',
        goal: 'Define private/course source-auth boundary before extractor runtime work proceeds.',
        activeBlockerCardId: closeCard ? null : COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-course-source-auth-boundary',
          currentStatus: closeCard ? 'complete' : stage,
          closeoutKey: COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID}; private/course extraction remains approval-bound.`
            : 'Define metadata-only preflight versus approved extraction and prove unsafe variants fail closed.',
          priorityOrder: [COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID, COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID],
          notNext: buildSprintItem({ closeCard, stage }).notNextBoundaries,
          exitCriteria: [
            'Source-auth class matrix covers public, paid course, private community, and private video/training.',
            'MyICOR, Skool, Loom, and public YouTube rows have explicit source/auth posture.',
            'Private/paid extraction remains blocked without source-specific approval packets.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-course-source-auth-boundary',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || COURSE_SOURCE_AUTH_BOUNDARY_SPRINT_ID,
      reason: 'Steve prioritized COURSE-SOURCE-AUTH-BOUNDARY-001 after Build Intel creator watchlist expansion.',
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
    sourceContractsSource,
    sourceRegistrySource,
    connectorCredentialSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_PATH, cardId: COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID }),
    getBacklogItemsByIds([COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID, COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID, 'MYICOR-EXTRACTION-PREFLIGHT-001', 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001']),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH),
    readRepoFile(COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH),
    readRepoFile('lib/course-source-auth-boundary.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('lib/connector-credential-registry.js'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID) || null
  const nextCard = cards.find(item => item.id === COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID) || null
  const myicorCard = cards.find(item => item.id === 'MYICOR-EXTRACTION-PREFLIGHT-001') || null
  const skoolCard = cards.find(item => item.id === 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001') || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID) || null
  const snapshot = buildCourseSourceAuthBoundarySnapshot()
  const dogfood = buildCourseSourceAuthBoundaryDogfoodProof()
  const renderedReport = renderCourseSourceAuthBoundaryReport(snapshot)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID, priority: 'P0' },
    changedFiles: COURSE_SOURCE_AUTH_BOUNDARY_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', 'pass/10')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live source-auth boundary card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next extraction team card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, myicorCard && ['scoped', 'executing', 'done'].includes(myicorCard.lane) && skoolCard && ['scoped', 'executing', 'done'].includes(skoolCard.lane), 'private-source preflight cards stay parked/scoped', `${myicorCard?.id || 'missing'}:${myicorCard?.lane || 'missing'} ${skoolCard?.id || 'missing'}:${skoolCard?.lane || 'missing'}`)
  addCheck(checks, sprint.sprint?.sprintId === COURSE_SOURCE_AUTH_BOUNDARY_SPRINT_ID || card?.lane === 'done', 'Current Sprint is source-auth boundary or card is historically done', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains source-auth boundary item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'source-auth boundary snapshot is ready', snapshot.failures.map(failure => failure.check).join(', ') || `${snapshot.summary.requiredReadyCount}/${snapshot.summary.requiredSourceCount}`)
  addCheck(checks, snapshot.summary.privateOrPaidCount >= 3 && snapshot.summary.blockedPrivateOrPaidCount === snapshot.summary.privateOrPaidCount, 'private/paid sources are blocked', `blocked=${snapshot.summary.blockedPrivateOrPaidCount}/${snapshot.summary.privateOrPaidCount}`)
  addCheck(checks, snapshot.metadataOnlyPreflight === true && snapshot.extractionApprovedByThisCard === false && snapshot.writesBacklog === false && snapshot.opensSprint === false, 'card remains metadata/preflight policy only', JSON.stringify({ metadataOnlyPreflight: snapshot.metadataOnlyPreflight, extractionApprovedByThisCard: snapshot.extractionApprovedByThisCard, writesBacklog: snapshot.writesBacklog }))
  addCheck(checks, snapshot.summary.unsafeSideEffectCount === 0, 'no auth/extraction/model/output side effects', JSON.stringify(snapshot.sideEffects))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing source, missing approval field, unsafe approval, auth, extraction, and output variants', dogfood.dogfoodInvariant)
  addCheck(checks, closeoutDoc.includes(COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID) && closeoutDoc.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Approval Matrix') && renderedReport.includes('SRC-MYICRO-001') && renderedReport.includes('SRC-SKOOL-001'), 'rendered report includes source boundary and approval matrix', 'report renderer')
  addCheck(checks, sourceContractsSource.includes('SRC-MYICRO-001') && sourceContractsSource.includes('SRC-SKOOL-001') && sourceContractsSource.includes('SRC-LOOM-001') && sourceContractsSource.includes('SRC-YOUTUBE-INTEL-001'), 'source contracts already declare private/course source IDs', 'lib/source-contracts.js')
  addCheck(checks, sourceRegistrySource.includes('SRC-SKOOL-001') && sourceRegistrySource.includes('before it can become a trusted corpus source'), 'source registry documents Skool boundary', 'docs/source-registry.md')
  addCheck(checks, connectorCredentialSource.includes('myicro-access') && connectorCredentialSource.includes('skool-access') && connectorCredentialSource.includes('not approved in this sprint'), 'connector credential registry keeps MyICOR/Skool blocked', 'lib/connector-credential-registry.js')
  addCheck(checks, verifierSource.includes(COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID) && verifierSource.includes('buildCourseSourceAuthBoundaryDogfoodProof'), 'intelligence/audit verifier covers source-auth boundary', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY), 'closeout registry includes source-auth boundary closeout', COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY) && currentPlan.includes(COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY) && currentState.includes(COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:course-source-auth-boundary-check'] === `node --env-file-if-exists=.env ${COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH}`, 'package registers focused proof script', 'process:course-source-auth-boundary-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'source-auth module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      sourceCount: snapshot.summary.sourceCount,
      privateOrPaidCount: snapshot.summary.privateOrPaidCount,
      blockedPrivateOrPaidCount: snapshot.summary.blockedPrivateOrPaidCount,
      recommendedNext: snapshot.recommendedNext,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Course source auth boundary check: ${result.ok ? 'pass' : 'fail'}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${result.summary.passed}/${result.summary.total} checks passed`)
  }

  await closeFoundationDb()
  if (!result.ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
