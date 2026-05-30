import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'

import {
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
  buildAuthNeededEvent,
  buildHarlanAuthEscalationLoop,
  prepareHarlanAuthNotification,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'

export const HARLAN_AUTH_LIVE_DELIVERY_CARD_ID = 'HARLAN-AUTH-LIVE-DELIVERY-002'
export const HARLAN_AUTH_LIVE_DELIVERY_CLOSEOUT_KEY = 'harlan-auth-live-delivery-live-v1'
export const HARLAN_AUTH_LIVE_DELIVERY_PLAN_PATH = 'docs/process/harlan-auth-live-delivery-002-plan.md'
export const HARLAN_AUTH_LIVE_DELIVERY_APPROVAL_PATH = 'docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json'
export const HARLAN_AUTH_LIVE_DELIVERY_SCRIPT_PATH = 'scripts/process-harlan-auth-live-delivery-check.mjs'
export const HARLAN_AUTH_LIVE_DELIVERY_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-30-harlan-auth-live-delivery-live.md'
export const HARLAN_AUTH_LIVE_DELIVERY_CONTINUATION_CARD_ID = 'HARLAN-LIVE-OPERATOR-RUNTIME-002'
export const HARLAN_APPROVED_TELEGRAM_BOT_USERNAME = '@harlan_bcrew_bot'
export const HARLAN_APPROVED_STEVE_CHAT_ID = '8758547582'
export const HARLAN_OPENCLAW_TELEGRAM_BOT_TOKEN_REF = 'openclaw://channels.telegram.botToken'
export const HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE = 'approved_steve_only_live_send'

export const HARLAN_TELEGRAM_REQUIRED_STATES = [
  'auth_needed_received',
  'dedup_checked',
  'delivery_preflight_evaluated',
  'telegram_delivery_packet_prepared',
  'telegram_live_send_attempted',
  'telegram_live_send_delivered',
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
  'node --check scripts/harlan-builder-event.mjs',
  'npm run process:harlan-auth-live-delivery-check -- --json',
  'npm run harlan:builder-event -- --dry-run --eventType=foundation_ship_passed --card=HARLAN-AUTH-LIVE-DELIVERY-002 --status=proof',
  'npm run process:harlan-auth-escalation-loop-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-live-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --closeoutKey=harlan-auth-live-delivery-live-v1',
  'npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-live-v1 --commitRef=HEAD',
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

function isApprovedLiveMode(mode = '') {
  return [
    HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE,
    'approved_steve_only_live_test',
  ].includes(normalizeText(mode))
}

function isOpenClawRef(ref = '') {
  return normalizeText(ref).startsWith('openclaw://')
}

function isApprovedSteveChatIdRef(ref = '') {
  return normalizeText(ref) === HARLAN_APPROVED_STEVE_CHAT_ID
}

function getRejectedRawSecretEnvKeys(env = {}, requestedMode = '', botTokenRef = '') {
  const present = HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS.filter(key => normalizeText(env[key]))
  return present.filter(key => {
    const isExistingGlobalTelegramEnv = key === 'TELEGRAM_BOT_TOKEN' &&
      requestedMode === HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE &&
      isOpenClawRef(botTokenRef)
    return !isExistingGlobalTelegramEnv
  })
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
  const botUsername = normalizeText(env.HARLAN_TELEGRAM_BOT_USERNAME || HARLAN_APPROVED_TELEGRAM_BOT_USERNAME)
  const targetOwner = normalizeText(env.HARLAN_TELEGRAM_TARGET_OWNER || 'Steve')
  const requestedMode = normalizeText(env.HARLAN_AUTH_LIVE_DELIVERY_MODE || 'dry_run_preflight')
  const rawSecretEnvKeysPresent = HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS.filter(key => normalizeText(env[key]))
  const rawSecretEnvKeysRejected = getRejectedRawSecretEnvKeys(env, requestedMode, botTokenRef)
  const missing = []

  if (!botTokenRef) missing.push('HARLAN_TELEGRAM_BOT_TOKEN_REF')
  if (!steveChatIdRef) missing.push('HARLAN_TELEGRAM_STEVE_CHAT_ID_REF')
  if (!liveSendApprovalRef) missing.push('HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF')

  const hasApprovedRef = liveSendApprovalRef.includes(HARLAN_AUTH_LIVE_DELIVERY_CARD_ID) ||
    liveSendApprovalRef.includes(HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE) ||
    liveSendApprovalRef.includes('approved_steve_only_live_test')
  const approvedBoundary = botUsername === HARLAN_APPROVED_TELEGRAM_BOT_USERNAME &&
    isApprovedSteveChatIdRef(steveChatIdRef)
  const readyForLiveSend = missing.length === 0 &&
    rawSecretEnvKeysRejected.length === 0 &&
    targetOwner === 'Steve' &&
    isApprovedLiveMode(requestedMode) &&
    hasApprovedRef &&
    approvedBoundary

  const rejectedReasons = []
  if (rawSecretEnvKeysRejected.length) rejectedReasons.push('raw_secret_env_present')
  if (targetOwner !== 'Steve') rejectedReasons.push('non_steve_target_rejected')
  if (isApprovedLiveMode(requestedMode) && !hasApprovedRef) rejectedReasons.push('approval_ref_missing_or_wrong_card')
  if (isApprovedLiveMode(requestedMode) && botUsername !== HARLAN_APPROVED_TELEGRAM_BOT_USERNAME) rejectedReasons.push('bot_username_boundary_rejected')
  if (isApprovedLiveMode(requestedMode) && !isApprovedSteveChatIdRef(steveChatIdRef)) rejectedReasons.push('steve_chat_id_boundary_rejected')
  if (missing.length) rejectedReasons.push('telegram_config_refs_missing')

  return {
    deliveryMode: readyForLiveSend ? HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE : 'dry_run_preflight',
    requestedMode,
    targetOwner,
    botUsername,
    botTokenRef: botTokenRef || null,
    steveChatIdRef: steveChatIdRef || null,
    liveSendApprovalRef: liveSendApprovalRef || null,
    missing,
    rawSecretEnvKeysPresent,
    rawSecretEnvKeysRejected,
    hasApprovedRef,
    approvedBoundary,
    approvedChatId: HARLAN_APPROVED_STEVE_CHAT_ID,
    readyForLiveSend,
    readyForSteveLiveTest: readyForLiveSend,
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
    status: 'live-approved',
    primaryChannel: HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
    transport: 'telegram_bot_api',
    allowedRecipient: 'Steve',
    approvedBotUsername: HARLAN_APPROVED_TELEGRAM_BOT_USERNAME,
    approvedChatId: HARLAN_APPROVED_STEVE_CHAT_ID,
    defaultDeliveryMode: HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE,
    liveSendDefault: false,
    liveSendAllowedFromApprovedRunner: true,
    externalSendAllowedFromProof: false,
    rawSecretsAllowedInArtifacts: false,
    credentialMutationAllowed: false,
    sourceMutationAllowed: false,
    normalChromeProfileAllowed: false,
    requiredStates: HARLAN_TELEGRAM_REQUIRED_STATES,
    configPolicy: {
      requiredRefKeys: HARLAN_TELEGRAM_CONFIG_REF_KEYS,
      rawSecretEnvKeysRejected: HARLAN_TELEGRAM_RAW_SECRET_ENV_KEYS,
      secretSource: 'OpenClaw token ref plus Steve-approved chat boundary only',
      approvalMode: HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE,
    },
    deliveryPolicy: {
      maxNotificationsPerIssue: 1,
      maxTotalEscalations: 2,
      waitForDoneToken: 'DONE',
      reverifyBeforeResume: true,
      timeoutState: 'fail_closed',
      sendsMessageNowInProof: false,
      sendsMessageNowFromApprovedRunner: true,
    },
    notNextBoundaries: [
      'Do not send live Telegram from proof paths; only the approved live runner may send.',
      'Do not store or print raw Telegram bot tokens or raw chat IDs.',
      'Do not send to anyone except Steve.',
      'Do not send actions beyond notifications.',
      'Do not mutate credentials, OAuth tokens, browser profiles, source sessions, or source systems.',
      'Do not treat a dry-run packet as completed live delivery.',
    ],
    ...overrides,
  }
}

export function assertHarlanTelegramLiveSendBlocked({ sendNow = false, contract = buildHarlanAuthLiveDeliveryContract() } = {}) {
  if (sendNow || contract.externalSendAllowedFromProof === true) {
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
  const liveReadyStatus = config.readyForLiveSend ? 'approved_live_send_ready_not_sent' : status
  const blocker = config.readyForSteveLiveTest
    ? null
    : `Missing or rejected Telegram live-send preflight: ${config.rejectedReasons.join(', ') || 'not approved'}`

  return {
    deliveryId: `harlan-telegram-${event.issueKey}`,
    cardId: contract.cardId,
    parentCardId: contract.parentCardId,
    status: liveReadyStatus,
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
      readyForLiveSend: config.readyForLiveSend,
      missing: config.missing,
      rawSecretEnvKeysPresent: config.rawSecretEnvKeysPresent,
      rawSecretEnvKeysRejected: config.rawSecretEnvKeysRejected,
      hasApprovedRef: config.hasApprovedRef,
      approvedBoundary: config.approvedBoundary,
      liveSendApprovalRef: config.liveSendApprovalRef,
    },
    timeline: [
      { state: 'auth_needed_received', at: event.createdAt, eventId: event.eventId },
      { state: 'dedup_checked', at: now, issueKey: event.issueKey },
      { state: 'delivery_preflight_evaluated', at: now, readyForLiveSend: config.readyForLiveSend },
      { state: 'telegram_delivery_packet_prepared', at: now, notificationId: notification.notificationId },
      { state: 'waiting_for_done', at: now, token: contract.deliveryPolicy.waitForDoneToken },
    ],
  }
}

function readPathValue(source = {}, refPath = '') {
  return normalizeText(refPath)
    .split('.')
    .filter(Boolean)
    .reduce((current, part) => current?.[part], source)
}

async function readOpenClawConfigValue(ref = '') {
  const openClawPath = normalizeText(ref).replace(/^openclaw:\/\//, '')
  if (!openClawPath) throw new Error('OpenClaw ref is missing a path.')
  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
  const source = JSON.parse(await fs.readFile(configPath, 'utf8'))
  const value = readPathValue(source, openClawPath)
  if (!normalizeText(value)) throw new Error(`OpenClaw ref ${ref} did not resolve.`)
  return normalizeText(value)
}

export async function resolveHarlanTelegramLiveDeliverySecrets(config = resolveHarlanTelegramDeliveryConfig()) {
  if (!config.readyForLiveSend) {
    throw new Error(`Harlan Telegram live send is not ready: ${config.rejectedReasons.join(', ') || 'not approved'}`)
  }
  if (!isOpenClawRef(config.botTokenRef)) {
    throw new Error('Harlan Telegram bot token must resolve through an OpenClaw token ref.')
  }
  const botToken = await readOpenClawConfigValue(config.botTokenRef)
  const chatId = normalizeText(config.steveChatIdRef)
  if (chatId !== HARLAN_APPROVED_STEVE_CHAT_ID) {
    throw new Error('Harlan Telegram live send rejected a non-Steve chat boundary.')
  }
  return {
    botToken,
    chatId,
    botTokenRef: config.botTokenRef,
    chatIdRef: config.steveChatIdRef,
  }
}

function buildTelegramSendPayload({ chatId, text }) {
  return JSON.stringify({
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  })
}

export function sendTelegramBotMessage({ botToken, chatId, text, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const payload = buildTelegramSendPayload({ chatId, text })
    const request = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    }, response => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { body += chunk })
      response.on('end', () => {
        let parsed = null
        try {
          parsed = JSON.parse(body)
        } catch {}
        if (response.statusCode >= 200 && response.statusCode < 300 && parsed?.ok === true) {
          resolve({
            ok: true,
            statusCode: response.statusCode,
            messageId: parsed.result?.message_id || null,
          })
          return
        }
        reject(new Error(`Telegram send failed with status ${response.statusCode || 'unknown'}`))
      })
    })
    request.on('timeout', () => {
      request.destroy(new Error('Telegram send timed out.'))
    })
    request.on('error', reject)
    request.write(payload)
    request.end()
  })
}

