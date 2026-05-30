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
  CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
  CLAUDE_CODE_REVIEW_MODEL,
  buildClaudeCodeReviewCredential,
  buildClaudeCodeReviewRoute,
  buildClaudeCodeReviewRouteContract,
  getClaudeAgentSdkPosture,
  parseClaudeAuthStatus,
} from './claude-code-review-brain-route.js'
import {
  LLM_AUTH_PATHS,
  LLM_WORKLOADS,
} from './llm-router.js'

export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID = 'SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY = 'subscription-brain-extractor-adapter-v1'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID = 'proof:subscription-brain-extractor-adapter-001'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_PLAN_PATH = 'docs/process/subscription-brain-extractor-adapter-001-plan.md'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_APPROVAL_PATH = 'docs/process/approvals/SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001.json'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-23-subscription-brain-extractor-adapter-closeout.md'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SCRIPT_PATH = 'scripts/process-subscription-brain-extractor-adapter-check.mjs'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NEXT_CARD_ID = 'MARK-KASHEF-LAST-50-BASELINE-001'

export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_VIDEO_SOURCE_ID = 'SRC-VIDEO-001'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID = '5xrjO38WUYY'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL = 'https://www.youtube.com/watch?v=5xrjO38WUYY'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID = 'SRC-YOUTUBE-INTEL-001:video_transcript:5xrjO38WUYY'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID = 'proof:god-mode-extractor-eyes-quality-loop-001'
export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_ROUTE_KEY = 'foundation-extractor-claude-subscription-reasoning'

export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NOT_NEXT = [
  'Do not claim subscription brains can replace Gemini/API video eyes from this card.',
  'Do not run Mark last-50 or broad creator latest-20 extraction until this adapter proof closes and the overnight guard remains green.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment extraction from this sprint.',
  'Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, or mutate browser profiles.',
  'Do not give Claude Code tools, filesystem access, browser control, source-crawl mutation, or external-write ability from this adapter proof.',
  'Do not create backlog cards automatically from extractor findings; use the promotion gate.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this sprint.',
]

export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_PROOF_COMMANDS = [
  'node --check lib/subscription-brain-extractor-adapter.js',
  'node --check scripts/process-subscription-brain-extractor-adapter-check.mjs',
  'npm run process:subscription-brain-extractor-adapter-check -- --close-card --live-claude --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
]

export const SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CHANGED_FILES = [
  'lib/subscription-brain-extractor-adapter.js',
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SCRIPT_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_PLAN_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_APPROVAL_PATH,
  SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableTextHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function stableJson(value = {}) {
  if (Array.isArray(value)) return value.map(stableJson)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableJson(value[key])
    return acc
  }, {})
}

function compact(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0
    return entry !== null && entry !== undefined && entry !== ''
  }))
}

function redactPrivateText(value = '') {
  return text(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer <redacted>')
    .replace(/sk-ant-[A-Za-z0-9._-]+/g, 'sk-ant-<redacted>')
    .replace(/sk-[A-Za-z0-9._-]{12,}/g, 'sk-<redacted>')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[token-redacted]')
    .slice(0, 1600)
}

function safeErrorText(value = '') {
  return redactPrivateText(value).slice(0, 1200)
}

function publicFingerprint(fingerprint = {}) {
  return {
    exists: fingerprint.exists === true,
    pathClass: fingerprint.pathClass || '~/.claude credential fingerprints',
    files: list(fingerprint.files).map(file => ({
      exists: file.exists === true,
      pathClass: file.pathClass,
      size: file.size || 0,
      mtimeMs: file.mtimeMs || null,
    })),
  }
}

function compareFingerprints(before = {}, after = {}) {
  return before.exists === after.exists && before.contentHash === after.contentHash
}

export async function getClaudeSubscriptionAuthFingerprint(homeDir = os.homedir()) {
  const configPath = path.join(homeDir, '.claude.json')
  try {
    const raw = await fs.readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    const account = parsed.oauthAccount || {}
    const stableAuth = {
      accountUuid: account.accountUuid || null,
      emailAddress: account.emailAddress || null,
      organizationUuid: account.organizationUuid || null,
      billingType: account.billingType || null,
      organizationRole: account.organizationRole || null,
      organizationName: account.organizationName || null,
      organizationRateLimitTier: account.organizationRateLimitTier || null,
      seatTier: account.seatTier || null,
    }
    return {
      exists: Boolean(account.accountUuid || account.emailAddress),
      pathClass: '~/.claude.json oauthAccount stable auth fields',
      files: [{
        exists: true,
        pathClass: '~/.claude.json oauthAccount',
        size: Buffer.byteLength(JSON.stringify(stableAuth), 'utf8'),
        mtimeMs: null,
      }],
      contentHash: stableTextHash(JSON.stringify(stableJson(stableAuth))),
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        exists: false,
        pathClass: '~/.claude.json oauthAccount stable auth fields',
        files: [{ exists: false, pathClass: '~/.claude.json oauthAccount', size: 0, mtimeMs: null }],
        contentHash: stableTextHash('missing'),
      }
    }
    throw error
  }
}

function classifyClaudeFailure(errorText = '') {
  const normalized = text(errorText).toLowerCase()
  if (/auth|login|sign.?in|unauthorized|forbidden|2fa|mfa|device|expired|subscription/.test(normalized)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED
  }
  if (/rate.?limit|too many requests|throttle/.test(normalized)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED
  }
  if (/quota|usage limit|credit|capacity|budget/.test(normalized)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  }
  if (/not found|command not found|enoent|print mode is not available|json output mode is not available/.test(normalized)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.ROUTE_NOT_RUNNABLE
  }
  if (/parse|json|schema|unexpected output/.test(normalized)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
  }
  return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
}

