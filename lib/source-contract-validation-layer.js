import { getGroupedSourceSystems, getSourceConnectors, getSourceContracts } from './source-contracts.js'
import { isValidSourceContractRegistryId } from './source-contract-registry-table.js'
import {
  SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS,
  SOURCE_LIFECYCLE_COMPLETION_BLOCKED_RULES,
  SOURCE_LIFECYCLE_COMPLETION_RULES,
} from './source-lifecycle-completion.js'

export const SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID = 'SOURCE-CONTRACT-VALIDATION-LAYER-001'
export const SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY = 'source-contract-validation-layer-v1'
export const SOURCE_CONTRACT_VALIDATION_LAYER_PLAN_PATH = 'docs/process/source-contract-validation-layer-001-plan.md'
export const SOURCE_CONTRACT_VALIDATION_LAYER_APPROVAL_PATH = 'docs/process/approvals/SOURCE-CONTRACT-VALIDATION-LAYER-001.json'
export const SOURCE_CONTRACT_VALIDATION_LAYER_SCRIPT_PATH = 'scripts/process-source-contract-validation-layer-check.mjs'
export const SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-source-contract-validation-layer-closeout.md'
export const SOURCE_CONTRACT_VALIDATION_LAYER_SPRINT_ID = 'source-contract-validation-layer-2026-05-17'

export const SOURCE_CONTRACT_AUTH_POSTURES = [
  'no_auth_internal',
  'delegated_google_read',
  'api_key_read',
  'oauth_read_validated',
  'oauth_required',
  'owner_authorization_required',
  'unknown_auth_blocked',
]

export const SOURCE_CONTRACT_EXTRACTION_POSTURES = [
  'no_extraction_required',
  'read_only_manual',
  'governed_extraction_allowed',
  'proposal_only',
  'blocked_until_authorized',
  'blocked_until_scoped',
]

export const SOURCE_CONTRACT_CONNECTOR_STATUSES = [
  'not_applicable',
  'working',
  'read_only_working',
  'available_pending_validation',
  'missing',
  'blocked',
]

export const SOURCE_CONTRACT_ATOM_FLOW_EXPECTATIONS = [
  'none_required',
  'eligible_now',
  'eligible_after_contract',
  'proposal_only',
  'blocked',
]

export const SOURCE_CONTRACT_FRESHNESS_MODES = [
  'repo_change_review',
  'source_owner_review',
  'stale_after_days',
  'read_only_reference',
  'blocked',
  'not_applicable',
]

const AUTH_REQUIRED_POSTURES = new Set([
  'oauth_required',
  'owner_authorization_required',
  'unknown_auth_blocked',
])

const BLOCKED_EXTRACTION_POSTURES = new Set([
  'blocked_until_authorized',
  'blocked_until_scoped',
])

const STARTABLE_EXTRACTION_POSTURES = new Set([
  'read_only_manual',
  'governed_extraction_allowed',
  'proposal_only',
])

const NO_AGE_FRESHNESS_MODES = new Set([
  'repo_change_review',
  'source_owner_review',
  'read_only_reference',
  'blocked',
  'not_applicable',
])

const ACTIVE_TARGET_STATUSES = new Set(['active'])
const ACTIVE_RUNTIME_MODES = new Set(['scheduled'])

function profile(input = {}) {
  return {
    lanes: [],
    connectorIds: [],
    blockerCards: [],
    ...input,
  }
}

function freshness(mode, details = {}) {
  return {
    mode,
    description: details.description || '',
    maxAgeDays: details.maxAgeDays ?? null,
  }
}

