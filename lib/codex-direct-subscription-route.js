import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from './brain-fleet-quota-ledger.js'
import {
  buildAuthNeededEvent,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'
import { LLM_AUTH_PATHS, LLM_WORKLOADS } from './llm-router.js'

export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID = 'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY = 'codex-direct-subscription-route-v1'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_PLAN_PATH = 'docs/process/codex-direct-subscription-route-001-plan.md'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_APPROVAL_PATH = 'docs/process/approvals/CODEX-DIRECT-SUBSCRIPTION-ROUTE-001.json'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_SCRIPT_PATH = 'scripts/process-codex-direct-subscription-route-check.mjs'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-codex-direct-subscription-route-closeout.md'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_NEXT_CARD_ID = 'GEMINI-VIDEO-BRAIN-ROUTE-001'

export const CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY = 'codex-direct-chatgpt-local'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY = 'foundation-agent-codex-direct'
export const CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL = process.env.LLM_CODEX_DIRECT_MODEL || 'gpt-5.5'
export const CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL = process.env.LLM_CODEX_DIRECT_FALLBACK_MODEL || 'gpt-5.4-mini'
export const CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN = 'CODEX_DIRECT_SUBSCRIPTION_ROUTE_OK'
export const CODEX_DIRECT_SUBSCRIPTION_PROBE_TYPE = 'bounded_local_cli_probe'

export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_NOT_NEXT = [
  'Do not use direct Codex subscription as a generic backend API.',
  'Do not run extraction, broad source crawls, Skool, MyICOR, Loom, or YouTube runtime work from this card.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.',
  'Do not mutate credentials, OAuth tokens, browser profiles, Codex auth files, provider config, source systems, or public exposure settings.',
  'Do not hide auth, quota, rate-limit, provider, ledger, or credential-mutation failures by classification.',
  'Do not continue to Gemini, Claude, OpenClaw, or extractor proof until this route is ledgered, probed, and Current Sprint advances cleanly.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0
    return entry !== null && entry !== undefined && entry !== ''
  }))
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function safeErrorText(value = '') {
  return normalizeText(value)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer <redacted>')
    .replace(/access[_-]?token["':=\s]+[A-Za-z0-9._-]+/gi, 'access_token=<redacted>')
    .slice(0, 800)
}

function modelSpeedAvailable(model = {}) {
  return asList(model.additional_speed_tiers).includes('fast') ||
    asList(model.service_tiers).some(tier => normalizeText(tier.id) === 'priority' || normalizeText(tier.name).toLowerCase() === 'fast')
}

function normalizeModel(model = null) {
  if (!model) return null
  return compactObject({
    slug: normalizeText(model.slug),
    displayName: normalizeText(model.display_name || model.displayName),
    defaultReasoningLevel: normalizeText(model.default_reasoning_level || model.defaultReasoningLevel),
    supportedReasoningLevels: asList(model.supported_reasoning_levels || model.supportedReasoningLevels).map(item => normalizeText(item.effort || item)).filter(Boolean),
    additionalSpeedTiers: asList(model.additional_speed_tiers || model.additionalSpeedTiers).map(normalizeText).filter(Boolean),
    serviceTiers: asList(model.service_tiers || model.serviceTiers).map(tier => compactObject({
      id: tier.id,
      name: tier.name,
      description: tier.description,
    })),
    supportedInApi: model.supported_in_api ?? model.supportedInApi ?? null,
    visibility: normalizeText(model.visibility),
    speedFastAvailable: modelSpeedAvailable(model),
  })
}

export function extractCodexModelAvailability(modelsPayload = {}, {
  primaryModel = CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
  fallbackModel = CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL,
} = {}) {
  const models = asList(modelsPayload.models)
  const bySlug = new Map(models.map(model => [normalizeText(model.slug), model]))
  const primary = normalizeModel(bySlug.get(primaryModel))
  const fallback = normalizeModel(bySlug.get(fallbackModel))
  return {
    source: 'codex debug models',
    modelCount: models.length,
    primaryModel,
    fallbackModel,
    primary,
    fallback,
    primaryAvailable: Boolean(primary),
    fallbackAvailable: Boolean(fallback),
    fastAvailable: Boolean(primary?.speedFastAvailable),
    fastTier: primary?.serviceTiers?.find(tier => tier.id === 'priority' || String(tier.name || '').toLowerCase() === 'fast') || null,
  }
}

export function parseCodexDoctorReport(report = {}) {
  const checks = report.checks || {}
  const auth = checks['auth.credentials'] || {}
  const config = checks['config.load'] || {}
  const reachability = checks['network.provider_reachability'] || {}
  const websocket = checks['network.websocket_reachability'] || {}
  const authDetails = auth.details || {}
  return {
    overallStatus: normalizeText(report.overallStatus),
    codexVersion: normalizeText(report.codexVersion),
    model: normalizeText(config.details?.model),
    modelProvider: normalizeText(config.details?.['model provider']),
    authMode: normalizeText(authDetails['stored auth mode']),
    authConfigured: auth.status === 'ok' && authDetails['stored ChatGPT tokens'] === 'true',
    storedApiKey: authDetails['stored API key'] === 'true',
    storedChatGptTokens: authDetails['stored ChatGPT tokens'] === 'true',
    providerReachable: reachability.status === 'ok',
    websocketReachable: websocket.status === 'ok',
    wireApi: normalizeText(websocket.details?.['wire API']),
    supportsWebsockets: websocket.details?.['supports websockets'] === 'true',
    quota: {
      posture: 'unknown',
      state: {
        status: 'unknown',
        source: 'codex_doctor_does_not_expose_quota_or_reset',
      },
      resetAt: null,
      remaining: null,
    },
  }
}

export function buildCodexDirectSubscriptionCredential({
  status = 'unknown',
  policyClassification = 'experimental',
  quotaState = {},
  metadata = {},
} = {}) {
  return {
    credentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
    provider: 'codex',
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    displayName: 'Local Codex ChatGPT Login',
    accountLabel: 'local Codex ChatGPT login',
    hubKey: 'foundation',
    workloadLane: 'agent',
    secretRef: 'local_codex_chatgpt_auth',
    status,
    policyClassification,
    allowedWorkloads: [LLM_WORKLOADS.AGENT, 'agent_probe', 'coding_review', 'deep_audit_probe'],
    quotaState,
    metadata: {
      brainFleetCapability: {
        speedMode: 'fast',
        reasoningPosture: 'coding_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: status === 'available' ? 'available' : status === 'auth_needed' ? 'auth_needed' : 'probe_required',
        knownLimitations: [
          'direct_codex_cli_route_is_local_tooling_only_not_generic_backend_api',
          'quota_reset_state_not_exposed_by_codex_doctor',
          'external_writes_disallowed',
          'credential_mutation_disallowed',
        ],
      },
      ...metadata,
    },
    notes: 'Direct local Codex CLI subscription route for bounded coding-agent/tooling probes only. Not approved as a generic backend API or extractor route.',
  }
}

export function buildCodexDirectSubscriptionRoute({
  status = 'probe_required',
  policyClassification = 'experimental',
  riskClass = 'untested',
  model = CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
  metadata = {},
} = {}) {
  return {
    routeKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    priority: 5,
    provider: 'codex',
    model,
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    credentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
    fallbackRouteKey: 'foundation-agent-claude-code',
    status,
    policyClassification,
    riskClass,
    costCapUsd: 0,
    metadata: {
      brainFleetCapability: {
        speedMode: 'fast',
        reasoningPosture: 'coding_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: status === 'available' ? 'available' : status === 'blocked' ? 'blocked' : 'probe_required',
        allowedWorkloads: [LLM_WORKLOADS.AGENT, 'agent_probe', 'coding_review', 'deep_audit_probe'],
        knownLimitations: [
          'direct_codex_cli_route_is_local_tooling_only_not_generic_backend_api',
          'generic_llm_router_execution_stays_blocked_until_explicit_policy_promotion',
          'no_extractor_or_external_write_workloads',
        ],
      },
      ...metadata,
    },
    notes: 'Bounded direct Codex CLI route separate from OpenClaw. Requires Brain Fleet ledger, Harlan auth-needed handling, and explicit local-tooling boundary.',
  }
}

export function buildCodexDirectRouteContract({
  credential = buildCodexDirectSubscriptionCredential(),
  route = buildCodexDirectSubscriptionRoute(),
} = {}) {
  return {
    workload: route.workload,
    hubKey: route.hubKey,
    routeKey: route.routeKey,
    provider: route.provider,
    model: route.model,
    authPath: route.authPath,
    credentialKey: route.credentialKey,
    accountLabel: credential.accountLabel,
    quota: {
      posture: Object.keys(credential.quotaState || {}).length ? 'recorded' : 'unknown',
      state: credential.quotaState || {},
      resetAt: credential.quotaState?.resetAt || null,
    },
    readiness: {
      canExecute: true,
      llmRouterRunnable: false,
      providerExecutionAllowed: true,
      stopConditions: [],
      llmRouterBlockReason: 'direct Codex probe uses bounded local CLI proof path, not generic router execution',
    },
  }
}

export function buildCodexDirectProbeRequest(runId = '') {
  const id = normalizeText(runId) || stableHash(`${Date.now()}-${process.pid}`).slice(0, 12)
  return {
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    caller: 'codex-direct-subscription-route-proof',
    inputArtifactRef: `artifact://brain-fleet/codex-direct-subscription-route/${id}/prompt`,
    outputArtifactRef: `artifact://brain-fleet/codex-direct-subscription-route/${id}/response`,
    purpose: 'bounded direct Codex subscription route probe',
  }
}

async function runCodexCommand(args = [], {
  timeoutMs = 120000,
  cwd = process.cwd(),
  env = process.env,
  maxBuffer = 32 * 1024 * 1024,
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      cwd,
      env: {
        ...env,
        NO_COLOR: '1',
        CI: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!settled) child.kill('SIGKILL')
      }, 5000).unref?.()
    }, Math.max(1000, Number(timeoutMs) || 120000))

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (stdout.length > maxBuffer && !settled) {
        settled = true
        clearTimeout(timeout)
        child.kill('SIGKILL')
        reject(new Error(`codex ${args[0] || ''} exceeded stdout buffer`))
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
      if (stderr.length > maxBuffer && !settled) {
        settled = true
        clearTimeout(timeout)
        child.kill('SIGKILL')
        reject(new Error(`codex ${args[0] || ''} exceeded stderr buffer`))
      }
    })
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', exitCode => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (timedOut) {
        reject(new Error(`codex ${args[0] || ''} timed out after ${timeoutMs}ms`))
        return
      }
      if (exitCode !== 0) {
        reject(new Error(`codex ${args[0] || ''} failed with exit ${exitCode}: ${safeErrorText(stderr || stdout)}`))
        return
      }
      resolve({ stdout, stderr, exitCode })
    })
  })
}

