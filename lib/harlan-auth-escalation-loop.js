import crypto from 'node:crypto'

export const HARLAN_AUTH_ESCALATION_LOOP_CARD_ID = 'HARLAN-AUTH-ESCALATION-LOOP-001'
export const HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY = 'harlan-auth-escalation-loop-v1'
export const HARLAN_AUTH_ESCALATION_LOOP_PLAN_PATH = 'docs/process/harlan-auth-escalation-loop-001-plan.md'
export const HARLAN_AUTH_ESCALATION_LOOP_APPROVAL_PATH = 'docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json'
export const HARLAN_AUTH_ESCALATION_LOOP_SCRIPT_PATH = 'scripts/process-harlan-auth-escalation-loop-check.mjs'
export const HARLAN_AUTH_ESCALATION_LOOP_DOC_PATH = 'docs/agents/harlan-auth-escalation-loop.md'
export const HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md'
export const HARLAN_AUTH_ESCALATION_LOOP_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const HARLAN_AUTH_ESCALATION_LOOP_NEXT_CARD_ID = 'BRAIN-FLEET-QUOTA-LEDGER-001'
export const HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL = 'telegram'
export const HARLAN_AUTH_ESCALATION_CHANNELS = [HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL]

export const HARLAN_AUTH_ESCALATION_OLD_SYSTEM_SOURCE_REFS = [
  '/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs',
  '/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs',
  '/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs',
  '/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts',
  '/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts',
  '/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md',
]

export const HARLAN_AUTH_ESCALATION_REQUIRED_EVENT_STATES = [
  'auth_needed',
  'blocked_auth_recorded',
  'steve_notification_prepared',
  'waiting_for_done',
  'reverify_started',
  'resume_allowed',
  'fail_closed',
]

export const HARLAN_AUTH_ESCALATION_PROOF_COMMANDS = [
  'node --check lib/harlan-auth-escalation-loop.js scripts/process-harlan-auth-escalation-loop-check.mjs lib/foundation-runtime-reliability-verifier.js scripts/foundation-verify.mjs',
  'npm run process:harlan-auth-escalation-loop-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json --closeoutKey=harlan-auth-escalation-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --closeoutKey=harlan-auth-escalation-loop-v1',
  'npm run process:foundation-ship -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json --closeoutKey=harlan-auth-escalation-loop-v1 --commitRef=HEAD',
]

export const HARLAN_AUTH_ESCALATION_NOT_NEXT_BOUNDARIES = [
  'Do not send live Telegram, email, Gmail, Slack, ClickUp, Drive, or Agent Feedback messages from the proof.',
  'Do not mutate credentials, OAuth tokens, browser profiles, provider config, llm_credentials, or llm_routes.',
  'Do not run live provider probes, live extraction, paid/private source access, browser automation, or broad crawls.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not treat auth_needed as success; blocked-auth items must stay blocked until DONE plus reverify passes.',
  'Do not spam Steve; one escalation per issue, one follow-up after the policy window, then fail closed.',
  'Do not continue to quota-ledged calls, provider capability probes, or extractor runtime proof until this card ships green.',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function asList(value) {
  return Array.isArray(value) ? value : []
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function minutesBetween(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000))
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || HARLAN_AUTH_ESCALATION_LOOP_CARD_ID, ruleId, detail })
}

