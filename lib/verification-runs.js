export const VERIFICATION_RUNS_CARD_ID = 'VERIFICATION-RUNS-001'
export const VERIFICATION_RUNS_CLOSEOUT_KEY = 'verification-runs-v1'
export const VERIFICATION_RUNS_PLAN_PATH = 'docs/process/verification-runs-001-plan.md'
export const VERIFICATION_RUNS_APPROVAL_PATH = 'docs/process/approvals/VERIFICATION-RUNS-001.json'
export const VERIFICATION_RUNS_SCRIPT_PATH = 'scripts/process-verification-runs-check.mjs'
export const VERIFICATION_RUNS_SUMMARY_MARKER = 'VERIFICATION_RUNS_SUMMARY'

export const VERIFICATION_RUNS_STALE_FINDING_DAYS = 7
export const VERIFICATION_RUNS_RESEARCH_REVIEW_DAYS = 30
export const VERIFICATION_RUNS_ACTION_ROUTE_DAYS = 7
export const VERIFICATION_RUNS_NEXT_CARD_ID = 'PER-USER-CHANGELOG-001'

export const VERIFICATION_RUNS_BOUNDARY = [
  'V1 is proposed-only and does not auto-close research cards.',
  'V1 does not archive synthesized items or reject/apply action routes.',
  'Reply Parser, Watching Items, and resolution writeback stay out of scope.',
  'The report complements foundation:verify; it does not replace build verification.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function ageDays(value, generatedAt) {
  const date = toDate(value)
  const reference = toDate(generatedAt)
  if (!date || !reference) return null
  return Math.max(0, Math.floor((reference.getTime() - date.getTime()) / 86400000))
}

