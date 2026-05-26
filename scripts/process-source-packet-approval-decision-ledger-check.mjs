#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH,
} from '../lib/build-intel-link-approval-source-packets.js'
import {
  SOURCE_PACKET_APPROVAL_DECISION_LEDGER_SCRIPT_PATH,
  SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID,
  SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
  buildSourcePacketApprovalDecisionLedgerDogfoodProof,
  buildSourcePacketDecisionRecord,
  buildSourcePacketDecisionTargetInput,
  persistSourcePacketDecisionRecord,
  safeSideEffects,
} from '../lib/source-packet-approval-decision-ledger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function capturePersistWithFakeStore(record) {
  const calls = []
  const fakeTarget = async input => {
    calls.push({ type: 'target', input })
    return { ...input, updatedAt: '2026-05-25T21:04:00.000-04:00' }
  }
  const fakeItem = async input => {
    calls.push({ type: 'item', input })
    return { ...input, updatedAt: '2026-05-25T21:04:00.000-04:00' }
  }
  const result = await persistSourcePacketDecisionRecord(record, {
    upsertSourceCrawlTarget: fakeTarget,
    upsertSourceCrawlItem: fakeItem,
    actor: 'codex-source-packet-ledger-proof',
  })
  return { result, calls }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageSource,
    planSource,
    moduleSource,
    scriptSource,
    routeSource,
    serverSource,
    devJsSource,
    dogfood,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH),
    readRepoFile('lib/source-packet-approval-decision-ledger.js'),
    readRepoFile(SOURCE_PACKET_APPROVAL_DECISION_LEDGER_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('server.js'),
    readRepoFile('public/dev.js'),
    buildSourcePacketApprovalDecisionLedgerDogfoodProof(),
  ])

  const approvedRecord = buildSourcePacketDecisionRecord({
    url: 'https://chaseai.io',
    host: 'chaseai.io',
    operatorNote: 'sales page, review how they sell AI products',
    operatorAction: 'approve',
    decidedBy: 'Steve',
    decidedAt: '2026-05-25T21:05:00.000-04:00',
  })
  const fakePersist = await capturePersistWithFakeStore(approvedRecord)
  const targetInput = buildSourcePacketDecisionTargetInput()
  const sideEffects = safeSideEffects()
  const packageJson = JSON.parse(packageSource)

  addCheck(checks, packageJson.scripts?.['process:source-packet-approval-decision-ledger-check'] === `node --env-file-if-exists=.env ${SOURCE_PACKET_APPROVAL_DECISION_LEDGER_SCRIPT_PATH}`, 'package exposes source-packet decision ledger proof', 'process:source-packet-approval-decision-ledger-check')
  addCheck(checks, dogfood.ok, 'dogfood proves approve/hold/reject records and unsafe tampering failures', JSON.stringify(dogfood.cases.map(item => ({ name: item.name, ok: item.ok }))))
  addCheck(checks, targetInput.targetKey === SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY && targetInput.sourceId === SOURCE_PACKET_APPROVAL_DECISION_SOURCE_ID, 'decision target is a named source-crawl ledger target', `${targetInput.targetKey} / ${targetInput.sourceId}`)
  addCheck(checks, targetInput.metadata?.startsCrawler === false && targetInput.metadata?.startsWorker === false, 'decision target declares no crawler/worker start', JSON.stringify(targetInput.metadata))
  addCheck(checks, fakePersist.result.ok && fakePersist.result.status === 'recorded', 'fake persistence records an approved source packet', fakePersist.result.sourceCrawlItem?.itemKey || 'missing')
  addCheck(checks, fakePersist.calls.some(call => call.type === 'target') && fakePersist.calls.some(call => call.type === 'item'), 'persistence writes target then item through injected store dependencies', fakePersist.calls.map(call => call.type).join(', '))
  addCheck(checks, fakePersist.result.sideEffects?.writesSourceCrawlItems === true && fakePersist.result.sideEffects?.startsCrawler === false && fakePersist.result.sideEffects?.runtimeStarted === false, 'persistence writes only the decision ledger, not runtime work', JSON.stringify(fakePersist.result.sideEffects))
  addCheck(checks, sideEffects.startsCrawler === false && sideEffects.writesBacklog === false && sideEffects.externalWrites === false, 'default side-effect posture is safe', JSON.stringify(sideEffects))
  addCheck(checks, /persistSourcePacketDecisionRecord/.test(routeSource) && /link-source-packet-decision/.test(routeSource), 'Build Intel route exposes decision persistence endpoint', 'lib/foundation-build-intel-routes.js')
  addCheck(checks, /upsertSourceCrawlTarget/.test(serverSource) && /upsertSourceCrawlItem/.test(serverSource), 'server injects source-crawl target/item dependencies', 'server.js')
  addCheck(checks, /LINK_PACKET_DECISION_ROUTE/.test(devJsSource) && /data-approval-action=\"record\"/.test(devJsSource), 'Dev UI can record approve/hold/reject decisions', 'public/dev.js')
  addCheck(checks, /approval decisions are durable/i.test(planSource) && /does not start a worker/i.test(planSource), 'plan documents durable no-start approval decisions', BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH)
  addCheck(checks, !/fetch\(/.test(scriptSource), 'focused proof does not browse or fetch external links', SOURCE_PACKET_APPROVAL_DECISION_LEDGER_SCRIPT_PATH)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
    reportOnly: true,
    startsCrawler: false,
    startsWorker: false,
    externalWrites: false,
    writesBacklog: false,
    targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
    dogfood,
    samplePersist: fakePersist.result,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Source Packet Approval Decision Ledger check: ${output.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
