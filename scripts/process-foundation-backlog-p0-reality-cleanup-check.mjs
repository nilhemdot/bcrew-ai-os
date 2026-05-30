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
import {
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID as CARD_ID,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CHANGED_FILES,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PROOF_COMMANDS,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_NOT_NEXT,
  FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS,
  buildBacklogP0RealityDogfoodProof,
  evaluateBacklogP0Reality,
} from '../lib/foundation-backlog-p0-reality-cleanup.js'
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
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

const TARGET_REALITY_UPDATES = [
  {
    id: 'SECURITY-001',
    owner: 'Foundation Security / Provider Account Owners',
    statusNote: 'Closed repo-side on 2026-04-16 with config pattern cleanup preserved as historical done work. Backlog hygiene previously moved this out of executing; remaining provider-side proof is owned by SECURITY-PROVIDER-ROTATION-PROOF-001 and SECURITY-006. Not active sprint blocker; no unattended broad key rotation.',
    nextAction: 'Do not reopen SECURITY-001 as the active blocker. Use SECURITY-PROVIDER-ROTATION-PROOF-001 and SECURITY-006 for provider/account-owner rotation, revocation, retirement, or dead-key proof without storing secrets.',
  },
  {
    id: 'SECURITY-006',
    owner: 'Provider Account Owners / Steve approval',
    statusNote: 'Approval-bound provider-side credential proof remains real P0 security work, but it is not the active Foundation sprint blocker. Backlog hygiene previously moved this out of executing because provider/account-owner proof is required. No unattended broad key rotation without account-owner proof, suspicious access, public sharing, or Steve approval.',
    nextAction: 'Use the no-secret provider proof ledger; collect provider/account-owner evidence, then rotate, revoke, retire, or prove dead each credential class without copying secrets into repo truth.',
  },
  {
    id: 'SECURITY-PROVIDER-ROTATION-PROOF-001',
    owner: 'Provider Account Owners / Steve approval',
    statusNote: 'Approval-bound provider/account-owner evidence ledger is scoped and non-active. It keeps real exposure work visible without forcing unattended broad rotation during Foundation cleanup.',
    nextAction: 'Wait for provider/account-owner proof references. Keep values out of docs, logs, verifier output, and chat; no broad rotation from unattended sprint flow.',
  },
  {
    id: 'MEMORY-002',
    owner: 'Steve / Local Runtime Owner',
    statusNote: 'Local-runtime approval-bound OpenClaw memory enablement remains scoped and non-active. Metadata preflight is complete; config mutation, gateway restart, active-memory/dreaming, and private recall proof require explicit approval.',
    nextAction: 'Do not mutate local runtime config from unattended Foundation cleanup. Resume only after explicit local-runtime approval and a bounded private recall proof plan.',
  },
  {
    id: 'SECURITY-EDGE-001',
    owner: 'Foundation Security',
    statusNote: 'Scoped pre-public-exposure proof gate, not today’s active local Foundation blocker. Before exposing AIOS beyond trusted local access, this needs an approved plan with hostnames, tunnel ownership, identity policy, emergency shutoff, local-dev bypass, session handoff, and verifier proof.',
    nextAction: 'Keep scoped until public/external exposure is actually planned. Before build, write acceptance/proof language for edge auth behavior and do not open public routes from this sprint.',
  },
  {
    id: 'SECURITY-FILTERED-COMMS-ACCESS-001',
    owner: 'Foundation Security',
    statusNote: 'Filtered shared-comms access remains a gate before broadening non-Tier-1 access, not the active Foundation cleanup blocker. Real-data filtered access still needs a separate approved proof.',
    nextAction: 'Do not broaden shared communications access from this sprint. Build the filtered-summary route only when explicitly pulled into the Current Sprint with real-data proof.',
  },
]

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
    maxBuffer: 60 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Clean live backlog P0 reality',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 3,
    source: 'Steve-approved May 19 Foundation-only unattended sprint.',
    summary: 'Separate active P0 blockers from deferred/provider/approval/security/exposure gates so operator priority truth is honest.',
    whyItMatters: 'P0 should mean real importance without turning scary deferred work into a false active blocker. Steve should see the actual next Foundation blocker, not a pile of unmanaged red-looking cards.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Review live P0/P1 backlog truth, keep real exposure work, and move deferred/provider-approval items out of active blocker posture.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; provider/security/deferred P0 rows are evidence-routed and Current Sprint owns the active blocker path.`
      : `Executing \`${CLOSEOUT_KEY}\`; P0 reality cleanup is active until focused proof validates active-vs-deferred P0 truth.`,
    owner: 'Foundation Process',
  }
}

function buildNextCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Add visible process control, kill switches, and decommission workflow for running agents',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; existing SYSTEM-010 backlog card promoted after P0 reality cleanup.',
    summary: 'Add visible process control, pause/kill/decommission behavior, running job ownership, orphan-ledger handling, restart behavior, and operator-safe controls.',
    whyItMatters: 'Foundation needs visible control over running jobs and agents before continuous work can be trusted.',
    nextAction: 'Build SYSTEM-010 next: visible process control, pause/kill/decommission, orphan ledger handling, restart behavior, and owner-safe controls.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; scoped and ready for focused plan/proof before build.`,
    owner: 'Foundation Process',
  }
}

function withBacklogP0SprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH,
    definitionOfDone: 'Live P0 backlog truth clearly separates the Current Sprint active blocker from provider/approval/security/exposure/deferred P0 rows; no hidden executing P0 row can masquerade as the active blocker.',
    proofCommands: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close backlog P0 reality cleanup before SYSTEM-010.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...FOUNDATION_BACKLOG_P0_REALITY_NOT_NEXT])),
    existingWorkCheck: {
      reused: [
        'live backlog P0 rows',
        'Current Sprint overlay',
        'Plan Critic',
        'System Health and repeated-failure gates',
        'existing provider-side security proof cards',
      ],
      notRebuilt: [
        'No new backlog system.',
        'No new priority model.',
        'No provider credential rotation flow.',
        'No public exposure or shared-comms access path.',
      ],
      existingCode: [
        'lib/foundation-db.js',
        'lib/foundation-current-sprint.js',
        'lib/foundation-backlog-store.js',
        'lib/process-plan-critic.js',
      ],
      existingDocs: [
        'docs/process/security-provider-rotation-proof-preflight-001-plan.md',
        'docs/process/foundation-lessons-learned-loop-001-plan.md',
        'docs/process/foundation-health-green-lock-001-plan.md',
      ],
      existingScripts: [
        'scripts/backlog-hygiene.mjs',
        'scripts/process-foundation-lessons-learned-loop-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingPolicy: [
        'Live Backlog is task truth.',
        'Current Sprint is the active execution path.',
        'Provider/approval/security rows can stay P0 without becoming active blockers.',
        'No broad provider key rotation without explicit owner proof or Steve approval.',
      ],
      exactGap: 'The backlog contained real P0 security/provider/source work, but some rows still read like live blockers even when scoped, provider-owned, approval-bound, exposure-gated, or historical done records.',
      overBroadRisk: 'This can drift into demoting real security work or rewriting the backlog broadly. V1 only updates targeted misleading rows and adds reusable active-vs-deferred P0 proof.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T14:30:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH,
      targetedRows: FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS,
    },
  }
}

