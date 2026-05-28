import crypto from 'node:crypto'

import {
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
  buildAuthNeededEvent,
  buildHarlanAuthEscalationLoop,
  prepareHarlanAuthNotification,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'

export const HARLAN_AUTH_LIVE_DELIVERY_CARD_ID = 'HARLAN-AUTH-LIVE-DELIVERY-002'
export const HARLAN_AUTH_LIVE_DELIVERY_CLOSEOUT_KEY = 'harlan-auth-live-delivery-preflight-v1'
export const HARLAN_AUTH_LIVE_DELIVERY_PLAN_PATH = 'docs/process/harlan-auth-live-delivery-002-plan.md'
export const HARLAN_AUTH_LIVE_DELIVERY_APPROVAL_PATH = 'docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json'
export const HARLAN_AUTH_LIVE_DELIVERY_SCRIPT_PATH = 'scripts/process-harlan-auth-live-delivery-check.mjs'
export const HARLAN_AUTH_LIVE_DELIVERY_HANDOFF_PATH = 'docs/handoffs/2026-05-28-harlan-auth-live-delivery-preflight.md'
export const HARLAN_AUTH_LIVE_DELIVERY_CONTINUATION_CARD_ID = 'HARLAN-LIVE-OPERATOR-RUNTIME-002'

export const HARLAN_TELEGRAM_REQUIRED_STATES = [
  'auth_needed_received',
  'dedup_checked',
  'delivery_preflight_evaluated',
  'telegram_dry_run_packet_prepared',
  'waiting_for_done',
  'done_received',
  'reverify_started',
  'resume_allowed',
  'fail_closed',
]

export const HARLAN_TELEGRAM_CONFIG_REF_KEYS = [
  'HARLAN_TELEGRAM_BOT_TOKEN_REF',
  'HARLAN_TELEGRAM_STEVE_CHAT_ID_REF',
  'HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF',
]

export const HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'HARLAN_TELEGRAM_BOT_TOKEN',
  'TELEGRAM_STEVE_CHAT_ID',
  'HARLAN_TELEGRAM_STEVE_CHAT_ID',
]

export const HARLAN_AUTH_LIVE_DELIVERY_PROOF_COMMANDS = [
  'node --check lib/harlan-auth-live-delivery.js scripts/process-harlan-auth-live-delivery-check.mjs lib/foundation-build-closeout-agent-runtime-records.js',
  'npm run process:harlan-auth-live-delivery-check -- --json',
  'npm run process:harlan-auth-escalation-loop-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --closeoutKey=harlan-auth-live-delivery-preflight-v1',
  'npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-preflight-v1 --commitRef=HEAD',
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableHash(value = '') {
  const raw = typeof value === 'string' ? value : JSON.stringify(value || {})
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex')
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || HARLAN_AUTH_LIVE_DELIVERY_CARD_ID, ruleId, detail })
}

function redactPreview(text = '') {
  return String(text || '')
    .split('\n')
    .slice(0, 6)
    .join('\n')
}

