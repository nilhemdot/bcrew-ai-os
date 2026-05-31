#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_APPROVAL_PATH,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_PLAN_PATH,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_SCRIPT_PATH,
  runActionRouteApplyResolutionSyntheticProof,
} from '../lib/action-route-apply-resolution-proof.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { getBacklogItemsByIds } from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SOURCE_FILES = [
  'lib/action-route-apply-resolution-proof.js',
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_SCRIPT_PATH,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_PLAN_PATH,
  ACTION_ROUTE_APPLY_RESOLUTION_PROOF_APPROVAL_PATH,
  'lib/foundation-verify-coverage-card-ids.js',
  'data/foundation-build-closeouts/action-route-records.json',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, closeCard: false, apply: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
  }
  return args
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
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

function sourceOmitsUnsafeExternalTokens(source = '') {
  const banned = [
    'sendTelegram',
    'sendEmail',
    'sendSlack',
    'agentFeedbackAutoSend',
    'batchUpdateSheetValues',
    'googleJsonFetch',
    'fetch(',
  ]
  return banned.filter(token => String(source || '').includes(token))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
    title: 'Prove action routes can resolve work, not just queue proposals',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 14,
    source: 'Steve 2026-05-31 overnight Dev-Hub intelligence approval; continuation from Action Route Harlan digest and apply safety preflight.',
    summary: 'Prove the Action Router approval/apply code path with a rollback-only synthetic route so no live recommendation is promoted while Steve is asleep.',
    whyItMatters: 'Action routes are useful only if the system can prove they resolve into internal work with owner, source proof, and rollback boundaries instead of sitting forever in review.',
    nextAction: closeCard
      ? `Done under ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY}. Next safe slice: surface the apply-safety states and digest counts in Dev Hub without auto-applying routes.`
      : 'Run the synthetic transaction proof, keep all live recommendations untouched, and close only after rollback proof passes.',
    statusNote: closeCard
      ? `Closed under ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY}; proof used a synthetic route inside one DB transaction, exercised real approve/apply behavior, verified destination creation, then rolled back synthetic route/destination/run/item/change-event rows.`
      : `Executing ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY}; synthetic rollback proof only.`,
    owner: 'Foundation Action Router',
  }
}

async function upsertLiveCard({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_SCRIPT_PATH,
    operation: 'upsert Action Route apply resolution proof backlog card',
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
        VALUES ($1,'backlog_items',$2,'codex-action-route-apply-resolution-proof',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        closeCard
          ? `Closed ${row.id} under ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY}.`
          : `Updated ${row.id} under ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY }),
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
    proof,
    ...sourceEntries
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_APPROVAL_PATH,
      cardId: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
    }),
    readJson('package.json'),
    getBacklogItemsByIds([ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID]),
    runActionRouteApplyResolutionSyntheticProof(),
    ...SOURCE_FILES.map(async file => [file, await readText(file)]),
  ])
  await closeFoundationDb()

  const sourceByFile = Object.fromEntries(sourceEntries)
  const liveCard = backlogCards.find(card => card.id === ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID) || null
  const moduleSource = sourceByFile['lib/action-route-apply-resolution-proof.js'] || ''
  const planSource = sourceByFile[ACTION_ROUTE_APPLY_RESOLUTION_PROOF_PLAN_PATH] || ''
  const coverageSource = sourceByFile['lib/foundation-verify-coverage-card-ids.js'] || ''
  const closeoutSource = sourceByFile['data/foundation-build-closeouts/action-route-records.json'] || ''
  const unsafeTokens = sourceOmitsUnsafeExternalTokens(moduleSource)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || ACTION_ROUTE_APPLY_RESOLUTION_PROOF_APPROVAL_PATH)
  addCheck(checks, Boolean(liveCard) && ['scoped', 'executing', 'done'].includes(liveCard.lane), 'live parent backlog card exists', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || liveCard?.lane === 'done', 'close-card marks parent card done', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, proof.ok, 'synthetic transaction proves pending to approved to applied and rolls back', proof.failed?.map(row => row.check).join(', ') || proof.destinationRecordId || 'ok')
  addCheck(checks, proof.boundaries?.transactionRolledBack === true && proof.boundaries?.liveRouteApplied === false && proof.boundaries?.liveRecommendationPromoted === false, 'proof boundaries keep live routes untouched', JSON.stringify(proof.boundaries || {}))
  addCheck(checks, proof.rollbackCounts && Object.values(proof.rollbackCounts).every(value => Number(value || 0) === 0), 'rollback leaves no synthetic rows behind', JSON.stringify(proof.rollbackCounts || {}))
  addCheck(checks, packageJson?.scripts?.['process:action-route-apply-resolution-proof-check']?.includes(ACTION_ROUTE_APPLY_RESOLUTION_PROOF_SCRIPT_PATH), 'package script exists', packageJson?.scripts?.['process:action-route-apply-resolution-proof-check'] || 'missing')
  addCheck(checks, ACTION_ROUTE_APPLY_RESOLUTION_PROOF_NOT_NEXT_BOUNDARIES.every(boundary => planSource.includes(boundary)), 'plan records no-live/no-external boundaries', 'not-next boundaries')
  addCheck(checks, coverageSource.includes(ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID), 'verifier coverage list includes done card id', ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID)
  addCheck(checks, closeoutSource.includes(ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY), 'closeout registry contains apply resolution proof', ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY)
  addCheck(checks, unsafeTokens.length === 0, 'proof module has no external send/source/model tokens', unsafeTokens.join(', ') || 'clean')

  const failed = checks.filter(check => !check.ok)
  const payload = {
    ok: failed.length === 0,
    cardId: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
    closeoutKey: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY,
    checks,
    failed,
    proof,
    appliedCard,
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    console.log(`Action Route apply resolution proof: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
