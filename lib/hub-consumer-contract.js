import {
  buildConnectorUptimeSnapshot,
} from './connector-uptime-monitor.js'

export const HUB_CONSUMER_CONTRACT_VERSION = 'foundation-hub-consumer-contract.v1'
export const FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID = 'foundation-ready-safe-hub-lane-2026-05-15'
export const FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY = 'foundation-ready-safe-hub-lane-v1'
export const FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS = [
  'HUB-CONSUMER-CONTRACT-001',
  'HUB-SANDBOX-WORKFLOW-001',
  'SHARED-FILE-INTEGRATION-GATE-001',
  'SOURCE-TO-HUB-PROOF-001',
]

export const HUB_SOURCE_HEALTH_GROUPS = Object.freeze({
  sales: ['fub', 'clickup', 'google-workspace', 'kpi-supabase'],
  ops: ['clickup', 'google-workspace', 'missive', 'kpi-supabase'],
  marketing: ['google-workspace', 'slack', 'missive', 'kpi-supabase'],
  strategy: ['clickup', 'fub', 'google-workspace', 'slack', 'missive', 'kpi-supabase'],
})

const HUB_LABELS = Object.freeze({
  sales: 'Sales Hub',
  ops: 'Ops Hub',
  marketing: 'Marketing Hub',
  strategy: 'Strategy Hub',
})

const GROUP_LABELS = Object.freeze({
  clickup: 'ClickUp',
  fub: 'Follow Up Boss',
  'google-workspace': 'Google Workspace',
  slack: 'Slack',
  missive: 'Missive',
  'kpi-supabase': 'KPI / Supabase',
})

const GROUP_FIXTURE_SOURCE_IDS = Object.freeze({
  clickup: ['SRC-CLICKUP-001'],
  fub: ['SRC-FUB-001'],
  'google-workspace': ['SRC-GMAIL-001', 'SRC-DRIVE-001', 'SRC-GOOGLE-MEET-001'],
  slack: ['SRC-SLACK-001'],
  missive: ['SRC-MISSIVE-001'],
  'kpi-supabase': ['SRC-KPI-SUPABASE-001'],
})

function normalizeHubKey(hubKey) {
  return String(hubKey || '').trim().toLowerCase()
}

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString()
}

function unique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
}

function normalizeSourceHealthRow(row) {
  return {
    key: String(row?.key || '').trim(),
    label: String(row?.label || GROUP_LABELS[row?.key] || row?.key || '').trim(),
    status: String(row?.status || 'unknown').trim(),
    sourceIds: unique(row?.sourceIds || []),
    connectorIds: unique(row?.connectorIds || []),
    safeToUse: row?.safeToUse === true,
    readOnly: row?.readOnly !== false,
    credentialStatus: row?.credentialStatus || null,
    sanitizedError: row?.sanitizedError ? String(row.sanitizedError).slice(0, 500) : null,
    lastCheckedAt: row?.lastCheckedAt || row?.checkedAt || null,
  }
}

function makeFixtureConnectorUptime({ hubKey, now = new Date() } = {}) {
  const hub = normalizeHubKey(hubKey)
  const groups = HUB_SOURCE_HEALTH_GROUPS[hub] || []
  const rows = groups.map((key, index) => ({
    key,
    label: GROUP_LABELS[key] || key,
    status: index === 0 ? 'healthy' : 'degraded',
    reason: 'Synthetic fixture for hub sandbox work; not live source truth.',
    sourceIds: GROUP_FIXTURE_SOURCE_IDS[key] || [],
    connectorIds: [],
    safeToUse: index === 0,
    readOnly: true,
    credentialStatus: index === 0 ? 'available' : 'manual_or_unknown',
    sanitizedError: index === 0 ? null : 'Fixture degraded row for UI error-state handling.',
    lastCheckedAt: nowIso(now),
  }))

  return {
    schemaVersion: 1,
    generatedAt: nowIso(now),
    readOnly: true,
    summary: {
      total: rows.length,
      healthy: rows.filter(row => row.status === 'healthy').length,
      degraded: rows.filter(row => row.status === 'degraded').length,
      failed: rows.filter(row => row.status === 'failed').length,
      paused: 0,
      manual: rows.filter(row => row.status === 'manual').length,
    },
    rows,
  }
}

