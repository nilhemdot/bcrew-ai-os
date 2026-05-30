import { getKpiCredential, loadKpiLocalEnv, normalizeKpiSupabaseUrl } from './kpi-health.js'

export const KPI_APPT_QUALITY_CARD_ID = 'KPI-APPT-QUALITY-001'
export const KPI_APPT_QUALITY_CLOSEOUT_KEY = 'kpi-appt-quality-v1'
export const KPI_APPT_QUALITY_PLAN_PATH = 'docs/process/kpi-appt-quality-001-plan.md'
export const KPI_APPT_QUALITY_APPROVAL_PATH = 'docs/process/approvals/KPI-APPT-QUALITY-001.json'
export const KPI_APPT_QUALITY_SCRIPT_PATH = 'scripts/process-kpi-appt-quality-check.mjs'
export const KPI_APPT_QUALITY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-kpi-appt-quality-closeout.md'
export const KPI_APPT_QUALITY_NEXT_CARD_ID = 'KPI-LEAD-VALIDATION-001'
export const KPI_APPT_QUALITY_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'
export const KPI_APPT_QUALITY_SOURCE_ID = 'SRC-SUPABASE-001'
export const KPI_APPT_QUALITY_DEFAULT_WINDOW_DAYS = 90
export const KPI_APPT_QUALITY_PAGE_SIZE = 1000

export const KPI_APPT_QUALITY_CHANGED_FILES = [
  'lib/kpi-appointment-quality-audit.js',
  'scripts/process-kpi-appt-quality-check.mjs',
  'package.json',
  'docs/process/kpi-appt-quality-001-plan.md',
  'docs/process/approvals/KPI-APPT-QUALITY-001.json',
  'docs/_archive/handoffs/2026-05-20-kpi-appt-quality-closeout.md',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
]

export const KPI_APPT_QUALITY_PROOF_COMMANDS = [
  'node --check lib/kpi-appointment-quality-audit.js scripts/process-kpi-appt-quality-check.mjs',
  'npm run process:kpi-appt-quality-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=KPI-APPT-QUALITY-001 --closeoutKey=kpi-appt-quality-v1',
  'npm run process:foundation-ship -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --commitRef=HEAD',
]

export const KPI_APPT_QUALITY_NOT_NEXT_BOUNDARIES = [
  'No KPI/FUB writes or source-system mutation.',
  'No agent-facing coaching prompts or apply workflow.',
  'No person-level tracked report artifacts.',
  'No broad KPI dashboard rebuild.',
  'No lead-source validation implementation; continue KPI-LEAD-VALIDATION-001 next.',
  'No MEETING-VAULT-ACL-001 Phase B.',
  'No Google Drive permissions mutation.',
  'No external sends, credential/key rotation, Drive permission mutation, provider calls, or browser-auth work.',
]

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

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeKey(value) {
  return normalizeLower(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
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
    })
  }
  return summary.get(key)
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

export function buildKpiAppointmentQualityPeriod(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now())
  if (Number.isNaN(now.getTime())) throw new Error('KPI appointment quality period requires a valid runtime date.')
  const configuredSince = normalizeText(options.since || process.env.KPI_APPT_QUALITY_SINCE)
  const year = now.getFullYear()
  return {
    mode: configuredSince ? 'configured_since' : 'runtime_current_year',
    since: configuredSince || `${year}-01-01`,
    selectedAt: now.toISOString(),
    timezone: process.env.TZ || 'America/Toronto',
  }
}

