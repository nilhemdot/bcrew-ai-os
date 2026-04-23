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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.min(50, Math.max(1, Number(args.limit || 15)));

  const [coverageResult, ownerResult, recurringResult, recentMissingResult] = await Promise.all([
    pool.query(`
      SELECT
        count(*) FILTER (WHERE artifact_type = 'meeting_note') AS notes,
        count(*) FILTER (WHERE artifact_type = 'meeting_transcript') AS transcripts,
        count(DISTINCT COALESCE(metadata->>'meetingKey', external_id)) FILTER (WHERE artifact_type = 'meeting_note') AS distinct_meetings,
        min(artifact_updated_at) AS earliest,
        max(artifact_updated_at) AS latest
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-MEETINGS-001'
    `),
    pool.query(`
      WITH meetings AS (
        SELECT
          COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
          max(source_account) FILTER (WHERE artifact_type = 'meeting_note') AS source_account,
          bool_or(artifact_type = 'meeting_transcript') AS has_transcript
        FROM shared_communication_artifacts
        WHERE source_id = 'SRC-MEETINGS-001'
        GROUP BY 1
      )
      SELECT
        COALESCE(source_account, '(unknown)') AS source_account,
        count(*) AS meetings,
        count(*) FILTER (WHERE has_transcript) AS with_transcript,
        count(*) FILTER (WHERE NOT has_transcript) AS missing_transcript
      FROM meetings
      GROUP BY 1
      ORDER BY missing_transcript DESC, meetings DESC, source_account ASC
    `),
    pool.query(
      `
        WITH meetings AS (
          SELECT
            COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
            regexp_replace(
              regexp_replace(max(title) FILTER (WHERE artifact_type = 'meeting_note'), ' - [0-9]{4}/[0-9]{2}/[0-9]{2}.*$', ''),
              '^Notes by Gemini: ',
              ''
            ) AS series_title,
            max(source_account) FILTER (WHERE artifact_type = 'meeting_note') AS source_account,
            max(metadata->>'meetingClass') FILTER (WHERE artifact_type = 'meeting_note') AS meeting_class,
            bool_or(artifact_type = 'meeting_transcript') AS has_transcript,
            max(artifact_updated_at) AS latest_at
          FROM shared_communication_artifacts
          WHERE source_id = 'SRC-MEETINGS-001'
          GROUP BY 1
        )
        SELECT
          COALESCE(series_title, '(unknown)') AS series_title,
          COALESCE(source_account, '(unknown)') AS source_account,
          COALESCE(meeting_class, 'discussion') AS meeting_class,
          count(*) AS meetings,
          count(*) FILTER (WHERE has_transcript) AS with_transcript,
          count(*) FILTER (WHERE NOT has_transcript) AS missing_transcript,
          min(latest_at) AS first_seen,
          max(latest_at) AS last_seen
        FROM meetings
        GROUP BY 1, 2, 3
        HAVING count(*) FILTER (WHERE NOT has_transcript) > 0
        ORDER BY missing_transcript DESC, meetings DESC, last_seen DESC NULLS LAST
        LIMIT $1
      `,
      [limit],
    ),
    pool.query(
      `
        WITH meetings AS (
          SELECT
            COALESCE(metadata->>'meetingKey', external_id) AS meeting_key,
            max(title) FILTER (WHERE artifact_type = 'meeting_note') AS note_title,
            max(artifact_updated_at) AS latest_at,
            max(source_account) FILTER (WHERE artifact_type = 'meeting_note') AS source_account,
            max(metadata->>'meetingClass') FILTER (WHERE artifact_type = 'meeting_note') AS meeting_class,
            bool_or(artifact_type = 'meeting_transcript') AS has_transcript
          FROM shared_communication_artifacts
          WHERE source_id = 'SRC-MEETINGS-001'
          GROUP BY 1
        )
        SELECT
          COALESCE(note_title, '(unknown)') AS note_title,
          COALESCE(source_account, '(unknown)') AS source_account,
          COALESCE(meeting_class, 'discussion') AS meeting_class,
          latest_at
        FROM meetings
        WHERE has_transcript = false
        ORDER BY latest_at DESC NULLS LAST, note_title ASC
        LIMIT $1
      `,
      [limit],
    ),
  ]);

  const coverage = coverageResult.rows[0] || {};

  console.log('Meeting transcript gap report');
  console.log(
    `  Coverage: ${Number(coverage.notes || 0)} notes, ${Number(coverage.transcripts || 0)} transcripts, ${Number(coverage.distinct_meetings || 0)} meetings`,
  );
  console.log(
    `  Window: ${coverage.earliest || 'n/a'} -> ${coverage.latest || 'n/a'}`,
  );

  printTable('Owners with missing transcripts', ownerResult.rows, row => {
    return `${row.source_account}: ${row.missing_transcript}/${row.meetings} missing`;
  });

  printTable('Recurring meeting series with transcript gaps', recurringResult.rows, row => {
    const firstSeen = row.first_seen ? String(row.first_seen).slice(0, 10) : 'n/a';
    const lastSeen = row.last_seen ? String(row.last_seen).slice(0, 10) : 'n/a';
    return `${row.series_title} | owner ${row.source_account} | ${row.missing_transcript}/${row.meetings} missing | ${row.meeting_class} | ${firstSeen} -> ${lastSeen}`;
  });

  printTable('Most recent meetings missing transcripts', recentMissingResult.rows, row => {
    const latestAt = row.latest_at
      ? new Date(row.latest_at).toISOString().replace('T', ' ').slice(0, 16)
      : 'n/a';
    return `${latestAt} | ${row.note_title} | owner ${row.source_account} | ${row.meeting_class}`;
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
