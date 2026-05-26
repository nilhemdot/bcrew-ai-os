import {
  GOD_MODE_REQUIRED_CAPABILITIES,
  GOD_MODE_REQUIRED_FAMILY_IDS,
  buildGodModeExtractorParitySnapshot,
} from './god-mode-extractor-parity-gate.js'

export const SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID = 'SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001'
export const SOURCE_FAMILY_GOD_MODE_EXTRACTORS_SCRIPT_PATH = 'scripts/process-source-family-god-mode-extractors-check.mjs'
export const SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CLOSEOUT_KEY = 'source-family-god-mode-extractors-v1'

export const SOURCE_FAMILY_GOD_MODE_REQUIRED_FIELDS = [
  'familyId',
  'label',
  'sourceOwner',
  'accessBoundary',
  'currentLevel',
  'modelRoute',
  'cadence',
  'latestSuccessfulRunAt',
  'freshnessStatus',
  'operatorBoundary',
  'godModeReady',
  'blockers',
  'nextCard',
  'nextBestAction',
  'capabilities',
]

const FRESHNESS_FAMILY_IDS_BY_PARITY_FAMILY = {
  'youtube-public-videos': ['youtube-build-intel'],
  'youtube-long-courses': ['youtube-build-intel'],
  'gmail-missive': ['gmail', 'missive'],
  slack: ['slack'],
  'meetings-transcripts': ['meetings'],
  'system-signals': ['gmail', 'missive', 'meetings', 'slack', 'youtube-build-intel'],
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function latestIso(values = []) {
  return list(values)
    .filter(Boolean)
    .map(value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date.toISOString()
    })
    .filter(Boolean)
    .sort()
    .at(-1) || null
}

function normalizeFreshnessWatermarks(freshnessSnapshot = {}) {
  return new Map(list(freshnessSnapshot.sourceFamilyWatermarks)
    .filter(item => item?.familyId)
    .map(item => [item.familyId, item]))
}

function watermarksForFamily(family = {}, freshnessByFamilyId = new Map()) {
  const freshnessIds = FRESHNESS_FAMILY_IDS_BY_PARITY_FAMILY[family.familyId] || []
  return freshnessIds.map(familyId => freshnessByFamilyId.get(familyId)).filter(Boolean)
}

function freshnessStatusFor(watermarks = []) {
  if (!watermarks.length) return 'not_tracked'
  if (watermarks.some(item => item.blockedByExtractor)) return 'blocked_by_extractor'
  if (watermarks.some(item => item.waitingForExtractor)) return 'waiting_for_extractor'
  if (watermarks.some(item => item.readyForSynthesis)) return 'ready_for_synthesis'
  if (watermarks.some(item => item.dirty)) return 'stale'
  if (watermarks.some(item => item.latestSuccessfulUpstreamAt || item.latestArchiveSuccessAt || item.latestExtractorSuccessAt)) return 'fresh'
  return 'not_started'
}

function latestSuccessFor(family = {}, watermarks = []) {
  return latestIso([
    family.latestRunAt,
    ...watermarks.flatMap(item => [
      item.latestExtractorSuccessAt,
      item.latestArchiveSuccessAt,
      item.latestSuccessfulUpstreamAt,
    ]),
  ])
}

function blockedJobKeysFor(watermarks = []) {
  return [...new Set(watermarks.flatMap(item => list(item.failedExtractorJobKeys)))]
}

function operatorBoundaryFor(family = {}) {
  const haystack = `${family.familyId} ${family.currentLevel} ${family.accessBoundary} ${family.nextCard}`.toLowerCase()
  if (haystack.includes('operator_excluded')) return 'operator_excluded'
  if (haystack.includes('paid') || haystack.includes('private') || haystack.includes('member')) return 'paid_private_requires_operator_approval'
  if (haystack.includes('source packet') || haystack.includes('source-packet')) return 'source_packet_required'
  if (haystack.includes('public') || family.familyId === 'github-repos') return 'public_or_approved_packet_only'
  if (haystack.includes('governed') || haystack.includes('internal')) return 'internal_governed_only'
  return 'source_boundary_required'
}

