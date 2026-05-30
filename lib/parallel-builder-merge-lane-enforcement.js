import { evaluateFoundationMergeQueueEntry } from './foundation-merge-queue.js'
import { buildParallelBuilderOperatingSystemDogfoodProof } from './parallel-builder-operating-system.js'

export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID = 'PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY = 'parallel-builder-merge-lane-enforcement-v1'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH = 'docs/process/parallel-builder-merge-lane-enforcement-001-plan.md'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH = 'docs/process/parallel-builder-merge-lane-enforcement-001-protocol.md'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH = 'docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SCRIPT_PATH = 'scripts/process-parallel-builder-merge-lane-enforcement-check.mjs'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-parallel-builder-merge-lane-enforcement-closeout.md'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_NEXT_CARD_ID = 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001'

export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CHANGED_FILES = [
  'lib/parallel-builder-merge-lane-enforcement.js',
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SCRIPT_PATH,
  'lib/foundation-process-hardening-verifier.js',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_PATH,
  'package.json',
]

export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROOF_COMMANDS = [
  'node --check lib/parallel-builder-merge-lane-enforcement.js scripts/process-parallel-builder-merge-lane-enforcement-check.mjs lib/foundation-process-hardening-verifier.js',
  'npm run process:parallel-builder-merge-lane-enforcement-check -- --apply --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1',
  'npm run process:post-ship-fanout -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD',
]

export const PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_NOT_NEXT = [
  'Do not launch parallel builders from this card.',
  'Do not let completed cards continue stacking outside main.',
  'Do not merge more than one branch to main at a time.',
  'Do not continue after main fails post-merge without routing a repair card.',
  'Do not allow hidden or untracked builders.',
  'Do not run live extraction, auth-required jobs, provider probes, model-spend, external writes, Drive mutation, or Agent Feedback sends.',
]

const REPO_ROOT = '/Users/bensoncrew/bcrew-ai-os'
const REQUIRED_LANES = ['main_session', 'worker_branch_worktree', 'review_integration_lane']

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

function scopesOverlap(left = [], right = []) {
  return list(left).some(leftPath => list(right).some(rightPath => pathsOverlap(leftPath, rightPath)))
}

function violation(violations, ruleId, detail = '', severity = 'blocker') {
  violations.push({ ruleId, detail, severity })
}

function buildAssignment({
  assignmentId,
  laneId,
  chatName,
  role,
  branch,
  worktreePath,
  activeCardId,
  fileOwnership,
  completedWork = [],
  status = 'assigned',
  independentBuilder = true,
}) {
  return {
    assignmentId,
    laneId,
    chatName,
    role,
    chatVisibility: 'visible',
    branch,
    worktreePath,
    activeCardId,
    fileOwnership,
    completedWork,
    status,
    independentBuilder,
    proofCommands: ['npm run process:card-focused-proof -- --json'],
    dirtyState: { status: 'clean', wrapReportRef: `${assignmentId}-wrap` },
  }
}

function buildQueueEntry(overrides = {}) {
  return {
    queueId: 'merge-foundation-health-watch',
    assignmentId: 'foundation-builder-a',
    cardId: 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001',
    state: 'post_merge_verified',
    branchSynced: true,
    worktreeClean: true,
    closeoutExists: true,
    focusedProofPassed: true,
    fullShipGatePassed: true,
    approvalBoundFalseDone: false,
    blockedCardHoldingSprint: false,
    mergeConflictCheckPassed: true,
    hiddenWorkerSpawned: false,
    hiddenWorkerApproved: false,
    mainPostMergeHealthy: true,
    mainFailureRepairRouted: false,
    aheadCount: 3,
    releaseTrainApproved: false,
    completedCardCount: 1,
    postMergeVerificationRequired: true,
    postMergeVerification: {
      foundationVerifyPassed: true,
      backlogHygienePassed: true,
      servedCodeVerified: true,
      proofCommands: ['npm run foundation:verify -- --json-summary'],
    },
    ...overrides,
  }
}

