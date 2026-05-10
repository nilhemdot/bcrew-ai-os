export const FOUNDATION_SPRINT_SYSTEM_CARD_ID = 'FOUNDATION-SPRINT-SYSTEM-001'
export const FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY = 'foundation-sprint-system-v1'
export const FOUNDATION_SPRINT_SYSTEM_PLAN_PATH = 'docs/process/foundation-sprint-system-001-plan.md'
export const FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json'
export const FOUNDATION_SPRINT_SYSTEM_DOC_PATH = 'docs/process/foundation-sprint-system.md'
export const FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH = 'scripts/process-foundation-sprint-system-check.mjs'
export const FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER = 'FOUNDATION_SPRINT_SYSTEM_SUMMARY'
export const FOUNDATION_SPRINT_CADENCE_CARD_ID = 'FOUNDATION-SPRINT-CADENCE-001'
export const FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY = 'foundation-sprint-cadence-v1'
export const FOUNDATION_SPRINT_CADENCE_PLAN_PATH = 'docs/process/foundation-sprint-cadence-001-plan.md'
export const FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-SPRINT-CADENCE-001.json'
export const FOUNDATION_SPRINT_CADENCE_DOC_PATH = 'docs/process/foundation-sprint-cadence.md'
export const FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH = 'scripts/process-foundation-sprint-cadence-check.mjs'
export const FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER = 'FOUNDATION_SPRINT_CADENCE_SUMMARY'
export const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-10'
export const FOUNDATION_CURRENT_SPRINT_GOAL = 'Close the raw meeting Drive ACL/vault blocker through sensitivity-aware dry-run proof without unapproved Drive mutations.'
export const MEETING_VAULT_ACL_SENSITIVITY_PHASE_A_PLAN_PATH = 'docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md'

export const FOUNDATION_CURRENT_SPRINT_STAGES = [
  { key: 'scoping', label: 'Scoping' },
  { key: 'sprint_ready', label: 'Sprint Ready' },
  { key: 'building_now', label: 'Building Now' },
  { key: 'returned', label: 'Returned' },
  { key: 'done_this_sprint', label: 'Done This Sprint' },
]

export const FOUNDATION_EXISTING_WORK_CHECK_FIELDS = [
  'existingCode',
  'existingDocs',
  'existingScripts',
  'existingPolicy',
  'reused',
  'notRebuilt',
  'exactGap',
  'overBroadRisk',
  'readyBy',
  'readyAt',
]

export const FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES = [
  'Do not work MEETING-VAULT-ACL-001 Phase B from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not send request-access emails.',
  'Do not start Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, filtered comms access, public access, broad sprint analytics, or broad UI polish.',
]

export const FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID = 'FOUNDATION-DONE-VELOCITY-001'
export const FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID = 'FOUNDATION-SURFACE-UPDATES-001'
export const MEETING_VAULT_ACL_SENSITIVITY_DRY_RUN_HASH = '31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d'
export const MEETING_VAULT_ACL_SCOPING_NEXT_ACTION = 'Scope the next safe MEETING-VAULT-ACL-001 step: review the sensitivity-aware Phase B packet, pick the first safe approval batch or keep it blocked, confirm exact approval wording, confirm rollback/recheck proof, and do not mutate Drive permissions.'

export const FOUNDATION_SPRINT_EXIT_CRITERIA = [
  'Current Sprint command view shows executive summary, sprint goal, current status, next card, blocker, exit criteria, all five stages, card definition of done, proof commands, returned reason, and next action.',
  'Current Sprint remains an overlay on live backlog truth and does not create a second backlog.',
  'Sprint Ready and Building Now keep the existing-work/doctrine check requirement.',
  'Returned cards cannot leave Returned without a reason and next action.',
  'No Drive permission mutation or request-access email is approved by this sprint command card.',
  'After this card ships, MEETING-VAULT-ACL-001 moves into Scoping under the Sprint Ready rules before any build or Drive mutation.',
]

const stageKeys = new Set(FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => stage.key))

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeText(item))
      .filter(Boolean)
  }
  const normalized = normalizeText(value)
  return normalized ? [normalized] : []
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return normalizeArray(value).length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(normalizeText(value))
}

function backlogText(card) {
  if (!card) return ''
  return [
    card.id,
    card.title,
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
  ].map(value => normalizeText(value)).filter(Boolean).join('\n')
}

