#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  LEGACY_SYSTEM_AUDIT_APPROVAL_PATH,
  LEGACY_SYSTEM_AUDIT_CARD_ID,
  LEGACY_SYSTEM_AUDIT_CHANGED_FILES,
  LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY,
  LEGACY_SYSTEM_AUDIT_CLOSEOUT_PATH,
  LEGACY_SYSTEM_AUDIT_JSON_PATH,
  LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID,
  LEGACY_SYSTEM_AUDIT_NOT_NEXT_BOUNDARIES,
  LEGACY_SYSTEM_AUDIT_PLAN_PATH,
  LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS,
  LEGACY_SYSTEM_AUDIT_PROOF_COMMANDS,
  LEGACY_SYSTEM_AUDIT_REPORT_PATH,
  LEGACY_SYSTEM_AUDIT_SCRIPT_PATH,
  LEGACY_SYSTEM_AUDIT_SPRINT_ID,
  buildLegacySystemAuditDogfoodProof,
  buildLegacySystemAuditMarkdown,
  buildLegacySystemAuditSnapshot,
  evaluateLegacySystemAuditSnapshot,
} from '../lib/legacy-system-audit.js'
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
const ACTOR = 'codex-legacy-system-audit'

function parseArgs(argv = process.argv.slice(2)) {
  const closeCard = isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] })
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    writeReport: closeCard || isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport] }),
    closeCard,
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function existsRepoFile(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function writeAuditArtifacts(snapshot, backlogItems) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LEGACY_SYSTEM_AUDIT_SCRIPT_PATH,
    operation: 'write sanitized legacy audit report artifacts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await fs.mkdir(path.join(repoRoot, 'docs/audits'), { recursive: true })
  const markdown = buildLegacySystemAuditMarkdown(snapshot, backlogItems)
  await fs.writeFile(path.join(repoRoot, LEGACY_SYSTEM_AUDIT_REPORT_PATH), markdown, 'utf8')
  await fs.writeFile(path.join(repoRoot, LEGACY_SYSTEM_AUDIT_JSON_PATH), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  return { markdown, snapshot }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: LEGACY_SYSTEM_AUDIT_CARD_ID,
    title: 'Line-read old systems and promote only durable rebuild truth',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 14,
    source: 'Steve-approved Foundation gold-capture sprint after System Capabilities surface shipped.',
    summary: 'Audit local legacy system roots and promote useful patterns into current backlog/source/spec truth while rejecting old runtime, agent sprawl, stale reports, and private runtime copying.',
    whyItMatters: 'Steve explicitly wants the gold from old-system and long-chat review preserved before more sprint work. This card turns that review into a sanitized salvage map and live backlog routing.',
    nextAction: closeCard
      ? `Done under ${LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY}; continue ${LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID}.`
      : 'Produce a bounded sanitized salvage map over legacy roots, prove every durable finding is classified/routed, and close without importing old runtime code.',
    statusNote: closeCard
      ? `Closed v1 under ${LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY}; sanitized audit artifacts live at ${LEGACY_SYSTEM_AUDIT_REPORT_PATH} and ${LEGACY_SYSTEM_AUDIT_JSON_PATH}, old-code import/runtime activation remained blocked, and Current Sprint advances to ${LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID}.`
      : 'Executing v1: audit only; no old-code import, old-agent execution, private broad extraction, credential/provider mutation, external write, or Value Builder split.',
    owner: 'Foundation Process',
  }
}

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required) return text
  if (text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

function withStrategicIntelVerifierPins(row = {}) {
  let summary = row.summary || 'Define Strategy Hub as a continuous strategic intelligence operating loop that mines company signals, separates strategic issues from operational noise, scores urgency/impact/confidence/staleness, and routes owner-bound resolution.'
  summary = ensureTextIncludes(summary, 'V1 uses `intelligence_strategic_issues` and `docs/specs/2026-04-28-strategic-intelligence-loop.md` as the strategic issue ledger/schema contract.')
  summary = ensureTextIncludes(summary, 'The scoring fields are urgency, impact, confidence, and staleness.')

  let nextAction = row.nextAction || 'Build the strategic intelligence loop from current atom/action-router truth and the sanitized legacy-system salvage map. Do not restart old agent sprawl or broad extraction.'
  nextAction = ensureTextIncludes(nextAction, 'Do not close without resolution feedback, proof that this card blocks `INTEL-SCOPER-001`, and acceptance metrics of >= 5 strategic issues surfaced/week and >= 2 resolved-to-applied/week.')

  let statusNote = row.statusNote || `Ready/scoped as active blocker after ${LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY}.`
  statusNote = ensureTextIncludes(statusNote, 'Proof scope must define Strategic Intelligence loop behavior, source evidence inputs, review/action routing, closeout gates, and the `intelligence_strategic_issues` schema before build work starts.')

  return { ...row, summary, nextAction, statusNote }
}

function buildNextCardRow(existing = {}) {
  const pinned = withStrategicIntelVerifierPins(existing)
  return {
    ...pinned,
    id: LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID,
    title: pinned.title || 'Define the continuous Strategic Intelligence loop',
    lane: pinned.lane === 'done' ? pinned.lane : 'scoped',
    priority: pinned.priority || 'P0',
    rank: pinned.rank || 15,
    source: pinned.source || 'Foundation gold-capture sprint and legacy-system salvage map.',
    whyItMatters: pinned.whyItMatters || 'Old-system research patterns become useful only when strategic intelligence has a governed loop from source evidence to review/action.',
    owner: pinned.owner || 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'docs/audits/2026-05-19-old-system-research-team-harvest.json',
      'docs/conversation-archive/MANIFEST.json',
      'docs/system-capabilities.generated.json',
      'docs/agents/agent-inventory.generated.json',
    ],
    existingDocs: [
      'docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md',
      'docs/audits/2026-05-19-old-system-research-team-harvest.json',
      'docs/conversation-archive/MANIFEST.json',
      'docs/system-capabilities.generated.md',
      'docs/agents/agent-inventory.generated.md',
      'docs/process/legacy-system-audit-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-old-system-research-team-harvest-check.mjs',
      'scripts/process-pillar-4-system-capabilities-check.mjs',
      'scripts/process-pillar-5-agent-inventory-check.mjs',
      'scripts/process-system-004-capabilities-surface-check.mjs',
      'scripts/process-system-health-nightly-audit-check.mjs',
      'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    ],
    legacyRoots: [
      '~/bcrew-buddy-reference',
      '~/.inspection/bcrew-skills',
      '~/.inspection/FUBZahnd',
      '~/.inspection/zahnd-team-dashboard',
      '~/.openclaw metadata-only',
      '~/unchained-realtor',
    ],
    existingPolicy: [
      'Old-system notes are not active truth until promoted into source contract, DB-backed backlog, current doc, or verifier.',
      'Private workspace files are metadata-only proof.',
      'Do not import old-system runtime/code; rebuild useful patterns in governed Foundation code.',
      'No provider/credential/Drive permission/source-system mutation in audit cards.',
    ],
    reused: 'Reuses current live backlog, generated capability/agent inventory, old-system research-team harvest, conversation archive manifest, and local legacy roots as bounded evidence.',
    notRebuilt: 'Does not rebuild old agents, crawlers, dashboards, .NET processors, OpenClaw runtime, browser sessions, source workers, or Value Builder split.',
    exactGap: 'The conversation identified more gold than the live sprint had carded: old research team, old-system source patterns, unchained/product strategy, OpenClaw operating lessons, FUB schemas, and dashboard IA. This card promotes those into durable routing instead of chat memory.',
    overBroadRisk: 'Legacy-system review can become unsafe copying or endless archaeology. V1 is sanitized metadata plus disposition map only.',
    readyBy: 'Steve approved starting the sprint once the gold was carded and good to go.',
    readyAt: '2026-05-19T21:15:00-04:00',
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `legacy-system-audit-${stableRunId(LEGACY_SYSTEM_AUDIT_PLAN_PATH)}`,
        LEGACY_SYSTEM_AUDIT_CARD_ID,
        LEGACY_SYSTEM_AUDIT_PLAN_PATH,
        planReview.status,
        planReview.score,
        LEGACY_SYSTEM_AUDIT_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: LEGACY_SYSTEM_AUDIT_CARD_ID, closeoutKey: LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function updateBacklogRows({ closeCard = false, nextCard = {} } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const card = buildCardRow({ closeCard })
  const next = buildNextCardRow(nextCard || {})
  try {
    await client.query('BEGIN')
    for (const row of [card, next]) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        [row.id, row.title, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        LEGACY_SYSTEM_AUDIT_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${LEGACY_SYSTEM_AUDIT_CARD_ID}.`,
        JSON.stringify({ closeoutKey: LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY, activeBlockerCardId: closeCard ? LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID : LEGACY_SYSTEM_AUDIT_CARD_ID }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint({ planReview, activeSprint, nextCard } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LEGACY_SYSTEM_AUDIT_SCRIPT_PATH,
    operation: 'close LEGACY-SYSTEM-AUDIT-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await updateBacklogRows({ closeCard: true, nextCard })
  await upsertPlanCriticRun(planReview)

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === LEGACY_SYSTEM_AUDIT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: LEGACY_SYSTEM_AUDIT_PLAN_PATH,
        definitionOfDone: 'Sanitized legacy-system salvage map exists, every finding is classified/routed, private runtime stays metadata-only, no old code/runtime imported, and Current Sprint advances to Strategic Intelligence.',
        proofCommands: LEGACY_SYSTEM_AUDIT_PROOF_COMMANDS,
        nextAction: `Continue ${LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID}; legacy gold is now captured as routed salvage map.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...LEGACY_SYSTEM_AUDIT_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY,
          approvalRef: LEGACY_SYSTEM_AUDIT_APPROVAL_PATH,
          auditReportPath: LEGACY_SYSTEM_AUDIT_REPORT_PATH,
          auditJsonPath: LEGACY_SYSTEM_AUDIT_JSON_PATH,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        planRef: item.planRef || 'docs/process/strategic-intel-001-plan.md',
        nextAction: 'Use the legacy-system salvage map, current atom/action-router/retrieval truth, and source-backed evidence layers to define the continuous Strategic Intelligence loop.',
        notNextBoundaries: Array.from(new Set([
          ...(item.notNextBoundaries || []),
          'Do not restart old agent sprawl.',
          'Do not build broad extraction before Strategic Intelligence loop boundaries are explicit.',
          'Do not treat legacy docs or chat claims as live truth unless promoted into source/backlog/spec/verifier.',
        ])),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: LEGACY_SYSTEM_AUDIT_CARD_ID,
          inputAudit: LEGACY_SYSTEM_AUDIT_REPORT_PATH,
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || LEGACY_SYSTEM_AUDIT_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'active',
          lastClosedCardId: LEGACY_SYSTEM_AUDIT_CARD_ID,
          nextAction: `Continue ${LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID}; legacy-system salvage map is complete.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'LEGACY-SYSTEM-AUDIT-001 closes and advances to Strategic Intelligence.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'LEGACY-SYSTEM-AUDIT-001 closes and advances the active blocker.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    packageJson,
    planText,
    moduleSource,
    scriptSource,
    registrySource,
    approval,
    initialCards,
    activeSprint,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(LEGACY_SYSTEM_AUDIT_PLAN_PATH),
    readRepoFile('lib/legacy-system-audit.js'),
    readRepoFile(LEGACY_SYSTEM_AUDIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: LEGACY_SYSTEM_AUDIT_APPROVAL_PATH, cardId: LEGACY_SYSTEM_AUDIT_CARD_ID }),
    getBacklogItemsByIds([LEGACY_SYSTEM_AUDIT_CARD_ID, LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID, ...LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS]),
    getActiveFoundationCurrentSprint(),
  ])
  const nextCardBefore = initialCards.find(card => card.id === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: LEGACY_SYSTEM_AUDIT_CHANGED_FILES,
    declaredRisk: 'legacy system audit, local private runtime boundary, old-code import rejection, backlog/source/spec routing, Current Sprint advancement',
    repoRoot,
  })

  let snapshot = null
  let markdown = ''
  if (args.writeReport) {
    snapshot = await buildLegacySystemAuditSnapshot()
    const artifact = await writeAuditArtifacts(snapshot, initialCards)
    markdown = artifact.markdown
  } else if (await existsRepoFile(LEGACY_SYSTEM_AUDIT_JSON_PATH)) {
    snapshot = JSON.parse(await readRepoFile(LEGACY_SYSTEM_AUDIT_JSON_PATH))
    markdown = await readRepoFile(LEGACY_SYSTEM_AUDIT_REPORT_PATH, { optional: true })
  } else {
    snapshot = await buildLegacySystemAuditSnapshot()
    markdown = buildLegacySystemAuditMarkdown(snapshot, initialCards)
  }
  const evaluation = evaluateLegacySystemAuditSnapshot(snapshot, { backlogItems: initialCards })
  const dogfood = buildLegacySystemAuditDogfoodProof()
  if (args.closeCard && approval.ok && planReview.status === 'pass' && evaluation.ok && dogfood.ok) {
    await closeCardAndAdvanceSprint({ planReview, activeSprint, nextCard: nextCardBefore })
  }

  const cards = await getBacklogItemsByIds([LEGACY_SYSTEM_AUDIT_CARD_ID, LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID, ...LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([LEGACY_SYSTEM_AUDIT_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(LEGACY_SYSTEM_AUDIT_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === LEGACY_SYSTEM_AUDIT_CARD_ID) || null
  const nextCard = cards.find(item => item.id === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === LEGACY_SYSTEM_AUDIT_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY) || null
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === LEGACY_SYSTEM_AUDIT_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null
  const promotedRows = cards.filter(item => LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS.includes(item.id))

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || LEGACY_SYSTEM_AUDIT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for legacy audit', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live legacy audit backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.id === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID, 'next Strategic Intelligence card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:legacy-system-audit-check'] === `node --env-file-if-exists=.env ${LEGACY_SYSTEM_AUDIT_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:legacy-system-audit-check'] || 'missing')
  addCheck(checks, moduleSource.includes('metadata_only_runtime_boundary') && moduleSource.includes('importedOldCode: false'), 'module encodes metadata-only and no-old-code boundaries', 'markers present')
  addCheck(checks, scriptSource.includes('writeAuditArtifacts') && scriptSource.includes('closeCardAndAdvanceSprint'), 'script can write sanitized report and close card', 'markers present')
  addCheck(checks, evaluation.ok, 'legacy audit salvage snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing roots, unclassified findings, and unsafe imports', dogfood.invariant)
  addCheck(checks, promotedRows.length === LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS.length, 'all promoted cards exist in live backlog', `${promotedRows.length}/${LEGACY_SYSTEM_AUDIT_PROMOTED_CARD_IDS.length}`)
  addCheck(checks, markdown.includes('## Promoted Live Cards') && markdown.includes('## Senior Call'), 'markdown report captures promoted cards and senior call', LEGACY_SYSTEM_AUDIT_REPORT_PATH)
  addCheck(checks, await existsRepoFile(LEGACY_SYSTEM_AUDIT_JSON_PATH), 'JSON report artifact exists', LEGACY_SYSTEM_AUDIT_JSON_PATH)
  addCheck(checks, registrySource.includes(LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY), 'closeout registry includes legacy audit', LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY)
  addCheck(checks, closeout && closeout.backlogIds?.includes(LEGACY_SYSTEM_AUDIT_CARD_ID), 'closeout record links LEGACY-SYSTEM-AUDIT-001', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY) && closeoutDoc.includes(LEGACY_SYSTEM_AUDIT_REPORT_PATH), 'closeout handoff exists and names audit artifacts', LEGACY_SYSTEM_AUDIT_CLOSEOUT_PATH)
  addCheck(checks, refreshedSprint.sprint?.sprintId === LEGACY_SYSTEM_AUDIT_SPRINT_ID, 'Current Sprint remains the gold-capture sprint', refreshedSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks legacy audit done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === LEGACY_SYSTEM_AUDIT_NEXT_CARD_ID, 'close-card advances active blocker to Strategic Intelligence', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped until its own build starts', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: LEGACY_SYSTEM_AUDIT_CARD_ID,
    closeoutKey: LEGACY_SYSTEM_AUDIT_CLOSEOUT_KEY,
    reportPath: LEGACY_SYSTEM_AUDIT_REPORT_PATH,
    jsonPath: LEGACY_SYSTEM_AUDIT_JSON_PATH,
    summary: snapshot.summary,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      legacyStage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    evaluation,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Legacy system audit check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  closeFoundationDb()
    .finally(() => {
      process.exit(1)
    })
})
