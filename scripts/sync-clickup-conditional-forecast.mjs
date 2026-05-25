#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'
import {
  GOOGLE_SCOPES,
  batchUpdateSheetValues,
  clearSheetValues,
  getSheetValues,
  googleJsonFetch,
} from '../lib/google-delegated.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const SHEET_TITLE = 'Listings and Conditional Deals'
const SHEET_ID = 131346715
const CLICKUP_DEAL_DATA_ENTRY_LIST_ID = process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939'
const TABLE_HEADER_ROW_INDEX = 16
const TABLE_COLUMN_COUNT = 15
const REVIEW_ACTION_NO_ACTION = 'No Action'
const REVIEW_ACTION_REVIEW = 'Review This Conditional'
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

function formatLocalSyncTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date)
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function loadClickUpToken() {
  if (process.env.CLICKUP_PERSONAL_TOKEN) return process.env.CLICKUP_PERSONAL_TOKEN
  try {
    const cfg = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'))
    return cfg?.mcpServers?.clickup?.env?.CLICKUP_PERSONAL_TOKEN || ''
  } catch {
    return ''
  }
}

function parseNumber(value) {
  if (value == null || value === '') return ''
  const numeric = Number(String(value).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(numeric) ? numeric : ''
}

function sheetSerialToIso(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 20000 || numeric > 80000) return ''
  const ms = Math.round((numeric - 25569) * 86400 * 1000)
  return new Date(ms).toISOString().slice(0, 10)
}

function normalizeDateValue(value) {
  const text = normalizeText(value)
  if (!text) return ''
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serialDate = sheetSerialToIso(text)
    if (serialDate) return serialDate
    const timestamp = Number(text)
    if (timestamp > 100000000000) {
      const date = new Date(timestamp)
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    }
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10)
}

function decodeClickUpFieldValue(field) {
  if (!field || field.value == null || field.value === '') return ''
  const value = field.value
  if (field.type === 'drop_down') {
    const options = field.type_config?.options || []
    const match = options.find(option =>
      String(option.id) === String(value) ||
      String(option.orderindex) === String(value) ||
      String(option.order) === String(value)
    ) || options[Number(value)]
    return normalizeText(match?.name || value)
  }
  if (field.type === 'date') {
    const date = new Date(Number(value))
    return Number.isNaN(date.getTime()) ? normalizeText(value) : date.toISOString().slice(0, 10)
  }
  if (field.type === 'currency' || field.type === 'number') return parseNumber(value)
  if (field.type === 'list_relationship') {
    return Array.isArray(value) ? value.map(item => item.name || item.id).filter(Boolean).join(', ') : normalizeText(JSON.stringify(value))
  }
  if (typeof value === 'object') return normalizeText(value.url || value.value || value.name || JSON.stringify(value))
  return normalizeText(value)
}

async function clickUpGet(path) {
  const token = loadClickUpToken()
  if (!token) throw new Error('CLICKUP_PERSONAL_TOKEN is missing')
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function listClickUpTasks(listId) {
  const tasks = []
  for (let page = 0; page < 100; page += 1) {
    const data = await clickUpGet(`/list/${listId}/task?include_closed=true&page=${page}&subtasks=false`)
    const pageTasks = data.tasks || []
    tasks.push(...pageTasks)
    if (!pageTasks.length || data.last_page) break
  }
  return tasks
}

function fieldMap(task) {
  const fields = new Map()
  for (const field of task.custom_fields || []) {
    const value = decodeClickUpFieldValue(field)
    if (value !== '' || !fields.has(field.name)) fields.set(field.name, value)
  }
  return fields
}

function firstValue(...values) {
  return values.find(value => value !== '' && value != null) ?? ''
}

function taskTagNames(task) {
  return (task.tags || []).map(tag => normalizeText(tag.name).toLowerCase()).filter(Boolean)
}

function hasReleasedTag(task) {
  return taskTagNames(task).some(tag => tag.includes('mutual release') || tag.includes('mutually released'))
}

function normalizeReviewAction(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  if (normalized === 'review this conditional' || normalized === 'review conditional' || normalized === 'review') {
    return REVIEW_ACTION_REVIEW
  }
  return REVIEW_ACTION_NO_ACTION
}

function conditionalSideFromTags(task) {
  const tags = taskTagNames(task)
  if (tags.includes('buyer conditional')) return 'Buyer'
  if (tags.includes('seller conditional')) return 'Seller'
  return ''
}

function forecastNetToTeam(fields) {
  return firstValue(
    fields.get('Net To Team'),
    fields.get('Company/Team Lead Portion'),
    fields.get('Gross To Team'),
    fields.get('Expected Cash Deposit'),
    fields.get('Gross Commission'),
    fields.get('Commission Charged'),
  )
}

function monthBucketFromDate(now, offset) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1))
  return {
    key: `month${offset}`,
    label: `Collecting ${MONTH_NAMES[date.getUTCMonth()]}`,
    startIso: date.toISOString().slice(0, 10),
  }
}

