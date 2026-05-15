#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MARKETING_VIDEO_LAB_CARD_ID,
  MARKETING_VIDEO_LAB_SCRIPT_PATH,
  MARKETING_VIDEO_LAB_SUMMARY_MARKER,
  buildMarketingVideoDryRunJob,
  buildSyntheticMarketingVideoAssets,
  buildSyntheticMarketingVideoLabProof,
  validateMarketingVideoAssets,
} from '../lib/marketing-video-lab.js'
import {
  MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  compileMarketingVideoPrompt,
} from '../lib/marketing-video-prompts.js'
import {
  buildFalVeoPayload,
  buildGoogleVeoPayload,
  detectMarketingVideoProviderAvailability,
  estimateMarketingVideoCost,
} from '../lib/marketing-video-providers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return argv.reduce((acc, arg) => {
    if (arg === '--json' || arg === '--json=true') acc.json = true
    if (arg === '--allow-live' || arg === '--allow-live=true') acc.allowLive = true
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) acc[match[1]] = match[2]
    return acc
  }, { json: false, allowLive: false })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    labSource,
    promptSource,
    providerSource,
    scriptSource,
    planSource,
  ] = await Promise.all([
    readRepoFile('lib/marketing-video-lab.js'),
    readRepoFile('lib/marketing-video-prompts.js'),
    readRepoFile('lib/marketing-video-providers.js'),
    readRepoFile(MARKETING_VIDEO_LAB_SCRIPT_PATH),
    readRepoFile('docs/process/marketing-video-lab-001-plan.md'),
  ])

  const assets = buildSyntheticMarketingVideoAssets()
  const validation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets,
  })
  const missingSoldSign = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: assets.filter(asset => asset.role !== 'sold_sign'),
  })
  const rejectedAsset = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: assets.map(asset => asset.role === 'mascot' ? { ...asset, rightsStatus: 'rejected' } : asset),
  })
  const prompt = compileMarketingVideoPrompt({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets,
  })
  const dryRun = buildMarketingVideoDryRunJob({ assets })
  const googlePayload = dryRun.payloads.find(payload => payload.provider === 'google-veo')
  const falPayload = dryRun.payloads.find(payload => payload.provider === 'fal-veo')
  const googleFastCost = estimateMarketingVideoCost({
    provider: 'google-veo',
    modelKey: 'fast',
    resolution: '720p',
    durationSeconds: 8,
  })
  const falFastCost = estimateMarketingVideoCost({
    provider: 'fal-veo',
    modelKey: 'fast',
    resolution: '720p',
    durationSeconds: 8,
    generateAudio: false,
  })
  const availability = detectMarketingVideoProviderAvailability({
    GOOGLE_AI_API_KEY: 'redacted',
    FAL_KEY: 'redacted',
  })
  const syntheticProof = buildSyntheticMarketingVideoLabProof()
  const directGooglePayload = buildGoogleVeoPayload({
    compiledPrompt: prompt.compiledPrompt,
    assets,
    modelKey: 'fast',
  })
  const directFalPayload = buildFalVeoPayload({
    compiledPrompt: prompt.compiledPrompt,
    assets,
    modelKey: 'fast',
    generateAudio: false,
  })

  addCheck(checks, args.allowLive === false, 'live generation flag is not enabled', args.allowLive ? '--allow-live is outside Phase 1 scope' : 'no live flag')
  addCheck(checks, planSource.includes('Phase 1 dry-run core') || planSource.includes('Phase 1: Dry-Run Tool'), 'plan preserves Phase 1 dry-run scope')
  addCheck(checks, validation.ok, 'synthetic sold-sign assets validate', JSON.stringify(validation.findings))
  addCheck(checks, missingSoldSign.ok === false && missingSoldSign.findings.some(finding => finding.key === 'template_required_role_missing'), 'missing sold_sign asset fails validation')
  addCheck(checks, rejectedAsset.ok === false && rejectedAsset.findings.some(finding => finding.key === 'asset_rejected'), 'rejected asset fails validation')
  addCheck(checks, prompt.compiledPrompt.includes('mascot walks into frame') && prompt.compiledPrompt.includes('Brand guardrails') && prompt.compiledPrompt.includes('Avoid:'), 'prompt compiler includes action, brand guardrails, and negative guidance')
  addCheck(checks, googlePayload?.body?.instances?.[0]?.referenceImages?.length === 3, 'Google payload has three reference images', String(googlePayload?.body?.instances?.[0]?.referenceImages?.length || 0))
  addCheck(checks, googlePayload?.body?.parameters?.aspectRatio === '9:16' && googlePayload?.body?.parameters?.durationSeconds === '8', 'Google payload sets 9:16 and 8s parameters', JSON.stringify(googlePayload?.body?.parameters || {}))
  addCheck(checks, directGooglePayload.endpoint.includes(':predictLongRunning') && directGooglePayload.spendRisk.includes('dry-run'), 'Google payload is long-running dry-run payload only')
  addCheck(checks, falPayload?.input?.image_urls?.length === 3, 'FAL payload has three image_urls', String(falPayload?.input?.image_urls?.length || 0))
  addCheck(checks, falPayload?.input?.aspect_ratio === '9:16' && falPayload?.input?.duration === '8s' && falPayload?.input?.generate_audio === false, 'FAL payload sets 9:16, 8s, and audio off', JSON.stringify(falPayload?.input || {}))
  addCheck(checks, directFalPayload.spendRisk.includes('dry-run'), 'FAL payload is dry-run payload only')
  addCheck(checks, googleFastCost.estimatedCostUsd === 0.8 && falFastCost.estimatedCostUsd === 0.8, 'cost estimator returns expected 8s fast 720p draft estimates', JSON.stringify({ google: googleFastCost, fal: falFastCost }))
  addCheck(checks, availability.googleVeo.configured && availability.falVeo.configured && availability.googleVeo.secretExposed === false && availability.falVeo.secretExposed === false, 'credential detection reports presence without exposing secrets')
  addCheck(checks, dryRun.ok && dryRun.liveGenerationEnabled === false && dryRun.providerSpendUsd === 0, 'dry-run job is no-spend and live-disabled', JSON.stringify(dryRun.summary || dryRun.status))
  addCheck(checks, syntheticProof.ok && syntheticProof.lifecycle.blockedExportReadyWithoutOutput, 'synthetic proof covers mock lifecycle and blocks export-ready without output')
  addCheck(checks, includesAll(labSource, [
    'buildMarketingVideoDryRunJob',
    'buildSyntheticMarketingVideoLabProof',
    'providerSpendUsd: 0',
    'liveGenerationEnabled: false',
  ]), 'core lab module owns dry-run and no-spend proof')
  addCheck(checks, includesAll(promptSource, [
    MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    'compileMarketingVideoPrompt',
    'Brand guardrails',
  ]), 'prompt module owns sold-sign template and compiler')
  addCheck(checks, includesAll(providerSource, [
    'buildGoogleVeoPayload',
    'buildFalVeoPayload',
    'estimateMarketingVideoCost',
    'detectMarketingVideoProviderAvailability',
  ]), 'provider module owns payload builders, cost estimate, and credential detection')
  addCheck(checks, scriptSource.includes(MARKETING_VIDEO_LAB_SUMMARY_MARKER), 'focused proof emits summary marker')
  addCheck(checks, MARKETING_VIDEO_LAB_CARD_ID === 'MARKETING-VIDEO-LAB-001', 'card ID is stable')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: MARKETING_VIDEO_LAB_CARD_ID,
    liveGenerationAttempted: false,
    providerSpendUsd: 0,
    summary: syntheticProof.summary,
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Marketing Video Lab check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`${MARKETING_VIDEO_LAB_SUMMARY_MARKER} ${JSON.stringify(result.summary)}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})