async function getCodexAuthFingerprint(codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')) {
  const authPath = path.join(codexHome, 'auth.json')
  try {
    const [stat, data] = await Promise.all([
      fs.stat(authPath),
      fs.readFile(authPath),
    ])
    return {
      exists: true,
      pathClass: '$CODEX_HOME/auth.json',
      size: stat.size,
      mtimeMs: Math.round(stat.mtimeMs),
      contentHash: crypto.createHash('sha256').update(data).digest('hex'),
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        exists: false,
        pathClass: '$CODEX_HOME/auth.json',
        size: 0,
        mtimeMs: null,
        contentHash: null,
      }
    }
    throw error
  }
}

function publicFingerprint(fingerprint = {}) {
  return {
    exists: fingerprint.exists === true,
    pathClass: fingerprint.pathClass || '$CODEX_HOME/auth.json',
    size: fingerprint.size || 0,
    mtimeMs: fingerprint.mtimeMs || null,
  }
}

function compareFingerprints(before = {}, after = {}) {
  return before.exists === after.exists &&
    before.size === after.size &&
    before.contentHash === after.contentHash
}

function classifyCodexFailure(errorText = '') {
  const text = normalizeText(errorText).toLowerCase()
  if (/auth|login|sign.?in|unauthorized|forbidden|2fa|mfa|device|expired/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED
  }
  if (/rate.?limit|too many requests|throttle/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED
  }
  if (/quota|usage limit|credit|capacity/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  }
  return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
}