export const SOURCE_CONTRACT_VALIDATION_PROFILES = Object.freeze({
  'SRC-STRATEGY-001': profile({
    lanes: ['Foundation / Control Plane', 'Strategy / Leadership'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'no_extraction_required',
    freshnessExpectation: freshness('repo_change_review', { description: 'Review on repo strategy-doc changes.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-STRATEGY-QUARTER-001': profile({
    lanes: ['Strategy / Leadership'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'blocked_until_scoped',
    freshnessExpectation: freshness('blocked', { description: 'Future Strategy Hub input layer is not live.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-MYICRO-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Agent Onboarding'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Logged-in training access and content-use boundaries require Steve approval.' }),
    connectorStatus: 'blocked',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-FREEDOM-TEAM-001': profile({
    lanes: ['Strategy / Leadership', 'People / Retention'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Current-reality sheet meaning is source-owner reviewed.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-FREEDOM-COMMUNITY-001': profile({
    lanes: ['Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Current-reality community tracker meaning is source-owner reviewed.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-FREEDOM-COMMUNITY-REV-001': profile({
    lanes: ['Strategy / Leadership', 'Finance'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Current-reality community revenue meaning is source-owner reviewed.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-FREEDOM-ENGINE-001': profile({
    lanes: ['Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Agent Engine values are refreshed through governed sheet reads.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-FREEDOM-BHAG-001': profile({
    lanes: ['Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'BHAG live planning inputs are source-owner reviewed.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-OWNERS-001': profile({
    lanes: ['Operations', 'Closing / Deals', 'Sales', 'Finance'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Owners Admin source meaning is signed off and read through the sheet connector.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-OWNERS-LISTS-001': profile({
    lanes: ['Operations', 'Sales'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Owners Lists source owns governed dropdown/list truth.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-FINANCE-001': profile({
    lanes: ['Finance', 'Operations'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('source_owner_review', { description: 'Finance source is signed off for current reality and owner-reviewed.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-CLICKUP-001': profile({
    lanes: ['Operations', 'Review Queues / Accountability', 'Agent Onboarding'],
    authPosture: 'api_key_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 45, description: 'ClickUp source boundary needs recent verifier proof.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-CLICKUP-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-GMAIL-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Delegated Gmail read posture is monitored by scheduled current-day sync.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GMAIL-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-GCAL-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Calendar current-day archive keeps event source freshness visible.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GCAL-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-GDRIVE-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Drive content/inventory lanes have governed extraction control.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GDRIVE-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-GDOCS-001': profile({
    lanes: ['Source Intelligence / Extraction'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Google Docs source type is validated through delegated Drive export.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GDRIVE-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-GSHEETS-001': profile({
    lanes: ['Source Intelligence / Extraction'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Google Sheets source type is validated through delegated Sheets API.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GSHEETS-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-GSLIDES-001': profile({
    lanes: ['Source Intelligence / Extraction'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'blocked_until_scoped',
    freshnessExpectation: freshness('blocked', { description: 'Slides content extraction is scoped but not built.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GDRIVE-001'],
    atomFlowExpectation: 'blocked',
    blockerCards: ['DRIVE-CONTENT-001'],
    blockedReason: 'Google Slides source typing is reconciled; full Slides content extraction remains a follow-up lane.',
    nextAction: 'Build a scoped Slides extraction lane only after Drive content extraction readiness approves it.',
  }),
  'SRC-VIDEO-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Marketing - Agents'],
    authPosture: 'api_key_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Video manifest and transcript lanes are governed by extraction control.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-DATAFORSEO-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-CREATOR-WATCHLIST-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Marketing - Agents'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'blocked_until_scoped',
    freshnessExpectation: freshness('blocked', { description: 'Creator watchlist is internal source truth; external extraction is future work.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'proposal_only',
  }),
  'SRC-YOUTUBE-INTEL-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Marketing - Agents'],
    authPosture: 'api_key_read',
    extractionPosture: 'blocked_until_scoped',
    freshnessExpectation: freshness('blocked', { description: 'Richer YouTube discovery/creator intelligence is future work.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-DATAFORSEO-001'],
    atomFlowExpectation: 'proposal_only',
  }),
  'SRC-GITHUB-BUILD-INTEL-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Foundation / Control Plane'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'proposal_only',
    freshnessExpectation: freshness('read_only_reference', { description: 'Public GitHub Build Intel is read-only/proposal-only.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'proposal_only',
  }),
  'SRC-FOUNDATION-BUILD-CLOSEOUTS-001': profile({
    lanes: ['Foundation / Control Plane', 'Review Queues / Accountability'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'no_extraction_required',
    freshnessExpectation: freshness('repo_change_review', { description: 'Closeout records update through governed repo card closeouts.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'none_required',
  }),
  'SRC-LOOM-001': profile({
    lanes: ['Source Intelligence / Extraction'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'No approved Loom extraction path exists.' }),
    connectorStatus: 'blocked',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-SKOOL-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Agent Onboarding'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Skool corpus access requires approved export/API/admin path.' }),
    connectorStatus: 'blocked',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-SLACK-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Operations'],
    authPosture: 'api_key_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Slack archive/current-day sync proves read freshness.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-SLACK-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-MISSIVE-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Operations'],
    authPosture: 'api_key_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Missive archive/current-day sync proves read freshness.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-MISSIVE-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-MEETINGS-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Strategy / Leadership'],
    authPosture: 'delegated_google_read',
    extractionPosture: 'governed_extraction_allowed',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Meeting archive/current-day sync proves read freshness.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GDRIVE-001', 'CONN-GCAL-001'],
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-DATAFORSEO-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Marketing - Agents'],
    authPosture: 'api_key_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'DataForSEO read capability is connector-verified.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-DATAFORSEO-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-FUB-001': profile({
    lanes: ['Sales', 'Operations'],
    authPosture: 'api_key_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'FUB readable-only posture is monitored by source verification.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-FUB-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-GHL-001': profile({
    lanes: ['Marketing - Agents', 'Operations'],
    authPosture: 'api_key_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'GHL readable source role remains under review.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-GHL-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-SUPABASE-001': profile({
    lanes: ['Sales', 'Foundation / Control Plane'],
    authPosture: 'api_key_read',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Supabase KPI health probes own freshness metadata.' }),
    connectorStatus: 'read_only_working',
    atomFlowExpectation: 'eligible_now',
  }),
  'SRC-GADS-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients'],
    authPosture: 'oauth_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Google Ads OAuth needs revalidation before use.' }),
    connectorStatus: 'available_pending_validation',
    connectorIds: ['CONN-GADS-001'],
    atomFlowExpectation: 'blocked',
  }),
  'SRC-META-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients'],
    authPosture: 'oauth_read_validated',
    extractionPosture: 'read_only_manual',
    freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 90, description: 'Meta read capability is connector-verified but marketing source meaning is open.' }),
    connectorStatus: 'working',
    connectorIds: ['CONN-META-001'],
    atomFlowExpectation: 'eligible_after_contract',
  }),
  'SRC-PUBLISH-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients'],
    authPosture: 'unknown_auth_blocked',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Social publishing owner/user auth context is not validated.' }),
    connectorStatus: 'blocked',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-GA4-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients', 'Strategy / Leadership'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'GA4 property/account authorization and brand-lane map are not validated.' }),
    connectorStatus: 'available_pending_validation',
    connectorIds: ['CONN-GA4-001'],
    atomFlowExpectation: 'blocked',
    blockerCards: ['SOURCE-016'],
    blockedReason: 'GA4 source contract is scoped, but property IDs, auth posture, and brand-lane ownership are not approved.',
    nextAction: 'Approve a scoped GA4 read/extraction card only after property/account IDs, allowed reads, and cost boundaries are confirmed.',
  }),
  'SRC-GSC-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients', 'Strategy / Leadership'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Search Console site-property authorization and brand-lane map are not validated.' }),
    connectorStatus: 'available_pending_validation',
    connectorIds: ['CONN-GSC-001'],
    atomFlowExpectation: 'blocked',
    blockerCards: ['SOURCE-016'],
    blockedReason: 'Search Console source contract is scoped, but site URLs, auth posture, and brand-lane ownership are not approved.',
    nextAction: 'Approve a scoped Search Console read/extraction card only after site-property IDs, allowed reads, and cost boundaries are confirmed.',
  }),
  'SRC-GBP-001': profile({
    lanes: ['Marketing - Clients', 'People / Retention', 'Sales'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Business Profile account/location authorization and review-use boundary are not validated.' }),
    connectorStatus: 'available_pending_validation',
    connectorIds: ['CONN-GBP-001'],
    atomFlowExpectation: 'blocked',
    blockerCards: ['SOURCE-016', 'SOURCE-022'],
    blockedReason: 'Google Business Profile source contract is scoped, but account/location IDs, auth posture, and review-use boundaries are not approved.',
    nextAction: 'Approve a scoped GBP read/extraction card only after account/location IDs, allowed reads, review use, and cost boundaries are confirmed.',
  }),
  'SRC-REAL-001': profile({
    lanes: ['Finance', 'Operations'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Real Broker API is not connected.' }),
    connectorStatus: 'missing',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-EMAIL-TEAM-001': profile({
    lanes: ['Source Intelligence / Extraction', 'Operations'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Team-wide email access beyond governed shared-comms lanes is not approved.' }),
    connectorStatus: 'blocked',
    connectorIds: ['CONN-GMAIL-001'],
    atomFlowExpectation: 'blocked',
  }),
  'SRC-REVIEWS-001': profile({
    lanes: ['People / Retention', 'Marketing - Clients'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Client review/survey source ownership is not connected.' }),
    connectorStatus: 'missing',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-TRAINING-001': profile({
    lanes: ['Agent Onboarding', 'Source Intelligence / Extraction'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Live training completion tracker source is unknown.' }),
    connectorStatus: 'missing',
    atomFlowExpectation: 'blocked',
  }),
  'SRC-CONTENT-001': profile({
    lanes: ['Marketing - Agents', 'Marketing - Clients'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Published content metrics are not connected as source-owned truth.' }),
    connectorStatus: 'missing',
    atomFlowExpectation: 'blocked',
  }),
})

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values = []) {
  return Array.from(new Set(normalizeList(values).map(value => normalizeText(value)).filter(Boolean)))
}

function byKey(values = [], key) {
  return new Map(normalizeList(values).map(value => [normalizeText(value?.[key]), value]).filter(([itemKey]) => Boolean(itemKey)))
}

function addFinding(findings, ok, check, detail = '', metadata = {}) {
  findings.push({ ok: Boolean(ok), check, detail, ...metadata })
}

function isExtractionTargetActive(target = {}) {
  return ACTIVE_TARGET_STATUSES.has(normalizeText(target.status).toLowerCase()) ||
    ACTIVE_RUNTIME_MODES.has(normalizeText(target.effectiveRuntimeMode || target.runtimeMode).toLowerCase())
}

function parseDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  const parsed = new Date(`${text}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function ageDays(lastVerified, asOf = new Date()) {
  const verifiedAt = parseDate(lastVerified)
  if (!verifiedAt) return null
  return Math.floor((asOf.getTime() - verifiedAt.getTime()) / 86400000)
}

function isFreshnessExpectationValid(expectation = {}) {
  if (!expectation || typeof expectation !== 'object' || Array.isArray(expectation)) return false
  const mode = normalizeText(expectation.mode)
  if (!SOURCE_CONTRACT_FRESHNESS_MODES.includes(mode)) return false
  if (NO_AGE_FRESHNESS_MODES.has(mode)) return true
  return Number.isFinite(Number(expectation.maxAgeDays)) && Number(expectation.maxAgeDays) > 0
}

function lifecycleRuleBySourceId() {
  return byKey(SOURCE_LIFECYCLE_COMPLETION_RULES, 'sourceId')
}

function buildDerivedLaneMap(groupedSourceSystems = getGroupedSourceSystems()) {
  const lanesBySource = new Map()
  for (const system of normalizeList(groupedSourceSystems)) {
    const lanes = unique([
      system.serviceArea,
      ...normalizeList(system.secondaryServiceAreas),
    ])
    for (const sourceId of normalizeList(system.sourceIds)) {
      const existing = lanesBySource.get(sourceId) || []
      lanesBySource.set(sourceId, unique([...existing, ...lanes]))
    }
  }
  return lanesBySource
}

function buildValidationRows({
  sourceContracts,
  profiles,
  sourceConnectors,
  groupedSourceSystems,
  extractionTargets,
  sourceRegistryText,
  currentStateText,
  asOf,
} = {}) {
  const ruleBySource = lifecycleRuleBySourceId()
  const connectorById = byKey(sourceConnectors, 'connectorId')
  const lanesBySource = buildDerivedLaneMap(groupedSourceSystems)
  const targetsBySource = new Map()
  for (const target of normalizeList(extractionTargets)) {
    const sourceId = normalizeText(target.sourceId || target.source_id)
    if (!sourceId) continue
    if (!targetsBySource.has(sourceId)) targetsBySource.set(sourceId, [])
    targetsBySource.get(sourceId).push(target)
  }

  return normalizeList(sourceContracts).map(contract => {
    const sourceId = normalizeText(contract.sourceId || contract.id)
    const profileRow = profiles[sourceId] || null
    const rule = ruleBySource.get(sourceId) || {}
    const lanes = unique([
      ...normalizeList(profileRow?.lanes),
      ...normalizeList(lanesBySource.get(sourceId)),
    ])
    const targets = targetsBySource.get(sourceId) || []
    const activeTargets = targets.filter(isExtractionTargetActive)
    const authPosture = normalizeText(profileRow?.authPosture)
    const extractionPosture = normalizeText(profileRow?.extractionPosture)
    const connectorStatus = normalizeText(profileRow?.connectorStatus)
    const atomFlowExpectation = normalizeText(profileRow?.atomFlowExpectation)
    const authRequired = AUTH_REQUIRED_POSTURES.has(authPosture)
    const extractionBlocked = BLOCKED_EXTRACTION_POSTURES.has(extractionPosture)
    const blocked = authRequired || extractionBlocked || SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS.includes(sourceId)
    const blockedReason = normalizeText(profileRow?.blockedReason || rule.reason)
    const nextAction = normalizeText(profileRow?.nextAction || rule.nextAction)
    const blockerCards = unique([
      ...normalizeList(profileRow?.blockerCards),
      ...normalizeList(rule.blockerCards),
    ])
    const connectorIds = unique([
      ...normalizeList(profileRow?.connectorIds),
      ...normalizeList(rule.connectorIds),
    ])
    const missingConnectors = connectorIds.filter(connectorId => !connectorById.has(connectorId))
    const freshnessAgeDays = ageDays(contract.lastVerified, asOf)
    const freshnessExpectation = profileRow?.freshnessExpectation
    const findings = []

    addFinding(findings, isValidSourceContractRegistryId(sourceId), 'source ID uses registry-safe shape', sourceId, { sourceId })
    addFinding(findings, normalizeText(contract.owner), 'owner is present', contract.owner || 'missing', { sourceId })
    addFinding(findings, Boolean(profileRow), 'validation profile is present', sourceId, { sourceId })
    addFinding(findings, lanes.length > 0 || normalizeText(profileRow?.brandLaneNotApplicableReason), 'brand/lane is explicit where applicable', lanes.join(', ') || profileRow?.brandLaneNotApplicableReason || 'missing', { sourceId })
    addFinding(findings, SOURCE_CONTRACT_AUTH_POSTURES.includes(authPosture), 'auth posture is explicit and recognized', authPosture || 'missing', { sourceId })
    addFinding(findings, SOURCE_CONTRACT_EXTRACTION_POSTURES.includes(extractionPosture), 'extraction posture is explicit and recognized', extractionPosture || 'missing', { sourceId })
    addFinding(findings, isFreshnessExpectationValid(freshnessExpectation), 'freshness expectation is structured and recognized', JSON.stringify(freshnessExpectation || null), { sourceId })
    if (isFreshnessExpectationValid(freshnessExpectation) && freshnessExpectation.mode === 'stale_after_days') {
      const maxAgeDays = Number(freshnessExpectation.maxAgeDays)
      addFinding(findings, freshnessAgeDays !== null && freshnessAgeDays <= maxAgeDays, 'freshness expectation is not stale', `${freshnessAgeDays ?? 'missing'}d/${maxAgeDays}d`, { sourceId })
    }
    addFinding(findings, SOURCE_CONTRACT_CONNECTOR_STATUSES.includes(connectorStatus), 'connector status is explicit and recognized', connectorStatus || 'missing', { sourceId })
    addFinding(findings, missingConnectors.length === 0, 'declared connector IDs exist', missingConnectors.join(', ') || connectorIds.join(', ') || connectorStatus, { sourceId })
    if (['working', 'read_only_working'].includes(connectorStatus)) {
      addFinding(findings, connectorIds.length > 0 || connectorStatus === 'read_only_working', 'working connector status names connector IDs or an explicit read-only system path', connectorIds.join(', ') || 'read_only_system_path', { sourceId })
    }
    addFinding(findings, SOURCE_CONTRACT_ATOM_FLOW_EXPECTATIONS.includes(atomFlowExpectation), 'atom-flow expectation is explicit and recognized', atomFlowExpectation || 'missing', { sourceId })
    if (blocked) {
      addFinding(findings, blockedReason, 'blocked source has blocked reason', blockedReason || 'missing', { sourceId })
      addFinding(findings, nextAction, 'blocked source has next action', nextAction || 'missing', { sourceId })
      addFinding(findings, blockerCards.length > 0, 'blocked source has blocker card', blockerCards.join(', ') || 'missing', { sourceId })
    }
    if (authRequired) {
      addFinding(findings, extractionPosture === 'blocked_until_authorized', 'auth-required source cannot be extraction-ready', extractionPosture || 'missing', { sourceId })
      addFinding(findings, activeTargets.length === 0, 'auth-required source has no active extraction target', activeTargets.map(target => target.targetKey || target.target_key).join(', ') || 'none', { sourceId })
    }

    return {
      sourceId,
      title: contract.title || '',
      ok: findings.every(finding => finding.ok),
      findings,
      failures: findings.filter(finding => !finding.ok),
      lanes,
      authPosture,
      extractionPosture,
      freshnessExpectation,
      connectorStatus,
      connectorIds,
      atomFlowExpectation,
      blocked,
      blockedReason,
      nextAction,
      blockerCards,
      activeExtractionTargets: activeTargets.map(target => target.targetKey || target.target_key).filter(Boolean),
    }
  })
}

function validateDocs({ sourceRegistryText = '', currentStateText = '' } = {}) {
  const findings = []
  if (normalizeText(sourceRegistryText)) {
    addFinding(
      findings,
      sourceRegistryText.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
        sourceRegistryText.includes('blocked source contracts must carry blocker, reason, and next action'),
      'source registry documents validation-layer fail-closed contract',
      'docs/source-registry.md',
    )
  }
  if (normalizeText(currentStateText)) {
    addFinding(
      findings,
      currentStateText.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
        currentStateText.includes('thin source contracts now fail closed before connector or extractor work depends on them'),
      'current-state documents validation-layer current reality',
      'docs/rebuild/current-state.md',
    )
  }
  return findings
}

export function evaluateSourceContractValidationLayer({
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  groupedSourceSystems = getGroupedSourceSystems(),
  extractionTargets = [],
  profiles = SOURCE_CONTRACT_VALIDATION_PROFILES,
  sourceRegistryText = '',
  currentStateText = '',
  asOf = new Date(),
} = {}) {
  const sourceIds = unique(normalizeList(sourceContracts).map(contract => contract.sourceId || contract.id))
  const profileIds = unique(Object.keys(profiles || {}))
  const missingProfileIds = sourceIds.filter(sourceId => !profileIds.includes(sourceId))
  const extraProfileIds = profileIds.filter(sourceId => !sourceIds.includes(sourceId))
  const rows = buildValidationRows({
    sourceContracts,
    profiles,
    sourceConnectors,
    groupedSourceSystems,
    extractionTargets,
    sourceRegistryText,
    currentStateText,
    asOf,
  })
  const findings = [
    {
      ok: missingProfileIds.length === 0,
      check: 'every source contract has a validation profile',
      detail: missingProfileIds.join(', ') || `${sourceIds.length}/${sourceIds.length}`,
    },
    {
      ok: extraProfileIds.length === 0,
      check: 'validation profiles do not create phantom source IDs',
      detail: extraProfileIds.join(', ') || 'none',
    },
    ...validateDocs({ sourceRegistryText, currentStateText }),
  ]
  const rowFailures = rows.flatMap(row => row.failures)
  const failures = [
    ...findings.filter(finding => !finding.ok),
    ...rowFailures,
  ]
  const blockedRows = rows.filter(row => row.blocked)
  const authRequiredBlockedRows = rows.filter(row => AUTH_REQUIRED_POSTURES.has(row.authPosture))

  return {
    ok: failures.length === 0 && rows.every(row => row.ok),
    rows,
    findings,
    failures,
    summary: {
      contractCount: rows.length,
      profileCount: profileIds.length,
      passed: rows.filter(row => row.ok).length,
      failed: rows.filter(row => !row.ok).length,
      blockedCount: blockedRows.length,
      authRequiredBlockedCount: authRequiredBlockedRows.length,
      activeAuthRequiredExtractionTargetCount: authRequiredBlockedRows.reduce((count, row) => count + row.activeExtractionTargets.length, 0),
    },
  }
}

export function assertSourceContractAllowsExtraction(sourceId, validation = evaluateSourceContractValidationLayer()) {
  const row = (validation.rows || []).find(item => item.sourceId === sourceId)
  if (!row) {
    return { ok: false, sourceId, reason: 'source contract validation row missing' }
  }
  if (!row.ok) {
    return { ok: false, sourceId, reason: 'source contract validation failed', failures: row.failures }
  }
  if (AUTH_REQUIRED_POSTURES.has(row.authPosture)) {
    return { ok: false, sourceId, reason: 'auth-required source is blocked from extraction', row }
  }
  if (!STARTABLE_EXTRACTION_POSTURES.has(row.extractionPosture)) {
    return { ok: false, sourceId, reason: `extraction posture ${row.extractionPosture} does not allow extraction`, row }
  }
  return { ok: true, sourceId, row }
}

function withDocProof(input = {}) {
  return {
    sourceRegistryText: [
      SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
      'blocked source contracts must carry blocker, reason, and next action',
    ].join('\n'),
    currentStateText: [
      SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
      'thin source contracts now fail closed before connector or extractor work depends on them',
    ].join('\n'),
    ...input,
  }
}

export function buildSourceContractValidationLayerDogfoodProof() {
  const healthyContract = {
    sourceId: 'SRC-VALID-001',
    title: 'Valid no-auth source',
    owner: 'System',
    status: 'Verified',
    validation: 'Signed Off',
    lastVerified: '2026-05-17',
  }
  const healthyProfile = profile({
    lanes: ['Foundation / Control Plane'],
    authPosture: 'no_auth_internal',
    extractionPosture: 'no_extraction_required',
    freshnessExpectation: freshness('repo_change_review', { description: 'Repo changes trigger review.' }),
    connectorStatus: 'not_applicable',
    atomFlowExpectation: 'none_required',
  })
  const blockedContract = {
    sourceId: 'SRC-BLOCKED-001',
    title: 'Blocked auth source',
    owner: 'Steve',
    status: 'Gap',
    validation: 'Not Signed Off',
    lastVerified: '2026-05-17',
  }
  const blockedProfile = profile({
    lanes: ['Source Intelligence / Extraction'],
    authPosture: 'owner_authorization_required',
    extractionPosture: 'blocked_until_authorized',
    freshnessExpectation: freshness('blocked', { description: 'Needs owner approval.' }),
    connectorStatus: 'blocked',
    atomFlowExpectation: 'blocked',
    blockerCards: ['AUTH-BLOCKER-001'],
    blockedReason: 'Owner authorization is not approved.',
    nextAction: 'Get owner approval before extraction.',
  })
  const validNoAuth = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [healthyContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-VALID-001': healthyProfile },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const missingOwner = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [{ ...healthyContract, owner: '' }],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-VALID-001': healthyProfile },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const missingAuthPosture = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [healthyContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-VALID-001': { ...healthyProfile, authPosture: '' } },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const missingExtractionPosture = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [healthyContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-VALID-001': { ...healthyProfile, extractionPosture: '' } },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const blockedWithoutReason = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [blockedContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-BLOCKED-001': { ...blockedProfile, blockedReason: '', nextAction: '', blockerCards: [] } },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const staleFreshness = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [{ ...healthyContract, lastVerified: '2025-01-01' }],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: {
      'SRC-VALID-001': {
        ...healthyProfile,
        freshnessExpectation: freshness('stale_after_days', { maxAgeDays: 30, description: 'Must be fresh.' }),
      },
    },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const fuzzyFreshness = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [healthyContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [],
    profiles: { 'SRC-VALID-001': { ...healthyProfile, freshnessExpectation: 'fresh-ish' } },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const authRequiredBlocked = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [blockedContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [{ targetKey: 'blocked-target', sourceId: 'SRC-BLOCKED-001', status: 'blocked', runtimeMode: 'paused' }],
    profiles: { 'SRC-BLOCKED-001': blockedProfile },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const authRequiredActiveTarget = evaluateSourceContractValidationLayer(withDocProof({
    sourceContracts: [blockedContract],
    sourceConnectors: [],
    groupedSourceSystems: [],
    extractionTargets: [{ targetKey: 'unsafe-target', sourceId: 'SRC-BLOCKED-001', status: 'active', runtimeMode: 'scheduled' }],
    profiles: { 'SRC-BLOCKED-001': blockedProfile },
    asOf: new Date('2026-05-17T12:00:00.000Z'),
  }))
  const blockedExtractionGate = assertSourceContractAllowsExtraction('SRC-BLOCKED-001', authRequiredBlocked)

  return {
    ok: validNoAuth.ok === true &&
      missingOwner.ok === false &&
      missingAuthPosture.ok === false &&
      missingExtractionPosture.ok === false &&
      blockedWithoutReason.ok === false &&
      staleFreshness.ok === false &&
      fuzzyFreshness.ok === false &&
      authRequiredBlocked.ok === true &&
      blockedExtractionGate.ok === false &&
      authRequiredActiveTarget.ok === false,
    validNoAuth,
    missingOwner,
    missingAuthPosture,
    missingExtractionPosture,
    blockedWithoutReason,
    staleFreshness,
    fuzzyFreshness,
    authRequiredBlocked,
    blockedExtractionGate,
    authRequiredActiveTarget,
    invariant: 'Source contract validation accepts a valid no-auth source, keeps auth-required sources blocked from extraction, and rejects missing owner, missing auth posture, missing extraction posture, blocked sources without blocker/next action, stale/fuzzy freshness, and active extraction targets on auth-required sources.',
  }
}
