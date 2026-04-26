#!/usr/bin/env node

import process from 'node:process'
import { getSheetValues } from '../lib/google-delegated.js'
import { extractFubPersonId, getFubPerson, getFubUsers } from '../lib/fub.js'
import { getClickUpFieldMap, listClickUpTasks, normalizeClickUpText } from '../lib/clickup.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const OWNERS_ADMIN_RANGE = "'ADMIN ONLY - Deal Data Entry'!A1:CE2000"
const CLICKUP_DEAL_DATA_ENTRY_LIST_ID = process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939'
const DEFAULT_LIMIT = 80

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

function normalizeTradeNumber(value) {
  const text = normalizeText(value).toUpperCase()
  if (!text) return ''
  const explicit = text.match(/T\s*#?\s*(\d{5})\b/)
  if (explicit) return `T#${explicit[1]}`
  const bare = text.match(/\b(\d{5})\b/)
  return bare ? `T#${bare[1]}` : ''
}

function normalizeAddress(value) {
  const replacements = new Map([
    ['street', 'st'],
    ['st.', 'st'],
    ['road', 'rd'],
    ['rd.', 'rd'],
    ['avenue', 'ave'],
    ['ave.', 'ave'],
    ['drive', 'dr'],
    ['dr.', 'dr'],
    ['court', 'ct'],
    ['ct.', 'ct'],
    ['crescent', 'cres'],
    ['cres.', 'cres'],
    ['boulevard', 'blvd'],
    ['blvd.', 'blvd'],
    ['lane', 'ln'],
    ['ln.', 'ln'],
  ])
  return normalizeLower(value)
    .replace(/\b(street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|court|ct\.?|crescent|cres\.?|boulevard|blvd\.?|lane|ln\.?)\b/g, match => replacements.get(match) || match)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findIndex(header, name) {
  return header.findIndex(value => normalizeText(value) === name)
}

function compactDate(value) {
  if (!value) return ''
  const text = normalizeText(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

function valueChanged(left, right) {
  if (!left || !right) return false
  return normalizeLower(left) !== normalizeLower(right)
}

function getRequiredEnv(name) {
  const value = normalizeText(process.env[name])
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function supabaseBaseUrl() {
  return getRequiredEnv('SUPABASE_URL').replace(/\/+$/, '')
}

function supabaseKey() {
  return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

async function supabaseGet(path, options = {}) {
  const key = supabaseKey()
  const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: options.count ? 'count=exact' : undefined,
      Range: options.range || undefined,
    },
  })
  const text = await response.text()
  if (!response.ok) {
    let message = text
    try {
      const parsed = JSON.parse(text)
      message = parsed.message || parsed.error || text
    } catch {
      // Use raw response text.
    }
    throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
  }
  return {
    rows: text ? JSON.parse(text) : [],
    contentRange: response.headers.get('content-range') || '',
  }
}

function countFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

function encodeEq(value) {
  return encodeURIComponent(String(value))
}

async function getKpiPersons(personId) {
  const select = [
    'pid',
    'personid',
    'personuid',
    'userid',
    'currentstageid',
    'currentstage',
    'source',
    'leaddate',
    'leadclaimeddate',
    'leaddeleteddate',
    'active',
    'deleteddate',
    'createddate',
    'lastupdatedatetime',
  ].join(',')
  const path = `persons?select=${select}&personid=eq.${encodeEq(personId)}&order=pid.desc`
  return (await supabaseGet(path)).rows
}

async function countKpiAppointments(personId) {
  const path = `appointments?select=appointmentid&personid=eq.${encodeEq(personId)}`
  const result = await supabaseGet(path, { count: true, range: '0-0' })
  return countFromContentRange(result.contentRange) || result.rows.length
}

async function getKpiDealRows(tradeNumber) {
  const normalized = normalizeTradeNumber(tradeNumber)
  const numeric = normalized.replace(/^T#/, '')
  const select = [
    'id',
    'deal_number',
    'deal_status',
    'client_signed_date',
    'date_firm_executed',
    'expected_closing',
    'expected_cash_deposit',
    'lead_source',
    'company_or_agent',
    'realtor',
    'total',
    'sale_price',
    'gross_to_team',
    'volume_credit',
    'commission_credit',
    'deal_credit',
    'net_to_team',
    'agent_email',
    'updated_at',
  ].join(',')
  const variants = Array.from(new Set([normalized, numeric].filter(Boolean)))
  const rows = []
  for (const variant of variants) {
    const path = `deal_data?select=${select}&deal_number=eq.${encodeEq(variant)}`
    rows.push(...(await supabaseGet(path)).rows)
  }
  const seen = new Set()
  return rows.filter(row => {
    const id = String(row.id || `${row.deal_number}:${row.agent_email}`)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

async function getStages() {
  return (await supabaseGet('stages?select=stageid,stagetype,stagedescription,leadstage,clientstage&order=stageid.asc')).rows
}

async function getKpiUser(userId) {
  const rows = (await supabaseGet(`users?select=userid,username,email,active&userid=eq.${encodeEq(userId)}`)).rows
  return rows[0] || null
}

function parseOwnersRows(rows) {
  const header = rows[0] || []
  const cols = {
    deal: findIndex(header, 'Deal #'),
    status: findIndex(header, 'Deal Status'),
    signed: findIndex(header, 'Client Signed Date'),
    executed: findIndex(header, 'Date Firm (Executed)'),
    expectedClosing: findIndex(header, 'Expected Closing'),
    expectedCash: findIndex(header, 'Expected Cash Deposit'),
    client: findIndex(header, 'Client Name'),
    address: findIndex(header, 'Deal Address'),
    side: findIndex(header, 'Buy / Sell / Referral'),
    source: findIndex(header, 'Lead Source (Bonus System For Having This 100% Complete)'),
    companyAgent: findIndex(header, 'Company or Agent'),
    realtor: findIndex(header, 'Realtor'),
    total: findIndex(header, 'Total'),
    dealCredit: findIndex(header, 'Deal Credit'),
    netToTeam: findIndex(header, 'Net To Team'),
    agentEmail: findIndex(header, 'Agent Email'),
    fub: findIndex(header, 'Client Follow UP Boss ID'),
    isaSetDeal: findIndex(header, 'ISA Set Deal'),
  }
  const groups = new Map()
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    const deal = normalizeTradeNumber(row[cols.deal])
    if (!deal) continue
    const existing = groups.get(deal) || { deal, rows: [] }
    existing.rows.push({
      rowNumber: i + 1,
      deal,
      status: normalizeText(row[cols.status]),
      signed: normalizeText(row[cols.signed]),
      executed: normalizeText(row[cols.executed]),
      expectedClosing: normalizeText(row[cols.expectedClosing]),
      expectedCash: normalizeText(row[cols.expectedCash]),
      side: normalizeText(row[cols.side]),
      source: normalizeText(row[cols.source]),
      companyAgent: normalizeText(row[cols.companyAgent]),
      realtor: normalizeText(row[cols.realtor]),
      address: normalizeText(row[cols.address]),
      addressKey: normalizeAddress(row[cols.address]),
      total: normalizeText(row[cols.total]),
      dealCredit: normalizeText(row[cols.dealCredit]),
      netToTeam: normalizeText(row[cols.netToTeam]),
      agentEmail: normalizeText(row[cols.agentEmail]),
      fubRaw: normalizeText(row[cols.fub]),
      fubPersonId: extractFubPersonId(row[cols.fub]),
      isaSetDeal: normalizeText(row[cols.isaSetDeal]),
    })
    groups.set(deal, existing)
  }
  return Array.from(groups.values())
}

function buildClickUpMaps(tasks) {
  const byDeal = new Map()
  const byAddress = []
  let tasksWithDeal = 0
  for (const task of tasks) {
    const fields = getClickUpFieldMap(task)
    const deal = normalizeTradeNumber(fields.get('Deal #'))
    const record = {
      id: task.id,
      name: normalizeClickUpText(task.name),
      status: normalizeClickUpText(task.status?.status),
      url: normalizeClickUpText(task.url),
      deal,
      addressKeys: [
        task.name,
        fields.get('Deal Address (GPS)'),
        fields.get('Deal Address (REG)'),
        fields.get('Property Address'),
      ]
        .map(value => normalizeAddress(normalizeClickUpText(value)))
        .filter(Boolean),
      fubLink: normalizeClickUpText(fields.get('Follow Up Boss Link')),
      npsStatus: normalizeClickUpText(fields.get('NPS Status')),
      reviewStatus: normalizeClickUpText(fields.get('Review Status')),
      internalDealReviewStatus: normalizeClickUpText(fields.get('Internal Deal Review Status')),
    }
    if (deal) {
      tasksWithDeal += 1
      const existing = byDeal.get(deal) || []
      existing.push(record)
      byDeal.set(deal, existing)
    }
    for (const addressKey of record.addressKeys) {
      if (addressKey.length >= 8) byAddress.push({ addressKey, record })
    }
  }
  return { byDeal, byAddress, tasksWithDeal }
}

function findClickUpByAddress(group, clickUpMaps) {
  const ownerAddresses = Array.from(new Set(group.rows.map(row => row.addressKey).filter(value => value.length >= 8)))
  if (!ownerAddresses.length) return []

  const matches = []
  const seen = new Set()
  for (const ownerAddress of ownerAddresses) {
    for (const candidate of clickUpMaps.byAddress) {
      const clickUpAddress = candidate.addressKey
      if (!clickUpAddress.includes(ownerAddress) && !ownerAddress.includes(clickUpAddress)) continue
      if (seen.has(candidate.record.id)) continue
      seen.add(candidate.record.id)
      matches.push(candidate.record)
    }
  }
  return matches
}

function chooseInterestingGroups(groups, limit) {
  const withFub = groups.filter(group => group.rows.some(row => row.fubPersonId))
  const recent = withFub
    .slice()
    .sort((a, b) => {
      const left = String(a.rows[0]?.executed || '')
      const right = String(b.rows[0]?.executed || '')
      return right.localeCompare(left)
    })
  const manualPriority = ['T#26100']
    .map(deal => groups.find(group => group.deal === deal))
    .filter(Boolean)
  const selected = []
  for (const group of manualPriority.concat(recent)) {
    if (!selected.some(item => item.deal === group.deal)) selected.push(group)
    if (selected.length >= limit) break
  }
  return selected
}

function summarizeProof(proof) {
  const active = proof.kpiPersons.find(row => row.active && !row.deleteddate) || null
  const clickUpTasks = proof.clickUpTasks || []
  const clickUpAddressFallbackTasks = proof.clickUpAddressFallbackTasks || []
  const ownerSources = Array.from(new Set(proof.group.rows.map(row => row.source).filter(Boolean)))
  const ownerRows = proof.group.rows.map(row => row.rowNumber)
  return {
    deal: proof.group.deal,
    ownerRows,
    fubPersonId: proof.fubPersonId,
    ownersSource: ownerSources.join(' | '),
    fubSource: normalizeText(proof.fubPerson?.source),
    kpiSource: normalizeText(active?.source),
    ownersAgent: Array.from(new Set(proof.group.rows.map(row => row.realtor).filter(Boolean))).join(' | '),
    fubAssigned: normalizeText(proof.fubPerson?.assignedTo?.name || proof.fubPerson?.assignedTo?.firstName),
    ownersStatus: Array.from(new Set(proof.group.rows.map(row => row.status).filter(Boolean))).join(' | '),
    fubStage: normalizeText(proof.fubPerson?.stage),
    kpiStage: normalizeText(active?.currentstage),
    activePid: active?.pid || null,
    kpiRowsForPerson: proof.kpiPersons.length,
    reentryEvidence: proof.kpiPersons.length > 1,
    leadDate: compactDate(active?.leaddate),
    leadClaimedDate: compactDate(active?.leadclaimeddate),
    appointments: proof.appointmentCount,
    dealDataRows: proof.dealDataRows.length,
    clickUpTasks: clickUpTasks.length,
    clickUpStatuses: clickUpTasks.map(task => task.status).filter(Boolean).join(' | '),
    clickUpAddressFallbackTasks: clickUpAddressFallbackTasks.length,
    clickUpAddressFallbackStatuses: clickUpAddressFallbackTasks.map(task => task.status).filter(Boolean).join(' | '),
    flags: proof.flags,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const limit = Math.max(1, Number(args.limit) || DEFAULT_LIMIT)

  const [ownersSheet, stages, pondUser, clickUpTasks] = await Promise.all([
    getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, OWNERS_ADMIN_RANGE),
    getStages(),
    getKpiUser(22),
    listClickUpTasks(CLICKUP_DEAL_DATA_ENTRY_LIST_ID, { includeClosed: true }),
  ])

  const ownerGroups = parseOwnersRows(ownersSheet.values || [])
  const clickUpMaps = buildClickUpMaps(clickUpTasks)
  const selectedGroups = chooseInterestingGroups(ownerGroups, limit)
  const leadStages = stages.filter(stage => stage.leadstage)
  const clientStages = stages.filter(stage => stage.clientstage)

  const proofs = []
  for (const group of selectedGroups) {
    const fubIds = Array.from(new Set(group.rows.map(row => row.fubPersonId).filter(Boolean)))
    const fubPersonId = fubIds[0] || ''
    const flags = []
    if (fubIds.length > 1) flags.push('multiple_fub_ids_on_deal')
    let fubPerson = null
    if (fubPersonId) {
      try {
        fubPerson = await getFubPerson('owner', fubPersonId)
      } catch (error) {
        flags.push(`fub_read_failed:${error.message}`)
      }
    } else {
      flags.push('missing_fub_id')
    }

    const [kpiPersons, appointmentCount, dealDataRows] = await Promise.all([
      fubPersonId ? getKpiPersons(fubPersonId) : Promise.resolve([]),
      fubPersonId ? countKpiAppointments(fubPersonId) : Promise.resolve(0),
      getKpiDealRows(group.deal),
    ])
    const active = kpiPersons.find(row => row.active && !row.deleteddate) || null
    const clickUpForDeal = clickUpMaps.byDeal.get(group.deal) || []
    const clickUpAddressFallback = clickUpForDeal.length ? [] : findClickUpByAddress(group, clickUpMaps)

    if (fubPersonId && !kpiPersons.length) flags.push('missing_kpi_person')
    if (fubPerson && active && valueChanged(fubPerson.stage, active.currentstage)) flags.push('fub_kpi_stage_mismatch')
    if (fubPerson && active && valueChanged(fubPerson.source, active.source)) flags.push('fub_kpi_source_mismatch')
    if (fubPerson && group.rows.some(row => valueChanged(row.source, fubPerson.source))) flags.push('owners_fub_source_mismatch')
    if (!clickUpForDeal.length && clickUpAddressFallback.length) flags.push('clickup_task_matches_address_missing_deal_number')
    if (!clickUpForDeal.length && !clickUpAddressFallback.length) flags.push('missing_clickup_deal_task')
    if (!dealDataRows.length) flags.push('missing_kpi_deal_data')
    if (kpiPersons.length > 1) flags.push('multiple_kpi_person_rows_for_fub_person')
    if (active?.leadclaimeddate) flags.push('claimed_or_recycled_lead')

    proofs.push({
      group,
      fubPersonId,
      fubPerson,
      kpiPersons,
      appointmentCount,
      dealDataRows,
      clickUpTasks: clickUpForDeal,
      clickUpAddressFallbackTasks: clickUpAddressFallback,
      flags,
    })
  }

  const summaries = proofs.map(summarizeProof)
  const totals = {
    ownersDealGroups: ownerGroups.length,
    ownersRows: ownerGroups.reduce((sum, group) => sum + group.rows.length, 0),
    ownersGroupsWithFubId: ownerGroups.filter(group => group.rows.some(row => row.fubPersonId)).length,
    ownersGroupsWithClickUpDealNumber: ownerGroups.filter(group => clickUpMaps.byDeal.has(group.deal)).length,
    clickUpTasks: clickUpTasks.length,
    clickUpTasksWithDealNumber: clickUpMaps.tasksWithDeal,
    clickUpUniqueDealNumbers: clickUpMaps.byDeal.size,
    stages: stages.length,
    leadStages: leadStages.length,
    clientStages: clientStages.length,
    auditedGroups: proofs.length,
    auditedWithKpiPerson: proofs.filter(proof => proof.kpiPersons.length).length,
    auditedWithKpiDealData: proofs.filter(proof => proof.dealDataRows.length).length,
    auditedWithClickUpTask: proofs.filter(proof => proof.clickUpTasks.length).length,
    auditedWithClickUpAddressFallback: proofs.filter(proof => proof.clickUpAddressFallbackTasks.length).length,
    auditedWithAppointments: proofs.filter(proof => proof.appointmentCount > 0).length,
    auditedWithReentryEvidence: proofs.filter(proof => proof.kpiPersons.length > 1).length,
    auditedWithLeadClaimedDate: proofs.filter(proof => proof.kpiPersons.some(row => row.active && row.leadclaimeddate)).length,
  }

  const output = {
    generatedAt: new Date().toISOString(),
    scope: 'read-only FUB -> KPI/Supabase -> Owners/Admin -> ClickUp connection audit',
    connectorProof: {
      fubContext: 'owner',
      kpiSupabaseProject: new URL(supabaseBaseUrl()).host,
      ownersSheet: OWNERS_SHEET_ID,
      clickUpDealDataEntryList: CLICKUP_DEAL_DATA_ENTRY_LIST_ID,
    },
    totals,
    pondUser22: pondUser
      ? { found: true, userid: pondUser.userid, username: pondUser.username, active: pondUser.active }
      : { found: false, userid: 22 },
    leadStages: leadStages.map(stage => ({
      stageid: stage.stageid,
      stagedescription: stage.stagedescription,
      clientstage: stage.clientstage,
    })),
    clientStages: clientStages.map(stage => ({
      stageid: stage.stageid,
      stagedescription: stage.stagedescription,
      leadstage: stage.leadstage,
    })),
    sampledProofs: summaries,
    flagCounts: summaries.reduce((acc, proof) => {
      for (const flag of proof.flags) acc[flag] = (acc[flag] || 0) + 1
      return acc
    }, {}),
  }

  console.log(JSON.stringify(output, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
