#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH,
  buildSourcePacketPreview,
} from '../lib/build-intel-link-approval-source-packets.js'
import {
  SOURCE_PACKET_PUBLIC_WEB_RUNTIME_SCRIPT_PATH,
  approvePacketForRuntime,
  buildSourcePacketPublicWebRuntimeDogfoodProof,
  runSourcePacketPublicWebRuntime,
} from '../lib/source-packet-public-web-runtime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function text(value) {
  return String(value || '').trim()
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, planSource, moduleSource, scriptSource, dogfood] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH),
    readRepoFile('lib/source-packet-public-web-runtime.js'),
    readRepoFile(SOURCE_PACKET_PUBLIC_WEB_RUNTIME_SCRIPT_PATH),
    buildSourcePacketPublicWebRuntimeDogfoodProof(),
  ])

  const packet = approvePacketForRuntime(buildSourcePacketPreview({ url: 'https://chaseai.io', host: 'chaseai.io' }), {
    approvedBy: 'Steve',
    approvedAt: '2026-05-25T20:00:00.000-04:00',
  })
  const sampleRun = await runSourcePacketPublicWebRuntime({
    packet,
    html: '<html><head><title>Sample public page</title></head><body><h1>Sample</h1><a href="https://www.skool.com/chase-ai">Community</a></body></html>',
  })

  addCheck(checks, packageJson.type === 'module', 'repo supports ESM proof scripts', packageJson.type || 'missing')
  addCheck(checks, /local Playwright first/i.test(planSource) && /proof that approval does not start the runtime/i.test(planSource), 'source-packet plan documents runtime and no-start boundary', BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH)
  addCheck(checks, /validateApprovedPublicWebSourcePacket/.test(moduleSource) && /runSourcePacketPublicWebRuntime/.test(moduleSource), 'module exports validator and runtime runner', 'lib/source-packet-public-web-runtime.js')
  addCheck(checks, /followedLinkCount/.test(moduleSource) && /requiresSourcePacket/.test(moduleSource), 'runtime classifies links without following them', 'lib/source-packet-public-web-runtime.js')
  addCheck(checks, /live_playwright_exact_url/.test(moduleSource) && /allowLive/.test(moduleSource), 'live Playwright mode is explicit and disabled by default', 'lib/source-packet-public-web-runtime.js')
  addCheck(checks, !/fetch\(/.test(scriptSource), 'proof script does not browse or fetch live public web', SOURCE_PACKET_PUBLIC_WEB_RUNTIME_SCRIPT_PATH)
  addCheck(checks, dogfood.ok, 'dogfood proves exact public reads and blocked unsafe variants', JSON.stringify(dogfood.blockedCases))
  addCheck(checks, sampleRun.ok === true, 'sample approved public packet produces an artifact', sampleRun.artifact?.artifactId || 'missing')
  addCheck(checks, sampleRun.artifact?.followedLinkCount === 0, 'sample run does not follow discovered links', String(sampleRun.artifact?.followedLinkCount))
  addCheck(checks, sampleRun.sideEffects?.externalWrites === false && sampleRun.sideEffects?.writesBacklog === false, 'sample run has no external/backlog writes', JSON.stringify(sampleRun.sideEffects))
  addCheck(checks, text(sampleRun.artifact?.nextSourcePacketCandidates?.[0]?.url), 'sample run turns discovered links into next source-packet candidates', sampleRun.artifact?.nextSourcePacketCandidates?.[0]?.url || 'missing')

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
    reportOnly: true,
    liveNetworkFetched: false,
    startsFromApproval: false,
    externalWrites: false,
    writesBacklog: false,
    dogfood,
    sampleRun,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Source Packet Public Web Runtime check: ${output.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
