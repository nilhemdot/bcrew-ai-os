#!/usr/bin/env node

import process from 'node:process'
import {
  closeFoundationDb,
  getExtractionControlSnapshot,
  initFoundationDb,
  upsertSourceCrawlTarget,
  withFoundationAdvisoryLock,
} from '../lib/foundation-db.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

const driveCorpusRoots = [
  { name: 'Strategy Folder - Quarterly Strategy and Team Prework', folderId: '1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF', sensitivity: 'strategy_internal' },
  { name: 'Zahnd TEAM OG Folder', folderId: '0AJ4EQ018BaWwUk9PVA', sensitivity: 'internal' },
  { name: 'Zahnd Team 2023+', folderId: '0AE5bQZviXUrhUk9PVA', sensitivity: 'internal' },
  { name: 'MarketMasters training folder', folderId: '0AJZun9Ce_rOnUk9PVA', sensitivity: 'steve_marketmasters' },
  { name: 'Zahnd Team 2025', folderId: '0ADIecWc1lshCUk9PVA', sensitivity: 'internal' },
  { name: 'Houseable', folderId: '0AHpyJsfILw2DUk9PVA', sensitivity: 'steve_owned_sensitive' },
  { name: 'BCrew Marketing Folder', folderId: '0AA5XKa6_SqTuUk9PVA', sensitivity: 'marketing' },
  { name: 'BensonCrew Owners Private', folderId: '0ACJxbgdxfgESUk9PVA', sensitivity: 'owners_private' },
  { name: 'Benson Crew Zahnd Folder', folderId: '0AMaaJPwT3l80Uk9PVA', sensitivity: 'internal' },
]

