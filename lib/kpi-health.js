import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const KPI_HEALTH_CONTRACT_VERSION = 1
export const KPI_HEALTH_API_CACHE_CARD_ID = 'KPI-HEALTH-API-CACHE-001'
export const KPI_HEALTH_API_CACHE_CLOSEOUT_KEY = 'kpi-health-api-cache-v1'
export const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15'
export const KPI_HEALTH_API_CACHE_PLAN_PATH = 'docs/process/kpi-health-api-cache-001-plan.md'
export const KPI_HEALTH_API_CACHE_APPROVAL_PATH = 'docs/process/approvals/KPI-HEALTH-API-CACHE-001.json'
export const KPI_HEALTH_API_CACHE_SCRIPT_PATH = 'scripts/process-kpi-health-api-cache-check.mjs'
export const KPI_HEALTH_PRIMARY_SURFACE = 'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health'
export const KPI_HEALTH_RUNTIME_SURFACE = 'Foundation > Runtime Health, warnings only when unhealthy'
export const KPI_HEALTH_LEE_REPO_PATH = '/Users/bensoncrew/.inspection/zahnd-team-dashboard'
export const KPI_HEALTH_FETCH_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.KPI_HEALTH_FETCH_TIMEOUT_MS) || 5_000,
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const LOCAL_KPI_ENV = path.join(repoRoot, 'store', 'kpi-audit.env')
const KPI_HEALTH_ROUTE_CACHE_PATH = path.join(repoRoot, 'store', 'kpi-health-route-cache.json')
const KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS = Math.max(
  60_000,
  Number(process.env.KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS) || 6 * 60 * 60 * 1000,
)
let kpiHealthRouteMemoryCache = null
const LEE_REPO_SCAN_PATHS = [
  path.join(KPI_HEALTH_LEE_REPO_PATH, 'src'),
  path.join(KPI_HEALTH_LEE_REPO_PATH, 'supabase', 'migrations'),
]
const LEE_REPO_SCAN_EXTENSIONS = new Set(['.sql', '.ts', '.tsx'])
const FRESHNESS_CANDIDATES = [
  'updated_at',
  'lastupdatedatetime',
  'last_seen_at',
  'login_at',
  'activity_date',
  'recordcreateddate',
  'created_at',
  'createddate',
  'added_at',
  'end_date',
  'leaddate',
  'startdate',
  'date_firm_executed',
]

