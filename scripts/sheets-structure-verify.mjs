#!/usr/bin/env node

import { getSheetGridData } from '../lib/google-delegated.js'
import { fileURLToPath } from 'node:url'

const USER = 'service-account'
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function collectingMonthLabel(offset) {
  const date = new Date()
  date.setMonth(date.getMonth() + offset, 1)
  return `Collecting ${MONTH_NAMES[date.getMonth()]}`
}

const WORKBOOKS = [
  {
    label: 'Freedom',
    spreadsheetId: '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw',
    expectedSheets: [
      { title: 'Agent Engine', sheetId: 1416660204, hidden: false },
      { title: 'Data Entry - BCrew Team/Community', sheetId: 1670417784, hidden: false },
      { title: 'Benson Crew Bhag Builder', sheetId: 337425848, hidden: false },
      { title: 'Agent Satisfaction', sheetId: 674715478, hidden: false },
      { title: 'Data Entry - Agent Satisfaction', sheetId: 1409300550, hidden: false },
      { title: 'Ops Satisfaction', sheetId: 987354585, hidden: false },
      { title: 'Data Entry - Ops Cont Improvement', sheetId: 233846909, hidden: false },
      { title: 'Data Entry - Client Onboarding', sheetId: 406997165, hidden: 'any' },
      { title: 'Data Entry - Clients, Deals, NPS & GReviews', sheetId: 600012130, hidden: 'any' },
      { title: 'Data Entry - Agent Onboarding', sheetId: 896421734, hidden: 'any' },
      { title: 'Bonus System', sheetId: 822496681, hidden: 'any' },
      { title: 'BenCrew Marketing', sheetId: 1408576099, hidden: 'any' },
      { title: 'SZ Marketing', sheetId: 311262813, hidden: 'any' },
      { title: 'ADMIN ONLY - Deal Data Entry', sheetId: 1738912434, hidden: 'any' },
    ],
    rangeChecks: [
      {
        title: 'Data Entry - BCrew Team/Community',
        range: "'Data Entry - BCrew Team/Community'!A1:U5",
        cells: {
          A1: 'Benson Crew Team',
          G1: 'Benson Crew Community (Measured At The START of Each Month)',
          P1: 'Benson Crew Community Revenue  (Measured At The END of Each Month)',
          A2: 'Agent Name',
          B2: 'Team Origin/Recruited By',
          C2: 'Status',
          I2: 'Total Income',
          J2: 'Total Community',
          U2: 'Bcrew In Before HST',
        },
      },
      {
        title: 'Benson Crew Bhag Builder',
        range: "'Benson Crew Bhag Builder'!A1:C35",
        cells: {
          A2: 'Goal',
          A3: 'Start Date',
          A4: 'End Date',
          A5: 'Years',
          A6: 'Months',
        },
      },
      {
        title: 'Agent Engine',
        range: "'Agent Engine'!A1:R8",
        cells: {
          B1: 'Team Agent Engine - (Attraction - Production - Split) ',
          C3: 'Required Attracted\n(Monthly Required )',
          F3: 'Active Agents',
          I3: ' Avg Production\n(Last 6 Months)',
          L3: ' Avg Split\n(Last 6m Avg)',
          O3: 'Projected Net To Company',
        },
      },
      {
        title: 'Data Entry - Agent Satisfaction',
        range: "'Data Entry - Agent Satisfaction'!A1:R6",
        cells: {
          A1: '❤️ Team Culture and Sentiment Score',
          A2: 'Survey Month',
          B2: 'Total Agents',
          J2: 'Overall Score',
          R2: '🔍 Top Recommendations',
        },
      },
      {
        title: 'Data Entry - Ops Cont Improvement',
        range: "'Data Entry - Ops Cont Improvement'!A1:AB6",
        cells: {
          A1: '❤️ Ops Satisfaction and Improvement',
          D2: 'Onboarding',
          K2: 'Transaction Management',
          U2: 'Agent Onboarding',
          A3: 'Survey Month',
          B3: 'Overall Score',
        },
      },
      {
        title: 'Data Entry - Client Onboarding',
        range: "'Data Entry - Client Onboarding'!A1:AB6",
        cells: {
          A1: 'Client Onboarding',
          A5: 'Onboarding Date',
          K5: 'Ops Score',
          R5: 'Bonus Total',
          W5: 'Quality Bonus Total',
        },
      },
      {
        title: 'Data Entry - Clients, Deals, NPS & GReviews',
        range: "'Data Entry - Clients, Deals, NPS & GReviews'!A1:AF6",
        cells: {
          A5: 'Intake Details',
          N5: 'NPS Score',
          R5: 'Google Reviews',
          U5: 'Deal Data Owner Dash',
          Y5: 'Bonus',
          A6: 'Executed Dated',
        },
      },
      {
        title: 'Data Entry - Agent Onboarding',
        range: "'Data Entry - Agent Onboarding'!A1:Z6",
        cells: {
          A1: 'Transactions',
          A5: 'Intake Details',
          J5: 'Bonus',
          A6: 'Onboarding Date',
          H6: 'Onboardnig Score',
        },
      },
      {
        title: 'Bonus System',
        range: "'Bonus System'!A1:Z10",
        cells: {
          A1: 'Bonus Program Agent Onboarding',
          D1: 'Bonus Program Transaction Management - Conditional To Close',
          H1: 'NSP and Google Review',
          K1: 'Owner Dash Deal Record Complete',
        },
      },
    ],
  },
  {
    label: 'Owners',
    spreadsheetId: '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk',
    expectedSheets: [
      { title: 'ADMIN ONLY - Deal Data Entry', sheetId: 533201019, hidden: false },
      { title: 'Split Cal', sheetId: 1034106334, hidden: false },
      { title: 'Agent Splits', sheetId: 1944187920, hidden: false },
      { title: 'Listings and Conditional Deals', sheetId: 131346715, hidden: false },
      { title: 'Sales & Deposit', sheetId: 1331786880, hidden: false },
      { title: 'CI Report', sheetId: 1668741155, hidden: false },
      { title: 'Cashflow Dash', sheetId: 50905403, hidden: false },
      { title: '(Input) Weekly Actuals', sheetId: 43598954, hidden: false },
      { title: 'Monthly Budget', sheetId: 1351457624, hidden: false },
      { title: 'Monthly Actuals (Roll Up)', sheetId: 515578041, hidden: false },
      { title: 'Budget Original', sheetId: 804593207, hidden: false },
      { title: 'Annual Actuals (Roll Up)', sheetId: 1995855293, hidden: false },
      { title: 'Annual Budget (Roll Up)', sheetId: 1149056195, hidden: false },
      { title: 'Unspent -L3M + Actual Helper', sheetId: 2101201006, hidden: false },
      { title: 'Goal & KPI Calculator', sheetId: 1373809826, hidden: false },
      { title: 'Lists', sheetId: 1609537489, hidden: false },
    ],
    rangeChecks: [
      {
        title: 'ADMIN ONLY - Deal Data Entry',
        range: "'ADMIN ONLY - Deal Data Entry'!A1:CE3",
        cells: {
          B1: 'Deal #',
          C1: 'Deal Status ',
          G1: 'Date Firm (Executed)',
          I1: 'Expected Cash Deposit ',
          N1: 'Lead Source (Bonus System For Having This 100% Complete)',
          AF1: 'Gross To Team',
          AG1: 'Volume Credit',
          AI1: 'Deal Credit',
          AP1: 'Company/Team Lead Portion',
          BH1: 'Executed Month',
          BJ1: 'Executed Year',
          BK1: 'Deposit Month',
          BM1: 'Deposit Year',
          BO1: 'Closing Month',
          BQ1: 'Closing Year',
          BZ1: 'Client Follow UP Boss ID',
          CA1: 'ISA Set Deal',
          CB1: 'Deal or Lease?',
          CC1: 'AI Review Status',
          CD1: 'THIS ROW ONLY: REVIEW ACTION',
          CE1: 'AI Findings By System / Suggestions',
        },
      },
      {
        title: 'Split Cal',
        range: "'Split Cal'!A1:M12",
        cells: {
          A2: 'Agent',
          A3: 'Deal Executed Date',
          A4: 'Sale Price',
          A5: 'Commission Rate',
          A6: 'Deal Type',
        },
      },
      {
        title: 'Agent Splits',
        range: "'Agent Splits'!A1:T6",
        cells: {
          D1: 'Apprentice Contract?',
          G1: 'GCI Required',
          K1: 'Split to Agent If Agent Deal',
          L1: 'Split to Agent If Company Deal',
          T1: 'Level 3 Cap',
        },
      },
      {
        title: 'Listings and Conditional Deals',
        range: "'Listings and Conditional Deals'!A1:O17",
        cells: {
          A1: 'Conditional Pipeline Forecast - ClickUp Generated',
          A2: 'Last sync',
          A3: 'Source',
          A5: 'Metric',
          A6: 'Active conditional tasks',
          A8: collectingMonthLabel(0),
          A9: collectingMonthLabel(1),
          A10: collectingMonthLabel(2),
          A11: 'Collecting Future',
          A12: 'Net To Team missing closing date',
          A16: 'Missing FUB link',
          A17: 'Conditional Deal',
          E17: 'Conditional Deadline',
          F17: 'Closing Date',
          G17: 'Net To Team $',
          I17: 'Deposit Received Date',
          K17: 'FUB Link',
          L17: 'ClickUp URL',
          M17: 'Missing / Action Needed',
          N17: 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION',
          O17: 'AI Conditional Findings / Suggestions',
        },
      },
      {
        title: 'Sales & Deposit',
        range: "'Sales & Deposit'!A1:V8",
        cells: {
          B2: 'Deal Data ',
          L2: 'Sales and Cash Execution/Deposit',
          L3: 'Select Period',
          Q6: 'Company $ Executed Goal',
          S6: 'Company $ Deposit Goal',
        },
      },
      {
        title: 'CI Report',
        range: "'CI Report'!A1:L12",
        cells: {
          B4: 'Commission AR Report',
          B5: 'Select Period',
          B6: [
            'This Week',
            'This Month',
            'Last 7 Days',
            'Last 14 Days',
            'Last 30 Days',
            'Last 90 Days',
            'Last 3 Months',
            'Last 6 Months',
            'Last 9 Months',
            'Last 12 Months',
            'YTD',
            'Full Year',
            'AR Sweep',
          ],
          E5: 'Outstanding Amount',
        },
      },
      {
        title: 'Cashflow Dash',
        range: "'Cashflow Dash'!A1:J20",
        cells: {
          B4: 'Cash Flow Report',
          B6: 'Available Cash (Today)',
        },
      },
      {
        title: '(Input) Weekly Actuals',
        range: "'(Input) Weekly Actuals'!A1:BR3",
        cells: {
          D1: 'Starting Cash',
          D2: 'Total Revenue',
          D3: 'Total Expenses',
        },
      },
      {
        title: 'Monthly Budget',
        range: "'Monthly Budget'!A1:J26",
        cells: {
          C1: 'Starting Cash',
          C2: 'Total Revenue',
          C3: 'Total Expenses',
        },
      },
      {
        title: 'Monthly Actuals (Roll Up)',
        range: "'Monthly Actuals (Roll Up)'!A1:J25",
        cells: {
          D1: 'Starting Cash',
          D2: 'Total Revenue',
          D3: 'Total Expenses',
        },
      },
      {
        title: 'Budget Original',
        range: "'Budget Original'!A1:J25",
        cells: {
          D1: 'Starting Cash',
          D2: 'Total Revenue',
          D3: 'Total Expenses',
        },
      },
      {
        title: 'Annual Actuals (Roll Up)',
        range: "'Annual Actuals (Roll Up)'!A1:J25",
        cells: {
          D1: 'Starting Cash',
          D2: 'Total Revenue',
          D3: 'Total Expenses',
        },
      },
      {
        title: 'Annual Budget (Roll Up)',
        range: "'Annual Budget (Roll Up)'!A1:J25",
        cells: {
          D1: 'Starting Cash',
          D2: 'Total Revenue',
          D3: 'Total Expenses',
        },
      },
      {
        title: 'Unspent -L3M + Actual Helper',
        range: "'Unspent -L3M + Actual Helper'!A1:M6",
        cells: {
          B1: 'Month Key',
          G1: 'Current + 3 months unspent Budget',
          J1: 'Month Key',
          M1: 'Remaining $ To Be Collected',
        },
      },
      {
        title: 'Goal & KPI Calculator',
        range: "'Goal & KPI Calculator'!A1:O6",
        cells: {
          A1: 'Year',
          L1: 'Click Here For Actual KPI Cal',
          O1: 'Execution Stats',
          O2: 'Total Deals Executed',
          O4: 'Month',
        },
        formulaContains: {
          O1: ['IMPORTRANGE', 'KPI Calculator!A1:DA'],
        },
      },
      {
        title: 'Lists',
        range: "'Lists'!A1:AB5",
        cells: {
          J1: 'Lead Sources',
          J2: 'Total List',
          J3: '<unspecified>',
          J4: 'No Extra Lead Source',
          AA1: 'User',
          AB1: 'Email',
        },
        formulaContains: {
          A1: ['IMPORTRANGE', '1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE', 'Lists!A1:ai'],
        },
      },
      {
        title: 'ADMIN ONLY - Deal Data Entry',
        range: "'ADMIN ONLY - Deal Data Entry'!A1:CB3",
        validationContains: {
          N3: ['=Lists!$J$3:$J'],
          P3: ['=Lists!$J$3:$J'],
          S3: ['=Lists!$AA$2:$AA'],
        },
      },
    ],
  },
  {
    label: 'Old BIS KPI',
    spreadsheetId: '1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE',
    expectedSheets: [
      { title: 'ADMIN ONLY - Deal Data Entry', sheetId: 533201019, hidden: false },
      { title: 'KPI Calculator', sheetId: 1373809826, hidden: false },
      { title: 'Lists', sheetId: 1609537489, hidden: false },
    ],
    rangeChecks: [
      {
        title: 'KPI Calculator',
        range: "'KPI Calculator'!A1:DL110",
        cells: {
          A1: 'Execution Stats',
          A2: 'Total Deals Executed',
          AK2: 'Total Deals CLOSED',
          BU2: 'Total Deals DEPOSITED',
          A26: 'Total Volume Executed',
          AK26: 'Total Volume CLOSED',
          BU26: 'Total Volume DEPOSITED',
          A50: 'Total GCI Executed',
          AK50: 'Total GCI CLOSED',
          BU50: 'Total GCI DEPOSITED',
          A75: 'Commission Dollars to the Company Executed',
          AK75: 'Commission Dollars to the Company CLOSED',
          BU75: 'Deposit the Company DEPOSIT',
        },
        pivotChecks: {
          F3: { sourceSheetId: 533201019, rowOffset: 58, columnOffset: 60, valueOffset: 33 },
          AP3: { sourceSheetId: 533201019, rowOffset: 65, columnOffset: 67, valueOffset: 33 },
          BZ3: { sourceSheetId: 533201019, rowOffset: 61, columnOffset: 63, valueOffset: 33 },
          F27: { sourceSheetId: 533201019, rowOffset: 58, columnOffset: 60, valueOffset: 31 },
          AP27: { sourceSheetId: 533201019, rowOffset: 65, columnOffset: 67, valueOffset: 31 },
          BZ27: { sourceSheetId: 533201019, rowOffset: 61, columnOffset: 63, valueOffset: 31 },
          F51: { sourceSheetId: 533201019, rowOffset: 58, columnOffset: 60, valueOffset: 30 },
          AP51: { sourceSheetId: 533201019, rowOffset: 65, columnOffset: 67, valueOffset: 30 },
          BZ51: { sourceSheetId: 533201019, rowOffset: 61, columnOffset: 63, valueOffset: 30 },
          F76: { sourceSheetId: 533201019, rowOffset: 58, columnOffset: 60, valueOffset: 40 },
          AP76: { sourceSheetId: 533201019, rowOffset: 65, columnOffset: 67, valueOffset: 40 },
          BZ76: { sourceSheetId: 533201019, rowOffset: 61, columnOffset: 63, valueOffset: 40 },
        },
      },
      {
        title: 'Lists',
        range: "'Lists'!A1:AB5",
        cells: {
          J1: 'Lead Sources',
          J2: 'Total List',
          J3: '<unspecified>',
          J4: 'No Extra Lead Source',
          AA1: 'User',
          AB1: 'Email',
        },
      },
    ],
  },
]