export function buildKpiAppointmentQualityAudit({ appointments = [], users = [], options = {} } = {}) {
  const windowDays = Math.max(1, Number(options.windowDays || KPI_APPT_QUALITY_DEFAULT_WINDOW_DAYS) || KPI_APPT_QUALITY_DEFAULT_WINDOW_DAYS)
  const topLimit = Math.max(0, Number(options.topLimit ?? 10) || 0)
  const sampleLimit = Math.max(0, Number(options.sampleLimit ?? 0) || 0)
  const period = buildKpiAppointmentQualityPeriod(options)
  const sinceDate = parseDate(period.since)
  const userMap = new Map(users.map(row => [Number(row.userid), row]))
  const agentSummary = new Map()
  const activeAppointments = appointments.filter(row => !normalizeText(row.deleteddate))
  const recentAppointments = sinceDate
    ? activeAppointments.filter(row => {
        const date = appointmentDate(row)
        return date && date >= sinceDate
      })
    : activeAppointments

  for (const row of activeAppointments) {
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

  const missingOutcomeRows = activeAppointments.filter(hasMissingOutcome)
  const nonStandardOutcomeRows = activeAppointments.filter(hasNonStandardOutcome)
  const outcomeTypeMismatchRows = activeAppointments.filter(hasOutcomeTypeMismatch)

  return {
    generatedAt: new Date().toISOString(),
    cardId: KPI_APPT_QUALITY_CARD_ID,
    sourceId: KPI_APPT_QUALITY_SOURCE_ID,
    scope: 'read-only aggregate KPI appointment quality audit',
    readOnly: true,
    writesSourceSystems: false,
    privacyBoundary: 'Tracked proof and closeout use aggregate counts only. Person-level samples stay out of repo artifacts.',
    period,
    settings: {
      appointmentStackWindowDays: windowDays,
      topLimit,
      sampleLimit,
    },
    totals: {
      users: users.length,
      activeAppointments: activeAppointments.length,
      recentAppointmentsForStacking: recentAppointments.length,
      missingAppointmentOutcomes: missingOutcomeRows.length,
      nonStandardAppointmentOutcomes: nonStandardOutcomeRows.length,
      outcomeTypeMismatches: outcomeTypeMismatchRows.length,
      likelySameTypeStackClusters: likelyStackClusters.length,
      appointmentRowsInLikelyStacks: likelyStackClusters.reduce((sum, item) => sum + item.appointmentCount, 0),
      buySellContextPersons: buySellContext.length,
    },
    appointmentBreakdowns: {
      byType: countBy(activeAppointments, appointmentType).slice(0, 20),
      byOutcome: countBy(activeAppointments, row => row.outcome).slice(0, 20),
      nonStandardOutcomes: countBy(nonStandardOutcomeRows, row => row.outcome).slice(0, 20),
      outcomeTypeMismatches: countBy(outcomeTypeMismatchRows, row => row.outcome).slice(0, 20),
    },
    topAgents: {
      missingOutcomes: rankAgents(agentSummary, 'missingOutcomes', topLimit),
      likelyAppointmentStacks: rankAgents(agentSummary, 'likelyStackClusters', topLimit),
      outcomeTypeMismatches: rankAgents(agentSummary, 'outcomeTypeMismatches', topLimit),
    },
    sampleSignals: {
      likelyAppointmentStacks: likelyStackClusters.slice(0, sampleLimit),
      buySellContext: buySellContext.slice(0, sampleLimit),
    },
    nextRulesToBuild: [
      'Treat close same-person same-type appointments as review questions, not accusations.',
      'Preserve buy/sell and separate-property exception context before coaching or apply work.',
      'Separate non-canonical outcome labels from known labels used against the wrong appointment type.',
    ],
  }
}

function parseTotal(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function supabaseGetAll(path, options = {}) {
  const credential = getKpiCredential()
  const baseUrl = normalizeKpiSupabaseUrl(process.env.SUPABASE_URL || process.env.KPI_SUPABASE_URL)
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const rows = []
  let total = null
  for (let offset = 0; ; offset += KPI_APPT_QUALITY_PAGE_SIZE) {
    const range = `${offset}-${offset + KPI_APPT_QUALITY_PAGE_SIZE - 1}`
    const response = await fetchImpl(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: credential,
        Authorization: `Bearer ${credential}`,
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
      } catch {}
      throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
    }
    if (total == null) total = parseTotal(response.headers.get('content-range'))
    const pageRows = text ? JSON.parse(text) : []
    rows.push(...pageRows)
    if (pageRows.length < KPI_APPT_QUALITY_PAGE_SIZE) break
    if (total != null && rows.length >= total) break
  }
  return { rows, total: total ?? rows.length }
}

export async function fetchLiveKpiAppointmentQualityAudit(options = {}) {
  loadKpiLocalEnv()
  const [usersResult, appointmentsResult] = await Promise.all([
    supabaseGetAll('users?select=userid,username,email,active&order=username.asc', { count: true }),
    supabaseGetAll([
      'appointments?select=appointmentid,personid,userid,appointmenttype,outcome,outcomedate,startdate,enddate,createddate,recordcreateddate,lastupdatedatetime,deleteddate,listingdiscoverysetdate,listingdiscoveryshowdate,listingdiscoverywondate,buyerdiscoverysetdate,buyerdiscoveryshowdate,buyerdiscoverywondate,listingconsultationsetdate,listingconsultationshowdate,listingconsultationwondate,buyerconsultationsetdate,buyerconsultationshowdate,buyerconsultationwondate',
      'deleteddate=is.null',
      'order=personid.asc',
    ].join('&'), { count: true }),
  ])
  const baseUrl = normalizeKpiSupabaseUrl(process.env.SUPABASE_URL || process.env.KPI_SUPABASE_URL)
  return {
    ...buildKpiAppointmentQualityAudit({
      appointments: appointmentsResult.rows,
      users: usersResult.rows,
      options,
    }),
    connectorProof: {
      kpiSupabaseProject: new URL(baseUrl).host,
      userRowsRead: usersResult.rows.length,
      appointmentRowsRead: appointmentsResult.rows.length,
    },
  }
}

export function evaluateKpiAppointmentQualityAudit(audit = {}) {
  const failures = []
  const totals = audit.totals || {}
  if (audit.cardId !== KPI_APPT_QUALITY_CARD_ID) failures.push('wrong_card_id')
  if (audit.sourceId !== KPI_APPT_QUALITY_SOURCE_ID) failures.push('missing_source_id')
  if (audit.readOnly !== true || audit.writesSourceSystems !== false) failures.push('not_read_only')
  if (!audit.period?.since) failures.push('missing_period_since')
  if (!Number.isFinite(Number(totals.activeAppointments)) || Number(totals.activeAppointments) <= 0) failures.push('missing_active_appointments')
  for (const key of [
    'missingAppointmentOutcomes',
    'nonStandardAppointmentOutcomes',
    'outcomeTypeMismatches',
    'likelySameTypeStackClusters',
    'appointmentRowsInLikelyStacks',
    'buySellContextPersons',
  ]) {
    if (!Number.isFinite(Number(totals[key]))) failures.push(`missing_${key}`)
  }
  if (!Array.isArray(audit.appointmentBreakdowns?.byType)) failures.push('missing_type_breakdown')
  if (!Array.isArray(audit.appointmentBreakdowns?.byOutcome)) failures.push('missing_outcome_breakdown')
  if ((audit.sampleSignals?.likelyAppointmentStacks || []).length > Number(audit.settings?.sampleLimit || 0)) failures.push('sample_limit_exceeded')
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    failures,
    summary: {
      activeAppointments: Number(totals.activeAppointments || 0),
      missingAppointmentOutcomes: Number(totals.missingAppointmentOutcomes || 0),
      nonStandardAppointmentOutcomes: Number(totals.nonStandardAppointmentOutcomes || 0),
      outcomeTypeMismatches: Number(totals.outcomeTypeMismatches || 0),
      likelySameTypeStackClusters: Number(totals.likelySameTypeStackClusters || 0),
      appointmentRowsInLikelyStacks: Number(totals.appointmentRowsInLikelyStacks || 0),
      buySellContextPersons: Number(totals.buySellContextPersons || 0),
    },
  }
}