function currentMonthBounds(now = new Date()) {
  return {
    today: now.toISOString().slice(0, 10),
    month0: monthBucketFromDate(now, 0),
    month1: monthBucketFromDate(now, 1),
    month2: monthBucketFromDate(now, 2),
    month3: monthBucketFromDate(now, 3),
    future: {
      key: 'future',
      label: 'Collecting Future',
    },
  }
}

function conditionalCashBucket(row, bounds) {
  const forecastDate = row.expectedCommissionDepositDate
  if (!forecastDate) return null
  if (forecastDate < bounds.month1.startIso) return bounds.month0.key
  if (forecastDate < bounds.month2.startIso) return bounds.month1.key
  if (forecastDate < bounds.month3.startIso) return bounds.month2.key
  return bounds.future.key
}

function sumRows(rows, predicate) {
  return rows.reduce((total, row) => total + (predicate(row) ? (Number(row.netToTeamForecast) || 0) : 0), 0)
}

function countDueOrPast(rows, today) {
  return rows.filter(row => row.conditionalDeadline && row.conditionalDeadline <= today).length
}

function buildRecord(task) {
  const fields = fieldMap(task)
  const dealStatus = normalizeText(fields.get('❗ Deal Status') || fields.get('Deal Status'))
  if (hasReleasedTag(task)) return null
  if (dealStatus !== 'Conditional') return null
  const closingDate = normalizeDateValue(firstValue(fields.get('Expected Closing'), fields.get('Closing Date')))
  const conditionalDeadline = normalizeDateValue(fields.get('Conditional Deadline'))
  const conditionalSide = conditionalSideFromTags(task)
  const record = {
    name: normalizeText(task.name),
    clickUpStatus: normalizeText(task.status?.status),
    dealStatus,
    side: normalizeText(firstValue(fields.get('Deal Side'), fields.get('Buy / Sell / Referral'), conditionalSide)),
    conditionalType: conditionalSide,
    agent: normalizeText(firstValue(fields.get('👤 Agent'), fields.get('Agent'))),
    acceptedOfferDate: normalizeDateValue(fields.get('Accepted Offer Date')),
    conditionalDeadline,
    closingDate,
    expectedCommissionDepositDate: closingDate,
    netToTeamForecast: forecastNetToTeam(fields),
    depositStatus: normalizeText(fields.get('Deposit Status (Conditional)')),
    depositReceivedDate: normalizeDateValue(fields.get('Deposit Received Date')),
    tradeNumber: normalizeText(fields.get('Deal #')),
    fubLink: normalizeText(fields.get('Follow Up Boss Link')),
    url: normalizeText(task.url),
  }
  const missing = []
  if (!record.agent) missing.push('agent')
  if (!record.side) missing.push('side')
  if (!record.closingDate) missing.push('closing date')
  if (!record.netToTeamForecast) missing.push('net to team')
  if (!record.tradeNumber) missing.push('trade number')
  if (!record.fubLink) missing.push('FUB link')
  record.missingData = missing.join(', ')
  return record
}

function recordReviewKey(record) {
  if (record.url) return `url:${record.url}`
  if (record.tradeNumber) return `trade:${record.tradeNumber}`
  return `fallback:${record.name}|${record.agent}|${record.conditionalDeadline}|${record.closingDate}`
}

