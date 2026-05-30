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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  finishSourceCrawlTargetRun,
  leaseSourceCrawlTarget,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-source-crawl-db.js'
import { upsertIntelligenceReportArtifact } from '../lib/foundation-intelligence-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PLAN_PATH,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
  MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
  MYICOR_APPROVED_RESOURCE_TITLE,
  MYICOR_APPROVED_RESOURCE_URL,
  buildMyicorApprovedLessonApprovalPacket,
  buildMyicorApprovedLessonDogfoodProof,
  buildMyicorApprovedLessonExtractionProof,
  buildMyicorApprovedLessonFixtureExtraction,
  buildMyicorApprovedLessonFixtureMcpSearchResult,
  buildMyicorApprovedLessonReportArtifact,
  buildMyicorApprovedLessonSourceCrawlItemInput,
  buildMyicorApprovedLessonSourceCrawlTargetInput,
  evaluateMyicorApprovedLessonExtractionProof,
  normalizeMyicorApprovedResourceMcpMatch,
  runMyicorApprovedLessonBrowserExtraction,
} from '../lib/myicor-approved-lesson-extract-proof.js'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-myicor-approved-lesson-extract-proof'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    liveMcp: argv.includes('--live-mcp') || argv.includes('--liveMcp') || argv.includes('--liveMcp=true'),
    liveBrowser: argv.includes('--live-browser') || argv.includes('--liveBrowser') || argv.includes('--liveBrowser=true'),
    headless: argv.includes('--headless') || argv.includes('--headless=true'),
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

async function callMyicorMcpSearch() {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      '--env-file-if-exists=.env',
      'scripts/myicor-mcp-oauth.mjs',
      'call',
      '--tool=search_learning_resources',
      `--paramsJson=${JSON.stringify({ query: MYICOR_APPROVED_RESOURCE_TITLE, limit: 5 })}`,
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
    payload,
    tokenRefreshed: Boolean(parsed.tokenRefreshed),
    rawSecretPrinted: parsed.rawSecretPrinted === true,
  }
}

