import fs from 'node:fs/promises'
import path from 'node:path'
import { getFoundationBuildCloseouts } from './foundation-build-log.js'
import { FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS } from './foundation-build-closeout-data-artifacts.js'

export const FOUNDATION_BUILD_LOG_BEHAVIOR_SOURCE_PATH = 'lib/foundation-build-log.js'
export const FOUNDATION_BUILD_CLOSEOUT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_ACTION_ROUTE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-action-route-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_AGENT_FEEDBACK_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-agent-feedback-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_BUILD_LANE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-build-lane-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-control-plane-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CLEANUP_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-cleanup-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CONTROL_LAYER_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-control-layer-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_DB_PROCESS_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-db-process-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_DOCTRINE_CLEANUP_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-doctrine-cleanup-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_FOUNDATION_SURFACE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-foundation-surface-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_OVERNIGHT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-overnight-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-process-gate-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_SPRINT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-process-gate-sprint-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_SOURCE_CONTRACT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-process-gate-source-contract-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_GOVERNANCE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-process-gate-governance-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_OPERATIONS_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-process-gate-operations-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_ROUTE_FRONTEND_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-route-frontend-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SIZE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-size-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_ONCE_OVER_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-once-over-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_BROWSER_CORE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-browser-core-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_NEWSLETTER_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-newsletter-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_NEWSLETTER_RECORDS_DATA_PATH = 'data/foundation-build-closeouts/source-newsletter-records.json'
export const FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_SOURCE_PATHS =
  FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACTS.map(artifact => artifact.relativePath)
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_REPO_FALLBACK_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-repo-fallback-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_SESSION_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-session-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_YOUTUBE_PIPELINE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-youtube-pipeline-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_CORE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-maturity-core-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_ROUTING_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-maturity-routing-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_FOLLOWUP_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-source-maturity-followup-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_TIGHTENING_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-tightening-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_VERIFIER_RUNTIME_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-verifier-runtime-records.js'
export const FOUNDATION_BUILD_LOG_REGISTRY_SOURCE_PATHS = [
  FOUNDATION_BUILD_LOG_BEHAVIOR_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_ACTION_ROUTE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_AGENT_FEEDBACK_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_BUILD_LANE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_CLEANUP_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_CONTROL_LAYER_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_DB_PROCESS_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_DOCTRINE_CLEANUP_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_FOUNDATION_SURFACE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_OVERNIGHT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_SPRINT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_SOURCE_CONTRACT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_GOVERNANCE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_PROCESS_GATE_OPERATIONS_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_ROUTE_FRONTEND_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SIZE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_ONCE_OVER_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_BROWSER_CORE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_NEWSLETTER_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_NEWSLETTER_RECORDS_DATA_PATH,
  ...FOUNDATION_BUILD_CLOSEOUT_DATA_ARTIFACT_SOURCE_PATHS,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_REPO_FALLBACK_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_SESSION_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_YOUTUBE_PIPELINE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_CORE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_ROUTING_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_SOURCE_MATURITY_FOLLOWUP_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_TIGHTENING_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_VERIFIER_RUNTIME_RECORDS_SOURCE_PATH,
]

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

async function readOptionalText(repoRoot, relativePath) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

export async function readFoundationBuildLogRegistrySource(repoRoot) {
  const parts = await Promise.all(
    FOUNDATION_BUILD_LOG_REGISTRY_SOURCE_PATHS.map(relativePath => readOptionalText(repoRoot, relativePath)),
  )
  return parts.filter(Boolean).join('\n')
}

export function closeoutRecordAsBuildLogEntry(closeout) {
  if (!closeout) return null
  return {
    ...closeout,
    operatorCloseout: true,
    closeoutKey: closeout.closeoutKey || closeout.key,
    backlogIds: normalizeList(closeout.backlogIds),
    mentionedBacklogIds: normalizeList(closeout.mentionedBacklogIds),
  }
}

export function findFoundationBuildCloseoutEntry(
  foundationBuildLog,
  closeoutKey,
  {
    backlogId = '',
    fallbackBacklogIds = [],
    fallbackMentionedBacklogIds = [],
    buildLogSource = '',
  } = {},
) {
  const entries = [
    ...normalizeList(foundationBuildLog?.builds),
    ...normalizeList(foundationBuildLog?.closeouts),
  ]
  const fromBuildLog = entries.find(build => {
    const key = build.closeoutKey || build.key
    if (key !== closeoutKey) return false
    return !backlogId || normalizeList(build.backlogIds).includes(backlogId)
  })
  if (fromBuildLog) return closeoutRecordAsBuildLogEntry(fromBuildLog)

  const fromRegistry = getFoundationBuildCloseouts().find(record => {
    if (record.key !== closeoutKey) return false
    return !backlogId || normalizeList(record.backlogIds).includes(backlogId)
  })
  if (fromRegistry) return closeoutRecordAsBuildLogEntry(fromRegistry)

  if (String(buildLogSource || '').includes(closeoutKey)) {
    return {
      operatorCloseout: true,
      closeoutKey,
      backlogIds: backlogId ? [backlogId] : normalizeList(fallbackBacklogIds),
      mentionedBacklogIds: normalizeList(fallbackMentionedBacklogIds),
    }
  }
  return null
}
