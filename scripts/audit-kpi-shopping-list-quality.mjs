#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'
import { closeFoundationDb } from '../lib/foundation-db-session.js'

const LOCAL_KPI_ENV = 'store/kpi-audit.env'
const PAGE_SIZE = 1000

const SCORE_EXPECTED_DAYS = new Map([
  [10, 15],
  [9, 30],
  [8, 45],
  [7, 60],
  [6, 90],
  [5, 180],
  [4, 365],
])

function parseArgs(argv) {
  const args = {}
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const [key, value] = raw.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function loadLocalEnv(path) {
  if (!fs.existsSync(path)) return false
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
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

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeKey(value) {
  return normalizeLower(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function getRequiredEnv(name) {
  const value = normalizeText(process.env[name])
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function supabaseBaseUrl() {
  return getRequiredEnv('SUPABASE_URL').replace(/\/+$/, '')
}

function supabaseKey() {
  return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

function countFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function supabaseGetAll(path, options = {}) {
  const key = supabaseKey()
  const rows = []
  let total = null
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        Prefer: options.count ? 'count=exact' : undefined,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    })
    const text = await response.text()
    if (!response.ok) {
      let message = text
      try {
        const parsed = JSON.parse(text)
        message = parsed.message || parsed.error || text
      } catch {
        // Keep raw response text.
      }
      throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
    }
    if (total == null) total = countFromContentRange(response.headers.get('content-range'))
    const pageRows = text ? JSON.parse(text) : []
    rows.push(...pageRows)
    if (pageRows.length < PAGE_SIZE) break
    if (total != null && rows.length >= total) break
  }
  return { rows, total: total ?? rows.length }
}

function parseDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function compactDate(value) {
  const date = parseDate(value)
  return date ? date.toISOString().slice(0, 10) : ''
}

function daysOld(value, now = new Date()) {
  const date = parseDate(value)
  if (!date) return null
  return Math.floor((now.getTime() - date.getTime()) / 86400000)
}

function isActive(row) {
  return normalizeLower(row.status) === 'active'
}

function isClosed(row) {
  return normalizeLower(row.status) === 'closed'
}

function isExecuted(row) {
  return normalizeLower(row.execution_status) === 'executed'
}

function isFellThrough(row) {
  return normalizeLower(row.execution_status) === 'fell_through'
}

function isBlankActionPlan(row) {
  return !normalizeText(row.action_plan)
}

function scoreNumber(row) {
  const score = Number(row.score)
  return Number.isFinite(score) ? score : null
}

function isHighScore(row) {
  const score = scoreNumber(row)
  return score != null && score >= 7
}

function isStaleHighScore(row, now) {
  if (!isActive(row) || !isHighScore(row)) return false
  const age = daysOld(row.updated_at, now)
  return age != null && age > 60
}

function scoreWindowExpired(row, now) {
  if (!isActive(row)) return false
  const score = scoreNumber(row)
  if (score == null) return false
  const expectedDays = SCORE_EXPECTED_DAYS.get(score)
  if (!expectedDays) return false
  const age = daysOld(row.updated_at, now)
  return age != null && age > expectedDays
}

function hasMissingEstimatedEconomics(row) {
  if (!isActive(row)) return false
  return (
    row.estimated_sale_price == null ||
    row.estimated_commission_percent == null ||
    row.estimated_split == null
  )
}

function hasClosedExecutionDrift(row) {
  if (!isClosed(row)) return false
  const execution = normalizeLower(row.execution_status)
  if (!execution) return true
  if (execution === 'executed') {
    return !parseDate(row.date_executed) || row.final_price == null || row.final_commission_percent == null
  }
  if (execution === 'fell_through') return false
  return true
}

function activeDuplicateKey(row) {
  if (!isActive(row)) return ''
  const client = normalizeKey(row.client_name_address)
  if (!client) return ''
  return `${normalizeText(row.user_id) || normalizeLower(row.user_email) || 'unknown'}:${client}`
}

function buildDuplicateClusters(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = activeDuplicateKey(row)
    if (!key) continue
    const list = groups.get(key) || []
    list.push(row)
    groups.set(key, list)
  }
  return Array.from(groups.values())
    .filter(list => list.length >= 2)
    .map(list => ({
      userId: normalizeText(list[0].user_id) || null,
      userEmail: normalizeLower(list[0].user_email) || null,
      clientKey: normalizeKey(list[0].client_name_address),
      rowCount: list.length,
      scores: list.map(row => scoreNumber(row)).filter(score => score != null),
      lastUpdated: list
        .map(row => parseDate(row.updated_at))
        .filter(Boolean)
        .sort((a, b) => b - a)[0]?.toISOString().slice(0, 10) || '',
    }))
    .sort((left, right) => right.rowCount - left.rowCount || left.clientKey.localeCompare(right.clientKey))
}

function countBy(rows, getter) {
  const counts = new Map()
  for (const row of rows) {
    const key = normalizeText(getter(row)) || '<blank>'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function ensureAgent(summary, row) {
  const key = normalizeText(row.user_id) || normalizeLower(row.user_email) || 'unknown'
  if (!summary.has(key)) {
    summary.set(key, {
      userId: normalizeText(row.user_id) || null,
      userEmail: normalizeLower(row.user_email) || null,
      activeRows: 0,
      activeHighScoreRows: 0,
      staleHighScoreRows: 0,
      scoreWindowExpiredRows: 0,
      blankActionPlanRows: 0,
      highScoreBlankActionPlanRows: 0,
      missingEconomicsRows: 0,
      duplicateClusters: 0,
      duplicateRows: 0,
      closedExecutionDriftRows: 0,
    })
  }
  return summary.get(key)
}

function rankAgents(agentSummary, primaryKey, limit) {
  return Array.from(agentSummary.values())
    .sort((a, b) => {
      const delta = (b[primaryKey] || 0) - (a[primaryKey] || 0)
      if (delta) return delta
      return String(a.userEmail || a.userId || '').localeCompare(String(b.userEmail || b.userId || ''))
    })
    .slice(0, limit)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const topLimit = Math.max(0, Number(args.topLimit ?? 10) || 0)
  const sampleLimit = Math.max(0, Number(args.sampleLimit ?? 10) || 0)
  const now = args.now ? new Date(String(args.now)) : new Date()
  if (Number.isNaN(now.getTime())) throw new Error('--now must be a valid date when provided.')

  loadLocalEnv(LOCAL_KPI_ENV)

  const host = new URL(supabaseBaseUrl()).host
  const leads = (await supabaseGetAll([
    'leads?select=id,user_id,user_email,client_name_address,list_buy_sold,score,first_day_active,date_executed,action_plan,estimated_sale_price,estimated_commission_percent,estimated_split,commission,gross_commission,signed,status,execution_status,final_price,final_commission_percent,commission_earned,created_at,updated_at',
    'order=user_email.asc',
  ].join('&'), { count: true })).rows

  const activeRows = leads.filter(isActive)
  const closedRows = leads.filter(isClosed)
  const duplicateClusters = buildDuplicateClusters(leads)
  const duplicateKeys = new Set(duplicateClusters.map(cluster => `${cluster.userId || cluster.userEmail}:${cluster.clientKey}`))

  const agentSummary = new Map()
  for (const row of leads) {
    const agent = ensureAgent(agentSummary, row)
    if (isActive(row)) {
      agent.activeRows += 1
      if (isHighScore(row)) agent.activeHighScoreRows += 1
      if (isStaleHighScore(row, now)) agent.staleHighScoreRows += 1
      if (scoreWindowExpired(row, now)) agent.scoreWindowExpiredRows += 1
      if (isBlankActionPlan(row)) agent.blankActionPlanRows += 1
      if (isHighScore(row) && isBlankActionPlan(row)) agent.highScoreBlankActionPlanRows += 1
      if (hasMissingEstimatedEconomics(row)) agent.missingEconomicsRows += 1
    }
    if (hasClosedExecutionDrift(row)) agent.closedExecutionDriftRows += 1
  }
  for (const cluster of duplicateClusters) {
    const key = cluster.userId || cluster.userEmail || 'unknown'
    const agent = agentSummary.get(key)
    if (!agent) continue
    agent.duplicateClusters += 1
    agent.duplicateRows += cluster.rowCount
  }

  const duplicateRows = activeRows.filter(row => duplicateKeys.has(activeDuplicateKey(row)))
  const output = {
    generatedAt: now.toISOString(),
    scope: 'read-only KPI Shopping List discipline audit',
    connectorProof: {
      kpiSupabaseProject: host,
      table: 'leads',
    },
    settings: {
      topLimit,
      sampleLimit,
      scoreExpectedDays: Object.fromEntries(SCORE_EXPECTED_DAYS),
    },
    totals: {
      rows: leads.length,
      activeRows: activeRows.length,
      closedRows: closedRows.length,
      executedClosedRows: closedRows.filter(isExecuted).length,
      fellThroughClosedRows: closedRows.filter(isFellThrough).length,
      activeSignedRows: activeRows.filter(row => row.signed).length,
      activeHighScoreRows: activeRows.filter(isHighScore).length,
      activeStaleHighScoreRows: activeRows.filter(row => isStaleHighScore(row, now)).length,
      activeScoreWindowExpiredRows: activeRows.filter(row => scoreWindowExpired(row, now)).length,
      activeBlankActionPlanRows: activeRows.filter(isBlankActionPlan).length,
      activeHighScoreBlankActionPlanRows: activeRows.filter(row => isHighScore(row) && isBlankActionPlan(row)).length,
      activeMissingScoreRows: activeRows.filter(row => scoreNumber(row) == null).length,
      activeMissingTypeRows: activeRows.filter(row => !normalizeText(row.list_buy_sold)).length,
      activeMissingEstimatedEconomicsRows: activeRows.filter(hasMissingEstimatedEconomics).length,
      duplicateActiveClientClusters: duplicateClusters.length,
      duplicateActiveClientRows: duplicateRows.length,
      closedExecutionDriftRows: closedRows.filter(hasClosedExecutionDrift).length,
    },
    breakdowns: {
      activeByScore: countBy(activeRows, row => scoreNumber(row) ?? '<blank>'),
      activeByType: countBy(activeRows, row => row.list_buy_sold),
      activeBySigned: countBy(activeRows, row => row.signed ? 'signed' : 'not_signed'),
      closedByExecutionStatus: countBy(closedRows, row => row.execution_status),
      scoreWindowExpiredByScore: countBy(activeRows.filter(row => scoreWindowExpired(row, now)), row => scoreNumber(row)),
    },
    topAgents: {
      staleHighScoreRows: rankAgents(agentSummary, 'staleHighScoreRows', topLimit),
      scoreWindowExpiredRows: rankAgents(agentSummary, 'scoreWindowExpiredRows', topLimit),
      blankActionPlanRows: rankAgents(agentSummary, 'blankActionPlanRows', topLimit),
      highScoreBlankActionPlanRows: rankAgents(agentSummary, 'highScoreBlankActionPlanRows', topLimit),
      duplicateClusters: rankAgents(agentSummary, 'duplicateClusters', topLimit),
      closedExecutionDriftRows: rankAgents(agentSummary, 'closedExecutionDriftRows', topLimit),
    },
    sampleSignals: {
      duplicateActiveClientClusters: duplicateClusters.slice(0, sampleLimit),
      staleHighScoreRows: activeRows
        .filter(row => isStaleHighScore(row, now))
        .sort((a, b) => (daysOld(b.updated_at, now) || 0) - (daysOld(a.updated_at, now) || 0))
        .slice(0, sampleLimit)
        .map(row => ({
          id: row.id,
          userId: normalizeText(row.user_id) || null,
          userEmail: normalizeLower(row.user_email) || null,
          score: scoreNumber(row),
          listBuySold: normalizeText(row.list_buy_sold) || null,
          signed: Boolean(row.signed),
          updatedAt: compactDate(row.updated_at),
          daysSinceUpdate: daysOld(row.updated_at, now),
          hasActionPlan: !isBlankActionPlan(row),
        })),
    },
    nextRulesToBuild: [
      'Review Shopping List weekly; stale high-score rows are pipeline-quality failures, not cosmetic cleanup.',
      'Use score-specific expected windows: 10/9/8/7 should be checked against 15/30/45/60 day movement expectations.',
      'Blank action plans on active opportunities should trigger a coaching prompt asking for the next action this week.',
      'Duplicate active client rows should be treated as a question first; split buy/sell or multiple-property cases may be legitimate.',
      'KPI writes should stay focused on goals and Shopping List, with agent-authorized apply and audit logs before automation.',
    ],
  }

  console.log(JSON.stringify(output, null, 2))
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
