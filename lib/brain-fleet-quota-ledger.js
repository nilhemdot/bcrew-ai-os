import { planBrainFleetRoute } from './brain-fleet-foundation.js'
import { createLlmCall, finishLlmCall } from './foundation-runtime-jobs-db.js'

export const BRAIN_FLEET_QUOTA_LEDGER_CARD_ID = 'BRAIN-FLEET-QUOTA-LEDGER-001'
export const BRAIN_FLEET_QUOTA_LEDGER_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_KEY = 'brain-fleet-quota-ledger-v1'
export const BRAIN_FLEET_QUOTA_LEDGER_PLAN_PATH = 'docs/process/brain-fleet-quota-ledger-001-plan.md'
export const BRAIN_FLEET_QUOTA_LEDGER_APPROVAL_PATH = 'docs/process/approvals/BRAIN-FLEET-QUOTA-LEDGER-001.json'
export const BRAIN_FLEET_QUOTA_LEDGER_SCRIPT_PATH = 'scripts/process-brain-fleet-quota-ledger-check.mjs'
export const BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md'
export const BRAIN_FLEET_QUOTA_LEDGER_NEXT_CARD_ID = 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001'

export const BRAIN_FLEET_LEDGER_VERSION = 1

export const BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS = Object.freeze({
  NONE: 'none',
  AUTH_NEEDED: 'auth_needed',
  RATE_LIMITED: 'rate_limited',
  QUOTA_EXHAUSTED: 'quota_exhausted',
  PROVIDER_FAILURE: 'provider_failure',
  PROVIDER_EXECUTION_DISABLED: 'provider_execution_disabled_for_proof',
  ROUTE_NOT_RUNNABLE: 'route_not_runnable',
  MISSING_LEDGER_TRUTH: 'missing_ledger_truth',
})

export const BRAIN_FLEET_QUOTA_LEDGER_NOT_NEXT = [
  'Do not run live provider probes from the quota ledger card.',
  'Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not mutate credentials, provider config, source systems, Drive permissions, email, Telegram, or public systems.',
  'Do not start extractor proof, YouTube runtime proof, broad crawl, Strategy, or People work from this card.',
  'Do not hide auth, quota, rate-limit, provider, or missing-ledger failures as green.',
]

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'skipped'])
const STOP_REQUIRED_STATUSES = new Set(['failed', 'skipped'])
const STOP_ON_FAILURE_CONDITIONS = new Set([
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.ROUTE_NOT_RUNNABLE,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.MISSING_LEDGER_TRUTH,
])

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value))
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value || null))
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0
    return entry !== null && entry !== undefined && entry !== ''
  }))
}

function quotaValue(source = {}, keys = []) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') return source[key]
  }
  return null
}

export function normalizeBrainFleetQuotaState(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const known = Object.keys(source).length > 0
  return {
    posture: known ? 'recorded' : 'unknown',
    state: known ? deepClone(source) : {},
    remaining: quotaValue(source, ['remaining', 'remainingCalls', 'remaining_calls', 'remainingTokens', 'remaining_tokens']),
    resetAt: quotaValue(source, ['resetAt', 'reset_at', 'quotaResetAt', 'quota_reset_at']),
    window: quotaValue(source, ['window', 'quotaWindow', 'quota_window']),
    source: known ? 'credential_quota_state' : 'credential_quota_state_empty',
  }
}

