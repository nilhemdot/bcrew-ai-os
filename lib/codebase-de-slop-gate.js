import fs from 'node:fs'
import path from 'node:path'

import { evaluatePlanCriticPlan } from './process-plan-critic.js'

export const CODEBASE_DE_SLOP_GATE_CARD_ID = 'CODEBASE-DE-SLOP-GATE-001'
export const CODEBASE_DE_SLOP_GATE_PLAN_PATH = 'docs/process/codebase-de-slop-gate-001-plan.md'
export const CODEBASE_DE_SLOP_GATE_SOURCE_NOTE_PATH = 'docs/source-notes/matt-pocock-de-slop-codebase-2026-05-25.md'
export const CODEBASE_DE_SLOP_GATE_SCRIPT_PATH = 'scripts/process-codebase-de-slop-gate-check.mjs'

export const CODEBASE_DE_SLOP_FINDING_KEYS = Object.freeze({
  changedFileScope: 'de_slop_changed_file_scope',
  existingPattern: 'de_slop_existing_pattern',
  smallestCoherentChange: 'de_slop_smallest_coherent_change',
  newPatternJustification: 'de_slop_new_pattern_justification',
  uiDesignContractProof: 'de_slop_ui_design_contract_proof',
  reportOnlyBoundary: 'de_slop_report_only_boundary',
})

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeForSearch(value) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase()
}

