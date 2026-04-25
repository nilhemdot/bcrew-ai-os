#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import process from 'node:process'
import { getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'
import {
  closeFoundationDb,
  getSharedCommunicationProcessingProvenanceGaps,
  getStaleLlmCalls,
  initFoundationDb,
} from '../lib/foundation-db.js'

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

async function collectCodeFiles(directory) {
  const fullDirectory = path.join(repoRoot, directory)
  const entries = await fs.readdir(fullDirectory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectCodeFiles(relativePath))
      continue
    }
    if (/\.(mjs|js)$/.test(entry.name)) files.push(relativePath)
  }
  return files
}

async function auditDirectOpenAiResponsesUsage() {
  const codeFiles = [
    ...await collectCodeFiles('lib'),
    ...await collectCodeFiles('scripts'),
  ]
  const offenders = []
  for (const relativePath of codeFiles) {
    const text = await readRepoFile(relativePath)
    if (!text.includes('https://api.openai.com/v1/responses')) continue
    if (relativePath === 'lib/llm-router.js') continue
    if (!text.includes('assertDirectOpenAiResponsesAllowed')) offenders.push(relativePath)
  }
  return offenders
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
  const freedomCommunityContract = findSourceById(sourceContracts, 'SRC-FREEDOM-COMMUNITY-001')
  await initFoundationDb()

  ensure(
    checks,
    ownersContract?.status === 'Signed Off' && ownersContract?.validation === 'Signed Off',
    'source contracts: SRC-OWNERS-001 is signed off',
    ownersContract ? `${ownersContract.status} / ${ownersContract.validation}` : 'missing',
  )
  ensure(
    checks,
    financeContract?.status === 'Current reality captured' && financeContract?.validation === 'Signed Off For Current Reality',
    'source contracts: SRC-FINANCE-001 is signed off for current reality',
    financeContract ? `${financeContract.status} / ${financeContract.validation}` : 'missing',
  )
  ensure(
    checks,
    ['Split Cal', 'Agent Splits', 'Listings and Conditional Deals', 'Sales & Deposit', 'Goal & KPI Calculator', 'CI Report'].every(tab => ownersContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-OWNERS-001 exposes signed-off tab coverage',
    ownersContract?.signedOffTabs?.join(', ') || 'missing',
  )
  ensure(
    checks,
    ['Monthly Budget', 'Budget Original', 'Monthly Actuals (Roll Up)', 'Annual Actuals (Roll Up)', 'Annual Budget (Roll Up)', 'Unspent -L3M + Actual Helper'].every(tab => financeContract?.signedOffTabs?.includes(tab)),
    'source contracts: SRC-FINANCE-001 exposes signed-off finance tab coverage',
    financeContract?.signedOffTabs?.join(', ') || 'missing',
  )
  ensure(
    checks,
    ownersContract?.verifiedNonSourceTabs?.some(item => item.name === 'Lists' && /IMPORTRANGE/.test(item.reason || '') && /SRC-OWNERS-LISTS-001/.test(item.reason || '')),
    'source contracts: Owners Lists mirror explains non-source sign-off boundary',
    JSON.stringify(ownersContract?.verifiedNonSourceTabs || []),
  )
  ensure(
    checks,
    freedomCommunityContract?.signedOffTabs?.includes('Data Entry - BCrew Team/Community · G:O Community tracker'),
    'source contracts: Freedom units expose signed-off range coverage',
    freedomCommunityContract?.signedOffTabs?.join(', ') || 'missing',
  )

  const sourceRegistry = await readRepoFile('docs/source-registry.md')
  const currentState = await readRepoFile('docs/rebuild/current-state.md')
  const foundationHtmlSource = await readRepoFile('public/foundation.html')
  const foundationUiSource = await readRepoFile('public/foundation.js')
  const opsHtmlSource = await readRepoFile('public/ops.html')
  const opsUiSource = await readRepoFile('public/ops.js')
  const ownersSourceNote = await readRepoFile('docs/source-notes/owners-dashboard.md')
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const sharedCandidateExtractionSource = await readRepoFile('lib/shared-candidate-extraction.js')
  const directOpenAiOffenders = await auditDirectOpenAiResponsesUsage()

  ensure(
    checks,
    includesAll(sourceRegistry, ['### Signed Off Validation Units', '`SRC-OWNERS-001`', 'Signed Off | 2026-04-16']),
    'docs/source-registry.md reflects Owners sign-off',
    'signed-off unit and dated table row present',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['`SRC-FINANCE-001`', 'Signed Off For Current Reality | 2026-04-20']),
    'docs/source-registry.md reflects finance current-reality sign-off',
    'finance row present with current-reality signoff status',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['### Freedom Sheet Signed-Off Range Coverage', 'Data Entry - BCrew Team/Community · G:O Community tracker', 'Benson Crew Bhag Builder']),
    'docs/source-registry.md reflects Freedom signed-off range coverage',
    'Freedom range coverage section present',
  )
  ensure(
    checks,
    includesAll(sourceRegistry, ['### Owners Dashboard Signed-Off Tab Coverage', 'Split Cal', 'Annual Budget (Roll Up)', 'Unspent -L3M + Actual Helper', 'SRC-OWNERS-LISTS-001']),
    'docs/source-registry.md reflects Owners signed-off tab coverage',
    'Owners tab coverage section present',
  )
  ensure(
    checks,
    includesAll(currentState, ['Unspent -L3M + Actual Helper', 'IMPORTRANGE', 'SRC-OWNERS-LISTS-001']),
    'docs/rebuild/current-state.md reflects helper and mirror source boundaries',
    'current state explains finance helper coverage and Owners Lists mirror boundary',
  )
  ensure(
    checks,
    includesAll(ownersSourceNote, ['owner sign-off completed on `2026-04-16`', 'validated through Column `CB`']),
    'owners source note records sign-off and scope boundary',
    'owner sign-off note and CB boundary present',
  )
  ensure(
    checks,
    directOpenAiOffenders.length === 0,
    'direct OpenAI Responses API calls are guarded',
    directOpenAiOffenders.length ? directOpenAiOffenders.join(', ') : 'no unguarded direct Responses calls outside router',
  )
  ensure(
    checks,
    foundationDbSource.includes('artifact_content_hash') &&
      foundationDbSource.includes('COALESCE(processing.artifact_content_hash') &&
      !foundationDbSource.includes('active_candidate.artifact_id IS NULL'),
    'shared-comms processing selector is content-hash scoped',
    'current-content processing runs, not candidate existence, control extraction eligibility',
  )
  ensure(
    checks,
    includesAll(sharedCandidateExtractionSource, ['requestedModel', 'provider', 'authPath', 'routeKey', 'llmCallId']),
    'shared-comms extraction records actual LLM route provenance',
    'candidate metadata carries requested model plus actual provider/auth path/route/model',
  )
  const processingProvenanceGaps = await getSharedCommunicationProcessingProvenanceGaps({
    since: '2026-04-24T17:14:00-04:00',
    limit: 10,
  })
  ensure(
    checks,
    processingProvenanceGaps.length === 0,
    'shared-comms processing runs have routed LLM provenance',
    processingProvenanceGaps.length
      ? processingProvenanceGaps.map(item => `${item.runId}:${item.artifactId}`).join(', ')
      : 'no post-hardening candidate extraction rows missing hash/provider/auth/route/model',
  )
  const staleLlmCalls = await getStaleLlmCalls({ olderThanSeconds: 240, graceSeconds: 60, limit: 10 })
  ensure(
    checks,
    staleLlmCalls.length === 0,
    'llm_calls has no timeout-expired planned/started calls',
    staleLlmCalls.length
      ? staleLlmCalls.map(item => `${item.callId}:${item.status}:${item.ageSeconds}s>${item.timeoutSeconds + item.graceSeconds}s`).join(', ')
      : 'no planned/started LLM calls older than their timeout plus grace',
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
  const opsServedJobs = (foundationHub.foundationJobs?.jobs || []).filter(job =>
    Array.isArray(job.servesHubs) && job.servesHubs.includes('ops')
  )
  ensure(
    checks,
    opsServedJobs.some(job => job.key === 'admin-deal-review-readonly') &&
      opsServedJobs.some(job => job.key === 'conditional-deal-review-readonly'),
    'Foundation jobs expose systems serving Ops Hub',
    opsServedJobs.length
      ? opsServedJobs.map(job => job.key).join(', ')
      : 'no Ops-serving jobs tagged',
  )
  ensure(
    checks,
    includesAll(opsHtmlSource, ['Ops Hub', '/ops.js']) &&
      includesAll(opsUiSource, ['getHubServedJobs', 'fetchOwnersReviewQueue', 'Systems Serving Ops']) &&
      !foundationHtmlSource.includes('data-section="ops-hub"') &&
      !foundationUiSource.includes('function renderOpsHub'),
    'Ops Hub is a dedicated hub surface, not nested in Foundation nav',
    'public/ops.html + public/ops.js own the Ops cockpit; Foundation keeps system metadata only',
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
    typeof source.artifactsProcessed === 'number' &&
    typeof source.artifactsPendingProcessing === 'number' &&
    typeof source.processingCoveragePercent === 'number' &&
    typeof source.extractionCoveragePercent === 'number'
  )
  ensure(
    checks,
    coverageSources.length > 0 &&
      sourcesWithExtractionDepth.length === coverageSources.length,
    'api/foundation-hub exposes shared-comms extraction and processing depth',
    coverageSources.length
      ? `${sourcesWithExtractionDepth.length}/${coverageSources.length} sources expose candidate and processing counts`
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
  const strategyLayerCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'FOUNDATION-001') || null
  const strategyInputCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-014') || null
  ensure(
    checks,
    strategyLayerCloseout?.lane === 'done' && strategyInputCloseout?.lane === 'done',
    'strategy input package closeout cards match signed-off source reality',
    `FOUNDATION-001=${strategyLayerCloseout?.lane || 'missing'} / SOURCE-014=${strategyInputCloseout?.lane || 'missing'}`,
  )
  const sourceLifecycleContent = (foundationHub.backlogItems || []).find(item => item.id === 'MKT-004') || null
  ensure(
    checks,
    sourceLifecycleContent?.team === 'marketing' &&
      sourceLifecycleContent?.lane === 'research' &&
      /connect, verify, understand, extract, synthesize, route\/action/.test(sourceLifecycleContent?.summary || ''),
    'marketing backlog captures Source Intelligence Lifecycle content idea',
    sourceLifecycleContent ? `${sourceLifecycleContent.lane} / ${sourceLifecycleContent.title}` : 'missing',
  )
  const doneGuardrails = ['DATA-018', 'DATA-019', 'DATA-020'].map(id => (foundationHub.backlogItems || []).find(item => item.id === id))
  ensure(
    checks,
    doneGuardrails.every(item => item?.lane === 'done') &&
      !includesAll(foundationUiSource, ['DATA-018, DATA-019']) &&
      includesAll(currentState, ['DATA-018', 'DATA-019', 'DATA-020']),
    'current-state source closeout rows match done Owners/FUB guardrails',
    doneGuardrails.map(item => `${item?.id || 'missing'}=${item?.lane || 'missing'}`).join(' / '),
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
    process.exitCode = 1
    return
  }

  console.log('Foundation verification passed.')
}

main()
  .catch(error => {
    console.error('Foundation verification failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
