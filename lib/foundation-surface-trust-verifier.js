import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID = 'VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-surface-trust-split-module-v1'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-surface-trust-split-module-001-plan.md'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001.json'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-surface-trust-split-module-check.mjs'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SPRINT_ID = 'verifier-surface-trust-split-module-2026-05-16'
export const VERIFIER_SURFACE_TRUST_SPLIT_MODULE_BEFORE_LINES = 13991
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-surface-trust-orchestration-split-v1'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-surface-trust-orchestration-split-001-plan.md'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-surface-trust-orchestration-split-check.mjs'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-surface-trust-orchestration-split-closeout.md'
export const VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES = 6449

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function normalizeClaim(value) {
  return String(value || '')
    .trim()
    .replace(/[),.;:'"`]+$/g, '')
}

export function extractClaimedFilesFromText(text) {
  const claims = new Set()
  const pattern = /\b(?:scripts|docs|lib|public)\/[A-Za-z0-9._/-]+\.(?:mjs|js|md|html|css|json)\b/g
  for (const match of String(text || '').matchAll(pattern)) {
    claims.add(normalizeClaim(match[0]))
  }
  return Array.from(claims)
}

export function extractClaimedNpmScriptsFromText(text) {
  const claims = new Set()
  const pattern = /\bnpm\s+run\s+([a-z][a-z0-9:-]*)\b/g
  for (const match of String(text || '').matchAll(pattern)) {
    const scriptName = normalizeClaim(match[1])
    if (!scriptName.includes(':')) continue
    claims.add(scriptName)
  }
  return Array.from(claims)
}

export function extractClaimedApiRoutesFromText(text) {
  const claims = new Set()
  const pattern = /\/api\/[A-Za-z0-9._~:/?=&-]+/g
  for (const match of String(text || '').matchAll(pattern)) {
    const route = normalizeClaim(match[0]).replace(/\?.*$/, '')
    claims.add(route)
  }
  return Array.from(claims)
}

export function apiRouteExists(serverSource, route) {
  const normalized = normalizeClaim(route)
  if (!normalized) return false
  return String(serverSource || '').includes(`'${normalized}'`) ||
    String(serverSource || '').includes(`"${normalized}"`) ||
    String(serverSource || '').includes(`\`${normalized}\``)
}

export function backlogCardText(card) {
  return [
    card?.id,
    card?.title,
    card?.summary,
    card?.whyItMatters,
    card?.nextAction,
    card?.statusNote,
    card?.source,
  ].filter(Boolean).join('\n')
}

export function buildCloseoutText(closeout) {
  return [
    closeout?.key,
    ...(closeout?.backlogIds || []),
    closeout?.whatChanged,
    closeout?.whatItDoes,
    closeout?.whyItMatters,
    ...(closeout?.whereItLives || []),
    ...(closeout?.proofCommands || []),
    closeout?.proofStatus,
    closeout?.reviewNext,
    ...(closeout?.knownLimits || []),
  ].filter(Boolean).join('\n')
}

export function validateVerifierExceptionLedger(ledger, doneCardIds, now = new Date()) {
  const exceptions = Array.isArray(ledger?.exceptions) ? ledger.exceptions : []
  const maxOpenEndedDays = Math.max(1, Number(ledger?.maxOpenEndedDays || 90))
  const invalid = []
  const expired = []
  const staleOpenEnded = []
  const duplicates = []
  const seen = new Set()
  const validExceptionIds = new Set()
  const doneIds = doneCardIds instanceof Set ? doneCardIds : new Set(asArray(doneCardIds))

  for (const exception of exceptions) {
    const cardId = String(exception?.cardId || '').trim()
    const missingFields = []
    for (const field of ['cardId', 'reason', 'approver', 'approvedAt', 'expiresAt']) {
      if (!Object.prototype.hasOwnProperty.call(exception || {}, field)) missingFields.push(field)
    }
    if (!String(exception?.reason || '').trim()) missingFields.push('reason')
    if (!String(exception?.approver || '').trim()) missingFields.push('approver')
    const approvedAtMs = Date.parse(exception?.approvedAt)
    if (!Number.isFinite(approvedAtMs)) missingFields.push('approvedAt')
    if (!doneIds.has(cardId)) missingFields.push('done-card')
    if (seen.has(cardId)) duplicates.push(cardId)
    seen.add(cardId)

    let expiresAtMs = null
    if (exception?.expiresAt !== null) {
      expiresAtMs = Date.parse(exception?.expiresAt)
      if (!Number.isFinite(expiresAtMs)) missingFields.push('expiresAt')
      else if (expiresAtMs < now.getTime()) expired.push(cardId)
    } else if (Number.isFinite(approvedAtMs)) {
      const ageDays = (now.getTime() - approvedAtMs) / (24 * 60 * 60 * 1000)
      if (ageDays > maxOpenEndedDays) staleOpenEnded.push(`${cardId}:${Math.floor(ageDays)}d`)
    }

    if (missingFields.length) {
      invalid.push(`${cardId || 'missing-card'}:${Array.from(new Set(missingFields)).join(',')}`)
      continue
    }
    validExceptionIds.add(cardId)
  }

  return {
    total: exceptions.length,
    openEnded: exceptions.filter(exception => exception?.expiresAt === null).length,
    validExceptionIds,
    invalid,
    expired,
    staleOpenEnded,
    duplicates,
    maxOpenEndedDays,
  }
}

export function findDoneCardsWithoutVerifierCoverage(doneCards, verifierSource, validExceptionIds) {
  const validIds = validExceptionIds instanceof Set ? validExceptionIds : new Set(asArray(validExceptionIds))
  return asArray(doneCards).filter(card => {
    if (String(verifierSource || '').includes(card.id)) return false
    return !validIds.has(card.id)
  })
}

async function repoFileExists(repoRoot, relativePath) {
  const normalized = String(relativePath || '').trim()
  if (!normalized || normalized.includes('..')) return false
  const absolutePath = path.resolve(repoRoot, normalized)
  if (!absolutePath.startsWith(path.resolve(repoRoot))) return false
  try {
    const stat = await fs.stat(absolutePath)
    return stat.isFile()
  } catch {
    return false
  }
}

async function loadArchiveMovePathMap(repoRoot, manifestPath = 'docs/process/foundation-doc-archive-move-001-manifest.json') {
  try {
    const manifestSource = await fs.readFile(path.resolve(repoRoot, manifestPath), 'utf8')
    const manifest = JSON.parse(manifestSource)
    const movedFiles = Array.isArray(manifest?.movedFiles) ? manifest.movedFiles : []
    return new Map(
      movedFiles
        .map(move => [String(move?.from || '').trim(), String(move?.to || '').trim()])
        .filter(([from, to]) =>
          from &&
          to &&
          !from.includes('..') &&
          !to.includes('..') &&
          to.startsWith('docs/_archive/')
        )
    )
  } catch {
    return new Map()
  }
}

async function claimedFileExists(repoRoot, relativePath, archiveMovePathMap) {
  if (await repoFileExists(repoRoot, relativePath)) return true
  const archivedPath = archiveMovePathMap.get(String(relativePath || '').trim())
  if (!archivedPath) return false
  return repoFileExists(repoRoot, archivedPath)
}

export async function findMissingArtifactClaims(records, packageScripts, routeSources, options = {}) {
  const repoRoot = options.repoRoot || process.cwd()
  const archiveMovePathMap = options.archiveMovePathMap instanceof Map
    ? options.archiveMovePathMap
    : await loadArchiveMovePathMap(repoRoot, options.archiveMoveManifestPath)
  const combinedRouteSource = Array.isArray(routeSources)
    ? routeSources.filter(Boolean).join('\n')
    : String(routeSources || '')
  const missing = []
  for (const record of asArray(records)) {
    const text = record.text || ''
    for (const filePath of extractClaimedFilesFromText(text)) {
      if (!await claimedFileExists(repoRoot, filePath, archiveMovePathMap)) missing.push(`${record.label}: missing file ${filePath}`)
    }
    for (const scriptName of extractClaimedNpmScriptsFromText(text)) {
      if (!packageScripts?.[scriptName]) missing.push(`${record.label}: missing npm script ${scriptName}`)
    }
    for (const apiRoute of extractClaimedApiRoutesFromText(text)) {
      if (!apiRouteExists(combinedRouteSource, apiRoute)) missing.push(`${record.label}: missing API route ${apiRoute}`)
    }
  }
  return missing
}

export async function evaluateFoundationSurfaceTrustVerifier(input = {}) {
  const checks = []
  const repoRoot = input.repoRoot || process.cwd()
  const foundationHub = input.foundationHub || {}
  const currentRepoHead = String(input.currentRepoHead || '').trim().toLowerCase()
  const currentRepoShortHead = currentRepoHead.slice(0, 7)
  const runtimeServedCode = foundationHub.runtimeSupervisor?.servedCode || input.runtimeServedCode || {}
  const runtimeWorkerCode = foundationHub.runtimeSupervisor?.workerCode || input.runtimeWorkerCode || {}
  const workerLaunchAgent = input.workerLaunchAgent || {}
  const dashboardRunningCommit = String(runtimeServedCode.runningCommit || '').trim().toLowerCase()
  const dashboardRunningShortCommit = String(runtimeServedCode.runningShortCommit || dashboardRunningCommit.slice(0, 7) || 'missing')
  const workerRunningCommit = String(runtimeWorkerCode.runningCommit || '').trim().toLowerCase()
  const workerRunningShortCommit = String(runtimeWorkerCode.runningShortCommit || workerRunningCommit.slice(0, 7) || 'missing')
  const dashboardRestartCommand = runtimeServedCode.restartCommand || 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard'
  const workerRestartCommand = runtimeWorkerCode.restartCommand || 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker'
  const servedCodeTrustDetail = dashboardRunningCommit
    ? dashboardRunningCommit === currentRepoHead
      ? `Dashboard is serving current commit ${dashboardRunningShortCommit}; HEAD is ${currentRepoShortHead}.`
      : `Dashboard is serving commit ${dashboardRunningShortCommit}; HEAD is ${currentRepoShortHead}. Run: ${dashboardRestartCommand} to restart.`
    : `Dashboard did not expose its server-start commit. Run: ${dashboardRestartCommand} to restart, then rerun foundation:verify.`
  const workerCodeTrustDetail = workerRunningCommit
    ? workerRunningCommit === currentRepoHead && workerLaunchAgent.pid === Number(runtimeWorkerCode.processId)
      ? `Foundation worker is running current commit ${workerRunningShortCommit}; HEAD is ${currentRepoShortHead}; LaunchAgent pid is ${workerLaunchAgent.pid}.`
      : `Foundation worker is serving commit ${workerRunningShortCommit}; HEAD is ${currentRepoShortHead}; recorded pid is ${runtimeWorkerCode.processId || 'missing'} and LaunchAgent pid is ${workerLaunchAgent.pid || 'missing'}. Run: ${workerRestartCommand} to restart.`
    : `Foundation worker did not expose its startup commit. Run: ${workerRestartCommand} to restart, then rerun foundation:verify.`

  const doneBacklogCards = asArray(input.doneBacklogCards)
  const doneBacklogCardIds = input.doneBacklogCardIds instanceof Set
    ? input.doneBacklogCardIds
    : new Set(asArray(input.doneBacklogCardIds))
  const verifierExceptionValidation = validateVerifierExceptionLedger(input.verifierExceptionLedger, doneBacklogCardIds)
  const doneCardsWithoutVerifierCoverage = findDoneCardsWithoutVerifierCoverage(
    doneBacklogCards,
    input.verifierCoverageSource || '',
    verifierExceptionValidation.validExceptionIds,
  )
  const syntheticMissingProofCardId = ['SYNTHETIC', 'DONE', 'NO', 'PROOF', '999'].join('-')
  const syntheticDoneCoverageMisses = findDoneCardsWithoutVerifierCoverage(
    [{ id: syntheticMissingProofCardId, lane: 'done' }],
    '',
    verifierExceptionValidation.validExceptionIds,
  )
  const artifactClaimRecords = [
    ...doneBacklogCards.map(card => ({ label: `card ${card.id}`, text: backlogCardText(card) })),
    ...asArray(input.foundationBuildCloseouts).map(closeout => ({ label: `closeout ${closeout.key}`, text: buildCloseoutText(closeout) })),
  ]
  const missingArtifactClaims = await findMissingArtifactClaims(
    artifactClaimRecords,
    input.packageScripts || {},
    input.routeSources || [],
    { repoRoot },
  )
  const syntheticMissingArtifactClaims = await findMissingArtifactClaims(
    [{
      label: 'synthetic missing artifact',
      text: 'docs/process/synthetic-missing-artifact.md npm run synthetic:missing /api/synthetic-missing-artifact',
    }],
    input.packageScripts || {},
    input.syntheticRouteSources || input.routeSources || [],
    { repoRoot },
  )

  const foundationSurfaceMap = asArray(input.foundationSurfaceMap)
  const foundationNavSections = Array.from(new Set(
    Array.from(String(input.foundationHtmlSource || '').matchAll(/data-section="([^"]+)"/g)).map(match => match[1])
  ))
  const foundationMappedSections = new Set(foundationSurfaceMap.map(surface => surface.section))
  const foundationSweepSections = new Set(asArray(foundationHub.surfaceFreshnessSweep?.surfaces).map(surface => surface.section))
  const foundationMappedApis = new Set(foundationSurfaceMap.flatMap(surface => asArray(surface.backingApis)))
  const requiredSubSurfaces = input.requiredSubSurfaces || [
    'dashboard-code-trust',
    'worker-code-trust',
    'post-ship-fanout',
    'doctrine-propagation',
    'decision-auto-emit',
    'sheets-api-trust',
    'backlog-hygiene',
    'card-reference-trust',
    'source-contract-trust',
    'extraction-coverage-by-target',
  ]
  const requiredFoundationApiRoutes = input.requiredFoundationApiRoutes || [
    '/api/foundation-hub',
    '/api/source-of-truth',
    '/api/system-inventory',
    '/api/foundation/build-log',
    '/api/foundation/jobs',
    '/api/foundation/extraction-control',
    '/api/foundation/action-review',
    '/api/strategic-execution/v2',
    '/api/ops-hub',
  ]
  const sourceContractsLength = Number(input.sourceContractsLength ?? asArray(input.sourceContracts).length)

  addCheck(
    checks,
    Array.isArray(foundationHub.backlogItems) &&
      Array.isArray(foundationHub.decisions) &&
      Array.isArray(foundationHub.openQuestions) &&
      foundationHub.decisionTraceability &&
      foundationHub.decisionTraceability.summary &&
      foundationHub.decisionTraceability.byDecision &&
      foundationHub.decisionReview &&
      typeof foundationHub.decisionReview.total === 'number' &&
      foundationHub.decisionReview.counts &&
      Array.isArray(foundationHub.decisionReview.items),
    'api/foundation-hub returns the expected core arrays',
    `${foundationHub.backlogItems?.length ?? 'invalid'} backlog / ${foundationHub.decisions?.length ?? 'invalid'} decisions / ${foundationHub.openQuestions?.length ?? 'invalid'} questions`,
  )
  addCheck(
    checks,
    /^[0-9a-f]{40}$/.test(dashboardRunningCommit) &&
      dashboardRunningCommit === currentRepoHead &&
      runtimeServedCode.status === 'live' &&
      String(runtimeServedCode.plainEnglish || '').includes('server-start commit') &&
      String(runtimeServedCode.restartCommand || '').includes('launchctl kickstart') &&
      String(input.serverSource || '').includes('await captureDashboardRuntimeMetadata()') &&
      String(input.foundationFrontendSource || '').includes('renderServedCodeTrustPanel'),
    'dashboard served code matches current repo HEAD',
    servedCodeTrustDetail,
  )
  addCheck(
    checks,
    /^[0-9a-f]{40}$/.test(workerRunningCommit) &&
      workerRunningCommit === currentRepoHead &&
      runtimeWorkerCode.status === 'live' &&
      Number(runtimeWorkerCode.processId) === workerLaunchAgent.pid &&
      workerLaunchAgent.ok === true &&
      String(runtimeWorkerCode.plainEnglish || '').includes('worker-start commit') &&
      String(runtimeWorkerCode.restartCommand || '').includes('launchctl kickstart') &&
      String(input.foundationWorkerSource || '').includes('recordFoundationRuntimeStatus') &&
      String(input.serverSource || '').includes('runtimeSupervisor') &&
      String(input.serverSource || '').includes('workerCode') &&
      String(input.foundationFrontendSource || '').includes('renderWorkerCodeTrustPanel'),
    'Foundation worker startup code matches current repo HEAD',
    workerLaunchAgent.ok ? workerCodeTrustDetail : `${workerCodeTrustDetail} LaunchAgent check: ${workerLaunchAgent.error}`,
  )
  addCheck(
    checks,
    input.verifierExceptionLedger?.schemaVersion === 1 &&
      verifierExceptionValidation.invalid.length === 0 &&
      verifierExceptionValidation.expired.length === 0 &&
      verifierExceptionValidation.staleOpenEnded.length === 0 &&
      verifierExceptionValidation.duplicates.length === 0 &&
      String(input.verifierExceptionSource || '').includes('"maxOpenEndedDays": 90') &&
      String(input.verifierExceptionSource || '').includes('"cardId"') &&
      String(input.verifierExceptionSource || '').includes('"approvedAt"'),
    'verifier exceptions are explicit, approved, and not stale',
    `${verifierExceptionValidation.total} exceptions / ${verifierExceptionValidation.openEnded} open-ended / max ${verifierExceptionValidation.maxOpenEndedDays} days`,
  )
  addCheck(
    checks,
    doneCardsWithoutVerifierCoverage.length === 0 &&
      syntheticDoneCoverageMisses.some(item => item.id === syntheticMissingProofCardId),
    'done backlog cards have verifier coverage or explicit exception',
    doneCardsWithoutVerifierCoverage.length
      ? doneCardsWithoutVerifierCoverage.map(item => item.id).join(', ')
      : `${doneBacklogCards.length} done cards checked; synthetic missing-proof card was caught`,
  )
  addCheck(
    checks,
    missingArtifactClaims.length === 0 &&
      syntheticMissingArtifactClaims.some(item => item.includes('missing file docs/process/synthetic-missing-artifact.md')) &&
      syntheticMissingArtifactClaims.some(item => item.includes('missing npm script synthetic:missing')) &&
      syntheticMissingArtifactClaims.some(item => item.includes('missing API route /api/synthetic-missing-artifact')),
    'done cards and closeouts do not claim missing artifacts',
    missingArtifactClaims.length
      ? missingArtifactClaims.slice(0, 12).join(' | ')
      : `${artifactClaimRecords.length} records scanned; synthetic missing file/script/API route was caught`,
  )
  addCheck(
    checks,
    foundationHub.backlogSeedDrift?.policy &&
      Array.isArray(foundationHub.backlogSeedDrift.items) &&
      Array.isArray(foundationHub.backlogSeedDrift.stableFields) &&
      Array.isArray(foundationHub.backlogSeedDrift.mutableFields) &&
      typeof foundationHub.backlogSeedDrift.totalMismatchCount === 'number',
    'api/foundation-hub exposes backlog seed/live drift',
    foundationHub.backlogSeedDrift
      ? `${foundationHub.backlogSeedDrift.driftItemCount} drift rows / ${foundationHub.backlogSeedDrift.totalMismatchCount} mismatches`
      : 'missing seed/live drift payload',
  )
  addCheck(
    checks,
    foundationHub.dbConstraintAudit?.registeredSourceIds === sourceContractsLength &&
      foundationHub.dbConstraintAudit.invalidDecisionCategoryCount === 0 &&
      foundationHub.dbConstraintAudit.invalidSourceReferenceCount === 0 &&
      foundationHub.dbConstraintAudit.pendingDocUpdateStateIssueCount === 0,
    'api/foundation-hub exposes clean DB constraint audit',
    foundationHub.dbConstraintAudit
      ? `${foundationHub.dbConstraintAudit.registeredSourceIds} source IDs / ${foundationHub.dbConstraintAudit.invalidSourceReferenceCount} invalid source refs`
      : 'missing DB constraint audit payload',
  )
  addCheck(
    checks,
    foundationSurfaceMap.length >= 75 &&
      foundationNavSections.every(section => foundationMappedSections.has(section)) &&
      foundationNavSections.every(section => foundationSweepSections.has(section)) &&
      requiredSubSurfaces.every(section => foundationMappedSections.has(section)) &&
      requiredFoundationApiRoutes.every(route => foundationMappedApis.has(route)) &&
      foundationSurfaceMap.every(surface =>
        surface.owner &&
        surface.href &&
        (asArray(surface.backingApis).length || asArray(surface.backingDocs).length || asArray(surface.backingTables).length) &&
        Array.isArray(surface.sourceIds) &&
        Array.isArray(surface.backlogIds)
      ) &&
      foundationHub.surfaceFreshnessSweep?.summary?.mappedSurfaceCount === foundationSurfaceMap.length,
    'Foundation pages, sub-surfaces, and critical API routes are mapped',
    `${foundationSurfaceMap.length} mapped surfaces / ${foundationNavSections.length} nav sections / ${requiredSubSurfaces.length} required sub-surfaces`,
  )
  addCheck(
    checks,
    foundationHub.surfaceFreshnessSweep?.summary &&
      typeof foundationHub.surfaceFreshnessSweep.summary.riskSurfaces === 'number' &&
      typeof foundationHub.surfaceFreshnessSweep.summary.staleActiveRunCount === 'number' &&
      Array.isArray(foundationHub.surfaceFreshnessSweep.findings) &&
      String(input.foundationFrontendSource || '').includes('renderSurfaceFreshnessSweepPanel'),
    'api/foundation-hub exposes the Foundation surface freshness sweep',
    foundationHub.surfaceFreshnessSweep?.summary
      ? `${foundationHub.surfaceFreshnessSweep.summary.mappedSurfaceCount} surfaces / risk=${foundationHub.surfaceFreshnessSweep.summary.riskSurfaces} / stale active runs=${foundationHub.surfaceFreshnessSweep.summary.staleActiveRunCount}`
      : 'missing surface freshness sweep payload',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
    details: {
      verifierExceptionValidation,
      doneCardsWithoutVerifierCoverage,
      missingArtifactClaims,
      dashboardRunningShortCommit,
      workerRunningShortCommit,
      dashboardRunningCommit,
      workerRunningCommit,
    },
  }
}

function buildSurfaceMap(count = 75) {
  const requiredSections = [
    'dashboard-code-trust',
    'worker-code-trust',
    'surface-a',
  ]
  const surfaces = []
  for (let index = 0; index < count; index += 1) {
    const section = requiredSections[index] || `surface-${index}`
    surfaces.push({
      section,
      owner: 'Foundation',
      href: `#${section}`,
      backingApis: index === 0 ? ['/api/foundation-hub'] : [],
      backingDocs: [`docs/${section}.md`],
      backingTables: [],
      sourceIds: [],
      backlogIds: [],
    })
  }
  return surfaces
}

async function buildHealthyFixture(repoRoot) {
  const commit = 'a'.repeat(40)
  const foundationSurfaceMap = buildSurfaceMap(75)
  return {
    repoRoot,
    currentRepoHead: commit,
    foundationHub: {
      backlogItems: [],
      decisions: [],
      openQuestions: [],
      decisionTraceability: { summary: {}, byDecision: {} },
      decisionReview: { total: 0, counts: {}, items: [] },
      runtimeSupervisor: {
        servedCode: {
          runningCommit: commit,
          runningShortCommit: commit.slice(0, 7),
          status: 'live',
          plainEnglish: 'server-start commit recorded',
          restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard',
        },
        workerCode: {
          runningCommit: commit,
          runningShortCommit: commit.slice(0, 7),
          status: 'live',
          processId: 123,
          plainEnglish: 'worker-start commit recorded',
          restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker',
        },
      },
      backlogSeedDrift: {
        policy: 'live wins',
        items: [],
        stableFields: [],
        mutableFields: [],
        totalMismatchCount: 0,
        driftItemCount: 0,
      },
      dbConstraintAudit: {
        registeredSourceIds: 1,
        invalidDecisionCategoryCount: 0,
        invalidSourceReferenceCount: 0,
        pendingDocUpdateStateIssueCount: 0,
      },
      surfaceFreshnessSweep: {
        summary: {
          mappedSurfaceCount: foundationSurfaceMap.length,
          riskSurfaces: 0,
          staleActiveRunCount: 0,
        },
        surfaces: foundationSurfaceMap.map(surface => ({ section: surface.section })),
        findings: [],
      },
    },
    workerLaunchAgent: { ok: true, pid: 123, error: '' },
    serverSource: "app.get('/api/foundation-hub')\nawait captureDashboardRuntimeMetadata()\nruntimeSupervisor\nworkerCode",
    foundationWorkerSource: 'recordFoundationRuntimeStatus',
    foundationFrontendSource: 'renderServedCodeTrustPanel renderWorkerCodeTrustPanel renderSurfaceFreshnessSweepPanel',
    verifierExceptionLedger: { schemaVersion: 1, maxOpenEndedDays: 90, exceptions: [] },
    verifierExceptionSource: '"maxOpenEndedDays": 90 "cardId" "approvedAt"',
    doneBacklogCards: [{ id: 'CARD-1', lane: 'done', title: 'Covered card' }],
    doneBacklogCardIds: new Set(['CARD-1']),
    verifierCoverageSource: 'CARD-1',
    foundationBuildCloseouts: [],
    packageScripts: { 'process:ok': 'node scripts/ok.mjs' },
    routeSources: ["app.get('/api/foundation-hub')"],
    syntheticRouteSources: [],
    foundationSurfaceMap,
    foundationHtmlSource: '<button data-section="dashboard-code-trust"></button>',
    sourceContractsLength: 1,
    requiredSubSurfaces: ['dashboard-code-trust'],
    requiredFoundationApiRoutes: ['/api/foundation-hub'],
  }
}

export async function buildFoundationSurfaceTrustVerifierDogfoodProof() {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-surface-trust-verifier-'))
  try {
    await fs.mkdir(path.join(tmpRoot, 'docs/process'), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, 'docs/process/existing.md'), 'fixture\n', 'utf8')
    const healthy = await evaluateFoundationSurfaceTrustVerifier(await buildHealthyFixture(tmpRoot))
    const staleExceptionFixture = await buildHealthyFixture(tmpRoot)
    staleExceptionFixture.verifierExceptionLedger = {
      schemaVersion: 1,
      maxOpenEndedDays: 90,
      exceptions: [{
        cardId: 'CARD-1',
        reason: 'synthetic stale exception',
        approver: 'Codex synthetic proof',
        approvedAt: '2025-01-01T00:00:00.000Z',
        expiresAt: null,
      }],
    }
    const staleException = await evaluateFoundationSurfaceTrustVerifier(staleExceptionFixture)
    const missingDoneCoverageFixture = await buildHealthyFixture(tmpRoot)
    missingDoneCoverageFixture.verifierCoverageSource = ''
    const missingDoneCoverage = await evaluateFoundationSurfaceTrustVerifier(missingDoneCoverageFixture)
    const missingArtifactFixture = await buildHealthyFixture(tmpRoot)
    missingArtifactFixture.doneBacklogCards = [{
      id: 'CARD-1',
      lane: 'done',
      title: 'Missing claims',
      summary: 'Claims docs/process/missing.md npm run process:missing /api/missing',
    }]
    missingArtifactFixture.routeSources = []
    missingArtifactFixture.packageScripts = {}
    const missingArtifact = await evaluateFoundationSurfaceTrustVerifier(missingArtifactFixture)
    const staleServedCodeFixture = await buildHealthyFixture(tmpRoot)
    staleServedCodeFixture.foundationHub.runtimeSupervisor.servedCode.runningCommit = 'b'.repeat(40)
    const staleServedCode = await evaluateFoundationSurfaceTrustVerifier(staleServedCodeFixture)
    const missingSurfaceMapFixture = await buildHealthyFixture(tmpRoot)
    missingSurfaceMapFixture.foundationSurfaceMap = buildSurfaceMap(1)
    missingSurfaceMapFixture.foundationHub.surfaceFreshnessSweep.summary.mappedSurfaceCount = 1
    missingSurfaceMapFixture.foundationHub.surfaceFreshnessSweep.surfaces = missingSurfaceMapFixture.foundationSurfaceMap.map(surface => ({ section: surface.section }))
    const missingSurfaceMap = await evaluateFoundationSurfaceTrustVerifier(missingSurfaceMapFixture)

    return {
      ok: healthy.ok &&
        staleException.ok === false &&
        missingDoneCoverage.ok === false &&
        missingArtifact.ok === false &&
        staleServedCode.ok === false &&
        missingSurfaceMap.ok === false,
      healthy,
      rejected: {
        staleException,
        missingDoneCoverage,
        missingArtifact,
        staleServedCode,
        missingSurfaceMap,
      },
      dogfoodInvariant: 'healthy fixture passes; stale exception, missing done-card proof, missing artifact claims, stale served code, and incomplete surface map fail closed',
    }
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {})
  }
}

