import { buildSourceMaturityGridSnapshot } from './source-maturity-grid.js'

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CARD_ID = 'SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CLOSEOUT_KEY = 'source-maturity-verified-monitoring-gap-repair-v1'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_PLAN_PATH = 'docs/process/source-maturity-verified-monitoring-gap-repair-001-plan.md'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001.json'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-verified-monitoring-gap-repair-closeout.md'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_SCRIPT_PATH = 'scripts/process-source-maturity-verified-monitoring-gap-repair-check.mjs'
export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_SPRINT_ID = 'source-maturity-verified-monitoring-gap-repair-2026-05-18'

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS = [
  {
    sourceId: 'SRC-CLICKUP-001',
    label: 'ClickUp',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual ClickUp source-boundary review from existing source notes, shipped system registrations, and repo/DB proof until a separately approved read-only ClickUp health card or connector work runs.',
    refreshSchedule: 'On demand / weekly operator review. No background ClickUp automation or writeback is approved by this monitoring repair.',
    manualRefresh: 'Future ClickUp freshness cards may run approved read-only connector checks, but this repair does not call ClickUp, create tasks, mutate lists, or write external systems.',
    boundaryTokens: ['Manual ClickUp source-boundary review', 'No background ClickUp automation', 'does not call ClickUp'],
    forbiddenTokens: ['create tasks', 'mutate lists'],
  },
  {
    sourceId: 'SRC-GDOCS-001',
    label: 'Google Docs source type',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual Google Docs source-type review from existing Drive corpus/source-note evidence and governed extraction contracts until a separately approved read-only Drive/Docs extraction card runs.',
    refreshSchedule: 'On demand / weekly operator review. No broad Drive backfill, raw-doc exposure, or background Docs extraction is approved by this monitoring repair.',
    manualRefresh: 'Future Docs freshness cards may run approved read-only export checks, but this repair does not read Google Docs, mutate Drive permissions, request access, or write external systems.',
    boundaryTokens: ['Manual Google Docs source-type review', 'No broad Drive backfill', 'does not read Google Docs'],
    forbiddenTokens: ['mutate Drive permissions', 'request access'],
  },
  {
    sourceId: 'SRC-GSHEETS-001',
    label: 'Google Sheets source type',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual Google Sheets source-type review from existing source contracts, source notes, and governed spreadsheet provenance until a separately approved read-only Sheets extraction card runs.',
    refreshSchedule: 'On demand / weekly operator review. No broad Sheets backfill or background spreadsheet extraction is approved by this monitoring repair.',
    manualRefresh: 'Future Sheets freshness cards may run approved read-only range checks, but this repair does not read Google Sheets, write Sheets, mutate Drive permissions, or write external systems.',
    boundaryTokens: ['Manual Google Sheets source-type review', 'No broad Sheets backfill', 'does not read Google Sheets'],
    forbiddenTokens: ['write Sheets', 'mutate Drive permissions'],
  },
  {
    sourceId: 'SRC-DATAFORSEO-001',
    label: 'DataForSEO',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual DataForSEO source review from existing credential/source-contract proof and source registry notes until a separately approved read-only SEO connector card runs.',
    refreshSchedule: 'On demand / weekly operator review. No background DataForSEO automation or paid/provider query is approved by this monitoring repair.',
    manualRefresh: 'Future SEO freshness cards may run approved read-only provider checks with spend controls, but this repair does not call DataForSEO, spend provider budget, or write external systems.',
    boundaryTokens: ['Manual DataForSEO source review', 'No background DataForSEO automation', 'does not call DataForSEO'],
    forbiddenTokens: ['spend provider budget'],
  },
  {
    sourceId: 'SRC-GHL-001',
    label: 'GoHighLevel',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual GoHighLevel source review from existing credential/source-contract proof and marketing source notes until a separately approved read-only GHL connector card runs.',
    refreshSchedule: 'On demand / weekly operator review. No background GoHighLevel automation or CRM mutation is approved by this monitoring repair.',
    manualRefresh: 'Future GoHighLevel freshness cards may run approved read-only connector checks, but this repair does not call GoHighLevel, mutate contacts/pipelines, or write external systems.',
    boundaryTokens: ['Manual GoHighLevel source review', 'No background GoHighLevel automation', 'does not call GoHighLevel'],
    forbiddenTokens: ['mutate contacts/pipelines'],
  },
  {
    sourceId: 'SRC-META-001',
    label: 'Meta API',
    expectedNextGap: 'extracted',
    updateMethod: 'Manual Meta source review from existing token/source-contract proof and marketing source notes until a separately approved read-only Meta connector card runs.',
    refreshSchedule: 'On demand / weekly operator review. No background Meta automation, ad mutation, or paid campaign action is approved by this monitoring repair.',
    manualRefresh: 'Future Meta freshness cards may run approved read-only connector checks with spend controls, but this repair does not call Meta, mutate ads, spend budget, or write external systems.',
    boundaryTokens: ['Manual Meta source review', 'No background Meta automation', 'does not call Meta'],
    forbiddenTokens: ['mutate ads', 'spend budget'],
  },
  {
    sourceId: 'SRC-SUPABASE-001',
    label: 'Supabase KPI',
    expectedNextGap: 'atomized',
    updateMethod: 'Manual Supabase/KPI source review from existing KPI health proof, source notes, and source-backed facts until a separately approved read-only KPI freshness card runs.',
    refreshSchedule: 'On demand / weekly operator review. No background Supabase automation, schema mutation, or KPI writeback is approved by this monitoring repair.',
    manualRefresh: 'Future KPI freshness cards may run approved read-only Supabase health checks, but this repair does not query Supabase, mutate schema/data, or write external systems.',
    boundaryTokens: ['Manual Supabase/KPI source review', 'No background Supabase automation', 'does not query Supabase'],
    forbiddenTokens: ['mutate schema/data'],
  },
]

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGET_SOURCE_IDS =
  SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.map(target => target.sourceId)

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.',
  'No auth-required provider call, OAuth repair, paid-source run, or connector live call.',
  'No ClickUp, GoHighLevel, Meta, DataForSEO, Supabase, Google Docs, or Google Sheets live call.',
  'No external write.',
  'No Google Drive permission mutation, request-access email, or raw Drive/Docs exposure.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad Foundation UI redesign.',
  'Do not mark extracted, atomized, synthesized, routed, automation, connector runtime, or governed apply complete for sources without proof.',
]

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_PROOF_COMMANDS = [
  'node --check lib/source-maturity-verified-monitoring-gap-repair.js scripts/process-source-maturity-verified-monitoring-gap-repair-check.mjs',
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-verified-monitoring-gap-repair --json',
  'npm run process:source-maturity-verified-monitoring-gap-repair-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-verified-monitoring-gap-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-verified-monitoring-gap-repair-v1 --commitRef=HEAD',
]