export const EXPECTED_KPI_TABLES = [
  {
    table: 'profiles',
    readRule: 'Identity / roster joins',
    dashboardSurface: 'Agent roster, roles, leaderboard display names, admin gates',
    freshnessWindowDays: 90,
    expectedColumns: ['id', 'user_id', 'email', 'role', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at'],
  },
  {
    table: 'users',
    readRule: 'Identity / roster joins',
    dashboardSurface: 'FUB-style numeric userid bridge for pipeline/activity joins',
    freshnessWindowDays: 120,
    expectedColumns: ['userid', 'email', 'username', 'active', 'lastupdatedatetime'],
    freshnessColumns: ['lastupdatedatetime', 'recordcreateddate', 'createddate'],
  },
  {
    table: 'persons',
    readRule: 'Pipeline / CRM lead flow',
    dashboardSurface: 'Company leads, lead source, stage, claimed-date, and pipeline math',
    freshnessWindowDays: 7,
    expectedColumns: ['personid', 'userid', 'source', 'leaddate', 'leadclaimeddate', 'currentstage', 'deleteddate', 'active', 'lastupdatedatetime'],
    freshnessColumns: ['lastupdatedatetime', 'recordcreateddate', 'leaddate'],
  },
  {
    table: 'appointments',
    readRule: 'Pipeline / CRM lead flow',
    dashboardSurface: 'Consult, discovery, signed-client, and appointment outcome math',
    freshnessWindowDays: 7,
    expectedColumns: ['appointmentid', 'userid', 'personid', 'appointmenttype', 'startdate', 'outcome', 'deleteddate', 'lastupdatedatetime'],
    freshnessColumns: ['lastupdatedatetime', 'recordcreateddate', 'startdate'],
  },
  {
    table: 'leads',
    readRule: 'Shopping List / active-opportunity hygiene',
    dashboardSurface: 'Shopping List coaching, score, action plan, active opportunity hygiene',
    freshnessWindowDays: 14,
    expectedColumns: ['id', 'user_email', 'client_name_address', 'score', 'action_plan', 'first_day_active', 'updated_at', 'status', 'signed'],
    freshnessColumns: ['updated_at', 'created_at', 'first_day_active'],
  },
  {
    table: 'deal_data',
    readRule: 'Executed deals / finance',
    dashboardSurface: 'Executed deals, volume credit, GCI, net to team, deposit/closing timing',
    freshnessWindowDays: 14,
    expectedColumns: ['id', 'deal_number', 'deal_status', 'date_firm_executed', 'gross_commission', 'net_to_team', 'agent_email', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at', 'date_firm_executed'],
  },
  {
    table: 'goals',
    readRule: 'Goals / target pacing',
    dashboardSurface: 'Agent target math and pipeline timing',
    freshnessWindowDays: 370,
    expectedColumns: ['id', 'user_id', 'year', 'maintenance_income', 'growth_income', 'days_to_set_appointment', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at'],
  },
  {
    table: 'company_goals',
    readRule: 'Goals / target pacing',
    dashboardSurface: 'Company target pacing and leadership dashboard math',
    freshnessWindowDays: 370,
    expectedColumns: ['id', 'year', 'company_name', 'target_total_agents', 'target_active_agents', 'target_total_deals', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at'],
  },
  {
    table: 'expansion_goals',
    readRule: 'Goals / target pacing',
    dashboardSurface: 'Expansion planning and revenue-share target math',
    freshnessWindowDays: 370,
    expectedColumns: ['id', 'user_id', 'year', 'maintain_expand', 'grow_expand', 'freedom_expand', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at'],
  },
  {
    table: 'users_activity',
    readRule: 'Usage / adoption',
    dashboardSurface: 'App engagement and last-seen status',
    freshnessWindowDays: 7,
    expectedColumns: ['id', 'user_id', 'email', 'login_at', 'last_seen_at'],
    freshnessColumns: ['last_seen_at', 'login_at'],
  },
  {
    table: 'admin_user_activity_reports',
    readRule: 'Usage / adoption',
    dashboardSurface: 'Admin usage report export and adoption monitoring',
    freshnessWindowDays: 14,
    expectedColumns: ['email', 'activity_date', 'session_count', 'total_minutes_spent', 'first_login', 'last_active'],
    freshnessColumns: ['activity_date'],
  },
  {
    table: 'leaderboard_challenges',
    readRule: 'Competition / MQY',
    dashboardSurface: 'MQY challenge windows and active challenge state',
    freshnessWindowDays: 180,
    expectedColumns: ['id', 'name', 'start_date', 'end_date', 'status', 'updated_at'],
    freshnessColumns: ['updated_at', 'end_date', 'created_at'],
  },
  {
    table: 'leaderboard_teams',
    readRule: 'Competition / MQY',
    dashboardSurface: 'MQY team setup for challenge leaderboards',
    freshnessWindowDays: 180,
    expectedColumns: ['id', 'challenge_id', 'team_name', 'team_manager', 'created_at'],
    freshnessColumns: ['created_at'],
  },
  {
    table: 'leaderboard_team_members',
    readRule: 'Competition / MQY',
    dashboardSurface: 'MQY team membership for challenge leaderboards',
    freshnessWindowDays: 180,
    expectedColumns: ['id', 'team_id', 'agent_email', 'agent_name', 'added_at'],
    freshnessColumns: ['added_at'],
  },
]

export const EXPECTED_KPI_RPCS = [
  {
    rpc: 'get_company_dashboard_stats',
    readRule: 'Company dashboard pacing',
    dashboardSurface: 'Company-wide YTD dashboard tiles and pacing math',
    params: {
      target_year: 2026,
      leads_start: '2026-01-01',
      leads_end: '2026-12-31',
      consults_set_start: '2026-01-01',
      consults_set_end: '2026-12-31',
      consults_held_start: '2026-01-01',
      consults_held_end: '2026-12-31',
      clients_signed_start: '2026-01-01',
      clients_signed_end: '2026-12-31',
    },
    expectedColumns: ['ytd_leads', 'ytd_consults_set', 'ytd_consults_held', 'ytd_clients_represented', 'ytd_deals_executed', 'ytd_volume', 'ytd_gci_income', 'ytd_net_to_team'],
  },
  {
    rpc: 'get_company_leads',
    readRule: 'Company pipeline / appointments',
    dashboardSurface: 'Company lead table and pipeline review',
    params: {
      leads_start: '2026-01-01',
      leads_end: '2026-12-31',
    },
    expectedColumns: ['personid', 'userid', 'source', 'leaddate', 'leadclaimeddate', 'currentstage', 'lastupdatedatetime'],
  },
  {
    rpc: 'get_company_appointments',
    readRule: 'Company pipeline / appointments',
    dashboardSurface: 'Company appointments table and consult/signed-client review',
    params: {
      range_start: '2026-01-01',
      range_end: '2026-12-31',
    },
    expectedColumns: ['appointmentid', 'personid', 'userid', 'appointmenttype', 'agent_name', 'lead_name', 'lead_source'],
  },
  {
    rpc: 'get_team_mqy_build_metrics',
    readRule: 'Competition / MQY',
    dashboardSurface: 'MQY Builder leaderboard',
    params: {
      p_start_date: '2026-01-01',
      p_end_date: '2026-12-31',
    },
    expectedColumns: ['profile_id', 'email', 'dis_set', 'consult_set', 'call_attempts', 'convos', 'score'],
  },
  {
    rpc: 'get_team_mqy_perform_metrics',
    readRule: 'Competition / MQY',
    dashboardSurface: 'MQY Performer leaderboard',
    params: {
      p_start_date: '2026-01-01',
      p_end_date: '2026-12-31',
    },
    expectedColumns: ['profile_id', 'agent_email', 'deals_firm', 'client_signed', 'discovery_won', 'gci_generated', 'volume_executed'],
  },
]

let leeRepoCache = null

export function loadKpiLocalEnv() {
  if (!fs.existsSync(LOCAL_KPI_ENV)) return false
  const lines = fs.readFileSync(LOCAL_KPI_ENV, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key]) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
  return true
}

export function normalizeKpiSupabaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('SUPABASE_URL is required for KPI health.')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(raw)) {
    throw new Error('SUPABASE_URL must be a Supabase project URL.')
  }
  return raw
}

export function getKpiCredential() {
  const credential = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.KPI_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.KPI_SUPABASE_ANON_KEY ||
      '',
  ).trim()
  if (!credential) {
    throw new Error('A Supabase service-role or anon key is required for KPI health.')
  }
  return credential
}

function parseTotal(contentRange) {
  const raw = String(contentRange || '')
  const match = raw.match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

function parseTimestamp(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function timestampAgeDays(value, now = new Date()) {
  const parsed = parseTimestamp(value)
  if (!parsed) return null
  return Math.max(0, (now.getTime() - parsed.getTime()) / 86400000)
}

function getPresentFreshnessColumn(sampleRow, configuredColumns) {
  const presentColumns = new Set(Object.keys(sampleRow || {}))
  return (configuredColumns || FRESHNESS_CANDIDATES).find(column => presentColumns.has(column)) || null
}

function makeSupabaseHeaders(credential, extra = {}) {
  return {
    apikey: credential,
    Authorization: `Bearer ${credential}`,
    ...extra,
  }
}

async function fetchSupabaseJson(url, credential, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = KPI_HEALTH_FETCH_TIMEOUT_MS,
    signal: parentSignal = null,
    headers = {},
    ...fetchOptions
  } = options
  const controller = new AbortController()
  let timeoutId = null
  const normalizedTimeoutMs = Math.max(1, Number(timeoutMs) || KPI_HEALTH_FETCH_TIMEOUT_MS)
  const abortFromParent = () => {
    const reason = parentSignal?.reason || new Error('KPI health probe aborted by parent signal.')
    controller.abort(reason)
  }
  if (parentSignal?.aborted) {
    abortFromParent()
  } else if (parentSignal?.addEventListener) {
    parentSignal.addEventListener('abort', abortFromParent, { once: true })
  }

  timeoutId = setTimeout(() => {
    controller.abort(new Error(`KPI health probe timed out after ${normalizedTimeoutMs}ms.`))
  }, normalizedTimeoutMs)

  try {
    const response = await fetchImpl(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: makeSupabaseHeaders(credential, headers),
    })
    const text = await response.text()
    let json = null
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }
    }
    if (!response.ok) {
      const message = json?.message || json?.error || text || `${response.status} ${response.statusText}`
      throw new Error(message)
    }
    return {
      response,
      data: json,
    }
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason
      throw new Error(reason instanceof Error ? reason.message : `KPI health probe timed out after ${normalizedTimeoutMs}ms.`)
    }
    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    if (parentSignal?.removeEventListener) parentSignal.removeEventListener('abort', abortFromParent)
  }
}

