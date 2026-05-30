#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-foundation-tuneup-roadmap-check.mjs'
const PACKAGE_SCRIPT = 'process:foundation-tuneup-roadmap-check'
const ACTOR = 'codex-foundation-tuneup-roadmap'
const SPRINT_ID = 'FOUNDATION-TUNEUP-2026-05-29'
const EPIC_CARD_ID = 'FOUNDATION-TUNEUP-ROADMAP-001'
const ACTIVE_CARD_ID = 'FOUNDATION-DB-IMPORT-OWNERSHIP-SPLIT-001'

const STANDING_GUARDRAILS = [
  'Do not delete scripts/codex-status.mjs.',
  'Do not bulk-delete verifier, approval, plan, or check files.',
  'Repoint gates before archiving any verifier/check file.',
  'Keep the foundation-db.js facade as a stable pass-through during import migration.',
  'Checkpoint with Steve before per-hub folder restructuring.',
  'Protect the real source/browser proof lane: MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001, source-session readiness, local-browser route policy, and Dev Hub System Truth are keep patterns.',
  'Protect the honest /api/foundation/dev-team-hub dashboard posture: show built/running/blocked, source-backed evidence, and zero hidden writes instead of polishing the readback.',
]

const ROADMAP_CARDS = [
  {
    id: EPIC_CARD_ID,
    title: 'Foundation tune-up roadmap from Claude and Codex audits',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Claude + Codex audit consensus, verified 2026-05-29',
    summary: 'Own the tune-up sequence as live backlog truth: memory closed, split import ownership, checkpoint before per-hub restructuring, then cleanup waves with gates repointed first.',
    whyItMatters: 'Steve needs the audit plan to load automatically in startup packets instead of living in chat. This card preserves the order and guardrails so future builders do not restart the debate.',
    nextAction: `Build ${ACTIVE_CARD_ID} first; keep later cards queued until the prior phase is proven.`,
    statusNote: 'Scoped on 2026-05-29 from independent Claude/Codex audits. Proof command: npm run process:foundation-tuneup-roadmap-check -- --apply --mutate-sprint --json. Guardrails: do not delete codex-status, do not bulk-delete verifier/approval/plan/check files, repoint gates before cleanup, keep facade pass-through, checkpoint before per-hub folders.',
    owner: 'Foundation Builder',
  },
  {
    id: ACTIVE_CARD_ID,
    title: 'Split foundation-db.js import ownership behind stable facade',
    lane: 'executing',
    priority: 'P0',
    rank: 2,
    source: 'Claude + Codex audit consensus: foundation-db.js remains worst collision import surface',
    summary: 'Move new and touched import ownership away from lib/foundation-db.js into existing domain modules while keeping the facade as pass-through so existing importers stay green.',
    whyItMatters: 'The file is no longer huge, but hundreds of imports still converge on one facade. Dual-lane work needs ownership by domain, not every feature editing the same root.',
    nextAction: 'Inventory current exports/importers, add domain import targets, migrate one safe import cluster, and prove the facade still passes foundation checks.',
    statusNote: 'Active Phase 1. First slice adds session, backlog+sprint, and intelligence domain import targets, migrates a safe proof-script cluster, keeps the facade pass-through, and proves direct facade imports do not grow. Focused proof: npm run process:foundation-db-import-ownership-split-check -- --json.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-HUB-FOLDER-ISOLATION-001',
    title: 'Checkpoint and plan per-hub folder ownership',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Claude + Codex audit consensus: shared server.js plus flat lib blocks dual-lane work',
    summary: 'After Phase 1, design hub-owned folders with routes, store, and screens self-registering onto a thin core.',
    whyItMatters: 'This is the largest dual-lane unlock, but it is L-effort and needs Steve review before build starts.',
    nextAction: 'Stop after the foundation-db import split and review the per-hub folder plan with Steve before implementation.',
    statusNote: 'Scoped only. Not active until Phase 1 closes. Proof/scope signal: must include owner boundaries, route registration plan, and no broad server.js rewrite.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001',
    title: 'Finish verifier gate tiering before verifier cleanup',
    lane: 'scoped',
    priority: 'P1',
    rank: 4,
    source: 'Audit finding: tiering exists but verifier/check cleanup can crash if files vanish',
    summary: 'Make small changes run a fast focused gate and preserve full gate for substrate/schema/safety changes before any checker archival.',
    whyItMatters: 'The system is over-gated, but deleting checks first would make the gate brittle. The gate must be repointed before cleanup.',
    nextAction: 'Inspect lib/process-verify-gate-tiering.js and pre-push behavior, then close missing fast-path cases with synthetic proof.',
    statusNote: 'Scoped cleanup prerequisite. Proof must catch real gate-selection failures, not only prove a script exists. Do not archive verifier files in this card.',
    owner: 'Foundation Builder',
  },
  {
    id: 'SOURCE-MATURITY-REPAIR-COLLAPSE-001',
    title: 'Collapse source-maturity repair clones into one engine',
    lane: 'scoped',
    priority: 'P1',
    rank: 5,
    source: 'Audit finding: source-maturity repair files are copy-paste clone surface',
    summary: 'Replace repeated source-maturity repair variants with one parameterized repair module plus data manifests.',
    whyItMatters: 'The clone family creates thousands of lines of repeated proof-state repair and slows safe changes.',
    nextAction: 'Classify the repair variants, extract the common engine, and prove one old fixture from each family still fails/passes correctly.',
    statusNote: 'Scoped for cleanup wave after split/gate work. No source row mutation or extraction run is allowed from this consolidation proof.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001',
    title: 'Move closeout records-as-code to data artifacts',
    lane: 'scoped',
    priority: 'P1',
    rank: 6,
    source: 'Audit finding: closeout registries encode large static records in JS',
    summary: 'Move closeout registry data out of JS record modules into DB/JSON artifacts with a small schema loader.',
    whyItMatters: 'Static records as code create collision files and make every closeout feel like a source-code edit.',
    nextAction: 'Design loader and migration proof for one closeout record family before touching the large registry groups.',
    statusNote: 'Scoped only. Gate must be repointed to the loader before any record module shrink/archive.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-OVERSIZED-FILE-SPLIT-WAVE-001',
    title: 'Split remaining oversized code and frontend files',
    lane: 'scoped',
    priority: 'P1',
    rank: 7,
    source: 'Audit finding: public/dev.css, foundation-verify.mjs, dev-team-hub.js, public/dev.js remain high-risk sizes',
    summary: 'Split the 800+ line and near-5K files by coherent ownership boundaries after gate and DB ownership are safer.',
    whyItMatters: 'Large files recreate the old-system collision pattern and hide performance/UI risks.',
    nextAction: 'Rank oversized files by active collision risk, then split one module with focused proof and no visual regression.',
    statusNote: 'Scoped cleanup wave. Proof must include behavior or visual checks where frontend files are touched.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-DONE-SEMANTICS-REPAIR-001',
    title: 'Repair done semantics for V1, preflight, and blocked work',
    lane: 'scoped',
    priority: 'P1',
    rank: 8,
    source: 'Audit finding: done cards can imply feature-complete when they mean V1/preflight/blocked',
    summary: 'Make live Backlog and UI distinguish V1 contract, preflight, blocked, and feature-complete outcomes across the 47-49 suspect done cards from the audit sample.',
    whyItMatters: 'Green paperwork cannot masquerade as real data to real outcome. Steve needs done to mean the right kind of done.',
    nextAction: 'Review the done cards with V1, preflight, blocked, pending, or approval language; relabel readback semantics without rewriting history; add a behavior probe for feature-complete claims.',
    statusNote: 'Scoped. Acceptance needs a behavior probe that the UI/readback cannot label V1/preflight/blocked work as feature-complete and a reviewed list for the 47-49 suspect done cards.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-ORPHAN-SCRIPT-REVIEW-001',
    title: 'Review orphan-script candidates without deleting first',
    lane: 'scoped',
    priority: 'P1',
    rank: 9,
    source: 'Codex audit item 6: orphan signal is polluted and named scripts need owner review',
    summary: 'Review the named orphan-script candidates and record keep, retire, or repoint decisions without deleting files as the first move.',
    whyItMatters: 'The dead-code map is noisy because package entrypoints and local/private state pollute incoming-edge counts. The right action is owner review, not bulk deletion.',
    nextAction: 'Review codex-chat*.sh, scripts/codex-status.mjs, scripts/generate-doc-indexes.mjs, scripts/inspect-weekly-actuals.mjs, scripts/run-supervised-paid-source-map.mjs, and scripts/sync-zoom-text-archive.mjs; keep codex-status.mjs unless a better live replacement exists.',
    statusNote: 'Scoped Phase 3 cleanup card. Proof must record keep/retire decisions and any gate/package references before moving or archiving a script.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001',
    title: 'Consolidate docs into canonical truth plus archive',
    lane: 'scoped',
    priority: 'P2',
    rank: 10,
    source: 'Audit finding: documentation volume creates competing truth',
    summary: 'Keep useful content but route current truth into canonical docs and archive old/audit/social-repurposable material cleanly.',
    whyItMatters: 'Docs should help operators and builders, not force them to reconcile stale snapshots against live DB/API truth.',
    nextAction: 'After code cleanup waves, classify docs into canonical, supporting, archive, or source-note buckets without deleting useful material.',
    statusNote: 'Scoped later phase. Do not start before structural code cleanup unless documentation drift blocks active work.',
    owner: 'Foundation Builder',
  },
  {
    id: 'FOUNDATION-TUNEUP-REMAP-PROOF-001',
    title: 'Re-map codebase after tune-up for before/after proof',
    lane: 'scoped',
    priority: 'P1',
    rank: 11,
    source: 'Audit closeout requirement: prove the tune-up reduced collision and bloat',
    summary: 'Run the codebase map again after the tune-up phases and compare import/collision/file-size evidence.',
    whyItMatters: 'The tune-up should prove it made the system leaner, not just move files around.',
    nextAction: 'After Phase 4, rerun the codebase map and capture before/after proof into live backlog/readback.',
    statusNote: 'Scoped final proof. Not active until prior tune-up phases close with evidence.',
    owner: 'Foundation Builder',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    mutateSprint: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] }),
  }
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function readRoadmapCards() {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT id, title, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner
        FROM backlog_items
        WHERE id = ANY($1::text[])
        ORDER BY array_position($1::text[], id)
      `,
      [ROADMAP_CARDS.map(card => card.id)],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function upsertRoadmapCards() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'upsert Foundation tune-up roadmap backlog cards',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const card of ROADMAP_CARDS) {
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
          `Updated ${card.id} from Claude/Codex tune-up audit roadmap.`,
          JSON.stringify({ sprintId: SPRINT_ID, rank: card.rank, roadmapCardId: EPIC_CARD_ID }),
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

function sprintItem(card, order) {
  return {
    cardId: card.id,
    order,
    sprintOrder: order,
    stage: card.id === ACTIVE_CARD_ID ? 'building_now' : card.id === EPIC_CARD_ID ? 'scoping' : 'sprint_ready',
    planRef: null,
    definitionOfDone: card.id === ACTIVE_CARD_ID
      ? 'Foundation DB import ownership starts moving to domain modules while lib/foundation-db.js remains a stable pass-through and proof stays green.'
      : card.nextAction,
    proofCommands: [
      'npm run process:foundation-tuneup-roadmap-check -- --json',
      ...(card.id === ACTIVE_CARD_ID ? ['npm run process:foundation-db-import-ownership-split-check -- --json'] : []),
      'npm run process:builder-memory-system-check -- --json',
      'npm run backlog:hygiene -- --json',
    ],
    nextAction: card.nextAction,
    notNextBoundaries: STANDING_GUARDRAILS,
    existingWorkCheck: {
      reused: [
        'Claude + Codex audit consensus from 2026-05-29',
        'existing foundation-db split modules and proof patterns',
        'process verify gate tiering',
        'live backlog and Current Sprint overlay',
      ],
      notRebuilt: [
        'No broad verifier deletion.',
        'No server.js/per-hub restructure before Steve checkpoint.',
        'No replacement of the Foundation DB facade.',
      ],
      exactGap: card.summary,
      overBroadRisk: 'Cleanup before ownership split can break named gates and recreate old-system drift.',
      readyBy: 'Steve',
      readyAt: '2026-05-29T22:15:00-04:00',
    },
    metadata: {
      roadmapCardId: EPIC_CARD_ID,
      source: 'claude-codex-audit-consensus',
      guardrails: STANDING_GUARDRAILS,
    },
  }
}

async function applyCurrentSprint() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'make Foundation tune-up roadmap the live Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const previous = await getActiveFoundationCurrentSprint()
  const previousSprintId = previous?.sprint?.sprintId || ''
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Foundation tune-up from Claude/Codex audits: preserve the working engine, reduce collision surfaces, and prove each cleanup with live gates before deletion.',
        activeBlockerCardId: ACTIVE_CARD_ID,
        metadata: {
          previousSprintId,
          roadmapCardId: EPIC_CARD_ID,
          source: 'claude-codex-audit-consensus',
          phaseOrder: ROADMAP_CARDS.map(card => card.id),
          checkpointBefore: 'FOUNDATION-HUB-FOLDER-ISOLATION-001',
          guardrails: STANDING_GUARDRAILS,
          noVerifierBulkDelete: true,
          keepCodexStatus: true,
          facadePassThroughRequired: true,
        },
      },
      items: ROADMAP_CARDS.map((card, index) => sprintItem(card, index + 1)),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previousSprintId || SPRINT_ID,
      reason: 'Steve explicitly approved overnight Foundation tune-up execution after Claude/Codex audit consensus and live memory proof.',
    },
  )
}

function definitionsAreComplete() {
  return ROADMAP_CARDS.every(card =>
    card.id &&
      card.title &&
      card.lane &&
      card.priority &&
      Number.isFinite(card.rank) &&
      card.summary &&
      card.whyItMatters &&
      card.nextAction &&
      card.statusNote &&
      card.owner,
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let applied = false

  await initFoundationDb()
  try {
    if (args.apply) {
      await upsertRoadmapCards()
      applied = true
    }
    if (args.mutateSprint) {
      await applyCurrentSprint()
      applied = true
    }

    const [packageJson, scriptSource, agentsSource, cards, currentSprint] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(SCRIPT_PATH),
      readRepoFile('AGENTS.md'),
      readRoadmapCards(),
      getActiveFoundationCurrentSprint(),
    ])
    const cardIds = new Set(cards.map(card => card.id))
    const sprintItemIds = new Set((currentSprint.items || []).map(item => item.cardId))

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`,
      'package exposes tune-up roadmap proof',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )
    addCheck(checks, definitionsAreComplete(), 'roadmap card definitions are complete', `${ROADMAP_CARDS.length} cards`)
    addCheck(
      checks,
      ROADMAP_CARDS[0]?.id === EPIC_CARD_ID && ROADMAP_CARDS[1]?.id === ACTIVE_CARD_ID,
      'roadmap order starts with epic then foundation-db split',
      ROADMAP_CARDS.slice(0, 3).map(card => card.id).join(', '),
    )
    addCheck(
      checks,
      ROADMAP_CARDS.every(card => /proof|Scoped|Active|Acceptance|Proof|command|gate|Acceptance/i.test(card.statusNote)),
      'all roadmap cards include proof or scope signal',
      'status notes contain proof/scope language',
    )
    addCheck(
      checks,
      STANDING_GUARDRAILS.some(item => item.includes('codex-status')) &&
        STANDING_GUARDRAILS.some(item => item.includes('bulk-delete verifier')) &&
        STANDING_GUARDRAILS.some(item => item.includes('Repoint gates')) &&
        STANDING_GUARDRAILS.some(item => item.includes('facade')) &&
        STANDING_GUARDRAILS.some(item => item.includes('MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001')) &&
        STANDING_GUARDRAILS.some(item => item.includes('/api/foundation/dev-team-hub')),
      'standing guardrails preserve no-delete, facade, and keep-pattern rules',
      STANDING_GUARDRAILS.join(' | '),
    )
    addCheck(
      checks,
      scriptSource.includes('assertProcessCheckWriteAllowed') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.apply') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.mutateSprint'),
      'live backlog and sprint writes require explicit flags',
      SCRIPT_PATH,
    )
    addCheck(
      checks,
      agentsSource.includes('Run `npm run builder:startup-packet`') &&
        agentsSource.includes('live builder packet'),
      'startup doctrine keeps live packet before roadmap work',
      'AGENTS.md',
    )
    addCheck(
      checks,
      !applied || ROADMAP_CARDS.every(card => cardIds.has(card.id)),
      'applied roadmap cards exist in live backlog',
      `${cards.length}/${ROADMAP_CARDS.length}`,
    )
    addCheck(
      checks,
      !args.mutateSprint || (
        currentSprint.sprint?.sprintId === SPRINT_ID &&
        currentSprint.sprint?.activeBlockerCardId === ACTIVE_CARD_ID &&
        ROADMAP_CARDS.every(card => sprintItemIds.has(card.id))
      ),
      'live Current Sprint points to Foundation tune-up roadmap when applied',
      `${currentSprint.sprint?.sprintId || 'missing'} / ${currentSprint.sprint?.activeBlockerCardId || 'missing'} / ${sprintItemIds.size} items`,
    )

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      applied,
      sprintId: SPRINT_ID,
      activeBlockerCardId: ACTIVE_CARD_ID,
      cardIds: ROADMAP_CARDS.map(card => card.id),
      liveCardCount: cards.length,
      liveCurrentSprintId: currentSprint.sprint?.sprintId || null,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Foundation tune-up roadmap proof: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error('Foundation tune-up roadmap proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
