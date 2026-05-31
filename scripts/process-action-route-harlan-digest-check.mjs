#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_HARLAN_DIGEST_APPROVAL_PATH,
  ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
  ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY,
  ACTION_ROUTE_HARLAN_DIGEST_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID,
  ACTION_ROUTE_HARLAN_DIGEST_PLAN_PATH,
  ACTION_ROUTE_HARLAN_DIGEST_SCRIPT_PATH,
  buildActionRouteHarlanDigestDogfoodProof,
  buildActionRouteHarlanDigestPacket,
  validateActionRouteHarlanDigestPacket,
} from '../lib/action-route-harlan-digest.js'
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
  'lib/action-route-harlan-digest.js',
  'scripts/process-action-route-harlan-digest-check.mjs',
  'docs/process/action-route-harlan-digest-001-plan.md',
  'docs/process/approvals/ACTION-ROUTE-HARLAN-DIGEST-001.json',
  'package.json',
]

const FORBIDDEN_SEND_PATTERNS = [
  ['sendHarlan', 'BuilderEventNotification'].join(''),
  ['sendTelegram', 'BotMessage'].join(''),
  ['https', 'request'].join('.'),
  ['api', 'telegram', 'org'].join('.'),
  ['telegram', 'Sender'].join(''),
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
    id: ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
    title: 'Build no-send Harlan digest for Action Route Review Inbox',
    team: 'foundation',
    lane: closeCard ? 'done' : 'scoped',
    priority: 'P0',
    rank: 14,
    source: 'Steve 2026-05-31 overnight Dev-Hub intelligence approval; child slice under ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002.',
    summary: 'Generate a bounded Harlan-ready packet from the live Action Route Review Inbox with no send, no route mutation, and no backlog mutation.',
    whyItMatters: 'Routed intelligence is not useful if it silently piles up. This slice proves the queue can be packaged for Steve without crossing the live-send or auto-promotion boundary.',
    nextAction: closeCard
      ? `Done under ${ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY}. Continue ${ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID} for one approved internal route approval/apply proof, or HARLAN-LIVE-OPERATOR-RUNTIME-002 for any broader live Harlan runtime/send behavior.`
      : 'Build the no-send digest packet and focused proof only; do not send Telegram, mutate routes, approve/apply items, or create route-derived backlog cards.',
    statusNote: closeCard
      ? `Closed under ${ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY}; packet is dry-run only with sendsMessageNow=false/externalSent=false/mutatedRoutes=false. Parent ${ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID} remains open for actual route resolution.`
      : `Scoped for ${ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY}; child packet only under ${ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID}.`,
    owner: 'Foundation Action Router / Harlan',
  }
}

