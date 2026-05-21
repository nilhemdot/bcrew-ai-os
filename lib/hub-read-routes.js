import {
  buildFoundationSystemHealthSnapshot,
} from './foundation-system-health.js'

export const HUB_READ_ROUTES_SPLIT_CARD_ID = 'HUB-READ-ROUTES-SPLIT-001'
export const HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY = 'hub-read-routes-split-v1'
export const HUB_READ_ROUTES_SPLIT_PLAN_PATH = 'docs/process/hub-read-routes-split-001-plan.md'
export const HUB_READ_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/HUB-READ-ROUTES-SPLIT-001.json'
export const HUB_READ_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-hub-read-routes-split-check.mjs'
export const HUB_READ_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6592
export const HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS = 15000
export const HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1_500_000

function requireDependency(deps, key) {
  const value = deps[key]
  if (value === undefined || value === null) throw new Error(`registerHubReadRoutes requires ${key}.`)
  return value
}

function truncatePayloadText(value, maxLength = 240) {
  const text = String(value || '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function sendFoundationHubPayload(res, payload, { mode, startedAtMs, deps }) {
  const prepared = deps.attachFoundationHubPerformanceMetadata(payload, { mode, startedAtMs })
  deps.cacheHeadersNoStore(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Foundation-Hub-Mode', prepared.payload.foundationHubPerformance.mode)
  res.setHeader('X-Foundation-Hub-Payload-Bytes', String(prepared.bytes))
  res.send(prepared.json)
}

function compactChangeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return null
  const compact = {}
  if (metadata.targetDocPath) compact.targetDocPath = metadata.targetDocPath
  if (Array.isArray(metadata.changedFields)) compact.changedFields = metadata.changedFields.slice(0, 12)
  if (metadata.status) compact.status = metadata.status
  if (metadata.context && typeof metadata.context === 'object') {
    compact.context = {
      key: metadata.context.key || null,
      label: metadata.context.label || null,
    }
  }
  if (metadata.stats && typeof metadata.stats === 'object') compact.stats = metadata.stats
  if (metadata.stale && typeof metadata.stale === 'object') {
    compact.stale = {
      isStale: metadata.stale.isStale === true,
      ageHours: metadata.stale.ageHours == null ? null : Math.round(Number(metadata.stale.ageHours) * 10) / 10,
      thresholdHours: metadata.stale.thresholdHours ?? null,
    }
  }
  if (metadata.fingerprint) compact.fingerprint = metadata.fingerprint
  return Object.keys(compact).length ? compact : null
}

function compactFoundationRecentChange(change = {}) {
  if (!change || typeof change !== 'object') return null
  return {
    id: change.id || null,
    eventType: change.eventType || null,
    entityTable: change.entityTable || null,
    entityId: change.entityId || null,
    actor: change.actor || null,
    summary: truncatePayloadText(change.summary, 220),
    metadata: compactChangeMetadata(change.metadata),
    createdAt: change.createdAt || null,
  }
}

function compactFoundationRecentChanges(changes = []) {
  if (!Array.isArray(changes)) return []
  return changes.map(compactFoundationRecentChange).filter(Boolean)
}

function compactFullDiagnosticsBacklogItems({ compactRows = [], fullRows = [] } = {}) {
  const fullRowById = new Map(
    (Array.isArray(fullRows) ? fullRows : [])
      .map(row => [String(row?.id || ''), row])
      .filter(([id]) => id),
  )
  return (Array.isArray(compactRows) ? compactRows : []).map(row => {
    if (!row || typeof row !== 'object') return row
    const fullRow = fullRowById.get(String(row.id || '')) || {}
    const diagnosticRow = { ...row }
    if (!Object.keys(fullRow).length) return diagnosticRow
    const {
      nextAction,
      next_action: nextActionSnake,
      summary,
      statusNote,
      status_note: statusNoteSnake,
      whyItMatters,
      why_it_matters: whyItMattersSnake,
    } = fullRow
    if (summary) diagnosticRow.summary = summary
    if (statusNote || statusNoteSnake) diagnosticRow.statusNote = statusNote || statusNoteSnake
    if (nextAction || nextActionSnake) diagnosticRow.nextAction = nextAction || nextActionSnake
    const compactWhy = truncatePayloadText(whyItMatters || whyItMattersSnake, 120)
    if (compactWhy) diagnosticRow.whyItMatters = compactWhy
    return diagnosticRow
  })
}

function compactActionRouteForHub(route = {}) {
  if (!route || typeof route !== 'object') return null
  return {
    routeId: route.routeId || null,
    runId: route.runId || null,
    synthesizedItemId: route.synthesizedItemId || null,
    synthesizedItemNaturalKey: route.synthesizedItemNaturalKey || null,
    routeType: route.routeType || null,
    destinationTable: route.destinationTable || null,
    destinationRecordId: route.destinationRecordId || null,
    approvalStatus: route.approvalStatus || null,
    approvalRequired: route.approvalRequired === true,
    owner: route.owner || null,
    ownerConfidence: route.ownerConfidence || null,
    routingReason: truncatePayloadText(route.routingReason, 220),
    sourceIds: Array.isArray(route.sourceIds) ? route.sourceIds : [],
    factRefs: Array.isArray(route.factRefs) ? route.factRefs : [],
    evidenceRefs: Array.isArray(route.evidenceRefs) ? route.evidenceRefs : [],
    evidenceChunkRefs: Array.isArray(route.evidenceChunkRefs) ? route.evidenceChunkRefs : [],
    atomRefs: Array.isArray(route.atomRefs) ? route.atomRefs : [],
    sensitivity: route.sensitivity || null,
    minTier: route.minTier ?? null,
    decisionGrade: route.decisionGrade === true,
    routedAt: route.routedAt || null,
    updatedAt: route.updatedAt || null,
    metadata: {
      cardId: route.metadata?.cardId || null,
      closeoutKey: route.metadata?.closeoutKey || null,
      foundation1100Review: route.metadata?.foundation1100Review || null,
      noExternalWrite: route.metadata?.noExternalWrite === true,
      noLiveExtraction: route.metadata?.noLiveExtraction === true,
    },
    sourceProof: route.sourceProof
      ? {
          status: route.sourceProof.status || null,
          sourceIds: Array.isArray(route.sourceProof.sourceIds) ? route.sourceProof.sourceIds : [],
          factRefs: Array.isArray(route.sourceProof.factRefs) ? route.sourceProof.factRefs : [],
          evidenceRefs: Array.isArray(route.sourceProof.evidenceRefs) ? route.sourceProof.evidenceRefs : [],
          evidenceChunkRefs: Array.isArray(route.sourceProof.evidenceChunkRefs) ? route.sourceProof.evidenceChunkRefs : [],
          atomRefs: Array.isArray(route.sourceProof.atomRefs) ? route.sourceProof.atomRefs : [],
        }
      : null,
  }
}

function compactFoundationActionRouterForHub(actionRouter = {}) {
  if (!actionRouter || typeof actionRouter !== 'object') return actionRouter
  return {
    ...actionRouter,
    recentRoutes: Array.isArray(actionRouter.recentRoutes)
      ? actionRouter.recentRoutes.map(compactActionRouteForHub).filter(Boolean)
      : [],
    fullPayloadCompacted: true,
    detailPath: '/api/foundation/action-route-review-inbox',
  }
}

function compactPerUserActivity(activity = {}) {
  if (!activity || typeof activity !== 'object') return null
  return {
    id: activity.id || null,
    actorKey: activity.actorKey || null,
    actorKind: activity.actorKind || null,
    activityType: activity.activityType || null,
    eventType: activity.eventType || null,
    entityTable: activity.entityTable || null,
    entityId: activity.entityId || null,
    summary: truncatePayloadText(activity.summary, 180),
    occurredAt: activity.occurredAt || null,
    metadataKeyCount: activity.metadataKeyCount ?? null,
    metadataValuesIncluded: activity.metadataValuesIncluded === true,
  }
}

function compactPerUserActor(actor = {}) {
  if (!actor || typeof actor !== 'object') return null
  return {
    actorKey: actor.actorKey || null,
    displayName: actor.displayName || null,
    actorKind: actor.actorKind || null,
    userType: actor.userType || null,
    tier: actor.tier ?? null,
    active: actor.active ?? null,
    eventCount: actor.eventCount ?? 0,
    latestAt: actor.latestAt || null,
    counts: actor.counts || {},
    eventTypes: Array.isArray(actor.eventTypes) ? actor.eventTypes.slice(0, 8) : [],
    entityTables: Array.isArray(actor.entityTables) ? actor.entityTables.slice(0, 8) : [],
    recentActivity: Array.isArray(actor.recentActivity)
      ? actor.recentActivity.slice(0, 3).map(compactPerUserActivity).filter(Boolean)
      : [],
  }
}

function compactFoundationPerUserChangelog(log = {}) {
  if (!log || typeof log !== 'object') return log
  return {
    schemaVersion: log.schemaVersion || null,
    cardId: log.cardId || null,
    closeoutKey: log.closeoutKey || null,
    generatedAt: log.generatedAt || null,
    status: log.status || null,
    source: log.source || null,
    summary: log.summary || {},
    coverage: Array.isArray(log.coverage) ? log.coverage : [],
    missingCoverage: Array.isArray(log.missingCoverage) ? log.missingCoverage : [],
    activeActors: Array.isArray(log.activeActors)
      ? log.activeActors.slice(0, 12).map(compactPerUserActor).filter(Boolean)
      : [],
    recentActivity: Array.isArray(log.recentActivity)
      ? log.recentActivity.slice(0, 12).map(compactPerUserActivity).filter(Boolean)
      : [],
    boundaries: Array.isArray(log.boundaries) ? log.boundaries : [],
    fullPayloadCompacted: true,
  }
}

function compactFoundationRun(run = {}) {
  if (!run || typeof run !== 'object') return null
  return {
    runId: run.runId || run.run_id || null,
    status: run.status || null,
    generatedAt: run.generatedAt || run.createdAt || run.finishedAt || run.updatedAt || null,
    startedAt: run.startedAt || run.started_at || null,
    finishedAt: run.finishedAt || run.finished_at || null,
    durationMs: run.durationMs || run.duration_ms || null,
    candidatesRead: run.candidatesRead || run.candidates_read || run.summary?.candidatesRead || null,
    itemsProduced: run.itemsProduced || run.items_produced || run.summary?.itemsProduced || null,
  }
}

function compactSynthesisItem(item = {}) {
  return {
    synthesisItemId: item.synthesisItemId,
    runId: item.runId,
    rank: item.rank,
    itemType: item.itemType,
    status: item.status,
    title: item.title,
    oneLine: item.oneLine,
    whyItMatters: item.whyItMatters,
    recommendedNextAction: item.recommendedNextAction,
    suggestedOwner: item.suggestedOwner,
    sourceCount: item.sourceCount,
    sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds : [],
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    createdAt: item.createdAt,
  }
}

function compactSharedCommunicationSynthesis(synthesis = {}) {
  if (!synthesis || typeof synthesis !== 'object') return synthesis
  return {
    latestRun: compactFoundationRun(synthesis.latestRun),
    runs: Array.isArray(synthesis.runs) ? synthesis.runs.slice(0, 5).map(compactFoundationRun) : [],
    latestItems: Array.isArray(synthesis.latestItems) ? synthesis.latestItems.map(compactSynthesisItem) : [],
    latestTrustedItems: Array.isArray(synthesis.latestTrustedItems) ? synthesis.latestTrustedItems.map(compactSynthesisItem) : [],
    latestAdvisoryItems: Array.isArray(synthesis.latestAdvisoryItems) ? synthesis.latestAdvisoryItems.map(compactSynthesisItem) : [],
    verificationSummary: synthesis.verificationSummary || null,
    fullPayloadCompacted: true,
  }
}

function compactLifecycleChild(child = {}) {
  if (!child || typeof child !== 'object') return child
  return {
    status: child.status,
    cardId: child.cardId,
    closeoutKey: child.closeoutKey,
    generatedAt: child.generatedAt,
    summary: child.summary || null,
  }
}

function compactFoundationSourceLifecycle(lifecycle = {}) {
  if (!lifecycle || typeof lifecycle !== 'object') return lifecycle
  return {
    schemaVersion: lifecycle.schemaVersion,
    generatedAt: lifecycle.generatedAt,
    cardId: lifecycle.cardId,
    closeoutKey: lifecycle.closeoutKey,
    route: lifecycle.route,
    apiPath: lifecycle.apiPath,
    definitions: lifecycle.definitions,
    scope: lifecycle.scope,
    summary: lifecycle.summary,
    findings: lifecycle.findings,
    lanes: lifecycle.lanes,
    sources: lifecycle.sources,
    targets: lifecycle.targets,
    systems: lifecycle.systems,
    sourceMaturityGrid: compactLifecycleChild(lifecycle.sourceMaturityGrid),
    sourceCoverageCloseout: compactLifecycleChild(lifecycle.sourceCoverageCloseout),
    sourceExtractionCoverage: compactLifecycleChild(lifecycle.sourceExtractionCoverage),
    sourceConnectorMatrix: compactLifecycleChild(lifecycle.sourceConnectorMatrix),
    sourceHubRoutingMatrix: compactLifecycleChild(lifecycle.sourceHubRoutingMatrix),
    marketingSourceMap: compactLifecycleChild(lifecycle.marketingSourceMap),
    brandStack: compactLifecycleChild(lifecycle.brandStack),
    tierBehavioralCompletion: compactLifecycleChild(lifecycle.tierBehavioralCompletion),
    verificationRuns: compactLifecycleChild(lifecycle.verificationRuns),
    perUserChangelog: compactLifecycleChild(lifecycle.perUserChangelog),
    restrictedDecisionQueue: compactLifecycleChild(lifecycle.restrictedDecisionQueue),
    foundationUiComplete: compactLifecycleChild(lifecycle.foundationUiComplete),
    currentSprint: compactLifecycleChild(lifecycle.currentSprint),
    fullPayloadCompacted: true,
  }
}

function compactExtractionBudget(budget = {}) {
  if (!budget || typeof budget !== 'object') return {}
  const allowedKeys = [
    'llmBudget',
    'dailyMissionQuota',
    'maxItemsPerRun',
    'maxRuntimeSeconds',
    'maxCreatorsPerRun',
    'maxVideosPerCreator',
    'markBaselineDepth',
    'defaultBaselineDepth',
    'publicNoAuthOnly',
    'maxTextChars',
    'maxPdfBytes',
    'maxSheets',
    'maxSheetRows',
    'maxSheetColumns',
    'maxAttachmentBytes',
    'maxFoldersPerRun',
    'maxArtifactsPerRun',
    'maxFilesPerRun',
    'requiresFiledOutput',
    'retrySkippedReasonPrefixes',
  ]
  return allowedKeys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(budget, key)) acc[key] = budget[key]
    return acc
  }, {})
}

