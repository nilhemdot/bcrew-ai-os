#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
import { getIntelligenceReportBundle } from '../lib/foundation-intelligence-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID } from '../lib/dev-team-intelligence-director.js'
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

const ACTOR = 'human-web-agent-v1-sprint-plan'
const CARD_ID = 'HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001'
const SPRINT_ID = 'HUMAN-WEB-AGENT-V1-2026-05-29'
const OLD_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
const OLD_BLOCKER_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001'
const ACTIVE_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
const PLAN_PATH = 'docs/process/human-web-agent-v1-sprint-plan-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001.json'
const SCRIPT_PATH = 'scripts/process-human-web-agent-v1-sprint-plan-check.mjs'
const EVIDENCE_MATRIX_PATH = 'docs/process/human-web-agent-v1-evidence-matrix-2026-05-29.md'
const SPRINT_SCOPE_PATH = 'docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md'
const CURRENT_PLAN_PATH = 'docs/rebuild/current-plan.md'
const CURRENT_STATE_PATH = 'docs/rebuild/current-state.md'

const SOURCE_BROWSER_PLAN_PATH = 'docs/process/source-browser-agentic-runtime-001-plan.md'
const SOURCE_BROWSER_APPROVAL_PATH = 'docs/process/approvals/SOURCE-BROWSER-AGENTIC-RUNTIME-001.json'

const CHANGED_FILES = [
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  EVIDENCE_MATRIX_PATH,
  SPRINT_SCOPE_PATH,
  CURRENT_PLAN_PATH,
  CURRENT_STATE_PATH,
  'docs/process/source-browser-brain-route-policy-001-plan.md',
  'docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md',
  'lib/source-agentic-browser-runtime.js',
  'lib/source-browser-agent-harness.js',
  'lib/source-browser-brain-route-policy.js',
  'lib/foundation-backlog-seed-chunks/chunk-005.js',
  'scripts/process-source-browser-runtime-cost-guardrails-check.mjs',
  'scripts/process-source-browser-agent-harness-check.mjs',
  'scripts/process-source-browser-brain-route-policy-check.mjs',
  'package.json',
]

const STANDARD_NOT_NEXT = [
  'Do not keep the stale YouTube sprint as active blocker.',
  'Do not claim video-only watching is God Mode.',
  'Do not start Browserbase work; Browserbase is killed/parked outside this sprint.',
  'Do not use Steve normal Chrome profile as the default session.',
  'Do not log in, buy, download, post, comment, message, mutate profiles, send DMs, or make external writes from this sprint reset.',
  'Do not auto-promote Scoper/backlog cards from Director candidates.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
]

const EXIT_CRITERIA = [
  'Live Current Sprint id is HUMAN-WEB-AGENT-V1-2026-05-29.',
  'Active blocker is SOURCE-BROWSER-AGENTIC-RUNTIME-001.',
  'SOURCE-BROWSER-AGENTIC-RUNTIME-001 is the only Building Now card.',
  'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001 is backlog/upstream source context, not active sprint blocker.',
  'Every sprint item has live backlog truth, plan ref, definition of done, proof commands, not-next boundaries, and existing-work context.',
  'Sprint metadata links the Director evidence matrix and sprint scope.',
  'Browserbase is not in the active sprint order and no Browserbase work is approved.',
]

