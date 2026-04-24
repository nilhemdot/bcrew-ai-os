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
    status: 'planned',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: { windowHours: 48, cursorType: 'drive_modified_time_window' },
    budget: { maxItemsPerRun: 50, maxRuntimeSeconds: 900, llmBudget: 'none' },
    dedupePolicy: { key: 'drive_file_id', idempotent: true },
    metadata: { foundationJobKey: 'meeting-notes-sync-current', sourceScript: 'meeting-notes:sync', gapJobKey: 'meeting-transcript-gaps' },
    notes: 'Keeps new meeting notes/transcripts current while old Zoom/Drive history is processed separately.',
  },
  {
    targetKey: 'slack-current-day',
    sourceId: 'SRC-SLACK-001',
    title: 'Slack current-day sync lane',
    lane: 'current_day',
    targetType: 'slack_recent_threads_window',
    status: 'planned',
    priority: 'P1',
    runtimeMode: 'manual',
    cursorState: { windowHours: 48, cursorType: 'slack_ts_window' },
    budget: { maxItemsPerRun: 100, maxRuntimeSeconds: 600, llmBudget: 'none' },
    dedupePolicy: { key: 'channel_id:thread_ts', idempotent: true },
    metadata: { foundationJobKey: 'slack:sync-archive' },
    notes: 'Current Slack signal only; historical Slack should be bounded by channel and date range.',
  },
  {
    targetKey: 'drive-corpus-backfill',
    sourceId: 'SRC-GDRIVE-001',
    title: 'Google Drive corpus backfill lane',
    lane: 'backfill',
    targetType: 'drive_folder_bites',
    status: 'planned',
    priority: 'P1',
    runtimeMode: 'manual',
    cursorState: { cursorType: 'folder_queue', inspectedFolders: 0 },
    budget: { maxFoldersPerRun: 1, maxItemsPerRun: 100, maxRuntimeSeconds: 1200, llmBudget: 'limited_after_archive' },
    dedupePolicy: { key: 'drive_file_id:modified_time', idempotent: true },
    metadata: { backlogIds: ['EXTRACT-BACKFILL-001'], promotionGate: 'folder target list and copyright/use boundaries' },
    notes: 'One bounded Drive bite at a time. This is where old shared-drive folders and training assets get organized without blocking current-day sync.',
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
    budget: { maxItemsPerRun: 25, maxRuntimeSeconds: 900, llmBudget: 'limited_after_access' },
    dedupePolicy: { key: 'skool_object_url_or_id', idempotent: true },
    metadata: { backlogIds: ['SKOOL-001'], blockedBy: 'Need official API/export/browser-crawler decision and content-use boundary.' },
    notes: 'Do not crawl Skool blindly. Validate access path and content-use rules first.',
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
    budget: { maxItemsPerRun: 10, maxRuntimeSeconds: 900, llmBudget: 'limited' },
    dedupePolicy: { key: 'report_path:content_hash', idempotent: true },
    metadata: { backlogIds: ['REPORT-MINING-001'], output: 'synthesis shape patterns and reusable atoms' },
    notes: 'Mine scout/director/executive/marketing reports for useful output patterns, not to recreate the old swarm.',
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
    budget: { maxFilesPerRun: 5, maxRuntimeSeconds: 1800, llmBudget: 'transcription_api_or_local' },
    dedupePolicy: { key: 'file_path:size:modified_time', idempotent: true },
    metadata: { foundationJobKey: 'zoom:transcribe-audio', promotionGate: 'Only resume if strategy/content value justifies transcription cost.' },
    notes: 'Historical Zoom is useful but not the current bottleneck. Keep paused unless Steve explicitly reopens it.',
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
