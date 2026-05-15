import {
  isVerifiedCloseout,
} from './foundation-verifier-sprint-proof.js'

export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID = 'ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001'
export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SPRINT_ID = 'active-vs-historical-verifier-split-2026-05-15'
export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY = 'active-vs-historical-verifier-split-v1'
export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_PLAN_PATH = 'docs/process/active-vs-historical-verifier-split-001-plan.md'
export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_APPROVAL_PATH = 'docs/process/approvals/ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001.json'
export const ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH = 'scripts/process-active-vs-historical-verifier-split-check.mjs'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => normalizeText(value))
    .filter(Boolean)
}

function normalizeCloseoutKey(closeout) {
  return normalizeText(closeout?.key || closeout?.closeoutKey || closeout?.closeout_key)
}

function normalizeCardLane(card) {
  return normalizeText(card?.lane || card?.backlogLane || card?.backlog_lane).toLowerCase()
}

export function findVerifiedCloseoutForCard({
  closeouts = [],
  cardId = '',
  closeoutKey = '',
} = {}) {
  const normalizedCardId = normalizeText(cardId)
  const normalizedCloseoutKey = normalizeText(closeoutKey)
  if (!normalizedCardId || !normalizedCloseoutKey) return null

  return (Array.isArray(closeouts) ? closeouts : []).find(closeout =>
    normalizeCloseoutKey(closeout) === normalizedCloseoutKey &&
      normalizeList(closeout?.backlogIds || closeout?.backlog_ids).includes(normalizedCardId) &&
      isVerifiedCloseout(closeout)
  ) || null
}

export function evaluateActiveLiveTruthAssertion({
  label = 'live truth',
  expected = '',
  actual = '',
  historicalCloseout = null,
} = {}) {
  const normalizedExpected = normalizeText(expected)
  const normalizedActual = normalizeText(actual)
  const normalizedLabel = normalizeText(label) || 'live truth'
  const hasHistoricalCloseout = Boolean(historicalCloseout)

  if (!normalizedExpected || !normalizedActual) {
    return {
      ok: false,
      mode: 'active_live_truth_invalid_configuration',
      reason: 'active live-truth assertions require expected and actual values',
      label: normalizedLabel,
      expected: normalizedExpected,
      actual: normalizedActual,
      hasHistoricalCloseout,
    }
  }

  if (normalizedExpected !== normalizedActual) {
    return {
      ok: false,
      mode: 'active_live_truth_mismatch',
      reason: 'active live truth is stale or mismatched',
      label: normalizedLabel,
      expected: normalizedExpected,
      actual: normalizedActual,
      hasHistoricalCloseout,
    }
  }

  return {
    ok: true,
    mode: 'active_live_truth',
    reason: 'active live truth matches current expected value',
    label: normalizedLabel,
    expected: normalizedExpected,
    actual: normalizedActual,
    hasHistoricalCloseout,
  }
}

export function evaluateHistoricalCloseoutAssertion({
  card = null,
  closeouts = [],
  cardId = '',
  closeoutKey = '',
} = {}) {
  const normalizedCardId = normalizeText(cardId || card?.id || card?.cardId)
  const normalizedCloseoutKey = normalizeText(closeoutKey)
  const cardLane = normalizeCardLane(card)
  const closeout = findVerifiedCloseoutForCard({
    closeouts,
    cardId: normalizedCardId,
    closeoutKey: normalizedCloseoutKey,
  })

  if (!normalizedCardId || !normalizedCloseoutKey) {
    return {
      ok: false,
      mode: 'historical_closeout_invalid_configuration',
      reason: 'historical closeout assertions require cardId and closeoutKey',
      cardId: normalizedCardId,
      closeoutKey: normalizedCloseoutKey,
      cardLane,
    }
  }

  if (cardLane !== 'done') {
    return {
      ok: false,
      mode: 'historical_card_not_done',
      reason: 'historical closeout evidence is only valid after the live backlog card is done',
      cardId: normalizedCardId,
      closeoutKey: normalizedCloseoutKey,
      cardLane,
      hasVerifiedCloseout: Boolean(closeout),
    }
  }

  if (!closeout) {
    return {
      ok: false,
      mode: 'historical_closeout_missing',
      reason: 'matching verified closeout is missing',
      cardId: normalizedCardId,
      closeoutKey: normalizedCloseoutKey,
      cardLane,
      hasVerifiedCloseout: false,
    }
  }

  return {
    ok: true,
    mode: 'historical_closeout',
    reason: 'live done card has matching verified closeout evidence',
    cardId: normalizedCardId,
    closeoutKey: normalizedCloseoutKey,
    cardLane,
    closeoutStatus: closeout.status,
    closeoutAcceptanceState: closeout.acceptanceState,
  }
}

