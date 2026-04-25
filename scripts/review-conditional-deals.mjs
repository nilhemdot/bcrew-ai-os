#!/usr/bin/env node

import process from 'node:process'
import { batchUpdateSheetValues, getSheetValues } from '../lib/google-delegated.js'
import { getFubPerson } from '../lib/fub.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const SHEET_TITLE = 'Listings and Conditional Deals'
const SHEET_RANGE = `'${SHEET_TITLE}'!A1:U500`
const DEFAULT_FUB_CONTEXT = 'owner'
const DEFAULT_BACKLOG_SINCE = '2025-06-01'
const DEFAULT_BACKLOG_LIMIT = 1

function parseArgs(argv) {
  const args = {}
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const [key, value] = raw.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function approxEqual(a, b, epsilon = 0.01) {
  return Math.abs(Number(a) - Number(b)) <= epsilon
}

function sheetSerialToIso(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function daysSinceIso(iso) {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
}

function findIndex(header, name) {
  return header.findIndex(value => normalizeText(value) === name)
}

function columnToA1(index) {
  let n = index + 1
  let result = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

function makeRange(columnIndex, rowNumber) {
  const column = columnToA1(columnIndex)
  return `'${SHEET_TITLE}'!${column}${rowNumber}`
}

function isQueuedReviewAction(value) {
  const normalized = normalizeLower(value)
  return (
    normalized === 'review this conditional' ||
    normalized === 'review this deal' ||
    normalized === 'rerun' ||
    normalized === 'review'
  )
}

function isUninspectedReviewStatus(value) {
  const normalized = normalizeLower(value)
  return !normalized || normalized === 'not reviewed'
}

function isNeedsFixingAction(value) {
  return normalizeLower(value) === 'needs fixing'
}

function parseLimit(value, fallback = 0) {
  if (value == null || value === true) return fallback
  return Math.max(0, Number(value) || 0)
}

function isOnOrAfterIso(iso, cutoffIso) {
  return Boolean(iso && cutoffIso && iso >= cutoffIso)
}

function getConditionalReviewDate(item) {
  return item.closingDate || item.conditionalDueDate || null
}

function normalizeNameTokens(value) {
  return normalizeLower(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function namesRoughlyMatch(left, right) {
  const leftTokens = normalizeNameTokens(left)
  const rightTokens = normalizeNameTokens(right)
  if (!leftTokens.length || !rightTokens.length) return false
  return leftTokens.some(token => rightTokens.includes(token))
}

function normalizeAddress(value) {
  return normalizeLower(value)
    .replace(/\bstreet\b/g, 'st')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bwest\b/g, 'w')
    .replace(/\beast\b/g, 'e')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/[^a-z0-9\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function streetCore(value) {
  return normalizeAddress(value)
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
}

function buildFindingText(result) {
  const lines = []
  lines.push('Owners Conditional Row')
  if (result.ownerIssues.length) {
    for (const issue of result.ownerIssues) lines.push(`- ${issue}`)
  } else {
    lines.push('- Conditional row shape is reviewable.')
  }

  lines.push('')
  lines.push('FUB')
  if (result.fubIssues.length) {
    for (const issue of result.fubIssues) lines.push(`- ${issue}`)
  } else {
    for (const note of result.fubPassNotes) lines.push(`- ${note}`)
  }

  lines.push('')
  lines.push('Result')
  lines.push(`- ${result.result}`)
  return lines.join('\n')
}

async function createAuditResult(row, fubContext) {
  const ownerIssues = []
  const fubIssues = []
  const fubPassNotes = []

  if (normalizeText(row.status) !== 'CS') {
    ownerIssues.push(`sheet status is ${normalizeText(row.status) || 'blank'}, not CS.`)
  }

  if (row.totalAgent !== '' && row.totalTeam !== '' && row.teamDollar !== '') {
    const combined = toNumber(row.totalAgent) + toNumber(row.totalTeam)
    if (!approxEqual(combined, toNumber(row.teamDollar), 0.05)) {
      ownerIssues.push(`Total Agent + Total Team = ${combined.toFixed(2)} but Team $ = ${toNumber(row.teamDollar).toFixed(2)}.`)
    }
  }

  if (!row.clientName && !row.fubLink) {
    ownerIssues.push('No direct client name or FUB URL/ID is stored on this row, so AI cannot prove the CRM join yet.')
  } else if (row.clientName && !row.fubLink) {
    ownerIssues.push('Client name exists, but there is still no direct FUB URL/ID on the row.')
  }

  if (!row.fubLink) {
    if (normalizeLower(row.type) === 'buy') {
      fubIssues.push('Buy-side subject-property address is not a safe join key to FUB because FUB may carry the client name and current home instead.')
    } else {
      fubIssues.push('Without a direct FUB URL/ID, seller-side parity still stays open even if the address looks useful.')
    }
  } else {
    try {
      const person = await getFubPerson(fubContext, row.fubLink)
      const personName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || normalizeText(person.name)
      const personStage = normalizeText(person.stage)
      const assignedTo = normalizeText(person.assignedTo)
      const personAddress = Array.isArray(person.addresses) && person.addresses.length
        ? normalizeAddress([person.addresses[0].street, person.addresses[0].city].filter(Boolean).join(' / '))
        : ''

      if (row.clientName && personName && !namesRoughlyMatch(row.clientName, personName)) {
        fubIssues.push(`linked FUB person is ${personName}, which does not cleanly match sheet client ${row.clientName}.`)
      } else if (personName) {
        fubPassNotes.push(`Proven match: ${personName} (${person.id}).`)
      }

      if (personStage !== 'Conditional Deal') {
        fubIssues.push(`linked FUB person ${person.id} is in ${personStage || 'blank'}, not Conditional Deal.`)
      } else {
        fubPassNotes.push('FUB person is currently in Conditional Deal.')
      }

      if (assignedTo && !namesRoughlyMatch(row.agent, assignedTo)) {
        fubIssues.push(`sheet agent ${row.agent} does not align to FUB assigned agent ${assignedTo}.`)
      } else if (assignedTo) {
        fubPassNotes.push(`Assigned agent aligns to ${assignedTo}.`)
      }

      if (normalizeLower(row.type) === 'sell' && row.address && personAddress) {
        const ownerStreet = streetCore(row.address)
        const personStreet = streetCore(person.addresses[0].street || '')
        if (!ownerStreet || !personStreet || !personStreet.includes(ownerStreet)) {
          fubIssues.push(`FUB address does not clearly support ${row.address}${row.city ? ' / ' + row.city : ''}.`)
        } else {
          fubPassNotes.push(`Address match supports ${person.addresses[0].street}${person.addresses[0].city ? ' / ' + person.addresses[0].city : ''}.`)
        }
      }
    } catch (error) {
      fubIssues.push(`linked FUB person could not be read: ${error.message}`)
    }
  }

  const hasIssues = ownerIssues.length > 0 || fubIssues.length > 0
  const status = hasIssues ? 'Issues Found' : 'Clean'
  const action = hasIssues ? 'Needs Fixing' : 'No Action'
  const result = hasIssues
    ? 'Add the missing identity / FUB link, fix source issues, then change the action cell to Review This Conditional.'
    : 'Cond parity is proven for this row.'

  return {
    rowNum: row.rowNum,
    status,
    action,
    ownerIssues,
    fubIssues,
    fubPassNotes,
    result,
    findingText: buildFindingText({
      ownerIssues,
      fubIssues,
      fubPassNotes,
      result,
    }),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rowsArg = normalizeText(args.rows)
  const queued = Boolean(args.queued)
  const backlog = Boolean(args.backlog || args.uninspected)
  const write = Boolean(args.write)
  const limit = parseLimit(args.limit, 0)
  const queuedLimit = parseLimit(args['queued-limit'], limit)
  const hasBacklogLimit = args['backlog-limit'] != null && args['backlog-limit'] !== true
  const backlogLimit = hasBacklogLimit
    ? parseLimit(args['backlog-limit'], DEFAULT_BACKLOG_LIMIT)
    : (backlog ? DEFAULT_BACKLOG_LIMIT : limit)
  const backlogSince = normalizeText(args['backlog-since'] || args.since) || DEFAULT_BACKLOG_SINCE
  const matureDays = args['mature-days'] == null || args['mature-days'] === true
    ? (backlog ? 10 : 0)
    : Math.max(0, Number(args['mature-days']) || 0)
  const fubContext = normalizeText(args.context) || DEFAULT_FUB_CONTEXT

  if (!rowsArg && !queued && !backlog) {
    throw new Error('Pass --rows=13,14 or use --queued and/or --backlog')
  }

  const res = await getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, SHEET_RANGE)
  const rows = res.values || []
  const header = rows[1] || []

  const cols = {
    type: findIndex(header, 'Type'),
    status: findIndex(header, 'Status'),
    agent: findIndex(header, 'Agent'),
    address: findIndex(header, 'Address'),
    city: findIndex(header, 'City'),
    price: findIndex(header, 'Price'),
    teamDollar: findIndex(header, 'Team $'),
    totalAgent: findIndex(header, 'Total Agent'),
    totalTeam: findIndex(header, 'Total Team'),
    conditionalDueDate: findIndex(header, 'Conditional Due Date'),
    closingDate: findIndex(header, 'Closing Date'),
    conditions: findIndex(header, 'Conditions'),
    clientName: findIndex(header, 'Client Name'),
    fubLink: findIndex(header, 'FUB Person URL / ID'),
    reviewStatus: findIndex(header, 'AI Conditional Review Status'),
    reviewAction: findIndex(header, 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
    findings: findIndex(header, 'AI Conditional Findings / Suggestions'),
  }

  const rowItems = rows
    .map((row, index) => ({ row, rowNum: index + 1 }))
    .filter(item => item.rowNum >= 3)
    .map(item => ({
      rowNum: item.rowNum,
      row: item.row,
      type: normalizeText(item.row[cols.type]),
      status: normalizeText(item.row[cols.status]),
      agent: normalizeText(item.row[cols.agent]),
      conditionalDueDate: sheetSerialToIso(item.row[cols.conditionalDueDate]),
      closingDate: sheetSerialToIso(item.row[cols.closingDate]),
      reviewStatus: normalizeText(item.row[cols.reviewStatus]),
      reviewAction: normalizeText(item.row[cols.reviewAction]),
    }))
    .filter(item => item.type && item.agent)

  let targetRows = []
  const selectionLanes = new Map()
  if (rowsArg) {
    targetRows = Array.from(new Set(
      rowsArg.split(',')
        .map(value => Number(normalizeText(value)))
        .filter(value => Number.isFinite(value) && value >= 3),
    ))
    targetRows.forEach(rowNum => selectionLanes.set(rowNum, 'manual'))
  } else {
    const queuedRows = queued
      ? rowItems
          .filter(item => isQueuedReviewAction(item.reviewAction))
          .map(item => item.rowNum)
          .slice(0, queuedLimit || undefined)
      : []
    queuedRows.forEach(rowNum => selectionLanes.set(rowNum, 'queued'))

    const queuedSet = new Set(queuedRows)
    const backlogRows = backlog
      ? rowItems
          .map(item => {
            const reviewDate = getConditionalReviewDate(item)
            const age = daysSinceIso(reviewDate)
            return { item, reviewDate, age }
          })
          .filter(({ item, reviewDate, age }) => {
            if (queuedSet.has(item.rowNum)) return false
            if (!isOnOrAfterIso(reviewDate, backlogSince)) return false
            if (age == null || age < matureDays) return false
            if (normalizeText(item.status) !== 'CS') return false
            if (isQueuedReviewAction(item.reviewAction)) return false
            if (isNeedsFixingAction(item.reviewAction)) return false
            return isUninspectedReviewStatus(item.reviewStatus)
          })
          .sort((a, b) => {
            if (a.reviewDate !== b.reviewDate) return b.reviewDate.localeCompare(a.reviewDate)
            return a.item.rowNum - b.item.rowNum
          })
          .map(({ item }) => item.rowNum)
          .slice(0, backlogLimit || undefined)
      : []
    backlogRows.forEach(rowNum => selectionLanes.set(rowNum, 'backlog'))

    targetRows = Array.from(new Set(queuedRows.concat(backlogRows)))
  }

  if (rowsArg && limit > 0) targetRows = targetRows.slice(0, limit)

  const items = targetRows.map(rowNum => {
    const row = rows[rowNum - 1] || []
    return {
      rowNum,
      type: normalizeText(row[cols.type]),
      status: normalizeText(row[cols.status]),
      agent: normalizeText(row[cols.agent]),
      address: normalizeText(row[cols.address]),
      city: normalizeText(row[cols.city]),
      price: row[cols.price],
      teamDollar: row[cols.teamDollar],
      totalAgent: row[cols.totalAgent],
      totalTeam: row[cols.totalTeam],
      conditionalDueDate: sheetSerialToIso(row[cols.conditionalDueDate]),
      closingDate: sheetSerialToIso(row[cols.closingDate]),
      conditions: normalizeText(row[cols.conditions]),
      clientName: normalizeText(row[cols.clientName]),
      fubLink: normalizeText(row[cols.fubLink]),
    }
  }).filter(item => item.type && item.agent)

  const results = []
  for (const item of items) {
    results.push(await createAuditResult(item, fubContext))
  }

  if (write) {
    const updates = []
    for (const result of results) {
      updates.push({ range: makeRange(cols.reviewStatus, result.rowNum), values: [[result.status]] })
      updates.push({ range: makeRange(cols.reviewAction, result.rowNum), values: [[result.action]] })
      updates.push({ range: makeRange(cols.findings, result.rowNum), values: [[result.findingText]] })
    }
    if (updates.length) {
      await batchUpdateSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, updates)
    }
  }

  console.log(JSON.stringify({
    queued,
    backlog,
    write,
    backlogMatureDays: matureDays,
    backlogSince,
    rows: results.map(result => ({
      row: result.rowNum,
      lane: selectionLanes.get(result.rowNum) || 'manual',
      status: result.status,
      action: result.action,
      ownerIssues: result.ownerIssues,
      fubIssues: result.fubIssues,
      fubPassNotes: result.fubPassNotes,
    })),
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
