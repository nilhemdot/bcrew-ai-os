import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
} from './source-lifecycle.js'
import {
  buildSourceLifecycleDynamicCoverage,
} from './source-lifecycle-dynamic-counts.js'
import { getFoundationBuildCloseouts } from './foundation-build-log.js'
import { readFoundationBuildLogRegistrySource } from './foundation-build-log-source.js'
import { buildFoundationReadinessStatus } from './foundation-readiness-gates.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const SOURCE_LIFECYCLE_COMPLETION_CARD_ID = 'SOURCE-LIFECYCLE-COMPLETION-001'
export const SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY = 'source-lifecycle-completion-v1'
export const SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH = 'docs/process/source-lifecycle-completion-001-plan.md'
export const SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH = 'docs/process/approvals/SOURCE-LIFECYCLE-COMPLETION-001.json'
export const SOURCE_LIFECYCLE_COMPLETION_DOC_PATH = 'docs/process/source-lifecycle-completion.md'
export const SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH = 'scripts/process-source-lifecycle-completion-check.mjs'
export const SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER = 'SOURCE_LIFECYCLE_COMPLETION'

const COMPLETE_SOURCE_IDS = [
  'SRC-STRATEGY-001',
  'SRC-OWNERS-001',
  'SRC-CLICKUP-001',
  'SRC-GMAIL-001',
  'SRC-GCAL-001',
  'SRC-GDRIVE-001',
  'SRC-VIDEO-001',
  'SRC-SLACK-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-DATAFORSEO-001',
  'SRC-GHL-001',
  'SRC-META-001',
]

const CURRENT_REALITY_SOURCE_IDS = [
  'SRC-FREEDOM-TEAM-001',
  'SRC-FREEDOM-COMMUNITY-001',
  'SRC-FREEDOM-COMMUNITY-REV-001',
  'SRC-FREEDOM-ENGINE-001',
  'SRC-FREEDOM-BHAG-001',
  'SRC-OWNERS-LISTS-001',
  'SRC-FINANCE-001',
]

const READ_ONLY_SOURCE_IDS = [
  'SRC-FUB-001',
  'SRC-SUPABASE-001',
]

const NON_READINESS_READ_ONLY_SOURCE_RULES = {
  'SRC-GITHUB-BUILD-INTEL-001': {
    reason: 'Public GitHub Build Intel is active read-only implementation intelligence, but it is not Strategy readiness supply.',
    nextAction: 'Use BUILD-INTEL-GITHUB-MONITOR-001 to govern future public repo monitoring before any broader extraction.',
  },
}

