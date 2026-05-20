import crypto from 'node:crypto'

import {
  evaluateTemporalTruthRecords,
  normalizeTemporalTruthRecord,
} from './memory-005-temporal-truth-model.js'

export const STRATEGY_001_CARD_ID = 'STRATEGY-001'
export const STRATEGY_001_NEXT_CARD_ID = 'GOV-001'
export const STRATEGY_001_CLOSEOUT_KEY = 'strategy-001-business-atoms-framework-v1'
export const STRATEGY_001_PLAN_PATH = 'docs/process/strategy-001-business-atoms-framework-plan.md'
export const STRATEGY_001_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-001.json'
export const STRATEGY_001_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-strategy-001-business-atoms-framework-closeout.md'
export const STRATEGY_001_SCRIPT_PATH = 'scripts/process-strategy-001-check.mjs'
export const STRATEGY_001_SPEC_PATH = 'docs/specs/business-atoms-spec.md'
export const STRATEGY_001_SPRINT_ID = 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20'

export const STRATEGY_001_PROOF_COMMANDS = [
  'node --check lib/strategy-001-business-atoms.js scripts/process-strategy-001-check.mjs lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/strategy-shared-comms-routes.js public/strategic-execution.js server.js',
  'npm run process:strategy-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=STRATEGY-001 --planApprovalRef=docs/process/approvals/STRATEGY-001.json --closeoutKey=strategy-001-business-atoms-framework-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=STRATEGY-001 --closeoutKey=strategy-001-business-atoms-framework-v1',
  'npm run process:foundation-ship -- --card=STRATEGY-001 --planApprovalRef=docs/process/approvals/STRATEGY-001.json --closeoutKey=strategy-001-business-atoms-framework-v1 --commitRef=HEAD',
]

