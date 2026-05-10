#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_CURRENT_SPRINT_STAGES,
  FOUNDATION_CURRENT_SPRINT_ID,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_DOC_PATH,
  FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
  FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
  FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
  buildDefaultFoundationSprintSeed,
  buildFoundationCurrentSprintStatus,
  buildSyntheticFoundationCurrentSprintProof,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
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

function addFinding(findings, ok, check, detail = '', blockerCards = []) {
  if (!ok) findings.push({ check, detail, blockerCards })
}

function includesAll(text, values) {
  return values.every(value => text.includes(value))
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /content_text/i,
    /raw[_-]?content/i,
    /transcriptText/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
    /emailAddress/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function preserveSurfaceFollowUpBoundary() {
  const [surfaceCard] = await getBacklogItemsByIds([FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID])
  if (!surfaceCard) return false
  const text = [
    surfaceCard.summary,
    surfaceCard.nextAction,
    surfaceCard.statusNote,
  ].filter(Boolean).join('\n')
  const requiredSurfaceMarkers = [
    FOUNDATION_SPRINT_SYSTEM_CARD_ID,
    'broader UI polish',
    'Overview -> Systems -> Backlog -> Recent Work',
    'clickable app breadcrumbs',
    'done-velocity',
    'moved-to-done date',
    'Phase 1 / Truth Cleanup',
    'command-order',
    'backend-only',
    'app surface metadata',
    'at least 3 recent closeouts',
    'Recent Builds / Recent Work owns',
    'technical terms must have a plain-English meaning next to them',
  ]
  if (requiredSurfaceMarkers.every(marker => text.includes(marker))) return true
  await updateBacklogItem(FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID, {
    nextAction: 'After `FOUNDATION-SPRINT-SYSTEM-001` defines the current-sprint overlay and Sprint Ready gates, ship the broader UX/navigation slice: top nav order becomes Overview -> Systems -> Backlog -> Recent Work; Recent Builds / Recent Work defaults collapsed and shows plain-English built/partial/not-yet status, clickable app breadcrumbs, doc links, connector/system touched, and backend-only visibility; Overview gets done-velocity visibility with newest-done first and weekly moved-to-done bars; plan/backlog grouping either matches the rebuild plan or becomes a plain-English command-order view.',
    statusNote: 'Scoped follow-up boundary refreshed on 2026-05-10 by FOUNDATION-SPRINT-SYSTEM-001 proof: sprint overlay is its own control card, while FOUNDATION-SURFACE-UPDATES-001 stays broader UI polish/follow-up work. Acceptance remains: plain-English copy is required for all operator-facing closeout entries, status labels, and Foundation page labels; technical terms must have a plain-English meaning next to them; Recent Builds / Recent Work owns the where-it-lives links, app/hub/doc breadcrumbs, and "what changed here" notes; Recent Work links directly to affected app surfaces/docs for at least 3 recent closeouts; done items show moved-to-done date and sort newest-to-oldest in done sections; weekly done-velocity bar chart appears on Overview; the misleading Phase 1 / Truth Cleanup grouping is reconciled to the rebuild plan or replaced by command-order status; backend-only changes say where the effect is visible; `foundation:verify` checks major closeouts include app surface metadata, not just files. `FOUNDATION-SPRINT-SYSTEM-001` now owns the minimal sprint overlay/process gates so they are not buried as generic UI polish. Not in scope: full design-system rewrite, full doc redline/highlight engine, user/access control panel, extraction retry/backoff, Strategy/Scoper/Agent work.',
  }, 'foundation-sprint-system-check')
  return true
}

async function closeCardIfHealthy(summary) {
  if (summary.status !== 'healthy') return
  await updateBacklogItem(FOUNDATION_SPRINT_SYSTEM_CARD_ID, {
    lane: 'done',
    nextAction: 'Use the Current Sprint overlay to return to MEETING-VAULT-ACL-001 through the required Sprint Ready existing-work/doctrine check. Do not mutate Drive permissions or send request-access emails without the separate Phase B approval artifact.',
    statusNote: 'Closed on 2026-05-10 under `foundation-sprint-system-v1`. V1 adds `lib/foundation-current-sprint.js`, additive `foundation_sprints` / `foundation_sprint_items` overlay tables, `/api/foundation/current-sprint` plus `currentSprint` on `/api/foundation-hub`, a compact Current Sprint panel at the top of Recent Work, `scripts/process-foundation-sprint-system-check.mjs`, package/verifier coverage, `docs/process/foundation-sprint-system.md`, and rebuild plan/state closeout notes. Proof commands: `npm run process:foundation-sprint-system-check`, `npm run backlog:hygiene -- --json`, `npm run foundation:verify`, and `npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-SYSTEM-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json --closeoutKey=foundation-sprint-system-v1 --commitRef=HEAD`.',
  }, 'foundation-sprint-system-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    await preserveSurfaceFollowUpBoundary()

    const buildingSeed = buildDefaultFoundationSprintSeed({ stage: 'building_now' })
    await upsertFoundationCurrentSprintOverlay(buildingSeed, 'foundation-sprint-system-check')
    const buildingSprint = await getActiveFoundationCurrentSprint()
    const buildingCards = await getBacklogItemsByIds([
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      'MEETING-VAULT-ACL-001',
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ])
    const buildingStatus = buildFoundationCurrentSprintStatus({
      sprint: buildingSprint.sprint,
      items: buildingSprint.items,
      backlogItems: buildingCards,
      closeouts: getFoundationBuildCloseouts(),
    })

    const packageJson = await readJson('package.json')
    const [
      planSource,
      approvalSource,
      moduleSource,
      dbSource,
      serverSource,
      uiSource,
      stylesSource,
      scriptSource,
      buildLogSource,
      currentPlan,
      currentState,
      processDocSource,
      captureSource,
    ] = await Promise.all([
      readText(FOUNDATION_SPRINT_SYSTEM_PLAN_PATH),
      readText(FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH),
      readText('lib/foundation-current-sprint.js'),
      readText('lib/foundation-db.js'),
      readText('server.js'),
      readText('public/foundation.js'),
      readText('public/styles.css'),
      readText(FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH),
      readText('lib/foundation-build-log.js'),
      readText('docs/rebuild/current-plan.md'),
      readText('docs/rebuild/current-state.md'),
      readText(FOUNDATION_SPRINT_SYSTEM_DOC_PATH),
      readText('docs/handoffs/2026-05-10-foundation-sprint-capture.md'),
    ])
    const approval = JSON.parse(approvalSource)
    const synthetic = buildSyntheticFoundationCurrentSprintProof()

    const findings = []
    const stageKeys = FOUNDATION_CURRENT_SPRINT_STAGES.map(stage => stage.key)
    const liveCardMap = new Map(buildingCards.map(card => [card.id, card]))
    const surfaceCard = liveCardMap.get(FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID)
    const velocityCard = liveCardMap.get(FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID)

    addFinding(findings, buildingStatus.status === 'healthy', 'building overlay is healthy before closeout', buildingStatus.findings.map(item => `${item.check}:${item.detail}`).join(' | '), [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, synthetic.ok, 'synthetic sprint guard catches missing ready check and returned reason', 'synthetic proof failed', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(moduleSource, [
      'FOUNDATION_CURRENT_SPRINT_STAGES',
      'FOUNDATION_EXISTING_WORK_CHECK_FIELDS',
      'validateExistingWorkCheck',
      'buildFoundationCurrentSprintStatus',
      'buildSyntheticFoundationCurrentSprintProof',
      'FOUNDATION-DONE-VELOCITY-001',
    ]), 'central sprint registry owns stage/readiness rules', 'missing central registry markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(dbSource, [
      'foundation_sprints',
      'foundation_sprint_items',
      'getActiveFoundationCurrentSprint',
      'upsertFoundationCurrentSprintOverlay',
    ]) && !/CREATE TABLE IF NOT EXISTS current_sprint_backlog_items/i.test(dbSource), 'database overlay is additive and not a second backlog', 'missing overlay tables/helpers or second backlog table detected', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(serverSource, [
      'currentSprint',
      '/api/foundation/current-sprint',
      'buildFoundationCurrentSprintStatus',
    ]), 'API exposes Current Sprint through hub and focused route', 'missing API markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(uiSource, [
      'renderCurrentSprintPanel',
      'Current Sprint',
      'done_this_sprint',
      'Done cards continue into Recent Work below',
    ]), 'Recent Work renders Current Sprint at the top', 'missing UI markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, stylesSource.includes('.current-sprint-panel') && stylesSource.includes('.current-sprint-stage-grid'), 'Current Sprint panel has compact styles', 'missing CSS markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, packageJson.scripts?.['process:foundation-sprint-system-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-sprint-system-check.mjs', 'package exposes process:foundation-sprint-system-check', 'missing package script', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(scriptSource, [
      FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
      'FOUNDATION-DONE-VELOCITY-001',
      'MEETING-VAULT-ACL-001',
      'FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES',
    ]), 'focused process check names follow-up and no-Drive boundaries', 'missing process script markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(planSource, [
      'Current Sprint is an overlay on live backlog truth, not a second backlog',
      '`sprint_ready`: Sprint Ready',
      '`returned`: Returned',
      'returnedReason',
      'FOUNDATION-DONE-VELOCITY-001',
    ]), 'approved plan contains overlay/stage/returned/velocity rules', 'missing plan markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, approval.cardId === FOUNDATION_SPRINT_SYSTEM_CARD_ID && approval.score >= 9.8 && approval.approvedPlanRef === FOUNDATION_SPRINT_SYSTEM_PLAN_PATH, 'approval artifact records Steve 9.8 approval', approval.cardId || 'missing approval card', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(processDocSource, [
      'overlay on live backlog',
      'Sprint Ready',
      'Returned requires',
      FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
    ]), 'process doc captures sprint operating rules', 'missing process doc markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, includesAll(buildLogSource, [
      FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      'FOUNDATION-SURFACE-UPDATES-001',
      'FOUNDATION-DONE-VELOCITY-001',
    ]), 'Recent Work closeout record owns only sprint-system card and mentions follow-ups', 'missing build-log closeout markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, currentPlan.includes(FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY) && currentPlan.includes('FOUNDATION-SURFACE-UPDATES-001') && currentPlan.includes('FOUNDATION-DONE-VELOCITY-001'), 'current plan records sprint-system closeout and follow-up split', 'missing current-plan markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, currentState.includes(FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY) && currentState.includes('Current Sprint') && currentState.includes('MEETING-VAULT-ACL-001 remains scoped'), 'current state records sprint-system closeout without closing Meeting Vault', 'missing current-state markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, captureSource.includes('FOUNDATION-SPRINT-SYSTEM-001') && captureSource.includes('FOUNDATION-DONE-VELOCITY-001') && captureSource.includes('Phase B paused'), 'latest capture updates are present', 'missing capture markers', [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, surfaceCard?.lane === 'scoped' && [surfaceCard.summary, surfaceCard.nextAction, surfaceCard.statusNote].join(' ').includes(FOUNDATION_SPRINT_SYSTEM_CARD_ID), 'FOUNDATION-SURFACE-UPDATES-001 remains broader scoped UI work', `${surfaceCard?.lane || 'missing'} / ${surfaceCard?.title || 'missing'}`, [FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID])
    addFinding(findings, velocityCard?.lane === 'scoped' && [velocityCard.summary, velocityCard.nextAction, velocityCard.statusNote].join(' ').includes('velocity'), 'FOUNDATION-DONE-VELOCITY-001 remains honest follow-up', `${velocityCard?.lane || 'missing'} / ${velocityCard?.title || 'missing'}`, [FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID])
    addFinding(findings, FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('MEETING-VAULT-ACL-001 Phase B')) && FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('Drive permissions')), 'not-next boundaries block Meeting Vault Phase B and Drive mutation', FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES.join(' | '), [FOUNDATION_SPRINT_SYSTEM_CARD_ID])
    addFinding(findings, noRawProof({ buildingStatus, stageKeys, synthetic }).length === 0, 'proof output is metadata-only', noRawProof({ buildingStatus, stageKeys, synthetic }).join(', '), [FOUNDATION_SPRINT_SYSTEM_CARD_ID])

    const preliminaryHealthy = findings.length === 0
    const summary = {
      status: preliminaryHealthy ? 'healthy' : 'blocked',
      cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      closeoutKey: FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
      repoHead,
      sprintId: FOUNDATION_CURRENT_SPRINT_ID,
      stageKeys,
      buildingOverlayStatus: buildingStatus.status,
      syntheticOk: synthetic.ok,
      followUps: [
        FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
        FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      ],
      notNextBoundaries: FOUNDATION_SPRINT_NOT_NEXT_BOUNDARIES,
      findings,
      apiStatus: null,
    }

    await closeCardIfHealthy(summary)
    if (summary.status === 'healthy') {
      const doneSeed = buildDefaultFoundationSprintSeed({ stage: 'done_this_sprint' })
      await upsertFoundationCurrentSprintOverlay(doneSeed, 'foundation-sprint-system-check')
      const doneSprint = await getActiveFoundationCurrentSprint()
      const doneCards = await getBacklogItemsByIds([
        FOUNDATION_SPRINT_SYSTEM_CARD_ID,
        'MEETING-VAULT-ACL-001',
        FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
        FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      ])
      const doneStatus = buildFoundationCurrentSprintStatus({
        sprint: doneSprint.sprint,
        items: doneSprint.items,
        backlogItems: doneCards,
        closeouts: getFoundationBuildCloseouts(),
      })
      summary.doneOverlayStatus = doneStatus.status
      summary.doneOverlayFindings = doneStatus.findings
      if (doneStatus.status !== 'healthy') {
        summary.status = 'blocked'
        findings.push({
          check: 'done overlay remains healthy after closeout',
          detail: doneStatus.findings.map(item => `${item.check}:${item.detail}`).join(' | '),
          blockerCards: [FOUNDATION_SPRINT_SYSTEM_CARD_ID],
        })
      }
    }

    try {
      const api = await fetchJson(baseUrl, '/api/foundation/current-sprint')
      summary.apiStatus = api.currentSprint?.status || null
      if (summary.status === 'healthy' && api.currentSprint?.status !== 'healthy') {
        summary.status = 'blocked'
        findings.push({
          check: 'served API returns healthy Current Sprint',
          detail: JSON.stringify((api.currentSprint?.findings || []).slice(0, 3)),
          blockerCards: [FOUNDATION_SPRINT_SYSTEM_CARD_ID],
        })
      }
    } catch (error) {
      summary.status = 'blocked'
      findings.push({
        check: 'served API exposes Current Sprint',
        detail: error instanceof Error ? error.message : String(error),
        blockerCards: [FOUNDATION_SPRINT_SYSTEM_CARD_ID],
      })
    }

    if (!jsonOnly) {
      console.log('Foundation Current Sprint proof')
      console.log(`  Card: ${FOUNDATION_SPRINT_SYSTEM_CARD_ID}`)
      console.log(`  Closeout: ${FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Sprint: ${summary.sprintId}`)
      console.log(`  Stages: ${stageKeys.join(', ')}`)
      console.log(`  API status: ${summary.apiStatus || 'missing'}`)
      console.log(`  Follow-ups: ${summary.followUps.join(', ')}`)
      for (const finding of findings) {
        console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
      }
    }

    console.log(`${FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(async error => {
  console.error('Foundation Current Sprint proof failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
