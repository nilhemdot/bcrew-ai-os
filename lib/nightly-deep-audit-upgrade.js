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
import { getFoundationBuildCloseouts } from './foundation-build-log.js'
import { isVerifiedCloseout } from './foundation-verifier-sprint-proof.js'
import { classifyProcessCheckSource } from './process-check-readonly-mode.js'
import { LLM_AUTH_PATHS, LLM_WORKLOADS, callLlm, planLlmRoute } from './llm-router.js'
import {
  DEEP_AUDIT_FINDING_ROUTES,
  routeDeepAuditFinding,
} from './deep-audit-findings-closure-gate.js'
export {
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_APPROVAL_PATH,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CARD_ID,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CLOSEOUT_KEY,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CLOSEOUT_PATH,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_PLAN_PATH,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH,
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
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CARD_ID,
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

function summarizeFindings(findings = []) {
  const normalized = Array.isArray(findings) ? findings : []
  return {
    findingCount: normalized.length,
    p0: normalized.filter(item => item.severity === 'P0').length,
    p1: normalized.filter(item => item.severity === 'P1').length,
    p2: normalized.filter(item => item.severity === 'P2').length,
    p3: normalized.filter(item => item.severity === 'P3').length,
    proposedCardCount: unique(normalized.map(item => item.proposedCard)).length,
  }
}

function closeoutKey(closeout = {}) {
  return normalizePath(closeout.key || closeout.closeoutKey || closeout.closeout_key)
}

function closeoutBacklogIds(closeout = {}) {
  return unique(closeout.backlogIds || closeout.backlog_ids || [])
}

function findVerifiedCloseoutByKey(closeouts = [], key = '') {
  const normalizedKey = normalizePath(key)
  if (!normalizedKey) return null
  return (closeouts || []).find(closeout =>
    closeoutKey(closeout) === normalizedKey &&
      isVerifiedCloseout(closeout)
  ) || null
}

function findVerifiedCloseoutForCard(closeouts = [], cardId = '') {
  const normalizedCardId = normalizePath(cardId).toUpperCase()
  if (!normalizedCardId) return null
  return (closeouts || []).find(closeout =>
    isVerifiedCloseout(closeout) &&
      closeoutBacklogIds(closeout).map(id => id.toUpperCase()).includes(normalizedCardId)
  ) || null
}

function routeHasVerifiedCloseout(route = {}, closeouts = []) {
  if (!route || route.routeStatus !== 'done') return null
  const targetCloseout = findVerifiedCloseoutByKey(closeouts, route.targetCloseoutKey)
  if (targetCloseout) return targetCloseout
  return findVerifiedCloseoutByKey(closeouts, route.coveredByCloseoutKey)
}

function isGuardedProcessCheckSeniorReviewRepeat(finding = {}, target = {}) {
  const processCheck = target?.processCheck || null
  if (processCheck?.protected !== true) return false
  const text = [
    finding.title,
    finding.whyItMatters,
    finding.nextAction,
    finding.proposedCard,
  ].filter(Boolean).join(' ')
  const mutationClaim = /(write|mutat|upsert|update|insert|delete|current sprint|sprint overlay|live state|live truth|backlog|foundation_sprint)/i.test(text)
  const checkClaim = /(process[- ]?check|check path|verification path|read[- ]?only|readonly|no[- ]?flag|without flag|guard|guarded)/i.test(text)
  const explicitGuardBypass = /(unguarded|missing guard|without guard|not guarded|no guard|outside (?:the )?guard|bypass|does not call assertProcessCheckWriteAllowed)/i.test(text)
  return mutationClaim && checkClaim && !explicitGuardBypass
}

export function reconcileDeterministicAuditFindings({
  findings = [],
  closeouts = getFoundationBuildCloseouts(),
} = {}) {
  const activeFindings = []
  const reconciledFindings = []

  for (const finding of Array.isArray(findings) ? findings : []) {
    const route = routeDeepAuditFinding(finding, DEEP_AUDIT_FINDING_ROUTES)
    const closeout = routeHasVerifiedCloseout(route, closeouts)
    if (route && closeout) {
      reconciledFindings.push({
        ...finding,
        reconciliationStatus: 'reconciled_closed_route',
        reconciliationReason: `covered by ${route.targetCloseoutKey || route.coveredByCloseoutKey}`,
        route: {
          findingId: route.findingId,
          targetCardId: route.targetCardId,
          targetCloseoutKey: route.targetCloseoutKey || null,
          coveredByCardId: route.coveredByCardId || null,
          coveredByCloseoutKey: route.coveredByCloseoutKey || null,
          owner: route.owner || null,
        },
        closeout: {
          key: closeoutKey(closeout),
          status: closeout.status || null,
          acceptanceState: closeout.acceptanceState || null,
        },
      })
    } else {
      activeFindings.push(finding)
    }
  }

  return {
    status: activeFindings.length ? 'active_findings_present' : 'clean',
    summary: {
      rawFindingCount: (Array.isArray(findings) ? findings : []).length,
      activeFindingCount: activeFindings.length,
      reconciledClosedFindingCount: reconciledFindings.length,
      activeP0: activeFindings.filter(item => item.severity === 'P0').length,
      activeP1: activeFindings.filter(item => item.severity === 'P1').length,
      activeP2: activeFindings.filter(item => item.severity === 'P2').length,
      activeP3: activeFindings.filter(item => item.severity === 'P3').length,
    },
    activeFindings,
    reconciledFindings,
  }
}

function applyDeterministicAuditReconciliation(audit = {}, reconciliation = {}) {
  const activeFindings = reconciliation.activeFindings || []
  return {
    ...audit,
    rawFindings: audit.findings || [],
    findings: activeFindings,
    proposedCards: unique(activeFindings.map(item => item.proposedCard)),
    summary: {
      ...(audit.summary || {}),
      ...summarizeFindings(activeFindings),
      endpointsMeasured: audit.summary?.endpointsMeasured || 0,
      staticReportOnly: audit.summary?.staticReportOnly === true,
      rawFindingCount: reconciliation.summary?.rawFindingCount || 0,
      reconciledClosedFindingCount: reconciliation.summary?.reconciledClosedFindingCount || 0,
    },
    findingReconciliation: reconciliation,
  }
}

export function reconcileSeniorReviewFindings({
  findings = [],
  closeouts = getFoundationBuildCloseouts(),
  reviewTargets = [],
} = {}) {
  const activeFindings = []
  const reconciledFindings = []
  const targetsByPath = new Map((Array.isArray(reviewTargets) ? reviewTargets : [])
    .map(target => [normalizePath(target.file), target]))

  for (const finding of Array.isArray(findings) ? findings : []) {
    const proposedCard = normalizePath(finding.proposedCard || '').toUpperCase()
    const closeout = findVerifiedCloseoutForCard(closeouts, proposedCard)
    if (closeout) {
      reconciledFindings.push({
        ...finding,
        reconciliationStatus: 'reconciled_verified_closeout',
        reconciliationReason: `proposed card ${proposedCard} already has verified closeout ${closeoutKey(closeout)}`,
        closeout: {
          key: closeoutKey(closeout),
          status: closeout.status || null,
          acceptanceState: closeout.acceptanceState || null,
        },
      })
    } else {
      const target = targetsByPath.get(normalizePath(finding.path))
      if (isGuardedProcessCheckSeniorReviewRepeat(finding, target)) {
        reconciledFindings.push({
          ...finding,
          reconciliationStatus: 'reconciled_guarded_process_check',
          reconciliationReason: `process-check classifier marks ${target.file} as protected (${target.processCheck.classification})`,
          processCheck: {
            classification: target.processCheck.classification,
            liveMutators: target.processCheck.liveMutators || [],
            reason: target.processCheck.reason || null,
          },
        })
      } else {
        activeFindings.push(finding)
      }
    }
  }

  return {
    status: activeFindings.length ? 'active_findings_present' : 'clean',
    summary: {
      rawFindingCount: (Array.isArray(findings) ? findings : []).length,
      activeFindingCount: activeFindings.length,
      reconciledClosedFindingCount: reconciledFindings.length,
    },
    activeFindings,
    reconciledFindings,
  }
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
    const processCheck = /^scripts\/process-.*-check\.mjs$/.test(normalizePath(file))
      ? classifyProcessCheckSource({
          relativePath: file,
          source,
          backlogWriteBoundaryGuarded: true,
        })
      : null
    if (!risk.reasons.length && targets.length >= 12) continue
    targets.push({
      file,
      severity: risk.severity,
      reasons: risk.reasons,
      lines,
      bytes: stat?.size || Buffer.byteLength(source),
      processCheck,
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
    const plan = await planLlmRoute({ workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, hubKey: 'foundation' })
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

function buildSeniorReviewPrompt({ deterministicAudit = {}, reviewTargets = [], diff = {}, findingReconciliation = {} } = {}) {
  const summary = deterministicAudit.summary || {}
  const topFindings = (deterministicAudit.findings || []).slice(0, 12).map(finding => ({
    id: finding.id,
    severity: finding.severity,
    title: finding.title,
    refs: finding.refs,
    proposedCard: finding.proposedCard,
  }))
  const targets = reviewTargets.slice(0, 8).map(target => ({
    file: target.file,
    severity: target.severity,
    reasons: target.reasons,
    lines: target.lines,
    bytes: target.bytes,
    processCheck: target.processCheck ? {
      classification: target.processCheck.classification,
      protected: target.processCheck.protected === true,
      reason: target.processCheck.reason,
      liveMutators: target.processCheck.liveMutators || [],
    } : null,
    excerpt: target.excerpt,
  }))
  const reconciledRoutes = (findingReconciliation.reconciledFindings || []).slice(0, 20).map(finding => ({
    id: finding.id,
    severity: finding.severity,
    title: finding.title,
    proposedCard: finding.proposedCard,
    closeoutKey: finding.closeout?.key || finding.route?.targetCloseoutKey || finding.route?.coveredByCloseoutKey || null,
  }))
  return [
    'You are the BCrew Foundation senior deep auditor.',
    'Review the changed/high-risk code packets below. Find concrete bugs, false-green risks, write-boundary leaks, frontend rot, endpoint/payload risks, privacy/source-boundary risks, and simplification opportunities.',
    'Do not re-report known audit findings that are listed as reconciled by verified closeout unless you can point to fresh regression evidence and propose a new continuation card, not the already-closed card.',
    'When a review packet includes processCheck.protected=true, do not report its guarded mutator as an active read-only/write-boundary finding unless you identify a concrete unguarded bypass path in the excerpt.',
    'Do not invent findings. Every finding needs a file path, line if visible, severity, why it matters, owner, next action, and proposed repair card when P0/P1.',
    'Return only JSON with this shape: {"summary":"...","findings":[{"severity":"P0|P1|P2|P3","title":"...","path":"...","line":1,"whyItMatters":"...","owner":"...","nextAction":"...","proposedCard":"CARD-ID","confidence":"high|medium|low"}],"reviewedFiles":["..."]}.',
    '',
    `Deterministic summary: ${JSON.stringify(summary)}`,
    `Diff summary: ${JSON.stringify(diff)}`,
    `Top deterministic findings: ${JSON.stringify(topFindings)}`,
    `Reconciled closed audit routes: ${JSON.stringify(reconciledRoutes)}`,
    '',
    `Review packets: ${JSON.stringify(targets)}`,
  ].join('\n')
}

function parseJsonObject(text = '') {
  const value = String(text || '').trim()
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {}
  const first = value.indexOf('{')
  const last = value.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(value.slice(first, last + 1))
    } catch {}
  }
  return null
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function isOpenClawSessionLockError(error) {
  return /openclaw/i.test(errorMessage(error)) && /session file locked/i.test(errorMessage(error))
}

function normalizeSeniorReviewFinding(finding = {}, index = 0) {
  const severity = ['P0', 'P1', 'P2', 'P3'].includes(String(finding.severity || '').toUpperCase())
    ? String(finding.severity).toUpperCase()
    : 'P2'
  const pathValue = normalizePath(finding.path || finding.file || finding.refs?.[0]?.path)
  return {
    id: normalizePath(finding.id || `senior-review-${index + 1}`).replace(/[^a-z0-9/_-]/gi, '-').toLowerCase(),
    severity,
    title: String(finding.title || 'Untitled senior review finding').trim(),
    path: pathValue,
    line: Number.isFinite(Number(finding.line)) ? Number(finding.line) : null,
    whyItMatters: String(finding.whyItMatters || finding.why || '').trim(),
    owner: String(finding.owner || 'Foundation Builder').trim(),
    nextAction: String(finding.nextAction || '').trim(),
    proposedCard: String(finding.proposedCard || '').trim().toUpperCase(),
    confidence: String(finding.confidence || 'medium').trim(),
  }
}

export function buildSeniorReviewActionRoutes(findings = []) {
  return (Array.isArray(findings) ? findings : []).map((finding, index) => {
    const normalized = normalizeSeniorReviewFinding(finding, index)
    const actionable = ['P0', 'P1'].includes(normalized.severity)
    const routed = !actionable || Boolean(normalized.proposedCard && normalized.owner && normalized.nextAction)
    return {
      ...normalized,
      actionable,
      routed,
      route: actionable
        ? (routed ? 'proposed_repair_card' : 'missing_repair_route')
        : 'watch_or_review',
    }
  })
}

export function classifyDeepSeniorReviewRollup(review = {}) {
  if (review.executedThisRun === true && review.status === 'executed') {
    const reconciledCount = review.findingReconciliation?.summary?.reconciledClosedFindingCount || review.reconciledFindings?.length || 0
    return {
      status: 'healthy',
      executed: true,
      detail: `deep senior review executed with ${review.findingCount || 0} active finding(s) and ${reconciledCount} reconciled closed finding(s)`,
    }
  }
  return {
    status: 'degraded',
    executed: false,
    detail: review.note || review.status || 'deep senior review did not execute',
  }
}

export async function buildNightlyDeepAuditSeniorReview({
  deterministicAudit = {},
  reviewTargets = [],
  diff = {},
  runLlmReview = false,
  maxOutputTokens = 1800,
  timeoutMs = 180000,
  findingReconciliation = {},
} = {}) {
  const route = await resolveLlmReviewRoute()
  const prompt = buildSeniorReviewPrompt({ deterministicAudit, reviewTargets, diff, findingReconciliation })
  const packets = reviewTargets.slice(0, 8).map(target => ({
    file: target.file,
    severity: target.severity,
    reasons: target.reasons,
    lines: target.lines,
    bytes: target.bytes,
  }))

  if (!runLlmReview) {
    return {
      status: 'degraded_packet_only',
      mode: 'packet_only_explicitly_degraded',
      executedThisRun: false,
      providerReviewRequested: false,
      route,
      findingCount: 0,
      findings: [],
      actionRoutes: [],
      packets,
      note: 'Deep senior review did not execute. This run produced review packets only; do not present it as a completed deep code review.',
    }
  }

  if (!route.runnable) {
    return {
      status: 'degraded_route_blocked',
      mode: 'approved_route_required_but_blocked',
      executedThisRun: false,
      providerReviewRequested: true,
      route,
      findingCount: 0,
      findings: [],
      actionRoutes: [],
      packets,
      note: `Deep senior review was requested but no approved runnable route was available: ${route.blockReason || 'unknown route blocker'}.`,
    }
  }

  async function executeSeniorReviewCall({ provider, authPath, retryReason } = {}) {
    const result = await callLlm({
      workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
      hubKey: 'foundation',
      provider,
      authPath,
      inputText: prompt,
      responseFormat: { type: 'json_object' },
      maxOutputTokens,
      dryRun: false,
      metadata: {
        cardId: FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CARD_ID,
        auditKind: 'nightly_deep_audit_senior_review',
        timeoutMs,
        retryReason: retryReason || null,
      },
    })
    const parsed = parseJsonObject(result.outputText) || {}
    const rawFindings = buildSeniorReviewActionRoutes(Array.isArray(parsed.findings) ? parsed.findings : [])
    const findingReconciliation = reconcileSeniorReviewFindings({ findings: rawFindings, reviewTargets })
    const findings = findingReconciliation.activeFindings
    return {
      status: 'executed',
      mode: 'bounded_senior_review_executed',
      executedThisRun: true,
      providerReviewRequested: true,
      route: {
        ...route,
        selectedRoute: result.routeKey || route.selectedRoute,
        provider: result.provider || route.provider,
        model: result.model || route.model,
      },
      callId: result.call?.callId || null,
      summary: String(parsed.summary || '').trim(),
      reviewedFiles: Array.isArray(parsed.reviewedFiles) ? parsed.reviewedFiles.map(normalizePath).filter(Boolean) : packets.map(packet => packet.file),
      findingCount: findings.length,
      findings,
      rawFindingCount: rawFindings.length,
      rawFindings,
      reconciledFindings: findingReconciliation.reconciledFindings,
      findingReconciliation,
      actionRoutes: findings,
      packets,
      note: retryReason
        ? `Deep senior review executed through approved fallback route after ${retryReason}.`
        : 'Deep senior review executed through the approved router with report-only/no-autofix posture.',
    }
  }

  try {
    return await executeSeniorReviewCall()
  } catch (error) {
    if (isOpenClawSessionLockError(error)) {
      try {
        return await executeSeniorReviewCall({
          provider: 'openai',
          authPath: LLM_AUTH_PATHS.API_DIRECT,
          retryReason: 'OpenClaw session lock',
        })
      } catch (fallbackError) {
        return {
          status: 'degraded_review_failed',
          mode: 'requested_review_failed_closed',
          executedThisRun: false,
          providerReviewRequested: true,
          route,
          findingCount: 0,
          findings: [],
          actionRoutes: [],
          packets,
          errorMessage: `${errorMessage(error)}; approved fallback failed: ${errorMessage(fallbackError)}`,
          note: 'Deep senior review was requested but failed closed. The report is degraded and must not be presented as a clean deep review.',
        }
      }
    }
    return {
      status: 'degraded_review_failed',
      mode: 'requested_review_failed_closed',
      executedThisRun: false,
      providerReviewRequested: true,
      route,
      findingCount: 0,
      findings: [],
      actionRoutes: [],
      packets,
      errorMessage: errorMessage(error),
      note: 'Deep senior review was requested but failed closed. The report is degraded and must not be presented as a clean deep review.',
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
  runLlmReview = process.env.NIGHTLY_DEEP_AUDIT_RUN_LLM === 'true',
  now = new Date(),
} = {}) {
  const reportPath = getNightlyDeepAuditReportPath(now)
  const jsonPath = getNightlyDeepAuditJsonPath(now)
  const changedFiles = await listChangedFiles(repoRoot, changedSinceRef)
  const rawDeterministicAudit = await buildCodeQualityNightlyAudit({
    repoRoot,
    baseUrl,
    timeoutMs,
    skipEndpointFetch,
  })
  const deterministicFindingReconciliation = reconcileDeterministicAuditFindings({
    findings: rawDeterministicAudit.findings || [],
  })
  const deterministicAudit = applyDeterministicAuditReconciliation(rawDeterministicAudit, deterministicFindingReconciliation)
  const reviewTargets = await buildReviewTargets({ repoRoot, audit: rawDeterministicAudit, changedFiles })
  const knownFailureDogfood = buildNightlyDeepAuditKnownFailureFixtures()
  const previous = await loadPreviousJsonReport(repoRoot, jsonPath)
  const diff = buildDiffSummary({ audit: deterministicAudit, previous })
  const llmReview = await buildNightlyDeepAuditSeniorReview({
    deterministicAudit,
    reviewTargets,
    diff,
    runLlmReview,
    findingReconciliation: deterministicFindingReconciliation,
  })
  const docArtifactBloat = await buildDocArtifactBloatSnapshot({ repoRoot, now })
  return {
    status: llmReview.executedThisRun ? 'deep_review_executed' : 'deep_review_degraded',
    generatedAt: now.toISOString(),
    cardId: NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
    closeoutKey: NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    autonomousDev: false,
    autoCreatesBacklog: false,
    rawDeterministicAudit,
    deterministicAudit,
    deterministicFindingReconciliation,
    changedFiles,
    reviewTargets,
    llmReview,
    deepSeniorReviewRollup: classifyDeepSeniorReviewRollup(llmReview),
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
  const reconciliation = audit.deterministicFindingReconciliation || deterministic.findingReconciliation || {}
  const reconciledDeterministicFindings = reconciliation.reconciledFindings || []
  const reconciledSeniorFindings = audit.llmReview?.reconciledFindings || []
  const endpointMetrics = deterministic.endpointMetrics || []
  const largestFiles = deterministic.largestFiles || []

  return `# Nightly Deep Audit Report - ${formatDateInTimezone(new Date(audit.generatedAt || Date.now()))}

Closeout key: \`${audit.closeoutKey || NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY}\`
Generated at: \`${audit.generatedAt || ''}\`
Report path: \`${audit.reportPath || ''}\`

## Morning Read

- Status: \`${audit.status || 'unknown'}\`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: ${deterministic.summary?.findingCount || findings.length} total (${deterministic.summary?.p0 || 0} P0, ${deterministic.summary?.p1 || 0} P1, ${deterministic.summary?.p2 || 0} P2, ${deterministic.summary?.p3 || 0} P3)
- Closed detector signals reconciled out of active audit: ${reconciliation.summary?.reconciledClosedFindingCount || 0} of ${reconciliation.summary?.rawFindingCount || deterministic.summary?.rawFindingCount || findings.length}
- Changed files selected: ${audit.changedFiles?.length || 0}
- High-risk review targets: ${audit.reviewTargets?.length || 0}
- LLM review mode: \`${audit.llmReview?.mode || 'unknown'}\`
- Deep senior review rollup: \`${audit.deepSeniorReviewRollup?.status || 'unknown'}\` (${audit.deepSeniorReviewRollup?.detail || 'no detail'})
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
- Active finding count: ${audit.llmReview?.findingCount || 0}
- Closed senior-review repeats reconciled out: ${reconciledSeniorFindings.length}
- Note: ${audit.llmReview?.note || ''}

${audit.llmReview?.executedThisRun ? 'Deep senior review executed through the approved router.' : 'Deep senior review did not execute. Packet-only output is degraded and must not be called a completed deep code review.'}

## Senior Review Findings

${(audit.llmReview?.findings || []).map(finding => `- ${finding.severity} ${finding.title} (${finding.path || 'no-path'}${finding.line ? `:${finding.line}` : ''}) -> ${finding.proposedCard || finding.route || 'no-route'}; owner=${finding.owner || 'missing'}; next=${finding.nextAction || 'missing'}`).join('\n') || '- none'}

## Reconciled Closed Audit Signals

${reconciledDeterministicFindings.length || reconciledSeniorFindings.length
    ? [
        `- Deterministic detector signals reconciled: ${reconciledDeterministicFindings.length}`,
        `- Senior-review repeats reconciled: ${reconciledSeniorFindings.length}`,
        ...reconciledDeterministicFindings.slice(0, 8).map(finding => `- ${finding.severity || 'P?'} ${finding.id}: covered by \`${finding.closeout?.key || finding.route?.targetCloseoutKey || finding.route?.coveredByCloseoutKey || 'verified closeout'}\``),
      ].join('\n')
    : '- none'}

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
    rawSummary: audit.rawDeterministicAudit?.summary || {},
    endpointMetrics: audit.deterministicAudit?.endpointMetrics || [],
    findings: audit.deterministicAudit?.findings || [],
    rawFindings: audit.rawDeterministicAudit?.findings || audit.deterministicAudit?.rawFindings || [],
    deterministicFindingReconciliation: audit.deterministicFindingReconciliation || audit.deterministicAudit?.findingReconciliation || null,
    reviewTargets: audit.reviewTargets?.map(target => ({
      file: target.file,
      severity: target.severity,
      reasons: target.reasons,
      lines: target.lines,
      bytes: target.bytes,
      processCheck: target.processCheck ? {
        classification: target.processCheck.classification,
        protected: target.processCheck.protected === true,
        reason: target.processCheck.reason,
        liveMutators: target.processCheck.liveMutators || [],
      } : null,
    })) || [],
    diff: audit.diff,
    llmReview: audit.llmReview,
    deepSeniorReviewRollup: audit.deepSeniorReviewRollup,
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

export function buildDeepAuditorRealLoopDogfoodProof() {
  const packetOnlyReview = {
    status: 'degraded_packet_only',
    executedThisRun: false,
    note: 'Deep senior review did not execute.',
  }
  const executedReview = {
    status: 'executed',
    executedThisRun: true,
    findingCount: 1,
    findings: [{
      severity: 'P1',
      title: 'Synthetic routed finding',
      path: 'server.js',
      line: 1,
      whyItMatters: 'Synthetic proof.',
      owner: 'Foundation Builder',
      nextAction: 'Open repair card.',
      proposedCard: 'SYNTHETIC-REPAIR-001',
    }],
  }
  const unrouted = buildSeniorReviewActionRoutes([{
    severity: 'P1',
    title: 'Synthetic missing route',
    path: 'server.js',
    whyItMatters: 'Synthetic proof.',
  }])
  const routed = buildSeniorReviewActionRoutes(executedReview.findings)
  const guardedProcessCheckRepeat = reconcileSeniorReviewFindings({
    closeouts: [],
    findings: buildSeniorReviewActionRoutes([{
      severity: 'P0',
      title: 'Process check writes Current Sprint overlay in verification path',
      path: 'scripts/process-safe-check.mjs',
      whyItMatters: 'Synthetic proof for a senior-review repeat against a protected process-check mutator.',
      owner: 'Foundation Builder',
      nextAction: 'Split or guard the write path.',
      proposedCard: 'SYNTHETIC-PROCESS-CHECK-REGRESSION-001',
    }]),
    reviewTargets: [{
      file: 'scripts/process-safe-check.mjs',
      processCheck: {
        classification: 'guarded_live_mutation',
        protected: true,
        liveMutators: ['currentSprintOverlay'],
        reason: 'script routes live mutation through explicit process write posture',
      },
    }],
  })
  const packetOnlyRollup = classifyDeepSeniorReviewRollup(packetOnlyReview)
  const executedRollup = classifyDeepSeniorReviewRollup(executedReview)
  const checks = [
    {
      ok: packetOnlyRollup.status === 'degraded' && packetOnlyRollup.executed === false,
      check: 'packet-only deep audit cannot be reported as completed deep review',
      detail: JSON.stringify(packetOnlyRollup),
    },
    {
      ok: executedRollup.status === 'healthy' && executedRollup.executed === true,
      check: 'executed deep review can report healthy execution state',
      detail: JSON.stringify(executedRollup),
    },
    {
      ok: unrouted[0]?.route === 'missing_repair_route' && unrouted[0]?.routed === false,
      check: 'P0/P1 senior findings without owner/card/next action fail routing',
      detail: JSON.stringify(unrouted[0]),
    },
    {
      ok: routed[0]?.route === 'proposed_repair_card' && routed[0]?.routed === true,
      check: 'P0/P1 senior findings with owner/card/next action route to repair work',
      detail: JSON.stringify(routed[0]),
    },
    {
      ok: guardedProcessCheckRepeat.summary?.activeFindingCount === 0 &&
        guardedProcessCheckRepeat.summary?.reconciledClosedFindingCount === 1,
      check: 'senior-review repeats against protected process-check mutators reconcile out of active audit',
      detail: JSON.stringify(guardedProcessCheckRepeat.summary),
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}
