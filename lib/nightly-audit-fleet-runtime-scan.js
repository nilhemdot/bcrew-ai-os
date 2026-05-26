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
  'code_quality',
  'synthesis_director_quality',
  'source_coverage_freshness',
  'ui_brand_system',
])

function list(value) {
  return Array.isArray(value) ? value : []
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
  return /^scripts\/process-.*-check\.mjs$/.test(relativePath)
}

function isScheduleOwnedPath(relativePath = '') {
  return [
    'lib/foundation-jobs.js',
    'lib/nightly-audit-fleet.js',
    'lib/nightly-deep-audit-constants.js',
    'lib/youtube-god-mode-autonomous-watch-scheduler.js',
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
      const ownedModelSignal = modelPolicy.risk === false || evidenceOnly || proofFixture || syntheticModelEvidence
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedModelSignal ? 'P3' : 'P1',
        findingId: `model-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedModelSignal ? 'Model literal is owned evidence or route/capability config' : 'Model literal appears outside route/capability ownership',
        detail: ownedModelSignal
          ? `Exact model literal is classified as ${modelPolicy.classification || 'evidence_or_proof_signal'}; keep visible without routing it as active runtime drift.`
          : modelPolicy.reason || 'Model names should be owned by the router, capability registry, or explicit proof module.',
        evidenceRefs: [`${relativePath}:${modelPolicy.firstLine || modelPolicy.literals[0]?.line || 1}`],
        proposedOwnerOrCard: ownedModelSignal ? 'LLM Router' : 'LLM-ROUTER-001',
        confidence: 'high',
        disposition: ownedModelSignal ? 'owned_signal' : 'active_review',
      }))
    }
    if (schedulePattern.test(source)) {
      const ownedScheduleSignal = isScheduleOwnedPath(relativePath) || evidenceOnly || proofFixture
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: ownedScheduleSignal ? 'P3' : 'P2',
        findingId: `schedule-budget-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: ownedScheduleSignal ? 'Schedule/budget literal is in registry or evidence ownership' : 'Schedule/budget literal appears outside runtime registry ownership',
        detail: ownedScheduleSignal
          ? 'Foundation registries, historical closeout/seed data, and audit proof fixtures may name cadence and budget literals; they stay visible as owned signals.'
          : 'Runtime schedules and budgets should be centralized in job/source/control registries.',
        evidenceRefs: [makeRef(relativePath, source, schedulePattern)],
        proposedOwnerOrCard: 'Foundation Runtime',
        confidence: 'medium',
        disposition: ownedScheduleSignal ? 'owned_signal' : 'active_review',
      }))
    }
    if (sourceCountPattern.test(source)) {
      findings.push(makeFinding({
        laneId: 'hardcoded_truth_runtime_config',
        severity: evidenceOnly || proofFixture ? 'P3' : 'P1',
        findingId: `source-count-literal-${relativePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        title: evidenceOnly || proofFixture ? 'Source/source-family count literal is historical evidence' : 'Source/source-family count literal appears in runtime code',
        detail: evidenceOnly || proofFixture
          ? 'Historical seed/closeout/proof text may name prior source counts; do not route it as active runtime truth.'
          : 'Source counts should be derived from source contracts, source family snapshots, or live registries.',
        evidenceRefs: [makeRef(relativePath, source, sourceCountPattern)],
        proposedOwnerOrCard: 'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001',
        confidence: 'medium',
        disposition: evidenceOnly || proofFixture ? 'owned_signal' : 'active_review',
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
        proposedOwnerOrCard: 'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001',
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
        proposedOwnerOrCard: 'DOC-AUTHORITY-001',
        confidence: 'low',
        disposition: ownedMarkdownEvidence ? 'owned_signal' : 'active_review',
      }))
    }
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
  const exclusionPattern = /operator[- ]excluded|intentionally excluded|commentsStatus.*operator_excluded/i
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
    summarizeLane('hardcoded_truth_runtime_config', hardcodedFindings),
    summarizeLane('process_write_boundary', processFindings),
    summarizeLane('mission_doctrine_alignment', doctrineFindings),
    summarizeLane('extractor_god_mode_parity', parityFindings),
    ...packetOnlyLanes,
  ]
  const findings = [
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
    'lib/nightly-audit-fleet-runtime-scan.js': "export function fixture(){ return 'gpt-5.5 and YouTube comments should be extracted next' }\n",
    'scripts/process-proof-check.mjs': "const source = await readRepoFile('docs/source-notes/proof.md')\n",
    'lib/runtime-doc-reader.js': "const source = await readRepoFile('docs/source-notes/live.md')\n",
    'scripts/process-guarded-report-check.mjs': "import fs from 'node:fs/promises'\nimport { isProcessReportWriteRequested } from '../lib/process-write-guard.js'\nconst writeReport = isProcessReportWriteRequested(process.argv.slice(2))\nif (writeReport) await fs.writeFile('docs/handoffs/good.md', 'ok')\n",
    'scripts/process-bad-check.mjs': "import fs from 'node:fs/promises'\nawait fs.writeFile('docs/handoffs/bad.md', 'bad')\n",
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
      name: 'process_proof_markdown_read_is_owned_but_runtime_doc_read_remains_active',
      ok: hardcoded.some(finding => finding.findingId === 'markdown-runtime-read-scripts-process-proof-check-mjs' && finding.disposition === 'owned_signal') &&
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
      ok: doctrine.some(finding => finding.findingId === 'youtube-comments-boundary-lib-youtube-regression-js' && finding.disposition === 'active_review'),
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