function buildBacklogMap(backlogItems = []) {
  const map = new Map()
  for (const item of Array.isArray(backlogItems) ? backlogItems : []) {
    if (item?.id) map.set(item.id, item)
  }
  return map
}

function buildCloseoutMap(closeouts = []) {
  const map = new Map()
  for (const closeout of Array.isArray(closeouts) ? closeouts : []) {
    for (const cardId of Array.isArray(closeout?.backlogIds) ? closeout.backlogIds : []) {
      if (!map.has(cardId)) map.set(cardId, [])
      map.get(cardId).push(closeout)
    }
  }
  return map
}

function finding(check, detail, severity = 'error') {
  return { check, detail, severity }
}

export function getFoundationSprintStageLabel(stageKey) {
  return FOUNDATION_CURRENT_SPRINT_STAGES.find(stage => stage.key === stageKey)?.label || normalizeText(stageKey) || 'Unknown'
}

export function normalizeFoundationSprintItem(item = {}) {
  const cardId = normalizeText(item.cardId || item.backlogId || item.backlog_id)
  const stage = normalizeText(item.stage)
  return {
    cardId,
    stage,
    order: Number.isFinite(Number(item.order ?? item.sprintOrder ?? item.sprint_order))
      ? Number(item.order ?? item.sprintOrder ?? item.sprint_order)
      : null,
    planRef: normalizeText(item.planRef || item.plan_ref),
    definitionOfDone: normalizeText(item.definitionOfDone || item.definition_of_done),
    proofCommands: normalizeArray(item.proofCommands || item.proof_commands),
    nextAction: normalizeText(item.nextAction || item.next_action),
    readinessBlockerCleared: normalizeText(item.readinessBlockerCleared || item.readiness_blocker_cleared),
    notNextBoundaries: normalizeArray(item.notNextBoundaries || item.not_next_boundaries),
    existingWorkCheck: item.existingWorkCheck || item.existing_work_check || {},
    returnedReason: normalizeText(item.returnedReason || item.returned_reason),
    parallelApproved: item.parallelApproved === true || item.parallel_approved === true,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
    backlog: item.backlog || null,
  }
}

export function validateExistingWorkCheck(check = {}) {
  const missingFields = FOUNDATION_EXISTING_WORK_CHECK_FIELDS.filter(field => !hasMeaningfulValue(check[field]))
  return {
    ok: missingFields.length === 0,
    requiredFields: FOUNDATION_EXISTING_WORK_CHECK_FIELDS,
    missingFields,
  }
}

