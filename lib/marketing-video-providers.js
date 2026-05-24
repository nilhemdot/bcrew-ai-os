export const MARKETING_VIDEO_PROVIDERS = {
  googleVeo: {
    provider: 'google-veo',
    label: 'Google Veo',
    adapter: 'google-ai-veo',
    endpointPathPrefix: '/v1beta',
    maxReferenceImages: 3,
    supportsReferenceImages: true,
    supportsFirstLastFrame: true,
    supportsAspectRatio: ['16:9', '9:16'],
    models: {
      standard: {
        model: 'veo-3.1-generate-preview',
        label: 'Veo 3.1 Standard',
        pricePerSecondUsd: { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
      },
      fast: {
        model: 'veo-3.1-fast-generate-preview',
        label: 'Veo 3.1 Fast',
        pricePerSecondUsd: { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
      },
      lite: {
        model: 'veo-3.1-lite-generate-preview',
        label: 'Veo 3.1 Lite',
        pricePerSecondUsd: { '720p': 0.05, '1080p': 0.08 },
      },
    },
    pricingBasis: 'Google Gemini API Veo 3.1 paid tier per-second pricing, audio default.',
  },
  falVeo: {
    provider: 'fal-veo',
    label: 'FAL Veo',
    endpoint: 'fal-ai/veo3.1/reference-to-video',
    maxReferenceImages: 3,
    supportsReferenceImages: true,
    supportsFirstLastFrame: true,
    supportsAspectRatio: ['16:9', '9:16'],
    models: {
      standard: {
        model: 'fal-ai/veo3.1/reference-to-video',
        label: 'FAL Veo 3.1 Standard Reference to Video',
        pricePerSecondUsd: {
          audioOff: { '720p': 0.20, '1080p': 0.20, '4k': 0.40 },
          audioOn: { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
        },
      },
      fast: {
        model: 'fal-ai/veo3.1/fast/reference-to-video',
        label: 'FAL Veo 3.1 Fast Reference to Video',
        pricePerSecondUsd: {
          audioOff: { '720p': 0.10, '1080p': 0.10, '4k': 0.30 },
          audioOn: { '720p': 0.15, '1080p': 0.15, '4k': 0.35 },
        },
      },
    },
    pricingBasis: 'FAL Veo 3.1 per-second pricing by tier, resolution, and audio setting.',
  },
}

function normalizeText(value) {
  return String(value || '').trim()
}

function cents(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function normalizeDurationSeconds(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 8
  return Math.min(8, Math.max(4, Math.round(parsed)))
}

function normalizeAspectRatio(value) {
  return ['16:9', '9:16'].includes(value) ? value : '9:16'
}

function normalizeResolution(value) {
  return ['720p', '1080p', '4k'].includes(value) ? value : '720p'
}

function googleModel(modelKey = 'fast') {
  return MARKETING_VIDEO_PROVIDERS.googleVeo.models[modelKey] || MARKETING_VIDEO_PROVIDERS.googleVeo.models.fast
}

function falModel(modelKey = 'fast') {
  return MARKETING_VIDEO_PROVIDERS.falVeo.models[modelKey] || MARKETING_VIDEO_PROVIDERS.falVeo.models.fast
}

export function detectMarketingVideoProviderAvailability(env = process.env) {
  return {
    googleVeo: {
      configured: Boolean(env.GEMINI_API_KEY),
      keyEnv: env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : null,
      secretExposed: false,
    },
    falVeo: {
      configured: Boolean(env.FAL_KEY),
      keyEnv: env.FAL_KEY ? 'FAL_KEY' : null,
      secretExposed: false,
    },
  }
}

export function estimateMarketingVideoCost({
  provider = 'fal-veo',
  modelKey = 'fast',
  resolution = '720p',
  durationSeconds = 8,
  generateAudio = false,
} = {}) {
  const normalizedResolution = normalizeResolution(resolution)
  const billableSeconds = normalizeDurationSeconds(durationSeconds)
  let perSecond = 0
  let model = ''
  let basis = ''

  if (provider === 'google-veo') {
    const selected = googleModel(modelKey)
    model = selected.model
    perSecond = selected.pricePerSecondUsd[normalizedResolution]
    basis = MARKETING_VIDEO_PROVIDERS.googleVeo.pricingBasis
  } else if (provider === 'fal-veo') {
    const selected = falModel(modelKey)
    model = selected.model
    const audioBucket = generateAudio ? selected.pricePerSecondUsd.audioOn : selected.pricePerSecondUsd.audioOff
    perSecond = audioBucket[normalizedResolution]
    basis = MARKETING_VIDEO_PROVIDERS.falVeo.pricingBasis
  } else {
    throw new Error(`Unknown marketing video provider: ${provider}`)
  }

  if (!Number.isFinite(perSecond)) {
    throw new Error(`${provider} ${modelKey} does not support ${normalizedResolution}`)
  }

  return {
    provider,
    model,
    modelKey,
    resolution: normalizedResolution,
    durationSeconds: billableSeconds,
    generateAudio: Boolean(generateAudio),
    currency: 'USD',
    pricePerSecondUsd: perSecond,
    estimatedCostUsd: cents(perSecond * billableSeconds),
    pricingBasis: basis,
  }
}

function assetToGoogleInlineImage(asset = {}) {
  return {
    inlineData: {
      mimeType: asset.mimeType || 'image/png',
      data: `<${asset.id || 'asset'}:base64-redacted>`,
    },
  }
}

function assetToFalUrl(asset = {}) {
  return normalizeText(asset.sourceUrl || asset.url || asset.sourceRef || `mock://marketing-video-lab/${asset.id || 'asset'}`)
}

function referenceAssets(assets = []) {
  return assets
    .filter(asset => !['first_frame', 'last_frame'].includes(asset.role))
    .slice(0, 3)
}

export function buildGoogleVeoPayload({
  compiledPrompt,
  assets = [],
  modelKey = 'fast',
  aspectRatio = '9:16',
  durationSeconds = 8,
  resolution = '720p',
  mode = 'reference-to-video',
} = {}) {
  const selected = googleModel(modelKey)
  const normalizedDuration = normalizeDurationSeconds(durationSeconds)
  const normalizedResolution = normalizeResolution(resolution)
  const instance = {
    prompt: normalizeText(compiledPrompt),
  }

  if (!instance.prompt) throw new Error('Google Veo payload requires a compiled prompt.')

  if (mode === 'first-last-frame') {
    const firstFrame = assets.find(asset => asset.role === 'first_frame')
    const lastFrame = assets.find(asset => asset.role === 'last_frame')
    if (!firstFrame || !lastFrame) throw new Error('First/last frame mode requires first_frame and last_frame assets.')
    instance.image = assetToGoogleInlineImage(firstFrame)
    instance.lastFrame = assetToGoogleInlineImage(lastFrame)
  } else {
    instance.referenceImages = referenceAssets(assets).map(asset => ({
      image: assetToGoogleInlineImage(asset),
      referenceType: 'asset',
      role: asset.role,
    }))
  }

  return {
    provider: 'google-veo',
    model: selected.model,
    method: 'POST',
    adapter: MARKETING_VIDEO_PROVIDERS.googleVeo.adapter,
    endpoint: `${MARKETING_VIDEO_PROVIDERS.googleVeo.adapter}:${MARKETING_VIDEO_PROVIDERS.googleVeo.endpointPathPrefix}/models/${selected.model}:predictLongRunning`,
    endpointPath: `${MARKETING_VIDEO_PROVIDERS.googleVeo.endpointPathPrefix}/models/${selected.model}:predictLongRunning`,
    body: {
      instances: [instance],
      parameters: {
        aspectRatio: normalizeAspectRatio(aspectRatio),
        durationSeconds: String(normalizedDuration),
        resolution: normalizedResolution,
      },
    },
    spendRisk: 'dry-run payload only; do not submit without explicit live approval',
  }
}

export function buildFalVeoPayload({
  compiledPrompt,
  assets = [],
  modelKey = 'fast',
  aspectRatio = '9:16',
  durationSeconds = 8,
  resolution = '720p',
  generateAudio = false,
  safetyTolerance = '4',
} = {}) {
  const selected = falModel(modelKey)
  const imageUrls = referenceAssets(assets).map(assetToFalUrl)
  if (!normalizeText(compiledPrompt)) throw new Error('FAL Veo payload requires a compiled prompt.')
  if (!imageUrls.length) throw new Error('FAL reference-to-video payload requires at least one reference image URL.')

  return {
    provider: 'fal-veo',
    model: selected.model,
    endpoint: selected.model,
    input: {
      prompt: normalizeText(compiledPrompt),
      aspect_ratio: normalizeAspectRatio(aspectRatio),
      duration: `${normalizeDurationSeconds(durationSeconds)}s`,
      resolution: normalizeResolution(resolution),
      generate_audio: Boolean(generateAudio),
      safety_tolerance: String(safetyTolerance || '4'),
      image_urls: imageUrls.slice(0, MARKETING_VIDEO_PROVIDERS.falVeo.maxReferenceImages),
    },
    spendRisk: 'dry-run payload only; do not submit without explicit live approval',
  }
}
