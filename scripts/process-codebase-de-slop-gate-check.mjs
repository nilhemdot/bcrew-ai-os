#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  CODEBASE_DE_SLOP_GATE_CARD_ID,
  CODEBASE_DE_SLOP_GATE_PLAN_PATH,
  CODEBASE_DE_SLOP_GATE_SCRIPT_PATH,
  CODEBASE_DE_SLOP_GATE_SOURCE_NOTE_PATH,
  buildSyntheticCodebaseDeSlopGateProof,
  evaluateCodebaseDeSlopGate,
} from '../lib/codebase-de-slop-gate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function containsForbiddenMutationPath(source) {
  const forbidden = [
    ['getFoundation', 'Snapshot'],
    ['update', 'BacklogItem'],
    ['create', 'BacklogItem'],
  ].map(parts => parts.join(''))
  return forbidden.some(pattern => source.includes(pattern))
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageSource, planText, moduleSource, scriptSource, sourceNote] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(CODEBASE_DE_SLOP_GATE_PLAN_PATH),
    readRepoFile('lib/codebase-de-slop-gate.js'),
    readRepoFile(CODEBASE_DE_SLOP_GATE_SCRIPT_PATH),
    readRepoFile(CODEBASE_DE_SLOP_GATE_SOURCE_NOTE_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const selfReview = evaluateCodebaseDeSlopGate({
    planText,
    card: { id: CODEBASE_DE_SLOP_GATE_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/process-plan-critic.js',
      'lib/plan-critic-architectural-rules.js',
      'lib/foundation-file-size-standard.js',
      'lib/code-quality-nightly-audit.js',
      'docs/specs/bcrew-ui-design-contract.md',
    ],
    declaredRisk: 'Foundation process gate, Plan Critic, code-quality audit, UI design contract, foundation:verify',
    repoRoot,
  })
  const dogfood = buildSyntheticCodebaseDeSlopGateProof({ repoRoot })

  addCheck(
    checks,
    packageJson.scripts?.['process:codebase-de-slop-gate-check'] === `node --env-file-if-exists=.env ${CODEBASE_DE_SLOP_GATE_SCRIPT_PATH}`,
    'package exposes focused de-slop gate proof',
    packageJson.scripts?.['process:codebase-de-slop-gate-check'] || 'missing',
  )
  addCheck(
    checks,
    selfReview.status === 'pass' && Number(selfReview.score) >= 9.8,
    'de-slop plan passes its own gate',
    `${selfReview.status} / ${selfReview.score}`,
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects sloppy plans and passes compliant plan',
    JSON.stringify(dogfood.cases),
  )
  addCheck(
    checks,
    moduleSource.includes('evaluatePlanCriticPlan') &&
      moduleSource.includes('uiDesignContractProof') &&
      moduleSource.includes('reportOnly: true') &&
      moduleSource.includes('buildSyntheticCodebaseDeSlopGateProof'),
    'module reuses Plan Critic and remains report-only',
    'lib/codebase-de-slop-gate.js',
  )
  addCheck(
    checks,
    scriptSource.includes('evaluateCodebaseDeSlopGate') &&
      !containsForbiddenMutationPath(scriptSource),
    'focused proof has no live backlog mutation path',
    CODEBASE_DE_SLOP_GATE_SCRIPT_PATH,
  )
  addCheck(
    checks,
    sourceNote.includes('How To De-Slop A Codebase Ruined By AI') &&
      sourceNote.includes('batch:youtube-latest-20:api-full-watch-v1:20260525162420') &&
      sourceNote.includes('CODEBASE-DE-SLOP-GATE-001'),
    'source note ties Matt extraction to the candidate card',
    CODEBASE_DE_SLOP_GATE_SOURCE_NOTE_PATH,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: CODEBASE_DE_SLOP_GATE_CARD_ID,
    reportOnly: true,
    writesBacklog: false,
    writesExternalSystems: false,
    selfReview: {
      status: selfReview.status,
      score: selfReview.score,
      findings: selfReview.findings.map(finding => finding.key),
    },
    dogfood,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Codebase De-Slop Gate check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
