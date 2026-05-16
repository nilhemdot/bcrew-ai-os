export const RUNTIME_HEALTH_SIMPLIFY_CARD_ID = 'RUNTIME-HEALTH-SIMPLIFY-001'
export const RUNTIME_HEALTH_SIMPLIFY_SPRINT_ID = 'runtime-health-simplify-2026-05-16'
export const RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY = 'runtime-health-simplify-v1'
export const RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH = 'docs/process/runtime-health-simplify-001-plan.md'
export const RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH = 'docs/process/approvals/RUNTIME-HEALTH-SIMPLIFY-001.json'
export const RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH = 'scripts/process-runtime-health-simplify-check.mjs'

const REQUIRED_RUNTIME_DIAGNOSTIC_IDS = Object.freeze([
  'runtime-diagnostic-process-control',
  'runtime-diagnostic-foundation-jobs',
  'runtime-diagnostic-post-ship-fanout',
  'runtime-diagnostic-source-reference-trust',
])

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function addCheck(checks, key, condition, detail) {
  checks.push({ key, ok: Boolean(condition), detail })
}

export function evaluateRuntimeHealthSimplifySource({
  runtimeRendererSource = '',
  operationsRendererSource = '',
  stylesSource = '',
  packageScripts = {},
  foundationVerifySource = '',
  runtimeReliabilityVerifierSource = '',
} = {}) {
  const checks = []
  const commandPanelPresent = includesAll(runtimeRendererSource, [
    'function renderRuntimeHealthCommandPanel',
    'Runtime Command',
    'What Needs Attention Now',
    'runtime-health-command-panel',
  ])
  const attentionSummaryPresent = includesAll(runtimeRendererSource, [
    'function buildRuntimeHealthAttentionItems',
    'runtime-health-attention',
    'Attention-only summary',
    'No immediate runtime attention',
  ])
  const jumpActionsPresent = includesAll(runtimeRendererSource, [
    'function buildRuntimeHealthJumpAction',
    'function scrollToRuntimeDiagnosticSection',
    'scrollIntoView',
  ])
  const collapsedDiagnosticsPresent = includesAll(runtimeRendererSource, [
    'function appendRuntimeDiagnosticPanel',
    "document.createElement('details')",
    "document.createElement('summary')",
    'runtime-health-diagnostic-section',
    'runtime-health-diagnostic-summary',
  ])
  const operationsUsesCommandAndWrappers = includesAll(operationsRendererSource, [
    'renderRuntimeHealthCommandPanel(hub)',
    'appendRuntimeDiagnosticPanel(container',
    ...REQUIRED_RUNTIME_DIAGNOSTIC_IDS,
  ])
  const forbiddenDirectDiagnosticAppends = [
    'kpiWarningPanel',
    'servedCodePanel',
    'workerCodePanel',
    'backlogHygienePanel',
    'cardReferenceTrustPanel',
    'sourceReferenceTrustPanel',
    'postShipFanoutPanel',
    'docArchiveCleanupPanel',
    'exceptionCurationPanel',
    'hitListReconcilePanel',
    'archiveRetirePanel',
    'sheetsApiTrustPanel',
    'doctrinePropagationPanel',
    'surfaceSweepPanel',
    'agentFeedbackAutoSendPanel',
    'agentFeedbackProductionDryRunPanel',
    'agentFeedbackReminderPanel',
    'runtimeProcessControlPanel',
    'meetingVaultAutoEnforcementPanel',
    'jobsPanel',
    'intelligencePanel',
    'llmPanel',
    'extractionPanel',
    'driveCorpusPanel',
  ]
  const directRuntimeAppendsRemoved = forbiddenDirectDiagnosticAppends.every(panelName =>
    !String(operationsRendererSource || '').includes(`container.appendChild(${panelName})`)
  )
  const stylesPresent = includesAll(stylesSource, [
    '.runtime-health-command-panel',
    '.runtime-health-attention-grid',
    '.runtime-health-diagnostic-section',
    '.runtime-health-diagnostic-summary',
  ])
  const packageScriptPresent =
    packageScripts['process:runtime-health-simplify-check'] === `node --env-file-if-exists=.env ${RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH}`
  const verifierCoveragePresent = includesAll(runtimeReliabilityVerifierSource, [
    RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
    'buildRuntimeHealthSimplifyDogfoodProof',
    'evaluateRuntimeHealthSimplifySource',
  ])
  const foundationVerifyPassThrough = includesAll(foundationVerifySource, [
    RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
    'runtimeHealthSimplifySource',
    'foundationOperationsRendererSource',
    'foundationWorkflowStylesSource',
  ])

  addCheck(checks, 'command-panel', commandPanelPresent, 'top Runtime Command panel exists')
  addCheck(checks, 'attention-summary', attentionSummaryPresent, 'attention-only summary exists')
  addCheck(checks, 'jump-actions', jumpActionsPresent, 'operator jump buttons open deep diagnostics')
  addCheck(checks, 'collapsed-diagnostics', collapsedDiagnosticsPresent, 'deep diagnostics are grouped in details/summary wrappers')
  addCheck(checks, 'operations-wrappers', operationsUsesCommandAndWrappers, 'operations renderer uses command panel and diagnostic wrappers')
  addCheck(checks, 'direct-runtime-appends-removed', directRuntimeAppendsRemoved, 'old direct panel dump pattern is not present')
  addCheck(checks, 'styles', stylesPresent, 'workflow stylesheet owns Runtime Health simplification selectors')
  addCheck(checks, 'package-script', packageScriptPresent, 'focused process check package script exists')
  addCheck(checks, 'runtime-reliability-verifier', verifierCoveragePresent, 'runtime reliability verifier covers this card')
  addCheck(checks, 'foundation-verify-pass-through', foundationVerifyPassThrough, 'foundation verifier passes source text into focused verifier')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
    },
  }
}

