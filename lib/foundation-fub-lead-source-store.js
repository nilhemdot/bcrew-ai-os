export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-007'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID = 'foundation-db-fub-lead-source-store-split-2026-05-15'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-fub-lead-source-store-split-v1'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-fub-lead-source-store-split-007-plan.md'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-007.json'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-fub-lead-source-store-split-check.mjs'
export const FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES = 11601

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

export function mapFubLeadSourceRuleRow(row) {
  return {
    source: row.source_name,
    marketingType: row.marketing_type,
    ownershipType: row.ownership_type,
    flagState: row.flag_state,
    sourceGroup: row.source_group,
    notes: row.notes,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    updatedBy: row.updated_by || null,
  }
}

export function mapFubLeadSourceSnapshotRow(row) {
  return {
    contextKey: row.context_key,
    contextLabel: row.context_label,
    sources: Array.isArray(row.payload) ? row.payload : [],
    scan: {
      uniqueSources: Number(row.unique_sources || 0),
      peopleScanned: Number(row.people_scanned || 0),
      pagesScanned: Number(row.pages_scanned || 0),
      truncated: Boolean(row.truncated),
    },
    refreshedAt: row.refreshed_at?.toISOString?.() || row.refreshed_at || null,
    refreshedBy: row.refreshed_by || null,
  }
}

export function normalizeFubLeadSourceRuleInput(input = {}) {
  const source = String(input.source || '').trim()
  if (!source) throw new Error('Lead source is required.')

  return {
    source,
    marketingType: String(input.marketingType || 'unclassified').trim() || 'unclassified',
    ownershipType: String(input.ownershipType || 'unclassified').trim() || 'unclassified',
    flagState: String(input.flagState || 'none').trim() || 'none',
    sourceGroup: input.sourceGroup == null ? null : String(input.sourceGroup).trim() || null,
    notes: input.notes == null ? null : String(input.notes).trim() || null,
  }
}

export function normalizeFubLeadSourceSnapshotInput(input = {}) {
  const contextKey = String(input.contextKey || '').trim()
  const contextLabel = String(input.contextLabel || '').trim()
  if (!contextKey) throw new Error('FUB lead-source snapshot context key is required.')
  if (!contextLabel) throw new Error('FUB lead-source snapshot context label is required.')

  const sources = Array.isArray(input.sources)
    ? input.sources
        .map(function(item) {
          const source = String(item && item.source || '').trim()
          if (!source) return null
          return {
            source,
            count: Math.max(0, Number(item.count) || 0),
          }
        })
        .filter(Boolean)
    : []
  const scan = input.scan || {}

  return {
    contextKey,
    contextLabel,
    sources,
    scan: {
      uniqueSources: Math.max(0, Number(scan.uniqueSources) || sources.length),
      peopleScanned: Math.max(0, Number(scan.peopleScanned) || 0),
      pagesScanned: Math.max(0, Number(scan.pagesScanned) || 0),
      truncated: Boolean(scan.truncated),
    },
  }
}

