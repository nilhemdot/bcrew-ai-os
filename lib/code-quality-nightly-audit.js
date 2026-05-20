import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { getFoundationJobDefinitions } from './foundation-jobs.js'
import {
  FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
  measureFoundationFrontendAssetsFromRepo,
} from './foundation-frontend-asset-budgets.js'
import {
  FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
  measureFoundationFrontendDomBudgetFromRepo,
} from './foundation-frontend-dom-budgets.js'
import {
  evaluateFoundationJobMutationAllowlist,
} from './foundation-job-mutation-allowlist.js'
import {
  isFoundationClientCurrentStateExtracted,
} from './foundation-client-current-state-extract.js'
import {
  evaluateFoundationBuildLogApiCacheAndSlimSource,
} from './foundation-build-log-api-cache.js'
import {
  evaluateAdminDealPolicySourceContractUsage,
} from './admin-deal-policy-source-contract.js'
import {
  evaluateApprovalThresholdRegistryUsage,
} from './approval-threshold-registry.js'
import {
  evaluateBuildIntelSnapshotBaselineUsage,
} from './build-intel-snapshot-baseline.js'
import { classifyProcessCheckSource } from './process-check-readonly-mode.js'

export const CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY = 'foundation-code-quality-nightly-audit-v1'
export const CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID = 'foundation-code-quality-nightly-audit-2026-05-13'
export const CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH = 'scripts/process-code-quality-nightly-audit-check.mjs'
export const CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-13-code-quality-nightly-audit-report.md'
export const CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY = 'code-quality-nightly-audit'

export const CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS = [
  'CODEBASE-HARDCODE-AUDIT-001',
  'FOUNDATION-API-PERF-AUDIT-001',
  'FOUNDATION-FRONTEND-PERF-AUDIT-001',
  'FOUNDATION-MONOLITH-RISK-AUDIT-001',
  'VERIFIER-ASSUMPTION-REGISTRY-001',
  'SPRINT-STATE-MUTATION-AUDIT-001',
  'NIGHTLY-AUDIT-REPORT-001',
]

export const CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS = [
  '/api/foundation-hub',
  '/api/source-of-truth',
  '/api/foundation/source-lifecycle',
  '/api/foundation/build-log',
  '/api/foundation/gstack-build-intel',
]
export const CODE_QUALITY_NIGHTLY_AUDIT_MIN_FINDING_COUNT = 8

const severityRank = { P0: 0, P1: 1, P2: 2, P3: 3 }
const repoCodeExtensions = new Set(['.js', '.mjs', '.css', '.html'])
const skipDirs = new Set(['.git', 'node_modules', '.openclaw', '.claude', 'coverage', 'dist'])

function normalizeText(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

async function listFiles(repoRoot, dir = repoRoot, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await listFiles(repoRoot, absolutePath, result)
    } else if (entry.isFile()) {
      result.push(path.relative(repoRoot, absolutePath).replace(/\\/g, '/'))
    }
  }
  return result
}

function lineNumberForIndex(text, index) {
  if (!text || index < 0) return 1
  return text.slice(0, index).split(/\r?\n/).length
}

function firstLineOf(text, pattern) {
  const match = text.match(pattern)
  if (!match || match.index == null) return null
  return lineNumberForIndex(text, match.index)
}

function countTextLines(text = '') {
  const value = String(text || '')
  if (!value) return 0
  const lines = value.split(/\r?\n/)
  return lines.length - (value.endsWith('\n') ? 1 : 0)
}

function foundationVerifyRootHasRegistrySplit(fileTexts = {}) {
  const rootSource = fileTexts['scripts/foundation-verify.mjs'] || ''
  const registrySource = fileTexts['lib/foundation-verify-registry-split.js'] || ''
  const structuralSource = fileTexts['lib/foundation-verifier-structural-assurance-core.js'] || ''
  const rootLines = countTextLines(rootSource)
  return rootLines > 0 &&
    rootLines < 5000 &&
    registrySource.includes('FOUNDATION-VERIFY-REGISTRY-SPLIT-001') &&
    registrySource.includes('FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS') &&
    structuralSource.includes('evaluateFoundationVerifierModuleAssurance') &&
    !rootSource.includes('VERIFIER_MODULE_ASSURANCE_SPLIT_APPROVAL_PATH') &&
    !rootSource.includes('VERIFIER_BACKEND_SPLIT_ASSURANCE_APPROVAL_PATH')
}

function contextForLine(text, lineNumber, radius = 4) {
  const lines = String(text || '').split(/\r?\n/)
  const index = Math.max(0, Number(lineNumber || 1) - 1)
  const start = Math.max(0, index - radius)
  const end = Math.min(lines.length, index + radius + 1)
  return lines.slice(start, end).join('\n')
}

export function classifyCurrentSprintTruthContext({ relativePath = 'synthetic.js', text = '', line = null } = {}) {
  const context = contextForLine(text, line || 1, 5)
  if (/liveTruthPosture:\s*historical_closeout_only/i.test(context)) {
    return {
      posture: 'historical_closeout_only',
      activeLiveTruth: false,
      reason: 'explicit historical closeout posture',
      relativePath,
      line,
    }
  }
  if (/liveTruthPosture:\s*bootstrap_default_only/i.test(context)) {
    return {
      posture: 'bootstrap_default_only',
      activeLiveTruth: false,
      reason: 'explicit bootstrap/default posture',
      relativePath,
      line,
    }
  }
  return {
    posture: 'active_live_truth',
    activeLiveTruth: true,
    reason: 'unlabeled current-sprint literal',
    relativePath,
    line,
  }
}

function collectPatternRefs(fileTexts, pattern, { limit = 8, fileFilter = null } = {}) {
  const refs = []
  for (const [relativePath, text] of Object.entries(fileTexts)) {
    if (fileFilter && !fileFilter(relativePath)) continue
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
    let match = null
    while ((match = regex.exec(text)) && refs.length < limit) {
      refs.push({
        path: relativePath,
        line: lineNumberForIndex(text, match.index || 0),
        match: match[0].slice(0, 160).replace(/\s+/g, ' '),
      })
      if (!regex.global) break
    }
    if (refs.length >= limit) break
  }
  return refs
}

function makeRef(pathname, line = null, detail = '') {
  return {
    path: pathname,
    line: Number.isFinite(Number(line)) ? Number(line) : null,
    detail,
  }
}

function formatRefs(refs = []) {
  if (!refs.length) return 'n/a'
  return refs
    .slice(0, 6)
    .map(ref => `\`${ref.path}${ref.line ? `:${ref.line}` : ''}\`${ref.detail ? ` (${ref.detail})` : ''}`)
    .join(', ')
}

function finding(input) {
  return {
    id: input.id,
    cardId: input.cardId,
    severity: input.severity || 'P2',
    type: input.type || 'drift_risk',
    title: input.title,
    whyItMatters: input.whyItMatters,
    refs: input.refs || [],
    detector: input.detector || '',
    proposedCard: input.proposedCard || input.id,
    proposedOwner: input.proposedOwner || 'Foundation',
    falsePositiveNote: input.falsePositiveNote || '',
    autoFix: false,
    autoBacklogMutation: false,
  }
}

