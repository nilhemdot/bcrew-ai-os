#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const wantsFull = args.has('--full')
const wantsSettings = args.has('--settings')
const wantsJson = args.has('--json')
const wantsLast = args.has('--last')
const wantsFooter = args.has('--footer')
const sinceMsArg = process.argv.find(arg => arg.startsWith('--since-ms='))
const sessionFileArg = process.argv.find(arg => arg.startsWith('--session-file='))
const sinceMs = sinceMsArg ? Number(sinceMsArg.split('=')[1]) : null
const explicitSessionFile = sessionFileArg ? sessionFileArg.slice('--session-file='.length) : ''
const useColor = process.stdout.isTTY && !args.has('--no-color')

const homeDir = os.homedir()
const codexHome = process.env.CODEX_HOME || path.join(homeDir, '.codex')
const sessionsDir = path.join(codexHome, 'sessions')
const configPath = path.join(codexHome, 'config.toml')
const globalStatePath = path.join(codexHome, '.codex-global-state.json')
const zshrcPath = path.join(homeDir, '.zshrc')
const threadId = process.env.CODEX_THREAD_ID || ''

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function paint(text, color) {
  if (!useColor || !color) return text
  return `${ANSI[color]}${text}${ANSI.reset}`
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function walkFiles(rootDir, matcher) {
  const found = []
  const stack = [rootDir]

  while (stack.length) {
    const current = stack.pop()
    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const nextPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(nextPath)
        continue
      }
      if (entry.isFile() && matcher(nextPath)) {
        found.push(nextPath)
      }
    }
  }

  return found
}

function getNewestFile(filePaths) {
  let newestPath = ''
  let newestMtime = 0

  for (const filePath of filePaths) {
    try {
      const stat = fs.statSync(filePath)
      if (stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs
        newestPath = filePath
      }
    } catch {
      continue
    }
  }

  return newestPath
}

function findSessionFile() {
  if (explicitSessionFile) {
    return fs.existsSync(explicitSessionFile) ? explicitSessionFile : ''
  }

  if (!fs.existsSync(sessionsDir)) return ''

  if (threadId) {
    const exactMatches = walkFiles(sessionsDir, filePath => filePath.endsWith(`${threadId}.jsonl`))
    if (exactMatches.length) return getNewestFile(exactMatches)
  }

  if (!wantsLast) return ''

  const allSessions = walkFiles(sessionsDir, filePath => filePath.endsWith('.jsonl'))
  const filtered = Number.isFinite(sinceMs)
    ? allSessions.filter(filePath => {
        try {
          return fs.statSync(filePath).mtimeMs >= sinceMs
        } catch {
          return false
        }
      })
    : allSessions
  return getNewestFile(filtered)
}

function readFirstLine(filePath, maxBytes = 524288) {
  const fd = fs.openSync(filePath, 'r')
  let position = 0
  let combined = ''

  try {
    while (position < maxBytes) {
      const chunkSize = Math.min(65536, maxBytes - position)
      const buffer = Buffer.alloc(chunkSize)
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position)
      if (!bytesRead) break
      combined += buffer.toString('utf8', 0, bytesRead)
      const newlineIndex = combined.indexOf('\n')
      if (newlineIndex !== -1) {
        return combined.slice(0, newlineIndex)
      }
      position += bytesRead
    }
  } finally {
    fs.closeSync(fd)
  }

  return combined
}

function readTail(filePath, maxBytes = 1048576) {
  const stat = fs.statSync(filePath)
  const start = Math.max(0, stat.size - maxBytes)
  const size = stat.size - start
  const fd = fs.openSync(filePath, 'r')

  try {
    const buffer = Buffer.alloc(size)
    fs.readSync(fd, buffer, 0, size, start)
    let text = buffer.toString('utf8')
    if (start > 0) {
      const firstNewline = text.indexOf('\n')
      text = firstNewline === -1 ? '' : text.slice(firstNewline + 1)
    }
    return text
  } finally {
    fs.closeSync(fd)
  }
}

