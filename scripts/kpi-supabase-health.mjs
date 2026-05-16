#!/usr/bin/env node

import process from 'node:process'
import {
  EXPECTED_KPI_RPCS,
  EXPECTED_KPI_TABLES,
  getKpiHealthSnapshot,
  KPI_HEALTH_PRIMARY_SURFACE,
} from '../lib/kpi-health.js'

function formatAge(days) {
  return typeof days === 'number' ? `${days.toFixed(1)}d` : 'unknown'
}

function printSnapshot(snapshot) {
  const summary = snapshot.summary || {}
  console.log('KPI Supabase health')
  console.log(`  Project: ${snapshot.projectHost || 'unknown'}`)
  console.log(`  Contract: v${snapshot.contractVersion}`)
  console.log(`  Surface: ${KPI_HEALTH_PRIMARY_SURFACE}`)
  console.log(`  Period: ${snapshot.periodContract?.periodStart || 'unknown'} to ${snapshot.periodContract?.periodEnd || 'unknown'} (${snapshot.periodContract?.mode || 'unknown'})`)
  console.log(`  Status: ${summary.status || 'unknown'}`)
  console.log(`  Tables: ${summary.healthyTables || 0}/${summary.tableCount || 0} healthy`)
  console.log(`  RPCs: ${summary.healthyRpcs || 0}/${summary.rpcCount || 0} healthy`)

  console.log('\nLoad-bearing tables')
  ;(snapshot.tables || []).forEach(table => {
    const status = table.status === 'healthy' ? 'PASS' : table.status === 'warning' ? 'WARN' : 'FAIL'
    const latest = table.latestValue ? ` latest ${table.freshnessColumn}=${table.latestValue} (${formatAge(table.latestAgeDays)})` : ''
    const missing = table.missingColumns?.length ? ` missing=${table.missingColumns.join(',')}` : ''
    console.log(`${status} ${table.table}: ${table.readRule}; rows=${table.rowCount ?? 'unknown'}; window=${table.freshnessWindowDays}d${latest}${missing}`)
  })

  console.log('\nLoad-bearing RPCs')
  ;(snapshot.rpcs || []).forEach(rpc => {
    const status = rpc.status === 'healthy' ? 'PASS' : 'FAIL'
    const missing = rpc.missingColumns?.length ? ` missing=${rpc.missingColumns.join(',')}` : ''
    const error = rpc.error ? ` error=${rpc.error}` : ''
    console.log(`${status} ${rpc.rpc}: ${rpc.readRule}; rows=${rpc.rowCount ?? 'unknown'}${missing}${error}`)
  })

  const leeRepo = snapshot.leeRepo || {}
  console.log('\nLee repo/schema drift checklist')
  console.log(`  Repo: ${leeRepo.repoPath || 'unknown'}`)
  console.log(`  Files scanned: ${leeRepo.filesScanned || 0}`)
  console.log(`  Status: ${leeRepo.status || 'unknown'}`)
  if (leeRepo.missingReferences?.length) {
    console.log(`  Missing references: ${leeRepo.missingReferences.join(', ')}`)
  }

  if (summary.warningFindings?.length) {
    console.log('\nWarnings')
    summary.warningFindings.forEach(item => console.log(`  - ${item}`))
  }
  if (summary.riskFindings?.length) {
    console.log('\nRisks')
    summary.riskFindings.forEach(item => console.log(`  - ${item}`))
  }

  console.log(`\nKPI_HEALTH_SUMMARY ${JSON.stringify({
    status: summary.status,
    generatedAt: snapshot.generatedAt,
    tableCount: summary.tableCount,
    rpcCount: summary.rpcCount,
    staleTables: summary.staleTables,
    probeSilent: summary.probeSilent,
    schemaDriftStatus: snapshot.schemaDrift?.status,
    periodContract: snapshot.periodContract || null,
    expectedTables: EXPECTED_KPI_TABLES.map(item => item.table),
    expectedRpcs: (snapshot.rpcs?.length ? snapshot.rpcs : EXPECTED_KPI_RPCS).map(item => item.rpc),
  })}`)
}

getKpiHealthSnapshot().then(snapshot => {
  printSnapshot(snapshot)
  if (snapshot.summary?.status === 'risk' || snapshot.summary?.probeSilent) {
    process.exitCode = 1
  }
}).catch(error => {
  console.error(error instanceof Error ? error.message : 'KPI Supabase health failed.')
  process.exitCode = 1
})