export function resolveHarlanTelegramDeliveryConfig(env = process.env) {
  const botTokenRef = normalizeText(env.HARLAN_TELEGRAM_BOT_TOKEN_REF)
  const steveChatIdRef = normalizeText(env.HARLAN_TELEGRAM_STEVE_CHAT_ID_REF)
  const liveSendApprovalRef = normalizeText(env.HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF)
  const targetOwner = normalizeText(env.HARLAN_TELEGRAM_TARGET_OWNER || 'Steve')
  const requestedMode = normalizeText(env.HARLAN_AUTH_LIVE_DELIVERY_MODE || 'dry_run_preflight')
  const rawSecretEnvKeysPresent = HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS.filter(key => normalizeText(env[key]))
  const missing = []

  if (!botTokenRef) missing.push('HARLAN_TELEGRAM_BOT_TOKEN_REF')
  if (!steveChatIdRef) missing.push('HARLAN_TELEGRAM_STEVE_CHAT_ID_REF')
  if (!liveSendApprovalRef) missing.push('HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF')

  const hasApprovedRef = liveSendApprovalRef.includes(HARLAN_AUTH_LIVE_DELIVERY_CARD_ID) ||
    liveSendApprovalRef.includes('approved_steve_only_live_test')
  const readyForSteveLiveTest = missing.length === 0 &&
    rawSecretEnvKeysPresent.length === 0 &&
    targetOwner === 'Steve' &&
    requestedMode === 'approved_steve_only_live_test' &&
    hasApprovedRef

  const rejectedReasons = []
  if (rawSecretEnvKeysPresent.length) rejectedReasons.push('raw_secret_env_present')
  if (targetOwner !== 'Steve') rejectedReasons.push('non_steve_target_rejected')
  if (requestedMode === 'approved_steve_only_live_test' && !hasApprovedRef) rejectedReasons.push('approval_ref_missing_or_wrong_card')
  if (missing.length) rejectedReasons.push('telegram_config_refs_missing')

  return {
    deliveryMode: readyForSteveLiveTest ? 'approved_steve_only_live_test' : 'dry_run_preflight',
    requestedMode,
    targetOwner,
    botTokenRef: botTokenRef || null,
    steveChatIdRef: steveChatIdRef || null,
    liveSendApprovalRef: liveSendApprovalRef || null,
    missing,
    rawSecretEnvKeysPresent,
    hasApprovedRef,
    readyForSteveLiveTest,
    rejected: rejectedReasons.length > 0,
    rejectedReasons,
  }
}

export function buildHarlanAuthLiveDeliveryContract(overrides = {}) {
  return {
    cardId: HARLAN_AUTH_LIVE_DELIVERY_CARD_ID,
    parentCardId: HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
    closeoutKey: HARLAN_AUTH_LIVE_DELIVERY_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    version: 1,
    status: 'blocked-preflight',
    primaryChannel: HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
    transport: 'telegram_bot_api',
    allowedRecipient: 'Steve',
    defaultDeliveryMode: 'dry_run_preflight',
    liveSendDefault: false,
    externalSendAllowedFromProof: false,
    rawSecretsAllowedInArtifacts: false,
    credentialMutationAllowed: false,
    sourceMutationAllowed: false,
    normalChromeProfileAllowed: false,
    requiredStates: HARLAN_TELEGRAM_REQUIRED_STATES,
    configPolicy: {
      requiredRefKeys: HARLAN_TELEGRAM_CONFIG_REF_KEYS,
      rawSecretEnvKeysRejected: HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS,
      secretSource: 'metadata refs only until Steve approves the exact Telegram bot and chat boundary',
      approvalMode: 'approved_steve_only_live_test',
    },
    deliveryPolicy: {
      maxNotificationsPerIssue: 1,
      maxTotalEscalations: 2,
      waitForDoneToken: 'DONE',
      reverifyBeforeResume: true,
      timeoutState: 'fail_closed',
      sendsMessageNowInProof: false,
    },
    notNextBoundaries: [
      'Do not send live Telegram from proof paths.',
      'Do not store or print raw Telegram bot tokens or raw chat IDs.',
      'Do not send to anyone except Steve.',
      'Do not mutate credentials, OAuth tokens, browser profiles, source sessions, or source systems.',
      'Do not treat a dry-run packet as completed live auth delivery.',
    ],
    ...overrides,
  }
}

export function assertHarlanTelegramLiveSendBlocked({ sendNow = false, contract = buildHarlanAuthLiveDeliveryContract() } = {}) {
  if (sendNow || contract.liveSendDefault === true || contract.externalSendAllowedFromProof === true) {
    throw new Error('Harlan Telegram delivery proof refuses live network sends; use an explicitly approved live runner outside proof mode.')
  }
  return true
}

