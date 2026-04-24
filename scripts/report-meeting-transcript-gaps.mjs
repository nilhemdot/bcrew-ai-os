#!/usr/bin/env node

import process from 'node:process';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.BCREW_DB_HOST || '/tmp',
  database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
  user: process.env.BCREW_DB_USER || process.env.USER,
});

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function clampLimit(value) {
  return Math.min(50, Math.max(1, Number(value || 15)));
}

function printTable(title, rows, formatRow) {
  console.log(title);
  if (!rows.length) {
    console.log('  (none)');
    return;
  }

  for (const row of rows) {
    console.log(`  ${formatRow(row)}`);
  }
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return 'n/a';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'n/a';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).formatToParts(date).map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
}

function parseMeetingDateFromTitle(title) {
  const match = String(title || '').match(/(?: - |started )(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}) ([A-Z]{2,4}) - Notes by Gemini$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, timezone] = match;
  const offsetHours = timezone === 'EST' ? 5 : timezone === 'EDT' ? 4 : 0;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) + offsetHours,
    Number(minute),
  ));
}

function stripSeriesTitle(title) {
  return String(title || '(unknown)')
    .replace(/^Notes by Gemini: /, '')
    .replace(/ - \d{4}\/\d{2}\/\d{2}.*$/, '')
    .trim() || '(unknown)';
}

function getMeetingDate(row) {
  return parseMeetingDateFromTitle(row.note_title) || toDate(row.note_updated_at) || toDate(row.note_ingested_at);
}

function getMeetingDateBasis(row) {
  return parseMeetingDateFromTitle(row.note_title) ? 'title' : 'updated_at';
}

function getTranscriptSource(row) {
  if (row.has_transcript) return row.transcript_sources?.filter(Boolean).join(', ') || 'transcript_artifact';
  return row.note_metadata?.transcriptSource || 'missing';
}

function normalizeMeetingRow(row) {
  const meetingDate = getMeetingDate(row);
  return {
    ...row,
    meeting_date: meetingDate,
    meeting_date_basis: getMeetingDateBasis(row),
    series_title: stripSeriesTitle(row.note_title),
    transcript_source: getTranscriptSource(row),
    missing_transcript: !row.has_transcript,
  };
}

function daysAgo(days) {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
}

function parseSince(args) {
  if (args.since) {
    const since = new Date(`${args.since}T00:00:00-04:00`);
    if (!Number.isNaN(since.getTime())) return since;
  }
  return daysAgo(Math.max(1, Number(args.days || 14)));
}

function summarizeMeetings(rows) {
  return {
    meetings: rows.length,
    withTranscript: rows.filter(row => row.has_transcript).length,
    missingTranscript: rows.filter(row => row.missing_transcript).length,
  };
}

function ownerRows(rows) {
  const byOwner = new Map();
  for (const row of rows) {
    const owner = row.source_account || '(unknown)';
    if (!byOwner.has(owner)) byOwner.set(owner, { source_account: owner, meetings: 0, with_transcript: 0, missing_transcript: 0 });
    const item = byOwner.get(owner);
    item.meetings += 1;
    if (row.has_transcript) item.with_transcript += 1;
    else item.missing_transcript += 1;
  }
  return [...byOwner.values()].sort((a, b) => (
    b.missing_transcript - a.missing_transcript ||
    b.meetings - a.meetings ||
    a.source_account.localeCompare(b.source_account)
  ));
}

function recurringRows(rows, limit) {
  const bySeries = new Map();
  for (const row of rows) {
    const key = `${row.series_title}::${row.source_account || '(unknown)'}::${row.meeting_class || 'discussion'}`;
    if (!bySeries.has(key)) {
      bySeries.set(key, {
        series_title: row.series_title,
        source_account: row.source_account || '(unknown)',
        meeting_class: row.meeting_class || 'discussion',
        meetings: 0,
        with_transcript: 0,
        missing_transcript: 0,
        first_seen: row.meeting_date,
        last_seen: row.meeting_date,
      });
    }

    const item = bySeries.get(key);
    item.meetings += 1;
    if (row.has_transcript) item.with_transcript += 1;
    else item.missing_transcript += 1;

    if (row.meeting_date && (!item.first_seen || row.meeting_date < item.first_seen)) item.first_seen = row.meeting_date;
    if (row.meeting_date && (!item.last_seen || row.meeting_date > item.last_seen)) item.last_seen = row.meeting_date;
  }

  return [...bySeries.values()]
    .filter(row => row.missing_transcript > 0)
    .sort((a, b) => (
      b.missing_transcript - a.missing_transcript ||
      b.meetings - a.meetings ||
      (toDate(b.last_seen)?.getTime() || 0) - (toDate(a.last_seen)?.getTime() || 0)
    ))
    .slice(0, limit);
}