function hasAny(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

function normalizePath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function makeFinding(key, detail, severity = 'critical', metadata = {}) {
  return { key, detail, severity, metadata }
}

function isUiFile(filePath) {
  const normalized = normalizePath(filePath)
  return /^public\//.test(normalized) && /\.(css|html|js)$/i.test(normalized)
}

function readPlanIfPath({ planText = '', planPath = '', repoRoot = process.cwd() } = {}) {
  if (normalizeText(planText)) return planText
  const relativePath = normalizePath(planPath)
  if (!relativePath) return ''
  const absolutePath = path.resolve(repoRoot, relativePath)
  if (!absolutePath.startsWith(path.resolve(repoRoot))) return ''
  try {
    return fs.readFileSync(absolutePath, 'utf8')
  } catch {
    return ''
  }
}

export function evaluateCodebaseDeSlopGate({
  planText = '',
  planPath = '',
  card = {},
  changedFiles = [],
  declaredRisk = '',
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  const text = readPlanIfPath({ planText, planPath, repoRoot })
  const searchText = normalizeForSearch(text)
  const normalizedChangedFiles = Array.from(new Set((Array.isArray(changedFiles) ? changedFiles : [])
    .map(normalizePath)
    .filter(Boolean)))

  const planCritic = evaluatePlanCriticPlan({
    planText: text,
    card: {
      id: card.id || card.cardId || CODEBASE_DE_SLOP_GATE_CARD_ID,
      priority: card.priority || 'P0',
    },
    changedFiles: normalizedChangedFiles,
    declaredRisk,
    architecturalRules: true,
    fileLineCounts,
    repoRoot,
  })

  const findings = []
  if (!normalizedChangedFiles.length) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.changedFileScope,
      'Meaningful AI build work must name the expected changed-file scope before implementation starts.',
    ))
  }

  const namesExistingPattern = hasAny(searchText, [
    /\breuse\b/,
    /\bexisting (?:code|module|helper|pattern|script|docs|gate|proof)\b/,
    /\blocal pattern\b/,
    /\bestablished pattern\b/,
    /\bsame pattern\b/,
    /\bcurrent implementation\b/,
  ])
  if (!namesExistingPattern) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.existingPattern,
      'Plan must name the existing code or local pattern it will reuse before inventing a new shape.',
    ))
  }

  const broadWorkSignals = hasAny(searchText, [
    /\brebuild\b/,
    /\brewrite\b/,
    /\boverhaul\b/,
    /\bclean up\b/,
    /\bcleanup\b/,
    /\brefactor\b/,
    /\bupgrade\b/,
  ])
  const smallestChangeSignals = hasAny(searchText, [
    /\bsmallest coherent change\b/,
    /\bnarrow v1\b/,
    /\btight v1\b/,
    /\bbounded\b/,
    /\bnot next\b/,
    /\bout of scope\b/,
    /\bdo not\b/,
  ])
  if (broadWorkSignals && !smallestChangeSignals) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.smallestCoherentChange,
      'Broad cleanup/refactor/upgrade work must name the smallest coherent V1 and what is explicitly not next.',
    ))
  }

  const proposesNewPattern = hasAny(searchText, [
    /\bnew pattern\b/,
    /\bnew abstraction\b/,
    /\bnew framework\b/,
    /\bnew architecture\b/,
    /\bnew agent\b/,
    /\bnew runtime\b/,
  ])
  const justifiesAgainstExisting = hasAny(searchText, [
    /\binstead of\b[^.]{0,120}\bexisting\b/,
    /\bexisting\b[^.]{0,120}\bnot enough\b/,
    /\breuse\b[^.]{0,120}\bunless\b/,
    /\bdoes not fork\b/,
    /\bnot fork\b/,
    /\bno parallel\b/,
  ])
  if (proposesNewPattern && !justifiesAgainstExisting) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.newPatternJustification,
      'Plans proposing a new pattern must justify why existing local patterns are not enough.',
    ))
  }

  const touchesUi = normalizedChangedFiles.some(isUiFile)
  const designContractProof = hasAny(searchText, [
    /\bdesign contract\b/,
    /\bstyle guide\b/,
    /\bbrowser proof\b/,
    /\bplaywright\b/,
    /\bscreenshot\b/,
    /\bmobile\b[^.]{0,80}\bdesktop\b/,
    /\bdesktop\b[^.]{0,80}\bmobile\b/,
  ])
  if (touchesUi && !designContractProof) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.uiDesignContractProof,
      'UI plans must name the locked design contract and browser/screenshot proof before implementation.',
      'critical',
      { uiFiles: normalizedChangedFiles.filter(isUiFile) },
    ))
  }

  const writesSignals = hasAny(searchText, [
    /\bmutate\b/,
    /\bwrite(?:s|)\b[^.]{0,100}\b(backlog|sprint|db|database|source systems?|external)\b/,
    /\bapply\b/,
    /\bautofix\b/,
    /\bauto-fix\b/,
  ])
  const reportOnlyBoundary = hasAny(searchText, [
    /\breport-only\b/,
    /\bread-only\b/,
    /\bno backlog mutation\b/,
    /\bno external writes?\b/,
    /\bdoes not mutate\b/,
    /\bexplicit future apply path\b/,
  ])
  if (writesSignals && !reportOnlyBoundary) {
    findings.push(makeFinding(
      CODEBASE_DE_SLOP_FINDING_KEYS.reportOnlyBoundary,
      'Plans with write/apply/autofix language must name the read-only/report-only boundary or explicit apply posture.',
    ))
  }

  const planCriticFindings = (planCritic.findings || []).map(finding => ({
    ...finding,
    source: 'plan_critic',
  }))
  const extraFindings = findings.map(finding => ({
    ...finding,
    source: 'de_slop_gate',
  }))
  const allFindings = [...planCriticFindings, ...extraFindings]
  const blockingFindings = allFindings.filter(finding => ['critical', 'error'].includes(finding.severity || 'error'))
  const status = blockingFindings.length ? 'revise' : 'pass'
  const extraPenalty = extraFindings.length * 0.8
  const score = status === 'pass'
    ? Math.max(Number(planCritic.score || 0), 10)
    : Math.max(0, Math.round((Number(planCritic.score || 0) - extraPenalty) * 10) / 10)

  return {
    ok: status === 'pass',
    status,
    score,
    cardId: card.id || card.cardId || CODEBASE_DE_SLOP_GATE_CARD_ID,
    changedFiles: normalizedChangedFiles,
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
      gateDecision: planCritic.gateDecision,
    },
    findings: allFindings,
    reportOnly: true,
    writesBacklog: false,
    writesExternalSystems: false,
  }
}