function parseSessionState(filePath) {
  const state = {
    sessionMeta: null,
    turnContext: null,
    tokenCount: null,
    taskStarted: null,
    tokenHistory: [],
  }

  const firstLine = readFirstLine(filePath)
  if (firstLine) {
    try {
      const firstEntry = JSON.parse(firstLine)
      if (firstEntry.type === 'session_meta') state.sessionMeta = firstEntry.payload || null
    } catch {
      // Ignore malformed first line.
    }
  }

  const tail = readTail(filePath)
  for (const line of tail.split('\n')) {
    if (!line.trim()) continue
    let entry = null
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type === 'turn_context') {
      state.turnContext = entry.payload || state.turnContext
      continue
    }

    if (entry.type !== 'event_msg' || !entry.payload || typeof entry.payload.type !== 'string') continue
    if (entry.payload.type === 'token_count') state.tokenCount = entry.payload
    if (entry.payload.type === 'task_started') state.taskStarted = entry.payload
    if (entry.payload.type === 'token_count') state.tokenHistory.push(entry.payload)
  }

  if (!state.turnContext || !state.tokenCount) {
    try {
      const stat = fs.statSync(filePath)
      if (stat.size <= 5 * 1024 * 1024) {
        const fullText = fs.readFileSync(filePath, 'utf8')
        for (const line of fullText.split('\n')) {
          if (!line.trim()) continue
          let entry = null
          try {
            entry = JSON.parse(line)
          } catch {
            continue
          }

          if (!state.turnContext && entry.type === 'turn_context') {
            state.turnContext = entry.payload || state.turnContext
          }

          if (!state.tokenCount && entry.type === 'event_msg' && entry.payload?.type === 'token_count') {
            state.tokenCount = entry.payload
          }

          if (entry.type === 'event_msg' && entry.payload?.type === 'token_count') {
            state.tokenHistory.push(entry.payload)
          }
        }
      }
    } catch {
      // Keep partial state if the fallback scan fails.
    }
  }

  return state
}

function dedupeTokenHistory(tokenHistory) {
  const unique = []
  let lastKey = ''

  for (const entry of tokenHistory) {
    const info = entry?.info || {}
    const total = info.total_token_usage || {}
    const last = info.last_token_usage || {}
    const key = [
      total.input_tokens || 0,
      total.cached_input_tokens || 0,
      total.output_tokens || 0,
      last.input_tokens || 0,
      last.cached_input_tokens || 0,
      last.output_tokens || 0,
      last.reasoning_output_tokens || 0,
      info.model_context_window || 0,
    ].join(':')

    if (key === lastKey) continue
    lastKey = key
    unique.push(entry)
  }

  return unique
}

function countTrailing(values, predicate) {
  let count = 0
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (!predicate(values[index])) break
    count += 1
  }
  return count
}

function average(values) {
  if (!values.length) return NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function analyzePressureHistory(tokenHistory, contextWindow, currentPct) {
  const deduped = dedupeTokenHistory(tokenHistory)
  const recent = deduped.slice(-12)
  const pressures = recent
    .map(entry => {
      const inputTokens = Number(entry?.info?.last_token_usage?.input_tokens || 0)
      const windowSize = Number(entry?.info?.model_context_window || contextWindow || 0)
      return windowSize ? (inputTokens / windowSize) * 100 : NaN
    })
    .filter(value => Number.isFinite(value))

  const hot55 = pressures.filter(value => value >= 55).length
  const hot65 = pressures.filter(value => value >= 65).length
  const hot72 = pressures.filter(value => value >= 72).length
  const streak55 = countTrailing(pressures, value => value >= 55)
  const streak65 = countTrailing(pressures, value => value >= 65)

  return {
    sampleCount: pressures.length,
    recentAveragePct: average(pressures),
    recentMaxPct: pressures.length ? Math.max(...pressures) : NaN,
    hot55Count: hot55,
    hot65Count: hot65,
    hot72Count: hot72,
    streak55,
    streak65,
    currentPct,
  }
}

function getSimpleConfig(configText) {
  const config = {
    model: '',
    reasoningEffort: '',
    fastMode: null,
    plugins: [],
  }

  const modelMatch = configText.match(/^model\s*=\s*"([^"]+)"/m)
  if (modelMatch) config.model = modelMatch[1]

  const effortMatch = configText.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m)
  if (effortMatch) config.reasoningEffort = effortMatch[1]

  const fastModeMatch = configText.match(/^\s*fast_mode\s*=\s*(true|false)\s*$/m)
  if (fastModeMatch) config.fastMode = fastModeMatch[1] === 'true'

  const pluginMatches = configText.matchAll(/\[plugins\."([^"]+)"\]\s*\n\s*enabled\s*=\s*(true|false)/g)
  for (const match of pluginMatches) {
    if (match[2] === 'true') config.plugins.push(match[1])
  }

  return config
}