function modelFromUsage(modelUsage = {}) {
  return Object.keys(modelUsage || {})[0] || CLAUDE_CODE_REVIEW_MODEL
}

export function buildSubscriptionBrainExtractorAdapterCredential({
  status = 'available',
  quotaState = {},
  metadata = {},
} = {}) {
  const base = buildClaudeCodeReviewCredential({
    status,
    quotaState,
    metadata: {
      adapterCardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
    },
  })
  return {
    ...base,
    workloadLane: 'synthesis',
    allowedWorkloads: [
      LLM_WORKLOADS.SYNTHESIS,
      'extractor_evidence_reasoning_probe',
      'synthesis_probe',
      'agent_probe',
    ],
    metadata: {
      ...(base.metadata || {}),
      brainFleetCapability: {
        ...(base.metadata?.brainFleetCapability || {}),
        reasoningPosture: 'bounded_extractor_evidence_reasoning',
        supports: {
          ...(base.metadata?.brainFleetCapability?.supports || {}),
          video: 'unsupported',
          vision: 'not_proven_for_video_eyes',
          longContext: 'probe_required',
        },
        allowedWorkloads: [
          LLM_WORKLOADS.SYNTHESIS,
          'extractor_evidence_reasoning_probe',
          'synthesis_probe',
        ],
        knownLimitations: [
          'subscription_route_reasoning_over_bounded_evidence_only',
          'does_not_replace_gemini_api_video_understanding',
          'tools_disabled_no_session_persistence',
          'quota_reset_state_not_exposed_by_claude_code_json_output',
          'credential_mutation_disallowed',
        ],
      },
      ...metadata,
    },
    notes: 'Local Claude Code Max login used as a bounded subscription-brain reasoning adapter over already-captured extractor evidence. Not approved as video-eyes engine or generic backend API.',
  }
}

export function buildSubscriptionBrainExtractorAdapterRoute({
  status = 'available',
  model = CLAUDE_CODE_REVIEW_MODEL,
  riskClass = 'low',
  metadata = {},
} = {}) {
  const base = buildClaudeCodeReviewRoute({
    status,
    model,
    riskClass,
    metadata: {
      adapterCardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
    },
  })
  return {
    ...base,
    routeKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_ROUTE_KEY,
    workload: LLM_WORKLOADS.SYNTHESIS,
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    fallbackRouteKey: 'foundation-video-gemini-api',
    costCapUsd: 0,
    metadata: {
      ...(base.metadata || {}),
      brainFleetCapability: {
        ...(base.metadata?.brainFleetCapability || {}),
        reasoningPosture: 'bounded_extractor_evidence_reasoning',
        supports: {
          video: 'unsupported',
          vision: 'not_proven_for_video_eyes',
          longContext: 'probe_required',
        },
        allowedWorkloads: [
          LLM_WORKLOADS.SYNTHESIS,
          'extractor_evidence_reasoning_probe',
          'synthesis_probe',
        ],
        knownLimitations: [
          'subscription_route_reasoning_over_bounded_evidence_only',
          'does_not_replace_gemini_api_video_understanding',
          'fail_closed_on_auth_quota_parse_or_credential_mutation',
          'no_tools_no_browser_no_file_writes_no_external_writes',
        ],
      },
      ...metadata,
    },
    notes: 'Bounded Claude Code subscription adapter for extractor evidence reasoning. Keep Gemini API as video-eyes fallback unless a future browser/subscription vision route is proven.',
  }
}

export function buildSubscriptionBrainExtractorAdapterRouteContract({
  credential = buildSubscriptionBrainExtractorAdapterCredential(),
  route = buildSubscriptionBrainExtractorAdapterRoute(),
} = {}) {
  const base = buildClaudeCodeReviewRouteContract({ credential, route })
  return {
    ...base,
    workload: route.workload,
    routeKey: route.routeKey,
    provider: route.provider,
    model: route.model,
    authPath: route.authPath,
    credentialKey: route.credentialKey || CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
    readiness: {
      canExecute: true,
      llmRouterRunnable: false,
      providerExecutionAllowed: true,
      stopConditions: [],
      llmRouterBlockReason: 'Extractor adapter proof uses bounded local Claude Code CLI print mode with tools disabled before any scheduled subscription route is promoted.',
    },
  }
}

function buildAdapterRequest(runId = '') {
  const id = text(runId) || stableTextHash(`${Date.now()}-${process.pid}`).slice(0, 12)
  return {
    workload: LLM_WORKLOADS.SYNTHESIS,
    hubKey: 'foundation',
    caller: 'subscription-brain-extractor-adapter',
    inputArtifactRef: `artifact://brain-fleet/subscription-brain-extractor-adapter/${id}/prompt`,
    outputArtifactRef: `artifact://brain-fleet/subscription-brain-extractor-adapter/${id}/response`,
    purpose: 'bounded subscription mini-brain reasoning over extractor evidence',
  }
}

async function runClaudeCommand(args = [], {
  timeoutMs = 180000,
  cwd = process.cwd(),
  env = process.env,
  maxBuffer = 32 * 1024 * 1024,
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
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
    }, Math.max(1000, Number(timeoutMs) || 180000))

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (stdout.length > maxBuffer && !settled) {
        settled = true
        clearTimeout(timeout)
        child.kill('SIGKILL')
        reject(new Error(`claude ${args[0] || ''} exceeded stdout buffer`))
      }
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
      if (stderr.length > maxBuffer && !settled) {
        settled = true
        clearTimeout(timeout)
        child.kill('SIGKILL')
        reject(new Error(`claude ${args[0] || ''} exceeded stderr buffer`))
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
        reject(new Error(`claude ${args[0] || ''} timed out after ${timeoutMs}ms`))
        return
      }
      if (exitCode !== 0) {
        reject(new Error(`claude ${args[0] || ''} failed with exit ${exitCode}: ${safeErrorText(stderr || stdout)}`))
        return
      }
      resolve({ stdout, stderr, exitCode })
    })
  })
}

