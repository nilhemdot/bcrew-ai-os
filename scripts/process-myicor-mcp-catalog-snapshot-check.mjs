#!/usr/bin/env node

import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  finishSourceCrawlTargetRun,
  getSourceCrawlItemsByExternalId,
  initFoundationDb,
  leaseSourceCrawlTarget,
  upsertIntelligenceReportArtifact,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
  MYICOR_MCP_CATALOG_SEARCH_QUERIES,
  MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
  MYICOR_MCP_CATALOG_SNAPSHOT_PLAN_PATH,
  MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH,
  MYICOR_MCP_CATALOG_SOURCE_ID,
  MYICOR_MCP_CATALOG_TARGET_KEY,
  SOURCE_SYSTEM_VISION_CARD_IDS,
  buildMyicorMcpCatalogFixtureInput,
  buildMyicorMcpCatalogReportArtifact,
  buildMyicorMcpCatalogSnapshot,
  buildMyicorMcpCatalogSourceCrawlItems,
  buildSourceSystemVisionBacklogCards,
  evaluateMyicorMcpCatalogSnapshot,
} from '../lib/myicor-mcp-catalog-snapshot.js'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-myicor-mcp-catalog-snapshot'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveMcp: argv.includes('--live-mcp') || argv.includes('--liveMcp') || argv.includes('--liveMcp=true'),
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

async function callMyicorMcpTool(tool, params = {}) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      '--env-file-if-exists=.env',
      'scripts/myicor-mcp-oauth.mjs',
      'call',
      `--tool=${tool}`,
      `--paramsJson=${JSON.stringify(params)}`,
      '--json',
    ],
    {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 8,
      env: process.env,
    },
  )
  const parsed = JSON.parse(stdout)
  const rawText = parsed.response?.result?.content?.find(item => item?.type === 'text')?.text || ''
  const payload = rawText ? JSON.parse(rawText) : {}
  return {
    ok: parsed.ok === true,
    tool,
    payload,
    tokenRefreshed: Boolean(parsed.tokenRefreshed),
    rawSecretPrinted: parsed.rawSecretPrinted === true,
  }
}

async function loadLiveMyicorCatalogInput() {
  const courseCall = await callMyicorMcpTool('get_courses', {})
  const courses = courseCall.payload?.courses || []
  const lessonsByCourseId = {}
  for (const course of courses) {
    const courseId = String(course.id || '').trim()
    if (!courseId) continue
    const lessonCall = await callMyicorMcpTool('get_lessons', { course_id: courseId })
    lessonsByCourseId[courseId] = {
      course,
      lessons: lessonCall.payload?.lessons || [],
      returnedCourse: lessonCall.payload?.course || null,
    }
  }
  const resourceSearches = []
  for (const query of MYICOR_MCP_CATALOG_SEARCH_QUERIES) {
    const resourceCall = await callMyicorMcpTool('search_learning_resources', { query, limit: 5 })
    resourceSearches.push({
      query,
      total: resourceCall.payload?.total || 0,
      results: resourceCall.payload?.results || [],
    })
  }
  return {
    courses,
    lessonsByCourseId,
    resourceSearches,
    liveCalls: 1 + courses.length + MYICOR_MCP_CATALOG_SEARCH_QUERIES.length,
  }
}

async function readPriorItemsByExternalId(externalIds = []) {
  if (!externalIds.length) return new Map()
  return getSourceCrawlItemsByExternalId({
    targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
    externalIds,
  })
}

async function upsertLiveBacklogCards() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH,
    operation: 'upsert source-system vision backlog cards',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const cards = buildSourceSystemVisionBacklogCards()
  const pool = createPool()
  try {
    for (const card of cards) {
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
          card.owner || 'Steve + Foundation',
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
          `Upserted ${card.id} source-system vision card`,
          JSON.stringify({
            planRef: MYICOR_MCP_CATALOG_SNAPSHOT_PLAN_PATH,
            proofCommand: 'npm run process:myicor-mcp-catalog-snapshot-check -- --json',
          }),
        ],
      )
    }
  } finally {
    await pool.end()
  }
  return cards
}

