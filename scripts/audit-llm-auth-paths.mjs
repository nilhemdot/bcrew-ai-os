#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  closeFoundationDb,
  initFoundationDb,
  recordLlmRouteProbe,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-db.js'
import { DEFAULT_LLM_ROUTES, callLlm, seedDefaultLlmRouterConfig } from '../lib/llm-router.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function hasEnv(name) {
  return Boolean(String(process.env[name] || '').trim())
}

function redact(text) {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[key-redacted]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[token-redacted]')
    .trim()
}

async function runCommandProbe(command, args, { timeoutMs = 8000 } = {}) {
  try {
    const result = await execFile(command, args, {
      timeout: timeoutMs,
      maxBuffer: 256 * 1024,
      env: process.env,
    })
    return {
      ok: true,
      stdout: redact(result.stdout),
      stderr: redact(result.stderr),
    }
  } catch (error) {
    return {
      ok: false,
      stdout: redact(error.stdout),
      stderr: redact(error.stderr),
      message: redact(error.message),
      code: error.code || null,
    }
  }
}

async function recordProbe(input, actor) {
  const probe = await recordLlmRouteProbe(input, actor)
  const statusLabel = probe.status.toUpperCase().padEnd(7)
  console.log(`${statusLabel} ${probe.provider}/${probe.authPath}/${probe.probeType}: ${probe.detail}`)
  return probe
}

async function auditClaudeCode(actor) {
  const which = await runCommandProbe('/usr/bin/which', ['claude'])
  await recordProbe({
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    probeType: 'cli_installed',
    status: which.ok ? 'passed' : 'failed',
    detail: which.ok ? 'claude CLI found on PATH.' : 'claude CLI not found on PATH.',
    capability: { installed: which.ok },
    metadata: { stdout: which.stdout, stderr: which.stderr, message: which.message || '' },
  }, actor)

  let version = { ok: false, stdout: '', stderr: '', message: 'Skipped because claude CLI was not found.' }
  let auth = { ok: false, stdout: '', stderr: '', message: 'Skipped because claude CLI was not found.' }
  if (which.ok) {
    version = await runCommandProbe('claude', ['--version'])
    auth = await runCommandProbe('claude', ['auth', 'status', '--text'])
  }

  await recordProbe({
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    probeType: 'cli_version',
    status: version.ok ? 'passed' : which.ok ? 'failed' : 'skipped',
    detail: version.ok ? `Claude CLI version detected: ${version.stdout || 'unknown'}.` : version.message,
    capability: { version: version.stdout || null },
    metadata: { stderr: version.stderr, message: version.message || '' },
  }, actor)

  await recordProbe({
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    probeType: 'auth_status',
    status: auth.ok ? 'passed' : which.ok ? 'failed' : 'skipped',
    detail: auth.ok ? 'Claude auth status command succeeded.' : auth.message,
    capability: {
      authenticated: auth.ok,
      subscriptionAuthLikely: auth.ok && !hasEnv('ANTHROPIC_API_KEY'),
      apiKeyOverridesSubscription: hasEnv('ANTHROPIC_API_KEY'),
    },
    metadata: { stdout: auth.stdout, stderr: auth.stderr, message: auth.message || '' },
  }, actor)

  const status = auth.ok ? 'available' : which.ok ? 'blocked' : 'missing'
  return upsertLlmCredential({
    credentialKey: 'claude-code-local-max',
    provider: 'claude_code',
    authPath: 'claude_code_subscription',
    displayName: 'Local Claude Code Max Login',
    accountLabel: 'local claude login',
    hubKey: 'foundation',
    workloadLane: 'synthesis',
    secretRef: 'local_claude_code_auth',
    status,
    policyClassification: 'experimental',
    allowedWorkloads: ['manual_interactive', 'synthesis_probe', 'agent_probe'],
    notes: auth.ok
      ? 'CLI and auth are present. Keep subscription route policy-gated before scheduled automation.'
      : 'Claude Code subscription route is not ready on this machine.',
    metadata: {
      cliFound: which.ok,
      version: version.stdout || null,
      authenticated: auth.ok,
      anthropicApiKeyPresent: hasEnv('ANTHROPIC_API_KEY'),
    },
  }, actor)
}

async function auditEnvCredential({ credentialKey, provider, authPath, displayName, secretRefs, workloadLane, allowedWorkloads, notes }, actor) {
  const presentRefs = secretRefs.filter(hasEnv)
  const status = presentRefs.length ? 'available' : 'missing'

  await recordProbe({
    credentialKey,
    provider,
    authPath,
    probeType: 'env_presence',
    status: presentRefs.length ? 'passed' : 'failed',
    detail: presentRefs.length
      ? `${displayName} has required env configured (${presentRefs.join(' or ')}).`
      : `${displayName} env is not configured (${secretRefs.join(' or ')}).`,
    capability: {
      configured: presentRefs.length > 0,
      presentRefs,
      missingRefs: secretRefs.filter(name => !hasEnv(name)),
    },
  }, actor)

  return upsertLlmCredential({
    credentialKey,
    provider,
    authPath,
    displayName,
    accountLabel: secretRefs.join(' or '),
    hubKey: 'foundation',
    workloadLane,
    secretRef: secretRefs[0],
    status,
    policyClassification: 'api_fallback',
    allowedWorkloads,
    notes,
    metadata: {
      presentRefs,
      missingRefs: secretRefs.filter(name => !hasEnv(name)),
    },
  }, actor)
}