function nextBestActionFor(family = {}, freshnessStatus = 'not_tracked', blockedJobKeys = []) {
  const currentLevel = text(family.currentLevel).toLowerCase()
  const capabilities = family.capabilities || {}
  if (currentLevel.includes('operator_excluded')) return 'No active extractor work. Keep this excluded unless Steve explicitly reverses the decision.'
  if (freshnessStatus === 'blocked_by_extractor') return `Repair failed extractor jobs before synthesis freshness can be trusted: ${blockedJobKeys.join(', ') || 'tracked extractor failure'}.`
  if (freshnessStatus === 'waiting_for_extractor') return 'Run or repair the source-family extractor before claiming fresh source activity is synthesized.'
  if (currentLevel.includes('blocked_paid_private')) return 'Wait for Steve-approved paid/private source packet, session boundary, storage rules, and content-use limit.'
  if (currentLevel.includes('blocked_by_source_packet')) return 'Create and approve an exact source packet before any crawler, login, or browser Hands run.'
  if (capabilities.hands !== 'working' && capabilities.hands !== 'not_applicable' && !currentLevel.includes('planned')) return 'Prove source-appropriate Hands on an approved packet before any full God Mode claim.'
  if (currentLevel.includes('planned')) return 'Scope the source-specific worker and proof before scheduling live extraction.'
  if (currentLevel.includes('partial')) return 'Close the named next card, then rerun synthesis freshness and parity proof.'
  return family.nextCard ? `Continue ${family.nextCard}.` : 'Keep monitoring this source family through the maturity proof.'
}

function familyMaturityState(family = {}, freshnessStatus = 'not_tracked') {
  const currentLevel = text(family.currentLevel).toLowerCase()
  if (currentLevel.includes('operator_excluded')) return 'operator_excluded'
  if (currentLevel.includes('blocked') || freshnessStatus === 'blocked_by_extractor') return 'blocked'
  if (freshnessStatus === 'waiting_for_extractor') return 'waiting_for_extractor'
  if (currentLevel.includes('planned') || freshnessStatus === 'not_started') return 'planned'
  if (currentLevel.includes('partial') || currentLevel.includes('readable') || currentLevel.includes('eyes_ears')) return 'partial'
  if (currentLevel === 'god_mode') return 'god_mode_claimed'
  return 'needs_review'
}

function allRequiredCapabilitiesWorking(family = {}) {
  return GOD_MODE_REQUIRED_CAPABILITIES.every(capability => family.capabilities?.[capability] === 'working')
}

function buildMaturityFamily(family = {}, freshnessByFamilyId = new Map()) {
  const watermarks = watermarksForFamily(family, freshnessByFamilyId)
  const freshnessStatus = freshnessStatusFor(watermarks)
  const blockedJobKeys = blockedJobKeysFor(watermarks)
  const latestSuccessfulRunAt = latestSuccessFor(family, watermarks)
  const operatorBoundary = operatorBoundaryFor(family)
  const blockers = [
    ...list(family.blockers),
    ...blockedJobKeys.map(jobKey => `Freshness blocked by failed extractor job ${jobKey}.`),
  ]
  const godModeReady = text(family.currentLevel) === 'god_mode' &&
    allRequiredCapabilitiesWorking(family) &&
    blockers.length === 0 &&
    !['blocked_by_extractor', 'waiting_for_extractor', 'stale', 'ready_for_synthesis'].includes(freshnessStatus)

  return {
    ...family,
    latestSuccessfulRunAt,
    freshnessStatus,
    operatorBoundary,
    maturityState: familyMaturityState(family, freshnessStatus),
    godModeReady,
    blockedExtractorJobKeys: blockedJobKeys,
    nextBestAction: nextBestActionFor(family, freshnessStatus, blockedJobKeys),
  }
}

