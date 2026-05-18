import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-freedom-team-monitoring-gap-repair-v1'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-freedom-team-monitoring-gap-repair-001-plan.md'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-freedom-team-monitoring-gap-repair-closeout.md'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-freedom-team-monitoring-gap-repair-check.mjs'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_SPRINT_ID = 'source-maturity-freedom-team-monitoring-gap-repair-2026-05-18'
export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID = 'SRC-FREEDOM-TEAM-001'

export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required or paid run.',
  'No live Google Sheets read/write.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'Do not mark extracted, atomized, synthesized, routed, Freedom Team automation, or Google Sheets automation complete.',
]

export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-freedom-team-monitoring-gap-repair.js scripts/process-source-maturity-freedom-team-monitoring-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-freedom-team-monitoring-gap-repair --json',
  'npm run process:source-maturity-freedom-team-monitoring-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-freedom-team-monitoring-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-freedom-team-monitoring-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-freedom-team-monitoring-gap-repair.js',
  'lib/source-contracts.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
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

function contractBySourceId(sources = [], sourceId = SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(sources).find(contract => contract.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId = SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || null
}

function hasFreedomTeamMonitoringBoundary(contract = {}) {
  const updateText = text(`${contract.updateMethod || ''} ${contract.refreshSchedule || ''} ${contract.manualRefresh || ''}`)
  return updateText.includes('Manual Freedom Team source review') &&
    updateText.includes('On demand / weekly operator review') &&
    updateText.includes('No background Google Sheets automation') &&
    updateText.includes('does not read or write Google Sheets')
}

function hasFreedomTeamSignoff(contract = {}) {
  const signoffText = text(`${contract.status || ''} ${contract.validation || ''} ${contract.validationScope || ''} ${contract.scope || ''}`)
  return signoffText.includes('Current reality captured') &&
    signoffText.includes('Signed Off For Current Reality') &&
    signoffText.includes('Freedom master note') &&
    signoffText.includes('A:E')
}

export function selectFreedomTeamMonitoringRepairCandidate({
  sourceContracts = [],
  sourceMaturityGrid = {},
  sourceRegistry = '',
  currentState = '',
  sourceId = SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
} = {}) {
  const contract = contractBySourceId(sourceContracts, sourceId)
  const row = rowBySourceId(sourceMaturityGrid.rows, sourceId)
  const failures = []
  if (!contract) failures.push('missing_source_contract')
  if (contract && !hasFreedomTeamSignoff(contract)) failures.push('freedom_team_contract_not_signed_current_reality')
  if (contract && !hasFreedomTeamMonitoringBoundary(contract)) failures.push('missing_freedom_team_monitoring_boundary')
  if (!String(sourceRegistry || '').includes(sourceId) || !String(sourceRegistry || '').includes('Signed Off For Current Reality')) {
    failures.push('source_registry_missing_freedom_team_current_reality')
  }
  if (!String(currentState || '').includes(sourceId) || !String(currentState || '').includes(SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_KEY)) {
    failures.push('current_state_missing_freedom_team_monitoring_boundary')
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
    ],
  }
}

export function evaluateFreedomTeamMonitoringGapRepair({
  beforeRow = {},
  afterRow = {},
  candidate = {},
  activeExtractionTargets = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const beforeAlreadyRepaired = beforeRow.nextGap !== 'monitored' && beforeRow.stages?.monitored?.ok === true
  add(beforeRow.nextGap === 'monitored' || beforeAlreadyRepaired, 'target starts at monitored gap or is already repaired', `${beforeRow.sourceId || 'missing'}:${beforeRow.nextGap || 'missing'}`)
  add(candidate.ok, 'Freedom Team monitoring candidate is source-backed', list(candidate.failures).join(', ') || candidate.sourceId)
  add(afterRow.stages?.monitored?.ok === true, 'Freedom Team monitored stage is green after repair', afterRow.stages?.monitored?.detail || 'missing')
  add(afterRow.nextGap !== 'monitored', 'Freedom Team no longer blocks on monitored gap', afterRow.nextGap || 'missing')
  add(afterRow.nextGap === 'extracted' || afterRow.nextGap === 'atomized' || afterRow.nextGap === 'synthesized' || afterRow.nextGap === 'routed' || afterRow.nextGap === 'complete', 'repair exposes the next real maturity gap', afterRow.nextGap || 'missing')
  add(Number(afterRow.metrics?.synthesisFactSignals || 0) === 0, 'repair does not invent Freedom Team source facts', String(afterRow.metrics?.synthesisFactSignals || 0))
  add(Number(afterRow.metrics?.atomSignals || 0) === 0, 'repair does not invent Freedom Team atoms', String(afterRow.metrics?.atomSignals || 0))
  add(list(activeExtractionTargets).length === 0, 'no active extraction target introduced', list(activeExtractionTargets).map(target => target.targetKey || target.target_key).join(', ') || 'none')
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      sourceId: candidate.sourceId || beforeRow.sourceId || afterRow.sourceId || SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
      beforeNextGap: beforeRow.nextGap || null,
      afterNextGap: afterRow.nextGap || null,
      afterMonitoringDetail: afterRow.stages?.monitored?.detail || null,
      factSignals: Number(afterRow.metrics?.synthesisFactSignals || 0),
      atomSignals: Number(afterRow.metrics?.atomSignals || 0),
      activeExtractionTargets: list(activeExtractionTargets).length,
      noLiveExtraction: true,
      noSheetsReadWrite: true,
    },
  }
}