function parseJsonObject(value = '') {
  const raw = text(value)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {}
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1))
    } catch {}
  }
  return null
}

function normalizeCandidate(candidate = {}, index = 0) {
  return {
    rank: Number(candidate.rank || index + 1),
    title: text(candidate.title).slice(0, 180),
    whyItMatters: text(candidate.whyItMatters || candidate.why_it_matters).slice(0, 800),
    recommendedNextStep: text(candidate.recommendedNextStep || candidate.recommended_next_step).slice(0, 800),
    sourceVideoId: text(candidate.sourceVideoId || candidate.source_video_id || SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID),
    confidence: text(candidate.confidence || 'medium').toLowerCase(),
  }
}

function normalizeSubscriptionOutput(output = {}) {
  const canReplaceVideoEyes = output.canReplaceVideoEyes === true || text(output.canReplaceVideoEyes).toLowerCase() === 'true'
  return {
    adapterVerdict: text(output.adapterVerdict || 'usable_for_bounded_evidence_reasoning'),
    canHandleEvidenceReasoning: output.canHandleEvidenceReasoning !== false,
    canReplaceVideoEyes,
    recommendedUse: text(output.recommendedUse).slice(0, 1000),
    fallbackPolicy: text(output.fallbackPolicy).slice(0, 1000),
    costPosture: text(output.costPosture || 'subscription_route_no_api_token_cost_recorded'),
    buildCandidates: list(output.buildCandidates).slice(0, 5).map(normalizeCandidate).filter(item => item.title && item.recommendedNextStep),
    approvalBoundaries: list(output.approvalBoundaries).map(item => text(item).slice(0, 400)).filter(Boolean).slice(0, 8),
    provenanceNotes: list(output.provenanceNotes).map(item => text(item).slice(0, 400)).filter(Boolean).slice(0, 8),
  }
}

function parseClaudeJsonResult(stdout = '') {
  const parsed = JSON.parse(stdout)
  const resultText = text(parsed.result)
  const output = normalizeSubscriptionOutput(parseJsonObject(resultText) || {})
  return {
    ok: parsed.is_error !== true && output.canHandleEvidenceReasoning === true && output.canReplaceVideoEyes === false,
    output,
    rawResultHash: stableTextHash(resultText),
    outputPreview: resultText.slice(0, 500),
    resultType: parsed.type || null,
    subtype: parsed.subtype || null,
    durationMs: parsed.duration_ms || null,
    durationApiMs: parsed.duration_api_ms || null,
    numTurns: parsed.num_turns || null,
    stopReason: parsed.stop_reason || null,
    totalCostUsd: parsed.total_cost_usd ?? null,
    usage: parsed.usage || {},
    modelUsage: parsed.modelUsage || {},
    model: modelFromUsage(parsed.modelUsage || {}),
    fastModeState: parsed.fast_mode_state || null,
    speed: parsed.usage?.speed || null,
    permissionDenials: parsed.permission_denials || [],
  }
}

function summarizeEyesReport(eyesReport = {}) {
  const structured = eyesReport.structuredOutputJson || eyesReport.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  const summary = snapshot.summary || {}
  return {
    reportArtifactId: eyesReport.reportArtifactId || eyesReport.report_artifact_id || SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID,
    title: eyesReport.title || 'God Mode Extractor Eyes Quality Loop',
    status: eyesReport.status || 'generated',
    summary: {
      videoCount: Number(summary.videoCount || 0),
      improvedVideoCount: Number(summary.improvedVideoCount || 0),
      averageQualityDelta: Number(summary.averageQualityDelta || 0),
      totalVisualEvidence: Number(summary.totalVisualEvidence || 0),
      totalBuildCandidates: Number(summary.totalBuildCandidates || 0),
      approvalRequiredLinkCount: Number(summary.approvalRequiredLinkCount || 0),
    },
    topFindings: list(eyesReport.topFindings || eyesReport.top_findings).slice(0, 3),
    buildCandidates: list(structured.buildCandidates).slice(0, 6).map((candidate, index) => ({
      rank: Number(candidate.rank || index + 1),
      title: text(candidate.title),
      creator: text(candidate.creator),
      sourceVideoId: text(candidate.sourceVideoId),
      sourceUrl: text(candidate.sourceUrl),
      whyItMatters: text(candidate.whyItMatters).slice(0, 500),
      recommendedNextStep: text(candidate.recommendedNextStep).slice(0, 500),
      confidence: text(candidate.confidence),
    })),
    approvalRequiredSamples: list(eyesReport.actionRequiredItems || eyesReport.action_required_items).slice(0, 6).map(item => ({
      host: text(item.host),
      classification: text(item.classification),
      sourceVideoId: text(item.sourceVideoId),
      reason: text(item.reason).slice(0, 240),
    })),
  }
}

