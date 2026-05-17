export const FOUNDATION_VERIFY_COVERAGE_SOURCE_PATHS = Object.freeze([
  'scripts/foundation-verify.mjs',
  'lib/foundation-verify-coverage-card-ids.js',
])

export async function readFoundationVerifyCoverageSource(repoRoot, readText) {
  const sources = await Promise.all(FOUNDATION_VERIFY_COVERAGE_SOURCE_PATHS.map(relativePath =>
    readText(repoRoot, relativePath)
  ))
  return sources.join('\n')
}