const SPRINT_CARDS = [
  {
    id: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
    title: 'Build the full God Mode extractor runtime and source SOP system',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    stage: 'scoping',
    owner: 'Foundation Extraction',
    planRef: 'docs/process/extractor-eyes-hands-brain-runtime-001-plan.md',
    approvalRef: 'docs/process/approvals/EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001.json',
    definitionOfDone: 'The parent source/extractor contract governs Human Web Agent V1 so browser work produces source packets, evidence, run memory, source-stack output, and stop/escalation decisions instead of generic browsing.',
    proofCommands: [
      'npm run process:god-mode-extractor-system-contract-check -- --json',
      'npm run process:source-browser-agent-executor-check -- --json',
    ],
    summary: 'Parent contract for the evidence-backed extractor/browser/source SOP system.',
    whyItMatters: 'Human Web Agent V1 must stay attached to the full extractor/source-SOP goal, not drift into browser automation for its own sake.',
    nextAction: `Use ${ACTIVE_CARD_ID} as the first Building Now child slice under this parent.`,
  },
  {
    id: ACTIVE_CARD_ID,
    title: 'Build the agentic source-browser runtime',
    lane: 'executing',
    priority: 'P0',
    rank: 2,
    stage: 'building_now',
    owner: 'Foundation Source Browser',
    planRef: SOURCE_BROWSER_PLAN_PATH,
    approvalRef: SOURCE_BROWSER_APPROVAL_PATH,
    definitionOfDone: 'The flagship source-browser agent accepts an exact source packet, routes through policy, uses safe local/connector/session hands, extracts value, records memory/proof, and fails closed on auth/payment/post/message/profile boundaries.',
    proofCommands: [
      'npm run process:source-browser-agent-executor-check -- --json',
      'npm run process:source-browser-agent-harness-check -- --json',
    ],
    summary: 'First Building Now card for the Human Web Agent V1 sprint: source mission packet to safe browser/source execution and evidence ledger.',
    whyItMatters: 'This is the practical step toward AIOS using the web like a careful human researcher on approved sources.',
    nextAction: 'Run the executor proof, then continue the Source Session Broker/live source-session execution slice with exact source packets and fail-closed boundaries.',
  },
  {
    id: 'SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001',
    title: 'Decide source-browser brain routing without hidden subscription assumptions',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    stage: 'scoping',
    owner: 'Foundation Runtime',
    planRef: 'docs/process/source-browser-brain-route-policy-001-plan.md',
    approvalRef: APPROVAL_PATH,
    definitionOfDone: 'Source-browser workloads are routed across deterministic readers, local browser hands, source sessions, connectors/MCP, newsletter/community lanes, and Harlan escalation with explicit cost and capability rules. Hosted Browserbase routes fail closed in this sprint.',
    proofCommands: ['npm run process:source-browser-brain-route-policy-check -- --json'],
    summary: 'Route policy for deterministic/headless, local browser, source-session, connector, Harlan auth escalation, and human escalation choices. Browserbase is excluded from this sprint.',
    whyItMatters: 'The evidence says browser agents work when they choose the safest capable tool rather than defaulting to one runtime.',
    nextAction: 'Keep deterministic/browser/session/connector/Harlan routes first. Hosted Browserbase requests must fail closed in this sprint.',
  },
  {
    id: 'LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001',
    title: 'Build local virtual browser hands runtime',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    stage: 'scoping',
    owner: 'Foundation Browser Runtime',
    planRef: 'docs/process/local-virtual-browser-hands-runtime-001-plan.md',
    approvalRef: APPROVAL_PATH,
    definitionOfDone: 'AIOS can run local isolated Playwright/Chrome hands for exact source packets with observe, screenshot, safe click/scroll/type policy, action logs, and blocked-side-effect proof.',
    proofCommands: ['npm run process:local-virtual-browser-hands-runtime-check -- --json'],
    summary: 'Local isolated browser hands runtime for approved source packets.',
    whyItMatters: 'The sprint should prove AIOS-owned local browser capability before paying hosted browser minutes by default.',
    nextAction: 'Use the local hands runtime under the active source-browser agent and feed auth/session blockers to Source Session Broker.',
  },
  {
    id: 'SOURCE-SESSION-BROKER-001',
    title: 'Build closed-loop source session broker for paid and free sources',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    stage: 'scoping',
    owner: 'Foundation Source Access',
    planRef: 'docs/process/source-session-broker-001-plan.md',
    approvalRef: 'docs/process/approvals/SOURCE-SESSION-BROKER-001.json',
    definitionOfDone: 'Source sessions use isolated profiles, Keychain secret refs, auth-needed/Harlan packets, wait/resume proof, and fail-closed handling for MFA/challenges without raw credentials or normal Chrome profile use.',
    proofCommands: [
      'npm run process:source-session-broker-check -- --json',
      'npm run process:source-session-readiness-check -- --json',
    ],
    summary: 'Session/auth/MFA broker for isolated browser profiles, macOS Keychain refs, auth-needed packets, fail-closed recovery, and ai@bensoncrew.ca free-source identity use.',
    whyItMatters: 'Human-like web use needs sessions, but sessions must be governed and resumable instead of dumped into prompts.',
    nextAction: 'Prove one real free/community or auth-needed source packet through the broker before broad paid/auth extraction.',
  },
  {
    id: 'BUILD-OPPORTUNITY-PROMOTION-GATE-001',
    title: 'Approve Build Intel opportunities into backlog',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    stage: 'scoping',
    owner: 'Foundation / Dev Team',
    planRef: 'docs/process/build-opportunity-promotion-gate-001-plan.md',
    approvalRef: 'docs/process/approvals/BUILD-OPPORTUNITY-PROMOTION-GATE-001.json',
    definitionOfDone: 'Source-backed browser/extractor output can become a backlog card or existing-card attachment only through explicit approval, with rejects, duplicates, stale items, and evidence logged.',
    proofCommands: [
      'npm run process:build-opportunity-promotion-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
    ],
    summary: 'Approval gate between source-backed Dev intelligence and backlog promotion.',
    whyItMatters: 'The watched-video evidence should feed build choices without auto-creating work or bypassing Steve approval.',
    nextAction: 'Keep promotion blocked until Human Web Agent V1 produces source-backed proof packets worth reviewing.',
  },
]