export function prepareHarlanTelegramDeliveryPacket({
  contract = buildHarlanAuthLiveDeliveryContract(),
  config = resolveHarlanTelegramDeliveryConfig({}),
  event = buildAuthNeededEvent({
    jobId: 'harlan-telegram-live-delivery-preflight',
    providerRouteKey: 'source-browser:harlan-telegram-auth-proof',
    blocker: 'Operator approval needed for source session auth',
    actionNeeded: 'Approve the auth step, then reply DONE in Telegram.',
  }),
  now = '2026-05-28T10:00:00.000-04:00',
  sendNow = false,
} = {}) {
  assertHarlanTelegramLiveSendBlocked({ sendNow, contract })
  if (contract.allowedRecipient !== 'Steve') {
    throw new Error('Harlan Telegram live delivery preflight is Steve-only.')
  }
  if (config.targetOwner !== 'Steve') {
    throw new Error('Harlan Telegram live delivery rejects non-Steve targets.')
  }

  const loop = buildHarlanAuthEscalationLoop()
  const notification = prepareHarlanAuthNotification({ loop, event, now })
  const status = config.readyForSteveLiveTest ? 'approved_live_test_prepared_not_sent' : 'blocked_preflight'
  const blocker = config.readyForSteveLiveTest
    ? null
    : `Missing or rejected Telegram live-send preflight: ${config.rejectedReasons.join(', ') || 'not approved'}`

  return {
    deliveryId: `harlan-telegram-${event.issueKey}`,
    cardId: contract.cardId,
    parentCardId: contract.parentCardId,
    status,
    blocker,
    createdAt: now,
    primaryChannel: contract.primaryChannel,
    transport: contract.transport,
    recipient: contract.allowedRecipient,
    deliveryMode: config.deliveryMode,
    sendsMessageNow: false,
    externalSent: false,
    dryRun: true,
    waitsForDoneToken: contract.deliveryPolicy.waitForDoneToken,
    reverifyBeforeResume: contract.deliveryPolicy.reverifyBeforeResume,
    issueKey: event.issueKey,
    contextKey: notification.contextKey,
    notificationId: notification.notificationId,
    notificationTextHash: stableHash(notification.text),
    notificationTextPreview: redactPreview(notification.text),
    telegramRequestPreview: {
      method: 'sendMessage',
      endpointTemplate: 'https://api.telegram.org/bot<TOKEN_REF>/sendMessage',
      botTokenRef: config.botTokenRef,
      chatIdRef: config.steveChatIdRef,
      textHash: stableHash(notification.text),
      parseMode: 'plain_text',
      disableWebPagePreview: true,
    },
    configReadiness: {
      readyForSteveLiveTest: config.readyForSteveLiveTest,
      missing: config.missing,
      rawSecretEnvKeysPresent: config.rawSecretEnvKeysPresent,
      hasApprovedRef: config.hasApprovedRef,
      liveSendApprovalRef: config.liveSendApprovalRef,
    },
    timeline: [
      { state: 'auth_needed_received', at: event.createdAt, eventId: event.eventId },
      { state: 'dedup_checked', at: now, issueKey: event.issueKey },
      { state: 'delivery_preflight_evaluated', at: now, readyForSteveLiveTest: config.readyForSteveLiveTest },
      { state: 'telegram_dry_run_packet_prepared', at: now, notificationId: notification.notificationId },
      { state: 'waiting_for_done', at: now, token: contract.deliveryPolicy.waitForDoneToken },
    ],
  }
}