function buildReasoningPrompt({ transcriptArtifact = {}, eyesReport = {} } = {}) {
  const transcriptText = text(transcriptArtifact.contentText || transcriptArtifact.content_text).slice(0, 3500)
  const evidence = {
    cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
    exactPublicSourceOnly: true,
    source: {
      sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
      videoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
      sourceUrl: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
      transcriptArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
      transcriptChars: text(transcriptArtifact.contentText || transcriptArtifact.content_text).length,
      transcriptExcerpt: transcriptText,
    },
    eyesReport: summarizeEyesReport(eyesReport),
    guardrails: [
      'You are only reasoning over evidence already supplied in this prompt.',
      'Do not ask to browse, click, download, purchase, log in, mutate credentials, or inspect files.',
      'Do not claim Claude Code subscription route can directly watch or understand video.',
      'Gemini API Eyes remains the proven direct video-understanding route unless a later card proves a logged-in video-vision route.',
      'Output strict JSON only. No markdown.',
    ],
  }
  return [
    'You are the subscription mini-brain adapter proof for BCrew AI OS.',
    'Task: decide whether this logged-in Claude Code subscription route is useful for extractor reasoning over bounded evidence.',
    'Return strict JSON with exactly these keys:',
    '{"adapterVerdict":"usable_for_bounded_evidence_reasoning|not_usable","canHandleEvidenceReasoning":true,"canReplaceVideoEyes":false,"recommendedUse":"...","fallbackPolicy":"...","costPosture":"...","buildCandidates":[{"rank":1,"title":"...","whyItMatters":"...","recommendedNextStep":"...","sourceVideoId":"5xrjO38WUYY","confidence":"high|medium|low"}],"approvalBoundaries":["..."],"provenanceNotes":["..."]}',
    'Important: canReplaceVideoEyes must be false. The value here is reasoning/synthesis after extractor evidence is captured, not direct video watching.',
    `Evidence packet:\n${JSON.stringify(evidence, null, 2)}`,
  ].join('\n\n')
}

async function collectClaudeSubscriptionStatus({
  commandRunner = runClaudeCommand,
  packageRoot = process.cwd(),
} = {}) {
  const [versionResult, helpResult, authResult] = await Promise.all([
    commandRunner(['--version'], { timeoutMs: 30000 }),
    commandRunner(['--help'], { timeoutMs: 30000 }),
    commandRunner(['auth', 'status', '--text'], { timeoutMs: 30000 }),
  ])
  const version = text(versionResult.stdout || versionResult.stderr)
  const help = String(helpResult.stdout || helpResult.stderr || '')
  const auth = parseClaudeAuthStatus(authResult.stdout || authResult.stderr)
  const sdkPosture = await getClaudeAgentSdkPosture({ packageRoot, cliHelp: help })
  const findings = []
  if (!version) findings.push('Claude Code version is not available.')
  if (!auth.ok) findings.push('Claude Code auth status is not available.')
  if (!sdkPosture.cliPrintModeAvailable) findings.push('Claude Code print mode is not available.')
  if (!sdkPosture.cliJsonOutputAvailable) findings.push('Claude Code JSON output mode is not available.')
  if (!sdkPosture.cliToolDisableAvailable) findings.push('Claude Code tool-disable flag is not available.')
  if (findings.length) throw new Error(findings.join(' '))
  return {
    ok: true,
    version,
    authMethod: auth.loginMethod,
    accountLabel: auth.accountLabel,
    auth,
    sdkPosture,
  }
}

async function runClaudeReasoningProbe({
  transcriptArtifact = {},
  eyesReport = {},
  commandRunner = runClaudeCommand,
  timeoutMs = 240000,
} = {}) {
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-subscription-extractor-adapter-'))
  const prompt = buildReasoningPrompt({ transcriptArtifact, eyesReport })
  try {
    const result = await commandRunner([
      '-p',
      prompt,
      '--output-format',
      'json',
      '--max-turns',
      '1',
      '--tools',
      '',
      '--no-session-persistence',
    ], { timeoutMs, cwd: scratchDir })
    const execution = parseClaudeJsonResult(result.stdout)
    if (!execution.ok) {
      throw new Error(`Claude subscription adapter returned unsafe or unexpected output: ${safeErrorText(result.stdout || result.stderr)}`)
    }
    return {
      ...execution,
      scratchDirClass: 'os.tmpdir()/bcrew-subscription-extractor-adapter-*',
      stdoutBytes: Buffer.byteLength(result.stdout || '', 'utf8'),
      stderrBytes: Buffer.byteLength(result.stderr || '', 'utf8'),
    }
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => {})
  }
}

function quotaStateFromExecution(execution = {}) {
  return {
    status: 'unknown',
    tier: execution.usage?.service_tier || 'unknown',
    resetAt: null,
    source: 'claude_code_json_output_no_quota_reset',
    totalCostUsd: execution.totalCostUsd ?? null,
    speed: execution.speed || execution.usage?.speed || null,
    fastModeState: execution.fastModeState || null,
    serviceTier: execution.usage?.service_tier || null,
    modelUsage: execution.modelUsage || {},
  }
}

