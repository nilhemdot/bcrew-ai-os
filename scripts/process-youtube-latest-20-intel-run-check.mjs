#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db.js'
import {
  YOUTUBE_LATEST_20_INTEL_RUN_APPROVAL_PATH,
  YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
  YOUTUBE_LATEST_20_INTEL_RUN_PLAN_PATH,
  YOUTUBE_LATEST_20_INTEL_RUN_SCRIPT_PATH,
  buildYoutubeLatest20IntelRunDogfoodProof,
  buildYoutubeLatest20IntelRunSnapshot,
} from '../lib/youtube-latest-20-intel-run.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from '../lib/youtube-creator-daily-watch.js'
import { YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID } from '../lib/youtube-resource-link-resolver.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    creatorIds: readArgValues(argv, '--creator-id='),
    videoIds: readArgValues(argv, '--video-id='),
    maxCreators: Number(readArgValue(argv, '--max-creators=')) || null,
    maxVideosPerCreator: Number(readArgValue(argv, '--max-videos-per-creator=')) || null,
    maxRunVideos: Number(readArgValue(argv, '--batch-size=')) || Number(readArgValue(argv, '--max-run-videos=')) || null,
  }
}

function readArgValue(argv = [], prefix = '') {
  const found = argv.find(arg => String(arg || '').startsWith(prefix))
  return found ? String(found).slice(prefix.length).trim() : ''
}

