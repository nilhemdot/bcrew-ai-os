import {
  buildCodeQualityNightlyAudit,
  buildSyntheticCodeQualityNightlyAuditProof,
  detectMutationPatternsInText,
} from './code-quality-nightly-audit.js'
import { classifyProcessCheckSource } from './process-check-readonly-mode.js'

export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID = 'CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY = 'code-quality-audit-guarded-mutator-classifier-v1'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH = 'docs/process/code-quality-audit-guarded-mutator-classifier-001-plan.md'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH = 'docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH = 'scripts/process-code-quality-audit-guarded-mutator-classifier-check.mjs'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-code-quality-audit-guarded-mutator-classifier-closeout.md'
export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SPRINT_ID = 'code-quality-audit-guarded-mutator-classifier-2026-05-18'

export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CHANGED_FILES = [
  'lib/code-quality-nightly-audit.js',
  'lib/code-quality-audit-guarded-mutator-classifier.js',
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH,
  'lib/foundation-build-closeout-control-plane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH,
]

export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_NOT_NEXT = [
  'Do not auto-fix remaining audit findings in this card.',
  'Do not demote real unguarded mutators.',
  'Do not weaken process-check readonly mode.',
  'Do not run live extraction.',
  'Do not run auth-required or paid jobs.',
  'Do not run provider/model probes.',
  'Do not mutate Google Drive permissions.',
  'Do not send Gmail, ClickUp, or Agent Feedback messages.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not build Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not spawn hidden subagents.',
]

export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PROOF_COMMANDS = [
  'node --check lib/code-quality-nightly-audit.js lib/code-quality-audit-guarded-mutator-classifier.js scripts/process-code-quality-audit-guarded-mutator-classifier-check.mjs',
  'npm run process:code-quality-audit-guarded-mutator-classifier-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --planApprovalRef=docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1',
  'npm run process:foundation-ship -- --card=CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001 --planApprovalRef=docs/process/approvals/CODE-QUALITY-AUDIT-GUARDED-MUTATOR-CLASSIFIER-001.json --closeoutKey=code-quality-audit-guarded-mutator-classifier-v1 --commitRef=HEAD',
]

export const CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_EXIT_CRITERIA = [
  'Guarded process-check mutator fixture produces zero audit findings.',
  'Unguarded process-check and non-process mutator fixtures remain red.',
  'No-write code-quality audit has zero protected process-check false positives.',
  'Full foundation:verify and process:foundation-ship pass before push.',
]

export function buildCodeQualityAuditGuardedMutatorExistingWorkCheck() {
  return {
    existingCode: 'Reuse lib/code-quality-nightly-audit.js detector paths and lib/process-check-readonly-mode.js classifier instead of adding a second mutation policy.',
    existingDocs: 'Reuse the May 13 Code Quality Nightly Audit closeout and the May 15 process-check readonly/historical-mode cards.',
    existingScripts: 'Reuse process:code-quality-nightly-audit-check, process:process-check-readonly-mode-check, backlog hygiene, foundation:verify, and process:foundation-ship.',
    existingPolicy: 'Process checks are read-only by default; guarded write posture is explicit; audits are report-only and may propose cards without mutating backlog truth.',
    reused: 'The existing process-check classifier decides guarded/report-only/read-only/historical posture; the nightly audit consumes that classification.',
    notRebuilt: 'No second scanner, no new scheduler, no new audit taxonomy, no live extraction, and no external side effects.',
    exactGap: 'The audit mutator detector still counted protected process-check scripts as P0 state-mutation findings, creating 99 false-positive P0 rows.',
    overBroadRisk: 'The repair could accidentally suppress real non-process mutators or unguarded process checks; dogfood must prove both remain red.',
    readyBy: 'Steve prioritized remaining P0 audit/process failures after BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 shipped green.',
    readyAt: '2026-05-18T12:05:00-04:00',
  }
}