const PARKED_CARDS = [
  {
    id: 'BROWSERBASE-ONE-MONTH-BAKEOFF-001',
    title: 'Park Browserbase outside Human Web Agent V1',
    lane: 'scoped',
    priority: 'P1',
    rank: 99,
    owner: 'Foundation Runtime',
    source: PLAN_PATH,
    summary: 'Browserbase is killed/parked outside Human Web Agent V1 and must not run from this sprint.',
    whyItMatters: 'The current sprint must prove local/source-session/connector browser-agent capability without spending Browserbase time or letting the subscription choose architecture.',
    nextAction: 'No Browserbase work. Keep this parked outside the active sprint unless Steve gives fresh explicit approval to reopen it.',
    statusNote: `Parked outside ${SPRINT_ID}; no Browserbase work is approved, no bakeoff is active, and this card is not in Current Sprint order.`,
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set(argv
    .filter(arg => String(arg || '').startsWith('--'))
    .map(arg => String(arg).slice(2).split('=')[0]))
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [
        PROCESS_CHECK_WRITE_FLAGS.apply,
        PROCESS_CHECK_WRITE_FLAGS.closeCard,
        PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
      ],
    }),
    closeCard: flags.has('close-card') || flags.has('closeCard'),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: text(detail) })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function existingWorkCheck(card = {}) {
  return {
    existingCode: [
      'lib/foundation-db.js',
      'lib/foundation-current-sprint.js',
      'lib/foundation-current-sprint-store.js',
      'lib/process-write-guard.js',
      'lib/process-plan-critic.js',
      'lib/source-browser-agent-harness.js',
      'lib/source-browser-agent-executor.js',
      'lib/source-browser-brain-route-policy.js',
      'lib/local-virtual-browser-hands-runtime.js',
      'lib/source-session-broker.js',
    ],
    existingDocs: [
      PLAN_PATH,
      EVIDENCE_MATRIX_PATH,
      SPRINT_SCOPE_PATH,
      CURRENT_PLAN_PATH,
      CURRENT_STATE_PATH,
      card.planRef,
    ].filter(Boolean),
    existingScripts: [
      SCRIPT_PATH,
      'scripts/process-current-sprint-dynamic-truth-check.mjs',
      'scripts/backlog-hygiene.mjs',
      'scripts/process-source-browser-agent-executor-check.mjs',
      'scripts/process-source-browser-agent-harness-check.mjs',
    ],
    existingPolicy: [
      'Current Sprint is an overlay on live backlog truth.',
      'Plan Critic pass is required for Building Now.',
      'Process checks require explicit --apply before live writes.',
      'Browser/session/source work is source-packet and approval-bound.',
      'No Meeting Vault Phase B or Drive permission mutation is approved here.',
    ],
    reused: [
      'Live backlog cards for the browser/extractor/session/promotion work.',
      'Existing Source Browser Agent harness/executor proofs.',
      'Existing Director report and evidence matrix.',
      'Existing Current Sprint mutation guards.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No broad Dev Hub rebuild.',
      'No Browserbase work in this sprint.',
      'No broad memory rewrite before browser-run memory.',
      'No paid/auth/private/source crawling from the sprint reset.',
    ],
    exactGap: `${card.id || 'sprint item'} needs live sprint order aligned to Director evidence and source-browser execution.`,
    overBroadRisk: 'Generic browser scripts, Browserbase revival, video-only God Mode claims, broad external-source actions, and auto backlog promotion.',
    readyBy: ACTOR,
    readyAt: '2026-05-29T00:00:00-04:00',
  }
}

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function sprintItem(card = {}, { currentHead = '' } = {}) {
  return {
    cardId: card.id,
    order: card.rank,
    stage: card.stage,
    planRef: card.planRef,
    definitionOfDone: card.definitionOfDone,
    proofCommands: card.proofCommands,
    readinessBlockerCleared: card.id === ACTIVE_CARD_ID
      ? 'Steve reset the sprint around the Director top-three evidence; this is the first Building Now source-browser agent slice.'
      : `${ACTIVE_CARD_ID} is the first Building Now card; this card stays sequenced as supporting sprint work.`,
    notNextBoundaries: STANDARD_NOT_NEXT,
    existingWorkCheck: existingWorkCheck(card),
    metadata: {
      sprintId: SPRINT_ID,
      sprintPlanCardId: CARD_ID,
      evidenceMatrixPath: EVIDENCE_MATRIX_PATH,
      sprintScopePath: SPRINT_SCOPE_PATH,
      directorReportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
      approvalRef: card.approvalRef,
      sourceMissionPattern: 'source mission packet -> route policy -> browser/session/connector tool -> observe -> plan -> act -> extract -> remember -> prove -> continue/stop/escalate',
      browserbaseParkedOutsideSprint: true,
      activeBuildingNow: card.id === ACTIVE_CARD_ID,
      repoPosture: repoPosture(currentHead),
    },
  }
}

