#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import { readFoundationBuildLogRegistrySource } from '../lib/foundation-build-log-source.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  buildMyicorAuthGuardDogfoodProof,
} from '../lib/source-session-auth-guards.js'
import {
  SOURCE_SESSION_BROKER_APPROVAL_PATH,
  SOURCE_SESSION_BROKER_BACKLOG_ITEM,
  SOURCE_SESSION_BROKER_CARD_ID,
  SOURCE_SESSION_BROKER_CLOSEOUT_KEY,
  SOURCE_SESSION_BROKER_PLAN_PATH,
  SOURCE_SESSION_BROKER_SCRIPT_PATH,
  buildSourceSessionBrokerContractSnapshot,
  buildSourceSessionBrokerDogfoodProof,
  evaluateSourceSessionBrokerContract,
} from '../lib/source-session-broker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-source-session-broker'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function upsertLiveBacklogCard() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_SESSION_BROKER_SCRIPT_PATH,
    operation: `upsert ${SOURCE_SESSION_BROKER_CARD_ID} backlog card`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const client = await pool.connect()
  const card = SOURCE_SESSION_BROKER_BACKLOG_ITEM
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [
        card.id,
        card.title,
        card.team,
        card.lane,
        card.priority,
        card.rank,
        card.source,
        card.summary,
        card.whyItMatters,
        card.nextAction,
        card.statusNote,
        card.owner || 'Foundation Extractor',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (
          event_type, entity_table, entity_id, actor, summary, metadata
        )
        VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
      `,
      [
        card.id,
        ACTOR,
        `Upserted ${card.id} Source Session Broker live backlog card`,
        JSON.stringify({
          closeoutKey: SOURCE_SESSION_BROKER_CLOSEOUT_KEY,
          planRef: SOURCE_SESSION_BROKER_PLAN_PATH,
        }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function sourceContainsRawSecretPath(source = '') {
  return [
    /console\.log\s*\(\s*password\b/i,
    /process\.env\.[A-Z0-9_]*(PASSWORD|SECRET|TOKEN)/i,
    /writeFile\s*\([^)]*(password|secret|token)/i,
    /localStorage\.setItem\s*\([^)]*(password|secret|token)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  if (args.apply) await upsertLiveBacklogCard()

  const checks = []
  const [
    packageJson,
    brokerSource,
    proofScriptSource,
    credentialVaultSource,
    credentialCliSource,
    myicorMcpOauthSource,
    paidMapperSource,
    harlanSource,
    planSource,
    myicorSourceNote,
    seedSource,
    closeoutRegistrySource,
    approval,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-session-broker.js'),
    readRepoFile(SOURCE_SESSION_BROKER_SCRIPT_PATH),
    readRepoFile('lib/credential-vault.js'),
    readRepoFile('scripts/credentials-vault.mjs'),
    readRepoFile('scripts/myicor-mcp-oauth.mjs'),
    readRepoFile('scripts/run-supervised-paid-source-map.mjs'),
    readRepoFile('lib/harlan-auth-escalation-loop.js'),
    readRepoFile(SOURCE_SESSION_BROKER_PLAN_PATH),
    readRepoFile('docs/source-notes/myicro-training.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readFoundationBuildLogRegistrySource(repoRoot),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SOURCE_SESSION_BROKER_APPROVAL_PATH,
      cardId: SOURCE_SESSION_BROKER_CARD_ID,
    }),
  ])

  await initFoundationDb()
  let liveCard = null
  try {
    const [row] = await getBacklogItemsByIds([SOURCE_SESSION_BROKER_CARD_ID])
    liveCard = row || null
  } finally {
    await closeFoundationDb()
  }

  const snapshot = buildSourceSessionBrokerContractSnapshot()
  const evaluation = evaluateSourceSessionBrokerContract(snapshot)
  const dogfood = buildSourceSessionBrokerDogfoodProof()
  const myicorAuthGuardDogfood = buildMyicorAuthGuardDogfoodProof()
  const liveCardDone = liveCard?.lane === 'done'
  const closeoutRecordPresent = closeoutRegistrySource.includes(SOURCE_SESSION_BROKER_CLOSEOUT_KEY) &&
    closeoutRegistrySource.includes(SOURCE_SESSION_BROKER_CARD_ID)

  addCheck(
    checks,
    packageJson.scripts?.['process:source-session-broker-check'] === `node --env-file-if-exists=.env ${SOURCE_SESSION_BROKER_SCRIPT_PATH}`,
    'package exposes focused Source Session Broker proof',
    packageJson.scripts?.['process:source-session-broker-check'] || 'missing',
  )
  addCheck(
    checks,
    approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8,
    'approval file validates for Source Session Broker plan',
    approval.failures?.map(item => item.check).join(', ') || SOURCE_SESSION_BROKER_APPROVAL_PATH,
  )
  addCheck(
    checks,
    evaluation.ok,
    'broker contract contains credential, profile, native connector, auth-needed, and fail-closed layers',
    evaluation.findings.map(item => `${item.check}:${item.detail}`).join(', ') || 'ok',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proves session-ready, MyICOR Google SSO/no-signup guard, native MCP, missing credential, MFA, free signup, forbidden action, and no-boundary cases',
    dogfood.cases.filter(item => !item.ok).map(item => item.name).join(', ') || 'all dogfood cases passed',
  )
  addCheck(
    checks,
    myicorAuthGuardDogfood.ok &&
      myicorAuthGuardDogfood.cases.some(testCase => testCase.name === 'start_free_signup_branch_fails_closed') &&
      myicorAuthGuardDogfood.cases.some(testCase => testCase.name === 'google_number_match_emits_auth_needed') &&
      myicorAuthGuardDogfood.cases.some(testCase => testCase.name === 'wrong_google_account_fails_closed'),
    'MyICOR browser guard dogfood catches signup/profile branch, Google human verification, and wrong account',
    myicorAuthGuardDogfood.cases.map(testCase => `${testCase.name}:${testCase.result.reason}`).join(', '),
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'try the existing isolated browser profile first',
      'macOS Keychain',
      'auth_needed',
      'wait/resume/fail-closed',
      'native read-only connector/MCP first',
      'myICOR',
      'lessons, articles, podcast transcripts',
      'Tool Stack',
      'Growth Assignment progress',
      'Workstreams',
      'ai@bensoncrew.ca',
      'team-member systems',
      'stock trading',
    ]),
    'plan captures Steve closed-loop login, MyICOR MCP, source identity, and high-risk action boundaries',
    SOURCE_SESSION_BROKER_PLAN_PATH,
  )
  addCheck(
    checks,
    Boolean(liveCard) &&
      liveCard.id === SOURCE_SESSION_BROKER_CARD_ID &&
      liveCard.priority === 'P0' &&
      liveCard.lane !== 'done' &&
      includesAll(`${liveCard.summary} ${liveCard.nextAction} ${liveCard.statusNote}`, [
        'isolated browser profiles',
        'macOS Keychain',
        'auth-needed',
        'fail-closed',
        'ai@bensoncrew.ca',
      ]),
    'live backlog card exists and keeps Source Session Broker open as P0 implementation work',
    liveCard ? `${liveCard.id}/${liveCard.lane}/${liveCard.priority}` : 'missing; run --apply',
  )
  addCheck(
    checks,
    seedSource.includes(SOURCE_SESSION_BROKER_CARD_ID) &&
      seedSource.includes('closed-loop source session broker'),
    'seed backlog contains Source Session Broker card truth',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    liveCardDone ? closeoutRecordPresent : true,
    'closeout registry state matches Source Session Broker live lane',
    liveCardDone
      ? (closeoutRecordPresent
          ? `${SOURCE_SESSION_BROKER_CLOSEOUT_KEY} found in split closeout registry`
          : `${SOURCE_SESSION_BROKER_CLOSEOUT_KEY} missing while live card is done`)
      : (closeoutRecordPresent
          ? `${SOURCE_SESSION_BROKER_CLOSEOUT_KEY} already present while card is ${liveCard?.lane || 'missing'}`
          : `live card is ${liveCard?.lane || 'missing'}; closeout record is required only when done`),
  )
  addCheck(
    checks,
    credentialCliSource.includes('source:add') &&
      credentialCliSource.includes('source:status') &&
      credentialCliSource.includes('source:delete') &&
      !credentialCliSource.includes('readKeychainPassword'),
    'credential CLI has source add/status/delete and does not expose raw password retrieval',
    'scripts/credentials-vault.mjs',
  )
  addCheck(
    checks,
      packageJson.scripts?.['myicor:mcp-preflight'] === 'node --env-file-if-exists=.env scripts/myicor-mcp-oauth.mjs preflight' &&
      packageJson.scripts?.['myicor:mcp-authorize'] === 'node --env-file-if-exists=.env scripts/myicor-mcp-oauth.mjs authorize' &&
      packageJson.scripts?.['myicor:mcp-authorize-agent'] === 'node --env-file-if-exists=.env scripts/myicor-mcp-oauth.mjs authorize-agent' &&
      packageJson.scripts?.['myicor:mcp-tools'] === 'node --env-file-if-exists=.env scripts/myicor-mcp-oauth.mjs tools' &&
      packageJson.scripts?.['myicor:mcp-call'] === 'node --env-file-if-exists=.env scripts/myicor-mcp-oauth.mjs call' &&
      myicorMcpOauthSource.includes('https://mcp.myicor.com/mcp') &&
      myicorMcpOauthSource.includes('https://app.myicor.com/.well-known/oauth-authorization-server') &&
      myicorMcpOauthSource.includes('EXISTING_GOOGLE_SSO_ACCOUNT') &&
      myicorMcpOauthSource.includes('WRONG_BRANCH_STOP_TEXT') &&
      myicorMcpOauthSource.includes('driveMyicorOauthAgent') &&
      myicorMcpOauthSource.includes('wrong_signup_branch_recovered_to_login') &&
      myicorMcpOauthSource.includes('google_sso_password_missing_from_keychain') &&
      myicorMcpOauthSource.includes("DEFAULT_SCOPE = 'mcp:read mcp:tools mcp:progress mcp:inner-circle'") &&
      !/DEFAULT_SCOPE\s*=\s*['"][^'"]*mcp:admin/i.test(myicorMcpOauthSource) &&
      myicorMcpOauthSource.includes('storeKeychainPassword') &&
      myicorMcpOauthSource.includes("method: 'tools/call'") &&
      myicorMcpOauthSource.includes("grant_type: 'refresh_token'") &&
      myicorMcpOauthSource.includes('rawSecretPrinted: false'),
    'MyICOR MCP OAuth helper is registered, read-scope only, refresh-capable, callable, and Keychain-backed',
    'scripts/myicor-mcp-oauth.mjs',
  )
  addCheck(
    checks,
    myicorSourceNote.includes('https://mcp.myicor.com/mcp') &&
      myicorSourceNote.includes('https://app.myicor.com/.well-known/oauth-authorization-server') &&
      myicorSourceNote.includes('https://mcp.myicor.com/sse') &&
      myicorSourceNote.includes('returned `404`') &&
      myicorSourceNote.includes('not `mcp:admin`') &&
      myicorSourceNote.includes('wrong_signup_branch') &&
      myicorSourceNote.includes('auth_needed'),
    'MyICOR source note records current MCP endpoint and stale SSE route',
    'docs/source-notes/myicro-training.md',
  )
  addCheck(
    checks,
      paidMapperSource.includes('buildKeychainSecretRef') &&
      paidMapperSource.includes('useKeychainLogin') &&
      paidMapperSource.includes('auth-needed.json') &&
      paidMapperSource.includes('evaluateMyicorBrowserAuthSurface') &&
      paidMapperSource.includes('SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD') &&
      !paidMapperSource.includes('form_login_keychain') &&
      !paidMapperSource.includes('google_password_field_not_found_or_mfa_required') &&
      paidMapperSource.includes('RISKY_URL_PATTERN') &&
      paidMapperSource.includes('member|members|invite|create') &&
      paidMapperSource.includes('local_only_under_.openclaw_not_tracked_repo'),
    'paid-source mapper uses metadata-only session checks, MyICOR Google SSO/no-signup guards, auth-needed reports, risky URL/member blocking, and local-only artifacts',
    'scripts/run-supervised-paid-source-map.mjs',
  )
  addCheck(
    checks,
    credentialVaultSource.includes('readKeychainPassword') &&
      credentialVaultSource.includes('rawSecretVisibleToAgent: false') &&
      !sourceContainsRawSecretPath(`${brokerSource}\n${credentialVaultSource}\n${credentialCliSource}\n${paidMapperSource}`),
    'secret handling remains metadata-only outside broker-only retrieval',
    'raw secret print/write/env paths absent',
  )
  addCheck(
    checks,
    harlanSource.includes('buildAuthNeededEvent') &&
      harlanSource.includes('waiting_for_done') &&
      harlanSource.includes('silent_reverify_before_resume') &&
      harlanSource.includes('fail_closed') &&
      brokerSource.includes('HARLAN_AUTH_ESCALATION_LOOP_CARD_ID') &&
      paidMapperSource.includes('authorized browser profile is not logged in or hit a login/MFA wall'),
    'auth-needed loop is referenced and preserves wait, reverify, and fail-closed behavior',
    'lib/harlan-auth-escalation-loop.js',
  )
  addCheck(
    checks,
    proofScriptSource.includes('assertProcessCheckWriteAllowed') &&
      proofScriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.apply') &&
      proofScriptSource.includes('INSERT INTO backlog_items') &&
      !/\breadKeychainPassword\s*\(/.test(proofScriptSource),
    'focused proof writes live backlog only under --apply and never reads raw secrets',
    SOURCE_SESSION_BROKER_SCRIPT_PATH,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    applied: args.apply,
    cardId: SOURCE_SESSION_BROKER_CARD_ID,
    closeoutKey: SOURCE_SESSION_BROKER_CLOSEOUT_KEY,
    liveCard: liveCard ? {
      id: liveCard.id,
      lane: liveCard.lane,
      priority: liveCard.priority,
    } : null,
    dogfoodCases: dogfood.cases,
    rawSecretPrinted: false,
    externalActionStarted: false,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source Session Broker proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error('Source Session Broker proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
