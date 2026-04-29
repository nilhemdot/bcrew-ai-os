import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const CARD_REFERENCE_ACTIVE_FILES = [
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-log.js',
  'lib/foundation-surface-map.js',
  'public/foundation.js',
]

const nonBacklogPrefixes = new Set([
  'DEC',
  'PARK',
  'PLUGIN',
  'Q',
  'SKILL',
  'SRC',
  'SYS',
  'TOOL',
])

function normalizeId(value) {
  return String(value || '').trim().toUpperCase()
}

export function isBacklogCardReference(value) {
  const id = normalizeId(value)
  if (!/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}$/.test(id)) return false
  const [prefix] = id.split('-')
  return !nonBacklogPrefixes.has(prefix)
}

export function extractCardReferences(text) {
  const refs = new Set()
  for (const match of String(text || '').matchAll(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/g)) {
    if (isBacklogCardReference(match[0])) refs.add(match[0])
  }
  return Array.from(refs).sort()
}

function buildStatusFromFileTexts(fileTexts, declaredCardIds) {
  const declared = new Set(Array.from(declaredCardIds || []).map(normalizeId))
  const findings = []
  const scannedFiles = []
  let referenceCount = 0

  for (const [relativePath, text] of Object.entries(fileTexts || {})) {
    scannedFiles.push(relativePath)
    for (const cardId of extractCardReferences(text)) {
      referenceCount += 1
      if (!declared.has(cardId)) {
        findings.push({
          severity: 'critical',
          type: 'missing_backlog_card',
          cardId,
          path: relativePath,
          detail: `${relativePath} references ${cardId}, but that card does not exist in the live backlog.`,
        })
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: findings.some(finding => finding.severity === 'critical') ? 'critical' : 'healthy',
    scannedFiles: scannedFiles.sort(),
    findings,
    summary: {
      scannedFileCount: scannedFiles.length,
      referenceCount,
      missingCardReferenceCount: findings.length,
    },
    knownLimits: [
      'V1 scans active rebuild docs and live Foundation code only. Historical handoffs, audits, specs, and archived docs are not blocking inputs yet.',
      'Source IDs, decision IDs, plugin IDs, skill IDs, tool IDs, open-question IDs, and system IDs are intentionally excluded because they are not backlog cards.',
    ],
  }
}

export async function buildCardReferenceTrustStatus({
  repoRoot = defaultRepoRoot,
  declaredCardIds = [],
  files = CARD_REFERENCE_ACTIVE_FILES,
} = {}) {
  const fileTexts = {}
  for (const relativePath of files) {
    const absolutePath = path.resolve(repoRoot, relativePath)
    if (!absolutePath.startsWith(repoRoot)) continue
    try {
      fileTexts[relativePath] = await fs.readFile(absolutePath, 'utf8')
    } catch (error) {
      fileTexts[relativePath] = `MISSING_FILE_READ_ERROR ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return buildStatusFromFileTexts(fileTexts, declaredCardIds)
}

export function buildSyntheticPhantomCardReferenceStatus() {
  return buildStatusFromFileTexts(
    {
      'docs/rebuild/synthetic-phantom.md': 'This synthetic proof references PHANTOM-CARD-CHECK-999.',
    },
    ['PHANTOM-CARD-CHECK-001'],
  )
}
