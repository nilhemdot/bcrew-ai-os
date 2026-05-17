import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export const FAL_IMAGE_DEFAULT_ENDPOINT = 'fal-ai/flux-kontext/dev'
export const FAL_QUEUE_BASE_URL = 'https://queue.fal.run'
export const FAL_IMAGE_DEFAULT_OUTPUT_DIR = '.openclaw/harlan-tools/fal'
export const FAL_IMAGE_DEFAULT_MAX_INLINE_BYTES = 8 * 1024 * 1024

const REDACTED = '[redacted]'

export class FalImageConfigError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'FalImageConfigError'
    this.metadata = sanitizeFalImageValue(metadata)
  }
}

export class FalImageApiError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'FalImageApiError'
    this.status = metadata.status || null
    this.endpoint = metadata.endpoint || null
    this.requestId = metadata.requestId || null
    this.metadata = sanitizeFalImageValue(metadata)
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

export function loadFalImageEnvFileIfExists({ envPath = '.env', env = process.env } = {}) {
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

export function buildFalImageEnvStatus(env = process.env) {
  return {
    FAL_KEY: Boolean(normalizeString(env.FAL_KEY)),
    FAL_API_KEY: Boolean(normalizeString(env.FAL_API_KEY)),
  }
}

export function validateFalImageEnv(env = process.env) {
  const status = buildFalImageEnvStatus(env)
  if (!status.FAL_KEY && !status.FAL_API_KEY) {
    throw new FalImageConfigError('Missing Fal credentials', { missing: ['FAL_KEY'], status })
  }
  return status
}

export function resolveFalKey(env = process.env) {
  return normalizeString(env.FAL_KEY || env.FAL_API_KEY)
}

export function sanitizeFalImageValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeFalImageValue)
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return value
    return value
      .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, `data:image/${REDACTED};base64,${REDACTED}`)
      .replace(/(authorization|fal[_-]?(api[_-]?)?key|api[_-]?key)["'=:\s]+[A-Za-z0-9._~+/=-]+/gi, `$1=${REDACTED}`)
      .replace(/Key\s+[A-Za-z0-9._~+/=-]+/g, `Key ${REDACTED}`)
  }
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (/token|secret|authorization|fal[_-]?(api[_-]?)?key|api[_-]?key/i.test(key) && typeof item === 'string') {
      acc[key] = REDACTED
    } else {
      acc[key] = sanitizeFalImageValue(item)
    }
    return acc
  }, {})
}

function assertFetch(fetchImpl) {
  if (typeof fetchImpl !== 'function') throw new FalImageConfigError('fetchImpl must be a function')
}

function contentTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'application/octet-stream'
}

function extensionFromContentType(contentType, fallback = '.png') {
  const normalized = normalizeString(contentType).split(';')[0].toLowerCase()
  if (normalized === 'image/jpeg') return '.jpg'
  if (normalized === 'image/png') return '.png'
  if (normalized === 'image/webp') return '.webp'
  if (normalized === 'image/gif') return '.gif'
  return fallback
}

function looksLikeRemoteUrl(value) {
  return /^https?:\/\//i.test(normalizeString(value))
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''))
}

async function parseJsonResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new FalImageApiError('Fal returned a non-JSON response', {
      status: response.status,
      body: text.slice(0, 600),
    })
  }
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

export async function localImageToDataUri(filePath, { maxBytes = FAL_IMAGE_DEFAULT_MAX_INLINE_BYTES } = {}) {
  const stats = await fsp.stat(filePath)
  if (!stats.isFile()) throw new FalImageConfigError('Fal image input must be a file', { filePath })
  if (stats.size > maxBytes) {
    throw new FalImageConfigError('Fal local image is too large for inline data URI path', {
      filePath,
      sizeBytes: stats.size,
      maxBytes,
      fix: 'Host the image and pass --image-url, or raise --max-inline-bytes.',
    })
  }
  const contentType = contentTypeFromPath(filePath)
  if (!contentType.startsWith('image/')) {
    throw new FalImageConfigError('Fal local image must be a supported image file', { filePath, contentType })
  }
  const bytes = await fsp.readFile(filePath)
  return {
    imageUrl: `data:${contentType};base64,${bytes.toString('base64')}`,
    source: {
      type: 'local_data_uri',
      filePath,
      bytes: stats.size,
      contentType,
    },
  }
}

