import {
  buildCourseSourceAuthBoundaryDogfoodProof,
  buildCourseSourceAuthBoundarySnapshot,
} from './course-source-auth-boundary.js'
import {
  buildExtractionParallelWorkerProtocol,
  buildExtractionParallelWorkerProtocolDogfoodProof,
  buildExtractionParallelWorkerProtocolSnapshot,
  buildExtractionWorkerAssignment,
} from './extraction-parallel-worker-protocol.js'
import {
  buildExtractionRuntimeReadinessDogfoodProof,
  buildExtractionRuntimeReadinessSnapshot,
} from './extraction-runtime-readiness.js'
import {
  buildExtractionToKbAtomPipelineDogfoodProof,
  buildExtractionToKbAtomPipelineSnapshot,
} from './extraction-to-kb-atom-pipeline.js'
import {
  buildMarkMSkoolExtractionPreflightDogfoodProof,
  buildMarkMSkoolExtractionPreflightSnapshot,
} from './mark-m-skool-extraction-preflight.js'
import {
  buildMyicorExtractionPreflightDogfoodProof,
  buildMyicorExtractionPreflightSnapshot,
} from './myicor-extraction-preflight.js'
import {
  buildYoutubeBuildIntelBatchDogfoodProof,
  buildYoutubeBuildIntelBatchSnapshot,
} from './youtube-build-intel-batch.js'

export const EXTRACTION_TEAM_RUNTIME_CARD_ID = 'EXTRACTION-TEAM-001'
export const EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY = 'extraction-team-runtime-v1'
export const EXTRACTION_TEAM_RUNTIME_PLAN_PATH = 'docs/process/extraction-team-runtime-001-plan.md'
export const EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH = 'docs/process/approvals/EXTRACTION-TEAM-001.json'
export const EXTRACTION_TEAM_RUNTIME_SCRIPT_PATH = 'scripts/process-extraction-team-runtime-check.mjs'
export const EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-extraction-team-runtime-closeout.md'
export const EXTRACTION_TEAM_RUNTIME_SPRINT_ID = 'extraction-team-runtime-2026-05-18'
export const EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID = 'FOUNDATION-UP-CAPABILITY-REGISTRY-001'

