#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import process from 'node:process'
import { getGroupedSourceSystems, getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'
import {
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
} from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getBacklogSeedDriftSnapshot,
  getFoundationDbConstraintAudit,
  getIntelligenceAtomSpineSnapshot,
  getIntelligenceJobLedgerSnapshot,
  getIntelligenceRetrievalSnapshot,
  getSynthesisEngineSnapshot,
  getSynthesisFactsSnapshot,
  getSharedCommunicationProcessingProvenanceGaps,
  getStaleSourceCrawlTargetRuns,
  getStaleLlmCalls,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  getStrategyPreworkCoverageSnapshot,
  initFoundationDb,
} from '../lib/foundation-db.js'
import { getFoundationSurfaceMap } from '../lib/foundation-surface-map.js'
import {
  EXPECTED_KPI_RPCS,
  EXPECTED_KPI_TABLES,
  KPI_HEALTH_PRIMARY_SURFACE,
} from '../lib/kpi-health.js'

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

async function getCurrentRepoHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 64,
  })
  return String(stdout || '').trim().toLowerCase()
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

  const currentRepoHead = await getCurrentRepoHead()
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const groupedSourceSystems = getGroupedSourceSystems()
  const ownersContract = findSourceById(sourceContracts, 'SRC-OWNERS-001')
  const financeContract = findSourceById(sourceContracts, 'SRC-FINANCE-001')
  const freedomCommunityContract = findSourceById(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001')
  await initFoundationDb()
  const backlogSeedDrift = await getBacklogSeedDriftSnapshot({ limit: 10 })
  const strategyPreworkCoverageSnapshot = await getStrategyPreworkCoverageSnapshot()
  const strategyGoalTruthSnapshot = await getStrategyGoalTruthSnapshot()
  const strategyOperatingTruthSnapshot = await getStrategyOperatingTruthSnapshot()
  const intelligenceJobLedgerSnapshot = await getIntelligenceJobLedgerSnapshot({ limit: 20 })
  const intelligenceAtomSpineSnapshot = await getIntelligenceAtomSpineSnapshot({ limit: 20 })
  const intelligenceRetrievalSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const synthesisFactsSnapshot = await getSynthesisFactsSnapshot({ limit: 20 })
  const synthesisEngineSnapshot = await getSynthesisEngineSnapshot({ limit: 20 })
  const actionRouterSnapshot = await getActionRouterSnapshot({ limit: 40 })
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
  const intelligencePipelineSource = await readRepoFile('docs/rebuild/intelligence-pipeline.md')
  const intelligenceSalvageSpecSource = await readRepoFile('docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md')
  const strategyHubManifestSource = await readRepoFile('docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md')
  const strategicIntelSpecSource = await readRepoFile('docs/specs/2026-04-28-strategic-intelligence-loop.md')
  const foundationHardCheckpointSource = await readRepoFile('docs/handoffs/2026-04-28-foundation-hard-checkpoint.md')
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
  const syncSlackSource = await readRepoFile('scripts/sync-slack-archive.mjs')
  const syncMissiveSource = await readRepoFile('scripts/sync-missive-archive.mjs')
  const videoInventorySource = await readRepoFile('scripts/inventory-video-links.mjs')
  const driveContentExtractionSource = await readRepoFile('scripts/extract-drive-content.mjs')
  const driveLinkInventorySource = await readRepoFile('scripts/inventory-drive-linked-files.mjs')
  const extractionLaneItemShapeAudit = await readRepoFile('docs/audits/2026-04-28-extraction-lane-item-shape.md')
  const kpiHealthSource = await readRepoFile('lib/kpi-health.js')
  const kpiHealthScriptSource = await readRepoFile('scripts/kpi-supabase-health.mjs')
  const kpiSourceNote = await readRepoFile('docs/source-notes/kpi-dashboard.md')
  const strategyEvidencePacketSource = await readRepoFile('scripts/generate-strategy-evidence-packet.mjs')
  const intelligenceJobProofSource = await readRepoFile('scripts/intelligence-job-ledger-proof.mjs')
  const intelligenceAtomProofSource = await readRepoFile('scripts/intelligence-atom-spine-proof.mjs')
  const intelligenceRetrievalSource = await readRepoFile('lib/intelligence-retrieval.js')
  const intelligenceRetrievalProofSource = await readRepoFile('scripts/intelligence-retrieval-proof.mjs')
  const intelligenceSemanticRetrievalProofSource = await readRepoFile('scripts/intelligence-semantic-retrieval-proof.mjs')
  const intelligenceHybridRetrievalProofSource = await readRepoFile('scripts/intelligence-hybrid-retrieval-proof.mjs')
  const intelligenceRetrievalEvalSource = await readRepoFile('scripts/intelligence-retrieval-eval.mjs')
  const intelligenceRetrievalEvalFixtureSource = await readRepoFile('docs/specs/2026-04-27-intelligence-retrieval-eval-baseline.json')
  const intelligenceRetrievalEvalFixture = JSON.parse(intelligenceRetrievalEvalFixtureSource)
  const intelligenceSynthesisFactsSource = await readRepoFile('lib/intelligence-synthesis-facts.js')
  const intelligenceSynthesisFactsProofSource = await readRepoFile('scripts/intelligence-synthesis-facts-proof.mjs')
  const intelligenceSynthesisSource = await readRepoFile('lib/intelligence-synthesis.js')
  const intelligenceSynthesisProofSource = await readRepoFile('scripts/intelligence-synthesis-engine-proof.mjs')
  const intelligenceActionRouterSource = await readRepoFile('lib/intelligence-action-router.js')
  const intelligenceActionRouterProofSource = await readRepoFile('scripts/intelligence-action-router-proof.mjs')
  const ownersSourceNote = await readRepoFile('docs/source-notes/owners-dashboard.md')
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const intelligenceAtomsSource = await readRepoFile('lib/intelligence-atoms.js')
  const sharedCandidateExtractionSource = await readRepoFile('lib/shared-candidate-extraction.js')
  const directModelHostOffenders = await auditDirectModelHostUsage()
  const governedExtractionLedgerRuns = intelligenceJobLedgerSnapshot.recentRuns.filter(run =>
    run.provenance?.caller === 'scripts/run-extraction-target.mjs' &&
    run.sourceCrawlRunId &&
    run.sourceId &&
    run.nextRunState?.targetKey &&
    run.itemCounts &&
    Object.prototype.hasOwnProperty.call(run.itemCounts, 'inspected')
  )
  const atomImplementationPresent = [foundationDbSource, intelligenceAtomsSource].some(source =>
    /CREATE TABLE IF NOT EXISTS\s+(business_atoms|intelligence_atoms|atom_hits|intelligence_atom_hits)/.test(source)
  )
  const synthesisFactTypes = new Set((synthesisFactsSnapshot.factsByType || []).map(row => row.factType))
  const synthesisFactSources = new Set((synthesisFactsSnapshot.factsBySource || []).map(row => row.sourceId))
  const retrievalEvalCases = Array.isArray(intelligenceRetrievalEvalFixture.cases)
    ? intelligenceRetrievalEvalFixture.cases
    : []
  const retrievalEvalSources = new Set(retrievalEvalCases.map(item => item.sourceId).filter(Boolean))
  const latestRetrievalEvalMetadata = intelligenceRetrievalSnapshot.latestEvalRun?.metadata || {}

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
    includesAll(systemStrategy, [
      'memory is not backlog',
      'Strategic Intelligence Doctrine',
      'gap-resolving Scoper',
      'Strategy route-review UI proof plumbing is not the same thing as meeting-ready UX',
    ]) &&
      includesAll(currentPlan, [
        'Hard Checkpoint — 2026-04-28 Foundation Return',
        'Parked Next Leg — Strategic Intelligence Operating Loop',
        'FOUNDATION-CHANGELOG-002',
        'INTEL-THREAD-CONTEXT-001',
      ]) &&
      includesAll(currentState, [
        'Hard checkpoint call from 2026-04-28',
        'Strategy Hub route-review proof plumbing advanced, but Steve did not accept the UI as meeting-ready',
        'FOUNDATION-SWEEP-001',
        'FOUNDATION-CHANGELOG-002',
      ]) &&
      includesAll(strategicIntelSpecSource, [
        'intelligence_strategic_issues',
        'already_answered',
        'partially_answered',
        'real_gap',
        'Thread-Context Requirement',
        'Resolution Feedback',
      ]) &&
      includesAll(foundationHardCheckpointSource, [
        'Nothing from Apr 27-28 should remain only in chat memory',
        'FOUNDATION-SWEEP-001',
        'FOUNDATION-CHANGELOG-002',
        'crawl-slack-current-day-20260427145904292-3f93bebd',
        'Not Next',
      ]),
    '2026-04-28 hard checkpoint artifacts are promoted into repo truth',
    'system strategy, current plan/state, Strategic Intel spec, and handoff all carry the Foundation-return decision and parked Strategy/Scoper work',
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
    includesAll(foundationDbSource, [
      'assertBacklogDoneCloseout',
      'moving to done requires a closeout statusNote with build/change proof',
      'createBacklogItem',
      'updateBacklogItem',
    ]),
    'backlog cards moving to done require build/change closeout proof',
    'create/update paths guard done-lane transitions with source/status closeout proof instead of relying on memory',
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
      "app.post('/api/intelligence/evidence', requireAdminToken",
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
      "app.get('/api/foundation/build-log', requireAdminToken",
      "app.get('/api/foundation/doc-updates', requireAdminToken",
      "app.get('/foundation/export/strategy.pdf', requireAdminToken",
    ].every(pattern => serverSource.includes(pattern)),
    'broad Foundation/Ops/doc read APIs are admin-gated',
    'source-of-truth, doc reads, foundation hub, intelligence evidence, ops hub, FUB reads, owners queue/governance, sheet structure, system inventory, changes, build log, doc updates, and PDF export require admin token outside localhost',
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
    includesAll(foundationDbSource, [
      'CREATE TABLE IF NOT EXISTS intelligence_job_runs',
      'CREATE TABLE IF NOT EXISTS intelligence_job_llm_calls',
      'source_id TEXT',
      'cursor_state JSONB',
      'budget JSONB',
      'model TEXT',
      'provider TEXT',
      'auth_path TEXT',
      'cost_usd NUMERIC',
      'item_counts JSONB',
      'failure_count INTEGER',
      'output_artifact_ids TEXT[]',
      'next_run_state JSONB',
      'upsertIntelligenceJobRun',
      'getIntelligenceJobLedgerSnapshot',
      ]) &&
      includesAll(extractionTargetSource, [
        'upsertIntelligenceJobRun',
        'recordExtractionIntelligenceJob',
        'scripts/run-extraction-target.mjs',
        'intel-extraction:',
        'source_crawl_target_runs',
      ]) &&
      packageSource.includes('"intelligence:jobs-proof"') &&
      includesAll(intelligenceJobProofSource, [
        'INTEL-JOBS-001',
        'source_crawl_target_runs',
        'upsertIntelligenceJobRun',
        'getIntelligenceJobLedgerSnapshot',
      ]) &&
      intelligenceJobLedgerSnapshot.totalRuns >= 1 &&
      governedExtractionLedgerRuns.length >= 1 &&
      intelligenceJobLedgerSnapshot.recentRuns.some(run =>
        run.provenance?.backlogCardId === 'INTEL-JOBS-001' &&
        run.sourceCrawlRunId &&
        run.itemCounts &&
        Object.prototype.hasOwnProperty.call(run.itemCounts, 'inspected')
      ),
    'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction',
    `${intelligenceJobLedgerSnapshot.totalRuns} ledger rows / governed extraction writers=${governedExtractionLedgerRuns.length} / latest=${intelligenceJobLedgerSnapshot.recentRuns[0]?.jobId || 'missing'}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      "id: 'REPORT-MINING-001'",
      "lane: 'done'",
      'Accepted on 2026-04-27 in `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md`',
      "id: 'INTEL-ATOM-001'",
      'Done v1 on 2026-04-27',
      'direct Scoper query fields',
    ]) &&
      includesAll(intelligenceSalvageSpecSource, [
        'Status: Accepted build gate',
        'Report Shapes To Preserve',
        'Old Atom Fields To Preserve',
        'Governed Report Artifact Contract',
        'Required Changes To INTEL-ATOM-001',
        'A Scoper must query atoms/retrieval directly before producing scoped work',
        '`candidate_key` when promoted from extracted candidates',
        '`input_candidate_keys`',
      ]) &&
      !intelligenceSalvageSpecSource.includes('candidate_id') &&
      !intelligenceSalvageSpecSource.includes('input_candidate_ids') &&
      includesAll(strategyHubManifestSource, [
        '`REPORT-MINING-001` - accepted old-system Director/Scoper/Gold Library/report-shape salvage gate',
        '`INTEL-ATOM-001` - done v1: durable source-backed memory atoms plus governed report artifacts and direct Scoper query contract',
      ]) &&
      (!atomImplementationPresent || intelligenceSalvageSpecSource.includes('Status: Accepted build gate')) &&
      includesAll(currentPlan, [
        '`INTEL-JOBS-001` -> `REPORT-MINING-001` -> `INTEL-ATOM-001` -> `RETRIEVAL-001`',
        'intelligence_report_artifacts',
        'intelligence_atoms',
        'intelligence_atom_hits',
        '`INTEL-ATOM-001` done as the v1 report/atom substrate',
        'old-system report-shape salvage',
      ]) &&
      includesAll(intelligencePipelineSource, [
        'department intelligence briefs as governed report artifacts',
        'hub Scopers that query atoms/retrieval directly',
        'The anti-pattern is: Director summarizes research',
        'old-system report-shape salvage gate',
      ]),
    'REPORT-MINING-001 salvage spec gates INTEL-ATOM-001 before atom implementation',
    `old Director/Scoper/Gold Library salvage accepted; atom implementation present=${atomImplementationPresent}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceAtomStore',
      'intelligenceAtomSchemaSql',
      'getRegisteredSourceContractIds',
      'intelligenceAtomSpine',
    ]) &&
      includesAll(intelligenceAtomsSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_report_artifacts',
        'CREATE TABLE IF NOT EXISTS intelligence_atoms',
        'CREATE TABLE IF NOT EXISTS intelligence_atom_hits',
        'source_id TEXT NOT NULL',
        'report_artifact_id TEXT',
        'dedup_hash TEXT NOT NULL',
        'min_tier INTEGER NOT NULL DEFAULT 1',
        'assertRegisteredSourceIds',
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'WHERE dedup_hash = $1',
        'requestedAtomId',
        'queryIntelligenceAtomsForScoper requires maxTier >= 1',
        'ON intelligence_atoms(dedup_hash)',
      ]) &&
      includesAll([foundationDbSource, intelligenceAtomsSource].join('\n'), [
      'upsertIntelligenceReportArtifact',
      'upsertIntelligenceAtom',
      'recordIntelligenceAtomHit',
      'queryIntelligenceAtomsForScoper',
      'getIntelligenceAtomSpineSnapshot',
      ]) &&
      packageSource.includes('"intelligence:atoms-proof"') &&
      includesAll(intelligenceAtomProofSource, [
        'INTEL-ATOM-001',
        'REPORT-MINING-001',
        'upsertIntelligenceReportArtifact',
        'upsertIntelligenceAtom',
        'recordIntelligenceAtomHit',
        'queryIntelligenceAtomsForScoper',
        'getIntelligenceAtomSpineSnapshot',
        'duplicateAtomProof',
        'Duplicate atom proof did not merge on dedup_hash',
        'tierGuardProof',
        'explicit maxTier',
      ]) &&
      intelligenceAtomSpineSnapshot.totalReports >= 1 &&
      intelligenceAtomSpineSnapshot.totalAtoms >= 1 &&
      intelligenceAtomSpineSnapshot.totalHits >= 1 &&
      intelligenceAtomSpineSnapshot.atomsWithReportArtifact >= 1 &&
      intelligenceAtomSpineSnapshot.atomsWithScoperQueryFields >= 1 &&
      intelligenceAtomSpineSnapshot.latestScoperQueryProof.some(atom =>
        atom.reportArtifactId &&
        atom.metricRefs?.includes('INTEL-ATOM-001') &&
        atom.minTier <= 1
      ),
    'INTEL-ATOM-001 stores governed report artifacts, atoms, hits, and Scoper-queryable proof',
    `${intelligenceAtomSpineSnapshot.totalReports} reports / ${intelligenceAtomSpineSnapshot.totalAtoms} atoms / ${intelligenceAtomSpineSnapshot.totalHits} hits`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceRetrievalStore',
      'intelligenceRetrievalSchemaSql',
      'intelligenceRetrieval',
      "id: 'RETRIEVAL-001'",
      'Done v1 on 2026-04-27',
      "id: 'RETRIEVAL-002'",
      'SYNTHESIS-ENGINE-001',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_retrieval_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_retrieval_chunks',
        'search_vector TSVECTOR NOT NULL',
        'USING GIN(search_vector)',
        'promoteSharedCommunicationCandidatesToAtoms',
        'searchIntelligenceChunks',
        'intelligence retrieval queries require maxTier >= 1',
        'FROM shared_communication_candidates c',
        'JOIN shared_communication_artifacts artifact',
        'NOT EXISTS (',
        'FROM intelligence_retrieval_chunks chunk',
        'chunk.candidate_key = c.candidate_key',
        'chunk.atom_id IS NOT NULL',
        'upsertIntelligenceAtom',
        'recordIntelligenceAtomHit',
      ]) &&
      packageSource.includes('"intelligence:retrieval-proof"') &&
      includesAll(intelligenceRetrievalProofSource, [
        'promoteSharedCommunicationCandidatesToAtoms',
        'searchIntelligenceChunks',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-001',
        'RETRIEVAL-002',
      ]) &&
      intelligenceRetrievalSnapshot.totalChunks >= 1 &&
      intelligenceRetrievalSnapshot.activeChunks >= 1 &&
      intelligenceRetrievalSnapshot.chunksWithAtoms >= 1 &&
      intelligenceRetrievalSnapshot.chunksFromCandidates >= 1 &&
      intelligenceRetrievalSnapshot.chunksWithReportArtifact >= 1 &&
      intelligenceRetrievalSnapshot.tierOneChunks >= 1 &&
      intelligenceRetrievalSnapshot.activeCandidateAtomsMissingRetrievalChunks === 0 &&
      intelligenceRetrievalSnapshot.latestLexicalProof.some(chunk =>
        chunk.candidateKey &&
        chunk.atomId &&
        chunk.minTier <= 1
      ),
    'RETRIEVAL-001 promotes real candidates into atom-backed lexical chunks with tier guard',
    `${intelligenceRetrievalSnapshot.totalChunks} chunks / candidate-backed=${intelligenceRetrievalSnapshot.chunksFromCandidates} / missing chunks=${intelligenceRetrievalSnapshot.activeCandidateAtomsMissingRetrievalChunks} / latest query=${intelligenceRetrievalSnapshot.latestLexicalProofQuery || 'missing'}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      "id: 'RETRIEVAL-002'",
      'pgvector is installed',
      'searchIntelligenceChunksSemantic',
      'selectRetrievalChunksForEmbedding',
      'upsertRetrievalChunkEmbedding',
      'buildRetrievalEmbeddingInput',
      'RETRIEVAL-003',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'CREATE EXTENSION IF NOT EXISTS vector',
        'embedding vector(1536)',
        'USING hnsw (embedding vector_cosine_ops)',
        'semantic_proof',
        'selectRetrievalChunksForEmbedding',
        'upsertRetrievalChunkEmbedding',
        'searchIntelligenceChunksSemantic',
        'queryEmbedding is required',
        'chunk.embedding <=> $1::vector(1536)',
        'intelligence retrieval queries require maxTier >= 1',
      ]) &&
      includesAll(llmRouterSource, [
        'callEmbedding',
        'https://api.openai.com/v1/embeddings',
        "workload: 'embedding'",
        "encoding_format: 'float'",
        'dimensions',
      ]) &&
      packageSource.includes('"intelligence:semantic-proof"') &&
      includesAll(intelligenceSemanticRetrievalProofSource, [
        'callEmbedding',
        'selectRetrievalChunksForEmbedding',
        'upsertRetrievalChunkEmbedding',
        'searchIntelligenceChunksSemantic',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-002',
        'RETRIEVAL-003',
      ]) &&
      intelligenceRetrievalSnapshot.chunksWithEmbeddings >= 1 &&
      intelligenceRetrievalSnapshot.candidateAtomChunksWithEmbeddings >= 1 &&
      intelligenceRetrievalSnapshot.tierOneChunksWithEmbeddings >= 1,
    'RETRIEVAL-002 stores pgvector embeddings and semantic search over real atom chunks',
    `${intelligenceRetrievalSnapshot.chunksWithEmbeddings} embedded chunks / candidate-backed=${intelligenceRetrievalSnapshot.candidateAtomChunksWithEmbeddings}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      "id: 'RETRIEVAL-003'",
      'Hybrid evidence search fuses lexical, semantic, and atom matches',
      'searchIntelligenceEvidenceHybrid',
      'SYNTHESIS-FACTS-001',
    ]) &&
      includesAll(intelligenceRetrievalSource, [
        'hybrid_proof',
        'searchIntelligenceEvidenceHybrid',
        'query is required for hybrid evidence retrieval',
        'queryEmbedding is required for hybrid evidence retrieval',
        'rrfScore',
        'lexicalResults.forEach',
        'semanticResults.forEach',
        'atomResults.forEach',
      ]) &&
      includesAll(serverSource, [
        "app.post('/api/intelligence/evidence', requireAdminToken",
        'searchIntelligenceEvidenceHybrid',
        'callEmbedding',
        "backlogCardId: 'RETRIEVAL-003'",
      ]) &&
      packageSource.includes('"intelligence:hybrid-proof"') &&
      includesAll(intelligenceHybridRetrievalProofSource, [
        'callEmbedding',
        'searchIntelligenceEvidenceHybrid',
        'hybrid_proof',
        'maxTier: 1',
        'tierGuardProof',
        'RETRIEVAL-003',
        'SYNTHESIS-FACTS-001',
      ]) &&
      intelligenceRetrievalSnapshot.latestHybridProofRun?.runType === 'hybrid_proof' &&
      intelligenceRetrievalSnapshot.latestHybridProofRun?.searchResultCount >= 1 &&
      intelligenceRetrievalSnapshot.latestHybridProofRun?.maxTier <= 1,
    'RETRIEVAL-003 exposes governed hybrid evidence retrieval with tier guard',
    `${intelligenceRetrievalSnapshot.latestHybridProofRun?.searchResultCount || 0} hybrid proof results / query=${intelligenceRetrievalSnapshot.latestHybridProofRun?.searchQuery || 'missing'}`,
  )
  ensure(
    checks,
    packageSource.includes('"intelligence:retrieval-eval"') &&
      includesAll(intelligenceRetrievalSource, [
        'retrieval_eval',
        'latestEvalRun',
        'latestSuccessfulEvalRun',
      ]) &&
      includesAll(intelligenceRetrievalEvalSource, [
        'searchIntelligenceChunks',
        'searchIntelligenceEvidenceHybrid',
        'requiredMatchedBy',
        'expectedAtomId',
        'retrieval_eval',
        'recordRetrievalRun',
        'callEmbedding',
      ]) &&
      retrievalEvalCases.length >= 20 &&
      retrievalEvalSources.size >= Number(intelligenceRetrievalEvalFixture.requiredDistinctSources || 3) &&
      retrievalEvalCases.every(item =>
        item.id &&
        item.query &&
        item.sourceId &&
        item.expectedAtomId &&
        Array.isArray(item.requiredMatchedBy) &&
        item.requiredMatchedBy.includes('lexical') &&
        item.requiredMatchedBy.includes('semantic') &&
        item.requiredMatchedBy.includes('atom')
      ) &&
      intelligenceRetrievalSnapshot.latestEvalRun?.runType === 'retrieval_eval' &&
      intelligenceRetrievalSnapshot.latestEvalRun?.status === 'succeeded' &&
      intelligenceRetrievalSnapshot.latestSuccessfulEvalRun?.runId === intelligenceRetrievalSnapshot.latestEvalRun?.runId &&
      intelligenceRetrievalSnapshot.latestEvalRun?.maxTier <= 1 &&
      latestRetrievalEvalMetadata.fixtureId === intelligenceRetrievalEvalFixture.id &&
      Number(latestRetrievalEvalMetadata.totalCases || 0) >= retrievalEvalCases.length &&
      Number(latestRetrievalEvalMetadata.passedCases || 0) >= retrievalEvalCases.length &&
      Number(latestRetrievalEvalMetadata.distinctSources || 0) >= retrievalEvalSources.size &&
      Array.isArray(latestRetrievalEvalMetadata.failedCases) &&
      latestRetrievalEvalMetadata.failedCases.length === 0,
    'retrieval eval baseline guards hybrid recall before Strategy Hub consumes evidence',
    `${latestRetrievalEvalMetadata.passedCases || 0}/${retrievalEvalCases.length} cases / sources=${latestRetrievalEvalMetadata.distinctSources || 0}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceSynthesisFactStore',
      'intelligenceSynthesisFactsSchemaSql',
      'intelligenceSynthesisFacts',
      "id: 'SYNTHESIS-FACTS-001'",
      'Source-backed synthesis fact ledger persists',
      "id: 'SYNTHESIS-ENGINE-001'",
    ]) &&
      includesAll(intelligenceSynthesisFactsSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_fact_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_facts',
        'natural_key TEXT',
        'idx_intelligence_synthesis_facts_active_natural_key',
        'source_contract',
        'goal_truth',
        'operating_truth',
        'kpi_truth',
        'source_snapshot',
        'source_health',
        'retrieved_evidence',
        'collectSourceBackedSynthesisFacts',
        'buildSourceContractFacts',
        'buildGoalTruthFacts',
        'buildOperatingTruthFacts',
        'buildHybridEvidenceFacts',
        'synthesis fact queries require maxTier >= 1',
        'assertRegisteredSourceIds',
        'stale_after_synthesis_fact_refresh',
        'stale_fact_refs_after_synthesis_fact_refresh',
        'source_ids &&',
      ]) &&
      packageSource.includes('"intelligence:synthesis-facts-proof"') &&
      includesAll(intelligenceSynthesisFactsProofSource, [
        'callEmbedding',
        'collectSourceBackedSynthesisFacts',
        'upsertSynthesisFactsBundle',
        'source_fact_proof',
        'maxTier: 1',
        'SRC-STRATEGY-001',
        'SRC-FINANCE-001',
        'SRC-OWNERS-001',
        'SRC-FUB-001',
        'SRC-SUPABASE-001',
        'SRC-FREEDOM-BHAG-001',
        'SRC-MEETINGS-001',
        'SYNTHESIS-ENGINE-001',
        'querySynthesisFacts',
        'sourceOverlapProof',
      ]) &&
      synthesisFactsSnapshot.latestSourceFactProofRun?.runType === 'source_fact_proof' &&
      synthesisFactsSnapshot.totalActiveFacts >= 20 &&
      synthesisFactsSnapshot.factsWithEvidence >= 1 &&
      synthesisFactsSnapshot.distinctSources >= 7 &&
      synthesisFactsSnapshot.activeFactsWithoutNaturalKey === 0 &&
      synthesisFactsSnapshot.duplicateActiveNaturalKeys === 0 &&
      synthesisFactsSnapshot.secondarySourceFacts >= 1 &&
      ['source_contract', 'goal_truth', 'operating_truth', 'kpi_truth', 'source_snapshot', 'source_health', 'retrieved_evidence'].every(type => synthesisFactTypes.has(type)) &&
      ['SRC-STRATEGY-001', 'SRC-FINANCE-001', 'SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-SUPABASE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-MEETINGS-001'].every(sourceId => synthesisFactSources.has(sourceId)),
    'SYNTHESIS-FACTS-001 persists source-backed facts and hybrid evidence for governed synthesis',
    `${synthesisFactsSnapshot.totalActiveFacts} facts / ${synthesisFactsSnapshot.distinctSources} sources / evidence-backed=${synthesisFactsSnapshot.factsWithEvidence} / duplicate-natural-keys=${synthesisFactsSnapshot.duplicateActiveNaturalKeys}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      'createIntelligenceSynthesisStore',
      'intelligenceSynthesisSchemaSql',
      'intelligenceSynthesis',
      "id: 'SYNTHESIS-ENGINE-001'",
      'Closed on 2026-04-27 after Steve accepted the repaired sample grain',
      "id: 'ACTION-ROUTER-001'",
    ]) &&
      includesAll(intelligenceSynthesisSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_synthesis_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_synthesized_items',
        'natural_key TEXT',
        'synthesis_scope_key TEXT',
        'idx_intelligence_synthesized_items_active_natural_key',
        'fact_refs TEXT[]',
        'evidence_refs TEXT[]',
        'evidence_chunk_refs TEXT[]',
        'owner_confidence TEXT',
        'ownerDecisionForFact',
        'no_clear_owner_signal',
        'synthesized items require evidenceChunkRefs.',
        'intelligence synthesis queries require maxTier >= 1',
        'themeKeyForFact',
        'classifyCluster',
        'strategyHubEligible',
        'legacy_unclustered_replaced_by_clustered_synthesis',
        'Clarify where leads come from',
        'activeUnclusteredUnprotectedItems',
        'routeableUnclusteredItems',
        'humanSampleRowsForItems',
        'latestProofQuality',
        'rankingPolicy',
        'ordered-for-review-without-weighted-score',
        'stale_after_governed_synthesis_refresh',
        'runGovernedSynthesis',
        'getSynthesisEngineSnapshot',
      ]) &&
      packageSource.includes('"intelligence:synthesis-proof"') &&
      includesAll(intelligenceSynthesisProofSource, [
        'promoteSharedCommunicationCandidatesToAtoms',
        'DIVERSITY_SOURCE_ID',
        'SRC-GMAIL-001',
        'synthesisScopeKey',
        'collectSourceBackedSynthesisFacts',
        'upsertSynthesisFactsBundle',
        'runGovernedSynthesis',
        'factRefs',
        'evidenceRefs',
        'evidenceChunkRefs',
        'strategyEligibleItems',
        'strategySingleEvidenceItems',
        'SYNTHESIS HUMAN SAMPLE',
        'humanSampleRows',
        'activeSurfaceQuality',
        'routeableUnclusteredItems',
        'maxTier: 1',
        'STRATEGY_TITLE_JARGON_PATTERN',
      ]) &&
      synthesisEngineSnapshot.latestProofRun?.runType === 'governed_synthesis_proof' &&
      synthesisEngineSnapshot.latestProofRun?.runId &&
      synthesisEngineSnapshot.activeItems >= 1 &&
      synthesisEngineSnapshot.itemsWithFactRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithEvidenceRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithEvidenceChunkRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithOwnerConfidence >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithActiveFactRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithActiveEvidenceRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.itemsWithActiveEvidenceChunkRefs >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.tierOneItems >= synthesisEngineSnapshot.activeItems &&
      synthesisEngineSnapshot.distinctItemSources >= 2 &&
      synthesisEngineSnapshot.latestProofQuality?.activeItems >= 1 &&
      synthesisEngineSnapshot.latestProofQuality?.clusteredItems >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.latestProofQuality?.itemsWithThemeMetadata >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.latestProofQuality?.strategyEligibleItems >= 1 &&
      synthesisEngineSnapshot.latestProofQuality?.strategyItemsWithMultiEvidence >= synthesisEngineSnapshot.latestProofQuality?.strategyEligibleItems &&
      synthesisEngineSnapshot.latestProofQuality?.strategySingleEvidenceItems === 0 &&
      synthesisEngineSnapshot.latestProofQuality?.duplicateThemeKeys === 0 &&
      synthesisEngineSnapshot.latestProofQuality?.humanSampleRows >= 5 &&
      synthesisEngineSnapshot.activeClusteredItems >= synthesisEngineSnapshot.latestProofQuality?.activeItems &&
      synthesisEngineSnapshot.activeUnclusteredUnprotectedItems === 0 &&
      synthesisEngineSnapshot.routeableUnclusteredItems === 0 &&
      intelligenceRetrievalSnapshot.bySource.filter(source => source.count > 0).length >= 2,
    'SYNTHESIS-ENGINE-001 clusters and classifies synthesized items instead of atom-thread spam',
    `${synthesisEngineSnapshot.activeItems} active items / latestProofQuality=${JSON.stringify(synthesisEngineSnapshot.latestProofQuality || {})} / latestProof=${synthesisEngineSnapshot.latestProofRun?.runId || 'missing'}`,
  )
  ensure(
    checks,
      includesAll(foundationDbSource, [
        'createIntelligenceActionRouterStore',
        'intelligenceActionRouterSchemaSql',
        'intelligenceActionRouter',
        'proposeActionRoutes',
        'getActionRoute',
        'getActionRouterSnapshot',
      ]) &&
      includesAll(intelligenceActionRouterSource, [
        'CREATE TABLE IF NOT EXISTS intelligence_action_router_runs',
        'CREATE TABLE IF NOT EXISTS intelligence_action_routes',
        'approval_required BOOLEAN NOT NULL DEFAULT TRUE',
        'approval_status TEXT NOT NULL DEFAULT',
        'human_required_before_destination_write',
        'needs-owner-decision',
        'applyApprovedActionRoute',
        'Action route approval requires an explicit human approver.',
        'destination_table TEXT NOT NULL',
        'fact_refs TEXT[]',
        'evidence_refs TEXT[]',
        'evidence_chunk_refs TEXT[]',
        'intelligence action router requires maxTier >= 1',
        'routes_with_active_synthesized_items',
        'applied_routes_with_destination_record',
        "approval_status = 'rejected'",
        "routing_status = 'ignored'",
        'rejected_by_human_review',
        'strategyHubEligible',
        'reviewSurface',
        'synthesizedItemAttributes',
        'routeScopeFilter',
        "attributes->>'synthesisQuality'",
        "metadata->>'legacySynthesisProtected'",
        "COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true'",
        'itemsVisibleToRouter',
        'strategyItemsVisibleToRouter',
        'strategyRoutes',
      ]) &&
      includesAll(packageSource, [
        '"intelligence:synthesis-refresh"',
        '"intelligence:action-router-proof"',
        '"intelligence:action-router-proposals"',
        '"intelligence:action-router-apply"',
      ]) &&
      includesAll(foundationJobsSource, [
        'intelligence-synthesis-spine-refresh',
        "args: ['run', 'intelligence:synthesis-refresh']",
        'intelligence-action-router-proposals',
        "args: ['run', 'intelligence:action-router-proposals']",
        'human-approval-required routes',
      ]) &&
      includesAll(intelligenceActionRouterProofSource, [
        'proposeActionRoutes',
        'getActionRouterSnapshot',
        'backlog_items',
        'decisions',
        'open_questions',
        'intelligence_synthesized_items',
        'routesWithSourceProvenance',
        'routesRequiringApproval',
        'ACTION-ROUTER-001',
        'STRATEGY-004',
      ]) &&
      actionRouterSnapshot.latestProofRun?.runType === 'router_proof' &&
      actionRouterSnapshot.totalRoutes >= 1 &&
      actionRouterSnapshot.routesWithSourceProvenance >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesWithOwner >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesRequiringApproval >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.tierOneRoutes >= actionRouterSnapshot.totalRoutes &&
      actionRouterSnapshot.routesWithActiveSynthesizedItems >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveFactRefs >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveEvidenceRefs >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.routesWithActiveEvidenceChunkRefs >= actionRouterSnapshot.guardedRoutes &&
      actionRouterSnapshot.appliedRoutes >= 1 &&
      actionRouterSnapshot.appliedRoutesWithDestinationRecord >= actionRouterSnapshot.appliedRoutesChecked &&
      actionRouterSnapshot.itemsVisibleToRouter === actionRouterSnapshot.activeClusteredItems &&
      (actionRouterSnapshot.strategyItemsVisibleToRouter >= 1 || actionRouterSnapshot.strategyRoutes >= 1) &&
      actionRouterSnapshot.unclusteredItemsVisibleToRouter === 0 &&
      actionRouterSnapshot.legacyProtectedItemsVisibleToRouter === 0 &&
      ['backlog_items', 'decisions', 'open_questions', 'intelligence_synthesized_items'].every(destinationTable =>
        (actionRouterSnapshot.routesByDestination || []).some(row => row.destinationTable === destinationTable && row.count >= 1)
      ),
    'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes',
    `${actionRouterSnapshot.totalRoutes} routes / pending=${actionRouterSnapshot.pendingRoutes} / applied=${actionRouterSnapshot.appliedRoutes} / strategyRoutes=${actionRouterSnapshot.strategyRoutes} / routerVisible=${actionRouterSnapshot.itemsVisibleToRouter}/${actionRouterSnapshot.activeClusteredItems} / strategyVisible=${actionRouterSnapshot.strategyItemsVisibleToRouter} / latestProof=${actionRouterSnapshot.latestProofRun?.runId || 'missing'}`,
  )
  ensure(
    checks,
    includesAll(foundationDbSource, ['markStaleFoundationJobRuns', 'Marked failed by stale active-run reaper', 'markStaleLlmCalls', 'Marked failed by stale LLM call reaper', 'markStaleSourceCrawlTargetRuns', 'Marked failed by stale source-crawl run reaper']) &&
      includesAll(foundationWorkerSource, ['markStaleFoundationJobRuns', 'markStaleLlmCalls', 'markStaleSourceCrawlTargetRuns', 'job ' + '${job.key}' + ' failed before completion', 'Foundation worker pass failed']),
    'Foundation worker catches job failures and reaps stale active runs/calls',
    'worker pass catches per-job failures, continues looping, and marks stale queued/running job runs, stale source-crawl target runs, and planned/started LLM calls failed before selecting due jobs',
  )
  ensure(
    checks,
    [foundationUiSource, docUiSource].every(source =>
      source.includes('isSafeDirectHref') &&
      source.includes("return isSafeDirectHref(href) ? href.trim() : '#'") &&
      source.includes("rel = 'noopener noreferrer'")
    ),
    'markdown-rendered links sanitize unsafe schemes',
    'Foundation and doc views disable unsafe href schemes and isolate external links; Strategy Hub v2 source-to-gap view does not render markdown',
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
      '--maxSheets=',
      '--maxSheetRows=',
      '--retrySkippedReasonPrefixes=',
    ]) &&
      includesAll(extractionControlSeedSource, [
        "maxPdfBytes: 80000000",
        "retrySkippedReasonPrefixes: ['pdf_too_large_for_v1', 'sheet_text_extraction_not_in_v1']",
        "maxSheetRows: 200",
      ]) &&
      includesAll(foundationDbSource, [
        'listDriveContentExtractionQueue',
        'retrySkippedReasonPrefixes',
        "drive_document",
        "drive_spreadsheet",
        "drive_pdf",
        "drive_text",
        "application/vnd.google-apps.spreadsheet",
        "text/markdown",
        'parentPathIncludes',
        'fileIds',
      ]) &&
      includesAll(googleDelegatedSource, [
        'getSpreadsheetMetadata',
        'getSheetValues',
      ]) &&
      includesAll(driveContentExtractionSource, [
        'GOOGLE_SHEET_MIME',
        'extractGoogleSheetText',
        'drive_google_sheet_values_v1',
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
    'Drive content extraction target supports governed Docs/Sheets/PDF/text/markdown/OCR/link inventory',
    'target runner passes sheet/PDF caps, retry prefixes, and DB queue/script support Drive document/spreadsheet/PDF/text/markdown artifacts, OCR fallback, and linked-doc access requests',
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
  const staleSourceCrawlRuns = await getStaleSourceCrawlTargetRuns({ olderThanMinutes: 30, limit: 10 })

  const sourceOfTruth = await fetchJson(baseUrl, '/api/source-of-truth')
  const systemInventory = await fetchJson(baseUrl, '/api/system-inventory')
  const foundationHub = await fetchJson(baseUrl, '/api/foundation-hub')
  const foundationBuildLog = await fetchJson(baseUrl, '/api/foundation/build-log?limit=40')
  const strategyPreworkCoverageApi = await fetchJson(baseUrl, '/api/strategic-execution/prework-coverage')
  const strategyGoalTruthApi = await fetchJson(baseUrl, '/api/strategic-execution/goal-truth')
  const strategyOperatingTruthApi = await fetchJson(baseUrl, '/api/strategic-execution/operating-truth')
  const strategyHubV2Api = await fetchJson(baseUrl, '/api/strategic-execution/v2')
  const opsHub = await fetchJson(baseUrl, '/api/ops-hub')
  const ownersLeadSourceGovernance = await fetchJson(baseUrl, '/api/owners/lead-source-governance')
  const ownersReviewQueue = await fetchJson(baseUrl, '/api/owners/review-queue')
  const extractionTargets = Array.isArray(foundationHub.extractionControl?.targets)
    ? foundationHub.extractionControl.targets
    : []
  const extractionCoverageTargets = Array.isArray(foundationHub.extractionControl?.coverageByTarget)
    ? foundationHub.extractionControl.coverageByTarget
    : []
  const extractionStaleActiveRuns = Array.isArray(foundationHub.extractionControl?.staleActiveRuns)
    ? foundationHub.extractionControl.staleActiveRuns
    : []
  const extractionRecentStaleReapedRuns = Array.isArray(foundationHub.extractionControl?.recentStaleReapedRuns)
    ? foundationHub.extractionControl.recentStaleReapedRuns
    : []
  const sourceTruthKpiHealth = sourceOfTruth.kpiHealth || {}
  const foundationHubKpiHealth = foundationHub.kpiHealth || {}
  const runtimeServedCode = foundationHub.runtimeSupervisor?.servedCode || {}
  const dashboardRunningCommit = String(runtimeServedCode.runningCommit || '').trim().toLowerCase()
  const dashboardRunningShortCommit = String(runtimeServedCode.runningShortCommit || dashboardRunningCommit.slice(0, 7) || 'missing')
  const currentRepoShortHead = currentRepoHead.slice(0, 7)
  const dashboardRestartCommand = runtimeServedCode.restartCommand || 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard'
  const servedCodeTrustDetail = dashboardRunningCommit
    ? dashboardRunningCommit === currentRepoHead
      ? `Dashboard is serving current commit ${dashboardRunningShortCommit}; HEAD is ${currentRepoShortHead}.`
      : `Dashboard is serving commit ${dashboardRunningShortCommit}; HEAD is ${currentRepoShortHead}. Run: ${dashboardRestartCommand} to restart.`
    : `Dashboard did not expose its server-start commit. Run: ${dashboardRestartCommand} to restart, then rerun foundation:verify.`
  const foundationSurfaceMap = getFoundationSurfaceMap()
  const foundationBuildCloseouts = getFoundationBuildCloseouts()
  const foundationBuildCloseoutValidation = getFoundationBuildCloseoutValidation()
  const foundationNavSections = Array.from(new Set(
    Array.from(foundationHtmlSource.matchAll(/data-section="([^"]+)"/g)).map(match => match[1])
  ))
  const foundationMappedSections = new Set(foundationSurfaceMap.map(surface => surface.section))
  const foundationSweepSections = new Set((foundationHub.surfaceFreshnessSweep?.surfaces || []).map(surface => surface.section))
  const knownStaleSlackRunId = 'crawl-slack-current-day-20260427145904292-3f93bebd'
  const nonStaleExtractionStatuses = new Set(['succeeded', 'partial', 'leased', 'running'])
  const scheduledExtractionTargets = extractionTargets.filter(target => target.scheduler?.source === 'foundation_job')
  const slackCurrentDayTarget = extractionTargets.find(target => target.targetKey === 'slack-current-day')
  const missiveCurrentDayTarget = extractionTargets.find(target => target.targetKey === 'missive-current-day')
  const driveCorpusTarget = extractionTargets.find(target => target.targetKey === 'drive-corpus-backfill')
  const driveContentTarget = extractionTargets.find(target => target.targetKey === 'drive-content-extract-backfill')
  const driveCorpusCoverage = extractionCoverageTargets.find(target => target.targetKey === 'drive-corpus-backfill')
  const driveContentCoverage = extractionCoverageTargets.find(target => target.targetKey === 'drive-content-extract-backfill')
  const googleDriveArchiveCoverage = Array.isArray(foundationHub.sharedCommunicationsCoverage?.sources)
    ? foundationHub.sharedCommunicationsCoverage.sources.find(source => source.sourceId === 'SRC-GDRIVE-001')
    : null
  const strategyPreworkParticipants = Array.isArray(strategyPreworkCoverageSnapshot.participants)
    ? strategyPreworkCoverageSnapshot.participants
    : []
  const strategyPreworkApiParticipants = Array.isArray(strategyPreworkCoverageApi.participants)
    ? strategyPreworkCoverageApi.participants
    : []
  const strategyPreworkNames = strategyPreworkParticipants.map(participant => participant.name)
  const strategyPreworkReadNames = strategyPreworkParticipants
    .filter(participant => participant.status !== 'missing')
    .map(participant => participant.name)
  const strategyGoalGroups = new Map((strategyGoalTruthSnapshot.groups || []).map(group => [group.key, group]))
  const strategyGoalApiGroups = new Map((strategyGoalTruthApi.groups || []).map(group => [group.key, group]))
  const strategyOperatingSourceIds = new Set((strategyOperatingTruthSnapshot.sourceCards || []).map(card => card.sourceId))
  const strategyOperatingApiSourceIds = new Set((strategyOperatingTruthApi.sourceCards || []).map(card => card.sourceId))
  const strategyHubV2Routes = Array.isArray(strategyHubV2Api.actionRouter?.recentRoutes)
    ? strategyHubV2Api.actionRouter.recentRoutes
    : []
  const strategyHubProofRoutes = strategyHubV2Routes.filter(route =>
    Array.isArray(route.sourceProof?.items) && route.sourceProof.items.length > 0
  )
  const strategyHubHumanProofItems = strategyHubProofRoutes
    .flatMap(route => route.sourceProof.items)
    .filter(item =>
      item?.sourceId &&
      item?.title &&
      item?.occurredAt &&
      (item?.from || (Array.isArray(item?.participants) && item.participants.length > 0)) &&
      item?.threadStatus &&
      item?.quote
    )

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
  const expectedKpiTableNames = EXPECTED_KPI_TABLES.map(item => item.table)
  const expectedKpiRpcNames = EXPECTED_KPI_RPCS.map(item => item.rpc)
  const sourceTruthKpiTables = Array.isArray(sourceTruthKpiHealth.tables) ? sourceTruthKpiHealth.tables : []
  const sourceTruthKpiRpcs = Array.isArray(sourceTruthKpiHealth.rpcs) ? sourceTruthKpiHealth.rpcs : []
  const sourceTruthKpiTableNames = sourceTruthKpiTables.map(item => item.table)
  const sourceTruthKpiRpcNames = sourceTruthKpiRpcs.map(item => item.rpc)
  const missingKpiTables = expectedKpiTableNames.filter(table => !sourceTruthKpiTableNames.includes(table))
  const missingKpiRpcs = expectedKpiRpcNames.filter(rpc => !sourceTruthKpiRpcNames.includes(rpc))
  ensure(
    checks,
    sourceTruthKpiHealth.contractVersion === 1 &&
      sourceTruthKpiHealth.primarySurface === KPI_HEALTH_PRIMARY_SURFACE &&
      sourceTruthKpiHealth.summary?.probeSilent === false &&
      sourceTruthKpiTables.length === expectedKpiTableNames.length &&
      sourceTruthKpiRpcs.length === expectedKpiRpcNames.length &&
      missingKpiTables.length === 0 &&
      missingKpiRpcs.length === 0 &&
      sourceTruthKpiHealth.schemaDrift?.status &&
      foundationHubKpiHealth.summary?.probeSilent === false,
    'Data Sources exposes KPI / Supabase health contract',
    missingKpiTables.length || missingKpiRpcs.length
      ? `missing tables=${missingKpiTables.join(',') || 'none'} rpcs=${missingKpiRpcs.join(',') || 'none'}`
      : `${sourceTruthKpiTables.length} tables / ${sourceTruthKpiRpcs.length} RPCs / status=${sourceTruthKpiHealth.summary?.status || 'unknown'}`,
  )
  ensure(
    checks,
    expectedKpiTableNames.every(table => kpiHealthSource.includes(`table: '${table}'`)) &&
      expectedKpiRpcNames.every(rpc => kpiHealthSource.includes(`rpc: '${rpc}'`)) &&
      includesAll(kpiHealthSource, [
        'KPI_HEALTH_CONTRACT_VERSION',
        'KPI_HEALTH_PRIMARY_SURFACE',
        'freshnessWindowDays',
        'KPI_HEALTH_LEE_REPO_PATH',
        'schemaDrift',
        'probeSilent',
      ]) &&
      includesAll(kpiHealthScriptSource, [
        'getKpiHealthSnapshot',
        'KPI_HEALTH_SUMMARY',
        'process.exitCode = 1',
      ]) &&
      includesAll(kpiSourceNote, [
        'Load-bearing tables',
        'Load-bearing RPCs',
        'Freshness windows are per source',
        'Lee repo/Supabase schema drift',
        'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health',
      ]),
    'KPI health probe codifies read rules, freshness, schema drift, and proof output',
    `${expectedKpiTableNames.length} tables / ${expectedKpiRpcNames.length} RPCs guarded in lib/kpi-health.js`,
  )
  const kpiHealthBacklog = (foundationHub.backlogItems || []).find(item => item.id === 'KPI-HEALTH-001') || null
  const kpiHealthBacklogText = [
    kpiHealthBacklog?.summary,
    kpiHealthBacklog?.whyItMatters,
    kpiHealthBacklog?.nextAction,
    kpiHealthBacklog?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    kpiHealthBacklog?.lane === 'done' &&
      kpiHealthBacklog?.priority === 'P1' &&
      expectedKpiTableNames.every(table => kpiHealthBacklogText.includes(table)) &&
      expectedKpiRpcNames.every(rpc => kpiHealthBacklogText.includes(rpc)) &&
      kpiHealthBacklogText.includes('Foundation > Data Sources > APIs / Apps > KPI / Supabase Health') &&
      kpiHealthBacklogText.includes('Runtime Health should only warn when the probe is unhealthy') &&
      currentPlan.includes('KPI-HEALTH-001` v1 now probes') &&
      currentState.includes('KPI-HEALTH-001` is done for v1'),
    'KPI-HEALTH-001 backlog and docs capture exact v1 acceptance',
    kpiHealthBacklog
      ? `${kpiHealthBacklog.lane} / ${kpiHealthBacklog.priority} / ${expectedKpiTableNames.length} tables / ${expectedKpiRpcNames.length} RPCs`
      : 'missing KPI-HEALTH-001',
  )
  ensure(
    checks,
    includesAll(foundationUiSource, [
      'renderKpiSupabaseHealthPanel',
      'KPI / Supabase Health',
      'Load-bearing KPI freshness and schema drift',
      'renderKpiHealthRuntimeWarning',
      'Runtime Health only surfaces KPI here when freshness, schema drift, or the health probe itself is unhealthy',
      '/foundation#source-apis:kpi-supabase-health',
    ]),
    'Foundation UI shows KPI health in Data Sources and warnings in Runtime Health',
    'primary KPI health panel is Data Sources; Runtime Health is warning-only',
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
    /^[0-9a-f]{40}$/.test(dashboardRunningCommit) &&
      dashboardRunningCommit === currentRepoHead &&
      runtimeServedCode.status === 'live' &&
      String(runtimeServedCode.plainEnglish || '').includes('server-start commit') &&
      String(runtimeServedCode.restartCommand || '').includes('launchctl kickstart') &&
      serverSource.includes('await captureDashboardRuntimeMetadata()') &&
      foundationUiSource.includes('renderServedCodeTrustPanel'),
    'dashboard served code matches current repo HEAD',
    servedCodeTrustDetail,
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
  ensure(
    checks,
    foundationSurfaceMap.length === foundationNavSections.length &&
      foundationNavSections.every(section => foundationMappedSections.has(section)) &&
      foundationNavSections.every(section => foundationSweepSections.has(section)) &&
      foundationSurfaceMap.every(surface =>
        surface.owner &&
        surface.href &&
        (surface.backingApis.length || surface.backingDocs.length || surface.backingTables.length) &&
        Array.isArray(surface.sourceIds) &&
        Array.isArray(surface.backlogIds)
      ) &&
      foundationHub.surfaceFreshnessSweep?.summary?.mappedSurfaceCount === foundationNavSections.length,
    'Foundation pages are mapped to backing APIs/docs/tables/source IDs/backlog owners',
    `${foundationSurfaceMap.length} mapped surfaces / ${foundationNavSections.length} nav sections`,
  )
  ensure(
    checks,
    foundationHub.surfaceFreshnessSweep?.summary &&
      typeof foundationHub.surfaceFreshnessSweep.summary.riskSurfaces === 'number' &&
      typeof foundationHub.surfaceFreshnessSweep.summary.staleActiveRunCount === 'number' &&
      Array.isArray(foundationHub.surfaceFreshnessSweep.findings) &&
      foundationUiSource.includes('renderSurfaceFreshnessSweepPanel'),
    'api/foundation-hub exposes the Foundation surface freshness sweep',
    foundationHub.surfaceFreshnessSweep?.summary
      ? `${foundationHub.surfaceFreshnessSweep.summary.mappedSurfaceCount} surfaces / risk=${foundationHub.surfaceFreshnessSweep.summary.riskSurfaces} / stale active runs=${foundationHub.surfaceFreshnessSweep.summary.staleActiveRunCount}`
      : 'missing surface freshness sweep payload',
  )
  const buildLogSweepBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('FOUNDATION-SWEEP-001')
  )
  const buildLogChangelogBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('FOUNDATION-CHANGELOG-002')
  )
  const buildLogSlackProofBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('EXTRACTION-TEAM-001') &&
      build.closeoutKey === 'slack-current-day-channel-proof'
  )
  const buildLogScheduleTruthBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('EXTRACT-CONTROL-001') &&
      build.closeoutKey === 'extract-control-schedule-truth'
  )
  const buildLogMissiveItemLedgerBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('EXTRACT-METRICS-001') &&
      build.closeoutKey === 'extract-metrics-missive-item-ledger'
  )
  const buildLogCoverageByTargetBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('EXTRACT-METRICS-001') &&
      build.closeoutKey === 'extract-metrics-coverage-by-target'
  )
  const buildLogDriveSheetsBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('DRIVE-CONTENT-001') &&
      build.closeoutKey === 'drive-content-sheets-text-extraction'
  )
  const buildLogKpiHealthBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('KPI-HEALTH-001') &&
      build.closeoutKey === 'kpi-health-supabase-probe'
  )
  const buildLogOperatorUxCaptureBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('FOUNDATION-SURFACE-UPDATES-001') &&
      build.closeoutKey === 'foundation-operator-ux-capture'
  )
  const buildLogServedCodeTrustBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('RUNTIME-SUPERVISOR-001') &&
      build.closeoutKey === 'runtime-supervisor-served-code-trust'
  )
  const buildLogBacklogHygieneBuild = (foundationBuildLog.builds || []).find(build =>
    (build.backlogIds || []).includes('BACKLOG-HYGIENE-PASS-001') &&
      build.closeoutKey === 'backlog-hygiene-pass'
  )
  ensure(
    checks,
    foundationBuildCloseoutValidation.schemaVersion === FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION &&
      foundationBuildCloseoutValidation.invalidCloseoutKeys.length === 0 &&
      foundationBuildCloseoutValidation.backlogIds.includes('FOUNDATION-SWEEP-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('FOUNDATION-CHANGELOG-002') &&
      foundationBuildCloseoutValidation.backlogIds.includes('EXTRACTION-TEAM-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('EXTRACT-SCHEDULE-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('EXTRACT-METRICS-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('FOUNDATION-SURFACE-UPDATES-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('DRIVE-CONTENT-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('KPI-HEALTH-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('ACTION-REVIEW-APPLY-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('RESEARCH-INBOX-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('RUNTIME-HEALTH-SIMPLIFY-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('RUNTIME-SUPERVISOR-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('SYSTEM-010') &&
      foundationBuildCloseoutValidation.backlogIds.includes('BACKLOG-HYGIENE-PASS-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('BACKLOG-HYGIENE-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('DEV-PROCESS-AUDIT-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('PROCESS-HOOKS-001') &&
      foundationBuildCloseoutValidation.backlogIds.includes('SOURCE-021-PROOF-001') &&
      foundationBuildCloseouts.every(record =>
        record.whereItLives.length &&
        record.proofCommands.length &&
        record.reviewNext &&
        record.whatChanged &&
        record.whatItDoes &&
        record.whyItMatters
      ),
    'Foundation build closeout records satisfy the Recent Builds v2 schema',
    `${foundationBuildCloseoutValidation.closeoutCount} closeouts / invalid=${foundationBuildCloseoutValidation.invalidCloseoutKeys.length}`,
  )
  ensure(
    checks,
    foundationBuildLog.schemaVersion === FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION &&
      foundationBuildLog.summary?.closeoutBuilds >= 2 &&
      foundationBuildLog.summary?.backlogLinkedBuilds >= 2 &&
      foundationBuildLog.summary?.proofLinkedBuilds >= 2 &&
      Array.isArray(foundationBuildLog.groups) &&
      foundationBuildLog.groups.some(day => Array.isArray(day.systemGroups) && day.systemGroups.length) &&
      includesAll(foundationUiSource, [
        'renderBuildGroups',
        'renderBuildBacklogLinks',
        'Grouped By Day And System',
        'v2 closeouts',
      ]),
    'api/foundation/build-log exposes operator-readable grouped closeouts',
    foundationBuildLog.summary
      ? `${foundationBuildLog.summary.closeoutBuilds} closeouts / ${foundationBuildLog.summary.backlogLinkedBuilds} backlog-linked / ${foundationBuildLog.summary.proofLinkedBuilds} proof-linked`
      : 'missing build log summary',
  )
  ensure(
    checks,
    buildLogSweepBuild?.operatorCloseout === true &&
      buildLogSweepBuild.relatedBacklog?.some(item => item.id === 'FOUNDATION-SWEEP-001' && item.lane === 'done') &&
      buildLogSweepBuild.proofCommands?.includes('npm run foundation:verify') &&
      /31|Foundation nav|stale/i.test(buildLogSweepBuild.whatChanged || '') &&
      buildLogSweepBuild.reviewNext &&
      buildLogSweepBuild.knownLimits?.length,
    'Recent Builds v2 carries closeout proof for FOUNDATION-SWEEP-001',
    buildLogSweepBuild
      ? `${buildLogSweepBuild.shortSha} / ${buildLogSweepBuild.acceptanceState} / ${buildLogSweepBuild.proofStatus}`
      : 'missing FOUNDATION-SWEEP-001 build closeout',
  )
  ensure(
    checks,
    buildLogChangelogBuild?.operatorCloseout === true &&
      buildLogChangelogBuild.relatedBacklog?.some(item => item.id === 'FOUNDATION-CHANGELOG-002' && item.lane === 'done') &&
      buildLogChangelogBuild.proofCommands?.includes('npm run foundation:verify') &&
      /operator changelog|Recent Builds/i.test(buildLogChangelogBuild.whatChanged || '') &&
      /backlog/i.test([
        buildLogChangelogBuild.whatChanged,
        buildLogChangelogBuild.whatItDoes,
        buildLogChangelogBuild.reviewNext,
      ].filter(Boolean).join(' ')) &&
      buildLogChangelogBuild.knownLimits?.length,
    'Recent Builds v2 carries closeout proof for FOUNDATION-CHANGELOG-002',
    buildLogChangelogBuild
      ? `${buildLogChangelogBuild.shortSha} / ${buildLogChangelogBuild.acceptanceState} / ${buildLogChangelogBuild.proofStatus}`
      : 'missing FOUNDATION-CHANGELOG-002 build closeout',
  )
  ensure(
    checks,
    buildLogSlackProofBuild?.operatorCloseout === true &&
      buildLogSlackProofBuild.relatedBacklog?.some(item => item.id === 'EXTRACTION-TEAM-001' && item.lane === 'scoped') &&
      buildLogSlackProofBuild.proofCommands?.some(command => command.includes('--target=slack-current-day')) &&
      buildLogSlackProofBuild.proofCommands?.includes('npm run foundation:verify') &&
      /Slack current-day|channel/i.test(buildLogSlackProofBuild.whatChanged || '') &&
      /61 channel items|foundation:verify/i.test(buildLogSlackProofBuild.proofStatus || '') &&
      buildLogSlackProofBuild.knownLimits?.some(limit => /broad Slack history|broad backfill/i.test(limit)),
    'Recent Builds v2 carries closeout proof for Slack current-day item proof',
    buildLogSlackProofBuild
      ? `${buildLogSlackProofBuild.shortSha} / ${buildLogSlackProofBuild.acceptanceState} / ${buildLogSlackProofBuild.proofStatus}`
      : 'missing Slack current-day build closeout',
  )
  ensure(
    checks,
    buildLogScheduleTruthBuild?.operatorCloseout === true &&
      buildLogScheduleTruthBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-CONTROL-001' && ['scoped', 'done'].includes(item.lane)) &&
      buildLogScheduleTruthBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-SCHEDULE-001' && item.lane === 'done') &&
      buildLogScheduleTruthBuild.proofCommands?.includes('npm run foundation:verify') &&
      /Foundation job runtime as visible next-run truth/i.test(buildLogScheduleTruthBuild.whatChanged || '') &&
      /coverage-by-target/i.test(buildLogScheduleTruthBuild.reviewNext || ''),
    'Recent Builds v2 carries closeout proof for extraction schedule truth',
    buildLogScheduleTruthBuild
      ? `${buildLogScheduleTruthBuild.shortSha} / ${buildLogScheduleTruthBuild.acceptanceState} / ${buildLogScheduleTruthBuild.proofStatus}`
      : 'missing extraction schedule truth closeout',
  )
  ensure(
    checks,
    buildLogMissiveItemLedgerBuild?.operatorCloseout === true &&
      buildLogMissiveItemLedgerBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-METRICS-001' && ['scoped', 'done'].includes(item.lane)) &&
      buildLogMissiveItemLedgerBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-CONTROL-001' && ['scoped', 'done'].includes(item.lane)) &&
      buildLogMissiveItemLedgerBuild.proofCommands?.some(command => command.includes('--target=missive-current-day')) &&
      buildLogMissiveItemLedgerBuild.proofCommands?.includes('npm run foundation:verify') &&
      /Missive current-day|conversation/i.test(buildLogMissiveItemLedgerBuild.whatChanged || '') &&
      /100 conversation items|foundation:verify/i.test(buildLogMissiveItemLedgerBuild.proofStatus || '') &&
      /coverage-by-target/i.test(buildLogMissiveItemLedgerBuild.reviewNext || ''),
    'Recent Builds v2 carries closeout proof for Missive current-day item ledger',
    buildLogMissiveItemLedgerBuild
      ? `${buildLogMissiveItemLedgerBuild.shortSha} / ${buildLogMissiveItemLedgerBuild.acceptanceState} / ${buildLogMissiveItemLedgerBuild.proofStatus}`
      : 'missing Missive item-ledger build closeout',
  )
  ensure(
    checks,
    buildLogCoverageByTargetBuild?.operatorCloseout === true &&
      buildLogCoverageByTargetBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-METRICS-001' && item.lane === 'done') &&
      buildLogCoverageByTargetBuild.relatedBacklog?.some(item => item.id === 'EXTRACT-CONTROL-001' && item.lane === 'done') &&
      buildLogCoverageByTargetBuild.relatedBacklog?.some(item => item.id === 'FOUNDATION-SURFACE-UPDATES-001' && item.lane === 'scoped') &&
      buildLogCoverageByTargetBuild.proofCommands?.includes('npm run foundation:verify') &&
      /coverage-by-target|Coverage By Target/i.test(buildLogCoverageByTargetBuild.whatChanged || '') &&
      /Runtime Health/i.test(buildLogCoverageByTargetBuild.whereItLives?.join(' ') || '') &&
      /EXTRACT-RETRY-001/i.test(buildLogCoverageByTargetBuild.reviewNext || ''),
    'Recent Builds v2 carries closeout proof for extraction coverage-by-target',
    buildLogCoverageByTargetBuild
      ? `${buildLogCoverageByTargetBuild.shortSha} / ${buildLogCoverageByTargetBuild.acceptanceState} / ${buildLogCoverageByTargetBuild.proofStatus}`
      : 'missing extraction coverage-by-target closeout',
  )
  ensure(
    checks,
    buildLogDriveSheetsBuild?.operatorCloseout === true &&
      buildLogDriveSheetsBuild.relatedBacklog?.some(item => item.id === 'DRIVE-CONTENT-001' && item.lane === 'scoped') &&
      buildLogDriveSheetsBuild.relatedBacklog?.some(item => item.id === 'RUNTIME-SUPERVISOR-001' && item.lane === 'scoped') &&
      buildLogDriveSheetsBuild.proofCommands?.some(command => command.includes('--target=drive-content-extract-backfill')) &&
      buildLogDriveSheetsBuild.proofCommands?.includes('npm run foundation:verify') &&
      /Google Sheets|drive_spreadsheet/i.test(buildLogDriveSheetsBuild.whatChanged || '') &&
      /308,697 chars|foundation:verify/i.test(buildLogDriveSheetsBuild.proofStatus || '') &&
      /EXTRACT-RETRY-001/i.test(buildLogDriveSheetsBuild.knownLimits?.join(' ') || ''),
    'Recent Builds v2 carries closeout proof for Drive Sheets text extraction',
    buildLogDriveSheetsBuild
      ? `${buildLogDriveSheetsBuild.shortSha} / ${buildLogDriveSheetsBuild.acceptanceState} / ${buildLogDriveSheetsBuild.proofStatus}`
      : 'missing Drive Sheets text extraction closeout',
  )
  ensure(
    checks,
    buildLogKpiHealthBuild?.operatorCloseout === true &&
      buildLogKpiHealthBuild.relatedBacklog?.some(item => item.id === 'KPI-HEALTH-001' && item.lane === 'done') &&
      buildLogKpiHealthBuild.relatedBacklog?.some(item => item.id === 'SOURCE-010' && item.lane === 'done') &&
      buildLogKpiHealthBuild.proofCommands?.includes('npm run kpi:health') &&
      buildLogKpiHealthBuild.proofCommands?.includes('npm run foundation:verify') &&
      /KPI \/ Supabase health probe/i.test(buildLogKpiHealthBuild.whatChanged || '') &&
      /14\/14 tables|5\/5 RPCs|foundation:verify/i.test(buildLogKpiHealthBuild.proofStatus || '') &&
      /Action Router/i.test(buildLogKpiHealthBuild.reviewNext || ''),
    'Recent Builds v2 carries closeout proof for KPI health',
    buildLogKpiHealthBuild
      ? `${buildLogKpiHealthBuild.shortSha} / ${buildLogKpiHealthBuild.acceptanceState} / ${buildLogKpiHealthBuild.proofStatus}`
      : 'missing KPI health closeout',
  )
  ensure(
    checks,
    buildLogOperatorUxCaptureBuild?.operatorCloseout === true &&
      buildLogOperatorUxCaptureBuild.relatedBacklog?.some(item => item.id === 'FOUNDATION-SURFACE-UPDATES-001' && item.lane === 'scoped') &&
      buildLogOperatorUxCaptureBuild.relatedBacklog?.some(item => item.id === 'ACTION-REVIEW-APPLY-001' && item.lane === 'scoped') &&
      buildLogOperatorUxCaptureBuild.proofCommands?.includes('npm run foundation:verify') &&
      /plain-English Foundation UX standard/i.test(buildLogOperatorUxCaptureBuild.whatChanged || '') &&
      /Overview -> Systems -> Backlog -> Recent Work/i.test(buildLogOperatorUxCaptureBuild.whatItDoes || '') &&
      /ACTION-REVIEW-APPLY-001/i.test(buildLogOperatorUxCaptureBuild.reviewNext || ''),
    'Recent Builds v2 carries closeout proof for Foundation operator UX capture',
    buildLogOperatorUxCaptureBuild
      ? `${buildLogOperatorUxCaptureBuild.shortSha} / ${buildLogOperatorUxCaptureBuild.acceptanceState} / ${buildLogOperatorUxCaptureBuild.proofStatus}`
      : 'missing Foundation operator UX capture closeout',
  )
  ensure(
    checks,
    buildLogServedCodeTrustBuild?.operatorCloseout === true &&
      buildLogServedCodeTrustBuild.relatedBacklog?.some(item => item.id === 'RUNTIME-SUPERVISOR-001' && item.lane === 'scoped') &&
      buildLogServedCodeTrustBuild.relatedBacklog?.some(item => item.id === 'SYSTEM-010' && item.lane === 'scoped') &&
      buildLogServedCodeTrustBuild.relatedBacklog?.some(item => item.id === 'ACTION-REVIEW-APPLY-001' && item.lane === 'scoped') &&
      buildLogServedCodeTrustBuild.proofCommands?.includes('npm run foundation:verify') &&
      /server-start commit|repo HEAD|restart command/i.test(buildLogServedCodeTrustBuild.whatItDoes || '') &&
      /ACTION-REVIEW-APPLY-001/i.test(buildLogServedCodeTrustBuild.reviewNext || '') &&
      /auto-restart-on-push/i.test(buildLogServedCodeTrustBuild.knownLimits?.join(' ') || ''),
    'Recent Builds v2 carries closeout proof for served-code trust',
    buildLogServedCodeTrustBuild
      ? `${buildLogServedCodeTrustBuild.shortSha} / ${buildLogServedCodeTrustBuild.acceptanceState} / ${buildLogServedCodeTrustBuild.proofStatus}`
      : 'missing served-code trust closeout',
  )
  ensure(
    checks,
    buildLogBacklogHygieneBuild?.operatorCloseout === true &&
      buildLogBacklogHygieneBuild.relatedBacklog?.some(item => item.id === 'BACKLOG-HYGIENE-PASS-001' && item.lane === 'done') &&
      buildLogBacklogHygieneBuild.relatedBacklog?.some(item => item.id === 'BACKLOG-HYGIENE-001' && item.lane === 'scoped') &&
      buildLogBacklogHygieneBuild.relatedBacklog?.some(item => item.id === 'PROCESS-HOOKS-001' && item.lane === 'scoped') &&
      buildLogBacklogHygieneBuild.relatedBacklog?.some(item => item.id === 'FOUNDATION-SURFACE-UPDATES-001' && item.lane === 'scoped') &&
      buildLogBacklogHygieneBuild.proofCommands?.includes('npm run foundation:verify') &&
      /stale|unclear|split completed proof/i.test(buildLogBacklogHygieneBuild.whatChanged || '') &&
      /BACKLOG-HYGIENE-001/i.test(buildLogBacklogHygieneBuild.reviewNext || '') &&
      /FOUNDATION-SURFACE-UPDATES-001/i.test(buildLogBacklogHygieneBuild.knownLimits?.join(' ') || ''),
    'Recent Builds v2 carries closeout proof for backlog hygiene pass',
    buildLogBacklogHygieneBuild
      ? `${buildLogBacklogHygieneBuild.shortSha} / ${buildLogBacklogHygieneBuild.acceptanceState} / ${buildLogBacklogHygieneBuild.proofStatus}`
      : 'missing backlog hygiene pass closeout',
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
        'getStrategyGoalTruthSnapshot',
        'getStrategyOperatingTruthSnapshot',
        'current_goal_truth',
        'current_operating_truth',
        'goal_claim_rule',
        'operating_truth_rule',
        'recordSharedCommunicationSynthesisRun',
        "packetType: 'strategy_evidence_packet_v1'",
      ]) &&
      includesAll(foundationJobsSource, [
        "key: 'strategy-evidence-packet-v1'",
        "servesHubs: ['strategy']",
        'Strategy Evidence Packet V1',
      ]) &&
      serverSource.includes('packetType = req.query.packetType') &&
      strategyEvidencePacketSource.includes('priorityRecommendationFeedDisabled: true') &&
      !strategyEvidencePacketSource.includes('recommended_90_day_priorities: {') &&
      !strategyEvidencePacketSource.includes("packetSection: 'recommended_90_day_priorities'") &&
      !strategyEvidencePacketSource.includes("itemType: 'action_item'") &&
      includesAll(strategicExecutionUiSource, [
        'Strategy Command',
        'Goal And Operating Truth',
        'source-to-gap manifest',
        'Advisor remains blocked',
      ]),
    'Strategy Evidence Packet v1 remains debug/history while active priority generation is disabled',
    'strategy:evidence-packet persists packetType=strategy_evidence_packet_v1, but no longer generates active 90-day priority action items',
  )
  ensure(
    checks,
    strategyGoalGroups.get('team_volume')?.status === 'behind' &&
      /Behind/.test(strategyGoalGroups.get('team_volume')?.statusLabel || '') &&
      strategyGoalGroups.get('community_agents')?.status === 'ahead' &&
      /Ahead/.test(strategyGoalGroups.get('community_agents')?.statusLabel || '') &&
      strategyGoalGroups.get('agent_engine_capacity')?.status === 'behind' &&
      /Behind/.test(strategyGoalGroups.get('agent_engine_capacity')?.statusLabel || '') &&
      strategyGoalApiGroups.get('community_agents')?.status === 'ahead' &&
      serverSource.includes("app.get('/api/strategic-execution/goal-truth'") &&
      serverSource.includes('currentGoalTruth') &&
      foundationDbSource.includes('getStrategyGoalTruthSnapshot') &&
      foundationDbSource.includes('Team Goal: $2B') &&
      foundationDbSource.includes('Community Goal: 10,000 Agents') &&
      foundationDbSource.includes('Agent Engine Capacity'),
    'Strategy goal truth guardrails distinguish live BHAG and Agent Engine pace',
    [
      `team=${strategyGoalGroups.get('team_volume')?.statusLabel || 'missing'}`,
      `community=${strategyGoalGroups.get('community_agents')?.statusLabel || 'missing'}`,
      `capacity=${strategyGoalGroups.get('agent_engine_capacity')?.statusLabel || 'missing'}`,
    ].join(' / '),
  )
  ensure(
    checks,
    ['SRC-OWNERS-001', 'SRC-FINANCE-001', 'SRC-FUB-001', 'SRC-SUPABASE-001'].every(sourceId =>
      strategyOperatingSourceIds.has(sourceId) && strategyOperatingApiSourceIds.has(sourceId)
    ) &&
      strategyOperatingTruthSnapshot.rule?.includes('Shared-comms candidates are leads/evidence, not final operating truth') &&
      serverSource.includes("app.get('/api/strategic-execution/operating-truth'") &&
      serverSource.includes('currentOperatingTruth') &&
      foundationDbSource.includes('getStrategyOperatingTruthSnapshot') &&
      foundationDbSource.includes('Do not recommend "install weekly finance truth" as if the source does not exist'),
    'Strategy operating truth guardrails force live Owners/Finance/FUB/KPI checks before recommendations',
    `sources=${Array.from(strategyOperatingSourceIds).join(', ')}`,
  )
  ensure(
    checks,
      serverSource.includes("app.post('/api/strategic-execution/advisor'") &&
      serverSource.includes("app.get('/api/strategic-execution/v2'") &&
      serverSource.includes("app.post('/api/strategic-execution/action-routes/:routeId/review'") &&
      serverSource.includes('approveActionRoute') &&
      serverSource.includes('applyApprovedActionRoute') &&
      serverSource.includes('rejectActionRoute') &&
      serverSource.includes('rerouteActionRoute') &&
      serverSource.includes('saveStrategyHubSnapshot') &&
      serverSource.includes('getStrategyHubSnapshot') &&
      serverSource.includes('isStrategyHubReviewRoute') &&
      foundationDbSource.includes('CREATE TABLE IF NOT EXISTS strategy_hub_snapshots') &&
      serverSource.includes('strategy_hub_v2_in_progress') &&
      serverSource.includes('Strategy Advisor is offline while Strategy Hub v2 rebuilds deterministic source snapshots') &&
      strategicExecutionUiSource.includes('/api/strategic-execution/v2') &&
      strategicExecutionUiSource.includes('/api/strategic-execution/action-routes/') &&
      strategicExecutionUiSource.includes('function renderSourceToGap') &&
      strategicExecutionUiSource.includes('function renderOverview') &&
      strategicExecutionUiSource.includes('function renderRouteReview') &&
      strategicExecutionUiSource.includes('function sectionFromHash') &&
      strategicExecutionUiSource.includes('Strategic review') &&
      strategicExecutionUiSource.includes('strategy prep, source-map gaps, goal gaps, and pillar decisions') &&
      strategicExecutionUiSource.includes('Operating tasks stay out of Strategy') &&
      strategicExecutionUiSource.includes('function renderSourceProof') &&
      strategicExecutionUiSource.includes('Owner decision') &&
      strategicExecutionUiSource.includes('Snooze for') &&
      strategicExecutionUiSource.includes('1 day') &&
      strategicExecutionUiSource.includes('1 week') &&
      strategicExecutionUiSource.includes('1 month') &&
      strategicExecutionUiSource.includes('1 quarter') &&
      strategicExecutionUiSource.includes('Custom date') &&
      strategicExecutionUiSource.includes('Action guide') &&
      strategicExecutionUiSource.includes('Applied / done') &&
      strategicExecutionUiSource.includes('Technical refs') &&
      strategicExecutionUiSource.includes('Proof items: ') &&
      strategicExecutionUiSource.includes("provenance.open = route.approvalStatus === 'pending'") &&
      intelligenceActionRouterSource.includes('buildSourceProofForRoute') &&
      intelligenceActionRouterSource.includes('enrichRoutesWithSourceProof') &&
      serverSource.includes('resolveSnoozeUntil') &&
      serverSource.includes('snoozeDuration') &&
      serverSource.includes('normalizeRouteOwnerInput') &&
      strategicExecutionUiSource.includes('window.confirm') &&
      strategicExecutionUiSource.includes('Optional review note') &&
      strategicExecutionUiSource.includes('Source fallback active') &&
      strategicExecutionUiSource.includes('Advisor remains blocked') &&
      strategyHubV2Api.mode === 'source_to_gap_route_review' &&
      strategyHubV2Api.advisorStatus === 'strategy_hub_v2_in_progress' &&
      ['live', 'degraded'].includes(strategyHubV2Api.sourceTruthStatus) &&
      strategyHubV2Api.goalTruth?.groups?.length >= 3 &&
      strategyHubV2Api.operatingTruth?.sourceCards?.length >= 4 &&
      Array.isArray(strategyHubV2Routes) &&
      strategyHubV2Api.actionRouter?.totalRoutes === strategyHubV2Routes.length &&
      Number(strategyHubV2Api.operationalRouteSummary?.hiddenRoutes || 0) >= 1 &&
      strategyHubProofRoutes.length >= 1 &&
      strategyHubHumanProofItems.length >= strategyHubProofRoutes.length &&
      strategyHubV2Routes.every(route =>
        route.approvalRequired === true &&
        route.synthesizedItemId &&
        Array.isArray(route.factRefs) && route.factRefs.length > 0 &&
        Array.isArray(route.evidenceRefs) && route.evidenceRefs.length > 0 &&
        Array.isArray(route.evidenceChunkRefs) && route.evidenceChunkRefs.length > 0
      ) &&
      strategyHubV2Api.retrievalEval?.status === 'succeeded' &&
      !strategicExecutionUiSource.includes('/api/strategic-execution/advisor') &&
      !strategicExecutionUiSource.includes('renderStrategyAdvisorWorkspace') &&
      !strategicExecutionUiSource.includes('renderRecommendedPriorities') &&
      !strategicExecutionUiSource.includes('AI-Suggested 90-Day Priorities') &&
      !serverSource.includes('recommended90DayPriorities:'),
    'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline',
    `strategyRoutes=${strategyHubV2Api.actionRouter?.totalRoutes || 0} / hiddenOperational=${strategyHubV2Api.operationalRouteSummary?.hiddenRoutes || 0} / eval=${strategyHubV2Api.retrievalEval?.status || 'missing'}`,
  )
  ensure(
    checks,
    strategyPreworkCoverageSnapshot.summary?.expectedCount >= 9 &&
      strategyPreworkCoverageSnapshot.summary?.readCount >= 8 &&
      strategyPreworkCoverageSnapshot.summary?.artifactCount >= 10 &&
      strategyPreworkApiParticipants.length === strategyPreworkParticipants.length &&
      ['Steve Zahnd', 'Scott Benson', 'Ryan Campbell', 'Carson', 'Georgia Huntley', 'Nick Bergmann', 'Clare', 'Ahsan', 'Blake Berfelz'].every(name => strategyPreworkNames.includes(name)) &&
      ['Steve Zahnd', 'Scott Benson', 'Ryan Campbell', 'Carson', 'Georgia Huntley', 'Nick Bergmann', 'Clare', 'Ahsan'].every(name => strategyPreworkReadNames.includes(name)) &&
      serverSource.includes("app.get('/api/strategic-execution/prework-coverage'") &&
      serverSource.includes('preworkReadCoverage') &&
      foundationDbSource.includes('getStrategyPreworkCoverageSnapshot') &&
      foundationDbSource.includes('strategyPreworkExpectedParticipants') &&
      foundationDbSource.includes('pdfFormFieldsUsed'),
    'Strategy pre-work read coverage API remains source-backed while advisor stays offline',
    `${strategyPreworkCoverageSnapshot.summary?.readCount || 0}/${strategyPreworkCoverageSnapshot.summary?.expectedCount || 0} expected notes read; API keeps missing rows explicit while source-to-gap view is active`,
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
      typeof foundationHub.extractionControl.summary.staleActiveRuns === 'number' &&
      typeof foundationHub.extractionControl.summary.recentStaleReapedRuns === 'number' &&
      typeof foundationHub.extractionControl.summary.targetRiskFindings === 'number' &&
      typeof foundationHub.extractionControl.summary.targetWarningFindings === 'number' &&
      Array.isArray(foundationHub.extractionControl.staleActiveRuns) &&
      Array.isArray(foundationHub.extractionControl.recentStaleReapedRuns) &&
      extractionTargets.length > 0 &&
      extractionTargets.every(target => target.itemSummary && Array.isArray(target.healthFindings)) &&
      Array.isArray(foundationHub.extractionControl.recentItems) &&
      Array.isArray(foundationHub.extractionControl.recentRuns),
    'api/foundation-hub exposes extraction control targets',
    foundationHub.extractionControl?.summary
      ? `${foundationHub.extractionControl.summary.targetCount} targets / ${foundationHub.extractionControl.summary.currentDayTargets} current-day / ${foundationHub.extractionControl.recentItems?.length ?? 0} recent items / ${foundationHub.extractionControl.recentRuns?.length ?? 0} recent runs / stale active=${foundationHub.extractionControl.summary.staleActiveRuns} / findings=${foundationHub.extractionControl.summary.targetRiskFindings} risk ${foundationHub.extractionControl.summary.targetWarningFindings} warning`
      : 'missing extraction control payload',
  )
  ensure(
    checks,
    includesAll(foundationDbSource, [
      'getSourceCrawlTargetItemSummaries',
      'buildSourceCrawlTargetHealthFindings',
      'missing_slack_channel_item_proof',
    ]) &&
      includesAll(foundationUiSource, [
        'itemSummary',
        'healthFindings',
        'targetRiskFindings',
        'targetWarningFindings',
      ]) &&
      includesAll(syncSlackSource, [
        'upsertSourceCrawlItem',
        'slack_channel',
        'EXTRACTION_TARGET_SUMMARY',
        'Crawl items failed',
      ]) &&
      includesAll(syncMissiveSource, [
        'upsertSourceCrawlItem',
        'missive_conversation',
        'EXTRACTION_TARGET_SUMMARY',
        'Crawl items failed',
      ]),
    'Runtime Health surfaces extraction item summaries and findings',
    'Foundation DB, UI, Slack runner, and Missive runner include item-level proof/finding hooks',
  )
  ensure(
    checks,
    extractionCoverageTargets.length === extractionTargets.length &&
      extractionCoverageTargets.length > 0 &&
      extractionCoverageTargets.every(target =>
        target.targetKey &&
        Object.prototype.hasOwnProperty.call(target, 'lastSuccessAt') &&
        Object.prototype.hasOwnProperty.call(target, 'lastFailureAt') &&
        Object.prototype.hasOwnProperty.call(target, 'nextBiteAt') &&
        target.counts &&
        Object.prototype.hasOwnProperty.call(target.counts, 'totalItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'succeededItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'skippedItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'failedItems') &&
        Array.isArray(target.topReasons) &&
        Array.isArray(target.remainingBacklogIndicators)
      ) &&
      extractionCoverageTargets.some(target => Number(target.counts.skippedItems || 0) > 0 && target.topReasons.length > 0) &&
      driveCorpusCoverage?.remainingBacklogIndicators?.some(indicator => /Queued Drive folders/i.test(indicator.label || '')) &&
      driveContentCoverage?.topReasons?.some(reason => reason.status === 'skipped') &&
      includesAll(foundationDbSource, [
        'getSourceCrawlTargetRunCoverage',
        'buildSourceCrawlTargetCoverage',
        'coverageByTarget',
        'remainingBacklogIndicators',
      ]) &&
      includesAll(foundationUiSource, [
        'renderExtractionCoverageCard',
        'Extraction Control: Coverage By Target',
        'Last success',
        'Last failure',
        'Next bite',
        'Top failed/skipped reasons',
        'Remaining backlog',
      ]),
    'Runtime Health exposes extraction coverage-by-target',
    extractionCoverageTargets.length
      ? `${extractionCoverageTargets.length} targets / skipped-visible=${extractionCoverageTargets.filter(target => Number(target.counts?.skippedItems || 0) > 0).length} / backlog-indicators=${extractionCoverageTargets.filter(target => target.remainingBacklogIndicators?.length).length}`
      : 'missing coverageByTarget payload',
  )
  ensure(
    checks,
    Number(googleDriveArchiveCoverage?.artifactTypes?.drive_spreadsheet?.total || 0) >= 5,
    'Drive Sheets extraction archived source artifacts',
    googleDriveArchiveCoverage?.artifactTypes?.drive_spreadsheet
      ? `${googleDriveArchiveCoverage.artifactTypes.drive_spreadsheet.total} Drive spreadsheet artifacts`
      : 'missing drive_spreadsheet artifacts',
  )
  ensure(
    checks,
    slackCurrentDayTarget?.itemSummary &&
      Number(slackCurrentDayTarget.itemSummary.totalItems || 0) > 0 &&
      Array.isArray(slackCurrentDayTarget.healthFindings) &&
      nonStaleExtractionStatuses.has(slackCurrentDayTarget.lastStatus) &&
      !String(slackCurrentDayTarget.lastError || '').includes('stale source-crawl run reaper'),
    'Slack current-day crawl has channel-level item proof after stale-run recovery',
    slackCurrentDayTarget?.itemSummary
      ? `${slackCurrentDayTarget.lastStatus || 'unknown'} / ${slackCurrentDayTarget.itemSummary.totalItems || 0} items / ${slackCurrentDayTarget.itemSummary.succeededItems || 0} succeeded / ${slackCurrentDayTarget.itemSummary.skippedItems || 0} skipped / ${slackCurrentDayTarget.itemSummary.failedItems || 0} failed`
      : 'missing slack-current-day target item summary',
  )
  ensure(
    checks,
    missiveCurrentDayTarget?.itemSummary &&
      Number(missiveCurrentDayTarget.itemSummary.totalItems || 0) >= 100 &&
      Number(missiveCurrentDayTarget.itemSummary.skippedItems || 0) >= 1 &&
      Number(missiveCurrentDayTarget.itemSummary.failedItems || 0) === 0 &&
      Array.isArray(missiveCurrentDayTarget.healthFindings) &&
      nonStaleExtractionStatuses.has(missiveCurrentDayTarget.lastStatus),
    'Missive current-day crawl has conversation-level item proof',
    missiveCurrentDayTarget?.itemSummary
      ? `${missiveCurrentDayTarget.lastStatus || 'unknown'} / ${missiveCurrentDayTarget.itemSummary.totalItems || 0} items / ${missiveCurrentDayTarget.itemSummary.succeededItems || 0} succeeded / ${missiveCurrentDayTarget.itemSummary.skippedItems || 0} skipped / ${missiveCurrentDayTarget.itemSummary.failedItems || 0} failed`
      : 'missing missive-current-day target item summary',
  )
  ensure(
    checks,
    includesAll(extractionLaneItemShapeAudit, [
      'missive-current-day',
      'Before normalization',
      'missive_conversation',
      'drive-content-extract-backfill',
      '4 failed crawl items',
      'EXTRACT-RETRY-001',
    ]),
    'extraction lane item-shape inspection is persisted as repo evidence',
    'docs/audits/2026-04-28-extraction-lane-item-shape.md records Missive normalization and remaining Drive failures',
  )
  ensure(
    checks,
    staleSourceCrawlRuns.length === 0 &&
      extractionStaleActiveRuns.length === 0,
    'source_crawl_target_runs has no stale active runs',
    staleSourceCrawlRuns.length || extractionStaleActiveRuns.length
      ? [...staleSourceCrawlRuns, ...extractionStaleActiveRuns].map(run => `${run.targetKey}:${run.runId}`).join(', ')
      : 'no running source-crawl target runs past lease/threshold',
  )
  ensure(
    checks,
    extractionRecentStaleReapedRuns.some(run => run.runId === knownStaleSlackRunId) ||
      extractionStaleActiveRuns.some(run => run.runId === knownStaleSlackRunId),
    'Foundation sweep catches the known stale Slack crawl proof case',
    extractionRecentStaleReapedRuns.some(run => run.runId === knownStaleSlackRunId)
      ? `${knownStaleSlackRunId} visible as reaped stale run`
      : extractionStaleActiveRuns.some(run => run.runId === knownStaleSlackRunId)
        ? `${knownStaleSlackRunId} visible as active stale run`
        : `${knownStaleSlackRunId} not visible in extraction control stale-run payload`,
  )
  ensure(
    checks,
    scheduledExtractionTargets.length > 0 &&
      scheduledExtractionTargets.every(target =>
        target.foundationJobKey &&
        target.scheduler?.scheduleStatus &&
        target.scheduler?.scheduleTruth === 'foundation_job' &&
        target.nextRunAt === target.scheduler?.nextRunAt &&
        target.effectiveNextRunAt === target.scheduler?.nextRunAt &&
        Object.prototype.hasOwnProperty.call(target.scheduler, 'crawlCheckpointNextRunAt')
      ) &&
      !scheduledExtractionTargets.some(target =>
        (target.healthFindings || []).some(finding => finding.type === 'job_target_schedule_mismatch')
      ) &&
      includesAll(foundationDbSource, ['scheduleTruth', 'crawlCheckpointNextRunAt']) &&
      !foundationDbSource.includes('targetNextRunAt') &&
      includesAll(foundationUiSource, ['crawlCheckpointNextRunAt', 'Runner checkpoint']),
    'api/foundation-hub derives extraction schedules from Foundation jobs',
    scheduledExtractionTargets.length
      ? `${scheduledExtractionTargets.length} targets derive visible schedule from job runtime`
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
      includesAll(driveContentExtractionSource, [
        'extractPdfFormFieldText',
        'drive_pdf_pdftotext_form_fields_v1',
        'forceReprocess',
      ]) &&
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
  const foundationChangelog = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-CHANGELOG-001') || null
  const foundationChangelogV2 = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-CHANGELOG-002') || null
  ensure(
    checks,
    foundationSurfaceSweep?.lane === 'done' &&
      foundationSurfaceSweep?.priority === 'P0' &&
      /source contracts, connectors, jobs, docs, backlog cards, or system maps change/.test(foundationSurfaceSweep?.summary || '') &&
      /31 Foundation nav pages/.test(foundationSurfaceSweep?.statusNote || '') &&
      /crawl-slack-current-day-20260427145904292-3f93bebd/.test(foundationSurfaceSweep?.statusNote || '') &&
      currentPlan.includes('Foundation surfaces must not rely on Steve noticing stale truth') &&
      currentPlan.includes('FOUNDATION-SWEEP-001'),
    'Foundation surface freshness sweep v1 is closed with stale-run proof',
    foundationSurfaceSweep
      ? `${foundationSurfaceSweep.lane} / ${foundationSurfaceSweep.priority} / ${foundationSurfaceSweep.title}`
      : 'missing FOUNDATION-SWEEP-001',
  )
  ensure(
    checks,
    foundationChangelog?.lane === 'done' &&
      foundationChangelog?.priority === 'P0' &&
      /Recent Builds/.test(foundationChangelog?.summary || foundationChangelog?.nextAction || '') &&
      /done-lane guard/.test(foundationChangelog?.nextAction || '') &&
      includesAll(foundationDbSource, ['assertBacklogDoneCloseout', 'FOUNDATION-CHANGELOG-001']),
    'Foundation build closeout discipline is tracked and enforced',
    foundationChangelog ? `${foundationChangelog.lane} / ${foundationChangelog.title}` : 'missing FOUNDATION-CHANGELOG-001',
  )
  ensure(
    checks,
    foundationChangelogV2?.lane === 'done' &&
      foundationChangelogV2?.priority === 'P0' &&
      /operator changelog/.test(foundationChangelogV2?.summary || '') &&
      /related backlog card/.test(foundationChangelogV2?.summary || foundationChangelogV2?.nextAction || '') &&
      /proof command/.test(foundationChangelogV2?.summary || foundationChangelogV2?.nextAction || '') &&
      /repo-truth closeout records/.test(foundationChangelogV2?.statusNote || foundationChangelogV2?.nextAction || '') &&
      /foundation:verify/.test(foundationChangelogV2?.statusNote || '') &&
      currentPlan.includes('Recent Builds v2 merges git history') &&
      currentState.includes('Recent Builds groups work by day/system area'),
    'Foundation Recent Builds v2 operator changelog hardening is closed',
    foundationChangelogV2 ? `${foundationChangelogV2.lane} / ${foundationChangelogV2.title}` : 'missing FOUNDATION-CHANGELOG-002',
  )
  const foundationSurfaceUpdates = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-SURFACE-UPDATES-001') || null
  const foundationSurfaceUpdatesText = [
    foundationSurfaceUpdates?.title,
    foundationSurfaceUpdates?.summary,
    foundationSurfaceUpdates?.whyItMatters,
    foundationSurfaceUpdates?.nextAction,
    foundationSurfaceUpdates?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    foundationSurfaceUpdates?.lane === 'scoped' &&
      foundationSurfaceUpdates?.priority === 'P1' &&
      foundationSurfaceUpdatesText.includes('plain-English') &&
      foundationSurfaceUpdatesText.includes('Overview -> Systems -> Backlog -> Recent Work') &&
      foundationSurfaceUpdatesText.includes('clickable app breadcrumbs') &&
      foundationSurfaceUpdatesText.includes('done-velocity') &&
      foundationSurfaceUpdatesText.includes('moved-to-done date') &&
      foundationSurfaceUpdatesText.includes('Phase 1 / Truth Cleanup') &&
      foundationSurfaceUpdatesText.includes('command-order') &&
      foundationSurfaceUpdatesText.includes('backend-only') &&
      foundationSurfaceUpdatesText.includes('app surface metadata') &&
      foundationSurfaceUpdatesText.includes('at least 3 recent closeouts') &&
      foundationSurfaceUpdatesText.includes('Recent Builds / Recent Work owns') &&
      foundationSurfaceUpdatesText.includes('technical terms must have a plain-English meaning next to them') &&
      currentPlan.includes('Foundation is the CEO dashboard for system-building') &&
      currentPlan.includes('Overview -> Systems -> Backlog -> Recent Work') &&
      currentPlan.includes('Recent Builds / Recent Work should default collapsed') &&
      currentState.includes("Steve's operator UX standard is now active") &&
      foundationSurfaceMap.some(surface =>
        surface.section === 'build-log' &&
          (surface.backlogIds || []).includes('FOUNDATION-SURFACE-UPDATES-001')
      ),
    'Foundation operator UX and Recent Work follow-up is parked as scoped P1',
    foundationSurfaceUpdates
      ? `${foundationSurfaceUpdates.lane} / ${foundationSurfaceUpdates.priority} / ${foundationSurfaceUpdates.title}`
      : 'missing FOUNDATION-SURFACE-UPDATES-001',
  )
  const backlogHygienePass = (foundationHub.backlogItems || []).find(item => item.id === 'BACKLOG-HYGIENE-PASS-001') || null
  const backlogHygiene = (foundationHub.backlogItems || []).find(item => item.id === 'BACKLOG-HYGIENE-001') || null
  const devProcessAudit = (foundationHub.backlogItems || []).find(item => item.id === 'DEV-PROCESS-AUDIT-001') || null
  const processHooks = (foundationHub.backlogItems || []).find(item => item.id === 'PROCESS-HOOKS-001') || null
  const docAuthority = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-AUTHORITY-001') || null
  const dataStructuredContracts = (foundationHub.backlogItems || []).find(item => item.id === 'DATA-004') || null
  const source021 = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-021') || null
  const source021Proof = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-021-PROOF-001') || null
  const security001 = (foundationHub.backlogItems || []).find(item => item.id === 'SECURITY-001') || null
  const security006 = (foundationHub.backlogItems || []).find(item => item.id === 'SECURITY-006') || null
  const backlogHygieneText = [
    backlogHygiene?.summary,
    backlogHygiene?.whyItMatters,
    backlogHygiene?.nextAction,
    backlogHygiene?.statusNote,
    devProcessAudit?.summary,
    processHooks?.summary,
    processHooks?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    backlogHygienePass?.lane === 'done' &&
      backlogHygienePass?.priority === 'P0' &&
      String(backlogHygienePass.statusNote || '').includes('DOC-AUTHORITY-001') &&
      String(backlogHygienePass.statusNote || '').includes('SOURCE-021-PROOF-001') &&
      String(backlogHygienePass.statusNote || '').includes('SECURITY-001') &&
      backlogHygiene?.lane === 'scoped' &&
      backlogHygiene?.priority === 'P0' &&
      devProcessAudit?.lane === 'scoped' &&
      processHooks?.lane === 'scoped' &&
      backlogHygieneText.includes('autonomous backlog hygiene probe') &&
      backlogHygieneText.includes('9.8 plan') &&
      backlogHygieneText.includes('Recent Builds') &&
      currentPlan.includes('BACKLOG-HYGIENE-PASS-001') &&
      currentPlan.includes('Before code, each slice needs a card ID') &&
      currentState.includes('BACKLOG-HYGIENE-PASS-001` is done for v1'),
    'Backlog hygiene and process-gate cards are captured',
    `pass=${backlogHygienePass?.lane || 'missing'} / probe=${backlogHygiene?.lane || 'missing'} / hooks=${processHooks?.lane || 'missing'}`,
  )
  ensure(
    checks,
    docAuthority?.lane === 'done' &&
      dataStructuredContracts?.lane === 'done' &&
      source021?.lane === 'executing' &&
      source021Proof?.lane === 'done' &&
      security001?.lane === 'scoped' &&
      security006?.lane === 'scoped' &&
      String(docAuthority?.statusNote || '').includes('Proof command: `npm run foundation:verify`') &&
      String(dataStructuredContracts?.statusNote || '').includes('/api/source-of-truth') &&
      String(source021?.statusNote || '').includes('split completed v1 evidence') &&
      String(source021Proof?.statusNote || '').includes('53/53') &&
      String(security001?.statusNote || '').includes('moved this out of executing') &&
      String(security006?.statusNote || '').includes('moved this out of executing'),
    'Known stale/unclear executing cards were handled',
    `DOC=${docAuthority?.lane || 'missing'} / DATA=${dataStructuredContracts?.lane || 'missing'} / SOURCE-021=${source021?.lane || 'missing'} + proof=${source021Proof?.lane || 'missing'} / SECURITY=${security001?.lane || 'missing'},${security006?.lane || 'missing'}`,
  )
  const actionReviewApply = (foundationHub.backlogItems || []).find(item => item.id === 'ACTION-REVIEW-APPLY-001') || null
  const actionReviewApplyText = [
    actionReviewApply?.title,
    actionReviewApply?.summary,
    actionReviewApply?.whyItMatters,
    actionReviewApply?.nextAction,
    actionReviewApply?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    actionReviewApply?.lane === 'scoped' &&
      actionReviewApply?.priority === 'P0' &&
      actionReviewApplyText.includes('18 pending') &&
      actionReviewApplyText.includes('Approve/Reject') &&
      actionReviewApplyText.includes('destination record') &&
      actionReviewApplyText.includes('aged-route') &&
      actionReviewApplyText.includes('apply-success-rate verifier') &&
      actionReviewApplyText.includes('Resolution hardening waits') &&
      currentPlan.includes('`ACTION-REVIEW-APPLY-001` is the next product slice after backlog hygiene and process gates') &&
      currentState.includes('`ACTION-REVIEW-APPLY-001` remains the next product build slice'),
    'Action Router review/apply child card is scoped before coding',
    actionReviewApply
      ? `${actionReviewApply.lane} / ${actionReviewApply.priority} / ${actionReviewApply.title}`
      : 'missing ACTION-REVIEW-APPLY-001',
  )
  const researchInbox = (foundationHub.backlogItems || []).find(item => item.id === 'RESEARCH-INBOX-001') || null
  const researchInboxText = [
    researchInbox?.title,
    researchInbox?.summary,
    researchInbox?.whyItMatters,
    researchInbox?.nextAction,
    researchInbox?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    researchInbox?.lane === 'scoped' &&
      researchInbox?.priority === 'P1' &&
      researchInboxText.includes('pre-backlog') &&
      researchInboxText.includes('YouTube') &&
      researchInboxText.includes('Mycro/myICOR') &&
      researchInboxText.includes('promote into backlog with acceptance criteria or archive with the reason') &&
      researchInboxText.includes('WEB-GODMODE-001') &&
      researchInboxText.includes('MULTIMODAL-EXTRACTOR-001') &&
      currentPlan.includes('`RESEARCH-INBOX-001`') &&
      currentState.includes('`RESEARCH-INBOX-001` is parked'),
    'Research Inbox pre-backlog card is parked',
    researchInbox
      ? `${researchInbox.lane} / ${researchInbox.priority} / ${researchInbox.title}`
      : 'missing RESEARCH-INBOX-001',
  )
  const runtimeHealthSimplify = (foundationHub.backlogItems || []).find(item => item.id === 'RUNTIME-HEALTH-SIMPLIFY-001') || null
  const runtimeHealthSimplifyText = [
    runtimeHealthSimplify?.title,
    runtimeHealthSimplify?.summary,
    runtimeHealthSimplify?.whyItMatters,
    runtimeHealthSimplify?.nextAction,
    runtimeHealthSimplify?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    runtimeHealthSimplify?.lane === 'scoped' &&
      runtimeHealthSimplify?.priority === 'P1' &&
      runtimeHealthSimplifyText.includes('too dense') &&
      runtimeHealthSimplifyText.includes('plain-English top layer') &&
      runtimeHealthSimplifyText.includes('collapsed-by-default diagnostic groups') &&
      runtimeHealthSimplifyText.includes('Parked follow-up, not next') &&
      currentPlan.includes('`RUNTIME-HEALTH-SIMPLIFY-001`') &&
      currentState.includes('`RUNTIME-HEALTH-SIMPLIFY-001` is parked'),
    'Runtime Health simplification card is parked',
    runtimeHealthSimplify
      ? `${runtimeHealthSimplify.lane} / ${runtimeHealthSimplify.priority} / ${runtimeHealthSimplify.title}`
      : 'missing RUNTIME-HEALTH-SIMPLIFY-001',
  )
  const foundationUsersAdmin = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-USERS-001') || null
  const foundationUsersAdminText = [
    foundationUsersAdmin?.title,
    foundationUsersAdmin?.summary,
    foundationUsersAdmin?.whyItMatters,
    foundationUsersAdmin?.nextAction,
    foundationUsersAdmin?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    foundationUsersAdmin?.lane === 'scoped' &&
      foundationUsersAdmin?.priority === 'P1' &&
      foundationUsersAdminText.includes('owner-only') &&
      foundationUsersAdminText.includes('without editing `.env`') &&
      foundationUsersAdminText.includes('disable') &&
      foundationUsersAdminText.includes('audit') &&
      foundationUsersAdminText.includes('non-owners cannot manage access') &&
      foundationUsersAdminText.includes('SECURITY-002') &&
      currentPlan.includes('FOUNDATION-USERS-001'),
    'Foundation user/access control panel is parked as scoped P1 follow-up',
    foundationUsersAdmin
      ? `${foundationUsersAdmin.lane} / ${foundationUsersAdmin.priority} / ${foundationUsersAdmin.title}`
      : 'missing FOUNDATION-USERS-001',
  )
  const systemProcessControl = (foundationHub.backlogItems || []).find(item => item.id === 'SYSTEM-010') || null
  const runtimeSupervisor = (foundationHub.backlogItems || []).find(item => item.id === 'RUNTIME-SUPERVISOR-001') || null
  const runtimeSupervisorText = [
    systemProcessControl?.nextAction,
    systemProcessControl?.statusNote,
    runtimeSupervisor?.nextAction,
    runtimeSupervisor?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    systemProcessControl?.lane === 'scoped' &&
      systemProcessControl?.priority === 'P0' &&
      runtimeSupervisor?.lane === 'scoped' &&
      runtimeSupervisor?.priority === 'P0' &&
      runtimeSupervisorText.includes('served-code-equals-HEAD') &&
      runtimeSupervisorText.includes('auto-restart-on-push') &&
      currentPlan.includes('Served-code-equals-HEAD check is live') &&
      currentPlan.includes('Add auto-restart-on-push next'),
    'SYSTEM-010 owns dashboard served-code/deploy freshness follow-up',
    `SYSTEM-010=${systemProcessControl?.lane || 'missing'} / RUNTIME-SUPERVISOR-001=${runtimeSupervisor?.lane || 'missing'}`,
  )
  const extractRetry = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-RETRY-001') || null
  const extractRetryText = [
    extractRetry?.summary,
    extractRetry?.nextAction,
    extractRetry?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
    extractRetry?.lane === 'scoped' &&
      extractRetry?.priority === 'P1' &&
      extractRetryText.includes('retry/backoff') &&
      extractRetryText.includes('failed `source_crawl_items`') &&
      extractRetryText.includes('Partial target runs now exit nonzero') &&
      extractRetryText.includes('Runtime Health shows failed/skipped item summaries'),
    'failed-item retry/backoff remains parked in live backlog truth',
    extractRetry
      ? `${extractRetry.lane} / ${extractRetry.priority} / ${extractRetry.title}`
      : 'missing EXTRACT-RETRY-001',
  )
  const extractControl = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-CONTROL-001') || null
  const extractSchedule = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-SCHEDULE-001') || null
  const extractMetrics = (foundationHub.backlogItems || []).find(item => item.id === 'EXTRACT-METRICS-001') || null
  const extractControlText = [
    extractControl?.nextAction,
    extractControl?.statusNote,
  ].filter(Boolean).join('\n')
  const extractScheduleText = [
    extractSchedule?.nextAction,
    extractSchedule?.statusNote,
  ].filter(Boolean).join('\n')
  const extractMetricsText = [
    extractMetrics?.title,
    extractMetrics?.summary,
    extractMetrics?.nextAction,
    extractMetrics?.statusNote,
  ].filter(Boolean).join('\n')
  ensure(
    checks,
      extractControl?.lane === 'done' &&
      extractControl?.priority === 'P0' &&
      extractControlText.includes('coverage-by-target') &&
      extractControlText.includes('Foundation-job schedule truth') &&
      extractControlText.includes('EXTRACT-RETRY-001') &&
      extractControlText.includes('foundation:verify') &&
      extractSchedule?.lane === 'done' &&
      extractSchedule?.priority === 'P1' &&
      extractScheduleText.includes('crawlCheckpointNextRunAt') &&
      extractScheduleText.includes('job_target_schedule_mismatch') &&
      currentPlan.includes('crawlCheckpointNextRunAt') &&
      currentState.includes('EXTRACT-CONTROL-001 v1 is closed'),
    'extraction schedule truth and control-plane v1 are closed',
    `EXTRACT-CONTROL-001=${extractControl?.lane || 'missing'} / EXTRACT-SCHEDULE-001=${extractSchedule?.lane || 'missing'}`,
  )
  ensure(
    checks,
    extractMetrics?.lane === 'done' &&
      extractMetrics?.priority === 'P1' &&
      extractMetricsText.includes('coverage-by-target') &&
      extractMetricsText.includes('Runtime Health') &&
      extractMetricsText.includes('Missive current-day') &&
      extractMetricsText.includes('missive_conversation') &&
      extractMetricsText.includes('foundation:verify') &&
      extractControlText.includes('Closed on 2026-04-28') &&
      currentState.includes('`EXTRACT-METRICS-001` is done for v1') &&
      currentPlan.includes('docs/audits/2026-04-28-extraction-lane-item-shape.md'),
    'EXTRACT-METRICS-001 closes the coverage-by-target slice with Missive ledger proof',
    extractMetrics
      ? `${extractMetrics.lane} / ${extractMetrics.priority} / ${extractMetrics.title}`
      : 'missing EXTRACT-METRICS-001',
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
  const systemStrategyReview = (foundationHub.backlogItems || []).find(item => item.id === 'SYSTEM-STRATEGY-REVIEW-001') || null
  const strategyMeetingReady = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGY-HUB-MEETING-READY-001') || null
  const strategicIntel = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGIC-INTEL-001') || null
  const intelScoper = (foundationHub.backlogItems || []).find(item => item.id === 'INTEL-SCOPER-001') || null
  const intelThreadContext = (foundationHub.backlogItems || []).find(item => item.id === 'INTEL-THREAD-CONTEXT-001') || null
  const strategyQuarter = (foundationHub.backlogItems || []).find(item => item.id === 'STRATEGY-QUARTER-001') || null
  const modelRouting = (foundationHub.backlogItems || []).find(item => item.id === 'MODEL-ROUTING-001') || null
  const agentFactory = (foundationHub.backlogItems || []).find(item => item.id === 'AGENT-005') || null
  const backlogItemText = item => [
    item?.title,
    item?.summary,
    item?.whyItMatters,
    item?.nextAction,
    item?.statusNote,
  ].filter(Boolean).join('\n')
  const systemStrategyReviewText = backlogItemText(systemStrategyReview)
  const strategyMeetingReadyText = backlogItemText(strategyMeetingReady)
  const strategicIntelText = backlogItemText(strategicIntel)
  const intelScoperText = backlogItemText(intelScoper)
  const intelThreadContextText = backlogItemText(intelThreadContext)
  const strategyQuarterText = backlogItemText(strategyQuarter)
  const modelRoutingText = backlogItemText(modelRouting)
  const agentFactoryText = backlogItemText(agentFactory)
  ensure(
    checks,
    systemStrategyReview?.lane === 'done' &&
      systemStrategyReviewText.includes('function-vs-form testing') &&
      systemStrategyReviewText.includes('memory-versus-repo-truth discipline') &&
      systemStrategyReviewText.includes('docs/handoffs/2026-04-28-foundation-hard-checkpoint.md') &&
      strategyMeetingReady?.lane === 'scoped' &&
      strategyMeetingReady?.priority === 'P1' &&
      strategyMeetingReadyText.includes('plain-English') &&
      strategyMeetingReadyText.includes('live ownership meetings') &&
      strategyMeetingReadyText.includes('1 day / 1 week / 1 month / 1 quarter / custom') &&
      strategyMeetingReadyText.includes('UI quality as meeting-ready') &&
      strategicIntel?.lane === 'scoped' &&
      strategicIntel?.priority === 'P0' &&
      strategicIntelText.includes('intelligence_strategic_issues') &&
      strategicIntelText.includes('docs/specs/2026-04-28-strategic-intelligence-loop.md') &&
      strategicIntelText.includes('urgency, impact, confidence, and staleness') &&
      strategicIntelText.includes('resolution feedback') &&
      strategicIntelText.includes('blocks `INTEL-SCOPER-001`') &&
      strategicIntelText.includes('>= 5 strategic issues surfaced/week') &&
      strategicIntelText.includes('>= 2 resolved-to-applied/week') &&
      intelScoper?.lane === 'scoped' &&
      intelScoper?.priority === 'P0' &&
      intelScoperText.includes('gap analysis') &&
      intelScoperText.includes('Depends on STRATEGIC-INTEL-001') &&
      intelScoperText.includes('"Scope this"') &&
      intelScoperText.includes('already_answered') &&
      intelScoperText.includes('verified / partial / remaining-gaps sections') &&
      intelScoperText.includes('Every verified claim must cite') &&
      intelScoperText.includes('minimal Agent Spec') &&
      intelThreadContext?.lane === 'scoped' &&
      intelThreadContext?.priority === 'P1' &&
      intelThreadContextText.includes('reply count') &&
      intelThreadContextText.includes('one-message thread') &&
      intelThreadContextText.includes('cross-source corroboration') &&
      strategyQuarter?.lane === 'scoped' &&
      strategyQuarter?.priority === 'P1' &&
      strategyQuarterText.includes('PostgreSQL-backed canonical records') &&
      strategyQuarterText.includes('Strategy Hub owner/admin forms') &&
      strategyQuarterText.includes('strategy-quarter fact types') &&
      strategyQuarterText.includes('quarter context/input layer') &&
      modelRouting?.lane === 'scoped' &&
      modelRouting?.priority === 'P1' &&
      modelRoutingText.includes('docs/rebuild/current-runtime-map.md') &&
      !modelRoutingText.includes('likely in') &&
      modelRoutingText.includes('subscriptions are for humans') &&
      modelRoutingText.includes('official APIs and governed adapters') &&
      agentFactoryText.includes('STRATEGY-QUARTER-001 has been used in production for at least two weekly ownership cycles'),
    'AIOS Strategic Intelligence next-leg cards are pinned with UX, schema, Scoper, quarter-context, model-routing, and agent deferral gates',
    [
      `review=${systemStrategyReview?.lane || 'missing'}`,
      `meeting=${strategyMeetingReady?.lane || 'missing'}`,
      `intel=${strategicIntel?.lane || 'missing'}`,
      `scoper=${intelScoper?.lane || 'missing'}`,
      `thread=${intelThreadContext?.lane || 'missing'}`,
      `quarter=${strategyQuarter?.lane || 'missing'}`,
      `model=${modelRouting?.lane || 'missing'}`,
      `agent=${agentFactory?.lane || 'missing'}`,
    ].join(' / '),
  )
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

  const kpiHealth = await runHealthScript('kpi:health')
  const kpiHealthSummaryLine = kpiHealth.split('\n').find(lineValue => lineValue.startsWith('KPI_HEALTH_SUMMARY '))
  let kpiHealthSummary = null
  if (kpiHealthSummaryLine) {
    try {
      kpiHealthSummary = JSON.parse(kpiHealthSummaryLine.replace('KPI_HEALTH_SUMMARY ', ''))
    } catch {
      kpiHealthSummary = null
    }
  }
  ensure(
    checks,
    kpiHealth.includes('KPI Supabase health') &&
      kpiHealth.includes('Status:') &&
      kpiHealth.includes('KPI_HEALTH_SUMMARY') &&
      kpiHealthSummary?.tableCount === EXPECTED_KPI_TABLES.length &&
      kpiHealthSummary?.rpcCount === EXPECTED_KPI_RPCS.length &&
      kpiHealthSummary?.probeSilent === false &&
      kpiHealthSummary?.schemaDriftStatus === 'healthy' &&
      kpiHealthSummary?.status !== 'risk',
    'kpi:health passes for load-bearing KPI tables/RPCs',
    kpiHealth
      .split('\n')
      .filter(lineValue => /^(  Status|  Tables|  RPCs|KPI_HEALTH_SUMMARY)/.test(lineValue))
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
