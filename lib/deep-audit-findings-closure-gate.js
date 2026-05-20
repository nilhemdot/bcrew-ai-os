export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID = 'DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CLOSEOUT_KEY = 'deep-audit-findings-closure-gate-v1'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_PLAN_PATH = 'docs/process/deep-audit-findings-closure-gate-001-plan.md'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_APPROVAL_PATH = 'docs/process/approvals/DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001.json'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_SCRIPT_PATH = 'scripts/process-deep-audit-findings-closure-gate-check.mjs'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_AUDIT_JSON_PATH = 'docs/audits/2026-05-19-foundation-deep-merge-audit.json'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_AUDIT_MD_PATH = 'docs/audits/2026-05-19-foundation-deep-merge-audit.md'
export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_NEXT_CARD_ID = 'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001'

export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_PROOF_COMMANDS = [
  'node --check lib/deep-audit-findings-closure-gate.js scripts/process-deep-audit-findings-closure-gate-check.mjs',
  'npm run process:deep-audit-findings-closure-gate-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001 --planApprovalRef=docs/process/approvals/DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001.json --closeoutKey=deep-audit-findings-closure-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001 --closeoutKey=deep-audit-findings-closure-gate-v1',
  'npm run process:foundation-ship -- --card=DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001 --planApprovalRef=docs/process/approvals/DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001.json --closeoutKey=deep-audit-findings-closure-gate-v1 --commitRef=HEAD',
]

