#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildFoundationReadinessStatus,
} from '../lib/foundation-readiness-gates.js'
import {
  buildSyntheticExtractionRunHardeningProof,
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_SUMMARY_MARKER,
} from '../lib/extraction-run-hardening.js'
import {
  classifySourceCrawlItemRetries,
  closeFoundationDb,
  getExtractionControlSnapshot,
  initFoundationDb,
  markStaleSourceCrawlItems,
  updateBacklogItem,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const EXPECTED_GOVERNED_TARGETS = 12

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

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'))
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
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

function hasBoundedBackfillTarget(target) {
  if (!['backfill', 'corpus_mining', 'recovery'].includes(target.lane)) return true
  if (target.status !== 'active') return true
  const budget = target.budget || {}
  const cursor = target.cursorState || {}
  const dedupe = target.dedupePolicy || {}
  const hasItemCap = Boolean(budget.maxItemsPerRun || budget.maxArtifactsPerRun || budget.maxFilesPerRun)
  return Boolean(hasItemCap && budget.maxRuntimeSeconds && cursor.cursorType && dedupe.idempotent === true)
}

function noRawProof(snapshot, synthetic) {
  const proofText = JSON.stringify({
    summary: snapshot.summary,
    hardeningStatus: snapshot.hardeningStatus,
    coverage: (snapshot.coverageByTarget || []).map(record => ({
      targetKey: record.targetKey,
      lane: record.lane,
      status: record.status,
      lastStatus: record.lastStatus,
      counts: record.counts,
      retrySummary: record.retrySummary,
      nextSafeCommand: record.nextSafeCommand,
      hardeningStatus: record.hardeningStatus,
    })),
    synthetic: Object.fromEntries(Object.entries(synthetic.cases).map(([key, value]) => [key, {
      retryState: value.retryState,
      retryReason: value.retryReason,
      retryBlockerCard: value.retryBlockerCard,
      doubleCounts: value.doubleCounts,
    }])),
  })
  const forbidden = [
    /"content"\s*:/i,
    /"body"\s*:/i,
    /raw[_-]?content/i,
    /transcriptText/i,
    /contentText/i,
    /"quote"\s*:/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).length
}

async function buildRepoInputs() {
  const [packageJson, securityAccessSource, security002ScriptSource, doneTestScriptSource] = await Promise.all([
    readJson('package.json'),
    readText('lib/security-access.js'),
    readText('scripts/process-security-002-check.mjs'),
    readText('scripts/process-foundation-done-test.mjs'),
  ])
  return {
    packageJson,
    securityAccessHasRegistry: securityAccessSource.includes('SECURITY_ROUTE_POSTURES') &&
      securityAccessSource.includes('assertTier') &&
      securityAccessSource.includes('buildRedactedCollectionResponse'),
    securityScriptHasExternalDenials: security002ScriptSource.includes('John cannot read Foundation Hub') &&
      security002ScriptSource.includes('John cannot read shared-comms archive') &&
      security002ScriptSource.includes('does not read client maxTier'),
    scriptHasSummaryMarker: doneTestScriptSource.includes('FOUNDATION_DONE_TEST_SUMMARY'),
    scriptSupportsReportOnly: doneTestScriptSource.includes('report-only') &&
      doneTestScriptSource.includes('reportOnly'),
  }
}

async function buildReadinessStatus(baseUrl, repoHead) {
  const [foundationHub, repo] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    buildRepoInputs(),
  ])
  return buildFoundationReadinessStatus({
    foundationHub,
    closeouts: getFoundationBuildCloseouts(),
    repo,
    repoHead,
  })
}

