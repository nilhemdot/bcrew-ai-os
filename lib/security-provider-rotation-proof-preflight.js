export const SECURITY_PROVIDER_ROTATION_PROOF_CARD_ID = 'SECURITY-PROVIDER-ROTATION-PROOF-001'
export const SECURITY_006_CARD_ID = 'SECURITY-006'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CLOSEOUT_KEY = 'security-provider-rotation-proof-preflight-v1'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_PLAN_PATH = 'docs/process/security-provider-rotation-proof-preflight-001-plan.md'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_LEDGER_PATH = 'docs/process/security-provider-rotation-proof-ledger.json'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-security-provider-rotation-proof-preflight.md'
export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_SCRIPT_PATH = 'scripts/process-security-provider-rotation-proof-preflight-check.mjs'
export const FUBZAHND_APP_CONFIG_PATH = '/Users/bensoncrew/.inspection/FUBZahnd/App.config'

export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_PROOF_COMMANDS = [
  'node --check lib/security-provider-rotation-proof-preflight.js scripts/process-security-provider-rotation-proof-preflight-check.mjs',
  'npm run process:security-provider-rotation-proof-preflight-check -- --apply --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --planApprovalRef=docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json --closeoutKey=security-provider-rotation-proof-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --closeoutKey=security-provider-rotation-proof-preflight-v1',
  'npm run process:post-ship-fanout -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --closeoutKey=security-provider-rotation-proof-preflight-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=SECURITY-PROVIDER-ROTATION-PROOF-001 --planApprovalRef=docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json --closeoutKey=security-provider-rotation-proof-preflight-v1 --commitRef=HEAD',
]

export const SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CHANGED_FILES = [
  'lib/security-provider-rotation-proof-preflight.js',
  'scripts/process-security-provider-rotation-proof-preflight-check.mjs',
  'docs/process/security-provider-rotation-proof-preflight-001-plan.md',
  'docs/process/approvals/SECURITY-PROVIDER-ROTATION-PROOF-001.json',
  'docs/process/security-provider-rotation-proof-ledger.json',
  'docs/_archive/handoffs/2026-05-18-security-provider-rotation-proof-preflight.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const SECURITY_PROVIDER_ROTATION_PROOF_NOT_NEXT_BOUNDARIES = [
  'No provider-side credential rotation, revocation, retirement, or live validation.',
  'No raw credential values, secret hashes, token lengths, connection strings, usernames, passwords, or emails in repo truth.',
  'No GitHub/provider API calls, no public-repo mutation, no auth repair, and no connector/runtime changes.',
  'No live FUB, Ambition, SMTP, SQL Server, Supabase, Drive, Gmail, ClickUp, Slack, or Agent Feedback mutation.',
  'No Google Drive permission mutation; do not mutate Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No live extraction, source crawl, model/provider call, paid run, hidden subagent, or parallel builder launch.',
]

export const FUBZAHND_EXPOSURE_GROUPS = [
  {
    exposureId: 'fubzahnd-ambition-webhooks',
    provider: 'Ambition/KPI middleware webhooks',
    credentialClass: 'webhook endpoint and bearer-token style config',
    configKeys: [
      'AmbitionAppointmentURL',
      'AmbitionAppointmentToken',
      'AmbitionCallURL',
      'AmbitionCallToken',
      'AmbitionDealURL',
      'AmbitionDealToken',
      'AmbitionEmailURL',
      'AmbitionEmailToken',
      'AmbitionPersonURL',
      'AmbitionPersonToken',
      'AmbitionStageURL',
      'AmbitionStageToken',
      'AmbitionTaskURL',
      'AmbitionTaskToken',
      'AmbitionTextMessageURL',
      'AmbitionTextMessageToken',
      'AmbitionStageSummaryURL',
      'AmbitionStageSummaryToken',
    ],
  },
  {
    exposureId: 'fubzahnd-follow-up-boss-api',
    provider: 'Follow Up Boss',
    credentialClass: 'API key and X-System header config',
    configKeys: ['FUBAPIKey', 'FUBBaseUrl', 'FUBX-System', 'FUBX-System-Key'],
  },
  {
    exposureId: 'fubzahnd-smtp-mail-server',
    provider: 'SMTP mail server',
    credentialClass: 'mail server host/user/password config',
    configKeys: ['MailServer', 'MailServerUID', 'MailServerPwd', 'MailServerSSL', 'MailFrom', 'MailTo'],
  },
  {
    exposureId: 'fubzahnd-sql-server-dbconn',
    provider: 'SQL Server',
    credentialClass: 'database connection string',
    configKeys: ['DbConn'],
  },
  {
    exposureId: 'fubzahnd-supabase-conn',
    provider: 'Supabase',
    credentialClass: 'database connection string',
    configKeys: ['SupabaseConn'],
  },
]

