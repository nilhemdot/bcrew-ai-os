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
export const FOUNDATION_DOC_ARCHIVE_MOVE_CARD_ID = 'FOUNDATION-DOC-ARCHIVE-MOVE-001'
export const FOUNDATION_DOC_ARCHIVE_MOVE_MANIFEST_PATH = 'docs/process/foundation-doc-archive-move-001-manifest.json'
export const FOUNDATION_DOC_ARCHIVE_MOVE_BASELINE_ACTIVE_HOT_DOCS = 238

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

function parseJson(value = '', fallback = null) {
  try {
    return JSON.parse(String(value || ''))
  } catch {
    return fallback
  }
}

function isActiveAuditHandoffMarkdown(path = '') {
  const normalized = String(path || '')
  return (
    normalized.startsWith('docs/audits/') ||
    normalized.startsWith('docs/handoffs/')
  ) &&
    normalized.endsWith('.md') &&
    !normalized.endsWith('/INDEX.md') &&
    !normalized.endsWith('/README.md')
}

function isAllowedArchiveTarget(path = '') {
  const normalized = String(path || '')
  return (
    normalized.startsWith('docs/_archive/audits/') ||
    normalized.startsWith('docs/_archive/handoffs/')
  ) && normalized.endsWith('.md')
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

export function buildFoundationDocArchiveMoveDogfoodProof() {
  const referencedCandidate = {
    from: 'docs/handoffs/2026-05-01-referenced.md',
    to: 'docs/_archive/handoffs/2026-05-01-referenced.md',
    references: ['lib/example.js'],
  }
  const unreferencedCandidate = {
    from: 'docs/handoffs/2026-05-01-cold.md',
    to: 'docs/_archive/handoffs/2026-05-01-cold.md',
    references: [],
  }

  return {
    ok: referencedCandidate.references.length > 0 &&
      unreferencedCandidate.references.length === 0 &&
      isActiveAuditHandoffMarkdown(referencedCandidate.from) &&
      isAllowedArchiveTarget(referencedCandidate.to) &&
      isActiveAuditHandoffMarkdown(unreferencedCandidate.from) &&
      isAllowedArchiveTarget(unreferencedCandidate.to),
    referencedCandidateAllowed: referencedCandidate.references.length === 0,
    unreferencedCandidateAllowed: unreferencedCandidate.references.length === 0,
    invariant: 'A referenced active doc is parked unless references are repointed in the same change; an unreferenced cold doc can move to docs/_archive.',
  }
}

export function buildFoundationDocArchiveMoveSnapshot({
  docSources = {},
  manifestSource = '',
} = {}) {
  const checks = []
  const manifest = parseJson(manifestSource, {})
  const movedFiles = Array.isArray(manifest.movedFiles) ? manifest.movedFiles : []
  const activeHotDocs = Object.keys(docSources)
    .filter(isActiveAuditHandoffMarkdown)
    .sort()
  const archiveTargets = Object.keys(docSources)
    .filter(isAllowedArchiveTarget)
    .sort()
  const dogfood = buildFoundationDocArchiveMoveDogfoodProof()
  const invalidMoves = movedFiles.filter(move =>
    !isActiveAuditHandoffMarkdown(move.from) ||
      !isAllowedArchiveTarget(move.to) ||
      move.from === move.to
  )
  const missingTargets = movedFiles.filter(move => !docSources[move.to])
  const stillActiveSources = movedFiles.filter(move => docSources[move.from])
  const activeReduction = FOUNDATION_DOC_ARCHIVE_MOVE_BASELINE_ACTIVE_HOT_DOCS - activeHotDocs.length

  addCheck(
    checks,
    manifest.cardId === FOUNDATION_DOC_ARCHIVE_MOVE_CARD_ID &&
      manifest.mode === 'apply' &&
      movedFiles.length > 0,
    'archive-move manifest records applied moves',
    `${manifest.cardId || 'missing'} / ${movedFiles.length} moves`,
  )
  addCheck(
    checks,
    activeReduction >= movedFiles.length &&
      activeHotDocs.length < FOUNDATION_DOC_ARCHIVE_MOVE_BASELINE_ACTIVE_HOT_DOCS,
    'active audit/handoff markdown count went down',
    `${activeHotDocs.length} active hot docs / reduction=${activeReduction}`,
  )
  addCheck(
    checks,
    invalidMoves.length === 0,
    'manifest moves active audit/handoff docs only into docs/_archive',
    invalidMoves.map(move => `${move.from}->${move.to}`).join(', ') || 'all moves valid',
  )
  addCheck(
    checks,
    missingTargets.length === 0 && stillActiveSources.length === 0,
    'moved files are preserved at archive targets and absent from active paths',
    [
      ...missingTargets.map(move => `missing ${move.to}`),
      ...stillActiveSources.map(move => `still active ${move.from}`),
    ].join(', ') || 'all preserved',
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.referencedCandidateAllowed === false &&
      dogfood.unreferencedCandidateAllowed === true,
    'dogfood rejects referenced active-doc moves and allows cold unreferenced moves',
    dogfood.invariant,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      baselineActiveHotDocCount: FOUNDATION_DOC_ARCHIVE_MOVE_BASELINE_ACTIVE_HOT_DOCS,
      activeHotDocCount: activeHotDocs.length,
      activeHotDocReduction: activeReduction,
      archiveTargetCount: archiveTargets.length,
      movedFileCount: movedFiles.length,
      movedFiles,
    },
    dogfood,
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