export function buildDefaultFoundationSprintSeed({ stage = 'done_this_sprint', cadenceStage = 'scoping' } = {}) {
  const normalizedStage = stageKeys.has(stage) ? stage : 'done_this_sprint'
  const normalizedCadenceStage = stageKeys.has(cadenceStage) ? cadenceStage : 'scoping'
  const foundationSprintSystemDone = normalizedStage === 'done_this_sprint'
  const foundationSprintCadenceDone = normalizedCadenceStage === 'done_this_sprint'
  const meetingVaultStage = foundationSprintCadenceDone ? 'scoping' : 'returned'
  const readyCheck = {
    existingCode: [
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'server.js',
      'public/foundation.js',
      'public/styles.css',
      'scripts/foundation-verify.mjs',
    ],
    existingDocs: [
      FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
      'docs/process/meeting-vault-acl-001-phase-b-approval-packet.md',
      'docs/handoffs/2026-05-10-foundation-sprint-capture.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/backlog-hygiene.mjs',
      'scripts/process-foundation-ship.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Live Backlog is task truth.',
      'Current Sprint is an overlay on live backlog truth, not a second backlog.',
      'Scope, plan, review at 9.8, then execute.',
      'Meeting raw Drive ACL Phase B needs a separate explicit approval artifact before any permission mutation.',
    ],
    reused: [
      'Backlog cards remain the card source of truth.',
      'Recent Work remains the shipped-build closeout feed.',
      'Foundation hub remains the dashboard API envelope.',
      'Existing process gates remain the proof surface.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No broad Foundation UI redesign.',
      'No Drive ACL mutation path.',
      'No Strategy, Sales, Agent Feedback, Scoper, Agent Factory, corpus, researcher, video-mining, filtered comms, or public-access expansion.',
    ],
    exactGap: 'Foundation has no operator-visible Current Sprint control overlay that proves active card order, readiness checks, returned reasons, proof commands, and not-next boundaries.',
    overBroadRisk: 'This could drift into broad UI polish, sprint analytics, Strategy work, or meeting ACL Phase B; V1 stays compact and execution-control only.',
    readyBy: 'Steve approval + Codex implementation',
    readyAt: '2026-05-10T08:30:00-04:00',
  }
  const cadenceReadyCheck = {
    existingCode: [
      'lib/foundation-current-sprint.js',
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'server.js',
      'public/foundation.js',
      'public/styles.css',
      'scripts/foundation-verify.mjs',
      'scripts/process-foundation-sprint-system-check.mjs',
    ],
    existingDocs: [
      FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
      FOUNDATION_SPRINT_SYSTEM_DOC_PATH,
      'docs/handoffs/2026-05-10-foundation-sprint-capture.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-foundation-sprint-system-check.mjs',
      'scripts/process-foundation-ship.mjs',
      'scripts/backlog-hygiene.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Current Sprint is an overlay on live backlog truth, not a second backlog.',
      'Sprint Ready requires existing code/docs/scripts/doctrine before build.',
      'Returned cards require a reason and next action.',
      'No Meeting Vault Phase B, Drive permission mutation, or request-access email is approved by sprint visibility work.',
    ],
    reused: [
      'Existing foundation_sprints and foundation_sprint_items overlay tables.',
      'Existing currentSprint API payload on /api/foundation-hub and /api/foundation/current-sprint.',
      'Existing Recent Work placement.',
      'Existing live backlog and closeout reconciliation.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No broad Foundation UI redesign.',
      'No done-velocity analytics build.',
      'No Meeting Vault Phase B apply path.',
      'No Drive permission mutation or request-access email path.',
    ],
    exactGap: 'Current Sprint shows stage cards but not a scan-friendly sprint command view with executive summary, sprint goal, current status, next card, blocker, exit criteria, returned reason, proof commands, and next action.',
    overBroadRisk: 'This could drift into broad UI polish, sprint analytics, scrum automation, or Meeting Vault Phase B. V1 is read-only sprint command visibility only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-10T11:15:00-04:00',
  }
  const meetingReadyCheck = {
    existingCode: [
      'lib/meeting-vault-acl.js',
      'lib/meeting-classification.js',
      'lib/security-access.js',
      'lib/drive-access-preflight.js',
      'lib/shared-candidate-extraction.js',
    ],
    existingDocs: [
      'docs/process/meeting-vault-acl-001-plan.md',
      MEETING_VAULT_ACL_SENSITIVITY_PHASE_A_PLAN_PATH,
      'docs/process/meeting-vault-acl.md',
      'docs/specs/2026-04-23-auth-tiers-vault.md',
      'docs/process/security-002-auth-tier-redaction-plan.md',
      'docs/process/meeting-vault-acl-001-phase-b-approval-packet.md',
    ],
    existingScripts: [
      'scripts/sync-meeting-notes-archive.mjs',
      'scripts/extract-meeting-transcript-candidates.mjs',
      'scripts/process-meeting-vault-acl-check.mjs',
      'scripts/process-drive-access-request-check.mjs',
      'scripts/meeting-notes-verify.mjs',
    ],
    existingPolicy: [
      'Training, all-hands, huddles, workshops, sales sessions, and broad team meetings are not sensitive by default.',
      'Leadership, owners, performance, compensation, termination, undisclosed-feedback, and named-person sensitive discussion is protected.',
      'Unknown/unclassified files stay blocked until classified.',
      'No Phase B Drive permission mutation without separate approval tied to the sensitivity-aware dry-run hash.',
    ],
    reused: [
      'Meeting metadata: meetingClass, privacyProfile, sensitiveMeetingCandidate.',
      'Candidate metadata: subjectPeople, sensitivity, minTier.',
      'SECURITY-002 subject_people/sensitivity/min_tier doctrine.',
      'Delegated Drive preflight and metadata-only proof ledger.',
    ],
    notRebuilt: [
      'Google Drive delegated helpers.',
      'Meeting extraction and archive sync.',
      'SECURITY-002 auth/tier/redaction.',
      'Current Sprint/backlog infrastructure.',
      'Phase B apply, request-access emails, and broad Drive cleanup.',
    ],
    exactGap: 'Phase A had a strict blanket ACL policy. It now needs sensitivity-aware dry-run proof and a new hash before any Phase B packet can be considered.',
    overBroadRisk: 'This can drift into a blanket 814-file permission repair, Drive mutation, request-access emails, broad Drive folder cleanup, filtered shared-comms access, or UI polish. This sprint stays dry-run/preflight only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-10T09:45:00-04:00',
  }

  return {
    sprint: {
      sprintId: FOUNDATION_CURRENT_SPRINT_ID,
      status: 'active',
      goal: FOUNDATION_CURRENT_SPRINT_GOAL,
      activeBlockerCardId: foundationSprintSystemDone
        ? (foundationSprintCadenceDone ? 'MEETING-VAULT-ACL-001' : FOUNDATION_SPRINT_CADENCE_CARD_ID)
        : FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      metadata: {
        overlayOnly: true,
        noSecondBacklog: true,
        sprintCommandView: true,
        executiveSummary: 'Foundation sprint is focused on resolving the raw meeting Drive ACL/vault blocker without unapproved Drive mutations. The command view must make the next card, current blocker, exit criteria, returned reason, and proof commands visible at a glance.',
        currentStatus: foundationSprintCadenceDone ? 'scoping_meeting_acl' : 'building_sprint_command_view',
        nextAction: foundationSprintCadenceDone
          ? MEETING_VAULT_ACL_SCOPING_NEXT_ACTION
          : 'Ship FOUNDATION-SPRINT-CADENCE-001, then return to MEETING-VAULT-ACL-001.',
        exitCriteria: FOUNDATION_SPRINT_EXIT_CRITERIA,
        doneVelocityFollowUpCardId: FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      },
    },
    items: [
      {
        cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
        order: 1,
        stage: normalizedStage,
        planRef: FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
        definitionOfDone: 'Current Sprint renders at the top of Recent Work from a backlog-backed overlay with exact stages, readiness checks, returned reasons, proof commands, readiness blocker, and not-next boundaries.',
        proofCommands: [
          'npm run process:foundation-sprint-system-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
          'npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-SYSTEM-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json --closeoutKey=foundation-sprint-system-v1 --commitRef=HEAD',
        ],
        readinessBlockerCleared: 'Foundation sprint execution-control gap.',
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: readyCheck,
        returnedReason: '',
        metadata: {
          closeoutKey: FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
        },
      },
      {
        cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID,
        order: 2,
        stage: normalizedCadenceStage,
        planRef: FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
        definitionOfDone: 'Current Sprint command view at the top of Recent Work shows executive sprint summary, sprint goal, current status, next card, current blocker, exit criteria, all five stages, card definition of done, proof commands, returned reason, and next action in a readable non-skinny layout.',
        proofCommands: [
          'npm run process:foundation-sprint-cadence-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
          'npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-CADENCE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-CADENCE-001.json --closeoutKey=foundation-sprint-cadence-v1 --commitRef=HEAD',
        ],
        readinessBlockerCleared: 'Sprint command visibility gap at the top of Recent Work.',
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: cadenceReadyCheck,
        returnedReason: '',
        metadata: {
          closeoutKey: FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
          exitCriteria: FOUNDATION_SPRINT_EXIT_CRITERIA,
        },
      },
      {
        cardId: 'MEETING-VAULT-ACL-001',
        order: 3,
        stage: meetingVaultStage,
        planRef: MEETING_VAULT_ACL_SENSITIVITY_PHASE_A_PLAN_PATH,
        definitionOfDone: 'Meeting raw Drive ACL/vault safety closes only when sensitivity-aware Phase A proves every protected in-scope file already safe and every unknown file classified, or separately approved Phase B mutates, rechecks, and records rollback proof.',
        nextAction: MEETING_VAULT_ACL_SCOPING_NEXT_ACTION,
        proofCommands: [
          'npm run meeting-notes:verify',
          'npm run process:meeting-vault-acl-check',
          'npm run process:foundation-done-test -- --report-only',
        ],
        readinessBlockerCleared: '',
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: meetingReadyCheck,
        returnedReason: `Sensitivity-aware Phase A dry-run remains blocking at hash ${MEETING_VAULT_ACL_SENSITIVITY_DRY_RUN_HASH}; Phase B approval path paused and Drive permission mutation is not approved.`,
        metadata: {
          nextAction: MEETING_VAULT_ACL_SCOPING_NEXT_ACTION,
          phaseBApproved: false,
          dryRunHash: MEETING_VAULT_ACL_SENSITIVITY_DRY_RUN_HASH,
          supersedesDryRunHash: 'bf950c74c80a1e0f5a2a8848fa2c39e6ecda8d89536770a7b2bf44110a88b8d5',
          sensitivityClassCounts: {
            standard_internal: 501,
            broad_non_sensitive: 95,
            protected_sensitive: 302,
          },
        },
      },
    ],
  }
}

