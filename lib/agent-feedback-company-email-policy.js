import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV,
  buildAgentFeedbackAutoSendReadiness,
  evaluateAgentFeedbackAutoSendLiveGuard,
} from './agent-feedback-auto-send.js'
import {
  buildAgentFeedbackCandidateFromTask,
  buildAgentFeedbackDryRunProof,
  buildAgentFeedbackEligibility,
  buildAgentFeedbackRecipientPlan,
  hashAgentFeedbackProofValue,
} from './agent-feedback-send.js'
import {
  buildAgentFeedbackReminderReadiness,
} from './agent-feedback-reminders.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID = 'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001'
export const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY = 'agent-feedback-company-email-policy-v1'
export const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH = 'docs/process/approved-plans/agent-feedback-company-email-policy-v1.md'
export const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001.json'
export const AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH = 'docs/audits/2026-05-01-agent-feedback-company-email-policy-proof.md'
export const AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID = 'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001'
export const AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID = 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001'
export const AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID = 'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001'

const PROOF_NOW = new Date('2026-05-01T00:00:00.000Z')
const OVERSIGHT_ROLES = ['Steve', 'Carson', 'Ryan', 'Georgia']
const LEGACY_PERSONAL_EMAIL_BLOCKERS = [
  ['missing', 'personal', 'email'].join('_'),
  ['invalid', 'personal', 'email'].join('_'),
]
const LEGACY_PERSONAL_EMAIL_RULE = ['clickup', 'personal', 'email'].join('-')
const PERSONAL_EMAIL_BLOCKERS = new Set(LEGACY_PERSONAL_EMAIL_BLOCKERS)

