import crypto from 'node:crypto'

import {
  SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
  SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
  buildSourcePacketDecisionRecord,
  validateSourcePacketDecisionRecord,
} from './source-packet-approval-decision-ledger.js'
import {
  attachExtractorHandsPolicy,
  classifyExtractorHandsPacketStatus,
  runExtractorHandsBrowserRuntime,
} from './extractor-hands-browser-runtime.js'

export const EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID = 'EXTRACTOR-HANDS-PRODUCTION-RUNNER-001'
export const EXTRACTOR_HANDS_PRODUCTION_RUNNER_SCRIPT_PATH = 'scripts/process-extractor-hands-production-runner-check.mjs'
export const EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY = 'extractor-hands-production-runs'
export const EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE = '/api/foundation/dev-team-hub/source-packet-hands-run'
export const EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE = '/api/foundation/dev-team-hub/source-packet-hands-queue'

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
    liveBrowserLaunched: false,
    networkFetched: false,
    clicked: false,
    navigated: false,
    submittedForm: false,
    downloadedFile: false,
    purchasedOrOptedIn: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    followedUnapprovedLinks: false,
    writesSourceCrawlItems: false,
    writesIntelligenceReportArtifact: false,
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

function handsPolicyFrom(input = {}) {
  return input.handsPolicy || input.policy || input.packet?.handsPolicy || input.decisionRecord?.packet?.handsPolicy || null
}

function buildRunnableHandsPacket(record = {}, policy = null) {
  const packet = approvedDecisionPacket(record)
  if (!policy) return packet
  return attachExtractorHandsPolicy(packet, policy)
}

export function buildExtractorHandsProductionDecisionRecord(input = {}) {
  if (input.decisionRecord?.decisionId) return input.decisionRecord
  return buildSourcePacketDecisionRecord({
    url: input.url,
    host: input.host,
    sourceVideoId: input.sourceVideoId,
    sourceUrl: input.sourceUrl,
    reportArtifactId: input.reportArtifactId,
    reason: input.reason,
    operatorNote: input.operatorNote,
    operatorAction: input.operatorAction || 'hold_packet',
    decision: input.decision,
    decidedBy: input.decidedBy,
    decidedAt: input.decidedAt,
    packet: input.packet,
  })
}

export function validateExtractorHandsProductionRequest(request = {}) {
  const failures = []
  const record = buildExtractorHandsProductionDecisionRecord(request)
  const recordValidation = validateSourcePacketDecisionRecord(record)
  for (const failure of recordValidation.failures || []) addFailure(failures, failure.code || failure, failure.detail || 'decision record validation')

  if (record.operatorAction !== 'approve_packet') addFailure(failures, 'decision_not_approved_for_hands', record.operatorAction || 'missing')
  if (record.decisionStatus !== 'approved_source_packet_recorded') addFailure(failures, 'decision_status_not_approved', record.decisionStatus || 'missing')
  if (record.runtimeStarted !== false || record.startsWorker !== false || record.noRuntimeStarted !== true) {
    addFailure(failures, 'approval_record_must_not_have_started_hands')
  }

  const policy = handsPolicyFrom(request)
  const packet = buildRunnableHandsPacket(record, policy)
  const handsStatus = classifyExtractorHandsPacketStatus(packet)
  if (handsStatus.status !== 'click_navigation_ready') {
    addFailure(failures, handsStatus.status, handsStatus.plainEnglish)
    for (const failure of handsStatus.failures || []) failures.push(failure)
  }

  if (!['synthetic_fixture', 'live_playwright_hands'].includes(request.mode || 'synthetic_fixture')) {
    addFailure(failures, 'unsupported_hands_runner_mode', request.mode || 'missing')
  }
  if (request.mode === 'live_playwright_hands' && request.allowLive !== true) {
    addFailure(failures, 'live_hands_runner_requires_explicit_allow_live', 'live browser disabled by default')
  }
  if (request.followLinks === true) addFailure(failures, 'hands_runner_follow_links_blocked', 'only the exact approved selector may be clicked')
  if (request.authSessionUsed === true) addFailure(failures, 'hands_runner_auth_session_blocked')
  if (request.submitForms === true) addFailure(failures, 'hands_runner_form_submit_blocked')
  if (request.downloadFiles === true) addFailure(failures, 'hands_runner_download_blocked')
  if (request.purchaseOrOptIn === true) addFailure(failures, 'hands_runner_purchase_or_opt_in_blocked')
  if (request.externalWrites === true) addFailure(failures, 'hands_runner_external_write_blocked')
  if (request.writesBacklog === true) addFailure(failures, 'hands_runner_backlog_write_blocked')

  return {
    ok: failures.length === 0,
    failures,
    decisionRecord: record,
    packet,
    handsStatus,
  }
}