export function buildKpiAppointmentQualityDogfoodProof() {
  const users = [
    { userid: 1, username: 'Agent One' },
    { userid: 2, username: 'Agent Two' },
  ]
  const appointments = [
    {
      appointmentid: 1,
      personid: 100,
      userid: 1,
      appointmenttype: 'Listing Discovery Call',
      outcome: '',
      startdate: '2026-02-01T15:00:00Z',
    },
    {
      appointmentid: 2,
      personid: 101,
      userid: 1,
      appointmenttype: 'Listing Discovery Call',
      outcome: 'Made Up Outcome',
      startdate: '2026-02-02T15:00:00Z',
    },
    {
      appointmentid: 3,
      personid: 102,
      userid: 1,
      appointmenttype: 'Listing Discovery Call',
      outcome: 'Show - Consult - Working With - Signed',
      startdate: '2026-02-03T15:00:00Z',
    },
    {
      appointmentid: 4,
      personid: 103,
      userid: 2,
      appointmenttype: 'Buyer Consultation',
      outcome: 'Show - Lost',
      startdate: '2026-02-04T15:00:00Z',
    },
    {
      appointmentid: 5,
      personid: 103,
      userid: 2,
      appointmenttype: 'Buyer Consultation',
      outcome: 'Show - Back to Nurture',
      startdate: '2026-02-10T15:00:00Z',
    },
    {
      appointmentid: 6,
      personid: 104,
      userid: 2,
      appointmenttype: 'Buyer Discovery Call',
      outcome: 'Show - Discovery Call To Consultation!',
      startdate: '2026-02-05T15:00:00Z',
    },
    {
      appointmentid: 7,
      personid: 104,
      userid: 2,
      appointmenttype: 'Listing Discovery Call',
      outcome: 'Show - Discovery Call To Consultation!',
      startdate: '2026-02-06T15:00:00Z',
    },
  ]
  const audit = buildKpiAppointmentQualityAudit({
    appointments,
    users,
    options: {
      now: '2026-05-20T00:00:00Z',
      since: '2026-01-01',
      windowDays: 90,
      topLimit: 3,
      sampleLimit: 2,
    },
  })
  const evaluation = evaluateKpiAppointmentQualityAudit(audit)
  const checks = [
    audit.totals.missingAppointmentOutcomes === 1,
    audit.totals.nonStandardAppointmentOutcomes === 1,
    audit.totals.outcomeTypeMismatches === 1,
    audit.totals.likelySameTypeStackClusters === 1,
    audit.totals.appointmentRowsInLikelyStacks === 2,
    audit.totals.buySellContextPersons === 1,
    evaluation.ok,
  ]
  return {
    ok: checks.every(Boolean),
    summary: {
      missingOutcomeDetected: audit.totals.missingAppointmentOutcomes === 1,
      nonStandardDetected: audit.totals.nonStandardAppointmentOutcomes === 1,
      mismatchDetected: audit.totals.outcomeTypeMismatches === 1,
      sameTypeStackDetected: audit.totals.likelySameTypeStackClusters === 1,
      buySellExceptionDetected: audit.totals.buySellContextPersons === 1,
      evaluationStatus: evaluation.status,
    },
    audit,
  }
}