export function createFubLeadSourceStore({ pool, withFoundationTransaction } = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('FUB lead-source store requires a queryable pool.')
  if (typeof withFoundationTransaction !== 'function') throw new Error('FUB lead-source store requires withFoundationTransaction.')

  async function listFubLeadSourceRules() {
    const result = await pool.query(
      `
        SELECT source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
        FROM fub_lead_source_rules
        ORDER BY source_name ASC
      `
    )

    return result.rows.map(mapFubLeadSourceRuleRow)
  }

  async function getFubLeadSourceSnapshot(contextKey) {
    const result = await pool.query(
      `
        SELECT context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
               truncated, refreshed_at, refreshed_by
        FROM fub_lead_source_snapshots
        WHERE context_key = $1
        LIMIT 1
      `,
      [contextKey]
    )

    if (!result.rows.length) return null
    return mapFubLeadSourceSnapshotRow(result.rows[0])
  }

  async function upsertFubLeadSourceRule(input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const normalized = normalizeFubLeadSourceRuleInput(input)
      const result = await client.query(
        `
          INSERT INTO fub_lead_source_rules (
            source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
          ON CONFLICT (source_name) DO UPDATE SET
            marketing_type = EXCLUDED.marketing_type,
            ownership_type = EXCLUDED.ownership_type,
            flag_state = EXCLUDED.flag_state,
            source_group = EXCLUDED.source_group,
            notes = EXCLUDED.notes,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          RETURNING source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
        `,
        [
          normalized.source,
          normalized.marketingType,
          normalized.ownershipType,
          normalized.flagState,
          normalized.sourceGroup,
          normalized.notes,
          actor,
        ]
      )

      return mapFubLeadSourceRuleRow(result.rows[0])
    })
  }

  async function saveFubLeadSourceSnapshot(input, actor = 'steve') {
    return withFoundationTransaction(async client => {
      const normalized = normalizeFubLeadSourceSnapshotInput(input)
      const result = await client.query(
        `
          INSERT INTO fub_lead_source_snapshots (
            context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
            truncated, refreshed_at, refreshed_by
          )
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, NOW(), $8)
          ON CONFLICT (context_key) DO UPDATE SET
            context_label = EXCLUDED.context_label,
            payload = EXCLUDED.payload,
            unique_sources = EXCLUDED.unique_sources,
            people_scanned = EXCLUDED.people_scanned,
            pages_scanned = EXCLUDED.pages_scanned,
            truncated = EXCLUDED.truncated,
            refreshed_at = NOW(),
            refreshed_by = EXCLUDED.refreshed_by
          RETURNING context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
                    truncated, refreshed_at, refreshed_by
        `,
        [
          normalized.contextKey,
          normalized.contextLabel,
          JSON.stringify(normalized.sources),
          normalized.scan.uniqueSources,
          normalized.scan.peopleScanned,
          normalized.scan.pagesScanned,
          normalized.scan.truncated,
          actor,
        ]
      )

      return mapFubLeadSourceSnapshotRow(result.rows[0])
    })
  }

  return {
    listFubLeadSourceRules,
    getFubLeadSourceSnapshot,
    upsertFubLeadSourceRule,
    saveFubLeadSourceSnapshot,
  }
}

export function evaluateFoundationFubLeadSourceStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  beforeLines = FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
  afterLines = 0,
} = {}) {
  const checks = []
  addEvaluationCheck(checks, moduleSource.includes('export function createFubLeadSourceStore'), 'module exports createFubLeadSourceStore')
  addEvaluationCheck(checks, moduleSource.includes('function listFubLeadSourceRules') && moduleSource.includes('FROM fub_lead_source_rules'), 'module owns FUB lead-source rule list query')
  addEvaluationCheck(checks, moduleSource.includes('function getFubLeadSourceSnapshot') && moduleSource.includes('FROM fub_lead_source_snapshots'), 'module owns FUB lead-source snapshot get query')
  addEvaluationCheck(checks, moduleSource.includes('function upsertFubLeadSourceRule') && moduleSource.includes('INSERT INTO fub_lead_source_rules'), 'module owns FUB lead-source rule upsert query')
  addEvaluationCheck(checks, moduleSource.includes('function saveFubLeadSourceSnapshot') && moduleSource.includes('INSERT INTO fub_lead_source_snapshots'), 'module owns FUB lead-source snapshot save query')
  addEvaluationCheck(checks, moduleSource.includes('normalizeFubLeadSourceRuleInput') && moduleSource.includes('normalizeFubLeadSourceSnapshotInput'), 'module owns FUB lead-source normalization helpers')
  addEvaluationCheck(checks, foundationDbSource.includes("from './foundation-fub-lead-source-store.js'"), 'foundation-db.js imports the FUB lead-source store module')
  addEvaluationCheck(checks, foundationDbSource.includes('createFubLeadSourceStore({') && foundationDbSource.includes('withFoundationTransaction'), 'foundation-db.js wires the store with pool and transaction dependency')
  addEvaluationCheck(checks, foundationDbSource.includes('export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules') && foundationDbSource.includes('export const saveFubLeadSourceSnapshot = fubLeadSourceStore.saveFubLeadSourceSnapshot'), 'foundation-db.js preserves public FUB lead-source exports')
  addEvaluationCheck(checks, !/export\s+async\s+function\s+listFubLeadSourceRules/.test(foundationDbSource) && !/export\s+async\s+function\s+saveFubLeadSourceSnapshot/.test(foundationDbSource), 'old inline FUB lead-source export functions are removed from foundation-db.js')
  addEvaluationCheck(checks, !/function\s+mapFubLeadSourceRuleRow/.test(foundationDbSource) && !/function\s+mapFubLeadSourceSnapshotRow/.test(foundationDbSource), 'old inline FUB lead-source mappers are removed from foundation-db.js')
  addEvaluationCheck(checks, scriptSource.includes('buildSyntheticFubLeadSourceStoreBehaviorProof') && scriptSource.includes('focused proof is read-only'), 'focused proof checks synthetic store behavior and read-only posture')
  addEvaluationCheck(checks, Number(afterLines) > 0 && Number(afterLines) < Number(beforeLines), 'foundation-db.js line count decreased', `${beforeLines}->${afterLines}`)

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    checks,
    failures,
    beforeLines,
    afterLines,
  }
}

