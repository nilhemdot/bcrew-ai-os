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
  buildSynthesisVerificationDbReport,
  closeFoundationDb,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  SYNTHESIS_VERIFY_CARD_ID,
  SYNTHESIS_VERIFY_CLOSEOUT_KEY,
  SYNTHESIS_VERIFY_SUMMARY_MARKER,
  buildSynthesisEvidenceIndex,
  verifySynthesizedRecord,
} from '../lib/synthesis-claim-verification.js'

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

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'))
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

function fixtureIndex() {
  return buildSynthesisEvidenceIndex({
    registeredSourceIds: ['SRC-GMAIL-001', 'SRC-STRATEGY-001'],
    facts: [
      {
        factId: 'fact:fixture-source',
        fact_id: 'fact:fixture-source',
        factType: 'goal_truth',
        sourceId: 'SRC-STRATEGY-001',
        sourceIds: ['SRC-STRATEGY-001'],
        status: 'active',
        sensitivity: 'neutral',
        minTier: 1,
        asOf: new Date().toISOString(),
      },
      {
        factId: 'fact:fixture-evidence',
        fact_id: 'fact:fixture-evidence',
        factType: 'retrieved_evidence',
        sourceId: 'SRC-GMAIL-001',
        sourceIds: ['SRC-GMAIL-001'],
        status: 'active',
        sensitivity: 'neutral',
        minTier: 1,
        evidenceId: 'atom:fixture-1',
        atomId: 'atom:fixture-1',
        candidateKey: 'candidate:fixture-1',
        asOf: new Date().toISOString(),
      },
    ],
    atoms: [
      { atomId: 'atom:fixture-1', sourceId: 'SRC-GMAIL-001', status: 'active', sensitivity: 'neutral', minTier: 1 },
      { atomId: 'atom:fixture-2', sourceId: 'SRC-GMAIL-001', status: 'active', sensitivity: 'neutral', minTier: 1 },
    ],
    chunks: [
      { chunkId: 'retrieval-chunk:fixture-1', sourceId: 'SRC-GMAIL-001', status: 'active', sensitivity: 'neutral', minTier: 1 },
      { chunkId: 'retrieval-chunk:fixture-2', sourceId: 'SRC-GMAIL-001', status: 'active', sensitivity: 'neutral', minTier: 1 },
    ],
    candidates: [
      { candidateKey: 'candidate:fixture-1', sourceId: 'SRC-GMAIL-001', status: 'pending', metadata: { minTier: 1, sensitivity: 'neutral' } },
    ],
  })
}

function baseVerifiedRecord(overrides = {}) {
  return {
    synthesizedItemId: 'synthesized-item:fixture',
    title: 'Fixture claim hash only',
    summary: 'Fixture summary hash only',
    sourceIds: ['SRC-GMAIL-001', 'SRC-STRATEGY-001'],
    factRefs: ['fact:fixture-source', 'fact:fixture-evidence'],
    evidenceRefs: ['atom:fixture-1', 'atom:fixture-2'],
    evidenceChunkRefs: ['retrieval-chunk:fixture-1', 'retrieval-chunk:fixture-2'],
    candidateKeys: ['candidate:fixture-1'],
    sensitivity: 'neutral',
    minTier: 1,
    attributes: {
      routeScope: 'strategy',
      strategyHubEligible: true,
    },
    metadata: {
      routeScope: 'strategy',
      strategyHubEligible: true,
    },
    ...overrides,
  }
}