async function runCodexExecutionProbe({
  commandRunner = runCodexCommand,
  model = CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
  timeoutMs = 180000,
} = {}) {
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-codex-direct-probe-'))
  const prompt = [
    `Return exactly one line: ${CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN}.`,
    'Do not run tools. Do not inspect files. Do not write files.',
    'Do not contact external systems other than producing this model response.',
  ].join(' ')
  try {
    const result = await commandRunner([
      '--ask-for-approval',
      'never',
      '--sandbox',
      'read-only',
      '--cd',
      scratchDir,
      '--model',
      model,
      'exec',
      '--ephemeral',
      '--ignore-rules',
      '--skip-git-repo-check',
      '-c',
      'model_reasoning_effort="low"',
      prompt,
    ], { timeoutMs, cwd: scratchDir })
    const outputText = normalizeText(result.stdout || result.stderr)
    if (!outputText.includes(CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN)) {
      throw new Error(`Codex direct probe returned unexpected output: ${safeErrorText(outputText)}`)
    }
    return {
      ok: true,
      model,
      outputMatched: true,
      outputPreview: CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN,
      stdoutBytes: Buffer.byteLength(result.stdout || '', 'utf8'),
      stderrBytes: Buffer.byteLength(result.stderr || '', 'utf8'),
      scratchDirClass: 'os.tmpdir()/bcrew-codex-direct-probe-*',
    }
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function collectCodexDirectCliStatus({
  commandRunner = runCodexCommand,
  primaryModel = CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
  fallbackModel = CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL,
} = {}) {
  const [versionResult, doctorResult, loginResult, modelsResult] = await Promise.all([
    commandRunner(['--version'], { timeoutMs: 30000 }),
    commandRunner(['doctor', '--json'], { timeoutMs: 120000 }),
    commandRunner(['login', 'status'], { timeoutMs: 30000 }),
    commandRunner(['debug', 'models'], { timeoutMs: 120000 }),
  ])
  const doctor = JSON.parse(doctorResult.stdout)
  const models = JSON.parse(modelsResult.stdout)
  return {
    version: normalizeText(versionResult.stdout || versionResult.stderr),
    loginStatus: normalizeText(loginResult.stdout || loginResult.stderr),
    doctor: parseCodexDoctorReport(doctor),
    modelAvailability: extractCodexModelAvailability(models, { primaryModel, fallbackModel }),
  }
}

function buildHarlanAuthNeededProof({ routeContract, request, failureReason } = {}) {
  const event = buildAuthNeededEvent({
    sourceSystem: 'codex',
    providerRouteKey: routeContract.routeKey,
    accountLabel: routeContract.accountLabel,
    blocker: failureReason || 'Codex direct route requires auth or 2FA.',
    actionNeeded: 'Open/repair the local Codex ChatGPT login, complete any 2FA/auth prompt, then reply DONE.',
    artifactRef: request.inputArtifactRef,
    jobId: 'codex-direct-subscription-route-proof',
    credentialRef: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
  })
  return runHarlanAuthEscalationScenario({
    scenario: 'auth_needed',
    event,
  })
}

export async function runCodexDirectSubscriptionRouteProof({
  liveProbe = false,
  writeLedger = false,
  commandRunner = runCodexCommand,
  fingerprintProvider = getCodexAuthFingerprint,
  createCall = undefined,
  finishCall = undefined,
  actor = 'codex-direct-subscription-route-proof',
  runId = '',
} = {}) {
  const request = buildCodexDirectProbeRequest(runId)
  const credential = buildCodexDirectSubscriptionCredential({
    status: 'probe_required',
    quotaState: {
      status: 'unknown',
      resetAt: null,
      source: 'codex_doctor_does_not_expose_quota_or_reset',
    },
  })
  const route = buildCodexDirectSubscriptionRoute({ status: 'probe_required' })
  const routeContract = buildCodexDirectRouteContract({ credential, route })
  const ledger = writeLedger
    ? await recordBrainFleetLedgerCall({
      request,
      routeContract,
      status: 'planned',
      artifactRef: request.inputArtifactRef,
      quotaState: credential.quotaState,
      metadata: {
        cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
        closeoutKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY,
        liveProbe,
      },
      actor,
      createCall,
    })
    : null

  const beforeCredential = await fingerprintProvider()
  let cliStatus = null
  let execution = null
  let finishedLedger = null
  let harlanAuth = null
  let failureReason = null
  let stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE

  try {
    cliStatus = await collectCodexDirectCliStatus({ commandRunner })
    const statusFindings = []
    if (!cliStatus.doctor.authConfigured) statusFindings.push('Codex ChatGPT auth is not configured.')
    if (!cliStatus.doctor.providerReachable || !cliStatus.doctor.websocketReachable) statusFindings.push('Codex ChatGPT provider reachability is not healthy.')
    if (!cliStatus.modelAvailability.primaryAvailable) statusFindings.push(`${CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL} is not present in Codex model catalog.`)
    if (!cliStatus.modelAvailability.fallbackAvailable) statusFindings.push(`${CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL} fallback is not present in Codex model catalog.`)
    if (!cliStatus.modelAvailability.fastAvailable) statusFindings.push('Codex Fast/priority speed tier is not present for the primary model.')
    if (statusFindings.length) {
      throw new Error(statusFindings.join(' '))
    }

    if (liveProbe) {
      execution = await runCodexExecutionProbe({
        commandRunner,
        model: CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
      })
    } else {
      execution = {
        ok: true,
        skipped: true,
        reason: 'live Codex execution probe disabled outside close-card proof',
      }
    }

    const afterCredential = await fingerprintProvider()
    const credentialUnchanged = compareFingerprints(beforeCredential, afterCredential)
    if (!credentialUnchanged) {
      throw new Error('Codex auth credential file changed during direct route proof.')
    }

    if (writeLedger && ledger?.call?.callId) {
      finishedLedger = await finishBrainFleetLedgerCall({
        callId: ledger.call.callId,
        request,
        routeContract,
        status: liveProbe ? 'succeeded' : 'skipped',
        outputArtifactRef: request.outputArtifactRef,
        failureReason: liveProbe ? null : 'Live probe disabled outside close-card proof.',
        stopCondition: liveProbe
          ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE
          : BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
        quotaState: credential.quotaState,
        metadata: {
          cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
          cliStatus: {
            version: cliStatus.version,
            authMode: cliStatus.doctor.authMode,
            providerReachable: cliStatus.doctor.providerReachable,
            websocketReachable: cliStatus.doctor.websocketReachable,
            primaryModelAvailable: cliStatus.modelAvailability.primaryAvailable,
            fallbackModelAvailable: cliStatus.modelAvailability.fallbackAvailable,
            fastAvailable: cliStatus.modelAvailability.fastAvailable,
          },
          codexExecution: execution,
        },
        finishCall,
        actor,
      })
    }

    return {
      ok: liveProbe ? execution?.ok === true && credentialUnchanged : true,
      status: liveProbe ? 'succeeded' : 'ready',
      cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
      routeKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
      credentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
      request,
      routeContract,
      cliStatus,
      execution,
      ledger,
      finishedLedger,
      stopCondition,
      failureReason: null,
      harlanAuth: null,
      credentialMutationProof: {
        unchanged: credentialUnchanged,
        before: publicFingerprint(beforeCredential),
        after: publicFingerprint(afterCredential),
      },
      externalWrites: false,
      credentialMutation: false,
    }
  } catch (error) {
    failureReason = safeErrorText(error instanceof Error ? error.message : String(error))
    stopCondition = classifyCodexFailure(failureReason)
    if (stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED) {
      harlanAuth = buildHarlanAuthNeededProof({ routeContract, request, failureReason })
    }
    const afterCredential = await fingerprintProvider().catch(() => null)
    const credentialUnchanged = afterCredential ? compareFingerprints(beforeCredential, afterCredential) : false
    if (writeLedger && ledger?.call?.callId) {
      finishedLedger = await finishBrainFleetLedgerCall({
        callId: ledger.call.callId,
        request,
        routeContract,
        status: 'failed',
        outputArtifactRef: null,
        failureReason,
        stopCondition,
        quotaState: credential.quotaState,
        metadata: {
          cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
          cliStatus: cliStatus ? {
            version: cliStatus.version,
            authMode: cliStatus.doctor.authMode,
            providerReachable: cliStatus.doctor.providerReachable,
            websocketReachable: cliStatus.doctor.websocketReachable,
            primaryModelAvailable: cliStatus.modelAvailability.primaryAvailable,
            fallbackModelAvailable: cliStatus.modelAvailability.fallbackAvailable,
            fastAvailable: cliStatus.modelAvailability.fastAvailable,
          } : null,
          harlanAuth,
        },
        finishCall,
        actor,
      })
    }
    return {
      ok: false,
      status: 'blocked',
      cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
      routeKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
      credentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
      request,
      routeContract,
      cliStatus,
      execution,
      ledger,
      finishedLedger,
      stopCondition,
      failureReason,
      harlanAuth,
      credentialMutationProof: {
        unchanged: credentialUnchanged,
        before: publicFingerprint(beforeCredential),
        after: afterCredential ? publicFingerprint(afterCredential) : null,
      },
      externalWrites: false,
      credentialMutation: !credentialUnchanged,
    }
  }
}

export function buildCodexDirectRouteProbeInput(proof = {}) {
  const availability = proof.cliStatus?.modelAvailability || {}
  return {
    credentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
    provider: 'codex',
    authPath: LLM_AUTH_PATHS.CODEX_SUBSCRIPTION,
    probeType: CODEX_DIRECT_SUBSCRIPTION_PROBE_TYPE,
    status: proof.ok ? 'passed' : 'failed',
    detail: proof.ok
      ? 'Bounded direct Codex CLI route probe succeeded with Brain Fleet ledger truth.'
      : `Bounded direct Codex CLI route probe failed closed: ${proof.failureReason || proof.stopCondition || 'unknown failure'}`,
    capability: {
      provider: 'codex',
      authMethod: 'local Codex ChatGPT login',
      accountLabel: 'local Codex ChatGPT login',
      primaryModel: availability.primaryModel || CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
      primaryModelAvailable: availability.primaryAvailable === true,
      fallbackModel: availability.fallbackModel || CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL,
      fallbackModelAvailable: availability.fallbackAvailable === true,
      fastAvailable: availability.fastAvailable === true,
      fastTier: availability.fastTier || null,
      quota: {
        posture: 'unknown',
        resetAt: null,
        source: 'codex_doctor_does_not_expose_quota_or_reset',
      },
      supports: {
        video: 'unsupported',
        vision: 'probe_required',
        longContext: 'probe_required',
      },
      artifactContract: {
        inputArtifactRef: proof.request?.inputArtifactRef || null,
        outputArtifactRef: proof.request?.outputArtifactRef || null,
        externalWrites: false,
      },
      stopCondition: proof.stopCondition || BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
    },
    metadata: {
      cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
      closeoutKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY,
      routeKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      credentialMutationProof: proof.credentialMutationProof || null,
      harlanAuth: proof.harlanAuth ? {
        finalStatus: proof.harlanAuth.finalStatus,
        notificationCount: proof.harlanAuth.notifications?.length || 0,
        externalSent: proof.harlanAuth.notifications?.some(item => item.externalSent === true) || false,
      } : null,
    },
  }
}

export function buildCodexDirectRuntimeMetadata(proof = {}) {
  const availability = proof.cliStatus?.modelAvailability || {}
  return {
    codexDirectSubscriptionRoute: {
      cardId: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID,
      closeoutKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY,
      probedAt: new Date().toISOString(),
      status: proof.ok ? 'available' : 'blocked',
      primaryModel: availability.primaryModel || CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
      primaryModelAvailable: availability.primaryAvailable === true,
      fallbackModel: availability.fallbackModel || CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL,
      fallbackModelAvailable: availability.fallbackAvailable === true,
      fastAvailable: availability.fastAvailable === true,
      authConfigured: proof.cliStatus?.doctor?.authConfigured === true,
      providerReachable: proof.cliStatus?.doctor?.providerReachable === true,
      websocketReachable: proof.cliStatus?.doctor?.websocketReachable === true,
      quotaStatus: 'unknown',
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      externalWrites: false,
      credentialMutation: proof.credentialMutation === true,
    },
  }
}

export async function buildSyntheticCodexDirectSubscriptionRouteProof() {
  const fakeModels = {
    models: [
      {
        slug: CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
        display_name: 'GPT-5.5',
        default_reasoning_level: 'medium',
        supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }, { effort: 'high' }],
        additional_speed_tiers: ['fast'],
        service_tiers: [{ id: 'priority', name: 'Fast', description: '1.5x speed, increased usage' }],
        supported_in_api: true,
        visibility: 'list',
      },
      {
        slug: CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL,
        display_name: 'GPT-5.4-Mini',
        default_reasoning_level: 'medium',
        supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }],
        additional_speed_tiers: [],
        service_tiers: [],
        supported_in_api: true,
        visibility: 'list',
      },
    ],
  }
  const fakeDoctor = {
    overallStatus: 'ok',
    codexVersion: '0.131.0',
    checks: {
      'auth.credentials': {
        status: 'ok',
        details: {
          'stored auth mode': 'chatgpt',
          'stored API key': 'false',
          'stored ChatGPT tokens': 'true',
        },
      },
      'config.load': {
        status: 'ok',
        details: {
          model: CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
          'model provider': 'openai',
        },
      },
      'network.provider_reachability': { status: 'ok', details: {} },
      'network.websocket_reachability': {
        status: 'ok',
        details: {
          'wire API': 'responses',
          'supports websockets': 'true',
        },
      },
    },
  }
  const createdCalls = []
  const finishedCalls = []
  const commandRunner = async args => {
    const key = args.slice(0, 2).join(' ')
    if (args[0] === '--version') return { stdout: 'codex-cli 0.131.0\n', stderr: '' }
    if (key === 'doctor --json') return { stdout: JSON.stringify(fakeDoctor), stderr: '' }
    if (key === 'login status') return { stdout: 'Logged in using ChatGPT\n', stderr: '' }
    if (key === 'debug models') return { stdout: JSON.stringify(fakeModels), stderr: '' }
    if (args.includes('exec')) return { stdout: `${CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN}\n`, stderr: '' }
    throw new Error(`unexpected synthetic codex command ${args.join(' ')}`)
  }
  const authFailureRunner = async args => {
    if (args.includes('exec')) throw new Error('Codex login expired; 2FA auth required.')
    return commandRunner(args)
  }
  const fingerprint = {
    exists: true,
    pathClass: '$CODEX_HOME/auth.json',
    size: 1234,
    mtimeMs: 1779300000000,
    contentHash: 'synthetic-unchanged',
  }
  const fingerprintProvider = async () => ({ ...fingerprint })
  const createCall = async (input, actor) => {
    const call = {
      callId: `synthetic-codex-call-${createdCalls.length + 1}`,
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

  const success = await runCodexDirectSubscriptionRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-codex-direct-proof',
    runId: 'synthetic-success',
  })
  const authNeeded = await runCodexDirectSubscriptionRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner: authFailureRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-codex-direct-proof',
    runId: 'synthetic-auth-needed',
  })
  const missingModelAvailability = extractCodexModelAvailability({ models: [] })
  const probeInput = buildCodexDirectRouteProbeInput(success)

  return {
    ok: success.ok === true &&
      success.credentialMutationProof?.unchanged === true &&
      success.finishedLedger?.ledgerRecord?.status === 'succeeded' &&
      authNeeded.ok === false &&
      authNeeded.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED &&
      authNeeded.harlanAuth?.finalStatus === 'blocked-auth' &&
      authNeeded.harlanAuth?.notifications?.every(item => item.externalSent === false) &&
      missingModelAvailability.primaryAvailable === false &&
      probeInput.capability.primaryModelAvailable === true &&
      probeInput.capability.fastAvailable === true,
    mode: 'codex-direct-subscription-route-synthetic-proof',
    success: {
      ok: success.ok,
      ledgerStatus: success.finishedLedger?.ledgerRecord?.status,
      primaryModelAvailable: success.cliStatus?.modelAvailability?.primaryAvailable,
      fallbackModelAvailable: success.cliStatus?.modelAvailability?.fallbackAvailable,
      fastAvailable: success.cliStatus?.modelAvailability?.fastAvailable,
      credentialUnchanged: success.credentialMutationProof?.unchanged,
      externalWrites: success.externalWrites,
    },
    authNeeded: {
      ok: authNeeded.ok,
      stopCondition: authNeeded.stopCondition,
      harlanFinalStatus: authNeeded.harlanAuth?.finalStatus,
      externalSent: authNeeded.harlanAuth?.notifications?.some(item => item.externalSent === true) || false,
    },
    missingModelRejected: missingModelAvailability.primaryAvailable === false && missingModelAvailability.fallbackAvailable === false,
    createdCallCount: createdCalls.length,
    finishedCallCount: finishedCalls.length,
    sampleProbeInput: probeInput,
  }
}

