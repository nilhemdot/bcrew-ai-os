import crypto from 'node:crypto'

import {
  SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
  SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
  buildSourcePacketDecisionRecord,
  validateSourcePacketDecisionRecord,
} from './source-packet-approval-decision-ledger.js'
import {
  runSourcePacketPublicWebRuntime,
  validateApprovedPublicWebSourcePacket,
} from './source-packet-public-web-runtime.js'

export const SOURCE_PACKET_WORKER_RUNNER_CARD_ID = 'SOURCE-PACKET-WORKER-RUNNER-001'
export const SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH = 'scripts/process-source-packet-worker-runner-check.mjs'
export const SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY = 'source-packet-worker-runs'
export const SOURCE_PACKET_WORKER_RUNNER_ROUTE = '/api/foundation/dev-team-hub/source-packet-worker-run'
export const SOURCE_PACKET_WORKER_QUEUE_ROUTE = '/api/foundation/dev-team-hub/source-packet-worker-queue'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function safeKey(value = '') {
  return text(value).replace(/[^a-z0-9:_-]+/gi, '-').replace(/-+/g, '-').slice(0, 180)
}

function sideEffects(overrides = {}) {
  return {
    startsFromApprovalAction: false,
    followsLinks: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    ...overrides,
  }
}

function addFailure(failures, code, detail = '') {
  failures.push({ code, detail })
}

function approvedDecisionPacket(record = {}) {
  const packet = record.packet || {}
  return {
    ...packet,
    approvedBy: packet.approvedBy || record.decidedBy || 'Steve',
    approvedAt: packet.approvedAt || record.decidedAt || new Date().toISOString(),
  }
}

export function validateSourcePacketWorkerRequest(request = {}) {
  const failures = []
  const record = request.decisionRecord || {}
  const recordValidation = validateSourcePacketDecisionRecord(record)
  for (const failure of recordValidation.failures || []) addFailure(failures, failure.code || failure, failure.detail || 'decision record validation')

  if (record.operatorAction !== 'approve_packet') addFailure(failures, 'decision_not_approved_for_worker', record.operatorAction || 'missing')
  if (record.decisionStatus !== 'approved_source_packet_recorded') addFailure(failures, 'decision_status_not_approved', record.decisionStatus || 'missing')
  if (record.runtimeStarted !== false || record.startsWorker !== false || record.noRuntimeStarted !== true) {
    addFailure(failures, 'approval_record_must_not_have_started_worker')
  }

  const packet = approvedDecisionPacket(record)
  const packetValidation = validateApprovedPublicWebSourcePacket(packet)
  for (const failure of packetValidation.failures || []) addFailure(failures, failure.code || failure, failure.detail || 'runtime packet validation')

  if (!['synthetic_fixture', 'live_playwright_exact_url'].includes(request.mode || 'synthetic_fixture')) {
    addFailure(failures, 'unsupported_worker_mode', request.mode || 'missing')
  }
  if (request.mode === 'live_playwright_exact_url' && request.allowLive !== true) {
    addFailure(failures, 'live_worker_requires_explicit_allow_live', 'live browser disabled by default')
  }
  if (request.followLinks === true) addFailure(failures, 'worker_follow_links_blocked')
  if (request.submitForms === true) addFailure(failures, 'worker_form_submit_blocked')
  if (request.downloadFiles === true) addFailure(failures, 'worker_download_blocked')
  if (request.authSessionUsed === true) addFailure(failures, 'worker_auth_session_blocked')
  if (request.externalWrites === true) addFailure(failures, 'worker_external_write_blocked')
  if (request.writesBacklog === true) addFailure(failures, 'worker_backlog_write_blocked')

  return { ok: failures.length === 0, failures, packet }
}

