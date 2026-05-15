import { getDriveFileMetadata, getSheetValues } from './google-delegated.js'
import { getSourceContracts } from './source-contracts.js'
import {
  OWNERS_SHEET_ID,
  formatCompactCurrency,
  parseNumber,
} from './foundation-strategy-source-snapshots.js'

export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-005'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SPRINT_ID = 'foundation-db-strategy-operating-truth-split-2026-05-15'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY = 'foundation-strategy-operating-truth-split-v1'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH = 'docs/process/foundation-db-strategy-operating-truth-split-005-plan.md'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-005.json'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-strategy-operating-truth-split-check.mjs'
export const FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_BEFORE_LINES = 12098

function sourceContractBrief(sourceId) {
  const source = getSourceContracts().find(item => item.sourceId === sourceId)
  if (!source) return { sourceId }
  return {
    sourceId: source.sourceId,
    title: source.title,
    unitName: source.unitName || '',
    status: source.status,
    validation: source.validation,
    lastVerified: source.lastVerified || null,
    owns: source.owns || '',
    boundaryNote: source.boundaryNote || '',
    validationScope: source.validationScope || '',
  }
}

function findSheetMetric(rows, label) {
  const expected = String(label || '').toLowerCase()
  for (const row of rows || []) {
    const labelIndex = row.findIndex(value => String(value || '').trim().toLowerCase() === expected)
    if (labelIndex === -1) continue
    const value = row.slice(labelIndex + 1).find(cell => String(cell ?? '').trim() !== '')
    return value ?? ''
  }
  return ''
}

function summarizeRightmostNumeric(row) {
  for (let index = (row || []).length - 1; index >= 0; index--) {
    const numeric = parseNumber(row[index])
    if (Number.isFinite(numeric) && numeric !== 0) return numeric
  }
  return null
}

function findWeeklyActualsMetric(rows, label) {
  const expected = String(label || '').toLowerCase()
  const row = (rows || []).find(item => String(item?.[3] || '').trim().toLowerCase() === expected)
  return row ? summarizeRightmostNumeric(row) : null
}

function sourceFact(label, value, detail, sourceId) {
  return {
    label,
    value: value == null || value === '' ? 'Not surfaced' : String(value),
    detail,
    sourceId,
  }
}

function conditionalCollectionFacts(rows) {
  const collectionFacts = (rows || [])
    .filter(row => String(row?.[0] || '').trim().toLowerCase().startsWith('collecting '))
    .slice(0, 4)
    .map(row => sourceFact(
      `${String(row[0]).trim()} Net To Team`,
      formatCompactCurrency(parseNumber(row[1])),
      'Listings and Conditional Deals forecast metric. Cash collection buckets use closing date only. Current month, next month, and following month labels roll forward automatically when the month changes.',
      'SRC-OWNERS-001',
    ))
  const missingClosingDateRow = (rows || []).find(row => String(row?.[0] || '').trim().toLowerCase() === 'net to team missing closing date')
  if (missingClosingDateRow) {
    collectionFacts.push(sourceFact(
      'Net To Team Missing Closing Date',
      formatCompactCurrency(parseNumber(missingClosingDateRow[1])),
      'Conditional Net To Team with no closing date. This is visible as forecast risk but is not counted as collection cash until a closing date exists.',
      'SRC-OWNERS-001',
    ))
  }
  return collectionFacts
}

function cardFromContract(sourceId, facts, currentRead, guardrail) {
  const contract = sourceContractBrief(sourceId)
  return {
    ...contract,
    currentRead,
    guardrail,
    facts,
  }
}

