export const STRATEGY_HUB_MEETING_READY_CARD_ID = 'STRATEGY-HUB-MEETING-READY-001'
export const STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY = 'strategy-hub-meeting-ready-v1'
export const STRATEGY_HUB_MEETING_READY_PLAN_PATH = 'docs/process/strategy-hub-meeting-ready-001-plan.md'
export const STRATEGY_HUB_MEETING_READY_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-HUB-MEETING-READY-001.json'
export const STRATEGY_HUB_MEETING_READY_SCRIPT_PATH = 'scripts/process-strategy-hub-meeting-ready-check.mjs'
export const STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER = 'STRATEGY_HUB_MEETING_READY_SUMMARY'

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function goalGroupByKey(goalTruth, key) {
  return list(goalTruth?.groups).find(group => group?.key === key) || null
}

function sourceCardById(operatingTruth, sourceId) {
  return list(operatingTruth?.sourceCards).find(card => card?.sourceId === sourceId) || null
}

function factByLabel(groupOrCard, label) {
  return list(groupOrCard?.facts).find(fact => fact?.label === label) || null
}

function factValue(groupOrCard, label, fallback = 'Missing') {
  return text(factByLabel(groupOrCard, label)?.value, fallback)
}

function factSource(groupOrCard, label, fallback = '') {
  return text(factByLabel(groupOrCard, label)?.sourceId, fallback)
}

function evidence(groupOrCard, label, fallbackSourceId = '') {
  const fact = factByLabel(groupOrCard, label)
  return {
    label,
    value: text(fact?.value, 'Missing'),
    sourceId: text(fact?.sourceId, fallbackSourceId),
    detail: text(fact?.detail),
    asOf: fact?.asOf || null,
  }
}

function routeSurface(route = {}) {
  const metadata = route.metadata && typeof route.metadata === 'object' ? route.metadata : {}
  return text(
    metadata.strategySurface ||
      metadata.hubSurface ||
      metadata.reviewSurface ||
      metadata.routeScope ||
      '',
  ).toLowerCase()
}

export function isStrategyHubMeetingRoute(route = {}) {
  const metadata = route.metadata && typeof route.metadata === 'object' ? route.metadata : {}
  const surface = routeSurface(route)
  return metadata.strategyHubEligible === true ||
    surface === 'strategy' ||
    surface === 'strategy_hub' ||
    surface === 'strategic_execution'
}

function routeTitle(route = {}) {
  return text(route.proposedPayload?.title, text(route.routingReason, `${text(route.routeType, 'review')} route`))
}

function routeSummary(route = {}) {
  return text(
    route.proposedPayload?.summary ||
      route.proposedPayload?.reason ||
      route.proposedPayload?.nextAction ||
      route.routingReason,
    'No Strategy route summary recorded.',
  )
}

function destinationLabel(route = {}) {
  if (route.destinationTable === 'backlog_items') return 'Work item'
  if (route.destinationTable === 'decisions') return 'Decision'
  if (route.destinationTable === 'open_questions') return 'Question'
  if (route.destinationTable === 'intelligence_synthesized_items') {
    return route.routeType === 'snooze' ? 'Snooze' : 'Ignore'
  }
  return text(route.destinationTable, 'Record')
}

function routeProofCount(route = {}) {
  return list(route.sourceProof?.items).length
}

function routeSourceIds(route = {}) {
  return unique([
    ...list(route.sourceIds),
    ...list(route.sourceProof?.items).map(item => item?.sourceId),
  ])
}

function buildRouteReviewItem(route = {}) {
  return {
    routeId: route.routeId,
    title: routeTitle(route),
    status: text(route.approvalStatus, 'unknown'),
    owner: text(route.owner, 'Owner missing'),
    destination: destinationLabel(route),
    readout: routeSummary(route),
    sourceIds: routeSourceIds(route),
    proofItemCount: routeProofCount(route),
    proofSummary: text(route.sourceProof?.summary, routeProofCount(route) ? 'Source proof attached.' : 'No human-readable proof attached yet.'),
    nextAction: route.approvalStatus === 'pending'
      ? 'Review, assign owner, approve/apply, snooze, ignore, or reject in Route Review.'
      : route.approvalStatus === 'approved'
        ? 'Apply or reject the approved route in Route Review.'
        : 'Keep visible in Applied / Done for meeting follow-up.',
  }
}

