#!/usr/bin/env node

import process from 'node:process'
import { batchUpdateSheetValues, getSheetValues } from '../lib/google-delegated.js'
import { getFubPerson } from '../lib/fub.js'
import { closeFoundationDb, listFubLeadSourceRules } from '../lib/foundation-db.js'
import {
  ADMIN_DEAL_BACKLOG_SINCE,
  ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT,
  ADMIN_DEAL_POLICY_EFFECTIVE_DATE,
  buildAdminDealPostPolicyNote,
} from '../lib/admin-deal-policy-source-contract.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const ADMIN_SHEET_TITLE = 'ADMIN ONLY - Deal Data Entry'
const ADMIN_RANGE = `'${ADMIN_SHEET_TITLE}'!A1:CE2000`
const FREEDOM_DEALS_RANGE = "'Data Entry - Clients, Deals, NPS & GReviews'!A6:AF500"
const DEFAULT_FUB_CONTEXT = 'owner'
const DEFAULT_BACKLOG_SINCE = ADMIN_DEAL_BACKLOG_SINCE
const DEFAULT_BACKLOG_LIMIT = ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT
const OPS_BONUS_POLICY_EFFECTIVE_DATE = ADMIN_DEAL_POLICY_EFFECTIVE_DATE
const CLICKUP_DEAL_DATA_ENTRY_LIST_ID = process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939'
const OWNERS_ADMIN_GID = '533201019'

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

