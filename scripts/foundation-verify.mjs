#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import process from 'node:process'
import { getGroupedSourceSystems, getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'
import {
  closeFoundationDb,
  getBacklogSeedDriftSnapshot,
  getFoundationDbConstraintAudit,
  getSharedCommunicationProcessingProvenanceGaps,
  getStaleLlmCalls,
  initFoundationDb,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function line(label, value = '') {
  console.log(value ? `${label}: ${value}` : label)
}

function pass(check, detail = '') {
  console.log(`PASS ${check}${detail ? ` -> ${detail}` : ''}`)
}

function fail(check, detail = '') {
  console.error(`FAIL ${check}${detail ? ` -> ${detail}` : ''}`)
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function runHealthScript(scriptName) {
  const { stdout, stderr } = await execFile('npm', ['run', '-s', scriptName], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024,
  })
  return (stdout || stderr).trim()
}

function ensure(checks, condition, check, detail) {
  if (!condition) {
    checks.push({ ok: false, check, detail })
    return
  }
  checks.push({ ok: true, check, detail })
}

function findSourceById(sources, sourceId) {
  return (sources || []).find(source => source.sourceId === sourceId || source.id === sourceId) || null
}

function includesAll(text, patterns) {
  return patterns.every(pattern => text.includes(pattern))
}

async function collectCodeFiles(directory) {
  const fullDirectory = path.join(repoRoot, directory)
  const entries = await fs.readdir(fullDirectory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectCodeFiles(relativePath))
      continue
    }
    if (/\.(mjs|js)$/.test(entry.name)) files.push(relativePath)
  }
  return files
}

const directModelHostPatterns = [
  'https://api.openai.com',
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
]

const allowedDirectModelHostFiles = new Set([
  'lib/llm-router.js',
])

const allowedDirectModelHostAuditFiles = new Set([
  'scripts/foundation-verify.mjs',
])

