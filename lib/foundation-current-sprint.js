import {
  SOURCE_MATURITY_GRID_APPROVAL_PATH,
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
} from './source-maturity-grid.js'
import {
  SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID as SOURCE_EXTRACTION_COVERAGE_CARD_ID_VALUE,
  SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
} from './source-extraction-coverage.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID as SOURCE_COVERAGE_CLOSEOUT_CARD_ID_VALUE,
  SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
  SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
} from './source-coverage-closeout.js'
import {
  MARKETING_SOURCE_MAP_APPROVAL_PATH,
  MARKETING_SOURCE_MAP_CARD_ID as MARKETING_SOURCE_MAP_CARD_ID_VALUE,
  MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
  MARKETING_SOURCE_MAP_PLAN_PATH,
  MARKETING_SOURCE_MAP_SCRIPT_PATH,
} from './marketing-source-map.js'
import {
  BRAND_STACK_APPROVAL_PATH,
  BRAND_STACK_CARD_ID as BRAND_STACK_CARD_ID_VALUE,
  BRAND_STACK_CLOSEOUT_KEY,
  BRAND_STACK_PLAN_PATH,
  BRAND_STACK_SCRIPT_PATH,
} from './brand-stack.js'
import {
  TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID as TIER_BEHAVIORAL_COMPLETION_CARD_ID_VALUE,
  TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
  TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
  TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
} from './tier-behavioral-completion.js'
import {
  VERIFICATION_RUNS_APPROVAL_PATH,
  VERIFICATION_RUNS_CARD_ID as VERIFICATION_RUNS_CARD_ID_VALUE,
  VERIFICATION_RUNS_CLOSEOUT_KEY,
  VERIFICATION_RUNS_PLAN_PATH,
  VERIFICATION_RUNS_SCRIPT_PATH,
} from './verification-runs.js'
import {
  PER_USER_CHANGELOG_APPROVAL_PATH,
  PER_USER_CHANGELOG_CARD_ID as PER_USER_CHANGELOG_CARD_ID_VALUE,
  PER_USER_CHANGELOG_CLOSEOUT_KEY,
  PER_USER_CHANGELOG_NEXT_CARD_ID,
  PER_USER_CHANGELOG_PLAN_PATH,
  PER_USER_CHANGELOG_SCRIPT_PATH,
} from './per-user-changelog.js'

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
export const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12'
export const VERIFY_GATE_TIERING_CARD_ID = 'VERIFY-GATE-TIERING-001'
export const VERIFY_GATE_TIERING_PLAN_PATH = 'docs/process/verify-gate-tiering-001-plan.md'
export const VERIFY_GATE_TIERING_SCRIPT_PATH = 'scripts/process-verify-gate-tiering-check.mjs'
export const REBUILD_PLAN_RECONCILE_CARD_ID = 'REBUILD-PLAN-RECONCILE-001'
export const REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY = 'rebuild-plan-reconcile-v1'
export const REBUILD_PLAN_RECONCILE_PLAN_PATH = 'docs/process/rebuild-plan-reconcile-001-plan.md'
export const REBUILD_PLAN_RECONCILE_APPROVAL_PATH = 'docs/process/approvals/REBUILD-PLAN-RECONCILE-001.json'
export const REBUILD_PLAN_RECONCILE_SCRIPT_PATH = 'scripts/process-rebuild-plan-reconcile-check.mjs'
export const PLAN_CRITIC_REPLACEMENT_CARD_ID = 'PLAN-CRITIC-REPLACEMENT-001'
export const PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY = 'plan-critic-replacement-v1'
export const PLAN_CRITIC_REPLACEMENT_PLAN_PATH = 'docs/process/plan-critic-replacement-001-plan.md'
export const PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH = 'docs/process/approvals/PLAN-CRITIC-REPLACEMENT-001.json'
export const PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH = 'scripts/process-plan-critic-check.mjs'
export const PLAN_CRITIC_DECISION_TREE_PATH = 'docs/process/foundation-gate-decision-tree.md'
export const SECURITY_BEHAVIOR_PROOF_CARD_ID = 'SECURITY-BEHAVIOR-PROOF-001'
export const SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY = 'security-behavior-proof-v1'
export const SECURITY_BEHAVIOR_PROOF_PLAN_PATH = 'docs/process/security-behavior-proof-001-plan.md'
export const SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH = 'docs/process/approvals/SECURITY-BEHAVIOR-PROOF-001.json'
export const SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH = 'scripts/process-security-behavior-proof-check.mjs'
export const VERIFIER_BEHAVIOR_SWEEP_CARD_ID = 'VERIFIER-BEHAVIOR-SWEEP-001'
export const VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY = 'verifier-behavior-sweep-v1'
export const VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH = 'docs/process/verifier-behavior-sweep-001-plan.md'
export const VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-BEHAVIOR-SWEEP-001.json'
export const VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH = 'scripts/process-verifier-behavior-sweep-check.mjs'
export const STRATEGY_HUB_MEETING_READY_CARD_ID = 'STRATEGY-HUB-MEETING-READY-001'
export const STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY = 'strategy-hub-meeting-ready-v1'
export const STRATEGY_HUB_MEETING_READY_PLAN_PATH = 'docs/process/strategy-hub-meeting-ready-001-plan.md'
export const STRATEGY_HUB_MEETING_READY_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-HUB-MEETING-READY-001.json'
export const STRATEGY_HUB_MEETING_READY_SCRIPT_PATH = 'scripts/process-strategy-hub-meeting-ready-check.mjs'
export const AVATAR_IMPORT_CARD_ID = 'AVATAR-IMPORT-001'
export const AVATAR_IMPORT_CLOSEOUT_KEY = 'avatar-import-v1'
export const AVATAR_IMPORT_PLAN_PATH = 'docs/process/avatar-import-001-plan.md'
export const AVATAR_IMPORT_APPROVAL_PATH = 'docs/process/approvals/AVATAR-IMPORT-001.json'
export const AVATAR_IMPORT_SCRIPT_PATH = 'scripts/process-avatar-import-check.mjs'
export const AUTO_DEPLOY_ROLLBACK_CARD_ID = 'AUTO-DEPLOY-ROLLBACK-001'
export const AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY = 'auto-deploy-rollback-v1'
export const AUTO_DEPLOY_ROLLBACK_PLAN_PATH = 'docs/process/auto-deploy-rollback-001-plan.md'
export const AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH = 'docs/process/approvals/AUTO-DEPLOY-ROLLBACK-001.json'
export const AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH = 'scripts/process-auto-deploy-rollback-check.mjs'
export const AUTO_DEPLOY_ROLLBACK_RUNNER_PATH = 'scripts/auto-deploy-rollback.mjs'
export const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12'
export const SOURCE_EXTRACTION_COVERAGE_CARD_ID = SOURCE_EXTRACTION_COVERAGE_CARD_ID_VALUE
export const SOURCE_COVERAGE_CLOSEOUT_CARD_ID = SOURCE_COVERAGE_CLOSEOUT_CARD_ID_VALUE
export const MARKETING_SOURCE_MAP_CARD_ID = MARKETING_SOURCE_MAP_CARD_ID_VALUE
export const BRAND_STACK_CARD_ID = BRAND_STACK_CARD_ID_VALUE
export const TIER_BEHAVIORAL_COMPLETION_CARD_ID = TIER_BEHAVIORAL_COMPLETION_CARD_ID_VALUE
export const VERIFICATION_RUNS_CARD_ID = VERIFICATION_RUNS_CARD_ID_VALUE
export const PER_USER_CHANGELOG_CARD_ID = PER_USER_CHANGELOG_CARD_ID_VALUE
export const FOUNDATION_UI_COMPLETE_CARD_ID = 'FOUNDATION-UI-COMPLETE-001'
export const FOUNDATION_CURRENT_SPRINT_GOAL = 'Make Foundation verification proportional, then convert Foundation READY from process proof into behavior proof and ship one owner-only Strategy operator loop.'
export const FOUNDATION_SOURCE_ONCE_OVER_GOAL = 'Finish Foundation depth by making every source maturity stage visible, then closing extraction, source coverage, marketing-source, security/audit, stale-verification, restricted-decision, and UI gaps without product expansion.'
export const MEETING_VAULT_ACL_SENSITIVITY_PHASE_A_PLAN_PATH = 'docs/process/meeting-vault-acl-001-sensitivity-aware-phase-a.md'

