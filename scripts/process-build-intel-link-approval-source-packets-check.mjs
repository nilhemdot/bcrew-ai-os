#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH,
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_SCRIPT_PATH,
  buildLinkApprovalSourcePacketQueue,
  buildLinkApprovalSourcePacketsDogfoodProof,
} from '../lib/build-intel-link-approval-source-packets.js'
import {
  closeFoundationDb,
  getFoundationSnapshot,
  getIntelligenceReportBundle,
} from '../lib/foundation-db.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from '../lib/youtube-latest-20-full-watch-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function reportId(item = {}) {
  return item.reportArtifactId || item.report_artifact_id || ''
}

function reportUpdatedAt(item = {}) {
  return item.updatedAt || item.updated_at || item.createdAt || item.created_at || ''
}

function actionLinksFromReport(report = {}) {
  return list(report.actionRequiredItems || report.action_required_items)
    .filter(item => item.type === 'approval_required_resource_link' || item.requiresSteveReview === true)
    .map(item => ({
      url: item.url || '',
      host: item.host || '',
      sourceVideoId: item.sourceVideoId || '',
      sourceUrl: item.sourceUrl || '',
      reason: item.reason || item.blocker || 'Needs source-packet review before the system reads this link.',
      reportArtifactId: report.reportArtifactId || report.report_artifact_id || '',
    }))
}

async function loadLiveApprovalLinks() {
  const foundationSnapshot = await getFoundationSnapshot()
  const recentReportIds = list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .filter(item => isYoutubeLatest20FullWatchReportId(reportId(item)) || reportId(item) === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID)
    .sort((left, right) => text(reportUpdatedAt(right)).localeCompare(text(reportUpdatedAt(left))))
    .map(reportId)
    .filter(Boolean)
  const selectedReportIds = Array.from(new Set(recentReportIds)).slice(0, 4)
  const bundles = []
  for (const selectedReportId of selectedReportIds) {
    const bundle = await getIntelligenceReportBundle(selectedReportId, { atomLimit: 20, hitLimit: 40 })
    if (bundle?.report) bundles.push(bundle)
  }
  return bundles.flatMap(bundle => actionLinksFromReport(bundle.report))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, planSource, moduleSource, scriptSource, dogfood, liveLinks] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH),
    readRepoFile('lib/build-intel-link-approval-source-packets.js'),
    readRepoFile(BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_SCRIPT_PATH),
    buildLinkApprovalSourcePacketsDogfoodProof(),
    loadLiveApprovalLinks(),
  ])

  const liveQueue = buildLinkApprovalSourcePacketQueue(liveLinks)
  const livePackets = liveQueue.map(item => item.sourcePacketPreview)
  const validationFailures = liveQueue.filter(item => !item.sourcePacketValidation?.ok)

  addCheck(
    checks,
    packageJson.scripts?.['process:build-intel-link-approval-source-packets-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_SCRIPT_PATH}`,
    'package exposes source-packet approval proof',
    packageJson.scripts?.['process:build-intel-link-approval-source-packets-check'] || 'missing',
  )
  addCheck(checks, /record_source_packet_only_no_crawl/.test(moduleSource) && /startsCrawler: false/.test(moduleSource), 'module blocks crawl-on-approval', 'lib/build-intel-link-approval-source-packets.js')
  addCheck(checks, /Free\/public Skool is not treated the same as paid\/private Skool/i.test(planSource), 'plan distinguishes free/public and paid/private Skool', BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH)
  addCheck(checks, /Do not start a worker from the approval action/i.test(planSource), 'plan states approval does not start a worker', BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH)
  addCheck(checks, /loadLiveApprovalLinks/.test(scriptSource) && !/fetch\(/.test(scriptSource), 'proof reads live records without browsing external links', BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_SCRIPT_PATH)
  addCheck(checks, dogfood.ok, 'dogfood covers GitHub, Skool, paid/private, short-link, social, and bad broad approvals', JSON.stringify(dogfood.cases.map(item => ({ name: item.name, ok: item.ok }))))
  addCheck(checks, liveLinks.length >= 1, 'live reports expose approval-required links', `${liveLinks.length}`)
  addCheck(checks, livePackets.every(packet => packet.startsCrawler === false && packet.externalWrites === false && packet.writesBacklog === false), 'live source packet previews are no-crawl/no-write', `${livePackets.length}`)
  addCheck(checks, validationFailures.length === 0, 'live source packet previews validate required boundaries', validationFailures.map(item => item.url).join(', ') || 'ok')
  addCheck(checks, livePackets.some(packet => packet.sourceFamily === 'skool' || packet.proposedDecision === 'hold_paid_private' || packet.proposedDecision === 'manual_source_packet'), 'live queue includes real source-packet review boundaries', livePackets.map(packet => `${packet.sourceFamily}:${packet.proposedDecision}`).slice(0, 8).join(', '))

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
    reportOnly: true,
    startsCrawler: false,
    writesBacklog: false,
    writesExternalSystems: false,
    liveApprovalLinkCount: liveLinks.length,
    samplePackets: livePackets.slice(0, 6),
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Build Intel Link Approval Source Packets check: ${output.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
