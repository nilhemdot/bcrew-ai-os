const RUNTIME_MODEL_LITERAL_PATTERNS = [
  /\bgemini-\d+(?:\.\d+)+-[a-z][a-z0-9]*(?:-[a-z0-9]+)*\b/gi,
  /\b(?:openai-codex\/)?gpt-\d+(?:\.\d+)?(?:-[a-z0-9.]+)*\b/gi,
  /\bclaude-(?:\d|opus|sonnet|haiku)[a-z0-9.-]*(?:\[[^\]\s]+\])?\b/gi,
  /\bopus-\d+(?:\.\d+)?(?:-[a-z0-9.]+)*\b/gi,
]

const RUNTIME_MODEL_CONFIG_OWNER_PATHS = new Set([
  'lib/llm-router.js',
  'lib/llm-provider-pricing.js',
  'lib/gemini-video-brain-route.js',
  'lib/codex-direct-subscription-route.js',
  'lib/claude-code-review-brain-route.js',
  'lib/brain-fleet-model-capability-registry.js',
  'scripts/llm-route-control.mjs',
  'scripts/audit-llm-auth-paths.mjs',
  'scripts/process-llm-router-check.mjs',
  'scripts/process-gemini-video-brain-route-check.mjs',
  'scripts/process-codex-direct-subscription-route-check.mjs',
  'scripts/process-claude-code-review-brain-route-check.mjs',
])

function normalizePath(value = '') {
  return String(value || '').replace(/\\/g, '/')
}

function lineNumberForIndex(text, index) {
  if (!text || index < 0) return 1
  return text.slice(0, index).split(/\r?\n/).length
}

export function isRuntimeModelConfigOwnerPath(relativePath = '') {
  return RUNTIME_MODEL_CONFIG_OWNER_PATHS.has(normalizePath(relativePath))
}

export function findRuntimeModelLiteralsInText({ text = '' } = {}) {
  const source = String(text || '')
  const literals = []
  for (const pattern of RUNTIME_MODEL_LITERAL_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      if (!match[0]) continue
      literals.push({
        literal: match[0],
        line: lineNumberForIndex(source, match.index ?? 0),
      })
    }
  }
  const seen = new Set()
  return literals.filter(item => {
    const key = `${item.literal}:${item.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((left, right) => left.line - right.line || left.literal.localeCompare(right.literal))
}

export function buildRuntimeModelLiteralPolicyFindingInput({
  relativePath = 'synthetic.mjs',
  text = '',
} = {}) {
  const normalizedPath = normalizePath(relativePath)
  if (!/^scripts\/process-.*\.mjs$|^lib\//.test(normalizedPath)) {
    return {
      risk: false,
      classification: 'out_of_scan_scope',
      reason: 'Only lib modules and process-check scripts are scanned by this nightly detector.',
      literals: [],
    }
  }

  const literals = findRuntimeModelLiteralsInText({ text })
  if (!literals.length) {
    return {
      risk: false,
      classification: 'no_exact_model_literals',
      reason: 'No exact provider model literals found.',
      literals,
    }
  }

  if (isRuntimeModelConfigOwnerPath(normalizedPath)) {
    return {
      risk: false,
      classification: 'runtime_model_config_owner',
      reason: 'Exact provider model literals are owned by LLM route/config, pricing, or provider capability code.',
      literals,
    }
  }

  return {
    risk: true,
    classification: 'runtime_model_literal_outside_owner',
    reason: 'Exact provider model literals outside route/config ownership should move behind the LLM router, provider pricing, or capability records.',
    literals,
    firstLiteral: literals[0]?.literal || '',
    firstLine: literals[0]?.line || 1,
  }
}