export function buildGuardedProcessCheckMutatorFixture() {
  return `
    import { PROCESS_CHECK_WRITE_FLAGS, assertProcessCheckWriteAllowed, isProcessCheckWriteRequested } from '../lib/process-write-guard.js'
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: 'scripts/process-safe-check.mjs',
      operation: 'synthetic backlog update',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    if (isProcessCheckWriteRequested({ argv: process.argv.slice(2), allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })) {
      await updateBacklogItem('CARD-001', { lane: 'done' })
    }
  `
}

export function buildUnguardedProcessCheckMutatorFixture() {
  return `
    await pool.query('UPDATE foundation_sprints SET updated_at = NOW()')
  `
}

export function buildNonProcessMutatorFixture() {
  return `
    await applyApprovedActionRoute({ routeId: 'route-1', approvedBy: 'synthetic' })
  `
}

function countByProposedCard(findings = []) {
  return findings.reduce((counts, finding) => {
    const key = finding.proposedCard || 'missing'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

export async function buildCodeQualityAuditGuardedMutatorClassifierProof({
  repoRoot = process.cwd(),
} = {}) {
  const guardedSource = buildGuardedProcessCheckMutatorFixture()
  const unguardedProcessCheckFindings = detectMutationPatternsInText({
    relativePath: 'scripts/process-danger-check.mjs',
    text: buildUnguardedProcessCheckMutatorFixture(),
  })
  const guardedProcessCheckFindings = detectMutationPatternsInText({
    relativePath: 'scripts/process-safe-check.mjs',
    text: guardedSource,
  })
  const guardedClassification = classifyProcessCheckSource({
    relativePath: 'scripts/process-safe-check.mjs',
    source: guardedSource,
    backlogWriteBoundaryGuarded: true,
  })
  const nonProcessFindings = detectMutationPatternsInText({
    relativePath: 'scripts/intelligence-action-router-apply.mjs',
    text: buildNonProcessMutatorFixture(),
  })
  const syntheticProof = buildSyntheticCodeQualityNightlyAuditProof()
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const processCheckReadonlyFindings = (audit.findings || []).filter(finding =>
    finding.proposedCard === 'PROCESS-CHECK-READONLY-MODE-001'
  )
  const protectedProcessCheckFalsePositives = processCheckReadonlyFindings.filter(finding =>
    (finding.refs || []).some(ref => /^scripts\/process-.*\.mjs$/.test(ref.path || ''))
  )
  const p0Findings = (audit.findings || []).filter(finding => finding.severity === 'P0')
  const proposedCardCounts = countByProposedCard(audit.findings || [])

  const ok = unguardedProcessCheckFindings.length === 1 &&
    guardedProcessCheckFindings.length === 0 &&
    guardedClassification.protected === true &&
    guardedClassification.classification === 'guarded_live_mutation' &&
    nonProcessFindings.length === 1 &&
    syntheticProof.ok === true &&
    syntheticProof.guardedMutatorCount === 0 &&
    audit.reportOnly === true &&
    audit.writesBacklog === false &&
    audit.autoFixes === false &&
    protectedProcessCheckFalsePositives.length === 0 &&
    processCheckReadonlyFindings.length === 0 &&
    p0Findings.length === 0 &&
    Number(audit.summary?.findingCount || 0) <= 20

  return {
    ok,
    mode: 'code-quality-audit-guarded-mutator-classifier-proof',
    unguardedProcessCheckCount: unguardedProcessCheckFindings.length,
    guardedProcessCheckCount: guardedProcessCheckFindings.length,
    guardedClassification,
    nonProcessMutatorCount: nonProcessFindings.length,
    syntheticProof,
    auditSummary: audit.summary,
    proposedCardCounts,
    processCheckReadonlyFindingCount: processCheckReadonlyFindings.length,
    protectedProcessCheckFalsePositiveCount: protectedProcessCheckFalsePositives.length,
    p0Findings: p0Findings.map(finding => ({
      id: finding.id,
      proposedCard: finding.proposedCard,
      refs: finding.refs,
    })),
  }
}