export function buildActiveVsHistoricalVerifierSplitDogfoodProof() {
  const cardId = 'DOGFOOD-ACTIVE-HISTORICAL-001'
  const closeoutKey = 'dogfood-active-historical-v1'
  const verifiedCloseout = {
    key: closeoutKey,
    backlogIds: [cardId],
    status: 'accepted',
    acceptanceState: 'Verified',
  }
  const currentValue = 'current-sprint-2026-05-15'
  const staleValue = 'old-sprint-2026-05-14'

  const activePass = evaluateActiveLiveTruthAssertion({
    label: 'current sprint id',
    expected: currentValue,
    actual: currentValue,
    historicalCloseout: verifiedCloseout,
  })
  const activeStaleWithCloseout = evaluateActiveLiveTruthAssertion({
    label: 'current sprint id',
    expected: currentValue,
    actual: staleValue,
    historicalCloseout: verifiedCloseout,
  })
  const activeMissing = evaluateActiveLiveTruthAssertion({
    label: 'current sprint id',
    expected: currentValue,
    actual: '',
    historicalCloseout: verifiedCloseout,
  })
  const historicalPass = evaluateHistoricalCloseoutAssertion({
    card: { id: cardId, lane: 'done' },
    closeouts: [verifiedCloseout],
    cardId,
    closeoutKey,
  })
  const historicalMissingCloseout = evaluateHistoricalCloseoutAssertion({
    card: { id: cardId, lane: 'done' },
    closeouts: [],
    cardId,
    closeoutKey,
  })
  const historicalWrongKey = evaluateHistoricalCloseoutAssertion({
    card: { id: cardId, lane: 'done' },
    closeouts: [verifiedCloseout],
    cardId,
    closeoutKey: 'wrong-closeout-key-v1',
  })
  const historicalCardNotDone = evaluateHistoricalCloseoutAssertion({
    card: { id: cardId, lane: 'scoped' },
    closeouts: [verifiedCloseout],
    cardId,
    closeoutKey,
  })

  return {
    ok: activePass.ok === true &&
      activePass.mode === 'active_live_truth' &&
      activeStaleWithCloseout.ok === false &&
      activeStaleWithCloseout.mode === 'active_live_truth_mismatch' &&
      activeStaleWithCloseout.hasHistoricalCloseout === true &&
      activeMissing.ok === false &&
      activeMissing.mode === 'active_live_truth_invalid_configuration' &&
      historicalPass.ok === true &&
      historicalPass.mode === 'historical_closeout' &&
      historicalMissingCloseout.ok === false &&
      historicalMissingCloseout.mode === 'historical_closeout_missing' &&
      historicalWrongKey.ok === false &&
      historicalWrongKey.mode === 'historical_closeout_missing' &&
      historicalCardNotDone.ok === false &&
      historicalCardNotDone.mode === 'historical_card_not_done',
    activePass,
    activeStaleWithCloseout,
    activeMissing,
    historicalPass,
    historicalMissingCloseout,
    historicalWrongKey,
    historicalCardNotDone,
  }
}
