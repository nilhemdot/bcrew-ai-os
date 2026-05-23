import crypto from 'node:crypto'

export const EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID = 'EXTRACTOR-OVERNIGHT-RUN-GUARD-001'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY = 'extractor-overnight-run-guard-v1'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID = 'proof:extractor-overnight-run-guard-001'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_WATCHLIST_SOURCE_ID = 'SRC-CREATOR-WATCHLIST-001'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY = 'youtube-godmode-guarded-extraction'
export const EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID = 'SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001'

export const EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY = {
  version: 'extractor-overnight-run-guard-v1',
  allowedSourceIds: [
    EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
    EXTRACTOR_OVERNIGHT_RUN_GUARD_WATCHLIST_SOURCE_ID,
  ],
  allowedPublicSurface: 'public_youtube_video',
  publicNoAuthOnly: true,
  maxCreatorsPerRun: 1,
  maxVideosPerRun: 5,
  maxGeminiVideoCallsPerRun: 5,
  maxSubscriptionBrainCallsPerRun: 5,
  maxRuntimeMinutes: 60,
  maxEstimatedTotalTokensPerRun: 2000000,
  maxEstimatedApiCostUsdPerRun: 1,
  staleRunBlockMinutes: 30,
  duplicateWindowHours: 24,
  maxAttemptsPerItem: 2,
  maxProviderRetriesPerItem: 1,
  requiredArtifactBase: 'artifact://build-intel/extraction-runs/',
  requiredMorningReview: true,
  requiredReviewBeforeScaleUp: true,
  nextRequiredProofCardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID,
  forbiddenSurfaces: [
    'skool',
    'myicor',
    'gumroad',
    'calendly',
    'loom',
    'discord_login_only',
    'reddit_login_only',
    'member',
    'comments',
    'course',
    'paid',
    'private',
    'auth_required',
  ],
  forbiddenActions: [
    'purchase',
    'download',
    'opt_in',
    'book_call',
    'submit_form',
    'send_external_message',
    'mutate_credentials',
    'mutate_browser_profile',
    'auto_create_backlog_card',
    'external_write',
  ],
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function addCheck(checks, ok, check, detail = '', stopCondition = '') {
  checks.push({
    ok: Boolean(ok),
    check,
    detail,
    stopCondition: ok ? null : stopCondition || check,
  })
}

function hoursBetween(a, b) {
  const aMs = Date.parse(a || '')
  const bMs = Date.parse(b || '')
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return null
  return Math.abs(aMs - bMs) / 3600000
}

function normalizeAction(action) {
  return text(action).toLowerCase().replace(/[\s-]+/g, '_')
}

function collectBoundaryValues(value, values = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectBoundaryValues(item, values)
    return values
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectBoundaryValues(item, values)
    return values
  }
  if (typeof value === 'string') values.push(value)
  return values
}

function combinedBoundaryText(request = {}) {
  return collectBoundaryValues({
    sourcePacket: request.sourcePacket || {},
    sourceItems: request.sourceItems || [],
    resourceLinks: request.resourceLinks || [],
    requestedActions: request.requestedActions || [],
  }).join(' ').toLowerCase()
}

function requestedForbiddenSurfaces(request = {}, policy = EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY) {
  const body = combinedBoundaryText(request)
  return policy.forbiddenSurfaces.filter(surface => {
    const escaped = surface.replace(/_/g, '[_\\s-]?')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(body)
  })
}

function requestedForbiddenActions(request = {}, policy = EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY) {
  const requested = new Set(list(request.requestedActions).map(normalizeAction))
  const body = combinedBoundaryText(request)
  return policy.forbiddenActions.filter(action => requested.has(action) || body.includes(action))
}

