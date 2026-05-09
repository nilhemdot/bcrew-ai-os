import { createHash } from 'node:crypto'

export const SYNTHESIS_VERIFY_CARD_ID = 'SYNTHESIS-VERIFY-001'
export const SYNTHESIS_VERIFY_CLOSEOUT_KEY = 'synthesis-verify-v1'
export const SYNTHESIS_VERIFY_PLAN_PATH = 'docs/process/synthesis-verify-001-plan.md'
export const SYNTHESIS_VERIFY_APPROVAL_PATH = 'docs/process/approvals/SYNTHESIS-VERIFY-001.json'
export const SYNTHESIS_VERIFY_DOC_PATH = 'docs/process/synthesis-verify.md'
export const SYNTHESIS_VERIFY_SCRIPT_PATH = 'scripts/process-synthesis-verify-check.mjs'
export const SYNTHESIS_VERIFY_SUMMARY_MARKER = 'SYNTHESIS_VERIFY_SUMMARY'
export const SYNTHESIS_VERIFICATION_METADATA_KEY = 'synthesisVerification'
export const SYNTHESIS_VERIFICATION_VERSION = SYNTHESIS_VERIFY_CLOSEOUT_KEY

export const SYNTHESIS_CLAIM_SURFACES = {
  intelligenceSynthesizedItems: {
    surface: 'intelligence_synthesized_items',
    idField: 'synthesizedItemId',
    tableName: 'intelligence_synthesized_items',
  },
  sharedCommunicationSynthesis: {
    surface: 'shared_communication_synthesized_items',
    idField: 'synthesisItemId',
    tableName: 'shared_communication_synthesized_items',
  },
  actionRoutes: {
    surface: 'intelligence_action_routes',
    idField: 'routeId',
    tableName: 'intelligence_action_routes',
  },
}

const SUPPORT_LEVELS = new Set(['verified', 'partially_supported', 'unsupported', 'contradicted', 'stale', 'blocked'])
const DIAGNOSTIC_ROUTE_TYPES = new Set(['ignore', 'snooze'])
const DIAGNOSTIC_DESTINATIONS = new Set(['intelligence_synthesized_items'])
const ROUTE_DECISION_DESTINATIONS = new Set(['decisions', 'backlog_items', 'open_questions'])
const INACTIVE_ATOM_STATUSES = new Set(['rejected', 'archived', 'superseded'])
const ACTIVE_FACT_STATUS = 'active'
const ACTIVE_CHUNK_STATUS = 'active'

