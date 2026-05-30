export const PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID = 'PARALLEL-BUILDER-OPERATING-SYSTEM-001'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY = 'parallel-builder-operating-system-v1'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH = 'docs/process/parallel-builder-operating-system-001-plan.md'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH = 'docs/process/parallel-builder-operating-system-001-protocol.md'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH = 'docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH = 'scripts/process-parallel-builder-operating-system-check.mjs'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-parallel-builder-operating-system-closeout.md'
export const PARALLEL_BUILDER_OPERATING_SYSTEM_SPRINT_ID = 'parallel-builder-operating-system-2026-05-18'

export const PARALLEL_BUILDER_OPERATING_SYSTEM_CHANGED_FILES = [
  'lib/parallel-builder-operating-system.js',
  'lib/foundation-process-hardening-verifier.js',
  'scripts/process-parallel-builder-operating-system-check.mjs',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/process/parallel-builder-operating-system-001-plan.md',
  'docs/process/parallel-builder-operating-system-001-protocol.md',
  'docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json',
  'docs/_archive/handoffs/2026-05-18-parallel-builder-operating-system-closeout.md',
  'package.json',
]

export const PARALLEL_BUILDER_OPERATING_SYSTEM_NOT_NEXT = [
  'Do not launch parallel builders during this card.',
  'Do not use hidden subagents as the default workflow.',
  'Do not spawn hidden subagents without explicit Steve approval.',
  'Do not create real worktrees in the focused proof.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No provider/model probe.',
  'No external write.',
  'Do not mutate Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

export const PARALLEL_BUILDER_OPERATING_SYSTEM_PROOF_COMMANDS = [
  'node --check lib/parallel-builder-operating-system.js scripts/process-parallel-builder-operating-system-check.mjs lib/foundation-process-hardening-verifier.js',
  'npm run process:parallel-builder-operating-system-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=PARALLEL-BUILDER-OPERATING-SYSTEM-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json --closeoutKey=parallel-builder-operating-system-v1 --commitRef=HEAD',
]

export const PARALLEL_BUILDER_OPERATING_SYSTEM_STATUS_TABLE = [
  '| Builder | Chat | Repo/Worktree | Branch | Active Card | Owns | Shared Locks | Dirty State | Last Proof | Next Report |',
  '|---|---|---|---|---|---|---|---|---|---|',
  '| Orchestrator | visible | /Users/bensoncrew/bcrew-ai-os | foundation/system-health-red-to-green-001 | queue control | assignments, merge order | package/docs/process when locked | clean | foundation:verify | assignment update |',
  '| Foundation Builder A | visible | /Users/bensoncrew/worktrees/foundation-builder-a | foundation/builder-a-card-id | card id | declared files only | none until granted | clean | focused proof | wrap/blocker |',
  '| Feature/Preflight Builder B | visible | /Users/bensoncrew/worktrees/feature-preflight-builder-b | foundation/builder-b-card-id | card id | declared files only | none until granted | clean | focused proof | wrap/blocker |',
  '| Review/Audit Builder C | visible | /Users/bensoncrew/worktrees/review-audit-builder-c | foundation/builder-c-card-id | card id | read-only or declared docs | none until granted | clean | audit proof | wrap/blocker |',
].join('\n')

export const PARALLEL_BUILDER_OPERATING_SYSTEM_PROMPTS = {
  orchestrator: [
    'Orchestrator chat prompt:',
    'You are the visible Foundation orchestrator. Do not spawn hidden subagents unless Steve explicitly approves that exact use.',
    'Assign each builder one visible chat, one known worktree, one branch, one active card, declared file/module ownership, shared-file locks, proof commands, and a wrap report requirement.',
    'Before assigning work, post the who-owns-what table. Before merge, require clean status, changed files, proof output, shared-file lock release, and closeout/wrap report.',
  ].join('\n'),
  foundationBuilderA: [
    'Foundation Builder A prompt:',
    'Work only in the assigned repo/worktree/branch and only on the assigned Foundation card.',
    'Do not edit files outside the declared ownership list. Request a shared-file lock before touching package.json, docs/process, docs/rebuild, scripts/foundation-verify.mjs, or lib/foundation-* shared surfaces.',
    'Do not spawn hidden subagents. Continue from repo truth after every restart. End with a wrap report that includes dirty state, changed files, commits, proof, blockers, and next action.',
  ].join('\n'),
  featurePreflightBuilderB: [
    'Feature/Preflight Builder B prompt:',
    'Work only in the assigned visible worktree and feature/preflight branch. Stay out of the main Foundation lane unless the orchestrator grants a shared lock.',
    'Preflight, scoped feature prep, or proof-only work is allowed; external side effects, live extraction, paid/auth runs, Drive permission mutation, and Agent Feedback auto-send are not.',
    'Report blockers immediately with the blocker format and stop before touching shared files without coordination.',
  ].join('\n'),
  reviewAuditBuilderC: [
    'Review/Audit Builder C prompt:',
    'Work as a visible review/audit builder in the assigned worktree/branch. Prefer read-only inspection unless the assignment explicitly declares write scopes.',
    'Do not convert findings into fixes unless the card scopes that repair. Do not launch hidden subagents.',
    'Wrap with findings, evidence paths, proof commands, dirty state, and clear next cards.',
  ].join('\n'),
}

const ORCHESTRATION_BRANCH = 'foundation/system-health-red-to-green-001'
const REPO_ROOT = '/Users/bensoncrew/bcrew-ai-os'
const SHARED_ROOT_FILES = new Set(['package.json', 'package-lock.json', 'server.js'])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizedPath(value) {
  return text(value).replace(/\\/g, '/').replace(/\/+$/, '')
}

function addViolation(violations, assignmentId, ruleId, detail = '') {
  violations.push({ assignmentId: assignmentId || 'protocol', ruleId, detail })
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

function isSharedPath(pathValue = '') {
  const path = normalizedPath(pathValue)
  return SHARED_ROOT_FILES.has(path) ||
    path === 'scripts/foundation-verify.mjs' ||
    path === 'lib/foundation-verify-coverage-card-ids.js' ||
    path.startsWith('docs/process/') ||
    path.startsWith('docs/rebuild/') ||
    path.startsWith('lib/foundation-') ||
    path.startsWith('scripts/process-')
}

function getLocksForPath(protocol = {}, assignmentId = '', pathValue = '') {
  const path = normalizedPath(pathValue)
  const protocolLocks = list(protocol.sharedFileLocks)
  const assignment = list(protocol.assignments).find(item => text(item.assignmentId) === text(assignmentId)) || {}
  return [...protocolLocks, ...list(assignment.sharedFileLocks)].filter(lock =>
    pathsOverlap(lock.path, path) &&
      text(lock.owner) === text(assignmentId) &&
      text(lock.coordinationRef) &&
      ['locked', 'granted'].includes(text(lock.status))
  )
}

function buildAssignment({
  assignmentId,
  chatName,
  role,
  branch,
  worktreePath,
  activeCardId,
  fileOwnership,
  mainFoundationLane = false,
  independentBuilder = true,
}) {
  return {
    assignmentId,
    chatName,
    role,
    chatVisibility: 'visible',
    branch,
    worktreePath,
    activeCardId,
    mainFoundationLane,
    independentBuilder,
    fileOwnership,
    sharedFileLocks: [],
    status: 'assigned',
    proofCommands: ['npm run process:card-focused-proof -- --json'],
    dirtyState: {
      status: 'clean',
      wrapReportRef: `${assignmentId}-wrap-report-required`,
    },
  }
}

export function buildParallelBuilderOperatingSystemProtocol(overrides = {}) {
  const protocol = {
    cardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
    closeoutKey: PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
    protocolVersion: 1,
    ownerLayer: 'Foundation Process',
    repoRoot: REPO_ROOT,
    orchestrationBranch: ORCHESTRATION_BRANCH,
    proposalOnly: true,
    parallelBuildersLaunched: false,
    externalWritesStarted: false,
    liveExtractionStarted: false,
    providerProbeStarted: false,
    hiddenSubagentPolicy: {
      defaultAllowed: false,
      explicitApprovalRequired: true,
      allowedOnlyFor: 'bounded sidecar work with Steve approval recorded in assignment',
    },
    hiddenSubagentSpawns: [],
    sharedFileLocks: [
      {
        path: PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH,
        owner: 'orchestrator',
        status: 'locked',
        coordinationRef: 'parallel-builder-operating-system-card-self-lock',
      },
    ],
    assignments: [
      buildAssignment({
        assignmentId: 'orchestrator',
        chatName: 'Orchestrator Chat',
        role: 'Orchestrator',
        branch: ORCHESTRATION_BRANCH,
        worktreePath: REPO_ROOT,
        activeCardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
        fileOwnership: [
          PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH,
          PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH,
        ],
        mainFoundationLane: true,
        independentBuilder: false,
      }),
      buildAssignment({
        assignmentId: 'foundation-builder-a',
        chatName: 'Foundation Builder A',
        role: 'Foundation Builder',
        branch: 'foundation/builder-a-card-id',
        worktreePath: '/Users/bensoncrew/worktrees/foundation-builder-a',
        activeCardId: 'FOUNDATION-NEXT-CARD-001',
        fileOwnership: [
          'lib/foundation-builder-a-owned/',
          'scripts/process-foundation-builder-a-owned-check.mjs',
        ],
      }),
      buildAssignment({
        assignmentId: 'feature-preflight-builder-b',
        chatName: 'Feature/Preflight Builder B',
        role: 'Feature/Preflight Builder',
        branch: 'foundation/feature-preflight-builder-b-card-id',
        worktreePath: '/Users/bensoncrew/worktrees/feature-preflight-builder-b',
        activeCardId: 'FEATURE-PREFLIGHT-NEXT-CARD-001',
        fileOwnership: [
          'docs/preflight/feature-builder-b/',
          'scripts/process-feature-builder-b-preflight-check.mjs',
        ],
      }),
      buildAssignment({
        assignmentId: 'review-audit-builder-c',
        chatName: 'Review/Audit Builder C',
        role: 'Review/Audit Builder',
        branch: 'foundation/review-audit-builder-c-card-id',
        worktreePath: '/Users/bensoncrew/worktrees/review-audit-builder-c',
        activeCardId: 'REVIEW-AUDIT-NEXT-CARD-001',
        fileOwnership: [
          'docs/audits/review-builder-c/',
          'docs/handoffs/review-builder-c/',
        ],
      }),
    ],
    commitRequests: [
      {
        assignmentId: 'orchestrator',
        branch: ORCHESTRATION_BRANCH,
        changedFiles: [PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH],
        coordinationRef: 'parallel-builder-operating-system-card-self-lock',
        wrapReportRef: 'orchestrator-wrap-report-required',
      },
    ],
    reports: {
      statusTable: PARALLEL_BUILDER_OPERATING_SYSTEM_STATUS_TABLE,
      requiredPrompts: PARALLEL_BUILDER_OPERATING_SYSTEM_PROMPTS,
      wrapReportFields: ['builder', 'worktree', 'branch', 'card', 'dirtyState', 'changedFiles', 'commits', 'proof', 'blockers', 'nextAction'],
      blockerReportFields: ['builder', 'card', 'blocker', 'attempted', 'neededDecision', 'safeNextCard'],
      assignmentFields: ['builder', 'chat', 'worktree', 'branch', 'card', 'fileOwnership', 'sharedLocks', 'proof', 'notNext'],
    },
  }
  return { ...protocol, ...overrides }
}

export function evaluateParallelBuilderOperatingSystem(protocol = buildParallelBuilderOperatingSystemProtocol()) {
  const violations = []
  const assignments = list(protocol.assignments)
  const byWorktree = new Map()
  const byBranch = new Map()

  if (protocol.ownerLayer !== 'Foundation Process') addViolation(violations, protocol.cardId, 'foundation_process_owner_required', protocol.ownerLayer || 'missing')
  if (protocol.proposalOnly !== true) addViolation(violations, protocol.cardId, 'proposal_only_required', String(protocol.proposalOnly))
  if (protocol.parallelBuildersLaunched === true) addViolation(violations, protocol.cardId, 'parallel_builder_launch_not_allowed_in_card', 'this card must not launch builders')
  if (protocol.externalWritesStarted === true) addViolation(violations, protocol.cardId, 'external_write_started', 'external writes are not approved')
  if (protocol.liveExtractionStarted === true) addViolation(violations, protocol.cardId, 'live_extraction_started', 'live extraction is not approved')
  if (protocol.providerProbeStarted === true) addViolation(violations, protocol.cardId, 'provider_probe_started', 'provider/model probes are not approved')
  if (protocol.hiddenSubagentPolicy?.defaultAllowed !== false || protocol.hiddenSubagentPolicy?.explicitApprovalRequired !== true) {
    addViolation(violations, protocol.cardId, 'hidden_subagents_forbidden_by_default', 'hidden subagents need explicit approval')
  }
  if (!assignments.length) addViolation(violations, protocol.cardId, 'visible_assignment_required', 'at least one visible builder assignment is required')

  for (const spawn of list(protocol.hiddenSubagentSpawns)) {
    if (spawn.explicitApproval !== true || !text(spawn.approvalRef)) {
      addViolation(violations, spawn.assignmentId, 'hidden_subagent_requires_explicit_approval', spawn.reason || 'missing approval')
    }
  }

  for (const assignment of assignments) {
    const assignmentId = text(assignment.assignmentId)
    const branch = text(assignment.branch)
    const worktreePath = normalizedPath(assignment.worktreePath)
    const isMainFoundationLane = assignment.mainFoundationLane === true
    const isIndependent = assignment.independentBuilder !== false

    if (!assignmentId || !text(assignment.chatName) || !text(assignment.activeCardId)) {
      addViolation(violations, assignmentId, 'assignment_identity_required', 'assignmentId, chatName, and activeCardId are required')
    }
    if (assignment.chatVisibility !== 'visible') {
      addViolation(violations, assignmentId, 'visible_chat_required', assignment.chatVisibility || 'missing visibility')
    }
    if (!branch) addViolation(violations, assignmentId, 'branch_required', 'missing branch')
    if (branch === protocol.orchestrationBranch && (isIndependent || !isMainFoundationLane)) {
      addViolation(violations, assignmentId, 'main_foundation_branch_requires_orchestrator', branch)
    }
    if (!worktreePath || (!isMainFoundationLane && !worktreePath.includes('/worktrees/'))) {
      addViolation(violations, assignmentId, 'dedicated_worktree_required', worktreePath || 'missing worktree')
    }
    if (byWorktree.has(worktreePath)) {
      addViolation(violations, assignmentId, 'same_worktree_blocked', `${worktreePath} already used by ${byWorktree.get(worktreePath)}`)
    }
    byWorktree.set(worktreePath, assignmentId)
    if (byBranch.has(branch)) {
      const previous = byBranch.get(branch)
      if (isIndependent || previous.independentBuilder !== false) {
        addViolation(violations, assignmentId, 'same_branch_blocked', `${branch} already used by ${previous.assignmentId}`)
      }
    }
    byBranch.set(branch, { assignmentId, independentBuilder: isIndependent })
    if (!list(assignment.fileOwnership).length) {
      addViolation(violations, assignmentId, 'file_ownership_required', 'fileOwnership is empty')
    }
    if (!list(assignment.proofCommands).length) {
      addViolation(violations, assignmentId, 'focused_proof_required', 'proofCommands is empty')
    }
    if (assignment.dirtyState?.status !== 'clean' && !text(assignment.dirtyState?.wrapReportRef)) {
      addViolation(violations, assignmentId, 'dirty_state_requires_wrap_report', assignment.dirtyState?.status || 'dirty')
    }
  }

  for (let index = 0; index < assignments.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignments.length; nextIndex += 1) {
      const left = assignments[index]
      const right = assignments[nextIndex]
      if (scopesOverlap(left.fileOwnership, right.fileOwnership)) {
        addViolation(violations, `${left.assignmentId}+${right.assignmentId}`, 'overlapping_file_ownership_blocked', `${left.activeCardId} overlaps ${right.activeCardId}`)
      }
    }
  }

  for (const request of list(protocol.commitRequests)) {
    const assignmentId = text(request.assignmentId)
    for (const changedFile of list(request.changedFiles)) {
      if (isSharedPath(changedFile) && (!text(request.coordinationRef) || getLocksForPath(protocol, assignmentId, changedFile).length === 0)) {
        addViolation(violations, assignmentId, 'shared_file_commit_requires_coordination', changedFile)
      }
    }
    if (!text(request.wrapReportRef)) {
      addViolation(violations, assignmentId, 'commit_requires_wrap_report', 'missing wrapReportRef')
    }
  }

  const prompts = protocol.reports?.requiredPrompts || {}
  for (const key of ['orchestrator', 'foundationBuilderA', 'featurePreflightBuilderB', 'reviewAuditBuilderC']) {
    if (!text(prompts[key])) addViolation(violations, protocol.cardId, 'paste_ready_prompt_required', key)
  }
  if (!text(protocol.reports?.statusTable).includes('| Builder | Chat | Repo/Worktree | Branch | Active Card |')) {
    addViolation(violations, protocol.cardId, 'ownership_status_table_required', 'missing table header')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: protocol.cardId,
    closeoutKey: protocol.closeoutKey,
    violations,
    summary: {
      assignmentCount: assignments.length,
      visibleAssignmentCount: assignments.filter(item => item.chatVisibility === 'visible').length,
      sharedLockCount: list(protocol.sharedFileLocks).length + assignments.reduce((count, item) => count + list(item.sharedFileLocks).length, 0),
      violationCount: violations.length,
    },
  }
}

export function buildParallelBuilderOperatingSystemDogfoodProof() {
  const base = buildParallelBuilderOperatingSystemProtocol()
  const healthy = evaluateParallelBuilderOperatingSystem(base)
  const sameWorktree = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    assignments: base.assignments.map(item => item.assignmentId === 'orchestrator' ? item : {
      ...item,
      worktreePath: '/Users/bensoncrew/worktrees/collision',
    }),
  }))
  const sameBranch = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    assignments: base.assignments.map(item => ['foundation-builder-a', 'feature-preflight-builder-b'].includes(item.assignmentId) ? {
      ...item,
      branch: 'foundation/collision-branch',
    } : item),
  }))
  const overlappingOwnership = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    assignments: base.assignments.map(item => item.assignmentId === 'feature-preflight-builder-b' ? {
      ...item,
      fileOwnership: ['lib/foundation-builder-a-owned/'],
    } : item),
  }))
  const hiddenSubagent = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    hiddenSubagentSpawns: [
      {
        assignmentId: 'orchestrator',
        reason: 'delegated builder run',
        explicitApproval: false,
      },
    ],
  }))
  const uncoordinatedSharedCommit = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    commitRequests: [
      {
        assignmentId: 'foundation-builder-a',
        branch: 'foundation/builder-a-card-id',
        changedFiles: ['package.json'],
        coordinationRef: '',
        wrapReportRef: 'builder-a-wrap',
      },
    ],
  }))
  const dirtyNoWrap = evaluateParallelBuilderOperatingSystem(buildParallelBuilderOperatingSystemProtocol({
    assignments: base.assignments.map(item => item.assignmentId === 'foundation-builder-a' ? {
      ...item,
      dirtyState: {
        status: 'dirty',
        wrapReportRef: '',
      },
    } : item),
  }))

  return {
    ok: healthy.ok === true &&
      sameWorktree.ok === false &&
      sameBranch.ok === false &&
      overlappingOwnership.ok === false &&
      hiddenSubagent.ok === false &&
      uncoordinatedSharedCommit.ok === false &&
      dirtyNoWrap.ok === false,
    invariant: 'Visible assignments pass; shared worktree, shared branch, overlapping ownership, hidden subagent without approval, uncoordinated shared-file commit, and dirty state without wrap report fail closed.',
    healthy,
    sameWorktreeRejected: sameWorktree.ok === false,
    sameBranchRejected: sameBranch.ok === false,
    overlappingOwnershipRejected: overlappingOwnership.ok === false,
    hiddenSubagentRejected: hiddenSubagent.ok === false,
    uncoordinatedSharedCommitRejected: uncoordinatedSharedCommit.ok === false,
    dirtyNoWrapRejected: dirtyNoWrap.ok === false,
  }
}