export async function runSubscriptionBrainExtractorAdapterProbe({
  transcriptArtifact = {},
  eyesReport = {},
  liveProbe = false,
  writeLedger = false,
  commandRunner = runClaudeCommand,
  fingerprintProvider = getClaudeSubscriptionAuthFingerprint,
  createCall = undefined,
  finishCall = undefined,
  actor = 'subscription-brain-extractor-adapter',
  runId = '',
} = {}) {
  const request = buildAdapterRequest(runId)
  const initialQuotaState = {
    status: 'unknown',
    tier: 'unknown',
    resetAt: null,
    source: 'subscription_adapter_pre_probe',
  }
  const credential = buildSubscriptionBrainExtractorAdapterCredential({
    status: 'available',
    quotaState: initialQuotaState,
  })
  const route = buildSubscriptionBrainExtractorAdapterRoute({ status: 'available' })
  const routeContract = buildSubscriptionBrainExtractorAdapterRouteContract({ credential, route })
  const ledger = writeLedger
    ? await recordBrainFleetLedgerCall({
      request,
      routeContract,
      status: 'planned',
      artifactRef: request.inputArtifactRef,
      quotaState: initialQuotaState,
      metadata: {
        cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
        closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
        liveProbe,
        seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
      },
      actor,
      createCall,
    })
    : null

  const beforeCredential = await fingerprintProvider()
  let claudeStatus = null
  let execution = null
  let finishedLedger = null
  let failureReason = null
  let stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE

  try {
    claudeStatus = await collectClaudeSubscriptionStatus({ commandRunner })
    execution = liveProbe
      ? await runClaudeReasoningProbe({ transcriptArtifact, eyesReport, commandRunner })
      : {
          ok: true,
          skipped: true,
          reason: 'live Claude Code subscription reasoning probe disabled outside close-card proof',
          model: routeContract.model,
          output: {
            adapterVerdict: 'read_only_check_requires_persisted_closeout_or_live_probe',
            canHandleEvidenceReasoning: false,
            canReplaceVideoEyes: false,
            buildCandidates: [],
            approvalBoundaries: [],
            provenanceNotes: [],
          },
          modelUsage: {},
          usage: {},
        }

    const afterCredential = await fingerprintProvider()
    const credentialUnchanged = compareFingerprints(beforeCredential, afterCredential)
    if (!credentialUnchanged) throw new Error('Claude Code credential fingerprint changed during extractor adapter proof.')
    const finalQuotaState = quotaStateFromExecution(execution)
    if (writeLedger && ledger?.call?.callId) {
      finishedLedger = await finishBrainFleetLedgerCall({
        callId: ledger.call.callId,
        request,
        routeContract: {
          ...routeContract,
          model: execution.model || routeContract.model,
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
          cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
          closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
          claudeStatus: {
            version: claudeStatus.version,
            accountLabel: claudeStatus.accountLabel,
            selectedModel: execution.model || routeContract.model,
            sdkPosture: claudeStatus.sdkPosture?.posture,
          },
          seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
        },
        estimatedOutputTokens: execution.usage?.output_tokens || execution.usage?.candidatesTokenCount || null,
        estimatedCostUsd: null,
        finishCall,
        actor,
      })
    }

    return {
      ok: liveProbe ? execution.ok === true && credentialUnchanged : true,
      status: liveProbe ? 'succeeded' : 'ready',
      cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
      routeKey: routeContract.routeKey,
      credentialKey: routeContract.credentialKey,
      request,
      routeContract,
      claudeStatus,
      execution,
      output: execution.output,
      ledger,
      finishedLedger,
      stopCondition,
      failureReason: null,
      credentialMutationProof: {
        unchanged: credentialUnchanged,
        before: publicFingerprint(beforeCredential),
        after: publicFingerprint(afterCredential),
      },
      externalWrites: false,
      credentialMutation: false,
      canReplaceVideoEyes: false,
      replacesGeminiApiEyes: false,
    }
  } catch (error) {
    failureReason = safeErrorText(error instanceof Error ? error.message : String(error))
    stopCondition = classifyClaudeFailure(failureReason)
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
          cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
          closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
          claudeStatus,
          seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
        },
        finishCall,
        actor,
      }).catch(() => null)
    }
    return {
      ok: false,
      status: stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED ? 'auth_needed' : 'blocked',
      cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
      routeKey: routeContract.routeKey,
      credentialKey: routeContract.credentialKey,
      request,
      routeContract,
      claudeStatus,
      execution,
      output: null,
      ledger,
      finishedLedger,
      stopCondition,
      failureReason,
      credentialMutationProof: {
        unchanged: credentialUnchanged,
        before: publicFingerprint(beforeCredential),
        after: afterCredential ? publicFingerprint(afterCredential) : null,
      },
      externalWrites: false,
      credentialMutation: !credentialUnchanged,
      canReplaceVideoEyes: false,
      replacesGeminiApiEyes: false,
    }
  }
}

export function evaluateSubscriptionAdapterRequest(request = {}) {
  const failures = []
  if (request.privateOrPaidAccess === true || request.authRequiredSource === true) failures.push('private_or_auth_source_not_allowed')
  if (request.broadExtraction === true || Number(request.videoCount || 0) > 1) failures.push('broad_extraction_not_allowed')
  if (request.claimsVideoEyesReplacement === true) failures.push('video_eyes_replacement_not_proven')
  if (request.brainFleetLedgerRequired !== false && request.ledgerRecorded !== true) failures.push('brain_fleet_ledger_missing')
  if (request.toolsEnabled === true || request.externalWrites === true) failures.push('tools_or_external_writes_not_allowed')
  if (request.credentialMutation === true) failures.push('credential_mutation_not_allowed')
  return {
    ok: failures.length === 0,
    failures,
  }
}

export function buildSubscriptionBrainExtractorAdapterDogfoodProof() {
  const safe = evaluateSubscriptionAdapterRequest({
    privateOrPaidAccess: false,
    authRequiredSource: false,
    broadExtraction: false,
    videoCount: 1,
    claimsVideoEyesReplacement: false,
    ledgerRecorded: true,
    toolsEnabled: false,
    externalWrites: false,
    credentialMutation: false,
  })
  const cases = [
    {
      name: 'safe bounded public evidence reasoning is allowed',
      result: safe,
      expectedOk: true,
    },
    {
      name: 'private/auth source fails closed',
      result: evaluateSubscriptionAdapterRequest({ privateOrPaidAccess: true, ledgerRecorded: true }),
      expectedOk: false,
    },
    {
      name: 'broad Mark scale-up fails closed',
      result: evaluateSubscriptionAdapterRequest({ broadExtraction: true, videoCount: 50, ledgerRecorded: true }),
      expectedOk: false,
    },
    {
      name: 'video-eyes replacement claim fails closed',
      result: evaluateSubscriptionAdapterRequest({ claimsVideoEyesReplacement: true, ledgerRecorded: true }),
      expectedOk: false,
    },
    {
      name: 'missing Brain Fleet ledger fails closed',
      result: evaluateSubscriptionAdapterRequest({ ledgerRecorded: false }),
      expectedOk: false,
    },
    {
      name: 'tools/external writes fail closed',
      result: evaluateSubscriptionAdapterRequest({ toolsEnabled: true, externalWrites: true, ledgerRecorded: true }),
      expectedOk: false,
    },
    {
      name: 'credential mutation fails closed',
      result: evaluateSubscriptionAdapterRequest({ credentialMutation: true, ledgerRecorded: true }),
      expectedOk: false,
    },
  ]
  return {
    ok: cases.every(item => item.result.ok === item.expectedOk),
    cases,
  }
}

