import fs from 'node:fs'
import path from 'node:path'
import {
  PROCESS_WIP_PROTOCOL_FINDING_KEY,
  evaluateProcessWipProtocolPlan,
} from './process-wip-protocol.js'

export const PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID = 'PLAN-CRITIC-ARCHITECTURAL-RULES-001'
export const PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY = 'plan-critic-architectural-rules-v1'
export const PLAN_CRITIC_ARCHITECTURAL_RULES_PLAN_PATH = 'docs/process/plan-critic-architectural-rules-001-plan.md'
export const PLAN_CRITIC_ARCHITECTURAL_RULES_APPROVAL_PATH = 'docs/process/approvals/PLAN-CRITIC-ARCHITECTURAL-RULES-001.json'
export const PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH = 'scripts/process-plan-critic-architectural-rules-check.mjs'
export const PLAN_CRITIC_ARCHITECTURAL_RULES_SPRINT_ID = 'plan-critic-architecture-guardrails-2026-05-13'

export const ARCHITECTURAL_RULE_FINDING_KEYS = {
  largeFileSplitPlan: 'architecture_large_file_split_plan',
  checkScriptApplyPosture: 'architecture_check_script_apply_posture',
  verifierReadOnly: 'architecture_verifier_read_only',
  focusedProofRequired: 'architecture_focused_proof_required',
  auditFixDogfood: 'architecture_audit_fix_dogfood',
  performanceBudget: 'architecture_hot_route_performance_budget',
  processWipProtocol: PROCESS_WIP_PROTOCOL_FINDING_KEY,
}

export const LARGE_FILE_LINE_THRESHOLD = 5000

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeForSearch(value) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase()
}