function compactExtractionControlTarget(target = {}) {
  if (!target || typeof target !== 'object') return null
  const driveInventory = target.cursorState?.driveInventory
  const cursorState = target.cursorState && typeof target.cursorState === 'object'
    ? {
        artifactCount: target.cursorState.artifactCount ?? null,
        latestArtifactAt: target.cursorState.latestArtifactAt || null,
        driveInventory: driveInventory && typeof driveInventory === 'object'
          ? {
              inspectedFolderCount: driveInventory.inspectedFolderCount || 0,
              queuedFolderCount: driveInventory.queuedFolderCount || 0,
              latestInspectedAt: driveInventory.latestInspectedAt || null,
            }
          : null,
      }
    : null
  return {
    targetKey: target.targetKey || null,
    sourceId: target.sourceId || null,
    title: target.title || null,
    lane: target.lane || null,
    targetType: target.targetType || null,
    status: target.status || null,
    queueStatus: target.queueStatus || null,
    priority: target.priority || null,
    runtimeMode: target.runtimeMode || null,
    effectiveRuntimeMode: target.effectiveRuntimeMode || null,
    foundationJobKey: target.foundationJobKey || target.metadata?.foundationJobKey || null,
    budget: compactExtractionBudget(target.budget),
    dedupePolicy: target.dedupePolicy || null,
    lastRunAt: target.lastRunAt || null,
    nextRunAt: target.nextRunAt || null,
    effectiveNextRunAt: target.effectiveNextRunAt || null,
    lastStatus: target.lastStatus || null,
    lastError: truncatePayloadText(target.lastError, 220),
    inspectedCount: target.inspectedCount ?? null,
    archivedCount: target.archivedCount ?? null,
    extractedCount: target.extractedCount ?? null,
    cursorState,
    metadata: {
      cardId: target.metadata?.cardId || null,
      closeoutKey: target.metadata?.closeoutKey || null,
      foundationJobKey: target.metadata?.foundationJobKey || null,
      reportArtifactId: target.metadata?.reportArtifactId || null,
      publicYoutubeOnly: target.metadata?.publicYoutubeOnly === true,
      noAuth: target.metadata?.noAuth === true,
      noExternalWrites: target.metadata?.noExternalWrites === true,
      createsBacklogCardsAutomatically: target.metadata?.createsBacklogCardsAutomatically === true,
      approvalStatus: target.metadata?.approvalStatus || null,
      queueStatus: target.metadata?.queueStatus || null,
      noLiveExtraction: target.metadata?.noLiveExtraction === true,
      liveRunApproved: target.metadata?.liveRunApproved === true,
      sourceCandidates: Array.isArray(target.metadata?.sourceCandidates)
        ? target.metadata.sourceCandidates.map(candidate => ({
            sourceKey: candidate.sourceKey || null,
            creatorId: candidate.creatorId || null,
            creatorName: candidate.creatorName || null,
            title: truncatePayloadText(candidate.title, 160),
            sourceUrl: candidate.sourceUrl || null,
            lookupStatus: candidate.lookupStatus || null,
            accessClass: candidate.accessClass || null,
            approvalStatus: candidate.approvalStatus || null,
            extractionStatus: candidate.extractionStatus || null,
          }))
        : [],
    },
    scheduler: target.scheduler
      ? {
          source: target.scheduler.source || null,
          scheduleTruth: target.scheduler.scheduleTruth || null,
          foundationJobKey: target.scheduler.foundationJobKey || null,
          runtimeMode: target.scheduler.runtimeMode || null,
          scheduleStatus: target.scheduler.scheduleStatus || null,
          due: target.scheduler.due === true,
          nextRunAt: target.scheduler.nextRunAt || null,
          crawlCheckpointNextRunAt: target.scheduler.crawlCheckpointNextRunAt || null,
          latestRunStatus: target.scheduler.latestRunStatus || null,
          latestRunAt: target.scheduler.latestRunAt || null,
        }
      : null,
    itemSummary: target.itemSummary
      ? {
          totalItems: target.itemSummary.totalItems || 0,
          pendingItems: target.itemSummary.pendingItems || 0,
          leasedItems: target.itemSummary.leasedItems || 0,
          succeededItems: target.itemSummary.succeededItems || 0,
          failedItems: target.itemSummary.failedItems || 0,
          skippedItems: target.itemSummary.skippedItems || 0,
          latestItemUpdatedAt: target.itemSummary.latestItemUpdatedAt || null,
        }
      : null,
    healthFindings: Array.isArray(target.healthFindings) ? target.healthFindings : [],
  }
}