export function buildSyntheticFoundationCurrentSprintProof() {
  const seed = buildDefaultFoundationSprintSeed({ stage: 'building_now' })
  const backlogItems = [
    {
      id: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      title: 'Build Current Sprint execution-control overlay',
      lane: 'executing',
      summary: 'Synthetic live backlog card.',
      statusNote: '',
    },
    {
      id: FOUNDATION_SPRINT_CADENCE_CARD_ID,
      title: 'Add real sprint cadence, executive summary, and exit review',
      lane: 'scoped',
      summary: 'Synthetic cadence card.',
      statusNote: '',
    },
    {
      id: 'MEETING-VAULT-ACL-001',
      title: 'Prove meeting raw Drive ACL/vault safety',
      lane: 'scoped',
      summary: 'Synthetic returned card.',
      statusNote: '',
    },
  ]
  const healthy = buildFoundationCurrentSprintStatus({
    sprint: seed.sprint,
    items: seed.items,
    backlogItems,
    closeouts: [],
  })
  const missingReadyCheck = buildFoundationCurrentSprintStatus({
    sprint: seed.sprint,
    items: [
      {
        ...seed.items[0],
        existingWorkCheck: { ...seed.items[0].existingWorkCheck, exactGap: '' },
      },
      seed.items[1],
    ],
    backlogItems,
    closeouts: [],
  })
  const missingReturnedReason = buildFoundationCurrentSprintStatus({
    sprint: seed.sprint,
    items: seed.items.map(item => item.cardId === 'MEETING-VAULT-ACL-001'
      ? {
          ...item,
          returnedReason: '',
        }
      : item),
    backlogItems,
    closeouts: [],
  })
  return {
    ok: healthy.status === 'healthy' &&
      missingReadyCheck.status !== 'healthy' &&
      missingReadyCheck.findings.some(item => item.check === 'existing_work_check_complete') &&
      missingReturnedReason.status !== 'healthy' &&
      missingReturnedReason.findings.some(item => item.check === 'returned_reason_required'),
    healthy,
    missingReadyCheck,
    missingReturnedReason,
  }
}

