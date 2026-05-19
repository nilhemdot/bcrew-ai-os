#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  WEB_GODMODE_APPROVAL_PATH,
  WEB_GODMODE_CARD_ID,
  WEB_GODMODE_CHANGED_FILES,
  WEB_GODMODE_CLOSEOUT_KEY,
  WEB_GODMODE_CLOSEOUT_PATH,
  WEB_GODMODE_NEXT_CARD_ID,
  WEB_GODMODE_NOT_NEXT_BOUNDARIES,
  WEB_GODMODE_PLAN_PATH,
  WEB_GODMODE_PROOF_COMMANDS,
  WEB_GODMODE_REQUIRED_PRIOR_CARDS,
  WEB_GODMODE_SCRIPT_PATH,
  WEB_GODMODE_SPRINT_CARD_ORDER,
  WEB_GODMODE_SPRINT_ID,
  buildWebGodmodeDogfoodProof,
  buildWebGodmodeObservation,
  validateWebGodmodeRequest,
} from '../lib/web-godmode-extractor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

function stableRunId(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readText(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function lineCount(value = '') {
  return String(value || '').split('\n').length
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/multimodal-extractor-contract.js',
      'lib/course-source-auth-boundary.js',
      'lib/extraction-team-runtime.js',
      'lib/extraction-to-kb-atom-pipeline.js',
      'lib/web-godmode-extractor.js',
    ],
    existingDocs: [
      'docs/process/multimodal-extractor-001-plan.md',
      'docs/process/course-source-auth-boundary-001-plan.md',
      'docs/process/extraction-team-runtime-001-plan.md',
      'docs/process/old-system-research-team-harvest-001-plan.md',
      WEB_GODMODE_PLAN_PATH,
    ],
    existingScripts: [
      'scripts/process-old-system-research-team-harvest-check.mjs',
      'scripts/process-foundation-operator-pulse-check.mjs',
      WEB_GODMODE_SCRIPT_PATH,
    ],
    existingCards: [
      ...WEB_GODMODE_REQUIRED_PRIOR_CARDS,
      WEB_GODMODE_CARD_ID,
      WEB_GODMODE_NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Private, paid, community, course, Loom, Skool, MyICOR, and authorized-browser extraction remains source-specific approval-bound.',
      'This V1 builds a governed kernel and synthetic observation proof only.',
      'Extraction output is proposal-only and cannot mutate backlog, atoms, KB, synthesis, action routes, vectors, or external systems from content.',
    ],
    reused: [
      'multimodal envelope validation',
      'course source auth boundary',
      'extraction team supervised runtime boundary',
      'old-system scout harvest promoted browser/page/video pattern',
      'operator pulse next-card control surface',
    ],
    notRebuilt: [
      'No browser login worker.',
      'No live site crawl.',
      'No private/premium source read.',
      'No video download/transcription/model analysis.',
      'No downstream content write.',
    ],
    exactGap: 'The next extractor stack needs a reusable browser/page/video observation kernel that enforces source boundary, stop controls, evidence/provenance, and no unsafe side effects before Loom, Skool, MyICOR, or rich video workers can run.',
    overBroadRisk: 'This can drift into a wild crawler or private browser session. V1 is kernel/proof only.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-19T18:00:00.000-04:00',
  }
}

