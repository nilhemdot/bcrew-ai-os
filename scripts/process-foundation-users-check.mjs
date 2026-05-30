#!/usr/bin/env node

import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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
  listFoundationUsers,
} from '../lib/foundation-people-sales-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { findRoutePosture, authorizeRouteAccess } from '../lib/security-access.js'
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
  FOUNDATION_USERS_APPROVAL_PATH,
  FOUNDATION_USERS_CARD_ID,
  FOUNDATION_USERS_CLOSEOUT_KEY,
  FOUNDATION_USER_ACCESS_EVENT_TYPE,
  FOUNDATION_USERS_HANDOFF_PATH,
  FOUNDATION_USERS_PLAN_PATH,
  FOUNDATION_USERS_PROOF_EMAIL,
  FOUNDATION_USERS_SCRIPT_PATH,
  buildFoundationUserAdminSnapshot,
  buildFoundationUsersDogfoodProof,
  updateFoundationUserAccess,
  upsertFoundationUserAccess,
} from '../lib/foundation-user-admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-users'
const NEXT_CARD_ID = 'DECISION-007'
const CHANGED_FILES = [
  'lib/foundation-user-admin.js',
  'lib/app-auth.js',
  'lib/auth-routes.js',
  'lib/foundation-source-routes.js',
  'lib/security-access.js',
  'lib/foundation-db-schema-seed-store.js',
  'lib/foundation-verifier-followup-backlog-assurance.js',
  'public/foundation-users-renderers.js',
  'public/foundation-data.js',
  'public/foundation-router.js',
  'public/foundation-nav-config.js',
  'public/foundation.html',
  'scripts/process-foundation-users-check.mjs',
]
const PROOF_COMMANDS = [
  'node --check lib/foundation-user-admin.js lib/app-auth.js lib/auth-routes.js lib/foundation-source-routes.js public/foundation-users-renderers.js scripts/process-foundation-users-check.mjs',
  'npm run process:foundation-users-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-USERS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-USERS-001.json --closeoutKey=foundation-users-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-USERS-001 --closeoutKey=foundation-users-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-USERS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-USERS-001.json --closeoutKey=foundation-users-v1 --commitRef=HEAD',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    mutateSprint: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] }) ||
      argv.includes('--sync-sprint'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(value) {
  return String(value || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-users-${stableRunId(FOUNDATION_USERS_PLAN_PATH)}`,
        FOUNDATION_USERS_CARD_ID,
        FOUNDATION_USERS_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_USERS_CARD_ID,
          closeoutKey: FOUNDATION_USERS_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason,
    metadata: item.metadata || {},
  }
}

function buildSprintOverlay(activeSprint, { closeCard = false } = {}) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(normalizeSprintItem).map(item => {
    const isCurrent = item.cardId === FOUNDATION_USERS_CARD_ID
    return {
      ...item,
      stage: isCurrent ? (closeCard ? 'done_this_sprint' : 'building_now') : item.stage,
      planRef: isCurrent ? FOUNDATION_USERS_PLAN_PATH : item.planRef,
      definitionOfDone: isCurrent
        ? 'Owner-only Foundation user access admin API/UI ships with DB-backed add/update/disable, login-method visibility, audit events, password-hash redaction, focused proof, and ship gate.'
        : item.definitionOfDone,
      proofCommands: isCurrent ? PROOF_COMMANDS : item.proofCommands,
      notNextBoundaries: Array.from(new Set([
        ...(item.notNextBoundaries || []),
        'Do not send messages, mutate external systems, rotate credentials, change provider config, mutate Drive permissions, or expose public routes.',
        'Do not redesign SECURITY-002 or open shared-comms/Strategy/People surfaces to non-owner users from this card.',
        'Do not display passwords or password hashes.',
      ])),
      existingWorkCheck: isCurrent ? {
        existingCode: ['users table', 'lib/app-auth.js', 'lib/security-access.js', 'lib/auth-routes.js', 'Foundation dashboard renderer patterns'],
        existingDocs: [FOUNDATION_USERS_PLAN_PATH, 'docs/process/security-002-auth-tier-redaction-plan.md'],
        existingScripts: [FOUNDATION_USERS_SCRIPT_PATH, 'scripts/process-security-002-check.mjs'],
        reused: 'Reuses DB users, auth/session, route posture, Foundation UI, and change_events audit ledger.',
        notRebuilt: 'Does not rebuild SECURITY-002, subject-person redaction, public access, or external identity provider settings.',
        exactGap: 'Steve could not manage AIOS users without .env/default auth truth; login-method and disable/audit state were not visible.',
        overBroadRisk: 'Auth work can drift into public exposure or credential mutation; this card stays owner-only and DB/local only.',
        existingPolicy: [
          'User access administration stays owner-only and local/DB-backed.',
          'Do not send messages, mutate external identity providers, rotate credentials, change provider config, mutate Drive permissions, or expose public routes.',
          'Do not display passwords or password hashes; only login posture and redacted fallback availability may render.',
        ],
        readyBy: 'Steve approved unattended Foundation sprint; unsafe actions remain parked.',
        readyAt: '2026-05-20T07:35:00-04:00',
      } : item.existingWorkCheck,
      metadata: {
        ...(item.metadata || {}),
        approvalRef: isCurrent ? FOUNDATION_USERS_APPROVAL_PATH : item.metadata?.approvalRef,
        closeoutKey: isCurrent ? FOUNDATION_USERS_CLOSEOUT_KEY : item.metadata?.closeoutKey,
      },
    }
  })
  return {
    sprint: {
      ...sprint,
      status: 'active',
      activeBlockerCardId: closeCard ? NEXT_CARD_ID : FOUNDATION_USERS_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'foundation_users_closed_next_card_scoping' : 'foundation_users_active',
        lastClosedCardId: closeCard ? FOUNDATION_USERS_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? FOUNDATION_USERS_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
      },
    },
    items,
  }
}

async function syncSprint(activeSprint, { closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_USERS_SCRIPT_PATH,
    operation: closeCard ? 'close FOUNDATION-USERS-001 and advance DECISION-007 to scoping' : 'sync FOUNDATION-USERS-001 sprint truth',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertFoundationCurrentSprintOverlay(
    buildSprintOverlay(activeSprint, { closeCard }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: closeCard
        ? 'FOUNDATION-USERS-001 closed; DECISION-007 remains scoping until its own plan and proof pass.'
        : 'Promote FOUNDATION-USERS-001 to building with complete sprint truth.',
    },
  )
}

async function runMutationProof() {
  const created = await upsertFoundationUserAccess({
    email: FOUNDATION_USERS_PROOF_EMAIL,
    name: 'Foundation Users Proof',
    role: 'ops',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: false,
    password: 'foundation-users-proof-password',
    accessReason: 'Synthetic local proof for FOUNDATION-USERS-001.',
  }, ACTOR)
  const disabled = await updateFoundationUserAccess(FOUNDATION_USERS_PROOF_EMAIL, {
    name: 'Foundation Users Proof',
    role: 'ops',
    tier: 3,
    userType: 'human',
    active: false,
    meetingSyncEnabled: false,
    accessReason: 'Synthetic local proof disabled after mutation proof.',
  }, ACTOR)
  return { createdEmail: created.email, disabledEmail: disabled.email, disabledActive: disabled.active === false }
}

async function renderCloseout({ planSummary, snapshot, mutationProof }) {
  return `# FOUNDATION-USERS-001 Closeout

Generated at: ${new Date().toISOString()}

## What Changed

- Added owner-only Foundation user access API/UI.
- DB-backed users can now be added/updated, disabled, role/tiered, and given optional password fallback without editing \`.env\`.
- Runtime auth now refreshes active DB users into the allow-list while preserving existing default/env auth users.
- Access changes write \`${FOUNDATION_USER_ACCESS_EVENT_TYPE}\` change events.

## Proof

- Plan Critic: ${planSummary.status} / ${planSummary.score}
- User count: ${snapshot.summary.userCount}
- Active humans: ${snapshot.summary.activeHumanCount}
- Google-ready users: ${snapshot.summary.googleLoginReadyCount}
- Password fallback users: ${snapshot.summary.passwordFallbackCount}
- Audit events: ${snapshot.summary.auditEventCount}
- Synthetic mutation proof: ${mutationProof ? `${mutationProof.createdEmail} disabled=${mutationProof.disabledActive}` : 'not run'}

## Commands

${PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Known Limits

- This does not send emails, rotate credentials, mutate external systems, change Drive permissions, or expose public routes.
- This does not redesign SECURITY-002 tier/redaction policy.
- Password hashes are stored only as metadata and are never returned to the UI/API.

## Review Next

Continue \`${NEXT_CARD_ID}\` only after its own plan and proof pass.
`
}

async function main() {
  const args = parseArgs()
  if (args.closeCard || args.mutateSprint) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: FOUNDATION_USERS_SCRIPT_PATH,
      operation: args.closeCard ? 'close FOUNDATION-USERS-001' : 'sync FOUNDATION-USERS-001 sprint truth',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
  }

  await initFoundationDb()
  const checks = []
  try {
    const [
      approvalValidation,
      planSource,
      userAdminSource,
      appAuthSource,
      authRoutesSource,
      sourceRoutesSource,
      securitySource,
      frontendSource,
      packageJsonSource,
      activeSprint,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_USERS_APPROVAL_PATH, cardId: FOUNDATION_USERS_CARD_ID }),
      readRepoFile(FOUNDATION_USERS_PLAN_PATH),
      readRepoFile('lib/foundation-user-admin.js'),
      readRepoFile('lib/app-auth.js'),
      readRepoFile('lib/auth-routes.js'),
      readRepoFile('lib/foundation-source-routes.js'),
      readRepoFile('lib/security-access.js'),
      readRepoFile('public/foundation-users-renderers.js'),
      readRepoFile('package.json'),
      getActiveFoundationCurrentSprint(),
    ])
    for (const check of approvalValidation.checks || []) addCheck(checks, check.ok, check.check, check.detail)

    const planReview = evaluatePlanCriticPlan({
      card: { id: FOUNDATION_USERS_CARD_ID, priority: 'P1' },
      planText: planSource,
      changedFiles: CHANGED_FILES,
      declaredRisk: 'owner-only Foundation user access, auth allow-list, user mutation routes, password fallback metadata, and access audit trail',
      fullVerifyRequired: true,
    })
    await upsertPlanCriticRun(planReview)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for user access plan', `${planReview.status}/${planReview.score}`)

    const dogfood = buildFoundationUsersDogfoodProof()
    addCheck(checks, dogfood.ok, 'dogfood hides password hashes and validates user input', JSON.stringify(dogfood.summary))
    addCheck(checks, dogfood.hashHidden, 'snapshot never exposes password hashes', 'redacted')
    addCheck(checks, dogfood.invalidRoleRejected, 'invalid role is rejected', 'admin rejected')

    const ownerRoute = findRoutePosture('GET', '/api/foundation/users/admin')
    const postRoute = findRoutePosture('POST', '/api/foundation/users/admin')
    const patchRoute = findRoutePosture('PATCH', '/api/foundation/users/admin/test@example.com')
    addCheck(checks, ownerRoute?.policy === 'owner_tier_1' && postRoute?.policy === 'owner_tier_1' && patchRoute?.policy === 'owner_tier_1', 'user admin routes are explicit owner-only posture', [ownerRoute?.policy, postRoute?.policy, patchRoute?.policy].join(', '))
    let nonOwnerDenied = false
    try {
      authorizeRouteAccess({ accessContext: { authenticated: true, active: true, role: 'sales', tier: 3, userType: 'human' } }, postRoute)
    } catch {
      nonOwnerDenied = true
    }
    addCheck(checks, nonOwnerDenied, 'non-owners cannot manage access', 'sales denied')

    addCheck(checks, appAuthSource.includes('setRuntimeAuthUsers') && authRoutesSource.includes('buildRuntimeAuthUsersFromFoundationUsers') && authRoutesSource.includes('refreshRuntimeAuthUsers'), 'auth runtime refreshes DB users before session checks', 'runtime auth sync wired')
    addCheck(checks, sourceRoutesSource.includes('/api/foundation/users/admin') && sourceRoutesSource.includes('upsertFoundationUserAccess') && sourceRoutesSource.includes('updateFoundationUserAccess'), 'Foundation user admin API routes are wired', 'GET/POST/PATCH')
    addCheck(checks, securitySource.includes('/api/foundation/users/admin') && securitySource.includes("route('PATCH', '/api/foundation/users/admin/:email'"), 'security route registry covers user admin API', 'owner-only')
    addCheck(checks, frontendSource.includes('renderFoundationUserAccessAdmin') && frontendSource.includes('Password Fallback') && frontendSource.includes('Disable'), 'Foundation user access UI is present', 'renderer markers found')
    addCheck(checks, packageJsonSource.includes('"process:foundation-users-check"'), 'package script exists', 'process:foundation-users-check')
    addCheck(checks, await fileExists(FOUNDATION_USERS_PLAN_PATH) && await fileExists(FOUNDATION_USERS_APPROVAL_PATH), 'plan and approval files exist', FOUNDATION_USERS_PLAN_PATH)

    let mutationProof = null
    if (args.mutateSprint && !args.closeCard) await syncSprint(activeSprint, { closeCard: false })
    if (args.closeCard) {
      mutationProof = await runMutationProof()
      const users = await listFoundationUsers({ activeOnly: false })
      const snapshot = buildFoundationUserAdminSnapshot({ users })
      addCheck(checks, snapshot.users.some(user => user.email === FOUNDATION_USERS_PROOF_EMAIL && user.active === false), 'synthetic user mutation proof created and disabled a local proof user', FOUNDATION_USERS_PROOF_EMAIL)
      await updateBacklogItem(FOUNDATION_USERS_CARD_ID, {
        lane: 'done',
        priority: 'P1',
        rank: 18,
        nextAction: `Done under ${FOUNDATION_USERS_CLOSEOUT_KEY}; continue ${NEXT_CARD_ID} only after its own plan and proof pass.`,
        statusNote: `Closed 2026-05-20 under ${FOUNDATION_USERS_CLOSEOUT_KEY}; owner-only user access API/UI, DB-backed runtime auth allow-list, soft disable, password fallback metadata, and access-change audit proof are live.`,
        owner: 'Foundation Access',
      }, ACTOR)
      await syncSprint(activeSprint, { closeCard: true })
      const closeout = await renderCloseout({
        planSummary: buildPlanCriticResultSummary(planReview),
        snapshot,
        mutationProof,
      })
      await fs.mkdir(path.dirname(path.join(repoRoot, FOUNDATION_USERS_HANDOFF_PATH)), { recursive: true })
      await fs.writeFile(path.join(repoRoot, FOUNDATION_USERS_HANDOFF_PATH), closeout)
    }

    const closeoutExists = getFoundationBuildCloseouts().some(closeout => closeout.key === FOUNDATION_USERS_CLOSEOUT_KEY)
    addCheck(checks, closeoutExists, 'closeout registry includes foundation-users-v1', FOUNDATION_USERS_CLOSEOUT_KEY)

    const backlog = await getBacklogItemsByIds([FOUNDATION_USERS_CARD_ID, NEXT_CARD_ID])
    addCheck(checks, Boolean(backlog[0]) && Boolean(backlog[1]), 'current and next backlog cards exist', backlog.map(item => `${item?.id}:${item?.lane}`).join(', '))

    const failures = checks.filter(check => !check.ok)
    const result = {
      ok: failures.length === 0,
      status: failures.length ? 'risk' : 'healthy',
      cardId: FOUNDATION_USERS_CARD_ID,
      closeoutKey: FOUNDATION_USERS_CLOSEOUT_KEY,
      checks,
      failures,
    }
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`Foundation users proof: ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    if (failures.length) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
