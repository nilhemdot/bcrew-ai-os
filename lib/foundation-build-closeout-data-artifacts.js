import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_DIR = 'data/foundation-build-closeouts'
export const FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS = [
  {
    artifactId: 'source-newsletter-records',
    relativePath: `${FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_DIR}/source-newsletter-records.json`,
    exportName: 'sourceNewsletterCloseoutRecords',
    migratedFrom: 'lib/foundation-build-closeout-source-newsletter-records.js',
    family: 'source-newsletter',
  },
]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const REQUIRED_TEXT_FIELDS = [
  'key',
  'systemArea',
  'status',
  'acceptanceState',
  'whatChanged',
  'whatItDoes',
  'whyItMatters',
  'proofStatus',
  'reviewNext',
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => normalizeText(value))
    .filter(Boolean)
}

function assertArtifactId(value = '') {
  const artifactId = normalizeText(value)
  if (!/^[a-z0-9-]+$/.test(artifactId)) {
    throw new Error(`Invalid closeout data artifact id: ${value}`)
  }
  return artifactId
}

function artifactDefinitionForId(artifactId = '') {
  const normalized = assertArtifactId(artifactId)
  const definition = FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS.find(item => item.artifactId === normalized)
  if (!definition) throw new Error(`Unknown closeout data artifact: ${artifactId}`)
  return definition
}

function artifactAbsolutePath(definition = {}) {
  const absolutePath = path.resolve(repoRoot, definition.relativePath)
  const dataRoot = path.resolve(repoRoot, FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_DIR)
  if (!absolutePath.startsWith(dataRoot + path.sep)) {
    throw new Error(`Closeout data artifact path escapes data directory: ${definition.relativePath}`)
  }
  return absolutePath
}

export function validateFoundationBuildCloseoutDataArtifactRecords(records = []) {
  const normalizedRecords = Array.isArray(records) ? records : []
  const keys = new Set()
  const invalid = []
  const duplicateKeys = []

  for (const record of normalizedRecords) {
    const key = normalizeText(record?.key)
    if (keys.has(key)) duplicateKeys.push(key)
    if (key) keys.add(key)
    const hasRequiredText = REQUIRED_TEXT_FIELDS.every(field => normalizeText(record?.[field]))
    const hasLists = normalizeList(record?.backlogIds).length > 0 &&
      normalizeList(record?.whereItLives).length > 0 &&
      normalizeList(record?.proofCommands).length > 0
    if (!key || !hasRequiredText || !hasLists) invalid.push(key || '<missing-key>')
  }

  return {
    ok: invalid.length === 0 && duplicateKeys.length === 0,
    recordCount: normalizedRecords.length,
    invalid,
    duplicateKeys,
    keys: Array.from(keys),
  }
}

export function loadFoundationBuildCloseoutDataArtifact(artifactId = '') {
  const definition = artifactDefinitionForId(artifactId)
  const source = fs.readFileSync(artifactAbsolutePath(definition), 'utf8')
  const records = JSON.parse(source)
  const validation = validateFoundationBuildCloseoutDataArtifactRecords(records)
  if (!validation.ok) {
    throw new Error(`Invalid closeout data artifact ${artifactId}: invalid=${validation.invalid.join(', ')} duplicates=${validation.duplicateKeys.join(', ')}`)
  }
  return records.map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    mentionedBacklogIds: normalizeList(record.mentionedBacklogIds),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

export function buildFoundationBuildCloseoutDataArtifactSnapshot() {
  return FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS.map(definition => {
    const records = loadFoundationBuildCloseoutDataArtifact(definition.artifactId)
    const validation = validateFoundationBuildCloseoutDataArtifactRecords(records)
    return {
      ...definition,
      recordCount: records.length,
      validation,
      keys: records.map(record => record.key),
    }
  })
}
