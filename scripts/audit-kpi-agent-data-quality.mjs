#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import { listFubLeadSourceRules } from '../lib/foundation-people-sales-db.js'

const LOCAL_KPI_ENV = 'store/kpi-audit.env'
const DEFAULT_WINDOW_DAYS = 90
const DEFAULT_SINCE = '2026-01-01'
const PAGE_SIZE = 1000

const DISCOVERY_OUTCOMES = new Set([
  'No Show',
  'Show - Lost',
  'Show - Back to Nurture',
  'Show - Discovery To Race To Face',
  'Show - Discovery Call To Consultation!',
])

const CONSULT_OUTCOMES = new Set([
  'No Show',
  'Show - Lost',
  'Show - Back to Nurture',
  'Show - Consult - Working with Trial (Not Signed)',
  'Show - Consult - Working With - Signed',
])

const SUPPORT_OUTCOMES = new Set([
  'No Show',
  'Show - Lost',
  'Show - Back to Nurture',
  'Show - Supporter Gained!',
])

const SOI_OUTCOMES = new Set([
  'No Show',
  'Show - Lost',
  'Show - Back to Nurture',
  'Show - SOI/Support Meet Success',
])

const ANY_KNOWN_OUTCOME = new Set([
  ...DISCOVERY_OUTCOMES,
  ...CONSULT_OUTCOMES,
  ...SUPPORT_OUTCOMES,
  ...SOI_OUTCOMES,
])

const INVALID_FINAL_SOURCE_NAMES = new Set([
  '',
  'import',
  '<unspecified>',
  'unspecified',
  'sphere',
  'soi',
])

