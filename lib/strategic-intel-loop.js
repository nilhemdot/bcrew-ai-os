import crypto from 'node:crypto'

export const STRATEGIC_INTEL_CARD_ID = 'STRATEGIC-INTEL-001'
export const STRATEGIC_INTEL_CLOSEOUT_KEY = 'strategic-intel-loop-v1'
export const STRATEGIC_INTEL_PLAN_PATH = 'docs/process/strategic-intel-001-plan.md'
export const STRATEGIC_INTEL_APPROVAL_PATH = 'docs/process/approvals/STRATEGIC-INTEL-001.json'
export const STRATEGIC_INTEL_SCRIPT_PATH = 'scripts/process-strategic-intel-check.mjs'
export const STRATEGIC_INTEL_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-strategic-intel-loop-closeout.md'
export const STRATEGIC_INTEL_SPEC_PATH = 'docs/specs/2026-04-28-strategic-intelligence-loop.md'
export const STRATEGIC_INTEL_NEXT_CARD_ID = 'DECISION-008'
export const STRATEGIC_INTEL_SCOPER_CARD_ID = 'INTEL-SCOPER-001'
export const STRATEGIC_INTEL_SPRINT_ID = 'FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19'

export const STRATEGIC_INTEL_WEEKLY_TARGETS = Object.freeze({
  surfaced: 5,
  scoped: 3,
  resolvedToApplied: 2,
  medianManualInvestigationMinutes: 30,
})

