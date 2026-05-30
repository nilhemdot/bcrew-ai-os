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
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_APPROVAL_PATH as APPROVAL_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CARD_ID as CARD_ID,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CHANGED_FILES as CHANGED_FILES,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_KEY as CLOSEOUT_KEY,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_CLOSEOUT_PATH as CLOSEOUT_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NEXT_CARD_ID as NEXT_CARD_ID,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_NOT_NEXT as NOT_NEXT,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PLAN_PATH as PLAN_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_PROOF_COMMANDS as PROOF_COMMANDS,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_RESEARCH_PATH as RESEARCH_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_SCRIPT_PATH as SCRIPT_PATH,
  GOD_MODE_EXTRACTOR_RESEARCH_SWARM_SPRINT_ID as SPRINT_ID,
  buildGodModeExtractorResearchSwarmDogfoodProof,
  buildGodModeExtractorResearchSwarmSnapshot,
  buildGodModeExtractorResearchSwarmWriteSet,
  renderGodModeExtractorResearchBrief,
  renderGodModeExtractorResearchSwarmCloseout,
  verifyGodModeExtractorResearchSwarmPersistedProof,
} from '../lib/god-mode-extractor-research-swarm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'god-mode-extractor-research-swarm'

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

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
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
      'lib/multimodal-extractor-contract.js',
      'lib/web-godmode-live-operator.js',
      'lib/youtube-build-intel-link-resource.js',
      'lib/youtube-scout-latest-video-vision.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-23-youtube-dev-hub-intel-proof-checkpoint.md',
      'docs/source-notes/mark-claudeclaw-build-intel.md',
      'docs/source-notes/kia-ai-automations-build-intel.md',
      'docs/source-notes/github-build-intel.md',
      'docs/process/multimodal-extractor-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-web-godmode-live-operator-check.mjs',
      'scripts/process-youtube-build-intel-link-resource-check.mjs',
    ],
    existingPolicy: [
      'Foundation remains source/intelligence truth; Dev Team Hub reads from Foundation instead of creating a Dev-only store.',
      'Current daily YouTube watch rows are metadata only, not watched/analyzed videos.',
      'Do not scale Mark last-50 or other creator latest-20 through weak transcript-only mode.',
      'Private/auth/paid/community sources require exact approval and content-use boundary.',
      'No Meeting Vault Phase B or Drive permission mutation is approved by this lane.',
    ],
    reused: [
      'Multimodal extractor contract',
      'Web Godmode live operator proof',
      'YouTube link/resource approval queue',
      'Mark ClaudeClaw source note and approved local review summary',
      'Kia Browserbase/Hermes source note',
    ],
    notRebuilt: [
      'No video extraction runtime in this card.',
      'No private Skool crawler.',
      'No copied ClaudeClaw code.',
      'No automatic backlog promotion.',
    ],
    exactGap: 'The sprint needs a source-backed extractor design decision before building Eyes V0 or scaling creator extraction.',
    overBroadRisk: 'Research can drift into broad crawling, private paid-source access, code copying, or building runtime instead of deciding the next safe implementation path.',
    readyBy: 'Steve active sprint instruction: research God Mode EYES/HANDS/BRAIN before scale-up.',
    readyAt: '2026-05-23T10:00:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `god-mode-extractor-research-swarm-${stableRunId(PLAN_PATH)}`,
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; build the bounded Eyes V0 quality loop before any creator scale-up.`
      : 'Produce source-backed God Mode extractor research brief and exact Eyes V0 recommendation before scale-up.',
    statusNote: closeCard
      ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; research brief ${RESEARCH_PATH} and report ${REPORT_ARTIFACT_ID} recommend Gemini video-understanding Eyes V0 plus transcript/description/resource evidence on 3-5 exact public videos, with Browserbase/Hermes-style HANDS parked behind source approvals.`
      : `Executing ${CLOSEOUT_KEY}; research/design only, no extraction runtime, private crawl, code copy, external writes, or auto backlog promotion.`,
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Research brief names best extractor design patterns, safety boundaries, productization opportunities, and the exact recommended Eyes V0 implementation path, with source/provenance and no private/community crawling without approval.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: closeCard ? `Closed under ${CLOSEOUT_KEY}.` : 'Active sprint card is building.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      researchPath: RESEARCH_PATH,
      nextCardId: NEXT_CARD_ID,
      recommendedNextRoute: 'gemini_video_understanding_eyes_v0_quality_loop',
      blockersBlockActionsNotSprint: true,
      createsBacklogCardsAutomatically: false,
      noPrivateCrawl: true,
      noCodeCopy: true,
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
    planRef: cloned.planRef || 'docs/rebuild/current-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Compare current transcript/description extraction against Eyes-enhanced extraction on 3-5 approved public videos and prove whether recommendation quality improves.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; build the bounded Eyes V0 quality loop before scale-up.`,
    notNextBoundaries: unique([
      ...(cloned.notNextBoundaries || []),
      'Do not process Mark last-50 or other creators latest-20 until the Eyes quality loop proves useful output.',
      'Do not run private/auth/paid source extraction until exact source approval exists.',
      'Do not mutate credentials, browser profiles, Drive permissions, or external systems.',
    ]),
    existingWorkCheck: cloned.existingWorkCheck || buildExistingWorkCheck(),
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      recommendedRoute: 'gemini_video_understanding_plus_baseline_comparison',
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 4 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 4) + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update God Mode research backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'god_mode_research_closed_eyes_quality_loop_next' : 'god_mode_research_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: build bounded Eyes V0 quality loop on 3-5 approved public videos.`
            : `${CARD_ID}: source-backed God Mode extractor research/design.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          blockersBlockActionsNotSprint: true,
          noPrivateCrawl: true,
          noCodeCopy: true,
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
      reason: 'Continue the YouTube To Dev Team Intelligence V1 sprint through God Mode extractor research before scaling extraction.',
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
    planSource,
    closeoutRegistrySource,
    coverageSource,
    checkpointSource,
    markSource,
    kiaSource,
    multimodalPlan,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/god-mode-extractor-research-swarm.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-23-youtube-dev-hub-intel-proof-checkpoint.md'),
    readRepoFile('docs/source-notes/mark-claudeclaw-build-intel.md'),
    readRepoFile('docs/source-notes/kia-ai-automations-build-intel.md'),
    readRepoFile('docs/process/multimodal-extractor-001-plan.md'),
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
    declaredRisk: 'Full ship gate because this card writes a Foundation research report, advances Current Sprint truth, and defines the next extraction implementation path.',
    repoRoot,
  })
  const snapshot = buildGodModeExtractorResearchSwarmSnapshot()
  const writeSet = buildGodModeExtractorResearchSwarmWriteSet(snapshot)
  const dogfood = buildGodModeExtractorResearchSwarmDogfoodProof()

  await initFoundationDb()
  try {
    if (args.apply || args.closeCard) {
      assertProcessCheckWriteAllowed({
        argv: process.argv.slice(2),
        scriptPath: SCRIPT_PATH,
        operation: 'persist God Mode extractor research brief and Foundation report',
        allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
      })
      if (!snapshot.ok) throw new Error(`God Mode research snapshot blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      await fs.writeFile(path.join(repoRoot, RESEARCH_PATH), renderGodModeExtractorResearchBrief(snapshot), 'utf8')
      await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
      persisted = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 25, hitLimit: 25 })
      persistence = verifyGodModeExtractorResearchSwarmPersistedProof({ snapshot, report: persisted.report })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderGodModeExtractorResearchSwarmCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    } else {
      persisted = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 25, hitLimit: 25 })
      persistence = persisted.report
        ? verifyGodModeExtractorResearchSwarmPersistedProof({ snapshot, report: persisted.report })
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
    const researchDoc = await readRepoFile(RESEARCH_PATH, { optional: true })

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for God Mode research', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next Eyes quality-loop card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === expectedActiveBlocker, 'Current Sprint active blocker is reconciled', `${activeSprint.sprint?.activeBlockerCardId || 'missing'} / expected ${expectedActiveBlocker}`)
    addCheck(checks, !shouldBeAdvanced || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks research swarm done after close', activeItem?.stage || 'missing')
    addCheck(checks, !shouldBeAdvanced || ['scoping', 'building_now', 'sprint_ready'].includes(nextItem?.stage), 'Current Sprint advances to Eyes quality loop after close', nextItem?.stage || 'missing')
    addCheck(checks, snapshot.ok === true, 'research snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || 'healthy')
    addCheck(checks, snapshot.sourceCount >= 8 && snapshot.sourceIds.includes('SRC-YOUTUBE-INTEL-001') && snapshot.sourceIds.includes('SRC-GITHUB-BUILD-INTEL-001'), 'source-backed research covers internal and external evidence', `${snapshot.sourceCount} sources / ${snapshot.sourceIds.join(', ')}`)
    addCheck(checks, snapshot.recommendedEyesV0.primaryRoute.includes('Gemini video understanding'), 'Eyes V0 recommendation names Gemini video route', snapshot.recommendedEyesV0.primaryRoute)
    addCheck(checks, snapshot.architectureOptions.some(option => option.recommendation === 'reject_as_default' && /screenshot/i.test(option.option)), 'bulk screenshot default is rejected', 'targeted keyframes only')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects weak transcript-only, bulk screenshot, and private crawl cases', JSON.stringify(dogfood.cases))
    addCheck(checks, checkpointSource.includes('There is no full EYES/HANDS/BRAIN extractor runtime today.'), 'checkpoint source proves current gap', 'youtube-dev-hub-intel-proof-checkpoint')
    addCheck(checks, markSource.includes('ClaudeClaw OS Package Snapshot') && markSource.includes('Media upload to Gemini'), 'Mark ClaudeClaw source note is included without code copy', 'mark-claudeclaw-build-intel')
    addCheck(checks, kiaSource.includes('Hermes Agent') && kiaSource.includes('Browserbase'), 'Kia Browserbase/Hermes signal is included', 'kia-ai-automations-build-intel')
    addCheck(checks, multimodalPlan.includes('Gemini/video-understanding') && multimodalPlan.includes('No substring-only proof'), 'multimodal extractor contract remains governing policy', 'multimodal-extractor-001-plan')
    addCheck(checks, !shouldBeAdvanced || researchDoc.includes('Recommended Eyes V0') && researchDoc.includes('Gemini video understanding') && researchDoc.includes('Bulk screenshot'), 'research brief exists with decision and rejected default', RESEARCH_PATH)
    addCheck(checks, !shouldBeAdvanced || persistence?.ok === true, 'persisted report reads back with recommended Eyes V0 path', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, packageJson.scripts?.['process:god-mode-extractor-research-swarm-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:god-mode-extractor-research-swarm-check'] || 'missing')
    addCheck(checks, moduleSource.includes('GOD_MODE_EYES_V0_RECOMMENDATION') && moduleSource.includes('Gemini video understanding'), 'module owns research snapshot and Eyes V0 recommendation', 'research module markers present')
    addCheck(checks, scriptSource.includes('upsertIntelligenceReportArtifact') && scriptSource.includes('renderGodModeExtractorResearchBrief'), 'focused script persists report and writes research brief', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes God Mode research card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves God Mode research card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes God Mode research card ID', 'coverage card ID present')
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
      researchPath: RESEARCH_PATH,
      nextCardId: NEXT_CARD_ID,
      snapshot: {
        status: snapshot.status,
        sourceCount: snapshot.sourceCount,
        architectureOptions: snapshot.architectureOptions.length,
        recommendedPrimaryRoute: snapshot.recommendedEyesV0.primaryRoute,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`God Mode extractor research swarm proof: ${result.status}`)
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
  console.error('God Mode extractor research swarm proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
