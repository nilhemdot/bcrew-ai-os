#!/usr/bin/env node

import process from 'node:process'
import {
  BACKLOG_HYGIENE_DEFAULT_STALE_EXECUTING_DAYS,
  buildBacklogHygieneSnapshot,
} from '../lib/backlog-hygiene.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  recordBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function printSnapshot(snapshot) {
  const summary = snapshot.summary || {}
  console.log('Backlog hygiene')
  console.log(`  Status: ${summary.status || 'unknown'}`)
  console.log(`  Cards scanned: ${summary.cardCount || 0}`)
  console.log(`  Findings: ${summary.findingCount || 0}`)
  console.log(`  Critical: ${summary.criticalFindings || 0}`)
  console.log(`  Warning: ${summary.warningFindings || 0}`)
  console.log(`  Info: ${summary.infoFindings || 0}`)
  console.log(`  Stale executing threshold: ${snapshot.thresholds?.staleExecutingDays || BACKLOG_HYGIENE_DEFAULT_STALE_EXECUTING_DAYS} days`)

  const visible = Array.isArray(snapshot.visibleFindings) ? snapshot.visibleFindings : []
  if (visible.length) {
    console.log('\nTop findings')
    visible.forEach(finding => {
      console.log(`  - ${finding.severity.toUpperCase()} ${finding.cardId}: ${finding.issue}`)
      console.log(`    Evidence: ${finding.evidence}`)
      console.log(`    Next: ${finding.recommendedAction}`)
    })
  } else {
    console.log('\nTop findings')
    console.log('  None.')
  }

  const syntheticFindings = (snapshot.findings || []).filter(finding => finding.synthetic)
  if (syntheticFindings.length) {
    console.log('\nSynthetic proof')
    syntheticFindings.forEach(finding => {
      console.log(`  - ${finding.cardId}: ${finding.type} produced a ${finding.severity} finding.`)
    })
  }

  console.log(`\nBACKLOG_HYGIENE_SUMMARY ${JSON.stringify({
    status: summary.status,
    generatedAt: snapshot.generatedAt,
    cardCount: summary.cardCount,
    findingCount: summary.findingCount,
    criticalFindings: summary.criticalFindings,
    warningFindings: summary.warningFindings,
    infoFindings: summary.infoFindings,
    syntheticFindings: summary.syntheticFindings,
    staleExecutingDays: snapshot.thresholds?.staleExecutingDays,
  })}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const staleExecutingDays = Number(args.staleExecutingDays || process.env.BACKLOG_HYGIENE_STALE_EXECUTING_DAYS || BACKLOG_HYGIENE_DEFAULT_STALE_EXECUTING_DAYS)
  await assertFoundationDbReadyForReadOnlyGate('backlog:hygiene')
  const foundation = await getFoundationSnapshot()
  const snapshot = buildBacklogHygieneSnapshot({
    backlogItems: foundation.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
    options: {
      includeSynthetic: boolArg(args.includeSynthetic),
      staleExecutingDays,
    },
  })
  printSnapshot(snapshot)
  if ((snapshot.summary?.criticalFindings || 0) > 0 || snapshot.summary?.status === 'critical') {
    try {
      recordBuildLaneFailureEventsFromChecks({
        checks: (snapshot.visibleFindings || []).map(finding => ({
          ok: false,
          check: `backlog hygiene ${finding.type || finding.issue || 'finding'}`,
          detail: `${finding.cardId || 'unknown'}: ${finding.issue || finding.evidence || ''}`,
        })),
        command: 'backlog:hygiene',
      })
    } catch {}
  }
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Backlog hygiene failed.')
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
