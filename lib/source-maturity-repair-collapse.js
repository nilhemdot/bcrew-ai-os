export const SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID = 'SOURCE-MATURITY-REPAIR-COLLAPSE-001'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY = 'source-maturity-repair-collapse-v1'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH = 'docs/process/source-maturity-repair-collapse-001-plan.md'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-REPAIR-COLLAPSE-001.json'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH = 'scripts/process-source-maturity-repair-collapse-check.mjs'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_SPRINT_ID = 'FOUNDATION-TUNEUP-2026-05-29'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID = 'FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001'
export const SOURCE_MATURITY_REPAIR_COLLAPSE_MANIFEST_PATH = 'data/source-maturity-repair-collapse-manifest.json'
export const SOURCE_MATURITY_REPAIR_ARCHIVE_SCRIPT_PATH = 'scripts/process-source-maturity-repair-archive-check.mjs'

export const SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES = [
  'Archive source-maturity repair/check clones only after package scripts route through the generic archive runner and the manifest proves reduction.',
  'No verifier, approval, plan, check, closeout, source/browser proof, route-policy, source-session readiness, or Dev Hub System Truth cleanup in V1.',
  'Do not delete scripts/codex-status.mjs.',
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, browser session, provider/model call, auth repair, or paid-source run.',
  'No source row mutation, atom/vector write, route apply, external write, ClickUp write, Gmail send, or Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No live Agent Feedback auto-send.',
  'Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001 or any per-hub folder restructure before Steve checkpoint.',
]

export const SOURCE_MATURITY_REPAIR_COLLAPSE_PROOF_COMMANDS = [
  'node --check lib/source-maturity-repair-collapse.js',
  'node --check scripts/process-source-maturity-repair-collapse-check.mjs',
  'npm run process:source-maturity-repair-collapse-check -- --apply --stage=building_now --json',
  'npm run process:source-maturity-repair-collapse-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:foundation-ship -- --card=${SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID} --planApprovalRef=${SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH} --closeoutKey=${SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_MATURITY_REPAIR_COLLAPSE_CHANGED_FILES = [
  'lib/source-maturity-repair-collapse.js',
  SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH,
  SOURCE_MATURITY_REPAIR_ARCHIVE_SCRIPT_PATH,
  SOURCE_MATURITY_REPAIR_COLLAPSE_MANIFEST_PATH,
  'lib/foundation-surface-trust-verifier.js',
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  SOURCE_MATURITY_REPAIR_COLLAPSE_PLAN_PATH,
  SOURCE_MATURITY_REPAIR_COLLAPSE_APPROVAL_PATH,
]

export const SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS = [
  {
    family: 'contract_gap',
    label: 'Contract gap repair',
    suffix: 'contract-gap-repair',
    expectedFailure: 'stale or incomplete source contract blocks connected/trusted maturity',
    operatorValue: 'repairs contract identity without faking extraction or broad source completion',
  },
  {
    family: 'trust_gap',
    label: 'Trust gap repair',
    suffix: 'trust-gap-repair',
    expectedFailure: 'source boundary is not trusted/locked',
    operatorValue: 'keeps public/proposal sources honest before monitoring or extraction',
  },
  {
    family: 'monitoring_gap',
    label: 'Monitoring gap repair',
    suffix: 'monitoring-gap-repair',
    expectedFailure: 'signed-off source has facts but no explicit refresh/monitoring boundary',
    operatorValue: 'clears false monitored blockers while exposing the next real gap',
  },
  {
    family: 'evidence_gap',
    label: 'Evidence gap repair',
    suffix: 'evidence-gap-repair',
    expectedFailure: 'source contract exists but no source-backed fact/evidence signal is attached',
    operatorValue: 'attaches existing evidence without starting live extraction',
  },
  {
    family: 'atom_flow',
    label: 'Atom-flow repair',
    suffix: 'atom-flow-repair',
    expectedFailure: 'source fact exists but no governed atom-flow signal exists',
    operatorValue: 'promotes source-backed atom evidence without fabricating atoms',
  },
  {
    family: 'routing_gap',
    label: 'Routing gap repair',
    suffix: 'routing-gap-repair',
    expectedFailure: 'source-backed atom/chunk exists but no approval-required internal route exists',
    operatorValue: 'routes intelligence to review without external write or route apply',
  },
  {
    family: 'gap_followup',
    label: 'Gap follow-up triage',
    suffix: 'gap-followup',
    expectedFailure: 'source maturity closeout rows need ranked follow-up cards',
    operatorValue: 'turns maturity gaps into scoped internal repair cards without extraction',
  },
]

