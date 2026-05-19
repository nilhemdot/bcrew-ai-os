export const MEMORY_002_CARD_ID = 'MEMORY-002'
export const MEMORY_002_PREFLIGHT_CLOSEOUT_KEY = 'memory-002-openclaw-native-memory-preflight-v1'
export const MEMORY_002_PREFLIGHT_PLAN_PATH = 'docs/process/memory-002-openclaw-native-memory-preflight-plan.md'
export const MEMORY_002_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/MEMORY-002.json'
export const MEMORY_002_PREFLIGHT_SCRIPT_PATH = 'scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs'
export const MEMORY_002_PREFLIGHT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-memory-002-openclaw-native-memory-preflight.md'
export const MEMORY_002_PREFLIGHT_SPRINT_ID = 'foundation-up-capability-registry-2026-05-18'

export const MEMORY_002_PREFLIGHT_NOT_NEXT_BOUNDARIES = [
  'Do not mutate OpenClaw runtime config from this preflight.',
  'Do not restart the OpenClaw gateway from this preflight.',
  'Do not run active-memory recall, dreaming, memory search, promote, or write commands.',
  'Do not read or print private memory content, transcripts, tokens, or session files.',
  'Do not call providers or models.',
  'Do not run live extraction, source crawls, transcript fetches, screenshots, downloads, summarization, vision, or model calls.',
  'Do not mutate Drive, Gmail, ClickUp, Slack, Agent Feedback, Canva, or external systems.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

export const MEMORY_002_PREFLIGHT_PROOF_COMMANDS = [
  'node --check lib/openclaw-native-memory-preflight.js scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs',
  'npm run process:memory-002-openclaw-native-memory-preflight-check -- --apply --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MEMORY-002 --planApprovalRef=docs/process/approvals/MEMORY-002.json --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1',
  'npm run process:post-ship-fanout -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=MEMORY-002 --planApprovalRef=docs/process/approvals/MEMORY-002.json --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD',
]

export const MEMORY_002_PREFLIGHT_CHANGED_FILES = [
  'lib/openclaw-native-memory-preflight.js',
  'scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs',
  'scripts/process-fanout-check.mjs',
  'scripts/process-post-ship-fanout.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  MEMORY_002_PREFLIGHT_PLAN_PATH,
  MEMORY_002_PREFLIGHT_APPROVAL_PATH,
  MEMORY_002_PREFLIGHT_CLOSEOUT_PATH,
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

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function findPlugin(plugins = [], id = '') {
  return list(plugins).find(plugin => plugin?.id === id) || null
}

function pluginStatus(plugin = null) {
  if (!plugin) return 'missing'
  if (plugin.activated) return 'activated'
  if (plugin.enabled) return 'enabled'
  return text(plugin.status) || 'disabled'
}

function hasDreamingSchema(memoryCore = null) {
  return Boolean(memoryCore?.configJsonSchema?.properties?.dreaming)
}

function getConfiguredPlugin(configPlugins = {}, id = '') {
  const entries = configPlugins?.entries && typeof configPlugins.entries === 'object'
    ? configPlugins.entries
    : {}
  return entries[id] || null
}

function secretLike(value = '') {
  const source = String(value || '')
  return /(sk-[A-Za-z0-9_-]{20,}|token['"]?\s*[:=]\s*['"][A-Za-z0-9._-]{20,}|api[_-]?key['"]?\s*[:=]\s*['"][A-Za-z0-9._-]{20,})/i.test(source)
}

function containsSecretLikeValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return secretLike(value)
  if (Array.isArray(value)) return value.some(containsSecretLikeValue)
  if (typeof value === 'object') return Object.values(value).some(containsSecretLikeValue)
  return false
}

export function evaluateOpenClawNativeMemoryPreflight(input = {}) {
  const checks = []
  const plugins = list(input.plugins)
  const memoryCore = findPlugin(plugins, 'memory-core')
  const activeMemory = findPlugin(plugins, 'active-memory')
  const dreamingPlugin = findPlugin(plugins, 'dreaming')
  const configPlugins = input.configPlugins || {}
  const memoryCoreConfig = getConfiguredPlugin(configPlugins, 'memory-core')
  const activeMemoryConfig = getConfiguredPlugin(configPlugins, 'active-memory')
  const memoryStatus = input.memoryStatus || {}
  const configValidation = input.configValidation || {}
  const runtimeApprovalApproved = input.runtimeApprovalApproved === true
  const attemptedRuntimeMutation = input.attemptedRuntimeMutation === true
  const attemptedPrivateRecallProbe = input.attemptedPrivateRecallProbe === true

  const memoryCoreEnabled = memoryCore?.enabled === true && memoryCore?.activated === true
  const activeMemoryAvailable = Boolean(activeMemory)
  const activeMemoryEnabled = activeMemory?.enabled === true && activeMemory?.activated === true
  const dreamingAvailable = Boolean(dreamingPlugin) || hasDreamingSchema(memoryCore)
  const dreamingEnabled = dreamingPlugin?.activated === true ||
    memoryCoreConfig?.config?.dreaming?.enabled === true
  const memoryStatusHealthy = memoryStatus.backend === 'builtin' &&
    memoryStatus.dirty === false &&
    memoryStatus.fts?.available === true &&
    memoryStatus.fts?.enabled === true &&
    memoryStatus.vector?.available === true &&
    memoryStatus.vector?.enabled === true &&
    list(memoryStatus.issues).length === 0

  addCheck(checks, configValidation.valid === true, 'OpenClaw config validates without mutation', configValidation.valid === true ? 'valid' : 'invalid or missing')
  addCheck(checks, memoryCoreEnabled, 'memory-core is already enabled and loaded', memoryCore ? pluginStatus(memoryCore) : 'missing')
  addCheck(checks, activeMemoryAvailable, 'active-memory plugin is available for later approval', activeMemory ? pluginStatus(activeMemory) : 'missing')
  addCheck(checks, dreamingAvailable, 'dreaming capability is visible through memory-core or plugin schema', dreamingAvailable ? 'available' : 'missing')
  addCheck(checks, memoryStatusHealthy, 'metadata-only memory status is healthy', memoryStatus.backend ? `${memoryStatus.backend} / dirty=${memoryStatus.dirty}` : 'missing status')
  addCheck(checks, text(memoryStatus.dbPath), 'memory status exposes db path metadata without content', memoryStatus.dbPath || 'missing db path')
  addCheck(checks, Number(memoryStatus.chunks || 0) >= 0 && Number(memoryStatus.files || 0) >= 0, 'memory status exposes counts only', `files=${memoryStatus.files ?? 'missing'} chunks=${memoryStatus.chunks ?? 'missing'}`)
  addCheck(checks, !containsSecretLikeValue(input.redactedConfig || {}) && !containsSecretLikeValue(configPlugins), 'preflight input contains no obvious secret values', 'metadata/config refs only')
  addCheck(checks, attemptedRuntimeMutation === false, 'preflight did not mutate OpenClaw runtime config or restart gateway', attemptedRuntimeMutation ? 'mutation attempted' : 'no mutation attempted')
  addCheck(checks, attemptedPrivateRecallProbe === false, 'preflight did not query or print private memory recall content', attemptedPrivateRecallProbe ? 'recall probe attempted' : 'no recall probe attempted')
  addCheck(checks, runtimeApprovalApproved === false || (activeMemoryEnabled && dreamingEnabled), 'runtime approval cannot be claimed before enablement evidence exists', runtimeApprovalApproved ? `active=${activeMemoryEnabled} dreaming=${dreamingEnabled}` : 'approval not claimed')

  const failures = checks.filter(check => !check.ok)
  const readyToEnable = failures.length === 0 &&
    activeMemoryEnabled &&
    dreamingEnabled &&
    runtimeApprovalApproved
  const status = failures.length
    ? 'failed_closed'
    : readyToEnable
      ? 'ready_after_approval'
      : 'blocked_pending_runtime_approval'

  return {
    ok: failures.length === 0,
    status,
    checks,
    summary: {
      memoryCore: pluginStatus(memoryCore),
      activeMemory: pluginStatus(activeMemory),
      activeMemoryEnabled,
      dreamingAvailable,
      dreamingEnabled,
      memoryBackend: memoryStatus.backend || null,
      memoryFiles: Number(memoryStatus.files || 0),
      memoryChunks: Number(memoryStatus.chunks || 0),
      memoryDirty: memoryStatus.dirty === true,
      configValid: configValidation.valid === true,
      activeMemoryConfigPresent: Boolean(activeMemoryConfig),
      runtimeApprovalApproved,
    },
  }
}

export function buildOpenClawNativeMemoryPreflightDogfoodProof() {
  const basePlugins = [
    {
      id: 'memory-core',
      enabled: true,
      activated: true,
      status: 'loaded',
      configJsonSchema: { properties: { dreaming: { type: 'object' } } },
    },
    {
      id: 'active-memory',
      enabled: false,
      activated: false,
      status: 'disabled',
    },
  ]
  const baseStatus = {
    backend: 'builtin',
    dirty: false,
    files: 32,
    chunks: 426,
    dbPath: '/Users/example/.openclaw/memory/main.sqlite',
    fts: { available: true, enabled: true },
    vector: { available: true, enabled: true },
    issues: [],
  }
  const blockedPreflight = evaluateOpenClawNativeMemoryPreflight({
    plugins: basePlugins,
    configPlugins: { entries: { 'memory-core': { config: {} } } },
    configValidation: { valid: true },
    memoryStatus: baseStatus,
  })
  const unsafeMutation = evaluateOpenClawNativeMemoryPreflight({
    plugins: basePlugins,
    configPlugins: { entries: { 'memory-core': { config: {} } } },
    configValidation: { valid: true },
    memoryStatus: baseStatus,
    attemptedRuntimeMutation: true,
  })
  const falseApproval = evaluateOpenClawNativeMemoryPreflight({
    plugins: basePlugins,
    configPlugins: { entries: { 'memory-core': { config: {} } } },
    configValidation: { valid: true },
    memoryStatus: baseStatus,
    runtimeApprovalApproved: true,
  })
  const missingActiveMemory = evaluateOpenClawNativeMemoryPreflight({
    plugins: [basePlugins[0]],
    configPlugins: { entries: { 'memory-core': { config: {} } } },
    configValidation: { valid: true },
    memoryStatus: baseStatus,
  })

  return {
    ok: blockedPreflight.ok === true &&
      blockedPreflight.status === 'blocked_pending_runtime_approval' &&
      unsafeMutation.ok === false &&
      falseApproval.ok === false &&
      missingActiveMemory.ok === false,
    blockedPreflight,
    unsafeMutation,
    falseApproval,
    missingActiveMemory,
    invariant: 'Read-only metadata preflight can pass only as blocked pending approval; runtime mutation, false approval, or missing active-memory fail closed.',
  }
}
