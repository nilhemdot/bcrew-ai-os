import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCombinedFoundationStylesheet } from './foundation-stylesheet-monolith-split.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const SOURCE_LIFECYCLE_SCHEMA_VERSION = 1
export const SOURCE_LIFECYCLE_CARD_ID = 'SOURCE-LIFECYCLE-EXPANSION-001'
export const SOURCE_LIFECYCLE_CLOSEOUT_KEY = 'source-lifecycle-expansion-v1'
export const SOURCE_LIFECYCLE_ROUTE = '/foundation#source-lifecycle'
export const SOURCE_LIFECYCLE_API_PATH = '/api/foundation/source-lifecycle'
export const SOURCE_LIFECYCLE_APPROVED_PLAN_PATH = 'docs/process/approved-plans/source-lifecycle-expansion-v1.md'
export const SOURCE_LIFECYCLE_APPROVAL_PATH = 'docs/process/approvals/SOURCE-LIFECYCLE-EXPANSION-001.json'
export const SOURCE_LIFECYCLE_BASELINE_PATH = 'docs/audits/2026-04-30-source-lifecycle-expansion-baseline.md'
export const SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-source-lifecycle-expansion-manual-review.md'

export const SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS = [
  'SRC-GMAIL-001',
  'SRC-GCAL-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-SLACK-001',
  'SRC-GDRIVE-001',
  'SRC-VIDEO-001',
  'SRC-YOUTUBE-INTEL-001',
  'SRC-SKOOL-001',
  'SRC-LOOM-001',
  'SRC-MYICRO-001',
  'SRC-CREATOR-WATCHLIST-001',
]

export const SOURCE_LIFECYCLE_EXCLUDED_LANES = [
  'Strategy Hub activation',
  'Scoper',
  'Agent Factory',
  'broad corpus expansion',
  'Action Review applying',
  'research cleanup',
  'Missive attachment implementation',
  'Drive Slides/Office/shortcut/media/OCR expansion',
  'Loom/Skool/Mycro crawler or browser extraction',
  'YouTube scout/discovery/Gemini video analysis',
  'Google Ads/publishing/reviews/training/content connector buildout',
]

export const SOURCE_LIFECYCLE_RELEVANT_SYSTEM_IDS = [
  'SYS-CORPUS-INTEL-001',
  'SYS-DRIVE-CORPUS-001',
  'SYS-VIDEO-GODMODE-001',
  'SYS-MEETING-INTEL-001',
  'SYS-MARKETING-SOURCES-001',
  'SYS-SOURCE-TRUTH-001',
]

export const SOURCE_LIFECYCLE_DEFINITIONS = [
  {
    key: 'connected',
    label: 'Connected',
    definition: 'A connector, source path, or governed source contract exists and is source-backed.',
  },
  {
    key: 'verified',
    label: 'Verified',
    definition: 'A trusted unit, validation boundary, or readable-source status is documented with a source ID.',
  },
  {
    key: 'extracted',
    label: 'Extracted',
    definition: 'An existing governed extraction target or job has archived/extracted evidence with provenance and caps.',
  },
  {
    key: 'reviewed',
    label: 'Reviewed',
    definition: 'The lane is signed off, readable-only, explicitly needs review, or routes review through a documented source note.',
  },
  {
    key: 'retry',
    label: 'Retry',
    definition: 'Failures and skips have a reason plus an existing retry path or an explicit not-built/parked state.',
  },
  {
    key: 'parked',
    label: 'Parked',
    definition: 'The lane is scoped, blocked, paused, planned, or a known gap with reason and next action; no new extraction starts here.',
  },
]

