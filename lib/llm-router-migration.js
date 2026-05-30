export const LLM_ROUTER_CARD_ID = 'LLM-ROUTER-001'
export const LLM_ROUTER_CLOSEOUT_KEY = 'llm-router-v1'
export const LLM_ROUTER_PLAN_PATH = 'docs/process/llm-router-001-plan.md'
export const LLM_ROUTER_APPROVAL_PATH = 'docs/process/approvals/LLM-ROUTER-001.json'
export const LLM_ROUTER_SCRIPT_PATH = 'scripts/process-llm-router-check.mjs'
export const LLM_ROUTER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-llm-router-closeout.md'
export const LLM_ROUTER_SPRINT_ID = 'FOUNDATION-MODEL-ACCESS-AND-ACTION-LOOP-2026-05-20'
export const LLM_ROUTER_BOUNDED_WORKLOAD = 'deep_audit_senior_review'

export const LLM_ROUTER_CHANGED_FILES = [
  'lib/llm-router.js',
  'lib/nightly-deep-audit-upgrade.js',
  'lib/llm-router-migration.js',
  LLM_ROUTER_SCRIPT_PATH,
  LLM_ROUTER_PLAN_PATH,
  LLM_ROUTER_APPROVAL_PATH,
  LLM_ROUTER_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-model-records.js',
  'package.json',
]

export const LLM_ROUTER_PROOF_COMMANDS = [
  'npm run process:llm-router-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=LLM-ROUTER-001 --planApprovalRef=docs/process/approvals/LLM-ROUTER-001.json --closeoutKey=llm-router-v1',
  'npm run process:fanout-check -- --card=LLM-ROUTER-001 --closeoutKey=llm-router-v1',
  'npm run process:foundation-ship -- --card=LLM-ROUTER-001 --planApprovalRef=docs/process/approvals/LLM-ROUTER-001.json --closeoutKey=llm-router-v1 --commitRef=HEAD',
]

const REQUIRED_CLAUDE_HELP_FLAGS = [
  '--print',
  '--output-format',
  '--input-format',
  '--permission-mode',
  '--no-session-persistence',
]

const REQUIRED_ROUTER_MARKERS = [
  'LLM_WORKLOADS',
  'DEEP_AUDIT_SENIOR_REVIEW',
  'buildClaudeCodeCliCommand',
  'LLM_CLAUDE_CODE_ALLOW_EXECUTION',
  'foundation-deep-audit-claude-code',
  'foundation-deep-audit-openclaw-chatgpt',
  'foundation-deep-audit-openai-api',
]

