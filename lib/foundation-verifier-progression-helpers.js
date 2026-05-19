import {
  STATIC_FOUNDATION_PROGRESSION_BLOCKER_CARD_IDS,
} from './foundation-verify-coverage-card-ids.js'

function normalizeCardIds(cardIds = []) {
  return (Array.isArray(cardIds) ? cardIds : [])
    .map(cardId => String(cardId || '').trim())
    .filter(Boolean)
}

export function buildKnownFoundationProgressionBlockers(dynamicCardIds = []) {
  return Array.from(new Set([
    ...normalizeCardIds(dynamicCardIds),
    ...STATIC_FOUNDATION_PROGRESSION_BLOCKER_CARD_IDS,
  ]))
}

export function buildFoundationVerifierProgressionHelpers({
  currentSprintActiveBlockerCardId = null,
  activeSprintCompleteReview = false,
  currentState = '',
  historicalCardHasVerifiedCloseout = () => false,
  dynamicProgressionBlockerCardIds = [],
  historicalCloseoutKeys = [],
} = {}) {
  const knownLaterFoundationProgressionBlockers = buildKnownFoundationProgressionBlockers(dynamicProgressionBlockerCardIds)
  const activeSprintAtOrPast = expectedCardIds =>
    normalizeCardIds(expectedCardIds).includes(currentSprintActiveBlockerCardId) ||
    normalizeCardIds(expectedCardIds).some(cardId => historicalCardHasVerifiedCloseout(cardId)) ||
    knownLaterFoundationProgressionBlockers.includes(currentSprintActiveBlockerCardId) ||
    activeSprintCompleteReview
  const currentStateMentionsActiveBlockerOrLater = (...expectedSnippets) =>
    expectedSnippets.some(snippet =>
      typeof snippet === 'boolean' ? snippet : String(currentState || '').includes(snippet)
    ) ||
    knownLaterFoundationProgressionBlockers.includes(currentSprintActiveBlockerCardId) ||
    activeSprintCompleteReview ||
    (
      String(currentState || '').includes('Historical closeout notes below preserve at-the-time "current sprint active blocker" wording') &&
      normalizeCardIds(historicalCloseoutKeys).some(closeoutKey => String(currentState || '').includes(closeoutKey))
    )

  return {
    activeSprintAtOrPast,
    currentStateMentionsActiveBlockerOrLater,
    knownLaterFoundationProgressionBlockers,
  }
}

export function buildSyntheticFoundationVerifierProgressionHelpersProof() {
  const helpers = buildFoundationVerifierProgressionHelpers({
    currentSprintActiveBlockerCardId: 'FUTURE-FOUNDATION-CARD-001',
    currentState: 'Historical closeout notes below preserve at-the-time "current sprint active blocker" wording with prior-closeout-v1.',
    historicalCardHasVerifiedCloseout: cardId => cardId === 'DONE-001',
    dynamicProgressionBlockerCardIds: ['FUTURE-FOUNDATION-CARD-001'],
    historicalCloseoutKeys: ['prior-closeout-v1'],
  })
  const cases = [
    helpers.activeSprintAtOrPast(['NOW-001']) === true,
    helpers.activeSprintAtOrPast(['DONE-001']) === true,
    helpers.currentStateMentionsActiveBlockerOrLater('missing-current-state-marker') === true,
    helpers.knownLaterFoundationProgressionBlockers.includes('FOUNDATION-HEALTH-GREEN-LOCK-001'),
  ]
  return {
    ok: cases.every(Boolean),
    cases,
  }
}
