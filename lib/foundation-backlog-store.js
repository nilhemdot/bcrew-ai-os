import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertCurrentProcessCheckWriteAllowed,
} from './process-write-guard.js'

export const FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-001'
export const FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-backlog-store-split-v1'
export const FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-monolith-split-001-plan.md'
export const FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-001.json'
export const FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-backlog-store-split-check.mjs'
export const FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID = 'foundation-backlog-store-split-2026-05-15'
export const FOUNDATION_BACKLOG_STORE_SPLIT_BEFORE_LINES = 18961

function assertFunction(value, label) {
  if (typeof value !== 'function') throw new Error(`Foundation backlog store requires ${label}.`)
}

function assertBacklogDoneCloseout(id, row = {}, existing = null) {
  const movingToDone = row.lane === 'done' && (!existing || existing.lane !== 'done')
  if (!movingToDone) return
  const closeoutText = [
    row.source,
    row.next_action,
    row.status_note,
  ].filter(Boolean).join(' ')
  const hasCloseoutTrail = closeoutText.length >= 80 &&
    /(closed|done|accepted|shipped|verified|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/)/i.test(closeoutText) &&
    /(\b20\d{2}-\d{2}-\d{2}\b|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/)/i.test(closeoutText)
  if (!hasCloseoutTrail) {
    throw new Error(`Backlog item ${id} moving to done requires a closeout statusNote with build/change proof, not just a lane change.`)
  }
}

function mapBacklogChangeEventState(row = {}, normalizeBacklogScopeKey) {
  return {
    title: row.title ?? null,
    scope: normalizeBacklogScopeKey(row.team),
    lane: row.lane ?? null,
    priority: row.priority ?? null,
    rank: row.rank ?? null,
    source: row.source ?? null,
    summary: row.summary ?? null,
    whyItMatters: row.why_it_matters ?? null,
    nextAction: row.next_action ?? null,
    statusNote: row.status_note ?? null,
    owner: row.owner ?? null,
  }
}

function getBacklogChangedFields(before = {}, after = {}) {
  return Object.keys(after).filter(key => before[key] !== after[key])
}