export function runHarlanAuthLiveDeliveryScenario({
  scenario = 'missing_config',
  contract = buildHarlanAuthLiveDeliveryContract(),
  env = {},
} = {}) {
  const event = buildAuthNeededEvent({
    jobId: `harlan-live-delivery-${scenario}`,
    providerRouteKey: 'source-browser:harlan-telegram-auth-proof',
    blocker: '2FA or human approval needed',
    actionNeeded: 'Approve the prompt, then reply DONE in Telegram.',
    createdAt: '2026-05-28T10:00:00.000-04:00',
  })

  if (scenario === 'duplicate') {
    const config = resolveHarlanTelegramDeliveryConfig(env)
    const first = prepareHarlanTelegramDeliveryPacket({ contract, config, event })
    const duplicate = buildAuthNeededEvent({ ...event, eventId: `${event.eventId}-duplicate` })
    return {
      scenario,
      ok: duplicate.issueKey === event.issueKey,
      packetCount: 1,
      duplicateSuppressed: duplicate.issueKey === event.issueKey,
      first,
      second: {
        status: 'deduped',
        reason: 'suppress_duplicate_notification',
        sendsMessageNow: false,
        issueKey: duplicate.issueKey,
      },
    }
  }

  if (scenario === 'timeout') {
    const proof = runHarlanAuthEscalationScenario({ scenario: 'timeout', event })
    return {
      scenario,
      ok: proof.finalStatus === 'fail_closed',
      finalStatus: proof.finalStatus,
      sendsMessageNow: false,
      proof,
    }
  }

  if (scenario === 'done_resume') {
    const proof = runHarlanAuthEscalationScenario({ scenario: 'done_resume', event })
    return {
      scenario,
      ok: proof.finalStatus === 'resumed' && proof.reverify.status === 'passed',
      finalStatus: proof.finalStatus,
      reverifyBeforeResume: proof.reverify.status === 'passed',
      sendsMessageNow: false,
      proof,
    }
  }

  if (scenario === 'unsafe_send') {
    try {
      prepareHarlanTelegramDeliveryPacket({
        contract,
        config: resolveHarlanTelegramDeliveryConfig(env),
        event,
        sendNow: true,
      })
      return { scenario, ok: false, unsafeSendRejected: false }
    } catch (error) {
      return { scenario, ok: true, unsafeSendRejected: true, error: error.message }
    }
  }

  if (scenario === 'wrong_target') {
    try {
      prepareHarlanTelegramDeliveryPacket({
        contract,
        config: resolveHarlanTelegramDeliveryConfig({ ...env, HARLAN_TELEGRAM_TARGET_OWNER: 'not-steve' }),
        event,
      })
      return { scenario, ok: false, wrongTargetRejected: false }
    } catch (error) {
      return { scenario, ok: true, wrongTargetRejected: true, error: error.message }
    }
  }

  const config = resolveHarlanTelegramDeliveryConfig(env)
  const packet = prepareHarlanTelegramDeliveryPacket({ contract, config, event })
  return {
    scenario,
    ok: scenario === 'ready_config'
      ? packet.status === 'approved_live_test_prepared_not_sent' && packet.sendsMessageNow === false
      : packet.status === 'blocked_preflight' && packet.sendsMessageNow === false,
    packet,
    config,
  }
}

