export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID = 'PARALLEL-BUILDER-WORKTREE-PROTOCOL-001'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY = 'parallel-builder-worktree-protocol-v1'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH = 'docs/process/parallel-builder-worktree-protocol-001-plan.md'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH = 'docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH = 'scripts/process-parallel-builder-worktree-protocol-check.mjs'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-parallel-builder-worktree-protocol-closeout.md'
export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_SPRINT_ID = 'parallel-builder-worktree-protocol-2026-05-18'

export const PARALLEL_BUILDER_WORKTREE_PROTOCOL_CHANGED_FILES = [
  'lib/parallel-builder-worktree-protocol.js',
  'lib/foundation-verify-process-hardening-runner.js',
  'lib/foundation-hub-backlog-contract.js',
  'scripts/process-parallel-builder-worktree-protocol-check.mjs',
  'lib/foundation-build-closeout-cleanup-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'docs/process/parallel-builder-worktree-protocol-001-plan.md',
  'docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json',
  'docs/_archive/handoffs/2026-05-18-parallel-builder-worktree-protocol-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No auth-required or paid run.',
  'No provider/model probe.',
  'No connector/OAuth repair.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No MEETING-VAULT-ACL-001 Phase B or Drive permissions mutation.',
  'No live Agent Feedback auto-send.',
  'Do not touch Steve local mockup assets.',
]

export const PARALLEL_BUILDER_WORKTREE_PROOF_COMMANDS = [
  'node --check lib/parallel-builder-worktree-protocol.js lib/foundation-verify-process-hardening-runner.js scripts/process-parallel-builder-worktree-protocol-check.mjs scripts/foundation-verify.mjs',
  'npm run process:parallel-builder-worktree-protocol-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json --closeoutKey=parallel-builder-worktree-protocol-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 --closeoutKey=parallel-builder-worktree-protocol-v1',
  'npm run process:foundation-ship -- --card=PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json --closeoutKey=parallel-builder-worktree-protocol-v1 --commitRef=HEAD',
]

const SHARED_BRANCHES = new Set([
  'main',
  'master',
  'foundation/system-health-red-to-green-001',
])

const SHARED_FILES_REQUIRING_COORDINATION = [
  'package.json',
  'server.js',
  'lib/foundation-db.js',
  'lib/security-access.js',
  'scripts/foundation-verify.mjs',
]

