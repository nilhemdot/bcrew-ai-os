import {
  MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  compileMarketingVideoPrompt,
  getMarketingVideoTemplate,
  normalizeMarketingVideoText,
} from './marketing-video-prompts.js'
import {
  buildFalVeoPayload,
  buildGoogleVeoPayload,
  detectMarketingVideoProviderAvailability,
  estimateMarketingVideoCost,
} from './marketing-video-providers.js'

export const MARKETING_VIDEO_LAB_CARD_ID = 'MARKETING-VIDEO-LAB-001'
export const MARKETING_VIDEO_LAB_SCRIPT_PATH = 'scripts/process-marketing-video-lab-check.mjs'
export const MARKETING_VIDEO_LAB_SUMMARY_MARKER = 'MARKETING_VIDEO_LAB_SUMMARY'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_CARD_ID = 'MARKETING-VIDEO-LAB-LIVE-SAFETY-001'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_CLOSEOUT_KEY = 'marketing-video-lab-live-safety-v1'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_SCRIPT_PATH = 'scripts/process-marketing-video-lab-live-safety-check.mjs'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_PLAN_PATH = 'docs/process/marketing-video-lab-live-safety-001-plan.md'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_APPROVAL_PATH = 'docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-marketing-video-lab-live-safety-closeout.md'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_NEXT_CARD_ID = 'STRATEGY-004'
export const MARKETING_VIDEO_LAB_LIVE_SAFETY_SUMMARY_MARKER = 'MARKETING_VIDEO_LAB_LIVE_SAFETY_SUMMARY'

export const MARKETING_VIDEO_ASSET_ROLES = [
  'mascot',
  'sold_sign',
  'property',
  'agent',
  'brand',
  'prop',
  'reference',
  'first_frame',
  'last_frame',
]

export const MARKETING_VIDEO_JOB_STATUSES = [
  'draft',
  'dry_run_ready',
  'submitted',
  'running',
  'succeeded',
  'failed',
  'approved',
  'rejected',
  'export_ready',
]

function normalizeRole(value) {
  return normalizeMarketingVideoText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeMimeType(value) {
  return normalizeMarketingVideoText(value).toLowerCase() || 'image/png'
}

function makeFinding(severity, key, detail) {
  return { severity, key, detail }
}

function normalizeUrlText(value) {
  return normalizeMarketingVideoText(value).replace(/\s+/g, '')
}

function isPrivateIpv4(hostname = '') {
  const parts = String(hostname || '').split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  return false
}

export function validateMarketingVideoLiveAssetSource(asset = {}) {
  const sourceUrl = normalizeUrlText(asset.sourceUrl || asset.url || asset.sourceRef)
  const sourceType = normalizeMarketingVideoText(asset.sourceType || 'external_url').toLowerCase()
  const findings = []
  const placeholderTokens = [
    'example.',
    'example-',
    'placeholder',
    'sample',
    'dummy',
    'mock',
    'test-image',
    'synthetic',
    '<',
    '>',
  ]

  if (!sourceUrl) {
    findings.push(makeFinding('critical', 'live_asset_missing_url', `${asset.id || 'asset'} requires a live HTTPS asset URL.`))
    return { ok: false, sourceUrl, findings }
  }

  if (['mock', 'synthetic', 'sample', 'fixture', 'local'].some(token => sourceType.includes(token))) {
    findings.push(makeFinding('critical', 'live_asset_mock_source_type', `${asset.id || 'asset'} uses non-live source type ${sourceType}.`))
  }

  if (sourceUrl.startsWith('mock:') || sourceUrl.startsWith('file:') || sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    findings.push(makeFinding('critical', 'live_asset_non_http_url', `${asset.id || 'asset'} uses non-live URL scheme.`))
  }

  let parsed = null
  try {
    parsed = new URL(sourceUrl)
  } catch {
    findings.push(makeFinding('critical', 'live_asset_invalid_url', `${asset.id || 'asset'} URL is not parseable.`))
  }

  if (parsed) {
    const hostname = parsed.hostname.toLowerCase()
    const full = parsed.href.toLowerCase()
    if (parsed.protocol !== 'https:') {
      findings.push(makeFinding('critical', 'live_asset_requires_https', `${asset.id || 'asset'} must use HTTPS for live generation.`))
    }
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      isPrivateIpv4(hostname)
    ) {
      findings.push(makeFinding('critical', 'live_asset_private_or_local_url', `${asset.id || 'asset'} points at a local/private host.`))
    }
    if (placeholderTokens.some(token => full.includes(token))) {
      findings.push(makeFinding('critical', 'live_asset_placeholder_url', `${asset.id || 'asset'} uses placeholder/sample/mock URL text.`))
    }
  }

  return {
    ok: findings.filter(finding => finding.severity === 'critical').length === 0,
    sourceUrl,
    findings,
  }
}

