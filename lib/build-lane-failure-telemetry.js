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
export const BUILD_LANE_FAILURE_TELEMETRY_SHIP_PROOF_PATH = '.git/foundation-ship-proof.json'
export const BUILD_LANE_FAILURE_TELEMETRY_INFLIGHT_SHIP_PROOF_ENV = 'BCREW_FOUNDATION_SHIP_INFLIGHT_PROOF'
export const BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD = 3
export const BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD = 5
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CARD_ID = 'BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_KEY = 'build-lane-telemetry-resolution-repair-v1'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PLAN_PATH = 'docs/process/build-lane-telemetry-resolution-repair-001-plan.md'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001.json'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-telemetry-resolution-repair-closeout.md'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SCRIPT_PATH = 'scripts/process-build-lane-telemetry-resolution-repair-check.mjs'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SPRINT_ID = 'build-lane-telemetry-resolution-repair-2026-05-18'

export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PROOF_COMMANDS = [
  'node --check lib/build-lane-failure-telemetry.js lib/foundation-system-health.js scripts/process-build-lane-failure-telemetry-check.mjs scripts/process-build-lane-telemetry-resolution-repair-check.mjs',
  'npm run process:build-lane-telemetry-resolution-repair-check -- --close-card --json',
  'npm run process:build-lane-failure-telemetry-check -- --json',
  'npm run process:fanout-check -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --closeoutKey=foundation-db-schema-seed-split-v1',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001.json --closeoutKey=build-lane-telemetry-resolution-repair-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001 --closeoutKey=build-lane-telemetry-resolution-repair-v1',
  'npm run process:foundation-ship -- --card=BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001.json --closeoutKey=build-lane-telemetry-resolution-repair-v1 --commitRef=HEAD',
]

export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CHANGED_FILES = [
  'lib/build-lane-failure-telemetry.js',
  'lib/foundation-system-health.js',
  'scripts/process-build-lane-failure-telemetry-check.mjs',
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SCRIPT_PATH,
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PLAN_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_APPROVAL_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_PATH,
]

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

function latestDate(values = []) {
  return values
    .map(toDate)
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null
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
    const passedLine = /^PASS\s+/i.test(trimmed)
    if (/^(FAIL|ERROR)\s+/i.test(trimmed) || (!passedLine && (/^Command failed:/i.test(trimmed) || /failed\.?$/i.test(trimmed) || /failed:/i.test(trimmed)))) {
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

export function readBuildLaneFailureTelemetryShipProofs({ repoRoot = process.cwd(), proofPath = BUILD_LANE_FAILURE_TELEMETRY_SHIP_PROOF_PATH } = {}) {
  const absolutePath = resolveTelemetryPath(repoRoot, proofPath)
  const inflightProofs = readInflightShipProofsFromEnv()
  try {
    const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
    return (Array.isArray(payload?.proofs) ? payload.proofs : [])
      .map(proof => ({
        ...proof,
        passedDate: toDate(proof?.passedAt),
      }))
      .filter(proof => proof.passedDate)
      .concat(inflightProofs)
  } catch (error) {
    if (error?.code === 'ENOENT') return inflightProofs
    return inflightProofs
  }
}

function readInflightShipProofsFromEnv(now = new Date()) {
  const raw = normalizeText(process.env[BUILD_LANE_FAILURE_TELEMETRY_INFLIGHT_SHIP_PROOF_ENV])
  if (!raw) return []
  try {
    const payload = JSON.parse(raw)
    const proof = Array.isArray(payload) ? payload[0] : payload
    const passedDate = toDate(proof?.passedAt)
    const expiresAt = toDate(proof?.expiresAt)
    if (!proof || !passedDate || !expiresAt || expiresAt.getTime() <= now.getTime()) return []
    if (!normalizeText(proof.cardId) || !normalizeText(proof.closeoutKey) || !normalizeText(proof.commitSha)) return []
    return [{
      ...proof,
      source: 'inflight_foundation_ship_fanout_clean',
      resolutionReason: 'inflight_foundation_ship_after_fanout',
      passedDate,
    }]
  } catch {
    return []
  }
}

function buildResolvedEventPredicate({ shipProofs = [] } = {}) {
  const latestShipProofDate = latestDate(shipProofs.map(proof => proof.passedAt))
  return event => {
    const eventDate = toDate(event?.occurredAt)
    if (!eventDate || !latestShipProofDate) return null
    if (eventDate.getTime() >= latestShipProofDate.getTime()) return null
    return {
      resolved: true,
      resolvedAt: latestShipProofDate.toISOString(),
      resolutionReason: 'later_successful_foundation_ship',
      resolutionDetail: 'A later process:foundation-ship proof passed after this failure event. New repeats after that proof still fail normally.',
    }
  }
}

export function buildBuildLaneFailureTelemetrySnapshot({ events = [], now = new Date(), shipProofs = [] } = {}) {
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

  const resolveEvent = buildResolvedEventPredicate({ shipProofs })
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
    const eventResolutions = group.events.map(resolveEvent)
    const resolved = eventResolutions.length > 0 && eventResolutions.every(Boolean)
    const latestResolution = latestDate(eventResolutions.map(row => row?.resolvedAt))
    const status = resolved
      ? 'resolved'
      : count24h >= BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD ||
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
      resolved,
      resolvedAt: latestResolution ? latestResolution.toISOString() : null,
      resolutionReason: resolved ? 'later_successful_foundation_ship' : '',
      nextAction: status === 'risk'
        ? `Create or attach a repair card for ${group.failureClass}; do not keep hand-fixing this repeated failure.`
        : status === 'watch'
          ? `Watch ${group.failureClass}; one more repeat should become repair work.`
          : status === 'resolved'
            ? 'Resolved by a later successful Foundation ship proof; reopen only if the fingerprint repeats after that proof.'
          : 'No repair card required unless it repeats.',
    }
  }).sort((left, right) => {
    const rank = { risk: 0, watch: 1, healthy: 2, resolved: 3 }
    const byRank = (rank[left.status] ?? 9) - (rank[right.status] ?? 9)
    if (byRank !== 0) return byRank
    return right.count24h - left.count24h
  })
  const riskRows = fingerprints.filter(row => row.status === 'risk')
  const watchRows = fingerprints.filter(row => row.status === 'watch')
  const resolvedRows = fingerprints.filter(row => row.status === 'resolved')
  const unresolvedRows = fingerprints.filter(row => row.status !== 'resolved')
  const unresolvedEvents = recentEvents.filter(event => !resolveEvent(event))
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
      eventCount7d: unresolvedEvents.length,
      rawEventCount7d: recentEvents.length,
      fingerprintCount: unresolvedRows.length,
      rawFingerprintCount: fingerprints.length,
      redFingerprintCount: riskRows.length,
      yellowFingerprintCount: watchRows.length,
      oneOffFingerprintCount: unresolvedRows.filter(row => row.status === 'healthy').length,
      resolvedEventCount7d: recentEvents.length - unresolvedEvents.length,
      resolvedFingerprintCount: resolvedRows.length,
      latestResolutionProofAt: latestDate(shipProofs.map(proof => proof.passedAt))?.toISOString() || null,
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
  let actionGate = snapshot?.actionGate || null
  if (!actionGate) {
    try {
      const existing = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
      if (existing?.actionGate) {
        const latestShipProofAt = snapshot?.summary?.latestResolutionProofAt ||
          existing.actionGate?.summary?.latestShipProofAt ||
          null
        actionGate = {
          ...existing.actionGate,
          generatedAt: snapshot?.generatedAt || existing.actionGate.generatedAt || null,
          summary: {
            ...(existing.actionGate.summary || {}),
            latestShipProofAt,
          },
          preservedAfterTelemetrySummaryRefresh: true,
          preservedForTelemetryGeneratedAt: snapshot?.generatedAt || null,
        }
      }
    } catch {}
  }
  const payload = actionGate && !snapshot?.actionGate
    ? { ...snapshot, actionGate }
    : snapshot
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

