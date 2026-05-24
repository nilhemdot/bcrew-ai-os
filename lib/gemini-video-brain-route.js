import crypto from 'node:crypto'

import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from './brain-fleet-quota-ledger.js'
import {
  buildAuthNeededEvent,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'
import { LLM_AUTH_PATHS, LLM_WORKLOADS, callGeminiApi } from './llm-router.js'

export const GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID = 'GEMINI-VIDEO-BRAIN-ROUTE-001'
export const GEMINI_VIDEO_BRAIN_ROUTE_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const GEMINI_VIDEO_BRAIN_ROUTE_CLOSEOUT_KEY = 'gemini-video-brain-route-v1'
export const GEMINI_VIDEO_BRAIN_ROUTE_PLAN_PATH = 'docs/process/gemini-video-brain-route-001-plan.md'
export const GEMINI_VIDEO_BRAIN_ROUTE_APPROVAL_PATH = 'docs/process/approvals/GEMINI-VIDEO-BRAIN-ROUTE-001.json'
export const GEMINI_VIDEO_BRAIN_ROUTE_SCRIPT_PATH = 'scripts/process-gemini-video-brain-route-check.mjs'
export const GEMINI_VIDEO_BRAIN_ROUTE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-gemini-video-brain-route-closeout.md'
export const GEMINI_VIDEO_BRAIN_ROUTE_NEXT_CARD_ID = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'

export const GEMINI_VIDEO_CREDENTIAL_KEY = 'gemini-api-default'
export const GEMINI_VIDEO_ROUTE_KEY = 'foundation-video-gemini-api'
export const GEMINI_VIDEO_PRIMARY_MODEL = process.env.LLM_GEMINI_VIDEO_MODEL || 'gemini-2.5-flash'
export const GEMINI_VIDEO_FALLBACK_MODEL = process.env.LLM_GEMINI_VIDEO_FALLBACK_MODEL || 'gemini-2.5-flash-lite'
export const GEMINI_VIDEO_PROBE_TOKEN = 'GEMINI_VIDEO_BRAIN_ROUTE_OK'
export const GEMINI_VIDEO_PROBE_TYPE = 'bounded_gemini_video_long_context_probe'
export const GEMINI_VIDEO_LONG_CONTEXT_MIN_TOKENS = 1_000_000

export const GEMINI_VIDEO_CAPABILITY_DOCS = Object.freeze({
  models: 'https://ai.google.dev/gemini-api/docs/models/gemini',
  video: 'https://ai.google.dev/gemini-api/docs/video-understanding',
  longContext: 'https://ai.google.dev/gemini-api/docs/long-context',
  rateLimits: 'https://ai.google.dev/gemini-api/docs/rate-limits',
})

export const GEMINI_VIDEO_BRAIN_ROUTE_NOT_NEXT = [
  'Do not run broad YouTube, Skool, MyICOR, Loom, or other source extraction from this card.',
  'Do not use private, paid, unlisted, or Steve-unapproved video/source items.',
  'Do not upload files, store raw video, crawl sources, or create extractor atoms from this card.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this card.',
  'Do not mutate credentials, API keys, browser profiles, provider config, source systems, email, Telegram, Drive, or public systems.',
  'Do not hide auth, quota, rate-limit, provider, ledger, capability, artifact-contract, or credential-mutation failures by classification.',
  'Do not promote Gemini to broad extractor runtime until extractor proof and exact source approvals pass.',
  'Do not continue to Claude, OpenClaw adapter boundary, or extractor proof until this route is ledgered, probed, and Current Sprint advances cleanly.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
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

function stripModelPrefix(model = '') {
  return normalizeText(model).replace(/^models\//, '')
}

function modelResourceName(model = '') {
  return `models/${stripModelPrefix(model)}`
}

function safeErrorText(value = '') {
  return normalizeText(value)
    .replace(/key=[^&\s]+/gi, 'key=<redacted>')
    .replace(/x-goog-api-key["':=\s]+[A-Za-z0-9._-]+/gi, 'x-goog-api-key=<redacted>')
    .replace(/api[_-]?key["':=\s]+[A-Za-z0-9._-]+/gi, 'api_key=<redacted>')
    .slice(0, 900)
}

export function findGeminiApiCredential(env = process.env) {
  const selected = { envName: 'GEMINI_API_KEY', value: env.GEMINI_API_KEY }
  const available = Boolean(normalizeText(selected.value))
  return {
    available,
    envName: available ? selected.envName : null,
    secretRef: available ? selected.envName : 'GEMINI_API_KEY',
    accountLabel: available ? `${selected.envName} Gemini API key` : 'GEMINI_API_KEY',
    key: available ? selected.value : null,
  }
}

export function getGeminiCredentialFingerprint(env = process.env) {
  const selected = findGeminiApiCredential(env)
  const refs = ['GEMINI_API_KEY'].map(envName => ({
    envName,
    present: Boolean(normalizeText(env[envName])),
    length: normalizeText(env[envName]).length,
  }))
  return {
    exists: selected.available,
    pathClass: 'process.env Gemini API key refs',
    selectedEnvName: selected.envName,
    refs,
    contentHash: stableHash(refs.map(ref => `${ref.envName}:${ref.present}:${ref.length}:${normalizeText(env[ref.envName])}`).join('|')),
  }
}

function publicFingerprint(fingerprint = {}) {
  return {
    exists: fingerprint.exists === true,
    pathClass: fingerprint.pathClass || 'process.env Gemini API key refs',
    selectedEnvName: fingerprint.selectedEnvName || null,
    refs: asList(fingerprint.refs).map(ref => ({
      envName: ref.envName,
      present: ref.present === true,
      length: ref.length || 0,
    })),
  }
}

function compareFingerprints(before = {}, after = {}) {
  return before.exists === after.exists &&
    before.selectedEnvName === after.selectedEnvName &&
    before.contentHash === after.contentHash
}

function supportForStatus(status = 'probe_required') {
  return status === 'available'
    ? { video: 'supported', vision: 'supported', longContext: 'supported' }
    : { video: 'probe_required', vision: 'probe_required', longContext: 'probe_required' }
}

export function buildGeminiVideoCredential({
  status = 'unknown',
  selectedEnvName = null,
  quotaState = {},
  metadata = {},
} = {}) {
  const support = supportForStatus(status)
  return {
    credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
    provider: 'gemini',
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    displayName: 'Gemini API Default',
    accountLabel: selectedEnvName ? `${selectedEnvName} Gemini API key` : 'GEMINI_API_KEY',
    hubKey: 'foundation',
    workloadLane: 'vision',
    secretRef: selectedEnvName || 'GEMINI_API_KEY',
    status,
    policyClassification: 'api_fallback',
    allowedWorkloads: [
      LLM_WORKLOADS.VIDEO_VISION,
      'vision_probe',
      'video_probe',
      'long_context_probe',
      'public_youtube_video_probe',
      'build_intel_video_extract_probe',
    ],
    quotaState,
    metadata: {
      brainFleetCapability: {
        speedMode: 'vision',
        reasoningPosture: 'vision_multimodal',
        supports: support,
        authPosture: status === 'available'
          ? 'available'
          : status === 'auth_needed'
            ? 'auth_needed'
            : status === 'blocked'
              ? 'blocked'
              : 'probe_required',
        quotaPosture: Object.keys(quotaState || {}).length ? 'recorded' : 'unknown',
        allowedWorkloads: [
          LLM_WORKLOADS.VIDEO_VISION,
          'vision_probe',
          'video_probe',
          'long_context_probe',
          'public_youtube_video_probe',
          'build_intel_video_extract_probe',
        ],
        knownLimitations: [
          'quota_tier_not_exposed_by_bounded_generate_content_probe',
          'no_private_or_paid_video_source_without_explicit_steve_approval',
          'no_raw_video_storage_or_file_upload_in_route_probe',
          'no_broad_extraction_until_extractor_proof_card',
          'credential_mutation_disallowed',
          'external_writes_disallowed',
        ],
      },
      ...metadata,
    },
    notes: 'Direct Gemini API route for bounded video/vision and long-context Build Intel extraction probes. Requires Brain Fleet ledger, Harlan auth-needed handling, exact source approval, and no credential mutation.',
  }
}

export function buildGeminiVideoRoute({
  status = 'probe_required',
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  riskClass = 'low',
  metadata = {},
} = {}) {
  const support = supportForStatus(status)
  return {
    routeKey: GEMINI_VIDEO_ROUTE_KEY,
    workload: LLM_WORKLOADS.VIDEO_VISION,
    hubKey: 'foundation',
    priority: 10,
    provider: 'gemini',
    model,
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
    fallbackRouteKey: 'foundation-extraction-openai-api',
    status,
    policyClassification: 'api_fallback',
    riskClass,
    costCapUsd: 0,
    metadata: {
      brainFleetCapability: {
        speedMode: 'vision',
        reasoningPosture: 'vision_multimodal',
        supports: support,
        authPosture: status === 'available' ? 'available' : status === 'blocked' ? 'blocked' : 'probe_required',
        allowedWorkloads: [
          LLM_WORKLOADS.VIDEO_VISION,
          'vision_probe',
          'video_probe',
          'long_context_probe',
          'public_youtube_video_probe',
          'build_intel_video_extract_probe',
        ],
        knownLimitations: [
          'fallback_route_is_transcript_or_text_only_not_visual_video_understanding',
          'no_private_or_paid_video_source_without_explicit_steve_approval',
          'no_broad_extraction_until_extractor_proof_card',
          'quota_tier_may_remain_unknown_unless_provider_exposes_it',
        ],
      },
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
      fallbackContract: {
        routeKey: 'foundation-extraction-openai-api',
        mode: 'transcript_or_text_fallback_only',
        visualVideoUnderstandingFallback: false,
      },
      ...metadata,
    },
    notes: 'Gemini API route for public-video/vision/long-context extraction readiness. Bounded route probe only; exact source approval required before extraction.',
  }
}

export function buildGeminiVideoRouteContract({
  credential = buildGeminiVideoCredential(),
  route = buildGeminiVideoRoute(),
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
      llmRouterBlockReason: 'Gemini route proof uses a bounded direct API probe and records runtime truth before generic router execution is promoted',
    },
  }
}

export function buildGeminiVideoProbeRequest(runId = '') {
  const id = normalizeText(runId) || stableHash(`${Date.now()}-${process.pid}`).slice(0, 12)
  return {
    workload: LLM_WORKLOADS.VIDEO_VISION,
    hubKey: 'foundation',
    caller: 'gemini-video-brain-route-proof',
    inputArtifactRef: `artifact://brain-fleet/gemini-video-brain-route/${id}/prompt`,
    outputArtifactRef: `artifact://brain-fleet/gemini-video-brain-route/${id}/response`,
    purpose: 'bounded Gemini video/long-context route readiness probe',
  }
}

function normalizeGeminiModelMetadata(payload = {}, selectedModel = '') {
  return compactObject({
    name: normalizeText(payload.name) || modelResourceName(selectedModel),
    model: stripModelPrefix(payload.name || selectedModel),
    displayName: normalizeText(payload.displayName),
    version: normalizeText(payload.version),
    description: normalizeText(payload.description),
    inputTokenLimit: Number(payload.inputTokenLimit || 0) || null,
    outputTokenLimit: Number(payload.outputTokenLimit || 0) || null,
    supportedGenerationMethods: asList(payload.supportedGenerationMethods).map(normalizeText).filter(Boolean),
  })
}

function geminiOutputText(payload = {}) {
  return asList(payload.candidates)
    .flatMap(candidate => asList(candidate.content?.parts))
    .map(part => normalizeText(part.text))
    .filter(Boolean)
    .join('\n')
    .trim()
}

async function geminiApiRequest({
  method = 'GET',
  path = '',
  apiKey = '',
  body = null,
  timeoutMs = 90000,
  fetcher = globalThis.fetch,
} = {}) {
  return callGeminiApi({ method, path, apiKey, body, timeoutMs, fetcher })
}

async function getGeminiModelMetadata({
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  apiKey = '',
  fetcher = globalThis.fetch,
} = {}) {
  const result = await geminiApiRequest({
    method: 'GET',
    path: modelResourceName(model),
    apiKey,
    fetcher,
    timeoutMs: 60000,
  })
  return normalizeGeminiModelMetadata(result.json || {}, model)
}

async function runGeminiGenerateContentProbe({
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  apiKey = '',
  fetcher = globalThis.fetch,
} = {}) {
  const prompt = `Reply with exactly this token and nothing else: ${GEMINI_VIDEO_PROBE_TOKEN}`
  const result = await geminiApiRequest({
    method: 'POST',
    path: `${modelResourceName(model)}:generateContent`,
    apiKey,
    fetcher,
    timeoutMs: 90000,
    body: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 128,
      },
    },
  })
  const outputText = geminiOutputText(result.json || {})
  if (!outputText.includes(GEMINI_VIDEO_PROBE_TOKEN)) {
    throw new Error(`Gemini route probe returned unexpected output: ${safeErrorText(outputText || result.text)}`)
  }
  return {
    ok: true,
    model,
    outputMatched: true,
    outputPreview: GEMINI_VIDEO_PROBE_TOKEN,
    usageMetadata: result.json?.usageMetadata || {},
    finishReason: result.json?.candidates?.[0]?.finishReason || null,
    quotaHeaders: result.quotaHeaders || {},
  }
}

function classifyGeminiFailure(errorText = '', statusCode = null) {
  const text = normalizeLower(errorText)
  const status = Number(statusCode || 0)
  if (status === 401 || status === 403 || /api key|auth|unauthorized|forbidden|permission|login|2fa|mfa|expired/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED
  }
  if (status === 429 && /quota|exhaust/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  }
  if (status === 429 || /rate.?limit|too many requests|throttle/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED
  }
  if (/quota|usage limit|credit|billing/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  }
  return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
}

function shouldTryFallback(error) {
  const text = normalizeLower(error?.message || '')
  return Number(error?.statusCode || 0) === 404 ||
    /not found|not supported|unknown model|model .* unavailable|permission denied for model/.test(text)
}

function buildGeminiQuotaState({ execution = null, quotaHeaders = {}, source = 'gemini_generate_content_probe' } = {}) {
  return {
    status: 'unknown',
    tier: 'unknown',
    resetAt: quotaHeaders.reset || null,
    remaining: quotaHeaders.remaining || null,
    window: null,
    source,
    providerHeaderSource: Object.keys(quotaHeaders || {}).length ? 'response_headers' : 'no_quota_headers_exposed',
    usageMetadata: execution?.usageMetadata || {},
  }
}

async function probeGeminiModel({
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  apiKey = '',
  fetcher = globalThis.fetch,
} = {}) {
  const modelMetadata = await getGeminiModelMetadata({ model, apiKey, fetcher })
  const execution = await runGeminiGenerateContentProbe({ model, apiKey, fetcher })
  return {
    ok: true,
    model: stripModelPrefix(model),
    modelMetadata,
    execution,
    quotaState: buildGeminiQuotaState({
      execution,
      quotaHeaders: execution.quotaHeaders || {},
    }),
  }
}

export async function collectGeminiVideoRouteStatus({
  env = process.env,
  fetcher = globalThis.fetch,
  primaryModel = GEMINI_VIDEO_PRIMARY_MODEL,
  fallbackModel = GEMINI_VIDEO_FALLBACK_MODEL,
} = {}) {
  const credential = findGeminiApiCredential(env)
  if (!credential.available) {
    const error = new Error('Gemini API key is missing; set GEMINI_API_KEY before live Gemini route probes.')
    error.statusCode = 401
    throw error
  }
  let primary = null
  let fallback = null
  let primaryFailure = null
  try {
    primary = await probeGeminiModel({ model: primaryModel, apiKey: credential.key, fetcher })
  } catch (error) {
    primaryFailure = error
    const stopCondition = classifyGeminiFailure(error?.message || '', error?.statusCode)
    if (stopCondition !== BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE || !shouldTryFallback(error)) {
      throw error
    }
  }
  if (!primary) {
    fallback = await probeGeminiModel({ model: fallbackModel, apiKey: credential.key, fetcher })
  }
  const selected = primary || fallback
  const modelMetadata = selected.modelMetadata || {}
  const longContextSupported = Number(modelMetadata.inputTokenLimit || 0) >= GEMINI_VIDEO_LONG_CONTEXT_MIN_TOKENS
  const supportsGenerateContent = asList(modelMetadata.supportedGenerationMethods).includes('generateContent')
  return {
    ok: true,
    authMethod: 'gemini_api_key_env',
    accountLabel: credential.accountLabel,
    secretRef: credential.secretRef,
    selectedEnvName: credential.envName,
    primaryModel: stripModelPrefix(primaryModel),
    fallbackModel: stripModelPrefix(fallbackModel),
    selectedModel: selected.model,
    primaryAvailable: Boolean(primary),
    fallbackAvailable: Boolean(fallback),
    primaryFailure: primaryFailure ? safeErrorText(primaryFailure.message) : null,
    modelMetadata,
    execution: selected.execution,
    quotaState: selected.quotaState,
    capability: {
      video: 'supported',
      vision: 'supported',
      longContext: longContextSupported ? 'supported' : 'probe_required',
      generateContent: supportsGenerateContent,
      inputTokenLimit: modelMetadata.inputTokenLimit || null,
      outputTokenLimit: modelMetadata.outputTokenLimit || null,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
      proofNote: 'Bounded proof validates API reachability with a text generateContent call and records official Gemini video/long-context model support docs; no source video is processed in this card.',
    },
  }
}

function buildHarlanAuthNeededProof({ routeContract, request, failureReason } = {}) {
  const event = buildAuthNeededEvent({
    sourceSystem: 'gemini',
    providerRouteKey: routeContract.routeKey,
    accountLabel: routeContract.accountLabel,
    blocker: failureReason || 'Gemini route requires API auth or quota attention.',
    actionNeeded: 'Repair the Gemini API key/account posture, complete any provider auth requirement, then reply DONE for re-verification.',
    artifactRef: request.inputArtifactRef,
    jobId: 'gemini-video-brain-route-proof',
    credentialRef: GEMINI_VIDEO_CREDENTIAL_KEY,
  })
  return runHarlanAuthEscalationScenario({
    scenario: 'auth_needed',
    event,
  })
}

export async function runGeminiVideoBrainRouteProof({
  liveProbe = false,
  writeLedger = false,
  fetcher = globalThis.fetch,
  env = process.env,
  fingerprintProvider = () => getGeminiCredentialFingerprint(env),
  createCall = undefined,
  finishCall = undefined,
  actor = 'gemini-video-brain-route-proof',
  runId = '',
} = {}) {
  const request = buildGeminiVideoProbeRequest(runId)
  const envCredential = findGeminiApiCredential(env)
  const initialQuotaState = {
    status: 'unknown',
    tier: 'unknown',
    resetAt: null,
    source: 'pre_probe_quota_unknown',
  }
  const credential = buildGeminiVideoCredential({
    status: envCredential.available ? 'probe_required' : 'auth_needed',
    selectedEnvName: envCredential.envName,
    quotaState: initialQuotaState,
  })
  const route = buildGeminiVideoRoute({ status: 'probe_required', model: GEMINI_VIDEO_PRIMARY_MODEL })
  const routeContract = buildGeminiVideoRouteContract({ credential, route })
  const ledger = writeLedger
    ? await recordBrainFleetLedgerCall({
      request,
      routeContract,
      status: 'planned',
      artifactRef: request.inputArtifactRef,
      quotaState: initialQuotaState,
      metadata: {
        cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
        closeoutKey: GEMINI_VIDEO_BRAIN_ROUTE_CLOSEOUT_KEY,
        liveProbe,
      },
      actor,
      createCall,
    })
    : null

  const beforeCredential = await fingerprintProvider()
  let geminiStatus = null
  let finishedLedger = null
  let harlanAuth = null
  let failureReason = null
  let stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE

  try {
    if (!envCredential.available) {
      const error = new Error('Gemini API key is missing; set GEMINI_API_KEY before live Gemini route probes.')
      error.statusCode = 401
      throw error
    }

    if (liveProbe) {
      geminiStatus = await collectGeminiVideoRouteStatus({ env, fetcher })
    } else {
      geminiStatus = {
        ok: true,
        skipped: true,
        reason: 'live Gemini API probe disabled outside close-card proof',
        authMethod: 'gemini_api_key_env',
        accountLabel: envCredential.accountLabel,
        selectedEnvName: envCredential.envName,
        primaryModel: GEMINI_VIDEO_PRIMARY_MODEL,
        fallbackModel: GEMINI_VIDEO_FALLBACK_MODEL,
        selectedModel: GEMINI_VIDEO_PRIMARY_MODEL,
        quotaState: initialQuotaState,
        capability: {
          video: 'probe_required',
          vision: 'probe_required',
          longContext: 'probe_required',
          docs: GEMINI_VIDEO_CAPABILITY_DOCS,
        },
      }
    }

    const afterCredential = await fingerprintProvider()
    const credentialUnchanged = compareFingerprints(beforeCredential, afterCredential)
    if (!credentialUnchanged) {
      throw new Error('Gemini API credential environment fingerprint changed during route proof.')
    }

    const finalQuotaState = geminiStatus.quotaState || initialQuotaState
    if (writeLedger && ledger?.call?.callId) {
      finishedLedger = await finishBrainFleetLedgerCall({
        callId: ledger.call.callId,
        request,
        routeContract: {
          ...routeContract,
          model: geminiStatus.selectedModel || routeContract.model,
          quota: {
            posture: 'recorded',
            state: finalQuotaState,
            resetAt: finalQuotaState.resetAt || null,
          },
        },
        status: liveProbe ? 'succeeded' : 'skipped',
        outputArtifactRef: request.outputArtifactRef,
        failureReason: liveProbe ? null : 'Live probe disabled outside close-card proof.',
        stopCondition: liveProbe
          ? BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE
          : BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
        quotaState: finalQuotaState,
        metadata: {
          cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
          geminiStatus: {
            selectedModel: geminiStatus.selectedModel,
            primaryAvailable: geminiStatus.primaryAvailable,
            fallbackAvailable: geminiStatus.fallbackAvailable,
            capability: geminiStatus.capability,
          },
        },
        finishCall,
        actor,
      })
    }

    return {
      ok: liveProbe ? geminiStatus?.ok === true && credentialUnchanged : true,
      status: liveProbe ? 'succeeded' : 'ready',
      cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
      request,
      routeContract,
      geminiStatus,
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
    stopCondition = classifyGeminiFailure(failureReason, error?.statusCode)
    if (stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED) {
      harlanAuth = buildHarlanAuthNeededProof({ routeContract, request, failureReason })
    }
    const afterCredential = await Promise.resolve(fingerprintProvider()).catch(() => null)
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
        quotaState: initialQuotaState,
        metadata: {
          cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
          harlanAuth,
        },
        finishCall,
        actor,
      })
    }
    return {
      ok: false,
      status: 'blocked',
      cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
      request,
      routeContract,
      geminiStatus,
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

export function buildGeminiVideoRouteProbeInput(proof = {}) {
  const status = proof.geminiStatus || {}
  const quotaState = status.quotaState || {}
  return {
    credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
    provider: 'gemini',
    authPath: LLM_AUTH_PATHS.GEMINI_API_DIRECT,
    probeType: GEMINI_VIDEO_PROBE_TYPE,
    status: proof.ok ? 'passed' : 'failed',
    detail: proof.ok
      ? 'Bounded Gemini video/long-context route proof succeeded with Brain Fleet ledger truth.'
      : `Bounded Gemini video/long-context route proof failed closed: ${proof.failureReason || proof.stopCondition || 'unknown failure'}`,
    capability: {
      provider: 'gemini',
      authMethod: status.authMethod || 'gemini_api_key_env',
      accountLabel: status.accountLabel || proof.routeContract?.accountLabel || 'GEMINI_API_KEY',
      primaryModel: status.primaryModel || GEMINI_VIDEO_PRIMARY_MODEL,
      primaryModelAvailable: status.primaryAvailable === true,
      fallbackModel: status.fallbackModel || GEMINI_VIDEO_FALLBACK_MODEL,
      fallbackModelAvailable: status.fallbackAvailable === true,
      selectedModel: status.selectedModel || GEMINI_VIDEO_PRIMARY_MODEL,
      modelMetadata: status.modelMetadata || {},
      quota: {
        posture: 'unknown',
        tier: quotaState.tier || 'unknown',
        resetAt: quotaState.resetAt || null,
        remaining: quotaState.remaining || null,
        source: quotaState.source || 'gemini_api_probe_quota_tier_not_exposed',
        usageMetadata: quotaState.usageMetadata || {},
      },
      supports: {
        video: status.capability?.video || 'probe_required',
        vision: status.capability?.vision || 'probe_required',
        longContext: status.capability?.longContext || 'probe_required',
      },
      capabilityDocs: GEMINI_VIDEO_CAPABILITY_DOCS,
      artifactContract: {
        inputArtifactRef: proof.request?.inputArtifactRef || null,
        outputArtifactRef: proof.request?.outputArtifactRef || null,
        acceptedInputs: [
          'approved_public_youtube_url_future',
          'approved_public_video_file_uri_future',
          'approved_transcript_text_fallback',
        ],
        outputTypes: [
          'route_probe_response',
          'future_video_analysis_artifact',
          'future_transcript_fallback_summary',
        ],
        storesRawVideo: false,
        fileUploadPerformed: false,
        externalWrites: false,
      },
      fallback: {
        routeKey: 'foundation-extraction-openai-api',
        mode: 'transcript_or_text_only_when_visual_video_understanding_is_unavailable',
        preservesProvenanceRequired: true,
        broadExtractionAllowed: false,
      },
      stopCondition: proof.stopCondition || BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
    },
    metadata: {
      cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
      closeoutKey: GEMINI_VIDEO_BRAIN_ROUTE_CLOSEOUT_KEY,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      credentialMutationProof: proof.credentialMutationProof || null,
      harlanAuth: proof.harlanAuth ? {
        finalStatus: proof.harlanAuth.finalStatus,
        notificationCount: proof.harlanAuth.notifications?.length || 0,
        externalSent: proof.harlanAuth.notifications?.some(item => item.externalSent === true) || false,
      } : null,
      noBroadExtraction: true,
      noCredentialMutation: proof.credentialMutation !== true,
      externalWrites: false,
    },
  }
}

export function buildGeminiRuntimeMetadata(proof = {}) {
  const status = proof.geminiStatus || {}
  return {
    geminiVideoBrainRoute: {
      cardId: GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID,
      closeoutKey: GEMINI_VIDEO_BRAIN_ROUTE_CLOSEOUT_KEY,
      probedAt: new Date().toISOString(),
      status: proof.ok ? 'available' : 'blocked',
      primaryModel: status.primaryModel || GEMINI_VIDEO_PRIMARY_MODEL,
      primaryModelAvailable: status.primaryAvailable === true,
      fallbackModel: status.fallbackModel || GEMINI_VIDEO_FALLBACK_MODEL,
      fallbackModelAvailable: status.fallbackAvailable === true,
      selectedModel: status.selectedModel || GEMINI_VIDEO_PRIMARY_MODEL,
      authMethod: status.authMethod || 'gemini_api_key_env',
      quotaTier: status.quotaState?.tier || 'unknown',
      quotaStatus: status.quotaState?.status || 'unknown',
      support: status.capability || {},
      artifactContract: buildGeminiVideoRouteProbeInput(proof).capability.artifactContract,
      fallback: buildGeminiVideoRouteProbeInput(proof).capability.fallback,
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      externalWrites: false,
      credentialMutation: proof.credentialMutation === true,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
    },
  }
}

function makeSyntheticResponse({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    headers: {
      get: () => null,
    },
    async text() {
      return JSON.stringify(payload)
    },
  }
}

export async function buildSyntheticGeminiVideoBrainRouteProof() {
  const fakeEnv = { GEMINI_API_KEY: 'synthetic-gemini-key' }
  const fakeMetadata = {
    name: modelResourceName(GEMINI_VIDEO_PRIMARY_MODEL),
    displayName: 'Gemini 2.5 Flash',
    version: '001',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent', 'countTokens'],
  }
  const fakeFallbackMetadata = {
    ...fakeMetadata,
    name: modelResourceName(GEMINI_VIDEO_FALLBACK_MODEL),
    displayName: 'Gemini 2.5 Flash-Lite',
  }
  const fakeGenerate = {
    candidates: [
      {
        content: { parts: [{ text: GEMINI_VIDEO_PROBE_TOKEN }] },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: 18,
      candidatesTokenCount: 8,
      totalTokenCount: 26,
    },
  }
  const createdCalls = []
  const finishedCalls = []
  const fetcher = async url => {
    if (url.includes(`${modelResourceName(GEMINI_VIDEO_FALLBACK_MODEL)}:generateContent`)) return makeSyntheticResponse({ payload: fakeGenerate })
    if (url.endsWith(modelResourceName(GEMINI_VIDEO_FALLBACK_MODEL))) return makeSyntheticResponse({ payload: fakeFallbackMetadata })
    if (url.includes(`${modelResourceName(GEMINI_VIDEO_PRIMARY_MODEL)}:generateContent`)) return makeSyntheticResponse({ payload: fakeGenerate })
    if (url.endsWith(modelResourceName(GEMINI_VIDEO_PRIMARY_MODEL))) return makeSyntheticResponse({ payload: fakeMetadata })
    return makeSyntheticResponse({ ok: false, status: 404, payload: { error: { message: 'not found' } } })
  }
  const authFailureFetcher = async () => makeSyntheticResponse({
    ok: false,
    status: 401,
    payload: { error: { message: 'API key invalid or expired' } },
  })
  const rateLimitFetcher = async url => {
    if (url.includes(':generateContent')) {
      return makeSyntheticResponse({
        ok: false,
        status: 429,
        payload: { error: { message: 'Rate limit exceeded' } },
      })
    }
    return makeSyntheticResponse({ payload: fakeMetadata })
  }
  const fallbackFetcher = async url => {
    const primaryResource = modelResourceName(GEMINI_VIDEO_PRIMARY_MODEL)
    if (url.endsWith(primaryResource) || url.includes(`${primaryResource}:generateContent`)) {
      return makeSyntheticResponse({
        ok: false,
        status: 404,
        payload: { error: { message: 'model not found' } },
      })
    }
    return fetcher(url)
  }
  const createCall = async (input, actor) => {
    const call = {
      callId: `synthetic-gemini-call-${createdCalls.length + 1}`,
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
  const fingerprintProvider = async () => getGeminiCredentialFingerprint(fakeEnv)

  const success = await runGeminiVideoBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    fetcher,
    env: fakeEnv,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-gemini-video-proof',
    runId: 'synthetic-success',
  })
  const authNeeded = await runGeminiVideoBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    fetcher: authFailureFetcher,
    env: fakeEnv,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-gemini-video-proof',
    runId: 'synthetic-auth-needed',
  })
  const rateLimited = await runGeminiVideoBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    fetcher: rateLimitFetcher,
    env: fakeEnv,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-gemini-video-proof',
    runId: 'synthetic-rate-limited',
  })
  const fallback = await runGeminiVideoBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    fetcher: fallbackFetcher,
    env: fakeEnv,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-gemini-video-proof',
    runId: 'synthetic-fallback',
  })
  const missingKey = await runGeminiVideoBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    fetcher,
    env: {},
    fingerprintProvider: async () => getGeminiCredentialFingerprint({}),
    createCall,
    finishCall,
    actor: 'synthetic-gemini-video-proof',
    runId: 'synthetic-missing-key',
  })
  const probeInput = buildGeminiVideoRouteProbeInput(success)

  return {
    ok: success.ok === true &&
      success.finishedLedger?.ledgerRecord?.status === 'succeeded' &&
      success.geminiStatus?.capability?.video === 'supported' &&
      success.geminiStatus?.capability?.longContext === 'supported' &&
      success.credentialMutationProof?.unchanged === true &&
      authNeeded.ok === false &&
      authNeeded.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED &&
      authNeeded.harlanAuth?.finalStatus === 'blocked-auth' &&
      authNeeded.harlanAuth?.notifications?.every(item => item.externalSent === false) &&
      rateLimited.ok === false &&
      rateLimited.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED &&
      fallback.ok === true &&
      fallback.geminiStatus?.fallbackAvailable === true &&
      missingKey.ok === false &&
      missingKey.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED &&
      probeInput.capability.artifactContract.externalWrites === false,
    mode: 'gemini-video-brain-route-synthetic-proof',
    success: {
      ok: success.ok,
      ledgerStatus: success.finishedLedger?.ledgerRecord?.status,
      selectedModel: success.geminiStatus?.selectedModel,
      videoSupport: success.geminiStatus?.capability?.video,
      longContextSupport: success.geminiStatus?.capability?.longContext,
      quotaTier: success.geminiStatus?.quotaState?.tier,
      credentialUnchanged: success.credentialMutationProof?.unchanged,
      externalWrites: success.externalWrites,
    },
    authNeeded: {
      ok: authNeeded.ok,
      stopCondition: authNeeded.stopCondition,
      harlanFinalStatus: authNeeded.harlanAuth?.finalStatus,
      externalSent: authNeeded.harlanAuth?.notifications?.some(item => item.externalSent === true) || false,
    },
    rateLimited: {
      ok: rateLimited.ok,
      stopCondition: rateLimited.stopCondition,
    },
    fallback: {
      ok: fallback.ok,
      selectedModel: fallback.geminiStatus?.selectedModel,
      fallbackAvailable: fallback.geminiStatus?.fallbackAvailable,
    },
    missingKey: {
      ok: missingKey.ok,
      stopCondition: missingKey.stopCondition,
    },
    createdCallCount: createdCalls.length,
    finishedCallCount: finishedCalls.length,
    sampleProbeInput: probeInput,
  }
}

