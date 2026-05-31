#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPLY_CLI_PATH,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPROVAL_PATH,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PLAN_PATH,
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_SCRIPT_PATH,
  buildActionRouteApplySafetyPreflight,
  buildActionRouteApplySafetyPreflightDogfoodProof,
  validateActionRouteApplySafetyPreflight,
  verifyActionRouterApplyCliGuard,
} from '../lib/action-route-apply-safety-preflight.js'
import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  validateActionRouteReviewInboxSnapshot,
} from '../lib/action-route-review-inbox.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { getBacklogItemsByIds } from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const DEFAULT_BASE_URL = 'http://localhost:3000'

const SOURCE_FILES = [
  'lib/action-route-apply-safety-preflight.js',
  'scripts/process-action-route-apply-safety-preflight-check.mjs',
  'docs/process/action-route-apply-safety-preflight-001-plan.md',
  'docs/process/approvals/ACTION-ROUTE-APPLY-SAFETY-PREFLIGHT-001.json',
  'package.json',
]

const FORBIDDEN_MUTATION_PATTERNS = [
  ['approve', 'ActionRoute('].join(''),
  ['applyApproved', 'ActionRoute('].join(''),
  ['reject', 'ActionRoute('].join(''),
  ['reroute', 'ActionRoute('].join(''),
  ['sendHarlan', 'BuilderEventNotification'].join(''),
  ['sendTelegram', 'BotMessage'].join(''),
  ['api', 'telegram', 'org'].join('.'),
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || DEFAULT_BASE_URL,
    closeCard: false,
    apply: false,
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
    title: 'Add action route apply safety preflight',
    team: 'foundation',
    lane: closeCard ? 'done' : 'scoped',
    priority: 'P0',
    rank: 13,
    source: 'Steve 2026-05-31 overnight Dev-Hub intelligence approval; child safety slice under ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002.',
    summary: 'Classify live action routes before any approve/apply path so pending routed intelligence cannot silently mutate decisions, backlog, or questions.',
    whyItMatters: 'The route queue needs to close, but live apply writes internal destination records. This preflight keeps unsafe or approval-bound routes parked while naming exactly what blocks them.',
    nextAction: closeCard
      ? `Done under ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY}. Continue ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID} only with a separately approved internal route apply or a synthetic transactional proof that does not promote live recommendations.`
      : 'Build the read-only apply safety preflight. Do not approve, apply, reject, snooze, reroute, send, or create route-derived backlog cards.',
    statusNote: closeCard
      ? `Closed under ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY}; live preflight is read-only with autoApplyAllowed=false, routeMutationAttempted=false, destinationMutationAttempted=false. Parent ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID} remains open for actual apply proof.`
      : `Scoped for ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY}; no route or destination mutation allowed.`,
    owner: 'Foundation Action Router',
  }
}