function sortFindings(findings = []) {
  return findings.slice().sort((left, right) => {
    const rank = (severityRank[left.severity] ?? 9) - (severityRank[right.severity] ?? 9)
    if (rank !== 0) return rank
    return String(left.id).localeCompare(String(right.id))
  })
}

export function detectHardcodedLiveTruthInText({ relativePath = 'synthetic.js', text = '' } = {}) {
  const refsFor = pattern => {
    const line = firstLineOf(text, pattern)
    return line ? [makeRef(relativePath, line)] : []
  }
  const detections = []
  const currentSprintLine = firstLineOf(text, /Current Sprint:|control-plane-connector-readiness-2026-05-12|foundation-current-2026-05-12/i)
  const currentSprintClassification = currentSprintLine
    ? classifyCurrentSprintTruthContext({ relativePath, text, line: currentSprintLine })
    : null
  if (currentSprintLine && currentSprintClassification.activeLiveTruth) {
    detections.push(finding({
      id: 'hardcoded-current-sprint-truth',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P0',
      type: 'drift_risk',
      title: 'Live-looking Current Sprint truth is hardcoded',
      whyItMatters: 'Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.',
      refs: [makeRef(relativePath, currentSprintLine)],
      proposedCard: 'LIVE-TRUTH-VERIFY-DECOUPLE-001',
      proposedOwner: 'Foundation verifier',
      detector: `Current Sprint dated-string detector (${currentSprintClassification.reason})`,
      falsePositiveNote: 'Historical closeout sections are acceptable when explicitly labeled as history.',
    }))
  }
  if (/EXPECTED_SOURCE_COUNT|MIN_SOURCE_CONTRACTS|sourceContracts\.length\s*===|all\s+\d+\s+source contracts|\b35 source|\b36 source|\b39 source/i.test(text)) {
    detections.push(finding({
      id: 'hardcoded-source-count-baseline',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P1',
      type: 'drift_risk',
      title: 'Source contract count is encoded as an exact baseline',
      whyItMatters: 'Source registry additions can break or stale-pass different surfaces when expected counts are not derived from `getSourceContracts()`.',
      refs: refsFor(/EXPECTED_SOURCE_COUNT|MIN_SOURCE_CONTRACTS|sourceContracts\.length\s*===|all\s+\d+\s+source contracts|\b35 source|\b36 source|\b39 source/i),
      proposedCard: 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001',
      proposedOwner: 'Source Lifecycle',
      detector: 'source-count literal detector',
      falsePositiveNote: 'Accepted historical closeout text can stay if it is not used as current live truth.',
    }))
  }
  if (/currentSummary:|Latest live checkpoint|14\/14|5\/5|is passing|Ready for v1/i.test(text)) {
    detections.push(finding({
      id: 'hardcoded-foundation-ui-current-summary',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P1',
      type: 'drift_risk',
      title: 'Foundation UI embeds current-state summary truth',
      whyItMatters: 'Static UI copy can report stale health, source, or KPI counts after APIs change.',
      refs: refsFor(/currentSummary:|Latest live checkpoint|14\/14|5\/5|is passing|Ready for v1/i),
      proposedCard: 'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001',
      proposedOwner: 'Foundation UI',
      detector: 'currentSummary/static-live-copy detector',
      falsePositiveNote: 'Static maturity explainers are acceptable; live checkpoint wording is not.',
    }))
  }
  if (/target_year:\s*2026|2026-01-01|2026-12-31/i.test(text)) {
    detections.push(finding({
      id: 'hardcoded-kpi-health-year',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P1',
      type: 'drift_risk',
      title: 'KPI health uses hardcoded 2026 windows',
      whyItMatters: 'KPI health can silently age into stale YTD truth unless the current year comes from a source contract or runtime date rule.',
      refs: refsFor(/target_year:\s*2026|2026-01-01|2026-12-31/i),
      proposedCard: 'KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001',
      proposedOwner: 'KPI Health',
      detector: 'KPI year literal detector',
      falsePositiveNote: 'Durable policy dates are acceptable when tied to an as-of source contract.',
    }))
  }
  return detections
}

