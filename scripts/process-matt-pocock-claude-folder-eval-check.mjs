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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_APPROVAL_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CHANGED_FILES,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_PROOF_COMMANDS,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH,
  MATT_POCOCK_CLAUDE_FOLDER_EVAL_SPRINT_ID,
  MATT_POCOCK_GITHUB_REPO,
  MATT_POCOCK_GITHUB_URL,
  MATT_POCOCK_NOT_NEXT_BOUNDARIES,
  buildMattPocockClaudeFolderEvalDogfoodProof,
  buildMattPocockClaudeFolderEvalSnapshot,
  renderMattPocockClaudeFolderEvalReport,
} from '../lib/matt-pocock-claude-folder-eval.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
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

async function fileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-intel-watchlist.js',
      'lib/youtube-build-intel-batch.js',
      'lib/course-source-auth-boundary.js',
      'lib/matt-pocock-claude-folder-eval.js',
    ],
    existingDocs: [
      'docs/process/build-intel-creator-watchlist-expansion-001-plan.md',
      'docs/process/youtube-build-intel-batch-001-plan.md',
      'docs/process/course-source-auth-boundary-001-plan.md',
      'docs/process/mark-kashef-goal-build-intel-packet-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-youtube-build-intel-batch-check.mjs',
      'scripts/process-mark-kashef-goal-build-intel-packet-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingCards: [
      'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001',
      'YOUTUBE-BUILD-INTEL-BATCH-001',
      'MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001',
      MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    ],
    existingPolicy: [
      'Public GitHub metadata and public raw files may be inspected for source classification.',
      'Public YouTube extraction, paid course access, private auth, model calls, and downstream writes remain approval-bound.',
      'Source patterns route to packet/proposal/review only; they are not imported into AIOS runtime by this card.',
    ],
    reused: [
      'Matt Pocock creator watchlist entry',
      'YouTube Build Intel queue spec',
      'Course source-auth boundary',
      'Foundation focused proof and closeout pattern',
    ],
    notRebuilt: [
      'No skills installer.',
      'No GitHub extractor.',
      'No YouTube extractor.',
      'No Claude/Codex skill runtime adapter.',
      'No Research Inbox/KB/atom/action writer.',
    ],
    exactGap: 'Matt Pocock / Total TypeScript public skills repo needs a source-backed eval packet before AIOS copies or adapts any pattern.',
    overBroadRisk: 'This can drift into installing skills, copying raw prompts, course extraction, or downstream implementation. V1 is public source eval and proposal-only transfer map.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T19:15:00.000-04:00',
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    title: 'Evaluate Matt Pocock Claude folder agent-engineering repo',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 16,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Evaluate Matt Pocock/Total TypeScript public skills repo as a Build Intel source from public GitHub metadata and selected repo files without installing, copying blindly, or mutating downstream outputs.',
    whyItMatters: 'Steve flagged this as a strong agent-engineering pattern source. AIOS should learn the transferable public-source patterns while keeping Foundation as source truth and avoiding vendor lock-in or blind prompt copying.',
    nextAction: closeCard
      ? `Done under ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY}. Continue ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID} from repo truth.`
      : 'Verify public repo/source/license details, inspect agent instructions/commands/markdown-memory patterns, record unverified claims, and keep install/extraction/downstream writes blocked.',
    statusNote: closeCard
      ? `Closed under \`${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY}\`; public GitHub/source eval is ready and install/extraction/import/downstream writes remain approval-bound.`
      : `Executing under \`${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY}\`; public source eval only, no install/import/extraction.`,
    owner: 'Steve + Foundation',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH,
    definitionOfDone: 'Public GitHub/source eval packet exists for mattpocock/skills, license and lookup-time metadata are recorded, skills/commands/markdown-memory patterns are classified, 90-day context claim is blocked as unverified, dogfood rejects install/copy/extraction/downstream writes, and ship gate passes.',
    proofCommands: MATT_POCOCK_CLAUDE_FOLDER_EVAL_PROOF_COMMANDS,
    readinessBlockerCleared: 'MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 closed the prior public source packet and advanced this card from repo truth.',
    notNextBoundaries: MATT_POCOCK_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: MATT_POCOCK_CLAUDE_FOLDER_EVAL_APPROVAL_PATH,
      closeoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
      packetRef: MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH,
      sourceUrl: MATT_POCOCK_GITHUB_URL,
      repo: MATT_POCOCK_GITHUB_REPO,
      publicSourceEvalOnly: true,
      installApproved: false,
      liveExtractionApproved: false,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Foundation KB/action review queue is scoped from repo truth without live extraction, auth-required/paid runs, model calls, external writes, Drive permission mutation, Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work.',
    proofCommands: [
      'scope-first: reconcile shipped KB/compiler/action-route cards before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID} closed public source eval and build-lane reliability is green.`,
    notNextBoundaries: MATT_POCOCK_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
      nextAfterCloseoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
      liveExtractionApproved: false,
      externalWritesApproved: false,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-matt-pocock-claude-folder-eval')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `matt-pocock-claude-folder-eval-${stableRunId(MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH)}`,
        MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
        MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH,
        planReview.status,
        planReview.score,
        MATT_POCOCK_CLAUDE_FOLDER_EVAL_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planReview),
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
    scriptPath: MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH,
    operation: 'create/update Matt Pocock eval card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_SPRINT_ID,
        status: 'active',
        goal: 'Close Matt Pocock public Claude folder/source eval without install, extraction, import, or implementation drift.',
        activeBlockerCardId: closeCard ? MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID : MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-matt-pocock-claude-folder-eval',
          currentStatus: closeCard ? 'done_ready_for_next_repo_truth' : stage,
          closeoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Continue the next safe Foundation-up backlog card from repo truth.'
            : 'Write Matt Pocock public source eval packet and keep install/extraction/import blocked.',
          priorityOrder: [
            MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
            MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID,
          ],
          notNext: MATT_POCOCK_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Public GitHub repo metadata, commit, license, and skill catalog shape are recorded.',
            'Commands/skills/markdown-memory patterns are classified without copying raw skills.',
            '90-day context handling remains blocked as unverified because the public repo scan did not find it.',
            'Dogfood rejects install, plugin/symlink writes, raw content copy, extraction, false 90-day claim, and downstream writes.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-matt-pocock-claude-folder-eval',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized Matt Pocock public Claude folder/source eval after Mark Kashef packet.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(MATT_POCOCK_CLAUDE_FOLDER_EVAL_PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })

  if (args.apply || args.closeCard) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })
  }

  const [
    cards,
    activeSprint,
    planCriticRuns,
    closeouts,
    approvalIntegrity,
    packageJsonSource,
    verifierSource,
    closeoutRegistrySource,
    packetDoc,
    closeoutDocExists,
    currentPlan,
    currentState,
  ] = await Promise.all([
    getBacklogItemsByIds([MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID, MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID]),
    getFoundationBuildCloseouts(),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: MATT_POCOCK_CLAUDE_FOLDER_EVAL_APPROVAL_PATH,
      cardId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    }),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH),
    fileExists(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const card = cards.find(item => item.id === MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID) || null
  const nextCard = cards.find(item => item.id === MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID)
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID)
  const planCriticRun = (planCriticRuns || []).find(run => run.cardId === MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID)
  const closeout = closeouts.find(record => record.key === MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY)
  const packageScripts = JSON.parse(packageJsonSource).scripts || {}
  const snapshot = buildMattPocockClaudeFolderEvalSnapshot()
  const dogfood = buildMattPocockClaudeFolderEvalDogfoodProof()
  const renderedReport = renderMattPocockClaudeFolderEvalReport(snapshot)
  const expectedLane = args.closeCard ? 'done' : args.apply ? 'executing' : card?.lane
  const expectedStage = args.closeCard ? 'done_this_sprint' : args.apply ? args.stage : sprintItem?.stage
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Matt Pocock eval plan', `${planCritic.status} ${planCritic.score}/10`)
  addCheck(checks, planCritic.findings.length === 0, 'Plan Critic has no findings', planCritic.findings.map(finding => finding.key).join(', ') || 'none')
  addCheck(checks, approvalIntegrity.ok, 'approval integrity passes', approvalIntegrity.failures?.map(failure => failure.check).join(', ') || approvalIntegrity.mode)
  addCheck(checks, snapshot.ok && snapshot.status === 'ready', 'source eval snapshot is ready', `failures=${snapshot.failures.length}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Matt Pocock eval variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, snapshot.sourcePacket.repo.fullName === MATT_POCOCK_GITHUB_REPO && snapshot.sourcePacket.repo.url === MATT_POCOCK_GITHUB_URL, 'source packet records exact repo identity', `${snapshot.sourcePacket.repo.fullName} ${snapshot.sourcePacket.repo.url}`)
  addCheck(checks, snapshot.sourcePacket.repo.license === 'MIT', 'source packet records MIT license', snapshot.sourcePacket.repo.license)
  addCheck(checks, snapshot.sourcePacket.plugin.exposedSkillCount === 14 && snapshot.sourcePacket.tree.skillFileCount >= 20, 'source packet captures skill catalog shape', `${snapshot.sourcePacket.plugin.exposedSkillCount}/${snapshot.sourcePacket.tree.skillFileCount}`)
  addCheck(checks, snapshot.sourcePacket.sourceClaims.ninetyDayContextHandlingVerified === false && snapshot.sourcePacket.sourceClaims.noNinetyDayContextPatternFound === true, '90-day context claim stays blocked/unverified', JSON.stringify(snapshot.sourcePacket.sourceClaims))
  addCheck(checks, snapshot.summary.unsafeSideEffectCount === 0 && snapshot.summary.copiedContentViolationCount === 0 && snapshot.summary.unsafeWriteCount === 0, 'snapshot has no install/copy/write side effects', JSON.stringify(snapshot.summary))
  addCheck(checks, packetDoc.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY) && packetDoc.includes('90-day context-retention pattern'), 'packet doc records closeout and unverified 90-day context claim', MATT_POCOCK_CLAUDE_FOLDER_EVAL_PACKET_PATH)
  addCheck(checks, renderedReport.includes(MATT_POCOCK_GITHUB_REPO) && renderedReport.includes('No 90-day context-retention pattern'), 'report renderer emits source identity and blocked claim', 'renderMattPocockClaudeFolderEvalReport')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, !expectedLane || card?.lane === expectedLane, 'live backlog card lane matches requested stage', card ? `${card.lane}/${expectedLane}` : 'missing')
  addCheck(checks, !args.closeCard || String(card?.statusNote || '').includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY), 'done card status note names closeout key', card?.statusNote || 'missing')
  addCheck(checks, Boolean(sprintItem), 'Current Sprint includes Matt Pocock card', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, !expectedStage || sprintItem?.stage === expectedStage, 'Current Sprint stage matches requested stage', sprintItem ? `${sprintItem.stage}/${expectedStage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane)), 'next Foundation KB/action review card exists after closeout', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint advances next Foundation KB/action review card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  addCheck(checks, Boolean(planCriticRun) && planCriticRun.status === 'pass' && Number(planCriticRun.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'live Plan Critic run is stored', planCriticRun ? `${planCriticRun.status} ${planCriticRun.score}` : 'missing')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID), 'closeout registry links Matt Pocock card', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDocExists, 'handoff closeout doc exists', MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_PATH)
  addCheck(checks, packageScripts['process:matt-pocock-claude-folder-eval-check'] === `node --env-file-if-exists=.env ${MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH}`, 'package script is registered', packageScripts['process:matt-pocock-claude-folder-eval-check'] || 'missing')
  addCheck(checks, verifierSource.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID) && verifierSource.includes('buildMattPocockClaudeFolderEvalDogfoodProof'), 'foundation verifier covers Matt Pocock eval', 'verifier source')
  addCheck(checks, closeoutRegistrySource.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY), 'closeout registry contains Matt Pocock closeout', 'registry source')
  addCheck(checks, currentPlan.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY) && currentPlan.includes('Do not install'), 'current plan records closeout and install boundary', 'current-plan')
  addCheck(checks, currentState.includes(MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY) && currentState.includes('90-day context'), 'current state records closeout and unverified claim', 'current-state')
  addCheck(checks, lineCount(packetDoc) < 140, 'packet doc stays under explicit artifact budget', `${lineCount(packetDoc)} lines`)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
    closeoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
    checkedAt: new Date().toISOString(),
    checks,
    failures,
    summary: {
      passed: checks.length - failures.length,
      total: checks.length,
      stage: args.stage,
      liveLane: card?.lane || null,
      sprintStage: sprintItem?.stage || null,
      planCritic: `${planCritic.status} ${planCritic.score}/10`,
      sourceStatus: snapshot.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Matt Pocock Claude folder eval check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${result.summary.passed}/${result.summary.total} checks passed`)
  }

  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
