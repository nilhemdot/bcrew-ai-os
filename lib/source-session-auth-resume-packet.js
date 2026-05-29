import {
  SOURCE_SESSION_BROKER_CARD_ID,
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  buildSourceSessionBrokerAuthNeededEvent,
  evaluateSourceSessionBrokerRequest,
} from './source-session-broker.js'
import {
  MYICOR_MCP_OAUTH_ACCOUNT,
  MYICOR_MCP_OAUTH_SOURCE,
} from './source-session-readiness-readback.js'
import {
  prepareHarlanTelegramDeliveryPacket,
} from './harlan-auth-live-delivery.js'

export const SOURCE_SESSION_AUTH_RESUME_PACKET_VERSION = 'source-session-auth-resume-packet-v1'
export const SOURCE_SESSION_AUTH_RESUME_PACKET_SCRIPT_PATH = 'scripts/process-source-session-auth-resume-packet-check.mjs'

function text(value = '') {
  return String(value || '').trim()
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function quoteArg(value = '') {
  const raw = String(value || '')
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(raw)) return raw
  return `'${raw.replace(/'/g, "'\\''")}'`
}

function command(script = '', args = []) {
  return ['npm', 'run', script, '--', ...args].map(quoteArg).join(' ')
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function sourceFamilyFromPlan(plan = {}) {
  return text(plan.brokerRequest?.sourceFamily || plan.sourcePacket?.sourceFamily || plan.sourcePacket?.sourceType)
}

function sourceFromPlan(plan = {}) {
  return text(plan.brokerRequest?.source || plan.sourcePacket?.sourceId || hostOf(plan.sourcePacket?.url) || sourceFamilyFromPlan(plan))
}

function accountFromPlan(plan = {}) {
  const family = sourceFamilyFromPlan(plan)
  const source = sourceFromPlan(plan)
  return text(plan.brokerRequest?.account || plan.sourcePacket?.account) ||
    (family === 'paid_course_training_platforms' && /myicor/i.test(source)
      ? SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT
      : SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT)
}

function secretStatusCommand({ source = '', account = '' } = {}) {
  return command('credentials:vault', ['source:status', `--source=${source}`, `--account=${account}`])
}

function secretSetupCommand({ source = '', account = '' } = {}) {
  return command('credentials:vault', ['source:add', `--source=${source}`, `--account=${account}`])
}

function sourceBrowserArgsForPlan(plan = {}, overrides = {}) {
  const packet = plan.sourcePacket || {}
  const family = sourceFamilyFromPlan(plan)
  const source = sourceFromPlan(plan)
  const account = accountFromPlan(plan)
  return [
    `--url=${packet.url || ''}`,
    `--sourceFamily=${family}`,
    `--sourceId=${source}`,
    `--account=${account}`,
    '--sourceBoundaryApproved=true',
    '--persistentProfilePresent=true',
    '--sessionHealthy=true',
    ...(overrides.allowSourceSessionRun === false ? [] : ['--allowSourceSessionRun']),
    '--execute',
    '--json',
  ].filter(arg => !/=($|undefined|null)/.test(arg))
}

function buildCommandsForPlan(plan = {}) {
  const family = sourceFamilyFromPlan(plan)
  const source = sourceFromPlan(plan)
  const account = accountFromPlan(plan)
  const isMyicor = family === 'paid_course_training_platforms' && /myicor/i.test(`${source} ${plan.sourcePacket?.url || ''}`)
  const isSkool = family === 'skool_free_community' || family === 'skool_paid_or_private'
  const isNewsletter = family === 'creator_newsletters'

  if (isMyicor) {
    return {
      statusCommand: command('myicor:mcp-tools', ['--json']),
      setupCommand: command('myicor:mcp-authorize-agent', [`--account=${MYICOR_MCP_OAUTH_ACCOUNT}`]),
      setupCommandEffect: 'runs_agent_driven_readonly_myicor_oauth_and_stops_for_human_verification',
      credentialStatusCommand: secretStatusCommand({ source: MYICOR_MCP_OAUTH_SOURCE, account: MYICOR_MCP_OAUTH_ACCOUNT }),
      reverifyCommand: command('source:browser-agent', [
        ...sourceBrowserArgsForPlan(plan),
        `--authMethod=${SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD}`,
        '--loginRecipePresent=true',
        '--keychainPresent=true',
      ]),
      resumeCommand: command('source:browser-agent', [
        ...sourceBrowserArgsForPlan(plan),
        `--authMethod=${SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD}`,
        '--loginRecipePresent=true',
        '--keychainPresent=true',
      ]),
      wrongBranchRecovery: 'If MyICOR shows Start Free, signup, onboarding, or profile creation, stop, clear only the isolated MyICOR source profile if needed, and return to Log in / Sign in with Google.',
    }
  }

  if (isSkool) {
    return {
      statusCommand: secretStatusCommand({ source: 'skool', account }),
      setupCommand: secretSetupCommand({ source: 'skool', account }),
      setupCommandEffect: 'prompts_keychain_if_run_by_operator',
      credentialStatusCommand: secretStatusCommand({ source: 'skool', account }),
      reverifyCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan)),
      resumeCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan)),
      wrongBranchRecovery: 'If Skool asks for login/MFA, complete it once in the isolated source profile, reply DONE through Harlan, then rerun the resume command.',
    }
  }

  if (isNewsletter) {
    return {
      statusCommand: secretStatusCommand({ source: 'creator-newsletters', account }),
      setupCommand: secretSetupCommand({ source: 'creator-newsletters', account }),
      setupCommandEffect: 'prompts_keychain_if_run_by_operator',
      credentialStatusCommand: secretStatusCommand({ source: 'creator-newsletters', account }),
      reverifyCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan, { allowSourceSessionRun: false })),
      resumeCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan, { allowSourceSessionRun: false })),
      wrongBranchRecovery: 'Run newsletter intake in no-submit mode first. External signup remains disabled until source identity and inbox routing are approved.',
    }
  }

  return {
    statusCommand: secretStatusCommand({ source, account }),
    setupCommand: secretSetupCommand({ source, account }),
    setupCommandEffect: 'prompts_keychain_if_run_by_operator',
    credentialStatusCommand: secretStatusCommand({ source, account }),
    reverifyCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan)),
    resumeCommand: command('source:browser-agent', sourceBrowserArgsForPlan(plan)),
    wrongBranchRecovery: 'Complete the approved source-session step, reply DONE through Harlan, then rerun the resume command.',
  }
}

