#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DEFAULT_DAYS = 7
const DEFAULT_SESSIONS = 8
const DEFAULT_WATCH_SECONDS = 15

export function defaultUsageArgs(overrides = {}) {
  return {
    codexHome: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    days: DEFAULT_DAYS,
    sessions: DEFAULT_SESSIONS,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto',
    threadId: process.env.CODEX_THREAD_ID || '',
    json: false,
    watch: false,
    watchSeconds: DEFAULT_WATCH_SECONDS,
    ...overrides,
  }
}

export function parseArgs(argv) {
  const args = defaultUsageArgs()

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true
      continue
    }
    if (arg === '--watch') {
      args.watch = true
      continue
    }
    if (arg.startsWith('--watch=')) {
      args.watch = true
      args.watchSeconds = positiveInt(arg.split('=')[1], DEFAULT_WATCH_SECONDS)
      continue
    }
    if (arg.startsWith('--codex-home=')) args.codexHome = arg.split('=').slice(1).join('=')
    if (arg.startsWith('--days=')) args.days = positiveInt(arg.split('=')[1], DEFAULT_DAYS)
    if (arg.startsWith('--sessions=')) args.sessions = positiveInt(arg.split('=')[1], DEFAULT_SESSIONS)
    if (arg.startsWith('--timezone=')) args.timezone = arg.split('=').slice(1).join('=')
    if (arg.startsWith('--thread-id=')) args.threadId = arg.split('=').slice(1).join('=')
  }

  return args
}

export function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function listRolloutFiles(root) {
  const files = []

  async function walk(dir) {
    let entries = []
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
        files.push(fullPath)
      }
    }
  }

  await walk(root)
  return files.sort()
}

export async function parseRollout(filePath, timezone) {
  const session = {
    id: path.basename(filePath, '.jsonl').replace(/^rollout-.*?-([0-9a-f]{8}-)/, '$1'),
    path: filePath,
    startedAt: null,
    updatedAt: null,
    cwd: '',
    model: '',
    effort: '',
    contextWindow: null,
    latestRateLimits: null,
    latestUsage: null,
    usageEvents: [],
    totalTokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  }

  let previousTotal = 0
  const stream = createReadStream(filePath, { encoding: 'utf8' })
  const lines = readline.createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY })

  for await (const line of lines) {
    if (!line.trim()) continue

    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }

    const timestamp = event.timestamp || event.payload?.timestamp || null
    if (timestamp) session.updatedAt = timestamp

    if (event.type === 'session_meta') {
      session.id = event.payload?.id || session.id
      session.startedAt = event.payload?.timestamp || session.startedAt || timestamp
      session.cwd = event.payload?.cwd || session.cwd
      continue
    }

    if (event.type === 'turn_context') {
      session.cwd = event.payload?.cwd || session.cwd
      session.model = event.payload?.model || session.model
      session.effort = event.payload?.effort || session.effort
      continue
    }

    if (event.type !== 'event_msg') continue

    if (event.payload?.type === 'task_started') {
      session.contextWindow = event.payload?.model_context_window || session.contextWindow
      continue
    }

    if (event.payload?.type !== 'token_count') continue

    if (event.payload.rate_limits) session.latestRateLimits = event.payload.rate_limits

    const info = event.payload.info
    if (!info?.total_token_usage || !info?.last_token_usage) continue

    session.contextWindow = info.model_context_window || session.contextWindow
    session.latestUsage = info

    const totalUsage = info.total_token_usage
    const total = numberValue(totalUsage.total_tokens)
    const delta = previousTotal > 0 ? Math.max(0, total - previousTotal) : total
    previousTotal = Math.max(previousTotal, total)

    session.totalTokens = total
    session.inputTokens = numberValue(totalUsage.input_tokens)
    session.cachedInputTokens = numberValue(totalUsage.cached_input_tokens)
    session.outputTokens = numberValue(totalUsage.output_tokens)
    session.reasoningOutputTokens = numberValue(totalUsage.reasoning_output_tokens)

    session.usageEvents.push({
      timestamp,
      day: timestamp ? localDateKey(new Date(timestamp), timezone) : 'unknown',
      total,
      delta,
      usage: info,
    })
  }

  return session.usageEvents.length || session.latestRateLimits ? session : null
}

export function numberValue(value) {
  return Number.isFinite(value) ? value : 0
}

