import { buildKeychainSecretRef } from './credential-vault.js'
import {
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  buildAuthNeededEvent,
} from './harlan-auth-escalation-loop.js'

export const SOURCE_SESSION_BROKER_CARD_ID = 'SOURCE-SESSION-BROKER-001'
export const SOURCE_SESSION_BROKER_CLOSEOUT_KEY = 'source-session-broker-v1'
export const SOURCE_SESSION_BROKER_PLAN_PATH = 'docs/process/source-session-broker-001-plan.md'
export const SOURCE_SESSION_BROKER_APPROVAL_PATH = 'docs/process/approvals/SOURCE-SESSION-BROKER-001.json'
export const SOURCE_SESSION_BROKER_SCRIPT_PATH = 'scripts/process-source-session-broker-check.mjs'
export const SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT = 'ai@bensoncrew.ca'
export const SOURCE_SESSION_BROKER_FALLBACK_FREE_ACCOUNT = 'crewbert@bensoncrew.ca'

export const SOURCE_SESSION_BROKER_FORBIDDEN_ACTIONS = [
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
]

export const SOURCE_SESSION_BROKER_BACKLOG_ITEM = {
  id: SOURCE_SESSION_BROKER_CARD_ID,
  title: 'Build closed-loop source session broker for paid and free sources',
  team: 'foundation',
  lane: 'scoped',
  priority: 'P0',
  rank: 9,
  source: 'Steve May 26 closed-loop credential/session correction',
  summary: 'Build the reusable session layer that lets approved extractors use isolated browser profiles, macOS Keychain credential refs, source identities, login recipes, auth-needed escalation, wait/resume, and fail-closed behavior without Steve babysitting every login.',
  whyItMatters: 'God Mode extraction cannot reach Skool, MyICOR, paid course platforms, newsletters, free communities, or future team-member systems if every login depends on Steve being present. The system needs a safe broker that can try the saved session first, use vaulted credentials when allowed, ask the human through their agent when MFA blocks progress, then resume or fail closed.',
  nextAction: 'Use SOURCE-SESSION-BROKER-001 as the source access layer under EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001: save source credentials in macOS Keychain, reuse isolated profiles, emit auth-needed events through the Harlan loop when login/MFA blocks progress, and prove one bounded Skool/MyICOR source run before broad paid/private extraction.',
  statusNote: 'V1 scope: generic source credential vault commands, broker contract, auth-needed event contract, paid-source local mapper integration, persistent authorized browser profiles, MyICOR native read-only connector/MCP preference when available and approved, MyICOR login-recipe path when a Keychain credential exists, and fail-closed auth-needed reports when a session/credential/MFA is missing. Standing free-source identity is ai@bensoncrew.ca with crewbert@bensoncrew.ca fallback. V1 does not buy anything, trade, change banking/payment/account/profile settings, post/comment/message, submit broad forms, download unsafe files, leak raw secrets, or store paid/private content in git. Continuations remain live for full Harlan live delivery, Skool live navigation, MyICOR live navigation, newsletter signup proof, and full God Mode extractor runner execution.',
}

