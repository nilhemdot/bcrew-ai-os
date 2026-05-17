import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export const HARLAN_VOICE_API_BASE_URL = 'https://api.elevenlabs.io'
export const HARLAN_VOICE_DEFAULT_MODEL_ID = 'eleven_multilingual_v2'
export const HARLAN_VOICE_DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128'
export const HARLAN_VOICE_DEFAULT_OUTPUT_DIR = '.openclaw/harlan-tools/voice'

const REDACTED = '[redacted]'

export class HarlanVoiceConfigError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'HarlanVoiceConfigError'
    this.metadata = sanitizeHarlanVoiceValue(metadata)
  }
}

export class HarlanVoiceApiError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'HarlanVoiceApiError'
    this.status = metadata.status || null
    this.endpoint = metadata.endpoint || null
    this.metadata = sanitizeHarlanVoiceValue(metadata)
  }
}

function normalizeString(value) {
  return String(value || '').trim()
}

function stripEnvQuotes(value) {
  const text = normalizeString(value)
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1)
  }
  return text
}

function parseEnvLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!match) return null
  return { key: match[1], value: stripEnvQuotes(match[2]) }
}

export function loadHarlanVoiceEnvFileIfExists({ envPath = '.env', env = process.env } = {}) {
  if (!fs.existsSync(envPath)) return { loaded: false, envPath }
  const content = fs.readFileSync(envPath, 'utf8')
  const loadedKeys = []
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue
    if (env[parsed.key] === undefined) {
      env[parsed.key] = parsed.value
      loadedKeys.push(parsed.key)
    }
  }
  return { loaded: true, envPath, loadedKeys }
}

export function buildHarlanVoiceEnvStatus(env = process.env) {
  return {
    ELEVENLABS_API_KEY: Boolean(normalizeString(env.ELEVENLABS_API_KEY)),
    ELEVENLABS_VOICE_ID: Boolean(normalizeString(env.ELEVENLABS_VOICE_ID)),
    ELEVENLABS_TTS_MODEL_ID: Boolean(normalizeString(env.ELEVENLABS_TTS_MODEL_ID)),
    ELEVENLABS_OUTPUT_FORMAT: Boolean(normalizeString(env.ELEVENLABS_OUTPUT_FORMAT)),
  }
}

export function validateHarlanVoiceEnv(env = process.env) {
  const status = buildHarlanVoiceEnvStatus(env)
  const missing = Object.entries(status)
    .filter(([key, present]) => ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'].includes(key) && !present)
    .map(([key]) => key)
  if (missing.length) {
    throw new HarlanVoiceConfigError('Missing ElevenLabs voice credentials', { missing, status })
  }
  return status
}

export function sanitizeHarlanVoiceValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeHarlanVoiceValue)
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return value
    return value
      .replace(/(xi-api-key|api[_-]?key|authorization|voice[_-]?id)["'=:\s]+[A-Za-z0-9._~+/=-]+/gi, `$1=${REDACTED}`)
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, `Bearer ${REDACTED}`)
      .replace(/Key\s+[A-Za-z0-9._~+/=-]+/g, `Key ${REDACTED}`)
  }
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (/token|secret|authorization|api[_-]?key|voice[_-]?id/i.test(key) && typeof item === 'string') {
      acc[key] = REDACTED
    } else {
      acc[key] = sanitizeHarlanVoiceValue(item)
    }
    return acc
  }, {})
}

function assertFetch(fetchImpl) {
  if (typeof fetchImpl !== 'function') throw new HarlanVoiceConfigError('fetchImpl must be a function')
}

async function parseErrorBody(response) {
  const text = await response.text().catch(() => '')
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { body: text.slice(0, 600) }
  }
}

function buildTextToSpeechUrl({ apiBaseUrl, voiceId, outputFormat }) {
  const url = new URL(`/v1/text-to-speech/${encodeURIComponent(voiceId)}`, apiBaseUrl)
  url.searchParams.set('output_format', outputFormat)
  return url
}

function normalizeVoiceSettings(voiceSettings) {
  if (!voiceSettings || typeof voiceSettings !== 'object') return null
  return Object.fromEntries(Object.entries(voiceSettings).filter(([, value]) => value !== undefined && value !== null))
}