export function buildParallelBuilderMergeLaneProtocol(overrides = {}) {
  const assignments = [
    buildAssignment({
      assignmentId: 'orchestrator',
      laneId: 'main_session',
      chatName: 'Main Session',
      role: 'Foundation Orchestrator',
      branch: 'main',
      worktreePath: REPO_ROOT,
      activeCardId: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID,
      fileOwnership: [
        PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH,
        PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH,
      ],
      independentBuilder: false,
    }),
    buildAssignment({
      assignmentId: 'foundation-builder-a',
      laneId: 'worker_branch_worktree',
      chatName: 'Foundation Builder A',
      role: 'Visible Worker Builder',
      branch: 'foundation/health-watch-to-green-001',
      worktreePath: '/Users/bensoncrew/worktrees/foundation-builder-a',
      activeCardId: 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001',
      fileOwnership: ['lib/foundation-health-watch/', 'docs/process/foundation-health-watch-to-green-001-plan.md'],
      completedWork: [
        {
          cardId: 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001',
          closeoutRef: 'foundation-health-watch-to-green-closeout',
          proofRef: 'foundation-health-watch-focused-proof',
        },
      ],
    }),
    buildAssignment({
      assignmentId: 'feature-preflight-builder-b',
      laneId: 'worker_branch_worktree',
      chatName: 'Feature/Preflight Builder B',
      role: 'Visible Worker Builder',
      branch: 'foundation/endpoint-metrics-freshness-001',
      worktreePath: '/Users/bensoncrew/worktrees/feature-preflight-builder-b',
      activeCardId: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
      fileOwnership: ['lib/foundation-endpoint-metrics/', 'docs/process/foundation-endpoint-metrics-freshness-001-plan.md'],
    }),
    buildAssignment({
      assignmentId: 'review-integration',
      laneId: 'review_integration_lane',
      chatName: 'Review/Integration Lane',
      role: 'Review and Merge Integrator',
      branch: 'foundation/review-integration',
      worktreePath: '/Users/bensoncrew/worktrees/review-integration',
      activeCardId: 'FOUNDATION-INTEGRATION-QUEUE',
      fileOwnership: ['docs/handoffs/integration/', 'docs/process/foundation-merge-queue-log.json'],
    }),
  ]
  const protocol = {
    cardId: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID,
    closeoutKey: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY,
    protocolVersion: 1,
    ownerLayer: 'Foundation Process',
    proposalOnly: true,
    parallelBuildersLaunched: false,
    externalWritesStarted: false,
    liveExtractionStarted: false,
    hiddenWorkerSpawns: [],
    activeBuilderIds: assignments.map(item => item.assignmentId),
    observedBuilderRuns: assignments.map(item => ({ assignmentId: item.assignmentId, visible: true, worktreePath: item.worktreePath })),
    laneDefinitions: [
      { laneId: 'main_session', owner: 'orchestrator', mayMergeToMain: false, purpose: 'Operator/main chat owns sprint order, assignment table, and queue decisions.' },
      { laneId: 'worker_branch_worktree', owner: 'visible-builder', mayMergeToMain: false, purpose: 'Visible workers implement one card or scoped bundle in their own worktree and branch.' },
      { laneId: 'review_integration_lane', owner: 'integration', mayMergeToMain: true, purpose: 'Reviews wrap reports, serializes merge queue, verifies main after merge, and pauses on failure.' },
    ],
    assignments,
    mergeQueue: {
      serialized: true,
      mainBranch: 'main',
      integrationLaneId: 'review_integration_lane',
      queuePaused: false,
      activeMergeId: null,
      mainPostMergeHealthy: true,
      repairCardId: '',
      entries: [buildQueueEntry()],
    },
    blockerHandoffs: [],
  }
  return { ...protocol, ...overrides }
}

