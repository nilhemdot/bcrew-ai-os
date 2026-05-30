import { backlogSeed } from './foundation-backlog-seed.js'

export const DB_SEED_CARD_ID = 'DB-SEED-001'
export const DB_SEED_SPRINT_ID = 'db-seed-2026-05-15'
export const DB_SEED_CLOSEOUT_KEY = 'db-seed-v1'
export const DB_SEED_PLAN_PATH = 'docs/process/db-seed-001-plan.md'
export const DB_SEED_APPROVAL_PATH = 'docs/process/approvals/DB-SEED-001.json'
export const DB_SEED_SCRIPT_PATH = 'scripts/process-db-seed-check.mjs'
export const DB_SEED_PRE_SPLIT_FOUNDATION_DB_LINES = 17852

export const BACKLOG_SEED_STABLE_FIELDS = ['title', 'team', 'source', 'summary', 'whyItMatters']
export const BACKLOG_SEED_MUTABLE_FIELDS = ['lane', 'priority', 'rank', 'nextAction', 'statusNote']

const legacyBacklogScopeMap = {
  dev: 'foundation',
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeBacklogScopeKey(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return ''
  return legacyBacklogScopeMap[normalized] || normalized
}

function normalizeComparableValue(field, value) {
  if (value === undefined || value === null) return null
  if (field === 'rank') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  if (field === 'team') return normalizeBacklogScopeKey(value)
  return String(value).trim().replace(/\s+/g, ' ')
}

export function normalizeBacklogSeedGovernanceRow(row = {}) {
  return {
    id: row.id || row.cardId || row.backlogId || null,
    title: row.title || null,
    team: normalizeBacklogScopeKey(row.scope ?? row.team),
    lane: row.lane || null,
    priority: row.priority || null,
    rank: row.rank ?? null,
    source: row.source || null,
    summary: row.summary || null,
    whyItMatters: row.why_it_matters ?? row.whyItMatters ?? null,
    nextAction: row.next_action ?? row.nextAction ?? null,
    statusNote: row.status_note ?? row.statusNote ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function compareFields(seedRow, liveRow, fields) {
  return fields
    .map(field => {
      const seedValue = seedRow[field]
      const liveValue = liveRow[field]
      if (normalizeComparableValue(field, seedValue) === normalizeComparableValue(field, liveValue)) {
        return null
      }
      return { field, seedValue, liveValue }
    })
    .filter(Boolean)
}

export function classifyBacklogSeedLiveDrift({
  seedRow = null,
  liveRow = null,
} = {}) {
  const normalizedSeed = seedRow ? normalizeBacklogSeedGovernanceRow(seedRow) : null
  const normalizedLive = liveRow ? normalizeBacklogSeedGovernanceRow(liveRow) : null
  const id = normalizedSeed?.id || normalizedLive?.id || null

  if (!normalizedSeed || !id) {
    return {
      id,
      status: 'invalid_seed_row',
      ok: false,
      defaultAction: 'block_and_review',
      wouldWriteByDefault: false,
      stableMismatches: [],
      mutableMismatches: [],
    }
  }

  if (!normalizedLive) {
    return {
      id,
      title: normalizedSeed.title,
      status: 'bootstrap_candidate',
      ok: false,
      defaultAction: 'report_only',
      reviewRequired: true,
      wouldWriteByDefault: false,
      stableMismatches: BACKLOG_SEED_STABLE_FIELDS.map(field => ({
        field,
        seedValue: normalizedSeed[field],
        liveValue: null,
      })),
      mutableMismatches: [],
    }
  }

  const stableMismatches = compareFields(normalizedSeed, normalizedLive, BACKLOG_SEED_STABLE_FIELDS)
  const mutableMismatches = compareFields(normalizedSeed, normalizedLive, BACKLOG_SEED_MUTABLE_FIELDS)
  if (!stableMismatches.length && !mutableMismatches.length) {
    return {
      id,
      title: normalizedLive.title || normalizedSeed.title,
      status: 'in_sync',
      ok: true,
      defaultAction: 'none',
      reviewRequired: false,
      wouldWriteByDefault: false,
      stableMismatches,
      mutableMismatches,
    }
  }

  return {
    id,
    title: normalizedLive.title || normalizedSeed.title,
    status: stableMismatches.length ? 'requires_seed_promotion_review' : 'live_mutable_drift_report_only',
    ok: false,
    defaultAction: 'report_only',
    reviewRequired: true,
    wouldWriteByDefault: false,
    liveUpdatedAt: normalizedLive.updatedAt,
    stableMismatches,
    mutableMismatches,
  }
}

export function buildBacklogSeedGovernanceReport({
  seedRows = backlogSeed,
  liveRows = [],
  limit = 50,
} = {}) {
  const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Number(limit) : 50
  const liveById = new Map((Array.isArray(liveRows) ? liveRows : [])
    .map(row => normalizeBacklogSeedGovernanceRow(row))
    .filter(row => row.id)
    .map(row => [row.id, row]))

  const classifications = (Array.isArray(seedRows) ? seedRows : [])
    .map(seedRow => {
      const normalizedSeed = normalizeBacklogSeedGovernanceRow(seedRow)
      return classifyBacklogSeedLiveDrift({
        seedRow: normalizedSeed,
        liveRow: liveById.get(normalizedSeed.id) || null,
      })
    })

  const findings = classifications.filter(item => item.status !== 'in_sync')
  return {
    generatedAt: new Date().toISOString(),
    policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine; seed/live drift is report-only until an explicit governed migration or approved sync promotes a change.',
    defaultMutationPosture: 'report_only',
    wouldWriteByDefault: false,
    seedRows: classifications.length,
    liveRows: liveById.size,
    inSyncCount: classifications.filter(item => item.status === 'in_sync').length,
    bootstrapCandidateCount: classifications.filter(item => item.status === 'bootstrap_candidate').length,
    stableReviewCount: classifications.filter(item => item.status === 'requires_seed_promotion_review').length,
    mutableDriftCount: classifications.filter(item => item.status === 'live_mutable_drift_report_only').length,
    invalidSeedCount: classifications.filter(item => item.status === 'invalid_seed_row').length,
    findingCount: findings.length,
    items: findings.slice(0, normalizedLimit),
  }
}

export function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

export function evaluateDbSeedModuleSplit({
  foundationDbSource = '',
  foundationBacklogSprintSource = '',
  backlogSeedSource = '',
  foundationDbLineCount = countTextLines(foundationDbSource),
  preSplitFoundationDbLineCount = DB_SEED_PRE_SPLIT_FOUNDATION_DB_LINES,
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const seedImportSource = [foundationDbSource, foundationBacklogSprintSource].filter(Boolean).join('\n')
  add(
    seedImportSource.includes("import { backlogSeed } from './foundation-backlog-seed.js'"),
    'foundation-db imports dedicated backlog seed module',
    foundationBacklogSprintSource.includes("import { backlogSeed } from './foundation-backlog-seed.js'")
      ? 'backlog/sprint module import marker present'
      : 'root import marker present',
  )
  add(
    !/const\s+backlogSeed\s*=\s*\[/.test(foundationDbSource),
    'foundation-db no longer defines backlogSeed inline',
    'inline seed literal absent',
  )
  add(
    /export\s+const\s+backlogSeed\s*=\s*\[/.test(backlogSeedSource),
    'dedicated seed module exports backlogSeed',
    'export marker present',
  )
  add(
    foundationDbLineCount > 0 && foundationDbLineCount < preSplitFoundationDbLineCount,
    'foundation-db line count decreases after seed split',
    `${foundationDbLineCount} < ${preSplitFoundationDbLineCount}`,
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
    foundationDbLineCount,
    preSplitFoundationDbLineCount,
  }
}

export function buildDbSeedGovernanceDogfoodProof() {
  const seedScoped = {
    id: 'DOGFOOD-SEED-001',
    title: 'Dogfood seed card',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'seed',
    summary: 'Seed default summary.',
    whyItMatters: 'Seed default why.',
    nextAction: 'Seed wants this built.',
    statusNote: 'Seed still thinks scoped.',
  }
  const liveDone = {
    ...seedScoped,
    lane: 'done',
    nextAction: 'Live says closed.',
    statusNote: 'Closed live with proof.',
    updatedAt: '2026-05-15T12:00:00.000Z',
  }
  const liveStableMismatch = {
    ...liveDone,
    title: 'Live title changed',
    summary: 'Live stable summary changed.',
  }
  const inSync = classifyBacklogSeedLiveDrift({ seedRow: seedScoped, liveRow: seedScoped })
  const mutableDrift = classifyBacklogSeedLiveDrift({ seedRow: seedScoped, liveRow: liveDone })
  const missingLive = classifyBacklogSeedLiveDrift({ seedRow: { ...seedScoped, id: 'DOGFOOD-SEED-MISSING-001' }, liveRow: null })
  const stableDrift = classifyBacklogSeedLiveDrift({ seedRow: seedScoped, liveRow: liveStableMismatch })
  const report = buildBacklogSeedGovernanceReport({
    seedRows: [seedScoped, { ...seedScoped, id: 'DOGFOOD-SEED-MISSING-001' }],
    liveRows: [liveDone],
    limit: 10,
  })

  return {
    ok: inSync.ok === true &&
      inSync.status === 'in_sync' &&
      mutableDrift.ok === false &&
      mutableDrift.status === 'live_mutable_drift_report_only' &&
      mutableDrift.wouldWriteByDefault === false &&
      mutableDrift.defaultAction === 'report_only' &&
      mutableDrift.mutableMismatches.some(item => item.field === 'lane') &&
      missingLive.ok === false &&
      missingLive.status === 'bootstrap_candidate' &&
      missingLive.wouldWriteByDefault === false &&
      stableDrift.ok === false &&
      stableDrift.status === 'requires_seed_promotion_review' &&
      stableDrift.wouldWriteByDefault === false &&
      report.defaultMutationPosture === 'report_only' &&
      report.wouldWriteByDefault === false &&
      report.mutableDriftCount === 1 &&
      report.bootstrapCandidateCount === 1,
    inSync,
    mutableDrift,
    missingLive,
    stableDrift,
    report,
    dogfoodInvariant: 'Seed/live drift is reported and classified; default proof never overwrites live backlog truth from seed.',
  }
}