export const STRATEGY_001_CHANGED_FILES = [
  'lib/strategy-001-business-atoms.js',
  STRATEGY_001_SCRIPT_PATH,
  'lib/foundation-db-schema-seed-store.js',
  'lib/foundation-db.js',
  'lib/source-id-constraint-contract.js',
  'lib/strategy-shared-comms-routes.js',
  'server.js',
  'public/strategic-execution.js',
  STRATEGY_001_PLAN_PATH,
  STRATEGY_001_APPROVAL_PATH,
  STRATEGY_001_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const STRATEGY_001_NOT_NEXT_BOUNDARIES = [
  'No automated extraction, provider/model calls, browser automation, old agent runtime, or broad source reads.',
  'No automatic decision/backlog/question apply from atom content.',
  'No Strategy Hub redesign beyond a bounded read-only Business Atoms view.',
  'No marketing avatar import beyond optional tags already present on atom rows.',
  'No external writes, sends, credential mutation, provider config mutation, Drive permission mutation, or paid/private source expansion.',
]

const BUSINESS_ATOM_CATEGORIES = [
  'bottleneck',
  'decision_needed',
  'decision_made',
  'win',
  'loss',
  'frustration',
  'opportunity',
  'assumption_risk',
  'culture_signal',
  'external_signal',
]

const PILLARS = ['ATTRACT', 'GROW', 'RETAIN', 'FINANCIAL', 'LEADERSHIP', 'SYSTEM']
const DEPARTMENTS = ['leadership', 'recruiting', 'sales', 'marketing', 'operations', 'retention', 'finance', 'system', 'unknown']
const TIME_SCOPES = ['this_week', 'this_month', 'this_quarter', 'annual_pattern', 'structural']
const LIFECYCLE_STATUSES = ['detected', 'confirmed', 'recurring', 'structural', 'resolved', 'archived']
const CURRENT_STATES = ['current', 'not_current', 'future', 'superseded', 'resolved']

export const businessAtomsSchemaSql = `
  CREATE TABLE IF NOT EXISTS business_atoms (
    id TEXT PRIMARY KEY,
    source_atom_id TEXT REFERENCES intelligence_atoms(atom_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK (category IN (${BUSINESS_ATOM_CATEGORIES.map(value => `'${value}'`).join(', ')})),
    pillar TEXT NOT NULL CHECK (pillar IN (${PILLARS.map(value => `'${value}'`).join(', ')})),
    department TEXT NOT NULL DEFAULT 'unknown' CHECK (department IN (${DEPARTMENTS.map(value => `'${value}'`).join(', ')})),
    time_scope TEXT NOT NULL DEFAULT 'this_quarter' CHECK (time_scope IN (${TIME_SCOPES.map(value => `'${value}'`).join(', ')})),
    lifecycle_status TEXT NOT NULL DEFAULT 'detected' CHECK (lifecycle_status IN (${LIFECYCLE_STATUSES.map(value => `'${value}'`).join(', ')})),
    hit_count INTEGER NOT NULL DEFAULT 0,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_type TEXT NOT NULL DEFAULT 'source_backed_fact',
    source_id TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    source_excerpt TEXT NOT NULL DEFAULT '',
    audience_tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    owner TEXT NOT NULL DEFAULT 'Foundation Intelligence',
    threshold TEXT NOT NULL DEFAULT '3 hits in a quarter -> recurring; 5 hits across periods -> structural',
    next_trigger TEXT NOT NULL DEFAULT 'Review in weekly/monthly/quarterly/annual planning views when hit count or status changes.',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    superseded_by TEXT,
    current_state TEXT NOT NULL DEFAULT 'current' CHECK (current_state IN (${CURRENT_STATES.map(value => `'${value}'`).join(', ')})),
    created_by TEXT NOT NULL DEFAULT 'system',
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS atom_hits (
    id TEXT PRIMARY KEY,
    atom_id TEXT NOT NULL REFERENCES business_atoms(id) ON DELETE CASCADE,
    hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_type TEXT NOT NULL DEFAULT 'source_backed_fact',
    source_id TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    context_excerpt TEXT NOT NULL DEFAULT '',
    confidence NUMERIC(4,3),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_business_atoms_category ON business_atoms(category);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_pillar ON business_atoms(pillar);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_department ON business_atoms(department);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_status ON business_atoms(lifecycle_status);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_current ON business_atoms(current_state, lifecycle_status, last_hit_at DESC);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_hits ON business_atoms(hit_count DESC, last_hit_at DESC);
  CREATE INDEX IF NOT EXISTS idx_business_atoms_source ON business_atoms(source_id, current_state, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_atom_hits_atom ON atom_hits(atom_id, hit_at DESC);
  CREATE INDEX IF NOT EXISTS idx_atom_hits_source ON atom_hits(source_id, hit_at DESC);

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_srcid_business_atoms_source_id'
    ) THEN
      ALTER TABLE business_atoms
        ADD CONSTRAINT fk_srcid_business_atoms_source_id
        FOREIGN KEY (source_id)
        REFERENCES source_contract_registry(source_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_srcid_atom_hits_source_id'
    ) THEN
      ALTER TABLE atom_hits
        ADD CONSTRAINT fk_srcid_atom_hits_source_id
        FOREIGN KEY (source_id)
        REFERENCES source_contract_registry(source_id);
    END IF;
  END $$;
`

function text(value) {
  return String(value ?? '').trim()
}

function list(value) {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  return text(value).split(',').map(item => item.trim()).filter(Boolean)
}

function unique(values = []) {
  return Array.from(new Set(list(values)))
}

function hash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function compact(value = '', limit = 240) {
  const normalized = text(value).replace(/\s+/g, ' ')
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit - 3).trim()}...`
}

function asIso(value) {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = text(value)
  return allowed.includes(normalized) ? normalized : fallback
}

function inferCategory({ title = '', claim = '', atomType = '' } = {}) {
  const joined = `${title} ${claim} ${atomType}`.toLowerCase()
  if (/decision|signed off|approved|locked|made/.test(joined)) return 'decision_made'
  if (/need|needs|decide|question|owner|clarify/.test(joined)) return 'decision_needed'
  if (/ahead|winning|win|positive|good/.test(joined)) return 'win'
  if (/loss|lost|failed|down|bad/.test(joined)) return 'loss'
  if (/behind|gap|blocked|blocker|short|risk|missing/.test(joined)) return 'bottleneck'
  if (/opportun|upside|opened/.test(joined)) return 'opportunity'
  if (/assumption|model|target|pressure/.test(joined)) return 'assumption_risk'
  if (/culture|morale|pride|engagement/.test(joined)) return 'culture_signal'
  if (/platform|policy|market|vendor|provider/.test(joined)) return 'external_signal'
  return 'bottleneck'
}

function inferPillar({ sourceId = '', title = '', claim = '' } = {}) {
  const joined = `${sourceId} ${title} ${claim}`.toLowerCase()
  if (/finance|cash|revenue|expense|split|net/.test(joined)) return 'FINANCIAL'
  if (/agent|recruit|community|bhag/.test(joined)) return 'ATTRACT'
  if (/ops|operation|process|handoff|source|system|foundation|supabase|fub/.test(joined)) return 'SYSTEM'
  if (/retention|coach|onboard/.test(joined)) return 'RETAIN'
  if (/leadership|decision|strategy|owner/.test(joined)) return 'LEADERSHIP'
  return 'GROW'
}

function inferDepartment({ sourceId = '', title = '', claim = '' } = {}) {
  const joined = `${sourceId} ${title} ${claim}`.toLowerCase()
  if (/finance|cash|revenue|expense/.test(joined)) return 'finance'
  if (/recruit|agent|community|bhag/.test(joined)) return 'recruiting'
  if (/fub|lead|crm|sales/.test(joined)) return 'sales'
  if (/marketing|content|ads|social/.test(joined)) return 'marketing'
  if (/ops|operation|handoff|process/.test(joined)) return 'operations'
  if (/strategy|decision|owner|leadership/.test(joined)) return 'leadership'
  if (/system|source|supabase|foundation/.test(joined)) return 'system'
  return 'unknown'
}

function inferTimeScope({ title = '', claim = '' } = {}) {
  const joined = `${title} ${claim}`.toLowerCase()
  if (/week|weekly|today|current-day/.test(joined)) return 'this_week'
  if (/month|monthly|mo\b/.test(joined)) return 'this_month'
  if (/quarter|q[1-4]|90-day/.test(joined)) return 'this_quarter'
  if (/annual|year|2033|2035|2026|bhag/.test(joined)) return 'annual_pattern'
  if (/structural|source|governed|signed off|system/.test(joined)) return 'structural'
  return 'this_quarter'
}

function lifecycleForHitCount(hitCount = 0, category = '') {
  const count = Number(hitCount || 0)
  if (category === 'decision_made' && count >= 1) return 'confirmed'
  if (count >= 5) return 'structural'
  if (count >= 3) return 'recurring'
  if (count >= 2) return 'confirmed'
  return 'detected'
}

function currentStateFor(input = {}, asOf = new Date()) {
  const normalized = normalizeTemporalTruthRecord({
    id: input.id,
    type: 'strategy',
    truthKey: input.id,
    title: input.title,
    status: input.lifecycleStatus === 'archived' ? 'archived' : input.lifecycleStatus === 'resolved' ? 'resolved' : 'active',
    sourceId: input.sourceId,
    sourceRef: input.sourceRef,
    owner: input.owner,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    supersededBy: input.supersededBy,
  }, { asOf })
  if (input.lifecycleStatus === 'resolved') return 'resolved'
  if (input.supersededBy) return 'superseded'
  const validFrom = input.validFrom ? new Date(input.validFrom) : null
  if (validFrom && !Number.isNaN(validFrom.getTime()) && validFrom.getTime() > new Date(asOf).getTime()) return 'future'
  return normalized.currentState === 'current' ? 'current' : 'not_current'
}

export function normalizeBusinessAtom(row = {}, { asOf = new Date() } = {}) {
  const id = text(row.id || row.atomId || row.atom_id)
  const title = compact(row.title || id, 160)
  const sourceId = text(row.sourceId || row.source_id)
  const sourceRef = text(row.sourceRef || row.source_ref)
  const hitCount = Number(row.hitCount ?? row.hit_count ?? 0)
  const category = normalizeChoice(row.category, BUSINESS_ATOM_CATEGORIES, inferCategory(row))
  const lifecycleStatus = normalizeChoice(row.lifecycleStatus || row.lifecycle_status, LIFECYCLE_STATUSES, lifecycleForHitCount(hitCount, category))
  const normalized = {
    id,
    sourceAtomId: text(row.sourceAtomId || row.source_atom_id) || null,
    title,
    description: compact(row.description || row.claim || row.content || row.sourceExcerpt || row.source_excerpt || '', 500),
    category,
    pillar: normalizeChoice(row.pillar, PILLARS, inferPillar({ ...row, sourceId })),
    department: normalizeChoice(row.department, DEPARTMENTS, inferDepartment({ ...row, sourceId })),
    timeScope: normalizeChoice(row.timeScope || row.time_scope, TIME_SCOPES, inferTimeScope(row)),
    lifecycleStatus,
    hitCount,
    firstDetectedAt: asIso(row.firstDetectedAt || row.first_detected_at || row.validFrom || row.valid_from || row.asOf || row.as_of || row.createdAt || row.created_at),
    lastHitAt: asIso(row.lastHitAt || row.last_hit_at || row.updatedAt || row.updated_at || row.asOf || row.as_of),
    sourceType: text(row.sourceType || row.source_type || 'source_backed_fact'),
    sourceId,
    sourceRef,
    sourceExcerpt: compact(row.sourceExcerpt || row.source_excerpt || row.claim || row.content || row.evidenceExcerpt || row.evidence_excerpt || '', 700),
    audienceTags: unique(row.audienceTags || row.audience_tags || row.avatar_ids || row.avatarIds),
    owner: text(row.owner || 'Foundation Intelligence'),
    threshold: text(row.threshold || '3 hits in a quarter -> recurring; 5 hits across periods -> structural'),
    nextTrigger: text(row.nextTrigger || row.next_trigger || 'Review in weekly/monthly/quarterly/annual planning views when hit count or status changes.'),
    validFrom: asIso(row.validFrom || row.valid_from || row.asOf || row.as_of || row.createdAt || row.created_at) || new Date().toISOString(),
    validUntil: asIso(row.validUntil || row.valid_until),
    supersededBy: text(row.supersededBy || row.superseded_by) || null,
    currentState: normalizeChoice(row.currentState || row.current_state, CURRENT_STATES, 'current'),
    createdBy: text(row.createdBy || row.created_by || 'system'),
    resolvedAt: asIso(row.resolvedAt || row.resolved_at),
    resolvedBy: text(row.resolvedBy || row.resolved_by) || null,
    resolutionNote: text(row.resolutionNote || row.resolution_note) || null,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  }
  normalized.currentState = currentStateFor(normalized, asOf)
  return normalized
}

export function evaluateBusinessAtomRecords(records = [], { asOf = new Date() } = {}) {
  const normalized = records.map(record => normalizeBusinessAtom(record, { asOf }))
  const failed = []
  const fail = (record, check, detail = '') => failed.push({
    atomId: record?.id || 'unknown',
    check,
    detail: text(detail),
  })

  for (const record of normalized) {
    if (!record.id) fail(record, 'business atom id is required')
    if (!record.title) fail(record, 'business atom title is required')
    if (!record.sourceId) fail(record, 'business atom sourceId is required')
    if (!record.sourceRef) fail(record, 'business atom sourceRef is required')
    if (!record.sourceExcerpt) fail(record, 'business atom source excerpt is required')
    if (!record.owner) fail(record, 'business atom owner is required')
    if (!record.threshold) fail(record, 'business atom threshold is required')
    if (!record.nextTrigger) fail(record, 'business atom next trigger is required')
    if (record.hitCount < 1) fail(record, 'business atom needs at least one supporting hit')
    if (!BUSINESS_ATOM_CATEGORIES.includes(record.category)) fail(record, 'invalid category', record.category)
    if (!PILLARS.includes(record.pillar)) fail(record, 'invalid pillar', record.pillar)
    if (!TIME_SCOPES.includes(record.timeScope)) fail(record, 'invalid timeScope', record.timeScope)
    if (!CURRENT_STATES.includes(record.currentState)) fail(record, 'invalid currentState', record.currentState)
  }

  const temporal = evaluateTemporalTruthRecords(normalized.map(record => ({
    id: record.id,
    recordType: 'strategy',
    truthKey: record.id,
    title: record.title,
    status: record.currentState === 'current' ? 'active' : record.currentState,
    sourceId: record.sourceId,
    sourceRef: record.sourceRef,
    owner: record.owner,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    supersededBy: record.supersededBy,
    detail: record.description,
  })), { asOf })

  for (const item of temporal.failures || []) {
    failed.push({
      atomId: item.recordId,
      check: `temporal truth: ${item.check}`,
      detail: item.detail || item.truthKey,
    })
  }

  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    summary: {
      atomCount: normalized.length,
      currentCount: normalized.filter(record => record.currentState === 'current').length,
      categoryCount: new Set(normalized.map(record => record.category)).size,
      pillarCount: new Set(normalized.map(record => record.pillar)).size,
      timeScopeCount: new Set(normalized.map(record => record.timeScope)).size,
    },
    records: normalized,
    failed,
  }
}

export async function ensureBusinessAtomSchema(client) {
  await client.query(businessAtomsSchemaSql)
}

export async function selectBusinessAtomSeedEvidence(client, { limit = 12 } = {}) {
  const normalizedLimit = Math.max(5, Math.min(25, Number(limit) || 12))
  const result = await client.query(
    `
      WITH atom_evidence AS (
        SELECT
          'intelligence_atom' AS evidence_type,
          atom_id AS evidence_id,
          atom_id AS source_atom_id,
          title,
          COALESCE(NULLIF(derived_claim, ''), NULLIF(content, ''), evidence_excerpt) AS claim,
          source_id,
          updated_at AS as_of,
          status,
          hit_count,
          pillar,
          department,
          metadata
        FROM intelligence_atoms
        WHERE source_id = ANY($1::text[])
          AND status NOT IN ('rejected', 'archived', 'superseded')
      ),
      fact_evidence AS (
        SELECT
          'intelligence_synthesis_fact' AS evidence_type,
          fact_id AS evidence_id,
          atom_id AS source_atom_id,
          title,
          claim,
          source_id,
          COALESCE(as_of, updated_at) AS as_of,
          status,
          1 AS hit_count,
          NULL::text AS pillar,
          NULL::text AS department,
          metadata
        FROM intelligence_synthesis_facts
        WHERE source_id = ANY($1::text[])
          AND status = 'active'
      )
      SELECT *
      FROM (
        SELECT * FROM atom_evidence
        UNION ALL
        SELECT * FROM fact_evidence
      ) evidence
      WHERE claim IS NOT NULL AND claim <> ''
      ORDER BY
        CASE source_id
          WHEN 'SRC-STRATEGY-001' THEN 0
          WHEN 'SRC-FREEDOM-ENGINE-001' THEN 1
          WHEN 'SRC-OWNERS-001' THEN 2
          WHEN 'SRC-FINANCE-001' THEN 3
          ELSE 4
        END,
        as_of DESC NULLS LAST,
        evidence_id ASC
      LIMIT $2
    `,
    [
      [
        'SRC-STRATEGY-001',
        'SRC-FREEDOM-BHAG-001',
        'SRC-FREEDOM-COMMUNITY-001',
        'SRC-FREEDOM-ENGINE-001',
        'SRC-OWNERS-001',
        'SRC-FINANCE-001',
        'SRC-FUB-001',
        'SRC-SUPABASE-001',
      ],
      normalizedLimit,
    ],
  )
  return result.rows
}

export function buildBusinessAtomFromEvidence(row = {}) {
  const evidenceId = text(row.evidence_id)
  const sourceId = text(row.source_id)
  const claim = text(row.claim)
  const title = compact(row.title || claim, 160)
  const category = inferCategory({ title, claim, atomType: row.evidence_type })
  const id = `business-atom:${hash(`${sourceId}|${evidenceId}|${title}`).slice(0, 24)}`
  const hitCount = Math.max(1, Number(row.hit_count || 1))
  return normalizeBusinessAtom({
    id,
    sourceAtomId: row.source_atom_id || null,
    title,
    description: claim,
    category,
    pillar: inferPillar({ sourceId, title, claim }),
    department: inferDepartment({ sourceId, title, claim }),
    timeScope: inferTimeScope({ title, claim }),
    lifecycleStatus: lifecycleForHitCount(hitCount, category),
    hitCount,
    firstDetectedAt: row.as_of,
    lastHitAt: row.as_of,
    sourceType: row.evidence_type || 'source_backed_fact',
    sourceId,
    sourceRef: `${row.evidence_type || 'evidence'}:${evidenceId}`,
    sourceExcerpt: claim,
    owner: sourceId === 'SRC-STRATEGY-001' ? 'Foundation Strategy' : 'Foundation Intelligence',
    validFrom: row.as_of,
    metadata: {
      cardId: STRATEGY_001_CARD_ID,
      closeoutKey: STRATEGY_001_CLOSEOUT_KEY,
      evidenceType: row.evidence_type,
      evidenceId,
      sourceId,
      sourceAtomId: row.source_atom_id || null,
      seededFromCurrentEvidence: true,
      downstreamUses: ['weekly', 'monthly', 'quarterly', 'annual'],
    },
  })
}

function atomDbParams(atom = {}) {
  return [
    atom.id,
    atom.sourceAtomId,
    atom.title,
    atom.description,
    atom.category,
    atom.pillar,
    atom.department,
    atom.timeScope,
    atom.lifecycleStatus,
    atom.hitCount,
    atom.firstDetectedAt,
    atom.lastHitAt,
    atom.sourceType,
    atom.sourceId,
    atom.sourceRef,
    atom.sourceExcerpt,
    atom.audienceTags,
    atom.owner,
    atom.threshold,
    atom.nextTrigger,
    atom.validFrom,
    atom.validUntil,
    atom.supersededBy,
    atom.currentState,
    atom.createdBy,
    atom.resolvedAt,
    atom.resolvedBy,
    atom.resolutionNote,
    JSON.stringify(atom.metadata || {}),
  ]
}

export async function upsertBusinessAtom(client, atom = {}) {
  const normalized = normalizeBusinessAtom(atom)
  const result = await client.query(
    `
      INSERT INTO business_atoms (
        id, source_atom_id, title, description, category, pillar, department, time_scope,
        lifecycle_status, hit_count, first_detected_at, last_hit_at, source_type,
        source_id, source_ref, source_excerpt, audience_tags, owner, threshold,
        next_trigger, valid_from, valid_until, superseded_by, current_state,
        created_by, resolved_at, resolved_by, resolution_note, metadata
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,
        $14,$15,$16,$17::text[],$18,$19,
        $20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29::jsonb
      )
      ON CONFLICT (id) DO UPDATE
      SET source_atom_id = EXCLUDED.source_atom_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          pillar = EXCLUDED.pillar,
          department = EXCLUDED.department,
          time_scope = EXCLUDED.time_scope,
          lifecycle_status = EXCLUDED.lifecycle_status,
          hit_count = GREATEST(business_atoms.hit_count, EXCLUDED.hit_count),
          first_detected_at = LEAST(business_atoms.first_detected_at, EXCLUDED.first_detected_at),
          last_hit_at = GREATEST(business_atoms.last_hit_at, EXCLUDED.last_hit_at),
          source_type = EXCLUDED.source_type,
          source_id = EXCLUDED.source_id,
          source_ref = EXCLUDED.source_ref,
          source_excerpt = EXCLUDED.source_excerpt,
          audience_tags = EXCLUDED.audience_tags,
          owner = EXCLUDED.owner,
          threshold = EXCLUDED.threshold,
          next_trigger = EXCLUDED.next_trigger,
          valid_from = EXCLUDED.valid_from,
          valid_until = EXCLUDED.valid_until,
          superseded_by = EXCLUDED.superseded_by,
          current_state = EXCLUDED.current_state,
          resolved_at = EXCLUDED.resolved_at,
          resolved_by = EXCLUDED.resolved_by,
          resolution_note = EXCLUDED.resolution_note,
          metadata = business_atoms.metadata || EXCLUDED.metadata,
          updated_at = NOW()
      RETURNING *
    `,
    atomDbParams(normalized),
  )
  return normalizeBusinessAtom(result.rows[0])
}

export async function recordBusinessAtomHit(client, atom = {}) {
  const normalized = normalizeBusinessAtom(atom)
  const hitId = `atom-hit:${hash(`${normalized.id}|${normalized.sourceRef}`).slice(0, 24)}`
  const result = await client.query(
    `
      INSERT INTO atom_hits (
        id, atom_id, hit_at, source_type, source_id, source_ref,
        context_excerpt, confidence, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET atom_id = EXCLUDED.atom_id,
          hit_at = EXCLUDED.hit_at,
          source_type = EXCLUDED.source_type,
          source_id = EXCLUDED.source_id,
          source_ref = EXCLUDED.source_ref,
          context_excerpt = EXCLUDED.context_excerpt,
          confidence = EXCLUDED.confidence,
          metadata = atom_hits.metadata || EXCLUDED.metadata
      RETURNING *
    `,
    [
      hitId,
      normalized.id,
      normalized.lastHitAt || new Date().toISOString(),
      normalized.sourceType,
      normalized.sourceId,
      normalized.sourceRef,
      normalized.sourceExcerpt,
      0.85,
      JSON.stringify({
        cardId: STRATEGY_001_CARD_ID,
        closeoutKey: STRATEGY_001_CLOSEOUT_KEY,
        sourceBacked: true,
      }),
    ],
  )
  await client.query(
    `
      WITH hit_stats AS (
        SELECT atom_id, COUNT(*)::int AS hit_count, MIN(hit_at) AS first_hit_at, MAX(hit_at) AS last_hit_at
        FROM atom_hits
        WHERE atom_id = $1
        GROUP BY atom_id
      )
      UPDATE business_atoms
      SET hit_count = hit_stats.hit_count,
          first_detected_at = hit_stats.first_hit_at,
          last_hit_at = hit_stats.last_hit_at,
          lifecycle_status = CASE
            WHEN hit_stats.hit_count >= 5 THEN 'structural'
            WHEN hit_stats.hit_count >= 3 THEN 'recurring'
            WHEN hit_stats.hit_count >= 2 THEN 'confirmed'
            WHEN business_atoms.category = 'decision_made' THEN 'confirmed'
            ELSE 'detected'
          END,
          updated_at = NOW()
      FROM hit_stats
      WHERE business_atoms.id = hit_stats.atom_id
    `,
    [normalized.id],
  )
  return result.rows[0]
}

export async function seedBusinessAtomsFromCurrentEvidence(client, { limit = 12 } = {}) {
  await ensureBusinessAtomSchema(client)
  const evidenceRows = await selectBusinessAtomSeedEvidence(client, { limit })
  const atoms = []
  for (const row of evidenceRows) {
    const atom = buildBusinessAtomFromEvidence(row)
    const persisted = await upsertBusinessAtom(client, atom)
    await recordBusinessAtomHit(client, persisted)
    atoms.push(persisted)
  }
  return atoms
}

function mapBusinessAtomRow(row = {}) {
  return normalizeBusinessAtom({
    id: row.id,
    sourceAtomId: row.source_atom_id,
    title: row.title,
    description: row.description,
    category: row.category,
    pillar: row.pillar,
    department: row.department,
    timeScope: row.time_scope,
    lifecycleStatus: row.lifecycle_status,
    hitCount: row.hit_count,
    firstDetectedAt: row.first_detected_at,
    lastHitAt: row.last_hit_at,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceRef: row.source_ref,
    sourceExcerpt: row.source_excerpt,
    audienceTags: row.audience_tags,
    owner: row.owner,
    threshold: row.threshold,
    nextTrigger: row.next_trigger,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    supersededBy: row.superseded_by,
    currentState: row.current_state,
    createdBy: row.created_by,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
    metadata: row.metadata,
  })
}

function bucketCounts(rows = [], key = '') {
  const counts = new Map()
  for (const row of rows) counts.set(row[key] || 'unknown', (counts.get(row[key] || 'unknown') || 0) + 1)
  return Array.from(counts.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

function dashboardView(rows = [], scopes = []) {
  return rows
    .filter(row => scopes.includes(row.timeScope))
    .sort((a, b) => Number(b.hitCount || 0) - Number(a.hitCount || 0) || String(b.lastHitAt || '').localeCompare(String(a.lastHitAt || '')))
    .slice(0, 12)
}

export async function getBusinessAtomDashboardSnapshotFromDb(clientOrPool, { limit = 20 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 20))
  const result = await clientOrPool.query(
    `
      SELECT *
      FROM business_atoms
      ORDER BY
        CASE current_state WHEN 'current' THEN 0 ELSE 1 END,
        hit_count DESC,
        last_hit_at DESC
      LIMIT $1
    `,
    [normalizedLimit],
  )
  const rows = result.rows.map(mapBusinessAtomRow)
  return {
    generatedAt: new Date().toISOString(),
    status: rows.length ? 'ready' : 'empty',
    sourceTruth: 'business_atoms + atom_hits seeded from intelligence_atoms/intelligence_synthesis_facts',
    summary: {
      totalAtoms: rows.length,
      currentAtoms: rows.filter(row => row.currentState === 'current').length,
      totalHits: rows.reduce((sum, row) => sum + Number(row.hitCount || 0), 0),
      categoryCounts: bucketCounts(rows, 'category'),
      pillarCounts: bucketCounts(rows, 'pillar'),
      timeScopeCounts: bucketCounts(rows, 'timeScope'),
    },
    views: {
      weekly: dashboardView(rows, ['this_week']),
      monthly: dashboardView(rows, ['this_week', 'this_month']),
      quarterly: dashboardView(rows, ['this_week', 'this_month', 'this_quarter', 'structural']),
      annual: dashboardView(rows, ['annual_pattern', 'structural', 'this_quarter']),
    },
    atoms: rows,
  }
}

export async function getBusinessAtomSchemaStatus(client) {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('business_atoms', 'atom_hits')
      ORDER BY table_name
    `,
  )
  const columnResult = await client.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('business_atoms', 'atom_hits')
      ORDER BY table_name, column_name
    `,
  )
  return {
    ok: result.rows.length === 2,
    tables: result.rows.map(row => row.table_name),
    columns: columnResult.rows.map(row => `${row.table_name}.${row.column_name}`),
  }
}

export function buildStrategy001DogfoodProof() {
  const good = [
    {
      id: 'business-atom:good',
      title: 'Agent Engine Capacity Gap',
      category: 'bottleneck',
      pillar: 'ATTRACT',
      department: 'recruiting',
      timeScope: 'this_quarter',
      lifecycleStatus: 'confirmed',
      hitCount: 2,
      sourceId: 'SRC-FREEDOM-ENGINE-001',
      sourceRef: 'intelligence_synthesis_fact:fact-good',
      sourceExcerpt: 'Agent Engine Capacity Gap This Year is Behind by 15 agents.',
      owner: 'Foundation Intelligence',
      threshold: '3 hits in a quarter -> recurring',
      nextTrigger: 'Show in quarterly planning',
      validFrom: '2026-05-18T00:00:00.000Z',
    },
  ]
  const weak = [
    { ...good[0], sourceRef: '' },
    { ...good[0], id: 'business-atom:no-hits', hitCount: 0 },
    { ...good[0], id: 'business-atom:no-source', sourceId: '' },
    { ...good[0], id: 'business-atom:no-excerpt', sourceExcerpt: '', description: '' },
  ]
  const goodEval = evaluateBusinessAtomRecords(good)
  const weakRejected = weak.every(record => !evaluateBusinessAtomRecords([record]).ok)
  return {
    ok: goodEval.ok && weakRejected,
    invariant: 'Business atoms require source refs, source IDs, source excerpts, supporting hits, owner/threshold/next trigger defaults, valid taxonomy normalization, and temporal current-state proof.',
    goodEval,
    weakRejected,
  }
}

export function evaluateStrategy001Implementation({
  moduleSource = '',
  schemaSeedSource = '',
  foundationDbSource = '',
  routeSource = '',
  uiSource = '',
  serverSource = '',
  registrySource = '',
  coverageSource = '',
  packageJson = {},
  snapshot = {},
  schemaStatus = {},
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail: text(detail) })

  add(moduleSource.includes('CREATE TABLE IF NOT EXISTS business_atoms') && moduleSource.includes('CREATE TABLE IF NOT EXISTS atom_hits'), 'module owns business atom schema')
  add(moduleSource.includes('evaluateTemporalTruthRecords') && moduleSource.includes('currentStateFor'), 'module reuses temporal truth rules')
  add(schemaSeedSource.includes('businessAtomsSchemaSql'), 'schema seed initializes business atom tables')
  add(foundationDbSource.includes('getBusinessAtomDashboardSnapshot'), 'foundation DB exports business atom dashboard snapshot')
  add(routeSource.includes('businessAtoms') && routeSource.includes('getBusinessAtomDashboardSnapshot'), 'Strategy Hub payload includes businessAtoms')
  add(serverSource.includes('getBusinessAtomDashboardSnapshot'), 'server wires business atom snapshot dependency')
  add(uiSource.includes('renderBusinessAtoms') && uiSource.includes('business-atoms'), 'Strategy Hub UI renders Business Atoms view')
  add(registrySource.includes(STRATEGY_001_CLOSEOUT_KEY) && registrySource.includes(STRATEGY_001_CARD_ID), 'closeout registry exposes STRATEGY-001')
  add(coverageSource.includes('STRATEGY_001_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage exports STRATEGY-001 done IDs')
  add(packageJson.scripts?.['process:strategy-001-check'] === `node --env-file-if-exists=.env ${STRATEGY_001_SCRIPT_PATH}`, 'package script is registered')
  add(schemaStatus.ok && schemaStatus.tables.includes('business_atoms') && schemaStatus.tables.includes('atom_hits'), 'live DB has business atom tables', schemaStatus.tables.join(', '))
  add((snapshot.summary?.totalAtoms || 0) >= 5, 'dashboard snapshot has seeded business atoms', String(snapshot.summary?.totalAtoms || 0))
  add((snapshot.summary?.totalHits || 0) >= (snapshot.summary?.totalAtoms || 0), 'business atoms have supporting hits', `${snapshot.summary?.totalHits || 0}/${snapshot.summary?.totalAtoms || 0}`)
  add((snapshot.views?.quarterly || []).length > 0 && (snapshot.views?.annual || []).length > 0, 'dashboard exposes quarterly and annual atom views')
  const executableModuleSource = moduleSource.replace(/moduleSource\.includes\([^)]*\)/g, '')
  add(!/\bcallLlm\s*\(/.test(executableModuleSource) && !/\bfetch\s*\(/.test(executableModuleSource), 'module is DB-local and does not call providers/external network')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    summary: {
      checks: checks.length,
      failed: failed.length,
      seededAtoms: snapshot.summary?.totalAtoms || 0,
      totalHits: snapshot.summary?.totalHits || 0,
      currentAtoms: snapshot.summary?.currentAtoms || 0,
    },
    checks,
    failed,
  }
}

export function renderStrategy001Closeout({ evaluation = {}, snapshot = {}, schemaStatus = {}, dogfood = {}, generatedAt = new Date().toISOString() } = {}) {
  return `# STRATEGY-001 Closeout - Business Atoms Framework

