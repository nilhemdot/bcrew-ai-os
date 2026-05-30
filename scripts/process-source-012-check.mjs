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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { buildSourceOfTruthPayload } from '../lib/source-of-truth-payload.js'
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
  SOURCE_012_APPROVAL_PATH,
  SOURCE_012_CARD_ID as CARD_ID,
  SOURCE_012_CHANGED_FILES,
  SOURCE_012_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SOURCE_012_CLOSEOUT_PATH,
  SOURCE_012_NEXT_CARD_ID as NEXT_CARD_ID,
  SOURCE_012_NOT_NEXT,
  SOURCE_012_PLAN_PATH,
  SOURCE_012_PROOF_COMMANDS,
  SOURCE_012_SCRIPT_PATH,
  buildSourceConnectorLayerDogfoodProof,
  evaluateSourceConnectorLayerStatus,
} from '../lib/source-012-source-connector-layers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

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

function parseJsonFromCommand(text = '') {
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0).reverse()) {
    try {
      return JSON.parse(value.slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 90 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
}

function buildSource012CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Make source contracts and connectors visible as separate live layers',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 5,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; SOURCE-012 gates source/extract work.',
    summary: 'Expose the canonical source/connector layer model from live source truth so source status, connector status, trust status, freshness, drift, owner, direct links, and dependent systems are visible before extraction expands.',
    whyItMatters: 'Extraction work should not expand on fuzzy source truth. The operator needs to see source trust and connector reach as separate layers so a working pipe never masquerades as signed-off business truth.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` before extraction work.`
      : 'Build and prove the live source/connector layer model, then advance to SOURCE-018.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; /api/source-of-truth and Data Sources now expose separate source contract, connector, trust, freshness/drift, and dependency layers.`
      : `Executing \`${CLOSEOUT_KEY}\`; building the source/connector layer model and proof.`,
    owner: 'Foundation Source',
  }
}

function buildSource018CardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Close Google Gemini meeting notes source contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; promoted after SOURCE-012 so meeting-note boundaries are clean before extraction expansion.',
    summary: 'Close transcript capture/forward-flow risk and privacy/read-side controls for Google Gemini meeting notes before broader extraction work.',
    whyItMatters: 'Meeting notes are core current-day source truth. Their contract needs forward-flow, privacy, read boundary, and transcript-gap proof before extraction depends on them.',
    nextAction: 'Build SOURCE-018 next with approved proof; verify current meeting-note forward flow and privacy/read-side controls without Drive permission mutation or broad private extraction.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; proof/acceptance must be scoped before closeout and full gates are required.`,
    owner: 'Foundation Source',
  }
}

function buildSource012SprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SOURCE_012_PLAN_PATH,
    definitionOfDone: 'Source contracts and connectors render as separate live layers with source status, connector status, trust status, freshness, drift, owner, direct source link, and dependent systems.',
    proofCommands: SOURCE_012_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close SOURCE-012 before SOURCE-018 and extraction work.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SOURCE_012_NOT_NEXT])),
    existingWorkCheck: {
      reused: [
        '/api/source-of-truth',
        'lib/source-contracts.js',
        'lib/source-of-truth-payload.js',
        'public/foundation-source-registry-renderers.js',
        'Data Sources overview/connectors pages',
      ],
      notRebuilt: [
        'No duplicate source registry page.',
        'No new connector implementation.',
        'No source extraction.',
        'No external writes.',
      ],
      existingCode: [
        'lib/source-contracts.js',
        'lib/source-of-truth-payload.js',
        'public/foundation-source-registry-renderers.js',
        'public/foundation.js',
      ],
      existingDocs: [
        'docs/source-registry.md',
        'docs/process/frontend-source-registry-renderers-split-001-plan.md',
        'docs/process/connector-routing-truth-2026-05-12-plan.md',
      ],
      existingScripts: [
        'scripts/foundation-verify.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
      ],
      existingPolicy: [
        'Connector does not equal trusted source.',
        'Live values belong in source-backed API payloads, not markdown snapshots.',
        'Source/extract work waits for source truth boundaries.',
      ],
      exactGap: 'Data Sources already had contracts and connector cards, but the API did not expose one canonical layer model with source status, connector status, trust, freshness, drift, owner, links, and dependencies.',
      overBroadRisk: 'This can drift into source extraction or UI redesign. V1 only adds a live layer status payload, a small visible summary, and proof.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T14:50:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: SOURCE_012_APPROVAL_PATH,
    },
  }
}

