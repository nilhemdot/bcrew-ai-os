#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { upsertSourceCrawlItem } from '../lib/foundation-source-crawl-db.js'
import { upsertIntelligenceReportArtifact } from '../lib/foundation-intelligence-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  WEB_GODMODE_LIVE_OPERATOR_APPROVAL_PATH as APPROVAL_PATH,
  WEB_GODMODE_LIVE_OPERATOR_CARD_ID as CARD_ID,
  WEB_GODMODE_LIVE_OPERATOR_CHANGED_FILES as CHANGED_FILES,
  WEB_GODMODE_LIVE_OPERATOR_CHANNEL as CHANNEL,
  WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_KEY as CLOSEOUT_KEY,
  WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_PATH as CLOSEOUT_PATH,
  WEB_GODMODE_LIVE_OPERATOR_COMMANDS as PROOF_COMMANDS,
  WEB_GODMODE_LIVE_OPERATOR_EXTRACTION_TARGET_KEY,
  WEB_GODMODE_LIVE_OPERATOR_NEXT_CARD_ID as NEXT_CARD_ID,
  WEB_GODMODE_LIVE_OPERATOR_NOT_NEXT as NOT_NEXT,
  WEB_GODMODE_LIVE_OPERATOR_PLAN_PATH as PLAN_PATH,
  WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
  WEB_GODMODE_LIVE_OPERATOR_SCRIPT_PATH as SCRIPT_PATH,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
  WEB_GODMODE_LIVE_OPERATOR_SPRINT_ID as SPRINT_ID,
  WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID,
  WEB_GODMODE_LIVE_OPERATOR_VIDEO_SOURCE_ID,
  buildWebGodmodeLiveInventoryItem,
  buildWebGodmodeLiveOperatorDogfoodProof,
  buildWebGodmodeLiveOperatorReportArtifact,
  buildWebGodmodeLiveOperatorSnapshot,
  renderWebGodmodeLiveOperatorCloseout,
  runWebGodmodeLiveBrowserObservation,
  verifyWebGodmodeLiveOperatorPersistedReport,
} from '../lib/web-godmode-live-operator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'web-godmode-live-operator'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

