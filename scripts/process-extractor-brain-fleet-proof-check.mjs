#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from '../lib/brain-fleet-quota-ledger.js'
import {
  EXTRACTOR_BRAIN_FLEET_PROOF_APPROVAL_PATH as APPROVAL_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID as CARD_ID,
  EXTRACTOR_BRAIN_FLEET_PROOF_CHANGED_FILES as CHANGED_FILES,
  EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY as CLOSEOUT_KEY,
  EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_PATH as CLOSEOUT_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_COMMANDS as PROOF_COMMANDS,
  EXTRACTOR_BRAIN_FLEET_PROOF_NEXT_CARD_ID as NEXT_CARD_ID,
  EXTRACTOR_BRAIN_FLEET_PROOF_NOT_NEXT as NOT_NEXT,
  EXTRACTOR_BRAIN_FLEET_PROOF_PLAN_PATH as PLAN_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_SCRIPT_PATH as SCRIPT_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID,
  EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID,
  EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_TITLE,
  EXTRACTOR_BRAIN_FLEET_PROOF_SPRINT_ID as SPRINT_ID,
  buildExtractorBrainFleetProofDogfoodProof,
  buildExtractorBrainFleetProofSnapshot,
  buildExtractorBrainFleetProofWriteSet,
  renderExtractorBrainFleetProofCloseout,
  verifyExtractorBrainFleetPersistedProof,
} from '../lib/extractor-brain-fleet-proof.js'
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
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
import {
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-shared-comms-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  getLlmRuntimeSnapshot,
} from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
const ACTOR = 'extractor-brain-fleet-proof'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
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
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `extractor-brain-fleet-proof-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
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

function mapJson(value) {
  if (value && typeof value === 'object') return value
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return {}
}

function mapLlmCall(row = null) {
  return row ? {
    callId: row.call_id,
    workload: row.workload,
    routeKey: row.route_key,
    provider: row.provider,
    model: row.model,
    status: row.status,
    errorMessage: row.error_message,
    metadata: mapJson(row.metadata),
  } : null
}

function mapReport(row = null) {
  return row ? {
    reportArtifactId: row.report_artifact_id,
    reportType: row.report_type,
    title: row.title,
    status: row.status,
    sourceIds: row.source_ids || [],
    inputArtifactIds: row.input_artifact_ids || [],
    inputAtomIds: row.input_atom_ids || [],
    actionRequiredItems: row.action_required_items || [],
    structuredOutputJson: row.structured_output_json || {},
    metadata: row.metadata || {},
  } : null
}

function mapAtom(row = {}) {
  return {
    atomId: row.atom_id,
    sourceId: row.source_id,
    artifactId: row.artifact_id,
    reportArtifactId: row.report_artifact_id,
    status: row.status,
    dedupHash: row.dedup_hash,
    metadata: row.metadata || {},
  }
}

function mapHit(row = {}) {
  return {
    hitId: row.hit_id,
    atomId: row.atom_id,
    sourceId: row.source_id,
    artifactId: row.artifact_id,
    reportArtifactId: row.report_artifact_id,
    metadata: row.metadata || {},
  }
}

async function loadPersistedProof(writeSet = {}, ledgerCallId = null) {
  const pool = createPool()
  try {
    const atomIds = list(writeSet.atomInputs).map(atom => atom.atomId)
    const hitIds = list(writeSet.hitInputs).map(hit => hit.hitId)
    const [reportResult, atomResult, hitResult, callResult] = await Promise.all([
      pool.query(
        `
          SELECT report_artifact_id, report_type, title, status, source_ids,
                 input_artifact_ids, input_atom_ids, action_required_items,
                 structured_output_json, metadata
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
        `,
        [writeSet.reportArtifact?.reportArtifactId || ''],
      ),
      atomIds.length
        ? pool.query(
          `
            SELECT atom_id, source_id, artifact_id, report_artifact_id, status,
                   dedup_hash, metadata
            FROM intelligence_atoms
            WHERE atom_id = ANY($1::text[])
            ORDER BY atom_id
          `,
          [atomIds],
        )
        : Promise.resolve({ rows: [] }),
      hitIds.length
        ? pool.query(
          `
            SELECT hit_id, atom_id, source_id, artifact_id, report_artifact_id, metadata
            FROM intelligence_atom_hits
            WHERE hit_id = ANY($1::text[])
            ORDER BY hit_id
          `,
          [hitIds],
        )
        : Promise.resolve({ rows: [] }),
      ledgerCallId
        ? pool.query(
          `
            SELECT call_id, workload, route_key, provider, model, status,
                   error_message, metadata
            FROM llm_calls
            WHERE call_id = $1
          `,
          [ledgerCallId],
        )
        : pool.query(
          `
            SELECT call_id, workload, route_key, provider, model, status,
                   error_message, metadata
            FROM llm_calls
            WHERE metadata->'brainFleetLedger'->>'caller' = 'extractor-brain-fleet-proof'
               OR metadata->>'cardId' = $1
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [CARD_ID],
        ),
    ])
    return {
      reportArtifact: mapReport(reportResult.rows[0]),
      atoms: atomResult.rows.map(mapAtom),
      hits: hitResult.rows.map(mapHit),
      ledgerCall: mapLlmCall(callResult.rows[0]),
    }
  } finally {
    await pool.end()
  }
}

