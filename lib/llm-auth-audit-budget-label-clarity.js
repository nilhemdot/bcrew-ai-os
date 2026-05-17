export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID = 'LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY = 'llm-auth-audit-budget-label-clarity-v1'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH = 'docs/process/llm-auth-audit-budget-label-clarity-001-plan.md'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH = 'docs/process/approvals/LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001.json'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH = 'scripts/process-llm-auth-audit-budget-label-clarity-check.mjs'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-llm-auth-audit-budget-label-clarity-closeout.md'
export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SPRINT_ID = 'llm-auth-audit-budget-label-clarity-2026-05-17'
export const LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET = 'model_probe_no_extraction'

export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CHANGED_FILES = [
  'lib/llm-auth-audit-budget-label-clarity.js',
  'lib/foundation-jobs.js',
  'scripts/audit-llm-auth-paths.mjs',
  'lib/llm-auth-audit-proof.js',
  'lib/foundation-verify-llm-auth-audit.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH,
  'package.json',
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
]

export const LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PROOF_COMMANDS = [
  'node --check lib/llm-auth-audit-budget-label-clarity.js lib/foundation-verify-llm-auth-audit.js scripts/process-llm-auth-audit-budget-label-clarity-check.mjs scripts/foundation-verify.mjs',
  'npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:ship-check -- --card=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID} --planApprovalRef=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH} --closeoutKey=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID} --closeoutKey=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID} --planApprovalRef=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH} --closeoutKey=${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY} --commitRef=HEAD`,
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function requiredProbesIncludeProviderModelRun(requiredProbes = []) {
  return list(requiredProbes).some(probe => text(probe.probeType) === 'actual_model_run')
}

export function isNoLlmBudgetLabel(budget = '') {
  return /^no[_ -]?llm(?:$|[_ -])/.test(text(budget).toLowerCase())
}

export function isModelProbeBudgetLabel(budget = '') {
  return /model[_ -]?probe/.test(text(budget).toLowerCase())
}

export function validateLlmAuthAuditBudgetLabel({
  jobDefinition = {},
  requiredProbes = [],
  auditScriptSource = '',
} = {}) {
  const checks = []
  const budget = text(jobDefinition.budget)
  const budgetDetails = jobDefinition.budgetDetails && typeof jobDefinition.budgetDetails === 'object'
    ? jobDefinition.budgetDetails
    : {}
  const requiresProviderModelProbe = requiredProbesIncludeProviderModelRun(requiredProbes)
  const source = String(auditScriptSource || '')
  const sourceProvided = Boolean(source.trim())
  const sourceDeclaresActualModelRun = source.includes("probeType: 'actual_model_run'") ||
    source.includes('probeType: "actual_model_run"')
  const sourceLabelsProbe = source.includes('providerModelProbe') &&
    source.includes(LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET)

  addCheck(checks, text(jobDefinition.key) === 'llm-auth-audit', 'LLM auth audit job definition is present', jobDefinition.key || 'missing')
  addCheck(checks, requiresProviderModelProbe, 'required probes declare provider model run', 'actual_model_run')
  addCheck(
    checks,
    !requiresProviderModelProbe || (!isNoLlmBudgetLabel(budget) && isModelProbeBudgetLabel(budget)),
    'job budget label is honest about model probe',
    budget || 'missing',
  )
  addCheck(
    checks,
    budget === LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
    'job budget uses canonical model-probe budget',
    budget || 'missing',
  )
  addCheck(
    checks,
    budgetDetails.modelProviderProbe === true &&
      budgetDetails.extraction === false &&
      budgetDetails.externalWrite === false &&
      budgetDetails.agentFeedbackAutoSend === false,
    'job budget details spell out model probe without extraction or external write',
    JSON.stringify(budgetDetails),
  )
  addCheck(checks, text(jobDefinition.runtimeMode) === 'manual', 'LLM auth audit remains manual', jobDefinition.runtimeMode || 'missing')
  addCheck(checks, text(jobDefinition.mutationPosture) === 'read_only', 'LLM auth audit remains read-only posture', jobDefinition.mutationPosture || 'missing')
  addCheck(checks, !sourceProvided || sourceDeclaresActualModelRun, 'audit script declares actual_model_run openly', sourceProvided ? (sourceDeclaresActualModelRun ? 'declared' : 'missing') : 'not provided')
  addCheck(checks, !sourceProvided || sourceLabelsProbe, 'audit script labels OpenClaw probe budget explicitly', sourceProvided ? (sourceLabelsProbe ? LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET : 'missing') : 'not provided')
  addCheck(
    checks,
    !/agent-feedback-auto-send-readiness|agent-feedback-auto-send|gmail[^a-z0-9]+send|clickup[^a-z0-9]+write/i.test(source),
    'audit script does not include Agent Feedback send or ClickUp write paths',
    'no forbidden send/write path',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      status: failed.length ? 'risk' : 'honest',
      budget,
      requiresProviderModelProbe,
      sourceDeclaresActualModelRun: sourceProvided ? sourceDeclaresActualModelRun : null,
      sourceLabelsProbe: sourceProvided ? sourceLabelsProbe : null,
    },
  }
}

