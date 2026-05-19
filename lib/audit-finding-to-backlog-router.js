export const AUDIT_FINDING_TO_BACKLOG_ROUTER_CARD_ID = 'AUDIT-FINDING-TO-BACKLOG-ROUTER-001'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_CLOSEOUT_KEY = 'audit-finding-to-backlog-router-v1'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_PLAN_PATH = 'docs/process/audit-finding-to-backlog-router-001-plan.md'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH = 'docs/process/approvals/AUDIT-FINDING-TO-BACKLOG-ROUTER-001.json'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_SCRIPT_PATH = 'scripts/process-audit-finding-to-backlog-router-check.mjs'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-audit-finding-to-backlog-router-closeout.md'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
export const AUDIT_FINDING_TO_BACKLOG_ROUTER_NEXT_CARD_ID = 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001'

export const AUDIT_FINDING_TO_BACKLOG_ROUTER_CHANGED_FILES = [
  'lib/audit-finding-to-backlog-router.js',
  AUDIT_FINDING_TO_BACKLOG_ROUTER_SCRIPT_PATH,
  'lib/foundation-verifier-health-live-summary.js',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  AUDIT_FINDING_TO_BACKLOG_ROUTER_PLAN_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_CLOSEOUT_PATH,
]

export const AUDIT_FINDING_TO_BACKLOG_ROUTER_PROOF_COMMANDS = [
  'node --check lib/audit-finding-to-backlog-router.js scripts/process-audit-finding-to-backlog-router-check.mjs lib/foundation-verifier-health-live-summary.js',
  'npm run process:audit-finding-to-backlog-router-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=AUDIT-FINDING-TO-BACKLOG-ROUTER-001 --planApprovalRef=docs/process/approvals/AUDIT-FINDING-TO-BACKLOG-ROUTER-001.json --closeoutKey=audit-finding-to-backlog-router-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AUDIT-FINDING-TO-BACKLOG-ROUTER-001 --closeoutKey=audit-finding-to-backlog-router-v1',
  'npm run process:post-ship-fanout -- --card=AUDIT-FINDING-TO-BACKLOG-ROUTER-001 --closeoutKey=audit-finding-to-backlog-router-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=AUDIT-FINDING-TO-BACKLOG-ROUTER-001 --planApprovalRef=docs/process/approvals/AUDIT-FINDING-TO-BACKLOG-ROUTER-001.json --closeoutKey=audit-finding-to-backlog-router-v1 --commitRef=HEAD',
]

export const AUDIT_FINDING_TO_BACKLOG_ROUTER_NOT_NEXT = [
  'Do not turn scheduled audits into automatic backlog writers.',
  'Do not implement audit findings inside the router card.',
  'Do not leave a card-shaped red/yellow audit recommendation only in markdown or JSON.',
  'Do not reopen done cards just because an old audit artifact still mentions the historical risk.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this card.',
  'Do not run live extraction, auth-required jobs, provider probes, model-spend, external writes, Google Drive permissions mutation, or Agent Feedback sends.',
  'Do not launch parallel builders from this card.',
]

const CARD_ID_PATTERN = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+-\d{3}\b/g
const ACTIONABLE_SEVERITIES = new Set(['P0', 'P1', 'P2'])
const ACTIONABLE_STATUSES = new Set(['risk', 'watch', 'review', 'warning', 'yellow', 'red', 'blocked'])
const ROUTE_TYPES = new Set([
  'existing_live_card',
  'new_scoped_card',
  'stale_with_proof',
  'approval_required',
  'watch_only_threshold',
])

