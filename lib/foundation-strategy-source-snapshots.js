import { getSheetValues } from './google-delegated.js'

export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-004'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID = 'foundation-db-strategy-source-snapshot-split-2026-05-15'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY = 'foundation-strategy-source-snapshot-split-v1'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH = 'docs/process/foundation-db-strategy-source-snapshot-split-004-plan.md'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-004.json'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-strategy-source-snapshot-split-check.mjs'
export const FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES = 12629

export const BHAG_DOC_PATH = 'docs/strategy/bhag-model.md'
export const AGENT_ENGINE_DOC_PATH = 'docs/strategy/agent-engine.md'
export const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
export const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const TORONTO_TIMEZONE = 'America/Toronto'
const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

function getTorontoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = Number(part.value)
    }
    return acc
  }, {})
}

function getTodayTorontoIso() {
  const parts = getTorontoDateParts()
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getDayOfYearToronto() {
  const parts = getTorontoDateParts()
  const start = Date.UTC(parts.year, 0, 1)
  const current = Date.UTC(parts.year, parts.month - 1, parts.day)
  return Math.floor((current - start) / 86400000) + 1
}

function daysInTorontoYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365
}

export function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[$,%\s,]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sheetSerialToDate(serial) {
  const numeric = parseNumber(serial)
  if (!Number.isFinite(numeric)) return null
  return new Date(Math.round((numeric - 25569) * 86400 * 1000))
}

export function formatCompactCurrency(value) {
  const numeric = parseNumber(value) || 0
  const abs = Math.abs(numeric)

  if (abs >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `$${(numeric / 1_000).toFixed(0)}K`
  return `$${Math.round(numeric)}`
}

function formatAgentCount(value) {
  const numeric = Math.round(parseNumber(value) || 0)
  return `${numeric.toLocaleString('en-CA')} agents`
}

function formatAgentCountPrecise(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} agents`
}

function formatAgentCountCeil(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.ceil(numeric).toLocaleString('en-CA')} agents`
}

function formatMonthlyAgentRate(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} / mo`
}

function formatPercent(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(numeric * 100)}%`
}

function formatCurrencyDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return formatCompactCurrency(Math.abs(numeric))
}

function formatAgentDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(Math.abs(numeric)).toLocaleString('en-CA')} agents`
}

function formatPointDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const points = Math.abs(numeric * 100)
  const rounded = Math.round(points * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} pts`
}

function formatPaceLabel(diff, unitFormatter) {
  const abs = Math.abs(diff)
  const direction = diff >= 0 ? 'Ahead' : 'Behind'
  return `${direction} by ${unitFormatter(abs)}`
}

function formatPaceWithPercent(diff, baseline, unitFormatter) {
  const pct = baseline ? Math.abs(diff) / baseline : 0
  const sign = diff >= 0 ? '+' : '-'
  return `${formatPaceLabel(diff, unitFormatter)} (${sign}${(pct * 100).toFixed(1)}%)`
}

