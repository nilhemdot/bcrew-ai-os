import { spawn } from 'node:child_process'

export const CREDENTIAL_VAULT_CARD_ID = 'CREDENTIAL-VAULT-SESSION-BROKER-001'
export const MACOS_KEYCHAIN_REF_PREFIX = 'macos-keychain:'
export const BCREW_KEYCHAIN_SERVICE_PREFIX = 'bcrew-ai-os'
export const GEMINI_WORKSPACE_CREDENTIAL_KEY = 'gemini-workspace-browser-account'
export const GEMINI_WORKSPACE_ROUTE_KEY = 'foundation-video-gemini-workspace-browser'
export const GEMINI_WORKSPACE_AUTH_PATH = 'manual_interactive'
export const GEMINI_WORKSPACE_AUTH_PATH_DETAIL = 'gemini_workspace_browser_account'
export const GEMINI_WORKSPACE_SOURCE = 'gemini-workspace'
export const DEFAULT_GEMINI_WORKSPACE_ACCOUNT = 'ai@bensoncrew.ca'

function text(value) {
  return String(value || '').trim()
}

function normalizePathPart(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildKeychainService({ source = '', account = '' } = {}) {
  const normalizedSource = normalizePathPart(source)
  const normalizedAccount = normalizePathPart(account)
  if (!normalizedSource) throw new Error('source is required.')
  if (!normalizedAccount) throw new Error('account is required.')
  return `${BCREW_KEYCHAIN_SERVICE_PREFIX}/${normalizedSource}/${normalizedAccount}`
}

export function buildKeychainSecretRef(input = {}) {
  return `${MACOS_KEYCHAIN_REF_PREFIX}${buildKeychainService(input)}`
}

export function parseKeychainSecretRef(secretRef = '') {
  const normalized = text(secretRef)
  if (!normalized.startsWith(MACOS_KEYCHAIN_REF_PREFIX)) return null
  const service = normalized.slice(MACOS_KEYCHAIN_REF_PREFIX.length)
  const parts = service.split('/')
  return {
    service,
    source: parts[1] || '',
    account: parts.slice(2).join('/') || '',
  }
}

export function buildSecurityAddGenericPasswordArgs({
  source = '',
  account = '',
  label = '',
  comment = '',
} = {}) {
  const service = buildKeychainService({ source, account })
  return [
    'add-generic-password',
    '-a', account,
    '-s', service,
    '-l', label || service,
    '-j', comment || `BCrew AI OS credential for ${source}`,
    '-U',
    '-w',
  ]
}

export function buildSecurityFindGenericPasswordArgs({ source = '', account = '', reveal = false } = {}) {
  const service = buildKeychainService({ source, account })
  const args = ['find-generic-password', '-a', account, '-s', service]
  if (reveal) args.push('-w')
  return args
}

export function buildSecurityDeleteGenericPasswordArgs({ source = '', account = '' } = {}) {
  return ['delete-generic-password', '-a', account, '-s', buildKeychainService({ source, account })]
}

export function runSecurity(args = [], { stdio = 'pipe' } = {}) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin') {
      reject(new Error('macOS Keychain is only available on darwin.'))
      return
    }
    const child = spawn('security', args, { stdio })
    if (stdio === 'inherit') {
      child.on('error', reject)
      child.on('close', code => resolve({ code, stdout: '', stderr: '' }))
      return
    }
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
}

export async function keychainItemExists(input = {}) {
  const result = await runSecurity(buildSecurityFindGenericPasswordArgs(input))
  return result.code === 0
}

export async function promptAndStoreKeychainPassword(input = {}) {
  const result = await runSecurity(buildSecurityAddGenericPasswordArgs(input), { stdio: 'inherit' })
  if (result.code !== 0) throw new Error(`security add-generic-password failed with exit code ${result.code}`)
  return {
    secretRef: buildKeychainSecretRef(input),
    service: buildKeychainService(input),
    account: input.account,
  }
}

export async function storeKeychainPassword({
  source = '',
  account = '',
  secret = '',
  label = '',
  comment = '',
} = {}) {
  if (!text(secret)) throw new Error('secret is required.')
  const args = [
    ...buildSecurityAddGenericPasswordArgs({ source, account, label, comment }),
    secret,
  ]
  const result = await runSecurity(args)
  if (result.code !== 0) throw new Error(`security add-generic-password failed with exit code ${result.code}`)
  return {
    secretRef: buildKeychainSecretRef({ source, account }),
    service: buildKeychainService({ source, account }),
    account,
  }
}

export async function readKeychainPassword(input = {}) {
  const result = await runSecurity(buildSecurityFindGenericPasswordArgs({ ...input, reveal: true }))
  if (result.code !== 0) throw new Error('keychain credential not found or not readable.')
  return String(result.stdout || '').replace(/\n$/, '')
}