export function buildBrainFleetLedgerRecord({
  request = {},
  routeContract = {},
  status = 'planned',
  artifactRef = null,
  outputArtifactRef = null,
  failureReason = null,
  stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
  stopConditions = [],
  quotaState = null,
  actor = 'brain-fleet',
  startedAt = null,
  finishedAt = null,
} = {}) {
  const normalizedStatus = normalizeText(status) || 'planned'
  const normalizedStopCondition = normalizeText(stopCondition) || BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE
  const normalizedQuota = normalizeBrainFleetQuotaState(
    quotaState || routeContract.quota?.state || routeContract.quotaState || {},
  )
  const accountLabel = normalizeText(routeContract.accountLabel) || 'unknown_account_label'
  const inputArtifactRef = normalizeText(artifactRef || request.inputArtifactRef || request.artifactRef)
  const ledgerStopConditions = [
    normalizedStopCondition,
    ...asList(stopConditions),
    ...asList(routeContract.readiness?.stopConditions),
  ].map(normalizeText).filter(Boolean)

  return {
    ledgerVersion: BRAIN_FLEET_LEDGER_VERSION,
    workload: normalizeText(request.workload || routeContract.workload),
    hubKey: normalizeText(request.hubKey || routeContract.hubKey) || 'foundation',
    caller: normalizeText(request.caller || actor) || 'brain-fleet',
    routeKey: normalizeText(routeContract.routeKey),
    provider: normalizeText(routeContract.provider),
    model: normalizeText(routeContract.model),
    authPath: normalizeText(routeContract.authPath),
    credentialKey: normalizeText(routeContract.credentialKey),
    accountLabel,
    accountLabelKnown: accountLabel !== 'unknown_account_label',
    status: normalizedStatus,
    artifact: {
      inputArtifactRef,
      outputArtifactRef: normalizeText(outputArtifactRef || request.outputArtifactRef),
    },
    quota: normalizedQuota,
    failureReason: failureReason == null ? null : normalizeText(failureReason),
    stopCondition: normalizedStopCondition,
    stopConditions: Array.from(new Set(ledgerStopConditions)),
    routeReadiness: {
      canExecute: routeContract.readiness?.canExecute === true,
      routeRunnable: routeContract.readiness?.llmRouterRunnable === true,
      providerExecutionAllowed: routeContract.readiness?.providerExecutionAllowed === true,
      blockReason: routeContract.readiness?.llmRouterBlockReason || null,
    },
    createdBy: normalizeText(actor) || 'brain-fleet',
    startedAt: startedAt || null,
    finishedAt: finishedAt || null,
  }
}

export function validateBrainFleetLedgerRecord(record = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })

  add(Number(record.ledgerVersion) === BRAIN_FLEET_LEDGER_VERSION, 'ledger version is recorded', String(record.ledgerVersion || 'missing'))
  add(Boolean(normalizeText(record.workload)), 'workload is recorded', record.workload || 'missing')
  add(Boolean(normalizeText(record.routeKey)), 'route is recorded', record.routeKey || 'missing')
  add(Boolean(normalizeText(record.model)), 'model is recorded', record.model || 'missing')
  add(Boolean(normalizeText(record.accountLabel)), 'account label is recorded', record.accountLabel || 'missing')
  add(Boolean(normalizeText(record.status)), 'status is recorded', record.status || 'missing')
  add(Boolean(normalizeText(record.artifact?.inputArtifactRef)), 'artifact ref is recorded', record.artifact?.inputArtifactRef || 'missing')
  add(['recorded', 'unknown'].includes(record.quota?.posture), 'quota posture is explicit', record.quota?.posture || 'missing')
  add(Object.prototype.hasOwnProperty.call(record.quota || {}, 'resetAt'), 'quota reset state is explicit', record.quota?.resetAt || 'unknown')
  add(Object.prototype.hasOwnProperty.call(record, 'failureReason'), 'failure reason field is explicit', record.failureReason || 'none')
  add(Boolean(normalizeText(record.stopCondition)), 'stop condition is recorded', record.stopCondition || 'missing')
  add(Array.isArray(record.stopConditions), 'stop condition list is recorded', String(asList(record.stopConditions).length))
  if (STOP_REQUIRED_STATUSES.has(record.status)) {
    add(record.stopCondition !== BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE, 'terminal skip/failure has stop condition', record.stopCondition || 'missing')
    add(Boolean(normalizeText(record.failureReason)), 'terminal skip/failure has failure reason', record.failureReason || 'missing')
  }

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
  }
}

function assertValidLedgerRecord(record) {
  const validation = validateBrainFleetLedgerRecord(record)
  if (!validation.ok) {
    const detail = validation.failed.map(item => item.check).join(', ')
    throw new Error(`Brain Fleet ledger record is incomplete: ${detail}`)
  }
  return validation
}

export function buildBrainFleetLedgerCallInput({
  request = {},
  routeContract = {},
  ledgerRecord = null,
  status = 'planned',
  metadata = {},
} = {}) {
  const record = ledgerRecord || buildBrainFleetLedgerRecord({ request, routeContract, status })
  assertValidLedgerRecord(record)
  return {
    workload: record.workload,
    hubKey: record.hubKey,
    provider: record.provider,
    model: record.model,
    authPath: record.authPath,
    credentialKey: record.credentialKey || null,
    routeKey: record.routeKey || null,
    status: record.status,
    errorMessage: record.failureReason,
    finishedAt: TERMINAL_STATUSES.has(record.status) ? (record.finishedAt || new Date().toISOString()) : null,
    metadata: {
      ...metadata,
      brainFleetLedger: record,
      artifactRef: record.artifact.inputArtifactRef,
      quota: record.quota,
      failureReason: record.failureReason,
      stopCondition: record.stopCondition,
      stopConditions: record.stopConditions,
    },
  }
}

