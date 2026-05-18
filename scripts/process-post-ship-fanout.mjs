#!/usr/bin/env node

import process from 'node:process'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  recordBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'
import { buildPostShipFanoutStatus } from '../lib/post-ship-fanout.js'

const commandName = 'process-post-ship-fanout'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function normalizeText(value) {
  return String(value || '').trim()
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cardId = normalizeText(args.card)
  const closeoutKey = normalizeText(args.closeoutKey)
  const commitRef = normalizeText(args.commitRef) || 'HEAD'
  const checks = []

  console.log('Post-ship fanout check')
  console.log(`  Command: ${commandName}`)
  console.log(`  Card: ${cardId || 'missing'}`)
  console.log(`  Closeout: ${closeoutKey || 'missing'}`)
  console.log(`  Commit: ${commitRef}`)

  ensure(checks, cardId, 'card argument is present', cardId || 'missing --card')
  ensure(checks, closeoutKey, 'closeout key argument is present', closeoutKey || 'missing --closeoutKey')

  await assertFoundationDbReadyForReadOnlyGate('process:post-ship-fanout')
  const foundation = await getFoundationSnapshot()
  const card = (foundation.backlogItems || []).find(item => item.id === cardId) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === closeoutKey) || null
  const status = await buildPostShipFanoutStatus({
    closeouts: getFoundationBuildCloseouts(),
    backlogItems: foundation.backlogItems || [],
    cardId,
    closeoutKey,
    commitRef,
  })

  ensure(checks, Boolean(card), 'backlog card exists', card ? `${card.id} / ${card.lane}` : 'missing card')
  ensure(checks, card?.lane === 'done', 'target card is done', card ? card.lane : 'missing card')
  ensure(checks, Boolean(closeout), 'closeout record exists', closeoutKey || 'missing closeout key')
  ensure(
    checks,
    status.summary?.ruleCount >= 5,
    'fanout rules are loaded',
    `${status.summary?.ruleCount || 0} rules`,
  )
  ensure(
    checks,
    status.changedFileCount > 0,
    'commit changed files are visible',
    `${status.changedFileCount} files`,
  )
  ensure(
    checks,
    status.summary?.criticalFindings === 0,
    'fanout findings are clean',
    status.findings.length
      ? status.findings.map(finding => `${finding.type}: ${finding.issue}`).join(' | ')
      : 'no critical findings',
  )

  console.log('')
  for (const check of checks) {
    const prefix = check.ok ? 'PASS' : 'FAIL'
    console.log(`${prefix} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  const failed = checks.filter(check => !check.ok)
  console.log('')
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) {
    try {
      recordBuildLaneFailureEventsFromChecks({
        checks,
        command: 'process:post-ship-fanout',
        cardId,
        closeoutKey,
      })
    } catch {}
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error('Post-ship fanout check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
