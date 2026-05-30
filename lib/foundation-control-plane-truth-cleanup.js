import {
  DEEP_AUDIT_FINDING_ROUTES,
  routeDeepAuditFinding,
} from './deep-audit-findings-closure-gate.js'
import {
  validateCurrentSprintActiveCardGateSnapshot,
} from './current-sprint-active-card-gate.js'

export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID = 'FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY = 'foundation-control-plane-truth-cleanup-v1'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH = 'docs/process/foundation-control-plane-truth-cleanup-001-plan.md'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001.json'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH = 'scripts/process-foundation-control-plane-truth-cleanup-check.mjs'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID = 'BRAIN-FLEET-FOUNDATION-001'
export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_MAY20_AUDIT_PATH = 'docs/handoffs/nightly-deep-audit-2026-05-20.json'

export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER = [
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID,
  'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
  'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
  'GEMINI-VIDEO-BRAIN-ROUTE-001',
  'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
  'OPENCLAW-ADAPTER-BOUNDARY-001',
  'BRAIN-FLEET-QUOTA-LEDGER-001',
  'AGENT-BRAIN-FOUNDATION-SEPARATION-001',
  'EXTRACTOR-BRAIN-FLEET-PROOF-001',
  'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
  'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'EXTRACTOR-OVERNIGHT-RUN-GUARD-001',
  'STRATEGY-003',
]

export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PROOF_COMMANDS = [
  'node --check lib/foundation-control-plane-truth-cleanup.js scripts/process-foundation-control-plane-truth-cleanup-check.mjs scripts/process-current-sprint-active-card-gate-check.mjs scripts/process-foundation-plan-reconcile-check.mjs',
  'npm run process:foundation-control-plane-truth-cleanup-check -- --close-card --json',
  'npm run process:deep-audit-findings-closure-gate-check -- --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001.json --closeoutKey=foundation-control-plane-truth-cleanup-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001 --closeoutKey=foundation-control-plane-truth-cleanup-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001.json --closeoutKey=foundation-control-plane-truth-cleanup-v1 --commitRef=HEAD',
]

export const FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NOT_NEXT = [
  'Do not start STRATEGY-003 or Strategy Hub work from this card.',
  'Do not start Brain Fleet implementation before the control-plane gates are raw green.',
  'Do not start extractor proof or extraction scale from this card.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not send emails, messages, public posts, or external writes.',
  'Do not mutate credentials, provider config, source systems, Drive permissions, or public exposure settings.',
  'Do not classify broken workflow failures as green; repair raw System Health or repeated-failure risk before continuing.',
]

const STANDARD_PROOF_COMMANDS = [
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  const normalized = normalizeText(value)
  return normalized ? [normalized] : []
}

function lowerPlanPath(cardId) {
  return `docs/process/${String(cardId || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-plan.md`
}

function cardMap(backlogItems = []) {
  return new Map((Array.isArray(backlogItems) ? backlogItems : []).filter(item => item?.id).map(item => [item.id, item]))
}

export function buildFoundationControlPlaneTruthCleanupCardRow({ closeCard = false } = {}) {
  return {
    id: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
    title: 'Repair Current Sprint and plan truth gates before value work',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Steve direct May 20 control-plane cleanup order.',
    summary: 'Make Foundation control-plane truth raw green before Brain Fleet, extractor, Strategy, or People work continues.',
    whyItMatters: 'The system was otherwise green, but Current Sprint and plan reconcile truth still pointed at STRATEGY-003 and old control-plane assumptions. That is exactly the kind of split-brain Foundation is meant to prevent.',
    nextAction: closeCard
      ? 'Done under foundation-control-plane-truth-cleanup-v1. Pause for Steve before starting BRAIN-FLEET-FOUNDATION-001.'
      : 'Fix current-sprint active-card and foundation-plan reconcile gates, update live Current Sprint to this cleanup card, prove May 20 audit findings are routed, then ship raw green.',
    statusNote: closeCard
      ? 'Closed 2026-05-20 under foundation-control-plane-truth-cleanup-v1; active control-plane truth is green and the next active blocker is BRAIN-FLEET-FOUNDATION-001 in scoping, not STRATEGY-003.'
      : 'Active cleanup card from Steve order: Foundation/control-plane cleanup first, then Brain Fleet, extractor proof, extraction scale, Strategy Hub.',
    owner: 'Foundation Builder',
  }
}

