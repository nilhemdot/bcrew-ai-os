import {
  buildClickUpSourceHealth,
  buildUnavailableClickUpListSnapshot,
  clickUpGet,
  listClickUpTasks,
  normalizeClickUpKey,
} from './clickup.js'

export const CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS = 8000
export const CLICKUP_SOURCE_VERIFY_DEFAULT_MAX_TASK_PAGES = 1

export const CLICKUP_SOURCE_VERIFY_CARD_IDS = [
  'CLICKUP-VERIFY-FAST-PATH-001',
  'CLICKUP-VERIFY-PAYLOAD-CACHE-001',
  'CLICKUP-DEGRADED-HEALTH-DOGFOOD-001',
  'FOUNDATION-VERIFY-SLOW-BUDGET-001',
]

export const CLICKUP_VERIFY_LISTS = [
  {
    key: 'dealDataEntry',
    id: process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939',
    expectedName: 'Deal Data Entry',
    role: 'Deals workflow and review follow-through',
    requiredStatuses: [],
    requiredFields: [
      '❗ Deal Status',
      'Deal #',
      'Follow Up Boss Link',
      'AIOS Admin Deal Row Link',
      'FUB Call / Review Evidence Link',
      'NPS Status',
      'Review Status',
      'Internal Onboarding Status',
      'Internal Deal Review Status',
    ],
  },
  {
    key: 'agentRoster',
    id: process.env.CLICKUP_AGENT_ROSTER_LIST_ID || '901113292355',
    expectedName: 'Agent Roster',
    role: 'Agent roster, contract link, onboarding-NPS accountability',
    requiredStatuses: [],
    requiredFields: [
      'Contract Link',
      'Recruited By',
      'Real Start Date',
      'End Date',
      'Team / Legacy Origin',
      'Onboarding NPS 30 Status',
      'Onboarding NPS 30 Score',
      'Onboarding NPS 30 Feedback',
      'Onboarding NPS 60 Status',
      'Onboarding NPS 60 Score',
      'Onboarding NPS 60 Feedback',
      'Onboarding NPS 90 Status',
      'Onboarding NPS 90 Score',
      'Onboarding NPS 90 Feedback',
    ],
    recommendedFields: [
      'Contract Status',
      'Membership Status',
      'Production Roster Status',
      'Onboarding Stage',
    ],
  },
  {
    key: 'agentPipeline',
    id: process.env.CLICKUP_AGENT_PIPELINE_LIST_ID || '901111775681',
    expectedName: 'On/Offboarding',
    role: 'Recruiting, onboarding, and offboarding pipeline',
    requiredStatuses: [
      'new agent',
      'onboarding',
      'blocked',
      'offboarding',
      '100% onboarded',
      '100% offboarded',
    ],
    requiredFields: [
      'Recruited By',
      'Real Start Date',
      'End Date',
      'Membership Status',
      'Production Roster Status',
      'Onboarding Stage',
      'Contract Status',
      'Onboarding Timeline',
      'AIOS Onboarding Feedback Link',
    ],
    recommendedFields: [],
  },
]

function normalizePositiveInteger(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback
}

export function getClickUpVerifyTimeoutMs(env = process.env) {
  return normalizePositiveInteger(env.CLICKUP_VERIFY_TIMEOUT_MS, CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS)
}

export function getClickUpVerifyMaxTaskPages(env = process.env) {
  return normalizePositiveInteger(env.CLICKUP_VERIFY_MAX_TASK_PAGES, CLICKUP_SOURCE_VERIFY_DEFAULT_MAX_TASK_PAGES)
}

