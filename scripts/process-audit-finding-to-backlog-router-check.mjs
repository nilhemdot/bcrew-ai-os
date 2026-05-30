#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_CARD_ID as CARD_ID,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_CHANGED_FILES,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_CLOSEOUT_KEY as CLOSEOUT_KEY,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_CLOSEOUT_PATH as CLOSEOUT_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_NEXT_CARD_ID as NEXT_CARD_ID,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_NOT_NEXT,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_PLAN_PATH as PLAN_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_PROOF_COMMANDS,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_SCRIPT_PATH as SCRIPT_PATH,
  AUDIT_FINDING_TO_BACKLOG_ROUTER_SPRINT_ID as SPRINT_ID,
  AUDIT_ROUTER_REAL_MISSING_CARD_DEFINITIONS,
  buildAuditFindingToBacklogRouterDogfoodProof,
  buildScopedAuditBacklogCard,
  routeAuditFindingsToBacklogTruth,
  summarizeAuditFindingBacklogRouter,
} from '../lib/audit-finding-to-backlog-router.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
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
const MAY_18_AUDIT_POINTER_PATH = 'docs/handoffs/nightly-deep-audit-2026-05-18.json'

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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function normalizeFinding(finding = {}, source = {}) {
  return {
    ...finding,
    sourceAuditPath: source.path,
    sourceAuditLabel: source.label,
  }
}

async function loadMay18AuditSource() {
  const pointer = await readRepoJson(MAY_18_AUDIT_POINTER_PATH)
  const archivePath = pointer.archivePath || MAY_18_AUDIT_POINTER_PATH
  const audit = await readRepoJson(archivePath)
  return {
    label: 'may-18-archived-nightly-deep-audit',
    path: archivePath,
    generatedAt: audit.generatedAt || pointer.generatedAt || '',
    findings: (audit.findings || []).map(finding => normalizeFinding(finding, { label: 'may-18-archived-nightly-deep-audit', path: archivePath })),
    summary: audit.summary || pointer.sourceSummary || {},
  }
}

async function loadMay19AuditSource() {
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  return {
    label: 'may-19-current-deterministic-audit-snapshot',
    path: 'buildCodeQualityNightlyAudit({ skipEndpointFetch: true })',
    generatedAt: audit.generatedAt || new Date().toISOString(),
    findings: (audit.findings || []).map(finding => normalizeFinding(finding, { label: 'may-19-current-deterministic-audit-snapshot', path: 'current deterministic audit snapshot' })),
    summary: audit.summary || {},
    audit,
  }
}

async function loadAuditSources() {
  const [may18, may19] = await Promise.all([
    loadMay18AuditSource(),
    loadMay19AuditSource(),
  ])
  return [may18, may19]
}

function flattenFindings(auditSources = []) {
  return auditSources.flatMap(source => source.findings || [])
}

