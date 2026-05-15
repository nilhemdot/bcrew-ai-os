export const DEFAULT_FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS = 20000

function normalizePositiveInteger(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback
}

export function getFoundationVerifySlowSectionBudgetMs(env = process.env) {
  return normalizePositiveInteger(
    env.FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS,
    DEFAULT_FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS,
  )
}

export function resolveFoundationVerifySectionOwner(label = '') {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('clickup')) {
    return {
      owner: 'Foundation Source Health',
      nextAction: 'Inspect ClickUp source-health verification latency and bounded degraded-state behavior.',
    }
  }
  if (normalized.includes('foundation-hub')) {
    return {
      owner: 'Foundation Runtime',
      nextAction: 'Inspect Foundation Hub payload size, route split, and diagnostics fetch budget.',
    }
  }
  if (normalized.includes('kpi') || normalized.includes('sheets') || normalized.includes('slack') || normalized.includes('missive')) {
    return {
      owner: 'Foundation Connectors',
      nextAction: 'Inspect connector health check latency and fail-soft source-health handling.',
    }
  }
  return {
    owner: 'Foundation Process',
    nextAction: 'Inspect this verifier section before adding more checks to the gate.',
  }
}

export function buildFoundationVerifySlowSectionRows(sections = [], options = {}) {
  const budgetMs = normalizePositiveInteger(options.budgetMs, getFoundationVerifySlowSectionBudgetMs(options.env))
  return (Array.isArray(sections) ? sections : [])
    .filter(section => Number(section?.durationMs || 0) > budgetMs)
    .map(section => {
      const owner = resolveFoundationVerifySectionOwner(section.label)
      return {
        label: String(section.label || ''),
        durationMs: Number(section.durationMs || 0),
        budgetMs,
        owner: owner.owner,
        nextAction: owner.nextAction,
      }
    })
    .sort((a, b) => b.durationMs - a.durationMs)
}

export function buildFoundationVerifySlowBudgetDogfoodProof() {
  const rows = buildFoundationVerifySlowSectionRows([
    { label: 'health:clickup:verify', durationMs: 45000 },
    { label: 'fast:local-check', durationMs: 250 },
  ], { budgetMs: 20000 })
  return {
    ok: rows.length === 1 &&
      rows[0].label === 'health:clickup:verify' &&
      rows[0].owner === 'Foundation Source Health' &&
      rows[0].nextAction.includes('ClickUp'),
    rows,
    dogfoodInvariant: 'A synthetic slow ClickUp verifier section is reported over budget with owner and next action while fast sections stay out of the report.',
  }
}
