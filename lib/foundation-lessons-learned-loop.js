export const FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID = 'FOUNDATION-LESSONS-LEARNED-LOOP-001'
export const FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_KEY = 'foundation-lessons-learned-loop-v1'
export const FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH = 'docs/process/foundation-lessons-learned-loop-001-plan.md'
export const FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-LESSONS-LEARNED-LOOP-001.json'
export const FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH = 'scripts/process-foundation-lessons-learned-loop-check.mjs'
export const FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-lessons-learned-loop-closeout.md'
export const FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY = 'foundation-lessons-learned-loop'
export const FOUNDATION_LESSONS_LEARNED_LOOP_NEXT_CARD_ID = 'FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001'

export const FOUNDATION_LESSONS_LEARNED_LOOP_CHANGED_FILES = [
  'lib/foundation-lessons-learned-loop.js',
  'lib/foundation-jobs.js',
  'scripts/sync-missive-archive.mjs',
  'scripts/extract-drive-content.mjs',
  'lib/foundation-shared-comms-store.js',
  'lib/foundation-job-mutation-allowlist.js',
  'lib/hub-read-routes.js',
  FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'AGENTS.md',
  FOUNDATION_LESSONS_LEARNED_LOOP_PLAN_PATH,
  FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH,
  FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_PATH,
]

export const FOUNDATION_LESSONS_LEARNED_LOOP_PROOF_COMMANDS = [
  `node --check lib/foundation-lessons-learned-loop.js lib/foundation-jobs.js scripts/sync-missive-archive.mjs scripts/extract-drive-content.mjs lib/foundation-shared-comms-store.js lib/foundation-job-mutation-allowlist.js lib/hub-read-routes.js ${FOUNDATION_LESSONS_LEARNED_LOOP_SCRIPT_PATH}`,
  'npm run process:foundation-lessons-learned-loop-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID} --planApprovalRef=${FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID} --closeoutKey=${FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID} --planApprovalRef=${FOUNDATION_LESSONS_LEARNED_LOOP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_LESSONS_LEARNED_LOOP_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_LESSONS_LEARNED_LOOP_NOT_NEXT = [
  'Do not start Value Builder split.',
  'Do not run live extraction, provider/model calls, paid jobs, credential mutation, external writes, email sends, or Drive permission mutation.',
  'Do not upload private conversation logs or local memory to external providers without explicit Steve approval.',
  'Do not close lessons as documented-only notes.',
  'Do not auto-implement lesson output from scheduled report-only runs.',
]

export const LESSON_ACTION_TYPES = Object.freeze([
  'active_repair_blocker',
  'existing_live_backlog_card',
  'new_scoped_backlog_card',
  'verifier_rule',
  'plan_critic_rule',
  'current_sprint_gate',
  'durable_doctrine',
  'approval_required_exception',
  'no_op_with_proof',
])

const DOCUMENT_ONLY_ACTION_TYPES = new Set([
  'documented_only',
  'note_only',
  'report_only',
  'handoff_only',
])

const REPAIR_TRIGGER_ACTION_TYPES = new Set([
  'active_repair_blocker',
  'existing_live_backlog_card',
  'new_scoped_backlog_card',
  'current_sprint_gate',
  'verifier_rule',
])

function text(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null)
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function unique(values = []) {
  return Array.from(new Set(values.map(text).filter(Boolean)))
}

function includesAny(values = [], needles = []) {
  const haystack = values.map(value => text(value).toLowerCase()).join(' ')
  return needles.some(needle => haystack.includes(String(needle).toLowerCase()))
}

function getAction(lesson = {}) {
  return {
    ...(lesson.action || {}),
    type: lesson.action?.type || lesson.actionType || lesson.routeType,
    targetId: lesson.action?.targetId || lesson.targetId || lesson.repairCardId || lesson.cardId,
    owner: lesson.action?.owner || lesson.owner,
    nextAction: lesson.action?.nextAction || lesson.nextAction,
    behaviorChange: lesson.action?.behaviorChange || lesson.behaviorChange,
    proof: lesson.action?.proof || lesson.proof || lesson.proofRef,
    approvalSource: lesson.action?.approvalSource || lesson.approvalSource,
  }
}

