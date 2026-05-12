export const FOUNDATION_UI_COMPLETE_CARD_ID = 'FOUNDATION-UI-COMPLETE-001'
export const FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY = 'foundation-ui-complete-v1'
export const FOUNDATION_UI_COMPLETE_PLAN_PATH = 'docs/process/foundation-ui-complete-001-plan.md'
export const FOUNDATION_UI_COMPLETE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-UI-COMPLETE-001.json'
export const FOUNDATION_UI_COMPLETE_SCRIPT_PATH = 'scripts/process-foundation-ui-complete-check.mjs'
export const FOUNDATION_UI_COMPLETE_SUMMARY_MARKER = 'FOUNDATION_UI_COMPLETE_SUMMARY'
export const FOUNDATION_UI_COMPLETE_NEXT_REVIEW = 'Foundation Source Once-Over is complete for v1; run sprint review/rollover before pulling Reply/Watching Loop, Strategy expansion, Marketing production, Telegram bots, Directors, or any other product layer.'

const REQUIRED_SECTIONS = [
  'source-maturity-grid',
  'source-extraction-coverage',
  'source-coverage-closeout',
  'marketing-source-map',
  'brand-stack',
  'tier-behavioral-completion',
  'verification-runs',
  'per-user-changelog',
  'restricted-decision-queue',
  'current-sprint',
]

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function boolValue(value) {
  return value === true
}

function buildSection({
  id,
  label,
  status = 'visible',
  tone = 'connected',
  metric = '',
  detail = '',
  anchor = id,
  nextAction = '',
} = {}) {
  return {
    id,
    label,
    status,
    tone,
    metric,
    detail,
    anchor,
    nextAction,
  }
}

function sourceMaturitySection(grid = {}) {
  const summary = grid.summary || {}
  const rows = Array.isArray(grid.rows) ? grid.rows : []
  const gapSources = numberValue(summary.gapSources)
  const deferredSources = numberValue(summary.deferredSources)
  return buildSection({
    id: 'source-maturity-grid',
    label: 'Source maturity',
    status: rows.length ? 'visible' : 'missing',
    tone: !rows.length ? 'missing' : gapSources ? 'pending' : 'connected',
    metric: `${rows.length || numberValue(summary.sourceCount)} sources`,
    detail: `${numberValue(summary.completeSources)} complete, ${gapSources} gaps, ${deferredSources} deferred across connected, trusted, monitored, extracted, atomized, synthesized, and routed stages.`,
    nextAction: gapSources ? 'Review top source maturity gaps before claiming deeper source completeness.' : 'Keep the maturity grid current as new source work lands.',
  })
}

function extractionCoverageSection(coverage = {}) {
  const summary = coverage.summary || {}
  const rows = Array.isArray(coverage.rows) ? coverage.rows : []
  const failures = numberValue(summary.sourcesWithFailure)
  const pending = numberValue(summary.sourcesPending)
  return buildSection({
    id: 'source-extraction-coverage',
    label: 'Extraction coverage',
    status: rows.length ? 'visible' : 'missing',
    tone: !rows.length ? 'missing' : failures ? 'missing' : pending ? 'pending' : 'connected',
    metric: `${numberValue(summary.last24hRuns)} runs / ${numberValue(summary.last24hItems)} items in 24h`,
    detail: `${numberValue(summary.sourcesWithLastSuccess)} sources have last-success proof, ${failures} have failure/gap state, ${numberValue(summary.sourcesDeferred)} are deferred, and ${numberValue(summary.sourcesNotRequired)} are not required for v1.`,
    nextAction: failures || pending ? 'Use the extraction table to route each source to retry, deferral, or not-required status.' : 'Keep daily extraction visibility running.',
  })
}

function sourceCoverageCloseoutSection(closeout = {}) {
  const summary = closeout.summary || {}
  const rows = Array.isArray(closeout.rows) ? closeout.rows : []
  const routed = numberValue(summary.routedDecisionCount)
  return buildSection({
    id: 'source-coverage-closeout',
    label: 'Source closeout',
    status: rows.length ? 'visible' : 'missing',
    tone: !rows.length ? 'missing' : routed ? 'pending' : 'connected',
    metric: `${numberValue(summary.closedDecisionCount)} closed / ${routed} routed`,
    detail: `${numberValue(summary.extractionGapFollowupCount)} extraction gaps and ${numberValue(summary.maturityGapFollowupCount)} maturity gaps are explicitly routed instead of hidden.`,
    nextAction: routed ? 'Pull only the routed source follow-up cards after sprint review.' : 'Source rows are closed for this Foundation pass.',
  })
}