export function buildRuntimeHealthSimplifyDogfoodProof() {
  const packageScripts = {
    'process:runtime-health-simplify-check': `node --env-file-if-exists=.env ${RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH}`,
  }
  const healthy = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: [
      'function renderRuntimeHealthCommandPanel() {}',
      'Runtime Command',
      'What Needs Attention Now',
      'runtime-health-command-panel',
      'function buildRuntimeHealthAttentionItems() {}',
      'runtime-health-attention',
      'Attention-only summary',
      'No immediate runtime attention',
      'function buildRuntimeHealthJumpAction() {}',
      'function scrollToRuntimeDiagnosticSection() {}',
      'scrollIntoView',
      'function appendRuntimeDiagnosticPanel() {}',
      "document.createElement('details')",
      "document.createElement('summary')",
      'runtime-health-diagnostic-section',
      'runtime-health-diagnostic-summary',
    ].join('\n'),
    operationsRendererSource: [
      'renderRuntimeHealthCommandPanel(hub)',
      'appendRuntimeDiagnosticPanel(container, runtimeProcessControlPanel, { id: \'runtime-diagnostic-process-control\' })',
      'appendRuntimeDiagnosticPanel(container, jobsPanel, { id: \'runtime-diagnostic-foundation-jobs\' })',
      'runtime-diagnostic-post-ship-fanout',
      'runtime-diagnostic-source-reference-trust',
    ].join('\n'),
    stylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    packageScripts,
    foundationVerifySource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} runtimeHealthSimplifySource foundationOperationsRendererSource foundationWorkflowStylesSource`,
    runtimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource`,
  })
  const oldNoCommandPanel = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: [
      'function renderFoundationJobsPanel() {}',
      'function appendRuntimeDiagnosticPanel() {}',
      "document.createElement('details')",
      "document.createElement('summary')",
      'runtime-health-diagnostic-section',
      'runtime-health-diagnostic-summary',
    ].join('\n'),
    operationsRendererSource: 'appendRuntimeDiagnosticPanel(container, jobsPanel, { id: \'runtime-diagnostic-foundation-jobs\' }) runtime-diagnostic-process-control runtime-diagnostic-post-ship-fanout runtime-diagnostic-source-reference-trust',
    stylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    packageScripts,
    foundationVerifySource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} runtimeHealthSimplifySource foundationOperationsRendererSource foundationWorkflowStylesSource`,
    runtimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource`,
  })
  const oldDirectAppendDiagnostics = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: healthy.checks.length ? [
      'function renderRuntimeHealthCommandPanel() {} Runtime Command What Needs Attention Now runtime-health-command-panel',
      'function buildRuntimeHealthAttentionItems() {} runtime-health-attention Attention-only summary No immediate runtime attention',
      'function buildRuntimeHealthJumpAction() {} function scrollToRuntimeDiagnosticSection() {} scrollIntoView',
      'function appendRuntimeDiagnosticPanel() {} document.createElement(\'details\') document.createElement(\'summary\') runtime-health-diagnostic-section runtime-health-diagnostic-summary',
    ].join('\n') : '',
    operationsRendererSource: [
      'renderRuntimeHealthCommandPanel(hub)',
      'if (jobsPanel) container.appendChild(jobsPanel)',
      'runtime-diagnostic-process-control runtime-diagnostic-foundation-jobs runtime-diagnostic-post-ship-fanout runtime-diagnostic-source-reference-trust',
    ].join('\n'),
    stylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    packageScripts,
    foundationVerifySource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} runtimeHealthSimplifySource foundationOperationsRendererSource foundationWorkflowStylesSource`,
    runtimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource`,
  })
  const oldNoJumpActions = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: [
      'function renderRuntimeHealthCommandPanel() {} Runtime Command What Needs Attention Now runtime-health-command-panel',
      'function buildRuntimeHealthAttentionItems() {} runtime-health-attention Attention-only summary No immediate runtime attention',
      'function appendRuntimeDiagnosticPanel() {} document.createElement(\'details\') document.createElement(\'summary\') runtime-health-diagnostic-section runtime-health-diagnostic-summary',
    ].join('\n'),
    operationsRendererSource: 'renderRuntimeHealthCommandPanel(hub) appendRuntimeDiagnosticPanel(container, jobsPanel, { id: \'runtime-diagnostic-foundation-jobs\' }) runtime-diagnostic-process-control runtime-diagnostic-post-ship-fanout runtime-diagnostic-source-reference-trust',
    stylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    packageScripts,
    foundationVerifySource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} runtimeHealthSimplifySource foundationOperationsRendererSource foundationWorkflowStylesSource`,
    runtimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource`,
  })
  const missingCollapsedDetails = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: [
      'function renderRuntimeHealthCommandPanel() {} Runtime Command What Needs Attention Now runtime-health-command-panel',
      'function buildRuntimeHealthAttentionItems() {} runtime-health-attention Attention-only summary No immediate runtime attention',
      'function buildRuntimeHealthJumpAction() {} function scrollToRuntimeDiagnosticSection() {} scrollIntoView',
    ].join('\n'),
    operationsRendererSource: 'renderRuntimeHealthCommandPanel(hub) appendRuntimeDiagnosticPanel(container, jobsPanel, { id: \'runtime-diagnostic-foundation-jobs\' }) runtime-diagnostic-process-control runtime-diagnostic-post-ship-fanout runtime-diagnostic-source-reference-trust',
    stylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    packageScripts,
    foundationVerifySource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} runtimeHealthSimplifySource foundationOperationsRendererSource foundationWorkflowStylesSource`,
    runtimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource`,
  })

  return {
    ok: healthy.ok === true &&
      oldNoCommandPanel.ok === false &&
      oldDirectAppendDiagnostics.ok === false &&
      oldNoJumpActions.ok === false &&
      missingCollapsedDetails.ok === false,
    mode: 'runtime-health-simplify-dogfood',
    healthy,
    oldNoCommandPanelRejected: oldNoCommandPanel.ok === false,
    oldDirectAppendDiagnosticsRejected: oldDirectAppendDiagnostics.ok === false,
    oldNoJumpActionsRejected: oldNoJumpActions.ok === false,
    missingCollapsedDetailsRejected: missingCollapsedDetails.ok === false,
    dogfoodInvariant: 'Runtime Health simplification must provide a command-level attention surface, jump actions, and collapsed diagnostics; old direct-dump Runtime Health layouts fail closed.',
  }
}