export function buildExtractorHandsProductionDecisionStatus(record = {}, policy = null) {
  const validation = validateExtractorHandsProductionRequest({
    decisionRecord: record,
    handsPolicy: policy,
    mode: 'synthetic_fixture',
  })
  const approved = record.operatorAction === 'approve_packet' &&
    record.decisionStatus === 'approved_source_packet_recorded'
  const ready = validation.ok === true

  if (ready) {
    return {
      status: 'ready_to_run_bounded_hands',
      ready: true,
      approved,
      separateRunRequired: true,
      runRoute: EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
      queueRoute: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
      startsFromApprovalAction: false,
      plainEnglish: 'This approved packet has explicit Hands policy and is ready for the separate bounded Hands runner.',
      validation,
    }
  }

  return {
    status: approved ? validation.handsStatus?.status || 'blocked_before_hands_run' : 'not_ready_for_hands',
    ready: false,
    approved,
    separateRunRequired: approved,
    runRoute: approved ? EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE : '',
    queueRoute: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
    startsFromApprovalAction: false,
    plainEnglish: approved
      ? validation.handsStatus?.plainEnglish || 'This approved packet is not ready for bounded Hands until packet detail is added.'
      : 'This decision is saved, but it is not an approved packet for Hands execution.',
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
      handsPolicy: metadata.handsPolicy || null,
    },
  }
}

export function buildExtractorHandsProductionQueue({ decisionItems = [], handsRunItems = [] } = {}) {
  const runByDecision = new Map()
  const runByPacket = new Map()
  for (const item of list(handsRunItems)) {
    const metadata = item.metadata || {}
    if (metadata.decisionId) runByDecision.set(metadata.decisionId, item)
    if (metadata.sourcePacketId) runByPacket.set(metadata.sourcePacketId, item)
  }

  const rows = list(decisionItems)
    .filter(item => item.targetKey === SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY || item.target_key === SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY)
    .map(item => {
      const record = decisionRecordFromCrawlItem(item)
      const policy = record.packet?.handsPolicy || null
      const handsStatus = buildExtractorHandsProductionDecisionStatus(record, policy)
      const existingRun = runByDecision.get(record.decisionId) || (handsStatus.ready === true ? runByPacket.get(record.sourcePacketId) : null) || null
      const ready = handsStatus.ready === true && !existingRun
      return {
        decisionId: record.decisionId,
        sourcePacketId: record.sourcePacketId,
        operatorAction: record.operatorAction,
        decisionStatus: record.decisionStatus,
        exactUrl: record.packet?.exactUrl || '',
        host: record.packet?.host || '',
        sourceFamily: record.packet?.sourceFamily || '',
        proposedDecision: record.packet?.proposedDecision || '',
        status: existingRun ? 'already_run' : ready ? 'ready_to_run' : handsStatus.status,
        ready,
        hasHandsPolicy: Boolean(policy),
        existingRunItemKey: existingRun?.itemKey || existingRun?.item_key || '',
        existingRunArtifactId: existingRun?.artifactId || existingRun?.artifact_id || '',
        handsStatus,
        record,
      }
    })
    .sort((left, right) => {
      const rank = value => value.status === 'ready_to_run' ? 0 : value.status === 'already_run' ? 1 : 2
      return rank(left) - rank(right) || text(left.host).localeCompare(text(right.host))
    })

  return {
    status: 'ready',
    queueTargetKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
    decisionTargetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    route: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
    runRoute: EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
    rows,
    counts: {
      total: rows.length,
      ready: rows.filter(row => row.status === 'ready_to_run').length,
      alreadyRun: rows.filter(row => row.status === 'already_run').length,
      blocked: rows.filter(row => row.status !== 'ready_to_run' && row.status !== 'already_run').length,
      needsPolicy: rows.filter(row => row.status === 'exact_public_read_ready').length,
    },
    sideEffects: sideEffects(),
  }
}