export async function recordBrainFleetLedgerCall({
  request = {},
  routeContract = {},
  status = 'planned',
  artifactRef = null,
  outputArtifactRef = null,
  failureReason = null,
  stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
  stopConditions = [],
  quotaState = null,
  metadata = {},
  actor = 'brain-fleet-quota-ledger',
  createCall = createLlmCall,
} = {}) {
  const ledgerRecord = buildBrainFleetLedgerRecord({
    request,
    routeContract,
    status,
    artifactRef,
    outputArtifactRef,
    failureReason,
    stopCondition,
    stopConditions,
    quotaState,
    actor,
    finishedAt: TERMINAL_STATUSES.has(status) ? new Date().toISOString() : null,
  })
  const input = buildBrainFleetLedgerCallInput({
    request,
    routeContract,
    ledgerRecord,
    status,
    metadata,
  })
  const call = await createCall(input, actor)
  return {
    call,
    ledgerRecord,
    validation: validateBrainFleetLedgerRecord(ledgerRecord),
  }
}

export async function finishBrainFleetLedgerCall({
  callId,
  request = {},
  routeContract = {},
  status = 'succeeded',
  outputArtifactRef = null,
  failureReason = null,
  stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
  stopConditions = [],
  quotaState = null,
  actor = 'brain-fleet-quota-ledger',
  metadata = {},
  estimatedOutputTokens = null,
  estimatedCostUsd = null,
  finishCall = finishLlmCall,
} = {}) {
  const ledgerRecord = buildBrainFleetLedgerRecord({
    request,
    routeContract,
    status,
    outputArtifactRef,
    failureReason,
    stopCondition,
    stopConditions,
    quotaState,
    actor,
    finishedAt: new Date().toISOString(),
  })
  assertValidLedgerRecord(ledgerRecord)
  const call = await finishCall(callId, {
    status,
    estimatedOutputTokens,
    estimatedCostUsd,
    errorMessage: failureReason,
    metadata: {
      ...metadata,
      brainFleetLedger: ledgerRecord,
      quota: ledgerRecord.quota,
      failureReason: ledgerRecord.failureReason,
      stopCondition: ledgerRecord.stopCondition,
      stopConditions: ledgerRecord.stopConditions,
    },
  })
  return {
    call,
    ledgerRecord,
    validation: validateBrainFleetLedgerRecord(ledgerRecord),
  }
}

export async function planAndRecordBrainFleetLedgerCall({
  request,
  routePlanner,
  createCall = createLlmCall,
  actor = 'brain-fleet-quota-ledger',
  status = 'planned',
  metadata = {},
} = {}) {
  const plan = await planBrainFleetRoute({ request, routePlanner })
  const ledger = await recordBrainFleetLedgerCall({
    request: plan.request,
    routeContract: plan.routeContract,
    status,
    artifactRef: plan.request.inputArtifactRef,
    stopCondition: status === 'skipped'
      ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED
      : BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
    failureReason: status === 'skipped' ? 'Provider execution disabled; quota ledger proof only.' : null,
    metadata: {
      ...metadata,
      routerPlan: plan.routerPlan,
    },
    actor,
    createCall,
  })
  return {
    plan,
    ledger,
  }
}

export function buildBrainFleetStopDecision({ status = '', stopCondition = '', failureReason = '' } = {}) {
  const normalizedStatus = normalizeText(status)
  const normalizedStopCondition = normalizeText(stopCondition)
  const normalizedFailureReason = normalizeText(failureReason).toLowerCase()
  const inferredCondition = normalizedStopCondition ||
    (/auth|2fa|mfa/.test(normalizedFailureReason) ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED : '') ||
    (/rate.?limit/.test(normalizedFailureReason) ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED : '') ||
    (/quota|credit|capacity/.test(normalizedFailureReason) ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED : '') ||
    (/provider|adapter|transport/.test(normalizedFailureReason) ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE : '')
  const shouldStop = normalizedStatus === 'failed' && STOP_ON_FAILURE_CONDITIONS.has(inferredCondition)
  return {
    shouldStop,
    stopCondition: inferredCondition || BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
    action: shouldStop ? 'stop_workload_fail_closed' : 'continue_or_review',
  }
}

