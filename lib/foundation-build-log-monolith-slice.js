export const FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CARD_ID = 'CLEANUP-003'
export const FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY = 'foundation-build-log-monolith-slice-v1'
export const FOUNDATION_BUILD_LOG_MONOLITH_SLICE_SCRIPT_PATH = 'scripts/process-foundation-build-log-monolith-slice-check.mjs'
export const FOUNDATION_BUILD_LOG_BEHAVIOR_PATH = 'lib/foundation-build-log.js'
export const FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH = 'lib/foundation-build-closeout-records.js'
export const FOUNDATION_BUILD_LOG_BEHAVIOR_MAX_LINES = 5000

export function countTextLines(text = '') {
  const normalized = String(text || '')
  if (!normalized) return 0
  return normalized.split('\n').length - (normalized.endsWith('\n') ? 1 : 0)
}

export function evaluateFoundationBuildLogRegistrySplit(input = {}) {
  const behaviorLineCount = Number(input.behaviorLineCount || 0)
  const recordLineCount = Number(input.recordLineCount || 0)
  const closeoutCount = Number(input.closeoutCount || 0)
  const invalidCloseoutCount = Number(input.invalidCloseoutCount || 0)
  const behaviorImportsRecords = input.behaviorImportsRecords === true
  const behaviorEmbedsRecords = input.behaviorEmbedsRecords === true
  const recordsExportCloseouts = input.recordsExportCloseouts === true
  const recordsEmbedBehavior = input.recordsEmbedBehavior === true
  const ownershipProofOk = input.ownershipProofOk === true

  const checks = [
    {
      ok: behaviorLineCount > 0 && behaviorLineCount <= FOUNDATION_BUILD_LOG_BEHAVIOR_MAX_LINES,
      check: 'behavior module stays under line budget',
      detail: `${behaviorLineCount}/${FOUNDATION_BUILD_LOG_BEHAVIOR_MAX_LINES}`,
    },
    {
      ok: recordLineCount > 0,
      check: 'record module exists',
      detail: String(recordLineCount),
    },
    {
      ok: behaviorImportsRecords,
      check: 'behavior module imports records from data module',
      detail: behaviorImportsRecords ? 'imports records' : 'missing import',
    },
    {
      ok: !behaviorEmbedsRecords,
      check: 'behavior module does not embed closeout array',
      detail: behaviorEmbedsRecords ? 'embedded array present' : 'no embedded array',
    },
    {
      ok: recordsExportCloseouts,
      check: 'data module exports closeout records',
      detail: recordsExportCloseouts ? 'exports records' : 'missing export',
    },
    {
      ok: !recordsEmbedBehavior,
      check: 'data module stays data-only',
      detail: recordsEmbedBehavior ? 'behavior found' : 'data-only',
    },
    {
      ok: closeoutCount > 0 && invalidCloseoutCount === 0,
      check: 'closeout validation stays clean',
      detail: `${closeoutCount} closeouts, ${invalidCloseoutCount} invalid`,
    },
    {
      ok: ownershipProofOk,
      check: 'build-log ownership proof still passes',
      detail: ownershipProofOk ? 'ownership ok' : 'ownership failed',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    budget: {
      maxBehaviorLines: FOUNDATION_BUILD_LOG_BEHAVIOR_MAX_LINES,
    },
    checks,
    summary: {
      behaviorLineCount,
      recordLineCount,
      closeoutCount,
      invalidCloseoutCount,
    },
  }
}

export function buildSyntheticFoundationBuildLogRegistrySplitProof() {
  const unsplit = evaluateFoundationBuildLogRegistrySplit({
    behaviorLineCount: 5823,
    recordLineCount: 0,
    closeoutCount: 114,
    invalidCloseoutCount: 0,
    behaviorImportsRecords: false,
    behaviorEmbedsRecords: true,
    recordsExportCloseouts: false,
    recordsEmbedBehavior: true,
    ownershipProofOk: true,
  })
  const split = evaluateFoundationBuildLogRegistrySplit({
    behaviorLineCount: 277,
    recordLineCount: 5552,
    closeoutCount: 114,
    invalidCloseoutCount: 0,
    behaviorImportsRecords: true,
    behaviorEmbedsRecords: false,
    recordsExportCloseouts: true,
    recordsEmbedBehavior: false,
    ownershipProofOk: true,
  })

  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
  }
}
