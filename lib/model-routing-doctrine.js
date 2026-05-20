export const MODEL_ROUTING_CARD_ID = 'MODEL-ROUTING-001'
export const MODEL_ROUTING_CLOSEOUT_KEY = 'model-routing-v1'
export const MODEL_ROUTING_PLAN_PATH = 'docs/process/model-routing-001-plan.md'
export const MODEL_ROUTING_APPROVAL_PATH = 'docs/process/approvals/MODEL-ROUTING-001.json'
export const MODEL_ROUTING_SCRIPT_PATH = 'scripts/process-model-routing-check.mjs'
export const MODEL_ROUTING_RUNTIME_MAP_PATH = 'docs/rebuild/current-runtime-map.md'
export const MODEL_ROUTING_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-model-routing-closeout.md'
export const MODEL_ROUTING_SPRINT_ID = 'FOUNDATION-MODEL-ACCESS-AND-ACTION-LOOP-2026-05-20'

export const MODEL_ROUTING_CHANGED_FILES = [
  MODEL_ROUTING_RUNTIME_MAP_PATH,
  'lib/model-routing-doctrine.js',
  MODEL_ROUTING_SCRIPT_PATH,
  MODEL_ROUTING_PLAN_PATH,
  MODEL_ROUTING_APPROVAL_PATH,
  MODEL_ROUTING_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-model-records.js',
  'lib/foundation-build-closeout-records.js',
  'package.json',
]

export const MODEL_ROUTING_PROOF_COMMANDS = [
  'npm run process:model-routing-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1',
  'npm run process:fanout-check -- --card=MODEL-ROUTING-001 --closeoutKey=model-routing-v1',
  'npm run process:foundation-ship -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1 --commitRef=HEAD',
]

const REQUIRED_WORKLOAD_TERMS = [
  'Cheap classification, tagging, dedupe, and skip-reason labeling',
  'Embeddings and retrieval indexing',
  'Current-day extraction helpers and bounded structured extraction',
  'Synthesis, daily pulse, and strategic summaries',
  'Scoper deep tool use and gap resolution',
  'Coding, repo investigation, and reviews',
  'Heartbeats, audits, health summaries, and repeated-failure repair',
  'High-stakes legal, financial, security, people, or access decisions',
  'Video, screenshots, OCR, and multimodal training extraction',
]

const REQUIRED_ROUTE_FIELDS = [
  'workload class',
  'route key and provider family',
  'auth path class',
  'probe status',
  'cost owner and cap',
  'fallback route or parked state',
  'privacy/tier boundary',
  'source IDs touched',
  'stop control',
]

const EXACT_MODEL_PATTERNS = [
  /\bopenai-codex\/gpt-[0-9][a-z0-9.\-]*\b/i,
  /\bgpt-[0-9][a-z0-9.\-]*\b/i,
  /\bclaude-[0-9][a-z0-9.\-]*\b/i,
  /\bgemini-[0-9][a-z0-9.\-]*\b/i,
]

function normalizeText(value) {
  return String(value || '').trim()
}

function includesAll(source = '', terms = []) {
  return terms.every(term => source.includes(term))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function sectionText(source = '', heading = '') {
  const lines = String(source || '').split(/\r?\n/)
  const headingPattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
  const start = lines.findIndex(line => headingPattern.test(line))
  if (start < 0) return ''
  const body = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) break
    body.push(lines[index])
  }
  return body.join('\n')
}

function findDisallowedExactModels(runtimeMapSource = '') {
  const modelSection = sectionText(runtimeMapSource, 'Model Routing Doctrine') || runtimeMapSource
  const lines = modelSection.split(/\r?\n/)
  const findings = []
  lines.forEach((line, index) => {
    if (/exact model IDs live in route configuration/i.test(line)) return
    if (/Do not hardcode exact model IDs/i.test(line)) return
    if (EXACT_MODEL_PATTERNS.some(pattern => pattern.test(line))) {
      findings.push({ line: index + 1, text: line.trim() })
    }
  })
  return findings
}