export function buildExtractorHandsProductionArtifactRecord({ decisionRecord = {}, handsResult = {}, startedAt, completedAt } = {}) {
  const artifact = handsResult.artifact || {}
  const runId = `extractor-hands-run:${stableHash([
    decisionRecord.decisionId,
    decisionRecord.sourcePacketId,
    artifact.artifactId,
    startedAt,
  ]).slice(0, 16)}`

  return {
    runId,
    cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
    worker: 'extractor_hands_production_runner_v1',
    decisionId: decisionRecord.decisionId,
    sourcePacketId: decisionRecord.sourcePacketId,
    exactUrl: artifact.exactUrl || decisionRecord.packet?.exactUrl || '',
    finalUrl: artifact.finalUrl || '',
    startedAt,
    completedAt,
    status: handsResult.ok ? 'completed_bounded_hands_evidence_ready' : 'blocked',
    artifactId: artifact.artifactId || '',
    artifact,
    freshnessSignal: {
      sourceFamily: artifact.host ? 'public_web_resource_links' : 'unknown',
      latestEvidenceAt: completedAt,
      synthesisNeedsRefresh: handsResult.ok === true,
      action: 'flag_only_no_auto_destination_write',
      writesDestinationLedgers: false,
    },
    noAutoBacklog: true,
    noExternalWrites: true,
    sideEffects: sideEffects(handsResult.sideEffects || {}),
  }
}

export function buildExtractorHandsProductionTargetInput({ lastStatus = null } = {}) {
  return {
    targetKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    title: 'Approved source-packet Hands runs',
    lane: 'source_packet_hands',
    targetType: 'hands_run_ledger',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: {},
    budget: {
      exactUrlOnly: true,
      maxPages: 2,
      maxClicks: 1,
      broadCrawl: false,
      followLinks: false,
    },
    dedupePolicy: { key: 'runId', mode: 'append_distinct_hands_runs' },
    lastStatus,
    metadata: {
      cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
      route: EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
      queueRoute: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
      localPlaywrightFirst: true,
      exactApprovedSelectorOnly: true,
      followsLinks: false,
      downloads: false,
      submitsForms: false,
      usesAuthSession: false,
      externalWrites: false,
      writesBacklog: false,
    },
    notes: 'Runs approved public source packets through exactly one approved browser click/navigation action. Any follow-up needs a separate source packet.',
  }
}

export function buildExtractorHandsProductionCrawlItemInput(handsArtifact = {}) {
  const artifact = handsArtifact.artifact || {}
  return {
    itemKey: `${EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY}:${safeKey(handsArtifact.runId || handsArtifact.artifactId)}`,
    targetKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    externalId: handsArtifact.runId || handsArtifact.artifactId,
    itemType: 'source_packet_hands_run',
    status: handsArtifact.status === 'completed_bounded_hands_evidence_ready' ? 'succeeded' : 'failed',
    fingerprint: stableHash(handsArtifact),
    attemptCount: 1,
    artifactId: handsArtifact.artifactId,
    discoveredAt: handsArtifact.startedAt,
    processedAt: handsArtifact.completedAt,
    metadata: {
      schemaVersion: 1,
      cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
      worker: handsArtifact.worker,
      runId: handsArtifact.runId,
      decisionId: handsArtifact.decisionId,
      sourcePacketId: handsArtifact.sourcePacketId,
      exactUrl: handsArtifact.exactUrl,
      finalUrl: handsArtifact.finalUrl,
      host: artifact.host || '',
      mode: artifact.mode || '',
      status: handsArtifact.status,
      artifactId: handsArtifact.artifactId,
      title: artifact.after?.title || artifact.before?.title || '',
      actionTrace: artifact.actionTrace || [],
      textChars: artifact.after?.textChars || 0,
      headingCount: list(artifact.after?.headings).length,
      freshnessSignal: handsArtifact.freshnessSignal,
      noAutoBacklog: handsArtifact.noAutoBacklog,
      noExternalWrites: handsArtifact.noExternalWrites,
      sideEffects: handsArtifact.sideEffects,
      evidence: artifact.evidence || {},
    },
  }
}