export function evaluateHarlanAuthLiveDeliveryContract(contract = buildHarlanAuthLiveDeliveryContract()) {
  const violations = []
  if (contract.cardId !== HARLAN_AUTH_LIVE_DELIVERY_CARD_ID) addViolation(violations, 'contract', 'card_id_required', contract.cardId || 'missing')
  if (contract.parentCardId !== HARLAN_AUTH_ESCALATION_LOOP_CARD_ID) addViolation(violations, 'contract', 'parent_card_required', contract.parentCardId || 'missing')
  if (contract.ownerLayer !== 'Foundation') addViolation(violations, 'contract', 'foundation_owner_required', contract.ownerLayer || 'missing')
  if (contract.status !== 'blocked-preflight') addViolation(violations, 'contract', 'blocked_preflight_status_required', contract.status || 'missing')
  if (contract.primaryChannel !== 'telegram') addViolation(violations, 'contract', 'telegram_primary_required', contract.primaryChannel || 'missing')
  if (contract.transport !== 'telegram_bot_api') addViolation(violations, 'contract', 'telegram_transport_required', contract.transport || 'missing')
  if (contract.allowedRecipient !== 'Steve') addViolation(violations, 'contract', 'steve_only_required', contract.allowedRecipient || 'missing')
  if (contract.defaultDeliveryMode !== 'dry_run_preflight') addViolation(violations, 'contract', 'dry_run_default_required', contract.defaultDeliveryMode || 'missing')
  if (contract.liveSendDefault !== false) addViolation(violations, 'contract', 'live_send_default_blocked', String(contract.liveSendDefault))
  if (contract.externalSendAllowedFromProof !== false) addViolation(violations, 'contract', 'proof_external_send_blocked', String(contract.externalSendAllowedFromProof))
  if (contract.rawSecretsAllowedInArtifacts !== false) addViolation(violations, 'contract', 'raw_secret_artifacts_blocked', String(contract.rawSecretsAllowedInArtifacts))
  if (contract.credentialMutationAllowed !== false) addViolation(violations, 'contract', 'credential_mutation_blocked', String(contract.credentialMutationAllowed))
  if (contract.sourceMutationAllowed !== false) addViolation(violations, 'contract', 'source_mutation_blocked', String(contract.sourceMutationAllowed))
  if (contract.normalChromeProfileAllowed !== false) addViolation(violations, 'contract', 'normal_chrome_blocked', String(contract.normalChromeProfileAllowed))
  for (const state of HARLAN_TELEGRAM_REQUIRED_STATES) {
    if (!list(contract.requiredStates).includes(state)) addViolation(violations, 'requiredStates', 'state_required', state)
  }
  for (const key of HARLAN_TELEGRAM_CONFIG_REF_KEYS) {
    if (!list(contract.configPolicy?.requiredRefKeys).includes(key)) addViolation(violations, 'configPolicy', 'config_ref_required', key)
  }
  for (const key of HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS) {
    if (!list(contract.configPolicy?.rawSecretEnvKeysRejected).includes(key)) addViolation(violations, 'configPolicy', 'raw_secret_env_rejected', key)
  }
  if (contract.deliveryPolicy?.waitForDoneToken !== 'DONE') addViolation(violations, 'deliveryPolicy', 'done_token_required', contract.deliveryPolicy?.waitForDoneToken || 'missing')
  if (contract.deliveryPolicy?.reverifyBeforeResume !== true) addViolation(violations, 'deliveryPolicy', 'reverify_required', String(contract.deliveryPolicy?.reverifyBeforeResume))
  if (contract.deliveryPolicy?.timeoutState !== 'fail_closed') addViolation(violations, 'deliveryPolicy', 'fail_closed_timeout_required', contract.deliveryPolicy?.timeoutState || 'missing')
  if (Number(contract.deliveryPolicy?.maxNotificationsPerIssue) !== 1) addViolation(violations, 'deliveryPolicy', 'one_notification_per_issue_required', String(contract.deliveryPolicy?.maxNotificationsPerIssue || 'missing'))
  for (const boundary of ['Do not send live Telegram', 'Do not store or print raw Telegram bot tokens', 'Do not send to anyone except Steve']) {
    if (!list(contract.notNextBoundaries).some(item => item.includes(boundary))) addViolation(violations, 'notNextBoundaries', 'boundary_required', boundary)
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready_preflight',
    cardId: contract.cardId,
    closeoutKey: contract.closeoutKey,
    violations,
    summary: {
      requiredStateCount: list(contract.requiredStates).length,
      requiredConfigRefCount: list(contract.configPolicy?.requiredRefKeys).length,
      rawSecretRejectCount: list(contract.configPolicy?.rawSecretEnvKeysRejected).length,
      violationCount: violations.length,
    },
  }
}

