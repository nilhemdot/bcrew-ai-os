import {
  validateLlmAuthAuditBudgetLabel,
} from './llm-auth-audit-budget-label-clarity.js'

export const LLM_AUTH_AUDIT_CARD_ID = 'LLM-AUTH-AUDIT-001'
export const LLM_AUTH_AUDIT_CLOSEOUT_KEY = 'llm-auth-audit-v1'
export const LLM_AUTH_AUDIT_PLAN_PATH = 'docs/process/llm-auth-audit-001-plan.md'
export const LLM_AUTH_AUDIT_APPROVAL_PATH = 'docs/process/approvals/LLM-AUTH-AUDIT-001.json'
export const LLM_AUTH_AUDIT_SCRIPT_PATH = 'scripts/process-llm-auth-audit-check.mjs'
export const LLM_AUTH_AUDIT_JOB_KEY = 'llm-auth-audit'

export const LLM_AUTH_AUDIT_REQUIRED_CREDENTIALS = [
  { credentialKey: 'openai-api-default', acceptedStatuses: ['available'], policyClassification: 'api_fallback' },
  { credentialKey: 'anthropic-api-default', acceptedStatuses: ['available', 'missing'], policyClassification: 'api_fallback' },
  { credentialKey: 'claude-code-local-max', acceptedStatuses: ['available', 'blocked', 'missing'], policyClassification: 'experimental' },
  { credentialKey: 'claude-code-oauth-token', acceptedStatuses: ['available', 'missing'], policyClassification: 'experimental' },
  { credentialKey: 'openclaw-chatgpt-pro', acceptedStatuses: ['available', 'unknown', 'missing'], policyClassification: ['allowed', 'experimental'] },
  { credentialKey: 'gemini-api-default', acceptedStatuses: ['available', 'missing'], policyClassification: 'api_fallback' },
]

export const LLM_AUTH_AUDIT_REQUIRED_PROBES = [
  { provider: 'openai', authPath: 'api_direct', probeType: 'env_presence', acceptedStatuses: ['passed'] },
  { provider: 'anthropic', authPath: 'api_direct', probeType: 'env_presence', acceptedStatuses: ['passed', 'failed'] },
  { provider: 'claude_code', authPath: 'claude_code_subscription', probeType: 'cli_installed', acceptedStatuses: ['passed', 'failed'] },
  { provider: 'claude_code', authPath: 'claude_code_subscription', probeType: 'cli_version', acceptedStatuses: ['passed', 'failed', 'skipped'] },
  { provider: 'claude_code', authPath: 'claude_code_subscription', probeType: 'auth_status', acceptedStatuses: ['passed', 'failed', 'skipped'] },
  { provider: 'claude_code', authPath: 'claude_code_oauth_token', probeType: 'env_presence', acceptedStatuses: ['passed', 'failed'] },
  { provider: 'openclaw', authPath: 'chatgpt_subscription_gateway', probeType: 'gateway_runtime', acceptedStatuses: ['passed', 'warning'] },
  { provider: 'openclaw', authPath: 'chatgpt_subscription_gateway', probeType: 'actual_model_run', acceptedStatuses: ['passed', 'failed'] },
  { provider: 'gemini', authPath: 'gemini_api_direct', probeType: 'env_presence', acceptedStatuses: ['passed', 'failed'] },
]

export const LLM_AUTH_AUDIT_REQUIRED_ROUTES = [
  { routeKey: 'foundation-extraction-openai-api', acceptedStatuses: ['available', 'blocked'], policyClassification: 'api_fallback' },
  { routeKey: 'foundation-synthesis-openai-api', acceptedStatuses: ['available', 'blocked'], policyClassification: 'api_fallback' },
  { routeKey: 'foundation-embedding-openai-api', acceptedStatuses: ['available', 'blocked'], policyClassification: 'api_fallback' },
  { routeKey: 'foundation-extraction-openclaw-chatgpt', acceptedStatuses: ['blocked'], policyClassification: 'blocked' },
  { routeKey: 'foundation-synthesis-openclaw-chatgpt', acceptedStatuses: ['blocked'], policyClassification: 'blocked' },
  { routeKey: 'foundation-synthesis-claude-code', acceptedStatuses: ['probe_required', 'blocked'], policyClassification: 'experimental' },
  { routeKey: 'foundation-agent-claude-code', acceptedStatuses: ['available', 'probe_required', 'blocked'], policyClassification: 'experimental' },
  { routeKey: 'foundation-synthesis-claude-oauth', acceptedStatuses: ['probe_required', 'blocked'], policyClassification: 'experimental' },
  { routeKey: 'foundation-synthesis-anthropic-api', acceptedStatuses: ['available', 'blocked'], policyClassification: 'api_fallback' },
  { routeKey: 'foundation-video-gemini-api', acceptedStatuses: ['available', 'blocked'], policyClassification: 'api_fallback' },
]