export const DEEP_AUDIT_FINDING_ROUTES = Object.freeze([
  {
    findingId: 'active-vs-historical-verifier-mixing',
    severity: 'P1',
    title: 'Verifier mixes active sprint assertions with historical closeout proof',
    routeStatus: 'done',
    targetCardId: 'ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001',
    targetCloseoutKey: 'active-vs-historical-verifier-split-v1',
    owner: 'Foundation Verifier',
    nextAction: 'Covered by shipped active/historical verifier split; reopen only if a fresh audit finds active sprint proof passing from historical closeout state.',
  },
  {
    findingId: 'foundation-client-current-state-monolith',
    severity: 'P1',
    title: 'Foundation client embeds a large current-state renderer',
    routeStatus: 'done',
    targetCardId: DEEP_AUDIT_FINDINGS_CLOSURE_GATE_NEXT_CARD_ID,
    targetCloseoutKey: 'foundation-client-current-state-extract-v1',
    owner: 'Foundation Frontend',
    nextAction: 'Covered by the Current State extract closeout; reopen only if public/foundation.js regains renderer ownership or the audit detector raises this card again.',
  },
  {
    findingId: 'foundation-hub-route-monolith',
    severity: 'P1',
    title: 'Foundation Hub route builds many domains in one handler',
    routeStatus: 'done',
    targetCardId: 'FOUNDATION-HUB-PAYLOAD-EXTRACT-001',
    targetCloseoutKey: 'foundation-route-budget-cleanup-v1',
    owner: 'Foundation Runtime',
    nextAction: 'Covered by shipped payload extraction and budget proof; route future payload growth to the API budget stack.',
  },
  {
    findingId: 'hardcoded-foundation-ui-current-summary',
    severity: 'P1',
    title: 'Foundation UI embeds current-state summary truth',
    routeStatus: 'done',
    targetCardId: 'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001',
    targetCloseoutKey: 'foundation-ui-live-summary-sources-v1',
    owner: 'Foundation UI',
    nextAction: 'Covered by source-backed current-state summary payloads.',
  },
  {
    findingId: 'hardcoded-source-count-baseline',
    occurrencePath: 'lib/foundation-current-sprint.js',
    severity: 'P1',
    title: 'Source contract count is encoded as an exact baseline',
    routeStatus: 'done',
    targetCardId: 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001',
    targetCloseoutKey: 'source-lifecycle-dynamic-counts-v1',
    owner: 'Source Lifecycle',
    nextAction: 'Covered by dynamic source lifecycle counts; keep exact source counts out of current live truth.',
  },
  {
    findingId: 'hardcoded-source-count-baseline',
    occurrencePath: 'scripts/process-source-lifecycle-dynamic-counts-check.mjs',
    severity: 'P1',
    title: 'Source contract count is encoded as an exact baseline',
    routeStatus: 'done',
    targetCardId: 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001',
    targetCloseoutKey: 'source-lifecycle-dynamic-counts-v1',
    owner: 'Source Lifecycle',
    nextAction: 'Covered by dynamic source lifecycle counts; keep focused proofs deriving expectations from source contracts.',
  },
  {
    findingId: 'admin-deal-policy-date-duplication',
    severity: 'P2',
    title: 'Admin deal-review policy dates are duplicated across runner, job config, and UI',
    routeStatus: 'done',
    targetCardId: 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
    targetCloseoutKey: 'admin-deal-policy-source-contract-v1',
    owner: 'Ops Source Truth',
    nextAction: 'Covered by the Admin Deal Policy source-contract closeout; reopen only if runner, job config, or Ops UI reintroduces local policy date literals.',
  },
  {
    findingId: 'approval-threshold-raw-literal',
    severity: 'P2',
    title: 'Plan Critic 9.8 threshold appears as raw literals',
    routeStatus: 'done',
    targetCardId: 'APPROVAL-THRESHOLD-REGISTRY-001',
    targetCloseoutKey: 'approval-threshold-registry-v1',
    owner: 'Plan Critic',
    nextAction: 'Covered by approval-threshold-registry-v1; reopen only if Plan Critic, approval integrity, Current Sprint, or code-quality audit reintroduces local threshold logic.',
  },
  {
    findingId: 'build-closeout-code-owned-data',
    severity: 'P2',
    title: 'Build closeout history is code-owned data',
    routeStatus: 'done',
    targetCardId: 'BUILD-CLOSEOUT-DATA-SOURCE-001',
    targetCloseoutKey: 'build-closeout-data-source-v1',
    coveredByCardId: 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001',
    coveredByCloseoutKey: 'build-closeout-registry-extract-v1',
    owner: 'Foundation Process',
    nextAction: 'Covered by build-closeout-data-source-v1; reopen only if Build Log directly imports closeout records or the source contract/registry mirror goes stale.',
  },
  {
    findingId: 'build-log-request-time-git-and-duplication',
    severity: 'P2',
    title: 'Build Log shells out to git and returns duplicate group/build payloads',
    routeStatus: 'done',
    targetCardId: 'BUILD-LOG-API-CACHE-AND-SLIM-001',
    targetCloseoutKey: 'build-log-api-cache-and-slim-v1',
    owner: 'Foundation Runtime',
    nextAction: 'Covered by the Build Log API cache/slim closeout; reopen only if the route stops using the bounded cache or returns duplicated group build payloads again.',
  },
  {
    findingId: 'fixed-build-intel-commit-baseline',
    severity: 'P2',
    title: 'Build Intel commit is pinned as expected truth',
    routeStatus: 'done',
    targetCardId: 'BUILD-INTEL-SNAPSHOT-BASELINE-001',
    targetCloseoutKey: 'build-intel-snapshot-baseline-v1',
    owner: 'Build Intel',
    nextAction: 'Covered by build-intel-snapshot-baseline-v1; reopen only if fixed Build Intel commits are again treated as latest monitoring truth instead of inspected snapshot evidence.',
  },
  {
    findingId: 'focused-check-active-sprint-id-assumption',
    severity: 'P2',
    title: 'Focused checks assert exact dated active sprint IDs',
    routeStatus: 'scoped',
    targetCardId: 'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001',
    coveredByCardId: 'SPRINT-CHECK-HISTORICAL-MODE-001',
    coveredByCloseoutKey: 'sprint-check-historical-mode-v1',
    owner: 'Foundation Process',
    nextAction: 'Audit remaining focused checks and move exact sprint IDs behind historical-aware metadata.',
  },
  {
    findingId: 'foundation-dom-rebuild-risk',
    severity: 'P2',
    title: 'Foundation frontend has heavy DOM rebuild signals',
    routeStatus: 'scoped',
    targetCardId: 'FOUNDATION-CSS-SURFACE-DECOUPLE-001',
    coveredByCardId: 'FOUNDATION-FRONTEND-DOM-BUDGET-001',
    coveredByCloseoutKey: 'foundation-frontend-dom-budget-v1',
    owner: 'Foundation Frontend',
    nextAction: 'Use the DOM budget proof as measurement and scope the next small frontend surface/CSS decoupling slice.',
  },
])