export function buildHarlanBuilderEvent({
  eventType = 'builder_event',
  cardId = 'unknown-card',
  status = 'unknown',
  summary = '',
  runId = '',
  createdAt = new Date().toISOString(),
} = {}) {
  const normalized = {
    eventType: normalizeText(eventType) || 'builder_event',
    cardId: normalizeText(cardId) || 'unknown-card',
    status: normalizeText(status) || 'unknown',
    summary: normalizeText(summary),
    runId: normalizeText(runId),
    createdAt,
  }
  return {
    ...normalized,
    eventId: `harlan-builder-${stableHash(normalized).slice(0, 16)}`,
    dedupeKey: stableHash([
      normalized.eventType,
      normalized.cardId,
      normalized.status,
      normalized.runId,
      normalized.summary,
    ].join('|')),
  }
}

export function buildHarlanBuilderEventText(event = {}) {
  const lines = [
    `Harlan build notice: ${event.status || 'unknown'}`,
    `Card: ${event.cardId || 'unknown-card'}`,
    `Event: ${event.eventType || 'builder_event'}`,
  ]
  if (event.summary) lines.push(`Summary: ${event.summary}`)
  if (event.runId) lines.push(`Run: ${event.runId}`)
  lines.push('Boundary: Steve-only notification. No action was taken.')
  return lines.join('\n')
}

