import {
  SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
  buildSourceAgenticBrowserCostPolicy,
} from './source-agentic-browser-runtime.js'

export const BROWSERBASE_ONE_MONTH_BAKEOFF_CARD_ID = 'BROWSERBASE-ONE-MONTH-BAKEOFF-001'
export const BROWSERBASE_ONE_MONTH_BAKEOFF_PLAN_PATH = 'docs/process/browserbase-one-month-bakeoff-001-plan.md'
export const BROWSERBASE_ONE_MONTH_BAKEOFF_SCRIPT_PATH = 'scripts/process-browserbase-one-month-bakeoff-check.mjs'
export const BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_TASKS = 6
export const BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_BROWSER_MINUTES_PER_TASK = 2
export const BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_MODEL_CALLS_PER_TASK = 8

function text(value) {
  return String(value || '').trim()
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function envHas(env = {}, key = '') {
  return Boolean(text(env[key]))
}

function browserbaseCredentialReadback(env = process.env) {
  return {
    apiKeyPresent: envHas(env, 'BROWSERBASE_API_KEY'),
    projectIdPresent: envHas(env, 'BROWSERBASE_PROJECT_ID'),
    secretValuesReturned: false,
    rawSecretPrinted: false,
    status: envHas(env, 'BROWSERBASE_API_KEY') && envHas(env, 'BROWSERBASE_PROJECT_ID')
      ? 'present'
      : 'missing_browserbase_credentials',
    statusCommand: 'env | grep -E "^BROWSERBASE_(API_KEY|PROJECT_ID)=" >/dev/null # metadata only; never print values',
  }
}

export function browserbaseBakeoffTaskCatalog() {
  return [
    {
      taskId: 'public_page',
      label: 'Public page',
      sourceType: 'public_or_free_source',
      goal: 'Read one exact public page and produce title/body/link evidence.',
      localBaselineRunner: 'source:god-mode',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'same or better extraction evidence than local deterministic reader with no unsafe side effects',
    },
    {
      taskId: 'public_repo',
      label: 'Public repo',
      sourceType: 'github_docs_public_resources',
      goal: 'Read one public repo/doc page and compare implementation-pattern extraction.',
      localBaselineRunner: 'repo:deep-review',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'repo signal quality improves without clone/install/download/code execution',
    },
    {
      taskId: 'newsletter_page',
      label: 'Newsletter page',
      sourceType: 'creator_newsletter',
      goal: 'Detect signup form and source identity path without submitting.',
      localBaselineRunner: 'newsletter:intake',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'detects form and blockers without external signup or email mutation',
    },
    {
      taskId: 'free_community_public_bridge',
      label: 'Free community public bridge',
      sourceType: 'skool_free_community',
      goal: 'Inspect public/about bridge and determine whether source session is required.',
      localBaselineRunner: 'source:local-browser-hands',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'cleanly distinguishes public bridge from join/login/MFA gate',
    },
    {
      taskId: 'myicor_auth_needed',
      label: 'MyICOR auth-needed',
      sourceType: 'paid_course_training_platforms',
      goal: 'Stop at existing paid-account Google SSO/auth boundary and emit resume packet.',
      localBaselineRunner: 'source-session-broker',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'does not choose signup/profile creation and does not read paid content before auth',
    },
    {
      taskId: 'browser_challenge',
      label: 'Browser challenge',
      sourceType: 'browser_challenge_or_captcha',
      goal: 'Compare clean local retry versus hosted fallback on one challenge-like page.',
      localBaselineRunner: 'source:local-browser-hands',
      browserbaseRunner: 'source:agentic-browser',
      successMetric: 'improves recovery without CAPTCHA bypass, normal Chrome, or false extraction claim',
    },
  ]
}

export function buildBrowserbaseOneMonthBakeoffSnapshot({
  generatedAt = new Date().toISOString(),
  env = process.env,
  allowBrowserbaseBakeoff = false,
  budgetApproved = false,
  model = SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
  maxTasks = BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_TASKS,
  maxBrowserMinutesPerTask = BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_BROWSER_MINUTES_PER_TASK,
  maxModelCallsPerTask = BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_MODEL_CALLS_PER_TASK,
} = {}) {
  const tasks = browserbaseBakeoffTaskCatalog().slice(0, Math.max(1, Number(maxTasks || 0)))
  const credentials = browserbaseCredentialReadback(env)
  const costPolicy = buildSourceAgenticBrowserCostPolicy({
    env: 'BROWSERBASE',
    model,
    maxSteps: 2,
    runAgent: false,
    allowBrowserbase: true,
    budgetApproved: bool(budgetApproved),
    maxBrowserMinutes: maxBrowserMinutesPerTask,
    maxEstimatedModelCalls: maxModelCallsPerTask,
  })
  const blockers = []
  if (!bool(allowBrowserbaseBakeoff)) blockers.push('browserbase_bakeoff_not_approved')
  if (credentials.status !== 'present') blockers.push('browserbase_credentials_missing')
  if (costPolicy.ok !== true) blockers.push('browserbase_cost_policy_blocked')

  const ready = blockers.length === 0
  return {
    ok: true,
    status: ready ? 'ready_for_tiny_browserbase_bakeoff' : 'blocked_preflight',
    generatedAt,
    cardId: BROWSERBASE_ONE_MONTH_BAKEOFF_CARD_ID,
    planPath: BROWSERBASE_ONE_MONTH_BAKEOFF_PLAN_PATH,
    reportOnly: true,
    liveRunStarted: false,
    writesBacklog: false,
    writesExternalSystems: false,
    browserbaseDefault: false,
    localFirst: true,
    broadRunAllowed: false,
    allowBrowserbaseBakeoff: bool(allowBrowserbaseBakeoff),
    budgetApproved: bool(budgetApproved),
    credentials,
    costPolicy,
    summary: {
      taskCount: tasks.length,
      maxBrowserMinutesPerTask: Number(maxBrowserMinutesPerTask || 0),
      maxBrowserMinutesTotal: tasks.length * Number(maxBrowserMinutesPerTask || 0),
      maxModelCallsPerTask: Number(maxModelCallsPerTask || 0),
      maxModelCallsTotal: tasks.length * Number(maxModelCallsPerTask || 0),
      model,
      browserHoursMeteredSeparately: true,
      modelCallsMeteredSeparately: true,
      renewalDecision: 'do_not_renew_until_bakeoff_wins_on_reliability_and_cost',
    },
    tasks: tasks.map(task => ({
      ...task,
      runCommand: [
        'npm',
        'run',
        'source:agentic-browser',
        '--',
        '--env=BROWSERBASE',
        '--allowBrowserbase',
        '--browserbaseBakeoffApproved',
        `--model=${model}`,
        '--maxSteps=2',
        `--maxBrowserMinutes=${maxBrowserMinutesPerTask}`,
        `--maxEstimatedModelCalls=${maxModelCallsPerTask}`,
        '--json',
      ].join(' '),
      externalActionsAllowed: false,
      normalChromeProfileAllowed: false,
      rawSecretsVisible: false,
      autoScoperPromotion: false,
    })),
    blockers,
    nextAction: ready
      ? 'Run one approved bakeoff task at a time, compare against local baseline, ledger browser/model spend, then stop.'
      : 'Keep Browserbase parked. Use deterministic/local source-browser routes until the missing approval/credential/cost blocker is cleared.',
    notAllowed: [
      'no broad Browserbase extraction',
      'no Browserbase default from env keys',
      'no unsupported subscription model labels',
      'no uncapped API model loop',
      'no normal Chrome profile',
      'no login/signup/purchase/download/post/comment/message/profile mutation',
      'no Scoper promotion',
    ],
  }
}

export function buildBrowserbaseOneMonthBakeoffDogfoodProof() {
  const noApproval = buildBrowserbaseOneMonthBakeoffSnapshot({
    env: { BROWSERBASE_API_KEY: 'present', BROWSERBASE_PROJECT_ID: 'present' },
  })
  const missingCredentials = buildBrowserbaseOneMonthBakeoffSnapshot({
    allowBrowserbaseBakeoff: true,
    env: {},
  })
  const readyTiny = buildBrowserbaseOneMonthBakeoffSnapshot({
    allowBrowserbaseBakeoff: true,
    env: { BROWSERBASE_API_KEY: 'present', BROWSERBASE_PROJECT_ID: 'present' },
  })
  const broadBlocked = buildBrowserbaseOneMonthBakeoffSnapshot({
    allowBrowserbaseBakeoff: true,
    env: { BROWSERBASE_API_KEY: 'present', BROWSERBASE_PROJECT_ID: 'present' },
    maxBrowserMinutesPerTask: 30,
    maxModelCallsPerTask: 3,
  })
  const cases = [
    {
      name: 'browserbase_blocks_without_bakeoff_approval',
      ok: noApproval.status === 'blocked_preflight' &&
        noApproval.blockers.includes('browserbase_bakeoff_not_approved') &&
        noApproval.liveRunStarted === false,
    },
    {
      name: 'missing_credentials_are_metadata_only_blocker',
      ok: missingCredentials.status === 'blocked_preflight' &&
        missingCredentials.credentials.secretValuesReturned === false &&
        missingCredentials.blockers.includes('browserbase_credentials_missing'),
    },
    {
      name: 'tiny_bakeoff_ready_when_approved_and_credentialed',
      ok: readyTiny.status === 'ready_for_tiny_browserbase_bakeoff' &&
        readyTiny.summary.maxBrowserMinutesTotal <= 12 &&
        readyTiny.summary.maxModelCallsTotal <= 48,
    },
    {
      name: 'broad_or_misbudgeted_bakeoff_blocks',
      ok: broadBlocked.status === 'blocked_preflight' &&
        broadBlocked.blockers.includes('browserbase_cost_policy_blocked'),
    },
    {
      name: 'task_catalog_covers_required_comparison_surfaces',
      ok: ['public_page', 'public_repo', 'newsletter_page', 'free_community_public_bridge', 'myicor_auth_needed', 'browser_challenge']
        .every(taskId => readyTiny.tasks.some(task => task.taskId === taskId)),
    },
    {
      name: 'proof_is_report_only_no_external_side_effects',
      ok: [noApproval, missingCredentials, readyTiny, broadBlocked].every(snapshot =>
        snapshot.reportOnly === true &&
        snapshot.liveRunStarted === false &&
        snapshot.writesBacklog === false &&
        snapshot.writesExternalSystems === false
      ),
    },
  ]
  return {
    ok: cases.every(testCase => testCase.ok),
    cases,
    snapshots: { noApproval, missingCredentials, readyTiny, broadBlocked },
  }
}