export function detectMutationPatternsInText({ relativePath = 'synthetic.mjs', text = '' } = {}) {
  const mutatorPattern = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|DELETE\s+FROM\s+foundation_sprint_items|applyApprovedActionRoute|batchUpdateSheetValues|fs\.writeFile|writeFile\s*\(/i
  const line = firstLineOf(text, mutatorPattern)
  if (!line) return []
  const processCheckClassification = classifyProcessCheckSource({
    relativePath,
    source: text,
    backlogWriteBoundaryGuarded: true,
  })
  if (
    processCheckClassification.classification !== 'not_process_check' &&
    processCheckClassification.protected === true
  ) {
    return []
  }
  if (
    processCheckClassification.classification === 'not_process_check' &&
    relativePath === 'scripts/intelligence-action-router-apply.mjs' &&
    text.includes('confirmApprovedRouteApply') &&
    text.includes('action_route_apply_confirmation_required') &&
    text.includes('action_route_apply_approver_required')
  ) {
    return []
  }
  return [finding({
    id: 'process-check-side-effect-risk',
    cardId: 'SPRINT-STATE-MUTATION-AUDIT-001',
    severity: 'P0',
    type: 'drift_risk',
    title: 'Process/check path contains write side effects',
    whyItMatters: 'Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.',
    refs: [makeRef(relativePath, line)],
    proposedCard: 'PROCESS-CHECK-READONLY-MODE-001',
    proposedOwner: 'Foundation Process',
    detector: 'process script mutator pattern detector',
    falsePositiveNote: processCheckClassification.classification === 'not_process_check'
      ? 'Non-process-check mutators still need explicit command/approval boundaries before reuse by nightly audits.'
      : 'Unguarded process-check mutators need explicit apply/confirm boundaries before reuse by nightly audits.',
  })]
}

export function classifyEndpointMetric(metric = {}) {
  const durationMs = Number(metric.durationMs)
  const payloadBytes = Number(metric.payloadBytes)
  if (metric.timeout === true) {
    return {
      status: 'risk',
      severity: 'P0',
      reason: `Timed out after ${metric.timeoutMs || 'unknown'}ms.`,
    }
  }
  if (!metric.ok) {
    return {
      status: 'warning',
      severity: 'P2',
      reason: metric.error || `HTTP ${metric.status || 'unknown'}`,
    }
  }
  if (Number.isFinite(durationMs) && durationMs >= 2000) {
    return { status: 'risk', severity: 'P1', reason: `Latency ${Math.round(durationMs)}ms exceeds 2000ms budget.` }
  }
  if (Number.isFinite(payloadBytes) && payloadBytes >= 1_500_000) {
    return { status: 'risk', severity: 'P1', reason: `Payload ${payloadBytes} bytes exceeds 1.5MB budget.` }
  }
  if (Number.isFinite(durationMs) && durationMs >= 1000) {
    return { status: 'warning', severity: 'P2', reason: `Latency ${Math.round(durationMs)}ms exceeds 1000ms watch budget.` }
  }
  if (Number.isFinite(payloadBytes) && payloadBytes >= 800_000) {
    return { status: 'warning', severity: 'P2', reason: `Payload ${payloadBytes} bytes exceeds 800KB watch budget.` }
  }
  return { status: 'healthy', severity: 'P3', reason: 'Within V1 audit budget.' }
}

export async function measureFoundationEndpoint({
  baseUrl = 'http://localhost:3000',
  endpoint,
  timeoutMs = 5000,
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  try {
    const response = await fetch(new URL(endpoint, baseUrl), { signal: controller.signal })
    const text = await response.text()
    const durationMs = performance.now() - started
    return {
      endpoint,
      ok: response.ok,
      status: response.status,
      durationMs,
      payloadBytes: Buffer.byteLength(text),
      timeout: false,
      timeoutMs,
      cacheControl: response.headers.get('cache-control') || '',
      risk: classifyEndpointMetric({ ok: response.ok, status: response.status, durationMs, payloadBytes: Buffer.byteLength(text), timeoutMs }),
    }
  } catch (error) {
    const durationMs = performance.now() - started
    const timedOut = error?.name === 'AbortError'
    return {
      endpoint,
      ok: false,
      status: null,
      durationMs,
      payloadBytes: 0,
      timeout: timedOut,
      timeoutMs,
      error: timedOut ? 'timeout' : error instanceof Error ? error.message : String(error),
      risk: classifyEndpointMetric({ ok: false, durationMs, timeout: timedOut, timeoutMs, error: timedOut ? 'timeout' : String(error) }),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function readScanFiles(repoRoot, files) {
  const entries = await Promise.all(files.map(async file => [file, await readText(repoRoot, file)]))
  return Object.fromEntries(entries)
}

function buildHardcodedTruthFindings(fileTexts) {
  const findings = []
  for (const [relativePath, text] of Object.entries(fileTexts)) {
    if (relativePath === 'lib/code-quality-nightly-audit.js') continue
    findings.push(...detectHardcodedLiveTruthInText({ relativePath, text }))
  }
  const exactSprintRefs = collectPatternRefs(
    fileTexts,
    /(activeSprint\.sprint\?\.sprintId\s*===|currentSprint\.sprintId\s*===|const\s+[A-Z_]*SPRINT_ID\s*=\s*['"][a-z0-9-]+-2026-[0-9]{2}-[0-9]{2})/i,
    { fileFilter: file => /^scripts\/process-.*\.mjs$/.test(file) || /^lib\//.test(file), limit: 8 },
  )
  if (exactSprintRefs.length) {
    findings.push(finding({
      id: 'focused-check-active-sprint-id-assumption',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P2',
      type: 'drift_risk',
      title: 'Focused checks assert exact dated active sprint IDs',
      whyItMatters: 'One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.',
      refs: exactSprintRefs.map(ref => makeRef(ref.path, ref.line, ref.match)),
      proposedCard: 'SPRINT-CHECK-HISTORICAL-MODE-001',
      proposedOwner: 'Foundation Process',
      detector: 'dated active-sprint assertion detector',
      falsePositiveNote: 'Active live-truth literals still fail as P0; dated card/sprint metadata is a review finding unless a focused proof hard-fails after rollover.',
    }))
  }
  const buildIntelBaselineUsage = evaluateBuildIntelSnapshotBaselineUsage({
    baselineSource: fileTexts['lib/build-intel-snapshot-baseline.js'] || '',
    gstackSource: fileTexts['lib/gstack-build-intel.js'] || '',
    gstackProcessSource: fileTexts['scripts/process-gstack-build-intel-check.mjs'] || '',
    codeQualityAuditSource: fileTexts['lib/code-quality-nightly-audit.js'] || '',
    intelligenceVerifierSource: fileTexts['lib/foundation-intelligence-audit-verifier.js'] || '',
    sourceNoteSource: fileTexts['docs/source-notes/github-build-intel.md'] || '',
  })
  if (!buildIntelBaselineUsage.ok) {
    const gstackRefs = buildIntelBaselineUsage.refs.length
      ? buildIntelBaselineUsage.refs
      : collectPatternRefs(fileTexts, /GSTACK_BUILD_INTEL_EXPECTED_COMMIT|EXPECTED_COMMIT|sourceCommit\s*===/i, { limit: 6 })
    findings.push(finding({
      id: 'fixed-build-intel-commit-baseline',
      cardId: 'VERIFIER-ASSUMPTION-REGISTRY-001',
      severity: 'P2',
      type: 'drift_risk',
      title: 'Build Intel commit is pinned as expected truth',
      whyItMatters: 'A fixed inspected commit is valid snapshot evidence, but it must not be treated as latest Build Intel monitoring truth.',
      refs: gstackRefs.map(ref => makeRef(ref.path, ref.line, ref.match || ref.detail)),
      proposedCard: 'BUILD-INTEL-SNAPSHOT-BASELINE-001',
      proposedOwner: 'Build Intel',
      detector: 'expected-commit baseline detector',
      falsePositiveNote: 'Valid when labeled inspected snapshot evidence with an as-of date.',
    }))
  }
  const adminDateRefs = collectPatternRefs(fileTexts, /DEFAULT_BACKLOG_SINCE|OPS_BONUS_POLICY_EFFECTIVE_DATE|--backlog-since=|2025-06-01|2026-04-01|June 2025|Post-April/i, { limit: 8 })
  const adminDealPolicyReady = evaluateAdminDealPolicySourceContractUsage({
    reviewAdminDealsSource: fileTexts['scripts/review-admin-deals.mjs'] || '',
    foundationJobsSource: fileTexts['lib/foundation-jobs.js'] || '',
    opsSource: fileTexts['public/ops.js'] || '',
    sourceContractSource: fileTexts['lib/admin-deal-policy-source-contract.js'] || '',
  }).ok
  if (adminDateRefs.length && !adminDealPolicyReady) {
    findings.push(finding({
      id: 'admin-deal-policy-date-duplication',
      cardId: 'CODEBASE-HARDCODE-AUDIT-001',
      severity: 'P2',
      type: 'drift_risk',
      title: 'Admin deal-review policy dates are duplicated across runner, job config, and UI',
      whyItMatters: 'Policy cutoff changes require manual edits across several surfaces unless a source contract owns the dates.',
      refs: adminDateRefs.map(ref => makeRef(ref.path, ref.line, ref.match)),
      proposedCard: 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
      proposedOwner: 'Ops Source Truth',
      detector: 'policy-date duplication detector',
      falsePositiveNote: 'Durable policy dates are acceptable when source ID, owner, and as-of date are explicit.',
    }))
  }
  return findings
}

function buildApiStaticFindings(fileTexts) {
  const server = fileTexts['server.js'] || ''
  const operatorRoutes = fileTexts['lib/foundation-operator-routes.js'] || ''
  const frontendOperations = fileTexts['public/foundation-operations-renderers.js'] || ''
  const buildLogApiCache = fileTexts['lib/foundation-build-log-api-cache.js'] || ''
  const foundationDb = fileTexts['lib/foundation-db.js'] || ''
  const kpiHealth = fileTexts['lib/kpi-health.js'] || ''
  const gstack = fileTexts['lib/gstack-build-intel.js'] || ''
  const buildLog = fileTexts['lib/foundation-build-log.js'] || ''
  const findings = []
  if (server.includes('getSafeKpiHealthSnapshot') && kpiHealth.includes('fetchSupabaseJson')) {
    findings.push(finding({
      id: 'kpi-health-request-path-timeout-risk',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P0',
      type: 'performance_risk',
      title: 'KPI health probes run on source/hub request paths without a visible timeout budget',
      whyItMatters: 'Sequential Supabase table/RPC probes can hold core Foundation routes hostage.',
      refs: [
        makeRef('server.js', firstLineOf(server, /getSafeKpiHealthSnapshot/)),
        makeRef('lib/kpi-health.js', firstLineOf(kpiHealth, /async function fetchSupabaseJson|function fetchSupabaseJson/)),
      ],
      proposedCard: 'KPI-HEALTH-API-CACHE-001',
      proposedOwner: 'KPI Health',
      detector: 'request-path KPI health probe detector',
      falsePositiveNote: 'Acceptable only with cache, timeout, and stale fallback proof.',
    }))
  }
  if (server.includes('/api/foundation-hub') && server.includes('getFoundationSnapshot()')) {
    findings.push(finding({
      id: 'foundation-hub-aggregate-overfetch',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P0',
      type: 'performance_risk',
      title: '/api/foundation-hub is an all-in-one aggregation chokepoint',
      whyItMatters: 'The first Foundation render depends on the heaviest aggregate endpoint and serial builder fanout.',
      refs: [
        makeRef('server.js', firstLineOf(server, /app\.get\('\/api\/foundation-hub'/)),
        makeRef('lib/foundation-db.js', firstLineOf(foundationDb, /export async function getFoundationSnapshot/)),
      ],
      proposedCard: 'FOUNDATION-HUB-API-PERF-BUDGET-001',
      proposedOwner: 'Foundation API',
      detector: 'foundation hub aggregate route detector',
      falsePositiveNote: 'Aggregator routes are fine when section timing, payload budgets, and cache boundaries are explicit.',
    }))
  }
  if (server.includes('/api/foundation/source-lifecycle') && server.includes('const foundationSnapshot = await getFoundationSnapshot()')) {
    findings.push(finding({
      id: 'source-lifecycle-full-snapshot-overfetch',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P1',
      type: 'performance_risk',
      title: 'Source Lifecycle route loads the full Foundation snapshot',
      whyItMatters: 'A source-specific page pays for archive, candidate, synthesis, jobs, runtime, Drive, backlog, and audit surfaces before rendering one lifecycle payload.',
      refs: [
        makeRef('server.js', firstLineOf(server, /app\.get\('\/api\/foundation\/source-lifecycle'/)),
        makeRef('server.js', firstLineOf(server, /const foundationSnapshot = await getFoundationSnapshot\(\)/)),
      ],
      proposedCard: 'SOURCE-LIFECYCLE-SLIM-SNAPSHOT-001',
      proposedOwner: 'Source Truth',
      detector: 'source lifecycle full snapshot detector',
    }))
  }
  if (server.includes('/api/foundation/gstack-build-intel') && gstack.includes('listFilesRecursive')) {
    findings.push(finding({
      id: 'gstack-request-time-recursive-scan',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P1',
      type: 'performance_risk',
      title: 'GStack Build Intel snapshot recursively scans the local mirror on request',
      whyItMatters: 'Request-time filesystem walking can grow without a file/depth/time cap.',
      refs: [
        makeRef('server.js', firstLineOf(server, /app\.get\('\/api\/foundation\/gstack-build-intel'/)),
        makeRef('lib/gstack-build-intel.js', firstLineOf(gstack, /async function listFilesRecursive/)),
      ],
      proposedCard: 'GSTACK-BUILD-INTEL-SNAPSHOT-CACHE-001',
      proposedOwner: 'Build Intel',
      detector: 'request-time recursive scan detector',
    }))
  }
  if (server.includes('searchSharedCommunicationArtifactsForContext') && foundationDb.includes('content_text')) {
    findings.push(finding({
      id: 'build-intel-context-search-full-text-risk',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P2',
      type: 'performance_risk',
      title: 'Build Intel context search can fetch and scan large artifact text',
      whyItMatters: 'ILIKE filters over title/content and JS excerpt scoring can become a full-table text scan as artifacts grow.',
      refs: [
        makeRef('server.js', firstLineOf(server, /searchSharedCommunicationArtifactsForContext/)),
        makeRef('lib/foundation-db.js', firstLineOf(foundationDb, /content_text/)),
      ],
      proposedCard: 'BUILD-INTEL-CONTEXT-SEARCH-INDEX-001',
      proposedOwner: 'Build Intel',
      detector: 'artifact content search detector',
    }))
  }
  const buildLogCacheAndSlimReady = evaluateFoundationBuildLogApiCacheAndSlimSource({
    operatorRoutesSource: operatorRoutes,
    frontendOperationsSource: frontendOperations,
    cacheModuleSource: buildLogApiCache,
  }).ok
  if (!buildLogCacheAndSlimReady && server.includes('git') && server.includes('--max-count') && buildLog.includes('closeoutRecords')) {
    findings.push(finding({
      id: 'build-log-request-time-git-and-duplication',
      cardId: 'FOUNDATION-API-PERF-AUDIT-001',
      severity: 'P2',
      type: 'performance_risk',
      title: 'Build Log shells out to git and returns duplicate group/build payloads',
      whyItMatters: 'Request-time subprocess work and duplicated serialized build entries can make Recent Work slow as closeout history grows.',
      refs: [
        makeRef('server.js', firstLineOf(server, /git'.*log|git', \[/s)),
        makeRef('lib/foundation-build-log.js', firstLineOf(buildLog, /const closeoutRecords/)),
      ],
      proposedCard: 'BUILD-LOG-API-CACHE-AND-SLIM-001',
      proposedOwner: 'Foundation Runtime',
      detector: 'request-time git log detector',
    }))
  }
  return findings
}

async function buildEndpointMetrics({ baseUrl, timeoutMs, skipEndpointFetch } = {}) {
  if (skipEndpointFetch) {
    return CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.map(endpoint => ({
      endpoint,
      skipped: true,
      reason: 'Endpoint fetch skipped by argument.',
    }))
  }
  return Promise.all(CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.map(endpoint =>
    measureFoundationEndpoint({ baseUrl, endpoint, timeoutMs })
  ))
}

async function buildFrontendFindings(repoRoot, fileTexts) {
  const findings = []
  const foundationJsText = fileTexts['public/foundation.js'] || ''
  const stylesText = fileTexts['public/styles.css'] || ''
  const assetBudgetSnapshot = await measureFoundationFrontendAssetsFromRepo({
    repoRoot,
    htmlText: fileTexts['public/foundation.html'] || await readText(repoRoot, 'public/foundation.html'),
  })
  const domBudgetSnapshot = await measureFoundationFrontendDomBudgetFromRepo({
    repoRoot,
    htmlText: fileTexts['public/foundation.html'] || await readText(repoRoot, 'public/foundation.html'),
  })
  const assetMetrics = assetBudgetSnapshot.rows.map(row => ({
    path: row.path,
    bytes: row.bytes,
    gzipBytes: row.gzipBytes,
    lines: row.lines,
    status: row.status,
    reason: row.reason,
  }))
  const assetBudgetFindings = assetBudgetSnapshot.findings.filter(item => item.status !== 'healthy')
  if (assetBudgetFindings.length) {
    findings.push(finding({
      id: 'large-uncached-foundation-assets',
      cardId: 'FOUNDATION-FRONTEND-PERF-AUDIT-001',
      severity: assetBudgetFindings.some(item => item.status === 'risk') ? 'P1' : 'P2',
      type: 'performance_risk',
      title: 'Foundation frontend asset budget needs review',
      whyItMatters: 'Every refresh can redownload and reparse the control-panel bundle if asset size or cache posture drifts after frontend splits.',
      refs: [
        makeRef('public/foundation.html', firstLineOf(fileTexts['public/foundation.html'] || '', /foundation\.js|styles\.css/)),
        ...assetBudgetFindings.slice(0, 3).map(item => makeRef(item.path || 'public/foundation.html', 1, item.detail)),
      ],
      proposedCard: FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
      proposedOwner: 'Foundation Frontend',
      detector: `asset budget snapshot status=${assetBudgetSnapshot.status} total=${assetBudgetSnapshot.summary.totalBytes} gzip=${assetBudgetSnapshot.summary.totalGzipBytes}`,
    }))
  }
  if (domBudgetSnapshot.status !== 'healthy') {
    const severity = domBudgetSnapshot.status === 'risk' ? 'P1' : 'P2'
    findings.push(finding({
      id: 'foundation-dom-rebuild-risk',
      cardId: 'FOUNDATION-FRONTEND-PERF-AUDIT-001',
      severity,
      type: 'performance_risk',
      title: 'Foundation frontend has heavy DOM rebuild signals',
      whyItMatters: 'Backlog, source, current-state, and runtime filters can churn large DOM trees on each interaction as card/source counts grow.',
      refs: [
        makeRef('public/foundation.html', firstLineOf(fileTexts['public/foundation.html'] || '', /foundation\.js/)),
        ...domBudgetSnapshot.findings.slice(0, 3).map(item => makeRef(item.path || 'public/foundation.html', 1, item.detail)),
      ],
      proposedCard: FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
      proposedOwner: 'Foundation Frontend',
      detector: `DOM budget snapshot status=${domBudgetSnapshot.status} createElement=${domBudgetSnapshot.summary.totalCreateElementCount} appendChild=${domBudgetSnapshot.summary.totalAppendChildCount} innerHTML=${domBudgetSnapshot.summary.totalInnerHtmlCount}`,
    }))
  }
  if (!/AbortController|activeRoute|routeToken|renderToken/.test(foundationJsText) && /innerHTML\s*=\s*''/.test(foundationJsText)) {
    findings.push(finding({
      id: 'foundation-route-render-race-risk',
      cardId: 'FOUNDATION-FRONTEND-PERF-AUDIT-001',
      severity: 'P1',
      type: 'bug',
      title: 'Async route renders can overwrite the wrong Foundation panel',
      whyItMatters: 'A slow prior route can clear and replace a newer route after fast navigation.',
      refs: [
        makeRef('public/foundation.js', firstLineOf(foundationJsText, /innerHTML\s*=\s*''/)),
      ],
      proposedCard: 'FOUNDATION-FRONTEND-ROUTE-RACE-PROOF-001',
      proposedOwner: 'Foundation Frontend',
      detector: 'route abort/token guard detector',
    }))
  }
  if (/overflow-x:\s*hidden/i.test(stylesText)) {
    findings.push(finding({
      id: 'foundation-overflow-hidden-qa-risk',
      cardId: 'FOUNDATION-FRONTEND-PERF-AUDIT-001',
      severity: 'P3',
      type: 'bug',
      title: 'Global overflow hiding can mask layout failures',
      whyItMatters: 'A missed table wrapper can clip content instead of visibly failing during review.',
      refs: [makeRef('public/styles.css', firstLineOf(stylesText, /overflow-x:\s*hidden/i))],
      proposedCard: 'BROWSER-QA-PROOF-001',
      proposedOwner: 'Frontend QA',
      detector: 'overflow hidden detector',
    }))
  }
  return { findings, assetMetrics, assetBudgetSnapshot, domBudgetSnapshot, routeMatrix: [
    '#current-state',
    '#systems',
    '#backlog',
    '#source-lifecycle',
    '#system-health',
    '#build-log',
    '#overview',
  ] }
}

async function buildMonolithFindings(repoRoot, allFiles, fileTexts) {
  const metrics = []
  for (const file of allFiles.filter(file => repoCodeExtensions.has(path.extname(file)))) {
    if (file.startsWith('docs/_archive/')) continue
    const text = fileTexts[file] || await readText(repoRoot, file)
    if (!text) continue
    const stat = await statFile(repoRoot, file)
    metrics.push({
      path: file,
      lines: text.split(/\r?\n/).length,
      bytes: stat?.size || Buffer.byteLength(text),
    })
  }
  const largestFiles = metrics.sort((left, right) => right.lines - left.lines).slice(0, 12)
  const knownSurfaces = [
    {
      id: 'foundation-verify-monolith',
      path: 'scripts/foundation-verify.mjs',
      pattern: /async function main\(\)|function main\(\)/,
      severity: 'P0',
      title: 'Foundation verifier is one large execution surface',
      proposedCard: 'FOUNDATION-VERIFY-REGISTRY-SPLIT-001',
    },
    {
      id: 'foundation-db-schema-seed-store-monolith',
      path: 'lib/foundation-db.js',
      pattern: /async function initFoundationDb|export async function initFoundationDb/,
      severity: 'P0',
      title: 'Foundation DB mixes schema, seed, stores, and query APIs',
      proposedCard: 'FOUNDATION-DB-SCHEMA-SEED-SPLIT-001',
    },
    {
      id: 'foundation-client-current-state-monolith',
      path: 'public/foundation.js',
      pattern: /function renderCurrentState/,
      severity: 'P1',
      title: 'Foundation client embeds a large current-state renderer',
      proposedCard: 'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001',
    },
    {
      id: 'foundation-hub-route-monolith',
      path: 'server.js',
      pattern: /app\.get\('\/api\/foundation-hub'/,
      severity: 'P1',
      title: 'Foundation Hub route builds many domains in one handler',
      proposedCard: 'FOUNDATION-HUB-PAYLOAD-EXTRACT-001',
    },
    {
      id: 'build-closeout-code-owned-data',
      path: 'lib/foundation-build-log.js',
      pattern: /const closeoutRecords/,
      severity: 'P2',
      title: 'Build closeout history is code-owned data',
      proposedCard: 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001',
    },
  ]
  const findings = knownSurfaces.filter(surface => {
    if (surface.id === 'foundation-verify-monolith' && foundationVerifyRootHasRegistrySplit(fileTexts)) {
      return false
    }
    if (surface.id === 'foundation-db-schema-seed-store-monolith') {
      return surface.pattern.test(fileTexts[surface.path] || '')
    }
    if (surface.id === 'foundation-client-current-state-monolith' && isFoundationClientCurrentStateExtracted({ fileTexts })) {
      return false
    }
    return true
  }).map(surface => {
    const text = fileTexts[surface.path] || ''
    return finding({
      id: surface.id,
      cardId: 'FOUNDATION-MONOLITH-RISK-AUDIT-001',
      severity: surface.severity,
      type: 'refactor_candidate',
      title: surface.title,
      whyItMatters: 'Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.',
      refs: [makeRef(surface.path, firstLineOf(text, surface.pattern))],
      proposedCard: surface.proposedCard,
      proposedOwner: 'Foundation Engineering',
      detector: 'largest file/function ownership detector',
      falsePositiveNote: 'This is not approval to refactor during the audit sprint.',
    })
  })
  return { findings, largestFiles }
}

function buildAssumptionFindings(fileTexts) {
  const approvalThresholdUsage = evaluateApprovalThresholdRegistryUsage({
    registrySource: fileTexts['lib/approval-threshold-registry.js'] || '',
    planCriticSource: fileTexts['lib/process-plan-critic.js'] || '',
    approvalIntegritySource: fileTexts['lib/approval-integrity.js'] || '',
    currentSprintSource: fileTexts['lib/foundation-current-sprint.js'] || '',
    currentSprintStoreSource: fileTexts['lib/foundation-current-sprint-store.js'] || '',
    codeQualityAuditSource: fileTexts['lib/code-quality-nightly-audit.js'] || '',
    processScriptSource: fileTexts['scripts/process-approval-threshold-registry-check.mjs'] || '',
  })
  const findings = []
  if (!approvalThresholdUsage.ok) {
    findings.push(finding({
      id: 'approval-threshold-raw-literal',
      cardId: 'VERIFIER-ASSUMPTION-REGISTRY-001',
      severity: 'P2',
      type: 'drift_risk',
      title: 'Plan Critic approval threshold is not registry-owned across load-bearing checks',
      whyItMatters: 'Approval policy can drift when Plan Critic, approval integrity, Current Sprint, or nightly audit checks keep local threshold logic.',
      refs: approvalThresholdUsage.refs.map(ref => makeRef(ref.path, ref.line, ref.detail)),
      proposedCard: 'APPROVAL-THRESHOLD-REGISTRY-001',
      proposedOwner: 'Plan Critic',
      detector: 'approval threshold registry evaluator',
      falsePositiveNote: 'The registry-owned canonical threshold and historical approval labels are acceptable; load-bearing local threshold logic is not.',
    }))
  }
  const activeVsHistoricalRefs = collectPatternRefs(fileTexts, /activeSprintAtOrPast|historicalCardHasVerifiedCloseout|Current Sprint active blocker advanced/i, { fileFilter: file => file === 'scripts/foundation-verify.mjs', limit: 8 })
  if (activeVsHistoricalRefs.length) {
    findings.push(finding({
      id: 'active-vs-historical-verifier-mixing',
      cardId: 'VERIFIER-ASSUMPTION-REGISTRY-001',
      severity: 'P1',
      type: 'drift_risk',
      title: 'Verifier mixes active sprint assertions with historical closeout proof',
      whyItMatters: 'A current-sprint advancement assertion can pass from a historical closeout unless active and historical helpers are separate.',
      refs: activeVsHistoricalRefs.map(ref => makeRef(ref.path, ref.line, ref.match)),
      proposedCard: 'ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001',
      proposedOwner: 'Foundation Verifier',
      detector: 'active versus historical helper detector',
    }))
  }
  return findings
}

function resolvePackageScript(packageJson, scriptName) {
  const command = packageJson.scripts?.[scriptName] || ''
  const match = command.match(/(scripts\/[a-z0-9-]+\.mjs)/i)
  return match ? match[1] : ''
}

function buildMutationFindings(fileTexts, packageJson) {
  const findings = []
  for (const [relativePath, text] of Object.entries(fileTexts)) {
    if (/^scripts\/process-.*\.mjs$/.test(relativePath) || relativePath === 'scripts/intelligence-action-router-apply.mjs') {
      findings.push(...detectMutationPatternsInText({ relativePath, text }))
    }
  }
  const scheduledMutators = []
  for (const job of getFoundationJobDefinitions()) {
    if (job.runtimeMode !== 'scheduled') continue
    const scriptName = job.command === 'npm' && job.args?.[0] === 'run' ? job.args[1] : ''
    const scriptPath = resolvePackageScript(packageJson, scriptName)
    const text = scriptPath ? fileTexts[scriptPath] || '' : ''
    if (
      detectMutationPatternsInText({ relativePath: scriptPath || scriptName, text }).length &&
      evaluateFoundationJobMutationAllowlist(job).ok !== true
    ) {
      scheduledMutators.push({ jobKey: job.key, scriptName, scriptPath })
    }
  }
  if (scheduledMutators.length) {
    findings.push(finding({
      id: 'scheduled-foundation-job-mutation-risk',
      cardId: 'SPRINT-STATE-MUTATION-AUDIT-001',
      severity: 'P0',
      type: 'drift_risk',
      title: 'Scheduled Foundation jobs target scripts with mutation side effects',
      whyItMatters: 'A scheduled report or verifier lane can reopen old sprints or move backlog state if command targets are not allowlisted.',
      refs: scheduledMutators.map(item => makeRef(item.scriptPath || 'lib/foundation-jobs.js', null, item.jobKey)),
      proposedCard: 'FOUNDATION-JOB-MUTATION-ALLOWLIST-001',
      proposedOwner: 'Foundation Jobs',
      detector: 'scheduled job command mutator detector',
    }))
  }
  const foundationDb = fileTexts['lib/foundation-db.js'] || ''
  if (/const status = String\(sprintInput\.status \|\| 'active'\)/.test(foundationDb)) {
    findings.push(finding({
      id: 'current-sprint-upsert-active-default',
      cardId: 'SPRINT-STATE-MUTATION-AUDIT-001',
      severity: 'P0',
      type: 'drift_risk',
      title: 'Current Sprint upsert helper defaults to active and closes other active sprints',
      whyItMatters: 'A proof/check script can accidentally become the active sprint writer unless active writes require explicit confirmation.',
      refs: [
        makeRef('lib/foundation-db.js', firstLineOf(foundationDb, /const status = String\(sprintInput\.status \|\| 'active'\)/)),
        makeRef('lib/foundation-db.js', firstLineOf(foundationDb, /WHERE status = 'active'/)),
      ],
      proposedCard: 'SPRINT-MUTATION-SAFE-MODE-001',
      proposedOwner: 'Foundation Process',
      detector: 'active sprint default detector',
    }))
  }
  if (/export async function initFoundationDb/.test(foundationDb) && /UPDATE backlog_items|INSERT INTO backlog_items/.test(foundationDb)) {
    findings.push(finding({
      id: 'init-foundation-db-seed-mutation-risk',
      cardId: 'SPRINT-STATE-MUTATION-AUDIT-001',
      severity: 'P1',
      type: 'drift_risk',
      title: 'Read/report paths can call seed-mutating DB initialization',
      whyItMatters: 'Read-only audit commands need schema-readiness checks that do not silently sync seed rows.',
      refs: [makeRef('lib/foundation-db.js', firstLineOf(foundationDb, /export async function initFoundationDb/))],
      proposedCard: 'DB-SEED-001',
      proposedOwner: 'Foundation DB',
      detector: 'initFoundationDb seed mutation detector',
    }))
  }
  return findings
}

export function buildSyntheticCodeQualityNightlyAuditProof() {
  const hardcoded = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/live-truth.js',
    text: `
      const EXPECTED_SOURCE_COUNT = 35
      const currentSummary = 'Latest live checkpoint: 14/14 tables and 5/5 RPCs are passing on 2026-04-26'
    `,
  })
  const activeCurrentSprint = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/active-sprint.js',
    text: `const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'`,
  })
  const historicalCurrentSprint = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/historical-sprint.js',
    text: `
      // liveTruthPosture: historical_closeout_only - closed sprint proof fixture.
      const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
    `,
  })
  const bootstrapCurrentSprint = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/bootstrap-sprint.js',
    text: `
      // liveTruthPosture: bootstrap_default_only - default fallback fixture.
      const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12'
    `,
  })
  const slowEndpoint = classifyEndpointMetric({
    ok: true,
    durationMs: 2500,
    payloadBytes: 2_000_000,
    timeoutMs: 5000,
  })
  const timeoutEndpoint = classifyEndpointMetric({
    ok: false,
    timeout: true,
    timeoutMs: 5000,
  })
  const mutator = detectMutationPatternsInText({
    relativePath: 'synthetic/process-check.mjs',
    text: `await updateBacklogItem('CARD-001', { lane: 'done' })`,
  })
  const guardedMutator = detectMutationPatternsInText({
    relativePath: 'scripts/process-safe-check.mjs',
    text: `
      import { PROCESS_CHECK_WRITE_FLAGS, assertProcessCheckWriteAllowed, isProcessCheckWriteRequested } from '../lib/process-write-guard.js'
      assertProcessCheckWriteAllowed({ argv: process.argv.slice(2), scriptPath: 'scripts/process-safe-check.mjs', operation: 'synthetic update', allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })
      if (isProcessCheckWriteRequested({ argv: process.argv.slice(2), allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })) await updateBacklogItem('CARD-001', { lane: 'done' })
    `,
  })
  return {
    ok: hardcoded.length >= 2 &&
      activeCurrentSprint.some(finding => finding.id === 'hardcoded-current-sprint-truth' && finding.severity === 'P0') &&
      historicalCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      bootstrapCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      slowEndpoint.status === 'risk' &&
      timeoutEndpoint.severity === 'P0' &&
      mutator.length === 1 &&
      guardedMutator.length === 0,
    hardcodedCount: hardcoded.length,
    activeCurrentSprintCount: activeCurrentSprint.length,
    historicalCurrentSprintCount: historicalCurrentSprint.length,
    bootstrapCurrentSprintCount: bootstrapCurrentSprint.length,
    slowEndpoint,
    timeoutEndpoint,
    mutatorCount: mutator.length,
    guardedMutatorCount: guardedMutator.length,
  }
}

export async function buildCodeQualityNightlyAudit({
  repoRoot = process.cwd(),
  baseUrl = 'http://localhost:3000',
  timeoutMs = 5000,
  skipEndpointFetch = false,
} = {}) {
  const allFiles = await listFiles(repoRoot)
  const scanTargets = unique([
    'server.js',
    'package.json',
    'lib/foundation-db.js',
    'lib/foundation-current-sprint.js',
    'lib/foundation-current-sprint-store.js',
    'lib/foundation-jobs.js',
    'lib/admin-deal-policy-source-contract.js',
    'lib/approval-threshold-registry.js',
    'lib/build-intel-snapshot-baseline.js',
    'lib/approval-integrity.js',
    'lib/process-plan-critic.js',
    'lib/code-quality-nightly-audit.js',
    'lib/foundation-build-log.js',
    'lib/foundation-build-log-api-cache.js',
    'lib/foundation-intelligence-audit-verifier.js',
    'lib/foundation-operator-routes.js',
    'lib/foundation-verify-registry-split.js',
    'lib/foundation-verifier-structural-assurance-core.js',
    'lib/source-lifecycle.js',
    'lib/source-lifecycle-completion.js',
    'lib/foundation-ui-complete.js',
    'lib/kpi-health.js',
    'lib/gstack-build-intel.js',
    'lib/marketing-avatar-registry.js',
    'docs/source-notes/github-build-intel.md',
    'scripts/foundation-verify.mjs',
    'scripts/intelligence-action-router-apply.mjs',
    'scripts/review-admin-deals.mjs',
    'public/foundation.js',
    'public/foundation-operations-renderers.js',
    'public/foundation-current-state-renderers.js',
    'public/styles.css',
    'public/foundation.html',
    'public/ops.js',
    ...allFiles.filter(file => /^scripts\/process-.*\.mjs$/.test(file)),
  ]).filter(file => allFiles.includes(file) || ['server.js', 'package.json'].includes(file))
  const fileTexts = await readScanFiles(repoRoot, scanTargets)
  const packageJson = JSON.parse(fileTexts['package.json'] || '{}')

  const endpointMetrics = await buildEndpointMetrics({ baseUrl, timeoutMs, skipEndpointFetch })
  const frontend = await buildFrontendFindings(repoRoot, fileTexts)
  const monolith = await buildMonolithFindings(repoRoot, allFiles, fileTexts)
  const syntheticProof = buildSyntheticCodeQualityNightlyAuditProof()
  const findings = sortFindings([
    ...buildHardcodedTruthFindings(fileTexts),
    ...buildApiStaticFindings(fileTexts),
    ...endpointMetrics
      .filter(metric => metric.risk && ['risk', 'warning'].includes(metric.risk.status))
      .map(metric => finding({
        id: `endpoint-${metric.endpoint.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-${metric.risk.status}`,
        cardId: 'FOUNDATION-API-PERF-AUDIT-001',
        severity: metric.risk.severity,
        type: 'performance_risk',
        title: `${metric.endpoint} ${metric.risk.status}: ${metric.risk.reason}`,
        whyItMatters: 'Endpoint timing and payload budgets keep Foundation surfaces usable before code quality issues become operator drag.',
        refs: [makeRef('server.js', null, metric.endpoint)],
        proposedCard: 'FOUNDATION-ENDPOINT-BUDGETS-001',
        proposedOwner: 'Foundation API',
        detector: 'live endpoint timing and payload measurement',
      })),
    ...frontend.findings,
    ...monolith.findings,
    ...buildAssumptionFindings(fileTexts),
    ...buildMutationFindings(fileTexts, packageJson),
  ])

  const proposedCards = unique(findings.map(item => item.proposedCard))
  return {
    status: 'report_ready',
    generatedAt: new Date().toISOString(),
    closeoutKey: CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    sprintId: CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID,
    cardIds: CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
    reportPath: CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
    reportOnly: true,
    writesBacklog: false,
    mutatesDb: false,
    autoFixes: false,
    autonomousDev: false,
    llmDetectionUsed: false,
    endpointMetrics,
    assetMetrics: frontend.assetMetrics,
    assetBudgetSnapshot: frontend.assetBudgetSnapshot,
    domBudgetSnapshot: frontend.domBudgetSnapshot,
    routeMatrix: frontend.routeMatrix,
    largestFiles: monolith.largestFiles,
    findings,
    proposedCards,
    syntheticProof,
    summary: {
      findingCount: findings.length,
      p0: findings.filter(item => item.severity === 'P0').length,
      p1: findings.filter(item => item.severity === 'P1').length,
      p2: findings.filter(item => item.severity === 'P2').length,
      p3: findings.filter(item => item.severity === 'P3').length,
      proposedCardCount: proposedCards.length,
      endpointsMeasured: endpointMetrics.filter(metric => !metric.skipped).length,
      staticReportOnly: true,
    },
  }
}

function renderEndpointMetric(metric) {
  if (metric.skipped) return `- ${metric.endpoint}: skipped (${metric.reason})`
  return `- ${metric.endpoint}: status=${metric.status || 'n/a'} latency=${Math.round(metric.durationMs || 0)}ms payload=${metric.payloadBytes || 0}B risk=${metric.risk?.status || 'unknown'} (${metric.risk?.reason || 'n/a'})`
}

function renderFinding(finding) {
  return [
    `### ${finding.severity} ${finding.title}`,
    '',
    `- Card lane: \`${finding.cardId}\``,
    `- Type: \`${finding.type}\``,
    `- Evidence: ${formatRefs(finding.refs)}`,
    `- Why it matters: ${finding.whyItMatters}`,
    `- Proposed owner/card: ${finding.proposedOwner} / \`${finding.proposedCard}\``,
    `- Detector: ${finding.detector}`,
    finding.falsePositiveNote ? `- False-positive note: ${finding.falsePositiveNote}` : '',
  ].filter(Boolean).join('\n')
}

export function renderCodeQualityNightlyAuditReport(audit = {}) {
  const findings = Array.isArray(audit.findings) ? audit.findings : []
  const topFindings = findings.slice(0, 18)
  const cardGroups = CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.map(cardId => ({
    cardId,
    findings: findings.filter(item => item.cardId === cardId),
  }))
  const proposedCards = Array.isArray(audit.proposedCards) ? audit.proposedCards : []
  const largestFiles = Array.isArray(audit.largestFiles) ? audit.largestFiles : []
  const assetMetrics = Array.isArray(audit.assetMetrics) ? audit.assetMetrics : []
  const domBudget = audit.domBudgetSnapshot || null
  const endpointMetrics = Array.isArray(audit.endpointMetrics) ? audit.endpointMetrics : []

  return `# Code Quality Nightly Audit Report - 2026-05-13

Closeout key: \`${audit.closeoutKey || CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY}\`
Sprint: \`${audit.sprintId || CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID}\`
Generated at: \`${audit.generatedAt || ''}\`

## Morning Read

- Status: \`${audit.status || 'unknown'}\`
- Findings: ${audit.summary?.findingCount || findings.length} total (${audit.summary?.p0 || 0} P0, ${audit.summary?.p1 || 0} P1, ${audit.summary?.p2 || 0} P2, ${audit.summary?.p3 || 0} P3)
- Proposed backlog fixes: ${proposedCards.length}
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: ${audit.syntheticProof?.ok ? 'passed' : 'failed'} (hardcoded=${audit.syntheticProof?.hardcodedCount || 0}, mutator=${audit.syntheticProof?.mutatorCount || 0}, slowEndpoint=${audit.syntheticProof?.slowEndpoint?.status || 'missing'})

## Endpoint Coverage

${endpointMetrics.map(renderEndpointMetric).join('\n')}

## Asset And Monolith Metrics

Assets:
${assetMetrics.map(item => `- ${item.path}: ${item.bytes}B raw, ${item.gzipBytes}B gzip, ${item.lines} lines`).join('\n')}

DOM budget:
${domBudget ? `- status=${domBudget.status}, scripts=${domBudget.summary?.scriptCount || 0}, createElement=${domBudget.summary?.totalCreateElementCount || 0}, appendChild=${domBudget.summary?.totalAppendChildCount || 0}, innerHTML=${domBudget.summary?.totalInnerHtmlCount || 0}` : '- missing'}

Largest files:
${largestFiles.slice(0, 8).map(item => `- ${item.path}: ${item.lines} LOC, ${item.bytes}B`).join('\n')}

## Top Findings

${topFindings.map(renderFinding).join('\n\n')}

## Findings By Sprint Card

${cardGroups.map(group => `- \`${group.cardId}\`: ${group.findings.length} finding${group.findings.length === 1 ? '' : 's'}`).join('\n')}

## Proposed Backlog Fixes

${proposedCards.map(card => `- \`${card}\``).join('\n')}

## Browser QA Route Matrix Proposal

${(audit.routeMatrix || []).map(route => `- \`${route}\`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.`).join('\n')}

## False-Positive Handling

- Historical closeout text is acceptable when clearly labeled as history.
- Fixed inspected commits are acceptable when labeled snapshot evidence with as-of date.
- Policy dates are acceptable when tied to an owner/source contract.
- Closeout scripts may mutate state only when run as explicit apply/ship actions, not as nightly audit dependencies.

## Not Applied

This report did not edit source files, move backlog cards, open or close sprints, run mutating process checks, apply Action Router routes, schedule jobs, or call any LLM to detect findings.
`
}