function buildSyntheticProof() {
  const index = fixtureIndex()
  const verified = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord(),
  }, index)
  const unsupported = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord({
      synthesizedItemId: 'synthesized-item:unsupported-fixture',
      factRefs: [],
      evidenceRefs: [],
      evidenceChunkRefs: [],
      metadata: { routeScope: 'operational', synthesisVerificationFixture: 'unsupported' },
      attributes: { routeScope: 'operational' },
    }),
  }, index)
  const stale = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord({
      synthesizedItemId: 'synthesized-item:stale-fixture',
      metadata: { routeScope: 'strategy', strategyHubEligible: true, synthesisVerificationFixture: 'stale' },
    }),
  }, index)
  const contradicted = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord({
      synthesizedItemId: 'synthesized-item:contradicted-fixture',
      metadata: { routeScope: 'strategy', strategyHubEligible: true, synthesisVerificationFixture: 'contradicted' },
    }),
  }, index)
  const missingTier = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord({
      synthesizedItemId: 'synthesized-item:missing-tier-fixture',
      minTier: null,
      metadata: { routeScope: 'strategy', strategyHubEligible: true, synthesisVerificationFixture: 'missing-tier' },
    }),
  }, index)
  const singleEvidenceStrategy = verifySynthesizedRecord({
    surface: 'intelligence_synthesized_items',
    record: baseVerifiedRecord({
      synthesizedItemId: 'synthesized-item:single-evidence-fixture',
      evidenceRefs: ['atom:fixture-1'],
      evidenceChunkRefs: ['retrieval-chunk:fixture-1'],
    }),
  }, index)

  const cases = {
    verified,
    unsupported,
    stale,
    contradicted,
    missingTier,
    singleEvidenceStrategy,
  }
  const pass =
    verified.status === 'verified' &&
    unsupported.status !== 'verified' &&
    stale.status === 'stale' &&
    contradicted.status === 'contradicted' &&
    missingTier.status === 'blocked' &&
    singleEvidenceStrategy.status === 'blocked' &&
    singleEvidenceStrategy.blockedReasons.includes('single_evidence_strategy_claim')

  return { pass, cases }
}

function noRawProof(report, synthetic) {
  const text = JSON.stringify({
    summary: report.summary,
    counts: report.counts,
    synthetic: Object.fromEntries(Object.entries(synthetic.cases).map(([key, value]) => [key, {
      status: value.status,
      blockedReasons: value.blockedReasons,
      claimTextHash: value.claimTextHash,
    }])),
  })
  const forbidden = [
    /"content"\s*:/i,
    /"body"\s*:/i,
    /"raw"\s*:/i,
    /"transcript"\s*:/i,
    /"quote"\s*:/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).length
}

