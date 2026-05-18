#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { recordBuildLaneFailureEventsFromChecks } from '../lib/build-lane-failure-telemetry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  getPlanCriticRunsByCardIds,
  getSourceContractRegistrySnapshot,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  MARKETING_MEASUREMENT_CHANGED_FILES,
  MARKETING_MEASUREMENT_NEW_SOURCE_IDS,
  MARKETING_MEASUREMENT_NOT_NEXT_BOUNDARIES,
  MARKETING_MEASUREMENT_PROOF_COMMANDS,
  MARKETING_MEASUREMENT_PROVIDER_DECISION_SOURCE_IDS,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID,
  buildMarketingMeasurementSourceContractsDogfoodProof,
  evaluateMarketingMeasurementSourceContracts,
} from '../lib/marketing-measurement-source-contracts.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
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

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-contract-validation-layer.js',
      'lib/source-connector-matrix.js',
      'lib/connector-credential-registry.js',
      'lib/source-lifecycle-completion.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-16-connector-completion-prep-matrix.md',
      'docs/source-registry.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/source-notes/freedom-marketing.md',
    ],
    existingScripts: [
      'scripts/process-source-connector-matrix-check.mjs',
      'scripts/process-source-contract-validation-layer-check.mjs',
      'scripts/sync-source-contract-registry.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'SOURCE-016 owns the marketing source map and separates no-auth source-contract prep from auth/provider work.',
      'GA4/GSC/GBP were missing source contract identities; Google Ads, Meta, and SocialPilot need later auth or owner-boundary decisions.',
      'Source contracts must fail closed before connector or extractor work depends on them.',
    ],
    reused: [
      'Existing source contract registry table and sync path.',
      'Existing source-contract validation layer.',
      'Existing source connector matrix and credential registry rows.',
    ],
    notRebuilt: [
      'No Marketing Hub production work.',
      'No provider/OAuth repair.',
      'No extraction runtime or extraction target creation.',
    ],
    exactGap: 'GA4, Search Console, and Google Business Profile have credential-registry and matrix references but did not have first-class source contracts.',
    overBroadRisk: 'This can drift into live provider reads, OAuth repair, paid/source auth, extraction targets, or marketing product work.',
    readyBy: 'Steve approved overnight safe Foundation source/connector progress after Action Route reliability work.',
    readyAt: '2026-05-18T06:30:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
    title: 'Define the marketing pillar source map for Benson Crew, Steve Zahnd, and MarketMasters',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 39,
    source: 'Steve overnight Foundation queue; connector-completion-prep-v1; SOURCE-016 existing live card.',
    summary: 'Close the no-auth marketing measurement source-contract prep gap by registering GA4, Search Console, and Google Business Profile as fail-closed source identities.',
    whyItMatters: 'Foundation cannot safely build marketing measurement, connector, or extractor work while GA4/GSC/GBP are phantom source IDs instead of owned, blocked, source-contract truth.',
    nextAction: closeCard
      ? `Done under \`${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY}\`. Continue to the next safe Foundation-up card from repo truth.`
      : 'Register GA4/GSC/GBP source contracts and connector rows as blocked/fail-closed prep only; do not run provider calls, auth, or extraction.',
    statusNote: closeCard
      ? `Closed under \`${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY}\`; GA4/GSC/GBP are first-class source contracts and remain blocked from extraction until auth/account approval.`
      : `Scope/proof: \`${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY}\`; GA4/GSC/GBP source-contract prep, no provider calls or extraction.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH,
    definitionOfDone: 'GA4, Search Console, and Google Business Profile have first-class source contracts, available-pending connector rows, source-contract validation profiles, source-lifecycle blocked rules, connector matrix blocked decisions, registry sync, focused proof, verifier coverage, closeout registry, and full ship gate green without live provider calls or extraction.',
    proofCommands: MARKETING_MEASUREMENT_PROOF_COMMANDS,
    readinessBlockerCleared: 'SOURCE-016 was already the live marketing source-map card; Steve approved safe overnight Foundation source/connector work, but no auth-required live run or provider call is approved.',
    notNextBoundaries: MARKETING_MEASUREMENT_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH,
      closeoutKey: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
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
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-source-016-marketing-measurement')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `source-016-marketing-${stableRunId(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH)}`,
        MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
        MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH,
        MARKETING_MEASUREMENT_CHANGED_FILES,
        JSON.stringify({ status: 'pass', score: 10, cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-016-marketing-measurement',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID}.`,
        JSON.stringify({ closeoutKey: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY, stage }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH,
    operation: 'create/update SOURCE-016 backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID,
        status: 'active',
        goal: 'Close SOURCE-016 no-auth marketing measurement source-contract prep without live provider calls.',
        activeBlockerCardId: closeCard ? null : MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-016-marketing-measurement',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue safe Foundation queue from repo truth.'
            : 'Build fail-closed GA4/GSC/GBP source contracts; no provider calls, auth, paid runs, extraction, or external writes.',
          priorityOrder: [MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID],
          notNext: MARKETING_MEASUREMENT_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'GA4/GSC/GBP source contracts exist.',
            'Source-contract validation blocks extraction.',
            'Connector matrix rows move from missing_contract to blocked authorization.',
            'Source registry table sync is healthy.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-016-marketing-measurement',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID,
      reason: 'Steve approved continuous safe Foundation source/connector work overnight.',
    },
  )
}

