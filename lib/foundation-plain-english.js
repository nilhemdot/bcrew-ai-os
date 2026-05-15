import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const PLAIN_ENGLISH_SWEEP_SCHEMA_VERSION = 1
export const PLAIN_ENGLISH_SWEEP_CARD_ID = 'PLAIN-ENGLISH-SWEEP-001'
export const PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY = 'plain-english-sweep-v1'
export const PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH = 'docs/process/plain-english-sweep-v1.json'
export const PLAIN_ENGLISH_SWEEP_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-plain-english-sweep-manual-review.md'

export const PLAIN_ENGLISH_SWEEP_CATEGORY_MINIMUMS = {
  backlog_action_review: 8,
  runtime_health: 8,
  recent_work_build_log: 8,
  data_sources: 8,
  system_inventory: 8,
  shell_nav_mobile_error_empty: 8,
}

export const PLAIN_ENGLISH_SWEEP_REQUIRED_ROUTES = [
  '/foundation#backlog',
  '/foundation#system-health',
  '/foundation#build-log',
  '/foundation#source-overview',
  '/foundation#source-docs',
  '/foundation#source-sheets',
  '/foundation#source-apis',
  '/foundation#source-connectors',
  '/foundation#inventory-docs',
  '/foundation#capabilities-skills',
  '/foundation#capabilities-plugins',
  '/foundation#capabilities-agents',
]

export const PLAIN_ENGLISH_SWEEP_REQUIRED_VIEWPORTS = ['desktop', 'mobile']

function normalizeText(value) {
  return String(value || '').trim()
}