function addAssignmentViolations(protocol, violations) {
  const assignments = list(protocol.assignments)
  const byWorktree = new Map()
  const byBranch = new Map()
  const laneIds = new Set(list(protocol.laneDefinitions).map(lane => text(lane.laneId)))
  const activeIds = new Set(list(protocol.activeBuilderIds).map(text))
  const assignmentIds = new Set(assignments.map(item => text(item.assignmentId)))

  for (const requiredLane of REQUIRED_LANES) {
    if (!laneIds.has(requiredLane)) violation(violations, 'required_lane_missing', requiredLane)
  }
  for (const activeId of activeIds) {
    if (!assignmentIds.has(activeId)) violation(violations, 'untracked_active_builder_blocked', activeId)
  }
  for (const run of list(protocol.observedBuilderRuns)) {
    if (!assignmentIds.has(text(run.assignmentId)) || run.visible !== true) {
      violation(violations, 'hidden_or_untracked_builder_blocked', text(run.assignmentId) || 'missing assignment id')
    }
  }

  const mainSessions = assignments.filter(item => item.laneId === 'main_session')
  if (mainSessions.length !== 1) violation(violations, 'exactly_one_main_session_required', String(mainSessions.length))
  if (!assignments.some(item => item.laneId === 'review_integration_lane')) violation(violations, 'review_integration_lane_required', 'missing assignment')

  for (const assignment of assignments) {
    const assignmentId = text(assignment.assignmentId)
    const laneId = text(assignment.laneId)
    const branch = text(assignment.branch)
    const worktreePath = normalizedPath(assignment.worktreePath)
    const independent = assignment.independentBuilder !== false

    if (!assignmentId || !text(assignment.chatName) || !text(assignment.activeCardId)) violation(violations, 'assignment_identity_required', assignmentId || 'missing')
    if (!laneIds.has(laneId)) violation(violations, 'unknown_lane_assignment_blocked', `${assignmentId}:${laneId || 'missing'}`)
    if (assignment.chatVisibility !== 'visible') violation(violations, 'visible_chat_required', `${assignmentId}:${assignment.chatVisibility || 'missing'}`)
    if (!list(assignment.fileOwnership).length) violation(violations, 'file_ownership_required', assignmentId)
    if (!list(assignment.proofCommands).length) violation(violations, 'focused_proof_required', assignmentId)
    if (assignment.dirtyState?.status !== 'clean' && !text(assignment.dirtyState?.wrapReportRef)) violation(violations, 'dirty_state_requires_wrap_report', assignmentId)
    if (laneId === 'main_session' && branch !== 'main') violation(violations, 'main_session_must_use_main', `${assignmentId}:${branch || 'missing'}`)
    if (laneId !== 'main_session' && (!worktreePath.includes('/worktrees/') || branch === 'main')) violation(violations, 'worker_requires_branch_worktree', `${assignmentId}:${branch}:${worktreePath}`)
    if (byWorktree.has(worktreePath)) violation(violations, 'same_worktree_blocked', `${assignmentId} shares ${worktreePath} with ${byWorktree.get(worktreePath)}`)
    byWorktree.set(worktreePath, assignmentId)
    if (byBranch.has(branch)) {
      const previous = byBranch.get(branch)
      if (independent || previous.independentBuilder !== false) violation(violations, 'same_branch_blocked', `${assignmentId} shares ${branch} with ${previous.assignmentId}`)
    }
    byBranch.set(branch, { assignmentId, independentBuilder: independent })
  }

  for (let index = 0; index < assignments.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignments.length; nextIndex += 1) {
      const left = assignments[index]
      const right = assignments[nextIndex]
      if (scopesOverlap(left.fileOwnership, right.fileOwnership)) {
        violation(violations, 'overlapping_file_scope_blocked', `${left.assignmentId}+${right.assignmentId}`)
      }
    }
  }
}

