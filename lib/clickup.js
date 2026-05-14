import fs from 'node:fs'

export function loadClickUpToken() {
  if (process.env.CLICKUP_PERSONAL_TOKEN) return process.env.CLICKUP_PERSONAL_TOKEN
  try {
    const cfg = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'))
    return cfg?.mcpServers?.clickup?.env?.CLICKUP_PERSONAL_TOKEN || ''
  } catch {
    return ''
  }
}

export async function clickUpGet(path) {
  return clickUpRequest('GET', path)
}

export async function clickUpRequest(method, path, body) {
  const token = loadClickUpToken()
  if (!token) throw new Error('CLICKUP_PERSONAL_TOKEN is missing')

  const options = {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  }
  if (body !== undefined) options.body = JSON.stringify(body)

  const res = await fetch(`https://api.clickup.com/api/v2${path}`, options)
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickUp ${method} ${path} returned ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

export async function clickUpPost(path, body) {
  return clickUpRequest('POST', path, body)
}

export async function setClickUpTaskCustomFieldValue(taskId, fieldId, value) {
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (!fieldId) throw new Error('ClickUp field id is required.')
  return clickUpPost(`/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, { value })
}

export async function listClickUpTasks(listId, options = {}) {
  const tasks = []
  const includeClosed = options.includeClosed === false ? 'false' : 'true'
  const subtasks = options.subtasks ? 'true' : 'false'
  for (let page = 0; page < 50; page += 1) {
    const data = await clickUpGet(`/list/${listId}/task?include_closed=${includeClosed}&page=${page}&subtasks=${subtasks}`)
    const pageTasks = data.tasks || []
    tasks.push(...pageTasks)
    if (!pageTasks.length || data.last_page) break
  }
  return tasks
}

export async function getClickUpListSnapshot(listId) {
  const [list, fieldsPayload, tasks] = await Promise.all([
    clickUpGet(`/list/${listId}`),
    clickUpGet(`/list/${listId}/field`),
    listClickUpTasks(listId),
  ])

  return {
    list,
    fields: fieldsPayload.fields || [],
    tasks,
  }
}

function sanitizeClickUpErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error || 'Unknown ClickUp error')
  return raw
    .replace(/CLICKUP_PERSONAL_TOKEN\s*=\s*[^,\s}]+/gi, 'CLICKUP_PERSONAL_TOKEN=[redacted]')
    .replace(/Authorization["':\s]+[^,\s}]+/gi, 'Authorization [redacted]')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"')
    .slice(0, 500)
}

export function buildClickUpSourceHealth({ status = 'healthy', listId = '', listName = '', error = null, checkedAt = new Date().toISOString() } = {}) {
  const degraded = status !== 'healthy'
  return {
    provider: 'clickup',
    sourceId: 'SRC-CLICKUP-001',
    connectorId: 'CONN-CLICKUP-001',
    status: degraded ? 'degraded' : 'healthy',
    reason: degraded ? 'external_api_error' : 'ok',
    checkedAt,
    listId: listId ? String(listId) : '',
    listName: listName ? String(listName) : '',
    message: degraded ? sanitizeClickUpErrorMessage(error) : '',
    failSoft: degraded,
  }
}

export function buildUnavailableClickUpListSnapshot(listId, error, options = {}) {
  const listName = options.listName || 'ClickUp list unavailable'
  const sourceHealth = buildClickUpSourceHealth({
    status: 'degraded',
    listId,
    listName,
    error,
    checkedAt: options.checkedAt || new Date().toISOString(),
  })
  return {
    list: {
      id: String(listId || ''),
      name: listName,
    },
    fields: [],
    tasks: [],
    unavailable: true,
    sourceHealth,
  }
}

export function isClickUpSnapshotDegraded(snapshot) {
  return snapshot?.unavailable === true || snapshot?.sourceHealth?.status === 'degraded'
}

export async function getClickUpListSnapshotSafe(listId, options = {}) {
  try {
    const snapshot = await getClickUpListSnapshot(listId)
    return {
      ...snapshot,
      unavailable: false,
      sourceHealth: buildClickUpSourceHealth({
        status: 'healthy',
        listId,
        listName: snapshot?.list?.name || options.listName || '',
      }),
    }
  } catch (error) {
    if (options.failSoft === false) throw error
    return buildUnavailableClickUpListSnapshot(listId, error, options)
  }
}

export function buildClickUpSourceOutageDogfoodProof() {
  const error = new Error('ClickUp GET /list/901113292355 returned 500: {"err":"Internal Server Error","ECODE":"DB_003","token":"secret"} Authorization: abc123')
  const degraded = buildUnavailableClickUpListSnapshot('901113292355', error, {
    listName: 'Agent Roster',
    checkedAt: '2026-05-14T12:00:00.000Z',
  })
  const healthy = {
    list: { id: '901113292355', name: 'Agent Roster' },
    fields: [{ name: 'Membership Status' }],
    tasks: [{ id: 'task-1', name: 'Agent One' }],
    unavailable: false,
    sourceHealth: buildClickUpSourceHealth({
      status: 'healthy',
      listId: '901113292355',
      listName: 'Agent Roster',
      checkedAt: '2026-05-14T12:00:00.000Z',
    }),
  }
  return {
    ok: isClickUpSnapshotDegraded(degraded) &&
      !isClickUpSnapshotDegraded(healthy) &&
      degraded.tasks.length === 0 &&
      degraded.fields.length === 0 &&
      degraded.sourceHealth.status === 'degraded' &&
      !JSON.stringify(degraded).includes('abc123') &&
      !JSON.stringify(degraded).includes('secret'),
    degraded,
    healthy,
    dogfoodInvariant: 'A ClickUp 500 becomes an explicit degraded source-health snapshot with empty read data and no token leakage; healthy snapshots remain healthy.',
  }
}

export function normalizeClickUpText(value) {
  return value == null ? '' : String(value).trim()
}

export function normalizeClickUpKey(value) {
  return normalizeClickUpText(value).toLowerCase().replace(/\s+/g, ' ')
}

function findClickUpOption(field, value) {
  const options = field && field.type_config && Array.isArray(field.type_config.options)
    ? field.type_config.options
    : []
  const raw = normalizeClickUpText(value)
  return options.find(option =>
    normalizeClickUpText(option.id) === raw ||
    normalizeClickUpText(option.orderindex) === raw ||
    normalizeClickUpText(option.name) === raw
  )
}

export function decodeClickUpFieldValue(field) {
  if (!field || field.value == null || field.value === '') return ''
  const value = field.value

  if (field.type === 'date') {
    const timestamp = Number(value)
    if (!Number.isFinite(timestamp)) return normalizeClickUpText(value)
    return new Date(timestamp).toISOString().slice(0, 10)
  }

  if (field.type === 'checkbox') {
    return value ? 'Yes' : 'No'
  }

  if (field.type === 'drop_down') {
    const option = findClickUpOption(field, value)
    return option ? normalizeClickUpText(option.name) : normalizeClickUpText(value)
  }

  if (field.type === 'labels' && Array.isArray(value)) {
    return value.map(item => {
      const option = findClickUpOption(field, item)
      return option ? normalizeClickUpText(option.name) : normalizeClickUpText(item)
    }).filter(Boolean).join(', ')
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object') {
        return normalizeClickUpText(item.name || item.username || item.email || item.id || JSON.stringify(item))
      }
      return normalizeClickUpText(item)
    }).filter(Boolean).join(', ')
  }

  if (value && typeof value === 'object') {
    return normalizeClickUpText(value.name || value.username || value.email || value.value || value.label || JSON.stringify(value))
  }

  return normalizeClickUpText(value)
}

export function getClickUpFieldValue(task, fieldName) {
  const field = (task.custom_fields || []).find(item => item.name === fieldName)
  return decodeClickUpFieldValue(field)
}

export function getClickUpFieldMap(task) {
  const map = new Map()
  ;(task.custom_fields || []).forEach(field => {
    map.set(field.name, decodeClickUpFieldValue(field))
  })
  return map
}