export function normalizeMarketingVideoAsset(asset = {}) {
  const role = normalizeRole(asset.role || asset.roleDefault)
  return {
    id: normalizeMarketingVideoText(asset.id),
    label: normalizeMarketingVideoText(asset.label || asset.name || asset.id),
    role,
    sourceType: normalizeMarketingVideoText(asset.sourceType || 'external_url'),
    sourceRef: normalizeMarketingVideoText(asset.sourceRef || asset.sourceUrl || asset.url),
    sourceUrl: normalizeMarketingVideoText(asset.sourceUrl || asset.url || asset.sourceRef),
    mimeType: normalizeMimeType(asset.mimeType),
    sizeBytes: Number.isFinite(Number(asset.sizeBytes)) ? Number(asset.sizeBytes) : null,
    sha256: normalizeMarketingVideoText(asset.sha256),
    rightsStatus: normalizeMarketingVideoText(asset.rightsStatus || 'needs_review'),
    rightsNote: normalizeMarketingVideoText(asset.rightsNote),
  }
}

export function validateMarketingVideoAssets({
  templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  assets = [],
  live = false,
} = {}) {
  const template = getMarketingVideoTemplate(templateId)
  const normalizedAssets = assets.map(normalizeMarketingVideoAsset)
  const findings = []

  if (!template) {
    findings.push(makeFinding('critical', 'unknown_template', `Unknown template: ${templateId}`))
  }

  for (const asset of normalizedAssets) {
    if (!asset.id) findings.push(makeFinding('critical', 'asset_missing_id', 'Asset is missing id.'))
    if (!MARKETING_VIDEO_ASSET_ROLES.includes(asset.role)) {
      findings.push(makeFinding('critical', 'asset_unknown_role', `${asset.id || 'asset'} uses unsupported role ${asset.role || 'missing'}.`))
    }
    if (!asset.mimeType.startsWith('image/')) {
      findings.push(makeFinding('critical', 'asset_not_image', `${asset.id || 'asset'} must be an image asset.`))
    }
    if (!asset.sourceRef && !asset.sourceUrl) {
      findings.push(makeFinding('warning', 'asset_missing_source_ref', `${asset.id || 'asset'} has no source reference.`))
    }
    if (live && asset.rightsStatus !== 'approved') {
      findings.push(makeFinding('critical', 'asset_not_approved_for_live', `${asset.id || 'asset'} is not approved for live generation.`))
    }
    if (live) {
      const sourceValidation = validateMarketingVideoLiveAssetSource(asset)
      findings.push(...sourceValidation.findings)
    }
    if (asset.rightsStatus === 'rejected') {
      findings.push(makeFinding('critical', 'asset_rejected', `${asset.id || 'asset'} has rejected rights status.`))
    }
  }

  if (template) {
    const roles = new Set(normalizedAssets.map(asset => asset.role))
    for (const role of template.requiredRoles) {
      if (!roles.has(role)) findings.push(makeFinding('critical', 'template_required_role_missing', `${template.templateId} requires ${role}.`))
    }
  }

  const referenceAssetCount = normalizedAssets.filter(asset => !['first_frame', 'last_frame'].includes(asset.role)).length
  if (referenceAssetCount > 3) {
    findings.push(makeFinding('critical', 'too_many_reference_assets', `Reference-image providers support up to 3 references; found ${referenceAssetCount}.`))
  }

  return {
    ok: findings.filter(finding => finding.severity === 'critical').length === 0,
    templateId,
    assets: normalizedAssets,
    findings,
  }
}

