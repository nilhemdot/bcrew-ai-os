#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  GOD_MODE_EXTRACTOR_BACKLOG_UPDATE,
  GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID,
  GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_PLAN_PATH,
  GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_SCRIPT_PATH,
  YOUTUBE_GOD_MODE_CATCHUP_BACKLOG_UPDATE,
  buildGodModeExtractorSystemContractDogfoodProof,
  buildGodModeExtractorSystemContractSnapshot,
  evaluateGodModeExtractorSystemContract,
} from '../lib/god-mode-extractor-system-contract.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
} from '../lib/youtube-creator-god-mode-catchup.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    }),
  }
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function includesPattern(source = '', pattern) {
  return pattern.test(String(source || ''))
}

async function applyBacklogStab() {
  await updateBacklogItem(GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID, GOD_MODE_EXTRACTOR_BACKLOG_UPDATE, 'codex-god-mode-extractor-stab')
  await updateBacklogItem(YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID, YOUTUBE_GOD_MODE_CATCHUP_BACKLOG_UPDATE, 'codex-god-mode-extractor-stab')
}

function liveParentIsStabbed(item = {}) {
  const haystack = [
    item.title,
    item.lane,
    item.priority,
    item.summary,
    item.whyItMatters,
    item.nextAction,
    item.statusNote,
  ].join(' ')
  return item.id === GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID &&
    item.lane === 'scoped' &&
    item.priority === 'P0' &&
    includesAll(haystack, [
      'creator source stack',
      'newsletters',
      'source-family SOPs',
      'metadata',
      'latest 10',
      'free resources',
      'free Skool/community',
      'paid gates',
      'morning autopilot',
      'No video-only catch-up may claim full God Mode',
    ])
}