export function localDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function localDateTime(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} ${get('timeZoneName')}`
}

export function buildSummary(sessions, args) {
  const now = new Date()
  const sortedSessions = sessions
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt || b.startedAt || 0) - new Date(a.updatedAt || a.startedAt || 0))
  const latestSession = sortedSessions[0] || null
  const focusedSession = args.threadId
    ? sortedSessions.find(session => session.id === args.threadId) || latestSession
    : latestSession
  const latestRateLimits = sortedSessions.find(session => session.latestRateLimits)?.latestRateLimits || null
  const since = now.getTime() - args.days * 24 * 60 * 60 * 1000
  const daily = new Map()
  let rollingTokens = 0

  for (const session of sortedSessions) {
    for (const event of session.usageEvents) {
      const eventTime = new Date(event.timestamp).getTime()
      if (!Number.isFinite(eventTime)) continue
      if (eventTime < since) continue

      rollingTokens += event.delta
      daily.set(event.day, (daily.get(event.day) || 0) + event.delta)
    }
  }

  const dailyRows = []
  for (let index = 0; index < args.days; index += 1) {
    const date = new Date(now.getTime() - index * 24 * 60 * 60 * 1000)
    const key = localDateKey(date, args.timezone)
    dailyRows.push({
      day: key,
      tokens: daily.get(key) || 0,
    })
  }

  return {
    generatedAt: now.toISOString(),
    generatedAtLocal: localDateTime(now, args.timezone),
    timezone: args.timezone,
    codexHome: args.codexHome,
    sessionsScanned: sortedSessions.length,
    latestSession,
    focusedSession,
    latestRateLimits,
    rollingDays: args.days,
    rollingTokens,
    dailyRows,
    recentSessions: sortedSessions.slice(0, args.sessions),
  }
}

export function renderSummary(summary) {
  const latest = summary.focusedSession
  const latestUsage = latest?.latestUsage
  const lastTurn = latestUsage?.last_token_usage || null
  const contextWindow = latestUsage?.model_context_window || latest?.contextWindow || null
  const contextTokens = lastTurn?.input_tokens || null

  console.log('Codex terminal usage')
  console.log(`Updated: ${summary.generatedAtLocal}`)
  console.log(`Source: ${path.join(summary.codexHome, 'sessions')}`)
  console.log('')

  console.log('Rate limits')
  renderRateLimit('5h', summary.latestRateLimits?.primary, summary.timezone)
  renderRateLimit('7d', summary.latestRateLimits?.secondary, summary.timezone)
  console.log(`Plan: ${summary.latestRateLimits?.plan_type || 'unknown'}`)
  console.log('')

  console.log(summary.latestSession?.id === latest?.id ? 'Latest updated session' : 'Focused session')
  if (!latest) {
    console.log('  No token-count events found.')
  } else {
    const contextPercent = contextWindow && contextTokens ? (contextTokens / contextWindow) * 100 : null
    console.log(`  Session: ${latest.id}`)
    console.log(`  Model: ${[latest.model, latest.effort].filter(Boolean).join(' / ') || 'unknown'}`)
    console.log(`  Context: ${formatNumber(contextTokens)} / ${formatNumber(contextWindow)}${contextPercent ? ` (${formatPercent(contextPercent)} used)` : ''}`)
    console.log(`  Last turn: ${formatNumber(lastTurn?.total_tokens)} tokens`)
    console.log(`  Session total: ${formatNumber(latest.totalTokens)} tokens`)
    console.log(`  Cached input: ${formatNumber(latest.cachedInputTokens)} of ${formatNumber(latest.inputTokens)} input tokens`)
  }
  console.log('')

  console.log(`Token volume, last ${summary.rollingDays} days`)
  console.log(`  Rolling total: ${formatNumber(summary.rollingTokens)} tokens`)
  for (const row of summary.dailyRows) {
    console.log(`  ${row.day}: ${formatNumber(row.tokens)}`)
  }
  console.log('')

  console.log('Recent sessions')
  for (const session of summary.recentSessions) {
    const updated = session.updatedAt ? localDateTime(new Date(session.updatedAt), summary.timezone) : 'unknown'
    const label = [session.model, session.effort].filter(Boolean).join('/') || 'unknown'
    console.log(`  ${updated}  ${formatNumber(session.totalTokens).padStart(10)}  ${label.padEnd(16)}  ${session.id}`)
  }
  console.log('')

  console.log('Notes')
  console.log('  Rate-limit percentages are from Codex token_count events and are the best "usage left" signal.')
  console.log('  With multiple chats open, the latest updated session may be a different terminal.')
  console.log('  Token volume is local CLI usage metadata, not billing dollars; cached input may be priced differently.')
}

export function renderRateLimit(label, limit, timezone) {
  if (!limit) {
    console.log(`  ${label}: unknown`)
    return
  }

  const used = numberValue(limit.used_percent)
  const left = Math.max(0, 100 - used)
  const resetDate = limit.resets_at ? new Date(limit.resets_at * 1000) : null
  const reset = resetDate ? `${localDateTime(resetDate, timezone)} (${formatDuration(resetDate.getTime() - Date.now())})` : 'unknown'
  const window = limit.window_minutes ? `${formatDuration(limit.window_minutes * 60 * 1000)} window` : 'window unknown'
  console.log(`  ${label}: ${formatPercent(used)} used / ${formatPercent(left)} left, resets ${reset}, ${window}`)
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return 'unknown'
  return Math.round(value).toLocaleString('en-US')
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return 'unknown'
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return 'unknown'
  const abs = Math.max(0, milliseconds)
  const minutes = Math.floor(abs / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (mins || !parts.length) parts.push(`${mins}m`)
  return parts.join(' ')
}

export async function getUsageSummary(options = {}) {
  const args = defaultUsageArgs(options)
  args.days = positiveInt(args.days, DEFAULT_DAYS)
  args.sessions = positiveInt(args.sessions, DEFAULT_SESSIONS)
  args.watchSeconds = positiveInt(args.watchSeconds, DEFAULT_WATCH_SECONDS)
  const sessionsRoot = path.join(args.codexHome, 'sessions')
  const files = await listRolloutFiles(sessionsRoot)
  const sessions = []
  for (const file of files) {
    const session = await parseRollout(file, args.timezone)
    if (session) sessions.push(session)
  }

  return buildSummary(sessions, args)
}

async function runOnce(args) {
  const summary = await getUsageSummary(args)
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }
  renderSummary(summary)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.watch) {
    await runOnce(args)
    return
  }

  for (;;) {
    process.stdout.write('\x1Bc')
    await runOnce(args)
    await new Promise(resolve => setTimeout(resolve, args.watchSeconds * 1000))
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isDirectRun) {
  main().catch(error => {
    console.error(`codex usage failed: ${error.message}`)
    process.exitCode = 1
  })
}