function countBy(values, keyFn) {
  return normalizeList(values).reduce((acc, value) => {
    const key = keyFn(value)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function cardText(card = {}) {
  return [
    card.id,
    card.title,
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
    card.source,
  ].map(normalizeText).filter(Boolean).join('\n')
}

function latestTimestamp(record = {}) {
  return record.updatedAt || record.updated_at || record.routedAt || record.routed_at || record.createdAt || record.created_at || null
}

function candidateSort(left, right) {
  const severityRank = { risk: 0, warning: 1, review: 2 }
  const leftRank = severityRank[left.severity] ?? 9
  const rightRank = severityRank[right.severity] ?? 9
  if (leftRank !== rightRank) return leftRank - rightRank
  return Number(right.ageDays || 0) - Number(left.ageDays || 0)
}

function buildResearchCandidates({ backlogItems = [], researchCuration = {}, generatedAt } = {}) {
  const curationById = new Map(normalizeList(researchCuration.cards).map(card => [card.id, card]))
  return normalizeList(backlogItems)
    .filter(card => card.lane === 'research')
    .map(card => {
      const age = ageDays(latestTimestamp(card), generatedAt)
      const text = cardText(card).toLowerCase()
      const curation = curationById.get(card.id) || {}
      const oldSystemRebuild = /\bold-system|old system|rebuild|parity|avatar|telegram|director|marketing|brand|reply|watching|changelog|verification/i.test(text)
      const reviewDue = age === null || age >= VERIFICATION_RUNS_RESEARCH_REVIEW_DAYS || oldSystemRebuild
      return {
        id: `research:${card.id}`,
        sourceType: 'research_card',
        sourceId: card.id,
        label: card.title || card.id,
        status: card.lane,
        owner: card.owner || card.team || 'unassigned',
        ageDays: age,
        thresholdDays: VERIFICATION_RUNS_RESEARCH_REVIEW_DAYS,
        reviewDue,
        severity: oldSystemRebuild ? 'warning' : 'review',
        proposedAction: oldSystemRebuild ? 'promote_or_defer_with_blocker' : 'verify_keep_or_move_future_concepts',
        reason: oldSystemRebuild
          ? 'Research card appears tied to old-system rebuild coverage and should not sit unreviewed.'
          : 'Research card is old enough to need keep/promote/defer review.',
        curationState: curation.curationState || 'uncurated',
        evidenceRefs: [card.id, 'research-curation-v1'],
        autoExpire: false,
      }
    })
    .filter(candidate => candidate.reviewDue)
}

function buildSynthesisCandidates({ intelligenceSynthesis = {}, generatedAt } = {}) {
  return normalizeList(intelligenceSynthesis.recentItems)
    .filter(item => item.status !== 'archived')
    .map(item => {
      const age = ageDays(latestTimestamp(item), generatedAt)
      const stale = age === null || age >= VERIFICATION_RUNS_STALE_FINDING_DAYS
      const verification = item.synthesisVerification || item.metadata?.synthesisVerification || null
      const verificationStatus = verification?.status || 'unknown'
      return {
        id: `synthesis:${item.synthesizedItemId || item.naturalKey || item.title}`,
        sourceType: 'synthesized_finding',
        sourceId: item.synthesizedItemId || item.naturalKey || item.title,
        label: item.title || item.naturalKey || item.synthesizedItemId || 'Synthesized finding',
        status: item.status || 'unknown',
        owner: item.suggestedOwner || 'needs_owner',
        ageDays: age,
        thresholdDays: VERIFICATION_RUNS_STALE_FINDING_DAYS,
        reviewDue: stale,
        severity: verificationStatus === 'verified' ? 'warning' : 'risk',
        proposedAction: verificationStatus === 'verified' && item.routingStatus === 'routed'
          ? 'refresh_or_expire_if_resolved'
          : verificationStatus === 'verified'
            ? 'refresh_or_route'
            : 'refresh_verification',
        reason: verificationStatus === 'verified'
          ? 'Synthesized finding is old enough to refresh against current source reality.'
          : 'Synthesized finding needs verification before it remains actionable.',
        routingStatus: item.routingStatus || 'unknown',
        evidenceRefs: normalizeList([
          item.runId,
          ...(item.sourceIds || []),
          ...(item.factRefs || []),
          ...(item.evidenceRefs || []),
        ]),
        autoExpire: false,
      }
    })
    .filter(candidate => candidate.reviewDue)
}

function buildActionRouteCandidates({ intelligenceActionRouter = {}, generatedAt } = {}) {
  return normalizeList(intelligenceActionRouter.recentRoutes)
    .filter(route => ['pending', 'approved'].includes(route.approvalStatus))
    .map(route => {
      const age = ageDays(latestTimestamp(route), generatedAt)
      const stale = age === null || age >= VERIFICATION_RUNS_ACTION_ROUTE_DAYS
      return {
        id: `route:${route.routeId || route.synthesizedItemId}`,
        sourceType: 'action_route',
        sourceId: route.routeId || route.synthesizedItemId,
        label: route.proposedPayload?.title || route.routingReason || route.routeType || 'Action route',
        status: route.approvalStatus || 'unknown',
        owner: route.owner || 'needs_owner',
        ageDays: age,
        thresholdDays: VERIFICATION_RUNS_ACTION_ROUTE_DAYS,
        reviewDue: stale,
        severity: route.approvalStatus === 'approved' ? 'risk' : 'warning',
        proposedAction: route.approvalStatus === 'approved' ? 'apply_or_expire_approved_route' : 'review_or_expire_pending_route',
        reason: 'Action route is old enough to require owner review before it stays pending.',
        routeType: route.routeType || 'unknown',
        destinationTable: route.destinationTable || 'unknown',
        evidenceRefs: normalizeList([
          route.runId,
          route.synthesizedItemId,
          ...(route.sourceIds || []),
          ...(route.factRefs || []),
          ...(route.evidenceRefs || []),
        ]),
        autoExpire: false,
      }
    })
    .filter(candidate => candidate.reviewDue)
}

function buildBacklogHygieneCandidates({ backlogHygiene = {} } = {}) {
  return normalizeList(backlogHygiene.visibleFindings || backlogHygiene.findings)
    .filter(finding => finding.severity !== 'info')
    .map(finding => ({
      id: `hygiene:${finding.cardId}:${finding.type}`,
      sourceType: 'backlog_hygiene_finding',
      sourceId: finding.cardId,
      label: finding.title || finding.cardId || 'Backlog hygiene finding',
      status: finding.lane || 'unknown',
      owner: 'foundation',
      ageDays: null,
      thresholdDays: null,
      reviewDue: true,
      severity: finding.severity === 'critical' ? 'risk' : 'warning',
      proposedAction: 'repair_lane_or_proof',
      reason: finding.issue || 'Backlog hygiene reported a visible finding.',
      evidenceRefs: normalizeList([finding.cardId, finding.type]),
      autoExpire: false,
    }))
}

export function buildVerificationRunsSnapshot({
  backlogItems = [],
  researchCuration = {},
  intelligenceSynthesis = {},
  intelligenceActionRouter = {},
  backlogHygiene = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const researchCandidates = buildResearchCandidates({ backlogItems, researchCuration, generatedAt })
  const synthesisCandidates = buildSynthesisCandidates({ intelligenceSynthesis, generatedAt })
  const actionRouteCandidates = buildActionRouteCandidates({ intelligenceActionRouter, generatedAt })
  const backlogHygieneCandidates = buildBacklogHygieneCandidates({ backlogHygiene })
  const candidates = [
    ...researchCandidates,
    ...synthesisCandidates,
    ...actionRouteCandidates,
    ...backlogHygieneCandidates,
  ].sort(candidateSort)

  const typeCounts = countBy(candidates, candidate => candidate.sourceType)
  const actionCounts = countBy(candidates, candidate => candidate.proposedAction)
  const severityCounts = countBy(candidates, candidate => candidate.severity)

  return {
    generatedAt,
    cardId: VERIFICATION_RUNS_CARD_ID,
    closeoutKey: VERIFICATION_RUNS_CLOSEOUT_KEY,
    status: candidates.length ? 'review_due' : 'healthy',
    policy: 'read_only_proposed_only_v1',
    thresholds: {
      staleFindingDays: VERIFICATION_RUNS_STALE_FINDING_DAYS,
      researchReviewDays: VERIFICATION_RUNS_RESEARCH_REVIEW_DAYS,
      actionRouteDays: VERIFICATION_RUNS_ACTION_ROUTE_DAYS,
    },
    summary: {
      candidateCount: candidates.length,
      staleResearchCount: researchCandidates.length,
      staleSynthesisCount: synthesisCandidates.length,
      staleActionRouteCount: actionRouteCandidates.length,
      backlogHygieneCandidateCount: backlogHygieneCandidates.length,
      riskCandidateCount: severityCounts.risk || 0,
      warningCandidateCount: severityCounts.warning || 0,
      reviewCandidateCount: severityCounts.review || 0,
      autoExpiredCount: 0,
      proposedOnly: true,
      nextCardId: VERIFICATION_RUNS_NEXT_CARD_ID,
      bySourceType: typeCounts,
      byProposedAction: actionCounts,
    },
    candidates,
    topCandidates: candidates.slice(0, 20),
    boundary: VERIFICATION_RUNS_BOUNDARY,
    knownLimits: [
      'This report does not mutate cards, routes, or synthesized items.',
      'The first write-capable close-loop belongs to a later Reply/Watching or resolution workflow.',
      'Thresholds are v1 defaults and can be tuned after the first few scheduled runs.',
    ],
  }
}

export function buildSyntheticVerificationRunsProof() {
  const generatedAt = '2026-05-12T16:45:00.000Z'
  const snapshot = buildVerificationRunsSnapshot({
    generatedAt,
    backlogItems: [
      {
        id: 'RESEARCH-OLD-001',
        title: 'Old-system Plan Critic rebuild',
        team: 'foundation',
        lane: 'research',
        priority: 'P1',
        summary: 'Old system rebuild target.',
        nextAction: 'Review whether to promote.',
        updatedAt: '2026-03-01T12:00:00.000Z',
      },
      {
        id: 'RESEARCH-FRESH-001',
        title: 'Fresh research card',
        team: 'foundation',
        lane: 'research',
        priority: 'P2',
        summary: 'New research card.',
        nextAction: 'Leave parked.',
        updatedAt: '2026-05-11T12:00:00.000Z',
      },
      {
        id: 'DONE-OLD-001',
        title: 'Done old card',
        lane: 'done',
        updatedAt: '2026-03-01T12:00:00.000Z',
      },
    ],
    researchCuration: {
      cards: [
        { id: 'RESEARCH-OLD-001', curationState: 'leave_parked' },
        { id: 'RESEARCH-FRESH-001', curationState: 'leave_parked' },
      ],
    },
    intelligenceSynthesis: {
      recentItems: [
        {
          synthesizedItemId: 'syn-old-001',
          title: 'Old synthesized finding',
          status: 'ready_for_action_router',
          routingStatus: 'unrouted',
          suggestedOwner: 'Foundation',
          updatedAt: '2026-05-01T12:00:00.000Z',
          synthesisVerification: { status: 'verified' },
          sourceIds: ['SRC-TEST-001'],
        },
        {
          synthesizedItemId: 'syn-fresh-001',
          title: 'Fresh synthesized finding',
          status: 'ready_for_action_router',
          routingStatus: 'unrouted',
          suggestedOwner: 'Foundation',
          updatedAt: '2026-05-12T12:00:00.000Z',
          synthesisVerification: { status: 'verified' },
        },
        {
          synthesizedItemId: 'syn-archived-001',
          title: 'Archived old finding',
          status: 'archived',
          updatedAt: '2026-05-01T12:00:00.000Z',
        },
      ],
    },
    intelligenceActionRouter: {
      recentRoutes: [
        {
          routeId: 'route-old-001',
          routeType: 'backlog_task',
          approvalStatus: 'pending',
          owner: 'Foundation',
          routingReason: 'Old route',
          updatedAt: '2026-05-01T12:00:00.000Z',
          sourceIds: ['SRC-TEST-001'],
        },
        {
          routeId: 'route-fresh-001',
          routeType: 'backlog_task',
          approvalStatus: 'pending',
          owner: 'Foundation',
          routingReason: 'Fresh route',
          updatedAt: '2026-05-12T12:00:00.000Z',
        },
        {
          routeId: 'route-applied-001',
          routeType: 'backlog_task',
          approvalStatus: 'applied',
          owner: 'Foundation',
          routingReason: 'Applied route',
          updatedAt: '2026-05-01T12:00:00.000Z',
        },
      ],
    },
    backlogHygiene: {
      visibleFindings: [
        {
          cardId: 'HYGIENE-001',
          title: 'Synthetic hygiene finding',
          type: 'done_without_closeout_proof',
          severity: 'critical',
          lane: 'done',
          issue: 'Synthetic critical hygiene finding.',
        },
      ],
    },
  })
  const ids = new Set(snapshot.candidates.map(candidate => candidate.id))
  const checks = [
    {
      id: 'stale-research-detected',
      ok: ids.has('research:RESEARCH-OLD-001') && !ids.has('research:RESEARCH-FRESH-001'),
      detail: Array.from(ids).join(', '),
    },
    {
      id: 'stale-synthesis-detected',
      ok: ids.has('synthesis:syn-old-001') && !ids.has('synthesis:syn-fresh-001') && !ids.has('synthesis:syn-archived-001'),
      detail: Array.from(ids).join(', '),
    },
    {
      id: 'stale-action-route-detected',
      ok: ids.has('route:route-old-001') && !ids.has('route:route-fresh-001') && !ids.has('route:route-applied-001'),
      detail: Array.from(ids).join(', '),
    },
    {
      id: 'hygiene-candidate-included',
      ok: ids.has('hygiene:HYGIENE-001:done_without_closeout_proof'),
      detail: Array.from(ids).join(', '),
    },
    {
      id: 'proposed-only-no-auto-expiry',
      ok: snapshot.summary.proposedOnly === true &&
        snapshot.summary.autoExpiredCount === 0 &&
        snapshot.candidates.every(candidate => candidate.autoExpire === false),
      detail: JSON.stringify({
        proposedOnly: snapshot.summary.proposedOnly,
        autoExpiredCount: snapshot.summary.autoExpiredCount,
      }),
    },
    {
      id: 'next-card-is-per-user-changelog',
      ok: snapshot.summary.nextCardId === VERIFICATION_RUNS_NEXT_CARD_ID,
      detail: snapshot.summary.nextCardId,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    cardId: VERIFICATION_RUNS_CARD_ID,
    closeoutKey: VERIFICATION_RUNS_CLOSEOUT_KEY,
    checks,
    failedChecks: checks.filter(check => !check.ok),
    summary: snapshot.summary,
    candidates: snapshot.candidates,
  }
}
