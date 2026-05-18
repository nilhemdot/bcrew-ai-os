export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID = 'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY = 'extraction-parallel-worker-protocol-v1'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH = 'docs/process/extraction-parallel-worker-protocol-001-plan.md'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH = 'docs/process/extraction-parallel-worker-protocol-001-protocol.md'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH = 'docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_SCRIPT_PATH = 'scripts/process-extraction-parallel-worker-protocol-check.mjs'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-extraction-parallel-worker-protocol-closeout.md'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_SPRINT_ID = 'extraction-parallel-worker-protocol-2026-05-18'
export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID = 'MYICOR-EXTRACTION-PREFLIGHT-001'

export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_CHANGED_FILES = [
  'lib/extraction-parallel-worker-protocol.js',
  'scripts/process-extraction-parallel-worker-protocol-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PLAN_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROTOCOL_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_APPROVAL_PATH,
  EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_PROOF_COMMANDS = [
  'node --check lib/extraction-parallel-worker-protocol.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-parallel-worker-protocol-check.mjs scripts/foundation-verify.mjs',
  'npm run process:extraction-parallel-worker-protocol-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --closeoutKey=extraction-parallel-worker-protocol-v1',
  'npm run process:foundation-ship -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --commitRef=HEAD',
]

export const EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES = [
  'No live extraction workers are launched by this card.',
  'No public web lookup, YouTube API call, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, or model call.',
  'No private, paid, community, course, Skool, MyICOR, Loom, or authorized-browser access.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, backlog mutation, vector write, or query-index write.',
  'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'No Drive permissions mutation or Drive request-access email.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
  'No hidden subagents or invisible extraction workers.',
]

const REQUIRED_QUALITY_GATES = [
  'source_packet_present',
  'permission_class_checked',
  'artifact_envelope_schema',
  'extraction_to_kb_atom_pipeline',
  'no_direct_downstream_write',
  'wrap_report_required',
]

const REQUIRED_WRAP_FIELDS = [
  'worker',
  'sourcePacketId',
  'branch',
  'worktree',
  'artifactManifest',
  'permissionClass',
  'filesProduced',
  'qualityGate',
  'downstreamWrites',
  'dirtyState',
  'proof',
  'blockers',
  'nextAction',
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
  return path === 'package.json' ||
    path === 'package-lock.json' ||
    path === 'server.js' ||
    path === 'scripts/foundation-verify.mjs' ||
    path.startsWith('docs/process/') ||
    path.startsWith('docs/rebuild/') ||
    path.startsWith('lib/foundation-') ||
    path.startsWith('scripts/process-')
}

function isPrivateOrPaid(assignment = {}) {
  const value = `${assignment.permissionClass || ''} ${assignment.privacyTier || ''} ${assignment.sourceType || ''}`
  return /private|paid|skool|myicor|loom|course|authorized|owner_private/i.test(value)
}

function hasLock(protocol = {}, assignmentId = '', pathValue = '') {
  const locks = [...list(protocol.sharedFileLocks), ...list(
    list(protocol.assignments).find(item => text(item.workerId) === text(assignmentId))?.sharedFileLocks,
  )]
  return locks.some(lock =>
    text(lock.owner) === text(assignmentId) &&
      text(lock.coordinationRef) &&
      ['locked', 'granted'].includes(text(lock.status)) &&
      pathsOverlap(lock.path, pathValue)
  )
}

function downstreamWriteCount(writes = {}) {
  return Object.values(writes || {}).filter(value => value === true).length
}

function sideEffectCount(assignment = {}) {
  return [
    'workerLaunched',
    'liveExtractionStarted',
    'sourceCrawlStarted',
    'transcriptFetchStarted',
    'screenshotCaptureStarted',
    'keyframeCaptureStarted',
    'downloadStarted',
    'modelCallsStarted',
    'externalWritesStarted',
  ].filter(field => assignment[field] === true).length
}

export function buildExtractionWorkerAssignment(overrides = {}) {
  const workerId = overrides.workerId || 'extract-worker-public-youtube-a'
  return {
    workerId,
    visibleChat: overrides.visibleChat || 'Visible Extraction Worker A',
    chatVisibility: 'visible',
    worktreePath: overrides.worktreePath || `/Users/bensoncrew/worktrees/${workerId}`,
    branch: overrides.branch || `foundation/${workerId}`,
    sourcePacketId: overrides.sourcePacketId || 'source-packet:SRC-YOUTUBE-INTEL-001:mark-kashef-public-youtube',
    queueItemId: overrides.queueItemId || 'youtube-build-intel:mark-kashef:last-20-public-videos',
    sourceId: overrides.sourceId || 'SRC-YOUTUBE-INTEL-001',
    sourceType: overrides.sourceType || 'public_youtube_channel',
    sourceUrl: overrides.sourceUrl || 'https://www.youtube.com/@MarkKashef',
    permissionClass: overrides.permissionClass || 'public_no_auth_metadata_packet',
    privacyTier: overrides.privacyTier || 'public',
    sourceApprovalRef: overrides.sourceApprovalRef || null,
    executionMode: overrides.executionMode || 'protocol_only',
    artifactRoot: overrides.artifactRoot || `artifacts/extraction/${workerId}`,
    artifactManifestPath: overrides.artifactManifestPath || `artifacts/extraction/${workerId}/artifact-manifest.json`,
    fileOwnership: overrides.fileOwnership || [
      `artifacts/extraction/${workerId}/`,
      `docs/handoffs/extraction-worker-wraps/${workerId}.md`,
    ],
    sharedFileLocks: overrides.sharedFileLocks || [],
    qualityGates: overrides.qualityGates || [...REQUIRED_QUALITY_GATES],
    wrapReportFields: overrides.wrapReportFields || [...REQUIRED_WRAP_FIELDS],
    stopConditions: overrides.stopConditions || [
      'source packet missing or stale',
      'permission class is private, paid, course, Skool, MyICOR, Loom, or authorized-browser without explicit source approval',
      'artifact envelope fails validation',
      'quality gate fails',
      'worker needs shared-file write',
      'worker would start external write or downstream persistence',
    ],
    downstreamWrites: overrides.downstreamWrites || {
      researchInbox: false,
      kbPage: false,
      atom: false,
      synthesisFact: false,
      actionRoute: false,
      vectorIndex: false,
      backlog: false,
      externalSystem: false,
    },
    workerLaunched: false,
    liveExtractionStarted: false,
    sourceCrawlStarted: false,
    transcriptFetchStarted: false,
    screenshotCaptureStarted: false,
    keyframeCaptureStarted: false,
    downloadStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    ...overrides,
  }
}

export function buildExtractionParallelWorkerProtocol(overrides = {}) {
  return {
    cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
    closeoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
    protocolVersion: 1,
    proposalOnly: true,
    noPrivateSourceDefault: true,
    liveExtractionApprovedByThisCard: false,
    extractionWorkersLaunched: false,
    hiddenSubagentSpawns: [],
    sharedFileLocks: [],
    qualityGateNames: [...REQUIRED_QUALITY_GATES],
    importFlow: [
      'worker posts wrap report and artifact manifest path',
      'orchestrator verifies source packet, permission class, artifact envelope, and no-write flags',
      'artifact envelope routes through EXTRACTION-TO-KB-ATOM-PIPELINE-001 before any KB/atom/action candidate can persist',
      'approval-bound/private packets stop at preflight until source-specific approval exists',
    ],
    statusReportFields: ['worker', 'sourcePacketId', 'branch', 'worktree', 'permissionClass', 'currentStep', 'artifactManifest', 'dirtyState', 'proof', 'blockers'],
    assignmentPrompt: [
      'Visible extraction worker prompt:',
      'Work only in the assigned chat, worktree, branch, source packet, and artifact path.',
      'Do not fetch transcripts, crawl, download, screenshot, capture keyframes, call models, use private auth, or write downstream systems unless the assignment carries explicit runtime approval.',
      'Stop and report if the source packet, permission class, artifact envelope, quality gate, wrap report, or dirty state is unclear.',
    ].join('\n'),
    assignments: [
      buildExtractionWorkerAssignment(),
      buildExtractionWorkerAssignment({
        workerId: 'extract-worker-public-youtube-b',
        visibleChat: 'Visible Extraction Worker B',
        branch: 'foundation/extract-worker-public-youtube-b',
        sourcePacketId: 'source-packet:SRC-YOUTUBE-INTEL-001:matt-pocock-public-youtube',
        queueItemId: 'youtube-build-intel:matt-pocock:last-20-public-videos',
        sourceUrl: 'https://www.youtube.com/@mattpocockuk',
        artifactRoot: 'artifacts/extraction/extract-worker-public-youtube-b',
        artifactManifestPath: 'artifacts/extraction/extract-worker-public-youtube-b/artifact-manifest.json',
        fileOwnership: [
          'artifacts/extraction/extract-worker-public-youtube-b/',
          'docs/handoffs/extraction-worker-wraps/extract-worker-public-youtube-b.md',
        ],
      }),
    ],
    commitRequests: [],
    notNextBoundaries: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NOT_NEXT_BOUNDARIES,
    recommendedNext: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
    ...overrides,
  }
}

export function evaluateExtractionParallelWorkerProtocol(protocol = buildExtractionParallelWorkerProtocol()) {
  const violations = []
  const assignments = list(protocol.assignments)
  const byWorktree = new Map()
  const byBranch = new Map()
  const bySourcePacket = new Map()
  const byArtifactRoot = new Map()

  if (protocol.proposalOnly !== true) addViolation(violations, protocol.cardId, 'proposal_only_required', String(protocol.proposalOnly))
  if (protocol.noPrivateSourceDefault !== true) addViolation(violations, protocol.cardId, 'no_private_source_default_required', String(protocol.noPrivateSourceDefault))
  if (protocol.liveExtractionApprovedByThisCard !== false) addViolation(violations, protocol.cardId, 'live_extraction_approval_not_allowed', String(protocol.liveExtractionApprovedByThisCard))
  if (protocol.extractionWorkersLaunched === true) addViolation(violations, protocol.cardId, 'workers_not_launched_by_protocol_card', 'this card is protocol/proof only')
  if (!assignments.length) addViolation(violations, protocol.cardId, 'worker_assignments_required', 'at least one visible worker assignment is required')

  for (const spawn of list(protocol.hiddenSubagentSpawns)) {
    if (spawn.explicitApproval !== true || !text(spawn.approvalRef)) {
      addViolation(violations, spawn.workerId, 'hidden_subagent_requires_explicit_approval', spawn.reason || 'missing approval')
    }
  }

  for (const assignment of assignments) {
    const workerId = text(assignment.workerId)
    const worktree = normalizedPath(assignment.worktreePath)
    const branch = text(assignment.branch)
    const sourcePacketId = text(assignment.sourcePacketId)
    const artifactRoot = normalizedPath(assignment.artifactRoot)
    const artifactManifestPath = normalizedPath(assignment.artifactManifestPath)

    if (!workerId || !text(assignment.visibleChat)) addViolation(violations, workerId, 'worker_identity_required', 'workerId and visibleChat are required')
    if (assignment.chatVisibility !== 'visible') addViolation(violations, workerId, 'visible_worker_chat_required', assignment.chatVisibility || 'missing')
    if (!worktree || !worktree.includes('/worktrees/')) addViolation(violations, workerId, 'dedicated_worktree_required', worktree || 'missing')
    if (!branch || branch === 'foundation/system-health-red-to-green-001') addViolation(violations, workerId, 'dedicated_branch_required', branch || 'missing')
    if (!sourcePacketId || !text(assignment.sourceId) || !text(assignment.queueItemId)) addViolation(violations, workerId, 'source_packet_ownership_required', sourcePacketId || 'missing')
    if (!/^https?:\/\//.test(text(assignment.sourceUrl)) && !text(assignment.sourceUrl).startsWith('artifact://')) addViolation(violations, workerId, 'source_ref_required', text(assignment.sourceUrl) || 'missing')
    if (!text(assignment.permissionClass) || !text(assignment.privacyTier)) addViolation(violations, workerId, 'permission_class_required', `${assignment.permissionClass || 'missing'} / ${assignment.privacyTier || 'missing'}`)
    if (isPrivateOrPaid(assignment) && !text(assignment.sourceApprovalRef)) addViolation(violations, workerId, 'private_or_paid_source_requires_approval', assignment.permissionClass || assignment.privacyTier || 'private')
    if (assignment.executionMode !== 'protocol_only') addViolation(violations, workerId, 'execution_mode_must_be_protocol_only', assignment.executionMode || 'missing')
    if (!artifactRoot || !artifactManifestPath || !pathsOverlap(artifactManifestPath, artifactRoot)) addViolation(violations, workerId, 'artifact_manifest_under_owned_root_required', artifactManifestPath || 'missing')
    if (!list(assignment.fileOwnership).length || !list(assignment.fileOwnership).some(pathValue => pathsOverlap(pathValue, artifactRoot))) addViolation(violations, workerId, 'artifact_path_ownership_required', artifactRoot || 'missing')
    if (!REQUIRED_QUALITY_GATES.every(gate => list(assignment.qualityGates).includes(gate))) addViolation(violations, workerId, 'quality_gates_required', list(assignment.qualityGates).join(', ') || 'missing')
    if (!REQUIRED_WRAP_FIELDS.every(field => list(assignment.wrapReportFields).includes(field))) addViolation(violations, workerId, 'wrap_report_fields_required', list(assignment.wrapReportFields).join(', ') || 'missing')
    if (!list(assignment.stopConditions).length) addViolation(violations, workerId, 'stop_conditions_required', 'missing')
    if (sideEffectCount(assignment) > 0) addViolation(violations, workerId, 'live_side_effect_started', `${sideEffectCount(assignment)} side effect(s)`)
    if (downstreamWriteCount(assignment.downstreamWrites) > 0) addViolation(violations, workerId, 'downstream_write_started', `${downstreamWriteCount(assignment.downstreamWrites)} write(s)`)

    if (byWorktree.has(worktree)) addViolation(violations, workerId, 'same_worktree_blocked', `${worktree} already used by ${byWorktree.get(worktree)}`)
    byWorktree.set(worktree, workerId)
    if (byBranch.has(branch)) addViolation(violations, workerId, 'same_branch_blocked', `${branch} already used by ${byBranch.get(branch)}`)
    byBranch.set(branch, workerId)
    if (bySourcePacket.has(sourcePacketId)) addViolation(violations, workerId, 'same_source_packet_blocked', `${sourcePacketId} already used by ${bySourcePacket.get(sourcePacketId)}`)
    bySourcePacket.set(sourcePacketId, workerId)
    if (byArtifactRoot.has(artifactRoot)) addViolation(violations, workerId, 'same_artifact_root_blocked', `${artifactRoot} already used by ${byArtifactRoot.get(artifactRoot)}`)
    byArtifactRoot.set(artifactRoot, workerId)
  }

  for (let index = 0; index < assignments.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignments.length; nextIndex += 1) {
      const left = assignments[index]
      const right = assignments[nextIndex]
      if (scopesOverlap(left.fileOwnership, right.fileOwnership)) {
        addViolation(violations, `${left.workerId}+${right.workerId}`, 'overlapping_file_ownership_blocked', `${left.workerId} overlaps ${right.workerId}`)
      }
    }
  }

  for (const request of list(protocol.commitRequests)) {
    for (const changedFile of list(request.changedFiles)) {
      if (isSharedPath(changedFile) && !hasLock(protocol, request.workerId, changedFile)) {
        addViolation(violations, request.workerId, 'shared_file_commit_requires_lock', changedFile)
      }
    }
    if (!text(request.wrapReportRef)) addViolation(violations, request.workerId, 'commit_requires_wrap_report', 'missing wrapReportRef')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    violations,
    summary: {
      workerAssignmentCount: assignments.length,
      visibleWorkerCount: assignments.filter(assignment => assignment.chatVisibility === 'visible').length,
      uniqueSourcePacketCount: bySourcePacket.size,
      uniqueArtifactRootCount: byArtifactRoot.size,
      privateOrPaidAssignmentCount: assignments.filter(isPrivateOrPaid).length,
      launchedWorkerCount: assignments.filter(assignment => assignment.workerLaunched === true || assignment.liveExtractionStarted === true).length,
      downstreamWriteCount: assignments.reduce((sum, assignment) => sum + downstreamWriteCount(assignment.downstreamWrites), 0),
    },
  }
}

export function buildExtractionParallelWorkerProtocolDogfoodProof() {
  const healthy = evaluateExtractionParallelWorkerProtocol()
  const duplicateSourcePacket = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [
      buildExtractionWorkerAssignment({ workerId: 'worker-a', sourcePacketId: 'source-packet:duplicate', artifactRoot: 'artifacts/extraction/worker-a', artifactManifestPath: 'artifacts/extraction/worker-a/artifact-manifest.json' }),
      buildExtractionWorkerAssignment({ workerId: 'worker-b', sourcePacketId: 'source-packet:duplicate', artifactRoot: 'artifacts/extraction/worker-b', artifactManifestPath: 'artifacts/extraction/worker-b/artifact-manifest.json' }),
    ],
  }))
  const artifactPathOverlap = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [
      buildExtractionWorkerAssignment({ workerId: 'worker-a', artifactRoot: 'artifacts/extraction/shared', artifactManifestPath: 'artifacts/extraction/shared/artifact-manifest.json' }),
      buildExtractionWorkerAssignment({ workerId: 'worker-b', artifactRoot: 'artifacts/extraction/shared/nested', artifactManifestPath: 'artifacts/extraction/shared/nested/artifact-manifest.json' }),
    ],
  }))
  const privateWithoutApproval = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [buildExtractionWorkerAssignment({ permissionClass: 'private_course_auth_required', privacyTier: 'owner_private', sourceApprovalRef: '' })],
  }))
  const workerLaunch = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    extractionWorkersLaunched: true,
    assignments: [buildExtractionWorkerAssignment({ workerLaunched: true, liveExtractionStarted: true })],
  }))
  const missingQualityGate = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [buildExtractionWorkerAssignment({ qualityGates: REQUIRED_QUALITY_GATES.filter(gate => gate !== 'extraction_to_kb_atom_pipeline') })],
  }))
  const missingWrapReport = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [buildExtractionWorkerAssignment({ wrapReportFields: REQUIRED_WRAP_FIELDS.filter(field => field !== 'dirtyState') })],
  }))
  const directWrite = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    assignments: [buildExtractionWorkerAssignment({ downstreamWrites: { kbPage: true, atom: true, externalSystem: true } })],
  }))
  const hiddenSubagent = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    hiddenSubagentSpawns: [{ workerId: 'worker-a', reason: 'speed', explicitApproval: false }],
  }))
  const sharedFileNoLock = evaluateExtractionParallelWorkerProtocol(buildExtractionParallelWorkerProtocol({
    commitRequests: [{ workerId: 'extract-worker-public-youtube-a', changedFiles: ['package.json'], wrapReportRef: 'wrap-present' }],
  }))
  const rejectedCases = {
    duplicateSourcePacket: duplicateSourcePacket.ok === false,
    artifactPathOverlap: artifactPathOverlap.ok === false,
    privateWithoutApproval: privateWithoutApproval.ok === false,
    workerLaunch: workerLaunch.ok === false,
    missingQualityGate: missingQualityGate.ok === false,
    missingWrapReport: missingWrapReport.ok === false,
    directWrite: directWrite.ok === false,
    hiddenSubagent: hiddenSubagent.ok === false,
    sharedFileNoLock: sharedFileNoLock.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    healthy,
    rejectedCases,
    invariant: 'Parallel extraction workers require visible chats, dedicated worktrees/branches, unique source packets, unique artifact paths, quality gates, wrap reports, and no live extraction or downstream writes.',
  }
}

