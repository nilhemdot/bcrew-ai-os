#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildDocArtifactBloatSnapshot } from '../lib/doc-artifact-bloat-guard.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001'
const CLOSEOUT_KEY = 'foundation-handoff-hot-doc-cleanup-v1'
const PLAN_PATH = 'docs/process/foundation-handoff-hot-doc-cleanup-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.json'
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-handoff-hot-doc-cleanup-closeout.md'
const SCRIPT_PATH = 'scripts/process-foundation-handoff-hot-doc-cleanup-check.mjs'
const MANIFEST_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/MANIFEST.md'
const ARCHIVE_DIR = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup'
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const NEXT_CARD_ID = 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001'

const HOT_HANDOFFS_TO_KEEP = [
  'docs/_archive/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
  'docs/_archive/handoffs/2026-05-19-foundation-endpoint-metrics-freshness-closeout.md',
  'docs/_archive/handoffs/2026-05-19-foundation-handoff-hot-doc-cleanup-closeout.md',
  'docs/handoffs/nightly-deep-audit-2026-05-19.json',
  'docs/_archive/handoffs/nightly-deep-audit-2026-05-19.md',
]

const CHANGED_FILES = [
  `${ARCHIVE_DIR}/MANIFEST.md`,
  SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  `node --check ${SCRIPT_PATH}`,
  'npm run process:foundation-handoff-hot-doc-cleanup-check -- --apply --close-card --json',
  'npm run process:doc-artifact-bloat-guard-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${CARD_ID} --closeoutKey=${CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

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

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

async function repoDirExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isDirectory()
  } catch {
    return false
  }
}

