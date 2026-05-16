export const FOUNDATION_SALES_LISTING_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-015'
export const FOUNDATION_SALES_LISTING_STORE_SPLIT_SPRINT_ID = 'foundation-db-sales-listing-store-split-2026-05-16'
export const FOUNDATION_SALES_LISTING_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-sales-listing-store-split-v1'
export const FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-sales-listing-store-split-015-plan.md'
export const FOUNDATION_SALES_LISTING_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-015.json'
export const FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-sales-listing-store-split-check.mjs'
export const FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES = 5078

const SALES_LISTING_CASE_HISTORY_LIMIT = 30

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationSalesListingStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()

  addCheck(
    checks,
    moduleSource.includes('export function createFoundationSalesListingStore') &&
      moduleSource.includes('async function listSalesListingAssignments') &&
      moduleSource.includes('async function listSalesListingCases') &&
      moduleSource.includes('async function upsertSalesListingAssignment'),
    'Sales Listing store module owns the extracted public behavior',
    'factory and list/case/upsert methods present',
  )
  addCheck(
    checks,
    moduleSource.includes('function mapSalesListingAssignmentRow') &&
      moduleSource.includes('function buildSalesCaseHistory') &&
      moduleSource.includes('function normalizeSalesCaseHistory'),
    'Sales Listing store module owns row mapping and case-history helpers',
    'mapper and history helpers present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-sales-listing-store.js") &&
      foundationDbSource.includes('createFoundationSalesListingStore({') &&
      foundationDbSource.includes('foundationSalesListingStore'),
    'foundation-db wires through the dedicated Sales Listing store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const listSalesListingAssignments = foundationSalesListingStore.listSalesListingAssignments') &&
      foundationDbSource.includes('export const listSalesListingCases = foundationSalesListingStore.listSalesListingCases') &&
      foundationDbSource.includes('export const upsertSalesListingAssignment = foundationSalesListingStore.upsertSalesListingAssignment'),
    'foundation-db keeps stable public Sales Listing delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapSalesListingAssignmentRow\s*\(/.test(foundationDbSource) &&
      !/function\s+buildSalesCaseHistory\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+listSalesListingAssignments\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+upsertSalesListingAssignment\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted Sales Listing behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline Sales Listing ownership') &&
      scriptSource.includes('buildSyntheticFoundationSalesListingStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('sales listing') &&
      normalizedPlanSource.includes('no clickup read') &&
      normalizedPlanSource.includes('no clickup write'),
    'plan documents split/extraction posture and no ClickUp boundary',
    FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    beforeLines > 0 && afterLines > 0 && afterLines < beforeLines,
    'foundation-db.js line count decreases after the split',
    `${beforeLines}->${afterLines}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    beforeLines,
    afterLines,
  }
}

export async function buildFoundationSalesListingStoreSplitDogfoodProof(input = {}) {
  const unsplit = evaluateFoundationSalesListingStoreSplit({
    foundationDbSource: `
      function mapSalesListingAssignmentRow() {}
      function buildSalesCaseHistory() {}
      export async function listSalesListingAssignments() {}
      export async function upsertSalesListingAssignment() {}
    `,
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines: FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
    afterLines: FOUNDATION_SALES_LISTING_STORE_PRE_SPLIT_LINES,
  })
  const split = evaluateFoundationSalesListingStoreSplit(input)
  return {
    ok: unsplit.ok === false && split.ok === true,
    unsplit,
    split,
    dogfoodInvariant: 'The old inline Sales Listing DB shape fails; the split shape passes only when a dedicated store owns behavior and foundation-db delegates stable exports.',
  }
}

function mapSalesListingAssignmentRow(row) {
  return {
    clickUpTaskId: row.clickup_task_id,
    listingTitle: row.listing_title || '',
    listingUrl: row.listing_url || '',
    agentName: row.agent_name || '',
    resetDate: row.reset_date?.toISOString?.()?.slice(0, 10) || row.reset_date || null,
    daysSinceReset: row.days_since_reset == null ? null : Number(row.days_since_reset),
    assignedLeaderKey: row.assigned_leader_key || '',
    assignedLeaderName: row.assigned_leader_name || '',
    assignedLeaderEmail: row.assigned_leader_email || '',
    actionPlanStatus: row.action_plan_status || 'not_started',
    caseStatus: row.case_status || 'identified',
    outcomeStatus: row.outcome_status || 'open',
    actionPlanState: row.action_plan_state || 'unknown',
    actionPlanNoReason: row.action_plan_no_reason || '',
    firstSeenStaleDate: row.first_seen_stale_date?.toISOString?.()?.slice(0, 10) || row.first_seen_stale_date || null,
    staleSinceDate: row.stale_since_date?.toISOString?.()?.slice(0, 10) || row.stale_since_date || null,
    originalResetDate: row.original_reset_date?.toISOString?.()?.slice(0, 10) || row.original_reset_date || null,
    currentResetDate: row.current_reset_date?.toISOString?.()?.slice(0, 10) || row.current_reset_date || null,
    adjustedAt: row.adjusted_at?.toISOString?.()?.slice(0, 10) || row.adjusted_at || null,
    adjustmentDetectedAt: row.adjustment_detected_at?.toISOString?.() || row.adjustment_detected_at || null,
    actionPlanText: row.action_plan_text || '',
    updatedBy: row.updated_by || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function normalizeSalesHistoryText(value, limit = 240) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function salesHistoryValue(value) {
  if (value instanceof Date) return value.toISOString()
  return normalizeSalesHistoryText(value)
}

function salesHistoryActorLabel(actor) {
  const text = normalizeSalesHistoryText(actor, 80)
  if (!text) return 'system'
  if (text.includes('@')) return 'Sales Hub user'
  if (/process:sales-listings-hub-check/i.test(text)) return 'Sales Hub check'
  if (/sales-listing-case-sync/i.test(text)) return 'GLS sync'
  if (/sales-hub/i.test(text)) return 'Sales Hub'
  return text
}

function normalizeSalesCaseHistoryEvent(event) {
  if (!event || typeof event !== 'object') return null
  const at = normalizeSalesHistoryText(event.at || event.createdAt, 40)
  const title = normalizeSalesHistoryText(event.title, 80)
  if (!at || !title) return null
  return {
    id: normalizeSalesHistoryText(event.id || `${at}:${title}`, 120),
    at,
    title,
    source: normalizeSalesHistoryText(event.source, 80),
    actor: salesHistoryActorLabel(event.actor),
    note: normalizeSalesHistoryText(event.note, 500),
    changes: Array.isArray(event.changes)
      ? event.changes.map(change => ({
          field: normalizeSalesHistoryText(change?.field, 60),
          label: normalizeSalesHistoryText(change?.label, 80),
          from: normalizeSalesHistoryText(change?.from, 160),
          to: normalizeSalesHistoryText(change?.to, 160),
        })).filter(change => change.field && change.label)
      : [],
  }
}

function normalizeSalesCaseHistory(metadata) {
  const history = Array.isArray(metadata?.caseHistory) ? metadata.caseHistory : []
  return history.map(normalizeSalesCaseHistoryEvent).filter(Boolean).slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
}

function buildSalesCaseHistoryTitle(changes, input = {}) {
  const outcome = String(input.outcomeStatus || '').trim()
  const actionPlanState = String(input.actionPlanState || '').trim()
  if (changes.some(change => change.field === 'actionPlanNoReason') && !String(input.actionPlanNoReason || '').trim()) return 'No-game-plan reason cleared'
  if (changes.some(change => change.field === 'actionPlanText') && !String(input.actionPlanText || '').trim()) return 'Game plan note cleared'
  if (['no_action', 'cancelled', 'expired'].includes(outcome)) return 'Marked failed'
  if (['conditional', 'firm', 'closed'].includes(outcome)) return 'Movement recorded'
  if (outcome === 'adjusted') return 'Adjusted or repositioned'
  if (changes.some(change => change.field === 'currentResetDate' || change.field === 'adjustedAt')) return 'Listing adjusted or relisted'
  if (actionPlanState === 'no') return 'Game plan marked no'
  if (actionPlanState === 'yes') return 'Game plan marked yes'
  if (changes.some(change => change.field === 'actionPlanNoReason')) return 'No-game-plan reason updated'
  if (changes.some(change => change.field === 'actionPlanText')) return 'Game plan note updated'
  if (changes.some(change => change.field === 'assignedLeader')) return 'Sales leader updated'
  if (changes.some(change => change.field === 'caseStatus')) return 'Case status updated'
  return 'Case updated'
}

function buildSalesCaseHistoryNote(input = {}, flags = {}) {
  if (flags.hasActionPlanNoReason && String(input.actionPlanNoReason || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanNoReason, 500)
  }
  if (flags.hasActionPlanText && String(input.actionPlanText || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanText, 500)
  }
  return ''
}

function currentSalesCaseChanges(existing = {}) {
  return [
    { field: 'assignedLeader', label: 'Sales leader', from: '', to: existing.assignedLeaderName || existing.assignedLeaderKey || 'Unassigned' },
    { field: 'caseStatus', label: 'Case status', from: '', to: existing.caseStatus || 'identified' },
    { field: 'outcomeStatus', label: 'Outcome', from: '', to: existing.outcomeStatus || 'open' },
    { field: 'actionPlanState', label: 'Game plan', from: '', to: existing.actionPlanState || 'unknown' },
    existing.actionPlanNoReason
      ? { field: 'actionPlanNoReason', label: 'No-game-plan reason', from: '', to: existing.actionPlanNoReason }
      : null,
    existing.actionPlanText
      ? { field: 'actionPlanText', label: 'Game plan note', from: '', to: existing.actionPlanText }
      : null,
  ].filter(change => change && change.to)
}

function historyAlreadyHasCurrentNote(history = [], existing = {}) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || '', 500)
  if (!note) return true
  return history.some(event =>
    normalizeSalesHistoryText(event.note, 500) === note ||
    (event.changes || []).some(change => ['actionPlanNoReason', 'actionPlanText'].includes(change.field) && normalizeSalesHistoryText(change.to, 500) === note)
  )
}

function buildCurrentSalesCaseCapture(existing = {}, inputMetadata = {}, actor = 'system', at = new Date().toISOString(), makeId = defaultHistoryId) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || 'History started from existing GLS case state.', 500)
  return {
    id: makeId(),
    at,
    title: existing.actionPlanNoReason ? 'No-game-plan reason captured' : 'Current state captured',
    source: normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80),
    actor: salesHistoryActorLabel(actor),
    note,
    changes: currentSalesCaseChanges(existing),
  }
}

function defaultHistoryId() {
  return `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildSalesCaseHistory(existing, input = {}, inputMetadata = {}, actor = 'system', flags = {}, options = {}) {
  const priorHistory = normalizeSalesCaseHistory(existing?.metadata)
  const source = normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80)
  const at = options.nowIso || new Date().toISOString()
  const makeId = typeof options.makeId === 'function' ? options.makeId : defaultHistoryId
  const changes = []

  function addChange(enabled, field, label, fromValue, toValue) {
    if (!enabled) return
    const from = salesHistoryValue(fromValue)
    const to = salesHistoryValue(toValue)
    if (from === to) return
    changes.push({ field, label, from, to })
  }

  addChange(
    Object.prototype.hasOwnProperty.call(input, 'assignedLeaderKey'),
    'assignedLeader',
    'Sales leader',
    existing?.assignedLeaderName || existing?.assignedLeaderKey || 'Unassigned',
    input.assignedLeaderName || input.assignedLeaderKey || 'Unassigned'
  )
  addChange(flags.hasCaseStatus, 'caseStatus', 'Case status', existing?.caseStatus || '', input.caseStatus || 'identified')
  addChange(flags.hasOutcomeStatus, 'outcomeStatus', 'Outcome', existing?.outcomeStatus || '', input.outcomeStatus || 'open')
  addChange(flags.hasActionPlanState, 'actionPlanState', 'Game plan', existing?.actionPlanState || '', input.actionPlanState || 'unknown')
  addChange(flags.hasActionPlanNoReason, 'actionPlanNoReason', 'No-game-plan reason', existing?.actionPlanNoReason || '', input.actionPlanNoReason || '')
  addChange(flags.hasActionPlanText, 'actionPlanText', 'Game plan note', existing?.actionPlanText || '', input.actionPlanText || '')
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'currentResetDate'),
    'currentResetDate',
    'Reset date',
    existing?.currentResetDate || '',
    input.currentResetDate || ''
  )
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'adjustedAt'),
    'adjustedAt',
    'Adjusted date',
    existing?.adjustedAt || '',
    input.adjustedAt || ''
  )

  if (!existing) {
    return [
      ...priorHistory,
      {
        id: makeId(),
        at,
        title: 'Entered GLS',
        source,
        actor: salesHistoryActorLabel(actor),
        note: normalizeSalesHistoryText(inputMetadata.clickUpStatus || 'Listing crossed the stale threshold.', 500),
        changes: changes.filter(change => change.to),
      },
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!priorHistory.length && !changes.length) {
    return [buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at, makeId)].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length && !historyAlreadyHasCurrentNote(priorHistory, existing)) {
    return [
      ...priorHistory,
      buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at, makeId),
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length) return null

  return [
    ...priorHistory,
    {
      id: makeId(),
      at,
      title: buildSalesCaseHistoryTitle(changes, input),
      source,
      actor: salesHistoryActorLabel(actor),
      note: buildSalesCaseHistoryNote(input, flags),
      changes,
    },
  ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
}

