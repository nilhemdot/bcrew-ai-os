#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  SPRINT_STAGE_GATE_CARD_ID,
  SPRINT_STAGE_GATE_PLAN_PATH,
  SPRINT_STAGE_GATE_APPROVAL_PATH,
  SPRINT_STAGE_GATE_SCRIPT_PATH,
  validateFoundationSprintStageGate,
} from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

// liveTruthPosture: historical_closeout_only - this proof replays the closed control-plane sprint to validate stage gates.
const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const CONNECTOR_ROUTING_SPRINT_ID = 'connector-routing-truth-2026-05-12'
const CONNECTOR_ROUTING_CARD_IDS = [
  'ATOM-PROMOTION-DIAGNOSE-001',
  'SPRINT-DB-RECONCILE-001',
  'VERIFY-GATE-TIERING-FIX-001',
  'PLAN-CRITIC-LOG-001',
  'SOURCE-CONNECTOR-MATRIX-001',
  'SOURCE-HUB-ROUTING-MATRIX-001',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readText(relativePath) {
  return fs.readFile(relativePath, 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

async function fetchJson(baseUrl, pathname, timeoutMs = 120000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(pathname, baseUrl), { signal: controller.signal })
    const text = await response.text()
    if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 240)}`)
    return text ? JSON.parse(text) : {}
  } finally {
    clearTimeout(timeout)
  }
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /raw[_-]?content/i,
    /content_text/i,
    /transcriptText/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
    /password/i,
    /secret/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

function mapSprintRow(row) {
  return {
    sprintId: row.sprint_id,
    status: row.status,
    goal: row.goal,
    activeBlockerCardId: row.active_blocker_card_id,
    metadata: row.metadata || {},
  }
}

function mapSprintItemRow(row) {
  return {
    sprintId: row.sprint_id,
    cardId: row.backlog_id,
    order: row.sprint_order,
    stage: row.stage,
    planRef: row.plan_ref,
    definitionOfDone: row.definition_of_done,
    proofCommands: row.proof_commands || [],
    readinessBlockerCleared: row.readiness_blocker_cleared,
    notNextBoundaries: row.not_next_boundaries || [],
    existingWorkCheck: row.existing_work_check || {},
    returnedReason: row.returned_reason,
    metadata: row.metadata || {},
  }
}

async function loadSprint(pool, sprintId) {
  const sprint = await pool.query(
    `
      SELECT sprint_id, status, goal, active_blocker_card_id, metadata
      FROM foundation_sprints
      WHERE sprint_id = $1
      LIMIT 1
    `,
    [sprintId],
  )
  const items = await pool.query(
    `
      SELECT sprint_id, backlog_id, sprint_order, stage, plan_ref, definition_of_done,
             proof_commands, readiness_blocker_cleared, not_next_boundaries,
             existing_work_check, returned_reason, metadata
      FROM foundation_sprint_items
      WHERE sprint_id = $1
      ORDER BY sprint_order ASC
    `,
    [sprintId],
  )
  if (!sprint.rows[0]) throw new Error(`Missing sprint ${sprintId}`)
  return {
    sprint: mapSprintRow(sprint.rows[0]),
    items: items.rows.map(mapSprintItemRow),
  }
}

function buildSkippedConnectorRoutingState(repairedState) {
  const repairedById = new Map((repairedState.items || []).map(item => [item.cardId, item]))
  return {
    sprint: {
      sprintId: `${CONNECTOR_ROUTING_SPRINT_ID}-synthetic-skipped`,
      status: 'active',
      goal: 'Synthetic original skipped Connector/Routing state.',
      activeBlockerCardId: 'SOURCE-HUB-ROUTING-MATRIX-001',
      metadata: repairedState.sprint.metadata || {},
    },
    items: CONNECTOR_ROUTING_CARD_IDS.map((cardId, index) => {
      const repaired = repairedById.get(cardId) || {}
      return {
        ...repaired,
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        definitionOfDone: repaired.definitionOfDone || 'Synthetic shipped card.',
        proofCommands: repaired.proofCommands?.length ? repaired.proofCommands : ['npm run process:sprint-stage-gate-check -- --json'],
        notNextBoundaries: repaired.notNextBoundaries?.length
          ? repaired.notNextBoundaries
          : [
              'Do not run MEETING-VAULT-ACL-001 Phase B.',
              'Do not mutate Drive permissions.',
            ],
        existingWorkCheck: {},
        metadata: {},
      }
    }),
  }
}

async function loadLiveItemSnapshot(pool, sprintId, cardId) {
  const result = await pool.query(
    `
      SELECT existing_work_check
      FROM foundation_sprint_items
      WHERE sprint_id = $1 AND backlog_id = $2
      LIMIT 1
    `,
    [sprintId, cardId],
  )
  if (!result.rows[0]) throw new Error(`Missing live sprint item ${cardId}`)
  return result.rows[0].existing_work_check || {}
}

async function setLiveExistingWorkCheck(pool, sprintId, cardId, existingWorkCheck) {
  await pool.query(
    `
      UPDATE foundation_sprint_items
      SET existing_work_check = $3::jsonb,
          updated_at = NOW()
      WHERE sprint_id = $1 AND backlog_id = $2
    `,
    [sprintId, cardId, JSON.stringify(existingWorkCheck || {})],
  )
}

function summarizeChecks(findings) {
  return Array.from(new Set(findings.map(item => item.check))).sort()
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const findings = []
  const pool = createPool()
  let restoredLiveCheck = null
  let restoredCardId = null
  let restoredSprintId = null

  await initFoundationDb()
  try {
    const packageJson = await readJson('package.json')
    const moduleSource = await readText('lib/foundation-current-sprint.js')
    const scriptSource = await readText(SPRINT_STAGE_GATE_SCRIPT_PATH)
    const approvalValidation = await validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: SPRINT_STAGE_GATE_APPROVAL_PATH,
      cardId: SPRINT_STAGE_GATE_CARD_ID,
    })
    const closeouts = getFoundationBuildCloseouts()
    const activeSprint = await getActiveFoundationCurrentSprint()
    const activeCardIds = (activeSprint.items || []).map(item => item.cardId)
    const activeCards = await getBacklogItemsByIds(activeCardIds)
    const activePlanRuns = await getPlanCriticRunsByCardIds(activeCardIds)
    const liveGate = validateFoundationSprintStageGate({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems: activeCards,
      closeouts,
      planCriticRuns: activePlanRuns,
    })

    const connectorRepaired = await loadSprint(pool, CONNECTOR_ROUTING_SPRINT_ID)
    const connectorCards = await getBacklogItemsByIds(CONNECTOR_ROUTING_CARD_IDS)
    const connectorPlanRuns = await getPlanCriticRunsByCardIds(CONNECTOR_ROUTING_CARD_IDS)
    const skippedState = buildSkippedConnectorRoutingState(connectorRepaired)
    const skippedGate = validateFoundationSprintStageGate({
      sprint: skippedState.sprint,
      items: skippedState.items,
      backlogItems: connectorCards,
      closeouts,
      planCriticRuns: [],
    })
    const repairedGate = validateFoundationSprintStageGate({
      sprint: connectorRepaired.sprint,
      items: connectorRepaired.items,
      backlogItems: connectorCards,
      closeouts,
      planCriticRuns: connectorPlanRuns,
    })

    const missingPlanCriticGate = validateFoundationSprintStageGate({
      sprint: {
        sprintId: 'synthetic-stage-gate-missing-plan-critic',
        status: 'active',
        goal: 'Synthetic missing Plan Critic proof.',
        activeBlockerCardId: SPRINT_STAGE_GATE_CARD_ID,
      },
      items: [
        {
          ...(activeSprint.items || []).find(item => item.cardId === SPRINT_STAGE_GATE_CARD_ID),
          stage: 'sprint_ready',
        },
      ],
      backlogItems: activeCards,
      closeouts,
      planCriticRuns: [],
    })
    const returnedGate = validateFoundationSprintStageGate({
      sprint: {
        sprintId: 'synthetic-stage-gate-returned',
        status: 'active',
        goal: 'Synthetic returned proof.',
        activeBlockerCardId: null,
      },
      items: [
        {
          ...(activeSprint.items || []).find(item => item.cardId === SPRINT_STAGE_GATE_CARD_ID),
          stage: 'returned',
          returnedReason: '',
        },
      ],
      backlogItems: activeCards,
      closeouts,
      planCriticRuns: activePlanRuns,
    })

    const activeSprintId = activeSprint.sprint?.sprintId || activeSprint.sprint?.sprint_id || SPRINT_ID
    const apiFixtureItem = (activeSprint.items || []).find(item =>
      item.stage === 'done_this_sprint' &&
        item.cardId !== activeSprint.sprint?.activeBlockerCardId &&
        item.existingWorkCheck &&
        Object.keys(item.existingWorkCheck).length > 0
    ) || (activeSprint.items || []).find(item => item.stage === 'done_this_sprint') || null
    restoredCardId = apiFixtureItem?.cardId || SPRINT_STAGE_GATE_CARD_ID
    restoredSprintId = activeSprintId
    restoredLiveCheck = await loadLiveItemSnapshot(pool, activeSprintId, restoredCardId)
    await setLiveExistingWorkCheck(pool, activeSprintId, restoredCardId, {})
    const riskApi = await fetchJson(baseUrl, '/api/foundation/current-sprint')
    await setLiveExistingWorkCheck(pool, activeSprintId, restoredCardId, restoredLiveCheck)
    restoredLiveCheck = null
    restoredCardId = null
    restoredSprintId = null
    const restoredApi = await fetchJson(baseUrl, '/api/foundation/current-sprint')

    addFinding(findings, packageJson.scripts?.['process:sprint-stage-gate-check'] === 'node --env-file-if-exists=.env scripts/process-sprint-stage-gate-check.mjs', 'package exposes stage-gate proof script', packageJson.scripts?.['process:sprint-stage-gate-check'] || 'missing')
    addFinding(findings, approvalValidation.ok, 'approval integrity passes for sprint stage gate plan', approvalValidation.failures?.map(item => item.detail).join(' | ') || 'ok')
    addFinding(findings, liveGate.ok, 'live active sprint currently satisfies stage gate', summarizeChecks(liveGate.findings).join(', ') || 'ok')
    addFinding(findings, skippedGate.ok === false, 'dogfood rejects original skipped Connector/Routing state', summarizeChecks(skippedGate.findings).join(', '))
    addFinding(findings, skippedGate.findings.some(item => item.check === 'stage_gate_existing_work_check_complete'), 'skipped state rejection includes missing doctrine', summarizeChecks(skippedGate.findings).join(', '))
    addFinding(findings, skippedGate.findings.some(item => item.check === 'active_blocker_not_done_this_sprint'), 'skipped state rejection catches done active blocker', summarizeChecks(skippedGate.findings).join(', '))
    addFinding(findings, repairedGate.ok, 'dogfood accepts repaired after-action Connector/Routing state', summarizeChecks(repairedGate.findings).join(', ') || 'ok')
    addFinding(findings, missingPlanCriticGate.findings.some(item => item.check === 'stage_gate_plan_critic_pass_required'), 'Sprint Ready rejects missing Plan Critic pass row', summarizeChecks(missingPlanCriticGate.findings).join(', '))
    addFinding(findings, returnedGate.findings.some(item => item.check === 'returned_reason_required'), 'Returned rejects missing returned reason', summarizeChecks(returnedGate.findings).join(', '))
    addFinding(findings, riskApi.currentSprint?.status === 'risk', 'Current Sprint API reports risk for invalid live stage fixture', riskApi.currentSprint?.status || 'missing')
    addFinding(findings, (riskApi.currentSprint?.findings || []).some(item => item.check === 'stage_gate_existing_work_check_complete'), 'Current Sprint API exposes stage gate finding for invalid fixture', summarizeChecks(riskApi.currentSprint?.findings || []).join(', '))
    addFinding(findings, restoredApi.currentSprint?.status === 'healthy', 'Current Sprint API returns healthy after restoration', restoredApi.currentSprint?.status || 'missing')
    addFinding(findings, moduleSource.includes('validateFoundationSprintStageGate') && moduleSource.includes('stage_gate_plan_critic_pass_required') && moduleSource.includes('active_blocker_not_done_this_sprint'), 'stage validation is reusable in library code', 'missing source markers')
    addFinding(findings, scriptSource.includes('validateFoundationSprintStageGate') && scriptSource.includes('dogfood rejects original skipped Connector/Routing state'), 'proof calls reusable validation instead of substring-only markers', 'missing proof markers')

    const summary = {
      cardId: SPRINT_STAGE_GATE_CARD_ID,
      status: findings.length ? 'attention' : 'healthy',
      checkedAt: new Date().toISOString(),
      liveGate: {
        ok: liveGate.ok,
        checks: summarizeChecks(liveGate.findings),
      },
      skippedGate: {
        ok: skippedGate.ok,
        checks: summarizeChecks(skippedGate.findings),
      },
      repairedGate: {
        ok: repairedGate.ok,
        checks: summarizeChecks(repairedGate.findings),
      },
      apiRiskFixture: {
        status: riskApi.currentSprint?.status || null,
        checks: summarizeChecks(riskApi.currentSprint?.findings || []),
        restoredStatus: restoredApi.currentSprint?.status || null,
      },
      findings,
    }
    const rawLeaks = noRawProof(summary)
    if (rawLeaks.length) {
      summary.status = 'attention'
      summary.findings.push({ check: 'metadata_only_proof', detail: rawLeaks.join(', ') })
    }

    if (jsonMode) {
      console.log(JSON.stringify(summary, null, 2))
    } else {
      console.log(`Sprint stage gate check: ${summary.status}`)
      for (const finding of summary.findings) console.log(`FAIL ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    if (restoredLiveCheck && restoredCardId && restoredSprintId) {
      await setLiveExistingWorkCheck(pool, restoredSprintId, restoredCardId, restoredLiveCheck).catch(() => {})
    }
    await pool.end()
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