function compactExtractionControlRun(run = {}) {
  if (!run || typeof run !== 'object') return null
  return {
    runId: run.runId || null,
    targetKey: run.targetKey || null,
    sourceId: run.sourceId || null,
    status: run.status || null,
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    nextRunAt: run.nextRunAt || null,
    lastError: truncatePayloadText(run.lastError, 220),
    inspectedDelta: run.inspectedDelta || 0,
    archivedDelta: run.archivedDelta || 0,
    extractedDelta: run.extractedDelta || 0,
    metadata: {
      cardId: run.metadata?.cardId || null,
      closeoutKey: run.metadata?.closeoutKey || null,
      reportArtifactId: run.metadata?.reportArtifactId || null,
      persistedItemCount: run.metadata?.persistedItemCount || null,
    },
  }
}

function compactExtractionControlItem(item = {}) {
  if (!item || typeof item !== 'object') return null
  return {
    itemKey: item.itemKey || null,
    targetKey: item.targetKey || null,
    sourceId: item.sourceId || null,
    externalId: item.externalId || null,
    itemType: item.itemType || null,
    status: item.status || null,
    retryState: item.retryState || null,
    attemptCount: item.attemptCount || 0,
    artifactId: item.artifactId || null,
    discoveredAt: item.discoveredAt || null,
    processedAt: item.processedAt || null,
    updatedAt: item.updatedAt || null,
    metadata: {
      creatorId: item.metadata?.creatorId || null,
      creator: item.metadata?.creator || null,
      videoId: item.metadata?.videoId || null,
      title: truncatePayloadText(item.metadata?.title, 180),
      url: item.metadata?.url || null,
      reviewState: item.metadata?.reviewState || null,
      proposalOnly: item.metadata?.proposalOnly === true,
    },
  }
}

