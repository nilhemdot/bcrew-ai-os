export const MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID = 'sold-sign-mascot'

export const MARKETING_VIDEO_TEMPLATES = [
  {
    templateId: MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
    label: 'Sold sign mascot scene',
    brandLaneId: 'benson-crew',
    requiredRoles: ['mascot', 'sold_sign', 'property'],
    optionalRoles: ['brand', 'prop', 'reference'],
    defaultPromptFields: {
      action: 'The mascot walks into frame and plants the sold sign in the ground.',
      scene: 'In front of a recently sold residential home.',
      camera: 'Stable vertical reel with a smooth push-in after the sign is planted.',
      mood: 'Upbeat, polished, local real estate, exciting but still credible.',
      durationSeconds: 8,
      aspectRatio: '9:16',
      resolution: '720p',
      generateAudio: false,
    },
    brandGuardrails: [
      'Preserve the mascot identity and do not redesign it.',
      'Use the sold sign as the central prop while avoiding unreadable generated text.',
      'Keep the property image as the scene/background reference.',
      'Do not invent extra brokerage logos, extra signs, or fake client details.',
      'Avoid distorted logos, warped mascot features, strange limbs, or chaotic AI artifacts.',
    ],
    negativeGuidance: [
      'distorted text',
      'warped mascot',
      'extra characters',
      'extra signs',
      'fake brokerage claims',
      'surreal fever-dream background',
      'unreadable logo',
      'strange limbs',
    ],
  },
]

export function normalizeMarketingVideoText(value) {
  return String(value || '').trim()
}

export function getMarketingVideoTemplate(templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID) {
  return MARKETING_VIDEO_TEMPLATES.find(template => template.templateId === templateId) || null
}

function normalizePromptFields(template, promptFields = {}) {
  return {
    ...(template?.defaultPromptFields || {}),
    ...(promptFields || {}),
  }
}

function labelAsset(asset = {}) {
  const label = normalizeMarketingVideoText(asset.label || asset.name || asset.id)
  return label || 'unnamed asset'
}

function assetsByRole(assets = []) {
  const roleMap = new Map()
  for (const asset of assets) {
    const role = normalizeMarketingVideoText(asset.role || asset.roleDefault)
    if (!role) continue
    if (!roleMap.has(role)) roleMap.set(role, [])
    roleMap.get(role).push(asset)
  }
  return roleMap
}

export function buildMarketingVideoAssetInstructions({ assets = [], templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID } = {}) {
  const template = getMarketingVideoTemplate(templateId)
  const roleMap = assetsByRole(assets)
  const lines = []

  for (const role of [...(template?.requiredRoles || []), ...(template?.optionalRoles || [])]) {
    const matchingAssets = roleMap.get(role) || []
    if (!matchingAssets.length) continue
    const labels = matchingAssets.map(labelAsset).join(', ')
    if (role === 'mascot') lines.push(`- mascot: keep recognizable and consistent (${labels})`)
    else if (role === 'sold_sign') lines.push(`- sold sign: use as the central prop; avoid relying on generated readable text (${labels})`)
    else if (role === 'property') lines.push(`- property: use as the setting/background reference (${labels})`)
    else if (role === 'brand') lines.push(`- brand: preserve visual style; do not invent additional marks (${labels})`)
    else lines.push(`- ${role.replace(/_/g, ' ')}: use as supporting reference (${labels})`)
  }

  return lines
}

export function compileMarketingVideoPrompt({
  templateId = MARKETING_VIDEO_SOLD_SIGN_TEMPLATE_ID,
  assets = [],
  promptFields = {},
  brandLaneId,
} = {}) {
  const template = getMarketingVideoTemplate(templateId)
  if (!template) {
    throw new Error(`Unknown marketing video template: ${templateId}`)
  }

  const fields = normalizePromptFields(template, promptFields)
  const assetInstructions = buildMarketingVideoAssetInstructions({ assets, templateId })
  const effectiveBrandLaneId = normalizeMarketingVideoText(brandLaneId) || template.brandLaneId
  const brandGuardrails = template.brandGuardrails || []
  const negativeGuidance = [
    ...(template.negativeGuidance || []),
    ...String(fields.negativeGuidance || '').split(',').map(item => item.trim()).filter(Boolean),
  ]

  const sections = [
    `Create an ${fields.durationSeconds || 8}-second vertical social video for Benson Crew real estate.`,
    '',
    'Use the provided reference images as visual ingredients:',
    ...assetInstructions,
    '',
    `Scene: ${fields.scene}`,
    `Action: ${fields.action}`,
    `Style: ${fields.mood}`,
    `Camera: ${fields.camera}`,
    `Format: ${fields.aspectRatio || '9:16'} social video at ${fields.resolution || '720p'}.`,
    '',
    'Brand guardrails:',
    ...brandGuardrails.map(rule => `- ${rule}`),
    '',
    `Avoid: ${negativeGuidance.join(', ')}.`,
  ]

  return {
    templateId,
    templateLabel: template.label,
    brandLaneId: effectiveBrandLaneId,
    promptFields: fields,
    assetInstructions,
    brandGuardrails,
    negativeGuidance,
    compiledPrompt: sections.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  }
}