function readArgValues(argv = [], prefix = '') {
  return argv
    .filter(arg => String(arg || '').startsWith(prefix))
    .flatMap(arg => String(arg).slice(prefix.length).split(','))
    .map(text)
    .filter(Boolean)
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

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function youtubeVideoIdFromUrl(value = '') {
  const input = text(value)
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ''
}

function videoIdsFromMetadataRow(row = {}) {
  const metadata = row.metadata || {}
  return [
    metadata.sourceVideoId,
    metadata.videoId,
    ...(list(metadata.videoIds)),
    youtubeVideoIdFromUrl(row.anchor_value || row.anchorValue),
    youtubeVideoIdFromUrl(metadata.sourceUrl),
    youtubeVideoIdFromUrl(metadata.url),
  ].map(text).filter(Boolean)
}

async function loadDailyWatchPoolRows() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT external_id, target_key, source_id, status, discovered_at, processed_at, metadata
        FROM source_crawl_items
        WHERE target_key = $1
          AND source_id = $2
          AND COALESCE(metadata->>'creatorId', '') <> 'mark-kashef'
        ORDER BY COALESCE(metadata->>'creatorId', ''), COALESCE((metadata->>'rank')::int, 9999), discovered_at DESC
        LIMIT 600
      `,
      [YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    )
    return result.rows
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadAlreadyFullWatchedVideoIds() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT metadata, NULL::text AS anchor_value
        FROM intelligence_report_artifacts
        WHERE metadata->>'fullWatchRoute' = 'gemini_api_youtube_url_video_understanding'
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atoms
        WHERE metadata->>'sourceVideoId' IS NOT NULL
        UNION ALL
        SELECT metadata, anchor_value
        FROM intelligence_atom_hits
        WHERE metadata->>'sourceVideoId' IS NOT NULL
      `,
    )
    const ids = new Set()
    for (const row of result.rows) {
      for (const id of videoIdsFromMetadataRow(row)) ids.add(id)
    }
    return Array.from(ids).filter(Boolean)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    approvalValidation,
    dogfood,
    poolRows,
    alreadyFullWatchedVideoIds,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(YOUTUBE_LATEST_20_INTEL_RUN_PLAN_PATH),
    readRepoFile('lib/youtube-latest-20-intel-run.js'),
    readRepoFile(YOUTUBE_LATEST_20_INTEL_RUN_SCRIPT_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: YOUTUBE_LATEST_20_INTEL_RUN_APPROVAL_PATH,
      cardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
    }),
    buildYoutubeLatest20IntelRunDogfoodProof(),
    loadDailyWatchPoolRows(),
    loadAlreadyFullWatchedVideoIds(),
  ])

  const snapshot = buildYoutubeLatest20IntelRunSnapshot({
    poolRows,
    alreadyFullWatchedVideoIds,
    creatorIds: args.creatorIds,
    videoIds: args.videoIds,
    maxCreators: args.creatorIds.length ? Math.min(args.creatorIds.length, args.maxCreators || args.creatorIds.length) : args.maxCreators || undefined,
    maxVideosPerCreator: args.creatorIds.length ? args.maxVideosPerCreator || args.maxRunVideos || 9 : args.maxVideosPerCreator || undefined,
    maxRunVideos: args.maxRunVideos || undefined,
  })

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || YOUTUBE_LATEST_20_INTEL_RUN_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:youtube-latest-20-intel-run-check'] === 'node --env-file-if-exists=.env scripts/process-youtube-latest-20-intel-run-check.mjs', 'package exposes focused latest-20 proof', packageJson.scripts?.['process:youtube-latest-20-intel-run-check'] || 'missing')
  addCheck(checks, /full God Mode (path|route)/i.test(planSource) && /resource(-link)? links?.*(resolver|Scoper)/is.test(planSource), 'plan requires full-watch extraction and resource-link disposition', YOUTUBE_LATEST_20_INTEL_RUN_PLAN_PATH)
  addCheck(checks, /YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID/.test(moduleSource) && /resource links must flow through resolver/i.test(moduleSource), 'module keeps resource links as resolver/scoper work', 'lib/youtube-latest-20-intel-run.js')
  addCheck(checks, /loadAlreadyFullWatchedVideoIds/.test(scriptSource), 'script excludes already full-watched videos from the manifest', YOUTUBE_LATEST_20_INTEL_RUN_SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood excludes Mark, paid/private, and already-watched rows', JSON.stringify(dogfood.cases))
  addCheck(checks, poolRows.length >= 1, 'live daily-watch pool has non-Mark candidate rows', `${poolRows.length}`)
  addCheck(checks, snapshot.ok === true, 'live latest-20 run manifest is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.selectedVideos.length >= 1 || snapshot.status === 'exhausted_for_requested_creator' || snapshot.status === 'no_eligible_videos_selected', 'live manifest selected non-Mark videos or is truthfully idle', ['exhausted_for_requested_creator', 'no_eligible_videos_selected'].includes(snapshot.status) ? snapshot.status : `${snapshot.selectedVideos.length}`)
  addCheck(checks, snapshot.requiredRuntime.resourceLinkDispositionRequired === true, 'selected videos require link disposition before scoping', YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID)
  addCheck(checks, snapshot.liveExtractionStarted === false && snapshot.externalWrites === false && snapshot.proposalOnly === true, 'proof does not start extraction or write externally', `${snapshot.liveExtractionStarted}/${snapshot.externalWrites}/${snapshot.proposalOnly}`)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
    checks,
    failures,
    snapshot: {
      status: snapshot.status,
      counts: snapshot.counts,
      selectedByCreator: snapshot.selectedByCreator,
      selectedVideos: snapshot.selectedVideos.map(video => ({
        videoId: video.videoId,
        title: video.title,
        creatorId: video.creatorId,
        creator: video.creator,
        rank: video.rank,
        url: video.url,
        relevanceScore: video.buildIntelRelevance.score,
        titlePositiveTerms: video.buildIntelRelevance.titlePositiveTerms,
        positiveTerms: video.buildIntelRelevance.positiveTerms,
      })),
      standardFullWatchRiskRoutedOut: snapshot.standardFullWatchRiskRoutedOut.map(video => ({
        videoId: video.videoId,
        title: video.title,
        creatorId: video.creatorId,
        creator: video.creator,
        rank: video.rank,
        url: video.url,
        reasons: video.standardFullWatchRiskReasons,
      })),
      nextAction: snapshot.nextAction,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('YouTube Latest-20 Intel Run check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
