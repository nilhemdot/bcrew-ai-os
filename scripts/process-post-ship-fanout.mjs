#!/usr/bin/env node

import process from 'node:process'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  recordBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
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

function closeoutText(closeout) {
  return [
    closeout?.status,
    closeout?.acceptanceState,
    closeout?.whatChanged,
    closeout?.whatItDoes,
    closeout?.whyItMatters,
    ...(closeout?.proofCommands || []),
    closeout?.proofStatus,
    closeout?.reviewNext,
    ...(closeout?.knownLimits || []),
  ].filter(Boolean).join('\n').toLowerCase()
}

function isBlockedPreflightCloseout(closeout) {
  if (closeout?.status !== 'blocked-preflight') return false
  const text = closeoutText(closeout)
  return text.includes('preflight') &&
    text.includes('approval') &&
    (text.includes('pending') || text.includes('approval-bound') || text.includes('approval boundary')) &&
    (text.includes('not done') || text.includes('not accepted') || text.includes('not marked done') || text.includes('not memory-002 implementation completion'))
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
  const blockedPreflightCloseout = isBlockedPreflightCloseout(closeout)
  const status = await buildPostShipFanoutStatus({
    closeouts: getFoundationBuildCloseouts(),
    backlogItems: foundation.backlogItems || [],
    cardId,
    closeoutKey,
    commitRef,
  })

  ensure(checks, Boolean(card), 'backlog card exists', card ? `${card.id} / ${card.lane}` : 'missing card')
  ensure(
    checks,
    card?.lane === 'done' || (blockedPreflightCloseout && ['scoped', 'executing'].includes(card?.lane)),
    'target card is done or has blocked-preflight closeout',
    card ? `${card.lane}${blockedPreflightCloseout ? ' / blocked-preflight' : ''}` : 'missing card',
  )
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
