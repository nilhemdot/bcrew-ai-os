#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const protectedHandoffs = new Set([
  'docs/handoffs/2026-04-17-src-fub-001-validation-packet.md',
  'docs/handoffs/2026-04-20-kpi-system-audit-checkpoint.md',
  'docs/handoffs/2026-04-21-ai-deal-review-checklist.md',
  'docs/handoffs/2026-04-21-deal-review-queue-model.md',
  'docs/handoffs/2026-04-28-foundation-hard-checkpoint.md',
])

const protectedAudits = new Set([
  'docs/audits/2026-04-26-foundation-menu-and-systems-audit.md',
  'docs/audits/2026-04-28-dev-process-audit.md',
  'docs/audits/2026-04-28-extraction-lane-item-shape.md',
])

const retireMoves = [
  {
    from: 'docs/rebuild/rebuild-master-plan.md',
    to: 'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md',
    reason: 'Old rebuild plan preserved as history; docs/rebuild/current-plan.md is active doctrine.',
  },
  {
    from: 'docs/rebuild-decisions.md',
    to: 'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
    reason: 'Old rebuild decisions preserved as history; live decisions/backlog/current-plan are active truth.',
  },
]

const safeDeleteRoots = [
  '.safe-delete',
  'safe-delete',
  'docs/_archive/safe-delete',
  'docs/_archive/safe_delete',
]

const safeDeleteAllowlistNames = new Set([
  'BCrew-Buddy',
  'BCrew-Buddy-duplicate',
  'bcrew-buddy-duplicate',
  'node_modules',
  '.venv',
])

const protectedPaths = [
  'node_modules',
  'bcrew-buddy-reference',
  'FUBZahnd',
  'zahnd-team-dashboard/src',
]

function toRepoPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/')
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function listMarkdownFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  try {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => `${relativeDir}/${entry.name}`)
      .sort()
  } catch {
    return []
  }
}

async function ensureDir(relativeDir) {
  await fs.mkdir(path.join(repoRoot, relativeDir), { recursive: true })
}

async function moveFile(from, to, apply) {
  await ensureDir(path.dirname(to))
  const fromExists = await exists(from)
  const toExists = await exists(to)
  if (fromExists && apply) await fs.rename(path.join(repoRoot, from), path.join(repoRoot, to))
  return {
    from,
    to,
    action: fromExists && apply ? 'moved' : toExists ? 'already_moved' : fromExists ? 'would_move' : 'source_missing',
  }
}

async function buildArchiveCandidates() {
  const handoffs = (await listMarkdownFiles('docs/handoffs'))
    .filter(file => !file.endsWith('/README.md') && !file.endsWith('/INDEX.md') && !protectedHandoffs.has(file))
    .map(file => ({ type: 'handoff', from: file, to: file.replace('docs/handoffs/', 'docs/_archive/handoffs/') }))

  const audits = (await listMarkdownFiles('docs/audits'))
    .filter(file => !file.endsWith('/INDEX.md') && !protectedAudits.has(file))
    .map(file => ({ type: 'audit', from: file, to: file.replace('docs/audits/', 'docs/_archive/audits/') }))

  const research = (await listMarkdownFiles('docs/research'))
    .map(file => ({ type: 'research', from: file, to: file.replace('docs/research/', 'docs/_archive/research/') }))

  return [...handoffs, ...audits, ...research]
}