export function buildFoundationControlPlaneTruthCleanupExistingWorkCheck() {
  return {
    existingCode: [
      'lib/current-sprint-active-card-gate.js',
      'scripts/process-current-sprint-active-card-gate-check.mjs',
      'scripts/process-foundation-plan-reconcile-check.mjs',
      'lib/foundation-current-sprint-store.js',
      'lib/deep-audit-findings-closure-gate.js',
      'lib/process-plan-critic.js',
      'lib/process-write-guard.js',
    ],
    existingDocs: [
      'docs/handoffs/nightly-deep-audit-2026-05-20.json',
      'docs/_archive/handoffs/2026-05-20-orchestrator-brain-fleet-extractor-checkpoint.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/process/current-sprint-active-card-gate-001-plan.md',
      'docs/process/foundation-plan-reconcile-001-plan.md',
    ],
    existingScripts: [
      'process:deep-audit-findings-closure-gate-check',
      'process:current-sprint-active-card-gate-check',
      'process:foundation-plan-reconcile-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Live Backlog is task truth.',
      'Current Sprint is an overlay on live backlog truth, not a second backlog.',
      'Green means raw green; classification is not repair.',
      'Blockers block unsafe actions, not the whole sprint.',
      'Foundation priority order is control-plane cleanup, Brain Fleet, extractor proof, extraction scale, then Strategy Hub.',
    ],
    reused: 'Reuses the existing Current Sprint overlay, active-card gate, Plan Critic, deep-audit closure gate, live backlog, process write guard, System Health, repeated-failure gate, backlog hygiene, verifier, and ship gate.',
    notRebuilt: 'No new sprint engine, no second backlog, no Strategy Hub work, no Brain Fleet implementation, no extractor runtime, no source/provider/external writes.',
    exactGap: 'Live Current Sprint pointed to STRATEGY-003 while Steve ordered Foundation/control-plane cleanup first, and two process gates still expected stale sprint/order assumptions.',
    overBroadRisk: 'This card can drift into Brain Fleet, extractor, Strategy, People, or broad docs cleanup. It is bounded to raw-green control-plane truth and proof.',
    readyBy: 'Steve direct card mission on 2026-05-20.',
    readyAt: '2026-05-20T10:30:00-04:00',
  }
}

