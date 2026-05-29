export const SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID = 'SOURCE-EXTRACTION-STATE-LEDGER-001'
export const SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY = 'source-extraction-state-ledger-v1'
export const SOURCE_EXTRACTION_STATE_LEDGER_PLAN_PATH = 'docs/process/source-extraction-state-ledger-001-plan.md'
export const SOURCE_EXTRACTION_STATE_LEDGER_SCRIPT_PATH = 'scripts/process-source-extraction-state-ledger-check.mjs'
export const SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID = 'source-system:extraction-state-ledger:v1'

export const SOURCE_EXTRACTION_DISCOVERY_STATES = [
  { state: 'new', meaning: 'Known source item with a fingerprint not seen before.' },
  { state: 'known_unchanged', meaning: 'Known source item whose fingerprint has not changed since the prior snapshot.' },
  { state: 'changed', meaning: 'Known source item whose fingerprint changed and needs review.' },
  { state: 'discovered', meaning: 'Known source item without a source-specific delta classification yet.' },
]

export const SOURCE_EXTRACTION_CONTENT_STATES = [
  { state: 'metadata_mapped_content_not_extracted', meaning: 'The item is mapped by metadata/fingerprint, but body/video/content has not been extracted.' },
  { state: 'queued_or_pending', meaning: 'The item is queued, leased, not started, or waiting on an approved extraction path.' },
  { state: 'extracted_with_evidence', meaning: 'The item has a content-extraction artifact or explicit extracted proof.' },
  { state: 'archived_with_artifact', meaning: 'The item has an archive artifact, but not necessarily a content extraction.' },
  { state: 'skipped', meaning: 'The item was skipped with a reason.' },
  { state: 'blocked', meaning: 'The item is blocked by access, approval, retry exhaustion, or source boundary.' },
  { state: 'failed', meaning: 'The item failed and is not yet classified as blocked/skipped.' },
  { state: 'discovered_only', meaning: 'The item exists in the ledger but has no stronger extraction state.' },
]

export const SOURCE_EXTRACTION_REVIEW_STATES = [
  { state: 'unreviewed', meaning: 'No keep/ignore/implemented decision exists yet.' },
  { state: 'graded_keep', meaning: 'The item is useful and should remain eligible for Director/source review.' },
  { state: 'graded_ignore', meaning: 'The item is low value and should be suppressed unless it changes materially.' },
  { state: 'implemented_cleared', meaning: 'The useful idea has already been implemented, documented, or intentionally cleared.' },
]

const CONTENT_EXTRACTED_ITEM_TYPES = new Set([
  'drive_content_extraction',
  'video_content_extraction',
  'gmail_attachment',
])

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  return Number(value || 0)
}