export function buildSyntheticFreedomTeamMonitoringGapRepairProof() {
  const baseContract = {
    sourceId: SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
    title: 'Benson Crew - Freedom Sheet',
    unitName: 'Data Entry - BCrew Team/Community · Team records',
    group: 'verified',
    status: 'Current reality captured',
    validation: 'Signed Off For Current Reality',
    validationScope: 'Current spreadsheet reality is signed off for meaning: source role, column structure, operating meaning, dependencies, and caveats are captured in the Freedom master note. This is not yet a rebuilt source-of-truth layer or freshness-managed surface.',
    owner: 'System',
    scope: 'A:E',
    accessMethod: 'Google Drive / Google Sheets',
  }
  const beforeGrid = buildSourceMaturityGridSnapshot({
    sources: [baseContract],
  })
  const repairedContract = {
    ...baseContract,
    updateMethod: 'Manual Freedom Team source review from the signed-off Freedom source note, source registry, and approved read-only Sheet checks when separately authorized.',
    refreshSchedule: 'On demand / weekly operator review. No background Google Sheets automation is approved by this monitoring repair.',
    manualRefresh: 'Future Freedom Team freshness cards may run approved read-only Sheets checks, but this repair does not read or write Google Sheets, create extraction targets, or mutate Drive data.',
  }
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: [repairedContract],
  })
  const missingBoundary = selectFreedomTeamMonitoringRepairCandidate({
    sourceContracts: [baseContract],
    sourceMaturityGrid: beforeGrid,
    sourceRegistry: 'SRC-FREEDOM-TEAM-001 Signed Off For Current Reality',
    currentState: `SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001 ${SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_KEY} SRC-FREEDOM-TEAM-001`,
  })
  const candidate = selectFreedomTeamMonitoringRepairCandidate({
    sourceContracts: [repairedContract],
    sourceMaturityGrid: afterGrid,
    sourceRegistry: 'SRC-FREEDOM-TEAM-001 Signed Off For Current Reality',
    currentState: `SOURCE-MATURITY-FREEDOM-TEAM-MONITORING-GAP-REPAIR-001 ${SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_KEY} SRC-FREEDOM-TEAM-001`,
  })
  const evaluation = evaluateFreedomTeamMonitoringGapRepair({
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    candidate,
    activeExtractionTargets: [],
  })
  return {
    ok: rowBySourceId(beforeGrid.rows)?.nextGap === 'monitored' &&
      rowBySourceId(afterGrid.rows)?.nextGap === 'extracted' &&
      !missingBoundary.ok &&
      missingBoundary.failures.includes('missing_freedom_team_monitoring_boundary') &&
      candidate.ok &&
      evaluation.ok,
    beforeRow: rowBySourceId(beforeGrid.rows),
    afterRow: rowBySourceId(afterGrid.rows),
    missingBoundary,
    candidate,
    evaluation,
  }
}

export function renderFreedomTeamMonitoringGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Freedom Team Monitoring Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Added an explicit manual/on-demand monitoring boundary to `SRC-FREEDOM-TEAM-001`.')
  lines.push('- Kept live extraction, live Google Sheets read/write, background Sheets automation, atom-flow, synthesis, and routing out of scope.')
  lines.push(`- Synthetic dogfood proves the pre-repair source moves from \`monitored\` to \`${summary.afterNextGap || 'unknown'}\`; live reruns are idempotent after the contract patch and keep the next real gap visible.`)
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push('- Focused proof dogfoods the pre-repair failure: a signed-off Freedom Team source without a refresh boundary stays blocked at `monitored`.')
  lines.push('- Focused proof proves the repaired contract has a monitored stage and still exposes the extracted-stage gap because no source facts were invented.')
  lines.push(`- Live close-card reruns are idempotent after the source-contract patch, so the synthetic fixture owns the \`monitored -> ${summary.afterNextGap || 'unknown'}\` transition proof.`)
  lines.push(`- Freedom Team source fact signals visible in proof: ${summary.factSignals ?? 0}.`)
  lines.push(`- Freedom Team atom signals visible in proof: ${summary.atomSignals ?? 0}.`)
  lines.push(`- Active extraction targets introduced: ${summary.activeExtractionTargets ?? 0}.`)
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_FREEDOM_TEAM_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue from live truth. Freedom Team extraction/source-fact work needs a separate approved card and must not be hidden by this monitoring repair.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
