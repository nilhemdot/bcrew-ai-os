#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  CRITICAL_ROOTS_UNDER_3K_PHASE_3_APPROVAL_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID,
  CRITICAL_ROOTS_UNDER_3K_PHASE_3_CLOSEOUT_KEY,
  CRITICAL_ROOTS_UNDER_3K_PHASE_3_PLAN_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH,
  SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES,
  SERVER_DOCUMENT_STRATEGY_SURFACE_MODULE_PATH,
  buildServerDocumentStrategySurfaceDogfoodProof,
  createServerDocumentStrategySurface,
  evaluateServerDocumentStrategySurfaceSplit,
} from '../lib/server-document-strategy-surface.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CRITICAL_ROOTS = [
  'scripts/foundation-verify.mjs',
  'server.js',
  'lib/foundation-db.js',
  'public/foundation.js',
]

function parseArgs(argv = process.argv.slice(2)) {
  return { json: argv.includes('--json') || argv.includes('--json=true') }
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  return String(source || '').split(/\r?\n/).length
}

async function changedFiles() {
  const { stdout } = await execFile('git', ['diff', '--name-only', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 128,
  })
  return String(stdout || '').split('\n').map(line => line.trim()).filter(Boolean)
}

async function proveDocumentStrategySurfaceCalls() {
  const surface = createServerDocumentStrategySurface({
    repoRoot,
    runtimeDir: repoRoot,
    privateLocalMarkdownMeta: {
      'USER.md': {
        role: 'Private human context',
        whyHidden: 'Synthetic proof mirrors the live local-only allowlist.',
      },
    },
    stratumBoldPath: path.join(repoRoot, 'public', 'fonts', 'Stratum1-Bold.otf'),
  })
  const sections = surface.parseSections('# Root\n\n## Alpha\nParagraph **bold**.\n- One')
  const heading = surface.getHeadingSection('# Root\n\n## Alpha\nBefore\n\n## Beta\nAfter', 'Alpha')
  const replacement = surface.replaceHeadingSection('# Root\n\n## Alpha\nBefore\n\n## Beta\nAfter', 'Alpha', 'After')
  const diff = surface.buildSimpleDiff('Before', 'After')
  const docPath = surface.resolveRequestedDoc('docs/business-strategy.md')
  const privateDocPath = surface.resolveRequestedDoc('USER.md')
  const meta = surface.getDocSurfaceMeta('docs/business-strategy.md')
  const pdfBytes = await surface.buildBusinessStrategyPdf({
    meta: { updatedAt: '2026-05-17T00:00:00.000Z' },
    sections: [
      {
        title: 'Alpha',
        content: 'Paragraph one.\n- Bullet one.',
      },
    ],
  })
  const gitStatus = await surface.getGitStatus()

  return {
    ok:
      sections.length === 1 &&
      sections[0].title === 'Alpha' &&
      heading?.currentText === 'Before' &&
      replacement?.content?.includes('After') &&
      diff.includes('--- current') &&
      surface.hashText('phase-3').length === 64 &&
      docPath === path.join(repoRoot, 'docs/business-strategy.md') &&
      privateDocPath === null &&
      meta.role === 'Canonical business strategy' &&
      pdfBytes.byteLength > 1000 &&
      typeof gitStatus === 'string',
    detail: JSON.stringify({
      sections: sections.length,
      heading: heading?.heading || '',
      docPath: docPath ? path.relative(repoRoot, docPath) : null,
      privateDocBlocked: privateDocPath === null,
      pdfBytes: pdfBytes.byteLength,
      gitStatusType: typeof gitStatus,
    }),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    serverSource,
    moduleSource,
    packageSource,
    proofScriptSource,
    planSource,
    closeoutRecordsSource,
    coverageSource,
    foundationVerifySource,
  ] = await Promise.all([
    readRepoFile('server.js'),
    readRepoFile(SERVER_DOCUMENT_STRATEGY_SURFACE_MODULE_PATH),
    readRepoFile('package.json'),
    readRepoFile(CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH),
    readRepoFile(CRITICAL_ROOTS_UNDER_3K_PHASE_3_PLAN_PATH),
    readRepoFile('lib/foundation-build-closeout-size-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const criticalRootCounts = Object.fromEntries(await Promise.all(
    CRITICAL_ROOTS.map(async filePath => [filePath, lineCount(await readRepoFile(filePath))])
  ))
  const splitEvaluation = evaluateServerDocumentStrategySurfaceSplit({
    rootSource: serverSource,
    moduleSource,
    rootLineCount: criticalRootCounts['server.js'],
    packageJson,
  })
  const dogfood = buildServerDocumentStrategySurfaceDogfoodProof({
    rootSource: serverSource,
    moduleSource,
    rootLineCount: splitEvaluation.rootLineCount,
    moduleLineCount: splitEvaluation.moduleLineCount,
    packageJson,
  })
  const surfaceCalls = await proveDocumentStrategySurfaceCalls()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: CRITICAL_ROOTS_UNDER_3K_PHASE_3_APPROVAL_PATH,
    cardId: CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID,
  })
  const [cards, planCriticRuns, diffFiles] = await Promise.all([
    getBacklogItemsByIds([CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID]),
    getPlanCriticRunsByCardIds([CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID]),
    changedFiles(),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const forbiddenTouched = diffFiles.filter(filePath => /(^|\/)(harlan|fal|voice|mockup)/i.test(filePath))
  const planHasDomainSplit = planSource.includes('document strategy surface') &&
    planSource.includes('server.js') &&
    planSource.includes('without route behavior changes') &&
    ['Harlan', 'Fal', 'voice', 'Canva'].every(token => planSource.includes(token))
  const closeoutRegistryOwnsCard = closeoutRecordsSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_3_CLOSEOUT_KEY) &&
    closeoutRecordsSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID) &&
    closeoutRecordsSource.includes(SERVER_DOCUMENT_STRATEGY_SURFACE_MODULE_PATH)
  const verifierCoverageOwnsCard = coverageSource.includes('CRITICAL_ROOTS_UNDER_3K_PHASE_3_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') &&
    coverageSource.includes(CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID)
  const verifierAllowsActiveSprint = foundationVerifySource.includes("'CRITICAL-ROOTS-UNDER-3K-PHASE-3'")

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || CRITICAL_ROOTS_UNDER_3K_PHASE_3_APPROVAL_PATH)
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, splitEvaluation.ok, 'server delegates document strategy surface helpers', splitEvaluation.findings.map(item => `${item.code}:${item.detail}`).join(', ') || JSON.stringify({ root: splitEvaluation.rootLineCount, module: splitEvaluation.moduleLineCount }))
  ensure(checks, surfaceCalls.ok, 'focused proof calls extracted document strategy surface module', surfaceCalls.detail)
  ensure(checks, dogfood.ok, 'dogfood rejects arbitrary or incomplete document strategy splits', dogfood.dogfoodInvariant)
  ensure(checks, criticalRootCounts['server.js'] < SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES, 'server.js line count decreases from Phase 3 baseline', `${criticalRootCounts['server.js']}/${SERVER_DOCUMENT_STRATEGY_SURFACE_BEFORE_LINES}`)
  ensure(checks, criticalRootCounts['scripts/foundation-verify.mjs'] < 5000, 'scripts/foundation-verify.mjs stays below 5,000 lines', String(criticalRootCounts['scripts/foundation-verify.mjs']))
  ensure(checks, criticalRootCounts['public/foundation.js'] < 3000, 'public/foundation.js remains below 3,000 lines', String(criticalRootCounts['public/foundation.js']))
  ensure(checks, splitEvaluation.moduleLineCount <= 1500, 'extracted document strategy surface module stays under 1,500 lines', String(splitEvaluation.moduleLineCount))
  ensure(checks, planHasDomainSplit, 'plan names domain split and not-next boundaries', CRITICAL_ROOTS_UNDER_3K_PHASE_3_PLAN_PATH)
  ensure(checks, closeoutRegistryOwnsCard, 'closeout registry owns Phase 3 closeout key and module', CRITICAL_ROOTS_UNDER_3K_PHASE_3_CLOSEOUT_KEY)
  ensure(checks, verifierCoverageOwnsCard, 'verifier coverage names Phase 3 card', CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID)
  ensure(checks, verifierAllowsActiveSprint, 'foundation verifier recognizes Phase 3 active sprint progression', CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID)
  ensure(checks, proofScriptSource.includes('evaluateServerDocumentStrategySurfaceSplit') && proofScriptSource.includes('proveDocumentStrategySurfaceCalls'), 'focused proof calls real split evaluator and module functions', CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH)
  ensure(checks, packageJson.scripts?.['process:critical-roots-under-3k-phase-3-check'] === `node --env-file-if-exists=.env ${CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH}`, 'package script is registered', CRITICAL_ROOTS_UNDER_3K_PHASE_3_SCRIPT_PATH)
  ensure(checks, forbiddenTouched.length === 0, 'no Harlan/Fal/voice/mockup paths touched', forbiddenTouched.join(', ') || 'clean')

  const result = {
    ok: checks.every(check => check.ok),
    cardId: CRITICAL_ROOTS_UNDER_3K_PHASE_3_CARD_ID,
    closeoutKey: CRITICAL_ROOTS_UNDER_3K_PHASE_3_CLOSEOUT_KEY,
    checks,
    failures: checks.filter(check => !check.ok),
    splitEvaluation,
    dogfood,
    criticalRootCounts,
    surfaceCalls,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Critical roots under 3K Phase 3 check: ${result.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