export function buildModelRoutingDoctrineDogfoodProof() {
  const goodDoctrine = `
# Current Runtime Map

The model layer says exact model IDs live in route configuration, probes, and provider capability records. Do not hardcode exact model IDs in planning docs or verifier strings.

## Model Routing Doctrine
The router decides by workload class first. The router uses workload class, route key and provider family, auth path class, probe status, cost owner and cap, fallback route or parked state, privacy/tier boundary, source IDs touched, and stop control.
Subscriptions are for humans or internal live operator capacity when allowed, probed, logged, and classified. System runtime uses official APIs and governed adapters by default. A subscription route becoming available does not automatically approve scheduled jobs, team-facing products, public exposure, private broad extraction, or external writes.
If the router cannot prove a route is allowed for the workload, it parks the action with owner, reason, required approval, and next safe card. Blockers block the unsafe action, not the whole sprint.
| Workload class | Default posture | Route class | Required controls |
| Cheap classification, tagging, dedupe, and skip-reason labeling | Low-cost | official API | cost cap |
| Embeddings and retrieval indexing | API | official embedding API | provenance |
| Current-day extraction helpers and bounded structured extraction | governed | official API | ledger |
| Synthesis, daily pulse, and strategic summaries | quality | fallback | source links |
| Scoper deep tool use and gap resolution | approved | deep run | stop control |
| Coding, repo investigation, and reviews | manual | builder session | git |
| Heartbeats, audits, health summaries, and repeated-failure repair | deterministic | checks first | raw green |
| High-stakes legal, financial, security, people, or access decisions | manual | draft only | approval |
| Video, screenshots, OCR, and multimodal training extraction | bounded | vision API | quota |
`
  const staleModelDoctrine = `${goodDoctrine}\nUse openai-codex/gpt-5.4 for all extraction.`
  const missingCostDoctrine = goodDoctrine.replace('cost owner and cap, ', '')
  const subscriptionBackendDoctrine = goodDoctrine.replace(
    'Subscriptions are for humans or internal live operator capacity when allowed, probed, logged, and classified. System runtime uses official APIs and governed adapters by default. A subscription route becoming available does not automatically approve scheduled jobs, team-facing products, public exposure, private broad extraction, or external writes.',
    'Subscriptions are the product backend once they exist.',
  )

  const support = {
    packageJson: { scripts: { 'process:model-routing-check': `node --env-file-if-exists=.env ${MODEL_ROUTING_SCRIPT_PATH}` } },
    closeoutRegistrySource: `${MODEL_ROUTING_CARD_ID} ${MODEL_ROUTING_CLOSEOUT_KEY}`,
    llmRouterSource: 'DEFAULT_LLM_ROUTES policyClassification',
    llmCredentialRegistrySource: 'monthlyUsd',
    llmHubCapacitySource: 'LLM_HUB_CAPACITY_LANE_DEFINITIONS monthlyBudgetUsd',
  }
  const good = evaluateModelRoutingDoctrine({ runtimeMapSource: goodDoctrine, ...support })
  const stale = evaluateModelRoutingDoctrine({ runtimeMapSource: staleModelDoctrine, ...support })
  const missingCost = evaluateModelRoutingDoctrine({ runtimeMapSource: missingCostDoctrine, ...support })
  const subscriptionBackend = evaluateModelRoutingDoctrine({ runtimeMapSource: subscriptionBackendDoctrine, ...support })

  return {
    ok: good.ok && !stale.ok && !missingCost.ok && !subscriptionBackend.ok,
    cases: {
      good: good.summary,
      stale: stale.summary,
      missingCost: missingCost.summary,
      subscriptionBackend: subscriptionBackend.summary,
    },
  }
}