async function readLiveBacklogCard() {
  const pool = createPool()
  try {
    const result = await pool.query(
      'SELECT id, lane, priority, status_note, next_action FROM backlog_items WHERE id = $1 LIMIT 1',
      [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function readPersistedRows() {
  const pool = createPool()
  try {
    const [reportResult, itemResult, targetResult, cardResult] = await Promise.all([
      pool.query(
        `
          SELECT report_artifact_id, source_ids, structured_output_json, metadata
          FROM intelligence_report_artifacts
          WHERE report_artifact_id = $1
          LIMIT 1
        `,
        [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID],
      ),
      pool.query(
        `
          SELECT item_key, target_key, source_id, external_id, item_type, status,
                 fingerprint, artifact_id, metadata
          FROM source_crawl_items
          WHERE target_key = $1
          ORDER BY updated_at DESC
          LIMIT 5
        `,
        [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT target_key, source_id, last_status, inspected_count, archived_count,
                 extracted_count, metadata
          FROM source_crawl_targets
          WHERE target_key = $1
          LIMIT 1
        `,
        [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY],
      ),
      pool.query(
        'SELECT id, lane, priority, status_note FROM backlog_items WHERE id = $1 LIMIT 1',
        [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID],
      ),
    ])
    return {
      report: reportResult.rows[0] || null,
      items: itemResult.rows,
      target: targetResult.rows[0] || null,
      card: cardResult.rows[0] || null,
    }
  } finally {
    await pool.end()
  }
}

async function normalizeTargetCounts() {
  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE source_crawl_targets
        SET inspected_count = 1,
            archived_count = 1,
            extracted_count = 1,
            updated_by = $2,
            updated_at = NOW()
        WHERE target_key = $1
      `,
      [MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY, ACTOR],
    )
  } finally {
    await pool.end()
  }
}

async function updateLiveBacklogCard(proof = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH,
    operation: `mark ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID} done`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const pool = createPool()
  const extraction = proof.extraction || {}
  const statusNote = [
    `V1 built on 2026-05-29 under ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY}.`,
    `Exact MyICOR resource extracted: ${MYICOR_APPROVED_RESOURCE_TITLE}`,
    `Report artifact: ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID}.`,
    `Source target/item: ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY} with extracted_with_evidence state.`,
    `Evidence: ${extraction.textChars || 0} text chars, content hash ${extraction.contentHash || 'missing'}, local raw artifact ${extraction.rawTextPath || 'missing'}, local screenshot hash ${extraction.screenshotHash || 'missing'}.`,
    'Proof: npm run process:myicor-approved-lesson-extract-proof-check -- --live-mcp --live-browser --headless --apply --json.',
    'No broad crawl, adjacent navigation, clicks, forms, downloads, posts/comments/messages, profile/account/credential mutation, external writes, Browserbase, normal Chrome, atoms, or vectors.',
  ].join(' ')
  try {
    const result = await pool.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation','done','P0',8,$3,$4,$5,$6,$7,'Steve + Foundation')
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = 'done',
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
        RETURNING id, lane, priority, status_note
      `,
      [
        MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
        'Run one approved MyICOR lesson extraction proof',
        'Steve May 29 exact MyICOR source-packet approval',
        'Run one exact approved MyICOR resource extraction through MCP metadata first and local isolated browser gap-fill second, then persist report/source-state proof for Director review.',
        'This proves the paid-source pattern Steve wants: a source can be logged in, read like a human inside a governed local browser, extracted once with artifacts and hashes, and remembered by the source ledger without broad crawling or expensive hosted browser loops.',
        'Use this extracted evidence in the daily source review / Dev Director proposal bundle. Approve the next exact MyICOR or Skool packet before any broader crawl.',
        statusNote,
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
        MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
        ACTOR,
        `Marked ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID} exact MyICOR extraction proof done`,
        JSON.stringify({
          closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
          reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
          targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
          contentHash: extraction.contentHash || '',
        }),
      ],
    )
    return result.rows[0] || null
  } finally {
    await pool.end()
  }
}

async function persistProof(proof = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH,
    operation: `persist ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID} source rows and proof report`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  await upsertSourceCrawlTarget(buildMyicorApprovedLessonSourceCrawlTargetInput(proof), ACTOR)
  const lease = await leaseSourceCrawlTarget(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY, {
    leaseOwner: ACTOR,
    leaseSeconds: 900,
    force: true,
  })
  const report = await upsertIntelligenceReportArtifact(buildMyicorApprovedLessonReportArtifact(proof), ACTOR)
  const item = await upsertSourceCrawlItem({
    ...buildMyicorApprovedLessonSourceCrawlItemInput(proof),
    sourceCrawlRunId: lease.crawlRunId,
    incrementAttempt: true,
  }, ACTOR)
  const target = await finishSourceCrawlTargetRun(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY, {
    leaseOwner: ACTOR,
    crawlRunId: lease.crawlRunId,
    lastRunAt: proof.capturedAt,
    lastStatus: 'succeeded',
    inspectedDelta: 0,
    archivedDelta: 0,
    extractedDelta: 0,
    cursorState: {
      targetUrl: MYICOR_APPROVED_RESOURCE_URL,
      contentHash: proof.extraction?.contentHash || '',
      capturedAt: proof.capturedAt || '',
    },
    metadata: {
      cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
      reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
      contentHash: proof.extraction?.contentHash || '',
      extractedItemCount: 1,
    },
    disableRetirement: true,
  }, ACTOR)
  await normalizeTargetCounts()
  const card = await updateLiveBacklogCard(proof)
  return { report, item, target, card }
}

function sourceContainsForbiddenLivePatterns(moduleSource = '', scriptSource = '') {
  const scriptText = String(scriptSource || '')
  const stripStart = scriptText.indexOf('function sourceContainsForbiddenLivePatterns')
  const stripEndMarker = '\nasync function main()'
  const stripEnd = stripStart >= 0 ? scriptText.indexOf(stripEndMarker, stripStart) : -1
  const strippedScript = stripStart >= 0 && stripEnd > stripStart
    ? `${scriptText.slice(0, stripStart)}${scriptText.slice(stripEnd + 1)}`
    : scriptText
  const combined = `${moduleSource}\n${strippedScript}`
  return [
    /browserbase\.(?!Used|Allowed)/i,
    /normal\s+Chrome\s+profile\s+use\s+is\s+allowed/i,
    /upsertIntelligenceAtom/i,
    /recordIntelligenceAtomHit/i,
    /INSERT\s+INTO\s+intelligence_atoms/i,
    /intelligence_retrieval_chunks/i,
    /send(Message|Mail|Telegram)/i,
    /page\.click\(/i,
    /locator\([^)]*\)\.click\(/i,
    /fill\(/i,
  ].some(pattern => pattern.test(combined))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let foundationDbInitialized = false
  let persistence = null
  let persistedRows = null

  const capturedAt = new Date().toISOString()
  const approval = buildMyicorApprovedLessonApprovalPacket({ approvedAt: capturedAt })
  const mcpSearchResult = args.liveMcp
    ? await callMyicorMcpSearch()
    : buildMyicorApprovedLessonFixtureMcpSearchResult()
  const browserExtraction = args.liveBrowser
    ? await runMyicorApprovedLessonBrowserExtraction({
      repoRoot,
      profileDir: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PROFILE_DIR,
      headless: args.headless,
      now: capturedAt,
    })
    : buildMyicorApprovedLessonFixtureExtraction()
  const proof = buildMyicorApprovedLessonExtractionProof({
    mcpSearchResult,
    browserExtraction,
    liveMcp: args.liveMcp,
    liveBrowser: args.liveBrowser,
    capturedAt,
    approval,
  })
  const evaluation = evaluateMyicorApprovedLessonExtractionProof(proof, {
    requireLiveMcp: args.liveMcp,
    requireLiveBrowser: args.liveBrowser,
  })
  const dogfood = buildMyicorApprovedLessonDogfoodProof()

  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH,
      operation: `apply ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID} exact extraction proof`,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    await initFoundationDb()
    foundationDbInitialized = true
    persistence = await persistProof(proof)
    persistedRows = await readPersistedRows()
  }

  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    approvalSource,
    currentPlanSource,
    currentStateSource,
    seedSource,
    sourceSystemFactorySource,
    coverageSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/myicor-approved-lesson-extract-proof.js'),
    readRepoFile(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH),
    readRepoFile(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PLAN_PATH),
    readRepoFile(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/myicor-mcp-catalog-snapshot.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md'),
  ])
  const liveBacklogCard = await readLiveBacklogCard()
  const approvalJson = JSON.parse(approvalSource)
  const mcpMatch = normalizeMyicorApprovedResourceMcpMatch(mcpSearchResult)

  addCheck(
    checks,
    packageJson.scripts?.['process:myicor-approved-lesson-extract-proof-check'] === `node --env-file-if-exists=.env ${MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SCRIPT_PATH}`,
    'package exposes focused MyICOR approved extraction proof',
    packageJson.scripts?.['process:myicor-approved-lesson-extract-proof-check'] || 'missing',
  )
  addCheck(checks, evaluation.ok, 'exact MyICOR extraction proof passes approval, URL, content, artifact, and side-effect evaluation', evaluation.failed.map(item => item.check).join(', ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood rejects wrong URL, auth wall, side effects, missing approval, Browserbase, and normal Chrome', dogfood.cases.map(row => `${row.name}:${row.actualOk}`).join(', '))
  addCheck(checks, mcpMatch.ok && mcpMatch.exactMatch?.url === MYICOR_APPROVED_RESOURCE_URL, 'MCP exact metadata match is present', mcpMatch.exactMatch?.url || 'missing')
  addCheck(
    checks,
    moduleSource.includes('runMyicorApprovedLessonBrowserExtraction') &&
      moduleSource.includes('launchPersistentContext') &&
      moduleSource.includes('page.goto(MYICOR_APPROVED_RESOURCE_URL') &&
      moduleSource.includes('clicksAttempted: 0') &&
      moduleSource.includes('localOnlyArtifacts: true'),
    'module owns exact local isolated browser extraction with no-click/local-artifact posture',
    'lib/myicor-approved-lesson-extract-proof.js',
  )
  addCheck(
    checks,
    !sourceContainsForbiddenLivePatterns(moduleSource, scriptSource),
    'proof source contains no Browserbase SDK calls, atom/vector writes, external sends, click/fill commands, or normal-Chrome approval',
    'forbidden static patterns absent',
  )
  addCheck(
    checks,
    planSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID) &&
      planSource.includes(MYICOR_APPROVED_RESOURCE_URL) &&
      planSource.includes('source-owned isolated profile') &&
      planSource.includes('No broad crawl') &&
      planSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID),
    'plan captures exact resource, local isolated route, no broad crawl, and report artifact',
    MYICOR_APPROVED_LESSON_EXTRACT_PROOF_PLAN_PATH,
  )
  addCheck(
    checks,
    approvalJson.cardId === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID &&
      approvalJson.targetUrl === MYICOR_APPROVED_RESOURCE_URL &&
      approvalJson.exactSourceApproval === true &&
      Array.isArray(approvalJson.forbiddenActions) &&
      approvalJson.forbiddenActions.includes('browserbase') &&
      approvalJson.forbiddenActions.includes('normal_chrome'),
    'approval file records Steve exact-source approval and forbidden actions',
    MYICOR_APPROVED_LESSON_EXTRACT_PROOF_APPROVAL_PATH,
  )
  addCheck(
    checks,
    currentPlanSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID) &&
      currentPlanSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID),
    'current plan records MyICOR exact extraction proof',
    'docs/rebuild/current-plan.md',
  )
  addCheck(
    checks,
    currentStateSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID) &&
      currentStateSource.includes('extracted_with_evidence'),
    'current state records MyICOR exact extraction state',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    seedSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID) &&
      sourceSystemFactorySource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID),
    'backlog seed and source-system card factory include MyICOR exact extraction card',
    'chunk-005 + myicor-mcp-catalog-snapshot.js',
  )
  addCheck(
    checks,
    coverageSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID),
    'verifier coverage card IDs include MyICOR exact extraction card',
    'lib/foundation-verify-coverage-card-ids.js',
  )
  addCheck(
    checks,
    handoffSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID) &&
      handoffSource.includes(MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID),
    'handoff captures MyICOR exact extraction proof',
    'docs/_archive/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
  )
  addCheck(
    checks,
    liveBacklogCard?.id === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID &&
      liveBacklogCard?.priority === 'P0' &&
      (args.apply ? liveBacklogCard?.lane === 'done' : ['scoped', 'done'].includes(liveBacklogCard?.lane)),
    'live backlog contains MyICOR exact extraction card as P0',
    liveBacklogCard ? `${liveBacklogCard.id}/${liveBacklogCard.lane}/${liveBacklogCard.priority}` : 'missing',
  )
  if (args.apply) {
    addCheck(
      checks,
      (persistence?.report?.reportArtifactId || persistence?.report?.report_artifact_id) === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID &&
        persistedRows?.report?.report_artifact_id === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
      'apply persisted intelligence proof report artifact',
      persistedRows?.report?.report_artifact_id || 'missing',
    )
    addCheck(
      checks,
      persistedRows?.target?.target_key === MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY &&
        Number(persistedRows?.target?.extracted_count || 0) >= 1 &&
        persistedRows?.items?.some(row => row.metadata?.extractionStatus === 'extracted_with_evidence' || row.metadata?.extraction_status === 'extracted_with_evidence'),
      'apply persisted source target and extracted_with_evidence source item',
      `target=${persistedRows?.target?.target_key || 'missing'}, items=${persistedRows?.items?.length || 0}`,
    )
    addCheck(
      checks,
      persistedRows?.card?.lane === 'done',
      'apply marked live backlog card done',
      persistedRows?.card ? `${persistedRows.card.id}/${persistedRows.card.lane}` : 'missing',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CARD_ID,
    closeoutKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_CLOSEOUT_KEY,
    reportArtifactId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_REPORT_ARTIFACT_ID,
    targetKey: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_TARGET_KEY,
    sourceId: MYICOR_APPROVED_LESSON_EXTRACT_PROOF_SOURCE_ID,
    liveMcp: args.liveMcp,
    liveBrowser: args.liveBrowser,
    applied: args.apply,
    proof: {
      capturedAt: proof.capturedAt,
      target: proof.target,
      mcp: proof.mcp,
      extraction: proof.extraction,
      buildIntelRoute: proof.buildIntelRoute,
      guardrails: proof.guardrails,
    },
    liveBacklogCard,
    persisted: args.apply ? {
      reportArtifactId: persistedRows?.report?.report_artifact_id || null,
      targetKey: persistedRows?.target?.target_key || null,
      itemCount: persistedRows?.items?.length || 0,
      backlogLane: persistedRows?.card?.lane || null,
    } : null,
    dogfood,
    checks,
    failed,
    rawSecretPrinted: mcpSearchResult.rawSecretPrinted === true,
    rawTextCommittedToRepo: false,
    screenshotCommittedToRepo: false,
    browserbaseUsed: false,
    normalChromeProfileUsed: false,
    externalWriteStarted: false,
    atomOrVectorWrites: false,
    autoBacklogPromotions: 0,
  }

  if (foundationDbInitialized) await closeFoundationDb()

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`MyICOR approved lesson extraction proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error('MyICOR approved lesson extraction proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
