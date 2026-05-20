export const BUILD_INTEL_SNAPSHOT_BASELINE_CARD_ID = 'BUILD-INTEL-SNAPSHOT-BASELINE-001'
export const BUILD_INTEL_SNAPSHOT_BASELINE_CLOSEOUT_KEY = 'build-intel-snapshot-baseline-v1'
export const BUILD_INTEL_SNAPSHOT_BASELINE_PLAN_PATH = 'docs/process/build-intel-snapshot-baseline-001-plan.md'
export const BUILD_INTEL_SNAPSHOT_BASELINE_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-SNAPSHOT-BASELINE-001.json'
export const BUILD_INTEL_SNAPSHOT_BASELINE_SCRIPT_PATH = 'scripts/process-build-intel-snapshot-baseline-check.mjs'
export const BUILD_INTEL_SNAPSHOT_BASELINE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-build-intel-snapshot-baseline-closeout.md'
export const BUILD_INTEL_SNAPSHOT_BASELINE_NEXT_CARD_ID = 'BUILD-CLOSEOUT-DATA-SOURCE-001'

export const BUILD_INTEL_SNAPSHOT_BASELINE_PROOF_COMMANDS = [
  'node --check lib/build-intel-snapshot-baseline.js scripts/process-build-intel-snapshot-baseline-check.mjs',
  'npm run process:build-intel-snapshot-baseline-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-INTEL-SNAPSHOT-BASELINE-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-SNAPSHOT-BASELINE-001.json --closeoutKey=build-intel-snapshot-baseline-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-INTEL-SNAPSHOT-BASELINE-001 --closeoutKey=build-intel-snapshot-baseline-v1',
  'npm run process:foundation-ship -- --card=BUILD-INTEL-SNAPSHOT-BASELINE-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-SNAPSHOT-BASELINE-001.json --closeoutKey=build-intel-snapshot-baseline-v1 --commitRef=HEAD',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function lineNumberForIndex(text = '', index = 0) {
  return String(text || '').slice(0, Math.max(0, index)).split(/\r?\n/).length
}

function refForPattern(path, source, pattern, detail) {
  const text = String(source || '')
  const match = text.match(pattern)
  if (!match || match.index === undefined) return null
  return {
    path,
    line: lineNumberForIndex(text, match.index),
    detail: detail || match[0].slice(0, 120).replace(/\s+/g, ' '),
  }
}

function checkSource(checks, ok, check, detail = '', refs = []) {
  checks.push({
    ok: Boolean(ok),
    check,
    detail,
    refs: refs.filter(Boolean),
  })
}

export function buildBuildIntelSnapshotBaseline({
  sourceId,
  inspectedCommit,
  expectedSnapshotCommit,
  inspectedAt = '2026-05-13',
  evidencePath,
  monitoringBoundary = 'manual_public_github_build_intel_review',
  monitoringCardId = 'BUILD-INTEL-GITHUB-MONITOR-001',
} = {}) {
  const normalizedCommit = normalizeText(inspectedCommit || expectedSnapshotCommit)
  return {
    posture: 'inspected_snapshot',
    sourceId: normalizeText(sourceId),
    inspectedCommit: normalizedCommit,
    expectedSnapshotCommit: normalizeText(expectedSnapshotCommit || normalizedCommit),
    inspectedAt,
    evidencePath: normalizeText(evidencePath),
    latestTruth: false,
    latestMonitoringBoundary: monitoringBoundary,
    latestMonitoringCardId: monitoringCardId,
    freshnessRule: 'This commit is an inspected evidence snapshot. It must not be used as latest upstream monitoring truth.',
  }
}

export function isBuildIntelSnapshotBaselineEvidence(baseline = {}) {
  return baseline &&
    baseline.posture === 'inspected_snapshot' &&
    normalizeText(baseline.inspectedCommit).length >= 7 &&
    baseline.latestTruth === false &&
    normalizeText(baseline.latestMonitoringBoundary).length > 0 &&
    normalizeText(baseline.latestMonitoringCardId).length > 0 &&
    /snapshot evidence|inspected evidence snapshot/i.test(normalizeText(baseline.freshnessRule))
}

export function evaluateBuildIntelSnapshotBaselineUsage({
  baselineSource = '',
  gstackSource = '',
  gstackProcessSource = '',
  codeQualityAuditSource = '',
  intelligenceVerifierSource = '',
  sourceNoteSource = '',
} = {}) {
  const baseline = String(baselineSource || '')
  const gstack = String(gstackSource || '')
  const gstackProcess = String(gstackProcessSource || '')
  const codeQualityAudit = String(codeQualityAuditSource || '')
  const intelligenceVerifier = String(intelligenceVerifierSource || '')
  const sourceNote = String(sourceNoteSource || '')
  const checks = []

  checkSource(
    checks,
    baseline.includes('buildBuildIntelSnapshotBaseline') &&
      baseline.includes('latestTruth: false') &&
      baseline.includes('isBuildIntelSnapshotBaselineEvidence') &&
      baseline.includes('evaluateBuildIntelSnapshotBaselineUsage'),
    'baseline module owns snapshot posture and evaluator',
    'lib/build-intel-snapshot-baseline.js',
    [refForPattern('lib/build-intel-snapshot-baseline.js', baseline, /latestTruth:\s*false/, 'snapshot is not latest truth')],
  )
  checkSource(
    checks,
    gstack.includes('buildBuildIntelSnapshotBaseline') &&
      gstack.includes('snapshotBaseline') &&
      gstack.includes("sourcePosture: 'inspected_snapshot'") &&
      gstack.includes('latestMonitoringBoundary') &&
      !/latestTruth:\s*true/.test(gstack),
    'GStack Build Intel labels pinned commits as inspected snapshots with separate monitoring posture',
    'lib/gstack-build-intel.js',
    [refForPattern('lib/gstack-build-intel.js', gstack, /sourceCommit\s*:\s*commit\s*\|\|\s*GSTACK_BUILD_INTEL_EXPECTED_COMMIT/, 'old sourceCommit fallback without posture')],
  )
  checkSource(
    checks,
    gstackProcess.includes('isBuildIntelSnapshotBaselineEvidence') &&
      gstackProcess.includes('snapshotBaseline') &&
      !/snapshot\.sourceCommit\s*===\s*GSTACK_BUILD_INTEL_EXPECTED_COMMIT/.test(gstackProcess),
    'GStack focused proof checks snapshot semantics instead of asserting fixed commit as latest truth',
    'scripts/process-gstack-build-intel-check.mjs',
    [refForPattern('scripts/process-gstack-build-intel-check.mjs', gstackProcess, /snapshot\.sourceCommit\s*===\s*GSTACK_BUILD_INTEL_EXPECTED_COMMIT/, 'direct fixed-commit assertion')],
  )
  checkSource(
    checks,
    codeQualityAudit.includes('evaluateBuildIntelSnapshotBaselineUsage') &&
      codeQualityAudit.includes('buildIntelBaselineUsage') &&
      !/const\s+gstackRefs\s*=\s*collectPatternRefs[\s\S]{0,500}if\s*\(\s*gstackRefs\.length\s*\)/.test(codeQualityAudit),
    'code-quality audit uses baseline evaluator instead of raw fixed-commit references',
    'lib/code-quality-nightly-audit.js',
    [refForPattern('lib/code-quality-nightly-audit.js', codeQualityAudit, /const\s+gstackRefs\s*=\s*collectPatternRefs/, 'raw expected-commit scan')],
  )
  checkSource(
    checks,
    intelligenceVerifier.includes('isBuildIntelSnapshotBaselineEvidence') &&
      intelligenceVerifier.includes('snapshotBaseline') &&
      !/gstackBuildIntel\.sourceCommit\s*===\s*GSTACK_BUILD_INTEL_EXPECTED_COMMIT/.test(intelligenceVerifier),
    'intelligence verifier validates snapshot posture instead of direct fixed-commit latest truth',
    'lib/foundation-intelligence-audit-verifier.js',
    [refForPattern('lib/foundation-intelligence-audit-verifier.js', intelligenceVerifier, /gstackBuildIntel\.sourceCommit\s*===\s*GSTACK_BUILD_INTEL_EXPECTED_COMMIT/, 'direct fixed-commit assertion')],
  )
  checkSource(
    checks,
    sourceNote.includes('inspected snapshot') &&
      sourceNote.includes('not latest upstream monitoring truth') &&
      sourceNote.includes('BUILD-INTEL-SNAPSHOT-BASELINE-001'),
    'source note documents snapshot/freshness boundary',
    'docs/source-notes/github-build-intel.md',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    refs: failed.flatMap(check => check.refs || []),
  }
}

export function buildBuildIntelSnapshotBaselineDogfoodProof() {
  const healthy = evaluateBuildIntelSnapshotBaselineUsage({
    baselineSource: `
      export function buildBuildIntelSnapshotBaseline() { return { latestTruth: false } }
      export function isBuildIntelSnapshotBaselineEvidence() {}
      export function evaluateBuildIntelSnapshotBaselineUsage() {}
    `,
    gstackSource: `
      import { buildBuildIntelSnapshotBaseline } from './build-intel-snapshot-baseline.js'
      const snapshotBaseline = buildBuildIntelSnapshotBaseline({})
      const snapshot = { snapshotBaseline, sourcePosture: 'inspected_snapshot', latestMonitoringBoundary: snapshotBaseline.latestMonitoringBoundary }
    `,
    gstackProcessSource: `
      import { isBuildIntelSnapshotBaselineEvidence } from '../lib/build-intel-snapshot-baseline.js'
      addFinding(findings, isBuildIntelSnapshotBaselineEvidence(snapshot.snapshotBaseline), 'snapshotBaseline is evidence')
    `,
    codeQualityAuditSource: `
      import { evaluateBuildIntelSnapshotBaselineUsage } from './build-intel-snapshot-baseline.js'
      const buildIntelBaselineUsage = evaluateBuildIntelSnapshotBaselineUsage({})
    `,
    intelligenceVerifierSource: `
      import { isBuildIntelSnapshotBaselineEvidence } from './build-intel-snapshot-baseline.js'
      isBuildIntelSnapshotBaselineEvidence(gstackBuildIntel.snapshotBaseline)
    `,
    sourceNoteSource: `
      BUILD-INTEL-SNAPSHOT-BASELINE-001 says the GStack commit is inspected snapshot evidence, not latest upstream monitoring truth.
    `,
  })
  const stale = evaluateBuildIntelSnapshotBaselineUsage({
    baselineSource: 'export const baseline = true',
    gstackSource: 'const sourceMap = { sourceCommit: commit || GSTACK_BUILD_INTEL_EXPECTED_COMMIT }',
    gstackProcessSource: 'addFinding(findings, snapshot.sourceCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT, "commit matches")',
    codeQualityAuditSource: 'const gstackRefs = collectPatternRefs(fileTexts, /GSTACK_BUILD_INTEL_EXPECTED_COMMIT|sourceCommit\\s*===/i); if (gstackRefs.length) findings.push({})',
    intelligenceVerifierSource: 'gstackBuildIntel.sourceCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT',
    sourceNoteSource: 'Commit inspected: dc6252d1df7f1f650ea6e9b2bba7d08fab5de902',
  })
  return {
    ok: healthy.ok && !stale.ok,
    healthy,
    stale,
  }
}