export const EXTRACTION_TEAM_RUNTIME_CHANGED_FILES = [
  'lib/extraction-team-runtime.js',
  'scripts/process-extraction-team-runtime-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-recent-builds-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  EXTRACTION_TEAM_RUNTIME_PLAN_PATH,
  EXTRACTION_TEAM_RUNTIME_APPROVAL_PATH,
  EXTRACTION_TEAM_RUNTIME_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const EXTRACTION_TEAM_RUNTIME_PROOF_COMMANDS = [
  'node --check lib/extraction-team-runtime.js lib/foundation-intelligence-audit-verifier.js lib/foundation-recent-builds-verifier.js scripts/process-extraction-team-runtime-check.mjs scripts/foundation-verify.mjs',
  'npm run process:extraction-team-runtime-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=EXTRACTION-TEAM-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TEAM-001.json --closeoutKey=extraction-team-runtime-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=EXTRACTION-TEAM-001 --closeoutKey=extraction-team-runtime-v1',
  'npm run process:foundation-ship -- --card=EXTRACTION-TEAM-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TEAM-001.json --closeoutKey=extraction-team-runtime-v1 --commitRef=HEAD',
]

export const EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES = [
  'No live extraction worker launch.',
  'No public web lookup, YouTube API call, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, or model call.',
  'No private, paid, community, course, Skool, MyICOR, Loom, or authorized-browser content access.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, backlog mutation, vector write, or query-index write.',
  'No MEETING-VAULT-ACL-001 Phase B or Drive permissions mutation.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
  'No hidden subagents or invisible extraction workers.',
]

const REQUIRED_STAGE_KEYS = [
  'source_auth_boundary',
  'public_queue_specs',
  'runtime_readiness',
  'visible_worker_protocol',
  'proposal_only_output_pipeline',
  'private_source_preflights',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function addFailure(failures, condition, code, detail = '') {
  if (!condition) failures.push({ code, detail })
}

function unsafeSideEffectCount(flags = {}) {
  return Object.values(flags || {}).filter(value => value === true || Number(value) > 0).length
}

function buildDefaultSideEffects(overrides = {}) {
  return {
    liveExtractionWorkerLaunched: false,
    publicWebLookupStarted: false,
    sourceCrawlStarted: false,
    transcriptFetchStarted: false,
    screenshotCaptureStarted: false,
    keyframeCaptureStarted: false,
    downloadStarted: false,
    modelCallsStarted: false,
    privateAuthUsed: false,
    paidAuthUsed: false,
    downstreamWritesStarted: false,
    externalWritesStarted: false,
    hiddenSubagentSpawned: false,
    drivePermissionMutationStarted: false,
    agentFeedbackAutoSendStarted: false,
    ...overrides,
  }
}

function buildRuntimeStages() {
  return [
    {
      key: 'source_auth_boundary',
      ownerCard: 'COURSE-SOURCE-AUTH-BOUNDARY-001',
      contract: 'private/paid/course/community content stays blocked pending source-specific approval packets',
    },
    {
      key: 'public_queue_specs',
      ownerCard: 'YOUTUBE-BUILD-INTEL-BATCH-001',
      contract: 'public Build Intel sources are metadata queue specs until runtime approval exists',
    },
    {
      key: 'runtime_readiness',
      ownerCard: 'EXTRACTION-RUNTIME-READINESS-001',
      contract: 'source/auth posture, evidence envelope, cost caps, run health, and output gates fail closed',
    },
    {
      key: 'visible_worker_protocol',
      ownerCard: 'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001',
      contract: 'visible workers need unique worktrees, branches, source packets, artifact roots, quality gates, and wrap reports',
    },
    {
      key: 'proposal_only_output_pipeline',
      ownerCard: 'EXTRACTION-TO-KB-ATOM-PIPELINE-001',
      contract: 'artifact outputs can only become proposal-only KB, atom, synthesis, review, and action-route candidates',
    },
    {
      key: 'private_source_preflights',
      ownerCard: 'MYICOR-EXTRACTION-PREFLIGHT-001 / MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
      contract: 'paid/private source packets are metadata-only and blocked until source-specific approval',
    },
  ]
}

export function buildExtractionTeamRuntimeSnapshot(input = {}) {
  const courseBoundary = input.courseBoundary || buildCourseSourceAuthBoundarySnapshot()
  const youtubeBatch = input.youtubeBatch || buildYoutubeBuildIntelBatchSnapshot()
  const readiness = input.readiness || buildExtractionRuntimeReadinessSnapshot(input.readinessInput || {})
  const workerProtocol = input.workerProtocol || buildExtractionParallelWorkerProtocolSnapshot(input.workerProtocolInput || {})
  const outputPipeline = input.outputPipeline || buildExtractionToKbAtomPipelineSnapshot(input.outputPipelineInput || {})
  const myicorPreflight = input.myicorPreflight || buildMyicorExtractionPreflightSnapshot()
  const skoolPreflight = input.skoolPreflight || buildMarkMSkoolExtractionPreflightSnapshot()
  const sideEffects = buildDefaultSideEffects(input.sideEffects)
  const stages = input.stages || buildRuntimeStages()
  const failures = []

  addFailure(failures, stages.length === REQUIRED_STAGE_KEYS.length, 'runtime_stage_count_required', `${stages.length}/${REQUIRED_STAGE_KEYS.length}`)
  for (const key of REQUIRED_STAGE_KEYS) {
    addFailure(failures, stages.some(stage => stage.key === key), 'runtime_stage_required', key)
  }
  addFailure(failures, courseBoundary.status === 'ready' && courseBoundary.extractionApprovedByThisCard === false, 'source_auth_boundary_required', courseBoundary.status || 'missing')
  addFailure(failures, youtubeBatch.status === 'ready' && youtubeBatch.liveExtractionApprovedByThisCard === false, 'public_queue_specs_required', youtubeBatch.status || 'missing')
  addFailure(failures, readiness.ok === true && readiness.liveExtractionApprovedByThisCard !== true, 'runtime_readiness_required', readiness.status || 'missing')
  addFailure(failures, workerProtocol.ok === true && workerProtocol.extractionWorkersLaunched === false, 'visible_worker_protocol_required', workerProtocol.status || 'missing')
  addFailure(failures, outputPipeline.ok === true && outputPipeline.proposalOnly === true, 'proposal_pipeline_required', outputPipeline.status || 'missing')
  addFailure(failures, myicorPreflight.approvedExtraction === false && myicorPreflight.privateOrPaid === true, 'myicor_preflight_block_required', myicorPreflight.status || 'missing')
  addFailure(failures, skoolPreflight.approvedExtraction === false && skoolPreflight.privateOrPaid === true, 'skool_preflight_block_required', skoolPreflight.status || 'missing')
  addFailure(failures, unsafeSideEffectCount(sideEffects) === 0, 'unsafe_side_effect_block_required', `${unsafeSideEffectCount(sideEffects)} unsafe side effect(s)`)
  addFailure(failures, list(input.hiddenSubagentSpawns).length === 0, 'hidden_subagent_block_required', `${list(input.hiddenSubagentSpawns).length} spawn(s)`)

  const ok = failures.length === 0
  return {
    cardId: EXTRACTION_TEAM_RUNTIME_CARD_ID,
    closeoutKey: EXTRACTION_TEAM_RUNTIME_CLOSEOUT_KEY,
    status: ok ? 'ready' : 'blocked',
    ok,
    proposalOnly: true,
    liveExtractionApprovedByThisCard: false,
    extractionWorkersLaunched: false,
    downstreamWritesApprovedByThisCard: false,
    stages,
    sideEffects,
    components: {
      courseBoundary,
      youtubeBatch,
      readiness,
      workerProtocol,
      outputPipeline,
      myicorPreflight,
      skoolPreflight,
    },
    failures,
    notNextBoundaries: EXTRACTION_TEAM_RUNTIME_NOT_NEXT_BOUNDARIES,
    recommendedNext: EXTRACTION_TEAM_RUNTIME_NEXT_CARD_ID,
    summary: {
      stageCount: stages.length,
      readinessTargetCount: readiness.summary?.targetCount || 0,
      publicQueueSpecCount: youtubeBatch.summary?.queueSpecCount || 0,
      visibleWorkerCount: workerProtocol.summary?.visibleWorkerCount || 0,
      outputCandidateTypes: [
        outputPipeline.summary?.kbDraftStatus === 'draft_ready' ? 'kb_draft' : null,
        outputPipeline.summary?.atomCandidateCount > 0 ? 'atom_candidate' : null,
        outputPipeline.summary?.synthesisFactCandidateCount > 0 ? 'synthesis_fact_candidate' : null,
        outputPipeline.summary?.reviewInboxCandidateCount > 0 ? 'review_inbox_candidate' : null,
        outputPipeline.summary?.actionRouteCandidateCount > 0 ? 'action_route_candidate' : null,
      ].filter(Boolean),
      privateSourcePreflightsBlocked: [myicorPreflight, skoolPreflight].filter(item => item.approvedExtraction === false).length,
      unsafeSideEffectCount: unsafeSideEffectCount(sideEffects),
      hiddenSubagentCount: list(input.hiddenSubagentSpawns).length,
    },
  }
}

export function buildExtractionTeamRuntimeDogfoodProof() {
  const healthy = buildExtractionTeamRuntimeSnapshot()
  const liveRunStarted = buildExtractionTeamRuntimeSnapshot({
    sideEffects: {
      liveExtractionWorkerLaunched: true,
      transcriptFetchStarted: true,
      modelCallsStarted: true,
    },
  })
  const missingStage = buildExtractionTeamRuntimeSnapshot({
    stages: buildRuntimeStages().filter(stage => stage.key !== 'proposal_only_output_pipeline'),
  })
  const workerLaunch = buildExtractionTeamRuntimeSnapshot({
    workerProtocol: buildExtractionParallelWorkerProtocolSnapshot({
      protocol: buildExtractionParallelWorkerProtocol({
        extractionWorkersLaunched: true,
        assignments: [buildExtractionWorkerAssignment({ workerLaunched: true, liveExtractionStarted: true })],
      }),
    }),
  })
  const directDownstreamWrite = buildExtractionTeamRuntimeSnapshot({
    outputPipeline: buildExtractionToKbAtomPipelineSnapshot({ kbPageWrite: true, atomWrite: true }),
  })
  const hiddenSubagent = buildExtractionTeamRuntimeSnapshot({
    hiddenSubagentSpawns: [{ workerId: 'hidden-extractor', explicitApproval: false }],
  })
  const privateApprovedTooEarly = buildExtractionTeamRuntimeSnapshot({
    myicorPreflight: { ...buildMyicorExtractionPreflightSnapshot(), approvedExtraction: true, privateOrPaid: true, status: 'ready' },
  })
  const componentDogfood = {
    courseBoundary: buildCourseSourceAuthBoundaryDogfoodProof().ok,
    youtubeBatch: buildYoutubeBuildIntelBatchDogfoodProof().ok,
    readiness: buildExtractionRuntimeReadinessDogfoodProof().ok,
    workerProtocol: buildExtractionParallelWorkerProtocolDogfoodProof().ok,
    outputPipeline: buildExtractionToKbAtomPipelineDogfoodProof().ok,
    myicorPreflight: buildMyicorExtractionPreflightDogfoodProof().ok,
    skoolPreflight: buildMarkMSkoolExtractionPreflightDogfoodProof().ok,
  }
  const rejectedCases = {
    liveRunStarted: liveRunStarted.ok === false,
    missingStage: missingStage.ok === false,
    workerLaunch: workerLaunch.ok === false,
    directDownstreamWrite: directDownstreamWrite.ok === false,
    hiddenSubagent: hiddenSubagent.ok === false,
    privateApprovedTooEarly: privateApprovedTooEarly.ok === false,
  }
  return {
    ok: healthy.ok === true &&
      Object.values(componentDogfood).every(Boolean) &&
      Object.values(rejectedCases).every(Boolean),
    healthy,
    componentDogfood,
    rejectedCases,
    invariant: 'Extraction Team runtime v1 is a supervised contract only: live runs, private-source use, hidden workers, and downstream writes fail closed.',
  }
}

export function renderExtractionTeamRuntimeReport(snapshot = buildExtractionTeamRuntimeSnapshot()) {
  const lines = []
  lines.push(`# ${EXTRACTION_TEAM_RUNTIME_CARD_ID}`)
  lines.push('')
  lines.push(`Status: ${snapshot.status}`)
  lines.push(`Runtime stages: ${snapshot.summary.stageCount}`)
  lines.push(`Readiness targets: ${snapshot.summary.readinessTargetCount}`)
  lines.push(`Public queue specs: ${snapshot.summary.publicQueueSpecCount}`)
  lines.push(`Visible worker assignments: ${snapshot.summary.visibleWorkerCount}`)
  lines.push(`Output candidate types: ${snapshot.summary.outputCandidateTypes.join(', ')}`)
  lines.push(`Private preflights blocked: ${snapshot.summary.privateSourcePreflightsBlocked}`)
  lines.push(`Unsafe side effects: ${snapshot.summary.unsafeSideEffectCount}`)
  lines.push('')
  lines.push('Not launched: live extraction, transcript/keyframe/screenshot capture, model calls, private auth, downstream writes, hidden workers.')
  return lines.join('\n')
}
