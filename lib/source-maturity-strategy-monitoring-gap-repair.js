import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-strategy-monitoring-gap-repair-v1'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-strategy-monitoring-gap-repair-001-plan.md'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-strategy-monitoring-gap-repair-closeout.md'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-strategy-monitoring-gap-repair-check.mjs'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SPRINT_ID = 'source-maturity-strategy-monitoring-gap-repair-2026-05-18'
export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-STRATEGY-001'

export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No Google Sheets read/write.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'Do not mark atomized, synthesized, routed, Strategy Hub automation, or strategy recommendation generation complete.',
]

export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-strategy-monitoring-gap-repair.js scripts/process-source-maturity-strategy-monitoring-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-strategy-monitoring-gap-repair --json',
  'npm run process:source-maturity-strategy-monitoring-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-strategy-monitoring-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-strategy-monitoring-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-strategy-monitoring-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
  'docs/source-registry.md',
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function contractBySourceId(sources = [], sourceId = SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(sources).find(contract => contract.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || null
}

function hasStrategyMonitoringBoundary(contract = {}) {
  const updateText = text(`${contract.updateMethod || ''} ${contract.refreshSchedule || ''} ${contract.manualRefresh || ''}`)
  return updateText.includes('Manual strategy source review') &&
    updateText.includes('On demand / weekly operator review') &&
    updateText.includes('No background strategy automation') &&
    updateText.includes('does not run extraction or write externally')
}

function hasStrategySignoff(contract = {}) {
  const signoffText = text(`${contract.status || ''} ${contract.validation || ''} ${contract.validationScope || ''}`)
  return signoffText.includes('Verified') &&
    signoffText.includes('Signed Off') &&
    signoffText.includes('Canonical strategy packet')
}

export function selectStrategyMonitoringRepairCandidate({
  sourceContracts = [],
  sourceMaturityGrid = {},
  sourceRegistry = '',
  currentState = '',
  sourceId = SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
} = {}) {
  const contract = contractBySourceId(sourceContracts, sourceId)
  const row = rowBySourceId(sourceMaturityGrid.rows, sourceId)
  const failures = []
  if (!contract) failures.push('missing_source_contract')
  if (contract && !hasStrategySignoff(contract)) failures.push('strategy_contract_not_signed_current_reality')
  if (contract && !hasStrategyMonitoringBoundary(contract)) failures.push('missing_strategy_monitoring_boundary')
  if (row && row.stages?.extracted?.ok !== true) failures.push('missing_existing_strategy_source_facts')
  if (row && Number(row.metrics?.synthesisFactSignals || 0) < 1) failures.push('missing_existing_strategy_fact_signals')
  if (!String(sourceRegistry || '').includes('SRC-STRATEGY-001') || !String(sourceRegistry || '').includes('Verified')) {
    failures.push('source_registry_missing_strategy_verified_truth')
  }
  if (!String(currentState || '').includes('SRC-STRATEGY-001') || !String(currentState || '').includes('is signed off')) {
    failures.push('current_state_missing_strategy_signoff')
  }
  return {
    ok: failures.length === 0,
    failures,
    sourceId,
    contract,
    maturityRow: row,
    evidenceRefs: [
      'lib/source-contracts.js',
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'intelligence_synthesis_facts:SRC-STRATEGY-001',
    ],
  }
}

export function evaluateStrategyMonitoringGapRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  activeExtractionTargets = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeAlreadyRepaired = beforeRow.nextGap !== 'monitored' && beforeRow.stages?.monitored?.ok === true
  add(beforeRow.nextGap === 'monitored' || beforeAlreadyRepaired, 'target starts at monitored gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(candidate.ok, 'strategy monitoring candidate is source-backed', list(candidate.failures).join(', ') || candidate.sourceId)
  add(afterRow.stages?.monitored?.ok === true, 'strategy monitored stage is green after repair', afterRow.stages?.monitored?.detail || 'missing')
  add(afterRow.nextGap !== 'monitored', 'strategy no longer blocks on monitored gap', afterRow.nextGap || 'missing')
  add(afterRow.stages?.extracted?.ok === true, 'existing strategy source facts remain extracted proof', afterRow.stages?.extracted?.detail || 'missing')
  add(Number(afterRow.metrics?.synthesisFactSignals || 0) >= 1, 'strategy has existing synthesis fact signals', String(afterRow.metrics?.synthesisFactSignals || 0))
  add(afterRow.nextGap === 'atomized' || afterRow.nextGap === 'complete' || afterRow.nextGap === 'routed' || afterRow.nextGap === 'synthesized', 'repair exposes the next real maturity gap', afterRow.nextGap || 'missing')
  add(list(activeExtractionTargets).length === 0, 'no active extraction target introduced', list(activeExtractionTargets).map(target => target.targetKey || target.target_key).join(', ') || 'none')
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
      beforeNextGap: beforeRow.nextGap || null,
      afterNextGap: afterRow.nextGap || null,
      afterMonitoringDetail: afterRow.stages?.monitored?.detail || null,
      factSignals: Number(afterRow.metrics?.synthesisFactSignals || 0),
      activeExtractionTargets: list(activeExtractionTargets).length,
      noLiveExtraction: true,
      noSheetsReadWrite: true,
    },
  }
}

export function buildSyntheticStrategyMonitoringGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Business Strategy Docs',
    unitName: 'Strategy packet',
    group: 'verified',
    status: 'Verified',
    validation: 'Signed Off',
    validationScope: 'Canonical strategy packet in the repo is the signed-off business strategy truth.',
    owner: 'System',
    accessMethod: 'Git + local filesystem',
  }
  const factsBySource = [{ sourceId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID, total: 3 }]
  const beforeGrid = buildSourceMaturityGridSnapshot({
    sources: [baseContract],
    intelligenceSynthesisFacts: { factsBySource },
  })
  const repairedContract = {
    ...baseContract,
    updateMethod: 'Manual strategy source review from repo strategy docs, active rebuild doctrine, and existing source-backed strategy facts until continuous strategy automation is approved.',
    refreshSchedule: 'On demand / weekly operator review. No background strategy automation is approved by this monitoring repair.',
    manualRefresh: 'Review docs/business-strategy.md, docs/strategy/, docs/rebuild/current-state.md, docs/rebuild/current-plan.md, and source-backed strategy facts; this repair does not run extraction or write externally.',
  }
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: [repairedContract],
    intelligenceSynthesisFacts: { factsBySource },
  })
  const missingBoundary = selectStrategyMonitoringRepairCandidate({
    sourceContracts: [baseContract],
    sourceMaturityGrid: beforeGrid,
    sourceRegistry: 'SRC-STRATEGY-001 Verified',
    currentState: 'SRC-STRATEGY-001 is signed off',
  })
  const candidate = selectStrategyMonitoringRepairCandidate({
    sourceContracts: [repairedContract],
    sourceMaturityGrid: afterGrid,
    sourceRegistry: 'SRC-STRATEGY-001 Verified',
    currentState: 'SRC-STRATEGY-001 is signed off',
  })
  const evaluation = evaluateStrategyMonitoringGapRepair({
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    candidate,
    activeExtractionTargets: [],
  })
  return {
    ok: rowBySourceId(beforeGrid.rows)?.nextGap === 'monitored' &&
      rowBySourceId(afterGrid.rows)?.nextGap === 'atomized' &&
      !missingBoundary.ok &&
      missingBoundary.failures.includes('missing_strategy_monitoring_boundary') &&
      candidate.ok &&
      evaluation.ok,
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    missingBoundary,
    candidate,
    evaluation,
  }
}

export function renderStrategyMonitoringGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Strategy Monitoring Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Added an explicit manual/on-demand monitoring boundary to `SRC-STRATEGY-001`.')
  lines.push('- Kept Strategy Hub automation, live extraction, external writes, atom-flow, synthesis, routing, and recommendation generation out of scope.')
  lines.push(`- Source maturity now clears the monitored-stage gap and exposes \`${summary.afterNextGap || 'unknown'}\` as the next real Strategy gap without hiding it.`)
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push('- Focused proof dogfoods the pre-repair failure: signed-off strategy source facts without a refresh boundary stay blocked at `monitored`.')
  lines.push('- Focused proof proves the repaired contract has a monitored stage while existing strategy source facts remain the extracted proof.')
  lines.push('- Live close-card reruns are idempotent after the source-contract patch, so the dogfood fixture owns the `monitored -> atomized` transition proof.')
  lines.push(`- Strategy source fact signals visible in proof: ${summary.factSignals ?? 0}.`)
  lines.push(`- Active extraction targets introduced: ${summary.activeExtractionTargets ?? 0}.`)
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue from live truth. Strategy atom-flow can only happen from existing source facts, and continuous strategy automation or recommendation generation needs a separate approved card.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
