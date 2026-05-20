import {
  FRONTEND_CURRENT_STATE_RENDERER_NAMES,
  evaluateFrontendCurrentStateScriptOrder,
} from './foundation-frontend-current-state-renderers-split.js'

export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_CARD_ID = 'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001'
export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_CLOSEOUT_KEY = 'foundation-client-current-state-extract-v1'
export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_PLAN_PATH = 'docs/process/foundation-client-current-state-extract-001-plan.md'
export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001.json'
export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_SCRIPT_PATH = 'scripts/process-foundation-client-current-state-extract-check.mjs'
export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_NEXT_CARD_ID = 'BUILD-LOG-API-CACHE-AND-SLIM-001'
export const FOUNDATION_CLIENT_CURRENT_STATE_ROOT_MAX_LINES = 3000
export const FOUNDATION_CLIENT_CURRENT_STATE_MODULE_MAX_LINES = 1500

export const FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_PROOF_COMMANDS = [
  'node --check lib/foundation-client-current-state-extract.js scripts/process-foundation-client-current-state-extract-check.mjs',
  'npm run process:foundation-client-current-state-extract-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001.json --closeoutKey=foundation-client-current-state-extract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 --closeoutKey=foundation-client-current-state-extract-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001.json --closeoutKey=foundation-client-current-state-extract-v1 --commitRef=HEAD',
]

function countLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const lines = text.split(/\r?\n/)
  return lines.length - (text.endsWith('\n') ? 1 : 0)
}

function functionNamesPresent(source = '', names = []) {
  const text = String(source || '')
  return names.filter(name => new RegExp(`function\\s+${name}\\s*\\(`).test(text))
}

export function evaluateFoundationClientCurrentStateExtraction({
  foundationSource = '',
  currentStateSource = '',
  htmlSource = '',
} = {}) {
  const rootCurrentStateFunctions = functionNamesPresent(foundationSource, FRONTEND_CURRENT_STATE_RENDERER_NAMES)
  const moduleCurrentStateFunctions = functionNamesPresent(currentStateSource, FRONTEND_CURRENT_STATE_RENDERER_NAMES)
  const order = evaluateFrontendCurrentStateScriptOrder(
    Array.from(String(htmlSource || '').matchAll(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi))
      .map(match => String(match[1] || '').split('?')[0])
      .filter(src => src.includes('foundation')),
  )
  const foundationLines = countLines(foundationSource)
  const currentStateLines = countLines(currentStateSource)
  const rootDoesNotOwnRenderer = !/function\s+renderCurrentState\s*\(/.test(foundationSource) &&
    rootCurrentStateFunctions.length === 0
  const moduleOwnsRenderer = /function\s+renderCurrentState\s*\(/.test(currentStateSource) &&
    moduleCurrentStateFunctions.length === FRONTEND_CURRENT_STATE_RENDERER_NAMES.length
  const moduleHasRuntimeFetchFlow = currentStateSource.includes('fetchFoundationHub()') &&
    currentStateSource.includes('fetchDoc(') &&
    currentStateSource.includes('fetchSheetStructureStatus()')
  const rootUnderBudget = foundationLines > 0 && foundationLines <= FOUNDATION_CLIENT_CURRENT_STATE_ROOT_MAX_LINES
  const moduleUnderBudget = currentStateLines > 0 && currentStateLines <= FOUNDATION_CLIENT_CURRENT_STATE_MODULE_MAX_LINES

  return {
    ok: rootDoesNotOwnRenderer &&
      moduleOwnsRenderer &&
      moduleHasRuntimeFetchFlow &&
      order.ok &&
      rootUnderBudget &&
      moduleUnderBudget,
    invariant: 'Current State rendering is extracted from public/foundation.js into a bounded dedicated browser module, with script order and runtime fetch flow intact.',
    rootDoesNotOwnRenderer,
    moduleOwnsRenderer,
    moduleHasRuntimeFetchFlow,
    order,
    lineCounts: {
      foundation: foundationLines,
      foundationMax: FOUNDATION_CLIENT_CURRENT_STATE_ROOT_MAX_LINES,
      currentState: currentStateLines,
      currentStateMax: FOUNDATION_CLIENT_CURRENT_STATE_MODULE_MAX_LINES,
    },
    rootCurrentStateFunctions,
    moduleCurrentStateFunctionCount: moduleCurrentStateFunctions.length,
    requiredCurrentStateFunctionCount: FRONTEND_CURRENT_STATE_RENDERER_NAMES.length,
    rootUnderBudget,
    moduleUnderBudget,
  }
}

export function isFoundationClientCurrentStateExtracted({ fileTexts = {} } = {}) {
  return evaluateFoundationClientCurrentStateExtraction({
    foundationSource: fileTexts['public/foundation.js'] || '',
    currentStateSource: fileTexts['public/foundation-current-state-renderers.js'] || '',
    htmlSource: fileTexts['public/foundation.html'] || '',
  }).ok
}

export function buildFoundationClientCurrentStateExtractDogfoodProof() {
  const html = '<script src="/foundation-nav-config.js"></script><script src="/foundation-data.js"></script><script src="/foundation-doc-markdown-renderers.js"></script><script src="/foundation.js"></script><script src="/foundation-source-registry-renderers.js"></script><script src="/foundation-fub-lead-source-renderers.js"></script><script src="/foundation-system-inventory-renderers.js"></script><script src="/foundation-current-state-renderers.js"></script><script src="/foundation-source-lifecycle-renderers.js"></script><script src="/foundation-runtime-renderers.js"></script><script src="/foundation-operations-renderers.js"></script><script src="/foundation-router.js"></script>'
  const moduleFunctions = FRONTEND_CURRENT_STATE_RENDERER_NAMES
    .map(name => `function ${name}() { return true }`)
    .join('\n')
  const healthy = evaluateFoundationClientCurrentStateExtraction({
    foundationSource: 'function renderBacklog() { return true }\n',
    currentStateSource: `${moduleFunctions}\nfunction currentStateFetchFlow() { fetchFoundationHub(); fetchDoc('docs/rebuild/current-state.md'); fetchSheetStructureStatus(); }\n`,
    htmlSource: html,
  })
  const oldRootMonolith = evaluateFoundationClientCurrentStateExtraction({
    foundationSource: 'function renderCurrentState() { return true }\n',
    currentStateSource: `${moduleFunctions}\nfunction currentStateFetchFlow() { fetchFoundationHub(); fetchDoc('docs/rebuild/current-state.md'); fetchSheetStructureStatus(); }\n`,
    htmlSource: html,
  })
  const missingModule = evaluateFoundationClientCurrentStateExtraction({
    foundationSource: 'function renderBacklog() { return true }\n',
    currentStateSource: '',
    htmlSource: html,
  })
  const wrongOrder = evaluateFoundationClientCurrentStateExtraction({
    foundationSource: 'function renderBacklog() { return true }\n',
    currentStateSource: `${moduleFunctions}\nfunction currentStateFetchFlow() { fetchFoundationHub(); fetchDoc('docs/rebuild/current-state.md'); fetchSheetStructureStatus(); }\n`,
    htmlSource: '<script src="/foundation-current-state-renderers.js"></script><script src="/foundation.js"></script>',
  })

  return {
    ok: healthy.ok &&
      oldRootMonolith.ok === false &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    healthy,
    oldRootMonolith,
    missingModule,
    wrongOrder,
    dogfoodInvariant: 'Old root-owned renderCurrentState, missing split module, and wrong script order fail closed.',
  }
}