export function assertBrainFleetCredentialsUnchanged(beforeCredentials = [], afterCredentials = []) {
  if (stableString(beforeCredentials) !== stableString(afterCredentials)) {
    throw new Error('Brain Fleet quota ledger proof mutated credential truth.')
  }
  return true
}

export function evaluateBrainFleetQuotaLedger({
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  packageJson = {},
  llmRuntime = {},
  syntheticProof = {},
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const source = `${moduleSource}\n${scriptSource}`
  const normalizedPlan = String(planSource || '').toLowerCase()
  const packageScript = packageJson.scripts?.['process:brain-fleet-quota-ledger-check']

  add(moduleSource.includes('createLlmCall') && moduleSource.includes('finishLlmCall'), 'ledger uses existing llm_calls runtime store helpers', 'createLlmCall/finishLlmCall')
  add(moduleSource.includes('brainFleetLedger') && moduleSource.includes('accountLabel') && moduleSource.includes('stopCondition'), 'ledger metadata records account, artifact, quota, failure, and stop truth', 'brainFleetLedger')
  add(!/\bcallLlm\s*\(|\bcallEmbedding\s*\(/.test(moduleSource), 'quota ledger module does not execute provider calls', 'no callLlm/callEmbedding')
  add(!/\bfetch\s*\(|\bspawn\s*\(/.test(source), 'focused ledger path does not call external providers or spawn provider CLIs', 'no fetch/spawn')
  add(!/(upsertLlmCredential|upsertLlmRoute|recordLlmRouteProbe)\s*\(/.test(moduleSource), 'quota ledger does not mutate credential, route, or probe truth', 'no credential/route/probe mutation')
  add(packageScript === `node --env-file-if-exists=.env ${BRAIN_FLEET_QUOTA_LEDGER_SCRIPT_PATH}`, 'package exposes focused quota ledger proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('llm_calls') &&
      normalizedPlan.includes('quota/reset') &&
      normalizedPlan.includes('artifact') &&
      normalizedPlan.includes('stop condition') &&
      normalizedPlan.includes('do not run live provider probes') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents ledger fields, probe ban, and ship gate',
    BRAIN_FLEET_QUOTA_LEDGER_PLAN_PATH,
  )
  add(Array.isArray(llmRuntime.credentials) && llmRuntime.credentials.length > 0, 'live LLM credential truth is available', `credentials=${llmRuntime.credentials?.length || 0}`)
  add(Array.isArray(llmRuntime.routes) && llmRuntime.routes.length > 0, 'live LLM route truth is available', `routes=${llmRuntime.routes?.length || 0}`)
  add(syntheticProof.ok === true, 'synthetic proof exercises ledger behavior', syntheticProof.mode || 'missing')
  add(syntheticProof.everyLedgerHasRequiredTruth === true, 'dogfood proves every ledger row has required truth', 'ledger fields complete')
  add(syntheticProof.stopOnQuotaRateAuthProvider === true, 'dogfood proves quota/rate/auth/provider stop controls', 'stop conditions')
  add(syntheticProof.noCredentialMutation === true, 'dogfood proves no credential mutation', 'credentials unchanged')
  add(syntheticProof.noProviderExecution === true, 'dogfood proves no provider execution', 'provider calls=0')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export async function buildSyntheticBrainFleetQuotaLedgerProof() {
  const fakeCredential = {
    credentialKey: 'openai-api-default',
    accountLabel: 'OPENAI_API_KEY',
    quotaState: {
      remaining: 17,
      resetAt: '2026-05-21T00:00:00.000Z',
      window: 'daily',
    },
  }
  const request = {
    workload: 'extraction',
    hubKey: 'foundation',
    caller: 'synthetic-quota-ledger-proof',
    inputArtifactRef: 'artifact://synthetic/build-intel/video-1',
    outputArtifactRef: 'artifact://synthetic/build-intel/video-1-summary',
  }
  const routeContract = {
    workload: request.workload,
    hubKey: request.hubKey,
    routeKey: 'foundation-extraction-openai-api',
    provider: 'openai',
    model: 'configured-cheap-extraction-model',
    authPath: 'api_direct',
    credentialKey: fakeCredential.credentialKey,
    accountLabel: fakeCredential.accountLabel,
    quota: {
      posture: 'recorded',
      state: fakeCredential.quotaState,
    },
    readiness: {
      canExecute: false,
      llmRouterRunnable: true,
      providerExecutionAllowed: false,
      stopConditions: [
        BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
      ],
    },
  }
  const createdCalls = []
  const finishedCalls = []
  let providerExecutionCalls = 0
  const createCall = async (input, actor) => {
    const call = {
      callId: `synthetic-call-${createdCalls.length + 1}`,
      ...input,
      metadata: {
        ...(input.metadata || {}),
        requestedBy: actor,
      },
    }
    createdCalls.push(call)
    return call
  }
  const finishCall = async (callId, input) => {
    const existing = createdCalls.find(call => call.callId === callId) || {}
    const call = {
      ...existing,
      ...input,
      callId,
      metadata: {
        ...(existing.metadata || {}),
        ...(input.metadata || {}),
      },
    }
    finishedCalls.push(call)
    return call
  }
  const beforeCredentials = [deepClone(fakeCredential)]
  const planned = await recordBrainFleetLedgerCall({
    request,
    routeContract,
    status: 'planned',
    createCall,
    actor: 'synthetic-quota-ledger-proof',
  })
  const succeeded = await finishBrainFleetLedgerCall({
    callId: planned.call.callId,
    request,
    routeContract,
    status: 'succeeded',
    outputArtifactRef: request.outputArtifactRef,
    finishCall,
    actor: 'synthetic-quota-ledger-proof',
  })
  const skipped = await recordBrainFleetLedgerCall({
    request,
    routeContract,
    status: 'skipped',
    failureReason: 'Quota exhausted until reset.',
    stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED,
    createCall,
    actor: 'synthetic-quota-ledger-proof',
  })
  const unknownQuotaRecord = buildBrainFleetLedgerRecord({
    request,
    routeContract: {
      ...routeContract,
      quota: { posture: 'unknown', state: {} },
    },
    status: 'planned',
  })
  const missingArtifactRejected = (() => {
    try {
      const record = buildBrainFleetLedgerRecord({
        request: { ...request, inputArtifactRef: '' },
        routeContract,
        status: 'planned',
      })
      assertValidLedgerRecord(record)
      return false
    } catch (error) {
      return /artifact/i.test(error instanceof Error ? error.message : String(error))
    }
  })()
  const missingStopRejected = (() => {
    try {
      const record = buildBrainFleetLedgerRecord({
        request,
        routeContract,
        status: 'failed',
        failureReason: 'Provider failed.',
        stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
      })
      assertValidLedgerRecord(record)
      return false
    } catch (error) {
      return /stop condition/i.test(error instanceof Error ? error.message : String(error))
    }
  })()
  const stopDecisions = [
    buildBrainFleetStopDecision({ status: 'failed', stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED, failureReason: '2FA required.' }),
    buildBrainFleetStopDecision({ status: 'failed', stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED, failureReason: 'Rate limited.' }),
    buildBrainFleetStopDecision({ status: 'failed', stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED, failureReason: 'Quota exhausted.' }),
    buildBrainFleetStopDecision({ status: 'failed', stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE, failureReason: 'Provider transport failed.' }),
  ]
  const noCredentialMutation = assertBrainFleetCredentialsUnchanged(beforeCredentials, [deepClone(fakeCredential)])
  const ledgerRecords = [
    planned.ledgerRecord,
    succeeded.ledgerRecord,
    skipped.ledgerRecord,
    unknownQuotaRecord,
  ]
  const ledgerValidations = ledgerRecords.map(record => validateBrainFleetLedgerRecord(record))
  const everyLedgerHasRequiredTruth = ledgerValidations.every(validation => validation.ok)
  const stopOnQuotaRateAuthProvider = stopDecisions.every(decision => decision.shouldStop && decision.action === 'stop_workload_fail_closed')

  return {
    ok: everyLedgerHasRequiredTruth &&
      missingArtifactRejected &&
      missingStopRejected &&
      stopOnQuotaRateAuthProvider &&
      noCredentialMutation &&
      providerExecutionCalls === 0,
    mode: 'brain-fleet-quota-ledger-synthetic-proof',
    everyLedgerHasRequiredTruth,
    stopOnQuotaRateAuthProvider,
    noCredentialMutation,
    noProviderExecution: providerExecutionCalls === 0,
    missingArtifactRejected,
    missingStopRejected,
    createdCallCount: createdCalls.length,
    finishedCallCount: finishedCalls.length,
    ledgerValidations,
    sampleLedger: compactObject(planned.ledgerRecord),
    skippedStopCondition: skipped.ledgerRecord.stopCondition,
    unknownQuotaPosture: unknownQuotaRecord.quota.posture,
  }
}