async function upsertLiveCard({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_SCRIPT_PATH,
    operation: 'upsert Action Route apply safety preflight backlog card',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  const row = buildCardRow({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
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
      [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-action-route-apply-safety-preflight',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        closeCard
          ? `Closed ${row.id} under ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY}.`
          : `Scoped ${row.id} under ${ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY, parentCardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID }),
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
  return row
}

async function fetchLocalJson(baseUrl, pathname) {
  const url = new URL(pathname, baseUrl)
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`Refusing non-local action-route apply safety proof URL: ${url.origin}`)
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

function sourceHasForbiddenMutations(sourceByFile = {}) {
  const findings = []
  for (const [file, source] of Object.entries(sourceByFile)) {
    for (const pattern of FORBIDDEN_MUTATION_PATTERNS) {
      if (String(source || '').includes(pattern)) findings.push(`${file}:${pattern}`)
    }
  }
  return findings
}

async function main() {
  const args = parseArgs()
  const checks = []
  const shouldWrite = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  let appliedCard = null
  if (shouldWrite) appliedCard = await upsertLiveCard({ closeCard: args.closeCard })

  const [
    approval,
    packageJson,
    backlogCards,
    applyCliSource,
    ...sourceEntries
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPROVAL_PATH,
      cardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
    }),
    readJson('package.json'),
    getBacklogItemsByIds([ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID, ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID]),
    readText(ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPLY_CLI_PATH),
    ...SOURCE_FILES.map(async file => [file, await readText(file)]),
  ])
  await closeFoundationDb()

  const sourceByFile = Object.fromEntries(sourceEntries)
  const liveCard = backlogCards.find(card => card.id === ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID) || null
  const parentCard = backlogCards.find(card => card.id === ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID) || null
  const dogfood = buildActionRouteApplySafetyPreflightDogfoodProof()
  const applyCliGuard = verifyActionRouterApplyCliGuard(applyCliSource)
  const liveSnapshot = await fetchLocalJson(args.baseUrl, ACTION_ROUTE_REVIEW_INBOX_API_PATH)
  const liveSnapshotValidation = validateActionRouteReviewInboxSnapshot(liveSnapshot)
  const livePreflight = buildActionRouteApplySafetyPreflight(liveSnapshot, { now: new Date(), maxItems: 20 })
  const livePreflightValidation = validateActionRouteApplySafetyPreflight(livePreflight)
  const forbiddenMutationFindings = sourceHasForbiddenMutations(sourceByFile)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPROVAL_PATH)
  addCheck(checks, Boolean(liveCard) && ['scoped', 'executing', 'done'].includes(liveCard.lane), 'live safety-preflight backlog card exists', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || liveCard?.lane === 'done', 'close-card write marks safety-preflight card done', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, Boolean(parentCard) && parentCard.lane !== 'done', 'parent route-resolution card remains open', parentCard ? `${parentCard.id}:${parentCard.lane}` : 'missing')
  addCheck(checks, packageJson?.scripts?.['process:action-route-apply-safety-preflight-check']?.includes(ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_SCRIPT_PATH), 'package script exists', packageJson?.scripts?.['process:action-route-apply-safety-preflight-check'] || 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves ready/pending/sensitive/owner/fail-closed cases', JSON.stringify({
    ready: dogfood.preflight.summary.readyForConfirmedApplyItems,
    autoApplyAllowed: dogfood.preflight.autoApplyAllowed,
    unsafe: dogfood.unsafePreflight.status,
  }))
  addCheck(checks, applyCliGuard.ok, 'existing apply CLI requires route-id echo and explicit approver', applyCliGuard.failures.join(', ') || JSON.stringify(applyCliGuard.checks))
  addCheck(checks, liveSnapshotValidation.ok, 'live Action Route Review Inbox snapshot validates', liveSnapshotValidation.failures?.join(', ') || `${liveSnapshotValidation.reviewItemCount} items`)
  addCheck(checks, livePreflightValidation.ok, 'live apply safety preflight validates', livePreflightValidation.failures.join(', ') || `${livePreflightValidation.routeItems} route items`)
  addCheck(checks, livePreflight.autoApplyAllowed === false && livePreflight.summary.autoApplyAllowedItems === 0, 'live preflight keeps auto-apply disabled', JSON.stringify({
    autoApplyAllowed: livePreflight.autoApplyAllowed,
    autoApplyAllowedItems: livePreflight.summary.autoApplyAllowedItems,
  }))
  addCheck(checks, livePreflight.routeMutationAttempted === false && livePreflight.destinationMutationAttempted === false, 'live preflight does not mutate routes or destinations', JSON.stringify({
    routeMutationAttempted: livePreflight.routeMutationAttempted,
    destinationMutationAttempted: livePreflight.destinationMutationAttempted,
  }))
  addCheck(checks, livePreflight.summary.pendingRoutes >= livePreflight.summary.approvedRoutes, 'live route queue remains approval-bound before apply', JSON.stringify({
    pendingRoutes: livePreflight.summary.pendingRoutes,
    approvedRoutes: livePreflight.summary.approvedRoutes,
    readyForConfirmedApplyItems: livePreflight.summary.readyForConfirmedApplyItems,
  }))
  addCheck(checks, forbiddenMutationFindings.length === 0, 'focused proof path has no approve/apply/reject/send implementation imports', forbiddenMutationFindings.join(', ') || 'none')
  addCheck(checks, ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_NOT_NEXT_BOUNDARIES.includes('No auto-promotion of Director, Scoper, Portfolio, or route recommendations into backlog.'), 'not-next boundaries keep recommendation auto-promotion blocked', ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_NOT_NEXT_BOUNDARIES.join(' | '))

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
    parentCardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID,
    closeoutKey: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY,
    planPath: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PLAN_PATH,
    applied: Boolean(appliedCard),
    livePreflight: {
      status: livePreflight.status,
      summary: livePreflight.summary,
      safetyHash: livePreflight.safetyHash,
      autoApplyAllowed: livePreflight.autoApplyAllowed,
      routeMutationAttempted: livePreflight.routeMutationAttempted,
      destinationMutationAttempted: livePreflight.destinationMutationAttempted,
      nextHumanAction: livePreflight.nextHumanAction,
      sampleItems: livePreflight.items.slice(0, 5),
    },
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Action route apply safety preflight check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