export function buildExtractionParallelWorkerProtocolSnapshot(input = {}) {
  const protocol = input.protocol || buildExtractionParallelWorkerProtocol()
  const evaluation = evaluateExtractionParallelWorkerProtocol(protocol)
  const dogfood = buildExtractionParallelWorkerProtocolDogfoodProof()
  return {
    cardId: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID,
    closeoutKey: EXTRACTION_PARALLEL_WORKER_PROTOCOL_CLOSEOUT_KEY,
    status: evaluation.status,
    ok: evaluation.ok === true,
    proposalOnly: protocol.proposalOnly === true,
    liveExtractionApprovedByThisCard: protocol.liveExtractionApprovedByThisCard === true,
    extractionWorkersLaunched: protocol.extractionWorkersLaunched === true,
    hiddenSubagentsAllowedByDefault: false,
    evaluation,
    dogfood,
    assignmentPrompt: protocol.assignmentPrompt,
    importFlow: protocol.importFlow,
    notNextBoundaries: protocol.notNextBoundaries,
    recommendedNext: EXTRACTION_PARALLEL_WORKER_PROTOCOL_NEXT_CARD_ID,
    summary: evaluation.summary,
  }
}

export function renderExtractionParallelWorkerProtocolReport(snapshot = buildExtractionParallelWorkerProtocolSnapshot()) {
  const lines = []
  lines.push(`# ${EXTRACTION_PARALLEL_WORKER_PROTOCOL_CARD_ID}`)
  lines.push('')
  lines.push(`Status: ${snapshot.status}`)
  lines.push(`Worker assignments: ${snapshot.summary.workerAssignmentCount}`)
  lines.push(`Visible workers: ${snapshot.summary.visibleWorkerCount}`)
  lines.push(`Unique source packets: ${snapshot.summary.uniqueSourcePacketCount}`)
  lines.push(`Unique artifact roots: ${snapshot.summary.uniqueArtifactRootCount}`)
  lines.push(`Workers launched by this card: ${snapshot.extractionWorkersLaunched}`)
  lines.push(`Live extraction approved by this card: ${snapshot.liveExtractionApprovedByThisCard}`)
  lines.push('')
  lines.push('## Dogfood')
  lines.push('')
  for (const [key, value] of Object.entries(snapshot.dogfood.rejectedCases || {})) {
    lines.push(`- ${key}: ${value ? 'rejected' : 'not rejected'}`)
  }
  return lines.join('\n')
}
