import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildGodModeExtractorParitySnapshot,
  evaluateGodModeExtractorParity,
} from './god-mode-extractor-parity-gate.js'
import {
  buildNightlyAuditFleetRegistry,
  evaluateNightlyAuditFleetRegistry,
} from './nightly-audit-fleet.js'
import {
  buildRuntimeModelLiteralPolicyFindingInput,
} from './llm-runtime-model-literal-policy.js'
import {
  classifyProcessCheckSource,
} from './process-check-readonly-mode.js'
import {
  buildProcessCheckReportOutputPolicyFindingInput,
} from './process-check-report-output-policy.js'

export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID = 'NIGHTLY-AUDIT-FLEET-RUNTIME-SCAN-001'
export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY = 'nightly-audit-fleet-runtime-scan-v1'
export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_PLAN_PATH = 'docs/process/nightly-audit-fleet-runtime-scan-001-plan.md'
export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_APPROVAL_PATH = 'docs/process/approvals/NIGHTLY-AUDIT-FLEET-RUNTIME-SCAN-001.json'
export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH = 'scripts/process-nightly-audit-fleet-runtime-scan-check.mjs'
export const NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-26-nightly-audit-fleet-runtime-scan-closeout.md'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CARD_ID = 'NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_CLOSEOUT_KEY = 'nightly-audit-fleet-signal-quality-v1'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_PLAN_PATH = 'docs/process/nightly-audit-fleet-signal-quality-001-plan.md'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_APPROVAL_PATH = 'docs/process/approvals/NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001.json'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH = 'scripts/process-nightly-audit-fleet-signal-quality-check.mjs'
export const NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-26-nightly-audit-fleet-signal-quality-closeout.md'

const codeExtensions = new Set(['.js', '.mjs', '.css', '.html', '.json'])
const skippedDirs = new Set(['.git', 'node_modules', '.openclaw', '.claude', 'coverage', 'dist'])
const runtimeRoots = ['lib/', 'scripts/', 'public/', 'server.js', 'package.json']
const packetOnlyLaneIds = new Set([
  'synthesis_director_quality',
  'source_coverage_freshness',
  'ui_brand_system',
])
const refactorLargeFileLineThreshold = 3000
const refactorDangerLineThreshold = 5000
const refactorLargeFileLimit = 8
const cardIdPattern = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+-\d{3}$/

function list(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  return Array.from(new Set(values.map(text).filter(Boolean)))
}

function text(value) {
  return String(value || '').trim()
}

function countLines(value = '') {
  const source = String(value || '')
  if (!source) return 0
  const lines = source.split(/\r?\n/)
  return lines.length - (source.endsWith('\n') ? 1 : 0)
}

function lineNumberForIndex(source = '', index = 0) {
  return String(source || '').slice(0, Math.max(0, index)).split(/\r?\n/).length
}

function makeRef(relativePath, source, pattern) {
  const match = String(source || '').match(pattern)
  if (!match || match.index == null) return `${relativePath}:1`
  return `${relativePath}:${lineNumberForIndex(source, match.index)}`
}

function makeIndexRef(relativePath, source = '', index = 0) {
  return `${relativePath}:${lineNumberForIndex(source, index)}`
}

function collectPatternMatches(source = '', pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const matcher = new RegExp(pattern.source, flags)
  const matches = []
  let match = matcher.exec(source)
  while (match) {
    matches.push({ index: match.index, text: match[0] })
    if (match[0] === '') matcher.lastIndex += 1
    match = matcher.exec(source)
  }
  return matches
}

function getFunctionContextName(source = '', index = 0) {
  const prefix = String(source || '').slice(0, Math.max(0, index))
  const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g
  let match = functionPattern.exec(prefix)
  let name = ''
  while (match) {
    name = match[1] || ''
    match = functionPattern.exec(prefix)
  }
  return name
}

function isSyntheticProofContext(source = '', index = 0) {
  return /(?:dogfood|fixture|proof|synthetic)/i.test(getFunctionContextName(source, index))
}

function lineTextForIndex(source = '', index = 0) {
  const text = String(source || '')
  const start = text.lastIndexOf('\n', Math.max(0, index) - 1) + 1
  const endIndex = text.indexOf('\n', Math.max(0, index))
  const end = endIndex === -1 ? text.length : endIndex
  return text.slice(start, end)
}

function indexForLineNumber(source = '', lineNumber = 1) {
  const lines = String(source || '').split(/\r?\n/)
  const target = Math.max(1, Number(lineNumber || 1))
  let index = 0
  for (let cursor = 1; cursor < target && cursor <= lines.length; cursor += 1) {
    index += lines[cursor - 1].length + 1
  }
  return index
}

