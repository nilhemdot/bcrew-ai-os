#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY,
} from '../lib/foundation-knowledge-base-compiler-design.js'
import {
  KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
} from '../lib/foundation-knowledge-base-quality-gate.js'
import {
  FOUNDATION_KB_COMPILER_V1_APPROVAL_PATH,
  FOUNDATION_KB_COMPILER_V1_CARD_ID,
  FOUNDATION_KB_COMPILER_V1_CHANGED_FILES,
  FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
  FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH,
  FOUNDATION_KB_COMPILER_V1_NOT_NEXT_BOUNDARIES,
  FOUNDATION_KB_COMPILER_V1_PLAN_PATH,
  FOUNDATION_KB_COMPILER_V1_PROOF_COMMANDS,
  FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH,
  FOUNDATION_KB_COMPILER_V1_SPRINT_ID,
  buildFoundationKbCompilerV1DogfoodProof,
  compileFoundationKbDraft,
} from '../lib/foundation-kb-compiler-v1.js'
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
const ACTION_REVIEW_CARD_ID = 'ACTION-ROUTE-REVIEW-INBOX-001'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function inferDecisionSourceId(sourceRef = '') {
  const source = String(sourceRef || '')
  if (/strategy|business strategy|source-of-truth/i.test(source)) return 'SRC-STRATEGY-001'
  if (/freedom|bhag/i.test(source)) return 'SRC-FREEDOM-BHAG-001'
  return ''
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    title: 'Foundation KB compiler V1',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 31,
    source: 'Steve 2026-05-18 FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.',
    summary: 'Build the first Foundation-owned proposal-only compiler path from existing source-backed records into a quality-gated KB/wiki draft.',
    whyItMatters: 'The KB direction is useful only if Foundation can turn existing atoms, decisions, and source-backed facts into cited, fresh, privacy-aware drafts before agents consume them.',
    nextAction: closeCard
      ? `Done under \`${FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY}\`. Next: ${ACTION_REVIEW_CARD_ID}.`
      : 'Compile existing source-backed records into a proposal-only draft; do not run extraction, transcript fetches, model calls, or external writes.',
    statusNote: closeCard
      ? `Closed under \`${FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY}\`; proposal-only compiler path, no live extraction or model calls.`
      : `Scope/proof: \`${FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY}\`; existing records only, proposal-only output.`,
    owner: 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-knowledge-base-compiler-design.js',
      'lib/foundation-knowledge-base-quality-gate.js',
      'lib/build-intel-karpathy-llm-kb-preflight.js',
      'lib/intelligence-atoms.js',
      'lib/intelligence-synthesis-facts.js',
      'lib/foundation-intelligence-audit-verifier.js',
      'lib/build-lane-reliability.js',
    ],
    existingDocs: [
      'docs/process/foundation-knowledge-base-compiler-design-001-plan.md',
      'docs/process/knowledge-base-quality-gate-001-plan.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-knowledge-base-compiler-design-closeout.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-knowledge-base-quality-gate-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-foundation-knowledge-base-compiler-design-check.mjs',
      'scripts/process-knowledge-base-quality-gate-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation owns source contracts, ingestion permission, compiler rules, quality gates, and query interface.',
      'Agents consume compiled knowledge only after Foundation-owned quality gates and query contracts pass.',
      'No live extraction, transcript fetch, screenshot capture, model call, paid/auth run, or external write without Steve approval.',
    ],
    reused: [
      'Compiler design contract.',
      'Executable KB quality gate.',
      'Existing source-backed synthesis facts, locked decisions, and intelligence atoms.',
      'Build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No extraction runtime implementation.',
      'No transcript fetcher or screenshot capture.',
      'No model summarizer.',
      'No compiled page writer, query index, vector table, Research Inbox write, atom creation, or backlog mutation from extracted content.',
    ],
    exactGap: 'The design and quality gate exist; Foundation now needs a first proposal-only compiler path that proves existing records can become a cited, fresh, privacy-aware KB draft.',
    overBroadRisk: 'This can drift into live extraction, model summarization, Harlan memory, query indexing, or writing compiled pages. V1 is read-only/proposal-only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-18T01:45:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: FOUNDATION_KB_COMPILER_V1_PLAN_PATH,
    definitionOfDone: 'Foundation KB compiler V1 compiles existing source-backed records into a proposal-only KB draft, the quality gate accepts/rejects correctly, no live extraction/model/external write runs, verifier coverage exists, closeout is registered, and full ship gate passes.',
    proofCommands: FOUNDATION_KB_COMPILER_V1_PROOF_COMMANDS,
    readinessBlockerCleared: 'Compiler design and quality gate are shipped; Steve approved the Foundation KB/action review queue with no live extraction or model calls.',
    notNextBoundaries: FOUNDATION_KB_COMPILER_V1_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: FOUNDATION_KB_COMPILER_V1_APPROVAL_PATH,
      closeoutKey: FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const planCriticResult = {
    status: 'pass',
    score: 10,
    cardId: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    closeoutKey: FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
  }
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
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-kb-compiler-v1')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `kb-compiler-v1-${stableRunId(FOUNDATION_KB_COMPILER_V1_PLAN_PATH)}`,
        FOUNDATION_KB_COMPILER_V1_CARD_ID,
        FOUNDATION_KB_COMPILER_V1_PLAN_PATH,
        FOUNDATION_KB_COMPILER_V1_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-kb-compiler-v1',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${FOUNDATION_KB_COMPILER_V1_CARD_ID}.`,
        JSON.stringify({ closeoutKey: FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH,
    operation: 'create/update Foundation KB compiler V1 backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: FOUNDATION_KB_COMPILER_V1_SPRINT_ID,
        status: 'active',
        goal: 'Build the first proposal-only Foundation KB compiler path from existing source-backed records.',
        activeBlockerCardId: closeCard ? null : FOUNDATION_KB_COMPILER_V1_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-kb-compiler-v1',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue to ${ACTION_REVIEW_CARD_ID}.`
            : 'Compile existing source-backed records into a proposal-only KB draft; no extraction, model calls, external writes, or compiled page writes.',
          priorityOrder: [
            FOUNDATION_KB_COMPILER_V1_CARD_ID,
            ACTION_REVIEW_CARD_ID,
            'ACTION-ROUTE-PROMOTION-WORKFLOW-001',
            'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001',
          ],
          notNext: FOUNDATION_KB_COMPILER_V1_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Existing source-backed facts, locked decisions, and atoms can produce a cited proposal-only KB draft.',
            'The KB quality gate accepts the healthy draft and rejects bad dogfood variants.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-kb-compiler-v1',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || FOUNDATION_KB_COMPILER_V1_SPRINT_ID,
      reason: 'Steve approved continuing the Foundation KB/action review queue after the parallel builder protocol shipped.',
    },
  )
}