export const SOURCE_LIFECYCLE_COMPLETION_BLOCKED_RULES = {
  'SRC-STRATEGY-QUARTER-001': {
    blockerCards: ['STRATEGY-QUARTER-001'],
    reason: 'Future Strategy Quarter input layer exists as a source identity, but it is not a live read/write source yet.',
    nextAction: 'Build STRATEGY-QUARTER-001 later as a PostgreSQL-backed Strategy Hub input layer.',
  },
  'SRC-MYICRO-001': {
    blockerCards: ['MYICRO-TRAINING-001'],
    reason: 'Logged-in Mycro content use, extraction shape, and authorization proof are not approved yet.',
    nextAction: 'Use MYICRO-TRAINING-001 later to prove one Steve-authorized lesson path and content-use boundary.',
  },
  'SRC-CREATOR-WATCHLIST-001': {
    blockerCards: ['CREATOR-WATCHLIST-001'],
    reason: 'Creator watchlist intake is future governed research work, not Foundation readiness supply.',
    nextAction: 'Build CREATOR-WATCHLIST-001 later after Foundation readiness improves.',
  },
  'SRC-YOUTUBE-INTEL-001': {
    blockerCards: ['YOUTUBE-SCOUT-001'],
    reason: 'YouTube scout/discovery and richer creator intelligence are future work; subtitle transcript v1 remains covered by SRC-VIDEO-001/DataForSEO.',
    nextAction: 'Route future scout/discovery implementation through YOUTUBE-SCOUT-001.',
  },
  'SRC-LOOM-001': {
    blockerCards: ['LOOM-001'],
    reason: 'No approved Loom extractor/API proof exists.',
    nextAction: 'Use LOOM-001 later to prove a small authorized Loom extraction path before any bulk lane.',
  },
  'SRC-SKOOL-001': {
    blockerCards: ['SKOOL-001', 'SKOOL-WORKER-001'],
    reason: 'Skool corpus access is blocked without an approved export/API/admin path and content-use boundary.',
    nextAction: 'Use SKOOL-001/SKOOL-WORKER-001 later; blind scraping remains blocked.',
  },
  'SRC-GADS-001': {
    blockerCards: ['SOURCE-011'],
    reason: 'Google Ads is known but rebuild validation is still pending.',
    nextAction: 'Use SOURCE-011 later to confirm access, account surfaces, and source role.',
  },
  'SRC-PUBLISH-001': {
    blockerCards: ['SOURCE-016'],
    reason: 'Publishing API candidate exists, but owner/user auth context and source role are not validated.',
    nextAction: 'Use SOURCE-016 later to validate SocialPilot/publishing source boundaries.',
  },
  'SRC-GA4-001': {
    blockerCards: ['SOURCE-016'],
    reason: 'GA4 source identity is scoped, but property IDs, auth posture, brand lanes, and allowed reads are not approved.',
    nextAction: 'Use a future SOURCE-016 follow-up to approve GA4 property/account reads before any extraction target is created.',
  },
  'SRC-GSC-001': {
    blockerCards: ['SOURCE-016'],
    reason: 'Search Console source identity is scoped, but site URLs, auth posture, brand lanes, and allowed reads are not approved.',
    nextAction: 'Use a future SOURCE-016 follow-up to approve Search Console site-property reads before any extraction target is created.',
  },
  'SRC-GBP-001': {
    blockerCards: ['SOURCE-016', 'SOURCE-022'],
    reason: 'Google Business Profile source identity is scoped, but account/location IDs, auth posture, and review-use boundaries are not approved.',
    nextAction: 'Use SOURCE-022 or a SOURCE-016 follow-up to approve GBP location/review reads before any extraction target is created.',
  },
  'SRC-REAL-001': {
    blockerCards: ['SOURCE-015'],
    reason: 'Real Broker API is not connected and does not currently feed Foundation Strategy readiness.',
    nextAction: 'Use SOURCE-015 later to validate credentials, endpoints, and source ownership.',
  },
  'SRC-EMAIL-TEAM-001': {
    blockerCards: ['SECURITY-FILTERED-COMMS-ACCESS-001'],
    reason: 'Team-wide inbox access beyond the current governed shared-comms lanes is not approved.',
    nextAction: 'Keep broader team email blocked until filtered-comms access rules and source scope are approved.',
  },
  'SRC-REVIEWS-001': {
    blockerCards: ['SOURCE-016'],
    reason: 'Client review/survey source ownership is not connected or signed off.',
    nextAction: 'Use SOURCE-016 later to place reviews in the marketing/source map before connector work.',
  },
  'SRC-TRAINING-001': {
    blockerCards: ['MYICRO-TRAINING-001'],
    reason: 'The live training completion tracker source is unknown.',
    nextAction: 'Use a later training-source card, starting with MYICRO-TRAINING-001 if it owns the real training evidence.',
  },
  'SRC-CONTENT-001': {
    blockerCards: ['SOURCE-016'],
    reason: 'Published content metrics are not connected as a source-owned truth layer.',
    nextAction: 'Use SOURCE-016 later to define content performance ownership by brand and pillar.',
  },
}

const TARGET_RULES = {
  'SRC-GMAIL-001': {
    targetKeys: ['gmail-current-day', 'email-attachments-backfill'],
    healthyTargetKeys: ['gmail-current-day', 'email-attachments-backfill'],
    scopeNote: 'Complete for delegated read-side current reality: Gmail current-day thread archive, governed candidate extraction, and PDF/text/calendar attachment V1. Gmail sends, broad mailbox exposure, credential mutation, and Missive internal-comment/assignment truth remain separate blocked boundaries.',
  },
  'SRC-GCAL-001': {
    targetKeys: ['calendar-current-day'],
    healthyTargetKeys: ['calendar-current-day'],
    scopeNote: 'Complete for bounded read-only Calendar event archive; Calendar writes, invites, RSVP handling, and candidate extraction remain out of scope.',
  },
  'SRC-GDRIVE-001': {
    targetKeys: ['drive-corpus-backfill', 'drive-content-extract-backfill', 'old-system-report-mining'],
    healthyTargetKeys: ['drive-corpus-backfill', 'drive-content-extract-backfill'],
    partialBlockerCards: ['DRIVE-ACCESS-REQUEST-001', 'MULTIMODAL-EXTRACTOR-001'],
    scopeNote: 'Complete for existing Drive inventory/content lanes; rich media and ACL repair remain separate blockers.',
  },
  'SRC-VIDEO-001': {
    targetKeys: ['video-link-inventory', 'video-content-extract-backfill'],
    healthyTargetKeys: ['video-link-inventory', 'video-content-extract-backfill'],
    partialBlockerCards: ['YOUTUBE-SCOUT-001', 'MULTIMODAL-EXTRACTOR-001'],
    scopeNote: 'Complete for existing manifest/subtitle transcript lanes; scout, Gemini video, and rich video vision remain future work.',
  },
  'SRC-SLACK-001': {
    targetKeys: ['slack-current-day'],
    healthyTargetKeys: ['slack-current-day'],
  },
  'SRC-MISSIVE-001': {
    targetKeys: ['missive-current-day'],
    healthyTargetKeys: ['missive-current-day'],
  },
  'SRC-MEETINGS-001': {
    targetKeys: ['meetings-current-day', 'zoom-audio-recovery-backfill'],
    healthyTargetKeys: ['meetings-current-day'],
    partialBlockerCards: ['MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001'],
    scopeNote: 'Complete for current Foundation/Steve owner use through the current-day archive and transcript evidence lanes; broad raw Drive ACL/vault exposure and future team/agent query access remain separate blocker cards.',
  },
}

