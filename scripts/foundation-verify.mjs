#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import process from 'node:process'
import { getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function line(label, value = '') {
  console.log(value ? `${label}: ${value}` : label)
}

function pass(check, detail = '') {
  console.log(`PASS ${check}${detail ? ` -> ${detail}` : ''}`)
}

function fail(check, detail = '') {
  console.error(`FAIL ${check}${detail ? ` -> ${detail}` : ''}`)
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function runHealthScript(scriptName) {
  const { stdout, stderr } = await execFile('npm', ['run', '-s', scriptName], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024,
  })
  return (stdout || stderr).trim()
}

function ensure(checks, condition, check, detail) {
  if (!condition) {
    checks.push({ ok: false, check, detail })
    return
  }
  checks.push({ ok: true, check, detail })
}

function findSourceById(sources, sourceId) {
  return (sources || []).find(source => source.sourceId === sourceId || source.id === sourceId) || null
}

function includesAll(text, patterns) {
  return patterns.every(pattern => text.includes(pattern))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = typeof args.baseUrl === 'string' ? args.baseUrl : 'http://localhost:3000'
  const checks = []

  line('Foundation verification')
  line('  Base URL', baseUrl)
  line('  Repo root', repoRoot)

  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const ownersContract = findSourceById(sourceContracts, 'SRC-OWNERS-001')
  const financeContract = findSourceById(sourceContracts, 'SRC-FINANCE-001')

  ensure(
    checks,
    ownersContract?.status === 'Signed Off' && ownersContract?.validation === 'Signed Off',
    'source contracts: SRC-OWNERS-001 is signed off',
    ownersContract ? `${ownersContract.status} / ${ownersContract.validation}` : 'missing',
  )
  ensure(
    checks,
    financeContract?.status === 'Verified Readable' && financeContract?.validation === 'Partially Signed Off',
    'source contracts: SRC-FINANCE-001 keeps partial-signoff boundary',
    financeContract ? `${financeContract.status} / ${financeContract.validation}` : 'missing',
  )

  const sourceRegistry = await readRepoFile('docs/source-registry.md')
  const ownersSourceNote = await readRepoFile('docs/source-notes/owners-dashboard.md')

  ensure(
    checks,
    includesAll(sourceRegistry, ['### Signed Off Validation Units', '`SRC-OWNERS-001`', 'Signed Off | 2026-04-16']),
    'docs/source-registry.md reflects Owners sign-off',
    'signed-off unit and dated table row present',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['`SRC-FINANCE-001`', 'Partially Signed Off | 2026-04-20']),
    'docs/source-registry.md preserves finance as partial-not-signed-off',
    'finance row present with partial-signoff status',
  )
  ensure(
    checks,
    includesAll(ownersSourceNote, ['owner sign-off completed on `2026-04-16`', 'validated through Column `CB`']),
    'owners source note records sign-off and scope boundary',
    'owner sign-off note and CB boundary present',
  )

  const sourceOfTruth = await fetchJson(baseUrl, '/api/source-of-truth')
  const foundationHub = await fetchJson(baseUrl, '/api/foundation-hub')
  const ownersLeadSourceGovernance = await fetchJson(baseUrl, '/api/owners/lead-source-governance')
  const ownersReviewQueue = await fetchJson(baseUrl, '/api/owners/review-queue')
  const extractionTargets = Array.isArray(foundationHub.extractionControl?.targets)
    ? foundationHub.extractionControl.targets
    : []
  const scheduledExtractionTargets = extractionTargets.filter(target => target.scheduler?.source === 'foundation_job')
  const driveCorpusTarget = extractionTargets.find(target => target.targetKey === 'drive-corpus-backfill')

  ensure(
    checks,
    Array.isArray(sourceOfTruth.sources) && sourceOfTruth.sources.length === sourceContracts.length,
    'api/source-of-truth exposes the full source-contract set',
    `${Array.isArray(sourceOfTruth.sources) ? sourceOfTruth.sources.length : 'invalid'} live / ${sourceContracts.length} code`,
  )
  ensure(
    checks,
    Array.isArray(sourceOfTruth.connectors) && sourceOfTruth.connectors.length === sourceConnectors.length,
    'api/source-of-truth exposes the full connector set',
    `${Array.isArray(sourceOfTruth.connectors) ? sourceOfTruth.connectors.length : 'invalid'} live / ${sourceConnectors.length} code`,
  )

  const liveOwnersContract = findSourceById(sourceOfTruth.sources, 'SRC-OWNERS-001')
  ensure(
    checks,
    liveOwnersContract?.status === 'Signed Off' && liveOwnersContract?.validation === 'Signed Off',
    'api/source-of-truth keeps Owners sign-off visible',
    liveOwnersContract ? `${liveOwnersContract.status} / ${liveOwnersContract.validation}` : 'missing',
  )

  ensure(
    checks,
    Array.isArray(foundationHub.backlogItems) &&
      Array.isArray(foundationHub.decisions) &&
      Array.isArray(foundationHub.openQuestions) &&
      foundationHub.decisionTraceability &&
      foundationHub.decisionTraceability.summary &&
      foundationHub.decisionTraceability.byDecision &&
      foundationHub.decisionReview &&
      typeof foundationHub.decisionReview.total === 'number' &&
      foundationHub.decisionReview.counts &&
      Array.isArray(foundationHub.decisionReview.items),
    'api/foundation-hub returns the expected core arrays',
    `${foundationHub.backlogItems?.length ?? 'invalid'} backlog / ${foundationHub.decisions?.length ?? 'invalid'} decisions / ${foundationHub.openQuestions?.length ?? 'invalid'} questions`,
  )
  ensure(
    checks,
    foundationHub.sharedCommunicationSynthesis?.latestRun &&
      Array.isArray(foundationHub.sharedCommunicationSynthesis?.latestItems) &&
      foundationHub.sharedCommunicationSynthesis.latestItems.length > 0,
    'api/foundation-hub exposes persisted shared-comms synthesis',
    foundationHub.sharedCommunicationSynthesis?.latestRun
      ? `${foundationHub.sharedCommunicationSynthesis.latestRun.runId} / ${foundationHub.sharedCommunicationSynthesis.latestItems.length} items`
      : 'missing synthesis payload',
  )
  ensure(
    checks,
    foundationHub.sharedCommunicationsCoverage?.totalArtifacts > 0 &&
      foundationHub.sharedCommunicationsCoverage?.totalCandidates > 0 &&
      Array.isArray(foundationHub.sharedCommunicationsCoverage?.sources) &&
      foundationHub.sharedCommunicationsCoverage.sources.length > 0,
    'api/foundation-hub exposes shared-comms coverage',
    foundationHub.sharedCommunicationsCoverage
      ? `${foundationHub.sharedCommunicationsCoverage.totalArtifacts} artifacts / ${foundationHub.sharedCommunicationsCoverage.totalCandidates} candidates`
      : 'missing coverage payload',
  )
  const coverageSources = foundationHub.sharedCommunicationsCoverage?.sources || []
  const sourcesWithExtractionDepth = coverageSources.filter(source =>
    typeof source.artifactsWithCandidates === 'number' &&
    typeof source.artifactsWithoutCandidates === 'number' &&
    typeof source.extractionCoveragePercent === 'number'
  )
  ensure(
    checks,
    coverageSources.length > 0 &&
      sourcesWithExtractionDepth.length === coverageSources.length,
    'api/foundation-hub exposes shared-comms extraction depth',
    coverageSources.length
      ? `${sourcesWithExtractionDepth.length}/${coverageSources.length} sources expose with-candidate / unmined counts`
      : 'missing coverage sources',
  )
  ensure(
    checks,
    foundationHub.llmRuntime?.summary &&
      Number(foundationHub.llmRuntime.summary.credentialCount || 0) > 0 &&
      Number(foundationHub.llmRuntime.summary.routeCount || 0) > 0 &&
      Array.isArray(foundationHub.llmRuntime.routes),
    'api/foundation-hub exposes policy-aware LLM runtime status',
    foundationHub.llmRuntime?.summary
      ? `${foundationHub.llmRuntime.summary.credentialCount} credentials / ${foundationHub.llmRuntime.summary.routeCount} routes`
      : 'missing LLM runtime payload',
  )
  ensure(
    checks,
    foundationHub.extractionControl?.summary &&
      Number(foundationHub.extractionControl.summary.targetCount || 0) > 0 &&
      extractionTargets.length > 0 &&
      Array.isArray(foundationHub.extractionControl.recentItems),
    'api/foundation-hub exposes extraction control targets',
    foundationHub.extractionControl?.summary
      ? `${foundationHub.extractionControl.summary.targetCount} targets / ${foundationHub.extractionControl.summary.currentDayTargets} current-day / ${foundationHub.extractionControl.recentItems?.length ?? 0} recent items`
      : 'missing extraction control payload',
  )
  ensure(
    checks,
    scheduledExtractionTargets.length > 0 &&
      scheduledExtractionTargets.every(target => target.foundationJobKey && target.scheduler?.scheduleStatus),
    'api/foundation-hub derives extraction schedules from Foundation jobs',
    scheduledExtractionTargets.length
      ? `${scheduledExtractionTargets.length} targets derive schedule from job runtime`
      : 'no target schedule derivations found',
  )
  ensure(
    checks,
    driveCorpusTarget?.cursorState?.driveInventory &&
      Number(driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0) >= 1 &&
      Number(driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0) >= 1,
    'api/foundation-hub exposes Drive corpus inventory cursor',
    driveCorpusTarget?.cursorState?.driveInventory
      ? `${driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0} inspected folders / ${driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0} queued`
      : 'missing Drive corpus cursor',
  )
  ensure(
    checks,
    foundationHub.driveCorpusInventory?.summary &&
      Number(foundationHub.driveCorpusInventory.summary.totalItems || 0) > 0 &&
      Array.isArray(foundationHub.driveCorpusInventory.valueRoutes),
    'api/foundation-hub exposes Drive corpus inventory review surface',
    foundationHub.driveCorpusInventory?.summary
      ? `${foundationHub.driveCorpusInventory.summary.totalItems} items / ${foundationHub.driveCorpusInventory.valueRoutes?.length || 0} value routes`
      : 'missing Drive corpus inventory payload',
  )
  ensure(
    checks,
    ownersLeadSourceGovernance?.sourceId === 'SRC-OWNERS-001' &&
      ownersLeadSourceGovernance?.drift &&
      ownersLeadSourceGovernance?.freshness &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.unexpectedInOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.missingFromOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.duplicates),
    'api/owners/lead-source-governance exposes governed dropdown drift',
    ownersLeadSourceGovernance?.drift
      ? `${ownersLeadSourceGovernance.drift.status} / ${ownersLeadSourceGovernance.drift.stats?.reviewNow ?? 'invalid'} review items`
      : 'missing drift payload',
  )
  ensure(
    checks,
    ownersReviewQueue?.sourceId === 'SRC-OWNERS-001' &&
      ownersReviewQueue?.reviewQueue &&
      ownersReviewQueue.reviewQueue.freshness &&
      ownersReviewQueue.reviewQueue.freshnessRules &&
      ownersReviewQueue.reviewQueue.sections &&
      ownersReviewQueue.reviewQueue.sections.admin?.freshness &&
      ownersReviewQueue.reviewQueue.sections.conditional?.freshness &&
      ownersReviewQueue.reviewQueue.sections.fubDrift?.freshness &&
      ownersReviewQueue.reviewQueue.sections.ownersGovernance?.freshness &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.admin?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.conditional?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.fubDrift?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.ownersGovernance?.items),
    'api/owners/review-queue exposes the governed Owners inbox',
    ownersReviewQueue?.reviewQueue
      ? `${ownersReviewQueue.reviewQueue.status} / ${ownersReviewQueue.reviewQueue.stats?.openItems ?? 'invalid'} open items`
      : 'missing review queue payload',
  )

  const foundationCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-002') || null
  ensure(
    checks,
    foundationCloseout?.lane === 'done' &&
      foundationCloseout?.title === 'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
    'FOUNDATION-002 matches signed-off reality',
    foundationCloseout ? `${foundationCloseout.lane} / ${foundationCloseout.title}` : 'missing',
  )

  const googleHealth = await runHealthScript('google:health')
  ensure(
    checks,
    googleHealth.includes('Spreadsheet access: OK') && googleHealth.includes('Delegated access is ready'),
    'google:health passes',
    googleHealth.split('\n').filter(Boolean).slice(-2).join(' | '),
  )

  const fubHealth = await runHealthScript('fub:health')
  ensure(
    checks,
    fubHealth.includes('Context: Support / Owner account (owner)') &&
      fubHealth.includes('Context: Steve account (steve)') &&
      fubHealth.includes('Status: ok'),
    'fub:health passes for both configured contexts',
    fubHealth
      .split('\n')
      .filter(lineValue => lineValue.includes('Context:') || lineValue.includes('Status:'))
      .join(' | '),
  )

  const sheetVerify = await runHealthScript('sheets:verify')
  ensure(
    checks,
    sheetVerify.includes('Sheet structure verification passed.'),
    'sheets:verify passes',
    sheetVerify.split('\n').filter(Boolean).slice(-2).join(' | '),
  )

  console.log('')
  for (const check of checks) {
    if (check.ok) pass(check.check, check.detail)
    else fail(check.check, check.detail)
  }

  const failed = checks.filter(check => !check.ok)
  console.log('')
  line('Summary', `${checks.length - failed.length}/${checks.length} checks passed`)

  if (failed.length) {
    process.exit(1)
  }

  console.log('Foundation verification passed.')
}

main().catch(error => {
  console.error('Foundation verification failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
