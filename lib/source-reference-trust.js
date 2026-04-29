import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSourceContracts } from './source-contracts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const ACTIVE_SOURCE_REFERENCE_FILES = [
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'docs/source-notes/myicro-training.md',
  'lib/foundation-db.js',
  'lib/foundation-surface-map.js',
  'public/foundation.js',
]

export const HISTORICAL_SOURCE_REFERENCE_CLASSIFICATIONS = [
  {
    sourceId: 'SRC-AGENT-SATISFACTION-001',
    classification: 'future-candidate',
    note: 'Referenced in Strategy Hub source-to-gap specs as a future ASI source identity. Not an active source contract yet.',
  },
  {
    sourceId: 'SRC-YOUTUBE-001',
    classification: 'historical-alias',
    note: 'Older audit shorthand. Current active planned YouTube intelligence source is SRC-YOUTUBE-INTEL-001.',
  },
  {
    sourceId: 'SRC-CREATOR-BLOGS-001',
    classification: 'historical-alias',
    note: 'Older audit shorthand. Current active creator/watchlist source is SRC-CREATOR-WATCHLIST-001.',
  },
  {
    sourceId: 'SRC-SKOOL-TRAINING-001',
    classification: 'historical-alias',
    note: 'Older audit shorthand. Current active Skool source contract is SRC-SKOOL-001.',
  },
  {
    sourceId: 'SRC-BOOK-NOTES-001',
    classification: 'historical-alias',
    note: 'Older audit shorthand for future research/library notes. Not active source truth.',
  },
]

export function extractSourceReferences(text) {
  return Array.from(new Set(
    Array.from(String(text || '').matchAll(/\bSRC-[A-Z0-9-]+-\d{3}\b/g)).map(match => match[0])
  )).sort()
}

export async function buildSourceReferenceTrustStatus({
  repoRoot = defaultRepoRoot,
  files = ACTIVE_SOURCE_REFERENCE_FILES,
  sourceContracts = getSourceContracts(),
} = {}) {
  const declaredSourceIds = new Set(sourceContracts.map(contract => contract.sourceId || contract.id).filter(Boolean))
  const fileReferences = []
  const undeclaredActiveReferences = []

  for (const relativePath of files) {
    const absolutePath = path.resolve(repoRoot, relativePath)
    if (!absolutePath.startsWith(repoRoot)) continue
    let text = ''
    try {
      text = await fs.readFile(absolutePath, 'utf8')
    } catch {
      continue
    }
    const references = extractSourceReferences(text)
    references.forEach(sourceId => {
      fileReferences.push({ sourceId, path: relativePath, declared: declaredSourceIds.has(sourceId) })
      if (!declaredSourceIds.has(sourceId)) undeclaredActiveReferences.push({ sourceId, path: relativePath })
    })
  }

  const referencedSourceIds = new Set(fileReferences.map(reference => reference.sourceId))
  const orphanSourceContracts = sourceContracts
    .filter(contract => contract.group === 'not-in-use' || contract.status === 'Not in use')
    .map(contract => contract.sourceId || contract.id)
    .filter(Boolean)

  return {
    generatedAt: new Date().toISOString(),
    status: undeclaredActiveReferences.length ? 'critical' : 'healthy',
    fileReferences,
    undeclaredActiveReferences,
    historicalClassifications: HISTORICAL_SOURCE_REFERENCE_CLASSIFICATIONS,
    orphanSourceContracts,
    summary: {
      activeFileCount: files.length,
      declaredSourceCount: sourceContracts.length,
      activeReferenceCount: fileReferences.length,
      uniqueActiveSourceReferenceCount: referencedSourceIds.size,
      undeclaredActiveReferenceCount: undeclaredActiveReferences.length,
      historicalClassifiedCount: HISTORICAL_SOURCE_REFERENCE_CLASSIFICATIONS.length,
      orphanSourceContractCount: orphanSourceContracts.length,
    },
    knownLimits: [
      'V1 blocks undeclared source IDs in active rebuild/source files only.',
      'Historical audits, old handoffs, and specs are classified in docs instead of being promoted into fake active source contracts.',
    ],
  }
}
