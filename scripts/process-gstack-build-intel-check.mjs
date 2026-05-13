#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GSTACK_BUILD_INTEL_CARD_IDS,
  GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_LOCAL_MIRROR,
  GSTACK_BUILD_INTEL_REPORT_PATH,
  GSTACK_BUILD_INTEL_SCRIPT_PATH,
  GSTACK_BUILD_INTEL_SOURCE_ID,
  GSTACK_BUILD_INTEL_SPRINT_ID,
  buildGStackBuildIntelSnapshot,
  renderGStackBuildIntelReport,
} from '../lib/gstack-build-intel.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, noWrite: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-write') args.noWrite = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

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

function requestedCardIds(args) {
  if (!args.card) return GSTACK_BUILD_INTEL_CARD_IDS
  if (!GSTACK_BUILD_INTEL_CARD_IDS.includes(args.card)) {
    throw new Error(`Unknown GStack Build Intel card: ${args.card}`)
  }
  return [args.card]
}

async function validateApprovals(findings, cardIds) {
  for (const cardId of cardIds) {
    const approvalRef = `docs/process/approvals/${cardId}.json`
    const validation = await validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
    addFinding(
      findings,
      validation.ok && Number(validation.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      validation.failures?.map(item => item.check).join(', ') || approvalRef,
    )
  }
}

async function main() {
  const args = parseArgs()
  const cardIds = requestedCardIds(args)
  const findings = []

  const before = await getFoundationSnapshot()
  const beforeCounts = laneCounts(before.backlogItems || [])
  const activeSprint = await getActiveFoundationCurrentSprint()
  await validateApprovals(findings, cardIds)

  const snapshot = await buildGStackBuildIntelSnapshot({
    repoRoot: GSTACK_BUILD_INTEL_LOCAL_MIRROR,
  })
  const report = renderGStackBuildIntelReport(snapshot)
  if (!args.noWrite) {
    await fs.writeFile(path.join(repoRoot, GSTACK_BUILD_INTEL_REPORT_PATH), report)
  }
  const after = await getFoundationSnapshot()
  const afterCounts = laneCounts(after.backlogItems || [])
  const activeItems = activeSprint.items || []
  const planRuns = activeSprint.planCriticRuns || []
  const scorecardIds = new Set((snapshot.patternScorecard || []).map(pattern => pattern.patternId))
  const sourceCounts = snapshot.sourceMap?.categoryCounts || {}
  const inboxRows = snapshot.researchInboxRows || []
  const sourceIds = new Set((snapshot.publicDeveloperCommunityWatchlist?.sources || []).map(source => source.sourceId))

  addFinding(findings, activeSprint.sprint?.sprintId === GSTACK_BUILD_INTEL_SPRINT_ID, 'Current Sprint is GStack Build Intel Extraction', activeSprint.sprint?.sprintId || 'missing')
  addFinding(findings, GSTACK_BUILD_INTEL_CARD_IDS.every(cardId => activeItems.some(item => item.cardId === cardId)), 'all six sprint cards are present in Current Sprint', `${activeItems.length} active items`)
  addFinding(findings, cardIds.every(cardId => planRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)), 'requested cards have Plan Critic pass rows', cardIds.join(', '))
  addFinding(findings, snapshot.status === 'ready', 'GStack snapshot is ready', snapshot.status)
  addFinding(findings, snapshot.sourceCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT, 'GStack source commit matches inspected packet commit', snapshot.sourceCommit || 'missing')
  addFinding(findings, snapshot.sourceMap?.fileCount >= 100 && snapshot.sourceMap?.skillFileCount >= 20, 'source map inventories repo and skill files', `files=${snapshot.sourceMap?.fileCount || 0} skills=${snapshot.sourceMap?.skillFileCount || 0}`)
  addFinding(findings, sourceCounts.frontend_design >= 10 && sourceCounts.browser_qa >= 10 && sourceCounts.review_gates >= 5, 'source map captures frontend, browser QA, and review-gate surfaces', JSON.stringify(sourceCounts))
  addFinding(findings, ['skill_improver_operating_rules', 'review_gate_checklists', 'browser_qa_proof_loop', 'frontend_design_pipeline', 'public_github_monitoring'].every(id => scorecardIds.has(id)), 'scorecard includes high-value AIOS patterns', Array.from(scorecardIds).join(', '))
  addFinding(findings, snapshot.patternScorecard?.every(pattern => pattern.evidenceHitCount >= 1 && pattern.proposalOnly === true && pattern.writesBacklog === false), 'every scorecard row has path evidence and remains proposal-only', `${snapshot.patternScorecard?.length || 0} patterns`)
  addFinding(findings, [GSTACK_BUILD_INTEL_SOURCE_ID, 'SRC-CODEX-COMMUNITY-BUILD-INTEL-001', 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001', 'SRC-OPENCLAW-COMMUNITY-BUILD-INTEL-001'].every(id => sourceIds.has(id)), 'public dev-community watchlist includes GitHub, Codex, Claude Code, and OpenClaw sources', Array.from(sourceIds).join(', '))
  addFinding(findings, snapshot.publicDeveloperCommunityWatchlist?.noPrivateScraping === true && snapshot.publicDeveloperCommunityWatchlist?.noAutoBacklogMutation === true, 'public dev-community watchlist blocks private scraping and auto backlog mutation', 'proposal-only public sources')
  addFinding(findings, inboxRows.length >= 5 && inboxRows.every(row => row.validation?.ok === true && row.promotionProposal?.proposalOnly === true && row.promotionProposal?.writesBacklog === false && row.item?.autoCreateBacklogCard === false), 'Research Inbox rows validate and do not write backlog', `${inboxRows.length} rows`)
  addFinding(findings, snapshot.researchInboxProposals?.enrichExistingCount >= 3 && snapshot.researchInboxProposals?.proposeNewCardCount >= 1, 'proposals enrich existing cards before suggesting new cards', `enrich=${snapshot.researchInboxProposals?.enrichExistingCount || 0} new=${snapshot.researchInboxProposals?.proposeNewCardCount || 0}`)
  addFinding(findings, snapshot.skillImproverEnrichment?.writesSkills === false && snapshot.skillImproverEnrichment?.defaultToCode === true, 'skill improver enrichment preserves code-first boundary', snapshot.skillImproverEnrichment?.cardId || 'missing')
  addFinding(findings, snapshot.reviewGateUpgrade?.gatesAsCodeFirst === true && snapshot.reviewGateUpgrade?.newAgentRequired === false, 'review gate upgrade uses checklists/proof before new agents', snapshot.reviewGateUpgrade?.cardId || 'missing')
  addFinding(findings, snapshot.browserQaProof?.minimumProof?.length >= 4 && snapshot.browserQaProof?.notRequiredWhen?.length >= 2, 'browser QA proof standard is scoped to frontend work', snapshot.browserQaProof?.cardId || 'missing')
  addFinding(findings, snapshot.codeImported === false && snapshot.installStarted === false && snapshot.privateScrapeStarted === false && snapshot.paidAuthUsed === false && snapshot.autonomousDevEnabled === false, 'no code import, install, private scraping, paid auth, or autonomous dev side effects', `import=${snapshot.codeImported} install=${snapshot.installStarted}`)
  addFinding(findings, sameJson(beforeCounts, afterCounts), 'backlog lane counts unchanged by GStack proposal generation', `before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`)
  addFinding(findings, args.noWrite || report.includes(GSTACK_BUILD_INTEL_CLOSEOUT_KEY), 'generated report includes closeout key', GSTACK_BUILD_INTEL_REPORT_PATH)
  addFinding(findings, args.noWrite || report.includes('Do not copy GStack skills wholesale'), 'generated report names rejected patterns', GSTACK_BUILD_INTEL_REPORT_PATH)

  const failures = findings.filter(finding => !finding.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    closeoutKey: GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
    scriptPath: GSTACK_BUILD_INTEL_SCRIPT_PATH,
    reportPath: args.noWrite ? null : GSTACK_BUILD_INTEL_REPORT_PATH,
    requestedCards: cardIds,
    summary: {
      sourceCommit: snapshot.sourceCommit,
      files: snapshot.sourceMap?.fileCount || 0,
      skills: snapshot.sourceMap?.skillFileCount || 0,
      patterns: snapshot.patternScorecard?.length || 0,
      proposals: inboxRows.length,
      enrichExisting: snapshot.researchInboxProposals?.enrichExistingCount || 0,
    },
    findings: failures,
    checks: findings,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`GStack Build Intel check: ${result.status}`)
    for (const finding of findings) {
      console.log(`${finding.ok ? 'PASS' : 'FAIL'} ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
