#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  executeSourceBrowserAgentRun,
} from '../lib/source-browser-agent-executor.js'
import {
  SOURCE_SESSION_AUTH_RESUME_PACKET_SCRIPT_PATH,
  buildSourceSessionAuthResumePacketDogfoodProof,
  evaluateSourceSessionAuthResumePacket,
} from '../lib/source-session-auth-resume-packet.js'

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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, resumeSource, executorSource, brokerSource, harlanLiveSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-session-auth-resume-packet.js'),
    readRepoFile('lib/source-browser-agent-executor.js'),
    readRepoFile('lib/source-session-broker.js'),
    readRepoFile('lib/harlan-auth-live-delivery.js'),
  ])

  const dogfood = buildSourceSessionAuthResumePacketDogfoodProof()
  const blockedSkool = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'chase-ai-community',
      url: 'https://www.skool.com/chase-ai-community/about',
      sourceFamily: 'skool_free_community',
      account: 'ai@bensoncrew.ca',
    },
    observation: {
      url: 'https://www.skool.com/chase-ai-community/about',
      title: 'Chase AI Community',
      bodyTextPreview: 'Free community for AI agents, posts, classroom, and resources.',
      textChars: 72,
    },
    now: '2026-05-28T12:15:00.000-04:00',
  })
  const blockedPacket = blockedSkool.sourceSessionAuthResumePacket
  const blockedPacketEval = evaluateSourceSessionAuthResumePacket(blockedPacket)

  addCheck(
    checks,
    packageJson.scripts?.['process:source-session-auth-resume-packet-check'] === `node --env-file-if-exists=.env ${SOURCE_SESSION_AUTH_RESUME_PACKET_SCRIPT_PATH}`,
    'package exposes focused Source Session auth resume packet proof',
    packageJson.scripts?.['process:source-session-auth-resume-packet-check'] || 'missing',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood builds Skool, MyICOR, ready-session, and unsafe-secret cases',
    dogfood.cases.filter(item => !item.ok).map(item => item.name).join(', ') || 'all dogfood cases passed',
  )
  addCheck(
    checks,
    blockedSkool.ok === false &&
      blockedSkool.status === 'source_browser_agent_blocked_before_runner' &&
      blockedSkool.sideEffects?.externalRunStarted === false,
    'Source Browser Agent blocks Skool before runner when source session is missing',
    JSON.stringify({ status: blockedSkool.status, sideEffects: blockedSkool.sideEffects }),
  )
  addCheck(
    checks,
    blockedPacketEval.ok &&
      blockedPacket?.status === 'waiting_for_human_auth' &&
      blockedPacket?.harlanTelegram?.externalSent === false &&
      blockedPacket?.harlanTelegram?.sendsMessageNow === false,
    'blocked source-session plan prepares Harlan Telegram dry-run packet only',
    JSON.stringify({ status: blockedPacket?.status, harlan: blockedPacket?.harlanTelegram?.status, externalSent: blockedPacket?.harlanTelegram?.externalSent }),
  )
  addCheck(
    checks,
    blockedPacket?.commands?.resumeCommand?.includes('source:browser-agent') &&
      blockedPacket?.commands?.resumeCommand?.includes('--execute') &&
      blockedPacket?.commands?.resumeCommand?.includes('--allowSourceSessionRun'),
    'blocked packet includes exact resume command for the source-browser agent',
    blockedPacket?.commands?.resumeCommand || 'missing',
  )
  addCheck(
    checks,
    blockedSkool.crawlItem?.metadata?.sourceSessionAuthResumePacket?.version === blockedPacket?.version,
    'blocked crawl item carries the source-session auth resume packet',
    blockedSkool.crawlItem?.metadata?.sourceSessionAuthResumePacket?.version || 'missing',
  )
  addCheck(
    checks,
    /buildSourceSessionAuthResumePacket/.test(executorSource) &&
      /sourceSessionAuthResumePacket/.test(executorSource),
    'Source Browser Agent executor embeds auth resume packet on broker-blocked runs',
    'lib/source-browser-agent-executor.js',
  )
  addCheck(
    checks,
    /prepareHarlanTelegramDeliveryPacket/.test(resumeSource) &&
      /sendsMessageNow/.test(harlanLiveSource) &&
      /evaluateSourceSessionBrokerRequest/.test(brokerSource),
    'resume packet reuses broker decisions and Harlan live-delivery dry-run contract',
    'broker + Harlan dry-run imports present',
  )
  addCheck(
    checks,
    !/(password=raw-secret|access_token=|refresh_token=|bot[._-]?token=|chat[._-]?id=)/i.test(JSON.stringify({ dogfood, blockedPacket })),
    'proof output does not contain raw secret-like values',
    'raw secret scan clean',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    writesSourceSystems: false,
    externalNotificationSent: false,
    liveTelegramSent: false,
    dogfoodCases: dogfood.cases,
    blockedSkool: {
      status: blockedSkool.status,
      runner: blockedSkool.runner,
      packetStatus: blockedPacket?.status,
      harlanStatus: blockedPacket?.harlanTelegram?.status,
      resumeCommand: blockedPacket?.commands?.resumeCommand,
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`${output.status}: source-session-auth-resume-packet`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
