#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationOperatingReliabilityDogfoodProof } from '../lib/connector-uptime-monitor.js'
import {
  buildSyntheticFoundationRuntimeJobStoreBehaviorProof,
} from '../lib/foundation-runtime-job-store.js'
import { buildFoundationSystemHealthDogfoodProof } from '../lib/foundation-system-health.js'
import { buildVideoContentExtractionKeyDogfoodProof } from './extract-video-content.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CARD_ID = 'SYSTEM-HEALTH-RED-ROW-REPAIR-001'
const PLAN_PATH = 'docs/process/system-health-red-row-repair-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/SYSTEM-HEALTH-RED-ROW-REPAIR-001.json'

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
    approval,
    packageSource,
    workerSource,
    runtimeStoreSource,
    connectorSource,
    videoExtractorSource,
    systemHealthSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json'),
    readRepoFile('scripts/foundation-worker.mjs'),
    readRepoFile('lib/foundation-runtime-job-store.js'),
    readRepoFile('lib/connector-uptime-monitor.js'),
    readRepoFile('scripts/extract-video-content.mjs'),
    readRepoFile('lib/foundation-system-health.js'),
  ])

  const runtimeStoreProof = await buildSyntheticFoundationRuntimeJobStoreBehaviorProof()
  const videoKeyProof = buildVideoContentExtractionKeyDogfoodProof()
  const connectorProof = buildFoundationOperatingReliabilityDogfoodProof()
  const systemHealthProof = buildFoundationSystemHealthDogfoodProof()
  const packageJson = JSON.parse(packageSource)

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'red-row repair approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:system-health-red-row-repair-check'] === 'node --env-file-if-exists=.env scripts/process-system-health-red-row-repair-check.mjs',
    'package script exposes focused red-row repair proof',
    packageJson.scripts?.['process:system-health-red-row-repair-check'] || 'missing',
  )
  addCheck(
    checks,
    runtimeStoreProof.ok === true &&
      runtimeStoreProof.checks.some(check =>
        check.ok === true &&
          check.check === 'stale Foundation job reaper honors per-job runtime budget instead of flat global timeout',
      ),
    'dogfood proves stale active-run reaper uses per-job runtime budgets',
    runtimeStoreProof.failed?.map(check => check.check).join(', ') || 'runtime store dogfood pass',
  )
  addCheck(
    checks,
    workerSource.includes('buildMaxRuntimeSecondsByJob') &&
      workerSource.includes('maxRuntimeSecondsByJob') &&
      workerSource.includes('graceSeconds: 300'),
    'worker passes job runtime budgets into stale-run reaper',
    'scripts/foundation-worker.mjs',
  )
  addCheck(
    checks,
    runtimeStoreSource.includes('jsonb_each_text($3::jsonb)') &&
      runtimeStoreSource.includes('staleThresholdSeconds') &&
      runtimeStoreSource.includes('staleRuntimeBudgeted'),
    'runtime job store persists budget-aware stale-run metadata',
    'lib/foundation-runtime-job-store.js',
  )
  addCheck(
    checks,
    videoKeyProof.ok === true,
    'dogfood proves long Skool video URLs cannot collide on extraction item key',
    videoKeyProof.checks.filter(check => !check.ok).map(check => check.check).join(', ') || `${videoKeyProof.leftKey} / ${videoKeyProof.rightKey}`,
  )
  addCheck(
    checks,
    videoExtractorSource.includes('buildVideoContentExtractionItemKey') &&
      videoExtractorSource.includes('sha256(externalId).slice(0, 24)') &&
      videoExtractorSource.includes('buildVideoContentExtractionKeyDogfoodProof'),
    'video extractor uses compact hash-backed extraction item keys',
    'scripts/extract-video-content.mjs',
  )
  addCheck(
    checks,
    connectorProof.ok === true &&
      connectorProof.checks.some(check =>
        check.ok === true &&
          check.check === 'old manual connector job failures stay visible but do not poison current connector health',
      ),
    'dogfood proves old manual connector failures stay visible without poisoning connector health',
    connectorProof.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'connector dogfood pass',
  )
  addCheck(
    checks,
    connectorSource.includes('isManualConnectorJob') &&
      connectorSource.includes('healthIncluded') &&
      connectorSource.includes('old manual failures do not make current connector health red'),
    'connector uptime keeps manual failures visible with excluded health flag',
    'lib/connector-uptime-monitor.js',
  )
  addCheck(
    checks,
    systemHealthProof.ok === true &&
      systemHealthSource.includes('buildScheduledJobStalenessSnapshot'),
    'system-health dogfood still marks missed scheduled jobs red and fresh jobs green',
    systemHealthProof.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'system health dogfood pass',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    planPath: PLAN_PATH,
    approvalPath: APPROVAL_PATH,
    runtimeStoreProof,
    videoKeyProof,
    connectorManualFailureDogfood: connectorProof.checks.find(check => check.check === 'old manual connector job failures stay visible but do not poison current connector health') || null,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`System health red-row repair check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
