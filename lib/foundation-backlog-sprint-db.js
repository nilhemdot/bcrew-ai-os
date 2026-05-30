import {
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FoundationCurrentSprintMutationGuardError,
  createFoundationCurrentSprintStore,
} from './foundation-current-sprint-store.js'
import { createFoundationBacklogStore } from './foundation-backlog-store.js'
import { backlogSeed } from './foundation-backlog-seed.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'

export {
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FoundationCurrentSprintMutationGuardError,
}

export const BACKLOG_STORE_CONCURRENCY_CARD_ID = 'BACKLOG-STORE-CONCURRENCY-001'

const backlogScopeDefinitions = [
  {
    key: 'foundation',
    label: 'Foundation / System',
    shortLabel: 'foundation/system',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'strategic_execution',
    label: 'Strategic Execution',
    shortLabel: 'strategic execution',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    shortLabel: 'marketing',
    queueOwner: 'hub',
    active: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    shortLabel: 'sales',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'operations',
    label: 'Operations',
    shortLabel: 'operations',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'retention',
    label: 'Retention',
    shortLabel: 'retention',
    queueOwner: 'hub',
    active: false,
  },
]

const legacyBacklogScopeMap = {
  dev: 'foundation',
}

const backlogScopeOrderSql = backlogScopeDefinitions
  .map((scope, index) => `WHEN '${scope.key}' THEN ${index}`)
  .join(' ')

function getBacklogIdPrefixes() {
  return Array.from(new Set(backlogSeed.map(item => String(item.id || '').split('-')[0]).filter(Boolean))).sort()
}

function getBacklogScopes() {
  return backlogScopeDefinitions.map(scope => ({ ...scope }))
}

function normalizeBacklogScopeKey(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  return legacyBacklogScopeMap[normalized] || normalized
}

function mapBacklogRow(row) {
  const scope = normalizeBacklogScopeKey(row.scope ?? row.team)
  return {
    id: row.id,
    title: row.title,
    scope,
    team: scope,
    lane: row.lane,
    priority: row.priority,
    rank: row.rank,
    source: row.source,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? row.whyItMatters,
    nextAction: row.next_action ?? row.nextAction,
    statusNote: row.status_note ?? row.statusNote,
    owner: row.owner,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

const foundationCurrentSprintStore = createFoundationCurrentSprintStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  mapBacklogRow,
})

export const getActiveFoundationCurrentSprint = foundationCurrentSprintStore.getActiveFoundationCurrentSprint
export const getPlanCriticRunsByCardIds = foundationCurrentSprintStore.getPlanCriticRunsByCardIds
export const upsertFoundationCurrentSprintOverlay = foundationCurrentSprintStore.upsertFoundationCurrentSprintOverlay
export const buildCurrentSprintMutationGuardsDogfoodProof = foundationCurrentSprintStore.buildCurrentSprintMutationGuardsDogfoodProof