async function applyDocArchive(apply) {
  const candidates = await buildArchiveCandidates()
  const movedFiles = []
  for (const candidate of candidates) {
    movedFiles.push({
      ...candidate,
      ...(await moveFile(candidate.from, candidate.to, apply)),
    })
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    plainEnglish: 'Historical handoffs, audits, and research docs were moved into docs/_archive so active folders stop looking like current operating truth. Files are preserved, not deleted.',
    movedFiles,
    protectedFiles: [
      ...Array.from(protectedHandoffs).sort().map(file => ({ type: 'handoff', path: file, reason: 'Still referenced by active source contracts, verifier, or rebuild docs.' })),
      ...Array.from(protectedAudits).sort().map(file => ({ type: 'audit', path: file, reason: 'Still referenced by active source contracts, verifier, or rebuild docs.' })),
    ],
    summary: movedFiles.reduce((acc, file) => {
      acc.total += 1
      acc.byType[file.type] = (acc.byType[file.type] || 0) + 1
      acc.byAction[file.action] = (acc.byAction[file.action] || 0) + 1
      return acc
    }, { total: 0, byType: {}, byAction: {} }),
  }

  await ensureDir('docs/process')
  await fs.writeFile(
    path.join(repoRoot, 'docs/process/doc-archive-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await ensureDir('docs/_archive')
  await fs.writeFile(
    path.join(repoRoot, 'docs/_archive/README.md'),
    [
      '# Archived Foundation Evidence',
      '',
      'Historical handoffs, audits, and research docs live here as evidence.',
      '',
      'Use active docs first:',
      '',
      '- `docs/rebuild/current-plan.md`',
      '- `docs/rebuild/current-state.md`',
      '- `docs/system-strategy.md`',
      '- live Foundation Backlog',
      '',
      'Do not treat archived files as current operating truth unless a current doc or backlog card promotes them.',
      '',
    ].join('\n'),
  )
  return manifest
}

async function applyRebuildRetire(apply) {
  const movedFiles = []
  for (const move of retireMoves) {
    movedFiles.push({
      ...move,
      ...(await moveFile(move.from, move.to, apply)),
    })
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    plainEnglish: 'Stale rebuild docs were moved into plan history. Current plan and current state remain the active rebuild truth.',
    movedFiles,
    activeDocs: [
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/rebuild/current-runtime-map.md',
      'docs/rebuild/intelligence-pipeline.md',
      'docs/rebuild/agent-architecture.md',
      'docs/rebuild/doc-cleanup-plan.md',
    ],
  }
  await fs.writeFile(
    path.join(repoRoot, 'docs/process/rebuild-doc-retire-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  return manifest
}

async function collectSafeDeleteEntries() {
  const entries = []
  for (const root of safeDeleteRoots) {
    if (!(await exists(root))) continue
    const absoluteRoot = path.join(repoRoot, root)
    const children = await fs.readdir(absoluteRoot, { withFileTypes: true }).catch(() => [])
    for (const child of children) {
      const relativePath = `${root}/${child.name}`
      const allowed = safeDeleteAllowlistNames.has(child.name)
      entries.push({
        path: relativePath,
        name: child.name,
        allowed,
        action: allowed ? 'delete' : 'refuse',
        reason: allowed
          ? 'Regenerable junk inside an explicit safe-delete archive.'
          : 'Refused because it is inside safe-delete but not on the deletion allowlist.',
      })
    }
  }
  return entries
}

async function directorySize(relativePath) {
  let total = 0
  async function walk(absolutePath) {
    const stat = await fs.lstat(absolutePath)
    if (stat.isDirectory()) {
      const children = await fs.readdir(absolutePath)
      for (const child of children) await walk(path.join(absolutePath, child))
      return
    }
    total += stat.size
  }
  try {
    await walk(path.join(repoRoot, relativePath))
  } catch {
    return 0
  }
  return total
}

async function applyArchiveRetire(apply) {
  const entries = await collectSafeDeleteEntries()
  const deletedEntries = []
  const refusedEntries = []
  let bytesDeleted = 0

  for (const entry of entries) {
    if (!entry.allowed) {
      refusedEntries.push(entry)
      continue
    }
    const size = await directorySize(entry.path)
    if (apply) await fs.rm(path.join(repoRoot, entry.path), { recursive: true, force: true })
    deletedEntries.push({
      ...entry,
      bytes: size,
      action: apply ? 'deleted' : 'would_delete',
    })
    if (apply) bytesDeleted += size
  }

  const protectedPathStatus = []
  for (const protectedPath of protectedPaths) {
    protectedPathStatus.push({
      path: protectedPath,
      exists: await exists(protectedPath),
      protected: true,
      reason: 'Explicit no-touch path for ARCHIVE-RETIRE-001.',
    })
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    plainEnglish: entries.length
      ? 'Only allowlisted regenerable junk inside explicit safe-delete archives was eligible for deletion. Any non-allowlisted item was refused and recorded.'
      : 'No explicit safe-delete archive was present, so nothing was deleted and the script did not improvise.',
    allowlist: Array.from(safeDeleteAllowlistNames).sort(),
    searchedRoots: safeDeleteRoots,
    deletedEntries,
    refusedEntries,
    protectedPathStatus,
    summary: {
      safeDeleteEntryCount: entries.length,
      deletedCount: deletedEntries.length,
      refusedCount: refusedEntries.length,
      bytesDeleted,
    },
  }

  await fs.writeFile(
    path.join(repoRoot, 'docs/process/archive-retire-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  return manifest
}

function printSummary(label, manifest) {
  console.log(`${label}: ${manifest.plainEnglish}`)
  console.log(JSON.stringify(manifest.summary || {}, null, 2))
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const runArchive = args.has('--archive') || args.has('--all')
  const runRebuildRetire = args.has('--rebuild-retire') || args.has('--all')
  const runArchiveRetire = args.has('--archive-retire') || args.has('--all')

  if (!runArchive && !runRebuildRetire && !runArchiveRetire) {
    console.log('Usage: npm run phase-d:cleanup -- --all --apply')
    console.log('Flags: --archive, --rebuild-retire, --archive-retire, --all, --apply')
    return
  }

  if (runArchive) printSummary('DOC-ARCHIVE-AUTO-001', await applyDocArchive(apply))
  if (runRebuildRetire) printSummary('REBUILD-DOCS-RETIRE-001', await applyRebuildRetire(apply))
  if (runArchiveRetire) printSummary('ARCHIVE-RETIRE-001', await applyArchiveRetire(apply))
}

main().catch(error => {
  console.error('Phase D cleanup failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
