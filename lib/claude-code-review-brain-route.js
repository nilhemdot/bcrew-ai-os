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

export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY = 'claude-code-review-brain-route-v1'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_PLAN_PATH = 'docs/process/claude-code-review-brain-route-001-plan.md'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_APPROVAL_PATH = 'docs/process/approvals/CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001.json'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SCRIPT_PATH = 'scripts/process-claude-code-review-brain-route-check.mjs'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-claude-code-review-brain-route-closeout.md'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NEXT_CARD_ID = 'OPENCLAW-ADAPTER-BOUNDARY-001'

export const CLAUDE_CODE_REVIEW_CREDENTIAL_KEY = 'claude-code-local-max'
export const CLAUDE_CODE_REVIEW_ROUTE_KEY = 'foundation-agent-claude-code'
export const CLAUDE_CODE_REVIEW_MODEL = process.env.LLM_CLAUDE_CODE_REVIEW_MODEL || process.env.LLM_AGENT_MODEL || 'default-claude-code-model'
export const CLAUDE_CODE_REVIEW_PROBE_TOKEN = 'CLAUDE_CODE_REVIEW_BRAIN_ROUTE_OK'
export const CLAUDE_CODE_REVIEW_PROBE_TYPE = 'bounded_claude_code_review_route_probe'

export const CLAUDE_CODE_REVIEW_DOCS = Object.freeze({
  cliReference: 'https://docs.anthropic.com/en/docs/claude-code/cli-usage',
  sdk: 'https://docs.anthropic.com/s/claude-code-sdk',
})