export function buildSubscriptionBrainExtractorAdapterSnapshot({
  generatedAt = new Date().toISOString(),
  transcriptArtifact = {},
  eyesReport = {},
  adapterProof = null,
  currentSprint = {},
  llmRuntime = {},
  persistedMode = false,
} = {}) {
  const eyesSummary = summarizeEyesReport(eyesReport)
  const transcriptChars = text(transcriptArtifact.contentText || transcriptArtifact.content_text).length
  const output = normalizeSubscriptionOutput(adapterProof?.output || {})
  const dogfood = buildSubscriptionBrainExtractorAdapterDogfoodProof()
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const currentSprintItems = list(currentSprint?.items)
  const alreadyClosedInSprint = currentSprint?.sprint?.activeBlockerCardId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NEXT_CARD_ID ||
    currentSprintItems.some(item => item.cardId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID && item.stage === 'done_this_sprint')

  add(currentSprint?.sprint?.activeBlockerCardId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID || alreadyClosedInSprint || persistedMode, 'Current Sprint points at subscription adapter or already closed', currentSprint?.sprint?.activeBlockerCardId || 'missing')
  add(transcriptArtifact?.artifactId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID || transcriptArtifact?.artifact_id === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID, 'exact Mark transcript artifact is present', transcriptArtifact?.artifactId || transcriptArtifact?.artifact_id || 'missing')
  add(transcriptChars >= 1000, 'exact transcript evidence is bounded but substantial', `${transcriptChars} chars`)
  add(eyesSummary.reportArtifactId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID, 'Eyes quality loop report is linked', eyesSummary.reportArtifactId)
  add(eyesSummary.summary.improvedVideoCount >= 3 && eyesSummary.summary.totalVisualEvidence >= 3, 'Eyes report proves video understanding value before adapter reasoning', `${eyesSummary.summary.improvedVideoCount} improved / ${eyesSummary.summary.totalVisualEvidence} visual`)
  add(adapterProof?.ok === true, 'subscription adapter live probe succeeded', adapterProof?.failureReason || adapterProof?.status || 'missing')
  add(adapterProof?.routeContract?.authPath === LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION, 'adapter uses Claude Code subscription auth path', adapterProof?.routeContract?.authPath || 'missing')
  add(adapterProof?.finishedLedger?.ledgerRecord?.status === 'succeeded' || persistedMode, 'Brain Fleet ledger records successful subscription call', adapterProof?.finishedLedger?.ledgerRecord?.status || 'missing')
  add(adapterProof?.credentialMutationProof?.unchanged === true || persistedMode, 'Claude credential fingerprint unchanged', adapterProof?.credentialMutationProof?.unchanged === true ? 'unchanged' : 'missing')
  add(output.canHandleEvidenceReasoning === true, 'adapter can reason over bounded extractor evidence', output.adapterVerdict || 'missing')
  add(output.canReplaceVideoEyes === false, 'adapter does not replace Gemini/API video eyes', String(output.canReplaceVideoEyes))
  add(output.buildCandidates.length >= 1, 'adapter returns ranked build candidates', `${output.buildCandidates.length}`)
  add(output.approvalBoundaries.length >= 2, 'adapter keeps approval boundaries explicit', `${output.approvalBoundaries.length}`)
  add(dogfood.ok === true, 'dogfood blocks unsafe adapter requests', JSON.stringify(dogfood.cases.map(item => ({ name: item.name, ok: item.result.ok }))))

  const failures = checks.filter(check => !check.ok)
  const status = failures.length ? 'blocked' : 'ready_for_guarded_mark_baseline'
  return {
    ok: failures.length === 0,
    status,
    generatedAt,
    cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
    closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
    sourceIds: [
      SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
      SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_VIDEO_SOURCE_ID,
    ],
    seedVideo: {
      videoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
      sourceUrl: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
      transcriptArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
      transcriptChars,
    },
    eyesSummary,
    adapterProof: adapterProof ? {
      ok: adapterProof.ok,
      status: adapterProof.status,
      routeKey: adapterProof.routeKey,
      credentialKey: adapterProof.credentialKey,
      stopCondition: adapterProof.stopCondition,
      failureReason: adapterProof.failureReason,
      claudeStatus: adapterProof.claudeStatus ? {
        version: adapterProof.claudeStatus.version,
        accountLabel: adapterProof.claudeStatus.accountLabel,
        sdkPosture: adapterProof.claudeStatus.sdkPosture?.posture,
      } : null,
      execution: adapterProof.execution ? {
        model: adapterProof.execution.model,
        durationMs: adapterProof.execution.durationMs,
        totalCostUsd: adapterProof.execution.totalCostUsd,
        rawResultHash: adapterProof.execution.rawResultHash,
        stdoutBytes: adapterProof.execution.stdoutBytes,
        stderrBytes: adapterProof.execution.stderrBytes,
      } : null,
      ledgerCallId: adapterProof.ledger?.call?.callId || adapterProof.ledger?.call?.call_id || null,
      finishedLedgerStatus: adapterProof.finishedLedger?.ledgerRecord?.status || null,
      credentialMutationProof: adapterProof.credentialMutationProof,
    } : null,
    output,
    fallbackPolicy: {
      directVideoEyesRoute: 'foundation-video-gemini-api',
      subscriptionRouteUse: 'bounded evidence reasoning and synthesis after transcript/page/visual evidence exists',
      failClosedOn: ['auth_needed', 'quota_exhausted', 'rate_limited', 'parse_failure', 'credential_mutation', 'unsafe_source_request'],
      markLast50AllowedAfterThis: failures.length === 0,
    },
    llmRuntimeSummary: {
      credentialCount: list(llmRuntime.credentials).length,
      routeCount: list(llmRuntime.routes).length,
      claudeCredentialStatus: list(llmRuntime.credentials).find(item => item.credentialKey === CLAUDE_CODE_REVIEW_CREDENTIAL_KEY)?.status || 'unknown',
    },
    dogfood,
    checks,
    failures,
  }
}