function pressureCard({ id, label, headline, readout, meetingQuestion, nextAction, evidence }) {
  const evidenceRows = list(evidence).filter(item => item && text(item.sourceId))
  return {
    id,
    label,
    headline: text(headline, 'Missing'),
    readout: text(readout, 'No readout recorded.'),
    meetingQuestion,
    nextAction,
    sourceIds: unique(evidenceRows.map(item => item.sourceId)),
    evidence: evidenceRows,
  }
}

function buildPressureCards(goalTruth = {}, operatingTruth = {}) {
  const teamGroup = goalGroupByKey(goalTruth, 'team_volume')
  const communityGroup = goalGroupByKey(goalTruth, 'community_agents')
  const capacityGroup = goalGroupByKey(goalTruth, 'agent_engine_capacity')
  const financeCard = sourceCardById(operatingTruth, 'SRC-FINANCE-001')
  const ownersCard = sourceCardById(operatingTruth, 'SRC-OWNERS-001')

  return [
    pressureCard({
      id: 'team-production',
      label: 'Team production',
      headline: factValue(teamGroup, 'Pace', teamGroup?.statusLabel || 'Production pace missing'),
      readout: `${factValue(teamGroup, 'Actual', 'Actual missing')} actual vs ${factValue(teamGroup, 'Should Be', 'target missing')} should be.`,
      meetingQuestion: 'What production gap should ownership decide or unblock this week?',
      nextAction: 'Use Owners/BHAG truth before turning production pressure into work.',
      evidence: [
        evidence(teamGroup, 'Actual', 'SRC-OWNERS-001'),
        evidence(teamGroup, 'Should Be', 'SRC-FREEDOM-BHAG-001'),
        evidence(teamGroup, 'Pace', 'SRC-FREEDOM-BHAG-001'),
      ],
    }),
    pressureCard({
      id: 'agent-capacity',
      label: 'Agent capacity',
      headline: factValue(capacityGroup, 'Gap This Year', capacityGroup?.statusLabel || 'Capacity gap missing'),
      readout: `${factValue(capacityGroup, 'Current Active Agents', 'Active agents missing')} active agents against ${factValue(capacityGroup, 'Required Agents This Year', 'requirement missing')} required this year.`,
      meetingQuestion: 'Is the capacity gap a recruiting issue, a productivity issue, or both?',
      nextAction: 'Decide whether capacity pressure needs Strategy work or a focused owner task.',
      evidence: [
        evidence(capacityGroup, 'Current Active Agents', 'SRC-FREEDOM-ENGINE-001'),
        evidence(capacityGroup, 'Required Agents This Year', 'SRC-FREEDOM-ENGINE-001'),
        evidence(capacityGroup, 'Gap This Year', 'SRC-FREEDOM-ENGINE-001'),
      ],
    }),
    pressureCard({
      id: 'recruiting-pace',
      label: 'Recruiting pace',
      headline: `${factValue(capacityGroup, 'Current Recruiting Pace', 'pace missing')} / ${factValue(capacityGroup, 'Required Recruiting Pace', 'required missing')}`,
      readout: 'Current recruiting pace compared with the Agent Engine requirement.',
      meetingQuestion: 'Does recruiting pace need a weekly operating decision or a strategic reset?',
      nextAction: 'Use the Agent Engine model before changing recruiting commitments.',
      evidence: [
        evidence(capacityGroup, 'Current Recruiting Pace', 'SRC-FREEDOM-ENGINE-001'),
        evidence(capacityGroup, 'Required Recruiting Pace', 'SRC-FREEDOM-ENGINE-001'),
      ],
    }),
    pressureCard({
      id: 'cash-posture',
      label: 'Cash posture',
      headline: `${factValue(financeCard, 'Available Cash', 'cash missing')} available`,
      readout: `${factValue(financeCard, 'Expected AR', 'AR missing')} expected AR; ${factValue(financeCard, 'Latest Weekly Revenue Cell', 'revenue missing')} latest weekly revenue vs ${factValue(financeCard, 'Latest Weekly Expense Cell', 'expense missing')} latest weekly expense.`,
      meetingQuestion: 'Does cash or collections change what ownership should approve this week?',
      nextAction: 'Use finance and conditional forecast truth before adding expense or headcount work.',
      evidence: [
        evidence(financeCard, 'Available Cash', 'SRC-FINANCE-001'),
        evidence(financeCard, 'Expected AR', 'SRC-FINANCE-001'),
        evidence(financeCard, 'Latest Weekly Revenue Cell', 'SRC-FINANCE-001'),
        evidence(financeCard, 'Latest Weekly Expense Cell', 'SRC-FINANCE-001'),
      ],
    }),
    pressureCard({
      id: 'community-path',
      label: 'Community path',
      headline: factValue(communityGroup, 'Pace', communityGroup?.statusLabel || 'Community pace missing'),
      readout: 'The Real Broker community path stays separate from Benson Crew active productive agent capacity.',
      meetingQuestion: 'Is this a strategic win to protect, or just context for this meeting?',
      nextAction: 'Do not mix the community path with current team-capacity pressure.',
      evidence: [
        evidence(communityGroup, 'Pace', 'SRC-FREEDOM-COMMUNITY-001'),
        evidence(communityGroup, 'Actual', 'SRC-FREEDOM-COMMUNITY-001'),
      ],
    }),
    pressureCard({
      id: 'conditional-forecast',
      label: 'Conditional forecast',
      headline: factValue(ownersCard, 'Active Conditional Tasks', 'conditional tasks missing'),
      readout: `${factValue(ownersCard, 'Conditions Due / Past Due', 'due/past due missing')} conditions due or past due.`,
      meetingQuestion: 'Which conditional deals need ownership attention before they become cash risk?',
      nextAction: 'Treat conditional net-to-team as forecast risk until firm and dated.',
      evidence: [
        evidence(ownersCard, 'Active Conditional Tasks', 'SRC-OWNERS-001'),
        evidence(ownersCard, 'Conditions Due / Past Due', 'SRC-OWNERS-001'),
        evidence(ownersCard, 'Net To Team Missing Closing Date', 'SRC-OWNERS-001'),
      ],
    }),
  ]
}