function runIsRecentDuplicate(run = {}, request = {}, generatedAt = new Date().toISOString(), policy = EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY) {
  const fingerprint = request.runFingerprint || buildRunFingerprint(request)
  const metadata = run.metadata || {}
  const runFingerprint = metadata.runFingerprint || metadata.guardRunFingerprint || null
  if (runFingerprint !== fingerprint) return false
  if (!['running', 'succeeded', 'partial'].includes(run.status)) return false
  const occurredAt = run.finishedAt || run.startedAt || run.updatedAt || run.createdAt
  const ageHours = hoursBetween(occurredAt, generatedAt)
  return ageHours != null && ageHours <= policy.duplicateWindowHours
}

export function buildRunFingerprint(request = {}) {
  return stableHash({
    sourceId: request.sourcePacket?.sourceId || request.sourceId || '',
    targetKey: request.targetKey || EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY,
    runType: request.runType || '',
    sourceItems: list(request.sourceItems).map(item => ({
      sourceId: item.sourceId || '',
      externalId: item.externalId || item.videoId || '',
      url: item.url || item.sourceUrl || '',
    })).sort((a, b) => `${a.sourceId}:${a.externalId}:${a.url}`.localeCompare(`${b.sourceId}:${b.externalId}:${b.url}`)),
  }).slice(0, 32)
}

export function buildAllowedPilotRequest({ generatedAt = new Date().toISOString() } = {}) {
  const sourceItems = [
    '5xrjO38WUYY',
    'yi1JlBnDZgc',
    'K65vd9EYbDU',
  ].map(videoId => ({
    sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
    itemType: 'public_youtube_video',
    externalId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    authRequired: false,
    publicNoAuth: true,
  }))

  const request = {
    requestId: 'guarded-mark-public-youtube-pilot',
    targetKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY,
    sourcePacket: {
      sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
      sourceName: 'Public YouTube Build Intel',
      approvalStatus: 'approved_public_no_auth',
      contentUseScope: 'internal_build_intel_only',
      authRequired: false,
    },
    runType: 'god_mode_video_quality_pilot',
    sourceItems,
    routeBudget: {
      geminiVideoCalls: sourceItems.length,
      subscriptionBrainCalls: sourceItems.length,
      estimatedTotalTokens: 900000,
      estimatedApiCostUsd: 0.75,
      maxRuntimeMinutes: 45,
    },
    artifactBase: `${EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY.requiredArtifactBase}${generatedAt.slice(0, 10)}/mark-public-youtube-pilot/`,
    morningReview: {
      required: true,
      destination: 'dev-team-hub',
      internalOnly: true,
      dueByLocalTime: '10:00',
    },
    retryPolicy: {
      maxAttemptsPerItem: 2,
      maxProviderRetriesPerItem: 1,
    },
    requestedActions: ['read_public_page', 'read_transcript', 'video_understanding', 'write_internal_report'],
    externalWrites: false,
    autoCreateBacklogCards: false,
  }

  return {
    ...request,
    runFingerprint: buildRunFingerprint(request),
  }
}