export function evaluateGeminiVideoBrainRoute({
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
  const normalizedPlan = normalizeLower(planSource)
  const packageScript = packageJson.scripts?.['process:gemini-video-brain-route-check']
  const source = `${moduleSource}\n${scriptSource}`
  const externalSendScanSource = source.replace(/add\(!\/\(sendMail[\s\S]*?'no external send'\)\n/, '')

  add(moduleSource.includes('recordBrainFleetLedgerCall') && moduleSource.includes('finishBrainFleetLedgerCall'), 'Gemini proof uses Brain Fleet quota ledger before provider execution', 'record/finish ledger')
  add(moduleSource.includes('runHarlanAuthEscalationScenario') && moduleSource.includes('buildAuthNeededEvent'), 'auth-needed failures route through Harlan auth escalation loop', 'Harlan auth-needed flow')
  add(moduleSource.includes('x-goog-api-key') && moduleSource.includes('generateContent'), 'bounded proof uses official Gemini API generateContent path', 'x-goog-api-key/generateContent')
  add(moduleSource.includes('getGeminiCredentialFingerprint') && moduleSource.includes('credentialMutationProof'), 'proof checks Gemini credential environment fingerprint is unchanged', 'process.env key refs')
  add(!/(sendMail\s*\(|gmail\.[A-Za-z.]*send|telegramApi|slack\.[A-Za-z.]*post|drive\.files\.create|publicPost\s*\()/i.test(externalSendScanSource), 'Gemini proof has no external-send path', 'no external send')
  add(llmRouterSource.includes(GEMINI_VIDEO_CREDENTIAL_KEY) && llmRouterSource.includes(GEMINI_VIDEO_ROUTE_KEY) && llmRouterSource.includes(GEMINI_VIDEO_PRIMARY_MODEL), 'LLM router default config includes Gemini credential and explicit route model metadata', GEMINI_VIDEO_ROUTE_KEY)
  add(packageScript === `node --env-file-if-exists=.env ${GEMINI_VIDEO_BRAIN_ROUTE_SCRIPT_PATH}`, 'package exposes focused Gemini route proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('brain fleet quota ledger') &&
      normalizedPlan.includes('harlan auth-needed') &&
      normalizedPlan.includes('gemini') &&
      normalizedPlan.includes('video') &&
      normalizedPlan.includes('long-context') &&
      normalizedPlan.includes('quota tier') &&
      normalizedPlan.includes('artifact contract') &&
      normalizedPlan.includes('fallback') &&
      normalizedPlan.includes('no broad extraction') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents ledger, Harlan, Gemini video/long-context, quota tier, artifact contract, fallback, no-broad-extraction, and ship gates',
    GEMINI_VIDEO_BRAIN_ROUTE_PLAN_PATH,
  )
  add(closeout && asList(closeout.backlogIds).includes(GEMINI_VIDEO_BRAIN_ROUTE_CARD_ID), 'closeout registry links Gemini video route card', closeout?.key || 'missing closeout')
  add(syntheticProof.ok === true, 'synthetic proof exercises success, auth-needed, rate-limit, fallback, ledger, Harlan, no credential mutation, and no external sends', syntheticProof.mode || 'missing')
  if (liveProof) {
    add(liveProof.ok === true, 'live Gemini route proof succeeded', liveProof.status || 'missing')
    add(liveProof.finishedLedger?.ledgerRecord?.status === 'succeeded', 'live proof wrote successful Brain Fleet ledger truth', liveProof.finishedLedger?.ledgerRecord?.status || 'missing')
    add(liveProof.geminiStatus?.capability?.video === 'supported', 'live proof records Gemini video capability', liveProof.geminiStatus?.capability?.video || 'missing')
    add(liveProof.geminiStatus?.capability?.longContext === 'supported', 'live proof records Gemini long-context capability', liveProof.geminiStatus?.capability?.longContext || 'missing')
    add(liveProof.geminiStatus?.quotaState?.tier === 'unknown', 'live proof records explicit quota tier posture', liveProof.geminiStatus?.quotaState?.tier || 'missing')
    add(liveProof.credentialMutationProof?.unchanged === true, 'live proof did not mutate Gemini credentials', 'process.env key refs')
    add(liveProof.externalWrites === false, 'live proof performed no external writes beyond bounded provider response', 'externalWrites=false')
  }

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