async function readExistingReviewActions() {
  const headerRowNumber = TABLE_HEADER_ROW_INDEX + 1
  const res = await getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, `'${SHEET_TITLE}'!A${headerRowNumber}:O500`)
  const rows = res.values || []
  const header = rows[0] || []
  const find = name => header.findIndex(value => normalizeText(value) === name)
  const cols = {
    deal: find('Conditional Deal'),
    agent: find('Agent'),
    conditionalDeadline: find('Conditional Deadline'),
    closingDate: find('Closing Date'),
    tradeNumber: find('Trade Number'),
    clickUpUrl: find('ClickUp URL'),
    reviewAction: find('THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
  }
  if (cols.reviewAction < 0) return new Map()

  const actions = new Map()
  rows.slice(1).forEach(row => {
    const key = row[cols.clickUpUrl]
      ? `url:${normalizeText(row[cols.clickUpUrl])}`
      : (row[cols.tradeNumber]
          ? `trade:${normalizeText(row[cols.tradeNumber])}`
          : `fallback:${normalizeText(row[cols.deal])}|${normalizeText(row[cols.agent])}|${normalizeText(row[cols.conditionalDeadline])}|${normalizeText(row[cols.closingDate])}`)
    const action = normalizeReviewAction(row[cols.reviewAction])
    if (action === REVIEW_ACTION_REVIEW) actions.set(key, action)
  })
  return actions
}

function buildSheetValues(records, existingReviewActions) {
  const bounds = currentMonthBounds()
  const summaryRows = [
    ['Conditional Pipeline Forecast - ClickUp Generated'],
    ['Last sync', formatLocalSyncTimestamp()],
    ['Source', `ClickUp Deal Data Entry list ${CLICKUP_DEAL_DATA_ENTRY_LIST_ID}`],
    [],
    ['Metric', 'Value'],
    ['Active conditional tasks', records.length],
    ['Conditions due / past due', countDueOrPast(records, bounds.today)],
    [bounds.month0.label, sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month0.key)],
    [bounds.month1.label, sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month1.key)],
    [bounds.month2.label, sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month2.key)],
    [bounds.future.label, sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.future.key)],
    ['Net To Team missing closing date', sumRows(records, row => !row.closingDate)],
    ['Missing closing date', records.filter(row => !row.closingDate).length],
    ['Missing net to team $', records.filter(row => !row.netToTeamForecast).length],
    ['Missing trade number', records.filter(row => !row.tradeNumber).length],
    ['Missing FUB link', records.filter(row => !row.fubLink).length],
  ]

  const header = [
    'Conditional Deal',
    'Side',
    'Agent',
    'Accepted Offer Date',
    'Conditional Deadline',
    'Closing Date',
    'Net To Team $',
    'Deposit Status',
    'Deposit Received Date',
    'Trade Number',
    'FUB Link',
    'ClickUp URL',
    'Missing / Action Needed',
    'THIS ROW ONLY: CONDITIONAL REVIEW ACTION',
    'AI Conditional Findings / Suggestions',
  ]

  const tableRows = records.map(row => {
    const existingAction = existingReviewActions.get(recordReviewKey(row)) || REVIEW_ACTION_NO_ACTION
    const reviewAction = existingAction === REVIEW_ACTION_REVIEW && row.missingData
      ? REVIEW_ACTION_REVIEW
      : REVIEW_ACTION_NO_ACTION
    const findings = row.missingData
      ? (reviewAction === REVIEW_ACTION_REVIEW ? `Still missing: ${row.missingData}` : `Missing: ${row.missingData}`)
      : 'Conditional forecast row is complete.'
    return [
      row.name,
      row.side,
      row.agent,
      row.acceptedOfferDate,
      row.conditionalDeadline,
      row.closingDate,
      row.netToTeamForecast,
      row.depositStatus,
      row.depositReceivedDate,
      row.tradeNumber,
      row.fubLink,
      row.url,
      row.missingData,
      reviewAction,
      findings,
    ]
  })

  return summaryRows.concat([header], tableRows)
}

