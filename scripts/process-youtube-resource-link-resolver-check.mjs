#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getIntelligenceReportBundle,
} from '../lib/foundation-db.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from '../lib/youtube-build-intel-link-resource.js'
import {
  YOUTUBE_RESOURCE_LINK_RESOLVER_APPROVAL_PATH,
  YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
  YOUTUBE_RESOURCE_LINK_RESOLVER_PLAN_PATH,
  YOUTUBE_RESOURCE_LINK_RESOLVER_SCRIPT_PATH,
  buildYoutubeResourceLinkResolverDogfoodProof,
  buildYoutubeResourceLinkResolverSnapshot,
  extractYoutubeResourceLinksFromReportBundle,
} from '../lib/youtube-resource-link-resolver.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    liveFetch: argv.includes('--live-fetch') || argv.includes('--live-fetch=true'),
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

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    planSource,
    resolverSource,
    scriptSource,
    approvalValidation,
    dogfood,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(YOUTUBE_RESOURCE_LINK_RESOLVER_PLAN_PATH),
    readRepoFile('lib/youtube-resource-link-resolver.js'),
    readRepoFile(YOUTUBE_RESOURCE_LINK_RESOLVER_SCRIPT_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: YOUTUBE_RESOURCE_LINK_RESOLVER_APPROVAL_PATH,
      cardId: YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
    }),
    buildYoutubeResourceLinkResolverDogfoodProof(),
  ])

  const bundles = []
  for (const reportArtifactId of [
    YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
    MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
  ]) {
    const bundle = await getIntelligenceReportBundle(reportArtifactId, { atomLimit: 40, hitLimit: 80 })
    if (bundle?.report) bundles.push(bundle)
  }
  const liveLinks = bundles.flatMap(bundle => extractYoutubeResourceLinksFromReportBundle(bundle))
  const liveSnapshot = await buildYoutubeResourceLinkResolverSnapshot({
    rawLinks: liveLinks,
    sourceLabel: 'live Foundation YouTube resource reports',
    resolve: args.liveFetch,
    maxResolve: args.liveFetch ? 6 : 0,
  })

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || YOUTUBE_RESOURCE_LINK_RESOLVER_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:youtube-resource-link-resolver-check'] === 'node --env-file-if-exists=.env scripts/process-youtube-resource-link-resolver-check.mjs', 'package exposes resolver proof script', packageJson.scripts?.['process:youtube-resource-link-resolver-check'] || 'missing')
  addCheck(
    checks,
    /safe public/i.test(planSource) &&
      /repo/i.test(planSource) &&
      /docs/i.test(planSource) &&
      /Steve should not (have to )?manually/i.test(planSource),
    'plan states safe public links resolve and Steve is not the manual chaser',
    YOUTUBE_RESOURCE_LINK_RESOLVER_PLAN_PATH,
  )
  addCheck(checks, /resolvePublicResourceLink/.test(resolverSource) && /blocked_short_link/.test(resolverSource) && /blocked_private_or_course_source/.test(resolverSource), 'resolver has public resolution and blocked-source classifications', 'lib/youtube-resource-link-resolver.js')
  addCheck(checks, /externalWrite: false/.test(resolverSource) && /downloadedFile: false/.test(resolverSource) && /submittedForm: false/.test(resolverSource), 'resolver records no write/download/form posture', 'lib/youtube-resource-link-resolver.js')
  addCheck(checks, /--live-fetch/.test(scriptSource), 'script keeps live public fetch explicit', YOUTUBE_RESOURCE_LINK_RESOLVER_SCRIPT_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood proves public resolve, duplicate collapse, blocker reasons, and Scoper packet', JSON.stringify(dogfood.cases))
  addCheck(checks, liveLinks.length >= 1, 'live Foundation reports expose YouTube resource links for resolver', `${liveLinks.length}`)
  addCheck(checks, liveSnapshot.blockedLinks.every(link => link.blocker && link.allowedNextDecision), 'live blocked links have exact blocker and decision copy', `${liveSnapshot.blockedLinks.length}`)
  addCheck(checks, liveSnapshot.scoperPacket.resourceLinkDispositions.length >= Math.min(1, liveLinks.length), 'live resolver emits Scoper-readable resource dispositions', `${liveSnapshot.scoperPacket.resourceLinkDispositions.length}`)
  addCheck(checks, liveSnapshot.externalWrites === false && liveSnapshot.proposalOnly === true, 'live resolver snapshot is proposal-only and no external-write', `${liveSnapshot.proposalOnly}/${liveSnapshot.externalWrites}`)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
    checks,
    failures,
    dogfood: {
      ok: dogfood.ok,
      cases: dogfood.cases,
      counts: dogfood.snapshot?.counts || {},
    },
    liveSnapshot: {
      ok: liveSnapshot.ok,
      status: liveSnapshot.status,
      counts: liveSnapshot.counts,
      liveFetch: args.liveFetch,
      scoperDispositionCount: liveSnapshot.scoperPacket.resourceLinkDispositions.length,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('YouTube Resource Link Resolver check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
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