export function buildSourcePacketWorkerDecisionStatus(record = {}) {
  const validation = validateSourcePacketWorkerRequest({
    decisionRecord: record,
    mode: 'synthetic_fixture',
  })
  const ready = validation.ok === true
  const approved = record.operatorAction === 'approve_packet' &&
    record.decisionStatus === 'approved_source_packet_recorded'

  if (ready) {
    return {
      status: 'ready_to_run_exact_public_worker',
      ready: true,
      approved,
      separateRunRequired: true,
      runRoute: SOURCE_PACKET_WORKER_RUNNER_ROUTE,
      startsFromApprovalAction: false,
      plainEnglish: 'This approved packet is ready for the separate exact-page worker. Approval did not start the worker.',
      validation,
    }
  }

  return {
    status: approved ? 'blocked_before_worker_run' : 'not_ready_for_worker',
    ready: false,
    approved,
    separateRunRequired: approved,
    runRoute: approved ? SOURCE_PACKET_WORKER_RUNNER_ROUTE : '',
    startsFromApprovalAction: false,
    plainEnglish: approved
      ? 'This decision is saved, but the worker will not run until the packet boundary is fixed.'
      : 'This decision is saved, but it is not an approved packet for worker execution.',
    validation,
  }
}

function decisionRecordFromCrawlItem(item = {}) {
  const metadata = item.metadata || {}
  const record = buildSourcePacketDecisionRecord({
    url: metadata.exactUrl,
    host: metadata.host,
    sourceVideoId: metadata.sourceVideoId,
    sourceUrl: metadata.sourceUrl,
    reportArtifactId: metadata.reportArtifactId,
    reason: metadata.reason,
    operatorNote: metadata.operatorNote,
    operatorAction: metadata.operatorAction,
    decision: metadata.proposedDecision,
    decidedBy: metadata.decidedBy,
    decidedAt: metadata.decidedAt,
  })
  return {
    ...record,
    decisionId: metadata.decisionId || record.decisionId,
    sourcePacketId: metadata.sourcePacketId || record.sourcePacketId,
    packet: {
      ...record.packet,
      sourcePacketId: metadata.sourcePacketId || record.packet.sourcePacketId,
    },
  }
}

export function buildSourcePacketWorkerQueue({ decisionItems = [], workerRunItems = [] } = {}) {
  const runByDecision = new Map()
  const runByPacket = new Map()
  for (const item of list(workerRunItems)) {
    const metadata = item.metadata || {}
    if (metadata.decisionId) runByDecision.set(metadata.decisionId, item)
    if (metadata.sourcePacketId) runByPacket.set(metadata.sourcePacketId, item)
  }

  const rows = list(decisionItems)
    .filter(item => item.targetKey === SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY || item.target_key === SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY)
    .map(item => {
      const record = decisionRecordFromCrawlItem(item)
      const workerStatus = buildSourcePacketWorkerDecisionStatus(record)
      const existingRun = runByDecision.get(record.decisionId) || (workerStatus.ready === true ? runByPacket.get(record.sourcePacketId) : null) || null
      const ready = workerStatus.ready === true && !existingRun
      return {
        decisionId: record.decisionId,
        sourcePacketId: record.sourcePacketId,
        operatorAction: record.operatorAction,
        decisionStatus: record.decisionStatus,
        exactUrl: record.packet?.exactUrl || '',
        host: record.packet?.host || '',
        sourceFamily: record.packet?.sourceFamily || '',
        proposedDecision: record.packet?.proposedDecision || '',
        status: existingRun ? 'already_run' : ready ? 'ready_to_run' : workerStatus.status,
        ready,
        existingRunItemKey: existingRun?.itemKey || existingRun?.item_key || '',
        existingRunArtifactId: existingRun?.artifactId || existingRun?.artifact_id || '',
        workerStatus,
        record,
      }
    })
    .sort((left, right) => {
      const rank = value => value.status === 'ready_to_run' ? 0 : value.status === 'already_run' ? 1 : 2
      return rank(left) - rank(right) || text(left.host).localeCompare(text(right.host))
    })

  return {
    status: 'ready',
    queueTargetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
    decisionTargetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    route: SOURCE_PACKET_WORKER_QUEUE_ROUTE,
    rows,
    counts: {
      total: rows.length,
      ready: rows.filter(row => row.status === 'ready_to_run').length,
      alreadyRun: rows.filter(row => row.status === 'already_run').length,
      blocked: rows.filter(row => row.status !== 'ready_to_run' && row.status !== 'already_run').length,
    },
    sideEffects: sideEffects(),
  }
}