export class SynthesisVerificationError extends Error {
  constructor(message, verification = null) {
    super(message)
    this.name = 'SynthesisVerificationError'
    this.code = 'synthesis_verification_failed'
    this.verification = verification
  }
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeText(item)).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function uniqueText(values) {
  return Array.from(new Set(normalizeTextArray(values)))
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function numberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function coerceMinTier(value) {
  const parsed = numberOrNull(value)
  if (!parsed || parsed < 1) return null
  return Math.floor(parsed)
}

function metadataFor(record = {}) {
  return parseJsonObject(record.metadata)
}

function attributesFor(record = {}) {
  return parseJsonObject(record.attributes)
}

function recordSurface(input = {}) {
  const explicit = normalizeText(input.surface || input.recordSurface)
  if (explicit) return explicit
  const record = input.record || input
  if (record.routeId || record.route_id) return SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface
  if (record.synthesisItemId || record.synthesis_item_id) return SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface
  return SYNTHESIS_CLAIM_SURFACES.intelligenceSynthesizedItems.surface
}

function recordIdFor(surface, record = {}) {
  if (surface === SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface) {
    return normalizeText(record.routeId || record.route_id)
  }
  if (surface === SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface) {
    return normalizeText(record.synthesisItemId || record.synthesis_item_id)
  }
  return normalizeText(record.synthesizedItemId || record.synthesized_item_id)
}

function textForHash(record = {}) {
  return [
    record.title,
    record.summary,
    record.oneLine || record.one_line,
    record.whyItMatters || record.why_it_matters,
    record.recommendedNextAction || record.recommended_next_action,
    record.ownerAction || record.owner_action,
    record.routingReason || record.routing_reason,
  ].map(value => normalizeText(value)).filter(Boolean).join('\n')
}

function claimCountFor(record = {}) {
  return [
    record.title,
    record.summary,
    record.oneLine || record.one_line,
    record.whyItMatters || record.why_it_matters,
    record.recommendedNextAction || record.recommended_next_action,
    record.ownerAction || record.owner_action,
    record.routingReason || record.routing_reason,
  ].filter(value => normalizeText(value)).length || 1
}

function routeScopeFor(record = {}) {
  const metadata = metadataFor(record)
  const attributes = attributesFor(record)
  return normalizeText(
    record.routeScope ||
    record.route_scope ||
    attributes.routeScope ||
    attributes.route_scope ||
    metadata.routeScope ||
    metadata.route_scope ||
    metadata.reviewSurface ||
    metadata.strategySurface
  ).toLowerCase()
}

function strategyEligible(record = {}) {
  const metadata = metadataFor(record)
  const attributes = attributesFor(record)
  return record.strategyHubEligible === true ||
    record.strategy_hub_eligible === true ||
    metadata.strategyHubEligible === true ||
    metadata.strategyHubEligible === 'true' ||
    attributes.strategyHubEligible === true ||
    attributes.strategyHubEligible === 'true' ||
    routeScopeFor(record) === 'strategy'
}

export function isDecisionGradeActionRoute(record = {}) {
  const routeType = normalizeText(record.routeType || record.route_type)
  const destinationTable = normalizeText(record.destinationTable || record.destination_table)
  if (DIAGNOSTIC_ROUTE_TYPES.has(routeType)) return false
  if (DIAGNOSTIC_DESTINATIONS.has(destinationTable)) return false
  if (ROUTE_DECISION_DESTINATIONS.has(destinationTable)) return true
  return strategyEligible(record)
}

export function classifySynthesizedClaim(claimInput = {}) {
  const record = claimInput.record || claimInput
  const surface = recordSurface(claimInput)
  if (surface === SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface) {
    return 'shared_comms_claim_pack'
  }
  if (surface === SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface) {
    return isDecisionGradeActionRoute(record) ? 'recommendation_or_action' : 'diagnostic_route'
  }
  if (strategyEligible(record)) return 'strategy_grade'
  if (uniqueText(record.evidenceRefs || record.evidence_refs).length) return 'retrieved_evidence'
  return 'direct_source_fact'
}

function evidenceChunkRefForResult(result = {}) {
  return result.chunk?.chunkId || result.chunk_id || result.chunkId || null
}

function evidenceIdForResult(result = {}) {
  return result.evidenceId || result.evidence_id || result.atomId || result.atom_id || result.candidateKey || result.candidate_key || null
}

export function buildSynthesisEvidenceIndex(input = {}) {
  const facts = Array.isArray(input.facts) ? input.facts : []
  const chunks = Array.isArray(input.chunks) ? input.chunks : []
  const atoms = Array.isArray(input.atoms) ? input.atoms : []
  const candidates = Array.isArray(input.candidates) ? input.candidates : []
  const evidenceResults = Array.isArray(input.evidenceResults)
    ? input.evidenceResults
    : Array.isArray(input.evidence?.results)
      ? input.evidence.results
      : []

  const chunksFromResults = evidenceResults
    .map(result => result.chunk || {
      chunkId: result.chunkId || result.chunk_id,
      sourceId: result.sourceId || result.source_id,
      status: result.status || ACTIVE_CHUNK_STATUS,
      minTier: result.minTier || result.min_tier || 1,
      sensitivity: result.sensitivity || 'neutral',
    })
    .filter(chunk => chunk?.chunkId || chunk?.chunk_id)
  const atomsFromResults = evidenceResults
    .map(result => ({
      atomId: result.atomId || result.atom_id || result.evidenceId || result.evidence_id,
      sourceId: result.sourceId || result.source_id,
      status: result.atomStatus || result.status || 'active',
      minTier: result.minTier || result.min_tier || 1,
      sensitivity: result.sensitivity || 'neutral',
    }))
    .filter(atom => atom.atomId)
  const candidatesFromResults = evidenceResults
    .map(result => ({
      candidateKey: result.candidateKey || result.candidate_key,
      sourceId: result.sourceId || result.source_id,
      status: result.candidateStatus || 'pending',
      metadata: {
        minTier: result.minTier || result.min_tier || 1,
        sensitivity: result.sensitivity || 'neutral',
      },
    }))
    .filter(candidate => candidate.candidateKey)

  const factsById = new Map()
  for (const fact of facts) {
    const id = fact.factId || fact.fact_id
    if (id) factsById.set(id, fact)
  }

  const chunksById = new Map()
  for (const chunk of [...chunks, ...chunksFromResults]) {
    const id = chunk.chunkId || chunk.chunk_id
    if (id) chunksById.set(id, chunk)
  }

  const atomsById = new Map()
  for (const atom of [...atoms, ...atomsFromResults]) {
    const id = atom.atomId || atom.atom_id
    if (id) atomsById.set(id, atom)
  }

  const candidatesByKey = new Map()
  for (const candidate of [...candidates, ...candidatesFromResults]) {
    const key = candidate.candidateKey || candidate.candidate_key
    if (key) candidatesByKey.set(key, candidate)
  }

  const evidenceResultsById = new Map()
  for (const result of evidenceResults) {
    const ids = uniqueText([evidenceIdForResult(result), result.evidenceId, result.atomId, result.candidateKey])
    for (const id of ids) evidenceResultsById.set(id, result)
  }

  return {
    factsById,
    chunksById,
    atomsById,
    candidatesByKey,
    evidenceResultsById,
    registeredSourceIds: new Set(uniqueText(input.registeredSourceIds || input.sourceIds)),
  }
}

function hasRegisteredSource(sourceIds, evidenceIndex = {}) {
  if (!evidenceIndex.registeredSourceIds?.size) return true
  return uniqueText(sourceIds).every(sourceId => evidenceIndex.registeredSourceIds.has(sourceId))
}

function verificationFixture(record = {}) {
  const metadata = metadataFor(record)
  return normalizeText(metadata.synthesisVerificationFixture || metadata.verificationFixture || record.verificationFixture)
}

function sourceIdsFor(record = {}) {
  return uniqueText(record.sourceIds || record.source_ids)
}

function factRefsFor(record = {}) {
  return uniqueText(record.factRefs || record.fact_refs)
}

function evidenceRefsFor(record = {}) {
  return uniqueText(record.evidenceRefs || record.evidence_refs || record.atomRefs || record.atom_refs)
}

function evidenceChunkRefsFor(record = {}) {
  return uniqueText(record.evidenceChunkRefs || record.evidence_chunk_refs)
}

function candidateKeysFor(record = {}) {
  return uniqueText(record.candidateKeys || record.candidate_keys)
}

function artifactIdsFor(record = {}) {
  return uniqueText(record.artifactIds || record.artifact_ids)
}

function routeRefsFor(record = {}) {
  return uniqueText([record.routeId || record.route_id, ...(record.routeRefs || record.route_refs || [])])
}

function missingFromMap(refs, map) {
  if (!map || map.size === 0) return []
  return refs.filter(ref => !map.has(ref))
}

function inactiveFacts(refs, factsById) {
  if (!factsById || factsById.size === 0) return []
  return refs.filter(ref => {
    const fact = factsById.get(ref)
    return fact && normalizeText(fact.status || ACTIVE_FACT_STATUS) !== ACTIVE_FACT_STATUS
  })
}

function inactiveChunks(refs, chunksById) {
  if (!chunksById || chunksById.size === 0) return []
  return refs.filter(ref => {
    const chunk = chunksById.get(ref)
    return chunk && normalizeText(chunk.status || ACTIVE_CHUNK_STATUS) !== ACTIVE_CHUNK_STATUS
  })
}

function inactiveEvidence(refs, evidenceIndex = {}) {
  const inactive = []
  for (const ref of refs) {
    const atom = evidenceIndex.atomsById?.get(ref)
    if (atom && INACTIVE_ATOM_STATUSES.has(normalizeText(atom.status))) inactive.push(ref)
    const candidate = evidenceIndex.candidatesByKey?.get(ref)
    if (candidate && ['rejected', 'duplicate', 'archived'].includes(normalizeText(candidate.status))) inactive.push(ref)
  }
  return Array.from(new Set(inactive))
}

function inferSharedMinTier(record = {}, evidenceIndex = {}) {
  const candidates = candidateKeysFor(record).map(key => evidenceIndex.candidatesByKey?.get(key)).filter(Boolean)
  const tiers = candidates.map(candidate => {
    const metadata = metadataFor(candidate)
    return coerceMinTier(candidate.minTier || candidate.min_tier || metadata.minTier || metadata.min_tier)
  }).filter(Boolean)
  return tiers.length ? Math.max(...tiers) : coerceMinTier(record.minTier || record.min_tier || 1)
}

function recordMinTier(record = {}, surface, evidenceIndex) {
  if (surface === SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface) {
    return inferSharedMinTier(record, evidenceIndex)
  }
  return coerceMinTier(record.minTier || record.min_tier)
}

function recordSensitivity(record = {}, surface, evidenceIndex = {}) {
  const explicit = normalizeText(record.sensitivity)
  if (explicit) return explicit
  if (surface === SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface) {
    const candidates = candidateKeysFor(record).map(key => evidenceIndex.candidatesByKey?.get(key)).filter(Boolean)
    const candidateSensitivity = candidates
      .map(candidate => normalizeText(candidate.sensitivity || metadataFor(candidate).sensitivity))
      .find(Boolean)
    return candidateSensitivity || 'neutral'
  }
  return ''
}

function confidenceLabel(status, warnings = []) {
  if (status !== 'verified') return status === 'partially_supported' ? 'low' : 'none'
  return warnings.length ? 'medium' : 'high'
}

function statusFromFindings({ contradicted, stale, blockedReasons, unsupportedReasons, partialReasons }) {
  if (contradicted) return 'contradicted'
  if (stale) return 'stale'
  if (blockedReasons.length) return 'blocked'
  if (unsupportedReasons.length) return 'unsupported'
  if (partialReasons.length) return 'partially_supported'
  return 'verified'
}

function asOfDatesForRefs(factRefs, evidenceIndex = {}) {
  return factRefs
    .map(ref => evidenceIndex.factsById?.get(ref))
    .filter(Boolean)
    .map(fact => fact.asOf || fact.as_of || fact.updatedAt || fact.updated_at || fact.createdAt || fact.created_at)
    .filter(Boolean)
}

function freshnessFor(record, factRefs, evidenceIndex = {}, options = {}) {
  const fixture = verificationFixture(record)
  if (fixture === 'stale') return { status: 'stale', asOf: null }
  const requiresFresh = options.requiresFreshEvidence === true || metadataFor(record).requiresFreshEvidence === true
  if (!requiresFresh) return { status: 'not_checked', asOf: null }
  const thresholdDays = Number(options.freshnessDays || metadataFor(record).freshnessDays || 180)
  const dates = asOfDatesForRefs(factRefs, evidenceIndex)
  if (!dates.length) return { status: 'unknown', asOf: null }
  const newest = dates
    .map(value => new Date(value))
    .filter(date => Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0]
  if (!newest) return { status: 'unknown', asOf: null }
  const ageDays = (Date.now() - newest.getTime()) / 86400000
  return {
    status: ageDays > thresholdDays ? 'stale' : 'fresh',
    asOf: newest.toISOString(),
  }
}

function baseVerification({ surface, recordId, record, claimClass, status, reasons, warnings, freshness }) {
  const sourceIds = sourceIdsFor(record)
  const factRefs = factRefsFor(record)
  const evidenceRefs = evidenceRefsFor(record)
  const evidenceChunkRefs = evidenceChunkRefsFor(record)
  const candidateKeys = candidateKeysFor(record)
  const artifactIds = artifactIdsFor(record)
  const routeRefs = surface === SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface ? routeRefsFor(record) : []
  const supportLevel = SUPPORT_LEVELS.has(status) ? status : 'blocked'
  return {
    recordId,
    surface,
    verificationVersion: SYNTHESIS_VERIFICATION_VERSION,
    status: supportLevel,
    supportLevel,
    claimClass,
    claimCount: claimCountFor(record),
    verifiedClaimCount: supportLevel === 'verified' ? claimCountFor(record) : 0,
    failedClaimCount: supportLevel === 'verified' ? 0 : claimCountFor(record),
    claimId: stableId('claim', `${surface}:${recordId}:${textForHash(record)}`),
    claimTextHash: `sha256:${stableHash(textForHash(record))}`,
    confidenceLabel: confidenceLabel(supportLevel, warnings),
    confidenceReason: supportLevel === 'verified' ? 'required_source_refs_present' : reasons[0] || supportLevel,
    sourceIds,
    factRefs,
    evidenceRefs,
    evidenceChunkRefs,
    candidateKeys,
    artifactIds,
    routeRefs,
    freshness,
    warnings,
    blockedReasons: supportLevel === 'verified' ? [] : reasons,
    verifiedAt: new Date().toISOString(),
  }
}

export function verifySynthesizedClaim(claimInput = {}, evidenceIndex = {}, options = {}) {
  return verifySynthesizedRecord(claimInput, evidenceIndex, options)
}

export function verifySynthesizedRecord(recordInput = {}, evidenceIndex = {}, options = {}) {
  const record = recordInput.record || recordInput
  const surface = recordSurface(recordInput)
  const recordId = recordIdFor(surface, record)
  const claimClass = classifySynthesizedClaim({ surface, record })
  const sourceIds = sourceIdsFor(record)
  const factRefs = factRefsFor(record)
  const evidenceRefs = evidenceRefsFor(record)
  const chunkRefs = evidenceChunkRefsFor(record)
  const candidateKeys = candidateKeysFor(record)
  const minTier = recordMinTier(record, surface, evidenceIndex)
  const sensitivity = recordSensitivity(record, surface, evidenceIndex)
  const fixture = verificationFixture(record)
  const blockedReasons = []
  const unsupportedReasons = []
  const partialReasons = []
  const warnings = []

  if (!recordId) blockedReasons.push('missing_record_id')
  if (!sourceIds.length) blockedReasons.push('missing_source_ids')
  if (!hasRegisteredSource(sourceIds, evidenceIndex)) blockedReasons.push('unregistered_source_id')
  if (!minTier) blockedReasons.push('missing_min_tier')
  if (!sensitivity) blockedReasons.push('missing_sensitivity')
  if (fixture === 'missing-tier') blockedReasons.push('missing_min_tier')
  if (fixture === 'unsupported') unsupportedReasons.push('unsupported_fixture')
  const contradicted = fixture === 'contradicted' || metadataFor(record).contradicted === true

  if (surface === SYNTHESIS_CLAIM_SURFACES.sharedCommunicationSynthesis.surface) {
    if (!candidateKeys.length) blockedReasons.push('missing_candidate_keys')
    const missingCandidates = missingFromMap(candidateKeys, evidenceIndex.candidatesByKey)
    if (missingCandidates.length) blockedReasons.push(`missing_candidate_refs:${missingCandidates.slice(0, 5).join(',')}`)
    const distinctSourceCount = sourceIds.length
    const declaredSourceCount = Number(record.sourceCount ?? record.source_count ?? distinctSourceCount)
    if (Number.isFinite(declaredSourceCount) && declaredSourceCount > distinctSourceCount) {
      partialReasons.push('source_count_exceeds_distinct_source_ids')
    }
  } else {
    if (!factRefs.length) unsupportedReasons.push('missing_fact_refs')
    if (!evidenceRefs.length) unsupportedReasons.push('missing_evidence_refs')
    if (!chunkRefs.length) unsupportedReasons.push('missing_evidence_chunk_refs')

    const missingFacts = missingFromMap(factRefs, evidenceIndex.factsById)
    const missingChunks = missingFromMap(chunkRefs, evidenceIndex.chunksById)
    const inactiveFactRefs = inactiveFacts(factRefs, evidenceIndex.factsById)
    const inactiveChunkRefs = inactiveChunks(chunkRefs, evidenceIndex.chunksById)
    const inactiveEvidenceRefs = inactiveEvidence(evidenceRefs, evidenceIndex)
    if (missingFacts.length) blockedReasons.push(`missing_fact_refs:${missingFacts.slice(0, 5).join(',')}`)
    if (missingChunks.length) blockedReasons.push(`missing_chunk_refs:${missingChunks.slice(0, 5).join(',')}`)
    if (inactiveFactRefs.length) blockedReasons.push(`inactive_fact_refs:${inactiveFactRefs.slice(0, 5).join(',')}`)
    if (inactiveChunkRefs.length) blockedReasons.push(`inactive_chunk_refs:${inactiveChunkRefs.slice(0, 5).join(',')}`)
    if (inactiveEvidenceRefs.length) blockedReasons.push(`inactive_evidence_refs:${inactiveEvidenceRefs.slice(0, 5).join(',')}`)

    if (claimClass === 'strategy_grade' && (evidenceRefs.length < 2 || chunkRefs.length < 2)) {
      blockedReasons.push('single_evidence_strategy_claim')
    }
    if (claimClass === 'recommendation_or_action' && isDecisionGradeActionRoute(record) && (!factRefs.length || !evidenceRefs.length || !chunkRefs.length)) {
      blockedReasons.push('decision_grade_route_missing_source_provenance')
    }
  }

  const freshness = freshnessFor(record, factRefs, evidenceIndex, options)
  const stale = fixture === 'stale' || freshness.status === 'stale'
  const status = statusFromFindings({
    contradicted,
    stale,
    blockedReasons,
    unsupportedReasons,
    partialReasons,
  })
  return baseVerification({
    surface,
    recordId,
    record,
    claimClass,
    status,
    reasons: [...blockedReasons, ...unsupportedReasons, ...partialReasons],
    warnings,
    freshness,
  })
}

export function verificationFromRecord(record = {}) {
  const metadata = metadataFor(record)
  return parseJsonObject(record.synthesisVerification || metadata[SYNTHESIS_VERIFICATION_METADATA_KEY])
}

export function isSynthesisRecordVerified(record = {}) {
  const verification = verificationFromRecord(record)
  return verification.status === 'verified' &&
    verification.supportLevel === 'verified' &&
    verification.verificationVersion === SYNTHESIS_VERIFICATION_VERSION
}

export function requireVerifiedSynthesisRecord(record = {}, options = {}) {
  const surface = recordSurface(options.surface ? { ...record, surface: options.surface } : record)
  if (surface === SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface && !isDecisionGradeActionRoute(record)) {
    return true
  }
  if (isSynthesisRecordVerified(record)) return true
  const verification = verificationFromRecord(record)
  const id = recordIdFor(surface, record) || '<unknown>'
  throw new SynthesisVerificationError(
    `SYNTHESIS-VERIFY-001 refused unverified decision-grade synthesis record ${id}.`,
    verification.status ? verification : null
  )
}

export function filterVerifiedSynthesisRecords(records = {}, options = {}) {
  const rows = Array.isArray(records) ? records : []
  const included = []
  const blocked = []
  for (const record of rows) {
    const surface = options.surface || recordSurface(record)
    const diagnosticAllowed = surface === SYNTHESIS_CLAIM_SURFACES.actionRoutes.surface && !isDecisionGradeActionRoute(record)
    if (diagnosticAllowed || isSynthesisRecordVerified(record)) included.push(record)
    else blocked.push(record)
  }
  return {
    items: included,
    blocked,
    summary: {
      total: rows.length,
      included: included.length,
      blocked: blocked.length,
    },
  }
}

export function summarizeVerificationResults(results = []) {
  const counts = {
    total: results.length,
    verified: 0,
    partiallySupported: 0,
    unsupported: 0,
    contradicted: 0,
    stale: 0,
    blocked: 0,
  }
  for (const result of results) {
    if (result.status === 'verified') counts.verified += 1
    else if (result.status === 'partially_supported') counts.partiallySupported += 1
    else if (result.status === 'unsupported') counts.unsupported += 1
    else if (result.status === 'contradicted') counts.contradicted += 1
    else if (result.status === 'stale') counts.stale += 1
    else counts.blocked += 1
  }
  return counts
}