function isPrivateConversationLesson(lesson = {}) {
  const sourceTypes = normalizeArray(lesson.sourceType || lesson.sourceTypes)
  return Boolean(
    lesson.private === true ||
      text(lesson.privacyClassification).toLowerCase().includes('private') ||
      includesAny(sourceTypes, ['conversation', 'chat', 'memory', 'local_private']) ||
      normalizeArray(lesson.sourceRefs).some(ref => /^memory\/|^MEMORY\.md$|^USER\.md$/i.test(text(ref)))
  )
}

function isRepairTriggerLesson(lesson = {}) {
  const values = [
    lesson.type,
    lesson.category,
    lesson.severity,
    lesson.title,
    lesson.lesson,
    ...normalizeArray(lesson.tags),
  ]
  return includesAny(values, [
    'repeated_failure',
    'workflow_failure',
    'raw_health',
    'false_green',
    'active_blocker',
    'P0',
  ])
}

export function evaluateLessonsLearnedAction(lesson = {}, {
  liveBacklogIds = [],
  currentSprintCardIds = [],
  scopedCardIds = [],
} = {}) {
  const action = getAction(lesson)
  const failures = []
  const actionType = text(action.type)
  const targetId = text(action.targetId)
  const allowedActionTypes = new Set(LESSON_ACTION_TYPES)
  const liveIds = new Set([...liveBacklogIds, ...currentSprintCardIds, ...scopedCardIds].map(text).filter(Boolean))

  if (!text(lesson.id)) failures.push('id')
  if (!text(lesson.title)) failures.push('title')
  if (!text(lesson.lesson)) failures.push('lesson')
  if (!normalizeArray(lesson.sourceRefs || lesson.sourceRef).length) failures.push('sourceRefs')
  if (!actionType) failures.push('action.type')
  if (DOCUMENT_ONLY_ACTION_TYPES.has(actionType)) failures.push('documented-only action is not allowed')
  if (actionType && !allowedActionTypes.has(actionType)) failures.push(`unsupported action type ${actionType}`)
  if (!text(action.owner)) failures.push('action.owner')
  if (!text(action.nextAction)) failures.push('action.nextAction')
  if (!text(action.behaviorChange)) failures.push('action.behaviorChange')
  if (!text(action.proof)) failures.push('action.proof')

  if (actionType !== 'no_op_with_proof' && !targetId) failures.push('action.targetId')
  if (actionType === 'existing_live_backlog_card' && targetId && !liveIds.has(targetId)) {
    failures.push(`target ${targetId} is not live backlog/current sprint truth`)
  }
  if (actionType === 'new_scoped_backlog_card' && targetId && !liveIds.has(targetId)) {
    failures.push(`new scoped target ${targetId} is not in live backlog truth`)
  }
  if (actionType === 'durable_doctrine' && targetId && !/^(AGENTS\.md|docs\/|SOUL\.md|TOOLS\.md)/.test(targetId)) {
    failures.push('durable doctrine target must be AGENTS.md, SOUL.md, TOOLS.md, or docs/')
  }
  if (actionType === 'verifier_rule' && targetId && !/^(process:|scripts\/|lib\/|foundation:verify)/.test(targetId)) {
    failures.push('verifier rule target must name a process script, lib module, or foundation:verify')
  }
  if (actionType === 'plan_critic_rule' && targetId && !/process-plan-critic|plan-critic/i.test(targetId)) {
    failures.push('Plan Critic action target must name Plan Critic')
  }
  if (actionType === 'current_sprint_gate' && targetId && !liveIds.has(targetId)) {
    failures.push(`Current Sprint gate target ${targetId} is not live sprint/backlog truth`)
  }
  if (actionType === 'no_op_with_proof' && !text(lesson.noOpReason || action.reason)) {
    failures.push('no_op_with_proof requires reason')
  }

  if (isRepairTriggerLesson(lesson) && !REPAIR_TRIGGER_ACTION_TYPES.has(actionType)) {
    failures.push('repair-trigger lesson must route to repair/card/gate/verifier action')
  }

  if (isPrivateConversationLesson(lesson)) {
    const privacyPosture = text(lesson.privacyPosture || action.privacyPosture)
    const externalModelUse = lesson.externalModelUse === true || action.externalModelUse === true
    if (privacyPosture !== 'local_private_metadata_only') failures.push('private conversation lesson must be local_private_metadata_only')
    if (externalModelUse) failures.push('private conversation lesson cannot use external model/provider without Steve approval')
    if (text(lesson.rawText) || text(lesson.sourceExcerpt) || text(action.rawText) || text(action.sourceExcerpt)) {
      failures.push('private conversation lesson must not carry raw transcript excerpts')
    }
  }

  return {
    ok: failures.length === 0,
    lessonId: text(lesson.id) || 'missing-id',
    actionType,
    targetId,
    repairTrigger: isRepairTriggerLesson(lesson),
    privateConversation: isPrivateConversationLesson(lesson),
    failures,
  }
}

