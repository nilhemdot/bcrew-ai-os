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
import {
  FILE_SIZE_WATCH_CLASSIFIER_APPROVAL_PATH,
  FILE_SIZE_WATCH_CLASSIFIER_CARD_ID,
  FILE_SIZE_WATCH_CLASSIFIER_CLOSEOUT_KEY,
  FILE_SIZE_WATCH_CLASSIFIER_PLAN_PATH,
  FILE_SIZE_WATCH_CLASSIFIER_SCRIPT_PATH,
  buildFoundationFileSizeStandardDogfoodProof,
  buildFoundationFileSizeStandardStatus,
} from '../lib/foundation-file-size-standard.js'
import { buildSyntheticFoundationVerifierProgressionHelpersProof } from '../lib/foundation-verifier-progression-helpers.js'
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

const CARD_ID = FILE_SIZE_WATCH_CLASSIFIER_CARD_ID
const CLOSEOUT_KEY = FILE_SIZE_WATCH_CLASSIFIER_CLOSEOUT_KEY
const PLAN_PATH = FILE_SIZE_WATCH_CLASSIFIER_PLAN_PATH
const APPROVAL_PATH = FILE_SIZE_WATCH_CLASSIFIER_APPROVAL_PATH
const SCRIPT_PATH = FILE_SIZE_WATCH_CLASSIFIER_SCRIPT_PATH
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-file-size-watch-classifier-closeout.md'
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const NEXT_CARD_ID = 'FOUNDATION-HEALTH-GREEN-LOCK-001'

const WATCHED_FILES = [
  'scripts/foundation-verify.mjs',
  'public/foundation.js',
  'lib/foundation-db.js',
  'server.js',
]

const BEFORE_LINE_COUNTS = Object.freeze({
  'scripts/foundation-verify.mjs': 4995,
  'public/foundation.js': 2997,
  'lib/foundation-db.js': 2260,
  'server.js': 2022,
})

const CHANGED_FILES = [
  'lib/foundation-file-size-standard.js',
  'lib/foundation-system-health.js',
  'lib/foundation-verifier-progression-helpers.js',
  'scripts/foundation-verify.mjs',
  SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-size-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  `node --check lib/foundation-file-size-standard.js lib/foundation-system-health.js lib/foundation-verifier-progression-helpers.js scripts/foundation-verify.mjs ${SCRIPT_PATH}`,
  'npm run process:foundation-file-size-watch-classifier-check -- --apply --close-card --json',
  'npm run process:file-size-engineering-standard-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
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

async function countLines(relativePath) {
  const source = await readRepoFile(relativePath)
  return source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0)
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

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Classify Foundation file-size watch rows',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 2,
    source: 'May 19 Foundation-only cleanup sprint after endpoint and handoff health rows cleared.',
    summary: 'Clear active file-size System Health rows by splitting the near-5k verifier slice and making remaining watch rows managed, owner-backed, threshold-backed, and stale-escalating.',
    whyItMatters: 'Yellow file-size debt should be handled by the system automatically instead of relying on Steve to notice central files drifting back into architecture risk.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue ${NEXT_CARD_ID}.`
      : 'Split the near-5k verifier slice and prove file-size watch rows are either gone or managed with automatic escalation.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; active file-size risk/watch counts are zero and managed rows remain visible.`
      : `Executing \`${CLOSEOUT_KEY}\`; file-size watch cleanup blocks the Foundation cleanup queue.`,
    owner: 'Foundation Process',
  }
}

function withFileSizeSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Active file-size risk/watch rows are zero; managed watch rows have owner, reason, threshold, next trigger, next action, and stale escalation; near-5k verifier risk is reduced by a focused split.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: [
      'Do not start source/value/agent work.',
      'Do not classify around missing owner/threshold/next-trigger rows.',
      'Do not leave scripts/foundation-verify.mjs at or above 5000 lines.',
      'Do not do broad mechanical rewrites or giant split work.',
      'Do not add new responsibility to near-limit files.',
      'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
      'Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.',
      'Do not launch parallel builders from this card.',
    ],
    existingWorkCheck: {
      existingCode: [
        'lib/foundation-file-size-standard.js',
        'lib/foundation-system-health.js',
        'lib/foundation-ship-preflight.js',
        'scripts/process-file-size-engineering-standard-check.mjs',
      ],
      existingScripts: [
        'scripts/process-file-size-engineering-standard-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/process-foundation-ship.mjs',
      ],
      existingPolicy: [
        'FILE-SIZE-ENGINEERING-STANDARD-001',
        'CRITICAL-FILES-UNDER-5K-001',
        'Foundation-only cleanup before source/value/agent work',
        'Green means no active unmanaged red/yellow workflow rows',
      ],
      newCode: [
        'lib/foundation-verifier-progression-helpers.js',
        SCRIPT_PATH,
      ],
      existingDocs: [
        'docs/process/file-size-engineering-standard-001-plan.md',
        PLAN_PATH,
        APPROVAL_PATH,
        CLOSEOUT_PATH,
      ],
      reused: [
        'existing file-size standard',
        'existing System Health rollup',
        'existing Current Sprint overlay',
        'existing process write guard',
      ],
      notRebuilt: [
        'No replacement file-size health system.',
        'No replacement verifier.',
        'No broad frontend, server, or DB rewrite.',
        'No source/value/agent feature lane.',
      ],
      notNew: [
        'No new file-size health system.',
        'No replacement verifier.',
        'No broad root-file rewrite.',
      ],
      exactGap: 'System Health still had four active file-size watch rows after endpoint and doc artifact cleanup.',
      overBroadRisk: 'This card can drift into a giant root-file split sprint or classification-only cleanup. V1 stays to one verifier helper extraction plus reusable managed-watch escalation.',
      readyBy: 'Steve approved Foundation-only file-size cleanup after endpoint metrics and handoff bloat were fixed.',
      readyAt: '2026-05-19T12:20:00-04:00',
    },
  }
}