function addMergeQueueViolations(protocol, violations) {
  const queue = protocol.mergeQueue || {}
  const entries = list(queue.entries)
  const entriesByCard = new Map(entries.map(entry => [text(entry.cardId), entry]))

  if (queue.serialized !== true) violation(violations, 'serialized_merge_queue_required', 'mergeQueue.serialized must be true')
  if (queue.mainBranch !== 'main') violation(violations, 'merge_queue_targets_main_required', queue.mainBranch || 'missing')
  if (queue.integrationLaneId !== 'review_integration_lane') violation(violations, 'integration_lane_must_own_merges', queue.integrationLaneId || 'missing')
  const activeMerges = entries.filter(entry => entry.state === 'merging_to_main')
  if (activeMerges.length > 1) violation(violations, 'multiple_active_merges_blocked', String(activeMerges.length))
  if (queue.mainPostMergeHealthy === false && (!queue.queuePaused || !text(queue.repairCardId))) {
    violation(violations, 'failed_main_requires_paused_queue_and_repair', queue.repairCardId || 'missing repair card')
  }
  if (queue.queuePaused === true && !text(queue.repairCardId)) violation(violations, 'paused_queue_requires_repair_card', queue.pauseReason || 'missing repair card')

  for (const assignment of list(protocol.assignments)) {
    for (const work of list(assignment.completedWork)) {
      if (!text(work.closeoutRef) || !text(work.proofRef)) violation(violations, 'completed_work_requires_closeout_and_proof', `${assignment.assignmentId}:${work.cardId}`)
      if (!entriesByCard.has(text(work.cardId))) violation(violations, 'completed_work_requires_merge_queue_entry', `${assignment.assignmentId}:${work.cardId}`)
    }
  }

  for (const entry of entries) {
    const queueResult = evaluateFoundationMergeQueueEntry(entry)
    if (queueResult.status === 'blocked') violation(violations, 'merge_queue_entry_blocked', `${entry.cardId}:${queueResult.findings.map(finding => finding.key).join(',')}`)
    if (queueResult.status === 'paused') violation(violations, 'main_failure_pauses_merge_queue', `${entry.cardId}:${queueResult.findings.map(finding => finding.key).join(',')}`)
    if (queueResult.status === 'integration_required' || Number(entry.completedCardCount || 0) > 20) {
      violation(violations, 'unmerged_completed_pileup_blocked', `${entry.cardId}:ahead=${queueResult.aheadCount} completed=${entry.completedCardCount || 0}`)
    }
    if (entry.postMergeVerificationRequired !== true) violation(violations, 'post_merge_verification_required', entry.cardId)
    if (['merged_to_main', 'post_merge_verified'].includes(entry.state)) {
      const post = entry.postMergeVerification || {}
      if (post.foundationVerifyPassed !== true || post.backlogHygienePassed !== true || post.servedCodeVerified !== true) {
        violation(violations, 'post_merge_verification_missing', entry.cardId)
      }
      if (!list(post.proofCommands).some(command => String(command).includes('foundation:verify'))) {
        violation(violations, 'post_merge_foundation_verify_proof_required', entry.cardId)
      }
    }
  }
}

function addBlockerHandoffViolations(protocol, violations) {
  const handoffsByAssignment = new Map(list(protocol.blockerHandoffs).map(item => [text(item.assignmentId), item]))
  for (const assignment of list(protocol.assignments)) {
    if (!['blocked', 'blocked_continuing'].includes(assignment.status)) continue
    const handoff = handoffsByAssignment.get(text(assignment.assignmentId))
    if (!handoff) {
      violation(violations, 'blocked_builder_requires_handoff', assignment.assignmentId)
      continue
    }
    for (const field of ['blockedCardId', 'blocker', 'attempted', 'neededDecision', 'safeNextCardId']) {
      if (!text(handoff[field])) violation(violations, 'blocker_handoff_field_required', `${assignment.assignmentId}:${field}`)
    }
    if (assignment.status === 'blocked_continuing') {
      if (!list(handoff.safeNextFileOwnership).length) violation(violations, 'safe_continuation_scope_required', assignment.assignmentId)
      if (scopesOverlap(handoff.blockedFileOwnership || assignment.fileOwnership, handoff.safeNextFileOwnership)) {
        violation(violations, 'blocked_worker_continuation_must_not_conflict', assignment.assignmentId)
      }
    }
  }
}

