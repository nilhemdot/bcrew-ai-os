import { createHash } from 'node:crypto'

export const ACTION_ROUTE_DEDUP_STALENESS_CARD_ID = 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001'
export const ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY = 'action-route-dedup-staleness-guard-v1'
export const ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH = 'docs/process/action-route-dedup-staleness-guard-001-plan.md'
export const ACTION_ROUTE_DEDUP_STALENESS_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json'
export const ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-action-route-dedup-staleness-guard-closeout.md'
export const ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH = 'scripts/process-action-route-dedup-staleness-guard-check.mjs'
export const ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID = 'action-route-dedup-staleness-guard-2026-05-18'
export const ACTION_ROUTE_STALE_WATCH_DAYS = 3
export const ACTION_ROUTE_STALE_RED_DAYS = 7

export const ACTION_ROUTE_DEDUP_STALENESS_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad visual UI redesign.',
]

export const ACTION_ROUTE_DEDUP_STALENESS_CHANGED_FILES = [
  'lib/action-route-dedup-staleness-guard.js',
  'lib/action-route-review-inbox.js',
  'lib/foundation-verifier-control-loop.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-action-route-records.js',
  'lib/foundation-build-closeout-records.js',
  'public/foundation-action-route-review-inbox-renderers.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-action-route-dedup-staleness-guard-check.mjs',
  'docs/process/action-route-dedup-staleness-guard-001-plan.md',
  'docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json',
  'docs/handoffs/2026-05-18-action-route-dedup-staleness-guard-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
]

export const ACTION_ROUTE_DEDUP_STALENESS_PROOF_COMMANDS = [
  'node --check lib/action-route-dedup-staleness-guard.js lib/action-route-review-inbox.js lib/foundation-verifier-control-loop.js scripts/process-action-route-dedup-staleness-guard-check.mjs scripts/foundation-verify.mjs',
  'npm run process:action-route-dedup-staleness-guard-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=ACTION-ROUTE-DEDUP-STALENESS-GUARD-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json --closeoutKey=action-route-dedup-staleness-guard-v1 --commitRef=HEAD',
]

const UNRESOLVED_STATES = new Set(['needs_review', 'backlog_candidate_review', 'ready_to_apply'])

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeKeyText(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)
}

function isUnresolvedReviewItem(item = {}) {
  return UNRESOLVED_STATES.has(normalizeText(item.reviewState))
}

function routeIdentityKey(item = {}) {
  return normalizeText(item.routeId)
}

function semanticDedupeSeed(item = {}) {
  const sourceRefs = normalizeArray(item.sourceRefs).sort().join('|')
  const title = normalizeKeyText(item.title)
  const summary = normalizeKeyText(item.summary).slice(0, 180)
  return [
    normalizeKeyText(item.destinationTable || item.destinationLabel),
    normalizeKeyText(item.type),
    normalizeKeyText(item.owner),
    title,
    summary,
    sourceRefs,
  ].join('::')
}

export function buildActionRouteReviewItemDedupeKey(item = {}) {
  const routeId = routeIdentityKey(item)
  if (routeId) return `route:${routeId}`
  return `semantic:${stableHash(semanticDedupeSeed(item))}`
}

function buildSemanticClusterKey(item = {}) {
  return `semantic:${stableHash(semanticDedupeSeed(item))}`
}

function staleNextAction(item = {}) {
  const state = normalizeText(item.reviewState)
  if (state === 'ready_to_apply') return 'Apply, link, reject, or snooze this approved route before it becomes stale work.'
  if (state === 'backlog_candidate_review') return 'Link this route-derived backlog row, mark duplicate, reject, or assign owner.'
  return 'Review, assign owner, promote/link, reject, duplicate, or snooze this route.'
}

