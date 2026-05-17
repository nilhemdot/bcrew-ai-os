#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  FAL_IMAGE_DEFAULT_OUTPUT_DIR,
  buildFalImageEnvStatus,
  createFalImageClientFromEnv,
  loadFalImageEnvFileIfExists,
  sanitizeFalImageValue,
} from '../lib/fal-image-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const DEFAULT_PROMPT = [
  'Refine this existing Harlan concept image.',
  'Keep the same character identity and core composition.',
  'Improve lighting, facial detail, and command-center polish.',
  'Do not regenerate a different character from scratch.',
].join(' ')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    prompt: DEFAULT_PROMPT,
    image: '',
    'image-url': '',
    'out-dir': '',
    out: '',
    'max-wait-ms': '180000',
    'poll-interval-ms': '2500',
    'max-inline-bytes': '',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function pickDefaultImagePath() {
  const candidates = [
    'state/harlan-epic-1.png',
    'state/harlan-avatar-1.png',
    'public/assets/bg.png',
  ]
  for (const candidate of candidates) {
    const absolute = path.join(repoRoot, candidate)
    if (await exists(absolute)) return absolute
  }
  return ''
}

function resolveMaybePath(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  return path.isAbsolute(normalized) ? normalized : path.join(repoRoot, normalized)
}

function resolveOutputDir(value) {
  const normalized = String(value || '').trim()
  const base = normalized || FAL_IMAGE_DEFAULT_OUTPUT_DIR
  return path.isAbsolute(base) ? base : path.join(repoRoot, base)
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function relativeOrRaw(value) {
  if (!value) return value
  return path.isAbsolute(value) ? path.relative(repoRoot, value) : value
}

function printHumanResult(result, envStatus) {
  console.log('Harlan Fal image edit check: healthy')
  console.log(`  FAL_KEY: ${envStatus.FAL_KEY ? 'set' : 'missing'}`)
  console.log(`  Endpoint: ${result.endpoint}`)
  console.log(`  Request: ${result.requestId}`)
  console.log(`  Source: ${result.source?.type || 'unknown'}${result.source?.filePath ? ` (${relativeOrRaw(result.source.filePath)})` : ''}`)
  console.log(`  Images: ${result.imageCount}`)
  console.log(`  Output: ${relativeOrRaw(result.download?.outputPath)}`)
  console.log(`  Bytes: ${result.download?.bytes || 0}`)
  console.log(`  Payload storage disabled: ${result.payloadStorageDisabled ? 'yes' : 'no'}`)
  console.log('  Secrets printed: no')
}

async function main() {
  const args = parseArgs()
  loadFalImageEnvFileIfExists({ envPath: path.join(repoRoot, '.env'), env: process.env })
  const envStatus = buildFalImageEnvStatus(process.env)
  const client = createFalImageClientFromEnv(process.env, {
    envPath: path.join(repoRoot, '.env'),
    loadEnvFile: false,
  })

  const imagePath = args.image ? resolveMaybePath(args.image) : await pickDefaultImagePath()
  const imageUrl = String(args['image-url'] || '').trim()
  if (!imagePath && !imageUrl) {
    throw new Error('No base image found. Pass --image=path/to/base.png or --image-url=https://...')
  }

  const result = await client.editImage({
    prompt: args.prompt,
    imagePath: imageUrl ? '' : imagePath,
    imageUrl,
    outputPath: resolveMaybePath(args.out),
    outputDir: resolveOutputDir(args['out-dir']),
    maxWaitMs: parseOptionalNumber(args['max-wait-ms']),
    pollIntervalMs: parseOptionalNumber(args['poll-interval-ms']),
    maxInlineBytes: parseOptionalNumber(args['max-inline-bytes']),
  })

  const output = sanitizeFalImageValue({
    ok: true,
    env: envStatus,
    result,
  })

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    printHumanResult(result, envStatus)
    if (result.images[0]?.url) console.log(`  Next iteration image URL: ${result.images[0].url}`)
  }
}

main().catch(error => {
  const safe = sanitizeFalImageValue(error?.metadata || error?.message || error)
  if (process.argv.includes('--json')) {
    console.error(JSON.stringify({ ok: false, error: error?.name || 'Error', detail: safe }, null, 2))
  } else {
    console.error(`Harlan Fal image edit check failed: ${error?.message || String(error)}`)
    if (safe && typeof safe === 'object') console.error(JSON.stringify(safe, null, 2))
  }
  process.exitCode = 1
})