function colToIndex(letters) {
  let out = 0
  for (const ch of letters) out = out * 26 + (ch.charCodeAt(0) - 64)
  return out - 1
}

function parseA1(a1) {
  const match = /^([A-Z]+)(\d+)$/.exec(a1)
  if (!match) throw new Error(`Invalid A1 cell: ${a1}`)
  return { row: Number(match[2]) - 1, col: colToIndex(match[1]) }
}

function getCellValue(sheetEntry, a1) {
  const { row, col } = parseA1(a1)
  return sheetEntry?.data?.[0]?.rowData?.[row]?.values?.[col] ?? null
}

function matchesExpectedCell(actual, expected) {
  if (Array.isArray(expected)) return expected.includes(actual)
  return actual === expected
}

function describeExpectedCell(expected) {
  if (Array.isArray(expected)) return `expected one of ${JSON.stringify(expected)}`
  return `expected ${JSON.stringify(expected)}`
}

async function fetchWorkbookMeta(spreadsheetId) {
  return getSheetGridData(
    USER,
    spreadsheetId,
    [],
    'properties(title),sheets(properties(title,sheetId,index,hidden,gridProperties(rowCount,columnCount)))',
  )
}

async function fetchWorkbookRanges(spreadsheetId, ranges) {
  return getSheetGridData(
    USER,
    spreadsheetId,
    ranges,
    'sheets(properties(title),data(startRow,startColumn,rowData(values(formattedValue,userEnteredValue,dataValidation,pivotTable))))',
  )
}