function getAliasCommand(zshrcText, aliasName) {
  const singleQuoted = zshrcText.match(new RegExp(`^alias\\s+${aliasName}='([^']*)'`, 'm'))
  if (singleQuoted) return singleQuoted[1]

  const doubleQuoted = zshrcText.match(new RegExp(`^alias\\s+${aliasName}="([^"]*)"`, 'm'))
  return doubleQuoted ? doubleQuoted[1] : ''
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return Math.round(value).toLocaleString('en-US')
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

function formatMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return 'n/a'
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function shortenHome(filePath) {
  return filePath.startsWith(homeDir) ? `~${filePath.slice(homeDir.length)}` : filePath
}

function bar(pctUsed, width = 24) {
  const clamped = Math.max(0, Math.min(100, pctUsed))
  const filled = Math.round((clamped / 100) * width)
  return `${'#'.repeat(filled)}${'-'.repeat(width - filled)}`
}

function getPressureColor(pctUsed) {
  if (!Number.isFinite(pctUsed)) return 'gray'
  if (pctUsed >= 65) return 'red'
  if (pctUsed >= 45) return 'yellow'
  return 'green'
}

function getRefreshHeuristic(sessionAgeMin, currentPct, history) {
  let targetMinutes = 180
  let label = 'healthy'
  let reason = 'No sustained context strain detected.'

  if (
    currentPct >= 72 ||
    history.hot72Count >= 1 ||
    history.hot65Count >= 2 ||
    history.streak55 >= 5 ||
    (sessionAgeMin >= 240 && history.hot55Count >= 4)
  ) {
    targetMinutes = 0
    label = 'new chat now'
    reason = 'Sustained high context pressure.'
  } else if (
    currentPct >= 62 ||
    history.hot55Count >= 3 ||
    history.streak55 >= 3 ||
    (sessionAgeMin >= 180 && history.hot55Count >= 2)
  ) {
    targetMinutes = 30
    label = 'very soon'
    reason = 'Repeated high-pressure turns are showing up.'
  } else if (
    currentPct >= 55 ||
    (sessionAgeMin >= 150 && history.hot55Count >= 1) ||
    (history.sampleCount >= 4 && history.recentAveragePct >= 52)
  ) {
    targetMinutes = 60
    label = 'soon'
    reason = 'Pressure is building, but not critical yet.'
  } else if (
    currentPct >= 50 ||
    (sessionAgeMin >= 120 && history.sampleCount >= 4 && history.recentAveragePct >= 48)
  ) {
    targetMinutes = 120
    label = 'watch'
    reason = 'Session is still fine, but keep an eye on it.'
  }

  const remaining = Math.max(0, Math.round(targetMinutes - sessionAgeMin))

  return {
    targetMinutes,
    remaining,
    label,
    reason,
  }
}

function getEnabledFeatures() {
  try {
    const output = execFileSync('codex', ['features', 'list'], { encoding: 'utf8' })
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^(\S+)\s+.+\s+(true|false)$/)
        return match ? { name: match[1], enabled: match[2] === 'true' } : null
      })
      .filter(Boolean)
      .filter(item => item.enabled)
      .map(item => item.name)
  } catch {
    return []
  }
}