export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NOT_NEXT = [
  'Do not use Claude Code as a generic backend API or scheduled extractor route from this card.',
  'Do not run extractor proof, broad source crawls, Skool, MyICOR, Loom, or YouTube runtime work from this card.',
  'Do not run Claude ultrareview, cloud review, background agents, browser automation, MCP writes, or external tools from this card.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this card.',
  'Do not mutate Google Drive permissions, source systems, browser profiles, Claude auth files, provider config, or public exposure settings.',
  'Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.',
  'Do not hide auth, quota, rate-limit, provider, ledger, SDK, or credential-mutation ambiguity by classification.',
  'If Claude Code subscription or Agent SDK posture is ambiguous, mark the route experimental and continue only because extractor v1 is not blocked on Claude.',
  'Do not continue to OpenClaw adapter boundary or extractor proof until this route is ledgered, classified, and Current Sprint advances cleanly.',
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

function redactPrivateText(value = '') {
  return normalizeText(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer <redacted>')
    .replace(/sk-ant-[A-Za-z0-9._-]+/g, 'sk-ant-<redacted>')
    .replace(/sk-[A-Za-z0-9._-]{12,}/g, 'sk-<redacted>')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[token-redacted]')
    .slice(0, 1200)
}

function safeErrorText(value = '') {
  return redactPrivateText(value).slice(0, 900)
}

function modelFromUsage(modelUsage = {}) {
  const keys = Object.keys(modelUsage || {})
  return keys[0] || CLAUDE_CODE_REVIEW_MODEL
}

function quotaStateFromExecution(execution = {}) {
  return {
    status: 'unknown',
    tier: execution.usage?.service_tier || 'unknown',
    resetAt: null,
    remaining: null,
    window: null,
    source: 'claude_code_json_output_no_quota_reset',
    totalCostUsd: execution.totalCostUsd ?? null,
    speed: execution.speed || execution.usage?.speed || null,
    fastModeState: execution.fastModeState || null,
    serviceTier: execution.usage?.service_tier || null,
    modelUsage: execution.modelUsage || {},
  }
}

async function fileFingerprint(filePath) {
  try {
    const [stat, data] = await Promise.all([
      fs.stat(filePath),
      fs.readFile(filePath),
    ])
    return {
      exists: true,
      pathClass: filePath.endsWith('.claude.json') ? '~/.claude.json' : '~/.claude auth/cache file',
      size: stat.size,
      mtimeMs: Math.round(stat.mtimeMs),
      contentHash: crypto.createHash('sha256').update(data).digest('hex'),
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        exists: false,
        pathClass: filePath.endsWith('.claude.json') ? '~/.claude.json' : '~/.claude auth/cache file',
        size: 0,
        mtimeMs: null,
        contentHash: null,
      }
    }
    throw error
  }
}

export async function getClaudeCredentialFingerprint(homeDir = os.homedir()) {
  const paths = [
    path.join(homeDir, '.claude.json'),
    path.join(homeDir, '.claude', 'mcp-needs-auth-cache.json'),
  ]
  const files = await Promise.all(paths.map(fileFingerprint))
  return {
    exists: files.some(file => file.exists),
    pathClass: '~/.claude.json + ~/.claude auth/cache file fingerprints',
    files,
    contentHash: stableHash(files.map(file => `${file.pathClass}:${file.exists}:${file.size}:${file.contentHash}`).join('|')),
  }
}

function publicFingerprint(fingerprint = {}) {
  return {
    exists: fingerprint.exists === true,
    pathClass: fingerprint.pathClass || '~/.claude credential fingerprints',
    files: asList(fingerprint.files).map(file => ({
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

export function parseClaudeAuthStatus(text = '') {
  const redacted = redactPrivateText(text)
  const lines = redacted.split('\n').map(normalizeText).filter(Boolean)
  const loginLine = lines.find(line => /^Login method:/i.test(line)) || ''
  const organizationLine = lines.find(line => /^Organization:/i.test(line)) || ''
  const emailLine = lines.find(line => /^Email:/i.test(line)) || ''
  const loginMethod = normalizeText(loginLine.replace(/^Login method:\s*/i, ''))
  return {
    ok: Boolean(loginMethod),
    loginMethod,
    accountLabel: /max/i.test(loginMethod) ? 'local Claude Max login' : 'local Claude Code login',
    organizationPresent: Boolean(organizationLine),
    emailPresent: Boolean(emailLine),
    redactedSummary: lines.join('\n'),
  }
}

export async function getClaudeAgentSdkPosture({
  packageRoot = process.cwd(),
  cliHelp = '',
} = {}) {
  const packagePath = path.join(packageRoot, 'node_modules', '@anthropic-ai', 'claude-code', 'package.json')
  let packageJson = null
  try {
    packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  return {
    sdkPackageInstalled: Boolean(packageJson),
    sdkPackageVersion: packageJson?.version || null,
    cliPrintModeAvailable: /(^|\s|,)(--print|-p)(\s|,|\b)/.test(cliHelp),
    cliJsonOutputAvailable: /--output-format/.test(cliHelp),
    cliToolDisableAvailable: /--tools/.test(cliHelp),
    posture: packageJson
      ? 'sdk_package_installed'
      : /(^|\s|,)(--print|-p)(\s|,|\b)/.test(cliHelp)
        ? 'cli_print_available_sdk_package_not_installed_here'
        : 'ambiguous',
    docs: CLAUDE_CODE_REVIEW_DOCS,
  }
}

export function buildClaudeCodeReviewCredential({
  status = 'unknown',
  quotaState = {},
  metadata = {},
} = {}) {
  return {
    credentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    displayName: 'Local Claude Code Max Login',
    accountLabel: 'local Claude Max login',
    hubKey: 'foundation',
    workloadLane: 'agent',
    secretRef: 'local_claude_code_auth',
    status,
    policyClassification: 'experimental',
    allowedWorkloads: [
      LLM_WORKLOADS.AGENT,
      LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
      'coding_review',
      'code_review_probe',
      'agent_probe',
      'deep_audit_probe',
    ],
    quotaState,
    metadata: {
      brainFleetCapability: {
        speedMode: 'standard',
        reasoningPosture: 'coding_review_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: status === 'available' ? 'available' : status === 'auth_needed' ? 'auth_needed' : 'probe_required',
        quotaPosture: Object.keys(quotaState || {}).length ? 'recorded' : 'unknown',
        allowedWorkloads: [
          LLM_WORKLOADS.AGENT,
          LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
          'coding_review',
          'code_review_probe',
          'agent_probe',
          'deep_audit_probe',
        ],
        knownLimitations: [
          'experimental_local_tooling_route_not_generic_backend_api',
          'agent_sdk_package_posture_may_be_ambiguous',
          'quota_reset_state_not_exposed_by_claude_code_json_output',
          'external_writes_disallowed',
          'credential_mutation_disallowed',
        ],
      },
      ...metadata,
    },
    notes: 'Local Claude Code Max login for bounded code-review route probes only. Experimental; not approved as extractor backend or scheduled automation.',
  }
}

export function buildClaudeCodeReviewRoute({
  status = 'probe_required',
  model = CLAUDE_CODE_REVIEW_MODEL,
  riskClass = 'untested',
  metadata = {},
} = {}) {
  return {
    routeKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    priority: 10,
    provider: 'claude_code',
    model,
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    credentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
    fallbackRouteKey: 'foundation-agent-codex-direct',
    status,
    policyClassification: 'experimental',
    riskClass,
    costCapUsd: 0,
    metadata: {
      brainFleetCapability: {
        speedMode: 'standard',
        reasoningPosture: 'coding_review_agent',
        supports: {
          video: 'unsupported',
          vision: 'probe_required',
          longContext: 'probe_required',
        },
        authPosture: status === 'available' ? 'available' : status === 'blocked' ? 'blocked' : 'probe_required',
        allowedWorkloads: [
          LLM_WORKLOADS.AGENT,
          LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
          'coding_review',
          'code_review_probe',
          'agent_probe',
          'deep_audit_probe',
        ],
        knownLimitations: [
          'experimental_local_tooling_route_not_generic_backend_api',
          'extractor_v1_not_blocked_on_claude_ambiguity',
          'no_extractor_or_external_write_workloads',
        ],
      },
      docs: CLAUDE_CODE_REVIEW_DOCS,
      ...metadata,
    },
    notes: 'Bounded Claude Code review route. Keep experimental; do not block extractor v1 if SDK/subscription posture is ambiguous.',
  }
}

export function buildClaudeCodeReviewRouteContract({
  credential = buildClaudeCodeReviewCredential(),
  route = buildClaudeCodeReviewRoute(),
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
      llmRouterBlockReason: 'Claude route proof uses a bounded local CLI print-mode path and records runtime truth before generic router execution is promoted',
    },
  }
}

export function buildClaudeCodeReviewProbeRequest(runId = '') {
  const id = normalizeText(runId) || stableHash(`${Date.now()}-${process.pid}`).slice(0, 12)
  return {
    workload: LLM_WORKLOADS.AGENT,
    hubKey: 'foundation',
    caller: 'claude-code-review-brain-route-proof',
    inputArtifactRef: `artifact://brain-fleet/claude-code-review-brain-route/${id}/prompt`,
    outputArtifactRef: `artifact://brain-fleet/claude-code-review-brain-route/${id}/response`,
    purpose: 'bounded Claude Code review route readiness probe',
  }
}

async function runClaudeCommand(args = [], {
  timeoutMs = 120000,
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
    }, Math.max(1000, Number(timeoutMs) || 120000))

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

function parseClaudeJsonResult(stdout = '') {
  const parsed = JSON.parse(stdout)
  const resultText = normalizeText(parsed.result)
  return {
    ok: parsed.is_error !== true && resultText.includes(CLAUDE_CODE_REVIEW_PROBE_TOKEN),
    outputMatched: resultText.includes(CLAUDE_CODE_REVIEW_PROBE_TOKEN),
    outputPreview: resultText.includes(CLAUDE_CODE_REVIEW_PROBE_TOKEN) ? CLAUDE_CODE_REVIEW_PROBE_TOKEN : resultText.slice(0, 120),
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

async function runClaudeExecutionProbe({
  commandRunner = runClaudeCommand,
  timeoutMs = 180000,
} = {}) {
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-claude-review-probe-'))
  const prompt = [
    `Return exactly one line: ${CLAUDE_CODE_REVIEW_PROBE_TOKEN}.`,
    'Do not use tools. Do not inspect files. Do not write files.',
    'Do not contact external systems other than producing this model response.',
  ].join(' ')
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
      throw new Error(`Claude Code route probe returned unexpected output: ${safeErrorText(result.stdout || result.stderr)}`)
    }
    return {
      ...execution,
      scratchDirClass: 'os.tmpdir()/bcrew-claude-review-probe-*',
      stdoutBytes: Buffer.byteLength(result.stdout || '', 'utf8'),
      stderrBytes: Buffer.byteLength(result.stderr || '', 'utf8'),
    }
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function collectClaudeCodeReviewRouteStatus({
  commandRunner = runClaudeCommand,
  packageRoot = process.cwd(),
  liveProbe = false,
} = {}) {
  const [versionResult, helpResult, authResult] = await Promise.all([
    commandRunner(['--version'], { timeoutMs: 30000 }),
    commandRunner(['--help'], { timeoutMs: 30000 }),
    commandRunner(['auth', 'status', '--text'], { timeoutMs: 30000 }),
  ])
  const version = normalizeText(versionResult.stdout || versionResult.stderr)
  const help = String(helpResult.stdout || helpResult.stderr || '')
  const auth = parseClaudeAuthStatus(authResult.stdout || authResult.stderr)
  const sdkPosture = await getClaudeAgentSdkPosture({ packageRoot, cliHelp: help })
  const contractFindings = []
  if (!version) contractFindings.push('Claude Code version is not available.')
  if (!auth.ok) contractFindings.push('Claude Code auth status is not available.')
  if (!sdkPosture.cliPrintModeAvailable) contractFindings.push('Claude Code print mode is not available.')
  if (!sdkPosture.cliJsonOutputAvailable) contractFindings.push('Claude Code JSON output mode is not available.')
  if (!sdkPosture.cliToolDisableAvailable) contractFindings.push('Claude Code tool-disable flag is not available.')
  if (contractFindings.length) throw new Error(contractFindings.join(' '))

  const execution = liveProbe
    ? await runClaudeExecutionProbe({ commandRunner })
    : {
        ok: true,
        skipped: true,
        reason: 'live Claude Code execution probe disabled outside close-card proof',
        model: CLAUDE_CODE_REVIEW_MODEL,
        modelUsage: {},
        usage: {},
      }

  const selectedModel = execution.model || CLAUDE_CODE_REVIEW_MODEL
  const quotaState = quotaStateFromExecution(execution)
  const contextWindows = Object.values(execution.modelUsage || {})
    .map(item => Number(item?.contextWindow || 0))
    .filter(Boolean)
  const longContext = contextWindows.some(value => value >= 200000)
    ? 'supported'
    : liveProbe
      ? 'unknown'
      : 'probe_required'

  return {
    ok: true,
    authMethod: auth.loginMethod || 'Claude Code local login',
    accountLabel: auth.accountLabel,
    secretRef: 'local_claude_code_auth',
    version,
    auth,
    sdkPosture,
    selectedModel,
    execution,
    quotaState,
    policyPosture: 'experimental',
    capability: {
      codeReview: liveProbe ? 'supported' : 'probe_required',
      agentSdk: sdkPosture.posture,
      cliPrintMode: sdkPosture.cliPrintModeAvailable ? 'supported' : 'blocked',
      video: 'unsupported',
      vision: 'probe_required',
      longContext,
      docs: CLAUDE_CODE_REVIEW_DOCS,
      proofNote: 'Bounded proof validates local Claude Code CLI non-interactive JSON print mode with tools disabled; Agent SDK package posture remains explicit and experimental if not installed in this repo.',
    },
  }
}

function classifyClaudeFailure(errorText = '') {
  const text = normalizeLower(errorText)
  if (/auth|login|sign.?in|unauthorized|forbidden|2fa|mfa|device|expired|subscription/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED
  }
  if (/rate.?limit|too many requests|throttle/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED
  }
  if (/quota|usage limit|credit|capacity|budget/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  }
  if (/not found|command not found|enoent|print mode is not available|json output mode is not available/.test(text)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.ROUTE_NOT_RUNNABLE
  }
  return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
}

function buildHarlanAuthNeededProof({ routeContract, request, failureReason } = {}) {
  const event = buildAuthNeededEvent({
    sourceSystem: 'claude_code',
    providerRouteKey: routeContract.routeKey,
    accountLabel: routeContract.accountLabel,
    blocker: failureReason || 'Claude Code route requires auth, subscription, or 2FA attention.',
    actionNeeded: 'Repair the local Claude Code login/subscription posture, complete any provider auth requirement, then reply DONE for re-verification.',
    artifactRef: request.inputArtifactRef,
    jobId: 'claude-code-review-brain-route-proof',
    credentialRef: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
  })
  return runHarlanAuthEscalationScenario({
    scenario: 'auth_needed',
    event,
  })
}

export async function runClaudeCodeReviewBrainRouteProof({
  liveProbe = false,
  writeLedger = false,
  commandRunner = runClaudeCommand,
  fingerprintProvider = getClaudeCredentialFingerprint,
  createCall = undefined,
  finishCall = undefined,
  actor = 'claude-code-review-brain-route-proof',
  runId = '',
} = {}) {
  const request = buildClaudeCodeReviewProbeRequest(runId)
  const initialQuotaState = {
    status: 'unknown',
    tier: 'unknown',
    resetAt: null,
    source: 'pre_probe_quota_unknown',
  }
  const credential = buildClaudeCodeReviewCredential({
    status: 'probe_required',
    quotaState: initialQuotaState,
  })
  const route = buildClaudeCodeReviewRoute({ status: 'probe_required' })
  const routeContract = buildClaudeCodeReviewRouteContract({ credential, route })
  const ledger = writeLedger
    ? await recordBrainFleetLedgerCall({
      request,
      routeContract,
      status: 'planned',
      artifactRef: request.inputArtifactRef,
      quotaState: initialQuotaState,
      metadata: {
        cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
        closeoutKey: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY,
        liveProbe,
      },
      actor,
      createCall,
    })
    : null

  const beforeCredential = await fingerprintProvider()
  let claudeStatus = null
  let finishedLedger = null
  let harlanAuth = null
  let failureReason = null
  let stopCondition = BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE

  try {
    claudeStatus = await collectClaudeCodeReviewRouteStatus({
      commandRunner,
      liveProbe,
    })

    const afterCredential = await fingerprintProvider()
    const credentialUnchanged = compareFingerprints(beforeCredential, afterCredential)
    if (!credentialUnchanged) {
      throw new Error('Claude Code credential fingerprint changed during route proof.')
    }

    const finalQuotaState = claudeStatus.quotaState || initialQuotaState
    if (writeLedger && ledger?.call?.callId) {
      finishedLedger = await finishBrainFleetLedgerCall({
        callId: ledger.call.callId,
        request,
        routeContract: {
          ...routeContract,
          model: claudeStatus.selectedModel || routeContract.model,
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
          cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
          claudeStatus: {
            version: claudeStatus.version,
            selectedModel: claudeStatus.selectedModel,
            capability: claudeStatus.capability,
            sdkPosture: claudeStatus.sdkPosture,
          },
        },
        finishCall,
        actor,
      })
    }

    return {
      ok: liveProbe ? claudeStatus?.execution?.ok === true && credentialUnchanged : true,
      status: liveProbe ? 'succeeded' : 'ready',
      cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
      routeKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
      credentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
      request,
      routeContract,
      claudeStatus,
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
      experimental: true,
    }
  } catch (error) {
    failureReason = safeErrorText(error instanceof Error ? error.message : String(error))
    stopCondition = classifyClaudeFailure(failureReason)
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
          cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
          harlanAuth,
          claudeStatus,
        },
        finishCall,
        actor,
      })
    }
    return {
      ok: false,
      status: 'blocked',
      cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
      routeKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
      credentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
      request,
      routeContract,
      claudeStatus,
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
      experimental: true,
    }
  }
}

export function buildClaudeCodeReviewRouteProbeInput(proof = {}) {
  const status = proof.claudeStatus || {}
  const quotaState = status.quotaState || {}
  return {
    credentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
    provider: 'claude_code',
    authPath: LLM_AUTH_PATHS.CLAUDE_CODE_SUBSCRIPTION,
    probeType: CLAUDE_CODE_REVIEW_PROBE_TYPE,
    status: proof.ok ? 'passed' : 'failed',
    detail: proof.ok
      ? 'Bounded Claude Code review route proof succeeded with Brain Fleet ledger truth.'
      : `Bounded Claude Code review route proof failed closed: ${proof.failureReason || proof.stopCondition || 'unknown failure'}`,
    capability: {
      provider: 'claude_code',
      authMethod: status.authMethod || 'Claude Code local login',
      accountLabel: status.accountLabel || proof.routeContract?.accountLabel || 'local Claude Max login',
      selectedModel: status.selectedModel || CLAUDE_CODE_REVIEW_MODEL,
      version: status.version || null,
      policyPosture: 'experimental',
      sdkPosture: status.sdkPosture || {},
      quota: {
        posture: 'unknown',
        tier: quotaState.tier || 'unknown',
        resetAt: quotaState.resetAt || null,
        remaining: quotaState.remaining || null,
        source: quotaState.source || 'claude_code_json_output_no_quota_reset',
        totalCostUsd: quotaState.totalCostUsd ?? null,
      },
      supports: {
        codeReview: status.capability?.codeReview || 'probe_required',
        agentSdk: status.capability?.agentSdk || 'ambiguous',
        video: status.capability?.video || 'unsupported',
        vision: status.capability?.vision || 'probe_required',
        longContext: status.capability?.longContext || 'probe_required',
      },
      capabilityDocs: CLAUDE_CODE_REVIEW_DOCS,
      artifactContract: {
        inputArtifactRef: proof.request?.inputArtifactRef || null,
        outputArtifactRef: proof.request?.outputArtifactRef || null,
        acceptedInputs: [
          'bounded_code_review_prompt',
          'future_local_diff_or_patch_artifact',
        ],
        outputTypes: [
          'route_probe_response',
          'future_code_review_findings_artifact',
        ],
        toolsDisabledInProbe: true,
        sessionPersistenceDisabledInProbe: true,
        externalWrites: false,
      },
      stopCondition: proof.stopCondition || BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.NONE,
    },
    metadata: {
      cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
      closeoutKey: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY,
      routeKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      credentialMutationProof: proof.credentialMutationProof || null,
      experimental: true,
      extractorV1Blocked: false,
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

export function buildClaudeCodeReviewRuntimeMetadata(proof = {}) {
  const status = proof.claudeStatus || {}
  return {
    claudeCodeReviewBrainRoute: {
      cardId: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID,
      closeoutKey: CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY,
      probedAt: new Date().toISOString(),
      status: proof.ok ? 'available' : 'blocked',
      selectedModel: status.selectedModel || CLAUDE_CODE_REVIEW_MODEL,
      version: status.version || null,
      authMethod: status.authMethod || 'Claude Code local login',
      policyPosture: 'experimental',
      quotaTier: status.quotaState?.tier || 'unknown',
      quotaStatus: status.quotaState?.status || 'unknown',
      sdkPosture: status.sdkPosture || {},
      support: status.capability || {},
      artifactContract: buildClaudeCodeReviewRouteProbeInput(proof).capability.artifactContract,
      ledgerCallId: proof.ledger?.call?.callId || proof.finishedLedger?.call?.callId || null,
      externalWrites: false,
      credentialMutation: proof.credentialMutation === true,
      extractorV1Blocked: false,
      docs: CLAUDE_CODE_REVIEW_DOCS,
    },
  }
}

export async function buildSyntheticClaudeCodeReviewBrainRouteProof() {
  const fakeHelp = [
    'Usage: claude [options] [prompt]',
    '-p, --print Print response and exit',
    '--output-format <format>',
    '--tools <tools...>',
    '--no-session-persistence',
  ].join('\n')
  const fakeAuth = [
    'Login method: Claude Max account',
    "Organization: [email-redacted]'s Organization",
    'Email: [email-redacted]',
  ].join('\n')
  const fakeJson = JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    duration_ms: 1000,
    duration_api_ms: 900,
    num_turns: 1,
    result: CLAUDE_CODE_REVIEW_PROBE_TOKEN,
    stop_reason: 'end_turn',
    total_cost_usd: 0.01,
    usage: {
      service_tier: 'standard',
      speed: 'standard',
    },
    modelUsage: {
      'claude-opus-4-7[1m]': {
        inputTokens: 5,
        outputTokens: 8,
        contextWindow: 1000000,
        maxOutputTokens: 64000,
      },
    },
    permission_denials: [],
    fast_mode_state: 'off',
  })
  const createdCalls = []
  const finishedCalls = []
  const commandRunner = async args => {
    if (args[0] === '--version') return { stdout: '2.1.143 (Claude Code)\n', stderr: '' }
    if (args[0] === '--help') return { stdout: fakeHelp, stderr: '' }
    if (args.join(' ') === 'auth status --text') return { stdout: fakeAuth, stderr: '' }
    if (args.includes('-p')) return { stdout: fakeJson, stderr: '' }
    throw new Error(`unexpected synthetic claude command ${args.join(' ')}`)
  }
  const authFailureRunner = async args => {
    if (args.join(' ') === 'auth status --text') throw new Error('Claude login expired; 2FA auth required.')
    return commandRunner(args)
  }
  const rateLimitRunner = async args => {
    if (args.includes('-p')) throw new Error('Claude rate limit exceeded.')
    return commandRunner(args)
  }
  const ambiguousHelpRunner = async args => {
    if (args[0] === '--help') return { stdout: 'Usage: claude [options]\n', stderr: '' }
    return commandRunner(args)
  }
  const fingerprint = {
    exists: true,
    pathClass: '~/.claude credential fingerprints',
    files: [
      {
        exists: true,
        pathClass: '~/.claude.json',
        size: 1234,
        mtimeMs: 1779300000000,
        contentHash: 'synthetic-unchanged',
      },
    ],
    contentHash: 'synthetic-unchanged',
  }
  const fingerprintProvider = async () => ({ ...fingerprint, files: fingerprint.files.map(file => ({ ...file })) })
  const createCall = async (input, actor) => {
    const call = {
      callId: `synthetic-claude-call-${createdCalls.length + 1}`,
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

  const success = await runClaudeCodeReviewBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-claude-review-proof',
    runId: 'synthetic-success',
  })
  const authNeeded = await runClaudeCodeReviewBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner: authFailureRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-claude-review-proof',
    runId: 'synthetic-auth-needed',
  })
  const rateLimited = await runClaudeCodeReviewBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner: rateLimitRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-claude-review-proof',
    runId: 'synthetic-rate-limited',
  })
  const ambiguous = await runClaudeCodeReviewBrainRouteProof({
    liveProbe: true,
    writeLedger: true,
    commandRunner: ambiguousHelpRunner,
    fingerprintProvider,
    createCall,
    finishCall,
    actor: 'synthetic-claude-review-proof',
    runId: 'synthetic-ambiguous',
  })
  const probeInput = buildClaudeCodeReviewRouteProbeInput(success)

  return {
    ok: success.ok === true &&
      success.finishedLedger?.ledgerRecord?.status === 'succeeded' &&
      success.claudeStatus?.capability?.codeReview === 'supported' &&
      success.claudeStatus?.policyPosture === 'experimental' &&
      success.credentialMutationProof?.unchanged === true &&
      authNeeded.ok === false &&
      authNeeded.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED &&
      authNeeded.harlanAuth?.finalStatus === 'blocked-auth' &&
      authNeeded.harlanAuth?.notifications?.every(item => item.externalSent === false) &&
      rateLimited.ok === false &&
      rateLimited.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED &&
      ambiguous.ok === false &&
      ambiguous.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.ROUTE_NOT_RUNNABLE &&
      probeInput.metadata.extractorV1Blocked === false &&
      probeInput.capability.artifactContract.externalWrites === false,
    mode: 'claude-code-review-brain-route-synthetic-proof',
    success: {
      ok: success.ok,
      ledgerStatus: success.finishedLedger?.ledgerRecord?.status,
      selectedModel: success.claudeStatus?.selectedModel,
      codeReviewSupport: success.claudeStatus?.capability?.codeReview,
      sdkPosture: success.claudeStatus?.sdkPosture?.posture,
      quotaTier: success.claudeStatus?.quotaState?.tier,
      credentialUnchanged: success.credentialMutationProof?.unchanged,
      externalWrites: success.externalWrites,
      experimental: success.experimental,
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
    ambiguous: {
      ok: ambiguous.ok,
      stopCondition: ambiguous.stopCondition,
    },
    createdCallCount: createdCalls.length,
    finishedCallCount: finishedCalls.length,
    sampleProbeInput: probeInput,
  }
}

export function evaluateClaudeCodeReviewBrainRoute({
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
  const packageScript = packageJson.scripts?.['process:claude-code-review-brain-route-check']
  const source = `${moduleSource}\n${scriptSource}`
  const externalSendScanSource = source.replace(/add\(!\/\(sendMail[\s\S]*?'no external send'\)\n/, '')

  add(moduleSource.includes('recordBrainFleetLedgerCall') && moduleSource.includes('finishBrainFleetLedgerCall'), 'Claude proof uses Brain Fleet quota ledger before provider execution', 'record/finish ledger')
  add(moduleSource.includes('runHarlanAuthEscalationScenario') && moduleSource.includes('buildAuthNeededEvent'), 'auth-needed failures route through Harlan auth escalation loop', 'Harlan auth-needed flow')
  add(moduleSource.includes("'--tools'") && moduleSource.includes("'--no-session-persistence'") && moduleSource.includes("'--output-format'"), 'bounded probe disables tools and session persistence with JSON output', 'claude -p')
  add(moduleSource.includes('getClaudeCredentialFingerprint') && moduleSource.includes('credentialMutationProof'), 'proof checks Claude credential fingerprints are unchanged', '~/.claude')
  add(!/(sendMail\s*\(|gmail\.[A-Za-z.]*send|telegramApi|slack\.[A-Za-z.]*post|drive\.files\.create|publicPost\s*\()/i.test(externalSendScanSource), 'Claude proof has no external-send path', 'no external send')
  add(llmRouterSource.includes(CLAUDE_CODE_REVIEW_CREDENTIAL_KEY) && llmRouterSource.includes(CLAUDE_CODE_REVIEW_ROUTE_KEY), 'LLM router default config includes Claude credential and route metadata', CLAUDE_CODE_REVIEW_ROUTE_KEY)
  add(packageScript === `node --env-file-if-exists=.env ${CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SCRIPT_PATH}`, 'package exposes focused Claude route proof', packageScript || 'missing')
  add(
    normalizedPlan.includes('brain fleet quota ledger') &&
      normalizedPlan.includes('harlan auth-needed') &&
      normalizedPlan.includes('claude code') &&
      normalizedPlan.includes('agent sdk') &&
      normalizedPlan.includes('experimental') &&
      normalizedPlan.includes('do not block extractor v1') &&
      normalizedPlan.includes('no external writes') &&
      normalizedPlan.includes('process:foundation-ship'),
    'plan documents ledger, Harlan, Claude Code/Agent SDK, experimental posture, extractor non-blocking, no-external-write, and ship gates',
    CLAUDE_CODE_REVIEW_BRAIN_ROUTE_PLAN_PATH,
  )
  add(closeout && asList(closeout.backlogIds).includes(CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID), 'closeout registry links Claude route card', closeout?.key || 'missing closeout')
  add(syntheticProof.ok === true, 'synthetic proof exercises success, auth-needed, rate-limit, ambiguity, ledger, Harlan, no credential mutation, and no external sends', syntheticProof.mode || 'missing')
  if (liveProof) {
    add(liveProof.ok === true, 'live Claude Code route proof succeeded', liveProof.status || 'missing')
    add(liveProof.finishedLedger?.ledgerRecord?.status === 'succeeded', 'live proof wrote successful Brain Fleet ledger truth', liveProof.finishedLedger?.ledgerRecord?.status || 'missing')
    add(liveProof.claudeStatus?.capability?.codeReview === 'supported', 'live proof records Claude Code review capability', liveProof.claudeStatus?.capability?.codeReview || 'missing')
    add(liveProof.claudeStatus?.policyPosture === 'experimental', 'live proof keeps Claude route experimental', liveProof.claudeStatus?.policyPosture || 'missing')
    add(liveProof.claudeStatus?.quotaState?.resetAt === null, 'live proof records explicit unknown quota reset posture', liveProof.claudeStatus?.quotaState?.resetAt ?? 'unknown')
    add(liveProof.credentialMutationProof?.unchanged === true, 'live proof did not mutate Claude credentials', '~/.claude fingerprints')
    add(liveProof.externalWrites === false, 'live proof performed no external writes beyond bounded provider response', 'externalWrites=false')
  }

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
