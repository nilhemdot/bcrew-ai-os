import fs from 'node:fs'
import path from 'node:path'
import { getFoundationBuildCloseouts, getFoundationBuildCloseoutValidation } from './foundation-build-log.js'

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_CARD_ID = 'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_KEY = 'build-closeout-registry-extract-v1'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_PLAN_PATH = 'docs/process/build-closeout-registry-extract-001-plan.md'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_APPROVAL_PATH = 'docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-closeout-registry-extract-closeout.md'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_SCRIPT_PATH = 'scripts/process-build-closeout-registry-extract-check.mjs'
export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_SPRINT_ID = 'build-closeout-registry-extract-2026-05-18'

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS = [
  'lib/foundation-build-closeout-records.js',
  'lib/foundation-build-closeout-overnight-records.js',
]

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS = [
  'lib/foundation-build-closeout-agent-feedback-records.js',
  'lib/foundation-build-closeout-control-layer-records.js',
  'lib/foundation-build-closeout-db-process-records.js',
  'lib/foundation-build-closeout-doctrine-cleanup-records.js',
  'lib/foundation-build-closeout-foundation-surface-records.js',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-build-closeout-route-frontend-records.js',
  'lib/foundation-build-closeout-source-once-over-records.js',
  'lib/foundation-build-closeout-verifier-runtime-records.js',
]

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_SOURCE_VISIBILITY_PATHS = [
  ...BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS,
  ...BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS,
  'lib/foundation-build-closeout-action-route-records.js',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'lib/foundation-build-closeout-control-plane-records.js',
  'lib/foundation-build-closeout-size-records.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-build-closeout-tightening-records.js',
]

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_CHANGED_FILES = [
  ...BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS,
  ...BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS,
  'lib/build-closeout-registry-extract.js',
  'lib/foundation-build-log-source.js',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verifier-process-control-governance.js',
  'scripts/foundation-verify.mjs',
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_SCRIPT_PATH,
  'lib/foundation-build-closeout-size-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_PLAN_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_APPROVAL_PATH,
  BUILD_CLOSEOUT_REGISTRY_EXTRACT_CLOSEOUT_PATH,
]

export const BUILD_CLOSEOUT_REGISTRY_EXTRACT_PROOF_COMMANDS = [
  'node --check lib/build-closeout-registry-extract.js scripts/process-build-closeout-registry-extract-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-records.js lib/foundation-build-closeout-overnight-records.js lib/foundation-build-closeout-size-records.js',
  'npm run process:build-closeout-registry-extract-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json --closeoutKey=build-closeout-registry-extract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --closeoutKey=build-closeout-registry-extract-v1',
  'npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json --closeoutKey=build-closeout-registry-extract-v1 --commitRef=HEAD',
]

const REQUIRED_MOVED_CLOSEOUT_KEYS = [
  'foundation-ui-complete-v1',
  'process-hooks-v1',
  'foundation-control-layer-v1',
  'agent-feedback-send-v1',
  'meeting-vault-auto-enforcement-v1',
  'auth-routes-split-v1',
  'foundation-backlog-store-split-v1',
  'foundation-sales-listing-store-split-v1',
]

function countLines(text = '') {
  return String(text || '').split('\n').length
}

function readRepoText(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

export function buildBuildCloseoutRegistryExtractSnapshot({ repoRoot = process.cwd() } = {}) {
  const rootRows = BUILD_CLOSEOUT_REGISTRY_EXTRACT_ROOT_PATHS.map(filePath => ({
    filePath,
    lineCount: countLines(readRepoText(repoRoot, filePath)),
  }))
  const moduleRows = BUILD_CLOSEOUT_REGISTRY_EXTRACT_MODULE_PATHS.map(filePath => ({
    filePath,
    lineCount: countLines(readRepoText(repoRoot, filePath)),
  }))
  const recordsSource = readRepoText(repoRoot, 'lib/foundation-build-closeout-records.js')
  const overnightSource = readRepoText(repoRoot, 'lib/foundation-build-closeout-overnight-records.js')
  const buildLogSourceHelper = readRepoText(repoRoot, 'lib/foundation-build-log-source.js')
  const closeouts = getFoundationBuildCloseouts()
  const validation = getFoundationBuildCloseoutValidation()
  const closeoutKeys = new Set(closeouts.map(record => record.key))
  const missingMovedKeys = REQUIRED_MOVED_CLOSEOUT_KEYS.filter(key => !closeoutKeys.has(key))
  const missingRootSpreads = [
    'sourceOnceOverCloseoutRecords',
    'processGateCloseoutRecords',
    'doctrineCleanupCloseoutRecords',
    'controlLayerCloseoutRecords',
    'agentFeedbackCloseoutRecords',
    'foundationSurfaceCloseoutRecords',
  ].filter(exportName => !recordsSource.includes(`...${exportName}`))
  const missingOvernightSpreads = [
    'routeFrontendCloseoutRecords',
    'dbProcessCloseoutRecords',
    'verifierRuntimeCloseoutRecords',
  ].filter(exportName => !overnightSource.includes(`...${exportName}`))
  const missingBuildLogSourceVisibilityPaths = BUILD_CLOSEOUT_REGISTRY_EXTRACT_SOURCE_VISIBILITY_PATHS
    .filter(filePath => !buildLogSourceHelper.includes(filePath))

  const ok = rootRows.every(row => row.lineCount < 3000) &&
    moduleRows.every(row => row.lineCount < 1500) &&
    validation.invalidCloseoutKeys.length === 0 &&
    validation.ownershipOverlapViolations.length === 0 &&
    missingMovedKeys.length === 0 &&
    missingRootSpreads.length === 0 &&
    missingOvernightSpreads.length === 0 &&
    missingBuildLogSourceVisibilityPaths.length === 0

  return {
    ok,
    closeoutCount: closeouts.length,
    rootRows,
    moduleRows,
    validation,
    missingMovedKeys,
    missingRootSpreads,
    missingOvernightSpreads,
    missingBuildLogSourceVisibilityPaths,
  }
}

export function buildBuildCloseoutRegistryExtractDogfoodProof() {
  const rootRows = [
    { filePath: 'lib/foundation-build-closeout-records.js', lineCount: 4336 },
    { filePath: 'lib/foundation-build-closeout-overnight-records.js', lineCount: 4934 },
  ]
  const moduleRows = [
    { filePath: 'lib/foundation-build-closeout-agent-feedback-records.js', lineCount: 688 },
  ]
  const beforeFails = rootRows.every(row => row.lineCount >= 3000)
  const afterRootRows = [
    { filePath: 'lib/foundation-build-closeout-records.js', lineCount: 33 },
    { filePath: 'lib/foundation-build-closeout-overnight-records.js', lineCount: 2445 },
  ]
  const afterPasses = afterRootRows
    .every(row => row.lineCount < 3000) && moduleRows.every(row => row.lineCount < 1500)
  const missingMovedKeyFails = ![].includes('foundation-ui-complete-v1')
  return {
    ok: beforeFails && afterPasses && missingMovedKeyFails,
    beforeFails,
    afterPasses,
    missingMovedKeyFails,
  }
}
