export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID = 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY = 'old-system-agent-onboarding-harvest-v1'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_PLAN_PATH = 'docs/process/old-system-agent-onboarding-harvest-001-plan.md'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_APPROVAL_PATH = 'docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_SCRIPT_PATH = 'scripts/process-old-system-agent-onboarding-harvest-check.mjs'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DOC_PATH = 'docs/agents/old-system-agent-onboarding-harvest.md'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-old-system-agent-onboarding-harvest-closeout.md'
export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_SPRINT_ID = 'old-system-agent-onboarding-harvest-2026-05-18'

export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CHANGED_FILES = [
  'lib/old-system-agent-onboarding-harvest.js',
  'scripts/process-old-system-agent-onboarding-harvest-check.mjs',
  'docs/agents/old-system-agent-onboarding-harvest.md',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/old-system-agent-onboarding-harvest-001-plan.md',
  'docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json',
  'docs/handoffs/2026-05-18-old-system-agent-onboarding-harvest-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_PROOF_COMMANDS = [
  'node --check lib/old-system-agent-onboarding-harvest.js lib/foundation-runtime-reliability-verifier.js scripts/process-old-system-agent-onboarding-harvest-check.mjs scripts/foundation-verify.mjs',
  'npm run process:old-system-agent-onboarding-harvest-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 --planApprovalRef=docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json --closeoutKey=old-system-agent-onboarding-harvest-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 --closeoutKey=old-system-agent-onboarding-harvest-v1',
  'npm run process:foundation-ship -- --card=OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 --planApprovalRef=docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json --closeoutKey=old-system-agent-onboarding-harvest-v1 --commitRef=HEAD',
]

export const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, Telegram, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not send request-access emails.',
  'Do not implement AGENT-010 in this card.',
  'Do not copy raw private transcripts or private profile data into repo truth.',
  'Do not launch hidden subagents or parallel builders.',
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || 'old-system-agent-onboarding-harvest', ruleId, detail })
}