export const FOUNDATION_CURRENT_SPRINT_STAGES = [
  { key: 'scoping', label: 'Scoping' },
  { key: 'sprint_ready', label: 'Sprint Ready' },
  { key: 'building_now', label: 'Building Now' },
  { key: 'returned', label: 'Returned' },
  { key: 'done_this_sprint', label: 'Done This Sprint' },
]
export const FOUNDATION_CURRENT_SPRINT_COMMAND_STAGE_KEYS = ['scoping', 'sprint_ready', 'building_now']
export const FOUNDATION_CURRENT_SPRINT_ACTIVE_CARD_IDS = [
  VERIFY_GATE_TIERING_CARD_ID,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  AVATAR_IMPORT_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
]

export const FOUNDATION_SOURCE_ONCE_OVER_ACTIVE_CARD_IDS = [
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  MARKETING_SOURCE_MAP_CARD_ID,
  BRAND_STACK_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  VERIFICATION_RUNS_CARD_ID,
  PER_USER_CHANGELOG_CARD_ID,
  PER_USER_CHANGELOG_NEXT_CARD_ID,
  FOUNDATION_UI_COMPLETE_CARD_ID,
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
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not mutate Google Drive permissions.',
  'Do not send request-access emails.',
  'Do not start Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, filtered comms access, public access, broad sprint analytics, or broad UI polish.',
  'Do not treat Foundation READY as old-system parity or broad multi-user access.',
]

export const FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES = [
  'Do not build Reply Parser or Watching Items in this sprint.',
  'Do not expand Strategy Hub beyond displaying Foundation source health.',
  'Do not build Telegram/mobile assistants, Department Directors, Master Director, scouts, or marketing production operators.',
  'Do not work MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, send request-access emails, or restart historical Meeting Vault ACL cleanup.',
  'Do not claim Foundation built just because the source grid exists; the grid exposes the next extraction/source/UI gaps.',
]