const CONNECTOR_RULES = {
  'SRC-CLICKUP-001': ['CONN-CLICKUP-001'],
  'SRC-GMAIL-001': ['CONN-GMAIL-001'],
  'SRC-GCAL-001': ['CONN-GCAL-001'],
  'SRC-GDRIVE-001': ['CONN-GDRIVE-001'],
  'SRC-VIDEO-001': ['CONN-DATAFORSEO-001'],
  'SRC-SLACK-001': ['CONN-SLACK-001'],
  'SRC-MISSIVE-001': ['CONN-MISSIVE-001'],
  'SRC-MEETINGS-001': ['CONN-GDRIVE-001', 'CONN-GCAL-001'],
  'SRC-DATAFORSEO-001': ['CONN-DATAFORSEO-001'],
  'SRC-FUB-001': ['CONN-FUB-001'],
  'SRC-GHL-001': ['CONN-GHL-001'],
  'SRC-META-001': ['CONN-META-001'],
}

function buildRules() {
  const rules = []
  COMPLETE_SOURCE_IDS.forEach(sourceId => {
    rules.push({
      sourceId,
      requiredState: 'complete',
      blocksStrategyReadiness: true,
      freshnessStatus: 'fresh',
      coverageStatus: TARGET_RULES[sourceId]?.partialBlockerCards ? 'partial_with_blocker' : (TARGET_RULES[sourceId] ? 'covered' : 'not_applicable'),
      sensitivityTier: 'tier_1',
      lastProofCommand: 'npm run process:source-lifecycle-completion-check',
      ...TARGET_RULES[sourceId],
      connectorIds: CONNECTOR_RULES[sourceId] || [],
    })
  })
  CURRENT_REALITY_SOURCE_IDS.forEach(sourceId => {
    rules.push({
      sourceId,
      requiredState: 'current_reality_complete',
      blocksStrategyReadiness: true,
      freshnessStatus: 'current_reality',
      coverageStatus: 'not_applicable',
      sensitivityTier: 'tier_1',
      lastProofCommand: 'npm run process:source-lifecycle-completion-check',
      connectorIds: [],
    })
  })
  READ_ONLY_SOURCE_IDS.forEach(sourceId => {
    rules.push({
      sourceId,
      requiredState: 'read_only_complete',
      blocksStrategyReadiness: true,
      freshnessStatus: 'readable_only',
      coverageStatus: 'not_applicable',
      sensitivityTier: 'tier_1',
      lastProofCommand: 'npm run process:source-lifecycle-completion-check',
      connectorIds: CONNECTOR_RULES[sourceId] || [],
    })
  })
  Object.entries(NON_READINESS_READ_ONLY_SOURCE_RULES).forEach(([sourceId, rule]) => {
    rules.push({
      sourceId,
      requiredState: 'read_only_non_readiness',
      blocksStrategyReadiness: false,
      freshnessStatus: 'readable_only',
      coverageStatus: 'not_applicable',
      sensitivityTier: 'tier_1',
      lastProofCommand: 'npm run process:source-lifecycle-completion-check',
      connectorIds: CONNECTOR_RULES[sourceId] || [],
      ...rule,
    })
  })
  Object.entries(SOURCE_LIFECYCLE_COMPLETION_BLOCKED_RULES).forEach(([sourceId, rule]) => {
    rules.push({
      sourceId,
      requiredState: 'accepted_blocked',
      blocksStrategyReadiness: false,
      freshnessStatus: 'blocked',
      coverageStatus: 'blocked',
      sensitivityTier: 'tier_1',
      lastProofCommand: 'npm run process:source-lifecycle-completion-check',
      ...rule,
    })
  })
  return rules
}

