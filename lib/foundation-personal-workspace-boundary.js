import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const PERSONAL_WORKSPACE_BOUNDARY_VERSION = 1

export const PERSONAL_WORKSPACE_PRIVATE_PATH_RULES = [
  {
    pattern: 'USER.md',
    className: 'private-local-root',
    allowedProofMode: 'metadata-only',
    description: 'Private user context for local sessions.',
  },
  {
    pattern: 'MEMORY.md',
    className: 'private-local-root',
    allowedProofMode: 'metadata-only',
    description: 'Private long-term memory for local main sessions.',
  },
  {
    pattern: 'memory/*.md',
    className: 'private-local-memory',
    allowedProofMode: 'metadata-only',
    description: 'Private daily memory notes.',
  },
  {
    pattern: 'SOUL.md',
    className: 'workspace-identity',
    allowedProofMode: 'metadata-only',
    description: 'Local assistant behavior and identity context.',
  },
  {
    pattern: 'TOOLS.md',
    className: 'machine-local',
    allowedProofMode: 'metadata-only',
    description: 'Machine-specific tool notes.',
  },
  {
    pattern: 'HEARTBEAT.md',
    className: 'private-local-root',
    allowedProofMode: 'metadata-only',
    description: 'Local heartbeat checklist and reminders.',
  },
  {
    pattern: 'IDENTITY.md',
    className: 'workspace-identity',
    allowedProofMode: 'metadata-only',
    description: 'Local assistant identity state.',
  },
  {
    pattern: '.openclaw/**',
    className: 'local-runtime-state',
    allowedProofMode: 'metadata-only',
    description: 'Local OpenClaw runtime state.',
  },
  {
    pattern: '.claude/**',
    className: 'local-runtime-state',
    allowedProofMode: 'metadata-only',
    description: 'Local Claude runtime state.',
  },
]

export const PERSONAL_WORKSPACE_PUBLIC_ROUTES = [
  'docs/process/**',
  'docs/rebuild/**',
  'docs/audits/**',
  'docs/handoffs/**',
  'lib/**',
  'scripts/**',
  'public/**',
]

const SYNTHETIC_PRIVATE_SENTINELS = [
  'SYNTHETIC_PRIVATE_SENTINEL_ALPHA_4f6b3a',
  'SYNTHETIC_PRIVATE_SENTINEL_BETA_9c2d11',
]

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function metadataFingerprint(metadata) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      relativePath: metadata.relativePath,
      className: metadata.className,
      exists: metadata.exists,
      size: metadata.size,
      mtimeMs: metadata.mtimeMs,
    }), 'utf8')
    .digest('hex')
}

function isMemoryDailyPath(relativePath) {
  return /^memory\/[^/]+\.md$/.test(relativePath)
}