export function recordBuildLaneFailureEvents(events = [], { repoRoot = process.cwd() } = {}) {
  const normalizedEvents = (Array.isArray(events) ? events : []).filter(Boolean)
  if (!normalizedEvents.length) {
    return buildBuildLaneFailureTelemetrySnapshot({
      events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
      shipProofs: readBuildLaneFailureTelemetryShipProofs({ repoRoot }),
    })
  }
  const absolutePath = resolveTelemetryPath(repoRoot, BUILD_LANE_FAILURE_TELEMETRY_LOCAL_LOG_PATH)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.appendFileSync(absolutePath, normalizedEvents.map(event => JSON.stringify(event)).join('\n') + '\n', 'utf8')
  const snapshot = buildBuildLaneFailureTelemetrySnapshot({
    events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
    shipProofs: readBuildLaneFailureTelemetryShipProofs({ repoRoot }),
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
    shipProofs: readBuildLaneFailureTelemetryShipProofs({ repoRoot }),
    now,
  })
}

export function buildSyntheticBuildLaneTelemetryResolutionProof() {
  const now = new Date('2026-05-18T18:00:00.000Z')
  const repeatedBeforeShip = Array.from({ length: 5 }, (_, index) => buildBuildLaneFailureEvent({
    command: 'process:fanout-check',
    cardId: 'SYNTHETIC-RESOLVED-001',
    closeoutKey: 'synthetic-resolved-v1',
    checkName: 'Recent Builds exposes this closeout',
    detail: `Missing build log entry before repair ${index + 1}.`,
    occurredAt: new Date(now.getTime() - (index + 2) * 60 * 60 * 1000),
  }))
  const laterShipProof = {
    cardId: 'SYNTHETIC-LATER-SHIP-001',
    closeoutKey: 'synthetic-later-ship-v1',
    passedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
  }
  const resolvedSnapshot = buildBuildLaneFailureTelemetrySnapshot({
    events: repeatedBeforeShip,
    shipProofs: [laterShipProof],
    now,
  })
  const repeatedAfterShip = Array.from({ length: 5 }, (_, index) => buildBuildLaneFailureEvent({
    command: 'process:fanout-check',
    cardId: 'SYNTHETIC-NEW-RED-001',
    closeoutKey: 'synthetic-new-red-v1',
    checkName: 'Recent Builds exposes this closeout',
    detail: `Missing build log entry after repair ${index + 1}.`,
    occurredAt: new Date(now.getTime() - (index + 1) * 5 * 60 * 1000),
  }))
  const stillRedSnapshot = buildBuildLaneFailureTelemetrySnapshot({
    events: [...repeatedBeforeShip, ...repeatedAfterShip],
    shipProofs: [laterShipProof],
    now,
  })
  return {
    ok: resolvedSnapshot.summary.redFingerprintCount === 0 &&
      resolvedSnapshot.summary.resolvedFingerprintCount === 1 &&
      resolvedSnapshot.status === 'healthy' &&
      stillRedSnapshot.summary.redFingerprintCount === 1 &&
      stillRedSnapshot.status === 'risk',
    resolvedSnapshot,
    stillRedSnapshot,
  }
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