export const SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CHANGED_FILES = [
  'lib/source-maturity-verified-monitoring-gap-repair.js',
  'lib/source-contracts.js',
  'lib/source-contracts-marketing.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  'package.json',
  SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
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

function lower(value) {
  return text(value).toLowerCase()
}

function rowBySourceId(rows = [], sourceId) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || null
}

function contractBySourceId(sources = [], sourceId) {
  return list(sources).find(contract => contract.sourceId === sourceId) || null
}

function hasTrustBoundary(contract = {}) {
  const trustText = lower(`${contract.status || ''} ${contract.validation || ''} ${contract.validationScope || ''}`)
  return ['verified', 'readable only', 'source boundary locked', 'signed off', 'current reality']
    .some(token => trustText.includes(token))
}

function hasMonitoringBoundary(contract = {}, target = {}) {
  const boundaryText = text(`${contract.updateMethod || ''} ${contract.refreshSchedule || ''} ${contract.manualRefresh || ''}`)
  return list(target.boundaryTokens).every(token => boundaryText.includes(token))
}

function hasRegistryEvidence(sourceRegistry = '', target = {}) {
  const registry = text(sourceRegistry)
  return registry.includes(target.sourceId) && registry.includes(target.label.split(' ')[0])
}

export function selectVerifiedMonitoringRepairCandidates({
  sourceContracts = [],
  sourceMaturityGrid = {},
  sourceRegistry = '',
  targets = SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS,
} = {}) {
  const candidates = list(targets).map(target => {
    const contract = contractBySourceId(sourceContracts, target.sourceId)
    const row = rowBySourceId(sourceMaturityGrid.rows, target.sourceId)
    const failures = []
    if (!contract) failures.push('missing_source_contract')
    if (contract && !hasTrustBoundary(contract)) failures.push('source_not_verified_or_readable')
    if (contract && !hasMonitoringBoundary(contract, target)) failures.push('missing_manual_monitoring_boundary')
    if (row && row.stages?.connected?.ok !== true) failures.push('maturity_connected_stage_not_green')
    if (row && row.stages?.trusted?.ok !== true) failures.push('maturity_trusted_stage_not_green')
    if (row && row.stages?.monitored?.ok !== true) failures.push('maturity_monitored_stage_not_green')
    if (row && row.nextGap === 'monitored') failures.push('source_still_blocks_at_monitored')
    if (!hasRegistryEvidence(sourceRegistry, target)) failures.push('source_registry_missing_target_evidence')
    return {
      ok: failures.length === 0,
      failures,
      target,
      sourceId: target.sourceId,
      contract,
      maturityRow: row,
    }
  })
  return {
    ok: candidates.every(candidate => candidate.ok),
    candidates,
    failures: candidates.flatMap(candidate =>
      candidate.failures.map(failure => `${candidate.sourceId}:${failure}`),
    ),
    targetSourceIds: list(targets).map(target => target.sourceId),
  }
}