function liveYoutubeIsBlockedFromVideoOnly(item = {}) {
  const haystack = [
    item.summary,
    item.nextAction,
    item.statusNote,
  ].join(' ')
  return item.id === YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID &&
    item.lane !== 'done' &&
    includesAll(haystack, [
      'metadata triage',
      'latest-10 baseline',
      'whole page/description extraction',
      'newsletter signup/monitoring status',
      'free-resource capture',
      'free-community',
      'paid-gate value evaluation',
      'creator source-stack',
      'morning autopilot',
      'A watched video is not complete God Mode by itself',
    ])
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    packageJson,
    parentPlanSource,
    youtubePlanSource,
    contractModuleSource,
    scriptSource,
    backlogSeedSource,
    currentPlanSource,
    currentStateSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_PLAN_PATH),
    readRepoFile('docs/process/youtube-creator-god-mode-catchup-001-plan.md'),
    readRepoFile('lib/god-mode-extractor-system-contract.js'),
    readRepoFile(GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_SCRIPT_PATH),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  await initFoundationDb()
  let liveItems = []
  try {
    if (args.apply) await applyBacklogStab()
    liveItems = await getBacklogItemsByIds([
      GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID,
      YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
    ])
  } finally {
    await closeFoundationDb()
  }

  const liveParent = liveItems.find(item => item.id === GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID) || {}
  const liveYoutube = liveItems.find(item => item.id === YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID) || {}
  const snapshot = buildGodModeExtractorSystemContractSnapshot()
  const evaluation = evaluateGodModeExtractorSystemContract(snapshot)
  const dogfood = buildGodModeExtractorSystemContractDogfoodProof()
  const currentDocs = `${currentPlanSource}\n${currentStateSource}`

  addCheck(
    checks,
    packageJson.scripts?.['process:god-mode-extractor-system-contract-check'] === `node --env-file-if-exists=.env ${GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_SCRIPT_PATH}`,
    'package exposes focused God Mode extractor system contract proof',
    packageJson.scripts?.['process:god-mode-extractor-system-contract-check'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'contract snapshot contains parent runtime and required source-family SOPs',
    evaluation.findings.map(item => `${item.check}:${item.detail}`).join(', ') || 'ok',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood fails video-only, missing Hands, and unsafe extraction/provider/external-write variants',
    JSON.stringify(dogfood.cases),
  )
  addCheck(
    checks,
    includesAll(parentPlanSource, [
      'The system starts by reviewing all approved creator/source metadata',
      'latest 10 relevant public videos for every approved creator',
      'whole YouTube page',
      'description/resource links',
      'Creator Source Stack SOP',
      'Newsletter Source Lane SOP',
      'AIOS Sources/Newsletters',
      'last 20 days',
      'free Skool/community',
      'paid-gate evaluation',
      'Morning autopilot',
      'Video-only extraction cannot pass any God Mode proof',
      'Skool Free Community SOP',
      'MyICOR Paid Training SOP',
      'GitHub, Docs, And Public Resources SOP',
    ]),
    'parent process plan preserves Steve requirement and source-specific SOPs',
    GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_PLAN_PATH,
  )
  addCheck(
    checks,
    includesAll(youtubePlanSource, [
      'metadata triage',
      'latest 10 relevant public videos',
      'full video/audio/visual',
      'Extract the whole YouTube page',
      'Classify every description/resource link',
      'Capture free value',
      'free Skool/community',
      'paid gate',
      'creator grade update',
      'Morning autopilot',
      'video-only completion fails',
    ]),
    'YouTube catch-up plan is now a source SOP, not a video-only lane',
    'docs/process/youtube-creator-god-mode-catchup-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(contractModuleSource, [
      'GOD_MODE_EXTRACTOR_REQUIRED_CAPABILITIES',
      'GOD_MODE_EXTRACTOR_SOURCE_SOPS',
      'creator_source_stack',
      'youtube_public_creator',
      'creator_newsletters',
      'skool_free_community',
      'skool_paid_or_private',
      'myicor_paid_training',
      'github_docs_public_resources',
      'video_only_youtube_sop_fails',
    ]),
    'contract module encodes source SOPs and video-only rejection',
    'lib/god-mode-extractor-system-contract.js',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID,
      'Build the full God Mode extractor runtime and source SOP system',
      'free Skool/community',
      'paid-gate evaluation',
      'No video-only catch-up may claim full God Mode',
    ]),
    'backlog seed contains the thick parent extractor card',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    liveParentIsStabbed(liveParent),
    'live parent backlog card is P0 scoped and not parked',
    liveParent.id ? `${liveParent.lane}/${liveParent.priority}` : 'missing',
  )
  addCheck(
    checks,
    liveYoutubeIsBlockedFromVideoOnly(liveYoutube),
    'live YouTube catch-up card blocks video-only God Mode completion',
    liveYoutube.id ? liveYoutube.lane : 'missing',
  )
  addCheck(
    checks,
    !includesPattern(currentDocs, /Parked outside this sprint, not deleted:[^\n]*EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001/) &&
      includesAll(currentDocs, [
        '`EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001` - P0',
        'source SOP system',
        'YouTube catch-up cannot mean video-only watching',
      ]),
    'current rebuild docs no longer park the parent extractor requirement',
    'docs/rebuild/current-plan.md + docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    snapshot.reportOnly === true &&
      snapshot.startsExtraction === false &&
      snapshot.callsProvider === false &&
      snapshot.writesExternalSystems === false &&
      snapshot.autoCreatesBacklog === false,
    'contract proof is no-spend and starts no extraction',
    JSON.stringify({
      reportOnly: snapshot.reportOnly,
      startsExtraction: snapshot.startsExtraction,
      callsProvider: snapshot.callsProvider,
      writesExternalSystems: snapshot.writesExternalSystems,
      autoCreatesBacklog: snapshot.autoCreatesBacklog,
    }),
  )
  const forbiddenRuntimeTokens = [
    'live-' + 'gemini-api',
    'run' + 'LiveBatch(',
    'submit' + 'Form(',
    'complete' + 'Purchase(',
    'download' + 'File(',
    'post' + 'Comment(',
    'send' + 'Message(',
  ]
  addCheck(
    checks,
    forbiddenRuntimeTokens.every(token => !scriptSource.includes(token)),
    'focused proof has no provider, purchase, form, download, post/comment/message path',
    forbiddenRuntimeTokens.filter(token => scriptSource.includes(token)).join(', ') || GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_SCRIPT_PATH,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    applied: args.apply,
    cardId: GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID,
    youtubeCardId: YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
    sourceFamilies: snapshot.requiredSourceFamilies,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`God Mode extractor system contract: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