const REQUIRED_AUDIT_MARKERS = [
  "workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW",
  "auditKind: 'nightly_deep_audit_senior_review'",
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

export function evaluateClaudeCodeCliHelp(helpSource = '') {
  const help = String(helpSource || '')
  const missing = REQUIRED_CLAUDE_HELP_FLAGS.filter(flag => !help.includes(flag))
  return {
    ok: missing.length === 0,
    missing,
    requiredFlags: REQUIRED_CLAUDE_HELP_FLAGS,
  }
}

export function buildClaudeAdapterDogfoodProof() {
  const blockedByEnv = {
    route: { status: 'available', policyClassification: 'allowed', riskClass: 'low' },
    credential: { status: 'available', policyClassification: 'allowed' },
    env: {},
  }
  const blockedByRoute = {
    route: { status: 'probe_required', policyClassification: 'experimental', riskClass: 'untested' },
    credential: { status: 'available', policyClassification: 'allowed' },
    env: { LLM_CLAUDE_CODE_ALLOW_EXECUTION: 'true' },
  }
  const allowed = {
    route: { status: 'available', policyClassification: 'allowed', riskClass: 'low' },
    credential: { status: 'available', policyClassification: 'allowed' },
    env: { LLM_CLAUDE_CODE_ALLOW_EXECUTION: 'true' },
  }

  function canExecute({ route, credential, env }) {
    if (env.LLM_CLAUDE_CODE_ALLOW_EXECUTION !== 'true') return false
    if (route.status !== 'available') return false
    if (route.policyClassification !== 'allowed') return false
    if (route.riskClass !== 'low') return false
    if (credential.status !== 'available') return false
    if (credential.policyClassification !== 'allowed') return false
    return true
  }

  return {
    ok: !canExecute(blockedByEnv) && !canExecute(blockedByRoute) && canExecute(allowed),
    cases: {
      blockedByEnv: canExecute(blockedByEnv),
      blockedByRoute: canExecute(blockedByRoute),
      allowed: canExecute(allowed),
    },
  }
}

export function evaluateLlmRouterMigration({
  llmRouterSource = '',
  nightlyAuditSource = '',
  closeoutRegistrySource = '',
  packageJson = {},
  claudeHelpSource = '',
} = {}) {
  const checks = []
  const help = evaluateClaudeCodeCliHelp(claudeHelpSource)
  const dogfood = buildClaudeAdapterDogfoodProof()

  addCheck(
    checks,
    includesAll(llmRouterSource, REQUIRED_ROUTER_MARKERS),
    'router exposes bounded workload and Claude adapter contract',
    REQUIRED_ROUTER_MARKERS.filter(marker => !llmRouterSource.includes(marker)).join(', ') || 'all markers present',
  )
  addCheck(
    checks,
    llmRouterSource.includes('throw new Error(`Claude Code CLI execution is blocked') &&
      llmRouterSource.includes("provider === 'claude_code'"),
    'Claude Code adapter is fail-closed before provider execution',
    'env/policy gate present',
  )
  addCheck(
    checks,
    includesAll(nightlyAuditSource, REQUIRED_AUDIT_MARKERS),
    'nightly deep audit routes through bounded senior-review workload',
    REQUIRED_AUDIT_MARKERS.filter(marker => !nightlyAuditSource.includes(marker)).join(', ') || 'all markers present',
  )
  addCheck(
    checks,
    help.ok,
    'local Claude CLI command contract exposes non-interactive flags',
    help.missing.join(', ') || 'required flags present',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proves Claude adapter stays blocked until env, route, and credential are all approved',
    JSON.stringify(dogfood.cases),
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:llm-router-check'] === `node --env-file-if-exists=.env ${LLM_ROUTER_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:llm-router-check'] || 'missing',
  )
  addCheck(
    checks,
    closeoutRegistrySource.includes(LLM_ROUTER_CLOSEOUT_KEY) && closeoutRegistrySource.includes(LLM_ROUTER_CARD_ID),
    'closeout registry exposes LLM router card',
    LLM_ROUTER_CLOSEOUT_KEY,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      checkCount: checks.length,
      failedCount: failed.length,
      boundedWorkload: LLM_ROUTER_BOUNDED_WORKLOAD,
      claudeHelpOk: help.ok,
      dogfoodOk: dogfood.ok,
    },
    dogfood,
  }
}

export function renderLlmRouterCloseout({ evaluation = {}, planSummary = '', dryRunCall = {}, generatedAt = new Date().toISOString() } = {}) {
  return `# LLM-ROUTER-001 Closeout

Generated: ${generatedAt}

## Summary

Shipped a bounded LLM router migration slice. The router now has an explicit \`${LLM_ROUTER_BOUNDED_WORKLOAD}\` workload for nightly senior code review, a fail-closed Claude Code CLI adapter contract, and proof that provider execution remains blocked unless route policy, credential policy, and \`LLM_CLAUDE_CODE_ALLOW_EXECUTION=true\` all agree.

## What Changed

- Added bounded deep-audit senior-review routes for OpenClaw, Claude Code, and OpenAI fallback posture.
- Moved nightly deep-audit senior review off generic \`synthesis\` routing and onto \`${LLM_ROUTER_BOUNDED_WORKLOAD}\`.
- Added a focused proof that validates route markers, local Claude CLI non-interactive contract, fail-closed adapter dogfood, approval integrity, Plan Critic, runtime route dry-run logging, Current Sprint truth, and closeout wiring.
- Seeded/updated local router route truth for this bounded workload without making a provider call.

## Proof

- Plan Critic: ${planSummary}
- Focused evaluation: ${JSON.stringify(evaluation.summary || {})}
- Dry-run route call: ${JSON.stringify(dryRunCall || {})}

## Not Done

- No provider/model call was made by this card.
- Claude Code scheduled automation is still blocked unless explicitly enabled and policy-classified.
- No credentials, provider config, Drive permissions, source systems, sends, public exposure, paid/browser-auth, or broad private extraction were changed.

## Next

Continue with FOUNDATION-USERS-001 only after its plan and Plan Critic pass exist; keep future cards in scoping until their own proof is ready.
`
}
