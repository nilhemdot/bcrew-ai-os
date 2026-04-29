export const DOC_INVENTORY_CATEGORIES = [
  'Active doctrine',
  'Process & runbooks',
  'Source notes',
  'Specs',
  'Strategy reference',
  'Agent personas',
  'User profile',
  'Recent handoffs - active',
  'Recent audits - active',
  'Plan history',
  'Archive',
  'Local-private',
]

const CATEGORY_SET = new Set(DOC_INVENTORY_CATEGORIES)

const ACTIVE_DOCTRINE_PATHS = new Set([
  'AGENTS.md',
  'README.md',
  'SOUL.md',
  'docs/INDEX.md',
  'docs/README.md',
  'docs/business-strategy.md',
  'docs/source-registry.md',
  'docs/system-strategy.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
])

function normalize(value) {
  return String(value || '').trim()
}

function splitMarkdownTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => normalize(cell))
}

export function parseDocOtherTriageReport(source) {
  const byPath = new Map()
  for (const line of String(source || '').split('\n')) {
    if (!line.startsWith('| ')) continue
    const cells = splitMarkdownTableRow(line)
    if (cells.length < 6) continue
    const [relativePath, _currentCategory, proposedCategory, status, reason, ownerCard] = cells
    if (!relativePath.startsWith('docs/') && !relativePath.startsWith('README.md')) continue
    if (!CATEGORY_SET.has(proposedCategory)) continue
    byPath.set(relativePath, {
      path: relativePath,
      proposedCategory,
      status,
      reason,
      ownerCard,
    })
  }
  return byPath
}

export function classifyDocInventoryPath(relativePath, { triageByPath = new Map() } = {}) {
  const rel = normalize(relativePath)
  const triage = triageByPath.get(rel)
  if (triage?.proposedCategory && CATEGORY_SET.has(triage.proposedCategory)) {
    return triage.proposedCategory
  }

  if (ACTIVE_DOCTRINE_PATHS.has(rel)) return 'Active doctrine'
  if (rel.startsWith('docs/_archive/')) return 'Archive'
  if (rel.startsWith('docs/rebuild/plan-history/')) return 'Plan history'
  if (rel.startsWith('docs/process/')) return 'Process & runbooks'
  if (rel.startsWith('docs/source-notes/')) return 'Source notes'
  if (rel.startsWith('docs/specs/') || rel.startsWith('docs/superpowers/specs/')) return 'Specs'
  if (rel.startsWith('docs/superpowers/plans/')) return 'Specs'
  if (rel.startsWith('docs/strategy/') || rel.startsWith('docs/decks/')) return 'Strategy reference'
  if (rel.startsWith('docs/agents/')) return 'Agent personas'
  if (rel.startsWith('docs/users/')) return 'User profile'
  if (rel.startsWith('docs/handoffs/')) return 'Recent handoffs - active'
  if (rel.startsWith('docs/audits/')) return 'Recent audits - active'
  if (rel.startsWith('docs/rebuild/')) return 'Active doctrine'
  if (rel.startsWith('docs/research/')) return 'Specs'

  return 'Process & runbooks'
}

export function summarizeDocInventoryCategories(docs = []) {
  const summary = Object.fromEntries(DOC_INVENTORY_CATEGORIES.map(category => [category, 0]))
  for (const doc of docs) {
    const category = CATEGORY_SET.has(doc?.category) ? doc.category : 'Process & runbooks'
    summary[category] = (summary[category] || 0) + 1
  }
  return summary
}
