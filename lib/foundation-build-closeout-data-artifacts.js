import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_DIR = 'data/foundation-build-closeouts'
export const FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS = [
  {
    "artifactId": "action-route-records",
    "relativePath": "data/foundation-build-closeouts/action-route-records.json",
    "exportName": "actionRouteCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-action-route-records.js",
    "family": "action-route"
  },
  {
    "artifactId": "agent-feedback-records",
    "relativePath": "data/foundation-build-closeouts/agent-feedback-records.json",
    "exportName": "agentFeedbackCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-agent-feedback-records.js",
    "family": "agent-feedback"
  },
  {
    "artifactId": "agent-runtime-records",
    "relativePath": "data/foundation-build-closeouts/agent-runtime-records.json",
    "exportName": "agentRuntimeCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-agent-runtime-records.js",
    "family": "agent-runtime"
  },
  {
    "artifactId": "build-lane-records",
    "relativePath": "data/foundation-build-closeouts/build-lane-records.json",
    "exportName": "buildLaneCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-build-lane-records.js",
    "family": "build-lane"
  },
  {
    "artifactId": "cleanup-records",
    "relativePath": "data/foundation-build-closeouts/cleanup-records.json",
    "exportName": "cleanupCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-cleanup-records.js",
    "family": "cleanup"
  },
  {
    "artifactId": "control-layer-records",
    "relativePath": "data/foundation-build-closeouts/control-layer-records.json",
    "exportName": "controlLayerCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-control-layer-records.js",
    "family": "control-layer"
  },
  {
    "artifactId": "control-plane-records",
    "relativePath": "data/foundation-build-closeouts/control-plane-records.json",
    "exportName": "controlPlaneCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-control-plane-records.js",
    "family": "control-plane"
  },
  {
    "artifactId": "db-process-records",
    "relativePath": "data/foundation-build-closeouts/db-process-records.json",
    "exportName": "dbProcessCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-db-process-records.js",
    "family": "db-process"
  },
  {
    "artifactId": "doctrine-cleanup-records",
    "relativePath": "data/foundation-build-closeouts/doctrine-cleanup-records.json",
    "exportName": "doctrineCleanupCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-doctrine-cleanup-records.js",
    "family": "doctrine-cleanup"
  },
  {
    "artifactId": "foundation-surface-records",
    "relativePath": "data/foundation-build-closeouts/foundation-surface-records.json",
    "exportName": "foundationSurfaceCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-foundation-surface-records.js",
    "family": "foundation-surface"
  },
  {
    "artifactId": "intelligence-records",
    "relativePath": "data/foundation-build-closeouts/intelligence-records.json",
    "exportName": "intelligenceCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-intelligence-records.js",
    "family": "intelligence"
  },
  {
    "artifactId": "model-records",
    "relativePath": "data/foundation-build-closeouts/model-records.json",
    "exportName": "modelCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-model-records.js",
    "family": "model"
  },
  {
    "artifactId": "process-gate-governance-records",
    "relativePath": "data/foundation-build-closeouts/process-gate-governance-records.json",
    "exportName": "processGateGovernanceCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-process-gate-governance-records.js",
    "family": "process-gate-governance"
  },
  {
    "artifactId": "process-gate-operations-records",
    "relativePath": "data/foundation-build-closeouts/process-gate-operations-records.json",
    "exportName": "processGateOperationsCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-process-gate-operations-records.js",
    "family": "process-gate-operations"
  },
  {
    "artifactId": "process-gate-source-contract-records",
    "relativePath": "data/foundation-build-closeouts/process-gate-source-contract-records.json",
    "exportName": "processGateSourceContractCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-process-gate-source-contract-records.js",
    "family": "process-gate-source-contract"
  },
  {
    "artifactId": "process-gate-sprint-records",
    "relativePath": "data/foundation-build-closeouts/process-gate-sprint-records.json",
    "exportName": "processGateSprintCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-process-gate-sprint-records.js",
    "family": "process-gate-sprint"
  },
  {
    "artifactId": "route-frontend-records",
    "relativePath": "data/foundation-build-closeouts/route-frontend-records.json",
    "exportName": "routeFrontendCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-route-frontend-records.js",
    "family": "route-frontend"
  },
  {
    "artifactId": "size-records",
    "relativePath": "data/foundation-build-closeouts/size-records.json",
    "exportName": "sizeCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-size-records.js",
    "family": "size"
  },
  {
    "artifactId": "source-browser-core-records",
    "relativePath": "data/foundation-build-closeouts/source-browser-core-records.json",
    "exportName": "sourceBrowserCoreCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-browser-core-records.js",
    "family": "source-browser-core"
  },
  {
    "artifactId": "source-maturity-core-records",
    "relativePath": "data/foundation-build-closeouts/source-maturity-core-records.json",
    "exportName": "sourceMaturityCoreCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-maturity-core-records.js",
    "family": "source-maturity-core"
  },
  {
    "artifactId": "source-maturity-followup-records",
    "relativePath": "data/foundation-build-closeouts/source-maturity-followup-records.json",
    "exportName": "sourceMaturityFollowupCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-maturity-followup-records.js",
    "family": "source-maturity-followup"
  },
  {
    "artifactId": "source-maturity-routing-records",
    "relativePath": "data/foundation-build-closeouts/source-maturity-routing-records.json",
    "exportName": "sourceMaturityRoutingCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-maturity-routing-records.js",
    "family": "source-maturity-routing"
  },
  {
    "artifactId": "source-newsletter-records",
    "relativePath": "data/foundation-build-closeouts/source-newsletter-records.json",
    "exportName": "sourceNewsletterCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-newsletter-records.js",
    "family": "source-newsletter"
  },
  {
    "artifactId": "source-once-over-records",
    "relativePath": "data/foundation-build-closeouts/source-once-over-records.json",
    "exportName": "sourceOnceOverCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-once-over-records.js",
    "family": "source-once-over"
  },
  {
    "artifactId": "source-repo-fallback-records",
    "relativePath": "data/foundation-build-closeouts/source-repo-fallback-records.json",
    "exportName": "sourceRepoFallbackCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-repo-fallback-records.js",
    "family": "source-repo-fallback"
  },
  {
    "artifactId": "source-session-records",
    "relativePath": "data/foundation-build-closeouts/source-session-records.json",
    "exportName": "sourceSessionCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-session-records.js",
    "family": "source-session"
  },
  {
    "artifactId": "source-youtube-pipeline-records",
    "relativePath": "data/foundation-build-closeouts/source-youtube-pipeline-records.json",
    "exportName": "sourceYoutubePipelineCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-source-youtube-pipeline-records.js",
    "family": "source-youtube-pipeline"
  },
  {
    "artifactId": "tightening-records",
    "relativePath": "data/foundation-build-closeouts/tightening-records.json",
    "exportName": "verifierTighteningCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-tightening-records.js",
    "family": "tightening"
  },
  {
    "artifactId": "verifier-runtime-records",
    "relativePath": "data/foundation-build-closeouts/verifier-runtime-records.json",
    "exportName": "verifierRuntimeCloseoutRecords",
    "migratedFrom": "lib/foundation-build-closeout-verifier-runtime-records.js",
    "family": "verifier-runtime"
  }
]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const REQUIRED_TEXT_FIELDS = [
  'key',
  'systemArea',
  'status',
  'acceptanceState',
  'whatChanged',
  'whatItDoes',
  'whyItMatters',
  'proofStatus',
  'reviewNext',
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => normalizeText(value))
    .filter(Boolean)
}

