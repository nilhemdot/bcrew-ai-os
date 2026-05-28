import crypto from 'node:crypto'

import {
  AGENT_CAPABILITY_REGISTRY_CARD_ID,
  buildAgentCapabilityRegistry,
  evaluateAgentCapabilityRegistry,
} from './agent-capability-registry.js'
import {
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
} from './agent-template-runtime-contract.js'
import {
  SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID,
  buildSourceBrowserSessionPolicy,
  evaluateSourceBrowserPageHealth,
} from './source-god-mode-extractor-runtime.js'
import {
  SOURCE_SESSION_BROKER_CARD_ID,
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  evaluateSourceSessionBrokerRequest,
} from './source-session-broker.js'
import {
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY,
  HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
  buildAuthNeededEvent,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'

export const SOURCE_BROWSER_AGENT_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_BROWSER_AGENT_PARENT_CARD_ID = 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001'
export const SOURCE_BROWSER_AGENT_SCRIPT_PATH = 'scripts/process-source-browser-agent-harness-check.mjs'
export const SOURCE_BROWSER_AGENT_ID = 'source-browser-agent'
export const SOURCE_BROWSER_AGENT_RUN_ROOT = '.openclaw/source-browser-agent'
export const SOURCE_BROWSER_AGENT_TARGET_KEY = 'source-browser-agent-runs'
export const SOURCE_BROWSER_AGENT_SOURCE_ID = 'source-browser-agent'
export const SOURCE_BROWSER_AGENT_READBACK_VERSION = 'source-browser-agent-readback-v1'
export const SOURCE_BROWSER_OPERATOR_ESCALATION_CHANNEL = 'harlan_telegram_operator_lane'

export const SOURCE_BROWSER_AGENT_REQUIRED_STATES = [
  'queued',
  'preparing_session',
  'observing',
  'planning',
  'acting',
  'extracting',
  'evaluating',
  'recording',
  'completed',
  'waiting_auth',
  'blocked',
  'failed_closed',
  'parked',
]

export const SOURCE_BROWSER_AGENT_FORBIDDEN_ACTIONS = [
  'purchase',
  'checkout',
  'stock_trade',
  'banking_action',
  'payment_change',
  'account_delete',
  'profile_mutation',
  'credential_mutation',
  'post_public_content',
  'comment',
  'dm_or_message',
  'unsafe_download',
  'submit_form_without_source_policy',
  'login_without_source_session',
  'signup_without_source_identity',
  'join_without_source_session',
]

export const SOURCE_BROWSER_AGENT_TOOL_REGISTRY = [
  {
    toolId: 'source:god-mode',
    runner: 'scripts/run-source-god-mode-extractor.mjs',
    sourceFamilies: ['public_free_resources', 'public_or_free_source', 'youtube_public_creator'],
    posture: 'safe_public_read_and_bounded_navigation',
    allowedActions: ['read_public_page', 'follow_public_free_links', 'safe_free_resource_capture'],
    requiresSourceSession: false,
    externalWritesAllowed: false,
  },
  {
    toolId: 'repo:deep-review',
    runner: 'scripts/run-public-repo-deep-review.mjs',
    sourceFamilies: ['github_docs_public_resources'],
    posture: 'public_repo_read_only_implementation_pattern_extraction',
    allowedActions: ['read_public_repo_metadata', 'read_readme_docs_examples', 'extract_implementation_patterns'],
    requiresSourceSession: false,
    externalWritesAllowed: false,
  },
  {
    toolId: 'newsletter:intake',
    runner: 'scripts/run-creator-newsletter-intake.mjs',
    sourceFamilies: ['creator_newsletters'],
    posture: 'free_newsletter_intake_no_submit_by_default',
    allowedActions: ['read_newsletter_page', 'detect_signup_form', 'free_newsletter_signup_when_policy_allows'],
    requiresSourceSession: true,
    externalWritesAllowed: false,
  },
  {
    toolId: 'skool:free-god-mode',
    runner: 'scripts/run-skool-free-community-god-mode.mjs',
    sourceFamilies: ['skool_free_community'],
    posture: 'free_community_sop_with_source_identity_session',
    allowedActions: ['free_join_when_allowed', 'read_allowed_free_posts', 'read_free_courses', 'read_pinned_resources'],
    requiresSourceSession: true,
    externalWritesAllowed: false,
  },
  {
    toolId: 'source-session-broker',
    runner: 'lib/source-session-broker.js',
    sourceFamilies: ['creator_newsletters', 'skool_free_community', 'skool_paid_or_private', 'paid_course_training_platforms', 'team_member_agent_systems'],
    posture: 'credential_session_auth_needed_wait_resume_fail_closed',
    allowedActions: ['prepare_isolated_profile', 'check_keychain_ref', 'emit_auth_needed', 'fail_closed'],
    requiresSourceSession: true,
    externalWritesAllowed: false,
  },
]

const SOURCE_TYPE_TO_FAMILY = [
  { family: 'paid_course_training_platforms', re: /\b(myicor|paid[_-]?course|training[_-]?platform|course[_-]?training)\b/i },
  { family: 'skool_paid_or_private', re: /\b(paid[_-]?skool|private[_-]?skool|paid[_-]?community|private[_-]?community|member[_-]?community)\b/i },
  { family: 'skool_free_community', re: /\b(skool[_-]?free|free[_-]?skool|free[_-]?community|community)\b/i },
  { family: 'creator_newsletters', re: /\b(newsletter|subscribe|creator[_-]?newsletter)\b/i },
  { family: 'github_docs_public_resources', re: /\b(github|gitlab|gist|repo|repos|repository|docs|code)\b/i },
  { family: 'youtube_public_creator', re: /\b(youtube|public[_-]?video|creator[_-]?video)\b/i },
]

const FAMILY_DEFAULT_ACTION = {
  public_free_resources: 'read_public_page',
  public_or_free_source: 'read_public_page',
  youtube_public_creator: 'read_public_page',
  github_docs_public_resources: 'read_public_repo_metadata',
  creator_newsletters: 'read_newsletter_page',
  skool_free_community: 'read_allowed_free_posts',
  skool_paid_or_private: 'read_approved_paid_area_after_packet',
  paid_course_training_platforms: 'read_approved_course_area_after_packet',
  team_member_agent_systems: 'read_or_act_only_inside_user_approved_action_policy',
}

const FAMILY_TO_BROKER_FAMILY = {
  public_free_resources: 'public_free_resources',
  public_or_free_source: 'public_free_resources',
  youtube_public_creator: 'public_free_resources',
  github_docs_public_resources: 'public_free_resources',
  creator_newsletters: 'creator_newsletters',
  skool_free_community: 'skool_free_community',
  skool_paid_or_private: 'skool_paid_or_private',
  paid_course_training_platforms: 'paid_course_training_platforms',
  team_member_agent_systems: 'team_member_agent_systems',
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stableHash(value = '') {
  const raw = typeof value === 'string' ? value : JSON.stringify(value || {})
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function safeKey(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source'
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

function quoteArg(value = '') {
  const raw = String(value || '')
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(raw)) return raw
  return `'${raw.replace(/'/g, "'\\''")}'`
}

function packageCommand(script = '', args = []) {
  return ['npm', 'run', script, '--', ...args].map(quoteArg).join(' ')
}

function normalizeUrl(value = '') {
  try {
    const url = new URL(text(value))
    url.hash = ''
    return url.toString()
  } catch {
    return text(value)
  }
}

function sourceFamilyFromPacket(packet = {}) {
  const explicit = text(packet.sourceFamily || packet.source_family)
  if (explicit) return explicit
  const sourceType = text(packet.sourceType || packet.source_type)
  const url = text(packet.url || packet.targetUrl || packet.sourceUrl)
  const surface = `${sourceType} ${url} ${packet.title || ''} ${packet.label || ''}`
  const host = hostOf(url)
  const pathname = pathOf(url)
  if (/myicor/i.test(`${host} ${surface}`)) return 'paid_course_training_platforms'
  if (/skool\.com$/i.test(host)) {
    return /\b(paid|private|member|classroom|course)\b/i.test(`${sourceType} ${pathname} ${packet.title || ''}`)
      ? 'skool_paid_or_private'
      : 'skool_free_community'
  }
  if (/github\.com|gist\.github\.com|gitlab\.com/i.test(host)) return 'github_docs_public_resources'
  for (const row of SOURCE_TYPE_TO_FAMILY) {
    if (row.re.test(surface)) return row.family
  }
  return 'public_free_resources'
}

function toolForFamily(sourceFamily = '') {
  return SOURCE_BROWSER_AGENT_TOOL_REGISTRY.find(tool => list(tool.sourceFamilies).includes(sourceFamily)) ||
    SOURCE_BROWSER_AGENT_TOOL_REGISTRY.find(tool => tool.toolId === 'source:god-mode')
}

function actionSurface(action = '') {
  return text(action).toLowerCase().replace(/\s+/g, '_')
}

function bucketIdForSourceFamily(sourceFamily = '') {
  const normalized = text(sourceFamily)
  if (normalized === 'github_docs_public_resources') return 'public-code-repos'
  if (normalized === 'creator_newsletters') return 'creator-newsletters'
  if (normalized === 'skool_free_community') return 'free-communities'
  if (['skool_paid_or_private', 'paid_course_training_platforms', 'team_member_agent_systems'].includes(normalized)) return 'paid-auth-gates'
  return 'public-web-resources'
}

function forbiddenActionReason(action = '') {
  const normalized = actionSurface(action)
  if (!normalized) return ''
  if (SOURCE_BROWSER_AGENT_FORBIDDEN_ACTIONS.includes(normalized)) return normalized
  if (/\b(buy|purchase|checkout|payment|billing|cart|trade|bank|delete|post|comment|message|dm|download|upload|profile|account|password|credential)\b/i.test(normalized)) {
    return 'risky_action_requires_separate_approval_policy'
  }
  return ''
}

function sourceSessionRequestForPacket(packet = {}, sourceFamily = sourceFamilyFromPacket(packet)) {
  const brokerFamily = FAMILY_TO_BROKER_FAMILY[sourceFamily] || sourceFamily
  const source = text(packet.source || packet.sourceId || packet.creatorId || hostOf(packet.url || packet.targetUrl) || sourceFamily)
  const account = text(packet.account || packet.sourceAccount) ||
    (brokerFamily === 'paid_course_training_platforms' && /myicor/i.test(source) ? SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT : SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT)
  const action = text(packet.action || packet.requestedAction) || FAMILY_DEFAULT_ACTION[sourceFamily] || 'read_approved_source'
  const isMyicor = brokerFamily === 'paid_course_training_platforms' && /myicor/i.test(`${source} ${packet.url || ''}`)
  return {
    sourceFamily: brokerFamily,
    source,
    account,
    action,
    sourceBoundaryApproved: bool(packet.sourceBoundaryApproved || packet.source_boundary_approved) ||
      ['public_free_resources', 'creator_newsletters', 'skool_free_community'].includes(brokerFamily),
    keychainPresent: bool(packet.keychainPresent || packet.keychain_present),
    persistentProfilePresent: bool(packet.persistentProfilePresent || packet.persistent_profile_present),
    sessionHealthy: bool(packet.sessionHealthy || packet.session_healthy),
    loginRecipePresent: bool(packet.loginRecipePresent || packet.login_recipe_present),
    mfaChallenge: bool(packet.mfaChallenge || packet.mfa_challenge),
    requiresAccountCreation: bool(packet.requiresAccountCreation || packet.requires_account_creation),
    signupSurfaceDetected: bool(packet.signupSurfaceDetected || packet.signup_surface_detected),
    profileSetupDetected: bool(packet.profileSetupDetected || packet.profile_setup_detected),
    onboardingSurfaceDetected: bool(packet.onboardingSurfaceDetected || packet.onboarding_surface_detected),
    newAccountSurfaceDetected: bool(packet.newAccountSurfaceDetected || packet.new_account_surface_detected),
    nativeReadonlyConnectorPresent: bool(packet.nativeReadonlyConnectorPresent || packet.native_readonly_connector_present),
    nativeReadonlyConnectorApproved: bool(packet.nativeReadonlyConnectorApproved || packet.native_readonly_connector_approved),
    authMethod: text(packet.authMethod || packet.accountAuthMethod) || (isMyicor ? SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD : ''),
  }
}

function buildRunnerCommand({ tool = {}, packet = {}, sourceFamily = '' } = {}) {
  const url = normalizeUrl(packet.url || packet.targetUrl || packet.sourceUrl)
  if (!url) return null
  if (tool.toolId === 'repo:deep-review') {
    return {
      packageScript: 'repo:deep-review',
      argv: [`--url=${url}`],
      displayCommand: packageCommand('repo:deep-review', [`--url=${url}`]),
    }
  }
  if (tool.toolId === 'newsletter:intake') {
    const account = text(packet.account || packet.sourceAccount) || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT
    return {
      packageScript: 'newsletter:intake',
      argv: [`--url=${url}`, `--account=${account}`, '--json'],
      displayCommand: packageCommand('newsletter:intake', [`--url=${url}`, `--account=${account}`, '--json']),
      noSubmitByDefault: true,
    }
  }
  if (tool.toolId === 'skool:free-god-mode') {
    const account = text(packet.account || packet.sourceAccount) || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT
    return {
      packageScript: 'skool:free-god-mode',
      argv: [`--url=${url}`, `--account=${account}`, '--json'],
      displayCommand: packageCommand('skool:free-god-mode', [`--url=${url}`, `--account=${account}`, '--json']),
    }
  }
  return {
    packageScript: 'source:god-mode',
    argv: [`--url=${url}`, `--sourceType=${text(packet.sourceType || packet.source_type) || sourceFamily}`, '--json'],
    displayCommand: packageCommand('source:god-mode', [`--url=${url}`, `--sourceType=${text(packet.sourceType || packet.source_type) || sourceFamily}`, '--json']),
  }
}

function emptySideEffects(overrides = {}) {
  return {
    externalRunStarted: false,
    liveBrowserLaunched: false,
    networkFetched: false,
    modelCalled: false,
    manualClicks: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    optedIn: false,
    postedOrMessaged: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    normalChromeProfileUsed: false,
    rawSecretPrinted: false,
    ...overrides,
  }
}

function buildPageHealthFallbackPlan({
  pageHealth = {},
  sourceFamily = '',
  sessionPolicy = {},
} = {}) {
  const findings = list(pageHealth.findings)
  const challenge = findings.find(finding => finding.check === 'browser_challenge_not_source_content') || null
  const sourceSpecificSessionRequired = [
    'creator_newsletters',
    'skool_free_community',
    'skool_paid_or_private',
    'paid_course_training_platforms',
    'team_member_agent_systems',
  ].includes(sourceFamily)
  if (challenge) {
    return {
      status: 'browser_challenge_fallback_required',
      trigger: 'browser_challenge_not_source_content',
      route: sourceSpecificSessionRequired
        ? 'source_specific_session_then_hosted_browser_fallback'
        : 'clean_isolated_retry_then_hosted_browser_fallback',
      sourceSessionRequired: sourceSpecificSessionRequired,
      normalChromeProfileAllowed: false,
      profileMode: text(sessionPolicy.profileMode),
      reason: text(challenge.detail || 'browser challenge/interstitial blocked source content'),
      firstStep: sourceSpecificSessionRequired
        ? 'Confirm source-session broker readiness for the source identity, then retry in that isolated source session.'
        : 'Retry the exact URL in a clean isolated source-browser session before escalating.',
      nextAction: sourceSpecificSessionRequired
        ? 'Use Source Session Broker or the source-specific runner first; if the challenge remains, route to hosted/browser-agent fallback with read-only extraction policy.'
        : 'Retry a clean isolated source-browser session; if the challenge remains, route to hosted/browser-agent fallback with read-only extraction policy.',
      recoveryPolicy: {
        mode: 'bounded_self_recovery_then_human_escalation',
        maxAutomaticAttempts: 2,
        automaticSteps: sourceSpecificSessionRequired
          ? [
              'verify source-session broker readiness',
              'retry exact URL in the isolated source session',
              'route to hosted/browser-agent fallback if the challenge remains',
            ]
          : [
              'retry exact URL in a clean isolated source-browser session',
              'route to hosted/browser-agent fallback if the challenge remains',
            ],
        stopBefore: [
          'normal Chrome profile',
          'unapproved login or signup',
          '2FA approval without operator response',
          'purchase, download, post, comment, or message',
        ],
        humanEscalation: {
          requiredAfter: 'bounded retries fail, auth/2FA is required, or the fallback cannot prove real source content',
          channel: SOURCE_BROWSER_OPERATOR_ESCALATION_CHANNEL,
          messagePurpose: 'Ask the operator to approve or complete the stuck auth/session step, then resume from the saved source packet.',
          sendsMessageNow: false,
        },
      },
      allowedActions: [
        'retry exact URL in clean isolated source-browser session',
        'capture browser challenge artifact',
        'route to hosted/browser-agent fallback for read-only extraction',
        'route to source-specific runner when a session is required',
      ],
      forbiddenActions: [
        'normal Chrome profile',
        'form submit',
        'login without source-session broker',
        'purchase',
        'download',
        'post/comment/message',
        'credential mutation',
      ],
    }
  }
  const firstFinding = findings[0] || {}
  return {
    status: 'browser_state_recovery_required',
    trigger: text(firstFinding.check || pageHealth.status || 'browser_state_blocked'),
    route: 'clean_isolated_relaunch_required',
    sourceSessionRequired: sourceSpecificSessionRequired,
    normalChromeProfileAllowed: false,
    profileMode: text(sessionPolicy.profileMode),
    reason: text(firstFinding.detail || pageHealth.status || 'browser/page state failed health check'),
    firstStep: 'Relaunch a clean isolated source-browser session and retry the exact source URL.',
    nextAction: 'Do not extract from blank/control/empty browser state. Relaunch clean, retry the exact URL, then fail closed with an artifact if content is still missing.',
    recoveryPolicy: {
      mode: 'bounded_self_recovery_then_human_escalation',
      maxAutomaticAttempts: 2,
      automaticSteps: [
        'discard the stuck browser context',
        'relaunch clean isolated source-browser session',
        'retry the exact source URL',
      ],
      stopBefore: [
        'normal Chrome profile',
        'manual restore previous session',
        'claim completed extraction from blank or browser-control UI',
        'external write',
      ],
      humanEscalation: {
        requiredAfter: 'clean relaunch still lands on blank/control UI or the source cannot be reached safely',
        channel: SOURCE_BROWSER_OPERATOR_ESCALATION_CHANNEL,
        messagePurpose: 'Ask the operator whether to approve a different source route, provide access context, or park the source.',
        sendsMessageNow: false,
      },
    },
    allowedActions: [
      'relaunch clean isolated source-browser session',
      'retry exact source URL',
      'capture failure artifact',
    ],
    forbiddenActions: [
      'normal Chrome profile',
      'manual browser restore',
      'claim completed extraction',
      'external write',
    ],
  }
}

function buildSourceBrowserOperatorEscalation({
  plan = {},
  fallbackPlan = null,
  authEvent = null,
  now = '',
} = {}) {
  const packet = plan.sourcePacket || {}
  const sourceId = text(packet.sourceId || hostOf(packet.url) || packet.sourceFamily || SOURCE_BROWSER_AGENT_SOURCE_ID)
  const blocker = text(authEvent?.reason || authEvent?.blocker || fallbackPlan?.reason || plan.stopReason || 'source browser run needs operator help')
  const actionNeeded = text(
    authEvent?.actionNeeded ||
    authEvent?.nextAction ||
    fallbackPlan?.recoveryPolicy?.humanEscalation?.messagePurpose ||
    fallbackPlan?.nextAction ||
    plan.nextAction ||
    'Unblock the source session, then reply DONE.',
  )
  const event = buildAuthNeededEvent({
    eventId: `source-browser-auth-needed-${stableHash([sourceId, packet.url, blocker].join('|')).slice(0, 16)}`,
    jobId: `source-browser-agent:${safeKey(sourceId).slice(0, 48)}`,
    sourceSystem: text(packet.sourceFamily || packet.sourceType || 'source-browser-agent'),
    providerRouteKey: text(plan.toolRoute?.toolId || 'source-browser-agent'),
    accountLabel: text(packet.account || authEvent?.accountLabel || packet.sourceFamily || 'source-browser-agent'),
    blocker,
    actionNeeded,
    artifactRef: `artifact://source-browser-agent/${safeKey(sourceId)}/${safeKey(fallbackPlan?.trigger || authEvent?.eventType || plan.status || 'blocked')}`,
    createdAt: text(now || plan.createdAt || new Date().toISOString()),
    credentialRef: text(authEvent?.credentialRef || 'credential-ref:source-session-broker-label-only'),
  })
  const scenario = runHarlanAuthEscalationScenario({
    scenario: 'auth_needed',
    now: event.createdAt,
    event,
  })
  const notification = list(scenario.notifications)[0] || null
  return {
    status: 'prepared_dry_run',
    cardId: HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
    closeoutKey: HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY,
    event,
    finalStatus: text(scenario.finalStatus),
    notification: notification ? {
      notificationId: text(notification.notificationId),
      status: text(notification.status),
      deliveryMode: text(notification.deliveryMode),
      primaryChannel: text(notification.primaryChannel || HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL),
      channels: list(notification.channels),
      recipient: text(notification.recipient),
      dryRun: notification.dryRun === true,
      externalSent: notification.externalSent === true,
      text: text(notification.text),
    } : null,
    timeline: list(scenario.timeline).map(item => ({
      state: text(item.state),
      at: text(item.at),
      reason: text(item.reason),
    })),
    sendsMessageNow: false,
    waitsForDoneToken: 'DONE',
    noCredentialMutation: scenario.noCredentialMutation === true,
    plainEnglish: 'Operator escalation packet is prepared through the Harlan auth-needed contract for Telegram, but no Telegram message is sent from this proof path.',
  }
}

function buildAgentRegistryOverlay() {
  const registry = buildAgentCapabilityRegistry()
  registry.agents = [
    ...registry.agents,
    {
      agentId: SOURCE_BROWSER_AGENT_ID,
      displayName: 'Source Browser Agent',
      role: 'agentic-source-browser',
      owner: 'Foundation Extractors',
      purpose: 'Run source-packet-bound browser extraction by routing approved source work through existing source tools, source sessions, and fail-closed boundaries.',
      status: 'planned_guarded',
      permissionTier: 'source_packet_bound_worker',
      liveAnswerPreflightRef: 'agent-live-answer-preflight-gate-v1',
      statusFreshnessRef: 'source-browser-agent-status-freshness-v1',
      runtimeTemplateRef: `${AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID}:extraction-worker-template`,
    },
  ]
  registry.capabilities = [
    ...registry.capabilities,
    {
      agentId: SOURCE_BROWSER_AGENT_ID,
      capabilityId: 'source-packet-browser-run',
      title: 'Run source-packet-bound browser extraction',
      status: 'declared',
      posture: 'approval_bound_source_read',
      claimOnly: false,
      tools: SOURCE_BROWSER_AGENT_TOOL_REGISTRY.map(tool => ({
        toolId: tool.toolId,
        kind: tool.toolId === 'source-session-broker' ? 'source_session_policy' : 'local_source_runner',
        command: tool.toolId.includes(':') ? `npm run ${tool.toolId}` : tool.runner,
        access: tool.requiresSourceSession ? 'approval_bound' : 'read',
        approvalRequired: tool.requiresSourceSession,
      })),
      sourceRefs: [
        { kind: 'system', ref: SOURCE_BROWSER_AGENT_PARENT_CARD_ID, role: 'parent-god-mode-extractor-contract' },
        { kind: 'system', ref: SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID, role: 'source-runtime-tool' },
        { kind: 'system', ref: SOURCE_SESSION_BROKER_CARD_ID, role: 'source-session-and-auth-boundary' },
      ],
      modelRoute: {
        routeId: 'foundation-agent-codex-direct',
        providerPolicy: 'adapter_only_runtime_selected_by_tool',
        modelCallsEnabled: false,
      },
      logging: {
        eventLog: 'foundation_source_browser_agent_events',
        transcriptPolicy: 'operator_visible_artifact_refs_only',
        proofRequired: true,
      },
      approvalBoundary: {
        defaultDecision: 'fail_closed',
        externalWrites: 'blocked_without_explicit_source_packet',
        approvalRequiredFor: ['external_write', 'paid_run', 'provider_call', 'model_call', 'live_extraction'],
      },
      allowedActions: [
        { actionId: 'plan_source_run', kind: 'read_local_command', enabled: true, readOnly: true, approvalRequired: false },
        { actionId: 'run_public_free_source', kind: 'read_local_command', enabled: true, readOnly: true, approvalRequired: false },
        { actionId: 'request_auth_needed', kind: 'approval_request', enabled: true, readOnly: true, approvalRequired: false },
        { actionId: 'external_write_or_purchase', kind: 'external_write', enabled: false, readOnly: false, approvalRequired: true },
      ],
      fallbackBehavior: 'Stop with a parked/auth-needed/failed-closed artifact when source policy, session, page health, or tool proof is missing.',
    },
  ]
  registry.claims = [
    ...registry.claims,
    {
      claimId: 'source-browser-agent-can-plan-source-run',
      agentId: SOURCE_BROWSER_AGENT_ID,
      capabilityId: 'source-packet-browser-run',
      actionId: 'plan_source_run',
      claimLabel: 'can_execute',
    },
    {
      claimId: 'source-browser-agent-external-writes-blocked',
      agentId: SOURCE_BROWSER_AGENT_ID,
      capabilityId: 'source-packet-browser-run',
      actionId: 'external_write_or_purchase',
      claimLabel: 'blocked',
      blockedReason: 'External writes, purchases, paid/private access, posting, messaging, downloads, and profile/credential mutation need separate approved action policy.',
    },
  ]
  return registry
}

export function buildSourceBrowserAgentHarnessSnapshot() {
  const registryOverlay = buildAgentRegistryOverlay()
  return {
    schemaVersion: 1,
    cardId: SOURCE_BROWSER_AGENT_CARD_ID,
    parentCardId: SOURCE_BROWSER_AGENT_PARENT_CARD_ID,
    agentId: SOURCE_BROWSER_AGENT_ID,
    agent: {
      displayName: 'Source Browser Agent',
      owner: 'Foundation Extractors',
      role: 'agentic-source-browser',
      permissionTier: 'source_packet_bound_worker',
      protocolRefs: [
        AGENT_CAPABILITY_REGISTRY_CARD_ID,
        AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
        SOURCE_SESSION_BROKER_CARD_ID,
        SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID,
      ],
    },
    stateMachine: {
      states: [...SOURCE_BROWSER_AGENT_REQUIRED_STATES],
      transitionRule: 'queued -> preparing_session -> observing -> planning -> acting/extracting/evaluating -> recording -> completed, or waiting_auth/blocked/failed_closed/parked with an artifact reason',
      terminalStates: ['completed', 'waiting_auth', 'blocked', 'failed_closed', 'parked'],
    },
    tools: SOURCE_BROWSER_AGENT_TOOL_REGISTRY.map(tool => ({ ...tool })),
    boundaries: {
      defaultDecision: 'fail_closed',
      forbiddenActions: [...SOURCE_BROWSER_AGENT_FORBIDDEN_ACTIONS],
      noExternalWritesByDefault: true,
      noNormalChromeProfile: true,
      rawSecretsVisible: false,
      paidPrivateAuthRequiresSessionBroker: true,
      evidenceRequiredBeforeClaim: true,
    },
    evidenceObligations: [
      'source_packet',
      'source_url',
      'source_family',
      'tool_route',
      'session_policy',
      'page_health',
      'state_history',
      'blocker_or_stop_reason',
      'artifact_refs',
      'side_effect_flags',
    ],
    registryOverlay,
    registryOverlayEvaluation: evaluateAgentCapabilityRegistry(registryOverlay),
    reportOnlyProof: true,
  }
}

export function planSourceBrowserAgentRun({
  packet = {},
  observation = {},
  now = new Date().toISOString(),
} = {}) {
  const normalizedPacket = {
    ...packet,
    url: normalizeUrl(packet.url || packet.targetUrl || packet.sourceUrl),
  }
  const stateHistory = []
  const pushState = (state, reason = '') => {
    stateHistory.push({ state, reason, at: now })
  }
  pushState('queued', 'source packet accepted by harness')

  const sourceFamily = sourceFamilyFromPacket(normalizedPacket)
  const action = text(normalizedPacket.action || normalizedPacket.requestedAction) || FAMILY_DEFAULT_ACTION[sourceFamily] || 'read_approved_source'
  const forbidden = forbiddenActionReason(action)
  const tool = toolForFamily(sourceFamily)
  const runnerCommand = buildRunnerCommand({ tool, packet: normalizedPacket, sourceFamily })
  const sessionPolicy = buildSourceBrowserSessionPolicy({
    targetUrl: normalizedPacket.url,
    sourceType: sourceFamily,
    sourceAccount: text(normalizedPacket.account || normalizedPacket.sourceAccount),
    profileMode: tool.requiresSourceSession ? 'persistent_isolated' : 'ephemeral_isolated',
    profileRoot: `${SOURCE_BROWSER_AGENT_RUN_ROOT}/profiles`,
  })

  pushState('preparing_session', tool.requiresSourceSession ? 'source session policy required' : 'public/free isolated browser policy prepared')

  const pageHealthInput = Object.keys(observation || {}).length
    ? observation
    : {
        url: normalizedPacket.url,
        title: text(normalizedPacket.title || normalizedPacket.label || hostOf(normalizedPacket.url)),
        bodyTextPreview: text(normalizedPacket.preview || normalizedPacket.summary || 'source packet queued for observation'),
        textChars: text(normalizedPacket.preview || normalizedPacket.summary || normalizedPacket.url).length,
      }
  const pageHealth = evaluateSourceBrowserPageHealth(pageHealthInput)
  pushState('observing', pageHealth.ok ? 'page/source state is healthy enough to plan' : 'browser/page state failed health check')

  const base = {
    schemaVersion: 1,
    cardId: SOURCE_BROWSER_AGENT_CARD_ID,
    parentCardId: SOURCE_BROWSER_AGENT_PARENT_CARD_ID,
    agentId: SOURCE_BROWSER_AGENT_ID,
    createdAt: now,
    sourcePacket: {
      sourceId: text(normalizedPacket.sourceId || normalizedPacket.id || hostOf(normalizedPacket.url) || sourceFamily),
      url: normalizedPacket.url,
      sourceType: text(normalizedPacket.sourceType || normalizedPacket.source_type),
      sourceFamily,
      action,
      account: text(normalizedPacket.account || normalizedPacket.sourceAccount),
      sourceBoundaryApproved: bool(normalizedPacket.sourceBoundaryApproved || normalizedPacket.source_boundary_approved),
    },
    toolRoute: tool,
    runnerCommand,
    sessionPolicy,
    pageHealth,
    stateHistory,
    evidenceObligations: buildSourceBrowserAgentHarnessSnapshot().evidenceObligations,
    sideEffects: emptySideEffects(),
    rawSecretPrinted: false,
    localOnlyArtifacts: true,
  }

  if (!normalizedPacket.url || !/^https?:\/\//i.test(normalizedPacket.url)) {
    pushState('failed_closed', 'source packet is missing a valid http(s) url')
    return {
      ...base,
      ok: false,
      status: 'failed_closed_invalid_source_url',
      terminalState: 'failed_closed',
      stopReason: 'valid_http_source_url_required',
      nextAction: 'Create an exact source packet with a valid http(s) URL before the agent can act.',
    }
  }

  if (pageHealth.ok === false) {
    const fallbackPlan = buildPageHealthFallbackPlan({
      pageHealth,
      sourceFamily,
      sessionPolicy,
    })
    pushState('failed_closed', 'browser page health guard blocked false-green run')
    const blockedPlan = {
      ...base,
      fallbackPlan,
      ok: false,
      status: 'failed_closed_browser_state_blocked',
      terminalState: 'failed_closed',
      stopReason: 'browser_state_blocked',
      nextAction: fallbackPlan.nextAction,
    }
    return {
      ...blockedPlan,
      operatorEscalation: buildSourceBrowserOperatorEscalation({
        plan: blockedPlan,
        fallbackPlan,
        now,
      }),
    }
  }

  pushState('planning', `selected ${tool.toolId} for ${sourceFamily}`)

  if (forbidden) {
    pushState('blocked', forbidden)
    return {
      ...base,
      ok: false,
      status: 'blocked_forbidden_action',
      terminalState: 'blocked',
      stopReason: forbidden,
      nextAction: 'Do not run this through the extractor. Create an explicit action policy and approval path if the action is still wanted.',
    }
  }

  const needsBroker = tool.requiresSourceSession ||
    ['creator_newsletters', 'skool_free_community', 'skool_paid_or_private', 'paid_course_training_platforms', 'team_member_agent_systems'].includes(sourceFamily)
  const brokerRequest = needsBroker ? sourceSessionRequestForPacket(normalizedPacket, sourceFamily) : null
  const brokerDecision = brokerRequest ? evaluateSourceSessionBrokerRequest(brokerRequest) : null

  if (brokerDecision?.reason === 'myicor_wrong_signup_branch_existing_google_sso_required') {
    pushState('failed_closed', 'wrong MyICOR signup/profile branch detected')
    return {
      ...base,
      brokerRequest,
      brokerDecision,
      ok: false,
      status: 'failed_closed_wrong_signup_branch',
      terminalState: 'failed_closed',
      stopReason: brokerDecision.reason,
      nextAction: brokerDecision.nextAction,
    }
  }

  if (brokerDecision && brokerDecision.ok !== true) {
    const terminalState = brokerDecision.status === 'auth_needed' ? 'waiting_auth' : 'blocked'
    pushState(terminalState, brokerDecision.reason)
    const blockedPlan = {
      ...base,
      brokerRequest,
      brokerDecision,
      ok: false,
      status: brokerDecision.status === 'auth_needed' ? 'waiting_auth' : 'blocked_source_session',
      terminalState,
      stopReason: brokerDecision.reason,
      authEvent: brokerDecision.authEvent || null,
      nextAction: brokerDecision.nextAction,
    }
    return {
      ...blockedPlan,
      operatorEscalation: brokerDecision.status === 'auth_needed'
        ? buildSourceBrowserOperatorEscalation({
            plan: blockedPlan,
            authEvent: brokerDecision.authEvent || {
              reason: brokerDecision.reason,
              actionNeeded: brokerDecision.nextAction,
            },
            now,
          })
        : null,
    }
  }

  if (sourceFamily === 'creator_newsletters' && /signup|subscribe|submit/i.test(action) && bool(normalizedPacket.allowExternalSignup) !== true) {
    pushState('parked', 'newsletter submit stays no-submit until source identity flow explicitly enables external signup')
    return {
      ...base,
      brokerRequest,
      brokerDecision,
      ok: true,
      status: 'parked_newsletter_no_submit_ready',
      terminalState: 'parked',
      stopReason: 'newsletter_submit_not_enabled_by_harness_v1',
      nextAction: 'Run newsletter:intake in no-submit mode first; only add apply/external signup after source identity and inbox routing are proven.',
    }
  }

  pushState('acting', `approved to hand off to ${tool.toolId}`)
  pushState('extracting', 'runner owns source-specific extraction under its own proof gate')
  pushState('evaluating', 'agent will evaluate runner output against evidence obligations and stop conditions')
  pushState('recording', 'agent will record artifact refs and source-stack disposition')
  pushState('completed', 'governed handoff plan completed; no external run started by harness proof')

  return {
    ...base,
    brokerRequest,
    brokerDecision,
    ok: true,
    status: 'ready_to_run_source_tool',
    terminalState: 'completed',
    stopReason: '',
    nextAction: runnerCommand?.displayCommand || 'No runner command generated.',
  }
}

function sourceBrowserPlanBlockers(plan = {}) {
  const blockers = []
  if (plan.stopReason) {
    blockers.push({
      type: plan.terminalState || 'source_browser_agent_stop',
      reason: plan.stopReason,
      nextAction: plan.nextAction || '',
      url: plan.sourcePacket?.url || '',
    })
  }
  for (const finding of list(plan.pageHealth?.findings)) {
    blockers.push({
      type: finding.check || 'page_health_finding',
      reason: finding.detail || finding.check || 'page health finding',
      nextAction: finding.recovery || '',
      url: plan.sourcePacket?.url || '',
    })
  }
  return blockers
}

export function buildSourceBrowserAgentSourceStackUpdate(plan = {}) {
  const packet = plan.sourcePacket || {}
  const sourceId = text(packet.sourceId || hostOf(packet.url) || packet.sourceFamily || SOURCE_BROWSER_AGENT_SOURCE_ID)
  return {
    sourceId,
    creatorId: sourceId,
    creatorName: text(packet.sourceName || packet.creatorName || sourceId),
    sourceFamily: text(packet.sourceFamily),
    sourceType: text(packet.sourceType),
    url: text(packet.url),
    account: text(packet.account),
    status: text(plan.status),
    terminalState: text(plan.terminalState),
    toolRoute: text(plan.toolRoute?.toolId),
    runnerCommand: text(plan.runnerCommand?.displayCommand),
    nextAction: text(plan.nextAction),
    surfaces: {
      sourceBrowserAgent: plan.ok === true ? 'planned_or_ready_for_runner' : text(plan.terminalState || 'blocked'),
      auth: plan.authEvent ? 'auth_needed' : 'not_required_or_ready',
      pageHealth: text(plan.pageHealth?.status),
      operatorEscalation: plan.operatorEscalation ? 'prepared_dry_run' : 'not_required',
    },
  }
}

export function buildSourceBrowserAgentCrawlItemInput(plan = {}, {
  batchRunId = '',
  capturedAt = plan.createdAt || new Date().toISOString(),
  row = {},
} = {}) {
  const packet = plan.sourcePacket || {}
  const url = text(packet.url || row.url)
  const sourceFamily = text(packet.sourceFamily || row.sourceFamily || sourceFamilyFromPacket({ ...row, url }))
  const sourceId = text(packet.sourceId || row.sourceId || hostOf(url) || sourceFamily || SOURCE_BROWSER_AGENT_SOURCE_ID)
  const externalId = text(row.rowId || row.externalId || `${sourceId}:${url}`)
  const bucketId = bucketIdForSourceFamily(sourceFamily)
  const blockers = sourceBrowserPlanBlockers(plan)
  const ok = plan.ok === true
  const terminalState = text(plan.terminalState || (ok ? 'completed' : 'blocked'))
  const runner = text(plan.toolRoute?.toolId || row.runner || plan.runnerCommand?.packageScript)
  const completed = capturedAt || new Date().toISOString()
  const artifactId = `${SOURCE_BROWSER_AGENT_TARGET_KEY}:${safeKey(externalId)}:${stableHash({ externalId, status: plan.status, terminalState, url }).slice(0, 12)}`
  return {
    itemKey: `${SOURCE_BROWSER_AGENT_TARGET_KEY}:${safeKey(externalId).slice(0, 120)}:${stableHash(externalId).slice(0, 12)}`,
    targetKey: SOURCE_BROWSER_AGENT_TARGET_KEY,
    sourceId: SOURCE_BROWSER_AGENT_SOURCE_ID,
    externalId,
    itemType: 'source_browser_agent_plan',
    status: ok ? 'succeeded' : 'failed',
    fingerprint: stableHash({
      sourceId,
      url,
      sourceFamily,
      status: plan.status,
      terminalState,
      runner,
      nextAction: plan.nextAction,
    }),
    attemptCount: number(row.attemptCount, 1),
    lastError: ok ? null : text(plan.stopReason || plan.status || 'source_browser_agent_blocked'),
    artifactId,
    discoveredAt: text(row.discoveredAt || completed),
    processedAt: completed,
    metadata: {
      schemaVersion: 1,
      sourceBrowserAgentReadbackVersion: SOURCE_BROWSER_AGENT_READBACK_VERSION,
      cardId: SOURCE_BROWSER_AGENT_CARD_ID,
      batchRunId: text(batchRunId),
      rowId: text(row.rowId || externalId),
      bucketId,
      runner,
      runnerCommand: plan.runnerCommand || null,
      sourceType: text(packet.sourceType || row.sourceType || sourceFamily),
      sourceFamily,
      url,
      host: hostOf(url),
      status: text(plan.status),
      terminalState,
      stopReason: text(plan.stopReason),
      ok,
      pagesRead: 0,
      handsEvents: 0,
      newsletterCandidates: sourceFamily === 'creator_newsletters' ? 1 : 0,
      paidGateEvaluations: ['skool_paid_or_private', 'paid_course_training_platforms', 'team_member_agent_systems'].includes(sourceFamily) ? 1 : 0,
      pageSummaries: [{
        url,
        title: text(row.title || packet.title || hostOf(url) || sourceId),
        status: text(plan.pageHealth?.status),
      }].filter(page => page.url || page.title),
      freeResourceCaptures: [],
      blockers,
      valueScore: null,
      usefulSignals: [
        text(plan.toolRoute?.posture),
        text(plan.nextAction),
      ].filter(Boolean).map(signal => ({ text: signal })),
      authNeeded: plan.authEvent || null,
      fallbackPlan: plan.fallbackPlan || null,
      operatorEscalation: plan.operatorEscalation || null,
      sourceStackUpdate: buildSourceBrowserAgentSourceStackUpdate(plan),
      sourceBrowserAgentPlan: {
        agentId: SOURCE_BROWSER_AGENT_ID,
        sourceId,
        sourceFamily,
        toolRoute: runner,
        terminalState,
        status: text(plan.status),
        stopReason: text(plan.stopReason),
        stateHistory: list(plan.stateHistory).map(state => ({
          state: text(state.state),
          reason: text(state.reason),
          at: text(state.at),
        })),
        runnerCommand: plan.runnerCommand || null,
        brokerDecision: plan.brokerDecision ? {
          ok: plan.brokerDecision.ok === true,
          status: text(plan.brokerDecision.status),
          reason: text(plan.brokerDecision.reason),
          nextAction: text(plan.brokerDecision.nextAction),
        } : null,
        pageHealth: plan.pageHealth || null,
        fallbackPlan: plan.fallbackPlan || null,
        operatorEscalation: plan.operatorEscalation || null,
      },
      artifacts: {},
      sideEffects: plan.sideEffects || emptySideEffects(),
      noScoperPromotion: true,
      noAutoBacklog: true,
      noExternalWrites: true,
    },
  }
}

export function buildSourceBrowserAgentDogfoodProof() {
  const snapshot = buildSourceBrowserAgentHarnessSnapshot()
  const publicPlan = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-public-resource',
      url: 'https://example.com/agent-browser-guide',
      sourceType: 'public_or_free_source',
      title: 'Agent browser guide',
      preview: 'Guide about agent browser extraction, repos, resources, and implementation steps.',
    },
    now: '2026-05-28T13:00:00.000Z',
  })
  const repoPlan = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-repo',
      url: 'https://github.com/acme/agent-memory',
      sourceType: 'github_docs_public_resources',
      title: 'Agent memory repo',
      preview: 'README, docs, examples, and source code for agent memory.',
    },
    now: '2026-05-28T13:01:00.000Z',
  })
  const newsletterPlan = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-newsletter',
      url: 'https://www.aihero.dev/newsletter',
      sourceType: 'creator_newsletter',
      action: 'free_newsletter_signup',
      requiresAccountCreation: true,
      title: 'AI Hero newsletter',
      preview: 'Newsletter signup page for AI workflows.',
    },
    now: '2026-05-28T13:02:00.000Z',
  })
  const skoolNeedsSession = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-free-skool',
      url: 'https://www.skool.com/chase-ai-community/about',
      sourceType: 'skool_free_community',
      title: 'Chase AI free community',
      preview: 'Free community about agents, classroom resources, and recent posts.',
    },
    now: '2026-05-28T13:03:00.000Z',
  })
  const skoolReady = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-free-skool-ready',
      url: 'https://www.skool.com/chase-ai-community/about',
      sourceType: 'skool_free_community',
      persistentProfilePresent: true,
      sessionHealthy: true,
      keychainPresent: true,
      loginRecipePresent: true,
      title: 'Chase AI free community',
      preview: 'Free community about agents, classroom resources, and recent posts.',
    },
    now: '2026-05-28T13:04:00.000Z',
  })
  const myicorNoBoundary = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'myicor',
      url: 'https://app.myicor.com/login',
      sourceType: 'paid_course_training_platforms',
      sourceBoundaryApproved: false,
      title: 'myICOR login',
      preview: 'Paid course login.',
    },
    now: '2026-05-28T13:05:00.000Z',
  })
  const myicorMfa = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'myicor',
      url: 'https://app.myicor.com/login',
      sourceType: 'paid_course_training_platforms',
      sourceBoundaryApproved: true,
      account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
      authMethod: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      keychainPresent: true,
      loginRecipePresent: true,
      mfaChallenge: true,
      title: 'myICOR Google login',
      preview: 'Existing Google SSO account.',
    },
    now: '2026-05-28T13:06:00.000Z',
  })
  const myicorWrongSignup = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'myicor',
      url: 'https://app.myicor.com/login',
      sourceType: 'paid_course_training_platforms',
      sourceBoundaryApproved: true,
      account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
      authMethod: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      keychainPresent: true,
      loginRecipePresent: true,
      signupSurfaceDetected: true,
      title: 'Start Free',
      preview: 'Create your profile.',
    },
    now: '2026-05-28T13:07:00.000Z',
  })
  const badBrowserState = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'blank-browser',
      url: 'https://example.com/source',
      sourceType: 'public_or_free_source',
    },
    observation: {
      url: 'about:blank',
      title: '',
      bodyTextPreview: '',
      textChars: 0,
    },
    now: '2026-05-28T13:08:00.000Z',
  })
  const browserChallengeState = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'challenge-community',
      url: 'https://community.example.com/',
      sourceType: 'free_community',
      title: 'Challenge community',
    },
    observation: {
      url: 'https://community.example.com/',
      title: 'Just a moment...',
      bodyTextPreview: 'Checking your browser before accessing the community. Enable JavaScript and cookies to continue.',
      textChars: 91,
    },
    now: '2026-05-28T13:08:30.000Z',
  })
  const dangerousAction = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'dangerous-action',
      url: 'https://example.com/checkout',
      sourceType: 'public_or_free_source',
      action: 'purchase',
      title: 'Checkout',
      preview: 'Payment page.',
    },
    now: '2026-05-28T13:09:00.000Z',
  })

  const cases = [
    {
      name: 'public_free_resource_routes_to_source_god_mode',
      ok: publicPlan.ok === true && publicPlan.runnerCommand?.packageScript === 'source:god-mode' && publicPlan.terminalState === 'completed',
      status: publicPlan.status,
    },
    {
      name: 'public_repo_routes_to_repo_deep_review',
      ok: repoPlan.ok === true && repoPlan.runnerCommand?.packageScript === 'repo:deep-review',
      status: repoPlan.status,
    },
    {
      name: 'newsletter_signup_no_submit_parks_until_intake_policy',
      ok: newsletterPlan.ok === true && newsletterPlan.terminalState === 'parked' && newsletterPlan.sideEffects.submittedForm === false,
      status: newsletterPlan.status,
    },
    {
      name: 'free_skool_without_session_waits_auth',
      ok: skoolNeedsSession.ok === false && skoolNeedsSession.terminalState === 'waiting_auth',
      status: skoolNeedsSession.status,
    },
    {
      name: 'free_skool_with_session_routes_to_runner',
      ok: skoolReady.ok === true && skoolReady.runnerCommand?.packageScript === 'skool:free-god-mode',
      status: skoolReady.status,
    },
    {
      name: 'paid_myicor_without_boundary_blocks',
      ok: myicorNoBoundary.ok === false && myicorNoBoundary.terminalState === 'blocked',
      status: myicorNoBoundary.status,
    },
    {
      name: 'paid_myicor_mfa_emits_auth_needed',
      ok: myicorMfa.ok === false && myicorMfa.terminalState === 'waiting_auth' && myicorMfa.authEvent?.eventType === 'auth_needed',
      status: myicorMfa.status,
    },
    {
      name: 'paid_myicor_wrong_signup_branch_fails_closed',
      ok: myicorWrongSignup.ok === false && myicorWrongSignup.terminalState === 'failed_closed',
      status: myicorWrongSignup.status,
    },
    {
      name: 'bad_browser_state_fails_closed',
      ok: badBrowserState.ok === false && badBrowserState.terminalState === 'failed_closed',
      status: badBrowserState.status,
    },
    {
      name: 'browser_challenge_gets_fallback_plan',
      ok: browserChallengeState.ok === false &&
        browserChallengeState.terminalState === 'failed_closed' &&
        browserChallengeState.fallbackPlan?.status === 'browser_challenge_fallback_required' &&
        browserChallengeState.fallbackPlan?.sourceSessionRequired === true,
      status: browserChallengeState.fallbackPlan?.route || browserChallengeState.status,
    },
    {
      name: 'dangerous_action_blocks',
      ok: dangerousAction.ok === false && dangerousAction.terminalState === 'blocked',
      status: dangerousAction.status,
    },
    {
      name: 'proof_has_no_external_side_effects',
      ok: [publicPlan, repoPlan, newsletterPlan, skoolNeedsSession, skoolReady, myicorNoBoundary, myicorMfa, myicorWrongSignup, badBrowserState, browserChallengeState, dangerousAction]
        .every(plan => Object.values(plan.sideEffects || {}).every(value => value === false)),
      status: 'side_effect_flags_false',
    },
  ]

  return {
    ok: snapshot.registryOverlayEvaluation.ok === true &&
      cases.every(testCase => testCase.ok),
    snapshot,
    cases,
    reports: {
      publicPlan,
      repoPlan,
      newsletterPlan,
      skoolNeedsSession,
      skoolReady,
      myicorNoBoundary,
      myicorMfa,
      myicorWrongSignup,
      badBrowserState,
      browserChallengeState,
      dangerousAction,
    },
  }
}

