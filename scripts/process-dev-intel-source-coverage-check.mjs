#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  DEV_INTEL_SOURCE_COVERAGE_APPROVAL_PATH,
  DEV_INTEL_SOURCE_COVERAGE_CARD_ID,
  DEV_INTEL_SOURCE_COVERAGE_PLAN_PATH,
  DEV_INTEL_SOURCE_COVERAGE_SCRIPT_PATH,
  DEV_INTEL_SOURCE_FAMILY_STATUS,
  buildDevIntelSourceCoverageDogfoodProof,
  buildDevIntelSourceCoverageSnapshot,
} from '../lib/dev-intel-source-coverage.js'
import { DEV_SOURCE_SLICE_ROUTER_CARD_ID } from '../lib/dev-source-slice-router.js'
import { YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID } from '../lib/youtube-resource-link-resolver.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function rowById(snapshot, familyId) {
  return snapshot.rows.find(row => row.familyId === familyId) || null
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    planSource,
    sourceCoverageSource,
    approvalValidation,
    dogfood,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(DEV_INTEL_SOURCE_COVERAGE_PLAN_PATH),
    readRepoFile('lib/dev-intel-source-coverage.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: DEV_INTEL_SOURCE_COVERAGE_APPROVAL_PATH,
      cardId: DEV_INTEL_SOURCE_COVERAGE_CARD_ID,
    }),
    buildDevIntelSourceCoverageDogfoodProof(),
  ])

  const snapshot = buildDevIntelSourceCoverageSnapshot()
  const youtube = rowById(snapshot, 'youtube-public-build-intel')
  const youtubeLinks = rowById(snapshot, 'youtube-resource-links')
  const creatorStack = rowById(snapshot, 'creator-source-stack')
  const newsletters = rowById(snapshot, 'creator-newsletters')
  const sharedComms = rowById(snapshot, 'shared-internal-comms')
  const skoolFree = rowById(snapshot, 'skool-free-communities')
  const skool = rowById(snapshot, 'skool-paid-communities')
  const paidTraining = rowById(snapshot, 'paid-course-training-platforms')
  const github = rowById(snapshot, 'github-public-repos')

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || DEV_INTEL_SOURCE_COVERAGE_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:dev-intel-source-coverage-check'] === 'node --env-file-if-exists=.env scripts/process-dev-intel-source-coverage-check.mjs', 'package exposes focused source-coverage proof', packageJson.scripts?.['process:dev-intel-source-coverage-check'] || 'missing')
  addCheck(checks, /Foundation owns the shared source pond/i.test(planSource) && /Dev reads the system-building slice/i.test(planSource), 'plan keeps Foundation source pond and Dev slice boundary explicit', DEV_INTEL_SOURCE_COVERAGE_PLAN_PATH)
  addCheck(checks, /Steve should not manually chase/i.test(sourceCoverageSource), 'YouTube links are resolver/scoper work, not Steve homework', 'lib/dev-intel-source-coverage.js')
  addCheck(checks, snapshot.ok === true, 'source coverage snapshot is healthy', snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status)
  addCheck(checks, snapshot.proposalOnly === true && snapshot.externalWrites === false, 'source coverage snapshot is read-only/proposal-only', `${snapshot.proposalOnly}/${snapshot.externalWrites}`)
  addCheck(checks, dogfood.ok === true, 'dogfood proves active, blocked, and planned source-family handling', JSON.stringify(dogfood.cases))
  addCheck(checks, youtube?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.active && youtube?.feedsDev === true, 'public YouTube build intel actively feeds Dev', youtube?.feedPath || 'missing')
  addCheck(checks, youtubeLinks?.currentProof.includes(YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID) && /Scoper/i.test(youtubeLinks?.nextAction || ''), 'YouTube resource links route into resolver and Scoper', youtubeLinks?.nextAction || 'missing')
  addCheck(checks, creatorStack?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned && /newsletter/i.test(creatorStack?.nextAction || '') && /Skool/i.test(creatorStack?.nextAction || ''), 'creator source stack is visible across source surfaces', creatorStack?.nextAction || 'missing')
  addCheck(checks, newsletters?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned && /AIOS Sources\/Newsletters/.test(newsletters?.nextAction || ''), 'newsletter source lane is visible with mailbox routing', newsletters?.nextAction || 'missing')
  addCheck(checks, sharedComms?.currentProof.includes(DEV_SOURCE_SLICE_ROUTER_CARD_ID) && sharedComms?.feedsDev === true, 'shared comms feed Dev through source-slice router', sharedComms?.feedPath || 'missing')
  addCheck(checks, skoolFree?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned && /last 20 days/i.test(skoolFree?.nextAction || '') && /paid\/private/i.test(skoolFree?.nextAction || ''), 'free Skool/community lane is visible separately from paid Skool blockers', skoolFree?.nextAction || 'missing')
  addCheck(checks, skool?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked && Boolean(skool?.blocker) && Boolean(skool?.nextCard), 'Skool is visible but blocked pending source packet', skool?.blocker || 'missing')
  addCheck(checks, paidTraining?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked && Boolean(paidTraining?.blocker) && Boolean(paidTraining?.nextCard) && /not its own source-family tag/i.test(paidTraining?.nextAction || ''), 'paid course/training platforms are visible without making MyICOR its own tag', paidTraining?.nextAction || 'missing')
  addCheck(checks, github?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned && Boolean(github?.nextCard), 'GitHub/repos are planned with a next card before repo import', github?.nextCard || 'missing')
  addCheck(checks, snapshot.rows.some(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked) && snapshot.rows.some(row => row.feedsDev), 'blocked private sources do not block active approved sources', `${snapshot.counts.blocked} blocked / ${snapshot.counts.feedsDev} feeding Dev`)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: DEV_INTEL_SOURCE_COVERAGE_CARD_ID,
    checks,
    failures,
    snapshot: {
      status: snapshot.status,
      counts: snapshot.counts,
      rows: snapshot.rows.map(row => ({
        familyId: row.familyId,
        label: row.label,
        status: row.status,
        feedsDev: row.feedsDev,
        sourceIds: row.sourceIds,
        nextCard: row.nextCard,
        blocker: row.blocker,
      })),
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Dev Intel Source Coverage check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