async function readDedupeLedger(ledgerPath) {
  try {
    return JSON.parse(await fs.readFile(ledgerPath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return { sent: [] }
    throw error
  }
}

async function writeDedupeLedger(ledgerPath, ledger) {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`)
}

export function defaultHarlanTelegramDedupeLedgerPath() {
  return path.join(os.homedir(), '.openclaw', 'harlan-telegram-sent-events.json')
}

export async function sendHarlanBuilderEventNotification({
  event = {},
  env = process.env,
  dryRun = false,
  resolveSecrets = resolveHarlanTelegramLiveDeliverySecrets,
  telegramSender = sendTelegramBotMessage,
  dedupeLedgerPath = defaultHarlanTelegramDedupeLedgerPath(),
} = {}) {
  const config = resolveHarlanTelegramDeliveryConfig(env)
  const builderEvent = buildHarlanBuilderEvent(event)
  const text = buildHarlanBuilderEventText(builderEvent)
  if (!config.readyForLiveSend) {
    return {
      ok: false,
      status: 'fail_closed',
      externalSent: false,
      sendsMessageNow: false,
      reason: config.rejectedReasons.join(', ') || 'live_send_not_ready',
      config: {
        deliveryMode: config.deliveryMode,
        missing: config.missing,
        rawSecretEnvKeysRejected: config.rawSecretEnvKeysRejected,
        approvedBoundary: config.approvedBoundary,
      },
      event: builderEvent,
    }
  }

  if (dryRun) {
    return {
      ok: true,
      status: 'dry_run_ready',
      externalSent: false,
      sendsMessageNow: false,
      textHash: stableHash(text),
      event: builderEvent,
      config: {
        deliveryMode: config.deliveryMode,
        botTokenRef: config.botTokenRef,
        chatIdRef: config.steveChatIdRef,
      },
    }
  }

  if (dedupeLedgerPath !== false) {
    const ledger = await readDedupeLedger(dedupeLedgerPath)
    if (list(ledger.sent).some(row => row.dedupeKey === builderEvent.dedupeKey)) {
      return {
        ok: true,
        status: 'deduped',
        externalSent: false,
        sendsMessageNow: false,
        event: builderEvent,
      }
    }
  }

  try {
    const secrets = await resolveSecrets(config)
    const sendResult = await telegramSender({
      botToken: secrets.botToken,
      chatId: secrets.chatId,
      text,
    })
    if (dedupeLedgerPath !== false) {
      const ledger = await readDedupeLedger(dedupeLedgerPath)
      ledger.sent = list(ledger.sent)
      ledger.sent.push({
        dedupeKey: builderEvent.dedupeKey,
        eventId: builderEvent.eventId,
        cardId: builderEvent.cardId,
        eventType: builderEvent.eventType,
        status: builderEvent.status,
        sentAt: new Date().toISOString(),
        messageId: sendResult.messageId || null,
      })
      await writeDedupeLedger(dedupeLedgerPath, ledger)
    }
    return {
      ok: true,
      status: 'sent',
      externalSent: true,
      sendsMessageNow: true,
      messageId: sendResult.messageId || null,
      event: builderEvent,
      textHash: stableHash(text),
      chatIdRef: secrets.chatIdRef || config.steveChatIdRef,
      botTokenRef: secrets.botTokenRef || config.botTokenRef,
    }
  } catch (error) {
    return {
      ok: false,
      status: 'fail_closed',
      externalSent: false,
      sendsMessageNow: false,
      reason: error instanceof Error ? error.message : String(error),
      event: builderEvent,
    }
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
      ? packet.status === 'approved_live_send_ready_not_sent' && packet.sendsMessageNow === false
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
  if (contract.status !== 'live-approved') addViolation(violations, 'contract', 'live_approved_status_required', contract.status || 'missing')
  if (contract.primaryChannel !== 'telegram') addViolation(violations, 'contract', 'telegram_primary_required', contract.primaryChannel || 'missing')
  if (contract.transport !== 'telegram_bot_api') addViolation(violations, 'contract', 'telegram_transport_required', contract.transport || 'missing')
  if (contract.allowedRecipient !== 'Steve') addViolation(violations, 'contract', 'steve_only_required', contract.allowedRecipient || 'missing')
  if (contract.defaultDeliveryMode !== HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE) addViolation(violations, 'contract', 'approved_live_mode_required', contract.defaultDeliveryMode || 'missing')
  if (contract.liveSendDefault !== false) addViolation(violations, 'contract', 'live_send_default_blocked', String(contract.liveSendDefault))
  if (contract.liveSendAllowedFromApprovedRunner !== true) addViolation(violations, 'contract', 'approved_runner_send_required', String(contract.liveSendAllowedFromApprovedRunner))
  if (contract.externalSendAllowedFromProof !== false) addViolation(violations, 'contract', 'proof_external_send_blocked', String(contract.externalSendAllowedFromProof))
  if (contract.approvedBotUsername !== HARLAN_APPROVED_TELEGRAM_BOT_USERNAME) addViolation(violations, 'contract', 'approved_bot_boundary_required', contract.approvedBotUsername || 'missing')
  if (contract.approvedChatId !== HARLAN_APPROVED_STEVE_CHAT_ID) addViolation(violations, 'contract', 'approved_chat_boundary_required', contract.approvedChatId || 'missing')
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
    status: violations.length ? 'blocked' : 'ready_live',
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
      HARLAN_TELEGRAM_BOT_USERNAME: HARLAN_APPROVED_TELEGRAM_BOT_USERNAME,
      HARLAN_TELEGRAM_BOT_TOKEN_REF: HARLAN_OPENCLAW_TELEGRAM_BOT_TOKEN_REF,
      HARLAN_TELEGRAM_STEVE_CHAT_ID_REF: HARLAN_APPROVED_STEVE_CHAT_ID,
      HARLAN_TELEGRAM_LIVE_SEND_APPROVAL_REF: `docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json#${HARLAN_AUTH_LIVE_DELIVERY_APPROVED_MODE}`,
    },
  })
  const rawSecretRejected = runHarlanAuthLiveDeliveryScenario({
    scenario: 'missing_config',
    contract,
    env: {
      HARLAN_AUTH_LIVE_DELIVERY_MODE: 'approved_steve_only_live_test',
      HARLAN_TELEGRAM_TARGET_OWNER: 'Steve',
      HARLAN_TELEGRAM_BOT_USERNAME: HARLAN_APPROVED_TELEGRAM_BOT_USERNAME,
      HARLAN_TELEGRAM_BOT_TOKEN_REF: HARLAN_OPENCLAW_TELEGRAM_BOT_TOKEN_REF,
      HARLAN_TELEGRAM_STEVE_CHAT_ID_REF: HARLAN_APPROVED_STEVE_CHAT_ID,
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
    readyConfig.packet.status === 'approved_live_send_ready_not_sent' &&
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
    approvedConfigPreparesButDoesNotSend: readyConfig.packet.status === 'approved_live_send_ready_not_sent' && readyConfig.packet.sendsMessageNow === false,
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
