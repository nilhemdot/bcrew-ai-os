export const PROCESS_WIP_PROTOCOL_CARD_ID = 'PROCESS-WIP-PROTOCOL-001'
export const PROCESS_WIP_PROTOCOL_CLOSEOUT_KEY = 'process-wip-protocol-v1'
export const PROCESS_WIP_PROTOCOL_SPRINT_ID = 'process-wip-protocol-2026-05-16'
export const PROCESS_WIP_PROTOCOL_PLAN_PATH = 'docs/process/process-wip-protocol-001-plan.md'
export const PROCESS_WIP_PROTOCOL_APPROVAL_PATH = 'docs/process/approvals/PROCESS-WIP-PROTOCOL-001.json'
export const PROCESS_WIP_PROTOCOL_SCRIPT_PATH = 'scripts/process-wip-protocol-check.mjs'
export const PROCESS_WIP_PROTOCOL_FINDING_KEY = 'process_wip_shared_file_coordination_required'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeSearch(value) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase()
}

export function normalizeWipPath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function matchesAnyPath(filePath, patterns = []) {
  const normalized = normalizeWipPath(filePath)
  return patterns.some(pattern => {
    if (typeof pattern === 'string') return normalized === pattern
    return pattern.test(normalized)
  })
}

export const WIP_SHARED_STOP_PATHS = [
  'server.js',
  'package.json',
  'package-lock.json',
  'lib/security-access.js',
  'lib/app-auth.js',
  'lib/source-contracts.js',
  'lib/foundation-db.js',
  /^lib\/foundation-[^/]*\.js$/,
  /^lib\/process-[^/]*\.js$/,
  'scripts/foundation-verify.mjs',
  /^scripts\/process-[^/]*\.mjs$/,
  /^docs\/process\//,
]

export const WIP_HUB_LANE_PATHS = [
  /^public\/sales[^/]*\.(html|js|css)$/,
  /^public\/ops[^/]*\.(html|js|css)$/,
  /^public\/strategy[^/]*\.(html|js|css)$/,
  /^public\/marketing[^/]*\.(html|js|css)$/,
  /^public\/harlan[^/]*\.(html|js|css)$/,
  /^lib\/sales-[^/]*\.js$/,
  /^lib\/ops-[^/]*\.js$/,
  /^lib\/strategy-[^/]*\.js$/,
  /^lib\/marketing-[^/]*\.js$/,
  /^lib\/canva-[^/]*\.js$/,
  /^lib\/fal-[^/]*\.js$/,
  /^lib\/harlan-[^/]*\.js$/,
  /^docs\/marketing\//,
  /^fixtures\/hubs\//,
  /^scripts\/[^/]*(sales|ops|strategy|marketing|harlan|fal|canva)[^/]*\.mjs$/,
]

export const WIP_SIDE_WORK_SIGNAL_PATTERNS = [
  /\bhub chat\b/,
  /\bhub work\b/,
  /\bside build\b/,
  /\bside lane\b/,
  /\bseparate chat\b/,
  /\bparallel work\b/,
  /\boff[- ]scope\b/,
  /\bmarketing video lab\b/,
  /\bmarketing hub\b/,
  /\bsales hub\b/,
  /\bops hub\b/,
  /\bstrategy hub\b/,
  /\bcanva\b/,
  /\bfal\b|\bfal\.ai\b/,
  /\bharlan\b/,
  /\bvoice runtime\b/,
  /\bterminal runtime\b/,
  /\bshared route\b/,
  /\bowner-only route\b/,
]

export const WIP_COORDINATION_SIGNAL_PATTERNS = [
  /\bmain[- ]session approved\b/,
  /\bmain session approval\b/,
  /\bmain session owns\b/,
  /\bfoundation approves\b/,
  /\bfoundation review\b/,
  /\bcoordination approval\b/,
  /\bhub coordination\b/,
  /\bstop[- ]and[- ]coordinate\b/,
  /\brequested shared files\b/,
  /\brequestedsharedfiles\b/,
  /\bserver route review request\b/,
  /\bshared-file request\b/,
  /\bactive sprint scope\b/,
  /\bprocess:hub-work-check\b/,
]