export function classifyActionRouteStaleness(item = {}, {
  watchDays = ACTION_ROUTE_STALE_WATCH_DAYS,
  redDays = ACTION_ROUTE_STALE_RED_DAYS,
} = {}) {
  const ageDays = Number(item.ageDays)
  if (!Number.isFinite(ageDays) || !isUnresolvedReviewItem(item)) {
    return {
      status: 'current',
      severity: 'none',
      ageDays: Number.isFinite(ageDays) ? ageDays : null,
      nextAction: '',
    }
  }
  if (ageDays >= redDays) {
    return {
      status: 'stale_risk',
      severity: 'red',
      ageDays,
      thresholdDays: redDays,
      nextAction: staleNextAction(item),
    }
  }
  if (ageDays >= watchDays) {
    return {
      status: 'stale_watch',
      severity: 'yellow',
      ageDays,
      thresholdDays: watchDays,
      nextAction: staleNextAction(item),
    }
  }
  return {
    status: 'current',
    severity: 'none',
    ageDays,
    nextAction: '',
  }
}

function clusterFromEntries({ clusterId, keyType, entries = [], severity = 'yellow', reason = '' } = {}) {
  const routeIds = entries.map(item => normalizeText(item.routeId)).filter(Boolean)
  const reviewItemIds = entries.map(item => normalizeText(item.reviewItemId)).filter(Boolean)
  const sourceRefs = Array.from(new Set(entries.flatMap(item => normalizeArray(item.sourceRefs)))).sort()
  return {
    clusterId,
    keyType,
    severity,
    reason,
    count: entries.length,
    routeIds,
    reviewItemIds,
    sourceRefs,
    representativeTitle: normalizeText(entries[0]?.title),
    nextAction: severity === 'info'
      ? 'Keep linked to the existing route/backlog item so it does not appear as new work.'
      : 'Review once, then duplicate/link/reject/snooze the repeated findings so they stop piling up.',
  }
}

export function buildActionRouteDedupStalenessGuard(reviewItems = [], options = {}) {
  const items = Array.isArray(reviewItems) ? reviewItems : []
  const unresolvedItems = items.filter(isUnresolvedReviewItem)
  const routeGroups = new Map()
  const semanticGroups = new Map()

  for (const item of unresolvedItems) {
    const routeKey = routeIdentityKey(item)
    if (routeKey) {
      if (!routeGroups.has(routeKey)) routeGroups.set(routeKey, [])
      routeGroups.get(routeKey).push(item)
    }
    const semanticKey = buildSemanticClusterKey(item)
    if (!semanticGroups.has(semanticKey)) semanticGroups.set(semanticKey, [])
    semanticGroups.get(semanticKey).push(item)
  }

  const duplicateClusters = []
  for (const [routeId, entries] of routeGroups.entries()) {
    if (entries.length > 1) {
      const hasBacklogCandidate = entries.some(item => item.sourceKind === 'backlog_action_route_candidate')
      duplicateClusters.push(clusterFromEntries({
        clusterId: `route:${routeId}`,
        keyType: 'route_id',
        entries,
        severity: hasBacklogCandidate ? 'info' : 'yellow',
        reason: hasBacklogCandidate
          ? 'Route and route-derived backlog row are linked and should not be counted as separate new work.'
          : 'Multiple unresolved review items reference the same action route.',
      }))
    }
  }
  for (const [semanticKey, entries] of semanticGroups.entries()) {
    const uniqueRouteIds = new Set(entries.map(routeIdentityKey).filter(Boolean))
    if (entries.length > 1 && uniqueRouteIds.size > 1) {
      duplicateClusters.push(clusterFromEntries({
        clusterId: semanticKey,
        keyType: 'semantic',
        entries,
        severity: entries.length >= 3 ? 'red' : 'yellow',
        reason: 'Multiple unresolved action-route findings share destination, owner, title, summary, and source refs.',
      }))
    }
  }

  const staleItems = unresolvedItems
    .map(item => ({
      reviewItemId: normalizeText(item.reviewItemId),
      routeId: normalizeText(item.routeId),
      title: normalizeText(item.title),
      reviewState: normalizeText(item.reviewState),
      ...classifyActionRouteStaleness(item, options),
    }))
    .filter(item => item.status !== 'current')
  const staleRiskItems = staleItems.filter(item => item.severity === 'red')
  const staleWatchItems = staleItems.filter(item => item.severity === 'yellow')

  const duplicateItemIds = new Map()
  for (const cluster of duplicateClusters) {
    for (const id of cluster.reviewItemIds) {
      if (!duplicateItemIds.has(id)) duplicateItemIds.set(id, [])
      duplicateItemIds.get(id).push(cluster.clusterId)
    }
  }

  const enrichedItems = items.map(item => {
    const reviewItemId = normalizeText(item.reviewItemId)
    const staleness = classifyActionRouteStaleness(item, options)
    return {
      ...item,
      dedupeKey: buildActionRouteReviewItemDedupeKey(item),
      duplicateClusterIds: duplicateItemIds.get(reviewItemId) || [],
      staleness,
    }
  })

  const redDuplicateClusters = duplicateClusters.filter(cluster => cluster.severity === 'red')
  const yellowDuplicateClusters = duplicateClusters.filter(cluster => cluster.severity === 'yellow')
  const status = staleRiskItems.length || redDuplicateClusters.length
    ? 'red'
    : staleWatchItems.length || yellowDuplicateClusters.length
      ? 'yellow'
      : 'healthy'

  return {
    ok: true,
    contractVersion: 'action-route-dedup-staleness-guard.v1',
    thresholds: {
      staleWatchDays: options.watchDays || ACTION_ROUTE_STALE_WATCH_DAYS,
      staleRedDays: options.redDays || ACTION_ROUTE_STALE_RED_DAYS,
    },
    status,
    summary: {
      totalReviewItems: items.length,
      unresolvedItems: unresolvedItems.length,
      duplicateClusters: duplicateClusters.length,
      redDuplicateClusters: redDuplicateClusters.length,
      yellowDuplicateClusters: yellowDuplicateClusters.length,
      linkedRouteDuplicates: duplicateClusters.filter(cluster => cluster.severity === 'info').length,
      staleItems: staleItems.length,
      staleWatchItems: staleWatchItems.length,
      staleRiskItems: staleRiskItems.length,
    },
    duplicateClusters,
    staleItems,
    reviewItems: enrichedItems,
  }
}

