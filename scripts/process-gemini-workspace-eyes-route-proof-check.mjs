#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  initFoundationDb,
} from '../lib/foundation-db.js'
import { GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID } from '../lib/god-mode-extractor-eyes-quality-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001'
const NEXT_CARD_ID = 'MARK-KASHEF-LAST-50-BASELINE-001'
const PLAN_PATH = 'docs/process/gemini-workspace-eyes-route-proof-001-plan.md'
const SCRIPT_PATH = 'scripts/process-gemini-workspace-eyes-route-proof-check.mjs'
const SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
const ISOLATED_PROFILE_DIR = path.join(os.homedir(), 'Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean')

function parseArgs() {
  return {
    json: process.argv.includes('--json'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({
    ok: Boolean(ok),
    check,
    detail: detail || '',
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  try {
    const [
      packageJsonText,
      planText,
      currentPlanText,
      currentStateText,
      browserProfileReadme,
      activeSprint,
      backlogItems,
      eyesReportBundle,
      isolatedProfileExists,
    ] = await Promise.all([
      readRepoFile('package.json'),
      readRepoFile(PLAN_PATH),
      readRepoFile('docs/rebuild/current-plan.md'),
      readRepoFile('docs/rebuild/current-state.md'),
      readRepoFile('state/browser-profiles/README.md'),
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getIntelligenceReportBundle(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 20, hitLimit: 40 }),
      pathExists(ISOLATED_PROFILE_DIR),
    ])

    const packageJson = JSON.parse(packageJsonText)
    const sprint = activeSprint.sprint || {}
    const sprintItems = list(activeSprint.items)
    const activeItem = sprintItems.find(item => item.cardId === CARD_ID)
    const nextItem = sprintItems.find(item => item.cardId === NEXT_CARD_ID)
    const activeBacklog = backlogItems.find(item => item.id === CARD_ID)
    const nextBacklog = backlogItems.find(item => item.id === NEXT_CARD_ID)
    const report = eyesReportBundle?.report || null
    const atoms = list(eyesReportBundle?.atoms)
    const hits = list(eyesReportBundle?.hits)

    addCheck(checks, packageJson.scripts?.['process:gemini-workspace-eyes-route-proof-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:gemini-workspace-eyes-route-proof-check'] || 'missing')
    addCheck(checks, planText.includes('logged-in Gemini Workspace/App browser route') && planText.includes('without using the Gemini API key'), 'plan states the exact Gemini account eyes question', PLAN_PATH)
    addCheck(checks, planText.includes('~/Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean'), 'plan requires isolated AI Chrome profile', PLAN_PATH)
    addCheck(checks, planText.includes('Does not automate Steve') && planText.includes('normal Chrome profile'), 'plan blocks Steve normal browser profile automation', PLAN_PATH)
    addCheck(checks, planText.includes('Does not mutate credentials') && planText.includes('browser profiles'), 'plan blocks credential/profile mutation', PLAN_PATH)
    addCheck(checks, planText.includes('MEETING-VAULT-ACL-001') && planText.includes('Drive permission mutation'), 'plan includes standard Meeting Vault and Drive guard', PLAN_PATH)
    addCheck(checks, planText.includes('No Mark last-50 extraction'), 'plan keeps Mark scale-up out of scope', PLAN_PATH)
    addCheck(checks, browserProfileReadme.includes('ai-bensoncrew-clean'), 'isolated AI browser profile is documented', 'state/browser-profiles/README.md')
    addCheck(checks, isolatedProfileExists, 'isolated AI browser profile exists locally', ISOLATED_PROFILE_DIR)
    addCheck(checks, sprint.sprintId === SPRINT_ID, 'expected YouTube to Dev Team Intelligence sprint is active', sprint.sprintId || 'missing')
    addCheck(checks, sprint.activeBlockerCardId === CARD_ID, 'Current Sprint active blocker is Gemini Workspace eyes proof', sprint.activeBlockerCardId || 'missing')
    addCheck(checks, activeItem?.planRef === PLAN_PATH, 'active sprint item points at the Gemini Workspace plan', activeItem?.planRef || 'missing')
    addCheck(checks, activeItem?.metadata?.isolatedProfileOnly === true && activeItem?.metadata?.normalSteveProfileAllowed === false, 'active sprint metadata enforces isolated profile boundary', JSON.stringify(activeItem?.metadata || {}))
    addCheck(checks, list(activeItem?.notNextBoundaries).some(item => String(item).includes('MEETING-VAULT-ACL-001') && String(item).includes('Drive permissions')), 'active sprint item includes Meeting Vault and Drive guard', list(activeItem?.notNextBoundaries).join(' | '))
    addCheck(checks, activeBacklog?.lane === 'scoped' && activeBacklog?.priority === 'P0', 'backlog card exists as scoped P0', activeBacklog ? `${activeBacklog.id}:${activeBacklog.lane}/${activeBacklog.priority}` : 'missing')
    addCheck(checks, Number(activeBacklog?.rank || 999) < Number(nextBacklog?.rank || 999), 'Gemini proof is ordered before Mark baseline', `${activeBacklog?.rank || 'missing'} before ${nextBacklog?.rank || 'missing'}`)
    addCheck(checks, nextItem?.metadata?.blockedByCardId === CARD_ID || nextBacklog?.nextAction?.includes(CARD_ID), 'Mark baseline is parked behind Gemini proof', nextItem?.metadata?.blockedByCardId || nextBacklog?.nextAction || 'missing')
    addCheck(checks, currentPlanText.includes('next active card is `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001`') && currentPlanText.includes('MARK-KASHEF-LAST-50-BASELINE-001` is parked behind it'), 'current plan doc matches live active card', 'docs/rebuild/current-plan.md')
    addCheck(checks, currentStateText.includes('Active next card: `GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001`'), 'current state doc matches live active card', 'docs/rebuild/current-state.md')
    addCheck(checks, report?.reportArtifactId === GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, 'API Eyes baseline report is available for comparison', report?.reportArtifactId || 'missing')
    addCheck(checks, atoms.length > 0 && hits.length > 0, 'API Eyes baseline has atoms and evidence hits', `${atoms.length} atoms / ${hits.length} hits`)

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'blocked' : 'healthy',
      cardId: CARD_ID,
      mode: 'scoping_preflight',
      routeUnderTest: 'gemini_workspace_browser_account',
      currentKnownEyesRoute: 'gemini_api',
      routeOutcome: 'pending_live_browser_proof',
      isolatedProfileDir: ISOLATED_PROFILE_DIR,
      nextCardId: NEXT_CARD_ID,
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Gemini Workspace eyes route proof preflight: ${result.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
    }

    process.exitCode = failed.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Gemini Workspace eyes route proof preflight failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