function hasAny(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

function countFileLines(filePath, repoRoot = process.cwd()) {
  try {
    const absolutePath = path.resolve(repoRoot, filePath)
    if (!absolutePath.startsWith(path.resolve(repoRoot))) return null
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return null
    const source = fs.readFileSync(absolutePath, 'utf8')
    return source.split(/\r?\n/).length
  } catch {
    return null
  }
}

export function buildPlanCriticArchitectureContext({
  changedFiles = [],
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  const lineCounts = {}
  for (const filePath of changedFiles) {
    const normalizedPath = normalizeText(filePath).replace(/\\/g, '/')
    if (!normalizedPath) continue
    const supplied = Number(fileLineCounts[normalizedPath])
    const lineCount = Number.isFinite(supplied) ? supplied : countFileLines(normalizedPath, repoRoot)
    if (Number.isFinite(lineCount)) lineCounts[normalizedPath] = lineCount
  }
  const largeFiles = Object.entries(lineCounts)
    .filter(([, lineCount]) => lineCount >= LARGE_FILE_LINE_THRESHOLD)
    .map(([filePath, lineCount]) => ({ filePath, lineCount }))
  return { lineCounts, largeFiles }
}

function makeFinding(key, detail, severity = 'critical', metadata = {}) {
  return { key, detail, severity, metadata }
}

export function evaluatePlanCriticArchitecturalRules({
  planText,
  changedFiles = [],
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  const text = normalizeText(planText)
  const searchText = normalizeForSearch(text)
  const normalizedChangedFiles = changedFiles.map(filePath => normalizeText(filePath).replace(/\\/g, '/')).filter(Boolean)
  const architectureContext = buildPlanCriticArchitectureContext({
    changedFiles: normalizedChangedFiles,
    fileLineCounts,
    repoRoot,
  })
  const findings = []

  const splitPlan = hasAny(searchText, [
    /\bsplit plan\b/,
    /\bsplit\/extraction\b/,
    /\bextract(?:ion)?\b[^.]{0,120}\bmodule\b/,
    /\bnew module\b/,
    /\bmodule boundary\b/,
    /\bkeep[^.]{0,120}\boutside[^.]{0,120}\bmonolith\b/,
    /\bthin wrapper\b/,
    /\bno new responsibility\b/,
    /\bdo not add[^.]{0,120}\bmonolith\b/,
  ])
  if (architectureContext.largeFiles.length && !splitPlan) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.largeFileSplitPlan,
      `Plans touching files over ${LARGE_FILE_LINE_THRESHOLD} lines must name a split/extraction plan or explain why no new responsibility is being added.`,
      'critical',
      { largeFiles: architectureContext.largeFiles },
    ))
  }

  const touchesRouteSurface = normalizedChangedFiles.some(filePath =>
    filePath === 'server.js' ||
    filePath === 'public/foundation.js' ||
    /^routes\//.test(filePath) ||
    /^api\//.test(filePath)
  )
  const routeChangeSignals = hasAny(searchText, [
    /\b(add|build|change|update|rewrite|modify|touch)(?:s|ed|ing|)?\b[^.]{0,120}\b(api|endpoint|route|server|foundation hub|hot path)\b/,
    /\b(api|endpoint|route|server|foundation hub|hot path)\b[^.]{0,120}\b(add|build|change|update|rewrite|modify|touch)(?:s|ed|ing|)?\b/,
    /\/api\/[a-z0-9/_-]+/i,
  ])
  const performanceBudget = hasAny(searchText, [
    /\bperformance budget\b/,
    /\blatency budget\b/,
    /\bpayload budget\b/,
    /\bunder\s+\d+(?:\.\d+)?\s*(?:ms|s|sec|secs|second|seconds)\b/,
    /\b(?:bytes|kb|mb)\b/,
    /\btime_total\b/,
    /\bmax-time\b/,
    /\bcurl\b[^.]{0,160}\b(api|endpoint|route)\b/,
  ])
  if (touchesRouteSurface && routeChangeSignals && !performanceBudget) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.performanceBudget,
      'Plans changing hot route/API surfaces must include explicit latency/payload budgets and a route proof command.',
      'critical',
      { changedFiles: normalizedChangedFiles.filter(filePath => filePath === 'server.js' || filePath === 'public/foundation.js' || /^routes\//.test(filePath) || /^api\//.test(filePath)) },
    ))
  }

  const touchesCheckScript = normalizedChangedFiles.some(filePath =>
    /^scripts\/.*check.*\.mjs$/.test(filePath) || /^scripts\/process-.*\.mjs$/.test(filePath)
  )
  const writePathSignals = hasAny(searchText, [
    /\bupdatebacklogitem\s*\(/,
    /\bcreatebacklogitem\s*\(/,
    /\bupsertfoundationcurrentsprintoverlay\s*\(/,
    /\binsert\s+into\b/,
    /\bupdate\s+[a-z_]+\b/,
    /\bdelete\s+from\b/,
    /\bfs\.writefile\b|\bwritefile\s*\(/,
    /\bmutate(?:s|d|)\b[^.]{0,80}\b(live|backlog|sprint|db|database)\b/,
  ])
  const applyPosture = hasAny(searchText, [
    /--apply\b/,
    /\bapply posture\b/,
    /\bexplicit apply\b/,
    /\bread-only by default\b/,
    /\bno-flag[^.]{0,120}\bblocked\b/,
  ])
  if (touchesCheckScript && writePathSignals && !applyPosture) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.checkScriptApplyPosture,
      'Check/process scripts that write live state must be read-only by default and require explicit --apply posture.',
      'critical',
      { changedFiles: normalizedChangedFiles.filter(filePath => filePath.startsWith('scripts/')) },
    ))
  }

  const touchesVerifierOrCheck = normalizedChangedFiles.some(filePath =>
    filePath === 'scripts/foundation-verify.mjs' ||
    /^scripts\/.*check.*\.mjs$/.test(filePath) ||
    /^scripts\/process-.*\.mjs$/.test(filePath)
  )
  const liveStateRepairSignals = hasAny(searchText, [
    /\bresetfoundationdb\s*\(/,
    /\binitfoundationdb\s*\([^)]*includebootstrapseed/,
    /\bbootstrapfoundationdb\s*\(/,
    /\brepair(?:s|ed|)\b[^.]{0,120}\b(live|backlog|sprint|db|database|state)\b/,
    /\bseed(?:s|ed|)\b[^.]{0,120}\b(live|backlog|sprint|db|database|state)\b/,
    /\bwrite(?:s|)\b[^.]{0,120}\b(live|backlog|sprint|db|database|state)\b/,
  ])
  const failClosedReadOnly = hasAny(searchText, [
    /\bread-only\b/,
    /\bfail closed\b/,
    /\bfails closed\b/,
    /\bzero repairs\b/,
    /\bdoes not repair\b/,
    /\bno live-state mutation\b/,
    /\bno live state mutation\b/,
  ])
  if (touchesVerifierOrCheck && liveStateRepairSignals && !failClosedReadOnly) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.verifierReadOnly,
      'Verifier/check paths must not repair or seed live state to pass; they must fail closed and route repair to an explicit apply path.',
      'critical',
      { changedFiles: normalizedChangedFiles.filter(filePath => filePath.startsWith('scripts/')) },
    ))
  }

  const focusedProof = hasAny(searchText, [
    /\bnpm run process:[a-z0-9:-]+-check\b/,
    /\bfocused proof\b/,
    /\bdogfood proof\b/,
    /\bactual function path\b/,
    /\breal function path\b/,
    /\bsynthetic (?:failing|weak|bad)\b/,
  ])
  if (!focusedProof) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.focusedProofRequired,
      'Durable Foundation plans must name a focused proof command or actual function-path proof before full ship gates.',
    ))
  }

  const auditFixPlan = hasAny(searchText, [
    /\baudit finding\b/,
    /\bdeep audit\b/,
    /\bhardening\b/,
    /\bstructural rot\b/,
    /\bfix(?:es|ing|)\b[^.]{0,120}\b(audit|rot|failure|finding)\b/,
  ])
  const dogfoodProof = hasAny(searchText, [
    /\bdogfood\b/,
    /\brecreate(?:s|d|)\b[^.]{0,120}\bfailure\b/,
    /\bsimulate(?:s|d|)\b[^.]{0,120}\bfailure\b/,
    /\bsynthetic[^.]{0,120}\b(failure|failing|bad|weak)\b/,
    /\boriginal failure\b/,
  ])
  if (auditFixPlan && !dogfoodProof) {
    findings.push(makeFinding(
      ARCHITECTURAL_RULE_FINDING_KEYS.auditFixDogfood,
      'Audit-fix plans must dogfood the original failure mode instead of proving only that new code compiles.',
    ))
  }

  const wipProtocolResult = evaluateProcessWipProtocolPlan({
    planText,
    changedFiles: normalizedChangedFiles,
  })
  findings.push(...wipProtocolResult.findings)

  return {
    ok: findings.length === 0,
    findings,
    architectureContext,
    wipProtocol: wipProtocolResult,
  }
}
