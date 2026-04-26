#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'

const CLICKUP_LISTS = [
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
    requiredStatuses: ['active agent', 'non-producing agent', 'onboarding', 'offboarding'],
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
    id: process.env.CLICKUP_AGENT_PIPELINE_LIST_ID || '901113487352',
    expectedName: 'Agent Onboarding',
    role: 'Recruiting, onboarding, and offboarding pipeline',
    requiredStatuses: [],
    requiredFields: [
      'Onboarding/Offboarding Status',
      'Onboarding Start Date',
      'Recruited By',
      'Real Start Date',
      'End Date',
      'Membership Status',
      'Production Roster Status',
      'Onboarding Stage',
      'Contract Status',
    ],
    recommendedFields: [],
  },
]

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
}

function loadClickUpToken() {
  if (process.env.CLICKUP_PERSONAL_TOKEN) return process.env.CLICKUP_PERSONAL_TOKEN
  try {
    const cfg = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'))
    return cfg?.mcpServers?.clickup?.env?.CLICKUP_PERSONAL_TOKEN || ''
  } catch {
    return ''
  }
}

async function clickUpGet(path) {
  const token = loadClickUpToken()
  if (!token) throw new Error('CLICKUP_PERSONAL_TOKEN is missing')
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickUp ${path} returned ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function listClickUpTasks(listId) {
  const tasks = []
  for (let page = 0; page < 50; page += 1) {
    const data = await clickUpGet(`/list/${listId}/task?include_closed=true&page=${page}&subtasks=false`)
    const pageTasks = data.tasks || []
    tasks.push(...pageTasks)
    if (!pageTasks.length || data.last_page) break
  }
  return tasks
}

function pass(label, detail = '') {
  console.log(`PASS ${label}${detail ? ` -> ${detail}` : ''}`)
}

function fail(label, detail = '') {
  console.error(`FAIL ${label}${detail ? ` -> ${detail}` : ''}`)
}

function ensure(checks, condition, label, detail) {
  checks.push({ ok: Boolean(condition), label, detail })
}

async function verifyList(config, checks) {
  const [list, fieldsPayload, tasks] = await Promise.all([
    clickUpGet(`/list/${config.id}`),
    clickUpGet(`/list/${config.id}/field`),
    listClickUpTasks(config.id),
  ])
  const fields = fieldsPayload.fields || []
  const fieldNames = new Set(fields.map(field => normalizeKey(field.name)))
  const statusNames = new Set((list.statuses || []).map(status => normalizeKey(status.status || status.name)))
  const taskStatuses = new Set(tasks.map(task => normalizeKey(task.status?.status)).filter(Boolean))
  const allStatuses = new Set([...statusNames, ...taskStatuses])
  const missingFields = config.requiredFields.filter(field => !fieldNames.has(normalizeKey(field)))
  const missingRecommendedFields = (config.recommendedFields || []).filter(field => !fieldNames.has(normalizeKey(field)))
  const missingStatuses = config.requiredStatuses.filter(status => !allStatuses.has(normalizeKey(status)))

  ensure(
    checks,
    normalizeKey(list.name).includes(normalizeKey(config.expectedName)),
    `ClickUp ${config.key}: expected list is reachable`,
    `${list.name} (${config.id})`,
  )
  ensure(
    checks,
    tasks.length > 0,
    `ClickUp ${config.key}: has tasks`,
    `${tasks.length} tasks`,
  )
  ensure(
    checks,
    missingFields.length === 0,
    `ClickUp ${config.key}: required fields exist`,
    missingFields.length ? `missing ${missingFields.join(', ')}` : `${config.requiredFields.length} fields`,
  )
  ensure(
    checks,
    missingStatuses.length === 0,
    `ClickUp ${config.key}: required statuses exist`,
    missingStatuses.length ? `missing ${missingStatuses.join(', ')}` : (config.requiredStatuses.length ? `${config.requiredStatuses.length} statuses` : 'status check not required'),
  )

  return {
    key: config.key,
    id: config.id,
    name: list.name,
    role: config.role,
    taskCount: tasks.length,
    fieldCount: fields.length,
    missingFields,
    missingRecommendedFields,
    missingStatuses,
  }
}

async function main() {
  const checks = []
  console.log('ClickUp source verification')
  const summaries = []

  for (const config of CLICKUP_LISTS) {
    summaries.push(await verifyList(config, checks))
  }

  console.log('')
  checks.forEach(check => {
    if (check.ok) pass(check.label, check.detail)
    else fail(check.label, check.detail)
  })

  console.log('')
  summaries.forEach(summary => {
    console.log(`${summary.key}: ${summary.name} (${summary.taskCount} tasks, ${summary.fieldCount} fields)`)
    if (summary.missingRecommendedFields.length) {
      console.log(`${summary.key} recommended cleanup fields missing: ${summary.missingRecommendedFields.join(', ')}`)
    }
  })

  const failed = checks.filter(check => !check.ok)
  console.log('')
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error('ClickUp source verification failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