async function auditOpenClaw(actor) {
  const launchctl = os.platform() === 'darwin'
    ? await runCommandProbe('launchctl', ['list'], { timeoutMs: 8000 })
    : { ok: false, stdout: '', stderr: '', message: 'launchctl is only available on macOS.' }
  const launchAgentRunning = launchctl.ok && launchctl.stdout.includes('ai.openclaw.gateway')

  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
  let configExists = false
  let workspaceConfigured = false
  try {
    const raw = await fs.readFile(configPath, 'utf8')
    configExists = true
    workspaceConfigured = raw.includes('/bcrew-ai-os')
  } catch {
    configExists = false
  }

  await recordProbe({
    credentialKey: 'openclaw-chatgpt-pro',
    provider: 'openclaw',
    authPath: 'chatgpt_subscription_gateway',
    probeType: 'gateway_runtime',
    status: launchAgentRunning ? 'passed' : 'warning',
    detail: launchAgentRunning
      ? 'OpenClaw gateway LaunchAgent is running.'
      : 'OpenClaw gateway LaunchAgent was not confirmed running.',
    capability: { launchAgentRunning, configExists, workspaceConfigured },
    metadata: { platform: os.platform(), configPath },
  }, actor)

  const modelProbe = await runCommandProbe(
    'openclaw',
    [
      'infer',
      'model',
      'run',
      '--local',
      '--model',
      process.env.LLM_OPENCLAW_PROBE_MODEL || 'openai-codex/gpt-5.5',
      '--prompt',
      'Reply with exactly: OPENCLAW_SUBSCRIPTION_PROBE_OK',
      '--json',
    ],
    { timeoutMs: 30000 },
  )
  let modelProbeOk = false
  let modelProbeOutput = ''
  if (modelProbe.ok) {
    try {
      const parsed = JSON.parse(modelProbe.stdout)
      modelProbeOutput = parsed.outputs?.map(item => item.text || '').join('\n').trim()
      modelProbeOk = Boolean(parsed.ok && modelProbeOutput.includes('OPENCLAW_SUBSCRIPTION_PROBE_OK'))
    } catch (error) {
      modelProbeOutput = `Probe JSON parse failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  await recordProbe({
    credentialKey: 'openclaw-chatgpt-pro',
    provider: 'openclaw',
    authPath: 'chatgpt_subscription_gateway',
    probeType: 'actual_model_run',
    status: modelProbeOk ? 'passed' : 'failed',
    detail: modelProbeOk
      ? 'OpenClaw subscription model probe returned expected output.'
      : `OpenClaw subscription model probe failed: ${modelProbe.message || modelProbe.stderr || modelProbeOutput || 'unknown error'}`,
    capability: {
      model: process.env.LLM_OPENCLAW_PROBE_MODEL || 'openai-codex/gpt-5.5',
      outputMatched: modelProbeOk,
    },
    metadata: {
      stdout: modelProbe.ok ? '[json-output-redacted]' : modelProbe.stdout,
      stderr: modelProbe.stderr,
      message: modelProbe.message || '',
      output: redact(modelProbeOutput),
    },
  }, actor)

  const status = modelProbeOk ? 'available' : launchAgentRunning ? 'unknown' : configExists ? 'unknown' : 'missing'
  const policyClassification = modelProbeOk ? 'allowed' : 'experimental'
  return upsertLlmCredential({
    credentialKey: 'openclaw-chatgpt-pro',
    provider: 'openclaw',
    authPath: 'chatgpt_subscription_gateway',
    displayName: 'OpenClaw ChatGPT Pro Gateway',
    accountLabel: 'local OpenClaw gateway',
    hubKey: 'foundation',
    workloadLane: 'extraction',
    secretRef: 'OPENCLAW_GATEWAY_URL',
    status,
    policyClassification,
    allowedWorkloads: ['extraction', 'synthesis', 'extraction_probe', 'classification_probe', 'synthesis_probe'],
    notes: modelProbeOk
      ? 'OpenClaw subscription route passed an actual model-run probe. Use for bounded internal extraction/synthesis before API fallback.'
      : 'Gateway is local and policy-gated. Do not treat it as production-safe until an actual workload probe passes.',
    metadata: { launchAgentRunning, configExists, workspaceConfigured, modelProbeOk },
  }, actor)
}

async function updateRouteStatus(credentials, actor) {
  const credentialsByKey = new Map(credentials.map(item => [item.credentialKey, item]))
  const routes = []

  for (const route of DEFAULT_LLM_ROUTES) {
    const credential = credentialsByKey.get(route.credentialKey)
    let status = 'probe_required'
    let riskClass = route.riskClass

    if (!credential || credential.status === 'missing') {
      status = 'blocked'
      riskClass = 'blocked'
    } else if (
      credential.status === 'available' &&
      (credential.policyClassification === 'api_fallback' || credential.policyClassification === 'allowed')
    ) {
      status = 'available'
      riskClass = route.riskClass === 'untested' ? 'low' : route.riskClass
    } else if (credential.status === 'blocked' || credential.policyClassification === 'blocked') {
      status = 'blocked'
      riskClass = 'blocked'
    }

    routes.push(await upsertLlmRoute({
      ...route,
      status,
      riskClass,
      metadata: {
        ...(route.metadata || {}),
        routeStatusDerivedFromCredential: route.credentialKey,
        credentialStatus: credential?.status || 'missing',
        credentialPolicyClassification: credential?.policyClassification || 'untested',
      },
    }, actor))
  }

  return routes
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const actor = String(args.actor || 'llm-auth-audit').trim()

  await initFoundationDb()
  await seedDefaultLlmRouterConfig(actor)

  const credentials = []
  credentials.push(await auditEnvCredential({
    credentialKey: 'openai-api-default',
    provider: 'openai',
    authPath: 'api_direct',
    displayName: 'OpenAI API Default',
    secretRefs: ['OPENAI_API_KEY'],
    workloadLane: 'extraction',
    allowedWorkloads: ['extraction', 'synthesis', 'embedding', 'transcription', 'image_generation'],
    notes: 'Official OpenAI API route. Production-safe fallback for extraction, synthesis, embeddings, transcription, and images.',
  }, actor))
  credentials.push(await auditEnvCredential({
    credentialKey: 'anthropic-api-default',
    provider: 'anthropic',
    authPath: 'api_direct',
    displayName: 'Anthropic API Default',
    secretRefs: ['ANTHROPIC_API_KEY'],
    workloadLane: 'synthesis',
    allowedWorkloads: ['synthesis', 'agent', 'vision'],
    notes: 'Official Anthropic API route. Production-safe fallback for Claude workloads.',
  }, actor))
  credentials.push(await auditClaudeCode(actor))

  const oauthCredential = await auditEnvCredential({
    credentialKey: 'claude-code-oauth-token',
    provider: 'claude_code',
    authPath: 'claude_code_oauth_token',
    displayName: 'Claude Code OAuth Token',
    secretRefs: ['CLAUDE_CODE_OAUTH_TOKEN'],
    workloadLane: 'synthesis',
    allowedWorkloads: ['synthesis_probe', 'agent_probe'],
    notes: 'Setup-token/OAuth route. Keep workload policy-gated before scheduled automation.',
  }, actor)
  credentials.push({
    ...oauthCredential,
    policyClassification: 'experimental',
  })
  await upsertLlmCredential({
    ...oauthCredential,
    policyClassification: 'experimental',
  }, actor)

  credentials.push(await auditOpenClaw(actor))
  credentials.push(await auditEnvCredential({
    credentialKey: 'gemini-api-default',
    provider: 'gemini',
    authPath: 'gemini_api_direct',
    displayName: 'Gemini API Default',
    secretRefs: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    workloadLane: 'vision',
    allowedWorkloads: ['video_vision', 'long_context_probe'],
    notes: 'Official Gemini API route for video/vision workloads.',
  }, actor))

  const routes = await updateRouteStatus(credentials, actor)
  const dryRun = await callLlm({
    workload: 'extraction',
    hubKey: 'foundation',
    inputText: 'LLM auth audit dry-run route selection proof.',
    dryRun: true,
    metadata: { proof: 'llm-auth-audit-route-selection' },
  })

  const summary = {
    credentials: credentials.map(item => ({
      credentialKey: item.credentialKey,
      provider: item.provider,
      authPath: item.authPath,
      status: item.status,
      policyClassification: item.policyClassification,
    })),
    routes: routes.map(item => ({
      routeKey: item.routeKey,
      workload: item.workload,
      provider: item.provider,
      authPath: item.authPath,
      status: item.status,
      policyClassification: item.policyClassification,
      riskClass: item.riskClass,
    })),
    dryRunCall: {
      callId: dryRun.call.callId,
      routeKey: dryRun.plan.selectedRoute.routeKey,
      runnable: dryRun.plan.runnable,
      status: dryRun.call.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('')
    console.log(`LLM auth audit complete: ${summary.credentials.length} credentials, ${summary.routes.length} routes, dry-run call ${summary.dryRunCall.callId}.`)
  }
}

main()
  .catch(error => {
    console.error('LLM auth audit failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
