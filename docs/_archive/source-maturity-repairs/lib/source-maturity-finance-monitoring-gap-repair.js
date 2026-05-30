import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-finance-monitoring-gap-repair-v1'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-finance-monitoring-gap-repair-001-plan.md'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-finance-monitoring-gap-repair-closeout.md'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-finance-monitoring-gap-repair-check.mjs'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_SPRINT_ID = 'source-maturity-finance-monitoring-gap-repair-2026-05-18'
export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-FINANCE-001'

export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
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
  'Do not mark atomized, synthesized, routed, finance automation, or payment reconciliation complete.',
]

export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-finance-monitoring-gap-repair.js scripts/process-source-maturity-finance-monitoring-gap-repair-check.mjs',
  'npm run process:source-maturity-finance-monitoring-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-finance-monitoring-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-finance-monitoring-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-finance-monitoring-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
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

function contractBySourceId(sources = [], sourceId = SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(sources).find(contract => contract.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || null
}

function hasFinanceMonitoringBoundary(contract = {}) {
  const updateText = text(`${contract.updateMethod || ''} ${contract.refreshSchedule || ''} ${contract.manualRefresh || ''}`)
  return updateText.includes('Manual finance source review') &&
    updateText.includes('On demand / weekly operator review') &&
    updateText.includes('No background finance automation') &&
    updateText.includes('does not read or write Google Sheets')
}

function hasFinanceSignoff(contract = {}) {
  const signoffText = text(`${contract.status || ''} ${contract.validation || ''} ${contract.validationScope || ''}`)
  return signoffText.includes('Current reality captured') &&
    signoffText.includes('Signed Off For Current Reality') &&
    signoffText.includes('Weekly Actuals') &&
    signoffText.includes('Cashflow Dash')
}

export function selectFinanceMonitoringRepairCandidate({
  sourceContracts = [],
  sourceMaturityGrid = {},
  sourceRegistry = '',
  currentState = '',
  sourceId = SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
} = {}) {
  const contract = contractBySourceId(sourceContracts, sourceId)
  const row = rowBySourceId(sourceMaturityGrid.rows, sourceId)
  const failures = []
  if (!contract) failures.push('missing_source_contract')
  if (contract && !hasFinanceSignoff(contract)) failures.push('finance_contract_not_signed_current_reality')
  if (contract && !hasFinanceMonitoringBoundary(contract)) failures.push('missing_finance_monitoring_boundary')
  if (row && row.stages?.extracted?.ok !== true) failures.push('missing_existing_finance_source_facts')
  if (row && Number(row.metrics?.synthesisFactSignals || 0) < 1) failures.push('missing_existing_finance_fact_signals')
  if (!String(sourceRegistry || '').includes('SRC-FINANCE-001') || !String(sourceRegistry || '').includes('Signed Off For Current Reality')) {
    failures.push('source_registry_missing_finance_current_reality')
  }
  if (!String(currentState || '').includes('Finance sign-off') || !String(currentState || '').includes('SRC-FINANCE-001')) {
    failures.push('current_state_missing_finance_signoff')
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
      'intelligence_synthesis_facts:SRC-FINANCE-001',
    ],
  }
}

export function evaluateFinanceMonitoringGapRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  activeExtractionTargets = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeAlreadyRepaired = beforeRow.nextGap !== 'monitored' && beforeRow.stages?.monitored?.ok === true
  add(beforeRow.nextGap === 'monitored' || beforeAlreadyRepaired, 'target starts at monitored gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(candidate.ok, 'finance monitoring candidate is source-backed', list(candidate.failures).join(', ') || candidate.sourceId)
  add(afterRow.stages?.monitored?.ok === true, 'finance monitored stage is green after repair', afterRow.stages?.monitored?.detail || 'missing')
  add(afterRow.nextGap !== 'monitored', 'finance no longer blocks on monitored gap', afterRow.nextGap || 'missing')
  add(afterRow.stages?.extracted?.ok === true, 'existing finance source facts remain extracted proof', afterRow.stages?.extracted?.detail || 'missing')
  add(Number(afterRow.metrics?.synthesisFactSignals || 0) >= 1, 'finance has existing synthesis fact signals', String(afterRow.metrics?.synthesisFactSignals || 0))
  add(afterRow.nextGap === 'atomized' || afterRow.nextGap === 'complete' || afterRow.nextGap === 'routed' || afterRow.nextGap === 'synthesized', 'repair exposes the next real maturity gap', afterRow.nextGap || 'missing')
  add(list(activeExtractionTargets).length === 0, 'no active extraction target introduced', list(activeExtractionTargets).map(target => target.targetKey || target.target_key).join(', ') || 'none')
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
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

export function buildSyntheticFinanceMonitoringGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Benson Crew - Owners Dashboard',
    unitName: '(Input) Weekly Actuals + Cashflow Dash',
    group: 'verified',
    status: 'Current reality captured',
    validation: 'Signed Off For Current Reality',
    validationScope: '`(Input) Weekly Actuals` and `Cashflow Dash` are signed off for current-reality meaning.',
    owner: 'Steve + Ahsan',
    accessMethod: 'Google Drive / Google Sheets',
  }
  const factsBySource = [{ sourceId: SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID, total: 26 }]
  const beforeGrid = buildSourceMaturityGridSnapshot({
    sources: [baseContract],
    intelligenceSynthesisFacts: { factsBySource },
  })
  const repairedContract = {
    ...baseContract,
    updateMethod: 'Manual finance source review from the Owners Dashboard finance layer; use existing source-backed facts and workbook modified metadata until continuous finance automation is approved.',
    refreshSchedule: 'On demand / weekly operator review. No background finance automation is approved by this monitoring repair.',
    manualRefresh: 'Future finance freshness cards may read approved finance ranges, but this repair does not read or write Google Sheets.',
  }
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: [repairedContract],
    intelligenceSynthesisFacts: { factsBySource },
  })
  const missingBoundary = selectFinanceMonitoringRepairCandidate({
    sourceContracts: [baseContract],
    sourceMaturityGrid: beforeGrid,
    sourceRegistry: 'SRC-FINANCE-001 Signed Off For Current Reality',
    currentState: 'Finance sign-off SRC-FINANCE-001',
  })
  const candidate = selectFinanceMonitoringRepairCandidate({
    sourceContracts: [repairedContract],
    sourceMaturityGrid: afterGrid,
    sourceRegistry: 'SRC-FINANCE-001 Signed Off For Current Reality',
    currentState: 'Finance sign-off SRC-FINANCE-001',
  })
  const evaluation = evaluateFinanceMonitoringGapRepair({
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    candidate,
    activeExtractionTargets: [],
  })
  return {
    ok: rowBySourceId(beforeGrid.rows)?.nextGap === 'monitored' &&
      rowBySourceId(afterGrid.rows)?.nextGap === 'atomized' &&
      !missingBoundary.ok &&
      missingBoundary.failures.includes('missing_finance_monitoring_boundary') &&
      candidate.ok &&
      evaluation.ok,
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    missingBoundary,
    candidate,
    evaluation,
  }
}

export function renderFinanceMonitoringGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Finance Monitoring Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Added an explicit manual/on-demand monitoring boundary to `SRC-FINANCE-001`.')
  lines.push('- Kept finance automation, live extraction, Sheets reads/writes, payment reconciliation, atom-flow, synthesis, and routing out of scope.')
  lines.push(`- Source maturity now moves finance from \`${summary.beforeNextGap || 'unknown'}\` to \`${summary.afterNextGap || 'unknown'}\`, exposing the next real gap without hiding it.`)
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push('- Focused proof dogfoods the pre-repair failure: signed-off finance source facts without a refresh boundary stay blocked at `monitored`.')
  lines.push('- Focused proof proves the repaired contract has a monitored stage while existing finance source facts remain the extracted proof.')
  lines.push(`- Finance source fact signals visible in proof: ${summary.factSignals ?? 0}.`)
  lines.push(`- Active extraction targets introduced: ${summary.activeExtractionTargets ?? 0}.`)
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_FINANCE_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue from live truth. Finance atom-flow can only happen from existing source facts, and continuous finance automation needs a separate approved card.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
