#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  recordBrainFleetLedgerCall,
} from '../lib/brain-fleet-quota-ledger.js'
import {
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_APPROVAL_PATH as APPROVAL_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID as CARD_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANGED_FILES as CHANGED_FILES,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY as CLOSEOUT_KEY,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_PATH as CLOSEOUT_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_COMMANDS as PROOF_COMMANDS,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_INVENTORY_TARGET_KEY,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NEXT_CARD_ID as NEXT_CARD_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NOT_NEXT as NOT_NEXT,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PLAN_PATH as PLAN_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SCRIPT_PATH as SCRIPT_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SPRINT_ID as SPRINT_ID,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID,
  buildYoutubeBuildIntelRuntimeDogfoodProof,
  buildYoutubeBuildIntelRuntimeInventoryItem,
  buildYoutubeBuildIntelRuntimeProofSnapshot,
  buildYoutubeBuildIntelRuntimeProofWriteSet,
  renderYoutubeBuildIntelRuntimeCloseout,
  validateYoutubeBuildIntelRuntimeInventoryItem,
  verifyYoutubeBuildIntelRuntimePersistedProof,
} from '../lib/youtube-build-intel-runtime-proof.js'
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
  upsertSourceCrawlItem,
} from '../lib/foundation-source-crawl-db.js'
import {
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
} from '../lib/foundation-intelligence-db.js'
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
const ACTOR = 'youtube-build-intel-runtime-proof'

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

function text(value) {
  return String(value || '').trim()
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value))
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
      'scripts/run-extraction-target.mjs',
      'scripts/extract-video-content.mjs',
      'lib/build-intel-extraction-implementation.js',
      'lib/build-intel-daily-extraction-review.js',
      'lib/brain-fleet-quota-ledger.js',
    ],
    existingDocs: [
      'docs/source-notes/video-link-inventory.md',
      'docs/_archive/handoffs/2026-05-18-youtube-build-intel-batch-closeout.md',
      'docs/_archive/handoffs/2026-05-20-extractor-brain-fleet-proof-closeout.md',
    ],
    existingScripts: [
      'npm run extraction:target -- --target=video-content-extract-backfill',
      'npm run process:extractor-brain-fleet-proof-check -- --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
    ],
    existingCards: [
      'YOUTUBE-BUILD-INTEL-BATCH-001',
      'EXTRACTOR-BRAIN-FLEET-PROOF-001',
      'BRAIN-FLEET-QUOTA-LEDGER-001',
      NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Use the existing DataForSEO YouTube subtitle extraction target for one exact public video.',
      'Use Brain Fleet quota ledger truth before any model/provider work; this v1 disables provider summary calls.',
      'Do not process Skool/MyICOR/Loom/private/paid rows from the broader video queue.',
      'Only run the bounded last-20 batch after the first approved public video proof is green.',
    ],
    reused: [
      'source_crawl_targets/source_crawl_items runtime ledger',
      'shared_communication_artifacts video_transcript archive',
      'Build Intel deterministic observation and review queue builders',
      'intelligence report/atom stores',
    ],
    notRebuilt: [
      'No new YouTube crawler.',
      'No new credential/provider registry.',
      'No direct OpenClaw architecture path.',
      'No downstream action writer.',
    ],
    exactGap: 'The existing video transcript lane needed an exact approved-video runtime wrapper so the first public YouTube Build Intel proof cannot accidentally process broad/private queue rows.',
    overBroadRisk: 'This can drift into broad YouTube batches, private-source extraction, screenshots/keyframes, provider summarization, or Strategy/People work. V1 runs one approved public video only.',
    readyBy: 'Codex Foundation Builder',
    readyAt: '2026-05-20T18:45:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `youtube-build-intel-runtime-proof-${stableRunId(PLAN_PATH)}`,
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

function sourceArtifactRef() {
  return `shared_communication_artifacts:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID}`
}

function reportArtifactRef() {
  return `intelligence_report_artifacts:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID}`
}

