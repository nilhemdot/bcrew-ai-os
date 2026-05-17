import {
  LLM_AUTH_AUDIT_CARD_ID,
  LLM_AUTH_AUDIT_PLAN_PATH,
  LLM_AUTH_AUDIT_SCRIPT_PATH,
} from './llm-auth-audit-proof.js'
import {
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH,
  LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
  buildLlmAuthAuditBudgetLabelDogfoodProof,
  validateLlmAuthAuditBudgetLabel,
} from './llm-auth-audit-budget-label-clarity.js'

export const FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID = 'FOUNDATION-VERIFY-MODULE-SPLIT-002'
export const FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH = 'scripts/process-foundation-verify-llm-auth-audit-check.mjs'

function includesAll(source, needles = []) {
  const text = String(source || '')
  return (needles || []).every(needle => text.includes(needle))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

export function evaluateLlmAuthAuditVerifierCheck({
  llmAuthAuditIsBuilding = false,
  llmAuthAuditIsClosed = false,
  packageJson = {},
  llmAuthAuditApprovalValidation = {},
  foundationHub = {},
  foundationCurrentSprintStatus = {},
  llmAuthAuditRuntimeStatus = {},
  llmAuthAuditProofSource = '',
  llmAuthAuditCheckSource = '',
  llmAuthAuditPlanSource = '',
  serverSource = '',
  llmAuthAuditCloseout = {},
  foundationJobs = {},
  llmAuthBudgetLabelCard = null,
  llmAuthBudgetLabelCloseout = {},
  llmAuthBudgetLabelApprovalValidation = {},
  llmAuthBudgetLabelCurrentItem = null,
  llmAuthBudgetLabelProofSource = '',
  llmAuthBudgetLabelCheckSource = '',
  llmAuthBudgetLabelPlanSource = '',
} = {}) {
  const checks = []
  const jobDefinition = asList(foundationJobs.jobs).find(job => job.key === 'llm-auth-audit') || {}
  const budgetLabel = validateLlmAuthAuditBudgetLabel({
    jobDefinition,
    requiredProbes: [{ probeType: 'actual_model_run' }],
    auditScriptSource: '',
  })
  const budgetDogfood = buildLlmAuthAuditBudgetLabelDogfoodProof()
  const llmAuthBudgetLabelExistingWork = llmAuthBudgetLabelCurrentItem?.existingWorkCheck || {}
  const llmAuthBudgetLabelExistingWorkComplete =
    llmAuthBudgetLabelCurrentItem?.existingWorkCheckStatus === 'complete' ||
    Object.keys(llmAuthBudgetLabelExistingWork).length >= 9
  const llmAuthBudgetLabelIsBuilding =
    llmAuthBudgetLabelCurrentItem?.stage === 'building_now' &&
    llmAuthBudgetLabelExistingWorkComplete
  const llmAuthBudgetLabelIsClosed =
    llmAuthBudgetLabelCard?.lane === 'done' &&
    String(llmAuthBudgetLabelCard?.statusNote || '').includes(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY) &&
    llmAuthBudgetLabelCloseout?.operatorCloseout === true &&
    asList(llmAuthBudgetLabelCloseout.backlogIds).includes(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID)

  addCheck(checks, llmAuthAuditIsBuilding || llmAuthAuditIsClosed, 'LLM auth audit card is active or historically closed')
  addCheck(
    checks,
    packageJson.scripts?.['process:llm-auth-audit-check'] === `node --env-file-if-exists=.env ${LLM_AUTH_AUDIT_SCRIPT_PATH}`,
    'package exposes LLM auth audit proof script',
    packageJson.scripts?.['process:llm-auth-audit-check'] || 'missing',
  )
  addCheck(
    checks,
    llmAuthAuditApprovalValidation.ok &&
      llmAuthAuditApprovalValidation.mode === 'v2' &&
      llmAuthAuditApprovalValidation.approval?.approvedPlanRef === LLM_AUTH_AUDIT_PLAN_PATH,
    'LLM auth audit approval is valid',
    llmAuthAuditApprovalValidation.failures?.map(item => item.check).join(', ') || 'ok',
  )
  addCheck(checks, foundationHub.currentSprint?.status === 'healthy', 'Current Sprint API is healthy', foundationHub.currentSprint?.status || 'missing')
  addCheck(checks, foundationCurrentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', foundationCurrentSprintStatus.status || 'missing')
  addCheck(checks, llmAuthAuditRuntimeStatus.status === 'healthy', 'LLM auth runtime status is healthy', llmAuthAuditRuntimeStatus.status || 'missing')
  addCheck(checks, llmAuthAuditRuntimeStatus.summary?.credentialCount >= 6, 'LLM auth audit has required credential coverage', `${llmAuthAuditRuntimeStatus.summary?.credentialCount || 0}`)
  addCheck(checks, llmAuthAuditRuntimeStatus.summary?.routeCount >= 10, 'LLM auth audit has required route coverage', `${llmAuthAuditRuntimeStatus.summary?.routeCount || 0}`)
  addCheck(checks, llmAuthAuditRuntimeStatus.summary?.latestJob?.status === 'succeeded', 'LLM auth audit latest job succeeded', llmAuthAuditRuntimeStatus.summary?.latestJob?.status || 'missing')
  addCheck(checks, llmAuthAuditRuntimeStatus.summary?.dryRunCall?.status === 'skipped', 'LLM auth audit route proof is dry-run only', llmAuthAuditRuntimeStatus.summary?.dryRunCall?.status || 'missing')
  addCheck(
    checks,
    llmAuthAuditRuntimeStatus.summary?.budgetLabel?.status === 'honest' &&
      llmAuthAuditRuntimeStatus.summary?.budgetLabel?.budget === LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
    'LLM auth runtime summary exposes honest model-probe budget label',
    `${llmAuthAuditRuntimeStatus.summary?.budgetLabel?.status || 'missing'}/${llmAuthAuditRuntimeStatus.summary?.budgetLabel?.budget || 'missing'}`,
  )
  addCheck(checks, budgetLabel.ok, 'LLM auth audit job definition cannot hide model probe behind no_llm', budgetLabel.failed.map(item => `${item.check}: ${item.detail}`).join('; ') || budgetLabel.summary.budget)
  addCheck(checks, budgetDogfood.ok, 'LLM auth budget-label dogfood rejects hidden no_llm model probes', budgetDogfood.invariant)
  addCheck(checks, llmAuthBudgetLabelIsBuilding || llmAuthBudgetLabelIsClosed, 'LLM auth budget-label clarity card is active or historically closed', llmAuthBudgetLabelCard?.lane || llmAuthBudgetLabelCurrentItem?.stage || 'missing')
  addCheck(
    checks,
    packageJson.scripts?.['process:llm-auth-audit-budget-label-clarity-check'] === `node --env-file-if-exists=.env ${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH}`,
    'package exposes LLM auth budget-label proof script',
    packageJson.scripts?.['process:llm-auth-audit-budget-label-clarity-check'] || 'missing',
  )
  addCheck(
    checks,
    llmAuthBudgetLabelApprovalValidation.ok &&
      llmAuthBudgetLabelApprovalValidation.mode === 'v2' &&
      llmAuthBudgetLabelApprovalValidation.approval?.approvedPlanRef === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
    'LLM auth budget-label approval is valid',
    llmAuthBudgetLabelApprovalValidation.failures?.map(item => item.check).join(', ') || 'ok',
  )
  addCheck(
    checks,
    includesAll(llmAuthBudgetLabelCheckSource, [
      'validateLlmAuthAuditBudgetLabel',
      'buildLlmAuthAuditBudgetLabelDogfoodProof',
      'no_llm plus actual_model_run fails',
      'getFoundationJobDefinition',
    ]) &&
      (llmAuthBudgetLabelCheckSource.includes('closeSprintCard') || llmAuthBudgetLabelCheckSource.includes('closeCard')),
    'LLM auth budget-label proof owns source/job validation and closeout',
  )
  addCheck(
    checks,
    includesAll(llmAuthBudgetLabelPlanSource, [
      'model_probe_no_extraction',
      'Do not rerun the live LLM auth audit job',
    ]) &&
      /no_llm[^.]{0,60}hide/.test(llmAuthBudgetLabelPlanSource) &&
      (/No extraction/.test(llmAuthBudgetLabelPlanSource) || /Do not run live extraction/.test(llmAuthBudgetLabelPlanSource)),
    'LLM auth budget-label plan preserves no-run boundaries',
  )
  addCheck(
    checks,
    includesAll(llmAuthAuditProofSource, [
      'LLM_AUTH_AUDIT_REQUIRED_PROBES',
      'direct API fallback routes are explicitly available or blocked',
      'route-selection proof is dry-run only',
      'LLM audit runtime readback contains no raw credential-shaped values',
    ]),
    'LLM auth proof module contains required behavioral checks',
  )
  addCheck(
    checks,
    includesAll(llmAuthAuditCheckSource, [
      'getLlmRuntimeSnapshot',
      'getFoundationJobRunSnapshot',
      'maxAgeHours',
      'closeSprintCard',
      'SOURCE-EXTRACTION-GAP-FOLLOWUP-001',
    ]),
    'LLM auth process proof reads runtime/job truth and owns closeout',
  )
  addCheck(
    checks,
    includesAll(llmAuthAuditPlanSource, [
      'llm-auth-audit',
      'Direct API fallback remains guarded',
      'No new model spending path',
    ]),
    'LLM auth audit plan preserves spending and fallback boundaries',
  )
  addCheck(
    checks,
    includesAll(serverSource, [
      '/api/foundation/llm-runtime',
      'getLlmRuntimeSnapshot',
    ]),
    'server exposes LLM runtime readback route',
  )
  addCheck(
    checks,
    !llmAuthAuditIsClosed ||
      (asList(llmAuthAuditCloseout.proofCommands).includes('npm run process:llm-auth-audit-check -- --json') &&
        asList(llmAuthAuditCloseout.proofCommands).includes('npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof') &&
        asList(llmAuthAuditCloseout.backlogIds).includes(LLM_AUTH_AUDIT_CARD_ID)),
    'closed LLM auth audit has closeout proof commands and backlog id',
  )
  addCheck(
    checks,
    !llmAuthBudgetLabelIsClosed ||
      (asList(llmAuthBudgetLabelCloseout.proofCommands).includes('npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json') &&
        asList(llmAuthBudgetLabelCloseout.backlogIds).includes(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID)),
    'closed LLM auth budget-label clarity has closeout proof commands and backlog id',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    detail: failed.length ? failed.map(item => item.check).join('; ') : 'LLM auth audit verifier module passed',
  }
}

export function buildLlmAuthAuditVerifierDogfoodProof() {
  const healthyContext = {
    llmAuthAuditIsClosed: true,
    packageJson: {
      scripts: {
        'process:llm-auth-audit-check': `node --env-file-if-exists=.env ${LLM_AUTH_AUDIT_SCRIPT_PATH}`,
        'process:llm-auth-audit-budget-label-clarity-check': `node --env-file-if-exists=.env ${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH}`,
      },
    },
    llmAuthAuditApprovalValidation: {
      ok: true,
      mode: 'v2',
      approval: { approvedPlanRef: LLM_AUTH_AUDIT_PLAN_PATH },
    },
    foundationHub: { currentSprint: { status: 'healthy' } },
    foundationCurrentSprintStatus: { status: 'healthy' },
    llmAuthAuditRuntimeStatus: {
      status: 'healthy',
      summary: {
        credentialCount: 6,
        routeCount: 10,
        latestJob: { status: 'succeeded' },
        dryRunCall: { status: 'skipped' },
        budgetLabel: { status: 'honest', budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET },
      },
    },
    foundationJobs: {
      jobs: [{
        key: 'llm-auth-audit',
        budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
        runtimeMode: 'manual',
        mutationPosture: 'read_only',
        budgetDetails: {
          modelProviderProbe: true,
          extraction: false,
          externalWrite: false,
          agentFeedbackAutoSend: false,
        },
      }],
    },
    llmAuthBudgetLabelCard: {
      lane: 'done',
      statusNote: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
    },
    llmAuthBudgetLabelCloseout: {
      operatorCloseout: true,
      proofCommands: ['npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json'],
      backlogIds: [LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID],
    },
    llmAuthBudgetLabelApprovalValidation: {
      ok: true,
      mode: 'v2',
      approval: { approvedPlanRef: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH },
    },
    llmAuthBudgetLabelProofSource: `probeType: 'actual_model_run' providerModelProbe ${LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET}`,
    llmAuthBudgetLabelCheckSource: 'validateLlmAuthAuditBudgetLabel buildLlmAuthAuditBudgetLabelDogfoodProof no_llm plus actual_model_run fails getFoundationJobDefinition closeSprintCard',
    llmAuthBudgetLabelPlanSource: 'model_probe_no_extraction No extraction Do not rerun the live LLM auth audit job no_llm cannot hide',
    llmAuthAuditProofSource: 'LLM_AUTH_AUDIT_REQUIRED_PROBES direct API fallback routes are explicitly available or blocked route-selection proof is dry-run only LLM audit runtime readback contains no raw credential-shaped values',
    llmAuthAuditCheckSource: 'getLlmRuntimeSnapshot getFoundationJobRunSnapshot maxAgeHours closeSprintCard SOURCE-EXTRACTION-GAP-FOLLOWUP-001',
    llmAuthAuditPlanSource: 'llm-auth-audit Direct API fallback remains guarded No new model spending path',
    serverSource: '/api/foundation/llm-runtime getLlmRuntimeSnapshot',
    llmAuthAuditCloseout: {
      proofCommands: [
        'npm run process:llm-auth-audit-check -- --json',
        'npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof',
      ],
      backlogIds: [LLM_AUTH_AUDIT_CARD_ID],
    },
  }
  const healthy = evaluateLlmAuthAuditVerifierCheck(healthyContext)
  const staleRuntime = evaluateLlmAuthAuditVerifierCheck({
    ...healthyContext,
    llmAuthAuditRuntimeStatus: {
      ...healthyContext.llmAuthAuditRuntimeStatus,
      status: 'blocked',
      summary: {
        ...healthyContext.llmAuthAuditRuntimeStatus.summary,
        latestJob: { status: 'stale' },
      },
    },
  })
  const missingCloseoutProof = evaluateLlmAuthAuditVerifierCheck({
    ...healthyContext,
    llmAuthAuditCloseout: { proofCommands: [], backlogIds: [] },
  })
  const hiddenNoLlmBudget = evaluateLlmAuthAuditVerifierCheck({
    ...healthyContext,
    foundationJobs: {
      jobs: [{
        key: 'llm-auth-audit',
        budget: 'no_llm',
        runtimeMode: 'manual',
        mutationPosture: 'read_only',
        budgetDetails: {
          modelProviderProbe: true,
          extraction: false,
          externalWrite: false,
          agentFeedbackAutoSend: false,
        },
      }],
    },
    llmAuthAuditRuntimeStatus: {
      ...healthyContext.llmAuthAuditRuntimeStatus,
      summary: {
        ...healthyContext.llmAuthAuditRuntimeStatus.summary,
        budgetLabel: { status: 'risk', budget: 'no_llm' },
      },
    },
  })
  return {
    ok: healthy.ok === true && staleRuntime.ok === false && missingCloseoutProof.ok === false && hiddenNoLlmBudget.ok === false,
    healthy,
    staleRuntime,
    missingCloseoutProof,
    hiddenNoLlmBudget,
    dogfoodInvariant: 'The extracted module accepts the healthy approved LLM auth closeout and rejects stale runtime, missing closeout proof, or no_llm model-probe budget drift.',
  }
}
