import {
  SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
  SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES,
  SOURCE_AGENTIC_BROWSER_MAX_PROOF_MODEL_CALLS,
  SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS,
  buildSourceAgenticBrowserCostPolicy,
  evaluateSourceAgenticBrowserModelRoute,
} from './source-agentic-browser-runtime.js'
import {
  LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
} from './local-virtual-browser-hands-runtime.js'
import {
  SOURCE_SESSION_BROKER_CARD_ID,
} from './source-session-broker.js'

export const SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID = 'SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001'
export const SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION = 'source-browser-brain-route-policy-v1'

const AUTH_ACTION_RE = /\b(log ?in|sign ?in|oauth|sso|mfa|2fa|captcha|verify|join|member|private|paid|course|profile|account|password|credential)\b/i
const EXTERNAL_ACTION_RE = /\b(buy|purchase|checkout|payment|billing|trade|bank|post|comment|message|dm|send|download|upload|delete|profile|settings|credential)\b/i
const MODEL_REASON_RE = /\b(reason|interpret|plan|agent|vision|visual|ambiguous|complex|browser challenge|captcha|self[- ]?heal|observe|extract)\b/i

function text(value) {
  return String(value || '').trim()
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function hostOf(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function pathOf(value = '') {
  try {
    return new URL(value).pathname || '/'
  } catch {
    return ''
  }
}

function normalizeBrowserEnv(value = '') {
  return String(value || '').trim().toUpperCase() === 'BROWSERBASE' ? 'BROWSERBASE' : 'LOCAL'
}

export function classifySourceBrowserFamily(input = {}) {
  const explicit = text(input.sourceFamily || input.source_family)
  if (explicit) return explicit
  const sourceType = text(input.sourceType || input.source_type)
  const url = text(input.url || input.targetUrl || input.sourceUrl)
  const host = hostOf(url)
  const pathname = pathOf(url)
  const surface = `${sourceType} ${url} ${input.title || ''} ${input.action || ''}`
  if (/myicor/i.test(`${host} ${surface}`)) return 'paid_course_training_platforms'
  if (/skool\.com$/i.test(host)) {
    return /\b(paid|private|member|classroom|course)\b/i.test(`${sourceType} ${pathname} ${input.title || ''}`)
      ? 'skool_paid_or_private'
      : 'skool_free_community'
  }
  if (/github\.com|gist\.github\.com|gitlab\.com/i.test(host) || /\b(repo|repository|github|gitlab|gist|code)\b/i.test(sourceType)) {
    return 'github_docs_public_resources'
  }
  if (/\b(newsletter|subscribe)\b/i.test(surface)) return 'creator_newsletters'
  if (/\b(youtube|video|creator)\b/i.test(surface)) return 'youtube_public_creator'
  return 'public_free_resources'
}

function route(routeId, overrides = {}) {
  const common = {
    routeId,
    status: 'selected',
    ok: true,
    version: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION,
    cardId: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
    externalWritesAllowed: false,
    normalChromeProfileAllowed: false,
    rawSecretsVisible: false,
    sendsHarlanNow: false,
    autoScoperPromotion: false,
    browserbaseUsed: false,
    apiModelSpendAllowed: false,
    maxAutomaticAttempts: 1,
  }
  return { ...common, ...overrides }
}

function blocked(status, reason, overrides = {}) {
  return route('blocked', {
    ok: false,
    status,
    reason,
    nextAction: 'Park the source packet with this blocker, then move to the next safe source-browser card.',
    ...overrides,
  })
}

function sourceFamilyNeedsSession(sourceFamily = '') {
  return [
    'creator_newsletters',
    'skool_free_community',
    'skool_paid_or_private',
    'paid_course_training_platforms',
    'team_member_agent_systems',
  ].includes(text(sourceFamily))
}

function actionNeedsAuth(action = '', sourceFamily = '') {
  if (['skool_paid_or_private', 'paid_course_training_platforms', 'team_member_agent_systems'].includes(sourceFamily)) return true
  return AUTH_ACTION_RE.test(action)
}

function externalActionBlocked(action = '') {
  return EXTERNAL_ACTION_RE.test(action)
}

function pageHealthBlocked(pageHealth = {}) {
  return pageHealth?.ok === false ||
    /blocked|challenge|captcha|restore|blank|browser_state/i.test(`${pageHealth?.status || ''} ${pageHealth?.reason || ''}`)
}

function modelBrainRequested(input = {}) {
  return bool(input.needsModelBrain || input.needs_model_brain || input.useAgenticBrain) ||
    MODEL_REASON_RE.test(`${input.needsModelReason || ''} ${input.instruction || ''}`)
}

function browserbaseBakeoffApproved(input = {}) {
  return bool(input.browserbaseBakeoffApproved || input.browserbase_bakeoff_approved || input.allowBrowserbaseBakeoff)
}

function sourceSessionReady(input = {}) {
  return bool(input.sessionHealthy || input.session_healthy) &&
    (bool(input.persistentProfilePresent || input.persistent_profile_present) || bool(input.authorizedSessionUsed))
}

function buildCostPolicy(input = {}, browserEnv = normalizeBrowserEnv(input.browserEnv || input.env)) {
  return buildSourceAgenticBrowserCostPolicy({
    env: browserEnv,
    model: text(input.model) || SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL,
    maxSteps: number(input.maxSteps, SOURCE_AGENTIC_BROWSER_MAX_PROOF_STEPS),
    runAgent: bool(input.runAgent ?? true),
    clickFirstSafeObservedAction: bool(input.clickFirstSafeObservedAction ?? true),
    allowBrowserbase: bool(input.allowBrowserbase),
    budgetApproved: bool(input.budgetApproved),
    maxBrowserMinutes: number(input.maxBrowserMinutes, SOURCE_AGENTIC_BROWSER_MAX_PROOF_BROWSER_MINUTES),
    maxEstimatedModelCalls: number(input.maxEstimatedModelCalls, SOURCE_AGENTIC_BROWSER_MAX_PROOF_MODEL_CALLS),
  })
}

export function selectSourceBrowserBrainRoute(input = {}) {
  const sourceFamily = classifySourceBrowserFamily(input)
  const action = text(input.action || input.requestedAction || input.taskType || 'read_source')
  const browserEnv = normalizeBrowserEnv(input.browserEnv || input.env)
  const model = text(input.model) || SOURCE_AGENTIC_BROWSER_DEFAULT_MODEL
  const modelRoute = evaluateSourceAgenticBrowserModelRoute(model)
  const costPolicy = buildCostPolicy(input, browserEnv)
  const pageHealth = input.pageHealth || {}
  const hostedRequested = browserEnv === 'BROWSERBASE' || bool(input.preferHostedBrowser)
  const wantsModel = modelBrainRequested(input) || hostedRequested
  const sessionNeeded = sourceFamilyNeedsSession(sourceFamily)
  const hasSession = sourceSessionReady(input)
  const nativeConnectorReady = sourceFamily === 'paid_course_training_platforms' &&
    bool(input.nativeReadonlyConnectorPresent || input.native_readonly_connector_present) &&
    bool(input.nativeReadonlyConnectorApproved || input.native_readonly_connector_approved)

  if (externalActionBlocked(action)) {
    return blocked('blocked_external_action_policy_required', 'external_action_requires_separate_policy', {
      sourceFamily,
      action,
      selectedBrain: 'none',
      selectedRunner: 'none',
    })
  }

  if (nativeConnectorReady) {
    return route('native_readonly_connector_first', {
      sourceFamily,
      action,
      selectedBrain: 'native_connector',
      selectedRunner: 'myicor:mcp-call',
      requiresSourceSession: true,
      apiModelSpendAllowed: false,
      nextAction: 'Use the approved read-only connector first; browser Hands is fallback only for connector gaps.',
    })
  }

  if (bool(input.mfaChallenge || input.mfa_challenge) || actionNeedsAuth(action, sourceFamily) || (sessionNeeded && !hasSession)) {
    return route('source_session_broker_harlan_auth', {
      ok: false,
      status: 'waiting_auth_or_session',
      sourceFamily,
      action,
      selectedBrain: 'session_broker',
      selectedRunner: 'source-session-broker',
      requiresSourceSession: true,
      routeCardId: SOURCE_SESSION_BROKER_CARD_ID,
      harlanEscalationPrepared: true,
      sendsHarlanNow: false,
      nextAction: 'Use Source Session Broker first. If MFA/human verification appears, prepare Harlan Telegram auth-needed without sending from this proof.',
    })
  }

  if (pageHealthBlocked(pageHealth) || bool(input.browserChallengeDetected || input.browser_challenge_detected)) {
    if (browserbaseBakeoffApproved(input)) {
      const browserbasePolicy = buildCostPolicy({ ...input, env: 'BROWSERBASE', allowBrowserbase: true }, 'BROWSERBASE')
      if (browserbasePolicy.ok) {
        return route('browserbase_bakeoff_fallback', {
          sourceFamily,
          action,
          selectedBrain: 'stagehand_api_model',
          selectedRunner: 'source:agentic-browser',
          browserEnv: 'BROWSERBASE',
          browserbaseUsed: true,
          apiModelSpendAllowed: true,
          costPolicy: browserbasePolicy,
          nextAction: 'Run only the approved tiny Browserbase bakeoff task and ledger cost/evidence before considering renewal.',
        })
      }
      return blocked('blocked_browserbase_cost_policy', 'browserbase_bakeoff_cost_policy_failed', {
        sourceFamily,
        action,
        costPolicy: browserbasePolicy,
      })
    }
    return route('local_self_recovery_then_harlan', {
      ok: false,
      status: 'blocked_browser_challenge_needs_recovery',
      sourceFamily,
      action,
      selectedBrain: 'local_hands_then_operator_escalation',
      selectedRunner: 'source:local-browser-hands',
      routeCardId: LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
      fallbackChain: ['clean_isolated_local_profile', 'source_session_probe', 'harlan_auth_needed_dry_run', 'browserbase_bakeoff_only_if_approved'],
      nextAction: 'Retry once with a clean isolated local profile, then prepare Harlan/auth or Browserbase bakeoff packet; do not use Steve normal Chrome.',
    })
  }

  if (hostedRequested && !browserbaseBakeoffApproved(input)) {
    return blocked('blocked_browserbase_bakeoff_not_approved', 'browserbase_requires_bakeoff_approval', {
      sourceFamily,
      action,
      selectedBrain: 'none',
      selectedRunner: 'none',
      costPolicy,
    })
  }

  if (wantsModel) {
    if (!modelRoute.ok) {
      return blocked('blocked_unsupported_model_route', modelRoute.status, {
        sourceFamily,
        action,
        selectedBrain: 'none',
        selectedRunner: 'none',
        model,
        modelRoute,
        costPolicy,
      })
    }
    if (!costPolicy.ok) {
      return blocked('blocked_model_or_browser_cost_policy', 'cost_policy_failed', {
        sourceFamily,
        action,
        selectedBrain: 'none',
        selectedRunner: 'none',
        model,
        modelRoute,
        costPolicy,
      })
    }
    return route(hostedRequested ? 'browserbase_bakeoff_fallback' : 'stagehand_local_api_brain', {
      sourceFamily,
      action,
      selectedBrain: 'stagehand_api_model',
      selectedRunner: 'source:agentic-browser',
      browserEnv: browserEnv,
      browserbaseUsed: hostedRequested,
      apiModelSpendAllowed: true,
      model,
      modelRoute,
      costPolicy,
      nextAction: hostedRequested
        ? 'Run only the approved tiny Browserbase bakeoff task and ledger browser/model spend.'
        : 'Use local Stagehand only for proof-sized observe/extract/agent work with explicit API model caps.',
    })
  }

  if (sourceFamily === 'github_docs_public_resources') {
    return route('deterministic_public_repo_worker', {
      sourceFamily,
      action,
      selectedBrain: 'deterministic_reader',
      selectedRunner: 'repo:deep-review',
      nextAction: 'Read public repo/docs through the repo lane; do not clone, install, download, or execute code.',
    })
  }

  if (sourceFamily === 'skool_free_community') {
    return route('local_hands_source_specific_runner', {
      sourceFamily,
      action,
      selectedBrain: 'local_hands_no_model',
      selectedRunner: 'skool:free-god-mode',
      routeCardId: LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
      requiresSourceSession: true,
      nextAction: 'Run the free-community SOP with the healthy isolated source session and local hands adapter.',
    })
  }

  if (sourceFamily === 'creator_newsletters') {
    return route('deterministic_newsletter_no_submit', {
      sourceFamily,
      action,
      selectedBrain: 'deterministic_reader',
      selectedRunner: 'newsletter:intake',
      requiresSourceSession: true,
      nextAction: 'Detect newsletter signup and source-inbox packet without submitting unless a signup policy explicitly approves it.',
    })
  }

  return route('deterministic_public_source_worker', {
    sourceFamily,
    action,
    selectedBrain: 'deterministic_reader',
    selectedRunner: 'source:god-mode',
    nextAction: 'Use public/free deterministic source reader first; escalate only if evidence shows it needs richer browser brain.',
  })
}

export function buildSourceBrowserBrainRoutePolicySnapshot() {
  return {
    schemaVersion: 1,
    version: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION,
    cardId: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
    defaultOrder: [
      'deterministic_public_source_worker',
      'deterministic_public_repo_worker',
      'deterministic_newsletter_no_submit',
      'local_hands_source_specific_runner',
      'source_session_broker_harlan_auth',
      'stagehand_local_api_brain',
      'browserbase_bakeoff_fallback',
    ],
    guardrails: {
      browserbaseDefault: false,
      browserbaseOnlyDuringBakeoff: true,
      unsupportedSubscriptionRoutesBlocked: true,
      apiModelSpendNeedsExplicitCaps: true,
      sourceSessionBeforeAuth: true,
      normalChromeProfileAllowed: false,
      externalWritesAllowed: false,
      harlanLiveSendFromProof: false,
      rawSecretsVisible: false,
    },
    routeMatrix: [
      { sourceFamily: 'public_free_resources', defaultRoute: 'deterministic_public_source_worker', runner: 'source:god-mode' },
      { sourceFamily: 'github_docs_public_resources', defaultRoute: 'deterministic_public_repo_worker', runner: 'repo:deep-review' },
      { sourceFamily: 'creator_newsletters', defaultRoute: 'deterministic_newsletter_no_submit', runner: 'newsletter:intake' },
      { sourceFamily: 'skool_free_community', defaultRoute: 'source_session_broker_harlan_auth until session ready, then local_hands_source_specific_runner', runner: 'skool:free-god-mode' },
      { sourceFamily: 'paid_course_training_platforms', defaultRoute: 'native_readonly_connector_first or source_session_broker_harlan_auth', runner: 'myicor:mcp-call/source-session-broker' },
      { sourceFamily: 'browser_challenge_or_captcha', defaultRoute: 'local_self_recovery_then_harlan, Browserbase bakeoff only with approval', runner: 'source:local-browser-hands/source:agentic-browser' },
    ],
    proofCommand: 'npm run process:source-browser-brain-route-policy-check -- --json',
  }
}

export function buildSourceBrowserBrainRoutePolicyDogfood() {
  const cases = [
    {
      name: 'public_page_stays_deterministic',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/guide', sourceType: 'public_or_free_source' }),
      expect: decision => decision.ok === true && decision.routeId === 'deterministic_public_source_worker' && decision.apiModelSpendAllowed === false,
    },
    {
      name: 'public_repo_uses_repo_lane',
      decision: selectSourceBrowserBrainRoute({ url: 'https://github.com/acme/agent-memory', sourceType: 'github_docs_public_resources' }),
      expect: decision => decision.ok === true && decision.selectedRunner === 'repo:deep-review',
    },
    {
      name: 'free_skool_without_session_routes_to_broker',
      decision: selectSourceBrowserBrainRoute({ url: 'https://www.skool.com/chase-ai-community/about', sourceType: 'skool_free_community' }),
      expect: decision => decision.ok === false && decision.routeId === 'source_session_broker_harlan_auth' && decision.sendsHarlanNow === false,
    },
    {
      name: 'free_skool_with_session_uses_local_hands_runner',
      decision: selectSourceBrowserBrainRoute({ url: 'https://www.skool.com/chase-ai-community/about', sourceType: 'skool_free_community', sessionHealthy: true, persistentProfilePresent: true }),
      expect: decision => decision.ok === true && decision.selectedRunner === 'skool:free-god-mode' && decision.selectedBrain === 'local_hands_no_model',
    },
    {
      name: 'myicor_native_connector_beats_browser',
      decision: selectSourceBrowserBrainRoute({ url: 'https://app.myicor.com/login', sourceType: 'paid_course_training_platforms', nativeReadonlyConnectorPresent: true, nativeReadonlyConnectorApproved: true }),
      expect: decision => decision.ok === true && decision.routeId === 'native_readonly_connector_first',
    },
    {
      name: 'myicor_without_connector_routes_to_broker',
      decision: selectSourceBrowserBrainRoute({ url: 'https://app.myicor.com/login', sourceType: 'paid_course_training_platforms', sourceBoundaryApproved: true }),
      expect: decision => decision.ok === false && decision.routeId === 'source_session_broker_harlan_auth',
    },
    {
      name: 'subscription_label_blocks_before_stagehand',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/complex', sourceType: 'public_or_free_source', needsModelBrain: true, model: 'codex/gpt-5.5' }),
      expect: decision => decision.ok === false && decision.status === 'blocked_unsupported_model_route',
    },
    {
      name: 'local_api_model_allowed_with_tiny_caps',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/complex', sourceType: 'public_or_free_source', needsModelBrain: true, model: 'openai/gpt-4.1-mini', maxSteps: 2, maxEstimatedModelCalls: 8 }),
      expect: decision => decision.ok === true && decision.routeId === 'stagehand_local_api_brain' && decision.costPolicy?.browserHoursMetered === false,
    },
    {
      name: 'browserbase_blocks_without_bakeoff',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/complex', sourceType: 'public_or_free_source', needsModelBrain: true, env: 'BROWSERBASE', model: 'openai/gpt-4.1-mini', allowBrowserbase: true }),
      expect: decision => decision.ok === false && decision.status === 'blocked_browserbase_bakeoff_not_approved',
    },
    {
      name: 'browserbase_bakeoff_allowed_only_tiny',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/complex', sourceType: 'public_or_free_source', needsModelBrain: true, env: 'BROWSERBASE', model: 'openai/gpt-4.1-mini', allowBrowserbase: true, browserbaseBakeoffApproved: true, maxSteps: 2, maxBrowserMinutes: 2, maxEstimatedModelCalls: 8 }),
      expect: decision => decision.ok === true && decision.routeId === 'browserbase_bakeoff_fallback' && decision.browserbaseUsed === true,
    },
    {
      name: 'browser_challenge_gets_recovery_not_false_green',
      decision: selectSourceBrowserBrainRoute({ url: 'https://challenge.example.com', sourceType: 'public_or_free_source', pageHealth: { ok: false, status: 'browser_challenge' } }),
      expect: decision => decision.ok === false && decision.routeId === 'local_self_recovery_then_harlan',
    },
    {
      name: 'purchase_is_action_policy_not_extractor',
      decision: selectSourceBrowserBrainRoute({ url: 'https://example.com/checkout', sourceType: 'public_or_free_source', action: 'purchase' }),
      expect: decision => decision.ok === false && decision.status === 'blocked_external_action_policy_required',
    },
  ].map(testCase => ({
    name: testCase.name,
    ok: testCase.expect(testCase.decision),
    routeId: testCase.decision.routeId,
    status: testCase.decision.status,
    selectedRunner: testCase.decision.selectedRunner,
    decision: testCase.decision,
  }))

  return {
    ok: cases.every(testCase => testCase.ok),
    cardId: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
    version: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION,
    cases,
  }
}

export function evaluateSourceBrowserBrainRoutePolicy(snapshot = buildSourceBrowserBrainRoutePolicySnapshot()) {
  const findings = []
  const guardrails = snapshot.guardrails || {}
  for (const key of [
    'browserbaseOnlyDuringBakeoff',
    'unsupportedSubscriptionRoutesBlocked',
    'apiModelSpendNeedsExplicitCaps',
    'sourceSessionBeforeAuth',
  ]) {
    if (guardrails[key] !== true) findings.push({ check: 'required_guardrail_true', detail: key })
  }
  for (const key of ['browserbaseDefault', 'normalChromeProfileAllowed', 'externalWritesAllowed', 'harlanLiveSendFromProof', 'rawSecretsVisible']) {
    if (guardrails[key] !== false) findings.push({ check: 'required_guardrail_false', detail: key })
  }
  const routeIds = new Set((snapshot.defaultOrder || []).map(routeId => text(routeId)))
  for (const routeId of ['deterministic_public_source_worker', 'source_session_broker_harlan_auth', 'stagehand_local_api_brain', 'browserbase_bakeoff_fallback']) {
    if (!routeIds.has(routeId)) findings.push({ check: 'required_route_present', detail: routeId })
  }
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'ready',
    findings,
  }
}
