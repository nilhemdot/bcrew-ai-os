import {
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  buildSourceSessionBrokerContractSnapshot,
  buildSourceSessionSecretRef,
} from './source-session-broker.js'
import {
  buildKeychainSecretRef,
  keychainItemExists,
} from './credential-vault.js'

export const SOURCE_SESSION_READINESS_SCRIPT_PATH = 'scripts/process-source-session-readiness-check.mjs'
export const SOURCE_SESSION_READINESS_CLOSEOUT_KEY = 'source-session-readiness-readback-v1'
export const MYICOR_MCP_OAUTH_SOURCE = 'myicor-mcp-oauth'
export const MYICOR_MCP_OAUTH_ACCOUNT = 'myicor-authorized-member'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function uniqueStrings(values = []) {
  return [...new Set(list(values).map(text).filter(Boolean))]
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function firstUrlForHost(rows = [], hostPattern = /.*/) {
  return list(rows).find(row => hostPattern.test(row.host || hostOf(row.url)))?.url || list(rows)[0]?.url || ''
}

function hasMyicor(rows = []) {
  return list(rows).some(row => /(^|\.)myicor\.com$/i.test(row.host || hostOf(row.url)) || /myicor/i.test(row.url || row.label || ''))
}

function statusCommand({ source = '', account = '' } = {}) {
  return `npm run credentials:vault -- source:status --source=${source} --account=${account}`
}

function addCommand({ source = '', account = '' } = {}) {
  return `npm run credentials:vault -- source:add --source=${source} --account=${account}`
}

function buildReadinessCheck({
  checkId = '',
  label = '',
  kind = 'metadata_readback',
  source = '',
  account = '',
  status = 'not_checked_in_dashboard',
  statusCommand: command = '',
  setupCommand = '',
  nextAction = '',
  unlocks = '',
  secretRef = '',
  commandEffect = 'metadata_only_if_run',
} = {}) {
  return {
    checkId,
    label,
    kind,
    source,
    account,
    status,
    secretRef: secretRef || (source && account ? buildSourceSessionSecretRef({ source, account }) : ''),
    statusCommand: command,
    setupCommand,
    commandEffect,
    nextAction,
    unlocks,
    rawSecretPrinted: false,
    externalActionStarted: false,
    credentialMutatedByReadback: false,
  }
}

export function buildSourceSessionActionGroupReadiness({
  phase = '',
  rows = [],
} = {}) {
  const normalizedPhase = text(phase)
  const sortedRows = list(rows)
  const checks = []
  const topUrl = firstUrlForHost(sortedRows)
  const skoolUrl = firstUrlForHost(sortedRows, /(^|\.)skool\.com$/i)
  const account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT
  const contract = buildSourceSessionBrokerContractSnapshot()

  if (normalizedPhase === 'free_skool_session_ready') {
    checks.push(buildReadinessCheck({
      checkId: 'free-skool-session-proof',
      label: 'Free Skool session proof',
      kind: 'bounded_worker_ready',
      statusCommand: skoolUrl ? `npm run skool:free-god-mode -- --url=${skoolUrl}` : '',
      nextAction: 'Run only exact free-community rows whose isolated source session is already proven ready.',
      unlocks: '20-day free Skool posts, free courses, and pinned resources inside the approved SOP.',
    }))
  }

  if (normalizedPhase === 'free_source_identity_session_needed') {
    checks.push(buildReadinessCheck({
      checkId: 'skool-free-source-identity',
      label: 'Skool free source identity',
      kind: 'keychain_credential_metadata',
      source: 'skool',
      account,
      statusCommand: statusCommand({ source: 'skool', account }),
      setupCommand: addCommand({ source: 'skool', account }),
      commandEffect: 'setup_command_prompts_keychain_if_run',
      nextAction: 'Store or verify the free Skool source identity, then prove the isolated Skool profile once.',
      unlocks: 'Free Skool community SOP for exact public/about community URLs.',
    }))
    checks.push(buildReadinessCheck({
      checkId: 'skool-free-community-session-proof',
      label: 'Skool isolated profile proof',
      kind: 'session_profile_proof_needed',
      status: 'session_not_proven',
      statusCommand: skoolUrl ? `npm run skool:free-god-mode -- --url=${skoolUrl}` : '',
      nextAction: 'After the source identity exists, prove one bounded free-community run from a clean public/about URL.',
      unlocks: 'Unattended daily free-community extraction after the first session proof.',
    }))
  }

  if (normalizedPhase === 'newsletter_signup_lane_needed') {
    checks.push(buildReadinessCheck({
      checkId: 'newsletter-intake-dry-run',
      label: 'Newsletter intake dry run',
      kind: 'dry_run_form_detection',
      status: 'dry_run_available',
      statusCommand: topUrl ? `npm run newsletter:intake -- --url=${topUrl} --account=${account}` : '',
      nextAction: 'Verify the signup form and source-inbox packet without submitting externally.',
      unlocks: 'Newsletter source packet quality before any live signup decision.',
    }))
    checks.push(buildReadinessCheck({
      checkId: 'newsletter-source-identity',
      label: 'Newsletter source identity',
      kind: 'source_identity_metadata',
      source: 'creator-newsletters',
      account,
      statusCommand: statusCommand({ source: 'creator-newsletters', account }),
      setupCommand: addCommand({ source: 'creator-newsletters', account }),
      commandEffect: 'setup_command_prompts_keychain_if_run',
      nextAction: 'Use the approved AIOS source identity for free newsletters; live external submit still waits for the signup lane.',
      unlocks: 'Future recurring creator newsletter extraction.',
    }))
  }

  if (normalizedPhase === 'community_start_url_needed') {
    checks.push(buildReadinessCheck({
      checkId: 'clean-community-start-url',
      label: 'Clean community start URL',
      kind: 'url_boundary_cleanup',
      status: 'clean_url_needed',
      statusCommand: '',
      nextAction: 'Resolve signup/login/join URLs back to the public/about page before the community SOP can run.',
      unlocks: 'Safe exact-community packet instead of starting from an action surface.',
    }))
  }

  if (normalizedPhase === 'community_runner_needed') {
    checks.push(buildReadinessCheck({
      checkId: 'source-specific-community-runner',
      label: 'Source-specific community runner',
      kind: 'runner_gap',
      status: 'runner_needed',
      nextAction: 'Build or route a community runner for non-Skool hosts before claiming 20-day community extraction.',
      unlocks: 'Community extraction outside Skool without pretending one SOP fits every platform.',
    }))
  }

  if (normalizedPhase === 'paid_or_auth_packet_needed') {
    checks.push(buildReadinessCheck({
      checkId: 'paid-auth-source-packet',
      label: 'Paid/auth source packet',
      kind: 'approval_packet_required',
      status: 'packet_required',
      nextAction: 'Prepare exact source packet, approved account, session boundary, storage rule, and content-use rule before auth.',
      unlocks: 'Paid/private extraction only after Steve approves the exact packet.',
    }))
    const includeMyicor = hasMyicor(sortedRows) || contract.myicorSpecificDiscovery?.instanceName === 'myICOR'
    if (includeMyicor) {
      checks.push(buildReadinessCheck({
        checkId: 'myicor-mcp-public-preflight',
        label: 'myICOR MCP public preflight',
        kind: 'readonly_connector_preflight',
        status: 'preflight_available',
        statusCommand: 'npm run myicor:mcp-preflight -- --json',
        nextAction: 'Confirm the myICOR read-only MCP endpoint and OAuth metadata before browser fallback.',
        unlocks: 'Preferred read-only myICOR connector path.',
      }))
      checks.push(buildReadinessCheck({
        checkId: 'myicor-mcp-oauth-token',
        label: 'myICOR existing Google SSO OAuth token',
        kind: 'keychain_oauth_token_metadata',
        source: MYICOR_MCP_OAUTH_SOURCE,
        account: MYICOR_MCP_OAUTH_ACCOUNT,
        secretRef: buildKeychainSecretRef({ source: MYICOR_MCP_OAUTH_SOURCE, account: MYICOR_MCP_OAUTH_ACCOUNT }),
        statusCommand: 'npm run myicor:mcp-tools -- --json',
        setupCommand: `npm run myicor:mcp-authorize -- --account=${MYICOR_MCP_OAUTH_ACCOUNT}`,
        commandEffect: 'setup_command_opens_readonly_oauth_if_run',
        nextAction: `Authorize read-only myICOR MCP while Steve is awake using ${SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD} for ${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT}; stop if the page asks to Start Free, create a profile, onboard, or sign up.`,
        unlocks: 'Read-only myICOR lessons/articles/transcripts/tool-stack/workstream extraction through MCP.',
      }))
      checks.push(buildReadinessCheck({
        checkId: 'myicor-wrong-signup-branch-guard',
        label: 'myICOR no-signup branch guard',
        kind: 'login_recipe_guard',
        status: 'guard_required',
        nextAction: 'The source session must choose existing Log in / Sign in with Google. If it sees signup/profile creation, it records wrong_signup_branch and fails closed instead of continuing.',
        unlocks: 'Prevents the extractor from creating a new myICOR account when Steve already has paid Google SSO access.',
      }))
      checks.push(buildReadinessCheck({
        checkId: 'myicor-google-sso-mfa-loop',
        label: 'myICOR Google SSO 2FA loop',
        kind: 'human_auth_escalation_needed',
        status: 'auth_needed_loop_required',
        nextAction: 'On passkey, phone prompt, number match, authenticator, or other Google verification, emit auth_needed through Harlan, wait for DONE, silently reverify, then resume or fail closed.',
        unlocks: 'Lets the extractor continue without Steve babysitting every run while still handling Google 2FA safely.',
      }))
    }
  }

  const credentialChecks = checks.filter(check => /^keychain_/.test(check.kind) || check.kind === 'source_identity_metadata')
  return {
    status: checks.length ? 'readiness_commands_available' : 'no_readiness_check_needed',
    phase: normalizedPhase,
    checks,
    checkCount: checks.length,
    credentialCheckCount: credentialChecks.length,
    hosts: uniqueStrings(sortedRows.map(row => row.host || hostOf(row.url))).slice(0, 8),
    rawSecretPrinted: false,
    sideEffects: {
      keychainMetadataRead: false,
      rawSecretRead: false,
      externalWriteStarted: false,
      submittedForm: false,
      openedBrowser: false,
      credentialMutated: false,
    },
  }
}

export async function hydrateSourceSessionReadinessChecks({
  readiness = {},
  keychainExists = keychainItemExists,
} = {}) {
  const checks = []
  for (const check of list(readiness.checks)) {
    const source = text(check.source)
    const account = text(check.account)
    const needsKeychainStatus = ['keychain_credential_metadata', 'keychain_oauth_token_metadata', 'source_identity_metadata']
      .includes(text(check.kind))
    if (!needsKeychainStatus || !source || !account) {
      checks.push({ ...check })
      continue
    }
    let keychainPresent = false
    let keychainCheckStatus = 'checked'
    try {
      keychainPresent = await keychainExists({ source, account })
    } catch (error) {
      keychainCheckStatus = 'check_unavailable'
    }
    checks.push({
      ...check,
      status: keychainCheckStatus === 'check_unavailable'
        ? 'keychain_check_unavailable'
        : keychainPresent ? 'present' : 'missing',
      keychainPresent,
      keychainCheckStatus,
      rawSecretPrinted: false,
      externalActionStarted: false,
      credentialMutatedByReadback: false,
    })
  }
  const missingCredentialCount = checks.filter(check => check.status === 'missing').length
  const presentCredentialCount = checks.filter(check => check.status === 'present').length
  return {
    ...readiness,
    status: missingCredentialCount
      ? 'missing_credentials_or_tokens'
      : presentCredentialCount ? 'credential_metadata_present' : readiness.status,
    checks,
    missingCredentialCount,
    presentCredentialCount,
    rawSecretPrinted: false,
    sideEffects: {
      ...(readiness.sideEffects || {}),
      keychainMetadataRead: checks.some(check => check.keychainCheckStatus === 'checked'),
      rawSecretRead: false,
      externalWriteStarted: false,
      submittedForm: false,
      openedBrowser: false,
      credentialMutated: false,
    },
  }
}

export async function buildLiveSourceSessionReadinessReadback({
  prepQueue = {},
  keychainExists = keychainItemExists,
} = {}) {
  const actionGroups = list(prepQueue.actionGroups)
  const hydratedGroups = []
  for (const group of actionGroups) {
    const readiness = group.readiness || buildSourceSessionActionGroupReadiness({ phase: group.phase, rows: [] })
    hydratedGroups.push({
      groupId: group.groupId,
      phase: group.phase,
      label: group.label,
      totalRows: number(group.totalRows),
      clusterCount: number(group.clusterCount),
      account: group.account,
      runner: group.runner,
      topHosts: list(group.topHosts),
      readiness: await hydrateSourceSessionReadinessChecks({ readiness, keychainExists }),
    })
  }
  const allChecks = hydratedGroups.flatMap(group => list(group.readiness?.checks))
  const missingCredentialCount = allChecks.filter(check => check.status === 'missing').length
  const presentCredentialCount = allChecks.filter(check => check.status === 'present').length
  const unavailableCredentialCheckCount = allChecks.filter(check => check.status === 'keychain_check_unavailable').length
  const status = missingCredentialCount
    ? 'waiting_for_credentials_or_sessions'
    : presentCredentialCount ? 'credential_metadata_present' : 'readiness_commands_available'

  return {
    ok: true,
    status,
    mode: 'metadata_only_source_session_readiness',
    defaultAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    counts: {
      actionGroupCount: hydratedGroups.length,
      checkCount: allChecks.length,
      credentialCheckCount: allChecks.filter(check => ['keychain_credential_metadata', 'keychain_oauth_token_metadata', 'source_identity_metadata'].includes(check.kind)).length,
      missingCredentialCount,
      presentCredentialCount,
      unavailableCredentialCheckCount,
      runAllowedNowRows: number(prepQueue.counts?.runAllowedNowRows),
      prepRows: number(prepQueue.counts?.totalRows),
    },
    groups: hydratedGroups,
    primaryNextAction: missingCredentialCount
      ? 'Store or authorize the missing source-session credentials while Steve is awake, then rerun the readiness check.'
      : prepQueue.primaryNextAction || 'Review the source-session prep queue before any live action.',
    notNext: [
      'no raw password/token read',
      'no login attempt',
      'no account creation',
      'no newsletter submit',
      'no paid/private crawl',
      'no purchase, download, post, comment, message, or profile mutation',
    ],
    rawSecretPrinted: false,
    externalActionStarted: false,
    sideEffects: {
      keychainMetadataRead: allChecks.some(check => check.keychainCheckStatus === 'checked'),
      rawSecretRead: false,
      externalWriteStarted: false,
      submittedForm: false,
      openedBrowser: false,
      credentialMutated: false,
    },
  }
}