function buildSnapshot() {
  const sessionFile = findSessionFile()
  const configText = readText(configPath)
  const zshrcText = readText(zshrcPath)
  const globalState = readJson(globalStatePath) || {}
  const config = getSimpleConfig(configText)
  const codexAlias = getAliasCommand(zshrcText, 'codex')
  const bcrewAlias = getAliasCommand(zshrcText, 'bcrew')
  const base = {
    sessionFile,
    sessionMeta: {},
    turnContext: {},
    contextWindow: 0,
    sessionAgeMin: 0,
    sessionLastUpdatedAt: null,
    contextUsedPct: NaN,
    contextFreePct: NaN,
    history: {
      sampleCount: 0,
      recentAveragePct: NaN,
      recentMaxPct: NaN,
      hot55Count: 0,
      hot65Count: 0,
      hot72Count: 0,
      streak55: 0,
      streak65: 0,
      currentPct: NaN,
    },
    refresh: {
      targetMinutes: null,
      remaining: null,
      label: 'preflight',
      reason: 'No active Codex chat yet.',
    },
    usage: {
      lastInputTokens: 0,
      lastCachedInputTokens: 0,
      lastOutputTokens: 0,
      lastReasoningTokens: 0,
      totalTokens: 0,
    },
    rateLimits: {
      planType: '',
      primaryUsedPercent: null,
      primaryWindowMinutes: null,
      secondaryUsedPercent: null,
      secondaryWindowMinutes: null,
    },
    session: {
      threadId: threadId || '',
      cwd: '',
      model: config.model || '',
      effort: config.reasoningEffort || '',
      approvalPolicy: '',
      sandboxType: '',
      networkAccess: null,
      collaborationMode: '',
      truncationMode: '',
      truncationLimit: null,
      summaryMode: '',
      realtimeActive: null,
      cliVersion: '',
      modelProvider: '',
      originator: '',
      source: '',
      active: false,
    },
    shellDefaults: {
      codexAlias,
      bcrewAlias,
      searchEnabled: codexAlias.includes('--search'),
      bypassEnabled: codexAlias.includes('--dangerously-bypass-approvals-and-sandbox'),
      fullAutoEnabled: codexAlias.includes('--full-auto'),
    },
    config: {
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      fastMode: config.fastMode,
      plugins: config.plugins,
      composerAutoContextEnabled: Boolean(globalState['electron-persisted-atom-state']?.['composer-auto-context-enabled']),
      codexCloudAccess: globalState['electron-persisted-atom-state']?.codexCloudAccess || '',
    },
    features: wantsSettings ? getEnabledFeatures() : [],
  }

  if (!sessionFile) {
    return base
  }

  const sessionState = parseSessionState(sessionFile)
  const sessionStat = fs.statSync(sessionFile)

  const sessionMeta = sessionState.sessionMeta || {}
  const turnContext = sessionState.turnContext || {}
  const tokenCount = sessionState.tokenCount || {}
  const tokenInfo = tokenCount.info || {}
  const lastUsage = tokenInfo.last_token_usage || {}
  const totalUsage = tokenInfo.total_token_usage || {}
  const rateLimits = tokenCount.rate_limits || {}
  const primaryRate = rateLimits.primary || {}
  const secondaryRate = rateLimits.secondary || {}
  const contextWindow = tokenInfo.model_context_window || sessionState.taskStarted?.model_context_window || 0
  const lastInputTokens = Number(lastUsage.input_tokens || 0)
  const lastCachedInputTokens = Number(lastUsage.cached_input_tokens || 0)
  const lastOutputTokens = Number(lastUsage.output_tokens || 0)
  const lastReasoningTokens = Number(lastUsage.reasoning_output_tokens || 0)
  const totalTokens = Number(totalUsage.total_tokens || 0)
  const sessionStartedAt = sessionMeta.timestamp ? Date.parse(sessionMeta.timestamp) : sessionStat.birthtimeMs
  const sessionAgeMin = Math.max(0, (Date.now() - sessionStartedAt) / 60000)
  const contextUsedPct = contextWindow ? Math.min(100, (lastInputTokens / contextWindow) * 100) : NaN
  const contextFreePct = Number.isFinite(contextUsedPct) ? Math.max(0, 100 - contextUsedPct) : NaN
  const history = analyzePressureHistory(sessionState.tokenHistory || [], contextWindow, Number.isFinite(contextUsedPct) ? contextUsedPct : 0)
  const refresh = getRefreshHeuristic(sessionAgeMin, Number.isFinite(contextUsedPct) ? contextUsedPct : 0, history)

  return {
    ...base,
    sessionFile,
    sessionMeta,
    turnContext,
    contextWindow,
    sessionAgeMin,
    sessionLastUpdatedAt: sessionStat.mtime.toISOString(),
    contextUsedPct,
    contextFreePct,
    history,
    refresh,
    usage: {
      lastInputTokens,
      lastCachedInputTokens,
      lastOutputTokens,
      lastReasoningTokens,
      totalTokens,
    },
    rateLimits: {
      planType: rateLimits.plan_type || '',
      primaryUsedPercent: primaryRate.used_percent,
      primaryWindowMinutes: primaryRate.window_minutes,
      secondaryUsedPercent: secondaryRate.used_percent,
      secondaryWindowMinutes: secondaryRate.window_minutes,
    },
    session: {
      threadId: threadId || sessionMeta.id || '',
      cwd: turnContext.cwd || sessionMeta.cwd || '',
      model: turnContext.model || config.model || '',
      effort: turnContext.effort || config.reasoningEffort || '',
      approvalPolicy: turnContext.approval_policy || '',
      sandboxType: turnContext.sandbox_policy?.type || '',
      networkAccess: turnContext.sandbox_policy?.network_access,
      collaborationMode: turnContext.collaboration_mode?.mode || '',
      truncationMode: turnContext.truncation_policy?.mode || '',
      truncationLimit: turnContext.truncation_policy?.limit,
      summaryMode: turnContext.summary || '',
      realtimeActive: turnContext.realtime_active,
      cliVersion: sessionMeta.cli_version || '',
      modelProvider: sessionMeta.model_provider || '',
      originator: sessionMeta.originator || '',
      source: sessionMeta.source || '',
      active: true,
    },
  }
}