export async function evaluateFoundationSurfaceTrustVerifierOrchestration(input = {}) {
  const {
    activeFoundationSprint = { sprint: null, items: [] },
    currentPlan = '',
    currentState = '',
    foundationBuildCloseouts = [],
    foundationSurfaceTrustVerifierSource = '',
    foundationVerifyRootSource = '',
    packageJson = {},
    repoFileExists = async () => false,
    verifierSurfaceTrustSplitModuleScriptSource = '',
    verifierSurfaceTrustSplitModulePlanSource = '',
  } = input
  const checks = []
  const surfaceTrustVerifier = await evaluateFoundationSurfaceTrustVerifier(input)
  checks.push(...surfaceTrustVerifier.checks)
  const surfaceTrustDogfood = await buildFoundationSurfaceTrustVerifierDogfoodProof()
  const backlogItems = input.foundationHub?.backlogItems || []
  const item = id => backlogItems.find(backlogItem => backlogItem.id === id) || null
  const activeSprintItem = id =>
    (activeFoundationSprint.items || [])
      .map(sprintItem => sprintItem.backlog)
      .find(backlogItem => backlogItem?.id === id) || null
  const foundationVerifyLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const verifierSurfaceTrustSplitModuleCard =
    item(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID) ||
    activeSprintItem(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID)
  const verifierSurfaceTrustSplitModuleCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierSurfaceTrustSplitModuleClosed = verifierSurfaceTrustSplitModuleCard?.lane === 'done'
  const surfaceTrustOldInlinePatterns = [
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1400}'api/foundation-hub returns the expected core arrays'"),
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1400}'api/foundation-hub exposes the Foundation surface freshness sweep'"),
  ]
  const surfaceTrustOrchestrationOldRootPatterns = [
    'const surfaceTrustVerifier = await evaluateFoundationSurfaceTrustVerifier({',
    'const surfaceTrustDogfood = await buildFoundationSurfaceTrustVerifierDogfoodProof()',
    'const verifierSurfaceTrustSplitModuleCard =',
  ]

  addCheck(
    checks,
    surfaceTrustDogfood.ok === true &&
      surfaceTrustDogfood.rejected.staleException.ok === false &&
      surfaceTrustDogfood.rejected.missingDoneCoverage.ok === false &&
      surfaceTrustDogfood.rejected.missingArtifact.ok === false &&
      surfaceTrustDogfood.rejected.staleServedCode.ok === false &&
      surfaceTrustDogfood.rejected.missingSurfaceMap.ok === false,
    'surface/trust verifier dogfood rejects stale trust and missing proof failures',
    surfaceTrustDogfood.dogfoodInvariant,
  )

  addCheck(
    checks,
    verifierSurfaceTrustSplitModuleCard &&
      ['executing', 'done'].includes(verifierSurfaceTrustSplitModuleCard.lane) &&
      (!verifierSurfaceTrustSplitModuleClosed || (
        String(verifierSurfaceTrustSplitModuleCard.statusNote || '').includes(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierSurfaceTrustSplitModuleCloseout?.operatorCloseout === true &&
        (verifierSurfaceTrustSplitModuleCloseout.backlogIds || []).includes(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-surface-trust-split-module-closeout.md')
      )) &&
      surfaceTrustDogfood.ok === true &&
      surfaceTrustVerifier.summary.passed === surfaceTrustVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-surface-trust-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationSurfaceTrustVerifierSource.includes('evaluateFoundationSurfaceTrustVerifier') &&
      foundationSurfaceTrustVerifierSource.includes('buildFoundationSurfaceTrustVerifierDogfoodProof') &&
      verifierSurfaceTrustSplitModuleScriptSource.includes('dogfood rejects stale surface/trust verifier failures') &&
      verifierSurfaceTrustSplitModulePlanSource.includes('Dogfood proof recreates the failure class') &&
      foundationVerifyRootSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('surfaceTrustOrchestrationVerifier.checks') &&
      surfaceTrustOldInlinePatterns.every(pattern => !pattern.test(foundationVerifyRootSource)) &&
      currentPlan.includes(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SPRINT_ID ||
        verifierSurfaceTrustSplitModuleClosed) &&
      foundationSurfaceTrustVerifierSource.includes(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID),
    'VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001 extracts surface/trust verifier checks into a focused module',
    verifierSurfaceTrustSplitModuleCard
      ? `lane=${verifierSurfaceTrustSplitModuleCard.lane} dogfood=${surfaceTrustDogfood.ok ? 'pass' : 'blocked'} surfaceChecks=${surfaceTrustVerifier.summary.passed}/${surfaceTrustVerifier.summary.total} lines=${VERIFIER_SURFACE_TRUST_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID}`,
  )

  const verifierSurfaceTrustOrchestrationCard =
    item(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID) ||
    activeSprintItem(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierSurfaceTrustOrchestrationCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  addCheck(
    checks,
    verifierSurfaceTrustOrchestrationCard &&
      ['executing', 'done'].includes(verifierSurfaceTrustOrchestrationCard.lane) &&
      String(verifierSurfaceTrustOrchestrationCard.statusNote || '').includes(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierSurfaceTrustOrchestrationCloseout?.operatorCloseout === true &&
      (verifierSurfaceTrustOrchestrationCloseout.backlogIds || []).includes(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID) &&
      surfaceTrustDogfood.ok === true &&
      surfaceTrustVerifier.summary.passed === surfaceTrustVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-surface-trust-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationSurfaceTrustVerifierSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('surfaceTrustOrchestrationVerifier.checks') &&
      surfaceTrustOrchestrationOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001 moves surface/trust orchestration into the focused module',
    verifierSurfaceTrustOrchestrationCard
      ? `lane=${verifierSurfaceTrustOrchestrationCard.lane} dogfood=${surfaceTrustDogfood.ok ? 'pass' : 'blocked'} surfaceChecks=${surfaceTrustVerifier.summary.passed}/${surfaceTrustVerifier.summary.total} lines=${VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    surfaceTrustVerifier,
    dogfood: surfaceTrustDogfood,
  }
}
