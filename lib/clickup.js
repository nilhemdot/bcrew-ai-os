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
  const token = loadClickUpToken()
  if (!token) throw new Error('CLICKUP_PERSONAL_TOKEN is missing')

  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickUp ${path} returned ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
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