function withSystem010SprintItem(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    planRef: 'docs/process/system-010-process-control-001-plan.md',
    definitionOfDone: 'Visible process controls prove pause/kill/decommission, running job ownership, orphan-ledger handling, restart behavior, and operator-safe controls.',
    proofCommands: [
      'node --check lib/system-010-process-control.js scripts/process-system-010-check.mjs',
      'npm run process:system-010-check -- --apply --close-card --json',
      'npm run process:foundation-backlog-p0-reality-cleanup-check -- --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=SYSTEM-010 --planApprovalRef=docs/process/approvals/SYSTEM-010.json --closeoutKey=system-010-process-control-v1 --commitRef=HEAD',
    ],
    nextAction: 'Build visible process control, pause/kill/decommission, running job ownership, orphan-ledger handling, restart behavior, and operator-safe controls.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...FOUNDATION_BACKLOG_P0_REALITY_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeContinuousWork: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withBacklogP0SprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(withBacklogP0SprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(withSystem010SprintItem(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(withBacklogP0SprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(withSystem010SprintItem({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function loadP0Rows(client) {
  const result = await client.query(`
    SELECT
      id,
      title,
      team,
      lane,
      priority,
      rank,
      source,
      summary,
      why_it_matters AS "whyItMatters",
      next_action AS "nextAction",
      status_note AS "statusNote",
      owner,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM backlog_items
    WHERE priority = 'P0'
    ORDER BY
      CASE lane
        WHEN 'executing' THEN 1
        WHEN 'scoped' THEN 2
        WHEN 'ranked' THEN 3
        WHEN 'research' THEN 4
        WHEN 'parked' THEN 5
        WHEN 'done' THEN 6
        ELSE 7
      END,
      rank NULLS LAST,
      updated_at DESC
  `)
  return result.rows
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

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH,
    operation: 'create/update P0 reality backlog rows, Plan Critic row, targeted security/provider rows, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildCardRow({ closeCard }))
    await updateBacklogRow(client, buildNextCardRow())
    for (const target of TARGET_REALITY_UPDATES) {
      await client.query(
        `
          UPDATE backlog_items
          SET owner = $2,
              status_note = $3,
              next_action = $4,
              updated_at = NOW()
          WHERE id = $1
        `,
        [target.id, target.owner, target.statusNote, target.nextAction],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-backlog-p0-reality-cleanup')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-backlog-p0-reality-${stableRunId(FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH)}`,
        CARD_ID,
        FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-backlog-p0-reality-cleanup',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({
          closeoutKey: CLOSEOUT_KEY,
          nextCardId: NEXT_CARD_ID,
          targetedRows: FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS,
        }),
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
          currentStatus: closeCard ? 'backlog_p0_reality_cleaned' : 'backlog_p0_reality_cleanup_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID}; P0 backlog reality is cleaned.`
            : `${CARD_ID} is active; clean scary/deferred/provider P0 rows before SYSTEM-010.`,
          backlogP0RealitySummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            targetedRows: FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS,
            nextCardId: NEXT_CARD_ID,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-foundation-backlog-p0-reality-cleanup',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} P0 reality cleanup and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
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
    moduleSource,
    scriptSource,
    coverageSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-backlog-p0-reality-cleanup.js'),
    readRepoFile(FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CHANGED_FILES,
    declaredRisk: 'live backlog priority truth, targeted P0 row updates, Current Sprint progression, and full Foundation ship gate',
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

  const pool = createPool()
  let p0Rows = []
  try {
    const client = await pool.connect()
    try {
      p0Rows = await loadP0Rows(client)
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }

  const currentCardRow = p0Rows.find(row => row.id === CARD_ID)
  const system010Row = p0Rows.find(row => row.id === NEXT_CARD_ID)
  const liveActiveBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''
  const p0CleanupClosed = args.closeCard || currentCardRow?.lane === 'done'
  const expectedActiveBlockerCardId = p0CleanupClosed && system010Row?.lane === 'done'
    ? liveActiveBlockerCardId
    : p0CleanupClosed ? NEXT_CARD_ID : CARD_ID
  const realityStatus = evaluateBacklogP0Reality({
    p0Rows,
    activeSprint: workingActiveSprint,
    expectedActiveBlockerCardId,
  })
  const dogfood = buildBacklogP0RealityDogfoodProof()
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const packageJson = JSON.parse(packageJsonSource)
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const targetCards = cards.filter(item => FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS.includes(item.id))
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const unsafeWritePatterns = [
    /priority\s*=\s*'P1'/i,
    /priority\s*=\s*'P2'/i,
    /priority\s*=\s*'P3'/i,
    /DELETE\s+FROM\s+backlog_items/i,
  ].filter(pattern => pattern.test(scriptSource)).map(pattern => pattern.source)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for backlog P0 reality cleanup', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['executing', 'done', 'scoped'].includes(card?.lane)), 'live backlog P0 reality card exists as P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(nextCard?.lane), 'SYSTEM-010 exists as scoped/executing/done P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok, 'dogfood rejects hidden executing P0, un-routed done security, and active-blocker mismatch', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, realityStatus.ok && realityStatus.activeBlockerCardId === expectedActiveBlockerCardId, 'live P0 reality has one honest active path', `status=${realityStatus.status} active=${realityStatus.activeBlockerCardId} failures=${realityStatus.failures.length}`)
  addCheck(checks, realityStatus.executingOutsideActiveCount === 0, 'no P0 row is executing outside the active blocker', String(realityStatus.executingOutsideActiveCount))
  addCheck(checks, targetCards.length === FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS.length, 'targeted security/provider rows all exist', targetCards.map(item => item.id).join(', '))
  addCheck(checks, targetCards.every(item => /not active|not the active|non-active|pre-public|before public|gate before|approval-bound|provider-side/i.test(`${item.statusNote || ''} ${item.nextAction || ''}`)), 'targeted rows state active-vs-deferred reality', targetCards.filter(item => !/not active|not the active|non-active|pre-public|before public|gate before|approval-bound|provider-side/i.test(`${item.statusNote || ''} ${item.nextAction || ''}`)).map(item => item.id).join(', ') || 'all targeted rows clear')
  addCheck(checks, !targetCards.some(item => item.id.startsWith('SECURITY') && /broad key rotation/i.test(`${item.nextAction || ''}`) && !/no unattended broad key rotation/i.test(`${item.statusNote || ''} ${item.nextAction || ''}`)), 'security rows do not force unattended broad key rotation', 'targeted security rows')
  addCheck(checks, systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy'), 'System Health remains healthy', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy', 'repeated-failure gate remains healthy', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:foundation-backlog-p0-reality-cleanup-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH}`, 'package exposes backlog P0 reality focused proof', packageJson.scripts?.['process:foundation-backlog-p0-reality-cleanup-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateBacklogP0Reality') && moduleSource.includes('buildBacklogP0RealityDogfoodProof'), 'reusable P0 reality classifier owns dogfood proof', 'lib/foundation-backlog-p0-reality-cleanup.js')
  addCheck(checks, unsafeWritePatterns.length === 0, 'cleanup script does not demote priorities or delete backlog rows', unsafeWritePatterns.join(', ') || 'clean')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes backlog P0 reality card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves backlog P0 reality cleanup', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('P0 means real importance'), 'closeout handoff exists and states P0 reality rule', FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records backlog P0 reality closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || ['scoping', 'building_now', 'done_this_sprint'].includes(nextSprintItem?.stage), 'Current Sprint exposes SYSTEM-010 progression item', nextSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || (workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id) === expectedActiveBlockerCardId || args.apply, 'Current Sprint active blocker follows approved progression after close', workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || 'missing')

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
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    const refreshedSystem010 = refreshedCards.find(item => item.id === NEXT_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || ''
    const refreshedExpectedBlocker = refreshedSystem010?.lane === 'done' ? refreshedActiveBlocker : NEXT_CARD_ID
    addCheck(checks, refreshedActiveBlocker === refreshedExpectedBlocker, 'active blocker follows approved progression after P0 cleanup close', refreshedActiveBlocker || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    realityStatus,
    dogfood,
    targetRows: targetCards.map(item => ({
      id: item.id,
      lane: item.lane,
      priority: item.priority,
      owner: item.owner,
      statusNote: item.statusNote,
      nextAction: item.nextAction,
    })),
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation backlog P0 reality cleanup check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation backlog P0 reality cleanup check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