export function evaluateModelRoutingDoctrine({
  runtimeMapSource = '',
  llmRouterSource = '',
  llmCredentialRegistrySource = '',
  llmHubCapacitySource = '',
  closeoutRegistrySource = '',
  packageJson = {},
} = {}) {
  const checks = []
  const runtimeMap = normalizeText(runtimeMapSource)
  const modelSection = sectionText(runtimeMap, 'Model Routing Doctrine')
  const exactModelFindings = findDisallowedExactModels(runtimeMap)

  addCheck(
    checks,
    runtimeMap.includes('# Current Runtime Map') && modelSection.includes('The router decides by workload class first'),
    'canonical runtime map owns model-routing doctrine',
    MODEL_ROUTING_RUNTIME_MAP_PATH,
  )
  addCheck(
    checks,
    runtimeMap.includes('exact model IDs live in route configuration, probes, and provider capability records') &&
      runtimeMap.includes('Do not hardcode exact model IDs'),
    'doctrine prevents stale exact-model hardcoding',
    'model IDs stay in route config/probes/provider docs',
  )
  addCheck(
    checks,
    exactModelFindings.length === 0,
    'runtime doctrine contains no disallowed exact model names',
    exactModelFindings.map(item => `line ${item.line}: ${item.text}`).join('; ') || 'clean',
  )
  addCheck(
    checks,
    includesAll(modelSection, REQUIRED_WORKLOAD_TERMS),
    'doctrine covers required workload classes',
    REQUIRED_WORKLOAD_TERMS.filter(term => !modelSection.includes(term)).join(', ') || 'all present',
  )
  addCheck(
    checks,
    includesAll(modelSection, REQUIRED_ROUTE_FIELDS),
    'doctrine requires route decision fields',
    REQUIRED_ROUTE_FIELDS.filter(term => !modelSection.includes(term)).join(', ') || 'all present',
  )
  addCheck(
    checks,
    modelSection.includes('Subscriptions are for humans or internal live operator capacity') &&
      modelSection.includes('automatically approve scheduled jobs') &&
      (
        modelSection.includes('official APIs and governed adapters are the default') ||
        modelSection.includes('System runtime uses official APIs and governed adapters by default')
      ),
    'subscription routes are internal capacity, not product backend approval',
    'human/subscription/system-runtime boundary present',
  )
  addCheck(
    checks,
    modelSection.includes('cost owner and cap') &&
      modelSection.includes('privacy/tier boundary') &&
      modelSection.includes('source IDs touched') &&
      modelSection.includes('stop control'),
    'cost, privacy, source, and stop-control boundaries are explicit',
    'required controls present',
  )
  addCheck(
    checks,
    modelSection.includes('parks the action with owner, reason, required approval, and next safe card') &&
      modelSection.includes('Blockers block the unsafe action, not the whole sprint'),
    'approval-bound routes park the action without stopping the whole sprint',
    'park-and-continue rule present',
  )
  addCheck(
    checks,
    llmRouterSource ? llmRouterSource.includes('DEFAULT_LLM_ROUTES') && llmRouterSource.includes('policyClassification') : true,
    'existing LLM router has route/policy vocabulary',
    llmRouterSource ? 'DEFAULT_LLM_ROUTES / policyClassification' : 'not provided',
  )
  addCheck(
    checks,
    llmCredentialRegistrySource ? llmCredentialRegistrySource.includes('costCapUsd') || llmCredentialRegistrySource.includes('monthlyUsd') : true,
    'credential registry supports capacity/cost policy proof',
    llmCredentialRegistrySource ? 'capacity policy markers present' : 'not provided',
  )
  addCheck(
    checks,
    llmHubCapacitySource ? llmHubCapacitySource.includes('LLM_HUB_CAPACITY_LANE_DEFINITIONS') && llmHubCapacitySource.includes('monthlyBudgetUsd') : true,
    'hub capacity lanes expose budget and stop-control fields',
    llmHubCapacitySource ? 'lane definitions present' : 'not provided',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:model-routing-check'] === `node --env-file-if-exists=.env ${MODEL_ROUTING_SCRIPT_PATH}`,
    'package exposes focused model-routing proof',
    packageJson.scripts?.['process:model-routing-check'] || 'missing',
  )
  addCheck(
    checks,
    closeoutRegistrySource ? closeoutRegistrySource.includes(MODEL_ROUTING_CLOSEOUT_KEY) && closeoutRegistrySource.includes(MODEL_ROUTING_CARD_ID) : true,
    'closeout registry includes model-routing card',
    closeoutRegistrySource ? MODEL_ROUTING_CLOSEOUT_KEY : 'not provided',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
    summary: {
      checkCount: checks.length,
      failedCount: failed.length,
      workloadClassCount: REQUIRED_WORKLOAD_TERMS.filter(term => modelSection.includes(term)).length,
      routeFieldCount: REQUIRED_ROUTE_FIELDS.filter(term => modelSection.includes(term)).length,
      exactModelFindingCount: exactModelFindings.length,
    },
  }
}

export function renderModelRoutingCloseout({
  evaluation,
  planSummary,
  generatedAt = new Date().toISOString(),
} = {}) {
  return `# MODEL-ROUTING-001 Closeout

Generated: ${generatedAt}

## Summary

MODEL-ROUTING-001 is closed under \`${MODEL_ROUTING_CLOSEOUT_KEY}\`.

What changed:

- Updated \`${MODEL_ROUTING_RUNTIME_MAP_PATH}\` as the canonical model/runtime doctrine.
- Separated human/subscription/live-operator capacity from system runtime.
- Kept exact model IDs out of durable doctrine; model IDs belong in route config, provider probes, or checked provider docs.
- Added workload-class routing rules for classification, embeddings, extraction, synthesis, Scoper deep runs, coding, audits, high-stakes work, and video/vision.
- Required cost owner/cap, route key, auth path, probe status, fallback/parked state, privacy/tier boundary, source IDs, and stop controls.
- Preserved park-and-continue: blocked route actions do not stop the whole sprint.

## Proof

- Plan Critic: ${planSummary || 'not recorded'}
- Focused proof: ${evaluation?.status || 'unknown'} (${evaluation?.summary?.failedCount ?? 'n/a'} failed checks)

## Proof Commands

${MODEL_ROUTING_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Not Next

- No provider calls, browser automation, paid/provider access, credential mutation, provider config mutation, Drive permission mutation, external writes, or new source access.
- No Claude/Gemini/OpenClaw adapter implementation in this card.
- No automatic approval of subscription/native routes for scheduled jobs.

## Next

Continue with LLM-ROUTER-001 by scoping the bounded router migration/workload proof before marking it Building Now.
`
}