function hasAny(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

function classifyPath(filePath) {
  const normalized = normalizeWipPath(filePath)
  if (!normalized) return { filePath: normalized, category: 'missing', requiresCoordination: true }
  if (matchesAnyPath(normalized, WIP_SHARED_STOP_PATHS)) {
    return { filePath: normalized, category: 'shared-stop-and-coordinate', requiresCoordination: true }
  }
  if (matchesAnyPath(normalized, WIP_HUB_LANE_PATHS)) {
    return { filePath: normalized, category: 'hub-lane', requiresCoordination: false }
  }
  return { filePath: normalized, category: 'other', requiresCoordination: false }
}

function makeFinding(detail, metadata = {}) {
  return {
    key: PROCESS_WIP_PROTOCOL_FINDING_KEY,
    detail,
    severity: 'critical',
    metadata,
  }
}

export function evaluateProcessWipProtocolPlan({
  planText,
  changedFiles = [],
} = {}) {
  const searchText = normalizeSearch(planText)
  const normalizedChangedFiles = changedFiles.map(normalizeWipPath).filter(Boolean)
  const classifications = normalizedChangedFiles.map(classifyPath)
  const sharedFiles = classifications
    .filter(item => item.requiresCoordination)
    .map(item => item.filePath)
  const hubLaneFiles = classifications
    .filter(item => item.category === 'hub-lane')
    .map(item => item.filePath)
  const sideWorkSignaled = hasAny(searchText, WIP_SIDE_WORK_SIGNAL_PATTERNS) || hubLaneFiles.length > 0
  const coordinationSignaled = hasAny(searchText, WIP_COORDINATION_SIGNAL_PATTERNS)
  const findings = []

  if (sideWorkSignaled && sharedFiles.length && !coordinationSignaled) {
    findings.push(makeFinding(
      'Side or hub work touching shared Foundation files must stop for main-session coordination before build, commit, or push.',
      {
        sharedFiles,
        hubLaneFiles,
        sideWorkSignaled,
        coordinationSignaled,
      },
    ))
  }

  const commitPushSignal = /\b(commit|push|ship|merge)\b/.test(searchText)
  const mainSessionReturnSignal = /\breturn to main\b|\bmain session\b|\bhandoff\b|\bno commit\b|\bno push\b/.test(searchText)
  if (sideWorkSignaled && commitPushSignal && sharedFiles.length && !mainSessionReturnSignal) {
    findings.push(makeFinding(
      'Side or hub work that needs shared files must return to the main session before commit, push, merge, or ship.',
      {
        sharedFiles,
        hubLaneFiles,
        commitPushSignal,
        mainSessionReturnSignal,
      },
    ))
  }

  return {
    ok: findings.length === 0,
    findings,
    sharedFiles,
    hubLaneFiles,
    classifications,
    sideWorkSignaled,
    coordinationSignaled,
  }
}

function buildStrongPlanBase(title = 'SYNTHETIC-WIP-PROTOCOL-PLAN') {
  return `
# ${title} Plan

## What
Build a narrow V1 WIP protocol proof for side or hub work. This is fast and proportional, not another heavy process layer.

## Why
Steve and the team need quality and speed while hub chats keep moving. The useful operator value is shared-file surprises getting blocked before implementation.

## Acceptance Criteria
- The proof calls the actual function path evaluatePlanCriticPlan.
- Substring-only proof is rejected.
- Dogfood proof uses synthetic side-work plans.
- Proof command is npm run process:process-wip-protocol-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The compliant plan passes and synthetic bad plans revise.
- Full process:foundation-ship runs before push.

## Details
Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, and full based on blast radius. Focused proof covers function behavior; full proof covers the final ship gate.

## Risks
Risk is blocking valid work. Repair path is fail closed, revise the plan, or reopen the card if a valid compliant plan is blocked.

## Tests
Run npm run process:process-wip-protocol-check, npm run process:plan-critic-architectural-rules-check, npm run foundation:verify, and process:foundation-ship.

## Not Next
Do not build Canva, Marketing Video Lab, Fal image editing, Harlan terminal runtime, hub features, Build Intel extraction, Drive permissions, or MEETING-VAULT-ACL-001 Phase B.
`
}

export function buildProcessWipProtocolDogfoodProof() {
  const base = buildStrongPlanBase()
  const offScopeMarketing = evaluateProcessWipProtocolPlan({
    planText: `${base}

Marketing Video Lab side build will add a FAL live route, update server route wiring, add package scripts, commit, and push from the hub chat.
`,
    changedFiles: ['public/marketing.js', 'lib/marketing-video-live.js', 'server.js', 'package.json'],
  })
  const offScopeHarlan = evaluateProcessWipProtocolPlan({
    planText: `${base}

Harlan terminal runtime and Fal image iteration should move fast from a separate chat. Add the runtime wiring and security access helper now.
`,
    changedFiles: ['public/harlan-command-center.html', 'lib/fal-image-iteration.js', 'lib/security-access.js'],
  })
  const hubOnly = evaluateProcessWipProtocolPlan({
    planText: `${base}

Marketing hub-owned-only plan. Build only public/marketing.js and lib/marketing-video-live.js. No server.js, package.json, auth, security, Foundation DB, or process files. Return a handoff before commit and no push from the side lane.
`,
    changedFiles: ['public/marketing.js', 'lib/marketing-video-live.js'],
  })
  const coordinatedShared = evaluateProcessWipProtocolPlan({
    planText: `${base}

Marketing Video Lab requested shared files for server.js and lib/security-access.js. Main-session approved coordination owns the route integration, requestedSharedFiles are declared, process:hub-work-check validates the handoff, the focused proof covers route behavior, and full process:foundation-ship runs before push.
`,
    changedFiles: ['public/marketing.js', 'docs/marketing/video-lab/server-route-review-request.md', 'server.js', 'lib/security-access.js'],
  })

  return {
    ok: offScopeMarketing.ok === false &&
      offScopeHarlan.ok === false &&
      hubOnly.ok === true &&
      coordinatedShared.ok === true &&
      offScopeMarketing.findings.some(finding => finding.key === PROCESS_WIP_PROTOCOL_FINDING_KEY) &&
      offScopeHarlan.findings.some(finding => finding.key === PROCESS_WIP_PROTOCOL_FINDING_KEY),
    offScopeMarketing,
    offScopeHarlan,
    hubOnly,
    coordinatedShared,
  }
}
