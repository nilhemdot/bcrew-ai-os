import { createHash, randomUUID } from 'node:crypto'
import { classifyVerificationGateForFiles } from './process-verify-gate-tiering.js'

export const FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY = 'foundation-control-backlog-compression-v1'
export const FOUNDATION_CONTROL_COMPRESSION_SPRINT_ID = 'foundation-control-backlog-compression-2026-05-13'
export const FOUNDATION_CONTROL_COMPRESSION_SCRIPT_PATH = 'scripts/process-foundation-control-compression-check.mjs'
export const FOUNDATION_CONTROL_COMPRESSION_PLAN_PATH = 'docs/process/foundation-control-backlog-compression-2026-05-13-plan.md'
export const FOUNDATION_CONTROL_COMPRESSION_EXECUTIVE_SUMMARY = 'Foundation Control + Backlog Compression is complete for v1: eight proposal-only control cards are done, and the next move is sprint review/rollover with Steve.'
export const FOUNDATION_CONTROL_COMPRESSION_NEXT_ACTION = 'Sprint review/rollover with Steve: choose the next Foundation sprint from the advisor options; do not open the next sprint automatically.'

export const FOUNDATION_CONTROL_COMPRESSION_EXIT_CRITERIA = [
  'All eight Foundation control compression cards are Done This Sprint and live backlog lane done.',
  'Each card has doctrine, Plan Critic pass evidence, approval file, and closeout ownership under foundation-control-backlog-compression-v1.',
  'Feedback capture, feedback triage, backlog monitor, sprint advisor, flow map, done velocity, acknowledgement states, and incremental verifier planning are proposal-only or read-only as designed.',
  'Focused proof, backlog hygiene, full Foundation verifier, and the Foundation ship gate pass after the dashboard and worker serve the shipping commit.',
  'No extraction, paid-source auth, Reply/Watching Loop, Directors, hubs, Drive permission mutation, request-access email, or autonomous dev is pulled into this sprint.',
  'After closeout, stop at sprint review/rollover for Steve and Codex to choose the next sprint intentionally.',
]

export const FOUNDATION_CONTROL_COMPRESSION_CARD_IDS = [
  'FEEDBACK-CAPTURE-001',
  'FEEDBACK-TRIAGE-001',
  'BACKLOG-MONITOR-001',
  'SPRINT-MASTER-ADVISOR-001',
  'SYSTEM-FLOW-MAP-001',
  'FOUNDATION-DONE-VELOCITY-001',
  'PROCESS-ACK-STATES-001',
  'VERIFIER-INCREMENTAL-COVERAGE-001',
]
export const INTERNAL_IMPLEMENTATION_SCOPER_CARD_ID = 'INTERNAL-SCOPER-001'

export const foundationControlCompressionSchemaSql = `
  CREATE TABLE IF NOT EXISTS foundation_feedback_items (
    feedback_id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'chat',
    source_ref TEXT,
    raw_text TEXT NOT NULL,
    normalized_summary TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unclassified'
      CHECK (category IN (
        'unclassified',
        'bug',
        'process',
        'source',
        'strategy',
        'tooling',
        'card_context',
        'operator_preference',
        'needs_review'
      )),
    priority TEXT NOT NULL DEFAULT 'P1'
      CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    routing_tag TEXT NOT NULL DEFAULT 'needs_triage',
    review_status TEXT NOT NULL DEFAULT 'captured'
      CHECK (review_status IN ('captured', 'triaged', 'accepted', 'rejected', 'converted', 'archived')),
    proposed_destination_type TEXT,
    proposed_destination_id TEXT,
    proposed_reason TEXT,
    evidence_ref TEXT,
    created_by TEXT NOT NULL DEFAULT 'codex',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_foundation_feedback_items_review
  ON foundation_feedback_items(review_status, priority, captured_at DESC);

  CREATE INDEX IF NOT EXISTS idx_foundation_feedback_items_source_ref
  ON foundation_feedback_items(source_ref);

  CREATE TABLE IF NOT EXISTS foundation_acknowledged_states (
    ack_id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL
      CHECK (target_type IN ('backlog_card', 'source_contract', 'verifier_gap', 'runtime_gap', 'process_gap', 'external_blocker')),
    target_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'expired', 'resolved', 'superseded')),
    owner TEXT NOT NULL,
    reason TEXT NOT NULL,
    review_after TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    related_backlog_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    related_source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    created_by TEXT NOT NULL DEFAULT 'codex',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (target_type, target_id, status)
  );

  CREATE INDEX IF NOT EXISTS idx_foundation_acknowledged_states_status
  ON foundation_acknowledged_states(status, review_after, expires_at);

  CREATE TABLE IF NOT EXISTS foundation_incremental_verifier_runs (
    run_id TEXT PRIMARY KEY,
    card_id TEXT,
    gate_level TEXT NOT NULL,
    full_verify_required BOOLEAN NOT NULL DEFAULT false,
    changed_files TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    required_commands TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    reasons TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    proposal_only BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_foundation_incremental_verifier_runs_card
  ON foundation_incremental_verifier_runs(card_id, created_at DESC);
`

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  const normalized = normalizeText(value)
  return normalized ? [normalized] : []
}