function printBar(snapshot) {
  if (wantsFooter) {
    if (!snapshot.session.active) {
      console.log(`ready | no active chat yet`)
      console.log(`${snapshot.session.model || 'n/a'}/${snapshot.session.effort || 'n/a'} | search ${snapshot.shellDefaults.searchEnabled ? 'on' : 'off'} | fast ${snapshot.config.fastMode ? 'on' : 'off'} | autoctx ${snapshot.config.composerAutoContextEnabled ? 'on' : 'off'}`)
      return
    }

    const chatText = snapshot.refresh.label === 'new chat now'
      ? 'new chat now'
      : snapshot.refresh.label
    console.log(`ctx ${formatPercent(snapshot.contextUsedPct)} used ${formatPercent(snapshot.contextFreePct)} free | chat ${chatText} | strain ${snapshot.history.hot55Count}/${snapshot.history.sampleCount}`)
    console.log(`${snapshot.session.model || 'n/a'}/${snapshot.session.effort || 'n/a'} | ${snapshot.session.approvalPolicy || 'n/a'}/${snapshot.session.sandboxType || 'n/a'} | search ${snapshot.shellDefaults.searchEnabled ? 'on' : 'off'} | fast ${snapshot.config.fastMode ? 'on' : 'off'} | autoctx ${snapshot.config.composerAutoContextEnabled ? 'on' : 'off'}`)
    return
  }

  if (!snapshot.session.active) {
    const prefix = paint('[codex]', 'cyan')
    const modelText = `${snapshot.session.model || 'n/a'}/${snapshot.session.effort || 'n/a'}`
    const searchText = snapshot.shellDefaults.searchEnabled ? 'search on' : 'search off'
    const fastText = snapshot.config.fastMode ? 'fast on' : 'fast off'
    const autoContextText = snapshot.config.composerAutoContextEnabled ? 'autoctx on' : 'autoctx off'
    console.log(`${prefix} ready | no active chat yet | ${modelText} | ${searchText} | ${fastText} | ${autoContextText}`)
    return
  }

  const pressureColor = getPressureColor(snapshot.contextUsedPct)
  const refreshColor = snapshot.refresh.label === 'new chat now'
    ? 'red'
    : snapshot.refresh.label === 'healthy'
      ? 'green'
      : 'yellow'
  const refreshText = snapshot.refresh.label === 'new chat now'
    ? 'new chat now'
    : `${snapshot.refresh.label} ~${snapshot.refresh.remaining}m`
  const modelText = `${snapshot.session.model || 'n/a'}/${snapshot.session.effort || 'n/a'}`
  const executionText = `${snapshot.session.approvalPolicy || 'n/a'}/${snapshot.session.sandboxType || 'n/a'}`
  const searchText = snapshot.shellDefaults.searchEnabled ? 'search on' : 'search off'
  const fastText = snapshot.config.fastMode ? 'fast on' : 'fast off'
  const autoContextText = snapshot.config.composerAutoContextEnabled ? 'autoctx on' : 'autoctx off'
  const strainText = snapshot.history.hot55Count > 0
    ? `strain ${snapshot.history.hot55Count}/${snapshot.history.sampleCount}`
    : `strain ${snapshot.history.sampleCount ? 'low' : 'n/a'}`
  const meter = paint(bar(snapshot.contextUsedPct), pressureColor)
  const ctxText = paint(`ctx~ ${formatPercent(snapshot.contextUsedPct)} used`, pressureColor)
  const freeText = paint(`${formatPercent(snapshot.contextFreePct)} free`, pressureColor)
  const refreshLabel = paint(`chat ${refreshText}`, refreshColor)
  const prefix = paint('[codex]', 'cyan')
  const plan = snapshot.rateLimits.planType ? ` | plan ${snapshot.rateLimits.planType}` : ''

  console.log(`${prefix} ${meter} ${ctxText} ${freeText} | ${refreshLabel} | ${strainText} | ${modelText} | ${executionText} | ${searchText} | ${fastText} | ${autoContextText}${plan}`)
}