function hasFinding(result, key) {
  return (result.findings || []).some(finding => finding.key === key)
}

function makeProofCase(name, result, expectation) {
  const ok = expectation(result)
  return {
    name,
    ok,
    status: result.status,
    score: result.score,
    findings: (result.findings || []).map(finding => finding.key),
  }
}

export function buildSyntheticCodebaseDeSlopGateProof({ repoRoot = process.cwd() } = {}) {
  const sloppyNoFiles = evaluateCodebaseDeSlopGate({
    planText: `
# SLOPPY Plan

## What
Clean up the codebase.

## Why
It is messy.

## Acceptance Criteria
Make it better.

## Definition Of Done
Done when it works.

## Details
Rewrite whatever needs rewriting.

## Risks
None.

## Tests
Run tests.
`,
    card: { id: 'SLOPPY-001', priority: 'P0' },
    changedFiles: [],
    declaredRisk: 'Foundation process gate',
    repoRoot,
  })

  const uiWithoutProof = evaluateCodebaseDeSlopGate({
    planText: `
# UI Plan

## What
Update the dev page.

## Why
Improve the UI.

## Acceptance Criteria
The page looks good.

## Definition Of Done
Use existing code and local pattern.

## Details
Narrow V1 update with reuse of existing module.

## Risks
Repair path is to revert the UI change.

## Tests
npm run process:dev-team-hub-v0-check -- --json
`,
    card: { id: 'UI-SLOP-001', priority: 'P0' },
    changedFiles: ['public/dev.css', 'public/dev.js'],
    declaredRisk: 'UI',
    repoRoot,
  })

  const newPatternNoJustification = evaluateCodebaseDeSlopGate({
    planText: `
# New Pattern Plan

## What
Build a new runtime pattern.

## Why
It seems useful.

## Acceptance Criteria
New pattern exists.

## Definition Of Done
Reuse existing scripts where possible.

## Details
Narrow V1, not next is broad adoption.

## Risks
Repair path is to remove the new runtime.

## Tests
npm run process:plan-critic-architectural-rules-check -- --json
`,
    card: { id: 'NEW-PATTERN-001', priority: 'P0' },
    changedFiles: ['lib/process-plan-critic.js'],
    declaredRisk: 'Foundation process gate',
    repoRoot,
  })

  const compliant = evaluateCodebaseDeSlopGate({
    planText: fs.readFileSync(path.join(repoRoot, CODEBASE_DE_SLOP_GATE_PLAN_PATH), 'utf8'),
    card: { id: CODEBASE_DE_SLOP_GATE_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/process-plan-critic.js',
      'lib/plan-critic-architectural-rules.js',
      'lib/foundation-file-size-standard.js',
      'lib/code-quality-nightly-audit.js',
      'docs/specs/bcrew-ui-design-contract.md',
    ],
    declaredRisk: 'Foundation process gate, Plan Critic, code-quality audit, UI design contract, foundation:verify',
    repoRoot,
  })

  const cases = [
    makeProofCase('rejects broad plan with no changed-file scope', sloppyNoFiles, result =>
      result.status === 'revise' && hasFinding(result, CODEBASE_DE_SLOP_FINDING_KEYS.changedFileScope)
    ),
    makeProofCase('rejects UI plan with no design/browser proof', uiWithoutProof, result =>
      result.status === 'revise' && hasFinding(result, CODEBASE_DE_SLOP_FINDING_KEYS.uiDesignContractProof)
    ),
    makeProofCase('rejects new pattern without existing-pattern justification', newPatternNoJustification, result =>
      result.status === 'revise' && hasFinding(result, CODEBASE_DE_SLOP_FINDING_KEYS.newPatternJustification)
    ),
    makeProofCase('passes compliant de-slop gate plan', compliant, result =>
      result.status === 'pass' && Number(result.score) >= 9.8
    ),
  ]

  return {
    ok: cases.every(item => item.ok),
    cases,
    reportOnly: true,
    writesBacklog: false,
    writesExternalSystems: false,
  }
}
