#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  DEV_BUILD_OPPORTUNITY_SCOPER_APPROVAL_PATH,
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  DEV_BUILD_OPPORTUNITY_SCOPER_PLAN_PATH,
  DEV_BUILD_OPPORTUNITY_SCOPER_SCRIPT_PATH,
  buildDevBuildOpportunityScoperDogfoodProof,
} from '../lib/dev-build-opportunity-scoper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    packageSource,
    currentPlanSource,
    portfolioPlanSource,
    evidenceTraceSource,
    evidenceTraceHelperSource,
    approval,
  ] = await Promise.all([
    readRepoFile(DEV_BUILD_OPPORTUNITY_SCOPER_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/process/build-portfolio-scrum-master-001-plan.md'),
    readRepoFile('scripts/process-dev-build-scoper-evidence-trace-check.mjs'),
    readRepoFile('lib/dev-build-opportunity-evidence-trace.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: DEV_BUILD_OPPORTUNITY_SCOPER_APPROVAL_PATH,
      cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
    }),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildDevBuildOpportunityScoperDogfoodProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || DEV_BUILD_OPPORTUNITY_SCOPER_APPROVAL_PATH
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:dev-build-scoper-check'] === `node --env-file-if-exists=.env ${DEV_BUILD_OPPORTUNITY_SCOPER_SCRIPT_PATH}`,
    'package exposes focused Dev Build Scoper proof',
    packageJson.scripts?.['process:dev-build-scoper-check'] || 'missing'
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:dev-build-scoper-evidence-trace-check'] === 'node --env-file-if-exists=.env scripts/process-dev-build-scoper-evidence-trace-check.mjs',
    'package exposes live evidence-trace Scoper proof',
    packageJson.scripts?.['process:dev-build-scoper-evidence-trace-check'] || 'missing'
  )
  addCheck(
    checks,
    evidenceTraceSource.includes('DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID') &&
      evidenceTraceSource.includes('buildDevBuildOpportunityEvidenceTrace') &&
      evidenceTraceHelperSource.includes('getDevBuildDirectorCandidates') &&
      evidenceTraceHelperSource.includes('findRawEvidence') &&
      !/const\s+(TARGET_TITLE|SOURCE_VIDEO_ID|RAW_REPORT_ARTIFACT_ID)\b/.test(`${evidenceTraceSource}\n${evidenceTraceHelperSource}`),
    'evidence-trace proof reads live Director candidates instead of hardcoded target constants',
    'scripts/process-dev-build-scoper-evidence-trace-check.mjs + lib/dev-build-opportunity-evidence-trace.js'
  )
  addCheck(
    checks,
    !/(?:\bfs\.(?:writeFile|appendFile)|\bwriteFile\s*\(|\bappendFile\s*\(|\bupdateBacklogItem\s*\(|\bcreateBacklogItem\s*\(|\bupsertIntelligence\w*\s*\(|globalThis\.fetch|chromium\.launch)/.test(`${evidenceTraceSource}\n${evidenceTraceHelperSource}`),
    'evidence-trace proof is read-only and has no writer/browser/provider side effects',
    'scripts/process-dev-build-scoper-evidence-trace-check.mjs + lib/dev-build-opportunity-evidence-trace.js'
  )
  addCheck(
    checks,
    /Director recommendation -> Dev Build Scoper -> Build Portfolio\/Sprint Master -> Steve approval/i.test(planSource) &&
      planSource.includes('acceptance criteria') &&
      planSource.includes('not-next boundaries') &&
      planSource.includes('source lineage') &&
      planSource.includes('raw intelligence atom or evidence hit') &&
      planSource.includes('resource link disposition'),
    'plan defines the correct post-Director scoping contract',
    DEV_BUILD_OPPORTUNITY_SCOPER_PLAN_PATH
  )
  addCheck(
    checks,
    currentPlanSource.includes(DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID) &&
      currentPlanSource.includes('Dev Build Scoper'),
    'rebuild current plan names Dev Build Scoper before Portfolio',
    'docs/rebuild/current-plan.md'
  )
  addCheck(
    checks,
    portfolioPlanSource.includes('raw Director recommendations as Scoper inputs only') &&
      portfolioPlanSource.includes('existing work to reuse'),
    'Portfolio plan depends on strict Scoper output, not raw Director recommendations',
    'docs/process/build-portfolio-scrum-master-001-plan.md'
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood Scoper proof covers researched, unresearched, blocked, and no-write cases',
    JSON.stringify(dogfood.checks.filter(check => !check.ok))
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
    checks,
    failures,
    dogfood: {
      checks: dogfood.checks,
      researchedStatus: dogfood.researched.status,
      unresearchedStatus: dogfood.unresearched.status,
      blockedStatus: dogfood.blocked.status,
      researchedPortfolioDecision: dogfood.researchedPortfolio.groups[0]?.decision,
      unresearchedPortfolioDecision: dogfood.unresearchedPortfolio.groups[0]?.decision,
      blockedPortfolioDecision: dogfood.blockedPortfolio.groups[0]?.decision,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Dev Build Opportunity Scoper check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