function normalizeSourceKey(value) {
  return normalizeLower(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
}

function normalizeTradeNumber(value) {
  const text = normalizeText(value).toUpperCase()
  if (!text) return ''
  const explicit = text.match(/T\s*#?\s*(\d{5})\b/)
  if (explicit) return `T#${explicit[1]}`
  const bare = text.match(/\b(\d{5})\b/)
  return bare ? `T#${bare[1]}` : ''
}

function normalizeAddressKey(value) {
  return normalizeLower(value)
    .replace(/&/g, ' and ')
    .replace(/#/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(crescent|cres)\b/g, 'cres')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\s+/g, ' ')
    .trim()
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function toBoolean(value) {
  return value === true || value === 1 || normalizeLower(value) === 'true' || normalizeLower(value) === 'yes'
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

function isPastIso(iso) {
  const days = daysSinceIso(iso)
  return days != null && days > 0
}

function isQueuedReviewAction(value) {
  const normalized = normalizeLower(value)
  return normalized === 'review this deal' || normalized === 'rerun' || normalized === 'review'
}

function normalizeReviewState(value) {
  return normalizeLower(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isQueuedReviewStatus(value) {
  const normalized = normalizeReviewState(value)
  return normalized === 'needs re review' || normalized === 'need re review'
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
  return `'${ADMIN_SHEET_TITLE}'!${column}${rowNumber}`
}

function makeAdminRowLink(rowNumber) {
  return `https://docs.google.com/spreadsheets/d/${OWNERS_SHEET_ID}/edit#gid=${OWNERS_ADMIN_GID}&range=A${rowNumber}`
}

function buildSourceRuleMap(rules) {
  const map = new Map()
  for (const rule of rules || []) {
    const key = normalizeSourceKey(rule.source)
    if (key) map.set(key, rule)
  }
  return map
}

function getSourceRule(sourceRules, source) {
  return sourceRules.get(normalizeSourceKey(source)) || null
}

function getPersonTags(person) {
  return Array.isArray(person?.tags)
    ? person.tags.map(tag => normalizeText(typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
    : []
}

function hasPersonTag(person, expectedTag) {
  const expected = normalizeLower(expectedTag)
  return getPersonTags(person).some(tag => normalizeLower(tag) === expected)
}

function buildFreedomDealMap(rows) {
  const map = new Map()
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const tradeNumber = normalizeTradeNumber(row[3])
    if (!tradeNumber) continue
    map.set(tradeNumber, {
      rowNum: index + 6,
      executed: sheetSerialToIso(row[0]),
      tradeNumber,
      client: normalizeText(row[4]),
      agent: normalizeText(row[5]),
      address: normalizeText(row[6]),
      surveyComplete: normalizeText(row[8]),
      surveyNotes: normalizeText(row[9]),
      surveyNotesEntered: normalizeText(row[10]),
      opsScore: normalizeText(row[11]),
      npsReceived: normalizeText(row[13]),
      npsScore: normalizeText(row[14]),
      npsNotes: normalizeText(row[15]),
      reviewsCaptured: normalizeText(row[17]),
      reviewLinks: normalizeText(row[18]),
      recordComplete: normalizeText(row[20]),
      validated: normalizeText(row[21]),
    })
  }
  return map
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
  if (field.type === 'checkbox') return toBoolean(value) ? 'Yes' : ''
  if (field.type === 'date') {
    const date = new Date(Number(value))
    return Number.isNaN(date.getTime()) ? normalizeText(value) : date.toISOString().slice(0, 10)
  }
  if (typeof value === 'object') return normalizeText(value.url || value.value || value.name || JSON.stringify(value))
  return normalizeText(value)
}

function buildClickUpTaskRecord(task) {
  const fields = new Map()
  for (const field of task.custom_fields || []) {
    fields.set(field.name, decodeClickUpFieldValue(field))
  }
  return {
    id: task.id,
    name: normalizeText(task.name),
    status: normalizeText(task.status?.status),
    url: normalizeText(task.url),
    fields,
  }
}

async function clickUpGet(path) {
  const token = process.env.CLICKUP_PERSONAL_TOKEN
  if (!token) throw new Error('CLICKUP_PERSONAL_TOKEN is missing')
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

function addClickUpAddressIndex(addressMap, address, record) {
  const key = normalizeAddressKey(address)
  if (!key) return
  const existing = addressMap.get(key) || []
  if (!existing.some(item => item.id === record.id)) existing.push(record)
  addressMap.set(key, existing)
}

async function buildClickUpDealContext() {
  const dealMap = new Map()
  const addressMap = new Map()
  for (let page = 0; page < 100; page += 1) {
    const data = await clickUpGet(`/list/${CLICKUP_DEAL_DATA_ENTRY_LIST_ID}/task?include_closed=true&page=${page}&subtasks=false`)
    const tasks = data.tasks || []
    for (const task of tasks) {
      const record = buildClickUpTaskRecord(task)
      const tradeNumber = normalizeTradeNumber(record.fields.get('Deal #'))
      if (tradeNumber) {
        const existing = dealMap.get(tradeNumber) || []
        existing.push(record)
        dealMap.set(tradeNumber, existing)
      }
      addClickUpAddressIndex(addressMap, record.name, record)
      addClickUpAddressIndex(addressMap, record.fields.get('Deal Address (REG)'), record)
    }
    if (!tasks.length || data.last_page) break
  }
  return { dealMap, addressMap }
}

function hasFubIsaEvidence(person) {
  return getPersonTags(person).some(tag => normalizeLower(tag).includes('isa set'))
}

function hasRowIsaMarker(row) {
  return normalizeLower(row.isaSetDeal) === 'yes' || normalizeLower(row.origin).includes('isa appointment set')
}

function buildSummaryLine(label, passed, failed) {
  return `${label} (${passed}/${passed + failed} passed)`
}

function buildFindingText(result) {
  const lines = []
  lines.push(buildSummaryLine('Owners', result.ownersPassed, result.ownersFailed))
  if (result.ownerIssues.length) {
    for (const issue of result.ownerIssues) lines.push(`- ${issue}`)
  }

  lines.push('')
  lines.push(buildSummaryLine('FUB', result.fubPassed, result.fubFailed))
  if (result.fubIssues.length) {
    for (const issue of result.fubIssues) lines.push(`- ${issue}`)
  }

  lines.push('')
  lines.push(buildSummaryLine(result.followThroughLabel, result.followThroughPassed, result.followThroughFailed))
  if (result.followThroughIssues.length) {
    for (const issue of result.followThroughIssues) lines.push(`- ${issue}`)
  }

  lines.push('')
  lines.push('Result')
  lines.push(`- ${result.result}`)
  return lines.join('\n')
}

function buildAdminDealGroups(rows, cols) {
  const groups = new Map()
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const deal = normalizeText(row[cols.deal])
    if (!deal) continue

    const existing = groups.get(deal) || { deal, rows: [] }
    existing.rows.push({
      rowNum: rowIndex + 1,
      deal,
      executed: sheetSerialToIso(row[cols.executed]),
      expectedClosing: sheetSerialToIso(row[cols.expectedClosing]),
      dealStatus: normalizeText(row[cols.dealStatus]),
      accountingStatus: normalizeText(row[cols.accountingStatus]),
      coBrokerStatus: normalizeText(row[cols.coBrokerStatus]),
      clientSignedDate: normalizeText(row[cols.clientSignedDate]),
      expectedCashDeposit: normalizeText(row[cols.expectedCashDeposit]),
      daysBetweenExecutedAndClosing: normalizeText(row[cols.daysBetweenExecutedAndClosing]),
      client: normalizeText(row[cols.client]),
      address: normalizeText(row[cols.address]),
      side: normalizeText(row[cols.side]),
      source: normalizeText(row[cols.source]),
      extraSource: normalizeText(row[cols.extraSource]),
      groundZero: normalizeText(row[cols.groundZero]),
      origin: normalizeText(row[cols.origin]),
      companyAgent: normalizeText(row[cols.companyAgent]),
      realtor: normalizeText(row[cols.realtor]),
      total: row[cols.total],
      sale: row[cols.sale],
      grossToTeam: row[cols.grossToTeam],
      volumeCredit: row[cols.volumeCredit],
      commissionCredit: row[cols.commissionCredit],
      dealCredit: row[cols.dealCredit],
      netToTeam: row[cols.netToTeam],
      splitToAgent: row[cols.splitToAgent],
      agentPortion: row[cols.agentPortion],
      companyPortion: row[cols.companyPortion],
      recruitBonus: row[cols.recruitBonus],
      agentSplitTransactionFeePortion: row[cols.agentSplitTransactionFeePortion],
      agentSplitPlan: normalizeText(row[cols.agentSplitPlan]),
      agentPortionOfSplit: row[cols.agentPortionOfSplit],
      capYtdSplitRunningTotal: row[cols.capYtdSplitRunningTotal],
      agentEmail: normalizeText(row[cols.agentEmail]),
      fub: normalizeText(row[cols.fub]),
      isaSetDeal: normalizeText(row[cols.isaSetDeal]),
      reviewStatus: normalizeText(row[cols.cc]),
      reviewAction: normalizeText(row[cols.cd]),
      findings: normalizeText(row[cols.ce]),
    })
    groups.set(deal, existing)
  }
  return groups
}

const SPLIT_REQUIRED_PRIMARY_FIELDS = [
  ['deal', 'Deal #'],
  ['dealStatus', 'Deal Status'],
  ['accountingStatus', 'Commission/Fees Into Accounting Software?'],
  ['coBrokerStatus', 'Co-Broke and Agent Expense Status'],
  ['clientSignedDate', 'Client Signed Date'],
  ['executed', 'Date Firm (Executed)'],
  ['expectedClosing', 'Expected Closing'],
  ['expectedCashDeposit', 'Expected Cash Deposit'],
  ['daysBetweenExecutedAndClosing', 'Days Between Executed and Closing'],
  ['client', 'Client Name'],
  ['address', 'Deal Address'],
  ['side', 'Buy / Sell / Referral'],
  ['source', 'Lead Source'],
  ['extraSource', 'Extra Lead Source Data'],
  ['groundZero', 'Ground Zero'],
  ['origin', 'Extra Orgin Lead Source Data'],
  ['companyAgent', 'Company or Agent'],
  ['realtor', 'Realtor'],
  ['total', 'Total'],
]

const SPLIT_REQUIRED_REPORTING_FIELDS = [
  ['volumeCredit', 'Volume Credit'],
  ['commissionCredit', 'Commission Credit'],
  ['dealCredit', 'Deal Credit'],
  ['netToTeam', 'Net To Team'],
  ['splitToAgent', 'Split To Agent'],
  ['agentPortion', 'Agent Portion'],
  ['companyPortion', 'Company/Team Lead Portion'],
  ['recruitBonus', 'Recruit Bonus'],
  ['agentSplitTransactionFeePortion', 'Agent Portion of Split or Transaction Fee'],
  ['agentSplitPlan', 'Agent A or B Split'],
  ['agentPortionOfSplit', 'Agent Portion Of Split'],
  ['capYtdSplitRunningTotal', 'Cap YTD Split Running Total'],
  ['agentEmail', 'Agent Email'],
  ['isaSetDeal', 'ISA Set Deal'],
]

function missingFields(row, fieldDefs) {
  return fieldDefs
    .filter(([key]) => normalizeText(row[key]) === '')
    .map(([, label]) => label)
}

function summarizeMissingRows(rows, fieldDefs) {
  return rows
    .map(row => ({ rowNum: row.rowNum, missing: missingFields(row, fieldDefs) }))
    .filter(item => item.missing.length)
}

function formatMissingRows(items) {
  return items
    .map(item => `row ${item.rowNum}: ${item.missing.join(', ')}`)
    .join('; ')
}

function getGroupExecutedDate(group) {
  return group.rows.map(row => row.executed).filter(Boolean).sort()[0] || null
}

function getGroupExpectedClosingDate(group) {
  return group.rows.map(row => row.expectedClosing).filter(Boolean).sort()[0] || null
}

function getQueuedDeals(groups) {
  return Array.from(groups.values())
    .filter(group => group.rows.some(row => isQueuedReviewAction(row.reviewAction) || isQueuedReviewStatus(row.reviewStatus)))
    .map(group => group.deal)
}

function getBacklogDeals(groups, options) {
  const cutoff = options.backlogSince || DEFAULT_BACKLOG_SINCE
  const matureDays = options.matureDays || 0
  const excludedDeals = options.excludedDeals || new Set()
  return Array.from(groups.values())
    .map(group => {
      const executedDate = getGroupExecutedDate(group)
      const age = daysSinceIso(executedDate)
      return { group, executedDate, age }
    })
    .filter(item => {
      const stalePostPolicyReview = isStalePostPolicyFollowThroughReview(item.group)
      if (excludedDeals.has(item.group.deal)) return false
      if (!isOnOrAfterIso(item.executedDate, cutoff)) return false
      if (item.age == null || item.age < matureDays) return false
      if (item.group.rows.some(row => isQueuedReviewAction(row.reviewAction) || isQueuedReviewStatus(row.reviewStatus))) return false
      if (stalePostPolicyReview) return true
      if (item.group.rows.some(row => isNeedsFixingAction(row.reviewAction))) return false
      return item.group.rows.every(row => isUninspectedReviewStatus(row.reviewStatus))
    })
    .sort((a, b) => {
      if (a.executedDate !== b.executedDate) return b.executedDate.localeCompare(a.executedDate)
      return a.group.deal.localeCompare(b.group.deal)
    })
    .map(item => item.group.deal)
}

function isStalePostPolicyFollowThroughReview(group) {
  const executedDate = getGroupExecutedDate(group)
  if (!isOnOrAfterIso(executedDate, OPS_BONUS_POLICY_EFFECTIVE_DATE)) return false
  return group.rows.some(row => {
    const findings = normalizeLower(row.findings)
    return findings.includes('candidate workflow evidence') ||
      findings.includes('capture-rate audit is not locked') ||
      findings.includes('missing freedom')
  })
}

function getClickUpField(task, fieldName) {
  return normalizeText(task?.fields?.get(fieldName))
}

function getGroupAddressKeys(group) {
  return Array.from(new Set(
    group.rows
      .map(row => normalizeAddressKey(row.address))
      .filter(Boolean)
  ))
}

function findClickUpTasksForGroup(group, clickUpContext) {
  const tradeNumber = normalizeTradeNumber(group.deal)
  const tradeTasks = clickUpContext.dealMap.get(tradeNumber) || []
  if (tradeTasks.length) {
    return { tasks: tradeTasks, matchType: 'trade', matchedAddressKey: '' }
  }

  const addressKeys = getGroupAddressKeys(group)
  const matches = []
  let matchedAddressKey = ''
  for (const addressKey of addressKeys) {
    const exact = clickUpContext.addressMap.get(addressKey) || []
    if (exact.length) {
      matchedAddressKey = addressKey
      matches.push(...exact)
      continue
    }
    for (const [clickUpAddressKey, tasks] of clickUpContext.addressMap.entries()) {
      if (
        addressKey.length >= 8 &&
        clickUpAddressKey.length >= 8 &&
        (addressKey.startsWith(clickUpAddressKey) || clickUpAddressKey.startsWith(addressKey))
      ) {
        matchedAddressKey = clickUpAddressKey
        matches.push(...tasks)
      }
    }
  }

  const deduped = []
  for (const task of matches) {
    if (!deduped.some(item => item.id === task.id)) deduped.push(task)
  }
  return { tasks: deduped, matchType: deduped.length ? 'address' : 'none', matchedAddressKey }
}

function isStatusOneOf(value, statuses) {
  const normalized = normalizeLower(value || 'Not Started')
  return statuses.some(status => normalized === normalizeLower(status))
}

function evaluateClickUpFollowThrough(group, clickUpContext) {
  const issues = []
  const notes = []
  let passed = 0
  let failed = 0

  if (clickUpContext.error) {
    return {
      passed,
      failed: failed + 1,
      issues: [`ClickUp Deal Data Entry could not be read: ${clickUpContext.error.message}`],
      notes,
    }
  }

  const clickUpMatch = findClickUpTasksForGroup(group, clickUpContext)
  const tasks = clickUpMatch.tasks
  const executedDate = getGroupExecutedDate(group)
  const age = daysSinceIso(executedDate)

  if (!tasks.length) {
    failed += 1
    issues.push(`No ClickUp Deal Data Entry task found for Trade Number ${group.deal} or matching property address.`)
    return { passed, failed, issues, notes }
  }

  const task = tasks.find(item => normalizeLower(item.status) !== 'closed') || tasks[0]
  notes.push(`ClickUp task linked: ${task.name}${task.status ? ` (${task.status})` : ''}.`)
  const taskTradeNumber = normalizeTradeNumber(getClickUpField(task, 'Deal #'))
  if (clickUpMatch.matchType === 'trade') {
    passed += 1
  } else {
    failed += 1
    issues.push(`ClickUp task was found by property/address, but Deal # / Trade Number is ${taskTradeNumber || 'blank'}; set it to ${group.deal} so the workflow joins to the Owners row.`)
  }
  if (tasks.length > 1) {
    failed += 1
    issues.push(`Multiple ClickUp Deal Data Entry tasks match this Owners deal; keep one governed task per deal and link it with Deal # ${group.deal}.`)
  }

  const adminLink = getClickUpField(task, 'AIOS Admin Deal Row Link')
  if (adminLink) {
    passed += 1
  } else {
    notes.push(`AIOS Admin Deal Row Link can be backfilled to ${makeAdminRowLink(group.rows[0].rowNum)}.`)
  }

  const fubLink = getClickUpField(task, 'Follow Up Boss Link')
  if (fubLink) {
    passed += 1
  } else {
    notes.push('ClickUp Follow Up Boss Link is blank; AIOS can backfill it from the Owners/FUB join when the Owners row has a valid FUB link.')
  }

  if (age == null || age < 10) {
    passed += 1
    notes.push(`Deal is ${age == null ? 'not dateable' : `${age} days old`}; full ClickUp follow-through enforcement starts at firm + 10 days.`)
    return { passed, failed, issues, notes }
  }

  const internalOnboardingStatus = getClickUpField(task, 'Internal Onboarding Status') || 'Not Started'
  const internalOnboardingSkippedReason = getClickUpField(task, 'Internal Onboarding Skipped Reason')
  if (isStatusOneOf(internalOnboardingStatus, ['Completed'])) {
    passed += 1
  } else if (isStatusOneOf(internalOnboardingStatus, ['Skipped']) && internalOnboardingSkippedReason) {
    passed += 1
    notes.push('Internal onboarding survey was skipped with a reason.')
  } else {
    failed += 1
    issues.push(`Internal onboarding survey should be completed by firm + 10 days; ClickUp status is ${internalOnboardingStatus}.`)
  }

  const internalDealStatus = getClickUpField(task, 'Internal Deal Review Status') || 'Not Started'
  const internalDealSkippedReason = getClickUpField(task, 'Internal Deal Review Skipped Reason')
  if (isStatusOneOf(internalDealStatus, ['Completed'])) {
    passed += 1
  } else if (isStatusOneOf(internalDealStatus, ['Skipped']) && internalDealSkippedReason) {
    passed += 1
    notes.push('Internal deal-management survey was skipped with a reason.')
  } else {
    failed += 1
    issues.push(`Internal deal-management survey should be completed by firm + 10 days; ClickUp status is ${internalDealStatus}.`)
  }

  const npsStatus = getClickUpField(task, 'NPS Status') || 'Not Started'
  const npsRequested = toBoolean(getClickUpField(task, 'NPS Requested'))
  const npsCompleted = toBoolean(getClickUpField(task, 'NPS Completed'))
  const npsScore = getClickUpField(task, 'NPS Score')
  if (isStatusOneOf(npsStatus, ['Requested', 'Completed', 'Not Eligible']) || npsRequested || npsCompleted) {
    passed += 1
  } else {
    failed += 1
    issues.push(`Client NPS should be requested by firm + 10 days; ClickUp NPS Status is ${npsStatus}.`)
  }
  if ((isStatusOneOf(npsStatus, ['Completed']) || npsCompleted) && npsScore === '') {
    failed += 1
    issues.push('ClickUp says NPS is completed, but NPS Score is blank.')
  } else if (npsScore !== '') {
    passed += 1
  }

  const reviewStatus = getClickUpField(task, 'Review Status') || 'Not Started'
  const reviewRequested = toBoolean(getClickUpField(task, 'Google Review Requested'))
  const reviewCaptured = toBoolean(getClickUpField(task, 'Google Review Captured'))
  const capturedCount = toNumber(getClickUpField(task, 'Google Review Captured Count'))
  const reviewEvidence = getClickUpField(task, 'Google Review Link(s) / Evidence') || getClickUpField(task, 'Google Review Link')
  if (isStatusOneOf(reviewStatus, ['Requested', 'Captured', 'Not Eligible']) || reviewRequested || reviewCaptured) {
    passed += 1
  } else {
    failed += 1
    issues.push(`Google review should be requested by firm + 10 days; ClickUp Review Status is ${reviewStatus}.`)
  }
  if (isStatusOneOf(reviewStatus, ['Captured']) || reviewCaptured) {
    if (capturedCount > 0 || reviewEvidence) {
      passed += 1
    } else {
      failed += 1
      issues.push('ClickUp says a Google review was captured, but captured count/evidence is blank.')
    }
  }

  const outreachEvidence = getClickUpField(task, 'FUB Call / Review Evidence Link')
  if ((npsRequested || reviewRequested || isStatusOneOf(npsStatus, ['Requested', 'Completed']) || isStatusOneOf(reviewStatus, ['Requested', 'Captured'])) && outreachEvidence) {
    passed += 1
  } else if (npsRequested || reviewRequested || isStatusOneOf(npsStatus, ['Requested', 'Completed']) || isStatusOneOf(reviewStatus, ['Requested', 'Captured'])) {
    failed += 1
    issues.push('NPS / review outreach is marked started, but FUB Call / Review Evidence Link is blank.')
  }

  return { passed, failed, issues, notes }
}

function createAuditResult(group, sourceRules, freedomDealMap, clickUpContext) {
  const rows = group.rows
  const attributionRows = rows
  const ownerIssues = []
  const fubIssues = []
  const followThroughIssues = []
  const followThroughNotes = []
  let ownersPassed = 0
  let ownersFailed = 0
  let fubPassed = 0
  let fubFailed = 0
  let followThroughPassed = 0
  let followThroughFailed = 0
  let followThroughLabel = 'Freedom'

  const sumTotal = rows.reduce((sum, row) => sum + toNumber(row.total), 0)
  const sumDealCredit = rows.reduce((sum, row) => sum + toNumber(row.dealCredit), 0)
  const saleAnchor = toNumber(rows[0].sale)
  const sumVolumeCredit = rows.reduce((sum, row) => sum + toNumber(row.volumeCredit), 0)
  const nonZeroGrossRows = rows.filter(row => toNumber(row.grossToTeam) > 0)
  const grossAnchor = nonZeroGrossRows.length ? toNumber(nonZeroGrossRows[0].grossToTeam) : 0
  const sumCommissionCredit = rows.reduce((sum, row) => sum + toNumber(row.commissionCredit), 0)

  if (approxEqual(sumTotal, 1, 0.0001)) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(`split totals add to ${sumTotal.toFixed(3)}, not 1.000.`)
  }

  if (approxEqual(sumDealCredit, 1, 0.0001)) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(`deal credit adds to ${sumDealCredit.toFixed(3)}, not 1.000.`)
  }

  if (!saleAnchor || approxEqual(sumVolumeCredit, saleAnchor, 0.5)) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(`volume credit adds to ${sumVolumeCredit.toFixed(2)} but sale price anchor is ${saleAnchor.toFixed(2)}.`)
  }

  if (!grossAnchor || approxEqual(sumCommissionCredit, grossAnchor, 0.5)) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(`commission credit adds to ${sumCommissionCredit.toFixed(2)} but gross-to-team anchor is ${grossAnchor.toFixed(2)}.`)
  }

  if (nonZeroGrossRows.length <= 1) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(
      `Gross To Team is populated on multiple split rows (${nonZeroGrossRows.map(row => row.rowNum).join(', ')}). Keep cash on the anchor row only.`
    )
  }

  let rowCashMismatch = null
  for (const row of rows) {
    const net = toNumber(row.netToTeam)
    const combined = toNumber(row.agentPortion) + toNumber(row.companyPortion)
    if (!approxEqual(net, combined, 0.05)) {
      rowCashMismatch = { rowNum: row.rowNum, net, combined }
      break
    }
  }

  if (!rowCashMismatch) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push(
      `row ${rowCashMismatch.rowNum} has net-to-team ${rowCashMismatch.net.toFixed(2)} but agent + company portions ${rowCashMismatch.combined.toFixed(2)}.`
    )
  }

  if (rows.length > 1) {
    const missingPrimaryRows = summarizeMissingRows(rows, SPLIT_REQUIRED_PRIMARY_FIELDS)
    if (missingPrimaryRows.length) {
      ownersFailed += 1
      ownerIssues.push(`split deal rows must carry required B:T fields on every credited row; missing ${formatMissingRows(missingPrimaryRows)}.`)
    } else {
      ownersPassed += 1
    }

    const missingReportingRows = summarizeMissingRows(rows, SPLIT_REQUIRED_REPORTING_FIELDS)
    if (missingReportingRows.length) {
      ownersFailed += 1
      ownerIssues.push(`split deal rows must carry core AG+ reporting fields on every credited row; missing ${formatMissingRows(missingReportingRows)}.`)
    } else {
      ownersPassed += 1
    }
  }

  const unresolvedSources = attributionRows
    .filter(row => normalizeText(row.source) === '<unspecified>' || !normalizeText(row.source))
    .map(row => row.rowNum)
  if (unresolvedSources.length) {
    ownersFailed += 1
    ownerIssues.push(`lead source is still unresolved on row${unresolvedSources.length === 1 ? '' : 's'} ${unresolvedSources.join(', ')}.`)
  } else {
    ownersPassed += 1
  }

  if (rows.length === 1) {
    const missingClientRows = rows
      .filter(row => !normalizeText(row.client))
      .map(row => row.rowNum)
    if (!missingClientRows.length) {
      ownersPassed += 1
    } else {
      ownersFailed += 1
      ownerIssues.push(`Client Name is missing on row${missingClientRows.length === 1 ? '' : 's'} ${missingClientRows.join(', ')}.`)
    }

    const missingCompanyAgentRows = rows
      .filter(row => !normalizeText(row.companyAgent))
      .map(row => row.rowNum)
    if (!missingCompanyAgentRows.length) {
      ownersPassed += 1
    } else {
      ownersFailed += 1
      ownerIssues.push(`Company or Agent is missing on row${missingCompanyAgentRows.length === 1 ? '' : 's'} ${missingCompanyAgentRows.join(', ')}.`)
    }
  }

  const fubPerson = group.fubPerson || null
  const fubHasIsa = hasFubIsaEvidence(fubPerson)
  for (const row of attributionRows) {
    const sourceRule = getSourceRule(sourceRules, row.source)
    const rowLabel = `row ${row.rowNum}`
    if (row.source && !sourceRule) {
      ownersFailed += 1
      ownerIssues.push(`${rowLabel} lead source ${row.source} is not in the governed FUB source rules.`)
    } else if (sourceRule) {
      const openRule = sourceRule.marketingType === 'unclassified' ||
        sourceRule.ownershipType === 'unclassified' ||
        sourceRule.flagState !== 'none'
      if (openRule) {
        ownersFailed += 1
        ownerIssues.push(`${rowLabel} lead source ${row.source} is not final attribution truth yet (${sourceRule.flagState || 'open rule'}).`)
      } else {
        ownersPassed += 1
      }

      const rowHasIsa = attributionRows.some(candidate => hasRowIsaMarker(candidate))
      const expectedOwner = (rowHasIsa || fubHasIsa)
        ? 'Company'
        : (sourceRule.ownershipType === 'company'
            ? 'Company'
            : (sourceRule.ownershipType === 'agent' ? 'Agent' : ''))
      if (expectedOwner && normalizeText(row.companyAgent) !== expectedOwner) {
        ownersFailed += 1
        ownerIssues.push(`${rowLabel} Company or Agent should be ${expectedOwner} based on governed source lineage${rowHasIsa || fubHasIsa ? ' and ISA evidence' : ''}.`)
      } else if (expectedOwner) {
        ownersPassed += 1
      }
    }

    const rowHasIsa = attributionRows.some(candidate => hasRowIsaMarker(candidate))
    if (fubHasIsa && normalizeLower(row.isaSetDeal) !== 'yes') {
      ownersFailed += 1
      ownerIssues.push(`${rowLabel} FUB carries ISA evidence but ISA Set Deal is not marked Yes.`)
    } else if (normalizeLower(row.isaSetDeal) === 'yes' && !fubHasIsa) {
      ownersFailed += 1
      ownerIssues.push(`${rowLabel} ISA Set Deal is marked Yes but linked FUB person does not show ISA evidence.`)
    } else if (rowHasIsa || fubHasIsa) {
      ownersPassed += 1
    }
  }

  const distinctLinks = Array.from(new Set(rows.map(row => normalizeText(row.fub)).filter(Boolean)))
  let fubStage = ''
  let fubSource = ''
  let fubPersonId = ''

  if (!distinctLinks.length) {
    fubFailed += 1
    fubIssues.push('Client Follow UP Boss ID is missing, so full parity was not run.')
  } else if (distinctLinks.length > 1) {
    fubFailed += 1
    fubIssues.push(`multiple FUB links are present on one deal (${distinctLinks.length}); use one governed person link per deal.`)
  } else {
    try {
      const person = group.fubPerson || null
      fubPersonId = String(person?.id || '')
      fubSource = normalizeText(person?.source)
      fubStage = normalizeText(person?.stage)
      fubPassed += 1
      const fubSourceRule = getSourceRule(sourceRules, fubSource)

      if (fubSource && !fubSourceRule) {
        fubFailed += 1
        fubIssues.push(`linked FUB source ${fubSource} is not in the governed source rules.`)
      } else if (fubSourceRule && (
        fubSourceRule.marketingType === 'unclassified' ||
        fubSourceRule.ownershipType === 'unclassified' ||
        fubSourceRule.flagState !== 'none'
      )) {
        fubFailed += 1
        fubIssues.push(`linked FUB source ${fubSource} is not final attribution truth yet (${fubSourceRule.flagState || 'open rule'}).`)
      } else if (fubSourceRule) {
        fubPassed += 1
      }

      const mismatchedSourceRows = attributionRows
        .filter(row => normalizeText(row.source) && fubSource && normalizeText(row.source) !== fubSource)
        .map(row => `${row.rowNum} (${normalizeText(row.source)})`)

      if (mismatchedSourceRows.length) {
        fubFailed += 1
        const ownerRules = attributionRows
          .map(row => getSourceRule(sourceRules, row.source))
          .filter(Boolean)
        const sameOwnership = fubSourceRule && ownerRules.length &&
          ownerRules.every(rule => rule.ownershipType === fubSourceRule.ownershipType)
        fubIssues.push(`linked FUB source is ${fubSource}, but Owners source differs on row${mismatchedSourceRows.length > 1 ? 's' : ''} ${mismatchedSourceRows.join(', ')}${sameOwnership ? '; governed ownership matches, so this is lineage cleanup, not a company/agent credit flip.' : '.'}`)
      } else {
        fubPassed += 1
      }

      const preFirmStages = new Set([
        'Contact - Non Lead/Non Supporter',
        'Lead',
        'Hot Lead/Nurture (0-3)',
        'Warm Nurture (3-6)',
        'Cold Nurture (6-12)',
        'Appointment',
        'Appointment - No Show',
        'Active Client',
        'Conditional Deal',
      ])
      const pendingStages = new Set([
        'Firm Deal',
        'Pending',
      ])
      const postCloseNeedsCleanupStages = new Set([...preFirmStages, ...pendingStages])
      const expectedClosingDate = getGroupExpectedClosingDate(group)

      if (fubStage && isPastIso(expectedClosingDate) && postCloseNeedsCleanupStages.has(fubStage)) {
        fubFailed += 1
        fubIssues.push(`linked FUB person ${fubPersonId || distinctLinks[0]} is still in ${fubStage}, but Expected Closing ${expectedClosingDate} has passed. Review closed / post-close cleanup.`)
      } else if (fubStage && !isPastIso(expectedClosingDate) && preFirmStages.has(fubStage)) {
        fubFailed += 1
        fubIssues.push(`linked FUB person ${fubPersonId || distinctLinks[0]} is still in ${fubStage}. This deal is firm/pending, so FUB should be in Firm Deal/Pending until Expected Closing${expectedClosingDate ? ` ${expectedClosingDate}` : ''}.`)
      } else {
        fubPassed += 1
      }

      if (hasPersonTag(person, 'Past Client') || normalizeLower(fubStage) === 'past client') {
        fubPassed += 1
      } else {
        fubFailed += 1
        fubIssues.push(`linked FUB person ${fubPersonId || distinctLinks[0]} is missing the Past Client tag. Add the tag for post-close follow-up automation; do not force an early stage move before close.`)
      }
    } catch (error) {
      fubFailed += 1
      fubIssues.push(`linked FUB person could not be read: ${error.message}`)
    }
  }

  const executedDate = getGroupExecutedDate(group)
  const useQ2BonusPolicy = isOnOrAfterIso(executedDate, OPS_BONUS_POLICY_EFFECTIVE_DATE)
  const freedomRow = freedomDealMap.get(group.deal)
  if (useQ2BonusPolicy) {
    followThroughLabel = 'ClickUp Follow-through'
    const clickUpFollowThrough = evaluateClickUpFollowThrough(group, clickUpContext)
    followThroughPassed += clickUpFollowThrough.passed
    followThroughFailed += clickUpFollowThrough.failed
    followThroughIssues.push(...clickUpFollowThrough.issues)
    followThroughNotes.push(buildAdminDealPostPolicyNote())
    followThroughNotes.push(...clickUpFollowThrough.notes)
    if (freedomRow) {
      followThroughNotes.push(`A historical Freedom row is still visible at row ${freedomRow.rowNum}, but it is not treated as the post-policy source of truth.`)
    }
  } else {
    followThroughLabel = 'Freedom'
    if (!freedomRow) {
      followThroughFailed += 1
      followThroughIssues.push('No visible reviewed Freedom deal record found for this trade.')
      followThroughFailed += 1
      followThroughIssues.push('No visible NPS follow-through found yet for this trade.')
      followThroughFailed += 1
      followThroughIssues.push('No visible Google-review follow-through found yet for this trade.')
    } else {
      followThroughPassed += 1

      const npsVisible = normalizeLower(freedomRow.npsReceived) === 'yes' ||
        Boolean(freedomRow.npsScore) ||
        Boolean(freedomRow.npsNotes)
      if (npsVisible) {
        followThroughPassed += 1
      } else {
        followThroughFailed += 1
        followThroughIssues.push(`Freedom row ${freedomRow.rowNum} has no visible NPS follow-through.`)
      }

      const reviewsVisible = toNumber(freedomRow.reviewsCaptured) > 0 || Boolean(freedomRow.reviewLinks)
      if (reviewsVisible) {
        followThroughPassed += 1
      } else {
        followThroughFailed += 1
        followThroughIssues.push(`Freedom row ${freedomRow.rowNum} has no visible Google-review follow-through.`)
      }
    }
  }

  const hasIssues = ownerIssues.length > 0 || fubIssues.length > 0 || followThroughIssues.length > 0
  const status = hasIssues ? 'Issues Found' : 'Clean'
  const action = hasIssues ? 'Needs Fixing' : 'No Action'
  const result = hasIssues
    ? 'Fix the source rows, then change CD to Review This Deal.'
    : 'This split deal passed the current audit.'

  return {
    deal: group.deal,
    rowNums: rows.map(row => row.rowNum),
    status,
    action,
    ownersPassed,
    ownersFailed,
    fubPassed,
    fubFailed,
    followThroughLabel,
    followThroughPassed,
    followThroughFailed,
    ownerIssues,
    fubIssues,
    followThroughIssues,
    followThroughNotes,
    result,
    findingText: buildFindingText({
      ownersPassed,
      ownersFailed,
      ownerIssues,
      fubPassed,
      fubFailed,
      fubIssues,
      followThroughLabel,
      followThroughPassed,
      followThroughFailed,
      followThroughIssues,
      followThroughNotes,
      result,
    }),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dealsArg = normalizeText(args.deals)
  const queued = Boolean(args.queued)
  const backlog = Boolean(args.backlog || args.uninspected)
  const write = Boolean(args.write)
  const fubContext = normalizeText(args.context) || DEFAULT_FUB_CONTEXT
  const matureDays = args['mature-days'] == null || args['mature-days'] === true
    ? (backlog ? 10 : 0)
    : Math.max(0, Number(args['mature-days']) || 0)
  const limit = parseLimit(args.limit, 0)
  const queuedLimit = parseLimit(args['queued-limit'], limit)
  const hasBacklogLimit = args['backlog-limit'] != null && args['backlog-limit'] !== true
  const backlogLimit = hasBacklogLimit
    ? parseLimit(args['backlog-limit'], DEFAULT_BACKLOG_LIMIT)
    : (backlog ? DEFAULT_BACKLOG_LIMIT : limit)
  const backlogSince = normalizeText(args['backlog-since'] || args.since) || DEFAULT_BACKLOG_SINCE

  if (!dealsArg && !queued && !backlog) {
    throw new Error('Pass --deals=T#123,T#456 or use --queued and/or --backlog')
  }

  const adminRes = await getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, ADMIN_RANGE)
  const freedomRes = await getSheetValues('service-account', FREEDOM_SHEET_ID, FREEDOM_DEALS_RANGE)
  const rows = adminRes.values || []
  const freedomRows = freedomRes.values || []
  const header = rows[0] || []

  const cols = {
    deal: findIndex(header, 'Deal #'),
    dealStatus: findIndex(header, 'Deal Status'),
    accountingStatus: findIndex(header, 'Commission/Fees Into Accounting Software?'),
    coBrokerStatus: findIndex(header, 'Co-Broke and Agent Expense Status'),
    clientSignedDate: findIndex(header, 'Client Signed Date'),
    executed: findIndex(header, 'Date Firm (Executed)'),
    expectedClosing: findIndex(header, 'Expected Closing'),
    expectedCashDeposit: findIndex(header, 'Expected Cash Deposit'),
    daysBetweenExecutedAndClosing: findIndex(header, 'Days Between Executed and Closing'),
    client: findIndex(header, 'Client Name'),
    address: findIndex(header, 'Deal Address'),
    side: findIndex(header, 'Buy / Sell / Referral'),
    source: findIndex(header, 'Lead Source (Bonus System For Having This 100% Complete)'),
    realtor: findIndex(header, 'Realtor'),
    total: findIndex(header, 'Total'),
    sale: findIndex(header, 'Sale Price'),
    grossToTeam: findIndex(header, 'Gross To Team'),
    volumeCredit: findIndex(header, 'Volume Credit'),
    commissionCredit: findIndex(header, 'Commission Credit'),
    dealCredit: findIndex(header, 'Deal Credit'),
    netToTeam: findIndex(header, 'Net To Team'),
    splitToAgent: findIndex(header, 'Split To Agent'),
    agentPortion: findIndex(header, 'Agent Portion'),
    companyPortion: findIndex(header, 'Company/Team Lead Portion'),
    recruitBonus: findIndex(header, 'Recruit Bonus'),
    agentSplitTransactionFeePortion: findIndex(header, 'Agent Portion of Split or Transaction Fee'),
    agentSplitPlan: findIndex(header, 'Agent A or B Split'),
    agentPortionOfSplit: findIndex(header, 'Agent Portion Of Split'),
    capYtdSplitRunningTotal: findIndex(header, 'Cap YTD Split Running Total'),
    agentEmail: findIndex(header, 'Agent Email'),
    fub: findIndex(header, 'Client Follow UP Boss ID'),
    extraSource: findIndex(header, 'Extra Lead Source Data'),
    groundZero: findIndex(header, 'Ground Zero'),
    origin: findIndex(header, 'Extra Orgin Lead Source Data'),
    companyAgent: findIndex(header, 'Company or Agent'),
    isaSetDeal: findIndex(header, 'ISA Set Deal'),
    cc: findIndex(header, 'AI Review Status'),
    cd: findIndex(header, 'THIS ROW ONLY: REVIEW ACTION'),
    ce: findIndex(header, 'AI Findings By System / Suggestions'),
  }

  const allGroups = buildAdminDealGroups(rows, cols)
  const sourceRules = buildSourceRuleMap(await listFubLeadSourceRules())
  const freedomDealMap = buildFreedomDealMap(freedomRows)
  const clickUpContext = { dealMap: new Map(), addressMap: new Map(), error: null }
  let dealsRequested = []
  const selectionLanes = new Map()

  if (dealsArg) {
    dealsRequested = Array.from(
      new Set(
        dealsArg
          .split(',')
          .map(value => normalizeText(value))
          .filter(Boolean),
      ),
    )
    dealsRequested.forEach(deal => selectionLanes.set(deal, 'manual'))
  } else {
    const queuedDeals = queued ? getQueuedDeals(allGroups).slice(0, queuedLimit || undefined) : []
    queuedDeals.forEach(deal => selectionLanes.set(deal, 'queued'))

    const backlogDeals = backlog
      ? getBacklogDeals(allGroups, {
          backlogSince,
          matureDays,
          excludedDeals: new Set(queuedDeals),
        }).slice(0, backlogLimit || undefined)
      : []
    backlogDeals.forEach(deal => selectionLanes.set(deal, 'backlog'))

    dealsRequested = Array.from(new Set(queuedDeals.concat(backlogDeals)))
  }

  const groups = new Map()
  for (const deal of dealsRequested) {
    const group = allGroups.get(deal)
    if (group) groups.set(deal, group)
  }

  for (const deal of dealsRequested) {
    if (!groups.has(deal) && dealsArg) {
      throw new Error(`Deal not found in sheet: ${deal}`)
    }
  }

  for (const group of groups.values()) {
    const link = group.rows.map(row => row.fub).find(Boolean)
    if (link) {
      try {
        group.fubPerson = await getFubPerson(fubContext, link)
      } catch {
        group.fubPerson = null
      }
    } else {
      group.fubPerson = null
    }
  }

  if (dealsRequested.length) {
    try {
      const clickUpDealContext = await buildClickUpDealContext()
      clickUpContext.dealMap = clickUpDealContext.dealMap
      clickUpContext.addressMap = clickUpDealContext.addressMap
    } catch (error) {
      clickUpContext.error = error
    }
  }

  const results = dealsRequested.map(deal => createAuditResult(groups.get(deal), sourceRules, freedomDealMap, clickUpContext))

  if (write) {
    const updates = []
    for (const result of results) {
      for (const rowNum of result.rowNums) {
        updates.push({
          range: makeRange(cols.cc, rowNum),
          values: [[result.status]],
        })
        updates.push({
          range: makeRange(cols.cd, rowNum),
          values: [[result.action]],
        })
        updates.push({
          range: makeRange(cols.ce, rowNum),
          values: [[result.findingText]],
        })
      }
    }
    await batchUpdateSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, updates)
  }

  console.log(
    JSON.stringify(
      {
        queued,
        backlog,
        write,
        backlogMatureDays: matureDays,
        backlogSince,
        deals: results.map(result => ({
          deal: result.deal,
          lane: selectionLanes.get(result.deal) || 'manual',
          rows: result.rowNums,
          status: result.status,
          action: result.action,
          ownersPassed: result.ownersPassed,
          ownersFailed: result.ownersFailed,
          fubPassed: result.fubPassed,
          fubFailed: result.fubFailed,
          followThroughLabel: result.followThroughLabel,
          followThroughPassed: result.followThroughPassed,
          followThroughFailed: result.followThroughFailed,
          ownerIssues: result.ownerIssues,
          fubIssues: result.fubIssues,
          followThroughIssues: result.followThroughIssues,
          followThroughNotes: result.followThroughNotes,
        })),
      },
      null,
      2,
    ),
  )
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb().catch(() => {})
})