function shortHash(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex').slice(0, 12)
}

function toIsoDateKey(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function dayDiff(a, b) {
  const start = new Date(a)
  const end = new Date(b)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.floor((end.getTime() - start.getTime()) / 86400000)
}

function mapFeedbackRow(row = {}) {
  return {
    feedbackId: row.feedback_id ?? row.feedbackId,
    source: row.source || 'chat',
    sourceRef: row.source_ref ?? row.sourceRef ?? null,
    rawText: row.raw_text ?? row.rawText ?? '',
    normalizedSummary: row.normalized_summary ?? row.normalizedSummary ?? '',
    category: row.category || 'unclassified',
    priority: row.priority || 'P1',
    routingTag: row.routing_tag ?? row.routingTag ?? 'needs_triage',
    reviewStatus: row.review_status ?? row.reviewStatus ?? 'captured',
    proposedDestinationType: row.proposed_destination_type ?? row.proposedDestinationType ?? null,
    proposedDestinationId: row.proposed_destination_id ?? row.proposedDestinationId ?? null,
    proposedReason: row.proposed_reason ?? row.proposedReason ?? null,
    evidenceRef: row.evidence_ref ?? row.evidenceRef ?? null,
    createdBy: row.created_by ?? row.createdBy ?? 'codex',
    metadata: row.metadata || {},
    capturedAt: row.captured_at ?? row.capturedAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function mapAckRow(row = {}) {
  const now = new Date()
  const reviewAfter = row.review_after ?? row.reviewAfter
  const expiresAt = row.expires_at ?? row.expiresAt
  const expired = expiresAt ? new Date(expiresAt).getTime() <= now.getTime() : false
  const reviewDue = reviewAfter ? new Date(reviewAfter).getTime() <= now.getTime() : false
  return {
    ackId: row.ack_id ?? row.ackId,
    targetType: row.target_type ?? row.targetType,
    targetId: row.target_id ?? row.targetId,
    status: expired && (row.status || 'active') === 'active' ? 'expired' : row.status || 'active',
    owner: row.owner || '',
    reason: row.reason || '',
    reviewAfter,
    expiresAt,
    reviewDue,
    expired,
    relatedBacklogIds: normalizeArray(row.related_backlog_ids ?? row.relatedBacklogIds),
    relatedSourceIds: normalizeArray(row.related_source_ids ?? row.relatedSourceIds),
    createdBy: row.created_by ?? row.createdBy ?? 'codex',
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function normalizeBacklogItem(row = {}) {
  return {
    id: row.id,
    title: row.title || '',
    team: row.team || row.scope || 'foundation',
    lane: row.lane || '',
    priority: row.priority || '',
    rank: row.rank ?? null,
    source: row.source || '',
    summary: row.summary || '',
    whyItMatters: row.why_it_matters ?? row.whyItMatters ?? '',
    nextAction: row.next_action ?? row.nextAction ?? '',
    statusNote: row.status_note ?? row.statusNote ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
  }
}

function normalizeTitleKey(title = '') {
  const stop = new Set(['the', 'and', 'for', 'with', 'into', 'from', 'v1', 'build', 'add', 'make'])
  return normalizeLower(title)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stop.has(token))
    .sort()
    .slice(0, 5)
    .join('-')
}

export function createFoundationControlCompressionStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
} = {}) {
  if (!pool?.query) throw new Error('pool with query method is required')

  async function captureFeedbackItem(input = {}) {
    const rawText = normalizeText(input.rawText || input.raw_text || input.summary)
    const normalizedSummary = normalizeText(input.normalizedSummary || input.normalized_summary || input.summary || rawText.slice(0, 240))
    if (!rawText) throw new Error('Feedback rawText is required')
    if (!normalizedSummary) throw new Error('Feedback normalizedSummary is required')
    const feedbackId = normalizeText(input.feedbackId || input.feedback_id) ||
      `feedback_${shortHash(`${input.source || 'chat'}:${input.sourceRef || input.source_ref || rawText}`)}`
    const source = normalizeText(input.source) || 'chat'
    const sourceRef = normalizeText(input.sourceRef || input.source_ref) || null
    const priority = normalizeText(input.priority) || 'P1'
    const evidenceRef = normalizeText(input.evidenceRef || input.evidence_ref) || null
    const createdBy = normalizeText(input.createdBy || input.created_by) || 'codex'
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}

    const runner = async client => {
      const result = await client.query(
        `
          INSERT INTO foundation_feedback_items (
            feedback_id, source, source_ref, raw_text, normalized_summary, priority,
            evidence_ref, created_by, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
          ON CONFLICT (feedback_id) DO UPDATE
          SET raw_text = EXCLUDED.raw_text,
              normalized_summary = EXCLUDED.normalized_summary,
              priority = EXCLUDED.priority,
              evidence_ref = EXCLUDED.evidence_ref,
              metadata = foundation_feedback_items.metadata || EXCLUDED.metadata,
              updated_at = NOW()
          RETURNING *
        `,
        [feedbackId, source, sourceRef, rawText, normalizedSummary, priority, evidenceRef, createdBy, JSON.stringify(metadata)]
      )
      if (insertChangeEvent) {
        await insertChangeEvent(client, {
          eventType: 'review_queue_changed',
          entityTable: 'foundation_feedback_items',
          entityId: feedbackId,
          actor: createdBy,
          summary: `Captured Foundation feedback ${feedbackId}.`,
          metadata: { source, sourceRef, priority },
        })
      }
      return mapFeedbackRow(result.rows[0])
    }
    return withFoundationTransaction ? withFoundationTransaction(runner) : runner(pool)
  }

  async function listFeedbackItems({ limit = 50, status = null } = {}) {
    const result = await pool.query(
      `
        SELECT *
        FROM foundation_feedback_items
        WHERE ($1::text IS NULL OR review_status = $1)
        ORDER BY captured_at DESC
        LIMIT $2
      `,
      [status, Math.max(1, Math.min(200, Number(limit) || 50))]
    )
    return result.rows.map(mapFeedbackRow)
  }

  async function upsertAcknowledgedState(input = {}) {
    const targetType = normalizeText(input.targetType || input.target_type)
    const targetId = normalizeText(input.targetId || input.target_id)
    const owner = normalizeText(input.owner)
    const reason = normalizeText(input.reason)
    const reviewAfter = normalizeText(input.reviewAfter || input.review_after)
    const expiresAt = normalizeText(input.expiresAt || input.expires_at)
    if (!targetType || !targetId || !owner || !reason || !reviewAfter || !expiresAt) {
      throw new Error('Acknowledged state requires targetType, targetId, owner, reason, reviewAfter, and expiresAt')
    }
    const ackId = normalizeText(input.ackId || input.ack_id) || `ack_${shortHash(`${targetType}:${targetId}:${owner}`)}`
    const relatedBacklogIds = normalizeArray(input.relatedBacklogIds || input.related_backlog_ids)
    const relatedSourceIds = normalizeArray(input.relatedSourceIds || input.related_source_ids)
    const createdBy = normalizeText(input.createdBy || input.created_by) || 'codex'
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}

    const result = await pool.query(
      `
        INSERT INTO foundation_acknowledged_states (
          ack_id, target_type, target_id, owner, reason, review_after, expires_at,
          related_backlog_ids, related_source_ids, created_by, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,$8::text[],$9::text[],$10,$11::jsonb)
        ON CONFLICT (target_type, target_id, status) DO UPDATE
        SET owner = EXCLUDED.owner,
            reason = EXCLUDED.reason,
            review_after = EXCLUDED.review_after,
            expires_at = EXCLUDED.expires_at,
            related_backlog_ids = EXCLUDED.related_backlog_ids,
            related_source_ids = EXCLUDED.related_source_ids,
            metadata = foundation_acknowledged_states.metadata || EXCLUDED.metadata,
            updated_at = NOW()
        RETURNING *
      `,
      [ackId, targetType, targetId, owner, reason, reviewAfter, expiresAt, relatedBacklogIds, relatedSourceIds, createdBy, JSON.stringify(metadata)]
    )
    return mapAckRow(result.rows[0])
  }

  async function listAcknowledgedStates({ limit = 50, status = null } = {}) {
    const result = await pool.query(
      `
        SELECT *
        FROM foundation_acknowledged_states
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY review_after ASC, created_at DESC
        LIMIT $2
      `,
      [status, Math.max(1, Math.min(200, Number(limit) || 50))]
    )
    return result.rows.map(mapAckRow)
  }

  async function recordIncrementalVerifierRun(input = {}) {
    const cardId = normalizeText(input.cardId || input.card_id) || null
    const changedFiles = normalizeArray(input.changedFiles || input.changed_files)
    const plan = buildIncrementalVerifierCoveragePlan({ cardId, changedFiles })
    const runId = normalizeText(input.runId || input.run_id) || `incremental_${shortHash(`${cardId || 'none'}:${changedFiles.join('|')}:${Date.now()}`)}`
    const result = await pool.query(
      `
        INSERT INTO foundation_incremental_verifier_runs (
          run_id, card_id, gate_level, full_verify_required, changed_files,
          required_commands, reasons, proposal_only, metadata
        )
        VALUES ($1,$2,$3,$4,$5::text[],$6::text[],$7::text[],$8,$9::jsonb)
        ON CONFLICT (run_id) DO UPDATE
        SET gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            required_commands = EXCLUDED.required_commands,
            reasons = EXCLUDED.reasons,
            metadata = EXCLUDED.metadata
        RETURNING *
      `,
      [
        runId,
        cardId,
        plan.gateLevel,
        plan.fullVerifyRequired,
        changedFiles,
        plan.requiredCommands,
        plan.reasons,
        true,
        JSON.stringify({ ...(input.metadata || {}), plan }),
      ]
    )
    return {
      runId: result.rows[0].run_id,
      cardId,
      ...plan,
      createdAt: result.rows[0].created_at,
    }
  }

  return {
    captureFeedbackItem,
    listFeedbackItems,
    upsertAcknowledgedState,
    listAcknowledgedStates,
    recordIncrementalVerifierRun,
  }
}

