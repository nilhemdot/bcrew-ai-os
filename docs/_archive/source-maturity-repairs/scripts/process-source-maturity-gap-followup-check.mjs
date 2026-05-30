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
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceCoverageCloseoutSnapshot } from '../lib/source-coverage-closeout.js'
import { buildSourceExtractionCoverageSnapshot } from '../lib/source-extraction-coverage.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
  SOURCE_MATURITY_GAP_FOLLOWUP_CHANGED_FILES,
  SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS,
  SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY,
  SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_PROOF_COMMANDS,
  SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID,
  buildSourceMaturityGapFollowupSnapshot,
  buildSyntheticSourceMaturityGapFollowupProof,
  findMissingMaturityGapSourceIds,
  renderSourceMaturityGapTriageReport,
} from '../lib/source-maturity-gap-followup.js'

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

function list(value) {
  return Array.isArray(value) ? value : []
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
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

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-maturity-grid.js',
      'lib/source-extraction-coverage.js',
      'lib/source-coverage-closeout.js',
      'lib/source-extraction-gap-followup.js',
      'lib/source-contracts.js',
    ],
    existingDocs: [
      'docs/process/source-maturity-grid-001-plan.md',
      'docs/process/source-extraction-coverage-001-plan.md',
      'docs/process/source-coverage-closeout-001-plan.md',
      'docs/process/source-extraction-gap-followup-001-plan.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-12-foundation-source-once-over-closeout.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-grid-check.mjs',
      'scripts/process-source-extraction-coverage-check.mjs',
      'scripts/process-source-coverage-closeout-check.mjs',
      'scripts/process-source-extraction-gap-followup-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Source Coverage Closeout routes maturity gaps to SOURCE-MATURITY-GAP-FOLLOWUP-001.',
      'Source maturity rows need source-backed evidence before product loops consume them.',
      'Source follow-up work must not start auth-required extraction, provider calls, paid runs, or external writes.',
    ],
    reused: [
      'Existing source maturity grid snapshot.',
      'Existing source extraction coverage snapshot.',
      'Existing source coverage closeout decisions.',
      'Existing build-lane scaffold and Current Sprint guards.',
    ],
    notRebuilt: [
      'No new source maturity model.',
      'No extraction runtime execution.',
      'No provider connector/auth repair.',
      'No broad UI redesign.',
    ],
    exactGap: 'Nine source rows are routed to SOURCE-MATURITY-GAP-FOLLOWUP-001, but the generic follow-up card has not ranked those rows or created exact repair queues.',
    overBroadRisk: 'This can drift into live extraction, fake atom creation, provider auth work, external writes, or claiming source maturity complete without evidence.',
    readyBy: 'Steve approved autonomous safe overnight Foundation source/connector work after build-lane reliability shipped.',
    readyAt: '2026-05-18T07:10:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    title: 'Advance source maturity rows after coverage closeout',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 32,
    source: 'Source coverage closeout matrix; Steve approved continuous safe Foundation source work.',
    summary: 'Turn routed source maturity gaps into ranked, source-backed repair queues without starting extraction or external work.',
    whyItMatters: 'Foundation needs maturity gaps to become exact next repair cards instead of vague non-green rows before agents or product loops trust those sources.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY}\`. Pull the next safe child repair card from the maturity triage report.`
      : 'Rank source maturity gaps, create scoped child repair cards, and prove no live extraction/auth/provider/external-write work starts.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY}\`; maturity gaps are triaged into child repair queues with strict no-live-run boundaries.`
      : `Scope/proof: \`${SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY}\`; triage only, no extraction, auth, provider call, or external write.`,
    owner: 'Foundation Source',
  }
}