export function buildSourcePacketWorkerArtifactRecord({ decisionRecord = {}, runtimeResult = {}, startedAt, completedAt } = {}) {
  const artifact = runtimeResult.artifact || {}
  const runId = `source-packet-worker-run:${stableHash([
    decisionRecord.decisionId,
    decisionRecord.sourcePacketId,
    artifact.artifactId,
    startedAt,
  ]).slice(0, 16)}`

  return {
    runId,
    cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
    worker: 'source_packet_public_web_worker_runner_v1',
    decisionId: decisionRecord.decisionId,
    sourcePacketId: decisionRecord.sourcePacketId,
    exactUrl: artifact.exactUrl || decisionRecord.packet?.exactUrl || '',
    startedAt,
    completedAt,
    status: runtimeResult.ok ? 'completed_evidence_ready' : 'blocked',
    artifactId: artifact.artifactId || '',
    artifact,
    nextSourcePacketCandidateCount: list(artifact.nextSourcePacketCandidates).length,
    freshnessSignal: {
      sourceFamily: artifact.host ? 'public_web_resource_links' : 'unknown',
      latestEvidenceAt: completedAt,
      synthesisNeedsRefresh: runtimeResult.ok === true,
      action: 'flag_only_no_auto_destination_write',
      writesDestinationLedgers: false,
    },
    noAutoBacklog: true,
    noExternalWrites: true,
    sideEffects: sideEffects(runtimeResult.sideEffects || {}),
  }
}

export function buildSourcePacketWorkerTargetInput({ lastStatus = null } = {}) {
  return {
    targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    title: 'Approved source-packet worker runs',
    lane: 'source_packet_worker',
    targetType: 'worker_run_ledger',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: {},
    budget: {
      exactUrlOnly: true,
      maxPages: 1,
      broadCrawl: false,
      followLinks: false,
    },
    dedupePolicy: { key: 'runId', mode: 'append_distinct_worker_runs' },
    lastStatus,
    metadata: {
      cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
      route: SOURCE_PACKET_WORKER_RUNNER_ROUTE,
      exactUrlOnly: true,
      localPlaywrightFirst: true,
      followsLinks: false,
      clicks: false,
      downloads: false,
      submitsForms: false,
      usesAuthSession: false,
      externalWrites: false,
      writesBacklog: false,
    },
    notes: 'Runs approved public source packets one exact URL at a time. Discovered links become new packet candidates, not followed links.',
  }
}

export function buildSourcePacketWorkerCrawlItemInput(workerArtifact = {}) {
  const artifact = workerArtifact.artifact || {}
  return {
    itemKey: `${SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY}:${safeKey(workerArtifact.runId || workerArtifact.artifactId)}`,
    targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    externalId: workerArtifact.runId || workerArtifact.artifactId,
    itemType: 'source_packet_worker_run',
    status: workerArtifact.status === 'completed_evidence_ready' ? 'succeeded' : 'failed',
    fingerprint: stableHash(workerArtifact),
    attemptCount: 1,
    artifactId: workerArtifact.artifactId,
    discoveredAt: workerArtifact.startedAt,
    processedAt: workerArtifact.completedAt,
    metadata: {
      schemaVersion: 1,
      cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
      worker: workerArtifact.worker,
      runId: workerArtifact.runId,
      decisionId: workerArtifact.decisionId,
      sourcePacketId: workerArtifact.sourcePacketId,
      exactUrl: workerArtifact.exactUrl,
      host: artifact.host || '',
      mode: artifact.mode || '',
      status: workerArtifact.status,
      artifactId: workerArtifact.artifactId,
      title: artifact.title || '',
      textChars: artifact.textChars || 0,
      headingCount: list(artifact.headings).length,
      discoveredLinkCount: list(artifact.discoveredLinks).length,
      nextSourcePacketCandidateCount: workerArtifact.nextSourcePacketCandidateCount,
      freshnessSignal: workerArtifact.freshnessSignal,
      noAutoBacklog: workerArtifact.noAutoBacklog,
      noExternalWrites: workerArtifact.noExternalWrites,
      sideEffects: workerArtifact.sideEffects,
      evidence: artifact.evidence || {},
    },
  }
}

