#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH,
  FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH,
  FOUNDATION_MAIN_INTEGRATION_LOCK_CARD_ID as CARD_ID,
  FOUNDATION_MAIN_INTEGRATION_LOCK_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_MAIN_INTEGRATION_LOCK_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_MAIN_INTEGRATION_LOCK_NOT_NEXT,
  FOUNDATION_MAIN_INTEGRATION_LOCK_PLAN_PATH as PLAN_PATH,
  FOUNDATION_MAIN_INTEGRATION_LOCK_PROOF_COMMANDS,
  FOUNDATION_MAIN_INTEGRATION_LOCK_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID,
  FOUNDATION_MAIN_INTEGRATION_SPRINT_ID,
  buildFoundationMainIntegrationLockDogfoodProof,
  evaluateFoundationMainIntegrationLock,
} from '../lib/foundation-main-integration-lock.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const BASE_URL = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'

const CHANGED_FILES = [
  'lib/foundation-main-integration-lock.js',
  SCRIPT_PATH,
  FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH,
  PLAN_PATH,
  FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH,
  CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

const MAIN_INTEGRATION_EXISTING_WORK_CHECK = {
  existingCode: [
    'lib/foundation-main-integration-lock.js',
    'lib/foundation-runtime-supervisor.js',
    'lib/foundation-build-log.js',
    'lib/foundation-current-sprint.js',
  ],
  existingDocs: [
    PLAN_PATH,
    FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH,
    'docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
    CLOSEOUT_PATH,
  ],
  existingScripts: [
    SCRIPT_PATH,
    'scripts/foundation-verify.mjs',
    'scripts/process-foundation-ship.mjs',
    'scripts/backlog-hygiene.mjs',
  ],
  existingPolicy: [
    'Completed Foundation cards enter main instead of piling up on long-lived branches.',
    'Served dashboard and worker code must match the integration commit before the sprint continues.',
    'Completed Foundation side branches require an explicit release-train or side-commit route.',
    'Source/extraction activation stays behind main integration, merge-lane, health, and audit routing guardrails.',
  ],
  reused: [
    'Existing runtime supervisor served-code reporting.',
    'Existing build closeout registry.',
    'Existing Current Sprint overlay and Plan Critic gates.',
    'Existing process ship gate and backlog hygiene checks.',
  ],
  notRebuilt: [
    'No new extraction runner.',
    'No hidden worker system.',
    'No Drive permission mutation path.',
    'No branch deletion or side-commit merge.',
  ],
  exactGap: 'Foundation needed a blocking proof that main/origin/served-code/closeout truth agree and that completed Foundation work cannot stack on a side branch unnoticed.',
  overBroadRisk: 'This card can drift into branch cleanup, parallel builder launch, or source extraction. It stays limited to main integration truth and side-branch routing proof.',
  readyBy: 'Steve',
  readyAt: '2026-05-19T08:33:00-04:00',
}

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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
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

async function git(args = []) {
  const { stdout } = await execFile('git', args, { cwd: repoRoot, maxBuffer: 1024 * 1024 })
  return String(stdout || '').trim()
}

async function gitOk(args = []) {
  try {
    await execFile('git', args, { cwd: repoRoot, maxBuffer: 1024 * 1024 })
    return true
  } catch {
    return false
  }
}

async function branchCommitSubjects(branchName) {
  if (!branchName || branchName === 'main' || branchName === 'origin/main') return []
  const range = `origin/main..${branchName}`
  try {
    const output = await git(['log', '--format=%s', '--max-count=25', range])
    return output ? output.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

async function countRevisionRange(range) {
  try {
    const output = await git(['rev-list', '--count', range])
    const value = Number(output)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

async function buildBranchInventory() {
  const output = await git(['for-each-ref', '--format=%(refname:short)|%(objectname)', 'refs/heads', 'refs/remotes/origin'])
  const rows = []
  for (const line of output.split('\n').filter(Boolean)) {
    const [name, sha] = line.split('|')
    if (!name || name === 'origin' || name === 'origin/HEAD') continue
    const normalizedName = name === 'origin' ? 'origin/main' : name
    const isAncestorOfMain = await gitOk(['merge-base', '--is-ancestor', sha, 'origin/main'])
    const aheadOfMain = await countRevisionRange(`origin/main..${normalizedName}`)
    const behindMain = await countRevisionRange(`${normalizedName}..origin/main`)
    rows.push({
      name: normalizedName,
      sha,
      isAncestorOfMain,
      aheadOfMain,
      behindMain,
      commitSubjects: await branchCommitSubjects(normalizedName),
    })
  }
  return rows
}

async function fetchFoundationHubSummary() {
  const response = await fetch(`${BASE_URL}/api/foundation-hub?summary=1`)
  if (!response.ok) throw new Error(`Foundation Hub summary failed: ${response.status}`)
  return response.json()
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Foundation main integration lock',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 0,
    source: 'Steve 2026-05-19 Foundation green/main/audit/source activation sprint.',
    summary: 'Make main the enforced integration truth by proving local main, origin/main, served dashboard, served worker, closeout truth, and side-branch routing agree.',
    whyItMatters: 'The old builder allowed a 108-card branch pileup. Finished Foundation work must not sit outside main unnoticed again.',
    nextAction: closeCard
      ? 'Main integration lock is built. Continue with PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 and keep every completed bundle serialized through main.'
      : 'Build the main/origin/served-code/side-branch proof and route every non-main branch explicitly.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; main/origin/served-code alignment and side-branch routing are now checked before the sprint continues.`
      : 'Executing main integration lock. Source/extraction work stays blocked behind this guardrail.',
    owner: 'Foundation Process',
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
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-main-integration-lock')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-main-integration-lock-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-main-integration-lock',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID }),
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

function withMainIntegrationMetadata(item = {}, closeCard = false) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'main, origin/main, served dashboard, served worker, current closeout truth, and non-main branch routes agree; 108-card branch pileup dogfood fails closed.',
    proofCommands: FOUNDATION_MAIN_INTEGRATION_LOCK_PROOF_COMMANDS,
    nextAction: closeCard
      ? 'Continue to PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.'
      : 'Run the focused proof, full gates, close the card, commit, and push.',
    notNextBoundaries: FOUNDATION_MAIN_INTEGRATION_LOCK_NOT_NEXT,
    existingWorkCheck: {
      ...(item.existingWorkCheck || {}),
      ...MAIN_INTEGRATION_EXISTING_WORK_CHECK,
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH,
      sideBranchLedger: FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH,
    },
  }
}

function withNextCardMetadata(item = {}) {
  return {
    ...item,
    cardId: FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID,
    stage: 'scoping',
    definitionOfDone: 'Parallel/dual builder lanes require visible worktrees, file ownership, merge queue entry, serialized main merges, post-merge verification, and blocker handoff rules.',
    proofCommands: [
      'node --check lib/parallel-builder-operating-system.js lib/foundation-merge-queue.js',
      'npm run process:parallel-builder-operating-system-check -- --json',
      'npm run process:foundation-main-integration-lock-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    nextAction: 'Scope and then build the dual/parallel builder merge lane enforcement before health cleanup or extractor work.',
    notNextBoundaries: [
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
      'Do not start source/extraction feature work before merge-lane enforcement, health green/classification, and audit routing.',
      'Do not launch hidden workers or untracked parallel builders.',
      'Do not run live extraction, provider probes, credential repair, sends, or external writes.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/parallel-builder-operating-system.js',
        'lib/parallel-builder-worktree-protocol.js',
        'lib/foundation-merge-queue.js',
        'lib/foundation-main-integration-lock.js',
      ],
      existingDocs: [
        'docs/process/parallel-builder-operating-system-001-protocol.md',
        'docs/process/parallel-builder-worktree-protocol-001-plan.md',
        'docs/process/foundation-merge-queue-protocol.md',
        'docs/process/foundation-main-integration-lock-001-plan.md',
      ],
      existingScripts: [
        'scripts/process-parallel-builder-operating-system-check.mjs',
        'scripts/process-parallel-builder-worktree-protocol-check.mjs',
        'scripts/process-foundation-merge-queue-check.mjs',
        'scripts/process-foundation-main-integration-lock-check.mjs',
      ],
      existingPolicy: [
        'Completed cards enter a serialized merge lane before main.',
        'Parallel builders require visible chat/worktree/branch ownership.',
        'Shared files need explicit coordination.',
        'Main must be verified after merge before the queue continues.',
      ],
      reused: [
        'Existing parallel builder operating system contract.',
        'Existing worktree protocol validator.',
        'Existing merge queue evaluator.',
        'New main integration lock side-branch routing proof.',
      ],
      notRebuilt: [
        'No new hidden-worker runtime.',
        'No live extraction runner.',
        'No external-write lane.',
        'No Drive permission mutation.',
      ],
      exactGap: 'Prior protocols exist, but this sprint needs the dual/parallel lane to explicitly enforce merge queue entry, merge serialization, post-merge verification, and blocker handoff so 108-card stacking cannot recur.',
      overBroadRisk: 'This can drift into launching builders or source/extraction work. The next card must stay process enforcement and proof only.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T08:33:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeSourceActivation: true,
    },
  }
}

function buildSprintItems(previous = {}, closeCard = false) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const seen = new Set()
  const items = existing.map(item => {
    seen.add(item.cardId)
    if (item.cardId === CARD_ID) return withMainIntegrationMetadata(item, closeCard)
    if (item.cardId === FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID && closeCard) return withNextCardMetadata(item)
    return item
  })
  if (!seen.has(CARD_ID)) items.unshift(withMainIntegrationMetadata({ order: 1 }, closeCard))
  if (closeCard && !seen.has(FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID)) {
    items.splice(1, 0, withNextCardMetadata({ order: 2 }))
  }
  return items.map((item, index) => ({ ...item, order: item.order || index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update main integration backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: FOUNDATION_MAIN_INTEGRATION_SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'main_integration_locked' : 'locking_main_integration',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? 'Run PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 next; do not start source/extraction yet.'
            : 'Finish FOUNDATION-MAIN-INTEGRATION-LOCK-001.',
        },
      },
      items: buildSprintItems(previous, closeCard),
    },
    'codex-main-integration-lock',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved full-day Foundation green/main/audit/source sprint and made main integration the first guardrail.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'main integration truth, branch routing, served-code trust, and all-day builder guardrails',
    repoRoot,
  })

  await initFoundationDb()
  if (args.apply || args.closeCard) await ensureLiveState({ closeCard: args.closeCard, planReview })

  const [
    activeSprint,
    cards,
    planCriticRuns,
    sideBranchLedger,
    packageJson,
    closeoutDocExists,
    sprintDoc,
    processGateCloseoutSource,
    foundationHub,
    branches,
  ] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoJson(FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH),
    readRepoJson('package.json'),
    repoFileExists(CLOSEOUT_PATH),
    readRepoFile('docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    fetchFoundationHubSummary(),
    buildBranchInventory(),
  ])

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID) || null
  const head = await git(['rev-parse', 'HEAD'])
  const originMain = await git(['rev-parse', 'origin/main'])
  const mainContainsOriginMain = await gitOk(['merge-base', '--is-ancestor', 'origin/main', 'HEAD'])
  const currentBranch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const worktreeStatus = await git(['status', '--porcelain'])
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID) || null
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const [sprintCards, sprintPlanCriticRuns] = await Promise.all([
    getBacklogItemsByIds(sprintCardIds),
    getPlanCriticRunsByCardIds(sprintCardIds),
  ])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: sprintPlanCriticRuns,
  })
  const dashboardCommit = foundationHub.runtimeSupervisor?.servedCode?.runningCommit || ''
  const workerCommit = foundationHub.runtimeSupervisor?.workerCode?.runningCommit || ''
  const lockStatus = evaluateFoundationMainIntegrationLock({
    repo: {
      currentBranch,
      head,
      originMain,
      mainContainsOriginMain,
      worktreeClean: worktreeStatus.length === 0,
    },
    served: {
      dashboardCommit,
      workerCommit,
    },
    closeout: {
      recordExists: Boolean(closeout),
      handoffExists: closeoutDocExists,
      currentSprintCaptured: sprintDoc.includes(FOUNDATION_MAIN_INTEGRATION_SPRINT_ID),
    },
    branches,
    sideBranchLedger,
  })
  const dogfood = buildFoundationMainIntegrationLockDogfoodProof()

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for main integration lock', `${planReview.status}/${planReview.score}`)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, args.closeCard ? card?.lane === 'done' : ['executing', 'done'].includes(card?.lane), 'main integration lock card exists in expected lane', card?.lane || 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next parallel merge-lane enforcement card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, lockStatus.status === 'healthy', 'main/origin/served-code/branch routing lock is healthy', lockStatus.findings.map(finding => `${finding.key}:${finding.detail}`).join('; ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood catches stale served code and 108-card branch pileup', dogfood.invariant)
  addCheck(checks, activeSprint.sprint?.sprintId === FOUNDATION_MAIN_INTEGRATION_SPRINT_ID, 'Current Sprint stays on green/main/audit/source activation sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, closeCardExpectation(args.closeCard, currentSprintItem, nextSprintItem), 'Current Sprint advances only from main lock to parallel merge-lane enforcement', `${currentSprintItem?.stage || 'missing'} -> ${nextSprintItem?.stage || 'missing'}`)
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status remains healthy after main lock update', currentSprintStatus.findings.map(finding => `${finding.check}:${finding.detail}`).join('; ') || currentSprintStatus.cadence.currentStatus)
  addCheck(checks, packageJson.scripts?.['process:foundation-main-integration-lock-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-main-integration-lock-check'] || 'missing')
  addCheck(checks, processGateCloseoutSource.includes(CLOSEOUT_KEY) && processGateCloseoutSource.includes(CARD_ID), 'closeout registry includes main integration lock record', 'lib/foundation-build-closeout-process-gate-records.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves main integration lock closeout', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH) && sideBranchLedger.schemaVersion === 1, 'side-branch routing ledger exists', FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH)
  addCheck(checks, !/startExtractionRun\s*\(|sendGmail|writeClickUp|spawn_agent/.test(planSource + processGateCloseoutSource), 'card does not introduce extraction, external-write, or hidden-worker path', 'process guardrail only')

  const result = {
    status: checks.every(check => check.ok) ? 'healthy' : 'risk',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    lockStatus,
    dogfood,
    checks,
    failed: checks.filter(check => !check.ok),
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation main integration lock check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (result.failed.length) process.exitCode = 1
}

function closeCardExpectation(closeCard, currentSprintItem, nextSprintItem) {
  if (closeCard) return currentSprintItem?.stage === 'done_this_sprint' && ['scoping', 'sprint_ready', 'building_now'].includes(nextSprintItem?.stage)
  return ['building_now', 'done_this_sprint'].includes(currentSprintItem?.stage)
}

main()
  .catch(error => {
    console.error('Foundation main integration lock check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