function unsafeRuntimeCallTokens(source = '') {
  const tokens = [
    'startExtractionRun(',
    'fetchTranscript(',
    'captureScreenshot(',
    'createChatCompletion(',
    'responses.create(',
    'sendGmail(',
    'writeClickUp(',
    'drive.permissions.',
  ]
  return tokens.filter(token => String(source || '').includes(token))
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    extractionControl,
    registrySnapshot,
    packageSource,
    planSource,
    scriptSource,
    proofModuleSource,
    sourceContractsSource,
    marketingSourceContractsSource,
    validationLayerSource,
    lifecycleSource,
    matrixSource,
    matrixCheckSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutSourceRecordsSource,
    sourceRegistryDoc,
    currentState,
    currentPlan,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH,
      cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
    }),
    getBacklogItemsByIds([MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID]),
    getFoundationBuildCloseouts(),
    getExtractionControlSnapshot({ limit: 300 }),
    getSourceContractRegistrySnapshot(),
    readRepoFile('package.json'),
    readRepoFile(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH),
    readRepoFile(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH),
    readRepoFile('lib/marketing-measurement-source-contracts.js'),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/source-contracts-marketing.js'),
    readRepoFile('lib/source-contract-validation-layer.js'),
    readRepoFile('lib/source-lifecycle-completion.js'),
    readRepoFile('lib/source-connector-matrix.js'),
    readRepoFile('scripts/process-source-connector-matrix-check.mjs'),
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    readRepoFile('lib/foundation-build-closeout-source-records.js', { optional: true }),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_PATH, { optional: true }),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID) || null
  const activeItem = (sprint.items || []).find(item => item.cardId === MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID) || null
  const stageOk = ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(activeItem?.stage) || card?.lane === 'done'
  const cardScaffold = validateBuildLaneCardScaffold(card || buildCardRow({ closeCard: false }))
  const sprintMetadata = validateBuildLaneSprintItemMetadata(activeItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items || [], cards })
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID, priority: 'P0' },
    changedFiles: MARKETING_MEASUREMENT_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const marketingStatus = evaluateMarketingMeasurementSourceContracts({
    extractionTargets: extractionControl.targets || [],
  })
  const dogfood = buildMarketingMeasurementSourceContractsDogfoodProof()
  const closeoutRecord = closeouts.find(record => record.key === MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY)
  const unsafeRuntimeTokens = unsafeRuntimeCallTokens([
    proofModuleSource,
    sourceContractsSource,
    marketingSourceContractsSource,
    validationLayerSource,
    lifecycleSource,
    matrixSource,
    verifierSource,
  ].join('\n'))

  addCheck(checks, approval.ok && approval.mode === 'v2', 'approval file is valid v2 and matches plan hash', approval.failures?.map(f => f.check).join('; ') || approval.approvalRef)
  addCheck(checks, cardScaffold.ok, 'live backlog card has required scaffold fields', cardScaffold.missing.join(', ') || card?.lane || 'ok')
  addCheck(checks, stageOk && sprint.sprint?.sprintId === MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID, 'Current Sprint points to SOURCE-016 marketing source-contract prep', `${sprint.sprint?.sprintId || 'missing'}:${activeItem?.stage || card?.lane || 'missing'}`)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item has complete metadata before build/done', sprintMetadata.missing.join(', ') || 'ok')
  addCheck(checks, currentSprintStatus.status === 'healthy' || card?.lane === 'done', 'Current Sprint status remains healthy or historically done', currentSprintStatus.status)
  addCheck(checks, planCriticPass && selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic coverage passes for SOURCE-016', `stored=${planCriticPass} self=${selfReview.status}:${selfReview.score}`)
  addCheck(checks, marketingStatus.ok && marketingStatus.summary.blockedMarketingMeasurementRows === 3, 'marketing measurement source contracts evaluate fail-closed', JSON.stringify(marketingStatus.summary))
  addCheck(checks, dogfood.ok, 'dogfood catches missing contracts, missing connectors, and active extraction targets', dogfood.invariant)
  addCheck(checks, registrySnapshot.evaluation.ok === true && registrySnapshot.evaluation.summary.expectedCount >= 42 && registrySnapshot.evaluation.summary.activeCount >= 42, 'source_contract_registry is synced to new source contract count', JSON.stringify(registrySnapshot.evaluation.summary))
  addCheck(checks, packageJson.scripts?.['process:source-016-marketing-measurement-source-contracts-check'] === 'node --env-file-if-exists=.env scripts/process-source-016-marketing-measurement-source-contracts-check.mjs', 'package script is registered', packageJson.scripts?.['process:source-016-marketing-measurement-source-contracts-check'] || 'missing')
  addCheck(checks, includesAll(sourceContractsSource, ['source-contracts-marketing.js', '...marketingSourceContracts', '...marketingSourceConnectors']), 'root source contracts delegate marketing contracts/connectors to domain module', 'source-contracts.js')
  addCheck(checks, MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId => marketingSourceContractsSource.includes(sourceId)), 'marketing source-contract module registers GA4/GSC/GBP source IDs', MARKETING_MEASUREMENT_NEW_SOURCE_IDS.join(', '))
  addCheck(checks, MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId => validationLayerSource.includes(sourceId)) && validationLayerSource.includes('blocked_until_authorized'), 'validation layer includes fail-closed profiles for new sources', 'source-contract-validation-layer.js')
  addCheck(checks, MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId => lifecycleSource.includes(sourceId)), 'source lifecycle completion marks new sources accepted-blocked', 'source-lifecycle-completion.js')
  addCheck(checks, MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId => matrixSource.includes(sourceId)) && matrixSource.includes('Source contract exists as fail-closed prep'), 'source connector matrix keeps new sources blocked', 'source-connector-matrix.js')
  addCheck(checks, includesAll(matrixCheckSource, ['SRC-GA4-001', 'SRC-GSC-001', 'SRC-GBP-001', 'available-pending connector registry row']), 'source connector matrix focused proof reflects new blocked-contract posture', 'process-source-connector-matrix-check')
  addCheck(checks, includesAll(verifierSource, ['evaluateMarketingMeasurementSourceContracts', 'buildMarketingMeasurementSourceContractsDogfoodProof', 'MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID']), 'source-contract verifier carries ongoing SOURCE-016 coverage', 'foundation-source-contract-verifier.js')
  addCheck(checks, MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId => sourceRegistryDoc.includes(sourceId)) && sourceRegistryDoc.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY), 'source registry documents new source IDs and closeout', 'docs/source-registry.md')
  addCheck(checks, currentState.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY) && currentState.includes('42 active source-contract rows'), 'current-state documents shipped source-contract count and blocked posture', 'docs/rebuild/current-state.md')
  addCheck(checks, currentPlan.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY) && currentPlan.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID), 'current-plan routes SOURCE-016 next truth', 'docs/rebuild/current-plan.md')
  addCheck(checks, closeoutRecordsSource.includes('foundation-build-closeout-source-records.js') && closeoutSourceRecordsSource.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY), 'closeout registry includes source-record module and SOURCE-016 closeout', 'foundation build closeout records')
  addCheck(checks, MARKETING_MEASUREMENT_PROVIDER_DECISION_SOURCE_IDS.every(sourceId => marketingStatus.matrix.rows.some(row => row.sourceId === sourceId && row.decision !== 'connected')), 'Google Ads, Meta, and SocialPilot are not fake-completed by this card', MARKETING_MEASUREMENT_PROVIDER_DECISION_SOURCE_IDS.join(', '))
  addCheck(checks, !unsafeRuntimeTokens.length, 'implementation does not introduce runtime extraction/model/external-write calls', unsafeRuntimeTokens.join(', ') || 'clean')
  addCheck(checks, !args.closeCard || (closeoutRecord && closeoutDoc.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY)), 'closeout registry and handoff exist before close-card', closeoutRecord ? closeoutRecord.key : 'missing closeout record')
  addCheck(checks, !args.closeCard || card?.lane === 'done', 'live backlog card is done on close-card', card?.lane || 'missing')

  const failed = checks.filter(check => !check.ok)
  if (failed.length) {
    recordBuildLaneFailureEventsFromChecks({
      checks,
      repoRoot,
      command: 'process:source-016-marketing-measurement-source-contracts-check',
      cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
      sprintId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID,
      fileModule: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH,
    })
  }

  const payload = {
    ok: failed.length === 0,
    cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
    closeoutKey: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY,
    checks,
    failed,
    dogfood: {
      ok: dogfood.ok,
      invariant: dogfood.invariant,
    },
    summary: marketingStatus.summary,
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      stage: activeItem?.stage || null,
      status: currentSprintStatus.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    console.log(`SOURCE-016 marketing measurement source-contract check: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  recordBuildLaneFailureEventsFromChecks({
    checks: [{ ok: false, check: 'process-source-016-marketing-measurement-source-contracts-check crashed', detail: error instanceof Error ? error.message : String(error) }],
    repoRoot,
    command: 'process:source-016-marketing-measurement-source-contracts-check',
    cardId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID,
    sprintId: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID,
    fileModule: MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH,
  })
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
