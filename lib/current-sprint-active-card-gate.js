export const CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID = 'CURRENT-SPRINT-ACTIVE-CARD-GATE-001'
export const CURRENT_SPRINT_ACTIVE_CARD_GATE_CLOSEOUT_KEY = 'current-sprint-active-card-gate-v1'
export const CURRENT_SPRINT_ACTIVE_CARD_GATE_PLAN_PATH = 'docs/process/current-sprint-active-card-gate-001-plan.md'
export const CURRENT_SPRINT_ACTIVE_CARD_GATE_APPROVAL_PATH = 'docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json'
export const CURRENT_SPRINT_ACTIVE_CARD_GATE_SCRIPT_PATH = 'scripts/process-current-sprint-active-card-gate-check.mjs'
export const CURRENT_SPRINT_ACTIVE_CARD_GATE_SPRINT_ID = 'FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19'

export const DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID = 'DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID = 'FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001'

export const CURRENT_SPRINT_ACTIVE_CARD_GATE_PROOF_COMMANDS = [
  'node --check lib/current-sprint-active-card-gate.js scripts/process-current-sprint-active-card-gate-check.mjs',
  'npm run process:current-sprint-active-card-gate-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json --closeoutKey=current-sprint-active-card-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --closeoutKey=current-sprint-active-card-gate-v1',
  'npm run process:foundation-ship -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json --closeoutKey=current-sprint-active-card-gate-v1 --commitRef=HEAD',
]

export const CURRENT_SPRINT_ACTIVE_CARD_GATE_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not send emails, public posts, or external writes.',
  'Do not start private broad extraction, paid/provider access, browser-auth work, credential mutation, provider config changes, or new source access.',
  'Do not start Value Builder split overnight.',
  'Do not classify broken workflow failures as green.',
  'Do not skip Current Sprint truth because chat has an approved order.',
]

export const CURRENT_SPRINT_ACTIVE_CARD_GATE_OVERNIGHT_ORDER = [
  CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID,
  'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001',
  'BUILD-LOG-API-CACHE-AND-SLIM-001',
  'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
  'APPROVAL-THRESHOLD-REGISTRY-001',
  'BUILD-INTEL-SNAPSHOT-BASELINE-001',
  'BUILD-CLOSEOUT-DATA-SOURCE-001',
  'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001',
  'FOUNDATION-CSS-SURFACE-DECOUPLE-001',
  'DECISION-008',
  'INTEL-SCOPER-001',
  'DATA-003',
  FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID,
]

