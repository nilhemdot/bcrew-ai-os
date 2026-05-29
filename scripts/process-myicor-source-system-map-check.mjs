#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  MYICOR_SOURCE_SYSTEM_MAP_CARD_ID,
  MYICOR_SOURCE_SYSTEM_MAP_PLAN_PATH,
  MYICOR_SOURCE_SYSTEM_MAP_SCRIPT_PATH,
  buildMyicorSourceSystemMap,
  evaluateMyicorSourceSystemMap,
} from '../lib/myicor-source-system-map.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-myicor-source-system-map'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    }),
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

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function buildBacklogCard() {
  return {
    id: MYICOR_SOURCE_SYSTEM_MAP_CARD_ID,
    title: 'Map MyICOR as a connector-first source system',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 8,
    source: 'Steve May 29 MyICOR source-system correction',
    summary: 'Build the MyICOR source-system map under Human Web Agent V1: MCP catalog first, visible local isolated browser only for approved MCP gaps, course/lesson/progress/resource state, fingerprint/delta monitoring, grade/keep/ignore decisions, and Dev Director proposal routing.',
    whyItMatters: 'MyICOR appears to contain high-value AIOS, agent, memory, MCP, Claude, workflow, and myPKA system material. AIOS needs the source as a maintained system, not a one-time manual browse or blind paid-course scrape.',
    nextAction: 'Run the source-system map proof, then promote MYICOR-MCP-CATALOG-SNAPSHOT-001 for persisted MCP catalog/delta state. Actual lesson extraction stays in MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001 with one exact approved lesson at a time.',
    statusNote: 'Scoped as source-system map only. MCP catalog first; visible browser only for approved content gaps; no broad crawl, lesson content extraction, Browserbase, or normal Chrome profile use.',
    owner: 'Steve + Foundation',
  }
}

async function upsertLiveBacklogCard() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MYICOR_SOURCE_SYSTEM_MAP_SCRIPT_PATH,
    operation: `upsert ${MYICOR_SOURCE_SYSTEM_MAP_CARD_ID} backlog card`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const card = buildBacklogCard()
  try {
    await pool.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [
        card.id,
        card.title,
        card.team,
        card.lane,
        card.priority,
        card.rank,
        card.source,
        card.summary,
        card.whyItMatters,
        card.nextAction,
        card.statusNote,
        card.owner,
      ],
    )
    await pool.query(
      `
        INSERT INTO change_events (
          event_type, entity_table, entity_id, actor, summary, metadata
        )
        VALUES ('backlog_updated', 'backlog_items', $1, $2, $3, $4::jsonb)
      `,
      [
        card.id,
        ACTOR,
        `Upserted ${card.id} MyICOR source-system map card`,
        JSON.stringify({
          planRef: MYICOR_SOURCE_SYSTEM_MAP_PLAN_PATH,
          proofCommand: 'npm run process:myicor-source-system-map-check -- --json',
        }),
      ],
    )
  } finally {
    await pool.end()
  }
}