export function createClickUpVerifierClient(options = {}) {
  const timeoutMs = normalizePositiveInteger(options.timeoutMs, getClickUpVerifyTimeoutMs(options.env))
  const maxTaskPages = normalizePositiveInteger(options.maxTaskPages, getClickUpVerifyMaxTaskPages(options.env))
  return {
    timeoutMs,
    maxTaskPages,
    async getList(listId) {
      return clickUpGet(`/list/${listId}`, { timeoutMs })
    },
    async getFields(listId) {
      const payload = await clickUpGet(`/list/${listId}/field`, { timeoutMs })
      return payload.fields || []
    },
    async listTasks(listId) {
      return listClickUpTasks(listId, {
        timeoutMs,
        maxPages: maxTaskPages,
        includeClosed: true,
        subtasks: false,
      })
    },
  }
}

export function createClickUpSnapshotCache(client) {
  const cache = new Map()
  return {
    async get(config) {
      const key = String(config.id || '')
      if (cache.has(key)) return cache.get(key)
      const promise = Promise.all([
        client.getList(config.id),
        client.getFields(config.id),
        client.listTasks(config.id),
      ]).then(([list, fields, tasks]) => ({
        list,
        fields: fields || [],
        tasks: tasks || [],
        unavailable: false,
        sourceHealth: buildClickUpSourceHealth({
          status: 'healthy',
          listId: config.id,
          listName: list?.name || config.expectedName,
        }),
      })).catch(error => buildUnavailableClickUpListSnapshot(config.id, error, {
        listName: config.expectedName,
      }))
      cache.set(key, promise)
      return promise
    },
    size() {
      return cache.size
    },
  }
}

function ensure(checks, condition, label, detail) {
  checks.push({ ok: Boolean(condition), label, detail })
}

export function buildClickUpListVerificationSummary(config, snapshot) {
  const fields = snapshot.fields || []
  const tasks = snapshot.tasks || []
  const list = snapshot.list || {}
  const fieldNames = new Set(fields.map(field => normalizeClickUpKey(field.name)))
  const statusNames = new Set((list.statuses || []).map(status => normalizeClickUpKey(status.status || status.name)))
  const taskStatuses = new Set(tasks.map(task => normalizeClickUpKey(task.status?.status)).filter(Boolean))
  const allStatuses = new Set([...statusNames, ...taskStatuses])
  const missingFields = config.requiredFields.filter(field => !fieldNames.has(normalizeClickUpKey(field)))
  const missingRecommendedFields = (config.recommendedFields || []).filter(field => !fieldNames.has(normalizeClickUpKey(field)))
  const missingStatuses = config.requiredStatuses.filter(status => !allStatuses.has(normalizeClickUpKey(status)))
  const checks = []

  ensure(
    checks,
    !snapshot.unavailable && normalizeClickUpKey(list.name).includes(normalizeClickUpKey(config.expectedName)),
    `ClickUp ${config.key}: expected list is reachable`,
    `${list.name || config.expectedName} (${config.id})`,
  )
  ensure(
    checks,
    !snapshot.unavailable && tasks.length > 0,
    `ClickUp ${config.key}: has tasks`,
    `${tasks.length} tasks`,
  )
  ensure(
    checks,
    !snapshot.unavailable && missingFields.length === 0,
    `ClickUp ${config.key}: required fields exist`,
    missingFields.length ? `missing ${missingFields.join(', ')}` : `${config.requiredFields.length} fields`,
  )
  ensure(
    checks,
    !snapshot.unavailable && missingStatuses.length === 0,
    `ClickUp ${config.key}: required statuses exist`,
    missingStatuses.length ? `missing ${missingStatuses.join(', ')}` : (config.requiredStatuses.length ? `${config.requiredStatuses.length} statuses` : 'status check not required'),
  )

  return {
    key: config.key,
    id: config.id,
    name: list.name || config.expectedName,
    role: config.role,
    taskCount: tasks.length,
    fieldCount: fields.length,
    missingFields,
    missingRecommendedFields,
    missingStatuses,
    unavailable: snapshot.unavailable === true,
    sourceHealth: snapshot.sourceHealth,
    checks,
  }
}