export function evaluateLessonsLearnedLoop({
  lessons = [],
  liveBacklogIds = [],
  currentSprintCardIds = [],
  scopedCardIds = [],
} = {}) {
  const lessonRows = normalizeArray(lessons).map(lesson => ({
    lesson,
    evaluation: evaluateLessonsLearnedAction(lesson, {
      liveBacklogIds,
      currentSprintCardIds,
      scopedCardIds,
    }),
  }))
  const failed = lessonRows.filter(row => !row.evaluation.ok)
  const repairTriggers = lessonRows.filter(row => row.evaluation.repairTrigger)
  const privateLessons = lessonRows.filter(row => row.evaluation.privateConversation)
  return {
    status: failed.length ? 'risk' : 'healthy',
    ok: failed.length === 0,
    lessonCount: lessonRows.length,
    failedCount: failed.length,
    repairTriggerCount: repairTriggers.length,
    privateConversationLessonCount: privateLessons.length,
    lessons: lessonRows.map(row => ({
      id: row.evaluation.lessonId,
      title: text(row.lesson.title),
      severity: text(row.lesson.severity),
      sourceTypes: unique(normalizeArray(row.lesson.sourceType || row.lesson.sourceTypes)),
      actionType: row.evaluation.actionType,
      targetId: row.evaluation.targetId,
      repairTrigger: row.evaluation.repairTrigger,
      privateConversation: row.evaluation.privateConversation,
      ok: row.evaluation.ok,
      failures: row.evaluation.failures,
    })),
    failed: failed.map(row => ({
      id: row.evaluation.lessonId,
      actionType: row.evaluation.actionType,
      targetId: row.evaluation.targetId,
      failures: row.evaluation.failures,
    })),
  }
}