async function readLiveBacklogCard() {
  const pool = createPool()
  try {
    const result = await pool.query(
      'SELECT id, lane, priority FROM backlog_items WHERE id = $1',
      [MYICOR_SOURCE_SYSTEM_MAP_CARD_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

function sourceContainsUnsafeLiveExtraction(source = '') {
  return [
    /playwright\.chromium\.launch/i,
    /page\.goto/i,
    /fetch\s*\(\s*['"]https:\/\/app\.myicor\.com\/lessons/i,
    /readKeychainPassword/i,
    /storeKeychainPassword/i,
    /INSERT\s+INTO\s+intelligence_atoms/i,
    /intelligence_retrieval_chunks/i,
    /send(Message|Mail|Telegram)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  if (args.apply) await upsertLiveBacklogCard()
  const checks = []
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    currentPlanSource,
    currentStateSource,
    seedSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/myicor-source-system-map.js'),
    readRepoFile(MYICOR_SOURCE_SYSTEM_MAP_SCRIPT_PATH),
    readRepoFile(MYICOR_SOURCE_SYSTEM_MAP_PLAN_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
  ])

  const snapshot = buildMyicorSourceSystemMap()
  const evaluation = evaluateMyicorSourceSystemMap(snapshot)
  const liveCard = await readLiveBacklogCard()

  addCheck(
    checks,
    packageJson.scripts?.['process:myicor-source-system-map-check'] === `node --env-file-if-exists=.env ${MYICOR_SOURCE_SYSTEM_MAP_SCRIPT_PATH}`,
    'package exposes focused MyICOR source-system map proof',
    packageJson.scripts?.['process:myicor-source-system-map-check'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'MyICOR source-system map passes connector-first, stateful, Director-routed evaluation',
    evaluation.failed.map(item => item.check).join(', ') || 'healthy',
  )
  addCheck(
    checks,
    planSource.includes(MYICOR_SOURCE_SYSTEM_MAP_CARD_ID) &&
      planSource.includes('MCP catalog first') &&
      planSource.includes('visible local isolated browser') &&
      planSource.includes('implemented_cleared') &&
      planSource.includes('MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001') &&
      planSource.includes('SKOOL-SOURCE-SYSTEM-MAP-001'),
    'plan captures MyICOR map, visible browser gap-fill, cleared-state suppression, lesson proof, and Skool reuse',
    MYICOR_SOURCE_SYSTEM_MAP_PLAN_PATH,
  )
  addCheck(
    checks,
    moduleSource.includes('full_lesson_body_or_script') &&
      moduleSource.includes('coaching_call_recording_inventory_if_not_exposed_as_learning_resource') &&
      moduleSource.includes('contentExtractionAllowedInThisSlice: false') &&
      moduleSource.includes('browserbaseAllowed: false') &&
      moduleSource.includes('normalChromeProfileAllowed: false') &&
      moduleSource.includes('suppressClearedItems: true'),
    'module honestly records MCP gaps, no content extraction, no Browserbase/normal Chrome, and cleared-item suppression',
    'lib/myicor-source-system-map.js',
  )
  addCheck(
    checks,
    !sourceContainsUnsafeLiveExtraction(moduleSource) &&
      !scriptSource.split('\n').slice(0, 40).join('\n').includes("from 'playwright'") &&
      !scriptSource.split('\n').slice(0, 40).join('\n').includes('import { chromium') &&
      !scriptSource.split('\n').slice(0, 40).join('\n').includes('credential-vault.js'),
    'focused proof does not open MyICOR, read raw secrets, extract lesson content, write atoms/chunks, or send messages',
    'static unsafe live-extraction patterns absent',
  )
  addCheck(
    checks,
    currentPlanSource.includes(MYICOR_SOURCE_SYSTEM_MAP_CARD_ID) &&
      currentPlanSource.includes('MyICOR Source System Map V1') &&
      currentPlanSource.includes('MCP catalog first') &&
      currentPlanSource.includes('no broad crawl'),
    'current plan names MyICOR Source System Map V1 as the next source-system slice',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(MYICOR_SOURCE_SYSTEM_MAP_CARD_ID) &&
      currentStateSource.includes('connector-first source-system map') &&
      currentStateSource.includes('actual lesson extraction remains approval-bound'),
    'current state names connector-first MyICOR map and keeps lesson extraction approval-bound',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(MYICOR_SOURCE_SYSTEM_MAP_CARD_ID) &&
      seedSource.includes('MCP catalog first') &&
      seedSource.includes('MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001') &&
      seedSource.includes('No broad crawl'),
    'backlog seed contains MyICOR source-system map card with extraction boundary',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    liveCard?.id === MYICOR_SOURCE_SYSTEM_MAP_CARD_ID &&
      liveCard?.lane !== 'done' &&
      liveCard?.priority === 'P0',
    'live backlog contains scoped MyICOR source-system map card',
    liveCard ? `${liveCard.id}/${liveCard.lane}/${liveCard.priority}` : 'missing',
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: MYICOR_SOURCE_SYSTEM_MAP_CARD_ID,
    applied: args.apply,
    liveCard,
    snapshot: {
      sourceId: snapshot.sourceId,
      status: snapshot.status,
      courseCount: snapshot.catalog.courseCount,
      lessonCount: snapshot.catalog.lessonCount,
      themeCounts: snapshot.catalog.themeCounts,
      firstExtractionCandidates: snapshot.firstExtractionCandidates.map(row => ({
        course: row.course,
        lessonId: row.lessonId,
        title: row.title,
        theme: row.theme,
      })),
      mcpGaps: snapshot.mcpCoverage.gaps,
      nextCards: snapshot.nextCards.map(row => row.id),
    },
    checks,
    failed,
    rawSecretPrinted: false,
    externalActionStarted: false,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`MyICOR source-system map proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error('MyICOR source-system map proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