const CARD_DEFINITIONS = {
  [CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID]: {
    title: 'Gate durable work on active Current Sprint truth',
    priority: 'P0',
    rank: 12,
    owner: 'Foundation Process',
    summary: 'Add a hard gate so durable Foundation work cannot start from chat-only sprint direction when Current Sprint lacks active blocker, definition of done, proof, not-next boundaries, owner, next action, and repo posture.',
    whyItMatters: 'The May 19 failure mode was not lack of plans; it was sprint/build truth drifting from repo truth. This card makes Current Sprint the executable command surface before overnight work continues.',
    nextAction: 'Ship the active-card gate, reset the overnight sprint truth, and advance the active blocker to DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001.',
    statusNote: 'Scoped from Steve-approved overnight reset after STRATEGIC-INTEL-001 shipped cleanly.',
  },
  [DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID]: {
    title: 'Close or route every deep-audit finding',
    priority: 'P0',
    rank: 13,
    owner: 'Foundation Audit',
    summary: 'Ensure every P0/P1/P2 deep merge audit finding is done, scoped, explicitly deferred with owner/threshold, or covered by shipped proof.',
    whyItMatters: 'Deep audit findings cannot sit in markdown. If an audit finds real work, the live backlog/current sprint must own it.',
    nextAction: 'Route the May 19 deep-audit P1/P2 findings exactly before continuing cleanup/intelligence work.',
    statusNote: 'Scoped by CURRENT-SPRINT-ACTIVE-CARD-GATE-001 with proof/acceptance required before build: every deep-audit finding must route to done, scoped, deferred-with-owner, or covered-with-proof truth.',
  },
  'BUILD-CLOSEOUT-DATA-SOURCE-001': {
    title: 'Move build closeout history toward a data-backed source',
    priority: 'P2',
    rank: 84,
    owner: 'Foundation Process',
    summary: 'Scope and, if safe, implement the follow-up for the deep-audit finding that build closeout history remains code-owned operational data.',
    whyItMatters: 'Closeout history should not become another growing code registry that has to be manually edited forever.',
    nextAction: 'Decide whether the shipped closeout registry extract fully covers the audit finding or create the next data-backed source slice with proof.',
    statusNote: 'Created from the 2026-05-19 deep merge audit P2 finding.',
  },
  'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001': {
    title: 'Make focused checks historical-sprint aware',
    priority: 'P2',
    rank: 85,
    owner: 'Foundation Process',
    summary: 'Remove exact dated active-sprint ID assumptions from focused checks unless they are explicitly historical replay fixtures.',
    whyItMatters: 'A shipped proof should stay valid because the shipped work exists, not because an old sprint is still active.',
    nextAction: 'Audit the focused checks named by the deep merge audit and route through historical-aware sprint metadata or closeout proof.',
    statusNote: 'Created from the 2026-05-19 deep merge audit P2 finding.',
  },
  'FOUNDATION-CSS-SURFACE-DECOUPLE-001': {
    title: 'Decouple large Foundation CSS surfaces by ownership',
    priority: 'P2',
    rank: 86,
    owner: 'Foundation Frontend',
    summary: 'Resolve or explicitly prove coverage for the deep-audit finding that Foundation CSS surfaces still carry frontend drift risk.',
    whyItMatters: 'Large shared CSS surfaces make UI regressions harder to inspect and can quietly recreate frontend monolith risk.',
    nextAction: 'Prove existing DOM/CSS split cards cover the finding or scope the next small CSS ownership split.',
    statusNote: 'Created from the 2026-05-19 deep merge audit P2 finding.',
  },
  [FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID]: {
    title: 'Close overnight sprint and choose morning-safe continuation',
    priority: 'P0',
    rank: 99,
    owner: 'Foundation Ops',
    summary: 'Run the morning-readiness closeout after the audit-control/intelligence sprint and choose the next Foundation-safe sprint if the work finishes before Steve wakes up.',
    whyItMatters: 'Steve explicitly approved continuous overnight work. The system needs a closeout that picks the next sprint from live truth instead of stopping.',
    nextAction: 'After DATA-003 or any parked work, verify health/repeated failures/main/backlog/audit routing and select the next safe Foundation sprint.',
    statusNote: 'Scoped by CURRENT-SPRINT-ACTIVE-CARD-GATE-001 with closeout proof required after the overnight run: raw health, repeated failures, backlog hygiene, foundation:verify, main sync, and next-sprint recommendation.',
  },
}

export function getCurrentSprintActiveCardGateBacklogRows({ closeCard = false } = {}) {
  return Object.entries(CARD_DEFINITIONS).map(([id, definition]) => ({
    id,
    title: definition.title,
    team: 'foundation',
    lane: id === CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID
      ? (closeCard ? 'done' : 'executing')
      : 'scoped',
    priority: definition.priority,
    rank: definition.rank,
    source: 'Steve-approved unattended overnight Foundation reset on 2026-05-19.',
    summary: definition.summary,
    whyItMatters: definition.whyItMatters,
    nextAction: id === CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID && closeCard
      ? `Done under ${CURRENT_SPRINT_ACTIVE_CARD_GATE_CLOSEOUT_KEY}; continue ${DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID}.`
      : definition.nextAction,
    statusNote: id === CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID && closeCard
      ? `Closed under ${CURRENT_SPRINT_ACTIVE_CARD_GATE_CLOSEOUT_KEY}; Current Sprint now points to ${DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID} with active-card metadata and repo posture required before durable work continues.`
      : definition.statusNote,
    owner: definition.owner,
  }))
}

export function buildCurrentSprintActiveCardGateExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-current-sprint.js',
      'lib/foundation-current-sprint-store.js',
      'scripts/process-current-sprint-dynamic-truth-check.mjs',
      'scripts/process-sprint-stage-gate-check.mjs',
      'lib/process-write-guard.js',
    ],
    existingDocs: [
      'docs/process/current-sprint-dynamic-truth-001-plan.md',
      'docs/process/sprint-stage-gate-001-plan.md',
      'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
    ],
    existingScripts: [
      'process:current-sprint-dynamic-truth-check',
      'process:sprint-stage-gate-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
    ],
    existingPolicy: [
      'Live Backlog is task truth.',
      'Current Sprint is an overlay on live backlog truth.',
      'Blockers block unsafe actions, not the whole sprint.',
      'Green means raw green; classification is not repair.',
    ],
    reused: 'Reuses the existing Current Sprint overlay, stage gate, Plan Critic, approval integrity, and process write guard instead of building a second sprint system.',
    exactGap: 'An approved chat sprint can get ahead of live Current Sprint and repo truth unless the active card must carry all execution metadata and repo posture.',
    overBroadRisk: 'This card can drift into a new sprint engine. It only adds an active-card preflight gate and resets the approved overnight sprint truth.',
    readyBy: 'Steve approved unattended overnight work after STRATEGIC-INTEL-001 shipped cleanly.',
    readyAt: '2026-05-19T21:55:00-04:00',
    notRebuilt: 'No second backlog, no new workflow engine, no Value Builder split, no source/extraction expansion.',
  }
}

