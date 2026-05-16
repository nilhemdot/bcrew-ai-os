export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID = 'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001'
export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY = 'foundation-ui-live-summary-sources-v1'
export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SPRINT_ID = 'foundation-ui-live-summary-sources-2026-05-16'
export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_PLAN_PATH = 'docs/process/foundation-ui-live-summary-sources-001-plan.md'
export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001.json'
export const FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH = 'scripts/process-foundation-ui-live-summary-sources-check.mjs'
export const FOUNDATION_CURRENT_STATE_SUMMARY_SCHEMA_VERSION = 'foundation-current-state-summary.v1'

function normalizeList(value) {
  return (Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function unique(values = []) {
  return Array.from(new Set(normalizeList(values)))
}

function sourceIdsFromRow(row = {}) {
  const ids = []
  if (Array.isArray(row.sourceId)) ids.push(...row.sourceId)
  else if (row.sourceId) ids.push(row.sourceId)
  for (const part of Array.isArray(row.packageParts) ? row.packageParts : []) {
    if (part?.sourceId) ids.push(part.sourceId)
  }
  return unique(ids)
}

function hasSource(sourceContracts = [], sourceId) {
  return sourceContracts.some(source => source?.id === sourceId || source?.sourceId === sourceId)
}

function findCard(backlogItems = [], cardId) {
  return backlogItems.find(card => card?.id === cardId) || null
}

function isDoneCard(backlogItems = [], cardId) {
  return findCard(backlogItems, cardId)?.lane === 'done'
}

function sourceStatus(sourceContracts, sourceId) {
  return hasSource(sourceContracts, sourceId) ? 'connected' : 'pending'
}

function sourceStatusLabel(sourceContracts, sourceId, connectedLabel = 'Source registered') {
  return hasSource(sourceContracts, sourceId) ? connectedLabel : 'Source contract missing'
}

function kpiHealthText(kpiHealth = {}) {
  const summary = kpiHealth.summary || kpiHealth || {}
  const status = summary.status || kpiHealth.status || 'unknown'
  const tableCount = Number(summary.tableCount || 0)
  const rpcCount = Number(summary.rpcCount || 0)
  const staleTables = Number(summary.staleTables || 0)
  const period = summary.periodContract || kpiHealth.periodContract || null
  const periodText = period?.periodStart && period?.periodEnd
    ? ` Period: ${period.periodStart} to ${period.periodEnd}.`
    : ''
  return `KPI source health reports ${status}. ${tableCount} table checks and ${rpcCount} RPC checks are visible; ${staleTables} stale table warnings.${periodText}`
}

function sprintVerificationText(currentSprint = {}) {
  const status = currentSprint.status || 'unknown'
  const doneCount = Number(currentSprint.summary?.doneThisSprintCount || 0)
  const active = currentSprint.activeBlocker?.cardId || currentSprint.sprint?.activeBlockerCardId || ''
  const activeText = active ? ` Active card: ${active}.` : ''
  return `Foundation verification is live. Current Sprint status is ${status}; ${doneCount} card(s) are done in the active sprint.${activeText}`
}

function row(id, data) {
  return {
    id,
    ...data,
    sourceIds: sourceIdsFromRow(data),
    backlogIds: normalizeList(data.backlogIds),
    sourcePosture: data.sourcePosture || 'source_backed_payload',
  }
}

export function buildFoundationCurrentStateSurfaceRows({
  sourceContracts = [],
  backlogItems = [],
  kpiHealth = {},
  currentSprint = {},
} = {}) {
  const strategyPackageClosed = isDoneCard(backlogItems, 'FOUNDATION-001') && isDoneCard(backlogItems, 'SOURCE-014')
  const data020Done = isDoneCard(backlogItems, 'DATA-020')
  const kpiStatus = (kpiHealth.summary || kpiHealth || {}).status || 'unknown'
  const kpiConnected = kpiStatus === 'healthy' || kpiStatus === 'degraded'

  return [
    row('strategy-packet', {
      title: 'Strategy packet',
      surfaceType: 'Package',
      sourceId: ['SRC-STRATEGY-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-OWNERS-001'],
      statusKey: strategyPackageClosed ? 'connected' : 'pending',
      statusLabel: strategyPackageClosed ? 'Source package closed' : 'Source package needs review',
      levelLabel: 'Mixed Level 2/3 - docs monitored, inputs trusted',
      current: 'The strategy input package is drawn from registered source contracts plus the live backlog closeout state. Docs have first-pass change/watch/provenance visibility; supporting inputs are signed off for current-reality meaning.',
      packageParts: [
        {
          sourceId: 'SRC-STRATEGY-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-STRATEGY-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-STRATEGY-001', 'Level 3'),
          body: 'Canonical strategy docs are source registered, with change watch, decision traceability, and proposal/history flow visible.',
          role: 'Strategy docs',
          next: 'Deepen temporal truth and provenance only when strategy workflow requires it.',
        },
        {
          sourceId: 'SRC-FREEDOM-COMMUNITY-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001', 'Level 2'),
          body: 'Mapped and understood for strategy use.',
          role: 'Freedom input',
          next: 'No active source-signoff work.',
        },
        {
          sourceId: 'SRC-FREEDOM-BHAG-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FREEDOM-BHAG-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FREEDOM-BHAG-001', 'Level 2'),
          body: 'Mapped and understood for strategy use.',
          role: 'Freedom input',
          next: 'No active source-signoff work.',
        },
        {
          sourceId: 'SRC-FREEDOM-ENGINE-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FREEDOM-ENGINE-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FREEDOM-ENGINE-001', 'Level 2'),
          body: 'Mapped and understood for strategy use.',
          role: 'Freedom input',
          next: 'No active source-signoff work.',
        },
        {
          sourceId: 'SRC-OWNERS-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-OWNERS-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-OWNERS-001', 'Level 3'),
          body: 'Strategy-used Owners slice is tied to the Owners package and current-reality finance/list boundaries.',
          role: 'Owners slice used in strategy',
          next: 'No current package blocker.',
        },
      ],
      next: strategyPackageClosed ? 'No source sign-off closeout work remains for this package.' : 'Review source-package closeout cards before calling this closed.',
      later: 'Extract and synthesize business insights through the Foundation pipeline, then deepen Freedom drift monitoring, source-backed value hardening, decision provenance, and temporal history.',
      backlogIds: ['FOUNDATION-001', 'SOURCE-014'],
    }),
    row('system-strategy', {
      title: 'System strategy',
      surfaceType: 'Docs',
      statusKey: 'connected',
      statusLabel: 'Doctrine visible',
      levelLabel: 'Level 2 - doctrine signed off',
      current: 'Doctrine, boundaries, and rebuild direction come from repo docs and rebuild-plan truth.',
      next: 'No closeout work right now.',
      later: 'Update only when doctrine changes.',
      backlogIds: [],
    }),
    row('rebuild-visibility', {
      title: 'Rebuild visibility',
      surfaceType: 'System',
      statusKey: 'connected',
      statusLabel: 'Visible',
      levelLabel: 'Level 3 - visibility live',
      current: 'Foundation Overview and Rebuild Plan are rendered from repo/API truth and remain visible in the site.',
      next: 'Keep this aligned with backlog truth.',
      later: 'Do not let side docs drift away from this page.',
      backlogIds: [],
    }),
    row('verification-baseline', {
      title: 'Verification baseline',
      surfaceType: 'System',
      statusKey: currentSprint.status === 'healthy' ? 'connected' : 'pending',
      statusLabel: currentSprint.status === 'healthy' ? 'Verifier visible' : 'Verifier status needs review',
      levelLabel: 'Level 3 - verifier visible',
      current: sprintVerificationText(currentSprint),
      next: 'Use the active Current Sprint and ship gate before calling new work done.',
      later: 'Add checks only when new source surfaces close.',
      backlogIds: [],
    }),
    row('owners-admin-package', {
      title: 'Owners Admin package',
      surfaceType: 'Package',
      sourceId: ['SRC-OWNERS-001', 'SRC-FUB-001'],
      statusKey: hasSource(sourceContracts, 'SRC-OWNERS-001') && hasSource(sourceContracts, 'SRC-FUB-001') ? 'connected' : 'pending',
      statusLabel: 'V1 ready',
      levelLabel: 'Level 6 - findings routed to Ops',
      current: 'Owners/FUB status is sourced from registered contracts and backlog closeouts. Review runners and Ops queues own row cleanup instead of this Overview embedding frozen row claims.',
      packageParts: [
        {
          sourceId: 'SRC-OWNERS-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-OWNERS-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-OWNERS-001', 'Level 3'),
          body: 'Owners source is registered and review/freshness guardrails are visible for the v1 deal-review lane.',
          role: 'Owners base source',
        },
        {
          sourceId: 'SRC-FUB-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FUB-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FUB-001', 'Level 6'),
          body: 'FUB joins, lead-source lineage rules, and Admin review enforcement route cleanup through Ops.',
          role: 'Dependency source',
          next: 'Work the Ops queue as findings appear.',
        },
      ],
      next: 'No Foundation source-package closeout remains.',
      later: 'Keep source-field fixes human-owned until Ops approves assignment and approval-gated apply/writeback.',
      backlogIds: [],
    }),
    row('fub-lead-source-taxonomy', {
      title: 'FUB lead-source taxonomy',
      surfaceType: 'Data source',
      sourceId: 'SRC-FUB-001',
      statusKey: sourceStatus(sourceContracts, 'SRC-FUB-001'),
      statusLabel: 'V1 ready',
      levelLabel: 'Level 6 - source issues routed to Ops',
      current: 'FUB source status is pulled from the registered source contract; invalid-source and missing-link cleanup belongs to Ops queue surfaces.',
      packageParts: [
        {
          sourceId: 'SRC-FUB-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FUB-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FUB-001', 'Level 6'),
          body: 'FUB is readable, v1 source-lineage rules are locked, drift is visible, and cleanup routes through Ops.',
          role: 'FUB source contract',
          next: 'Keep deeper opportunity semantics and stage-table proof in Sales Hub follow-on work.',
        },
      ],
      next: 'No v1 taxonomy closeout remains. Ops Hub owns invalid-source and missing-link cleanup findings.',
      later: 'Deepen Sales Hub opportunity semantics, live stage-table proof, broader issue routing, and agent coaching support.',
      backlogIds: [],
    }),
    row('finance-signoff', {
      title: 'Finance sign-off',
      surfaceType: 'Data source',
      sourceId: 'SRC-FINANCE-001',
      statusKey: sourceStatus(sourceContracts, 'SRC-FINANCE-001'),
      statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FINANCE-001', 'Current reality signed off'),
      levelLabel: 'Level 2 - meaning signed off',
      current: 'Finance meaning comes from the registered finance source contract. QuickBooks remains optional compliance verification, not a current rebuild dependency.',
      packageParts: [
        {
          sourceId: 'SRC-FINANCE-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-FINANCE-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-FINANCE-001', 'Level 2'),
          body: 'Finance current-reality meaning is signed off across the tracked finance tabs and helper coverage.',
          role: 'Finance source contract',
          next: 'Add freshness/payment reconciliation only when finance becomes a continuous automation reader.',
        },
      ],
      next: 'No source-signoff rediscovery work remains here.',
      later: 'Define Level 3 freshness, payment reconciliation, and automation rules only when finance automation starts reading continuously.',
      backlogIds: ['FOUNDATION-003'],
    }),
    row('kpi-source-health-system', {
      title: 'KPI source health system',
      surfaceType: 'Data source',
      sourceId: 'SRC-SUPABASE-001',
      statusKey: kpiConnected ? 'connected' : 'pending',
      statusLabel: kpiConnected ? 'Health probe active' : 'Health probe needs review',
      levelLabel: 'Level 3 - read rules plus health checks',
      current: kpiHealthText(kpiHealth),
      packageParts: [
        {
          sourceId: 'SRC-SUPABASE-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-SUPABASE-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-SUPABASE-001', 'Level 3'),
          body: 'KPI Supabase is readable, read rules are locked, and KPI Health reports table/RPC availability from the runtime snapshot.',
          role: 'KPI source contract',
          next: 'Add freshness cadence and deeper schema/code drift review before continuous Sales Hub dependency.',
        },
      ],
      next: 'No current-state source-signoff work remains.',
      later: 'Add visible freshness, deeper schema/code drift review, and future Sales Hub surfaces.',
      backlogIds: [],
    }),
    row('meeting-notes-transcript-intelligence', {
      title: 'Meeting notes / transcript intelligence',
      surfaceType: 'Source + extraction system',
      sourceId: 'SRC-MEETINGS-001',
      statusKey: sourceStatus(sourceContracts, 'SRC-MEETINGS-001'),
      statusLabel: 'Owner usable; open hardening',
      levelLabel: 'Level 5 - archived, extracted, synthesized',
      current: 'Meeting status is anchored to the registered Meetings source and extraction runtime proof. Use Runtime Health for live run counts instead of treating this Overview as a transcript counter.',
      packageParts: [
        {
          sourceId: 'SRC-MEETINGS-001',
          statusKey: sourceStatus(sourceContracts, 'SRC-MEETINGS-001'),
          statusLabel: sourceStatusLabel(sourceContracts, 'SRC-MEETINGS-001', 'Level 4'),
          body: 'Meeting notes and transcripts are captured from Google Drive and filed as source-backed artifacts with provenance.',
          role: 'Meeting source contract',
          next: 'Keep daily current sync healthy and use gap reports when transcripts are missing.',
        },
        {
          sourceId: 'SRC-MEETINGS-001',
          statusKey: 'pending',
          statusLabel: 'Level 5',
          body: 'Transcript candidate extraction runs with Foundation context before synthesis/routing.',
          role: 'Meeting intelligence layer',
          next: 'Use this for Steve-owner strategy work now; do not expose raw meeting intelligence to agent/team query surfaces until SECURITY-002 lands.',
        },
      ],
      next: 'Monitor scheduled meeting current-sync and transcript-extraction runs through Runtime Health.',
      later: 'Add rich meeting video/recording vision, Zoom/Drive video transcription, filtered summary access requests, subject-person redaction, and Action Router handoff.',
      backlogIds: ['SECURITY-002', 'MEETING-VIDEO-001', 'SYNTHESIS-ENGINE-001', 'ACTION-ROUTER-001'],
    }),
    row('shared-freshness-rules', {
      title: 'Shared freshness rules',
      surfaceType: 'Rule set',
      statusKey: data020Done ? 'connected' : 'pending',
      statusLabel: data020Done ? 'First guardrails live' : 'Guardrails need review',
      levelLabel: 'Level 3 - first guardrails live',
      current: 'Freshness maturity is sourced from the live backlog and source-health surfaces. Owners/FUB guardrails are the first layer; wider stale-data rollout remains future source work.',
      next: data020Done ? 'No active freshness-rule closeout remains for the current Owners/FUB layer.' : 'Review DATA-020 before calling freshness rules closed.',
      later: 'Reuse this pattern for finance, KPI, connectors, Drive/video corpus, and future source surfaces when those readers become continuous.',
      backlogIds: ['DATA-020'],
    }),
  ]
}

