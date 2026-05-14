import { classifyVerificationGateForFiles } from './process-verify-gate-tiering.js'
import {
  ARCHITECTURAL_RULE_FINDING_KEYS,
  PLAN_CRITIC_ARCHITECTURAL_RULES_APPROVAL_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
  PLAN_CRITIC_ARCHITECTURAL_RULES_PLAN_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SPRINT_ID,
  evaluatePlanCriticArchitecturalRules,
} from './plan-critic-architectural-rules.js'

export const PLAN_CRITIC_REPLACEMENT_CARD_ID = 'PLAN-CRITIC-REPLACEMENT-001'
export const PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY = 'plan-critic-replacement-v1'
export const PLAN_CRITIC_REPLACEMENT_PLAN_PATH = 'docs/process/plan-critic-replacement-001-plan.md'
export const PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH = 'docs/process/approvals/PLAN-CRITIC-REPLACEMENT-001.json'
export const PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH = 'scripts/process-plan-critic-check.mjs'
export const PLAN_CRITIC_DECISION_TREE_PATH = 'docs/process/foundation-gate-decision-tree.md'
export const PLAN_CRITIC_MIN_PASS_SCORE = 9.8
export const PLAN_CRITIC_SUMMARY_MARKER = 'PLAN_CRITIC_REPLACEMENT_SUMMARY'
export const PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY = 'root_vs_patch_invariant'
export {
  ARCHITECTURAL_RULE_FINDING_KEYS,
  PLAN_CRITIC_ARCHITECTURAL_RULES_APPROVAL_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
  PLAN_CRITIC_ARCHITECTURAL_RULES_PLAN_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SPRINT_ID,
}

export const PLAN_CRITIC_REQUIRED_PLAN_SECTIONS = [
  'What',
  'Why',
  'Acceptance Criteria',
  'Definition Of Done',
  'Details',
  'Risks',
  'Tests',
]

export const PLAN_CRITIC_SCORING_SCHEMA = [
  {
    key: 'seven_section_plan',
    maxScore: 1.4,
    description: 'The plan has the seven required Foundation planning sections.',
  },
  {
    key: 'tight_scope_and_not_next',
    maxScore: 1.2,
    description: 'Scope is narrow and explicit not-next boundaries prevent sprint drift.',
  },
  {
    key: 'reuse_existing_work',
    maxScore: 1.0,
    description: 'Plan names existing code, docs, scripts, and policy it will reuse instead of rebuilding.',
  },
  {
    key: 'behavior_not_substring',
    maxScore: 2.0,
    description: 'Proof calls real behavior or a focused process path and rejects substring-only verifier theatre.',
  },
  {
    key: PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
    maxScore: 0,
    description: 'Critical rule: verifier/dashboard symptom patches must prove the underlying invariant, not only silence the visible failure.',
  },
  {
    key: 'acceptance_and_done_are_concrete',
    maxScore: 1.2,
    description: 'Acceptance criteria and Definition of Done are observable, bounded, and tied to the card.',
  },
  {
    key: 'rollback_or_repair_path',
    maxScore: 1.0,
    description: 'Plan names the repair, rollback, or follow-up path if proof fails or behavior regresses.',
  },
  {
    key: 'gate_decision_tree',
    maxScore: 1.0,
    description: 'Plan chooses static, focused, or full verification based on blast radius.',
  },
  {
    key: 'operator_value',
    maxScore: 0.8,
    description: 'Plan explains the useful operator behavior this unlocks, not just process proof.',
  },
  {
    key: 'speed_bounded',
    maxScore: 0.4,
    description: 'Plan keeps the gate fast enough that it will be used instead of bypassed.',
  },
]

const CRITICAL_FINDING_KEYS = new Set([
  'behavior_not_substring',
  PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
  'rollback_or_repair_path',
  'gate_decision_tree',
  'tight_scope_and_not_next',
])

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeForSearch(value) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase()
}