export function triageFoundationFeedbackItem(item = {}) {
  const mapped = item.feedbackId ? item : mapFeedbackRow(item)
  const text = normalizeLower([
    mapped.normalizedSummary,
    mapped.rawText,
    mapped.sourceRef,
  ].join(' '))
  const rules = [
    ['bug', /\b(bug|broken|error|failing|failed|fix|wrong|regression)\b/, 'backlog_review', 'Likely bug or repair work.'],
    ['process', /\b(sprint|stage|process|plan critic|ship gate|gate|closeout|handoff)\b/, 'process_review', 'Process or sprint-control feedback.'],
    ['source', /\b(source|connector|drive|gmail|skool|youtube|loom|myicor|data|extract|atom)\b/, 'source_review', 'Source or extraction feedback.'],
    ['strategy', /\b(strategy|vision|foundation|hub|recruit|lead|sell|operator)\b/, 'strategy_review', 'Strategy or operating-model feedback.'],
    ['tooling', /\b(codex|claude|model|llm|api|tool|plugin|browser|playwright)\b/, 'tooling_review', 'Tooling or model-route feedback.'],
    ['card_context', /\b(card|backlog|research lane|scoped|rank|priority)\b/, 'backlog_review', 'Backlog/card context feedback.'],
    ['operator_preference', /\b(i want|i do not want|don't|prefer|remember|make sure)\b/, 'operator_preference_review', 'Operator preference or memory-worthy rule.'],
  ]
  const match = rules.find(([, pattern]) => pattern.test(text))
  const category = match?.[0] || 'needs_review'
  const destination = match?.[2] || 'manual_review'
  const reason = match?.[3] || 'No deterministic rule matched; keep for human review.'
  return {
    feedbackId: mapped.feedbackId,
    category,
    priority: mapped.priority || 'P1',
    routingTag: destination,
    confidence: match ? 0.82 : 0.35,
    proposedDestinationType: destination,
    proposedDestinationId: null,
    proposedReason: reason,
    proposalOnly: true,
    requiresSteveCodexApproval: true,
    writesBacklog: false,
    writesSprint: false,
    writesDecision: false,
    writesDocs: false,
  }
}

export function buildFeedbackTriageSnapshot({ feedbackItems = [] } = {}) {
  const proposals = feedbackItems.map(item => triageFoundationFeedbackItem(item))
  const byCategory = proposals.reduce((acc, proposal) => {
    acc[proposal.category] = (acc[proposal.category] || 0) + 1
    return acc
  }, {})
  return {
    status: proposals.length ? 'ready' : 'empty',
    proposalOnly: true,
    writesBacklog: false,
    writesSprint: false,
    writesDecision: false,
    itemCount: proposals.length,
    byCategory,
    proposals,
    plainEnglish: proposals.length
      ? 'Captured feedback has proposed routing, but nothing is applied until Steve and Codex approve it.'
      : 'Feedback triage is ready; no captured feedback is waiting in the proof snapshot.',
  }
}

export function buildBacklogMonitorSnapshot({
  backlogItems = [],
  closeouts = [],
  now = new Date().toISOString(),
} = {}) {
  const items = backlogItems.map(normalizeBacklogItem).filter(item => item.id)
  const foundationItems = items.filter(item => item.team === 'foundation')
  const closeoutCardIds = new Set(closeouts.flatMap(closeout => Array.isArray(closeout.backlogIds) ? closeout.backlogIds : []))
  const byLane = {}
  const byPriority = {}
  const byTeamLane = {}
  for (const item of items) {
    byLane[item.lane] = (byLane[item.lane] || 0) + 1
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1
    const key = `${item.team}:${item.lane}`
    byTeamLane[key] = (byTeamLane[key] || 0) + 1
  }
  const staleCandidates = items
    .filter(item => item.lane !== 'done')
    .map(item => ({ ...item, ageDays: dayDiff(item.updatedAt || item.createdAt, now) }))
    .filter(item => item.ageDays !== null && item.ageDays >= 30)
    .slice(0, 25)
  const titleGroups = new Map()
  for (const item of items) {
    const key = normalizeTitleKey(item.title)
    if (!key) continue
    if (!titleGroups.has(key)) titleGroups.set(key, [])
    titleGroups.get(key).push(item)
  }
  const duplicateCandidates = [...titleGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      count: group.length,
      cards: group.slice(0, 6).map(item => ({ id: item.id, title: item.title, lane: item.lane, priority: item.priority })),
      reason: 'Similar normalized title tokens; review only.',
    }))
    .slice(0, 20)
  const proofRiskCandidates = items
    .filter(item => item.lane === 'done')
    .filter(item => !closeoutCardIds.has(item.id) && !/under `[^`]+`/.test(item.statusNote || ''))
    .slice(0, 25)
    .map(item => ({ id: item.id, title: item.title, reason: 'Done card has no closeout key/status proof signal in monitor inputs.' }))
  const researchSurvivors = foundationItems
    .filter(item => item.lane === 'research' && ['P0', 'P1'].includes(item.priority))
    .slice(0, 25)
    .map(item => ({ id: item.id, title: item.title, priority: item.priority, reason: 'Foundation research card still needs promote/keep/kill review.' }))
  const ghostCompletionCandidates = items
    .filter(item => item.lane !== 'done' && /\bclosed\b|\bdone\b|under `/.test(item.statusNote || ''))
    .slice(0, 25)
    .map(item => ({ id: item.id, title: item.title, lane: item.lane, reason: 'Status note looks closed but lane is not done.' }))
  return {
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    generatedAt: now,
    counts: {
      total: items.length,
      foundationTotal: foundationItems.length,
      foundationScoped: foundationItems.filter(item => item.lane === 'scoped').length,
      foundationResearch: foundationItems.filter(item => item.lane === 'research').length,
      activeP0P1: foundationItems.filter(item => ['P0', 'P1'].includes(item.priority) && item.lane !== 'done').length,
      byLane,
      byPriority,
      byTeamLane,
    },
    staleCandidates,
    duplicateCandidates,
    proofRiskCandidates,
    researchSurvivors,
    ghostCompletionCandidates,
    plainEnglish: 'Backlog monitor reports review candidates only; it does not move, rank, close, or delete cards.',
  }
}