function normalizeText(value = '') {
  return String(value || '').trim()
}

function routeKeyForFinding(finding = {}) {
  const firstRefPath = normalizeText((finding.refs || [])[0]?.path)
  return `${normalizeText(finding.id)}::${firstRefPath}`
}

function routeKey(route = {}) {
  return `${normalizeText(route.findingId)}::${normalizeText(route.occurrencePath)}`
}

export function routeDeepAuditFinding(finding = {}, routes = DEEP_AUDIT_FINDING_ROUTES) {
  const exactKey = routeKeyForFinding(finding)
  const exact = routes.find(route => routeKey(route) === exactKey)
  if (exact) return exact
  const sameId = routes.filter(route => route.findingId === finding.id)
  return sameId.length === 1 ? sameId[0] : null
}

export function buildDeepAuditFindingsClosureSnapshot({
  audit = {},
  routeCards = [],
  closeouts = [],
  routesDefinition = DEEP_AUDIT_FINDING_ROUTES,
  expectedFindingCount = 13,
} = {}) {
  const findings = []
  const auditFindings = Array.isArray(audit.findings) ? audit.findings : []
  const cardMap = new Map((routeCards || []).map(card => [card.id, card]))
  const closeoutMap = new Map((closeouts || []).map(closeout => [closeout.key, closeout]))
  const routes = auditFindings.map(finding => ({
    finding,
    route: routeDeepAuditFinding(finding, routesDefinition),
  }))

  function require(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  require(audit.summary?.findingCount === expectedFindingCount, 'expected_may_19_audit_finding_count', String(audit.summary?.findingCount || auditFindings.length))
  require(audit.summary?.p0 === 0, 'deep_audit_has_no_p0_findings', String(audit.summary?.p0 ?? 'missing'))
  require(auditFindings.length === routesDefinition.length, 'every_audit_finding_has_route_slot', `${auditFindings.length}/${routesDefinition.length}`)

  for (const { finding, route } of routes) {
    const label = `${finding.id}:${(finding.refs || [])[0]?.path || 'no-ref'}`
    require(Boolean(route), 'finding_route_exists', label)
    if (!route) continue
    require(route.severity === finding.severity, 'finding_route_severity_matches', `${label} -> ${route.severity}/${finding.severity}`)
    require(Boolean(route.owner), 'finding_route_owner_required', label)
    require(Boolean(route.nextAction), 'finding_route_next_action_required', label)
    const target = cardMap.get(route.targetCardId)
    require(Boolean(target), 'finding_route_target_card_exists', `${label} -> ${route.targetCardId}`)
    if (target) {
      if (route.routeStatus === 'done') {
        require(target.lane === 'done', 'done_route_target_is_done', `${route.targetCardId}:${target.lane}`)
        require(
          !route.targetCloseoutKey || normalizeText(target.statusNote || target.status_note).includes(route.targetCloseoutKey),
          'done_route_status_note_names_closeout',
          `${route.targetCardId}:${route.targetCloseoutKey || 'none'}`,
        )
        require(
          !route.targetCloseoutKey || closeoutMap.has(route.targetCloseoutKey),
          'done_route_closeout_record_exists',
          `${route.targetCardId}:${route.targetCloseoutKey || 'none'}`,
        )
      } else {
        require(['scoped', 'executing', 'done'].includes(target.lane), 'scoped_route_target_is_live_work', `${route.targetCardId}:${target.lane}`)
        require(Boolean(target.owner), 'scoped_route_owner_required', `${route.targetCardId}:${target.owner || 'missing'}`)
        require(Boolean(target.nextAction || target.next_action), 'scoped_route_next_action_required', route.targetCardId)
      }
    }
    if (route.coveredByCardId) {
      const covered = cardMap.get(route.coveredByCardId)
      require(Boolean(covered), 'covered_by_card_exists', `${route.coveredByCardId}`)
      require(!covered || covered.lane === 'done', 'covered_by_card_is_done', `${route.coveredByCardId}:${covered?.lane || 'missing'}`)
      require(
        !route.coveredByCloseoutKey || closeoutMap.has(route.coveredByCloseoutKey),
        'covered_by_closeout_record_exists',
        `${route.coveredByCardId}:${route.coveredByCloseoutKey || 'none'}`,
      )
    }
  }

  const missingRoutes = routes.filter(item => !item.route)
  const routedP1 = routes.filter(item => item.finding.severity === 'P1' && item.route)
  const routedP2 = routes.filter(item => item.finding.severity === 'P2' && item.route)
  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    summary: {
      auditFindingCount: auditFindings.length,
      routeCount: routesDefinition.length,
      missingRouteCount: missingRoutes.length,
      p1RoutedCount: routedP1.length,
      p2RoutedCount: routedP2.length,
      doneRouteCount: routes.filter(item => item.route?.routeStatus === 'done').length,
      scopedRouteCount: routes.filter(item => item.route?.routeStatus === 'scoped').length,
    },
    routes: routes.map(({ finding, route }) => ({
      findingId: finding.id,
      occurrencePath: (finding.refs || [])[0]?.path || '',
      severity: finding.severity,
      title: finding.title,
      targetCardId: route?.targetCardId || null,
      routeStatus: route?.routeStatus || 'missing',
      owner: route?.owner || null,
      nextAction: route?.nextAction || null,
      coveredByCardId: route?.coveredByCardId || null,
    })),
    findings,
  }
}