export function validateExtractorHandsProductionCrawlItemInput(input = {}, handsArtifact = {}) {
  const failures = []
  if (input.targetKey !== EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY) addFailure(failures, 'wrong_target_key', input.targetKey || 'missing')
  if (input.sourceId !== SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID) addFailure(failures, 'wrong_source_id', input.sourceId || 'missing')
  if (input.itemType !== 'source_packet_hands_run') addFailure(failures, 'wrong_item_type', input.itemType || 'missing')
  if (!['succeeded', 'failed'].includes(input.status)) addFailure(failures, 'invalid_source_crawl_status', input.status || 'missing')
  if (!text(input.externalId)) addFailure(failures, 'missing_external_id')
  if (!text(input.artifactId)) addFailure(failures, 'missing_artifact_id')
  if (handsArtifact.artifactId && input.artifactId !== handsArtifact.artifactId) addFailure(failures, 'artifact_id_must_match_hands_artifact')
  if (input.metadata?.sideEffects?.externalWrites !== false) addFailure(failures, 'metadata_external_writes_not_false')
  if (input.metadata?.sideEffects?.writesBacklog !== false) addFailure(failures, 'metadata_writes_backlog_not_false')
  if (input.metadata?.sideEffects?.followedUnapprovedLinks !== false) addFailure(failures, 'metadata_followed_unapproved_links_not_false')
  if (input.metadata?.sideEffects?.submittedForm !== false) addFailure(failures, 'metadata_submitted_form_not_false')
  if (input.metadata?.sideEffects?.downloadedFile !== false) addFailure(failures, 'metadata_downloaded_file_not_false')
  if (input.metadata?.sideEffects?.purchasedOrOptedIn !== false) addFailure(failures, 'metadata_purchase_not_false')
  return { ok: failures.length === 0, failures }
}

export function buildExtractorHandsProductionReportArtifactInput(handsArtifact = {}) {
  const artifact = handsArtifact.artifact || {}
  const action = list(artifact.actionTrace)[0] || {}
  return {
    reportArtifactId: handsArtifact.artifactId,
    reportType: 'proof',
    scopeKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
    department: 'foundation',
    title: `Extractor Hands run: ${artifact.after?.title || artifact.host || handsArtifact.sourcePacketId || handsArtifact.runId}`,
    status: 'generated',
    sourceIds: [SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID],
    inputArtifactIds: [handsArtifact.decisionId, handsArtifact.sourcePacketId].filter(Boolean),
    inputCandidateKeys: [handsArtifact.exactUrl, handsArtifact.finalUrl].filter(Boolean),
    sourceCoverage: [{
      sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
      sourcePacketId: handsArtifact.sourcePacketId,
      exactUrl: handsArtifact.exactUrl,
      finalUrl: handsArtifact.finalUrl,
      host: artifact.host || '',
      status: handsArtifact.status,
      exactApprovedActionOnly: true,
      followedLinks: false,
    }],
    freshnessWarnings: handsArtifact.freshnessSignal?.synthesisNeedsRefresh
      ? [{
          code: 'extractor_hands_evidence_ready_for_synthesis',
          detail: 'Bounded Hands evidence was captured and should be included in the next synthesis/router refresh.',
          latestEvidenceAt: handsArtifact.freshnessSignal.latestEvidenceAt,
        }]
      : [],
    topFindings: [{
      title: artifact.after?.title || artifact.finalUrl || handsArtifact.finalUrl,
      summary: artifact.after?.bodyTextPreview || 'Approved bounded Hands action captured evidence.',
      evidence: {
        artifactId: handsArtifact.artifactId,
        beforePageHash: artifact.evidence?.beforePageHash || '',
        afterPageHash: artifact.evidence?.afterPageHash || '',
        stopReason: artifact.evidence?.stopReason || '',
      },
    }],
    actionRequiredItems: [{
      type: 'hands_review',
      sourcePacketId: handsArtifact.sourcePacketId,
      actionId: action.actionId || '',
      selector: action.selector || '',
      exactUrl: handsArtifact.exactUrl,
      finalUrl: handsArtifact.finalUrl,
      decisionNeeded: 'Review captured evidence before promoting any downstream build or follow-up source packet.',
    }],
    openQuestions: [],
    structuredOutputJson: {
      schemaVersion: 1,
      cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
      handsArtifact,
    },
    outputArtifactId: handsArtifact.artifactId,
    metadata: {
      cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
      runId: handsArtifact.runId,
      decisionId: handsArtifact.decisionId,
      sourcePacketId: handsArtifact.sourcePacketId,
      exactApprovedActionOnly: true,
      reportOnly: true,
      externalWrites: false,
      writesBacklog: false,
      followedUnapprovedLinks: false,
      clicked: true,
      navigated: true,
      submittedForm: false,
      downloadedFile: false,
      loggedIn: false,
    },
  }
}