function compactExtractionControlCoverage(row = {}) {
  if (!row || typeof row !== 'object') return null
  return {
    targetKey: row.targetKey || null,
    sourceId: row.sourceId || null,
    title: row.title || null,
    lane: row.lane || null,
    status: row.status || null,
    runtimeMode: row.runtimeMode || null,
    nextBiteAt: row.nextBiteAt || null,
    crawlCheckpointNextRunAt: row.crawlCheckpointNextRunAt || null,
    lastSuccessAt: row.lastSuccessAt || null,
    lastFailureAt: row.lastFailureAt || null,
    totalRuns: row.totalRuns ?? row.runCount ?? 0,
    successfulRuns: row.successfulRuns || 0,
    failedRuns: row.failedRuns || 0,
    counts: row.counts
      ? {
          totalItems: row.counts.totalItems || 0,
          succeededItems: row.counts.succeededItems || 0,
          skippedItems: row.counts.skippedItems || 0,
          failedItems: row.counts.failedItems || 0,
          pendingItems: row.counts.pendingItems || 0,
          leasedItems: row.counts.leasedItems || 0,
        }
      : null,
    topReasons: Array.isArray(row.topReasons)
      ? row.topReasons.slice(0, 8).map(reason => ({
          status: reason.status || null,
          reason: reason.reason || reason.label || null,
          count: reason.count || 0,
        }))
      : [],
    remainingBacklogIndicators: Array.isArray(row.remainingBacklogIndicators)
      ? row.remainingBacklogIndicators.map(indicator => ({
          label: indicator.label || null,
          count: indicator.count || 0,
          detail: truncatePayloadText(indicator.detail, 160),
        }))
      : [],
  }
}

function compactFoundationExtractionControlForHub(control = {}) {
  if (!control || typeof control !== 'object') return control
  return {
    generatedAt: control.generatedAt || null,
    summary: control.summary || null,
    hardeningStatus: control.hardeningStatus || null,
    retryStateCounts: control.retryStateCounts || {},
    targets: Array.isArray(control.targets)
      ? control.targets.map(compactExtractionControlTarget).filter(Boolean)
      : [],
    coverageByTarget: Array.isArray(control.coverageByTarget)
      ? control.coverageByTarget.map(compactExtractionControlCoverage).filter(Boolean)
      : [],
    recentItems: Array.isArray(control.recentItems)
      ? control.recentItems.slice(0, 50).map(compactExtractionControlItem).filter(Boolean)
      : [],
    recentRuns: Array.isArray(control.recentRuns)
      ? control.recentRuns.slice(0, 50).map(compactExtractionControlRun).filter(Boolean)
      : [],
    staleActiveRuns: Array.isArray(control.staleActiveRuns)
      ? control.staleActiveRuns.map(compactExtractionControlRun).filter(Boolean)
      : [],
    recentStaleReapedRuns: Array.isArray(control.recentStaleReapedRuns)
      ? control.recentStaleReapedRuns.map(compactExtractionControlRun).filter(Boolean)
      : [],
    staleLeasedItems: Array.isArray(control.staleLeasedItems)
      ? control.staleLeasedItems.map(compactExtractionControlItem).filter(Boolean)
      : [],
    fullPayloadCompacted: true,
  }
}

function compactCurrentSprintItemForHub(item = {}) {
  if (!item || typeof item !== 'object') return null
  return {
    cardId: item.cardId || null,
    stage: item.stage || null,
    order: item.order ?? item.sprintOrder ?? null,
    title: truncatePayloadText(item.title || item.backlog?.title, 140),
    backlogLane: item.backlogLane || item.backlog?.lane || null,
    backlogPriority: item.backlogPriority || item.backlog?.priority || null,
    existingWorkCheckStatus: item.existingWorkCheckStatus || null,
    closeoutKey: item.closeoutKey || item.metadata?.closeoutKey || null,
    nextAction: truncatePayloadText(item.nextAction || item.backlogNextAction || item.backlog?.nextAction, 180),
  }
}