export async function buildKpiHealthApiCacheDogfoodProof() {
  const successfulFetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify([{ id: 1 }]),
  })
  const success = await fetchSupabaseJson(
    'https://dogfood.supabase.co/rest/v1/profiles?select=*&limit=1',
    'dogfood-token',
    { fetchImpl: successfulFetch, timeoutMs: 100 },
  )

  let timeoutError = null
  let abortObserved = false
  const slowFetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    const signal = options.signal
    if (signal?.aborted) {
      abortObserved = true
      reject(signal.reason || new Error('aborted'))
      return
    }
    signal?.addEventListener('abort', () => {
      abortObserved = true
      reject(signal.reason || new Error('aborted'))
    }, { once: true })
  })
  const started = Date.now()
  try {
    await fetchSupabaseJson(
      'https://dogfood.supabase.co/rest/v1/profiles?select=*&limit=1',
      'dogfood-token',
      { fetchImpl: slowFetch, timeoutMs: 5 },
    )
  } catch (error) {
    timeoutError = error
  }
  const elapsedMs = Date.now() - started

  return {
    ok: Array.isArray(success.data) &&
      success.data.length === 1 &&
      abortObserved === true &&
      timeoutError instanceof Error &&
      /timed out after 5ms/.test(timeoutError.message) &&
      elapsedMs < 500,
    success: {
      ok: Array.isArray(success.data),
      rowCount: Array.isArray(success.data) ? success.data.length : 0,
    },
    timeout: {
      abortObserved,
      elapsedMs,
      errorMessage: timeoutError instanceof Error ? timeoutError.message : null,
    },
    dogfoodInvariant: 'KPI Supabase probe calls use an AbortSignal timeout; slow providers fail quickly as degraded health instead of hanging request paths.',
  }
}