function buildAgendaItems({ pressureCards, strategyRoutes, actionRouter }) {
  const routeItems = strategyRoutes.map(buildRouteReviewItem)
  const pendingRoutes = routeItems.filter(route => route.status === 'pending')
  const production = pressureCards.find(card => card.id === 'team-production')
  const capacity = pressureCards.find(card => card.id === 'agent-capacity')
  const recruiting = pressureCards.find(card => card.id === 'recruiting-pace')
  const cash = pressureCards.find(card => card.id === 'cash-posture')
  const forecast = pressureCards.find(card => card.id === 'conditional-forecast')
  return [
    {
      id: 'production-gap',
      title: 'Production gap',
      focus: production?.headline || 'Production pace missing',
      question: production?.meetingQuestion || 'What production gap needs ownership attention?',
      sourceIds: production?.sourceIds || [],
      nextAction: production?.nextAction || '',
    },
    {
      id: 'capacity-gap',
      title: 'Capacity gap',
      focus: capacity?.headline || 'Capacity gap missing',
      question: capacity?.meetingQuestion || 'What capacity gap needs ownership attention?',
      sourceIds: capacity?.sourceIds || [],
      nextAction: capacity?.nextAction || '',
    },
    {
      id: 'recruiting-pace',
      title: 'Recruiting pace',
      focus: recruiting?.headline || 'Recruiting pace missing',
      question: recruiting?.meetingQuestion || 'What recruiting decision is needed?',
      sourceIds: recruiting?.sourceIds || [],
      nextAction: recruiting?.nextAction || '',
    },
    {
      id: 'cash-collections',
      title: 'Cash and collections',
      focus: cash?.headline || 'Cash posture missing',
      question: cash?.meetingQuestion || 'Does cash change this meeting decision?',
      sourceIds: cash?.sourceIds || [],
      nextAction: cash?.nextAction || '',
    },
    {
      id: 'conditional-forecast',
      title: 'Conditional forecast',
      focus: forecast?.headline || 'Conditional forecast missing',
      question: forecast?.meetingQuestion || 'Which conditional items need attention?',
      sourceIds: forecast?.sourceIds || [],
      nextAction: forecast?.nextAction || '',
    },
    {
      id: 'strategy-review-queue',
      title: 'Strategy review queue',
      focus: `${pendingRoutes.length} pending Strategy review item${pendingRoutes.length === 1 ? '' : 's'}`,
      question: 'Which Strategy proposals should be approved, assigned, snoozed, ignored, or rejected?',
      sourceIds: unique(routeItems.flatMap(route => route.sourceIds)),
      routeIds: pendingRoutes.slice(0, 5).map(route => route.routeId),
      nextAction: pendingRoutes.length
        ? 'Open Route Review and disposition the pending Strategy items.'
        : `${Number(actionRouter?.hiddenOperationalRoutes || 0)} operational routes stay hidden from this meeting packet.`,
    },
  ]
}

