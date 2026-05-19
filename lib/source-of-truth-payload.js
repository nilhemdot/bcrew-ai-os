import fs from 'node:fs'
import path from 'node:path'

import { getCachedSafeKpiHealthSnapshot } from './kpi-health.js'
import {
  attachSourceTrustScoresToContracts,
  attachSourceTrustScoresToLayerStatus,
  buildSourceTrustScoringSnapshot,
  compactSourceTrustScoringSnapshot,
} from './data-002-source-trust-scoring.js'
import { buildSourceConnectorLayerStatus } from './source-012-source-connector-layers.js'
import {
  getGroupedSourceSystems,
  getSourceConnectors,
  getSourceContracts,
  getSystemServiceAreas,
} from './source-contracts.js'

export const SOURCE_OF_TRUTH_PERF_BUDGET_CARD_ID = 'SOURCE-OF-TRUTH-PERF-BUDGET-001'
export const SOURCE_OF_TRUTH_PERF_BUDGET_LATENCY_MS = 1000
export const SOURCE_OF_TRUTH_PERF_BUDGET_BYTES = 200_000

const STRATEGY_DOC_RELATIVE_PATHS = [
  'docs/strategy/bhag-model.md',
  'docs/strategy/agent-engine.md',
  'docs/strategy/quarterly-priorities.md',
  'docs/strategy/strategic-issues.md',
  'docs/strategy/governance.md',
  'docs/strategy/department-mandates.md',
  'docs/strategy/core-values.md',
  'docs/strategy/marketmasters.md',
]

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getDocMeta(repoRoot, filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      exists: true,
      path: path.relative(repoRoot, filePath),
      lines: content.split('\n').length,
      updatedAt: stat.mtime.toISOString(),
      daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86_400_000),
    }
  } catch {
    return {
      exists: false,
      path: path.relative(repoRoot, filePath),
      lines: 0,
      updatedAt: null,
      daysOld: null,
    }
  }
}

function parseSections(markdown) {
  if (!markdown) return []
  const sections = []
  let current = null
  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.slice(3).trim(), body: [] }
      continue
    }
    if (current) current.body.push(line)
  }
  if (current) sections.push(current)
  return sections
    .map(section => ({ title: section.title, content: section.body.join('\n').trim() }))
    .filter(section => section.content)
}

function getSupportingStrategyDocs(repoRoot) {
  return STRATEGY_DOC_RELATIVE_PATHS.map(relativePath => {
    const filePath = path.join(repoRoot, relativePath)
    const content = readFileSafe(filePath)
    return {
      meta: getDocMeta(repoRoot, filePath),
      sections: parseSections(content),
    }
  })
}

