import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const BUILD_LANE_FAILURE_TELEMETRY_CARD_ID = 'BUILD-LANE-FAILURE-TELEMETRY-001'
export const BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY = 'build-lane-failure-telemetry-v1'
export const BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH = 'docs/process/build-lane-failure-telemetry-001-plan.md'
export const BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-FAILURE-TELEMETRY-001.json'
export const BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-failure-telemetry-closeout.md'
export const BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH = 'scripts/process-build-lane-failure-telemetry-check.mjs'
export const BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID = 'build-lane-failure-telemetry-2026-05-18'
export const BUILD_LANE_FAILURE_TELEMETRY_LOCAL_LOG_PATH = '.git/foundation-build-lane-failure-telemetry.jsonl'
export const BUILD_LANE_FAILURE_TELEMETRY_LOCAL_SUMMARY_PATH = '.git/foundation-build-lane-failure-summary.json'
export const BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD = 3
export const BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD = 5

export const BUILD_LANE_FAILURE_TELEMETRY_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'No Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not weaken, skip, or demote any verifier failure.',
]

export const BUILD_LANE_FAILURE_TELEMETRY_PROOF_COMMANDS = [
  'node --check lib/build-lane-failure-telemetry.js scripts/process-build-lane-failure-telemetry-check.mjs lib/foundation-system-health.js scripts/process-foundation-ship.mjs',
  'npm run process:build-lane-failure-telemetry-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=BUILD-LANE-FAILURE-TELEMETRY-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-FAILURE-TELEMETRY-001.json --closeoutKey=build-lane-failure-telemetry-v1 --commitRef=HEAD',
]