export const AUDIT_ROUTER_REAL_MISSING_CARD_DEFINITIONS = {
  'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001': {
    title: 'Source-contract admin deal policy dates',
    priority: 'P2',
    owner: 'Ops Source Truth',
    summary: 'Move duplicated admin deal-review policy dates into a source-owned contract so audits and UI paths do not drift.',
    whyItMatters: 'Policy cutoff dates appear in multiple runner/UI surfaces. A source contract gives the operator one owner and one as-of rule.',
    nextAction: 'Define the admin deal policy date source contract and update the audit/UI references to read from it.',
  },
  'APPROVAL-THRESHOLD-REGISTRY-001': {
    title: 'Registry-own Plan Critic approval thresholds',
    priority: 'P2',
    owner: 'Plan Critic',
    summary: 'Move raw 9.8 approval threshold literals behind a shared registry constant and proof path.',
    whyItMatters: 'Hardcoded approval thresholds make Plan Critic policy drift possible when one checker changes and another stays stale.',
    nextAction: 'Replace raw threshold literals in process/verifier checks with the registry constant and prove dogfood still fails below threshold.',
  },
  'BUILD-INTEL-CONTEXT-SEARCH-INDEX-001': {
    title: 'Budget Build Intel context search',
    priority: 'P2',
    owner: 'Build Intel',
    summary: 'Add an index or budgeted query path for Build Intel context search before artifact text grows into a slow scan.',
    whyItMatters: 'ILIKE and JS excerpt scoring over large artifact text can turn Build Intel into a request-time table scan.',
    nextAction: 'Measure current query shape, add the smallest indexed/budgeted path, and prove payload/latency stay under operator budget.',
  },
  'BUILD-INTEL-SNAPSHOT-BASELINE-001': {
    title: 'Classify Build Intel snapshot baselines',
    priority: 'P2',
    owner: 'Build Intel',
    summary: 'Label fixed Build Intel inspected commits as snapshot evidence rather than latest monitoring truth.',
    whyItMatters: 'Pinned commit proof is useful as evidence, but it can become false-green latest-source monitoring if not classified.',
    nextAction: 'Add as-of/source posture metadata for fixed Build Intel baselines and ensure latest monitoring uses the proper source lane.',
  },
  'BUILD-LOG-API-CACHE-AND-SLIM-001': {
    title: 'Cache and slim Build Log API payload',
    priority: 'P2',
    owner: 'Foundation Runtime',
    summary: 'Reduce request-time git/history work and duplicated build-log payload returned by Recent Work.',
    whyItMatters: 'Recent Work should stay fast as closeout history grows instead of shelling out and serializing duplicate payload groups.',
    nextAction: 'Add a bounded cache/slim response path for the Build Log API and prove latency/payload budget.',
  },
  'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001': {
    title: 'Extract Foundation client Current State renderer',
    priority: 'P1',
    owner: 'Foundation Frontend',
    summary: 'Continue extracting the large client Current State renderer into smaller source-backed renderer modules.',
    whyItMatters: 'Large mixed renderer surfaces slow review and make route-cache behavior harder to prove without regressions.',
    nextAction: 'Split the next Current State renderer responsibility without changing route behavior, then prove frontend smoke and full verifier.',
  },
}

function text(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return Array.from(new Set(values.map(text).filter(Boolean)))
}

function severityRank(value) {
  const normalized = text(value).toUpperCase()
  return normalized === 'P0' ? 0 : normalized === 'P1' ? 1 : normalized === 'P2' ? 2 : normalized === 'P3' ? 3 : 9
}

function highestPriorityFromFindings(findings = [], fallback = 'P2') {
  const best = findings
    .map(finding => text(finding.severity).toUpperCase())
    .filter(Boolean)
    .sort((left, right) => severityRank(left) - severityRank(right))[0]
  return best || fallback
}

export function extractAuditCardIds(value = '') {
  return unique(String(value || '').match(CARD_ID_PATTERN) || [])
}

export function extractAuditFindingCardIds(finding = {}) {
  const fields = [
    finding.cardId,
    finding.proposedCard,
    finding.recommendedCardId,
    finding.repairCardId,
    finding.id,
    finding.title,
    finding.whyItMatters,
    finding.detector,
    finding.nextAction,
    finding.detail,
  ]
  return unique(fields.flatMap(extractAuditCardIds))
}

export function isActionableAuditFinding(finding = {}) {
  const severity = text(finding.severity).toUpperCase()
  const status = text(finding.status || finding.rollupLevel).toLowerCase()
  return ACTIONABLE_SEVERITIES.has(severity) || ACTIONABLE_STATUSES.has(status)
}

function findingRouteId(finding = {}) {
  return text(finding.proposedCard || finding.recommendedCardId || finding.repairCardId || finding.cardId)
}

function fallbackCardDefinition(cardId, findings = []) {
  const first = findings[0] || {}
  return {
    title: first.title || `Route audit finding ${cardId}`,
    priority: highestPriorityFromFindings(findings),
    owner: first.proposedOwner || first.owner || 'Foundation Process',
    summary: `Scoped from audit finding ${first.id || cardId}.`,
    whyItMatters: first.whyItMatters || 'Audit findings need governed backlog ownership instead of living only in reports.',
    nextAction: `Review the audit evidence for ${cardId}, confirm scope, and add focused proof before implementation.`,
  }
}

