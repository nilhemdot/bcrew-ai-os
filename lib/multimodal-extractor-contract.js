export const MULTIMODAL_EXTRACTOR_CARD_ID = 'MULTIMODAL-EXTRACTOR-001'

export const MULTIMODAL_INPUT_TYPES = [
  'public_youtube_video',
  'authorized_skool_lesson',
  'authorized_myicor_lesson',
  'authorized_loom_video',
  'drive_video_or_screenshot',
  'web_demo_page',
  'transcript_only_artifact',
]

export const MULTIMODAL_EVIDENCE_LEVELS = [
  'metadata_only',
  'transcript_text',
  'audio_transcript',
  'visual_model_observation',
  'browser_session_observation',
  'screenshot_keyframe_reference',
]

export const MULTIMODAL_ACCESS_CLASSES = [
  'public_permitted',
  'authorized_paid_private',
  'internal_owned',
  'unknown_blocked',
]

export const MULTIMODAL_RECOMMENDATIONS = [
  'adopt',
  'adapt',
  'ignore',
  'needs_review',
]

function hasText(value) {
  return String(value || '').trim().length > 0
}

function includesAny(values = [], allowed = []) {
  return values.some(value => allowed.includes(value))
}

export function validateMultimodalExtractionEnvelope(envelope = {}) {
  const findings = []
  const requiredTextFields = [
    'sourceId',
    'sourceType',
    'sourceUrl',
    'accessClass',
    'rightsClass',
    'contentUseBoundary',
    'recommendation',
  ]
  for (const field of requiredTextFields) {
    if (!hasText(envelope[field])) findings.push(`${field}_missing`)
  }
  if (!MULTIMODAL_INPUT_TYPES.includes(envelope.sourceType)) findings.push('source_type_invalid')
  if (!MULTIMODAL_ACCESS_CLASSES.includes(envelope.accessClass)) findings.push('access_class_invalid')
  if (!MULTIMODAL_RECOMMENDATIONS.includes(envelope.recommendation)) findings.push('recommendation_invalid')
  const evidenceLevels = Array.isArray(envelope.evidenceLevels) ? envelope.evidenceLevels : []
  if (!evidenceLevels.length) findings.push('evidence_levels_missing')
  for (const level of evidenceLevels) {
    if (!MULTIMODAL_EVIDENCE_LEVELS.includes(level)) findings.push(`evidence_level_invalid:${level}`)
  }
  if (!envelope.route || typeof envelope.route !== 'object') findings.push('route_missing')
  for (const field of ['provider', 'model', 'authPath']) {
    if (!hasText(envelope.route?.[field])) findings.push(`route_${field}_missing`)
  }
  if (!Number.isFinite(Number(envelope.route?.estimatedCostUsd))) findings.push('route_estimated_cost_missing')
  if (!Array.isArray(envelope.observations) || !envelope.observations.length) findings.push('observations_missing')
  if (!Array.isArray(envelope.sourceAnchors) || !envelope.sourceAnchors.length) findings.push('source_anchors_missing')
  if (envelope.autoBacklogMutation === true) findings.push('auto_backlog_mutation_forbidden')

  const usesScreenshots = includesAny(evidenceLevels, ['screenshot_keyframe_reference', 'browser_session_observation'])
  if (usesScreenshots && !hasText(envelope.screenshotStoragePolicy)) findings.push('screenshot_storage_policy_missing')
  if (usesScreenshots && !hasText(envelope.visualEvidenceUseBoundary)) findings.push('visual_evidence_use_boundary_missing')

  if (envelope.sourceType === 'public_youtube_video' && envelope.accessClass !== 'public_permitted') {
    findings.push('public_youtube_must_use_public_permitted_access')
  }
  if (envelope.sourceType === 'public_youtube_video' && envelope.captureMethod === 'browser_bulk_screenshot') {
    findings.push('public_youtube_bulk_browser_screenshot_forbidden')
  }
  if (envelope.accessClass === 'authorized_paid_private') {
    if (envelope.accountPreflight?.approved !== true) findings.push('account_preflight_required')
    if (!hasText(envelope.accountPreflight?.approvedBy)) findings.push('account_preflight_approver_missing')
  }
  if (envelope.accessClass === 'unknown_blocked') findings.push('unknown_access_blocked')

  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildMultimodalExtractorContractSnapshot() {
  return {
    status: 'ready',
    cardId: MULTIMODAL_EXTRACTOR_CARD_ID,
    nextSprintName: 'Build Intel Extraction Implementation Sprint',
    extractionStarted: false,
    contractOnly: true,
    publicYouTubePolicy: {
      defaultDiscovery: 'official_or_permitted_routes_first',
      defaultUnderstanding: 'transcript_or_video_model_first',
      browserScreenshots: 'fallback_or_explicit_policy_only',
      bulkBrowserScreenshot: 'blocked',
    },
    paidPrivatePolicy: {
      requiresAccountPreflight: true,
      requiresContentUseBoundary: true,
      requiresScreenshotStoragePolicy: true,
      defaultState: 'requires_steve_access_decision',
    },
    requiredOutputFields: [
      'sourceId',
      'sourceType',
      'sourceUrl',
      'accessClass',
      'rightsClass',
      'contentUseBoundary',
      'evidenceLevels',
      'route.provider',
      'route.model',
      'route.authPath',
      'route.estimatedCostUsd',
      'sourceAnchors',
      'observations',
      'recommendation',
      'confidence',
      'skipReason',
    ],
    inputTypes: MULTIMODAL_INPUT_TYPES,
    evidenceLevels: MULTIMODAL_EVIDENCE_LEVELS,
    accessClasses: MULTIMODAL_ACCESS_CLASSES,
    recommendations: MULTIMODAL_RECOMMENDATIONS,
  }
}