export function validateSourcePacketWorkerCrawlItemInput(input = {}, workerArtifact = {}) {
  const failures = []
  if (input.targetKey !== SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY) addFailure(failures, 'wrong_target_key', input.targetKey || 'missing')
  if (input.sourceId !== SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID) addFailure(failures, 'wrong_source_id', input.sourceId || 'missing')
  if (input.itemType !== 'source_packet_worker_run') addFailure(failures, 'wrong_item_type', input.itemType || 'missing')
  if (!['succeeded', 'failed'].includes(input.status)) addFailure(failures, 'invalid_source_crawl_status', input.status || 'missing')
  if (!text(input.externalId)) addFailure(failures, 'missing_external_id')
  if (!text(input.artifactId)) addFailure(failures, 'missing_artifact_id')
  if (workerArtifact.artifactId && input.artifactId !== workerArtifact.artifactId) addFailure(failures, 'artifact_id_must_match_worker_artifact')
  if (input.metadata?.sideEffects?.externalWrites !== false) addFailure(failures, 'metadata_external_writes_not_false')
  if (input.metadata?.sideEffects?.writesBacklog !== false) addFailure(failures, 'metadata_writes_backlog_not_false')
  if (input.metadata?.sideEffects?.followsLinks !== false) addFailure(failures, 'metadata_follows_links_not_false')
  return { ok: failures.length === 0, failures }
}

export function buildSourcePacketWorkerReportArtifactInput(workerArtifact = {}) {
  const artifact = workerArtifact.artifact || {}
  const candidates = list(artifact.nextSourcePacketCandidates)
  return {
    reportArtifactId: workerArtifact.artifactId,
    reportType: 'proof',
    scopeKey: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
    department: 'foundation',
    title: `Source-packet worker run: ${artifact.title || artifact.host || workerArtifact.sourcePacketId || workerArtifact.runId}`,
    status: 'generated',
    sourceIds: [SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID],
    inputArtifactIds: [workerArtifact.decisionId, workerArtifact.sourcePacketId].filter(Boolean),
    inputCandidateKeys: candidates.map(candidate => candidate.url).filter(Boolean).slice(0, 40),
    sourceCoverage: [{
      sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
      sourcePacketId: workerArtifact.sourcePacketId,
      exactUrl: workerArtifact.exactUrl,
      host: artifact.host || '',
      status: workerArtifact.status,
      exactUrlOnly: true,
      followedLinks: false,
    }],
    freshnessWarnings: workerArtifact.freshnessSignal?.synthesisNeedsRefresh
      ? [{
          code: 'source_packet_worker_evidence_ready_for_synthesis',
          detail: 'Evidence was captured and should be included in the next synthesis/router refresh.',
          latestEvidenceAt: workerArtifact.freshnessSignal.latestEvidenceAt,
        }]
      : [],
    topFindings: [{
      title: artifact.title || artifact.host || workerArtifact.exactUrl,
      summary: artifact.description || artifact.bodyTextPreview || 'Approved exact public page captured by source-packet worker.',
      evidence: {
        artifactId: workerArtifact.artifactId,
        pageHash: artifact.evidence?.pageHash || '',
        headingCount: list(artifact.headings).length,
        textChars: artifact.textChars || 0,
      },
    }],
    actionRequiredItems: candidates.map(candidate => ({
      type: 'source_packet_candidate',
      url: candidate.url,
      host: candidate.host,
      family: candidate.family,
      reason: candidate.reason,
      followed: false,
      decisionNeeded: 'Approve as a separate source packet before any follow-up.',
    })).slice(0, 40),
    openQuestions: candidates.length
      ? []
      : [{
          question: 'No follow-up source links were discovered on the exact approved page.',
          owner: 'system',
        }],
    structuredOutputJson: {
      schemaVersion: 1,
      cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
      workerArtifact,
    },
    outputArtifactId: workerArtifact.artifactId,
    metadata: {
      cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
      runId: workerArtifact.runId,
      decisionId: workerArtifact.decisionId,
      sourcePacketId: workerArtifact.sourcePacketId,
      exactUrlOnly: true,
      reportOnly: true,
      externalWrites: false,
      writesBacklog: false,
      followsLinks: false,
      clicked: false,
      submittedForm: false,
      downloadedFile: false,
      loggedIn: false,
    },
  }
}