export function buildLocalConversationLessonSignals({ memoryFiles = {} } = {}) {
  const signals = []
  for (const [sourceRef, content] of Object.entries(memoryFiles || {})) {
    const value = String(content || '')
    const sourceRefs = [sourceRef]
    if (/repeated failure/i.test(value) && /repair trigger|literal green|stop normal sprint/i.test(value)) {
      signals.push({
        id: 'local-memory-repeated-failure-repair-trigger',
        title: 'Repeated failures must trigger repair, not reporting',
        lesson: 'Repeated failure telemetry must block normal progression until a repair lane owns the fix.',
        severity: 'P0',
        type: 'repeated_failure',
        tags: ['repeated_failure', 'repair_trigger'],
        sourceType: ['local_private_conversation_memory'],
        sourceRefs,
        privacyPosture: 'local_private_metadata_only',
        action: {
          type: 'existing_live_backlog_card',
          targetId: 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
          owner: 'Foundation Builder',
          nextAction: 'Keep repeated failure action gate healthy before normal progression.',
          behaviorChange: 'Repeated red groups must route to repair before sprint progression.',
          proof: 'process:build-lane-repeated-failure-action-gate-check',
        },
      })
    }
    if (/green means raw green|classification is not repair|false-green/i.test(value)) {
      signals.push({
        id: 'local-memory-green-means-raw-green',
        title: 'Classification is not repair',
        lesson: 'Health rows cannot become green because they are classified; raw health or explicit Steve exception is required.',
        severity: 'P0',
        type: 'false_green',
        tags: ['raw_health', 'false_green'],
        sourceType: ['local_private_conversation_memory'],
        sourceRefs,
        privacyPosture: 'local_private_metadata_only',
        action: {
          type: 'existing_live_backlog_card',
          targetId: 'FOUNDATION-HEALTH-GREEN-LOCK-001',
          owner: 'Foundation Builder',
          nextAction: 'Keep System Health green-lock proof in every Foundation closeout.',
          behaviorChange: 'System Health rejects false-green rows and stale sprint health.',
          proof: 'process:foundation-health-green-lock-check',
        },
      })
    }
    if (/Orchestrator|audit-only|role boundary|builder/i.test(value)) {
      signals.push({
        id: 'local-memory-orchestrator-builder-boundary',
        title: 'Builder and Orchestrator role boundaries must stay explicit',
        lesson: 'Audit/sequencing and live repair/build execution need explicit ownership so one lane does not surprise the other.',
        severity: 'P1',
        type: 'role_boundary',
        tags: ['role_boundary', 'foundation_process'],
        sourceType: ['local_private_conversation_memory'],
        sourceRefs,
        privacyPosture: 'local_private_metadata_only',
        action: {
          type: 'durable_doctrine',
          targetId: 'AGENTS.md',
          owner: 'Foundation Process',
          nextAction: 'Use the durable operating rule when deciding whether a session may audit, repair, or build.',
          behaviorChange: 'Future sessions must state lane ownership and avoid crossing from audit into live repair without approval.',
          proof: 'AGENTS.md Foundation Rebuild Discipline plus lessons loop dogfood',
        },
      })
    }
  }
  const byId = new Map()
  for (const signal of signals) if (!byId.has(signal.id)) byId.set(signal.id, signal)
  return [...byId.values()]
}

export function buildLessonsFromRuntimeSignals({
  systemHealth = {},
  repeatedFailureGate = {},
  foundationJobRuns = [],
  activeBlockerCardId = '',
} = {}) {
  const lessons = []
  const rawRiskCount = Number(systemHealth?.summary?.rawRiskCount || systemHealth?.rawRiskCount || 0)
  const rawWatchCount = Number(systemHealth?.summary?.rawWatchCount || systemHealth?.rawWatchCount || 0)
  if (systemHealth?.status && systemHealth.status !== 'healthy' || rawRiskCount > 0 || rawWatchCount > 0) {
    lessons.push({
      id: 'runtime-system-health-non-green',
      title: 'Raw System Health is non-green',
      lesson: 'Raw workflow health must become the active repair lane before normal sprint progression.',
      severity: rawRiskCount > 0 ? 'P0' : 'P1',
      type: 'raw_health',
      sourceType: ['system_health'],
      sourceRefs: ['process:system-health-nightly-audit-check'],
      action: {
        type: activeBlockerCardId ? 'current_sprint_gate' : 'existing_live_backlog_card',
        targetId: activeBlockerCardId || 'FOUNDATION-HEALTH-GREEN-LOCK-001',
        owner: 'Foundation Builder',
        nextAction: 'Repair or explicitly Steve-approve the raw health exception before continuing.',
        behaviorChange: 'Non-green raw health blocks normal progression.',
        proof: 'process:system-health-nightly-audit-check',
      },
    })
  }

  const repeatedStatus = repeatedFailureGate?.status || repeatedFailureGate?.summary?.status
  const blockingCount = Number(repeatedFailureGate?.blockingItemCount || repeatedFailureGate?.summary?.blockingItemCount || repeatedFailureGate?.blockingItems?.length || 0)
  if ((repeatedStatus && repeatedStatus !== 'healthy') || blockingCount > 0) {
    lessons.push({
      id: 'runtime-repeated-failure-active',
      title: 'Repeated failure gate is blocking',
      lesson: 'Repeated failure groups must become repair work before the sprint continues.',
      severity: 'P0',
      type: 'repeated_failure',
      sourceType: ['repeated_failure_gate'],
      sourceRefs: ['process:build-lane-repeated-failure-action-gate-check'],
      action: {
        type: 'existing_live_backlog_card',
        targetId: 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
        owner: 'Foundation Builder',
        nextAction: 'Resolve or attach every repeated red group to a repair card.',
        behaviorChange: 'Repeated failure telemetry blocks progression until repaired.',
        proof: 'process:build-lane-repeated-failure-action-gate-check',
      },
    })
  }

  const recentFailuresByJob = new Map()
  for (const run of normalizeArray(foundationJobRuns)) {
    const status = text(run.status).toLowerCase()
    if (!['failed', 'cancelled'].includes(status)) continue
    const jobKey = text(run.jobKey || run.job_key)
    if (!jobKey) continue
    recentFailuresByJob.set(jobKey, (recentFailuresByJob.get(jobKey) || 0) + 1)
  }
  for (const [jobKey, count] of recentFailuresByJob.entries()) {
    if (count < 3) continue
    lessons.push({
      id: `runtime-job-repeat-${jobKey}`,
      title: `Repeated job failures for ${jobKey}`,
      lesson: 'Repeated failed/cancelled job runs should route to Foundation repair instead of being rediscovered by the operator.',
      severity: 'P0',
      type: 'repeated_failure',
      sourceType: ['foundation_job_runs'],
      sourceRefs: ['foundation_job_runs'],
      action: {
        type: 'existing_live_backlog_card',
        targetId: 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
        owner: 'Foundation Builder',
        nextAction: `Resolve repeated ${jobKey} failures or attach them to a live repair card.`,
        behaviorChange: 'Repeated job failures become a repair trigger.',
        proof: 'foundation_job_runs plus repeated-failure action gate',
      },
    })
  }

  return lessons
}