export function evaluateExtractorOvernightRunRequest(request = {}, context = {}) {
  const policy = context.policy || EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY
  const generatedAt = context.generatedAt || new Date().toISOString()
  const checks = []
  const sourceItems = list(request.sourceItems)
  const routeBudget = request.routeBudget || {}
  const sourcePacket = request.sourcePacket || {}
  const retryPolicy = request.retryPolicy || {}
  const morningReview = request.morningReview || {}
  const forbiddenSurfaces = requestedForbiddenSurfaces(request, policy)
  const forbiddenActions = requestedForbiddenActions(request, policy)
  const staleActiveRuns = list(context.staleActiveRuns)
  const recentRuns = list(context.recentRuns)
  const duplicateRuns = recentRuns.filter(run => runIsRecentDuplicate(run, request, generatedAt, policy))
  const creatorKeys = new Set(sourceItems.map(item => item.creatorId || item.creatorKey || item.sourceAccount || sourcePacket.sourceName || 'unknown'))

  addCheck(
    checks,
    policy.allowedSourceIds.includes(sourcePacket.sourceId || request.sourceId),
    'approved source packet is required',
    sourcePacket.sourceId || request.sourceId || 'missing',
    'source_packet_missing_or_unapproved',
  )
  addCheck(
    checks,
    /approved|public_no_auth|operator_approved/i.test(sourcePacket.approvalStatus || ''),
    'source packet records operator-approved public/no-auth scope',
    sourcePacket.approvalStatus || 'missing',
    'source_scope_not_approved',
  )
  addCheck(
    checks,
    sourceItems.length > 0 && sourceItems.length <= policy.maxVideosPerRun,
    'item count stays within overnight guard quota',
    `${sourceItems.length}/${policy.maxVideosPerRun}`,
    'item_quota_exceeded',
  )
  addCheck(
    checks,
    creatorKeys.size <= policy.maxCreatorsPerRun,
    'creator count stays within overnight guard quota',
    `${creatorKeys.size}/${policy.maxCreatorsPerRun}`,
    'creator_quota_exceeded',
  )
  addCheck(
    checks,
    sourceItems.every(item => item.publicNoAuth === true && item.authRequired !== true),
    'all source items are public no-auth',
    sourceItems.map(item => `${item.externalId || item.url || 'item'}:${item.publicNoAuth === true ? 'public' : 'not_public'}`).join(', '),
    'auth_or_private_source_detected',
  )
  addCheck(
    checks,
    forbiddenSurfaces.length === 0,
    'private/paid/auth/member/comment/course surfaces are blocked',
    forbiddenSurfaces.join(', ') || 'none',
    'forbidden_surface_detected',
  )
  addCheck(
    checks,
    forbiddenActions.length === 0 && request.externalWrites !== true && request.autoCreateBacklogCards !== true,
    'external write, purchase/download/opt-in, credential, profile, and auto-backlog actions are blocked',
    forbiddenActions.join(', ') || 'none',
    'forbidden_action_detected',
  )
  addCheck(
    checks,
    number(routeBudget.geminiVideoCalls, 0) <= policy.maxGeminiVideoCallsPerRun &&
      number(routeBudget.subscriptionBrainCalls, 0) <= policy.maxSubscriptionBrainCallsPerRun &&
      number(routeBudget.estimatedTotalTokens, 0) <= policy.maxEstimatedTotalTokensPerRun &&
      number(routeBudget.estimatedApiCostUsd, 0) <= policy.maxEstimatedApiCostUsdPerRun &&
      number(routeBudget.maxRuntimeMinutes, 0) <= policy.maxRuntimeMinutes,
    'route budget stays inside call/token/cost/runtime caps',
    JSON.stringify(routeBudget),
    'route_budget_exceeded',
  )
  addCheck(
    checks,
    text(request.artifactBase).startsWith(policy.requiredArtifactBase),
    'artifact base uses the governed extraction artifact namespace',
    request.artifactBase || 'missing',
    'artifact_namespace_missing',
  )
  addCheck(
    checks,
    morningReview.required === true && morningReview.internalOnly === true && text(morningReview.destination),
    'morning review is required and internal-only',
    JSON.stringify(morningReview),
    'morning_review_missing',
  )
  addCheck(
    checks,
    number(retryPolicy.maxAttemptsPerItem, 0) <= policy.maxAttemptsPerItem &&
      number(retryPolicy.maxProviderRetriesPerItem, 0) <= policy.maxProviderRetriesPerItem,
    'retry policy stays inside guard caps',
    JSON.stringify(retryPolicy),
    'retry_policy_exceeded',
  )
  addCheck(
    checks,
    staleActiveRuns.length === 0,
    'stale active runs must be zero before overnight run',
    `${staleActiveRuns.length} stale active run(s)`,
    'stale_active_run_detected',
  )
  addCheck(
    checks,
    duplicateRuns.length === 0,
    'duplicate recent run fingerprint is blocked',
    duplicateRuns.map(run => run.runId).join(', ') || 'none',
    'duplicate_recent_run_detected',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'allowed',
    requestId: request.requestId || 'unnamed-request',
    runFingerprint: request.runFingerprint || buildRunFingerprint(request),
    policyVersion: policy.version,
    checks,
    failed,
    stopConditions: Array.from(new Set(failed.map(check => check.stopCondition).filter(Boolean))),
  }
}

