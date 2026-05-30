export const FOUNDATION_MAIN_INTEGRATION_LOCK_CARD_ID = 'FOUNDATION-MAIN-INTEGRATION-LOCK-001'
export const FOUNDATION_MAIN_INTEGRATION_LOCK_CLOSEOUT_KEY = 'foundation-main-integration-lock-v1'
export const FOUNDATION_MAIN_INTEGRATION_LOCK_PLAN_PATH = 'docs/process/foundation-main-integration-lock-001-plan.md'
export const FOUNDATION_MAIN_INTEGRATION_LOCK_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-MAIN-INTEGRATION-LOCK-001.json'
export const FOUNDATION_MAIN_INTEGRATION_LOCK_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-main-integration-lock-closeout.md'
export const FOUNDATION_MAIN_INTEGRATION_LOCK_SCRIPT_PATH = 'scripts/process-foundation-main-integration-lock-check.mjs'
export const FOUNDATION_MAIN_INTEGRATION_BRANCH_LEDGER_PATH = 'docs/process/foundation-main-integration-side-branches.json'
export const FOUNDATION_MAIN_INTEGRATION_SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
export const FOUNDATION_MAIN_INTEGRATION_NEXT_CARD_ID = 'PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001'

export const FOUNDATION_MAIN_INTEGRATION_LOCK_PROOF_COMMANDS = [
  'node --check lib/foundation-main-integration-lock.js scripts/process-foundation-main-integration-lock-check.mjs',
  'npm run process:foundation-main-integration-lock-check -- --apply --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MAIN-INTEGRATION-LOCK-001.json --closeoutKey=foundation-main-integration-lock-v1 --commitRef=HEAD',
]

export const FOUNDATION_MAIN_INTEGRATION_LOCK_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not build extractor/source feature work before main-integration proof is green.',
  'Do not leave completed cards on long-lived branches without an explicit release-train record.',
  'Do not silently mix preserved side commits into Foundation main.',
  'Do not launch hidden workers or parallel builders from this card.',
  'Do not run live extraction, provider probes, credential repair, Drive mutation, sends, or external writes.',
]

const SAFE_BRANCH_ROUTE_TYPES = new Set([
  'integrated',
  'preserved-side-commit',
  'wip-non-foundation',
  'release-train',
])

const REQUIRED_ROUTE_FIELDS = ['owner', 'reason', 'nextAction']

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addFinding(findings, key, severity, detail = '', metadata = {}) {
  findings.push({ key, severity, detail, ...metadata })
}

function shortSha(value = '') {
  return text(value).slice(0, 7)
}

function normalizeCommit(value = '') {
  return text(value).toLowerCase()
}

function buildRouteMap(sideBranchLedger = {}) {
  return new Map(list(sideBranchLedger.routes).map(route => [text(route.branch), route]))
}

function routeHasRequiredContext(route = {}) {
  if (!route || typeof route !== 'object') return false
  if (!SAFE_BRANCH_ROUTE_TYPES.has(text(route.routeType))) return false
  if (text(route.routeType) === 'integrated') return Boolean(text(route.reason))
  return REQUIRED_ROUTE_FIELDS.every(field => Boolean(text(route[field])))
}