export function buildSprintAdvisorSnapshot({
  backlogItems = [],
  currentSprint = null,
  backlogMonitor = null,
} = {}) {
  const items = backlogItems.map(normalizeBacklogItem).filter(item => item.id)
  const byId = new Map(items.map(item => [item.id, item]))
  const option = (theme, cardIds, whyNow, notNext, blocker = null) => ({
    theme,
    candidateCards: cardIds.map(id => byId.get(id)).filter(Boolean).map(item => ({
      id: item.id,
      title: item.title,
      priority: item.priority,
      lane: item.lane,
    })),
    whyNow,
    blockerNeedingSteve: blocker,
    proofBurden: 'Focused proof per card plus full sprint ship gate.',
    proposalOnly: true,
    requiresSteveCodexApproval: true,
    opensSprint: false,
    writesBacklog: false,
    notNext,
  })
  const options = [
    option(
      'Finish Foundation Control + Backlog Compression',
      FOUNDATION_CONTROL_COMPRESSION_CARD_IDS,
      'This is the active sprint and closes the immediate problem Steve named: too much Foundation work with too little control visibility.',
      ['No extraction implementation', 'No autonomous dev', 'No hub work']
    ),
    option(
      'Runtime + Extraction Hardening Foundation Sprint',
      ['RUNTIME-ACTIVATION-001', 'RUNTIME-SUPERVISOR-001', 'RUNTIME-WORKER-001', 'EXTRACT-BACKFILL-001', 'EXTRACT-CURRENT-001', 'EXTRACT-RETRY-001'],
      'These cards reduce operational risk before heavier source mining expands.',
      ['No paid-source auth', 'No broad corpus expansion without caps', 'No hub UI']
    ),
    option(
      'Internal Implementation Scoper Sprint',
      [INTERNAL_IMPLEMENTATION_SCOPER_CARD_ID, 'RESEARCH-LANE-PURGE-001', 'BACKLOG-MONITOR-001'],
      'The backlog has a large research lane and many thin cards. This option builds the internal counterpart to Build Scoper: enrich existing cards into reviewable 7-section build doctrine without autonomous dev.',
      ['No autonomous backlog mutation', 'No extraction implementation', 'No hub work']
    ),
    option(
      'Build Intel Extraction Implementation Sprint',
      ['YOUTUBE-SCOUT-001', 'WEB-GODMODE-001', 'MYICRO-TRAINING-001', 'SKOOL-WORKER-001', 'SKOOL-001', 'LOOM-001'],
      'Build Intel intake primitives are now done; actual extraction should be the next named external-content sprint only when Steve is present for auth decisions.',
      ['No auto-auth', 'No paid-source scraping without Steve decision', 'No auto-created backlog cards'],
      'Skool/myICOR/Loom need Steve-present access and content-use decisions.'
    ),
  ]
  return {
    status: 'ready',
    generatedAt: new Date().toISOString(),
    activeSprintId: currentSprint?.sprint?.sprintId || currentSprint?.sprintId || null,
    proposalOnly: true,
    opensSprint: false,
    writesBacklog: false,
    backlogPressure: backlogMonitor?.counts || null,
    options,
    plainEnglish: 'Sprint Master Advisor proposes options only. Steve and Codex still choose and open the sprint manually.',
  }
}