export function buildFoundationLessonsLearnedLoopStatus({
  lessons = [],
  systemHealth = {},
  repeatedFailureGate = {},
  foundationJobRuns = [],
  memoryFiles = {},
  liveBacklogIds = [],
  currentSprintCardIds = [],
  scopedCardIds = [],
  activeBlockerCardId = '',
} = {}) {
  const runtimeLessons = buildLessonsFromRuntimeSignals({
    systemHealth,
    repeatedFailureGate,
    foundationJobRuns,
    activeBlockerCardId,
  })
  const memoryLessons = buildLocalConversationLessonSignals({ memoryFiles })
  const allLessons = [...normalizeArray(lessons), ...runtimeLessons, ...memoryLessons]
  const evaluation = evaluateLessonsLearnedLoop({
    lessons: allLessons,
    liveBacklogIds,
    currentSprintCardIds,
    scopedCardIds,
  })
  return {
    status: evaluation.status,
    ok: evaluation.ok,
    generatedAt: new Date().toISOString(),
    summary: {
      lessonCount: evaluation.lessonCount,
      failedCount: evaluation.failedCount,
      repairTriggerCount: evaluation.repairTriggerCount,
      privateConversationLessonCount: evaluation.privateConversationLessonCount,
      runtimeLessonCount: runtimeLessons.length,
      localPrivateSignalCount: memoryLessons.length,
      writesBacklog: false,
      writesCurrentSprint: false,
      writesSourceSystems: false,
      externalModelUse: false,
      privacyPosture: 'local_private_metadata_only',
    },
    lessons: evaluation.lessons,
    failed: evaluation.failed,
  }
}

