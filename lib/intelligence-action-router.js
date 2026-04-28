import { createHash } from 'node:crypto'

export const intelligenceActionRouterSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_action_router_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL
      CHECK (run_type IN ('route_proposal', 'router_proof', 'approval', 'application')),
    status TEXT NOT NULL
      CHECK (status IN ('succeeded', 'failed')),
    requested_by TEXT NOT NULL DEFAULT 'system',
    synthesized_item_count INTEGER NOT NULL DEFAULT 0,
    route_count INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    applied_count INTEGER NOT NULL DEFAULT 0,
    max_tier INTEGER NOT NULL DEFAULT 1,
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_action_router_runs_lookup
  ON intelligence_action_router_runs(run_type, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS intelligence_action_routes (
    route_id TEXT PRIMARY KEY,
    run_id TEXT REFERENCES intelligence_action_router_runs(run_id) ON DELETE SET NULL,
    synthesized_item_id TEXT NOT NULL REFERENCES intelligence_synthesized_items(synthesized_item_id) ON DELETE CASCADE,
    synthesized_item_natural_key TEXT NOT NULL,
    route_type TEXT NOT NULL
      CHECK (route_type IN (
        'decision',
        'backlog_task',
        'open_question',
        'contradiction',
        'ignore',
        'snooze',
        'owner_action',
        'needs_owner_decision'
      )),
    destination_table TEXT NOT NULL
      CHECK (destination_table IN (
        'decisions',
        'backlog_items',
        'open_questions',
        'intelligence_synthesized_items'
      )),
    destination_record_id TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (approval_status IN ('pending', 'approved', 'rejected', 'applied', 'cancelled')),
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    owner TEXT NOT NULL,
    owner_confidence TEXT NOT NULL DEFAULT 'needs_owner'
      CHECK (owner_confidence IN ('high', 'medium', 'low', 'needs_owner')),
    routing_reason TEXT NOT NULL,
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_chunk_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    atom_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    artifact_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    sensitivity TEXT NOT NULL DEFAULT 'neutral',
    min_tier INTEGER NOT NULL DEFAULT 1,
    proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    applied_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    routed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    applied_at TIMESTAMPTZ,
    applied_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_action_routes_item
  ON intelligence_action_routes(synthesized_item_id, approval_status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_action_routes_pending
  ON intelligence_action_routes(approval_status, destination_table, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_action_routes_owner
  ON intelligence_action_routes(owner, approval_status, updated_at DESC);
`

const ROUTE_TYPES = new Set([
  'decision',
  'backlog_task',
  'open_question',
  'contradiction',
  'ignore',
  'snooze',
  'owner_action',
  'needs_owner_decision',
])

const ROUTE_DESTINATIONS = {
  decision: 'decisions',
  backlog_task: 'backlog_items',
  open_question: 'open_questions',
  contradiction: 'open_questions',
  ignore: 'intelligence_synthesized_items',
  snooze: 'intelligence_synthesized_items',
  owner_action: 'backlog_items',
  needs_owner_decision: 'open_questions',
}

function stableHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function uniqueText(values) {
  return Array.from(new Set(normalizeTextArray(values)))
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeMaxTier(value) {
  const maxTier = Number(value)
  if (!Number.isFinite(maxTier) || maxTier < 1) {
    throw new Error('intelligence action router requires maxTier >= 1.')
  }
  return Math.floor(maxTier)
}

function clampLimit(value, fallback = 20, max = 100) {
  return Math.min(max, Math.max(1, Number(value) || fallback))
}

function normalizeRunType(value) {
  const normalized = String(value || 'route_proposal').trim()
  if (!['route_proposal', 'router_proof', 'approval', 'application'].includes(normalized)) {
    throw new Error(`Invalid action router run type: ${normalized || '<blank>'}`)
  }
  return normalized
}

function normalizeRouteType(value) {
  const normalized = String(value || 'owner_action').trim()
  if (!ROUTE_TYPES.has(normalized)) throw new Error(`Invalid action route type: ${normalized || '<blank>'}`)
  return normalized
}

function normalizeRouteScopeFilter(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (!['strategy', 'operational'].includes(normalized)) {
    throw new Error(`Invalid action route scope filter: ${normalized}`)
  }
  return normalized
}

function coerceMinTier(value, fallback = 1) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function normalizeOwnerConfidence(value) {
  const normalized = String(value || 'needs_owner').trim()
  return ['high', 'medium', 'low', 'needs_owner'].includes(normalized) ? normalized : 'needs_owner'
}

function shorten(value, limit = 700) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

function mapRunRow(row = {}) {
  return {
    runId: row.run_id ?? row.runId,
    runType: row.run_type ?? row.runType,
    status: row.status,
    requestedBy: row.requested_by ?? row.requestedBy,
    synthesizedItemCount: Number(row.synthesized_item_count ?? row.synthesizedItemCount ?? 0),
    routeCount: Number(row.route_count ?? row.routeCount ?? 0),
    approvedCount: Number(row.approved_count ?? row.approvedCount ?? 0),
    appliedCount: Number(row.applied_count ?? row.appliedCount ?? 0),
    maxTier: Number(row.max_tier ?? row.maxTier ?? 1),
    sourceIds: row.source_ids ?? row.sourceIds ?? [],
    metadata: parseJsonObject(row.metadata),
    startedAt: row.started_at ?? row.startedAt,
    finishedAt: row.finished_at ?? row.finishedAt,
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapRouteRow(row = {}) {
  return {
    routeId: row.route_id ?? row.routeId,
    runId: row.run_id ?? row.runId,
    synthesizedItemId: row.synthesized_item_id ?? row.synthesizedItemId,
    synthesizedItemNaturalKey: row.synthesized_item_natural_key ?? row.synthesizedItemNaturalKey,
    routeType: row.route_type ?? row.routeType,
    destinationTable: row.destination_table ?? row.destinationTable,
    destinationRecordId: row.destination_record_id ?? row.destinationRecordId ?? null,
    approvalStatus: row.approval_status ?? row.approvalStatus,
    approvalRequired: Boolean(row.approval_required ?? row.approvalRequired),
    owner: row.owner,
    ownerConfidence: row.owner_confidence ?? row.ownerConfidence,
    routingReason: row.routing_reason ?? row.routingReason,
    sourceIds: row.source_ids ?? row.sourceIds ?? [],
    factRefs: row.fact_refs ?? row.factRefs ?? [],
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    evidenceChunkRefs: row.evidence_chunk_refs ?? row.evidenceChunkRefs ?? [],
    atomRefs: row.atom_refs ?? row.atomRefs ?? [],
    candidateKeys: row.candidate_keys ?? row.candidateKeys ?? [],
    artifactIds: row.artifact_ids ?? row.artifactIds ?? [],
    sensitivity: row.sensitivity,
    minTier: Number(row.min_tier ?? row.minTier ?? 1),
    proposedPayload: parseJsonObject(row.proposed_payload ?? row.proposedPayload),
    appliedPayload: parseJsonObject(row.applied_payload ?? row.appliedPayload),
    metadata: parseJsonObject(row.metadata),
    routedAt: row.routed_at ?? row.routedAt,
    approvedAt: row.approved_at ?? row.approvedAt ?? null,
    approvedBy: row.approved_by ?? row.approvedBy ?? null,
    appliedAt: row.applied_at ?? row.appliedAt ?? null,
    appliedBy: row.applied_by ?? row.appliedBy ?? null,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapSynthesizedItemRow(row = {}) {
  return {
    synthesizedItemId: row.synthesized_item_id,
    naturalKey: row.natural_key || row.synthesized_item_id,
    itemType: row.item_type,
    status: row.status,
    title: row.title || '',
    summary: row.summary || '',
    suggestedOwner: row.suggested_owner || null,
    ownerConfidence: row.owner_confidence || 'needs_owner',
    ownerResolutionReason: row.owner_resolution_reason || null,
    ownerAction: row.owner_action || '',
    sourceIds: row.source_ids || [],
    factRefs: row.fact_refs || [],
    evidenceRefs: row.evidence_refs || [],
    evidenceChunkRefs: row.evidence_chunk_refs || [],
    atomRefs: row.atom_refs || [],
    candidateKeys: row.candidate_keys || [],
    artifactIds: row.artifact_ids || [],
    sensitivity: row.sensitivity || 'neutral',
    minTier: coerceMinTier(row.min_tier, 1),
    attributes: parseJsonObject(row.attributes),
    metadata: parseJsonObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function routeTypeForItem(item = {}) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.ownerAction || ''}`.toLowerCase()
  if (item.status === 'needs_owner' || !item.suggestedOwner || item.ownerConfidence === 'needs_owner') {
    return 'needs_owner_decision'
  }
  if (/\b(ignore|ignored|skip|not current|old system)\b/.test(text)) return 'ignore'
  if (/\b(snooze|later|not now|defer)\b/.test(text)) return 'snooze'
  if (/\b(contradict|contradiction|conflict|mismatch|does not align|drift)\b/.test(text)) return 'contradiction'
  if (/\b(foundational system|foundation-plus-hubs|architecture|locked doctrine|decision|decide|approval|approve|commit)\b/.test(text)) return 'decision'
  if (/\b(source map|missing|unknown|unclear|needs clarification|need a clean|what do we need)\b/.test(text)) return 'open_question'
  if (item.itemType === 'source_health_issue') return 'open_question'
  if (item.itemType === 'action_candidate') return 'backlog_task'
  return 'owner_action'
}

function decisionCategoryForRoute(routeType, item = {}) {
  const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase()
  if (text.includes('foundation') || text.includes('system') || text.includes('architecture')) return 'system'
  if (text.includes('strategy')) return 'strategy'
  if (text.includes('agent') || text.includes('people')) return 'people'
  return routeType === 'decision' ? 'execution' : 'system'
}

function priorityForItem(item = {}) {
  const severity = String(item.attributes?.severity || '').trim()
  if (severity === 'high') return 'P0'
  if (severity === 'watch') return 'P1'
  return 'P2'
}

function evidenceNotesForRoute(routeId, item = {}) {
  return [
    `Action route: ${routeId}`,
    `Synthesized item: ${item.synthesizedItemId}`,
    `Facts: ${uniqueText(item.factRefs).join(', ') || 'none'}`,
    `Evidence atoms: ${uniqueText(item.evidenceRefs).join(', ') || 'none'}`,
    `Evidence chunks: ${uniqueText(item.evidenceChunkRefs).join(', ') || 'none'}`,
  ].join('\n')
}

function proposedPayloadForRoute({ routeId, routeType, item, owner }) {
  const sourceRef = `ACTION-ROUTER-001 route ${routeId} from synthesized item ${item.synthesizedItemId}`
  const evidenceNotes = evidenceNotesForRoute(routeId, item)
  if (routeType === 'decision') {
    return {
      category: decisionCategoryForRoute(routeType, item),
      title: shorten(item.title, 180),
      summary: shorten(item.summary || item.title, 1200),
      rationale: 'Proposed by Action Router from governed synthesis. Human approval is required before locking.',
      sourceRef,
      decisionOwner: owner,
      confirmedBy: null,
      contextRef: item.synthesizedItemId,
      evidenceNotes,
    }
  }
  if (['backlog_task', 'owner_action'].includes(routeType)) {
    return {
      idPrefix: 'ACTION',
      title: shorten(item.title, 180),
      scope: 'foundation',
      lane: 'scoped',
      priority: priorityForItem(item),
      rank: null,
      source: 'ACTION-ROUTER-001',
      summary: shorten(item.summary || item.title, 1200),
      whyItMatters: 'Routed from source-backed synthesized intelligence with fact, atom, and retrieval-chunk provenance.',
      nextAction: shorten(item.ownerAction || `Review and act on this routed item as ${owner}.`, 700),
      statusNote: evidenceNotes,
      owner,
    }
  }
  if (['open_question', 'contradiction', 'needs_owner_decision'].includes(routeType)) {
    return {
      title: shorten(
        routeType === 'needs_owner_decision'
          ? `Assign owner: ${item.title}`
          : item.title,
        180
      ),
      summary: shorten(
        routeType === 'contradiction'
          ? `${item.summary}\n\nContradiction route requires a human to resolve the tension before downstream action.`
          : routeType === 'needs_owner_decision'
            ? `${item.summary}\n\nNo clear owner was resolved by synthesis. Choose an owner before routing this item into work.`
            : item.summary,
        1200
      ),
      owner,
      sourceRef,
      evidenceNotes,
    }
  }
  if (['ignore', 'snooze'].includes(routeType)) {
    return {
      synthesizedItemId: item.synthesizedItemId,
      routingStatus: routeType === 'ignore' ? 'ignored' : 'snoozed',
      reason: routeType === 'ignore'
        ? 'Item appears explicitly marked as not current or not actionable.'
        : 'Item should be deferred until a later review window.',
      evidenceNotes,
    }
  }
  return {}
}

function buildRouteForItem(item = {}) {
  const routeType = routeTypeForItem(item)
  const destinationTable = ROUTE_DESTINATIONS[routeType]
  const owner = routeType === 'needs_owner_decision'
    ? 'needs-owner-decision'
    : String(item.suggestedOwner || '').trim()
  if (!owner) throw new Error(`Action route requires explicit owner or owner-decision queue: ${item.synthesizedItemId}`)
  const routeId = stableId('action-route', `${item.synthesizedItemId}|${routeType}|${destinationTable}|${owner}`)
  const routingReason = routeType === 'needs_owner_decision'
    ? 'Synthesized item did not have a clear owner and must go through owner-decision queue.'
    : `Route type ${routeType} selected from synthesized item type ${item.itemType}.`
  return {
    routeId,
    routeType,
    destinationTable,
    owner,
    ownerConfidence: normalizeOwnerConfidence(item.ownerConfidence),
    routingReason,
    proposedPayload: proposedPayloadForRoute({ routeId, routeType, item, owner }),
    strategyHubEligible: item.metadata?.strategyHubEligible === true || item.attributes?.strategyHubEligible === true,
    reviewSurface: item.metadata?.reviewSurface || item.metadata?.strategySurface || item.attributes?.routeScope || 'operations',
  }
}

function synthesizedItemFromRouteRow(row = {}) {
  const route = mapRouteRow(row)
  const payload = route.proposedPayload || {}
  return {
    synthesizedItemId: route.synthesizedItemId,
    naturalKey: route.synthesizedItemNaturalKey || route.synthesizedItemId,
    itemType: route.metadata?.synthesizedItemType || route.routeType,
    status: route.metadata?.synthesizedItemStatus || 'ready_for_action_router',
    title: payload.title || payload.reason || route.routingReason || route.synthesizedItemId,
    summary: payload.summary || payload.reason || route.routingReason || '',
    suggestedOwner: route.owner,
    ownerConfidence: route.ownerConfidence,
    ownerAction: payload.nextAction || payload.reason || route.routingReason || '',
    sourceIds: route.sourceIds,
    factRefs: route.factRefs,
    evidenceRefs: route.evidenceRefs,
    evidenceChunkRefs: route.evidenceChunkRefs,
    atomRefs: route.atomRefs,
    candidateKeys: route.candidateKeys,
    artifactIds: route.artifactIds,
    sensitivity: route.sensitivity,
    minTier: route.minTier,
    attributes: parseJsonObject(route.metadata?.synthesizedItemAttributes),
    metadata: route.metadata,
  }
}

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const allowedTables = new Set(['backlog_items', 'decisions', 'open_questions'])
  if (!allowedTables.has(tableName)) throw new Error(`Unsupported routed destination table: ${tableName}`)
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid routed destination ID prefix is required.')
  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )
  const nextNumber = result.rows.reduce((max, row) => Math.max(max, getNumericSuffix(row.id, normalizedPrefix)), 0) + 1
  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

export function createIntelligenceActionRouterStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
}) {
  async function recordRouterRunWithClient(client, input = {}) {
    const runId = String(input.runId || input.run_id || `action-router-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`).trim()
    const runType = normalizeRunType(input.runType || input.run_type)
    const status = String(input.status || 'succeeded').trim()
    if (!['succeeded', 'failed'].includes(status)) throw new Error(`Invalid action router run status: ${status}`)
    const maxTier = normalizeMaxTier(input.maxTier ?? input.max_tier ?? 1)
    const result = await client.query(
      `
        INSERT INTO intelligence_action_router_runs (
          run_id, run_type, status, requested_by, synthesized_item_count,
          route_count, approved_count, applied_count, max_tier, source_ids,
          metadata, started_at, finished_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11::jsonb,$12,$13)
        ON CONFLICT (run_id) DO UPDATE SET
          run_type = EXCLUDED.run_type,
          status = EXCLUDED.status,
          requested_by = EXCLUDED.requested_by,
          synthesized_item_count = EXCLUDED.synthesized_item_count,
          route_count = EXCLUDED.route_count,
          approved_count = EXCLUDED.approved_count,
          applied_count = EXCLUDED.applied_count,
          max_tier = EXCLUDED.max_tier,
          source_ids = EXCLUDED.source_ids,
          metadata = EXCLUDED.metadata,
          started_at = EXCLUDED.started_at,
          finished_at = EXCLUDED.finished_at
        RETURNING *
      `,
      [
        runId,
        runType,
        status,
        input.requestedBy || input.requested_by || 'system',
        Number(input.synthesizedItemCount ?? input.synthesized_item_count ?? 0),
        Number(input.routeCount ?? input.route_count ?? 0),
        Number(input.approvedCount ?? input.approved_count ?? 0),
        Number(input.appliedCount ?? input.applied_count ?? 0),
        maxTier,
        uniqueText(input.sourceIds || input.source_ids),
        JSON.stringify(input.metadata || {}),
        input.startedAt || input.started_at || new Date().toISOString(),
        input.finishedAt || input.finished_at || new Date().toISOString(),
      ]
    )
    return mapRunRow(result.rows[0])
  }

  async function selectRouteableSynthesizedItems(client, { maxTier, limit, routeScope = null }) {
    const normalizedRouteScope = normalizeRouteScopeFilter(routeScope)
    const result = await client.query(
      `
        SELECT *
        FROM intelligence_synthesized_items item
        WHERE item.status != 'archived'
          AND item.routing_status = 'unrouted'
          AND item.min_tier <= $1
          AND item.status IN ('ready_for_action_router', 'needs_owner')
          AND cardinality(item.fact_refs) > 0
          AND cardinality(item.evidence_refs) > 0
          AND cardinality(item.evidence_chunk_refs) > 0
          AND COALESCE(item.attributes->>'synthesisQuality', '') = 'clustered'
          AND COALESCE(item.attributes->>'routeScope', item.metadata->>'routeScope') IN ('strategy', 'operational')
          AND ($3::text IS NULL OR COALESCE(item.attributes->>'routeScope', item.metadata->>'routeScope') = $3)
          AND COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true'
          AND NOT EXISTS (
            SELECT 1
            FROM intelligence_action_routes route
            WHERE route.synthesized_item_id = item.synthesized_item_id
              AND route.approval_status IN ('pending', 'approved', 'applied')
          )
        ORDER BY item.review_order ASC, item.updated_at DESC
        LIMIT $2
      `,
      [maxTier, limit, normalizedRouteScope]
    )
    return result.rows.map(mapSynthesizedItemRow)
  }

  async function upsertActionRouteWithClient(client, { runId, item, route, actor }) {
    const result = await client.query(
      `
        INSERT INTO intelligence_action_routes (
          route_id, run_id, synthesized_item_id, synthesized_item_natural_key,
          route_type, destination_table, approval_status, approval_required,
          owner, owner_confidence, routing_reason, source_ids, fact_refs,
          evidence_refs, evidence_chunk_refs, atom_refs, candidate_keys,
          artifact_ids, sensitivity, min_tier, proposed_payload, metadata,
          routed_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,'pending',TRUE,
          $7,$8,$9,$10::text[],$11::text[],
          $12::text[],$13::text[],$14::text[],$15::text[],
          $16::text[],$17,$18,$19::jsonb,$20::jsonb,
          NOW(),NOW()
        )
        ON CONFLICT (route_id) DO UPDATE SET
          run_id = CASE
            WHEN intelligence_action_routes.approval_status = 'pending' THEN EXCLUDED.run_id
            ELSE intelligence_action_routes.run_id
          END,
          proposed_payload = CASE
            WHEN intelligence_action_routes.approval_status = 'pending' THEN EXCLUDED.proposed_payload
            ELSE intelligence_action_routes.proposed_payload
          END,
          metadata = intelligence_action_routes.metadata || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *
      `,
      [
        route.routeId,
        runId,
        item.synthesizedItemId,
        item.naturalKey,
        route.routeType,
        route.destinationTable,
        route.owner,
        route.ownerConfidence,
        route.routingReason,
        uniqueText(item.sourceIds),
        uniqueText(item.factRefs),
        uniqueText(item.evidenceRefs),
        uniqueText(item.evidenceChunkRefs),
        uniqueText(item.atomRefs),
        uniqueText(item.candidateKeys),
        uniqueText(item.artifactIds),
        item.sensitivity || 'neutral',
        item.minTier,
        JSON.stringify(route.proposedPayload),
        JSON.stringify({
          proposedBy: actor,
          synthesizedItemType: item.itemType,
          synthesizedItemStatus: item.status,
          synthesizedItemAttributes: item.attributes || {},
          routeScope: item.attributes?.routeScope || item.metadata?.routeScope || 'operational',
          strategyHubEligible: route.strategyHubEligible === true,
          reviewSurface: route.strategyHubEligible ? 'strategy' : route.reviewSurface,
          strategySurface: route.strategyHubEligible ? 'strategy' : null,
          ownerResolutionReason: item.ownerResolutionReason,
        }),
      ]
    )
    return mapRouteRow(result.rows[0])
  }

  async function proposeActionRoutes(input = {}, actor = 'system') {
    const startedAt = new Date().toISOString()
    const runId = String(input.runId || input.run_id || `action-router-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`).trim()
    const runType = normalizeRunType(input.runType || input.run_type || 'route_proposal')
    const maxTier = normalizeMaxTier(input.maxTier ?? input.max_tier ?? 1)
    const limit = clampLimit(input.limit || input.routeLimit || input.route_limit, 20, 100)
    const routeScope = normalizeRouteScopeFilter(input.routeScope || input.route_scope)

    return withFoundationTransaction(async client => {
      const items = await selectRouteableSynthesizedItems(client, { maxTier, limit, routeScope })
      await recordRouterRunWithClient(client, {
        runId,
        runType,
        status: 'succeeded',
        requestedBy: input.requestedBy || actor,
        synthesizedItemCount: items.length,
        routeCount: 0,
        maxTier,
        sourceIds: [],
        metadata: {
          ...(input.metadata || {}),
          approvalGate: 'human_required_before_destination_write',
          routeCreation: 'started',
          routeScopeFilter: routeScope,
        },
        startedAt,
        finishedAt: new Date().toISOString(),
      })
      const routes = []
      for (const item of items) {
        const route = buildRouteForItem(item)
        routes.push(await upsertActionRouteWithClient(client, { runId, item, route, actor }))
      }

      const sourceIds = uniqueText(routes.flatMap(route => route.sourceIds))
      const run = await recordRouterRunWithClient(client, {
        runId,
        runType,
        status: 'succeeded',
        requestedBy: input.requestedBy || actor,
        synthesizedItemCount: items.length,
        routeCount: routes.length,
        maxTier,
        sourceIds,
        metadata: {
          ...(input.metadata || {}),
          approvalGate: 'human_required_before_destination_write',
          routeScopeFilter: routeScope,
          destinationTables: uniqueText(routes.map(route => route.destinationTable)),
          routeTypes: uniqueText(routes.map(route => route.routeType)),
        },
        startedAt,
        finishedAt: new Date().toISOString(),
      })

      await insertChangeEvent(client, {
        eventType: 'intelligence_action_router_run_recorded',
        entityTable: 'intelligence_action_router_runs',
        entityId: runId,
        actor,
        summary: `Recorded intelligence action router run ${runId}`,
        metadata: {
          runType,
          routeCount: routes.length,
          approvalGate: 'human_required_before_destination_write',
        },
      })

      for (const route of routes) {
        await insertChangeEvent(client, {
          eventType: 'intelligence_action_route_proposed',
          entityTable: 'intelligence_action_routes',
          entityId: route.routeId,
          actor,
          summary: `Proposed ${route.routeType} route for ${route.synthesizedItemId}`,
          metadata: {
            routeType: route.routeType,
            destinationTable: route.destinationTable,
            owner: route.owner,
            synthesizedItemId: route.synthesizedItemId,
          },
        })
      }

      return { run, routes, selectedItems: items }
    })
  }

  async function approveActionRoute(routeId, input = {}, actor = 'system') {
    return withFoundationTransaction(async client => {
      const routeResult = await client.query(
        `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
        [routeId]
      )
      const route = routeResult.rows[0]
      if (!route) throw new Error(`Action route not found: ${routeId}`)
      if (route.approval_status !== 'pending') {
        throw new Error(`Action route must be pending before approval: ${routeId}`)
      }

      const approvedBy = String(input.approvedBy || input.approved_by || actor).trim()
      if (!approvedBy || approvedBy === 'system') throw new Error('Action route approval requires an explicit human approver.')

      const updatedResult = await client.query(
        `
          UPDATE intelligence_action_routes
          SET approval_status = 'approved',
              approved_at = NOW(),
              approved_by = $2,
              metadata = metadata || $3::jsonb,
              updated_at = NOW()
          WHERE route_id = $1
          RETURNING *
        `,
        [
          routeId,
          approvedBy,
          JSON.stringify({
            approvalNote: input.approvalNote || input.approval_note || '',
            approvedByActor: actor,
          }),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_action_route_approved',
        entityTable: 'intelligence_action_routes',
        entityId: routeId,
        actor: approvedBy,
        summary: `Approved action route ${routeId}`,
        metadata: {
          routeType: route.route_type,
          destinationTable: route.destination_table,
          synthesizedItemId: route.synthesized_item_id,
        },
      })

      return mapRouteRow(updatedResult.rows[0])
    })
  }

  async function rejectActionRoute(routeId, input = {}, actor = 'system') {
    return withFoundationTransaction(async client => {
      const routeResult = await client.query(
        `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
        [routeId]
      )
      const route = routeResult.rows[0]
      if (!route) throw new Error(`Action route not found: ${routeId}`)
      if (!['pending', 'approved'].includes(route.approval_status)) {
        throw new Error(`Action route must be pending or approved before rejection: ${routeId}`)
      }

      const rejectedBy = String(input.rejectedBy || input.rejected_by || actor).trim()
      if (!rejectedBy || rejectedBy === 'system') throw new Error('Action route rejection requires an explicit human reviewer.')

      const updatedResult = await client.query(
        `
          UPDATE intelligence_action_routes
          SET approval_status = 'rejected',
              metadata = metadata || $2::jsonb,
              updated_at = NOW()
          WHERE route_id = $1
          RETURNING *
        `,
        [
          routeId,
          JSON.stringify({
            rejectionNote: input.rejectionNote || input.rejection_note || input.note || '',
            rejectedByActor: actor,
            rejectedAt: new Date().toISOString(),
          }),
        ]
      )

      await client.query(
        `
          UPDATE intelligence_synthesized_items
          SET routing_status = 'ignored',
              metadata = metadata || $2::jsonb,
              updated_at = NOW()
          WHERE synthesized_item_id = $1
        `,
        [
          route.synthesized_item_id,
          JSON.stringify({
            actionRouteId: routeId,
            routingStatusReason: 'rejected_by_human_review',
            rejectedRouteAt: new Date().toISOString(),
          }),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_action_route_rejected',
        entityTable: 'intelligence_action_routes',
        entityId: routeId,
        actor: rejectedBy,
        summary: `Rejected action route ${routeId}`,
        metadata: {
          routeType: route.route_type,
          destinationTable: route.destination_table,
          synthesizedItemId: route.synthesized_item_id,
        },
      })

      return mapRouteRow(updatedResult.rows[0])
    })
  }

  async function rerouteActionRoute(routeId, input = {}, actor = 'system') {
    return withFoundationTransaction(async client => {
      const routeResult = await client.query(
        `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
        [routeId]
      )
      const route = routeResult.rows[0]
      if (!route) throw new Error(`Action route not found: ${routeId}`)
      if (route.approval_status !== 'pending') {
        throw new Error(`Action route must be pending before reroute: ${routeId}`)
      }

      const routeType = normalizeRouteType(input.routeType || input.route_type)
      const destinationTable = ROUTE_DESTINATIONS[routeType]
      const owner = routeType === 'needs_owner_decision'
        ? 'needs-owner-decision'
        : String(input.owner || route.owner || '').trim()
      if (!owner) throw new Error(`Action route reroute requires explicit owner: ${routeId}`)
      const ownerConfidence = routeType === 'needs_owner_decision'
        ? 'needs_owner'
        : normalizeOwnerConfidence(input.ownerConfidence || input.owner_confidence || route.owner_confidence)
      const item = {
        ...synthesizedItemFromRouteRow(route),
        suggestedOwner: owner,
        ownerConfidence,
      }
      const routingReason = String(input.routingReason || input.routing_reason || input.note || '').trim() ||
        `Human review changed route from ${route.route_type} to ${routeType}.`
      const proposedPayload = proposedPayloadForRoute({ routeId, routeType, item, owner })

      const updatedResult = await client.query(
        `
          UPDATE intelligence_action_routes
          SET route_type = $2,
              destination_table = $3,
              owner = $4,
              owner_confidence = $5,
              routing_reason = $6,
              proposed_payload = $7::jsonb,
              metadata = metadata || $8::jsonb,
              updated_at = NOW()
          WHERE route_id = $1
          RETURNING *
        `,
        [
          routeId,
          routeType,
          destinationTable,
          owner,
          ownerConfidence,
          routingReason,
          JSON.stringify(proposedPayload),
          JSON.stringify({
            reviewAction: 'reroute',
            previousRouteType: route.route_type,
            previousDestinationTable: route.destination_table,
            reroutedByActor: actor,
            reroutedAt: new Date().toISOString(),
          }),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_action_route_rerouted',
        entityTable: 'intelligence_action_routes',
        entityId: routeId,
        actor,
        summary: `Rerouted action route ${routeId} to ${routeType}`,
        metadata: {
          previousRouteType: route.route_type,
          routeType,
          destinationTable,
          synthesizedItemId: route.synthesized_item_id,
        },
      })

      return mapRouteRow(updatedResult.rows[0])
    })
  }

  async function applyApprovedActionRoute(routeId, input = {}, actor = 'system') {
    return withFoundationTransaction(async client => {
      const routeResult = await client.query(
        `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
        [routeId]
      )
      const route = routeResult.rows[0]
      if (!route) throw new Error(`Action route not found: ${routeId}`)
      if (route.approval_status !== 'approved') {
        throw new Error(`Action route must be approved before apply: ${routeId}`)
      }

      const payload = parseJsonObject(route.proposed_payload)
      let destinationRecordId = null
      let appliedPayload = {}

      if (route.destination_table === 'decisions') {
        destinationRecordId = await getNextPrefixedId(client, 'decisions', 'DEC')
        await client.query(
          `
            INSERT INTO decisions (
              id, category, title, status, summary, rationale, source_ref,
              decision_owner, confirmed_by, participant_names, context_ref,
              evidence_notes, classified_at, classified_by, supersedes_ids
            )
            VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
          `,
          [
            destinationRecordId,
            payload.category || 'execution',
            payload.title,
            payload.summary,
            payload.rationale || null,
            payload.sourceRef || null,
            payload.decisionOwner || route.owner,
            payload.confirmedBy || null,
            [],
            payload.contextRef || route.synthesized_item_id,
            payload.evidenceNotes || null,
            actor,
            [],
          ]
        )
        appliedPayload = { decisionId: destinationRecordId }
        await insertChangeEvent(client, {
          eventType: 'decision_proposed',
          entityTable: 'decisions',
          entityId: destinationRecordId,
          actor,
          summary: `Proposed decision ${destinationRecordId}: ${payload.title}`,
          metadata: { actionRouteId: routeId, synthesizedItemId: route.synthesized_item_id },
        })
      } else if (route.destination_table === 'backlog_items') {
        destinationRecordId = await getNextPrefixedId(client, 'backlog_items', payload.idPrefix || 'ACTION')
        await client.query(
          `
            INSERT INTO backlog_items (
              id, title, team, lane, priority, rank, source, summary,
              why_it_matters, next_action, status_note, owner
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          `,
          [
            destinationRecordId,
            payload.title,
            payload.scope || 'foundation',
            payload.lane || 'scoped',
            payload.priority || 'P2',
            payload.rank ?? null,
            payload.source || 'ACTION-ROUTER-001',
            payload.summary || '',
            payload.whyItMatters || '',
            payload.nextAction || '',
            payload.statusNote || '',
            payload.owner || route.owner,
          ]
        )
        appliedPayload = { backlogId: destinationRecordId }
        await insertChangeEvent(client, {
          eventType: 'backlog_created',
          entityTable: 'backlog_items',
          entityId: destinationRecordId,
          actor,
          summary: `Created backlog item ${destinationRecordId}: ${payload.title}`,
          metadata: { actionRouteId: routeId, synthesizedItemId: route.synthesized_item_id },
        })
      } else if (route.destination_table === 'open_questions') {
        destinationRecordId = await getNextPrefixedId(client, 'open_questions', 'Q')
        await client.query(
          `
            INSERT INTO open_questions (id, title, summary, owner, status)
            VALUES ($1,$2,$3,$4,'open')
          `,
          [
            destinationRecordId,
            payload.title,
            payload.summary || '',
            payload.owner || route.owner,
          ]
        )
        appliedPayload = { questionId: destinationRecordId }
        await insertChangeEvent(client, {
          eventType: 'question_created',
          entityTable: 'open_questions',
          entityId: destinationRecordId,
          actor,
          summary: `Opened question ${destinationRecordId}: ${payload.title}`,
          metadata: { actionRouteId: routeId, synthesizedItemId: route.synthesized_item_id },
        })
      } else if (route.destination_table === 'intelligence_synthesized_items') {
        destinationRecordId = route.synthesized_item_id
        await client.query(
          `
            UPDATE intelligence_synthesized_items
            SET routing_status = $2,
                metadata = metadata || $3::jsonb,
                updated_at = NOW()
            WHERE synthesized_item_id = $1
          `,
          [
            route.synthesized_item_id,
            payload.routingStatus === 'snoozed' ? 'snoozed' : 'ignored',
            JSON.stringify({
              actionRouteId: routeId,
              routingReason: payload.reason || route.routing_reason,
            }),
          ]
        )
        appliedPayload = { synthesizedItemId: destinationRecordId, routingStatus: payload.routingStatus || 'ignored' }
      }

      await client.query(
        `
          UPDATE intelligence_synthesized_items
          SET routing_status = CASE
                WHEN $2 = 'ignored' THEN 'ignored'
                WHEN $2 = 'snoozed' THEN 'snoozed'
                ELSE 'routed'
              END,
              updated_at = NOW()
          WHERE synthesized_item_id = $1
        `,
        [route.synthesized_item_id, payload.routingStatus || 'routed']
      )

      const updatedRouteResult = await client.query(
        `
          UPDATE intelligence_action_routes
          SET approval_status = 'applied',
              destination_record_id = $2,
              applied_payload = $3::jsonb,
              applied_at = NOW(),
              applied_by = $4,
              updated_at = NOW()
          WHERE route_id = $1
          RETURNING *
        `,
        [routeId, destinationRecordId, JSON.stringify(appliedPayload), actor]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_action_route_applied',
        entityTable: 'intelligence_action_routes',
        entityId: routeId,
        actor,
        summary: `Applied action route ${routeId}`,
        metadata: {
          destinationTable: route.destination_table,
          destinationRecordId,
          synthesizedItemId: route.synthesized_item_id,
        },
      })

      return mapRouteRow(updatedRouteResult.rows[0])
    })
  }

  async function getActionRoute(routeId) {
    const normalizedRouteId = String(routeId || '').trim()
    if (!normalizedRouteId) throw new Error('Action route id is required.')
    const result = await pool.query(
      `SELECT * FROM intelligence_action_routes WHERE route_id = $1`,
      [normalizedRouteId]
    )
    return result.rows[0] ? mapRouteRow(result.rows[0]) : null
  }

  async function getActionRouterSnapshot({ limit = 20 } = {}) {
    const normalizedLimit = clampLimit(limit, 20, 100)
    const [
      summary,
      latestRun,
      latestProofRun,
      recentRoutes,
      routeTypes,
      destinations,
      referenceIntegrity,
      destinationIntegrity,
      routerVisibility,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_routes,
          COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending_routes,
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved_routes,
          COUNT(*) FILTER (WHERE approval_status = 'applied')::int AS applied_routes,
          COUNT(*) FILTER (
            WHERE COALESCE(metadata->>'strategyHubEligible', 'false') = 'true'
              OR COALESCE(metadata->>'reviewSurface', metadata->>'strategySurface') = 'strategy'
          )::int AS strategy_routes,
          COUNT(*) FILTER (
            WHERE approval_status = 'pending'
              AND (
                COALESCE(metadata->>'strategyHubEligible', 'false') = 'true'
                OR COALESCE(metadata->>'reviewSurface', metadata->>'strategySurface') = 'strategy'
              )
          )::int AS pending_strategy_routes,
          COUNT(*) FILTER (WHERE approval_required = TRUE)::int AS routes_requiring_approval,
          COUNT(*) FILTER (
            WHERE owner IS NOT NULL AND owner <> ''
          )::int AS routes_with_owner,
          COUNT(*) FILTER (
            WHERE cardinality(source_ids) > 0
              AND cardinality(fact_refs) > 0
              AND cardinality(evidence_refs) > 0
              AND cardinality(evidence_chunk_refs) > 0
          )::int AS routes_with_source_provenance,
          COUNT(*) FILTER (WHERE min_tier <= 1)::int AS tier_one_routes,
          COUNT(DISTINCT synthesized_item_id)::int AS distinct_synthesized_items
        FROM intelligence_action_routes
      `),
      pool.query(`
        SELECT *
        FROM intelligence_action_router_runs
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_action_router_runs
        WHERE run_type = 'router_proof'
        ORDER BY created_at DESC
        LIMIT 1
      `),
      pool.query(`
        SELECT *
        FROM intelligence_action_routes
        ORDER BY routed_at DESC, updated_at DESC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT route_type, COUNT(*)::int AS count
        FROM intelligence_action_routes
        GROUP BY route_type
        ORDER BY route_type
      `),
      pool.query(`
        SELECT destination_table, COUNT(*)::int AS count
        FROM intelligence_action_routes
        GROUP BY destination_table
        ORDER BY destination_table
      `),
      pool.query(`
        WITH guarded_routes AS (
          SELECT *
          FROM intelligence_action_routes
          WHERE approval_status IN ('pending', 'approved', 'applied')
        ),
        fact_route_status AS (
          SELECT route.route_id,
                 COALESCE(bool_and(fact.fact_id IS NOT NULL AND fact.status = 'active'), FALSE) AS refs_active
          FROM guarded_routes route
          LEFT JOIN LATERAL unnest(route.fact_refs) ref(fact_id) ON TRUE
          LEFT JOIN intelligence_synthesis_facts fact ON fact.fact_id = ref.fact_id
          GROUP BY route.route_id
        ),
        evidence_route_status AS (
          SELECT route.route_id,
                 COALESCE(bool_and(atom.atom_id IS NOT NULL AND atom.status NOT IN ('rejected', 'archived', 'superseded')), FALSE) AS refs_active
          FROM guarded_routes route
          LEFT JOIN LATERAL unnest(route.evidence_refs) ref(atom_id) ON TRUE
          LEFT JOIN intelligence_atoms atom ON atom.atom_id = ref.atom_id
          GROUP BY route.route_id
        ),
        chunk_route_status AS (
          SELECT route.route_id,
                 COALESCE(bool_and(chunk.chunk_id IS NOT NULL AND chunk.status = 'active'), FALSE) AS refs_active
          FROM guarded_routes route
          LEFT JOIN LATERAL unnest(route.evidence_chunk_refs) ref(chunk_id) ON TRUE
          LEFT JOIN intelligence_retrieval_chunks chunk ON chunk.chunk_id = ref.chunk_id
          GROUP BY route.route_id
        )
        SELECT
          COUNT(*)::int AS guarded_routes,
          COUNT(*) FILTER (
            WHERE item.synthesized_item_id IS NOT NULL
              AND item.status != 'archived'
          )::int AS routes_with_active_synthesized_items,
          COUNT(*) FILTER (WHERE fact_status.refs_active)::int AS routes_with_active_fact_refs,
          COUNT(*) FILTER (WHERE evidence_status.refs_active)::int AS routes_with_active_evidence_refs,
          COUNT(*) FILTER (WHERE chunk_status.refs_active)::int AS routes_with_active_evidence_chunk_refs
        FROM guarded_routes route
        LEFT JOIN intelligence_synthesized_items item
          ON item.synthesized_item_id = route.synthesized_item_id
        LEFT JOIN fact_route_status fact_status ON fact_status.route_id = route.route_id
        LEFT JOIN evidence_route_status evidence_status ON evidence_status.route_id = route.route_id
        LEFT JOIN chunk_route_status chunk_status ON chunk_status.route_id = route.route_id
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE approval_status = 'applied')::int AS applied_routes_checked,
          COUNT(*) FILTER (
            WHERE approval_status = 'applied'
              AND destination_record_id IS NOT NULL
              AND (
                (destination_table = 'decisions' AND EXISTS (
                  SELECT 1 FROM decisions record WHERE record.id = intelligence_action_routes.destination_record_id
                ))
                OR (destination_table = 'backlog_items' AND EXISTS (
                  SELECT 1 FROM backlog_items record WHERE record.id = intelligence_action_routes.destination_record_id
                ))
                OR (destination_table = 'open_questions' AND EXISTS (
                  SELECT 1 FROM open_questions record WHERE record.id = intelligence_action_routes.destination_record_id
                ))
                OR (destination_table = 'intelligence_synthesized_items' AND EXISTS (
                  SELECT 1 FROM intelligence_synthesized_items record WHERE record.synthesized_item_id = intelligence_action_routes.destination_record_id
                ))
              )
          )::int AS applied_routes_with_destination_record
        FROM intelligence_action_routes
      `),
      pool.query(`
        WITH expected_clustered AS (
          SELECT item.*
          FROM intelligence_synthesized_items item
          WHERE item.status != 'archived'
            AND item.routing_status = 'unrouted'
            AND item.min_tier <= 1
            AND item.status IN ('ready_for_action_router', 'needs_owner')
            AND cardinality(item.fact_refs) > 0
            AND cardinality(item.evidence_refs) > 0
            AND cardinality(item.evidence_chunk_refs) > 0
            AND COALESCE(item.attributes->>'synthesisQuality', '') = 'clustered'
            AND COALESCE(item.attributes->>'routeScope', item.metadata->>'routeScope') IN ('strategy', 'operational')
            AND COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true'
            AND NOT EXISTS (
              SELECT 1
              FROM intelligence_action_routes route
              WHERE route.synthesized_item_id = item.synthesized_item_id
                AND route.approval_status IN ('pending', 'approved', 'applied')
            )
        ),
        visible_to_router AS (
          SELECT item.*
          FROM intelligence_synthesized_items item
          WHERE item.status != 'archived'
            AND item.routing_status = 'unrouted'
            AND item.min_tier <= 1
            AND item.status IN ('ready_for_action_router', 'needs_owner')
            AND cardinality(item.fact_refs) > 0
            AND cardinality(item.evidence_refs) > 0
            AND cardinality(item.evidence_chunk_refs) > 0
            AND COALESCE(item.attributes->>'synthesisQuality', '') = 'clustered'
            AND COALESCE(item.attributes->>'routeScope', item.metadata->>'routeScope') IN ('strategy', 'operational')
            AND COALESCE(item.attributes->>'legacySynthesisProtected', item.metadata->>'legacySynthesisProtected', 'false') != 'true'
            AND NOT EXISTS (
              SELECT 1
              FROM intelligence_action_routes route
              WHERE route.synthesized_item_id = item.synthesized_item_id
                AND route.approval_status IN ('pending', 'approved', 'applied')
            )
        )
        SELECT
          (SELECT COUNT(*) FROM expected_clustered)::int AS active_clustered_items,
          (SELECT COUNT(*) FROM visible_to_router)::int AS items_visible_to_router,
          (SELECT COUNT(*) FROM visible_to_router WHERE COALESCE(attributes->>'routeScope', metadata->>'routeScope') = 'strategy')::int AS strategy_items_visible_to_router,
          (SELECT COUNT(*) FROM visible_to_router WHERE COALESCE(attributes->>'synthesisQuality', '') != 'clustered')::int AS unclustered_items_visible_to_router,
          (SELECT COUNT(*) FROM visible_to_router WHERE COALESCE(attributes->>'legacySynthesisProtected', metadata->>'legacySynthesisProtected', 'false') = 'true')::int AS legacy_protected_items_visible_to_router
      `),
    ])
    const routerVisibilityRow = routerVisibility.rows[0] || {}

    return {
      generatedAt: new Date().toISOString(),
      totalRoutes: Number(summary.rows[0]?.total_routes || 0),
      pendingRoutes: Number(summary.rows[0]?.pending_routes || 0),
      approvedRoutes: Number(summary.rows[0]?.approved_routes || 0),
      appliedRoutes: Number(summary.rows[0]?.applied_routes || 0),
      strategyRoutes: Number(summary.rows[0]?.strategy_routes || 0),
      pendingStrategyRoutes: Number(summary.rows[0]?.pending_strategy_routes || 0),
      routesRequiringApproval: Number(summary.rows[0]?.routes_requiring_approval || 0),
      routesWithOwner: Number(summary.rows[0]?.routes_with_owner || 0),
      routesWithSourceProvenance: Number(summary.rows[0]?.routes_with_source_provenance || 0),
      tierOneRoutes: Number(summary.rows[0]?.tier_one_routes || 0),
      distinctSynthesizedItems: Number(summary.rows[0]?.distinct_synthesized_items || 0),
      latestRun: latestRun.rows[0] ? mapRunRow(latestRun.rows[0]) : null,
      latestProofRun: latestProofRun.rows[0] ? mapRunRow(latestProofRun.rows[0]) : null,
      guardedRoutes: Number(referenceIntegrity.rows[0]?.guarded_routes || 0),
      routesWithActiveSynthesizedItems: Number(referenceIntegrity.rows[0]?.routes_with_active_synthesized_items || 0),
      routesWithActiveFactRefs: Number(referenceIntegrity.rows[0]?.routes_with_active_fact_refs || 0),
      routesWithActiveEvidenceRefs: Number(referenceIntegrity.rows[0]?.routes_with_active_evidence_refs || 0),
      routesWithActiveEvidenceChunkRefs: Number(referenceIntegrity.rows[0]?.routes_with_active_evidence_chunk_refs || 0),
      appliedRoutesChecked: Number(destinationIntegrity.rows[0]?.applied_routes_checked || 0),
      appliedRoutesWithDestinationRecord: Number(destinationIntegrity.rows[0]?.applied_routes_with_destination_record || 0),
      activeClusteredItems: Number(routerVisibilityRow.active_clustered_items || 0),
      itemsVisibleToRouter: Number(routerVisibilityRow.items_visible_to_router || 0),
      strategyItemsVisibleToRouter: Number(routerVisibilityRow.strategy_items_visible_to_router || 0),
      unclusteredItemsVisibleToRouter: Number(routerVisibilityRow.unclustered_items_visible_to_router || 0),
      legacyProtectedItemsVisibleToRouter: Number(routerVisibilityRow.legacy_protected_items_visible_to_router || 0),
      recentRoutes: recentRoutes.rows.map(mapRouteRow),
      routesByType: routeTypes.rows.map(row => ({ routeType: row.route_type, count: Number(row.count || 0) })),
      routesByDestination: destinations.rows.map(row => ({ destinationTable: row.destination_table, count: Number(row.count || 0) })),
    }
  }

  return {
    approveActionRoute,
    applyApprovedActionRoute,
    getActionRoute,
    getActionRouterSnapshot,
    proposeActionRoutes,
    rejectActionRoute,
    rerouteActionRoute,
  }
}
