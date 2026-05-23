#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  recordIntelligenceAtomHit,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-db.js'
import {
  GEMINI_WORKSPACE_EYES_ROUTE_APPROVAL_PATH as APPROVAL_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID as CARD_ID,
  GEMINI_WORKSPACE_EYES_ROUTE_CHANGED_FILES as CHANGED_FILES,
  GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  GEMINI_WORKSPACE_EYES_PROFILE_DIR,
  GEMINI_WORKSPACE_EYES_ROUTE_NEXT_CARD_ID as NEXT_CARD_ID,
  GEMINI_WORKSPACE_EYES_ROUTE_NOT_NEXT as NOT_NEXT,
  GEMINI_WORKSPACE_EYES_ROUTE_PLAN_PATH as PLAN_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_PROOF_COMMANDS as PROOF_COMMANDS,
  GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID as REPORT_ARTIFACT_ID,
  GEMINI_WORKSPACE_EYES_ROUTE_KEY,
  GEMINI_WORKSPACE_EYES_ROUTE_SCRIPT_PATH as SCRIPT_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_SPRINT_ID as SPRINT_ID,
  buildGeminiWorkspaceEyesRouteSnapshot,
  buildGeminiWorkspaceEyesRouteWriteSet,
  renderGeminiWorkspaceEyesRouteCloseout,
  runGeminiWorkspaceEyesBrowserProof,
  verifyGeminiWorkspaceEyesRoutePersistedProof,
} from '../lib/gemini-workspace-eyes-route-proof.js'
import { DEFAULT_GEMINI_WORKSPACE_ACCOUNT } from '../lib/credential-vault.js'
import { GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID } from '../lib/god-mode-extractor-eyes-quality-loop.js'
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
const ISOLATED_PROFILE_DIR = path.join(os.homedir(), 'Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean')
const ACTOR = 'gemini-workspace-eyes-route-proof'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    liveBrowser: argv.includes('--live-browser') || argv.includes('--live-browser=true'),
    submitLivePrompt: argv.includes('--submit-live-prompt') || argv.includes('--submit-live-prompt=true'),
    useKeychainLogin: argv.includes('--use-keychain-login') || argv.includes('--use-keychain-login=true'),
    headful: argv.includes('--headful') || argv.includes('--headful=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    account: argv.find(arg => arg.startsWith('--account='))?.slice('--account='.length).trim() || DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({
    ok: Boolean(ok),
    check,
    detail: detail || '',
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
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

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: 'Reuse credential vault, isolated AI browser profile, Gemini API Eyes baseline, God Mode Eyes quality loop report, Foundation intelligence reports/atoms/hits, and Current Sprint overlay.',
    existingDocs: 'docs/rebuild/current-plan.md, docs/rebuild/current-state.md, God Mode Extractor Eyes closeout, overnight guard closeout, and the Gemini Workspace eyes route plan.',
    existingScripts: 'scripts/process-credential-vault-session-broker-check.mjs, scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs, scripts/process-extractor-overnight-run-guard-check.mjs, and existing Foundation health gates.',
    existingPolicy: 'Public YouTube only, isolated AI browser profile only, no credential/profile mutation, no external writes, no broad extraction, and proposal-only Build Intel.',
    reused: 'Keychain secret refs, Gemini browser session proof, API Eyes baseline report, Plan Critic, and Current Sprint mutation guards.',
    notRebuilt: 'Does not rebuild YouTube daily watch, Dev Hub UI, Skool/MyICOR auth, Mark last-50 extraction, or Gemini API Eyes.',
    exactGap: `${CARD_ID} answers whether the logged-in Gemini Workspace/App browser route can serve as extractor eyes without the Gemini API key.`,
    overBroadRisk: 'Browser auth fragility, quota/rate limits, false zero-cost claims, stale profile state, broad extraction before guard, and private/auth source drift.',
    readyBy: ACTOR,
    readyAt: '2026-05-23T17:20:00-04:00',
  }
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; start with a guarded 3-video subscription-eyes pilot before any Mark last-50 scale-up.`
      : 'Run one exact approved public Mark video through the logged-in Gemini Workspace/App browser route using the isolated AI Chrome profile and no Gemini API key.',
    statusNote: closeCard
      ? `Closed 2026-05-23 under ${CLOSEOUT_KEY}; logged-in Gemini Workspace browser route worked on one exact public Mark video without Gemini API key, persisted report ${REPORT_ARTIFACT_ID}, and classifies subscription eyes as Level 1 experimental with Gemini API fallback. See ${CLOSEOUT_PATH}.`
      : 'Executing Gemini Workspace eyes proof; one exact public YouTube video only, isolated AI Chrome profile only, no broad extraction, no credential/profile mutation, no external writes.',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'A dedicated isolated AI Chrome/Gemini account route is proven or rejected on one exact approved public video with no Gemini API key, exact proof artifacts, API Eyes fallback comparison, unchanged credential/profile posture, and no broad/private/external actions.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; Gemini Workspace browser eyes are usable as Level 1 experimental with Gemini API fallback.`
      : 'Gemini Workspace eyes route is the active proof before Mark scale-up.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...NOT_NEXT])),
    existingWorkCheck: {
      ...(item.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      routeUnderTest: GEMINI_WORKSPACE_EYES_ROUTE_KEY,
      preferredEyesRoute: closeCard ? GEMINI_WORKSPACE_EYES_ROUTE_KEY : item.metadata?.preferredEyesRoute,
      fallbackEyesRoute: 'foundation-video-gemini-api',
      subscriptionRouteLevel: closeCard ? 'level_1_experimental' : 'under_test',
      nextCardId: NEXT_CARD_ID,
      noBroadExtraction: true,
      noCredentialMutation: true,
      noExternalWrites: true,
      createsBacklogCardsAutomatically: false,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage || 'scoping',
    planRef: item.planRef || 'docs/process/mark-kashef-last-50-baseline-001-plan.md',
    definitionOfDone: item.definitionOfDone || 'Mark public last-50 baseline runs only after a guarded 3-video subscription-eyes pilot proves quality/stability; full baseline uses approved public videos, source provenance, quotas, and API fallback.',
    proofCommands: item.proofCommands?.length ? item.proofCommands : [
      'npm run process:current-sprint-active-card-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run process:foundation-plan-reconcile-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; start with 3-video pilot before Mark last-50.`,
    notNextBoundaries: Array.from(new Set([
      ...(item.notNextBoundaries || []),
      ...NOT_NEXT,
      'Do not run all 50 Mark videos until the first 3-video subscription-eyes pilot passes quality, quota, fallback, and guard checks.',
    ])),
    existingWorkCheck: {
      ...(item.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
      exactGap: 'Mark baseline needs a guarded pilot-first extraction plan that uses subscription eyes first and Gemini API fallback.',
      notRebuilt: 'Does not rebuild daily watch, Dev Hub, or private Skool/MyICOR extraction.',
    },
    metadata: {
      ...(item.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      blockedByCardId: null,
      preferredEyesRoute: GEMINI_WORKSPACE_EYES_ROUTE_KEY,
      fallbackEyesRoute: 'foundation-video-gemini-api',
      subscriptionRouteLevel: 'level_1_experimental',
      firstStep: 'three_video_subscription_eyes_pilot',
      fullLast50RequiresPilotPass: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(item => ({ ...item }))
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 8 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 8) + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return {
      ...item,
      metadata: {
        ...(item.metadata || {}),
        repoPosture: repoPosture(currentHead),
      },
    }
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            requested_by = EXCLUDED.requested_by,
            created_at = NOW()
      `,
      [
        `gemini-workspace-eyes-route-proof-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: CARD_ID,
          closeoutKey: CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Gemini Workspace eyes backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = git(['rev-parse', 'HEAD'])
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
          currentStatus: closeCard ? 'gemini_workspace_eyes_route_proof_closed' : 'gemini_workspace_eyes_route_proof_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: begin with a guarded 3-video subscription-eyes pilot; no Mark last-50 scale-up until pilot passes.`
            : `${CARD_ID}: prove logged-in Gemini Workspace/App browser eyes without Gemini API key.`,
          geminiWorkspaceEyesRouteReportArtifactId: REPORT_ARTIFACT_ID,
          preferredEyesRoute: closeCard ? GEMINI_WORKSPACE_EYES_ROUTE_KEY : previous.sprint?.metadata?.preferredEyesRoute,
          fallbackEyesRoute: 'foundation-video-gemini-api',
          subscriptionRouteLevel: closeCard ? 'level_1_experimental' : 'under_test',
          firstMarkBaselineStep: 'three_video_subscription_eyes_pilot',
          fullLast50RequiresPilotPass: true,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
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
      reason: 'Steve confirmed the Gemini subscription eyes idea worked and wants subscription first with API fallback before Mark scale-up.',
    },
  )
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist Gemini Workspace eyes report artifact, proposal-only atoms, and evidence hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const writeSet = buildGeminiWorkspaceEyesRouteWriteSet(snapshot)
  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  for (const atomInput of writeSet.atomInputs) atoms.push(await upsertIntelligenceAtom(atomInput, ACTOR))
  for (const hitInput of writeSet.hitInputs) hits.push(await recordIntelligenceAtomHit(hitInput, ACTOR))
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  return { writeSet, report, atoms, hits }
}

async function loadPersistedProof() {
  const bundle = await getIntelligenceReportBundle(REPORT_ARTIFACT_ID, { atomLimit: 100, hitLimit: 200 })
  return {
    report: bundle.report || null,
    atoms: list(bundle.atoms),
    hits: list(bundle.hits),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      packageJsonText,
      planText,
      currentPlanText,
      currentStateText,
      browserProfileReadme,
      moduleSource,
      credentialVaultSource,
      scriptSource,
      closeoutRegistrySource,
      coverageSource,
      approvalValidation,
      activeSprint,
      backlogItems,
      eyesReportBundle,
      isolatedProfileExists,
    ] = await Promise.all([
      readRepoFile('package.json'),
      readRepoFile(PLAN_PATH),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      readRepoFile('state/browser-profiles/README.md'),
      readRepoFile('lib/gemini-workspace-eyes-route-proof.js'),
      readRepoFile('lib/credential-vault.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getIntelligenceReportBundle(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 20, hitLimit: 40 }),
      pathExists(ISOLATED_PROFILE_DIR),
    ])

    const packageJson = JSON.parse(packageJsonText)
    const report = eyesReportBundle?.report || null
    const atoms = list(eyesReportBundle?.atoms)
    const hits = list(eyesReportBundle?.hits)
    const planReview = evaluatePlanCriticPlan({
      planText,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship gate because this card executes a logged-in Gemini Workspace browser route, stores credential metadata, writes intelligence report/atoms/hits, and changes Current Sprint order before Mark scale-up.',
      repoRoot,
    })
    let liveBrowserProof = null
    let snapshot = null
    let persisted = null
    let persistence = null

    if ((args.closeCard || args.apply) && !args.submitLivePrompt) {
      throw new Error(`Closing ${CARD_ID} requires --submit-live-prompt.`)
    }

    if (args.liveBrowser || args.submitLivePrompt || args.closeCard || args.apply) {
      liveBrowserProof = await runGeminiWorkspaceEyesBrowserProof({
        submit: args.submitLivePrompt || args.closeCard || args.apply,
        headless: !args.headful,
        useKeychainLogin: args.useKeychainLogin,
        account: args.account,
        profileDir: GEMINI_WORKSPACE_EYES_PROFILE_DIR,
        apiBaseline: report?.structuredOutputJson?.snapshot || report?.structured_output_json?.snapshot || null,
      })
      snapshot = buildGeminiWorkspaceEyesRouteSnapshot({
        generatedAt: new Date().toISOString(),
        liveBrowserProof,
        apiBaselineReport: report,
        currentSprint: activeSprint,
      })
    } else {
      persisted = await loadPersistedProof()
      snapshot = buildGeminiWorkspaceEyesRouteSnapshot({
        generatedAt: new Date().toISOString(),
        liveBrowserProof: null,
        apiBaselineReport: report,
        currentSprint: activeSprint,
      })
      if (persisted.report) {
        const persistedSnapshot = (persisted.report.structuredOutputJson || persisted.report.structured_output_json)?.snapshot || null
        if (persistedSnapshot) snapshot = {
          ...snapshot,
          ...persistedSnapshot,
          checks: persistedSnapshot.checks || snapshot.checks,
          failures: persistedSnapshot.failures || [],
        }
        persistence = verifyGeminiWorkspaceEyesRoutePersistedProof({
          snapshot,
          report: persisted.report,
          atoms: persisted.atoms,
          hits: persisted.hits,
        })
      }
    }

    if (args.closeCard || args.apply) {
      if (!snapshot.ok) throw new Error(`Gemini Workspace eyes route snapshot blocked: ${snapshot.failures.map(item => item.check).join(', ')}`)
      const persistedWrite = await persistProof(snapshot)
      persisted = {
        report: persistedWrite.report,
        atoms: persistedWrite.atoms,
        hits: persistedWrite.hits,
      }
      persistence = verifyGeminiWorkspaceEyesRoutePersistedProof({
        snapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
      })
      if (args.closeCard) {
        await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderGeminiWorkspaceEyesRouteCloseout(snapshot), 'utf8')
        await ensureLiveState({ closeCard: true, planReview })
      } else {
        await ensureLiveState({ closeCard: false, planReview })
      }
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const sprint = refreshedSprint.sprint || {}
    const sprintItems = list(refreshedSprint.items)
    const sprintCardIds = sprintItems.map(item => item.cardId).filter(Boolean)
    const refreshedCards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const activeItem = sprintItems.find(item => item.cardId === CARD_ID)
    const nextItem = sprintItems.find(item => item.cardId === NEXT_CARD_ID)
    const activeBacklog = refreshedCards.find(item => item.id === CARD_ID) || backlogItems.find(item => item.id === CARD_ID)
    const nextBacklog = refreshedCards.find(item => item.id === NEXT_CARD_ID) || backlogItems.find(item => item.id === NEXT_CARD_ID)
    const closedPosture = activeBacklog?.lane === 'done' || activeItem?.stage === 'done_this_sprint'
    const expectedActiveCardId = closedPosture ? NEXT_CARD_ID : CARD_ID
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

    addCheck(checks, packageJson.scripts?.['process:gemini-workspace-eyes-route-proof-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:gemini-workspace-eyes-route-proof-check'] || 'missing')
    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Gemini Workspace eyes route', buildPlanCriticResultSummary(planReview))
    addCheck(checks, !closedPosture || planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', closedPosture ? planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing' : 'not closing')
    addCheck(checks, planText.includes('logged-in Gemini Workspace/App browser route') && planText.includes('without using the Gemini API key'), 'plan states the exact Gemini account eyes question', PLAN_PATH)
    addCheck(checks, planText.includes('~/Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean'), 'plan requires isolated AI Chrome profile', PLAN_PATH)
    addCheck(checks, planText.includes('Does not automate Steve') && planText.includes('normal Chrome profile'), 'plan blocks Steve normal browser profile automation', PLAN_PATH)
    addCheck(checks, planText.includes('Does not mutate credentials') && planText.includes('browser profiles'), 'plan blocks credential/profile mutation', PLAN_PATH)
    addCheck(checks, planText.includes('MEETING-VAULT-ACL-001') && planText.includes('Drive permission mutation'), 'plan includes standard Meeting Vault and Drive guard', PLAN_PATH)
    addCheck(checks, planText.includes('No Mark last-50 extraction'), 'plan keeps Mark scale-up out of scope', PLAN_PATH)
    addCheck(checks, browserProfileReadme.includes('ai-bensoncrew-clean'), 'isolated AI browser profile is documented', 'state/browser-profiles/README.md')
    addCheck(checks, isolatedProfileExists, 'isolated AI browser profile exists locally', ISOLATED_PROFILE_DIR)
    addCheck(checks, sprint.sprintId === SPRINT_ID, 'expected YouTube to Dev Team Intelligence sprint is active', sprint.sprintId || 'missing')
    addCheck(checks, sprint.activeBlockerCardId === expectedActiveCardId, 'Current Sprint active blocker is reconciled', sprint.activeBlockerCardId || 'missing')
    addCheck(checks, activeItem?.planRef === PLAN_PATH, 'Gemini sprint item points at the Gemini Workspace plan', activeItem?.planRef || 'missing')
    addCheck(checks, !closedPosture || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks Gemini Workspace proof done after close', activeItem?.stage || 'not closing')
    addCheck(checks, !closedPosture || nextItem?.stage === 'scoping', 'Current Sprint advances Mark baseline after close', nextItem?.stage || 'not closing')
    addCheck(checks, activeItem?.metadata?.isolatedProfileOnly === true && activeItem?.metadata?.normalSteveProfileAllowed === false, 'active sprint metadata enforces isolated profile boundary', JSON.stringify(activeItem?.metadata || {}))
    addCheck(checks, list(activeItem?.notNextBoundaries).some(item => String(item).includes('MEETING-VAULT-ACL-001') && String(item).includes('Drive permissions')), 'active sprint item includes Meeting Vault and Drive guard', list(activeItem?.notNextBoundaries).join(' | '))
    addCheck(checks, activeBacklog && (closedPosture ? activeBacklog.lane === 'done' : activeBacklog.lane === 'scoped') && activeBacklog.priority === 'P0', 'backlog card exists with expected lane/P0', activeBacklog ? `${activeBacklog.id}:${activeBacklog.lane}/${activeBacklog.priority}` : 'missing')
    addCheck(checks, Number(activeBacklog?.rank || 999) < Number(nextBacklog?.rank || 999), 'Gemini proof is ordered before Mark baseline', `${activeBacklog?.rank || 'missing'} before ${nextBacklog?.rank || 'missing'}`)
    addCheck(checks, closedPosture ? nextItem?.metadata?.fullLast50RequiresPilotPass === true || nextBacklog?.nextAction?.includes('3-video') : nextItem?.metadata?.blockedByCardId === CARD_ID || nextBacklog?.nextAction?.includes(CARD_ID), 'Mark baseline is parked or pilot-gated correctly', nextItem?.metadata?.blockedByCardId || nextBacklog?.nextAction || JSON.stringify(nextItem?.metadata || {}))
    addCheck(checks, closedPosture
      ? currentPlanText.includes('GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001` - done') && currentPlanText.includes('3-video subscription')
      : currentPlanText.includes('next active card is `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001`') && currentPlanText.includes('MARK-KASHEF-LAST-50-BASELINE-001` is parked behind it'), 'current plan doc matches live active card', 'docs/rebuild/current-plan.md')
    addCheck(checks, closedPosture
      ? currentStateText.includes('Active next card: `MARK-KASHEF-LAST-50-BASELINE-001`') && currentStateText.includes('3-video subscription')
      : currentStateText.includes('Active next card: `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001`'), 'current state doc matches live active card', 'docs/rebuild/current-state.md')
    addCheck(checks, report?.reportArtifactId === GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, 'API Eyes baseline report is available for comparison', report?.reportArtifactId || 'missing')
    addCheck(checks, atoms.length > 0 && hits.length > 0, 'API Eyes baseline has atoms and evidence hits', `${atoms.length} atoms / ${hits.length} hits`)
    addCheck(checks, !args.submitLivePrompt || args.liveBrowser || args.submitLivePrompt, 'live submit can only run through browser route', 'browser route requested')
    if (args.liveBrowser || args.submitLivePrompt) {
      addCheck(checks, liveBrowserProof?.usedGeminiApi === false, 'live proof does not use Gemini API key', liveBrowserProof ? `route=${liveBrowserProof.routeKey}` : 'missing')
      addCheck(checks, liveBrowserProof?.profileDir === ISOLATED_PROFILE_DIR, 'live proof uses isolated AI browser profile', liveBrowserProof?.profileDir || 'missing')
      if (args.useKeychainLogin) {
        addCheck(checks, liveBrowserProof?.loginAttempt?.rawPasswordExposed === false || (liveBrowserProof?.sessionStatus === 'session_ready' && !liveBrowserProof?.loginAttempt), 'Keychain login attempt does not expose raw password in proof output', liveBrowserProof?.loginAttempt?.status || 'already signed in')
        addCheck(checks, liveBrowserProof?.sessionStatus === 'session_ready' || !['keychain_missing', 'keychain_empty'].includes(liveBrowserProof?.loginAttempt?.status), 'Gemini Keychain credential is present for login attempt', liveBrowserProof?.loginAttempt?.status || 'already signed in')
      }
      addCheck(checks, liveBrowserProof?.promptBoxVisible === true, 'Gemini browser page exposes prompt surface', liveBrowserProof?.sessionStatus || 'missing')
      addCheck(checks, liveBrowserProof?.sessionStatus === 'session_ready', 'Gemini Workspace/App browser account session is ready', liveBrowserProof?.sessionStatus || 'missing')
      if (args.submitLivePrompt) {
        addCheck(checks, liveBrowserProof?.submittedPrompt === true, 'live browser proof submitted one bounded prompt', liveBrowserProof?.routeOutcome || 'missing')
        addCheck(checks, liveBrowserProof?.routeOutcome === 'works', 'Gemini Workspace/App route returns structured eyes output', liveBrowserProof?.routeOutcome || 'missing')
      }
    }
    addCheck(checks, !args.submitLivePrompt && !args.closeCard ? true : snapshot?.ok === true, 'Gemini Workspace route snapshot is healthy', snapshot?.failures?.map(item => item.check).join(', ') || 'healthy')
    addCheck(checks, !closedPosture || persistence?.ok === true, 'persisted report, atoms, and hits read back after close', closedPosture ? persistence?.failed?.map(item => item.check).join(', ') || 'ok' : 'not closing')
    addCheck(checks, moduleSource.includes('buildGeminiWorkspaceEyesRouteSnapshot') && moduleSource.includes('fallbackEyesRoute'), 'module records subscription-first/API-fallback policy', 'module markers present')
    addCheck(checks, credentialVaultSource.includes('macos-keychain') && !/rawPasswordExposed:\s*true|password data for new item/i.test(credentialVaultSource), 'credential vault stores Keychain refs only', 'raw credential absent')
    addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses guarded live writes', SCRIPT_PATH)
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes Gemini Workspace eyes card', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && list(closeout.backlogIds).includes(CARD_ID), 'build closeout lookup resolves Gemini Workspace eyes card', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes Gemini Workspace eyes card ID', 'coverage card ID present')
    addCheck(checks, !closedPosture || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    const externalWritePattern = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|createBacklogItem)\s*\(/
    addCheck(checks, !externalWritePattern.test(`${moduleSource}\n${scriptSource}`), 'proof has no external notification/purchase/form/backlog writer', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      reportArtifactId: REPORT_ARTIFACT_ID,
      mode: args.submitLivePrompt ? 'live_browser_submit' : args.liveBrowser ? 'live_browser_session_probe' : 'scoping_preflight',
      routeUnderTest: GEMINI_WORKSPACE_EYES_ROUTE_KEY,
      currentKnownEyesRoute: 'gemini_api',
      routeOutcome: liveBrowserProof?.routeOutcome || 'pending_live_browser_proof',
      isolatedProfileDir: ISOLATED_PROFILE_DIR,
      account: args.account,
      useKeychainLogin: args.useKeychainLogin,
      nextCardId: NEXT_CARD_ID,
      routePolicy: snapshot?.routePolicy,
      snapshot: {
        status: snapshot?.status,
        visualEvidence: snapshot?.summary?.visualEvidence || 0,
        workflowMoments: snapshot?.summary?.workflowMoments || 0,
        buildCandidates: snapshot?.summary?.buildCandidates || 0,
        subscriptionRouteLevel: snapshot?.routePolicy?.subscriptionRouteLevel,
        preferredEyesRoute: snapshot?.routePolicy?.preferredEyesRoute,
        fallbackEyesRoute: snapshot?.routePolicy?.fallbackEyesRoute,
      },
      liveBrowserProof,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Gemini Workspace eyes route proof preflight: ${result.status}`)
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
  console.error('Gemini Workspace eyes route proof preflight failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