function marketingSourceMapSection(map = {}) {
  const summary = map.summary || {}
  const lanes = Array.isArray(map.lanes) ? map.lanes : []
  const gaps = numberValue(summary.gapSourceRefs)
  const pending = numberValue(summary.pendingSourceRefs)
  return buildSection({
    id: 'marketing-source-map',
    label: 'Marketing source map',
    status: lanes.length ? 'visible' : 'missing',
    tone: !lanes.length ? 'missing' : gaps ? 'missing' : pending ? 'pending' : 'connected',
    metric: `${numberValue(summary.laneCount)} lanes / ${numberValue(summary.avatarCount)} avatars`,
    detail: `${numberValue(summary.mappedSourceRefs)} mapped source refs, ${pending} pending refs, ${gaps} gap refs, and marketing production remains ${summary.marketingProductionBuilt ? 'built' : 'not built'}.`,
    nextAction: gaps || pending ? 'Review brand lane source refs before marketing production work.' : 'Use this as the brand/source input for future Marketing work.',
  })
}

function brandStackSection(stack = {}) {
  const summary = stack.summary || {}
  const brands = Array.isArray(stack.brands) ? stack.brands : []
  const missing = numberValue(summary.missingSourceRefCount)
  const review = numberValue(summary.reviewRequiredBrandCount)
  return buildSection({
    id: 'brand-stack',
    label: 'Brand stack',
    status: brands.length ? 'visible' : 'missing',
    tone: !brands.length ? 'missing' : missing ? 'missing' : review ? 'pending' : 'connected',
    metric: `${numberValue(summary.brandCount)} brands / ${numberValue(summary.guardianBoundaryCount)} boundaries`,
    detail: `${numberValue(summary.avatarAssignmentCount)} avatar assignments and ${numberValue(summary.sourceRefCount)} source refs are attached to Brand Guardian boundaries; enforcement remains ${summary.brandGuardianEnforcementBuilt ? 'built' : 'not built'}.`,
    nextAction: 'Keep Brand Guardian enforcement as a future card; this pass models the source truth only.',
  })
}

function tierBehaviorSection(proof = {}) {
  const summary = proof.summary || {}
  const surfaces = Array.isArray(proof.surfaces) ? proof.surfaces : []
  const failed = numberValue(summary.failedSurfaceCount)
  const missing = numberValue(summary.missingRoutePostureCount)
  return buildSection({
    id: 'tier-behavioral-completion',
    label: 'Tier behavior',
    status: surfaces.length ? 'visible' : 'missing',
    tone: !surfaces.length || failed || missing ? 'missing' : 'connected',
    metric: `${numberValue(summary.surfaceCount)} surfaces`,
    detail: `${numberValue(summary.roleFilteredSurfaceCount)} role-filtered surfaces, ${numberValue(summary.ownerOnlySurfaceCount)} owner-only surfaces, subject-person proof ${summary.subjectPersonProofOk ? 'passes' : 'needs review'}.`,
    nextAction: failed || missing ? 'Fix route posture or keep the surface owner-only.' : 'Do not broaden access without a new behavior proof.',
  })
}

function verificationRunsSection(run = {}) {
  const summary = run.summary || {}
  const risk = numberValue(summary.riskCandidateCount)
  return buildSection({
    id: 'verification-runs',
    label: 'Verification runs',
    status: run.summary ? 'visible' : 'missing',
    tone: !run.summary ? 'missing' : risk ? 'pending' : 'connected',
    metric: `${numberValue(summary.candidateCount)} review candidates`,
    detail: `${numberValue(summary.staleResearchCount)} stale research, ${numberValue(summary.staleSynthesisCount)} synthesized findings, ${numberValue(summary.staleActionRouteCount)} action routes, ${numberValue(summary.backlogHygieneCandidateCount)} backlog hygiene candidates; auto-expired count is ${numberValue(summary.autoExpiredCount)}.`,
    nextAction: risk ? 'Review proposed stale candidates; do not auto-expire without a later card.' : 'Keep proposed-only stale review scheduled.',
  })
}

