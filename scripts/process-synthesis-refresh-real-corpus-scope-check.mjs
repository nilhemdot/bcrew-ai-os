#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { getBacklogItemsByIds } from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SYNTHESIS_ENGINE_RUNNER_PATH,
  SYNTHESIS_PROOF_ITEM_LIMIT,
  SYNTHESIS_PROOF_SCOPE_KEY,
  SYNTHESIS_REFRESH_REAL_CORPUS_NOT_NEXT_BOUNDARIES,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_APPROVAL_PATH,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PLAN_PATH,
  SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_SCRIPT_PATH,
  SYNTHESIS_REFRESH_SCOPE_KEY,
  buildSynthesisEngineRunConfig,
  buildSynthesisRefreshRealCorpusScopeDogfoodProof,
  validateSynthesisEngineRunConfig,
  validateSynthesisEngineRunnerSource,
} from '../lib/synthesis-refresh-real-corpus-scope.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SOURCE_FILES = [
  'lib/synthesis-refresh-real-corpus-scope.js',
  'scripts/process-synthesis-refresh-real-corpus-scope-check.mjs',
  'docs/process/synthesis-refresh-real-corpus-scope-001-plan.md',
  'docs/process/approvals/SYNTHESIS-REFRESH-REAL-CORPUS-SCOPE-001.json',
  'package.json',
]

const FORBIDDEN_FOCUSED_PROOF_PATTERNS = [
  ['call', 'Embedding('].join(''),
  ['runGoverned', 'Synthesis('].join(''),
  ['promoteSharedCommunication', 'CandidatesToAtoms('].join(''),
  ['propose', 'ActionRoutes('].join(''),
  ['applyApproved', 'ActionRoute('].join(''),
  ['approve', 'ActionRoute('].join(''),
  ['sendHarlan', 'BuilderEventNotification'].join(''),
  ['sendTelegram', 'BotMessage'].join(''),
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    closeCard: false,
    apply: false,
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
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
    id: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID,
    title: 'Separate synthesis refresh from proof scope',
    team: 'foundation',
    lane: closeCard ? 'done' : 'scoped',
    priority: 'P0',
    rank: 12,
    source: 'Steve 2026-05-31 overnight Dev-Hub intelligence approval; Trust-the-Pipe synthesis scope repair.',
    summary: 'Keep the 8-item foundation-spine proof mode, but move scheduled synthesis refresh to a separate real-corpus scope and larger bounded item limit.',
    whyItMatters: 'The system cannot claim the Director is reading the real corpus if the scheduled refresh inherits the small proof/demo scope.',
    nextAction: closeCard
      ? `Done under ${SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY}. Next safe step is to run or schedule the model-backed refresh only when provider/model spend is approved, then route through the guarded Action Router.`
      : 'Wire the config split and prove it without running intelligence:synthesis-refresh, model calls, action routing, or destination writes.',
    statusNote: closeCard
      ? `Closed under ${SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY}; proof mode remains ${SYNTHESIS_PROOF_SCOPE_KEY}/${SYNTHESIS_PROOF_ITEM_LIMIT}, refresh mode is ${SYNTHESIS_REFRESH_SCOPE_KEY} with a real-corpus item limit. No refresh run or model call was executed by this card.`
      : `Scoped for ${SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY}; no synthesis refresh execution, model call, action route proposal, or destination write is allowed.`,
    owner: 'Foundation Intelligence Spine',
  }
}