function atomInput({
  atomId,
  title,
  content,
  atomType = 'proof_point',
  metadata = {},
  anchorValue = SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
  suggestedAction = '',
}) {
  return {
    atomId,
    title,
    content,
    atomType,
    sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
    artifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
    reportArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID,
    modality: 'mixed',
    anchorType: 'youtube_video',
    anchorValue,
    evidenceExcerpt: content.slice(0, 500),
    derivedClaim: content,
    topicRefs: ['god-mode-extractor', 'subscription-brain', 'brain-fleet', 'build-intel'],
    department: 'foundation',
    pillar: 'build-intel',
    valueRoute: 'dev_team_intelligence',
    contentUseClass: 'internal_build_intel',
    qualityScore: 4,
    relevanceScore: 4,
    sourceConfidence: 0.95,
    extractionConfidence: 0.85,
    sensitivity: 'neutral',
    minTier: 1,
    freshness: 'structural',
    status: 'detected',
    suggestedOwner: 'Foundation Extraction',
    suggestedAction,
    dedupHash: stableTextHash(`${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY}:${atomId}:${content}`),
    metadata: {
      cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
      closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
      proposalOnly: true,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      ...metadata,
    },
    filedBy: 'subscription-brain-extractor-adapter',
  }
}

export function buildSubscriptionBrainExtractorAdapterWriteSet(snapshot = {}) {
  const candidates = list(snapshot.output?.buildCandidates)
  const actionRequiredItems = list(snapshot.output?.approvalBoundaries).map((boundary, index) => ({
    actionRequiredId: `approval:subscription-brain-extractor-adapter:${index + 1}`,
    title: boundary,
    reason: 'Subscription adapter proof keeps this boundary explicit before Mark last-50 scale-up.',
    sourceVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
    approvedInThisCard: false,
    allowedDecisions: ['approve_guarded_scale_up', 'keep_blocked', 'request_more_evidence'],
  }))
  const atomInputs = [
    atomInput({
      atomId: 'atom:subscription-brain-extractor-adapter-001:reasoning-route',
      title: 'Subscription brain can reason over bounded extractor evidence',
      content: snapshot.output?.recommendedUse || 'Claude Code subscription route is useful for bounded extractor evidence reasoning after evidence is captured.',
      suggestedAction: 'Use subscription route for synthesis/proposal reasoning after public evidence capture when auth/quota/ledger posture is healthy.',
      metadata: {
        routeKey: snapshot.adapterProof?.routeKey,
        credentialKey: snapshot.adapterProof?.credentialKey,
      },
    }),
    atomInput({
      atomId: 'atom:subscription-brain-extractor-adapter-001:video-eyes-boundary',
      title: 'Subscription adapter does not replace video eyes',
      atomType: 'risk',
      content: 'The Claude Code subscription route is not proven to watch or understand video directly. Gemini/API Eyes remains the direct video-understanding route until a later logged-in vision route is proven.',
      suggestedAction: 'Keep Gemini/API Eyes as fallback and fail closed on video-eyes replacement claims.',
      metadata: {
        directVideoEyesRoute: snapshot.fallbackPolicy?.directVideoEyesRoute,
      },
    }),
    atomInput({
      atomId: 'atom:subscription-brain-extractor-adapter-001:hybrid-policy',
      title: 'Hybrid extractor policy: API eyes plus subscription reasoning',
      atomType: 'workflow',
      content: snapshot.output?.fallbackPolicy || 'Use API/video route for video understanding and subscription mini-brain route for bounded reasoning. Fail closed on auth, quota, parse, credential mutation, unsafe source, or external action drift.',
      suggestedAction: 'Start Mark last-50 only under the overnight guard with hybrid route policy and evidence provenance intact.',
    }),
    ...candidates.slice(0, 3).map((candidate, index) => atomInput({
      atomId: `atom:subscription-brain-extractor-adapter-001:candidate-${index + 1}`,
      title: candidate.title,
      atomType: 'action_candidate',
      content: `${candidate.whyItMatters} Recommended next step: ${candidate.recommendedNextStep}`,
      suggestedAction: candidate.recommendedNextStep,
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        confidence: candidate.confidence,
        proposalOnly: true,
      },
    })),
  ]

  const hitInputs = atomInputs.map((atom, index) => ({
    hitId: `hit:subscription-brain-extractor-adapter-001:${index + 1}`,
    atomId: atom.atomId,
    sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
    artifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
    reportArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID,
    hitType: 'supporting_evidence',
    evidenceRef: `${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID}#${atom.atomId}`,
    evidenceExcerpt: atom.evidenceExcerpt,
    confidence: 0.9,
    metadata: {
      cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
      closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
      routeKey: snapshot.adapterProof?.routeKey,
      ledgerCallId: snapshot.adapterProof?.ledgerCallId,
    },
  }))

  return {
    reportArtifact: {
      reportArtifactId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID,
      reportType: 'proof',
      scopeKey: 'youtube-to-dev-team-intelligence',
      department: 'foundation',
      title: 'Subscription Brain Extractor Adapter Proof',
      status: snapshot.ok ? 'generated' : 'failed',
      sourceIds: snapshot.sourceIds || [SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID],
      inputArtifactIds: [
        SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID,
        SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID,
      ],
      sourceCoverage: [
        {
          sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
          status: 'covered',
          exactItem: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
        },
      ],
      topFindings: [
        {
          finding: 'Claude Code subscription route can be used for bounded evidence reasoning when already-authenticated and ledgered.',
          evidence: {
            routeKey: snapshot.adapterProof?.routeKey,
            ledgerCallId: snapshot.adapterProof?.ledgerCallId,
            credentialUnchanged: snapshot.adapterProof?.credentialMutationProof?.unchanged === true,
          },
        },
        {
          finding: 'The subscription adapter does not replace Gemini/API video eyes.',
          evidence: snapshot.fallbackPolicy,
        },
      ],
      actionRequiredItems,
      openQuestions: [],
      structuredOutputJson: {
        snapshot: {
          ok: snapshot.ok,
          status: snapshot.status,
          seedVideo: snapshot.seedVideo,
          eyesSummary: snapshot.eyesSummary?.summary,
          adapterProof: snapshot.adapterProof,
          output: snapshot.output,
          fallbackPolicy: snapshot.fallbackPolicy,
          checks: snapshot.checks,
        },
        buildCandidates: snapshot.output?.buildCandidates || [],
        reviewRoutes: list(snapshot.output?.buildCandidates).map((candidate, index) => ({
          reviewRouteId: `build-intel-review:subscription-adapter:${index + 1}`,
          sourceId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SOURCE_ID,
          sourceUrl: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_URL,
          recommendation: candidate.recommendedNextStep,
          routingReason: candidate.whyItMatters,
          proposalOnly: true,
          writesBacklog: false,
          externalWrites: false,
          requiresSteveReview: true,
          allowedDecisions: ['promote_to_backlog', 'attach_to_existing_card', 'reject', 'needs_more_evidence'],
        })),
        noAutoBacklogPromotion: true,
      },
      metadata: {
        cardId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID,
        closeoutKey: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY,
        seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
        routeKey: snapshot.adapterProof?.routeKey,
        credentialKey: snapshot.adapterProof?.credentialKey,
        directVideoEyesRoute: snapshot.fallbackPolicy?.directVideoEyesRoute,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
        privateOrPaidAccess: false,
        credentialMutation: false,
        toolsEnabled: false,
      },
    },
    atomInputs,
    hitInputs,
  }
}