export function buildSourceFamilyGodModeMaturitySnapshot({
  paritySnapshot = buildGodModeExtractorParitySnapshot(),
  freshnessSnapshot = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const freshnessByFamilyId = normalizeFreshnessWatermarks(freshnessSnapshot)
  const families = list(paritySnapshot.families).map(family => buildMaturityFamily(family, freshnessByFamilyId))
  const summary = {
    familyCount: families.length,
    godModeReadyCount: families.filter(family => family.godModeReady).length,
    operatorExcludedCount: families.filter(family => family.maturityState === 'operator_excluded').length,
    blockedCount: families.filter(family => family.maturityState === 'blocked').length,
    waitingForExtractorCount: families.filter(family => family.maturityState === 'waiting_for_extractor').length,
    partialCount: families.filter(family => family.maturityState === 'partial').length,
    plannedCount: families.filter(family => family.maturityState === 'planned').length,
    handsGapCount: families.filter(family => family.capabilities?.hands && !['working', 'not_applicable', 'operator_excluded'].includes(family.capabilities.hands)).length,
  }
  return {
    cardId: SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID,
    generatedAt,
    parityCardId: paritySnapshot.cardId,
    freshnessStatus: freshnessSnapshot.status || 'not_loaded',
    families,
    summary,
  }
}

function hasRequiredField(family = {}, field = '') {
  if (field === 'latestSuccessfulRunAt') return Object.hasOwn(family, field)
  if (field === 'godModeReady') return typeof family.godModeReady === 'boolean'
  if (field === 'blockers') return Array.isArray(family.blockers)
  if (field === 'capabilities') return family.capabilities && typeof family.capabilities === 'object'
  return Boolean(family[field])
}

export function evaluateSourceFamilyGodModeMaturity(snapshot = buildSourceFamilyGodModeMaturitySnapshot()) {
  const findings = []
  const families = list(snapshot.families)
  const familyIds = new Set(families.map(family => family.familyId))
  for (const familyId of GOD_MODE_REQUIRED_FAMILY_IDS) {
    if (!familyIds.has(familyId)) findings.push({ familyId, ruleId: 'required_family_missing', detail: 'source-family maturity row missing' })
  }
  for (const family of families) {
    const missingFields = SOURCE_FAMILY_GOD_MODE_REQUIRED_FIELDS.filter(field => !hasRequiredField(family, field))
    if (missingFields.length) findings.push({ familyId: family.familyId, ruleId: 'required_fields_missing', detail: missingFields.join(', ') })
    if (family.godModeReady || text(family.currentLevel) === 'god_mode') {
      if (!allRequiredCapabilitiesWorking(family)) findings.push({ familyId: family.familyId, ruleId: 'god_mode_capability_not_proven', detail: 'required capabilities are not all working' })
      if (list(family.blockers).length) findings.push({ familyId: family.familyId, ruleId: 'god_mode_has_blockers', detail: family.blockers[0] || 'blocker present' })
      if (['blocked_by_extractor', 'waiting_for_extractor', 'stale', 'ready_for_synthesis'].includes(family.freshnessStatus)) {
        findings.push({ familyId: family.familyId, ruleId: 'god_mode_freshness_not_current', detail: family.freshnessStatus })
      }
    }
    if (/skool|myicor|paid|private/i.test(`${family.familyId} ${family.accessBoundary}`) && family.godModeReady) {
      findings.push({ familyId: family.familyId, ruleId: 'paid_private_requires_operator_approval', detail: family.operatorBoundary })
    }
    if (family.familyId === 'youtube-public-comments' && family.maturityState !== 'operator_excluded') {
      findings.push({ familyId: family.familyId, ruleId: 'comments_must_remain_operator_excluded', detail: family.maturityState })
    }
    if (!family.nextBestAction) findings.push({ familyId: family.familyId, ruleId: 'next_best_action_missing', detail: 'plain-English next action required' })
  }
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: snapshot.cardId || SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID,
    summary: snapshot.summary || {},
    findings,
  }
}

function forceCapabilitiesWorking(family = {}) {
  const capabilities = { ...(family.capabilities || {}) }
  for (const capability of GOD_MODE_REQUIRED_CAPABILITIES) capabilities[capability] = 'working'
  return capabilities
}

export function buildSourceFamilyGodModeMaturityDogfoodProof() {
  const validSnapshot = buildSourceFamilyGodModeMaturitySnapshot({
    paritySnapshot: buildGodModeExtractorParitySnapshot({ generatedAt: '2026-05-26T00:00:00.000Z' }),
    generatedAt: '2026-05-26T00:00:00.000Z',
  })
  const valid = evaluateSourceFamilyGodModeMaturity(validSnapshot)
  const falseYoutube = {
    ...validSnapshot,
    families: validSnapshot.families.map(family => family.familyId === 'youtube-public-videos'
      ? { ...family, currentLevel: 'god_mode', godModeReady: true, capabilities: forceCapabilitiesWorking(family) }
      : family),
  }
  const falsePaid = {
    ...validSnapshot,
    families: validSnapshot.families.map(family => family.familyId === 'myicor-paid-training'
      ? { ...family, currentLevel: 'god_mode', godModeReady: true, capabilities: forceCapabilitiesWorking(family), blockers: [] }
      : family),
  }
  const falseComments = {
    ...validSnapshot,
    families: validSnapshot.families.map(family => family.familyId === 'youtube-public-comments'
      ? { ...family, currentLevel: 'readable_partial', maturityState: 'partial', operatorBoundary: 'public_or_approved_packet_only' }
      : family),
  }
  const missingField = {
    ...validSnapshot,
    families: validSnapshot.families.map(family => family.familyId === 'github-repos'
      ? { ...family, modelRoute: '', nextBestAction: '' }
      : family),
  }
  const cases = [
    { name: 'current_maturity_snapshot_is_truthful', ok: valid.ok === true },
    { name: 'partial_youtube_god_mode_claim_fails', ok: evaluateSourceFamilyGodModeMaturity(falseYoutube).ok === false },
    { name: 'paid_private_god_mode_claim_fails', ok: evaluateSourceFamilyGodModeMaturity(falsePaid).ok === false },
    { name: 'comments_cannot_reenter_active_lane_by_accident', ok: evaluateSourceFamilyGodModeMaturity(falseComments).ok === false },
    { name: 'missing_required_maturity_fields_fail', ok: evaluateSourceFamilyGodModeMaturity(missingField).ok === false },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}