export function buildFoundationCurrentSprintStatus({
  sprint,
  items = [],
  backlogItems = [],
  closeouts = [],
} = {}) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(normalizeFoundationSprintItem)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : 9999
      const rightOrder = Number.isFinite(right.order) ? right.order : 9999
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.cardId.localeCompare(right.cardId)
    })
  const backlogMap = buildBacklogMap(backlogItems)
  const closeoutMap = buildCloseoutMap(closeouts)
  const findings = []

  if (!sprint) {
    findings.push(finding('active_sprint_exists', 'No active Current Sprint overlay exists.'))
  }

  const sprintStatus = normalizeText(sprint?.status)
  if (sprint && sprintStatus !== 'active') {
    findings.push(finding('active_sprint_status', `Expected active sprint status; found ${sprintStatus || 'missing'}.`))
  }

  if (sprint && !normalizeText(sprint.goal)) {
    findings.push(finding('sprint_goal_required', 'Active sprint has no goal.'))
  }

  if (sprint && !normalizeText(sprint.activeBlockerCardId || sprint.active_blocker_card_id)) {
    findings.push(finding('active_blocker_required', 'Active sprint has no active blocker card.'))
  }

  if (!normalizedItems.length) {
    findings.push(finding('sprint_items_required', 'Active sprint has no backlog-backed items.'))
  }

  const orders = new Set()
  let buildingNowCount = 0
  for (const item of normalizedItems) {
    const card = item.backlog || backlogMap.get(item.cardId)
    if (!stageKeys.has(item.stage)) {
      findings.push(finding('known_stage_required', `${item.cardId || 'missing'} uses unknown stage ${item.stage || 'missing'}.`))
    }
    if (!card) {
      findings.push(finding('live_backlog_card_required', `${item.cardId || 'missing'} does not resolve to a live backlog card.`))
    }
    if (!Number.isFinite(item.order) || item.order < 1) {
      findings.push(finding('sprint_order_required', `${item.cardId || 'missing'} has invalid sprint order.`))
    } else if (orders.has(item.order)) {
      findings.push(finding('sprint_order_unique', `${item.cardId || 'missing'} duplicates sprint order ${item.order}.`))
    } else {
      orders.add(item.order)
    }
    if (!item.definitionOfDone) {
      findings.push(finding('definition_of_done_required', `${item.cardId || 'missing'} has no definition of done.`))
    }
    if (!item.proofCommands.length) {
      findings.push(finding('proof_commands_required', `${item.cardId || 'missing'} has no proof commands.`))
    }
    if (!item.notNextBoundaries.length) {
      findings.push(finding('not_next_boundaries_required', `${item.cardId || 'missing'} has no not-next boundaries.`))
    }
    const notNextText = item.notNextBoundaries.join('\n')
    if (!/MEETING-VAULT-ACL-001 Phase B/.test(notNextText) || !/Drive permissions/.test(notNextText)) {
      findings.push(finding('not_next_drive_guard_required', `${item.cardId || 'missing'} does not explicitly block Meeting Vault Phase B and Drive permission mutation.`))
    }
    if (item.stage === 'sprint_ready' || item.stage === 'building_now') {
      const readiness = validateExistingWorkCheck(item.existingWorkCheck)
      if (!readiness.ok) {
        findings.push(finding('existing_work_check_complete', `${item.cardId || 'missing'} is missing existing-work/doctrine fields: ${readiness.missingFields.join(', ')}.`))
      }
    }
    if (item.stage === 'building_now') buildingNowCount += 1
    if (item.stage === 'returned' && !item.returnedReason) {
      findings.push(finding('returned_reason_required', `${item.cardId || 'missing'} is returned without a reason.`))
    }
    if (item.stage === 'done_this_sprint') {
      if (card?.lane !== 'done') {
        findings.push(finding('done_this_sprint_requires_done_backlog', `${item.cardId || 'missing'} is done this sprint but live backlog lane is ${card?.lane || 'missing'}.`))
      }
      if (!closeoutMap.has(item.cardId)) {
        findings.push(finding('done_this_sprint_requires_recent_work_closeout', `${item.cardId || 'missing'} is done this sprint without a matching Recent Work closeout.`))
      }
    }
  }

  const parallelApproved = normalizedItems.some(item => item.parallelApproved)
  if (buildingNowCount > 1 && !parallelApproved) {
    findings.push(finding('single_building_now_card', `Expected one Building Now card unless parallel work is approved; found ${buildingNowCount}.`))
  }

  const activeBlockerCardId = normalizeText(sprint?.activeBlockerCardId || sprint?.active_blocker_card_id)
  const activeBlocker = activeBlockerCardId
    ? (backlogMap.get(activeBlockerCardId) || normalizedItems.find(item => item.cardId === activeBlockerCardId)?.backlog || null)
    : null
  if (activeBlockerCardId && !activeBlocker) {
    findings.push(finding('active_blocker_live_backlog_card', `${activeBlockerCardId} does not resolve to a live backlog card.`))
  }

  const stageBuckets = FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => ({
    ...stage,
    items: normalizedItems
      .filter(item => item.stage === stage.key)
      .map(item => {
        const card = item.backlog || backlogMap.get(item.cardId) || null
        const closeout = closeoutMap.get(item.cardId)?.[0] || null
        const readiness = validateExistingWorkCheck(item.existingWorkCheck)
        return {
          ...item,
          stageLabel: stage.label,
          title: card?.title || 'Missing backlog card',
          backlogLane: card?.lane || 'missing_backlog_card',
          backlogPriority: card?.priority || null,
          backlogStatusNote: card?.statusNote || null,
          backlogNextAction: card?.nextAction || null,
          backlogText: backlogText(card),
          existingWorkCheckStatus: readiness.ok ? 'complete' : 'missing',
          existingWorkCheckMissingFields: readiness.missingFields,
          closeoutKey: closeout?.key || null,
          closeoutCommit: closeout?.commit || null,
          nextAction: item.nextAction || item.metadata?.nextAction || card?.nextAction || null,
        }
      }),
  }))
  const resolvedItems = stageBuckets
    .flatMap(stage => stage.items)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : 9999
      const rightOrder = Number.isFinite(right.order) ? right.order : 9999
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.cardId.localeCompare(right.cardId)
    })
  const stageCounts = FOUNDATION_CURRENT_SPRINT_STAGES.reduce((acc, stage) => {
    acc[stage.key] = normalizedItems.filter(item => item.stage === stage.key).length
    return acc
  }, {})
  const nextItem = resolvedItems.find(item => item.stage === 'building_now') ||
    resolvedItems.find(item => item.stage === 'sprint_ready') ||
    resolvedItems.find(item => item.stage === 'scoping') ||
    resolvedItems.find(item => item.stage === 'returned') ||
    null
  const returnedItems = resolvedItems.filter(item => item.stage === 'returned')
  const currentStatus = findings.length
    ? 'needs_attention'
    : nextItem?.stage === 'building_now'
      ? 'building'
      : nextItem?.stage === 'returned'
        ? 'blocked_returned'
        : nextItem?.stage === 'sprint_ready'
          ? 'sprint_ready'
          : nextItem?.stage === 'scoping'
            ? 'scoping'
            : 'complete'
  const sprintMetadata = sprint?.metadata && typeof sprint.metadata === 'object' ? sprint.metadata : {}
  const exitCriteria = normalizeArray(sprintMetadata.exitCriteria).length
    ? normalizeArray(sprintMetadata.exitCriteria)
    : FOUNDATION_SPRINT_EXIT_CRITERIA
  const nextAction = nextItem
    ? (nextItem.stage === 'returned' ? nextItem.returnedReason : nextItem.nextAction || nextItem.backlogNextAction) ||
      nextItem.definitionOfDone ||
      'Review the live backlog card for next action.'
    : normalizeText(sprintMetadata.nextAction) || 'No next card is resolved.'
  const executiveSummary = normalizeText(sprintMetadata.executiveSummary) ||
    `Sprint status is ${currentStatus.replace(/_/g, ' ')}. Next card is ${nextItem?.cardId || 'none'}, current blocker is ${activeBlockerCardId || 'none'}, and Drive permission mutation remains unapproved.`

  return {
    status: findings.length ? 'risk' : 'healthy',
    sprintId: normalizeText(sprint?.sprintId || sprint?.sprint_id),
    sprintStatus,
    goal: normalizeText(sprint?.goal),
    activeBlocker: activeBlockerCardId
      ? {
          cardId: activeBlockerCardId,
          title: activeBlocker?.title || 'Missing backlog card',
          lane: activeBlocker?.lane || 'missing_backlog_card',
          nextAction: activeBlocker?.nextAction || null,
        }
      : null,
    stageRegistry: FOUNDATION_CURRENT_SPRINT_STAGES,
    stages: stageBuckets,
    items: normalizedItems,
    cadence: {
      executiveSummary,
      sprintGoal: normalizeText(sprint?.goal),
      currentStatus,
      currentStatusDetail: currentStatus.replace(/_/g, ' '),
      nextCard: nextItem
        ? {
            cardId: nextItem.cardId,
            title: nextItem.title,
            stage: nextItem.stage,
            stageLabel: nextItem.stageLabel,
            lane: nextItem.backlogLane,
            nextAction,
          }
        : null,
      currentBlocker: activeBlockerCardId
        ? {
            cardId: activeBlockerCardId,
            title: activeBlocker?.title || 'Missing backlog card',
            lane: activeBlocker?.lane || 'missing_backlog_card',
            nextAction: activeBlocker?.nextAction || null,
          }
        : null,
      exitCriteria,
      stageCounts,
      returnedCount: returnedItems.length,
      nextAction,
      noDriveMutationApproved: true,
    },
    summary: {
      overlayOnly: true,
      stageCount: FOUNDATION_CURRENT_SPRINT_STAGES.length,
      itemCount: normalizedItems.length,
      buildingNowCount,
      returnedCount: normalizedItems.filter(item => item.stage === 'returned').length,
      doneThisSprintCount: normalizedItems.filter(item => item.stage === 'done_this_sprint').length,
      stageCounts,
      currentStatus,
      nextCardId: nextItem?.cardId || null,
      activeBlockerCardId,
      readyCheckRequiredFields: FOUNDATION_EXISTING_WORK_CHECK_FIELDS.length,
      findingsCount: findings.length,
    },
    doneVelocity: {
      status: 'follow_up',
      followUpCardId: FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      reason: 'Reliable done-transition velocity graph stays out of V1 unless the data is cheap and honest.',
    },
    findings,
  }
}