export const SOURCE_LIFECYCLE_COMPLETION_RULES = buildRules()
export const SOURCE_LIFECYCLE_COMPLETION_RULE_IDS = SOURCE_LIFECYCLE_COMPLETION_RULES.map(rule => rule.sourceId)
export const SOURCE_LIFECYCLE_LOAD_BEARING_SOURCE_IDS = [
  ...COMPLETE_SOURCE_IDS,
  ...CURRENT_REALITY_SOURCE_IDS,
  ...READ_ONLY_SOURCE_IDS,
]
export const SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS = Object.keys(SOURCE_LIFECYCLE_COMPLETION_BLOCKED_RULES)

const privatePathPattern = /(^|\/)(MEMORY\.md|USER\.md|IDENTITY\.md|TOOLS\.md|HEARTBEAT\.md|memory\/)/i
const rawContentKeyPattern = /(^|\.)(body|content|raw|html|markdown|snippet|subject|message|transcript|text)$/i

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function byKey(values, key) {
  return new Map(normalizeList(values).map(value => [value?.[key], value]).filter(([itemKey]) => Boolean(itemKey)))
}

function unique(values) {
  return Array.from(new Set(normalizeList(values)))
}

function addFinding(findings, condition, check, detail = '', fields = {}) {
  if (condition) return
  findings.push({
    severity: fields.severity || 'critical',
    sourceId: fields.sourceId || null,
    check,
    detail,
    blockerCards: fields.blockerCards || [],
    nextAction: fields.nextAction || '',
  })
}

function includesAny(value, phrases) {
  const text = normalizeText(value).toLowerCase()
  return phrases.some(phrase => text.includes(String(phrase).toLowerCase()))
}

function connectorLooksUsable(connector) {
  const status = normalizeText(connector?.status)
  const group = normalizeText(connector?.group)
  if (!connector) return false
  if (group === 'working') return true
  return includesAny(status, ['working', 'installed', 'readable'])
}

function targetItemCount(target = {}) {
  return Number(target.counts?.totalItems || target.itemSummary?.totalItems || 0)
}

function targetProofCount(target = {}) {
  return Number(target.counts?.succeededItems || target.itemSummary?.succeededItems || 0) +
    Number(target.counts?.extracted || target.extractedCount || 0) +
    Number(target.counts?.archived || target.archivedCount || 0) +
    Number(target.counts?.inspected || target.inspectedCount || 0)
}

function targetHasProof(target = {}) {
  if (!target) return false
  if (target.status === 'blocked' || target.runtimeMode === 'paused') return false
  if (target.status === 'planned') return targetProofCount(target) > 0 || targetItemCount(target) > 0
  return targetProofCount(target) > 0 || targetItemCount(target) > 0
}

function statusMatchesTerminal(contract = {}, rule = {}) {
  const status = normalizeText(contract.status)
  const validation = normalizeText(contract.validation)
  if (rule.requiredState === 'complete') {
    return includesAny(status, ['verified', 'signed off', 'boundary locked', 'pending revalidation']) ||
      includesAny(validation, ['signed off', 'verified'])
  }
  if (rule.requiredState === 'current_reality_complete') {
    return includesAny(status, ['current reality']) &&
      includesAny(validation, ['signed off for current reality'])
  }
  if (rule.requiredState === 'read_only_complete') {
    return includesAny(status, ['verified readable']) &&
      includesAny(validation, ['readable only'])
  }
  if (rule.requiredState === 'read_only_non_readiness') {
    return includesAny(status, ['active read-only', 'verified readable']) &&
      includesAny(validation, ['read-only', 'readable only'])
  }
  if (rule.requiredState === 'accepted_blocked') {
    return includesAny(status, ['gap', 'pending revalidation', 'scoped, not connected']) ||
      includesAny(validation, ['not signed off'])
  }
  return false
}

function buildEvidenceRefs({ contract, lifecycle, rule, targetRows, connectorRows }) {
  return unique([
    `source:${rule.sourceId}`,
    contract?.lastVerified ? `contract:lastVerified:${contract.lastVerified}` : '',
    ...normalizeList(lifecycle?.targetKeys).map(targetKey => `target:${targetKey}`),
    ...targetRows.map(target => `target:${target.targetKey}`),
    ...connectorRows.map(connector => `connector:${connector.connectorId}`),
    ...normalizeList(rule.blockerCards).map(cardId => `blocker:${cardId}`),
    rule.lastProofCommand ? `proof:${rule.lastProofCommand}` : '',
  ].filter(Boolean))
}

function inspectMetadataLeaks(payload) {
  const findings = []
  function walk(value, pathParts = []) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...pathParts, String(index)]))
      return
    }
    for (const [key, child] of Object.entries(value)) {
      const nextPath = [...pathParts, key]
      const joinedPath = nextPath.join('.')
      if (rawContentKeyPattern.test(joinedPath) && typeof child === 'string' && child.length > 80) {
        findings.push({ type: 'raw_content_like_field', detail: joinedPath })
      }
      if (typeof child === 'string' && privatePathPattern.test(child) && !child.includes('metadata-only')) {
        findings.push({ type: 'private_path_ref', detail: joinedPath })
      }
      walk(child, nextPath)
    }
  }
  walk(payload)
  return findings
}