export function attachActionRouteDedupStalenessGuard(snapshot = {}, options = {}) {
  const guard = buildActionRouteDedupStalenessGuard(snapshot.reviewItems || [], options)
  return {
    ...snapshot,
    summary: {
      ...(snapshot.summary || {}),
      duplicateClusters: guard.summary.duplicateClusters,
      redDuplicateClusters: guard.summary.redDuplicateClusters,
      staleWatchItems: guard.summary.staleWatchItems,
      staleRiskItems: guard.summary.staleRiskItems,
    },
    dedupStaleness: {
      ok: guard.ok,
      contractVersion: guard.contractVersion,
      thresholds: guard.thresholds,
      status: guard.status,
      summary: guard.summary,
      duplicateClusters: guard.duplicateClusters,
      staleItems: guard.staleItems,
    },
    reviewItems: guard.reviewItems,
  }
}

export function validateActionRouteDedupStalenessSnapshot(snapshot = {}) {
  const failures = []
  const guard = snapshot.dedupStaleness || {}
  const reviewItems = Array.isArray(snapshot.reviewItems) ? snapshot.reviewItems : []
  const staleItems = Array.isArray(guard.staleItems) ? guard.staleItems : []
  const duplicateClusters = Array.isArray(guard.duplicateClusters) ? guard.duplicateClusters : []
  if (guard.contractVersion !== 'action-route-dedup-staleness-guard.v1') failures.push('dedup_staleness_contract_missing')
  if (guard.thresholds?.staleWatchDays !== ACTION_ROUTE_STALE_WATCH_DAYS) failures.push('stale_watch_threshold_missing')
  if (guard.thresholds?.staleRedDays !== ACTION_ROUTE_STALE_RED_DAYS) failures.push('stale_red_threshold_missing')
  if (Number(guard.summary?.totalReviewItems) !== reviewItems.length) failures.push('dedup_review_count_mismatch')
  if (Number(snapshot.summary?.duplicateClusters || 0) !== Number(guard.summary?.duplicateClusters || 0)) failures.push('summary_duplicate_cluster_mismatch')
  if (Number(snapshot.summary?.staleRiskItems || 0) !== Number(guard.summary?.staleRiskItems || 0)) failures.push('summary_stale_risk_mismatch')
  for (const item of reviewItems) {
    if (!item.dedupeKey) failures.push(`item_missing_dedupe_key:${item.reviewItemId || 'unknown'}`)
    if (!item.staleness?.status) failures.push(`item_missing_staleness:${item.reviewItemId || 'unknown'}`)
  }
  for (const cluster of duplicateClusters) {
    if (!cluster.clusterId || !cluster.keyType) failures.push('duplicate_cluster_missing_identity')
    if (!cluster.nextAction) failures.push(`duplicate_cluster_missing_next_action:${cluster.clusterId || 'unknown'}`)
    if (!Array.isArray(cluster.reviewItemIds) || cluster.reviewItemIds.length < 2) failures.push(`duplicate_cluster_too_small:${cluster.clusterId || 'unknown'}`)
  }
  for (const item of staleItems) {
    if (!item.nextAction) failures.push(`stale_item_missing_next_action:${item.reviewItemId || item.routeId || 'unknown'}`)
    if (!['yellow', 'red'].includes(item.severity)) failures.push(`stale_item_bad_severity:${item.reviewItemId || item.routeId || 'unknown'}`)
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    duplicateClusterCount: duplicateClusters.length,
    staleItemCount: staleItems.length,
  }
}