function parseMetadata(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeDate(value) {
  const normalized = text(value)
  if (!normalized) return null
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function maxIsoDate(a, b) {
  const left = normalizeDate(a)
  const right = normalizeDate(b)
  if (!left) return right
  if (!right) return left
  return left >= right ? left : right
}

function increment(counts, key, amount = 1) {
  const normalizedKey = text(key) || 'unknown'
  counts[normalizedKey] = number(counts[normalizedKey]) + Number(amount || 0)
}

function hasAny(signal, phrases) {
  const normalized = lower(signal)
  return phrases.some(phrase => normalized.includes(lower(phrase)))
}

function normalizeTarget(row = {}) {
  return {
    targetKey: text(row.targetKey || row.target_key),
    sourceId: text(row.sourceId || row.source_id),
    title: text(row.title),
    lane: text(row.lane),
    targetType: text(row.targetType || row.target_type),
    status: text(row.status),
    priority: text(row.priority),
    runtimeMode: text(row.runtimeMode || row.runtime_mode),
    lastStatus: text(row.lastStatus || row.last_status),
    inspectedCount: number(row.inspectedCount || row.inspected_count),
    archivedCount: number(row.archivedCount || row.archived_count),
    extractedCount: number(row.extractedCount || row.extracted_count),
    metadata: parseMetadata(row.metadata),
    updatedAt: normalizeDate(row.updatedAt || row.updated_at),
  }
}

function normalizeItem(row = {}) {
  return {
    itemKey: text(row.itemKey || row.item_key),
    targetKey: text(row.targetKey || row.target_key),
    sourceId: text(row.sourceId || row.source_id),
    itemType: text(row.itemType || row.item_type),
    status: text(row.status),
    fingerprint: text(row.fingerprint),
    artifactId: text(row.artifactId || row.artifact_id),
    retryState: text(row.retryState || row.retry_state),
    retryBlockerCard: text(row.retryBlockerCard || row.retry_blocker_card),
    metadata: parseMetadata(row.metadata),
    discoveredAt: normalizeDate(row.discoveredAt || row.discovered_at),
    processedAt: normalizeDate(row.processedAt || row.processed_at),
    updatedAt: normalizeDate(row.updatedAt || row.updated_at),
  }
}

function metadataSignal(metadata = {}) {
  return [
    metadata.sourceState,
    metadata.extractionStatus,
    metadata.contentExtractionStatus,
    metadata.implementedStatus,
    metadata.reviewState,
    metadata.gradeState,
    metadata.skipReason,
    metadata.reason,
  ].map(text).join(' ')
}

export function classifySourceExtractionLedgerItem(row = {}, targetRow = {}) {
  const item = normalizeItem(row)
  const target = normalizeTarget(targetRow)
  const metadata = item.metadata || {}
  const signal = metadataSignal(metadata)
  const sourceState = lower(metadata.sourceState)
  const itemStatus = lower(item.status)
  const retryState = lower(item.retryState)
  const targetStatus = lower(target.status)
  const itemType = lower(item.itemType)

  let discoveryState = 'discovered'
  if (sourceState === 'new') discoveryState = 'new'
  if (sourceState === 'known_unchanged') discoveryState = 'known_unchanged'
  if (sourceState === 'changed') discoveryState = 'changed'

  let reviewState = 'unreviewed'
  if (hasAny(signal, ['implemented_cleared', 'implemented cleared'])) {
    reviewState = 'implemented_cleared'
  } else if (hasAny(signal, ['graded_ignore', 'ignored_or_cleared', 'review_ignore', 'ignore'])) {
    reviewState = 'graded_ignore'
  } else if (hasAny(signal, ['graded_keep', 'review_keep', 'keep'])) {
    reviewState = 'graded_keep'
  }

  let extractionState = 'discovered_only'
  if (
    sourceState === 'blocked_by_boundary' ||
    targetStatus === 'blocked' ||
    retryState === 'blocked' ||
    retryState === 'exhausted' ||
    hasAny(signal, ['blocked', 'approval_required', 'pending_approval'])
  ) {
    extractionState = 'blocked'
  } else if (itemStatus === 'skipped' || hasAny(signal, ['skipped'])) {
    extractionState = 'skipped'
  } else if (itemStatus === 'failed') {
    extractionState = 'failed'
  } else if (
    itemStatus === 'pending' ||
    itemStatus === 'leased' ||
    hasAny(signal, ['pending_', 'queued', 'not_started', 'needs_browser_gap_fill'])
  ) {
    extractionState = 'queued_or_pending'
  } else if (
    hasAny(signal, [
      'metadata_mapped_content_not_extracted',
      'metadata_only',
      'link_inventory_only',
      'source_link_inventory_only',
      'folder_discovered',
    ]) ||
    itemType.endsWith('_metadata')
  ) {
    extractionState = 'metadata_mapped_content_not_extracted'
  } else if (
    hasAny(signal, ['extracted_with_evidence']) ||
    (CONTENT_EXTRACTED_ITEM_TYPES.has(itemType) && item.artifactId && itemStatus === 'succeeded')
  ) {
    extractionState = 'extracted_with_evidence'
  } else if (item.artifactId && itemStatus === 'succeeded') {
    extractionState = 'archived_with_artifact'
  }

  return {
    targetKey: item.targetKey,
    sourceId: item.sourceId || target.sourceId,
    itemType: item.itemType,
    itemStatus: item.status,
    retryState: item.retryState,
    discoveryState,
    extractionState,
    reviewState,
    suppressedFromDirector: reviewState === 'graded_ignore' || reviewState === 'implemented_cleared',
    hasArtifact: Boolean(item.artifactId),
    hasFingerprint: Boolean(item.fingerprint),
    updatedAt: item.updatedAt,
  }
}

function emptyAggregate() {
  return {
    itemCount: 0,
    discoveryCounts: {},
    extractionCounts: {},
    reviewCounts: {},
    itemStatusCounts: {},
    retryStateCounts: {},
    itemTypeCounts: {},
    artifactItemCount: 0,
    fingerprintedItemCount: 0,
    suppressedFromDirectorCount: 0,
    directorCandidateCount: 0,
    latestItemUpdatedAt: null,
  }
}

function addClassification(aggregate, classification) {
  aggregate.itemCount += 1
  increment(aggregate.discoveryCounts, classification.discoveryState)
  increment(aggregate.extractionCounts, classification.extractionState)
  increment(aggregate.reviewCounts, classification.reviewState)
  increment(aggregate.itemStatusCounts, classification.itemStatus || 'unknown')
  increment(aggregate.retryStateCounts, classification.retryState || 'unknown')
  increment(aggregate.itemTypeCounts, classification.itemType || 'unknown')
  if (classification.hasArtifact) aggregate.artifactItemCount += 1
  if (classification.hasFingerprint) aggregate.fingerprintedItemCount += 1
  if (classification.suppressedFromDirector) aggregate.suppressedFromDirectorCount += 1
  if (
    !classification.suppressedFromDirector &&
    (
      classification.discoveryState === 'new' ||
      classification.discoveryState === 'changed' ||
      classification.reviewState === 'graded_keep'
    )
  ) {
    aggregate.directorCandidateCount += 1
  }
  aggregate.latestItemUpdatedAt = maxIsoDate(aggregate.latestItemUpdatedAt, classification.updatedAt)
}

function targetNextAction(targetSummary) {
  if (targetSummary.targetStatus === 'blocked' || number(targetSummary.extractionCounts.blocked) > 0) {
    return 'Resolve source boundary or exact approval blocker before extraction.'
  }
  if (number(targetSummary.discoveryCounts.changed) > 0 || number(targetSummary.discoveryCounts.new) > 0) {
    return 'Route new/changed source items to review before extracting more.'
  }
  if (number(targetSummary.extractionCounts.queued_or_pending) > 0) {
    return 'Run or clear the approved extraction queue.'
  }
  if (number(targetSummary.extractionCounts.metadata_mapped_content_not_extracted) > 0) {
    return 'Grade metadata-only items and approve exact packets for high-value content.'
  }
  if (number(targetSummary.extractionCounts.extracted_with_evidence) > 0) {
    return 'Keep extracted evidence available for Director and upgrade review.'
  }
  return 'Monitor for deltas.'
}

export function buildSourceExtractionStateLedger({
  targets = [],
  items = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedTargets = list(targets).map(normalizeTarget).filter(target => target.targetKey)
  const normalizedItems = list(items).map(normalizeItem).filter(item => item.targetKey)
  const targetByKey = new Map(normalizedTargets.map(target => [target.targetKey, target]))
  const targetAggregates = new Map()
  const sourceAggregates = new Map()
  const overall = emptyAggregate()

  for (const target of normalizedTargets) {
    targetAggregates.set(target.targetKey, {
      targetKey: target.targetKey,
      sourceId: target.sourceId,
      title: target.title,
      lane: target.lane,
      targetType: target.targetType,
      targetStatus: target.status,
      runtimeMode: target.runtimeMode,
      lastStatus: target.lastStatus,
      inspectedCount: target.inspectedCount,
      archivedCount: target.archivedCount,
      extractedCount: target.extractedCount,
      ...emptyAggregate(),
    })
  }

  for (const item of normalizedItems) {
    const target = targetByKey.get(item.targetKey) || {}
    const classification = classifySourceExtractionLedgerItem(item, target)
    const targetSummary = targetAggregates.get(item.targetKey) || {
      targetKey: item.targetKey,
      sourceId: classification.sourceId,
      title: item.targetKey,
      lane: '',
      targetType: '',
      targetStatus: '',
      runtimeMode: '',
      lastStatus: '',
      inspectedCount: 0,
      archivedCount: 0,
      extractedCount: 0,
      ...emptyAggregate(),
    }
    targetAggregates.set(item.targetKey, targetSummary)
    addClassification(targetSummary, classification)
    addClassification(overall, classification)

    const sourceId = classification.sourceId || 'unknown'
    const sourceSummary = sourceAggregates.get(sourceId) || {
      sourceId,
      targetCount: 0,
      targetKeys: new Set(),
      ...emptyAggregate(),
    }
    sourceSummary.targetKeys.add(item.targetKey)
    addClassification(sourceSummary, classification)
    sourceAggregates.set(sourceId, sourceSummary)
  }

  const targetSummaries = Array.from(targetAggregates.values())
    .map(target => ({
      ...target,
      nextAction: targetNextAction(target),
    }))
    .sort((a, b) => b.itemCount - a.itemCount || a.targetKey.localeCompare(b.targetKey))
  const sourceSummaries = Array.from(sourceAggregates.values())
    .map(source => ({
      ...source,
      targetKeys: Array.from(source.targetKeys).sort(),
      targetCount: source.targetKeys.size,
    }))
    .sort((a, b) => b.itemCount - a.itemCount || a.sourceId.localeCompare(b.sourceId))

  const myicorTarget = targetSummaries.find(target => target.targetKey === 'myicor-mcp-catalog-snapshot-v1') || null
  const myicorSource = sourceSummaries.find(source => source.sourceId === 'SRC-MYICRO-001') || null
  const suppressedCount =
    number(overall.reviewCounts.graded_ignore) +
    number(overall.reviewCounts.implemented_cleared)

  return {
    schemaVersion: 1,
    generatedAt,
    cardId: SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
    closeoutKey: SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
    reportArtifactId: SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
    taxonomy: {
      discoveryStates: SOURCE_EXTRACTION_DISCOVERY_STATES,
      contentStates: SOURCE_EXTRACTION_CONTENT_STATES,
      reviewStates: SOURCE_EXTRACTION_REVIEW_STATES,
    },
    guardrails: {
      readOnlyByDefault: true,
      writesSourceRows: false,
      deletesSourceRows: false,
      writesAtomsOrVectors: false,
      externalWritesAllowed: false,
      browserStarted: false,
      rawContentIncluded: false,
      itemRowsIncludedInReport: false,
    },
    summary: {
      targetCount: normalizedTargets.length,
      sourceCount: sourceSummaries.length,
      itemCount: overall.itemCount,
      artifactItemCount: overall.artifactItemCount,
      fingerprintedItemCount: overall.fingerprintedItemCount,
      metadataMappedNotExtractedCount: number(overall.extractionCounts.metadata_mapped_content_not_extracted),
      queuedOrPendingCount: number(overall.extractionCounts.queued_or_pending),
      extractedWithEvidenceCount: number(overall.extractionCounts.extracted_with_evidence),
      archivedWithArtifactCount: number(overall.extractionCounts.archived_with_artifact),
      blockedCount: number(overall.extractionCounts.blocked),
      skippedCount: number(overall.extractionCounts.skipped),
      failedCount: number(overall.extractionCounts.failed),
      newCount: number(overall.discoveryCounts.new),
      changedCount: number(overall.discoveryCounts.changed),
      knownUnchangedCount: number(overall.discoveryCounts.known_unchanged),
      gradedKeepCount: number(overall.reviewCounts.graded_keep),
      gradedIgnoreCount: number(overall.reviewCounts.graded_ignore),
      implementedClearedCount: number(overall.reviewCounts.implemented_cleared),
      suppressedFromDirectorCount: suppressedCount,
      directorCandidateCount: overall.directorCandidateCount,
      latestItemUpdatedAt: overall.latestItemUpdatedAt,
      myicorMappedCount: number(myicorTarget?.itemCount),
      myicorNotExtractedCount: number(myicorTarget?.extractionCounts?.metadata_mapped_content_not_extracted),
      myicorExtractedCount: number(myicorTarget?.extractionCounts?.extracted_with_evidence),
      myicorSourceItemCount: number(myicorSource?.itemCount),
      myicorSourceExtractedWithEvidenceCount: number(myicorSource?.extractionCounts?.extracted_with_evidence),
      myicorSourceGradedKeepCount: number(myicorSource?.reviewCounts?.graded_keep),
    },
    overall,
    targetSummaries,
    sourceSummaries,
    directorRouting: {
      candidateRule: 'new + changed + graded_keep, excluding graded_ignore and implemented_cleared',
      directorCandidateCount: overall.directorCandidateCount,
      suppressedFromDirectorCount: suppressedCount,
      suppressionIsReversible: true,
      suppressionDoesNotDeleteHistory: true,
    },
    nextCards: [
      'SKOOL-SOURCE-SYSTEM-MAP-001',
      'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
      'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
      'BUILDER-MEMORY-SYSTEM-001',
    ],
  }
}

function stateList(definitions = []) {
  return list(definitions).map(row => row.state)
}

function includesAll(values = [], required = []) {
  const set = new Set(values)
  return required.every(value => set.has(value))
}

export function buildSourceExtractionStateLedgerFixtureInput() {
  const targets = [
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', title: 'Fixture source map', status: 'planned', runtimeMode: 'manual' },
    { targetKey: 'fixture-content', sourceId: 'SRC-VIDEO-001', title: 'Fixture content extraction', status: 'active', runtimeMode: 'manual' },
    { targetKey: 'fixture-blocked', sourceId: 'SRC-SKOOL-001', title: 'Fixture blocked source', status: 'blocked', runtimeMode: 'paused' },
  ]
  const items = [
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', itemKey: 'i-new', itemType: 'public_youtube_video_candidate', status: 'succeeded', fingerprint: 'a', artifactId: 'artifact-a', metadata: { sourceState: 'new' } },
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', itemKey: 'i-changed', itemType: 'myicor_lesson_metadata', status: 'succeeded', fingerprint: 'b', artifactId: 'artifact-b', metadata: { sourceState: 'changed', extractionStatus: 'metadata_mapped_content_not_extracted' } },
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', itemKey: 'i-known', itemType: 'myicor_lesson_metadata', status: 'succeeded', fingerprint: 'c', artifactId: 'artifact-c', metadata: { sourceState: 'known_unchanged', extractionStatus: 'metadata_mapped_content_not_extracted' } },
    { targetKey: 'fixture-content', sourceId: 'SRC-VIDEO-001', itemKey: 'i-queued', itemType: 'video_link', status: 'pending', fingerprint: 'd', metadata: { extractionStatus: 'pending_public_or_authorized_video_review' } },
    { targetKey: 'fixture-content', sourceId: 'SRC-VIDEO-001', itemKey: 'i-extracted', itemType: 'video_content_extraction', status: 'succeeded', artifactId: 'artifact-e', metadata: { extractionStatus: 'extracted_with_evidence', reviewState: 'graded_keep' } },
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', itemKey: 'i-ignore', itemType: 'artifact', status: 'succeeded', fingerprint: 'f', metadata: { sourceState: 'graded_ignore' } },
    { targetKey: 'fixture-source-map', sourceId: 'SRC-YOUTUBE-INTEL-001', itemKey: 'i-cleared', itemType: 'artifact', status: 'succeeded', fingerprint: 'g', metadata: { sourceState: 'implemented_cleared' } },
    { targetKey: 'fixture-blocked', sourceId: 'SRC-SKOOL-001', itemKey: 'i-blocked', itemType: 'artifact', status: 'skipped', metadata: { sourceState: 'blocked_by_boundary', extractionStatus: 'blocked_pending_source_auth_approval' } },
  ]
  return { targets, items }
}

export function evaluateSourceExtractionStateLedger(ledger = {}, { requireMyicor = false } = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const discoveryStates = stateList(ledger.taxonomy?.discoveryStates)
  const contentStates = stateList(ledger.taxonomy?.contentStates)
  const reviewStates = stateList(ledger.taxonomy?.reviewStates)
  const myicorTarget = list(ledger.targetSummaries).find(target => target.targetKey === 'myicor-mcp-catalog-snapshot-v1') || null

  add(includesAll(discoveryStates, ['new', 'known_unchanged', 'changed', 'discovered']), 'taxonomy covers discovery/delta states', discoveryStates.join(', '))
  add(includesAll(contentStates, ['metadata_mapped_content_not_extracted', 'queued_or_pending', 'extracted_with_evidence', 'blocked']), 'taxonomy covers extraction lifecycle states', contentStates.join(', '))
  add(includesAll(reviewStates, ['unreviewed', 'graded_keep', 'graded_ignore', 'implemented_cleared']), 'taxonomy covers review and suppression states', reviewStates.join(', '))
  add(ledger.guardrails?.readOnlyByDefault === true && ledger.guardrails?.writesSourceRows === false && ledger.guardrails?.writesAtomsOrVectors === false, 'ledger is read-only by default and does not write source rows or atoms', JSON.stringify(ledger.guardrails || {}))
  add(number(ledger.summary?.itemCount) > 0, 'ledger includes source crawl items', String(ledger.summary?.itemCount || 0))
  add(number(ledger.summary?.targetCount) > 0, 'ledger includes source crawl targets', String(ledger.summary?.targetCount || 0))
  add(ledger.directorRouting?.suppressionDoesNotDeleteHistory === true && ledger.directorRouting?.suppressionIsReversible === true, 'Director suppression is reversible and does not delete history', JSON.stringify(ledger.directorRouting || {}))
  if (requireMyicor) {
    add(Boolean(myicorTarget), 'ledger includes MyICOR MCP catalog target', 'myicor-mcp-catalog-snapshot-v1')
    add(number(myicorTarget?.itemCount) >= 296, 'MyICOR ledger has full catalog metadata rows', String(myicorTarget?.itemCount || 0))
    add(number(myicorTarget?.extractionCounts?.metadata_mapped_content_not_extracted) >= 296, 'MyICOR rows remain metadata-mapped and not content-extracted', String(myicorTarget?.extractionCounts?.metadata_mapped_content_not_extracted || 0))
    add(number(myicorTarget?.extractionCounts?.extracted_with_evidence) === 0, 'MyICOR content extraction count remains zero', String(myicorTarget?.extractionCounts?.extracted_with_evidence || 0))
  }
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, checks, failed }
}

export function buildSourceExtractionStateLedgerDogfoodProof() {
  const ledger = buildSourceExtractionStateLedger(buildSourceExtractionStateLedgerFixtureInput())
  const summary = ledger.summary || {}
  const ok =
    number(summary.newCount) >= 1 &&
    number(summary.changedCount) >= 1 &&
    number(summary.knownUnchangedCount) >= 1 &&
    number(summary.metadataMappedNotExtractedCount) >= 1 &&
    number(summary.queuedOrPendingCount) >= 1 &&
    number(summary.extractedWithEvidenceCount) >= 1 &&
    number(summary.gradedKeepCount) >= 1 &&
    number(summary.gradedIgnoreCount) >= 1 &&
    number(summary.implementedClearedCount) >= 1 &&
    number(summary.blockedCount) >= 1 &&
    number(summary.suppressedFromDirectorCount) === 2 &&
    number(summary.directorCandidateCount) === 3
  return {
    ok,
    summary,
    dogfoodInvariant: ok
      ? 'fixture proves new/changed/known, metadata-mapped, queued, extracted, keep, ignore, implemented-cleared, and blocked states while suppressing ignored/cleared items from Director candidates'
      : 'fixture did not exercise every required source extraction state',
  }
}

export function buildSourceExtractionStateLedgerReportArtifact(ledger = {}) {
  const summary = ledger.summary || {}
  return {
    reportArtifactId: SOURCE_EXTRACTION_STATE_LEDGER_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: 'source-extraction-state-ledger-v1',
    department: 'foundation',
    title: 'Source Extraction State Ledger V1',
    status: 'generated',
    sourceIds: list(ledger.sourceSummaries).map(row => row.sourceId).filter(Boolean),
    sourceCoverage: list(ledger.sourceSummaries).map(row => ({
      sourceId: row.sourceId,
      targetCount: row.targetCount,
      itemCount: row.itemCount,
      metadataMappedNotExtractedCount: number(row.extractionCounts?.metadata_mapped_content_not_extracted),
      queuedOrPendingCount: number(row.extractionCounts?.queued_or_pending),
      extractedWithEvidenceCount: number(row.extractionCounts?.extracted_with_evidence),
      blockedCount: number(row.extractionCounts?.blocked),
      suppressedFromDirectorCount: number(row.suppressedFromDirectorCount),
    })),
    topFindings: [
      {
        title: 'Source items are now represented by a shared state ledger.',
        detail: `${number(summary.itemCount)} items across ${number(summary.targetCount)} targets.`,
      },
      {
        title: 'MyICOR catalog stays metadata-only while exact approved packets can add evidence.',
        detail: `${number(summary.myicorMappedCount)} catalog rows, ${number(summary.myicorExtractedCount)} catalog-extracted rows, ${number(summary.myicorSourceExtractedWithEvidenceCount)} MyICOR source-wide extracted evidence rows.`,
      },
      {
        title: 'Director suppression is modeled but not auto-applied.',
        detail: `${number(summary.suppressedFromDirectorCount)} suppressed items; ${number(summary.directorCandidateCount)} candidate items by current rule.`,
      },
    ],
    actionRequiredItems: [
      {
        cardId: 'SKOOL-SOURCE-SYSTEM-MAP-001',
        action: 'Use this ledger taxonomy for approved Skool source maps before broad extraction.',
      },
      {
        cardId: 'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
        action: 'Feed new/changed/kept items into Director and suppress ignored/implemented-cleared items without deleting history.',
      },
      {
        cardId: 'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
        action: 'Expose target/source state counts in the Dev page system truth view.',
      },
    ],
    openQuestions: [
      {
        question: 'Which Skool community should be the first exact approved source packet using this state ledger?',
        blockerCardId: 'SKOOL-SOURCE-SYSTEM-MAP-001',
      },
    ],
    structuredOutputJson: {
      cardId: SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
      closeoutKey: SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
      generatedAt: ledger.generatedAt,
      taxonomy: ledger.taxonomy,
      guardrails: ledger.guardrails,
      summary: ledger.summary,
      directorRouting: ledger.directorRouting,
      targetSummaries: list(ledger.targetSummaries).map(target => ({
        targetKey: target.targetKey,
        sourceId: target.sourceId,
        title: target.title,
        lane: target.lane,
        targetType: target.targetType,
        targetStatus: target.targetStatus,
        runtimeMode: target.runtimeMode,
        itemCount: target.itemCount,
        discoveryCounts: target.discoveryCounts,
        extractionCounts: target.extractionCounts,
        reviewCounts: target.reviewCounts,
        suppressedFromDirectorCount: target.suppressedFromDirectorCount,
        directorCandidateCount: target.directorCandidateCount,
        latestItemUpdatedAt: target.latestItemUpdatedAt,
        nextAction: target.nextAction,
      })),
      sourceSummaries: list(ledger.sourceSummaries).map(source => ({
        sourceId: source.sourceId,
        targetCount: source.targetCount,
        itemCount: source.itemCount,
        discoveryCounts: source.discoveryCounts,
        extractionCounts: source.extractionCounts,
        reviewCounts: source.reviewCounts,
        suppressedFromDirectorCount: source.suppressedFromDirectorCount,
        directorCandidateCount: source.directorCandidateCount,
      })),
      nextCards: ledger.nextCards,
    },
    metadata: {
      cardId: SOURCE_EXTRACTION_STATE_LEDGER_CARD_ID,
      closeoutKey: SOURCE_EXTRACTION_STATE_LEDGER_CLOSEOUT_KEY,
      writesSourceRows: false,
      writesAtomsOrVectors: false,
      externalWritesAllowed: false,
      browserStarted: false,
      rawContentIncluded: false,
    },
  }
}