export async function buildSourceOfTruthPayload({ repoRoot = process.cwd() } = {}) {
  const docsDir = path.join(repoRoot, 'docs')
  const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
  const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
  const businessStrategy = readFileSafe(businessStrategyPath)
  const sourceRegistry = readFileSafe(sourceRegistryPath)
  const supportingStrategy = getSupportingStrategyDocs(repoRoot)
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const groupedSourceSystems = getGroupedSourceSystems()
  const systemServiceAreas = getSystemServiceAreas()
  const kpiHealth = await getCachedSafeKpiHealthSnapshot()
  const sourceLayerStatus = buildSourceConnectorLayerStatus({
    sourceContracts,
    sourceConnectors,
    groupedSourceSystems,
  })
  const sourceTrustScoring = buildSourceTrustScoringSnapshot({
    sourceContracts,
    sourceLayerStatus,
    kpiHealth,
  })
  const scoredSourceContracts = attachSourceTrustScoresToContracts(sourceContracts, sourceTrustScoring)
  const scoredSourceLayerStatus = attachSourceTrustScoresToLayerStatus(sourceLayerStatus, sourceTrustScoring)
  const compactSourceTrustScoring = compactSourceTrustScoringSnapshot(sourceTrustScoring)
  const signedOffSourceCount = sourceContracts.filter(source => source.validation === 'Signed Off').length
  const readableSourceCount = sourceContracts.filter(source =>
    source.validation === 'Readable Only' || source.status === 'Verified Readable'
  ).length

  return {
    title: 'BCrew AI OS',
    foundation: {
      businessStrategy: {
        meta: getDocMeta(repoRoot, businessStrategyPath),
        sections: parseSections(businessStrategy),
      },
      sourceRegistry: {
        meta: getDocMeta(repoRoot, sourceRegistryPath),
        sections: parseSections(sourceRegistry),
      },
      supportingStrategy,
    },
    sources: scoredSourceContracts,
    connectors: sourceConnectors,
    sourceLayerStatus: scoredSourceLayerStatus,
    sourceTrustScoring: compactSourceTrustScoring,
    groupedSystems: groupedSourceSystems,
    systemServiceAreas,
    kpiHealth,
    systemStatus: [
      {
        key: 'strategy-doc',
        label: 'Business Strategy',
        status: businessStrategy ? 'connected' : 'missing',
        detail: businessStrategy
          ? 'Primary strategy source is in the repo and rendered in the dashboard.'
          : 'Missing docs/business-strategy.md.',
      },
      {
        key: 'supporting-strategy',
        label: 'Supporting Strategy',
        status: supportingStrategy.every(doc => doc.meta.exists) ? 'connected' : 'pending',
        detail: 'BHAG model, Agent Engine, mandates, governance, and the other supporting docs exist as a maintainable layer around the core strategy.',
      },
      {
        key: 'source-trust',
        label: 'Source Trust',
        status: sourceRegistry ? 'pending' : 'missing',
        detail: sourceRegistry
          ? `${signedOffSourceCount} source contract${signedOffSourceCount === 1 ? '' : 's'} signed off and ${readableSourceCount} connected source${readableSourceCount === 1 ? '' : 's'} readable in the rebuild; finance and CRM trust review are still in progress.`
          : 'Create the registry next so every business input has an owner, validation state, and trust boundary.',
      },
      {
        key: 'foundation-memory',
        label: 'Foundation Memory',
        status: 'live',
        detail: 'Backlog, decisions, open questions, pending doc updates, and recent changes are running through the Foundation trust layer.',
      },
      {
        key: 'verification',
        label: 'Verification',
        status: 'connected',
        detail: 'Baseline verification is now live through `npm run foundation:verify`, covering the trust layer APIs, Google delegated health, FUB health, Owners sign-off consistency, and backlog truth drift on key source-closeout cards.',
      },
      {
        key: 'assistant-loop',
        label: 'Trusted Assistant Loop',
        status: 'pending',
        detail: 'The first narrow assistant loop is not proven end to end yet. The rebuild still needs source sign-off, verification, and memory-baseline proof.',
      },
    ],
  }
}

export function evaluateSourceOfTruthRouteBudget({
  durationMs = 0,
  bytes = 0,
  maxDurationMs = SOURCE_OF_TRUTH_PERF_BUDGET_LATENCY_MS,
  maxBytes = SOURCE_OF_TRUTH_PERF_BUDGET_BYTES,
} = {}) {
  const normalizedDurationMs = Number(durationMs) || 0
  const normalizedBytes = Number(bytes) || 0
  return {
    ok: normalizedDurationMs > 0 &&
      normalizedDurationMs < Number(maxDurationMs) &&
      normalizedBytes > 0 &&
      normalizedBytes < Number(maxBytes),
    durationMs: normalizedDurationMs,
    bytes: normalizedBytes,
    maxDurationMs: Number(maxDurationMs),
    maxBytes: Number(maxBytes),
    durationOverByMs: Math.max(0, normalizedDurationMs - Number(maxDurationMs)),
    bytesOverBy: Math.max(0, normalizedBytes - Number(maxBytes)),
  }
}

export function buildSourceOfTruthRouteDogfoodProof() {
  const passing = evaluateSourceOfTruthRouteBudget({ durationMs: 120, bytes: 134_000 })
  const failing = evaluateSourceOfTruthRouteBudget({ durationMs: 2_489, bytes: 134_000 })
  return {
    ok: passing.ok === true && failing.ok === false,
    passing,
    failing,
    invariant: 'The route budget checker rejects the old over-latency source-of-truth measurement and accepts a warmed cached-route measurement.',
  }
}
