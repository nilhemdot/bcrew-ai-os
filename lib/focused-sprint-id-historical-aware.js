export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CARD_ID = 'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CLOSEOUT_KEY = 'focused-sprint-id-historical-aware-v1'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_PLAN_PATH = 'docs/process/focused-sprint-id-historical-aware-001-plan.md'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_APPROVAL_PATH = 'docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_SCRIPT_PATH = 'scripts/process-focused-sprint-id-historical-aware-check.mjs'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-focused-sprint-id-historical-aware-closeout.md'
export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_NEXT_CARD_ID = 'FOUNDATION-CSS-SURFACE-DECOUPLE-001'

export const FOCUSED_SPRINT_ID_HISTORICAL_AWARE_PROOF_COMMANDS = [
  'node --check lib/focused-sprint-id-historical-aware.js lib/agent-feedback-routes.js scripts/process-focused-sprint-id-historical-aware-check.mjs scripts/process-agent-feedback-routes-split-check.mjs scripts/process-app-page-routes-split-check.mjs',
  'npm run process:focused-sprint-id-historical-aware-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --closeoutKey=focused-sprint-id-historical-aware-v1',
  'npm run process:foundation-ship -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --commitRef=HEAD',
]

export const FOCUSED_SPRINT_ID_AUDIT_REFS = [
  {
    path: 'lib/foundation-current-sprint.js',
    token: "FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12'",
    posture: 'bootstrap_default_only',
  },
  {
    path: 'lib/foundation-current-sprint.js',
    token: "FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12'",
    posture: 'historical_closeout_only',
  },
  {
    path: 'lib/foundation-verify-registry-split.js',
    token: "FOUNDATION_VERIFY_REGISTRY_SPLIT_SPRINT_ID = 'foundation-verify-registry-split-2026-05-18'",
    posture: 'card_metadata_only',
  },
  {
    path: 'lib/kpi-health.js',
    token: "KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15'",
    posture: 'card_metadata_only',
  },
  {
    path: 'lib/kpi-health.js',
    token: "KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID = 'kpi-health-dynamic-year-contract-2026-05-16'",
    posture: 'card_metadata_only',
  },
  {
    path: 'lib/gstack-build-intel.js',
    token: "GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13'",
    posture: 'card_metadata_only',
  },
  {
    path: 'scripts/process-agent-feedback-routes-split-check.mjs',
    token: 'AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID',
    posture: 'historical_closeout_required',
  },
  {
    path: 'scripts/process-app-page-routes-split-check.mjs',
    token: 'APP_PAGE_ROUTES_SPLIT_SPRINT_ID',
    posture: 'historical_closeout_required',
  },
]

const DIRECT_ACTIVE_SPRINT_COMPARISON = /(?:activeSprint|sprint)\.sprint\?\.sprintId\s*={2,3}\s*(?:[A-Z0-9_]+_SPRINT_ID|SPRINT_ID|'[^']+'|"[^"]+")/g

function normalizeText(value = '') {
  return String(value || '').trim()
}

function lineNumberForIndex(text = '', index = 0) {
  return String(text || '').slice(0, Math.max(0, index)).split(/\r?\n/).length
}

function getLineAt(text = '', lineNumber = 1) {
  return String(text || '').split(/\r?\n/)[Math.max(0, lineNumber - 1)] || ''
}

function getNearbyLines(text = '', lineNumber = 1, before = 2, after = 2) {
  const lines = String(text || '').split(/\r?\n/)
  const start = Math.max(0, lineNumber - before - 1)
  const end = Math.min(lines.length, lineNumber + after)
  return lines.slice(start, end).join('\n')
}

function comparisonHasHistoricalEscape(context = '') {
  const text = String(context || '')
  return text.includes('evaluateSprintCheckHistoricalMode') ||
    text.includes('historical_closeout') ||
    text.includes("card?.lane === 'done'") ||
    text.includes("card.lane === 'done'") ||
    text.includes('cardClosed') ||
    text.includes("activeItem?.stage === 'done_this_sprint'") ||
    text.includes("sprintItem?.stage === 'done_this_sprint'")
}

function tokenPostureIsAllowed({ source = '', lineNumber = 1, ref }) {
  const context = getNearbyLines(source, lineNumber, 4, 2)
  if (ref.posture === 'bootstrap_default_only') {
    return context.includes('liveTruthPosture: bootstrap_default_only') &&
      context.includes(ref.token)
  }
  if (ref.posture === 'historical_closeout_only') {
    return context.includes('liveTruthPosture: historical_closeout_only') &&
      context.includes(ref.token)
  }
  if (ref.posture === 'card_metadata_only') {
    const line = getLineAt(source, lineNumber)
    return line.includes(ref.token) &&
      !/(?:activeSprint|sprint)\.sprint\?\.sprintId\s*={2,3}\s*(?:[A-Z0-9_]+_SPRINT_ID|SPRINT_ID|'[^']+'|"[^"]+")/.test(line)
  }
  if (ref.posture === 'historical_closeout_required') {
    return source.includes('evaluateSprintCheckHistoricalMode') &&
      source.includes(ref.token)
  }
  return false
}