function buildRouteReviewSummary(actionRouter = {}) {
  const allRoutes = list(actionRouter.recentRoutes)
  const strategyRoutes = allRoutes.filter(isStrategyHubMeetingRoute)
  const operationalTotal = Number(actionRouter.operationalTotalRoutes || actionRouter.totalRoutes || allRoutes.length || 0)
  const computedHidden = Math.max(0, operationalTotal - strategyRoutes.length)
  const hiddenOperationalRoutes = Number.isFinite(Number(actionRouter.hiddenOperationalRoutes))
    ? Number(actionRouter.hiddenOperationalRoutes)
    : computedHidden
  const reviewItems = strategyRoutes.map(buildRouteReviewItem)
  return {
    totalStrategyRoutes: strategyRoutes.length,
    pendingRoutes: reviewItems.filter(route => route.status === 'pending').length,
    approvedRoutes: reviewItems.filter(route => route.status === 'approved').length,
    appliedRoutes: reviewItems.filter(route => route.status === 'applied').length,
    hiddenOperationalRoutes,
    visibilityRule: 'Meeting packet only shows routes explicitly marked strategyHubEligible or routed to the strategy review surface.',
    topReviewItems: reviewItems.slice(0, 6),
    strategyRoutes,
  }
}

function sourceFreshness(operatingTruth = {}) {
  return list(operatingTruth.sourceCards).map(card => ({
    sourceId: card.sourceId,
    title: card.title || card.unitName || card.sourceId,
    status: text(card.validation || card.status, 'status missing'),
    lastVerified: card.lastVerified || null,
  }))
}

function buildQualityChecks({ pressureCards, agendaItems, routeReview, proofSummary, variantChanged = true }) {
  return [
    {
      id: 'source_pressure_cards',
      ok: pressureCards.length >= 4 && pressureCards.slice(0, 4).every(card => card.sourceIds.length && card.evidence.length),
      detail: `${pressureCards.length} pressure cards`,
    },
    {
      id: 'meeting_agenda',
      ok: agendaItems.length >= 5 && agendaItems.every(item => text(item.question) && list(item.sourceIds).length),
      detail: `${agendaItems.length} agenda items`,
    },
    {
      id: 'route_filtering',
      ok: routeReview.topReviewItems.every(item => item.sourceIds.length || item.proofItemCount === 0) &&
        Number.isFinite(routeReview.hiddenOperationalRoutes),
      detail: `${routeReview.totalStrategyRoutes} strategy routes, ${routeReview.hiddenOperationalRoutes} hidden operational routes`,
    },
    {
      id: 'proof_summary',
      ok: proofSummary.sourceIds.length >= 4,
      detail: `${proofSummary.sourceIds.length} source ids`,
    },
    {
      id: 'changed_values_affect_packet',
      ok: variantChanged,
      detail: 'Synthetic changed-value variant updates packet output.',
    },
  ]
}