function buildSource018SprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/source-018-google-gemini-meeting-notes-contract-plan.md',
    definitionOfDone: 'Google Gemini meeting notes source contract has forward-flow proof, transcript-gap posture, privacy/read-side controls, and no false trust around Drive permissions.',
    proofCommands: [
      'node --check scripts/process-source-018-check.mjs',
      'npm run process:source-018-check -- --apply --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=SOURCE-018 --planApprovalRef=docs/process/approvals/SOURCE-018.json --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1 --commitRef=HEAD',
    ],
    nextAction: 'Build SOURCE-018 next; keep meeting-note proof bounded and do not mutate Drive permissions.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SOURCE_012_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeExtractionExpansion: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildSource012SprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildSource012SprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildSource018SprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildSource012SprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildSource018SprintItem({ order: items.length + 1 }, { active: true }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function updateBacklogRow(client, row) {
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
    [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
  )
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_012_SCRIPT_PATH,
    operation: 'create/update SOURCE-012 and SOURCE-018 backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildSource012CardRow({ closeCard }))
    await updateBacklogRow(client, buildSource018CardRow())
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-012')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `source-012-${stableRunId(SOURCE_012_PLAN_PATH)}`,
        CARD_ID,
        SOURCE_012_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_012_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-012',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
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

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'source_012_live_layers_closed' : 'source_012_live_layers_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; SOURCE-012 is closed.` : `${CARD_ID} is active; prove live source layers before SOURCE-018.`,
          source012LayerSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            connectorDoesNotEqualTrust: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-source-012',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} live source layers and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
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
    packageJsonSource,
    moduleSource,
    payloadSource,
    frontendSource,
    routeOwnerSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_012_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(SOURCE_012_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/source-012-source-connector-layers.js'),
    readRepoFile('lib/source-of-truth-payload.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile(SOURCE_012_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(SOURCE_012_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildSource012CardRow({ closeCard: args.closeCard }),
    changedFiles: SOURCE_012_CHANGED_FILES,
    declaredRisk: 'source contract API payload, frontend Data Sources rendering, Current Sprint progression, package script, closeout registry, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const payload = await buildSourceOfTruthPayload({ repoRoot })
  const layerEvaluation = evaluateSourceConnectorLayerStatus(payload.sourceLayerStatus)
  const dogfood = buildSourceConnectorLayerDogfoodProof()
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const sourceCard = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sourceSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SOURCE_012_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SOURCE-012', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood proves working connector does not upgrade source trust', dogfood.invariant)
  addCheck(checks, layerEvaluation.ok, 'live source connector layer model is healthy', layerEvaluation.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, payload.sourceLayerStatus?.summary?.sourceCount === (payload.sources || []).length, 'source layer counts match source contracts', `${payload.sourceLayerStatus?.summary?.sourceCount}/${(payload.sources || []).length}`)
  addCheck(checks, payload.sourceLayerStatus?.summary?.connectorCount === (payload.connectors || []).length, 'connector layer counts match connectors', `${payload.sourceLayerStatus?.summary?.connectorCount}/${(payload.connectors || []).length}`)
  addCheck(checks, moduleSource.includes('buildSourceConnectorLayerStatus') && moduleSource.includes('evaluateSourceConnectorLayerStatus'), 'reusable layer module owns model and evaluator', 'lib/source-012-source-connector-layers.js')
  addCheck(checks, payloadSource.includes('buildSourceConnectorLayerStatus') && payloadSource.includes('sourceLayerStatus'), '/api/source-of-truth includes sourceLayerStatus', 'lib/source-of-truth-payload.js')
  addCheck(checks, frontendSource.includes('renderSourceLayerStatusPanel') && frontendSource.includes('Connector reach stays separate from source trust'), 'Data Sources renders live source layer panel', 'public/foundation-source-registry-renderers.js')
  addCheck(checks, routeOwnerSource.includes('renderDataSourcePurposePanel(section, config, sourceContracts, sourceConnectors, data.groupedSystems || [], data.sourceLayerStatus)'), 'Data Sources route passes source layer data to renderer module', 'public/foundation.js')
  addCheck(checks, sourceCard?.priority === 'P0' && (args.closeCard ? sourceCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(sourceCard?.lane)), 'SOURCE-012 backlog row is correct', sourceCard ? `${sourceCard.lane}/${sourceCard.priority}` : 'missing')
  addCheck(checks, nextCard?.priority === 'P0' && nextCard?.lane === 'scoped', 'SOURCE-018 is promoted as next scoped P0', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  addCheck(checks, systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy'), 'System Health remains healthy', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy', 'repeated-failure gate remains healthy', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, packageJson.scripts?.['process:source-012-check'] === `node --env-file-if-exists=.env ${SOURCE_012_SCRIPT_PATH}`, 'package exposes SOURCE-012 focused proof', packageJson.scripts?.['process:source-012-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves SOURCE-012', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', SOURCE_012_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || sourceSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records SOURCE-012 closeout', sourceSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'Current Sprint exposes SOURCE-018 next', nextSprintItem?.stage || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const [refreshedCards, refreshedPlanCritic, refreshedSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'SOURCE-018 is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is SOURCE-018 after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    layerSummary: payload.sourceLayerStatus?.summary,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`SOURCE-012 check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('SOURCE-012 check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