function buildSourceCompletionRow({
  rule,
  contract,
  lifecycle,
  targetByKey,
  connectorById,
  backlogIds,
}) {
  const findings = []
  const targetRows = normalizeList(rule.targetKeys).map(targetKey => targetByKey.get(targetKey)).filter(Boolean)
  const connectorRows = normalizeList(rule.connectorIds).map(connectorId => connectorById.get(connectorId)).filter(Boolean)
  const missingTargets = normalizeList(rule.targetKeys).filter(targetKey => !targetByKey.has(targetKey))
  const missingHealthyTargets = normalizeList(rule.healthyTargetKeys).filter(targetKey => !targetHasProof(targetByKey.get(targetKey)))
  const missingConnectors = normalizeList(rule.connectorIds).filter(connectorId => !connectorLooksUsable(connectorById.get(connectorId)))
  const missingBlockerCards = normalizeList(rule.blockerCards).filter(cardId => !backlogIds.has(cardId))

  addFinding(findings, Boolean(contract), 'source contract exists', rule.sourceId, { sourceId: rule.sourceId })
  addFinding(findings, Boolean(lifecycle), 'source lifecycle row exists', rule.sourceId, { sourceId: rule.sourceId })
  addFinding(findings, normalizeText(contract?.owner), 'source owner exists', rule.sourceId, { sourceId: rule.sourceId })
  addFinding(findings, statusMatchesTerminal(contract, rule), 'contract status supports terminal state', `${contract?.status || 'missing'} / ${contract?.validation || 'missing'}`, { sourceId: rule.sourceId })
  addFinding(findings, normalizeText(rule.sensitivityTier), 'sensitivity tier is classified', rule.sourceId, { sourceId: rule.sourceId })

  if (rule.requiredState === 'accepted_blocked') {
    addFinding(findings, normalizeText(rule.reason), 'accepted-blocked reason exists', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, normalizeText(rule.nextAction), 'accepted-blocked next action exists', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, normalizeList(rule.blockerCards).length > 0, 'accepted-blocked blocker card exists', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, missingBlockerCards.length === 0, 'accepted-blocked blocker cards are live backlog cards', missingBlockerCards.join(', ') || 'none', { sourceId: rule.sourceId, blockerCards: rule.blockerCards })
    addFinding(findings, rule.blocksStrategyReadiness === false, 'accepted-blocked source does not block Strategy readiness', rule.sourceId, { sourceId: rule.sourceId })
  } else if (rule.requiredState === 'read_only_non_readiness') {
    addFinding(findings, normalizeText(rule.reason), 'non-readiness read-only reason exists', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, normalizeText(rule.nextAction), 'non-readiness read-only next action exists', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, rule.blocksStrategyReadiness === false, 'non-readiness source does not block Strategy readiness', rule.sourceId, { sourceId: rule.sourceId })
  } else {
    addFinding(findings, rule.blocksStrategyReadiness === true, 'load-bearing source blocks readiness if incomplete', rule.sourceId, { sourceId: rule.sourceId })
    addFinding(findings, missingTargets.length === 0, 'required target keys are represented', missingTargets.join(', ') || 'none', { sourceId: rule.sourceId })
    addFinding(findings, missingHealthyTargets.length === 0, 'required target keys have coverage proof', missingHealthyTargets.join(', ') || 'none', { sourceId: rule.sourceId })
    addFinding(findings, missingConnectors.length === 0, 'required connectors are usable', missingConnectors.join(', ') || 'none', { sourceId: rule.sourceId })
  }

  const evidenceRefs = buildEvidenceRefs({ contract, lifecycle, rule, targetRows, connectorRows })
  addFinding(findings, evidenceRefs.length > 0, 'metadata-only evidence refs exist', rule.sourceId, { sourceId: rule.sourceId })

  return {
    sourceId: rule.sourceId,
    title: contract?.title || lifecycle?.title || rule.sourceId,
    owner: contract?.owner || 'missing',
    currentStatus: contract?.status || 'missing',
    validation: contract?.validation || 'missing',
    completionState: rule.requiredState,
    blocksStrategyReadiness: rule.blocksStrategyReadiness,
    freshnessStatus: rule.freshnessStatus,
    coverageStatus: rule.coverageStatus,
    sensitivityTier: rule.sensitivityTier,
    targetKeys: unique([
      ...normalizeList(rule.targetKeys),
      ...normalizeList(lifecycle?.targetKeys),
    ]),
    connectorIds: normalizeList(rule.connectorIds),
    evidenceRefs,
    blockerCards: normalizeList(rule.blockerCards),
    reason: rule.reason || rule.scopeNote || '',
    nextAction: rule.nextAction || rule.scopeNote || 'Keep current source contract under this terminal state until a later approved card changes it.',
    lastProofCommand: rule.lastProofCommand,
    findings,
  }
}

