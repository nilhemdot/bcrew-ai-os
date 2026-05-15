import {
  isVerifiedCloseout,
} from './foundation-verifier-sprint-proof.js'

export const SPRINT_CHECK_HISTORICAL_MODE_CARD_ID = 'SPRINT-CHECK-HISTORICAL-MODE-001'
export const SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY = 'sprint-check-historical-mode-v1'
export const SPRINT_CHECK_HISTORICAL_MODE_PLAN_PATH = 'docs/process/sprint-check-historical-mode-001-plan.md'
export const SPRINT_CHECK_HISTORICAL_MODE_APPROVAL_PATH = 'docs/process/approvals/SPRINT-CHECK-HISTORICAL-MODE-001.json'
export const SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH = 'scripts/process-sprint-check-historical-mode-check.mjs'
export const SPRINT_CHECK_HISTORICAL_MODE_SPRINT_ID = 'sprint-check-historical-mode-2026-05-15'

export const DEFAULT_ACTIVE_SPRINT_PROOF_STAGES = [
  'building_now',
  'done_this_sprint',
]

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
  return normalizeText(card?.lane || card?.backlogLane).toLowerCase()
}

function normalizeSprintId(activeSprint) {
  return normalizeText(activeSprint?.sprint?.sprintId || activeSprint?.sprint?.sprint_id || activeSprint?.sprintId)
}

function normalizeSprintItems(activeSprint) {
  return Array.isArray(activeSprint?.items) ? activeSprint.items : []
}