async function upsertPlanCriticRows({ sprintPlanReview, activePlanReview }) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const rows = [
      {
        runId: `human-web-agent-v1-sprint-plan-${stableRunId(`${PLAN_PATH}:${CARD_ID}`)}`,
        cardId: CARD_ID,
        planRef: PLAN_PATH,
        review: sprintPlanReview,
        summaryCardId: CARD_ID,
      },
      {
        runId: `human-web-agent-v1-source-browser-building-now-${stableRunId(`${PLAN_PATH}:${ACTIVE_CARD_ID}`)}`,
        cardId: ACTIVE_CARD_ID,
        planRef: PLAN_PATH,
        review: activePlanReview,
        summaryCardId: ACTIVE_CARD_ID,
      },
    ]
    for (const row of rows) {
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
          row.runId,
          row.cardId,
          row.planRef,
          row.review.status,
          Number(row.review.score),
          PLAN_CRITIC_MIN_PASS_SCORE,
          row.review.gateDecision?.level || 'full',
          CHANGED_FILES,
          JSON.stringify(row.review.findings || []),
          JSON.stringify({
            status: row.review.status,
            score: row.review.score,
            cardId: row.summaryCardId,
            sprintId: SPRINT_ID,
            summary: buildPlanCriticResultSummary(row.review),
          }),
          ACTOR,
        ],
      )
    }
  } finally {
    client.release()
    await pool.end()
  }
}