export function buildSourceLifecycleCompletionStatus({
  sourceLifecycle = {},
  sourceOfTruth = {},
  foundationHub = {},
  generatedAt = new Date().toISOString(),
  repoHead = null,
} = {}) {
  const findings = []
  const sourceContracts = normalizeList(sourceOfTruth.sources)
  const connectors = normalizeList(sourceOfTruth.connectors)
  const lifecycleSources = normalizeList(sourceLifecycle.sources)
  const targets = normalizeList(sourceLifecycle.targets)
  const contractById = byKey(sourceContracts, 'sourceId')
  const lifecycleById = byKey(lifecycleSources, 'sourceId')
  const targetByKey = byKey(targets, 'targetKey')
  const connectorById = byKey(connectors, 'connectorId')
  const backlogIds = new Set(normalizeList(foundationHub.backlogItems).map(item => item.id).filter(Boolean))

  const ruleIds = new Set(SOURCE_LIFECYCLE_COMPLETION_RULE_IDS)
  const sourceContractIds = sourceContracts.map(contract => contract.sourceId).filter(Boolean)
  const missingContracts = SOURCE_LIFECYCLE_COMPLETION_RULE_IDS.filter(sourceId => !contractById.has(sourceId))
  const duplicateRules = SOURCE_LIFECYCLE_COMPLETION_RULE_IDS.filter((sourceId, index, values) => values.indexOf(sourceId) !== index)
  const missingBaselineTargets = Object.keys(SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE).filter(targetKey => !targetByKey.has(targetKey))
  const extraTargets = targets.map(target => target.targetKey).filter(targetKey => !SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE[targetKey])
  const dynamicCoverage = buildSourceLifecycleDynamicCoverage({
    sourceContracts,
    terminalRuleIds: SOURCE_LIFECYCLE_COMPLETION_RULE_IDS,
    lifecycleSources,
  })

  addFinding(findings, duplicateRules.length === 0, 'completion registry has unique source IDs', duplicateRules.join(', ') || 'none')
  addFinding(findings, dynamicCoverage.requiredWithoutTerminalRuleIds.length === 0, 'every required source contract has terminal coverage', dynamicCoverage.requiredWithoutTerminalRuleIds.join(', ') || 'none')
  addFinding(findings, missingContracts.length === 0, 'every terminal rule has a source contract', missingContracts.join(', ') || 'none')
  addFinding(findings, dynamicCoverage.requiredMissingLifecycleRowIds.length === 0, 'every required source contract has a lifecycle row', dynamicCoverage.requiredMissingLifecycleRowIds.join(', ') || 'none')
  addFinding(findings, targets.length === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT, `all ${SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT} extraction targets are represented`, String(targets.length))
  addFinding(findings, missingBaselineTargets.length === 0, 'approved target baseline keys are all present', missingBaselineTargets.join(', ') || 'none')
  addFinding(findings, extraTargets.length === 0, 'no unapproved extraction targets are present', extraTargets.join(', ') || 'none')
  addFinding(findings, sourceLifecycle.summary?.extractionCapsUnchanged === true, 'extraction caps are unchanged', String(sourceLifecycle.summary?.extractionCapsUnchanged))
  addFinding(findings, Number(sourceLifecycle.summary?.targetBaselineChanges || 0) === 0, 'target status/runtime/budget baseline unchanged', String(sourceLifecycle.summary?.targetBaselineChanges || 0))
  addFinding(findings, Number(sourceLifecycle.summary?.blockedPausedPlannedActivated || 0) === 0, 'blocked/paused/planned targets did not silently activate', String(sourceLifecycle.summary?.blockedPausedPlannedActivated || 0))

  const sources = SOURCE_LIFECYCLE_COMPLETION_RULES.map(rule => buildSourceCompletionRow({
    rule,
    contract: contractById.get(rule.sourceId),
    lifecycle: lifecycleById.get(rule.sourceId),
    targetByKey,
    connectorById,
    backlogIds,
  }))
  const sourceFindings = sources.flatMap(source =>
    source.findings.map(finding => ({
      ...finding,
      sourceId: finding.sourceId || source.sourceId,
    }))
  )

  const safePayload = {
    sources: sources.map(source => ({
      sourceId: source.sourceId,
      title: source.title,
      owner: source.owner,
      currentStatus: source.currentStatus,
      validation: source.validation,
      completionState: source.completionState,
      blocksStrategyReadiness: source.blocksStrategyReadiness,
      freshnessStatus: source.freshnessStatus,
      coverageStatus: source.coverageStatus,
      sensitivityTier: source.sensitivityTier,
      targetKeys: source.targetKeys,
      connectorIds: source.connectorIds,
      evidenceRefs: source.evidenceRefs,
      blockerCards: source.blockerCards,
      reason: source.reason,
      nextAction: source.nextAction,
      lastProofCommand: source.lastProofCommand,
    })),
    targets: targets.map(target => ({
      targetKey: target.targetKey,
      sourceId: target.sourceId,
      status: target.status,
      runtimeMode: target.runtimeMode,
      schedulerMode: target.schedulerMode,
      counts: target.counts,
      budgetCaps: target.budgetCaps,
      evidenceRefs: target.evidenceRefs,
    })),
  }
  const leakFindings = inspectMetadataLeaks(safePayload).map(finding => ({
    severity: 'critical',
    sourceId: null,
    check: finding.type,
    detail: finding.detail,
    blockerCards: [],
    nextAction: 'Remove raw/private content from source completion proof output.',
  }))

  const allFindings = [
    ...findings,
    ...dynamicCoverage.findings.map(finding => ({
      severity: finding.severity || 'critical',
      sourceId: finding.sourceId || null,
      check: finding.type || finding.id,
      detail: finding.detail,
      blockerCards: [],
      nextAction: 'Add terminal lifecycle coverage for required sources, or mark future/gap sources explicitly optional before they can bypass readiness.',
    })),
    ...sourceFindings,
    ...leakFindings,
  ]
  const terminalStateCounts = sources.reduce((counts, source) => {
    counts[source.completionState] = (counts[source.completionState] || 0) + 1
    return counts
  }, {})
  const readinessBlocker = normalizeList(foundationHub.backlogItems)
    .find(item => item.id === SOURCE_LIFECYCLE_COMPLETION_CARD_ID)
  const closeout = getFoundationBuildCloseouts()
    .find(record => record.key === SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY) || null
  const readinessStatus = buildFoundationReadinessStatus({
    foundationHub,
    closeouts: getFoundationBuildCloseouts(),
    repo: { packageJson: { scripts: {} } },
    repoHead,
  })

  return {
    status: allFindings.length ? 'risk' : 'healthy',
    generatedAt,
    repoHead,
    cardId: SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    closeoutKey: SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
    summaryMarker: SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER,
    summary: {
      sourceContractCount: sourceContracts.length,
      dynamicSourceContractCount: sourceContracts.length,
      terminalSourceCount: sources.length,
      requiredSourceCount: dynamicCoverage.summary.requiredSourceCount,
      governedRequiredSourceCount: dynamicCoverage.summary.governedRequiredSourceCount,
      optionalUnruledSourceCount: dynamicCoverage.summary.optionalUnruledSourceCount,
      requiredMissingTerminalRuleCount: dynamicCoverage.summary.requiredMissingTerminalRuleCount,
      terminalRuleMissingContractCount: dynamicCoverage.summary.terminalRuleMissingContractCount,
      requiredMissingLifecycleRowCount: dynamicCoverage.summary.requiredMissingLifecycleRowCount,
      loadBearingSourceCount: SOURCE_LIFECYCLE_LOAD_BEARING_SOURCE_IDS.length,
      acceptedBlockedSourceCount: SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS.length,
      extractionTargetCount: targets.length,
      expectedExtractionTargetCount: SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
      terminalStateCounts,
      sourcesWithFindings: new Set(allFindings.map(finding => finding.sourceId).filter(Boolean)).size,
      findingCount: allFindings.length,
      privateOrRawLeakFindings: leakFindings.length,
      extractionCapsUnchanged: sourceLifecycle.summary?.extractionCapsUnchanged === true,
      targetBaselineChanges: Number(sourceLifecycle.summary?.targetBaselineChanges || 0),
      targetBaselineExtraTargets: Number(sourceLifecycle.summary?.targetBaselineExtraTargets || 0),
      targetBaselineMissingTargets: Number(sourceLifecycle.summary?.targetBaselineMissingTargets || 0),
      blockedPausedPlannedActivated: Number(sourceLifecycle.summary?.blockedPausedPlannedActivated || 0),
      closeoutRecorded: Boolean(closeout),
      liveBacklogLane: readinessBlocker?.lane || 'missing',
      liveBacklogHasCloseoutKey: normalizeText(readinessBlocker?.statusNote).includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY),
      readinessStillNamesSourceLifecycleCompletion: normalizeList(readinessStatus.blockingCards).includes(SOURCE_LIFECYCLE_COMPLETION_CARD_ID),
    },
    sources: safePayload.sources,
    targets: safePayload.targets,
    findings: allFindings,
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

function includesAll(source, values) {
  return values.every(value => source.includes(value))
}

export async function buildSourceLifecycleCompletionCheck({
  repoRoot = defaultRepoRoot,
  sourceLifecycle = null,
  sourceOfTruth = null,
  foundationHub = null,
  repoHead = null,
} = {}) {
  const findings = []
  const packageJson = await readOptionalText(repoRoot, 'package.json')
  const registrySource = await readOptionalText(repoRoot, 'lib/source-lifecycle-completion.js')
  const scriptSource = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH)
  const readinessSource = await readOptionalText(repoRoot, 'lib/foundation-readiness-gates.js')
  const verifySource = await readOptionalText(repoRoot, 'scripts/foundation-verify.mjs')
  const planSource = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH)
  const approvalSource = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH)
  const docSource = await readOptionalText(repoRoot, SOURCE_LIFECYCLE_COMPLETION_DOC_PATH)
  const currentPlan = await readOptionalText(repoRoot, 'docs/rebuild/current-plan.md')
  const currentState = await readOptionalText(repoRoot, 'docs/rebuild/current-state.md')
  const buildLogSource = await readFoundationBuildLogRegistrySource(repoRoot)

  const status = buildSourceLifecycleCompletionStatus({
    sourceLifecycle,
    sourceOfTruth,
    foundationHub,
    repoHead,
  })

  addFinding(findings, status.status === 'healthy', 'source completion status is healthy', `findings=${status.findings.length}`)
  addFinding(findings, packageJson.includes('"process:source-lifecycle-completion-check"'), 'package script exists', 'process:source-lifecycle-completion-check')
  addFinding(findings, registrySource.includes('SOURCE_LIFECYCLE_COMPLETION_RULES'), 'central completion registry exists', 'SOURCE_LIFECYCLE_COMPLETION_RULES')
  addFinding(findings, registrySource.includes('buildSourceLifecycleDynamicCoverage'), 'dynamic source lifecycle coverage helper is used', 'buildSourceLifecycleDynamicCoverage')
  addFinding(findings, registrySource.includes('SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS'), 'accepted-blocked source group exists', 'accepted blocked group')
  addFinding(findings, scriptSource.includes(SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER), 'focused proof script emits summary marker', SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER)
  addFinding(findings, readinessSource.includes(`closeoutKey: '${SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY}'`), 'readiness gate requires source lifecycle completion closeout', SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY)
  addFinding(findings, verifySource.includes('buildSourceLifecycleCompletionStatus') && verifySource.includes('SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY'), 'foundation verifier covers source lifecycle completion', SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY)
  addFinding(findings, approvalSource.includes('"approvalSchemaVersion": 2') && approvalSource.includes('"score": 9.8'), 'approval artifact exists and records 9.8 approval', SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH)
  addFinding(findings, planSource.includes('source contracts must be revalidated'), 'approved plan records all-source revalidation scope', SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH)
  addFinding(findings, docSource.includes('Source Lifecycle Completion Closeout') && docSource.includes('metadata-only'), 'operator closeout doc exists', SOURCE_LIFECYCLE_COMPLETION_DOC_PATH)
  addFinding(findings, buildLogSource.includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY), 'build-log closeout exists', SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY)
  addFinding(findings, currentPlan.includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY), 'current plan records source lifecycle completion closeout', 'current-plan')
  addFinding(findings, currentState.includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY), 'current state records source lifecycle completion closeout', 'current-state')
  addFinding(findings, status.summary.liveBacklogLane === 'done', 'live backlog card is done', status.summary.liveBacklogLane)
  addFinding(findings, status.summary.liveBacklogHasCloseoutKey === true, 'live backlog card records closeout key', String(status.summary.liveBacklogHasCloseoutKey))
  addFinding(findings, status.summary.readinessStillNamesSourceLifecycleCompletion === false, 'foundation readiness no longer names source lifecycle completion blocker', String(status.summary.readinessStillNamesSourceLifecycleCompletion))
  addFinding(findings, status.summary.privateOrRawLeakFindings === 0, 'source completion proof is metadata-only', String(status.summary.privateOrRawLeakFindings))
  addFinding(findings, status.summary.requiredMissingTerminalRuleCount === 0, 'no required source is missing terminal coverage', String(status.summary.requiredMissingTerminalRuleCount))
  addFinding(findings, status.summary.terminalRuleMissingContractCount === 0, 'no terminal lifecycle rule points at a missing source contract', String(status.summary.terminalRuleMissingContractCount))

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    closeoutKey: SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
    summary: status.summary,
    findings: [
      ...findings,
      ...status.findings,
    ],
    completion: status,
  }
}