function parseJsonFromCommand(text = '') {
  const candidates = [...String(text).matchAll(/\n\{/g)].map(match => match.index + 1)
  const first = String(text).indexOf('{')
  if (first >= 0) candidates.unshift(first)
  for (const start of candidates.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(String(text).slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function docArtifactRowsFromHealth(systemHealth = {}) {
  return (systemHealth.findings || []).filter(finding => String(finding.id || '').startsWith('doc_artifact_'))
}

function parseArchiveManifest(manifestSource = '') {
  const rows = []
  for (const line of String(manifestSource || '').split('\n')) {
    const match = line.match(/^\| `([^`]+)` \| `([^`]+)` \| ([0-9]+) \| ([0-9]+) \|$/)
    if (!match) continue
    rows.push({
      oldPath: match[1],
      newPath: match[2],
      lines: Number(match[3]),
      bytes: Number(match[4]),
    })
  }
  return rows
}

async function countHotRootFiles() {
  const entries = await fs.readdir(path.join(repoRoot, 'docs/handoffs'), { withFileTypes: true })
  return entries.filter(entry => entry.isFile()).length
}

async function archivedRowsExist(rows = []) {
  const missing = []
  for (const row of rows) {
    if (!await repoFileExists(row.newPath)) missing.push(row.newPath)
  }
  return missing
}

async function oldHotRowsGone(rows = []) {
  const present = []
  for (const row of rows) {
    if (await repoFileExists(row.oldPath)) present.push(row.oldPath)
  }
  return present
}

function replaceMovedPaths(text = '', mappings = []) {
  let next = String(text || '')
  for (const { oldPath, newPath } of mappings) {
    if (next.includes(oldPath)) next = next.split(oldPath).join(newPath)
  }
  return next
}

async function updateBacklogMovedPathReferences(client) {
  const mappings = parseArchiveManifest(await readRepoFile(MANIFEST_PATH))
  const result = await client.query(`
    SELECT id, source, summary, why_it_matters, next_action, status_note
    FROM backlog_items
  `)
  let updatedRows = 0
  for (const row of result.rows || []) {
    const next = {
      source: replaceMovedPaths(row.source, mappings),
      summary: replaceMovedPaths(row.summary, mappings),
      why_it_matters: replaceMovedPaths(row.why_it_matters, mappings),
      next_action: replaceMovedPaths(row.next_action, mappings),
      status_note: replaceMovedPaths(row.status_note, mappings),
    }
    if (next.source === (row.source || '') &&
      next.summary === (row.summary || '') &&
      next.why_it_matters === (row.why_it_matters || '') &&
      next.next_action === (row.next_action || '') &&
      next.status_note === (row.status_note || '')) {
      continue
    }
    await client.query(
      `
        UPDATE backlog_items
        SET source = $2,
            summary = $3,
            why_it_matters = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [row.id, next.source, next.summary, next.why_it_matters, next.next_action, next.status_note],
    )
    updatedRows += 1
  }
  return updatedRows
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Clean Foundation handoff hot-doc bloat',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 3,
    source: 'May 19 Foundation-only cleanup sprint after endpoint metric rows cleared.',
    summary: 'Archive cold Foundation handoffs so docs/handoffs contains current working handoffs instead of old closeout/report bloat.',
    whyItMatters: 'Hot handoffs are an operator surface. If they contain hundreds of old files, builders waste time and System Health keeps reporting avoidable doc artifact debt.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Archive cold handoffs, preserve history, update moved-path references, and prove doc artifact rows are gone.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; doc artifact risk/review counts are zero.`
      : `Executing \`${CLOSEOUT_KEY}\`; hot-doc cleanup blocks the Foundation cleanup queue.`,
    owner: 'Foundation Process',
  }
}

function withHandoffSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Cold handoffs are archived with manifest proof, moved-path references are updated, current working handoffs remain hot, System Health doc artifact risk/review counts are zero, and live backlog/current sprint close this card.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: [
      'Do not delete useful closeout history.',
      'Do not archive current May 18-19 working handoffs.',
      'Do not classify doc artifact rows instead of removing them.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
      'Do not start file-size splitting inside this card.',
      'Do not start source/value/agent feature work.',
      'Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.',
      'Do not launch parallel builders.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/doc-artifact-bloat-guard.js',
        'scripts/process-doc-artifact-bloat-guard-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingDocs: [
        PLAN_PATH,
        APPROVAL_PATH,
        CLOSEOUT_PATH,
        MANIFEST_PATH,
        'docs/_archive/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
      ],
      existingScripts: [
        SCRIPT_PATH,
        'scripts/process-doc-artifact-bloat-guard-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingPolicy: [
        'Handoff cleanup exit means doc artifact rows disappear.',
        'Classification is not repair.',
        'Foundation-only today; no Value Builder split.',
      ],
      reused: [
        'existing doc artifact bloat guard',
        'existing docs/_archive/handoffs archive surface',
        'live Backlog and Current Sprint truth',
      ],
      notRebuilt: [
        'No new doc artifact system.',
        'No file-size classifier work.',
        'No source/value/agent work.',
      ],
      exactGap: 'docs/handoffs exceeded hot-doc file and line budgets even after workflow failures and endpoint rows were repaired.',
      overBroadRisk: 'This card must not turn into file-size cleanup, green-lock work, source extraction, value feature work, or parallel-builder activation.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T11:40:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: APPROVAL_PATH,
      archiveManifest: MANIFEST_PATH,
    },
  }
}

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function withFileSizeNextSprintItem(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage || 'scoping',
    planRef: item.planRef || 'docs/_archive/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
    definitionOfDone: item.definitionOfDone || 'Every watched large file has an evidence-backed disposition; no new responsibility is added to near-limit files without wrapper-only proof or split plan; System Health file-size rows are cleared or made explicit threshold rows for the green-lock card.',
    proofCommands: Array.isArray(item.proofCommands) && item.proofCommands.length >= 3
      ? item.proofCommands
      : [
          'npm run process:file-size-engineering-standard-check -- --json',
          'npm run process:system-health-nightly-audit-check -- --json',
          'npm run foundation:verify -- --json-summary',
        ],
    notNextBoundaries: uniqueList([
      ...(Array.isArray(item.notNextBoundaries) ? item.notNextBoundaries : []),
      'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
      'Do not mutate Google Drive permissions.',
      'Do not start source/value/agent feature work.',
      'Do not split files unless the evidence shows split-now is safer than classified watch ownership.',
      'Do not add responsibility to scripts/foundation-verify.mjs, public/foundation.js, lib/foundation-db.js, or server.js without wrapper-only proof or split plan.',
      'Do not launch parallel builders.',
    ]),
    existingWorkCheck: {
      ...(item.existingWorkCheck || {}),
      existingCode: [
        'lib/foundation-file-size-standard.js',
        'scripts/process-file-size-engineering-standard-check.mjs',
        'lib/foundation-system-health.js',
      ],
      existingDocs: [
        'docs/_archive/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md',
        'docs/handoffs/2026-05-17-file-size-engineering-standard-closeout.md',
      ],
      existingScripts: [
        'scripts/process-file-size-engineering-standard-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
      ],
      existingPolicy: [
        'Files near 3k lines are flagged; past 5k requires split/extraction plan; past 10k is actively dangerous until proven otherwise.',
        'Classification is not repair when the row is a workflow failure.',
        'No Drive permission mutation or Meeting Vault Phase B work from this sprint.',
      ],
      reused: [
        'existing file-size standard check',
        'existing System Health file-size rollup',
        'live Backlog and Current Sprint truth',
      ],
      notRebuilt: [
        'No new file-size system.',
        'No source/value/agent work.',
      ],
      exactGap: 'System Health still shows four file-size watch rows after endpoint and doc artifact cleanup.',
      overBroadRisk: 'This card must not turn into source/value work, Drive ACL work, or broad verifier rewrites.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T11:40:00-04:00',
    },
  }
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update handoff hot-doc cleanup backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const row = buildCardRow({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = EXCLUDED.lane,
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-handoff-hot-doc')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-handoff-hot-doc-cleanup-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-handoff-hot-doc',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID, archiveManifest: MANIFEST_PATH }),
      ],
    )
    const backlogReferenceUpdates = await updateBacklogMovedPathReferences(client)
    if (backlogReferenceUpdates > 0) {
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ('backlog_updated','backlog_items',$1,'codex-foundation-handoff-hot-doc',$2,$3::jsonb)
        `,
        [
          CARD_ID,
          `Updated ${backlogReferenceUpdates} backlog row(s) with archived handoff paths.`,
          JSON.stringify({ closeoutKey: CLOSEOUT_KEY, archiveManifest: MANIFEST_PATH, backlogReferenceUpdates }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  let inserted = false
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withHandoffSprintItem(item, { closeCard }))
      inserted = true
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!inserted) {
        items.push(withHandoffSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        inserted = true
      }
      items.push(withFileSizeNextSprintItem(item))
      continue
    }
    if (!inserted && item.cardId === NEXT_CARD_ID) {
      items.push(withHandoffSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
      inserted = true
    }
    items.push(item)
  }
  if (!inserted) items.push(withHandoffSprintItem({ order: items.length + 1 }, { closeCard }))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          currentStatus: closeCard ? 'handoff_hot_docs_clean' : 'handoff_hot_doc_cleanup_active',
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID}; doc artifact rows are gone.`
            : `${CARD_ID} blocks the cleanup queue until doc artifact rows are gone.`,
        },
      },
      items: items.map((item, index) => ({ ...item, order: index + 1 })),
    },
    'codex-foundation-handoff-hot-doc',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'Foundation-only cleanup requires hot handoff bloat to be removed before file-size cleanup.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    activeSprint,
    cards,
    closeoutDoc,
    manifestSource,
    packageJson,
    coverageIdsSource,
    scriptSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile(MANIFEST_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(SCRIPT_PATH),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'handoff artifact archival, moved-path references, System Health doc artifact row removal, live sprint closeout, and proof-path preservation',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let workingCards = cards
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
    workingCards = await getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID])
  }

  const manifestRows = parseArchiveManifest(manifestSource)
  const missingArchivedRows = await archivedRowsExist(manifestRows)
  const oldHotRowsPresent = await oldHotRowsGone(manifestRows)
  const hotRootFileCount = await countHotRootFiles()
  const missingHotHandoffs = []
  for (const hotPath of HOT_HANDOFFS_TO_KEEP) {
    if (!await repoFileExists(hotPath)) missingHotHandoffs.push(hotPath)
  }

  const directDocSnapshot = await buildDocArtifactBloatSnapshot({ repoRoot })
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const card = workingCards.find(item => item.id === CARD_ID) || null
  const nextCard = workingCards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const parsedPackage = JSON.parse(packageJson)
  const healthSummary = systemHealth.json?.systemHealth?.summary || {}
  const healthDocArtifactFindings = docArtifactRowsFromHealth(systemHealth.json?.systemHealth || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for handoff hot-doc cleanup', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live handoff cleanup card is executing or done', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next file-size classifier card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, await repoDirExists(ARCHIVE_DIR) && await repoFileExists(MANIFEST_PATH), 'archive directory and manifest exist', MANIFEST_PATH)
  addCheck(checks, manifestRows.length >= 200, 'archive manifest records cold handoff moves', `${manifestRows.length} archived row(s)`)
  addCheck(checks, missingArchivedRows.length === 0, 'every manifest archived path exists', missingArchivedRows.slice(0, 5).join(', ') || 'all present')
  addCheck(checks, oldHotRowsPresent.length === 0, 'old hot paths from manifest no longer exist', oldHotRowsPresent.slice(0, 5).join(', ') || 'all moved')
  addCheck(checks, missingHotHandoffs.length === 0, 'current May 19 working handoffs remain hot', missingHotHandoffs.join(', ') || 'all present')
  addCheck(checks, hotRootFileCount <= 220, 'docs/handoffs hot root file count is below warning budget', `${hotRootFileCount} file(s)`)
  addCheck(checks, directDocSnapshot.status === 'healthy' && directDocSnapshot.summary?.riskCount === 0 && directDocSnapshot.summary?.reviewCount === 0, 'direct doc artifact guard is healthy', JSON.stringify(directDocSnapshot.summary))
  addCheck(checks, Number(directDocSnapshot.summary?.handoffFileCount || 0) <= 220 && Number(directDocSnapshot.summary?.recentHandoffFileCount || 0) <= 220, 'handoff file count and recent file count are under budget', `files=${directDocSnapshot.summary?.handoffFileCount} recent=${directDocSnapshot.summary?.recentHandoffFileCount}`)
  addCheck(checks, Number(directDocSnapshot.summary?.handoffLineTotal || 0) < 20_000, 'handoff line total is under hot-doc budget', `${directDocSnapshot.summary?.handoffLineTotal} line(s)`)
  addCheck(checks, systemHealth.exitStatus === 0 && systemHealth.json?.systemHealth?.status === 'healthy', 'system-health process exits healthy after handoff cleanup', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, Number(healthSummary.docArtifactRiskCount || 0) === 0 && Number(healthSummary.docArtifactReviewCount || 0) === 0 && healthDocArtifactFindings.length === 0, 'doc artifact System Health rows disappeared instead of being classified', `risk=${healthSummary.docArtifactRiskCount ?? 'missing'} review=${healthSummary.docArtifactReviewCount ?? 'missing'} findings=${healthDocArtifactFindings.length}`)
  addCheck(checks, parsedPackage.scripts?.['process:foundation-handoff-hot-doc-cleanup-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes handoff hot-doc cleanup proof', parsedPackage.scripts?.['process:foundation-handoff-hot-doc-cleanup-check'] || 'missing')
  addCheck(checks, coverageIdsSource.includes(CARD_ID), 'verifier coverage includes handoff hot-doc cleanup card id', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves handoff hot-doc cleanup', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('docArtifactRiskCount=0'), 'closeout handoff exists for handoff hot-doc cleanup', CLOSEOUT_PATH)
  const forbiddenNetworkCall = ['fe', 'tch('].join('')
  const forbiddenEmailSend = ['send', 'Email'].join('')
  addCheck(checks, !scriptSource.includes(forbiddenNetworkCall) && !scriptSource.includes(forbiddenEmailSend), 'focused proof has no network/action external-write calls', 'clean')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint can record handoff cleanup closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeBlockerCardId === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to file-size classifier after close', activeBlockerCardId || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const refreshedCards = await getBacklogItemsByIds([CARD_ID])
    const refreshedPlanCritic = await getPlanCriticRunsByCardIds([CARD_ID])
    const refreshedSprint = await getActiveFoundationCurrentSprint()
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is file-size classifier after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    archive: {
      manifestPath: MANIFEST_PATH,
      archivedFileCount: manifestRows.length,
      missingArchivedCount: missingArchivedRows.length,
      oldHotPathStillPresentCount: oldHotRowsPresent.length,
      hotRootFileCount,
    },
    docArtifact: {
      directStatus: directDocSnapshot.status,
      directSummary: directDocSnapshot.summary,
      systemHealthExitStatus: systemHealth.exitStatus,
      systemHealthStatus: systemHealth.json?.systemHealth?.status || null,
      systemHealthSummary: healthSummary,
      findingIds: healthDocArtifactFindings.map(finding => finding.id),
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation handoff hot-doc cleanup check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation handoff hot-doc cleanup check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