function asList(value) {
  return Array.isArray(value) ? value : []
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function statusAccepted(actual, accepted) {
  return asList(accepted).includes(actual)
}

function policyAccepted(actual, accepted) {
  return Array.isArray(accepted) ? accepted.includes(actual) : actual === accepted
}

function ageHours(value, now) {
  const timestamp = value ? new Date(value).getTime() : NaN
  if (!Number.isFinite(timestamp)) return Infinity
  return Math.max(0, (now.getTime() - timestamp) / 3600000)
}

function isFresh(value, now, maxAgeHours) {
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) return true
  return ageHours(value, now) <= maxAgeHours
}

function probeKey(probe) {
  return [probe.provider, probe.authPath, probe.probeType].join('|')
}

function latestProbeMap(probes) {
  const sorted = [...asList(probes)].sort((a, b) => new Date(b.probedAt || 0) - new Date(a.probedAt || 0))
  const map = new Map()
  for (const probe of sorted) {
    const key = probeKey(probe)
    if (!map.has(key)) map.set(key, probe)
  }
  return map
}

function latestDryRunCall(calls) {
  return [...asList(calls)]
    .sort((a, b) => new Date(b.createdAt || b.startedAt || 0) - new Date(a.createdAt || a.startedAt || 0))
    .find(call => call.metadata?.proof === 'llm-auth-audit-route-selection') || null
}

function latestRunForJob(foundationJobs = {}, jobKey) {
  return asList(foundationJobs.latestRuns).find(run => run.jobKey === jobKey) ||
    asList(foundationJobs.jobs).find(job => job.key === jobKey)?.latestRun ||
    null
}

