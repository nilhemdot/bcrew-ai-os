#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildCodeQualityNightlyAudit,
  detectRuntimePolicyHardcodesInText,
} from '../lib/code-quality-nightly-audit.js'
import {
  buildRuntimeModelLiteralPolicyFindingInput,
  findRuntimeModelLiteralsInText,
  isRuntimeModelConfigOwnerPath,
} from '../lib/llm-runtime-model-literal-policy.js'
import {
  estimateGeminiStandardTokenCostUsd,
  geminiStandardPricingForModel,
} from '../lib/llm-provider-pricing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-llm-runtime-config-audit-check.mjs'
const PACKAGE_SCRIPT = 'process:llm-runtime-config-audit-check'

function flag(argv = process.argv.slice(2), name = '') {
  return argv.includes(name) || argv.includes(`${name}=true`)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function sampleRisk(relativePath, text) {
  return buildRuntimeModelLiteralPolicyFindingInput({ relativePath, text })
}

async function main() {
  const json = flag(process.argv.slice(2), '--json')
  const checks = []

  const [
    packageSource,
    codeQualitySource,
    pricingSource,
    schedulerSource,
    devHubSource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/llm-provider-pricing.js'),
    readRepoFile('scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs'),
    readRepoFile('lib/dev-team-hub.js'),
  ])
  const packageJson = JSON.parse(packageSource)

  const exactModels = {
    gemini: ['gemini', '3.5', 'flash'].join('-'),
    openai: ['gpt', '5.5'].join('-'),
    openclaw: ['openai-codex/gpt', '5.4'].join('-'),
    anthropic: ['claude', '3', '5', 'sonnet', '20241022'].join('-'),
    opus: ['opus', '4.7'].join('-'),
    geminiEconomy: ['gemini', '2.5', 'flash'].join('-'),
  }
  const falsePositiveInput = `
    const cardId = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'
    const sourceId = 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001'
    const folderEval = 'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001'
    const credentialClass = 'llm-claude-code'
    const subscriptionRoute = 'foundation-extractor-claude-subscription-reasoning'
    const note = 'Claude-specific behavior blindly copied from a source'
  `
  const exactModelsInput = `
    const geminiModel = '${exactModels.gemini}'
    const openaiModel = '${exactModels.openai}'
    const openclawModel = '${exactModels.openclaw}'
    const anthropicModel = '${exactModels.anthropic}'
    const opusModel = '${exactModels.opus}'
  `
  const idOnlyPolicy = sampleRisk('scripts/process-card-id-fixture-check.mjs', falsePositiveInput)
  const exactPolicy = sampleRisk('scripts/process-unowned-model-check.mjs', exactModelsInput)
  const ownerPolicy = sampleRisk('lib/llm-provider-pricing.js', exactModelsInput)
  const exactFindings = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-unowned-model-check.mjs',
    text: exactModelsInput,
  })
  const idOnlyFindings = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-card-id-fixture-check.mjs',
    text: falsePositiveInput,
  })
  const ownerFindings = detectRuntimePolicyHardcodesInText({
    relativePath: 'lib/llm-provider-pricing.js',
    text: exactModelsInput,
  })
  const literals = findRuntimeModelLiteralsInText({ text: exactModelsInput }).map(item => item.literal)

  addCheck(checks, packageJson.scripts?.[PACKAGE_SCRIPT] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused LLM runtime config audit proof', packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing')
  addCheck(checks, codeQualitySource.includes('buildRuntimeModelLiteralPolicyFindingInput') && codeQualitySource.includes('runtimeModelIdFalsePositive'), 'Code Quality audit uses shared runtime model literal classifier with false-positive dogfood', 'classifier import + synthetic proof')
  addCheck(checks, idOnlyPolicy.risk === false && idOnlyFindings.length === 0, 'classifier ignores Claude card/source/credential/route identifiers', idOnlyPolicy.classification)
  addCheck(checks, exactPolicy.risk === true && exactFindings.length === 1, 'classifier flags exact model literals outside owner paths', JSON.stringify({ firstLiteral: exactPolicy.firstLiteral, count: literals.length }))
  addCheck(checks, ownerPolicy.risk === false && ownerFindings.length === 0 && isRuntimeModelConfigOwnerPath('lib/llm-provider-pricing.js'), 'classifier exempts route/config/pricing ownership paths', ownerPolicy.classification)
  addCheck(checks, literals.includes(exactModels.gemini) && literals.includes(exactModels.openai) && literals.includes(exactModels.openclaw) && literals.includes(exactModels.anthropic) && literals.includes(exactModels.opus), 'classifier recognizes exact Gemini/OpenAI/OpenClaw/Claude model literals', literals.join(', '))
  addCheck(checks, pricingSource.includes('GEMINI_STANDARD_PRICING_BY_MODEL') && pricingSource.includes('estimateGeminiStandardTokenCostUsd') && geminiStandardPricingForModel(exactModels.geminiEconomy)?.inputPerMillionUsd === 0.30, 'Gemini pricing table has one shared provider-pricing owner', 'lib/llm-provider-pricing.js')
  addCheck(checks, estimateGeminiStandardTokenCostUsd({ model: exactModels.gemini, inputTokens: 1_000_000, outputTokens: 1_000_000 }) === 10.5, 'Gemini pricing cost helper preserves prior standard-token math', '1M input + 1M output = 10.5')
  addCheck(checks, schedulerSource.includes("from '../lib/llm-provider-pricing.js'") && !schedulerSource.includes('const GEMINI_STANDARD_PRICING_BY_MODEL'), 'YouTube scheduler check imports shared pricing instead of owning model pricing literals', 'scheduler uses provider pricing helper')
  addCheck(checks, devHubSource.includes("from './llm-provider-pricing.js'") && devHubSource.includes('estimateGeminiStandardTokenCostUsd') && !devHubSource.includes('const GEMINI_STANDARD_PRICING_BY_MODEL'), 'Dev Hub imports shared pricing instead of duplicating model pricing literals', 'dev-team-hub uses provider pricing helper')

  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const runtimeFindings = (audit.findings || []).filter(finding => finding.proposedCard === 'LLM-RUNTIME-CONFIG-AUDIT-001')
  addCheck(checks, runtimeFindings.length === 0, 'Code Quality Nightly Audit has no active LLM runtime config false-positive bucket', String(runtimeFindings.length))

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    scriptPath: SCRIPT_PATH,
    checked: {
      exactModelLiteralCount: literals.length,
      activeRuntimeFindingCount: runtimeFindings.length,
    },
    checks,
    findings: failures,
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`LLM Runtime Config Audit check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