export function buildDeepAuditFindingsClosureGateDogfoodProof() {
  const syntheticAudit = {
    summary: { findingCount: 2, p0: 0 },
    findings: [
      {
        id: 'synthetic-routed',
        severity: 'P1',
        title: 'Synthetic routed finding',
        refs: [{ path: 'lib/routed.js' }],
      },
      {
        id: 'synthetic-missing',
        severity: 'P2',
        title: 'Synthetic missing finding',
        refs: [{ path: 'lib/missing.js' }],
      },
    ],
  }
  const routes = [
    {
      findingId: 'synthetic-routed',
      occurrencePath: 'lib/routed.js',
      severity: 'P1',
      title: 'Synthetic routed finding',
      routeStatus: 'scoped',
      targetCardId: 'SYNTHETIC-ROUTE-001',
      owner: 'Foundation Audit',
      nextAction: 'Fix synthetic route.',
    },
  ]
  const missing = buildDeepAuditFindingsClosureSnapshot({
    audit: syntheticAudit,
    routeCards: [{ id: 'SYNTHETIC-ROUTE-001', lane: 'scoped', owner: 'Foundation Audit', nextAction: 'Fix synthetic route.' }],
    closeouts: [],
    routesDefinition: routes,
    expectedFindingCount: 2,
  })
  const completeRoutes = [
    ...routes,
    {
      findingId: 'synthetic-missing',
      occurrencePath: 'lib/missing.js',
      severity: 'P2',
      title: 'Synthetic missing finding',
      routeStatus: 'done',
      targetCardId: 'SYNTHETIC-DONE-001',
      targetCloseoutKey: 'synthetic-done-v1',
      owner: 'Foundation Audit',
      nextAction: 'Covered by synthetic closeout.',
    },
  ]
  const routeCards = [
    { id: 'SYNTHETIC-ROUTE-001', lane: 'scoped', owner: 'Foundation Audit', nextAction: 'Fix synthetic route.' },
    { id: 'SYNTHETIC-DONE-001', lane: 'done', owner: 'Foundation Audit', nextAction: 'Done.', statusNote: 'Closed under synthetic-done-v1.' },
  ]
  const routed = buildDeepAuditFindingsClosureSnapshot({
    audit: syntheticAudit,
    routeCards,
    closeouts: [{ key: 'synthetic-done-v1' }],
    routesDefinition: completeRoutes,
    expectedFindingCount: 2,
  })
  const customRouteLookup = routeDeepAuditFinding(syntheticAudit.findings[0], routes)
  return {
    ok: missing.ok === false &&
      missing.findings.some(finding => finding.check === 'every_audit_finding_has_route_slot') &&
      customRouteLookup?.targetCardId === 'SYNTHETIC-ROUTE-001' &&
      routed.ok === true,
    missing,
    routed,
    customRouteLookup,
    dogfoodInvariant: 'a missing audit route fails closed; route matching uses finding id plus occurrence path for duplicate finding ids',
  }
}