async function upsertBacklogRows({ closeCard = false } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const planCard = {
    id: CARD_ID,
    title: 'Promote Human Web Agent V1 into Current Sprint',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 0,
    owner: 'Orchestrator',
    source: PLAN_PATH,
    summary: 'Reset the live Current Sprint from stale YouTube execution order to the evidence-backed Human Web Agent V1 sprint.',
    whyItMatters: 'The Director top-three evidence must drive the sprint board so builders work on the browser/extractor system Steve asked for.',
    nextAction: closeCard
      ? `${SPRINT_ID} is live; continue ${ACTIVE_CARD_ID} as Building Now.`
      : `Apply ${SPRINT_ID}, then build ${ACTIVE_CARD_ID}.`,
    statusNote: closeCard
      ? `Closed under human-web-agent-v1-sprint-plan; ${SPRINT_ID} is live with ${ACTIVE_CARD_ID} Building Now and Browserbase parked outside sprint.`
      : `Open sprint reset card for ${SPRINT_ID}; scope/proof requires focused sprint proof, Current Sprint readback, backlog hygiene, and ship closeout before any lane change.`,
  }
  const backlogCards = [
    planCard,
    ...SPRINT_CARDS.map(card => ({
      id: card.id,
      title: card.title,
      lane: card.lane,
      priority: card.priority,
      rank: card.rank,
      owner: card.owner,
      source: PLAN_PATH,
      summary: card.summary,
      whyItMatters: card.whyItMatters,
      nextAction: card.nextAction,
      statusNote: `Scope/proof: in ${SPRINT_ID} as ${card.stage}; proof command ${card.proofCommands?.[0] || 'missing'}; evidence matrix ${EVIDENCE_MATRIX_PATH}; do not close without card-specific proof.`,
    })),
    ...PARKED_CARDS,
  ]

  try {
    await client.query('BEGIN')
    for (const card of backlogCards) {
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
              lane = CASE
                WHEN backlog_items.lane = 'done' AND EXCLUDED.lane <> 'done' THEN backlog_items.lane
                ELSE EXCLUDED.lane
              END,
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
          card.lane,
          card.priority,
          card.rank,
          card.source,
          card.summary,
          card.whyItMatters,
          card.nextAction,
          card.statusNote,
          card.owner,
        ],
      )
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ('backlog_updated','backlog_items',$1,$2,$3,$4::jsonb)
        `,
        [
          card.id,
          ACTOR,
          `Updated ${card.id} for Human Web Agent V1 sprint plan.`,
          JSON.stringify({ sprintId: SPRINT_ID, rank: card.rank, stage: card.stage || 'parked_outside_sprint' }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function applyLiveState({ sprintPlanReview, activePlanReview, closeCard = false }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'reset live Current Sprint to Human Web Agent V1 and stage source-browser agent as Building Now',
    allowedFlags: [
      PROCESS_CHECK_WRITE_FLAGS.apply,
      PROCESS_CHECK_WRITE_FLAGS.closeCard,
      PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
    ],
  })

  const currentHead = git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await upsertBacklogRows({ closeCard })
  await upsertPlanCriticRows({ sprintPlanReview, activePlanReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Build the first evidence-backed AIOS web worker: exact source packet, route policy, local/session/connector hands, extraction, memory, proof, and source-stack readback.',
        activeBlockerCardId: ACTIVE_CARD_ID,
        metadata: {
          sprintPlanCardId: CARD_ID,
          sprintPlanRef: PLAN_PATH,
          evidenceMatrixPath: EVIDENCE_MATRIX_PATH,
          sprintScopePath: SPRINT_SCOPE_PATH,
          directorReportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
          previousSprintId: previous?.sprint?.sprintId || OLD_SPRINT_ID,
          replacedStaleBlockerId: OLD_BLOCKER_ID,
          currentStatus: 'human_web_agent_v1_building_source_browser_agent',
          nextAction: `${ACTIVE_CARD_ID}: run the source-browser executor proof, then continue exact source-session/source-packet execution.`,
          activeBlockerCardId: ACTIVE_CARD_ID,
          browserbaseDefault: false,
          browserbasePosture: 'killed_parked_outside_sprint_no_work_approved',
          noAutoBacklogPromotion: true,
          noExternalWrites: true,
          noNormalChromeDefault: true,
          exitCriteria: EXIT_CRITERIA,
          runOrder: SPRINT_CARDS.map(card => card.id),
          notNext: STANDARD_NOT_NEXT,
        },
      },
      items: SPRINT_CARDS.map(card => sprintItem(card, { currentHead })),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve approved resetting Current Sprint to Human Web Agent V1 from Director top-three evidence.',
    },
  )
}

function summarizeDirectorEvidence(bundle = {}) {
  const report = bundle.report || {}
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const rankedCandidates = list(structured.rankedCandidates)
  const reportText = JSON.stringify(structured).toLowerCase()
  const signalTitles = [
    'Agentic Browser Automation Pipeline',
    'Chrome DevTools MCP Automation Engine',
    'Cross-Session Memory and Tool Search',
    'Context Handoff Protocol',
    'Dynamic Frame-Budget Video Analyzer MCP',
    'Multi-Page Visual Auditor',
  ]
  return {
    reportArtifactId: bundle.reportArtifactId || report.reportArtifactId || '',
    candidateCount: Number(report.metadata?.candidateCount || rankedCandidates.length || 0),
    rankedCount: rankedCandidates.length,
    signalTitles,
    foundSignals: signalTitles.filter(title => reportText.includes(title.toLowerCase())),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      approval,
      planText,
      evidenceMatrix,
      sprintScope,
      packageJson,
      scriptSource,
      currentPlan,
      currentState,
      directorBundle,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
      readRepoFile(PLAN_PATH),
      readRepoFile(EVIDENCE_MATRIX_PATH),
      readRepoFile(SPRINT_SCOPE_PATH),
      readRepoJson('package.json'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile(CURRENT_PLAN_PATH),
      readRepoFile(CURRENT_STATE_PATH),
      getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 0, hitLimit: 0 }),
    ])

    const sprintPlanReview = evaluatePlanCriticPlan({
      planText,
      card: { id: CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'live Current Sprint and backlog DB mutation, source-browser agent Building Now stage gate, package scripts, and control-plane docs',
      repoRoot,
    })
    const activePlanReview = evaluatePlanCriticPlan({
      planText,
      card: { id: ACTIVE_CARD_ID, priority: 'P0' },
      changedFiles: CHANGED_FILES,
      declaredRisk: 'live Current Sprint and backlog DB mutation, source-browser agent Building Now stage gate, package scripts, and control-plane docs',
      repoRoot,
    })

    if (args.apply) {
      if (!approval.ok || Number(approval.approval?.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Approval is not valid for ${CARD_ID}.`)
      }
      if (sprintPlanReview.status !== 'pass' || Number(sprintPlanReview.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Sprint plan did not pass Plan Critic: ${buildPlanCriticResultSummary(sprintPlanReview)}`)
      }
      if (activePlanReview.status !== 'pass' || Number(activePlanReview.score) < PLAN_CRITIC_MIN_PASS_SCORE) {
        throw new Error(`Active source-browser plan gate did not pass: ${buildPlanCriticResultSummary(activePlanReview)}`)
      }
      await applyLiveState({ sprintPlanReview, activePlanReview, closeCard: args.closeCard })
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = list(activeSprint.items).map(item => item.cardId).filter(Boolean)
    const expectedOrder = SPRINT_CARDS.map(card => card.id)
    const cards = await getBacklogItemsByIds([CARD_ID, ...expectedOrder, OLD_BLOCKER_ID, ...PARKED_CARDS.map(card => card.id)])
    const planCriticRuns = await getPlanCriticRunsByCardIds([CARD_ID, ...expectedOrder])
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems: cards,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns,
    })
    const directorEvidence = summarizeDirectorEvidence(directorBundle)
    const orderedSprintIds = list(activeSprint.items)
      .slice()
      .sort((left, right) => Number(left.order || 999) - Number(right.order || 999))
      .map(item => item.cardId)
    const buildingNow = list(activeSprint.items).filter(item => item.stage === 'building_now')
    const activeItem = list(activeSprint.items).find(item => item.cardId === ACTIVE_CARD_ID) || null

    addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
    addCheck(checks, sprintPlanReview.status === 'pass' && Number(sprintPlanReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for sprint reset card', buildPlanCriticResultSummary(sprintPlanReview))
    addCheck(checks, activePlanReview.status === 'pass' && Number(activePlanReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for active source-browser Building Now gate', buildPlanCriticResultSummary(activePlanReview))
    addCheck(checks, directorEvidence.reportArtifactId === DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, 'Director report reads back from Foundation DB', directorEvidence.reportArtifactId || 'missing')
    addCheck(checks, directorEvidence.candidateCount >= 2000, 'raw Director report has broad evidence base', String(directorEvidence.candidateCount))
    addCheck(checks, directorEvidence.foundSignals.length >= 5, 'raw Director report contains browser/memory/extractor signal titles', directorEvidence.foundSignals.join(', '))
    addCheck(checks, evidenceMatrix.includes('Browser Agent That Can Work') && evidenceMatrix.includes('Memory System That Keeps Agents Sharp') && evidenceMatrix.includes('Extractor That Can Go Anywhere'), 'evidence matrix names Director top three', EVIDENCE_MATRIX_PATH)
    addCheck(checks, evidenceMatrix.includes('Agentic Browser Automation Pipeline') && evidenceMatrix.includes('Cross-Session Memory and Tool Search') && evidenceMatrix.includes('Dynamic Frame-Budget Video Analyzer MCP'), 'evidence matrix maps raw signals to build decisions', EVIDENCE_MATRIX_PATH)
    addCheck(checks, sprintScope.includes('AIOS should use the web like a careful human researcher') && sprintScope.includes(ACTIVE_CARD_ID), 'sprint scope states product contract and active browser agent', SPRINT_SCOPE_PATH)
    addCheck(checks, packageJson.scripts?.['process:human-web-agent-v1-sprint-plan-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes Human Web Agent V1 sprint proof script', packageJson.scripts?.['process:human-web-agent-v1-sprint-plan-check'] || 'missing')
    addCheck(checks, scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('buildFoundationCurrentSprintStatus') && scriptSource.includes('OLD_BLOCKER_ID'), 'focused script owns governed sprint reset and readback behavior', SCRIPT_PATH)
    addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'live Current Sprint id is Human Web Agent V1', activeSprint.sprint?.sprintId || 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === ACTIVE_CARD_ID, 'active blocker is source-browser agent runtime', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, activeSprint.sprint?.sprintId !== OLD_SPRINT_ID, 'old YouTube sprint is no longer active', activeSprint.sprint?.sprintId || 'missing')
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId !== OLD_BLOCKER_ID, 'old YouTube catch-up card is no longer active blocker', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, JSON.stringify(orderedSprintIds) === JSON.stringify(expectedOrder), 'Current Sprint contains exact Human Web Agent V1 order', orderedSprintIds.join(', '))
    addCheck(checks, !sprintCardIds.includes('BROWSERBASE-ONE-MONTH-BAKEOFF-001'), 'Browserbase card is not in active sprint order', sprintCardIds.join(', '))
    addCheck(checks, buildingNow.length === 1 && buildingNow[0]?.cardId === ACTIVE_CARD_ID, 'only source-browser agent is Building Now', buildingNow.map(item => `${item.cardId}:${item.stage}`).join(', ') || 'missing')
    addCheck(checks, activeItem?.definitionOfDone && list(activeItem.proofCommands).includes('npm run process:source-browser-agent-executor-check -- --json'), 'active item has definition of done and executor proof', activeItem?.cardId || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.cardId === ACTIVE_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable active-card Plan Critic pass row exists', planCriticRuns.filter(run => run.cardId === ACTIVE_CARD_ID).map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
    addCheck(checks, currentPlan.includes(SPRINT_ID) && currentPlan.includes(ACTIVE_CARD_ID), 'current plan references Human Web Agent V1 sprint', CURRENT_PLAN_PATH)
    addCheck(checks, currentState.includes(SPRINT_ID) && currentState.includes(ACTIVE_CARD_ID), 'current state references Human Web Agent V1 sprint', CURRENT_STATE_PATH)

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      sprintId: SPRINT_ID,
      activeBlocker: activeSprint.sprint?.activeBlockerCardId || '',
      planCritic: {
        sprintPlan: { status: sprintPlanReview.status, score: sprintPlanReview.score },
        activeCard: { status: activePlanReview.status, score: activePlanReview.score },
      },
      directorEvidence,
      planOrder: expectedOrder,
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`Human Web Agent V1 sprint plan proof: ${result.status}`)
      console.log(`  Sprint: ${SPRINT_ID}`)
      console.log(`  Active blocker: ${result.activeBlocker || 'missing'}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Human Web Agent V1 sprint plan proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