function printFull(snapshot) {
  if (!snapshot.session.active) {
    const lines = [
      `${paint('Codex Preflight', 'bold')}`,
      `${paint('Chat', 'cyan')}     no active Codex chat yet`,
      `${paint('Model', 'cyan')}    ${snapshot.session.model || 'n/a'} | effort ${snapshot.session.effort || 'n/a'}`,
      `${paint('Config', 'cyan')}   fast ${snapshot.config.fastMode ? 'on' : 'off'} | cloud ${snapshot.config.codexCloudAccess || 'n/a'} | plugins ${snapshot.config.plugins.join(', ') || 'none'}`,
      `${paint('Shell', 'cyan')}    search ${snapshot.shellDefaults.searchEnabled ? 'on' : 'off'} | bypass ${snapshot.shellDefaults.bypassEnabled ? 'on' : 'off'} | full-auto ${snapshot.shellDefaults.fullAutoEnabled ? 'on' : 'off'}`,
      `${paint('Tip', 'cyan')}      run with ${paint('codex-last', 'bold')} if you want the previous session stats`,
    ]
    console.log(lines.join('\n'))
    return
  }

  const pressureColor = getPressureColor(snapshot.contextUsedPct)
  const refreshColor = snapshot.refresh.label === 'new chat now'
    ? 'red'
    : snapshot.refresh.label === 'healthy'
      ? 'green'
      : 'yellow'
  const lines = [
    `${paint('Codex Session Monitor', 'bold')}`,
    `${paint('Session', 'cyan')}  ${shortenHome(snapshot.sessionFile)}`,
    `${paint('Thread', 'cyan')}   ${snapshot.session.threadId || 'n/a'}`,
    `${paint('Age', 'cyan')}      ${formatMinutes(snapshot.sessionAgeMin)} | last update ${snapshot.sessionLastUpdatedAt}`,
    `${paint('CWD', 'cyan')}      ${snapshot.session.cwd || 'n/a'}`,
    `${paint('Model', 'cyan')}    ${snapshot.session.model || 'n/a'} | effort ${snapshot.session.effort || 'n/a'} | provider ${snapshot.session.modelProvider || 'n/a'} | cli ${snapshot.session.cliVersion || 'n/a'}`,
    `${paint('Exec', 'cyan')}     approvals ${snapshot.session.approvalPolicy || 'n/a'} | sandbox ${snapshot.session.sandboxType || 'n/a'} | network ${snapshot.session.networkAccess === false ? 'off' : 'on'} | search default ${snapshot.shellDefaults.searchEnabled ? 'on' : 'off'}`,
    `${paint('Memory', 'cyan')}   summary ${snapshot.session.summaryMode || 'n/a'} | truncation ${snapshot.session.truncationMode || 'n/a'}:${snapshot.session.truncationLimit || 'n/a'} | autoctx ${snapshot.config.composerAutoContextEnabled ? 'on' : 'off'}`,
    `${paint('Context', 'cyan')}  ${paint(bar(snapshot.contextUsedPct), pressureColor)}  ${formatPercent(snapshot.contextUsedPct)} used / ${formatPercent(snapshot.contextFreePct)} free`,
          `          last input ${formatNumber(snapshot.usage.lastInputTokens)} | cached ${formatNumber(snapshot.usage.lastCachedInputTokens)} | last output ${formatNumber(snapshot.usage.lastOutputTokens)} | reasoning ${formatNumber(snapshot.usage.lastReasoningTokens)} | window ${formatNumber(snapshot.contextWindow)}`,
    `${paint('History', 'cyan')}  samples ${snapshot.history.sampleCount} | avg ${formatPercent(snapshot.history.recentAveragePct)} | max ${formatPercent(snapshot.history.recentMaxPct)} | hot55 ${snapshot.history.hot55Count} | hot65 ${snapshot.history.hot65Count} | streak55 ${snapshot.history.streak55}`,
    `${paint('Refresh', 'cyan')}  ${paint(snapshot.refresh.label, refreshColor)}${snapshot.refresh.label === 'new chat now' ? '' : ` | heuristic target ${snapshot.refresh.targetMinutes}m | eta ~${snapshot.refresh.remaining}m`} | ${snapshot.refresh.reason}`,
    `${paint('Usage', 'cyan')}    total session tokens ${formatNumber(snapshot.usage.totalTokens)} | rate ${formatPercent(snapshot.rateLimits.primaryUsedPercent)} / ${formatPercent(snapshot.rateLimits.secondaryUsedPercent)} | plan ${snapshot.rateLimits.planType || 'n/a'}`,
    `${paint('Config', 'cyan')}   fast ${snapshot.config.fastMode ? 'on' : 'off'} | cloud ${snapshot.config.codexCloudAccess || 'n/a'} | plugins ${snapshot.config.plugins.join(', ') || 'none'}`,
    `${paint('Shell', 'cyan')}    codex alias ${snapshot.shellDefaults.codexAlias || 'n/a'}`,
  ]

  console.log(lines.join('\n'))
}

