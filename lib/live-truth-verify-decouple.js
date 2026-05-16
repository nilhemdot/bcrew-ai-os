import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildCodeQualityNightlyAudit,
  classifyCurrentSprintTruthContext,
  detectHardcodedLiveTruthInText,
} from './code-quality-nightly-audit.js'

export const LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID = 'LIVE-TRUTH-VERIFY-DECOUPLE-001'
export const LIVE_TRUTH_VERIFY_DECOUPLE_SPRINT_ID = 'live-truth-verify-decouple-2026-05-15'
export const LIVE_TRUTH_VERIFY_DECOUPLE_CLOSEOUT_KEY = 'live-truth-verify-decouple-v1'
export const LIVE_TRUTH_VERIFY_DECOUPLE_PLAN_PATH = 'docs/process/live-truth-verify-decouple-001-plan.md'
export const LIVE_TRUTH_VERIFY_DECOUPLE_APPROVAL_PATH = 'docs/process/approvals/LIVE-TRUTH-VERIFY-DECOUPLE-001.json'
export const LIVE_TRUTH_VERIFY_DECOUPLE_SCRIPT_PATH = 'scripts/process-live-truth-verify-decouple-check.mjs'

export const LIVE_TRUTH_VERIFY_DECOUPLE_BASELINE_REFS = [
  { path: 'lib/foundation-current-sprint.js', expectedPosture: 'bootstrap_default_only' },
  { path: 'scripts/foundation-verify.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-connector-credential-check.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-current-sprint-dynamic-truth-check.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-foundation-plan-reconcile-check.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-llm-auth-audit-check.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-source-extraction-gap-followup-check.mjs', expectedPosture: 'historical_closeout_only' },
  { path: 'scripts/process-sprint-stage-gate-check.mjs', expectedPosture: 'historical_closeout_only' },
]

const currentSprintLiteralPattern = /Current Sprint:|control-plane-connector-readiness-2026-05-12|foundation-current-2026-05-12/i

function lineNumberForIndex(text, index) {
  if (!text || index < 0) return 1
  return text.slice(0, index).split(/\r?\n/).length
}

function firstCurrentSprintLiteralLine(text = '') {
  const match = String(text || '').match(currentSprintLiteralPattern)
  if (!match || match.index == null) return null
  return lineNumberForIndex(text, match.index)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export async function readLiveTruthVerifyDecoupleFiles({ repoRoot = process.cwd() } = {}) {
  const entries = await Promise.all(LIVE_TRUTH_VERIFY_DECOUPLE_BASELINE_REFS.map(async ref => {
    const text = await fs.readFile(path.join(repoRoot, ref.path), 'utf8')
    return [ref.path, text]
  }))
  return Object.fromEntries(entries)
}

export function classifyLiveTruthBaselineRefs(fileTexts = {}) {
  return LIVE_TRUTH_VERIFY_DECOUPLE_BASELINE_REFS.map(ref => {
    const text = fileTexts[ref.path] || ''
    const line = firstCurrentSprintLiteralLine(text)
    const classification = classifyCurrentSprintTruthContext({
      relativePath: ref.path,
      text,
      line,
    })
    const findings = detectHardcodedLiveTruthInText({
      relativePath: ref.path,
      text,
    }).filter(finding => finding.id === 'hardcoded-current-sprint-truth')
    return {
      ...ref,
      line,
      posture: classification.posture,
      activeLiveTruth: classification.activeLiveTruth,
      reason: classification.reason,
      hardcodedCurrentSprintFindings: findings.length,
      ok: Boolean(line) &&
        classification.posture === ref.expectedPosture &&
        classification.activeLiveTruth === false &&
        findings.length === 0,
    }
  })
}

export function filterHardcodedCurrentSprintFindings(findings = []) {
  return (Array.isArray(findings) ? findings : []).filter(finding =>
    finding.id === 'hardcoded-current-sprint-truth' &&
    finding.severity === 'P0'
  )
}

export function buildSyntheticLiveTruthVerifyDecoupleProof() {
  const active = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/active-live-current-sprint.js',
    text: "const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'",
  }).filter(finding => finding.id === 'hardcoded-current-sprint-truth')
  const historical = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/historical-current-sprint.js',
    text: `
      // liveTruthPosture: historical_closeout_only - synthetic closed sprint proof.
      const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
    `,
  }).filter(finding => finding.id === 'hardcoded-current-sprint-truth')
  const bootstrap = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/bootstrap-current-sprint.js',
    text: `
      // liveTruthPosture: bootstrap_default_only - synthetic fallback default.
      const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12'
    `,
  }).filter(finding => finding.id === 'hardcoded-current-sprint-truth')

  return {
    ok: active.length === 1 && historical.length === 0 && bootstrap.length === 0,
    activeCount: active.length,
    historicalCount: historical.length,
    bootstrapCount: bootstrap.length,
  }
}