async function updateBacklogItemWithClient(client, id, input, actor, deps) {
  const {
    insertChangeEvent,
    mapBacklogRow,
    normalizeBacklogScopeKey,
  } = deps

  const existingResult = await client.query(`SELECT * FROM backlog_items WHERE id = $1 FOR UPDATE`, [id])
  const existing = existingResult.rows[0]
  if (!existing) throw new Error(`Backlog item not found: ${id}`)

  if (typeof deps.afterRead === 'function') {
    await deps.afterRead(existing)
  }

  const nextRow = {
    title: input.title ?? existing.title,
    team: normalizeBacklogScopeKey(input.scope ?? input.team ?? existing.team),
    lane: input.lane ?? existing.lane,
    priority: input.priority ?? existing.priority,
    rank: input.rank ?? existing.rank,
    source: input.source ?? existing.source,
    summary: input.summary ?? existing.summary,
    why_it_matters: input.whyItMatters ?? existing.why_it_matters,
    next_action: input.nextAction ?? existing.next_action,
    status_note: input.statusNote ?? existing.status_note,
    owner: input.owner ?? existing.owner,
  }
  assertBacklogDoneCloseout(id, nextRow, existing)

  const result = await client.query(
    `
      UPDATE backlog_items
      SET title = $2,
          team = $3,
          lane = $4,
          priority = $5,
          rank = $6,
          source = $7,
          summary = $8,
          why_it_matters = $9,
          next_action = $10,
          status_note = $11,
          owner = $12,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      nextRow.title,
      nextRow.team,
      nextRow.lane,
      nextRow.priority,
      nextRow.rank,
      nextRow.source,
      nextRow.summary,
      nextRow.why_it_matters,
      nextRow.next_action,
      nextRow.status_note,
      nextRow.owner,
    ],
  )

  const laneChanged = existing.lane !== nextRow.lane
  const before = mapBacklogChangeEventState(existing, normalizeBacklogScopeKey)
  const after = mapBacklogChangeEventState(result.rows[0], normalizeBacklogScopeKey)
  await insertChangeEvent(client, {
    eventType: laneChanged ? 'backlog_status_changed' : 'backlog_updated',
    entityTable: 'backlog_items',
    entityId: id,
    actor,
    summary: laneChanged
      ? `Moved backlog item ${id} to ${nextRow.lane}`
      : `Updated backlog item ${id}`,
    metadata: {
      before,
      after,
      changedFields: getBacklogChangedFields(before, after),
    },
  })

  return mapBacklogRow(result.rows[0])
}

export function createFoundationBacklogStore({
  withFoundationTransaction,
  insertChangeEvent,
  getNextPrefixedId,
  normalizeBacklogScopeKey,
  mapBacklogRow,
} = {}) {
  assertFunction(withFoundationTransaction, 'withFoundationTransaction')
  assertFunction(insertChangeEvent, 'insertChangeEvent')
  assertFunction(getNextPrefixedId, 'getNextPrefixedId')
  assertFunction(normalizeBacklogScopeKey, 'normalizeBacklogScopeKey')
  assertFunction(mapBacklogRow, 'mapBacklogRow')

  async function createBacklogItem(input, actor = 'steve') {
    assertCurrentProcessCheckWriteAllowed({
      operation: 'create backlog item',
      allowedFlags: [
        PROCESS_CHECK_WRITE_FLAGS.apply,
        PROCESS_CHECK_WRITE_FLAGS.closeCard,
        PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
      ],
    })
    return withFoundationTransaction(async client => {
      const id = await getNextPrefixedId(client, 'backlog_items', input.idPrefix)
      const scope = normalizeBacklogScopeKey(input.scope ?? input.team)
      assertBacklogDoneCloseout(id, {
        lane: input.lane,
        source: input.source,
        next_action: input.nextAction,
        status_note: input.statusNote,
      })
      const result = await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING *
        `,
        [
          id,
          input.title,
          scope,
          input.lane,
          input.priority,
          input.rank ?? null,
          input.source ?? null,
          input.summary ?? null,
          input.whyItMatters ?? null,
          input.nextAction ?? null,
          input.statusNote ?? null,
          input.owner ?? null,
        ],
      )

      await insertChangeEvent(client, {
        eventType: 'backlog_created',
        entityTable: 'backlog_items',
        entityId: id,
        actor,
        summary: `Created backlog item ${id}: ${input.title}`,
        metadata: {
          lane: input.lane,
          priority: input.priority,
          scope,
        },
      })

      return mapBacklogRow(result.rows[0])
    })
  }

  async function updateBacklogItem(id, input, actor = 'steve', options = {}) {
    assertCurrentProcessCheckWriteAllowed({
      operation: 'update backlog item',
      allowedFlags: [
        PROCESS_CHECK_WRITE_FLAGS.apply,
        PROCESS_CHECK_WRITE_FLAGS.closeCard,
        PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
      ],
    })
    return withFoundationTransaction(async client => {
      return updateBacklogItemWithClient(client, id, input, actor, {
        insertChangeEvent,
        mapBacklogRow,
        normalizeBacklogScopeKey,
        afterRead: options.afterRead,
      })
    })
  }

  return {
    createBacklogItem,
    updateBacklogItem,
  }
}

export function buildFoundationBacklogStoreSplitDogfoodProof() {
  let weakDoneRejected = false
  try {
    assertBacklogDoneCloseout('DOGFOOD-001', {
      lane: 'done',
      status_note: 'done',
    }, { lane: 'scoped' })
  } catch {
    weakDoneRejected = true
  }

  let strongDoneAccepted = true
  try {
    assertBacklogDoneCloseout('DOGFOOD-002', {
      lane: 'done',
      status_note: 'Closed on 2026-05-15 with proof: npm run foundation:verify passed, commit sha abc123, docs/handoffs/example.md records verified build proof.',
    }, { lane: 'scoped' })
  } catch {
    strongDoneAccepted = false
  }

  const before = {
    title: 'Card',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 10,
    source: null,
    summary: 'before',
    whyItMatters: 'same',
    nextAction: 'build',
    statusNote: 'old',
    owner: null,
  }
  const after = {
    ...before,
    lane: 'executing',
    statusNote: 'new',
  }
  const changedFields = getBacklogChangedFields(before, after)

  return {
    ok: weakDoneRejected &&
      strongDoneAccepted &&
      changedFields.includes('lane') &&
      changedFields.includes('statusNote') &&
      changedFields.length === 2,
    weakDoneRejected,
    strongDoneAccepted,
    changedFields,
    invariant: 'Backlog store rejects weak done-lane closeouts and preserves before/after changedFields proof.',
  }
}