export const SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE = {
  'drive-content-extract-backfill': {
    sourceId: 'SRC-GDRIVE-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      dailyMissionQuota: 5,
      llmBudget: 'none_for_archive',
      maxItemsPerRun: 5,
      maxRuntimeSeconds: 3900,
      maxTextChars: 250000,
      maxPdfBytes: 80000000,
      maxSheets: 8,
      maxSheetRows: 200,
      maxSheetColumns: 26,
      requiresFiledOutput: true,
    },
  },
  'email-attachments-backfill': {
    sourceId: 'SRC-GMAIL-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      dailyMissionQuota: 5,
      llmBudget: 'none_for_archive',
      maxItemsPerRun: 5,
      maxRuntimeSeconds: 3900,
      maxAttachmentBytes: 80000000,
      maxTextChars: 250000,
      requiresFiledOutput: true,
    },
  },
  'video-content-extract-backfill': {
    sourceId: 'SRC-VIDEO-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      dailyMissionQuota: 5,
      llmBudget: 'dataforseo_then_multimodal',
      maxItemsPerRun: 5,
      maxRuntimeSeconds: 3900,
      maxTextChars: 250000,
      requiresFiledOutput: true,
    },
  },
  'gmail-current-day': {
    sourceId: 'SRC-GMAIL-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 25,
      maxRuntimeSeconds: 900,
    },
  },
  'calendar-current-day': {
    sourceId: 'SRC-GCAL-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 50,
      maxRuntimeSeconds: 600,
    },
  },
  'meetings-current-day': {
    sourceId: 'SRC-MEETINGS-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 50,
      maxRuntimeSeconds: 900,
    },
  },
  'missive-current-day': {
    sourceId: 'SRC-MISSIVE-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 100,
      maxRuntimeSeconds: 900,
    },
  },
  'drive-corpus-backfill': {
    sourceId: 'SRC-GDRIVE-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      dailyMissionQuota: 1,
      llmBudget: 'limited_after_archive',
      maxItemsPerRun: 100,
      maxFoldersPerRun: 1,
      maxRuntimeSeconds: 1200,
    },
  },
  'old-system-report-mining': {
    sourceId: 'SRC-GDRIVE-001',
    status: 'planned',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      dailyMissionQuota: 10,
      llmBudget: 'limited',
      maxItemsPerRun: 10,
      maxRuntimeSeconds: 900,
      requiresFiledOutput: true,
    },
  },
  'video-link-inventory': {
    sourceId: 'SRC-VIDEO-001',
    status: 'planned',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      dailyMissionQuota: 1000,
      llmBudget: 'none',
      maxArtifactsPerRun: 1000,
      maxRuntimeSeconds: 900,
    },
  },
  'slack-current-day': {
    sourceId: 'SRC-SLACK-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 100,
      maxRuntimeSeconds: 600,
    },
  },
  'skool-corpus-backfill': {
    sourceId: 'SRC-SKOOL-001',
    status: 'blocked',
    runtimeMode: 'paused',
    schedulerMode: 'paused',
    budget: {
      dailyMissionQuota: 5,
      llmBudget: 'limited_after_access',
      maxItemsPerRun: 25,
      maxRuntimeSeconds: 900,
      requiresFiledOutput: true,
    },
  },
  'zoom-audio-recovery-backfill': {
    sourceId: 'SRC-MEETINGS-001',
    status: 'paused',
    runtimeMode: 'paused',
    schedulerMode: 'paused',
    budget: {
      dailyMissionQuota: 5,
      llmBudget: 'transcription_api_or_local',
      maxFilesPerRun: 5,
      maxRuntimeSeconds: 1800,
      requiresFiledOutput: true,
    },
  },
  'karpathy-kb-video-pack': {
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    status: 'blocked',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      llmBudget: 'none_until_steve_approves_no_auth_no_paid_run',
      maxItemsPerRun: 3,
      maxRuntimeSeconds: 900,
      requiresFiledOutput: true,
    },
  },
  'youtube-creator-daily-watch': {
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    status: 'active',
    runtimeMode: 'scheduled',
    schedulerMode: 'scheduled',
    budget: {
      llmBudget: 'none',
      dailyMissionQuota: 1,
      maxItemsPerRun: 26,
      maxRuntimeSeconds: 1800,
      maxCreatorsPerRun: 26,
      maxVideosPerCreator: 50,
      markBaselineDepth: 50,
      defaultBaselineDepth: 20,
      publicNoAuthOnly: true,
    },
  },
  'mark-claude-code-living-course-public': {
    sourceId: 'SRC-CREATOR-WATCHLIST-001',
    status: 'planned',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxPagesPerRun: 1,
      maxRuntimeSeconds: 60,
      noAuth: true,
      noExternalWrites: true,
    },
  },
  'mark-claudeclaw-roadmap-public': {
    sourceId: 'SRC-CREATOR-WATCHLIST-001',
    status: 'planned',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxPagesPerRun: 1,
      maxApiCallsPerRun: 1,
      maxRuntimeSeconds: 60,
      noAuth: true,
      noExternalWrites: true,
    },
  },
  'mark-skool-premium-recordings': {
    sourceId: 'SRC-SKOOL-001',
    status: 'blocked',
    runtimeMode: 'paused',
    schedulerMode: 'paused',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxRuntimeSeconds: 1,
      noAuth: false,
      noCrawlUntilApproved: true,
      noExternalWrites: true,
    },
  },
  'mark-skool-claudeclaw-classroom': {
    sourceId: 'SRC-SKOOL-001',
    status: 'blocked',
    runtimeMode: 'paused',
    schedulerMode: 'paused',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxRuntimeSeconds: 1,
      noAuth: false,
      noCrawlUntilApproved: true,
      noExternalWrites: true,
    },
  },
  'mark-claudeclaw-os-private-github': {
    sourceId: 'SRC-GITHUB-BUILD-INTEL-001',
    status: 'blocked',
    runtimeMode: 'paused',
    schedulerMode: 'paused',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxRuntimeSeconds: 1,
      noCrawlUntilApproved: true,
      noExternalWrites: true,
      noTokenStorage: true,
    },
  },
  'kia-ai-automations-skool-community-public-check': {
    sourceId: 'SRC-SKOOL-001',
    status: 'planned',
    runtimeMode: 'manual',
    schedulerMode: 'manual',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 1,
      maxPagesPerRun: 1,
      maxRuntimeSeconds: 60,
      noAuth: true,
      noExternalWrites: true,
      noCrawlUntilApproved: true,
    },
  },
}

export const SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT = Object.keys(SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE).length