export function classifyPersonalWorkspacePath(relativePath) {
  const normalized = normalizePath(relativePath)
  if (normalized === 'USER.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[0]
  if (normalized === 'MEMORY.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[1]
  if (isMemoryDailyPath(normalized)) return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[2]
  if (normalized === 'SOUL.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[3]
  if (normalized === 'TOOLS.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[4]
  if (normalized === 'HEARTBEAT.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[5]
  if (normalized === 'IDENTITY.md') return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[6]
  if (normalized === '.openclaw' || normalized.startsWith('.openclaw/')) return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[7]
  if (normalized === '.claude' || normalized.startsWith('.claude/')) return PERSONAL_WORKSPACE_PRIVATE_PATH_RULES[8]
  return null
}

async function statMetadata(repoRoot, relativePath) {
  const rule = classifyPersonalWorkspacePath(relativePath)
  if (!rule) return null
  const absolutePath = path.join(repoRoot, relativePath)
  try {
    const stat = await fs.stat(absolutePath)
    const metadata = {
      relativePath,
      className: rule.className,
      exists: true,
      isDirectory: stat.isDirectory(),
      size: stat.size,
      mtimeMs: Math.round(stat.mtimeMs),
      allowedProofMode: rule.allowedProofMode,
      contentRead: false,
      contentCopied: false,
    }
    return {
      ...metadata,
      metadataFingerprint: metadataFingerprint(metadata),
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    const metadata = {
      relativePath,
      className: rule.className,
      exists: false,
      isDirectory: false,
      size: 0,
      mtimeMs: 0,
      allowedProofMode: rule.allowedProofMode,
      contentRead: false,
      contentCopied: false,
    }
    return {
      ...metadata,
      metadataFingerprint: metadataFingerprint(metadata),
    }
  }
}

async function listMemoryDailyPaths(repoRoot) {
  try {
    const entries = await fs.readdir(path.join(repoRoot, 'memory'), { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => `memory/${entry.name}`)
      .sort()
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

export async function collectPersonalWorkspacePrivateMetadata({ repoRoot = process.cwd() } = {}) {
  const basePaths = ['USER.md', 'MEMORY.md', 'SOUL.md', 'TOOLS.md', 'HEARTBEAT.md', 'IDENTITY.md', '.openclaw', '.claude']
  const paths = [...basePaths, ...await listMemoryDailyPaths(repoRoot)]
  const metadata = []
  for (const relativePath of paths) {
    const item = await statMetadata(repoRoot, relativePath)
    if (item) metadata.push(item)
  }
  return metadata
}

export function buildSyntheticPrivacyLeakProof() {
  const safeTrackedOutput = [
    'Private workspace files are checked by metadata only.',
    'Allowed proof fields are relative path, class, existence, size, mtime, and metadata fingerprint.',
  ].join('\n')
  const leakyTrackedOutput = [
    'Synthetic fixture body:',
    SYNTHETIC_PRIVATE_SENTINELS[0],
  ].join('\n')
  const containsSentinel = value => SYNTHETIC_PRIVATE_SENTINELS.some(sentinel => String(value || '').includes(sentinel))

  return {
    ok: !containsSentinel(safeTrackedOutput) && containsSentinel(leakyTrackedOutput),
    mode: 'synthetic-sentinel-fixture',
    realPrivateFilesRead: false,
    realPrivateContentCopied: false,
    safeOutputClean: !containsSentinel(safeTrackedOutput),
    sentinelLeakDetected: containsSentinel(leakyTrackedOutput),
    sentinelValuesReturned: false,
  }
}

export async function buildPersonalWorkspaceBoundaryStatus({ repoRoot = process.cwd(), includeSynthetic = true } = {}) {
  const privateMetadata = await collectPersonalWorkspacePrivateMetadata({ repoRoot })
  const syntheticProof = includeSynthetic ? buildSyntheticPrivacyLeakProof() : null
  const contentReadCount = privateMetadata.filter(item => item.contentRead).length
  const contentCopiedCount = privateMetadata.filter(item => item.contentCopied).length
  const ok = contentReadCount === 0 &&
    contentCopiedCount === 0 &&
    privateMetadata.every(item => item.allowedProofMode === 'metadata-only') &&
    (!syntheticProof || syntheticProof.ok)

  return {
    status: ok ? 'healthy' : 'risk',
    schemaVersion: PERSONAL_WORKSPACE_BOUNDARY_VERSION,
    realPrivateProofMode: 'metadata-only',
    realPrivateFilesRead: false,
    realPrivateContentCopied: false,
    privatePathRules: PERSONAL_WORKSPACE_PRIVATE_PATH_RULES.map(rule => ({
      pattern: rule.pattern,
      className: rule.className,
      allowedProofMode: rule.allowedProofMode,
      description: rule.description,
    })),
    publicRoutes: PERSONAL_WORKSPACE_PUBLIC_ROUTES,
    privateMetadata,
    summary: {
      privatePathCount: privateMetadata.length,
      existingPrivatePathCount: privateMetadata.filter(item => item.exists).length,
      contentReadCount,
      contentCopiedCount,
      syntheticSentinelProof: syntheticProof?.ok ?? null,
    },
    syntheticProof,
    plainEnglish: 'Real private workspace files are checked by metadata only. Leak tests use synthetic sentinel fixtures, not private content.',
  }
}
