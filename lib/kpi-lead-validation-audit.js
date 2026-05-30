import { listFubLeadSourceRules } from './foundation-people-sales-db.js'
import { getKpiCredential, loadKpiLocalEnv, normalizeKpiSupabaseUrl } from './kpi-health.js'

export const KPI_LEAD_VALIDATION_CARD_ID = 'KPI-LEAD-VALIDATION-001'
export const KPI_LEAD_VALIDATION_CLOSEOUT_KEY = 'kpi-lead-validation-v1'
export const KPI_LEAD_VALIDATION_PLAN_PATH = 'docs/process/kpi-lead-validation-001-plan.md'
export const KPI_LEAD_VALIDATION_APPROVAL_PATH = 'docs/process/approvals/KPI-LEAD-VALIDATION-001.json'
export const KPI_LEAD_VALIDATION_SCRIPT_PATH = 'scripts/process-kpi-lead-validation-check.mjs'
export const KPI_LEAD_VALIDATION_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-kpi-lead-validation-closeout.md'
export const KPI_LEAD_VALIDATION_NEXT_CARD_ID = 'INTEL-THREAD-CONTEXT-001'
export const KPI_LEAD_VALIDATION_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'
export const KPI_LEAD_VALIDATION_SOURCE_ID = 'SRC-SUPABASE-001'
export const KPI_LEAD_VALIDATION_FUB_SOURCE_ID = 'SRC-FUB-001'
export const KPI_LEAD_VALIDATION_PAGE_SIZE = 1000
export const KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID = 22

export const KPI_LEAD_VALIDATION_CHANGED_FILES = [
  'lib/kpi-lead-validation-audit.js',
  'scripts/process-kpi-lead-validation-check.mjs',
  'package.json',
  'docs/process/kpi-lead-validation-001-plan.md',
  'docs/process/approvals/KPI-LEAD-VALIDATION-001.json',
  'docs/handoffs/2026-05-20-kpi-lead-validation-closeout.md',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
]

export const KPI_LEAD_VALIDATION_PROOF_COMMANDS = [
  'node --check lib/kpi-lead-validation-audit.js scripts/process-kpi-lead-validation-check.mjs',
  'npm run process:kpi-lead-validation-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=KPI-LEAD-VALIDATION-001 --closeoutKey=kpi-lead-validation-v1',
  'npm run process:foundation-ship -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --commitRef=HEAD',
]

export const KPI_LEAD_VALIDATION_NOT_NEXT_BOUNDARIES = [
  'No KPI/FUB writes or source-system mutation.',
  'No FUB cleanup/apply workflow or agent-facing correction queue.',
  'No person-level tracked report artifacts.',
  'No appointment-quality implementation; KPI-APPT-QUALITY-001 owns appointment outcome and stack proof.',
  'No Shopping List discipline implementation; KPI-SHOPPING-001 remains separate.',
  'No broad KPI dashboard rebuild.',
  'No MEETING-VAULT-ACL-001 Phase B.',
  'No Google Drive permissions mutation.',
  'No external sends, credential/key rotation, Drive permission mutation, provider calls, or browser-auth work.',
]

const INVALID_FINAL_SOURCE_NAMES = new Set([
  '',
  'import',
  '<unspecified>',
  'unspecified',
  'sphere',
  'soi',
])

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function compactDate(value) {
  const text = normalizeText(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

function countFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function supabaseGetAll({ baseUrl, credential, path, count = false }) {
  const rows = []
  let total = null
  for (let offset = 0; ; offset += KPI_LEAD_VALIDATION_PAGE_SIZE) {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: credential,
        Authorization: `Bearer ${credential}`,
        Accept: 'application/json',
        Prefer: count ? 'count=exact' : undefined,
        Range: `${offset}-${offset + KPI_LEAD_VALIDATION_PAGE_SIZE - 1}`,
      },
    })
    const body = await response.text()
    if (!response.ok) {
      let message = body
      try {
        const parsed = JSON.parse(body)
        message = parsed.message || parsed.error || body
      } catch {
        // Keep raw response body.
      }
      throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
    }
    if (total == null) total = countFromContentRange(response.headers.get('content-range'))
    const pageRows = body ? JSON.parse(body) : []
    rows.push(...pageRows)
    if (pageRows.length < KPI_LEAD_VALIDATION_PAGE_SIZE) break
    if (total != null && rows.length >= total) break
  }
  return { rows, total: total ?? rows.length }
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
      activeLeadStageRows: 0,
      invalidLeadSourceRows: 0,
      importRows: 0,
      unspecifiedRows: 0,
      sphereRows: 0,
      soiRows: 0,
      notInGovernedRulesRows: 0,
      flaggedRuleRows: 0,
      invalidGroupRows: 0,
      missingSourceRows: 0,
      unclaimedPondRows: 0,
    })
  }
  return summary.get(key)
}