export async function runSheetsStructureVerification() {
  const checks = []
  const workbooks = []

  for (const workbook of WORKBOOKS) {
    const meta = await fetchWorkbookMeta(workbook.spreadsheetId)
    const sheetMap = new Map((meta.sheets ?? []).map(sheet => [sheet.properties.title, sheet.properties]))

    for (const expected of workbook.expectedSheets) {
      const live = sheetMap.get(expected.title)
      const ok =
        !!live &&
        live.sheetId === expected.sheetId &&
        (expected.hidden === 'any' || Boolean(live.hidden) === Boolean(expected.hidden))
      checks.push({
        ok,
        label: `${workbook.label}: sheet ${expected.title}`,
        detail: live
          ? `gid ${live.sheetId}, hidden=${Boolean(live.hidden)}`
          : 'missing',
      })
    }

    const rangePayload = await fetchWorkbookRanges(
      workbook.spreadsheetId,
      workbook.rangeChecks.map(check => check.range),
    )
    const rangeMap = new Map((rangePayload.sheets ?? []).map(sheet => [sheet.properties.title, sheet]))

    for (const rangeCheck of workbook.rangeChecks) {
      const liveSheet = rangeMap.get(rangeCheck.title)
      if (!liveSheet) {
        checks.push({
          ok: false,
          label: `${workbook.label}: range ${rangeCheck.title}`,
          detail: 'missing range payload',
        })
        continue
      }

      for (const [a1, expected] of Object.entries(rangeCheck.cells ?? {})) {
        const cell = getCellValue(liveSheet, a1)
        const actual = cell?.formattedValue ?? ''
        checks.push({
          ok: matchesExpectedCell(actual, expected),
          label: `${workbook.label}: ${rangeCheck.title} ${a1}`,
          detail: `${JSON.stringify(actual)} | ${describeExpectedCell(expected)}`,
        })
      }

      for (const [a1, requiredParts] of Object.entries(rangeCheck.formulaContains ?? {})) {
        const cell = getCellValue(liveSheet, a1)
        const formula = cell?.userEnteredValue?.formulaValue ?? ''
        const ok = requiredParts.every(part => formula.includes(part))
        checks.push({
          ok,
          label: `${workbook.label}: ${rangeCheck.title} ${a1} formula`,
          detail: formula || 'missing formula',
        })
      }

      for (const [a1, requiredParts] of Object.entries(rangeCheck.validationContains ?? {})) {
        const cell = getCellValue(liveSheet, a1)
        const validation =
          cell?.dataValidation?.condition?.values
            ?.map(value => value?.userEnteredValue || '')
            .join(' | ') || ''
        const ok = requiredParts.every(part => validation.includes(part))
        checks.push({
          ok,
          label: `${workbook.label}: ${rangeCheck.title} ${a1} validation`,
          detail: validation || 'missing validation',
        })
      }

      for (const [a1, expected] of Object.entries(rangeCheck.pivotChecks ?? {})) {
        const cell = getCellValue(liveSheet, a1)
        const pivot = cell?.pivotTable
        const ok =
          pivot?.source?.sheetId === expected.sourceSheetId &&
          pivot?.rows?.[0]?.sourceColumnOffset === expected.rowOffset &&
          pivot?.columns?.[0]?.sourceColumnOffset === expected.columnOffset &&
          pivot?.values?.[0]?.sourceColumnOffset === expected.valueOffset

        checks.push({
          ok,
          label: `${workbook.label}: ${rangeCheck.title} ${a1} pivot`,
          detail: pivot
            ? `src=${pivot.source?.sheetId} row=${pivot.rows?.[0]?.sourceColumnOffset} col=${pivot.columns?.[0]?.sourceColumnOffset} val=${pivot.values?.[0]?.sourceColumnOffset}`
            : 'missing pivot',
        })
      }
    }

    const workbookChecks = checks.filter(check => check.label.startsWith(workbook.label + ':'))
    const failures = workbookChecks.filter(check => !check.ok)
    workbooks.push({
      label: workbook.label,
      spreadsheetId: workbook.spreadsheetId,
      status: failures.length ? 'drift' : 'ok',
      totalChecks: workbookChecks.length,
      passedChecks: workbookChecks.length - failures.length,
      failedChecks: failures.length,
      failures,
    })
  }

  const failed = checks.filter(check => !check.ok)
  return {
    checkedAt: new Date().toISOString(),
    status: failed.length ? 'drift' : 'ok',
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.length - failed.length,
      failedChecks: failed.length,
      workbookCount: workbooks.length,
      healthyWorkbooks: workbooks.filter(workbook => workbook.status === 'ok').length,
      driftedWorkbooks: workbooks.filter(workbook => workbook.status !== 'ok').length,
    },
    workbooks,
    checks,
  }
}

function pass(label, detail = '') {
  console.log(`PASS ${label}${detail ? ` -> ${detail}` : ''}`)
}

function fail(label, detail = '') {
  console.error(`FAIL ${label}${detail ? ` -> ${detail}` : ''}`)
}

async function main() {
  const result = await runSheetsStructureVerification()

  for (const check of result.checks) {
    if (check.ok) pass(check.label, check.detail)
    else fail(check.label, check.detail)
  }

  console.log('')
  console.log(`Summary: ${result.summary.passedChecks}/${result.summary.totalChecks} checks passed`)
  if (result.summary.failedChecks) process.exit(1)
  console.log('Sheet structure verification passed.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error('Sheet structure verification failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
