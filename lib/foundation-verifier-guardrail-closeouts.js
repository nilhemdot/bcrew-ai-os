export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID = 'VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY = 'verifier-guardrail-closeout-split-v1'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_PLAN_PATH = 'docs/process/verifier-guardrail-closeout-split-001-plan.md'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001.json'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-guardrail-closeout-split-check.mjs'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-guardrail-closeout-split-closeout.md'
export const VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES = 11732

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function evaluateGuardrailCloseoutFixture(fixture = {}) {
  const findings = []
  if (fixture.sheetsReadsNeverCacheFailures !== true) findings.push('sheets_failure_cache_allowed')
  if (fixture.doctrineKeepsMemoryPrivate !== true) findings.push('private_memory_doctrine_leak')
  if (fixture.decisionsProposalOnly !== true) findings.push('decision_auto_emit_mutates_live_truth')
  if (fixture.source021ExactWriterPaused !== true) findings.push('source_021_writer_path_not_paused')
  if (fixture.securityRedactionCentralized !== true) findings.push('security_redaction_not_centralized')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierGuardrailCloseoutsDogfoodProof() {
  const healthy = evaluateGuardrailCloseoutFixture({
    sheetsReadsNeverCacheFailures: true,
    doctrineKeepsMemoryPrivate: true,
    decisionsProposalOnly: true,
    source021ExactWriterPaused: true,
    securityRedactionCentralized: true,
  })
  const rejected = {
    cachedFailedSheetsRead: evaluateGuardrailCloseoutFixture({
      sheetsReadsNeverCacheFailures: false,
      doctrineKeepsMemoryPrivate: true,
      decisionsProposalOnly: true,
      source021ExactWriterPaused: true,
      securityRedactionCentralized: true,
    }),
    privateMemoryLeak: evaluateGuardrailCloseoutFixture({
      sheetsReadsNeverCacheFailures: true,
      doctrineKeepsMemoryPrivate: false,
      decisionsProposalOnly: true,
      source021ExactWriterPaused: true,
      securityRedactionCentralized: true,
    }),
    decisionMutation: evaluateGuardrailCloseoutFixture({
      sheetsReadsNeverCacheFailures: true,
      doctrineKeepsMemoryPrivate: true,
      decisionsProposalOnly: false,
      source021ExactWriterPaused: true,
      securityRedactionCentralized: true,
    }),
    source021UnpausedWithoutWriter: evaluateGuardrailCloseoutFixture({
      sheetsReadsNeverCacheFailures: true,
      doctrineKeepsMemoryPrivate: true,
      decisionsProposalOnly: true,
      source021ExactWriterPaused: false,
      securityRedactionCentralized: true,
    }),
    missingSecurityRedaction: evaluateGuardrailCloseoutFixture({
      sheetsReadsNeverCacheFailures: true,
      doctrineKeepsMemoryPrivate: true,
      decisionsProposalOnly: true,
      source021ExactWriterPaused: true,
      securityRedactionCentralized: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy guardrail fixture passes; cached failed Sheets reads, private memory leaks, decision mutation, unpaused SOURCE-021 writer proof, and missing redaction fail closed'
      : 'guardrail closeout verifier dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierGuardrailCloseouts(input = {}) {
  const {
    CANONICAL_DECISION_CATEGORIES,
    DOCTRINE_PROPAGATION_SOURCES,
    buildDoctrinePropagationStatus,
    buildSyntheticStaleSkillSource,
    currentState,
    dataStructuredContracts,
    decisionAutoEmit,
    decisionAutoEmitApproval,
    decisionAutoEmitDoc,
    decisionAutoEmitScriptSource,
    decisionAutoEmitSource,
    decisionAutoEmitText,
    docAuthority,
    doctrinePropagation,
    doctrinePropagationApproval,
    doctrinePropagationDoc,
    doctrinePropagationScriptSource,
    doctrinePropagationSource,
    doctrinePropagationText,
    driveContentExtractionSource,
    evaluateDoctrineSkillSource,
    extractDecisionCandidatesFromText,
    foundationBuildLogRegistrySource,
    foundationFrontendSource,
    foundationHub,
    fubKpiConnectionMapSource,
    fubZahndMiddlewareSource,
    googleDelegatedSource,
    googleSheetsCacheSource,
    hitListReconcile,
    kpiDashboardSource,
    packageJson,
    packageSource,
    repoRoot,
    scanDecisionAutoEmitCandidates,
    security001,
    security002,
    security002Approval,
    security002PlanSource,
    security002ProofCheckSource,
    security006,
    securityAccessSource,
    serverRouteSource,
    serverSource,
    sheetsQuotaHardening,
    sheetsQuotaHardeningApproval,
    sheetsQuotaHardeningDoc,
    source021,
    source021Proof,
    source021WriterProofCheckSource,
  } = input
  const checks = []

  ensure(
    checks,
    sheetsQuotaHardening?.lane === 'done' &&
      sheetsQuotaHardening?.priority === 'P1' &&
      sheetsQuotaHardeningApproval.cardId === 'SHEETS-QUOTA-HARDENING-001' &&
      Number(sheetsQuotaHardeningApproval.score) >= 9.8 &&
      sheetsQuotaHardeningApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(sheetsQuotaHardeningApproval.approvedAt).getTime()) &&
      includesAll(googleSheetsCacheSource, [
        'readGoogleSheetsCachedJson',
        'getGoogleSheetsCacheStats',
        'GOOGLE_SHEETS_CACHE_DISABLED',
        'quota429Count',
        'quotaRisk',
      ]) &&
      includesAll(googleDelegatedSource, [
        'getSheetValuesBatch',
        'getGoogleSheetsCacheStats',
        'readGoogleSheetsCachedJson',
      ]) &&
      includesAll(driveContentExtractionSource, [
        'getSheetValuesBatch',
        'batchResponse',
      ]) &&
      includesAll(serverRouteSource, ['getGoogleSheetsCacheStats', 'sheetsApiTrust']) &&
      includesAll(foundationFrontendSource, ['renderSheetsApiTrustPanel', 'Sheets API Trust']) &&
      includesAll(sheetsQuotaHardeningDoc, [
        'Writes are never cached',
        'Failed Google API reads are never cached as healthy data',
        'GOOGLE_SHEETS_CACHE_DISABLED',
        'per-user requests per minute: 600',
      ]) &&
      foundationHub.sheetsApiTrust &&
      Object.prototype.hasOwnProperty.call(foundationHub.sheetsApiTrust, 'hits') &&
      Object.prototype.hasOwnProperty.call(foundationHub.sheetsApiTrust, 'misses') &&
      /Sheets API Trust/.test(sheetsQuotaHardening?.statusNote || '') &&
      /batchGet/.test(sheetsQuotaHardening?.statusNote || ''),
    'SHEETS-QUOTA-HARDENING-001 closes Sheets API quota hardening',
    sheetsQuotaHardening ? `${sheetsQuotaHardening.lane} / ${sheetsQuotaHardening.priority} / ${sheetsQuotaHardening.title}` : 'missing SHEETS-QUOTA-HARDENING-001',
  )
  const doctrinePropagationStatus = await buildDoctrinePropagationStatus({
    repoRoot,
    apply: false,
  })
  const syntheticDoctrineFindings = evaluateDoctrineSkillSource(buildSyntheticStaleSkillSource(), {
    includeSynthetic: false,
  })
  ensure(
    checks,
    doctrinePropagation?.lane === 'done' &&
      doctrinePropagation?.priority === 'P0' &&
      hitListReconcile?.lane === 'done' &&
      hitListReconcile?.priority === 'P1' &&
      doctrinePropagationApproval.cardId === 'DOCTRINE-PROPAGATION-001' &&
      Number(doctrinePropagationApproval.score) >= 9.8 &&
      doctrinePropagationApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(doctrinePropagationApproval.approvedAt).getTime()) &&
      includesAll(packageSource, ['"doctrine:propagation-check"', 'scripts/doctrine-propagation-check.mjs']) &&
      includesAll(doctrinePropagationSource, [
        'DOCTRINE_PROPAGATION_SOURCES',
        'buildDoctrinePropagationStatus',
        'Private memory stays private',
        'Canonical hit list controls sequence',
      ]) &&
      includesAll(doctrinePropagationScriptSource, [
        'Doctrine propagation check',
        'DOCTRINE_PROPAGATION_SUMMARY',
        '--apply',
      ]) &&
      includesAll(doctrinePropagationDoc, [
        'Private memory files can trigger review',
        'content is not copied',
        'hardcoded doctrine source list',
        'HIT-LIST-RECONCILE-001',
      ]) &&
      includesAll(serverRouteSource, ['buildDoctrinePropagationStatus', 'doctrinePropagation']) &&
      includesAll(foundationFrontendSource, ['renderDoctrinePropagationPanel', 'Doctrine Propagation']) &&
      foundationHub.doctrinePropagation?.summary?.doctrineCount >= DOCTRINE_PROPAGATION_SOURCES.length &&
      doctrinePropagationStatus.summary?.criticalFindings === 0 &&
      syntheticDoctrineFindings.some(finding => finding.type === 'missing_doctrine' && finding.doctrineId === 'plan-gate-98') &&
      /private memory/i.test(doctrinePropagationText) &&
      /doctrine-propagation-v1/.test(doctrinePropagationText),
    'DOCTRINE-PROPAGATION-001 closes skill doctrine propagation with proof',
    doctrinePropagation
      ? `${doctrinePropagation.lane} / approval=${doctrinePropagationApproval.score} / runtime=${foundationHub.doctrinePropagation?.status || 'missing'}`
      : 'missing DOCTRINE-PROPAGATION-001',
  )
  const syntheticDecisionScan = await scanDecisionAutoEmitCandidates({ synthetic: true, cwd: repoRoot })
  const duplicateDecisionCandidates = extractDecisionCandidatesFromText({
    text: 'Adopt evidence-based gates before feature work.\nAdopt evidence-based gates before feature work.',
    sourceLabel: 'synthetic duplicate proof',
  })
  ensure(
    checks,
    decisionAutoEmit?.lane === 'done' &&
      decisionAutoEmit?.priority === 'P0' &&
      decisionAutoEmitApproval.cardId === 'DECISION-AUTO-EMIT-001' &&
      Number(decisionAutoEmitApproval.score) >= 9.8 &&
      decisionAutoEmitApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(decisionAutoEmitApproval.approvedAt).getTime()) &&
      includesAll(packageSource, ['"decision:auto-emit"', 'scripts/decision-auto-emit.mjs']) &&
      includesAll(decisionAutoEmitSource, [
        'DECISION_AUTO_EMIT_VERBS',
        'scanDecisionAutoEmitCandidates',
        'applyDecisionAutoEmitCandidates',
        'Synthetic decision auto-emit mode is read-only',
      ]) &&
      includesAll(decisionAutoEmitScriptSource, [
        'Decision auto-emit',
        'Dry run only',
        'DECISION_AUTO_EMIT_SUMMARY',
      ]) &&
      includesAll(decisionAutoEmitDoc, [
        'proposed',
        'Dry-run is the default',
        'does not expand the decision category taxonomy',
        'strategy',
        'system',
        'execution',
        'people',
      ]) &&
      includesAll(serverRouteSource, ['scanDecisionAutoEmitCandidates', 'decisionAutoEmit']) &&
      includesAll(foundationFrontendSource, ['renderDecisionAutoEmitPanel', 'Auto-Emitted Decisions']) &&
      CANONICAL_DECISION_CATEGORIES.length === 4 &&
      ['strategy', 'system', 'execution', 'people'].every(category => CANONICAL_DECISION_CATEGORIES.includes(category)) &&
      syntheticDecisionScan.candidateCount >= 2 &&
      duplicateDecisionCandidates.length === 1 &&
      foundationHub.decisionAutoEmit?.summary?.candidateCount >= 2 &&
      /proposed-only|proposed decisions/i.test(decisionAutoEmitText) &&
      /decision-auto-emit-v1/.test(decisionAutoEmitText),
    'DECISION-AUTO-EMIT-001 closes proposed decision auto-emission with proof',
    decisionAutoEmit
      ? `${decisionAutoEmit.lane} / approval=${decisionAutoEmitApproval.score} / synthetic=${syntheticDecisionScan.candidateCount}`
      : 'missing DECISION-AUTO-EMIT-001',
  )
  ensure(
    checks,
    docAuthority?.lane === 'done' &&
      dataStructuredContracts?.lane === 'done' &&
      source021?.lane === 'scoped' &&
      source021Proof?.lane === 'done' &&
      ['done', 'scoped'].includes(security001?.lane) &&
      security006?.lane === 'scoped' &&
      String(docAuthority?.statusNote || '').includes('Proof command: `npm run foundation:verify`') &&
      String(dataStructuredContracts?.statusNote || '').includes('/api/source-of-truth') &&
      String(source021?.statusNote || '').includes('Paused on 2026-05-02') &&
      String(source021?.statusNote || '').includes('exact production writer/replication path') &&
      String(source021?.statusNote || '').includes('process:source-021-writer-proof-check') &&
      String(source021Proof?.statusNote || '').includes('53/53') &&
      String(security001?.statusNote || '').includes('moved this out of executing') &&
      String(security006?.statusNote || '').includes('moved this out of executing'),
    'Known stale/unclear executing cards were handled',
    `DOC=${docAuthority?.lane || 'missing'} / DATA=${dataStructuredContracts?.lane || 'missing'} / SOURCE-021=${source021?.lane || 'missing'} + proof=${source021Proof?.lane || 'missing'} / SECURITY=${security001?.lane || 'missing'},${security006?.lane || 'missing'}`,
  )
  ensure(
    checks,
    packageJson.scripts?.['process:source-021-writer-proof-check'] &&
      source021WriterProofCheckSource.includes('SOURCE_021_WRITER_PROOF_SUMMARY') &&
      source021WriterProofCheckSource.includes('paused_exact_writer_path_not_proven') &&
      fubZahndMiddlewareSource.includes('2026-05-02 proof pass') &&
      fubZahndMiddlewareSource.includes('InsertPersonToSupabase` does **not** write `leaddate`') &&
      fubZahndMiddlewareSource.includes('exact production path that copies or writes the rich date fields into live Supabase is **not** proven') &&
      fubKpiConnectionMapSource.includes('Plain-English coaching language') &&
      fubKpiConnectionMapSource.includes('Do not say "the agent created a lead" unless the record proves a brand-new human') &&
      kpiDashboardSource.includes('paused exact writer ownership') &&
      currentState.includes('paused only for exact production writer/replication proof'),
    'SOURCE-021 is paused with exact writer-proof blocker and locked coaching semantics',
    `card=${source021?.lane || 'missing'} / script=${packageJson.scripts?.['process:source-021-writer-proof-check'] ? 'yes' : 'missing'} / docs=${fubZahndMiddlewareSource.includes('2026-05-02 proof pass') ? 'yes' : 'missing'}`,
  )
  ensure(
    checks,
    security002?.lane === 'done' &&
      String(security002?.statusNote || '').includes('security-002-auth-tier-redaction-v1') &&
      security002Approval.cardId === 'SECURITY-002' &&
      security002Approval.score >= 9.8 &&
      security002Approval.approvedPlanRef === 'docs/process/security-002-auth-tier-redaction-plan.md' &&
      foundationBuildLogRegistrySource.includes('security-002-auth-tier-redaction-v1') &&
      security002PlanSource.includes('route posture') &&
      security002PlanSource.includes('subject_people') &&
      security002PlanSource.includes('owner-preserving') &&
      includesAll(securityAccessSource, [
        'export function assertTier',
        'export function assertRole',
        'export function buildAccessContext',
        'export const SECURITY_ROUTE_POSTURES',
        'buildRedactedCollectionResponse',
        'buildFilteredArtifactSummaryResponse',
        'subjectPeople',
        'sensitivity',
        'minTier',
        'DEFAULT_PROTECTED_ROUTE_POSTURE',
      ]) &&
      includesAll(securityAccessSource, [
        "route('POST', '/api/intelligence/evidence'",
        "route('GET', '/api/shared-communications/archive'",
        "route('GET', '/api/shared-communications/candidates'",
        "route('GET', '/api/shared-communications/synthesis'",
        "route('GET', '/api/foundation-hub'",
        "route('GET', '/api/doc'",
        "route('GET', '/api/ops-hub'",
        "route('GET', '/api/sales-hub'",
        "route('GET', '/api/agent-feedback/session'",
      ]) &&
      includesAll(serverSource, [
        'buildAccessContext',
        'listFoundationUsers({ activeOnly: false })',
        'findRoutePosture(req.method, req.path)',
        'authorizeRouteAccess(req, posture)',
        'deriveActorTier(req)',
        'maxTier: retrievalMaxTier',
      ]) &&
      !serverSource.includes('req.body?.maxTier') &&
      !serverSource.includes('req.body?.max_tier') &&
      includesAll(packageSource, ['"process:security-002-check"', 'scripts/process-security-002-check.mjs']) &&
      includesAll(security002ProofCheckSource, [
        'SECURITY_002_CHECK_SUMMARY',
        'john@johnkitchens.coach',
        'ryanc@bensoncrew.ca',
        'georgia.huntley@bensoncrew.ca',
        'filtered_summary_only',
        'route posture registry covers every route named in the plan',
      ]),
    'SECURITY-002 auth/tier/redaction layer is centrally implemented and verifier-covered',
    `card=${security002?.lane || 'missing'} / approval=${security002Approval.score} / script=${packageJson.scripts?.['process:security-002-check'] ? 'yes' : 'missing'}`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
  }
}
