export const ENGINE_001_CARD_ID = 'ENGINE-001'
export const ENGINE_001_NEXT_CARD_ID = 'MEMORY-005'
export const ENGINE_001_CLOSEOUT_KEY = 'engine-001-planning-attrition-input-v1'
export const ENGINE_001_PLAN_PATH = 'docs/process/engine-001-planning-attrition-input-plan.md'
export const ENGINE_001_APPROVAL_PATH = 'docs/process/approvals/ENGINE-001.json'
export const ENGINE_001_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-engine-001-planning-attrition-input-closeout.md'
export const ENGINE_001_SCRIPT_PATH = 'scripts/process-engine-001-check.mjs'

export const ENGINE_001_CHANGED_FILES = [
  'lib/foundation-strategy-source-snapshots.js',
  'public/doc.js',
  'public/foundation-doc-markdown-renderers.js',
  'lib/engine-001-planning-attrition-input.js',
  ENGINE_001_SCRIPT_PATH,
  'docs/strategy/agent-engine.md',
  'docs/rebuild/freedom-rebuild-blueprint.md',
  'docs/process/engine-001-planning-attrition-input-plan.md',
  'docs/process/approvals/ENGINE-001.json',
  ENGINE_001_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const ENGINE_001_PROOF_COMMANDS = [
  'node --check lib/foundation-strategy-source-snapshots.js lib/engine-001-planning-attrition-input.js scripts/process-engine-001-check.mjs public/doc.js public/foundation-doc-markdown-renderers.js',
  'npm run process:engine-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=ENGINE-001 --closeoutKey=engine-001-planning-attrition-input-v1',
  'npm run process:foundation-ship -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --commitRef=HEAD',
]

export const ENGINE_001_NOT_NEXT_BOUNDARIES = [
  'No Google Sheet formula edits or spreadsheet-era blind cell rewrites.',
  'No ClickUp, FUB, finance, credential, OAuth, provider, Drive permission, external send, or public exposure mutation.',
  'No full Agent Engine rebuild, bonus-system rebuild, planning model redesign, or new source extraction.',
  'Do not hardcode live planning attrition values in markdown or frontend fixtures.',
  'Do not collapse planning attrition and live attrition into one metric.',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value ?? '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function findRows(rows = [], groupTitle = '', label = '') {
  return list(rows).filter(row => text(row.groupTitle) === groupTitle && text(row.label) === label)
}

function rowLooksSourceBacked(row = {}) {
  return (
    text(row.sourceId) === 'SRC-FREEDOM-BHAG-001' &&
    text(row.value) &&
    text(row.value) !== '—' &&
    text(row.asOf) &&
    lower(row.detail).includes('planning attrition') &&
    lower(row.detail).includes('bhag builder')
  )
}

export function evaluateEngine001PlanningAttrition({
  sourceSnapshot = [],
  sourceSnapshotSource = '',
  docRendererSource = '',
  foundationDocRendererSource = '',
  agentEngineDocSource = '',
  freedomBlueprintSource = '',
  closeoutRegistrySource = '',
} = {}) {
  const engineInputRows = findRows(sourceSnapshot, 'Engine Inputs', 'Planning Attrition Assumption')
  const currentRequirementRows = findRows(sourceSnapshot, 'Current Requirement', 'Planning Attrition Assumption')
  const liveAttritionRows = findRows(sourceSnapshot, 'Current Requirement', 'Live Attrition Pressure')
  const failed = []

  function check(ok, name, detail = '') {
    if (!ok) failed.push({ check: name, detail: String(detail || '') })
  }

  check(engineInputRows.length === 1, 'planning attrition exists as one Engine Inputs row', `count=${engineInputRows.length}`)
  check(rowLooksSourceBacked(engineInputRows[0]), 'Engine Inputs planning attrition is source-backed to BHAG Builder', JSON.stringify(engineInputRows[0] || {}))
  check(currentRequirementRows.length === 1, 'Current Requirement still exposes planning attrition beside recruiting pace', `count=${currentRequirementRows.length}`)
  check(rowLooksSourceBacked(currentRequirementRows[0]), 'Current Requirement planning attrition keeps BHAG provenance', JSON.stringify(currentRequirementRows[0] || {}))
  check(liveAttritionRows.length === 1 && text(liveAttritionRows[0].sourceId) === 'SRC-FREEDOM-ENGINE-001', 'live attrition pressure remains separate from planning attrition', JSON.stringify(liveAttritionRows[0] || {}))
  check(sourceSnapshotSource.includes("groupTitle: 'Engine Inputs'") && sourceSnapshotSource.includes("label: 'Planning Attrition Assumption'"), 'source snapshot builder emits planning attrition as Engine Input', 'lib/foundation-strategy-source-snapshots.js')
  check(docRendererSource.includes("'Planning Attrition Assumption'") && docRendererSource.includes('engine-input-card'), 'standalone doc renderer shows planning attrition in input cards', 'public/doc.js')
  check(foundationDocRendererSource.includes("'Planning Attrition Assumption'") && foundationDocRendererSource.includes('engine-input-card'), 'Foundation doc renderer shows planning attrition in input cards', 'public/foundation-doc-markdown-renderers.js')
  check(agentEngineDocSource.includes('Planning attrition vs live attrition') && agentEngineDocSource.includes('BHAG builder'), 'Agent Engine doc explains planning attrition boundary', 'docs/strategy/agent-engine.md')
  check(freedomBlueprintSource.includes('Planning attrition as first-class Agent Engine input: `ENGINE-001`'), 'Freedom blueprint keeps ENGINE-001 gap rooted', 'docs/rebuild/freedom-rebuild-blueprint.md')
  check(closeoutRegistrySource.includes(ENGINE_001_CLOSEOUT_KEY), 'closeout registry includes ENGINE-001 key', ENGINE_001_CLOSEOUT_KEY)

  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    failed,
    summary: {
      engineInputPlanningAttritionCount: engineInputRows.length,
      currentRequirementPlanningAttritionCount: currentRequirementRows.length,
      liveAttritionPressureCount: liveAttritionRows.length,
      planningAttritionValue: engineInputRows[0]?.value || null,
      planningAttritionSourceId: engineInputRows[0]?.sourceId || null,
    },
  }
}

