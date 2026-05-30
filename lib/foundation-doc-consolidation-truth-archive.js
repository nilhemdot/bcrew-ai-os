import {
  DOC_INVENTORY_CATEGORIES,
  classifyDocInventoryPath,
  summarizeDocInventoryCategories,
} from './doc-categorization.js'

export const FOUNDATION_DOC_CONSOLIDATION_CARD_ID = 'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001'
export const FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY = 'foundation-doc-consolidation-truth-archive-v1'
export const FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH = 'docs/process/foundation-doc-consolidation-truth-archive-001-plan.md'
export const FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001.json'
export const FOUNDATION_DOC_CONSOLIDATION_SCRIPT_PATH = 'scripts/process-foundation-doc-consolidation-truth-archive-check.mjs'
export const FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID = 'FOUNDATION-TUNEUP-REMAP-PROOF-001'

export const FOUNDATION_DOC_CONSOLIDATION_CHANGED_FILES = [
  'lib/foundation-doc-consolidation-truth-archive.js',
  FOUNDATION_DOC_CONSOLIDATION_SCRIPT_PATH,
  FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
  FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'package.json',
]

export const FOUNDATION_DOC_CONSOLIDATION_PROOF_COMMANDS = [
  'node --check lib/foundation-doc-consolidation-truth-archive.js',
  'node --check scripts/process-foundation-doc-consolidation-truth-archive-check.mjs',
  'npm run process:foundation-doc-consolidation-truth-archive-check -- --json',
  'npm run process:foundation-doc-consolidation-truth-archive-check -- --apply --stage=building_now --json',
  'npm run process:foundation-doc-consolidation-truth-archive-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_DOC_CONSOLIDATION_CARD_ID} --planApprovalRef=${FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH} --closeoutKey=${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_DOC_CONSOLIDATION_CARD_ID} --closeoutKey=${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_DOC_CONSOLIDATION_CARD_ID} --planApprovalRef=${FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH} --closeoutKey=${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_DOC_CONSOLIDATION_NOT_NEXT_BOUNDARIES = [
  'Do not delete docs.',
  'Do not move docs between hot folders and docs/_archive in this V1.',
  'Do not collapse useful social/audit/handoff content into a tiny summary.',
  'Do not delete verifier, approval, plan, check, closeout, source/browser proof, route-policy, source-session readiness, or Dev Hub System Truth files.',
  'Do not delete scripts/codex-status.mjs.',
  'Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001 or any per-hub folder restructure.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems.',
]

export const FOUNDATION_DOC_CANONICAL_TRUTH_PATHS = [
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
  'docs/rebuild/current-runtime-map.md',
  'docs/rebuild/intelligence-pipeline.md',
]

export const FOUNDATION_DOC_SUPPORTING_ROOTS = [
  'docs/process/',
  'docs/source-notes/',
  'docs/specs/',
  'docs/strategy/',
  'docs/agents/',
  'docs/users/',
]

export const FOUNDATION_DOC_ARCHIVE_ROOTS = [
  'docs/_archive/',
  'docs/rebuild/plan-history/',
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').trim()
}

function startsWithAny(value = '', prefixes = []) {
  return prefixes.some(prefix => String(value || '').startsWith(prefix))
}

