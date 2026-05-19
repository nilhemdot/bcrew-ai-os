import {
  POST_SHIP_FANOUT_RULES,
  evaluatePostShipFanout,
} from './post-ship-fanout.js'

export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID = 'VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-process-trust-split-module-v1'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-process-trust-split-module-001-plan.md'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001.json'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-process-trust-split-module-check.mjs'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SPRINT_ID = 'verifier-process-trust-split-module-2026-05-16'
export const VERIFIER_PROCESS_TRUST_SPLIT_MODULE_BEFORE_LINES = 12918
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-process-trust-orchestration-split-v1'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-process-trust-orchestration-split-001-plan.md'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-process-trust-orchestration-split-check.mjs'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-process-trust-orchestration-split-closeout.md'
export const VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES = 6776

export const PROCESS_TRUST_BACKLOG_HYGIENE_CHECK = 'Backlog hygiene and process-gate cards are captured'
export const PROCESS_TRUST_POST_SHIP_FANOUT_CHECK = 'POST-SHIP-FAN-OUT-001 closes post-ship fanout gate with proof'

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function backlogItemText(item = null) {
  return [
    item?.summary,
    item?.whyItMatters,
    item?.nextAction,
    item?.statusNote,
  ].filter(Boolean).join('\n')
}

function evaluateProcessTrustFixture(fixture = {}) {
  const findings = []
  if (fixture.shipCheckEvidence !== true) findings.push('process_ship_check_evidence_missing')
  if (fixture.fanoutEvidence !== true) findings.push('process_fanout_evidence_missing')
  if (fixture.workerServedCodeTrusted !== true) findings.push('worker_served_code_trust_missing')
  if (fixture.doneCoverageEnforced !== true) findings.push('done_card_coverage_gate_missing')
  if (fixture.artifactClaimsVerified !== true) findings.push('claimed_artifact_gate_missing')
  if (fixture.postShipFanoutDetector !== true) findings.push('post_ship_fanout_detector_missing')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationProcessTrustVerifierDogfoodProof() {
  const healthy = evaluateProcessTrustFixture({
    shipCheckEvidence: true,
    fanoutEvidence: true,
    workerServedCodeTrusted: true,
    doneCoverageEnforced: true,
    artifactClaimsVerified: true,
    postShipFanoutDetector: true,
  })
  const rejected = {
    missingShipCheck: evaluateProcessTrustFixture({
      shipCheckEvidence: false,
      fanoutEvidence: true,
      workerServedCodeTrusted: true,
      doneCoverageEnforced: true,
      artifactClaimsVerified: true,
      postShipFanoutDetector: true,
    }),
    missingFanout: evaluateProcessTrustFixture({
      shipCheckEvidence: true,
      fanoutEvidence: false,
      workerServedCodeTrusted: true,
      doneCoverageEnforced: true,
      artifactClaimsVerified: true,
      postShipFanoutDetector: true,
    }),
    staleWorkerCode: evaluateProcessTrustFixture({
      shipCheckEvidence: true,
      fanoutEvidence: true,
      workerServedCodeTrusted: false,
      doneCoverageEnforced: true,
      artifactClaimsVerified: true,
      postShipFanoutDetector: true,
    }),
    missingDoneCoverage: evaluateProcessTrustFixture({
      shipCheckEvidence: true,
      fanoutEvidence: true,
      workerServedCodeTrusted: true,
      doneCoverageEnforced: false,
      artifactClaimsVerified: true,
      postShipFanoutDetector: true,
    }),
    missingArtifactGate: evaluateProcessTrustFixture({
      shipCheckEvidence: true,
      fanoutEvidence: true,
      workerServedCodeTrusted: true,
      doneCoverageEnforced: true,
      artifactClaimsVerified: false,
      postShipFanoutDetector: true,
    }),
    missingPostShipFanout: evaluateProcessTrustFixture({
      shipCheckEvidence: true,
      fanoutEvidence: true,
      workerServedCodeTrusted: true,
      doneCoverageEnforced: true,
      artifactClaimsVerified: true,
      postShipFanoutDetector: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy fixture passes; missing ship-check, fanout, worker-code, done-coverage, artifact-gate, and post-ship-fanout fixtures fail closed'
      : 'Process trust verifier dogfood did not reject every known process-proof failure fixture',
  }
}

export function evaluateFoundationProcessTrustVerifier(input = {}) {
  const checks = []
  const {
    backlogHygiene,
    backlogHygienePass,
    backlogHygieneText,
    currentPlan = '',
    currentState = '',
    devProcessAudit,
    devProcessAuditSource = '',
    foundationFrontendSource = '',
    foundationHub = {},
    foundationVerifySource = '',
    foundationWorkerSource = '',
    missingArtifactClaims = [],
    packageSource = '',
    postShipFanout,
    postShipFanoutApproval = {},
    postShipFanoutDoc = '',
    postShipFanoutScriptSource = '',
    postShipFanoutSource = '',
    postShipFanoutText = '',
    processFanout,
    processFanoutApproval = {},
    processFanoutCheckDoc = '',
    processFanoutCheckSource = '',
    processFanoutText = '',
    processHooks,
    processHooksApproval = {},
    processHooksText = '',
    processShipCheckDoc = '',
    processShipCheckSource = '',
    serverRouteSource = '',
    serverSource = '',
    verifierArtifactExists,
    verifierArtifactExistsApproval = {},
    verifierArtifactExistsText = '',
    verifierDoneCoverage,
    verifierDoneCoverageApproval = {},
    verifierDoneCoverageText = '',
    verifierExceptionValidation = {},
    workerCodeTrust,
    workerCodeTrustApproval = {},
    workerCodeTrustText = '',
    workerRunningShortCommit = 'missing',
  } = input

  ensure(
    checks,
    backlogHygienePass?.lane === 'done' &&
      backlogHygienePass?.priority === 'P0' &&
      String(backlogHygienePass.statusNote || '').includes('DOC-AUTHORITY-001') &&
      String(backlogHygienePass.statusNote || '').includes('SOURCE-021-PROOF-001') &&
      String(backlogHygienePass.statusNote || '').includes('SECURITY-001') &&
      backlogHygiene?.lane === 'done' &&
      backlogHygiene?.priority === 'P0' &&
      devProcessAudit?.lane === 'done' &&
      processHooks?.lane === 'done' &&
      backlogHygieneText.includes('autonomous backlog hygiene probe') &&
      backlogHygieneText.includes('npm run backlog:hygiene') &&
      backlogHygieneText.includes('synthetic stale-card proof') &&
      backlogHygieneText.includes('Default stale executing threshold is 3 days') &&
      backlogHygieneText.includes('Runtime Health') &&
      backlogHygieneText.includes('PROCESS-HOOKS-001') &&
      currentPlan.includes('BACKLOG-HYGIENE-PASS-001') &&
      currentPlan.includes('BACKLOG-HYGIENE-001` is done for v1') &&
      currentPlan.includes('Before code, each slice needs a card ID') &&
      currentState.includes('BACKLOG-HYGIENE-PASS-001` is done for v1') &&
      currentState.includes('3-day stale executing threshold'),
    PROCESS_TRUST_BACKLOG_HYGIENE_CHECK,
    `pass=${backlogHygienePass?.lane || 'missing'} / probe=${backlogHygiene?.lane || 'missing'} / hooks=${processHooks?.lane || 'missing'}`,
  )
  ensure(
    checks,
    devProcessAudit?.lane === 'done' &&
      devProcessAudit?.priority === 'P0' &&
      includesAll(devProcessAuditSource, [
        'Stale backlog lane state',
        'Work shipped before plan score',
        'Backlog updates stayed manual',
        'Dashboard served old code',
        'Recent Builds did not always say where work lives',
        'Verifier claims depended on manual restart timing',
        'Plan, backlog, and phase labels disagreed',
        'Transient source quota made the verifier non-reproducible',
        'Each failure has one owner',
        'Do not create more process cards',
        'ACTION-REVIEW-APPLY-001` stays next after process hooks',
      ]) &&
      includesAll(processHooksText, [
        'external 9.8+ plan',
        'seven-field closeout draft',
        'served dashboard commit equals repo HEAD',
        'where-it-lives metadata',
        'stop-on-red-verifier',
      ]) &&
      currentPlan.includes('DEV-PROCESS-AUDIT-001` is done for v1') &&
      currentPlan.includes('PROCESS-HOOKS-001` is done for v1') &&
      currentState.includes('DEV-PROCESS-AUDIT-001` is done for v1') &&
      currentState.includes('transient verifier failures'),
    'DEV-PROCESS-AUDIT-001 maps failures to hook requirements',
    devProcessAudit
      ? `${devProcessAudit.lane} / ${processHooks?.lane || 'missing'} / audit requirements captured`
      : 'missing DEV-PROCESS-AUDIT-001',
  )
  ensure(
    checks,
    processHooks?.lane === 'done' &&
      processHooks?.priority === 'P0' &&
      includesAll(packageSource, ['"process:ship-check"', 'scripts/process-ship-check.mjs']) &&
      includesAll(processShipCheckSource, [
        'planApprovalRef',
        'validatePlanApprovalFile',
        'approvalValidation?.ok',
        'plan approval integrity passes',
        'requiredCloseoutFields',
        'whereItLives',
        'skipLiveVerifyReason',
        'emergencyBypassReason',
        'getFoundationBuildCloseouts',
        'runtimeSupervisor?.servedCode?.runningCommit',
        'foundation:verify',
      ]) &&
      includesAll(processShipCheckDoc, [
        'approval score is at least 9.8',
        'dashboard is serving the same commit as repo `HEAD`',
        '--skipLiveVerifyReason',
        '--emergencyBypassReason',
      ]) &&
      processHooksApproval.cardId === 'PROCESS-HOOKS-001' &&
      Number(processHooksApproval.score) >= 9.8 &&
      processHooksApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(processHooksApproval.approvedAt).getTime()) &&
      processHooksText.includes('npm run process:ship-check') &&
      processHooksText.includes('V1 is manual/scripted') &&
      currentPlan.includes('`ACTION-REVIEW-APPLY-001` is done for v1') &&
      currentState.includes('`ACTION-REVIEW-APPLY-001` is done for v1'),
    'PROCESS-HOOKS-001 ships evidence-based process ship check before action-loop work',
    processHooks
      ? `${processHooks.lane} / approval=${processHooksApproval.score} / script=process:ship-check`
      : 'missing PROCESS-HOOKS-001',
  )
  ensure(
    checks,
    processFanout?.lane === 'done' &&
      processFanout?.priority === 'P0' &&
      includesAll(packageSource, ['"process:fanout-check"', 'scripts/process-fanout-check.mjs']) &&
      includesAll(processFanoutCheckSource, [
        'claimed files and docs exist',
        'claimed npm scripts exist',
        'Recent Builds exposes this closeout',
        'dashboard served commit matches repo HEAD',
        'process:fanout-check',
        'process:ship-check',
        'foundation:verify',
      ]) &&
      includesAll(processFanoutCheckDoc, [
        'Did the ship update every place it claimed to update?',
        'scripts/process-fanout-check.mjs',
        'docs/process/ship-fanout.md',
        'npm run process:fanout-check',
        'false-done card',
      ]) &&
      processFanoutApproval.cardId === 'PROCESS-FANOUT-001' &&
      Number(processFanoutApproval.score) >= 9.8 &&
      processFanoutApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(processFanoutApproval.approvedAt).getTime()) &&
      processFanoutText.includes('process-fanout-v1-repair') &&
      processFanoutText.includes('scripts/process-fanout-check.mjs') &&
      processFanoutText.includes('docs/process/ship-fanout.md') &&
      processFanoutText.includes('npm run process:fanout-check') &&
      processFanoutText.includes('files, docs, npm scripts') &&
      processFanoutText.includes('Wave 2 next'),
    'PROCESS-FANOUT-001 repair makes the false-done card true',
    processFanout
      ? `${processFanout.lane} / approval=${processFanoutApproval.score} / script=process:fanout-check`
      : 'missing PROCESS-FANOUT-001',
  )
  const processFanoutClaimedArtifacts = [
    { label: 'scripts/process-fanout-check.mjs', ok: processFanoutCheckSource.includes('Process fanout check') },
    { label: 'docs/process/ship-fanout.md', ok: processFanoutCheckDoc.includes('Process Fanout Check') },
    { label: 'package.json script process:fanout-check', ok: packageSource.includes('"process:fanout-check"') },
    { label: 'docs/process/approvals/PROCESS-FANOUT-001.json', ok: processFanoutApproval.cardId === 'PROCESS-FANOUT-001' },
  ]
  ensure(
    checks,
    processFanoutClaimedArtifacts.every(item => item.ok),
    'PROCESS-FANOUT-001 claimed artifacts are concrete and verifier-visible',
    processFanoutClaimedArtifacts.map(item => item.label).join(', '),
  )
  ensure(
    checks,
    workerCodeTrust?.lane === 'done' &&
      workerCodeTrust?.priority === 'P0' &&
      workerCodeTrustApproval.cardId === 'WORKER-CODE-TRUST-001' &&
      Number(workerCodeTrustApproval.score) >= 9.8 &&
      workerCodeTrustApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(workerCodeTrustApproval.approvedAt).getTime()) &&
      includesAll(workerCodeTrustText, [
        'foundation_runtime_status',
        'runtimeSupervisor.workerCode',
        'Worker Code Trust',
        'LaunchAgent pid',
        'worker-code-trust-v1',
      ]) &&
      includesAll(foundationWorkerSource, [
        'captureWorkerRuntimeMetadata',
        'recordFoundationRuntimeStatus',
        'worker-startup-code-equals-HEAD',
        'ai.bcrew.foundation-worker',
      ]) &&
      includesAll(serverSource, [
        'getFoundationRuntimeStatus',
        'getMissingWorkerRuntimeMetadata',
        'workerCode',
      ]) &&
      foundationFrontendSource.includes('renderWorkerCodeTrustPanel') &&
      currentPlan.includes('WORKER-CODE-TRUST-001') &&
      currentState.includes('WORKER-CODE-TRUST-001'),
    'WORKER-CODE-TRUST-001 closes worker served-code trust with proof',
    workerCodeTrust
      ? `${workerCodeTrust.lane} / approval=${workerCodeTrustApproval.score} / worker=${workerRunningShortCommit}`
      : 'missing WORKER-CODE-TRUST-001',
  )
  ensure(
    checks,
    verifierDoneCoverage?.lane === 'done' &&
      verifierDoneCoverage?.priority === 'P0' &&
      verifierDoneCoverageApproval.cardId === 'VERIFIER-DONE-COVERAGE-001' &&
      Number(verifierDoneCoverageApproval.score) >= 9.8 &&
      verifierDoneCoverageApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(verifierDoneCoverageApproval.approvedAt).getTime()) &&
      includesAll(verifierDoneCoverageText, [
        'docs/process/verifier-exceptions.json',
        'synthetic done-card-without-proof',
        '90 days',
        'verifier-done-artifact-gates',
      ]) &&
      includesAll(foundationVerifySource, [
        'validateVerifierExceptionLedger',
        'findDoneCardsWithoutVerifierCoverage',
        'SYNTHETIC-DONE-NO-PROOF-999',
      ]),
    'VERIFIER-DONE-COVERAGE-001 closes done-card proof enforcement',
    verifierDoneCoverage
      ? `${verifierDoneCoverage.lane} / approval=${verifierDoneCoverageApproval.score} / exceptions=${verifierExceptionValidation.total}`
      : 'missing VERIFIER-DONE-COVERAGE-001',
  )
  ensure(
    checks,
    verifierArtifactExists?.lane === 'done' &&
      verifierArtifactExists?.priority === 'P0' &&
      verifierArtifactExistsApproval.cardId === 'VERIFIER-ARTIFACT-EXISTS-001' &&
      Number(verifierArtifactExistsApproval.score) >= 9.8 &&
      verifierArtifactExistsApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(verifierArtifactExistsApproval.approvedAt).getTime()) &&
      includesAll(verifierArtifactExistsText, [
        'files/docs',
        'npm run',
        'API routes',
        'synthetic missing-artifact',
        'verifier-done-artifact-gates',
      ]) &&
      includesAll(foundationVerifySource, [
        'findMissingArtifactClaims',
        'extractClaimedFilesFromText',
        'extractClaimedNpmScriptsFromText',
        'extractClaimedApiRoutesFromText',
        'synthetic-missing-artifact',
      ]),
    'VERIFIER-ARTIFACT-EXISTS-001 closes claimed-artifact enforcement',
    verifierArtifactExists
      ? `${verifierArtifactExists.lane} / approval=${verifierArtifactExistsApproval.score} / artifact findings=${missingArtifactClaims.length}`
      : 'missing VERIFIER-ARTIFACT-EXISTS-001',
  )
  const syntheticPostShipFanoutFindings = evaluatePostShipFanout({
    cardId: 'SYNTHETIC-FANOUT-001',
    closeout: {
      key: 'synthetic-missing-fanout',
      backlogIds: ['SYNTHETIC-FANOUT-001'],
      whatChanged: 'Changed verifier code.',
      whatItDoes: 'Proves the detector.',
      whyItMatters: 'Synthetic proof.',
      whereItLives: ['Foundation'],
      proofCommands: [],
      knownLimits: ['Synthetic only.'],
      reviewNext: 'None.',
    },
    changedFiles: ['scripts/foundation-verify.mjs'],
    backlogItems: [{ id: 'SYNTHETIC-FANOUT-001' }],
    includeSynthetic: false,
  })
  ensure(
    checks,
    postShipFanout?.lane === 'done' &&
      postShipFanout?.priority === 'P0' &&
      postShipFanoutApproval.cardId === 'POST-SHIP-FAN-OUT-001' &&
      Number(postShipFanoutApproval.score) >= 9.8 &&
      postShipFanoutApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(postShipFanoutApproval.approvedAt).getTime()) &&
      includesAll(packageSource, ['"process:post-ship-fanout"', 'scripts/process-post-ship-fanout.mjs']) &&
      includesAll(postShipFanoutSource, [
        'POST_SHIP_FANOUT_RULES',
        'evaluatePostShipFanout',
        'buildPostShipFanoutStatus',
        'synthetic_detector_failed',
      ]) &&
      includesAll(postShipFanoutScriptSource, [
        'process-post-ship-fanout',
        'fanout findings are clean',
        'commit changed files are visible',
      ]) &&
      includesAll(postShipFanoutDoc, [
        'Commit touches `lib/foundation-db.js`',
        'Commit touches `scripts/foundation-verify.mjs`',
        'Commit touches `public/foundation.js`',
        'Commit touches `docs/rebuild/*`',
        'V1 checks and reports',
      ]) &&
      includesAll(serverRouteSource, ['buildPostShipFanoutStatus', 'postShipFanout']) &&
      includesAll(foundationFrontendSource, ['renderPostShipFanoutPanel', 'Post-Ship Fanout']) &&
      foundationHub.postShipFanout?.summary?.ruleCount >= POST_SHIP_FANOUT_RULES.length &&
      syntheticPostShipFanoutFindings.some(finding => finding.type === 'missing_fanout_proof') &&
      includesAll(postShipFanoutText, [
        'process:post-ship-fanout',
        'Runtime Health > Post-Ship Fanout',
        'post-ship-fanout-v1',
      ]),
    PROCESS_TRUST_POST_SHIP_FANOUT_CHECK,
    postShipFanout
      ? `${postShipFanout.lane} / approval=${postShipFanoutApproval.score} / runtime=${foundationHub.postShipFanout?.status || 'missing'}`
      : 'missing POST-SHIP-FAN-OUT-001',
  )

  return { checks, dogfood: buildFoundationProcessTrustVerifierDogfoodProof() }
}

