#!/usr/bin/env node

import process from 'node:process'
import { batchUpdateSheetValues, getSheetValues } from '../lib/google-delegated.js'
import { getFubPerson } from '../lib/fub.js'
import { closeFoundationDb, listFubLeadSourceRules } from '../lib/foundation-db.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const ADMIN_SHEET_TITLE = 'ADMIN ONLY - Deal Data Entry'
const ADMIN_RANGE = `'${ADMIN_SHEET_TITLE}'!A1:CE2000`
const FREEDOM_DEALS_RANGE = "'Data Entry - Clients, Deals, NPS & GReviews'!A6:AF500"
const DEFAULT_FUB_CONTEXT = 'owner'
const DEFAULT_BACKLOG_SINCE = '2025-06-01'
const DEFAULT_BACKLOG_LIMIT = 1
const OPS_BONUS_POLICY_EFFECTIVE_DATE = '2026-04-01'

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

function isQueuedReviewAction(value) {
  const normalized = normalizeLower(value)
  return normalized === 'review this deal' || normalized === 'rerun' || normalized === 'review'
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

function buildFreedomDealMap(rows) {
  const map = new Map()
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const tradeNumber = normalizeText(row[3])
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
  } else {
    lines.push('- No owner-row math issue found in this pass.')
  }

  lines.push('')
  lines.push(buildSummaryLine('FUB', result.fubPassed, result.fubFailed))
  if (result.fubIssues.length) {
    for (const issue of result.fubIssues) lines.push(`- ${issue}`)
  } else {
    lines.push('- No FUB issue found in this pass.')
  }

  lines.push('')
  lines.push(buildSummaryLine(result.followThroughLabel, result.followThroughPassed, result.followThroughFailed))
  if (result.followThroughIssues.length) {
    for (const issue of result.followThroughIssues) lines.push(`- ${issue}`)
  } else if (result.followThroughNotes.length) {
    for (const note of result.followThroughNotes) lines.push(`- ${note}`)
  } else {
    lines.push('- Follow-through source check passed for this trade.')
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
      executed: sheetSerialToIso(row[cols.executed]),
      client: normalizeText(row[cols.client]),
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
      agentPortion: row[cols.agentPortion],
      companyPortion: row[cols.companyPortion],
      fub: normalizeText(row[cols.fub]),
      isaSetDeal: normalizeText(row[cols.isaSetDeal]),
      reviewStatus: normalizeText(row[cols.cc]),
      reviewAction: normalizeText(row[cols.cd]),
    })
    groups.set(deal, existing)
  }
  return groups
}

function getGroupExecutedDate(group) {
  return group.rows.map(row => row.executed).filter(Boolean).sort()[0] || null
}

function getQueuedDeals(groups) {
  return Array.from(groups.values())
    .filter(group => group.rows.some(row => isQueuedReviewAction(row.reviewAction)))
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
      if (excludedDeals.has(item.group.deal)) return false
      if (!isOnOrAfterIso(item.executedDate, cutoff)) return false
      if (item.age == null || item.age < matureDays) return false
      if (item.group.rows.some(row => isQueuedReviewAction(row.reviewAction))) return false
      if (item.group.rows.some(row => isNeedsFixingAction(row.reviewAction))) return false
      return item.group.rows.every(row => isUninspectedReviewStatus(row.reviewStatus))
    })
    .sort((a, b) => {
      if (a.executedDate !== b.executedDate) return b.executedDate.localeCompare(a.executedDate)
      return a.group.deal.localeCompare(b.group.deal)
    })
    .map(item => item.group.deal)
}