export function buildFoundationLessonsLearnedLoopDogfoodProof() {
  const liveBacklogIds = [
    'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
    'FOUNDATION-HEALTH-GREEN-LOCK-001',
    FOUNDATION_LESSONS_LEARNED_LOOP_CARD_ID,
  ]
  const goodRepeatedFailure = evaluateLessonsLearnedAction({
    id: 'synthetic-repeated-failure',
    title: 'Repeated failure becomes repair',
    lesson: 'A repeated red fingerprint must create repair motion.',
    severity: 'P0',
    type: 'repeated_failure',
    sourceType: ['repeated_failure_gate'],
    sourceRefs: ['synthetic'],
    action: {
      type: 'existing_live_backlog_card',
      targetId: 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
      owner: 'Foundation Builder',
      nextAction: 'Fix the repeated red group.',
      behaviorChange: 'Sprint progression stops until repeated red groups are repaired.',
      proof: 'process:build-lane-repeated-failure-action-gate-check',
    },
  }, { liveBacklogIds })
  const documentedOnly = evaluateLessonsLearnedAction({
    id: 'synthetic-documented-only',
    title: 'Bad documented-only lesson',
    lesson: 'This should not pass.',
    severity: 'P1',
    sourceType: ['nightly_audit'],
    sourceRefs: ['synthetic'],
    action: {
      type: 'documented_only',
      owner: 'Foundation Process',
      nextAction: 'Write a note.',
      behaviorChange: 'None.',
      proof: 'note',
    },
  }, { liveBacklogIds })
  const privateExternal = evaluateLessonsLearnedAction({
    id: 'synthetic-private-external',
    title: 'Bad private external lesson',
    lesson: 'Private chat logs cannot be uploaded.',
    severity: 'P0',
    sourceType: ['local_private_conversation_memory'],
    sourceRefs: ['memory/2026-05-19.md'],
    privacyPosture: 'local_private_metadata_only',
    externalModelUse: true,
    action: {
      type: 'durable_doctrine',
      targetId: 'AGENTS.md',
      owner: 'Foundation Process',
      nextAction: 'External model summarizes chat.',
      behaviorChange: 'Unsafe behavior should fail.',
      proof: 'synthetic',
    },
  }, { liveBacklogIds })
  const roleBoundaryDoctrine = evaluateLessonsLearnedAction({
    id: 'synthetic-role-boundary',
    title: 'Role boundary becomes doctrine',
    lesson: 'Audit and repair lanes need explicit ownership.',
    severity: 'P1',
    type: 'role_boundary',
    sourceType: ['local_private_conversation_memory'],
    sourceRefs: ['memory/2026-05-19.md'],
    privacyPosture: 'local_private_metadata_only',
    action: {
      type: 'durable_doctrine',
      targetId: 'AGENTS.md',
      owner: 'Foundation Process',
      nextAction: 'Keep lane ownership explicit.',
      behaviorChange: 'Future sessions avoid crossing audit/build roles without approval.',
      proof: 'AGENTS.md Foundation Rebuild Discipline',
    },
  }, { liveBacklogIds })
  const closeoutMetadataRule = evaluateLessonsLearnedAction({
    id: 'synthetic-closeout-metadata',
    title: 'Repeated closeout metadata failures become ship proof',
    lesson: 'Missing closeout metadata should be a ship gate, not a repeated manual fix.',
    severity: 'P1',
    sourceType: ['build_lane_failure_telemetry'],
    sourceRefs: ['synthetic'],
    action: {
      type: 'verifier_rule',
      targetId: 'process:foundation-ship',
      owner: 'Foundation Build Lane',
      nextAction: 'Keep closeout metadata in ship/fanout proof.',
      behaviorChange: 'Missing closeout metadata fails the ship path before repeated wasted runs.',
      proof: 'process:foundation-ship and process:fanout-check',
    },
  }, { liveBacklogIds })
  const checks = [
    { ok: goodRepeatedFailure.ok, check: 'repeated failure routes to repair action' },
    { ok: documentedOnly.ok === false && documentedOnly.failures.some(item => /documented-only/.test(item)), check: 'documented-only lesson fails' },
    { ok: privateExternal.ok === false && privateExternal.failures.some(item => /external model/.test(item)), check: 'private conversation external-model use fails' },
    { ok: roleBoundaryDoctrine.ok, check: 'role-boundary lesson can become durable doctrine without raw transcript' },
    { ok: closeoutMetadataRule.ok, check: 'closeout metadata lesson can become verifier/ship rule' },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    examples: {
      goodRepeatedFailure,
      documentedOnly,
      privateExternal,
      roleBoundaryDoctrine,
      closeoutMetadataRule,
    },
  }
}