function branchLooksLikeCompletedFoundationWork(branch = {}) {
  const name = text(branch.name)
  if (branch.completedCardCount > 0) return true
  if (/^foundation\//.test(name) && !/wip|preflight|research/i.test(name)) return true
  return list(branch.commitSubjects).some(subject => /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+-\d{3,}\b/.test(subject))
}

export function evaluateFoundationMainIntegrationBranches({
  branches = [],
  sideBranchLedger = {},
  longBranchThreshold = 20,
} = {}) {
  const findings = []
  const routeMap = buildRouteMap(sideBranchLedger)
  const rows = []

  for (const branch of list(branches)) {
    const name = text(branch.name)
    if (!name || name === 'main' || name === 'origin/main' || name === 'origin/HEAD') continue
    const route = routeMap.get(name) || null
    const aheadCount = Number(branch.aheadOfMain || 0)
    const isIntegrated = branch.isAncestorOfMain === true
    const completedFoundationWork = branchLooksLikeCompletedFoundationWork(branch)
    const routeType = isIntegrated ? 'integrated' : text(route?.routeType)
    const routeOk = isIntegrated || routeHasRequiredContext(route)
    const row = {
      name,
      sha: branch.sha,
      aheadOfMain: aheadCount,
      behindMain: Number(branch.behindMain || 0),
      isAncestorOfMain: isIntegrated,
      completedFoundationWork,
      routeType,
      routeOk,
      owner: route?.owner || '',
      nextAction: route?.nextAction || '',
    }
    rows.push(row)

    if (isIntegrated) continue

    if (!routeOk) {
      addFinding(
        findings,
        'unrouted_side_branch',
        completedFoundationWork ? 'risk' : 'watch',
        `${name} is not integrated into main and has no complete side-branch route.`,
        { branch: name },
      )
      continue
    }

    if (completedFoundationWork && routeType !== 'release-train' && routeType !== 'preserved-side-commit') {
      addFinding(
        findings,
        'completed_foundation_work_outside_main',
        'risk',
        `${name} looks like completed Foundation work outside main without a release-train or preserved-side-commit route.`,
        { branch: name },
      )
    }

    if (aheadCount > longBranchThreshold && routeType !== 'release-train') {
      addFinding(
        findings,
        'long_branch_without_release_train',
        'risk',
        `${name} is ${aheadCount} commits ahead of main without a release-train record.`,
        { branch: name, aheadCount },
      )
    }
  }

  return {
    ok: findings.every(finding => finding.severity === 'watch'),
    status: findings.some(finding => finding.severity === 'risk') ? 'risk' : findings.length ? 'watch' : 'healthy',
    rows,
    findings,
  }
}

export function evaluateFoundationMainIntegrationLock(input = {}) {
  const findings = []
  const repo = input.repo || {}
  const served = input.served || {}
  const closeout = input.closeout || {}
  const branchStatus = evaluateFoundationMainIntegrationBranches({
    branches: input.branches,
    sideBranchLedger: input.sideBranchLedger,
    longBranchThreshold: input.longBranchThreshold,
  })
  const head = normalizeCommit(repo.head)
  const originMain = normalizeCommit(repo.originMain)
  const dashboardCommit = normalizeCommit(served.dashboardCommit)
  const workerCommit = normalizeCommit(served.workerCommit)

  if (text(repo.currentBranch) !== 'main') {
    addFinding(findings, 'current_branch_not_main', 'risk', `Current branch must be main before all-day integration work continues; found ${repo.currentBranch || 'missing'}.`)
  }
  if (!head || !originMain || (head !== originMain && repo.mainContainsOriginMain !== true)) {
    addFinding(findings, 'main_origin_mismatch', 'risk', `main HEAD ${shortSha(head) || 'missing'} does not contain origin/main ${shortSha(originMain) || 'missing'}.`)
  }
  if (repo.worktreeClean !== true) {
    addFinding(findings, 'dirty_worktree', 'risk', 'Worktree must be clean before claiming main is integration truth.')
  }
  if (!dashboardCommit || dashboardCommit !== head) {
    addFinding(findings, 'dashboard_served_commit_mismatch', 'risk', `Dashboard served commit ${shortSha(dashboardCommit) || 'missing'} does not match HEAD ${shortSha(head) || 'missing'}.`)
  }
  if (!workerCommit || workerCommit !== head) {
    addFinding(findings, 'worker_served_commit_mismatch', 'risk', `Worker served commit ${shortSha(workerCommit) || 'missing'} does not match HEAD ${shortSha(head) || 'missing'}.`)
  }
  if (closeout.recordExists !== true || closeout.handoffExists !== true) {
    addFinding(findings, 'main_integration_closeout_missing', 'risk', 'Main integration lock closeout registry record and handoff must exist.')
  }
  if (closeout.currentSprintCaptured !== true) {
    addFinding(findings, 'current_sprint_closeout_truth_missing', 'risk', 'Current sprint handoff must name the green/main/audit/source activation sprint.')
  }

  findings.push(...branchStatus.findings)
  return {
    ok: findings.every(finding => finding.severity === 'watch'),
    status: findings.some(finding => finding.severity === 'risk') ? 'risk' : findings.length ? 'watch' : 'healthy',
    findings,
    repo: {
      currentBranch: repo.currentBranch || '',
      head: repo.head || '',
      originMain: repo.originMain || '',
      mainContainsOriginMain: repo.mainContainsOriginMain === true,
      worktreeClean: repo.worktreeClean === true,
    },
    served: {
      dashboardCommit: served.dashboardCommit || '',
      workerCommit: served.workerCommit || '',
    },
    branchStatus,
  }
}

export function buildFoundationMainIntegrationLockDogfoodProof() {
  const commit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const healthy = evaluateFoundationMainIntegrationLock({
    repo: {
      currentBranch: 'main',
      head: commit,
      originMain: commit,
      mainContainsOriginMain: true,
      worktreeClean: true,
    },
    served: {
      dashboardCommit: commit,
      workerCommit: commit,
    },
    closeout: {
      recordExists: true,
      handoffExists: true,
      currentSprintCaptured: true,
    },
    branches: [
      {
        name: 'foundation/system-health-red-to-green-001',
        sha: commit,
        isAncestorOfMain: true,
        aheadOfMain: 0,
        behindMain: 2,
        commitSubjects: ['Ship FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001'],
      },
      {
        name: 'preserve/local-main-before-foundation-merge-2026-05-19',
        sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        isAncestorOfMain: false,
        aheadOfMain: 2,
        behindMain: 120,
        commitSubjects: ['Reconcile Agent Feedback auto-send readiness'],
      },
    ],
    sideBranchLedger: {
      routes: [
        {
          branch: 'preserve/local-main-before-foundation-merge-2026-05-19',
          routeType: 'preserved-side-commit',
          owner: 'Foundation Process',
          reason: 'Preserved unrelated side commits for later routing.',
          nextAction: 'Review outside Foundation main guardrail sprint.',
        },
      ],
    },
  })

  const pileup = evaluateFoundationMainIntegrationBranches({
    branches: [
      {
        name: 'foundation/old-builder-pileup',
        sha: 'cccccccccccccccccccccccccccccccccccccccc',
        isAncestorOfMain: false,
        aheadOfMain: 108,
        commitSubjects: ['Ship FOUNDATION-CARD-001', 'Ship FOUNDATION-CARD-108'],
      },
    ],
    sideBranchLedger: { routes: [] },
  })
  const staleDashboard = evaluateFoundationMainIntegrationLock({
    repo: {
      currentBranch: 'main',
      head: commit,
      originMain: commit,
      mainContainsOriginMain: true,
      worktreeClean: true,
    },
    served: {
      dashboardCommit: 'dddddddddddddddddddddddddddddddddddddddd',
      workerCommit: commit,
    },
    closeout: {
      recordExists: true,
      handoffExists: true,
      currentSprintCaptured: true,
    },
    branches: [],
    sideBranchLedger: { routes: [] },
  })
  const unpreservedSideCommit = evaluateFoundationMainIntegrationBranches({
    branches: [
      {
        name: 'local/main-unpushed-pre-foundation-merge-2026-05-19',
        sha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        isAncestorOfMain: false,
        aheadOfMain: 2,
        commitSubjects: ['Reconcile Agent Feedback auto-send readiness'],
      },
    ],
    sideBranchLedger: { routes: [] },
  })

  return {
    ok: healthy.status === 'healthy' &&
      pileup.status === 'risk' &&
      pileup.findings.some(finding => finding.key === 'unrouted_side_branch' || finding.key === 'long_branch_without_release_train') &&
      staleDashboard.status === 'risk' &&
      staleDashboard.findings.some(finding => finding.key === 'dashboard_served_commit_mismatch') &&
      unpreservedSideCommit.status === 'watch' &&
      unpreservedSideCommit.findings.some(finding => finding.key === 'unrouted_side_branch'),
    healthy,
    pileup,
    staleDashboard,
    unpreservedSideCommit,
    invariant: 'main/origin/served-code alignment passes; stale served code, unrouted side commits, and a 108-card branch pileup fail closed or require explicit routing.',
  }
}