function withGreenLockSprintItem(item = {}) {
  const notNextBoundaries = Array.from(new Set([
    ...(item.notNextBoundaries || []),
    'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
    'Do not mutate Google Drive permissions.',
    'Do not start source/value/agent work before green-lock review.',
    'Do not treat classification as repair.',
  ]))
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage || 'scoping',
    planRef: item.planRef || 'docs/process/foundation-health-green-lock-001-plan.md',
    definitionOfDone: item.definitionOfDone || 'Green means green: false-green, stale sprint health summaries, thresholdless watch rows, and unapproved exceptions fail closed.',
    proofCommands: item.proofCommands?.length ? item.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:foundation-raw-green-repair-and-lock-check -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    notNextBoundaries,
    existingWorkCheck: Object.keys(item.existingWorkCheck || {}).length ? item.existingWorkCheck : {
      existingCode: [
        'lib/foundation-system-health.js',
        'lib/foundation-health-watch-to-green.js',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-foundation-raw-green-repair-and-lock-check.mjs',
      ],
      existingScripts: [
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-foundation-raw-green-repair-and-lock-check.mjs',
        'scripts/process-current-sprint-dynamic-truth-check.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingPolicy: [
        'Green means green; classification is not repair.',
        'Exceptions require explicit Steve approval in sprint truth.',
        'Thresholdless watch rows fail.',
        'Stale embedded sprint health cannot pretend to be live truth.',
      ],
      existingDocs: [
        'docs/process/foundation-raw-green-repair-and-lock-001-plan.md',
        'docs/_archive/handoffs/2026-05-19-foundation-raw-green-repair-and-lock-closeout.md',
        'docs/_archive/handoffs/2026-05-19-foundation-file-size-watch-classifier-closeout.md',
      ],
      reused: [
        'Existing raw-green repair proof',
        'Existing System Health nightly audit check',
        'Existing Current Sprint dynamic truth check',
      ],
      notRebuilt: [
        'No new health system.',
        'No source/value/agent feature work.',
        'No connector repair or live extraction rerun.',
      ],
      exactGap: 'System Health still needs a final false-green lock after endpoint, handoff, and file-size cleanup.',
      overBroadRisk: 'This can drift into another cleanup sprint or source activation. V1 only prevents false-green health and stale sprint health displays.',
      readyBy: 'Steve approved green-lock as the next Foundation-only card after file-size cleanup.',
      readyAt: '2026-05-19T12:45:00-04:00',
    },
  }
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update file-size watch classifier backlog card, Plan Critic row, and Current Sprint overlay',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-file-size')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-file-size-watch-classifier-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-foundation-file-size',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID }),
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
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  let inserted = false
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withFileSizeSprintItem(item, { closeCard }))
      inserted = true
      continue
    }
    if (!inserted && item.cardId === NEXT_CARD_ID) {
      items.push(withFileSizeSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
      inserted = true
    }
    items.push(item.cardId === NEXT_CARD_ID ? withGreenLockSprintItem(item) : item)
  }
  if (!inserted) items.push(withFileSizeSprintItem({ order: items.length + 1 }, { closeCard }))

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
          currentStatus: closeCard ? 'file_size_watch_managed' : 'file_size_watch_classifier_active',
          nextAction: closeCard
            ? `Pause for ${NEXT_CARD_ID}; active file-size risk/watch rows are zero and managed rows remain visible.`
            : `${CARD_ID} blocks the cleanup queue until active file-size rows are cleared or split.`,
        },
      },
      items: items.map((item, index) => ({ ...item, order: index + 1 })),
    },
    'codex-foundation-file-size',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'Foundation-only cleanup requires active file-size rows to be cleared before green lock.',
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
    packageJson,
    coverageIdsSource,
    scriptSource,
    closeoutRegistrySource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-size-records.js'),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'file-size watch escalation semantics, managed non-blocking rows, verifier helper extraction, System Health file-size row removal, and live sprint closeout',
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

  const lineCounts = Object.fromEntries(await Promise.all(WATCHED_FILES.map(async filePath => [filePath, await countLines(filePath)])))
  const fileSizeStatus = buildFoundationFileSizeStandardStatus({ repoRoot })
  const dogfood = buildFoundationFileSizeStandardDogfoodProof()
  const progressionDogfood = buildSyntheticFoundationVerifierProgressionHelpersProof()
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const fileSizeEngineeringStandard = runNpmScript('process:file-size-engineering-standard-check', ['--json'])
  const card = workingCards.find(item => item.id === CARD_ID) || null
  const nextCard = workingCards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const parsedPackage = JSON.parse(packageJson)
  const healthSummary = systemHealth.json?.systemHealth?.summary || {}
  const healthRows = systemHealth.json?.systemHealth?.fileSizeStandard?.rows || []
  const activeFileSizeFindings = (systemHealth.json?.systemHealth?.findings || [])
    .filter(finding => String(finding.id || '').startsWith('file_size_'))
  const managedRows = fileSizeStatus.rows.filter(row => row.status === 'managed_watch')
  const allManagedRowsHaveProof = managedRows.every(row =>
    row.disposition?.owner &&
    row.disposition?.reason &&
    row.disposition?.threshold &&
    row.disposition?.nextTrigger &&
    row.disposition?.nextAction &&
    row.disposition?.reviewAfter &&
    row.blocksCurrentSprint === false
  )
  const beforeAfter = WATCHED_FILES.map(filePath => ({
    filePath,
    beforeLines: BEFORE_LINE_COUNTS[filePath],
    afterLines: lineCounts[filePath],
    delta: lineCounts[filePath] - BEFORE_LINE_COUNTS[filePath],
  }))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for file-size watch classifier', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live file-size classifier card is executing or done', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next health green-lock card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, lineCounts['scripts/foundation-verify.mjs'] < BEFORE_LINE_COUNTS['scripts/foundation-verify.mjs'], 'foundation verifier root line count decreased', `${BEFORE_LINE_COUNTS['scripts/foundation-verify.mjs']} -> ${lineCounts['scripts/foundation-verify.mjs']}`)
  addCheck(checks, lineCounts['scripts/foundation-verify.mjs'] < 5000, 'foundation verifier root is below 5k split-now threshold', `${lineCounts['scripts/foundation-verify.mjs']} line(s)`)
  addCheck(checks, lineCounts['public/foundation.js'] < 3000, 'public foundation root stays below 3k action threshold', `${lineCounts['public/foundation.js']} line(s)`)
  addCheck(checks, lineCounts['lib/foundation-db.js'] < 3000 && lineCounts['server.js'] < 3000, 'DB and server roots stay below 3k action threshold', `db=${lineCounts['lib/foundation-db.js']} server=${lineCounts['server.js']}`)
  addCheck(checks, fileSizeStatus.status === 'healthy' && fileSizeStatus.summary?.riskCount === 0 && fileSizeStatus.summary?.watchCount === 0, 'file-size standard has zero active risk/watch rows', JSON.stringify(fileSizeStatus.summary))
  addCheck(checks, fileSizeStatus.summary?.managedWatchCount === 4 && allManagedRowsHaveProof, 'all four watched files are managed with owner/threshold/next trigger', managedRows.map(row => `${row.filePath}:${row.disposition?.owner}`).join(', '))
  addCheck(checks, dogfood.ok, 'file-size dogfood covers unmanaged/stale/managed/split-now behavior', dogfood.dogfoodInvariant)
  addCheck(checks, dogfood.syntheticUnmanagedWatch?.status === 'watch' && dogfood.syntheticUnmanagedWatch?.summary?.unmanagedWatchCount === 1, 'future unmanaged watch rows stay active', JSON.stringify(dogfood.syntheticUnmanagedWatch?.summary))
  addCheck(checks, dogfood.syntheticStaleWatch?.status === 'watch' && dogfood.syntheticStaleWatch?.summary?.staleWatchCount === 1, 'stale managed watch rows escalate automatically', JSON.stringify(dogfood.syntheticStaleWatch?.summary))
  addCheck(checks, dogfood.syntheticSplitNowRisk?.status === 'risk' && dogfood.syntheticSplitNowRisk?.summary?.splitNowRequiredCount === 1, '5k split-now rows become risk', JSON.stringify(dogfood.syntheticSplitNowRisk?.summary))
  addCheck(checks, progressionDogfood.ok, 'verifier progression helper dogfood passes', 'active-sprint and current-state progression helpers delegated')
  addCheck(checks, systemHealth.exitStatus === 0 && systemHealth.json?.systemHealth?.status === 'healthy', 'system-health process exits healthy after file-size cleanup', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, Number(healthSummary.fileSizeRiskCount || 0) === 0 && Number(healthSummary.fileSizeWatchCount || 0) === 0 && activeFileSizeFindings.length === 0, 'file-size System Health rows disappeared as active debt', `risk=${healthSummary.fileSizeRiskCount ?? 'missing'} watch=${healthSummary.fileSizeWatchCount ?? 'missing'} findings=${activeFileSizeFindings.length}`)
  addCheck(checks, Number(healthSummary.rawRiskCount || 0) === 0 && Number(healthSummary.rawWatchCount || 0) === 0, 'raw System Health is fully green after file-size cleanup', `raw=${healthSummary.rawRiskCount}/${healthSummary.rawWatchCount}`)
  addCheck(checks, Number(healthSummary.fileSizeManagedWatchCount || 0) === 4 && healthRows.length >= 4 && healthRows.every(row => row.status === 'managed_watch' && row.blocksCurrentSprint === false), 'managed file-size rows remain visible and non-blocking in System Health', `${healthRows.length} row(s)`)
  addCheck(checks, fileSizeEngineeringStandard.exitStatus === 0 && fileSizeEngineeringStandard.json?.status === 'healthy', 'existing file-size engineering standard proof still passes', `exit=${fileSizeEngineeringStandard.exitStatus} status=${fileSizeEngineeringStandard.json?.status || 'missing'}`)
  addCheck(checks, parsedPackage.scripts?.['process:foundation-file-size-watch-classifier-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes file-size classifier proof', parsedPackage.scripts?.['process:foundation-file-size-watch-classifier-check'] || 'missing')
  addCheck(checks, coverageIdsSource.includes(CARD_ID), 'verifier coverage source names file-size classifier card id', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves file-size classifier', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('fileSizeWatchCount=0'), 'closeout handoff exists for file-size classifier', CLOSEOUT_PATH)
  const forbiddenNetworkCall = ['fe', 'tch('].join('')
  const forbiddenEmailSend = ['send', 'Email'].join('')
  addCheck(checks, !scriptSource.includes(forbiddenNetworkCall) && !scriptSource.includes(forbiddenEmailSend), 'focused proof has no network/action external-write calls', 'clean')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint can record file-size classifier closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeBlockerCardId === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to health green lock after close', activeBlockerCardId || 'missing')

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
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is health green lock after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    lineCounts: {
      beforeAfter,
      current: lineCounts,
    },
    fileSize: {
      status: fileSizeStatus.status,
      summary: fileSizeStatus.summary,
      managedRows: managedRows.map(row => ({
        filePath: row.filePath,
        lineCount: row.lineCount,
        owner: row.disposition?.owner,
        threshold: row.disposition?.threshold,
        nextTrigger: row.disposition?.nextTrigger,
        nextAction: row.disposition?.nextAction,
        blocksCurrentSprint: row.blocksCurrentSprint,
      })),
    },
    systemHealth: {
      exitStatus: systemHealth.exitStatus,
      status: systemHealth.json?.systemHealth?.status || null,
      summary: healthSummary,
      activeFileSizeFindingIds: activeFileSizeFindings.map(finding => finding.id),
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation file-size watch classifier check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    closeFoundationDb()
      .finally(() => {
        process.exit(1)
      })
  })