export function buildSystemFlowMapSnapshot({
  sources = [],
  extractionControl = {},
  intelligenceAtomSpine = {},
  intelligenceSynthesis = {},
  intelligenceActionRouter = {},
  backlogMonitor = {},
  feedbackTriage = {},
  currentSprint = {},
} = {}) {
  const sourceCount = Array.isArray(sources) ? sources.length : 0
  const targetCount = Array.isArray(extractionControl?.targets) ? extractionControl.targets.length : Number(extractionControl?.targetCount || 0)
  const atomCount = Number(intelligenceAtomSpine?.atomCount || intelligenceAtomSpine?.summary?.atomCount || intelligenceAtomSpine?.atoms?.length || 0)
  const synthesisCount = Number(intelligenceSynthesis?.activeItemCount || intelligenceSynthesis?.activeItems || intelligenceSynthesis?.items?.length || 0)
  const routeCount = Number(intelligenceActionRouter?.routeCount || intelligenceActionRouter?.pendingCount || intelligenceActionRouter?.routes?.length || 0)
  const backlogCount = Number(backlogMonitor?.counts?.total || 0)
  const nodes = [
    { id: 'sources', label: 'Sources', count: sourceCount, status: sourceCount ? 'ready' : 'missing' },
    { id: 'crawl', label: 'Crawl/Jobs', count: targetCount, status: targetCount ? 'ready' : 'missing' },
    { id: 'atoms', label: 'Atoms', count: atomCount, status: atomCount ? 'ready' : 'empty' },
    { id: 'synthesis', label: 'Synthesis', count: synthesisCount, status: synthesisCount ? 'ready' : 'empty' },
    { id: 'routes', label: 'Routes/Proposals', count: routeCount + Number(feedbackTriage.itemCount || 0), status: routeCount || feedbackTriage.itemCount ? 'ready' : 'empty' },
    { id: 'backlog', label: 'Backlog', count: backlogCount, status: backlogCount ? 'ready' : 'missing' },
    { id: 'sprint', label: 'Current Sprint', count: currentSprint?.items?.length || currentSprint?.cards?.length || 0, status: currentSprint?.status || 'unknown' },
    { id: 'ship', label: 'Ship/Closeout', count: 1, status: 'guarded' },
  ]
  const edges = [
    ['sources', 'crawl', 'source targets feed jobs'],
    ['crawl', 'atoms', 'artifacts become atoms'],
    ['atoms', 'synthesis', 'evidence becomes synthesized items'],
    ['synthesis', 'routes', 'items become proposals/routes'],
    ['routes', 'backlog', 'approved proposals become task truth'],
    ['backlog', 'sprint', 'Steve+Codex choose sprint'],
    ['sprint', 'ship', 'Plan Critic and ship gate close work'],
  ]
  const mermaid = [
    'flowchart LR',
    ...nodes.map(node => `  ${node.id}[${node.label}: ${node.count}]`),
    ...edges.map(([from, to, label]) => `  ${from} -->|${label}| ${to}`),
  ].join('\n')
  return {
    status: 'ready',
    generatedAt: new Date().toISOString(),
    liveData: true,
    nodes,
    edges: edges.map(([from, to, label]) => ({ from, to, label })),
    mermaid,
    plainEnglish: 'This map is generated from live Foundation snapshots, not a static diagram.',
  }
}