export function buildScopedAuditBacklogCard(cardId, findings = []) {
  const definition = AUDIT_ROUTER_REAL_MISSING_CARD_DEFINITIONS[cardId] || fallbackCardDefinition(cardId, findings)
  return {
    id: cardId,
    title: definition.title,
    team: 'foundation',
    lane: 'scoped',
    priority: definition.priority || highestPriorityFromFindings(findings),
    rank: 80,
    source: `AUDIT-FINDING-TO-BACKLOG-ROUTER-001 routed ${findings.length || 1} audit finding(s).`,
    summary: definition.summary,
    whyItMatters: definition.whyItMatters,
    nextAction: definition.nextAction,
    statusNote: 'Scoped by audit-finding-to-backlog router; not implemented by the router card.',
    owner: definition.owner || 'Foundation Process',
  }
}

function classifyRoute({ finding, routeId, liveBacklogIds, newlyScopedIds, staleProofIds, approvalRequiredIds, watchOnlyThresholdIds } = {}) {
  if (!routeId) {
    return {
      type: 'unrouted',
      routeId: '',
      ok: false,
      detail: 'No proposedCard/recommendedCard/cardId route was present.',
    }
  }
  if (newlyScopedIds.has(routeId)) {
    return { type: 'new_scoped_card', routeId, ok: true, detail: 'Route ID is scoped into live backlog by the explicit router apply path.' }
  }
  if (staleProofIds.has(routeId) || staleProofIds.has(text(finding.id))) {
    return { type: 'stale_with_proof', routeId, ok: true, detail: 'Finding is classified stale/obsolete with proof.' }
  }
  if (approvalRequiredIds.has(routeId) || approvalRequiredIds.has(text(finding.id))) {
    return { type: 'approval_required', routeId, ok: true, detail: 'Finding is approval-bound before implementation.' }
  }
  if (watchOnlyThresholdIds.has(routeId) || watchOnlyThresholdIds.has(text(finding.id))) {
    return { type: 'watch_only_threshold', routeId, ok: true, detail: 'Finding is watch-only with threshold.' }
  }
  if (liveBacklogIds.has(routeId)) {
    return { type: 'existing_live_card', routeId, ok: true, detail: 'Route ID exists in live backlog.' }
  }
  return {
    type: 'unrouted',
    routeId,
    ok: false,
    detail: 'Route ID is not in live backlog and has no scoped/stale/approval/watch classification.',
  }
}

export function routeAuditFindingsToBacklogTruth({
  findings = [],
  backlogItems = [],
  newlyScopedCardIds = [],
  staleWithProofIds = [],
  approvalRequiredIds = [],
  watchOnlyThresholdIds = [],
} = {}) {
  const actionableFindings = findings.filter(isActionableAuditFinding)
  const liveBacklogIds = new Set(backlogItems.map(item => item.id).filter(Boolean))
  const newlyScopedIds = new Set(newlyScopedCardIds)
  const staleProofIds = new Set(staleWithProofIds)
  const approvalIds = new Set(approvalRequiredIds)
  const watchIds = new Set(watchOnlyThresholdIds)
  const groupedFindings = new Map()
  for (const finding of actionableFindings) {
    const routeId = findingRouteId(finding)
    if (!routeId) continue
    if (!groupedFindings.has(routeId)) groupedFindings.set(routeId, [])
    groupedFindings.get(routeId).push(finding)
  }
  const routeRows = actionableFindings.map(finding => {
    const routeId = findingRouteId(finding)
    const route = classifyRoute({
      finding,
      routeId,
      liveBacklogIds,
      newlyScopedIds,
      staleProofIds,
      approvalRequiredIds: approvalIds,
      watchOnlyThresholdIds: watchIds,
    })
    return {
      findingId: text(finding.id),
      title: text(finding.title),
      severity: text(finding.severity),
      status: text(finding.status),
      routeId,
      routeType: route.type,
      routeOk: route.ok,
      detail: route.detail,
      namedCardIds: extractAuditFindingCardIds(finding),
    }
  })
  const namedCardIds = unique(routeRows.flatMap(row => row.namedCardIds))
  const unresolvedNamedCardIds = namedCardIds.filter(cardId =>
    !liveBacklogIds.has(cardId) &&
    !newlyScopedIds.has(cardId) &&
    !staleProofIds.has(cardId) &&
    !approvalIds.has(cardId) &&
    !watchIds.has(cardId)
  )
  const missingRouteIds = unique(routeRows.filter(row => !row.routeOk).map(row => row.routeId || row.findingId))
  const missingScopedCards = unique(routeRows
    .filter(row => row.routeType === 'unrouted' && row.routeId && !liveBacklogIds.has(row.routeId))
    .map(row => row.routeId))
    .map(cardId => buildScopedAuditBacklogCard(cardId, groupedFindings.get(cardId) || []))
  const routeCounts = routeRows.reduce((acc, row) => {
    acc[row.routeType] = (acc[row.routeType] || 0) + 1
    return acc
  }, {})
  return {
    ok: missingRouteIds.length === 0 && unresolvedNamedCardIds.length === 0,
    actionableFindingCount: actionableFindings.length,
    totalFindingCount: findings.length,
    routeRows,
    routeCounts,
    namedCardIds,
    missingRouteIds,
    unresolvedNamedCardIds,
    missingScopedCards,
    routeTypeSet: Array.from(ROUTE_TYPES),
  }
}

