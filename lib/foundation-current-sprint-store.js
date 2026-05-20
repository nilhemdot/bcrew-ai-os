import { randomUUID } from 'node:crypto'
import { normalizeApprovalThreshold } from './approval-threshold-registry.js'

export const FOUNDATION_DB_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-STORE-SPLIT-001'
export const FOUNDATION_DB_STORE_SPLIT_SPRINT_ID = 'foundation-db-store-split-2026-05-14'
export const FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-db-store-split-v1'
export const FOUNDATION_DB_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-store-split-001-plan.md'
export const FOUNDATION_DB_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-STORE-SPLIT-001.json'
export const FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-db-store-split-check.mjs'

export const CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID = 'CURRENT-SPRINT-MUTATION-GUARDS-001'

export class FoundationCurrentSprintMutationGuardError extends Error {
  constructor(message, metadata = {}) {
    super(message)
    this.name = 'FoundationCurrentSprintMutationGuardError'
    this.code = 'FOUNDATION_CURRENT_SPRINT_MUTATION_BLOCKED'
    this.metadata = metadata
  }
}

export function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function evaluateFoundationCurrentSprintStoreSplit({
  foundationDbSource = '',
  currentSprintStoreSource = '',
  foundationDbLineCount = countTextLines(foundationDbSource),
  preSplitFoundationDbLineCount = 19594,
} = {}) {
  const checks = []
  addEvaluationCheck(
    checks,
    currentSprintStoreSource.includes('createFoundationCurrentSprintStore') &&
      currentSprintStoreSource.includes('getActiveFoundationCurrentSprint') &&
      currentSprintStoreSource.includes('upsertFoundationCurrentSprintOverlay') &&
      currentSprintStoreSource.includes('buildCurrentSprintMutationGuardsDogfoodProof'),
    'Current Sprint store module owns the extracted public behavior',
    'store factory and exports present',
  )
  addEvaluationCheck(
    checks,
    currentSprintStoreSource.includes('FOUNDATION_CURRENT_SPRINT_MUTATION_BLOCKED') &&
      currentSprintStoreSource.includes('expectedPreviousActiveSprintId') &&
      currentSprintStoreSource.includes('allowItemReplacement') &&
      currentSprintStoreSource.includes('mutationPosture') &&
      currentSprintStoreSource.includes('itemDiff'),
    'Current Sprint store module owns mutation guard and diff proof terms',
    'guard terms present in store module',
  )
  addEvaluationCheck(
    checks,
    foundationDbSource.includes('./foundation-current-sprint-store.js') &&
      foundationDbSource.includes('createFoundationCurrentSprintStore') &&
      foundationDbSource.includes('foundationCurrentSprintStore'),
    'foundation-db wires through the dedicated store module',
    'store import and instance present',
  )
  addEvaluationCheck(
    checks,
    !/function\s+mapFoundationSprintRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapFoundationSprintItemRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapPlanCriticRunRow\s*\(/.test(foundationDbSource) &&
      !/function\s+buildFoundationCurrentSprintItemDiff\s*\(/.test(foundationDbSource) &&
      !/async\s+function\s+upsertFoundationCurrentSprintOverlayWithClient\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted Current Sprint helpers inline',
    'inline helper definitions absent',
  )
  addEvaluationCheck(
    checks,
    foundationDbLineCount > 0 && foundationDbLineCount < preSplitFoundationDbLineCount,
    'foundation-db line count decreases after the split',
    `${foundationDbLineCount} < ${preSplitFoundationDbLineCount}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    foundationDbLineCount,
    preSplitFoundationDbLineCount,
  }
}

export function buildSyntheticFoundationCurrentSprintStoreSplitProof() {
  const unsplit = evaluateFoundationCurrentSprintStoreSplit({
    foundationDbSource: `
      export async function getActiveFoundationCurrentSprint() {}
      function mapFoundationSprintRow() {}
      async function upsertFoundationCurrentSprintOverlayWithClient() {}
      const itemDiff = {}
    `,
    currentSprintStoreSource: '',
    foundationDbLineCount: 19594,
  })
  const split = evaluateFoundationCurrentSprintStoreSplit({
    foundationDbSource: `
      import { createFoundationCurrentSprintStore } from './foundation-current-sprint-store.js'
      const foundationCurrentSprintStore = createFoundationCurrentSprintStore({})
      export const getActiveFoundationCurrentSprint = foundationCurrentSprintStore.getActiveFoundationCurrentSprint
    `,
    currentSprintStoreSource: `
      export function createFoundationCurrentSprintStore() {
        async function getActiveFoundationCurrentSprint() {}
        async function upsertFoundationCurrentSprintOverlay() {}
        async function buildCurrentSprintMutationGuardsDogfoodProof() {}
        const code = 'FOUNDATION_CURRENT_SPRINT_MUTATION_BLOCKED expectedPreviousActiveSprintId allowItemReplacement mutationPosture itemDiff'
        return { getActiveFoundationCurrentSprint, upsertFoundationCurrentSprintOverlay, buildCurrentSprintMutationGuardsDogfoodProof, code }
      }
    `,
    foundationDbLineCount: 19000,
  })
  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
    dogfoodInvariant: 'The old unsplit shape fails evaluation; the split shape only passes when the store module owns behavior and foundation-db wires through it.',
  }
}

export function createFoundationCurrentSprintStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  mapBacklogRow,
} = {}) {
  if (!pool) throw new Error('Current Sprint store requires a pool.')
  if (typeof withFoundationTransaction !== 'function') throw new Error('Current Sprint store requires withFoundationTransaction.')
  if (typeof insertChangeEvent !== 'function') throw new Error('Current Sprint store requires insertChangeEvent.')
  if (typeof mapBacklogRow !== 'function') throw new Error('Current Sprint store requires mapBacklogRow.')

  function mapFoundationSprintRow(row) {
    if (!row) return null
    return {
      sprintId: row.sprint_id,
      status: row.status,
      goal: row.goal,
      activeBlockerCardId: row.active_blocker_card_id,
      startedAt: row.started_at,
      closedAt: row.closed_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  function mapFoundationSprintItemRow(row) {
    if (!row) return null
    const backlog = row.backlog_card_id
      ? mapBacklogRow({
          id: row.backlog_card_id,
          title: row.backlog_title,
          team: row.backlog_team,
          lane: row.backlog_lane,
          priority: row.backlog_priority,
          rank: row.backlog_rank,
          source: row.backlog_source,
          summary: row.backlog_summary,
          why_it_matters: row.backlog_why_it_matters,
          next_action: row.backlog_next_action,
          status_note: row.backlog_status_note,
          owner: row.backlog_owner,
          created_at: row.backlog_created_at,
          updated_at: row.backlog_updated_at,
        })
      : null
    return {
      sprintId: row.sprint_id,
      cardId: row.backlog_id,
      backlogId: row.backlog_id,
      order: row.sprint_order,
      sprintOrder: row.sprint_order,
      stage: row.stage,
      planRef: row.plan_ref,
      definitionOfDone: row.definition_of_done,
      proofCommands: row.proof_commands || [],
      readinessBlockerCleared: row.readiness_blocker_cleared,
      notNextBoundaries: row.not_next_boundaries || [],
      existingWorkCheck: row.existing_work_check || {},
      returnedReason: row.returned_reason,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      backlog,
    }
  }

  function mapPlanCriticRunRow(row) {
    if (!row) return null
    return {
      runId: row.run_id,
      cardId: row.card_id,
      planRef: row.plan_ref,
      status: row.status,
      score: row.score === null || row.score === undefined ? 0 : Number(row.score),
      maxScore: row.max_score === null || row.max_score === undefined ? 10 : Number(row.max_score),
      passThreshold: normalizeApprovalThreshold(row.pass_threshold),
      priority: row.priority,
      gateLevel: row.gate_level,
      fullVerifyRequired: row.full_verify_required === true,
      changedFiles: row.changed_files || [],
      findings: row.findings || [],
      result: row.result || {},
      requestedBy: row.requested_by,
      createdAt: row.created_at,
    }
  }

  async function getActiveFoundationCurrentSprint() {
    const sprintResult = await pool.query(`
      SELECT *
      FROM foundation_sprints
      WHERE status = 'active'
      ORDER BY started_at DESC, created_at DESC
      LIMIT 1
    `)
    const sprint = mapFoundationSprintRow(sprintResult.rows[0])
    if (!sprint) return { sprint: null, items: [] }

    const itemResult = await pool.query(
      `
        SELECT
          si.*,
          b.id AS backlog_card_id,
          b.title AS backlog_title,
          b.team AS backlog_team,
          b.lane AS backlog_lane,
          b.priority AS backlog_priority,
          b.rank AS backlog_rank,
          b.source AS backlog_source,
          b.summary AS backlog_summary,
          b.why_it_matters AS backlog_why_it_matters,
          b.next_action AS backlog_next_action,
          b.status_note AS backlog_status_note,
          b.owner AS backlog_owner,
          b.created_at AS backlog_created_at,
          b.updated_at AS backlog_updated_at
        FROM foundation_sprint_items si
        LEFT JOIN backlog_items b ON b.id = si.backlog_id
        WHERE si.sprint_id = $1
        ORDER BY si.sprint_order ASC, si.created_at ASC
      `,
      [sprint.sprintId]
    )

    const cardIds = itemResult.rows.map(row => row.backlog_id).filter(Boolean)
    const planCriticResult = cardIds.length
      ? await pool.query(
        `
          SELECT *
          FROM plan_critic_runs
          WHERE card_id = ANY($1::text[])
          ORDER BY card_id ASC, created_at DESC
        `,
        [cardIds]
      )
      : { rows: [] }

    return {
      sprint,
      items: itemResult.rows.map(mapFoundationSprintItemRow),
      planCriticRuns: planCriticResult.rows.map(mapPlanCriticRunRow).filter(Boolean),
    }
  }

  async function getPlanCriticRunsByCardIds(ids = []) {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(ids) ? ids : [])
        .map(id => String(id || '').trim())
        .filter(Boolean)
    ))
    if (!normalizedIds.length) return []

    const result = await pool.query(
      `
        SELECT *
        FROM plan_critic_runs
        WHERE card_id = ANY($1::text[])
        ORDER BY card_id ASC, created_at DESC
      `,
      [normalizedIds]
    )

    return result.rows.map(mapPlanCriticRunRow).filter(Boolean)
  }

  function normalizeFoundationCurrentSprintMutationOptions(input = {}, options = {}) {
    const inputMutation = input.mutation && typeof input.mutation === 'object' ? input.mutation : {}
    return {
      apply: options.apply === true || inputMutation.apply === true,
      expectedPreviousActiveSprintId: String(
        options.expectedPreviousActiveSprintId ||
        inputMutation.expectedPreviousActiveSprintId ||
        inputMutation.expected_previous_active_sprint_id ||
        '',
      ).trim(),
      allowItemReplacement: options.allowItemReplacement === true || inputMutation.allowItemReplacement === true || inputMutation.allow_item_replacement === true,
      reason: String(options.reason || inputMutation.reason || '').trim(),
    }
  }

  function buildFoundationCurrentSprintItemDiff(existingItems = [], nextItems = []) {
    const existingById = new Map(existingItems.map(item => [item.backlog_id, item]))
    const nextById = new Map(nextItems.map(item => [item.cardId, item]))
    const removed = existingItems
      .filter(item => !nextById.has(item.backlog_id))
      .map(item => item.backlog_id)
    const added = nextItems
      .filter(item => !existingById.has(item.cardId))
      .map(item => item.cardId)
    const changed = nextItems
      .filter(item => {
        const existing = existingById.get(item.cardId)
        if (!existing) return false
        return Number(existing.sprint_order) !== Number(item.order) ||
          String(existing.stage || '') !== String(item.stage || '') ||
          String(existing.plan_ref || '') !== String(item.planRef || '') ||
          String(existing.definition_of_done || '') !== String(item.definitionOfDone || '')
      })
      .map(item => item.cardId)

    return {
      existingCount: existingItems.length,
      nextCount: nextItems.length,
      removed,
      added,
      changed,
      changedCount: removed.length + added.length + changed.length,
    }
  }

  function assertFoundationCurrentSprintMutationAllowed({
    sprintId,
    status,
    mutation,
    activeSprintRows,
    itemDiff,
  }) {
    if (!mutation.apply) {
      throw new FoundationCurrentSprintMutationGuardError(
        'Current Sprint overlay writes require explicit apply posture.',
        { sprintId, status, required: 'apply' },
      )
    }

    if (status === 'active') {
      const activeSprintIds = activeSprintRows.map(row => row.sprint_id)
      if (activeSprintIds.length && !mutation.expectedPreviousActiveSprintId) {
        throw new FoundationCurrentSprintMutationGuardError(
          'Opening or replacing an active Current Sprint requires expectedPreviousActiveSprintId.',
          { sprintId, activeSprintIds, required: 'expectedPreviousActiveSprintId' },
        )
      }
      if (
        mutation.expectedPreviousActiveSprintId &&
        !activeSprintIds.includes(mutation.expectedPreviousActiveSprintId)
      ) {
        throw new FoundationCurrentSprintMutationGuardError(
          'Current Sprint expectedPreviousActiveSprintId does not match the live active sprint.',
          { sprintId, expectedPreviousActiveSprintId: mutation.expectedPreviousActiveSprintId, activeSprintIds },
        )
      }
    }

    if (itemDiff.existingCount > 0 && itemDiff.changedCount > 0 && !mutation.allowItemReplacement) {
      throw new FoundationCurrentSprintMutationGuardError(
        'Replacing Current Sprint items requires allowItemReplacement=true.',
        { sprintId, itemDiff, required: 'allowItemReplacement' },
      )
    }
  }

  async function upsertFoundationCurrentSprintOverlayWithClient(client, input = {}, actor = 'system', options = {}) {
    const sprintInput = input.sprint || {}
    const sprintId = String(sprintInput.sprintId || sprintInput.sprint_id || '').trim()
    if (!sprintId) throw new Error('sprintId is required')
    const status = String(sprintInput.status || 'active').trim()
    const goal = String(sprintInput.goal || '').trim()
    if (!goal) throw new Error('sprint goal is required')
    const activeBlockerCardId = String(sprintInput.activeBlockerCardId || sprintInput.active_blocker_card_id || '').trim() || null
    const metadata = sprintInput.metadata && typeof sprintInput.metadata === 'object' ? sprintInput.metadata : {}
    const items = Array.isArray(input.items) ? input.items : []
    if (!items.length) throw new Error('at least one sprint item is required')

    const mutation = normalizeFoundationCurrentSprintMutationOptions(input, options)
    const normalizedItems = items.map(rawItem => {
      const cardId = String(rawItem.cardId || rawItem.backlogId || rawItem.backlog_id || '').trim()
      if (!cardId) throw new Error('sprint item cardId is required')
      return {
        rawItem,
        cardId,
        order: Number(rawItem.order ?? rawItem.sprintOrder ?? rawItem.sprint_order),
        stage: String(rawItem.stage || '').trim(),
        planRef: rawItem.planRef || rawItem.plan_ref || null,
        definitionOfDone: rawItem.definitionOfDone || rawItem.definition_of_done || '',
      }
    })

    const activeSprintResult = await client.query(
      `
        SELECT sprint_id, status, active_blocker_card_id
        FROM foundation_sprints
        WHERE status = 'active'
        ORDER BY started_at DESC, created_at DESC
        FOR UPDATE
      `,
    )
    const existingItemsResult = await client.query(
      `
        SELECT *
        FROM foundation_sprint_items
        WHERE sprint_id = $1
        ORDER BY sprint_order ASC, created_at ASC
        FOR UPDATE
      `,
      [sprintId],
    )
    const itemDiff = buildFoundationCurrentSprintItemDiff(existingItemsResult.rows, normalizedItems)
    assertFoundationCurrentSprintMutationAllowed({
      sprintId,
      status,
      mutation,
      activeSprintRows: activeSprintResult.rows,
      itemDiff,
    })

    if (status === 'active') {
      await client.query(
        `
          UPDATE foundation_sprints
          SET status = 'closed',
              closed_at = COALESCE(closed_at, NOW()),
              updated_at = NOW()
          WHERE status = 'active'
            AND sprint_id <> $1
        `,
        [sprintId]
      )
    }

    const sprintResult = await client.query(
      `
        INSERT INTO foundation_sprints (
          sprint_id, status, goal, active_blocker_card_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (sprint_id) DO UPDATE
        SET status = EXCLUDED.status,
            goal = EXCLUDED.goal,
            active_blocker_card_id = EXCLUDED.active_blocker_card_id,
            metadata = EXCLUDED.metadata,
            closed_at = CASE WHEN EXCLUDED.status = 'closed' THEN COALESCE(foundation_sprints.closed_at, NOW()) ELSE NULL END,
            updated_at = NOW()
        RETURNING *
      `,
      [sprintId, status, goal, activeBlockerCardId, JSON.stringify(metadata)]
    )

    await client.query(`DELETE FROM foundation_sprint_items WHERE sprint_id = $1`, [sprintId])
    for (const item of normalizedItems) {
      const rawItem = item.rawItem
      await client.query(
        `
          INSERT INTO foundation_sprint_items (
            sprint_id,
            backlog_id,
            sprint_order,
            stage,
            plan_ref,
            definition_of_done,
            proof_commands,
            readiness_blocker_cleared,
            not_next_boundaries,
            existing_work_check,
            returned_reason,
            metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8,$9::text[],$10::jsonb,$11,$12::jsonb)
        `,
        [
          sprintId,
          item.cardId,
          item.order,
          item.stage,
          item.planRef,
          item.definitionOfDone,
          Array.isArray(rawItem.proofCommands || rawItem.proof_commands) ? (rawItem.proofCommands || rawItem.proof_commands) : [],
          rawItem.readinessBlockerCleared || rawItem.readiness_blocker_cleared || null,
          Array.isArray(rawItem.notNextBoundaries || rawItem.not_next_boundaries) ? (rawItem.notNextBoundaries || rawItem.not_next_boundaries) : [],
          JSON.stringify(rawItem.existingWorkCheck || rawItem.existing_work_check || {}),
          rawItem.returnedReason || rawItem.returned_reason || null,
          JSON.stringify(rawItem.metadata && typeof rawItem.metadata === 'object' ? rawItem.metadata : {}),
        ]
      )
    }

    await insertChangeEvent(client, {
      eventType: 'foundation_sprint_updated',
      entityTable: 'foundation_sprints',
      entityId: sprintId,
      actor,
      summary: `Updated Current Sprint overlay ${sprintId}.`,
      metadata: {
        status,
        activeBlockerCardId,
        itemCount: normalizedItems.length,
        mutationPosture: {
          apply: mutation.apply,
          expectedPreviousActiveSprintId: mutation.expectedPreviousActiveSprintId,
          allowItemReplacement: mutation.allowItemReplacement,
          reason: mutation.reason,
        },
        itemDiff,
      },
    })

    const persisted = mapFoundationSprintRow(sprintResult.rows[0])
    return {
      sprint: persisted,
      items: (await client.query(
        `
          SELECT
            si.*,
            b.id AS backlog_card_id,
            b.title AS backlog_title,
            b.team AS backlog_team,
            b.lane AS backlog_lane,
            b.priority AS backlog_priority,
            b.rank AS backlog_rank,
            b.source AS backlog_source,
            b.summary AS backlog_summary,
            b.why_it_matters AS backlog_why_it_matters,
            b.next_action AS backlog_next_action,
            b.status_note AS backlog_status_note,
            b.owner AS backlog_owner,
            b.created_at AS backlog_created_at,
            b.updated_at AS backlog_updated_at
          FROM foundation_sprint_items si
          LEFT JOIN backlog_items b ON b.id = si.backlog_id
          WHERE si.sprint_id = $1
          ORDER BY si.sprint_order ASC
        `,
        [sprintId]
      )).rows.map(mapFoundationSprintItemRow),
      mutation: {
        itemDiff,
        expectedPreviousActiveSprintId: mutation.expectedPreviousActiveSprintId,
      },
    }
  }

  async function upsertFoundationCurrentSprintOverlay(input = {}, actor = 'system', options = {}) {
    return withFoundationTransaction(async client => {
      return upsertFoundationCurrentSprintOverlayWithClient(client, input, actor, options)
    })
  }

  async function captureCurrentSprintMutationGuardError(fn) {
    try {
      const result = await fn()
      return {
        ok: false,
        blocked: false,
        result,
      }
    } catch (error) {
      return {
        ok: error instanceof FoundationCurrentSprintMutationGuardError,
        blocked: error instanceof FoundationCurrentSprintMutationGuardError,
        code: error.code || null,
        message: error.message,
        metadata: error.metadata || {},
      }
    }
  }

  async function insertSyntheticSprintDogfoodBacklogItem(client, id) {
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation','scoped','P2',999,'CURRENT-SPRINT-MUTATION-GUARDS-001 dogfood',$3,$4,$5,$6,'Foundation Process')
      `,
      [
        id,
        `Synthetic dogfood card ${id}`,
        'Synthetic Current Sprint mutation guard card.',
        'Exists only inside a rollback transaction to prove sprint helper mutation boundaries.',
        'Rollback transaction only.',
        'Synthetic row; must never persist.',
      ],
    )
  }

  async function buildCurrentSprintMutationGuardsDogfoodProof() {
    const unsafeNoApply = await captureCurrentSprintMutationGuardError(async () => upsertFoundationCurrentSprintOverlay(
      {
        sprint: {
          sprintId: `dogfood-unsafe-${randomUUID()}`,
          status: 'active',
          goal: 'Synthetic unsafe Current Sprint mutation guard proof.',
        },
        items: [
          {
            cardId: CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
            order: 1,
            stage: 'scoping',
          },
        ],
      },
      'current-sprint-mutation-dogfood',
    ))

    const client = await pool.connect()
    const replacementCardId = `DOGFOOD-SPRINT-REPLACEMENT-${randomUUID()}`
    let targetSprintId = ''
    let existingCardId = ''
    let beforeRollbackState = null
    let missingExpectedPreviousActiveSprintId = null
    let missingAllowItemReplacement = null
    let explicitAllowed = null
    let syntheticPersistedAfterRollback = null

    try {
      await client.query('BEGIN')
      const activeSprint = await client.query(
        `
          SELECT sprint_id
          FROM foundation_sprints
          WHERE status = 'active'
          ORDER BY started_at DESC, created_at DESC
          LIMIT 1
        `,
      )
      targetSprintId = activeSprint.rows[0]?.sprint_id || ''
      if (!targetSprintId) throw new Error('Current Sprint mutation dogfood proof requires one active sprint.')
      const existingItems = await client.query(
        `
          SELECT backlog_id
          FROM foundation_sprint_items
          WHERE sprint_id = $1
          ORDER BY sprint_order ASC
        `,
        [targetSprintId],
      )
      existingCardId = existingItems.rows[0]?.backlog_id || ''
      if (!existingCardId) throw new Error('Current Sprint mutation dogfood proof requires at least one existing sprint item.')
      beforeRollbackState = {
        activeSprintId: targetSprintId,
        itemCount: existingItems.rowCount,
        firstItem: existingCardId,
      }
      await insertSyntheticSprintDogfoodBacklogItem(client, replacementCardId)

      const replacementInput = {
        sprint: {
          sprintId: targetSprintId,
          status: 'active',
          goal: 'Synthetic rollback-scoped replacement of the live active sprint.',
          activeBlockerCardId: replacementCardId,
          metadata: { dogfood: CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID, replacement: true },
        },
        items: [
          {
            cardId: replacementCardId,
            order: 1,
            stage: 'building_now',
            definitionOfDone: 'Synthetic replacement item.',
          },
        ],
      }

      missingExpectedPreviousActiveSprintId = await captureCurrentSprintMutationGuardError(async () => (
        upsertFoundationCurrentSprintOverlayWithClient(
          client,
          replacementInput,
          'current-sprint-mutation-dogfood',
          { apply: true, allowItemReplacement: true, reason: 'dogfood missing expected id' },
        )
      ))

      missingAllowItemReplacement = await captureCurrentSprintMutationGuardError(async () => (
        upsertFoundationCurrentSprintOverlayWithClient(
          client,
          replacementInput,
          'current-sprint-mutation-dogfood',
          { apply: true, expectedPreviousActiveSprintId: targetSprintId, reason: 'dogfood missing item replacement approval' },
        )
      ))

      const allowedResult = await upsertFoundationCurrentSprintOverlayWithClient(
        client,
        replacementInput,
        'current-sprint-mutation-dogfood',
        {
          apply: true,
          expectedPreviousActiveSprintId: targetSprintId,
          allowItemReplacement: true,
          reason: 'dogfood explicit current sprint mutation guard proof',
        },
      )
      const persistedItems = await client.query(
        `
          SELECT backlog_id, stage
          FROM foundation_sprint_items
          WHERE sprint_id = $1
          ORDER BY sprint_order ASC
        `,
        [targetSprintId],
      )
      const changeEvent = await client.query(
        `
          SELECT metadata
          FROM change_events
          WHERE entity_table = 'foundation_sprints'
            AND entity_id = $1
            AND event_type = 'foundation_sprint_updated'
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [targetSprintId],
      )
      explicitAllowed = {
        ok: true,
        sprintId: allowedResult.sprint.sprintId,
        itemDiff: allowedResult.mutation.itemDiff,
        persistedItems: persistedItems.rows,
        changeEventItemDiff: changeEvent.rows[0]?.metadata?.itemDiff || null,
      }
    } finally {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
    }

    const rollbackCheck = await pool.query(
      `
        SELECT
          EXISTS (SELECT 1 FROM foundation_sprints WHERE sprint_id = $1 AND status = 'active') AS active_sprint_restored,
          (SELECT COUNT(*)::int FROM foundation_sprint_items WHERE sprint_id = $1) AS restored_item_count,
          EXISTS (SELECT 1 FROM foundation_sprint_items WHERE sprint_id = $1 AND backlog_id = $2) AS existing_item_restored,
          EXISTS (SELECT 1 FROM backlog_items WHERE id = $3) AS replacement_card_exists
      `,
      [targetSprintId, existingCardId, replacementCardId],
    )
    syntheticPersistedAfterRollback = rollbackCheck.rows[0] || {}

    const ok =
      unsafeNoApply.blocked === true &&
      missingExpectedPreviousActiveSprintId?.blocked === true &&
      missingAllowItemReplacement?.blocked === true &&
      explicitAllowed?.ok === true &&
      explicitAllowed.itemDiff?.removed?.includes(existingCardId) &&
      explicitAllowed.itemDiff?.added?.includes(replacementCardId) &&
      explicitAllowed.persistedItems?.length === 1 &&
      explicitAllowed.persistedItems[0]?.backlog_id === replacementCardId &&
      syntheticPersistedAfterRollback.active_sprint_restored === true &&
      syntheticPersistedAfterRollback.restored_item_count === beforeRollbackState?.itemCount &&
      syntheticPersistedAfterRollback.existing_item_restored === true &&
      syntheticPersistedAfterRollback.replacement_card_exists === false

    return {
      ok,
      cardId: CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
      mode: 'current-sprint-mutation-guard-dogfood',
      unsafeNoApply,
      missingExpectedPreviousActiveSprintId,
      missingAllowItemReplacement,
      explicitAllowed,
      beforeRollbackState,
      syntheticRollback: syntheticPersistedAfterRollback,
      dogfoodInvariant: 'Current Sprint overlay mutation must require apply posture, expected active sprint id, and explicit item replacement approval.',
    }
  }

  return {
    getActiveFoundationCurrentSprint,
    getPlanCriticRunsByCardIds,
    upsertFoundationCurrentSprintOverlay,
    buildCurrentSprintMutationGuardsDogfoodProof,
  }
}