export function buildHubSourceHealthPayload({
  hubKey,
  connectorUptime = null,
  now = new Date(),
} = {}) {
  const hub = normalizeHubKey(hubKey)
  if (!HUB_SOURCE_HEALTH_GROUPS[hub]) {
    throw new Error(`Unknown hub key for source health contract: ${hubKey || 'missing'}`)
  }

  const snapshot = connectorUptime || buildConnectorUptimeSnapshot({ now })
  const allowedGroups = new Set(HUB_SOURCE_HEALTH_GROUPS[hub])
  const rows = (snapshot?.rows || [])
    .filter(row => allowedGroups.has(String(row?.key || '').trim()))
    .map(normalizeSourceHealthRow)

  const statuses = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})

  return {
    schemaVersion: 1,
    contractVersion: HUB_CONSUMER_CONTRACT_VERSION,
    hubKey: hub,
    generatedAt: nowIso(now),
    source: 'connector-uptime-monitor',
    readOnly: true,
    mutationPosture: 'read_only_contract',
    rows,
    summary: {
      total: rows.length,
      healthy: statuses.healthy || 0,
      degraded: statuses.degraded || 0,
      failed: statuses.failed || 0,
      paused: statuses.paused || 0,
      manual: statuses.manual || 0,
      unknown: statuses.unknown || 0,
    },
  }
}

export function buildHubConsumerContract({
  hubKey,
  connectorUptime = null,
  now = new Date(),
  fixture = false,
} = {}) {
  const hub = normalizeHubKey(hubKey)
  if (!HUB_SOURCE_HEALTH_GROUPS[hub]) {
    throw new Error(`Unknown hub key for consumer contract: ${hubKey || 'missing'}`)
  }

  const sourceHealth = buildHubSourceHealthPayload({
    hubKey: hub,
    connectorUptime: fixture ? makeFixtureConnectorUptime({ hubKey: hub, now }) : connectorUptime,
    now,
  })

  return {
    ok: true,
    schemaVersion: 1,
    contractVersion: HUB_CONSUMER_CONTRACT_VERSION,
    hubKey: hub,
    hubLabel: HUB_LABELS[hub],
    generatedAt: nowIso(now),
    readOnly: true,
    mutationPosture: 'read_only_contract',
    foundationAccess: {
      allowed: [
        'Read published Foundation API contracts',
        'Read hub-owned fixture payloads',
        'Request shared route/server changes through main-session integration review',
      ],
      forbidden: [
        'Import lib/foundation-db.js or live Foundation internals from hub code',
        'Mutate backlog, sprint, source registry, verifier, or process state from a hub chat',
        'Commit or push hub work without main-session review',
      ],
    },
    payloads: {
      sourceHealth,
    },
  }
}

export function buildHubConsumerFixture({ hubKey, now = new Date() } = {}) {
  return buildHubConsumerContract({ hubKey, now, fixture: true })
}

export function validateHubConsumerContractPayload(contract) {
  const failures = []
  const hub = normalizeHubKey(contract?.hubKey)
  const sourceHealth = contract?.payloads?.sourceHealth
  const rows = Array.isArray(sourceHealth?.rows) ? sourceHealth.rows : []

  if (contract?.contractVersion !== HUB_CONSUMER_CONTRACT_VERSION) {
    failures.push(`unexpected contractVersion: ${contract?.contractVersion || 'missing'}`)
  }
  if (!HUB_SOURCE_HEALTH_GROUPS[hub]) {
    failures.push(`unknown hubKey: ${contract?.hubKey || 'missing'}`)
  }
  if (contract?.readOnly !== true || contract?.mutationPosture !== 'read_only_contract') {
    failures.push('contract must be read-only')
  }
  if (!sourceHealth || sourceHealth.readOnly !== true || sourceHealth.mutationPosture !== 'read_only_contract') {
    failures.push('sourceHealth payload must be read-only')
  }
  if (!rows.length) {
    failures.push('sourceHealth rows are required')
  }
  for (const row of rows) {
    if (!row.key) failures.push('sourceHealth row is missing key')
    if (!row.status) failures.push(`sourceHealth row ${row.key || 'unknown'} is missing status`)
    if (row.readOnly !== true) failures.push(`sourceHealth row ${row.key || 'unknown'} must be read-only`)
    if (!Array.isArray(row.sourceIds)) failures.push(`sourceHealth row ${row.key || 'unknown'} must include sourceIds`)
    if (row.sanitizedError && /Bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9]/.test(row.sanitizedError)) {
      failures.push(`sourceHealth row ${row.key || 'unknown'} appears to expose a secret in sanitizedError`)
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      hubKey: hub,
      rowCount: rows.length,
      statuses: rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {}),
    },
  }
}