async function persistExtractorProof(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist extractor Brain Fleet ledger call, proof artifact, atoms, and atom hits',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  if (!snapshot.ok) {
    throw new Error(`Extractor Brain Fleet proof is not writable: ${snapshot.failures.map(failure => `${failure.check}:${failure.detail}`).join(', ')}`)
  }

  const planned = await recordBrainFleetLedgerCall({
    request: snapshot.ledgerRequest,
    routeContract: snapshot.routeContract,
    status: 'planned',
    artifactRef: snapshot.ledgerRequest.inputArtifactRef,
    outputArtifactRef: snapshot.ledgerRequest.outputArtifactRef,
    actor: ACTOR,
    metadata: {
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      proofMode: 'deterministic_existing_transcript',
    },
  })
  const finished = await finishBrainFleetLedgerCall({
    callId: planned.call.callId,
    request: snapshot.ledgerRequest,
    routeContract: snapshot.routeContract,
    status: 'skipped',
    outputArtifactRef: snapshot.ledgerRequest.outputArtifactRef,
    failureReason: 'Provider execution disabled for deterministic existing-transcript extractor proof.',
    stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
    actor: ACTOR,
    metadata: {
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      proofMode: 'deterministic_existing_transcript',
    },
  })
  const ledger = {
    call: finished.call,
    ledgerRecord: finished.ledgerRecord,
    validation: finished.validation,
  }
  const writeSet = buildExtractorBrainFleetProofWriteSet(snapshot, { ledger })

  let report = await upsertIntelligenceReportArtifact(writeSet.reportArtifact, ACTOR)
  const atoms = []
  const hits = []
  for (const atomInput of writeSet.atomInputs) {
    atoms.push(await upsertIntelligenceAtom(atomInput, ACTOR))
  }
  for (const hitInput of writeSet.hitInputs) {
    hits.push(await recordIntelligenceAtomHit(hitInput, ACTOR))
  }
  report = await upsertIntelligenceReportArtifact({
    ...writeSet.reportArtifact,
    inputAtomIds: atoms.map(atom => atom.atomId),
    structuredOutputJson: {
      ...(writeSet.reportArtifact.structuredOutputJson || {}),
      atomIds: atoms.map(atom => atom.atomId),
      hitIds: hits.map(hit => hit.hitId),
    },
  }, ACTOR)
  return {
    ledger,
    writeSet,
    report,
    atoms,
    hits,
  }
}

function cloneSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order || item.sprintOrder,
    stage: item.stage || 'scoping',
    planRef: item.planRef || null,
    definitionOfDone: item.definitionOfDone || '',
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || null,
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || null,
    metadata: item.metadata || {},
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
    existingCode: [
      'lib/brain-fleet-quota-ledger.js',
      'lib/build-intel-extraction-implementation.js',
      'lib/build-intel-daily-extraction-review.js',
      'lib/intelligence-atoms.js',
      'lib/foundation-shared-comms-store.js',
    ],
    existingDocs: [
      'docs/source-notes/video-link-inventory.md',
      'docs/source-notes/myicro-training.md',
      'docs/_archive/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-build-intel-extraction-check.mjs',
      'scripts/process-build-intel-daily-extraction-review-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Brain Fleet calls must be ledgered before execution.',
      'Extractor proof uses exact approved source artifacts only.',
      'OpenClaw is adapter-only and cannot define extractor architecture.',
      'Private/paid/course source extraction stays blocked until exact source approval.',
      'Meeting Vault Phase B and Drive permission mutation stay out of scope.',
    ],
    reused: 'Existing archived public YouTube transcript, Brain Fleet quota ledger, Build Intel observation/review builders, intelligence report artifacts, atom store, and Current Sprint gates.',
    notRebuilt: [
      'No new LLM router',
      'No new credential registry',
      'No live YouTube extractor',
      'No paid/private source worker',
      'No external review destination',
    ],
    exactGap: 'Extractor output needed one governed, ledgered, persisted proof before fresh YouTube runtime or private-source extraction.',
    overBroadRisk: 'This card can drift into live provider calls, fresh YouTube extraction, Skool/MyICOR/Loom access, or automatic downstream writes; v1 stays deterministic and source-approved.',
    readyBy: 'Steve May 20 rolling Foundation Builder queue',
    readyAt: '2026-05-20T18:30:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'First governed extractor proof records exact approved source item, captured transcript artifact, Brain Fleet ledger truth, proof artifact, provenance links, atoms, training notes, Build Intel review routes, duplicate/staleness guards, skipped/error reasons, no provider/external/credential side effects, and Current Sprint advancement to YouTube runtime proof only after raw-green gates.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'OpenClaw adapter boundary closed; Brain Fleet route/ledger/capability controls are ready for deterministic extractor proof.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      sourceArtifactId: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID,
      sourceId: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID,
      providerExecutionAllowed: false,
      externalWrites: false,
      credentialMutation: false,
      nextCardId: NEXT_CARD_ID,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    planRef: cloned.planRef || 'docs/process/youtube-build-intel-runtime-proof-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'One approved public YouTube Build Intel runtime proof passes through Brain Fleet with transcript/artifact/provenance preservation, stop controls, and no broad crawl before a bounded last-20 batch.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; YouTube runtime may start only with exact approved public source item and stop controls.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run broad Skool, MyICOR, Loom, private video, comments/member, or paid-source crawls.',
      'Do not exceed one approved public YouTube item before the bounded last-20 batch is explicitly reached.',
      'Stop on quota, transcript failure spike, duplicate explosion, route failure, or raw Foundation health degradation.',
    ],
    metadata: {
      ...(cloned.metadata || {}),
      closeoutKey: null,
      previousCloseoutKey: CLOSEOUT_KEY,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 11 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 11) + 1 }, { currentHead })
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

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; start with one approved public YouTube item only and stop on quota/transcript/duplicate/route/Foundation-health failures.`
      : 'Run the first governed extractor proof through Brain Fleet using the exact approved archived public YouTube transcript artifact; persist ledger, report artifact, atoms, training notes, review routes, guards, and skipped/error reasons without provider/external/credential side effects.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; proof used ${EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID}, recorded Brain Fleet ledger truth, persisted proof artifact/atoms/hits/review routes/training notes, logged provider execution skipped for deterministic proof, and did not fetch sources, call providers, mutate credentials, or write externally. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; exact approved source item and deterministic no-provider proof only.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update extractor Brain Fleet proof backlog card, Plan Critic row, and Current Sprint overlay',
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
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'extractor_brain_fleet_proof_closed_youtube_runtime_next' : 'extractor_brain_fleet_proof_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: run one approved public YouTube runtime proof only after raw-green gates.`
            : `${CARD_ID}: ledger/persist deterministic extractor proof from exact approved archived transcript artifact.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered extractor Brain Fleet proof after OpenClaw adapter boundary and before YouTube runtime proof.',
    },
  )
}

async function loadTranscriptContexts() {
  const rows = await searchSharedCommunicationArtifactsForContext({
    query: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_TITLE,
    sourceIds: [EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID],
    artifactTypes: ['video_transcript'],
    limit: 10,
    excerptChars: 1800,
  })
  return rows.filter(row => row.artifactId === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID)
}

async function main() {
  const args = parseArgs()
  const checks = []
  let persisted = null
  let persistence = null

  await initFoundationDb()
  const [
    packageJson,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    planSource,
    beforeFoundationSnapshot,
    currentSprint,
    llmRuntimeBefore,
    transcriptContexts,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/extractor-brain-fleet-proof.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-model-records.js'),
    readRepoFile(PLAN_PATH),
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    getLlmRuntimeSnapshot({ limit: 100 }),
    loadTranscriptContexts(),
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
    declaredRisk: 'Full ship gate because this card writes Brain Fleet ledger rows, intelligence report artifacts, atoms, atom hits, Current Sprint truth, closeout registry, verifier coverage, and current plan/state truth.',
  })
  const snapshot = buildExtractorBrainFleetProofSnapshot({
    transcriptContexts,
    backlogItems: beforeFoundationSnapshot.backlogItems || [],
    currentSprint,
    llmRuntime: llmRuntimeBefore,
  })
  const syntheticProof = buildExtractorBrainFleetProofDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for extractor Brain Fleet proof', buildPlanCriticResultSummary(planReview))
  addCheck(checks, syntheticProof.ok === true, 'synthetic dogfood rejects unsafe extractor proof variants', syntheticProof.ok ? syntheticProof.mode : JSON.stringify(syntheticProof))
  addCheck(checks, snapshot.ok === true, 'extractor Brain Fleet proof snapshot is ready', snapshot.failures.map(item => `${item.check}:${item.detail}`).join(', ') || JSON.stringify(snapshot.summary))
  addCheck(checks, packageJson.scripts?.['process:extractor-brain-fleet-proof-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused extractor proof', packageJson.scripts?.['process:extractor-brain-fleet-proof-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildExtractorBrainFleetProofSnapshot') && moduleSource.includes('verifyExtractorBrainFleetPersistedProof'), 'module owns extractor proof snapshot and persistence verification', 'lib/extractor-brain-fleet-proof.js')
  addCheck(checks, scriptSource.includes('recordBrainFleetLedgerCall') && scriptSource.includes('upsertIntelligenceAtom') && scriptSource.includes('upsertIntelligenceReportArtifact'), 'focused proof persists ledger, report artifact, and atoms through existing stores', SCRIPT_PATH)

  const earlyFailures = checks.filter(check => !check.ok)
  if (!earlyFailures.length && (args.apply || args.closeCard)) {
    persistence = await persistExtractorProof(snapshot)
  }

  const writeSet = buildExtractorBrainFleetProofWriteSet(snapshot, { ledger: persistence?.ledger || null })
  const llmRuntimeAfter = await getLlmRuntimeSnapshot({ limit: 100 })
  persisted = await loadPersistedProof(writeSet, persistence?.ledger?.call?.callId || null)
  const persistedProof = verifyExtractorBrainFleetPersistedProof({
    snapshot,
    persisted,
    beforeRuntime: llmRuntimeBefore,
    afterRuntime: llmRuntimeAfter,
  })

  if (args.apply || args.closeCard || persisted.reportArtifact) {
    addCheck(checks, persistedProof.ok, 'persisted proof rows verify ledger/artifact/atoms/review-route/training-note truth', persistedProof.failures.map(item => `${item.check}:${item.detail}`).join(', ') || 'persisted proof verified')
  }

  const writeFailures = checks.filter(check => !check.ok)
  if (!writeFailures.length && args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SCRIPT_PATH,
      operation: 'write extractor Brain Fleet proof closeout handoff',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
    await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderExtractorBrainFleetProofCloseout(snapshot, persisted), 'utf8')
  }
  if (!writeFailures.length && (args.apply || args.closeCard)) {
    await ensureLiveState({ closeCard: args.closeCard, planReview })
  }

  const [activeSprint, cards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const currentCard = cards.find(card => card.id === CARD_ID) || null
  const nextCard = cards.find(card => card.id === NEXT_CARD_ID) || null
  const currentItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const cardAlreadyClosed = currentCard?.lane === 'done' &&
    currentItem?.stage === 'done_this_sprint' &&
    activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID
  const expectedActive = args.closeCard || cardAlreadyClosed ? NEXT_CARD_ID : CARD_ID

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches extractor proof state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard || cardAlreadyClosed ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'extractor proof backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard || cardAlreadyClosed ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'extractor proof sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances YouTube runtime proof as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeout?.key === CLOSEOUT_KEY || closeoutRegistrySource.includes(CLOSEOUT_KEY), 'closeout registry source includes extractor proof', CLOSEOUT_KEY)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    closeCard: args.closeCard,
    snapshot: {
      status: snapshot.status,
      summary: snapshot.summary,
    },
    persisted: persisted ? {
      ledgerCallId: persisted.ledgerCall?.callId || null,
      ledgerStatus: persisted.ledgerCall?.status || null,
      reportArtifactId: persisted.reportArtifact?.reportArtifactId || null,
      atomCount: list(persisted.atoms).length,
      hitCount: list(persisted.hits).length,
      reviewRouteCount: list(persisted.reportArtifact?.structuredOutputJson?.reviewRoutes).length,
    } : null,
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    syntheticProof,
    proofCommands: PROOF_COMMANDS,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Extractor Brain Fleet proof check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main()
  .catch(async error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    await closeFoundationDb().catch(() => {})
    process.exitCode = 1
  })