export const SOURCE_SESSION_BROKER_SOURCE_POLICIES = [
  {
    sourceFamily: 'public_free_resources',
    defaultIdentity: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    standingApproval: true,
    authMode: 'none_or_free_source_identity',
    sessionProfile: 'per_source_when_needed',
    allowedActions: ['read_public_page', 'follow_public_free_links', 'safe_free_resource_capture'],
    stopAt: ['login_required', 'private_area', 'paid_gate', 'purchase', 'unexpected_form', 'unsafe_download'],
  },
  {
    sourceFamily: 'creator_newsletters',
    defaultIdentity: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    standingApproval: true,
    authMode: 'free_signup_identity',
    sessionProfile: 'per_creator_or_newsletter_source',
    allowedActions: ['free_newsletter_signup', 'confirmation_email', 'issue_readback'],
    stopAt: ['payment_required', 'phone_required', 'credit_card_required', 'profile_mutation', 'post_or_message'],
  },
  {
    sourceFamily: 'skool_free_community',
    defaultIdentity: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    standingApproval: true,
    authMode: 'free_source_identity_session',
    sessionProfile: 'isolated_skool_free_profile',
    allowedActions: ['free_join_when_allowed', 'read_allowed_free_posts', 'read_free_courses', 'read_pinned_resources'],
    stopAt: ['paid_gate', 'private_member_area', 'dm', 'post', 'comment', 'account_change', 'unsafe_download'],
  },
  {
    sourceFamily: 'skool_paid_or_private',
    defaultIdentity: 'approved_paid_account',
    standingApproval: false,
    authMode: 'authorized_profile_or_keychain_plus_mfa',
    sessionProfile: 'isolated_paid_skool_profile',
    allowedActions: ['read_approved_paid_area_after_packet'],
    stopAt: ['purchase', 'profile_mutation', 'post', 'comment', 'dm', 'unapproved_area', 'unsafe_download'],
  },
  {
    sourceFamily: 'paid_course_training_platforms',
    defaultIdentity: 'approved_paid_account',
    standingApproval: false,
    authMode: 'native_readonly_connector_or_authorized_profile_or_keychain_plus_mfa',
    sessionProfile: 'isolated_paid_course_profile',
    preferredAccessRoute: 'native_readonly_connector_when_available',
    allowedActions: [
      'read_native_mcp_connector_when_available',
      'read_approved_course_area_after_packet',
      'watch_approved_lesson_after_packet',
    ],
    stopAt: ['purchase', 'profile_mutation', 'forms', 'unapproved_area', 'unsafe_download', 'external_write', 'connector_write_scope'],
  },
  {
    sourceFamily: 'team_member_agent_systems',
    defaultIdentity: 'per_human_authorized_account',
    standingApproval: false,
    authMode: 'delegated_user_session_with_source_packet',
    sessionProfile: 'per_user_per_source_isolated_profile',
    allowedActions: ['read_or_act_only_inside_user_approved_action_policy'],
    stopAt: ['money_movement', 'trade', 'purchase', 'legal_signature', 'external_send_without_policy'],
  },
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function hasForbiddenAction(action = '') {
  const normalized = text(action).toLowerCase()
  return SOURCE_SESSION_BROKER_FORBIDDEN_ACTIONS.includes(normalized)
}

function policyFor(sourceFamily = '') {
  return SOURCE_SESSION_BROKER_SOURCE_POLICIES.find(policy => policy.sourceFamily === sourceFamily) || null
}

export function buildSourceSessionSecretRef({
  source = '',
  account = '',
} = {}) {
  if (!text(source) || !text(account)) return ''
  return buildKeychainSecretRef({ source, account })
}

export function buildSourceSessionBrokerAuthNeededEvent({
  sourceSystem = '',
  accountLabel = '',
  blocker = '',
  jobId = '',
  artifactRef = '',
  createdAt = '',
} = {}) {
  return buildAuthNeededEvent({
    sourceSystem: text(sourceSystem) || 'source-session',
    providerRouteKey: 'source-session-broker',
    accountLabel: text(accountLabel) || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    blocker: text(blocker) || 'source session login, credential, or MFA is required',
    actionNeeded: 'Approve the login/MFA prompt or update the vaulted credential, then reply DONE so the broker can silently reverify and resume.',
    jobId: text(jobId) || 'source-session-broker-auth-needed',
    artifactRef: text(artifactRef) || 'artifact://source-session-broker/auth-needed',
    createdAt: text(createdAt) || new Date().toISOString(),
    credentialRef: 'macos-keychain:metadata-only',
  })
}

export function buildSourceSessionBrokerContractSnapshot() {
  return {
    cardId: SOURCE_SESSION_BROKER_CARD_ID,
    closeoutKey: SOURCE_SESSION_BROKER_CLOSEOUT_KEY,
    planPath: SOURCE_SESSION_BROKER_PLAN_PATH,
    defaultFreeAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    fallbackFreeAccount: SOURCE_SESSION_BROKER_FALLBACK_FREE_ACCOUNT,
    credentialVault: {
      storage: 'macos_keychain',
      storesRawSecretInRepo: false,
      rawSecretVisibleToAgent: false,
      secretRefOnlyInDbAndReports: true,
    },
    browserProfiles: {
      isolatedBySourceAndAccount: true,
      persistentProfileFirst: true,
      localOnlyProfileRoot: '.openclaw/supervised-paid-source-map/profiles',
    },
    authNeededLoop: {
      cardId: HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
      eventType: 'auth_needed',
      waitForHumanAgentDone: true,
      silentReverifyBeforeResume: true,
      failClosedOnTimeout: true,
      liveDeliveryProofContinuation: 'HARLAN-AUTH-LIVE-DELIVERY-002',
    },
    accessRoutePreference: [
      'native_readonly_connector_or_mcp_first_when_source_offers_it',
      'authorized_persistent_browser_profile_second',
      'keychain_login_recipe_third',
      'human_agent_auth_needed_wait_resume_fail_closed_when_blocked',
    ],
    myicorSpecificDiscovery: {
      sourceFamily: 'paid_course_training_platforms',
      instanceName: 'myICOR',
      preferredRoute: 'myicor_readonly_mcp_if_available',
      paidAccountAuthMethod: 'google_oauth_sign_in',
      publicHomeUrl: 'https://myicor.com/',
      appLoginUrl: 'https://app.myicor.com/login',
      loginPathRule: 'Use Sign in / Log in with Google for the existing paid account. Do not use Start Free, signup, or onboarding as the paid-account path.',
      passwordVaultRule: 'Do not ask for or store a MyICOR password unless Steve later confirms MyICOR has a separate password login. Current paid access is Google OAuth.',
      liveMcpEndpoint: 'https://mcp.myicor.com/mcp',
      staleSseEndpoint: 'https://mcp.myicor.com/sse',
      oauthMetadataEndpoint: 'https://app.myicor.com/.well-known/oauth-authorization-server',
      oauthAuthorizeEndpoint: 'https://app.myicor.com/mcp/authorize',
      oauthTokenEndpoint: 'https://app.myicor.com/api/oauth/token',
      keychainTokenSource: 'myicor-mcp-oauth',
      supportedReadOnlyScopes: ['mcp:read', 'mcp:tools', 'mcp:progress', 'mcp:inner-circle'],
      expectedReadScopesFromSteveNote: [
        'lessons',
        'articles',
        'podcast_transcripts',
        'tool_stack',
        'growth_assignment_progress',
        'workstreams',
      ],
      requiredBoundary: 'read_only_citing_connector_scope_before_broad_training_synthesis',
      browserFallback: true,
    },
    policies: SOURCE_SESSION_BROKER_SOURCE_POLICIES.map(policy => ({
      ...policy,
      allowedActions: [...policy.allowedActions],
      stopAt: [...policy.stopAt],
    })),
    forbiddenActions: [...SOURCE_SESSION_BROKER_FORBIDDEN_ACTIONS],
    reportOnlyProof: true,
    externalNotificationSentByProof: false,
    externalAccountCreatedByProof: false,
    rawSecretPrinted: false,
  }
}

export function evaluateSourceSessionBrokerRequest(request = {}) {
  const sourceFamily = text(request.sourceFamily || 'paid_course_training_platforms')
  const policy = policyFor(sourceFamily)
  const action = text(request.action || 'read_approved_source')
  const account = text(request.account || policy?.defaultIdentity || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT)
  const source = text(request.source || sourceFamily)
  const sourceBoundaryApproved = request.sourceBoundaryApproved === true || policy?.standingApproval === true
  const keychainPresent = request.keychainPresent === true
  const persistentProfilePresent = request.persistentProfilePresent === true
  const sessionHealthy = request.sessionHealthy === true
  const loginRecipePresent = request.loginRecipePresent === true
  const mfaChallenge = request.mfaChallenge === true
  const requiresAccountCreation = request.requiresAccountCreation === true
  const freeSignupApproved = request.freeSignupApproved === true || (
    policy?.standingApproval === true &&
    ['free_newsletter_signup', 'free_join_when_allowed'].includes(action)
  )
  const nativeReadonlyConnectorPresent = request.nativeReadonlyConnectorPresent === true
  const nativeReadonlyConnectorApproved = request.nativeReadonlyConnectorApproved === true
  const secretRef = buildSourceSessionSecretRef({ source, account })

  const base = {
    sourceFamily,
    action,
    account,
    source,
    policyKnown: Boolean(policy),
    standingApproval: Boolean(policy?.standingApproval),
    sourceBoundaryApproved,
    secretRef,
    rawSecretPrinted: false,
    externalWriteStarted: false,
    purchaseStarted: false,
    credentialMutated: false,
    profileMutatedOutsideSession: false,
  }

  if (!policy) {
    return {
      ...base,
      ok: false,
      status: 'blocked',
      reason: 'unknown_source_family',
      nextAction: 'Create a source-family session policy before login or extraction.',
    }
  }
  if (hasForbiddenAction(action)) {
    return {
      ...base,
      ok: false,
      status: 'blocked',
      reason: 'separate_action_policy_required',
      nextAction: 'Do not run this through the source session broker. Create an explicit action policy and human approval path.',
    }
  }
  if (!sourceBoundaryApproved) {
    return {
      ...base,
      ok: false,
      status: 'blocked',
      reason: 'source_packet_or_session_boundary_required',
      nextAction: 'Create and approve the exact source packet, session boundary, storage rule, and content-use rule before login.',
    }
  }
  if (nativeReadonlyConnectorPresent) {
    if (!nativeReadonlyConnectorApproved) {
      return {
        ...base,
        ok: false,
        status: 'blocked',
        reason: 'native_readonly_connector_scope_approval_required',
        nextAction: 'Approve the connector scope, source identity, read-only boundaries, citation/storage rules, and no-write limits before the broker uses the native route.',
      }
    }
    return {
      ...base,
      ok: true,
      status: 'native_readonly_connector_ready',
      reason: 'source_offers_readonly_connector_route',
      nextAction: 'Use the source native read-only connector first, cite returned source records, and use browser Hands only for gaps the connector cannot answer.',
    }
  }
  if (requiresAccountCreation) {
    if (!freeSignupApproved) {
      return {
        ...base,
        ok: false,
        status: 'blocked',
        reason: 'account_creation_requires_free_source_policy_or_approval',
        nextAction: 'Do not create an account until the source identity and free signup policy are approved.',
      }
    }
    return {
      ...base,
      ok: true,
      status: 'free_account_creation_allowed',
      reason: 'standing_free_source_identity_policy',
      generatedCredentialStorage: 'macos_keychain',
      nextAction: 'Create the free account with the source identity, store the generated password in Keychain, and record only metadata.',
    }
  }
  if (persistentProfilePresent && sessionHealthy) {
    return {
      ...base,
      ok: true,
      status: 'session_ready',
      reason: 'authorized_persistent_profile_healthy',
      nextAction: 'Run the bounded source worker with the isolated profile and source packet limits.',
    }
  }
  if (!keychainPresent) {
    return {
      ...base,
      ok: false,
      status: 'auth_needed',
      reason: 'keychain_secret_missing',
      authEvent: buildSourceSessionBrokerAuthNeededEvent({
        sourceSystem: source,
        accountLabel: account,
        blocker: 'Keychain credential is missing for this approved source account.',
      }),
      nextAction: 'Store the source credential in macOS Keychain or complete supervised login once, then rerun unattended.',
    }
  }
  if (!loginRecipePresent) {
    return {
      ...base,
      ok: false,
      status: 'auth_needed',
      reason: 'login_recipe_missing',
      authEvent: buildSourceSessionBrokerAuthNeededEvent({
        sourceSystem: source,
        accountLabel: account,
        blocker: 'No source-specific login recipe exists yet.',
      }),
      nextAction: 'Add a source-specific login recipe or complete supervised profile login, then rerun unattended.',
    }
  }
  if (mfaChallenge) {
    return {
      ...base,
      ok: false,
      status: 'auth_needed',
      reason: 'mfa_or_human_verification_required',
      authEvent: buildSourceSessionBrokerAuthNeededEvent({
        sourceSystem: source,
        accountLabel: account,
        blocker: 'MFA or human verification is required.',
      }),
      nextAction: 'Notify Steve through the auth-needed loop, wait for DONE, silently reverify, then resume or fail closed.',
    }
  }
  return {
    ...base,
    ok: true,
    status: 'login_recipe_ready',
    reason: 'keychain_secret_and_login_recipe_available',
    nextAction: 'Attempt login inside the isolated profile without exposing the raw secret; emit auth_needed if verification appears.',
  }
}

export function evaluateSourceSessionBrokerContract(snapshot = buildSourceSessionBrokerContractSnapshot()) {
  const findings = []
  const families = new Set(list(snapshot.policies).map(policy => policy.sourceFamily))
  for (const family of [
    'public_free_resources',
    'creator_newsletters',
    'skool_free_community',
    'skool_paid_or_private',
    'paid_course_training_platforms',
    'team_member_agent_systems',
  ]) {
    if (!families.has(family)) findings.push({ check: 'required_source_policy_present', detail: family })
  }
  if (snapshot.defaultFreeAccount !== SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT) {
    findings.push({ check: 'default_free_account_is_aios_source_identity', detail: snapshot.defaultFreeAccount })
  }
  if (snapshot.credentialVault?.rawSecretVisibleToAgent !== false) {
    findings.push({ check: 'raw_secret_hidden_from_agents', detail: 'rawSecretVisibleToAgent must be false' })
  }
  if (snapshot.browserProfiles?.isolatedBySourceAndAccount !== true) {
    findings.push({ check: 'profiles_isolated_by_source_and_account', detail: 'missing isolation' })
  }
  if (snapshot.authNeededLoop?.waitForHumanAgentDone !== true || snapshot.authNeededLoop?.failClosedOnTimeout !== true) {
    findings.push({ check: 'auth_needed_wait_resume_fail_closed_loop', detail: JSON.stringify(snapshot.authNeededLoop) })
  }
  if (snapshot.externalNotificationSentByProof || snapshot.externalAccountCreatedByProof || snapshot.rawSecretPrinted) {
    findings.push({ check: 'proof_has_no_external_or_secret_side_effects', detail: 'proof side effect flag set' })
  }
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildSourceSessionBrokerDogfoodProof() {
  const snapshot = buildSourceSessionBrokerContractSnapshot()
  const contract = evaluateSourceSessionBrokerContract(snapshot)
  const markSkoolSession = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'skool_paid_or_private',
    source: 'mark-skool',
    account: 'ai@bensoncrew.ca',
    action: 'read_approved_paid_area_after_packet',
    sourceBoundaryApproved: true,
    persistentProfilePresent: true,
    sessionHealthy: true,
  })
  const myicorLoginRecipe = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'paid_course_training_platforms',
    source: 'myicor',
    account: 'ai@bensoncrew.ca',
    action: 'read_approved_course_area_after_packet',
    sourceBoundaryApproved: true,
    keychainPresent: true,
    loginRecipePresent: true,
  })
  const missingMyicorCredential = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'paid_course_training_platforms',
    source: 'myicor',
    account: 'ai@bensoncrew.ca',
    action: 'read_approved_course_area_after_packet',
    sourceBoundaryApproved: true,
    keychainPresent: false,
    loginRecipePresent: true,
  })
  const mfaChallenge = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'paid_course_training_platforms',
    source: 'myicor',
    account: 'ai@bensoncrew.ca',
    action: 'read_approved_course_area_after_packet',
    sourceBoundaryApproved: true,
    keychainPresent: true,
    loginRecipePresent: true,
    mfaChallenge: true,
  })
  const freeNewsletterSignup = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'creator_newsletters',
    source: 'aihero-newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    action: 'free_newsletter_signup',
    requiresAccountCreation: true,
  })
  const myicorReadonlyMcp = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'paid_course_training_platforms',
    source: 'myicor',
    account: 'ai@bensoncrew.ca',
    action: 'read_native_mcp_connector_when_available',
    sourceBoundaryApproved: true,
    nativeReadonlyConnectorPresent: true,
    nativeReadonlyConnectorApproved: true,
  })
  const myicorReadonlyMcpNeedsScope = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'paid_course_training_platforms',
    source: 'myicor',
    account: 'ai@bensoncrew.ca',
    action: 'read_native_mcp_connector_when_available',
    sourceBoundaryApproved: true,
    nativeReadonlyConnectorPresent: true,
    nativeReadonlyConnectorApproved: false,
  })
  const tradeBlocked = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'team_member_agent_systems',
    source: 'brokerage-or-trading-platform',
    account: 'team-member',
    action: 'stock_trade',
    sourceBoundaryApproved: true,
    keychainPresent: true,
    loginRecipePresent: true,
  })
  const noBoundary = evaluateSourceSessionBrokerRequest({
    sourceFamily: 'skool_paid_or_private',
    source: 'unapproved-paid-skool',
    account: 'ai@bensoncrew.ca',
    action: 'read_approved_paid_area_after_packet',
    sourceBoundaryApproved: false,
    keychainPresent: true,
    loginRecipePresent: true,
  })
  const combined = JSON.stringify({
    snapshot,
    markSkoolSession,
    myicorLoginRecipe,
    missingMyicorCredential,
    mfaChallenge,
    freeNewsletterSignup,
    myicorReadonlyMcp,
    myicorReadonlyMcpNeedsScope,
    tradeBlocked,
    noBoundary,
  })
  const rawSecretAbsent = !/synthetic-password|rawPassword|password":/i.test(combined)
  const cases = [
    { name: 'contract_has_gold_standard_layers', ok: contract.ok, findings: contract.findings },
    { name: 'authorized_paid_profile_can_run_without_steve_present', ok: markSkoolSession.status === 'session_ready' },
    { name: 'keychain_plus_recipe_can_attempt_login_without_printing_secret', ok: myicorLoginRecipe.status === 'login_recipe_ready' && myicorLoginRecipe.rawSecretPrinted === false },
    { name: 'missing_keychain_emits_auth_needed', ok: missingMyicorCredential.status === 'auth_needed' && missingMyicorCredential.authEvent?.eventType === 'auth_needed' },
    { name: 'mfa_emits_auth_needed_instead_of_success', ok: mfaChallenge.status === 'auth_needed' && mfaChallenge.reason === 'mfa_or_human_verification_required' },
    { name: 'standing_free_identity_can_create_free_newsletter_account', ok: freeNewsletterSignup.status === 'free_account_creation_allowed' && freeNewsletterSignup.generatedCredentialStorage === 'macos_keychain' },
    { name: 'myicor_readonly_mcp_is_preferred_when_available_and_approved', ok: myicorReadonlyMcp.status === 'native_readonly_connector_ready' },
    { name: 'myicor_readonly_mcp_scope_must_be_approved_before_use', ok: myicorReadonlyMcpNeedsScope.status === 'blocked' && myicorReadonlyMcpNeedsScope.reason === 'native_readonly_connector_scope_approval_required' },
    { name: 'money_or_trading_action_is_not_a_source_session', ok: tradeBlocked.status === 'blocked' && tradeBlocked.reason === 'separate_action_policy_required' },
    { name: 'paid_private_without_boundary_is_blocked', ok: noBoundary.status === 'blocked' && noBoundary.reason === 'source_packet_or_session_boundary_required' },
    { name: 'dogfood_output_contains_no_raw_secret', ok: rawSecretAbsent },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    snapshot,
    sampleDecisions: {
      markSkoolSession,
      myicorLoginRecipe,
      missingMyicorCredential,
      mfaChallenge,
      freeNewsletterSignup,
      myicorReadonlyMcp,
      myicorReadonlyMcpNeedsScope,
      tradeBlocked,
      noBoundary,
    },
  }
}
