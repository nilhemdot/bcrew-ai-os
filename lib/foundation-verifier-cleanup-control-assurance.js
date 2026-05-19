export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-cleanup-control-assurance-split-v1'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-cleanup-control-assurance-split-001-plan.md'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001.json'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-cleanup-control-assurance-split-check.mjs'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-cleanup-control-assurance-split-closeout.md'
export const VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_BEFORE_LINES = 8086

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluateCleanupControlAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.cleanupWavesVisible !== true) findings.push('cleanup_waves_hidden_failure')
  if (fixture.privateDocBoundaryEnforced !== true) findings.push('private_doc_boundary_hidden_failure')
  if (fixture.hardCheckpointBacklogPromoted !== true) findings.push('hard_checkpoint_backlog_hidden_failure')
  if (fixture.phaseOneEnforcementExact !== true) findings.push('phase_one_enforcement_hidden_failure')
  if (fixture.controlLayerExact !== true) findings.push('control_layer_hidden_failure')
  if (fixture.gateReliabilityFailsClosed !== true) findings.push('gate_reliability_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_cleanup_control_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierCleanupControlAssuranceDogfoodProof() {
  const healthy = evaluateCleanupControlAssuranceFixture({
    cleanupWavesVisible: true,
    privateDocBoundaryEnforced: true,
    hardCheckpointBacklogPromoted: true,
    phaseOneEnforcementExact: true,
    controlLayerExact: true,
    gateReliabilityFailsClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenCleanupWaves: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: false,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: true,
      controlLayerExact: true,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenPrivateDocBoundary: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: false,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: true,
      controlLayerExact: true,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenHardCheckpointBacklog: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: false,
      phaseOneEnforcementExact: true,
      controlLayerExact: true,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenPhaseOneEnforcement: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: false,
      controlLayerExact: true,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenControlLayer: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: true,
      controlLayerExact: false,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenGateReliability: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: true,
      controlLayerExact: true,
      gateReliabilityFailsClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateCleanupControlAssuranceFixture({
      cleanupWavesVisible: true,
      privateDocBoundaryEnforced: true,
      hardCheckpointBacklogPromoted: true,
      phaseOneEnforcementExact: true,
      controlLayerExact: true,
      gateReliabilityFailsClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy cleanup/control assurance fixture passes; hidden cleanup, private-doc, hard-checkpoint, phase-one, control-layer, gate-reliability, and old-inline failures fail closed'
      : 'cleanup/control assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierCleanupControlAssurance(input = {}) {
  const {
    DOC_INVENTORY_CATEGORIES,
    DOCTRINE_PROPAGATION_SOURCES,
    GATE_RELIABILITY_DIRECT_VERIFIER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    GATE_RELIABILITY_RECURRING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_PLAN_RECONCILE_CARD_ID,
    FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
    PHASE_1_ENFORCEMENT_CARD_IDS,
    PHASE_1_ENFORCEMENT_PLAN_REF,
    PHASE_1_ENFORCEMENT_PLAN_SHA256,
    PROTECTED_FOUNDATION_PATH_PATTERNS,
    approvalFileIntegrity,
    approvalIntegrityDoc,
    approvalIntegritySource,
    approvalIntegritySynthetic,
    approvalLegacyLedger,
    archiveIndexSource,
    archiveRetire,
    archiveRetireApproval,
    archiveRetireManifest,
    archiveRetireStatus,
    archiveRetireText,
    backlogHygieneApi,
    backlogHygieneScriptSource,
    buildCeoDashboardPatternStatus,
    buildDecisionAutoEmitSafetyProof,
    buildDoctrinePropagationStatus,
    buildLogBacklogIdFix,
    buildLogFoundationControlBuild,
    buildLogFullSystemReAuditBuild,
    buildLogGatePerformanceBuild,
    buildLogGateReliabilityDirectVerifierBuild,
    buildLogGateReliabilityRecurringBuild,
    buildLogOwnershipProof,
    buildLogPhase1EnforcementBuild,
    buildLogPlanReconcileBuild,
    buildLogRecentMultiCloseoutBuild,
    buildLogWaveCleanupABuild,
    buildLogWaveCleanupBBuild,
    buildPersonalWorkspaceBoundaryStatus,
    buildSyntheticGateReliabilityProof,
    ceoDashboardPattern,
    ceoDashboardPatternDoc,
    ceoDashboardPatternSource,
    closeoutBackfill,
    closeoutBackfillDoc,
    currentPlan,
    currentState,
    decisionAutoEmitDoc,
    decisionAutoEmitScriptSource,
    decisionAutoEmitSource,
    decisionAutoEmitV2,
    docArchiveAuto,
    docArchiveAutoApproval,
    docArchiveAutoText,
    docArchiveCleanupStatus,
    docArchiveManifest,
    docAuthorityIndexRepair,
    docAuthorityIndexRepairApproval,
    docCategorization,
    docCategorizationApproval,
    docCategorizationSource,
    docOtherTriage,
    docOtherTriageApproval,
    docOtherTriageSource,
    docsIndexSource,
    docsReadmeSource,
    doctrinePropagationDoc,
    doctrinePropagationScriptSource,
    doctrinePropagationSource,
    doctrinePropagationV2,
    doctrinePropagationV2Approval,
    doctrinePropagationV3,
    exceptionCuration,
    exceptionCurationApproval,
    exceptionCurationStatus,
    exceptionCurationText,
    foundationBuildCloseouts,
    foundationBuildLog,
    foundationBuildLogSource,
    foundationControlApprovalRefs,
    foundationControlApprovalValidations,
    foundationControlApprovedPlan,
    foundationCurrentStateRendererSource,
    foundationCurrentStateSummarySource,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub,
    foundationPlanReconcile,
    foundationPlanReconcileCloseout,
    foundationPlanReconcileCurrentItem,
    foundationUiSource,
    foundationVerifierCleanupControlAssuranceSource,
    foundationVerifySource,
    fullSystemReAudit,
    fullSystemReAuditApproval,
    fullSystemReAuditSource,
    fullSystemReAuditText,
    gatePerformance,
    gatePerformanceApproval,
    gateReliability,
    gateReliabilityDirectVerifier,
    gateReliabilityDirectVerifierApprovalValidation,
    gateReliabilityDirectVerifierApprovedPlan,
    gateReliabilityRecurring,
    gateReliabilityRecurringApprovalValidation,
    gateReliabilityRecurringApprovedPlan,
    gateReliabilityScriptSource,
    gateReliabilitySource,
    getActionRouterSnapshot,
    getFoundationDbConstraintAudit,
    gitHookInstallStatus,
    gitHookScopeProof,
    gitHooksDoc,
    hardCheckpointTier0Cards,
    hardCheckpointTier0Ids,
    historicalCardHasVerifiedCloseout,
    hitListReconcile,
    hitListReconcileApproval,
    hitListReconcileStatus,
    hitListReconcileText,
    hitListSnapshot,
    localDocLink,
    localDocLinkApproval,
    localDocLinkDoc,
    localDocNonAllowlistedResponse,
    localDocNonLocalResponse,
    localDocSuccessResponse,
    localDocTraversalResponse,
    packageJson,
    packageSource,
    personalWorkspaceBoundary,
    personalWorkspaceBoundaryDoc,
    personalWorkspaceBoundaryScriptSource,
    personalWorkspaceBoundarySource,
    phase1ApprovalValidations,
    phase1ApprovedPlan,
    phaseDCleanupLibSource,
    phaseDCleanupSource,
    postShipFanoutScriptSource,
    preCommitHookInstall,
    processFanoutCheckSource,
    processFoundationShipDoc,
    processFoundationShipSource,
    processGitHooksSource,
    processHooksV2,
    processHooksV2Approval,
    processShipCheckSource,
    rebuildDocRetireManifest,
    rebuildDocsRetire,
    rebuildDocsRetireApproval,
    rebuildDocsRetireText,
    recentBuildsMultiCloseout,
    recentBuildsMultiCloseoutApproval,
    recentBuildsMultiCloseoutText,
    repoFileExists,
    repoRoot,
    researchCuration,
    researchCurationApproval,
    researchCurationStatus,
    researchCurationText,
    serverRouteSource,
    serverSource,
    systemInventory,
    verifierExceptionCuration,
    verifyPrivateMemorySyntheticProbe,
    verifyProcessFoundationShipRefusesMissingArgs,
  } = input
  const checks = []
  ensure(
    checks,
    docArchiveAuto?.lane === 'done' &&
      researchCuration?.lane === 'done' &&
      docArchiveAutoApproval.cardId === 'DOC-ARCHIVE-AUTO-001' &&
      researchCurationApproval.cardId === 'RESEARCH-CURATION-001' &&
      Number(docArchiveAutoApproval.score) >= 9.8 &&
      Number(researchCurationApproval.score) >= 9.8 &&
      docArchiveManifest.summary?.total === 113 &&
      docArchiveManifest.summary?.byType?.handoff === 87 &&
      docArchiveManifest.summary?.byType?.audit === 18 &&
      docArchiveManifest.summary?.byType?.research === 8 &&
      docArchiveCleanupStatus.summary?.archivedFileCount === 113 &&
      docArchiveCleanupStatus.status === 'healthy' &&
      researchCurationStatus.summary?.researchCardCount >= 100 &&
      researchCurationStatus.summary?.autoClosedCount === 0 &&
      includesAll(phaseDCleanupSource, [
        'docs/_archive/handoffs',
        'docs/_archive/audits',
        'docs/_archive/research',
        'doc-archive-manifest.json',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderDocArchiveCleanupPanel',
        'Doc Archive Cleanup',
        'renderResearchCurationPanel',
        'Research Curation',
      ]) &&
      includesAll(serverRouteSource, ['docArchiveCleanup', 'researchCuration']) &&
      archiveIndexSource.includes('Archived Evidence Index') &&
      docArchiveAutoText.includes('113 files') &&
      researchCurationText.includes('zero auto-closed research cards'),
    'Phase D Cards 13+14 preserve old evidence and research cards without deleting or auto-closing',
    `${docArchiveCleanupStatus.summary?.archivedFileCount || 0} archived / research preserved=${researchCurationStatus.summary?.preservedCardCount || 0}`,
  )
  ensure(
    checks,
    rebuildDocsRetire?.lane === 'done' &&
      archiveRetire?.lane === 'done' &&
      rebuildDocsRetireApproval.cardId === 'REBUILD-DOCS-RETIRE-001' &&
      archiveRetireApproval.cardId === 'ARCHIVE-RETIRE-001' &&
      Number(rebuildDocsRetireApproval.score) >= 9.8 &&
      Number(archiveRetireApproval.score) >= 9.8 &&
      rebuildDocRetireManifest.movedFiles?.length === 2 &&
      rebuildDocRetireManifest.movedFiles.every(item => item.action === 'moved' || item.action === 'already_moved') &&
      archiveRetireManifest.summary?.deletedCount === 0 &&
      archiveRetireManifest.summary?.safeDeleteEntryCount === 0 &&
      archiveRetireStatus.summary?.retiredRebuildDocCount === 2 &&
      archiveRetireStatus.summary?.deletedCount === 0 &&
      archiveRetireStatus.status === 'healthy' &&
      includesAll(phaseDCleanupSource, [
        'safeDeleteAllowlistNames',
        'refusedEntries',
        'No explicit safe-delete archive was present',
        'Explicit no-touch path for ARCHIVE-RETIRE-001',
      ]) &&
      includesAll(foundationFrontendSource, ['renderArchiveRetirePanel', 'Archive Retire']) &&
      includesAll(serverRouteSource, ['archiveRetire']) &&
      rebuildDocsRetireText.includes('plan-history') &&
      archiveRetireText.includes('0 files were deleted'),
    'Phase D Cards 15+16 retire stale rebuild docs and keep delete lane allowlisted',
    `retired=${archiveRetireStatus.summary?.retiredRebuildDocCount || 0} / deleted=${archiveRetireStatus.summary?.deletedCount || 0} / refused=${archiveRetireStatus.summary?.refusedCount || 0}`,
  )
  ensure(
    checks,
    exceptionCuration?.lane === 'done' &&
      hitListReconcile?.lane === 'done' &&
      exceptionCurationApproval.cardId === 'EXCEPTION-CURATION-001' &&
      hitListReconcileApproval.cardId === 'HIT-LIST-RECONCILE-001' &&
      Number(exceptionCurationApproval.score) >= 9.8 &&
      Number(hitListReconcileApproval.score) >= 9.8 &&
      verifierExceptionCuration.deadline === '2026-07-27' &&
      verifierExceptionCuration.decisions?.length === 24 &&
      exceptionCurationStatus.summary?.curatedCount === 24 &&
      exceptionCurationStatus.status === 'healthy' &&
      hitListSnapshot.entries?.length >= 20 &&
      hitListReconcileStatus.summary?.hitListCardCount >= 20 &&
      ['healthy', 'warning'].includes(hitListReconcileStatus.status) &&
      (
        hitListReconcileStatus.summary?.snapshotAgeDays <= 14 ||
        (hitListReconcileStatus.findings || []).every(finding => finding.type === 'hit_list_snapshot_stale')
      ) &&
      hitListReconcileStatus.privacyBoundary.includes('does not auto-read') &&
      includesAll(phaseDCleanupLibSource, [
        'buildExceptionCurationStatus',
        'buildHitListReconcileStatusFromFile',
        'Snapshot can drift when Steve updates the Google Doc',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderExceptionCurationPanel',
        'Exception Curation',
        'renderHitListReconcilePanel',
        'Hit-List Reconcile',
      ]) &&
      includesAll(serverRouteSource, ['exceptionCuration', 'hitListReconcile']) &&
      exceptionCurationText.includes('2026-07-27') &&
      hitListReconcileText.includes('does not auto-read'),
    'Phase D Exception Curation and Hit-List Reconcile close loopholes without private-doc auto-import',
    `exceptions=${exceptionCurationStatus.summary?.curatedCount || 0} / hit-list cards=${hitListReconcileStatus.summary?.hitListCardCount || 0}`,
  )
  const multiCloseoutCommitGroups = (foundationBuildLog.builds || []).reduce((acc, build) => {
    const key = build.sha || build.shortSha || build.subject || 'unknown'
    acc[key] = (acc[key] || 0) + (build.operatorCloseout ? 1 : 0)
    return acc
  }, {})
  ensure(
    checks,
    recentBuildsMultiCloseout?.lane === 'done' &&
      recentBuildsMultiCloseoutApproval.cardId === 'RECENT-BUILDS-MULTI-CLOSEOUT-001' &&
      Number(recentBuildsMultiCloseoutApproval.score) >= 9.8 &&
      Object.values(multiCloseoutCommitGroups).some(count => count >= 3) &&
      includesAll(foundationFrontendSource, [
        'groupBuildsByCommit',
        'renderBuildCommitGroup',
        'Multiple closeouts',
        'One commit can carry multiple closeouts',
      ]) &&
      buildLogRecentMultiCloseoutBuild?.operatorCloseout === true &&
      buildLogRecentMultiCloseoutBuild.relatedBacklog?.some(item => item.id === 'RECENT-BUILDS-MULTI-CLOSEOUT-001' && item.lane === 'done') &&
      /multi-closeout/i.test(recentBuildsMultiCloseoutText),
    'RECENT-BUILDS-MULTI-CLOSEOUT-001 keeps same-commit closeouts visible',
    buildLogRecentMultiCloseoutBuild
      ? `${buildLogRecentMultiCloseoutBuild.shortSha} / grouped multi-closeout visible`
      : 'missing recent-builds multi-closeout closeout',
  )
  const fullSystemReAuditVerdicts = fullSystemReAuditSource.match(/\*\*Verdict:\*\* `(clean|minor drift|blocker)`/g) || []
  ensure(
    checks,
    fullSystemReAudit?.lane === 'done' &&
      fullSystemReAudit?.priority === 'P0' &&
      fullSystemReAuditApproval.cardId === 'FULL-SYSTEM-RE-AUDIT-001' &&
      Number(fullSystemReAuditApproval.score) >= 9.8 &&
      fullSystemReAuditApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(fullSystemReAuditApproval.approvedAt).getTime()) &&
      fullSystemReAuditVerdicts.length === 12 &&
      !fullSystemReAuditVerdicts.some(item => item.includes('`blocker`')) &&
      includesAll(fullSystemReAuditSource, [
        '## 1. Backlog Truth',
        '## 2. Process Gates',
        '## 3. Recent Builds',
        '## 4. Foundation Surfaces',
        '## 5. Verifier Coverage',
        '## 6. Source Contracts',
        '## 7. Decisions',
        '## 8. Doctrine Propagation',
        '## 9. Archive And Doc Cleanup',
        '## 10. Runtime And Code Trust',
        '## 11. Manual Pattern Scan',
        '## 12. Feature Readiness For Phase F',
        'Blockers: 0',
        'Open Phase F with follow-up cards',
        'New follow-up cards created from this audit',
        'DOC-AUTHORITY-INDEX-REPAIR-001',
        'DOCTRINE-PROPAGATION-002',
        'PROCESS-HOOKS-002',
      ]) &&
      ['scoped', 'done'].includes(docAuthorityIndexRepair?.lane) &&
      ['scoped', 'done'].includes(doctrinePropagationV2?.lane) &&
      ['scoped', 'done'].includes(processHooksV2?.lane) &&
      fullSystemReAuditText.includes('0 blockers') &&
      fullSystemReAuditText.includes('Open Phase F') &&
      currentPlan.includes('`FULL-SYSTEM-RE-AUDIT-001` — done for v1') &&
      currentPlan.includes('Phase F can open with follow-up cards') &&
      currentState.includes('`FULL-SYSTEM-RE-AUDIT-001` found 0 blockers') &&
      buildLogFullSystemReAuditBuild?.operatorCloseout === true &&
      buildLogFullSystemReAuditBuild.relatedBacklog?.some(item => item.id === 'FULL-SYSTEM-RE-AUDIT-001' && item.lane === 'done') &&
      /full-system-re-audit-v1/.test(buildLogFullSystemReAuditBuild?.closeoutKey || ''),
    'FULL-SYSTEM-RE-AUDIT-001 closes Phase E with no blockers',
    fullSystemReAudit
      ? `${fullSystemReAudit.lane} / verdicts=${fullSystemReAuditVerdicts.length} / phaseF=open-with-follow-ups`
      : 'missing FULL-SYSTEM-RE-AUDIT-001',
  )
  const privateLocalDocs = systemInventory.docs?.privateLocal || []
  const privateLocalDocPaths = privateLocalDocs.map(doc => doc.path).sort()
  const expectedPrivateLocalDocs = ['HEARTBEAT.md', 'IDENTITY.md', 'MEMORY.md', 'TOOLS.md', 'USER.md']
  const docOtherTriageRows = docOtherTriageSource.split('\n').filter(line => line.startsWith('| docs/')).length
  const docOtherTriageCategories = [
    'Active doctrine',
    'Process & runbooks',
    'Source notes',
    'Specs',
    'Strategy reference',
    'Agent personas',
    'User profile',
    'Recent handoffs - active',
    'Recent audits - active',
    'Plan history',
    'Archive',
    'Local-private',
  ]
  ensure(
    checks,
    localDocLink?.lane === 'done' &&
      docAuthorityIndexRepair?.lane === 'done' &&
      docOtherTriage?.lane === 'done' &&
      localDocLinkApproval.cardId === 'LOCAL-DOC-LINK-001' &&
      Number(localDocLinkApproval.score) >= 9.8 &&
      docAuthorityIndexRepairApproval.cardId === 'DOC-AUTHORITY-INDEX-REPAIR-001' &&
      Number(docAuthorityIndexRepairApproval.score) >= 9.8 &&
      docOtherTriageApproval.cardId === 'DOC-OTHER-TRIAGE-001' &&
      Number(docOtherTriageApproval.score) >= 9.8,
    'Wave Cleanup A backlog cards have approved 9.8 plans and done state',
    `local=${localDocLink?.lane || 'missing'} / authority=${docAuthorityIndexRepair?.lane || 'missing'} / triage=${docOtherTriage?.lane || 'missing'}`,
  )
  ensure(
    checks,
    localDocSuccessResponse.status === 200 &&
      localDocSuccessResponse.text.length > 20 &&
      localDocNonLocalResponse.status === 403 &&
      /local_doc_forbidden|localhost|127\.0\.0\.1|::1/i.test(localDocNonLocalResponse.text) &&
      localDocTraversalResponse.status === 403 &&
      /local_doc_forbidden|allowlisted|traversal/i.test(localDocTraversalResponse.text) &&
      localDocNonAllowlistedResponse.status === 403 &&
      /local_doc_forbidden|allowlisted/i.test(localDocNonAllowlistedResponse.text),
    'local private doc endpoint fails closed for non-local, traversal, and non-allowlisted requests',
    `local=${localDocSuccessResponse.status} nonLocal=${localDocNonLocalResponse.status} traversal=${localDocTraversalResponse.status} nonAllow=${localDocNonAllowlistedResponse.status}`,
  )
  ensure(
    checks,
    JSON.stringify(privateLocalDocPaths) === JSON.stringify(expectedPrivateLocalDocs) &&
      privateLocalDocs.every(doc => doc.usage === 'private-local' && doc.openHref === `/api/foundation/local-doc/${encodeURIComponent(doc.path)}`) &&
      privateLocalDocs.every(doc => doc.localOpenEligible === true && /local/i.test(doc.localOpenReason || '')),
    'System Inventory exposes local-private docs only through the gated endpoint',
    `${privateLocalDocs.length} private docs / hrefs=${privateLocalDocs.map(doc => doc.openHref || 'metadata-only').join(', ')}`,
  )
  ensure(
    checks,
    includesAll(serverSource, [
      "app.get('/api/foundation/local-doc/:name'",
      'getPrivateLocalDocAccess',
      'getServedCodeTrustGate',
      'resolvePrivateLocalDoc',
      'Only allowlisted private local docs can be opened.',
    ]) &&
      includesAll(localDocLinkDoc, [
        'GET /api/foundation/local-doc/:name',
        'localhost',
        '127.0.0.1',
        '::1',
        'Served-code trust',
        'repo root',
        '403',
      ]) &&
      !foundationUiSource.includes('file://'),
    'LOCAL-DOC-LINK-001 documents and implements the privacy boundary',
    'allowlist + host gate + served-code gate + repo-root guard documented',
  )
  ensure(
    checks,
    !docsReadmeSource.includes('[`rebuild-decisions.md`](rebuild-decisions.md)') &&
      docsReadmeSource.includes('rebuild/plan-history/') &&
      docsIndexSource.includes('| [rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md](rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md) | 2026-04-29 | foundation | superseded-evidence') &&
      docsIndexSource.includes('| [rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md](rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md) | 2026-04-29 | foundation | superseded-evidence'),
    'DOC-AUTHORITY-INDEX-REPAIR-001 keeps retired rebuild docs out of active truth',
    'README points to plan-history evidence and docs/INDEX marks retired docs superseded-evidence',
  )
  ensure(
    checks,
    docOtherTriageRows === 127 &&
      docOtherTriageCategories.every(category => docOtherTriageSource.includes(category)) &&
      includesAll(docOtherTriageSource, [
        'Other docs reviewed: 127',
        '| Path | Current Category | Proposed Category | Status | Reason | Recommended Owner Card |',
        'This report does not move, delete, or rewrite the listed docs.',
      ]),
    'DOC-OTHER-TRIAGE-001 classifies the Other docs without moving or deleting them',
    `${docOtherTriageRows} rows / ${docOtherTriageCategories.length} categories`,
  )
  ensure(
    checks,
    foundationHtmlSource.includes('data-section="build-log">Recent Work</a>') &&
      foundationFrontendSource.includes("heroTitle.textContent = 'Recent Work'") &&
      foundationFrontendSource.includes("container.innerHTML = '<p>Loading recent work.</p>'") &&
      foundationCurrentStateSummarySource.includes("title: 'KPI source health system'") &&
      foundationCurrentStateSummarySource.includes('KPI source health reports') &&
      foundationCurrentStateRendererSource.includes('currentStateSummary'),
    'Foundation copy cleanup reflects Recent Work and current KPI health status',
    'Recent Work label remains and KPI Level 3 copy moved behind the source-backed summary payload',
  )
  ensure(
    checks,
    currentPlan.includes('Wave Cleanup A') &&
      currentPlan.includes('Cleanup B') &&
      currentPlan.includes('LOCAL-DOC-LINK-001') &&
      currentPlan.includes('DOC-OTHER-TRIAGE-001') &&
      currentState.includes('Wave Cleanup A') &&
      currentState.includes('docs/process/doc-other-triage.md') &&
      (currentState.includes('Cleanup B is next') || currentState.includes('Cleanup B is done')),
    'current plan/state carried Cleanup B after Wave Cleanup A',
    currentState.includes('Cleanup B is done') ? 'Cleanup B done; Phase G planning next' : 'Wave Cleanup A done; Cleanup B is next under 9.8 planning',
  )
  ensure(
    checks,
    buildLogWaveCleanupABuild?.operatorCloseout === true &&
      buildLogWaveCleanupABuild.relatedBacklog?.some(item => item.id === 'LOCAL-DOC-LINK-001' && item.lane === 'done') &&
      buildLogWaveCleanupABuild.relatedBacklog?.some(item => item.id === 'DOC-AUTHORITY-INDEX-REPAIR-001' && item.lane === 'done') &&
      buildLogWaveCleanupABuild.relatedBacklog?.some(item => item.id === 'DOC-OTHER-TRIAGE-001' && item.lane === 'done') &&
      /wave-cleanup-a-local-docs-triage-v1/.test(buildLogWaveCleanupABuild?.closeoutKey || ''),
    'Recent Work carries Wave Cleanup A closeout proof',
    buildLogWaveCleanupABuild
      ? `${buildLogWaveCleanupABuild.shortSha} / ${buildLogWaveCleanupABuild.closeoutKey}`
      : 'missing Wave Cleanup A closeout',
  )
  const trackedDocCategories = systemInventory.docs?.tracked?.map(doc => doc.category) || []
  const trackedOtherDocs = (systemInventory.docs?.tracked || []).filter(doc => doc.category === 'Other')
  const categorySummary = systemInventory.docs?.categorySummary || {}
  const doctrinePropagationV2Status = await buildDoctrinePropagationStatus({
    repoRoot,
    apply: false,
  })
  const privateMemoryProbe = await verifyPrivateMemorySyntheticProbe()
  const processFoundationShipMissingArgs = await verifyProcessFoundationShipRefusesMissingArgs()
  ensure(
    checks,
    docCategorization?.lane === 'done' &&
      doctrinePropagationV2?.lane === 'done' &&
      processHooksV2?.lane === 'done' &&
      docCategorizationApproval.cardId === 'DOC-CATEGORIZATION-001' &&
      Number(docCategorizationApproval.score) >= 9.8 &&
      doctrinePropagationV2Approval.cardId === 'DOCTRINE-PROPAGATION-002' &&
      Number(doctrinePropagationV2Approval.score) >= 9.8 &&
      processHooksV2Approval.cardId === 'PROCESS-HOOKS-002' &&
      Number(processHooksV2Approval.score) >= 9.8,
    'Wave Cleanup B backlog cards have approved 9.8 plans and done state',
    `doc=${docCategorization?.lane || 'missing'} / doctrine=${doctrinePropagationV2?.lane || 'missing'} / hooks=${processHooksV2?.lane || 'missing'}`,
  )
  ensure(
    checks,
    DOC_INVENTORY_CATEGORIES.every(category => docCategorizationSource.includes(category)) &&
      DOC_INVENTORY_CATEGORIES.every(category => Object.prototype.hasOwnProperty.call(categorySummary, category)) &&
      trackedDocCategories.every(category => DOC_INVENTORY_CATEGORIES.includes(category)) &&
      trackedOtherDocs.length === 0 &&
      privateLocalDocs.every(doc => doc.category === 'Local-private') &&
      includesAll(serverSource, ['parseDocOtherTriageReport', 'classifyDocInventoryPath', 'summarizeDocInventoryCategories', 'legacyCategory']) &&
      includesAll(foundationFrontendSource, ['Doc categories', 'tracked docs remain in Other']) &&
      docOtherTriageRows === 127,
    'DOC-CATEGORIZATION-001 replaces vague Other with the 12 approved doc categories',
    `${Object.keys(categorySummary).length} categories / Other=${trackedOtherDocs.length}`,
  )
  ensure(
    checks,
    doctrinePropagationV2Status.privateMemorySignalMode === 'metadata-only' &&
      doctrinePropagationV2Status.summary?.privateMemoryContentCopied === false &&
      doctrinePropagationV2Status.privateMemoryFileCount >= 5 &&
      (doctrinePropagationV2Status.privateMemoryStats || []).every(item => item.contentMode === 'metadata-only' && item.contentCopied === false) &&
      privateMemoryProbe.ok &&
      includesAll(doctrinePropagationSource, ['PRIVATE_MEMORY_ROOT_FILES', 'listPrivateMemorySignalPaths', 'contentCopied: false', 'reviewSignals']) &&
      includesAll(doctrinePropagationDoc, ['metadata only', 'memory/*.md', 'contentCopied: false', 'Tier-two persona surfaces']) &&
      includesAll(doctrinePropagationScriptSource, ['Private memory mode', 'privateMemoryContentCopied']) &&
      /metadata-only/.test(JSON.stringify(foundationHub.doctrinePropagation || {})),
    'DOCTRINE-PROPAGATION-002 keeps private memory checks metadata-only',
    privateMemoryProbe.detail,
  )
  ensure(
    checks,
    includesAll(packageSource, ['"process:foundation-ship"', 'scripts/process-foundation-ship.mjs']) &&
      includesAll(processFoundationShipSource, [
        'Foundation ship gate',
        'Missing required argument(s)',
        'runRuntimeRestartStep',
        'ai.bcrew.dashboard',
        'ai.bcrew.foundation-worker',
        'skipRuntimeRestart',
        'process:ship-check',
        'process:fanout-check',
        'process:post-ship-fanout',
        'foundation:verify',
      ]) &&
      includesAll(processFoundationShipDoc, [
        'one command',
        'Restart the supervised dashboard',
        '--skipRuntimeRestart=true',
        'does not replace Steve',
        'refuses to run',
        'does not silently skip',
      ]) &&
      processFoundationShipMissingArgs.ok,
    'PROCESS-HOOKS-002 adds one canonical ship gate wrapper that refuses missing args',
    processFoundationShipMissingArgs.detail,
  )
  ensure(
    checks,
    buildLogWaveCleanupBBuild?.operatorCloseout === true &&
      buildLogWaveCleanupBBuild.relatedBacklog?.some(item => item.id === 'DOC-CATEGORIZATION-001' && item.lane === 'done') &&
      buildLogWaveCleanupBBuild.relatedBacklog?.some(item => item.id === 'DOCTRINE-PROPAGATION-002' && item.lane === 'done') &&
      buildLogWaveCleanupBBuild.relatedBacklog?.some(item => item.id === 'PROCESS-HOOKS-002' && item.lane === 'done') &&
      /wave-cleanup-b-doc-categories-doctrine-hooks-v1/.test(buildLogWaveCleanupBBuild?.closeoutKey || '') &&
      currentPlan.includes('Cleanup B: `DOC-CATEGORIZATION-001`, `DOCTRINE-PROPAGATION-002`, and `PROCESS-HOOKS-002` — done for v1') &&
      currentState.includes('Cleanup B is done for v1') &&
      (
        currentState.includes('Phase G planning is next') ||
        currentState.includes('Phase G Track 1 is done for v1')
      ),
    'Recent Work carries Wave Cleanup B closeout and Phase G boundary',
    buildLogWaveCleanupBBuild
      ? `${buildLogWaveCleanupBBuild.shortSha} / ${buildLogWaveCleanupBBuild.closeoutKey}`
      : 'missing Wave Cleanup B closeout',
  )
  ensure(
    checks,
    gatePerformance?.lane === 'done' &&
      gatePerformance?.priority === 'P1' &&
      gatePerformanceApproval.cardId === 'GATE-PERFORMANCE-001' &&
      Number(gatePerformanceApproval.score) >= 9.8 &&
      includesAll(processFoundationShipSource, [
        'strictShipCheckVerify',
        'process:foundation-ship runs final foundation:verify once after fanout gates',
        'Promise.allSettled',
        'formatFoundationGateRetryMessage',
        'Gate timing summary',
        'targetMs',
      ]) &&
      includesAll(processFoundationShipDoc, [
        'runs `foundation:verify` once at the end',
        '`npm run process:fanout-check` and `npm run process:post-ship-fanout` in parallel',
        'Strict mode remains available',
        'one retry',
        'under five minutes',
      ]),
    'GATE-PERFORMANCE-001 removes duplicate verifier work and exposes gate timing',
    gatePerformance
      ? `${gatePerformance.lane} / ${gatePerformance.priority} / strict=${processFoundationShipSource.includes('strictShipCheckVerify')}`
      : 'missing GATE-PERFORMANCE-001',
  )
  ensure(
    checks,
    buildLogGatePerformanceBuild?.operatorCloseout === true &&
      buildLogGatePerformanceBuild.relatedBacklog?.some(item => item.id === 'GATE-PERFORMANCE-001' && item.lane === 'done') &&
      /gate-performance-v1/.test(buildLogGatePerformanceBuild?.closeoutKey || '') &&
      currentPlan.includes('Phase G Track 1: `GATE-PERFORMANCE-001` — done for v1') &&
      currentState.includes('Phase G Track 1 is done for v1') &&
      currentState.includes('UI-MENU-LAYOUT-POLISH-001` is done for v1'),
    'Recent Work carries GATE-PERFORMANCE-001 closeout and remaining Phase G boundary',
    buildLogGatePerformanceBuild
      ? `${buildLogGatePerformanceBuild.shortSha} / ${buildLogGatePerformanceBuild.closeoutKey}`
      : 'missing GATE-PERFORMANCE-001 closeout',
  )
  const foundationPlanReconcileInControlPlaneSprint =
    foundationPlanReconcile?.lane === 'executing' &&
    foundationPlanReconcileCurrentItem?.stage === 'building_now' &&
    foundationPlanReconcileCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === 'FOUNDATION-PLAN-RECONCILE-001'
  const foundationPlanReconcileClosedInControlPlaneSprint =
    foundationPlanReconcile?.lane === 'done' &&
    String(foundationPlanReconcile?.statusNote || '').includes(FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY) &&
    foundationPlanReconcileCloseout?.operatorCloseout === true &&
    (foundationPlanReconcileCloseout.backlogIds || []).includes(FOUNDATION_PLAN_RECONCILE_CARD_ID) &&
    historicalCardHasVerifiedCloseout(FOUNDATION_PLAN_RECONCILE_CARD_ID)
  const hardCheckpointCardLaneIsAcceptable = card => {
    if (!card) return false
    if (card.id === 'FOUNDATION-PLAN-RECONCILE-001' && foundationPlanReconcileInControlPlaneSprint) return true
    return ['scoped', 'done'].includes(card.lane)
  }
  ensure(
    checks,
    (foundationPlanReconcile?.lane === 'scoped' || foundationPlanReconcileInControlPlaneSprint || foundationPlanReconcileClosedInControlPlaneSprint) &&
      foundationPlanReconcile?.priority === 'P0' &&
      /hard-checkpoint sprint plan/.test(foundationPlanReconcile?.summary || '') &&
      (/before Phase G Track 2/.test(foundationPlanReconcile?.nextAction || '') ||
        foundationPlanReconcileCurrentItem?.existingWorkCheckStatus === 'complete' ||
        foundationPlanReconcileClosedInControlPlaneSprint) &&
      hardCheckpointTier0Cards.every(card =>
        hardCheckpointCardLaneIsAcceptable(card) &&
          ['P0', 'P1'].includes(card.priority) &&
          (card.summary || '').length > 80 &&
          (card.whyItMatters || '').length > 80 &&
          (card.nextAction || '').length > 80 &&
          (card.statusNote || '').length > 40
      ) &&
      buildLogPlanReconcileBuild?.operatorCloseout === true &&
      ['FOUNDATION-PLAN-RECONCILE-001', ...hardCheckpointTier0Ids].every(id =>
        (buildLogPlanReconcileBuild.backlogIds || []).includes(id)
      ) &&
      /foundation-plan-reconcile-backlog-depth-v1/.test(buildLogPlanReconcileBuild?.closeoutKey || ''),
    'Hard-checkpoint Tier 0 cards are promoted into backlog and plan truth',
    foundationPlanReconcile
      ? `${foundationPlanReconcile.lane} / missing=${hardCheckpointTier0Cards.filter(card => !card).length}`
      : 'missing FOUNDATION-PLAN-RECONCILE-001',
  )
  ensure(
    checks,
    buildLogPlanReconcileBuild?.operatorCloseout === true &&
      buildLogPlanReconcileBuild.relatedBacklog?.some(item =>
        item.id === 'FOUNDATION-PLAN-RECONCILE-001' &&
          (['scoped', 'done'].includes(item.lane) || (foundationPlanReconcileInControlPlaneSprint && item.lane === 'executing'))
      ) &&
      hardCheckpointTier0Ids.every(id =>
        buildLogPlanReconcileBuild.relatedBacklog?.some(item =>
          item.id === id &&
            (['scoped', 'done'].includes(item.lane) ||
              (id === 'FOUNDATION-PLAN-RECONCILE-001' && foundationPlanReconcileInControlPlaneSprint && item.lane === 'executing'))
        )
      ) &&
      /foundation-plan-reconcile-backlog-depth-v1/.test(buildLogPlanReconcileBuild?.closeoutKey || ''),
    'Recent Work carries hard-checkpoint backlog reconcile closeout',
    buildLogPlanReconcileBuild
      ? `${buildLogPlanReconcileBuild.shortSha} / ${buildLogPlanReconcileBuild.closeoutKey}`
      : 'missing FOUNDATION-PLAN-RECONCILE-001 closeout',
  )
  const phase1Cards = [approvalFileIntegrity, buildLogBacklogIdFix, closeoutBackfill, preCommitHookInstall]
  const phase1CloseoutTargets = [
    'MEMORY-001',
    'SCHEMA-001',
    'DECISION-001',
    'DECISION-002',
    'DECISION-003',
    'DATA-018',
    'DATA-019',
    'DATA-020',
    'GOVERNANCE-IMPORTRANGE-001',
    'UX-003',
    'SYSTEM-009',
    'SOURCE-004',
    'SOURCE-005',
  ]
  const phase1CloseoutTargetCards = phase1CloseoutTargets.map(id =>
    (foundationHub.backlogItems || []).find(item => item.id === id) || null
  )
  const phase1BuildLogExact = buildLogPhase1EnforcementBuild?.backlogIds?.length === 4 &&
    PHASE_1_ENFORCEMENT_CARD_IDS.every(id => buildLogPhase1EnforcementBuild.backlogIds.includes(id)) &&
    !(buildLogPhase1EnforcementBuild.backlogIds || []).includes('FOUNDATION-PLAN-RECONCILE-001') &&
    !(buildLogPhase1EnforcementBuild.backlogIds || []).includes('GATE-PERFORMANCE-001')
  ensure(
    checks,
    phase1Cards.every(card => card?.lane === 'done') &&
      phase1Cards.every(card => /phase-1-enforcement-v1/.test(card?.statusNote || '')) &&
      phase1ApprovalValidations.every(validation => validation.ok && validation.mode === 'v2') &&
      phase1ApprovalValidations.every(validation => validation.approval?.approvedPlanRef === PHASE_1_ENFORCEMENT_PLAN_REF) &&
      phase1ApprovalValidations.every(validation => validation.approval?.approvedPlanSha256 === PHASE_1_ENFORCEMENT_PLAN_SHA256) &&
      approvalIntegritySynthetic.ok &&
      includesAll(approvalIntegritySource, [
        'approvalSchemaVersion',
        'approvedPlanSha256',
        'approvalDigest',
        'bootstrapFromLegacy',
      ]) &&
      approvalLegacyLedger.legacyApprovals?.length >= 30 &&
      approvalIntegrityDoc.includes('Legacy approvals') &&
      phase1ApprovedPlan.includes('Protected Foundation Paths'),
    'APPROVAL-FILE-INTEGRITY-001 makes 9.8 approvals tamper-evident',
    `phase1=${phase1ApprovalValidations.filter(validation => validation.ok).length}/${phase1ApprovalValidations.length} synthetic=${approvalIntegritySynthetic.ok}`,
  )
  ensure(
    checks,
    buildLogBacklogIdFix?.lane === 'done' &&
      buildLogOwnershipProof.ok &&
      includesAll(foundationBuildLogSource, [
        'mentionedBacklogIds',
        'buildSyntheticBuildLogOwnershipProof',
        'relatedBacklog: normalizeList(build.backlogIds).map(mapBacklogId)',
      ]) &&
      buildLogPhase1EnforcementBuild?.operatorCloseout === true &&
      phase1BuildLogExact &&
      Array.isArray(buildLogPhase1EnforcementBuild.mentionedBacklog) &&
      buildLogPhase1EnforcementBuild.mentionedBacklog?.some(item => item.id === 'FOUNDATION-PLAN-RECONCILE-001') &&
      Object.values(multiCloseoutCommitGroups).some(count => count >= 3),
    'BUILD-LOG-BACKLOG-ID-FIX-001 keeps closeout ownership exact in Recent Work',
    buildLogPhase1EnforcementBuild
      ? `${buildLogPhase1EnforcementBuild.shortSha} / owners=${buildLogPhase1EnforcementBuild.backlogIds.join(',')}`
      : 'missing phase-1 enforcement closeout',
  )
  ensure(
    checks,
    closeoutBackfill?.lane === 'done' &&
      phase1CloseoutTargets.every(id => closeoutBackfillDoc.includes(id)) &&
      phase1CloseoutTargetCards.every(card => card?.lane === 'done' && /Closeout backfilled on 2026-04-29/.test(card.statusNote || '')) &&
      !backlogHygieneApi.findings?.some(finding =>
        finding.type === 'done_without_closeout_proof' && phase1CloseoutTargets.includes(finding.cardId)
      ),
    'CLOSEOUT-BACKFILL-001 snapshots and resolves the 13 done-without-proof targets',
    `targets=${phase1CloseoutTargetCards.filter(Boolean).length}/${phase1CloseoutTargets.length}`,
  )
  ensure(
    checks,
    preCommitHookInstall?.lane === 'done' &&
      gitHookInstallStatus.ok &&
      gitHookScopeProof.ok &&
      PROTECTED_FOUNDATION_PATH_PATTERNS.length >= 17 &&
      includesAll(processGitHooksSource, [
        'runPreCommitHook',
        'runPrePushHook',
        'FOUNDATION_HOOK_BYPASS_REASON',
        'FOUNDATION_HOOK_BYPASS_CARD',
        'recordFoundationShipProof',
      ]) &&
      gitHooksDoc.includes('pre-commit') &&
      gitHooksDoc.includes('pre-push') &&
      gitHooksDoc.includes('foundation:verify does not run on every tiny commit') &&
      gitHooksDoc.includes('git config core.hooksPath .githooks'),
    'PRE-COMMIT-HOOK-INSTALL-001 installs repo-managed Foundation Git hooks',
    `core.hooksPath=${gitHookInstallStatus.hooksPath || 'unset'} protected=${PROTECTED_FOUNDATION_PATH_PATTERNS.length}`,
  )
  const foundationControlCards = [
    gateReliability,
    personalWorkspaceBoundary,
    doctrinePropagationV3,
    decisionAutoEmitV2,
    ceoDashboardPattern,
  ]
  const gateReliabilityProof = await buildSyntheticGateReliabilityProof({
    transientAfterCleanup: {
      probe: async () => {
        await getFoundationDbConstraintAudit({ limit: 1 })
        await getActionRouterSnapshot({ limit: 1 })
      },
      cleanup: async () => {},
    },
  })
  const personalWorkspaceBoundaryStatus = await buildPersonalWorkspaceBoundaryStatus({ repoRoot, includeSynthetic: true })
  const decisionAutoEmitSafetyProof = await buildDecisionAutoEmitSafetyProof({ cwd: repoRoot })
  const ceoDashboardPatternStatus = await buildCeoDashboardPatternStatus({ repoRoot })
  const foundationControlBuildLogExact = buildLogFoundationControlBuild?.backlogIds?.length === 5 &&
    Object.keys(foundationControlApprovalRefs).every(id => buildLogFoundationControlBuild.backlogIds.includes(id)) &&
    !(buildLogFoundationControlBuild.backlogIds || []).includes('FOUNDATION-PLAN-RECONCILE-001') &&
    !(buildLogFoundationControlBuild.backlogIds || []).includes('GATE-PERFORMANCE-001')
  ensure(
    checks,
    foundationControlCards.every(card => card?.lane === 'done') &&
      foundationControlCards.every(card => /foundation-control-layer-v1/.test(card?.statusNote || '')) &&
      foundationControlApprovalValidations.every(validation => validation.ok && validation.mode === 'v2') &&
      foundationControlApprovalValidations.every(validation => validation.approval?.approvedPlanRef === 'docs/process/approved-plans/foundation-control-layer-v1.md') &&
      foundationControlApprovedPlan.includes('metadata-only for real private files') &&
      foundationControlApprovedPlan.includes('deterministic injected/fixture errors') &&
      foundationControlApprovedPlan.includes('proposed decision records only') &&
      buildLogFoundationControlBuild?.operatorCloseout === true &&
      foundationControlBuildLogExact &&
      currentPlan.includes('Foundation control layer') &&
      currentPlan.includes('foundation-control-layer-v1') &&
      currentState.includes('Foundation control layer is done for v1') &&
      currentState.includes('review-queue cleanup or Phase G operator UI') &&
      currentState.includes('docs/process/ceo-dashboard-pattern.md'),
    'Foundation control-layer cards have approved 9.8 plan evidence and exact closeout ownership',
    `cards=${foundationControlCards.filter(card => card?.lane === 'done').length}/5 approvals=${foundationControlApprovalValidations.filter(validation => validation.ok).length}/5 closeout=${buildLogFoundationControlBuild?.closeoutKey || 'missing'}`,
  )
  ensure(
    checks,
    gateReliability?.lane === 'done' &&
      gateReliabilityProof.ok &&
      gateReliabilityProof.transientAfterCleanup?.passedAfterCleanup === true &&
      gateReliabilityProof.transientAfterCleanup?.cleanupCalls === 1 &&
      foundationHub.gateReliability?.ok === true &&
      foundationHub.gateReliability?.realDeadlockInduced === false &&
      includesAll(packageSource, ['"process:gate-reliability-check"', 'scripts/process-gate-reliability-check.mjs']) &&
      includesAll(gateReliabilitySource, [
        'runWithFoundationGateRetry',
        'deadlock detected',
        'deterministic-injected-fixture',
        'schema verifier failed',
        'synthetic transient after DB cleanup',
      ]) &&
      includesAll(gateReliabilityScriptSource, [
        'Real DB deadlock induced',
        'Transient retry passed',
        'Transient after DB cleanup retry passed',
        'Permanent failure failed closed',
      ]) &&
      includesAll(foundationVerifySource, [
        'runWithFoundationGateRetry',
        'formatFoundationGateRetryMessage',
      ]),
    'GATE-RELIABILITY-001 proves deterministic transient retry, DB-cleanup retry, and permanent fail-closed behavior',
    `transientAttempts=${gateReliabilityProof.transient.attempts} cleanupAttempts=${gateReliabilityProof.transientAfterCleanup.attempts} permanentAttempts=${gateReliabilityProof.permanent.attempts}`,
  )
  const gateReliabilityRecurringBuildLogExact = buildLogGateReliabilityRecurringBuild?.backlogIds?.length === 1 &&
    buildLogGateReliabilityRecurringBuild.backlogIds.includes('GATE-RELIABILITY-002') &&
    ![
      'GATE-RELIABILITY-001',
      'PLAIN-ENGLISH-SWEEP-001',
      'UI-MENU-LAYOUT-POLISH-001',
      'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    ].some(id => buildLogGateReliabilityRecurringBuild.backlogIds.includes(id))
  ensure(
    checks,
    gateReliabilityRecurring?.lane === 'done' &&
      /gate-reliability-recurring-transient-v1/.test(gateReliabilityRecurring?.statusNote || '') &&
      gateReliabilityRecurringApprovalValidation.ok &&
      gateReliabilityRecurringApprovalValidation.mode === 'v2' &&
      gateReliabilityRecurringApprovalValidation.approval?.approvedPlanRef === 'docs/process/approved-plans/gate-reliability-recurring-transient-v1.md' &&
      gateReliabilityRecurringApprovedPlan.includes('Inspect the latest verifier retry output/log path') &&
      gateReliabilityRecurringApprovedPlan.includes('No UI-MENU-LAYOUT-POLISH-001') &&
      includesAll(foundationVerifySource, GATE_RELIABILITY_RECURRING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      gateReliabilityProof.recurringDeadlockDiagnostic?.ok === true &&
      gateReliabilityProof.recurringDeadlockDiagnostic?.transientClass === 'postgres-deadlock' &&
      gateReliabilityProof.recurringDeadlockDiagnostic?.subsystem === 'postgres' &&
      /class=postgres-deadlock; subsystem=postgres/.test(gateReliabilityProof.recurringDeadlockDiagnostic?.formattedMessage || '') &&
      foundationHub.gateReliability?.recurringDeadlockDiagnostic?.transientClass === 'postgres-deadlock' &&
      includesAll(gateReliabilitySource, [
        'classifyFoundationGateError',
        'formatFoundationGateRetryMessage',
        'postgres-deadlock',
        'foundation-db-pool-closed',
        'deterministic-recurring-deadlock-diagnostic-fixture',
      ]) &&
      includesAll(gateReliabilityScriptSource, [
        'Recurring deadlock diagnostic',
        'GATE_RELIABILITY_SUMMARY',
      ]) &&
      includesAll(processFoundationShipSource, [
        'classifyFoundationGateError',
        'formatFoundationGateRetryMessage',
        'diagnostic',
        'parallelFanout',
        'runSequentialSteps',
      ]) &&
      includesAll(processFoundationShipDoc, [
        'Fanout runs sequentially by default',
        '--parallelFanout=true',
      ]) &&
      buildLogGateReliabilityRecurringBuild?.operatorCloseout === true &&
      gateReliabilityRecurringBuildLogExact &&
      currentPlan.includes('GATE-RELIABILITY-002') &&
      currentPlan.includes('gate-reliability-recurring-transient-v1') &&
      currentState.includes('GATE-RELIABILITY-002') &&
      currentState.includes('classifies retryable gate failures'),
    'GATE-RELIABILITY-002 diagnoses recurring transient retries without opening Phase G UI work',
    `class=${gateReliabilityProof.recurringDeadlockDiagnostic?.transientClass || 'missing'} subsystem=${gateReliabilityProof.recurringDeadlockDiagnostic?.subsystem || 'missing'} closeout=${buildLogGateReliabilityRecurringBuild?.closeoutKey || 'missing'}`,
  )
  const gateReliabilityDirectVerifierBuildLogExact = buildLogGateReliabilityDirectVerifierBuild?.backlogIds?.length === 1 &&
    buildLogGateReliabilityDirectVerifierBuild.backlogIds.includes('GATE-RELIABILITY-003') &&
    ![
      'GATE-RELIABILITY-001',
      'GATE-RELIABILITY-002',
      'UI-MENU-LAYOUT-POLISH-001',
      'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    ].some(id => buildLogGateReliabilityDirectVerifierBuild.backlogIds.includes(id))
  ensure(
    checks,
    gateReliabilityDirectVerifier?.lane === 'done' &&
      /gate-reliability-direct-verifier-deadlock-v1/.test(gateReliabilityDirectVerifier?.statusNote || '') &&
      gateReliabilityDirectVerifierApprovalValidation.ok &&
      gateReliabilityDirectVerifierApprovalValidation.mode === 'v2' &&
      gateReliabilityDirectVerifierApprovalValidation.approval?.approvedPlanRef === 'docs/process/approved-plans/gate-reliability-direct-verifier-deadlock-v1.md' &&
      gateReliabilityDirectVerifierApprovedPlan.includes('Safe diagnostics only') &&
      gateReliabilityDirectVerifierApprovedPlan.includes('No row data, source content, or private content') &&
      includesAll(foundationVerifySource, GATE_RELIABILITY_DIRECT_VERIFIER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(foundationVerifySource, [
        'assertFoundationDbReadyForReadOnlyGate',
        'foundation:verify',
      ]) &&
      !foundationVerifySource.includes('\n  initFoundationDb,') &&
      includesAll(processShipCheckSource, ['assertFoundationDbReadyForReadOnlyGate', 'Process ship check']) &&
      includesAll(processFanoutCheckSource, ['assertFoundationDbReadyForReadOnlyGate', 'Process fanout check']) &&
      includesAll(postShipFanoutScriptSource, ['assertFoundationDbReadyForReadOnlyGate', 'Post-ship fanout check']) &&
      includesAll(backlogHygieneScriptSource, ['assertFoundationDbReadyForReadOnlyGate', 'Backlog hygiene']) &&
      gateReliabilityProof.directVerifierDeadlockDiagnostic?.ok === true &&
      gateReliabilityProof.directVerifierDeadlockDiagnostic?.transientClass === 'postgres-deadlock' &&
      gateReliabilityProof.directVerifierDeadlockDiagnostic?.subsystem === 'postgres' &&
      gateReliabilityProof.directVerifierDeadlockDiagnostic?.postgresCode === '40P01' &&
      (gateReliabilityProof.directVerifierDeadlockDiagnostic?.relationOids || []).includes('16402') &&
      (gateReliabilityProof.directVerifierDeadlockDiagnostic?.relationOids || []).includes('16389') &&
      foundationHub.gateReliability?.directVerifierDeadlockDiagnostic?.transientClass === 'postgres-deadlock' &&
      includesAll(gateReliabilitySource, [
        'extractPostgresGateErrorMetadata',
        'deterministic-direct-verifier-postgres-deadlock-fixture',
        'relationOids',
        'processIds',
      ]) &&
      includesAll(gateReliabilityScriptSource, [
        'Direct verifier deadlock diagnostic',
        'GATE_RELIABILITY_SUMMARY',
      ]) &&
      buildLogGateReliabilityDirectVerifierBuild?.operatorCloseout === true &&
      gateReliabilityDirectVerifierBuildLogExact &&
      currentPlan.includes('GATE-RELIABILITY-003') &&
      currentPlan.includes('gate-reliability-direct-verifier-deadlock-v1') &&
      currentState.includes('GATE-RELIABILITY-003') &&
      currentState.includes('read-only gate checks'),
    'GATE-RELIABILITY-003 removes write-heavy DB initialization from direct verifier gates',
    `class=${gateReliabilityProof.directVerifierDeadlockDiagnostic?.transientClass || 'missing'} pgCode=${gateReliabilityProof.directVerifierDeadlockDiagnostic?.postgresCode || 'missing'} closeout=${buildLogGateReliabilityDirectVerifierBuild?.closeoutKey || 'missing'}`,
  )
  ensure(
    checks,
    personalWorkspaceBoundary?.lane === 'done' &&
      personalWorkspaceBoundaryStatus.status === 'healthy' &&
      personalWorkspaceBoundaryStatus.realPrivateProofMode === 'metadata-only' &&
      personalWorkspaceBoundaryStatus.realPrivateFilesRead === false &&
      personalWorkspaceBoundaryStatus.realPrivateContentCopied === false &&
      personalWorkspaceBoundaryStatus.syntheticProof?.ok === true &&
      personalWorkspaceBoundaryStatus.syntheticProof?.sentinelValuesReturned === false &&
      foundationHub.personalWorkspaceBoundary?.realPrivateFilesRead === false &&
      foundationHub.personalWorkspaceBoundary?.realPrivateContentCopied === false &&
      includesAll(personalWorkspaceBoundarySource, [
        'metadata-only',
        'buildSyntheticPrivacyLeakProof',
        'sentinelValuesReturned: false',
        'contentRead: false',
        'contentCopied: false',
      ]) &&
      includesAll(personalWorkspaceBoundaryScriptSource, [
        'Real private files read',
        'Real private content copied',
        'Synthetic sentinel leak proof',
      ]) &&
      includesAll(personalWorkspaceBoundaryDoc, [
        'metadata-only proof sources',
        'synthetic sentinel fixtures',
        'must never be copied',
        'must never be copied, quoted, summarized, tokenized, or logged',
      ]),
    'PERSONAL-WORKSPACE-BOUNDARY-001 keeps real private proof metadata-only and leak tests synthetic',
    `privatePaths=${personalWorkspaceBoundaryStatus.summary.privatePathCount} existing=${personalWorkspaceBoundaryStatus.summary.existingPrivatePathCount}`,
  )
  ensure(
    checks,
    doctrinePropagationV3?.lane === 'done' &&
      doctrinePropagationV2Status.summary?.criticalFindings === 0 &&
      DOCTRINE_PROPAGATION_SOURCES.length >= 15 &&
      includesAll(doctrinePropagationSource, [
        'nothing-manual',
        'memory-is-not-backlog',
        'ship-gate-required',
        'private-workspace-metadata-only',
        'decision-auto-emit-proposed-only',
        'ceo-dashboard-pattern',
      ]) &&
      includesAll(doctrinePropagationDoc, [
        'nothing manual stays trusted',
        'memory is not backlog',
        'pre-commit and ship gates are required',
        'real private files are metadata-only proof',
      ]) &&
      foundationHub.doctrinePropagation?.summary?.doctrineCount >= DOCTRINE_PROPAGATION_SOURCES.length,
    'DOCTRINE-PROPAGATION-003 closes remaining generated doctrine gaps',
    `doctrines=${DOCTRINE_PROPAGATION_SOURCES.length} status=${foundationHub.doctrinePropagation?.status || 'missing'}`,
  )
  ensure(
    checks,
    decisionAutoEmitV2?.lane === 'done' &&
      decisionAutoEmitSafetyProof.ok &&
      includesAll(decisionAutoEmitSource, [
        'override',
        'sequence_change',
        'DECISION_AUTO_EMIT_APPROVED_SOURCE_SURFACES',
        'refuses private workspace text files',
        'Decision auto-emit expected proposed-only write mode',
      ]) &&
      includesAll(decisionAutoEmitScriptSource, [
        'foundationSources',
      ]) &&
      includesAll(decisionAutoEmitDoc, [
        'V2 also recognizes explicit Override and sequence-change language',
        'Refuses private workspace text files before reading them',
        'Apply mode writes proposed decision records only',
      ]) &&
      foundationHub.decisionAutoEmit?.summary?.candidateCount >= 5,
    'DECISION-AUTO-EMIT-002 keeps detected decisions explicit-source and proposed-only',
    `synthetic=${decisionAutoEmitSafetyProof.syntheticCandidateCount} privateBlocked=${decisionAutoEmitSafetyProof.privateSourceBlocked}`,
  )
  ensure(
    checks,
    ceoDashboardPattern?.lane === 'done' &&
      ceoDashboardPatternStatus.status === 'healthy' &&
      ceoDashboardPatternStatus.uiImplementationIncluded === false &&
      foundationHub.ceoDashboardPattern?.status === 'healthy' &&
      includesAll(ceoDashboardPatternSource, [
        'CEO_DASHBOARD_REQUIRED_FIELDS',
        'uiImplementationIncluded: false',
        'not a Phase G UI polish implementation',
      ]) &&
      includesAll(ceoDashboardPatternDoc, [
        'what changed',
        'where it lives',
        'what to review',
        'what is blocked',
        'what is next',
        'proof supports confidence',
        'not a UI polish pass',
      ]),
    'CEO-DASHBOARD-PATTERN-001 defines the operator surface pattern without Phase G UI work',
    `fields=${ceoDashboardPatternStatus.requiredFields.length} ui=${ceoDashboardPatternStatus.uiImplementationIncluded ? 'yes' : 'no'}`,
  )

  const verifierCleanupControlAssuranceSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CARD_ID) || null
  const verifierCleanupControlAssuranceSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CLOSEOUT_KEY) || null
  const verifierCleanupControlAssuranceDogfood = buildFoundationVerifierCleanupControlAssuranceDogfoodProof()
  const foundationVerifyLineCountAfterCleanupControlAssuranceSplit = String(foundationVerifySource || '').split('\n').length
  const cleanupControlDelegationSource = [foundationVerifySource, foundationVerifierCleanupControlAssuranceSource].filter(Boolean).join('\n')
  const oldInlineMessages = [
    'Phase D Cards 13+14 preserve old evidence and research cards without deleting or auto-closing',
    'FULL-SYSTEM-RE-AUDIT-001 closes Phase E with no blockers',
    'Wave Cleanup A backlog cards have approved 9.8 plans and done state',
    'Hard-checkpoint Tier 0 cards are promoted into backlog and plan truth',
    'GATE-RELIABILITY-001 proves deterministic transient retry, DB-cleanup retry, and permanent fail-closed behavior',
    'CEO-DASHBOARD-PATTERN-001 defines the operator surface pattern without Phase G UI work',
  ]
  ensure(
    checks,
    verifierCleanupControlAssuranceSplitCard &&
      ['executing', 'done'].includes(verifierCleanupControlAssuranceSplitCard.lane) &&
      String(verifierCleanupControlAssuranceSplitCard.statusNote || '').includes(VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CLOSEOUT_KEY) &&
      verifierCleanupControlAssuranceSplitCloseout?.operatorCloseout === true &&
      (verifierCleanupControlAssuranceSplitCloseout.backlogIds || []).includes(VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CARD_ID) &&
      verifierCleanupControlAssuranceDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-cleanup-control-assurance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_HANDOFF_PATH) &&
      cleanupControlDelegationSource.includes('evaluateFoundationVerifierCleanupControlAssurance({') &&
      cleanupControlDelegationSource.includes('cleanupControlAssuranceVerifier.checks') &&
      oldInlineMessages.every(message => !String(foundationVerifySource || '').includes(message)) &&
      foundationVerifyLineCountAfterCleanupControlAssuranceSplit < VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_BEFORE_LINES &&
      foundationVerifierCleanupControlAssuranceSource.includes('DOC-ARCHIVE-AUTO-001') &&
      foundationVerifierCleanupControlAssuranceSource.includes('FULL-SYSTEM-RE-AUDIT-001') &&
      foundationVerifierCleanupControlAssuranceSource.includes('GATE-RELIABILITY-001') &&
      foundationVerifierCleanupControlAssuranceSource.includes('CEO-DASHBOARD-PATTERN-001'),
    'VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 extracts cleanup/control assurance checks into a focused module',
    verifierCleanupControlAssuranceSplitCard
      ? `lane=${verifierCleanupControlAssuranceSplitCard.lane} dogfood=${verifierCleanupControlAssuranceDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterCleanupControlAssuranceSplit}`
      : `missing ${VERIFIER_CLEANUP_CONTROL_ASSURANCE_SPLIT_CARD_ID}`,
  )

  return { checks }
}
