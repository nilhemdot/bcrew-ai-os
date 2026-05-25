#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID,
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH,
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH,
  buildYoutubePublicCommentsExtractorDogfoodProof,
  buildYoutubePublicCommentsLiveAdapterDogfoodProof,
} from '../lib/youtube-public-comments-extractor.js'

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

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    backlogSeedSource,
    paritySource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/youtube-public-comments-extractor.js'),
    readRepoFile(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH),
    readRepoFile(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/god-mode-extractor-parity-gate.js'),
  ])

  const dogfood = buildYoutubePublicCommentsExtractorDogfoodProof()
  const liveAdapterDogfood = await buildYoutubePublicCommentsLiveAdapterDogfoodProof()
  const validPacket = dogfood.validPacket || {}
  const packetPreviewFamilies = (validPacket.sourcePacketPreviews || [])
    .map(packet => `${packet.sourceFamily}:${packet.proposedDecision}`)

  addCheck(
    checks,
    packageJson.scripts?.['process:youtube-public-comments-extractor-check'] === `node --env-file-if-exists=.env ${YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH}`,
    'package exposes YouTube public-comments proof',
    packageJson.scripts?.['process:youtube-public-comments-extractor-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'validateYoutubePublicCommentsRequest',
      'buildYoutubePublicCommentsPacket',
      'evaluateYoutubePublicCommentsPacket',
      'buildYoutubePublicCommentsExtractorDogfoodProof',
      'fetchYoutubePublicCommentsViaDataApi',
      'buildYoutubePublicCommentsLiveAdapterDogfoodProof',
      'https://www.googleapis.com/youtube/v3/commentThreads',
      'sourcePacketRequiredForOutboundLinks',
      'startsCrawler: false',
      'externalWrites: false',
      'writesBacklog: false',
    ]),
    'module defines bounded public-comments contract and no-crawl/no-write outputs',
    'lib/youtube-public-comments-extractor.js',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'process:youtube-public-comments-extractor-check',
      'no-auth',
      'exact-video',
      'source packets',
      'commentThreads',
      'YOUTUBE_DATA_API_KEY',
    ]),
    'plan names proof command, exact-video/no-auth boundary, source packets, and API-key live adapter limit',
    YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH,
  )
  addCheck(
    checks,
    backlogSeedSource.includes(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID) &&
      backlogSeedSource.includes('process:youtube-public-comments-extractor-check'),
    'backlog seed points comment card at real proof',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    paritySource.includes('adapter_ready_missing_api_key_and_runner_integration') &&
      paritySource.includes('process:youtube-public-comments-extractor-check'),
    'God Mode parity matrix exposes comments as adapter-ready, not fully working',
    'lib/god-mode-extractor-parity-gate.js',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves valid capture, auth failure, broad-source failure, missing provenance failure, and link source packets',
    JSON.stringify(dogfood.cases),
  )
  addCheck(
    checks,
    liveAdapterDogfood.ok === true,
    'live adapter dogfood proves YouTube Data API mapping, missing-key block, API-error block, and no downstream writes',
    JSON.stringify(liveAdapterDogfood.cases),
  )
  addCheck(
    checks,
    validPacket.reportOnly === true &&
      validPacket.startsCrawler === false &&
      validPacket.externalWrites === false &&
      validPacket.writesBacklog === false,
    'valid proof packet is report-only and never starts crawlers or writes downstream',
    `${validPacket.summary?.commentCount || 0} comments`,
  )
  addCheck(
    checks,
    packetPreviewFamilies.some(item => item.startsWith('github:approve_public_free_read')) &&
      packetPreviewFamilies.some(item => item.startsWith('skool:manual_source_packet')) &&
      packetPreviewFamilies.some(item => item.startsWith('skool:hold_paid_private')),
    'comment outbound links are classified into safe source-packet decisions',
    packetPreviewFamilies.join(', '),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID,
    reportOnly: true,
    noLiveFetchInProof: true,
    dogfoodSummary: {
      commentCount: validPacket.summary?.commentCount || 0,
      sourcePacketCount: validPacket.summary?.sourcePacketCount || 0,
      signalRoles: validPacket.summary?.signalRoles || [],
    },
    liveAdapterDogfood: {
      ok: liveAdapterDogfood.ok,
      commentCount: liveAdapterDogfood.fetched?.packet?.summary?.commentCount || 0,
      missingKeyBlocks: liveAdapterDogfood.missingKey?.blocker === 'missing_youtube_data_api_key',
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`YouTube public-comments extractor check: ${output.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