function createAuditResult(group, sourceRules, freedomDealMap) {
  const rows = group.rows
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

  const unresolvedSources = rows
    .filter(row => normalizeText(row.source) === '<unspecified>' || !normalizeText(row.source))
    .map(row => row.rowNum)
  if (unresolvedSources.length) {
    ownersFailed += 1
    ownerIssues.push(`lead source is still unresolved on row${unresolvedSources.length > 1 ? 's' : ''} ${unresolvedSources.join(', ')}.`)
  } else {
    ownersPassed += 1
  }

  if (rows.every(row => normalizeText(row.client))) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push('one or more split rows are missing Client Name.')
  }

  if (rows.every(row => normalizeText(row.companyAgent))) {
    ownersPassed += 1
  } else {
    ownersFailed += 1
    ownerIssues.push('one or more split rows are missing Company or Agent.')
  }

  const fubPerson = group.fubPerson || null
  const fubHasIsa = hasFubIsaEvidence(fubPerson)
  for (const row of rows) {
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

      const rowHasIsa = hasRowIsaMarker(row)
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

    const rowHasIsa = hasRowIsaMarker(row)
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

      const mismatchedSourceRows = rows
        .filter(row => normalizeText(row.source) && fubSource && normalizeText(row.source) !== fubSource)
        .map(row => `${row.rowNum} (${normalizeText(row.source)})`)

      if (mismatchedSourceRows.length) {
        fubFailed += 1
        const ownerRules = rows
          .map(row => getSourceRule(sourceRules, row.source))
          .filter(Boolean)
        const sameOwnership = fubSourceRule && ownerRules.length &&
          ownerRules.every(rule => rule.ownershipType === fubSourceRule.ownershipType)
        fubIssues.push(`linked FUB source is ${fubSource}, but Owners source differs on row${mismatchedSourceRows.length > 1 ? 's' : ''} ${mismatchedSourceRows.join(', ')}${sameOwnership ? '; governed ownership matches, so this is lineage cleanup, not a company/agent credit flip.' : '.'}`)
      } else {
        fubPassed += 1
      }

      const staleStages = new Set([
        'Contact - Non Lead/Non Supporter',
        'Lead',
        'Hot Lead/Nurture (0-3)',
        'Warm Nurture (3-6)',
        'Cold Nurture (6-12)',
        'Appointment',
        'Appointment - No Show',
        'Active Client',
        'Conditional Deal',
        'Firm Deal',
      ])

      if (fubStage && staleStages.has(fubStage)) {
        fubFailed += 1
        fubIssues.push(`linked FUB person ${fubPersonId || distinctLinks[0]} is still in ${fubStage}. This deal should be reviewed for closed / past-client cleanup.`)
      } else {
        fubPassed += 1
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
    followThroughLabel = 'Ops Follow-through'
    followThroughPassed += 1
    followThroughNotes.push('Q2 2026 bonus policy moved post-close survey/review accountability out of the old Freedom per-row bonus model for deals executed on or after 2026-04-01.')
    followThroughNotes.push('Do not fail this deal for a missing Freedom NPS/Google-review row; ClickUp Deal Data Entry plus FUB call transcripts are the candidate workflow evidence, but capture-rate audit is not locked as deal-row enforcement yet.')
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
    executed: findIndex(header, 'Date Firm (Executed)'),
    client: findIndex(header, 'Client Name'),
    source: findIndex(header, 'Lead Source (Bonus System For Having This 100% Complete)'),
    realtor: findIndex(header, 'Realtor'),
    total: findIndex(header, 'Total'),
    sale: findIndex(header, 'Sale Price'),
    grossToTeam: findIndex(header, 'Gross To Team'),
    volumeCredit: findIndex(header, 'Volume Credit'),
    commissionCredit: findIndex(header, 'Commission Credit'),
    dealCredit: findIndex(header, 'Deal Credit'),
    netToTeam: findIndex(header, 'Net To Team'),
    agentPortion: findIndex(header, 'Agent Portion'),
    companyPortion: findIndex(header, 'Company/Team Lead Portion'),
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

  const results = dealsRequested.map(deal => createAuditResult(groups.get(deal), sourceRules, freedomDealMap))

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