function normalizeText(value) {
  return String(value || '').trim()
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function includesAll(source, phrases) {
  return phrases.every(phrase => source.includes(phrase))
}

function hasPrivateProofLeak(source) {
  const text = typeof source === 'string' ? source : JSON.stringify(source || {})
  if (/\/agent-feedback\?token=/i.test(text)) return true
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return true
  return false
}

function listBlockers(...values) {
  return values.flatMap(value => {
    if (!value) return []
    if (Array.isArray(value)) return value.flatMap(item => listBlockers(item))
    if (Array.isArray(value.blockers)) return value.blockers
    if (Array.isArray(value.eligibility?.blockers)) return value.eligibility.blockers
    if (Array.isArray(value.stop?.blockers)) return value.stop.blockers
    return []
  }).map(normalizeText).filter(Boolean)
}

function hasPersonalEmailBlocker(...values) {
  return listBlockers(...values).some(blocker => PERSONAL_EMAIL_BLOCKERS.has(blocker))
}

function candidateUsesCompanyEmail(candidate) {
  const plan = candidate?.recipientPlan || candidate
  return plan?.recipientSource === 'company_email' &&
    plan?.recipientRule === 'clickup-company-email' &&
    plan?.recipientSourceField?.name === 'Company Email'
}

function buildSyntheticExternalCompanyEmailProof() {
  const fields = [
    { name: 'Real Start Date' },
    { name: 'Company Email' },
    { name: 'Onboarding NPS 30 Status' },
    { name: 'Onboarding NPS 30 Score' },
    { name: 'Onboarding NPS 30 Feedback' },
  ]
  const task = {
    id: 'synthetic-external-agent-task',
    name: 'Synthetic External Agent',
    status: { status: 'onboarding' },
    custom_fields: [
      { name: 'Real Start Date', type: 'date', value: String(Date.parse('2026-03-29T00:00:00.000Z')) },
      { name: 'Company Email', type: 'email', value: 'synthetic.agent@example.invalid' },
      { name: 'Onboarding NPS 30 Status', type: 'short_text', value: '' },
      { name: 'Onboarding NPS 30 Score', type: 'short_text', value: '' },
      { name: 'Onboarding NPS 30 Feedback', type: 'text', value: '' },
    ],
  }
  const candidate = buildAgentFeedbackCandidateFromTask({
    task,
    fields,
    targetName: 'Synthetic External Agent',
    milestoneDay: 30,
    now: PROOF_NOW,
  })
  return buildAgentFeedbackRecipientPlan(candidate).then(recipientPlan => {
    const eligibility = buildAgentFeedbackEligibility(candidate, null, recipientPlan)
    return {
      targetLabel: 'synthetic-external-agent',
      milestoneDay: candidate.milestoneDay,
      taskIdHash: hashAgentFeedbackProofValue(candidate.taskId),
      recipientPlan: {
        recipientRule: recipientPlan.recipientRule,
        recipientSource: recipientPlan.recipientSource,
        recipientCategory: recipientPlan.recipientCategory,
        recipientSourceField: recipientPlan.recipientSourceField,
        toRole: recipientPlan.toRole,
        toAddressPresent: recipientPlan.toAddressPresent,
        toAddressHashPresent: Boolean(recipientPlan.toAddressHash),
        internalOversightMode: recipientPlan.internalOversightMode,
        bccRolesApplied: recipientPlan.bccRolesApplied,
        bccActualSendRoles: recipientPlan.bccActualSendRoles,
        bccRecipientDedupedRoles: recipientPlan.bccRecipientDedupedRoles,
        bccMissingConfiguredRoles: recipientPlan.bccMissingConfiguredRoles,
      },
      eligibility,
      sideEffects: {
        gmailSent: false,
        clickUpRequestedWritten: false,
        rawEmailLogged: false,
        rawTokenLogged: false,
        feedbackContentLogged: false,
      },
    }
  })
}

function buildSteveAllowlistGuard(steveCandidate) {
  return evaluateAgentFeedbackAutoSendLiveGuard({
    env: { [AGENT_FEEDBACK_AUTO_SEND_ENABLED_ENV]: 'true' },
    approvalConfig: {
      approvalSchemaVersion: 1,
      approvedBy: 'Steve',
      approvedAt: '2026-05-01T00:00:00.000Z',
      mode: 'test-only',
      allowlist: [{ targetName: 'Steve Zahnd', milestoneDay: 30 }],
      source: 'synthetic-steve-test-only-allowlist',
    },
    candidate: steveCandidate,
  })
}

function publicProofFromDryRun(proof) {
  return {
    target: proof.target,
    milestone: proof.milestone,
    eligibility: proof.eligibility,
    contractLinkStatus: proof.contractLinkStatus,
    recipientPlan: proof.recipientPlan,
    token: proof.token,
    clickUpWritebackPlan: proof.clickUpWritebackPlan,
    duplicateProtection: proof.duplicateProtection,
    sideEffects: proof.sideEffects,
  }
}

export async function buildAgentFeedbackCompanyEmailPolicyStatus({
  repoRoot = defaultRepoRoot,
  foundationHub = null,
  foundationBuildLog = null,
  steveDryRun = null,
  georgiaDryRun = null,
  autoSendReadiness = null,
  reminderReadiness = null,
} = {}) {
  const findings = []
  const [
    packageSource,
    approvedPlan,
    approval,
    proofArtifact,
    sendSource,
    autoSendSource,
    reminderSource,
    sourceContractsSource,
    foundationJobsSource,
    currentPlan,
    currentState,
    buildLogSource,
    verifierSource,
  ] = await Promise.all([
    readOptionalText(repoRoot, 'package.json'),
    readOptionalText(repoRoot, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH),
    readOptionalText(repoRoot, AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH),
    readOptionalText(repoRoot, 'lib/agent-feedback-send.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-auto-send.js'),
    readOptionalText(repoRoot, 'lib/agent-feedback-reminders.js'),
    readOptionalText(repoRoot, 'lib/source-contracts.js'),
    readOptionalText(repoRoot, 'lib/foundation-jobs.js'),
    readOptionalText(repoRoot, 'docs/rebuild/current-plan.md'),
    readOptionalText(repoRoot, 'docs/rebuild/current-state.md'),
    readOptionalText(repoRoot, 'lib/foundation-build-log.js'),
    readOptionalText(repoRoot, 'scripts/foundation-verify.mjs'),
  ])

  const steveProof = steveDryRun || await buildAgentFeedbackDryRunProof({
    targetName: 'Steve Zahnd',
    milestoneDay: 30,
    now: PROOF_NOW,
  })
  const georgiaProof = georgiaDryRun || await buildAgentFeedbackDryRunProof({
    targetName: 'Georgia',
    milestoneDay: 30,
    now: PROOF_NOW,
  })
  const syntheticExternal = await buildSyntheticExternalCompanyEmailProof()
  const autoStatus = autoSendReadiness || await buildAgentFeedbackAutoSendReadiness({
    repoRoot,
    includeCandidates: true,
    now: PROOF_NOW,
  })
  const reminderStatus = reminderReadiness || await buildAgentFeedbackReminderReadiness({
    includeCandidates: true,
    now: PROOF_NOW,
  })
  const autoCandidates = autoStatus.report?.candidates || []
  const reminderCandidates = reminderStatus.report?.candidates || []
  const steveAutoCandidate = autoCandidates.find(candidate =>
    candidate.targetLabel === 'Steve' && Number(candidate.milestoneDay) === 30
  ) || null
  const steveAllowlistGuard = buildSteveAllowlistGuard(steveAutoCandidate)
  const allRuntimeBlockers = listBlockers(
    steveProof,
    georgiaProof,
    syntheticExternal,
    autoCandidates,
    reminderCandidates,
  )
  const companyPolicyCard = (foundationHub?.backlogItems || []).find(card =>
    card.id === AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID
  ) || null
  const steveLoopCard = (foundationHub?.backlogItems || []).find(card =>
    card.id === AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID
  ) || null
  const realUserRepairCard = (foundationHub?.backlogItems || []).find(card =>
    card.id === AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID
  ) || null
  const productionCard = (foundationHub?.backlogItems || []).find(card =>
    card.id === AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID
  ) || null
  const closeout = (foundationBuildLog?.builds || []).find(build =>
    build.closeoutKey === AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY
  ) || null
  const steveProofBlockers = steveProof.eligibility?.blockers || []
  const steveClosedAfterFullLoop = steveLoopCard?.lane === 'done' &&
    steveProof.recipientPlan?.recipientSource === 'company_email' &&
    steveProofBlockers.includes('already_closed') &&
    steveProofBlockers.includes('duplicate_send_attempt_exists')
  const steveClosedAfterRealUserRepair = realUserRepairCard?.lane === 'done' &&
    steveProof.recipientPlan?.recipientSource === 'company_email' &&
    steveProofBlockers.includes('already_closed') &&
    steveProofBlockers.includes('duplicate_send_attempt_exists')
  const steveCompanyEmailProofValid = steveProof.eligibility?.eligible === true ||
    steveClosedAfterFullLoop ||
    steveClosedAfterRealUserRepair
  const georgiaProofBlockers = georgiaProof.eligibility?.blockers || []
  const georgiaRequestedAfterProductionEnable = productionCard?.lane === 'done' &&
    georgiaProof.recipientPlan?.recipientSource === 'company_email' &&
    georgiaProofBlockers.includes('already_requested') &&
    georgiaProofBlockers.includes('duplicate_send_attempt_exists')
  const georgiaCompanyEmailProofValid = georgiaProof.eligibility?.eligible === true ||
    georgiaRequestedAfterProductionEnable

  addFinding(findings, Boolean(approvedPlan), 'approved plan artifact exists', AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH)
  addFinding(findings, Boolean(approval), 'approval artifact exists', AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH)
  addFinding(findings, Boolean(proofArtifact), 'company-email policy proof artifact exists', AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH)
  addFinding(findings, packageSource.includes('"process:agent-feedback-company-email-policy-check"'), 'package script exists', 'process:agent-feedback-company-email-policy-check')
  addFinding(findings, verifierSource.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID), 'foundation verifier covers company-email policy card', AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID)
  addFinding(findings, includesAll(sendSource, [
    'recipientSource: RECIPIENT_SOURCE_COMPANY',
    "recipientRule: 'clickup-company-email'",
    'validateRouteSpecificSendApproval',
    'expectedTarget',
  ]), 'request/test send path uses Company Email and generic target approval', 'lib/agent-feedback-send.js')
  addFinding(findings, !LEGACY_PERSONAL_EMAIL_BLOCKERS.some(blocker => sendSource.includes(blocker)) && !sendSource.includes(LEGACY_PERSONAL_EMAIL_RULE), 'send module has no Personal Email send blockers or recipient rule', 'lib/agent-feedback-send.js')
  addFinding(findings, includesAll(autoSendSource, [
    'candidateMatchesAllowlist',
    'taskName.includes(label)',
    'productionAllWithoutSeparateApprovalCannotSend',
  ]), 'auto-send allowlist supports named targets and preserves production-all gate', 'lib/agent-feedback-auto-send.js')
  addFinding(findings, !autoSendSource.includes(LEGACY_PERSONAL_EMAIL_RULE), 'auto-send readiness has no Personal Email recipient rule', 'lib/agent-feedback-auto-send.js')
  addFinding(findings, includesAll(reminderSource, [
    'buildAgentFeedbackCandidateFromTask',
    "recipientSource: overrides.recipientSource || 'company_email'",
    "recipientRule: overrides.recipientRule || 'clickup-company-email'",
  ]), 'reminder readiness uses the shared Company Email candidate rule', 'lib/agent-feedback-reminders.js')
  addFinding(findings, !LEGACY_PERSONAL_EMAIL_BLOCKERS.some(blocker => reminderSource.includes(blocker)), 'reminder module has no Personal Email blockers', 'lib/agent-feedback-reminders.js')
  addFinding(findings, sourceContractsSource.includes('Company Email only') && !sourceContractsSource.includes('external agents use Personal Email'), 'source contract records Company Email-only policy', 'lib/source-contracts.js')
  addFinding(findings, foundationJobsSource.includes('Company Email only') && !foundationJobsSource.includes('Personal Email for external agents'), 'Ops job metadata records Company Email-only policy', 'lib/foundation-jobs.js')
  addFinding(findings, steveCompanyEmailProofValid, 'Steve Zahnd Company Email dry-run is eligible or closed after full-loop proof', steveProof.eligibility?.blockers?.join(', ') || 'eligible')
  addFinding(findings, steveProof.recipientPlan?.recipientSource === 'company_email' && steveProof.recipientPlan?.recipientSourceField?.name === 'Company Email', 'Steve Zahnd uses Company Email metadata', steveProof.recipientPlan?.recipientSource || 'missing')
  addFinding(findings, (steveProof.recipientPlan?.bccRecipientDedupedRoles || []).includes('Steve'), 'Steve is deduped from BCC when he is To', (steveProof.recipientPlan?.bccRecipientDedupedRoles || []).join(', ') || 'none')
  addFinding(findings, steveProof.sideEffects?.gmailSent === false && steveProof.sideEffects?.clickUpRequestedWritten === false, 'Steve dry-run has no Gmail or ClickUp Requested side effects', JSON.stringify(steveProof.sideEffects || {}))
  addFinding(findings, georgiaCompanyEmailProofValid, 'Georgia Company Email proof is eligible or already requested after production enablement', georgiaProof.eligibility?.blockers?.join(', ') || 'eligible')
  addFinding(findings, syntheticExternal.eligibility?.eligible === true && candidateUsesCompanyEmail(syntheticExternal.recipientPlan), 'synthetic external agent uses Company Email and is eligible', syntheticExternal.eligibility?.blockers?.join(', ') || 'eligible')
  addFinding(findings, !hasPersonalEmailBlocker(steveProof, georgiaProof, syntheticExternal, autoCandidates, reminderCandidates), 'no Personal Email blockers appear in send, auto-send, or reminder checks', allRuntimeBlockers.join(', ') || 'none')
  addFinding(findings, autoCandidates.length > 0 && autoCandidates.every(candidate => candidateUsesCompanyEmail(candidate)), 'auto-send report uses Company Email for every candidate', `${autoCandidates.filter(candidateUsesCompanyEmail).length}/${autoCandidates.length}`)
  addFinding(findings, reminderCandidates.length > 0 && reminderCandidates.every(candidate => candidateUsesCompanyEmail(candidate)), 'reminder report uses Company Email for every candidate', `${reminderCandidates.filter(candidateUsesCompanyEmail).length}/${reminderCandidates.length}`)
  addFinding(findings, steveAllowlistGuard.canLiveSend === true, 'test allowlist can approve a named Steve target when both live-send keys are present', steveAllowlistGuard.decision)
  addFinding(findings, autoStatus.summary?.productionAllRequiresSeparateApproval === true, 'production-all remains impossible without separate approval artifact', String(autoStatus.summary?.productionAllRequiresSeparateApproval))
  addFinding(findings, OVERSIGHT_ROLES.every(role => (steveProof.recipientPlan?.bccRolesApplied || []).includes(role)), 'BCC oversight roles stay Steve, Carson, Ryan, Georgia', (steveProof.recipientPlan?.bccRolesApplied || []).join(', ') || 'none')
  addFinding(findings, steveProof.contractLinkStatus === 'missing_warning' || steveProof.contractLinkStatus === 'present', 'Contract Link remains warning-only', steveProof.contractLinkStatus || 'missing')
  addFinding(findings, !hasPrivateProofLeak(proofArtifact) && !hasPrivateProofLeak({ steveProof, georgiaProof, syntheticExternal, autoStatus, reminderStatus }), 'proof is metadata-only with no raw emails, token URLs, or feedback content', 'metadata-only')
  addFinding(findings, companyPolicyCard?.lane === 'done' && /agent-feedback-company-email-policy-v1/.test(companyPolicyCard?.statusNote || ''), 'company-email policy card is done', companyPolicyCard?.lane || 'missing')
  addFinding(findings, steveLoopCard?.lane === 'scoped' || steveLoopCard?.lane === 'done', 'Steve full-loop test card is scoped next or done', steveLoopCard?.lane || 'missing')
  const productionCardScopedOrClosed = productionCard?.lane === 'scoped' ||
    (productionCard?.lane === 'done' &&
      /agent-feedback-production-autosend-enable-v1/.test(productionCard?.statusNote || ''))
  addFinding(findings, productionCardScopedOrClosed, 'production auto-send enable card is scoped later or now closed by its own card', productionCard?.lane || 'missing')
  addFinding(findings, closeout?.backlogIds?.length === 1 && closeout.backlogIds.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID), 'closeout owns only company-email policy card', (closeout?.backlogIds || []).join(', ') || 'missing')
  addFinding(findings, currentPlan.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID) && currentPlan.includes(AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID), 'current plan records Company Email policy and Steve full-loop next', 'current-plan')
  addFinding(findings, currentState.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID) && currentState.includes('Company Email only'), 'current state records Company Email policy', 'current-state')

  const summary = {
    steveEligible: Boolean(steveProof.eligibility?.eligible),
    steveClosedAfterFullLoop: steveClosedAfterFullLoop || steveClosedAfterRealUserRepair,
    steveClosedAfterRealUserRepair,
    steveRecipientSource: steveProof.recipientPlan?.recipientSource || '',
    steveBccDedupedRoles: steveProof.recipientPlan?.bccRecipientDedupedRoles || [],
    georgiaEligible: Boolean(georgiaProof.eligibility?.eligible),
    georgiaRequestedAfterProductionEnable,
    georgiaRecipientSource: georgiaProof.recipientPlan?.recipientSource || '',
    syntheticExternalEligible: Boolean(syntheticExternal.eligibility?.eligible),
    syntheticExternalRecipientSource: syntheticExternal.recipientPlan?.recipientSource || '',
    autoSendCandidates: autoCandidates.length,
    autoSendCompanyEmailCandidates: autoCandidates.filter(candidateUsesCompanyEmail).length,
    reminderCandidates: reminderCandidates.length,
    reminderCompanyEmailCandidates: reminderCandidates.filter(candidateUsesCompanyEmail).length,
    personalEmailBlockers: allRuntimeBlockers.filter(blocker => PERSONAL_EMAIL_BLOCKERS.has(blocker)),
    steveAllowlistCanLiveSendWithBothKeys: steveAllowlistGuard.canLiveSend === true,
    productionAllRequiresSeparateApproval: autoStatus.summary?.productionAllRequiresSeparateApproval === true,
    gmailSent: false,
    clickUpRequestedWritten: false,
    companyPolicyCardLane: companyPolicyCard?.lane || '',
    steveLoopCardLane: steveLoopCard?.lane || '',
    realUserRepairCardLane: realUserRepairCard?.lane || '',
    productionAutoSendCardLane: productionCard?.lane || '',
    closeoutOwnsOnlyCompanyEmailPolicy: closeout?.backlogIds?.length === 1 &&
      closeout.backlogIds.includes(AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID),
    metadataOnly: !hasPrivateProofLeak(proofArtifact),
  }

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
    summary,
    proof: {
      steve: publicProofFromDryRun(steveProof),
      georgia: publicProofFromDryRun(georgiaProof),
      syntheticExternal,
      steveAllowlistGuard,
      autoSend: {
        mode: autoStatus.runtimeMode,
        summary: autoStatus.summary,
      },
      reminders: {
        mode: reminderStatus.runtimeMode,
        summary: reminderStatus.summary,
      },
    },
    findings,
  }
}