export function scanDirectActiveSprintComparisons({ filePath = '', source = '' } = {}) {
  const text = String(source || '')
  const matches = []
  DIRECT_ACTIVE_SPRINT_COMPARISON.lastIndex = 0
  for (const match of text.matchAll(DIRECT_ACTIVE_SPRINT_COMPARISON)) {
    const line = lineNumberForIndex(text, match.index || 0)
    const context = getNearbyLines(text, line, 0, 1)
    matches.push({
      path: filePath,
      line,
      detail: match[0],
      historicalAware: comparisonHasHistoricalEscape(context),
      context: context.trim(),
    })
  }
  return matches
}

export function evaluateFocusedSprintIdHistoricalAwareness(fileSources = {}) {
  const refs = FOCUSED_SPRINT_ID_AUDIT_REFS.map(ref => {
    const source = String(fileSources[ref.path] || '')
    const index = source.indexOf(ref.token)
    const line = index >= 0 ? lineNumberForIndex(source, index) : 0
    const found = index >= 0
    const allowed = found && tokenPostureIsAllowed({ source, lineNumber: line, ref })
    return {
      ...ref,
      found,
      line,
      allowed,
      detail: found
        ? `${ref.path}:${line} ${ref.posture}`
        : `${ref.path} missing ${ref.token}`,
    }
  })

  const directComparisons = Object.entries(fileSources)
    .flatMap(([filePath, source]) => scanDirectActiveSprintComparisons({ filePath, source }))
  const unsafeDirectComparisons = directComparisons.filter(match =>
    FOCUSED_SPRINT_ID_AUDIT_REFS.some(ref => ref.path === match.path) &&
      !match.historicalAware
  )
  const failedRefs = refs.filter(ref => !ref.found || !ref.allowed)

  return {
    ok: failedRefs.length === 0 && unsafeDirectComparisons.length === 0,
    refs,
    failedRefs,
    directComparisons,
    unsafeDirectComparisons,
    summary: `${refs.length - failedRefs.length}/${refs.length} audit refs allowed; ${unsafeDirectComparisons.length} unsafe direct sprint comparisons`,
  }
}

export function buildFocusedSprintIdHistoricalAwareDogfoodProof() {
  const staleDirect = scanDirectActiveSprintComparisons({
    filePath: 'scripts/process-stale-fixture.mjs',
    source: "ensure(checks, activeSprint.sprint?.sprintId === STALE_SPRINT_ID, 'old proof')",
  })[0]
  const doneFallback = scanDirectActiveSprintComparisons({
    filePath: 'scripts/process-done-fixture.mjs',
    source: "ensure(checks, activeSprint.sprint?.sprintId === DONE_SPRINT_ID || card?.lane === 'done', 'historical fallback')",
  })[0]
  const bootstrapRef = FOCUSED_SPRINT_ID_AUDIT_REFS[0]
  const bootstrapSource = [
    '// liveTruthPosture: bootstrap_default_only - live active sprint truth comes from foundation_sprints and /api/foundation/current-sprint.',
    "export const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12'",
  ].join('\n')
  const bootstrapAllowed = tokenPostureIsAllowed({
    source: bootstrapSource,
    lineNumber: 2,
    ref: bootstrapRef,
  })
  const helperAware = evaluateFocusedSprintIdHistoricalAwareness({
    'scripts/process-agent-feedback-routes-split-check.mjs': [
      "import { evaluateSprintCheckHistoricalMode } from '../lib/sprint-check-historical-mode.js'",
      'const mode = evaluateSprintCheckHistoricalMode({ expectedSprintId: AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID })',
    ].join('\n'),
  })

  const ok = staleDirect?.historicalAware === false &&
    doneFallback?.historicalAware === true &&
    bootstrapAllowed === true &&
    helperAware.failedRefs.every(ref => ref.path !== 'scripts/process-agent-feedback-routes-split-check.mjs')

  return {
    ok,
    staleDirect,
    doneFallback,
    bootstrapAllowed,
    helperAwareScriptOk: helperAware.refs.some(ref =>
      ref.path === 'scripts/process-agent-feedback-routes-split-check.mjs' &&
        ref.allowed
    ),
  }
}