async function closeCardIfHealthy(summary) {
  if (summary.status !== 'healthy') return
  await updateBacklogItem(EXTRACT_RUN_HARDENING_CARD_ID, {
    lane: 'done',
    nextAction: 'Keep EXTRACT-RUN-HARDENING-001 closed as the extraction retry/ledger/backfill readiness gate. Remaining Foundation readiness blockers are MEETING-VAULT-ACL-001 and DRIVE-ACCESS-REQUEST-001; do not widen extraction scope or raw Drive ACL work under this card.',
    statusNote: 'Closed on 2026-05-09 under `extract-run-hardening-v1`. V1 adds `lib/extraction-run-hardening.js`, queryable retry state on `source_crawl_items`, `source_crawl_item_attempts` run-ID attempt ledger, crawlRunId propagation from `scripts/run-extraction-target.mjs`, idempotent target-run finish behavior, stale item-lease reaping in the worker, retry/backoff classification, next-safe-command visibility for partial/failed targets, Runtime Health retry/exhausted/blocked/stale counts, `scripts/process-extract-run-hardening-check.mjs`, foundation verifier/readiness coverage, and metadata-only proof. It does not mark MEETING-VAULT-ACL-001 or DRIVE-ACCESS-REQUEST-001 done and does not add new extraction lanes.',
  }, 'extract-run-hardening-check')
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const jsonOnly = boolArg(args.json)
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const synthetic = buildSyntheticExtractionRunHardeningProof()
    const reapedStaleItems = await markStaleSourceCrawlItems({ olderThanMinutes: 5, limit: 200 }, 'extract-run-hardening-check')
    const classifiedItems = await classifySourceCrawlItemRetries({ limit: 5000 }, 'extract-run-hardening-check')
    const snapshot = await getExtractionControlSnapshot({ limit: 200 })
    const findings = []
    const activeUnbounded = (snapshot.targets || []).filter(target => !hasBoundedBackfillTarget(target))
    const coverageWithoutNextSafeCommand = (snapshot.coverageByTarget || []).filter(record => {
      const failedOrPartial = Number(record.counts?.failedItems || 0) > 0 ||
        record.lastStatus === 'partial' ||
        record.lastStatus === 'failed'
      return failedOrPartial && !String(record.nextSafeCommand || '').trim()
    })

    addFinding(findings, synthetic.pass, 'synthetic retry/backoff proof passes', 'central policy did not classify one or more fixture cases')
    addFinding(findings, Number(snapshot.summary?.targetCount || 0) >= EXPECTED_GOVERNED_TARGETS, 'all governed extraction targets are represented', `targets=${snapshot.summary?.targetCount || 0}`)
    addFinding(findings, activeUnbounded.length === 0, 'active backfill/corpus/recovery targets are bounded', activeUnbounded.map(target => target.targetKey).join(', '))
    addFinding(findings, Number(snapshot.summary?.staleActiveRuns || 0) === 0, 'no stale active target runs', `stale=${snapshot.summary?.staleActiveRuns || 0}`)
    addFinding(findings, Number(snapshot.summary?.staleLeasedItems || 0) === 0, 'no stale leased crawl items', `staleItems=${snapshot.summary?.staleLeasedItems || 0}`)
    addFinding(findings, Number(snapshot.summary?.failedItemsWithoutRetryState || 0) === 0, 'failed items have queryable retry state', `ambiguous=${snapshot.summary?.failedItemsWithoutRetryState || 0}`)
    addFinding(findings, coverageWithoutNextSafeCommand.length === 0, 'partial/failed targets expose next safe command or blocker', coverageWithoutNextSafeCommand.map(record => record.targetKey).join(', '))
    addFinding(findings, noRawProof(snapshot, synthetic) === 0, 'proof output is metadata-only', 'raw/private content key detected in proof payload')
    addFinding(findings, snapshot.hardeningStatus?.status === 'healthy', 'extraction hardening snapshot is healthy', (snapshot.hardeningStatus?.blockingFindings || []).join(', '))

    const preliminaryHealthy = findings.length === 0
    let readiness = null
    let readinessStillNamesExtractRunHardening = true
    const summary = {
      status: preliminaryHealthy ? 'healthy' : 'blocked',
      cardId: EXTRACT_RUN_HARDENING_CARD_ID,
      closeoutKey: EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
      repoHead,
      syntheticPass: synthetic.pass,
      governedTargetCount: Number(snapshot.summary?.targetCount || 0),
      retryEligibleItems: Number(snapshot.summary?.retryEligibleItems || 0),
      retryWaitingItems: Number(snapshot.summary?.retryWaitingItems || 0),
      retryExhaustedItems: Number(snapshot.summary?.retryExhaustedItems || 0),
      retryBlockedItems: Number(snapshot.summary?.retryBlockedItems || 0),
      staleActiveRuns: Number(snapshot.summary?.staleActiveRuns || 0),
      staleLeasedItems: Number(snapshot.summary?.staleLeasedItems || 0),
      failedItemsWithoutRetryState: Number(snapshot.summary?.failedItemsWithoutRetryState || 0),
      activeUnboundedTargets: activeUnbounded.map(target => target.targetKey),
      coverageWithoutNextSafeCommand: coverageWithoutNextSafeCommand.map(record => record.targetKey),
      reapedStaleItems: reapedStaleItems.length,
      classifiedItems: classifiedItems.length,
      readinessStillNamesExtractRunHardening,
      remainingReadinessBlockers: [],
    }

    await closeCardIfHealthy(summary)

    try {
      readiness = await buildReadinessStatus(baseUrl, repoHead)
      readinessStillNamesExtractRunHardening = (readiness.blockingCards || []).includes(EXTRACT_RUN_HARDENING_CARD_ID)
      summary.readinessStillNamesExtractRunHardening = readinessStillNamesExtractRunHardening
      summary.remainingReadinessBlockers = readiness.blockingCards || []
    } catch (error) {
      summary.status = 'blocked'
      findings.push({
        check: 'readiness status can be evaluated',
        detail: error instanceof Error ? error.message : String(error),
        blockerCards: [EXTRACT_RUN_HARDENING_CARD_ID],
      })
    }

    if (summary.status === 'healthy' && readinessStillNamesExtractRunHardening) {
      summary.status = 'blocked'
      findings.push({
        check: 'foundation readiness no longer names EXTRACT-RUN-HARDENING-001',
        detail: (readiness?.blockingCards || []).join(', ') || 'missing readiness output',
        blockerCards: [EXTRACT_RUN_HARDENING_CARD_ID],
      })
    }

    if (!jsonOnly) {
      console.log('Extraction run hardening proof')
      console.log(`  Card: ${EXTRACT_RUN_HARDENING_CARD_ID}`)
      console.log(`  Closeout: ${EXTRACT_RUN_HARDENING_CLOSEOUT_KEY}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Governed targets: ${summary.governedTargetCount}/${EXPECTED_GOVERNED_TARGETS}`)
      console.log(`  Retry: ${summary.retryEligibleItems} eligible, ${summary.retryWaitingItems} waiting, ${summary.retryExhaustedItems} exhausted, ${summary.retryBlockedItems} blocked`)
      console.log(`  Stale target runs: ${summary.staleActiveRuns}`)
      console.log(`  Stale item leases: ${summary.staleLeasedItems}`)
      console.log(`  Failed items without retry state: ${summary.failedItemsWithoutRetryState}`)
      console.log(`  Readiness still names EXTRACT-RUN-HARDENING-001: ${summary.readinessStillNamesExtractRunHardening ? 'yes' : 'no'}`)
      console.log('')
      for (const [key, value] of Object.entries(synthetic.cases)) {
        console.log(`FIXTURE ${key} state=${value.retryState || 'idempotent'} reason=${value.retryReason || (value.doubleCounts === false ? 'duplicate attempt cannot double-count' : 'n/a')}`)
      }
      for (const record of (snapshot.coverageByTarget || []).filter(record =>
        Number(record.counts?.failedItems || 0) > 0 || record.lastStatus === 'partial' || record.lastStatus === 'failed'
      )) {
        console.log(`TARGET ${record.targetKey} hardening=${record.hardeningStatus} failed=${record.counts?.failedItems || 0} next=${record.nextSafeCommand || 'missing'}`)
      }
      for (const finding of findings) {
        console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
      }
    } else {
      console.log(JSON.stringify({
        summary,
        findings,
        synthetic: {
          pass: synthetic.pass,
          cases: Object.fromEntries(Object.entries(synthetic.cases).map(([key, value]) => [key, {
            retryState: value.retryState,
            retryReason: value.retryReason,
            retryBlockerCard: value.retryBlockerCard,
            doubleCounts: value.doubleCounts,
          }])),
        },
      }, null, 2))
    }

    console.log(`${EXTRACT_RUN_HARDENING_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