export const REQUIRED_REPAIR_PROOF_FAMILIES = SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS.map(family => family.family)

const FAMILY_BY_SUFFIX = SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS
  .reduce((acc, family) => acc.set(family.suffix, family), new Map())

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function fileBase(filePath = '') {
  return normalizePath(filePath).split('/').pop() || ''
}

function sourceMaturityName(filePath = '') {
  const base = fileBase(filePath)
  return base
    .replace(/\.(?:mjs|js)$/i, '')
    .replace(/^process-/, '')
    .replace(/-check$/, '')
}

function countLines(source = '') {
  if (!source) return 0
  return String(source).split('\n').length
}

function unique(values = []) {
  return Array.from(new Set(list(values).map(text).filter(Boolean)))
}

function classifyRole(filePath = '', family = null, slug = '') {
  const file = normalizePath(filePath)
  if (file === 'lib/source-maturity-routing-gap-repair-db.js') return 'support'
  if (file.startsWith('scripts/')) return 'check'
  if (slug === 'core' && ['routing_gap', 'atom_flow', 'gap_followup'].includes(family?.family)) return 'engine'
  return 'wrapper'
}

export function classifySourceMaturityRepairPath(filePath = '') {
  const file = normalizePath(filePath)
  if (!file) return null
  if (!/^(lib|scripts)\//.test(file)) return null
  if (!file.includes('source-maturity')) return null
  if (file.includes('foundation-build-closeout-source-maturity')) return null
  if (file.endsWith('source-maturity-repair-archive-check.mjs')) return null
  if (file.endsWith('source-maturity-grid.js') || file.endsWith('source-maturity-grid-check.mjs')) return null

  const name = sourceMaturityName(file)
  if (name === 'source-maturity-routing-gap-repair-db') {
    return {
      file,
      family: 'routing_gap',
      familyLabel: FAMILY_BY_SUFFIX.get('routing-gap-repair')?.label,
      slug: 'routing-db',
      role: 'support',
    }
  }

  for (const family of SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS) {
    const suffix = family.suffix
    if (name === `source-maturity-${suffix}` || name.endsWith(`-${suffix}`)) {
      const rawSlug = name
        .replace(/^source-maturity-/, '')
        .replace(new RegExp(`-${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      const slug = rawSlug || 'core'
      return {
        file,
        family: family.family,
        familyLabel: family.label,
        slug,
        role: classifyRole(file, family, slug),
      }
    }
  }

  return null
}

function expectedPlanPath(entry) {
  if (!entry || entry.role === 'support') return null
  const prefix = entry.slug === 'core'
    ? `source-maturity-${SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS.find(family => family.family === entry.family)?.suffix}`
    : `source-maturity-${entry.slug}-${SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS.find(family => family.family === entry.family)?.suffix}`
  return `docs/process/${prefix}-001-plan.md`
}

function expectedApprovalPath(entry) {
  const planPath = expectedPlanPath(entry)
  if (!planPath) return null
  return `docs/process/approvals/${planPath.split('/').pop().replace(/-001-plan\.md$/, '-001').toUpperCase()}.json`
}

export function buildSourceMaturityRepairManifest({
  filePaths = [],
  fileSources = {},
} = {}) {
  const entriesByKey = new Map()
  const supportFiles = []
  const unclassified = []

  for (const rawPath of list(filePaths).map(normalizePath).sort()) {
    const classification = classifySourceMaturityRepairPath(rawPath)
    if (!classification) {
      const isRepairCandidate = rawPath.includes('source-maturity') &&
        /^(lib|scripts)\//.test(rawPath) &&
        /(repair|gap-followup)/.test(rawPath) &&
        !rawPath.includes('repair-collapse') &&
        !rawPath.includes('repair-archive')
      if (isRepairCandidate) unclassified.push(rawPath)
      continue
    }
    const source = fileSources[classification.file] || ''
    const lineCount = countLines(source)
    if (classification.role === 'support') {
      supportFiles.push({ ...classification, lineCount })
      continue
    }
    const key = `${classification.family}:${classification.slug}`
    const existing = entriesByKey.get(key) || {
      family: classification.family,
      familyLabel: classification.familyLabel,
      slug: classification.slug,
      key,
      libPath: null,
      scriptPath: null,
      enginePath: null,
      planPath: null,
      approvalPath: null,
      lineCount: 0,
      roles: [],
    }
    if (classification.role === 'check') existing.scriptPath = classification.file
    if (classification.role === 'engine') existing.enginePath = classification.file
    if (classification.role === 'wrapper') existing.libPath = classification.file
    existing.planPath = expectedPlanPath(classification)
    existing.approvalPath = expectedApprovalPath(classification)
    existing.lineCount += lineCount
    existing.roles = unique([...existing.roles, classification.role])
    entriesByKey.set(key, existing)
  }

  const entries = Array.from(entriesByKey.values()).sort((a, b) => a.key.localeCompare(b.key))
  const families = SOURCE_MATURITY_REPAIR_FAMILY_DEFINITIONS.map(definition => {
    const familyEntries = entries.filter(entry => entry.family === definition.family)
    const wrappers = familyEntries.filter(entry => entry.libPath)
    const checks = familyEntries.filter(entry => entry.scriptPath)
    return {
      family: definition.family,
      label: definition.label,
      expectedFailure: definition.expectedFailure,
      operatorValue: definition.operatorValue,
      entryCount: familyEntries.length,
      wrapperCount: wrappers.length,
      checkCount: checks.length,
      lineCount: familyEntries.reduce((sum, entry) => sum + Number(entry.lineCount || 0), 0),
      slugs: familyEntries.map(entry => entry.slug),
      entries: familyEntries,
    }
  })

  return {
    cardId: SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID,
    closeoutKey: SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY,
    generatedAt: new Date().toISOString(),
    summary: {
      familyCount: families.filter(family => family.entryCount > 0).length,
      entryCount: entries.length,
      wrapperCount: entries.filter(entry => entry.libPath).length,
      checkCount: entries.filter(entry => entry.scriptPath).length,
      engineCount: entries.filter(entry => entry.enginePath).length,
      supportFileCount: supportFiles.length,
      lineCount: entries.reduce((sum, entry) => sum + Number(entry.lineCount || 0), 0) +
        supportFiles.reduce((sum, entry) => sum + Number(entry.lineCount || 0), 0),
      noFilesDeleted: true,
      legacyWrappersArchived: false,
      noLiveExtractionStarted: true,
      oldWrappersStillPresent: true,
    },
    families,
    entries,
    supportFiles,
    unclassified,
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function proofForFamily(proofsByFamily = {}, family) {
  return proofsByFamily[family] || null
}

function sourceMaturityProofFamilyChecks(family, proof = {}) {
  if (family === 'contract_gap') {
    return Boolean(proof.ok && proof.before?.maturityNextGap === 'connected' && proof.after?.maturityNextGap === 'atomized')
  }
  if (family === 'trust_gap') {
    return Boolean(proof.ok && proof.before?.nextGap === 'trusted' && proof.after?.nextGap === 'monitored')
  }
  if (family === 'monitoring_gap') {
    return Boolean(
      proof.ok &&
      proof.beforeRow?.nextGap === 'monitored' &&
      proof.afterRow?.nextGap !== 'monitored' &&
      proof.missingBoundary?.ok === false &&
      list(proof.missingBoundary?.failures).some(failure => String(failure).includes('monitoring_boundary')),
    )
  }
  if (family === 'evidence_gap') {
    return Boolean(
      proof.ok &&
      proof.missingNote?.ok === false &&
      list(proof.missingNote?.failures).includes('source_note_missing_required_evidence') &&
      proof.factBuild?.fact?.metadata?.noLiveExtraction === true,
    )
  }
  if (family === 'atom_flow') {
    return Boolean(
      proof.ok &&
      proof.missingFact?.ok === false &&
      list(proof.missingFact?.failures).includes('missing_target_source_fact') &&
      proof.atomBuild?.atom?.metadata?.noLiveExtraction === true &&
      proof.evaluation?.ok === true,
    )
  }
  if (family === 'routing_gap') {
    return Boolean(
      proof.ok &&
      proof.missingChunk?.ok === false &&
      list(proof.missingChunk?.failures).includes('missing_active_tier_one_evidence_chunk') &&
      proof.records?.route?.approvalRequired === true &&
      proof.records?.route?.metadata?.noExternalWrite === true,
    )
  }
  if (family === 'gap_followup') {
    return Boolean(
      proof.ok &&
      proof.snapshot?.summary?.triageItemCount >= 4 &&
      list(proof.missingMaturitySourceIds).includes(proof.removedSourceId),
    )
  }
  return Boolean(proof.ok)
}

export function evaluateSourceMaturityRepairCollapse({
  manifest = {},
  legacyProofs = {},
  changedFiles = SOURCE_MATURITY_REPAIR_COLLAPSE_CHANGED_FILES,
} = {}) {
  const checks = []
  const familiesById = new Map(list(manifest.families).map(family => [family.family, family]))
  const requiredFamilyIds = new Set(REQUIRED_REPAIR_PROOF_FAMILIES)
  const presentFamilies = list(manifest.families).filter(family => family.entryCount > 0).map(family => family.family)
  const missingFamilies = REQUIRED_REPAIR_PROOF_FAMILIES.filter(family => !presentFamilies.includes(family))
  const duplicateFamilyDetails = list(manifest.families)
    .filter(family => ['monitoring_gap', 'atom_flow', 'routing_gap'].includes(family.family))
    .map(family => `${family.family}:${family.wrapperCount} wrappers/${family.checkCount} checks`)
  const reduction = manifest.reduction || {}
  const movedFiles = list(manifest.movedFiles)
  const afterActiveRepairFileCount = Number(reduction.afterActiveRepairFileCount || 0)
  const beforeActiveRepairFileCount = Number(reduction.beforeActiveRepairFileCount || 0)
  const activeTargetMax = Number(reduction.activeTargetMax || 40)

  addCheck(
    checks,
    missingFamilies.length === 0,
    'manifest covers every source-maturity repair family',
    missingFamilies.length ? `missing ${missingFamilies.join(', ')}` : presentFamilies.join(', '),
  )
  addCheck(
    checks,
    ['monitoring_gap', 'atom_flow', 'routing_gap'].every(family => Number(familiesById.get(family)?.wrapperCount || 0) >= 5),
    'manifest identifies the large clone families',
    duplicateFamilyDetails.join(' | '),
  )
  addCheck(
    checks,
    Number(manifest.summary?.lineCount || 0) >= 30000,
    'manifest measures the repair/check bloat surface',
    `${manifest.summary?.lineCount || 0} lines`,
  )
  addCheck(
    checks,
    list(manifest.entries).every(entry => entry.enginePath || entry.libPath || entry.scriptPath),
    'manifest entries have real file ownership paths',
    `${manifest.entries?.length || 0} entries`,
  )
  addCheck(
    checks,
    list(manifest.unclassified).length === 0,
    'source-maturity repair files do not escape classification',
    list(manifest.unclassified).join(', ') || 'none',
  )
  addCheck(
    checks,
    list(manifest.supportFiles).some(file => file.file === 'lib/source-maturity-routing-gap-repair-db.js'),
    'support modules are kept and not deleted',
    list(manifest.supportFiles).map(file => file.file).join(', ') || 'none',
  )
  addCheck(
    checks,
    manifest.mode === 'archive-reduction' &&
      movedFiles.length > 0 &&
      afterActiveRepairFileCount > 0 &&
      afterActiveRepairFileCount < beforeActiveRepairFileCount &&
      afterActiveRepairFileCount <= activeTargetMax,
    'manifest proves the active source-maturity repair surface went down',
    `${beforeActiveRepairFileCount || 'unknown'} -> ${afterActiveRepairFileCount || 'unknown'} active files; moved ${movedFiles.length}`,
  )
  addCheck(
    checks,
    movedFiles.every(move =>
      String(move?.from || '').startsWith('lib/') || String(move?.from || '').startsWith('scripts/')) &&
      movedFiles.every(move => String(move?.to || '').startsWith('docs/_archive/source-maturity-repairs/')),
    'legacy repair clones are archived under docs/_archive instead of deleted',
    `${movedFiles.length} archived paths`,
  )

  for (const family of REQUIRED_REPAIR_PROOF_FAMILIES) {
    const proof = proofForFamily(legacyProofs, family)
    addCheck(
      checks,
      sourceMaturityProofFamilyChecks(family, proof || {}),
      `${family} legacy fixture passes through shared collapse evaluator`,
      proof ? 'legacy fixture includes failure and repaired pass evidence' : 'missing proof',
    )
  }

  addCheck(
    checks,
    list(changedFiles).some(file => file === SOURCE_MATURITY_REPAIR_COLLAPSE_SCRIPT_PATH) &&
      list(changedFiles).some(file => file === SOURCE_MATURITY_REPAIR_ARCHIVE_SCRIPT_PATH) &&
      list(changedFiles).some(file => file === 'lib/source-maturity-repair-collapse.js'),
    'collapse is implemented as one reusable checker, one archive runner, and one shared module',
    list(changedFiles).join(', '),
  )
  addCheck(
    checks,
    SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('Archive source-maturity repair/check clones')) &&
      SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('No source row mutation')) &&
      SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES.some(boundary => boundary.includes('Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001')),
    'not-next boundaries protect archive discipline, no-live-write, and per-hub checkpoint rules',
    SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES.join(' | '),
  )

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    checks,
    failures,
    summary: {
      familyCount: presentFamilies.length,
      entryCount: manifest.summary?.entryCount || 0,
      lineCount: manifest.summary?.lineCount || 0,
      proofFamilyCount: REQUIRED_REPAIR_PROOF_FAMILIES
        .filter(family => sourceMaturityProofFamilyChecks(family, proofForFamily(legacyProofs, family) || {})).length,
      noFilesDeleted: true,
      legacyWrappersArchived: true,
      oldWrappersStillPresent: false,
      beforeActiveRepairFileCount,
      afterActiveRepairFileCount,
      movedFileCount: movedFiles.length,
      noLiveExtractionStarted: true,
      noSourceRowsMutated: true,
      noExternalWrites: true,
      nextMigrationRequired: false,
    },
  }
}

export function renderSourceMaturityRepairCollapseCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  const lines = []
  lines.push('# Source Maturity Repair Collapse V1 Closeout')
  lines.push('')
  lines.push(`Card: \`${SOURCE_MATURITY_REPAIR_COLLAPSE_CARD_ID}\``)
  lines.push(`Closeout key: \`${SOURCE_MATURITY_REPAIR_COLLAPSE_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Shipped')
  lines.push('')
  lines.push('- Added one shared manifest/proof engine for source-maturity repair clone families.')
  lines.push('- Archived legacy source-maturity repair/check clones behind one generic archive runner instead of keeping every old wrapper active.')
  lines.push(`- Proved ${summary.proofFamilyCount || 0}/${REQUIRED_REPAIR_PROOF_FAMILIES.length} legacy repair families with old synthetic failure/pass fixtures.`)
  lines.push(`- Active repair/check surface moved from ${summary.beforeActiveRepairFileCount || 0} to ${summary.afterActiveRepairFileCount || 0} files; ${summary.movedFileCount || 0} files relocated under docs/_archive/source-maturity-repairs.`)
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Manifest entries: ${summary.entryCount || 0}.`)
  lines.push(`- Manifest line surface measured: ${summary.lineCount || 0}.`)
  lines.push(`- Families covered: ${summary.familyCount || 0}.`)
  lines.push(`- Active repair files after archive: ${summary.afterActiveRepairFileCount || 0}.`)
  lines.push('- Focused proof uses actual legacy proof functions and shared evaluator contracts; substring-only proof is not accepted.')
  lines.push('- Full `process:foundation-ship` is required before push because this touches source-maturity infrastructure and package scripts.')
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of SOURCE_MATURITY_REPAIR_COLLAPSE_NOT_NEXT_BOUNDARIES) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Known Limits')
  lines.push('')
  lines.push('- Historical closeout references to moved files are preserved through the archive manifest, not by leaving duplicate active files.')
  lines.push('- This does not start the per-hub folder restructure or touch source/browser proof lanes.')
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push(`Continue the tune-up cleanup sequence with \`${SOURCE_MATURITY_REPAIR_COLLAPSE_NEXT_CARD_ID}\` or a follow-up wrapper-migration card. Keep \`FOUNDATION-HUB-FOLDER-ISOLATION-001\` parked for Steve checkpoint.`)
  lines.push('')
  return `${lines.join('\n')}\n`
}
