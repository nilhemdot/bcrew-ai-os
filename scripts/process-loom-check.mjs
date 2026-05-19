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
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  listSourceCrawlItems,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  LOOM_APPROVAL_PATH,
  LOOM_CARD_ID,
  LOOM_CHANGED_FILES,
  LOOM_CLOSEOUT_KEY,
  LOOM_CLOSEOUT_PATH,
  LOOM_NEXT_CARD_ID,
  LOOM_PLAN_PATH,
  LOOM_PROOF_COMMANDS,
  LOOM_SCRIPT_PATH,
  buildLoomDogfoodProof,
  buildLoomPreflightStatus,
} from '../lib/loom-extraction-proof.js'
import {
  WEB_GODMODE_CARD_ID,
  WEB_GODMODE_SPRINT_CARD_ORDER,
  WEB_GODMODE_SPRINT_ID,
} from '../lib/web-godmode-extractor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
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

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function cardIds() {
  return Array.from(new Set([
    LOOM_CARD_ID,
    LOOM_NEXT_CARD_ID,
    WEB_GODMODE_CARD_ID,
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/web-godmode-extractor.js',
      'lib/multimodal-extractor-contract.js',
      'scripts/inventory-video-links.mjs',
      'lib/source-contracts.js',
      'lib/connector-credential-registry.js',
    ],
    existingDocs: [
      'docs/source-notes/video-link-inventory.md',
      'docs/handoffs/2026-05-19-web-godmode-closeout.md',
    ],
    existingSystems: [
      'source_crawl_items video-link-inventory manifest',
      'SRC-LOOM-001 source contract',
      'apify-loom-youtube candidate credential registry row',
      'WEB-GODMODE-001 request boundary and multimodal envelope',
    ],
    reused: [
      'Existing local manifest rows are read only.',
      'Synthetic WEB-GODMODE fixture proves the observation shape without network/browser/provider calls.',
      'Blocked-preflight closeout posture keeps the sprint moving without pretending Loom extraction is complete.',
    ],
    notRebuilt: [
      'No Loom API/client.',
      'No Apify actor execution.',
      'No authorized browser session.',
      'No transcript/media download.',
      'No screenshot byte storage.',
      'No atoms, KB, action routes, vectors, or downstream writes.',
    ],
    exactGap: 'Loom has local URL candidates, but no source-specific approval packet or live extraction proof. The safe output is a parked run packet and reusable preflight proof.',
    overBroadRisk: 'This can turn into broad private video scraping if it launches browser/provider work before Steve approves exact source/use/storage boundaries.',
  }
}

function buildCardRow({ closeCard = false, preflight } = {}) {
  return {
    id: LOOM_CARD_ID,
    title: 'Validate authorized Loom extraction path',
    scope: 'foundation',
    lane: closeCard ? 'scoped' : 'executing',
    priority: 'P1',
    rank: 44,
    source: 'Loom admin access + video corpus checkpoint + Steve 2026-05-19 GOD-mode extraction sprint.',
    summary: 'Preflight the authorized Loom extraction path using the existing video-link inventory, WEB-GODMODE request boundaries, and multimodal envelope contract without launching a live browser/provider run.',
    whyItMatters: 'Loom videos can hold high-value training and workflow evidence, but private/workspace video extraction must not start until ownership, rights, storage, screenshots, cost, and provider/browser path are approved.',
    nextAction: closeCard
      ? 'Blocked-preflight parked. Steve must approve an exact Loom run packet before live Loom provider/browser extraction. Continue MEETING-VIDEO-001 now.'
      : 'Build Loom candidate preflight, validate the run packet, and park live/private extraction if approval is missing.',
    statusNote: closeCard
      ? `Blocked-preflight under \`${LOOM_CLOSEOUT_KEY}\`; not marked done. Local manifest has ${preflight?.inventory?.eligibleCount || 0} eligible Loom share/embed candidates, but live provider/browser extraction remains approval-bound.`
      : `Executing \`${LOOM_CLOSEOUT_KEY}\`; live Loom content access must remain blocked unless an approved source-specific run packet exists.`,
    owner: 'Foundation Extraction',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `loom-extraction-preflight-${stableRunId(LOOM_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: LOOM_CARD_ID,
      closeoutKey: LOOM_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, preflight } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, preflight })
  const planRun = buildPlanCriticRun(planReview)
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
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-loom-extraction-preflight')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        LOOM_CARD_ID,
        LOOM_PLAN_PATH,
        planReview.status,
        planReview.score,
        LOOM_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
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
}

function mergeSprintItems(previous = {}, { closeCard = false } = {}) {
  const existingById = new Map((previous.items || []).map(item => [item.cardId, item]))
  return WEB_GODMODE_SPRINT_CARD_ORDER.map((cardId, index) => {
    const existing = existingById.get(cardId) || {}
    if (cardId === LOOM_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'returned',
        returnedReason: 'Live Loom provider/browser extraction is approval-bound. Preflight proof and run packet are parked under loom-extraction-preflight-v1; continue safe sprint work.',
        closeoutKey: LOOM_CLOSEOUT_KEY,
        proofCommands: LOOM_PROOF_COMMANDS,
        nextAction: 'Await Steve approval for exact Loom run packet; continue MEETING-VIDEO-001 now.',
        definitionOfDone: existing.definitionOfDone || 'Loom live extraction is parked unless Steve approves exact source/use/storage/provider boundaries.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No private Loom read, provider actor call, authorized browser session, transcript/media download, screenshot storage, credential mutation, Drive permission mutation, external send, or public exposure.',
          'MEETING-VAULT-ACL-001 Phase B and Drive permissions remain out of scope.',
        ],
      }
    }
    if (cardId === LOOM_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Continue safe meeting-linked video proof work; park live private/provider operations if approval-bound.',
      }
    }
    return {
      ...existing,
      cardId,
      order: index + 1,
    }
  })
}

async function ensureLiveState({ closeCard = false, planReview, preflight } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LOOM_SCRIPT_PATH,
    operation: 'upsert Loom preflight card, Plan Critic row, and Current Sprint parked state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, preflight })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: WEB_GODMODE_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? LOOM_NEXT_CARD_ID : LOOM_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'loom_preflight_parked_next_meeting_video' : 'loom_preflight_active',
          lastClosedCardId: closeCard ? LOOM_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `LOOM-001 live extraction is parked approval-bound. Continue ${LOOM_NEXT_CARD_ID}.`
            : 'Finish Loom preflight or park approval-bound live operation.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-loom-extraction-preflight',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || WEB_GODMODE_SPRINT_ID,
      reason: 'Steve operating rule: blockers block unsafe actions, not the whole sprint.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()
  const [
    planSource,
    approval,
    cards,
    packageJson,
    sourceNote,
    sourceContractsSource,
    credentialRegistrySource,
    webGodmodeSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(LOOM_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: LOOM_APPROVAL_PATH, cardId: LOOM_CARD_ID }),
    getBacklogItemsByIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile('docs/source-notes/video-link-inventory.md'),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/connector-credential-registry.js'),
    readRepoFile('lib/web-godmode-extractor.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(LOOM_CLOSEOUT_PATH, { optional: true }),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: LOOM_CHANGED_FILES,
    declaredRisk: 'private Loom video source approval boundary and blocked-preflight sprint progression',
    repoRoot,
  })
  const manifestItems = await listSourceCrawlItems({ targetKey: 'video-link-inventory', status: 'succeeded', limit: 200, order: 'desc' })
  const preflight = buildLoomPreflightStatus({ items: manifestItems })
  const dogfood = buildLoomDogfoodProof()
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview, preflight })
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const planCriticRuns = await getPlanCriticRunsByCardIds([...cardIds(), ...sprintCardIds])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const card = (await getBacklogItemsByIds([LOOM_CARD_ID])).find(item => item.id === LOOM_CARD_ID) || cards.find(item => item.id === LOOM_CARD_ID) || null
  const webCard = cards.find(item => item.id === WEB_GODMODE_CARD_ID) || null
  const nextCard = cards.find(item => item.id === LOOM_NEXT_CARD_ID) || null
  const loomItem = (activeSprint.items || []).find(item => item.cardId === LOOM_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === LOOM_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === LOOM_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || LOOM_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Loom preflight', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === LOOM_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, webCard?.lane === 'done', 'WEB-GODMODE prerequisite is done', webCard ? `${webCard.id}:${webCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'scoped' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live Loom card exists and stays not-done for blocked preflight', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next meeting-video card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, preflight.ok && preflight.status === 'blocked_pending_approval', 'Loom preflight parks live extraction behind approval', preflight.status)
  addCheck(checks, preflight.inventory.eligibleCount >= 3, 'local video manifest has 3+ Loom share/embed candidates', `${preflight.inventory.eligibleCount}/${preflight.inventory.candidateCount}`)
  addCheck(checks, preflight.approvalPacket.canRunNow === false && preflight.approvalPacket.status === 'approval_required', 'run packet refuses live Loom run without approval', preflight.approvalPacket.status)
  addCheck(checks, preflight.blockedObservationSummary.ok === false && preflight.blockedObservationSummary.failureCodes.includes('browser_session_preflight_required'), 'WEB-GODMODE blocks private Loom observation without preflight', preflight.blockedObservationSummary.failureCodes.join(', '))
  addCheck(checks, preflight.approvedObservationSummary.ok === true && preflight.approvedObservationSummary.liveBrowserLaunched === false && preflight.approvedObservationSummary.networkFetched === false, 'synthetic approved Loom observation stays no-network', JSON.stringify(preflight.approvedObservationSummary))
  addCheck(checks, preflight.multimodal.ok === true, 'Loom multimodal envelope validates in synthetic approval mode', preflight.multimodal.findings.join(', ') || 'healthy')
  addCheck(checks, dogfood.ok === true, 'dogfood proves candidate filtering and approval-bound blocking', dogfood.blockedFailureCodes.join(', '))
  addCheck(checks, Object.values(preflight.sideEffects).every(value => value === false), 'preflight starts no live side effects', JSON.stringify(preflight.sideEffects))
  addCheck(checks, sourceNote.includes('Pick 3-5 Steve-owned Loom URLs') && sourceNote.includes('APIFY_API_TOKEN'), 'video source note preserves Loom proof boundary', 'docs/source-notes/video-link-inventory.md')
  addCheck(checks, sourceContractsSource.includes('SRC-LOOM-001') && sourceContractsSource.includes('no first-party open extraction API confirmed'), 'source contract keeps Loom as gap until proof', 'lib/source-contracts.js')
  addCheck(checks, credentialRegistrySource.includes('apify-loom-youtube') && credentialRegistrySource.includes('candidate Loom/video/browser extraction probes after source approval'), 'credential registry marks Apify/Loom as candidate only', 'lib/connector-credential-registry.js')
  addCheck(checks, webGodmodeSource.includes('authorized private source without preflight blocks'), 'WEB-GODMODE dogfoods private Loom preflight blocking', 'lib/web-godmode-extractor.js')
  addCheck(checks, packageJson.scripts?.['process:loom-check'] === `node --env-file-if-exists=.env ${LOOM_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:loom-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(LOOM_CLOSEOUT_KEY) && closeoutRegistrySource.includes('blocked-preflight') && closeoutRegistrySource.includes(LOOM_CARD_ID), 'closeout registry source includes blocked-preflight record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'blocked-preflight' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(LOOM_CARD_ID), 'build closeout lookup resolves blocked-preflight record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(LOOM_CLOSEOUT_PATH), 'closeout handoff exists', LOOM_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('not marked done') && closeoutDoc.includes(LOOM_NEXT_CARD_ID), 'closeout states not marked done and next card', LOOM_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === LOOM_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, loomItem?.stage === 'returned' && Boolean(loomItem.returnedReason), 'Current Sprint parks Loom as returned with reason', loomItem ? `${loomItem.stage}:${loomItem.returnedReason || 'missing reason'}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after parking Loom preflight', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: LOOM_CARD_ID,
    closeoutKey: LOOM_CLOSEOUT_KEY,
    nextCardId: LOOM_NEXT_CARD_ID,
    preflight,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Loom preflight check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Loom preflight check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
