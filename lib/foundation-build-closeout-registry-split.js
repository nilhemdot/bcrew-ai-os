export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID = 'FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY = 'foundation-build-closeout-registry-split-v1'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH = 'docs/process/foundation-build-closeout-registry-split-001-plan.md'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001.json'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-build-closeout-registry-split-check.mjs'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-foundation-build-closeout-registry-split-closeout.md'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SPRINT_ID = 'foundation-build-closeout-registry-split-2026-05-15'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAIN_PATH = 'lib/foundation-build-closeout-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_PATH = 'lib/foundation-build-closeout-control-plane-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_BEFORE_LINES = 5812
export const FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAX_LINES = 5000

export const FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS = [
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
  'source-outage-boundary-v1',
  'hub-work-coordination-v1',
  'foundation-performance-v1',
  'plan-critic-architectural-rules-v1',
  'foundation-code-quality-nightly-audit-v1',
  'build-intel-intake-foundation-v1',
  'research-lane-purge-v1',
  'current-sprint-dynamic-truth-v1',
  'connector-routing-truth-v1',
]

export const FOUNDATION_BUILD_CLOSEOUT_LIVE_REQUIRED_KEYS = [
  ...FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS,
  'foundation-surface-sweep-v1',
]

export function countCloseoutRegistryLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function normalizeKeys(records = []) {
  return Array.from(new Set(
    (Array.isArray(records) ? records : [])
      .map(record => String(record?.key || record || '').trim())
      .filter(Boolean),
  )).sort()
}

function includesAllKeys(keys = [], requiredKeys = []) {
  const lookup = new Set(normalizeKeys(keys))
  return requiredKeys.every(key => lookup.has(key))
}

function sameKeys(left = [], right = []) {
  const leftKeys = normalizeKeys(left)
  const rightKeys = normalizeKeys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index])
}

function includesBaselineKeys(left = [], right = []) {
  const rightLookup = new Set(normalizeKeys(right))
  return normalizeKeys(left).every(key => rightLookup.has(key))
}

export function evaluateFoundationBuildCloseoutRegistrySplit({
  beforeRecords = [],
  afterRecords = [],
  mainSource = '',
  controlPlaneSource = '',
  registrySource = '',
  validation = {},
  buildLogSweepVisible = false,
  packageScript = '',
  minControlPlaneLines = 1,
} = {}) {
  const beforeKeys = normalizeKeys(beforeRecords)
  const afterKeys = normalizeKeys(afterRecords)
  const mainLines = countCloseoutRegistryLines(mainSource)
  const controlPlaneLines = countCloseoutRegistryLines(controlPlaneSource)
  const minimumControlPlaneLines = Number(minControlPlaneLines)
  const requiredKeysPresent = includesAllKeys(afterKeys, FOUNDATION_BUILD_CLOSEOUT_LIVE_REQUIRED_KEYS)
  const controlPlaneDataArtifact = String(controlPlaneSource || '').includes('loadFoundationBuildCloseoutDataArtifact') &&
    String(controlPlaneSource || '').includes('control-plane-records')
  const controlPlaneRequiredKeysPresent = FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS
    .every(key => String(controlPlaneSource || '').includes(key) || String(registrySource || '').includes(key))
  const checks = [
    {
      ok: mainLines > 0 && mainLines < FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAX_LINES,
      check: 'root closeout registry is below the 5,000-line architecture threshold',
      detail: `${mainLines}/${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAX_LINES}`,
    },
    {
      ok: mainLines > 0 && mainLines < FOUNDATION_BUILD_CLOSEOUT_REGISTRY_BEFORE_LINES,
      check: 'root closeout registry line count decreased',
      detail: `${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_BEFORE_LINES} -> ${mainLines}`,
    },
    {
      ok: controlPlaneLines >= minimumControlPlaneLines &&
        (String(controlPlaneSource || '').includes('export const controlPlaneCloseoutRecords = [') || controlPlaneDataArtifact),
      check: 'control-plane closeout module owns the extracted record slice',
      detail: `${controlPlaneLines} lines`,
    },
    {
      ok: String(mainSource || '').includes('import { controlPlaneCloseoutRecords }') &&
        String(mainSource || '').includes('...controlPlaneCloseoutRecords'),
      check: 'root registry imports and spreads the control-plane module',
      detail: 'import/spread present',
    },
    {
      ok: beforeKeys.length === 0 || includesBaselineKeys(beforeKeys, afterKeys),
      check: 'closeout keys are preserved across the split',
      detail: beforeKeys.length ? `${beforeKeys.length} -> ${afterKeys.length}` : `${afterKeys.length} current keys`,
    },
    {
      ok: requiredKeysPresent && controlPlaneRequiredKeysPresent,
      check: 'required moved and live closeout keys still resolve',
      detail: FOUNDATION_BUILD_CLOSEOUT_LIVE_REQUIRED_KEYS.filter(key => !afterKeys.includes(key)).join(', ') || 'required keys present',
    },
    {
      ok: Number(validation.closeoutCount || 0) === afterKeys.length &&
        (validation.invalidCloseoutKeys || []).length === 0 &&
        (validation.ownershipOverlapViolations || []).length === 0,
      check: 'closeout validation stays clean',
      detail: `${validation.closeoutCount || 0} closeouts`,
    },
    {
      ok: String(registrySource || '').includes(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY) &&
        String(registrySource || '').includes('source-outage-boundary-v1'),
      check: 'build-log source discovery includes moved registry records',
      detail: 'moved keys present in source discovery',
    },
    {
      ok: buildLogSweepVisible === true,
      check: 'FOUNDATION-SWEEP-001 remains visible in build-log 500 lookup',
      detail: buildLogSweepVisible ? 'visible' : 'missing',
    },
    {
      ok: packageScript === `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}`,
      check: 'package exposes the focused proof script',
      detail: packageScript || 'missing',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      beforeKeyCount: beforeKeys.length,
      afterKeyCount: afterKeys.length,
      mainLines,
      controlPlaneLines,
      requiredKeysPresent,
      buildLogSweepVisible,
    },
  }
}

