#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  REQUIRED_REPAIR_PROOF_FAMILIES,
  SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH,
  SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
  SOURCE_MATURITY_REPAIR_COLLAPSE_CHANGED_FILES,
  SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY,
  SOURCE_MATURITY_REPAIR_COLLAPSE_MANIFEST_PATH,
  SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID,
  SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH,
  SOURCE_MATURITY_REPAIR_COLLAPSE_PROOF_COMMANDS,
  SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH,
  SOURCE_MATURITY_REPAIR_ARCHIVE_SCRIPT_PATH,
  buildSourceMaturityRepairManifest,
  evaluateSourceMaturityRepairCollapse,
  renderSourceMaturityRepairCollapseCloseout,
} from '../lib/source-maturity-repair-collapse.js'
import { buildSyntheticSourceMaturityContractGapRepairProof } from '../lib/source-maturity-contract-gap-repair.js'
import { buildSyntheticGithubBuildIntelTrustGapRepairProof } from '../lib/source-maturity-github-build-intel-trust-gap-repair.js'
import { buildSyntheticStrategyMonitoringGapRepairProof } from '../lib/source-maturity-strategy-monitoring-gap-repair.js'
import { buildSyntheticSourceMaturityEvidenceGapRepairProof } from '../lib/source-maturity-evidence-gap-repair.js'
import { buildSyntheticStrategyAtomFlowRepairProof } from '../lib/source-maturity-strategy-atom-flow-repair.js'
import { buildSyntheticStrategyRoutingGapRepairProof } from '../lib/source-maturity-strategy-routing-gap-repair.js'
import { buildSyntheticSourceMaturityGapFollowupProof } from '../lib/source-maturity-gap-followup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const PACKAGE_SCRIPT = 'process:source-maturity-repair-collapse-check'
const ACTOR = 'codex-source-maturity-repair-collapse'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    closeCard: false,
    stage: 'building_now',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  args.apply = args.apply || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  args.closeCard = args.closeCard || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function readOptionalRepoJson(relativePath, fallback) {
  try {
    return await readRepoJson(relativePath)
  } catch {
    return fallback
  }
}

async function listRepoSourceMaturityFiles() {
  const roots = ['lib', 'scripts']
  const files = []
  for (const root of roots) {
    const entries = await fs.readdir(path.join(repoRoot, root), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!/\.(?:mjs|js)$/i.test(entry.name)) continue
      if (!entry.name.includes('source-maturity')) continue
      if (!/(repair|gap-followup|routing-gap-repair-db|grid)/.test(entry.name)) continue
      files.push(`${root}/${entry.name}`)
    }
  }
  return files.sort()
}

async function readSources(filePaths = []) {
  const result = {}
  await Promise.all(filePaths.map(async file => {
    result[file] = await readRepoFile(file)
  }))
  return result
}

function buildLegacyProofs() {
  return {
    contract_gap: buildSyntheticSourceMaturityContractGapRepairProof(),
    trust_gap: buildSyntheticGithubBuildIntelTrustGapRepairProof(),
    monitoring_gap: buildSyntheticStrategyMonitoringGapRepairProof(),
    evidence_gap: buildSyntheticSourceMaturityEvidenceGapRepairProof(),
    atom_flow: buildSyntheticStrategyAtomFlowRepairProof(),
    routing_gap: buildSyntheticStrategyRoutingGapRepairProof(),
    gap_followup: buildSyntheticSourceMaturityGapFollowupProof(),
  }
}

function hasExecutableSourceOrAtomWritePath(source = '') {
  return /import\s+\{[^}]*\b(?:upsertSourceCrawlItem|upsertSourceCrawlTarget|upsertIntelligenceAtom|recordIntelligenceAtomHit)\b[^}]*\}\s+from\s+['"][^'"]+['"]/m.test(source) ||
    /(?:^|\n)\s*(?:await\s+)?(?:upsertSourceCrawlItem|upsertSourceCrawlTarget|upsertIntelligenceAtom|recordIntelligenceAtomHit)\s*\(/m.test(source)
}