export function buildCurrentSprintActiveCardGateItem({ cardId, order, stage, currentHead = '' } = {}) {
  const active = cardId === CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID
  const closeout = cardId === FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID
  const definition = CARD_DEFINITIONS[cardId] || {}
  return {
    cardId,
    order,
    stage,
    planRef: active
      ? CURRENT_SPRINT_ACTIVE_CARD_GATE_PLAN_PATH
      : `docs/process/${cardId.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '-')}-plan.md`,
    definitionOfDone: active
      ? 'Durable work cannot start unless Current Sprint exposes active blocker, definition of done, proof commands, not-next boundaries, owner, next action, and repo posture; overnight sprint truth is reset and next blocker is deep-audit closure.'
      : `${cardId} is scoped or shipped with live backlog truth, focused proof, raw-green gates, and no unapproved external/private/provider side effects.`,
    proofCommands: active
      ? CURRENT_SPRINT_ACTIVE_CARD_GATE_PROOF_COMMANDS
      : [
          'npm run process:system-health-nightly-audit-check -- --json',
          'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify -- --json-summary',
        ],
    nextAction: definition.nextAction || `Work ${cardId} when it becomes active in the approved overnight order.`,
    notNextBoundaries: CURRENT_SPRINT_ACTIVE_CARD_GATE_NOT_NEXT,
    existingWorkCheck: active ? buildCurrentSprintActiveCardGateExistingWorkCheck() : {},
    metadata: {
      approvalBoundActionsParkInsteadOfStopping: true,
      blockersBlockActionsNotSprint: true,
      repoPosture: {
        integrationBranch: 'main',
        expectedBaseCommit: currentHead,
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
      closeoutKey: active ? CURRENT_SPRINT_ACTIVE_CARD_GATE_CLOSEOUT_KEY : null,
      overnightOrder: closeout ? CURRENT_SPRINT_ACTIVE_CARD_GATE_OVERNIGHT_ORDER : undefined,
    },
  }
}

export function buildCurrentSprintActiveCardGateOverlay({
  closeCard = false,
  currentHead = '',
} = {}) {
  const activeBlockerCardId = closeCard
    ? DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID
    : CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID
  const items = CURRENT_SPRINT_ACTIVE_CARD_GATE_OVERNIGHT_ORDER.map((cardId, index) => {
    let stage = 'scoping'
    if (cardId === CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID) stage = closeCard ? 'done_this_sprint' : 'building_now'
    if (closeCard && cardId === DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID) stage = 'scoping'
    return buildCurrentSprintActiveCardGateItem({
      cardId,
      order: index + 1,
      stage,
      currentHead,
    })
  })
  return {
    sprint: {
      sprintId: CURRENT_SPRINT_ACTIVE_CARD_GATE_SPRINT_ID,
      status: 'active',
      goal: 'Close deep-audit control gaps, burn down remaining audit debt, then continue the intelligence/accountability loop without losing sprint or repo truth.',
      activeBlockerCardId,
      metadata: {
        currentStatus: closeCard ? 'active_card_gate_shipped' : 'active_card_gate_in_progress',
        nextAction: closeCard
          ? `Continue ${DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID}; do not start value/extraction expansion before audit-control cards are done.`
          : `Ship ${CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID} before other overnight durable work.`,
        priorityOrder: CURRENT_SPRINT_ACTIVE_CARD_GATE_OVERNIGHT_ORDER,
        approvalPolicy: 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue to the next safe card.',
        exitCriteria: [
          'Current Sprint active card/blocker, definition of done, proof commands, not-next boundaries, owner, next action, and repo posture are complete before durable work starts.',
          'Every P0/P1/P2 deep-audit finding is done, scoped, explicitly deferred with owner/threshold, or covered by shipped proof.',
          'System Health remains healthy with raw risk/watch at zero.',
          'Repeated-failure gate remains healthy.',
          'Backlog hygiene remains healthy.',
          'foundation:verify and process:foundation-ship pass after each shipped card.',
          'Main is clean and synced after each shipped card.',
        ],
        noValueBuilderSplit: true,
      },
    },
    items,
  }
}

export function validateCurrentSprintActiveCardGateSnapshot({
  sprint = null,
  items = [],
  backlogItems = [],
} = {}) {
  const findings = []
  const activeBlockerCardId = String(sprint?.activeBlockerCardId || sprint?.active_blocker_card_id || '').trim()
  const activeItem = (items || []).find(item => String(item.cardId || item.backlogId || '').trim() === activeBlockerCardId)
  const backlogMap = new Map((backlogItems || []).map(item => [item.id, item]))
  const activeBacklog = activeBlockerCardId ? backlogMap.get(activeBlockerCardId) : null
  const sprintMetadata = sprint?.metadata && typeof sprint.metadata === 'object' ? sprint.metadata : {}
  const itemMetadata = activeItem?.metadata && typeof activeItem.metadata === 'object' ? activeItem.metadata : {}
  const repoPosture = itemMetadata.repoPosture && typeof itemMetadata.repoPosture === 'object'
    ? itemMetadata.repoPosture
    : {}

  function require(ok, check, detail = '') {
    if (!ok) findings.push({ check, detail })
  }

  require(Boolean(sprint), 'active_sprint_exists', 'No active Current Sprint exists.')
  require(String(sprint?.status || '') === 'active', 'active_sprint_status', sprint?.status || 'missing')
  require(Boolean(activeBlockerCardId), 'active_blocker_required', 'Active blocker/card is missing.')
  require(Boolean(activeItem), 'active_item_required', activeBlockerCardId || 'missing')
  require(Boolean(activeBacklog), 'active_backlog_card_required', activeBlockerCardId || 'missing')
  require(Boolean(activeBacklog?.owner), 'active_card_owner_required', activeBacklog?.owner || 'missing')
  require(Boolean(activeBacklog?.nextAction || activeBacklog?.next_action), 'active_card_next_action_required', activeBacklog?.nextAction || activeBacklog?.next_action || 'missing')
  require(Boolean(activeItem?.definitionOfDone || activeItem?.definition_of_done), 'active_card_definition_of_done_required', activeBlockerCardId)
  require((activeItem?.proofCommands || activeItem?.proof_commands || []).length > 0, 'active_card_proof_commands_required', activeBlockerCardId)
  require((activeItem?.notNextBoundaries || activeItem?.not_next_boundaries || []).length > 0, 'active_card_not_next_required', activeBlockerCardId)
  require(Boolean(activeItem?.nextAction || activeItem?.next_action || activeBacklog?.nextAction || activeBacklog?.next_action), 'active_card_next_action_visible', activeBlockerCardId)
  require(repoPosture.integrationBranch === 'main', 'active_card_repo_branch_required', JSON.stringify(repoPosture))
  require(Boolean(repoPosture.expectedBaseCommit), 'active_card_repo_base_commit_required', JSON.stringify(repoPosture))
  require(repoPosture.commitPushRequiredAfterCard === true, 'active_card_commit_push_required', JSON.stringify(repoPosture))
  require(repoPosture.mainMustEqualOriginMainAtCloseout === true, 'active_card_main_sync_required', JSON.stringify(repoPosture))
  require(sprintMetadata.approvalPolicy && /park/i.test(sprintMetadata.approvalPolicy) && /continue/i.test(sprintMetadata.approvalPolicy), 'sprint_park_and_continue_policy_required', sprintMetadata.approvalPolicy || 'missing')
  require(itemMetadata.blockersBlockActionsNotSprint === true, 'blockers_block_actions_not_sprint_required', JSON.stringify(itemMetadata))

  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    activeBlockerCardId,
    findings,
  }
}

