#!/usr/bin/env node

import crypto from 'node:crypto'
import process from 'node:process'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  upsertSourceCrawlItem,
} from '../lib/foundation-source-crawl-db.js'
import {
  upsertSharedCommunicationArtifact,
} from '../lib/foundation-shared-comms-db.js'
import { listCalendarEvents } from '../lib/google-delegated.js'

const SOURCE_ID = 'SRC-GCAL-001'
const CONNECTOR_ID = 'CONN-GCAL-001'
const DEFAULT_TARGET_KEY = 'calendar-current-day'
const DEFAULT_USER_EMAIL = process.env.GOOGLE_CALENDAR_SOURCE_USER || process.env.GOOGLE_IMPERSONATE_EMAIL || 'ai@bensoncrew.ca'

function parseArgs(argv = process.argv.slice(2)) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    const normalizedKey = String(key || '').replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase())
    result[normalizedKey] = value ?? true
  }
  return result
}

function boolValue(value) {
  return value === true || value === 'true'
}

function positiveNumber(value, fallback, { min = 1, max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function stableExternalId(calendarId, event = {}) {
  return `${calendarId}:${event.id || sha256(JSON.stringify(event)).slice(0, 24)}`
}

function artifactIdFor(calendarId, event = {}) {
  return `${SOURCE_ID}:event:${sha256(stableExternalId(calendarId, event)).slice(0, 32)}`
}

function itemKeyFor(targetKey, calendarId, event = {}) {
  return `${targetKey}:${sha256(stableExternalId(calendarId, event)).slice(0, 32)}`
}

function safeIso(value) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function buildEventContent(event = {}) {
  return [
    `Calendar event: ${event.summary || '(no title)'}`,
    event.start ? `Start: ${event.start}` : '',
    event.end ? `End: ${event.end}` : '',
    event.location ? `Location: ${event.location}` : '',
    event.organizer ? `Organizer: ${event.organizer}` : '',
    `Attendee count: ${Array.isArray(event.attendees) ? event.attendees.length : 0}`,
    event.status ? `Status: ${event.status}` : '',
  ].filter(Boolean).join('\n')
}

function buildEventMetadata({ calendarId, event, windowStart, windowEnd }) {
  return {
    archiveVersion: 'calendar_event_archive_v1',
    sourceContractId: SOURCE_ID,
    connectorId: CONNECTOR_ID,
    calendarId,
    eventStart: event.start || null,
    eventEnd: event.end || null,
    eventUpdated: event.updated || null,
    eventStatus: event.status || null,
    eventType: event.eventType || null,
    attendeeCount: Array.isArray(event.attendees) ? event.attendees.length : 0,
    organizer: event.organizer || null,
    privacyBoundary: 'No Calendar descriptions, raw notes, invite bodies, or attachments are archived in v1.',
    windowStart,
    windowEnd,
  }
}

async function archiveEvent({ event, userEmail, calendarId, targetKey, crawlRunId, windowStart, windowEnd, actor }) {
  const externalId = stableExternalId(calendarId, event)
  const contentText = buildEventContent(event)
  const artifact = await upsertSharedCommunicationArtifact(
    {
      artifactId: artifactIdFor(calendarId, event),
      sourceId: SOURCE_ID,
      artifactType: 'calendar_event',
      externalId,
      title: event.summary || '(no title)',
      sourceAccount: userEmail,
      sourceContainer: calendarId,
      sourceUrl: event.htmlLink || null,
      participants: Array.isArray(event.attendees) ? event.attendees : [],
      contentText,
      contentHash: sha256(contentText),
      artifactCreatedAt: safeIso(event.start),
      artifactUpdatedAt: safeIso(event.updated) || safeIso(event.end) || safeIso(event.start),
      metadata: buildEventMetadata({ calendarId, event, windowStart, windowEnd }),
    },
    actor,
  )

  await upsertSourceCrawlItem(
    {
      itemKey: itemKeyFor(targetKey, calendarId, event),
      targetKey,
      sourceId: SOURCE_ID,
      externalId,
      itemType: 'calendar_event',
      status: 'succeeded',
      fingerprint: sha256(`${externalId}:${event.updated || event.start || ''}:${contentText}`),
      artifactId: artifact.artifactId,
      sourceCrawlRunId: crawlRunId || null,
      processedAt: new Date().toISOString(),
      metadata: {
        artifactId: artifact.artifactId,
        calendarId,
        eventStart: event.start || null,
        eventEnd: event.end || null,
        eventUpdated: event.updated || null,
        privacyBoundary: 'calendar_event_archive_v1_no_description',
      },
    },
    actor,
  )

  return artifact
}

async function main() {
  const args = parseArgs()
  const dryRun = boolValue(args.dryRun)
  const json = boolValue(args.json)
  const calendarId = String(args.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary').trim()
  const userEmail = String(args.userEmail || DEFAULT_USER_EMAIL).trim()
  const targetKey = String(args.target || args.crawlTarget || DEFAULT_TARGET_KEY).trim()
  const actor = String(args.actor || 'calendar-sync-events').trim()
  const crawlRunId = String(args.crawlRunId || process.env.EXTRACTION_CRAWL_RUN_ID || '').trim()
  const limit = positiveNumber(args.limit, 50, { min: 1, max: 250 })
  const windowHours = positiveNumber(args.windowHours, 72, { min: 1, max: 24 * 31 })
  const lookbackHours = positiveNumber(args.lookbackHours, 24, { min: 0, max: 24 * 31 })
  const now = new Date()
  const windowStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000).toISOString()

  const events = await listCalendarEvents(userEmail, {
    calendarId,
    timeMin: windowStart,
    timeMax: windowEnd,
    maxResults: limit,
    singleEvents: true,
    orderBy: 'startTime',
  })

  let archived = 0
  let itemFailures = 0
  const artifacts = []

  if (!dryRun) await initFoundationDb()

  for (const event of events) {
    if (dryRun) continue
    try {
      artifacts.push(await archiveEvent({
        event,
        userEmail,
        calendarId,
        targetKey,
        crawlRunId,
        windowStart,
        windowEnd,
        actor,
      }))
      archived += 1
    } catch (error) {
      itemFailures += 1
      console.error(`Calendar event archive failed: ${event.id || 'missing-id'} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const summary = {
    ok: itemFailures === 0,
    sourceId: SOURCE_ID,
    connectorId: CONNECTOR_ID,
    targetKey,
    dryRun,
    inspected: events.length,
    archived: dryRun ? 0 : archived,
    extracted: dryRun ? 0 : archived,
    itemFailures,
    artifactIds: artifacts.map(artifact => artifact.artifactId).slice(0, 20),
    cursorState: {
      calendarId,
      windowStart,
      windowEnd,
      latestEventUpdatedAt: events.map(event => safeIso(event.updated)).filter(Boolean).sort().pop() || null,
    },
    metadata: {
      userEmail,
      calendarId,
      eventWindowHours: windowHours,
      eventLookbackHours: lookbackHours,
      privacyBoundary: 'summary/start/end/location/attendees only; no descriptions/raw notes',
      crawlRunId: crawlRunId || null,
    },
  }

  console.log(`Calendar events selected: ${summary.inspected}`)
  console.log(`Calendar events archived: ${summary.archived}`)
  console.log(`Crawl items failed: ${summary.itemFailures}`)
  console.log(`EXTRACTION_TARGET_SUMMARY ${JSON.stringify(summary)}`)
  if (json) console.log(JSON.stringify(summary, null, 2))

  if (itemFailures > 0) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Calendar event sync failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