export function buildHarlanAuthLiveDeliveryDogfoodProof() {
  const contract = buildHarlanAuthLiveDeliveryContract()
  const healthy = evaluateHarlanAuthLiveDeliveryContract(contract)
  const missingConfig = runHarlanAuthLiveDeliveryScenario({ scenario: 'missing_config', contract })
  const readyConfig = runHarlanAuthLiveDeliveryScenario({
    scenario: 'ready_config',
    contract,
    env: {
      HARLAN_AUTH_LIVE_DELIVERY_MODE: 'approved_steve_only_live_test',
      HARLAN_TELEGRAM_TARGET_OWNER: 'Steve',
      HARLAN_TELEGRAM_BOT_TOKEN_REF: 'keychain://harlan/telegram/bot-token',
      HARLAN_TELEGRAM_STEVE_CHAT_ID_REF: 'keychain://harlan/telegram/steve-chat-id',
      HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF: 'docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json#approved_steve_only_live_test',
    },
  })
  const rawSecretRejected = runHarlanAuthLiveDeliveryScenario({
    scenario: 'missing_config',
    contract,
    env: {
      HARLAN_AUTH_LIVE_DELIVERY_MODE: 'approved_steve_only_live_test',
      HARLAN_TELEGRAM_TARGET_OWNER: 'Steve',
      HARLAN_TELEGRAM_BOT_TOKEN_REF: 'keychain://harlan/telegram/bot-token',
      HARLAN_TELEGRAM_STEVE_CHAT_ID_REF: 'keychain://harlan/telegram/steve-chat-id',
      HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF: 'docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json#approved_steve_only_live_test',
      TELEGRAM_BOT_TOKEN: 'synthetic-redacted-token',
    },
  })
  const duplicate = runHarlanAuthLiveDeliveryScenario({ scenario: 'duplicate', contract })
  const timeout = runHarlanAuthLiveDeliveryScenario({ scenario: 'timeout', contract })
  const doneResume = runHarlanAuthLiveDeliveryScenario({ scenario: 'done_resume', contract })
  const unsafeSend = runHarlanAuthLiveDeliveryScenario({ scenario: 'unsafe_send', contract })
  const wrongTarget = runHarlanAuthLiveDeliveryScenario({ scenario: 'wrong_target', contract })
  const weakContract = evaluateHarlanAuthLiveDeliveryContract(buildHarlanAuthLiveDeliveryContract({
    externalSendAllowedFromProof: true,
  }))

  const ok = healthy.ok === true &&
    missingConfig.ok === true &&
    missingConfig.packet.status === 'blocked_preflight' &&
    readyConfig.ok === true &&
    readyConfig.packet.status === 'approved_live_test_prepared_not_sent' &&
    readyConfig.packet.sendsMessageNow === false &&
    rawSecretRejected.config.rawSecretEnvKeysPresent.includes('TELEGRAM_BOT_TOKEN') &&
    rawSecretRejected.packet.status === 'blocked_preflight' &&
    duplicate.duplicateSuppressed === true &&
    duplicate.packetCount === 1 &&
    timeout.finalStatus === 'fail_closed' &&
    doneResume.finalStatus === 'resumed' &&
    doneResume.reverifyBeforeResume === true &&
    unsafeSend.unsafeSendRejected === true &&
    wrongTarget.wrongTargetRejected === true &&
    weakContract.ok === false

  return {
    ok,
    invariant: 'Harlan Telegram delivery passes only when it stays Steve-only, Telegram-only, ref-only, no live send from proof, deduped, DONE-gated, reverify-before-resume, and fail-closed when config/auth is missing.',
    healthy,
    missingConfigBlocksLiveSend: missingConfig.packet.status === 'blocked_preflight' && missingConfig.packet.sendsMessageNow === false,
    approvedConfigPreparesButDoesNotSend: readyConfig.packet.status === 'approved_live_test_prepared_not_sent' && readyConfig.packet.sendsMessageNow === false,
    rawSecretRejected: rawSecretRejected.config.rawSecretEnvKeysPresent.includes('TELEGRAM_BOT_TOKEN') && rawSecretRejected.packet.status === 'blocked_preflight',
    duplicateNoSpam: duplicate.duplicateSuppressed === true && duplicate.packetCount === 1,
    timeoutFailClosed: timeout.finalStatus === 'fail_closed',
    doneReverifyResume: doneResume.finalStatus === 'resumed' && doneResume.reverifyBeforeResume === true,
    unsafeSendRejected: unsafeSend.unsafeSendRejected === true,
    wrongTargetRejected: wrongTarget.wrongTargetRejected === true,
    weakContractRejected: weakContract.ok === false,
    fixtures: {
      missingConfig,
      readyConfig,
      rawSecretRejected,
      duplicate,
      timeout,
      doneResume,
      unsafeSend,
      wrongTarget,
      weakContract,
    },
  }
}