export async function getBacklogItemsByIds(ids = []) {
  const normalizedIds = Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
      .map(id => String(id || '').trim())
      .filter(Boolean)
  ))

  if (!normalizedIds.length) return []

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
             next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
      ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
               rank NULLS LAST,
               created_at ASC
    `,
    [normalizedIds]
  )

  return result.rows.map(mapBacklogRow)
}

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid ID prefix is required.')

  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )

  const nextNumber = result.rows.reduce((max, row) => {
    return Math.max(max, getNumericSuffix(row.id, normalizedPrefix))
  }, 0) + 1

  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

const foundationBacklogStore = createFoundationBacklogStore({
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId,
  normalizeBacklogScopeKey,
  mapBacklogRow,
})

export const createBacklogItem = foundationBacklogStore.createBacklogItem
export const updateBacklogItem = foundationBacklogStore.updateBacklogItem

const backlogSeedStableFields = ['title', 'team', 'source', 'summary', 'whyItMatters']
const backlogSeedMutableFields = ['lane', 'priority', 'rank', 'nextAction', 'statusNote']

function normalizeBacklogSeedComparableValue(field, value) {
  if (value === undefined || value === null) return null
  if (field === 'rank') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  if (field === 'team') return normalizeBacklogScopeKey(value)
  return String(value).trim().replace(/\s+/g, ' ')
}

function normalizeBacklogSeedComparableRow(row) {
  const mapped = mapBacklogRow(row)
  return {
    id: mapped.id,
    title: mapped.title,
    team: mapped.team,
    lane: mapped.lane,
    priority: mapped.priority,
    rank: mapped.rank,
    source: mapped.source,
    summary: mapped.summary,
    whyItMatters: mapped.whyItMatters,
    nextAction: mapped.nextAction,
    statusNote: mapped.statusNote,
    updatedAt: mapped.updatedAt || null,
  }
}

function compareBacklogSeedFields(seedRow, liveRow, fields) {
  return fields
    .map(field => {
      const seedValue = seedRow[field]
      const liveValue = liveRow[field]
      const normalizedSeed = normalizeBacklogSeedComparableValue(field, seedValue)
      const normalizedLive = normalizeBacklogSeedComparableValue(field, liveValue)
      if (normalizedSeed === normalizedLive) return null
      return { field, seedValue, liveValue }
    })
    .filter(Boolean)
}

export async function getBacklogSeedDriftSnapshot(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const seedRows = backlogSeed.map(normalizeBacklogSeedComparableRow)
  const seedIds = seedRows.map(row => row.id).filter(Boolean)

  if (!seedIds.length) {
    return {
      generatedAt: new Date().toISOString(),
      policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
      seedRows: 0,
      liveSeedRows: 0,
      missingLiveIds: [],
      stableFields: backlogSeedStableFields,
      mutableFields: backlogSeedMutableFields,
      stableMismatchCount: 0,
      mutableMismatchCount: 0,
      totalMismatchCount: 0,
      rowsWithStableDrift: 0,
      rowsWithMutableDrift: 0,
      driftItemCount: 0,
      items: [],
    }
  }

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
    `,
    [seedIds]
  )
  const liveById = new Map(result.rows.map(row => [row.id, normalizeBacklogSeedComparableRow(row)]))
  const missingLiveIds = []
  const items = []
  let driftItemCount = 0
  let stableMismatchCount = 0
  let mutableMismatchCount = 0
  let rowsWithStableDrift = 0
  let rowsWithMutableDrift = 0

  for (const seedRow of seedRows) {
    const liveRow = liveById.get(seedRow.id)
    if (!liveRow) {
      missingLiveIds.push(seedRow.id)
      driftItemCount += 1
      stableMismatchCount += backlogSeedStableFields.length
      rowsWithStableDrift += 1
      if (items.length < limit) {
        items.push({
          id: seedRow.id,
          title: seedRow.title,
          status: 'missing_live_row',
          stableMismatches: backlogSeedStableFields.map(field => ({
            field,
            seedValue: seedRow[field],
            liveValue: null,
          })),
          mutableMismatches: [],
        })
      }
      continue
    }

    const stableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedStableFields)
    const mutableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedMutableFields)
    if (!stableMismatches.length && !mutableMismatches.length) continue

    driftItemCount += 1
    stableMismatchCount += stableMismatches.length
    mutableMismatchCount += mutableMismatches.length
    if (stableMismatches.length) rowsWithStableDrift += 1
    if (mutableMismatches.length) rowsWithMutableDrift += 1

    if (items.length < limit) {
      items.push({
        id: seedRow.id,
        title: liveRow.title || seedRow.title,
        status: stableMismatches.length ? 'requires_promotion_review' : 'live_state_differs_from_seed',
        liveUpdatedAt: liveRow.updatedAt,
        stableMismatches,
        mutableMismatches,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
    seedRows: seedRows.length,
    liveSeedRows: result.rows.length,
    missingLiveIds,
    stableFields: backlogSeedStableFields,
    mutableFields: backlogSeedMutableFields,
    stableMismatchCount,
    mutableMismatchCount,
    totalMismatchCount: stableMismatchCount + mutableMismatchCount,
    rowsWithStableDrift,
    rowsWithMutableDrift,
    driftItemCount,
    items,
  }
}

export function getFoundationBacklogIdPrefixes() {
  return getBacklogIdPrefixes()
}

export function getFoundationBacklogScopes() {
  return getBacklogScopes()
}

export const foundationBacklogDbInternals = {
  getNextPrefixedId,
  normalizeBacklogScopeKey,
  mapBacklogRow,
}