export function buildExtractorOvernightGuardDogfoodProof({ generatedAt = new Date().toISOString() } = {}) {
  const allowed = buildAllowedPilotRequest({ generatedAt })
  const duplicateRun = {
    runId: 'synthetic-duplicate-run',
    status: 'succeeded',
    startedAt: generatedAt,
    metadata: {
      runFingerprint: allowed.runFingerprint,
    },
  }
  const cases = [
    {
      name: 'allowed_public_youtube_pilot',
      expectAllowed: true,
      result: evaluateExtractorOvernightRunRequest(allowed, { generatedAt }),
    },
    {
      name: 'reject_mark_last_50_single_run',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest({
        ...allowed,
        requestId: 'bad-mark-last-50',
        sourceItems: Array.from({ length: 50 }, (_, index) => ({
          sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
          itemType: 'public_youtube_video',
          externalId: `mark-video-${index + 1}`,
          url: `https://www.youtube.com/watch?v=mark${index + 1}`,
          publicNoAuth: true,
          authRequired: false,
        })),
        routeBudget: { ...allowed.routeBudget, geminiVideoCalls: 50, subscriptionBrainCalls: 50, estimatedTotalTokens: 9000000, estimatedApiCostUsd: 12, maxRuntimeMinutes: 300 },
      }, { generatedAt }),
    },
    {
      name: 'reject_private_skool_source',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest({
        ...allowed,
        requestId: 'bad-skool',
        sourceItems: [{
          sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
          itemType: 'skool_paid_classroom',
          externalId: 'mark-skool-premium-recording',
          url: 'https://www.skool.com/earlyaidopters/classroom/private',
          publicNoAuth: false,
          authRequired: true,
        }],
      }, { generatedAt }),
    },
    {
      name: 'reject_missing_artifact_namespace',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest({ ...allowed, requestId: 'bad-artifact', artifactBase: '/tmp/extract' }, { generatedAt }),
    },
    {
      name: 'reject_stale_active_run',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest(allowed, {
        generatedAt,
        staleActiveRuns: [{ runId: 'synthetic-stale', status: 'running', startedAt: '2026-05-23T01:00:00.000Z' }],
      }),
    },
    {
      name: 'reject_duplicate_recent_run',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest(allowed, { generatedAt, recentRuns: [duplicateRun] }),
    },
    {
      name: 'reject_external_download_or_backlog_write',
      expectAllowed: false,
      result: evaluateExtractorOvernightRunRequest({
        ...allowed,
        requestId: 'bad-external-actions',
        requestedActions: ['read_public_page', 'download', 'auto_create_backlog_card'],
        autoCreateBacklogCards: true,
      }, { generatedAt }),
    },
  ]
  const ok = cases.every(item => item.expectAllowed ? item.result.ok : !item.result.ok)
  return { ok, cases }
}