export async function persistSourcePacketWorkerRun(result = {}, deps = {}) {
  if (result.ok !== true || !result.workerArtifact) {
    return {
      ok: false,
      status: 'blocked',
      validation: result.validation || { ok: false, failures: [{ code: 'missing_completed_worker_artifact' }] },
      sideEffects: sideEffects(),
    }
  }
  if (typeof deps.upsertSourceCrawlTarget !== 'function') throw new Error('upsertSourceCrawlTarget dependency is required.')
  if (typeof deps.upsertSourceCrawlItem !== 'function') throw new Error('upsertSourceCrawlItem dependency is required.')

  const workerArtifact = result.workerArtifact
  const itemInput = buildSourcePacketWorkerCrawlItemInput(workerArtifact)
  const itemValidation = validateSourcePacketWorkerCrawlItemInput(itemInput, workerArtifact)
  if (!itemValidation.ok) {
    return {
      ok: false,
      status: 'blocked',
      itemInput,
      validation: itemValidation,
      sideEffects: sideEffects(),
    }
  }

  const actor = text(deps.actor || workerArtifact.worker || 'source-packet-worker-runner')
  const target = await deps.upsertSourceCrawlTarget(
    buildSourcePacketWorkerTargetInput({ lastStatus: itemInput.status }),
    actor,
  )
  const sourceCrawlItem = await deps.upsertSourceCrawlItem(itemInput, actor)
  const reportArtifactInput = buildSourcePacketWorkerReportArtifactInput(workerArtifact)
  const reportArtifact = typeof deps.upsertIntelligenceReportArtifact === 'function'
    ? await deps.upsertIntelligenceReportArtifact(reportArtifactInput, actor)
    : null

  return {
    ok: true,
    status: 'persisted',
    reportOnly: false,
    target,
    sourceCrawlItem,
    reportArtifact,
    reportArtifactInput,
    itemInput,
    workerArtifact,
    validation: itemValidation,
    sideEffects: sideEffects({
      externalWrites: false,
      writesBacklog: false,
      writesSourceCrawlItems: true,
      writesIntelligenceReportArtifact: Boolean(reportArtifact),
    }),
  }
}