export function buildActionRouteDedupStalenessDogfoodProof() {
  const baseItem = {
    sourceKind: 'intelligence_action_route',
    destinationTable: 'backlog_items',
    destinationLabel: 'Backlog candidate',
    type: 'owner_action',
    owner: 'Foundation Process',
    reviewState: 'needs_review',
    sourceRefs: ['SRC-MEETINGS-001', 'fact:one', 'atom:one'],
    summary: 'Follow up on repeated owner-bound action.',
  }
  const snapshot = attachActionRouteDedupStalenessGuard({
    ok: true,
    status: 'healthy',
    summary: { totalReviewItems: 5 },
    reviewItems: [
      {
        ...baseItem,
        reviewItemId: 'route:action-route:dedup1',
        routeId: 'action-route:dedup1',
        title: 'Repeated route',
        ageDays: 8,
      },
      {
        ...baseItem,
        reviewItemId: 'route:action-route:dedup2',
        routeId: 'action-route:dedup2',
        title: 'Repeated route',
        ageDays: 4,
      },
      {
        ...baseItem,
        reviewItemId: 'route:action-route:single',
        routeId: 'action-route:single',
        title: 'Fresh single route',
        summary: 'One-off finding.',
        sourceRefs: ['SRC-MEETINGS-001', 'fact:single', 'atom:single'],
        ageDays: 1,
      },
      {
        ...baseItem,
        reviewItemId: 'route:action-route:linked',
        routeId: 'action-route:linked',
        title: 'Linked route row',
        sourceRefs: ['SRC-MEETINGS-001', 'fact:linked', 'atom:linked'],
        ageDays: 2,
      },
      {
        ...baseItem,
        sourceKind: 'backlog_action_route_candidate',
        reviewItemId: 'backlog:ACTION-123',
        routeId: 'action-route:linked',
        backlogCardId: 'ACTION-123',
        title: 'Linked route row',
        sourceRefs: ['ACTION-ROUTER-001', 'action-route:linked'],
        ageDays: 2,
      },
    ],
  })
  const validation = validateActionRouteDedupStalenessSnapshot(snapshot)
  const broken = {
    ...snapshot,
    dedupStaleness: {
      ...snapshot.dedupStaleness,
      staleItems: snapshot.dedupStaleness.staleItems.map((item, index) => index === 0 ? { ...item, nextAction: '' } : item),
    },
  }
  const brokenValidation = validateActionRouteDedupStalenessSnapshot(broken)
  return {
    ok: validation.ok &&
      brokenValidation.ok === false &&
      snapshot.dedupStaleness.summary.duplicateClusters >= 2 &&
      snapshot.dedupStaleness.summary.staleRiskItems === 1 &&
      snapshot.dedupStaleness.summary.staleWatchItems === 1 &&
      snapshot.dedupStaleness.summary.linkedRouteDuplicates === 1 &&
      snapshot.dedupStaleness.status === 'red' &&
      snapshot.reviewItems.every(item => item.dedupeKey && item.staleness?.status),
    validation,
    brokenValidation,
    summary: snapshot.dedupStaleness.summary,
    invariant: 'Duplicate action-route findings are grouped without data loss, linked route/backlog rows stay informational, stale findings get yellow/red next actions, and malformed stale output fails closed.',
  }
}
