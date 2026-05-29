import {
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE,
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
export const MYICOR_GOOGLE_SSO_SOURCE = SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE
export const MYICOR_MCP_OAUTH_SOURCE = 'myicor-mcp-oauth'
export const MYICOR_MCP_OAUTH_ACCOUNT = 'myicor-authorized-member'
export const CREATOR_NEWSLETTER_SOURCE = 'creator-newsletters'
export const CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID = 'SRC-GMAIL-001'

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

function googleDelegatedMailboxStatusCommand(account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT) {
  return `npm run google:health -- --user=${account}`
}

function newsletterConfirmationReadbackCommand({
  url = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} = {}) {
  if (!text(url)) return ''
  return `npm run newsletter:confirmation-readback -- --url=${url} --account=${account} --json`
}

function newsletterIssueExtractionCommand({
  url = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} = {}) {
  if (!text(url)) return ''
  return `npm run newsletter:issue-extraction -- --url=${url} --account=${account} --confirmed --json`
}

function isCredentialReadinessCheck(check = {}) {
  return [
    'keychain_credential_metadata',
    'keychain_oauth_token_metadata',
    'keychain_optional_metadata',
    'source_identity_metadata',
  ].includes(text(check.kind)) || check.keychainMetadataCheck === true
}

function readinessBlocking(check = {}) {
  return check.blocksReadiness !== false
}

function sourceSessionProbeCommand({
  url = '',
  sourceFamily = '',
  source = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  loginRecipePresent = false,
} = {}) {
  if (!text(url)) return ''
  return [
    'npm run source:session-probe --',
    `--url=${url}`,
    `--sourceFamily=${sourceFamily}`,
    `--source=${source}`,
    `--account=${account}`,
    loginRecipePresent ? '--loginRecipePresent=true' : '',
    '--json',
  ].filter(Boolean).join(' ')
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
  blocksReadiness = true,
  keychainMetadataCheck = false,
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
    blocksReadiness,
    keychainMetadataCheck,
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
      label: 'Skool isolated profile probe',
      kind: 'session_profile_probe_needed',
      status: 'session_not_proven',
      statusCommand: sourceSessionProbeCommand({
        url: skoolUrl,
        sourceFamily: 'skool_free_community',
        source: 'skool',
        account,
        loginRecipePresent: true,
      }),
      nextAction: 'Probe the isolated Skool profile first. If it returns ready, run the 20-day free-community SOP; if it returns auth_needed, use the auth-resume packet before retrying.',
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
      kind: 'source_identity_mailbox_metadata',
      source: CREATOR_NEWSLETTER_SOURCE,
      account,
      status: 'delegated_mailbox_ready',
      secretRef: CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
      statusCommand: googleDelegatedMailboxStatusCommand(account),
      setupCommand: '',
      commandEffect: 'metadata_only_if_run',
      blocksReadiness: false,
      nextAction: 'Use the approved AIOS source mailbox for free newsletters; live external submit still waits for the signup lane.',
      unlocks: 'Future recurring creator newsletter extraction.',
    }))
    checks.push(buildReadinessCheck({
      checkId: 'newsletter-confirmation-readback',
      label: 'Newsletter confirmation readback',
      kind: 'archive_confirmation_readback',
      status: 'readback_available_after_submit',
      source: CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
      account,
      secretRef: CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
      statusCommand: newsletterConfirmationReadbackCommand({ url: topUrl, account }),
      setupCommand: '',
      commandEffect: 'read_existing_shared_gmail_archive_only_if_run',
      nextAction: 'After an approved live signup and Gmail current sync, read back the confirmation email before claiming subscribed status.',
      unlocks: 'Recurring newsletter issue extraction only after confirmed mailbox evidence.',
    }))
    checks.push(buildReadinessCheck({
      checkId: 'newsletter-issue-extraction',
      label: 'Newsletter issue extraction',
      kind: 'archive_issue_extraction',
      status: 'readback_available_after_confirmation',
      source: CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
      account,
      secretRef: CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
      statusCommand: newsletterIssueExtractionCommand({ url: topUrl, account }),
      setupCommand: '',
      commandEffect: 'read_existing_shared_gmail_archive_only_if_run',
      nextAction: 'After subscribed status is confirmed, extract issue ideas and resource links from the Gmail archive without clicking links or mutating the mailbox.',
      unlocks: 'Newsletter source-stack value scoring and downstream public/repo/community handoff rows.',
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
      const myicorUrl = firstUrlForHost(sortedRows, /(^|\.)myicor\.com$/i) || 'https://myicor.com/'
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
        checkId: 'myicor-google-sso-credential',
        label: 'myICOR Google SSO credential',
        kind: 'keychain_credential_metadata',
        source: MYICOR_GOOGLE_SSO_SOURCE,
        account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
        secretRef: buildKeychainSecretRef({ source: MYICOR_GOOGLE_SSO_SOURCE, account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT }),
        statusCommand: statusCommand({ source: MYICOR_GOOGLE_SSO_SOURCE, account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT }),
        setupCommand: addCommand({ source: MYICOR_GOOGLE_SSO_SOURCE, account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT }),
        commandEffect: 'setup_command_prompts_keychain_if_run',
        nextAction: `Verify the paid myICOR Google SSO credential for ${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT}. This is the existing paid-account login route; it still stops for Google 2FA or human verification.`,
        unlocks: 'Agent-driven myICOR OAuth/profile probes can use the right Google account without asking Steve to type the password each run.',
      }))
      checks.push(buildReadinessCheck({
        checkId: 'myicor-mcp-oauth-token',
        label: 'myICOR existing Google SSO OAuth token',
        kind: 'keychain_oauth_token_metadata',
        source: MYICOR_MCP_OAUTH_SOURCE,
        account: MYICOR_MCP_OAUTH_ACCOUNT,
        secretRef: buildKeychainSecretRef({ source: MYICOR_MCP_OAUTH_SOURCE, account: MYICOR_MCP_OAUTH_ACCOUNT }),
        statusCommand: 'npm run myicor:mcp-tools -- --json',
        setupCommand: `npm run myicor:mcp-authorize-agent -- --account=${MYICOR_MCP_OAUTH_ACCOUNT}`,
        commandEffect: 'setup_command_runs_agent_driven_readonly_oauth_if_run',
        nextAction: `Authorize read-only myICOR MCP through the agent-driven source session using ${SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD} for ${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT}; the agent should recover from signup/profile branches, use Keychain for password, and stop only for missing credential or Google 2FA/human verification.`,
        unlocks: 'Read-only myICOR lessons/articles/transcripts/tool-stack/workstream extraction through MCP.',
      }))
      checks.push(buildReadinessCheck({
        checkId: 'myicor-google-sso-free-account-row-ignored',
        label: 'Ignored myICOR free-account row',
        kind: 'keychain_optional_metadata',
        source: MYICOR_GOOGLE_SSO_SOURCE,
        account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        secretRef: buildKeychainSecretRef({ source: MYICOR_GOOGLE_SSO_SOURCE, account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT }),
        statusCommand: statusCommand({ source: MYICOR_GOOGLE_SSO_SOURCE, account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT }),
        blocksReadiness: false,
        nextAction: `If this row exists, ignore it for paid myICOR. Paid myICOR must use ${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT}; the free-source identity remains for free newsletters/communities only.`,
        unlocks: 'Operator clarity only; this optional row never blocks or unlocks paid myICOR readiness.',
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
        checkId: 'myicor-source-session-profile-probe',
        label: 'myICOR source-session profile probe',
        kind: 'session_profile_probe_needed',
        status: 'probe_available',
        statusCommand: sourceSessionProbeCommand({
          url: myicorUrl,
          sourceFamily: 'paid_course_training_platforms',
          source: 'myicor',
          account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
          loginRecipePresent: true,
        }),
        nextAction: 'Probe MyICOR with the existing Google SSO account route before browser fallback. Stop on Start Free/profile creation, emit auth_needed on Google verification, and only continue when the isolated profile is ready.',
        unlocks: 'A concrete ready/auth-needed/wrong-branch readback before any MyICOR course extraction.',
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

  const credentialChecks = checks.filter(isCredentialReadinessCheck)
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
    const needsKeychainStatus = isCredentialReadinessCheck(check)
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
  const missingCredentialCount = checks.filter(check => check.status === 'missing' && readinessBlocking(check)).length
  const optionalMissingCredentialCount = checks.filter(check => check.status === 'missing' && !readinessBlocking(check)).length
  const presentCredentialCount = checks.filter(check => check.status === 'present').length
  const optionalPresentCredentialCount = checks.filter(check => check.status === 'present' && !readinessBlocking(check)).length
  return {
    ...readiness,
    status: missingCredentialCount
      ? 'missing_credentials_or_tokens'
      : presentCredentialCount ? 'credential_metadata_present' : readiness.status,
    checks,
    missingCredentialCount,
    optionalMissingCredentialCount,
    presentCredentialCount,
    optionalPresentCredentialCount,
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
  const missingRequiredChecks = allChecks.filter(check => check.status === 'missing' && readinessBlocking(check))
  const missingCredentialCount = missingRequiredChecks.length
  const optionalMissingCredentialCount = allChecks.filter(check => check.status === 'missing' && !readinessBlocking(check)).length
  const presentCredentialCount = allChecks.filter(check => check.status === 'present').length
  const optionalPresentCredentialCount = allChecks.filter(check => check.status === 'present' && !readinessBlocking(check)).length
  const unavailableCredentialCheckCount = allChecks.filter(check => check.status === 'keychain_check_unavailable').length
  const status = missingCredentialCount
    ? 'waiting_for_credentials_or_sessions'
    : presentCredentialCount ? 'credential_metadata_present' : 'readiness_commands_available'
  const missingLabels = missingRequiredChecks
    .map(check => check.label || check.checkId || `${check.source}/${check.account}`)
    .filter(Boolean)
    .slice(0, 3)
  const primaryNextAction = missingCredentialCount
    ? (
        missingRequiredChecks.length === 1 && missingRequiredChecks[0]?.checkId === 'myicor-mcp-oauth-token'
          ? `Authorize the read-only myICOR MCP OAuth token with \`${missingRequiredChecks[0].setupCommand}\`; newsletter source identity is already covered by the delegated ${SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT} mailbox.`
          : `Store or authorize the missing source-session credential(s): ${missingLabels.join(', ')}. Then rerun the readiness check.`
      )
    : prepQueue.primaryNextAction || 'Review the source-session prep queue before any live action.'

  return {
    ok: true,
    status,
    mode: 'metadata_only_source_session_readiness',
    defaultAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    counts: {
      actionGroupCount: hydratedGroups.length,
      checkCount: allChecks.length,
      credentialCheckCount: allChecks.filter(isCredentialReadinessCheck).length,
      missingCredentialCount,
      optionalMissingCredentialCount,
      presentCredentialCount,
      optionalPresentCredentialCount,
      unavailableCredentialCheckCount,
      runAllowedNowRows: number(prepQueue.counts?.runAllowedNowRows),
      prepRows: number(prepQueue.counts?.totalRows),
    },
    groups: hydratedGroups,
    primaryNextAction,
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