export const FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID = 'FOUNDATION-DONE-VELOCITY-001'
export const FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID = 'FOUNDATION-SURFACE-UPDATES-001'
export const MEETING_VAULT_ACL_SENSITIVITY_DRY_RUN_HASH = '31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d'
export const MEETING_VAULT_ACL_SCOPING_NEXT_ACTION = 'Scope the next safe MEETING-VAULT-ACL-001 step: review the sensitivity-aware Phase B packet, pick the first safe approval batch or keep it blocked, confirm exact approval wording, confirm rollback/recheck proof, and do not mutate Drive permissions.'

export const FOUNDATION_SPRINT_EXIT_CRITERIA = [
  'Current Sprint command view still shows executive summary, sprint goal, current status, next card, current blocker, exit criteria, proof commands, and next action.',
  'Protected Foundation changes use proportional verification: static, focused, or full ship gate based on blast radius.',
  'Rebuild plan, current state, Current Sprint, live backlog, and readiness wording all agree on the next sprint order.',
  'Foundation READY is explicitly owner-only Strategy re-entry, not old-system parity or broad team access.',
  'Plan Critic replacement is done for v1 and rejects weak plans before the verifier behavior sweep can close.',
  'Security behavior proof includes owner, ops, sales, unknown user, admin-token/system, and subject-person leak cases.',
  'Top P0 verifier checks moved from text-marker proof toward function/API/process behavior proof.',
  'One Strategy Hub meeting-ready operator loop consumes existing source-backed atoms/retrieval/synthesis/action records.',
  'Old-system carry-forward gaps are carded, with avatar import pulled as the cheap in-sprint data carry-forward.',
  'No Drive permission mutation, request-access email, public access, non-Tier-1 shared-comms access, or historical Meeting Vault cleanup is approved by this sprint.',
]

