export const DOC_UPDATE_ALLOWLIST = new Set([
  'docs/strategy/quarterly-priorities.md',
  'docs/strategy/strategic-issues.md',
  'docs/strategy/department-mandates.md',
])

export function isDocUpdateAllowlisted(docPath) {
  return DOC_UPDATE_ALLOWLIST.has(docPath)
}
