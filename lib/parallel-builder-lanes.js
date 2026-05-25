export const AIOS_PARALLEL_BUILDER_LANES_CARD_ID = 'AIOS-PARALLEL-BUILDER-LANES-001'
export const AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH = 'docs/process/parallel-builder-lanes-001-plan.md'
export const AIOS_PARALLEL_BUILDER_LANES_SCRIPT_PATH = 'scripts/process-parallel-builder-lanes-check.mjs'

export const AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS = [
  'node --check lib/parallel-builder-lanes.js scripts/process-parallel-builder-lanes-check.mjs',
  'npm run process:parallel-builder-lanes-check -- --json',
  'git diff --check',
]

export const AIOS_PARALLEL_BUILDER_LANES_STATUSES = [
  'planned',
  'assigned',
  'building',
  'blocked',
  'ready_for_review',
  'integrating',
  'paused',
  'done',
  'decommissioned',
]

const INACTIVE_STATUSES = new Set(['paused', 'done', 'decommissioned'])
const BLOCKED_STATUSES = new Set(['blocked'])
const READY_FOR_REVIEW_STATUSES = new Set(['ready_for_review'])
const FORBIDDEN_CONTROL_STRINGS = [
  'autoCommit',
  'autoPush',
  'externalWrites',
  'realAgentLaunch',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizedPath(value) {
  return text(value).replace(/\\/g, '/').replace(/\/+$/, '')
}

function pathsOverlap(left = '', right = '') {
  const leftPath = normalizedPath(left)
  const rightPath = normalizedPath(right)
  return Boolean(leftPath && rightPath && (
    leftPath === rightPath ||
      leftPath.startsWith(`${rightPath}/`) ||
      rightPath.startsWith(`${leftPath}/`)
  ))
}

function activeLane(lane = {}) {
  return !INACTIVE_STATUSES.has(text(lane.status))
}

function violation(violations, laneId, ruleId, detail = '') {
  violations.push({ laneId: laneId || 'control-plane', ruleId, detail })
}

function buildLane({
  laneId,
  cardId,
  owner,
  role,
  status,
  filesOwned,
  proofCommands,
  blockers = [],
  changedFiles = [],
  integrationStatus,
  updatedAt,
  stopPosture,
}) {
  return {
    laneId,
    cardId,
    owner,
    role,
    status,
    startedAt: '2026-05-25T17:35:00-04:00',
    updatedAt,
    filesOwned,
    proofCommands,
    blockers,
    changedFiles,
    integrationStatus,
    stopPath: {
      liveProcess: false,
      command: 'Mark lane paused in the control plane; no worker process exists in V1.',
      decommissionPosture: stopPosture || 'close wrap report, release file ownership, and return lane to idle',
    },
    permissions: {
      mayCommit: false,
      mayPush: false,
      mayLaunchAgents: false,
      mayStartProviderCalls: false,
      mayExternalWrite: false,
    },
  }
}

export function buildParallelBuilderLanesSnapshot(overrides = {}) {
  const snapshot = {
    cardId: AIOS_PARALLEL_BUILDER_LANES_CARD_ID,
    version: 1,
    ownerLayer: 'Foundation Control Plane',
    reportOnly: true,
    purpose: 'Show which builder lanes exist, what each lane owns, what proof is required, and what needs orchestrator integration.',
    sideEffects: {
      launchesRealAgents: false,
      startsTerminals: false,
      providerCalls: false,
      autoCommit: false,
      autoPush: false,
      externalWrites: false,
    },
    integrationOwner: {
      laneId: 'orchestrator',
      owner: 'main orchestrator',
      status: 'owns_final_review_and_integration',
      mayCommit: true,
      mayPush: true,
      rule: 'Builders prepare work; parent/orchestrator reviews, integrates, verifies, commits, and pushes.',
    },
    lanes: [
      buildLane({
        laneId: 'orchestrator',
        cardId: AIOS_PARALLEL_BUILDER_LANES_CARD_ID,
        owner: 'Main session',
        role: 'orchestrator',
        status: 'integrating',
        filesOwned: [
          'package.json',
        ],
        proofCommands: AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS,
        changedFiles: [
          AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH,
          'lib/parallel-builder-lanes.js',
          AIOS_PARALLEL_BUILDER_LANES_SCRIPT_PATH,
          'package.json',
        ],
        integrationStatus: 'integration_owner',
        updatedAt: '2026-05-25T17:45:00-04:00',
        stopPosture: 'leave repo clean or hand off exact dirty files before ending the main session',
      }),
      buildLane({
        laneId: 'builder-a',
        cardId: 'SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001',
        owner: 'Poincare',
        role: 'runtime builder',
        status: 'ready_for_review',
        filesOwned: [
          'lib/synthesis-router-freshness-trigger.js',
          'scripts/process-synthesis-router-freshness-trigger-check.mjs',
        ],
        proofCommands: [
          'npm run process:synthesis-router-freshness-trigger-check -- --json',
          'npm run process:dev-team-hub-v0-check -- --json',
        ],
        changedFiles: [
          'lib/synthesis-router-freshness-trigger.js',
          'scripts/process-synthesis-router-freshness-trigger-check.mjs',
        ],
        integrationStatus: 'awaiting_orchestrator_review',
        updatedAt: '2026-05-25T17:42:00-04:00',
      }),
      buildLane({
        laneId: 'builder-b',
        cardId: 'FOUNDATION-V2-DATA-SOURCES-MAP-001',
        owner: 'Volta',
        role: 'read-only explorer',
        status: 'blocked',
        filesOwned: [
          'docs/handoffs/foundation-v2-data-sources-map.md',
        ],
        proofCommands: [
          'read-only map delivered to orchestrator for product decision',
        ],
        blockers: [
          'Waiting for Steve/orchestrator to approve the Foundation Data Sources V2 card shape before UI build.',
        ],
        changedFiles: [],
        integrationStatus: 'no_code_to_integrate',
        updatedAt: '2026-05-25T17:40:00-04:00',
        stopPosture: 'archive explorer notes or promote them into the next UI builder card',
      }),
      buildLane({
        laneId: 'builder-c',
        cardId: AIOS_PARALLEL_BUILDER_LANES_CARD_ID,
        owner: 'Builder C',
        role: 'control-plane primitive builder',
        status: 'building',
        filesOwned: [
          'docs/process/parallel-builder-lanes-001-plan.md',
          'lib/parallel-builder-lanes.js',
          'scripts/process-parallel-builder-lanes-check.mjs',
        ],
        proofCommands: AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS,
        changedFiles: [
          'docs/process/parallel-builder-lanes-001-plan.md',
          'lib/parallel-builder-lanes.js',
          'scripts/process-parallel-builder-lanes-check.mjs',
        ],
        integrationStatus: 'in_progress',
        updatedAt: '2026-05-25T17:45:00-04:00',
      }),
    ],
  }
  return { ...snapshot, ...overrides }
}

export function evaluateParallelBuilderLanes(snapshot = buildParallelBuilderLanesSnapshot()) {
  const violations = []
  const lanes = list(snapshot.lanes)
  const active = lanes.filter(activeLane)

  if (snapshot.ownerLayer !== 'Foundation Control Plane') violation(violations, snapshot.cardId, 'foundation_control_plane_owner_required', snapshot.ownerLayer || 'missing')
  if (snapshot.reportOnly !== true) violation(violations, snapshot.cardId, 'report_only_required', String(snapshot.reportOnly))
  if (!lanes.length) violation(violations, snapshot.cardId, 'lane_records_required', 'at least one lane is required')

  for (const key of FORBIDDEN_CONTROL_STRINGS) {
    if (snapshot.sideEffects?.[key] === true) violation(violations, snapshot.cardId, 'side_effect_disabled_required', key)
  }
  if (snapshot.sideEffects?.launchesRealAgents === true || snapshot.sideEffects?.startsTerminals === true || snapshot.sideEffects?.providerCalls === true) {
    violation(violations, snapshot.cardId, 'no_runtime_launches_or_provider_calls', 'V1 is report-only')
  }

  if (text(snapshot.integrationOwner?.laneId) !== 'orchestrator' || text(snapshot.integrationOwner?.status) !== 'owns_final_review_and_integration') {
    violation(violations, snapshot.cardId, 'orchestrator_integration_owner_required', snapshot.integrationOwner?.laneId || 'missing')
  }

  for (const lane of lanes) {
    const laneId = text(lane.laneId)
    if (!laneId) violation(violations, laneId, 'lane_id_required', 'missing laneId')
    if (!text(lane.cardId)) violation(violations, laneId, 'card_id_required', 'missing cardId')
    if (!text(lane.owner)) violation(violations, laneId, 'owner_required', 'missing owner')
    if (!AIOS_PARALLEL_BUILDER_LANES_STATUSES.includes(text(lane.status))) violation(violations, laneId, 'known_status_required', lane.status || 'missing')
    if (!text(lane.startedAt) || !text(lane.updatedAt)) violation(violations, laneId, 'timestamps_required', 'startedAt and updatedAt are required')
    if (activeLane(lane) && !list(lane.filesOwned).length) violation(violations, laneId, 'file_ownership_required', 'active lane must declare filesOwned')
    if (!list(lane.proofCommands).length) violation(violations, laneId, 'proof_command_required', 'every lane needs at least one proof command or explicit read-only proof')
    if (!text(lane.integrationStatus)) violation(violations, laneId, 'integration_status_visible_required', 'missing integrationStatus')
    if (!lane.stopPath || !text(lane.stopPath.decommissionPosture)) violation(violations, laneId, 'stop_decommission_posture_required', 'missing stopPath/decommissionPosture')

    if (BLOCKED_STATUSES.has(text(lane.status)) && !list(lane.blockers).length) {
      violation(violations, laneId, 'blocked_lane_needs_blocker', 'blocked status must explain the blocker')
    }
    if (READY_FOR_REVIEW_STATUSES.has(text(lane.status)) && !['awaiting_orchestrator_review', 'ready_for_orchestrator_review'].includes(text(lane.integrationStatus))) {
      violation(violations, laneId, 'ready_lane_needs_review_status', lane.integrationStatus || 'missing')
    }
    if (lane.permissions?.mayCommit === true || lane.permissions?.mayPush === true || lane.permissions?.mayLaunchAgents === true || lane.permissions?.mayExternalWrite === true) {
      violation(violations, laneId, 'builder_side_effect_permission_blocked', 'builder lanes must not commit, push, launch agents, or write externally')
    }
  }

  for (let index = 0; index < active.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < active.length; nextIndex += 1) {
      const left = active[index]
      const right = active[nextIndex]
      for (const leftFile of list(left.filesOwned)) {
        for (const rightFile of list(right.filesOwned)) {
          if (pathsOverlap(leftFile, rightFile)) {
            violation(violations, `${left.laneId}+${right.laneId}`, 'active_write_ownership_overlap_blocked', `${leftFile} overlaps ${rightFile}`)
          }
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: snapshot.cardId,
    violations,
    summary: {
      laneCount: lanes.length,
      activeLaneCount: active.length,
      blockedLaneCount: lanes.filter(lane => BLOCKED_STATUSES.has(text(lane.status))).length,
      readyForReviewLaneCount: lanes.filter(lane => READY_FOR_REVIEW_STATUSES.has(text(lane.status))).length,
      violationCount: violations.length,
      integrationOwner: snapshot.integrationOwner?.laneId || '',
    },
  }
}

export function buildParallelBuilderLanesDogfoodProof() {
  const healthy = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot())
  const overlappingOwnership = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot({
    lanes: buildParallelBuilderLanesSnapshot().lanes.map(lane => lane.laneId === 'builder-b'
      ? { ...lane, status: 'building', filesOwned: ['lib/synthesis-router-freshness-trigger.js'], proofCommands: ['npm run proof'] }
      : lane),
  }))
  const missingProof = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot({
    lanes: buildParallelBuilderLanesSnapshot().lanes.map(lane => lane.laneId === 'builder-c' ? { ...lane, proofCommands: [] } : lane),
  }))
  const blockedInvisible = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot({
    lanes: buildParallelBuilderLanesSnapshot().lanes.map(lane => lane.laneId === 'builder-b' ? { ...lane, blockers: [] } : lane),
  }))
  const sideEffects = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot({
    sideEffects: {
      launchesRealAgents: true,
      startsTerminals: true,
      providerCalls: true,
      autoCommit: true,
      autoPush: true,
      externalWrites: true,
    },
  }))
  const wrongIntegrationOwner = evaluateParallelBuilderLanes(buildParallelBuilderLanesSnapshot({
    integrationOwner: {
      laneId: 'builder-a',
      status: 'owns_final_review_and_integration',
    },
  }))

  return {
    ok: healthy.ok === true &&
      overlappingOwnership.ok === false &&
      missingProof.ok === false &&
      blockedInvisible.ok === false &&
      sideEffects.ok === false &&
      wrongIntegrationOwner.ok === false,
    invariant: 'Healthy lane records pass; overlapping active ownership, missing proof, invisible blockers, side effects, and non-orchestrator integration ownership fail closed.',
    healthy,
    overlappingOwnershipRejected: overlappingOwnership.ok === false,
    missingProofRejected: missingProof.ok === false,
    blockedInvisibleRejected: blockedInvisible.ok === false,
    sideEffectsRejected: sideEffects.ok === false,
    wrongIntegrationOwnerRejected: wrongIntegrationOwner.ok === false,
  }
}