function buildLedgerRequest() {
  return {
    workload: 'extraction',
    hubKey: 'foundation',
    caller: ACTOR,
    inputArtifactRef: sourceArtifactRef(),
    outputArtifactRef: reportArtifactRef(),
    sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
    purpose: 'one approved public YouTube Build Intel runtime proof',
  }
}

async function recordSkippedProviderLedger(routeContract) {
  return recordBrainFleetLedgerCall({
    request: buildLedgerRequest(),
    routeContract,
    status: 'skipped',
    artifactRef: sourceArtifactRef(),
    outputArtifactRef: reportArtifactRef(),
    failureReason: 'Provider execution disabled for this runtime proof; transcript extraction uses DataForSEO and deterministic local Build Intel extraction.',
    stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
    metadata: {
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      extractionTargetKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY,
      providerSummaryCallRun: false,
    },
    actor: ACTOR,
  })
}

async function loadTranscriptArtifact() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        WHERE artifact_id = $1
        LIMIT 1
      `,
      [YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title,
      sourceAccount: row.source_account,
      sourceContainer: row.source_container,
      sourceUrl: row.source_url,
      participants: row.participants || [],
      contentText: row.content_text || '',
      contentHash: row.content_hash,
      artifactCreatedAt: row.artifact_created_at,
      artifactUpdatedAt: row.artifact_updated_at,
      metadata: row.metadata || {},
      ingestedBy: row.ingested_by,
      ingestedAt: row.ingested_at,
      updatedAt: row.updated_at,
    }
  } finally {
    await pool.end()
  }
}

async function loadExtractionRun() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT item.item_key, item.target_key, item.source_id, item.external_id,
               item.item_type, item.status, item.artifact_id, item.fingerprint,
               item.last_error, item.metadata, item.processed_at,
               item.last_source_crawl_run_id,
               run.run_id, run.status AS run_status, run.last_error AS run_last_error,
               run.inspected_delta, run.archived_delta, run.extracted_delta,
               run.started_at, run.finished_at, run.metadata AS run_metadata
        FROM source_crawl_items item
        LEFT JOIN source_crawl_target_runs run
          ON run.run_id = item.last_source_crawl_run_id
        WHERE item.target_key = $1
          AND item.external_id = $2
        ORDER BY item.updated_at DESC
        LIMIT 1
      `,
      [YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY, YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      itemKey: row.item_key,
      targetKey: row.target_key,
      sourceId: row.source_id,
      externalId: row.external_id,
      itemType: row.item_type,
      status: row.status,
      artifactId: row.artifact_id,
      fingerprint: row.fingerprint,
      lastError: row.last_error,
      metadata: row.metadata || {},
      processedAt: row.processed_at,
      sourceCrawlRunId: row.last_source_crawl_run_id,
      runId: row.run_id,
      runStatus: row.run_status,
      runLastError: row.run_last_error,
      inspectedDelta: Number(row.inspected_delta || 0),
      archivedDelta: Number(row.archived_delta || 0),
      extractedDelta: Number(row.extracted_delta || 0),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      runMetadata: row.run_metadata || {},
    }
  } finally {
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
        : Promise.resolve({ rows: [] }),
    ])
    return {
      report: mapReport(reportResult.rows[0] || null),
      atoms: atomResult.rows.map(mapAtom),
      hits: hitResult.rows.map(mapHit),
      ledgerCall: mapLlmCall(callResult.rows[0] || null),
    }
  } finally {
    await pool.end()
  }
}

async function runExactVideoExtractionTarget() {
  const result = spawnSync(
    'npm',
    [
      'run',
      'extraction:target',
      '--',
      `--target=${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY}`,
      `--actor=${ACTOR}`,
      '--force=true',
      `--onlyExternalId=${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL}`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    },
  )
  const output = `${result.stdout || ''}${result.stderr || ''}`
  if (result.status !== 0) {
    throw new Error(`Exact YouTube runtime extraction failed: ${output.split('\n').slice(-20).join('\n')}`)
  }
  return {
    ok: true,
    outputTail: output.slice(-20000),
    crawlRunId: (output.match(/Crawl run:\s*(\S+)/) || [])[1] || null,
    summary: (() => {
      const match = output.match(/^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m)
      if (!match) return null
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    })(),
  }
}