export function buildFoundationFubLeadSourceStoreSplitDogfoodProof({ afterLines = 0 } = {}) {
  const oldInlineSource = `
    function mapFubLeadSourceRuleRow(row) { return row }
    export async function listFubLeadSourceRules() {}
    export async function saveFubLeadSourceSnapshot() {}
  `
  const splitFoundationSource = `
    import { createFubLeadSourceStore } from './foundation-fub-lead-source-store.js'
    const fubLeadSourceStore = createFubLeadSourceStore({ pool, withFoundationTransaction })
    export const listFubLeadSourceRules = fubLeadSourceStore.listFubLeadSourceRules
    export const getFubLeadSourceSnapshot = fubLeadSourceStore.getFubLeadSourceSnapshot
    export const upsertFubLeadSourceRule = fubLeadSourceStore.upsertFubLeadSourceRule
    export const saveFubLeadSourceSnapshot = fubLeadSourceStore.saveFubLeadSourceSnapshot
  `
  const splitModuleSource = `
    export function createFubLeadSourceStore() {
      function listFubLeadSourceRules() { return pool.query('FROM fub_lead_source_rules') }
      function getFubLeadSourceSnapshot() { return pool.query('FROM fub_lead_source_snapshots') }
      function upsertFubLeadSourceRule() { return pool.query('INSERT INTO fub_lead_source_rules') }
      function saveFubLeadSourceSnapshot() { return pool.query('INSERT INTO fub_lead_source_snapshots') }
      return { listFubLeadSourceRules, getFubLeadSourceSnapshot, upsertFubLeadSourceRule, saveFubLeadSourceSnapshot }
    }
    export function normalizeFubLeadSourceRuleInput() {}
    export function normalizeFubLeadSourceSnapshotInput() {}
  `
  const oldEvaluation = evaluateFoundationFubLeadSourceStoreSplit({
    foundationDbSource: oldInlineSource,
    moduleSource: '',
    scriptSource: '',
    beforeLines: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
    afterLines: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
  })
  const newEvaluation = evaluateFoundationFubLeadSourceStoreSplit({
    foundationDbSource: splitFoundationSource,
    moduleSource: splitModuleSource,
    scriptSource: 'focused proof is read-only; buildSyntheticFubLeadSourceStoreBehaviorProof()',
    beforeLines: FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES,
    afterLines: afterLines || FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_BEFORE_LINES - 1,
  })

  return {
    ok: oldEvaluation.ok === false && newEvaluation.ok === true,
    oldInlineRejected: oldEvaluation.ok === false,
    splitModuleAccepted: newEvaluation.ok === true,
    oldFailures: oldEvaluation.failures.map(failure => failure.check),
    newFailures: newEvaluation.failures.map(failure => failure.check),
  }
}

