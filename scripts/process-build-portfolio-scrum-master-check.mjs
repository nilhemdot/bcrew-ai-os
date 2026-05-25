#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH,
  BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
  BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH,
  BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH,
  OLD_DEV_SYSTEM_PORTFOLIO_EVIDENCE,
  buildPortfolioDogfoodProof,
} from '../lib/build-portfolio-scrum-master.js'

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

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [planSource, packageSource, currentPlanSource, directorPlanSource, handoffSource, approval] = await Promise.all([
    readRepoFile(BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/process/dev-team-intelligence-director-001-plan.md'),
    readRepoFile('docs/handoffs/2026-05-25-intelligence-spine-god-mode-checkpoint.md'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH,
      cardId: BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
    }),
  ])
  const packageJson = JSON.parse(packageSource)
  const dogfood = buildPortfolioDogfoodProof()
  const oldEvidence = await Promise.all(OLD_DEV_SYSTEM_PORTFOLIO_EVIDENCE.map(async evidencePath => ({
    path: evidencePath,
    exists: await fileExists(evidencePath),
  })))

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH
  )
  addCheck(
    checks,
    /Director -> Scoper -> Build Portfolio\/Sprint Master -> Steve approval/i.test(planSource) &&
      planSource.includes('source lineage') &&
      /seven (related|overlapping) ideas/i.test(planSource),
    'plan captures post-Scoper portfolio role and source-lineage merge behavior',
    BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:build-portfolio-scrum-master-check'] === `node --env-file-if-exists=.env ${BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH}`,
    'package exposes focused portfolio proof',
    packageJson.scripts?.['process:build-portfolio-scrum-master-check'] || 'missing'
  )
  addCheck(
    checks,
    oldEvidence.every(item => item.exists),
    'old-system evidence files used as pattern source still exist',
    oldEvidence.filter(item => !item.exists).map(item => item.path).join(', ') || `${oldEvidence.length} files`
  )
  addCheck(
    checks,
    /not recreate the old system as a swarm/i.test(planSource) &&
      planSource.includes('code-owned contracts'),
    'plan explicitly improves on old agent-swarm shape',
    'new Foundation implementation should be fewer agents, clearer contracts, stronger proof'
  )
  addCheck(
    checks,
    currentPlanSource.includes('Build Portfolio/Sprint Master') &&
      /duplicate\/overlapping scoped cards.*merge/i.test(currentPlanSource),
    'rebuild current plan names the portfolio layer',
    'docs/rebuild/current-plan.md'
  )
  addCheck(
    checks,
    directorPlanSource.includes('Build Portfolio/Sprint Master') &&
      directorPlanSource.includes('Director could drift into auto-scrum-master behavior'),
    'Director plan keeps Director separate from portfolio/sprint master behavior',
    'docs/process/dev-team-intelligence-director-001-plan.md'
  )
  addCheck(
    checks,
    handoffSource.includes('BUILD-PORTFOLIO-SCRUM-MASTER-001') &&
      /seven (related|overlapping) ideas.*one stronger source-backed build concept/i.test(handoffSource),
    'checkpoint handoff queues portfolio card with the right job',
    'docs/handoffs/2026-05-25-intelligence-spine-god-mode-checkpoint.md'
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood portfolio review handles merge, thin, blocked, existing-card, and standalone cases',
    JSON.stringify(dogfood.checks.filter(check => !check.ok))
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
    checks,
    failures,
    dogfood,
    oldEvidence,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Build Portfolio / Sprint Master check')
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