export function buildOldSystemAgentOnboardingHarvest(overrides = {}) {
  return {
    cardId: OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID,
    closeoutKey: OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    harvestOnly: true,
    implementationStarted: false,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    rawPrivateContentPromoted: false,
    evidenceSources: [
      { path: '~/bcrew-buddy-reference/docs/plans/bot-onboarding-coaching-plan.md', lines: 989, sha256: 'bb990e8abf92414b01ba858c16478d3f0604403c17f79d45cc865adfc12767e1', role: 'primary onboarding/coaching plan' },
      { path: '~/bcrew-buddy-reference/docs/procedures/new-user-onboarding.md', lines: 74, sha256: 'd82b15f6c98abe8e7eca35bb76b0a51cbec58c2752dd84f3ec0d0e0ab028ca4a', role: 'old onboarding flow' },
      { path: '~/bcrew-buddy-reference/docs/procedures/agent-failure-escalation.md', lines: 79, sha256: '3235019ba9a4a07b6300f62b3cd776f04fbf2431b69a415f049b0fcf4305f691', role: 'failure escalation pattern' },
      { path: '~/bcrew-buddy-reference/docs/agent-inventory.md', lines: 198, sha256: 'baaef085f41e82884dfb01ab9c38a5efa2317d4b5d7f00189edcef878e79d7e0', role: 'agent/persona inventory' },
    ],
    harvestedLessons: [
      { lessonId: 'show-value-before-setup', disposition: 'keep', summary: 'First interaction must demonstrate role-specific value before asking calibration or naming questions.', targetCardId: 'AGENT-010' },
      { lessonId: 'calibration-interview', disposition: 'rebuild', summary: 'Use a short calibration interview covering responsibilities, Attract/Grow/Retain connection, tools/info friction, desired morning value, role-specific challenge, and communication preference.', targetCardId: 'AGENT-010' },
      { lessonId: 'coaching-loop', disposition: 'rebuild', summary: 'Daily coaching should be a commitment loop: morning focus, source cross-check, conditional drift flag, end-of-day review, and pattern learning.', targetCardId: 'AGENT-010' },
      { lessonId: 'progressive-permissions', disposition: 'keep', summary: 'Start read-only, then suggest, then draft-with-approval; never jump directly to autonomous writes.', targetCardId: 'AGENT-010' },
      { lessonId: 'engagement-fail-closed', disposition: 'keep', summary: 'Repeated non-response should pause/noise-reduce and surface an owner-visible adoption risk instead of spamming indefinitely.', targetCardId: 'AGENT-010' },
      { lessonId: 'botfather-token-flow', disposition: 'retire', summary: 'Do not copy the old Telegram token/email setup flow into Foundation truth; treat it as old implementation evidence only.', targetCardId: 'AGENT-010' },
    ],
    profileFields: [
      'core responsibilities',
      'Attract/Grow/Retain connection',
      'tools and systems checked',
      'information friction',
      'preferred morning value',
      'role-specific coaching challenge',
      'communication preference',
      'privacy and memory scope',
      'cadence preference',
    ],
    calibrationQuestions: [
      'What are your top 3-5 core responsibilities?',
      'How does your work connect to Attract, Grow, and Retain?',
      'What tools and systems do you check most, and what info do you burn time finding?',
      'What would be most useful to get every morning without asking?',
      'What is your role-specific coaching or visibility challenge right now?',
      'How do you prefer updates: short message, email summary, or voice note?',
    ],
    proofRequirementsForAgent010: [
      'Profile updates stay private/local and do not leak raw profile data into repo truth.',
      'Onboarding starts read-only and requires live-answer preflight plus capability registry/template proof.',
      'Engagement tracking flags non-response without repeated spam.',
      'Coaching loop stores commitments and visible failure states before any write action.',
      'Old-system implementation details are keep/rebuild/retire evidence, not active truth.',
    ],
    notNextBoundaries: OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateOldSystemAgentOnboardingHarvest(harvest = buildOldSystemAgentOnboardingHarvest()) {
  const violations = []
  if (harvest.ownerLayer !== 'Foundation') addViolation(violations, harvest.cardId, 'foundation_owner_required', harvest.ownerLayer || 'missing')
  if (harvest.harvestOnly !== true) addViolation(violations, harvest.cardId, 'harvest_only_required', String(harvest.harvestOnly))
  if (harvest.implementationStarted === true || harvest.liveAgentRuntimeStarted === true) addViolation(violations, harvest.cardId, 'runtime_implementation_blocked', 'AGENT-010 owns implementation')
  if (harvest.extractionStarted === true) addViolation(violations, harvest.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (harvest.modelCallsStarted === true) addViolation(violations, harvest.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (harvest.externalWritesStarted === true) addViolation(violations, harvest.cardId, 'external_write_blocked', 'external writes are not approved')
  if (harvest.hiddenSubagentsSpawned === true) addViolation(violations, harvest.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (harvest.rawPrivateContentPromoted === true) addViolation(violations, harvest.cardId, 'raw_private_content_promotion_blocked', 'promote lessons, not private transcript text')

  if (list(harvest.evidenceSources).length < 4) addViolation(violations, harvest.cardId, 'evidence_sources_required', 'need primary plan plus related docs')
  for (const source of list(harvest.evidenceSources)) {
    if (!text(source.path) || !text(source.sha256) || !Number(source.lines) || !text(source.role)) addViolation(violations, source.path, 'evidence_metadata_required', 'path, line count, sha, and role required')
  }

  const dispositions = new Set(list(harvest.harvestedLessons).map(lesson => lesson.disposition))
  for (const required of ['keep', 'rebuild', 'retire']) {
    if (!dispositions.has(required)) addViolation(violations, harvest.cardId, 'keep_rebuild_retire_required', required)
  }
  for (const lesson of list(harvest.harvestedLessons)) {
    if (!text(lesson.lessonId) || !text(lesson.summary) || !text(lesson.targetCardId)) addViolation(violations, lesson.lessonId, 'lesson_fields_required', 'lesson id, summary, target card required')
    if (!['keep', 'rebuild', 'retire'].includes(lesson.disposition)) addViolation(violations, lesson.lessonId, 'lesson_disposition_required', lesson.disposition || 'missing')
  }
  if (list(harvest.profileFields).length < 8) addViolation(violations, harvest.cardId, 'profile_fields_required', 'profile field inventory too thin')
  if (list(harvest.calibrationQuestions).length < 6) addViolation(violations, harvest.cardId, 'calibration_questions_required', 'calibration question set too thin')
  if (list(harvest.proofRequirementsForAgent010).length < 5) addViolation(violations, harvest.cardId, 'agent010_proof_requirements_required', 'AGENT-010 proof requirements too thin')

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: harvest.cardId,
    closeoutKey: harvest.closeoutKey,
    violations,
    summary: {
      evidenceSourceCount: list(harvest.evidenceSources).length,
      lessonCount: list(harvest.harvestedLessons).length,
      profileFieldCount: list(harvest.profileFields).length,
      calibrationQuestionCount: list(harvest.calibrationQuestions).length,
      violationCount: violations.length,
    },
  }
}

export function buildOldSystemAgentOnboardingHarvestDogfoodProof() {
  const healthyHarvest = buildOldSystemAgentOnboardingHarvest()
  const healthy = evaluateOldSystemAgentOnboardingHarvest(healthyHarvest)
  const missingEvidence = clone(healthyHarvest)
  missingEvidence.evidenceSources = []
  const missingRetire = clone(healthyHarvest)
  missingRetire.harvestedLessons = missingRetire.harvestedLessons.filter(lesson => lesson.disposition !== 'retire')
  const thinProfile = clone(healthyHarvest)
  thinProfile.profileFields = ['role']
  const thinQuestions = clone(healthyHarvest)
  thinQuestions.calibrationQuestions = ['What do you need?']
  const rawPrivatePromotion = clone(healthyHarvest)
  rawPrivatePromotion.rawPrivateContentPromoted = true
  const runtimeAttempt = evaluateOldSystemAgentOnboardingHarvest(buildOldSystemAgentOnboardingHarvest({
    implementationStarted: true,
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
  }))
  const results = {
    missingEvidence: evaluateOldSystemAgentOnboardingHarvest(missingEvidence),
    missingRetire: evaluateOldSystemAgentOnboardingHarvest(missingRetire),
    thinProfile: evaluateOldSystemAgentOnboardingHarvest(thinProfile),
    thinQuestions: evaluateOldSystemAgentOnboardingHarvest(thinQuestions),
    rawPrivatePromotion: evaluateOldSystemAgentOnboardingHarvest(rawPrivatePromotion),
    runtimeAttempt,
  }
  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Old-system harvest passes with metadata-backed keep/rebuild/retire lessons; missing evidence, missing retire decision, thin profile/questions, raw private promotion, and runtime side effects fail closed.',
    healthy,
    missingEvidenceRejected: results.missingEvidence.ok === false,
    missingRetireRejected: results.missingRetire.ok === false,
    thinProfileRejected: results.thinProfile.ok === false,
    thinQuestionsRejected: results.thinQuestions.ok === false,
    rawPrivatePromotionRejected: results.rawPrivatePromotion.ok === false,
    runtimeAttemptRejected: runtimeAttempt.ok === false,
  }
}