export async function buildSyntheticFubLeadSourceStoreBehaviorProof() {
  const calls = []
  const fakeRows = {
    rule: {
      source_name: 'Zillow',
      marketing_type: 'paid',
      ownership_type: 'company',
      flag_state: 'canonical',
      source_group: 'portal',
      notes: 'Synthetic rule',
      updated_at: '2026-05-15T19:00:00.000Z',
      updated_by: 'codex',
    },
    snapshot: {
      context_key: 'owner',
      context_label: 'Owner account',
      payload: [{ source: 'Zillow', count: 3 }],
      unique_sources: 1,
      people_scanned: 10,
      pages_scanned: 2,
      truncated: false,
      refreshed_at: '2026-05-15T19:00:00.000Z',
      refreshed_by: 'codex',
    },
  }
  const fakePool = {
    async query(sql, params = []) {
      calls.push({ surface: 'pool', sql, params })
      if (String(sql).includes('FROM fub_lead_source_rules')) return { rows: [fakeRows.rule] }
      if (String(sql).includes('FROM fub_lead_source_snapshots')) return { rows: [fakeRows.snapshot] }
      return { rows: [] }
    },
  }
  const fakeClient = {
    async query(sql, params = []) {
      calls.push({ surface: 'client', sql, params })
      if (String(sql).includes('INSERT INTO fub_lead_source_rules')) {
        return {
          rows: [{
            ...fakeRows.rule,
            source_name: params[0],
            marketing_type: params[1],
            ownership_type: params[2],
            flag_state: params[3],
            source_group: params[4],
            notes: params[5],
            updated_by: params[6],
          }],
        }
      }
      if (String(sql).includes('INSERT INTO fub_lead_source_snapshots')) {
        return {
          rows: [{
            ...fakeRows.snapshot,
            context_key: params[0],
            context_label: params[1],
            payload: JSON.parse(params[2]),
            unique_sources: params[3],
            people_scanned: params[4],
            pages_scanned: params[5],
            truncated: params[6],
            refreshed_by: params[7],
          }],
        }
      }
      return { rows: [] }
    },
  }
  const store = createFubLeadSourceStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
  })
  const listedRules = await store.listFubLeadSourceRules()
  const foundSnapshot = await store.getFubLeadSourceSnapshot('owner')
  const upsertedRule = await store.upsertFubLeadSourceRule({
    source: ' Zillow ',
    marketingType: ' paid ',
    ownershipType: ' company ',
    flagState: ' canonical ',
    sourceGroup: ' portal ',
    notes: ' Synthetic rule ',
  }, 'codex')
  const savedSnapshot = await store.saveFubLeadSourceSnapshot({
    contextKey: ' owner ',
    contextLabel: ' Owner account ',
    sources: [
      { source: ' Zillow ', count: '3' },
      { source: '', count: 99 },
    ],
    scan: {
      uniqueSources: '1',
      peopleScanned: '10',
      pagesScanned: '2',
      truncated: false,
    },
  }, 'codex')
  const checks = []
  addEvaluationCheck(checks, listedRules[0]?.source === 'Zillow' && listedRules[0]?.marketingType === 'paid', 'list maps rule row shape')
  addEvaluationCheck(checks, foundSnapshot?.contextKey === 'owner' && foundSnapshot?.scan?.peopleScanned === 10, 'get maps snapshot row shape')
  addEvaluationCheck(checks, upsertedRule.source === 'Zillow' && upsertedRule.updatedBy === 'codex', 'upsert normalizes rule input and actor')
  addEvaluationCheck(checks, savedSnapshot.sources.length === 1 && savedSnapshot.sources[0].source === 'Zillow' && savedSnapshot.sources[0].count === 3, 'save normalizes snapshot sources')
  addEvaluationCheck(checks, calls.some(call => call.surface === 'pool' && String(call.sql).includes('ORDER BY source_name ASC')), 'list query preserves ordering')
  addEvaluationCheck(checks, calls.some(call => call.surface === 'client' && String(call.sql).includes('ON CONFLICT (source_name) DO UPDATE')), 'rule upsert preserves conflict behavior')
  addEvaluationCheck(checks, calls.some(call => call.surface === 'client' && String(call.sql).includes('ON CONFLICT (context_key) DO UPDATE')), 'snapshot save preserves conflict behavior')

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    listedRules,
    foundSnapshot,
    upsertedRule,
    savedSnapshot,
    callCount: calls.length,
    checks,
    failures,
  }
}