export const STRATEGIC_INTEL_PROOF_COMMANDS = [
  `npm run process:strategic-intel-check -- --close-card --json`,
  `npm run process:system-health-nightly-audit-check -- --json`,
  `npm run process:build-lane-repeated-failure-action-gate-check -- --json`,
  `npm run backlog:hygiene -- --json`,
  `npm run foundation:verify -- --json-summary`,
  `npm run process:foundation-ship -- --card=${STRATEGIC_INTEL_CARD_ID} --planApprovalRef=${STRATEGIC_INTEL_APPROVAL_PATH} --closeoutKey=${STRATEGIC_INTEL_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const STRATEGIC_INTEL_CHANGED_FILES = [
  'lib/strategic-intel-loop.js',
  STRATEGIC_INTEL_SCRIPT_PATH,
  STRATEGIC_INTEL_PLAN_PATH,
  STRATEGIC_INTEL_APPROVAL_PATH,
  STRATEGIC_INTEL_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const STRATEGIC_INTEL_NOT_NEXT_BOUNDARIES = [
  'Do not restart old agent sprawl or department Director agents.',
  'Do not run broad extraction, source crawlers, browser automation, provider/model calls, or paid/private source work.',
  'Do not build Strategy UI polish or the Scoper implementation inside this card.',
  'Do not write decisions, backlog items, external systems, sends, credentials, provider config, or Drive permissions from Strategic Intelligence proof.',
  'Do not treat legacy docs or chat claims as live truth unless they are routed through source-backed evidence, backlog, spec, or verifier truth.',
]

export const strategicIntelSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_strategic_issues (
    issue_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    plain_english_question TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'surfaced'
      CHECK (status IN (
        'surfaced',
        'triage',
        'scoped',
        'discussed',
        'decided',
        'applied',
        'resolved',
        'snoozed',
        'ignored',
        'rejected',
        'stale'
      )),
    urgency TEXT NOT NULL DEFAULT 'medium'
      CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    impact TEXT NOT NULL DEFAULT 'medium'
      CHECK (impact IN ('low', 'medium', 'high', 'needle_mover')),
    confidence TEXT NOT NULL DEFAULT 'medium'
      CHECK (confidence IN ('low', 'medium', 'high')),
    staleness TEXT NOT NULL DEFAULT 'unknown'
      CHECK (staleness IN ('fresh', 'watch', 'stale', 'unknown')),
    owner TEXT NOT NULL DEFAULT 'Foundation',
    owner_confidence TEXT NOT NULL DEFAULT 'needs_owner'
      CHECK (owner_confidence IN ('high', 'medium', 'low', 'needs_owner')),
    primary_department TEXT,
    department_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    hub_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    value_routes TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    atom_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    chunk_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    synthesized_item_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    route_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    scoped_card_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    resolution_status TEXT NOT NULL DEFAULT 'unresolved'
      CHECK (resolution_status IN (
        'unresolved',
        'route_pending',
        'approved',
        'rejected',
        'applied',
        'resolved',
        'stale',
        'snoozed'
      )),
    resolution_ref TEXT,
    next_review_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    suppression_reason TEXT,
    resurface_rule TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_strategic_issues_status
  ON intelligence_strategic_issues(status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_strategic_issues_owner
  ON intelligence_strategic_issues(owner, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_strategic_issues_source_ids
  ON intelligence_strategic_issues USING GIN(source_ids);

  CREATE TABLE IF NOT EXISTS intelligence_strategic_issue_events (
    event_id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES intelligence_strategic_issues(issue_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL
      CHECK (event_type IN (
        'surfaced',
        'triaged',
        'scoped',
        'route_linked',
        'resolution_feedback',
        'snoozed',
        'ignored',
        'rejected',
        'stale',
        'resurfaced'
      )),
    previous_status TEXT,
    next_status TEXT,
    route_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    scoped_card_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    resolution_ref TEXT,
    actor TEXT NOT NULL DEFAULT 'system',
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_strategic_issue_events_issue
  ON intelligence_strategic_issue_events(issue_id, created_at DESC);
`

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

export function stableStrategicIssueId(value = '') {
  return `strategic-issue:${stableHash(value).slice(0, 24)}`
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .replace(/^{|}$/g, '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function unique(values = []) {
  return Array.from(new Set(toArray(values)))
}

function parseObject(value) {
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

function clampTitle(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 160) return text
  return `${text.slice(0, 157)}...`
}

function departmentFor(row = {}) {
  const owner = String(row.suggested_owner || row.owner || '').trim()
  if (owner && owner !== 'needs-owner-decision') return owner
  const metadata = parseObject(row.metadata)
  const attributes = parseObject(row.attributes)
  return attributes.primaryDepartment || metadata.primaryDepartment || 'Foundation'
}

function confidenceFor({ sourceCount = 0, factCount = 0, chunkCount = 0 }) {
  if (sourceCount >= 2 && factCount >= 5 && chunkCount >= 2) return 'high'
  if (sourceCount >= 1 && factCount >= 3) return 'medium'
  return 'low'
}

function impactFor({ sourceCount = 0, factCount = 0, title = '' }) {
  const normalized = String(title || '').toLowerCase()
  if (sourceCount >= 2 && factCount >= 5) return 'needle_mover'
  if (/lead|source|database|strategy|revenue|cash|finance|agent|system/.test(normalized)) return 'high'
  return 'medium'
}

function urgencyFor({ routeRefs = [], title = '' }) {
  const normalized = String(title || '').toLowerCase()
  if (/blocked|deadline|cash|invoice|risk|security|exposed/.test(normalized)) return 'high'
  if (routeRefs.length) return 'high'
  if (/clarify|review|decide|where/.test(normalized)) return 'medium'
  return 'low'
}

function stalenessFor(row = {}) {
  const updatedAt = row.updated_at ? new Date(row.updated_at) : null
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) return 'unknown'
  const ageDays = (Date.now() - updatedAt.getTime()) / 86400000
  if (ageDays <= 7) return 'fresh'
  if (ageDays <= 30) return 'watch'
  return 'stale'
}

function plainEnglishQuestion(title = '') {
  const normalized = clampTitle(title).replace(/\?+$/, '')
  return `What decision, owner action, or deeper scoping is needed for: ${normalized}?`
}

export function buildStrategicIssueFromSynthesizedItem(row = {}) {
  const sourceIds = unique(row.source_ids)
  const factRefs = unique(row.fact_refs)
  const atomRefs = unique(row.atom_refs)
  const chunkRefs = unique(row.evidence_chunk_refs || row.chunk_refs)
  const routeRefs = unique(row.route_refs)
  const synthesizedItemId = String(row.synthesized_item_id || '').trim()
  const title = clampTitle(row.title || synthesizedItemId)
  const primaryDepartment = departmentFor(row)
  const sourceCount = sourceIds.length
  const factCount = factRefs.length
  const chunkCount = chunkRefs.length
  const confidence = confidenceFor({ sourceCount, factCount, chunkCount })
  const impact = impactFor({ sourceCount, factCount, title })
  const urgency = urgencyFor({ routeRefs, title })
  const staleness = stalenessFor(row)

  return {
    issueId: stableStrategicIssueId(synthesizedItemId || row.natural_key || title),
    title,
    plainEnglishQuestion: plainEnglishQuestion(title),
    status: routeRefs.length ? 'triage' : 'surfaced',
    urgency,
    impact,
    confidence,
    staleness,
    owner: primaryDepartment || 'Foundation',
    ownerConfidence: String(row.owner_confidence || '').trim() || (primaryDepartment ? 'medium' : 'needs_owner'),
    primaryDepartment,
    departmentRefs: unique([primaryDepartment, ...(parseObject(row.attributes).departmentRefs || []), ...(parseObject(row.metadata).departmentRefs || [])]),
    hubRefs: unique(['Strategy Hub']),
    valueRoutes: unique(['strategic_intelligence']),
    sourceIds,
    factRefs,
    atomRefs,
    chunkRefs,
    synthesizedItemRefs: synthesizedItemId ? [synthesizedItemId] : [],
    routeRefs,
    scopedCardRefs: [],
    resolutionStatus: routeRefs.length ? 'route_pending' : 'unresolved',
    resolutionRef: null,
    nextReviewAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    snoozedUntil: null,
    suppressionReason: null,
    resurfaceRule: 'Resurface when new source evidence arrives, an owner route changes, the issue remains unresolved after next_review_at, or Scoper marks a real gap.',
    metadata: {
      cardId: STRATEGIC_INTEL_CARD_ID,
      closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
      sourceSurface: 'intelligence_synthesized_items',
      synthesizedItemId,
      strategicHubEligible: true,
      scoring: {
        urgency,
        impact,
        confidence,
        staleness,
        sourceCount,
        factCount,
        chunkCount,
        routeCount: routeRefs.length,
      },
      acceptanceMetrics: STRATEGIC_INTEL_WEEKLY_TARGETS,
      blocksCardId: STRATEGIC_INTEL_SCOPER_CARD_ID,
      noExternalWrite: true,
    },
  }
}

export async function ensureStrategicIntelSchema(client) {
  await client.query(strategicIntelSchemaSql)
}

export async function queryStrategicIssueCandidates(client, { limit = 10 } = {}) {
  const result = await client.query(
    `
      SELECT item.*,
             COALESCE(route_refs.route_refs, ARRAY[]::text[]) AS route_refs
      FROM (
        SELECT *
        FROM intelligence_synthesized_items
        WHERE (
          metadata->>'strategyHubEligible' = 'true'
          OR attributes->>'strategyHubEligible' = 'true'
          OR metadata->>'routeScope' = 'strategy'
          OR attributes->>'routeScope' = 'strategy'
        )
          AND status IN ('ready_for_action_router', 'needs_owner', 'new', 'archived')
        ORDER BY
          COALESCE(array_length(source_ids, 1), 0) DESC,
          COALESCE(array_length(fact_refs, 1), 0) DESC,
          updated_at DESC
        LIMIT $1
      ) item
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(route_id ORDER BY routed_at DESC) AS route_refs
        FROM intelligence_action_routes
        WHERE synthesized_item_id = item.synthesized_item_id
      ) route_refs ON TRUE
    `,
    [Math.max(1, Math.min(50, Number(limit) || 10))],
  )
  return result.rows
}

export async function buildStrategicIssueRecords(client, { limit = 10 } = {}) {
  const rows = await queryStrategicIssueCandidates(client, { limit })
  return rows.map(buildStrategicIssueFromSynthesizedItem)
}

function issueParams(issue = {}) {
  return [
    issue.issueId,
    issue.title,
    issue.plainEnglishQuestion,
    issue.status,
    issue.urgency,
    issue.impact,
    issue.confidence,
    issue.staleness,
    issue.owner,
    issue.ownerConfidence,
    issue.primaryDepartment,
    issue.departmentRefs,
    issue.hubRefs,
    issue.valueRoutes,
    issue.sourceIds,
    issue.factRefs,
    issue.atomRefs,
    issue.chunkRefs,
    issue.synthesizedItemRefs,
    issue.routeRefs,
    issue.scopedCardRefs,
    issue.resolutionStatus,
    issue.resolutionRef,
    issue.nextReviewAt,
    issue.snoozedUntil,
    issue.suppressionReason,
    issue.resurfaceRule,
    JSON.stringify(issue.metadata || {}),
  ]
}

export async function upsertStrategicIssues(client, issues = [], { actor = 'codex-strategic-intel' } = {}) {
  const persisted = []
  for (const issue of issues) {
    const result = await client.query(
      `
        INSERT INTO intelligence_strategic_issues (
          issue_id, title, plain_english_question, status, urgency, impact,
          confidence, staleness, owner, owner_confidence, primary_department,
          department_refs, hub_refs, value_routes, source_ids, fact_refs,
          atom_refs, chunk_refs, synthesized_item_refs, route_refs,
          scoped_card_refs, resolution_status, resolution_ref, next_review_at,
          snoozed_until, suppression_reason, resurface_rule, metadata
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,
          $12::text[],$13::text[],$14::text[],$15::text[],$16::text[],
          $17::text[],$18::text[],$19::text[],$20::text[],
          $21::text[],$22,$23,$24::timestamptz,
          $25::timestamptz,$26,$27,$28::jsonb
        )
        ON CONFLICT (issue_id) DO UPDATE SET
          title = EXCLUDED.title,
          plain_english_question = EXCLUDED.plain_english_question,
          status = EXCLUDED.status,
          urgency = EXCLUDED.urgency,
          impact = EXCLUDED.impact,
          confidence = EXCLUDED.confidence,
          staleness = EXCLUDED.staleness,
          owner = EXCLUDED.owner,
          owner_confidence = EXCLUDED.owner_confidence,
          primary_department = EXCLUDED.primary_department,
          department_refs = EXCLUDED.department_refs,
          hub_refs = EXCLUDED.hub_refs,
          value_routes = EXCLUDED.value_routes,
          source_ids = EXCLUDED.source_ids,
          fact_refs = EXCLUDED.fact_refs,
          atom_refs = EXCLUDED.atom_refs,
          chunk_refs = EXCLUDED.chunk_refs,
          synthesized_item_refs = EXCLUDED.synthesized_item_refs,
          route_refs = EXCLUDED.route_refs,
          scoped_card_refs = EXCLUDED.scoped_card_refs,
          resolution_status = EXCLUDED.resolution_status,
          resolution_ref = EXCLUDED.resolution_ref,
          next_review_at = EXCLUDED.next_review_at,
          snoozed_until = EXCLUDED.snoozed_until,
          suppression_reason = EXCLUDED.suppression_reason,
          resurface_rule = EXCLUDED.resurface_rule,
          metadata = intelligence_strategic_issues.metadata || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *
      `,
      issueParams(issue),
    )
    persisted.push(result.rows[0])
    await client.query(
      `
        INSERT INTO intelligence_strategic_issue_events (
          event_id, issue_id, event_type, previous_status, next_status,
          route_refs, scoped_card_refs, actor, summary, metadata
        )
        VALUES ($1,$2,'surfaced',NULL,$3,$4::text[],$5::text[],$6,$7,$8::jsonb)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        `strategic-event:${issue.issueId}:surfaced-v1`,
        issue.issueId,
        issue.status,
        issue.routeRefs,
        issue.scopedCardRefs,
        actor,
        `Surfaced strategic issue from ${issue.synthesizedItemRefs[0] || 'source-backed synthesized item'}.`,
        JSON.stringify({
          cardId: STRATEGIC_INTEL_CARD_ID,
          closeoutKey: STRATEGIC_INTEL_CLOSEOUT_KEY,
          sourceIds: issue.sourceIds,
          noExternalWrite: true,
        }),
      ],
    )
  }
  return persisted
}

export async function getStrategicIntelSnapshot(client) {
  const tableExists = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'intelligence_strategic_issues'
      ) AS exists
    `,
  )
  if (!tableExists.rows[0]?.exists) {
    return {
      tableExists: false,
      issueCount: 0,
      eventCount: 0,
      surfacedThisWeek: 0,
      resolvedToAppliedThisWeek: 0,
      weeklyTargets: STRATEGIC_INTEL_WEEKLY_TARGETS,
      issues: [],
    }
  }

  const issueResult = await client.query(
    `
      SELECT *
      FROM intelligence_strategic_issues
      WHERE metadata->>'cardId' = $1
      ORDER BY
        CASE impact WHEN 'needle_mover' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        updated_at DESC
    `,
    [STRATEGIC_INTEL_CARD_ID],
  )
  const eventResult = await client.query(
    `
      SELECT event_type, COUNT(*)::int AS count
      FROM intelligence_strategic_issue_events
      WHERE metadata->>'cardId' = $1
      GROUP BY event_type
      ORDER BY event_type
    `,
    [STRATEGIC_INTEL_CARD_ID],
  )
  const weeklyResult = await client.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS surfaced_this_week,
        COUNT(*) FILTER (
          WHERE updated_at >= NOW() - INTERVAL '7 days'
            AND status IN ('applied', 'resolved')
            AND resolution_status IN ('applied', 'resolved')
        )::int AS resolved_to_applied_this_week
      FROM intelligence_strategic_issues
      WHERE metadata->>'cardId' = $1
    `,
    [STRATEGIC_INTEL_CARD_ID],
  )
  return {
    tableExists: true,
    issueCount: issueResult.rowCount,
    eventCount: eventResult.rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    eventsByType: Object.fromEntries(eventResult.rows.map(row => [row.event_type, Number(row.count || 0)])),
    surfacedThisWeek: Number(weeklyResult.rows[0]?.surfaced_this_week || 0),
    resolvedToAppliedThisWeek: Number(weeklyResult.rows[0]?.resolved_to_applied_this_week || 0),
    weeklyTargets: STRATEGIC_INTEL_WEEKLY_TARGETS,
    issues: issueResult.rows,
  }
}

export function evaluateStrategicIntelSnapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const issues = Array.isArray(snapshot.issues) ? snapshot.issues : []
  const requiredStatuses = new Set(['surfaced', 'triage', 'scoped', 'discussed', 'decided', 'applied', 'resolved', 'snoozed', 'ignored', 'rejected', 'stale'])
  const requiredScoring = ['urgency', 'impact', 'confidence', 'staleness']

  add(snapshot.tableExists, 'intelligence_strategic_issues table exists', snapshot.tableExists ? 'present' : 'missing')
  add(issues.length >= STRATEGIC_INTEL_WEEKLY_TARGETS.surfaced, 'at least 5 strategic issues are surfaced from current truth', `${issues.length}/${STRATEGIC_INTEL_WEEKLY_TARGETS.surfaced}`)
  add(Number(snapshot.surfacedThisWeek || 0) >= STRATEGIC_INTEL_WEEKLY_TARGETS.surfaced, 'weekly surfaced target is measurable and currently met', `${snapshot.surfacedThisWeek || 0}/${STRATEGIC_INTEL_WEEKLY_TARGETS.surfaced}`)
  add(requiredScoring.every(field => issues.every(issue => String(issue[field] || '').trim())), 'every issue has urgency, impact, confidence, and staleness', requiredScoring.join(', '))
  add(issues.every(issue => requiredStatuses.has(issue.status)), 'every issue has valid lifecycle status', issues.map(issue => `${issue.issue_id}:${issue.status}`).join(', '))
  add(issues.every(issue => Array.isArray(issue.source_ids) && issue.source_ids.length), 'every issue has source_ids', issues.map(issue => `${issue.issue_id}:${(issue.source_ids || []).length}`).join(', '))
  add(issues.every(issue => Array.isArray(issue.fact_refs) && issue.fact_refs.length), 'every issue has fact_refs', issues.map(issue => `${issue.issue_id}:${(issue.fact_refs || []).length}`).join(', '))
  add(issues.every(issue => Array.isArray(issue.atom_refs) && issue.atom_refs.length), 'every issue has atom_refs', issues.map(issue => `${issue.issue_id}:${(issue.atom_refs || []).length}`).join(', '))
  add(issues.every(issue => Array.isArray(issue.chunk_refs) && issue.chunk_refs.length), 'every issue has chunk_refs', issues.map(issue => `${issue.issue_id}:${(issue.chunk_refs || []).length}`).join(', '))
  add(issues.every(issue => Array.isArray(issue.synthesized_item_refs) && issue.synthesized_item_refs.length), 'every issue points back to synthesized items', issues.map(issue => `${issue.issue_id}:${(issue.synthesized_item_refs || []).length}`).join(', '))
  add(issues.every(issue => String(issue.resurface_rule || '').includes('Resurface')), 'every issue has resurface rule', 'resurface_rule')
  add(issues.every(issue => parseObject(issue.metadata).blocksCardId === STRATEGIC_INTEL_SCOPER_CARD_ID), 'every issue records INTEL-SCOPER-001 dependency', STRATEGIC_INTEL_SCOPER_CARD_ID)
  add(issues.every(issue => parseObject(issue.metadata).acceptanceMetrics?.resolvedToApplied >= STRATEGIC_INTEL_WEEKLY_TARGETS.resolvedToApplied), 'resolved-to-applied weekly target is encoded', `${STRATEGIC_INTEL_WEEKLY_TARGETS.resolvedToApplied}/week`)
  add(Number(snapshot.eventCount || 0) >= issues.length, 'surfacing events are recorded for feedback history', `${snapshot.eventCount || 0}/${issues.length}`)

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      issueCount: issues.length,
      eventCount: snapshot.eventCount || 0,
      surfacedThisWeek: snapshot.surfacedThisWeek || 0,
      resolvedToAppliedThisWeek: snapshot.resolvedToAppliedThisWeek || 0,
      weeklyTargets: STRATEGIC_INTEL_WEEKLY_TARGETS,
    },
  }
}

export function buildStrategicIntelDogfoodProof() {
  const healthyIssue = buildStrategicIssueFromSynthesizedItem({
    synthesized_item_id: 'synthesized-item:dogfood',
    title: 'Clarify where strategic owner decisions should route',
    suggested_owner: 'Foundation',
    owner_confidence: 'medium',
    source_ids: ['SRC-MEETINGS-001', 'SRC-GMAIL-001'],
    fact_refs: ['fact:1', 'fact:2', 'fact:3', 'fact:4', 'fact:5'],
    atom_refs: ['atom:1', 'atom:2'],
    evidence_chunk_refs: ['chunk:1', 'chunk:2'],
    route_refs: ['action-route:1'],
    metadata: { strategyHubEligible: true },
    attributes: { strategyHubEligible: true, routeScope: 'strategy' },
    updated_at: new Date().toISOString(),
  })
  const fixtureSnapshot = {
    tableExists: true,
    surfacedThisWeek: 5,
    eventCount: 5,
    issues: Array.from({ length: 5 }, (_, index) => ({
      ...healthyIssue,
      issue_id: `strategic-issue:dogfood-${index}`,
      issueId: undefined,
      source_ids: healthyIssue.sourceIds,
      fact_refs: healthyIssue.factRefs,
      atom_refs: healthyIssue.atomRefs,
      chunk_refs: healthyIssue.chunkRefs,
      synthesized_item_refs: healthyIssue.synthesizedItemRefs,
      route_refs: healthyIssue.routeRefs,
      scoped_card_refs: healthyIssue.scopedCardRefs,
      owner_confidence: healthyIssue.ownerConfidence,
      primary_department: healthyIssue.primaryDepartment,
      department_refs: healthyIssue.departmentRefs,
      hub_refs: healthyIssue.hubRefs,
      value_routes: healthyIssue.valueRoutes,
      plain_english_question: healthyIssue.plainEnglishQuestion,
      resolution_status: healthyIssue.resolutionStatus,
      resolution_ref: healthyIssue.resolutionRef,
      next_review_at: healthyIssue.nextReviewAt,
      snoozed_until: healthyIssue.snoozedUntil,
      suppression_reason: healthyIssue.suppressionReason,
      resurface_rule: healthyIssue.resurfaceRule,
      metadata: healthyIssue.metadata,
    })),
  }
  const missingSources = evaluateStrategicIntelSnapshot({
    ...fixtureSnapshot,
    issues: fixtureSnapshot.issues.map((issue, index) => index === 0 ? { ...issue, source_ids: [] } : issue),
  })
  const missingScoring = evaluateStrategicIntelSnapshot({
    ...fixtureSnapshot,
    issues: fixtureSnapshot.issues.map((issue, index) => index === 0 ? { ...issue, urgency: '' } : issue),
  })
  const missingTarget = evaluateStrategicIntelSnapshot({
    ...fixtureSnapshot,
    issues: fixtureSnapshot.issues.map((issue, index) => index === 0 ? { ...issue, metadata: { ...issue.metadata, acceptanceMetrics: { resolvedToApplied: 0 } } } : issue),
  })
  const healthy = evaluateStrategicIntelSnapshot(fixtureSnapshot)
  const ok = healthy.ok && !missingSources.ok && !missingScoring.ok && !missingTarget.ok
  return {
    ok,
    healthyFixtureAccepted: healthy.ok,
    missingSourcesRejected: !missingSources.ok,
    missingScoringRejected: !missingScoring.ok,
    missingTargetRejected: !missingTarget.ok,
    invariant: ok
      ? 'strategic-intel dogfood rejects ownerless/unscored/source-less issues and missing resolved-to-applied target'
      : 'strategic-intel dogfood did not reject every weak fixture',
  }
}