const FORBIDDEN_LEDGER_FIELD_NAMES = new Set([
  'value',
  'rawvalue',
  'secret',
  'tokenvalue',
  'password',
  'pwd',
  'connectionstring',
  'hash',
  'sha256',
  'fingerprint',
])

function normalizeText(value) {
  return String(value || '').trim()
}

function unique(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map(value => normalizeText(value))
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function parseAttributes(source = '') {
  const attrs = {}
  for (const match of String(source || '').matchAll(/\b([A-Za-z0-9:_-]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

export function parseAppConfigMetadata(appConfigText = '') {
  const entries = []
  for (const match of String(appConfigText || '').matchAll(/<add\s+([^>]+)>/gi)) {
    const attrs = parseAttributes(match[1])
    const key = normalizeText(attrs.key || attrs.name || '')
    if (!key) continue
    const rawValue = attrs.value ?? attrs.connectionString ?? ''
    entries.push({
      key,
      type: attrs.connectionString !== undefined ? 'connectionString' : 'appSetting',
      hasConfiguredValue: normalizeText(rawValue).length > 0,
      hasProviderName: normalizeText(attrs.providerName).length > 0,
    })
  }
  return entries
}

export function collectSensitiveRawValues(appConfigText = '') {
  const values = []
  for (const match of String(appConfigText || '').matchAll(/<add\s+([^>]+)>/gi)) {
    const attrs = parseAttributes(match[1])
    const key = normalizeText(attrs.key || attrs.name || '')
    const rawValue = normalizeText(attrs.value ?? attrs.connectionString ?? '')
    if (!key || rawValue.length < 8) continue
    if (/^(true|false|null|none)$/i.test(rawValue)) continue
    if (/(token|key|pwd|pass|conn|server|url|mail|uid|from|to)/i.test(key)) values.push(rawValue)
  }
  return unique(values)
}

export function buildSecurityProviderRotationProofPreflightLedger({
  appConfigText = '',
  generatedAt = new Date().toISOString(),
  sourcePath = FUBZAHND_APP_CONFIG_PATH,
} = {}) {
  const entries = parseAppConfigMetadata(appConfigText)
  const entryKeys = new Set(entries.map(entry => entry.key))
  const exposureRows = FUBZAHND_EXPOSURE_GROUPS.map(group => {
    const presentKeys = group.configKeys.filter(key => entryKeys.has(key))
    return {
      exposureId: group.exposureId,
      provider: group.provider,
      credentialClass: group.credentialClass,
      exposureSource: 'Lee-InvIT/FUBZahnd App.config metadata only',
      localInspectionPath: sourcePath,
      configKeys: presentKeys,
      missingConfigKeys: group.configKeys.filter(key => !entryKeys.has(key)),
      currentStatus: 'provider_side_proof_missing',
      proofReference: null,
      owner: 'Steve/provider account owner',
      date: generatedAt.slice(0, 10),
      remainingBlocker: 'Provider-side rotation, revocation, retirement, or dead-key proof must be supplied without raw values before this row can close.',
    }
  })
  return {
    schemaVersion: 1,
    cardId: SECURITY_PROVIDER_ROTATION_PROOF_CARD_ID,
    companionCardId: SECURITY_006_CARD_ID,
    closeoutKey: SECURITY_PROVIDER_ROTATION_PROOF_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt,
    preflightOnly: true,
    status: 'blocked_pending_provider_side_proof',
    sourceBoundary: 'Metadata-only config-key inventory; no raw values, hashes, provider calls, auth repair, or external writes.',
    summary: {
      exposureRowCount: exposureRows.length,
      configEntryCount: entries.length,
      providerSideProofMissingCount: exposureRows.filter(row => row.currentStatus === 'provider_side_proof_missing').length,
      rawValueCountStored: 0,
    },
    exposureRows,
    approvalBoundary: SECURITY_PROVIDER_ROTATION_PROOF_NOT_NEXT_BOUNDARIES,
  }
}

function walkObject(value, visit) {
  if (Array.isArray(value)) {
    value.forEach(item => walkObject(item, visit))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    visit(key, child)
    walkObject(child, visit)
  }
}

export function validateNoSecretLedger(ledger = {}, rawValues = []) {
  const findings = []
  walkObject(ledger, (key, value) => {
    const normalizedKey = normalizeText(key).replace(/[^a-z0-9]/gi, '').toLowerCase()
    if (FORBIDDEN_LEDGER_FIELD_NAMES.has(normalizedKey)) {
      findings.push(`forbidden_field:${key}`)
    }
    if (typeof value === 'string' && /(?:password|secret|token)=/i.test(value)) {
      findings.push(`secret_assignment_value:${key}`)
    }
  })
  const serialized = JSON.stringify(ledger)
  for (const rawValue of unique(rawValues)) {
    if (rawValue && serialized.includes(rawValue)) findings.push(`raw_value_leaked:${rawValue.slice(0, 4)}...`)
  }
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function evaluateSecurityProviderRotationProofPreflightLedger(ledger = {}) {
  const exposureRows = Array.isArray(ledger.exposureRows) ? ledger.exposureRows : []
  const exposureIds = new Set(exposureRows.map(row => row.exposureId))
  const missingExposureIds = FUBZAHND_EXPOSURE_GROUPS
    .map(group => group.exposureId)
    .filter(exposureId => !exposureIds.has(exposureId))
  const falseClosedRows = exposureRows.filter(row =>
    row.currentStatus !== 'provider_side_proof_missing' &&
      !normalizeText(row.proofReference)
  )
  const rowsMissingBlockers = exposureRows.filter(row =>
    !normalizeText(row.remainingBlocker) ||
      !normalizeText(row.owner) ||
      !normalizeText(row.date)
  )
  const rowsMissingConfigKeys = exposureRows.filter(row => !Array.isArray(row.configKeys) || row.configKeys.length === 0)
  const findings = [
    ...missingExposureIds.map(id => `missing_exposure:${id}`),
    ...falseClosedRows.map(row => `false_closed_without_proof:${row.exposureId}`),
    ...rowsMissingBlockers.map(row => `missing_blocker:${row.exposureId}`),
    ...rowsMissingConfigKeys.map(row => `missing_config_keys:${row.exposureId}`),
  ]
  if (ledger.preflightOnly !== true) findings.push('preflight_only_false')
  if (ledger.status !== 'blocked_pending_provider_side_proof') findings.push('status_not_blocked')
  if (ledger.summary?.rawValueCountStored !== 0) findings.push('raw_value_count_not_zero')
  return {
    ok: findings.length === 0,
    findings,
    summary: {
      exposureRowCount: exposureRows.length,
      missingExposureCount: missingExposureIds.length,
      falseClosedCount: falseClosedRows.length,
      rowsMissingBlockers: rowsMissingBlockers.length,
    },
  }
}

export function buildSecurityProviderRotationProofPreflightDogfood() {
  const fixture = `
<configuration>
  <appSettings>
    <add key="AmbitionAppointmentURL" value="https://sentinel.example/appointment" />
    <add key="AmbitionAppointmentToken" value="DOGFOOD_SECRET_AMBITION_TOKEN" />
    <add key="AmbitionCallURL" value="https://sentinel.example/call" />
    <add key="AmbitionCallToken" value="DOGFOOD_SECRET_CALL_TOKEN" />
    <add key="AmbitionDealURL" value="https://sentinel.example/deal" />
    <add key="AmbitionDealToken" value="DOGFOOD_SECRET_DEAL_TOKEN" />
    <add key="AmbitionEmailURL" value="https://sentinel.example/email" />
    <add key="AmbitionEmailToken" value="DOGFOOD_SECRET_EMAIL_TOKEN" />
    <add key="AmbitionPersonURL" value="https://sentinel.example/person" />
    <add key="AmbitionPersonToken" value="DOGFOOD_SECRET_PERSON_TOKEN" />
    <add key="AmbitionStageURL" value="https://sentinel.example/stage" />
    <add key="AmbitionStageToken" value="DOGFOOD_SECRET_STAGE_TOKEN" />
    <add key="AmbitionTaskURL" value="https://sentinel.example/task" />
    <add key="AmbitionTaskToken" value="DOGFOOD_SECRET_TASK_TOKEN" />
    <add key="AmbitionTextMessageURL" value="https://sentinel.example/text" />
    <add key="AmbitionTextMessageToken" value="DOGFOOD_SECRET_TEXT_TOKEN" />
    <add key="AmbitionStageSummaryURL" value="https://sentinel.example/summary" />
    <add key="AmbitionStageSummaryToken" value="DOGFOOD_SECRET_SUMMARY_TOKEN" />
    <add key="FUBAPIKey" value="DOGFOOD_SECRET_FUB_API" />
    <add key="FUBBaseUrl" value="https://sentinel.example/fub" />
    <add key="FUBX-System" value="dogfood-system" />
    <add key="FUBX-System-Key" value="DOGFOOD_SECRET_FUB_SYSTEM_KEY" />
    <add key="MailServer" value="smtp.sentinel.example" />
    <add key="MailServerUID" value="DOGFOOD_MAIL_USER" />
    <add key="MailServerPwd" value="DOGFOOD_SECRET_MAIL_PASSWORD" />
  </appSettings>
  <connectionStrings>
    <add name="DbConn" connectionString="Server=sentinel;Password=DOGFOOD_SECRET_SQL_PASSWORD;" />
    <add name="SupabaseConn" connectionString="Host=sentinel;Password=DOGFOOD_SECRET_SUPABASE_PASSWORD;" />
  </connectionStrings>
</configuration>`
  const rawValues = collectSensitiveRawValues(fixture)
  const ledger = buildSecurityProviderRotationProofPreflightLedger({
    appConfigText: fixture,
    generatedAt: '2026-05-18T00:00:00.000Z',
    sourcePath: '/tmp/FUBZahnd/App.config',
  })
  const noSecret = validateNoSecretLedger(ledger, rawValues)
  const valid = evaluateSecurityProviderRotationProofPreflightLedger(ledger)
  const missingExposure = evaluateSecurityProviderRotationProofPreflightLedger({
    ...ledger,
    exposureRows: ledger.exposureRows.filter(row => row.exposureId !== 'fubzahnd-supabase-conn'),
  })
  const falseClosed = evaluateSecurityProviderRotationProofPreflightLedger({
    ...ledger,
    exposureRows: ledger.exposureRows.map(row =>
      row.exposureId === 'fubzahnd-follow-up-boss-api'
        ? { ...row, currentStatus: 'rotated', proofReference: null }
        : row
    ),
  })
  const leaked = validateNoSecretLedger({
    ...ledger,
    exposureRows: [
      ...ledger.exposureRows,
      { exposureId: 'bad-row', rawValue: 'DOGFOOD_SECRET_FUB_API' },
    ],
  }, rawValues)
  return {
    ok: noSecret.ok &&
      valid.ok &&
      missingExposure.ok === false &&
      falseClosed.ok === false &&
      leaked.ok === false,
    invariant: 'The preflight ledger stores provider classes and blockers only; it rejects raw-value leakage, missing exposure groups, and false provider-side closure without proof.',
    noSecret,
    valid,
    missingExposure,
    falseClosed,
    leaked,
  }
}