function isSourceAssertionStringContext(source = '', index = 0) {
  const text = String(source || '')
  const window = text.slice(Math.max(0, index - 500), Math.min(text.length, index + 160))
  const line = lineTextForIndex(text, index)
  return /(?:includesAll\s*\(|\.includes\s*\()/.test(window) && /['"`]\s*(?:scheduleLocalTime|scheduleEveryMinutes|maxRuntimeSeconds|budget)\s*:/.test(line)
}

function isSourceBrowserModelPolicyProofContext(relativePath = '', source = '', line = 1) {
  const index = indexForLineNumber(source, line)
  const window = String(source || '').slice(Math.max(0, index - 500), Math.min(String(source || '').length, index + 500))
  if (/build[A-Za-z0-9]*(?:Dogfood|Proof)|fixture|synthetic/i.test(window)) return true
  if (isSyntheticProofContext(source, index)) return true
  if (relativePath === 'lib/source-agentic-browser-runtime.js' && /UNSUPPORTED_SUBSCRIPTION_MODEL_RE|blocked_unsupported_stagehand_model_route|unsupported.*subscription/i.test(window)) {
    return true
  }
  return false
}

function hardcodedFindingRouteCard(relativePath = '', kind = '') {
  if (relativePath === 'lib/source-browser-brain-route-policy.js') return 'SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001'
  if (/^lib\/(?:source-browser-|source-agentic-browser-|myicor-approved-lesson-extract-proof)/.test(relativePath)) {
    return 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
  }
  if (kind === 'model') return 'LLM-ROUTER-001'
  if (kind === 'source_count') return 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001'
  if (kind === 'ui') return 'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001'
  if (kind === 'markdown') return 'DOC-AUTHORITY-001'
  return 'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001'
}

function makeFinding(input = {}) {
  return {
    laneId: input.laneId,
    severity: input.severity || 'P2',
    findingId: input.findingId,
    title: input.title,
    detail: input.detail || '',
    evidenceRefs: list(input.evidenceRefs),
    proposedOwnerOrCard: input.proposedOwnerOrCard || 'Foundation',
    confidence: input.confidence || 'medium',
    disposition: input.disposition || 'active_review',
  }
}

function routeCardIdsForFindings(findings = []) {
  return unique(findings
    .map(finding => finding.proposedOwnerOrCard)
    .filter(value => cardIdPattern.test(value)))
}

function isRuntimePath(relativePath = '') {
  return runtimeRoots.some(root => relativePath === root || relativePath.startsWith(root))
}

function isEvidenceOnlyRuntimePath(relativePath = '') {
  return /^lib\/foundation-backlog-seed-chunks\//.test(relativePath) ||
    /^lib\/foundation-build-closeout-.*-records\.js$/.test(relativePath) ||
    relativePath === 'lib/foundation-verify-coverage-card-ids.js'
}

function isAuditProofFixturePath(relativePath = '') {
  return [
    'lib/nightly-audit-fleet-runtime-scan.js',
    NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_SCRIPT_PATH,
    NIGHTLY_AUDIT_FLEET_SIGNAL_QUALITY_SCRIPT_PATH,
  ].includes(relativePath)
}

function isSyntheticModelEvidencePath(relativePath = '') {
  return [
    'lib/decision-007-reconciliation.js',
    'lib/extraction-runtime-readiness.js',
    'lib/extractor-brain-fleet-proof.js',
    'lib/foundation-llm-runtime-store.js',
    'lib/model-routing-doctrine.js',
  ].includes(relativePath)
}

function isProcessProofScriptPath(relativePath = '') {
  return /^scripts\/process-.*-check\.mjs$/.test(relativePath) || relativePath === 'scripts/foundation-verify.mjs'
}

function isScheduleOwnedPath(relativePath = '') {
  return [
    'lib/foundation-jobs.js',
    'lib/foundation-extraction-runtime-verifier.js',
    'lib/nightly-audit-fleet.js',
    'lib/nightly-deep-audit-constants.js',
    'lib/extractor-queue-karpathy-kb-video-pack.js',
    'lib/foundation-health-watch-to-green.js',
    'lib/nightly-audit-run-proof.js',
    'lib/source-lifecycle.js',
    'lib/youtube-creator-daily-watch.js',
    'lib/youtube-god-mode-autonomous-watch-scheduler.js',
    'scripts/seed-extraction-control.mjs',
  ].includes(relativePath)
}

function isSourceCountEvidencePath(relativePath = '') {
  return [
    'lib/code-quality-nightly-audit.js',
    'lib/foundation-db-schema-seed-store.js',
    'lib/nightly-deep-audit-upgrade.js',
  ].includes(relativePath)
}

function hasWriteGuard(source = '') {
  return /assert(Process|CurrentProcess)CheckWriteAllowed|isProcessReportWriteRequested|isProcessCheckWriteRequested|PROCESS_CHECK_WRITE_FLAGS/.test(source)
}

async function listRepoFiles(repoRoot, dir = repoRoot, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (skippedDirs.has(entry.name)) continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await listRepoFiles(repoRoot, absolutePath, result)
      continue
    }
    if (!entry.isFile()) continue
    const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
    if (!isRuntimePath(relativePath)) continue
    if (!codeExtensions.has(path.extname(relativePath))) continue
    result.push(relativePath)
  }
  return result
}

async function readRuntimeFileTexts(repoRoot) {
  const files = await listRepoFiles(repoRoot)
  const entries = await Promise.all(files.map(async relativePath => [
    relativePath,
    await fs.readFile(path.join(repoRoot, relativePath), 'utf8').catch(() => ''),
  ]))
  return Object.fromEntries(entries.filter(([, source]) => source))
}

export function scanHardcodedTruthRuntimeConfig(fileTexts = {}) {
  const findings = []
  const schedulePattern = /\b(?:scheduleLocalTime|scheduleEveryMinutes|maxRuntimeSeconds)\s*:\s*(?:['"`]|\d)|\b(?:dailyBudgetUsd|runBudgetUsd|costCapUsd|budgetUsd|budget)\s*:\s*['"`][^'"`]+['"`]/i
  const sourceCountPattern = /\b(?:EXPECTED_SOURCE_COUNT|MIN_SOURCE_CONTRACTS|sourceContracts\.length\s*===|all\s+\d+\s+source contracts|\d+\s+source families)\b/i
  const uiTruthPattern = /\b(?:Latest live checkpoint|Ready for v1|is passing|Current Sprint:|14\/14|5\/5)\b/i
  const markdownRuntimePattern = /readFile\s*\([^)]*docs\/(?:handoffs|_archive|audits|source-notes)|readRepoFile\s*\(\s*['"]docs\/(?:handoffs|_archive|audits|source-notes)/i

  for (const [relativePath, source] of Object.entries(fileTexts)) {
    if (!source || !isRuntimePath(relativePath)) continue
    const evidenceOnly = isEvidenceOnlyRuntimePath(relativePath)
    const proofFixture = isAuditProofFixturePath(relativePath)
    const syntheticModelEvidence = isSyntheticModelEvidencePath(relativePath)
    const processProofScript = isProcessProofScriptPath(relativePath)
    const modelPolicy = buildRuntimeModelLiteralPolicyFindingInput({ relativePath, text: source })
    if (modelPolicy.literals?.length) {
      const ownedModelSignal = modelPolicy.risk === false ||
        evidenceOnly ||
        proofFixture ||
        syntheticModelEvidence ||
        modelPolicy.literals.every(literal => isSourceBrowserModelPolicyProofContext(relativePath, source, literal.line))
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedModelSignal ? 'P3' : 'P1',
        findingId: `model-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedModelSignal ? 'Model literal is owned evidence or route/capability config' : 'Model literal appears outside route/capability ownership',
        detail: ownedModelSignal
          ? `Exact model literal is classified as ${modelPolicy.classification || 'evidence_or_proof_signal'}; keep visible without routing it as active runtime drift.`
          : modelPolicy.reason || 'Model names should be owned by the router, capability registry, or explicit proof module.',
        evidenceRefs: [`${relativePath}:${modelPolicy.firstLine || modelPolicy.literals[0]?.line || 1}`],
        proposedOwnerOrCard: ownedModelSignal ? hardcodedFindingRouteCard(relativePath, 'model') : hardcodedFindingRouteCard(relativePath, 'model'),
        confidence: 'high',
        disposition: ownedModelSignal ? 'owned_signal' : 'active_review',
      }))
    }
    const scheduleMatches = collectPatternMatches(source, schedulePattern)
    if (scheduleMatches.length) {
      const isOwnedScheduleMatch = match =>
        isScheduleOwnedPath(relativePath) ||
        evidenceOnly ||
        proofFixture ||
        processProofScript ||
        isSyntheticProofContext(source, match.index) ||
        isSourceAssertionStringContext(source, match.index)
      const activeScheduleMatch = scheduleMatches.find(match => !isOwnedScheduleMatch(match))
      const selectedScheduleMatch = activeScheduleMatch || scheduleMatches[0]
      const ownedScheduleSignal = !activeScheduleMatch
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedScheduleSignal ? 'P3' : 'P2',
        findingId: `schedule-budget-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedScheduleSignal ? 'Schedule/budget literal is in registry or evidence ownership' : 'Schedule/budget literal appears outside runtime registry ownership',
        detail: ownedScheduleSignal
          ? 'Foundation registries, historical closeout/seed data, and audit proof fixtures may name cadence and budget literals; they stay visible as owned signals.'
          : 'Runtime schedules and budgets should be centralized in job/source/control registries.',
        evidenceRefs: [makeIndexRef(relativePath, source, selectedScheduleMatch.index)],
        proposedOwnerOrCard: hardcodedFindingRouteCard(relativePath, 'schedule'),
        confidence: 'medium',
        disposition: ownedScheduleSignal ? 'owned_signal' : 'active_review',
      }))
    }
    const sourceCountMatches = collectPatternMatches(source, sourceCountPattern)
    if (sourceCountMatches.length) {
      const isOwnedSourceCountMatch = match =>
        evidenceOnly ||
        proofFixture ||
        isSourceCountEvidencePath(relativePath) ||
        isSyntheticProofContext(source, match.index)
      const activeSourceCountMatch = sourceCountMatches.find(match => !isOwnedSourceCountMatch(match))
      const selectedSourceCountMatch = activeSourceCountMatch || sourceCountMatches[0]
      const ownedSourceCountSignal = !activeSourceCountMatch
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedSourceCountSignal ? 'P3' : 'P1',
        findingId: `source-count-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedSourceCountSignal ? 'Source/source-family count literal is historical evidence' : 'Source/source-family count literal appears in runtime code',
        detail: ownedSourceCountSignal
          ? 'Historical seed/closeout/proof/scanner text may name prior source counts; do not route it as active runtime truth.'
          : 'Source counts should be derived from source contracts, source family snapshots, or live registries.',
        evidenceRefs: [makeIndexRef(relativePath, source, selectedSourceCountMatch.index)],
        proposedOwnerOrCard: hardcodedFindingRouteCard(relativePath, 'source_count'),
        confidence: 'medium',
        disposition: ownedSourceCountSignal ? 'owned_signal' : 'active_review',
      }))
    }
    if (relativePath.startsWith('public/') && uiTruthPattern.test(source)) {
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: 'P1',
        findingId: `ui-live-copy-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: 'UI code contains live-looking static truth copy',
        detail: 'Operator-facing live status should render from API/source-backed payloads rather than fixed copy.',
        evidenceRefs: [makeRef(relativePath, source, uiTruthPattern)],
        proposedOwnerOrCard: hardcodedFindingRouteCard(relativePath, 'ui'),
        confidence: 'medium',
      }))
    }
    if (markdownRuntimePattern.test(source)) {
      const ownedMarkdownEvidence = processProofScript || evidenceOnly || proofFixture
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedMarkdownEvidence ? 'P3' : 'P2',
        findingId: `markdown-runtime-read-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedMarkdownEvidence ? 'Process proof reads markdown/archive docs as evidence' : 'Runtime code reads markdown/archive docs as data',
        detail: ownedMarkdownEvidence
          ? 'Focused process proofs may read handoff/archive/source-note markdown as evidence; keep visible without routing it as active live-runtime truth.'
          : 'Markdown can be evidence, but live runtime truth should be DB/API/source-backed unless the code marks the read as historical evidence.',
        evidenceRefs: [makeRef(relativePath, source, markdownRuntimePattern)],
        proposedOwnerOrCard: hardcodedFindingRouteCard(relativePath, 'markdown'),
        confidence: 'low',
        disposition: ownedMarkdownEvidence ? 'owned_signal' : 'active_review',
      }))
    }
  }
  return findings
}

export function scanCodeQualityRefactorOpportunities(fileTexts = {}) {
  const findings = []
  const runtimeEntries = Object.entries(fileTexts)
    .map(([relativePath, source]) => ({
      relativePath,
      source,
      lineCount: countLines(source),
      byteCount: Buffer.byteLength(String(source || ''), 'utf8'),
    }))
    .filter(entry => isRuntimePath(entry.relativePath))

  const oversizedFiles = runtimeEntries
    .filter(entry => entry.lineCount >= refactorLargeFileLineThreshold)
    .sort((left, right) => right.lineCount - left.lineCount || left.relativePath.localeCompare(right.relativePath))
    .slice(0, refactorLargeFileLimit)

  for (const entry of oversizedFiles) {
    findings.push(makeFinding({
      laneId: 'code_quality',
      severity: entry.lineCount >= refactorDangerLineThreshold ? 'P0' : 'P1',
      findingId: `refactor-oversized-file-${entry.relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: 'Oversized runtime file needs an owned split path',
      detail: `${entry.relativePath} is ${entry.lineCount.toLocaleString()} lines / ${entry.byteCount.toLocaleString()} bytes, above the ${refactorLargeFileLineThreshold.toLocaleString()}-line review threshold.`,
      evidenceRefs: [`${entry.relativePath}:1`],
      proposedOwnerOrCard: 'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001',
      confidence: 'high',
    }))
  }

  const sourceMaturityRepairFiles = runtimeEntries
    .filter(entry => /^lib\/source-maturity-.*repair.*\.js$/.test(entry.relativePath))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  if (sourceMaturityRepairFiles.length >= 10) {
    findings.push(makeFinding({
      laneId: 'code_quality',
      severity: 'P1',
      findingId: 'refactor-source-maturity-repair-clones',
      title: 'Source-maturity repair files should collapse into one engine plus manifests',
      detail: `${sourceMaturityRepairFiles.length} source-maturity repair-like modules are present; keep the clone-collapse work routed to its existing tune-up card.`,
      evidenceRefs: sourceMaturityRepairFiles.slice(0, 5).map(entry => `${entry.relativePath}:1`),
      proposedOwnerOrCard: 'SOURCE-MATURITY-REPAIR-COLLAPSE-001',
      confidence: 'high',
    }))
  }

  const processCheckFiles = runtimeEntries.filter(entry => /^scripts\/process-.*-check\.mjs$/.test(entry.relativePath))
  if (processCheckFiles.length >= 250) {
    findings.push(makeFinding({
      laneId: 'code_quality',
      severity: 'P2',
      findingId: 'refactor-process-check-sprawl',
      title: 'Process-check sprawl should stay behind tiering and reusable checkers',
      detail: `${processCheckFiles.length} process check scripts are present; avoid adding new per-card checks unless the proof catches a real future bug.`,
      evidenceRefs: ['package.json:1', 'scripts:1'],
      proposedOwnerOrCard: 'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001',
      confidence: 'high',
    }))
  }

  const closeoutRecordFiles = runtimeEntries.filter(entry => /^lib\/foundation-build-closeout-.*-records\.js$/.test(entry.relativePath))
  const closeoutRecordLineTotal = closeoutRecordFiles.reduce((sum, entry) => sum + entry.lineCount, 0)
  if (closeoutRecordLineTotal >= 10000) {
    findings.push(makeFinding({
      laneId: 'code_quality',
      severity: 'P1',
      findingId: 'refactor-closeout-records-as-code',
      title: 'Closeout records remain data-shaped code',
      detail: `${closeoutRecordFiles.length} closeout record modules total ${closeoutRecordLineTotal.toLocaleString()} lines; move record data behind the existing datastore card before the registry grows again.`,
      evidenceRefs: closeoutRecordFiles
        .sort((left, right) => right.lineCount - left.lineCount || left.relativePath.localeCompare(right.relativePath))
        .slice(0, 5)
        .map(entry => `${entry.relativePath}:1`),
      proposedOwnerOrCard: 'FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001',
      confidence: 'high',
    }))
  }

  return findings
}