const SALES_LISTING_SELECT_COLUMNS = `
  clickup_task_id, listing_title, listing_url, agent_name, reset_date,
  days_since_reset, assigned_leader_key, assigned_leader_name,
  assigned_leader_email, action_plan_status, case_status,
  outcome_status, action_plan_state, action_plan_no_reason,
  first_seen_stale_date, stale_since_date, original_reset_date,
  current_reset_date, adjusted_at, adjustment_detected_at,
  action_plan_text, metadata, created_at, updated_at, updated_by
`

export function createFoundationSalesListingStore({
  pool,
  historyNowIso,
  historyIdFactory,
} = {}) {
  if (!pool) throw new Error('Foundation Sales Listing store requires a pool.')

  async function listSalesListingAssignments(taskIds = []) {
    const normalizedTaskIds = Array.from(new Set((taskIds || []).map(id => String(id || '').trim()).filter(Boolean)))
    if (!normalizedTaskIds.length) return []

    try {
      const result = await pool.query(
        `
          SELECT ${SALES_LISTING_SELECT_COLUMNS}
          FROM sales_listing_assignments
          WHERE clickup_task_id = ANY($1::text[])
        `,
        [normalizedTaskIds]
      )

      return result.rows.map(mapSalesListingAssignmentRow)
    } catch (error) {
      if (error?.code === '42P01') return []
      throw error
    }
  }

  async function listSalesListingCases() {
    try {
      const result = await pool.query(
        `
          SELECT ${SALES_LISTING_SELECT_COLUMNS}
          FROM sales_listing_assignments
          ORDER BY updated_at DESC, clickup_task_id ASC
        `
      )

      return result.rows.map(mapSalesListingAssignmentRow)
    } catch (error) {
      if (error?.code === '42P01') return []
      throw error
    }
  }

  async function upsertSalesListingAssignment(input = {}, actor = 'system') {
    const taskId = String(input.clickUpTaskId || input.taskId || '').trim()
    if (!taskId) throw new Error('ClickUp task id is required.')
    const hasCaseStatus = Object.prototype.hasOwnProperty.call(input, 'caseStatus')
    const hasOutcomeStatus = Object.prototype.hasOwnProperty.call(input, 'outcomeStatus')
    const hasActionPlanState = Object.prototype.hasOwnProperty.call(input, 'actionPlanState')
    const hasActionPlanNoReason = Object.prototype.hasOwnProperty.call(input, 'actionPlanNoReason')
    const hasActionPlanText = Object.prototype.hasOwnProperty.call(input, 'actionPlanText')
    const existingResult = await pool.query('SELECT * FROM sales_listing_assignments WHERE clickup_task_id = $1 LIMIT 1', [taskId])
    const existing = existingResult.rows[0] ? mapSalesListingAssignmentRow(existingResult.rows[0]) : null
    const inputMetadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    const nextCaseHistory = buildSalesCaseHistory(existing, input, inputMetadata, actor, {
      hasCaseStatus,
      hasOutcomeStatus,
      hasActionPlanState,
      hasActionPlanNoReason,
      hasActionPlanText,
    }, {
      nowIso: typeof historyNowIso === 'function' ? historyNowIso() : undefined,
      makeId: historyIdFactory,
    })
    const metadata = nextCaseHistory ? { ...inputMetadata, caseHistory: nextCaseHistory } : inputMetadata

    const result = await pool.query(
      `
        INSERT INTO sales_listing_assignments (
          clickup_task_id, listing_title, listing_url, agent_name, reset_date,
          days_since_reset, assigned_leader_key, assigned_leader_name,
          assigned_leader_email, action_plan_status, case_status, outcome_status,
          action_plan_state, action_plan_no_reason, first_seen_stale_date,
          stale_since_date, original_reset_date, current_reset_date, adjusted_at,
          adjustment_detected_at, action_plan_text, metadata, updated_by,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, 'identified'),COALESCE($12, 'open'),COALESCE($13, 'unknown'),COALESCE($14, ''),$15,$16,$17,$18,$19,$20,COALESCE($21, ''),$22::jsonb,$23,NOW(),NOW())
        ON CONFLICT (clickup_task_id) DO UPDATE
        SET listing_title = EXCLUDED.listing_title,
            listing_url = EXCLUDED.listing_url,
            agent_name = EXCLUDED.agent_name,
            reset_date = EXCLUDED.reset_date,
            days_since_reset = EXCLUDED.days_since_reset,
            assigned_leader_key = EXCLUDED.assigned_leader_key,
            assigned_leader_name = EXCLUDED.assigned_leader_name,
            assigned_leader_email = EXCLUDED.assigned_leader_email,
            action_plan_status = EXCLUDED.action_plan_status,
            case_status = CASE WHEN $11 IS NULL THEN sales_listing_assignments.case_status ELSE EXCLUDED.case_status END,
            outcome_status = CASE WHEN $12 IS NULL THEN sales_listing_assignments.outcome_status ELSE EXCLUDED.outcome_status END,
            action_plan_state = CASE WHEN $13 IS NULL THEN sales_listing_assignments.action_plan_state ELSE EXCLUDED.action_plan_state END,
            action_plan_no_reason = CASE WHEN $14 IS NULL THEN sales_listing_assignments.action_plan_no_reason ELSE EXCLUDED.action_plan_no_reason END,
            first_seen_stale_date = COALESCE(sales_listing_assignments.first_seen_stale_date, EXCLUDED.first_seen_stale_date),
            stale_since_date = COALESCE(sales_listing_assignments.stale_since_date, EXCLUDED.stale_since_date),
            original_reset_date = COALESCE(sales_listing_assignments.original_reset_date, EXCLUDED.original_reset_date),
            current_reset_date = EXCLUDED.current_reset_date,
            adjusted_at = COALESCE(EXCLUDED.adjusted_at, sales_listing_assignments.adjusted_at),
            adjustment_detected_at = COALESCE(EXCLUDED.adjustment_detected_at, sales_listing_assignments.adjustment_detected_at),
            action_plan_text = CASE WHEN $21 IS NULL THEN sales_listing_assignments.action_plan_text ELSE EXCLUDED.action_plan_text END,
            metadata = sales_listing_assignments.metadata || EXCLUDED.metadata,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING ${SALES_LISTING_SELECT_COLUMNS}
      `,
      [
        taskId,
        String(input.listingTitle || '').trim(),
        String(input.listingUrl || '').trim(),
        String(input.agentName || '').trim(),
        input.resetDate || null,
        input.daysSinceReset == null ? null : Number(input.daysSinceReset),
        String(input.assignedLeaderKey || '').trim(),
        String(input.assignedLeaderName || '').trim(),
        String(input.assignedLeaderEmail || '').trim(),
        String(input.actionPlanStatus || 'not_started').trim(),
        hasCaseStatus ? String(input.caseStatus || 'identified').trim() : null,
        hasOutcomeStatus ? String(input.outcomeStatus || 'open').trim() : null,
        hasActionPlanState ? String(input.actionPlanState || 'unknown').trim() : null,
        hasActionPlanNoReason ? String(input.actionPlanNoReason || '').trim() : null,
        input.firstSeenStaleDate || null,
        input.staleSinceDate || null,
        input.originalResetDate || input.resetDate || null,
        input.currentResetDate || input.resetDate || null,
        input.adjustedAt || null,
        input.adjustmentDetectedAt || null,
        hasActionPlanText ? String(input.actionPlanText || '').trim() : null,
        JSON.stringify(metadata),
        actor,
      ]
    )

    return mapSalesListingAssignmentRow(result.rows[0])
  }

  return {
    listSalesListingAssignments,
    listSalesListingCases,
    upsertSalesListingAssignment,
  }
}