export const BUILD_LANE_FAILURE_TELEMETRY_CHANGED_FILES = [
  'lib/build-lane-failure-telemetry.js',
  'lib/foundation-system-health.js',
  'lib/foundation-verifier-health-live-summary.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'public/foundation-runtime-renderers.js',
  'scripts/process-foundation-ship.mjs',
  'scripts/process-ship-check.mjs',
  'scripts/process-fanout-check.mjs',
  'scripts/process-post-ship-fanout.mjs',
  'scripts/backlog-hygiene.mjs',
  'scripts/process-build-lane-failure-telemetry-check.mjs',
  'package.json',
  BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH,
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[`"'()[\]{}]/g, '')
    .replace(/[^a-z0-9._:/-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(value) {
  return (toDate(value) || new Date()).toISOString()
}

function compactDetail(value, maxLength = 360) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function inferFailureClass({ command = '', checkName = '', detail = '', output = '' } = {}) {
  const text = [command, checkName, detail, output].map(value => normalizeText(value).toLowerCase()).join('\n')
  if (/plan critic|thin plan|approved plan hash|approval digest|approval validates/.test(text)) return 'plan_critic_or_approval'
  if (/snapshot|live api|control-loop|control loop|verifier bundle|bundle path|route returns|review items|sees 0|wiring|handoff/.test(text)) return 'verifier_snapshot_wiring'
  if (/served code|served-code|served commit|recent builds|fanout|dashboard served|repo head/.test(text)) return 'served_code_fanout_sync'
  if (/backlog hygiene|stale card|duplicate card|missing card|thin card/.test(text)) return 'backlog_hygiene'
  if (/timeout|deadlock|econnreset|etimedout|quota|rate limit|429/.test(text)) return 'transient_infrastructure'
  if (/foundation:verify|verifier|fail /.test(text)) return 'verifier_check_failure'
  return 'unclassified_build_lane_failure'
}

function inferFileModule({ failureClass = '', checkName = '', detail = '', output = '' } = {}) {
  const text = [checkName, detail, output].map(normalizeText).join('\n')
  const fileMatch = text.match(/\b(?:lib|scripts|public|docs)\/[A-Za-z0-9._/-]+\.(?:js|mjs|json|md|html|css)\b/)
  if (fileMatch) return fileMatch[0]
  if (failureClass === 'verifier_snapshot_wiring') return 'verifier_snapshot_wiring'
  if (failureClass === 'plan_critic_or_approval') return 'plan_critic_or_approval'
  if (failureClass === 'served_code_fanout_sync') return 'served_code_fanout_sync'
  if (failureClass === 'backlog_hygiene') return 'backlog_hygiene'
  return 'unknown'
}

export function buildBuildLaneFailureEvent(input = {}) {
  const command = normalizeText(input.command || input.parentCommand || 'unknown')
  const checkName = normalizeText(input.checkName || input.check || input.stepLabel || input.commandLabel || 'unknown failure')
  const shortDetail = compactDetail(input.detail || input.firstFailedLine || input.errorMessage || input.output || '')
  const failureClass = normalizeText(input.failureClass) || inferFailureClass({
    command,
    checkName,
    detail: shortDetail,
    output: input.output,
  })
  const fileModule = normalizeText(input.fileModule || input.filePath) || inferFileModule({
    failureClass,
    checkName,
    detail: shortDetail,
    output: input.output,
  })
  const fingerprintSeed = [
    normalizeKey(command),
    normalizeKey(failureClass),
    normalizeKey(checkName),
    normalizeKey(fileModule),
  ].join('|')
  const occurredAt = isoDate(input.occurredAt || new Date())
  return {
    eventVersion: 1,
    eventId: `build-lane-failure:${sha256(`${fingerprintSeed}|${occurredAt}|${shortDetail}`).slice(0, 16)}`,
    command,
    parentCommand: normalizeText(input.parentCommand || ''),
    cardId: normalizeText(input.cardId || ''),
    sprintId: normalizeText(input.sprintId || ''),
    closeoutKey: normalizeText(input.closeoutKey || ''),
    checkName,
    failureClass,
    fileModule,
    shortDetail,
    firstFailedLine: compactDetail(input.firstFailedLine || shortDetail),
    occurredAt,
    fingerprint: sha256(fingerprintSeed).slice(0, 24),
    fingerprintSeed,
    source: normalizeText(input.source || 'build_lane_failure_telemetry'),
  }
}

export function extractBuildLaneFailureEventsFromChecks({
  checks = [],
  command = '',
  parentCommand = '',
  cardId = '',
  sprintId = '',
  closeoutKey = '',
  occurredAt = new Date(),
} = {}) {
  return (Array.isArray(checks) ? checks : [])
    .filter(check => check && check.ok !== true)
    .map(check => buildBuildLaneFailureEvent({
      command,
      parentCommand,
      cardId,
      sprintId,
      closeoutKey,
      checkName: check.check || check.name || 'failed check',
      detail: check.detail || check.message || '',
      occurredAt,
      source: 'check_array',
    }))
}

export function extractBuildLaneFailureEventsFromOutput({
  output = '',
  command = '',
  parentCommand = '',
  cardId = '',
  sprintId = '',
  closeoutKey = '',
  occurredAt = new Date(),
  maxEvents = 20,
} = {}) {
  const lines = String(output || '').split(/\r?\n/)
  const failedLines = []
  for (const line of lines) {
    const trimmed = normalizeText(line)
    if (!trimmed) continue
    if (/^(FAIL|ERROR)\s+/i.test(trimmed) || /failed\.?$/i.test(trimmed) || /failed:/i.test(trimmed)) {
      failedLines.push(trimmed)
    }
  }
  const selected = failedLines.length ? failedLines.slice(0, maxEvents) : lines.map(compactDetail).filter(Boolean).slice(-1)
  return selected.map(line => {
    const withoutPrefix = line.replace(/^(FAIL|ERROR)\s+/i, '')
    const [checkName, ...detailParts] = withoutPrefix.split(' -> ')
    return buildBuildLaneFailureEvent({
      command,
      parentCommand,
      cardId,
      sprintId,
      closeoutKey,
      checkName: checkName || command || 'failed command',
      detail: detailParts.join(' -> ') || line,
      firstFailedLine: line,
      occurredAt,
      source: 'command_output',
    })
  })
}

export function buildBuildLaneFailureEventsFromError({
  error,
  command = '',
  parentCommand = '',
  cardId = '',
  sprintId = '',
  closeoutKey = '',
  occurredAt = new Date(),
} = {}) {
  const output = [
    error?.stdout,
    error?.stderr,
    error?.message,
  ].filter(Boolean).join('\n')
  const events = extractBuildLaneFailureEventsFromOutput({
    output,
    command: normalizeText(error?.stepLabel || error?.commandLabel || command),
    parentCommand,
    cardId,
    sprintId,
    closeoutKey,
    occurredAt,
  })
  return events.length ? events : [buildBuildLaneFailureEvent({
    command,
    parentCommand,
    cardId,
    sprintId,
    closeoutKey,
    checkName: error?.stepLabel || error?.commandLabel || command || 'failed command',
    detail: error?.message || String(error || 'unknown failure'),
    occurredAt,
    source: 'error_object',
  })]
}

function resolveTelemetryPath(repoRoot, relativePath) {
  const root = path.resolve(repoRoot || process.cwd())
  const absolutePath = path.resolve(root, relativePath)
  if (!absolutePath.startsWith(root)) throw new Error(`Telemetry path must stay inside repo: ${relativePath}`)
  return absolutePath
}

export function readBuildLaneFailureTelemetryEvents({ repoRoot = process.cwd(), logPath = BUILD_LANE_FAILURE_TELEMETRY_LOCAL_LOG_PATH } = {}) {
  const absolutePath = resolveTelemetryPath(repoRoot, logPath)
  try {
    return fs.readFileSync(absolutePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .filter(event => event && event.fingerprint)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    return []
  }
}

export function buildBuildLaneFailureTelemetrySnapshot({ events = [], now = new Date() } = {}) {
  const current = toDate(now) || new Date()
  const window24Ms = 24 * 60 * 60 * 1000
  const window7Ms = 7 * window24Ms
  const recentEvents = (Array.isArray(events) ? events : [])
    .map(event => ({ ...event, occurredDate: toDate(event.occurredAt) }))
    .filter(event => event.occurredDate && current.getTime() - event.occurredDate.getTime() <= window7Ms)
  const groups = new Map()
  for (const event of recentEvents) {
    const key = event.fingerprint
    if (!groups.has(key)) {
      groups.set(key, {
        fingerprint: key,
        failureClass: event.failureClass || 'unclassified_build_lane_failure',
        command: event.command || 'unknown',
        checkName: event.checkName || 'unknown failure',
        fileModule: event.fileModule || 'unknown',
        events: [],
        cardIds: new Set(),
        commands: new Set(),
      })
    }
    const group = groups.get(key)
    group.events.push(event)
    if (event.cardId) group.cardIds.add(event.cardId)
    if (event.command) group.commands.add(event.command)
  }

  const fingerprints = Array.from(groups.values()).map(group => {
    const count24h = group.events.filter(event => current.getTime() - event.occurredDate.getTime() <= window24Ms).length
    const count7d = group.events.length
    const firstSeenAt = group.events
      .map(event => event.occurredDate)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    const lastSeenAt = group.events
      .map(event => event.occurredDate)
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const cardIds = Array.from(group.cardIds).sort()
    const commands = Array.from(group.commands).sort()
    const status = count24h >= BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD ||
      (cardIds.length > 1 && count7d >= 2)
      ? 'risk'
      : count24h >= BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD
        ? 'watch'
        : 'healthy'
    return {
      fingerprint: group.fingerprint,
      status,
      failureClass: group.failureClass,
      command: group.command,
      checkName: group.checkName,
      fileModule: group.fileModule,
      count24h,
      count7d,
      cardIds,
      commands,
      firstSeenAt: firstSeenAt.toISOString(),
      lastSeenAt: lastSeenAt.toISOString(),
      latestDetail: group.events[group.events.length - 1]?.shortDetail || '',
      nextAction: status === 'risk'
        ? `Create or attach a repair card for ${group.failureClass}; do not keep hand-fixing this repeated failure.`
        : status === 'watch'
          ? `Watch ${group.failureClass}; one more repeat should become repair work.`
          : 'No repair card required unless it repeats.',
    }
  }).sort((left, right) => {
    const rank = { risk: 0, watch: 1, healthy: 2 }
    const byRank = (rank[left.status] ?? 9) - (rank[right.status] ?? 9)
    if (byRank !== 0) return byRank
    return right.count24h - left.count24h
  })
  const riskRows = fingerprints.filter(row => row.status === 'risk')
  const watchRows = fingerprints.filter(row => row.status === 'watch')
  return {
    generatedAt: current.toISOString(),
    cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
    status: riskRows.length ? 'risk' : watchRows.length ? 'watch' : 'healthy',
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    writesSourceSystems: false,
    summary: {
      eventCount7d: recentEvents.length,
      fingerprintCount: fingerprints.length,
      redFingerprintCount: riskRows.length,
      yellowFingerprintCount: watchRows.length,
      oneOffFingerprintCount: fingerprints.filter(row => row.status === 'healthy').length,
      warningThreshold24h: BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD,
      riskThreshold24h: BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD,
    },
    fingerprints,
    topFindings: [...riskRows, ...watchRows].slice(0, 10).map(row => ({
      id: `build_lane_failure_${row.fingerprint}`,
      severity: row.status === 'risk' ? 'P0' : 'P1',
      status: row.status,
      title: `${row.failureClass} repeated in the build lane`,
      detail: `${row.count24h} repeats in 24h, ${row.count7d} in 7d. Latest: ${row.latestDetail || row.checkName}.`,
      nextAction: row.nextAction,
      fingerprint: row.fingerprint,
      commands: row.commands,
      cardIds: row.cardIds,
    })),
    plainEnglish: riskRows.length
      ? `${riskRows.length} repeated build-lane failure fingerprint(s) are red. Stop hand-fixing and route a repair card.`
      : watchRows.length
        ? `${watchRows.length} build-lane failure fingerprint(s) are repeating and should be watched.`
        : 'No repeated build-lane failure fingerprints are above threshold.',
  }
}

export function writeBuildLaneFailureTelemetrySummary({ repoRoot = process.cwd(), snapshot } = {}) {
  const absolutePath = resolveTelemetryPath(repoRoot, BUILD_LANE_FAILURE_TELEMETRY_LOCAL_SUMMARY_PATH)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
}

export function recordBuildLaneFailureEvents(events = [], { repoRoot = process.cwd() } = {}) {
  const normalizedEvents = (Array.isArray(events) ? events : []).filter(Boolean)
  if (!normalizedEvents.length) {
    return buildBuildLaneFailureTelemetrySnapshot({
      events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
    })
  }
  const absolutePath = resolveTelemetryPath(repoRoot, BUILD_LANE_FAILURE_TELEMETRY_LOCAL_LOG_PATH)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.appendFileSync(absolutePath, normalizedEvents.map(event => JSON.stringify(event)).join('\n') + '\n', 'utf8')
  const snapshot = buildBuildLaneFailureTelemetrySnapshot({
    events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
  })
  writeBuildLaneFailureTelemetrySummary({ repoRoot, snapshot })
  return snapshot
}

export function recordBuildLaneFailureEventsFromChecks({ checks = [], repoRoot = process.cwd(), ...context } = {}) {
  const events = extractBuildLaneFailureEventsFromChecks({ checks, ...context })
  return recordBuildLaneFailureEvents(events, { repoRoot })
}

export function recordBuildLaneFailureEventsFromError({ error, repoRoot = process.cwd(), ...context } = {}) {
  const events = buildBuildLaneFailureEventsFromError({ error, ...context })
  return recordBuildLaneFailureEvents(events, { repoRoot })
}

export function readBuildLaneFailureTelemetrySnapshot({ repoRoot = process.cwd(), now = new Date() } = {}) {
  return buildBuildLaneFailureTelemetrySnapshot({
    events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
    now,
  })
}

export function buildBuildLaneFailureTelemetryDogfoodProof() {
  const now = new Date('2026-05-18T06:00:00.000Z')
  const repeatedVerifier = Array.from({ length: 3 }, (_, index) => buildBuildLaneFailureEvent({
    command: 'foundation:verify',
    cardId: 'ACTION-ROUTE-REVIEW-INBOX-001',
    sprintId: 'synthetic',
    checkName: 'Action Route Review Inbox verifier bundle sees review items',
    detail: `Live route returns 48 review items but verifier bundle sees 0. Attempt ${index + 1}.`,
    occurredAt: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000),
  }))
  const repeatedPlan = Array.from({ length: 5 }, (_, index) => buildBuildLaneFailureEvent({
    command: 'process:plan-critic',
    cardId: 'SYNTHETIC-THIN-PLAN-001',
    sprintId: 'synthetic',
    checkName: 'Plan Critic rejects thin plan',
    detail: `Plan is missing gate decision and proof loop. Attempt ${index + 1}.`,
    occurredAt: new Date(now.getTime() - (index + 1) * 30 * 60 * 1000),
  }))
  const oneOff = buildBuildLaneFailureEvent({
    command: 'process:ship-check',
    cardId: 'SYNTHETIC-ONE-OFF-001',
    sprintId: 'synthetic',
    checkName: 'Transient one-off failure',
    detail: 'A single non-repeating failure should not escalate.',
    failureClass: 'transient_infrastructure',
    occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  })
  const multiCardA = buildBuildLaneFailureEvent({
    command: 'process:foundation-ship',
    cardId: 'SYNTHETIC-A-001',
    sprintId: 'synthetic',
    checkName: 'Recent Builds exposes this closeout',
    detail: 'Served API did not expose local closeout.',
    occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  })
  const multiCardB = buildBuildLaneFailureEvent({
    command: 'process:foundation-ship',
    cardId: 'SYNTHETIC-B-001',
    sprintId: 'synthetic',
    checkName: 'Recent Builds exposes this closeout',
    detail: 'Served API did not expose local closeout.',
    occurredAt: new Date(now.getTime() - 90 * 60 * 1000),
  })
  const snapshot = buildBuildLaneFailureTelemetrySnapshot({
    events: [...repeatedVerifier, ...repeatedPlan, oneOff, multiCardA, multiCardB],
    now,
  })
  const verifierGroup = snapshot.fingerprints.find(row => row.failureClass === 'verifier_snapshot_wiring')
  const planGroup = snapshot.fingerprints.find(row => row.failureClass === 'plan_critic_or_approval')
  const oneOffGroup = snapshot.fingerprints.find(row => row.checkName === 'Transient one-off failure')
  const fanoutGroup = snapshot.fingerprints.find(row => row.failureClass === 'served_code_fanout_sync')
  return {
    ok: snapshot.status === 'risk' &&
      verifierGroup?.status === 'watch' &&
      verifierGroup.count24h === 3 &&
      planGroup?.status === 'risk' &&
      planGroup.count24h === 5 &&
      oneOffGroup?.status === 'healthy' &&
      fanoutGroup?.status === 'risk' &&
      fanoutGroup.cardIds.length === 2 &&
      snapshot.topFindings.some(finding => finding.nextAction.includes('repair card')),
    snapshot,
    invariant: 'Repeated build-lane failures are fingerprinted; 3 repeats in 24h are yellow, 5 repeats or multiple-card blocking are red, and one-off failures stay non-escalated.',
  }
}
