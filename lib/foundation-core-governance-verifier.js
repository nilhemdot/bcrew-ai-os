import {
  DB_CONSTRAINT_CARD_ID,
  DB_CONSTRAINT_CLOSEOUT_KEY,
} from './db-constraint-hardening.js'
import {
  SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID,
  SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY,
} from './source-id-constraint-contract.js'

export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID = 'VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-core-governance-split-module-v1'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-core-governance-split-module-001-plan.md'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001.json'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-core-governance-split-module-check.mjs'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SPRINT_ID = 'verifier-core-governance-split-module-2026-05-16'
export const VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_BEFORE_LINES = 14675

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

export function evaluateFoundationCoreGovernanceVerifier(input = {}) {
  const checks = []
  const systemStrategy = input.systemStrategy || ''
  const currentPlan = input.currentPlan || ''
  const currentState = input.currentState || ''
  const agentsSource = input.agentsSource || ''
  const foundationHtmlSource = input.foundationHtmlSource || ''
  const strategicIntelSpecSource = input.strategicIntelSpecSource || ''
  const foundationHardCheckpointSource = input.foundationHardCheckpointSource || ''
  const usersDoc = input.usersDoc || ''
  const steveDoc = input.steveDoc || ''
  const agentModelDoc = input.agentModelDoc || ''
  const harlanDoc = input.harlanDoc || ''
  const crewbertDoc = input.crewbertDoc || ''
  const personalAgentOnboardingDoc = input.personalAgentOnboardingDoc || ''
  const ownersSourceNote = input.ownersSourceNote || ''
  const docsIndexSource = input.docsIndexSource || ''
  const archiveIndexSource = input.archiveIndexSource || ''
  const docsReadmeSource = input.docsReadmeSource || ''
  const directModelHostOffenders = input.directModelHostOffenders || []
  const backlogSeedDrift = input.backlogSeedDrift || {}
  const foundationDbSource = input.foundationDbSource || ''
  const foundationDecisionStoreSource = input.foundationDecisionStoreSource || ''
  const foundationBacklogStoreSource = input.foundationBacklogStoreSource || ''
  const dbConstraintSource = input.dbConstraintSource || ''
  const dbConstraintDogfood = input.dbConstraintDogfood || {}
  const dbConstraintAudit = input.dbConstraintAudit || {}
  const sourceIdConstraintContractSource = input.sourceIdConstraintContractSource || ''
  const sourceIdConstraintContractDogfood = input.sourceIdConstraintContractDogfood || {}
  const serverSource = input.serverSource || ''
  const hubReadRoutesSource = input.hubReadRoutesSource || ''
  const fubSourceRoutesSource = input.fubSourceRoutesSource || ''
  const foundationOperatorRoutesSource = input.foundationOperatorRoutesSource || ''
  const foundationSourceRoutesSource = input.foundationSourceRoutesSource || ''
  const foundationBuildIntelRoutesSource = input.foundationBuildIntelRoutesSource || ''
  const authRoutesSource = input.authRoutesSource || ''
  const appPageRoutesSource = input.appPageRoutesSource || ''
  const securityAccessSource = input.securityAccessSource || ''
  const appAuthSource = input.appAuthSource || ''
  const loginHtmlSource = input.loginHtmlSource || ''
  const loginUiSource = input.loginUiSource || ''
  const foundationFrontendSource = input.foundationFrontendSource || ''
  const strategyExportUiSource = input.strategyExportUiSource || ''

  addCheck(
    checks,
    includesAll(systemStrategy, ['Systems Layer', 'operating bundles', 'source contracts', 'runtime jobs', 'Doctrine and the rebuild plan are governed, not frozen']) &&
      includesAll(currentPlan, [
        'Locked doctrine means current operating default, not permanent dogma',
        'Foundation Systems page: 14 major operating systems',
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
  addCheck(
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
        'Strategy Hub route-review proof plumbing remains available',
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
  addCheck(
    checks,
    foundationHtmlSource.includes('<div class="found-nav-label">People and agents</div>') &&
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
  addCheck(
    checks,
    includesAll(ownersSourceNote, ['owner sign-off completed on `2026-04-16`', 'validated through Column `CB`']),
    'owners source note records sign-off and scope boundary',
    'owner sign-off note and CB boundary present',
  )
  addCheck(
    checks,
    docsIndexSource.includes('Generated at:') &&
      docsIndexSource.includes('| File | Date | Category | Status | Promoted To | Words | Value |') &&
      !docsIndexSource.includes('active-reference') &&
      docsIndexSource.includes('rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md') &&
      archiveIndexSource.includes('Archived Evidence Index') &&
      !docsReadmeSource.includes('10. [`rebuild-decisions.md`'),
    'docs authority index separates active truth from evidence',
    'generated index has promoted-to column, no active-reference status, archive index, and retired rebuild decisions are not read-first active truth',
  )
  addCheck(
    checks,
    directModelHostOffenders.length === 0,
    'direct model/transcription host calls stay behind approved adapters',
    directModelHostOffenders.length
      ? directModelHostOffenders.join(', ')
      : 'no direct OpenAI/Anthropic/Gemini host calls outside approved adapters',
  )
  addCheck(
    checks,
    backlogSeedDrift.seedRows >= 180 &&
      Array.isArray(backlogSeedDrift.items) &&
      backlogSeedDrift.stableFields?.includes('summary') &&
      backlogSeedDrift.stableFields?.includes('whyItMatters') &&
      backlogSeedDrift.mutableFields?.includes('lane') &&
      backlogSeedDrift.mutableFields?.includes('statusNote') &&
      typeof backlogSeedDrift.totalMismatchCount === 'number',
    'backlog seed/live drift is explicitly reported',
    `${backlogSeedDrift.driftItemCount || 0} drift rows / ${backlogSeedDrift.stableMismatchCount || 0} stable mismatches / ${backlogSeedDrift.mutableMismatchCount || 0} mutable mismatches`,
  )
  addCheck(
    checks,
    includesAll([foundationDbSource, foundationBacklogStoreSource].join('\n'), [
      'assertBacklogDoneCloseout',
      'moving to done requires a closeout statusNote with build/change proof',
      'createBacklogItem',
      'updateBacklogItem',
    ]),
    'backlog cards moving to done require build/change closeout proof',
    'create/update paths guard done-lane transitions with source/status closeout proof instead of relying on memory',
  )
  addCheck(
    checks,
    dbConstraintAudit.invalidDecisionCategoryCount === 0 &&
      dbConstraintAudit.invalidSourceReferenceCount === 0 &&
      dbConstraintAudit.pendingDocUpdateStateIssueCount === 0,
    'Foundation DB constraint audit has no invalid categories, source IDs, or doc-update states',
      `${dbConstraintAudit.registeredSourceIds || 0} registered source IDs / ${dbConstraintAudit.invalidDecisionCategoryCount || 0} invalid categories / ${dbConstraintAudit.invalidSourceReferenceCount || 0} invalid source refs / ${dbConstraintAudit.pendingDocUpdateStateIssueCount || 0} doc-update state issues`,
  )
  addCheck(
    checks,
    dbConstraintDogfood.ok === true &&
      dbConstraintDogfood.oldSuperseded === true &&
      dbConstraintDogfood.appliedSupersedesIds?.includes('DEC-OLD') &&
      dbConstraintSource.includes('DB_CONSTRAINT_CLOSEOUT_KEY') &&
      [foundationDbSource, foundationDecisionStoreSource].join('\n').includes('lockDecisionFromDocUpdate') &&
      [foundationDbSource, foundationDecisionStoreSource].join('\n').includes('decisionSupersedesIds'),
    `${DB_CONSTRAINT_CARD_ID} applies doc-update decision supersession semantics`,
    `${DB_CONSTRAINT_CLOSEOUT_KEY} / oldSuperseded=${dbConstraintDogfood.oldSuperseded === true}`,
  )
  addCheck(
    checks,
    sourceIdConstraintContractDogfood.ok === true &&
      sourceIdConstraintContractDogfood.valid?.auditedRelationCount === 13 &&
      sourceIdConstraintContractDogfood.valid?.contractRelationCount === 13 &&
      sourceIdConstraintContractDogfood.unsafeArrayFk?.findingKeys?.includes('unsafe_array_fk_claim') &&
      sourceIdConstraintContractDogfood.missingRegisteredSourceEnforcement?.findingKeys?.includes('missing_registered_source_enforcement') &&
      sourceIdConstraintContractDogfood.mutationPosture?.findingKeys?.includes('report_only_boundary') &&
      sourceIdConstraintContractSource.includes('SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY') &&
      sourceIdConstraintContractSource.includes('evaluateSourceIdConstraintContract'),
    `${SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID} classifies DB source-ID constraint readiness`,
    `${SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY} / auditedRelations=${sourceIdConstraintContractDogfood.valid?.auditedRelationCount || 0}`,
  )
  addCheck(
    checks,
    [
      "app.post('/api/intelligence/evidence', requireAdminToken",
      "app.get('/api/doc', requireAdminToken",
      "app.get('/api/owners/lead-source-governance', requireAdminToken",
      "app.get('/api/owners/review-queue', requireAdminToken",
      "app.get('/api/sheets/structure-status', requireAdminToken",
      "app.get('/api/system-inventory', requireAdminToken",
      "app.get('/foundation/export/strategy.pdf', requireAdminToken",
    ].every(pattern => serverSource.includes(pattern)) &&
      [
        "app.get('/api/foundation-hub', deps.requireAdminToken",
        "app.get('/api/ops-hub', deps.requireAdminToken",
      ].every(pattern => hubReadRoutesSource.includes(pattern)) &&
      [
        "app.get('/api/fub/health', requireAdminToken",
        "app.get('/api/fub/person', requireAdminToken",
        "app.get('/api/fub/lead-sources', requireAdminToken",
      ].every(pattern => fubSourceRoutesSource.includes(pattern)) &&
      [
        "app.get('/api/foundation/changes', requireAdminToken",
        "app.get('/api/foundation/change-log', requireAdminToken",
        "app.get('/api/foundation/daily-summary', requireAdminToken",
        "app.get('/api/foundation/build-log', requireAdminToken",
        "app.get('/api/foundation/doc-updates', requireAdminToken",
      ].every(pattern => foundationOperatorRoutesSource.includes(pattern)) &&
      [
        "app.get('/api/source-of-truth', requireAdminToken",
        "app.get('/api/foundation/source-lifecycle', requireAdminToken",
        "app.get('/api/foundation/per-user-changelog', requireAdminToken",
        "app.get('/api/foundation/source-connector-matrix', requireAdminToken",
        "app.get('/api/foundation/source-hub-routing-matrix', requireAdminToken",
      ].every(pattern => foundationSourceRoutesSource.includes(pattern)) &&
      [
        "app.get('/api/foundation/build-intel-watchlist', requireAdminToken",
        "app.get('/api/foundation/research-inbox-contract', requireAdminToken",
        "app.get('/api/foundation/build-intel-extraction', requireAdminToken",
        "app.get('/api/foundation/gstack-build-intel', requireAdminToken",
      ].every(pattern => foundationBuildIntelRoutesSource.includes(pattern)),
    'broad Foundation/Ops/doc read APIs are admin-gated',
    'source-of-truth, doc reads, foundation hub, intelligence evidence, ops hub, FUB reads, owners queue/governance, sheet structure, system inventory, changes, changelog, per-user changelog, daily summary, build log, doc updates, and PDF export require admin token outside localhost',
  )
  addCheck(
    checks,
    includesAll(`${serverSource}\n${authRoutesSource}`, [
      "app.post('/api/auth/login'",
      "app.post('/api/auth/google'",
      "app.get('/api/auth/session'",
      "app.post('/api/auth/logout'",
      "app.get('/login'",
    ]) &&
      includesAll(serverSource, [
        'findRoutePosture(req.method, req.path)',
        'authorizeRouteAccess(req, posture)',
      ]) &&
      includesAll(appPageRoutesSource, [
        "requirePageAccess('owner')",
        "requirePageAccess('ops')",
        "requirePageAccess('sales')",
        "requirePageAccess('home')",
      ]) &&
      includesAll(securityAccessSource, [
        "route('GET', '/api/ops-hub'",
        "route('GET', '/api/sales-hub'",
        'const roleOps',
        'const roleSales',
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
  addCheck(
    checks,
    !serverSource.includes('req.hostname') &&
      serverSource.includes("const host = process.env.HOST || '127.0.0.1'") &&
      serverSource.includes('app.listen(port, host'),
    'local admin bypass uses socket locality, not spoofable Host header',
    'server binds to localhost by default and local trust does not inspect req.hostname',
  )
  addCheck(
    checks,
    foundationFrontendSource.includes('downloadStrategyPdf') &&
      foundationFrontendSource.includes("foundationRead('/foundation/export/strategy.pdf')") &&
      strategyExportUiSource.includes("fetch('/foundation/export/strategy.pdf', { headers: getAdminHeaders()"),
    'PDF export clients forward admin token',
    'Foundation and strategy export pages fetch the gated PDF route with X-Admin-Token when present',
  )
  addCheck(
    checks,
    fubSourceRoutesSource.includes('FUB_PROXY_ALLOW_MUTATION') &&
      fubSourceRoutesSource.includes("normalizedMethod !== 'GET'"),
    'generic FUB proxy mutations are off by default',
    'broad FUB proxy allows reads but requires explicit supervised env flag for POST/PUT/PATCH/DELETE',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}

function healthyInput(overrides = {}) {
  const routeBundle = [
    "app.post('/api/intelligence/evidence', requireAdminToken",
    "app.get('/api/doc', requireAdminToken",
    "app.get('/api/owners/lead-source-governance', requireAdminToken",
    "app.get('/api/owners/review-queue', requireAdminToken",
    "app.get('/api/sheets/structure-status', requireAdminToken",
    "app.get('/api/system-inventory', requireAdminToken",
    "app.get('/foundation/export/strategy.pdf', requireAdminToken",
    'findRoutePosture(req.method, req.path)',
    'authorizeRouteAccess(req, posture)',
    "const host = process.env.HOST || '127.0.0.1'",
    'app.listen(port, host',
  ].join('\n')
  return {
    systemStrategy: 'Systems Layer operating bundles source contracts runtime jobs Doctrine and the rebuild plan are governed, not frozen memory is not backlog Strategic Intelligence Doctrine gap-resolving Scoper Strategy route-review UI proof plumbing is not the same thing as meeting-ready UX',
    currentPlan: 'Locked doctrine means current operating default, not permanent dogma Foundation Systems page: 14 major operating systems KPI/Supabase read rules are closed for `SOURCE-010` Ops Hub v1 daily Gmail attachment extraction daily YouTube subtitle transcript extraction FOUNDATION-SWEEP-001 Overview gives the command order live Backlog owns task status Rebuild Plan explains doctrine Hard Checkpoint — 2026-04-28 Foundation Return Parked Next Leg — Strategic Intelligence Operating Loop FOUNDATION-CHANGELOG-002 INTEL-THREAD-CONTEXT-001',
    currentState: 'Overview gives the command order live Backlog owns task status Current command order Hard checkpoint call from 2026-04-28 Strategy Hub route-review proof plumbing remains available FOUNDATION-SWEEP-001 FOUNDATION-CHANGELOG-002',
    agentsSource: 'Foundation priority as an operating guardrail Overview is the command order live Backlog is task truth',
    foundationHtmlSource: '<div class="found-nav-label">People and agents</div> data-section="users">People Overview</a> found-nav-item found-nav-item-sub" href="#user-steve" data-section="agents">Agent Model</a> found-nav-item found-nav-item-sub" href="#agent-harlan" found-nav-item found-nav-item-sub" href="#agent-crewbert" data-section="system-strategy">Doctrine</a> data-section="rebuild-plan">Rebuild Plan</a>',
    strategicIntelSpecSource: 'intelligence_strategic_issues already_answered partially_answered real_gap Thread-Context Requirement Resolution Feedback',
    foundationHardCheckpointSource: 'Nothing from Apr 27-28 should remain only in chat memory FOUNDATION-SWEEP-001 FOUNDATION-CHANGELOG-002 crawl-slack-current-day-20260427145904292-3f93bebd Not Next',
    usersDoc: 'Last reviewed: 2026-04-26 Update Trigger',
    steveDoc: 'Last reviewed: 2026-04-26 Update Trigger',
    agentModelDoc: 'Last reviewed: 2026-04-26 Update Trigger Personal Agent Onboarding personal profile daily nugget',
    harlanDoc: 'Last reviewed: 2026-04-26 Update Trigger personal profile daily nugget AGENT-010',
    crewbertDoc: 'Last reviewed: 2026-04-26 Update Trigger',
    personalAgentOnboardingDoc: 'Last reviewed: 2026-04-26 Update Trigger AGENT-010 personal profile `ME.md` is only a working label daily nugget old BCrew-Buddy Harlan Pilot',
    ownersSourceNote: 'owner sign-off completed on `2026-04-16` validated through Column `CB`',
    docsIndexSource: 'Generated at: | File | Date | Category | Status | Promoted To | Words | Value | rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
    archiveIndexSource: 'Archived Evidence Index',
    docsReadmeSource: 'docs readme',
    directModelHostOffenders: [],
    backlogSeedDrift: {
      seedRows: 180,
      items: [],
      stableFields: ['summary', 'whyItMatters'],
      mutableFields: ['lane', 'statusNote'],
      totalMismatchCount: 0,
      driftItemCount: 0,
      stableMismatchCount: 0,
      mutableMismatchCount: 0,
    },
    foundationDbSource: 'assertBacklogDoneCloseout moving to done requires a closeout statusNote with build/change proof createBacklogItem updateBacklogItem',
    foundationDecisionStoreSource: 'lockDecisionFromDocUpdate decisionSupersedesIds',
    foundationBacklogStoreSource: 'assertBacklogDoneCloseout moving to done requires a closeout statusNote with build/change proof createBacklogItem updateBacklogItem',
    dbConstraintSource: 'DB_CONSTRAINT_CLOSEOUT_KEY',
    dbConstraintDogfood: {
      ok: true,
      oldSuperseded: true,
      appliedSupersedesIds: ['DEC-OLD'],
    },
    sourceIdConstraintContractSource: 'SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY evaluateSourceIdConstraintContract',
    sourceIdConstraintContractDogfood: {
      ok: true,
      valid: {
        auditedRelationCount: 13,
        contractRelationCount: 13,
      },
      unsafeArrayFk: {
        findingKeys: ['unsafe_array_fk_claim'],
      },
      missingRegisteredSourceEnforcement: {
        findingKeys: ['missing_registered_source_enforcement'],
      },
      mutationPosture: {
        findingKeys: ['report_only_boundary'],
      },
    },
    dbConstraintAudit: {
      registeredSourceIds: 36,
      invalidDecisionCategoryCount: 0,
      invalidSourceReferenceCount: 0,
      pendingDocUpdateStateIssueCount: 0,
    },
    serverSource: routeBundle,
    hubReadRoutesSource: "app.get('/api/foundation-hub', deps.requireAdminToken\napp.get('/api/ops-hub', deps.requireAdminToken",
    fubSourceRoutesSource: "app.get('/api/fub/health', requireAdminToken\napp.get('/api/fub/person', requireAdminToken\napp.get('/api/fub/lead-sources', requireAdminToken\nFUB_PROXY_ALLOW_MUTATION\nnormalizedMethod !== 'GET'",
    foundationOperatorRoutesSource: "app.get('/api/foundation/changes', requireAdminToken\napp.get('/api/foundation/change-log', requireAdminToken\napp.get('/api/foundation/daily-summary', requireAdminToken\napp.get('/api/foundation/build-log', requireAdminToken\napp.get('/api/foundation/doc-updates', requireAdminToken",
    foundationSourceRoutesSource: "app.get('/api/source-of-truth', requireAdminToken\napp.get('/api/foundation/source-lifecycle', requireAdminToken\napp.get('/api/foundation/per-user-changelog', requireAdminToken\napp.get('/api/foundation/source-connector-matrix', requireAdminToken\napp.get('/api/foundation/source-hub-routing-matrix', requireAdminToken",
    foundationBuildIntelRoutesSource: "app.get('/api/foundation/build-intel-watchlist', requireAdminToken\napp.get('/api/foundation/research-inbox-contract', requireAdminToken\napp.get('/api/foundation/build-intel-extraction', requireAdminToken\napp.get('/api/foundation/gstack-build-intel', requireAdminToken",
    authRoutesSource: "app.post('/api/auth/login'\napp.post('/api/auth/google'\napp.get('/api/auth/session'\napp.post('/api/auth/logout'\napp.get('/login'",
    appPageRoutesSource: "requirePageAccess('owner')\nrequirePageAccess('ops')\nrequirePageAccess('sales')\nrequirePageAccess('home')",
    securityAccessSource: "route('GET', '/api/ops-hub'\nroute('GET', '/api/sales-hub'\nconst roleOps\nconst roleSales",
    appAuthSource: 'AIOS_AUTH_USERS_JSON AIOS_GOOGLE_CLIENT_ID AIOS_SESSION_SECRET assertSessionSecretConfigured pbkdf2-sha256 aios_session getAllowedAuthUser getSafeRedirectPath',
    loginHtmlSource: 'BCrew AI OS accounts.google.com/gsi/client google-login-button /login.js',
    loginUiSource: '/api/auth/google /api/auth/session google.accounts.id.renderButton',
    foundationFrontendSource: "downloadStrategyPdf foundationRead('/foundation/export/strategy.pdf')",
    strategyExportUiSource: "fetch('/foundation/export/strategy.pdf', { headers: getAdminHeaders()",
    ...overrides,
  }
}

export function buildFoundationCoreGovernanceVerifierDogfoodProof() {
  const healthy = evaluateFoundationCoreGovernanceVerifier(healthyInput())
  const directHostLeak = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    directModelHostOffenders: ['lib/bad-openai.js'],
  }))
  const ungatedRoute = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    foundationSourceRoutesSource: "app.get('/api/source-of-truth', publicHandler",
  }))
  const hostHeaderBypass = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    serverSource: `${healthyInput().serverSource}\nreq.hostname`,
  }))
  const fubMutationOpen = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    fubSourceRoutesSource: "app.get('/api/fub/health', requireAdminToken",
  }))
  const invalidDbReference = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    dbConstraintAudit: {
      registeredSourceIds: 36,
      invalidDecisionCategoryCount: 0,
      invalidSourceReferenceCount: 1,
      pendingDocUpdateStateIssueCount: 0,
    },
  }))
  const weakBacklogCloseout = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    foundationDbSource: 'createBacklogItem updateBacklogItem',
    foundationBacklogStoreSource: 'createBacklogItem updateBacklogItem',
  }))
  const unsafeSourceIdContract = evaluateFoundationCoreGovernanceVerifier(healthyInput({
    sourceIdConstraintContractDogfood: {
      ok: false,
      valid: {
        auditedRelationCount: 13,
        contractRelationCount: 13,
      },
      unsafeArrayFk: {
        findingKeys: [],
      },
      missingRegisteredSourceEnforcement: {
        findingKeys: ['missing_registered_source_enforcement'],
      },
      mutationPosture: {
        findingKeys: ['report_only_boundary'],
      },
    },
  }))

  return {
    ok: healthy.ok === true &&
      directHostLeak.ok === false &&
      ungatedRoute.ok === false &&
      hostHeaderBypass.ok === false &&
      fubMutationOpen.ok === false &&
      invalidDbReference.ok === false &&
      weakBacklogCloseout.ok === false &&
      unsafeSourceIdContract.ok === false,
    mode: 'foundation-core-governance-verifier-dogfood',
    healthy: { ok: healthy.ok, passed: healthy.summary.passed, total: healthy.summary.total },
    rejectedCases: {
      directHostLeak: directHostLeak.ok === false,
      ungatedRoute: ungatedRoute.ok === false,
      hostHeaderBypass: hostHeaderBypass.ok === false,
      fubMutationOpen: fubMutationOpen.ok === false,
      invalidDbReference: invalidDbReference.ok === false,
      weakBacklogCloseout: weakBacklogCloseout.ok === false,
      unsafeSourceIdContract: unsafeSourceIdContract.ok === false,
    },
  }
}