function hasExecutableBrowserOrExternalWritePath(source = '') {
  return /import\s+.*(?:playwright|puppeteer|browserbase|gmail|clickup).*from\s+['"][^'"]+['"]/im.test(source) ||
    /(?:^|\n)\s*(?:await\s+)?(?:chromium|firefox|webkit|puppeteer|browserbase|gmail|clickup)\s*\./im.test(source) ||
    /(?:^|\n)\s*(?:await\s+)?drive\.permissions\./im.test(source)
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
    title: 'Collapse source-maturity repair clones into one engine',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 5,
    source: 'Claude + Codex audit consensus: source-maturity repair clones are copy-paste bloat',
    summary: 'V1 creates one manifest/proof engine for source-maturity repair families and proves old family fixtures without deleting old wrappers.',
    whyItMatters: 'The repair clone surface is large enough to slow safe changes. Future source-maturity repairs need one reusable checker and data manifest instead of another per-card proof script.',
    nextAction: closeCard
      ? `Done as V1 manifest/control under \`${SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY}\`. Old wrappers remain; migration/archive needs a follow-up card that repoints gates first.`
      : 'Build the shared manifest/proof engine, dogfood every source-maturity repair family, and keep old wrapper deletion out of V1.',
    statusNote: closeCard
      ? `Closed as V1 manifest/control under \`${SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY}\`; old repair wrappers are still present by design.`
      : `Scope/proof: \`${SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY}\`; no repair/check deletion, source row mutation, extraction, browser session, atom/vector write, or external write.`,
    owner: 'Foundation Builder',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
    order: 5,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH,
    definitionOfDone: 'V1 shared source-maturity repair manifest/proof engine classifies every existing repair/check family and runs one old fixture from each family; no old wrapper/check deletion occurs; known limit says wrapper migration/archive is follow-up; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_REPAIR_COLLAPSE_PROOF_COMMANDS,
    readinessBlockerCleared: 'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001 is done, so protected deletions now require full gate after gate repoint; this V1 still performs no deletion.',
    notNextBoundaries: SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: {
      existingCode: [
        'lib/source-maturity-grid.js',
        'lib/source-maturity-gap-followup.js',
        'lib/source-maturity-contract-gap-repair.js',
        'lib/source-maturity-github-build-intel-trust-gap-repair.js',
        'lib/source-maturity-strategy-monitoring-gap-repair.js',
        'lib/source-maturity-evidence-gap-repair.js',
        'lib/source-maturity-strategy-atom-flow-repair.js',
        'lib/source-maturity-strategy-routing-gap-repair.js',
        'lib/source-maturity-routing-gap-repair.js',
        'lib/process-plan-critic.js',
      ],
      existingDocs: [
        SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH,
        'docs/process/foundation-tuneup-roadmap-001-plan.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
      ],
      existingScripts: [
        SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH,
        'scripts/process-source-maturity-*-repair-check.mjs legacy fixtures',
        'npm run process:foundation-tuneup-roadmap-check -- --json',
        'npm run backlog:hygiene -- --json',
      ],
      existingPolicy: [
        'Live Backlog is task truth.',
        'Nothing manual stays trusted.',
        'Gates must catch real bugs, not prove paperwork.',
        'Deleted protected process files require full ship gate after gate repoint.',
      ],
      reused: [
        'legacy synthetic source-maturity repair fixtures',
        'source maturity grid/readiness proof logic',
        'Plan Critic and process write guard',
        'Foundation tune-up roadmap current sprint',
      ],
      notRebuilt: [
        'No old wrapper/check deletion in V1.',
        'No source row mutation or live extraction.',
        'No per-hub restructure.',
      ],
      exactGap: 'The audit found tens of thousands of lines of repeated source-maturity repair/check code with the same family shapes.',
      overBroadRisk: 'Deleting source-maturity check files before gate repoint would recreate the verifier crash pattern the prior card just fixed.',
      readyBy: 'Steve overnight continuous Foundation tune-up approval + Claude/Codex audit consensus',
      readyAt: '2026-05-30T04:55:00-04:00',
    },
    metadata: {
      approvalRef: SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY,
      v1Scope: 'manifest-control-collapse-no-delete',
      nextCardId: closeCard ? SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID : SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const items = list(currentSprint.items)
  const nextItems = items.map(existing => {
    if (existing.cardId !== SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID) return existing
    return {
      ...existing,
      ...item,
      order: existing.order || existing.sprintOrder || item.order,
      sprintOrder: existing.sprintOrder || existing.order || item.order,
    }
  })
  if (!nextItems.some(existing => existing.cardId === SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID)) {
    nextItems.push(item)
  }
  if (closeCard) {
    return nextItems.map(existing => {
      if (existing.cardId !== SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID) return existing
      return {
        ...existing,
        stage: 'scoping',
        proofCommands: list(existing.proofCommands || existing.proof_commands).length
          ? existing.proofCommands || existing.proof_commands
          : ['npm run process:foundation-tuneup-roadmap-check -- --json', 'npm run process:builder-memory-system-check -- --json', 'npm run backlog:hygiene -- --json'],
      }
    })
  }
  return nextItems
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH,
    operation: 'create/update source-maturity repair collapse backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  const card = buildCardRow({ closeCard, stage })
  const currentSprint = await getActiveFoundationCurrentSprint()
  const sprintId = currentSprint.sprint?.sprintId || SOURCE_MATURITY_REPAIR_COLLAPSE_SPRINT_ID
  const activeBlockerCardId = closeCard ? SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID : SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID
  const sprintItem = buildSprintItem({ closeCard, stage })
  const nextItems = mergeSprintItems(currentSprint, sprintItem, closeCard)
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
      [card.id, card.title, card.scope, card.lane, card.priority, card.rank, card.source, card.summary, card.whyItMatters, card.nextAction, card.statusNote, card.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `source-maturity-repair-collapse-${stableRunId(SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH)}`,
        SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
        SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        planReview.gateDecision?.level || 'full',
        planReview.gateDecision?.fullVerifyRequired !== false,
        SOURCE_MATURITY_REPAIR_COLLAPSE_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
          closeoutKey: SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY, stage, v1Scope: 'manifest-control-collapse-no-delete' }),
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

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId,
        status: currentSprint.sprint?.status || 'active',
        goal: currentSprint.sprint?.goal || 'Foundation tune-up from Claude/Codex audits.',
        activeBlockerCardId,
        metadata: {
          ...(currentSprint.sprint?.metadata || {}),
          activeBlockerCardId,
          sourceMaturityRepairCollapseV1: closeCard ? 'done_manifest_control_no_delete' : 'building_manifest_control_no_delete',
          nextAction: closeCard
            ? `Continue ${SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID}; keep per-hub restructure parked for Steve checkpoint.`
            : 'Finish source-maturity repair collapse V1 manifest/control proof without deleting old wrappers.',
        },
      },
      items: nextItems,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; source-maturity collapse is the active post-tiering card.',
    },
  )

  return { card }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let applied = false

  await initFoundationDb()
  try {
    const filePaths = await listRepoSourceMaturityFiles()
    const fileSources = await readSources(filePaths)
    const generatedManifest = buildSourceMaturityRepairManifest({ filePaths, fileSources })
    const manifest = await readOptionalRepoJson(SOURCE_MATURITY_REPAIR_COLLAPSE_MANIFEST_PATH, generatedManifest)
    const legacyProofs = buildLegacyProofs()
    const collapseEvaluation = evaluateSourceMaturityRepairCollapse({ manifest, legacyProofs })
    const planSource = await readRepoFile(SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH)
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
      changedFiles: SOURCE_MATURITY_REPAIR_COLLAPSE_CHANGED_FILES,
      declaredRisk: 'source-maturity repair infrastructure, package command surface, Current Sprint, closeout metadata, and Foundation process gate.',
      repoRoot,
    })

    if (args.apply || args.closeCard) {
      await upsertLiveCardAndPlanCritic({ closeCard: args.closeCard, stage: args.stage, planReview })
      applied = true
    }

    const [
      packageJson,
      scriptSource,
      moduleSource,
      planCriticRuns,
      cards,
      activeSprint,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH),
      readRepoFile('lib/source-maturity-repair-collapse.js'),
      getPlanCriticRunsByCardIds([SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID]),
      getBacklogItemsByIds([SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID, SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    const activeItem = list(activeSprint.items).find(item => item.cardId === SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID)
    const combinedPlanCriticRuns = [
      ...planCriticRuns,
      ...list(activeSprint.planCriticRuns),
    ].filter((run, index, all) =>
      all.findIndex(candidate => candidate.runId === run.runId && candidate.cardId === run.cardId) === index,
    )
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      ...activeSprint,
      backlogItems: cards,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns: combinedPlanCriticRuns,
    })
    const approvalStatus = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH,
        cardId: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
      })
      : { ok: true, mode: 'not-closing' }

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH}`,
      'package exposes source-maturity repair collapse proof',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )
    const movedLegacyScripts = list(manifest.movedFiles)
      .map(move => String(move?.from || '').trim())
      .filter(file => file.startsWith('scripts/'))
    const routedLegacyScripts = movedLegacyScripts.filter(legacyPath =>
      Object.values(packageJson.scripts || {}).some(command =>
        String(command || '') === `node --env-file-if-exists=.env ${SOURCE_MATURITY_REPAIR_ARCHIVE_SCRIPT_PATH} --legacy=${legacyPath}`),
    )
    addCheck(
      checks,
      movedLegacyScripts.length > 0 && routedLegacyScripts.length === movedLegacyScripts.length,
      'legacy source-maturity npm scripts route through the generic archive runner',
      `${routedLegacyScripts.length}/${movedLegacyScripts.length} routed`,
    )
    addCheck(
      checks,
      planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
      'Plan Critic passes for source-maturity repair collapse V1',
      buildPlanCriticResultSummary(planReview),
    )
    addCheck(
      checks,
      collapseEvaluation.ok,
      'shared collapse evaluator passes manifest and all legacy family fixtures',
      collapseEvaluation.failures.map(failure => failure.check).join(', ') || 'healthy',
    )
    addCheck(
      checks,
      REQUIRED_REPAIR_PROOF_FAMILIES.every(family => Object.prototype.hasOwnProperty.call(legacyProofs, family)),
      'legacy proof map contains every repair family',
      Object.keys(legacyProofs).join(', '),
    )
    addCheck(
      checks,
      manifest.summary?.legacyWrappersArchived === true &&
        manifest.reduction?.afterActiveRepairFileCount < manifest.reduction?.beforeActiveRepairFileCount &&
        manifest.reduction?.afterActiveRepairFileCount <= manifest.reduction?.activeTargetMax,
      'legacy wrappers/checks are archived and active source-maturity repair files are under target',
      `${manifest.reduction?.beforeActiveRepairFileCount || 'unknown'} -> ${manifest.reduction?.afterActiveRepairFileCount || 'unknown'} active files`,
    )
    addCheck(
      checks,
      moduleSource.includes('evaluateSourceMaturityRepairCollapse') &&
        moduleSource.includes('sourceMaturityProofFamilyChecks') &&
        moduleSource.includes('legacyWrappersArchived'),
      'shared module owns family contracts and archive-reduction posture',
      'lib/source-maturity-repair-collapse.js',
    )
    addCheck(
      checks,
      scriptSource.includes('assertProcessCheckWriteAllowed') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.apply') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.closeCard'),
      'live write paths require explicit process-check write flags',
      SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH,
    )
    addCheck(
      checks,
      !hasExecutableSourceOrAtomWritePath(scriptSource),
      'collapse proof has no source-row or atom/vector write path',
      'static unsafe write scan',
    )
    addCheck(
      checks,
      !hasExecutableBrowserOrExternalWritePath(scriptSource),
      'collapse proof starts no browser/session/external-write path',
      'static unsafe runtime scan',
    )
    addCheck(
      checks,
      !/fs\.(?:rm|unlink|rename)|trash\s+/i.test(scriptSource + moduleSource),
      'collapse proof does not perform file deletion or runtime moves',
      'static deletion scan',
    )
    addCheck(
      checks,
      args.closeCard ? approvalStatus.ok : true,
      'approval file validates when closing',
      approvalStatus.mode || approvalStatus.failures?.map(failure => failure.check).join(', ') || 'not closing',
    )
    addCheck(
      checks,
      !applied || activeItem?.stage === (args.closeCard ? 'done_this_sprint' : normalizeStage(args.stage)),
      'Current Sprint item stage matches requested posture after apply',
      activeItem?.stage || 'not applied',
    )
    addCheck(
      checks,
      !args.closeCard || activeSprint.sprint?.activeBlockerCardId === SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID,
      'close-card advances active blocker to next safe cleanup card',
      activeSprint.sprint?.activeBlockerCardId || 'missing',
    )
    addCheck(
      checks,
      args.closeCard
        ? currentSprintStatus.status !== 'risk'
        : ['healthy', 'warning', 'risk'].includes(currentSprintStatus.status),
      'Current Sprint status is computed from live backlog, Plan Critic, and closeouts',
      `${currentSprintStatus.status}: ${currentSprintStatus.findings?.[0]?.check || 'no findings'}`,
    )

    const failures = checks.filter(check => !check.ok)
    const output = {
      ok: failures.length === 0,
      status: failures.length ? 'failed' : 'healthy',
      cardId: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
      closeoutKey: SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY,
      applied,
      closed: args.closeCard,
      planCritic: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      manifest: manifest.summary,
      reduction: manifest.reduction,
      familyProofs: Object.fromEntries(Object.entries(legacyProofs).map(([family, proof]) => [family, Boolean(proof?.ok)])),
      collapseEvaluation: collapseEvaluation.summary,
      currentSprint: {
        status: currentSprintStatus.status,
        activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
        itemStage: activeItem?.stage || null,
      },
      closeoutMarkdown: args.closeCard ? renderSourceMaturityRepairCollapseCloseout(collapseEvaluation) : null,
      checks,
      failed: failures,
    }

    if (args.json) {
      console.log(JSON.stringify(output, null, 2))
    } else if (failures.length) {
      console.error(`SOURCE_MATURITY_REPAIR_COLLAPSE_CHECK failed: ${failures.map(failure => failure.check).join(', ')}`)
    } else {
      console.log(`SOURCE_MATURITY_REPAIR_COLLAPSE_CHECK healthy: ${manifest.summary.entryCount} entries, ${collapseEvaluation.summary.proofFamilyCount}/${REQUIRED_REPAIR_PROOF_FAMILIES.length} family proofs`)
    }

    process.exitCode = failures.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