export function buildDoneVelocitySnapshot({
  backlogItems = [],
  sprintItems = [],
  closeouts = [],
  now = new Date().toISOString(),
} = {}) {
  const items = backlogItems.map(normalizeBacklogItem).filter(item => item.id && item.team === 'foundation' && item.lane === 'done')
  const sprintDoneMap = new Map()
  for (const item of Array.isArray(sprintItems) ? sprintItems : []) {
    if ((item.stage || item.stageKey) === 'done_this_sprint') {
      sprintDoneMap.set(item.cardId || item.backlogId, item.updatedAt || item.updated_at || item.createdAt || item.created_at)
    }
  }
  const closeoutMap = new Map()
  for (const closeout of closeouts) {
    for (const id of Array.isArray(closeout.backlogIds) ? closeout.backlogIds : []) {
      if (!closeoutMap.has(id)) closeoutMap.set(id, closeout)
    }
  }
  const rows = items.map(item => {
    const sprintDate = sprintDoneMap.get(item.id)
    const closeout = closeoutMap.get(item.id)
    const date = sprintDate || item.updatedAt || item.createdAt || now
    const source = sprintDate ? 'sprint_item' : closeout ? 'closeout_or_backlog_updated_at' : item.updatedAt ? 'backlog_updated_at' : 'inferred_missing_date'
    return {
      id: item.id,
      title: item.title,
      doneDate: toIsoDateKey(date),
      dateSource: source,
      dateConfidence: source === 'inferred_missing_date' ? 'low' : source === 'backlog_updated_at' ? 'medium' : 'high',
    }
  })
  const byDay = rows.reduce((acc, row) => {
    if (!row.doneDate) return acc
    acc[row.doneDate] = (acc[row.doneDate] || 0) + 1
    return acc
  }, {})
  const last14Days = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }))
  const lowConfidenceCount = rows.filter(row => row.dateConfidence === 'low').length
  return {
    status: 'ready',
    generatedAt: now,
    totalDone: rows.length,
    last14Days,
    lowConfidenceCount,
    rows: rows.slice(-50),
    proposalOnly: true,
    writesBacklog: false,
    plainEnglish: lowConfidenceCount
      ? 'Done velocity is available, with low-confidence dates labeled instead of treated as truth.'
      : 'Done velocity is available from closeout/backlog/sprint date signals.',
  }
}

