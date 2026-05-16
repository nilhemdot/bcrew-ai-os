import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  buildCodeQualityNightlyAudit,
  classifyEndpointMetric,
  detectHardcodedLiveTruthInText,
  detectMutationPatternsInText,
  renderCodeQualityNightlyAuditReport,
} from './code-quality-nightly-audit.js'
import {
  buildDocArtifactBloatSnapshot,
} from './doc-artifact-bloat-guard.js'
import { planLlmRoute } from './llm-router.js'
export {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_JSON_PATTERN,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_REPORT_PATTERN,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  NIGHTLY_DEEP_AUDIT_UPGRADE_SPRINT_ID,
} from './nightly-deep-audit-constants.js'
import {
  NIGHTLY_DEEP_AUDIT_JSON_PATTERN,
  NIGHTLY_DEEP_AUDIT_REPORT_PATTERN,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
} from './nightly-deep-audit-constants.js'

const execFile = promisify(execFileCallback)

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css'])
const HIGH_RISK_STATIC_FILES = [
  'server.js',
  'lib/foundation-db.js',
  'scripts/foundation-verify.mjs',
  'public/foundation.js',
  'lib/code-quality-nightly-audit.js',
  'lib/foundation-jobs.js',
  'lib/connector-uptime-monitor.js',
]

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function unique(values = []) {
  return Array.from(new Set(values.map(normalizePath).filter(Boolean)))
}

function formatDateInTimezone(date = new Date(), timeZone = NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getNightlyDeepAuditReportPath(date = new Date()) {
  return NIGHTLY_DEEP_AUDIT_REPORT_PATTERN.replace('{date}', formatDateInTimezone(date))
}

export function getNightlyDeepAuditJsonPath(date = new Date()) {
  return NIGHTLY_DEEP_AUDIT_JSON_PATTERN.replace('{date}', formatDateInTimezone(date))
}

async function readText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch {
    return ''
  }
}

async function statFile(repoRoot, relativePath) {
  try {
    return await fs.stat(path.join(repoRoot, relativePath))
  } catch {
    return null
  }
}

async function listChangedFiles(repoRoot, sinceRef = 'HEAD~1') {
  try {
    const { stdout } = await execFile('git', ['diff', '--name-only', `${sinceRef}..HEAD`], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    })
    return unique(stdout.split(/\r?\n/)).filter(file => CODE_EXTENSIONS.has(path.extname(file)))
  } catch {
    return []
  }
}

function classifyFileRisk({ file, lines = 0, changed = false } = {}) {
  const reasons = []
  const normalized = normalizePath(file)
  if (changed) reasons.push('changed_since_baseline')
  if (lines >= 10_000) reasons.push('actively_dangerous_10k_plus_file')
  else if (lines >= 5_000) reasons.push('over_5k_refactor_required')
  else if (lines >= 3_000) reasons.push('over_3k_warn')
  if (normalized === 'server.js') reasons.push('hot_route_surface')
  if (normalized === 'scripts/foundation-verify.mjs') reasons.push('verifier_trust_surface')
  if (/^scripts\/.*check.*\.mjs$/.test(normalized) || /^scripts\/process-.*\.mjs$/.test(normalized)) reasons.push('process_check_surface')
  if (normalized === 'lib/foundation-db.js') reasons.push('live_truth_write_boundary')
  if (normalized === 'public/foundation.js') reasons.push('frontend_route_cache_surface')
  if (/source|connector|clickup|fub|kpi|health/i.test(normalized)) reasons.push('source_health_surface')
  return {
    file: normalized,
    reasons: unique(reasons),
    severity: lines >= 10_000 || normalized === 'scripts/foundation-verify.mjs' ? 'P0' : reasons.length ? 'P1' : 'P3',
  }
}