export async function runSourcePacketWorker(request = {}) {
  const mode = request.mode || 'synthetic_fixture'
  const startedAt = request.startedAt || new Date().toISOString()
  const validation = validateSourcePacketWorkerRequest({ ...request, mode })
  if (!validation.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation,
      sideEffects: sideEffects(),
    }
  }

  const runtimeResult = await runSourcePacketPublicWebRuntime({
    packet: validation.packet,
    html: request.html,
    mode,
    allowLive: request.allowLive,
    followLinks: request.followLinks,
    submitForms: request.submitForms,
    downloadFiles: request.downloadFiles,
    authSessionUsed: request.authSessionUsed,
    externalWrites: request.externalWrites,
    writesBacklog: request.writesBacklog,
    fetchedAt: request.fetchedAt || startedAt,
  })
  const completedAt = request.completedAt || new Date().toISOString()
  if (!runtimeResult.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation: runtimeResult.validation || validation,
      runtimeResult,
      sideEffects: sideEffects(runtimeResult.sideEffects || {}),
    }
  }

  const workerArtifact = buildSourcePacketWorkerArtifactRecord({
    decisionRecord: request.decisionRecord,
    runtimeResult,
    startedAt,
    completedAt,
  })

  return {
    ok: true,
    status: 'completed_evidence_ready',
    reportOnly: true,
    validation,
    runtimeResult,
    workerArtifact,
    sideEffects: workerArtifact.sideEffects,
  }
}

function fixtureDecision(overrides = {}) {
  return buildSourcePacketDecisionRecord({
    url: 'https://chaseai.io/offer',
    host: 'chaseai.io',
    operatorAction: 'approve',
    operatorNote: 'sales page, review how they sell AI products',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T23:20:00.000-04:00',
    ...overrides,
  })
}