export function buildAcknowledgedStatesSnapshot({ ackStates = [] } = {}) {
  const items = ackStates.map(mapAckRow)
  return {
    status: 'ready',
    itemCount: items.length,
    activeCount: items.filter(item => item.status === 'active').length,
    expiredCount: items.filter(item => item.expired || item.status === 'expired').length,
    reviewDueCount: items.filter(item => item.reviewDue).length,
    items,
    suppressesCriticalVerifierFailures: false,
    proposalOnly: true,
    plainEnglish: 'Acknowledged states keep known gaps visible with owner and review dates; they do not suppress critical verifier failures automatically.',
  }
}

export function buildIncrementalVerifierCoveragePlan({ cardId = null, changedFiles = [] } = {}) {
  const files = normalizeArray(changedFiles)
  const gate = classifyVerificationGateForFiles(files)
  const unknownRisk = files.length === 0
  const fullVerifyRequired = unknownRisk || gate.fullVerifyRequired || gate.level === 'full'
  const requiredCommands = fullVerifyRequired
    ? ['npm run foundation:verify', 'npm run process:foundation-ship -- --card=<card> --closeoutKey=<closeout>']
    : gate.level === 'static'
      ? ['git diff --check']
      : [`npm run process:foundation-control-compression-check -- --card=${cardId || '<card>'} --json`, 'npm run backlog:hygiene -- --json']
  return {
    cardId,
    changedFiles: files,
    gateLevel: fullVerifyRequired ? 'full' : gate.level,
    fullVerifyRequired,
    focusedProofAllowed: !fullVerifyRequired,
    requiredCommands,
    reasons: [
      ...(gate.reasons || []),
      ...(unknownRisk ? ['unknown changed files default to full verification'] : []),
    ],
    proposalOnly: true,
    replacesFoundationVerify: false,
    plainEnglish: fullVerifyRequired
      ? 'This change touches protected or unknown Foundation paths, so full verification is required.'
      : 'This change can use focused proof, while the final sprint ship still runs full verification.',
  }
}