export function buildLlmAuthAuditBudgetLabelDogfoodProof() {
  const baseProbe = [{ provider: 'openclaw', authPath: 'chatgpt_subscription_gateway', probeType: 'actual_model_run' }]
  const goodScript = `
    await recordProbe({
      provider: 'openclaw',
      authPath: 'chatgpt_subscription_gateway',
      probeType: 'actual_model_run',
      capability: { providerModelProbe: true, budgetClass: '${LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET}' },
    })
  `
  const hiddenNoLlm = validateLlmAuthAuditBudgetLabel({
    jobDefinition: {
      key: 'llm-auth-audit',
      budget: 'no_llm',
      runtimeMode: 'manual',
      mutationPosture: 'read_only',
      budgetDetails: { modelProviderProbe: true, extraction: false, externalWrite: false, agentFeedbackAutoSend: false },
    },
    requiredProbes: baseProbe,
    auditScriptSource: goodScript,
  })
  const unlabeledScript = validateLlmAuthAuditBudgetLabel({
    jobDefinition: {
      key: 'llm-auth-audit',
      budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
      runtimeMode: 'manual',
      mutationPosture: 'read_only',
      budgetDetails: { modelProviderProbe: true, extraction: false, externalWrite: false, agentFeedbackAutoSend: false },
    },
    requiredProbes: baseProbe,
    auditScriptSource: "probeType: 'actual_model_run'",
  })
  const scheduledMutation = validateLlmAuthAuditBudgetLabel({
    jobDefinition: {
      key: 'llm-auth-audit',
      budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
      runtimeMode: 'scheduled',
      mutationPosture: 'read_only',
      budgetDetails: { modelProviderProbe: true, extraction: false, externalWrite: false, agentFeedbackAutoSend: false },
    },
    requiredProbes: baseProbe,
    auditScriptSource: goodScript,
  })
  const healthy = validateLlmAuthAuditBudgetLabel({
    jobDefinition: {
      key: 'llm-auth-audit',
      budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
      runtimeMode: 'manual',
      mutationPosture: 'read_only',
      budgetDetails: { modelProviderProbe: true, extraction: false, externalWrite: false, agentFeedbackAutoSend: false },
    },
    requiredProbes: baseProbe,
    auditScriptSource: goodScript,
  })
  return {
    ok: hiddenNoLlm.ok === false &&
      unlabeledScript.ok === false &&
      scheduledMutation.ok === false &&
      healthy.ok === true,
    hiddenNoLlm,
    unlabeledScript,
    scheduledMutation,
    healthy,
    invariant: 'no_llm plus actual_model_run fails; unlabeled model probes fail; scheduled model-probe audit fails; manual model_probe_no_extraction passes.',
  }
}