export function buildFoundationCurrentStateSummaryPayload(input = {}) {
  const surfaceRows = buildFoundationCurrentStateSurfaceRows(input)
  const sourceRefs = unique(surfaceRows.flatMap(row => row.sourceIds))
  const backlogRefs = unique(surfaceRows.flatMap(row => row.backlogIds))
  return {
    schemaVersion: FOUNDATION_CURRENT_STATE_SUMMARY_SCHEMA_VERSION,
    generatedAt: input.generatedAt || new Date().toISOString(),
    cardId: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID,
    closeoutKey: FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY,
    sourcePosture: 'source_backed_payload',
    sourceRefs,
    backlogRefs,
    summary: {
      surfaceRowCount: surfaceRows.length,
      sourceRefCount: sourceRefs.length,
      backlogRefCount: backlogRefs.length,
      connectedRows: surfaceRows.filter(row => row.statusKey === 'connected').length,
      pendingRows: surfaceRows.filter(row => row.statusKey === 'pending').length,
    },
    surfaceRows,
  }
}

export function evaluateFoundationCurrentStateSummarySourceContract({
  payload = {},
  frontendSource = '',
  auditFindingIds = [],
} = {}) {
  const rows = Array.isArray(payload.surfaceRows) ? payload.surfaceRows : []
  const rowIds = rows.map(row => row.id)
  const requiredRows = [
    'strategy-packet',
    'verification-baseline',
    'owners-admin-package',
    'kpi-source-health-system',
    'meeting-notes-transcript-intelligence',
  ]
  const checks = [
    {
      ok: payload.schemaVersion === FOUNDATION_CURRENT_STATE_SUMMARY_SCHEMA_VERSION,
      check: 'payload exposes current-state summary schema',
      detail: payload.schemaVersion || 'missing',
    },
    {
      ok: payload.sourcePosture === 'source_backed_payload',
      check: 'payload declares source-backed posture',
      detail: payload.sourcePosture || 'missing',
    },
    {
      ok: requiredRows.every(id => rowIds.includes(id)),
      check: 'payload contains required current-state rows',
      detail: rowIds.join(', '),
    },
    {
      ok: rows.every(row => Array.isArray(row.sourceIds) && Array.isArray(row.backlogIds)),
      check: 'rows expose normalized source/backlog refs',
      detail: `${rows.length} rows`,
    },
    {
      ok: !/var\s+surfaceRows\s*=\s*\[/.test(frontendSource),
      check: 'frontend no longer owns the live surface row array',
      detail: 'surfaceRows array removed from renderer',
    },
    {
      ok: /currentStateSummary/.test(frontendSource) && /renderCurrentStateMissingSummaryPanel/.test(frontendSource),
      check: 'frontend renders source-backed payload and degraded fallback',
      detail: 'payload + fallback markers present',
    },
    {
      ok: !auditFindingIds.includes('hardcoded-foundation-ui-current-summary'),
      check: 'nightly audit no longer flags active frontend current summary copy',
      detail: auditFindingIds.join(', ') || 'no matching finding',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      rowCount: rows.length,
      requiredRowsPresent: requiredRows.every(id => rowIds.includes(id)),
      sourceRefCount: Array.isArray(payload.sourceRefs) ? payload.sourceRefs.length : 0,
    },
  }
}

export function buildFoundationCurrentStateSummaryDogfoodProof() {
  const sourceContracts = [
    { id: 'SRC-STRATEGY-001' },
    { id: 'SRC-FREEDOM-COMMUNITY-001' },
    { id: 'SRC-FREEDOM-BHAG-001' },
    { id: 'SRC-FREEDOM-ENGINE-001' },
    { id: 'SRC-OWNERS-001' },
    { id: 'SRC-FUB-001' },
    { id: 'SRC-FINANCE-001' },
    { id: 'SRC-SUPABASE-001' },
    { id: 'SRC-MEETINGS-001' },
  ]
  const backlogItems = [
    { id: 'FOUNDATION-001', lane: 'done' },
    { id: 'SOURCE-014', lane: 'done' },
    { id: 'DATA-020', lane: 'done' },
  ]
  const base = buildFoundationCurrentStateSummaryPayload({
    generatedAt: '2026-05-16T10:00:00.000Z',
    sourceContracts,
    backlogItems,
    kpiHealth: {
      summary: {
        status: 'healthy',
        tableCount: 14,
        rpcCount: 5,
        staleTables: 0,
        periodContract: {
          periodStart: '2026-01-01',
          periodEnd: '2026-12-31',
        },
      },
    },
    currentSprint: {
      status: 'healthy',
      summary: { doneThisSprintCount: 2 },
      activeBlocker: { cardId: 'SYNTHETIC-CARD-001' },
    },
  })
  const mutated = buildFoundationCurrentStateSummaryPayload({
    generatedAt: '2026-05-16T10:01:00.000Z',
    sourceContracts,
    backlogItems,
    kpiHealth: {
      summary: {
        status: 'degraded',
        tableCount: 77,
        rpcCount: 9,
        staleTables: 3,
        periodContract: {
          periodStart: '2027-01-01',
          periodEnd: '2027-12-31',
        },
      },
    },
    currentSprint: {
      status: 'healthy',
      summary: { doneThisSprintCount: 8 },
      activeBlocker: { cardId: 'SYNTHETIC-CARD-999' },
    },
  })
  const baseKpi = base.surfaceRows.find(row => row.id === 'kpi-source-health-system') || {}
  const mutatedKpi = mutated.surfaceRows.find(row => row.id === 'kpi-source-health-system') || {}
  const baseVerifier = base.surfaceRows.find(row => row.id === 'verification-baseline') || {}
  const mutatedVerifier = mutated.surfaceRows.find(row => row.id === 'verification-baseline') || {}

  return {
    ok: baseKpi.current !== mutatedKpi.current &&
      mutatedKpi.current.includes('77 table checks') &&
      mutatedKpi.current.includes('9 RPC checks') &&
      mutatedKpi.current.includes('2027-01-01') &&
      baseVerifier.current !== mutatedVerifier.current &&
      mutatedVerifier.current.includes('SYNTHETIC-CARD-999'),
    baseKpi: baseKpi.current,
    mutatedKpi: mutatedKpi.current,
    baseVerifier: baseVerifier.current,
    mutatedVerifier: mutatedVerifier.current,
    dogfoodInvariant: 'Changing the source-backed payload inputs changes the rendered current-state row copy without editing frontend code.',
  }
}