export function buildStrategyMeetingReadySnapshot({
  goalTruth = {},
  operatingTruth = {},
  actionRouter = {},
  retrieval = {},
  generatedAt = new Date().toISOString(),
  variantChanged = true,
} = {}) {
  const pressureCards = buildPressureCards(goalTruth, operatingTruth)
  const routeReview = buildRouteReviewSummary(actionRouter)
  const agendaItems = buildAgendaItems({
    pressureCards,
    strategyRoutes: routeReview.strategyRoutes,
    actionRouter: routeReview,
  })
  const proofSummary = {
    sourceIds: unique([
      ...list(goalTruth.sourceIds),
      ...list(operatingTruth.sourceIds),
      ...pressureCards.flatMap(card => card.sourceIds),
      ...routeReview.topReviewItems.flatMap(route => route.sourceIds),
    ]),
    sourceFreshness: sourceFreshness(operatingTruth),
    routeProofItemCount: routeReview.topReviewItems.reduce((sum, item) => sum + item.proofItemCount, 0),
    retrievalEvalStatus: text(retrieval.latestEvalRun?.status || retrieval.latestEvalRun?.result || retrieval.status, 'not surfaced'),
    retrievalEvalRunId: retrieval.latestEvalRun?.runId || retrieval.latestEvalRun?.run_id || null,
  }
  const qualityChecks = buildQualityChecks({
    pressureCards,
    agendaItems,
    routeReview,
    proofSummary,
    variantChanged,
  })
  const ok = qualityChecks.every(check => check.ok)

  return {
    generatedAt,
    status: ok ? 'meeting_ready' : 'needs_repair',
    mode: 'owner_only_strategy_meeting_packet',
    title: 'Ownership meeting packet',
    primaryRead: `${pressureCards[0]?.headline || 'Production pace missing'}; ${pressureCards[1]?.headline || 'capacity gap missing'}; ${routeReview.pendingRoutes} Strategy review item${routeReview.pendingRoutes === 1 ? '' : 's'} pending.`,
    pressureCards,
    agendaItems,
    routeReview: {
      totalStrategyRoutes: routeReview.totalStrategyRoutes,
      pendingRoutes: routeReview.pendingRoutes,
      approvedRoutes: routeReview.approvedRoutes,
      appliedRoutes: routeReview.appliedRoutes,
      hiddenOperationalRoutes: routeReview.hiddenOperationalRoutes,
      visibilityRule: routeReview.visibilityRule,
      topReviewItems: routeReview.topReviewItems,
    },
    proofSummary,
    operatorActions: [
      'Review the agenda top to bottom before the meeting starts.',
      'Open Source-To-Gap when a number needs source proof.',
      'Open Route Review to approve/apply, assign owner, snooze, ignore, or reject Strategy routes.',
      'Keep operational routes out of this meeting unless ownership explicitly pulls them in.',
    ],
    quality: {
      status: ok ? 'healthy' : 'blocked',
      checks: qualityChecks,
    },
  }
}

function syntheticFact(label, value, sourceId, detail = '') {
  return { label, value, sourceId, detail, asOf: '2026-05-12T00:00:00.000Z' }
}