export async function deleteKeychainPassword(input = {}) {
  const result = await runSecurity(buildSecurityDeleteGenericPasswordArgs(input))
  return result.code === 0
}

export function buildGeminiWorkspaceCredentialRows({
  account = DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  keychainPresent = false,
} = {}) {
  const secretRef = buildKeychainSecretRef({
    source: GEMINI_WORKSPACE_SOURCE,
    account,
  })
  return {
    credential: {
      credentialKey: GEMINI_WORKSPACE_CREDENTIAL_KEY,
      provider: 'gemini',
      authPath: GEMINI_WORKSPACE_AUTH_PATH,
      displayName: 'Gemini Workspace browser account',
      accountLabel: account,
      hubKey: 'foundation',
      workloadLane: 'video_vision',
      secretRef,
      status: keychainPresent ? 'available' : 'missing',
      policyClassification: 'experimental',
      allowedWorkloads: ['video_vision', 'extractor_eyes', 'browser_session_login'],
      notes: 'Credential reference only. Password lives in macOS Keychain; agents must receive sessions, not raw secrets.',
      quotaState: {
        status: 'unknown',
        source: 'workspace_subscription_browser_account',
      },
      metadata: {
        vault: 'macos_keychain',
        source: GEMINI_WORKSPACE_SOURCE,
        authPathDetail: GEMINI_WORKSPACE_AUTH_PATH_DETAIL,
        subscriptionInternal: true,
        secretStoredOutsideRepo: true,
        rawSecretVisibleToAgent: false,
        requiresSessionBroker: true,
        manual2faMayBeRequired: true,
      },
    },
    route: {
      routeKey: GEMINI_WORKSPACE_ROUTE_KEY,
      workload: 'video_vision',
      hubKey: 'foundation',
      priority: 8,
      provider: 'gemini',
      model: 'gemini-web-app',
      authPath: GEMINI_WORKSPACE_AUTH_PATH,
      credentialKey: GEMINI_WORKSPACE_CREDENTIAL_KEY,
      fallbackRouteKey: 'foundation-video-gemini-api',
      status: keychainPresent ? 'probe_required' : 'blocked',
      policyClassification: 'experimental',
      costCapUsd: 0,
      riskClass: 'high',
      notes: 'Browser-account route under test for God Mode Extractor eyes. Falls back to Gemini API if blocked or not policy-safe.',
      metadata: {
        vault: 'macos_keychain',
        source: GEMINI_WORKSPACE_SOURCE,
        authPathDetail: GEMINI_WORKSPACE_AUTH_PATH_DETAIL,
        subscriptionInternal: true,
        rawSecretVisibleToAgent: false,
        isolatedProfileOnly: true,
        routeUnderTestForCard: 'GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001',
      },
    },
  }
}

export function redactCredentialText(value = '') {
  return String(value || '')
    .replace(/\b(password|pass|secret|token)\s*[:=]\s*\S+/gi, '$1=[REDACTED_SECRET]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]')
}

export function buildCredentialVaultDogfoodProof() {
  const account = DEFAULT_GEMINI_WORKSPACE_ACCOUNT
  const source = GEMINI_WORKSPACE_SOURCE
  const secretRef = buildKeychainSecretRef({ source, account })
  const addArgs = buildSecurityAddGenericPasswordArgs({ source, account })
  const findArgs = buildSecurityFindGenericPasswordArgs({ source, account })
  const revealArgs = buildSecurityFindGenericPasswordArgs({ source, account, reveal: true })
  const rows = buildGeminiWorkspaceCredentialRows({ account, keychainPresent: true })
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })

  add(secretRef === 'macos-keychain:bcrew-ai-os/gemini-workspace/ai@bensoncrew.ca', 'Gemini secret ref is deterministic and contains no password', secretRef)
  add(addArgs.at(-1) === '-w' && !addArgs.some(arg => /secret|password-value|test-password/i.test(arg)), 'security add command prompts for password instead of passing it as an arg', addArgs.join(' '))
  add(!findArgs.includes('-w'), 'metadata existence check does not reveal password', findArgs.join(' '))
  add(revealArgs.includes('-w'), 'broker-only retrieval path is explicit', revealArgs.join(' '))
  add(rows.credential.secretRef === secretRef && rows.credential.metadata.rawSecretVisibleToAgent === false, 'Gemini credential row stores only secretRef and redaction posture', JSON.stringify(rows.credential.metadata))
  add(rows.route.fallbackRouteKey === 'foundation-video-gemini-api' && rows.route.status === 'probe_required', 'Gemini Workspace route falls back to API and still requires proof', rows.route.routeKey)
  add(redactCredentialText('password=synthetic-test-password-123!').includes('[REDACTED_SECRET]'), 'redaction catches password-shaped text', 'redacted')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