const extractionTargets = [
  {
    targetKey: 'gmail-current-day',
    sourceId: 'SRC-GMAIL-001',
    title: 'Gmail current-day sync lane',
    lane: 'current_day',
    targetType: 'delegated_mailbox_window',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'scheduled',
    cursorState: { windowHours: 48, query: 'newer_than:2d', cursorType: 'gmail_query_window' },
    budget: { maxItemsPerRun: 25, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'source_account:thread_id', idempotent: true },
    metadata: { foundationJobKey: 'gmail-sync-current', scheduleEveryMinutes: 120, promotionGate: 'item-level ledger proven; monitor first scheduled runs' },
    notes: 'Current-day lane comes before historical Gmail backfill. Scheduled after item-level thread ledger proved zero failures across manual runs.',
  },
  {
    targetKey: 'missive-current-day',
    sourceId: 'SRC-MISSIVE-001',
    title: 'Missive current-day sync lane',
    lane: 'current_day',
    targetType: 'shared_inbox_window',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'scheduled',
    cursorState: { windowHours: 48, cursorType: 'missive_until_cursor' },
    budget: { maxItemsPerRun: 100, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'conversation_id', idempotent: true },
    metadata: { foundationJobKey: 'missive-sync-current', scheduleEveryMinutes: 120, promotionGate: 'rate-limit and cursor behavior clean' },
    notes: 'Priority email lane because Missive carries internal comments/chats inside threads. Scheduled every 2 hours.',
  },
  {
    targetKey: 'meetings-current-day',
    sourceId: 'SRC-MEETINGS-001',
    title: 'Meeting notes current-day sync lane',
    lane: 'current_day',
    targetType: 'drive_meeting_notes_window',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'scheduled',
    cursorState: { windowHours: 48, cursorType: 'drive_modified_time_window' },
    budget: { maxItemsPerRun: 50, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'drive_file_id', idempotent: true },
    metadata: { foundationJobKey: 'meeting-notes-sync-current', sourceScript: 'meeting-notes:sync', gapJobKey: 'meeting-transcript-gaps', scheduleEveryMinutes: 1440 },
    notes: 'Scheduled current-day lane: keeps new meeting notes/transcripts current while old Zoom/Drive history is processed separately.',
  },
  {
    targetKey: 'slack-current-day',
    sourceId: 'SRC-SLACK-001',
    title: 'Slack current-day sync lane',
    lane: 'current_day',
    targetType: 'slack_recent_threads_window',
    status: 'active',
    priority: 'P1',
    runtimeMode: 'scheduled',
    cursorState: { windowHours: 48, cursorType: 'slack_ts_window', messagesPerChannel: 10 },
    budget: { maxItemsPerRun: 100, maxRuntimeSeconds: 600, llmBudget: 'none' },
    dedupePolicy: { key: 'channel_id:thread_ts', idempotent: true },
    metadata: { foundationJobKey: 'slack-sync-current', sourceScript: 'slack:sync-archive', scheduleEveryMinutes: 1440 },
    notes: 'Scheduled current-day lane: current Slack signal only; historical Slack extraction runs as a separate daily quota mission.',
  },
  {
    targetKey: 'drive-corpus-backfill',
    sourceId: 'SRC-GDRIVE-001',
    title: 'Google Drive corpus backfill lane',
    lane: 'backfill',
    targetType: 'drive_folder_bites',
    status: 'active',
    priority: 'P1',
    runtimeMode: 'scheduled',
    cursorState: { cursorType: 'folder_queue', inspectedFolders: 0, rootFolders: driveCorpusRoots },
    budget: {
      missionMode: 'daily_quota',
      missionUnit: 'folder_inventory_bite',
      dailyMissionQuota: 1,
      maxFoldersPerRun: 1,
      maxItemsPerRun: 100,
      maxRuntimeSeconds: 1200,
      llmBudget: 'limited_after_archive',
    },
    dedupePolicy: { key: 'drive_file_id:modified_time', idempotent: true },
    metadata: { foundationJobKey: 'drive-corpus-inventory-bite', scheduleEveryMinutes: 1440, backlogIds: ['DRIVE-CORPUS-001', 'EXTRACTION-TEAM-001'], sourceNote: 'docs/source-notes/google-drive-corpus.md', promotionGate: 'read-only direct-child inventory proof before export/copy/extract', futureExtractionMission: { unit: 'file_outputs', maxPerDay: 5, requiresFiledOutput: true } },
    notes: 'Scheduled daily mission lane, not a blind timer: inventory one bounded Drive bite, then later promote to about five filed Drive extractions per day.',
  },
  {
    targetKey: 'drive-content-extract-backfill',
    sourceId: 'SRC-GDRIVE-001',
    title: 'Google Drive Docs/PDF content extraction lane',
    lane: 'backfill',
    targetType: 'drive_file_content_text',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'scheduled',
    cursorState: { cursorType: 'drive_inventory_content_queue', inventoryTargetKey: 'drive-corpus-backfill' },
    budget: {
      missionMode: 'daily_quota',
      missionUnit: 'drive_text_outputs',
      dailyMissionQuota: 5,
      maxItemsPerRun: 5,
      maxRuntimeSeconds: 3900,
      maxTextChars: 250000,
      maxPdfBytes: 80000000,
      retrySkippedReasonPrefixes: ['pdf_too_large_for_v1'],
      llmBudget: 'none_for_archive',
      requiresFiledOutput: true,
    },
    dedupePolicy: { key: 'drive_file_id:modified_time:extraction_method', idempotent: true },
    metadata: {
      foundationJobKey: 'drive-content-extract-bite',
      scheduleEveryMinutes: 1440,
      backlogIds: ['DRIVE-CONTENT-001', 'EXTRACTION-TEAM-001'],
      sourceNote: 'docs/source-notes/google-drive-corpus.md',
      officialApiBasis: ['Drive files.export for Google Docs', 'Drive files.get alt=media for PDFs/text blobs'],
    },
    notes: 'Scheduled daily mission lane: extract a bounded quota of Google Docs/PDF/text content from the Drive inventory queue into source-backed artifacts. Unsupported files get explicit skip reasons.',
  },
  {
    targetKey: 'skool-corpus-backfill',
    sourceId: 'SRC-SKOOL-001',
    title: 'Skool corpus validation/backfill lane',
    lane: 'corpus_mining',
    targetType: 'skool_course_posts_videos',
    status: 'blocked',
    priority: 'P2',
    runtimeMode: 'paused',
    cursorState: { cursorType: 'access_validation_required' },
    budget: { missionMode: 'daily_quota', missionUnit: 'skool_posts_lessons_or_videos', dailyMissionQuota: 5, maxItemsPerRun: 25, maxRuntimeSeconds: 900, llmBudget: 'limited_after_access', requiresFiledOutput: true },
    dedupePolicy: { key: 'skool_object_url_or_id', idempotent: true },
    metadata: { backlogIds: ['SKOOL-001', 'WEB-CRAWLER-001', 'MULTIMODAL-EXTRACTOR-001'], sourceNote: 'docs/source-notes/skool-corpus.md', blockedBy: 'Need approved export/API/admin path and content-use boundary. Blind scraping is blocked by policy risk.' },
    notes: 'Daily mission lane after approval, not a timer. Do not crawl Skool blindly. Validate access path and content-use rules first.',
  },
  {
    targetKey: 'video-link-inventory',
    sourceId: 'SRC-VIDEO-001',
    title: 'Video/media link inventory lane',
    lane: 'corpus_mining',
    targetType: 'video_url_inventory',
    status: 'planned',
    priority: 'P1',
    runtimeMode: 'manual',
    cursorState: { cursorType: 'archive_scan_offset' },
    budget: { missionMode: 'daily_quota', missionUnit: 'media_links_inventoried', dailyMissionQuota: 1000, maxArtifactsPerRun: 1000, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'normalized_url', idempotent: true },
    metadata: {
      backlogIds: ['VIDEO-001', 'WEB-CRAWLER-001', 'MULTIMODAL-EXTRACTOR-001', 'CREATOR-WATCHLIST-001', 'YOUTUBE-SCOUT-001', 'EXTRACTION-TEAM-001'],
      sourceNote: 'docs/source-notes/video-link-inventory.md',
      blockedBy: 'Platform-specific extraction requires approved access path. Link inventory is safe and local.',
      futureExtractionMission: { unit: 'video_outputs', maxPerDay: 5, requiresFiledOutput: true },
    },
    notes: 'Daily mission lane, not a timer: build the URL manifest in bounded bites before any later five-video-style extraction mission runs.',
  },
  {
    targetKey: 'old-system-report-mining',
    sourceId: 'SRC-GDRIVE-001',
    title: 'Old system report mining lane',
    lane: 'corpus_mining',
    targetType: 'old_intelligence_reports',
    status: 'planned',
    priority: 'P1',
    runtimeMode: 'manual',
    cursorState: { cursorType: 'report_file_queue', inspectedReports: 0 },
    budget: { missionMode: 'daily_quota', missionUnit: 'old_reports_mined', dailyMissionQuota: 10, maxItemsPerRun: 10, maxRuntimeSeconds: 900, llmBudget: 'limited', requiresFiledOutput: true },
    dedupePolicy: { key: 'report_path:content_hash', idempotent: true },
    metadata: { backlogIds: ['REPORT-MINING-001'], output: 'synthesis shape patterns and reusable atoms' },
    notes: 'Daily mission lane, not a timer: mine a quota of old reports, file the useful outputs, then stop.',
  },
  {
    targetKey: 'zoom-audio-recovery-backfill',
    sourceId: 'SRC-MEETINGS-001',
    title: 'Historical Zoom audio recovery lane',
    lane: 'recovery',
    targetType: 'zoom_audio_archive_bites',
    status: 'paused',
    priority: 'P2',
    runtimeMode: 'paused',
    cursorState: { cursorType: 'uploaded_archive_file_queue', recoveredThrough: '2025-03-10 text/chat lane where available' },
    budget: { missionMode: 'daily_quota', missionUnit: 'zoom_audio_files', dailyMissionQuota: 5, maxFilesPerRun: 5, maxRuntimeSeconds: 1800, llmBudget: 'transcription_api_or_local', requiresFiledOutput: true },
    dedupePolicy: { key: 'file_path:size:modified_time', idempotent: true },
    metadata: { foundationJobKey: 'zoom:transcribe-audio', backlogIds: ['ZOOM-RECOVERY-001', 'MULTIMODAL-EXTRACTOR-001'], promotionGate: 'Only resume if strategy/content value justifies transcription cost.' },
    notes: 'Daily mission lane if reopened, not a timer: recover a small quota of filed outputs, then stop. Historical Zoom is useful but not the current bottleneck.',
  },
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withDeadlockRetry(work, { attempts = 3, baseDelayMs = 250 } = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work()
    } catch (error) {
      lastError = error
      const message = String(error?.message || error || '')
      if (!message.toLowerCase().includes('deadlock') || attempt === attempts) {
        throw error
      }
      await sleep(baseDelayMs * attempt)
    }
  }
  throw lastError
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const actor = String(args.actor || 'extraction-control-seed').trim()

  const targets = await withDeadlockRetry(async () => {
    await initFoundationDb()
    return withFoundationAdvisoryLock('extraction_control_seed', async () => {
      const seededTargets = []
      for (const target of extractionTargets) {
        seededTargets.push(await upsertSourceCrawlTarget(target, actor))
      }
      return seededTargets
    })
  })

  const snapshot = await getExtractionControlSnapshot({ limit: 50 })
  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2))
  } else {
    console.log(`Seeded ${targets.length} extraction control targets.`)
    console.log(`${snapshot.summary.currentDayTargets} current-day targets, ${snapshot.summary.backfillTargets} backfill targets, ${snapshot.summary.pausedTargets} paused, ${snapshot.summary.blockedTargets} blocked.`)
  }
}

main()
  .catch(error => {
    console.error('Extraction control seed failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
