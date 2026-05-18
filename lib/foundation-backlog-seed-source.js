export const FOUNDATION_BACKLOG_SEED_CHUNK_PATHS = [
  'lib/foundation-backlog-seed-chunks/chunk-001.js',
  'lib/foundation-backlog-seed-chunks/chunk-002.js',
  'lib/foundation-backlog-seed-chunks/chunk-003.js',
  'lib/foundation-backlog-seed-chunks/chunk-004.js',
  'lib/foundation-backlog-seed-chunks/chunk-005.js',
]

export const FOUNDATION_BACKLOG_SEED_SOURCE_PATHS = [
  'lib/foundation-backlog-seed.js',
  ...FOUNDATION_BACKLOG_SEED_CHUNK_PATHS,
]

export async function readFoundationBacklogSeedSourceBundle({ readRepoFile } = {}) {
  if (typeof readRepoFile !== 'function') {
    throw new Error('readFoundationBacklogSeedSourceBundle requires a readRepoFile function.')
  }
  const sources = await Promise.all(FOUNDATION_BACKLOG_SEED_SOURCE_PATHS.map(filePath => readRepoFile(filePath)))
  return sources.join('\n')
}