function buildDocRecord(path = '', source = '') {
  const category = classifyDocInventoryPath(path)
  const isCanonical = FOUNDATION_DOC_CANONICAL_TRUTH_PATHS.includes(path)
  const isArchive = startsWithAny(path, FOUNDATION_DOC_ARCHIVE_ROOTS)
  const isSupporting = startsWithAny(path, FOUNDATION_DOC_SUPPORTING_ROOTS)
  const hasStatusLine = /^Status:\s*/im.test(source)
  const promotedTo = String(source || '').match(/^Promoted to:\s*(.+)$/im)?.[1]?.trim() || ''
  const heading = String(source || '').split(/\r?\n/).find(line => /^#\s+/.test(line))?.replace(/^#\s+/, '').trim() || path
  const staleCurrentSignal =
    !isCanonical &&
    !isArchive &&
    /\b(current source of truth|active source of truth|current operating truth|canonical truth)\b/i.test(source)

  return {
    path,
    category,
    heading,
    isCanonical,
    isArchive,
    isSupporting,
    hasStatusLine,
    promotedTo,
    staleCurrentSignal,
    words: text(source).split(/\s+/).filter(Boolean).length,
  }
}

export function buildFoundationDocConsolidationDogfoodProof() {
  const canonical = buildDocRecord('docs/rebuild/current-plan.md', '# Current Plan\n\nStatus: active\n')
  const archive = buildDocRecord('docs/_archive/handoffs/old.md', '# Old Handoff\n\nPromoted to: docs/rebuild/current-plan.md\n')
  const misleading = buildDocRecord('docs/random-old-plan.md', '# Old Plan\n\nThis is the current source of truth for the system.\n')
  const unclassifiedCategoryRejected = !DOC_INVENTORY_CATEGORIES.includes('Fake Category')

  return {
    ok: canonical.isCanonical === true &&
      canonical.category === 'Active doctrine' &&
      archive.isArchive === true &&
      archive.category === 'Archive' &&
      misleading.staleCurrentSignal === true &&
      unclassifiedCategoryRejected,
    canonical,
    archive,
    misleading,
    unclassifiedCategoryRejected,
  }
}

export function buildFoundationDocConsolidationSnapshot({
  docSources = {},
  packageScripts = {},
  planSource = '',
  closeoutSource = '',
  coverageSource = '',
  roadmapSource = '',
} = {}) {
  const checks = []
  const docRecords = Object.entries(docSources)
    .filter(([path]) =>
      path === 'README.md' ||
      path === 'AGENTS.md' ||
      path === 'SOUL.md' ||
      path.startsWith('docs/')
    )
    .filter(([path]) =>
      path.endsWith('.md') ||
      path === 'README.md' ||
      path === 'AGENTS.md' ||
      path === 'SOUL.md'
    )
    .map(([path, source]) => buildDocRecord(path, source))
    .sort((a, b) => a.path.localeCompare(b.path))
  const categorySummary = summarizeDocInventoryCategories(docRecords)
  const categories = new Set(DOC_INVENTORY_CATEGORIES)
  const canonicalRecords = docRecords.filter(record => record.isCanonical)
  const archiveRecords = docRecords.filter(record => record.isArchive)
  const staleCurrentSignals = docRecords.filter(record => record.staleCurrentSignal)
  const hotHandoffs = docRecords.filter(record => record.path.startsWith('docs/handoffs/'))
  const hotAudits = docRecords.filter(record => record.path.startsWith('docs/audits/'))
  const dogfood = buildFoundationDocConsolidationDogfoodProof()
  const missingCanonical = FOUNDATION_DOC_CANONICAL_TRUTH_PATHS
    .filter(path => !docRecords.some(record => record.path === path))

  addCheck(
    checks,
    docRecords.length >= 1000,
    'doc inventory scans a meaningful tracked markdown set',
    `${docRecords.length} docs`,
  )
  addCheck(
    checks,
    missingCanonical.length === 0 &&
      canonicalRecords.length === FOUNDATION_DOC_CANONICAL_TRUTH_PATHS.length,
    'canonical truth paths are explicit and present',
    missingCanonical.join(', ') || `${canonicalRecords.length} canonical docs`,
  )
  addCheck(
    checks,
    docRecords.every(record => categories.has(record.category)),
    'every tracked doc is classified into a known category',
    docRecords.filter(record => !categories.has(record.category)).map(record => record.path).join(', ') || 'all classified',
  )
  addCheck(
    checks,
    archiveRecords.length > canonicalRecords.length * 10 &&
      Number(categorySummary.Archive || 0) + Number(categorySummary['Plan history'] || 0) === archiveRecords.length,
    'archive is preserved as evidence instead of deleted',
    `${archiveRecords.length} archive docs / ${canonicalRecords.length} canonical docs`,
  )
  addCheck(
    checks,
    hotHandoffs.length > 0 &&
      hotAudits.length > 0 &&
      hotHandoffs.length + hotAudits.length < archiveRecords.length,
    'hot handoffs/audits remain narrow compared with preserved archive',
    `handoffs=${hotHandoffs.length} audits=${hotAudits.length} archive=${archiveRecords.length}`,
  )
  addCheck(
    checks,
    staleCurrentSignals.length <= 25,
    'competing current-truth language is bounded and inspectable',
    staleCurrentSignals.slice(0, 10).map(record => record.path).join(', ') || 'none',
  )
  addCheck(
    checks,
    packageScripts['process:foundation-doc-consolidation-truth-archive-check'] ===
      'node --env-file-if-exists=.env scripts/process-foundation-doc-consolidation-truth-archive-check.mjs',
    'package exposes focused doc-consolidation checker',
    packageScripts['process:foundation-doc-consolidation-truth-archive-check'] || 'missing',
  )
  addCheck(
    checks,
    planSource.includes(FOUNDATION_DOC_CONSOLIDATION_CARD_ID) &&
      planSource.includes('Do not delete docs') &&
      planSource.includes('canonical') &&
      planSource.includes('archive'),
    'plan captures no-delete canonical/archive scope',
    FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
  )
  addCheck(
    checks,
    closeoutSource.includes(FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY) &&
      closeoutSource.includes(FOUNDATION_DOC_CONSOLIDATION_CARD_ID),
    'closeout registry includes doc-consolidation closeout',
    FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY,
  )
  addCheck(
    checks,
    coverageSource.includes(FOUNDATION_DOC_CONSOLIDATION_CARD_ID),
    'verifier coverage card IDs include doc-consolidation card',
    FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
  )
  addCheck(
    checks,
    roadmapSource.includes(FOUNDATION_DOC_CONSOLIDATION_CARD_ID) &&
      roadmapSource.includes('Consolidate docs into canonical truth plus archive'),
    'tune-up roadmap keeps doc-consolidation card in sequence',
    FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves canonical/archive classification and stale-current detection',
    dogfood.ok ? 'healthy' : 'failed',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      docCount: docRecords.length,
      canonicalCount: canonicalRecords.length,
      archiveCount: archiveRecords.length,
      hotHandoffCount: hotHandoffs.length,
      hotAuditCount: hotAudits.length,
      staleCurrentSignalCount: staleCurrentSignals.length,
      categorySummary,
      staleCurrentSignalPaths: staleCurrentSignals.slice(0, 25).map(record => record.path),
    },
    canonicalPaths: FOUNDATION_DOC_CANONICAL_TRUTH_PATHS,
    dogfood,
  }
}