function parseArgs(argv) {
  const args = {}
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const [key, value] = raw.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function loadLocalEnv(path) {
  if (!fs.existsSync(path)) return false
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key]) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
  return true
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeKey(value) {
  return normalizeLower(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
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

function countFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function supabaseGetAll(path, options = {}) {
  const key = supabaseKey()
  const rows = []
  let total = null
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const range = `${offset}-${offset + PAGE_SIZE - 1}`
    const response = await fetch(`${supabaseBaseUrl()}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        Prefer: options.count ? 'count=exact' : undefined,
        Range: range,
      },
    })
    const text = await response.text()
    if (!response.ok) {
      let message = text
      try {
        const parsed = JSON.parse(text)
        message = parsed.message || parsed.error || text
      } catch {
        // Keep raw response text.
      }
      throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
    }
    if (total == null) total = countFromContentRange(response.headers.get('content-range'))
    const pageRows = text ? JSON.parse(text) : []
    rows.push(...pageRows)
    if (pageRows.length < PAGE_SIZE) break
    if (total != null && rows.length >= total) break
  }
  return { rows, total: total ?? rows.length }
}

function parseDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function compactDate(value) {
  const text = normalizeText(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

function daysBetween(left, right) {
  return Math.abs(right.getTime() - left.getTime()) / 86400000
}

function appointmentDate(row) {
  return (
    parseDate(row.startdate) ||
    parseDate(row.outcomedate) ||
    parseDate(row.createddate) ||
    parseDate(row.recordcreateddate) ||
    parseDate(row.lastupdatedatetime)
  )
}

function appointmentType(row) {
  const explicit = normalizeText(row.appointmenttype)
  if (explicit) return explicit
  if (row.listingdiscoverysetdate || row.listingdiscoveryshowdate || row.listingdiscoverywondate) return 'Listing Discovery Call'
  if (row.buyerdiscoverysetdate || row.buyerdiscoveryshowdate || row.buyerdiscoverywondate) return 'Buyer Discovery Call'
  if (row.listingconsultationsetdate || row.listingconsultationshowdate || row.listingconsultationwondate) return 'Listing Consultation'
  if (row.buyerconsultationsetdate || row.buyerconsultationshowdate || row.buyerconsultationwondate) return 'Buyer Consultation'
  return ''
}

function appointmentFamily(row) {
  const type = normalizeLower(appointmentType(row))
  if (type.includes('buyer') || row.buyerconsultationsetdate || row.buyerdiscoverysetdate) return 'buyer'
  if (type.includes('listing') || row.listingconsultationsetdate || row.listingdiscoverysetdate) return 'listing'
  if (type.includes('support network')) return 'support-network'
  if (type.includes('soi') || type.includes('supporter')) return 'soi'
  return 'unknown'
}

function appointmentPhase(row) {
  const type = normalizeLower(appointmentType(row))
  if (type.includes('discovery')) return 'discovery'
  if (type.includes('consult')) return 'consult'
  if (type.includes('support network')) return 'support-network'
  if (type.includes('soi') || type.includes('supporter')) return 'soi'
  return 'unknown'
}

function allowedOutcomesFor(row) {
  const phase = appointmentPhase(row)
  if (phase === 'discovery') return DISCOVERY_OUTCOMES
  if (phase === 'consult') return CONSULT_OUTCOMES
  if (phase === 'support-network') return SUPPORT_OUTCOMES
  if (phase === 'soi') return SOI_OUTCOMES
  return ANY_KNOWN_OUTCOME
}

function hasMissingOutcome(row) {
  return !normalizeText(row.outcome)
}

function hasNonStandardOutcome(row) {
  const outcome = normalizeText(row.outcome)
  if (!outcome) return false
  return !ANY_KNOWN_OUTCOME.has(outcome)
}

function hasOutcomeTypeMismatch(row) {
  const outcome = normalizeText(row.outcome)
  if (!outcome || !ANY_KNOWN_OUTCOME.has(outcome)) return false
  return !allowedOutcomesFor(row).has(outcome)
}

function getAgentName(userId, userMap) {
  const user = userMap.get(Number(userId))
  if (!user) return userId == null ? 'Unknown' : `User ${userId}`
  return normalizeText(user.username) || normalizeText(user.email) || `User ${user.userid}`
}

function ensureAgent(summary, userId, userMap) {
  const key = String(userId || 'unknown')
  if (!summary.has(key)) {
    summary.set(key, {
      userId: userId == null ? null : Number(userId),
      agentName: getAgentName(userId, userMap),
      appointments: 0,
      missingOutcomes: 0,
      nonStandardOutcomes: 0,
      outcomeTypeMismatches: 0,
      likelyStackClusters: 0,
      appointmentRowsInStacks: 0,
      buySellContextPersons: 0,
      activeLeadStageRows: 0,
      invalidLeadSourceRows: 0,
      importRows: 0,
      unspecifiedRows: 0,
      sphereRows: 0,
      nonCanonicalRows: 0,
      missingSourceRows: 0,
      unclaimedPondRows: 0,
    })
  }
  return summary.get(key)
}

function buildAppointmentStackSignals(appointments, userMap, windowDays) {
  const byPerson = new Map()
  for (const row of appointments) {
    if (!row.personid) continue
    const date = appointmentDate(row)
    if (!date) continue
    const key = String(row.personid)
    const list = byPerson.get(key) || []
    list.push({ row, date, family: appointmentFamily(row), typeKey: normalizeKey(appointmentType(row)) || 'unknown' })
    byPerson.set(key, list)
  }

  const likelyStackClusters = []
  const buySellContext = []

  for (const [personId, items] of byPerson.entries()) {
    if (items.length < 2) continue
    items.sort((a, b) => a.date - b.date)

    const families = new Set(items.map(item => item.family).filter(item => item === 'buyer' || item === 'listing'))
    if (families.has('buyer') && families.has('listing')) {
      const first = items[0]
      const last = items[items.length - 1]
      if (daysBetween(first.date, last.date) <= windowDays) {
        buySellContext.push({
          personId: Number(personId),
          appointmentCount: items.length,
          firstDate: compactDate(first.date.toISOString()),
          lastDate: compactDate(last.date.toISOString()),
          primaryAgent: getAgentName(first.row.userid, userMap),
          userId: first.row.userid == null ? null : Number(first.row.userid),
        })
      }
    }

    const byType = new Map()
    for (const item of items) {
      const list = byType.get(item.typeKey) || []
      list.push(item)
      byType.set(item.typeKey, list)
    }

    for (const [typeKey, typedItems] of byType.entries()) {
      if (typedItems.length < 2) continue
      typedItems.sort((a, b) => a.date - b.date)
      let start = 0
      while (start < typedItems.length - 1) {
        let end = start + 1
        while (end < typedItems.length && daysBetween(typedItems[start].date, typedItems[end].date) <= windowDays) {
          end += 1
        }
        const cluster = typedItems.slice(start, end)
        if (cluster.length >= 2) {
          const first = cluster[0]
          const last = cluster[cluster.length - 1]
          likelyStackClusters.push({
            personId: Number(personId),
            typeKey,
            appointmentType: appointmentType(first.row) || 'Unknown',
            appointmentCount: cluster.length,
            firstDate: compactDate(first.date.toISOString()),
            lastDate: compactDate(last.date.toISOString()),
            primaryAgent: getAgentName(first.row.userid, userMap),
            userId: first.row.userid == null ? null : Number(first.row.userid),
            appointmentIds: cluster.map(item => item.row.appointmentid).filter(Boolean).slice(0, 12),
          })
          start = end
        } else {
          start += 1
        }
      }
    }
  }

  return { likelyStackClusters, buySellContext }
}

function sourceProblem(row, ruleMap) {
  const source = normalizeText(row.source)
  const sourceKey = normalizeLower(source)
  const rule = ruleMap.get(sourceKey)
  if (!source) return { code: 'missing_source', invalid: true, rule: null }
  if (INVALID_FINAL_SOURCE_NAMES.has(sourceKey)) return { code: sourceKey.replace(/[<>]/g, '') || 'missing_source', invalid: true, rule: rule || null }
  if (!rule) return { code: 'not_in_governed_fub_rules', invalid: true, rule: null }
  if (normalizeLower(rule.flagState) !== 'none') return { code: `flag_${normalizeLower(rule.flagState)}`, invalid: true, rule }
  if (normalizeLower(rule.sourceGroup) === 'invalid_or_unknown') return { code: 'invalid_or_unknown_group', invalid: true, rule }
  return { code: '', invalid: false, rule }
}

function rankAgents(agentSummary, primaryKey, limit) {
  return Array.from(agentSummary.values())
    .sort((a, b) => {
      const delta = (b[primaryKey] || 0) - (a[primaryKey] || 0)
      if (delta) return delta
      return a.agentName.localeCompare(b.agentName)
    })
    .slice(0, limit)
}

function countBy(rows, getter) {
  const counts = new Map()
  for (const row of rows) {
    const key = normalizeText(getter(row)) || '<blank>'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const windowDays = Math.max(1, Number(args.windowDays || DEFAULT_WINDOW_DAYS) || DEFAULT_WINDOW_DAYS)
  const since = normalizeText(args.since || DEFAULT_SINCE)
  const topLimit = Math.max(0, Number(args.topLimit ?? 10) || 0)
  const sampleLimit = Math.max(0, Number(args.sampleLimit ?? 12) || 0)
  loadLocalEnv(LOCAL_KPI_ENV)

  const baseUrl = supabaseBaseUrl()
  const host = new URL(baseUrl).host

  const stages = (await supabaseGetAll('stages?select=stageid,stagedescription,leadstage,clientstage&order=stageid.asc')).rows
  const leadStageIds = stages.filter(row => row.leadstage).map(row => Number(row.stageid)).filter(Number.isFinite)
  const leadStageFilter = `currentstageid=in.(${leadStageIds.join(',')})`

  const [
    usersResult,
    appointmentsResult,
    activeLeadStagePersonsResult,
    sourceRules,
  ] = await Promise.all([
    supabaseGetAll('users?select=userid,username,email,active&order=username.asc'),
    supabaseGetAll([
      'appointments?select=appointmentid,personid,userid,appointmenttype,outcome,outcomedate,startdate,enddate,createddate,recordcreateddate,lastupdatedatetime,deleteddate,listingdiscoverysetdate,listingdiscoveryshowdate,listingdiscoverywondate,buyerdiscoverysetdate,buyerdiscoveryshowdate,buyerdiscoverywondate,listingconsultationsetdate,listingconsultationshowdate,listingconsultationwondate,buyerconsultationsetdate,buyerconsultationshowdate,buyerconsultationwondate',
      'deleteddate=is.null',
      'order=personid.asc',
    ].join('&'), { count: true }),
    supabaseGetAll([
      'persons?select=pid,personid,userid,currentstageid,currentstage,source,leaddate,leadclaimeddate,leaddeleteddate,active,deleteddate,lastupdatedatetime',
      'active=eq.true',
      'deleteddate=is.null',
      leadStageFilter,
      'order=userid.asc',
    ].join('&'), { count: true }),
    listFubLeadSourceRules(),
  ])

  const userMap = new Map(usersResult.rows.map(row => [Number(row.userid), row]))
  const ruleMap = new Map(sourceRules.map(rule => [normalizeLower(rule.source), rule]))
  const agentSummary = new Map()

  const appointments = appointmentsResult.rows
  const sinceDate = parseDate(since)
  const recentAppointments = sinceDate
    ? appointments.filter(row => {
        const date = appointmentDate(row)
        return date && date >= sinceDate
      })
    : appointments

  for (const row of appointments) {
    const agent = ensureAgent(agentSummary, row.userid, userMap)
    agent.appointments += 1
    if (hasMissingOutcome(row)) agent.missingOutcomes += 1
    if (hasNonStandardOutcome(row)) agent.nonStandardOutcomes += 1
    if (hasOutcomeTypeMismatch(row)) agent.outcomeTypeMismatches += 1
  }

  const { likelyStackClusters, buySellContext } = buildAppointmentStackSignals(recentAppointments, userMap, windowDays)
  for (const cluster of likelyStackClusters) {
    const agent = ensureAgent(agentSummary, cluster.userId, userMap)
    agent.likelyStackClusters += 1
    agent.appointmentRowsInStacks += cluster.appointmentCount
  }
  const buySellByAgent = new Set()
  for (const item of buySellContext) {
    const agent = ensureAgent(agentSummary, item.userId, userMap)
    const key = `${item.userId || 'unknown'}:${item.personId}`
    if (!buySellByAgent.has(key)) {
      agent.buySellContextPersons += 1
      buySellByAgent.add(key)
    }
  }

  const persons = activeLeadStagePersonsResult.rows
  const sourceProblems = []
  for (const row of persons) {
    const agent = ensureAgent(agentSummary, row.userid, userMap)
    agent.activeLeadStageRows += 1
    if (Number(row.userid) === 22) agent.unclaimedPondRows += 1
    const problem = sourceProblem(row, ruleMap)
    if (!problem.invalid) continue
    sourceProblems.push({ row, problem })
    agent.invalidLeadSourceRows += 1
    const sourceKey = normalizeLower(row.source)
    if (sourceKey === 'import') agent.importRows += 1
    if (sourceKey === '<unspecified>' || sourceKey === 'unspecified') agent.unspecifiedRows += 1
    if (sourceKey === 'sphere') agent.sphereRows += 1
    if (!normalizeText(row.source)) agent.missingSourceRows += 1
    if (normalizeLower(problem.rule?.flagState) !== 'none') agent.nonCanonicalRows += 1
  }

  const output = {
    generatedAt: new Date().toISOString(),
    scope: 'read-only KPI appointment and lead-source data-quality audit',
    connectorProof: {
      kpiSupabaseProject: host,
      fubLeadSourceRules: `${sourceRules.length} governed rules loaded from AIOS Postgres`,
    },
    settings: {
      appointmentStackWindowDays: windowDays,
      appointmentStackSince: since || null,
      topLimit,
      sampleLimit,
    },
    totals: {
      users: usersResult.rows.length,
      leadStageIds,
      activeAppointments: appointments.length,
      recentAppointmentsForStacking: recentAppointments.length,
      missingAppointmentOutcomes: appointments.filter(hasMissingOutcome).length,
      nonStandardAppointmentOutcomes: appointments.filter(hasNonStandardOutcome).length,
      outcomeTypeMismatches: appointments.filter(hasOutcomeTypeMismatch).length,
      likelySameTypeStackClusters: likelyStackClusters.length,
      appointmentRowsInLikelyStacks: likelyStackClusters.reduce((sum, item) => sum + item.appointmentCount, 0),
      buySellContextPersons: buySellContext.length,
      activeLeadStagePersons: persons.length,
      invalidLeadSourceRows: sourceProblems.length,
      pondUnclaimedLeadStageRows: persons.filter(row => Number(row.userid) === 22).length,
    },
    appointmentBreakdowns: {
      byType: countBy(appointments, appointmentType).slice(0, 20),
      byOutcome: countBy(appointments, row => row.outcome).slice(0, 20),
      nonStandardOutcomes: countBy(appointments.filter(hasNonStandardOutcome), row => row.outcome).slice(0, 20),
      outcomeTypeMismatches: countBy(appointments.filter(hasOutcomeTypeMismatch), row => row.outcome).slice(0, 20),
    },
    leadSourceBreakdowns: {
      invalidBySource: countBy(sourceProblems, item => item.row.source).slice(0, 25),
      invalidByStage: countBy(sourceProblems, item => item.row.currentstage).slice(0, 20),
      invalidByProblem: countBy(sourceProblems, item => item.problem.code).slice(0, 20),
    },
    topAgents: {
      missingOutcomes: rankAgents(agentSummary, 'missingOutcomes', topLimit),
      likelyAppointmentStacks: rankAgents(agentSummary, 'likelyStackClusters', topLimit),
      invalidLeadSources: rankAgents(agentSummary, 'invalidLeadSourceRows', topLimit),
      unclaimedPondRows: rankAgents(agentSummary, 'unclaimedPondRows', topLimit),
    },
    sampleSignals: {
      likelyAppointmentStacks: likelyStackClusters.slice(0, sampleLimit),
      buySellContext: buySellContext.slice(0, sampleLimit),
      invalidLeadSources: sourceProblems.slice(0, sampleLimit).map(item => ({
        pid: item.row.pid,
        personId: item.row.personid,
        userId: item.row.userid,
        agentName: getAgentName(item.row.userid, userMap),
        source: normalizeText(item.row.source) || '<blank>',
        currentStage: item.row.currentstage,
        problem: item.problem.code,
        leadDate: compactDate(item.row.leaddate),
        leadClaimedDate: compactDate(item.row.leadclaimeddate),
        lastUpdated: compactDate(item.row.lastupdatedatetime),
      })),
    },
    nextRulesToBuild: [
      'Turn invalid/generic lead sources into guided FUB correction prompts, not generic warnings.',
      'Treat close same-person appointments as questions, with buy+sell and multiple-property exceptions.',
      'Route source/stage/contact hygiene writes to FUB first; reserve KPI-native writes for goals and Shopping List.',
    ],
  }

  console.log(JSON.stringify(output, null, 2))
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