export function buildSyntheticMarketingVideoAssets() {
  return [
    {
      id: 'asset-mascot-001',
      label: 'Benson Crew mascot',
      role: 'mascot',
      sourceType: 'external_url',
      sourceRef: 'https://assets.example.invalid/benson-crew-mascot.png',
      mimeType: 'image/png',
      sizeBytes: 220000,
      sha256: 'synthetic-mascot',
      rightsStatus: 'approved',
      rightsNote: 'Synthetic proof asset.',
    },
    {
      id: 'asset-sold-sign-001',
      label: 'Benson Crew sold sign',
      role: 'sold_sign',
      sourceType: 'external_url',
      sourceRef: 'https://assets.example.invalid/sold-sign.png',
      mimeType: 'image/png',
      sizeBytes: 180000,
      sha256: 'synthetic-sold-sign',
      rightsStatus: 'approved',
      rightsNote: 'Synthetic proof asset.',
    },
    {
      id: 'asset-property-001',
      label: 'Recently sold home exterior',
      role: 'property',
      sourceType: 'external_url',
      sourceRef: 'https://assets.example.invalid/property-front.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 420000,
      sha256: 'synthetic-property',
      rightsStatus: 'approved',
      rightsNote: 'Synthetic proof asset.',
    },
  ]
}

