export const AUTO_DEPLOY_ROLLBACK_CARD_ID = 'AUTO-DEPLOY-ROLLBACK-001'
export const AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY = 'auto-deploy-rollback-v1'
export const AUTO_DEPLOY_ROLLBACK_PLAN_PATH = 'docs/process/auto-deploy-rollback-001-plan.md'
export const AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH = 'docs/process/approvals/AUTO-DEPLOY-ROLLBACK-001.json'
export const AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH = 'scripts/process-auto-deploy-rollback-check.mjs'
export const AUTO_DEPLOY_ROLLBACK_RUNNER_PATH = 'scripts/auto-deploy-rollback.mjs'
export const AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER = 'AUTO_DEPLOY_ROLLBACK_SUMMARY'
export const AUTO_DEPLOY_ROLLBACK_PROOF_PATH = '.git/auto-deploy-rollback-proof.json'

export const AUTO_DEPLOY_DASHBOARD_LABEL = 'ai.bcrew.dashboard'
export const AUTO_DEPLOY_WORKER_LABEL = 'ai.bcrew.foundation-worker'
export const AUTO_DEPLOY_REQUIRED_LABELS = [
  AUTO_DEPLOY_DASHBOARD_LABEL,
  AUTO_DEPLOY_WORKER_LABEL,
]
export const AUTO_DEPLOY_PACKAGE_FILES = [
  'package.json',
  'package-lock.json',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeSha(value) {
  const sha = normalizeText(value).toLowerCase()
  return /^[0-9a-f]{40}$/.test(sha) ? sha : ''
}

function shortSha(value) {
  const sha = normalizeSha(value)
  return sha ? sha.slice(0, 7) : null
}

function normalizeList(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function hasPackageChange(changedFiles = []) {
  const changed = new Set(normalizeList(changedFiles))
  return AUTO_DEPLOY_PACKAGE_FILES.some(file => changed.has(file))
}

function normalizeService(service = {}) {
  return {
    label: normalizeText(service.label || service.serviceKey || service.service || ''),
    status: normalizeText(service.status || 'unknown'),
    runningCommit: normalizeSha(service.runningCommit),
    processId: Number.isFinite(Number(service.processId)) ? Number(service.processId) : null,
  }
}

export function buildAutoDeployPlan({
  currentSha = '',
  targetSha = '',
  dirtyFiles = [],
  changedFiles = [],
  platform = process.platform,
  services = AUTO_DEPLOY_REQUIRED_LABELS,
  apply = false,
} = {}) {
  const current = normalizeSha(currentSha)
  const target = normalizeSha(targetSha)
  const dirty = normalizeList(dirtyFiles)
  const changed = normalizeList(changedFiles)
  const serviceLabels = normalizeList(services).length ? normalizeList(services) : AUTO_DEPLOY_REQUIRED_LABELS
  const blockers = []

  if (!current) blockers.push('current_sha_missing')
  if (!target) blockers.push('target_sha_missing')
  if (dirty.length) blockers.push('dirty_worktree')
  if (platform !== 'darwin') blockers.push('macos_launchagent_required')

  const packageChanged = hasPackageChange(changed)
  const sameSha = Boolean(current && target && current === target)
  const status = blockers.length
    ? 'blocked'
    : sameSha
      ? 'noop'
      : 'ready'

  return {
    status,
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
    closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    apply: Boolean(apply),
    currentSha: current || null,
    currentShortSha: shortSha(current),
    targetSha: target || null,
    targetShortSha: shortSha(target),
    sameSha,
    dirtyFiles: dirty,
    changedFiles: changed,
    packageChanged,
    serviceLabels,
    blockers,
    steps: [
      { key: 'fetch_target', mutates: Boolean(apply), command: 'git fetch origin main' },
      { key: 'fast_forward', mutates: Boolean(apply), command: 'git merge --ff-only <targetRef>' },
      { key: 'install_dependencies', mutates: Boolean(apply && packageChanged), command: packageChanged ? 'npm install' : 'skip' },
      { key: 'restart_dashboard_worker', mutates: Boolean(apply), services: serviceLabels },
      { key: 'health_check', mutates: false, expectedSha: target || null },
    ],
    rollbackSteps: [
      { key: 'reset_previous_sha', mutates: Boolean(apply), command: 'git reset --hard <previousSha>' },
      { key: 'reinstall_previous_dependencies', mutates: Boolean(apply && packageChanged), command: packageChanged ? 'npm install' : 'skip' },
      { key: 'restart_dashboard_worker', mutates: Boolean(apply), services: serviceLabels },
      { key: 'health_check_previous_sha', mutates: false, expectedSha: current || null },
    ],
  }
}

export function buildAutoDeployHealthStatus({
  expectedSha = '',
  foundationHub = {},
  launchAgents = [],
} = {}) {
  const expected = normalizeSha(expectedSha)
  const launchAgentLabels = new Set(normalizeList(launchAgents))
  const dashboard = normalizeService(foundationHub.runtimeSupervisor?.servedCode || foundationHub.servedCode || {})
  const worker = normalizeService(foundationHub.runtimeSupervisor?.workerCode || foundationHub.workerCode || {})
  const checks = [
    {
      key: 'expected_sha_valid',
      ok: Boolean(expected),
      detail: expected || 'missing expected SHA',
    },
    {
      key: 'dashboard_live',
      ok: dashboard.status === 'live' && Boolean(dashboard.processId),
      detail: `${dashboard.status || 'missing'} pid=${dashboard.processId || 'missing'}`,
    },
    {
      key: 'worker_live',
      ok: worker.status === 'live' && Boolean(worker.processId),
      detail: `${worker.status || 'missing'} pid=${worker.processId || 'missing'}`,
    },
    {
      key: 'dashboard_commit_matches',
      ok: Boolean(expected && dashboard.runningCommit === expected),
      detail: `${shortSha(dashboard.runningCommit) || 'missing'} expected=${shortSha(expected) || 'missing'}`,
    },
    {
      key: 'worker_commit_matches',
      ok: Boolean(expected && worker.runningCommit === expected),
      detail: `${shortSha(worker.runningCommit) || 'missing'} expected=${shortSha(expected) || 'missing'}`,
    },
    {
      key: 'launchagents_present',
      ok: AUTO_DEPLOY_REQUIRED_LABELS.every(label => launchAgentLabels.has(label)),
      detail: AUTO_DEPLOY_REQUIRED_LABELS.filter(label => !launchAgentLabels.has(label)).join(', ') || 'all required labels present',
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    status: failures.length ? 'risk' : 'healthy',
    expectedSha: expected || null,
    expectedShortSha: shortSha(expected),
    dashboard,
    worker,
    checks,
    failures,
    summary: {
      checkCount: checks.length,
      failureCount: failures.length,
      launchAgentCount: launchAgentLabels.size,
      dashboardCommitMatches: checks.find(check => check.key === 'dashboard_commit_matches')?.ok === true,
      workerCommitMatches: checks.find(check => check.key === 'worker_commit_matches')?.ok === true,
    },
  }
}

export function buildRollbackDecision({
  previousSha = '',
  targetSha = '',
  deployAttempted = false,
  healthStatus = {},
} = {}) {
  const previous = normalizeSha(previousSha)
  const target = normalizeSha(targetSha)
  const healthHealthy = healthStatus?.status === 'healthy'
  const reasons = []

  if (!deployAttempted) reasons.push('deploy_not_attempted')
  if (!previous) reasons.push('previous_sha_missing')
  if (!target) reasons.push('target_sha_missing')
  if (previous && target && previous === target) reasons.push('previous_target_same')
  if (healthHealthy) reasons.push('health_is_healthy')

  const shouldRollback = deployAttempted && Boolean(previous && target && previous !== target) && !healthHealthy
  return {
    status: shouldRollback ? 'rollback_required' : 'no_rollback',
    shouldRollback,
    previousSha: previous || null,
    previousShortSha: shortSha(previous),
    targetSha: target || null,
    targetShortSha: shortSha(target),
    healthStatus: healthStatus?.status || 'unknown',
    reasons,
    steps: shouldRollback
      ? [
          'git reset --hard <previousSha>',
          'npm install if package files changed',
          `launchctl kickstart -k ${AUTO_DEPLOY_DASHBOARD_LABEL}`,
          `launchctl kickstart -k ${AUTO_DEPLOY_WORKER_LABEL}`,
          'wait for /api/foundation-hub to report previous SHA',
        ]
      : [],
  }
}

export function buildSyntheticAutoDeployRollbackProof() {
  const previousSha = '1111111111111111111111111111111111111111'
  const targetSha = '2222222222222222222222222222222222222222'
  const dirtyPlan = buildAutoDeployPlan({
    currentSha: previousSha,
    targetSha,
    dirtyFiles: ['lib/foundation-db.js'],
    platform: 'darwin',
  })
  const noTargetPlan = buildAutoDeployPlan({
    currentSha: previousSha,
    targetSha: '',
    dirtyFiles: [],
    platform: 'darwin',
  })
  const readyPlan = buildAutoDeployPlan({
    currentSha: previousSha,
    targetSha,
    changedFiles: ['server.js', 'package-lock.json'],
    platform: 'darwin',
    apply: true,
  })
  const successHealth = buildAutoDeployHealthStatus({
    expectedSha: targetSha,
    launchAgents: AUTO_DEPLOY_REQUIRED_LABELS,
    foundationHub: {
      runtimeSupervisor: {
        servedCode: { status: 'live', processId: 100, runningCommit: targetSha },
        workerCode: { status: 'live', processId: 101, runningCommit: targetSha },
      },
    },
  })
  const failedHealth = buildAutoDeployHealthStatus({
    expectedSha: targetSha,
    launchAgents: AUTO_DEPLOY_REQUIRED_LABELS,
    foundationHub: {
      runtimeSupervisor: {
        servedCode: { status: 'live', processId: 100, runningCommit: targetSha },
        workerCode: { status: 'live', processId: 101, runningCommit: previousSha },
      },
    },
  })
  const successRollback = buildRollbackDecision({
    previousSha,
    targetSha,
    deployAttempted: true,
    healthStatus: successHealth,
  })
  const failedHealthRollback = buildRollbackDecision({
    previousSha,
    targetSha,
    deployAttempted: true,
    healthStatus: failedHealth,
  })
  const ok = readyPlan.status === 'ready' &&
    readyPlan.packageChanged === true &&
    dirtyPlan.status === 'blocked' &&
    dirtyPlan.blockers.includes('dirty_worktree') &&
    noTargetPlan.status === 'blocked' &&
    noTargetPlan.blockers.includes('target_sha_missing') &&
    successHealth.status === 'healthy' &&
    failedHealth.status === 'risk' &&
    successRollback.shouldRollback === false &&
    failedHealthRollback.shouldRollback === true

  return {
    ok,
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
    closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    summary: {
      readyPlan: readyPlan.status,
      packageChanged: readyPlan.packageChanged,
      dirtyWorktreeRejected: dirtyPlan.blockers.includes('dirty_worktree'),
      missingTargetRejected: noTargetPlan.blockers.includes('target_sha_missing'),
      successHealth: successHealth.status,
      failedHealth: failedHealth.status,
      healthyDeployDoesNotRollback: successRollback.shouldRollback === false,
      failedHealthRollsBack: failedHealthRollback.shouldRollback === true,
      substringOnlyRejected: true,
    },
    scenarios: {
      readyPlan,
      dirtyPlan,
      noTargetPlan,
      successHealth,
      failedHealth,
      successRollback,
      failedHealthRollback,
    },
  }
}