export function buildEngine001DogfoodProof() {
  const goodRows = [
    {
      groupTitle: 'Engine Inputs',
      label: 'Planning Attrition Assumption',
      value: '15%',
      sourceId: 'SRC-FREEDOM-BHAG-001',
      detail: 'First-class planning attrition assumption from the BHAG builder.',
      asOf: '2026-05-20',
    },
    {
      groupTitle: 'Current Requirement',
      label: 'Planning Attrition Assumption',
      value: '15%',
      sourceId: 'SRC-FREEDOM-BHAG-001',
      detail: 'First-class planning attrition assumption from the BHAG builder.',
      asOf: '2026-05-20',
    },
    {
      groupTitle: 'Current Requirement',
      label: 'Live Attrition Pressure',
      value: '14%',
      sourceId: 'SRC-FREEDOM-ENGINE-001',
      detail: 'Current recruiting and capacity read from Agent Engine.',
      asOf: '2026-05-20',
    },
  ]
  const commonSources = {
    sourceSnapshotSource: "groupTitle: 'Engine Inputs' label: 'Planning Attrition Assumption'",
    docRendererSource: "'Planning Attrition Assumption' engine-input-card",
    foundationDocRendererSource: "'Planning Attrition Assumption' engine-input-card",
    agentEngineDocSource: 'Planning attrition vs live attrition BHAG builder',
    freedomBlueprintSource: 'Planning attrition as first-class Agent Engine input: `ENGINE-001`',
    closeoutRegistrySource: ENGINE_001_CLOSEOUT_KEY,
  }
  const good = evaluateEngine001PlanningAttrition({ sourceSnapshot: goodRows, ...commonSources })
  const missingInput = evaluateEngine001PlanningAttrition({
    sourceSnapshot: goodRows.filter(row => row.groupTitle !== 'Engine Inputs'),
    ...commonSources,
  })
  const mergedLiveAttrition = evaluateEngine001PlanningAttrition({
    sourceSnapshot: goodRows.map(row =>
      row.label === 'Live Attrition Pressure'
        ? { ...row, label: 'Planning Attrition Assumption', sourceId: 'SRC-FREEDOM-BHAG-001' }
        : row,
    ),
    ...commonSources,
  })

  return {
    ok: good.ok && !missingInput.ok && !mergedLiveAttrition.ok,
    good: good.summary,
    rejected: {
      missingInput: missingInput.failed.map(item => item.check),
      mergedLiveAttrition: mergedLiveAttrition.failed.map(item => item.check),
    },
    invariant: 'ENGINE-001 only passes when planning attrition is first-class, BHAG-backed, visible as an input, and separate from live attrition pressure.',
  }
}

export function renderEngine001Closeout({ snapshot = {}, evaluation = {}, generatedAt = new Date().toISOString() } = {}) {
  return `# ENGINE-001 Planning Attrition Input Closeout

Card: \`${ENGINE_001_CARD_ID}\`
Closeout key: \`${ENGINE_001_CLOSEOUT_KEY}\`
Generated: ${generatedAt}

## What Changed

- Made \`Planning Attrition Assumption\` a first-class \`Engine Inputs\` source snapshot row backed by \`SRC-FREEDOM-BHAG-001\`.
- Kept the same value visible beside required recruiting pace in \`Current Requirement\` so operator context does not disappear.
- Kept \`Live Attrition Pressure\` separate and backed by \`SRC-FREEDOM-ENGINE-001\`.
- Updated both doc renderers so the Agent Engine input card shows attrition alongside GCI and split.
- Added focused proof that rejects missing input visibility and merged planning/live attrition semantics.

## Proof

- Focused status: \`${evaluation.status || 'unknown'}\`
- Planning attrition value: \`${evaluation.summary?.planningAttritionValue || snapshot.planningAttritionValue || 'unknown'}\`
- Planning attrition source: \`${evaluation.summary?.planningAttritionSourceId || 'unknown'}\`

Proof commands:

${ENGINE_001_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Not Next

${ENGINE_001_NOT_NEXT_BOUNDARIES.map(item => `- ${item}`).join('\n')}

## Next

Continue \`${ENGINE_001_NEXT_CARD_ID}\`.
`
}