function normalizeSubmitPart(value = '') {
  return normalizeMarketingVideoText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function normalizeMarketingVideoSubmitLockKey({
  templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  assets = [],
  promptFields = {},
  provider = 'mock',
  modelKey = 'mock',
} = {}) {
  const assetKey = assets
    .map(normalizeMarketingVideoAsset)
    .map(asset => `${asset.role}:${asset.id || asset.sha256 || asset.sourceUrl}`)
    .sort()
    .join('|')
  const promptKey = JSON.stringify({
    action: normalizeMarketingVideoText(promptFields.action),
    aspectRatio: normalizeMarketingVideoText(promptFields.aspectRatio || '9:16'),
    durationSeconds: normalizeMarketingVideoText(promptFields.durationSeconds || '8'),
  })
  return [
    normalizeSubmitPart(templateId),
    normalizeSubmitPart(provider),
    normalizeSubmitPart(modelKey),
    normalizeSubmitPart(assetKey),
    normalizeSubmitPart(promptKey),
  ].filter(Boolean).join(':')
}

export function createMarketingVideoSubmitLockState(seed = {}) {
  return {
    active: new Map(Object.entries(seed.active || {})),
    history: Array.isArray(seed.history) ? seed.history.slice() : [],
  }
}

export async function submitMarketingVideoMockJobWithLock({
  lockState = createMarketingVideoSubmitLockState(),
  job = buildMarketingVideoDryRunJob(),
  submitterId = 'mock-submit',
  provider = 'mock',
  modelKey = 'mock',
  release = false,
} = {}) {
  const key = normalizeMarketingVideoSubmitLockKey({
    templateId: job.templateId,
    assets: job.validation?.assets || [],
    promptFields: job.prompt?.promptFields || {},
    provider,
    modelKey,
  })
  if (lockState.active.has(key)) {
    const rejected = {
      ok: false,
      status: 'rejected',
      reason: 'duplicate_running_job',
      lockKey: key,
      activeJobId: lockState.active.get(key)?.jobId || null,
      submitterId,
    }
    lockState.history.push(rejected)
    return rejected
  }

  const accepted = {
    ok: true,
    status: 'running',
    reason: 'accepted',
    lockKey: key,
    jobId: `${job.jobId || 'marketing-video-job'}:${submitterId}`,
    submitterId,
  }
  lockState.active.set(key, accepted)
  lockState.history.push(accepted)
  await Promise.resolve()
  if (release) lockState.active.delete(key)
  return accepted
}

export function buildMarketingVideoDryRunJob({
  templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  assets = buildSyntheticMarketingVideoAssets(),
  promptFields = {},
  providerModels = [
    { provider: 'google-veo', modelKey: 'fast', mode: 'reference-to-video' },
    { provider: 'fal-veo', modelKey: 'fast', mode: 'reference-to-video' },
  ],
  now = '2026-05-14T00:00:00.000Z',
} = {}) {
  const validation = validateMarketingVideoAssets({ templateId, assets, live: false })
  if (!validation.ok) {
    return {
      ok: false,
      status: 'invalid',
      validation,
      payloads: [],
      costs: [],
      liveGenerationEnabled: false,
      providerSpendUsd: 0,
    }
  }

  const prompt = compileMarketingVideoPrompt({
    templateId,
    assets: validation.assets,
    promptFields,
  })
  const settings = prompt.promptFields
  const costs = providerModels.map(model => estimateMarketingVideoCost({
    provider: model.provider,
    modelKey: model.modelKey,
    resolution: settings.resolution,
    durationSeconds: settings.durationSeconds,
    generateAudio: settings.generateAudio,
  }))
  const payloads = providerModels.map(model => {
    const base = {
      compiledPrompt: prompt.compiledPrompt,
      assets: validation.assets,
      modelKey: model.modelKey,
      mode: model.mode,
      aspectRatio: settings.aspectRatio,
      durationSeconds: settings.durationSeconds,
      resolution: settings.resolution,
      generateAudio: settings.generateAudio,
    }
    return model.provider === 'google-veo'
      ? buildGoogleVeoPayload(base)
      : buildFalVeoPayload(base)
  })

  return {
    ok: true,
    cardId: MARKETING_VIDEO_LAB_CARD_ID,
    jobId: 'dryrun-marketing-video-lab-001',
    templateId,
    status: 'dry_run_ready',
    createdAt: now,
    validation,
    prompt,
    costs,
    payloads,
    providerAvailability: detectMarketingVideoProviderAvailability(),
    liveGenerationEnabled: false,
    providerSpendUsd: 0,
  }
}

export function buildMockMarketingVideoJobLifecycle(dryRunJob, {
  outputUrl = 'mock://marketing-video-lab/output/sold-sign-mascot.mp4',
} = {}) {
  if (!dryRunJob?.ok) {
    throw new Error('Mock lifecycle requires a valid dry-run job.')
  }

  const base = {
    jobId: dryRunJob.jobId,
    templateId: dryRunJob.templateId,
    providerSpendUsd: 0,
    liveGenerationEnabled: false,
  }
  const events = [
    { ...base, status: 'draft', output: null, reviewStatus: null },
    { ...base, status: 'submitted', output: null, reviewStatus: null },
    { ...base, status: 'running', output: null, reviewStatus: null },
    { ...base, status: 'succeeded', output: { url: outputUrl, mimeType: 'video/mp4' }, reviewStatus: null },
    { ...base, status: 'approved', output: { url: outputUrl, mimeType: 'video/mp4' }, reviewStatus: 'approved' },
    { ...base, status: 'export_ready', output: { url: outputUrl, mimeType: 'video/mp4' }, reviewStatus: 'approved' },
  ]

  const blockedExportReady = canMarkMarketingVideoExportReady({
    status: 'approved',
    output: null,
    reviewStatus: 'approved',
  }) === false

  return {
    ok: events.every(event => MARKETING_VIDEO_JOB_STATUSES.includes(event.status)) && blockedExportReady,
    events,
    finalStatus: events[events.length - 1].status,
    blockedExportReadyWithoutOutput: blockedExportReady,
  }
}

export function canMarkMarketingVideoExportReady(job = {}) {
  return job.reviewStatus === 'approved' && Boolean(job.output?.url)
}

export function buildSyntheticMarketingVideoLabProof() {
  const dryRun = buildMarketingVideoDryRunJob()
  const missingAssetValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: buildSyntheticMarketingVideoAssets().filter(asset => asset.role !== 'sold_sign'),
  })
  const lifecycle = buildMockMarketingVideoJobLifecycle(dryRun)
  const googlePayload = dryRun.payloads.find(payload => payload.provider === 'google-veo')
  const falPayload = dryRun.payloads.find(payload => payload.provider === 'fal-veo')

  const ok = dryRun.ok &&
    dryRun.liveGenerationEnabled === false &&
    dryRun.providerSpendUsd === 0 &&
    dryRun.prompt.compiledPrompt.includes('mascot walks into frame') &&
    dryRun.prompt.compiledPrompt.includes('Brand guardrails') &&
    googlePayload?.body?.instances?.[0]?.referenceImages?.length === 3 &&
    googlePayload?.body?.parameters?.aspectRatio === '9:16' &&
    falPayload?.input?.image_urls?.length === 3 &&
    falPayload?.input?.aspect_ratio === '9:16' &&
    dryRun.costs.every(cost => cost.estimatedCostUsd > 0) &&
    missingAssetValidation.ok === false &&
    lifecycle.ok

  return {
    ok,
    summary: {
      cardId: MARKETING_VIDEO_LAB_CARD_ID,
      templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
      dryRunStatus: dryRun.status,
      payloadCount: dryRun.payloads.length,
      costEstimateCount: dryRun.costs.length,
      liveGenerationEnabled: dryRun.liveGenerationEnabled,
      providerSpendUsd: dryRun.providerSpendUsd,
      lifecycleFinalStatus: lifecycle.finalStatus,
    },
    dryRun,
    missingAssetValidation,
    lifecycle,
  }
}