async function upsertLiveCard({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_HARLAN_DIGEST_SCRIPT_PATH,
    operation: 'upsert Action Route Harlan digest backlog card',
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
        VALUES ($1,'backlog_items',$2,'codex-action-route-harlan-digest',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        closeCard
          ? `Closed ${row.id} under ${ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY}.`
          : `Scoped ${row.id} under ${ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY, parentCardId: ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID }),
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
    throw new Error(`Refusing non-local action-route digest proof URL: ${url.origin}`)
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

function sourceHasForbiddenSends(sourceByFile = {}) {
  const findings = []
  for (const [file, source] of Object.entries(sourceByFile)) {
    for (const pattern of FORBIDDEN_SEND_PATTERNS) {
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
    ...sourceEntries
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_HARLAN_DIGEST_APPROVAL_PATH,
      cardId: ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
    }),
    readJson('package.json'),
    getBacklogItemsByIds([ACTION_ROUTE_HARLAN_DIGEST_CARD_ID, ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID]),
    ...SOURCE_FILES.map(async file => [file, await readText(file)]),
  ])
  await closeFoundationDb()

  const sourceByFile = Object.fromEntries(sourceEntries)
  const liveCard = backlogCards.find(card => card.id === ACTION_ROUTE_HARLAN_DIGEST_CARD_ID) || null
  const parentCard = backlogCards.find(card => card.id === ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID) || null
  const dogfood = buildActionRouteHarlanDigestDogfoodProof()
  const liveSnapshot = await fetchLocalJson(args.baseUrl, ACTION_ROUTE_REVIEW_INBOX_API_PATH)
  const liveSnapshotValidation = validateActionRouteReviewInboxSnapshot(liveSnapshot)
  const livePacket = buildActionRouteHarlanDigestPacket(liveSnapshot, { now: new Date(), maxItems: 5 })
  const livePacketValidation = validateActionRouteHarlanDigestPacket(livePacket)
  const forbiddenSendFindings = sourceHasForbiddenSends(sourceByFile)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || ACTION_ROUTE_HARLAN_DIGEST_APPROVAL_PATH)
  addCheck(checks, Boolean(liveCard) && ['scoped', 'executing', 'done'].includes(liveCard.lane), 'live digest backlog card exists', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || liveCard?.lane === 'done', 'close-card write marks digest card done', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, Boolean(parentCard) && parentCard.lane !== 'done', 'parent route-resolution card remains open', parentCard ? `${parentCard.id}:${parentCard.lane}` : 'missing')
  addCheck(checks, packageJson?.scripts?.['process:action-route-harlan-digest-check']?.includes(ACTION_ROUTE_HARLAN_DIGEST_SCRIPT_PATH), 'package script exists', packageJson?.scripts?.['process:action-route-harlan-digest-check'] || 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves ready, empty, bounded, and fail-closed packets', JSON.stringify({
    ready: dogfood.packet.status,
    empty: dogfood.emptyPacket.status,
    unsafe: dogfood.unsafePacket.status,
    sendsMessageNow: dogfood.packet.sendsMessageNow,
    externalSent: dogfood.packet.externalSent,
  }))
  addCheck(checks, liveSnapshotValidation.ok, 'live Action Route Review Inbox snapshot validates', liveSnapshotValidation.failures?.join(', ') || `${liveSnapshotValidation.reviewItemCount} items`)
  addCheck(checks, livePacketValidation.ok, 'live Harlan digest packet validates', livePacketValidation.failures.join(', ') || `${livePacketValidation.digestItemCount} digest items`)
  addCheck(checks, livePacket.sendsMessageNow === false && livePacket.externalSent === false && livePacket.mutatedRoutes === false, 'live packet is no-send and no-mutation', JSON.stringify({
    sendsMessageNow: livePacket.sendsMessageNow,
    externalSent: livePacket.externalSent,
    mutatedRoutes: livePacket.mutatedRoutes,
  }))
  addCheck(checks, livePacket.summary.totalReviewItems === liveSnapshot.summary?.totalReviewItems, 'digest count matches live review inbox', `${livePacket.summary.totalReviewItems}/${liveSnapshot.summary?.totalReviewItems}`)
  addCheck(checks, livePacket.boundaries?.harlanRuntimeStarted === false && livePacket.boundaries?.replyParsingEnabled === false, 'packet does not start Harlan runtime or reply parsing', JSON.stringify(livePacket.boundaries))
  addCheck(checks, forbiddenSendFindings.length === 0, 'focused proof path has no Telegram/send implementation imports', forbiddenSendFindings.join(', ') || 'none')
  addCheck(checks, ACTION_ROUTE_HARLAN_DIGEST_NOT_NEXT_BOUNDARIES.includes('No external write or Telegram send.'), 'not-next boundaries keep external sends blocked', ACTION_ROUTE_HARLAN_DIGEST_NOT_NEXT_BOUNDARIES.join(' | '))

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
    parentCardId: ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID,
    closeoutKey: ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY,
    planPath: ACTION_ROUTE_HARLAN_DIGEST_PLAN_PATH,
    applied: Boolean(appliedCard),
    livePacket: {
      status: livePacket.status,
      summary: livePacket.summary,
      textHash: livePacket.textHash,
      sendsMessageNow: livePacket.sendsMessageNow,
      externalSent: livePacket.externalSent,
      mutatedRoutes: livePacket.mutatedRoutes,
      messageText: livePacket.messageText,
    },
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Action route Harlan digest check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