export async function evaluateFoundationProcessTrustVerifierOrchestration(input = {}) {
  const {
    activeFoundationSprint = { sprint: null, items: [] },
    currentPlan = '',
    currentState = '',
    devProcessAuditSource = '',
    foundationBuildCloseouts = [],
    foundationFrontendSource = '',
    foundationHub = {},
    foundationProcessTrustVerifierSource = '',
    foundationVerifySource = '',
    foundationWorkerSource = '',
    missingArtifactClaims = [],
    packageJson = {},
    packageSource = '',
    postShipFanoutApproval = {},
    postShipFanoutDoc = '',
    postShipFanoutScriptSource = '',
    postShipFanoutSource = '',
    processFanoutApproval = {},
    processFanoutCheckDoc = '',
    processFanoutCheckSource = '',
    processHooksApproval = {},
    processShipCheckDoc = '',
    processShipCheckSource = '',
    repoFileExists = async () => false,
    serverRouteSource = '',
    serverSource = '',
    verifierArtifactExistsApproval = {},
    verifierDoneCoverageApproval = {},
    verifierExceptionValidation = {},
    workerCodeTrustApproval = {},
    workerRunningShortCommit = 'missing',
  } = input
  const checks = []
  const backlogItems = foundationHub.backlogItems || []
  const item = id => backlogItems.find(backlogItem => backlogItem.id === id) || null
  const activeSprintItem = id =>
    (activeFoundationSprint.items || [])
      .map(sprintItem => sprintItem.backlog)
      .find(backlogItem => backlogItem?.id === id) || null

  const backlogHygienePass = item('BACKLOG-HYGIENE-PASS-001')
  const backlogHygiene = item('BACKLOG-HYGIENE-001')
  const devProcessAudit = item('DEV-PROCESS-AUDIT-001')
  const processHooks = item('PROCESS-HOOKS-001')
  const processFanout = item('PROCESS-FANOUT-001')
  const workerCodeTrust = item('WORKER-CODE-TRUST-001')
  const verifierDoneCoverage = item('VERIFIER-DONE-COVERAGE-001')
  const verifierArtifactExists = item('VERIFIER-ARTIFACT-EXISTS-001')
  const postShipFanout = item('POST-SHIP-FAN-OUT-001')

  const devProcessAuditText = backlogItemText(devProcessAudit)
  const processHooksText = backlogItemText(processHooks)
  const processFanoutText = backlogItemText(processFanout)
  const workerCodeTrustText = backlogItemText(workerCodeTrust)
  const verifierDoneCoverageText = backlogItemText(verifierDoneCoverage)
  const verifierArtifactExistsText = backlogItemText(verifierArtifactExists)
  const postShipFanoutText = backlogItemText(postShipFanout)
  const backlogHygieneText = [
    backlogHygiene?.summary,
    backlogHygiene?.whyItMatters,
    backlogHygiene?.nextAction,
    backlogHygiene?.statusNote,
    devProcessAuditText,
    processHooksText,
    processFanoutText,
  ].filter(Boolean).join('\n')
  const foundationVerifyRootSource = String(foundationVerifySource || '')
  const processTrustVerifier = evaluateFoundationProcessTrustVerifier({
    backlogHygiene,
    backlogHygienePass,
    backlogHygieneText,
    currentPlan,
    currentState,
    devProcessAudit,
    devProcessAuditSource,
    foundationFrontendSource,
    foundationHub,
    foundationVerifySource: `${foundationVerifyRootSource}\n${foundationProcessTrustVerifierSource}`,
    foundationWorkerSource,
    missingArtifactClaims,
    packageSource,
    postShipFanout,
    postShipFanoutApproval,
    postShipFanoutDoc,
    postShipFanoutScriptSource,
    postShipFanoutSource,
    postShipFanoutText,
    processFanout,
    processFanoutApproval,
    processFanoutCheckDoc,
    processFanoutCheckSource,
    processFanoutText,
    processHooks,
    processHooksApproval,
    processHooksText,
    processShipCheckDoc,
    processShipCheckSource,
    serverRouteSource,
    serverSource,
    verifierArtifactExists,
    verifierArtifactExistsApproval,
    verifierArtifactExistsText,
    verifierDoneCoverage,
    verifierDoneCoverageApproval,
    verifierDoneCoverageText,
    verifierExceptionValidation,
    workerCodeTrust,
    workerCodeTrustApproval,
    workerCodeTrustText,
    workerRunningShortCommit,
  })
  checks.push(...processTrustVerifier.checks)
  const processTrustDogfood = processTrustVerifier.dogfood || buildFoundationProcessTrustVerifierDogfoodProof()
  const foundationVerifyLineCount = foundationVerifyRootSource.split('\n').length
  const processTrustOldInlinePatterns = [
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1400}'Backlog hygiene and process-gate cards are captured'"),
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1600}'POST-SHIP-FAN-OUT-001 closes post-ship fanout gate with proof'"),
  ]
  const verifierProcessTrustSplitModuleCard =
    item(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID) ||
    activeSprintItem(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID)
  const verifierProcessTrustSplitModuleCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierProcessTrustSplitModuleClosed = verifierProcessTrustSplitModuleCard?.lane === 'done'

  ensure(
    checks,
    verifierProcessTrustSplitModuleCard &&
      ['executing', 'done'].includes(verifierProcessTrustSplitModuleCard.lane) &&
      (!verifierProcessTrustSplitModuleClosed || (
        String(verifierProcessTrustSplitModuleCard.statusNote || '').includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierProcessTrustSplitModuleCloseout?.operatorCloseout === true &&
        (verifierProcessTrustSplitModuleCloseout.backlogIds || []).includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-process-trust-split-module-closeout.md')
      )) &&
      processTrustDogfood.ok === true &&
      processTrustVerifier.checks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-process-trust-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationProcessTrustVerifierSource.includes('evaluateFoundationProcessTrustVerifier') &&
      foundationProcessTrustVerifierSource.includes('buildFoundationProcessTrustVerifierDogfoodProof') &&
      foundationVerifyRootSource.includes('evaluateFoundationProcessTrustVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('processTrustOrchestrationVerifier.checks') &&
      processTrustOldInlinePatterns.every(pattern => !pattern.test(foundationVerifyRootSource)) &&
      currentPlan.includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SPRINT_ID || verifierProcessTrustSplitModuleClosed) &&
      foundationProcessTrustVerifierSource.includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID),
    'VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001 extracts process trust verifier checks into a focused module',
    verifierProcessTrustSplitModuleCard
      ? `lane=${verifierProcessTrustSplitModuleCard.lane} dogfood=${processTrustDogfood.ok ? 'pass' : 'blocked'} processChecks=${processTrustVerifier.checks.filter(check => check.ok).length}/${processTrustVerifier.checks.length} lines=${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID}`,
  )

  const verifierProcessTrustOrchestrationCard =
    item(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CARD_ID) ||
    activeSprintItem(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierProcessTrustOrchestrationCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const processTrustOrchestrationOldRootPatterns = [
    'const devProcessAuditText = [',
    'const processHooksText = [',
    'const processTrustVerifier = evaluateFoundationProcessTrustVerifier({',
    'const processTrustDogfood = buildFoundationProcessTrustVerifierDogfoodProof()',
  ]
  ensure(
    checks,
    verifierProcessTrustOrchestrationCard &&
      ['executing', 'done'].includes(verifierProcessTrustOrchestrationCard.lane) &&
      String(verifierProcessTrustOrchestrationCard.statusNote || '').includes(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierProcessTrustOrchestrationCloseout?.operatorCloseout === true &&
      (verifierProcessTrustOrchestrationCloseout.backlogIds || []).includes(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CARD_ID) &&
      processTrustDogfood.ok === true &&
      processTrustVerifier.checks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-process-trust-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationProcessTrustVerifierSource.includes('evaluateFoundationProcessTrustVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationProcessTrustVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('processTrustOrchestrationVerifier.checks') &&
      processTrustOrchestrationOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-PROCESS-TRUST-ORCHESTRATION-SPLIT-001 moves process-trust orchestration into the focused module',
    verifierProcessTrustOrchestrationCard
      ? `lane=${verifierProcessTrustOrchestrationCard.lane} dogfood=${processTrustDogfood.ok ? 'pass' : 'blocked'} processChecks=${processTrustVerifier.checks.filter(check => check.ok).length}/${processTrustVerifier.checks.length} lines=${VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_PROCESS_TRUST_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    processTrustVerifier,
    dogfood: processTrustDogfood,
  }
}