function safeSideEffects(overrides = {}) {
  return {
    externalNotificationSent: false,
    liveTelegramSent: false,
    browserLaunched: false,
    externalRunStarted: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    postedOrMessaged: false,
    credentialMutated: false,
    rawSecretPrinted: false,
    ...overrides,
  }
}

function eventForPlan(plan = {}, brokerDecision = {}) {
  if (brokerDecision?.authEvent) return brokerDecision.authEvent
  return buildSourceSessionBrokerAuthNeededEvent({
    sourceSystem: sourceFromPlan(plan),
    accountLabel: accountFromPlan(plan),
    blocker: text(brokerDecision.reason || plan.stopReason || 'source session auth is required'),
    jobId: `source-session-resume:${sourceFromPlan(plan)}`,
    artifactRef: `artifact://source-session-resume/${sourceFromPlan(plan)}`,
    createdAt: text(plan.createdAt || new Date().toISOString()),
  })
}

export function buildSourceSessionAuthResumePacket({
  plan = {},
  brokerDecision = plan.brokerDecision || null,
  brokerRequest = plan.brokerRequest || null,
  now = plan.createdAt || new Date().toISOString(),
} = {}) {
  const family = sourceFamilyFromPlan(plan)
  const source = sourceFromPlan(plan)
  const account = accountFromPlan(plan)
  const url = text(plan.sourcePacket?.url)
  const decision = brokerDecision || (brokerRequest ? evaluateSourceSessionBrokerRequest(brokerRequest) : null)

  if (!decision) {
    return {
      version: SOURCE_SESSION_AUTH_RESUME_PACKET_VERSION,
      cardId: SOURCE_SESSION_BROKER_CARD_ID,
      status: 'not_applicable',
      reason: 'no_source_session_broker_decision',
      sideEffects: safeSideEffects(),
    }
  }

  if (decision.ok === true) {
    return {
      version: SOURCE_SESSION_AUTH_RESUME_PACKET_VERSION,
      cardId: SOURCE_SESSION_BROKER_CARD_ID,
      status: 'resume_not_needed',
      reason: decision.reason || 'source_session_ready',
      sourceFamily: family,
      source,
      account,
      url,
      brokerStatus: decision.status,
      brokerOk: true,
      runner: text(plan.toolRoute?.toolId),
      sideEffects: safeSideEffects(),
    }
  }

  const authEvent = eventForPlan(plan, decision)
  const telegramPacket = prepareHarlanTelegramDeliveryPacket({
    event: authEvent,
    now,
  })
  const commands = buildCommandsForPlan(plan)
  const isMyicor = family === 'paid_course_training_platforms' && /myicor/i.test(`${source} ${url}`)
  return {
    version: SOURCE_SESSION_AUTH_RESUME_PACKET_VERSION,
    cardId: SOURCE_SESSION_BROKER_CARD_ID,
    status: decision.status === 'auth_needed' ? 'waiting_for_human_auth' : 'blocked_until_policy_or_source_packet',
    reason: text(decision.reason || plan.stopReason),
    sourceFamily: family,
    source,
    account,
    url,
    runner: text(plan.toolRoute?.toolId),
    brokerStatus: text(decision.status),
    brokerOk: decision.ok === true,
    requiredAuthMethod: isMyicor ? SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD : text(decision.authMethodRequired || ''),
    expectedAccount: isMyicor ? SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT : account,
    authEvent,
    harlanTelegram: telegramPacket,
    commands,
    operatorWorkflow: [
      'Review the blocker and exact source/session boundary.',
      'Complete only the requested login/MFA/session step in the isolated source profile or approved connector.',
      'Reply DONE to Harlan after the step is complete.',
      'Run the reverify command; only resume when it passes.',
      'If reverify fails or timeout expires, leave the source failed closed with the auth-needed artifact.',
    ],
    stopBefore: [
      'purchase or checkout',
      'posting, commenting, DM, or external message',
      'unsafe download',
      'profile/account/credential mutation outside the approved broker command',
      'normal Chrome profile',
      'raw secret logging',
    ],
    sideEffects: safeSideEffects(),
    createdAt: now,
  }
}