export function evaluateParallelBuilderMergeLaneEnforcement(protocol = buildParallelBuilderMergeLaneProtocol()) {
  const violations = []
  if (protocol.ownerLayer !== 'Foundation Process') violation(violations, 'foundation_process_owner_required', protocol.ownerLayer || 'missing')
  if (protocol.proposalOnly !== true) violation(violations, 'proposal_only_required', String(protocol.proposalOnly))
  if (protocol.parallelBuildersLaunched === true) violation(violations, 'no_parallel_launch_from_enforcement_card', 'this card defines the gate only')
  if (protocol.externalWritesStarted === true) violation(violations, 'external_write_started', 'external writes are not approved')
  if (protocol.liveExtractionStarted === true) violation(violations, 'live_extraction_started', 'live extraction is not approved')
  if (list(protocol.hiddenWorkerSpawns).length) violation(violations, 'hidden_worker_spawns_blocked', `${list(protocol.hiddenWorkerSpawns).length} hidden workers`)
  addAssignmentViolations(protocol, violations)
  addMergeQueueViolations(protocol, violations)
  addBlockerHandoffViolations(protocol, violations)

  const blockers = violations.filter(item => item.severity !== 'watch')
  return {
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : 'ready',
    cardId: protocol.cardId,
    closeoutKey: protocol.closeoutKey,
    canLaunchParallelBuildersAfterCloseout: blockers.length === 0,
    violations,
    summary: {
      laneCount: list(protocol.laneDefinitions).length,
      assignmentCount: list(protocol.assignments).length,
      queuedMergeCount: list(protocol.mergeQueue?.entries).length,
      activeMergeCount: list(protocol.mergeQueue?.entries).filter(entry => entry.state === 'merging_to_main').length,
      completedWorkCount: list(protocol.assignments).reduce((count, assignment) => count + list(assignment.completedWork).length, 0),
      violationCount: violations.length,
    },
  }
}

function mutateProtocol(mutator) {
  const protocol = buildParallelBuilderMergeLaneProtocol()
  mutator(protocol)
  return evaluateParallelBuilderMergeLaneEnforcement(protocol)
}