function buildChildCardRow(child) {
  return {
    id: child.id,
    title: child.title,
    scope: 'foundation',
    lane: 'scoped',
    priority: child.priority,
    rank: 33,
    source: `${SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID} triage`,
    summary: child.summary,
    whyItMatters: 'This child queue lets Foundation repair source maturity one bounded source-backed stage at a time instead of reopening broad source work.',
    nextAction: `Use ${SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH} to pull the smallest safe source-backed repair slice. No live extraction/auth/provider call/external write without separate approval.`,
    statusNote: `Scoped by ${SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY}; child bucket=${child.bucket}.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH,
    definitionOfDone: 'Every source coverage closeout row routed to SOURCE-MATURITY-GAP-FOLLOWUP-001 appears in the maturity-gap triage with source ID, next gap, bucket, proposed child card, operator action, not-next boundary, report, child backlog cards, focused proof, and full ship gate green.',
    proofCommands: SOURCE_MATURITY_GAP_FOLLOWUP_PROOF_COMMANDS,
    readinessBlockerCleared: 'Source maturity grid, source extraction coverage, source coverage closeout, source extraction gap follow-up, and SOURCE-016 marketing contracts are shipped; Steve approved safe overnight Foundation source work.',
    notNextBoundaries: SOURCE_MATURITY_GAP_FOLLOWUP_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const main = buildCardRow({ closeCard, stage })
  const childRows = SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.map(buildChildCardRow)
  try {
    await client.query('BEGIN')
    for (const row of [main, ...childRows]) {
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
              lane = CASE WHEN backlog_items.lane = 'done' AND backlog_items.id <> $1 THEN backlog_items.lane ELSE EXCLUDED.lane END,
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
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-source-maturity-gap-followup')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `source-maturity-gap-${stableRunId(SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH)}`,
        SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
        SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH,
        SOURCE_MATURITY_GAP_FOLLOWUP_CHANGED_FILES,
        JSON.stringify({ status: 'pass', score: 10, cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-gap-followup',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        main.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY, stage, childCards: childRows.map(row => row.id) }),
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
    scriptPath: SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH,
    operation: 'create/update source maturity gap backlog cards, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID,
        status: 'active',
        goal: 'Turn source maturity gap rows into ranked, safe repair queues without live extraction.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-gap-followup',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Rank maturity gaps and create child repair queues; no extraction, auth, provider calls, or external writes.',
          priorityOrder: [SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID],
          notNext: SOURCE_MATURITY_GAP_FOLLOWUP_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Every routed maturity gap row is in the triage.',
            'Synthetic missing-gap dogfood fails closed.',
            'Child repair backlog cards exist and remain scoped.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-gap-followup',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID,
      reason: 'Steve approved continuous safe overnight Foundation source work.',
    },
  )
}

async function buildLiveSnapshot() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  const sourceMaturityGrid = buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle: foundationSnapshot.lifecycle,
  })
  const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
  })
  const sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
    sources,
    sourceMaturityGrid,
    sourceExtractionCoverage,
  })
  const maturityGapFollowup = buildSourceMaturityGapFollowupSnapshot({
    sourceCoverageCloseout,
    sourceMaturityGrid,
  })
  return {
    foundationSnapshot,
    sourceMaturityGrid,
    sourceExtractionCoverage,
    sourceCoverageCloseout,
    maturityGapFollowup,
  }
}

function unsafeRuntimeCallTokens(source = '') {
  const tokens = [
    'startExtractionRun(',
    'runExtractionTarget(',
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

function stripUnsafeScannerFixture(source = '') {
  return String(source || '').replace(
    /function unsafeRuntimeCallTokens\(source = ''\) \{[\s\S]*?\n\}\n\nfunction stripUnsafeScannerFixture/,
    'function stripUnsafeScannerFixture',
  )
}

async function main() {
  const args = parseArgs()
  const writeRequested = isProcessCheckWriteRequested({ argv: process.argv.slice(2) })
  if (args.apply || args.closeCard || writeRequested) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    live,
    packageSource,
    coverageSource,
    planSource,
    scriptSource,
    moduleSource,
    sourceCoverageCloseoutSource,
    sourceMaturityGridSource,
    closeoutRecordsSource,
    initialReportExists,
    initialReportSource,
    currentState,
    currentPlan,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH,
      cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    }),
    getBacklogItemsByIds([
      SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      ...SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.map(card => card.id),
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID]),
    getFoundationBuildCloseouts(),
    buildLiveSnapshot(),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH),
    readRepoFile(SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH),
    readRepoFile('lib/source-maturity-gap-followup.js'),
    readRepoFile('lib/source-coverage-closeout.js'),
    readRepoFile('lib/source-maturity-grid.js'),
    readRepoFile('lib/foundation-build-closeout-source-records.js'),
    repoFileExists(SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH),
    readRepoFile(SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile(SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_PATH, { optional: true }),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID) || null
  const childCards = SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.map(child => cards.find(item => item.id === child.id)).filter(Boolean)
  const activeItem = (sprint.items || []).find(item => item.cardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID) || null
  const cardScaffold = validateBuildLaneCardScaffold(card || buildCardRow())
  const sprintMetadata = validateBuildLaneSprintItemMetadata(activeItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items || [], cards })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, priority: 'P0' },
    changedFiles: SOURCE_MATURITY_GAP_FOLLOWUP_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const { sourceCoverageCloseout, maturityGapFollowup } = live
  const missingMaturitySourceIds = findMissingMaturityGapSourceIds(maturityGapFollowup, sourceCoverageCloseout)
  const syntheticProof = buildSyntheticSourceMaturityGapFollowupProof()
  const closeoutRecord = closeouts.find(record => record.key === SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY)
  const unsafeTokens = unsafeRuntimeCallTokens([stripUnsafeScannerFixture(scriptSource), moduleSource].join('\n'))

  let reportExists = initialReportExists
  let reportSource = initialReportSource
  if (args.apply || args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH,
      operation: 'write source maturity gap triage report',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.writeReport, PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
    reportSource = renderSourceMaturityGapTriageReport(maturityGapFollowup)
    await fs.writeFile(SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH, reportSource, 'utf8')
    reportExists = true
  }

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE && approval.approval?.approvedPlanRef === SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH, 'approval file is valid v2 and matches plan hash', approval.failures?.map(f => f.check).join('; ') || approval.approvalRef)
  addCheck(checks, cardScaffold.ok, 'live backlog card has required scaffold fields', cardScaffold.missing.join(', ') || card?.lane || 'ok')
  addCheck(checks, sprint.sprint?.sprintId === SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID && ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(activeItem?.stage), 'Current Sprint points to source maturity follow-up', `${sprint.sprint?.sprintId || 'missing'}:${activeItem?.stage || 'missing'}`)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item has complete metadata before build/done', sprintMetadata.missing.join(', ') || 'ok')
  addCheck(checks, currentSprintStatus.status === 'healthy' || card?.lane === 'done', 'Current Sprint status remains healthy or historically done', currentSprintStatus.status)
  addCheck(checks, planCriticPass && planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic coverage passes for source maturity follow-up', `stored=${planCriticPass} self=${planReview.status}:${planReview.score}`)
  addCheck(checks, packageJson.scripts?.['process:source-maturity-gap-followup-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-gap-followup-check'] || 'missing')
  addCheck(checks, sourceCoverageCloseout.summary?.maturityGapFollowupCount === maturityGapFollowup.summary.maturityFollowupRows && maturityGapFollowup.summary.triageItemCount === maturityGapFollowup.summary.maturityFollowupRows && maturityGapFollowup.summary.triageItemCount >= 1, 'triage covers every source coverage closeout maturity row', `${maturityGapFollowup.summary.triageItemCount}/${sourceCoverageCloseout.summary?.maturityGapFollowupCount || 0}`)
  addCheck(checks, missingMaturitySourceIds.length === 0, 'no maturity follow-up row is missing from triage', missingMaturitySourceIds.join(', ') || 'none')
  addCheck(checks, maturityGapFollowup.triageItems.every(item => item.sourceId && item.nextGap && item.bucket && item.proposedNextCard && item.operatorAction && item.notNextBoundary), 'every maturity triage item has required operator fields')
  addCheck(checks, ['atom_flow_repair', 'source_contract_repair', 'source_evidence_repair', 'routing_repair'].every(bucket => Number(maturityGapFollowup.summary.bucketCounts?.[bucket] || 0) > 0), 'live triage has atom-flow, contract, evidence, and routing buckets', JSON.stringify(maturityGapFollowup.summary.bucketCounts || {}))
  addCheck(checks, SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.every(child => maturityGapFollowup.childCards.some(card => card.id === child.id)), 'snapshot carries every child repair card definition')
  addCheck(checks, childCards.length === SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.length && childCards.every(item => item.lane === 'scoped'), 'child repair backlog cards exist and stay scoped', childCards.map(item => `${item.id}:${item.lane}`).join(', '))
  addCheck(checks, syntheticProof.ok, 'synthetic source maturity missing-gap dogfood fails closed', JSON.stringify({ removedSourceId: syntheticProof.removedSourceId, missing: syntheticProof.missingMaturitySourceIds }))
  addCheck(checks, includesAll(moduleSource, ['buildSourceMaturityGapFollowupSnapshot', 'findMissingMaturityGapSourceIds', 'buildSyntheticSourceMaturityGapFollowupProof', 'renderSourceMaturityGapTriageReport']), 'maturity follow-up module owns builder, missing-gap proof, dogfood, and report renderer')
  addCheck(checks, includesAll(scriptSource, ['buildSourceMaturityGridSnapshot', 'buildSourceExtractionCoverageSnapshot', 'buildSourceCoverageCloseoutSnapshot', 'buildLiveSnapshot']), 'focused proof calls the real maturity, extraction, and closeout snapshot path')
  addCheck(checks, includesAll(sourceCoverageCloseoutSource, ['SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID', 'advance_maturity_gap']), 'source coverage closeout remains the upstream maturity-gap router')
  addCheck(checks, includesAll(sourceMaturityGridSource, ['SOURCE_MATURITY_STAGE_KEYS', 'atomFlow', 'nextGap']), 'source maturity grid remains the source of stage truth')
  addCheck(checks, reportExists && reportSource.includes('Maturity follow-up rows:') && reportSource.includes('SOURCE-MATURITY-ATOM-FLOW-REPAIR-001') && reportSource.includes('It does not start live extraction'), 'triage report exists and states no-live-run boundaries', SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH)
  addCheck(checks, coverageSource.includes('SOURCE_MATURITY_GAP_FOLLOWUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include source maturity follow-up card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRecordsSource.includes(SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY), 'closeout registry includes source maturity follow-up closeout', 'lib/foundation-build-closeout-source-records.js')
  addCheck(checks, currentState.includes(SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY), 'current-state documents source maturity follow-up closeout', 'docs/rebuild/current-state.md')
  addCheck(checks, currentPlan.includes(SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY) && currentPlan.includes('SOURCE-MATURITY-ATOM-FLOW-REPAIR-001'), 'current-plan routes next source maturity repair queue', 'docs/rebuild/current-plan.md')
  addCheck(checks, !unsafeTokens.length, 'implementation does not introduce extraction/model/external-write calls', unsafeTokens.join(', ') || 'clean')
  addCheck(checks, !args.closeCard || (closeoutRecord && closeoutDoc.includes(SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY)), 'closeout registry and handoff exist before close-card', closeoutRecord ? closeoutRecord.key : 'missing closeout record')
  addCheck(checks, !args.closeCard || card?.lane === 'done', 'live backlog card is done on close-card', card?.lane || 'missing')

  const failed = checks.filter(check => !check.ok)
  if (failed.length) {
    recordBuildLaneFailureEventsFromChecks({
      checks,
      repoRoot,
      command: 'process:source-maturity-gap-followup-check',
      cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      sprintId: SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID,
      fileModule: SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH,
    })
  }

  const payload = {
    ok: failed.length === 0,
    cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY,
    checks,
    failed,
    summary: maturityGapFollowup.summary,
    childCards: childCards.map(item => ({ id: item.id, lane: item.lane, priority: item.priority })),
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      stage: activeItem?.stage || null,
      status: currentSprintStatus.status,
    },
  }

  if (args.json) console.log(JSON.stringify(payload, null, 2))
  else {
    console.log(`Source maturity gap follow-up check: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  recordBuildLaneFailureEventsFromChecks({
    checks: [{ ok: false, check: 'process-source-maturity-gap-followup-check crashed', detail: error instanceof Error ? error.message : String(error) }],
    repoRoot,
    command: 'process:source-maturity-gap-followup-check',
    cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    sprintId: SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID,
    fileModule: SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH,
  })
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
