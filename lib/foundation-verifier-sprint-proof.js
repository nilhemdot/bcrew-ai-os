function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

export function indexCloseoutsByBacklogId(closeouts = []) {
  const closeoutsByBacklogId = new Map()
  for (const closeout of closeouts || []) {
    for (const backlogId of normalizeList(closeout?.backlogIds)) {
      if (!closeoutsByBacklogId.has(backlogId)) closeoutsByBacklogId.set(backlogId, [])
      closeoutsByBacklogId.get(backlogId).push(closeout)
    }
  }
  return closeoutsByBacklogId
}

export function isVerifiedCloseout(closeout) {
  return ['accepted', 'shipped'].includes(String(closeout?.status || '').toLowerCase()) &&
    /verified/i.test(String(closeout?.acceptanceState || ''))
}

export function cardHasVerifiedCloseout({
  cardId,
  backlogItemsById,
  closeoutsByBacklogId,
} = {}) {
  const card = backlogItemsById?.get(cardId)
  const closeouts = closeoutsByBacklogId?.get(cardId) || []
  return card?.lane === 'done' && closeouts.some(isVerifiedCloseout)
}

export function buildSprintProofHelpers({
  backlogItems = [],
  closeouts = [],
} = {}) {
  const backlogItemsById = new Map((backlogItems || []).map(item => [item.id, item]))
  const closeoutsByBacklogId = indexCloseoutsByBacklogId(closeouts)
  const historicalCardHasVerifiedCloseout = cardId => cardHasVerifiedCloseout({
    cardId,
    backlogItemsById,
    closeoutsByBacklogId,
  })
  return {
    backlogItemsById,
    closeoutsByBacklogId,
    historicalCardHasVerifiedCloseout,
    cardsHaveVerifiedCloseouts: cardIds => normalizeList(cardIds).every(historicalCardHasVerifiedCloseout),
  }
}

export function buildSyntheticSprintProofModuleStatus() {
  const helpers = buildSprintProofHelpers({
    backlogItems: [
      { id: 'DONE-VERIFIED-001', lane: 'done' },
      { id: 'DONE-UNVERIFIED-001', lane: 'done' },
      { id: 'SCOPED-VERIFIED-001', lane: 'scoped' },
    ],
    closeouts: [
      {
        backlogIds: ['DONE-VERIFIED-001', 'SCOPED-VERIFIED-001'],
        status: 'accepted',
        acceptanceState: 'Verified',
      },
      {
        backlogIds: ['DONE-UNVERIFIED-001'],
        status: 'accepted',
        acceptanceState: 'Needs proof',
      },
    ],
  })
  const cases = [
    {
      name: 'done card with verified closeout passes',
      ok: helpers.historicalCardHasVerifiedCloseout('DONE-VERIFIED-001') === true,
    },
    {
      name: 'done card without verified closeout fails',
      ok: helpers.historicalCardHasVerifiedCloseout('DONE-UNVERIFIED-001') === false,
    },
    {
      name: 'non-done card with verified closeout fails',
      ok: helpers.historicalCardHasVerifiedCloseout('SCOPED-VERIFIED-001') === false,
    },
    {
      name: 'all-card helper requires every card to pass',
      ok: helpers.cardsHaveVerifiedCloseouts(['DONE-VERIFIED-001']) === true &&
        helpers.cardsHaveVerifiedCloseouts(['DONE-VERIFIED-001', 'DONE-UNVERIFIED-001']) === false,
    },
  ]
  return {
    ok: cases.every(testCase => testCase.ok),
    cases,
  }
}