function perUserChangelogSection(log = {}) {
  const summary = log.summary || {}
  const missingCoverage = numberValue(summary.missingCoverageCount)
  return buildSection({
    id: 'per-user-changelog',
    label: 'Per-user changelog',
    status: log.summary ? 'visible' : 'missing',
    tone: !log.summary ? 'missing' : missingCoverage ? 'pending' : 'connected',
    metric: `${numberValue(summary.eventCount)} events / ${numberValue(summary.actorCount)} actors`,
    detail: `${numberValue(summary.changedCount)} changed, ${numberValue(summary.approvedCount)} approved, ${numberValue(summary.appliedCount)} applied, ${numberValue(summary.systemCount)} system; metadata values are ${summary.metadataValuesIncluded ? 'included' : 'excluded'}.`,
    nextAction: missingCoverage ? 'Route viewed/ignored/received history to a later audit-log card.' : 'Use this as current write/activity audit visibility.',
  })
}

function restrictedDecisionQueueSection(queue = {}) {
  const summary = queue.summary || {}
  const restricted = numberValue(summary.restrictedCount)
  return buildSection({
    id: 'restricted-decision-queue',
    label: 'Restricted decisions',
    status: queue.summary ? 'visible' : 'missing',
    tone: !queue.summary ? 'missing' : summary.autoApplies || summary.autoLocks ? 'missing' : restricted ? 'pending' : 'connected',
    metric: `${restricted} restricted / ${numberValue(summary.generalCount)} general`,
    detail: `${numberValue(summary.matchedCategoryCount)} restricted rule groups are active. Owner-only: ${summary.ownerOnly ? 'yes' : 'no'}; proposed-only: ${summary.proposedOnly ? 'yes' : 'no'}.`,
    nextAction: restricted ? 'Owner reviews restricted decisions only; general contexts stay filtered.' : 'Keep the filter active for future sensitive decisions.',
  })
}

function currentSprintSection(currentSprint = {}) {
  const summary = currentSprint.summary || {}
  const complete = currentSprint.cadence?.currentStatus === 'complete'
  return buildSection({
    id: 'current-sprint',
    label: 'Current sprint',
    status: currentSprint.status === 'healthy' ? 'visible' : 'missing',
    tone: currentSprint.status === 'healthy' && complete ? 'connected' : 'pending',
    metric: `${numberValue(summary.doneThisSprintCount)} done this sprint`,
    detail: `Active blocker is ${summary.activeBlockerCardId || 'none'} and sprint status is ${(currentSprint.cadence?.currentStatusDetail || currentSprint.cadence?.currentStatus || 'unknown')}.`,
    anchor: 'current-sprint',
    nextAction: complete ? FOUNDATION_UI_COMPLETE_NEXT_REVIEW : (currentSprint.cadence?.nextAction || 'Review Current Sprint.'),
  })
}