export function buildCurrentSprintActiveCardGateDogfoodProof() {
  const baseBacklog = {
    id: 'DOGFOOD-ACTIVE-CARD',
    owner: 'Foundation Process',
    nextAction: 'Continue synthetic proof.',
  }
  const baseItem = {
    cardId: 'DOGFOOD-ACTIVE-CARD',
    stage: 'building_now',
    definitionOfDone: 'Synthetic definition of done.',
    proofCommands: ['npm run synthetic'],
    notNextBoundaries: ['Do not mutate Drive permissions.'],
    nextAction: 'Continue synthetic proof.',
    metadata: {
      blockersBlockActionsNotSprint: true,
      repoPosture: {
        integrationBranch: 'main',
        expectedBaseCommit: 'a'.repeat(40),
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
    },
  }
  const baseSprint = {
    sprintId: 'DOGFOOD-SPRINT',
    status: 'active',
    activeBlockerCardId: 'DOGFOOD-ACTIVE-CARD',
    metadata: {
      approvalPolicy: 'Park blocked actions and continue safe sprint work.',
    },
  }
  const complete = validateCurrentSprintActiveCardGateSnapshot({
    sprint: baseSprint,
    items: [baseItem],
    backlogItems: [baseBacklog],
  })
  const missingActiveBlocker = validateCurrentSprintActiveCardGateSnapshot({
    sprint: { ...baseSprint, activeBlockerCardId: '' },
    items: [baseItem],
    backlogItems: [baseBacklog],
  })
  const missingDefinition = validateCurrentSprintActiveCardGateSnapshot({
    sprint: baseSprint,
    items: [{ ...baseItem, definitionOfDone: '' }],
    backlogItems: [baseBacklog],
  })
  const missingRepoPosture = validateCurrentSprintActiveCardGateSnapshot({
    sprint: baseSprint,
    items: [{ ...baseItem, metadata: { blockersBlockActionsNotSprint: true } }],
    backlogItems: [baseBacklog],
  })
  const stopWholeSprintPolicy = validateCurrentSprintActiveCardGateSnapshot({
    sprint: { ...baseSprint, metadata: { approvalPolicy: 'Hard stop and wait for Steve.' } },
    items: [baseItem],
    backlogItems: [baseBacklog],
  })

  return {
    ok: complete.ok &&
      !missingActiveBlocker.ok &&
      !missingDefinition.ok &&
      !missingRepoPosture.ok &&
      !stopWholeSprintPolicy.ok,
    complete,
    missingActiveBlocker,
    missingDefinition,
    missingRepoPosture,
    stopWholeSprintPolicy,
  }
}