export async function persistExtractorHandsProductionRun(result = {}, deps = {}) {
  if (result.ok !== true || !result.handsArtifact) {
    return {
      ok: false,
      status: 'blocked',
      validation: result.validation || { ok: false, failures: [{ code: 'missing_completed_hands_artifact' }] },
      sideEffects: sideEffects(),
    }
  }
  if (typeof deps.upsertSourceCrawlTarget !== 'function') throw new Error('upsertSourceCrawlTarget dependency is required.')
  if (typeof deps.upsertSourceCrawlItem !== 'function') throw new Error('upsertSourceCrawlItem dependency is required.')

  const handsArtifact = result.handsArtifact
  const itemInput = buildExtractorHandsProductionCrawlItemInput(handsArtifact)
  const itemValidation = validateExtractorHandsProductionCrawlItemInput(itemInput, handsArtifact)
  if (!itemValidation.ok) {
    return {
      ok: false,
      status: 'blocked',
      itemInput,
      validation: itemValidation,
      sideEffects: sideEffects(),
    }
  }

  const actor = text(deps.actor || handsArtifact.worker || 'extractor-hands-production-runner')
  const target = await deps.upsertSourceCrawlTarget(
    buildExtractorHandsProductionTargetInput({ lastStatus: itemInput.status }),
    actor,
  )
  const sourceCrawlItem = await deps.upsertSourceCrawlItem(itemInput, actor)
  const reportArtifactInput = buildExtractorHandsProductionReportArtifactInput(handsArtifact)
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
    handsArtifact,
    validation: itemValidation,
    sideEffects: sideEffects({
      writesSourceCrawlItems: true,
      writesIntelligenceReportArtifact: Boolean(reportArtifact),
    }),
  }
}

export async function runExtractorHandsProductionRunner(request = {}) {
  const mode = request.mode || 'synthetic_fixture'
  const startedAt = request.startedAt || new Date().toISOString()
  const validation = validateExtractorHandsProductionRequest({ ...request, mode })
  if (!validation.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation,
      sideEffects: sideEffects(),
    }
  }

  const handsResult = await runExtractorHandsBrowserRuntime({
    packet: validation.packet,
    html: request.html,
    fixturePages: request.fixturePages,
    afterHtml: request.afterHtml,
    mode,
    allowLive: request.allowLive,
    followLinks: request.followLinks,
    submitForms: request.submitForms,
    downloadFiles: request.downloadFiles,
    authSessionUsed: request.authSessionUsed,
    purchaseOrOptIn: request.purchaseOrOptIn,
    externalWrites: request.externalWrites,
    writesBacklog: request.writesBacklog,
    capturedAt: request.capturedAt || startedAt,
  })
  const completedAt = request.completedAt || new Date().toISOString()
  if (!handsResult.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation: handsResult.validation || validation,
      handsResult,
      sideEffects: sideEffects(handsResult.sideEffects || {}),
    }
  }

  const handsArtifact = buildExtractorHandsProductionArtifactRecord({
    decisionRecord: validation.decisionRecord,
    handsResult,
    startedAt,
    completedAt,
  })

  return {
    ok: true,
    status: 'completed_bounded_hands_evidence_ready',
    reportOnly: true,
    validation,
    handsResult,
    handsArtifact,
    sideEffects: handsArtifact.sideEffects,
  }
}