export async function runClickUpSourceVerification(options = {}) {
  const startedAt = Date.now()
  const configs = Array.isArray(options.configs) ? options.configs : CLICKUP_VERIFY_LISTS
  const client = options.client || createClickUpVerifierClient(options)
  const cache = options.cache || createClickUpSnapshotCache(client)
  const summaries = await Promise.all(configs.map(async config => {
    const snapshot = await cache.get(config)
    return buildClickUpListVerificationSummary(config, snapshot)
  }))
  const checks = summaries.flatMap(summary => summary.checks)
  const failed = checks.filter(check => !check.ok)
  const degradedRows = summaries.filter(summary => summary.sourceHealth?.status === 'degraded')
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    durationMs: Date.now() - startedAt,
    timeoutMs: Number(client.timeoutMs || options.timeoutMs || getClickUpVerifyTimeoutMs(options.env)),
    maxTaskPages: Number(client.maxTaskPages || options.maxTaskPages || getClickUpVerifyMaxTaskPages(options.env)),
    cacheSize: typeof cache.size === 'function' ? cache.size() : null,
    checks,
    failedChecks: failed,
    summaries,
    sourceHealth: {
      status: degradedRows.length ? 'degraded' : 'healthy',
      degradedCount: degradedRows.length,
      rows: summaries.map(summary => summary.sourceHealth).filter(Boolean),
    },
  }
}

