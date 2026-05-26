#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SPRINT_ID,
  buildBuildIntelExtractionImplementationSnapshot,
  renderBuildIntelExtractionReport,
} from '../lib/build-intel-extraction-implementation.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-db.js'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const args = new Set(process.argv.slice(2))
const json = args.has('--json')
const noWrite = args.has('--no-write')
const writeReport = isProcessReportWriteRequested(process.argv.slice(2)) && !noWrite

function laneCounts(backlogItems = []) {
  return backlogItems.reduce((acc, item) => {
    const key = `${item.lane || 'unknown'}:${item.priority || 'unknown'}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function check(ok, name, detail = '') {
  return { ok: Boolean(ok), name, detail }
}

async function main() {
  const before = await getFoundationSnapshot()
  const activeSprint = await getActiveFoundationCurrentSprint()
  const transcriptContexts = await searchSharedCommunicationArtifactsForContext({
    query: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
    sourceIds: ['SRC-YOUTUBE-INTEL-001'],
    artifactTypes: ['video_transcript'],
    limit: 10,
    excerptChars: 1800,
  })
  const snapshot = buildBuildIntelExtractionImplementationSnapshot({
    transcriptContexts,
    backlogItems: before.backlogItems || [],
    currentSprint: activeSprint,
  })
  const report = renderBuildIntelExtractionReport(snapshot)
  if (writeReport) {
    await fs.writeFile(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH, report)
  }
  const after = await getFoundationSnapshot()
  const beforeCounts = laneCounts(before.backlogItems || [])
  const afterCounts = laneCounts(after.backlogItems || [])

  const approvalResults = []
  for (const cardId of BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS) {
    approvalResults.push(await validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: `docs/process/approvals/${cardId}.json`,
      cardId,
    }))
  }

  const activeItems = activeSprint.items || []
  const checks = [
    check(
      activeSprint.sprint?.sprintId === BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SPRINT_ID,
      'active sprint is Build Intel Extraction Implementation',
      activeSprint.sprint?.sprintId || 'missing',
    ),
    check(
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS.every(cardId => activeItems.some(item => item.cardId === cardId)),
      'all sprint cards are present in Current Sprint',
      `${activeItems.length} active sprint items`,
    ),
    check(
      approvalResults.every(result => result.ok),
      'all plan approval files validate',
      approvalResults.filter(result => !result.ok).map(result => result.approvalRef).join(', ') || 'all valid',
    ),
    check(
      snapshot.status === 'ready',
      'Build Intel extraction snapshot is ready',
      snapshot.status,
    ),
    check(
      snapshot.selectedTranscriptArtifacts >= 1,
      'at least one real public transcript artifact selected',
      `${snapshot.selectedTranscriptArtifacts} selected / ${snapshot.transcriptContextsConsidered} considered`,
    ),
    check(
      snapshot.selectedInputs.some(input => input.artifactId === 'SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys'),
      'manual-priority AI Team Setup transcript is selected',
      snapshot.selectedInputs.map(input => input.artifactId).join(', '),
    ),
    check(
      snapshot.observations.length >= 3,
      'implementation observations extracted',
      `${snapshot.observations.length} observations`,
    ),
    check(
      snapshot.multimodalEnvelopes.every(envelope => envelope.validation?.ok === true),
      'multimodal envelopes validate',
      snapshot.multimodalEnvelopes.flatMap(envelope => envelope.validation?.findings || []).join(', ') || 'all valid',
    ),
    check(
      snapshot.multimodalEnvelopes.every(envelope => envelope.evidenceLevels?.includes('transcript_text') && envelope.visualEvidenceStatus === 'not_captured_v1'),
      'visual evidence is honestly marked not captured in V1',
      `screenshots=${snapshot.screenshotsCaptured} keyframes=${snapshot.keyFramesCaptured}`,
    ),
    check(
      snapshot.researchInboxRows.length >= 3 &&
        snapshot.researchInboxRows.every(row =>
          row.validation?.ok === true &&
          row.promotionProposal?.proposalOnly === true &&
          row.promotionProposal?.writesBacklog === false &&
          row.item?.autoCreateBacklogCard === false
        ),
      'Research Inbox proposal rows validate and do not write backlog',
      `${snapshot.researchInboxRows.length} proposal rows`,
    ),
    check(
      snapshot.researchInboxProposals.enrichExistingCount >= 1,
      'at least one proposal enriches existing cards',
      `${snapshot.researchInboxProposals.enrichExistingCount} enrich-existing proposals`,
    ),
    check(
      snapshot.paidAuthUsed === false &&
        snapshot.newExternalCrawlStarted === false &&
        snapshot.publicWebSearchStarted === false &&
        snapshot.atomsCreated === 0 &&
        snapshot.writesBacklog === false,
      'no auth, crawl, atom creation, or backlog write side effects',
      `paidAuth=${snapshot.paidAuthUsed} crawl=${snapshot.newExternalCrawlStarted} atoms=${snapshot.atomsCreated} writesBacklog=${snapshot.writesBacklog}`,
    ),
    check(
      sameJson(beforeCounts, afterCounts),
      'backlog lane counts unchanged by proposal generation',
      `before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`,
    ),
    check(
      !writeReport || report.includes(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY),
      'generated report includes closeout key',
      BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
    ),
    check(
      snapshot.brief?.nextRecommendedSprint === 'Build Intel Extraction Expansion Sprint',
      'brief names next sprint explicitly',
      snapshot.brief?.nextRecommendedSprint || 'missing',
    ),
  ]

  const ok = checks.every(item => item.ok)
  const result = {
    ok,
    status: ok ? 'healthy' : 'failed',
    closeoutKey: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
    reportPath: writeReport ? BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH : null,
    selectedTranscriptArtifacts: snapshot.selectedTranscriptArtifacts,
    observations: snapshot.observations.length,
    proposalRows: snapshot.researchInboxRows.length,
    enrichExistingCount: snapshot.researchInboxProposals.enrichExistingCount,
    checks,
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${result.status}: Build Intel extraction implementation`)
    for (const item of checks) {
      console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name} - ${item.detail}`)
    }
  }

  await closeFoundationDb()
  if (!ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
