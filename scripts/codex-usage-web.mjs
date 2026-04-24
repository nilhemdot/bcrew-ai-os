#!/usr/bin/env node

import http from 'node:http'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { getUsageSummary, positiveInt } from './codex-usage.mjs'

const DEFAULT_PORT = 8787
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_DAYS = 7
const DEFAULT_SESSIONS = 10

function parseArgs(argv) {
  const args = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    days: DEFAULT_DAYS,
    sessions: DEFAULT_SESSIONS,
    open: false,
  }

  for (const arg of argv) {
    if (arg === '--open') args.open = true
    if (arg.startsWith('--host=')) args.host = arg.split('=').slice(1).join('=')
    if (arg.startsWith('--port=')) args.port = positiveInt(arg.split('=')[1], DEFAULT_PORT)
    if (arg.startsWith('--days=')) args.days = positiveInt(arg.split('=')[1], DEFAULT_DAYS)
    if (arg.startsWith('--sessions=')) args.sessions = positiveInt(arg.split('=')[1], DEFAULT_SESSIONS)
  }

  return args
}

function compactSummary(summary) {
  const focus = summary.focusedSession || null
  const latestUsage = focus?.latestUsage || null
  const lastTurn = latestUsage?.last_token_usage || null
  const contextWindow = latestUsage?.model_context_window || focus?.contextWindow || 0
  const contextTokens = lastTurn?.input_tokens || 0
  const contextUsedPercent = contextWindow ? (contextTokens / contextWindow) * 100 : 0

  return {
    generatedAt: summary.generatedAt,
    generatedAtLocal: summary.generatedAtLocal,
    timezone: summary.timezone,
    sessionsScanned: summary.sessionsScanned,
    rollingDays: summary.rollingDays,
    rollingTokens: summary.rollingTokens,
    dailyRows: summary.dailyRows,
    latestRateLimits: summary.latestRateLimits,
    focus: focus
      ? {
          id: focus.id,
          startedAt: focus.startedAt,
          updatedAt: focus.updatedAt,
          cwd: focus.cwd,
          model: focus.model,
          effort: focus.effort,
          contextWindow,
          contextTokens,
          contextUsedPercent,
          totalTokens: focus.totalTokens,
          inputTokens: focus.inputTokens,
          cachedInputTokens: focus.cachedInputTokens,
          outputTokens: focus.outputTokens,
          reasoningOutputTokens: focus.reasoningOutputTokens,
          lastTurn: lastTurn
            ? {
                inputTokens: lastTurn.input_tokens || 0,
                cachedInputTokens: lastTurn.cached_input_tokens || 0,
                outputTokens: lastTurn.output_tokens || 0,
                reasoningOutputTokens: lastTurn.reasoning_output_tokens || 0,
                totalTokens: lastTurn.total_tokens || 0,
              }
            : null,
        }
      : null,
    recentSessions: summary.recentSessions.map(session => ({
      id: session.id,
      updatedAt: session.updatedAt,
      cwd: session.cwd,
      model: session.model,
      effort: session.effort,
      totalTokens: session.totalTokens,
      contextWindow: session.latestUsage?.model_context_window || session.contextWindow || 0,
      contextTokens: session.latestUsage?.last_token_usage?.input_tokens || 0,
    })),
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function sendHtml(res) {
  const html = renderHtml()
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(html),
  })
  res.end(html)
}

function renderHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex Usage</title>
  <style>
    :root {
      --ink: #17211c;
      --muted: #617168;
      --paper: #f7f1e4;
      --card: rgba(255, 252, 244, 0.86);
      --line: rgba(34, 48, 41, 0.14);
      --good: #16805f;
      --watch: #c67b18;
      --hot: #b83b2d;
      --coal: #101714;
      --teal: #0f6d66;
      --gold: #d39a2d;
      --shadow: 0 22px 80px rgba(16, 23, 20, 0.18);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at 15% 10%, rgba(211, 154, 45, 0.30), transparent 30%),
        radial-gradient(circle at 80% 0%, rgba(15, 109, 102, 0.26), transparent 34%),
        linear-gradient(145deg, #f7f1e4 0%, #eadfc8 48%, #d7e1d4 100%);
      font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.32;
      background-image:
        linear-gradient(rgba(16, 23, 20, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 23, 20, 0.06) 1px, transparent 1px);
      background-size: 38px 38px;
      mask-image: linear-gradient(to bottom, #000, transparent 80%);
    }

    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 34px 0 48px;
      position: relative;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.4fr 0.8fr;
      gap: 22px;
      align-items: stretch;
      margin-bottom: 22px;
    }

    .panel {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 28px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .headline {
      padding: 30px;
      min-height: 230px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }

    .headline::after {
      content: "";
      position: absolute;
      width: 250px;
      height: 250px;
      right: -74px;
      bottom: -110px;
      border-radius: 50%;
      background: conic-gradient(from 130deg, rgba(15, 109, 102, 0.12), rgba(211, 154, 45, 0.32), rgba(16, 23, 20, 0.08));
    }

    .eyebrow {
      color: var(--teal);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 12px 0 8px;
      font-size: clamp(42px, 7vw, 82px);
      line-height: 0.88;
      letter-spacing: -0.07em;
      max-width: 780px;
    }

    .sub {
      max-width: 660px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.5;
    }

    .updated {
      align-self: flex-start;
      padding: 10px 14px;
      border-radius: 999px;
      color: #f7f1e4;
      background: var(--coal);
      font-size: 13px;
      font-weight: 700;
    }

    .rate-stack {
      display: grid;
      gap: 16px;
    }

    .rate-card {
      padding: 22px;
      min-height: 107px;
    }

    .rate-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 14px;
    }

    .label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .big-number {
      font-size: clamp(32px, 5vw, 54px);
      font-weight: 900;
      letter-spacing: -0.06em;
      font-variant-numeric: tabular-nums;
    }

    .bar {
      width: 100%;
      height: 12px;
      margin: 14px 0 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(16, 23, 20, 0.10);
    }

    .fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--good), var(--gold), var(--hot));
      transition: width 360ms ease;
    }

    .meta {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 22px;
    }

    .metric {
      padding: 22px;
      min-height: 150px;
    }

    .metric .value {
      margin-top: 14px;
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 900;
      letter-spacing: -0.05em;
      font-variant-numeric: tabular-nums;
    }

    .wide {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 16px;
    }

    .chart-card,
    .session-card {
      padding: 24px;
    }

    .chart {
      display: grid;
      gap: 12px;
      margin-top: 18px;
    }

    .day {
      display: grid;
      grid-template-columns: 104px 1fr 108px;
      gap: 12px;
      align-items: center;
      font-size: 13px;
      color: var(--muted);
    }

    .day-track {
      height: 18px;
      border-radius: 999px;
      background: rgba(16, 23, 20, 0.10);
      overflow: hidden;
    }

    .day-fill {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, #0f6d66, #d39a2d);
      transition: width 360ms ease;
    }

    .sessions {
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }

    .session-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
    }

    .session-row:first-child { border-top: 0; }
    .session-title {
      font-weight: 850;
      letter-spacing: -0.02em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-id {
      color: var(--muted);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .token-pill {
      align-self: start;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(15, 109, 102, 0.10);
      color: var(--teal);
      font-size: 12px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }

    .foot {
      margin-top: 18px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .error {
      display: none;
      margin-bottom: 18px;
      padding: 14px 16px;
      border-radius: 18px;
      color: #fff6ed;
      background: #9b2c22;
      font-weight: 800;
    }

    @media (max-width: 900px) {
      .hero,
      .wide {
        grid-template-columns: 1fr;
      }

      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 560px) {
      .shell {
        width: min(100vw - 20px, 1180px);
        padding-top: 16px;
      }

      .headline,
      .rate-card,
      .metric,
      .chart-card,
      .session-card {
        border-radius: 22px;
        padding: 18px;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .day {
        grid-template-columns: 82px 1fr;
      }

      .day .day-value {
        grid-column: 2;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div id="error" class="error"></div>
    <section class="hero">
      <div class="panel headline">
        <div>
          <div class="eyebrow">Local Codex Usage</div>
          <h1>Burn rate without the web UI.</h1>
          <p class="sub">Reads local Codex session metadata from this machine. Nothing is sent anywhere. Refreshes every 10 seconds.</p>
        </div>
        <div id="updated" class="updated">Loading...</div>
      </div>

      <div class="rate-stack">
        <div class="panel rate-card">
          <div class="rate-top">
            <div class="label">5 hour window</div>
            <div id="primaryPct" class="big-number">--</div>
          </div>
          <div class="bar"><div id="primaryFill" class="fill"></div></div>
          <div id="primaryMeta" class="meta">Loading rate limit...</div>
        </div>
        <div class="panel rate-card">
          <div class="rate-top">
            <div class="label">7 day window</div>
            <div id="secondaryPct" class="big-number">--</div>
          </div>
          <div class="bar"><div id="secondaryFill" class="fill"></div></div>
          <div id="secondaryMeta" class="meta">Loading rate limit...</div>
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel metric">
        <div class="label">Context used</div>
        <div id="contextValue" class="value">--</div>
        <div class="bar"><div id="contextFill" class="fill"></div></div>
        <div id="contextMeta" class="meta">Latest updated session</div>
      </div>
      <div class="panel metric">
        <div class="label">Last turn</div>
        <div id="lastTurnValue" class="value">--</div>
        <div id="lastTurnMeta" class="meta">Tokens burned in the latest turn</div>
      </div>
      <div class="panel metric">
        <div class="label">Session total</div>
        <div id="sessionValue" class="value">--</div>
        <div id="sessionMeta" class="meta">Across the latest session</div>
      </div>
      <div class="panel metric">
        <div class="label">7 day volume</div>
        <div id="rollingValue" class="value">--</div>
        <div id="rollingMeta" class="meta">Local token metadata</div>
      </div>
    </section>

    <section class="wide">
      <div class="panel chart-card">
        <div class="label">Daily token volume</div>
        <div id="chart" class="chart"></div>
        <div class="foot">This is CLI session token volume, not billing dollars. Cached input is counted because Codex reports it in token events.</div>
      </div>
      <div class="panel session-card">
        <div class="label">Recent sessions</div>
        <div id="sessions" class="sessions"></div>
        <div class="foot">If multiple chats are open, the “latest” session is whichever terminal wrote a token event most recently.</div>
      </div>
    </section>
  </main>

  <script>
    const refreshMs = 10000

    function number(value) {
      if (!Number.isFinite(value)) return '--'
      if (Math.abs(value) >= 1000000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: 'compact' }).format(value)
      return new Intl.NumberFormat('en-US').format(Math.round(value))
    }

    function exact(value) {
      if (!Number.isFinite(value)) return '--'
      return new Intl.NumberFormat('en-US').format(Math.round(value))
    }

    function pct(value) {
      if (!Number.isFinite(value)) return '--'
      return value.toFixed(value >= 10 ? 0 : 1) + '%'
    }

    function localTime(value) {
      if (!value) return 'unknown'
      return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    function resetText(limit) {
      if (!limit?.resets_at) return 'reset unknown'
      const reset = new Date(limit.resets_at * 1000)
      const diff = Math.max(0, reset.getTime() - Date.now())
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const relative = hours ? hours + 'h ' + mins + 'm' : mins + 'm'
      return 'resets ' + localTime(reset.toISOString()) + ' (' + relative + ')'
    }

    function setText(id, value) {
      document.getElementById(id).textContent = value
    }

    function setWidth(id, value) {
      document.getElementById(id).style.width = Math.max(0, Math.min(100, value || 0)) + '%'
    }

    function renderRate(id, limit) {
      const used = Number(limit?.used_percent || 0)
      setText(id + 'Pct', pct(used))
      setWidth(id + 'Fill', used)
      setText(id + 'Meta', pct(Math.max(0, 100 - used)) + ' left, ' + resetText(limit))
    }

    function renderChart(rows) {
      const chart = document.getElementById('chart')
      const max = Math.max(...rows.map(row => row.tokens), 1)
      chart.innerHTML = rows.map(row => {
        const width = (row.tokens / max) * 100
        return '<div class="day">' +
          '<div>' + row.day.slice(5) + '</div>' +
          '<div class="day-track"><div class="day-fill" style="width:' + width + '%"></div></div>' +
          '<div class="day-value">' + number(row.tokens) + '</div>' +
        '</div>'
      }).join('')
    }

    function renderSessions(rows) {
      const sessions = document.getElementById('sessions')
      sessions.innerHTML = rows.map(row => {
        const model = [row.model, row.effort].filter(Boolean).join(' / ') || 'unknown'
        return '<div class="session-row">' +
          '<div>' +
            '<div class="session-title">' + model + ' · ' + localTime(row.updatedAt) + '</div>' +
            '<div class="session-id">' + row.id + '</div>' +
          '</div>' +
          '<div class="token-pill">' + number(row.totalTokens) + '</div>' +
        '</div>'
      }).join('')
    }

    async function refresh() {
      const error = document.getElementById('error')
      try {
        const response = await fetch('/api/usage?days=7&sessions=8', { cache: 'no-store' })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const data = await response.json()
        const focus = data.focus
        const primary = data.latestRateLimits?.primary
        const secondary = data.latestRateLimits?.secondary

        error.style.display = 'none'
        setText('updated', 'Updated ' + data.generatedAtLocal + ' · plan ' + (data.latestRateLimits?.plan_type || 'unknown'))
        renderRate('primary', primary)
        renderRate('secondary', secondary)

        setText('contextValue', pct(focus?.contextUsedPercent || 0))
        setWidth('contextFill', focus?.contextUsedPercent || 0)
        setText('contextMeta', exact(focus?.contextTokens || 0) + ' / ' + exact(focus?.contextWindow || 0) + ' input tokens')
        setText('lastTurnValue', number(focus?.lastTurn?.totalTokens || 0))
        setText('lastTurnMeta', exact(focus?.lastTurn?.inputTokens || 0) + ' input · ' + exact(focus?.lastTurn?.outputTokens || 0) + ' output')
        setText('sessionValue', number(focus?.totalTokens || 0))
        setText('sessionMeta', exact(focus?.cachedInputTokens || 0) + ' cached input tokens')
        setText('rollingValue', number(data.rollingTokens || 0))
        setText('rollingMeta', 'Last ' + data.rollingDays + ' days · ' + data.sessionsScanned + ' sessions scanned')

        renderChart(data.dailyRows || [])
        renderSessions(data.recentSessions || [])
      } catch (err) {
        error.style.display = 'block'
        error.textContent = 'Could not load Codex usage: ' + err.message
      }
    }

    refresh()
    setInterval(refresh, refreshMs)
  </script>
</body>
</html>`
}

async function handleRequest(req, res, defaults) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/') {
    sendHtml(res)
    return
  }

  if (url.pathname === '/api/usage') {
    try {
      const summary = await getUsageSummary({
        days: positiveInt(url.searchParams.get('days'), defaults.days),
        sessions: positiveInt(url.searchParams.get('sessions'), defaults.sessions),
        threadId: url.searchParams.get('threadId') || '',
      })
      sendJson(res, 200, compactSummary(summary))
    } catch (error) {
      sendJson(res, 500, { error: error.message })
    }
    return
  }

  sendJson(res, 404, { error: 'not found' })
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { stdio: 'ignore', detached: true })
  child.unref()
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const server = http.createServer((req, res) => {
    handleRequest(req, res, args).catch(error => {
      sendJson(res, 500, { error: error.message })
    })
  })

  server.listen(args.port, args.host, () => {
    const url = `http://${args.host}:${args.port}`
    console.log(`Codex usage dashboard: ${url}`)
    console.log('Press Ctrl-C to stop.')
    if (args.open) openBrowser(url)
  })
}

main()