async function auditDirectModelHostUsage() {
  const codeFiles = [
    ...await collectCodeFiles('lib'),
    ...await collectCodeFiles('scripts'),
  ]
  const offenders = []
  for (const relativePath of codeFiles) {
    if (allowedDirectModelHostFiles.has(relativePath)) continue
    if (allowedDirectModelHostAuditFiles.has(relativePath)) continue
    const text = await readRepoFile(relativePath)
    const matchedHosts = directModelHostPatterns.filter(host => text.includes(host))
    if (matchedHosts.length) offenders.push(`${relativePath} (${matchedHosts.join(', ')})`)
  }
  return offenders
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = typeof args.baseUrl === 'string' ? args.baseUrl : 'http://localhost:3000'
  const checks = []

  line('Foundation verification')
  line('  Base URL', baseUrl)
  line('  Repo root', repoRoot)

  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const groupedSourceSystems = getGroupedSourceSystems()
  const ownersContract = findSourceById(sourceContracts, 'SRC-OWNERS-001')
  const financeContract = findSourceById(sourceContracts, 'SRC-FINANCE-001')
  const freedomCommunityContract = findSourceById(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001')
  await initFoundationDb()
  const backlogSeedDrift = await getBacklogSeedDriftSnapshot({ limit: 10 })
  const dbConstraintAudit = await getFoundationDbConstraintAudit({
    sourceIds: sourceContracts.map(source => source.sourceId || source.id).filter(Boolean),
    limit: 10,
  })

  ensure(
    checks,
    ownersContract?.status === 'Signed Off' && ownersContract?.validation === 'Signed Off',
    'source contracts: SRC-OWNERS-001 is signed off',
    ownersContract ? `${ownersContract.status} / ${ownersContract.validation}` : 'missing',
  )
  ensure(
    checks,
    financeContract?.status === 'Current reality captured' && financeContract?.validation === 'Signed Off For Current Reality',
    'source contracts: SRC-FINANCE-001 is signed off for current reality',
    financeContract ? `${financeContract.status} / ${financeContract.validation}` : 'missing',
  )
  ensure(
    checks,
    ['Split Cal', 'Agent Splits', 'Listings and Conditional Deals', 'Sales & Deposit', 'Goal & KPI Calculator', 'CI Report'].every(tab => ownersContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-OWNERS-001 exposes signed-off tab coverage',
    ownersContract?.signedOffTabs?.join(', ') || 'missing',
  )
  ensure(
    checks,
    ['Monthly Budget', 'Budget Original', 'Monthly Actuals (Roll Up)', 'Annual Actuals (Roll Up)', 'Annual Budget (Roll Up)', 'Unspent -L3M + Actual Helper'].every(tab => financeContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-FINANCE-001 exposes signed-off finance tab coverage',
    financeContract?.signedOffTabs?.join(', ') || 'missing',
  )
  ensure(
    checks,
    ownersContract?.verifiedNonSourceTabs?.some(item => item.name === 'Lists' && /IMPORTRANGE/.test(item.reason || '') && /SRC-OWNERS-LISTS-001/.test(item.reason || '')),
    'source contracts: Owners Lists mirror explains non-source sign-off boundary',
    JSON.stringify(ownersContract?.verifiedNonSourceTabs || []),
  )
  ensure(
    checks,
    freedomCommunityContract?.signedOffTabs?.includes('Data Entry - BCrew Team/Community · G:O Community tracker'),
    'source contracts: Freedom units expose signed-off range coverage',
    freedomCommunityContract?.signedOffTabs?.join(', ') || 'missing',
  )

  const sourceRegistry = await readRepoFile('docs/source-registry.md')
  const docsIndexSource = await readRepoFile('docs/INDEX.md')
  const docsReadmeSource = await readRepoFile('docs/README.md')
  const currentPlan = await readRepoFile('docs/rebuild/current-plan.md')
  const currentState = await readRepoFile('docs/rebuild/current-state.md')
  const systemStrategy = await readRepoFile('docs/system-strategy.md')
  const packageSource = await readRepoFile('package.json')
  const agentsSource = await readRepoFile('AGENTS.md')
  const usersDoc = await readRepoFile('docs/users/README.md')
  const steveDoc = await readRepoFile('docs/users/steve.md')
  const agentModelDoc = await readRepoFile('docs/agents/README.md')
  const harlanDoc = await readRepoFile('docs/agents/harlan.md')
  const crewbertDoc = await readRepoFile('docs/agents/crewbert.md')
  const personalAgentOnboardingDoc = await readRepoFile('docs/agents/personal-agent-onboarding.md')
  const foundationHtmlSource = await readRepoFile('public/foundation.html')
  const foundationUiSource = await readRepoFile('public/foundation.js')
  const opsHtmlSource = await readRepoFile('public/ops.html')
  const opsUiSource = await readRepoFile('public/ops.js')
  const loginHtmlSource = await readRepoFile('public/login.html')
  const loginUiSource = await readRepoFile('public/login.js')
  const agentFeedbackHtmlSource = await readRepoFile('public/agent-feedback.html')
  const agentFeedbackUiSource = await readRepoFile('public/agent-feedback.js')
  const docUiSource = await readRepoFile('public/doc.js')
  const strategicExecutionUiSource = await readRepoFile('public/strategic-execution.js')
  const strategyExportUiSource = await readRepoFile('public/strategy-export.js')
  const serverSource = await readRepoFile('server.js')
  const appAuthSource = await readRepoFile('lib/app-auth.js')
  const foundationJobsSource = await readRepoFile('lib/foundation-jobs.js')
  const agentFeedbackSource = await readRepoFile('lib/agent-feedback.js')
  const agentFeedbackEmailSource = await readRepoFile('lib/agent-feedback-email.js')
  const agentFeedbackClickUpSource = await readRepoFile('lib/agent-feedback-clickup.js')
  const agentRosterReviewSource = await readRepoFile('lib/agent-roster-review.js')
  const googleDelegatedSource = await readRepoFile('lib/google-delegated.js')
  const llmRouterSource = await readRepoFile('lib/llm-router.js')
  const foundationWorkerSource = await readRepoFile('scripts/foundation-worker.mjs')
  const extractionControlSeedSource = await readRepoFile('scripts/seed-extraction-control.mjs')
  const extractionTargetSource = await readRepoFile('scripts/run-extraction-target.mjs')
  const videoInventorySource = await readRepoFile('scripts/inventory-video-links.mjs')
  const driveContentExtractionSource = await readRepoFile('scripts/extract-drive-content.mjs')
  const driveLinkInventorySource = await readRepoFile('scripts/inventory-drive-linked-files.mjs')
  const strategyEvidencePacketSource = await readRepoFile('scripts/generate-strategy-evidence-packet.mjs')
  const ownersSourceNote = await readRepoFile('docs/source-notes/owners-dashboard.md')
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const sharedCandidateExtractionSource = await readRepoFile('lib/shared-candidate-extraction.js')
  const directModelHostOffenders = await auditDirectModelHostUsage()

  ensure(
    checks,
    includesAll(sourceRegistry, ['### Signed Off Validation Units', '`SRC-OWNERS-001`', 'Signed Off | 2026-04-16']),
    'docs/source-registry.md reflects Owners sign-off',
    'signed-off unit and dated table row present',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['`SRC-FINANCE-001`', 'Signed Off For Current Reality | 2026-04-20']),
    'docs/source-registry.md reflects finance current-reality sign-off',
    'finance row present with current-reality signoff status',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['### Freedom Sheet Signed-Off Range Coverage', 'Data Entry - BCrew Team/Community · G:O Community tracker', 'Benson Crew Bhag Builder']),
    'docs/source-registry.md reflects Freedom signed-off range coverage',
    'Freedom range coverage section present',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['### Owners Dashboard Signed-Off Tab Coverage', 'Split Cal', 'Annual Budget (Roll Up)', 'Unspent -L3M + Actual Helper', 'SRC-OWNERS-LISTS-001']),
    'docs/source-registry.md reflects Owners signed-off tab coverage',
    'Owners tab coverage section present',
  )
  ensure(
    checks,
    includesAll(currentState, ['Unspent -L3M + Actual Helper', 'IMPORTRANGE', 'SRC-OWNERS-LISTS-001']),
    'docs/rebuild/current-state.md reflects helper and mirror source boundaries',
    'current state explains finance helper coverage and Owners Lists mirror boundary',
  )
  ensure(
    checks,
    includesAll(systemStrategy, ['Systems Layer', 'operating bundles', 'source contracts', 'runtime jobs', 'Doctrine and the rebuild plan are governed, not frozen']) &&
      includesAll(currentPlan, [
        'Locked doctrine means current operating default, not permanent dogma',
        'Foundation Systems page: 12 major operating systems',
        'KPI/Supabase read rules are closed for `SOURCE-010`',
        'Ops Hub v1',
        'daily Gmail attachment extraction',
        'daily YouTube subtitle transcript extraction',
        'FOUNDATION-SWEEP-001',
      ]) &&
      includesAll(currentPlan, ['Overview gives the command order', 'live Backlog owns task status', 'Rebuild Plan explains doctrine']) &&
      includesAll(currentState, ['Overview gives the command order', 'live Backlog owns task status', 'Current command order']) &&
      includesAll(agentsSource, ['Foundation priority as an operating guardrail', 'Overview is the command order', 'live Backlog is task truth']) &&
      foundationHtmlSource.includes('data-section="system-strategy">Doctrine</a>') &&
      foundationHtmlSource.includes('data-section="rebuild-plan">Rebuild Plan</a>') &&
      !foundationHtmlSource.includes('found-nav-item found-nav-item-sub" href="#rebuild-plan"'),
    'system strategy and rebuild plan reflect current Foundation architecture',
    'System Strategy names the Systems Layer, Rebuild Plan names Systems page / SOURCE-010 closeout / Ops Hub v1 / extraction slices, priority hierarchy is documented, and nav treats Doctrine + Rebuild Plan as peer pages',
  )
  ensure(
    checks,
    foundationHtmlSource.includes('<div class="found-nav-label">People / Agents</div>') &&
      foundationHtmlSource.includes('data-section="users">People Overview</a>') &&
      foundationHtmlSource.includes('found-nav-item found-nav-item-sub" href="#user-steve"') &&
      foundationHtmlSource.includes('data-section="agents">Agent Model</a>') &&
      foundationHtmlSource.includes('found-nav-item found-nav-item-sub" href="#agent-harlan"') &&
      foundationHtmlSource.includes('found-nav-item found-nav-item-sub" href="#agent-crewbert"') &&
      !foundationHtmlSource.includes('<div class="found-nav-subgroup">Users</div>') &&
      !foundationHtmlSource.includes('<div class="found-nav-subgroup">Agents</div>') &&
      [usersDoc, steveDoc, agentModelDoc, harlanDoc, crewbertDoc, personalAgentOnboardingDoc].every(source => source.includes('Last reviewed: 2026-04-26') && source.includes('Update Trigger')) &&
      includesAll(agentModelDoc, ['Personal Agent Onboarding', 'personal profile', 'daily nugget']) &&
      includesAll(harlanDoc, ['personal profile', 'daily nugget', 'AGENT-010']) &&
      includesAll(personalAgentOnboardingDoc, ['AGENT-010', 'personal profile', '`ME.md` is only a working label', 'daily nugget', 'old BCrew-Buddy', 'Harlan Pilot']),
    'People / Agents nav and docs stay clear and review-marked',
    'People / Agents nav uses one clean child indent, docs have review/update triggers, and personal-agent onboarding doctrine is captured',
  )
  ensure(
    checks,
    includesAll(ownersSourceNote, ['owner sign-off completed on `2026-04-16`', 'validated through Column `CB`']),
    'owners source note records sign-off and scope boundary',
    'owner sign-off note and CB boundary present',
  )
  ensure(
    checks,
    docsIndexSource.includes('Generated at:') &&
      docsIndexSource.includes('| File | Date | Category | Status | Promoted To | Words | Value |') &&
      !docsIndexSource.includes('active-reference') &&
      docsIndexSource.includes('| [rebuild-decisions.md](rebuild-decisions.md) | - | foundation | supporting-truth |') &&
      !docsReadmeSource.includes('10. [`rebuild-decisions.md`'),
    'docs authority index separates active truth from evidence',
    'generated index has promoted-to column, no active-reference status, and rebuild decisions are not read-first active truth',
  )
  ensure(
    checks,
    directModelHostOffenders.length === 0,
    'direct model/transcription host calls stay behind approved adapters',
    directModelHostOffenders.length
      ? directModelHostOffenders.join(', ')
      : 'no direct OpenAI/Anthropic/Gemini host calls outside approved adapters',
  )
  ensure(
    checks,
    backlogSeedDrift.seedRows >= 180 &&
      Array.isArray(backlogSeedDrift.items) &&
      backlogSeedDrift.stableFields.includes('summary') &&
      backlogSeedDrift.stableFields.includes('whyItMatters') &&
      backlogSeedDrift.mutableFields.includes('lane') &&
      backlogSeedDrift.mutableFields.includes('statusNote') &&
      typeof backlogSeedDrift.totalMismatchCount === 'number',
    'backlog seed/live drift is explicitly reported',
    `${backlogSeedDrift.driftItemCount} drift rows / ${backlogSeedDrift.stableMismatchCount} stable mismatches / ${backlogSeedDrift.mutableMismatchCount} mutable mismatches`,
  )
  ensure(
    checks,
    dbConstraintAudit.invalidDecisionCategoryCount === 0 &&
      dbConstraintAudit.invalidSourceReferenceCount === 0 &&
      dbConstraintAudit.pendingDocUpdateStateIssueCount === 0,
    'Foundation DB constraint audit has no invalid categories, source IDs, or doc-update states',
    `${dbConstraintAudit.registeredSourceIds} registered source IDs / ${dbConstraintAudit.invalidDecisionCategoryCount} invalid categories / ${dbConstraintAudit.invalidSourceReferenceCount} invalid source refs / ${dbConstraintAudit.pendingDocUpdateStateIssueCount} doc-update state issues`,
  )
  ensure(
    checks,
    [
      "app.get('/api/foundation-hub', requireAdminToken",
      "app.get('/api/ops-hub', requireAdminToken",
      "app.get('/api/source-of-truth', requireAdminToken",
      "app.get('/api/doc', requireAdminToken",
      "app.get('/api/fub/health', requireAdminToken",
      "app.get('/api/fub/person', requireAdminToken",
      "app.get('/api/fub/lead-sources', requireAdminToken",
      "app.get('/api/owners/lead-source-governance', requireAdminToken",
      "app.get('/api/owners/review-queue', requireAdminToken",
      "app.get('/api/sheets/structure-status', requireAdminToken",
      "app.get('/api/system-inventory', requireAdminToken",
      "app.get('/api/foundation/changes', requireAdminToken",
      "app.get('/api/foundation/doc-updates', requireAdminToken",
      "app.get('/foundation/export/strategy.pdf', requireAdminToken",
    ].every(pattern => serverSource.includes(pattern)),
    'broad Foundation/Ops/doc read APIs are admin-gated',
    'source-of-truth, doc reads, foundation hub, ops hub, FUB reads, owners queue/governance, sheet structure, system inventory, changes, doc updates, and PDF export require admin token outside localhost',
  )
  ensure(
    checks,
    includesAll(serverSource, [
      "app.post('/api/auth/login'",
      "app.post('/api/auth/google'",
      "app.get('/api/auth/session'",
      "app.post('/api/auth/logout'",
      "app.get('/login'",
      "requirePageAccess('owner')",
      "requirePageAccess('ops')",
      "isOpsApiPath",
    ]) &&
      includesAll(appAuthSource, [
        'AIOS_AUTH_USERS_JSON',
        'AIOS_GOOGLE_CLIENT_ID',
        'AIOS_SESSION_SECRET',
        'assertSessionSecretConfigured',
        'pbkdf2-sha256',
        'aios_session',
        'getAllowedAuthUser',
        'getSafeRedirectPath',
      ]) &&
      includesAll(loginHtmlSource, ['BCrew AI OS', 'accounts.google.com/gsi/client', 'google-login-button', '/login.js']) &&
      includesAll(loginUiSource, ['/api/auth/google', '/api/auth/session', 'google.accounts.id.renderButton']),
    'app auth gates live surfaces by role',
    'Google login route, signed cookie sessions, owner/ops page gates, and Ops-only API allowlist are wired',
  )
  ensure(
    checks,
    !serverSource.includes('req.hostname') &&
      serverSource.includes("const host = process.env.HOST || '127.0.0.1'") &&
      serverSource.includes('app.listen(port, host'),
    'local admin bypass uses socket locality, not spoofable Host header',
    'server binds to localhost by default and local trust does not inspect req.hostname',
  )
  ensure(
    checks,
    foundationUiSource.includes('downloadStrategyPdf') &&
      foundationUiSource.includes("foundationRead('/foundation/export/strategy.pdf')") &&
      strategyExportUiSource.includes("fetch('/foundation/export/strategy.pdf', { headers: getAdminHeaders()"),
    'PDF export clients forward admin token',
    'Foundation and strategy export pages fetch the gated PDF route with X-Admin-Token when present',
  )
  ensure(
    checks,
    serverSource.includes('FUB_PROXY_ALLOW_MUTATION') &&
      serverSource.includes("normalizedMethod !== 'GET'"),
    'generic FUB proxy mutations are off by default',
    'broad FUB proxy allows reads but requires explicit supervised env flag for POST/PUT/PATCH/DELETE',
  )
  ensure(
    checks,
    foundationDbSource.includes('function ensureSharedCommunicationCandidateCanApply') &&
      foundationDbSource.includes("['pending', 'approved'].includes(candidate.status)") &&
      foundationDbSource.includes('candidate.metadata.appliedTargetId') &&
      foundationDbSource.includes('FOR UPDATE') &&
      !serverSource.includes("apply: 'applied'"),
    'shared-comms candidates apply idempotently',
    'candidate apply lanes block already-applied/non-review states and generic status apply cannot create targetless truth',
  )
  ensure(
    checks,
    llmRouterSource.includes('!dryRun && !plan.runnable') &&
      llmRouterSource.includes('No runnable LLM route available'),
    'LLM router refuses non-runnable routes',
    'probe-required or policy-blocked routes cannot execute live calls just because they sort first',
  )
  ensure(
    checks,
    foundationDbSource.includes('AND lease_owner = $12') &&
      foundationDbSource.includes('CREATE TABLE IF NOT EXISTS source_crawl_target_runs') &&
      foundationDbSource.includes('crawlRunId') &&
      extractionTargetSource.includes('runId: leasedTarget.crawlRunId') &&
      foundationDbSource.includes('Source crawl target finish blocked') &&
      foundationDbSource.includes("`source_crawl_item:${targetKey}:${externalId}`") &&
      foundationDbSource.includes('entityId: item.itemKey'),
    'source crawl ledger is run-id, lease-owner, and item-key safe',
    'target leases create run rows, finishes carry crawlRunId and require matching lease owner, and item events use the actual returned row key',
  )
  ensure(
    checks,
    includesAll(foundationDbSource, ['markStaleFoundationJobRuns', 'Marked failed by stale active-run reaper', 'markStaleLlmCalls', 'Marked failed by stale LLM call reaper']) &&
      includesAll(foundationWorkerSource, ['markStaleFoundationJobRuns', 'markStaleLlmCalls', 'job ' + '${job.key}' + ' failed before completion', 'Foundation worker pass failed']),
    'Foundation worker catches job failures and reaps stale active runs/calls',
    'worker pass catches per-job failures, continues looping, and marks stale queued/running job runs plus planned/started LLM calls failed before selecting due jobs',
  )
  ensure(
    checks,
    [foundationUiSource, strategicExecutionUiSource, docUiSource].every(source =>
      source.includes('isSafeDirectHref') &&
      source.includes("return isSafeDirectHref(href) ? href.trim() : '#'") &&
      source.includes("rel = 'noopener noreferrer'")
    ),
    'markdown-rendered links sanitize unsafe schemes',
    'Foundation, Strategic Execution, and doc views disable unsafe href schemes and isolate external links',
  )
  ensure(
    checks,
    foundationJobsSource.includes("args: ['run', 'extraction:target', '--', '--target=video-link-inventory']") &&
      extractionTargetSource.includes("target.targetKey === 'video-link-inventory'") &&
      extractionTargetSource.includes('--controlledByTargetRunner=true') &&
      videoInventorySource.includes('Refusing non-dry-run video link inventory outside extraction:target'),
    'video-link inventory runs through extraction target control',
    'job uses extraction:target, target runner passes controlled flag, raw script refuses direct non-dry-run writes',
  )
  ensure(
    checks,
    includesAll(currentPlan, ['Corpus mission lane', 'daily quota missions', 'files the outputs with provenance']) &&
      includesAll(currentState, ['daily quota missions', 'file outputs with provenance']) &&
      includesAll(extractionControlSeedSource, ['missionMode', 'daily_quota', 'dailyMissionQuota', 'requiresFiledOutput']),
    'corpus extraction uses daily mission quotas instead of blind timers',
    'Drive/video/Skool/Zoom/report corpus lanes are seeded and documented as quota missions with filed-output expectations',
  )
  ensure(
    checks,
    includesAll(foundationJobsSource, [
      "key: 'meeting-notes-sync-current'",
      "key: 'slack-sync-current'",
      "key: 'drive-corpus-inventory-bite'",
      "key: 'gmail-extract-latest'",
      "key: 'missive-extract-latest'",
      "key: 'meeting-transcripts-extract-backlog'",
      "key: 'slack-extract-latest'",
      "key: 'drive-content-extract-bite'",
      "key: 'email-attachment-extract-bite'",
      "key: 'video-content-extract-bite'",
      "runtimeMode: 'scheduled'",
      'scheduleEveryMinutes: 1440',
      "'--onlyWithoutCandidates=true'",
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'meetings-current-day'",
        "targetKey: 'slack-current-day'",
        "targetKey: 'drive-corpus-backfill'",
        "targetKey: 'drive-content-extract-backfill'",
        "targetKey: 'email-attachments-backfill'",
        "targetKey: 'video-content-extract-backfill'",
        "runtimeMode: 'scheduled'",
        'scheduleEveryMinutes: 1440',
      ]),
    'core sources have scheduled current-day and daily history/mission lanes',
    'meetings/slack current sync, Gmail/Missive/meeting/Slack extraction, Drive inventory/content, Gmail attachments, and video content extraction are scheduled with daily quotas',
  )
  ensure(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'drive-content-extract-backfill'",
      '--maxPdfBytes=',
      '--retrySkippedReasonPrefixes=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "maxPdfBytes: 80000000",
        "retrySkippedReasonPrefixes: ['pdf_too_large_for_v1']",
      ]) &&
      includesAll(foundationDbSource, [
        'listDriveContentExtractionQueue',
        'retrySkippedReasonPrefixes',
        "drive_document",
        "drive_pdf",
        "drive_text",
        "text/markdown",
        'parentPathIncludes',
        'fileIds',
      ]) &&
      includesAll(driveContentExtractionSource, [
        'extractPdfTextWithOcr',
        'empty_text_after_ocr_needs_vision_handwriting_extraction',
        'drive_pdf_tesseract_ocr_v1',
      ]) &&
      includesAll(packageSource, ['"drive:inventory-links"']) &&
      includesAll(driveLinkInventorySource, [
        'extractLinks',
        'createDrivePermission',
        'sendGmailMessage',
        'drive_link_access_request',
      ]),
    'Drive content extraction target supports governed Docs/PDF/text/markdown/OCR/link inventory',
    'target runner passes content caps/retry prefixes and DB queue/script support Drive document/PDF/text/markdown artifacts, OCR fallback, scoped retries, and linked-doc access requests',
  )
  ensure(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'email-attachments-backfill'",
      '--maxAttachmentBytes=',
      '--maxTextChars=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'email-attachments-backfill'",
        "maxAttachmentBytes: 80000000",
        "missionUnit: 'email_attachment_text_outputs'",
      ]) &&
      includesAll(foundationDbSource, [
        'getSourceCrawlItemsByExternalId',
        "gmail_attachment",
      ]),
    'Gmail attachment extraction target is governed and source-ledgered',
    'target runner passes attachment/text caps and DB artifacts/crawl items include gmail_attachment support',
  )
  ensure(
    checks,
    includesAll(extractionTargetSource, [
      "target.targetKey === 'video-content-extract-backfill'",
      'video:extract-content',
      '--maxTextChars=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "targetKey: 'video-content-extract-backfill'",
        "missionUnit: 'video_transcript_outputs'",
        'DataForSEO YouTube Video Subtitles live advanced',
      ]) &&
      includesAll(foundationDbSource, [
        'listVideoContentExtractionQueue',
        "video_transcript",
      ]),
    'video content extraction target is governed and source-ledgered',
    'target runner passes text caps and DB queue/artifact constraints include the video transcript lane',
  )
  ensure(
    checks,
    foundationDbSource.includes('artifact_content_hash') &&
      foundationDbSource.includes('COALESCE(processing.artifact_content_hash') &&
      !foundationDbSource.includes('active_candidate.artifact_id IS NULL'),
    'shared-comms processing selector is content-hash scoped',
    'current-content processing runs, not candidate existence, control extraction eligibility',
  )
  ensure(
    checks,
    includesAll(sharedCandidateExtractionSource, ['requestedModel', 'provider', 'authPath', 'routeKey', 'llmCallId']),
    'shared-comms extraction records actual LLM route provenance',
    'candidate metadata carries requested model plus actual provider/auth path/route/model',
  )
  const processingProvenanceGaps = await getSharedCommunicationProcessingProvenanceGaps({
    since: '2026-04-24T17:14:00-04:00',
    limit: 10,
  })
  ensure(
    checks,
    processingProvenanceGaps.length === 0,
    'shared-comms processing runs have routed LLM provenance',
    processingProvenanceGaps.length
      ? processingProvenanceGaps.map(item => `${item.runId}:${item.artifactId}`).join(', ')
      : 'no post-hardening candidate extraction rows missing hash/provider/auth/route/model',
  )
  const staleLlmCalls = await getStaleLlmCalls({ olderThanSeconds: 240, graceSeconds: 60, limit: 10 })
  ensure(
    checks,
    staleLlmCalls.length === 0,
    'llm_calls has no timeout-expired planned/started calls',
    staleLlmCalls.length
      ? staleLlmCalls.map(item => `${item.callId}:${item.status}:${item.ageSeconds}s>${item.timeoutSeconds + item.graceSeconds}s`).join(', ')
      : 'no planned/started LLM calls older than their timeout plus grace',
  )

  const sourceOfTruth = await fetchJson(baseUrl, '/api/source-of-truth')
  const systemInventory = await fetchJson(baseUrl, '/api/system-inventory')
  const foundationHub = await fetchJson(baseUrl, '/api/foundation-hub')
  const opsHub = await fetchJson(baseUrl, '/api/ops-hub')
  const ownersLeadSourceGovernance = await fetchJson(baseUrl, '/api/owners/lead-source-governance')
  const ownersReviewQueue = await fetchJson(baseUrl, '/api/owners/review-queue')
  const extractionTargets = Array.isArray(foundationHub.extractionControl?.targets)
    ? foundationHub.extractionControl.targets
    : []
  const scheduledExtractionTargets = extractionTargets.filter(target => target.scheduler?.source === 'foundation_job')
  const driveCorpusTarget = extractionTargets.find(target => target.targetKey === 'drive-corpus-backfill')
  const driveContentTarget = extractionTargets.find(target => target.targetKey === 'drive-content-extract-backfill')

  ensure(
    checks,
    Array.isArray(sourceOfTruth.sources) && sourceOfTruth.sources.length === sourceContracts.length,
    'api/source-of-truth exposes the full source-contract set',
    `${Array.isArray(sourceOfTruth.sources) ? sourceOfTruth.sources.length : 'invalid'} live / ${sourceContracts.length} code`,
  )
  ensure(
    checks,
    Array.isArray(sourceOfTruth.connectors) && sourceOfTruth.connectors.length === sourceConnectors.length,
    'api/source-of-truth exposes the full connector set',
    `${Array.isArray(sourceOfTruth.connectors) ? sourceOfTruth.connectors.length : 'invalid'} live / ${sourceConnectors.length} code`,
  )
  const workingConnectorIds = Array.isArray(sourceOfTruth.connectors)
    ? sourceOfTruth.connectors.filter(connector => connector.group === 'working').map(connector => connector.connectorId)
    : []
  const requiredWorkingConnectorIds = [
    'CONN-GSHEETS-001',
    'CONN-GDRIVE-001',
    'CONN-GMAIL-001',
    'CONN-GCAL-001',
    'CONN-FUB-001',
    'CONN-CLICKUP-001',
    'CONN-SLACK-001',
    'CONN-MISSIVE-001',
    'CONN-DATAFORSEO-001',
    'CONN-META-001',
  ]
  const missingWorkingConnectorIds = requiredWorkingConnectorIds.filter(connectorId => !workingConnectorIds.includes(connectorId))
  ensure(
    checks,
    missingWorkingConnectorIds.length === 0,
    'source connector status reflects proven working rebuild paths',
    missingWorkingConnectorIds.length
      ? `missing working status for ${missingWorkingConnectorIds.join(', ')}`
      : `${workingConnectorIds.length} connectors marked working`,
  )
  const expectedGroupedSystemIds = groupedSourceSystems.map(system => system.systemId)
  const liveGroupedSystemIds = Array.isArray(sourceOfTruth.groupedSystems)
    ? sourceOfTruth.groupedSystems.map(system => system.systemId)
    : []
  const missingGroupedSystemIds = expectedGroupedSystemIds.filter(systemId => !liveGroupedSystemIds.includes(systemId))
  ensure(
    checks,
    Array.isArray(sourceOfTruth.groupedSystems) &&
      sourceOfTruth.groupedSystems.length === groupedSourceSystems.length &&
      missingGroupedSystemIds.length === 0 &&
      foundationHtmlSource.includes('data-section="systems"') &&
      foundationUiSource.includes('renderFoundationSystems') &&
      foundationUiSource.includes('renderGroupedSourceSystemsPanel'),
    'api/source-of-truth exposes grouped source systems for Foundation visibility',
    missingGroupedSystemIds.length
      ? `missing ${missingGroupedSystemIds.join(', ')}`
      : `${liveGroupedSystemIds.length} live / ${groupedSourceSystems.length} code`,
  )
  ensure(
    checks,
    includesAll(foundationUiSource, [
      'renderDataSourcePurposePanel',
      'Show the whole source layer',
      'doc-backed source contracts only',
      'spreadsheet-backed source contracts',
      'Show app, API, and database-backed business sources',
      'Show the connector layer only',
      'Connector does not equal trusted source',
    ]),
    'Data Sources pages explain purpose and connector boundary',
    'Overview, Docs, Spreadsheets, APIs / Apps, and Connectors have explicit page-purpose copy',
  )
  ensure(
    checks,
    systemInventory?.docs &&
      Array.isArray(systemInventory.docs.tracked) &&
      Array.isArray(systemInventory.docs.privateLocal) &&
      Array.isArray(systemInventory.skills) &&
      Array.isArray(systemInventory.plugins) &&
      includesAll(foundationUiSource, [
        'renderSystemInventoryPurposePanel',
        'All Docs Inventory Job',
        'Skills Inventory Job',
        'Plugins / MCPs Inventory Job',
        'Agents Inventory Job',
        'not a live Agent Registry yet',
      ]),
    'System Inventory pages explain live backing and boundaries',
    `${systemInventory?.docs?.tracked?.length ?? 'invalid'} docs / ${systemInventory?.skills?.length ?? 'invalid'} skills / ${systemInventory?.plugins?.length ?? 'invalid'} plugins`,
  )
  ensure(
    checks,
    includesAll(currentState, [
      'Data Sources And System Inventory Surfaces',
      'Connector does not equal trusted source',
      'not a live Agent Registry yet',
      'AGENT-006',
      'AGENT-007',
      'AGENT-010',
    ]),
    'current-state documents Data Sources and System Inventory purpose boundaries',
    'source, connector, docs, skills, plugins, and agent inventory boundaries are captured',
  )
  const driveCorpusNote = await readRepoFile('docs/source-notes/google-drive-corpus.md')
  ensure(
    checks,
    includesAll(driveCorpusNote, [
      'Strategy Folder Operating Model',
      'quarterly evidence intake',
      'not the canonical strategy',
      'Strategy Hub / Strategic Execution',
      'Action Router',
    ]),
    'Drive strategy folder is captured as quarterly evidence intake',
    'Drive source note distinguishes raw evidence folder from canonical strategy and Strategy Hub outputs',
  )

  const liveOwnersContract = findSourceById(sourceOfTruth.sources, 'SRC-OWNERS-001')
  ensure(
    checks,
    liveOwnersContract?.status === 'Signed Off' && liveOwnersContract?.validation === 'Signed Off',
    'api/source-of-truth keeps Owners sign-off visible',
    liveOwnersContract ? `${liveOwnersContract.status} / ${liveOwnersContract.validation}` : 'missing',
  )

  ensure(
    checks,
    Array.isArray(foundationHub.backlogItems) &&
      Array.isArray(foundationHub.decisions) &&
      Array.isArray(foundationHub.openQuestions) &&
      foundationHub.decisionTraceability &&
      foundationHub.decisionTraceability.summary &&
      foundationHub.decisionTraceability.byDecision &&
      foundationHub.decisionReview &&
      typeof foundationHub.decisionReview.total === 'number' &&
      foundationHub.decisionReview.counts &&
      Array.isArray(foundationHub.decisionReview.items),
    'api/foundation-hub returns the expected core arrays',
    `${foundationHub.backlogItems?.length ?? 'invalid'} backlog / ${foundationHub.decisions?.length ?? 'invalid'} decisions / ${foundationHub.openQuestions?.length ?? 'invalid'} questions`,
  )
  ensure(
    checks,
    foundationHub.backlogSeedDrift?.policy &&
      Array.isArray(foundationHub.backlogSeedDrift.items) &&
      Array.isArray(foundationHub.backlogSeedDrift.stableFields) &&
      Array.isArray(foundationHub.backlogSeedDrift.mutableFields) &&
      typeof foundationHub.backlogSeedDrift.totalMismatchCount === 'number',
    'api/foundation-hub exposes backlog seed/live drift',
    foundationHub.backlogSeedDrift
      ? `${foundationHub.backlogSeedDrift.driftItemCount} drift rows / ${foundationHub.backlogSeedDrift.totalMismatchCount} mismatches`
      : 'missing seed/live drift payload',
  )
  ensure(
    checks,
    foundationHub.dbConstraintAudit?.registeredSourceIds === sourceContracts.length &&
      foundationHub.dbConstraintAudit.invalidDecisionCategoryCount === 0 &&
      foundationHub.dbConstraintAudit.invalidSourceReferenceCount === 0 &&
      foundationHub.dbConstraintAudit.pendingDocUpdateStateIssueCount === 0,
    'api/foundation-hub exposes clean DB constraint audit',
    foundationHub.dbConstraintAudit
      ? `${foundationHub.dbConstraintAudit.registeredSourceIds} source IDs / ${foundationHub.dbConstraintAudit.invalidSourceReferenceCount} invalid source refs`
      : 'missing DB constraint audit payload',
  )
  const legacyQuestions = (foundationHub.openQuestions || []).filter(item =>
    ['Q-001', 'Q-002', 'Q-003', 'Q-004', 'Q-005'].includes(item.id)
  )
  ensure(
    checks,
    legacyQuestions.length === 5 &&
      legacyQuestions.every(item => item.status === 'resolved') &&
      includesAll(foundationUiSource, [
        'function renderFoundationOperationsPurposePanel',
        'Backlog Page Job',
        'Decision Page Job',
        'Question Page Job',
        'Activity Page Job',
        'Runtime Health Page Job',
      ]) &&
      includesAll(currentState, [
        'Foundation Operations Surfaces',
        'Working as a manual first slice',
        'old stale carry-forward questions were resolved',
        'SYSTEM-007',
        'SYSTEM-008',
      ]),
    'Foundation Operations pages state their purpose and stale questions are cleared',
    legacyQuestions.map(item => `${item.id}=${item.status}`).join(' / '),
  )
  const opsServedJobs = (foundationHub.foundationJobs?.jobs || []).filter(job =>
    Array.isArray(job.servesHubs) && job.servesHubs.includes('ops')
  )
  ensure(
    checks,
    opsServedJobs.some(job => job.key === 'admin-deal-review-readonly') &&
      opsServedJobs.some(job => job.key === 'conditional-deal-review-readonly') &&
      opsServedJobs.some(job => job.key === 'agent-roster-review'),
    'Foundation jobs expose systems serving Ops Hub',
    opsServedJobs.length
      ? opsServedJobs.map(job => job.key).join(', ')
      : 'no Ops-serving jobs tagged',
  )
  const opsHubJobs = opsHub.foundationJobs?.jobs || []
  ensure(
    checks,
    Array.isArray(opsHubJobs) &&
      opsHubJobs.length > 0 &&
      opsHubJobs.every(job => Array.isArray(job.servesHubs) && job.servesHubs.includes('ops')) &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'backlogItems') &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'decisions') &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'sharedCommunicationCandidates'),
    'api/ops-hub exposes only Ops-serving runtime metadata',
    `${opsHubJobs.length} Ops jobs / restricted Foundation payload`,
  )
  ensure(
    checks,
    includesAll(opsHtmlSource, ['Ops Hub', '/ops.js']) &&
      includesAll(opsUiSource, ['getHubServedJobs', 'fetchOwnersReviewQueue', '/api/ops-hub', 'Systems Serving Ops']) &&
      !foundationHtmlSource.includes('data-section="ops-hub"') &&
      !foundationUiSource.includes('function renderOpsHub'),
    'Ops Hub is a dedicated hub surface, not nested in Foundation nav',
    'public/ops.html + public/ops.js own the Ops cockpit; Foundation keeps system metadata only',
  )
  ensure(
    checks,
      includesAll(agentFeedbackSource, ['createAgentFeedbackToken', 'verifyAgentFeedbackToken', 'hashAgentFeedbackToken', 'AGENT_FEEDBACK_SECRET', 'assertAgentFeedbackSecretConfigured', 'iat', 'exp']) &&
      !agentFeedbackSource.includes('local-agent-feedback-dev-secret') &&
      !agentFeedbackSource.includes('process.env.ADMIN_TOKEN') &&
      includesAll(foundationDbSource, ['ON CONFLICT (token_hash) DO NOTHING', 'Feedback link has already been used.']) &&
      includesAll(agentFeedbackEmailSource, ['buildAgentFeedbackEmail', 'Start check-in', 'How have your first', 'Benson Crew']) &&
      includesAll(googleDelegatedSource, ['sendGmailMessage', 'multipart/alternative', 'gmail.send']) &&
      includesAll(agentFeedbackClickUpSource, ['writeAgentFeedbackToClickUp', 'Onboarding NPS 30 Score', 'Onboarding NPS 90 Feedback']) &&
      includesAll(agentRosterReviewSource, ['buildAgentFeedbackUrl', 'feedbackUrl']) &&
      includesAll(serverSource, ['/api/agent-feedback/session', '/api/agent-feedback/submit', 'upsertAgentOnboardingFeedbackResponse', 'writeAgentFeedbackToClickUp']) &&
      includesAll(foundationDbSource, ['agent_onboarding_feedback_responses', 'token_hash', 'milestone_day']) &&
      includesAll(agentFeedbackHtmlSource, ['agent-feedback-form', 'score-grid', 'Submit feedback']) &&
      includesAll(agentFeedbackUiSource, ['/api/agent-feedback/session', '/api/agent-feedback/submit']) &&
      includesAll(opsUiSource, ['Open feedback form']),
    'agent onboarding feedback form is source-backed and replay-hardened',
    'signed expiring link helper, DB response table, public form, one-time token storage, and Ops feedback action are wired',
  )
  ensure(
    checks,
    foundationHub.sharedCommunicationSynthesis?.latestRun &&
      Array.isArray(foundationHub.sharedCommunicationSynthesis?.latestItems) &&
      foundationHub.sharedCommunicationSynthesis.latestItems.length > 0,
    'api/foundation-hub exposes persisted shared-comms synthesis',
    foundationHub.sharedCommunicationSynthesis?.latestRun
      ? `${foundationHub.sharedCommunicationSynthesis.latestRun.runId} / ${foundationHub.sharedCommunicationSynthesis.latestItems.length} items`
      : 'missing synthesis payload',
  )
  ensure(
    checks,
    packageSource.includes('"strategy:evidence-packet"') &&
      includesAll(strategyEvidencePacketSource, [
        'strategy_evidence_packet_v1',
        'direct_strategy_artifacts',
        'recordSharedCommunicationSynthesisRun',
        "packetType: 'strategy_evidence_packet_v1'",
      ]) &&
      includesAll(foundationJobsSource, [
        "key: 'strategy-evidence-packet-v1'",
        "servesHubs: ['strategy']",
        'Strategy Evidence Packet V1',
      ]) &&
      serverSource.includes('packetType = req.query.packetType') &&
      includesAll(strategicExecutionUiSource, [
        'fetchStrategyEvidencePacket',
        'strategy_evidence_packet_v1',
        'renderStrategyPacketCard',
        'Evidence Packet',
      ]),
    'Strategy Evidence Packet v1 is wired from script to job to Strategic Execution',
    'strategy:evidence-packet persists packetType=strategy_evidence_packet_v1 and Strategic Execution renders the latest packet',
  )
  ensure(
    checks,
    serverSource.includes("app.post('/api/strategic-execution/advisor'") &&
      serverSource.includes('strategy_advisor_v1') &&
      serverSource.includes('2026-04-26-scott-pre-strat-visual-review.md') &&
      serverSource.includes('callLlm') &&
      foundationDbSource.includes('STRATEGY-007') &&
      foundationDbSource.includes('fast/deep modes') &&
      includesAll(strategicExecutionUiSource, [
        'Strategy Advisor',
        'Strategy Review Board',
        'Attract',
        'Grow',
        'Retain',
        '/api/strategic-execution/advisor',
        'Proof gap:',
      ]),
    'Strategy Hub advisor and review board are wired',
    'Strategic Execution can ask the routed LLM, include Scott visual pre-strat context, and review packet items by Attract / Grow / Retain',
  )
  ensure(
    checks,
    foundationHub.sharedCommunicationsCoverage?.totalArtifacts > 0 &&
      foundationHub.sharedCommunicationsCoverage?.totalCandidates > 0 &&
      Array.isArray(foundationHub.sharedCommunicationsCoverage?.sources) &&
      foundationHub.sharedCommunicationsCoverage.sources.length > 0,
    'api/foundation-hub exposes shared-comms coverage',
    foundationHub.sharedCommunicationsCoverage
      ? `${foundationHub.sharedCommunicationsCoverage.totalArtifacts} artifacts / ${foundationHub.sharedCommunicationsCoverage.totalCandidates} candidates`
      : 'missing coverage payload',
  )
  const coverageSources = foundationHub.sharedCommunicationsCoverage?.sources || []
  const sourcesWithExtractionDepth = coverageSources.filter(source =>
    typeof source.artifactsWithCandidates === 'number' &&
    typeof source.artifactsWithoutCandidates === 'number' &&
    typeof source.artifactsProcessed === 'number' &&
    typeof source.artifactsPendingProcessing === 'number' &&
    typeof source.processingCoveragePercent === 'number' &&
    typeof source.extractionCoveragePercent === 'number'
  )
  ensure(
    checks,
    coverageSources.length > 0 &&
      sourcesWithExtractionDepth.length === coverageSources.length,
    'api/foundation-hub exposes shared-comms extraction and processing depth',
    coverageSources.length
      ? `${sourcesWithExtractionDepth.length}/${coverageSources.length} sources expose candidate and processing counts`
      : 'missing coverage sources',
  )
  ensure(
    checks,
    foundationHub.llmRuntime?.summary &&
      Number(foundationHub.llmRuntime.summary.credentialCount || 0) > 0 &&
      Number(foundationHub.llmRuntime.summary.routeCount || 0) > 0 &&
      Array.isArray(foundationHub.llmRuntime.routes),
    'api/foundation-hub exposes policy-aware LLM runtime status',
    foundationHub.llmRuntime?.summary
      ? `${foundationHub.llmRuntime.summary.credentialCount} credentials / ${foundationHub.llmRuntime.summary.routeCount} routes`
      : 'missing LLM runtime payload',
  )
  ensure(
    checks,
    foundationHub.extractionControl?.summary &&
      Number(foundationHub.extractionControl.summary.targetCount || 0) > 0 &&
      extractionTargets.length > 0 &&
      Array.isArray(foundationHub.extractionControl.recentItems) &&
      Array.isArray(foundationHub.extractionControl.recentRuns),
    'api/foundation-hub exposes extraction control targets',
    foundationHub.extractionControl?.summary
      ? `${foundationHub.extractionControl.summary.targetCount} targets / ${foundationHub.extractionControl.summary.currentDayTargets} current-day / ${foundationHub.extractionControl.recentItems?.length ?? 0} recent items / ${foundationHub.extractionControl.recentRuns?.length ?? 0} recent runs`
      : 'missing extraction control payload',
  )
  ensure(
    checks,
    scheduledExtractionTargets.length > 0 &&
      scheduledExtractionTargets.every(target => target.foundationJobKey && target.scheduler?.scheduleStatus),
    'api/foundation-hub derives extraction schedules from Foundation jobs',
    scheduledExtractionTargets.length
      ? `${scheduledExtractionTargets.length} targets derive schedule from job runtime`
      : 'no target schedule derivations found',
  )
  ensure(
    checks,
    driveCorpusTarget?.cursorState?.driveInventory &&
      Number(driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0) >= 1 &&
      Number(driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0) >= 1,
    'api/foundation-hub exposes Drive corpus inventory cursor',
    driveCorpusTarget?.cursorState?.driveInventory
      ? `${driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0} inspected folders / ${driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0} queued`
      : 'missing Drive corpus cursor',
  )
  ensure(
    checks,
    foundationHub.driveCorpusInventory?.summary &&
      Number(foundationHub.driveCorpusInventory.summary.totalItems || 0) > 0 &&
      Array.isArray(foundationHub.driveCorpusInventory.valueRoutes),
    'api/foundation-hub exposes Drive corpus inventory review surface',
    foundationHub.driveCorpusInventory?.summary
      ? `${foundationHub.driveCorpusInventory.summary.totalItems} items / ${foundationHub.driveCorpusInventory.valueRoutes?.length || 0} value routes`
      : 'missing Drive corpus inventory payload',
  )
  ensure(
    checks,
    driveContentTarget?.status === 'active' &&
      driveContentTarget.runtimeMode === 'scheduled' &&
      Number(driveContentTarget.budget?.maxPdfBytes || 0) >= 80000000 &&
      Array.isArray(driveContentTarget.budget?.retrySkippedReasonPrefixes) &&
      Number(driveContentTarget.cursorState?.artifactCount || 0) > 0,
    'api/foundation-hub exposes scheduled Drive content extraction target',
    driveContentTarget
      ? `${driveContentTarget.status} / ${driveContentTarget.runtimeMode} / ${driveContentTarget.cursorState?.artifactCount || 0} Drive artifacts`
      : 'missing Drive content extraction target',
  )
  ensure(
    checks,
    ownersLeadSourceGovernance?.sourceId === 'SRC-OWNERS-001' &&
      ownersLeadSourceGovernance?.drift &&
      ownersLeadSourceGovernance?.freshness &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.unexpectedInOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.missingFromOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.duplicates),
    'api/owners/lead-source-governance exposes governed dropdown drift',
    ownersLeadSourceGovernance?.drift
      ? `${ownersLeadSourceGovernance.drift.status} / ${ownersLeadSourceGovernance.drift.stats?.reviewNow ?? 'invalid'} review items`
      : 'missing drift payload',
  )
  ensure(
    checks,
    ownersReviewQueue?.sourceId === 'SRC-OWNERS-001' &&
      ownersReviewQueue?.reviewQueue &&
      ownersReviewQueue.reviewQueue.freshness &&
      ownersReviewQueue.reviewQueue.freshnessRules &&
      ownersReviewQueue.reviewQueue.sections &&
      ownersReviewQueue.reviewQueue.sections.admin?.freshness &&
      ownersReviewQueue.reviewQueue.sections.conditional?.freshness &&
      ownersReviewQueue.reviewQueue.sections.fubDrift?.freshness &&
      ownersReviewQueue.reviewQueue.sections.ownersGovernance?.freshness &&
      ownersReviewQueue.reviewQueue.sections.agentRoster?.freshness &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.admin?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.conditional?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.fubDrift?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.ownersGovernance?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.agentRoster?.items),
    'api/owners/review-queue exposes the governed Owners inbox',
    ownersReviewQueue?.reviewQueue
      ? `${ownersReviewQueue.reviewQueue.status} / ${ownersReviewQueue.reviewQueue.stats?.openItems ?? 'invalid'} open items`
      : 'missing review queue payload',
  )

  const foundationCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-002') || null
  ensure(
    checks,
    foundationCloseout?.lane === 'done' &&
      foundationCloseout?.title === 'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
    'FOUNDATION-002 matches signed-off reality',
    foundationCloseout ? `${foundationCloseout.lane} / ${foundationCloseout.title}` : 'missing',
  )
  const foundationSurfaceSweep = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-SWEEP-001') || null
  ensure(
    checks,
    foundationSurfaceSweep?.lane === 'scoped' &&
      foundationSurfaceSweep?.priority === 'P0' &&
      /source contracts, connectors, jobs, docs, backlog cards, or system maps change/.test(foundationSurfaceSweep?.summary || '') &&
      currentPlan.includes('Foundation surfaces must not rely on Steve noticing stale truth') &&
      currentPlan.includes('FOUNDATION-SWEEP-001'),
    'Foundation surface freshness sweep is tracked as P0 work',
    foundationSurfaceSweep
      ? `${foundationSurfaceSweep.lane} / ${foundationSurfaceSweep.priority} / ${foundationSurfaceSweep.title}`
      : 'missing FOUNDATION-SWEEP-001',
  )
  const strategyLayerCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-001') || null
  const strategyInputCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-014') || null
  ensure(
    checks,
    strategyLayerCloseout?.lane === 'done' && strategyInputCloseout?.lane === 'done',
    'strategy input package closeout cards match signed-off source reality',
    `FOUNDATION-001=${strategyLayerCloseout?.lane || 'missing'} / SOURCE-014=${strategyInputCloseout?.lane || 'missing'}`,
  )
  const sourceLifecycleContent = (foundationHub.backlogItems || []).find(item => item.id === 'MKT-004') || null
  ensure(
    checks,
    sourceLifecycleContent?.team === 'marketing' &&
      sourceLifecycleContent?.lane === 'research' &&
      /connect, verify, understand, extract, synthesize, route\/action/.test(sourceLifecycleContent?.summary || ''),
    'marketing backlog captures Source Intelligence Lifecycle content idea',
    sourceLifecycleContent ? `${sourceLifecycleContent.lane} / ${sourceLifecycleContent.title}` : 'missing',
  )
  const doneGuardrails = ['DATA-018', 'DATA-019', 'DATA-020'].map(id => (foundationHub.backlogItems || []).find(item => item.id === id))
  ensure(
    checks,
    doneGuardrails.every(item => item?.lane === 'done') &&
      !includesAll(foundationUiSource, ['DATA-018, DATA-019']) &&
      includesAll(currentState, ['DATA-018', 'DATA-019', 'DATA-020']),
    'current-state source closeout rows match done Owners/FUB guardrails',
    doneGuardrails.map(item => `${item?.id || 'missing'}=${item?.lane || 'missing'}`).join(' / '),
  )

  const googleHealth = await runHealthScript('google:health')
  ensure(
    checks,
    googleHealth.includes('Spreadsheet access: OK') && googleHealth.includes('Delegated access is ready'),
    'google:health passes',
    googleHealth.split('\n').filter(Boolean).slice(-2).join(' | '),
  )

  const fubHealth = await runHealthScript('fub:health')
  ensure(
    checks,
    fubHealth.includes('Context: Support / Owner account (owner)') &&
      fubHealth.includes('Context: Steve account (steve)') &&
      fubHealth.includes('Status: ok'),
    'fub:health passes for both configured contexts',
    fubHealth
      .split('\n')
      .filter(lineValue => lineValue.includes('Context:') || lineValue.includes('Status:'))
      .join(' | '),
  )

  const clickUpVerify = await runHealthScript('clickup:verify')
  ensure(
    checks,
    clickUpVerify.includes('ClickUp source verification') &&
      clickUpVerify.includes('dealDataEntry:') &&
      clickUpVerify.includes('agentRoster:') &&
      clickUpVerify.includes('agentPipeline:') &&
      clickUpVerify.includes('Summary: 12/12 checks passed'),
    'clickup:verify passes for v1 governed lists',
    clickUpVerify
      .split('\n')
      .filter(lineValue => /^(dealDataEntry|agentRoster|agentPipeline|Summary):/.test(lineValue))
      .join(' | '),
  )

  const sheetVerify = await runHealthScript('sheets:verify')
  ensure(
    checks,
    sheetVerify.includes('Sheet structure verification passed.'),
    'sheets:verify passes',
    sheetVerify.split('\n').filter(Boolean).slice(-2).join(' | '),
  )

  console.log('')
  for (const check of checks) {
    if (check.ok) pass(check.check, check.detail)
    else fail(check.check, check.detail)
  }

  const failed = checks.filter(check => !check.ok)
  console.log('')
  line('Summary', `${checks.length - failed.length}/${checks.length} checks passed`)

  if (failed.length) {
    process.exitCode = 1
    return
  }

  console.log('Foundation verification passed.')
}

main()
  .catch(error => {
    console.error('Foundation verification failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