function printSettings(snapshot) {
  const featureList = snapshot.features.length ? snapshot.features.join(', ') : 'n/a'
  const settings = {
    session_file: shortenHome(snapshot.sessionFile),
    thread_id: snapshot.session.threadId || null,
    cwd: snapshot.session.cwd || null,
    session_age_minutes: Math.round(snapshot.sessionAgeMin),
    session_last_updated_at: snapshot.sessionLastUpdatedAt,
    model: snapshot.session.model || null,
    reasoning_effort: snapshot.session.effort || null,
    model_provider: snapshot.session.modelProvider || null,
    cli_version: snapshot.session.cliVersion || null,
    approval_policy: snapshot.session.approvalPolicy || null,
    sandbox_type: snapshot.session.sandboxType || null,
    network_access: snapshot.session.networkAccess,
    collaboration_mode: snapshot.session.collaborationMode || null,
    truncation_mode: snapshot.session.truncationMode || null,
    truncation_limit: snapshot.session.truncationLimit || null,
    summary_mode: snapshot.session.summaryMode || null,
    realtime_active: snapshot.session.realtimeActive,
    context_window: snapshot.contextWindow,
    last_input_tokens: snapshot.usage.lastInputTokens,
    last_cached_input_tokens: snapshot.usage.lastCachedInputTokens,
    last_output_tokens: snapshot.usage.lastOutputTokens,
    last_reasoning_tokens: snapshot.usage.lastReasoningTokens,
    context_used_percent_proxy: Number.isFinite(snapshot.contextUsedPct) ? Number(snapshot.contextUsedPct.toFixed(2)) : null,
    context_free_percent_proxy: Number.isFinite(snapshot.contextFreePct) ? Number(snapshot.contextFreePct.toFixed(2)) : null,
    pressure_history: snapshot.history,
    refresh_heuristic: snapshot.refresh,
    total_session_tokens: snapshot.usage.totalTokens,
    rate_limits: snapshot.rateLimits,
    config_model: snapshot.config.model || null,
    config_reasoning_effort: snapshot.config.reasoningEffort || null,
    config_fast_mode: snapshot.config.fastMode,
    config_plugins: snapshot.config.plugins,
    composer_auto_context_enabled: snapshot.config.composerAutoContextEnabled,
    codex_cloud_access: snapshot.config.codexCloudAccess || null,
    shell_defaults: {
      codex_alias: snapshot.shellDefaults.codexAlias || null,
      bcrew_alias: snapshot.shellDefaults.bcrewAlias || null,
      search_enabled: snapshot.shellDefaults.searchEnabled,
      bypass_enabled: snapshot.shellDefaults.bypassEnabled,
      full_auto_enabled: snapshot.shellDefaults.fullAutoEnabled,
    },
    enabled_features: snapshot.features,
  }

  if (wantsJson) {
    console.log(JSON.stringify(settings, null, 2))
    return
  }

  console.log(`${paint('Codex Settings', 'bold')}`)
  console.log(JSON.stringify(settings, null, 2))
  console.log('')
  console.log(`${paint('Enabled features', 'cyan')} ${featureList}`)
}

const snapshot = buildSnapshot()

if (wantsSettings) {
  printSettings(snapshot)
} else if (wantsFull) {
  printFull(snapshot)
} else if (wantsJson) {
  console.log(JSON.stringify(snapshot, null, 2))
} else {
  printBar(snapshot)
}