export function buildFutureControlPlaneOrderExistingWorkCheck(cardId) {
  return {
    existingCode: [
      'live backlog item',
      'Current Sprint overlay',
      'Foundation ship gates',
      'LLM router/model routing foundation',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-20-orchestrator-brain-fleet-extractor-checkpoint.md',
      'docs/rebuild/current-runtime-map.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: STANDARD_PROOF_COMMANDS,
    existingPolicy: [
      'Do not mark this card sprint_ready/building_now until its own plan and Plan Critic pass exist.',
      'Park approval-bound private/provider/paid/browser/Drive-permission actions and continue safe work.',
      'Brain Fleet is not a hidden subscription/account rotation farm.',
    ],
    reused: `Reusable Foundation sprint gates and live backlog truth for ${cardId}.`,
    notRebuilt: `Not built by ${FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID}.`,
    exactGap: 'Queued for later scoped work; details must be filled by that card before it can move past scoping.',
    overBroadRisk: 'Keeping this card in scoping prevents false sprint-ready state and avoids starting lower-priority work.',
    readyBy: 'Not sprint-ready yet; queued by Steve order.',
    readyAt: 'pending-card-plan',
  }
}

export function buildFoundationControlPlaneTruthCleanupItem({
  cardId,
  order,
  card = {},
  stage = 'scoping',
  currentHead = '',
} = {}) {
  const isCleanup = cardId === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID
  return {
    cardId,
    order,
    stage,
    planRef: isCleanup ? FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH : lowerPlanPath(cardId),
    definitionOfDone: isCleanup
      ? 'May 20 audit findings are closed/routed/accepted; active-card gate, foundation-plan reconcile, System Health raw green, repeated-failure gate, backlog hygiene, foundation:verify, and process:foundation-ship are green; main is clean and pushed.'
      : `${cardId} remains scoped with owner, next action, proof boundary, and not-next guardrails until its own plan and proof are approved.`,
    proofCommands: isCleanup ? FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PROOF_COMMANDS : STANDARD_PROOF_COMMANDS,
    nextAction: isCleanup
      ? 'Close the control-plane truth cleanup, then pause before Brain Fleet.'
      : normalizeText(card.nextAction || card.next_action) || `Scope ${cardId} only after control-plane cleanup is green.`,
    readinessBlockerCleared: '',
    notNextBoundaries: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NOT_NEXT,
    existingWorkCheck: isCleanup
      ? buildFoundationControlPlaneTruthCleanupExistingWorkCheck()
      : buildFutureControlPlaneOrderExistingWorkCheck(cardId),
    returnedReason: '',
    metadata: {
      owner: normalizeText(card.owner) || (isCleanup ? 'Foundation Builder' : 'Foundation'),
      sourceLane: 'live-backlog',
      parkAndContinue: true,
      blockersBlockActionsNotSprint: true,
      closeoutKey: isCleanup ? FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY : null,
      repoPosture: {
        integrationBranch: 'main',
        expectedBaseCommit: currentHead,
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
    },
  }
}

export function buildFoundationControlPlaneTruthCleanupOverlay({
  closeCard = false,
  currentHead = '',
  backlogItems = [],
} = {}) {
  const cards = cardMap(backlogItems)
  const activeBlockerCardId = closeCard
    ? FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID
    : FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID
  const items = FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER.map((cardId, index) => {
    let stage = 'scoping'
    if (cardId === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID) stage = closeCard ? 'done_this_sprint' : 'building_now'
    return buildFoundationControlPlaneTruthCleanupItem({
      cardId,
      order: index + 1,
      card: cards.get(cardId) || {},
      stage,
      currentHead,
    })
  })

  return {
    sprint: {
      sprintId: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SPRINT_ID,
      status: 'active',
      goal: 'Make Foundation control-plane truth raw green before Brain Fleet, extractor proof, extraction scale, Strategy Hub, or People work continues.',
      activeBlockerCardId,
      metadata: {
        overlayOnly: true,
        noSecondBacklog: true,
        currentStatus: closeCard ? 'control_plane_truth_cleanup_green' : 'control_plane_truth_cleanup_in_progress',
        executiveSummary: closeCard
          ? 'Foundation control-plane cleanup is closed; Brain Fleet is the next scoped blocker, and work is paused for Steve before building.'
          : 'Foundation control-plane cleanup is the active blocker; STRATEGY-003 is parked until Brain Fleet and extractor proof are done.',
        nextAction: closeCard
          ? `Pause for Steve before starting ${FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID}.`
          : `Close ${FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID} with raw-green gates before Brain Fleet.`,
        priorityOrder: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER,
        approvalPolicy: 'Park blocked or approval-bound actions and continue only safe Foundation work.',
        exitCriteria: [
          'May 20 deep-audit findings are closed, routed, or explicitly accepted with proof.',
          'process:deep-audit-findings-closure-gate-check is healthy.',
          'process:current-sprint-active-card-gate-check is healthy.',
          'process:foundation-plan-reconcile-check is healthy.',
          'process:system-health-nightly-audit-check is healthy with raw 0 risk / 0 watch.',
          'process:build-lane-repeated-failure-action-gate-check is healthy.',
          'backlog:hygiene is healthy.',
          'foundation:verify is green.',
          'process:foundation-ship is green.',
          'main is clean and pushed.',
        ],
        notNext: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NOT_NEXT,
      },
    },
    items,
  }
}

export function buildMay20DeepAuditRoutingStatus({
  audit = {},
  routeCards = [],
  closeouts = [],
} = {}) {
  const findings = []
  const auditFindings = Array.isArray(audit.findings) ? audit.findings : []
  const cards = cardMap(routeCards)
  const closeoutMap = new Map((Array.isArray(closeouts) ? closeouts : []).map(closeout => [closeout.key, closeout]))
  const routes = auditFindings.map(finding => ({
    finding,
    route: routeDeepAuditFinding(finding, DEEP_AUDIT_FINDING_ROUTES),
  }))

  function require(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  require(audit.summary?.p0 === 0, 'may20_deep_audit_has_no_p0_findings', String(audit.summary?.p0 ?? 'missing'))
  require(auditFindings.length === audit.summary?.findingCount, 'may20_audit_count_matches_summary', `${auditFindings.length}/${audit.summary?.findingCount ?? 'missing'}`)
  require(audit.summary?.findingCount === 7, 'may20_deep_audit_expected_finding_count', String(audit.summary?.findingCount ?? 'missing'))

  for (const { finding, route } of routes) {
    const label = `${finding.id}:${(finding.refs || [])[0]?.path || 'no-ref'}`
    require(['P1', 'P2'].includes(finding.severity), 'may20_finding_is_p1_or_p2', `${label}:${finding.severity}`)
    require(Boolean(route), 'may20_finding_route_exists', label)
    if (!route) continue
    require(Boolean(route.owner), 'may20_finding_route_owner_required', label)
    require(Boolean(route.nextAction), 'may20_finding_route_next_action_required', label)
    require(['done', 'scoped', 'accepted'].includes(route.routeStatus), 'may20_finding_route_status_allowed', `${label}:${route.routeStatus}`)
    const target = cards.get(route.targetCardId)
    require(Boolean(target), 'may20_route_target_card_exists', `${label}:${route.targetCardId}`)
    if (target && route.routeStatus === 'done') {
      require(target.lane === 'done', 'may20_done_route_target_is_done', `${route.targetCardId}:${target.lane}`)
      require(
        !route.targetCloseoutKey || closeoutMap.has(route.targetCloseoutKey),
        'may20_done_route_closeout_exists',
        `${route.targetCardId}:${route.targetCloseoutKey || 'none'}`,
      )
    }
  }

  const missingRoutes = routes.filter(item => !item.route)
  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    summary: {
      findingCount: auditFindings.length,
      p0: audit.summary?.p0 ?? null,
      p1: auditFindings.filter(item => item.severity === 'P1').length,
      p2: auditFindings.filter(item => item.severity === 'P2').length,
      routeCount: routes.length - missingRoutes.length,
      missingRouteCount: missingRoutes.length,
      doneRouteCount: routes.filter(item => item.route?.routeStatus === 'done').length,
    },
    routes: routes.map(({ finding, route }) => ({
      findingId: finding.id,
      occurrencePath: (finding.refs || [])[0]?.path || '',
      severity: finding.severity,
      routeStatus: route?.routeStatus || 'missing',
      targetCardId: route?.targetCardId || null,
      owner: route?.owner || null,
    })),
    findings,
  }
}

export function buildControlPlaneTruthDocsStatus({
  currentPlan = '',
  currentState = '',
} = {}) {
  const findings = []
  const requiredOrderTerms = [
    'Foundation/control-plane cleanup',
    'Brain Fleet',
    'Extractor proof',
    'Extraction scale',
    'Strategy Hub',
  ]
  const requiredCardTerms = [
    FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
    FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID,
    'EXTRACTOR-BRAIN-FLEET-PROOF-001',
    'EXTRACTOR-OVERNIGHT-RUN-GUARD-001',
    'STRATEGY-003',
  ]

  function require(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  require(currentPlan.includes('Current Sprint API owns the active blocker'), 'plan_routes_active_blocker_to_api')
  require(currentState.includes('Current Sprint API owns the active blocker'), 'state_routes_active_blocker_to_api')
  for (const term of requiredOrderTerms) {
    require(currentPlan.includes(term), 'plan_names_steve_order_term', term)
    require(currentState.includes(term), 'state_names_steve_order_term', term)
  }
  for (const term of requiredCardTerms) {
    require(currentPlan.includes(term), 'plan_names_control_order_card', term)
    require(currentState.includes(term), 'state_names_control_order_card', term)
  }
  require(!/active blocker is `?STRATEGY-003`?/i.test(currentPlan), 'plan_does_not_claim_strategy_active_blocker')
  require(!/active blocker is `?STRATEGY-003`?/i.test(currentState), 'state_does_not_claim_strategy_active_blocker')

  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    findings,
  }
}

export function buildControlPlaneTruthCleanupStatus({
  activeSprint = {},
  backlogItems = [],
  closeouts = [],
  may20Audit = {},
  currentPlan = '',
  currentState = '',
} = {}) {
  const checks = []
  const activeGate = validateCurrentSprintActiveCardGateSnapshot({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems,
  })
  const may20AuditRouting = buildMay20DeepAuditRoutingStatus({
    audit: may20Audit,
    routeCards: backlogItems,
    closeouts,
  })
  const docs = buildControlPlaneTruthDocsStatus({ currentPlan, currentState })
  const cleanupCard = backlogItems.find(item => item.id === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID) || null
  const nextCard = backlogItems.find(item => item.id === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_NEXT_CARD_ID) || null

  function add(ok, check, detail = '') {
    checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
  }

  add(activeSprint.sprint?.sprintId === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SPRINT_ID, 'live Current Sprint is the control-plane cleanup sprint', activeSprint.sprint?.sprintId || 'missing')
  add(activeGate.ok, 'live Current Sprint active-card gate is healthy', activeGate.findings.map(item => `${item.check}: ${item.detail}`).join('; ') || activeGate.activeBlockerCardId)
  add(may20AuditRouting.ok, 'May 20 deep-audit findings are closed/routed/accepted', JSON.stringify(may20AuditRouting.summary))
  add(docs.ok, 'plan/current-state name Steve order and route active blocker to API', docs.findings.map(item => `${item.check}: ${item.detail}`).join('; ') || 'docs healthy')
  add(cleanupCard?.lane === 'done', 'cleanup card is done in live backlog', cleanupCard ? `${cleanupCard.id}:${cleanupCard.lane}` : 'missing')
  add(nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Brain Fleet card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
    activeGate,
    may20AuditRouting,
    docs,
  }
}