function extractExcerpt(text, maxChars = 2400) {
  const patterns = [
    /app\.get\('\/api\/foundation-hub'/,
    /app\.get\('\/api\/ops-hub'/,
    /updateBacklogItem\s*\(/,
    /upsertFoundationCurrentSprintOverlay\s*\(/,
    /resetFoundationDb\s*\(/,
    /bootstrapFoundationDb\s*\(/,
    /renderCurrentState/,
    /innerHTML\s*=/,
    /Cache-Control/,
  ]
  const lines = text.split(/\r?\n/)
  let start = 0
  for (const pattern of patterns) {
    const index = lines.findIndex(line => pattern.test(line))
    if (index >= 0) {
      start = Math.max(0, index - 8)
      break
    }
  }
  return lines.slice(start, start + 48).join('\n').slice(0, maxChars)
}

async function buildReviewTargets({ repoRoot, audit = {}, changedFiles = [] } = {}) {
  const largestFiles = Array.isArray(audit.largestFiles) ? audit.largestFiles : []
  const candidateFiles = unique([
    ...changedFiles,
    ...HIGH_RISK_STATIC_FILES,
    ...largestFiles.filter(file => Number(file.lines) >= 3000).map(file => file.path),
    ...(audit.findings || []).flatMap(finding => (finding.refs || []).map(ref => ref.path)),
  ])

  const targets = []
  for (const file of candidateFiles) {
    if (!CODE_EXTENSIONS.has(path.extname(file))) continue
    const source = await readText(repoRoot, file)
    if (!source) continue
    const stat = await statFile(repoRoot, file)
    const lines = source.split(/\r?\n/).length
    const risk = classifyFileRisk({ file, lines, changed: changedFiles.includes(file) })
    if (!risk.reasons.length && targets.length >= 12) continue
    targets.push({
      file,
      severity: risk.severity,
      reasons: risk.reasons,
      lines,
      bytes: stat?.size || Buffer.byteLength(source),
      excerpt: extractExcerpt(source),
    })
  }

  return targets
    .sort((left, right) => {
      const severityRank = { P0: 0, P1: 1, P2: 2, P3: 3 }
      const rank = (severityRank[left.severity] ?? 9) - (severityRank[right.severity] ?? 9)
      if (rank !== 0) return rank
      return right.lines - left.lines
    })
    .slice(0, 18)
}

function detectVerifierSelfRepairRiskInText({ relativePath = 'synthetic/foundation-verify.mjs', text = '' } = {}) {
  const normalized = String(text || '')
  const hasRepair = /(resetFoundationDb|bootstrapFoundationDb|repairLiveState|repair\s*\(|seedLiveState|includeBootstrapSeed|UPDATE\s+backlog_items|UPDATE\s+foundation_sprints)/i.test(normalized)
  const hasVerifier = /verify|foundation:verify|check/i.test(relativePath) || /verify|foundation:verify|check/i.test(normalized)
  if (!hasRepair || !hasVerifier) return []
  return [{
    id: 'verifier-self-repair-risk',
    severity: 'P0',
    type: 'false_green_risk',
    title: 'Verifier/check path can repair live state before passing',
    whyItMatters: 'A green verifier that repairs what it verifies is not proof. It can hide broken state and recreate the old rebuild failure pattern.',
    refs: [{ path: relativePath, line: 1, detail: 'repair/seed/write pattern in verifier path' }],
    proposedCard: 'VERIFY-READONLY-GATE-001',
    proposedOwner: 'Foundation Verifier',
    detector: 'nightly deep audit verifier self-repair detector',
  }]
}

function buildNightlyDeepAuditKnownFailureFixtures() {
  const slowEndpoint = classifyEndpointMetric({
    ok: true,
    durationMs: 70_244,
    payloadBytes: 4_630_000,
    timeoutMs: 90_000,
  })
  const selfRepair = detectVerifierSelfRepairRiskInText({
    relativePath: 'synthetic/foundation-verify.mjs',
    text: `async function verify() { await resetFoundationDb(); await bootstrapFoundationDb({ includeBootstrapSeed: true }); await repairLiveState(); return { ok: true } }`,
  })
  const writeCapableCheck = detectMutationPatternsInText({
    relativePath: 'synthetic/process-danger-check.mjs',
    text: `await updateBacklogItem('CARD-001', { lane: 'done' }); await upsertFoundationCurrentSprintOverlay({ sprint: { status: 'active' } })`,
  })
  const hardcodedTruth = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/live-truth.js',
    text: `const EXPECTED_SOURCE_COUNT = 35; const currentSummary = 'Latest live checkpoint: 14/14 tables and 5/5 RPCs are passing.'`,
  })
  const monolith = classifyFileRisk({ file: 'lib/foundation-db.js', lines: 19_494, changed: false })

  return {
    ok: slowEndpoint.status === 'risk' &&
      selfRepair.length === 1 &&
      writeCapableCheck.length >= 1 &&
      hardcodedTruth.length >= 2 &&
      monolith.reasons.includes('actively_dangerous_10k_plus_file'),
    slowEndpoint,
    selfRepairCount: selfRepair.length,
    writeCapableCheckCount: writeCapableCheck.length,
    hardcodedTruthCount: hardcodedTruth.length,
    monolith,
  }
}

async function resolveLlmReviewRoute() {
  try {
    const plan = await planLlmRoute({ workload: 'synthesis', hubKey: 'foundation' })
    return {
      runnable: plan.runnable,
      selectedRoute: plan.selectedRoute?.routeKey || null,
      provider: plan.selectedRoute?.provider || null,
      model: plan.selectedRoute?.model || null,
      blockReason: plan.blockReason || null,
      routeReadiness: plan.routeReadiness || [],
    }
  } catch (error) {
    return {
      runnable: false,
      selectedRoute: null,
      provider: null,
      model: null,
      blockReason: error instanceof Error ? error.message : String(error),
      routeReadiness: [],
    }
  }
}

function buildDiffSummary({ audit = {}, previous = null } = {}) {
  const currentIds = new Set((audit.findings || []).map(finding => finding.id))
  const previousIds = new Set((previous?.findings || []).map(finding => finding.id))
  const newIds = [...currentIds].filter(id => !previousIds.has(id))
  const resolvedIds = [...previousIds].filter(id => !currentIds.has(id))
  const stillOpenIds = [...currentIds].filter(id => previousIds.has(id))
  return {
    previousReportPath: previous?.reportPath || null,
    newFindingIds: newIds,
    resolvedFindingIds: resolvedIds,
    stillOpenFindingIds: stillOpenIds,
    trend: {
      currentFindingCount: currentIds.size,
      previousFindingCount: previousIds.size,
      delta: currentIds.size - previousIds.size,
    },
  }
}

async function loadPreviousJsonReport(repoRoot, currentJsonPath) {
  try {
    const handoffDir = path.join(repoRoot, 'docs/handoffs')
    const entries = await fs.readdir(handoffDir)
    const candidates = entries
      .filter(name => /^nightly-deep-audit-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .map(name => `docs/handoffs/${name}`)
      .filter(file => file !== currentJsonPath)
      .sort()
    const previousPath = candidates[candidates.length - 1]
    if (!previousPath) return null
    const parsed = JSON.parse(await fs.readFile(path.join(repoRoot, previousPath), 'utf8'))
    return { ...parsed, reportPath: previousPath }
  } catch {
    return null
  }
}

export async function buildNightlyDeepAuditUpgrade({
  repoRoot = process.cwd(),
  baseUrl = 'http://localhost:3000',
  timeoutMs = 8000,
  skipEndpointFetch = false,
  changedSinceRef = 'HEAD~1',
  now = new Date(),
} = {}) {
  const reportPath = getNightlyDeepAuditReportPath(now)
  const jsonPath = getNightlyDeepAuditJsonPath(now)
  const changedFiles = await listChangedFiles(repoRoot, changedSinceRef)
  const deterministicAudit = await buildCodeQualityNightlyAudit({
    repoRoot,
    baseUrl,
    timeoutMs,
    skipEndpointFetch,
  })
  const reviewTargets = await buildReviewTargets({ repoRoot, audit: deterministicAudit, changedFiles })
  const llmRoute = await resolveLlmReviewRoute()
  const knownFailureDogfood = buildNightlyDeepAuditKnownFailureFixtures()
  const previous = await loadPreviousJsonReport(repoRoot, jsonPath)
  const diff = buildDiffSummary({ audit: deterministicAudit, previous })
  const docArtifactBloat = await buildDocArtifactBloatSnapshot({ repoRoot, now })
  return {
    status: 'report_ready',
    generatedAt: now.toISOString(),
    cardId: NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
    closeoutKey: NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    autonomousDev: false,
    autoCreatesBacklog: false,
    deterministicAudit,
    changedFiles,
    reviewTargets,
    llmReview: {
      mode: llmRoute.runnable ? 'approved_route_available_for_bounded_review' : 'packet_only_route_blocked_or_unapproved',
      executedThisRun: false,
      route: llmRoute,
      note: llmRoute.runnable
        ? 'An approved route is available; V1 still records packets by default unless an explicit live LLM review mode is enabled.'
        : 'No runnable approved route is available, so the report contains senior-engineer review packets instead of claiming LLM review ran.',
    },
    diff,
    knownFailureDogfood,
    docArtifactBloat,
    coverage: {
      backend: reviewTargets.some(target => target.file === 'server.js' || target.file.startsWith('lib/') || target.file.startsWith('scripts/')),
      frontend: reviewTargets.some(target => target.file.startsWith('public/')),
      endpointMetrics: CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.every(endpoint =>
        (deterministicAudit.endpointMetrics || []).some(metric => metric.endpoint === endpoint)
      ),
    },
    reportPath,
    jsonPath,
  }
}

function renderTarget(target) {
  return [
    `### ${target.severity} ${target.file}`,
    '',
    `- Lines: ${target.lines}`,
    `- Bytes: ${target.bytes}`,
    `- Reasons: ${target.reasons.join(', ') || 'changed/review target'}`,
    '',
    '```',
    target.excerpt || '(no excerpt)',
    '```',
  ].join('\n')
}

function renderFindingLine(finding) {
  return `- ${finding.severity || 'P?'} ${finding.id}: ${finding.title || 'untitled'} -> ${finding.proposedCard || 'no-card'}`
}

export function renderNightlyDeepAuditUpgradeReport(audit = {}) {
  const deterministic = audit.deterministicAudit || {}
  const findings = Array.isArray(deterministic.findings) ? deterministic.findings : []
  const topFindings = findings.slice(0, 18)
  const endpointMetrics = deterministic.endpointMetrics || []
  const largestFiles = deterministic.largestFiles || []

  return `# Nightly Deep Audit Report - ${formatDateInTimezone(new Date(audit.generatedAt || Date.now()))}

Closeout key: \`${audit.closeoutKey || NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY}\`
Generated at: \`${audit.generatedAt || ''}\`
Report path: \`${audit.reportPath || ''}\`

## Morning Read

- Status: \`${audit.status || 'unknown'}\`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: ${deterministic.summary?.findingCount || findings.length} total (${deterministic.summary?.p0 || 0} P0, ${deterministic.summary?.p1 || 0} P1, ${deterministic.summary?.p2 || 0} P2, ${deterministic.summary?.p3 || 0} P3)
- Changed files selected: ${audit.changedFiles?.length || 0}
- High-risk review targets: ${audit.reviewTargets?.length || 0}
- LLM review mode: \`${audit.llmReview?.mode || 'unknown'}\`
- Dogfood against May 13 failures: ${audit.knownFailureDogfood?.ok ? 'passed' : 'blocked'}
- Doc/report artifact bloat: \`${audit.docArtifactBloat?.status || 'unknown'}\` (${audit.docArtifactBloat?.summary?.riskCount || 0} red, ${audit.docArtifactBloat?.summary?.reviewCount || 0} yellow)

## Diff Summary

- Previous report: \`${audit.diff?.previousReportPath || 'none'}\`
- New findings: ${(audit.diff?.newFindingIds || []).length}
- Still open: ${(audit.diff?.stillOpenFindingIds || []).length}
- Resolved: ${(audit.diff?.resolvedFindingIds || []).length}
- Finding delta: ${audit.diff?.trend?.delta ?? 0}

## LLM Review Boundary

- Executed this run: ${audit.llmReview?.executedThisRun ? 'yes' : 'no'}
- Selected route: \`${audit.llmReview?.route?.selectedRoute || 'none'}\`
- Provider/model: \`${[audit.llmReview?.route?.provider, audit.llmReview?.route?.model].filter(Boolean).join(' / ') || 'none'}\`
- Route blocker: ${audit.llmReview?.route?.blockReason || 'none'}
- Note: ${audit.llmReview?.note || ''}

## Endpoint And Payload Trend

${endpointMetrics.map(metric => {
  if (metric.skipped) return `- ${metric.endpoint}: skipped (${metric.reason})`
  return `- ${metric.endpoint}: ${Math.round(metric.durationMs || 0)}ms, ${metric.payloadBytes || 0}B, risk=${metric.risk?.status || 'unknown'} (${metric.risk?.reason || 'n/a'})`
}).join('\n')}

## Largest Files

${largestFiles.slice(0, 10).map(file => `- ${file.path}: ${file.lines} LOC, ${file.bytes}B`).join('\n')}

## High-Risk Review Packets

${(audit.reviewTargets || []).map(renderTarget).join('\n\n')}

## Top Deterministic Findings

${topFindings.map(renderFindingLine).join('\n') || '- none'}

## Doc / Report Artifact Bloat

- Status: \`${audit.docArtifactBloat?.status || 'unknown'}\`
- Handoff files: ${audit.docArtifactBloat?.summary?.handoffFileCount || 0}
- Handoff hot lines: ${audit.docArtifactBloat?.summary?.handoffLineTotal || 0}
- Nightly artifacts: ${audit.docArtifactBloat?.summary?.nightlyArtifactCount || 0}
- Red/yellow findings: ${audit.docArtifactBloat?.summary?.riskCount || 0}/${audit.docArtifactBloat?.summary?.reviewCount || 0}

${(audit.docArtifactBloat?.topFindings || []).slice(0, 8).map(finding => `- ${finding.severity || 'P2'} ${finding.title || finding.id}: ${finding.detail || ''}`).join('\n') || '- none'}

## Dogfood Proof

- 70s / 4.63 MB endpoint fixture: \`${audit.knownFailureDogfood?.slowEndpoint?.status || 'missing'}\`
- Self-repairing verifier fixture count: ${audit.knownFailureDogfood?.selfRepairCount || 0}
- Write-capable check fixture count: ${audit.knownFailureDogfood?.writeCapableCheckCount || 0}
- Hardcoded live truth fixture count: ${audit.knownFailureDogfood?.hardcodedTruthCount || 0}
- 10K+ monolith fixture reasons: ${(audit.knownFailureDogfood?.monolith?.reasons || []).join(', ') || 'missing'}

## Boundaries

- No auto-fixes.
- No auto backlog mutation.
- No hub feature work.
- No Build Intel extraction.
- No paid-source auth.
- No unapproved provider spend.

## Deterministic Scanner Detail

${renderCodeQualityNightlyAuditReport(deterministic)}
`
}

export function serializeNightlyDeepAuditUpgradeJson(audit = {}) {
  return {
    generatedAt: audit.generatedAt,
    reportPath: audit.reportPath,
    jsonPath: audit.jsonPath,
    cardId: audit.cardId,
    closeoutKey: audit.closeoutKey,
    summary: audit.deterministicAudit?.summary || {},
    endpointMetrics: audit.deterministicAudit?.endpointMetrics || [],
    findings: audit.deterministicAudit?.findings || [],
    reviewTargets: audit.reviewTargets?.map(target => ({
      file: target.file,
      severity: target.severity,
      reasons: target.reasons,
      lines: target.lines,
      bytes: target.bytes,
    })) || [],
    diff: audit.diff,
    llmReview: audit.llmReview,
    knownFailureDogfood: audit.knownFailureDogfood,
    docArtifactBloat: audit.docArtifactBloat ? {
      status: audit.docArtifactBloat.status,
      summary: audit.docArtifactBloat.summary,
      topFindings: (audit.docArtifactBloat.topFindings || []).slice(0, 12),
    } : null,
  }
}

export function buildNightlyDeepAuditUpgradeDogfoodProof() {
  const knownFailureDogfood = buildNightlyDeepAuditKnownFailureFixtures()
  const syntheticTargets = [
    classifyFileRisk({ file: 'scripts/foundation-verify.mjs', lines: 13_695 }),
    classifyFileRisk({ file: 'public/foundation.js', lines: 16_000 }),
    classifyFileRisk({ file: 'server.js', lines: 7_790 }),
  ]
  const checks = [
    {
      ok: knownFailureDogfood.ok === true,
      check: 'May 13 known failure fixtures are detected',
      detail: JSON.stringify(knownFailureDogfood),
    },
    {
      ok: syntheticTargets.some(target => target.file === 'scripts/foundation-verify.mjs' && target.reasons.includes('verifier_trust_surface')),
      check: 'verifier monolith is selected as high-risk review target',
      detail: JSON.stringify(syntheticTargets[0]),
    },
    {
      ok: syntheticTargets.some(target => target.file === 'public/foundation.js' && target.reasons.includes('frontend_route_cache_surface')),
      check: 'frontend monolith is selected as high-risk review target',
      detail: JSON.stringify(syntheticTargets[1]),
    },
    {
      ok: syntheticTargets.some(target => target.file === 'server.js' && target.reasons.includes('hot_route_surface')),
      check: 'hot route surface is selected as high-risk review target',
      detail: JSON.stringify(syntheticTargets[2]),
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    knownFailureDogfood,
  }
}
