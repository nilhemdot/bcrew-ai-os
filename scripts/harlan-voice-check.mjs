#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  HARLAN_VOICE_DEFAULT_OUTPUT_DIR,
  buildHarlanVoiceEnvStatus,
  createHarlanVoiceClientFromEnv,
  loadHarlanVoiceEnvFileIfExists,
  sanitizeHarlanVoiceValue,
} from '../lib/harlan-voice-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    play: false,
    text: 'Harlan voice path is live. I can speak through ElevenLabs now.',
    out: '',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--play' || arg === '--play=true') args.play = true
    const match = String(arg).match(/^--([^=]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function defaultOutputPath() {
  return path.join(repoRoot, HARLAN_VOICE_DEFAULT_OUTPUT_DIR, `harlan-voice-proof-${timestampForPath()}.mp3`)
}

function resolveOutputPath(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return defaultOutputPath()
  return path.isAbsolute(normalized) ? normalized : path.join(repoRoot, normalized)
}

function printHumanResult(result, envStatus) {
  console.log('Harlan voice check: healthy')
  console.log(`  ELEVENLABS_API_KEY: ${envStatus.ELEVENLABS_API_KEY ? 'set' : 'missing'}`)
  console.log(`  ELEVENLABS_VOICE_ID: ${envStatus.ELEVENLABS_VOICE_ID ? 'set' : 'missing'}`)
  console.log(`  Output: ${path.relative(repoRoot, result.outputPath)}`)
  console.log(`  Bytes: ${result.bytes}`)
  console.log(`  Content-Type: ${result.contentType || 'unknown'}`)
  console.log('  Secrets printed: no')
}

async function main() {
  const args = parseArgs()
  loadHarlanVoiceEnvFileIfExists({ envPath: path.join(repoRoot, '.env'), env: process.env })
  const envStatus = buildHarlanVoiceEnvStatus(process.env)
  const client = createHarlanVoiceClientFromEnv(process.env, {
    envPath: path.join(repoRoot, '.env'),
    loadEnvFile: false,
  })
  const result = await client.synthesizeSpeech({
    text: args.text,
    outputPath: resolveOutputPath(args.out),
  })

  if (args.play) {
    const playback = spawnSync('afplay', [result.outputPath], { stdio: 'inherit' })
    result.played = playback.status === 0
    result.playbackStatus = playback.status
  }

  const output = sanitizeHarlanVoiceValue({
    ok: true,
    env: envStatus,
    result,
  })

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    printHumanResult(result, envStatus)
    if (args.play) console.log(`  Played locally: ${result.played ? 'yes' : 'no'}`)
  }
}

main().catch(error => {
  const safe = sanitizeHarlanVoiceValue(error?.metadata || error?.message || error)
  if (process.argv.includes('--json')) {
    console.error(JSON.stringify({ ok: false, error: error?.name || 'Error', detail: safe }, null, 2))
  } else {
    console.error(`Harlan voice check failed: ${error?.message || String(error)}`)
    if (safe && typeof safe === 'object') console.error(JSON.stringify(safe, null, 2))
  }
  process.exitCode = 1
})