async function formatSheet(records) {
  const dataRowCount = Math.max(records.length, 1)
  const tableEndRowIndex = TABLE_HEADER_ROW_INDEX + 1 + dataRowCount
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(OWNERS_SHEET_ID)}` +
    ':batchUpdate'

  return googleJsonFetch('ai@bensoncrew.ca', url, {
    method: 'POST',
    scopes: [GOOGLE_SCOPES.sheets],
    body: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 0,
              endRowIndex: 500,
              startColumnIndex: 0,
              endColumnIndex: 26,
            },
            cell: {},
            fields: 'userEnteredFormat,note,dataValidation',
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: SHEET_ID,
              gridProperties: {
                frozenRowCount: TABLE_HEADER_ROW_INDEX + 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: TABLE_COLUMN_COUNT,
            },
            cell: {
              userEnteredFormat: {
                backgroundColorStyle: { rgbColor: { red: 0.05, green: 0.12, blue: 0.18 } },
                horizontalAlignment: 'LEFT',
                textFormat: {
                  bold: true,
                  fontSize: 14,
                  foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColorStyle,horizontalAlignment,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                backgroundColorStyle: { rgbColor: { red: 0.89, green: 0.94, blue: 0.98 } },
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColorStyle,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: TABLE_HEADER_ROW_INDEX,
              endRowIndex: TABLE_HEADER_ROW_INDEX + 1,
              startColumnIndex: 0,
              endColumnIndex: TABLE_COLUMN_COUNT,
            },
            cell: {
              userEnteredFormat: {
                backgroundColorStyle: { rgbColor: { red: 0.0, green: 0.38, blue: 0.58 } },
                horizontalAlignment: 'LEFT',
                textFormat: {
                  bold: true,
                  foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColorStyle,horizontalAlignment,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: TABLE_HEADER_ROW_INDEX + 1,
              endRowIndex: tableEndRowIndex,
              startColumnIndex: 0,
              endColumnIndex: TABLE_COLUMN_COUNT,
            },
            cell: {
              userEnteredFormat: {
                verticalAlignment: 'TOP',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 0,
              endRowIndex: tableEndRowIndex,
              startColumnIndex: 6,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'CURRENCY', pattern: '$#,##0' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 7,
              endRowIndex: 12,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'CURRENCY', pattern: '$#,##0' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: TABLE_HEADER_ROW_INDEX + 1,
              endRowIndex: tableEndRowIndex,
              startColumnIndex: 3,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: TABLE_HEADER_ROW_INDEX + 1,
              endRowIndex: tableEndRowIndex,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: SHEET_ID,
                startRowIndex: TABLE_HEADER_ROW_INDEX,
                endRowIndex: tableEndRowIndex,
                startColumnIndex: 0,
                endColumnIndex: TABLE_COLUMN_COUNT,
              },
            },
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 220 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 1, endIndex: 3 },
            properties: { pixelSize: 120 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 3, endIndex: 9 },
            properties: { pixelSize: 130 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 9, endIndex: 12 },
            properties: { pixelSize: 160 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 12, endIndex: 15 },
            properties: { pixelSize: 280 },
            fields: 'pixelSize',
          },
        },
        {
          setDataValidation: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: TABLE_HEADER_ROW_INDEX + 1,
              endRowIndex: 500,
              startColumnIndex: 13,
              endColumnIndex: 14,
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [
                  { userEnteredValue: REVIEW_ACTION_NO_ACTION },
                  { userEnteredValue: REVIEW_ACTION_REVIEW },
                ],
              },
              strict: true,
              showCustomUi: true,
            },
          },
        },
      ],
    },
  })
}

async function main() {
  const existingReviewActions = await readExistingReviewActions()
  const tasks = await listClickUpTasks(CLICKUP_DEAL_DATA_ENTRY_LIST_ID)
  const records = tasks
    .map(buildRecord)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.conditionalDeadline !== b.conditionalDeadline) return (a.conditionalDeadline || '9999-12-31').localeCompare(b.conditionalDeadline || '9999-12-31')
      return a.name.localeCompare(b.name)
    })

  const values = buildSheetValues(records, existingReviewActions)
  await clearSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, `'${SHEET_TITLE}'!A1:O500`)
  await batchUpdateSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, [
    {
      range: `'${SHEET_TITLE}'!A1`,
      values,
    },
  ])
  await formatSheet(records)

  const bounds = currentMonthBounds()
  console.log(JSON.stringify({
    sourceListId: CLICKUP_DEAL_DATA_ENTRY_LIST_ID,
    conditionalTasks: records.length,
    collectingCurrentMonthLabel: bounds.month0.label,
    collectingCurrentMonth: sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month0.key),
    collectingNextMonthLabel: bounds.month1.label,
    collectingNextMonth: sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month1.key),
    collectingFollowingMonthLabel: bounds.month2.label,
    collectingFollowingMonth: sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.month2.key),
    collectingFutureLabel: bounds.future.label,
    collectingFuture: sumRows(records, row => conditionalCashBucket(row, bounds) === bounds.future.key),
    netToTeamMissingClosingDate: sumRows(records, row => !row.closingDate),
    missingClosingDate: records.filter(row => !row.closingDate).length,
    missingNetToTeam: records.filter(row => !row.netToTeamForecast).length,
    missingTradeNumber: records.filter(row => !row.tradeNumber).length,
    missingFubLink: records.filter(row => !row.fubLink).length,
  }, null, 2))
}

main().catch(error => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
