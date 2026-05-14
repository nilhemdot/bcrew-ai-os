import {
  LLM_AUTH_AUDIT_CARD_ID,
  LLM_AUTH_AUDIT_PLAN_PATH,
  LLM_AUTH_AUDIT_SCRIPT_PATH,
} from './llm-auth-audit-proof.js'

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
} = {}) {
  const checks = []
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
      },
    },
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
  return {
    ok: healthy.ok === true && staleRuntime.ok === false && missingCloseoutProof.ok === false,
    healthy,
    staleRuntime,
    missingCloseoutProof,
    dogfoodInvariant: 'The extracted module accepts the healthy approved LLM auth closeout and rejects stale runtime or missing closeout proof.',
  }
}