export function createHarlanVoiceClientFromEnv(env = process.env, options = {}) {
  const envPath = options.envPath || '.env'
  if (options.loadEnvFile !== false) loadHarlanVoiceEnvFileIfExists({ envPath, env })
  validateHarlanVoiceEnv(env)
  return createHarlanVoiceClient({
    apiKey: env.ELEVENLABS_API_KEY,
    voiceId: env.ELEVENLABS_VOICE_ID,
    modelId: env.ELEVENLABS_TTS_MODEL_ID || HARLAN_VOICE_DEFAULT_MODEL_ID,
    outputFormat: env.ELEVENLABS_OUTPUT_FORMAT || HARLAN_VOICE_DEFAULT_OUTPUT_FORMAT,
    apiBaseUrl: env.ELEVENLABS_API_BASE_URL || HARLAN_VOICE_API_BASE_URL,
    fetchImpl: options.fetchImpl,
    userAgent: options.userAgent,
  })
}

export function createHarlanVoiceClient({
  apiKey,
  voiceId,
  modelId = HARLAN_VOICE_DEFAULT_MODEL_ID,
  outputFormat = HARLAN_VOICE_DEFAULT_OUTPUT_FORMAT,
  apiBaseUrl = HARLAN_VOICE_API_BASE_URL,
  fetchImpl = globalThis.fetch,
  userAgent = 'bcrew-ai-os-harlan-voice/1.0',
} = {}) {
  assertFetch(fetchImpl)
  const normalizedApiKey = normalizeString(apiKey)
  const normalizedVoiceId = normalizeString(voiceId)
  const normalizedModelId = normalizeString(modelId || HARLAN_VOICE_DEFAULT_MODEL_ID)
  const normalizedOutputFormat = normalizeString(outputFormat || HARLAN_VOICE_DEFAULT_OUTPUT_FORMAT)
  const normalizedBaseUrl = normalizeString(apiBaseUrl || HARLAN_VOICE_API_BASE_URL).replace(/\/+$/, '')

  if (!normalizedApiKey || !normalizedVoiceId) {
    throw new HarlanVoiceConfigError('ElevenLabs voice client requires apiKey and voiceId', {
      apiKey: Boolean(normalizedApiKey),
      voiceId: Boolean(normalizedVoiceId),
    })
  }

  async function synthesizeSpeech({
    text,
    outputPath,
    voiceSettings,
    previousText,
    nextText,
    seed,
  } = {}) {
    const normalizedText = normalizeString(text)
    if (!normalizedText) throw new HarlanVoiceConfigError('Voice synthesis requires non-empty text')
    if (!outputPath) throw new HarlanVoiceConfigError('Voice synthesis requires outputPath')

    const url = buildTextToSpeechUrl({
      apiBaseUrl: normalizedBaseUrl,
      voiceId: normalizedVoiceId,
      outputFormat: normalizedOutputFormat,
    })
    const body = {
      text: normalizedText,
      model_id: normalizedModelId,
    }
    const settings = normalizeVoiceSettings(voiceSettings)
    if (settings) body.voice_settings = settings
    if (normalizeString(previousText)) body.previous_text = normalizeString(previousText)
    if (normalizeString(nextText)) body.next_text = normalizeString(nextText)
    if (Number.isInteger(seed)) body.seed = seed

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'xi-api-key': normalizedApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg, audio/*',
        'User-Agent': userAgent,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new HarlanVoiceApiError('ElevenLabs text-to-speech request failed', {
        status: response.status,
        endpoint: '/v1/text-to-speech/:voice_id',
        body: await parseErrorBody(response),
      })
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    if (!audioBuffer.length) {
      throw new HarlanVoiceApiError('ElevenLabs returned an empty audio response', {
        status: response.status,
        endpoint: '/v1/text-to-speech/:voice_id',
      })
    }

    await fsp.mkdir(path.dirname(outputPath), { recursive: true })
    await fsp.writeFile(outputPath, audioBuffer)

    return {
      ok: true,
      provider: 'elevenlabs',
      modelId: normalizedModelId,
      outputFormat: normalizedOutputFormat,
      outputPath,
      bytes: audioBuffer.length,
      contentType: response.headers.get('content-type') || null,
      secretValuesPrinted: false,
    }
  }

  return {
    provider: 'elevenlabs',
    envStatus: () => ({ ELEVENLABS_API_KEY: true, ELEVENLABS_VOICE_ID: true }),
    synthesizeSpeech,
  }
}