export async function buildSourcePacketWorkerRunnerDogfoodProof() {
  const html = `
    <html>
      <head>
        <title>AI Systems Offer</title>
        <meta name="description" content="Build AI operating systems for teams.">
      </head>
      <body>
        <h1>AI systems for real operators</h1>
        <p>Includes implementation patterns, agent workflows, and team enablement.</p>
        <a href="https://github.com/example/agent-system">Code package</a>
        <a href="https://www.skool.com/chase-ai">Community</a>
      </body>
    </html>
  `
  const approved = fixtureDecision()
  const run = await runSourcePacketWorker({
    decisionRecord: approved,
    html,
    startedAt: '2026-05-25T23:25:00.000-04:00',
    completedAt: '2026-05-25T23:25:02.000-04:00',
  })
  const writes = []
  const persistence = await persistSourcePacketWorkerRun(run, {
    actor: 'synthetic-source-packet-worker-proof',
    upsertSourceCrawlTarget: async (input, actor) => {
      writes.push({ type: 'target', input, actor })
      return { ...input, updatedBy: actor }
    },
    upsertSourceCrawlItem: async (input, actor) => {
      writes.push({ type: 'item', input, actor })
      return { itemKey: input.itemKey, status: input.status, artifactId: input.artifactId, metadata: input.metadata, updatedBy: actor }
    },
    upsertIntelligenceReportArtifact: async (input, actor) => {
      writes.push({ type: 'report', input, actor })
      return { reportArtifactId: input.reportArtifactId, status: input.status, sourceIds: input.sourceIds, updatedBy: actor }
    },
  })

  const held = fixtureDecision({ operatorAction: 'hold' })
  const rejected = fixtureDecision({ operatorAction: 'reject' })
  const skool = fixtureDecision({ url: 'https://www.skool.com/chase-ai', host: 'skool.com', operatorNote: 'free community maybe' })
  const decisionItems = [approved, held, rejected, skool].map(record => ({
    targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    metadata: {
      exactUrl: record.packet.exactUrl,
      host: record.packet.host,
      operatorAction: record.operatorAction,
      operatorNote: record.operatorNote,
      decisionId: record.decisionId,
      sourcePacketId: record.sourcePacketId,
      proposedDecision: record.packet.proposedDecision,
      decidedBy: record.decidedBy,
      decidedAt: record.decidedAt,
      sourceVideoId: record.packet.sourceVideoId,
      sourceUrl: record.packet.sourceUrl,
      reportArtifactId: record.packet.reportArtifactId,
      reason: record.packet.reason,
    },
  }))
  const queueBeforeRun = buildSourcePacketWorkerQueue({ decisionItems, workerRunItems: [] })
  const queueAfterRun = buildSourcePacketWorkerQueue({
    decisionItems,
    workerRunItems: [{
      itemKey: persistence.sourceCrawlItem?.itemKey,
      artifactId: persistence.sourceCrawlItem?.artifactId,
      metadata: persistence.sourceCrawlItem?.metadata || persistence.itemInput?.metadata || {},
    }],
  })

  const blockedCases = [
    {
      name: 'held_packet_does_not_run',
      result: await runSourcePacketWorker({ decisionRecord: held, html }),
      expectedCode: 'decision_not_approved_for_worker',
    },
    {
      name: 'rejected_packet_does_not_run',
      result: await runSourcePacketWorker({ decisionRecord: rejected, html }),
      expectedCode: 'decision_not_approved_for_worker',
    },
    {
      name: 'skool_packet_requires_source_specific_runner',
      result: await runSourcePacketWorker({ decisionRecord: skool, html }),
      expectedCode: 'decision_not_public_web_runtime_eligible',
    },
    {
      name: 'follow_links_blocks',
      result: await runSourcePacketWorker({ decisionRecord: approved, html, followLinks: true }),
      expectedCode: 'worker_follow_links_blocked',
    },
    {
      name: 'live_worker_requires_explicit_allow',
      result: await runSourcePacketWorker({ decisionRecord: approved, html, mode: 'live_playwright_exact_url' }),
      expectedCode: 'live_worker_requires_explicit_allow_live',
    },
  ].map(testCase => ({
    name: testCase.name,
    ok: testCase.result.ok === false && list(testCase.result.validation?.failures).some(failure => failure.code === testCase.expectedCode),
    expectedCode: testCase.expectedCode,
    actualCodes: list(testCase.result.validation?.failures).map(failure => failure.code),
  }))

  return {
    ok: run.ok === true &&
      run.workerArtifact?.status === 'completed_evidence_ready' &&
      run.workerArtifact?.artifactId &&
      run.workerArtifact?.nextSourcePacketCandidateCount >= 2 &&
      run.workerArtifact?.freshnessSignal?.synthesisNeedsRefresh === true &&
      persistence.ok === true &&
      persistence.sourceCrawlItem?.status === 'succeeded' &&
      persistence.reportArtifact?.reportArtifactId === run.workerArtifact?.artifactId &&
      writes.some(write => write.type === 'target') &&
      writes.some(write => write.type === 'item') &&
      writes.some(write => write.type === 'report') &&
      queueBeforeRun.counts.ready === 1 &&
      queueBeforeRun.counts.blocked === 3 &&
      queueAfterRun.counts.ready === 0 &&
      queueAfterRun.counts.alreadyRun === 1 &&
      run.sideEffects.externalWrites === false &&
      run.sideEffects.writesBacklog === false &&
      run.sideEffects.followsLinks === false &&
      blockedCases.every(testCase => testCase.ok),
    run: {
      ok: run.ok,
      status: run.status,
      artifactId: run.workerArtifact?.artifactId || '',
      nextSourcePacketCandidateCount: run.workerArtifact?.nextSourcePacketCandidateCount || 0,
      freshnessSignal: run.workerArtifact?.freshnessSignal || {},
      sideEffects: run.sideEffects,
    },
    persistence: {
      ok: persistence.ok,
      status: persistence.status,
      targetKey: persistence.target?.targetKey || '',
      sourceCrawlItemStatus: persistence.sourceCrawlItem?.status || '',
      reportArtifactId: persistence.reportArtifact?.reportArtifactId || '',
      writeTypes: writes.map(write => write.type),
      sideEffects: persistence.sideEffects,
    },
    queue: {
      beforeRun: queueBeforeRun.counts,
      afterRun: queueAfterRun.counts,
      sideEffects: queueBeforeRun.sideEffects,
    },
    blockedCases,
  }
}