export const FOUNDATION_SOURCE_ONCE_OVER_EXIT_CRITERIA = [
  'Every source contract appears in a seven-stage maturity grid: connected, trusted, monitored, extracted, atomized, synthesized, routed.',
  'Extraction coverage gaps are visible by source with last-success or explicit failure/deferred reason, without reopening already done EXTRACT-RUN-HARDENING-001.',
  'Marketing foundation data is mapped by brand lane and avatar source without building the marketing production pipeline.',
  'Tier behavior, per-user audit, stale verification, and restricted-decision gaps are scoped or proven before broad multi-user/product work resumes.',
  'Foundation UI shows source maturity, extraction gaps, marketing source map, security/audit proof, stale-finding cleanup, and restricted-decision status without needing a separate audit.',
  'No Reply/Watching Loop, Telegram/mobile assistant, Directors, broad Strategy Hub, Marketing production, or Drive ACL mutation is pulled before the Foundation depth pass closes.',
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

export function buildDefaultFoundationSprintSeed({ stage = 'done_this_sprint' } = {}) {
  const activeStage = stageKeys.has(stage) ? stage : 'done_this_sprint'
  const readyCheck = {
    existingCode: [
      'lib/foundation-db.js',
      'lib/foundation-build-log.js',
      'server.js',
      'public/foundation.js',
      'public/styles.css',
      'scripts/foundation-verify.mjs',
      'lib/process-git-hooks.js',
      'lib/process-verify-gate-tiering.js',
    ],
    existingDocs: [
      VERIFY_GATE_TIERING_PLAN_PATH,
      'docs/process/foundation-sprint-review-001.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      VERIFY_GATE_TIERING_SCRIPT_PATH,
      'scripts/backlog-hygiene.mjs',
      'scripts/process-foundation-done-test.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Live Backlog is task truth.',
      'Current Sprint is an overlay on live backlog truth, not a second backlog.',
      'Scope, plan, review at 9.8, then execute.',
      'Foundation READY means owner-only Strategy re-entry, not old-system parity.',
      'Foundation verification should be automatic and proportional to blast radius.',
    ],
    reused: [
      'Backlog cards remain the card source of truth.',
      'Recent Work remains the shipped-build closeout feed.',
      'Foundation hub remains the dashboard API envelope.',
      'Existing security, readiness, synthesis, Action Router, and Meeting Vault forward-flow proof remain in place.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No broad Foundation UI redesign.',
      'No Drive ACL mutation path.',
      'No broad Strategy, Sales, Agent Feedback, Scoper, Agent Factory, corpus, researcher, video-mining, filtered comms, or public-access expansion.',
    ],
    exactGap: 'Foundation READY now passes, but audits found command-truth drift, behavior-proof gaps, old-system capability gaps, and an all-or-nothing verification workflow that must be fixed before product work resumes.',
    overBroadRisk: 'This could drift into another meta-only sprint or broad hub expansion. The sprint must produce behavior proof and one owner-only Strategy operator loop.',
    readyBy: 'Steve audit consolidation approval + Codex planning pass',
    readyAt: '2026-05-12T00:00:00-04:00',
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
      activeBlockerCardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      metadata: {
        overlayOnly: true,
        noSecondBacklog: true,
        sprintCommandView: true,
        executiveSummary: 'Audit consensus says Foundation is real but drifting toward process proof over product behavior. This sprint first makes verification proportional so small changes still get automatic focused proof, then locks one command truth, restores Plan Critic pressure, hardens security/verifier behavior proof, and proves the spine through one owner-only Strategy meeting workflow.',
        currentStatus: 'sprint_cards_done_auto_deploy_pinned',
        nextAction: 'AUTO-DEPLOY-ROLLBACK-001 is done for v1. Keep the active blocker pinned here for sprint closeout, then review whether REPLY-WATCHING-LOOP-001 is the next product behavior card.',
        exitCriteria: FOUNDATION_SPRINT_EXIT_CRITERIA,
        doneVelocityFollowUpCardId: FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      },
    },
    items: [
      {
        cardId: VERIFY_GATE_TIERING_CARD_ID,
        order: 1,
        stage: activeStage,
        planRef: VERIFY_GATE_TIERING_PLAN_PATH,
        definitionOfDone: 'Protected Foundation paths are classified into static, focused, or full verification tiers; pre-push accepts recorded focused proof for non-full changes and still fails closed for full-risk files without ship proof or explicit bypass.',
        proofCommands: [
          'npm run process:verify-gate-tiering-check',
          'npm run backlog:hygiene -- --json',
        ],
        readinessBlockerCleared: 'All-or-nothing Foundation verification slows small safe changes and encourages bypasses.',
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: readyCheck,
        returnedReason: '',
        metadata: {
          auditVerdict: 'process proof over product behavior',
          operatorCorrection: 'automatic proof should be proportional to blast radius',
        },
      },
      {
        cardId: REBUILD_PLAN_RECONCILE_CARD_ID,
        order: 2,
        stage: 'done_this_sprint',
        planRef: REBUILD_PLAN_RECONCILE_PLAN_PATH,
        definitionOfDone: 'Current plan, current state, Current Sprint, readiness wording, and live backlog all agree on the audit-consensus sprint order and old-system carry-forward gaps are carded.',
        proofCommands: [
          'npm run backlog:hygiene -- --json',
          'npm run process:rebuild-plan-reconcile-check',
        ],
        readinessBlockerCleared: 'Conflicting command truth after Foundation READY.',
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: readyCheck,
        returnedReason: '',
        metadata: {
          auditVerdict: 'process proof over product behavior',
        },
      },
      {
        cardId: PLAN_CRITIC_REPLACEMENT_CARD_ID,
        order: 3,
        stage: 'done_this_sprint',
        planRef: PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
        definitionOfDone: 'A new Plan Critic gate reviews durable build plans before implementation and rejects weak behavioral proof, missing acceptance criteria, and over-broad scopes.',
        proofCommands: [
          'npm run process:plan-critic-check',
          'npm run backlog:hygiene -- --json',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        readinessBlockerCleared: 'Weak plans were reaching implementation with process proof instead of product behavior.',
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
          decisionTreePath: PLAN_CRITIC_DECISION_TREE_PATH,
          auditLesson: 'behavior-not-substring proof is required before P0 work can pass Plan Critic.',
        },
      },
      {
        cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
        order: 4,
        stage: 'done_this_sprint',
        planRef: SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
        definitionOfDone: 'Black-box access matrix proves intended live route behavior for owner, ops, sales, unknown user, admin-token/system, and subject-person leak cases.',
        proofCommands: [
          'npm run process:security-behavior-proof-check',
          'npm run process:security-002-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        readinessBlockerCleared: 'SECURITY-002 was wired, but live route-boundary behavior for owner, ops, sales, unknown user, admin-token/system, and subject-person leaks was under-proven.',
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
          proofLibrary: 'lib/security-behavior-proof.js',
          auditLesson: 'assertTier is wired; confidence now comes from route behavior and subject-person proof, not direct grep.',
        },
      },
      {
        cardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
        order: 5,
        stage: 'done_this_sprint',
        planRef: VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH,
        definitionOfDone: 'Top P0 verifier checks are converted from closeout/source-string checks into function, API, or focused-process behavior proof where feasible.',
        proofCommands: [
          'npm run process:verifier-behavior-sweep-check',
          'npm run foundation:verify',
          'npm run backlog:hygiene -- --json',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        readinessBlockerCleared: 'Highest-risk P0 closeouts were still too dependent on text markers and status-note proof.',
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
          proofLibrary: 'lib/verifier-behavior-sweep.js',
          auditLesson: 'Top P0 checks need behavior proof coverage, not only current-state or source-string assertions.',
        },
      },
      {
        cardId: STRATEGY_HUB_MEETING_READY_CARD_ID,
        order: 6,
        stage: 'done_this_sprint',
        planRef: STRATEGY_HUB_MEETING_READY_PLAN_PATH,
        definitionOfDone: 'One owner-only Strategy meeting view consumes existing source-backed facts, retrieval, synthesis, and Action Router records in a way Steve can use live.',
        proofCommands: [
          'npm run process:strategy-hub-meeting-ready-check',
          'npm run intelligence:retrieval-eval',
          'npm run process:foundation-done-test -- --json',
          'npm run foundation:verify',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        readinessBlockerCleared: 'Foundation READY needed one product proof: a source-backed owner-only Strategy meeting packet, not just process/verifier proof.',
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
          proofLibrary: 'lib/strategy-hub-meeting-ready.js',
          auditLesson: 'Owner-only Strategy re-entry needs product behavior proof through a meeting packet, not only process proof.',
        },
      },
      {
        cardId: AVATAR_IMPORT_CARD_ID,
        order: 7,
        stage: 'done_this_sprint',
        planRef: AVATAR_IMPORT_PLAN_PATH,
        definitionOfDone: 'The old 10 RETAIN and 5 ATTRACT avatars are imported or represented as governed, source-backed avatar registry records without starting the full marketing pipeline.',
        proofCommands: [
          'npm run process:avatar-import-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: AVATAR_IMPORT_CLOSEOUT_KEY,
          proofLibrary: 'lib/marketing-avatar-registry.js',
          auditLesson: 'Old-system avatar value should be imported as governed source-backed data before marketing production resumes.',
        },
      },
      {
        cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
        order: 8,
        stage: 'done_this_sprint',
        planRef: AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
        definitionOfDone: 'Mac mini deploy reliability has a guarded dry-run/apply runner, health-check path, rollback-to-previous-SHA path, and behavior proof.',
        proofCommands: [
          'npm run process:auto-deploy-rollback-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: readyCheck,
        metadata: {
          closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
          proofLibrary: 'lib/auto-deploy-rollback.js',
          runner: AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
          reliabilityRisk: 'A bad commit should not require Steve to notice and recover production manually.',
          note: 'V1 does not install a permanent periodic auto-pull LaunchAgent; it ships the guarded runner and rollback proof first.',
        },
      },
    ],
  }
}

export function buildFoundationSourceOnceOverSprintSeed({
  sourceMaturityStage = 'building_now',
  sourceExtractionCoverageStage = null,
  sourceCoverageCloseoutStage = null,
  marketingSourceMapStage = null,
  brandStackStage = null,
  tierBehavioralCompletionStage = null,
  verificationRunsStage = null,
  perUserChangelogStage = null,
} = {}) {
  const normalizedSourceMaturityStage = stageKeys.has(sourceMaturityStage) ? sourceMaturityStage : 'building_now'
  const sourceMaturityDone = normalizedSourceMaturityStage === 'done_this_sprint'
  const normalizedSourceExtractionCoverageStage = stageKeys.has(sourceExtractionCoverageStage)
    ? sourceExtractionCoverageStage
    : sourceMaturityDone
      ? 'building_now'
      : 'sprint_ready'
  const sourceExtractionCoverageDone = normalizedSourceExtractionCoverageStage === 'done_this_sprint'
  const normalizedSourceCoverageCloseoutStage = stageKeys.has(sourceCoverageCloseoutStage)
    ? sourceCoverageCloseoutStage
    : sourceExtractionCoverageDone
      ? 'building_now'
      : 'sprint_ready'
  const sourceCoverageCloseoutDone = normalizedSourceCoverageCloseoutStage === 'done_this_sprint'
  const normalizedMarketingSourceMapStage = stageKeys.has(marketingSourceMapStage)
    ? marketingSourceMapStage
    : sourceCoverageCloseoutDone
      ? 'building_now'
      : 'sprint_ready'
  const marketingSourceMapDone = normalizedMarketingSourceMapStage === 'done_this_sprint'
  const normalizedBrandStackStage = stageKeys.has(brandStackStage)
    ? brandStackStage
    : marketingSourceMapDone
      ? 'building_now'
      : 'sprint_ready'
  const brandStackDone = normalizedBrandStackStage === 'done_this_sprint'
  const normalizedTierBehavioralCompletionStage = stageKeys.has(tierBehavioralCompletionStage)
    ? tierBehavioralCompletionStage
    : brandStackDone
      ? 'building_now'
      : 'sprint_ready'
  const tierBehavioralCompletionDone = normalizedTierBehavioralCompletionStage === 'done_this_sprint'
  const normalizedVerificationRunsStage = stageKeys.has(verificationRunsStage)
    ? verificationRunsStage
    : tierBehavioralCompletionDone
      ? 'building_now'
      : 'sprint_ready'
  const verificationRunsDone = normalizedVerificationRunsStage === 'done_this_sprint'
  const normalizedPerUserChangelogStage = stageKeys.has(perUserChangelogStage)
    ? perUserChangelogStage
    : verificationRunsDone
      ? 'building_now'
      : 'sprint_ready'
  const perUserChangelogDone = normalizedPerUserChangelogStage === 'done_this_sprint'
  const activeBlockerCardId = sourceExtractionCoverageDone
    ? sourceCoverageCloseoutDone
      ? marketingSourceMapDone
        ? brandStackDone
          ? tierBehavioralCompletionDone
            ? verificationRunsDone
              ? perUserChangelogDone
                ? PER_USER_CHANGELOG_NEXT_CARD_ID
                : PER_USER_CHANGELOG_CARD_ID
              : VERIFICATION_RUNS_CARD_ID
            : TIER_BEHAVIORAL_COMPLETION_CARD_ID
          : BRAND_STACK_CARD_ID
        : MARKETING_SOURCE_MAP_CARD_ID
      : SOURCE_COVERAGE_CLOSEOUT_CARD_ID
    : sourceMaturityDone
      ? SOURCE_EXTRACTION_COVERAGE_CARD_ID
      : SOURCE_MATURITY_GRID_CARD_ID
  const sourceOnceOverReadyCheck = {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-lifecycle.js',
      'lib/foundation-db.js',
      'server.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
    ],
    existingDocs: [
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/specs/data-source-maturity-model.md',
      SOURCE_MATURITY_GRID_PLAN_PATH,
      SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
      SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
      MARKETING_SOURCE_MAP_PLAN_PATH,
      BRAND_STACK_PLAN_PATH,
      TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
      VERIFICATION_RUNS_PLAN_PATH,
      PER_USER_CHANGELOG_PLAN_PATH,
    ],
    existingScripts: [
      SOURCE_MATURITY_GRID_SCRIPT_PATH,
      SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
      SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
      MARKETING_SOURCE_MAP_SCRIPT_PATH,
      BRAND_STACK_SCRIPT_PATH,
      TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
      VERIFICATION_RUNS_SCRIPT_PATH,
      PER_USER_CHANGELOG_SCRIPT_PATH,
      'scripts/process-source-lifecycle-completion-check.mjs',
      'scripts/process-extract-run-hardening-check.mjs',
      'scripts/process-foundation-ship.mjs',
    ],
    existingPolicy: [
      'Foundation READY means owner-only Strategy re-entry, not full Foundation built.',
      'Every durable Foundation build starts from a backlog card, approved plan, and behavior proof.',
      'Live source contracts and extraction control are source truth; markdown audits are context only.',
      'Source depth follows connect, verify boundary, understand business meaning, extract, synthesize, route, close loop.',
    ],
    reused: [
      'Existing 35 source contracts.',
      'Existing source lifecycle completion classifications.',
      'Existing extraction-control targets and run ledger.',
      'Existing shared-comms coverage, intelligence atoms, synthesis facts, synthesis items, and action routes.',
    ],
    notRebuilt: [
      'No new source connector from SOURCE-MATURITY-GRID-001.',
      'No broad product UI or Strategy Hub expansion.',
      'No Reply/Watching Loop or marketing production pipeline.',
      'No Drive ACL mutation or request-access email.',
    ],
    exactGap: 'Foundation READY is green, but Steve needs one UI/API view showing every source maturity stage and exactly which source-depth gaps remain before calling Foundation built.',
    overBroadRisk: 'This sprint can drift into product work or broad source ingestion. V1 must expose source maturity and move the next gap card into the sprint, not silently build new connectors.',
    readyBy: 'Steve walk-away approval plus Plan Critic gate',
    readyAt: '2026-05-12T12:00:00-04:00',
  }

  return {
    sprint: {
      sprintId: FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID,
      status: 'active',
      goal: FOUNDATION_SOURCE_ONCE_OVER_GOAL,
      activeBlockerCardId,
      metadata: {
        overlayOnly: true,
        noSecondBacklog: true,
        sprintCommandView: true,
        executiveSummary: 'This is the Foundation depth sprint. It pauses product-adjacent expansion and makes source maturity, extraction coverage, marketing source truth, tier/audit safety, stale verification, restricted decisions, and the final Foundation UI once-over explicit.',
        currentStatus: sourceExtractionCoverageDone
          ? sourceCoverageCloseoutDone
            ? marketingSourceMapDone
              ? brandStackDone
                ? tierBehavioralCompletionDone
                  ? verificationRunsDone
                    ? perUserChangelogDone
                      ? 'per_user_changelog_done_next_restricted_decisions'
                      : 'verification_runs_done_next_per_user_changelog'
                    : 'tier_behavioral_completion_done_next_verification_runs'
                  : 'brand_stack_done_next_tier_behavioral_completion'
                : 'marketing_source_map_done_next_brand_stack'
              : 'source_coverage_closeout_done_next_marketing_source_map'
            : 'source_extraction_coverage_done_next_source_closeout'
          : sourceMaturityDone
            ? 'source_maturity_grid_done_next_extraction_coverage'
            : 'source_maturity_grid_building_now',
        nextAction: tierBehavioralCompletionDone
          ? verificationRunsDone
            ? perUserChangelogDone
              ? 'Pull DECISION-RESTRICTED-QUEUE-001 next and sequester personnel/comp/performance decisions before broader routing.'
              : 'Pull PER-USER-CHANGELOG-001 next and define the write_audit_log equivalent before broader team access resumes.'
            : 'Pull VERIFICATION-RUNS-001 next and turn stale research/findings cleanup into an automatic verification run.'
          : brandStackDone
          ? 'Pull TIER-BEHAVIORAL-COMPLETION-001 next and decide which first non-owner reads stay owner-only or get filtered access.'
          : marketingSourceMapDone
          ? 'Pull BRAND-STACK-001 next and model brand entities plus Brand Guardian boundaries.'
          : sourceCoverageCloseoutDone
            ? 'Pull MARKETING-SOURCE-MAP-001 next and map avatars plus marketing source contracts to brand lanes.'
          : sourceExtractionCoverageDone
            ? 'Pull SOURCE-COVERAGE-CLOSEOUT-001 next and decide/fix/defer every non-green source row.'
          : sourceMaturityDone
            ? 'Pull SOURCE-EXTRACTION-COVERAGE-001 next and close the extraction coverage gaps exposed by the grid.'
            : 'Build SOURCE-MATURITY-GRID-001 first so every source gap is visible before more Foundation work starts.',
        exitCriteria: FOUNDATION_SOURCE_ONCE_OVER_EXIT_CRITERIA,
        previousSprintId: FOUNDATION_CURRENT_SPRINT_ID,
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
      },
    },
    items: [
      {
        cardId: SOURCE_MATURITY_GRID_CARD_ID,
        order: 1,
        stage: normalizedSourceMaturityStage,
        planRef: SOURCE_MATURITY_GRID_PLAN_PATH,
        definitionOfDone: 'Foundation exposes a source maturity grid for every source contract with connected/trusted/monitored/extracted/atomized/synthesized/routed stages, top gaps, API/UI rendering, and behavior proof.',
        proofCommands: [
          'npm run process:source-maturity-grid-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Steve cannot tell whether Foundation is built per source without a seven-stage source maturity scorecard.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
          approvalRef: SOURCE_MATURITY_GRID_APPROVAL_PATH,
          stageModel: 'connected -> trusted -> monitored -> extracted -> atomized -> synthesized -> routed',
        },
      },
      {
        cardId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
        order: 2,
        stage: normalizedSourceExtractionCoverageStage,
        planRef: SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
        definitionOfDone: 'Extraction coverage for every source in the grid has last-success, failure, deferred, or not-required status, and retry/cursor/daily-volume gaps are surfaced through existing extraction-control behavior.',
        proofCommands: [
          'npm run process:source-extraction-coverage-check',
          'npm run process:extract-run-hardening-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Connected sources are not enough; extraction needs visible last-success or explicit failure/deferred reason per source.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
          approvalRef: SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
          usesExistingCloseout: 'EXTRACT-RUN-HARDENING-001 remains done for v1; this card closes coverage visibility and source-specific gaps.',
        },
      },
      {
        cardId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
        order: 3,
        stage: normalizedSourceCoverageCloseoutStage,
        planRef: SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
        definitionOfDone: 'Every non-green source maturity row is advanced one stage, explicitly deferred with blocker card, or marked not required for current Foundation depth.',
        proofCommands: [
          'npm run process:source-coverage-closeout-check',
          'npm run process:source-lifecycle-completion-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'The grid must lead to decisions instead of becoming another dashboard.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
          approvalRef: SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
        },
      },
      {
        cardId: MARKETING_SOURCE_MAP_CARD_ID,
        order: 4,
        stage: normalizedMarketingSourceMapStage,
        planRef: MARKETING_SOURCE_MAP_PLAN_PATH,
        definitionOfDone: 'Imported avatars and marketing sources are mapped to brand lanes without building marketing production.',
        proofCommands: [
          'npm run process:marketing-source-map-check',
          'npm run process:avatar-import-check',
          'npm run backlog:hygiene -- --json',
        ],
        readinessBlockerCleared: 'Marketing foundation data needs brand/source ownership before future strategy or marketing operators consume it.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
          approvalRef: MARKETING_SOURCE_MAP_APPROVAL_PATH,
        },
      },
      {
        cardId: BRAND_STACK_CARD_ID,
        order: 5,
        stage: normalizedBrandStackStage,
        planRef: BRAND_STACK_PLAN_PATH,
        definitionOfDone: 'Benson Crew, Zahnd Team Agency, Steve Zahnd, MarketMasters, and Unchained are modeled as Foundation brand entities with source IDs and boundaries.',
        proofCommands: [
          'npm run process:brand-stack-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Future content and Strategy work need brand-lane truth, not loose chat memory.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: BRAND_STACK_CLOSEOUT_KEY,
          approvalRef: BRAND_STACK_APPROVAL_PATH,
        },
      },
      {
        cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
        order: 6,
        stage: normalizedTierBehavioralCompletionStage,
        planRef: TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
        definitionOfDone: 'The first non-owner read endpoints that matter for future hubs have explicit tier-filtering proof or are documented as owner-only until a later card.',
        proofCommands: [
          'npm run process:tier-behavioral-completion-check',
          'npm run process:security-behavior-proof-check',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'SECURITY-BEHAVIOR-PROOF-001 proved current owner-only route behavior; this card decides the next read endpoints before broad access resumes.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
          approvalRef: TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
        },
      },
      {
        cardId: VERIFICATION_RUNS_CARD_ID,
        order: 7,
        stage: normalizedVerificationRunsStage,
        planRef: VERIFICATION_RUNS_PLAN_PATH,
        definitionOfDone: 'Stale research/findings verification is implemented as a proposed-only automatic report so stale items are refreshed, expired, promoted, killed, or deferred through a visible review path.',
        proofCommands: [
          'npm run process:verification-runs-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Research/backlog graveyard risk needs an automatic stale-finding mechanism.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: VERIFICATION_RUNS_CLOSEOUT_KEY,
          approvalRef: VERIFICATION_RUNS_APPROVAL_PATH,
          proposedOnly: true,
        },
      },
      {
        cardId: PER_USER_CHANGELOG_CARD_ID,
        order: 8,
        stage: normalizedPerUserChangelogStage,
        planRef: PER_USER_CHANGELOG_PLAN_PATH,
        definitionOfDone: 'The per-user write/activity audit requirement is scoped or implemented against the existing Foundation change log before broader team access resumes.',
        proofCommands: [
          'npm run process:per-user-changelog-check',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Future multi-user access needs who/what/when write history.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
        metadata: {
          closeoutKey: PER_USER_CHANGELOG_CLOSEOUT_KEY,
          approvalRef: PER_USER_CHANGELOG_APPROVAL_PATH,
          nextCardId: PER_USER_CHANGELOG_NEXT_CARD_ID,
          existingSource: 'change_events',
        },
      },
      {
        cardId: PER_USER_CHANGELOG_NEXT_CARD_ID,
        order: 9,
        stage: perUserChangelogDone ? 'building_now' : 'sprint_ready',
        planRef: '',
        definitionOfDone: 'Restricted decision auto-flag rules are scoped or implemented so personnel/comp/performance/legal decisions are sequestered before broad routing.',
        proofCommands: [
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'Tier checks protect reads, but sensitive decisions need creation/routing classification.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
      },
      {
        cardId: FOUNDATION_UI_COMPLETE_CARD_ID,
        order: 10,
        stage: 'sprint_ready',
        planRef: '',
        definitionOfDone: 'Foundation UI gives Steve a 30-second read on source maturity, extraction coverage, marketing source map, tier proof, stale verification, audit log, and restricted-decision status.',
        proofCommands: [
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify',
        ],
        readinessBlockerCleared: 'The Foundation page needs to reveal gaps without another manual audit.',
        notNextBoundaries: FOUNDATION_SOURCE_ONCE_OVER_NOT_NEXT_BOUNDARIES,
        existingWorkCheck: sourceOnceOverReadyCheck,
      },
    ],
  }
}

export function buildSyntheticFoundationCurrentSprintProof() {
  const seed = buildDefaultFoundationSprintSeed({ stage: 'building_now' })
  const backlogItems = [
    {
      id: VERIFY_GATE_TIERING_CARD_ID,
      title: 'Add proportional verification tiers for Foundation changes',
      lane: 'scoped',
      summary: 'Synthetic verification gate tiering card.',
      statusNote: '',
    },
    {
      id: REBUILD_PLAN_RECONCILE_CARD_ID,
      title: 'Reconcile audit findings into one current sprint command truth',
      lane: 'done',
      summary: 'Synthetic reconcile card.',
      statusNote: REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
    },
    {
      id: PLAN_CRITIC_REPLACEMENT_CARD_ID,
      title: 'Rebuild the Plan Critic quality gate',
      lane: 'done',
      summary: 'Synthetic Plan Critic card.',
      statusNote: PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
    },
    {
      id: SECURITY_BEHAVIOR_PROOF_CARD_ID,
      title: 'Prove security behavior with a black-box access matrix',
      lane: 'done',
      summary: 'Synthetic security behavior card.',
      statusNote: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
    },
    {
      id: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      title: 'Convert the top P0 verifier checks from text markers to behavior proof',
      lane: 'done',
      summary: 'Synthetic verifier behavior card.',
      statusNote: VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
    },
    {
      id: STRATEGY_HUB_MEETING_READY_CARD_ID,
      title: 'Make Strategy Hub output readable in live ownership meetings',
      lane: 'done',
      summary: 'Synthetic Strategy card.',
      statusNote: STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
    },
    {
      id: AVATAR_IMPORT_CARD_ID,
      title: 'Import old RETAIN and ATTRACT avatars into governed Foundation truth',
      lane: 'done',
      summary: 'Synthetic avatar card.',
      statusNote: AVATAR_IMPORT_CLOSEOUT_KEY,
    },
    {
      id: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      title: 'Add Mac mini auto-deploy rollback proof',
      lane: 'done',
      summary: 'Synthetic auto deploy rollback card.',
      statusNote: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    },
    {
      id: 'MEETING-VAULT-ACL-001',
      title: 'Prove meeting raw Drive ACL/vault safety',
      lane: 'scoped',
      summary: 'Synthetic returned card.',
      statusNote: '',
    },
  ]
  const closeouts = [
    { backlogIds: [FOUNDATION_SPRINT_SYSTEM_CARD_ID], key: FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY },
    { backlogIds: [FOUNDATION_SPRINT_CADENCE_CARD_ID], key: FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY },
    { backlogIds: [VERIFY_GATE_TIERING_CARD_ID], key: 'verify-gate-tiering-v1' },
    { backlogIds: [REBUILD_PLAN_RECONCILE_CARD_ID], key: REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY },
    { backlogIds: [PLAN_CRITIC_REPLACEMENT_CARD_ID], key: PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY },
    { backlogIds: [SECURITY_BEHAVIOR_PROOF_CARD_ID], key: SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY },
    { backlogIds: [VERIFIER_BEHAVIOR_SWEEP_CARD_ID], key: VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY },
    { backlogIds: [STRATEGY_HUB_MEETING_READY_CARD_ID], key: STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY },
    { backlogIds: [AVATAR_IMPORT_CARD_ID], key: AVATAR_IMPORT_CLOSEOUT_KEY },
    { backlogIds: [AUTO_DEPLOY_ROLLBACK_CARD_ID], key: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY },
  ]
  const healthy = buildFoundationCurrentSprintStatus({
    sprint: seed.sprint,
    items: seed.items,
    backlogItems,
    closeouts,
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
    closeouts,
  })
  const missingReturnedReason = buildFoundationCurrentSprintStatus({
    sprint: seed.sprint,
    items: [
      ...seed.items,
      {
        cardId: 'MEETING-VAULT-ACL-001',
        order: 99,
        stage: 'returned',
        planRef: MEETING_VAULT_ACL_SENSITIVITY_PHASE_A_PLAN_PATH,
        definitionOfDone: 'Synthetic returned-card guard proof.',
        proofCommands: ['npm run process:meeting-vault-acl-check'],
        notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
        returnedReason: '',
      },
    ],
    backlogItems,
    closeouts,
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