async function buildReadinessStatus(baseUrl, repoHead) {
  const [foundationHub, packageJson] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    readJson('package.json'),
  ])
  return buildFoundationReadinessStatus({
    foundationHub,
    closeouts: getFoundationBuildCloseouts(),
    repo: {
      packageJson,
      securityAccessHasRegistry: true,
      securityScriptHasExternalDenials: true,
      scriptHasSummaryMarker: true,
      scriptSupportsReportOnly: true,
    },
    repoHead,
  })
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const jsonOnly = boolArg(args.json)
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const synthetic = buildSyntheticProof()
    const report = await buildSynthesisVerificationDbReport({ stamp: true })
    const rawLeakFindings = noRawProof(report, synthetic)
    const healthy = synthetic.pass &&
      report.status === 'healthy' &&
      report.summary.privateOrRawLeakFindings === 0 &&
      rawLeakFindings === 0

    if (healthy) {
      await updateBacklogItem(SYNTHESIS_VERIFY_CARD_ID, {
        lane: 'done',
        nextAction: 'Keep SYNTHESIS-VERIFY-001 closed as the claim-verification gate for synthesized output. Next Foundation readiness blockers remain extraction hardening and meeting Drive ACL/vault work; do not reopen Strategy/advisor/scout/researcher output until their own approved cards use this verifier.',
        statusNote: 'Closed on 2026-05-09 under `synthesis-verify-v1`. V1 adds `lib/synthesis-claim-verification.js`, `scripts/process-synthesis-verify-check.mjs`, verification metadata for governed synthesized items/shared-comms synthesis/action routes, verified-only Action Router proposal selection, approval/apply fail-closed behavior for unverified decision-grade routes, Strategy Hub v2 verified-route filtering, advisory/blocked legacy shared-comms synthesis status, verifier/readiness coverage, and metadata-only proof. It does not mark EXTRACT-RUN-HARDENING-001, MEETING-VAULT-ACL-001, or DRIVE-ACCESS-REQUEST-001 done.',
      }, 'synthesis-verify-check')
    }

    let readiness = null
    let readinessStillNamesSynthesisVerify = true
    try {
      readiness = await buildReadinessStatus(baseUrl, repoHead)
      readinessStillNamesSynthesisVerify = (readiness.blockingCards || []).includes(SYNTHESIS_VERIFY_CARD_ID)
    } catch (error) {
      readiness = {
        status: 'not_ready',
        inputWarning: error instanceof Error ? error.message : String(error),
      }
    }

    const summary = {
      status: healthy && !readinessStillNamesSynthesisVerify ? 'healthy' : 'blocked',
      cardId: SYNTHESIS_VERIFY_CARD_ID,
      closeoutKey: SYNTHESIS_VERIFY_CLOSEOUT_KEY,
      repoHead,
      syntheticPass: synthetic.pass,
      governedItemCount: report.summary.governedItemCount,
      governedVerifiedCount: report.summary.governedVerifiedCount,
      nonLegacyGovernedUnverifiedCount: report.summary.nonLegacyGovernedUnverifiedCount,
      sharedItemCount: report.summary.sharedItemCount,
      sharedVerifiedCount: report.summary.sharedVerifiedCount,
      sharedAdvisoryOrBlockedCount: report.summary.sharedAdvisoryOrBlockedCount,
      actionRouteCount: report.summary.actionRouteCount,
      decisionGradeRouteCount: report.summary.decisionGradeRouteCount,
      unverifiedDecisionGradeRouteCount: report.summary.unverifiedDecisionGradeRouteCount,
      privateOrRawLeakFindings: report.summary.privateOrRawLeakFindings + rawLeakFindings,
      readinessStillNamesSynthesisVerify,
      remainingReadinessBlockers: readiness?.blockingCards || [],
    }

    if (!jsonOnly) {
      console.log('Synthesis claim verification proof')
      console.log(`  Card: ${SYNTHESIS_VERIFY_CARD_ID}`)
      console.log(`  Closeout: ${SYNTHESIS_VERIFY_CLOSEOUT_KEY}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Synthetic fail-closed proof: ${synthetic.pass ? 'pass' : 'fail'}`)
      console.log(`  Governed items: ${summary.governedVerifiedCount}/${summary.governedItemCount} verified`)
      console.log(`  Shared-comms items: ${summary.sharedVerifiedCount}/${summary.sharedItemCount} verified, ${summary.sharedAdvisoryOrBlockedCount} advisory/blocked`)
      console.log(`  Decision-grade routes: ${summary.decisionGradeRouteCount}, unverified=${summary.unverifiedDecisionGradeRouteCount}`)
      console.log(`  Private/raw leak findings: ${summary.privateOrRawLeakFindings}`)
      console.log(`  Readiness still names SYNTHESIS-VERIFY-001: ${summary.readinessStillNamesSynthesisVerify ? 'yes' : 'no'}`)
      console.log('')
      for (const [key, value] of Object.entries(synthetic.cases)) {
        console.log(`FIXTURE ${key} status=${value.status} reason=${value.blockedReasons?.[0] || value.confidenceReason}`)
      }
      for (const blocked of report.blocked.slice(0, 12)) {
        console.log(`BLOCKED ${blocked.surface} ${blocked.recordId} status=${blocked.status} reason=${blocked.blockedReasons?.[0] || blocked.confidenceReason}`)
      }
    } else {
      console.log(JSON.stringify({
        summary,
        counts: report.counts,
        synthetic: {
          pass: synthetic.pass,
          cases: Object.fromEntries(Object.entries(synthetic.cases).map(([key, value]) => [key, {
            status: value.status,
            supportLevel: value.supportLevel,
            confidenceReason: value.confidenceReason,
            blockedReasons: value.blockedReasons,
            claimTextHash: value.claimTextHash,
          }])),
        },
      }, null, 2))
    }
    console.log(`${SYNTHESIS_VERIFY_SUMMARY_MARKER} ${JSON.stringify(summary)}`)

    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
