#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  initFoundationDb,
  listSourceCrawlItems,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-db.js'
import {
  buildYoutubeHandoffEvidenceFromReports,
} from '../lib/dev-team-hub.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffQueue,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
  CREATOR_NEWSLETTER_SOURCE,
  MYICOR_GOOGLE_SSO_SOURCE,
  MYICOR_MCP_OAUTH_ACCOUNT,
  MYICOR_MCP_OAUTH_SOURCE,
  SOURCE_SESSION_READINESS_SCRIPT_PATH,
  buildLiveSourceSessionReadinessReadback,
  buildSourceSessionActionGroupReadiness,
} from '../lib/source-session-readiness-readback.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
} from '../lib/source-session-broker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: detail || '' })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function sourceValueGraderFromBundle(bundle = {}) {
  const report = bundle.report || bundle
  return report?.structuredOutputJson || report?.structured_output_json || {}
}

async function loadLiveSourceSessionPrepQueue() {
  await initFoundationDb()
  try {
    const [
      youtubeFullWatchReports,
      sourceValueGraderBundle,
      sourceGodModeHandoffRunItems,
    ] = await Promise.all([
      listYoutubeFullWatchReportArtifacts({ limit: 800 }),
      getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
      listSourceCrawlItems({
        targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
        limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
        order: 'desc',
      }),
    ])
    const handoffEvidence = buildYoutubeHandoffEvidenceFromReports(youtubeFullWatchReports || [])
    const queue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence,
      rowLimit: 0,
      sourceValueGrader: sourceValueGraderFromBundle(sourceValueGraderBundle),
      runItems: sourceGodModeHandoffRunItems,
    })
    return queue.sourceSessionPrepQueue || {}
  } finally {
    await closeFoundationDb()
  }
}

async function buildFixtureReadiness() {
  const prepQueue = {
    counts: {
      totalRows: 3,
      runAllowedNowRows: 0,
    },
    actionGroups: [
      {
        groupId: 'fixture-free-source',
        phase: 'free_source_identity_session_needed',
        label: 'Free source session setup',
        totalRows: 1,
        clusterCount: 1,
        account: 'ai@bensoncrew.ca',
        runner: 'skool:free-god-mode',
        topHosts: ['skool.com'],
        readiness: buildSourceSessionActionGroupReadiness({
          phase: 'free_source_identity_session_needed',
          rows: [{ host: 'skool.com', url: 'https://www.skool.com/chase-ai-community/about' }],
        }),
      },
      {
        groupId: 'fixture-newsletter',
        phase: 'newsletter_signup_lane_needed',
        label: 'Newsletter intake dry runs',
        totalRows: 1,
        clusterCount: 1,
        account: 'ai@bensoncrew.ca',
        runner: 'newsletter:intake',
        topHosts: ['aihero.dev'],
        readiness: buildSourceSessionActionGroupReadiness({
          phase: 'newsletter_signup_lane_needed',
          rows: [{ host: 'aihero.dev', url: 'https://www.aihero.dev/newsletter' }],
        }),
      },
      {
        groupId: 'fixture-paid-auth',
        phase: 'paid_or_auth_packet_needed',
        label: 'Paid/auth packet approval',
        totalRows: 1,
        clusterCount: 1,
        account: 'approved_paid_account',
        runner: 'source-session-broker',
        topHosts: ['myicor.com'],
        readiness: buildSourceSessionActionGroupReadiness({
          phase: 'paid_or_auth_packet_needed',
          rows: [{ host: 'myicor.com', url: 'https://myicor.com/' }],
        }),
      },
    ],
  }
  return buildLiveSourceSessionReadinessReadback({
    prepQueue,
    keychainExists: async ({ source, account }) =>
      source === 'skool' ||
      (source === MYICOR_GOOGLE_SSO_SOURCE && account === SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT),
  })
}