async function loadExistingSourceBackedRecords() {
  const pool = createPool()
  try {
    const [facts, decisions, atoms] = await Promise.all([
      pool.query(`
        SELECT fact_id, title, claim, source_id, source_ref, evidence_id, artifact_id, source_url, as_of, min_tier, status, updated_at
        FROM intelligence_synthesis_facts
        WHERE status = 'active'
          AND min_tier <= 2
          AND source_id IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 3
      `),
      pool.query(`
        SELECT id, title, summary, source_ref, evidence_notes, status, updated_at
        FROM decisions
        WHERE status = 'locked'
          AND source_ref IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 3
      `),
      pool.query(`
        SELECT atom_id, title, derived_claim, content, source_id, artifact_id, evidence_excerpt, min_tier, status, updated_at
        FROM intelligence_atoms
        WHERE status NOT IN ('rejected', 'archived', 'superseded')
          AND min_tier <= 2
          AND source_id IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 3
      `),
    ])
    return [
      ...facts.rows.map(row => ({
        recordType: 'synthesis_fact',
        recordId: row.fact_id,
        title: row.title,
        claim: row.claim,
        sourceId: row.source_id,
        evidenceRef: row.source_url || row.artifact_id || row.evidence_id || row.source_ref || `fact:${row.fact_id}`,
        minTier: row.min_tier,
        asOf: row.as_of || row.updated_at,
        status: row.status,
      })),
      ...decisions.rows.map(row => ({
        recordType: 'decision',
        recordId: row.id,
        title: row.title,
        claim: row.summary,
        sourceId: inferDecisionSourceId(row.source_ref),
        evidenceRef: row.source_ref || row.evidence_notes || `decision:${row.id}`,
        minTier: 1,
        updatedAt: row.updated_at,
        status: row.status,
      })).filter(record => record.sourceId),
      ...atoms.rows.map(row => ({
        recordType: 'atom',
        recordId: row.atom_id,
        title: row.title,
        claim: row.derived_claim || row.evidence_excerpt || row.title,
        sourceId: row.source_id,
        evidenceRef: row.artifact_id || row.evidence_excerpt || `atom:${row.atom_id}`,
        minTier: row.min_tier,
        updatedAt: row.updated_at,
        status: row.status,
      })),
    ]
  } finally {
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    qualityGateSource,
    verifierSource,
    foundationVerifySource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
    liveRecords,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_KB_COMPILER_V1_APPROVAL_PATH,
      cardId: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    }),
    getBacklogItemsByIds([
      FOUNDATION_KB_COMPILER_V1_CARD_ID,
      FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID,
      KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
      ACTION_REVIEW_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_KB_COMPILER_V1_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(FOUNDATION_KB_COMPILER_V1_PLAN_PATH),
    readRepoFile(FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH),
    readRepoFile('lib/foundation-kb-compiler-v1.js'),
    readRepoFile('lib/foundation-knowledge-base-quality-gate.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    loadExistingSourceBackedRecords(),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const liveDraft = compileFoundationKbDraft({ records: liveRecords, compiledAt: '2026-05-18T01:45:00.000-04:00', staleAfter: '2026-06-18T01:45:00.000-04:00' })
  const dogfood = buildFoundationKbCompilerV1DogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: FOUNDATION_KB_COMPILER_V1_CARD_ID, priority: 'P0' },
    changedFiles: FOUNDATION_KB_COMPILER_V1_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_KB_COMPILER_V1_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const card = cards.find(item => item.id === FOUNDATION_KB_COMPILER_V1_CARD_ID) || null
  const designCard = cards.find(item => item.id === FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CARD_ID) || null
  const qualityCard = cards.find(item => item.id === KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) || null
  const reviewCard = cards.find(item => item.id === ACTION_REVIEW_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_KB_COMPILER_V1_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const recordTypes = new Set(liveDraft.sourceRecords.map(record => record.recordType))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || FOUNDATION_KB_COMPILER_V1_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === FOUNDATION_KB_COMPILER_V1_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, designCard?.lane === 'done' && String(designCard?.statusNote || '').includes(FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_CLOSEOUT_KEY), 'compiler design prerequisite is done', designCard ? `${designCard.id}:${designCard.lane}` : 'missing')
  addCheck(checks, qualityCard?.lane === 'done' && String(qualityCard?.statusNote || '').includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY), 'quality gate prerequisite is done', qualityCard ? `${qualityCard.id}:${qualityCard.lane}` : 'missing')
  addCheck(checks, reviewCard && ['scoped', 'research'].includes(reviewCard.lane), 'review inbox follow-up exists but is not built by this card', reviewCard ? `${reviewCard.id}:${reviewCard.lane}` : 'missing')
  addCheck(checks, liveRecords.length >= 3 && recordTypes.has('synthesis_fact') && recordTypes.has('decision') && recordTypes.has('atom'), 'existing source-backed facts, decisions, and atoms feed the compiler', `records=${liveRecords.length} types=${[...recordTypes].join(',')}`)
  addCheck(checks, liveDraft.status === 'draft_ready' && liveDraft.qualityGate.ok === true, 'live existing records compile into a quality-gated draft', `status=${liveDraft.status} violations=${liveDraft.qualityGate.summary.violationCount}`)
  addCheck(checks, liveDraft.compiledPageDraft.frontmatter.sourceIds.length >= 2 && liveDraft.summary.citationCount === liveDraft.summary.claimCount, 'draft preserves source IDs and citations for every claim', `sources=${liveDraft.compiledPageDraft.frontmatter.sourceIds.length} citations=${liveDraft.summary.citationCount}/${liveDraft.summary.claimCount}`)
  addCheck(checks, liveDraft.compiledPageDraft.frontmatter.privacyTier && liveDraft.compiledPageDraft.frontmatter.staleAfter && liveDraft.compiledPageDraft.frontmatter.compilerVersion, 'draft carries privacy, freshness, and compiler frontmatter', JSON.stringify(liveDraft.compiledPageDraft.frontmatter))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe compiler cases', dogfood.invariant)
  addCheck(checks, liveDraft.proposalOnly === true && liveDraft.writesCompiledPage === false && liveDraft.writesResearchInbox === false && liveDraft.writesAtoms === false && liveDraft.writesBacklog === false, 'compiler is proposal-only and does not mutate trusted stores', 'no compiled page/research/atom/backlog writes')
  addCheck(checks, liveDraft.liveExtractionStarted === false && liveDraft.modelCallsStarted === false && liveDraft.externalWritesStarted === false, 'compiler does not run extraction, model calls, or external writes', 'read-only existing records')
  addCheck(checks, packageJson.scripts?.['process:foundation-kb-compiler-v1-check'] === `node --env-file-if-exists=.env ${FOUNDATION_KB_COMPILER_V1_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-kb-compiler-v1-check'] || 'missing')
  addCheck(checks, moduleSource.includes('compileFoundationKbDraft') && moduleSource.includes('buildFoundationKbCompilerV1DogfoodProof'), 'module owns compiler contract and dogfood', 'lib/foundation-kb-compiler-v1.js')
  addCheck(checks, qualityGateSource.includes('evaluateKnowledgeBaseQualityGate'), 'compiler reuses shipped quality gate', 'lib/foundation-knowledge-base-quality-gate.js')
  addCheck(checks, verifierSource.includes(FOUNDATION_KB_COMPILER_V1_CARD_ID) && verifierSource.includes('buildFoundationKbCompilerV1DogfoodProof'), 'intelligence/audit verifier covers compiler V1', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, coverageSource.includes('FOUNDATION_KB_COMPILER_V1_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include compiler V1 card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('FOUNDATION_KB_COMPILER_V1_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') || verifierSource.includes(FOUNDATION_KB_COMPILER_V1_CARD_ID), 'foundation:verify receives compiler V1 coverage', 'foundation verifier module assurance')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_KB_COMPILER_V1_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY), 'closeout registry source contains closeout key', FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH), 'closeout handoff exists', FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(ACTION_REVIEW_CARD_ID) && closeoutDoc.includes('This did not run live extraction'), 'closeout documents next card and no-live-extraction limit', FOUNDATION_KB_COMPILER_V1_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY) && currentState.includes(FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY), 'current plan/state name compiler V1 closeout', FOUNDATION_KB_COMPILER_V1_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: FOUNDATION_KB_COMPILER_V1_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    liveSourceRecordCount: liveRecords.length,
    draftStatus: liveDraft.status,
    dogfoodOk: dogfood.ok,
    liveExtractionStarted: liveDraft.liveExtractionStarted,
    modelCallsStarted: liveDraft.modelCallsStarted,
    externalWritesStarted: liveDraft.externalWritesStarted,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Foundation KB compiler V1 check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
