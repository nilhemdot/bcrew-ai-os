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
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getIntelligenceReportBundle,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
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
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_APPROVAL_PATH as APPROVAL_PATH,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CARD_ID as CARD_ID,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CHANGED_FILES as CHANGED_FILES,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NEXT_CARD_ID as NEXT_CARD_ID,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_NOT_NEXT as NOT_NEXT,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_PLAN_PATH as PLAN_PATH,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_PROOF_COMMANDS as PROOF_COMMANDS,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_SCRIPT_PATH as SCRIPT_PATH,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_SPRINT_ID as SPRINT_ID,
  buildYoutubeBuildIntelLinkResourceDogfoodProof,
  buildYoutubeBuildIntelLinkResourceSnapshot,
  buildYoutubeBuildIntelLinkResourceWriteSet,
  renderYoutubeBuildIntelLinkResourceCloseout,
  verifyYoutubeBuildIntelLinkResourcePersistedProof,
} from '../lib/youtube-build-intel-link-resource.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from '../lib/youtube-scout-latest-video-vision.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'youtube-build-intel-link-resource'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

async function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function cloneSprintItem(item = {}) {
  return JSON.parse(JSON.stringify(item || {}))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/dev-team-hub.js',
      'lib/foundation-build-intel-routes.js',
      'lib/youtube-scout-latest-video-vision.js',
      'lib/web-godmode-live-operator.js',
    ],
    existingDocs: [
      'docs/process/youtube-build-intel-link-resource-002-plan.md',
      'docs/_archive/handoffs/2026-05-22-dev-team-hub-v0-closeout.md',
      'docs/_archive/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md',
    ],
    existingScripts: [
      'scripts/process-youtube-build-intel-link-resource-check.mjs',
      'scripts/process-dev-team-hub-v0-check.mjs',
      'scripts/process-youtube-scout-latest-video-vision-check.mjs',
    ],
    existingPolicy: [
      'Foundation remains the source/intelligence truth; Dev Team Hub reads from Foundation instead of creating a separate silo.',
      'YouTube resource links are classified and approval-routed only; external follow is not approved by this card.',
      'Backlog promotion remains approval-gated.',
      'No Meeting Vault Phase B or Drive permission mutation is approved by this lane.',
    ],
    reused: [
      'persisted scout report resource links',
      'intelligence report artifact store',
      'Dev Team Hub read API',
      'Current Sprint live DB truth',
    ],
    notRebuilt: [
      'No new extractor runtime.',
      'No second Dev data store.',
      'No external link follower.',
      'No backlog auto-promotion path.',
    ],
    exactGap: 'The Dev Hub can show raw scout approval-required links, but the active sprint needs a dedicated, deduped link/resource approval queue with conservative classifications.',
    overBroadRisk: 'Can drift into following Skool, Gumroad, Calendly, GitHub, downloads, opt-ins, paid/private/community content, or creating backlog cards automatically. This card stops at classification.',
    readyBy: 'Steve active sprint instruction for YouTube To Dev Team Intelligence V1.',
    readyAt: '2026-05-23T09:30:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `youtube-build-intel-link-resource-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      summary: buildPlanCriticResultSummary(planReview),
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const run = buildPlanCriticRun(planReview)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,$8,$9::text[],$10::jsonb,$11::jsonb,$12)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        run.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        planReview.gateDecision?.fullVerifyRequired === true,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(run.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; keep broad extraction blocked until the God Mode research/EYES loop proves quality.`
      : 'Classify and approval-route already observed YouTube description/resource links without following them.',
    statusNote: closeCard
      ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; persisted report ${REPORT_ARTIFACT_ID} with deduped link/resource approval queue, source evidence, conservative classifications, and no external follow/backlog/extraction side effects.`
      : `Executing ${CLOSEOUT_KEY}; link/resource classification only, no external follow or auto-promotion.`,
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'YouTube description/resource links are captured, classified, deduped, shown for review, and approval-bound before any external follow/download/purchase/opt-in action.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: closeCard ? `Closed under ${CLOSEOUT_KEY}.` : 'Active sprint card is building.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      publicYoutubeOnly: true,
      noAuth: true,
      noExternalFollow: true,
      blockersBlockActionsNotSprint: true,
      createsBacklogCardsAutomatically: false,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: cloned.stage || 'scoping',
    planRef: cloned.planRef || 'docs/process/god-mode-extractor-research-swarm-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Research how to build the best reusable God Mode extractor EYES/HANDS/BRAIN runtime before broad video extraction.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue God Mode extractor research before scaling creator extraction.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not process Mark last-50 or other creators latest-20 with weak transcript-only/current mode.',
      'Do not run private/auth/paid source extraction until exact source approval exists.',
      'Do not mutate credentials, browser profiles, Drive permissions, or external systems.',
    ],
    existingWorkCheck: cloned.existingWorkCheck || buildExistingWorkCheck(),
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 3 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 3) + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update YouTube link-resource backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'youtube_link_resource_closed_godmode_research_next' : 'youtube_link_resource_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: research/design God Mode extractor EYES/HANDS/BRAIN before broad extraction.`
            : `${CARD_ID}: classify YouTube resource links without following them.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          blockersBlockActionsNotSprint: true,
          noExternalFollow: true,
          noAutoBacklogPromotion: true,
          strategyPeopleParked: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Continue the YouTube To Dev Team Intelligence V1 sprint through the link/resource approval card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persisted = null
  let persistence = null

  const [
    packageJson,
    moduleSource,
    scriptSource,
    devHubSource,
    routesSource,
    closeoutRegistrySource,
    coverageSource,
    planSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/youtube-build-intel-link-resource.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(PLAN_PATH),
  ])

  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P0' },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Full ship gate because this card writes Foundation intelligence review data, updates Dev Hub readback, and advances Current Sprint truth.',
    repoRoot,
  })
  const dogfood = buildYoutubeBuildIntelLinkResourceDogfoodProof()

  await initFoundationDb()
  try {
    const scoutBundle = await getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 })
    const snapshot = buildYoutubeBuildIntelLinkResourceSnapshot({ scoutBundle })
    const writeSet = buildYoutubeBuildIntelLinkResourceWriteSet(snapshot)

    if (args.apply || args.closeCard) {
      assertProcessCheckWriteAllowed({
        argv: process.argv.slice(2),
        scriptPath: SCRIPT_PATH,
        operation: 'persist YouTube link/resource approval queue report',
        allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
      })
      if (!snapshot.ok) throw new Error(`Link-resource snapshot blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
      persisted = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 })
      persistence = verifyYoutubeBuildIntelLinkResourcePersistedProof({ snapshot, report: persisted.report })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderYoutubeBuildIntelLinkResourceCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    } else {
      persisted = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 })
      persistence = persisted.report
        ? verifyYoutubeBuildIntelLinkResourcePersistedProof({ snapshot, report: persisted.report })
        : { ok: false, failures: [{ check: 'report_not_persisted_yet' }] }
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
    const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
    const cardAlreadyClosed = card?.lane === 'done' || activeItem?.stage === 'done_this_sprint'
    const shouldBeAdvanced = args.closeCard || (!args.apply && cardAlreadyClosed)
    const expectedActiveBlocker = shouldBeAdvanced ? NEXT_CARD_ID : CARD_ID

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for link/resource card', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next God Mode research card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === expectedActiveBlocker, 'Current Sprint active blocker is reconciled', `${activeSprint.sprint?.activeBlockerCardId || 'missing'} / expected ${expectedActiveBlocker}`)
    addCheck(checks, !shouldBeAdvanced || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks link/resource card done after close', activeItem?.stage || 'missing')
    addCheck(checks, !shouldBeAdvanced || ['scoping', 'building_now', 'sprint_ready'].includes(nextItem?.stage), 'Current Sprint advances to God Mode research after close', nextItem?.stage || 'missing')
    addCheck(checks, snapshot.ok === true, 'link/resource snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || 'healthy')
    addCheck(checks, snapshot.links.length >= 1 && snapshot.approvalRequiredLinks.length >= 1, 'links are captured, deduped, and approval-queued', `${snapshot.links.length}/${snapshot.approvalRequiredLinks.length}`)
    addCheck(checks, snapshot.links.every(link => link.canFollowAutomatically === false), 'no link can be followed automatically', 'all follow=false')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects risky/missing/duplicate weak cases', JSON.stringify(dogfood.cases))
    addCheck(checks, !shouldBeAdvanced || persistence?.ok === true, 'persisted report reads back with approval queue', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, packageJson.scripts?.['process:youtube-build-intel-link-resource-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:youtube-build-intel-link-resource-check'] || 'missing')
    addCheck(checks, moduleSource.includes('buildYoutubeBuildIntelLinkResourceSnapshot') && moduleSource.includes('canFollowAutomatically: false'), 'module keeps conservative no-follow classifier', 'snapshot + classifier markers present')
    addCheck(checks, scriptSource.includes('upsertIntelligenceReportArtifact') && scriptSource.includes('verifyYoutubeBuildIntelLinkResourcePersistedProof'), 'focused script persists and verifies report readback', SCRIPT_PATH)
    addCheck(checks, devHubSource.includes('YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID') && routesSource.includes('YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID'), 'Dev Hub route reads link/resource report bundle', REPORT_ARTIFACT_ID)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes link/resource card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves link/resource card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes link/resource card ID', 'coverage card ID present')
    addCheck(checks, !shouldBeAdvanced || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    const hasExternalWritePath = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|externalWrite|createBacklogItem)\s*\(/.test(`${moduleSource}\n${scriptSource}`)
    addCheck(checks, !hasExternalWritePath, 'proof has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      nextCardId: NEXT_CARD_ID,
      snapshot: {
        status: snapshot.status,
        links: snapshot.links.length,
        approvalRequiredLinks: snapshot.approvalRequiredLinks.length,
        safeReferences: snapshot.safeReferences.length,
        duplicateLinks: snapshot.duplicateLinks.length,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube Build Intel link/resource proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube Build Intel link/resource proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