function buildCardRow({ closeCard = false, routeSummary } = {}) {
  return {
    id: CARD_ID,
    title: 'Route audit findings into live backlog truth',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 4,
    source: 'Steve 2026-05-19: upgrade the auditor so findings become live work instead of report noise.',
    summary: 'Route every actionable audit finding to an existing live card, new scoped card, stale proof, approval-required blocker, or watch-only threshold.',
    whyItMatters: 'Audit reports are only useful if red/yellow findings create governed motion. Card-shaped work cannot remain buried in markdown or JSON.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; run \`${NEXT_CARD_ID}\` next.`
      : 'Run the router proof against May 18 archived audit findings and the current May 19 deterministic audit snapshot.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; ${routeSummary?.actionableFindingCount || 0} actionable findings routed with ${routeSummary?.missingRouteIds?.length || 0} missing routes.`
      : `Executing \`${CLOSEOUT_KEY}\`; scheduled audits remain report-only while this explicit gate routes findings into backlog truth.`,
    owner: 'Foundation Process',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `audit-finding-router-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertScopedCards(cards = []) {
  if (!cards.length) return
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of cards) {
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
              priority = EXCLUDED.priority,
              source = EXCLUDED.source,
              summary = EXCLUDED.summary,
              why_it_matters = EXCLUDED.why_it_matters,
              next_action = EXCLUDED.next_action,
              status_note = EXCLUDED.status_note,
              owner = EXCLUDED.owner,
              updated_at = NOW()
        `,
        [card.id, card.title, card.team, card.lane, card.priority, card.rank, card.source, card.summary, card.whyItMatters, card.nextAction, card.statusNote, card.owner],
      )
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ('backlog_updated','backlog_items',$1,'codex-audit-finding-router',$2,$3::jsonb)
        `,
        [
          card.id,
          `Scoped ${card.id} from audit finding router.`,
          JSON.stringify({ cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY, routeType: 'new_scoped_card' }),
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
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, routeSummary } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, routeSummary })
  const planRun = buildPlanCriticRun(planReview)
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-audit-finding-router')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        AUDIT_FINDING_TO_BACKLOG_ROUTER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-audit-finding-router',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID, routeSummary }),
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

function defaultExistingWorkCheck() {
  return {
    existingCode: [
      'lib/code-quality-nightly-audit.js',
      'lib/nightly-deep-audit-upgrade.js',
      'lib/foundation-db.js',
    ],
    existingDocs: [
      'docs/handoffs/nightly-deep-audit-2026-05-18.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-nightly-deep-audit-p0-triage.md',
      'docs/process/system-health-nightly-audit-001-plan.md',
    ],
    existingScripts: [
      'process:code-quality-nightly-audit-check',
      'process:nightly-deep-audit-upgrade-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Scheduled audits stay report-only.',
      'Live Backlog is task truth.',
      'Audit findings need governed cards or explicit non-work classifications.',
    ],
    reused: [
      'May 18 archived nightly deep audit JSON.',
      'Current May 19 deterministic audit snapshot.',
      'DB-backed Backlog, Plan Critic, Current Sprint, and Recent Work closeout registries.',
    ],
    notRebuilt: [
      'No new auditor.',
      'No scheduler rewrite.',
      'No source extraction lane.',
      'No provider or model call.',
    ],
    exactGap: 'Report-only audits emit proposed cards, but no gate proves every red/yellow recommendation is live backlog truth or an explicit non-work classification.',
    overBroadRisk: 'This card can drift into implementing audit findings. It only routes findings and scopes missing cards.',
    readyBy: 'Steve',
    readyAt: '2026-05-19T09:40:00-04:00',
  }
}

function useExistingWorkCheck(item = {}) {
  const existing = item.existingWorkCheck
  return existing && typeof existing === 'object' && Object.keys(existing).length
    ? existing
    : defaultExistingWorkCheck()
}

function withCardMetadata(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Every actionable audit finding routes to live backlog truth or an explicit stale/approval/watch classification; missing card-shaped recommendations are created as scoped cards by the explicit apply path.',
    proofCommands: AUDIT_FINDING_TO_BACKLOG_ROUTER_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Finish audit finding-to-backlog routing before endpoint/doc/file-size cleanup and source activation.',
    notNextBoundaries: AUDIT_FINDING_TO_BACKLOG_ROUTER_NOT_NEXT,
    existingWorkCheck: useExistingWorkCheck(item),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH,
      scheduledAuditsRemainReportOnly: true,
    },
  }
}

function withNextCardMetadata(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    definitionOfDone: item.definitionOfDone || 'Endpoint metrics are fresh for key Foundation APIs; stale/missing rows clear or become explicit threshold rows.',
    nextAction: item.nextAction || 'Refresh or repair endpoint budget metrics for the Foundation operator routes.',
    notNextBoundaries: item.notNextBoundaries?.length ? item.notNextBoundaries : [
      'Do not start source/extraction activation before endpoint/doc/file-size cleanup cards are handled.',
      'Do not broaden into endpoint architecture refactors beyond metric freshness.',
    ],
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeSourceActivation: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withCardMetadata(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(withCardMetadata({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(withNextCardMetadata(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(withCardMetadata({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(withNextCardMetadata({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview, routeSummary, scopedCards = [] } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update audit router backlog cards, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertScopedCards(scopedCards)
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, routeSummary })
  const previous = await getActiveFoundationCurrentSprint()
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
          currentStatus: closeCard ? 'audit_finding_router_closed' : 'audit_finding_router_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Run ${NEXT_CARD_ID} next.`
            : `Finish ${CARD_ID}; audits cannot leave red/yellow work only in reports.`,
          auditRouterSummary: routeSummary,
          exitCriteria: [
            'Every actionable May 18/19 audit finding routes into live backlog truth or explicit non-work classification.',
            'Missing card-shaped recommendations are scoped into live backlog under explicit apply.',
            'Scheduled audit jobs remain report-only.',
            'Endpoint freshness is the next active blocker.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-audit-finding-router',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve required auditor findings to route to live backlog truth before source activation.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bstartExtractionRun\s*\(/,
    /\bfetchTranscript\s*\(/,
    /\bcreateChatCompletion\s*\(/,
    /\bresponses\.create\s*\(/,
    /\bsendGmail\b/,
    /\bwriteClickUp\b/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bspawn_agent\s*\(/,
  ]
  return patterns.filter(pattern => pattern.test(executableSource)).map(pattern => pattern.source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    moduleSource,
    scriptSource,
    packageJsonSource,
    codeQualitySource,
    nightlyDeepSource,
    auditSources,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH, { optional: true }),
    readRepoFile('lib/audit-finding-to-backlog-router.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/nightly-deep-audit-upgrade.js'),
    loadAuditSources(),
  ])

  const packageJson = JSON.parse(packageJsonSource)
  const findings = flattenFindings(auditSources)
  const before = await getFoundationSnapshot()
  const dogfood = buildAuditFindingToBacklogRouterDogfoodProof()
  const preRoute = routeAuditFindingsToBacklogTruth({
    findings,
    backlogItems: before.backlogItems || [],
  })
  const expectedMissingCardIds = Object.keys(AUDIT_ROUTER_REAL_MISSING_CARD_DEFINITIONS)
  const expectedRoute = routeAuditFindingsToBacklogTruth({
    findings,
    backlogItems: before.backlogItems || [],
    newlyScopedCardIds: expectedMissingCardIds,
  })
  const preMissingIds = new Set(preRoute.missingScopedCards.map(card => card.id))
  const scopedCards = expectedMissingCardIds
    .map(cardId => {
      const related = findings.filter(finding => [finding.proposedCard, finding.recommendedCardId, finding.repairCardId, finding.cardId].includes(cardId))
      return buildScopedAuditBacklogCard(cardId, related)
    })
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: false, routeSummary: summarizeAuditFindingBacklogRouter(expectedRoute) }),
    changedFiles: AUDIT_FINDING_TO_BACKLOG_ROUTER_CHANGED_FILES,
    declaredRisk: 'audit finding router, live backlog truth, Current Sprint, Plan Critic, and closeout registry',
    repoRoot,
  })

  if (args.apply || args.closeCard) {
    await ensureLiveState({
      closeCard: args.closeCard,
      planReview,
      routeSummary: summarizeAuditFindingBacklogRouter(expectedRoute),
      scopedCards,
    })
  }

  const after = await getFoundationSnapshot()
  const afterRoute = routeAuditFindingsToBacklogTruth({
    findings,
    backlogItems: after.backlogItems || [],
    newlyScopedCardIds: expectedMissingCardIds,
  })
  const routeSummary = summarizeAuditFindingBacklogRouter(afterRoute)
  const [approval, cardRows, planCriticRuns, activeSprint] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...expectedMissingCardIds]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
  ])
  const routerCard = cardRows.find(item => item.id === CARD_ID) || null
  const nextCard = cardRows.find(item => item.id === NEXT_CARD_ID) || null
  const missingLiveCards = expectedMissingCardIds.filter(cardId => !cardRows.some(item => item.id === cardId))
  const activeRouterItem = activeSprint.items?.find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = activeSprint.items?.find(item => item.cardId === NEXT_CARD_ID) || null
  const unsafePatterns = [
    ...containsUnsafeRuntimeCall(moduleSource).map(pattern => `module:${pattern}`),
    ...containsUnsafeRuntimeCall(scriptSource).map(pattern => `script:${pattern}`),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || AUDIT_FINDING_TO_BACKLOG_ROUTER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for router plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing-card audit work and covers all route categories', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || dogfood.mode)
  addCheck(checks, auditSources.some(source => source.label.includes('may-18')) && auditSources.some(source => source.label.includes('may-19')), 'May 18 archived and May 19 current audit sources are included', auditSources.map(source => `${source.label}:${source.findings.length}`).join(', '))
  addCheck(checks, findings.length >= 20 && afterRoute.actionableFindingCount >= 20, 'router evaluates a material actionable May 18/19 finding set', `${afterRoute.actionableFindingCount}/${findings.length}`)
  addCheck(checks, preRoute.missingScopedCards.length >= 1 || expectedMissingCardIds.every(cardId => (before.backlogItems || []).some(item => item.id === cardId)), 'pre-apply route detects missing scoped cards or proves they already exist', preRoute.missingScopedCards.map(card => card.id).join(', ') || 'already present')
  addCheck(checks, expectedMissingCardIds.every(cardId => preMissingIds.has(cardId) || (before.backlogItems || []).some(item => item.id === cardId)), 'May 18/19 missing recommendations are known and scoped by definition', expectedMissingCardIds.join(', '))
  addCheck(checks, afterRoute.ok === true && routeSummary.missingRouteIds.length === 0 && routeSummary.unresolvedNamedCardIds.length === 0, 'every actionable audit finding routes to backlog truth or explicit classification', JSON.stringify(routeSummary))
  addCheck(checks, Number(afterRoute.routeCounts?.new_scoped_card || 0) >= expectedMissingCardIds.length, 'missing card-shaped recommendations route as newly scoped cards', JSON.stringify(afterRoute.routeCounts || {}))
  addCheck(checks, missingLiveCards.length === 0, 'new scoped audit cards exist in live backlog after apply', missingLiveCards.join(', ') || expectedMissingCardIds.join(', '))
  addCheck(checks, routerCard && (args.closeCard ? routerCard.lane === 'done' : ['executing', 'done'].includes(routerCard.lane)), 'router card is live in expected lane', routerCard ? `${routerCard.id}:${routerCard.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next endpoint freshness card exists in live backlog', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === SPRINT_ID &&
      (args.closeCard ? activeRouterItem?.stage === 'done_this_sprint' : ['building_now', 'done_this_sprint'].includes(activeRouterItem?.stage)),
    'Current Sprint contains router card with correct stage',
    activeRouterItem ? `${activeSprint.sprint?.sprintId}:${activeRouterItem.stage}` : 'missing router item',
  )
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID || nextSprintItem?.stage === 'scoping', 'Current Sprint advances to endpoint freshness after closeout', `${activeSprint.sprint?.activeBlockerCardId || 'none'} / ${nextSprintItem?.stage || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:audit-finding-to-backlog-router-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:audit-finding-to-backlog-router-check'] || 'missing')
  addCheck(checks, codeQualitySource.includes('reportOnly: true') && codeQualitySource.includes('writesBacklog: false') && nightlyDeepSource.includes('autoCreatesBacklog: false'), 'scheduled audit generators remain report-only and do not auto-create backlog', 'code-quality/nightly-deep boundaries intact')
  addCheck(checks, moduleSource.includes('buildAuditFindingToBacklogRouterDogfoodProof') && moduleSource.includes('SYNTHETIC-AUDIT-REPAIR-001'), 'router module owns behavior dogfood for missing-card routing', 'lib/audit-finding-to-backlog-router.js')
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, unsafePatterns.length === 0, 'router card has no unsafe runtime/provider/external-write path', unsafePatterns.join(', ') || 'none')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    scriptPath: SCRIPT_PATH,
    planPath: PLAN_PATH,
    routeSummary,
    auditSources: auditSources.map(source => ({
      label: source.label,
      path: source.path,
      findingCount: source.findings.length,
      summary: source.summary,
    })),
    scopedCardIds: expectedMissingCardIds,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Audit finding-to-backlog router check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