export function buildFoundationBuildCloseoutRegistrySplitDogfoodProof() {
  const beforeRecords = FOUNDATION_BUILD_CLOSEOUT_LIVE_REQUIRED_KEYS.map(key => ({ key }))
  const healthy = evaluateFoundationBuildCloseoutRegistrySplit({
    beforeRecords,
    afterRecords: beforeRecords,
    mainSource: "import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'\\nexport const closeoutRecords = [\\n  ...controlPlaneCloseoutRecords,\\n]\\n",
    controlPlaneSource: `export const controlPlaneCloseoutRecords = [\\n${FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS.map(key => `  { key: '${key}' },`).join('\\n')}\\n]`,
    minControlPlaneLines: 1,
    registrySource: `${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY}\\nsource-outage-boundary-v1`,
    validation: {
      closeoutCount: beforeRecords.length,
      invalidCloseoutKeys: [],
      ownershipOverlapViolations: [],
    },
    buildLogSweepVisible: true,
    packageScript: `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}`,
  })
  const missingRecord = evaluateFoundationBuildCloseoutRegistrySplit({
    beforeRecords,
    afterRecords: beforeRecords.filter(record => record.key !== 'source-outage-boundary-v1'),
    mainSource: "import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'\\nexport const closeoutRecords = [\\n  ...controlPlaneCloseoutRecords,\\n]\\n",
    controlPlaneSource: `export const controlPlaneCloseoutRecords = [\\n${FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS.filter(key => key !== 'source-outage-boundary-v1').map(key => `  { key: '${key}' },`).join('\\n')}\\n]`,
    minControlPlaneLines: 1,
    registrySource: FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
    validation: {
      closeoutCount: beforeRecords.length - 1,
      invalidCloseoutKeys: [],
      ownershipOverlapViolations: [],
    },
    buildLogSweepVisible: true,
    packageScript: `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}`,
  })
  const oversizedRoot = evaluateFoundationBuildCloseoutRegistrySplit({
    beforeRecords,
    afterRecords: beforeRecords,
    mainSource: `${'x\n'.repeat(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAX_LINES + 1)}`,
    controlPlaneSource: `export const controlPlaneCloseoutRecords = [\\n${FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS.map(key => `  { key: '${key}' },`).join('\\n')}\\n]`,
    minControlPlaneLines: 1,
    registrySource: `${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY}\\nsource-outage-boundary-v1`,
    validation: {
      closeoutCount: beforeRecords.length,
      invalidCloseoutKeys: [],
      ownershipOverlapViolations: [],
    },
    buildLogSweepVisible: true,
    packageScript: `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}`,
  })
  const missingBuildLogSweep = evaluateFoundationBuildCloseoutRegistrySplit({
    beforeRecords,
    afterRecords: beforeRecords,
    mainSource: "import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'\\nexport const closeoutRecords = [\\n  ...controlPlaneCloseoutRecords,\\n]\\n",
    controlPlaneSource: `export const controlPlaneCloseoutRecords = [\\n${FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_REQUIRED_KEYS.map(key => `  { key: '${key}' },`).join('\\n')}\\n]`,
    minControlPlaneLines: 1,
    registrySource: `${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY}\\nsource-outage-boundary-v1`,
    validation: {
      closeoutCount: beforeRecords.length,
      invalidCloseoutKeys: [],
      ownershipOverlapViolations: [],
    },
    buildLogSweepVisible: false,
    packageScript: `node --env-file-if-exists=.env ${FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH}`,
  })

  return {
    ok: healthy.ok === true &&
      missingRecord.ok === false &&
      oversizedRoot.ok === false &&
      missingBuildLogSweep.ok === false,
    healthy,
    missingRecord,
    oversizedRoot,
    missingBuildLogSweep,
    dogfoodInvariant: 'The split only passes when closeout keys are preserved, the root registry is below 5,000 lines, source discovery sees moved records, and FOUNDATION-SWEEP-001 remains visible.',
  }
}