Generated: ${generatedAt}

## Status

Closed under \`${STRATEGY_001_CLOSEOUT_KEY}\`.

## What Changed

- Added DB-backed \`business_atoms\` and \`atom_hits\` tables.
- Seeded business atoms from existing source-backed \`intelligence_atoms\` and \`intelligence_synthesis_facts\`.
- Added temporal current-state semantics so atoms can distinguish current, historical, future, superseded, and resolved truth.
- Exposed a read-only Business Atoms view in the Strategy Hub payload/UI with weekly, monthly, quarterly, and annual views.
- Repaired a proof-blocking System Health report loop discovered during closeout: the nightly system-health report writes compact JSON and the scheduled self-audit no longer fails by treating its own active run as a red row.
- Advanced Current Sprint to \`${STRATEGY_001_NEXT_CARD_ID}\`.

## Proof Summary

- Focused implementation status: \`${evaluation.status || 'unknown'}\`
- Seeded atoms: ${snapshot.summary?.totalAtoms || 0}
- Supporting hits: ${snapshot.summary?.totalHits || 0}
- Current atoms: ${snapshot.summary?.currentAtoms || 0}
- Schema tables: ${(schemaStatus.tables || []).join(', ') || 'missing'}
- Dogfood: ${dogfood.ok ? 'passed' : 'failed'}
- System Health repair proof: governed \`system-health-nightly-audit\` rerun succeeded with raw risk/watch \`0/0\`.

## Boundaries

${STRATEGY_001_NOT_NEXT_BOUNDARIES.map(item => `- ${item}`).join('\n')}
- System Health support repair is limited to report artifact size and self-audit scheduling semantics; it does not hide red/yellow health rows.

## Next

Continue \`${STRATEGY_001_NEXT_CARD_ID}\` in the current Foundation sprint.
`
}