function compactFoundationCurrentSprintForHub(currentSprint = {}) {
  if (!currentSprint || typeof currentSprint !== 'object') return currentSprint
  return {
    status: currentSprint.status || null,
    sprintId: currentSprint.sprintId || null,
    sprintStatus: currentSprint.sprintStatus || null,
    goal: truncatePayloadText(currentSprint.goal, 220),
    activeBlocker: currentSprint.activeBlocker || null,
    stageRegistry: Array.isArray(currentSprint.stageRegistry) ? currentSprint.stageRegistry : [],
    stages: Array.isArray(currentSprint.stages)
      ? currentSprint.stages.map(stage => ({
          key: stage.key || null,
          label: stage.label || null,
          items: Array.isArray(stage.items) ? stage.items.map(compactCurrentSprintItemForHub).filter(Boolean) : [],
        }))
      : [],
    items: Array.isArray(currentSprint.items) ? currentSprint.items.map(compactCurrentSprintItemForHub).filter(Boolean) : [],
    cadence: currentSprint.cadence
      ? {
          executiveSummary: truncatePayloadText(currentSprint.cadence.executiveSummary, 220),
          sprintGoal: truncatePayloadText(currentSprint.cadence.sprintGoal, 220),
          currentStatus: currentSprint.cadence.currentStatus || null,
          nextCard: currentSprint.cadence.nextCard || null,
          currentBlocker: currentSprint.cadence.currentBlocker || null,
          exitCriteria: Array.isArray(currentSprint.cadence.exitCriteria)
            ? currentSprint.cadence.exitCriteria.slice(0, 8).map(item => truncatePayloadText(item, 180))
            : [],
          stageCounts: currentSprint.cadence.stageCounts || {},
          returnedCount: currentSprint.cadence.returnedCount ?? 0,
          nextAction: truncatePayloadText(currentSprint.cadence.nextAction, 220),
          noDriveMutationApproved: currentSprint.cadence.noDriveMutationApproved === true,
          truthSource: currentSprint.cadence.truthSource || {},
        }
      : null,
    summary: currentSprint.summary || {},
    findings: Array.isArray(currentSprint.findings) ? currentSprint.findings.slice(0, 8) : [],
    fullPayloadCompacted: true,
  }
}

async function buildFoundationHubSummaryPayload(deps) {
  const snapshot = await deps.getFoundationCoreSnapshot()
  const backlogContract = deps.buildFoundationHubBacklogContract({
    backlogItems: snapshot.backlogItems || [],
  })
  const backlogHygiene = deps.buildBacklogHygieneSnapshot({
    backlogItems: snapshot.backlogItems || [],
    closeouts: deps.getFoundationBuildCloseouts(),
  })
  const foundation1100Review = deps.compactFoundationReviewSprintSnapshot(deps.buildFoundationReviewSprintStatus({
    artifact: await deps.loadFoundationReviewSprintArtifact({ repoRoot: deps.repoRoot }),
    backlogItems: snapshot.backlogItems || [],
    actionRouter: {},
    hygiene: backlogHygiene,
  }))
  const researchCuration = deps.compactResearchCurationSnapshot(deps.buildResearchCurationStatus({
    backlogItems: snapshot.backlogItems || [],
    foundationReviewSprint: foundation1100Review,
  }))
  const [foundationJobs, workerCode, activeFoundationSprint, decisionAutoEmitScan, kpiHealth] = await Promise.all([
    deps.getFoundationJobRunSnapshot({ limit: 20 }).then(deps.compactFoundationJobRunSnapshot),
    deps.getFoundationRuntimeStatus('foundation-worker').catch(() => null),
    deps.getActiveFoundationCurrentSprint(),
    deps.scanDecisionAutoEmitCandidates({ synthetic: true, cwd: deps.repoRoot }).catch(() => ({
      candidateCount: 0,
      candidates: [],
      summary: { status: 'risk', riskFindings: ['Decision Auto-Emit summary unavailable in fast Foundation Hub mode.'] },
    })),
    deps.getCachedSafeKpiHealthSnapshot(),
  ])
  const currentSprint = deps.buildFoundationCurrentSprintStatus({
    sprint: activeFoundationSprint.sprint,
    items: activeFoundationSprint.items,
    backlogItems: snapshot.backlogItems || [],
    closeouts: deps.getFoundationBuildCloseouts(),
    planCriticRuns: activeFoundationSprint.planCriticRuns || [],
  })
  const compactCurrentSprint = compactFoundationCurrentSprintForHub(currentSprint)
  const decisionAutoEmit = {
    status: decisionAutoEmitScan.candidateCount > 0 ? 'healthy' : 'risk',
    summary: deps.buildDecisionAutoEmitSummary(decisionAutoEmitScan),
    candidates: decisionAutoEmitScan.candidates || [],
    dryRunDefault: true,
    applyRequired: true,
    plainEnglish: 'Decision Auto-Emit finds obvious decision language and creates proposed decisions only when apply mode is explicitly used.',
  }
  const currentStateSummary = deps.buildFoundationCurrentStateSummaryPayload({
    sourceContracts: deps.getSourceContracts(),
    backlogItems: snapshot.backlogItems || [],
    kpiHealth,
    currentSprint: compactCurrentSprint,
  })

  return {
    ...snapshot,
    recentChanges: compactFoundationRecentChanges(snapshot.recentChanges),
    backlogItems: backlogContract.backlogItems,
    backlogContract: backlogContract.backlogContract,
    foundationHubView: deps.buildFoundationHubSummaryInfo(),
    backlogHygiene,
    foundation1100Review,
    researchCuration,
    foundationJobs,
    decisionAutoEmit,
    currentSprint: compactCurrentSprint,
    currentStateSummary,
    runtimeSupervisor: {
      servedCode: deps.getDashboardRuntimeMetadata(),
      workerCode: workerCode || deps.getMissingWorkerRuntimeMetadata(),
    },
  }
}

export function buildHubReadRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const salesWriteMarker = "app.post('/api/sales-" + "hub/listing-assignment'"
  const healthy = {
    serverSource: `import { registerHubReadRoutes } from './lib/hub-read-routes.js'\nregisterHubReadRoutes(app, {})\n${salesWriteMarker}, requireAdminToken, async () => {})`,
    moduleSource: [
      'registerHubReadRoutes',
      "app.get('/api/foundation-hub'",
      "app.get('/api/foundation/current-sprint'",
      "app.get('/api/ops-hub'",
      "app.get('/api/sales-hub'",
      'buildFoundationHubSummaryPayload',
    ].join(' '),
    proofScriptSource: 'live hub read route probes route behavior round-trip sales write routes remain in server.js',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    const readRouteMarkers = [
      "app.get('/api/foundation-hub'",
      "app.get('/api/foundation/current-sprint'",
      "app.get('/api/ops-hub'",
      "app.get('/api/sales-hub'",
    ]
    const writeRouteMarker = salesWriteMarker
    return readRouteMarkers.every(marker => nextModuleSource.includes(marker)) &&
      readRouteMarkers.every(marker => !nextServerSource.includes(marker)) &&
      nextServerSource.includes('registerHubReadRoutes(app') &&
      nextServerSource.includes(writeRouteMarker) &&
      !nextModuleSource.includes(writeRouteMarker) &&
      nextProofScriptSource.includes('route behavior round-trip') &&
      nextProofScriptSource.includes('sales write routes remain in server.js')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineFoundationHub: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/api/foundation-hub', () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: '' }) === false,
    movedSalesWriteRoute: evaluate({ ...healthy, serverSource: healthy.serverSource.replace(`${salesWriteMarker}, requireAdminToken, async () => {})`, ''), moduleSource: `${healthy.moduleSource}\n${salesWriteMarker}, () => {})` }) === false,
    weakProof: evaluate({ ...healthy, proofScriptSource: 'substring-only markers' }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'Hub read route split dogfood accepts healthy read-route module ownership and rejects missing module, old inline read routes, missing registrar, moved Sales write route, and weak proof.',
  }
}