export function evaluateCodexDirectSubscriptionRoute({
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  packageJson = {},
  llmRouterSource = '',
  closeout = null,
  syntheticProof = {},
  liveProof = null,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const normalizedPlan = String(planSource || '').toLowerCase()
  const packageScript = packageJson.scripts?.['process:codex-direct-subscription-route-check']
  const source = `${moduleSource}\n${scriptSource}`
  const externalSendScanSource = source.replace(/add\(!\/\(sendMail[\s\S]*?'no external send'\)\n/, '')

  add(moduleSource.includes('recordBrainFleetLedgerCall') && moduleSource.includes('finishBrainFleetLedgerCall'), 'direct Codex proof uses Brain Fleet quota ledger before provider execution', 'record/finish ledger')
  add(moduleSource.includes('runHarlanAuthEscalationScenario') && moduleSource.includes('buildAuthNeededEvent'), 'auth-needed failures route through Harlan auth escalation loop', 'Harlan auth-needed flow')
  add(moduleSource.includes('codex') && moduleSource.includes('exec') && moduleSource.includes('--ephemeral'), 'bounded probe uses local Codex CLI ephemeral execution', 'codex exec --ephemeral')
  add(moduleSource.includes('getCodexAuthFingerprint') && moduleSource.includes('credentialMutationProof'), 'proof checks Codex auth credential file is unchanged', '$CODEX_HOME/auth.json')
  add(!/\bfetch\s*\(/.test(source), 'direct Codex route module does not use fetch or custom network writes', 'no fetch')
  add(!/(sendMail\s*\(|gmail\.[A-Za-z.]*send|telegramApi|slack\.[A-Za-z.]*post|drive\.files\.create|publicPost\s*\()/i.test(externalSendScanSource), 'direct Codex proof has no external-send path', 'no external send')
  add(llmRouterSource.includes(CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY) && llmRouterSource.includes(CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY), 'LLM router default config includes direct Codex credential and route metadata', CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY)
  add(packageScript === `node --env-file-if-exists=.env ${CODEX_DIRECT_SUBSCRIPTION_ROUTE_SCRIPT_PATH}`, 'package exposes focused direct Codex route proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('brain fleet quota ledger') &&
      normalizedPlan.includes('harlan auth-needed') &&
      normalizedPlan.includes('codex exec') &&
      normalizedPlan.includes('not a generic backend api') &&
      normalizedPlan.includes('no external writes') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents ledger, Harlan, bounded Codex CLI, no-generic-backend, no-external-write, and ship gates',
    CODEX_DIRECT_SUBSCRIPTION_ROUTE_PLAN_PATH,
  )
  add(closeout && asList(closeout.backlogIds).includes(CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID), 'closeout registry links direct Codex route card', closeout?.key || 'missing closeout')
  add(syntheticProof.ok === true, 'synthetic proof exercises success, auth-needed, ledger, Harlan, model availability, and no credential mutation', syntheticProof.mode || 'missing')
  if (liveProof) {
    add(liveProof.ok === true, 'live direct Codex route proof succeeded', liveProof.status || 'missing')
    add(liveProof.finishedLedger?.ledgerRecord?.status === 'succeeded', 'live proof wrote successful Brain Fleet ledger truth', liveProof.finishedLedger?.ledgerRecord?.status || 'missing')
    add(liveProof.cliStatus?.modelAvailability?.primaryAvailable === true, 'live proof records primary model availability', CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL)
    add(liveProof.cliStatus?.modelAvailability?.fallbackAvailable === true, 'live proof records fallback model availability', CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL)
    add(liveProof.cliStatus?.modelAvailability?.fastAvailable === true, 'live proof records Fast speed availability', 'Fast/priority')
    add(liveProof.credentialMutationProof?.unchanged === true, 'live proof did not mutate Codex auth credentials', '$CODEX_HOME/auth.json')
    add(liveProof.externalWrites === false, 'live proof performed no external writes beyond bounded provider response', 'externalWrites=false')
  }

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