export function verifySubscriptionBrainExtractorAdapterPersistedProof({
  snapshot = {},
  report = null,
  atoms = [],
  hits = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(report?.reportArtifactId === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID || report?.report_artifact_id === SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID, 'report artifact persisted', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  add((report?.structuredOutputJson || report?.structured_output_json)?.snapshot?.status === snapshot.status, 'report snapshot status matches', (report?.structuredOutputJson || report?.structured_output_json)?.snapshot?.status || 'missing')
  add(list(atoms).length >= 3, 'adapter proof atoms persisted', `${list(atoms).length}`)
  add(list(hits).length >= 3 && list(hits).length === list(atoms).length, 'adapter evidence hits persisted for atoms', `${list(hits).length}/${list(atoms).length}`)
  add(list(atoms).some(atom => (atom.atomId || atom.atom_id) === 'atom:subscription-brain-extractor-adapter-001:video-eyes-boundary'), 'video-eyes boundary atom persisted', 'boundary atom')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
  }
}

export function renderSubscriptionBrainExtractorAdapterCloseout(snapshot = {}) {
  return `# Subscription Brain Extractor Adapter Closeout

Date: ${snapshot.generatedAt}
Card: ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CARD_ID}
Closeout key: ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_CLOSEOUT_KEY}
Status: ${snapshot.status}

## What Shipped

- Proved the local Claude Code subscription route can be called as a bounded extractor evidence-reasoning adapter.
- Used exact approved public evidence only: Mark seed video ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID}, transcript artifact ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_TRANSCRIPT_ARTIFACT_ID}, and Eyes report ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_EYES_REPORT_ARTIFACT_ID}.
- Recorded the subscription call in the Brain Fleet quota ledger.
- Proved Claude credential fingerprint did not change during the adapter call.
- Persisted report ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_REPORT_ARTIFACT_ID}, proposal-only atoms, and evidence hits.
- Kept Gemini/API Eyes as the direct video-understanding route. This card does not claim subscription Claude can watch videos.

## Result

- Adapter route: ${snapshot.adapterProof?.routeKey || 'missing'}
- Credential: ${snapshot.adapterProof?.credentialKey || 'missing'}
- Claude status: ${snapshot.adapterProof?.claudeStatus?.version || 'missing'}
- Ledger call: ${snapshot.adapterProof?.ledgerCallId || 'missing'}
- Build candidates returned: ${list(snapshot.output?.buildCandidates).length}
- Approval boundaries returned: ${list(snapshot.output?.approvalBoundaries).length}

## Boundaries

${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NOT_NEXT.map(item => `- ${item}`).join('\n')}

## Next

Continue ${SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_NEXT_CARD_ID} only while the overnight guard and raw Foundation health stay green.
`
}