function assertArtifactId(value = '') {
  const artifactId = normalizeText(value)
  if (!/^[a-z0-9-]+$/.test(artifactId)) {
    throw new Error(`Invalid closeout data artifact id: ${value}`)
  }
  return artifactId
}

function artifactDefinitionForId(artifactId = '') {
  const normalized = assertArtifactId(artifactId)
  const definition = FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS.find(item => item.artifactId === normalized)
  if (!definition) throw new Error(`Unknown closeout data artifact: ${artifactId}`)
  return definition
}

function artifactAbsolutePath(definition = {}) {
  const absolutePath = path.resolve(repoRoot, definition.relativePath)
  const dataRoot = path.resolve(repoRoot, FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_DIR)
  if (!absolutePath.startsWith(dataRoot + path.sep)) {
    throw new Error(`Closeout data artifact path escapes data directory: ${definition.relativePath}`)
  }
  return absolutePath
}

export function validateFoundationBuildCloseoutDataArtifactRecords(records = []) {
  const normalizedRecords = Array.isArray(records) ? records : []
  const keys = new Set()
  const invalid = []
  const duplicateKeys = []

  for (const record of normalizedRecords) {
    const key = normalizeText(record?.key)
    if (keys.has(key)) duplicateKeys.push(key)
    if (key) keys.add(key)
    const hasRequiredText = REQUIRED_TEXT_FIELDS.every(field => normalizeText(record?.[field]))
    const hasLists = normalizeList(record?.backlogIds).length > 0 &&
      normalizeList(record?.whereItLives).length > 0 &&
      normalizeList(record?.proofCommands).length > 0
    if (!key || !hasRequiredText || !hasLists) invalid.push(key || '<missing-key>')
  }

  return {
    ok: invalid.length === 0 && duplicateKeys.length === 0,
    recordCount: normalizedRecords.length,
    invalid,
    duplicateKeys,
    keys: Array.from(keys),
  }
}

export function loadFoundationBuildCloseoutDataArtifact(artifactId = '') {
  const definition = artifactDefinitionForId(artifactId)
  const source = fs.readFileSync(artifactAbsolutePath(definition), 'utf8')
  const records = JSON.parse(source)
  const validation = validateFoundationBuildCloseoutDataArtifactRecords(records)
  if (!validation.ok) {
    throw new Error(`Invalid closeout data artifact ${artifactId}: invalid=${validation.invalid.join(', ')} duplicates=${validation.duplicateKeys.join(', ')}`)
  }
  return records.map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    mentionedBacklogIds: normalizeList(record.mentionedBacklogIds),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

export function buildFoundationBuildCloseoutDataArtifactSnapshot() {
  return FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS.map(definition => {
    const records = loadFoundationBuildCloseoutDataArtifact(definition.artifactId)
    const validation = validateFoundationBuildCloseoutDataArtifactRecords(records)
    return {
      ...definition,
      recordCount: records.length,
      validation,
      keys: records.map(record => record.key),
    }
  })
}