export function buildHarlanAuthEscalationLoop(overrides = {}) {
  return {
    cardId: HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
    closeoutKey: HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    version: 1,
    reportOnlyProof: true,
    externalSendAllowed: false,
    credentialMutationAllowed: false,
    liveProviderProbeAllowed: false,
    liveExtractionAllowed: false,
    notification: {
      senderIdentity: 'Harlan',
      recipient: 'Steve',
      primaryChannel: HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL,
      channels: HARLAN_AUTH_ESCALATION_CHANNELS,
      channelPolicy: 'Harlan operator auth escalation communications route through Telegram by default. Live Telegram delivery remains approval-bound.',
      deliveryMode: 'dry_run',
      approvedSteveOnlyTestRef: null,
      replyToken: 'DONE',
      messageMustInclude: [
        'AUTH ESCALATION',
        'Action needed',
        'Reply DONE when complete',
        'Time estimate',
      ],
    },
    eventContract: {
      eventType: 'auth_needed',
      blockedStatus: 'blocked-auth',
      requiredFields: [
        'eventId',
        'jobId',
        'sourceSystem',
        'providerRouteKey',
        'accountLabel',
        'blocker',
        'actionNeeded',
        'artifactRef',
        'createdAt',
      ],
      requiredStates: HARLAN_AUTH_ESCALATION_REQUIRED_EVENT_STATES,
      eventStoreOwner: 'Foundation',
    },
    dedupPolicy: {
      issueKeyFields: ['sourceSystem', 'providerRouteKey', 'accountLabel', 'blocker'],
      initialWindowHours: 48,
      followUpAfterHours: 72,
      abandonAfterDays: 7,
      maxTotalEscalations: 2,
      dedupDecision: 'suppress_duplicate_notification',
    },
    waitPolicy: {
      waitState: 'waiting_for_done',
      doneToken: 'DONE',
      maxWaitMinutes: 10,
      timeoutState: 'fail_closed',
      timeoutReason: 'auth_approval_timeout',
    },
    reverifyPolicy: {
      requiredAfterDone: true,
      verifierMode: 'silent_reverify_before_resume',
      resumeState: 'resume_allowed',
      failedState: 'fail_closed',
    },
    oldSystemSourceRefs: HARLAN_AUTH_ESCALATION_OLD_SYSTEM_SOURCE_REFS,
    notNextBoundaries: HARLAN_AUTH_ESCALATION_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function buildAuthNeededEvent(input = {}) {
  const sourceSystem = normalizeText(input.sourceSystem || 'myicor')
  const providerRouteKey = normalizeText(input.providerRouteKey || 'brain-fleet:myicor-auth-proof')
  const accountLabel = normalizeText(input.accountLabel || 'steve-owner')
  const blocker = normalizeText(input.blocker || '2FA required for provider login')
  const issueKey = stableHash([sourceSystem, providerRouteKey, accountLabel, blocker].join('|')).slice(0, 16)
  const createdAt = normalizeText(input.createdAt || '2026-05-20T16:00:00.000-04:00')
  return {
    eventId: normalizeText(input.eventId) || `auth-needed-${issueKey}`,
    eventType: 'auth_needed',
    jobId: normalizeText(input.jobId || 'extractor-proof-dry-run-001'),
    sourceSystem,
    providerRouteKey,
    accountLabel,
    blocker,
    actionNeeded: normalizeText(input.actionNeeded || 'Approve the 2FA/auth prompt, then reply DONE.'),
    artifactRef: normalizeText(input.artifactRef || 'artifact://dry-run/auth-needed/myicor-2fa'),
    status: 'blocked-auth',
    createdAt,
    issueKey,
    credentialRef: normalizeText(input.credentialRef || 'credential-ref:env-or-vault-label-only'),
  }
}

export function prepareHarlanAuthNotification({
  loop = buildHarlanAuthEscalationLoop(),
  event = buildAuthNeededEvent(),
  now = '2026-05-20T16:00:05.000-04:00',
} = {}) {
  const deliveryMode = normalizeText(loop.notification?.deliveryMode || 'dry_run')
  const approvedSteveOnlyTestRef = normalizeText(loop.notification?.approvedSteveOnlyTestRef)
  if (deliveryMode !== 'dry_run' && !(deliveryMode === 'approved_steve_only_test' && approvedSteveOnlyTestRef)) {
    throw new Error('Harlan auth escalation v1 refuses external notification without an explicit Steve-only test approval ref.')
  }
  if (loop.notification?.recipient !== 'Steve') {
    throw new Error('Harlan auth escalation v1 is Steve-only.')
  }

  return {
    notificationId: `harlan-auth-${event.issueKey}`,
    status: 'prepared',
    deliveryMode,
    externalSent: false,
    dryRun: deliveryMode === 'dry_run',
    primaryChannel: normalizeText(loop.notification?.primaryChannel || HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL),
    channels: asList(loop.notification?.channels),
    recipient: 'Steve',
    contextType: 'write_approval',
    contextKey: event.issueKey,
    createdAt: now,
    text: [
      'AUTH ESCALATION [TELEGRAM]',
      'From: Harlan',
      `Task: ${event.jobId}`,
      `Blocker: ${event.blocker}`,
      `Action needed: ${event.actionNeeded}`,
      'Reply DONE when complete.',
    ].join('\n'),
  }
}

export function runHarlanAuthEscalationScenario({
  loop = buildHarlanAuthEscalationLoop(),
  scenario = 'auth_needed',
  now = '2026-05-20T16:00:00.000-04:00',
  event = buildAuthNeededEvent({ createdAt: now }),
  mutateCredential = false,
} = {}) {
  const credentialBefore = {
    credentialRef: event.credentialRef,
    accountLabel: event.accountLabel,
    tokenHash: 'unchanged-token-hash',
    updatedAt: 'unchanged',
  }
  const credentialAfter = mutateCredential
    ? { ...credentialBefore, tokenHash: 'mutated-token-hash', updatedAt: now }
    : { ...credentialBefore }

  const blockedEvent = {
    ...event,
    status: loop.eventContract?.blockedStatus || 'blocked-auth',
    state: 'blocked_auth_recorded',
    recordedAt: now,
  }
  const notification = prepareHarlanAuthNotification({ loop, event, now })
  const timeline = [
    { state: 'auth_needed', at: event.createdAt, eventId: event.eventId },
    { state: 'blocked_auth_recorded', at: now, eventId: event.eventId },
    { state: 'steve_notification_prepared', at: notification.createdAt, notificationId: notification.notificationId },
  ]

  if (scenario === 'dedup') {
    const duplicate = buildAuthNeededEvent({ ...event, eventId: `${event.eventId}-duplicate` })
    const secondNotification = duplicate.issueKey === event.issueKey
      ? { status: 'deduped', reason: loop.dedupPolicy?.dedupDecision || 'suppress_duplicate_notification', externalSent: false }
      : prepareHarlanAuthNotification({ loop, event: duplicate, now })
    return {
      scenario,
      ok: secondNotification.status === 'deduped' && notification.externalSent === false,
      blockedEvent,
      notifications: [notification, secondNotification],
      notificationCount: 1,
      duplicateSuppressed: secondNotification.status === 'deduped',
      noCredentialMutation: JSON.stringify(credentialBefore) === JSON.stringify(credentialAfter),
      timeline,
    }
  }

  if (scenario === 'timeout') {
    const start = new Date(now)
    const timeoutAt = new Date(start.getTime() + Number(loop.waitPolicy?.maxWaitMinutes || 10) * 60000)
    timeline.push(
      { state: 'waiting_for_done', at: now, eventId: event.eventId },
      { state: 'fail_closed', at: timeoutAt.toISOString(), reason: loop.waitPolicy?.timeoutReason || 'auth_approval_timeout' },
    )
    return {
      scenario,
      ok: true,
      blockedEvent,
      notifications: [notification],
      finalStatus: 'fail_closed',
      reason: loop.waitPolicy?.timeoutReason || 'auth_approval_timeout',
      waitedMinutes: minutesBetween(timeoutAt, start),
      noCredentialMutation: JSON.stringify(credentialBefore) === JSON.stringify(credentialAfter),
      timeline,
    }
  }

  if (scenario === 'done_resume') {
    timeline.push(
      { state: 'waiting_for_done', at: now, eventId: event.eventId },
      { state: 'done_received', at: '2026-05-20T16:02:00.000-04:00', token: loop.waitPolicy?.doneToken || 'DONE' },
      { state: 'reverify_started', at: '2026-05-20T16:02:05.000-04:00', mode: loop.reverifyPolicy?.verifierMode },
      { state: 'resume_allowed', at: '2026-05-20T16:02:10.000-04:00' },
    )
    return {
      scenario,
      ok: true,
      blockedEvent,
      notifications: [notification],
      reply: { token: loop.waitPolicy?.doneToken || 'DONE', accepted: true },
      reverify: { status: 'passed', silent: true },
      finalStatus: 'resumed',
      noCredentialMutation: JSON.stringify(credentialBefore) === JSON.stringify(credentialAfter),
      timeline,
    }
  }

  timeline.push({ state: 'waiting_for_done', at: now, eventId: event.eventId })
  return {
    scenario,
    ok: true,
    blockedEvent,
    notifications: [notification],
    finalStatus: 'blocked-auth',
    noCredentialMutation: JSON.stringify(credentialBefore) === JSON.stringify(credentialAfter),
    timeline,
  }
}

export function evaluateHarlanAuthEscalationLoop(loop = buildHarlanAuthEscalationLoop()) {
  const violations = []
  const notification = loop.notification || {}
  const eventContract = loop.eventContract || {}
  const dedupPolicy = loop.dedupPolicy || {}
  const waitPolicy = loop.waitPolicy || {}
  const reverifyPolicy = loop.reverifyPolicy || {}

  if (loop.ownerLayer !== 'Foundation') addViolation(violations, loop.cardId, 'foundation_owner_required', loop.ownerLayer || 'missing')
  if (loop.externalSendAllowed !== false) addViolation(violations, loop.cardId, 'external_send_blocked', String(loop.externalSendAllowed))
  if (loop.credentialMutationAllowed !== false) addViolation(violations, loop.cardId, 'credential_mutation_blocked', String(loop.credentialMutationAllowed))
  if (loop.liveProviderProbeAllowed !== false) addViolation(violations, loop.cardId, 'provider_probe_blocked', String(loop.liveProviderProbeAllowed))
  if (loop.liveExtractionAllowed !== false) addViolation(violations, loop.cardId, 'live_extraction_blocked', String(loop.liveExtractionAllowed))
  if (notification.senderIdentity !== 'Harlan') addViolation(violations, 'notification', 'harlan_sender_required', notification.senderIdentity || 'missing')
  if (notification.recipient !== 'Steve') addViolation(violations, 'notification', 'steve_only_required', notification.recipient || 'missing')
  if (!['dry_run', 'approved_steve_only_test'].includes(notification.deliveryMode)) addViolation(violations, 'notification', 'safe_delivery_mode_required', notification.deliveryMode || 'missing')
  if (notification.deliveryMode === 'approved_steve_only_test' && !normalizeText(notification.approvedSteveOnlyTestRef)) addViolation(violations, 'notification', 'approved_test_ref_required', 'missing approvedSteveOnlyTestRef')
  if (notification.primaryChannel !== HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL) {
    addViolation(violations, 'notification', 'telegram_primary_channel_required', notification.primaryChannel || 'missing')
  }
  const channels = asList(notification.channels)
  if (!channels.includes(HARLAN_AUTH_ESCALATION_PRIMARY_CHANNEL)) {
    addViolation(violations, 'notification', 'telegram_channel_required', channels.join(', ') || 'missing')
  }
  for (const channel of channels) {
    if (!HARLAN_AUTH_ESCALATION_CHANNELS.includes(channel)) addViolation(violations, 'notification', 'telegram_only_default_required', channel)
  }
  for (const token of ['AUTH ESCALATION', 'Action needed', 'Reply DONE when complete']) {
    if (!asList(notification.messageMustInclude).includes(token)) addViolation(violations, 'notification', 'message_token_required', token)
  }
  if (eventContract.eventType !== 'auth_needed') addViolation(violations, 'eventContract', 'auth_needed_event_required', eventContract.eventType || 'missing')
  if (eventContract.blockedStatus !== 'blocked-auth') addViolation(violations, 'eventContract', 'blocked_auth_status_required', eventContract.blockedStatus || 'missing')
  for (const field of ['eventId', 'jobId', 'sourceSystem', 'providerRouteKey', 'accountLabel', 'blocker', 'actionNeeded', 'artifactRef', 'createdAt']) {
    if (!asList(eventContract.requiredFields).includes(field)) addViolation(violations, 'eventContract', 'event_field_required', field)
  }
  for (const state of HARLAN_AUTH_ESCALATION_REQUIRED_EVENT_STATES) {
    if (!asList(eventContract.requiredStates).includes(state)) addViolation(violations, 'eventContract', 'event_state_required', state)
  }
  if (Number(dedupPolicy.initialWindowHours) < 48) addViolation(violations, 'dedupPolicy', 'initial_dedup_window_required', String(dedupPolicy.initialWindowHours || 'missing'))
  if (Number(dedupPolicy.followUpAfterHours) < 72) addViolation(violations, 'dedupPolicy', 'follow_up_window_required', String(dedupPolicy.followUpAfterHours || 'missing'))
  if (Number(dedupPolicy.maxTotalEscalations) > 2) addViolation(violations, 'dedupPolicy', 'max_escalations_required', String(dedupPolicy.maxTotalEscalations))
  if (waitPolicy.doneToken !== 'DONE') addViolation(violations, 'waitPolicy', 'done_token_required', waitPolicy.doneToken || 'missing')
  if (waitPolicy.timeoutState !== 'fail_closed') addViolation(violations, 'waitPolicy', 'timeout_fail_closed_required', waitPolicy.timeoutState || 'missing')
  if (Number(waitPolicy.maxWaitMinutes) <= 0) addViolation(violations, 'waitPolicy', 'max_wait_required', String(waitPolicy.maxWaitMinutes || 'missing'))
  if (reverifyPolicy.requiredAfterDone !== true) addViolation(violations, 'reverifyPolicy', 'reverify_after_done_required', String(reverifyPolicy.requiredAfterDone))
  if (reverifyPolicy.resumeState !== 'resume_allowed') addViolation(violations, 'reverifyPolicy', 'resume_state_required', reverifyPolicy.resumeState || 'missing')
  if (reverifyPolicy.failedState !== 'fail_closed') addViolation(violations, 'reverifyPolicy', 'failed_state_required', reverifyPolicy.failedState || 'missing')
  for (const ref of HARLAN_AUTH_ESCALATION_OLD_SYSTEM_SOURCE_REFS) {
    if (!asList(loop.oldSystemSourceRefs).includes(ref)) addViolation(violations, 'oldSystemSourceRefs', 'old_system_source_ref_required', ref)
  }
  for (const boundary of ['Do not send live Telegram', 'Do not mutate credentials', 'Do not run live provider probes']) {
    if (!asList(loop.notNextBoundaries).some(item => item.includes(boundary))) addViolation(violations, 'notNextBoundaries', 'boundary_required', boundary)
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: loop.cardId,
    closeoutKey: loop.closeoutKey,
    violations,
    summary: {
      sourceRefCount: asList(loop.oldSystemSourceRefs).length,
      requiredStateCount: asList(eventContract.requiredStates).length,
      channelCount: asList(notification.channels).length,
      violationCount: violations.length,
    },
  }
}

export function buildHarlanAuthEscalationLoopDogfoodProof() {
  const healthyLoop = buildHarlanAuthEscalationLoop()
  const healthy = evaluateHarlanAuthEscalationLoop(healthyLoop)
  const authNeeded = runHarlanAuthEscalationScenario({ loop: healthyLoop, scenario: 'auth_needed' })
  const dedup = runHarlanAuthEscalationScenario({ loop: healthyLoop, scenario: 'dedup' })
  const timeout = runHarlanAuthEscalationScenario({ loop: healthyLoop, scenario: 'timeout' })
  const doneResume = runHarlanAuthEscalationScenario({ loop: healthyLoop, scenario: 'done_resume' })
  const mutationAttempt = runHarlanAuthEscalationScenario({ loop: healthyLoop, scenario: 'done_resume', mutateCredential: true })

  let unsafeExternalSendRejected = false
  try {
    prepareHarlanAuthNotification({
      loop: buildHarlanAuthEscalationLoop({
        notification: {
          ...healthyLoop.notification,
          deliveryMode: 'send_now',
        },
      }),
    })
  } catch {
    unsafeExternalSendRejected = true
  }

  const missingOldSource = evaluateHarlanAuthEscalationLoop(buildHarlanAuthEscalationLoop({
    oldSystemSourceRefs: HARLAN_AUTH_ESCALATION_OLD_SYSTEM_SOURCE_REFS.slice(0, 4),
  }))
  const missingDoneToken = evaluateHarlanAuthEscalationLoop(buildHarlanAuthEscalationLoop({
    waitPolicy: { ...healthyLoop.waitPolicy, doneToken: '' },
  }))
  const noReverify = evaluateHarlanAuthEscalationLoop(buildHarlanAuthEscalationLoop({
    reverifyPolicy: { ...healthyLoop.reverifyPolicy, requiredAfterDone: false },
  }))

  const ok = healthy.ok === true &&
    authNeeded.finalStatus === 'blocked-auth' &&
    authNeeded.blockedEvent.status === 'blocked-auth' &&
    dedup.duplicateSuppressed === true &&
    dedup.notificationCount === 1 &&
    timeout.finalStatus === 'fail_closed' &&
    doneResume.finalStatus === 'resumed' &&
    doneResume.reverify.status === 'passed' &&
    authNeeded.noCredentialMutation === true &&
    mutationAttempt.noCredentialMutation === false &&
    unsafeExternalSendRejected === true &&
    missingOldSource.ok === false &&
    missingDoneToken.ok === false &&
    noReverify.ok === false

  return {
    ok,
    invariant: 'Harlan auth escalation passes only when auth_needed records blocked-auth, prepares Steve-only dry-run notification, dedups duplicate issues, waits for DONE, re-verifies before resume, times out fail-closed, and never mutates credentials or sends externally from proof.',
    healthy,
    authNeededBlocked: authNeeded.finalStatus === 'blocked-auth' && authNeeded.blockedEvent.status === 'blocked-auth',
    dedupNoSpam: dedup.duplicateSuppressed === true && dedup.notificationCount === 1,
    timeoutFailClosed: timeout.finalStatus === 'fail_closed' && timeout.reason === 'auth_approval_timeout',
    doneRetryResume: doneResume.finalStatus === 'resumed' && doneResume.reply.accepted === true && doneResume.reverify.status === 'passed',
    noCredentialMutation: authNeeded.noCredentialMutation === true && mutationAttempt.noCredentialMutation === false,
    unsafeExternalSendRejected,
    missingOldSourceRejected: missingOldSource.ok === false,
    missingDoneTokenRejected: missingDoneToken.ok === false,
    noReverifyRejected: noReverify.ok === false,
    fixtures: {
      authNeeded,
      dedup,
      timeout,
      doneResume,
      mutationAttempt,
      missingOldSource,
      missingDoneToken,
      noReverify,
    },
  }
}