export function evaluateSourceBrowserAgentHarness(snapshot = buildSourceBrowserAgentHarnessSnapshot()) {
  const findings = []
  const states = new Set(list(snapshot.stateMachine?.states))
  const tools = new Set(list(snapshot.tools).map(tool => tool.toolId))
  for (const state of SOURCE_BROWSER_AGENT_REQUIRED_STATES) {
    if (!states.has(state)) findings.push({ check: 'required_state_present', detail: state })
  }
  for (const toolId of ['source:god-mode', 'repo:deep-review', 'newsletter:intake', 'skool:free-god-mode', 'source-session-broker']) {
    if (!tools.has(toolId)) findings.push({ check: 'required_tool_present', detail: toolId })
  }
  for (const ref of [AGENT_CAPABILITY_REGISTRY_CARD_ID, AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID, SOURCE_SESSION_BROKER_CARD_ID, SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID]) {
    if (!list(snapshot.agent?.protocolRefs).includes(ref)) findings.push({ check: 'protocol_ref_present', detail: ref })
  }
  if (snapshot.registryOverlayEvaluation?.ok !== true) {
    findings.push({ check: 'agent_registry_overlay_validates', detail: JSON.stringify(snapshot.registryOverlayEvaluation?.violations || []) })
  }
  if (snapshot.boundaries?.rawSecretsVisible !== false) findings.push({ check: 'raw_secrets_hidden', detail: String(snapshot.boundaries?.rawSecretsVisible) })
  if (snapshot.boundaries?.noExternalWritesByDefault !== true) findings.push({ check: 'external_writes_blocked_by_default', detail: String(snapshot.boundaries?.noExternalWritesByDefault) })
  if (snapshot.boundaries?.paidPrivateAuthRequiresSessionBroker !== true) findings.push({ check: 'paid_private_uses_session_broker', detail: String(snapshot.boundaries?.paidPrivateAuthRequiresSessionBroker) })
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'ready',
    findings,
  }
}