export async function buildMarketingVideoLiveSafetyDogfoodProof() {
  const assets = buildSyntheticMarketingVideoAssets()
  const approvedLiveAssets = assets.map(asset => ({
    ...asset,
    sourceType: 'approved_cdn',
    sourceRef: `https://assets.bensoncrew.ai/marketing-video-approved/${asset.id}.png`,
    sourceUrl: `https://assets.bensoncrew.ai/marketing-video-approved/${asset.id}.png`,
    rightsStatus: 'approved',
  }))
  const healthyLiveValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: approvedLiveAssets,
    live: true,
  })
  const placeholderValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: approvedLiveAssets.map((asset, index) => index === 0
      ? { ...asset, sourceRef: 'https://assets.example.invalid/sample-placeholder.png', sourceUrl: 'https://assets.example.invalid/sample-placeholder.png' }
      : asset),
    live: true,
  })
  const localValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: approvedLiveAssets.map((asset, index) => index === 1
      ? { ...asset, sourceRef: 'http://localhost:3000/private/sold-sign.png', sourceUrl: 'http://localhost:3000/private/sold-sign.png' }
      : asset),
    live: true,
  })
  const privateValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: approvedLiveAssets.map((asset, index) => index === 2
      ? { ...asset, sourceRef: 'https://192.168.1.8/property.png', sourceUrl: 'https://192.168.1.8/property.png' }
      : asset),
    live: true,
  })
  const mockSchemeValidation = validateMarketingVideoAssets({
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    assets: approvedLiveAssets.map((asset, index) => index === 0
      ? { ...asset, sourceType: 'mock', sourceRef: 'mock://marketing-video-lab/asset.png', sourceUrl: 'mock://marketing-video-lab/asset.png' }
      : asset),
    live: true,
  })

  const lockState = createMarketingVideoSubmitLockState()
  const dryRunJob = buildMarketingVideoDryRunJob({ assets: approvedLiveAssets })
  const concurrentResults = await Promise.all([
    submitMarketingVideoMockJobWithLock({ lockState, job: dryRunJob, submitterId: 'submit-a' }),
    submitMarketingVideoMockJobWithLock({ lockState, job: dryRunJob, submitterId: 'submit-b' }),
  ])
  const acceptedCount = concurrentResults.filter(result => result.ok).length
  const rejectedCount = concurrentResults.filter(result => result.reason === 'duplicate_running_job').length

  const ok = healthyLiveValidation.ok === true &&
    placeholderValidation.ok === false &&
    placeholderValidation.findings.some(finding => finding.key === 'live_asset_placeholder_url') &&
    localValidation.ok === false &&
    localValidation.findings.some(finding => ['live_asset_requires_https', 'live_asset_private_or_local_url'].includes(finding.key)) &&
    privateValidation.ok === false &&
    privateValidation.findings.some(finding => finding.key === 'live_asset_private_or_local_url') &&
    mockSchemeValidation.ok === false &&
    mockSchemeValidation.findings.some(finding => ['live_asset_non_http_url', 'live_asset_mock_source_type'].includes(finding.key)) &&
    acceptedCount === 1 &&
    rejectedCount === 1

  return {
    ok,
    cardId: MARKETING_VIDEO_LAB_LIVE_SAFETY_CARD_ID,
    closeoutKey: MARKETING_VIDEO_LAB_LIVE_SAFETY_CLOSEOUT_KEY,
    providerSpendUsd: 0,
    liveProviderCalls: 0,
    healthyLiveValidation,
    placeholderValidation,
    localValidation,
    privateValidation,
    mockSchemeValidation,
    concurrentResults,
    summary: {
      acceptedCount,
      rejectedCount,
      placeholderRejected: placeholderValidation.ok === false,
      localRejected: localValidation.ok === false,
      privateRejected: privateValidation.ok === false,
      mockSchemeRejected: mockSchemeValidation.ok === false,
      providerSpendUsd: 0,
      liveProviderCalls: 0,
    },
  }
}