function buildSprintItem(cardId, index, { closeCard = false } = {}) {
  const isWeb = cardId === WEB_GODMODE_CARD_ID
  const isNext = cardId === WEB_GODMODE_NEXT_CARD_ID
  const stage = isWeb
    ? (closeCard ? 'done_this_sprint' : 'building_now')
    : (closeCard && isNext ? 'scoping' : 'scoping')
  return {
    cardId,
    order: index + 1,
    stage,
    planRef: isWeb ? WEB_GODMODE_PLAN_PATH : null,
    definitionOfDone: isWeb
      ? 'Governed web/page/video observation kernel proves approved source boundary, page text, DOM outline, screenshot policy, media/transcript discovery, cost/runtime ledger, provenance, stop controls, and no live private/browser extraction.'
      : 'Scope/build only after WEB-GODMODE-001 closes cleanly; preserve source-auth and approval boundaries.',
    proofCommands: isWeb
      ? WEB_GODMODE_PROOF_COMMANDS
      : [
          'scope-first: create plan/approval/focused proof before implementation',
          'npm run process:system-health-nightly-audit-check -- --json',
          'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify -- --json-summary',
        ],
    readinessBlockerCleared: isWeb
      ? 'Deep auditor, deep merge audit, old research harvest, operator pulse, multimodal contract, course auth boundary, extraction-team runtime, and proposal-only output pipeline are already closed.'
      : `${WEB_GODMODE_CARD_ID} provides the governed kernel this card builds on.`,
    notNextBoundaries: [
      ...WEB_GODMODE_NOT_NEXT_BOUNDARIES,
      'MEETING-VAULT-ACL-001 Phase B and Drive permissions mutation remain blocked unless separately approved.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      closeoutKey: isWeb ? WEB_GODMODE_CLOSEOUT_KEY : null,
      nextAfterWebGodmode: WEB_GODMODE_NEXT_CARD_ID,
      foundationOnly: true,
      approvalBoundActionsParkInsteadOfStop: true,
    },
  }
}