async function ensureRuntimeExtraction() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'seed exact approved public YouTube inventory item and run video-content extraction target for that external ID only',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const inventoryInput = buildYoutubeBuildIntelRuntimeInventoryItem()
  const inventoryValidation = validateYoutubeBuildIntelRuntimeInventoryItem(inventoryInput)
  if (!inventoryValidation.ok) {
    throw new Error(`Approved YouTube inventory item is invalid: ${inventoryValidation.failures.map(failure => failure.check).join(', ')}`)
  }
  const inventoryItem = await upsertSourceCrawlItem(inventoryInput, ACTOR)
  const extractionTarget = await runExactVideoExtractionTarget()
  return { inventoryItem, extractionTarget }
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'record Brain Fleet ledger call, intelligence report artifact, atoms, and atom hits for the YouTube runtime proof',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const ledger = await recordSkippedProviderLedger(snapshot.routeContract)
  const snapshotWithLedger = buildYoutubeBuildIntelRuntimeProofSnapshot({
    artifact: await loadTranscriptArtifact(),
    backlogItems: snapshot.backlogItems || [],
    currentSprint: snapshot.currentSprint || null,
    llmRuntime: snapshot.llmRuntime || {},
    extractionRun: await loadExtractionRun(),
    ledgerCallId: ledger.call.callId,
  })
  const writeSet = buildYoutubeBuildIntelRuntimeProofWriteSet(snapshotWithLedger)
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
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }, ACTOR)
  return { ledger, snapshot: snapshotWithLedger, writeSet, report, atoms, hits }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'One approved public YouTube Build Intel video is extracted through the governed target runner; transcript artifact, metadata, chapter-capture result, provenance, Brain Fleet ledger truth, report artifact, implementation atoms, training notes, Build Intel review route, duplicate/staleness guards, and skipped/error reasons are persisted; no broad/private extraction or external writes occur.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'EXTRACTOR-BRAIN-FLEET-PROOF-001 closed under extractor-brain-fleet-proof-v1 and raw Foundation gates were green before runtime extraction.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      sourceArtifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
      sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      extractionTargetKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY,
      providerExecutionAllowed: false,
      broadBatchApproved: false,
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
    planRef: cloned.planRef || 'docs/process/skool-approved-lesson-extract-proof-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'One approved Skool lesson proof remains parked until Steve approves the exact source item and auth/content-use path.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue only with Steve-approved exact Skool source item and Harlan auth-needed flow if auth is required.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not broad crawl Skool, MyICOR, Loom, private video, comments/member, or paid-source surfaces.',
      'Do not mutate credentials or browser profiles.',
      'Stop if Steve has not approved the exact paid/private source item.',
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
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 12 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: Number(currentItem.order || 12) + 1 }, { currentHead })
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; do not start Skool proof until Steve has approved the exact lesson/source item and auth/content-use path.`
      : `Run exact public YouTube runtime proof for ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL}; no last-20 batch, private source, screenshot/keyframe, provider summary call, or external write.`,
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; extracted the approved Nick Saraev public YouTube video into ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID}, persisted Brain Fleet ledger truth, report artifact, implementation atoms, atom hits, training notes, Build Intel review route, chapter-capture skip reason, duplicate/staleness guard, and no broad/private extraction or external writes. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; one approved public YouTube video only.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update YouTube Build Intel runtime proof backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'youtube_runtime_proof_closed_skool_exact_source_next' : 'youtube_runtime_proof_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: require exact Steve-approved Skool lesson/source item before any paid/private run.`
            : `${CARD_ID}: run exact approved public YouTube runtime proof only.`,
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
      reason: 'Steve ordered the approved public YouTube runtime proof after extractor Brain Fleet proof and before paid/private source proofs.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let extractionAttempt = null
  let persisted = null
  let persistence = null

  await initFoundationDb()
  try {
    if (args.closeCard) {
      extractionAttempt = await ensureRuntimeExtraction()
    }

    const [
      packageJson,
      moduleSource,
      scriptSource,
      extractorSource,
      targetRunnerSource,
      closeoutRegistrySource,
      coverageSource,
      verifierSource,
      planSource,
      beforeFoundationSnapshot,
      currentSprint,
      llmRuntimeBefore,
      artifact,
      extractionRun,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/youtube-build-intel-runtime-proof.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('scripts/extract-video-content.mjs'),
      readRepoFile('scripts/run-extraction-target.mjs'),
      readRepoFile('lib/foundation-build-closeout-model-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('scripts/foundation-verify.mjs'),
      readRepoFile(PLAN_PATH),
      getFoundationSnapshot(),
      getActiveFoundationCurrentSprint(),
      getLlmRuntimeSnapshot({ limit: 100 }),
      loadTranscriptArtifact(),
      loadExtractionRun(),
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
      declaredRisk: 'Full ship gate because this card runs one governed public YouTube transcript extraction, writes Brain Fleet ledger truth, persists intelligence artifacts/atoms, updates Current Sprint, and advances to a paid/private-source approval boundary.',
      repoRoot,
    })
    const snapshot = buildYoutubeBuildIntelRuntimeProofSnapshot({
      artifact,
      backlogItems: beforeFoundationSnapshot.backlogItems || [],
      currentSprint,
      llmRuntime: llmRuntimeBefore,
      extractionRun,
    })
    let effectiveSnapshot = snapshot
    let writeSet = buildYoutubeBuildIntelRuntimeProofWriteSet(effectiveSnapshot)
    const syntheticProof = buildYoutubeBuildIntelRuntimeDogfoodProof()

    if (args.closeCard) {
      const persistedWrite = await persistProof({
        ...snapshot,
        backlogItems: beforeFoundationSnapshot.backlogItems || [],
        currentSprint,
        llmRuntime: llmRuntimeBefore,
      })
      effectiveSnapshot = persistedWrite.snapshot
      writeSet = persistedWrite.writeSet
      await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderYoutubeBuildIntelRuntimeCloseout(effectiveSnapshot), 'utf8')
      await ensureLiveState({ closeCard: true, planReview })
      persisted = await loadPersistedProof(writeSet, persistedWrite.ledger.call.callId)
      persistence = verifyYoutubeBuildIntelRuntimePersistedProof({
        snapshot: effectiveSnapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
        ledgerCall: persisted.ledgerCall,
      })
    } else {
      persisted = await loadPersistedProof(writeSet)
      persistence = verifyYoutubeBuildIntelRuntimePersistedProof({
        snapshot: effectiveSnapshot,
        report: persisted.report,
        atoms: persisted.atoms,
        hits: persisted.hits,
        ledgerCall: persisted.ledgerCall,
      })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
    const cards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID, ...sprintCardIds])
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
    const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
    const llmRuntimeAfter = await getLlmRuntimeSnapshot({ limit: 100 })

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for runtime proof', buildPlanCriticResultSummary(planReview))
    addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Skool exact-source card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !args.closeCard || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks runtime proof done after close', activeItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || nextItem?.stage === 'scoping', 'Current Sprint advances to Skool approval-bound card after close', nextItem?.stage || 'missing')
    addCheck(checks, effectiveSnapshot.ok === true, 'runtime proof snapshot is ready', effectiveSnapshot.failures.map(failure => failure.check).join(', ') || 'ready')
    addCheck(checks, artifact?.artifactId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID && artifact?.contentText?.length >= 1000, 'approved video transcript artifact is persisted', artifact ? `${artifact.artifactId}/${artifact.contentText.length}` : 'missing')
    addCheck(checks, extractionRun?.status === 'succeeded' && extractionRun?.artifactId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID, 'source crawl extraction item succeeded for exact URL', extractionRun ? `${extractionRun.status}/${extractionRun.artifactId}` : 'missing')
    addCheck(checks, extractionRun?.externalId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL, 'extraction run is scoped to exact approved URL', extractionRun?.externalId || 'missing')
    addCheck(checks, effectiveSnapshot.extractionSnapshot?.selectedTranscriptArtifacts === 1, 'Build Intel extraction consumes exactly one selected transcript', String(effectiveSnapshot.extractionSnapshot?.selectedTranscriptArtifacts || 0))
    addCheck(checks, effectiveSnapshot.atomInputs.length >= 1 && effectiveSnapshot.hitInputs.length === effectiveSnapshot.atomInputs.length, 'implementation atom write set is complete', `${effectiveSnapshot.atomInputs.length}/${effectiveSnapshot.hitInputs.length}`)
    addCheck(checks, effectiveSnapshot.reviewRoutes.length >= 1, 'Build Intel review route exists', `${effectiveSnapshot.reviewRoutes.length}`)
    addCheck(checks, effectiveSnapshot.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.writesAtoms && !route.externalWrites), 'review routes are proposal-only with no external writes', 'proposal-only')
    addCheck(checks, effectiveSnapshot.chapterCapture?.status === 'chapter_markers_detected_in_transcript' || effectiveSnapshot.chapterCapture?.skippedReason === 'youtube_subtitle_endpoint_did_not_return_chapter_metadata', 'chapter capture result or skip reason is explicit', effectiveSnapshot.chapterCapture?.status || 'missing')
    addCheck(checks, effectiveSnapshot.ledgerValidation?.ok === true && effectiveSnapshot.routeContract?.provider !== 'openclaw', 'Brain Fleet ledger truth is complete and non-OpenClaw', `${effectiveSnapshot.routeContract?.provider}/${effectiveSnapshot.routeContract?.routeKey}`)
    addCheck(checks, !args.closeCard || persistence?.ok === true, 'persisted report, atoms, hits, and ledger read back', persistence?.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, syntheticProof.ok === true, 'dogfood rejects private source, missing artifact, and short transcript', JSON.stringify(syntheticProof.cases))
    addCheck(checks, extractorSource.includes('onlyExternalId') && targetRunnerSource.includes('onlyExternalId'), 'target runner supports exact external ID filter', 'onlyExternalId')
    addCheck(checks, packageJson.scripts?.['process:youtube-build-intel-runtime-proof-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:youtube-build-intel-runtime-proof-check'] || 'missing')
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes runtime proof', 'lib/foundation-build-closeout-model-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves runtime proof', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID) && verifierSource.includes('EXTRACTOR_BRAIN_FLEET_PROOF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage includes runtime proof card', 'coverage card ID included in extractor proof coverage bundle')
    addCheck(checks, !args.closeCard || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    addCheck(checks, stableString(llmRuntimeBefore.credentials || []) === stableString(llmRuntimeAfter.credentials || []), 'proof does not mutate credential truth', 'credentials unchanged')
    const forbiddenNotificationPaths = [
      new RegExp(['send', 'Telegram'].join(''), 'i'),
      new RegExp(['send', 'Mail'].join(''), 'i'),
    ]
    const hasExternalNotificationPath = forbiddenNotificationPaths.some(pattern =>
      pattern.test(moduleSource) || pattern.test(scriptSource)
    )
    addCheck(checks, !hasExternalNotificationPath, 'proof has no external notification/write path', 'notification send helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sourceArtifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
      sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      extractionAttempt,
      snapshot: {
        status: effectiveSnapshot.status,
        observations: effectiveSnapshot.extractionSnapshot?.observations?.length || 0,
        atoms: effectiveSnapshot.atomInputs.length,
        hits: effectiveSnapshot.hitInputs.length,
        reviewRoutes: effectiveSnapshot.reviewRoutes.length,
        chapterCapture: effectiveSnapshot.chapterCapture,
        sourceCrawlRunId: effectiveSnapshot.extractionRun?.sourceCrawlRunId || null,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`YouTube Build Intel runtime proof: ${result.status}`)
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
  console.error('YouTube Build Intel runtime proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
