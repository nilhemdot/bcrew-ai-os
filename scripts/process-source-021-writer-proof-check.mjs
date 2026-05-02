#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'

const FUB_ZAHND_ROOT = '/Users/bensoncrew/.inspection/FUBZahnd'
const KPI_DASHBOARD_ROOT = '/Users/bensoncrew/.inspection/zahnd-team-dashboard'
const SINCE_DATE = '2026-04-27'

function readFile(path) {
  return fs.readFileSync(path, 'utf8')
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
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
      // Keep raw response text.
    }
    throw new Error(`Supabase ${path} returned ${response.status}: ${message}`)
  }
  return {
    rows: text ? JSON.parse(text) : [],
    total: countFromContentRange(response.headers.get('content-range')),
  }
}

async function supabaseCount(path) {
  const result = await supabaseGet(path, { count: true, range: '0-0' })
  return result.total ?? result.rows.length
}

function assertCheck(checks, ok, label, detail) {
  checks.push({ label, ok: Boolean(ok), detail })
}

function printChecks(checks) {
  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL'
    console.log(`${status} ${check.label}: ${check.detail}`)
  }
}

async function main() {
  const checks = []
  const upInsertPerson = readFile(`${FUB_ZAHND_ROOT}/Database/fub/Stored Procedures/up_InsertPerson.sql`)
  const fubProcessor = readFile(`${FUB_ZAHND_ROOT}/FUBProcessor.cs`)
  const leadsPage = readFile(`${KPI_DASHBOARD_ROOT}/src/pages/Leads.tsx`)
  const companyLeadsRpc = readFile(`${KPI_DASHBOARD_ROOT}/supabase/migrations/20260106200000_add_get_company_leads.sql`)

  const supabaseWriterStart = fubProcessor.indexOf('private long? InsertPersonToSupabase')
  const supabaseWriterEnd = fubProcessor.indexOf('private void DeletePersonFromSupabase')
  const supabaseWriterBlock = supabaseWriterStart >= 0 && supabaseWriterEnd > supabaseWriterStart
    ? fubProcessor.slice(supabaseWriterStart, supabaseWriterEnd)
    : ''

  assertCheck(
    checks,
    /LeadDate,\s*[\s\S]*case when @CurrentStageID = 2 or \(@CurrentStageID <> 2 and @currentinleadstage = 1\)/i.test(upInsertPerson) &&
      /LeadDate\s*=\s*case when @CurrentStageID = 2 and CurrentStageID <> 2/i.test(upInsertPerson),
    'legacy SQL Server writer sets LeadDate from lead-stage entry',
    'fub.up_InsertPerson insert path handles Stage 2 or LeadStage=true; update path preserves first Lead stage date.',
  )
  assertCheck(
    checks,
    /LeadClaimedDate\s*=\s*case when UserID = 22 and @UserID <> 22 then getdate\(\) else LeadClaimedDate end/i.test(upInsertPerson),
    'legacy SQL Server writer sets LeadClaimedDate on user 22 claim',
    'fub.up_InsertPerson records claim timing when an existing user 22 row moves to a non-22 owner.',
  )
  assertCheck(
    checks,
    /DBUtil\.ExecuteSPNoResults\(conn,\s*"fub\.up_InsertPerson"/.test(fubProcessor) &&
      /long\? supabasePid = InsertPersonToSupabase\(person\)/.test(fubProcessor),
    'FUBZahnd person processor calls SQL writer before direct Supabase sync',
    'The checked-in processor writes the SQL Server-shaped person record, then runs the direct Supabase helper.',
  )
  assertCheck(
    checks,
    supabaseWriterBlock &&
      !/leadclaimeddate/i.test(supabaseWriterBlock) &&
      !/leaddate/i.test(supabaseWriterBlock) &&
      /personid, personname, createddate, userid, currentstageid, currentstage, source, contacted, lastupdatedatetime, errormessage, active/i.test(supabaseWriterBlock),
    'checked-in direct Supabase writer does not write lead date fields',
    'InsertPersonToSupabase updates basic person/stage/source fields and active-row re-entry only.',
  )
  assertCheck(
    checks,
    /leadclaimeddate.*leaddate/is.test(leadsPage) && /leadclaimeddate.*leaddate/is.test(companyLeadsRpc),
    'KPI dashboard code reads leadclaimeddate first, then leaddate',
    'Leads page and company leads RPC use the claimed-date-first read rule.',
  )

  const stages = (await supabaseGet('stages?select=stageid,stagedescription,leadstage,clientstage&order=stageid.asc')).rows
  const leadStageIds = stages.filter(stage => stage.leadstage).map(stage => Number(stage.stageid))
  const leadStageFilter = `(${leadStageIds.join(',')})`
  const activeClientStage = stages.find(stage => Number(stage.stageid) === 57)
  const liveCounts = {
    activeNonDeletedPersons: await supabaseCount('persons?select=pid&active=eq.true&deleteddate=is.null'),
    activeLeadStagePersons: await supabaseCount(`persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=in.${leadStageFilter}`),
    activeLeadStageWithLeadDate: await supabaseCount(`persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=in.${leadStageFilter}&leaddate=not.is.null`),
    activeLeadStageMissingLeadDate: await supabaseCount(`persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=in.${leadStageFilter}&leaddate=is.null`),
    activeNonDeletedWithLeadClaimedDate: await supabaseCount('persons?select=pid&active=eq.true&deleteddate=is.null&leadclaimeddate=not.is.null'),
    leadDateAfterSince: await supabaseCount(`persons?select=pid&leaddate=gte.${SINCE_DATE}`),
    leadClaimedDateAfterSince: await supabaseCount(`persons?select=pid&leadclaimeddate=gte.${SINCE_DATE}`),
    recentLeadStageCreated: await supabaseCount(`persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=in.${leadStageFilter}&recordcreateddate=gte.${SINCE_DATE}`),
    recentLeadStageCreatedMissingLeadDate: await supabaseCount(`persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=in.${leadStageFilter}&recordcreateddate=gte.${SINCE_DATE}&leaddate=is.null`),
    activeClientActiveRows: await supabaseCount('persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=eq.57'),
    activeClientWithLeadDate: await supabaseCount('persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=eq.57&leaddate=not.is.null'),
    activeClientWithLeadClaimedDate: await supabaseCount('persons?select=pid&active=eq.true&deleteddate=is.null&currentstageid=eq.57&leadclaimeddate=not.is.null'),
  }

  assertCheck(
    checks,
    activeClientStage?.leadstage === true && activeClientStage?.clientstage === false,
    'live KPI stages mark Active Client as leadstage and not clientstage',
    `stage 57 leadstage=${activeClientStage?.leadstage} clientstage=${activeClientStage?.clientstage}`,
  )
  assertCheck(
    checks,
    liveCounts.leadDateAfterSince > 0 && liveCounts.recentLeadStageCreatedMissingLeadDate === 0,
    'live Supabase is still receiving current leaddate values',
    `${liveCounts.leadDateAfterSince} rows have leaddate >= ${SINCE_DATE}; ${liveCounts.recentLeadStageCreatedMissingLeadDate}/${liveCounts.recentLeadStageCreated} recent active lead-stage rows are missing leaddate.`,
  )
  assertCheck(
    checks,
    liveCounts.leadClaimedDateAfterSince > 0 && liveCounts.activeNonDeletedWithLeadClaimedDate > 0,
    'live Supabase is still receiving current leadclaimeddate values',
    `${liveCounts.leadClaimedDateAfterSince} rows have leadclaimeddate >= ${SINCE_DATE}; ${liveCounts.activeNonDeletedWithLeadClaimedDate} active non-deleted rows have leadclaimeddate.`,
  )
  assertCheck(
    checks,
    liveCounts.activeClientActiveRows > 0 && liveCounts.activeClientWithLeadDate > 0,
    'Active Client rows are live opportunity-path rows, not fresh-lead proof by themselves',
    `${liveCounts.activeClientWithLeadDate}/${liveCounts.activeClientActiveRows} active Active Client rows have leaddate; ${liveCounts.activeClientWithLeadClaimedDate} have leadclaimeddate.`,
  )

  const failed = checks.filter(check => !check.ok)
  printChecks(checks)
  console.log(`\nSOURCE_021_WRITER_PROOF_SUMMARY ${JSON.stringify({
    status: failed.length ? 'failed' : 'paused_exact_writer_path_not_proven',
    generatedAt: new Date().toISOString(),
    sinceDate: SINCE_DATE,
    leadStageIds,
    liveCounts,
    conclusion: {
      leaddate: 'FUBZahnd SQL Server fub.up_InsertPerson defines LeadDate from lead-stage entry; live Supabase has current matching values.',
      leadclaimeddate: 'FUBZahnd SQL Server fub.up_InsertPerson defines LeadClaimedDate from user 22 to non-22 claim; live Supabase has current matching values.',
      directSupabaseWriter: 'The checked-in direct Supabase helper does not write leaddate or leadclaimeddate.',
      missingProof: 'Exact production path that copies or writes the rich date fields into live Supabase is not visible from current repo/local access.',
    },
  })}`)

  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'SOURCE-021 writer proof check failed.')
  process.exitCode = 1
})