export function buildParallelBuilderMergeLaneEnforcementDogfoodProof() {
  const healthyProtocol = buildParallelBuilderMergeLaneProtocol()
  const healthy = evaluateParallelBuilderMergeLaneEnforcement(healthyProtocol)
  const sameWorktree = mutateProtocol(protocol => {
    protocol.assignments = protocol.assignments.map(item => ['foundation-builder-a', 'feature-preflight-builder-b'].includes(item.assignmentId)
      ? { ...item, worktreePath: '/Users/bensoncrew/worktrees/collision' }
      : item)
  })
  const sameBranch = mutateProtocol(protocol => {
    protocol.assignments = protocol.assignments.map(item => ['foundation-builder-a', 'feature-preflight-builder-b'].includes(item.assignmentId)
      ? { ...item, branch: 'foundation/collision' }
      : item)
  })
  const overlappingScope = mutateProtocol(protocol => {
    protocol.assignments = protocol.assignments.map(item => item.assignmentId === 'feature-preflight-builder-b'
      ? { ...item, fileOwnership: ['lib/foundation-health-watch/'] }
      : item)
  })
  const untrackedBuilder = mutateProtocol(protocol => {
    protocol.activeBuilderIds = [...protocol.activeBuilderIds, 'ghost-worker']
    protocol.observedBuilderRuns = [...protocol.observedBuilderRuns, { assignmentId: 'ghost-worker', visible: false }]
  })
  const missingQueueEntry = mutateProtocol(protocol => {
    protocol.mergeQueue = { ...protocol.mergeQueue, entries: [] }
  })
  const simultaneousMerges = mutateProtocol(protocol => {
    protocol.mergeQueue = {
      ...protocol.mergeQueue,
      entries: [
        buildQueueEntry({ queueId: 'one', cardId: 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001', state: 'merging_to_main' }),
        buildQueueEntry({ queueId: 'two', cardId: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001', state: 'merging_to_main' }),
      ],
    }
  })
  const missingPostMergeVerify = mutateProtocol(protocol => {
    protocol.mergeQueue = {
      ...protocol.mergeQueue,
      entries: [buildQueueEntry({ postMergeVerification: { foundationVerifyPassed: false, backlogHygienePassed: true, servedCodeVerified: true, proofCommands: [] } })],
    }
  })
  const mainFailedNoRepair = mutateProtocol(protocol => {
    protocol.mergeQueue = { ...protocol.mergeQueue, mainPostMergeHealthy: false, queuePaused: false, repairCardId: '' }
  })
  const unmergedPileup = mutateProtocol(protocol => {
    protocol.mergeQueue = {
      ...protocol.mergeQueue,
      entries: [buildQueueEntry({ aheadCount: 108, completedCardCount: 108, releaseTrainApproved: false })],
    }
  })
  const blockedConflict = mutateProtocol(protocol => {
    protocol.assignments = protocol.assignments.map(item => item.assignmentId === 'feature-preflight-builder-b'
      ? { ...item, status: 'blocked_continuing' }
      : item)
    protocol.blockerHandoffs = [{
      assignmentId: 'feature-preflight-builder-b',
      blockedCardId: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
      blocker: 'needs metric source approval',
      attempted: 'ran focused proof',
      neededDecision: 'owner approval',
      safeNextCardId: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
      blockedFileOwnership: ['lib/foundation-endpoint-metrics/'],
      safeNextFileOwnership: ['lib/foundation-endpoint-metrics/'],
    }]
  })
  const blockedSafe = mutateProtocol(protocol => {
    protocol.assignments = protocol.assignments.map(item => item.assignmentId === 'feature-preflight-builder-b'
      ? { ...item, status: 'blocked_continuing' }
      : item)
    protocol.blockerHandoffs = [{
      assignmentId: 'feature-preflight-builder-b',
      blockedCardId: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
      blocker: 'needs metric source approval',
      attempted: 'ran focused proof',
      neededDecision: 'owner approval',
      safeNextCardId: 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001',
      blockedFileOwnership: ['lib/foundation-endpoint-metrics/'],
      safeNextFileOwnership: ['docs/handoffs/archive-plan/'],
    }]
  })
  const existingOperatingSystem = buildParallelBuilderOperatingSystemDogfoodProof()

  return {
    ok: healthy.ok === true &&
      sameWorktree.ok === false &&
      sameBranch.ok === false &&
      overlappingScope.ok === false &&
      untrackedBuilder.ok === false &&
      missingQueueEntry.ok === false &&
      simultaneousMerges.ok === false &&
      missingPostMergeVerify.ok === false &&
      mainFailedNoRepair.ok === false &&
      unmergedPileup.ok === false &&
      blockedConflict.ok === false &&
      blockedSafe.ok === true &&
      existingOperatingSystem.ok === true,
    invariant: 'Visible lane protocol passes; same worktree, same branch, overlapping file scope, untracked builder, completed work missing queue entry, simultaneous merges, missing post-merge proof, failed main without repair, 108-card pileup, and conflicting blocked-worker continuation all fail closed.',
    healthy,
    sameWorktreeRejected: sameWorktree.ok === false,
    sameBranchRejected: sameBranch.ok === false,
    overlappingScopeRejected: overlappingScope.ok === false,
    untrackedBuilderRejected: untrackedBuilder.ok === false,
    missingQueueEntryRejected: missingQueueEntry.ok === false,
    simultaneousMergesRejected: simultaneousMerges.ok === false,
    missingPostMergeVerifyRejected: missingPostMergeVerify.ok === false,
    mainFailedNoRepairRejected: mainFailedNoRepair.ok === false,
    unmergedPileupRejected: unmergedPileup.ok === false,
    blockedConflictRejected: blockedConflict.ok === false,
    blockedSafeAccepted: blockedSafe.ok === true,
    existingOperatingSystemAccepted: existingOperatingSystem.ok === true,
  }
}