export function evaluateLiveTruthVerifyDecouple({
  fileTexts = {},
  auditFindings = [],
  packageJson = {},
  planText = '',
  verifierSource = '',
} = {}) {
  const checks = []
  const baseline = classifyLiveTruthBaselineRefs(fileTexts)
  const synthetic = buildSyntheticLiveTruthVerifyDecoupleProof()
  const currentSprintFindings = filterHardcodedCurrentSprintFindings(auditFindings)

  addCheck(
    checks,
    baseline.every(ref => ref.ok),
    'baseline audit refs are explicitly historical or bootstrap',
    baseline.map(ref => `${ref.path}:${ref.posture}:${ref.hardcodedCurrentSprintFindings}`).join(', '),
  )
  addCheck(
    checks,
    currentSprintFindings.length === 0,
    'current audit has no P0 hardcoded current-sprint truth findings',
    currentSprintFindings.map(finding => `${finding.refs?.[0]?.path}:${finding.refs?.[0]?.line}`).join(', ') || 'none',
  )
  addCheck(
    checks,
    synthetic.ok,
    'synthetic dogfood keeps active literals failing and labeled history/bootstrap passing',
    `active=${synthetic.activeCount} historical=${synthetic.historicalCount} bootstrap=${synthetic.bootstrapCount}`,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:live-truth-verify-decouple-check'] === `node --env-file-if-exists=.env ${LIVE_TRUTH_VERIFY_DECOUPLE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:live-truth-verify-decouple-check'] || 'missing',
  )
  addCheck(
    checks,
    planText.includes('liveTruthPosture: historical_closeout_only') &&
      planText.includes('bootstrap_default_only') &&
      planText.includes('unlabeled active snippet to remain P0'),
    'plan documents posture labels and active-failure dogfood',
    'plan markers checked',
  )
  addCheck(
    checks,
    verifierSource.includes('buildLiveTruthVerifyDecoupleStatus') &&
      verifierSource.includes(LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID),
    'foundation verifier delegates to focused status function',
    'thin verifier coverage',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    baseline,
    synthetic,
    currentSprintFindingCount: currentSprintFindings.length,
  }
}

export async function buildLiveTruthVerifyDecoupleStatus({
  repoRoot = process.cwd(),
  baseUrl = 'http://localhost:3000',
  skipEndpointFetch = true,
  verifierSourceOverride = null,
} = {}) {
  const fileTexts = await readLiveTruthVerifyDecoupleFiles({ repoRoot })
  const [audit, packageText, planText, rootVerifierSource, processHardeningVerifierSource] = await Promise.all([
    buildCodeQualityNightlyAudit({ repoRoot, baseUrl, skipEndpointFetch }),
    fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'),
    fs.readFile(path.join(repoRoot, LIVE_TRUTH_VERIFY_DECOUPLE_PLAN_PATH), 'utf8'),
    fs.readFile(path.join(repoRoot, 'scripts/foundation-verify.mjs'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'lib/foundation-process-hardening-verifier.js'), 'utf8').catch(error => {
      if (error?.code === 'ENOENT') return ''
      throw error
    }),
  ])
  const packageJson = JSON.parse(packageText)
  const verifierSource = verifierSourceOverride || [rootVerifierSource, processHardeningVerifierSource].filter(Boolean).join('\n')
  const evaluation = evaluateLiveTruthVerifyDecouple({
    fileTexts,
    auditFindings: audit.findings || [],
    packageJson,
    planText,
    verifierSource,
  })
  return {
    status: evaluation.ok ? 'healthy' : 'blocked',
    cardId: LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
    closeoutKey: LIVE_TRUTH_VERIFY_DECOUPLE_CLOSEOUT_KEY,
    auditGeneratedAt: audit.generatedAt,
    currentSprintFindingCount: evaluation.currentSprintFindingCount,
    baseline: evaluation.baseline,
    synthetic: evaluation.synthetic,
    checks: evaluation.checks,
  }
}
