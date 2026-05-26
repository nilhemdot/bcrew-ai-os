export const GEMINI_API_PRICING_SOURCE_URL = 'https://ai.google.dev/gemini-api/docs/pricing'

export const GEMINI_STANDARD_PRICING_BY_MODEL = Object.freeze({
  'gemini-3.5-flash': Object.freeze({
    inputPerMillionUsd: 1.50,
    outputPerMillionUsd: 9.00,
    label: 'Gemini 3.5 Flash standard paid tier',
  }),
  'gemini-2.5-flash': Object.freeze({
    inputPerMillionUsd: 0.30,
    outputPerMillionUsd: 2.50,
    label: 'Gemini 2.5 Flash standard paid tier',
  }),
})

export const GEMINI_STANDARD_PRICING_DEFAULT_MODEL = 'gemini-3.5-flash'

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function geminiStandardPricingForModel(model = '') {
  const modelKey = text(model) || GEMINI_STANDARD_PRICING_DEFAULT_MODEL
  return GEMINI_STANDARD_PRICING_BY_MODEL[modelKey] ||
    GEMINI_STANDARD_PRICING_BY_MODEL[GEMINI_STANDARD_PRICING_DEFAULT_MODEL]
}

export function estimateGeminiStandardTokenCostUsd({
  model = GEMINI_STANDARD_PRICING_DEFAULT_MODEL,
  inputTokens = 0,
  outputTokens = 0,
} = {}) {
  const pricing = geminiStandardPricingForModel(model)
  return (number(inputTokens) / 1_000_000) * pricing.inputPerMillionUsd +
    (number(outputTokens) / 1_000_000) * pricing.outputPerMillionUsd
}