export function evaluateVerifiedMonitoringGapRepair({
  beforeGrid = {},
  afterGrid = {},
  candidates = {},
  activeExtractionTargets = [],
  targets = SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const targetIds = list(targets).map(target => target.sourceId)
  add(candidates.ok, 'verified monitoring candidates are source-backed', list(candidates.failures).join(', ') || `${targetIds.length} source(s)`)
  for (const target of list(targets)) {
    const beforeRow = rowBySourceId(beforeGrid.rows, target.sourceId) || {}
    const afterRow = rowBySourceId(afterGrid.rows, target.sourceId) || {}
    add(beforeRow.nextGap === 'monitored' || afterRow.nextGap !== 'monitored', `${target.sourceId} starts at monitored gap or is already repaired`, `${beforeRow.nextGap || 'missing'} -> ${afterRow.nextGap || 'missing'}`)
    add(afterRow.stages?.monitored?.ok === true, `${target.sourceId} monitored stage is green after repair`, afterRow.stages?.monitored?.detail || 'missing')
    add(afterRow.nextGap !== 'monitored', `${target.sourceId} no longer blocks on monitored`, afterRow.nextGap || 'missing')
    add(afterRow.nextGap === target.expectedNextGap || afterRow.nextGap === 'complete' || afterRow.nextGap === 'routed' || afterRow.nextGap === 'synthesized', `${target.sourceId} exposes the next real maturity gap`, `${afterRow.nextGap || 'missing'} expected ${target.expectedNextGap}`)
  }
  const activeTargetIds = list(activeExtractionTargets)
    .filter(target => targetIds.includes(target.sourceId || target.source_id))
    .map(target => target.targetKey || target.target_key || target.sourceId || target.source_id)
  add(activeTargetIds.length === 0, 'no active extraction target introduced for repaired sources', activeTargetIds.join(', ') || 'none')
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      targetSourceIds: targetIds,
      repairedCount: targetIds.length,
      afterNextGaps: Object.fromEntries(targetIds.map(sourceId => [sourceId, rowBySourceId(afterGrid.rows, sourceId)?.nextGap || null])),
      activeExtractionTargets: activeTargetIds.length,
      noLiveExtraction: true,
      noProviderCalls: true,
    },
  }
}