export function buildLeadSourceRuleMap(sourceRules = []) {
  return new Map(sourceRules.map(rule => [normalizeLower(rule.source), rule]))
}

export function classifyLeadSource(row = {}, ruleMap = new Map()) {
  const source = normalizeText(row.source)
  const sourceKey = normalizeLower(source)
  const rule = ruleMap.get(sourceKey)
  if (!source) return { code: 'missing_source', invalid: true, source, rule: null }
  if (INVALID_FINAL_SOURCE_NAMES.has(sourceKey)) {
    return {
      code: sourceKey.replace(/[<>]/g, '') || 'missing_source',
      invalid: true,
      source,
      rule: rule || null,
    }
  }
  if (!rule) return { code: 'not_in_governed_fub_rules', invalid: true, source, rule: null }
  if (normalizeLower(rule.flagState) !== 'none') {
    return { code: `flag_${normalizeLower(rule.flagState)}`, invalid: true, source, rule }
  }
  if (normalizeLower(rule.sourceGroup) === 'invalid_or_unknown') {
    return { code: 'invalid_or_unknown_group', invalid: true, source, rule }
  }
  return { code: '', invalid: false, source, rule }
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

function rankAgents(agentSummary, primaryKey, limit) {
  return Array.from(agentSummary.values())
    .sort((a, b) => {
      const delta = (b[primaryKey] || 0) - (a[primaryKey] || 0)
      if (delta) return delta
      return a.agentName.localeCompare(b.agentName)
    })
    .slice(0, limit)
}

export function buildKpiLeadValidationAudit({
  users = [],
  persons = [],
  stages = [],
  sourceRules = [],
  sourceHost = '',
  topLimit = 10,
  sampleLimit = 12,
  generatedAt = new Date().toISOString(),
} = {}) {
  const userMap = new Map(users.map(row => [Number(row.userid), row]))
  const ruleMap = buildLeadSourceRuleMap(sourceRules)
  const agentSummary = new Map()
  const sourceProblems = []

  for (const row of persons) {
    const agent = ensureAgent(agentSummary, row.userid, userMap)
    agent.activeLeadStageRows += 1
    if (Number(row.userid) === KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID) agent.unclaimedPondRows += 1
    const problem = classifyLeadSource(row, ruleMap)
    if (!problem.invalid) continue
    sourceProblems.push({ row, problem })
    agent.invalidLeadSourceRows += 1
    const sourceKey = normalizeLower(row.source)
    if (sourceKey === 'import') agent.importRows += 1
    if (sourceKey === '<unspecified>' || sourceKey === 'unspecified') agent.unspecifiedRows += 1
    if (sourceKey === 'sphere') agent.sphereRows += 1
    if (sourceKey === 'soi') agent.soiRows += 1
    if (!normalizeText(row.source)) agent.missingSourceRows += 1
    if (problem.code === 'not_in_governed_fub_rules') agent.notInGovernedRulesRows += 1
    if (normalizeLower(problem.rule?.flagState) !== 'none') agent.flaggedRuleRows += 1
    if (normalizeLower(problem.rule?.sourceGroup) === 'invalid_or_unknown') agent.invalidGroupRows += 1
  }

  const leadStageIds = stages
    .filter(row => row.leadstage)
    .map(row => Number(row.stageid))
    .filter(Number.isFinite)

  const invalidBySource = countBy(sourceProblems, item => item.row.source)
  const invalidByProblem = countBy(sourceProblems, item => item.problem.code)

  return {
    generatedAt,
    scope: 'read-only KPI/FUB lead-source validation audit',
    sourceIds: [KPI_LEAD_VALIDATION_SOURCE_ID, KPI_LEAD_VALIDATION_FUB_SOURCE_ID],
    readOnly: true,
    writesSourceSystems: false,
    connectorProof: {
      kpiSupabaseProject: sourceHost,
      fubLeadSourceRules: `${sourceRules.length} governed rules loaded from AIOS Postgres`,
    },
    settings: {
      topLimit,
      sampleLimit,
      unclaimedPondUserId: KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID,
    },
    totals: {
      users: users.length,
      leadStageIds,
      activeLeadStagePersons: persons.length,
      invalidLeadSourceRows: sourceProblems.length,
      genericInvalidRows: sourceProblems.filter(item => INVALID_FINAL_SOURCE_NAMES.has(normalizeLower(item.row.source))).length,
      importRows: sourceProblems.filter(item => normalizeLower(item.row.source) === 'import').length,
      unspecifiedRows: sourceProblems.filter(item => ['<unspecified>', 'unspecified'].includes(normalizeLower(item.row.source))).length,
      sphereRows: sourceProblems.filter(item => normalizeLower(item.row.source) === 'sphere').length,
      soiRows: sourceProblems.filter(item => normalizeLower(item.row.source) === 'soi').length,
      missingSourceRows: sourceProblems.filter(item => !normalizeText(item.row.source)).length,
      notInGovernedRulesRows: sourceProblems.filter(item => item.problem.code === 'not_in_governed_fub_rules').length,
      flaggedRuleRows: sourceProblems.filter(item => normalizeLower(item.problem.rule?.flagState) !== 'none').length,
      invalidGroupRows: sourceProblems.filter(item => normalizeLower(item.problem.rule?.sourceGroup) === 'invalid_or_unknown').length,
      pondUnclaimedLeadStageRows: persons.filter(row => Number(row.userid) === KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID).length,
    },
    leadSourceBreakdowns: {
      invalidBySource: invalidBySource.slice(0, 25),
      invalidByStage: countBy(sourceProblems, item => item.row.currentstage).slice(0, 20),
      invalidByProblem: invalidByProblem.slice(0, 20),
    },
    topAgents: {
      invalidLeadSources: rankAgents(agentSummary, 'invalidLeadSourceRows', topLimit),
      importRows: rankAgents(agentSummary, 'importRows', topLimit),
      unspecifiedRows: rankAgents(agentSummary, 'unspecifiedRows', topLimit),
      unclaimedPondRows: rankAgents(agentSummary, 'unclaimedPondRows', topLimit),
    },
    sampleSignals: {
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
      'Turn invalid/generic lead sources into guided FUB correction prompts only after a separate apply/coaching card.',
      'Treat Import, <unspecified>, generic Sphere/SOI, blank, and ungoverned labels as validation questions, not final attribution truth.',
      'Route source/stage/contact hygiene writes to FUB first; reserve KPI-native writes for goals and Shopping List.',
    ],
  }
}

export async function fetchLiveKpiLeadValidationAudit({
  topLimit = 10,
  sampleLimit = 12,
} = {}) {
  loadKpiLocalEnv()
  const baseUrl = normalizeKpiSupabaseUrl(process.env.SUPABASE_URL)
  const credential = getKpiCredential()
  const host = new URL(baseUrl).host

  const stagesResult = await supabaseGetAll({
    baseUrl,
    credential,
    path: 'stages?select=stageid,stagedescription,leadstage,clientstage&order=stageid.asc',
  })
  const leadStageIds = stagesResult.rows
    .filter(row => row.leadstage)
    .map(row => Number(row.stageid))
    .filter(Number.isFinite)
  const leadStageFilter = `currentstageid=in.(${leadStageIds.join(',')})`

  const [usersResult, personsResult, sourceRules] = await Promise.all([
    supabaseGetAll({
      baseUrl,
      credential,
      path: 'users?select=userid,username,email,active&order=username.asc',
    }),
    supabaseGetAll({
      baseUrl,
      credential,
      path: [
        'persons?select=pid,personid,userid,currentstageid,currentstage,source,leaddate,leadclaimeddate,leaddeleteddate,active,deleteddate,lastupdatedatetime',
        'active=eq.true',
        'deleteddate=is.null',
        leadStageFilter,
        'order=userid.asc',
      ].join('&'),
      count: true,
    }),
    listFubLeadSourceRules(),
  ])

  return buildKpiLeadValidationAudit({
    users: usersResult.rows,
    persons: personsResult.rows,
    stages: stagesResult.rows,
    sourceRules,
    sourceHost: host,
    topLimit,
    sampleLimit,
  })
}

export function evaluateKpiLeadValidationAudit(audit = {}) {
  const totals = audit.totals || {}
  const invalidByProblem = audit.leadSourceBreakdowns?.invalidByProblem || []
  const invalidProblemKeys = new Set(invalidByProblem.map(item => item.key))
  const checks = [
    {
      ok: audit.readOnly === true && audit.writesSourceSystems === false,
      check: 'audit is explicitly read-only',
      detail: `readOnly=${audit.readOnly} writes=${audit.writesSourceSystems}`,
    },
    {
      ok: (audit.sourceIds || []).includes(KPI_LEAD_VALIDATION_SOURCE_ID) && (audit.sourceIds || []).includes(KPI_LEAD_VALIDATION_FUB_SOURCE_ID),
      check: 'audit declares KPI and FUB source IDs',
      detail: (audit.sourceIds || []).join(', '),
    },
    {
      ok: Number(totals.activeLeadStagePersons || 0) > 1000,
      check: 'audit reads real active lead-stage person rows',
      detail: String(totals.activeLeadStagePersons || 0),
    },
    {
      ok: Number(totals.invalidLeadSourceRows || 0) > 0,
      check: 'audit surfaces invalid lead-source rows',
      detail: String(totals.invalidLeadSourceRows || 0),
    },
    {
      ok: Number(totals.importRows || 0) > 0 && Number(totals.unspecifiedRows || 0) > 0 && Number(totals.sphereRows || 0) > 0,
      check: 'audit catches Import, unspecified, and Sphere generic source rows',
      detail: `import=${totals.importRows || 0} unspecified=${totals.unspecifiedRows || 0} sphere=${totals.sphereRows || 0}`,
    },
    {
      ok: invalidProblemKeys.has('import') && invalidProblemKeys.has('unspecified') && invalidProblemKeys.has('sphere'),
      check: 'audit breaks invalid rows down by problem code',
      detail: Array.from(invalidProblemKeys).join(', '),
    },
    {
      ok: Number(totals.pondUnclaimedLeadStageRows || 0) > 0,
      check: 'audit surfaces unclaimed pond lead-stage context',
      detail: String(totals.pondUnclaimedLeadStageRows || 0),
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    checks,
    failures,
    summary: {
      activeLeadStagePersons: Number(totals.activeLeadStagePersons || 0),
      invalidLeadSourceRows: Number(totals.invalidLeadSourceRows || 0),
      importRows: Number(totals.importRows || 0),
      unspecifiedRows: Number(totals.unspecifiedRows || 0),
      sphereRows: Number(totals.sphereRows || 0),
      notInGovernedRulesRows: Number(totals.notInGovernedRulesRows || 0),
      pondUnclaimedLeadStageRows: Number(totals.pondUnclaimedLeadStageRows || 0),
    },
  }
}

export function buildKpiLeadValidationDogfoodProof() {
  const users = [
    { userid: 1, username: 'Valid Agent' },
    { userid: KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID, username: 'Benson Crew Assistant' },
  ]
  const stages = [
    { stageid: 2, stagedescription: 'Lead', leadstage: true },
    { stageid: 9, stagedescription: 'Closed', leadstage: false },
  ]
  const sourceRules = [
    { source: 'Google PPC', flagState: 'none', sourceGroup: 'paid_search' },
    { source: 'Review Me', flagState: 'review', sourceGroup: 'review' },
    { source: 'Invalid Bucket', flagState: 'none', sourceGroup: 'invalid_or_unknown' },
  ]
  const persons = [
    { personid: 1, userid: 1, currentstage: 'Lead', source: 'Google PPC' },
    { personid: 2, userid: 1, currentstage: 'Lead', source: 'Import' },
    { personid: 3, userid: 1, currentstage: 'Lead', source: '<unspecified>' },
    { personid: 4, userid: 1, currentstage: 'Lead', source: 'Sphere' },
    { personid: 5, userid: 1, currentstage: 'Lead', source: '' },
    { personid: 6, userid: 1, currentstage: 'Lead', source: 'Unknown Source' },
    { personid: 7, userid: 1, currentstage: 'Lead', source: 'Review Me' },
    { personid: 8, userid: 1, currentstage: 'Lead', source: 'Invalid Bucket' },
    { personid: 9, userid: KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID, currentstage: 'Lead', source: '<unspecified>' },
  ]
  const audit = buildKpiLeadValidationAudit({
    users,
    persons,
    stages,
    sourceRules,
    sourceHost: 'synthetic.supabase.co',
    topLimit: 5,
    sampleLimit: 0,
    generatedAt: '2026-05-20T00:00:00.000Z',
  })
  const evaluation = evaluateKpiLeadValidationAudit({
    ...audit,
    totals: {
      ...audit.totals,
      activeLeadStagePersons: 2001,
    },
  })
  const invalidByProblem = new Set(audit.leadSourceBreakdowns.invalidByProblem.map(item => item.key))
  const summary = {
    importDetected: invalidByProblem.has('import'),
    unspecifiedDetected: invalidByProblem.has('unspecified'),
    sphereDetected: invalidByProblem.has('sphere'),
    missingSourceDetected: invalidByProblem.has('missing_source'),
    notInRulesDetected: invalidByProblem.has('not_in_governed_fub_rules'),
    flaggedRuleDetected: invalidByProblem.has('flag_review'),
    invalidGroupDetected: invalidByProblem.has('invalid_or_unknown_group'),
    unclaimedPondDetected: audit.totals.pondUnclaimedLeadStageRows > 0,
    sampleFree: audit.sampleSignals.invalidLeadSources.length === 0,
  }
  const ok = evaluation.ok &&
    Object.values(summary).every(Boolean) &&
    audit.totals.invalidLeadSourceRows === 8
  return {
    ok,
    mode: 'kpi-lead-validation-dogfood',
    summary,
    audit,
    evaluation,
  }
}