export function buildFoundationControlCompressionSnapshot({
  backlogItems = [],
  closeouts = [],
  currentSprint = null,
  feedbackItems = [],
  ackStates = [],
  sources = [],
  extractionControl = {},
  intelligenceAtomSpine = {},
  intelligenceSynthesis = {},
  intelligenceActionRouter = {},
} = {}) {
  const backlogMonitor = buildBacklogMonitorSnapshot({ backlogItems, closeouts })
  const feedbackTriage = buildFeedbackTriageSnapshot({ feedbackItems })
  const sprintAdvisor = buildSprintAdvisorSnapshot({ backlogItems, currentSprint, backlogMonitor })
  const systemFlowMap = buildSystemFlowMapSnapshot({
    sources,
    extractionControl,
    intelligenceAtomSpine,
    intelligenceSynthesis,
    intelligenceActionRouter,
    backlogMonitor,
    feedbackTriage,
    currentSprint,
  })
  const doneVelocity = buildDoneVelocitySnapshot({
    backlogItems,
    sprintItems: currentSprint?.items || [],
    closeouts,
  })
  const acknowledgedStates = buildAcknowledgedStatesSnapshot({ ackStates })
  const incrementalVerifier = buildIncrementalVerifierCoveragePlan({
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    changedFiles: ['lib/foundation-control-compression.js', 'server.js', 'scripts/foundation-verify.mjs'],
  })
  return {
    closeoutKey: FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY,
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    writesSprint: false,
    cards: FOUNDATION_CONTROL_COMPRESSION_CARD_IDS,
    feedbackCapture: {
      status: 'ready',
      itemCount: feedbackItems.length,
      latestItems: feedbackItems.slice(0, 10),
      writesBacklog: false,
      writesSprint: false,
    },
    feedbackTriage,
    backlogMonitor,
    sprintAdvisor,
    systemFlowMap,
    doneVelocity,
    acknowledgedStates,
    incrementalVerifier,
    noAutonomousDev: true,
    plainEnglish: 'Foundation control compression is ready: capture feedback, propose triage, report backlog health, propose sprints, map flow, show velocity, track acknowledgements, and plan incremental proof without auto-mutating work.',
  }
}

export function buildSyntheticFoundationControlCompressionFixtures(now = new Date().toISOString()) {
  const future = new Date(new Date(now).getTime() + 7 * 86400000).toISOString()
  const past = new Date(new Date(now).getTime() - 2 * 86400000).toISOString()
  return {
    feedback: {
      feedbackId: 'feedback_synthetic_foundation_control',
      source: 'synthetic',
      sourceRef: 'process:foundation-control-compression-check',
      rawText: 'Steve said this sprint cannot auto-create backlog cards and must capture feedback for review.',
      normalizedSummary: 'Capture Steve feedback without auto-mutating backlog.',
      priority: 'P1',
      evidenceRef: 'synthetic-proof',
      metadata: { synthetic: true },
    },
    activeAck: {
      ackId: 'ack_synthetic_foundation_control',
      targetType: 'process_gap',
      targetId: 'synthetic-known-gap',
      owner: 'Steve',
      reason: 'Synthetic proof for acknowledged-state owner/review requirements.',
      reviewAfter: future,
      expiresAt: future,
      relatedBacklogIds: ['PROCESS-ACK-STATES-001'],
      metadata: { synthetic: true },
    },
    expiredAck: {
      ackId: 'ack_synthetic_foundation_control_expired',
      targetType: 'process_gap',
      targetId: 'synthetic-expired-gap',
      owner: 'Steve',
      reason: 'Synthetic proof for expired acknowledged-state review.',
      reviewAfter: past,
      expiresAt: past,
      relatedBacklogIds: ['PROCESS-ACK-STATES-001'],
      metadata: { synthetic: true },
    },
  }
}