function monthYearToIso(monthName, year) {
  const monthKey = String(monthName || '').trim().toLowerCase()
  const monthIndex = MONTH_INDEX[monthKey]
  const numericYear = parseNumber(year)
  if (monthIndex == null || !numericYear) return getTodayTorontoIso()
  return `${numericYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

function buildBhagYearRows(groupTitle, rows, sourceId, detail, valueFormatter, startYear = 2026) {
  return rows.flatMap((row, index) => {
    const yearLabel = String(startYear + index)
    return [
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: yearLabel,
        value: valueFormatter(row[0]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: `Growth ${yearLabel}`,
        value: formatPercent(row[1]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    ]
  })
}

function buildEngineMetricRow(groupTitle, label, value, detail, sortOrder, sourceId = 'SRC-FREEDOM-ENGINE-001') {
  return {
    docPath: AGENT_ENGINE_DOC_PATH,
    sourceId,
    groupTitle,
    label,
    value,
    detail,
    asOf: getTodayTorontoIso(),
    sortOrder,
  }
}

export async function getLiveAgentEngineSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [bhagCalcRes, bhagTargetsRes, engineRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!A22:B31"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Agent Engine'!A1:K10"),
  ])

  const calcRows = bhagCalcRes.values || []
  const calcMap = {}
  calcRows.forEach(row => {
    const key = String(row?.[0] || '').trim()
    if (!key || row?.[1] == null) return
    calcMap[key] = row[1]
  })

  function getCalcMetric(...keys) {
    for (const key of keys) {
      const numeric = parseNumber(calcMap[key])
      if (Number.isFinite(numeric)) return numeric
    }
    return null
  }

  const annualVolumeAverage = getCalcMetric('Annual Volume Average', 'Agent Annual Volume Average')
  const teamSplit = getCalcMetric('Split to Team')
  const monthlyGciAverage = getCalcMetric('Average Monthly GCI', 'Agent Average Monthly GCI')
  const planningAttritionAssumption = getCalcMetric('Planning Attrition Assumption')

  const targetRows = (bhagTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const values = engineRes.values || []
  const requiredRecruitingPace = parseNumber(values[2]?.[1])
  const recruitingSixMonth = parseNumber(values[3]?.[1])
  const attritionRate = parseNumber(values[4]?.[1])
  const avgAdditions = parseNumber(values[5]?.[1])
  const avgAttrition = parseNumber(values[6]?.[1])

  const activeAgents = parseNumber(values[2]?.[4])

  const avgProduction = parseNumber(values[2]?.[7])
  const productionTarget = Number.isFinite(monthlyGciAverage)
    ? monthlyGciAverage
    : parseNumber(values[3]?.[7])

  const actualSplit = parseNumber(values[2]?.[10])
  const targetSplit = parseNumber(values[3]?.[10])

  const currentYearIndex = Math.max(0, Math.min(currentYear - yearStart, targetRows.length - 1))
  const currentYearVolumeTarget = targetRows[currentYearIndex]?.[0]
  const requiredAgentsThisYear = Number.isFinite(currentYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? currentYearVolumeTarget / annualVolumeAverage
    : null
  const requiredAgentsThisYearDisplay = Number.isFinite(requiredAgentsThisYear)
    ? Math.ceil(requiredAgentsThisYear)
    : null

  const nextYear = Math.min(currentYear + 1, yearStart + targetRows.length - 1)
  const nextYearIndex = Math.max(0, nextYear - yearStart)
  const nextYearVolumeTarget = targetRows[nextYearIndex]?.[0]
  const requiredStartAgents = Number.isFinite(nextYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? nextYearVolumeTarget / annualVolumeAverage
    : parseNumber(values[3]?.[4])
  const requiredStartAgentsDisplay = Number.isFinite(requiredStartAgents)
    ? Math.ceil(requiredStartAgents)
    : null

  const recruitingGap = Number.isFinite(requiredRecruitingPace) && Number.isFinite(recruitingSixMonth)
    ? recruitingSixMonth - requiredRecruitingPace
    : null
  const capacityGap = Number.isFinite(activeAgents) && Number.isFinite(requiredStartAgentsDisplay)
    ? activeAgents - requiredStartAgentsDisplay
    : parseNumber(values[4]?.[4])
  const currentYearGap = Number.isFinite(activeAgents) && Number.isFinite(requiredAgentsThisYearDisplay)
    ? activeAgents - requiredAgentsThisYearDisplay
    : null
  const splitGap = Number.isFinite(actualSplit) && Number.isFinite(targetSplit)
    ? actualSplit - targetSplit
    : parseNumber(values[4]?.[10])
  const productionGap = Number.isFinite(avgProduction) && Number.isFinite(productionTarget)
    ? avgProduction - productionTarget
    : null

  const inputsDetail = 'Live productivity and unit-economics assumptions from the Benson Crew BHAG Builder.'
  const pathDetail = 'Required agent counts at the current annual volume average per agent.'
  const requirementBhagDetail = 'What the model needs next, using the BHAG builder and current productivity assumption.'
  const requirementEngineDetail = 'Current recruiting and capacity read from the Freedom KPI Sheet Agent Engine tab.'

  const snapshot = [
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Average Monthly GCI',
      value: `${formatCompactCurrency(monthlyGciAverage)} / mo`,
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Split to Team',
      value: formatPercent(teamSplit),
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
  ]

  targetRows.forEach((row, index) => {
    const yearLabel = String(yearStart + index)
    const requiredAgents = Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
      ? row[0] / annualVolumeAverage
      : null

    snapshot.push(
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: yearLabel,
        value: formatCompactCurrency(row[0]),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: `Required Agents ${yearLabel}`,
        value: formatAgentCountCeil(requiredAgents),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    )
  })

  snapshot.push(
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Current-Year Volume Target',
      value: formatCompactCurrency(currentYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Agents This Year',
      value: formatAgentCountCeil(requiredAgentsThisYearDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Next-Year Volume Target',
      value: formatCompactCurrency(nextYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 3,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Start-of-Year Agents',
      value: formatAgentCountCeil(requiredStartAgentsDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 4,
    },
    buildEngineMetricRow('Current Requirement', 'Current Active Agents', formatAgentCountPrecise(activeAgents), requirementEngineDetail, 5),
    buildEngineMetricRow('Current Requirement', 'Gap This Year', formatPaceWithPercent(currentYearGap, requiredAgentsThisYearDisplay, formatAgentDelta), requirementEngineDetail, 6),
    buildEngineMetricRow('Current Requirement', 'Gap to Next Year', formatPaceWithPercent(capacityGap, requiredStartAgentsDisplay, formatAgentDelta), requirementEngineDetail, 7),
    buildEngineMetricRow('Current Requirement', 'Required Recruiting Pace', formatMonthlyAgentRate(requiredRecruitingPace), requirementEngineDetail, 8),
    buildEngineMetricRow('Current Requirement', 'Current Recruiting Pace', formatMonthlyAgentRate(recruitingSixMonth), requirementEngineDetail, 9),
    buildEngineMetricRow('Current Requirement', 'Current Avg Production / Agent', `${formatCompactCurrency(avgProduction)} / mo`, requirementEngineDetail, 10),
    buildEngineMetricRow('Current Requirement', 'Production Target / Agent', `${formatCompactCurrency(productionTarget)} / mo`, requirementBhagDetail, 11, 'SRC-FREEDOM-BHAG-001'),
    buildEngineMetricRow('Current Requirement', 'Production Gap', formatPaceWithPercent(productionGap, productionTarget, formatCurrencyDelta), requirementEngineDetail, 12),
    buildEngineMetricRow(
      'Current Requirement',
      'Planning Attrition Assumption',
      formatPercent(planningAttritionAssumption),
      'The planning attrition rate now comes from the BHAG builder assumptions and feeds the required recruiting formula.',
      13,
      'SRC-FREEDOM-BHAG-001'
    ),
    buildEngineMetricRow('Current Requirement', 'Live Attrition Pressure', formatPercent(attritionRate), requirementEngineDetail, 14),
    buildEngineMetricRow('Current Requirement', 'Avg Additions / Month', formatMonthlyAgentRate(avgAdditions), requirementEngineDetail, 15),
    buildEngineMetricRow('Current Requirement', 'Avg Attrition / Month', formatMonthlyAgentRate(avgAttrition), requirementEngineDetail, 16),
    buildEngineMetricRow('Current Requirement', 'Actual Split', formatPercent(actualSplit), requirementEngineDetail, 17),
    buildEngineMetricRow('Current Requirement', 'Target Split', formatPercent(targetSplit), requirementEngineDetail, 18),
    buildEngineMetricRow('Current Requirement', 'Split Gap', `${splitGap >= 0 ? 'Above target' : 'Below target'} by ${formatPointDelta(splitGap)}`, requirementEngineDetail, 19),
  )

  return snapshot
}

export async function getLiveBhagSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [teamTargetsRes, communityTargetsRes, communityTrackerRes, ownersRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K20:L29"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Data Entry - BCrew Team/Community'!G1:O80"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'ADMIN ONLY - Deal Data Entry'!G:AI"),
  ])

  const teamTargetRows = (teamTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))
  const communityTargetRows = (communityTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const snapshot = []
  snapshot.push(
    ...buildBhagYearRows(
      'Team Goal: $2B',
      teamTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 team target path from the Benson Crew BHAG Builder.',
      formatCompactCurrency,
      yearStart,
    ),
  )

  const teamCurrentTarget = teamTargetRows[currentYear - yearStart]?.[0] || teamTargetRows[0]?.[0] || 0
  const ownersRows = ownersRes.values || []
  const ownersHeader = ownersRows[0] || []
  const volumeIdx = ownersHeader.findIndex(value => String(value).trim() === 'Volume Credit')
  let actualVolumeYtd = 0

  ownersRows.slice(1).forEach(row => {
    const executedDate = sheetSerialToDate(row[0])
    const volumeCredit = parseNumber(row[volumeIdx])
    if (!executedDate || !Number.isFinite(volumeCredit)) return
    if (executedDate.getUTCFullYear() !== currentYear) return
    actualVolumeYtd += volumeCredit
  })

  const targetToDate = teamCurrentTarget * (getDayOfYearToronto() / daysInTorontoYear(currentYear))
  const teamDiff = actualVolumeYtd - targetToDate
  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Should Be',
      value: formatCompactCurrency(targetToDate),
      detail: 'Prorated team target-to-date for the current year, based on Eastern time.',
      asOf: getTodayTorontoIso(),
      sortOrder: 11,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Actual',
      value: `${formatCompactCurrency(actualVolumeYtd)} YTD`,
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Pace',
      value: formatPaceWithPercent(teamDiff, targetToDate, formatCompactCurrency),
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 13,
    },
  )

  snapshot.push(
    ...buildBhagYearRows(
      'Community Goal: 10,000 Agents',
      communityTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 community target path from the Benson Crew BHAG Builder.',
      formatAgentCount,
      yearStart,
    ),
  )

  const communityRows = (communityTrackerRes.values || []).slice(2).map(row => ({
    month: row[0],
    year: parseNumber(row[1]),
    totalCommunity: parseNumber(row[3]),
  }))
  const currentYearCommunityRows = communityRows.filter(row => row.year === currentYear && Number.isFinite(row.totalCommunity) && row.totalCommunity > 0)
  const startedRow = currentYearCommunityRows[0] || null
  const latestRow = currentYearCommunityRows[currentYearCommunityRows.length - 1] || null
  const communityCurrentTarget = communityTargetRows[currentYear - yearStart]?.[0] || communityTargetRows[0]?.[0] || 0
  const communityStarted = startedRow?.totalCommunity || 0
  const actualCommunity = latestRow?.totalCommunity || 0
  const communityTargetToDate = communityStarted + ((communityCurrentTarget - communityStarted) * (getDayOfYearToronto() / daysInTorontoYear(currentYear)))
  const communityDiff = actualCommunity - communityTargetToDate

  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Should Be',
      value: formatAgentCount(communityTargetToDate),
      detail: 'Prorated community target-to-date for the current year, based on Eastern time.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Actual',
      value: formatAgentCount(actualCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 13,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Pace',
      value: formatPaceWithPercent(communityDiff, communityTargetToDate, formatAgentCount),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 14,
    },
  )

  return snapshot
}


export function buildSyntheticStrategySourceSnapshotRows() {
  return {
    bhagRows: buildBhagYearRows(
      'Synthetic Team Goal',
      [[2000000000, 0.2]],
      'SRC-FREEDOM-BHAG-001',
      'Synthetic proof only.',
      formatCompactCurrency,
      2026,
    ),
    engineRow: buildEngineMetricRow('Synthetic Engine', 'Average Monthly GCI', formatCompactCurrency(50000), 'Synthetic proof only.', 1),
    numeric: parseNumber('$1,234,567'),
    compact: formatCompactCurrency(2000000000),
  }
}

export function evaluateFoundationStrategySourceSnapshotSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_BEFORE_LINES,
  afterLines = 0,
} = {}) {
  const dbDelegates = foundationDbSource.includes("from './foundation-strategy-source-snapshots.js'") &&
    foundationDbSource.includes('getLiveBhagSourceSnapshot') &&
    foundationDbSource.includes('getLiveAgentEngineSourceSnapshot') &&
    !foundationDbSource.includes('async function getLiveBhagSourceSnapshot()') &&
    !foundationDbSource.includes('async function getLiveAgentEngineSourceSnapshot()')
  const moduleOwnsBuilders = moduleSource.includes('export async function getLiveBhagSourceSnapshot()') &&
    moduleSource.includes('export async function getLiveAgentEngineSourceSnapshot()') &&
    moduleSource.includes("'Benson Crew Bhag Builder'!K4:L13") &&
    moduleSource.includes("'Agent Engine'!A1:K10") &&
    moduleSource.includes("'Data Entry - BCrew Team/Community'!G1:O80") &&
    moduleSource.includes("'ADMIN ONLY - Deal Data Entry'!G:AI") &&
    moduleSource.includes('SRC-FREEDOM-BHAG-001') &&
    moduleSource.includes('SRC-FREEDOM-COMMUNITY-001') &&
    moduleSource.includes('SRC-OWNERS-001')
  const helpersExported = moduleSource.includes('export function parseNumber(value)') &&
    moduleSource.includes('export function formatCompactCurrency(value)')
  const proofOwnsDogfood = scriptSource.includes('buildFoundationStrategySourceSnapshotSplitDogfoodProof') &&
    scriptSource.includes('buildSyntheticStrategySourceSnapshotRows')
  const planHasPosture = planSource.includes('must not call live Google APIs') &&
    planSource.includes('Speed boundary') &&
    planSource.includes('Operator value')
  const lineCountDecreased = Number(afterLines) > 0 && Number(afterLines) < Number(beforeLines)

  return {
    ok: dbDelegates && moduleOwnsBuilders && helpersExported && proofOwnsDogfood && planHasPosture && lineCountDecreased,
    mode: 'foundation-strategy-source-snapshot-split',
    dbDelegates,
    moduleOwnsBuilders,
    helpersExported,
    proofOwnsDogfood,
    planHasPosture,
    lineCountDecreased,
    beforeLines,
    afterLines,
  }
}

export function buildFoundationStrategySourceSnapshotSplitDogfoodProof({ afterLines = 0 } = {}) {
  const oldInlineShape = evaluateFoundationStrategySourceSnapshotSplit({
    foundationDbSource: 'async function getLiveBhagSourceSnapshot() {} async function getLiveAgentEngineSourceSnapshot() {}',
    moduleSource: '',
    scriptSource: 'buildFoundationStrategySourceSnapshotSplitDogfoodProof buildSyntheticStrategySourceSnapshotRows',
    planSource: 'must not call live Google APIs Speed boundary Operator value',
    afterLines,
  })
  const splitModuleShape = evaluateFoundationStrategySourceSnapshotSplit({
    foundationDbSource: "import { getLiveBhagSourceSnapshot, getLiveAgentEngineSourceSnapshot } from './foundation-strategy-source-snapshots.js'",
    moduleSource: "export function parseNumber(value) {} export function formatCompactCurrency(value) {} export async function getLiveBhagSourceSnapshot() {} export async function getLiveAgentEngineSourceSnapshot() {} 'Benson Crew Bhag Builder'!K4:L13 'Agent Engine'!A1:K10 'Data Entry - BCrew Team/Community'!G1:O80 'ADMIN ONLY - Deal Data Entry'!G:AI SRC-FREEDOM-BHAG-001 SRC-FREEDOM-COMMUNITY-001 SRC-OWNERS-001",
    scriptSource: 'buildFoundationStrategySourceSnapshotSplitDogfoodProof buildSyntheticStrategySourceSnapshotRows',
    planSource: 'must not call live Google APIs Speed boundary Operator value',
    afterLines,
  })
  const syntheticRows = buildSyntheticStrategySourceSnapshotRows()
  const syntheticRowsOk = syntheticRows.numeric === 1234567 &&
    syntheticRows.compact === '$2B' &&
    syntheticRows.bhagRows.length === 2 &&
    syntheticRows.bhagRows.every(row => row.docPath === BHAG_DOC_PATH && row.sourceId === 'SRC-FREEDOM-BHAG-001') &&
    syntheticRows.engineRow.docPath === AGENT_ENGINE_DOC_PATH &&
    syntheticRows.engineRow.sourceId === 'SRC-FREEDOM-ENGINE-001'

  return {
    ok: oldInlineShape.ok === false && splitModuleShape.ok === true && syntheticRowsOk,
    mode: 'foundation-strategy-source-snapshot-split-dogfood',
    oldInlineRejected: oldInlineShape.ok === false,
    splitModuleAccepted: splitModuleShape.ok === true,
    syntheticRowsOk,
    synthetic: {
      bhagRows: syntheticRows.bhagRows.length,
      engineSource: syntheticRows.engineRow.sourceId,
      numeric: syntheticRows.numeric,
      compact: syntheticRows.compact,
    },
  }
}