function noRawCredentialLeak(value) {
  const text = JSON.stringify(value || {})
  const forbiddenPatterns = [
    /(^|[^A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{12,}/,
    /ghp_[A-Za-z0-9]{12,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /CLAUDE_CODE_OAUTH_TOKEN\s*=/,
    /OPENAI_API_KEY\s*=/,
    /ANTHROPIC_API_KEY\s*=/,
    /GEMINI_API_KEY\s*=/,
  ]
  return forbiddenPatterns.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

export function buildLlmAuthAuditStatus({
  llmRuntime = {},
  foundationJobs = {},
  now = new Date(),
  maxAgeHours = 24,
} = {}) {
  const findings = []
  const credentialsByKey = new Map(asList(llmRuntime.credentials).map(item => [item.credentialKey, item]))
  const routesByKey = new Map(asList(llmRuntime.routes).map(item => [item.routeKey, item]))
  const probesByKey = latestProbeMap(llmRuntime.recentProbes)
  const latestJob = latestRunForJob(foundationJobs, LLM_AUTH_AUDIT_JOB_KEY)
  const dryRunCall = latestDryRunCall(llmRuntime.recentCalls)
  const jobDefinition = asList(foundationJobs.jobs).find(job => job.key === LLM_AUTH_AUDIT_JOB_KEY) || {}
  const budgetLabel = validateLlmAuthAuditBudgetLabel({
    jobDefinition,
    requiredProbes: LLM_AUTH_AUDIT_REQUIRED_PROBES,
    auditScriptSource: foundationJobs.auditScriptSource || '',
  })

  addFinding(
    findings,
    latestJob?.status === 'succeeded' &&
      isFresh(latestJob.finishedAt || latestJob.updatedAt || latestJob.createdAt, now, maxAgeHours) &&
      latestJob.command?.command === 'npm' &&
      asList(latestJob.command?.args).join(' ') === 'run llm:auth-audit',
    'llm-auth-audit job has a fresh successful Foundation job-ledger run',
    latestJob ? `${latestJob.status} ${latestJob.finishedAt || latestJob.updatedAt || latestJob.createdAt}` : 'missing latest run',
  )

  for (const expected of LLM_AUTH_AUDIT_REQUIRED_CREDENTIALS) {
    const credential = credentialsByKey.get(expected.credentialKey)
    addFinding(
      findings,
      Boolean(credential) &&
        statusAccepted(credential.status, expected.acceptedStatuses) &&
        policyAccepted(credential.policyClassification, expected.policyClassification),
      `${expected.credentialKey} credential is classified`,
      credential ? `${credential.status}/${credential.policyClassification}` : 'missing',
    )
  }

  for (const expected of LLM_AUTH_AUDIT_REQUIRED_PROBES) {
    const probe = probesByKey.get(probeKey(expected))
    addFinding(
      findings,
      Boolean(probe) &&
        statusAccepted(probe.status, expected.acceptedStatuses) &&
        isFresh(probe.probedAt, now, maxAgeHours),
      `${expected.provider}/${expected.authPath}/${expected.probeType} probe is fresh and classified`,
      probe ? `${probe.status} ${probe.probedAt}` : 'missing',
    )
  }

  for (const expected of LLM_AUTH_AUDIT_REQUIRED_ROUTES) {
    const route = routesByKey.get(expected.routeKey)
    addFinding(
      findings,
      Boolean(route) &&
        statusAccepted(route.status, expected.acceptedStatuses) &&
        policyAccepted(route.policyClassification, expected.policyClassification) &&
        route.status !== 'planned',
      `${expected.routeKey} route is classified`,
      route ? `${route.status}/${route.policyClassification}/${route.riskClass}` : 'missing',
    )
  }

  const directFallbackRoutes = asList(llmRuntime.routes).filter(route => route.policyClassification === 'api_fallback')
  addFinding(
    findings,
    directFallbackRoutes.length >= 4 && directFallbackRoutes.every(route => ['available', 'blocked'].includes(route.status)),
    'direct API fallback routes are explicitly available or blocked',
    directFallbackRoutes.map(route => `${route.routeKey}:${route.status}`).join(', '),
  )

  addFinding(
    findings,
    dryRunCall?.status === 'skipped' &&
      dryRunCall.metadata?.dryRun === true &&
      dryRunCall.metadata?.reason === 'Router MVP records route selection only; no provider call made.' &&
      isFresh(dryRunCall.createdAt || dryRunCall.startedAt, now, maxAgeHours),
    'route-selection proof is dry-run only and does not call a provider',
    dryRunCall ? `${dryRunCall.status} ${dryRunCall.routeKey} ${dryRunCall.createdAt || dryRunCall.startedAt}` : 'missing',
  )

  addFinding(
    findings,
    budgetLabel.ok,
    'LLM auth audit budget label is honest about provider model probing',
    budgetLabel.failed.map(item => `${item.check}: ${item.detail}`).join('; ') || budgetLabel.summary.budget,
  )

  const leakPatterns = noRawCredentialLeak({
    credentials: llmRuntime.credentials,
    routes: llmRuntime.routes,
    probes: llmRuntime.recentProbes,
    calls: llmRuntime.recentCalls,
    latestJob: latestJob ? { command: latestJob.command, metadata: latestJob.metadata } : null,
  })
  addFinding(
    findings,
    leakPatterns.length === 0,
    'LLM audit runtime readback contains no raw credential-shaped values',
    leakPatterns.join(', '),
  )

  const routeTruth = {
    openAiApi: routesByKey.get('foundation-extraction-openai-api')?.status || 'missing',
    openClawExtraction: routesByKey.get('foundation-extraction-openclaw-chatgpt')?.status || 'missing',
    openClawSynthesis: routesByKey.get('foundation-synthesis-openclaw-chatgpt')?.status || 'missing',
    claudeCodeSynthesis: routesByKey.get('foundation-synthesis-claude-code')?.status || 'missing',
    claudeOauth: routesByKey.get('foundation-synthesis-claude-oauth')?.status || 'missing',
    anthropicApi: routesByKey.get('foundation-synthesis-anthropic-api')?.status || 'missing',
    geminiVideo: routesByKey.get('foundation-video-gemini-api')?.status || 'missing',
  }

  return {
    status: findings.length ? 'blocked' : 'healthy',
    cardId: LLM_AUTH_AUDIT_CARD_ID,
    closeoutKey: LLM_AUTH_AUDIT_CLOSEOUT_KEY,
    generatedAt: now.toISOString(),
    maxAgeHours,
    summary: {
      credentialCount: asList(llmRuntime.credentials).length,
      routeCount: asList(llmRuntime.routes).length,
      recentProbeCount: asList(llmRuntime.recentProbes).length,
      routeTruth,
      latestJob: latestJob ? {
        runId: latestJob.runId,
        status: latestJob.status,
        finishedAt: latestJob.finishedAt,
        requestedBy: latestJob.requestedBy,
      } : null,
      dryRunCall: dryRunCall ? {
        callId: dryRunCall.callId,
        status: dryRunCall.status,
        routeKey: dryRunCall.routeKey,
        createdAt: dryRunCall.createdAt,
      } : null,
      budgetLabel: budgetLabel.summary,
    },
    findings,
  }
}