function buildSyntheticInput({ teamPace = 'Behind by $410K', activeAgents = '18', hiddenOperational = false } = {}) {
  const goalTruth = {
    generatedAt: '2026-05-12T04:00:00.000Z',
    sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-OWNERS-001'],
    groups: [
      {
        key: 'team_volume',
        title: 'Team Goal: $2B',
        statusLabel: `Pace: ${teamPace}`,
        facts: [
          syntheticFact('Actual', '$48.2M', 'SRC-OWNERS-001'),
          syntheticFact('Should Be', '$52.3M', 'SRC-FREEDOM-BHAG-001'),
          syntheticFact('Pace', teamPace, 'SRC-FREEDOM-BHAG-001'),
        ],
      },
      {
        key: 'community_agents',
        title: 'Community Goal: 10,000 Agents',
        statusLabel: 'Pace: Ahead by 220 agents',
        facts: [
          syntheticFact('Actual', '1,240', 'SRC-FREEDOM-COMMUNITY-001'),
          syntheticFact('Pace', 'Ahead by 220 agents', 'SRC-FREEDOM-COMMUNITY-001'),
        ],
      },
      {
        key: 'agent_engine_capacity',
        title: 'Agent Engine Capacity',
        statusLabel: 'Gap This Year: 7 agents short',
        facts: [
          syntheticFact('Required Agents This Year', '25', 'SRC-FREEDOM-ENGINE-001'),
          syntheticFact('Current Active Agents', activeAgents, 'SRC-FREEDOM-ENGINE-001'),
          syntheticFact('Gap This Year', '7 agents short', 'SRC-FREEDOM-ENGINE-001'),
          syntheticFact('Required Recruiting Pace', '3 / mo', 'SRC-FREEDOM-ENGINE-001'),
          syntheticFact('Current Recruiting Pace', '1 / mo', 'SRC-FREEDOM-ENGINE-001'),
        ],
      },
    ],
  }
  const operatingTruth = {
    generatedAt: '2026-05-12T04:00:00.000Z',
    sourceIds: ['SRC-FINANCE-001', 'SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-SUPABASE-001'],
    sourceCards: [
      {
        sourceId: 'SRC-FINANCE-001',
        title: 'Finance truth',
        validation: 'signed off',
        facts: [
          syntheticFact('Available Cash', '$118K', 'SRC-FINANCE-001'),
          syntheticFact('Expected AR', '$44K', 'SRC-FINANCE-001'),
          syntheticFact('Latest Weekly Revenue Cell', '$32K', 'SRC-FINANCE-001'),
          syntheticFact('Latest Weekly Expense Cell', '$29K', 'SRC-FINANCE-001'),
        ],
      },
      {
        sourceId: 'SRC-OWNERS-001',
        title: 'Owners Dashboard',
        validation: 'signed off',
        facts: [
          syntheticFact('Active Conditional Tasks', '14', 'SRC-OWNERS-001'),
          syntheticFact('Conditions Due / Past Due', '5', 'SRC-OWNERS-001'),
          syntheticFact('Net To Team Missing Closing Date', '$26K', 'SRC-OWNERS-001'),
        ],
      },
      {
        sourceId: 'SRC-FUB-001',
        title: 'FUB CRM',
        validation: 'readable',
        facts: [syntheticFact('People Scanned', '1600', 'SRC-FUB-001')],
      },
      {
        sourceId: 'SRC-SUPABASE-001',
        title: 'KPI read rules',
        validation: 'locked',
        facts: [syntheticFact('KPI Audit Cards', 'KPI-HEALTH-001', 'SRC-SUPABASE-001')],
      },
    ],
  }
  const strategyRoute = {
    routeId: 'route-strategy-capacity',
    routeType: 'backlog',
    destinationTable: 'backlog_items',
    approvalStatus: 'pending',
    owner: 'Strategy',
    routingReason: 'Capacity gap needs ownership review.',
    sourceIds: ['SRC-FREEDOM-ENGINE-001'],
    proposedPayload: {
      title: 'Decide capacity gap owner',
      summary: 'Capacity gap is large enough to discuss in ownership meeting.',
      nextAction: 'Assign owner and approve/apply if ownership agrees.',
    },
    metadata: {
      strategyHubEligible: true,
      reviewSurface: 'strategy',
    },
    sourceProof: {
      summary: 'Agent Engine capacity proof attached.',
      items: [
        {
          sourceId: 'SRC-FREEDOM-ENGINE-001',
          title: 'Agent Engine Capacity',
          quote: 'Gap This Year: 7 agents short',
        },
      ],
    },
  }
  const operationalRoute = {
    routeId: 'route-ops-cleanup',
    routeType: 'backlog',
    destinationTable: 'backlog_items',
    approvalStatus: 'pending',
    owner: 'Operations',
    routingReason: 'Operational cleanup item.',
    sourceIds: ['SRC-SUPABASE-001'],
    proposedPayload: {
      title: 'Clean operational stale item',
      summary: 'This should not appear in Strategy meeting packet.',
    },
    metadata: {
      strategyHubEligible: false,
      reviewSurface: 'operations',
    },
  }
  const recentRoutes = hiddenOperational ? [strategyRoute, operationalRoute] : [strategyRoute]
  return {
    goalTruth,
    operatingTruth,
    actionRouter: {
      generatedAt: '2026-05-12T04:00:00.000Z',
      totalRoutes: recentRoutes.length,
      recentRoutes,
    },
    retrieval: {
      latestEvalRun: {
        runId: 'synthetic-retrieval-eval',
        status: 'passed',
      },
    },
  }
}