function containsRawSecret(value = {}) {
  return /(password|token|secret|api[_-]?key)=([^&\s'"]+)/i.test(JSON.stringify(value))
}

export function evaluateSourceSessionAuthResumePacket(packet = {}) {
  const failures = []
  const add = (ok, check, detail = '') => {
    if (!ok) failures.push({ check, detail })
  }

  if (packet.status === 'not_applicable') {
    add(packet.sideEffects?.externalNotificationSent === false, 'not_applicable_has_no_external_send')
  } else if (packet.status === 'resume_not_needed') {
    add(packet.brokerOk === true, 'ready_packet_requires_positive_broker_decision', packet.reason)
    add(!packet.harlanTelegram, 'ready_packet_does_not_prepare_harlan_message')
  } else {
    add(packet.authEvent?.eventType === 'auth_needed', 'auth_needed_event_present', packet.authEvent?.eventType || 'missing')
    add(packet.harlanTelegram?.sendsMessageNow === false && packet.harlanTelegram?.externalSent === false, 'harlan_packet_is_dry_run_only', packet.harlanTelegram?.status || 'missing')
    add(text(packet.commands?.reverifyCommand).includes('source:browser-agent'), 'reverify_command_present', packet.commands?.reverifyCommand || 'missing')
    add(text(packet.commands?.resumeCommand).includes('--execute'), 'resume_command_executes_source_browser_agent', packet.commands?.resumeCommand || 'missing')
    add(packet.sideEffects?.externalNotificationSent === false && packet.sideEffects?.credentialMutated === false, 'packet_has_no_side_effects', JSON.stringify(packet.sideEffects || {}))
  }
  add(packet.version === SOURCE_SESSION_AUTH_RESUME_PACKET_VERSION, 'version_matches', packet.version || 'missing')
  add(containsRawSecret(packet) === false, 'no_raw_secret_like_command_values', 'secret-like key=value rejected')
  add(packet.sideEffects?.rawSecretPrinted === false, 'raw_secret_not_printed', JSON.stringify(packet.sideEffects || {}))

  return {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    failures,
  }
}

export function buildSourceSessionAuthResumePacketDogfoodProof() {
  const skoolPlan = {
    createdAt: '2026-05-28T12:00:00.000-04:00',
    sourcePacket: {
      sourceId: 'chase-ai-community',
      url: 'https://www.skool.com/chase-ai-community/about',
      sourceFamily: 'skool_free_community',
      account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    },
    toolRoute: { toolId: 'skool:free-god-mode' },
    brokerRequest: {
      sourceFamily: 'skool_free_community',
      source: 'skool',
      account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      action: 'read_allowed_free_posts',
      sourceBoundaryApproved: true,
      keychainPresent: false,
    },
  }
  skoolPlan.brokerDecision = evaluateSourceSessionBrokerRequest(skoolPlan.brokerRequest)

  const myicorPlan = {
    createdAt: '2026-05-28T12:00:00.000-04:00',
    sourcePacket: {
      sourceId: 'myicor',
      url: 'https://app.myicor.com/login',
      sourceFamily: 'paid_course_training_platforms',
      account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
    },
    toolRoute: { toolId: 'source-session-broker' },
    brokerRequest: {
      sourceFamily: 'paid_course_training_platforms',
      source: 'myicor',
      account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
      action: 'read_approved_course_area_after_packet',
      sourceBoundaryApproved: true,
      authMethod: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      keychainPresent: true,
      loginRecipePresent: true,
      mfaChallenge: true,
    },
  }
  myicorPlan.brokerDecision = evaluateSourceSessionBrokerRequest(myicorPlan.brokerRequest)

  const readyPlan = {
    createdAt: '2026-05-28T12:00:00.000-04:00',
    sourcePacket: {
      sourceId: 'ready-skool',
      url: 'https://www.skool.com/ready/about',
      sourceFamily: 'skool_free_community',
      account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    },
    toolRoute: { toolId: 'skool:free-god-mode' },
    brokerRequest: {
      sourceFamily: 'skool_free_community',
      source: 'skool',
      account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      action: 'read_allowed_free_posts',
      sourceBoundaryApproved: true,
      persistentProfilePresent: true,
      sessionHealthy: true,
    },
  }
  readyPlan.brokerDecision = evaluateSourceSessionBrokerRequest(readyPlan.brokerRequest)

  const skool = buildSourceSessionAuthResumePacket({ plan: skoolPlan })
  const myicor = buildSourceSessionAuthResumePacket({ plan: myicorPlan })
  const ready = buildSourceSessionAuthResumePacket({ plan: readyPlan })
  const unsafe = {
    ...skool,
    commands: {
      ...skool.commands,
      resumeCommand: `${skool.commands.resumeCommand} --password=raw-secret`,
    },
  }

  const cases = [
    {
      name: 'skool_missing_credential_prepares_harlan_dry_run_and_resume_command',
      ok: evaluateSourceSessionAuthResumePacket(skool).ok &&
        skool.status === 'waiting_for_human_auth' &&
        skool.harlanTelegram?.externalSent === false &&
        skool.commands?.resumeCommand.includes('--allowSourceSessionRun'),
    },
    {
      name: 'myicor_mfa_packet_uses_google_sso_and_mcp_status_commands',
      ok: evaluateSourceSessionAuthResumePacket(myicor).ok &&
        myicor.expectedAccount === SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT &&
        myicor.requiredAuthMethod === SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD &&
        myicor.commands?.statusCommand.includes('myicor:mcp-tools') &&
        myicor.commands?.setupCommand.includes('myicor:mcp-authorize-agent') &&
        myicor.commands?.wrongBranchRecovery.includes('Start Free'),
    },
    {
      name: 'ready_session_does_not_escalate_or_prepare_live_message',
      ok: evaluateSourceSessionAuthResumePacket(ready).ok &&
        ready.status === 'resume_not_needed' &&
        !ready.harlanTelegram,
    },
    {
      name: 'secret_like_command_values_fail_evaluator',
      ok: evaluateSourceSessionAuthResumePacket(unsafe).ok === false,
    },
  ]

  return {
    ok: cases.every(testCase => testCase.ok),
    status: cases.every(testCase => testCase.ok) ? 'healthy' : 'unhealthy',
    cases,
    packets: { skool, myicor, ready },
    sideEffects: safeSideEffects(),
  }
}