async function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function cloneSprintItem(item = {}) {
  return JSON.parse(JSON.stringify(item || {}))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/web-godmode-extractor.js',
      'lib/mark-kashef-goal-build-intel-packet.js',
      'lib/youtube-build-intel-runtime-proof.js',
      'scripts/run-extraction-target.mjs',
      'scripts/extract-video-content.mjs',
      'lib/e2e-staging-harness.js',
    ],
    existingDocs: [
      'docs/process/web-godmode-001-plan.md',
      'docs/process/build-intel-observation-extractor-001-plan.md',
      'docs/process/mark-kashef-goal-build-intel-packet-001-plan.md',
      'docs/handoffs/2026-05-20-promise-to-proof-regroup-handoff.md',
    ],
    existingScripts: [
      'scripts/process-web-godmode-check.mjs',
      'scripts/process-youtube-build-intel-runtime-proof-check.mjs',
      'scripts/run-extraction-target.mjs',
      'scripts/extract-video-content.mjs',
    ],
    existingPolicy: [
      'WEB-GODMODE-001 is synthetic kernel only; live operator capability must be proven by WEB-GODMODE-LIVE-OPERATOR-002.',
      'Public YouTube one-video proof is allowed; Skool/Gumroad/Calendly/private/paid links remain approval-bound.',
      'Current Sprint is live DB truth and blockers block actions, not the whole sprint.',
    ],
    existingCards: [
      'WEB-GODMODE-001',
      'PROMISE-TO-PROOF-INTEGRITY-GATE-001',
      'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
      'YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002',
      NEXT_CARD_ID,
    ],
    reused: [
      'Playwright browser runtime',
      'existing exact YouTube transcript target',
      'source_crawl_items inventory ledger',
      'shared_communication_artifacts video_transcript archive',
      'intelligence_report_artifacts proof storage',
      'promise-to-proof continuation guard',
    ],
    notRebuilt: [
      'No new YouTube crawler.',
      'No Skool/Gumroad/Calendly follower.',
      'No paid/private auth runtime.',
      'No provider vision/model interpretation.',
      'No broad last-20 batch in this card.',
    ],
    exactGap: 'WEB-GODMODE-001 proved only a synthetic kernel. This card proves one real no-auth browser page/video observation with screenshots, description links, caption metadata, and exact transcript artifact.',
    overBroadRisk: 'This can drift into broad channel crawling, private-source scraping, purchases, form submissions, model vision calls, or downstream auto-writing. V1 is one exact public URL and observed-only external links.',
    readyBy: 'Codex Foundation Builder',
    readyAt: '2026-05-20T22:15:00-04:00',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `web-godmode-live-operator-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      summary: buildPlanCriticResultSummary(planReview),
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const run = buildPlanCriticRun(planReview)
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            requested_by = EXCLUDED.requested_by,
            created_at = NOW()
      `,
      [
        run.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(run.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function loadTranscriptArtifact() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        WHERE artifact_id = $1
        LIMIT 1
      `,
      [WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      artifactId: row.artifact_id,
      sourceId: row.source_id,
      artifactType: row.artifact_type,
      externalId: row.external_id,
      title: row.title,
      sourceAccount: row.source_account,
      sourceContainer: row.source_container,
      sourceUrl: row.source_url,
      participants: row.participants || [],
      contentText: row.content_text || '',
      contentHash: row.content_hash || '',
      artifactCreatedAt: row.artifact_created_at?.toISOString?.() || row.artifact_created_at || null,
      artifactUpdatedAt: row.artifact_updated_at?.toISOString?.() || row.artifact_updated_at || null,
      metadata: row.metadata || {},
      ingestedBy: row.ingested_by,
      ingestedAt: row.ingested_at?.toISOString?.() || row.ingested_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  } finally {
    await pool.end()
  }
}

async function loadExtractionRun() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, artifact_id, metadata, discovered_at, processed_at, updated_at
        FROM source_crawl_items
        WHERE target_key = $1
          AND external_id = $2
        LIMIT 1
      `,
      [WEB_GODMODE_LIVE_OPERATOR_EXTRACTION_TARGET_KEY, WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      itemKey: row.item_key,
      targetKey: row.target_key,
      sourceId: row.source_id,
      externalId: row.external_id,
      itemType: row.item_type,
      status: row.status,
      fingerprint: row.fingerprint,
      artifactId: row.artifact_id,
      metadata: row.metadata || {},
      discoveredAt: row.discovered_at?.toISOString?.() || row.discovered_at || null,
      processedAt: row.processed_at?.toISOString?.() || row.processed_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  } finally {
    await pool.end()
  }
}

async function loadPersistedReport() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id, report_type, scope_key, department, title, status,
               source_ids, input_artifact_ids, source_coverage, top_findings,
               action_required_items, open_questions, structured_output_json,
               metadata, created_at, updated_at
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = $1
        LIMIT 1
      `,
      [WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      reportArtifactId: row.report_artifact_id,
      reportType: row.report_type,
      scopeKey: row.scope_key,
      department: row.department,
      title: row.title,
      status: row.status,
      sourceIds: row.source_ids || [],
      inputArtifactIds: row.input_artifact_ids || [],
      sourceCoverage: row.source_coverage || [],
      topFindings: row.top_findings || [],
      actionRequiredItems: row.action_required_items || [],
      openQuestions: row.open_questions || [],
      structuredOutputJson: row.structured_output_json || {},
      metadata: row.metadata || {},
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  } finally {
    await pool.end()
  }
}

function runExactVideoExtractionTarget() {
  const result = spawnSync(
    'npm',
    [
      'run',
      'extraction:target',
      '--',
      `--target=${WEB_GODMODE_LIVE_OPERATOR_EXTRACTION_TARGET_KEY}`,
      `--actor=${ACTOR}`,
      '--force=true',
      `--onlyExternalId=${WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL}`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    },
  )
  const output = `${result.stdout || ''}${result.stderr || ''}`
  if (result.status !== 0) {
    throw new Error(`Exact Mark Kashef YouTube extraction failed: ${output.split('\n').slice(-30).join('\n')}`)
  }
  return {
    ok: true,
    outputTail: output.slice(-20000),
    crawlRunId: (output.match(/Crawl run:\s*(\S+)/) || [])[1] || null,
    summary: (() => {
      const match = output.match(/^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m)
      if (!match) return null
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    })(),
  }
}

async function ensureRuntimeExtraction() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'seed exact approved public Mark Kashef YouTube inventory item and run video-content extraction target for that external ID only',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const inventoryItem = await upsertSourceCrawlItem(buildWebGodmodeLiveInventoryItem(), ACTOR)
  const extractionTarget = runExactVideoExtractionTarget()
  return { inventoryItem, extractionTarget }
}

async function persistProof(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'persist WEB GODMODE live operator proof report artifact',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  return upsertIntelligenceReportArtifact(buildWebGodmodeLiveOperatorReportArtifact(snapshot), ACTOR)
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'One exact public Mark Kashef YouTube video is opened by a real browser; page/body/description text, resource links, caption-track metadata, viewport/video-player screenshots, transcript artifact, report artifact, stop controls, and no-auth/no-external-follow guardrails are proven.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve supplied the exact public YouTube video and channel target for the GOD-mode extractor recovery proof.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      sourceArtifactId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
      reportArtifactId: WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      videoId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID,
      channel: CHANNEL,
      nextCardId: NEXT_CARD_ID,
      externalLinksFollowed: false,
      privateOrPaidAccess: false,
      broadBatchApproved: false,
      credentialMutation: false,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    planRef: cloned.planRef || 'docs/process/youtube-scout-latest-video-vision-002-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Use the proven one-video live operator path to scout Mark Kashef public YouTube latest/last-20 videos with transcript, description/resource links, visual evidence policy, artifacts, and no paid/private access.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; one public live browser/video proof is green.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not follow Skool, Gumroad, Calendly, purchase, opt-in, community/course, comments/member, or private/auth-required links without a separate approval card.',
      'Do not run broad creator crawls beyond the approved quota and exact target list.',
      'Do not mutate credentials, browser profiles, external systems, or downstream work queues from extracted content.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
    ],
    metadata: {
      ...(cloned.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      channel: CHANNEL,
      publicYoutubeOnly: true,
      privateOrPaidAccess: false,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const baseOrder = Number(byId.get('SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001')?.order || 13)
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: baseOrder }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: baseOrder + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}: Mark Kashef latest/last-20 public YouTube scout using this proven operator path. Keep Skool/Gumroad/Calendly/private/paid links approval-bound.`
      : `Run exact public no-auth browser proof for ${WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL}; capture page text, description links, caption tracks, viewport/video screenshots, transcript artifact, and report artifact only.`,
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; real Playwright browser opened Mark Kashef video ${WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID}, captured viewport/video-player screenshot metadata, discovered resource links, detected caption tracks, extracted transcript via exact target, persisted report ${WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID}, and did not follow paid/private/external links. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; one exact public Mark Kashef YouTube video only.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update WEB GODMODE live operator backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await updateBacklogItem(NEXT_CARD_ID, {
    lane: 'scoped',
    nextAction: 'Use the closed one-video live operator proof to scope/run a bounded Mark Kashef latest/last-20 public YouTube scout. No Skool/Gumroad/Calendly/private/paid follow without approval.',
    statusNote: `Ready after ${CLOSEOUT_KEY}; public YouTube latest/last-20 scout is next, external resource following remains approval-bound.`,
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Build the real GOD-mode public web/video operator path before broad extraction or private-source work.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'web_godmode_live_operator_closed_youtube_latest_next' : 'web_godmode_live_operator_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: build bounded Mark Kashef latest/last-20 public YouTube scout.`
            : `${CARD_ID}: prove one exact public browser/video operator path.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          privateOrPaidAccess: false,
          skoolGumroadCalendlyApprovalBound: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve redirected from paid/private Skool blocker to exact public Mark Kashef YouTube GOD-mode operator proof.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let extractionAttempt = null
  let browserObservation = null
  let persistedReport = null

  await initFoundationDb()
  try {
    browserObservation = await runWebGodmodeLiveBrowserObservation()

    if (args.apply || args.closeCard) {
      extractionAttempt = await ensureRuntimeExtraction()
    }

    const [
      packageJson,
      moduleSource,
      scriptSource,
      closeoutRegistrySource,
      coverageSource,
      planSource,
      foundationBefore,
      transcriptArtifact,
      extractionRun,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile('lib/web-godmode-live-operator.js'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile(PLAN_PATH),
      getFoundationSnapshot(),
      loadTranscriptArtifact(),
      loadExtractionRun(),
    ])

    const approvalValidation = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: APPROVAL_PATH,
      cardId: CARD_ID,
    })
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'Full ship gate because this card launches a live public browser, captures screenshot artifacts, runs exact YouTube transcript extraction, persists an intelligence proof report, and updates Current Sprint truth.',
      repoRoot,
    })
    let snapshot = buildWebGodmodeLiveOperatorSnapshot({
      browserObservation,
      transcriptArtifact,
      extractionRun,
      persistedReport: await loadPersistedReport(),
    })

    if ((args.apply || args.closeCard) && snapshot.ok) {
      persistedReport = await persistProof(snapshot)
      snapshot = buildWebGodmodeLiveOperatorSnapshot({
        browserObservation,
        transcriptArtifact,
        extractionRun,
        persistedReport,
      })
    }

    if (args.closeCard && snapshot.ok) {
      await fs.writeFile(path.join(repoRoot, CLOSEOUT_PATH), renderWebGodmodeLiveOperatorCloseout(snapshot), 'utf8')
      await ensureLiveState({ closeCard: true, planReview })
    } else if (args.apply) {
      await ensureLiveState({ closeCard: false, planReview })
    }

    const [
      activeSprint,
      cards,
      planCriticRuns,
      reportAfter,
      transcriptAfter,
      extractionAfter,
    ] = await Promise.all([
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001']),
      getPlanCriticRunsByCardIds([CARD_ID, NEXT_CARD_ID]),
      loadPersistedReport(),
      loadTranscriptArtifact(),
      loadExtractionRun(),
    ])
    const effectiveSnapshot = buildWebGodmodeLiveOperatorSnapshot({
      browserObservation,
      transcriptArtifact: transcriptAfter || transcriptArtifact,
      extractionRun: extractionAfter || extractionRun,
      persistedReport: reportAfter || persistedReport,
    })
    const persisted = verifyWebGodmodeLiveOperatorPersistedReport({
      snapshot: effectiveSnapshot,
      report: reportAfter || persistedReport,
    })
    const card = cards.find(item => item.id === CARD_ID) || null
    const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
    const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
    const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
    const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
    const dogfood = buildWebGodmodeLiveOperatorDogfoodProof()

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for live operator proof', buildPlanCriticResultSummary(planReview))
    addCheck(checks, !args.closeCard || planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing', 'done'].includes(card.lane)), 'live backlog card exists with expected lane', card ? `${card.id}:${card.lane}/${card.priority}` : 'missing')
    addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next public YouTube latest/vision card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker is reconciled', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, !args.closeCard || activeItem?.stage === 'done_this_sprint', 'Current Sprint marks live operator done after close', activeItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || nextItem?.stage === 'scoping', 'Current Sprint advances to public YouTube latest/vision card', nextItem?.stage || 'missing')
    addCheck(checks, effectiveSnapshot.ok === true, 'live operator snapshot is healthy', effectiveSnapshot.failures.map(failure => failure.check).join(', ') || 'healthy')
    addCheck(checks, browserObservation.liveBrowserLaunched === true && browserObservation.networkFetched === true, 'browser proof launched and fetched live YouTube page', `${browserObservation.responseStatus}/${browserObservation.finalUrl}`)
    addCheck(checks, list(browserObservation.screenshotArtifacts).some(item => item.kind === 'video_player_screenshot' && item.bytes > 1000), 'video-player screenshot artifact captured', JSON.stringify(list(browserObservation.screenshotArtifacts).map(item => ({ kind: item.kind, bytes: item.bytes }))))
    addCheck(checks, list(browserObservation.resourceLinks).some(item => /gumroad|skool/i.test(`${item.host} ${item.normalizedUrl}`)), 'description resource links were discovered and classified', JSON.stringify(list(browserObservation.resourceLinks).map(item => `${item.host}:${item.classification}`).slice(0, 12)))
    addCheck(checks, list(browserObservation.captionTracks).length >= 1, 'caption track metadata was detected', `${list(browserObservation.captionTracks).length} tracks`)
    addCheck(checks, (transcriptAfter || transcriptArtifact)?.artifactId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID && (transcriptAfter || transcriptArtifact)?.contentText?.length >= 1000, 'exact transcript artifact is persisted', (transcriptAfter || transcriptArtifact) ? `${(transcriptAfter || transcriptArtifact).artifactId}/${(transcriptAfter || transcriptArtifact).contentText.length}` : 'missing')
    addCheck(checks, (extractionAfter || extractionRun)?.externalId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL && (extractionAfter || extractionRun)?.status === 'succeeded', 'exact extraction item succeeded', (extractionAfter || extractionRun) ? `${(extractionAfter || extractionRun).status}/${(extractionAfter || extractionRun).externalId}` : 'missing')
    addCheck(checks, !args.closeCard || persisted.ok === true, 'persisted report artifact reads back', persisted.failures?.map(failure => failure.check).join(', ') || 'ok')
    addCheck(checks, dogfood.ok === true, 'dogfood rejects private source, broad channel, external follow, and weak evidence', JSON.stringify(dogfood.cases))
    addCheck(checks, packageJson.scripts?.['process:web-godmode-live-operator-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:web-godmode-live-operator-check'] || 'missing')
    addCheck(checks, moduleSource.includes('runWebGodmodeLiveBrowserObservation') && moduleSource.includes('video_player_screenshot'), 'module contains real browser and screenshot path', 'browser/screenshot exports present')
    addCheck(checks, scriptSource.includes('runWebGodmodeLiveBrowserObservation') && scriptSource.includes('onlyExternalId'), 'focused script uses browser proof and exact transcript filter', 'browser + exact external ID')
    addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes live operator proof', 'lib/foundation-build-closeout-intelligence-records.js')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves live operator proof', closeout?.key || 'missing')
    addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes live operator card ID', 'coverage card ID present')
    addCheck(checks, !args.closeCard || await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists after close', CLOSEOUT_PATH)
    addCheck(checks, stableString(foundationBefore.llmCredentials || []) === stableString((await getFoundationSnapshot()).llmCredentials || []), 'proof does not mutate credential truth', 'credentials unchanged')
    const hasExternalWritePath = /\b(sendTelegram|sendMail|sendEmail|submitForm|completePurchase|runPurchase|externalWrite)\s*\(/.test(`${moduleSource}\n${scriptSource}`)
    addCheck(checks, !hasExternalWritePath, 'proof has no external notification/purchase/form write helper', 'external write helpers absent')

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      sourceArtifactId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
      reportArtifactId: WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
      extractionAttempt,
      snapshot: {
        status: effectiveSnapshot.status,
        browserStatus: browserObservation.responseStatus,
        finalUrl: browserObservation.finalUrl,
        screenshots: list(browserObservation.screenshotArtifacts).map(item => ({
          kind: item.kind,
          bytes: item.bytes,
          sha256: String(item.sha256 || '').slice(0, 16),
        })),
        resourceLinks: list(browserObservation.resourceLinks)
          .filter(item => !/youtube/i.test(item.host || ''))
          .slice(0, 12)
          .map(item => ({ host: item.host, classification: item.classification, url: item.normalizedUrl })),
        captionTracks: list(browserObservation.captionTracks),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`WEB GODMODE live operator proof: ${result.status}`)
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
  console.error('WEB GODMODE live operator proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