async function loadMeetingRows() {
  const result = await pool.query(`
    WITH grouped AS (
      SELECT
        COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
        bool_or(artifact_type = 'meeting_transcript') AS has_transcript,
        count(*) FILTER (WHERE artifact_type = 'meeting_transcript') AS transcript_count,
        array_remove(array_agg(DISTINCT metadata->>'transcriptSource') FILTER (WHERE artifact_type = 'meeting_transcript'), NULL) AS transcript_sources
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-MEETINGS-001'
      GROUP BY 1
    ),
    latest_notes AS (
      SELECT DISTINCT ON (COALESCE(metadata->>'meetingKey', external_id))
        COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
        title AS note_title,
        source_account,
        source_url,
        metadata AS note_metadata,
        artifact_updated_at AS note_updated_at,
        ingested_at AS note_ingested_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-MEETINGS-001'
        AND artifact_type = 'meeting_note'
      ORDER BY
        COALESCE(metadata->>'meetingKey', external_id),
        artifact_updated_at DESC NULLS LAST,
        ingested_at DESC
    )
    SELECT
      latest_notes.*,
      grouped.has_transcript,
      grouped.transcript_count,
      grouped.transcript_sources
    FROM latest_notes
    JOIN grouped USING (meeting_key)
    ORDER BY latest_notes.note_updated_at DESC NULLS LAST, latest_notes.note_title ASC
  `);

  return result.rows.map(normalizeMeetingRow);
}

async function loadCoverage() {
  const result = await pool.query(`
    SELECT
      count(*) FILTER (WHERE artifact_type = 'meeting_note') AS notes,
      count(*) FILTER (WHERE artifact_type = 'meeting_transcript') AS transcripts,
      count(DISTINCT COALESCE(metadata->>'meetingKey', external_id)) FILTER (WHERE artifact_type = 'meeting_note') AS distinct_meetings,
      min(artifact_updated_at) AS earliest,
      max(artifact_updated_at) AS latest
    FROM shared_communication_artifacts
    WHERE source_id = 'SRC-MEETINGS-001'
  `);
  return result.rows[0] || {};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = clampLimit(args.limit);
  const since = parseSince(args);
  const [coverage, allRows] = await Promise.all([loadCoverage(), loadMeetingRows()]);
  const recentRows = allRows.filter(row => row.meeting_date && row.meeting_date >= since);
  const recentSummary = summarizeMeetings(recentRows);
  const historicalSummary = summarizeMeetings(allRows);
  const recentMissingRows = recentRows
    .filter(row => row.missing_transcript)
    .sort((a, b) => (b.meeting_date?.getTime() || 0) - (a.meeting_date?.getTime() || 0))
    .slice(0, limit);
  const recentCoveredRows = recentRows
    .filter(row => row.has_transcript)
    .sort((a, b) => (b.meeting_date?.getTime() || 0) - (a.meeting_date?.getTime() || 0))
    .slice(0, limit);

  console.log('Meeting transcript gap report');
  console.log(
    `  Archive coverage: ${Number(coverage.notes || 0)} notes, ${Number(coverage.transcripts || 0)} transcripts, ${Number(coverage.distinct_meetings || 0)} meetings`,
  );
  console.log(`  Archive modified window: ${coverage.earliest || 'n/a'} -> ${coverage.latest || 'n/a'}`);
  console.log(
    `  Historical archive gaps: ${historicalSummary.missingTranscript}/${historicalSummary.meetings} meetings missing transcript artifacts`,
  );

  console.log('');
  console.log(`Recent transcript watch since ${formatDate(since)} by meeting date`);
  console.log(
    `  Recent meetings: ${recentSummary.meetings}; with transcripts: ${recentSummary.withTranscript}; missing transcripts: ${recentSummary.missingTranscript}`,
  );
  console.log('  Note: old meetings modified today are excluded from this recent watch unless the meeting date itself is recent.');

  printTable('Recent meetings missing transcripts', recentMissingRows, row => {
    return `${formatDateTime(row.meeting_date)} | ${row.note_title} | owner ${row.source_account || '(unknown)'} | source ${row.transcript_source}`;
  });

  printTable('Recent meetings confirmed with transcripts', recentCoveredRows, row => {
    return `${formatDateTime(row.meeting_date)} | ${row.note_title} | owner ${row.source_account || '(unknown)'} | source ${row.transcript_source}`;
  });

  console.log('');
  printTable('Historical owners with missing transcripts', ownerRows(allRows), row => {
    return `${row.source_account}: ${row.missing_transcript}/${row.meetings} missing`;
  });

  printTable('Historical recurring meeting series with transcript gaps', recurringRows(allRows, limit), row => {
    return `${row.series_title} | owner ${row.source_account} | ${row.missing_transcript}/${row.meetings} missing | ${row.meeting_class} | ${formatDate(row.first_seen)} -> ${formatDate(row.last_seen)}`;
  });
}

main()
  .catch(error => {
    console.error('Meeting transcript gap report failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