export function buildStrategyOperatingTruthSnapshot({
  generatedAt = new Date().toISOString(),
  goalTruth,
  ownersMeta,
  cashflowRows = [],
  weeklyRows = [],
  conditionalRows = [],
  fubSnapshot,
  kpiCards = [],
} = {}) {
  const sourceCards = [
    cardFromContract(
      'SRC-FINANCE-001',
      [
        sourceFact('Workbook Modified', ownersMeta?.modifiedTime || null, 'Google Drive modified time for the Owners Dashboard workbook that contains Weekly Actuals and Cashflow Dash.', 'SRC-FINANCE-001'),
        sourceFact('Available Cash', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Available Cash (Today)'))), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Expected AR', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Expected AR'))), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Uncollected AR', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Uncollected AR'))), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Latest Weekly Revenue Cell', formatCompactCurrency(findWeeklyActualsMetric(weeklyRows, 'Total Revenue')), 'Rightmost non-zero value surfaced from the Weekly Actuals Total Revenue row.', 'SRC-FINANCE-001'),
        sourceFact('Latest Weekly Expense Cell', formatCompactCurrency(findWeeklyActualsMetric(weeklyRows, 'Total Expenses')), 'Rightmost non-zero value surfaced from the Weekly Actuals Total Expenses row.', 'SRC-FINANCE-001'),
      ],
      'Finance truth exists and is signed off for current reality. Weekly Actuals is the operating ledger; Cashflow Dash is the management interpretation layer.',
      'Do not recommend "install weekly finance truth" as if the source does not exist. If finance remains strategic, frame the gap as specific freshness, reconciliation, collections, or scenario-proof work and cite the live finance rows or finance backlog.',
    ),
    cardFromContract(
      'SRC-OWNERS-001',
      [
        sourceFact('Workbook Modified', ownersMeta?.modifiedTime || null, 'Google Drive modified time for the Owners Dashboard workbook.', 'SRC-OWNERS-001'),
        sourceFact('Conditional Last Sync', findSheetMetric(conditionalRows, 'Last sync'), 'ClickUp-generated conditional forecast sheet sync timestamp.', 'SRC-OWNERS-001'),
        sourceFact('Active Conditional Tasks', findSheetMetric(conditionalRows, 'Active conditional tasks'), 'Listings and Conditional Deals forecast metric.', 'SRC-OWNERS-001'),
        sourceFact('Conditions Due / Past Due', findSheetMetric(conditionalRows, 'Conditions due / past due'), 'Listings and Conditional Deals forecast metric.', 'SRC-OWNERS-001'),
        ...conditionalCollectionFacts(conditionalRows),
      ],
      'Owners/Admin is the signed-off deal ledger and the conditional forecast sheet is generated from ClickUp for current cash-forecast cleanup.',
      'Use Owners/BHAG rows for production pace and deal truth before relying on meeting discussion about production.',
    ),
    cardFromContract(
      'SRC-FUB-001',
      [
        sourceFact('FUB Snapshot Refreshed', fubSnapshot?.refreshedAt || null, 'Saved owner-context FUB lead-source snapshot refresh time.', 'SRC-FUB-001'),
        sourceFact('Unique FUB Sources', fubSnapshot?.scan?.uniqueSources, 'Unique lead sources observed in the saved owner-context FUB snapshot.', 'SRC-FUB-001'),
        sourceFact('People Scanned', fubSnapshot?.scan?.peopleScanned, 'People scanned in the saved owner-context FUB lead-source snapshot.', 'SRC-FUB-001'),
      ],
      'FUB is readable and governs CRM person/source/stage/tag context for parity and sales/KPI hygiene questions.',
      'Use FUB source rules and KPI/FUB doctrine before praising lead creation or diagnosing source quality from conversation alone.',
    ),
    cardFromContract(
      'SRC-SUPABASE-001',
      [
        sourceFact('Read Rules', 'pipeline, Shopping List, executed deals, goals, competition, usage', 'SOURCE-010 is closed for first-pass KPI read rules.', 'SRC-SUPABASE-001'),
        sourceFact('KPI Audit Cards', kpiCards.map(card => card.id).join(', '), 'Live backlog cards carrying KPI health, appointment, lead-validation, Shopping List, and opportunity-semantics proof.', 'SRC-SUPABASE-001'),
      ],
      'KPI is readable and read rules are locked; current open work is health/freshness/schema drift and quality/audit surfaces, not rediscovering whether KPI exists.',
      'Use KPI read rules and KPI quality cards before making agent production, lead, appointment, Shopping List, or usage claims.',
    ),
  ]

  return {
    generatedAt,
    rule: 'Strategic gaps must be checked against live source truth before they become recommendations. Shared-comms candidates are leads/evidence, not final operating truth. If a live source says the system already exists or is signed off, reframe the issue as a precise health/freshness/reconciliation/proof gap or suppress it.',
    sourceIds: ['SRC-OWNERS-001', 'SRC-FINANCE-001', 'SRC-FUB-001', 'SRC-SUPABASE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
    currentGoalTruth: goalTruth,
    sourceCards,
    kpiCards,
  }
}

export async function getStrategyOperatingTruthSnapshot({
  pool,
  getFubLeadSourceSnapshot,
  getStrategyGoalTruthSnapshot,
} = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('Strategy Operating Truth snapshot requires a PostgreSQL pool dependency.')
  if (typeof getFubLeadSourceSnapshot !== 'function') throw new Error('Strategy Operating Truth snapshot requires getFubLeadSourceSnapshot dependency.')
  if (typeof getStrategyGoalTruthSnapshot !== 'function') throw new Error('Strategy Operating Truth snapshot requires getStrategyGoalTruthSnapshot dependency.')

  const [
    goalTruth,
    ownersMeta,
    cashflowRowsResponse,
    weeklyRowsResponse,
    conditionalRowsResponse,
    fubSnapshot,
    kpiBacklogResponse,
  ] = await Promise.all([
    getStrategyGoalTruthSnapshot(),
    getDriveFileMetadata('service-account', OWNERS_SHEET_ID),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'Cashflow Dash'!A1:J25"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'(Input) Weekly Actuals'!A1:BR8"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'Listings and Conditional Deals'!A1:B12"),
    getFubLeadSourceSnapshot('owner'),
    pool.query(
      `
        SELECT id, title, lane, priority, summary, status_note, updated_at
        FROM backlog_items
        WHERE id = ANY($1::text[])
        ORDER BY id
      `,
      [['KPI-HEALTH-001', 'KPI-APPT-QUALITY-001', 'KPI-LEAD-VALIDATION-001', 'KPI-SHOPPING-001', 'SOURCE-010', 'SOURCE-021']]
    ),
  ])

  const kpiCards = (kpiBacklogResponse.rows || []).map(row => ({
    id: row.id,
    title: row.title,
    lane: row.lane,
    priority: row.priority,
    summary: row.summary || '',
    statusNote: row.status_note || '',
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }))

  return buildStrategyOperatingTruthSnapshot({
    goalTruth,
    ownersMeta,
    cashflowRows: cashflowRowsResponse.values || [],
    weeklyRows: weeklyRowsResponse.values || [],
    conditionalRows: conditionalRowsResponse.values || [],
    fubSnapshot,
    kpiCards,
  })
}

export function buildSyntheticStrategyOperatingTruthInputs() {
  return {
    generatedAt: '2026-05-15T18:20:00.000Z',
    goalTruth: {
      generatedAt: '2026-05-15T18:20:00.000Z',
      sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
      groups: [],
    },
    ownersMeta: { modifiedTime: '2026-05-15T12:00:00.000Z' },
    cashflowRows: [
      ['Available Cash (Today)', '$125,000'],
      ['Expected AR', '$52,500'],
      ['Uncollected AR', '$13,000'],
    ],
    weeklyRows: [
      ['', '', '', 'Total Revenue', '', 0, '$80,000'],
      ['', '', '', 'Total Expenses', '', 0, '$45,000'],
    ],
    conditionalRows: [
      ['Last sync', '2026-05-15T10:00:00.000Z'],
      ['Active conditional tasks', '17'],
      ['Conditions due / past due', '6 / 2'],
      ['Collecting May', '$210,000'],
      ['Net To Team Missing Closing Date', '$35,000'],
    ],
    fubSnapshot: {
      refreshedAt: '2026-05-15T11:00:00.000Z',
      scan: {
        uniqueSources: 42,
        peopleScanned: 1200,
      },
    },
    kpiCards: [
      { id: 'KPI-HEALTH-001', title: 'KPI health', lane: 'done', priority: 'P1', summary: 'healthy', statusNote: 'proof', updatedAt: '2026-05-15T12:00:00.000Z' },
      { id: 'SOURCE-010', title: 'KPI read rules', lane: 'done', priority: 'P1', summary: 'rules', statusNote: 'proof', updatedAt: '2026-05-15T12:00:00.000Z' },
    ],
  }
}

export function evaluateSyntheticStrategyOperatingTruthSnapshot(snapshot) {
  const sourceIds = new Set((snapshot?.sourceCards || []).map(card => card.sourceId))
  const finance = (snapshot?.sourceCards || []).find(card => card.sourceId === 'SRC-FINANCE-001')
  const owners = (snapshot?.sourceCards || []).find(card => card.sourceId === 'SRC-OWNERS-001')
  const fub = (snapshot?.sourceCards || []).find(card => card.sourceId === 'SRC-FUB-001')
  const kpi = (snapshot?.sourceCards || []).find(card => card.sourceId === 'SRC-SUPABASE-001')
  return {
    ok:
      sourceIds.has('SRC-FINANCE-001') &&
      sourceIds.has('SRC-OWNERS-001') &&
      sourceIds.has('SRC-FUB-001') &&
      sourceIds.has('SRC-SUPABASE-001') &&
      finance?.facts?.some(fact => fact.label === 'Available Cash' && fact.value === '$125K') &&
      owners?.facts?.some(fact => fact.label === 'Net To Team Missing Closing Date') &&
      fub?.facts?.some(fact => fact.label === 'Unique FUB Sources' && fact.value === '42') &&
      kpi?.facts?.some(fact => fact.label === 'KPI Audit Cards' && fact.value.includes('KPI-HEALTH-001')),
    sourceCardCount: snapshot?.sourceCards?.length || 0,
    financeAvailableCash: finance?.facts?.find(fact => fact.label === 'Available Cash')?.value || null,
    ownersMissingClosingDate: owners?.facts?.find(fact => fact.label === 'Net To Team Missing Closing Date')?.value || null,
    fubUniqueSources: fub?.facts?.find(fact => fact.label === 'Unique FUB Sources')?.value || null,
    kpiAuditCards: kpi?.facts?.find(fact => fact.label === 'KPI Audit Cards')?.value || null,
  }
}

export function buildSyntheticStrategyOperatingTruthSnapshot() {
  const inputs = buildSyntheticStrategyOperatingTruthInputs()
  return buildStrategyOperatingTruthSnapshot(inputs)
}

export function evaluateFoundationStrategyOperatingTruthSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_BEFORE_LINES,
  afterLines = 0,
} = {}) {
  const moduleOwnsBuilder =
    moduleSource.includes('export async function getStrategyOperatingTruthSnapshot') &&
    moduleSource.includes('export function buildStrategyOperatingTruthSnapshot') &&
    moduleSource.includes('function findSheetMetric') &&
    moduleSource.includes('function conditionalCollectionFacts') &&
    moduleSource.includes('function cardFromContract')
  const modulePreservesSources =
    moduleSource.includes("'Cashflow Dash'!A1:J25") &&
    moduleSource.includes("'(Input) Weekly Actuals'!A1:BR8") &&
    moduleSource.includes("'Listings and Conditional Deals'!A1:B12") &&
    moduleSource.includes("'SRC-FINANCE-001'") &&
    moduleSource.includes("'SRC-OWNERS-001'") &&
    moduleSource.includes("'SRC-FUB-001'") &&
    moduleSource.includes("'SRC-SUPABASE-001'")
  const dbDelegates =
    foundationDbSource.includes("from './foundation-strategy-operating-truth.js'") &&
    foundationDbSource.includes('getStrategyOperatingTruthSnapshotFromSources') &&
    foundationDbSource.includes('return getStrategyOperatingTruthSnapshotFromSources({')
  const inlineRemoved =
    !foundationDbSource.includes('function findSheetMetric') &&
    !foundationDbSource.includes('function conditionalCollectionFacts') &&
    !foundationDbSource.includes('function cardFromContract') &&
    !foundationDbSource.includes('function sourceContractBrief')
  const scriptReadOnly =
    scriptSource === '' ||
    (
      !scriptSource.includes("from '../lib/google-delegated.js'") &&
      !/import\s*{[^}]*upsertFoundationCurrentSprintOverlay/.test(scriptSource) &&
      !/import\s*{[^}]*updateBacklogItem/.test(scriptSource) &&
      !/import\s*{[^}]*createBacklogItem/.test(scriptSource) &&
      !/await\s+upsertFoundationCurrentSprintOverlay\s*\(/.test(scriptSource) &&
      !/await\s+updateBacklogItem\s*\(/.test(scriptSource) &&
      !/await\s+createBacklogItem\s*\(/.test(scriptSource)
    )
  const planNamesBoundary =
    planSource === '' ||
    (
      planSource.includes('Strategy Operating Truth') &&
      planSource.includes('Gate decision tree') &&
      planSource.includes('Speed boundary') &&
      planSource.includes('Not Next')
    )
  const lineCountDecreased = Number(afterLines || 0) > 0 && Number(afterLines) < Number(beforeLines)

  return {
    ok: moduleOwnsBuilder && modulePreservesSources && dbDelegates && inlineRemoved && scriptReadOnly && planNamesBoundary && lineCountDecreased,
    moduleOwnsBuilder,
    modulePreservesSources,
    dbDelegates,
    inlineRemoved,
    scriptReadOnly,
    planNamesBoundary,
    lineCountDecreased,
    beforeLines,
    afterLines,
  }
}

export function buildFoundationStrategyOperatingTruthSplitDogfoodProof({ afterLines = 12000 } = {}) {
  const unsafeInlineDbSource = `
    function findSheetMetric() {}
    function conditionalCollectionFacts() {}
    function cardFromContract() {}
    export async function getStrategyOperatingTruthSnapshot() {}
  `
  const splitDbSource = `
    import { getStrategyOperatingTruthSnapshot as getStrategyOperatingTruthSnapshotFromSources } from './foundation-strategy-operating-truth.js'
    export async function getStrategyOperatingTruthSnapshot() {
      return getStrategyOperatingTruthSnapshotFromSources({
        pool,
        getFubLeadSourceSnapshot,
        getStrategyGoalTruthSnapshot,
      })
    }
  `
  const splitModuleSource = `
    export function buildStrategyOperatingTruthSnapshot() {}
    function findSheetMetric() {}
    function conditionalCollectionFacts() {}
    function cardFromContract() {}
    export async function getStrategyOperatingTruthSnapshot() {}
    'Cashflow Dash'!A1:J25
    '(Input) Weekly Actuals'!A1:BR8
    'Listings and Conditional Deals'!A1:B12
    'SRC-FINANCE-001'
    'SRC-OWNERS-001'
    'SRC-FUB-001'
    'SRC-SUPABASE-001'
  `
  const oldEvaluation = evaluateFoundationStrategyOperatingTruthSplit({
    foundationDbSource: unsafeInlineDbSource,
    moduleSource: '',
    beforeLines: FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const newEvaluation = evaluateFoundationStrategyOperatingTruthSplit({
    foundationDbSource: splitDbSource,
    moduleSource: splitModuleSource,
    planSource: 'Strategy Operating Truth Gate decision tree Speed boundary Not Next',
    beforeLines: FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_BEFORE_LINES,
    afterLines,
  })
  const syntheticSnapshot = buildSyntheticStrategyOperatingTruthSnapshot()
  const syntheticEvaluation = evaluateSyntheticStrategyOperatingTruthSnapshot(syntheticSnapshot)

  return {
    ok: oldEvaluation.ok === false && newEvaluation.ok === true && syntheticEvaluation.ok === true,
    oldInlineRejected: oldEvaluation.ok === false,
    splitModuleAccepted: newEvaluation.ok === true,
    syntheticEvaluation,
  }
}