async function upsertLiveCard({ closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_SCRIPT_PATH,
    operation: 'upsert synthesis refresh real-corpus scope backlog card',
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
        VALUES ($1,'backlog_items',$2,'codex-synthesis-refresh-real-corpus-scope',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        closeCard
          ? `Closed ${row.id} under ${SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY}.`
          : `Scoped ${row.id} under ${SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY}.`,
        JSON.stringify({ closeoutKey: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY, parentCardId: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID }),
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

function sourceHasForbiddenFocusedProofRuntime(sourceByFile = {}) {
  const findings = []
  for (const [file, source] of Object.entries(sourceByFile)) {
    for (const pattern of FORBIDDEN_FOCUSED_PROOF_PATTERNS) {
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
    runnerSource,
    foundationJobsSource,
    ...sourceEntries
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_APPROVAL_PATH,
      cardId: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID,
    }),
    readJson('package.json'),
    getBacklogItemsByIds([SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID, SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID]),
    readText(SYNTHESIS_ENGINE_RUNNER_PATH),
    readText('lib/foundation-jobs.js'),
    ...SOURCE_FILES.map(async file => [file, await readText(file)]),
  ])
  await closeFoundationDb()

  const sourceByFile = Object.fromEntries(sourceEntries)
  const liveCard = backlogCards.find(card => card.id === SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID) || null
  const parentCard = backlogCards.find(card => card.id === SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID) || null
  const dogfood = buildSynthesisRefreshRealCorpusScopeDogfoodProof()
  const proofConfig = buildSynthesisEngineRunConfig({ refreshMode: false })
  const refreshConfig = buildSynthesisEngineRunConfig({ refreshMode: true })
  const proofValidation = validateSynthesisEngineRunConfig(proofConfig)
  const refreshValidation = validateSynthesisEngineRunConfig(refreshConfig)
  const runnerValidation = validateSynthesisEngineRunnerSource(runnerSource)
  const forbiddenFocusedProofFindings = sourceHasForbiddenFocusedProofRuntime(sourceByFile)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_APPROVAL_PATH)
  addCheck(checks, Boolean(liveCard) && ['scoped', 'executing', 'done'].includes(liveCard.lane), 'live synthesis refresh scope card exists', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, !args.closeCard || liveCard?.lane === 'done', 'close-card write marks synthesis refresh scope card done', liveCard ? `${liveCard.id}:${liveCard.lane}` : 'missing')
  addCheck(checks, Boolean(parentCard) && parentCard.lane === 'done', 'parent synthesis engine card is shipped', parentCard ? `${parentCard.id}:${parentCard.lane}` : 'missing')
  addCheck(checks, packageJson?.scripts?.['process:synthesis-refresh-real-corpus-scope-check']?.includes(SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_SCRIPT_PATH), 'package script exists', packageJson?.scripts?.['process:synthesis-refresh-real-corpus-scope-check'] || 'missing')
  addCheck(checks, packageJson?.scripts?.['intelligence:synthesis-refresh']?.includes('--refresh=true'), 'scheduled refresh command still uses refresh mode', packageJson?.scripts?.['intelligence:synthesis-refresh'] || 'missing')
  addCheck(checks, foundationJobsSource.includes('intelligence-synthesis-spine-refresh') && foundationJobsSource.includes("args: ['run', 'intelligence:synthesis-refresh']"), 'Foundation job registry still points scheduled job at synthesis refresh command', 'intelligence-synthesis-spine-refresh')
  addCheck(checks, dogfood.ok, 'dogfood proves proof scope stays small and refresh scope becomes real corpus', JSON.stringify({
    proofScope: dogfood.proof.synthesisScopeKey,
    proofItemLimit: dogfood.proof.itemLimit,
    refreshScope: dogfood.refresh.synthesisScopeKey,
    refreshItemLimit: dogfood.refresh.itemLimit,
  }))
  addCheck(checks, proofValidation.ok, 'proof config validates', proofValidation.failures.join(', ') || `${proofConfig.synthesisScopeKey}/${proofConfig.itemLimit}`)
  addCheck(checks, refreshValidation.ok, 'refresh config validates', refreshValidation.failures.join(', ') || `${refreshConfig.synthesisScopeKey}/${refreshConfig.itemLimit}`)
  addCheck(checks, refreshConfig.synthesisScopeKey !== proofConfig.synthesisScopeKey && refreshConfig.itemLimit > proofConfig.itemLimit, 'refresh no longer inherits 8-item proof scope', JSON.stringify({
    proof: { scope: proofConfig.synthesisScopeKey, itemLimit: proofConfig.itemLimit },
    refresh: { scope: refreshConfig.synthesisScopeKey, itemLimit: refreshConfig.itemLimit },
  }))
  addCheck(checks, runnerValidation.ok, 'runner uses config-owned scope and item limit', runnerValidation.failures.join(', ') || SYNTHESIS_ENGINE_RUNNER_PATH)
  addCheck(checks, forbiddenFocusedProofFindings.length === 0, 'focused proof does not run synthesis, embeddings, action routing, or sends', forbiddenFocusedProofFindings.join(', ') || 'none')
  addCheck(checks, SYNTHESIS_REFRESH_REAL_CORPUS_NOT_NEXT_BOUNDARIES.includes('No execution of intelligence:synthesis-refresh in this card.'), 'not-next boundaries keep live refresh execution parked', SYNTHESIS_REFRESH_REAL_CORPUS_NOT_NEXT_BOUNDARIES.join(' | '))

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID,
    parentCardId: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID,
    closeoutKey: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY,
    planPath: SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PLAN_PATH,
    applied: Boolean(appliedCard),
    proofConfig,
    refreshConfig,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Synthesis refresh real-corpus scope check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