export function buildFoundationUiCompleteSnapshot({
  sourceLifecycle = {},
  currentSprint = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const sections = [
    sourceMaturitySection(sourceLifecycle.sourceMaturityGrid),
    extractionCoverageSection(sourceLifecycle.sourceExtractionCoverage),
    sourceCoverageCloseoutSection(sourceLifecycle.sourceCoverageCloseout),
    marketingSourceMapSection(sourceLifecycle.marketingSourceMap),
    brandStackSection(sourceLifecycle.brandStack),
    tierBehaviorSection(sourceLifecycle.tierBehavioralCompletion),
    verificationRunsSection(sourceLifecycle.verificationRuns),
    perUserChangelogSection(sourceLifecycle.perUserChangelog),
    restrictedDecisionQueueSection(sourceLifecycle.restrictedDecisionQueue),
    currentSprintSection(currentSprint),
  ]
  const missingRequiredSections = REQUIRED_SECTIONS.filter(sectionId =>
    !sections.some(section => section.id === sectionId && section.status === 'visible')
  )
  const riskSections = sections.filter(section => section.tone === 'missing')
  const reviewSections = sections.filter(section => section.tone === 'pending')
  const missingVisibleSections = sections.filter(section => section.status === 'missing')
  const maturitySummary = sourceLifecycle.sourceMaturityGrid?.summary || {}
  const extractionSummary = sourceLifecycle.sourceExtractionCoverage?.summary || {}
  const closeoutSummary = sourceLifecycle.sourceCoverageCloseout?.summary || {}
  const marketingSummary = sourceLifecycle.marketingSourceMap?.summary || {}
  const brandSummary = sourceLifecycle.brandStack?.summary || {}
  const tierSummary = sourceLifecycle.tierBehavioralCompletion?.summary || {}
  const verificationSummary = sourceLifecycle.verificationRuns?.summary || {}
  const changelogSummary = sourceLifecycle.perUserChangelog?.summary || {}
  const decisionSummary = sourceLifecycle.restrictedDecisionQueue?.summary || {}
  const sprintComplete = currentSprint.cadence?.currentStatus === 'complete' ||
    currentSprint.summary?.activeBlockerCardId === FOUNDATION_UI_COMPLETE_CARD_ID

  return {
    status: missingRequiredSections.length || missingVisibleSections.length ? 'risk' : 'healthy',
    closeoutKey: FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
    cardId: FOUNDATION_UI_COMPLETE_CARD_ID,
    generatedAt,
    summary: {
      sectionCount: sections.length,
      requiredSectionCount: REQUIRED_SECTIONS.length,
      missingRequiredSectionCount: missingRequiredSections.length,
      reviewSectionCount: reviewSections.length,
      riskSectionCount: riskSections.length,
      sourceCount: numberValue(maturitySummary.sourceCount) || numberValue(maturitySummary.totalSources),
      sourceGapCount: numberValue(maturitySummary.gapSources),
      extractionGapCount: numberValue(extractionSummary.sourcesWithFailure) + numberValue(extractionSummary.sourcesPending),
      routedSourceGapCount: numberValue(closeoutSummary.routedDecisionCount),
      brandLaneCount: numberValue(marketingSummary.laneCount),
      avatarCount: numberValue(marketingSummary.avatarCount),
      brandCount: numberValue(brandSummary.brandCount),
      tierSurfaceCount: numberValue(tierSummary.surfaceCount),
      failedTierSurfaceCount: numberValue(tierSummary.failedSurfaceCount),
      verificationCandidateCount: numberValue(verificationSummary.candidateCount),
      verificationRiskCount: numberValue(verificationSummary.riskCandidateCount),
      auditActorCount: numberValue(changelogSummary.actorCount),
      auditMissingCoverageCount: numberValue(changelogSummary.missingCoverageCount),
      restrictedDecisionCount: numberValue(decisionSummary.restrictedCount),
      generalDecisionCount: numberValue(decisionSummary.generalCount),
      ownerOnly: boolValue(decisionSummary.ownerOnly),
      proposedOnly: boolValue(decisionSummary.proposedOnly),
      sprintComplete,
      productExpansionBuilt: false,
      nextReview: FOUNDATION_UI_COMPLETE_NEXT_REVIEW,
    },
    sections,
    missingRequiredSections,
    reviewSections: reviewSections.map(section => section.id),
    riskSections: riskSections.map(section => section.id),
    topVisibleGaps: [
      ...((sourceLifecycle.sourceMaturityGrid?.topGaps || []).slice(0, 4).map(item => ({
        source: 'source_maturity',
        label: item.sourceId,
        detail: `${item.nextGap}: ${item.detail}`,
      }))),
      ...((sourceLifecycle.sourceExtractionCoverage?.topAttention || []).slice(0, 4).map(item => ({
        source: 'extraction_coverage',
        label: item.sourceId,
        detail: `${item.extractionState}: ${item.reason}`,
      }))),
      ...((sourceLifecycle.sourceCoverageCloseout?.routedRows || []).slice(0, 4).map(item => ({
        source: 'source_closeout',
        label: item.sourceId,
        detail: `${item.nextCardId}: ${item.reason}`,
      }))),
    ].slice(0, 10),
    boundaries: [
      'This is a Foundation UI/readability closeout, not a new product surface.',
      'Do not build Reply Parser, Watching Items, Strategy expansion, Marketing production, Telegram bots, Directors, or Drive ACL mutation from this card.',
      'Visible gaps are allowed; hidden gaps are not.',
      'Sprint rollover/review comes before the next rebuild target.',
    ],
  }
}

export function buildSyntheticFoundationUiCompleteProof() {
  const snapshot = buildFoundationUiCompleteSnapshot({
    sourceLifecycle: {
      sourceMaturityGrid: {
        summary: { sourceCount: 35, completeSources: 21, gapSources: 14, deferredSources: 4 },
        rows: new Array(35).fill(null).map((_, index) => ({ sourceId: `SRC-${index}` })),
        topGaps: [{ sourceId: 'SRC-DRIVE', nextGap: 'extracted', detail: 'Office files need follow-up' }],
      },
      sourceExtractionCoverage: {
        summary: { sourceCount: 35, sourcesWithLastSuccess: 22, sourcesWithFailure: 2, sourcesPending: 4, sourcesDeferred: 5, sourcesNotRequired: 2, last24hRuns: 7, last24hItems: 92 },
        rows: new Array(35).fill(null).map((_, index) => ({ sourceId: `SRC-${index}` })),
        topAttention: [{ sourceId: 'SRC-ADS', extractionState: 'auth_failed', reason: 'Google Ads auth needs repair' }],
      },
      sourceCoverageCloseout: {
        summary: { sourceCount: 35, closedDecisionCount: 31, routedDecisionCount: 4, extractionGapFollowupCount: 2, maturityGapFollowupCount: 2 },
        rows: new Array(35).fill(null).map((_, index) => ({ sourceId: `SRC-${index}` })),
        routedRows: [{ sourceId: 'SRC-ADS', nextCardId: 'SOURCE-EXTRACT-GAP-FOLLOWUP-001', reason: 'auth gap' }],
      },
      marketingSourceMap: {
        summary: { laneCount: 5, avatarCount: 15, mappedSourceRefs: 9, pendingSourceRefs: 1, gapSourceRefs: 0, marketingProductionBuilt: false },
        lanes: new Array(5).fill(null).map((_, index) => ({ laneId: `lane-${index}` })),
      },
      brandStack: {
        summary: { brandCount: 5, guardianBoundaryCount: 5, avatarAssignmentCount: 20, sourceRefCount: 9, reviewRequiredBrandCount: 1, missingSourceRefCount: 0, brandGuardianEnforcementBuilt: false },
        brands: new Array(5).fill(null).map((_, index) => ({ brandId: `brand-${index}` })),
      },
      tierBehavioralCompletion: {
        summary: { surfaceCount: 14, roleFilteredSurfaceCount: 4, ownerOnlySurfaceCount: 10, failedSurfaceCount: 0, missingRoutePostureCount: 0, subjectPersonProofOk: true },
        surfaces: new Array(14).fill(null).map((_, index) => ({ id: `surface-${index}` })),
      },
      verificationRuns: {
        summary: { candidateCount: 54, riskCandidateCount: 3, staleResearchCount: 21, staleSynthesisCount: 5, staleActionRouteCount: 18, backlogHygieneCandidateCount: 10, autoExpiredCount: 0 },
      },
      perUserChangelog: {
        summary: { eventCount: 100, actorCount: 3, changedCount: 80, approvedCount: 4, appliedCount: 1, systemCount: 15, metadataValuesIncluded: false, missingCoverageCount: 3 },
      },
      restrictedDecisionQueue: {
        summary: { restrictedCount: 2, generalCount: 7, matchedCategoryCount: 3, ownerOnly: true, proposedOnly: true, autoApplies: false, autoLocks: false },
      },
    },
    currentSprint: {
      status: 'healthy',
      cadence: { currentStatus: 'complete', currentStatusDetail: 'complete' },
      summary: { activeBlockerCardId: FOUNDATION_UI_COMPLETE_CARD_ID, doneThisSprintCount: 10 },
    },
    generatedAt: '2026-05-12T18:30:00.000Z',
  })

  const hasAllRequiredSections = REQUIRED_SECTIONS.every(sectionId =>
    snapshot.sections.some(section => section.id === sectionId && section.status === 'visible')
  )
  const sourceGapVisible = snapshot.topVisibleGaps.some(item => item.source === 'source_maturity')
  const extractionGapVisible = snapshot.topVisibleGaps.some(item => item.source === 'extraction_coverage')
  const sourceCloseoutVisible = snapshot.topVisibleGaps.some(item => item.source === 'source_closeout')
  const noProductExpansion = snapshot.summary.productExpansionBuilt === false &&
    snapshot.boundaries.some(boundary => boundary.includes('Reply Parser'))

  return {
    ok: snapshot.status === 'healthy' &&
      hasAllRequiredSections &&
      snapshot.summary.sectionCount === REQUIRED_SECTIONS.length &&
      snapshot.summary.sourceCount === 35 &&
      snapshot.summary.avatarCount === 15 &&
      snapshot.summary.brandCount === 5 &&
      snapshot.summary.tierSurfaceCount === 14 &&
      snapshot.summary.auditActorCount === 3 &&
      snapshot.summary.restrictedDecisionCount === 2 &&
      snapshot.summary.ownerOnly === true &&
      snapshot.summary.proposedOnly === true &&
      snapshot.summary.sprintComplete === true &&
      sourceGapVisible &&
      extractionGapVisible &&
      sourceCloseoutVisible &&
      noProductExpansion,
    summary: snapshot.summary,
    sections: snapshot.sections.map(section => section.id),
    topVisibleGaps: snapshot.topVisibleGaps,
    boundaries: snapshot.boundaries,
  }
}