const privatePathPattern = /(^|\/)(MEMORY\.md|USER\.md|IDENTITY\.md|TOOLS\.md|HEARTBEAT\.md|memory\/)/i
const rawContentKeyPattern = /(body|content|text|transcript|raw|html|markdown|snippet|subject|message)/i

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function byKey(values, key) {
  return new Map((values || []).map(value => [value?.[key], value]).filter(([itemKey]) => Boolean(itemKey)))
}

function addCount(counts, key) {
  counts[key] = (counts[key] || 0) + 1
}

function safeEvidenceRef(value) {
  const ref = normalizeText(value)
  if (!ref) return ''
  if (privatePathPattern.test(ref)) {
    const name = ref.split('/').pop() || 'private-local-doc'
    return `private-local-doc:${name}:metadata-only`
  }
  return ref
}

function getBudgetCaps(budget = {}) {
  const allowedKeys = [
    'dailyMissionQuota',
    'llmBudget',
    'maxItemsPerRun',
    'maxRuntimeSeconds',
    'maxCreatorsPerRun',
    'maxVideosPerCreator',
    'markBaselineDepth',
    'defaultBaselineDepth',
    'publicNoAuthOnly',
    'maxTextChars',
    'maxPdfBytes',
    'maxSheets',
    'maxSheetRows',
    'maxSheetColumns',
    'maxAttachmentBytes',
    'maxFoldersPerRun',
    'maxArtifactsPerRun',
    'maxFilesPerRun',
    'maxPagesPerRun',
    'maxApiCallsPerRun',
    'noAuth',
    'noExternalWrites',
    'noCrawlUntilApproved',
    'noTokenStorage',
    'requiresFiledOutput',
  ]
  return allowedKeys.reduce((acc, key) => {
    if (budget && Object.prototype.hasOwnProperty.call(budget, key)) acc[key] = budget[key]
    return acc
  }, {})
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function sameValue(a, b) {
  return JSON.stringify(stableValue(a)) === JSON.stringify(stableValue(b))
}

function compareTargetBaselines(targets = []) {
  const targetMap = byKey(targets, 'targetKey')
  const changes = []
  const missingTargetKeys = []
  const extraTargetKeys = []
  for (const [targetKey, expected] of Object.entries(SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE)) {
    const target = targetMap.get(targetKey)
    if (!target) {
      missingTargetKeys.push(targetKey)
      changes.push({ targetKey, field: 'target', expected: 'present', actual: 'missing' })
      continue
    }
    const schedulerMode = target.schedulerMode || target.scheduler?.runtimeMode || null
    for (const field of ['sourceId', 'status', 'runtimeMode']) {
      if (target[field] !== expected[field]) {
        changes.push({ targetKey, field, expected: expected[field], actual: target[field] })
      }
    }
    if (schedulerMode !== expected.schedulerMode) {
      changes.push({ targetKey, field: 'schedulerMode', expected: expected.schedulerMode, actual: schedulerMode })
    }
    const actualBudget = target.budgetCaps || getBudgetCaps(target.budget || {})
    if (!sameValue(actualBudget, expected.budget)) {
      changes.push({ targetKey, field: 'budget', expected: expected.budget, actual: actualBudget })
    }
  }
  const expectedKeys = new Set(Object.keys(SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE))
  for (const target of targets || []) {
    if (!expectedKeys.has(target.targetKey)) extraTargetKeys.push(target.targetKey)
  }
  return {
    ok: changes.length === 0 && extraTargetKeys.length === 0,
    changes,
    missingTargetKeys,
    extraTargetKeys,
  }
}

function getContractPresence(contract = {}) {
  const status = normalizeText(contract.status).toLowerCase()
  const validation = normalizeText(contract.validation).toLowerCase()
  if (validation === 'signed off' || validation === 'signed off for current reality' || status === 'signed off') return 'signed_off'
  if (validation === 'readable only' || status.includes('verified readable') || status.includes('verified')) return 'readable'
  if (status.includes('current reality') || status.includes('boundary locked')) return 'verified'
  if (status.includes('pending') || status.includes('scoped')) return 'pending'
  if (status.includes('gap') || status.includes('not connected')) return 'gap'
  return 'unknown'
}

function getTargetStage(target = {}) {
  if (target.status === 'blocked' || target.runtimeMode === 'paused') return 'parked'
  if (target.status === 'planned') return 'parked'
  if (Number(target.extractedCount || 0) > 0 || Number(target.itemSummary?.succeededItems || 0) > 0) return 'extracted'
  if (Number(target.archivedCount || 0) > 0 || Number(target.inspectedCount || 0) > 0) return 'connected'
  if (target.status === 'active') return 'verified'
  return 'parked'
}

function getSourceStage(contract, targets, jobs) {
  const presence = getContractPresence(contract)
  if (targets.some(target => getTargetStage(target) === 'extracted')) return 'extracted'
  if (targets.some(target => getTargetStage(target) === 'connected')) return 'connected'
  if (targets.some(target => target.status === 'active')) return 'verified'
  if (presence === 'signed_off') return 'reviewed'
  if (presence === 'readable' || presence === 'verified') return 'verified'
  if (presence === 'pending' && (targets.length || jobs.length)) return 'connected'
  return 'parked'
}

function getStatusForStage(stage) {
  if (stage === 'extracted' || stage === 'reviewed') return 'connected'
  if (stage === 'connected' || stage === 'verified') return 'planned'
  if (stage === 'parked') return 'pending'
  return 'pending'
}

function summarizeTargetReasons(target = {}) {
  return normalizeList(target.itemSummary?.reasons).slice(0, 8).map(reason => ({
    status: normalizeText(reason.status),
    reason: normalizeText(reason.reason),
    count: Number(reason.count || 0),
    latestUpdatedAt: reason.latestUpdatedAt || null,
  }))
}

function buildTargetEvidence(target = {}, jobs = []) {
  return unique([
    `target:${target.targetKey}`,
    `source:${target.sourceId}`,
    target.targetType ? `target_type:${target.targetType}` : '',
    ...jobs.filter(job => normalizeList(job.sourceIds).includes(target.sourceId))
      .slice(0, 4)
      .map(job => `job:${job.key}`),
  ].map(safeEvidenceRef))
}

function sanitizeTarget(target = {}, jobs = []) {
  const stage = getTargetStage(target)
  const parkedReason = ['blocked', 'paused', 'planned'].includes(target.status) || target.runtimeMode === 'paused'
    ? `${target.status || 'unknown'} / ${target.runtimeMode || 'unknown'}`
    : ''
  return {
    targetKey: target.targetKey,
    sourceId: target.sourceId,
    title: target.title,
    lane: target.lane,
    targetType: target.targetType,
    priority: target.priority,
    status: target.status,
    runtimeMode: target.runtimeMode,
    schedulerMode: target.scheduler?.runtimeMode || null,
    scheduleStatus: target.scheduler?.scheduleStatus || null,
    lifecycleStage: stage,
    parkedReason,
    counts: {
      inspected: Number(target.inspectedCount || 0),
      archived: Number(target.archivedCount || 0),
      extracted: Number(target.extractedCount || 0),
      totalItems: Number(target.itemSummary?.totalItems || 0),
      succeededItems: Number(target.itemSummary?.succeededItems || 0),
      failedItems: Number(target.itemSummary?.failedItems || 0),
      skippedItems: Number(target.itemSummary?.skippedItems || 0),
    },
    budgetCaps: getBudgetCaps(target.budget || {}),
    reasonSummary: summarizeTargetReasons(target),
    evidenceRefs: buildTargetEvidence(target, jobs),
  }
}

function buildLifecycleFlags(contract, targets, jobs) {
  const presence = getContractPresence(contract)
  const extracted = targets.some(target =>
    Number(target.extractedCount || 0) > 0 ||
      Number(target.archivedCount || 0) > 0 ||
      Number(target.itemSummary?.succeededItems || 0) > 0
  )
  const hasSkipsOrFailures = targets.some(target =>
    Number(target.itemSummary?.failedItems || 0) > 0 ||
      Number(target.itemSummary?.skippedItems || 0) > 0 ||
      normalizeList(target.itemSummary?.reasons).length > 0
  )
  const parkedTargets = targets.filter(target =>
    ['blocked', 'paused', 'planned'].includes(target.status) || target.runtimeMode === 'paused'
  )
  const verified = ['signed_off', 'readable', 'verified'].includes(presence)
  const connected = verified || targets.length > 0 || jobs.length > 0
  const reviewed = ['signed_off', 'readable'].includes(presence)
  const parked = presence === 'gap' || presence === 'pending' || parkedTargets.length > 0
  return {
    connected: connected ? 'yes' : 'no',
    verified: verified ? 'yes' : 'needs-review',
    extracted: extracted ? 'yes' : (targets.length ? 'not-yet' : 'no-target'),
    reviewed: reviewed ? 'yes' : 'needs-review',
    retry: hasSkipsOrFailures ? 'classified' : 'not-needed',
    parked: parked ? 'yes' : 'no',
  }
}

function buildSourceLifecycle(contract, targets, jobs, groupedSystems) {
  const sourceId = contract.sourceId
  const stage = getSourceStage(contract, targets, jobs)
  const sourceSystems = groupedSystems
    .filter(system => normalizeList(system.sourceIds).includes(sourceId))
    .map(system => system.systemId)
  const noTargetReason = targets.length
    ? ''
    : (getContractPresence(contract) === 'gap' || getContractPresence(contract) === 'pending'
      ? 'No governed extraction target exists yet; source remains parked or connection-scoped.'
      : 'No extraction target is required for this source contract right now.')
  const evidenceRefs = unique([
    `source:${sourceId}`,
    ...targets.slice(0, 4).map(target => `target:${target.targetKey}`),
    ...jobs.slice(0, 4).map(job => `job:${job.key}`),
    ...sourceSystems.slice(0, 3).map(systemId => `system:${systemId}`),
  ].map(safeEvidenceRef))
  return {
    sourceId,
    title: contract.title,
    status: contract.status,
    validation: contract.validation,
    owner: contract.owner || 'System',
    lifecycleStage: stage,
    statusTone: getStatusForStage(stage),
    includedInThisSlice: SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS.includes(sourceId),
    sourceSystems,
    targetKeys: targets.map(target => target.targetKey),
    jobKeys: jobs.map(job => job.key),
    noTargetReason,
    lifecycle: buildLifecycleFlags(contract, targets, jobs),
    evidenceRefs,
    nextAction: contract.doneMeans || contract.stillOpen || contract.validationScope || '',
  }
}

function buildLaneSummary(lane) {
  const sources = lane.sources || []
  const targets = lane.targets || []
  const parked = sources.filter(source => source.lifecycle.parked === 'yes').length + targets.filter(target => target.parkedReason).length
  const evidenceRefs = unique([
    ...sources.flatMap(source => source.evidenceRefs),
    ...targets.flatMap(target => target.evidenceRefs),
  ])
  return {
    key: lane.key,
    title: lane.title,
    description: lane.description,
    sourceIds: sources.map(source => source.sourceId),
    targetKeys: targets.map(target => target.targetKey),
    status: targets.some(target => target.status === 'active')
      ? 'active'
      : parked
        ? 'parked'
        : 'visible',
    parkedCount: parked,
    evidenceRefs,
    complete: sources.every(source => source.evidenceRefs.length || source.noTargetReason) &&
      targets.every(target => target.evidenceRefs.length),
  }
}

function inspectPrivateEvidence(payload) {
  const serialized = JSON.stringify(payload || {})
  return privatePathPattern.test(serialized) && !/metadata-only/.test(serialized) ? 1 : 0
}

function inspectRawContentKeys(payload) {
  const offenders = []
  function walk(value, pathParts = []) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...pathParts, String(index)]))
      return
    }
    for (const [key, child] of Object.entries(value)) {
      const nextPath = [...pathParts, key]
      if (rawContentKeyPattern.test(key) && typeof child === 'string' && child.length > 400) {
        offenders.push(nextPath.join('.'))
      }
      walk(child, nextPath)
    }
  }
  walk(payload)
  return offenders
}