async function probeTable(baseUrl, credential, definition, now) {
  const encodedTable = encodeURIComponent(definition.table)
  const sampleUrl = `${baseUrl}/rest/v1/${encodedTable}?select=*&limit=1`
  const sampleResult = await fetchSupabaseJson(sampleUrl, credential, {
    headers: {
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  const sampleRows = Array.isArray(sampleResult.data) ? sampleResult.data : []
  const sampleRow = sampleRows[0] || {}
  const columns = Object.keys(sampleRow)
  const missingColumns = definition.expectedColumns.filter(column => !columns.includes(column))
  const freshnessColumn = getPresentFreshnessColumn(sampleRow, definition.freshnessColumns)
  let latestValue = null
  let latestAgeDays = null
  let freshnessStatus = 'unknown'
  let freshnessFinding = freshnessColumn ? null : 'no_freshness_column'

  if (freshnessColumn) {
    const latestUrl = `${baseUrl}/rest/v1/${encodedTable}?select=${encodeURIComponent(freshnessColumn)}&${encodeURIComponent(freshnessColumn)}=not.is.null&order=${encodeURIComponent(freshnessColumn)}.desc&limit=1`
    const latestResult = await fetchSupabaseJson(latestUrl, credential)
    const latestRows = Array.isArray(latestResult.data) ? latestResult.data : []
    latestValue = latestRows[0]?.[freshnessColumn] ?? null
    latestAgeDays = timestampAgeDays(latestValue, now)
    if (latestAgeDays == null) {
      freshnessStatus = 'unknown'
      freshnessFinding = 'latest_freshness_value_unparseable'
    } else if (latestAgeDays > definition.freshnessWindowDays) {
      freshnessStatus = 'stale'
      freshnessFinding = `latest ${freshnessColumn} is ${latestAgeDays.toFixed(1)} days old; window is ${definition.freshnessWindowDays} days`
    } else {
      freshnessStatus = 'fresh'
    }
  }

  return {
    table: definition.table,
    readRule: definition.readRule,
    dashboardSurface: definition.dashboardSurface,
    status: missingColumns.length ? 'risk' : freshnessStatus === 'stale' ? 'warning' : 'healthy',
    rowCount: parseTotal(sampleResult.response.headers.get('content-range')),
    expectedColumns: definition.expectedColumns,
    observedColumns: columns,
    missingColumns,
    freshnessWindowDays: definition.freshnessWindowDays,
    freshnessColumn,
    latestValue,
    latestAgeDays,
    freshnessStatus,
    freshnessFinding,
  }
}

async function probeRpc(baseUrl, credential, definition) {
  const rpcUrl = `${baseUrl}/rest/v1/rpc/${encodeURIComponent(definition.rpc)}?select=*&limit=1`
  const result = await fetchSupabaseJson(rpcUrl, credential, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
    body: JSON.stringify(definition.params),
  })
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
  const firstRow = rows[0] || {}
  const columns = Object.keys(firstRow)
  const missingColumns = definition.expectedColumns.filter(column => !columns.includes(column))
  return {
    rpc: definition.rpc,
    readRule: definition.readRule,
    dashboardSurface: definition.dashboardSurface,
    status: missingColumns.length ? 'risk' : 'healthy',
    params: definition.params,
    expectedColumns: definition.expectedColumns,
    observedColumns: columns,
    missingColumns,
    rowCount: parseTotal(result.response.headers.get('content-range')),
  }
}

function walkTextFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      walkTextFiles(fullPath, files)
    } else if (LEE_REPO_SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

function getLeeRepoIndex() {
  const now = Date.now()
  if (leeRepoCache && now - leeRepoCache.createdAtMs < 60000) return leeRepoCache

  const files = []
  for (const scanPath of LEE_REPO_SCAN_PATHS) {
    walkTextFiles(scanPath, files)
  }
  const text = files.map(file => {
    try {
      return fs.readFileSync(file, 'utf8')
    } catch {
      return ''
    }
  }).join('\n')
  leeRepoCache = {
    createdAtMs: now,
    exists: fs.existsSync(KPI_HEALTH_LEE_REPO_PATH),
    filesScanned: files.length,
    text,
  }
  return leeRepoCache
}

function hasLeeRepoNeedle(indexText, kind, name) {
  if (!indexText) return false
  if (kind === 'table') {
    return indexText.includes(`from('${name}'`) ||
      indexText.includes(`from("${name}"`) ||
      indexText.includes(`${name}: {`) ||
      indexText.includes(`TABLE ${name}`) ||
      indexText.includes(`TABLE public.${name}`)
  }
  return indexText.includes(`rpc('${name}'`) ||
    indexText.includes(`rpc("${name}"`) ||
    indexText.includes(`FUNCTION ${name}`) ||
    indexText.includes(`FUNCTION public.${name}`) ||
    indexText.includes(`${name}: {`)
}

function buildLeeRepoEvidence() {
  const index = getLeeRepoIndex()
  const tableReferences = EXPECTED_KPI_TABLES.map(definition => ({
    table: definition.table,
    present: hasLeeRepoNeedle(index.text, 'table', definition.table),
  }))
  const rpcReferences = EXPECTED_KPI_RPCS.map(definition => ({
    rpc: definition.rpc,
    present: hasLeeRepoNeedle(index.text, 'rpc', definition.rpc),
  }))
  const missingReferences = [
    ...tableReferences.filter(item => !item.present).map(item => `table:${item.table}`),
    ...rpcReferences.filter(item => !item.present).map(item => `rpc:${item.rpc}`),
  ]
  return {
    repoPath: KPI_HEALTH_LEE_REPO_PATH,
    exists: index.exists,
    filesScanned: index.filesScanned,
    tableReferences,
    rpcReferences,
    missingReferences,
    status: index.exists && missingReferences.length === 0 ? 'healthy' : 'risk',
  }
}

function summarizeKpiHealth({ tables, rpcs, leeRepo }) {
  const tableRisks = tables.filter(item => item.status === 'risk')
  const tableWarnings = tables.filter(item => item.status === 'warning' || item.freshnessStatus === 'unknown')
  const rpcRisks = rpcs.filter(item => item.status === 'risk')
  const staleTables = tables.filter(item => item.freshnessStatus === 'stale')
  const riskFindings = [
    ...tableRisks.map(item => `${item.table}: missing ${item.missingColumns.join(', ')}`),
    ...rpcRisks.map(item => `${item.rpc}: missing ${item.missingColumns.join(', ')}`),
    ...(leeRepo.status === 'risk' ? leeRepo.missingReferences.map(item => `Lee repo missing ${item}`) : []),
  ]
  const warningFindings = [
    ...staleTables.map(item => `${item.table}: ${item.freshnessFinding}`),
    ...tableWarnings
      .filter(item => item.freshnessStatus === 'unknown')
      .map(item => `${item.table}: ${item.freshnessFinding || 'freshness unknown'}`),
  ]
  const status = riskFindings.length ? 'risk' : warningFindings.length ? 'warning' : 'healthy'
  return {
    status,
    tableCount: tables.length,
    rpcCount: rpcs.length,
    healthyTables: tables.filter(item => item.status === 'healthy').length,
    staleTables: staleTables.length,
    tablesWithUnknownFreshness: tables.filter(item => item.freshnessStatus === 'unknown').length,
    healthyRpcs: rpcs.filter(item => item.status === 'healthy').length,
    riskFindings,
    warningFindings,
    probeSilent: tables.length === 0 || rpcs.length === 0,
  }
}

function buildFailureTableResult(definition, error) {
  return {
    table: definition.table,
    readRule: definition.readRule,
    dashboardSurface: definition.dashboardSurface,
    status: 'risk',
    rowCount: null,
    expectedColumns: definition.expectedColumns,
    observedColumns: [],
    missingColumns: definition.expectedColumns,
    freshnessWindowDays: definition.freshnessWindowDays,
    freshnessColumn: null,
    latestValue: null,
    latestAgeDays: null,
    freshnessStatus: 'unknown',
    freshnessFinding: error instanceof Error ? error.message : String(error || 'table probe failed'),
  }
}

function buildFailureRpcResult(definition, error) {
  return {
    rpc: definition.rpc,
    readRule: definition.readRule,
    dashboardSurface: definition.dashboardSurface,
    status: 'risk',
    params: definition.params,
    expectedColumns: definition.expectedColumns,
    observedColumns: [],
    missingColumns: definition.expectedColumns,
    rowCount: null,
    error: error instanceof Error ? error.message : String(error || 'rpc probe failed'),
  }
}

export async function getKpiHealthSnapshot(options = {}) {
  const loadedLocalEnv = loadKpiLocalEnv()
  const baseUrl = normalizeKpiSupabaseUrl(process.env.SUPABASE_URL || process.env.KPI_SUPABASE_URL)
  const credential = getKpiCredential()
  const now = options.now instanceof Date ? options.now : new Date()
  const host = new URL(baseUrl).host

  const tables = []
  for (const definition of EXPECTED_KPI_TABLES) {
    try {
      tables.push(await probeTable(baseUrl, credential, definition, now))
    } catch (error) {
      tables.push(buildFailureTableResult(definition, error))
    }
  }

  const rpcs = []
  for (const definition of EXPECTED_KPI_RPCS) {
    try {
      rpcs.push(await probeRpc(baseUrl, credential, definition))
    } catch (error) {
      rpcs.push(buildFailureRpcResult(definition, error))
    }
  }

  const leeRepo = buildLeeRepoEvidence()
  const summary = summarizeKpiHealth({ tables, rpcs, leeRepo })

  return {
    contractVersion: KPI_HEALTH_CONTRACT_VERSION,
    generatedAt: now.toISOString(),
    projectHost: host,
    loadedLocalEnv,
    primarySurface: KPI_HEALTH_PRIMARY_SURFACE,
    runtimeSurface: KPI_HEALTH_RUNTIME_SURFACE,
    summary,
    readRules: [
      'Identity / roster joins',
      'Pipeline / CRM lead flow',
      'Shopping List / active-opportunity hygiene',
      'Executed deals / finance',
      'Goals / target pacing',
      'Company dashboard pacing',
      'Company pipeline / appointments',
      'Competition / MQY',
      'Usage / adoption',
    ],
    freshnessWindows: EXPECTED_KPI_TABLES.map(item => ({
      table: item.table,
      readRule: item.readRule,
      freshnessWindowDays: item.freshnessWindowDays,
      columns: item.freshnessColumns,
    })),
    tables,
    rpcs,
    leeRepo,
    schemaDrift: {
      status: summary.riskFindings.length || leeRepo.status === 'risk' ? 'risk' : 'healthy',
      liveMissingColumns: tables
        .filter(item => item.missingColumns.length)
        .map(item => ({ table: item.table, missingColumns: item.missingColumns })),
      liveRpcFailures: rpcs
        .filter(item => item.status === 'risk')
        .map(item => ({ rpc: item.rpc, missingColumns: item.missingColumns, error: item.error || null })),
      leeMissingReferences: leeRepo.missingReferences,
    },
  }
}

export async function getSafeKpiHealthSnapshot() {
  try {
    return await getKpiHealthSnapshot()
  } catch (error) {
    return {
      contractVersion: KPI_HEALTH_CONTRACT_VERSION,
      generatedAt: new Date().toISOString(),
      projectHost: null,
      loadedLocalEnv: false,
      primarySurface: KPI_HEALTH_PRIMARY_SURFACE,
      runtimeSurface: KPI_HEALTH_RUNTIME_SURFACE,
      summary: {
        status: 'risk',
        tableCount: EXPECTED_KPI_TABLES.length,
        rpcCount: EXPECTED_KPI_RPCS.length,
        healthyTables: 0,
        staleTables: 0,
        tablesWithUnknownFreshness: EXPECTED_KPI_TABLES.length,
        healthyRpcs: 0,
        riskFindings: [error instanceof Error ? error.message : 'KPI health probe failed'],
        warningFindings: [],
        probeSilent: true,
      },
      readRules: [],
      freshnessWindows: [],
      tables: [],
      rpcs: [],
      leeRepo: {
        repoPath: KPI_HEALTH_LEE_REPO_PATH,
        exists: fs.existsSync(KPI_HEALTH_LEE_REPO_PATH),
        filesScanned: 0,
        tableReferences: [],
        rpcReferences: [],
        missingReferences: [],
        status: 'risk',
      },
      schemaDrift: {
        status: 'risk',
        liveMissingColumns: [],
        liveRpcFailures: [],
        leeMissingReferences: [],
      },
    }
  }
}

function buildKpiHealthRouteCacheMetadata({ generatedAt, cacheStatus, cacheAgeMs, cachePath = KPI_HEALTH_ROUTE_CACHE_PATH } = {}) {
  return {
    cacheStatus,
    cacheAgeMs: Number.isFinite(Number(cacheAgeMs)) ? Number(cacheAgeMs) : null,
    maxAgeMs: KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS,
    cachePath: path.relative(repoRoot, cachePath),
    generatedAt: generatedAt || null,
  }
}

function isUsableKpiHealthSnapshot(snapshot, nowMs = Date.now()) {
  if (!snapshot || typeof snapshot !== 'object') return false
  if (Number(snapshot.contractVersion) !== KPI_HEALTH_CONTRACT_VERSION) return false
  if (snapshot.primarySurface !== KPI_HEALTH_PRIMARY_SURFACE) return false
  const generatedMs = new Date(snapshot.generatedAt || '').getTime()
  if (Number.isNaN(generatedMs)) return false
  return nowMs - generatedMs <= KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS
}

function readPersistedKpiHealthRouteCache(nowMs = Date.now()) {
  try {
    const parsed = JSON.parse(fs.readFileSync(KPI_HEALTH_ROUTE_CACHE_PATH, 'utf8'))
    const snapshot = parsed?.snapshot && typeof parsed.snapshot === 'object' ? parsed.snapshot : parsed
    if (!isUsableKpiHealthSnapshot(snapshot, nowMs)) return null
    return snapshot
  } catch {
    return null
  }
}

function writePersistedKpiHealthRouteCache(snapshot) {
  try {
    fs.mkdirSync(path.dirname(KPI_HEALTH_ROUTE_CACHE_PATH), { recursive: true })
    fs.writeFileSync(
      KPI_HEALTH_ROUTE_CACHE_PATH,
      JSON.stringify({
        schemaVersion: 1,
        writtenAt: new Date().toISOString(),
        maxAgeMs: KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS,
        snapshot,
      }, null, 2)
    )
  } catch {
    // Route cache is an optimization only. Failing to write it must not break source truth.
  }
}

function withKpiHealthRouteCacheMetadata(snapshot, { cacheStatus, nowMs = Date.now() } = {}) {
  const generatedMs = new Date(snapshot?.generatedAt || '').getTime()
  const cacheAgeMs = Number.isNaN(generatedMs) ? null : Math.max(0, nowMs - generatedMs)
  return {
    ...snapshot,
    routeCache: buildKpiHealthRouteCacheMetadata({
      generatedAt: snapshot?.generatedAt,
      cacheStatus,
      cacheAgeMs,
    }),
  }
}

export async function refreshKpiHealthRouteCache() {
  const snapshot = await getSafeKpiHealthSnapshot()
  kpiHealthRouteMemoryCache = snapshot
  writePersistedKpiHealthRouteCache(snapshot)
  return withKpiHealthRouteCacheMetadata(snapshot, { cacheStatus: 'refreshed' })
}

export async function getCachedSafeKpiHealthSnapshot({ forceRefresh = false } = {}) {
  const nowMs = Date.now()
  if (!forceRefresh && isUsableKpiHealthSnapshot(kpiHealthRouteMemoryCache, nowMs)) {
    return withKpiHealthRouteCacheMetadata(kpiHealthRouteMemoryCache, { cacheStatus: 'memory', nowMs })
  }

  if (!forceRefresh) {
    const persisted = readPersistedKpiHealthRouteCache(nowMs)
    if (persisted) {
      kpiHealthRouteMemoryCache = persisted
      return withKpiHealthRouteCacheMetadata(persisted, { cacheStatus: 'persisted', nowMs })
    }
  }

  return refreshKpiHealthRouteCache()
}