export async function resolveFalImageInput({
  imageUrl,
  imagePath,
  maxInlineBytes = FAL_IMAGE_DEFAULT_MAX_INLINE_BYTES,
} = {}) {
  const normalizedImageUrl = normalizeString(imageUrl)
  const normalizedImagePath = normalizeString(imagePath)
  if (normalizedImageUrl) {
    if (!looksLikeRemoteUrl(normalizedImageUrl) && !normalizedImageUrl.startsWith('data:image/')) {
      throw new FalImageConfigError('Fal imageUrl must be http(s) or data:image URI')
    }
    return {
      imageUrl: normalizedImageUrl,
      source: {
        type: normalizedImageUrl.startsWith('data:image/') ? 'data_uri' : 'remote_url',
      },
    }
  }
  if (!normalizedImagePath) throw new FalImageConfigError('Fal image edit requires imagePath or imageUrl')
  return localImageToDataUri(normalizedImagePath, { maxBytes: maxInlineBytes })
}

export async function buildFalImageEditInput({
  prompt,
  imageUrl,
  imagePath,
  maxInlineBytes,
  numInferenceSteps = 28,
  guidanceScale = 2.5,
  numImages = 1,
  outputFormat = 'png',
  resolutionMode = 'match_input',
  acceleration = 'none',
  enableSafetyChecker = true,
  seed,
} = {}) {
  const normalizedPrompt = normalizeString(prompt)
  if (!normalizedPrompt) throw new FalImageConfigError('Fal image edit requires a prompt')
  const image = await resolveFalImageInput({ imageUrl, imagePath, maxInlineBytes })
  return {
    input: compactObject({
      prompt: normalizedPrompt,
      image_url: image.imageUrl,
      num_inference_steps: Number(numInferenceSteps),
      guidance_scale: Number(guidanceScale),
      num_images: Number(numImages),
      enable_safety_checker: Boolean(enableSafetyChecker),
      output_format: outputFormat,
      acceleration,
      resolution_mode: resolutionMode,
      seed: seed === undefined ? undefined : Number(seed),
    }),
    source: image.source,
  }
}