export function buildExtractorOvernightGuardSnapshot({
  generatedAt = new Date().toISOString(),
  extractionControl = {},
  llmRuntime = {},
  currentSprint = {},
} = {}) {
  const targets = list(extractionControl.targets)
  const guardedTarget = targets.find(target => target.targetKey === EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY) || null
  const dailyWatchTarget = targets.find(target => target.targetKey === 'youtube-creator-daily-watch') || null
  const allowedRequest = buildAllowedPilotRequest({ generatedAt })
  const liveEvaluation = evaluateExtractorOvernightRunRequest(allowedRequest, {
    generatedAt,
    staleActiveRuns: extractionControl.staleActiveRuns || [],
    recentRuns: extractionControl.recentRuns || [],
  })
  const dogfood = buildExtractorOvernightGuardDogfoodProof({ generatedAt })
  const recentExtractionCalls = list(llmRuntime.recentCalls)
    .filter(call => /extraction|video/i.test(`${call.workload || ''} ${call.routeKey || ''} ${call.metadata?.cardId || ''}`))
    .slice(0, 10)
  const morningReview = {
    generatedAt,
    status: liveEvaluation.ok && dogfood.ok ? 'ready_for_subscription_brain_adapter_test' : 'blocked',
    targetSummary: extractionControl.summary || {},
    staleActiveRuns: list(extractionControl.staleActiveRuns).length,
    staleLeasedItems: list(extractionControl.staleLeasedItems).length,
    retryEligibleItems: number(extractionControl.summary?.retryEligibleItems, 0),
    recentRunFailures: number(extractionControl.summary?.recentRunFailures, 0),
    recentExtractionCalls: recentExtractionCalls.map(call => ({
      callId: call.callId,
      provider: call.provider,
      routeKey: call.routeKey,
      credentialKey: call.credentialKey,
      status: call.status,
      estimatedInputTokens: call.estimatedInputTokens,
      estimatedOutputTokens: call.estimatedOutputTokens,
      estimatedCostUsd: call.estimatedCostUsd,
      startedAt: call.startedAt,
    })),
    nextAction: `${EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID}: prove subscription mini-brain adapter before Mark last-50 or creator latest-20 scale-up.`,
  }
  const failures = [
    ...liveEvaluation.failed.map(item => item.check),
    ...(dogfood.ok ? [] : ['dogfood cases failed']),
    ...(dailyWatchTarget ? [] : ['youtube-creator-daily-watch target missing']),
  ]
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    generatedAt,
    cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
    closeoutKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY,
    policy: EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY,
    allowedRequest,
    liveEvaluation,
    dogfood,
    guardedTarget,
    dailyWatchTarget: dailyWatchTarget ? {
      targetKey: dailyWatchTarget.targetKey,
      status: dailyWatchTarget.status,
      runtimeMode: dailyWatchTarget.runtimeMode,
      budget: dailyWatchTarget.budget,
      nextRunAt: dailyWatchTarget.nextRunAt,
      itemSummary: dailyWatchTarget.itemSummary,
    } : null,
    morningReview,
    currentSprint: {
      sprintId: currentSprint.sprint?.sprintId || null,
      activeBlockerCardId: currentSprint.sprint?.activeBlockerCardId || null,
    },
    failures,
  }
}