export function registerHubReadRoutes(app, deps = {}) {
  const sendApiError = requireDependency(deps, 'sendApiError')
  const cacheHeadersNoStore = requireDependency(deps, 'cacheHeadersNoStore')
  const normalizeFoundationHubMode = requireDependency(deps, 'normalizeFoundationHubMode')
  requireDependency(deps, 'attachFoundationHubPerformanceMetadata')
  requireDependency(deps, 'getFoundationSnapshot')
  requireDependency(deps, 'getSalesHubPayload')

  app.get('/api/foundation-hub', deps.requireAdminToken, async (req, res) => {
    const startedAtMs = Date.now()
    try {
      const mode = normalizeFoundationHubMode(req.query?.view || req.query?.mode || req.query?.detail)
      if (mode === 'summary') {
        const summaryPayload = await buildFoundationHubSummaryPayload(deps)
        sendFoundationHubPayload(res, summaryPayload, { mode, startedAtMs, deps })
        return
      }

      const snapshot = await deps.getFoundationSnapshot()
      const kpiHealth = await deps.getCachedSafeKpiHealthSnapshot()
      const backlogHygiene = deps.buildBacklogHygieneSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
      })
      const foundation1100Review = deps.buildFoundationReviewSprintStatus({
        artifact: await deps.loadFoundationReviewSprintArtifact({ repoRoot: deps.repoRoot }),
        backlogItems: snapshot.backlogItems || [],
        actionRouter: snapshot.intelligenceActionRouter || {},
        hygiene: backlogHygiene,
      })
      const docArchiveCleanup = await deps.buildDocArchiveCleanupStatus({ repoRoot: deps.repoRoot })
      const researchCuration = deps.buildResearchCurationStatus({
        backlogItems: snapshot.backlogItems || [],
        foundationReviewSprint: foundation1100Review,
      })
      const exceptionCuration = await deps.buildExceptionCurationStatus({ repoRoot: deps.repoRoot })
      const hitListReconcile = await deps.buildHitListReconcileStatusFromFile({
        repoRoot: deps.repoRoot,
        backlogItems: snapshot.backlogItems || [],
      })
      const archiveRetire = await deps.buildArchiveRetireStatus({ repoRoot: deps.repoRoot })
      const postShipFanout = await deps.buildPostShipFanoutStatus({
        closeouts: deps.getFoundationBuildCloseouts(),
        backlogItems: snapshot.backlogItems || [],
      })
      const doctrinePropagation = await deps.buildDoctrinePropagationStatus({
        repoRoot: deps.repoRoot,
        apply: false,
      })
      const gateReliability = await deps.buildSyntheticGateReliabilityProof()
      const personalWorkspaceBoundary = await deps.buildPersonalWorkspaceBoundaryStatus({
        repoRoot: deps.repoRoot,
        includeSynthetic: true,
      })
      const ceoDashboardPattern = await deps.buildCeoDashboardPatternStatus({
        repoRoot: deps.repoRoot,
      })
      const decisionAutoEmitScan = await deps.scanDecisionAutoEmitCandidates({ synthetic: true, cwd: deps.repoRoot })
      const decisionAutoEmit = {
        status: decisionAutoEmitScan.candidateCount > 0 ? 'healthy' : 'risk',
        summary: deps.buildDecisionAutoEmitSummary(decisionAutoEmitScan),
        candidates: decisionAutoEmitScan.candidates,
        dryRunDefault: true,
        applyRequired: true,
        plainEnglish: 'Decision Auto-Emit finds obvious decision language and creates proposed decisions only when apply mode is explicitly used.',
      }
      const sheetsApiTrust = await deps.getGoogleSheetsCacheStats()
      const workerCode = await deps.getFoundationRuntimeStatus('foundation-worker')
      const sourceLifecycle = deps.buildSourceLifecycleStatus({
        sources: deps.getSourceContracts(),
        connectors: deps.getSourceConnectors(),
        groupedSystems: deps.getGroupedSourceSystems(),
        extractionControl: snapshot.extractionControl,
        foundationJobs: deps.getFoundationJobDefinitions(),
      })
      const sourceMaturityGrid = deps.buildSourceMaturityGridSnapshot({
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
        intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
        sourceMaturityOperational: snapshot.sourceMaturityOperational,
        lifecycle: sourceLifecycle,
      })
      sourceLifecycle.sourceMaturityGrid = sourceMaturityGrid
      const sourceExtractionCoverage = deps.buildSourceExtractionCoverageSnapshot({
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sourceMaturityGrid,
        lifecycle: sourceLifecycle,
      })
      const sourceCoverageCloseout = deps.buildSourceCoverageCloseoutSnapshot({
        sources: deps.getSourceContracts(),
        sourceMaturityGrid,
        sourceExtractionCoverage,
      })
      const sourceConnectorMatrix = deps.buildSourceConnectorMatrixSnapshot({
        sources: deps.getSourceContracts(),
        connectors: deps.getSourceConnectors(),
        extractionControl: snapshot.extractionControl,
        sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
        intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
        sourceMaturityOperational: snapshot.sourceMaturityOperational,
      })
      const sourceHubRoutingMatrix = deps.buildSourceHubRoutingMatrixSnapshot({
        connectorMatrix: sourceConnectorMatrix,
      })
      sourceLifecycle.sourceCoverageCloseout = sourceCoverageCloseout
      sourceLifecycle.sourceExtractionCoverage = sourceExtractionCoverage
      sourceLifecycle.sourceConnectorMatrix = sourceConnectorMatrix
      sourceLifecycle.sourceHubRoutingMatrix = sourceHubRoutingMatrix
      const {
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        diagnostics: foundationHubFullDiagnostics,
      } = await deps.buildFoundationHubAgentFeedbackDiagnostics({
        repoRoot: deps.repoRoot,
        foundationJobs: snapshot.foundationJobs,
      })
      const sourceOutageBoundary = deps.buildFoundationHubSourceOutageBoundary({
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      })
      const [
        latestMeetingVaultAutoEnforcementRun,
        meetingVaultLegacyExceptions,
      ] = await Promise.all([
        deps.getLatestMeetingVaultAutoEnforcementRun().catch(() => null),
        deps.getMeetingVaultLegacyExceptions({ limit: 50, status: 'open' }).catch(() => []),
      ])
      const meetingVaultAutoEnforcement = {
        status: latestMeetingVaultAutoEnforcementRun?.status || 'missing',
        latestRun: latestMeetingVaultAutoEnforcementRun,
        legacyExceptions: meetingVaultLegacyExceptions,
        summary: latestMeetingVaultAutoEnforcementRun?.summary?.summary || latestMeetingVaultAutoEnforcementRun?.summary || {},
        plainEnglish: latestMeetingVaultAutoEnforcementRun?.canCloseMeetingVaultAcl
          ? 'Automatic Meeting Vault forward-flow proof is green; historical messy files are bounded in the legacy exception queue.'
          : 'Automatic Meeting Vault forward-flow proof is missing or blocked; keep MEETING-VAULT-ACL-001 blocking.',
      }
      const runtimeProcessControl = await deps.buildRuntimeProcessControlApiSnapshot(snapshot)
      const activeFoundationSprint = await deps.getActiveFoundationCurrentSprint()
      const currentSprint = deps.buildFoundationCurrentSprintStatus({
        sprint: activeFoundationSprint.sprint,
        items: activeFoundationSprint.items,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        planCriticRuns: activeFoundationSprint.planCriticRuns || [],
      })
      const marketingAvatarRegistry = deps.buildMarketingAvatarImportSnapshot({
        referenceBriefText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_REFERENCE_BRIEF_PATH)) || '',
        retainProfilesText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_RETAIN_SOURCE_PATH)) || '',
        attractProfilesText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_ATTRACT_SOURCE_PATH)) || '',
        oldReadmeText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_OLD_README_PATH)) || '',
      })
      const marketingSourceMap = deps.buildMarketingSourceMapSnapshot({
        sourceContracts: deps.getSourceContracts(),
        avatarRegistry: marketingAvatarRegistry,
        sourceNoteText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_SOURCE_MAP_NOTE_PATH)) || '',
      })
      const brandStack = deps.buildBrandStackSnapshot({ marketingSourceMap })
      const tierBehavioralCompletion = deps.buildTierBehavioralCompletionSnapshot()
      const verificationRuns = deps.buildVerificationRunsSnapshot({
        backlogItems: snapshot.backlogItems || [],
        researchCuration,
        intelligenceSynthesis: snapshot.intelligenceSynthesis || {},
        intelligenceActionRouter: snapshot.intelligenceActionRouter || {},
        backlogHygiene,
      })
      const perUserChangelog = deps.buildPerUserChangelogSnapshot({
        users: snapshot.users || [],
        changeEvents: await deps.getRecentChangeEvents(100),
        limit: 100,
      })
      const restrictedDecisionQueue = deps.buildDecisionRestrictedQueueSnapshot({
        decisions: snapshot.decisions || [],
      })
      const buildIntelWatchlist = deps.buildCreatorWatchlistSnapshot()
      const multimodalExtractorContract = deps.buildMultimodalExtractorContractSnapshot()
      const researchInboxContract = deps.buildResearchInboxContractSnapshot()
      const [foundationFeedbackItems, foundationAckStates] = await Promise.all([
        deps.listFoundationFeedbackItems({ limit: 50 }).catch(() => []),
        deps.listFoundationAcknowledgedStates({ limit: 50 }).catch(() => []),
      ])
      const foundationControlCompression = deps.buildFoundationControlCompressionSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        currentSprint: activeFoundationSprint,
        feedbackItems: foundationFeedbackItems,
        ackStates: foundationAckStates,
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        intelligenceAtomSpine: snapshot.intelligenceAtomSpine,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
      })
      const implementationIntelligence = deps.buildImplementationIntelligenceSnapshot({
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      })
      const buildIntelExtractionContexts = await deps.searchSharedCommunicationArtifactsForContext({
        query: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
        sourceIds: ['SRC-YOUTUBE-INTEL-001'],
        artifactTypes: ['video_transcript'],
        limit: 10,
        excerptChars: 1800,
      })
      const buildIntelExtraction = deps.buildBuildIntelExtractionImplementationSnapshot({
        transcriptContexts: buildIntelExtractionContexts,
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      })
      const gstackBuildIntel = await deps.buildGStackBuildIntelSnapshot({ allowMissingRepo: true })
      const endpointBudgets = deps.loadLatestFoundationEndpointBudgetSnapshot
        ? await deps.loadLatestFoundationEndpointBudgetSnapshot({ repoRoot: deps.repoRoot })
        : null
      const docArtifactBloat = deps.buildDocArtifactBloatSnapshot
        ? await deps.buildDocArtifactBloatSnapshot({ repoRoot: deps.repoRoot })
        : null
      const foundationOperatingReliability = deps.buildFoundationOperatingReliabilitySnapshot({
        sourceContracts: deps.getSourceContracts(),
        sourceConnectors: deps.getSourceConnectors(),
        foundationJobs: snapshot.foundationJobs,
        endpointBudgets,
        currentSprintStatus: currentSprint,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        docArtifactBloat,
      })
      const foundationSystemHealth = buildFoundationSystemHealthSnapshot({
        foundationJobs: snapshot.foundationJobs,
        foundationOperatingReliability,
        endpointBudgets,
        currentSprintStatus: currentSprint,
        sourceContracts: deps.getSourceContracts(),
        docArtifactBloat,
      })
      const currentStateSummary = deps.buildFoundationCurrentStateSummaryPayload({
        sourceContracts: deps.getSourceContracts(),
        backlogItems: snapshot.backlogItems || [],
        kpiHealth,
        currentSprint,
      })
      const compactCurrentSprint = compactFoundationCurrentSprintForHub(currentSprint)
      sourceLifecycle.marketingSourceMap = marketingSourceMap
      sourceLifecycle.brandStack = brandStack
      sourceLifecycle.tierBehavioralCompletion = tierBehavioralCompletion
      sourceLifecycle.verificationRuns = verificationRuns
      sourceLifecycle.perUserChangelog = perUserChangelog
      sourceLifecycle.restrictedDecisionQueue = restrictedDecisionQueue
      const foundationUiComplete = deps.buildFoundationUiCompleteSnapshot({
        sourceLifecycle,
        currentSprint: compactCurrentSprint,
      })
      sourceLifecycle.foundationUiComplete = foundationUiComplete
      sourceLifecycle.currentSprint = currentSprint
      const fullBacklogContract = deps.buildFoundationHubBacklogContract({
        backlogItems: snapshot.backlogItems || [],
      })
      const fullPayload = {
        ...snapshot,
        backlogItems: compactFullDiagnosticsBacklogItems({
          compactRows: fullBacklogContract.backlogItems,
          fullRows: snapshot.backlogItems || [],
        }),
        backlogContract: {
          ...fullBacklogContract.backlogContract,
          fullDiagnosticsCompacted: true,
          fullDiagnosticsBacklogRowTrimmedFields: ['createdAt', 'source/owner text', 'long whyItMatters text'],
          detailPath: '/api/foundation/backlog/:cardId',
          archivePath: '/api/foundation/backlog/done-archive',
        },
        recentChanges: compactFoundationRecentChanges(snapshot.recentChanges),
        foundationJobs: deps.compactFoundationJobRunSnapshot(snapshot.foundationJobs),
        sharedCommunicationSynthesis: compactSharedCommunicationSynthesis(snapshot.sharedCommunicationSynthesis),
        extractionControl: compactFoundationExtractionControlForHub(snapshot.extractionControl),
        kpiHealth,
        backlogHygiene,
        foundation1100Review,
        docArchiveCleanup,
        researchCuration,
        exceptionCuration,
        hitListReconcile,
        archiveRetire,
        postShipFanout,
        gateReliability,
        personalWorkspaceBoundary,
        ceoDashboardPattern,
        doctrinePropagation,
        decisionAutoEmit,
        sheetsApiTrust,
        intelligenceActionRouter: compactFoundationActionRouterForHub(snapshot.intelligenceActionRouter),
        sourceLifecycle: compactFoundationSourceLifecycle(sourceLifecycle),
        sourceMaturityGrid,
        sourceExtractionCoverage,
        sourceCoverageCloseout,
        sourceConnectorMatrix,
        sourceHubRoutingMatrix,
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        sourceOutageBoundary,
        meetingVaultAutoEnforcement,
        runtimeProcessControl,
        currentSprint: compactCurrentSprint,
        marketingAvatarRegistry,
        marketingSourceMap,
        brandStack,
        tierBehavioralCompletion,
        verificationRuns,
        perUserChangelog: compactFoundationPerUserChangelog(perUserChangelog),
        restrictedDecisionQueue,
        buildIntelWatchlist,
        multimodalExtractorContract,
        researchInboxContract,
        foundationControlCompression,
        implementationIntelligence,
        buildIntelExtraction,
        gstackBuildIntel,
        foundationOperatingReliability,
        foundationSystemHealth,
        currentStateSummary,
        foundationHubFullDiagnostics,
        foundationUiComplete,
        runtimeSupervisor: {
          servedCode: deps.getDashboardRuntimeMetadata(),
          workerCode: workerCode || deps.getMissingWorkerRuntimeMetadata(),
        },
      }
      fullPayload.foundationHubView = {
        mode: 'full',
        purpose: 'Full diagnostic payload for Runtime Health and deep debugging.',
        summaryPath: '/api/foundation-hub',
      }
      sendFoundationHubPayload(res, fullPayload, { mode: 'full', startedAtMs, deps })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load foundation hub data.'
      )
    }
  })

  app.get('/api/foundation/current-sprint', deps.requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await deps.getFoundationSnapshot()
      const activeFoundationSprint = await deps.getActiveFoundationCurrentSprint()
      const currentSprint = deps.buildFoundationCurrentSprintStatus({
        sprint: activeFoundationSprint.sprint,
        items: activeFoundationSprint.items,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        planCriticRuns: activeFoundationSprint.planCriticRuns || [],
      })
      res.json({
        generatedAt: new Date().toISOString(),
        sprint: currentSprint.sprintId
          ? {
              sprintId: currentSprint.sprintId,
              status: currentSprint.sprintStatus,
              goal: currentSprint.goal,
              activeBlocker: currentSprint.activeBlocker,
            }
          : null,
        items: currentSprint.items || [],
        stages: currentSprint.stages || [],
        cadence: currentSprint.cadence || null,
        currentSprint,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_current_sprint_load_failed',
        error instanceof Error ? error.message : 'Failed to load Current Sprint.'
      )
    }
  })

  app.get('/api/ops-hub', deps.requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await deps.getFoundationSnapshot()
      const foundationJobs = snapshot.foundationJobs || {}
      const {
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      } = await deps.buildFoundationHubAgentFeedbackDiagnostics({
        repoRoot: deps.repoRoot,
        foundationJobs,
      })
      const sourceOutageBoundary = deps.buildFoundationHubSourceOutageBoundary({
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      })
      sourceOutageBoundary.summary = {
        ...(sourceOutageBoundary.summary || {}),
        opsApiFailSoft: true,
      }
      const jobs = Array.isArray(foundationJobs.jobs)
        ? foundationJobs.jobs.filter(job => Array.isArray(job.servesHubs) && job.servesHubs.includes('ops'))
        : []
      const jobKeys = new Set(jobs.map(job => job.key))
      const latestRuns = Array.isArray(foundationJobs.latestRuns)
        ? foundationJobs.latestRuns.filter(run => jobKeys.has(run.jobKey))
        : []

      res.json({
        foundationJobs: {
          generatedAt: foundationJobs.generatedAt || snapshot.meta?.generatedAt || new Date().toISOString(),
          totalJobs: jobs.length,
          enabledJobs: jobs.filter(job => job.enabled !== false).length,
          scheduledJobs: jobs.filter(job => job.runtimeMode === 'scheduled').length,
          dueJobs: jobs.filter(job => job.isDue).length,
          manualJobs: jobs.filter(job => job.runtimeMode === 'manual').length,
          jobs,
          latestRuns,
        },
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        sourceOutageBoundary,
        meta: {
          generatedAt: snapshot.meta?.generatedAt || new Date().toISOString(),
          surface: 'ops',
        },
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'ops_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load Ops hub data.'
      )
    }
  })

  app.get('/api/sales-hub', deps.requireAdminToken, async (req, res) => {
    try {
      const payload = await deps.getSalesHubPayload({ forceRefresh: req.query?.refresh === '1' || req.query?.refresh === 'true' })
      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load Sales hub data.'
      )
    }
  })
}
