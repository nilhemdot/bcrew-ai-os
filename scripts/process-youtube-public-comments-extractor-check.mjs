#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID,
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH,
  YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH,
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
    currentPlanSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/youtube-public-comments-extractor.js'),
    readRepoFile(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH),
    readRepoFile(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/god-mode-extractor-parity-gate.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
  ])

  addCheck(
    checks,
    packageJson.scripts?.['process:youtube-public-comments-extractor-check'] === `node --env-file-if-exists=.env ${YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH}`,
    'package exposes YouTube public-comments exclusion proof',
    packageJson.scripts?.['process:youtube-public-comments-extractor-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'validateYoutubePublicCommentsRequest',
      'buildYoutubePublicCommentsPacket',
      'evaluateYoutubePublicCommentsPacket',
      'startsCrawler: false',
      'externalWrites: false',
      'writesBacklog: false',
    ]),
    'historical module remains no-crawl/no-write boundary evidence only',
    'lib/youtube-public-comments-extractor.js',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'process:youtube-public-comments-extractor-check',
      'operator-exclusion',
      'not active work',
      'not parked future work',
      'not a God Mode blocker',
      'Do not configure YouTube comment API keys',
    ]),
    'plan records comments as operator-excluded instead of future extractor work',
    YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_PLAN_PATH,
  )
  addCheck(
    checks,
    backlogSeedSource.includes(YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID) &&
      backlogSeedSource.includes("title: 'Document public YouTube comment exclusion'") &&
      backlogSeedSource.includes("lane: 'done'") &&
      backlogSeedSource.includes("priority: 'P3'") &&
      backlogSeedSource.includes('operator-exclusion decision'),
    'backlog seed closes comment card as operator-exclusion decision',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    includesAll(paritySource, [
      'YouTube public comments (operator excluded)',
      'operator_excluded_low_value_signal',
      'NO-ACTIVE-CARD-OPERATOR-EXCLUDED',
      'comments are not a God Mode blocker or next build',
    ]),
    'God Mode parity matrix exposes comments as operator-excluded',
    'lib/god-mode-extractor-parity-gate.js',
  )
  addCheck(
    checks,
    currentPlanSource.includes('YouTube comments are operator-excluded') &&
      currentPlanSource.includes('`YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001` is closed as an operator-exclusion decision') &&
      !currentPlanSource.includes('Public YouTube comment capture is now a planned P0'),
    'current plan prevents comments from returning as active or parked P0 work',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    scriptSource.includes('operator-excluded') && scriptSource.includes('not active work'),
    'this proof guards the exclusion instead of running a comment adapter',
    YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_SCRIPT_PATH,
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: YOUTUBE_PUBLIC_COMMENTS_EXTRACTOR_CARD_ID,
    reportOnly: true,
    operatorExcluded: true,
    noLiveFetchInProof: true,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`YouTube public-comments exclusion check: ${output.status}`)
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