function outputContainsRawSecret(value = {}) {
  const serialized = JSON.stringify(value)
  return /synthetic-password|rawPassword|password"\s*:|"access_token"\s*:|"refresh_token"\s*:|"token"\s*:/i.test(serialized)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    readinessSource,
    myicorMcpSource,
    authResumeSource,
    handoffSource,
    devPageSource,
    devCssSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-session-readiness-readback.js'),
    readRepoFile('scripts/myicor-mcp-oauth.mjs'),
    readRepoFile('lib/source-session-auth-resume-packet.js'),
    readRepoFile('lib/source-god-mode-youtube-handoff.js'),
    readRepoFile('public/dev.js'),
    readRepoFile('public/dev.css'),
  ])

  const [fixtureReadiness, livePrepQueue] = await Promise.all([
    buildFixtureReadiness(),
    loadLiveSourceSessionPrepQueue(),
  ])
  const liveReadiness = await buildLiveSourceSessionReadinessReadback({ prepQueue: livePrepQueue })
  const fixtureChecks = fixtureReadiness.groups.flatMap(group => list(group.readiness?.checks))
  const liveChecks = liveReadiness.groups.flatMap(group => list(group.readiness?.checks))
  const liveFreeCommunityPrepRows = Number(livePrepQueue.counts?.freeCommunityRows || 0)

  addCheck(
    checks,
    packageJson.scripts?.['process:source-session-readiness-check'] === `node --env-file-if-exists=.env ${SOURCE_SESSION_READINESS_SCRIPT_PATH}`,
    'package exposes focused source-session readiness proof',
    packageJson.scripts?.['process:source-session-readiness-check'] || 'missing',
  )
  addCheck(
    checks,
    readinessSource.includes('keychainItemExists') && !readinessSource.includes('readKeychainPassword'),
    'readiness module checks Keychain metadata only and never reads raw passwords/tokens',
    'lib/source-session-readiness-readback.js',
  )
  addCheck(
    checks,
    readinessSource.includes(MYICOR_GOOGLE_SSO_SOURCE) &&
      readinessSource.includes('myicor-google-sso-credential') &&
      readinessSource.includes('keychain_optional_metadata') &&
      readinessSource.includes('blocksReadiness'),
    'readiness module distinguishes myICOR Google SSO credential, MCP token, and optional ignored rows',
    'lib/source-session-readiness-readback.js',
  )
  addCheck(
    checks,
    readinessSource.includes('source_identity_mailbox_metadata') &&
      readinessSource.includes(CREATOR_NEWSLETTER_SOURCE) &&
      readinessSource.includes(CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID) &&
      readinessSource.includes('googleDelegatedMailboxStatusCommand') &&
      !readinessSource.includes("source:add --source=creator-newsletters"),
    'readiness module treats creator newsletter identity as delegated mailbox metadata, not a fake password',
    'lib/source-session-readiness-readback.js',
  )
  addCheck(
    checks,
    myicorMcpSource.includes('agentAuthorizeCommand') &&
      myicorMcpSource.includes('myicor:mcp-authorize-agent') &&
      myicorMcpSource.includes('manualAuthorizeCommand') &&
      myicorMcpSource.includes('googleCredentialStatusCommand') &&
      authResumeSource.includes("command('myicor:mcp-authorize-agent'") &&
      authResumeSource.includes('runs_agent_driven_readonly_myicor_oauth_and_stops_for_human_verification'),
    'myICOR missing-token and auth-resume guidance points to agent-driven OAuth first',
    'scripts/myicor-mcp-oauth.mjs + lib/source-session-auth-resume-packet.js',
  )
  addCheck(
    checks,
    handoffSource.includes('buildSourceSessionActionGroupReadiness') &&
      handoffSource.includes('readinessCheckCount') &&
      handoffSource.includes('credentialReadinessCheckCount'),
    'YouTube handoff prep action groups expose readiness checks and counts',
    'lib/source-god-mode-youtube-handoff.js',
  )
  addCheck(
    checks,
    devPageSource.includes('renderSourceSessionReadiness') &&
      devPageSource.includes('yt-session-readiness') &&
      devCssSource.includes('.yt-session-readiness'),
    'Dev page renders source-session readiness without hiding it in raw rows',
    'public/dev.js + public/dev.css',
  )
  addCheck(
    checks,
    fixtureReadiness.ok === true &&
      fixtureReadiness.counts.actionGroupCount === 3 &&
      fixtureReadiness.counts.checkCount >= 6 &&
      fixtureReadiness.counts.presentCredentialCount >= 1 &&
      fixtureReadiness.counts.missingCredentialCount >= 1 &&
      fixtureChecks.some(check => check.checkId === 'skool-free-source-identity' && check.status === 'present') &&
      fixtureChecks.some(check => check.checkId === 'newsletter-source-identity' && check.kind === 'source_identity_mailbox_metadata' && check.status === 'delegated_mailbox_ready' && check.source === CREATOR_NEWSLETTER_SOURCE && check.secretRef === CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID && check.blocksReadiness === false) &&
      fixtureChecks.some(check => check.checkId === 'myicor-google-sso-credential' && check.status === 'present' && check.account === SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT) &&
      fixtureChecks.some(check => check.checkId === 'myicor-mcp-oauth-token' && check.status === 'missing') &&
      fixtureChecks.some(check => check.checkId === 'myicor-google-sso-free-account-row-ignored' && check.account === SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT && check.blocksReadiness === false) &&
      fixtureChecks.some(check => check.checkId === 'myicor-wrong-signup-branch-guard' && check.status === 'guard_required') &&
      fixtureChecks.some(check => check.checkId === 'myicor-google-sso-mfa-loop' && check.status === 'auth_needed_loop_required') &&
      fixtureChecks.some(check => /credentials:vault -- source:status/.test(check.statusCommand || '')) &&
      fixtureChecks.some(check => /source:session-probe/.test(check.statusCommand || '') && /skool_free_community/.test(check.statusCommand || '')) &&
      fixtureChecks.some(check => /source:session-probe/.test(check.statusCommand || '') && /paid_course_training_platforms/.test(check.statusCommand || '') && /--url=https:\/\/myicor\.com\//.test(check.statusCommand || '')) &&
      fixtureChecks.some(check => /myicor:mcp-preflight/.test(check.statusCommand || '')) &&
      fixtureChecks.every(check => check.rawSecretPrinted === false && check.externalActionStarted === false),
    'dogfood fixture proves present/missing credentials, session-probe commands, myICOR MCP command, and no external/secret side effects',
    JSON.stringify(fixtureReadiness.counts),
  )
  addCheck(
    checks,
    liveReadiness.ok === true &&
      liveReadiness.mode === 'metadata_only_source_session_readiness' &&
      Number(liveReadiness.counts.actionGroupCount || 0) > 0 &&
      Number(liveReadiness.counts.checkCount || 0) > 0 &&
      Number(liveReadiness.counts.prepRows || 0) > 0 &&
      liveChecks.some(check => /credentials:vault -- source:status/.test(check.statusCommand || '')) &&
      (liveFreeCommunityPrepRows === 0 || liveChecks.some(check => /source:session-probe/.test(check.statusCommand || '') && /skool_free_community/.test(check.statusCommand || ''))) &&
      liveChecks.some(check => /source:session-probe/.test(check.statusCommand || '') && /paid_course_training_platforms/.test(check.statusCommand || '') && /myicor\.com/.test(check.statusCommand || '')) &&
      liveChecks.some(check => /newsletter:intake/.test(check.statusCommand || '')) &&
      liveChecks.some(check => check.checkId === 'newsletter-source-identity' && check.kind === 'source_identity_mailbox_metadata' && check.status === 'delegated_mailbox_ready' && check.source === CREATOR_NEWSLETTER_SOURCE && check.secretRef === CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID && check.blocksReadiness === false && /google:health/.test(check.statusCommand || '')) &&
      liveChecks.some(check => check.checkId === 'myicor-google-sso-credential' && check.source === MYICOR_GOOGLE_SSO_SOURCE && check.account === SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT) &&
      liveChecks.some(check => check.checkId === 'myicor-mcp-oauth-token' && check.source === MYICOR_MCP_OAUTH_SOURCE && check.account === MYICOR_MCP_OAUTH_ACCOUNT) &&
      liveChecks.some(check => check.checkId === 'myicor-google-sso-free-account-row-ignored' && check.blocksReadiness === false) &&
      liveChecks.some(check => check.checkId === 'myicor-wrong-signup-branch-guard') &&
      liveChecks.some(check => check.checkId === 'myicor-google-sso-mfa-loop') &&
      liveChecks.every(check => check.rawSecretPrinted === false && check.externalActionStarted === false),
    'live source-session prep has metadata-only readiness checks and source-session probe commands for the parked source expansion queue',
    JSON.stringify(liveReadiness.counts),
  )
  addCheck(
    checks,
    liveReadiness.rawSecretPrinted === false &&
      liveReadiness.externalActionStarted === false &&
      liveReadiness.sideEffects?.rawSecretRead === false &&
      liveReadiness.sideEffects?.externalWriteStarted === false &&
      liveReadiness.sideEffects?.submittedForm === false &&
      liveReadiness.sideEffects?.openedBrowser === false &&
      liveReadiness.sideEffects?.credentialMutated === false &&
      !outputContainsRawSecret(liveReadiness) &&
      !outputContainsRawSecret(fixtureReadiness),
    'readiness proof does not read raw secrets, submit forms, open auth, mutate credentials, or leak token-shaped values',
    liveReadiness.status,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    scriptPath: SOURCE_SESSION_READINESS_SCRIPT_PATH,
    liveReadiness: {
      status: liveReadiness.status,
      counts: liveReadiness.counts,
      primaryNextAction: liveReadiness.primaryNextAction,
      groups: liveReadiness.groups.map(group => ({
        phase: group.phase,
        label: group.label,
        totalRows: group.totalRows,
        checks: list(group.readiness?.checks).map(check => ({
          checkId: check.checkId,
          kind: check.kind,
          status: check.status,
          source: check.source,
          account: check.account,
          statusCommand: check.statusCommand,
          setupCommand: check.setupCommand,
          blocksReadiness: check.blocksReadiness,
          rawSecretPrinted: check.rawSecretPrinted,
          externalActionStarted: check.externalActionStarted,
        })),
      })),
    },
    rawSecretPrinted: false,
    externalActionStarted: false,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source session readiness proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Live readiness: ${liveReadiness.status} ${JSON.stringify(liveReadiness.counts)}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error('Source session readiness proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