async function readLiveBacklogCards(ids = SOURCE_SYSTEM_VISION_CARD_IDS) {
  const pool = createPool()
  try {
    const result = await pool.query(
      'SELECT id, lane, priority FROM backlog_items WHERE id = ANY($1::text[]) ORDER BY id',
      [ids],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function readPersistedSnapshotRows() {
  const pool = createPool()
  try {
    const [reportResult, itemResult, targetResult] = await Promise.all([
      pool.query(
        `
          SELECT report_artifact_id, source_ids, structured_output_json, metadata
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
          LIMIT 1
        `,
        [MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID],
      ),
      pool.query(
        `
          SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE item_type = 'myicor_lesson_metadata')::int AS lessons,
                 count(*) FILTER (WHERE metadata->>'sourceState' = 'changed')::int AS changed
          FROM source_crawl_items
          WHERE target_key = $1
        `,
        [MYICOR_MCP_CATALOG_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT target_key, source_id, last_status, metadata
          FROM source_crawl_targets
          WHERE target_key = $1
          LIMIT 1
        `,
        [MYICOR_MCP_CATALOG_TARGET_KEY],
      ),
    ])
    return {
      report: reportResult.rows[0] || null,
      itemSummary: itemResult.rows[0] || null,
      target: targetResult.rows[0] || null,
    }
  } finally {
    await pool.end()
  }
}

async function normalizeSnapshotTargetCounts({ itemCount }) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        UPDATE source_crawl_targets
        SET inspected_count = $2,
            archived_count = $2,
            extracted_count = 0,
            updated_by = $3,
            updated_at = NOW()
        WHERE target_key = $1
        RETURNING target_key, source_id, title, lane, target_type, status,
                  priority, runtime_mode, cursor_state, budget, dedupe_policy,
                  lease_owner, lease_expires_at, last_run_at, next_run_at,
                  last_status, last_error, inspected_count, archived_count,
                  extracted_count, metadata, notes, updated_by, created_at,
                  updated_at
      `,
      [MYICOR_MCP_CATALOG_TARGET_KEY, Number(itemCount || 0), ACTOR],
    )
    await pool.query(
      `
        INSERT INTO change_events (
          event_type, entity_table, entity_id, actor, summary, metadata
        )
        VALUES ('source_crawl_target_updated', 'source_crawl_targets', $1, $2, $3, $4::jsonb)
      `,
      [
        MYICOR_MCP_CATALOG_TARGET_KEY,
        ACTOR,
        `Normalized ${MYICOR_MCP_CATALOG_TARGET_KEY} target counts to current catalog item count`,
        JSON.stringify({
          cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
          itemCount: Number(itemCount || 0),
          reason: 'idempotent_catalog_snapshot_counts',
        }),
      ],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function persistSnapshot(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH,
    operation: `persist ${MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID} source-state rows and report artifact`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const items = buildMyicorMcpCatalogSourceCrawlItems(snapshot)
  await upsertSourceCrawlTarget({
    targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
    sourceId: MYICOR_MCP_CATALOG_SOURCE_ID,
    title: 'MyICOR MCP catalog snapshot',
    lane: 'corpus_mining',
    targetType: 'connector_catalog',
    status: 'planned',
    priority: 'P0',
    runtimeMode: 'manual',
    budget: {
      llmBudget: 'none',
      maxItemsPerRun: 500,
      maxRuntimeSeconds: 900,
      maxApiCallsPerRun: 25,
      noExternalWrites: true,
      noCrawlUntilApproved: true,
      requiresFiledOutput: true,
    },
    dedupePolicy: {
      externalId: 'kind:id_or_url_hash',
      fingerprint: 'metadata_only',
    },
    metadata: {
      cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      sourceName: 'MyICOR',
      catalogFingerprint: snapshot.catalogFingerprint,
      liveMcp: Boolean(snapshot.liveMcp),
      contentBodyCaptured: false,
      externalWritesAllowed: false,
    },
    notes: 'Metadata-only MCP catalog target. Lesson bodies, videos, screenshots, downloads, atoms, vectors, Browserbase, and normal Chrome are outside this target.',
  }, ACTOR)
  const lease = await leaseSourceCrawlTarget(MYICOR_MCP_CATALOG_TARGET_KEY, {
    leaseOwner: ACTOR,
    leaseSeconds: 900,
    force: true,
  })
  const report = await upsertIntelligenceReportArtifact(buildMyicorMcpCatalogReportArtifact(snapshot), ACTOR)
  const savedItems = []
  for (const item of items) {
    savedItems.push(await upsertSourceCrawlItem({
      ...item,
      sourceCrawlRunId: lease.crawlRunId,
      incrementAttempt: true,
    }, ACTOR))
  }
  const target = await finishSourceCrawlTargetRun(MYICOR_MCP_CATALOG_TARGET_KEY, {
    leaseOwner: ACTOR,
    crawlRunId: lease.crawlRunId,
    lastRunAt: snapshot.capturedAt,
    lastStatus: 'succeeded',
    inspectedDelta: 0,
    archivedDelta: 0,
    extractedDelta: 0,
    cursorState: {
      catalogFingerprint: snapshot.catalogFingerprint,
      capturedAt: snapshot.capturedAt,
      counts: snapshot.counts,
      stateCounts: snapshot.stateCounts,
    },
    metadata: {
      cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      reportArtifactId: MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
      persistedItemCount: savedItems.length,
      contentBodyCaptured: false,
      externalWritesAllowed: false,
    },
    disableRetirement: true,
  }, ACTOR)
  const normalizedTarget = await normalizeSnapshotTargetCounts({ itemCount: items.length })
  return {
    report,
    savedItems,
    target: normalizedTarget || target,
  }
}

function sourceContainsUnsafePatterns(moduleSource = '', scriptSource = '') {
  const scriptText = String(scriptSource || '')
  const stripStart = scriptText.indexOf('function sourceContainsUnsafePatterns')
  const mainMarker = '\nasync function main() {'
  const stripEnd = stripStart >= 0 ? scriptText.indexOf(mainMarker, stripStart) : -1
  const proofFunctionStripped = stripStart >= 0 && stripEnd > stripStart
    ? `${scriptText.slice(0, stripStart)}${scriptText.slice(stripEnd + 1)}`
    : scriptText
  const combined = `${moduleSource}\n${proofFunctionStripped}`
  return [
    /chromium\.launch/i,
    /page\.goto/i,
    /get_note_details/i,
    /get_workstream_details/i,
    /get_trend_report['"`]/i,
    /INSERT\s+INTO\s+intelligence_atoms/i,
    /upsertIntelligenceAtom/i,
    /intelligence_retrieval_chunks/i,
    /send(Message|Mail|Telegram)/i,
    /browserbase\.|browserbase:/i,
    /normal Chrome profile allowed/i,
  ].some(pattern => pattern.test(combined))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let appliedCards = []
  let persistence = null
  let persistedRows = null

  await initFoundationDb()
  try {
    if (args.apply) appliedCards = await upsertLiveBacklogCards()

    const rawInput = args.liveMcp
      ? await loadLiveMyicorCatalogInput()
      : { ...buildMyicorMcpCatalogFixtureInput(), liveCalls: 0 }

    const firstSnapshot = buildMyicorMcpCatalogSnapshot({
      ...rawInput,
      liveMcp: args.liveMcp,
    })
    const externalIds = buildMyicorMcpCatalogSourceCrawlItems(firstSnapshot).map(item => item.externalId)
    const priorItemsByExternalId = await readPriorItemsByExternalId(externalIds)
    const snapshot = buildMyicorMcpCatalogSnapshot({
      ...rawInput,
      liveMcp: args.liveMcp,
      priorItemsByExternalId,
    })
    const evaluation = evaluateMyicorMcpCatalogSnapshot(snapshot, { requireLiveFullCatalog: args.liveMcp })

    if (args.apply) {
      persistence = await persistSnapshot(snapshot)
      persistedRows = await readPersistedSnapshotRows()
    }
    const liveCards = await readLiveBacklogCards()

    const [
      packageJson,
      moduleSource,
      scriptSource,
      planSource,
      scopeSource,
      currentPlanSource,
      currentStateSource,
      seedSource,
      handoffSource,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
      readRepoFile(MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH),
      readRepoFile(MYICOR_MCP_CATALOG_SNAPSHOT_PLAN_PATH),
      readRepoFile('docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md'),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
      readRepoFile('docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
    ])

    addCheck(
      checks,
      packageJson.scripts?.['process:myicor-mcp-catalog-snapshot-check'] === `node --env-file-if-exists=.env ${MYICOR_MCP_CATALOG_SNAPSHOT_SCRIPT_PATH}`,
      'package exposes focused MyICOR MCP catalog snapshot proof',
      packageJson.scripts?.['process:myicor-mcp-catalog-snapshot-check'] || 'missing',
    )
    addCheck(
      checks,
      evaluation.ok,
      'snapshot passes source-system state, MCP-first, and no-content-extraction evaluation',
      evaluation.failed.map(item => item.check).join(', ') || 'healthy',
    )
    addCheck(
      checks,
      !sourceContainsUnsafePatterns(moduleSource, scriptSource),
      'proof does not open browser, read raw private note/tool details, write atoms/vectors, send messages, or mention Browserbase',
      'unsafe static patterns absent',
    )
    addCheck(
      checks,
      planSource.includes(MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID) &&
        planSource.includes('source_crawl_items') &&
        planSource.includes('intelligence_report_artifacts') &&
        planSource.includes('No lesson bodies') &&
        planSource.includes('SOURCE-EXTRACTION-STATE-LEDGER-001'),
      'plan captures persisted source-state rows, report artifact, content boundary, and ledger follow-up',
      MYICOR_MCP_CATALOG_SNAPSHOT_PLAN_PATH,
    )
    addCheck(
      checks,
      SOURCE_SYSTEM_VISION_CARD_IDS.every(id => scopeSource.includes(id)) &&
        scopeSource.includes('daily Dev Director') &&
        scopeSource.includes('not start from scratch'),
      'Human Web Agent sprint scope captures source-system, Skool, Director loop, Dev page truth, and builder memory vision',
      'docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md',
    )
    addCheck(
      checks,
      currentPlanSource.includes(MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID) &&
        currentPlanSource.includes('source-state rows') &&
        currentPlanSource.includes('SKOOL-SOURCE-SYSTEM-MAP-001') &&
        currentPlanSource.includes('BUILDER-MEMORY-SYSTEM-001'),
      'current plan names the snapshot and next source-system/memory cards',
      'docs/rebuild/current-plan.md',
    )
    addCheck(
      checks,
      currentStateSource.includes(MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID) &&
        currentStateSource.includes('source-state ledger') &&
        currentStateSource.includes('Dev Director') &&
        (currentStateSource.includes('not starting from scratch') ||
          currentStateSource.includes('builder-memory:startup-packet:v1')),
      'current state captures source-state ledger, Dev Director loop, and builder memory direction',
      'docs/rebuild/current-state.md',
    )
    addCheck(
      checks,
      SOURCE_SYSTEM_VISION_CARD_IDS.every(id => seedSource.includes(id)),
      'backlog seed contains all source-system vision cards',
      SOURCE_SYSTEM_VISION_CARD_IDS.join(', '),
    )
    addCheck(
      checks,
      handoffSource.includes(MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID) &&
        handoffSource.includes('source-state rows') &&
        handoffSource.includes('builder memory'),
      'handoff captures snapshot proof and broader source-system vision',
      'docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
    )
    addCheck(
      checks,
      liveCards.length === SOURCE_SYSTEM_VISION_CARD_IDS.length &&
        SOURCE_SYSTEM_VISION_CARD_IDS.every(id => liveCards.some(row => row.id === id && row.priority === 'P0')),
      'live backlog contains source-system vision cards as P0 scoped work',
      liveCards.map(row => `${row.id}/${row.lane}/${row.priority}`).join(', ') || 'missing',
    )
    if (args.liveMcp) {
      addCheck(
        checks,
        rawInput.liveCalls >= 20 &&
          snapshot.counts.courseCount >= 15 &&
          snapshot.counts.lessonCount >= 250 &&
          snapshot.counts.resourceCount >= 3,
        'live MCP pass mapped full course/lesson catalog plus learning-resource metadata',
        `calls=${rawInput.liveCalls}, courses=${snapshot.counts.courseCount}, lessons=${snapshot.counts.lessonCount}, resources=${snapshot.counts.resourceCount}`,
      )
    }
    if (args.apply) {
      addCheck(
        checks,
        Boolean(persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id) &&
          persistence?.savedItems?.length === snapshot.counts.totalItemCount,
        'apply persisted report artifact and one source_crawl_items row per catalog item',
        `items=${persistence?.savedItems?.length || 0}/${snapshot.counts.totalItemCount}`,
      )
      addCheck(
        checks,
        persistedRows?.report?.report_artifact_id === MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID &&
          Number(persistedRows?.itemSummary?.total || 0) >= snapshot.counts.totalItemCount &&
          persistedRows?.target?.target_key === MYICOR_MCP_CATALOG_TARGET_KEY,
        'persisted snapshot reads back from report artifact, source items, and target',
        `report=${persistedRows?.report?.report_artifact_id || 'missing'}, items=${persistedRows?.itemSummary?.total || 0}, target=${persistedRows?.target?.target_key || 'missing'}`,
      )
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: MYICOR_MCP_CATALOG_SNAPSHOT_CARD_ID,
      liveMcp: args.liveMcp,
      applied: args.apply,
      appliedCards: appliedCards.map(card => card.id),
      liveCards,
      reportArtifactId: MYICOR_MCP_CATALOG_REPORT_ARTIFACT_ID,
      targetKey: MYICOR_MCP_CATALOG_TARGET_KEY,
      snapshot: {
        sourceId: snapshot.sourceId,
        capturedAt: snapshot.capturedAt,
        counts: snapshot.counts,
        stateCounts: snapshot.stateCounts,
        themeCounts: snapshot.themeCounts,
        catalogFingerprint: snapshot.catalogFingerprint,
        priorityCandidates: snapshot.priorityCandidates.slice(0, 12).map(row => ({
          kind: row.kind,
          courseName: row.courseName || null,
          lessonId: row.lessonId || null,
          title: row.title,
          theme: row.theme,
          priority: row.priority,
          sourceState: row.sourceState,
          url: row.url,
        })),
      },
      persisted: args.apply
        ? {
            reportArtifactId: persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id || null,
            itemCount: persistence?.savedItems?.length || 0,
            targetKey: persistence?.target?.targetKey || persistence?.target?.target_key || null,
            readback: persistedRows,
          }
        : null,
      checks,
      failed,
      rawSecretPrinted: false,
      externalWriteStarted: false,
      lessonContentCaptured: false,
      browserStarted: false,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`MyICOR MCP catalog snapshot proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('MyICOR MCP catalog snapshot proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
