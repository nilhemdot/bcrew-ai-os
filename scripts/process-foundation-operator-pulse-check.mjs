#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildFoundationOperatorPulse,
  buildFoundationOperatorPulseDogfoodProof,
  FOUNDATION_OPERATOR_PULSE_APPROVAL_PATH,
  FOUNDATION_OPERATOR_PULSE_CARD_ID,
  FOUNDATION_OPERATOR_PULSE_CLOSEOUT_KEY,
  FOUNDATION_OPERATOR_PULSE_PLAN_PATH,
  FOUNDATION_OPERATOR_PULSE_ROUTE_PATH,
  FOUNDATION_OPERATOR_PULSE_SCRIPT_PATH,
} from '../lib/foundation-operator-pulse.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SOURCE_FILES = [
  'lib/foundation-operator-pulse.js',
  'lib/foundation-operator-routes.js',
  'server.js',
  'public/foundation-data.js',
  'public/foundation-runtime-renderers.js',
  'public/foundation-operations-renderers.js',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

function buildSyntheticPulse() {
  return buildFoundationOperatorPulse({
    systemHealth: {
      status: 'healthy',
      plainEnglish: 'Raw health is green.',
      summary: { rawRiskCount: 0, rawWatchCount: 0 },
    },
    repeatedFailureGate: {
      status: 'healthy',
      plainEnglish: 'No repeated failures are unresolved.',
      summary: { unsatisfiedRedCount: 0, blockingItemCount: 0 },
    },
    currentSprint: {
      status: 'healthy',
      summary: { nextCardId: 'WEB-GODMODE-001' },
    },
    backlogHygiene: {
      status: 'healthy',
      findingCount: 0,
      cardCount: 744,
    },
    backlogItems: [
      {
        id: 'WEB-GODMODE-001',
        title: 'Build governed website GOD-mode extraction worker',
        team: 'foundation',
        lane: 'scoped',
        priority: 'P0',
        rank: 47,
      },
    ],
    recentBuilds: [
      {
        commit: 'abc1234',
        subject: 'FOUNDATION-OPERATOR-PULSE-001 add operator pulse',
        cardIds: [FOUNDATION_OPERATOR_PULSE_CARD_ID],
        closeoutKey: FOUNDATION_OPERATOR_PULSE_CLOSEOUT_KEY,
      },
    ],
    recentChanges: [
      {
        event_type: 'build_closeout',
        summary: 'Operator pulse proof ran.',
      },
    ],
  })
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    packageJson,
    pulseSource,
    routesSource,
    serverSource,
    dataSource,
    runtimeRendererSource,
    operationsRendererSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_OPERATOR_PULSE_APPROVAL_PATH,
      cardId: FOUNDATION_OPERATOR_PULSE_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_OPERATOR_PULSE_CARD_ID]),
    readJson('package.json'),
    readText('lib/foundation-operator-pulse.js'),
    readText('lib/foundation-operator-routes.js'),
    readText('server.js'),
    readText('public/foundation-data.js'),
    readText('public/foundation-runtime-renderers.js'),
    readText('public/foundation-operations-renderers.js'),
  ])
  await closeFoundationDb()

  const card = cards.find(row => row.id === FOUNDATION_OPERATOR_PULSE_CARD_ID) || null
  const dogfood = buildFoundationOperatorPulseDogfoodProof()
  const syntheticPulse = buildSyntheticPulse()
  const pulseLabels = new Set((syntheticPulse.cards || []).map(row => row.label))
  const sourceMap = Object.fromEntries(await Promise.all(
    SOURCE_FILES.map(async file => [file, await readText(file)])
  ))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || FOUNDATION_OPERATOR_PULSE_APPROVAL_PATH)
  addCheck(checks, Boolean(card) && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, packageJson?.scripts?.['process:foundation-operator-pulse-check']?.includes(FOUNDATION_OPERATOR_PULSE_SCRIPT_PATH), 'package script exists', packageJson?.scripts?.['process:foundation-operator-pulse-check'] || 'missing')
  addCheck(checks, routesSource.includes(`app.get('${FOUNDATION_OPERATOR_PULSE_ROUTE_PATH}', requireAdminToken`) && routesSource.includes('cacheHeadersNoStore(res)'), 'operator pulse API is admin-gated and no-store', FOUNDATION_OPERATOR_PULSE_ROUTE_PATH)
  addCheck(checks, routesSource.includes('buildFoundationSystemHealthSnapshot') && routesSource.includes('readBuildLaneFailureTelemetrySnapshot') && routesSource.includes('buildBacklogHygieneSnapshot'), 'API route is source-backed by health, repeated failures, and backlog hygiene', 'route dependencies')
  addCheck(checks, serverSource.includes('registerFoundationOperatorRoutes(app') && serverSource.includes('buildFoundationCurrentSprintStatus') && serverSource.includes('buildFoundationOperatingReliabilitySnapshot'), 'server passes operator-pulse dependencies', 'server.js')
  addCheck(checks, dataSource.includes('foundationOperatorPulse: null') && dataSource.includes(`foundationRead('${FOUNDATION_OPERATOR_PULSE_ROUTE_PATH}')`) && dataSource.includes('function fetchFoundationOperatorPulse()'), 'frontend data helper fetches operator pulse', 'public/foundation-data.js')
  addCheck(checks, runtimeRendererSource.includes('function renderFoundationOperatorPulsePanel(pulse)') && runtimeRendererSource.includes('What Steve Needs To Know'), 'runtime renderer has operator pulse panel', 'public/foundation-runtime-renderers.js')
  addCheck(checks, operationsRendererSource.includes('fetchFoundationOperatorPulse()') && operationsRendererSource.includes('renderFoundationOperatorPulsePanel(operatorPulse)') && operationsRendererSource.indexOf('renderFoundationOperatorPulsePanel(operatorPulse)') < operationsRendererSource.indexOf('renderRuntimeHealthCommandPanel(hub)'), 'Runtime Health places pulse before diagnostic command panel', 'public/foundation-operations-renderers.js')
  addCheck(checks, dogfood.ok && dogfood.redHealth.status === 'risk' && dogfood.repeatedBlocked.status === 'risk' && dogfood.approvalWatch.status === 'watch', 'dogfood proves green/risk/watch behavior', JSON.stringify({
    healthy: dogfood.healthy.status,
    redHealth: dogfood.redHealth.status,
    repeated: dogfood.repeatedBlocked.status,
    approval: dogfood.approvalWatch.status,
  }))
  addCheck(checks, ['System Health', 'Repeated Failures', 'Current Sprint', 'Backlog Hygiene', 'Approvals'].every(label => pulseLabels.has(label)), 'pulse exposes required operator cards', Array.from(pulseLabels).join(', '))
  addCheck(checks, syntheticPulse.boundaries.localOperatorSurface === true &&
    syntheticPulse.boundaries.externalSends === false &&
    syntheticPulse.boundaries.autoFixes === false &&
    syntheticPulse.boundaries.writesSourceSystems === false &&
    syntheticPulse.boundaries.credentialMutation === false &&
    syntheticPulse.boundaries.drivePermissionMutation === false,
  'pulse boundaries forbid sends, autofix, source writes, credentials, and Drive permission mutation',
  JSON.stringify(syntheticPulse.boundaries))
  addCheck(checks, syntheticPulse.status === 'healthy' && syntheticPulse.nextCard?.id === 'WEB-GODMODE-001' && syntheticPulse.actionItems.some(item => item.includes('WEB-GODMODE-001')), 'green pulse gives a clear next-card recommendation', syntheticPulse.plainEnglish)
  addCheck(checks, pulseSource.includes(FOUNDATION_OPERATOR_PULSE_PLAN_PATH) && pulseSource.includes(FOUNDATION_OPERATOR_PULSE_APPROVAL_PATH), 'operator pulse module exports plan and approval refs', 'lib/foundation-operator-pulse.js')
  addCheck(checks, Object.entries(sourceMap).every(([, text]) => text && text.length > 0), 'all claimed source files are present', SOURCE_FILES.join(', '))

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_OPERATOR_PULSE_CARD_ID,
    closeoutKey: FOUNDATION_OPERATOR_PULSE_CLOSEOUT_KEY,
    routePath: FOUNDATION_OPERATOR_PULSE_ROUTE_PATH,
    planPath: FOUNDATION_OPERATOR_PULSE_PLAN_PATH,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Foundation operator pulse check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