function fixtureDecision({ withPolicy = true, operatorAction = 'approve', url = 'https://example.com/start', host = 'example.com', policy = {} } = {}) {
  const record = buildSourcePacketDecisionRecord({
    url,
    host,
    operatorAction,
    operatorNote: 'approve exact public click to pricing page',
    decidedBy: 'Steve',
    decidedAt: '2026-05-26T04:10:00.000-04:00',
  })
  return {
    record,
    handsPolicy: withPolicy
      ? {
          actionId: 'open-pricing',
          selector: '[data-hands-action="pricing"]',
          allowedNextUrl: 'https://example.com/pricing',
          stopCondition: 'capture_pricing_page_visible_text',
          evidenceTarget: 'pricing_page',
          ...policy,
        }
      : null,
  }
}

function decisionItemFrom(record = {}, handsPolicy = null) {
  return {
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
      handsPolicy,
    },
  }
}

export async function buildExtractorHandsProductionRunnerDogfoodProof() {
  const beforeHtml = `
    <html>
      <head><title>Example AI Systems</title></head>
      <body>
        <h1>AI systems for operators</h1>
        <a data-hands-action="pricing" href="/pricing">Pricing</a>
        <a data-hands-action="skool" href="https://www.skool.com/example">Community</a>
      </body>
    </html>
  `
  const afterHtml = `
    <html>
      <head><title>Pricing - Example AI Systems</title></head>
      <body>
        <h1>Pricing</h1>
        <p>Implementation package tiers are visible. This proof does not submit forms or opt in.</p>
      </body>
    </html>
  `
  const approved = fixtureDecision()
  const run = await runExtractorHandsProductionRunner({
    decisionRecord: approved.record,
    handsPolicy: approved.handsPolicy,
    html: beforeHtml,
    fixturePages: { 'https://example.com/pricing': afterHtml },
    startedAt: '2026-05-26T04:10:00.000-04:00',
    completedAt: '2026-05-26T04:10:02.000-04:00',
  })
  const writes = []
  const persistence = await persistExtractorHandsProductionRun(run, {
    actor: 'synthetic-extractor-hands-production-proof',
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

  const exactReadOnly = fixtureDecision({ withPolicy: false, url: 'https://example.com/docs' })
  const held = fixtureDecision({ operatorAction: 'hold' })
  const rejected = fixtureDecision({ operatorAction: 'reject' })
  const skool = fixtureDecision({ url: 'https://www.skool.com/example', host: 'skool.com' })
  const decisionItems = [
    decisionItemFrom(approved.record, approved.handsPolicy),
    decisionItemFrom(exactReadOnly.record, exactReadOnly.handsPolicy),
    decisionItemFrom(held.record, held.handsPolicy),
    decisionItemFrom(skool.record, skool.handsPolicy),
  ]
  const queueBeforeRun = buildExtractorHandsProductionQueue({ decisionItems, handsRunItems: [] })
  const queueAfterRun = buildExtractorHandsProductionQueue({
    decisionItems,
    handsRunItems: [{
      itemKey: persistence.sourceCrawlItem?.itemKey,
      artifactId: persistence.sourceCrawlItem?.artifactId,
      metadata: persistence.sourceCrawlItem?.metadata || persistence.itemInput?.metadata || {},
    }],
  })

  const blockedCases = [
    {
      name: 'missing_policy_requires_packet_detail',
      result: await runExtractorHandsProductionRunner({ decisionRecord: exactReadOnly.record, html: beforeHtml }),
      expectedCode: 'exact_public_read_ready',
    },
    {
      name: 'held_packet_does_not_run',
      result: await runExtractorHandsProductionRunner({ decisionRecord: held.record, handsPolicy: approved.handsPolicy, html: beforeHtml }),
      expectedCode: 'decision_not_approved_for_hands',
    },
    {
      name: 'rejected_packet_does_not_run',
      result: await runExtractorHandsProductionRunner({ decisionRecord: rejected.record, handsPolicy: approved.handsPolicy, html: beforeHtml }),
      expectedCode: 'decision_not_approved_for_hands',
    },
    {
      name: 'skool_packet_requires_source_specific_runner',
      result: await runExtractorHandsProductionRunner({ decisionRecord: skool.record, handsPolicy: { ...approved.handsPolicy, allowedNextUrl: 'https://www.skool.com/example/about', allowedNextUrlPattern: '^https://www\\.skool\\.com/example/about$' }, html: beforeHtml }),
      expectedCode: 'auth_session_required',
    },
    {
      name: 'follow_links_blocks',
      result: await runExtractorHandsProductionRunner({ decisionRecord: approved.record, handsPolicy: approved.handsPolicy, html: beforeHtml, followLinks: true }),
      expectedCode: 'hands_runner_follow_links_blocked',
    },
    {
      name: 'live_hands_requires_explicit_allow',
      result: await runExtractorHandsProductionRunner({ decisionRecord: approved.record, handsPolicy: approved.handsPolicy, html: beforeHtml, mode: 'live_playwright_hands' }),
      expectedCode: 'live_hands_runner_requires_explicit_allow_live',
    },
    {
      name: 'external_write_blocks',
      result: await runExtractorHandsProductionRunner({ decisionRecord: approved.record, handsPolicy: approved.handsPolicy, html: beforeHtml, externalWrites: true }),
      expectedCode: 'hands_runner_external_write_blocked',
    },
    {
      name: 'backlog_write_blocks',
      result: await runExtractorHandsProductionRunner({ decisionRecord: approved.record, handsPolicy: approved.handsPolicy, html: beforeHtml, writesBacklog: true }),
      expectedCode: 'hands_runner_backlog_write_blocked',
    },
  ].map(testCase => ({
    name: testCase.name,
    ok: testCase.result.ok === false && list(testCase.result.validation?.failures).some(failure => failure.code === testCase.expectedCode),
    expectedCode: testCase.expectedCode,
    actualCodes: list(testCase.result.validation?.failures).map(failure => failure.code),
  }))

  return {
    ok: run.ok === true &&
      run.handsArtifact?.status === 'completed_bounded_hands_evidence_ready' &&
      run.handsArtifact?.artifactId &&
      run.handsArtifact?.finalUrl === 'https://example.com/pricing' &&
      run.handsArtifact?.freshnessSignal?.synthesisNeedsRefresh === true &&
      persistence.ok === true &&
      persistence.sourceCrawlItem?.status === 'succeeded' &&
      persistence.reportArtifact?.reportArtifactId === run.handsArtifact?.artifactId &&
      writes.some(write => write.type === 'target') &&
      writes.some(write => write.type === 'item') &&
      writes.some(write => write.type === 'report') &&
      queueBeforeRun.counts.ready === 1 &&
      queueBeforeRun.counts.blocked === 3 &&
      queueBeforeRun.counts.needsPolicy === 1 &&
      queueAfterRun.counts.ready === 0 &&
      queueAfterRun.counts.alreadyRun === 1 &&
      run.sideEffects.clicked === true &&
      run.sideEffects.navigated === true &&
      run.sideEffects.externalWrites === false &&
      run.sideEffects.writesBacklog === false &&
      run.sideEffects.followedUnapprovedLinks === false &&
      blockedCases.every(testCase => testCase.ok),
    run: {
      ok: run.ok,
      status: run.status,
      artifactId: run.handsArtifact?.artifactId || '',
      finalUrl: run.handsArtifact?.finalUrl || '',
      freshnessSignal: run.handsArtifact?.freshnessSignal || {},
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