export function findVerifiedHistoricalCloseout({
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

export function evaluateSprintCheckHistoricalMode({
  activeSprint = null,
  card = null,
  closeouts = [],
  cardId = '',
  expectedSprintId = '',
  closeoutKey = '',
  allowedActiveStages = DEFAULT_ACTIVE_SPRINT_PROOF_STAGES,
} = {}) {
  const normalizedCardId = normalizeText(cardId || card?.id || card?.cardId)
  const normalizedExpectedSprintId = normalizeText(expectedSprintId)
  const normalizedCloseoutKey = normalizeText(closeoutKey)
  const activeSprintId = normalizeSprintId(activeSprint)
  const allowedStages = new Set(normalizeList(allowedActiveStages))
  const activeItem = normalizeSprintItems(activeSprint).find(item =>
    normalizeText(item?.cardId || item?.backlogId || item?.backlog_id) === normalizedCardId
  ) || null
  const activeItemStage = normalizeText(activeItem?.stage)
  const closeout = findVerifiedHistoricalCloseout({
    closeouts,
    cardId: normalizedCardId,
    closeoutKey: normalizedCloseoutKey,
  })
  const cardLane = normalizeCardLane(card)
  const cardIsDone = cardLane === 'done'

  if (!normalizedCardId || !normalizedExpectedSprintId || !normalizedCloseoutKey) {
    return {
      ok: false,
      mode: 'invalid_configuration',
      reason: 'cardId, expectedSprintId, and closeoutKey are required',
      activeSprintId,
      activeItemStage,
      cardLane,
      closeoutKey: normalizedCloseoutKey,
    }
  }

  if (activeSprintId === normalizedExpectedSprintId) {
    if (activeItem && allowedStages.has(activeItemStage)) {
      return {
        ok: true,
        mode: 'active_current',
        reason: 'expected sprint is active and card is in an allowed active proof stage',
        activeSprintId,
        activeItemStage,
        cardLane,
        closeoutKey: normalizedCloseoutKey,
      }
    }

    return {
      ok: false,
      mode: activeItem ? 'active_current_wrong_stage' : 'active_current_missing_item',
      reason: activeItem
        ? 'expected sprint is active but card is not in an allowed active proof stage'
        : 'expected sprint is active but card is missing from Current Sprint',
      activeSprintId,
      activeItemStage,
      cardLane,
      closeoutKey: normalizedCloseoutKey,
    }
  }

  if (!cardIsDone) {
    return {
      ok: false,
      mode: 'historical_card_not_done',
      reason: 'active sprint rolled forward but live backlog card is not done',
      activeSprintId,
      expectedSprintId: normalizedExpectedSprintId,
      activeItemStage,
      cardLane,
      closeoutKey: normalizedCloseoutKey,
      hasVerifiedCloseout: Boolean(closeout),
    }
  }

  if (!closeout) {
    return {
      ok: false,
      mode: 'historical_closeout_missing',
      reason: 'active sprint rolled forward but the matching verified closeout is missing',
      activeSprintId,
      expectedSprintId: normalizedExpectedSprintId,
      activeItemStage,
      cardLane,
      closeoutKey: normalizedCloseoutKey,
    }
  }

  return {
    ok: true,
    mode: 'historical_closeout',
    reason: 'active sprint rolled forward and live done card has the matching verified closeout',
    activeSprintId,
    expectedSprintId: normalizedExpectedSprintId,
    activeItemStage,
    cardLane,
    closeoutKey: normalizedCloseoutKey,
    closeoutStatus: closeout.status,
    closeoutAcceptanceState: closeout.acceptanceState,
  }
}

export function processCheckReadonlyProofIsHistoricalAware(source = '') {
  const text = String(source || '')
  return text.includes('evaluateSprintCheckHistoricalMode') &&
    text.includes('PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY') &&
    !text.includes('sprint.sprint?.sprintId === PROCESS_CHECK_READONLY_MODE_SPRINT_ID')
}

export function buildSyntheticSprintCheckHistoricalModeProof() {
  const cardId = 'DONE-CARD-001'
  const expectedSprintId = 'expected-sprint-2026-05-15'
  const closeoutKey = 'done-card-v1'
  const verifiedCloseout = {
    key: closeoutKey,
    backlogIds: [cardId],
    status: 'accepted',
    acceptanceState: 'Verified',
  }

  const activeCurrent = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: expectedSprintId },
      items: [{ cardId, stage: 'building_now' }],
    },
    card: { id: cardId, lane: 'executing' },
    closeouts: [],
    cardId,
    expectedSprintId,
    closeoutKey,
  })
  const activeWrongStage = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: expectedSprintId },
      items: [{ cardId, stage: 'scoping' }],
    },
    card: { id: cardId, lane: 'executing' },
    closeouts: [],
    cardId,
    expectedSprintId,
    closeoutKey,
  })
  const historicalPass = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: 'next-sprint-2026-05-15' },
      items: [{ cardId: 'NEXT-CARD-001', stage: 'building_now' }],
    },
    card: { id: cardId, lane: 'done' },
    closeouts: [verifiedCloseout],
    cardId,
    expectedSprintId,
    closeoutKey,
  })
  const historicalNoCloseout = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: 'next-sprint-2026-05-15' },
      items: [],
    },
    card: { id: cardId, lane: 'done' },
    closeouts: [],
    cardId,
    expectedSprintId,
    closeoutKey,
  })
  const historicalWrongKey = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: 'next-sprint-2026-05-15' },
      items: [],
    },
    card: { id: cardId, lane: 'done' },
    closeouts: [verifiedCloseout],
    cardId,
    expectedSprintId,
    closeoutKey: 'wrong-key-v1',
  })
  const scopedWithCloseout = evaluateSprintCheckHistoricalMode({
    activeSprint: {
      sprint: { sprintId: 'next-sprint-2026-05-15' },
      items: [],
    },
    card: { id: cardId, lane: 'scoped' },
    closeouts: [verifiedCloseout],
    cardId,
    expectedSprintId,
    closeoutKey,
  })

  return {
    ok: activeCurrent.ok === true &&
      activeCurrent.mode === 'active_current' &&
      activeWrongStage.ok === false &&
      activeWrongStage.mode === 'active_current_wrong_stage' &&
      historicalPass.ok === true &&
      historicalPass.mode === 'historical_closeout' &&
      historicalNoCloseout.ok === false &&
      historicalNoCloseout.mode === 'historical_closeout_missing' &&
      historicalWrongKey.ok === false &&
      historicalWrongKey.mode === 'historical_closeout_missing' &&
      scopedWithCloseout.ok === false &&
      scopedWithCloseout.mode === 'historical_card_not_done',
    activeCurrent,
    activeWrongStage,
    historicalPass,
    historicalNoCloseout,
    historicalWrongKey,
    scopedWithCloseout,
  }
}