function buildFalAuthHeaders({ falKey, storePayloads = false, extraHeaders = {} } = {}) {
  const normalizedFalKey = normalizeString(falKey)
  if (!normalizedFalKey) throw new FalImageConfigError('Fal request requires FAL_KEY')
  return compactObject({
    Authorization: `Key ${normalizedFalKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'bcrew-ai-os-harlan-fal-image/1.0',
    'X-Fal-Store-IO': storePayloads ? undefined : '0',
    ...extraHeaders,
  })
}

function queueEndpointUrl({ queueBaseUrl = FAL_QUEUE_BASE_URL, endpoint = FAL_IMAGE_DEFAULT_ENDPOINT } = {}) {
  return `${normalizeString(queueBaseUrl || FAL_QUEUE_BASE_URL).replace(/\/+$/, '')}/${normalizeString(endpoint).replace(/^\/+/, '')}`
}

export async function submitFalImageEdit({
  falKey,
  input,
  endpoint = FAL_IMAGE_DEFAULT_ENDPOINT,
  queueBaseUrl = FAL_QUEUE_BASE_URL,
  fetchImpl = globalThis.fetch,
  storePayloads = false,
  extraHeaders = {},
} = {}) {
  assertFetch(fetchImpl)
  if (!input || typeof input !== 'object') throw new FalImageConfigError('Fal submit requires input object')
  const url = queueEndpointUrl({ queueBaseUrl, endpoint })
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: buildFalAuthHeaders({ falKey, storePayloads, extraHeaders }),
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new FalImageApiError('Fal image edit submit failed', {
      status: response.status,
      endpoint,
      body: await parseErrorBody(response),
    })
  }
  const body = await parseJsonResponse(response)
  const requestId = normalizeString(body.request_id || body.requestId)
  if (!requestId) {
    throw new FalImageApiError('Fal submit response did not include request_id', { endpoint, body })
  }
  return {
    endpoint,
    requestId,
    statusUrl: body.status_url || `${url}/requests/${encodeURIComponent(requestId)}/status`,
    responseUrl: body.response_url || `${url}/requests/${encodeURIComponent(requestId)}`,
    cancelUrl: body.cancel_url || null,
    queuePosition: body.queue_position ?? null,
  }
}

async function fetchQueueStatus({ statusUrl, falKey, fetchImpl, logs = true }) {
  const url = new URL(statusUrl)
  if (logs) url.searchParams.set('logs', '1')
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: buildFalAuthHeaders({ falKey }),
  })
  if (!response.ok) {
    throw new FalImageApiError('Fal queue status request failed', {
      status: response.status,
      endpoint: url.pathname,
      body: await parseErrorBody(response),
    })
  }
  return parseJsonResponse(response)
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function pollFalImageEdit({
  falKey,
  submit,
  fetchImpl = globalThis.fetch,
  maxWaitMs = 180000,
  pollIntervalMs = 2500,
  logs = true,
} = {}) {
  assertFetch(fetchImpl)
  if (!submit?.statusUrl) throw new FalImageConfigError('Fal poll requires submit.statusUrl')
  const startedAt = Date.now()
  let lastStatus = null
  while (Date.now() - startedAt <= maxWaitMs) {
    lastStatus = await fetchQueueStatus({ statusUrl: submit.statusUrl, falKey, fetchImpl, logs })
    if (lastStatus.error || lastStatus.error_type) {
      throw new FalImageApiError('Fal image edit failed in queue', {
        status: 200,
        requestId: submit.requestId,
        body: lastStatus,
      })
    }
    if (lastStatus.status === 'COMPLETED') {
      return {
        ...lastStatus,
        requestId: submit.requestId,
        responseUrl: lastStatus.response_url || submit.responseUrl,
      }
    }
    await wait(pollIntervalMs)
  }
  throw new FalImageApiError('Fal image edit timed out while polling', {
    requestId: submit.requestId,
    statusUrl: submit.statusUrl,
    lastStatus,
  })
}

export async function getFalImageEditResult({
  falKey,
  responseUrl,
  fetchImpl = globalThis.fetch,
} = {}) {
  assertFetch(fetchImpl)
  if (!responseUrl) throw new FalImageConfigError('Fal result requires responseUrl')
  const response = await fetchImpl(responseUrl, {
    method: 'GET',
    headers: buildFalAuthHeaders({ falKey }),
  })
  if (!response.ok) {
    throw new FalImageApiError('Fal image edit result request failed', {
      status: response.status,
      endpoint: new URL(responseUrl).pathname,
      body: await parseErrorBody(response),
    })
  }
  const body = await parseJsonResponse(response)
  const data = body.data && typeof body.data === 'object' ? body.data : body
  if (data.error || data.error_type) {
    throw new FalImageApiError('Fal image edit returned an error result', { body: data })
  }
  return data
}

export function getFalResultImages(result = {}) {
  return Array.isArray(result.images) ? result.images : []
}

export async function downloadFirstFalResultImage({
  result,
  outputPath,
  outputDir = FAL_IMAGE_DEFAULT_OUTPUT_DIR,
  fetchImpl = globalThis.fetch,
} = {}) {
  assertFetch(fetchImpl)
  const [image] = getFalResultImages(result)
  if (!image?.url) throw new FalImageApiError('Fal result did not include an image URL', { result })
  const response = await fetchImpl(image.url)
  if (!response.ok) {
    throw new FalImageApiError('Fal result image download failed', {
      status: response.status,
      endpoint: image.url,
      body: await parseErrorBody(response),
    })
  }
  const contentType = response.headers.get('content-type') || image.content_type || 'image/png'
  const ext = extensionFromContentType(contentType, '.png')
  const resolvedOutputPath = outputPath || path.join(outputDir, `harlan-fal-edit-${new Date().toISOString().replace(/[:.]/g, '-')}${ext}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  await fsp.mkdir(path.dirname(resolvedOutputPath), { recursive: true })
  await fsp.writeFile(resolvedOutputPath, bytes)
  return {
    outputPath: resolvedOutputPath,
    bytes: bytes.length,
    contentType,
    sourceUrl: image.url,
    width: image.width || null,
    height: image.height || null,
  }
}

export function createFalImageClientFromEnv(env = process.env, options = {}) {
  const envPath = options.envPath || '.env'
  if (options.loadEnvFile !== false) loadFalImageEnvFileIfExists({ envPath, env })
  validateFalImageEnv(env)
  return createFalImageClient({
    falKey: resolveFalKey(env),
    endpoint: options.endpoint || env.FAL_IMAGE_EDIT_ENDPOINT || FAL_IMAGE_DEFAULT_ENDPOINT,
    queueBaseUrl: options.queueBaseUrl || env.FAL_QUEUE_BASE_URL || FAL_QUEUE_BASE_URL,
    fetchImpl: options.fetchImpl,
  })
}

export function createFalImageClient({
  falKey,
  endpoint = FAL_IMAGE_DEFAULT_ENDPOINT,
  queueBaseUrl = FAL_QUEUE_BASE_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  assertFetch(fetchImpl)
  const normalizedFalKey = normalizeString(falKey)
  if (!normalizedFalKey) throw new FalImageConfigError('Fal image client requires falKey')

  async function editImage({
    prompt,
    imageUrl,
    imagePath,
    maxInlineBytes,
    outputPath,
    outputDir = FAL_IMAGE_DEFAULT_OUTPUT_DIR,
    downloadResult = true,
    maxWaitMs,
    pollIntervalMs,
    storePayloads = false,
    ...inputOptions
  } = {}) {
    const editInput = await buildFalImageEditInput({
      prompt,
      imageUrl,
      imagePath,
      maxInlineBytes,
      ...inputOptions,
    })
    const submit = await submitFalImageEdit({
      falKey: normalizedFalKey,
      input: editInput.input,
      endpoint,
      queueBaseUrl,
      fetchImpl,
      storePayloads,
    })
    const status = await pollFalImageEdit({
      falKey: normalizedFalKey,
      submit,
      fetchImpl,
      maxWaitMs,
      pollIntervalMs,
    })
    const result = await getFalImageEditResult({
      falKey: normalizedFalKey,
      responseUrl: status.responseUrl || submit.responseUrl,
      fetchImpl,
    })
    const download = downloadResult
      ? await downloadFirstFalResultImage({ result, outputPath, outputDir, fetchImpl })
      : null
    const images = getFalResultImages(result)
    return {
      ok: true,
      provider: 'fal',
      endpoint,
      requestId: submit.requestId,
      source: editInput.source,
      imageCount: images.length,
      images: images.map(image => ({
        url: image.url,
        width: image.width || null,
        height: image.height || null,
        contentType: image.content_type || image.contentType || null,
      })),
      seed: result.seed ?? null,
      hasNsfwConcepts: result.has_nsfw_concepts || null,
      download,
      payloadStorageDisabled: !storePayloads,
      secretValuesPrinted: false,
    }
  }

  return {
    provider: 'fal',
    endpoint,
    editImage,
  }
}