function countBy(values, keyFn) {
  return (values || []).reduce((acc, value) => {
    const key = keyFn(value)
    if (key) acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readOptionalText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readProofSourceForPath(repoRoot, relativePath) {
  if (relativePath === 'public/foundation.js') {
    const parts = await Promise.all([
      readOptionalText(path.join(repoRoot, 'public/foundation.js')),
      readOptionalText(path.join(repoRoot, 'public/foundation-data.js')),
      readOptionalText(path.join(repoRoot, 'public/foundation-source-lifecycle-renderers.js')),
      readOptionalText(path.join(repoRoot, 'public/foundation-runtime-renderers.js')),
      readOptionalText(path.join(repoRoot, 'public/foundation-operations-renderers.js')),
    ])
    return parts.join('\n')
  }
  return readOptionalText(path.join(repoRoot, relativePath))
}

function addFinding(findings, ok, check, detail = '', severity = 'critical') {
  if (!ok) findings.push({ severity, check, detail })
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

export async function loadPlainEnglishSweepArtifact({ repoRoot = defaultRepoRoot } = {}) {
  const artifactPath = path.join(repoRoot, PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH)
  try {
    return await readJsonFile(artifactPath)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

export async function buildPlainEnglishSweepStatus({ repoRoot = defaultRepoRoot } = {}) {
  const artifact = await loadPlainEnglishSweepArtifact({ repoRoot })
  const findings = []
  const entries = Array.isArray(artifact?.auditEntries) ? artifact.auditEntries : []
  const categoryCounts = countBy(entries, entry => entry.category)
  const changedEntries = entries.filter(entry => entry.outcome === 'changed').length
  const keptEntries = entries.filter(entry => entry.outcome === 'kept').length
  const invalidProtectedEntries = entries.filter(entry => entry.protectedIdentifiersChanged !== false)
  const files = unique(entries.map(entry => entry.file))

  addFinding(findings, Boolean(artifact), 'plain-English audit artifact exists', PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH)
  addFinding(findings, artifact?.schemaVersion === PLAIN_ENGLISH_SWEEP_SCHEMA_VERSION, 'artifact schema matches v1', String(artifact?.schemaVersion || 'missing'))
  addFinding(findings, artifact?.cardId === PLAIN_ENGLISH_SWEEP_CARD_ID, 'artifact owns exactly PLAIN-ENGLISH-SWEEP-001', artifact?.cardId || 'missing')
  addFinding(findings, artifact?.closeoutKey === PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY, 'artifact closeout key matches approval', artifact?.closeoutKey || 'missing')
  addFinding(findings, entries.length >= 60, 'at least 60 copy entries were audited', `${entries.length}/60`)

  Object.entries(PLAIN_ENGLISH_SWEEP_CATEGORY_MINIMUMS).forEach(([category, minimum]) => {
    addFinding(
      findings,
      (categoryCounts[category] || 0) >= minimum,
      `minimum ${category} copy coverage`,
      `${categoryCounts[category] || 0}/${minimum}`,
    )
  })

  const entryIds = entries.map(entry => normalizeText(entry.id))
  addFinding(findings, unique(entryIds).length === entryIds.length, 'audit entry IDs are unique', `${unique(entryIds).length}/${entryIds.length}`)
  entries.forEach(entry => {
    addFinding(findings, Boolean(normalizeText(entry.id)), 'audit entry has id', JSON.stringify(entry).slice(0, 120))
    addFinding(findings, Boolean(normalizeText(entry.surface)), `audit entry ${entry.id || 'unknown'} has surface`, entry.surface || 'missing')
    addFinding(findings, Boolean(normalizeText(entry.file)), `audit entry ${entry.id || 'unknown'} has file`, entry.file || 'missing')
    addFinding(findings, Boolean(normalizeText(entry.before)), `audit entry ${entry.id || 'unknown'} has before copy`, entry.before || 'missing')
    addFinding(findings, Boolean(normalizeText(entry.after)), `audit entry ${entry.id || 'unknown'} has after copy`, entry.after || 'missing')
    addFinding(findings, ['changed', 'kept'].includes(entry.outcome), `audit entry ${entry.id || 'unknown'} has valid outcome`, entry.outcome || 'missing')
  })
  addFinding(findings, invalidProtectedEntries.length === 0, 'no protected identifiers were changed for copy cleanup', `${invalidProtectedEntries.length} protected-change flags`)

  const changedProofEntries = entries.filter(entry => entry.outcome === 'changed')
  for (const entry of changedProofEntries) {
    const relativePath = normalizeText(entry.file)
    const proofTexts = unique([
      normalizeText(entry.proofText || entry.after),
      ...(Array.isArray(entry.successorProofText) ? entry.successorProofText.map(normalizeText) : []),
    ]).filter(Boolean)
    if (!relativePath || !proofTexts.length) continue
    const sourceText = await readProofSourceForPath(repoRoot, relativePath)
    addFinding(
      findings,
      proofTexts.some(proofText => sourceText.includes(proofText)),
      `changed copy is present for ${entry.id}`,
      `${relativePath} :: ${proofTexts[0].slice(0, 80)}`,
    )
  }

  const manualPath = normalizeText(artifact?.manualReview?.artifactPath)
  const manualText = manualPath ? await readOptionalText(path.join(repoRoot, manualPath)) : ''
  const routeChecks = Array.isArray(artifact?.manualReview?.routeChecks) ? artifact.manualReview.routeChecks : []
  const failedRouteChecks = routeChecks.filter(check => check.status !== 'pass')
  addFinding(findings, manualPath === PLAIN_ENGLISH_SWEEP_MANUAL_REVIEW_PATH, 'manual review artifact path is recorded', manualPath || 'missing')
  addFinding(findings, Boolean(manualText), 'manual review artifact exists', manualPath || 'missing')
  addFinding(findings, failedRouteChecks.length === 0, 'manual review has zero failed route/viewport checks', `${failedRouteChecks.length} failed`)
  PLAIN_ENGLISH_SWEEP_REQUIRED_ROUTES.forEach(route => {
    PLAIN_ENGLISH_SWEEP_REQUIRED_VIEWPORTS.forEach(viewport => {
      const check = routeChecks.find(item => item.route === route && item.viewport === viewport)
      addFinding(
        findings,
        check?.status === 'pass' && manualText.includes(route) && manualText.includes(viewport),
        `manual review pass for ${route} ${viewport}`,
        check?.status || 'missing',
      )
    })
  })

  addFinding(findings, artifact?.scopeControls?.copyOnly === true, 'scope control confirms copy-only sweep', String(artifact?.scopeControls?.copyOnly))
  addFinding(findings, artifact?.scopeControls?.noIdsSelectorsContractsChanged === true, 'scope control protects IDs/selectors/contracts', String(artifact?.scopeControls?.noIdsSelectorsContractsChanged))
  addFinding(findings, artifact?.scopeControls?.noUiRedesign === true, 'scope control blocks UI redesign', String(artifact?.scopeControls?.noUiRedesign))
  addFinding(findings, artifact?.scopeControls?.noSourceExpansion === true, 'scope control blocks source expansion', String(artifact?.scopeControls?.noSourceExpansion))
  addFinding(findings, artifact?.scopeControls?.noStrategyScoperAgentFactoryCorpus === true, 'scope control blocks forbidden lanes', String(artifact?.scopeControls?.noStrategyScoperAgentFactoryCorpus))

  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: PLAIN_ENGLISH_SWEEP_CARD_ID,
    closeoutKey: PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY,
    artifactPath: PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH,
    manualReviewPath: PLAIN_ENGLISH_SWEEP_MANUAL_REVIEW_PATH,
    summary: {
      totalEntries: entries.length,
      changedEntries,
      keptEntries,
      fileCount: files.length,
      categoryCounts,
      manualRouteChecks: routeChecks.length,
      manualRouteFailures: failedRouteChecks.length,
    },
    findings,
  }
}