const FORBIDDEN_SCOPE_PATTERNS = [
  /public\/assets\//,
  /harlan/i,
  /fal/i,
  /voice/i,
  /canva/i,
  /openhuman/i,
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addViolation(violations, assignmentId, ruleId, detail = '') {
  violations.push({ assignmentId: assignmentId || 'missing-assignment-id', ruleId, detail })
}

function normalizedPath(value) {
  return text(value).replace(/\\/g, '/').replace(/\/+$/, '')
}

function scopesOverlap(left = [], right = []) {
  const leftScopes = list(left).map(normalizedPath).filter(Boolean)
  const rightScopes = list(right).map(normalizedPath).filter(Boolean)
  return leftScopes.some(leftPath =>
    rightScopes.some(rightPath =>
      leftPath === rightPath ||
        leftPath.startsWith(`${rightPath}/`) ||
        rightPath.startsWith(`${leftPath}/`)
    )
  )
}

function needsSharedFileCoordination(pathValue = '') {
  const path = normalizedPath(pathValue)
  return SHARED_FILES_REQUIRING_COORDINATION.includes(path) ||
    path.startsWith('docs/process/') ||
    path.startsWith('scripts/process-') ||
    path.startsWith('lib/foundation-') ||
    path.startsWith('routes/') ||
    path.endsWith('-routes.js')
}

function hasForbiddenScope(pathValue = '') {
  const path = normalizedPath(pathValue)
  return FORBIDDEN_SCOPE_PATTERNS.some(pattern => pattern.test(path))
}

export function buildParallelBuilderWorktreeProtocol(overrides = {}) {
  return {
    cardId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
    closeoutKey: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    protocolVersion: 1,
    repoRoot: '/Users/bensoncrew/bcrew-ai-os',
    orchestrationBranch: 'foundation/system-health-red-to-green-001',
    proposalOnly: true,
    implementationStarted: false,
    externalWritesStarted: false,
    liveExtractionStarted: false,
    providerProbeStarted: false,
    currentSprintRequired: true,
    sharedBranchPolicy: 'orchestrator_only',
    mergePolicy: 'one-card-one-branch-one-closeout',
    assignments: [
      {
        assignmentId: 'builder-foundation-capability-registry',
        builderId: 'codex-worker-capability-registry',
        cardId: 'FOUNDATION-UP-CAPABILITY-REGISTRY-001',
        branch: 'foundation/foundation-up-capability-registry-001',
        worktreePath: '/Users/bensoncrew/worktrees/foundation-up-capability-registry-001',
        baseCommit: '824aac3',
        currentSprintStage: 'building_now',
        writeScopes: [
          'lib/foundation-capability-registry.js',
          'scripts/process-foundation-up-capability-registry-check.mjs',
          'docs/process/foundation-up-capability-registry-001-plan.md',
        ],
        sharedFileTouches: [
          {
            path: 'lib/foundation-capability-registry.js',
            owner: 'builder-foundation-capability-registry',
            reportBeforeEdit: true,
            mergeOrder: 'focused-proof-before-merge',
          },
          {
            path: 'scripts/process-foundation-up-capability-registry-check.mjs',
            owner: 'builder-foundation-capability-registry',
            reportBeforeEdit: true,
            mergeOrder: 'focused-proof-before-merge',
          },
          {
            path: 'docs/process/foundation-up-capability-registry-001-plan.md',
            owner: 'builder-foundation-capability-registry',
            reportBeforeEdit: true,
            mergeOrder: 'focused-proof-before-merge',
          },
          {
            path: 'package.json',
            owner: 'orchestrator',
            reportBeforeEdit: true,
            mergeOrder: 'after-focused-proof',
          },
        ],
        proofCommands: [
          'npm run process:foundation-up-capability-registry-check -- --json',
        ],
        mergeHandoff: {
          closeoutKey: 'foundation-up-capability-registry-v1',
          required: true,
          includesChangedFiles: true,
          includesProof: true,
        },
        forbiddenWork: PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES,
      },
      {
        assignmentId: 'builder-system-control',
        builderId: 'codex-worker-system-control',
        cardId: 'SYSTEM-010',
        branch: 'foundation/system-010-process-control',
        worktreePath: '/Users/bensoncrew/worktrees/system-010-process-control',
        baseCommit: '824aac3',
        currentSprintStage: 'sprint_ready',
        writeScopes: [
          'lib/runtime-process-control.js',
          'scripts/process-runtime-supervisor-check.mjs',
        ],
        sharedFileTouches: [
          {
            path: 'scripts/process-runtime-supervisor-check.mjs',
            owner: 'builder-system-control',
            reportBeforeEdit: true,
            mergeOrder: 'focused-proof-before-merge',
          },
        ],
        proofCommands: [
          'npm run process:runtime-supervisor-check -- --json',
        ],
        mergeHandoff: {
          closeoutKey: 'runtime-supervisor-v1',
          required: true,
          includesChangedFiles: true,
          includesProof: true,
        },
        forbiddenWork: PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES,
      },
    ],
    ...overrides,
  }
}

export function evaluateParallelBuilderWorktreeProtocol(protocol = buildParallelBuilderWorktreeProtocol()) {
  const violations = []
  const assignments = list(protocol.assignments)
  const byWorktree = new Map()

  if (protocol.ownerLayer !== 'Foundation') addViolation(violations, protocol.cardId, 'foundation_owner_required', protocol.ownerLayer || 'missing')
  if (protocol.proposalOnly !== true) addViolation(violations, protocol.cardId, 'proposal_only_required', String(protocol.proposalOnly))
  if (protocol.implementationStarted === true) addViolation(violations, protocol.cardId, 'implementation_started', 'protocol card must not start worker implementation')
  if (protocol.externalWritesStarted === true) addViolation(violations, protocol.cardId, 'external_write_started', 'external writes are not approved')
  if (protocol.liveExtractionStarted === true) addViolation(violations, protocol.cardId, 'live_extraction_started', 'live extraction is not approved')
  if (protocol.providerProbeStarted === true) addViolation(violations, protocol.cardId, 'provider_probe_started', 'provider/model probes are not approved')
  if (!assignments.length) addViolation(violations, protocol.cardId, 'assignment_fixture_required', 'at least one synthetic assignment is required')

  for (const assignment of assignments) {
    const assignmentId = text(assignment.assignmentId)
    const branch = text(assignment.branch)
    const worktreePath = normalizedPath(assignment.worktreePath)
    const writeScopes = list(assignment.writeScopes)
    const proofCommands = list(assignment.proofCommands)
    const sharedTouches = list(assignment.sharedFileTouches)

    if (!assignmentId || !text(assignment.builderId) || !text(assignment.cardId)) {
      addViolation(violations, assignmentId, 'assignment_identity_required', 'assignmentId, builderId, and cardId are required')
    }
    if (!branch || SHARED_BRANCHES.has(branch)) {
      addViolation(violations, assignmentId, 'dedicated_branch_required', branch || 'missing branch')
    }
    if (!worktreePath || worktreePath === normalizedPath(protocol.repoRoot) || !worktreePath.includes('/worktrees/')) {
      addViolation(violations, assignmentId, 'dedicated_worktree_required', worktreePath || 'missing worktree')
    }
    if (byWorktree.has(worktreePath)) {
      addViolation(violations, assignmentId, 'worktree_unique_per_assignment', `${worktreePath} already used by ${byWorktree.get(worktreePath)}`)
    }
    byWorktree.set(worktreePath, assignmentId)
    if (!text(assignment.baseCommit) || text(assignment.baseCommit).length < 7) {
      addViolation(violations, assignmentId, 'base_commit_required', assignment.baseCommit || 'missing')
    }
    if (!['scoping', 'sprint_ready', 'building_now'].includes(text(assignment.currentSprintStage))) {
      addViolation(violations, assignmentId, 'current_sprint_stage_required', assignment.currentSprintStage || 'missing')
    }
    if (!writeScopes.length) addViolation(violations, assignmentId, 'write_scope_required', 'writeScopes is empty')
    if (!proofCommands.length) addViolation(violations, assignmentId, 'focused_proof_required', 'proofCommands is empty')
    if (!assignment.mergeHandoff?.required || !assignment.mergeHandoff?.includesChangedFiles || !assignment.mergeHandoff?.includesProof) {
      addViolation(violations, assignmentId, 'merge_handoff_required', 'closeout, changed files, and proof are required')
    }

    for (const scope of writeScopes) {
      if (hasForbiddenScope(scope)) addViolation(violations, assignmentId, 'forbidden_scope_blocked', scope)
      if (needsSharedFileCoordination(scope) &&
        !sharedTouches.some(touch => normalizedPath(touch.path) === normalizedPath(scope) && touch.reportBeforeEdit === true && text(touch.owner))) {
        addViolation(violations, assignmentId, 'shared_file_touch_requires_coordination', scope)
      }
    }
    for (const touch of sharedTouches) {
      if (!touch.reportBeforeEdit || !text(touch.owner)) {
        addViolation(violations, assignmentId, 'shared_file_touch_requires_coordination', touch.path || 'missing path')
      }
    }
  }

  for (let index = 0; index < assignments.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignments.length; nextIndex += 1) {
      const left = assignments[index]
      const right = assignments[nextIndex]
      if (scopesOverlap(left.writeScopes, right.writeScopes)) {
        addViolation(violations, `${left.assignmentId}+${right.assignmentId}`, 'write_scope_overlap_blocked', `${left.cardId} overlaps ${right.cardId}`)
      }
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: protocol.cardId,
    closeoutKey: protocol.closeoutKey,
    violations,
    summary: {
      assignmentCount: assignments.length,
      violationCount: violations.length,
      sharedTouchCount: assignments.reduce((count, item) => count + list(item.sharedFileTouches).length, 0),
    },
  }
}

export function buildParallelBuilderWorktreeProtocolDogfoodProof() {
  const healthy = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol())
  const sameWorktree = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: buildParallelBuilderWorktreeProtocol().assignments.map(item => ({
      ...item,
      worktreePath: '/Users/bensoncrew/worktrees/collision',
    })),
  }))
  const sharedBranch = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: [
      {
        ...buildParallelBuilderWorktreeProtocol().assignments[0],
        branch: 'foundation/system-health-red-to-green-001',
      },
    ],
  }))
  const overlappingScopes = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: [
      buildParallelBuilderWorktreeProtocol().assignments[0],
      {
        ...buildParallelBuilderWorktreeProtocol().assignments[1],
        writeScopes: ['lib/foundation-capability-registry.js'],
      },
    ],
  }))
  const missingSprint = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: [
      {
        ...buildParallelBuilderWorktreeProtocol().assignments[0],
        currentSprintStage: '',
      },
    ],
  }))
  const uncoordinatedSharedFile = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: [
      {
        ...buildParallelBuilderWorktreeProtocol().assignments[0],
        writeScopes: ['package.json'],
        sharedFileTouches: [],
      },
    ],
  }))
  const forbiddenScope = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    assignments: [
      {
        ...buildParallelBuilderWorktreeProtocol().assignments[0],
        writeScopes: ['public/assets/steve-local-mockup.png'],
      },
    ],
  }))
  const sideEffects = evaluateParallelBuilderWorktreeProtocol(buildParallelBuilderWorktreeProtocol({
    liveExtractionStarted: true,
    providerProbeStarted: true,
    externalWritesStarted: true,
  }))

  return {
    ok: healthy.ok === true &&
      sameWorktree.ok === false &&
      sharedBranch.ok === false &&
      overlappingScopes.ok === false &&
      missingSprint.ok === false &&
      uncoordinatedSharedFile.ok === false &&
      forbiddenScope.ok === false &&
      sideEffects.ok === false,
    invariant: 'Dedicated branches/worktrees with disjoint scopes pass; shared worktrees, shared branches, overlapping scopes, missing Current Sprint coordination, uncoordinated shared files, forbidden local/mockup scopes, and live side effects fail closed.',
    healthy,
    sameWorktreeRejected: sameWorktree.ok === false,
    sharedBranchRejected: sharedBranch.ok === false,
    overlappingScopesRejected: overlappingScopes.ok === false,
    missingSprintRejected: missingSprint.ok === false,
    uncoordinatedSharedFileRejected: uncoordinatedSharedFile.ok === false,
    forbiddenScopeRejected: forbiddenScope.ok === false,
    sideEffectsRejected: sideEffects.ok === false,
  }
}