function buildSyntheticContracts({ repaired = false } = {}) {
  return SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.map(target => ({
    sourceId: target.sourceId,
    title: target.label,
    group: 'verified',
    status: target.sourceId === 'SRC-CLICKUP-001' ? 'V1 Source Boundary Locked' : 'Verified Readable',
    validation: target.sourceId === 'SRC-SUPABASE-001' ? 'Readable Only' : 'Not Signed Off',
    owner: 'Foundation Source',
    accessMethod: 'Existing source contract',
    ...(repaired
      ? {
          updateMethod: target.updateMethod,
          refreshSchedule: target.refreshSchedule,
          manualRefresh: target.manualRefresh,
        }
      : {}),
  }))
}

export function buildSyntheticVerifiedMonitoringGapRepairProof() {
  const factsBySource = [{ sourceId: 'SRC-SUPABASE-001', total: 31 }]
  const beforeGrid = buildSourceMaturityGridSnapshot({
    sources: buildSyntheticContracts({ repaired: false }),
    intelligenceSynthesisFacts: { factsBySource },
  })
  const afterGrid = buildSourceMaturityGridSnapshot({
    sources: buildSyntheticContracts({ repaired: true }),
    intelligenceSynthesisFacts: { factsBySource },
  })
  const missingCandidates = selectVerifiedMonitoringRepairCandidates({
    sourceContracts: buildSyntheticContracts({ repaired: false }),
    sourceMaturityGrid: beforeGrid,
    sourceRegistry: SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.map(target => `${target.sourceId} ${target.label}`).join('\n'),
  })
  const candidates = selectVerifiedMonitoringRepairCandidates({
    sourceContracts: buildSyntheticContracts({ repaired: true }),
    sourceMaturityGrid: afterGrid,
    sourceRegistry: SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.map(target => `${target.sourceId} ${target.label}`).join('\n'),
  })
  const evaluation = evaluateVerifiedMonitoringGapRepair({
    beforeGrid,
    afterGrid,
    candidates,
    activeExtractionTargets: [],
  })
  const beforeAllBlocked = SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.every(target =>
    rowBySourceId(beforeGrid.rows, target.sourceId)?.nextGap === 'monitored',
  )
  const afterAllClear = SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGETS.every(target =>
    rowBySourceId(afterGrid.rows, target.sourceId)?.nextGap === target.expectedNextGap,
  )
  const missingBoundaryFailures = missingCandidates.candidates.every(candidate =>
    candidate.failures.includes('missing_manual_monitoring_boundary') ||
      candidate.failures.includes('maturity_monitored_stage_not_green') ||
      candidate.failures.includes('source_still_blocks_at_monitored'),
  )
  return {
    ok: beforeAllBlocked && afterAllClear && missingBoundaryFailures && candidates.ok && evaluation.ok,
    beforeGrid,
    afterGrid,
    missingCandidates,
    candidates,
    evaluation,
  }
}

export function renderVerifiedMonitoringGapRepairCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Verified Monitoring Gap Repair Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push(`- Added explicit manual/on-demand monitoring boundaries to ${SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGET_SOURCE_IDS.map(id => `\`${id}\``).join(', ')}.`)
  lines.push('- Kept provider calls, connector live calls, extraction targets, extraction runs, external writes, Drive permission mutation, and automation out of scope.')
  lines.push('- The repair clears only the monitored-stage false blocker and leaves each next real maturity gap visible.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push('- Synthetic dogfood proves verified/readable sources without a monitoring boundary stay blocked at `monitored`.')
  lines.push('- Synthetic dogfood proves the same sources with manual/on-demand boundaries advance to their next real gap.')
  lines.push('- Live proof checks the same source-maturity grid path used by operator surfaces.')
  lines.push(`- Repaired sources: ${summary.repairedCount ?? SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_TARGET_SOURCE_IDS.length}.`)
  lines.push(`- Active extraction targets introduced: ${summary.activeExtractionTargets ?? 0}.`)
  lines.push(`- After next gaps: ${JSON.stringify(summary.afterNextGaps || {})}.`)
  lines.push('- Full `process:foundation-ship` is required before push.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_VERIFIED_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue the safe source maturity/source-contract queue. Source evidence, atom-flow, routing, connector runtime, and extraction readiness remain separate cards with their own proof gates.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