export function summarizeAuditFindingBacklogRouter(result = {}) {
  return {
    ok: result.ok === true,
    actionableFindingCount: Number(result.actionableFindingCount || 0),
    totalFindingCount: Number(result.totalFindingCount || 0),
    routeCounts: result.routeCounts || {},
    missingRouteIds: result.missingRouteIds || [],
    unresolvedNamedCardIds: result.unresolvedNamedCardIds || [],
    missingScopedCardIds: (result.missingScopedCards || []).map(card => card.id),
  }
}

export function buildAuditFindingToBacklogRouterDogfoodProof() {
  const backlogItems = [
    { id: 'EXISTING-CARD-001', lane: 'scoped' },
    { id: 'APPROVAL-CARD-001', lane: 'blocked' },
    { id: 'WATCH-CARD-001', lane: 'scoped' },
  ]
  const unresolved = routeAuditFindingsToBacklogTruth({
    findings: [
      {
        id: 'synthetic-missing-card',
        severity: 'P0',
        title: 'Synthetic missing card finding',
        proposedCard: 'SYNTHETIC-AUDIT-REPAIR-001',
      },
    ],
    backlogItems,
  })
  const resolved = routeAuditFindingsToBacklogTruth({
    findings: [
      {
        id: 'synthetic-existing-card',
        severity: 'P0',
        title: 'Existing card finding',
        proposedCard: 'EXISTING-CARD-001',
      },
      {
        id: 'synthetic-new-card',
        severity: 'P1',
        title: 'New card finding',
        proposedCard: 'SYNTHETIC-AUDIT-REPAIR-001',
      },
      {
        id: 'synthetic-stale-card',
        severity: 'P1',
        title: 'Stale historical card finding',
        proposedCard: 'STALE-CARD-001',
      },
      {
        id: 'synthetic-approval-card',
        severity: 'P1',
        title: 'Approval-bound card finding',
        proposedCard: 'APPROVAL-CARD-001',
      },
      {
        id: 'synthetic-watch-card',
        severity: 'P2',
        title: 'Watch threshold card finding',
        proposedCard: 'WATCH-CARD-001',
      },
    ],
    backlogItems,
    newlyScopedCardIds: ['SYNTHETIC-AUDIT-REPAIR-001'],
    staleWithProofIds: ['STALE-CARD-001'],
    approvalRequiredIds: ['APPROVAL-CARD-001'],
    watchOnlyThresholdIds: ['WATCH-CARD-001'],
  })
  const checks = [
    {
      ok: unresolved.ok === false &&
        unresolved.missingRouteIds.includes('SYNTHETIC-AUDIT-REPAIR-001') &&
        unresolved.missingScopedCards.some(card => card.id === 'SYNTHETIC-AUDIT-REPAIR-001'),
      check: 'missing card-shaped red/yellow audit finding fails and produces a scoped-card candidate',
    },
    {
      ok: resolved.ok === true,
      check: 'resolved fixture routes all findings into allowed categories',
    },
    {
      ok: ['existing_live_card', 'new_scoped_card', 'stale_with_proof', 'approval_required', 'watch_only_threshold']
        .every(type => Number(resolved.routeCounts?.[type] || 0) >= 1),
      check: 'dogfood covers every allowed route category',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    mode: 'audit-finding-to-backlog-router-dogfood',
    checks,
    unresolvedSummary: summarizeAuditFindingBacklogRouter(unresolved),
    resolvedSummary: summarizeAuditFindingBacklogRouter(resolved),
  }
}