function buildSalesListingFakeRow(input = {}) {
  return {
    clickup_task_id: input.clickUpTaskId || input.taskId || 'task-1',
    listing_title: input.listingTitle || 'Listing',
    listing_url: input.listingUrl || 'https://example.invalid/listing',
    agent_name: input.agentName || 'Agent Name',
    reset_date: input.resetDate || '2026-05-01',
    days_since_reset: input.daysSinceReset == null ? 42 : input.daysSinceReset,
    assigned_leader_key: input.assignedLeaderKey || '',
    assigned_leader_name: input.assignedLeaderName || '',
    assigned_leader_email: input.assignedLeaderEmail || '',
    action_plan_status: input.actionPlanStatus || 'not_started',
    case_status: input.caseStatus || 'identified',
    outcome_status: input.outcomeStatus || 'open',
    action_plan_state: input.actionPlanState || 'unknown',
    action_plan_no_reason: input.actionPlanNoReason || '',
    first_seen_stale_date: input.firstSeenStaleDate || input.resetDate || '2026-05-01',
    stale_since_date: input.staleSinceDate || input.resetDate || '2026-05-01',
    original_reset_date: input.originalResetDate || input.resetDate || '2026-05-01',
    current_reset_date: input.currentResetDate || input.resetDate || '2026-05-01',
    adjusted_at: input.adjustedAt || null,
    adjustment_detected_at: input.adjustmentDetectedAt || null,
    action_plan_text: input.actionPlanText || '',
    metadata: input.metadata || {},
    updated_by: input.updatedBy || 'system',
    created_at: input.createdAt || '2026-05-16T00:00:00.000Z',
    updated_at: input.updatedAt || '2026-05-16T00:00:00.000Z',
  }
}