function hasAny(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

function countListSignals(text, patterns = []) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

function hasHeading(planText, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, 'im').test(planText)
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

function makeFinding(key, detail, severity = 'error') {
  return { key, detail, severity }
}

function scoreBySignals({ key, maxScore, ok, detail, severity = 'error', critical = false }) {
  return {
    key,
    maxScore,
    score: ok ? maxScore : 0,
    findings: ok ? [] : [makeFinding(key, detail, critical || CRITICAL_FINDING_KEYS.has(key) ? 'critical' : severity)],
  }
}

export function classifyFoundationGateDecision({ changedFiles = [], declaredRisk = '' } = {}) {
  const gate = classifyVerificationGateForFiles(changedFiles)
  const riskText = normalizeForSearch(declaredRisk)
  const fullRisk = /\b(server|security|auth|tier|role|schema|database|postgres|package|dependency|canonical verifier|foundation:verify|runtime|worker|extraction|intelligence write|source contract)\b/.test(riskText)
  if (fullRisk && gate.level !== 'full') {
    return {
      ...gate,
      level: 'full',
      fullVerifyRequired: true,
      focusedProofAllowed: false,
      reasons: [
        ...gate.reasons,
        'declared risk touches full-risk Foundation substrate',
      ],
      commands: ['npm run process:foundation-ship -- --card=<shipping-card> --closeoutKey=<closeout-key>'],
    }
  }
  return gate
}

export function evaluatePlanCriticPlan({
  planText,
  card = {},
  changedFiles = [],
  declaredRisk = '',
  architecturalRules = false,
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  const text = normalizeText(planText)
  const searchText = normalizeForSearch(text)
  const cardId = normalizeText(card.id || card.cardId || PLAN_CRITIC_REPLACEMENT_CARD_ID)
  const priority = normalizeText(card.priority || 'P0')
  const results = []

  const missingSections = PLAN_CRITIC_REQUIRED_PLAN_SECTIONS.filter(section => !hasHeading(text, section))
  const sectionScore = missingSections.length
    ? roundScore(1.4 * ((PLAN_CRITIC_REQUIRED_PLAN_SECTIONS.length - missingSections.length) / PLAN_CRITIC_REQUIRED_PLAN_SECTIONS.length))
    : 1.4
  results.push({
    key: 'seven_section_plan',
    maxScore: 1.4,
    score: sectionScore,
    findings: missingSections.length
      ? [makeFinding('seven_section_plan', `Missing required section(s): ${missingSections.join(', ')}.`)]
      : [],
  })

  const hasNotNext = hasAny(searchText, [
    /\bnot next\b/,
    /\bnot-next\b/,
    /\bout of scope\b/,
    /\bdo not\b/,
  ])
  const tightScopeSignals = countListSignals(searchText, [
    /\bv1\b/,
    /\bnarrow\b|\btight\b|\bbounded\b/,
    /\bcard\b/,
    /\bno\b|\bnot\b|\bwithout\b/,
  ])
  results.push(scoreBySignals({
    key: 'tight_scope_and_not_next',
    maxScore: 1.2,
    ok: hasNotNext && tightScopeSignals >= 3,
    detail: 'Plan must name tight V1 scope and explicit not-next boundaries.',
    critical: true,
  }))

  const reuseSignals = countListSignals(searchText, [
    /\bexisting code\b|\bexisting library\b|\breuse\b|\breused\b/,
    /\bexisting docs\b|\bcurrent plan\b|\bcurrent state\b/,
    /\bexisting scripts\b|\bproof script\b/,
    /\blive backlog\b|\bcurrent sprint\b/,
  ])
  results.push(scoreBySignals({
    key: 'reuse_existing_work',
    maxScore: 1.0,
    ok: reuseSignals >= 3,
    detail: 'Plan must name existing code/docs/scripts/backlog truth it will reuse.',
  }))

  const behaviorSignals = countListSignals(searchText, [
    /\bbehavior\b|\bbehaviour\b/,
    /\bblack-box\b|\bblack box\b|\bapi\b|\broute\b/,
    /\bfunction path\b|\bactual function\b|\breal function\b|\bround-trip\b|\bround trip\b/,
    /\bsynthetic weak plan\b|\breject weak\b|\bdogfood\b/,
  ])
  const substringRisk = hasAny(searchText, [
    /\bsubstring-only\b/,
    /\bstring match\b|\bstring-match\b/,
    /\bsource-substring\b/,
    /currentstate\.includes/,
    /\.includes\(/,
  ])
  const rejectsSubstringProof = hasAny(searchText, [
    /\breject[^.]{0,120}\bsubstring\b/,
    /\bfail[^.]{0,120}\bsubstring\b/,
    /\bno substring-only\b/,
    /\bnot accept[^.]{0,120}\bsubstring\b/,
    /\bsubstring-only[^.]{0,120}\brejected\b/,
  ])
  const behaviorOk = behaviorSignals >= 3 && (!substringRisk || rejectsSubstringProof)
  const p0RequiresBehavior = /^P0$/i.test(priority)
  results.push(scoreBySignals({
    key: 'behavior_not_substring',
    maxScore: 2.0,
    ok: behaviorOk && (!p0RequiresBehavior || behaviorSignals >= 3),
    detail: substringRisk && !rejectsSubstringProof
      ? 'Plan mentions substring/string-match proof without explicitly rejecting or justifying it.'
      : 'P0 plans must prove behavior through function/API/process paths, not markers.',
    critical: true,
  }))

  const symptomPatchSurfaceRisk = hasAny(searchText, [
    /\bverifier\b|\bfoundation:verify\b/,
    /\bdashboard\b|\bruntime health\b|\bsprint command\b/,
    /\bcurrent sprint\b|\bactive blocker\b/,
    /\bdoctrine missing\b|\bwarning\b|\bcheck\b|\bgate\b/,
  ]) && hasAny(searchText, [
    /\bescape hatch\b|\bbypass condition\b/,
    /\bforce pass\b|\bauto-pass\b|\bautomatically pass\b/,
    /\bignore[^.]{0,80}\bfail/,
    /\bmake[^.]{0,80}\bpass/,
    /\bcurrent blocker[^.]{0,80}\bpass\b|\bactive blocker[^.]{0,80}\bpass\b/,
    /\bactive sprint[^.]{0,80}\bpass\b/,
    /\bactivesprintatorpast\b/,
    /\|\|/,
  ])
  const rootCauseSignals = countListSignals(searchText, [
    /\broot cause\b|\broot-cause\b/,
    /\broot invariant\b|\bunderlying invariant\b|\bactual invariant\b/,
    /\bwhat the check should prove\b|\bcheck should prove\b/,
  ])
  const invariantProofSignals = countListSignals(searchText, [
    /\bactual artifact\b|\bshipped artifact\b|\bcloseout\b|\blive backlog\b|\bdatabase\b|\bdb\b/,
    /\bactual function\b|\bfunction path\b|\bapi\b|\broute\b|\bround-trip\b|\bround trip\b|\breal behavior\b/,
    /\bsynthetic weak\b|\breject weak\b|\brevise\b|\bfail closed\b/,
    /\bnot[^.]{0,120}\b(active sprint|current blocker|escape|bypass|silence|suppress)/,
  ])
  results.push(scoreBySignals({
    key: PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
    maxScore: 0,
    ok: !symptomPatchSurfaceRisk || (rootCauseSignals >= 1 && invariantProofSignals >= 2),
    detail: 'Plans that silence verifier/dashboard symptoms must name the root invariant and prove it through artifacts, DB/API/function behavior, or a synthetic failing case.',
    critical: true,
  }))

  const acceptanceSignals = countListSignals(searchText, [
    /\bacceptance criteria\b/,
    /\bdefinition of done\b/,
    /\bproof command\b|\bnpm run\b/,
    /\bscore\b|\bpass\b|\brevise\b/,
    new RegExp(cardId.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  ])
  results.push(scoreBySignals({
    key: 'acceptance_and_done_are_concrete',
    maxScore: 1.2,
    ok: acceptanceSignals >= 5,
    detail: 'Acceptance criteria and DoD must be concrete, card-specific, and command-proven.',
  }))

  const rollbackOk = hasAny(searchText, [
    /\brollback\b/,
    /\brepair path\b/,
    /\breopen\b/,
    /\brevert\b/,
    /\bfail closed\b/,
    /\bfollow-up\b/,
  ])
  results.push(scoreBySignals({
    key: 'rollback_or_repair_path',
    maxScore: 1.0,
    ok: rollbackOk,
    detail: 'Plan must say what happens when proof fails or behavior regresses.',
    critical: true,
  }))

  const gateDecision = classifyFoundationGateDecision({ changedFiles, declaredRisk: declaredRisk || text })
  const gateSignals = countListSignals(searchText, [
    /\bstatic\b/,
    /\bfocused\b/,
    /\bfull\b/,
    /\bblast radius\b/,
    /\bprocess:foundation-ship\b|\bfoundation:verify\b|\bprocess:[a-z0-9:-]+-check\b/,
  ])
  results.push(scoreBySignals({
    key: 'gate_decision_tree',
    maxScore: 1.0,
    ok: gateSignals >= 4 && ['none', 'static', 'focused', 'full'].includes(gateDecision.level),
    detail: 'Plan must choose static, focused, or full gates from the decision tree.',
    critical: true,
  }))

  const operatorSignals = countListSignals(searchText, [
    /\boperator\b/,
    /\bsteve\b|\bnick\b|\bteam\b/,
    /\breal workflow\b|\buseful thing\b|\bproduct behavior\b/,
    /\bunlocks\b|\bspeed\b|\bquality\b/,
  ])
  results.push(scoreBySignals({
    key: 'operator_value',
    maxScore: 0.8,
    ok: operatorSignals >= 3,
    detail: 'Plan must name useful operator behavior, not only process artifacts.',
  }))

  const speedOk = hasAny(searchText, [
    /\bfast\b/,
    /\bthin\b/,
    /\bunder\s+\d+\s+minutes?\b/,
    /\bproportional\b/,
    /\bnot another heavy\b/,
  ])
  results.push(scoreBySignals({
    key: 'speed_bounded',
    maxScore: 0.4,
    ok: speedOk,
    detail: 'Plan must keep the gate fast enough to use by default.',
  }))

  if (architecturalRules) {
    const architecturalRuleResult = evaluatePlanCriticArchitecturalRules({
      planText,
      changedFiles,
      fileLineCounts,
      repoRoot,
    })
    results.push({
      key: 'architectural_rot_rules',
      maxScore: 0,
      score: 0,
      findings: architecturalRuleResult.findings,
      architectureContext: architecturalRuleResult.architectureContext,
    })
  }

  const score = roundScore(results.reduce((sum, result) => sum + result.score, 0))
  const findings = results.flatMap(result => result.findings)
  const status = score >= PLAN_CRITIC_MIN_PASS_SCORE &&
    !findings.some(finding => finding.severity === 'critical')
    ? 'pass'
    : 'revise'

  return {
    status,
    score,
    maxScore: 10,
    passThreshold: PLAN_CRITIC_MIN_PASS_SCORE,
    cardId,
    priority,
    gateDecision,
    results,
    findings,
  }
}

export function buildPlanCriticResultSummary(result = {}) {
  const findingText = Array.isArray(result.findings) && result.findings.length
    ? result.findings.map(finding => `${finding.key}: ${finding.detail}`).join(' | ')
    : 'no findings'
  return `status=${result.status || 'unknown'} score=${result.score ?? 'n/a'}/10 gate=${result.gateDecision?.level || 'unknown'} findings=${findingText}`
}

export function buildSyntheticPlanCriticProof() {
  const strongPlan = `
# PLAN-CRITIC-REPLACEMENT-001 Plan

## What
Build a thin V1 Plan Critic gate for card PLAN-CRITIC-REPLACEMENT-001. This is a fast pre-build checker, not another heavy agent framework.

## Why
Steve needs speed with quality. The useful operator value is catching weak plans before they create process proof over product behavior.

## Acceptance Criteria
- The gate returns pass or revise with score.
- It rejects substring-only proof and string match verifier theatre.
- It dogfoods itself with a synthetic weak plan and a strong plan.
- Proof command is npm run process:plan-critic-check.

## Definition Of Done
- Existing code from current sprint and process proof scripts is reused.
- Current Sprint and live backlog record the card.
- The proof calls actual function path evaluatePlanCriticPlan and not only marker checks.

## Details
Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, or full based on blast radius.

## Risks
Risk is adding process drag. Repair path is fail closed, revise the plan, or reopen the card if behavior proof is weak.

## Tests
Run npm run process:plan-critic-check, npm run backlog:hygiene -- --json, and full process:foundation-ship for full-risk edits.

## Not Next
Do not build Agent Factory, generic reviewer personas, Strategy Hub, Marketing pipeline, or broad verifier cleanup in this V1.
`
  const weakPlan = `
# Weak Plan

## What
Add a status note and verifier check.

## Why
Close the card.

## Acceptance Criteria
- currentState.includes('done')

## Definition Of Done
- A string match exists.
`
  const broadPlan = `
# Broad Plan

## What
Build Plan Critic, Agent Factory, Telegram bots, Marketing pipeline, Strategy Hub, and every verifier cleanup in one pass.

## Why
Move faster.

## Acceptance Criteria
- Everything exists.

## Definition Of Done
- Ship the whole rebuild.

## Details
No existing code is named and no focused proof command is selected.

## Risks
May take a while.

## Tests
Run it manually.
`
  const symptomPatchPlan = `
# SYNTHETIC-ESCAPE-PATCH-001 Plan

## What
Patch the Foundation verifier and dashboard warning so the card closes faster. Add an escape hatch: if activeSprintAtOrPast is true or the current active blocker is later in the sprint, make the stale check pass.

## Why
Steve needs speed with quality. The useful operator value is fewer noisy warnings during the sprint.

## Acceptance Criteria
- The dashboard no longer shows the warning.
- The verifier check passes when the active sprint is later.
- Proof command is npm run process:plan-critic-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The focused proof calls evaluatePlanCriticPlan and checks the dashboard API behavior.
- String match proof is rejected; this uses a real function path.

## Details
This is a narrow, fast V1 card with not-next boundaries. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, or full based on blast radius.

## Risks
Risk is process drag. Repair path is fail closed, revise, or reopen if the proof fails.

## Tests
Run npm run process:plan-critic-check and process:foundation-ship for full-risk verifier edits.

## Not Next
Do not build Agent Factory, Strategy Hub, connectors, or a broad verifier rewrite.
`
  const rootInvariantPlan = `
# SYNTHETIC-ROOT-INVARIANT-001 Plan

## What
Refactor the Foundation verifier/dashboard check so it proves the root invariant instead of adding an escape hatch. The root invariant is: an old sprint check stays green only when the shipped artifact, live Backlog card, and verified closeout for that card still exist.

## Why
Steve needs speed with quality. The useful operator value is that stale dashboard warnings are fixed by proving the underlying invariant, not by hiding a failure when the active sprint moves on.

## Acceptance Criteria
- The check states what the check should prove: shipped artifact, live Backlog lane, and verified closeout still exist.
- A synthetic weak plan with activeSprintAtOrPast receives revise.
- Proof command is npm run process:plan-critic-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The proof calls the actual function path evaluatePlanCriticPlan and inspects findings for ${PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY}.
- Substring-only proof is rejected.

## Details
This is a narrow, fast, proportional V1 card with not-next boundaries. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, and full based on blast radius. The focused behavior proof uses a real function path and a synthetic weak escape-condition plan.

## Risks
Risk is making Plan Critic vague or slow. Repair path is fail closed, revise the plan, or reopen this card if a symptom patch passes without root invariant proof.

## Tests
Run npm run process:plan-critic-check and process:foundation-ship for full-risk verifier edits.

## Not Next
Do not build Agent Factory, Strategy Hub, connectors, or a broad verifier rewrite.
`

  const strong = evaluatePlanCriticPlan({
    planText: strongPlan,
    card: { id: PLAN_CRITIC_REPLACEMENT_CARD_ID, priority: 'P0' },
    changedFiles: [PLAN_CRITIC_REPLACEMENT_PLAN_PATH, PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH],
  })
  const weak = evaluatePlanCriticPlan({
    planText: weakPlan,
    card: { id: 'SYNTHETIC-WEAK-P0', priority: 'P0' },
    changedFiles: ['scripts/foundation-verify.mjs'],
  })
  const broad = evaluatePlanCriticPlan({
    planText: broadPlan,
    card: { id: 'SYNTHETIC-BROAD-P0', priority: 'P0' },
    changedFiles: ['server.js', 'lib/foundation-db.js'],
  })
  const symptomPatch = evaluatePlanCriticPlan({
    planText: symptomPatchPlan,
    card: { id: 'SYNTHETIC-ESCAPE-PATCH-001', priority: 'P0' },
    changedFiles: ['scripts/foundation-verify.mjs', 'public/foundation.js'],
  })
  const rootInvariant = evaluatePlanCriticPlan({
    planText: rootInvariantPlan,
    card: { id: 'SYNTHETIC-ROOT-INVARIANT-001', priority: 'P0' },
    changedFiles: ['scripts/foundation-verify.mjs', 'public/foundation.js'],
  })

  return {
    ok: strong.status === 'pass' &&
      weak.status === 'revise' &&
      broad.status === 'revise' &&
      symptomPatch.status === 'revise' &&
      rootInvariant.status === 'pass' &&
      weak.findings.some(finding => finding.key === 'behavior_not_substring') &&
      broad.findings.some(finding => finding.key === 'tight_scope_and_not_next') &&
      symptomPatch.findings.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY) &&
      !rootInvariant.findings.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY),
    strong,
    weak,
    broad,
    symptomPatch,
    rootInvariant,
  }
}

export function buildSyntheticPlanCriticArchitecturalRulesProof() {
  const fileLineCounts = {
    'lib/foundation-db.js': 19494,
    'scripts/foundation-verify.mjs': 13695,
    'scripts/process-danger-check.mjs': 240,
    'lib/plan-critic-architectural-rules.js': 280,
    'server.js': 7790,
  }
  const strongPlanBase = `
# PLAN-CRITIC-ARCHITECTURAL-RULES-001 Plan

## What
Build a narrow V1 Plan Critic architecture guardrail. This is fast and proportional, not another heavy reviewer framework.

## Why
Steve and the team need a real workflow guard that improves quality and speed by catching architectural rot before implementation.

## Acceptance Criteria
- The proof calls the actual function path evaluatePlanCriticPlan.
- Substring-only proof is rejected.
- Dogfood proof uses synthetic bad plans.
- Proof command is npm run process:plan-critic-architectural-rules-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The compliant plan passes and the synthetic bad plans revise.
- Full process:foundation-ship runs before push.

## Details
Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth. Gate decision tree uses static, focused, and full based on blast radius. Focused proof covers function behavior; full proof covers the final ship gate.

## Risks
Risk is blocking valid work. Repair path is fail closed, revise the plan, or reopen the card if a valid compliant plan is blocked.

## Tests
Run npm run process:plan-critic-architectural-rules-check, npm run backlog:hygiene -- --json, npm run foundation:verify, and process:foundation-ship.

## Not Next
Do not build performance fixes, monolith refactors, product features, Build Intel extraction, or autonomous dev behavior.
`

  const largeFileNoSplitPlan = `${strongPlanBase}

Add new backlog write behavior directly to lib/foundation-db.js. Keep it simple and put the new helper in that file.
`
  const checkWriteNoApplyPlan = `${strongPlanBase}

Add a process check script at scripts/process-danger-check.mjs that calls updateBacklogItem() and writes sprint state from the check command.
`
  const verifierLiveStatePlan = `${strongPlanBase.replace(
    'Repair path is fail closed, revise the plan, or reopen the card if a valid compliant plan is blocked.',
    'Repair path is manual follow-up after the check reports status.',
  )}

Patch scripts/foundation-verify.mjs so it calls resetFoundationDb() and repairs live backlog state before reporting success. Split plan: extract any helper to a new module outside the monolith and keep scripts/foundation-verify.mjs as a thin wrapper only.
`
  const auditFixNoDogfoodPlan = `
# AUDIT-FIX-WITHOUT-REAL-PROOF-001 Plan

## What
Fix the deep audit finding by adding a new guard.

## Why
Steve and the team need quality and speed in the real Foundation workflow.

## Acceptance Criteria
- The actual function path rejects the bad behavior.
- Substring-only proof is rejected.
- The proof command is npm run process:plan-critic-architectural-rules-check.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- The behavior proof calls evaluatePlanCriticPlan through the real function path.

## Details
This is a narrow, fast V1 with explicit not-next boundaries. Gate decision tree uses static, focused, and full based on blast radius.

## Risks
Repair path is fail closed and revise.

## Tests
Run npm run process:plan-critic-architectural-rules-check and process:foundation-ship.

## Not Next
Do not build broad refactors.
`
  const noFocusedProofPlan = `
# NO-FOCUSED-PROOF-001 Plan

## What
Add a narrow V1 guardrail.

## Why
Steve and the team need quality and speed in the real Foundation workflow.

## Acceptance Criteria
- The code exists.
- Substring-only proof is rejected.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.

## Details
Gate decision tree uses static, focused, and full based on blast radius.

## Risks
Repair path is fail closed and revise.

## Tests
Run full verification manually.

## Not Next
Do not build broad refactors.
`
  const hotRouteNoBudgetPlan = `${strongPlanBase}

Add a new API endpoint in server.js for a Foundation Hub hot path. Keep the change simple and skip timing until later.
`
  const compliantPlan = `${strongPlanBase}

Touch lib/foundation-db.js only as a thin wrapper and put new responsibility in a new module. Split plan: extract the new behavior to lib/plan-critic-architectural-rules.js, keep the monolith unchanged except for a narrow import/call, and do not add new responsibility to the large file.

For scripts/process-danger-check.mjs, any live write path is read-only by default and requires explicit --apply posture. No-flag writes are blocked.

For scripts/foundation-verify.mjs, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

For server.js route or API work, the plan includes a performance budget: default route under 5 seconds and under 1 MB, with a curl route proof command using --max-time and time_total/bytes output.

Dogfood proof recreates the original failure modes with synthetic failing plans and proves the new code blocks them.
`

  const commonOptions = {
    card: { id: PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID, priority: 'P1' },
    architecturalRules: true,
    fileLineCounts,
  }
  const largeFileNoSplit = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: largeFileNoSplitPlan,
    changedFiles: ['lib/foundation-db.js'],
  })
  const checkWriteNoApply = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: checkWriteNoApplyPlan,
    changedFiles: ['scripts/process-danger-check.mjs'],
  })
  const verifierLiveState = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: verifierLiveStatePlan,
    changedFiles: ['scripts/foundation-verify.mjs'],
  })
  const auditFixNoDogfood = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: auditFixNoDogfoodPlan,
    changedFiles: ['lib/plan-critic-architectural-rules.js'],
  })
  const noFocusedProof = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: noFocusedProofPlan,
    changedFiles: ['lib/plan-critic-architectural-rules.js'],
  })
  const hotRouteNoBudget = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: hotRouteNoBudgetPlan,
    changedFiles: ['server.js'],
  })
  const compliant = evaluatePlanCriticPlan({
    ...commonOptions,
    planText: compliantPlan,
    changedFiles: ['lib/foundation-db.js', 'scripts/process-danger-check.mjs', 'scripts/foundation-verify.mjs', 'server.js'],
  })

  return {
    ok: largeFileNoSplit.status === 'revise' &&
      checkWriteNoApply.status === 'revise' &&
      verifierLiveState.status === 'revise' &&
      auditFixNoDogfood.status === 'revise' &&
      noFocusedProof.status === 'revise' &&
      hotRouteNoBudget.status === 'revise' &&
      compliant.status === 'pass' &&
      largeFileNoSplit.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.largeFileSplitPlan) &&
      checkWriteNoApply.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.checkScriptApplyPosture) &&
      verifierLiveState.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.verifierReadOnly) &&
      auditFixNoDogfood.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.auditFixDogfood) &&
      noFocusedProof.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.focusedProofRequired) &&
      hotRouteNoBudget.findings.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.performanceBudget),
    largeFileNoSplit,
    checkWriteNoApply,
    verifierLiveState,
    auditFixNoDogfood,
    noFocusedProof,
    hotRouteNoBudget,
    compliant,
  }
}
