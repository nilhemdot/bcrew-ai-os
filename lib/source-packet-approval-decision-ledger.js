import crypto from 'node:crypto'

import {
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'

export const SOURCE_PACKET_APPROVAL_DECISION_LEDGER_CARD_ID = BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID
export const SOURCE_PACKET_APPROVAL_DECISION_LEDGER_SCRIPT_PATH = 'scripts/process-source-packet-approval-decision-ledger-check.mjs'
export const SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY = 'build-intel-link-approval-source-packet-decisions'
export const SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'

const ACTIONS = new Set(['approve_packet', 'hold_packet', 'reject_link'])
const APPROVE_BLOCKED_DECISIONS = new Set(['manual_source_packet'])

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

function normalizeOperatorAction(value = '') {
  const normalized = text(value).toLowerCase().replace(/[\s-]+/g, '_')
  if (['approve', 'approved', 'approve_packet', 'confirm', 'confirm_packet'].includes(normalized)) return 'approve_packet'
  if (['hold', 'held', 'hold_packet', 'park', 'parking_lot', 'later'].includes(normalized)) return 'hold_packet'
  if (['reject', 'rejected', 'reject_link', 'noise', 'ignore'].includes(normalized)) return 'reject_link'
  return 'hold_packet'
}

function decisionStatusFor(operatorAction = '') {
  if (operatorAction === 'approve_packet') return 'approved_source_packet_recorded'
  if (operatorAction === 'reject_link') return 'rejected_no_follow'
  return 'held_for_more_context'
}

function sourceItemStatusFor(operatorAction = '') {
  return operatorAction === 'approve_packet' ? 'succeeded' : 'skipped'
}

function decisionPlainEnglish(record = {}) {
  if (record.operatorAction === 'approve_packet') {
    return 'Steve approved this source packet record. The system saved the boundary, but did not start a crawl or worker.'
  }
  if (record.operatorAction === 'reject_link') {
    return 'Steve rejected this link. The system saved the rejection so it should not keep coming back.'
  }
  return 'Steve held this link for later. The system saved the note and did not read the source.'
}

function addFailure(failures, code, detail = '') {
  failures.push({ code, detail })
}

export function buildSourcePacketDecisionTargetInput() {
  return {
    targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    title: 'Build Intel source-packet approval decisions',
    lane: 'approval_review',
    targetType: 'decision_ledger',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: {},
    budget: { runtimeStartedFromDecision: false },
    dedupePolicy: { key: 'sourcePacketId', mode: 'latest_decision_wins' },
    metadata: {
      cardId: SOURCE_PACKET_APPROVAL_DECISION_LEDGER_CARD_ID,
      writesOnlyDecisionRecords: true,
      startsCrawler: false,
      startsWorker: false,
      externalWrites: false,
      writesBacklog: false,
    },
    notes: 'Records Steve source-packet approval decisions only. It is not a crawler queue.',
  }
}

export function buildSourcePacketDecisionRecord(input = {}) {
  const operatorAction = normalizeOperatorAction(input.operatorAction || input.action)
  const operatorNote = text(input.operatorNote || input.operatorComment)
  const forcedDecision = operatorAction === 'reject_link'
    ? 'reject_noise'
    : text(input.decision || input.proposedDecision)
  const rawLink = input.rawLink || input.link || {
    url: input.url,
    host: input.host,
    sourceVideoId: input.sourceVideoId,
    sourceUrl: input.sourceUrl,
    reportArtifactId: input.reportArtifactId,
    reason: input.reason,
    operatorNote,
  }
  const packet = input.packet?.sourcePacketId
    ? input.packet
    : buildSourcePacketPreview(rawLink, {
      operatorNote,
      decision: forcedDecision,
    })
  const decidedBy = text(input.decidedBy || input.approvedBy || 'Steve')
  const decidedAt = input.decidedAt || input.approvedAt || new Date().toISOString()
  const decisionStatus = decisionStatusFor(operatorAction)
  const decisionId = `source-packet-decision:${stableHash([
    packet.sourcePacketId,
    packet.exactUrl,
    packet.proposedDecision,
    operatorAction,
    operatorNote,
  ]).slice(0, 16)}`

  const record = {
    schemaVersion: 1,
    cardId: SOURCE_PACKET_APPROVAL_DECISION_LEDGER_CARD_ID,
    decisionId,
    sourcePacketId: packet.sourcePacketId,
    operatorAction,
    decisionStatus,
    operatorNote,
    decidedBy,
    decidedAt,
    packet: {
      ...packet,
      approvedBy: operatorAction === 'approve_packet' ? decidedBy : packet.approvedBy || '',
      approvedAt: operatorAction === 'approve_packet' ? decidedAt : packet.approvedAt || null,
    },
    noRuntimeStarted: true,
    startsCrawler: false,
    startsWorker: false,
    runtimeStarted: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    plainEnglish: '',
  }

  return {
    ...record,
    plainEnglish: decisionPlainEnglish(record),
  }
}

export function validateSourcePacketDecisionRecord(record = {}) {
  const failures = []
  if (record.cardId !== SOURCE_PACKET_APPROVAL_DECISION_LEDGER_CARD_ID) addFailure(failures, 'card_id_mismatch', record.cardId || 'missing')
  if (!text(record.decisionId)) addFailure(failures, 'missing_decision_id')
  if (!text(record.sourcePacketId)) addFailure(failures, 'missing_source_packet_id')
  if (!ACTIONS.has(record.operatorAction)) addFailure(failures, 'invalid_operator_action', record.operatorAction || 'missing')
  if (!text(record.decisionStatus)) addFailure(failures, 'missing_decision_status')
  if (!text(record.decidedBy)) addFailure(failures, 'missing_decided_by')
  if (!record.decidedAt || Number.isNaN(Date.parse(record.decidedAt))) addFailure(failures, 'invalid_decided_at', record.decidedAt || 'missing')
  if (record.startsCrawler !== false) addFailure(failures, 'decision_must_not_start_crawler')
  if (record.startsWorker !== false || record.runtimeStarted !== false || record.noRuntimeStarted !== true) addFailure(failures, 'decision_must_not_start_runtime')
  if (record.externalWrites !== false) addFailure(failures, 'decision_must_not_write_external_systems')
  if (record.writesBacklog !== false) addFailure(failures, 'decision_must_not_write_backlog')
  if (record.mutatesCredentials !== false) addFailure(failures, 'decision_must_not_mutate_credentials')
  if (record.mutatesBrowserProfile !== false) addFailure(failures, 'decision_must_not_mutate_browser_profile')

  const packetValidation = validateSourcePacketPreview(record.packet || {})
  for (const failure of packetValidation.failures || []) addFailure(failures, failure, 'packet validation')

  if (record.operatorAction === 'approve_packet' && APPROVE_BLOCKED_DECISIONS.has(record.packet?.proposedDecision)) {
    addFailure(failures, 'manual_packet_cannot_be_approved_without_adjustment', record.packet?.proposedDecision)
  }
  if (record.operatorAction === 'approve_packet' && record.packet?.proposedDecision === 'reject_noise') {
    addFailure(failures, 'reject_noise_must_use_reject_action', record.packet?.proposedDecision)
  }
  if (record.operatorAction === 'reject_link' && record.packet?.proposedDecision !== 'reject_noise') {
    addFailure(failures, 'reject_action_must_record_reject_noise_packet', record.packet?.proposedDecision || 'missing')
  }

  return {
    ok: failures.length === 0,
    failures,
  }
}

export function buildSourcePacketDecisionCrawlItemInput(record = {}) {
  const packet = record.packet || {}
  return {
    itemKey: `${SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY}:${safeKey(record.decisionId || packet.sourcePacketId)}`,
    targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    sourceId: SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
    externalId: packet.sourcePacketId || record.decisionId,
    itemType: 'source_packet_decision',
    status: sourceItemStatusFor(record.operatorAction),
    fingerprint: stableHash(record),
    attemptCount: 0,
    artifactId: record.decisionId,
    processedAt: record.decidedAt,
    metadata: {
      schemaVersion: record.schemaVersion,
      cardId: record.cardId,
      decisionId: record.decisionId,
      decisionStatus: record.decisionStatus,
      operatorAction: record.operatorAction,
      operatorNote: record.operatorNote,
      decidedBy: record.decidedBy,
      decidedAt: record.decidedAt,
      sourcePacketId: record.sourcePacketId,
      exactUrl: packet.exactUrl,
      host: packet.host,
      sourceFamily: packet.sourceFamily,
      proposedDecision: packet.proposedDecision,
      accessBoundary: packet.accessBoundary,
      runtimePlan: packet.runtimePlan || {},
      sourceVideoId: packet.sourceVideoId || '',
      sourceUrl: packet.sourceUrl || '',
      reportArtifactId: packet.reportArtifactId || '',
      noRuntimeStarted: record.noRuntimeStarted,
      startsCrawler: record.startsCrawler,
      startsWorker: record.startsWorker,
      runtimeStarted: record.runtimeStarted,
      externalWrites: record.externalWrites,
      writesBacklog: record.writesBacklog,
      mutatesCredentials: record.mutatesCredentials,
      mutatesBrowserProfile: record.mutatesBrowserProfile,
      plainEnglish: record.plainEnglish,
    },
  }
}

export function validateSourcePacketDecisionCrawlItemInput(input = {}, record = {}) {
  const failures = []
  if (input.targetKey !== SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY) addFailure(failures, 'wrong_target_key', input.targetKey || 'missing')
  if (input.sourceId !== SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID) addFailure(failures, 'wrong_source_id', input.sourceId || 'missing')
  if (input.itemType !== 'source_packet_decision') addFailure(failures, 'wrong_item_type', input.itemType || 'missing')
  if (!['succeeded', 'skipped'].includes(input.status)) addFailure(failures, 'invalid_source_crawl_status', input.status || 'missing')
  if (Number(input.attemptCount || 0) !== 0) addFailure(failures, 'decision_record_must_not_increment_attempts', String(input.attemptCount || 0))
  if (input.metadata?.startsCrawler !== false) addFailure(failures, 'metadata_starts_crawler_not_false')
  if (input.metadata?.startsWorker !== false || input.metadata?.runtimeStarted !== false) addFailure(failures, 'metadata_runtime_started_not_false')
  if (input.metadata?.externalWrites !== false || input.metadata?.writesBacklog !== false) addFailure(failures, 'metadata_write_boundary_not_false')
  if (record.decisionId && input.artifactId !== record.decisionId) addFailure(failures, 'artifact_id_must_match_decision_id')
  return { ok: failures.length === 0, failures }
}

export async function persistSourcePacketDecisionRecord(record = {}, deps = {}) {
  const validation = validateSourcePacketDecisionRecord(record)
  const itemInput = buildSourcePacketDecisionCrawlItemInput(record)
  const itemValidation = validateSourcePacketDecisionCrawlItemInput(itemInput, record)
  const failures = [...validation.failures, ...itemValidation.failures]
  if (failures.length) {
    return {
      ok: false,
      status: 'blocked',
      record,
      itemInput,
      validation: { ok: false, failures },
      sideEffects: safeSideEffects(),
    }
  }
  if (typeof deps.upsertSourceCrawlTarget !== 'function') throw new Error('upsertSourceCrawlTarget dependency is required.')
  if (typeof deps.upsertSourceCrawlItem !== 'function') throw new Error('upsertSourceCrawlItem dependency is required.')

  const actor = text(deps.actor || record.decidedBy || 'source-packet-decision-ledger')
  const target = await deps.upsertSourceCrawlTarget(buildSourcePacketDecisionTargetInput(), actor)
  const sourceCrawlItem = await deps.upsertSourceCrawlItem(itemInput, actor)
  return {
    ok: true,
    status: 'recorded',
    reportOnly: false,
    target,
    sourceCrawlItem,
    record,
    itemInput,
    validation: { ok: true, failures: [] },
    sideEffects: safeSideEffects({ writesSourceCrawlItems: true }),
  }
}

export function safeSideEffects(overrides = {}) {
  return {
    startsCrawler: false,
    startsWorker: false,
    runtimeStarted: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    writesSourceCrawlItems: false,
    ...overrides,
  }
}

export function buildSourcePacketApprovalDecisionLedgerDogfoodProof() {
  const cases = []
  const approvedPublic = buildSourcePacketDecisionRecord({
    url: 'https://chaseai.io',
    host: 'chaseai.io',
    operatorNote: 'sales page, review how they sell AI products',
    operatorAction: 'approve',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T21:00:00.000-04:00',
  })
  const approvedInput = buildSourcePacketDecisionCrawlItemInput(approvedPublic)
  cases.push({
    name: 'approved_public_sales_packet_records_without_runtime',
    ok: validateSourcePacketDecisionRecord(approvedPublic).ok &&
      validateSourcePacketDecisionCrawlItemInput(approvedInput, approvedPublic).ok &&
      approvedInput.status === 'succeeded' &&
      approvedInput.metadata.startsCrawler === false &&
      approvedInput.metadata.runtimeStarted === false &&
      approvedInput.metadata.writesBacklog === false,
    record: approvedPublic,
    itemInput: approvedInput,
  })

  const heldManual = buildSourcePacketDecisionRecord({
    url: 'https://bit.ly/agent-stack',
    host: 'bit.ly',
    operatorNote: 'not sure what this is, hold it',
    operatorAction: 'hold',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T21:01:00.000-04:00',
  })
  const heldInput = buildSourcePacketDecisionCrawlItemInput(heldManual)
  cases.push({
    name: 'held_manual_packet_is_skipped_record_not_worker_queue',
    ok: validateSourcePacketDecisionRecord(heldManual).ok &&
      validateSourcePacketDecisionCrawlItemInput(heldInput, heldManual).ok &&
      heldInput.status === 'skipped' &&
      heldInput.metadata.decisionStatus === 'held_for_more_context',
    record: heldManual,
    itemInput: heldInput,
  })

  const rejected = buildSourcePacketDecisionRecord({
    url: 'https://instagram.com/example',
    host: 'instagram.com',
    operatorAction: 'reject',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T21:02:00.000-04:00',
  })
  cases.push({
    name: 'rejected_link_forces_reject_noise_packet',
    ok: validateSourcePacketDecisionRecord(rejected).ok &&
      rejected.packet.proposedDecision === 'reject_noise' &&
      buildSourcePacketDecisionCrawlItemInput(rejected).status === 'skipped',
    record: rejected,
  })

  const badCrawl = {
    ...approvedPublic,
    startsCrawler: true,
    runtimeStarted: true,
    writesBacklog: true,
  }
  const badValidation = validateSourcePacketDecisionRecord(badCrawl)
  cases.push({
    name: 'tampered_crawl_or_backlog_decision_fails_closed',
    ok: badValidation.ok === false &&
      badValidation.failures.some(failure => failure.code === 'decision_must_not_start_crawler') &&
      badValidation.failures.some(failure => failure.code === 'decision_must_not_start_runtime') &&
      badValidation.failures.some(failure => failure.code === 'decision_must_not_write_backlog'),
    validation: badValidation,
  })

  const badApproveManual = buildSourcePacketDecisionRecord({
    url: 'https://bit.ly/agent-stack',
    host: 'bit.ly',
    operatorAction: 'approve',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T21:03:00.000-04:00',
  })
  const badApproveValidation = validateSourcePacketDecisionRecord(badApproveManual)
  cases.push({
    name: 'manual_source_packet_cannot_be_approved_without_adjustment',
    ok: badApproveValidation.ok === false &&
      badApproveValidation.failures.some(failure => failure.code === 'manual_packet_cannot_be_approved_without_adjustment'),
    validation: badApproveValidation,
  })

  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}