export async function buildSyntheticFoundationSalesListingStoreBehaviorProof() {
  const rowsByTaskId = new Map()
  const queries = []
  const fakePool = {
    async query(sql, args = []) {
      queries.push({ sql: String(sql), args })
      if (/SELECT \* FROM sales_listing_assignments WHERE clickup_task_id = \$1 LIMIT 1/.test(sql)) {
        return { rows: rowsByTaskId.has(args[0]) ? [rowsByTaskId.get(args[0])] : [] }
      }
      if (/WHERE clickup_task_id = ANY\(\$1::text\[\]\)/.test(sql)) {
        return { rows: (args[0] || []).map(id => rowsByTaskId.get(id)).filter(Boolean) }
      }
      if (/ORDER BY updated_at DESC, clickup_task_id ASC/.test(sql)) {
        return { rows: Array.from(rowsByTaskId.values()) }
      }
      if (/INSERT INTO sales_listing_assignments/.test(sql)) {
        const existing = rowsByTaskId.get(args[0]) || {}
        const metadata = JSON.parse(args[21] || '{}')
        const next = {
          clickup_task_id: args[0],
          listing_title: args[1],
          listing_url: args[2],
          agent_name: args[3],
          reset_date: args[4],
          days_since_reset: args[5],
          assigned_leader_key: args[6],
          assigned_leader_name: args[7],
          assigned_leader_email: args[8],
          action_plan_status: args[9],
          case_status: args[10] == null ? (existing.case_status || 'identified') : args[10],
          outcome_status: args[11] == null ? (existing.outcome_status || 'open') : args[11],
          action_plan_state: args[12] == null ? (existing.action_plan_state || 'unknown') : args[12],
          action_plan_no_reason: args[13] == null ? (existing.action_plan_no_reason || '') : args[13],
          first_seen_stale_date: existing.first_seen_stale_date || args[14],
          stale_since_date: existing.stale_since_date || args[15],
          original_reset_date: existing.original_reset_date || args[16],
          current_reset_date: args[17],
          adjusted_at: args[18] || existing.adjusted_at || null,
          adjustment_detected_at: args[19] || existing.adjustment_detected_at || null,
          action_plan_text: args[20] == null ? (existing.action_plan_text || '') : args[20],
          metadata: { ...(existing.metadata || {}), ...metadata },
          updated_by: args[22],
          created_at: existing.created_at || '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T01:00:00.000Z',
        }
        rowsByTaskId.set(args[0], next)
        return { rows: [next] }
      }
      throw new Error(`Unexpected synthetic Sales Listing query: ${sql}`)
    },
  }

  const store = createFoundationSalesListingStore({
    pool: fakePool,
    historyNowIso: () => '2026-05-16T02:00:00.000Z',
    historyIdFactory: () => 'gls-case-dogfood',
  })
  const created = await store.upsertSalesListingAssignment({
    clickUpTaskId: 'task-123',
    listingTitle: '123 Main St',
    listingUrl: 'https://example.invalid/task-123',
    agentName: 'Sample Agent',
    resetDate: '2026-04-01',
    daysSinceReset: 45,
    assignedLeaderKey: 'nick',
    assignedLeaderName: 'Nick',
    assignedLeaderEmail: 'nick@example.invalid',
    caseStatus: 'identified',
    outcomeStatus: 'open',
    actionPlanState: 'no',
    actionPlanNoReason: 'Needs a concrete relist plan.',
    metadata: { source: 'sales-hub', clickUpStatus: 'Stale listing' },
  }, 'sales-hub-dogfood')
  const updated = await store.upsertSalesListingAssignment({
    clickUpTaskId: 'task-123',
    listingTitle: '123 Main St',
    listingUrl: 'https://example.invalid/task-123',
    agentName: 'Sample Agent',
    resetDate: '2026-04-01',
    daysSinceReset: 46,
    assignedLeaderKey: 'nick',
    assignedLeaderName: 'Nick',
    assignedLeaderEmail: 'nick@example.invalid',
    outcomeStatus: 'adjusted',
    currentResetDate: '2026-05-15',
    adjustedAt: '2026-05-15',
    actionPlanText: 'Relisted with refreshed pricing.',
    metadata: { source: 'sales-hub' },
  }, 'sales-hub-dogfood')
  const listed = await store.listSalesListingAssignments(['task-123'])
  const cases = await store.listSalesListingCases()

  const ok = created.clickUpTaskId === 'task-123' &&
    created.actionPlanState === 'no' &&
    updated.outcomeStatus === 'adjusted' &&
    updated.currentResetDate === '2026-05-15' &&
    Array.isArray(updated.metadata.caseHistory) &&
    updated.metadata.caseHistory.length >= 2 &&
    listed.length === 1 &&
    cases.length === 1 &&
    queries.some(query => /INSERT INTO sales_listing_assignments/.test(query.sql))

  return {
    ok,
    created,
    updated,
    listedCount: listed.length,
    casesCount: cases.length,
    queryCount: queries.length,
    invariant: 'Sales Listing store preserves create/update/list behavior and case-history mapping through the extracted store without live ClickUp reads or writes.',
  }
}
