import crypto from 'node:crypto'

import {
  buildSourcePacketDecisionRecord,
  validateSourcePacketDecisionRecord,
} from './source-packet-approval-decision-ledger.js'
import {
  runSourcePacketPublicWebRuntime,
  validateApprovedPublicWebSourcePacket,
} from './source-packet-public-web-runtime.js'

export const SOURCE_PACKET_WORKER_RUNNER_CARD_ID = 'SOURCE-PACKET-WORKER-RUNNER-001'
export const SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH = 'scripts/process-source-packet-worker-runner-check.mjs'

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

  const held = fixtureDecision({ operatorAction: 'hold' })
  const rejected = fixtureDecision({ operatorAction: 'reject' })
  const skool = fixtureDecision({ url: 'https://www.skool.com/chase-ai', host: 'skool.com', operatorNote: 'free community maybe' })

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
    blockedCases,
  }
}
