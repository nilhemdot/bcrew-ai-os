import fs from 'node:fs/promises'
import path from 'node:path'
import { getFoundationBuildCloseouts } from './foundation-build-log.js'

export const FOUNDATION_BUILD_LOG_BEHAVIOR_SOURCE_PATH = 'lib/foundation-build-log.js'
export const FOUNDATION_BUILD_CLOSEOUT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-control-plane-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_CLEANUP_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-cleanup-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_OVERNIGHT_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-overnight-records.js'
export const FOUNDATION_BUILD_CLOSEOUT_TIGHTENING_RECORDS_SOURCE_PATH = 'lib/foundation-build-closeout-tightening-records.js'
export const FOUNDATION_BUILD_LOG_REGISTRY_SOURCE_PATHS = [
  FOUNDATION_BUILD_LOG_BEHAVIOR_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_CLEANUP_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_OVERNIGHT_RECORDS_SOURCE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_TIGHTENING_RECORDS_SOURCE_PATH,
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