export function buildExtractorOvernightGuardWriteSet(snapshot = {}) {
  const reportArtifact = {
    reportArtifactId: EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'Extractor Overnight Run Guard',
    status: 'generated',
    sourceIds: [
      EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
      EXTRACTOR_OVERNIGHT_RUN_GUARD_WATCHLIST_SOURCE_ID,
    ],
    inputArtifactIds: [],
    topFindings: [
      {
        finding: 'Broad Mark last-50 and creator latest-20 extraction remain blocked until the guarded route is proven.',
        evidence: snapshot.policy,
      },
      {
        finding: 'The next required card is the subscription mini-brain adapter test, not bulk extraction.',
        evidence: EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID,
      },
      {
        finding: 'Dogfood rejects quota overflow, private/auth source drift, missing artifact namespace, stale run, duplicate run, and external action drift.',
        evidence: snapshot.dogfood?.cases?.map(item => ({ name: item.name, status: item.result.status, stopConditions: item.result.stopConditions })) || [],
      },
    ],
    actionRequiredItems: [
      {
        actionRequiredId: 'approval:subscription-brain-extractor-adapter-test',
        title: 'Prove subscription mini-brain extractor adapter before scale-up',
        owner: 'Steve / Foundation Extraction',
        status: 'required_next',
        cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID,
        reason: 'Steve wants to test whether subscription brains can supply extractor reasoning before paying API tokens for broad video analysis.',
      },
    ],
    openQuestions: [],
    structuredOutputJson: {
      snapshot,
      guardPolicy: snapshot.policy,
      morningReview: snapshot.morningReview,
      allowedRequest: snapshot.allowedRequest,
      liveEvaluation: snapshot.liveEvaluation,
      dogfood: snapshot.dogfood,
      reviewRoutes: [{
        reviewRouteId: 'build-intel-review:extractor-overnight-run-guard:subscription-brain-adapter',
        sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
        proposalOnly: true,
        writesBacklog: false,
        externalWrites: false,
        requiresSteveReview: true,
        recommendation: `Run ${EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID} before broad extraction.`,
        routingReason: 'Guard policy explicitly blocks scale-up until the mini-brain adapter has a focused proof.',
      }],
    },
    metadata: {
      cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
      closeoutKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY,
      targetKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY,
      nextRequiredProofCardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      publicYoutubeOnly: true,
    },
  }

  const atomInputs = [
    {
      atomId: 'atom:extractor-overnight-run-guard-001:guard-policy',
      title: 'Guarded extraction must pass quotas, source boundaries, artifact namespace, duplicate/stale checks, and morning review.',
      content: 'The extractor may run only under an approved public/no-auth source packet, a small per-run quota, a governed artifact namespace, zero stale active runs, no duplicate recent fingerprint, and an internal morning review.',
      atomType: 'workflow',
      topicRefs: ['god-mode-extractor', 'overnight-run-guard', 'build-intel'],
      suggestedAction: 'Use this guard envelope before any Mark last-50 or creator latest-20 extraction.',
    },
    {
      atomId: 'atom:extractor-overnight-run-guard-001:subscription-brain-next',
      title: 'Subscription mini-brain adapter proof is the next required extractor card.',
      content: 'Scale-up should wait until the extractor proves whether a logged-in subscription brain can provide the reasoning path Steve expects without broad API-token burn.',
      atomType: 'action_candidate',
      topicRefs: ['subscription-brain', 'extractor', 'brain-fleet'],
      suggestedAction: `Build ${EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID} before Mark-scale extraction.`,
    },
    {
      atomId: 'atom:extractor-overnight-run-guard-001:private-source-stop',
      title: 'Private, paid, auth, comments, downloads, opt-ins, and external writes fail closed.',
      content: 'The guard dogfood blocks Skool/MyICOR/Gumroad/Calendly/member/comment/course surfaces and any purchase/download/opt-in/form/credential/profile/external write behavior.',
      atomType: 'risk',
      topicRefs: ['source-boundary', 'privacy', 'extractor'],
      suggestedAction: 'Keep private and paid source items approval-bound until an exact source item and auth scope are approved.',
    },
  ].map((atom, index) => ({
    ...atom,
    sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
    reportArtifactId: EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID,
    modality: 'text',
    anchorType: 'process_card',
    anchorValue: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
    evidenceExcerpt: atom.content.slice(0, 900),
    derivedClaim: atom.suggestedAction,
    department: 'foundation',
    pillar: 'dev-team',
    valueRoute: 'aios_build_intelligence',
    qualityScore: 88 - index,
    relevanceScore: 92 - index,
    sourceConfidence: 0.95,
    extractionConfidence: 0.95,
    sensitivity: 'neutral',
    minTier: 1,
    freshness: 'structural',
    status: 'detected',
    tags: ['extractor-guard', 'proposal-only', 'source-boundary'],
    metadata: {
      cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
      closeoutKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY,
      nextRequiredProofCardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID,
      proposalOnly: true,
      writesBacklog: false,
    },
    dedupHash: stableHash({ cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID, atomId: atom.atomId }),
  }))

  const hitInputs = atomInputs.map(atom => ({
    hitId: `hit:${atom.atomId}`,
    atomId: atom.atomId,
    sourceId: EXTRACTOR_OVERNIGHT_RUN_GUARD_SOURCE_ID,
    reportArtifactId: EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID,
    hitType: 'supporting_evidence',
    evidenceExcerpt: atom.evidenceExcerpt,
    anchorType: 'process_card',
    anchorValue: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
    confidence: atom.extractionConfidence,
    metadata: {
      cardId: EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID,
      closeoutKey: EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY,
    },
  }))

  return { reportArtifact, atomInputs, hitInputs }
}

export function verifyExtractorOvernightGuardPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  addCheck(checks, report?.reportArtifactId === EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID, 'report artifact reads back', report?.reportArtifactId || 'missing')
  addCheck(checks, list(atoms).length >= 3, 'guard atoms read back', `${list(atoms).length}/3`)
  addCheck(checks, list(hits).length >= list(atoms).length, 'guard hits read back', `${list(hits).length}/${list(atoms).length}`)
  addCheck(checks, snapshot?.dogfood?.ok === true, 'dogfood proof remains healthy', snapshot?.dogfood?.ok ? 'ok' : 'failed')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, checks, failed }
}

export function renderExtractorOvernightGuardCloseout(snapshot = {}) {
  return `# Extractor Overnight Run Guard Closeout

Closeout key: \`${EXTRACTOR_OVERNIGHT_RUN_GUARD_CLOSEOUT_KEY}\`
Card: \`${EXTRACTOR_OVERNIGHT_RUN_GUARD_CARD_ID}\`
Report artifact: \`${EXTRACTOR_OVERNIGHT_RUN_GUARD_REPORT_ARTIFACT_ID}\`
Guard policy key: \`${EXTRACTOR_OVERNIGHT_RUN_GUARD_TARGET_KEY}\`

## What Shipped

- Added the governed overnight extraction run envelope for public YouTube God Mode extraction.
- Added quotas for creators, videos, Gemini calls, subscription-brain calls, runtime, estimated tokens, and estimated API cost.
- Added fail-closed checks for private/auth/paid/member/comment/course surfaces, purchases/downloads/opt-ins/forms, credential/profile mutation, external writes, auto backlog promotion, missing artifact namespace, stale active runs, and duplicate recent fingerprints.
- Persisted a morning-review report, proposal-only atoms, and evidence hits into Foundation truth.
- Persisted guard policy/report truth without creating a new source-crawl target; the subscription mini-brain adapter card owns any future runnable target.

## Result

- Status: \`${snapshot.status || 'unknown'}\`
- Safe pilot max: ${EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY.maxVideosPerRun} public videos / ${EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY.maxCreatorsPerRun} creator / ${EXTRACTOR_OVERNIGHT_RUN_GUARD_POLICY.maxRuntimeMinutes} minutes
- Stale active runs: ${snapshot.morningReview?.staleActiveRuns ?? 'unknown'}
- Dogfood cases: ${snapshot.dogfood?.cases?.length || 0}

## Next

Continue \`${EXTRACTOR_OVERNIGHT_RUN_GUARD_NEXT_CARD_ID}\` before Mark last-50 or creator latest-20 scale-up.

## Not Next

- Do not run Mark last-50 or broader latest-20 extraction yet.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, Discord, Reddit login-only, comments, members, paid, private, auth-required, or course sources.
- Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from findings.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission mutation.

## Proof Commands

- \`node --check lib/extractor-overnight-run-guard.js\`
- \`node --check scripts/process-extractor-overnight-run-guard-check.mjs\`
- \`npm run process:extractor-overnight-run-guard-check -- --close-card --json\`
- \`npm run process:current-sprint-active-card-gate-check -- --json\`
- \`npm run backlog:hygiene -- --json\`
- \`npm run process:foundation-plan-reconcile-check -- --json\`
- \`npm run foundation:verify -- --json-summary\`
`
}