export function buildSourceLifecycleStatus({
  sources = [],
  connectors = [],
  groupedSystems = [],
  extractionControl = {},
  foundationJobs = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const targets = normalizeList(extractionControl.targets).map(target => ({
    ...target,
    targetKey: target.targetKey || target.key,
  }))
  const jobs = normalizeList(foundationJobs)
  const targetsBySource = new Map()
  const jobsBySource = new Map()
  targets.forEach(target => {
    if (!targetsBySource.has(target.sourceId)) targetsBySource.set(target.sourceId, [])
    targetsBySource.get(target.sourceId).push(target)
  })
  jobs.forEach(job => {
    normalizeList(job.sourceIds).forEach(sourceId => {
      if (!jobsBySource.has(sourceId)) jobsBySource.set(sourceId, [])
      jobsBySource.get(sourceId).push(job)
    })
  })

  const sanitizedTargets = targets.map(target => sanitizeTarget(target, jobs))
  const sourceLifecycles = normalizeList(sources).map(contract =>
    buildSourceLifecycle(
      contract,
      targetsBySource.get(contract.sourceId) || [],
      jobsBySource.get(contract.sourceId) || [],
      groupedSystems,
    )
  )
  const sourceById = byKey(sourceLifecycles, 'sourceId')
  const targetByKey = byKey(sanitizedTargets, 'targetKey')
  const laneSpecs = [
    {
      key: 'shared-comms-current-and-extract',
      title: 'Shared communications',
      description: 'Gmail, Missive, meetings, and Slack current capture plus governed candidate extraction visibility.',
      sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
      targetKeys: ['gmail-current-day', 'missive-current-day', 'meetings-current-day', 'slack-current-day', 'email-attachments-backfill'],
    },
    {
      key: 'drive-corpus-text',
      title: 'Drive and corpus text',
      description: 'Drive inventory/content targets and old-report mining state without expanding file types or quota.',
      sourceIds: ['SRC-GDRIVE-001'],
      targetKeys: ['drive-corpus-backfill', 'drive-content-extract-backfill', 'old-system-report-mining'],
    },
    {
      key: 'video-manifest-transcripts',
      title: 'Video manifest and transcripts',
      description: 'Existing video-link inventory and YouTube subtitle transcript lane; rich visual/video work remains parked.',
      sourceIds: ['SRC-VIDEO-001', 'SRC-YOUTUBE-INTEL-001', 'SRC-LOOM-001'],
      targetKeys: ['video-link-inventory', 'video-content-extract-backfill', 'zoom-audio-recovery-backfill', 'karpathy-kb-video-pack'],
    },
    {
      key: 'blocked-parked-course-sources',
      title: 'Blocked and parked course sources',
      description: 'Skool, Loom, Mycro, and creator-watchlist lanes are explicit, visible, and not extracted in this card.',
      sourceIds: ['SRC-SKOOL-001', 'SRC-LOOM-001', 'SRC-MYICRO-001', 'SRC-CREATOR-WATCHLIST-001'],
      targetKeys: [
        'skool-corpus-backfill',
        'mark-claude-code-living-course-public',
        'mark-claudeclaw-roadmap-public',
        'mark-skool-premium-recordings',
        'mark-skool-claudeclaw-classroom',
        'mark-claudeclaw-os-private-github',
      ],
    },
  ]
  const lanes = laneSpecs.map(spec => buildLaneSummary({
    ...spec,
    sources: spec.sourceIds.map(sourceId => sourceById.get(sourceId)).filter(Boolean),
    targets: spec.targetKeys.map(targetKey => targetByKey.get(targetKey)).filter(Boolean),
  }))
  const targetBaseline = compareTargetBaselines(sanitizedTargets)
  const sourcePresenceCounts = sourceLifecycles.reduce((counts, source) => {
    addCount(counts, source.lifecycleStage)
    return counts
  }, {})
  const targetStatusCounts = sanitizedTargets.reduce((counts, target) => {
    addCount(counts, target.status || 'unknown')
    return counts
  }, {})
  const parkedOrBlocked = [
    ...sourceLifecycles.filter(source => source.lifecycle.parked === 'yes'),
    ...sanitizedTargets.filter(target => target.parkedReason),
  ]
  const relevantSystems = normalizeList(groupedSystems)
    .filter(system => SOURCE_LIFECYCLE_RELEVANT_SYSTEM_IDS.includes(system.systemId))
    .map(system => ({
      systemId: system.systemId,
      title: system.title,
      status: system.status,
      trustState: system.trustState,
      maturityLevel: system.maturityLevel,
      sourceIds: normalizeList(system.sourceIds),
      runtimeJobKeys: normalizeList(system.runtimeJobKeys),
      evidenceRefs: unique([
        `system:${system.systemId}`,
        ...normalizeList(system.sourceIds).slice(0, 4).map(sourceId => `source:${sourceId}`),
      ]),
    }))
  const payloadWithoutSummary = {
    sources: sourceLifecycles,
    targets: sanitizedTargets,
    lanes,
    systems: relevantSystems,
  }
  const privateEvidenceLeaks = inspectPrivateEvidence(payloadWithoutSummary)
  const rawContentKeyFindings = inspectRawContentKeys(payloadWithoutSummary)
  const includedSourceMissing = SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS.filter(sourceId => !sourceById.has(sourceId))
  const laneCompletenessFailures = lanes.filter(lane => !lane.complete)
  const blockedPausedPlannedActivated = sanitizedTargets.filter(target => {
    const baseline = SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE[target.targetKey]
    if (!baseline || baseline.status === 'active') return false
    return target.status === 'active' || target.runtimeMode === 'scheduled'
  })

  return {
    schemaVersion: SOURCE_LIFECYCLE_SCHEMA_VERSION,
    generatedAt,
    cardId: SOURCE_LIFECYCLE_CARD_ID,
    closeoutKey: SOURCE_LIFECYCLE_CLOSEOUT_KEY,
    route: SOURCE_LIFECYCLE_ROUTE,
    apiPath: SOURCE_LIFECYCLE_API_PATH,
    definitions: SOURCE_LIFECYCLE_DEFINITIONS,
    scope: {
      buildType: 'source lifecycle visibility/control only',
      includedSourceIds: SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS,
      excludedLanes: SOURCE_LIFECYCLE_EXCLUDED_LANES,
      hardConstraints: [
        'No unapproved live extraction targets.',
        'No extraction quota increases.',
        'No broad corpus expansion.',
        'No Strategy Hub activation.',
        'No Scoper, Agent Factory, research cleanup, Action Review applying, or new feature lane.',
        'Blocked/paused/planned lanes must not silently become active.',
        'Evidence refs are metadata only.',
      ],
    },
    summary: {
      sourceContractCount: sourceLifecycles.length,
      connectorCount: normalizeList(connectors).length,
      groupedSystemCount: normalizeList(groupedSystems).length,
      extractionTargetCount: sanitizedTargets.length,
      includedSourceCount: SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS.length,
      includedSourceMissingCount: includedSourceMissing.length,
      laneCount: lanes.length,
      laneCompletenessFailures: laneCompletenessFailures.length,
      targetBaselineChanges: targetBaseline.changes.length,
      targetBaselineExtraTargets: targetBaseline.extraTargetKeys.length,
      targetBaselineMissingTargets: targetBaseline.missingTargetKeys.length,
      blockedPausedPlannedActivated: blockedPausedPlannedActivated.length,
      extractionCapsUnchanged: targetBaseline.ok,
      allSourceContractsCovered: sourceLifecycles.length === normalizeList(sources).length,
      allExtractionTargetsCovered: sanitizedTargets.length === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
      parkedOrBlockedVisible: parkedOrBlocked.length,
      privateEvidenceLeaks,
      rawContentKeyFindings: rawContentKeyFindings.length,
      sourcePresenceCounts,
      targetStatusCounts,
    },
    findings: [
      ...includedSourceMissing.map(sourceId => ({
        severity: 'critical',
        type: 'included_source_missing',
        detail: sourceId,
      })),
      ...laneCompletenessFailures.map(lane => ({
        severity: 'critical',
        type: 'lane_missing_evidence_or_status',
        detail: lane.key,
      })),
      ...targetBaseline.changes.map(change => ({
        severity: 'critical',
        type: 'target_baseline_changed',
        detail: `${change.targetKey}:${change.field}`,
      })),
      ...targetBaseline.extraTargetKeys.map(targetKey => ({
        severity: 'critical',
        type: 'unexpected_extraction_target',
        detail: targetKey,
      })),
      ...blockedPausedPlannedActivated.map(target => ({
        severity: 'critical',
        type: 'parked_or_planned_target_activated',
        detail: target.targetKey,
      })),
      ...rawContentKeyFindings.map(detail => ({
        severity: 'critical',
        type: 'raw_content_like_field',
        detail,
      })),
    ],
    lanes,
    sources: sourceLifecycles,
    targets: sanitizedTargets,
    systems: relevantSystems,
  }
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

function addFinding(findings, condition, check, detail = '') {
  if (!condition) findings.push({ check, detail })
}

function includesAll(source, values) {
  return values.every(value => source.includes(value))
}

export async function buildSourceLifecycleExpansionCheck({
  repoRoot = defaultRepoRoot,
  sourceLifecycle = null,
  sourceOfTruth = null,
  foundationHub = null,
} = {}) {
  const findings = []
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const serverSource = await readOptionalText(repoRoot, 'server.js')
  const sourceRoutesSource = await readOptionalText(repoRoot, 'lib/foundation-source-routes.js')
  const routeSources = `${serverSource}\n${sourceRoutesSource}`
  const foundationHtml = await readOptionalText(repoRoot, 'public/foundation.html')
  const foundationUi = [
    await readOptionalText(repoRoot, 'public/foundation.js'),
    await readOptionalText(repoRoot, 'public/foundation-data.js'),
    await readOptionalText(repoRoot, 'public/foundation-source-registry-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-fub-lead-source-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-system-inventory-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-current-state-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-decision-question-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-source-lifecycle-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-runtime-renderers.js'),
    await readOptionalText(repoRoot, 'public/foundation-operations-renderers.js'),
  ].join('\n')
  const foundationStyles = await readCombinedFoundationStylesheet(repoRoot, readOptionalText)
  const approvedPlan = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_APPROVED_PLAN_PATH)
  const approval = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_APPROVAL_PATH)
  const baseline = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_BASELINE_PATH)
  const manualReview = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', SOURCE_LIFECYCLE_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', SOURCE_LIFECYCLE_APPROVAL_PATH)
  addFinding(findings, Boolean(baseline), 'baseline artifact exists', SOURCE_LIFECYCLE_BASELINE_PATH)
  addFinding(findings, Boolean(manualReview), 'manual review artifact exists', SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH)
  addFinding(findings, approvedPlan.includes('source lifecycle visibility/control only'), 'approved plan locks visibility/control scope', 'visibility/control only')
  addFinding(findings, approvedPlan.includes('No new extraction targets'), 'approved plan blocks new extraction targets', 'no new targets')
  addFinding(findings, approvedPlan.includes('No extraction quota increases'), 'approved plan blocks quota increases', 'no quota increases')
  addFinding(findings, approvedPlan.includes('Evidence refs are metadata only'), 'approved plan records metadata-only evidence refs', 'metadata only')
  addFinding(findings, packageJson.includes('"process:source-lifecycle-expansion-check"'), 'package script exists', 'process:source-lifecycle-expansion-check')
  addFinding(findings, routeSources.includes("app.get('/api/foundation/source-lifecycle'"), 'source lifecycle API route exists', SOURCE_LIFECYCLE_API_PATH)
  addFinding(findings, foundationHtml.includes('data-section="source-lifecycle"'), 'Foundation nav exposes Source Lifecycle route', SOURCE_LIFECYCLE_ROUTE)
  addFinding(findings, foundationUi.includes('fetchSourceLifecycle'), 'UI fetches source lifecycle API', 'fetchSourceLifecycle')
  addFinding(findings, foundationUi.includes('renderSourceLifecycle'), 'source lifecycle renderer exists', 'renderSourceLifecycle')
  addFinding(findings, foundationUi.includes('data-source-lifecycle-section'), 'source lifecycle UI carries proof selectors', 'data-source-lifecycle-section')
  addFinding(findings, foundationStyles.includes('.source-lifecycle'), 'source lifecycle styles exist', '.source-lifecycle')
  addFinding(findings, currentPlan.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1') || currentPlan.includes('SOURCE-LIFECYCLE-EXPANSION-001'), 'current plan mentions source lifecycle card', 'current-plan')
  addFinding(findings, currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1') || currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001'), 'current state mentions source lifecycle card', 'current-state')
  addFinding(findings, baseline.includes('Baseline source: 6fb1781'), 'baseline records starting commit', '6fb1781')
  addFinding(findings, baseline.includes('Source contracts: 35'), 'baseline records source contract count', '35')
  addFinding(findings, baseline.includes('Extraction targets: 12'), 'baseline records extraction target count', '12')
  addFinding(findings, baseline.includes('No extraction target, schedule, or quota changed in the baseline'), 'baseline records non-ingestion boundary', 'no target/schedule/quota change')

  for (const phrase of [
    'Failures: 0',
    'desktop 1440x900',
    'mobile 390x844',
    'source lifecycle route',
    'active source lanes',
    'parked/blocked lanes',
    'extraction caps',
    'evidence refs',
    'lifecycle definitions',
    'no horizontal overflow',
    'no overlapping text',
  ]) {
    addFinding(findings, manualReview.toLowerCase().includes(phrase.toLowerCase()), `manual review covers ${phrase}`, phrase)
  }

  const sourceLifecycleSummary = sourceLifecycle?.summary || {}
  if (sourceLifecycle) {
    const summary = sourceLifecycleSummary
    addFinding(findings, sourceLifecycle.schemaVersion === SOURCE_LIFECYCLE_SCHEMA_VERSION, 'source lifecycle API schema version is current', String(sourceLifecycle.schemaVersion || 'missing'))
    addFinding(findings, summary.allSourceContractsCovered === true, 'source lifecycle covers every current source contract', String(summary.sourceContractCount || 0))
    addFinding(findings, summary.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT, `all ${SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT} extraction targets covered`, String(summary.extractionTargetCount || 0))
    addFinding(findings, summary.includedSourceMissingCount === 0, 'all included source lanes are present', String(summary.includedSourceMissingCount || 0))
    addFinding(findings, summary.laneCompletenessFailures === 0, 'included lanes have status plus evidence or parked reason', String(summary.laneCompletenessFailures || 0))
    addFinding(findings, summary.extractionCapsUnchanged === true, 'extraction caps are visible and unchanged', String(summary.extractionCapsUnchanged))
    addFinding(findings, summary.targetBaselineChanges === 0, 'target status/runtime/budget baseline unchanged', String(summary.targetBaselineChanges || 0))
    addFinding(findings, summary.targetBaselineExtraTargets === 0, 'no new extraction targets appeared', String(summary.targetBaselineExtraTargets || 0))
    addFinding(findings, summary.blockedPausedPlannedActivated === 0, 'blocked/paused/planned targets did not become active', String(summary.blockedPausedPlannedActivated || 0))
    addFinding(findings, summary.parkedOrBlockedVisible > 0, 'parked/blocked lanes are visible', String(summary.parkedOrBlockedVisible || 0))
    addFinding(findings, summary.privateEvidenceLeaks === 0, 'no private/local path content leaks', String(summary.privateEvidenceLeaks || 0))
    addFinding(findings, summary.rawContentKeyFindings === 0, 'no raw source-content fields in lifecycle API', String(summary.rawContentKeyFindings || 0))
    addFinding(findings, Array.isArray(sourceLifecycle.definitions) && sourceLifecycle.definitions.length === SOURCE_LIFECYCLE_DEFINITIONS.length, 'lifecycle definitions are exposed', String(sourceLifecycle.definitions?.length || 0))
    addFinding(findings, Array.isArray(sourceLifecycle.lanes) && sourceLifecycle.lanes.length >= 4, 'included lane summaries are exposed', String(sourceLifecycle.lanes?.length || 0))
    addFinding(findings, Array.isArray(sourceLifecycle.targets) && sourceLifecycle.targets.every(target => target.budgetCaps && target.evidenceRefs?.length), 'target caps and evidence refs are visible', 'targets')
  }

  if (sourceOfTruth) {
    addFinding(findings, Array.isArray(sourceOfTruth.sources) && sourceOfTruth.sources.length === sourceLifecycleSummary.sourceContractCount, '/api/source-of-truth source count matches Source Lifecycle rows', `sourceOfTruth=${sourceOfTruth.sources?.length || 0} lifecycle=${sourceLifecycleSummary.sourceContractCount || 0}`)
    addFinding(findings, Array.isArray(sourceOfTruth.connectors), '/api/source-of-truth keeps connectors array', typeof sourceOfTruth.connectors)
    addFinding(findings, Array.isArray(sourceOfTruth.groupedSystems), '/api/source-of-truth keeps groupedSystems array', typeof sourceOfTruth.groupedSystems)
  }

  if (foundationHub) {
    const card = normalizeList(foundationHub.backlogItems).find(item => item.id === SOURCE_LIFECYCLE_CARD_ID)
    addFinding(findings, Boolean(card), 'source lifecycle card exists in live backlog', card?.lane || 'missing')
    const hubTargetCount = foundationHub.extractionControl?.summary?.targetCount ?? foundationHub.sourceLifecycle?.summary?.extractionTargetCount ?? sourceLifecycle?.summary?.extractionTargetCount
    addFinding(findings, hubTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT, `foundation hub still reports ${SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT} extraction targets`, String(hubTargetCount || 0))
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_LIFECYCLE_CARD_ID,
    closeoutKey: SOURCE_LIFECYCLE_CLOSEOUT_KEY,
    summary: sourceLifecycle?.summary || {},
    findings,
  }
}