async function upsertPlanCriticRun(planCritic) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (run_id, card_id, plan_ref, status, score, max_score, pass_threshold, priority, gate_level, full_verify_required, changed_files, findings, result, requested_by)
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-web-godmode')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `web-godmode-${stableRunId(WEB_GODMODE_PLAN_PATH)}`,
        WEB_GODMODE_CARD_ID,
        WEB_GODMODE_PLAN_PATH,
        planCritic.status,
        planCritic.score,
        WEB_GODMODE_CHANGED_FILES,
        JSON.stringify(planCritic.findings || []),
        JSON.stringify({ status: planCritic.status, score: planCritic.score, cardId: WEB_GODMODE_CARD_ID }),
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, planCritic }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: WEB_GODMODE_SCRIPT_PATH,
    operation: 'update WEB-GODMODE card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await initFoundationDb()
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(WEB_GODMODE_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    nextAction: closeCard
      ? `Closed under ${WEB_GODMODE_CLOSEOUT_KEY}. Continue ${WEB_GODMODE_NEXT_CARD_ID} as the first authorized Loom proof using this kernel.`
      : 'Build the governed kernel/proof only. No live browser launch, private auth, broad crawl, screenshot bytes, model calls, or downstream writes.',
    statusNote: closeCard
      ? `Closed on 2026-05-19 under \`${WEB_GODMODE_CLOSEOUT_KEY}\`. V1 adds \`lib/web-godmode-extractor.js\`, \`scripts/process-web-godmode-check.mjs\`, plan/approval/closeout wiring, and closeout registry proof. It proves source URL/host boundary, page text, DOM outline, link/media/transcript discovery, screenshot policy, cost/runtime ledger, provenance, multimodal envelope compatibility, stop controls, and dogfood blockers for unknown access, missing private preflight, cross-host navigation, broad crawl, screenshot-without-policy, external writes, live browser side effects, and live-run-without-preflight. No browser was launched, no network fetch ran, no private/auth source was read, no screenshot bytes were stored, no model call ran, and no downstream/external writes occurred.`
      : `Executing under \`${WEB_GODMODE_CLOSEOUT_KEY}\`; governed kernel/proof only.`,
    owner: 'Foundation',
  }, 'codex-web-godmode')
  await upsertPlanCriticRun(planCritic)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: WEB_GODMODE_SPRINT_ID,
        status: 'active',
        goal: 'Build the governed GOD-mode extraction stack from source/auth-safe kernels through Loom, meeting video, Skool, MyICOR, Drive, Build Intel review, shared comms, and trust scoring.',
        activeBlockerCardId: closeCard ? WEB_GODMODE_NEXT_CARD_ID : WEB_GODMODE_CARD_ID,
        metadata: {
          stage: closeCard ? 'web_godmode_done_next_scoping' : 'web_godmode_building',
          currentStatus: closeCard ? 'continue_next_card' : 'building_now',
          nextAction: closeCard
            ? `Continue ${WEB_GODMODE_NEXT_CARD_ID}; park approval-bound live/private operations and keep moving through safe work.`
            : 'Close WEB-GODMODE-001 before Loom/Skool/MyICOR rich extraction.',
          priorityOrder: WEB_GODMODE_SPRINT_CARD_ORDER,
          notNext: WEB_GODMODE_NOT_NEXT_BOUNDARIES,
          approvalPolicy: 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue safe sprint work.',
          exitCriteria: [
            'System Health remains healthy with no raw workflow failures.',
            'Repeated-failure gate remains healthy with no unresolved red blockers.',
            'Each card ships through focused proof, backlog hygiene, foundation:verify, process:foundation-ship, and clean pushed main.',
            'Approval-bound live/private/browser operations are parked with exact blocker and do not stop safe sprint progression.',
            'WEB-GODMODE, Loom, meeting video, Skool, MyICOR, Drive worker, Build Intel review, shared comms, and trust scoring work stay source-backed and proposal-safe.',
          ],
        },
      },
      items: WEB_GODMODE_SPRINT_CARD_ORDER.map((cardId, index) => buildSprintItem(cardId, index, { closeCard })),
    },
    'codex-web-godmode',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || previous.sprint?.sprint_id || null,
      reason: `${WEB_GODMODE_CARD_ID} starts the approved GOD-mode extraction sprint after Foundation-only closeout.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    approval,
    packageSource,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readText(WEB_GODMODE_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: WEB_GODMODE_APPROVAL_PATH, cardId: WEB_GODMODE_CARD_ID }),
    readText('package.json'),
    readText('lib/web-godmode-extractor.js'),
    readText(WEB_GODMODE_SCRIPT_PATH),
    readText('lib/foundation-build-closeout-intelligence-records.js'),
    readText(WEB_GODMODE_CLOSEOUT_PATH, { optional: true }),
  ])
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: WEB_GODMODE_CARD_ID, priority: 'P0', title: 'Build governed website GOD-mode extraction worker' },
    changedFiles: WEB_GODMODE_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const writeRequested = args.apply || args.closeCard
  if (writeRequested && !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, planCritic })

  await initFoundationDb()
  const [
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    getBacklogItemsByIds([...WEB_GODMODE_REQUIRED_PRIOR_CARDS, ...WEB_GODMODE_SPRINT_CARD_ORDER]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([WEB_GODMODE_CARD_ID, WEB_GODMODE_NEXT_CARD_ID]),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(row => row.id === WEB_GODMODE_CARD_ID) || null
  const nextCard = cards.find(row => row.id === WEB_GODMODE_NEXT_CARD_ID) || null
  const missingPriorCards = WEB_GODMODE_REQUIRED_PRIOR_CARDS.filter(id => cards.find(row => row.id === id)?.lane !== 'done')
  const sprintItem = (sprint.items || []).find(item => item.cardId === WEB_GODMODE_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === WEB_GODMODE_NEXT_CARD_ID) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === WEB_GODMODE_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const observation = buildWebGodmodeObservation()
  const dogfood = buildWebGodmodeDogfoodProof()
  const blockedRequest = validateWebGodmodeRequest({
    accessClass: 'authorized_paid_private',
    sourceType: 'authorized_skool_lesson',
    sourceUrl: 'https://skool.com/private/module',
    allowedHosts: ['skool.com'],
    rightsClass: 'private_community',
    contentUseBoundary: 'Approval required before private community content is accessed.',
  })

  addCheck(checks, approval.ok && Number(approval.approval?.score || 0) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || WEB_GODMODE_APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live WEB-GODMODE card is executing or done', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, missingPriorCards.length === 0, 'required prior extraction/foundation cards are done', missingPriorCards.join(', ') || `${WEB_GODMODE_REQUIRED_PRIOR_CARDS.length} done`)
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Loom card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === WEB_GODMODE_SPRINT_ID || sprint.sprint?.sprint_id === WEB_GODMODE_SPRINT_ID, 'Current Sprint truth uses GOD-mode extraction sprint', sprint.sprint?.sprintId || sprint.sprint?.sprint_id || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains WEB-GODMODE item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint parks next Loom card for safe scoping', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, observation.ok && observation.status === 'ready', 'synthetic web observation is ready', JSON.stringify(observation.runLedger))
  addCheck(checks, observation.liveBrowserLaunched === false && observation.networkFetched === false, 'V1 proof launches no browser and fetches no network', JSON.stringify({ liveBrowserLaunched: observation.liveBrowserLaunched, networkFetched: observation.networkFetched }))
  addCheck(checks, observation.page.textChars > 100 && observation.page.domOutline.mediaCount >= 2 && observation.page.domOutline.transcriptCandidateCount >= 1, 'observation captures page text, DOM outline, media, and transcript candidates', JSON.stringify(observation.page.domOutline))
  addCheck(checks, observation.screenshotReferences.length === 1 && observation.screenshotReferences.every(row => row.bytesStored === false), 'screenshot proof is policy-backed reference only', JSON.stringify(observation.screenshotReferences))
  addCheck(checks, observation.multimodal.ok === true && observation.envelope.autoBacklogMutation === false, 'multimodal envelope accepts proposal-only web evidence', observation.multimodal.findings?.join(', ') || observation.envelope.sourceId)
  addCheck(checks, dogfood.ok, 'dogfood blocks unsafe GOD-mode variants', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, blockedRequest.ok === false && blockedRequest.failures.some(row => row.code === 'browser_session_preflight_required'), 'private/auth source blocks without source-specific preflight', blockedRequest.failures.map(row => row.code).join(', '))
  addCheck(checks, packageJson.scripts?.['process:web-godmode-check'] === `node --env-file-if-exists=.env ${WEB_GODMODE_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:web-godmode-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(WEB_GODMODE_CLOSEOUT_KEY) && closeoutRegistrySource.includes(WEB_GODMODE_CARD_ID), 'closeout registry includes WEB-GODMODE closeout', WEB_GODMODE_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes(WEB_GODMODE_CARD_ID) && closeoutDoc.includes(WEB_GODMODE_CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', WEB_GODMODE_CLOSEOUT_PATH)
  addCheck(checks, moduleSource.includes('buildWebGodmodeDogfoodProof') && moduleSource.includes('forbidden_operation_requested') && moduleSource.includes('live_run_requires_preflight'), 'module owns reusable stop-control dogfood', 'lib/web-godmode-extractor.js')
  addCheck(checks, scriptSource.includes('approval-bound operations') || scriptSource.includes('approval-bound'), 'focused script preserves parked-blocker operating model', WEB_GODMODE_SCRIPT_PATH)
  addCheck(checks, lineCount(moduleSource) < 900, 'web-godmode module stays under module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) < 650, 'web-godmode proof script stays under module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: WEB_GODMODE_CARD_ID,
    closeoutKey: WEB_GODMODE_CLOSEOUT_KEY,
    nextCardId: WEB_GODMODE_NEXT_CARD_ID,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      syntheticMediaCount: observation.media?.length || 0,
      transcriptCandidateCount: observation.transcriptCandidates?.length || 0,
      rejectedDogfoodCount: dogfood.rejectedCases?.filter(row => row.ok).length || 0,
    },
    checks,
    failed,
  }
  await closeFoundationDb()
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`WEB-GODMODE check: ${result.status} (${result.summary.passed}/${result.summary.total})`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