export function formatClickUpSourceVerificationReport(result = {}) {
  const lines = ['ClickUp source verification']
  lines.push(`  Timeout: ${result.timeoutMs || 'unknown'}ms`)
  lines.push(`  Max task pages per list: ${result.maxTaskPages ?? 'unknown'}`)
  lines.push('')
  for (const check of result.checks || []) {
    lines.push(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  lines.push('')
  for (const summary of result.summaries || []) {
    lines.push(`${summary.key}: ${summary.name} (${summary.taskCount} tasks, ${summary.fieldCount} fields)`)
    if (summary.missingRecommendedFields.length) {
      lines.push(`${summary.key} recommended cleanup fields missing: ${summary.missingRecommendedFields.join(', ')}`)
    }
    if (summary.sourceHealth?.status === 'degraded') {
      lines.push(`${summary.key} source health: degraded -> ${summary.sourceHealth.message}`)
    }
  }
  const failed = (result.checks || []).filter(check => !check.ok)
  lines.push('')
  lines.push(`Summary: ${(result.checks || []).length - failed.length}/${(result.checks || []).length} checks passed`)
  lines.push(`CLICKUP_SOURCE_VERIFY_SUMMARY ${JSON.stringify({
    ok: result.ok === true,
    status: result.status || 'unknown',
    durationMs: result.durationMs || 0,
    timeoutMs: result.timeoutMs || null,
    maxTaskPages: result.maxTaskPages ?? null,
    cacheSize: result.cacheSize ?? null,
    sourceHealth: result.sourceHealth || null,
    summaryCount: (result.summaries || []).length,
    failedCount: failed.length,
  })}`)
  return `${lines.join('\n')}\n`
}

function buildHealthyFakePayload(config) {
  const fields = config.requiredFields.concat(config.recommendedFields || []).map(name => ({ name }))
  const statuses = (config.requiredStatuses || []).map(status => ({ status }))
  return {
    list: { id: config.id, name: config.expectedName, statuses },
    fields,
    tasks: [{ id: `${config.id}-task`, status: { status: config.requiredStatuses?.[0] || 'open' } }],
  }
}

function createDogfoodClient(mode = 'healthy') {
  const calls = []
  return {
    timeoutMs: 25,
    maxTaskPages: 1,
    calls,
    async getList(listId) {
      calls.push(`getList:${listId}`)
      if (mode === 'timeout') throw new Error(`ClickUp GET /list/${listId} timed out after 25ms Authorization: Bearer SECRET_TOKEN token=SECRET_TOKEN`)
      if (mode === 'server') {
        const error = new Error(`ClickUp GET /list/${listId} returned 500: {"err":"Internal Server Error","ECODE":"DB_003","token":"SECRET_TOKEN"}`)
        error.statusCode = 500
        throw error
      }
      if (mode === 'rateLimit') {
        const error = new Error(`ClickUp GET /list/${listId} returned 429: rate limit token=SECRET_TOKEN`)
        error.statusCode = 429
        throw error
      }
      const config = CLICKUP_VERIFY_LISTS.find(item => item.id === listId) || CLICKUP_VERIFY_LISTS[0]
      return buildHealthyFakePayload(config).list
    },
    async getFields(listId) {
      calls.push(`getFields:${listId}`)
      const config = CLICKUP_VERIFY_LISTS.find(item => item.id === listId) || CLICKUP_VERIFY_LISTS[0]
      return buildHealthyFakePayload(config).fields
    },
    async listTasks(listId) {
      calls.push(`listTasks:${listId}`)
      const config = CLICKUP_VERIFY_LISTS.find(item => item.id === listId) || CLICKUP_VERIFY_LISTS[0]
      return buildHealthyFakePayload(config).tasks
    },
  }
}

function includesSecret(value = '') {
  return /SECRET_TOKEN|Authorization: Bearer SECRET_TOKEN|token=SECRET_TOKEN|"token":"SECRET_TOKEN"/.test(String(value))
}

export async function buildClickUpSourceVerifierDogfoodProof() {
  const healthyClient = createDogfoodClient('healthy')
  const duplicateConfigs = [CLICKUP_VERIFY_LISTS[0], { ...CLICKUP_VERIFY_LISTS[0], key: 'duplicateDealDataEntry' }]
  const duplicateResult = await runClickUpSourceVerification({ client: healthyClient, configs: duplicateConfigs })

  const timeoutResult = await runClickUpSourceVerification({ client: createDogfoodClient('timeout'), configs: [CLICKUP_VERIFY_LISTS[0]] })
  const serverResult = await runClickUpSourceVerification({ client: createDogfoodClient('server'), configs: [CLICKUP_VERIFY_LISTS[0]] })
  const rateLimitResult = await runClickUpSourceVerification({ client: createDogfoodClient('rateLimit'), configs: [CLICKUP_VERIFY_LISTS[0]] })
  const timeoutReport = formatClickUpSourceVerificationReport(timeoutResult)
  const serverReport = formatClickUpSourceVerificationReport(serverResult)
  const rateLimitReport = formatClickUpSourceVerificationReport(rateLimitResult)

  const checks = [
    {
      ok: duplicateResult.ok === true && duplicateResult.cacheSize === 1 && healthyClient.calls.length === 3,
      check: 'duplicate list verification reuses one cached snapshot',
      detail: `cache=${duplicateResult.cacheSize} calls=${healthyClient.calls.length}`,
    },
    {
      ok: [timeoutResult, serverResult, rateLimitResult].every(result => result.ok === false && result.sourceHealth?.status === 'degraded'),
      check: 'timeout, 500, and 429 dogfood cases report degraded source health',
      detail: [timeoutResult, serverResult, rateLimitResult].map(result => result.sourceHealth?.status).join(', '),
    },
    {
      ok: !includesSecret(timeoutReport) && !includesSecret(serverReport) && !includesSecret(rateLimitReport),
      check: 'degraded ClickUp reports redact token-like values',
      detail: 'synthetic secret absent from public reports',
    },
    {
      ok: duplicateResult.maxTaskPages === 1 && duplicateResult.timeoutMs === 25,
      check: 'dogfood client carries bounded timeout and task-page budget',
      detail: `timeout=${duplicateResult.timeoutMs} maxTaskPages=${duplicateResult.maxTaskPages}`,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    duplicateResult,
    degradedResults: [timeoutResult, serverResult, rateLimitResult],
    dogfoodInvariant: 'ClickUp source verification uses a per-run snapshot cache, bounded reads, and explicit degraded source-health output for timeout/server/rate-limit failures.',
  }
}