export function scanProcessWriteBoundaries(fileTexts = {}) {
  const findings = []
  const mutatorPattern = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|fs\.writeFile|writeFile\s*\(/i
  for (const [relativePath, source] of Object.entries(fileTexts)) {
    if (!relativePath.startsWith('scripts/process-') || !mutatorPattern.test(source)) continue
    const processClassification = classifyProcessCheckSource({
      relativePath,
      source,
      backlogWriteBoundaryGuarded: true,
    })
    const reportPolicy = buildProcessCheckReportOutputPolicyFindingInput({
      relativePath,
      text: source,
    })
    const protectedWrite = processClassification.protected === true && reportPolicy.risk === false
    findings.push(makeFinding({
      laneId: 'process_write_boundary',
      severity: protectedWrite || hasWriteGuard(source) ? 'P3' : 'P1',
      findingId: `process-write-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: protectedWrite || hasWriteGuard(source) ? 'Process check write path is guarded' : 'Process check contains write path without visible write guard',
      detail: protectedWrite || hasWriteGuard(source)
        ? `Governed write/report path is protected by ${processClassification.classification}/${reportPolicy.classification}.`
        : `Process checks must not mutate live state or repo artifacts unless an explicit write flag guard is present. ${processClassification.reason || reportPolicy.reason || ''}`.trim(),
      evidenceRefs: [makeRef(relativePath, source, mutatorPattern)],
      proposedOwnerOrCard: protectedWrite || hasWriteGuard(source) ? 'Process guard' : 'PROCESS-CHECK-READONLY-MODE-001',
      confidence: 'high',
      disposition: protectedWrite || hasWriteGuard(source) ? 'owned_signal' : 'active_review',
    }))
  }
  return findings
}

export function scanMissionDoctrineAlignment(fileTexts = {}) {
  const findings = []
  const commentRegressionPattern = /YouTube comments/i
  const exclusionPattern = /operator(?:_|-| )excluded|intentionally excluded|explicitly excluded|commentsStatus.*operator_excluded/i
  for (const [relativePath, source] of Object.entries(fileTexts)) {
    if (!isRuntimePath(relativePath) || !commentRegressionPattern.test(source)) continue
    const proofFixture = isAuditProofFixturePath(relativePath)
    findings.push(makeFinding({
      laneId: 'mission_doctrine_alignment',
      severity: exclusionPattern.test(source) || proofFixture ? 'P3' : 'P1',
      findingId: `youtube-comments-boundary-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      title: exclusionPattern.test(source) || proofFixture ? 'YouTube comments exclusion/proof boundary is explicit' : 'YouTube comments appear without exclusion boundary',
      detail: exclusionPattern.test(source) || proofFixture
        ? 'The code names comments only to preserve Steve’s exclusion boundary or dogfood the regression detector.'
        : 'Public YouTube comments must not re-enter active God Mode work unless Steve reverses the exclusion.',
      evidenceRefs: [makeRef(relativePath, source, commentRegressionPattern)],
      proposedOwnerOrCard: 'YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001',
      confidence: 'high',
      disposition: exclusionPattern.test(source) || proofFixture ? 'owned_signal' : 'active_review',
    }))
  }
  return findings
}

function buildExtractorParityFindings() {
  const snapshot = buildGodModeExtractorParitySnapshot()
  const evaluation = evaluateGodModeExtractorParity(snapshot)
  return list(evaluation.violations).map(violation => makeFinding({
    laneId: 'extractor_god_mode_parity',
    severity: 'P0',
    findingId: `extractor-parity-${violation.familyId || 'unknown'}-${violation.ruleId || 'rule'}`,
    title: 'Extractor parity violation',
    detail: `${violation.familyId || 'unknown'}: ${violation.detail || violation.ruleId || 'parity violation'}`,
    evidenceRefs: ['lib/god-mode-extractor-parity-gate.js'],
    proposedOwnerOrCard: 'GOD-MODE-EXTRACTOR-PARITY-GATE-001',
    confidence: 'high',
  }))
}

function summarizeLane(laneId, findings = [], status = null) {
  const active = findings.filter(finding => finding.disposition === 'active_review')
  return {
    laneId,
    status: status || (active.length ? 'findings_present' : 'clean'),
    findingCount: findings.length,
    activeFindingCount: active.length,
    ownedSignalCount: findings.filter(finding => finding.disposition === 'owned_signal').length,
  }
}

export async function buildNightlyAuditFleetRuntimeScan({ repoRoot = process.cwd(), fileTexts = null } = {}) {
  const registry = buildNightlyAuditFleetRegistry()
  const registryEvaluation = evaluateNightlyAuditFleetRegistry(registry)
  const runtimeFileTexts = fileTexts || await readRuntimeFileTexts(repoRoot)
  const codeQualityFindings = scanCodeQualityRefactorOpportunities(runtimeFileTexts)
  const hardcodedFindings = scanHardcodedTruthRuntimeConfig(runtimeFileTexts)
  const processFindings = scanProcessWriteBoundaries(runtimeFileTexts)
  const doctrineFindings = scanMissionDoctrineAlignment(runtimeFileTexts)
  const parityFindings = buildExtractorParityFindings()
  const packetOnlyLanes = registry.lanes
    .filter(lane => packetOnlyLaneIds.has(lane.laneId))
    .map(lane => ({
      laneId: lane.laneId,
      status: 'packet_only',
      reason: 'Deterministic runtime scan V1 records the lane packet and keeps deeper execution for a focused follow-up.',
    }))
  const lanePackets = [
    summarizeLane('code_quality', codeQualityFindings),
    summarizeLane('hardcoded_truth_runtime_config', hardcodedFindings),
    summarizeLane('process_write_boundary', processFindings),
    summarizeLane('mission_doctrine_alignment', doctrineFindings),
    summarizeLane('extractor_god_mode_parity', parityFindings),
    ...packetOnlyLanes,
  ]
  const findings = [
    ...codeQualityFindings,
    ...hardcodedFindings,
    ...processFindings,
    ...doctrineFindings,
    ...parityFindings,
  ]
  const activeFindings = findings.filter(finding => finding.disposition === 'active_review')
  return {
    cardId: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CARD_ID,
    closeoutKey: NIGHTLY_AUDIT_FLEET_RUNTIME_SCAN_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFix: false,
    writesBacklog: false,
    externalWrites: false,
    registryOk: registryEvaluation.ok,
    status: registryEvaluation.ok ? 'healthy' : 'registry_risk',
    scanStatus: activeFindings.length ? 'findings_present' : 'clean',
    summary: {
      fileCount: Object.keys(runtimeFileTexts).length,
      totalLines: Object.values(runtimeFileTexts).reduce((sum, source) => sum + countLines(source), 0),
      laneCount: registry.lanes.length,
      executedLaneCount: lanePackets.filter(lane => lane.status !== 'packet_only').length,
      packetOnlyLaneCount: lanePackets.filter(lane => lane.status === 'packet_only').length,
      findingCount: findings.length,
      activeFindingCount: activeFindings.length,
      ownedSignalCount: findings.filter(finding => finding.disposition === 'owned_signal').length,
      routedActiveCardCount: routeCardIdsForFindings(activeFindings).length,
    },
    lanePackets,
    findings,
    activeFindings,
  }
}

export function buildNightlyAuditFleetRuntimeScanDogfoodProof() {
  const fileTexts = {
    'lib/llm-router.js': "export const allowed = 'gpt-5.5'\n",
    'lib/random-runtime.js': "export const model = 'gpt-5.5'\n",
    'public/foundation.js': "const currentSummary = 'Latest live checkpoint is passing 14/14'\n",
    'scripts/process-bad-check.mjs': "import fs from 'node:fs/promises'\nawait fs.writeFile('docs/handoffs/bad.md', 'bad')\n",
    'lib/youtube-boundary.js': "export const comments = 'YouTube comments are intentionally excluded'\n",
    'lib/youtube-regression.js': "export const comments = 'YouTube comments should be extracted next'\n",
  }
  const hardcoded = scanHardcodedTruthRuntimeConfig(fileTexts)
  const process = scanProcessWriteBoundaries(fileTexts)
  const doctrine = scanMissionDoctrineAlignment(fileTexts)
  const cases = [
    {
      name: 'owned_model_literal_is_signal_not_active',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-llm-router-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'unowned_model_literal_is_active',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-random-runtime-js' && finding.disposition === 'active_review'),
    },
    {
      name: 'ui_live_copy_is_active',
      ok: hardcoded.some(finding => finding.findingId === 'ui-live-copy-public-foundation-js' && finding.disposition === 'active_review'),
    },
    {
      name: 'unguarded_process_write_is_active',
      ok: process.some(finding => finding.findingId === 'process-write-scripts-process-bad-check-mjs' && finding.disposition === 'active_review'),
    },
    {
      name: 'comment_exclusion_is_signal_but_regression_is_active',
      ok: doctrine.some(finding => finding.findingId === 'youtube-comments-boundary-lib-youtube-boundary-js' && finding.disposition === 'owned_signal') &&
        doctrine.some(finding => finding.findingId === 'youtube-comments-boundary-lib-youtube-regression-js' && finding.disposition === 'active_review'),
    },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    hardcodedCount: hardcoded.length,
    processCount: process.length,
    doctrineCount: doctrine.length,
  }
}

export function buildNightlyAuditFleetSignalQualityProof() {
  const fileTexts = {
    'lib/llm-router.js': "export const allowed = 'gpt-5.5'\n",
    'lib/foundation-backlog-seed-chunks/chunk-999.js': "export const seed = { statusNote: 'Uses gpt-5.5 as historical evidence', sourceContracts: 'all 43 source contracts' }\n",
    'lib/extractor-brain-fleet-proof.js': "export const proof = { model: 'openai-codex/gpt-5.4' }\n",
    'lib/random-runtime.js': "export const model = 'gpt-5.5'\n",
    'lib/schedule-readback.js': "export const row = { scheduleEveryMinutes: job?.scheduleEveryMinutes ?? null }\n",
    'lib/schedule-runtime.js': "export const job = { scheduleEveryMinutes: 5 }\n",
    'lib/runtime-proof-context.js': "export function buildRuntimeDogfoodProof(){ return { scheduleEveryMinutes: 60, budget: 'fixture' } }\n",
    'lib/source-assertion.js': "export function check(source){ return includesAll(source, [\"scheduleLocalTime: '08:30'\", \"budget: 'connector'\"]) }\n",
    'lib/nightly-audit-fleet-runtime-scan.js': "export function fixture(){ return 'gpt-5.5 and YouTube comments should be extracted next' }\n",
    'scripts/process-proof-check.mjs': "const source = await readRepoFile('docs/source-notes/proof.md')\n",
    'scripts/process-budget-proof-check.mjs': "const fixture = { budget: 'no_llm', scheduleEveryMinutes: 1440 }\n",
    'scripts/foundation-verify.mjs': "const source = await readRepoFile('docs/_archive/INDEX.md')\n",
    'lib/runtime-doc-reader.js': "const source = await readRepoFile('docs/source-notes/live.md')\n",
    'scripts/process-guarded-report-check.mjs': "import fs from 'node:fs/promises'\nimport { isProcessReportWriteRequested } from '../lib/process-write-guard.js'\nconst writeReport = isProcessReportWriteRequested(process.argv.slice(2))\nif (writeReport) await fs.writeFile('docs/handoffs/good.md', 'ok')\n",
    'scripts/process-bad-check.mjs': "import fs from 'node:fs/promises'\nawait fs.writeFile('docs/handoffs/bad.md', 'bad')\n",
    'lib/youtube-excluded.js': "export const status = 'operator_excluded'; export const note = 'YouTube comments are explicitly excluded'\n",
    'lib/youtube-regression.js': "export const comments = 'YouTube comments should be extracted next'\n",
  }
  const hardcoded = scanHardcodedTruthRuntimeConfig(fileTexts)
  const process = scanProcessWriteBoundaries(fileTexts)
  const doctrine = scanMissionDoctrineAlignment(fileTexts)
  const cases = [
    {
      name: 'route_owned_model_literal_stays_owned_signal',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-llm-router-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'historical_seed_model_and_count_literals_are_owned_signals',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-foundation-backlog-seed-chunks-chunk-999-js' && finding.disposition === 'owned_signal') &&
        hardcoded.some(finding => finding.findingId === 'source-count-literal-lib-foundation-backlog-seed-chunks-chunk-999-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'unowned_runtime_model_literal_remains_active',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-random-runtime-js' && finding.disposition === 'active_review'),
    },
    {
      name: 'synthetic_proof_model_literal_is_owned_signal',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-extractor-brain-fleet-proof-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'source_backed_schedule_readback_is_not_a_budget_literal',
      ok: !hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-lib-schedule-readback-js'),
    },
    {
      name: 'hardcoded_schedule_literal_remains_active',
      ok: hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-lib-schedule-runtime-js' && finding.disposition === 'active_review'),
    },
    {
      name: 'proof_context_and_process_budget_literals_are_owned_signals',
      ok: hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-lib-runtime-proof-context-js' && finding.disposition === 'owned_signal') &&
        hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-scripts-process-budget-proof-check-mjs' && finding.disposition === 'owned_signal') &&
        hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-lib-source-assertion-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'process_proof_markdown_read_is_owned_but_runtime_doc_read_remains_active',
      ok: hardcoded.some(finding => finding.findingId === 'markdown-runtime-read-scripts-process-proof-check-mjs' && finding.disposition === 'owned_signal') &&
        hardcoded.some(finding => finding.findingId === 'markdown-runtime-read-scripts-foundation-verify-mjs' && finding.disposition === 'owned_signal') &&
        hardcoded.some(finding => finding.findingId === 'markdown-runtime-read-lib-runtime-doc-reader-js' && finding.disposition === 'active_review'),
    },
    {
      name: 'scanner_dogfood_literals_do_not_self_page_as_active',
      ok: hardcoded
        .filter(finding => finding.findingId.includes('lib-nightly-audit-fleet-runtime-scan-js'))
        .every(finding => finding.disposition === 'owned_signal') &&
        doctrine
          .filter(finding => finding.findingId.includes('lib-nightly-audit-fleet-runtime-scan-js'))
          .every(finding => finding.disposition === 'owned_signal'),
    },
    {
      name: 'guarded_report_writer_is_owned_signal',
      ok: process.some(finding => finding.findingId === 'process-write-scripts-process-guarded-report-check-mjs' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'unguarded_report_writer_remains_active',
      ok: process.some(finding => finding.findingId === 'process-write-scripts-process-bad-check-mjs' && finding.disposition === 'active_review'),
    },
    {
      name: 'real_comment_regression_remains_active',
      ok: doctrine.some(finding => finding.findingId === 'youtube-comments-boundary-lib-youtube-excluded-js' && finding.disposition === 'owned_signal') &&
        doctrine.some(finding => finding.findingId === 'youtube-comments-boundary-lib-youtube-regression-js' && finding.disposition === 'active_review'),
    },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    hardcodedCount: hardcoded.length,
    processCount: process.length,
    doctrineCount: doctrine.length,
  }
}

export function buildNightlyAuditFleetHardeningProof() {
  const fileTexts = {
    'scripts/foundation-verify.mjs': 'export function verify() { return true }\n'.repeat(3200),
    'lib/source-maturity-alpha-repair.js': 'export const repair = true\n',
    'lib/source-maturity-beta-repair.js': 'export const repair = true\n',
    'lib/source-maturity-gamma-repair.js': 'export const repair = true\n',
    'lib/source-maturity-delta-repair.js': 'export const repair = true\n',
    'lib/source-maturity-epsilon-repair.js': 'export const repair = true\n',
    'lib/source-maturity-zeta-repair.js': 'export const repair = true\n',
    'lib/source-maturity-eta-repair.js': 'export const repair = true\n',
    'lib/source-maturity-theta-repair.js': 'export const repair = true\n',
    'lib/source-maturity-iota-repair.js': 'export const repair = true\n',
    'lib/source-maturity-kappa-repair.js': 'export const repair = true\n',
    'lib/source-browser-brain-route-policy.js': "export function buildSourceBrowserBrainRoutePolicyDogfood(){ return { model: 'codex/gpt-5.5' } }\n",
    'lib/source-agentic-browser-runtime.js': "const UNSUPPORTED_SUBSCRIPTION_MODEL_RE = /^gpt-5.5(?:\\/|$)/i\n",
    'lib/source-browser-agent-executor.js': "export const budget = { maxRuntimeSeconds: 3900 }\n",
    'lib/random-runtime.js': "export const model = 'gpt-5.5'\n",
  }
  const codeQuality = scanCodeQualityRefactorOpportunities(fileTexts)
  const hardcoded = scanHardcodedTruthRuntimeConfig(fileTexts)
  const active = [...codeQuality, ...hardcoded].filter(finding => finding.disposition === 'active_review')
  const activeRouteIds = routeCardIdsForFindings(active)
  const cases = [
    {
      name: 'code_quality_refactor_lane_finds_oversized_file',
      ok: codeQuality.some(finding => finding.findingId === 'refactor-oversized-file-scripts-foundation-verify-mjs' && finding.proposedOwnerOrCard === 'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001'),
    },
    {
      name: 'code_quality_refactor_lane_finds_source_maturity_clones',
      ok: codeQuality.some(finding => finding.findingId === 'refactor-source-maturity-repair-clones' && finding.proposedOwnerOrCard === 'SOURCE-MATURITY-REPAIR-COLLAPSE-001'),
    },
    {
      name: 'source_browser_policy_dogfood_model_literals_are_owned',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-source-browser-brain-route-policy-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'unsupported_subscription_guard_model_literal_is_owned',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-source-agentic-browser-runtime-js' && finding.disposition === 'owned_signal'),
    },
    {
      name: 'real_unowned_model_literal_still_routes_active',
      ok: hardcoded.some(finding => finding.findingId === 'model-literal-lib-random-runtime-js' && finding.disposition === 'active_review' && finding.proposedOwnerOrCard === 'LLM-ROUTER-001'),
    },
    {
      name: 'source_browser_budget_literals_route_to_human_work_card',
      ok: hardcoded.some(finding => finding.findingId === 'schedule-budget-literal-lib-source-browser-agent-executor-js' && finding.disposition === 'active_review' && finding.proposedOwnerOrCard === 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'),
    },
    {
      name: 'active_findings_have_card_routes',
      ok: active.length > 0 && active.every(finding => cardIdPattern.test(finding.proposedOwnerOrCard)) && activeRouteIds.length > 0,
    },
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    codeQualityCount: codeQuality.length,
    hardcodedCount: hardcoded.length,
    activeFindingCount: active.length,
    activeRouteIds,
  }
}