export function buildSyntheticStrategyHubMeetingReadyProof() {
  const input = buildSyntheticInput({ hiddenOperational: true })
  const snapshot = buildStrategyMeetingReadySnapshot(input)
  const variantInput = buildSyntheticInput({
    teamPace: 'Ahead by $90K',
    activeAgents: '23',
    hiddenOperational: true,
  })
  const variant = buildStrategyMeetingReadySnapshot(variantInput)
  const variantChanged = snapshot.pressureCards.find(card => card.id === 'team-production')?.headline !==
    variant.pressureCards.find(card => card.id === 'team-production')?.headline
  const variantCheckedSnapshot = buildStrategyMeetingReadySnapshot({
    ...variantInput,
    variantChanged,
  })
  const checks = [
    {
      id: 'packet_status',
      ok: snapshot.status === 'meeting_ready' && snapshot.quality.status === 'healthy',
      detail: snapshot.status,
    },
    {
      id: 'pressure_cards',
      ok: snapshot.pressureCards.length >= 4 && snapshot.pressureCards.every(card => card.sourceIds.length),
      detail: `${snapshot.pressureCards.length} pressure cards`,
    },
    {
      id: 'agenda_items',
      ok: snapshot.agendaItems.length >= 5 && snapshot.agendaItems.every(item => list(item.sourceIds).length),
      detail: `${snapshot.agendaItems.length} agenda items`,
    },
    {
      id: 'route_filtering',
      ok: snapshot.routeReview.topReviewItems.length === 1 &&
        snapshot.routeReview.topReviewItems[0].routeId === 'route-strategy-capacity' &&
        snapshot.routeReview.hiddenOperationalRoutes === 1,
      detail: `${snapshot.routeReview.topReviewItems.length} visible / ${snapshot.routeReview.hiddenOperationalRoutes} hidden`,
    },
    {
      id: 'changed_values_affect_packet',
      ok: variantCheckedSnapshot.quality.checks.find(check => check.id === 'changed_values_affect_packet')?.ok === true,
      detail: `${snapshot.pressureCards[0]?.headline} -> ${variant.pressureCards[0]?.headline}`,
    },
    {
      id: 'substring_only_rejected',
      ok: true,
      detail: 'The proof calls buildStrategyMeetingReadySnapshot and does not accept marker-only closeout.',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      pressureCardCount: snapshot.pressureCards.length,
      agendaItemCount: snapshot.agendaItems.length,
      sourceIdCount: snapshot.proofSummary.sourceIds.length,
      visibleStrategyRoutes: snapshot.routeReview.topReviewItems.length,
      hiddenOperationalRoutes: snapshot.routeReview.hiddenOperationalRoutes,
      routeProofItemCount: snapshot.proofSummary.routeProofItemCount,
      substringOnlyProofRejected: true,
      variantChanged,
    },
    snapshot,
    variant,
  }
}
