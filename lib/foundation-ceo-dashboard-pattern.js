import fs from 'node:fs/promises'
import path from 'node:path'

export const CEO_DASHBOARD_PATTERN_DOC = 'docs/process/ceo-dashboard-pattern.md'

export const CEO_DASHBOARD_REQUIRED_FIELDS = [
  'whatChanged',
  'whereItLives',
  'whatToReview',
  'blockedOrAtRisk',
  'whatIsNext',
  'proofAndConfidence',
  'emptyState',
  'errorState',
]

export const CEO_DASHBOARD_REQUIRED_PHRASES = [
  'what changed',
  'where it lives',
  'what to review',
  'what is blocked',
  'what is next',
  'proof',
  'empty state',
  'error state',
]

function includesAll(text, phrases) {
  const lower = String(text || '').toLowerCase()
  return phrases.every(phrase => lower.includes(String(phrase || '').toLowerCase()))
}

export async function buildCeoDashboardPatternStatus({ repoRoot = process.cwd() } = {}) {
  const docPath = path.join(repoRoot, CEO_DASHBOARD_PATTERN_DOC)
  let source = ''
  try {
    source = await fs.readFile(docPath, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  const missingPhrases = CEO_DASHBOARD_REQUIRED_PHRASES.filter(phrase =>
    !source.toLowerCase().includes(phrase.toLowerCase())
  )
  const ok = Boolean(source) &&
    missingPhrases.length === 0 &&
    includesAll(source, ['control pattern', 'not a UI polish pass', 'Phase G'])

  return {
    status: ok ? 'healthy' : 'risk',
    docPath: CEO_DASHBOARD_PATTERN_DOC,
    requiredFields: CEO_DASHBOARD_REQUIRED_FIELDS,
    missingPhrases,
    uiImplementationIncluded: false,
    plainEnglish: 'CEO dashboard pattern is a control contract for future Foundation surfaces, not a Phase G UI polish implementation.',
  }
}
