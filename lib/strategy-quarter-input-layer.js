import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

export const STRATEGY_QUARTER_CARD_ID = 'STRATEGY-QUARTER-001'
export const STRATEGY_QUARTER_CLOSEOUT_KEY = 'strategy-quarter-input-layer-v1'
export const STRATEGY_QUARTER_PLAN_PATH = 'docs/process/strategy-quarter-001-plan.md'
export const STRATEGY_QUARTER_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-QUARTER-001.json'
export const STRATEGY_QUARTER_SCRIPT_PATH = 'scripts/process-strategy-quarter-check.mjs'
export const STRATEGY_QUARTER_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-strategy-quarter-input-layer-closeout.md'
export const STRATEGY_QUARTER_NEXT_CARD_ID = 'STRATEGY-003'
export const STRATEGY_QUARTER_SOURCE_ID = 'SRC-STRATEGY-QUARTER-001'

export const STRATEGY_QUARTER_PROOF_COMMANDS = [
  'node --check lib/strategy-quarter-input-layer.js lib/strategy-shared-comms-routes.js public/strategic-execution.js scripts/process-strategy-quarter-check.mjs',
  'npm run process:strategy-quarter-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${STRATEGY_QUARTER_CARD_ID} --planApprovalRef=${STRATEGY_QUARTER_APPROVAL_PATH} --closeoutKey=${STRATEGY_QUARTER_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${STRATEGY_QUARTER_CARD_ID} --closeoutKey=${STRATEGY_QUARTER_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${STRATEGY_QUARTER_CARD_ID} --planApprovalRef=${STRATEGY_QUARTER_APPROVAL_PATH} --closeoutKey=${STRATEGY_QUARTER_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const STRATEGY_QUARTER_CHANGED_FILES = [
  'lib/strategy-quarter-input-layer.js',
  'lib/strategy-shared-comms-routes.js',
  'public/strategic-execution.js',
  STRATEGY_QUARTER_SCRIPT_PATH,
  STRATEGY_QUARTER_PLAN_PATH,
  STRATEGY_QUARTER_APPROVAL_PATH,
  STRATEGY_QUARTER_CLOSEOUT_PATH,
  'lib/source-contracts.js',
  'lib/source-lifecycle-completion.js',
  'lib/source-contract-validation-layer.js',
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const STRATEGY_QUARTER_NOT_NEXT_BOUNDARIES = [
  'Do not treat prior-quarter docs as current-quarter signed-off truth.',
  'Do not run Drive extraction, browser automation, provider/model calls, paid-source work, or broad private extraction.',
  'Do not send messages, mutate external systems, mutate Drive permissions, rotate credentials, or change provider config.',
  'Do not auto-apply Strategy decisions or action routes.',
  'Do not build STRATEGY-003 or broader Strategy UI expansion inside this card.',
]

export const strategyQuarterSchemaSql = `
  CREATE TABLE IF NOT EXISTS strategy_quarter_contexts (
    quarter_key TEXT PRIMARY KEY,
    source_id TEXT NOT NULL DEFAULT 'SRC-STRATEGY-QUARTER-001'
      REFERENCES source_contract_registry(source_id),
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('draft', 'active', 'archived')),
    theme TEXT NOT NULL,
    critical_number TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planning_status TEXT NOT NULL DEFAULT 'needs_owner_update'
      CHECK (planning_status IN ('needs_owner_update', 'draft', 'review_ready', 'approved', 'stale')),
    issue_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    decision_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    open_question_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    prework_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    weekly_review_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    followup_route_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT NOT NULL DEFAULT 'system'
  );

  CREATE INDEX IF NOT EXISTS idx_strategy_quarter_contexts_status
  ON strategy_quarter_contexts(status, updated_at DESC);

  CREATE TABLE IF NOT EXISTS strategy_quarter_targets (
    target_id TEXT PRIMARY KEY,
    quarter_key TEXT NOT NULL REFERENCES strategy_quarter_contexts(quarter_key) ON DELETE CASCADE,
    department TEXT NOT NULL DEFAULT 'Strategy',
    owner TEXT NOT NULL DEFAULT 'Strategy',
    title TEXT NOT NULL,
    metric_label TEXT,
    target_value TEXT,
    current_value TEXT,
    status TEXT NOT NULL DEFAULT 'watch'
      CHECK (status IN ('draft', 'active', 'watch', 'blocked', 'done')),
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_strategy_quarter_targets_quarter
  ON strategy_quarter_targets(quarter_key, sort_order ASC);

  CREATE TABLE IF NOT EXISTS strategy_quarter_review_outputs (
    output_id TEXT PRIMARY KEY,
    quarter_key TEXT NOT NULL REFERENCES strategy_quarter_contexts(quarter_key) ON DELETE CASCADE,
    output_type TEXT NOT NULL
      CHECK (output_type IN ('prework', 'weekly_review', 'issue_followup', 'decision_followup', 'route_followup')),
    title TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT 'Strategy',
    status TEXT NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'review', 'resolved', 'snoozed', 'rejected')),
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    evidence_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    route_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    issue_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    decision_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    open_question_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_strategy_quarter_review_outputs_quarter
  ON strategy_quarter_review_outputs(quarter_key, status, output_type);
`

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function idFor(prefix, seed) {
  return `${prefix}:${stableHash(seed).slice(0, 24)}`
}

function normalizeText(value = '', fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function normalizeArray(value) {
  if (Array.isArray(value)) return [...new Set(value.map(item => normalizeText(item)).filter(Boolean))]
  if (!value) return []
  return [...new Set(String(value).replace(/^{|}$/g, '').split(',').map(item => normalizeText(item)).filter(Boolean))]
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

function todayIso() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function resolveBcrewQuarter(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year' || part.type === 'month') acc[part.type] = Number(part.value)
    return acc
  }, {})

  const month = parts.month
  const year = parts.year
  if (month === 1) {
    return {
      quarter: 'Q4',
      year: year - 1,
      quarterKey: `bcrew-q4-${year - 1}`,
      label: `Q4 ${year - 1} (Nov-Jan)`,
      startDate: isoDate(year - 1, 11, 1),
      endDate: isoDate(year, 1, 31),
    }
  }
  if (month >= 2 && month <= 4) {
    return {
      quarter: 'Q1',
      year,
      quarterKey: `bcrew-q1-${year}`,
      label: `Q1 ${year} (Feb-Apr)`,
      startDate: isoDate(year, 2, 1),
      endDate: isoDate(year, 4, 30),
    }
  }
  if (month >= 5 && month <= 7) {
    return {
      quarter: 'Q2',
      year,
      quarterKey: `bcrew-q2-${year}`,
      label: `Q2 ${year} (May-Jul)`,
      startDate: isoDate(year, 5, 1),
      endDate: isoDate(year, 7, 31),
    }
  }
  if (month >= 8 && month <= 10) {
    return {
      quarter: 'Q3',
      year,
      quarterKey: `bcrew-q3-${year}`,
      label: `Q3 ${year} (Aug-Oct)`,
      startDate: isoDate(year, 8, 1),
      endDate: isoDate(year, 10, 31),
    }
  }
  return {
    quarter: 'Q4',
    year,
    quarterKey: `bcrew-q4-${year}`,
    label: `Q4 ${year} (Nov-Jan)`,
    startDate: isoDate(year, 11, 1),
    endDate: isoDate(year + 1, 1, lastDayOfMonth(year + 1, 1)),
  }
}

export function parseQuarterlyPrioritiesDoc(source = '') {
  const currentMatch = String(source || '').match(/##\s*Current Quarter:\s*(Q[1-4])\s+(\d{4})[^\n]*\n+([\s\S]*?)(?=\n---|\n##\s+Priority|\n#\s+|\s*$)/i)
  const priorityBlocks = [...String(source || '').matchAll(/##\s+Priority\s+\d+:\s*([^\n]+)\n+([\s\S]*?)(?=\n---\n\n##\s+Priority|\n##\s+Priority|\s*$)/gi)]
  return {
    currentQuarter: currentMatch
      ? {
          quarter: currentMatch[1].toUpperCase(),
          year: Number(currentMatch[2]),
          theme: normalizeText(currentMatch[3]).split(' Benson Crew quarters run ')[0] || '',
        }
      : null,
    priorities: priorityBlocks.map((match, index) => {
      const body = match[2] || ''
      const ownerMatch = body.match(/\*\*Owner:\*\*\s*([^\n]+)/i)
      const failingMatch = body.match(/Failing indicator:\s*([^\n]+)/i)
      return {
        title: normalizeText(match[1], `Priority ${index + 1}`),
        owner: normalizeText(ownerMatch?.[1], 'Strategy'),
        failingIndicator: normalizeText(failingMatch?.[1]),
        sourceRef: `docs/strategy/quarterly-priorities.md#priority-${index + 1}`,
        sortOrder: index + 1,
      }
    }),
  }
}

function readQuarterlyPrioritiesDoc(repoRoot = process.cwd()) {
  const filePath = path.join(repoRoot, 'docs/strategy/quarterly-priorities.md')
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

export async function ensureStrategyQuarterSchemaWithClient(client) {
  await client.query(strategyQuarterSchemaSql)
}

function mapContextRow(row = {}) {
  return {
    quarterKey: row.quarter_key,
    sourceId: row.source_id,
    label: row.label,
    status: row.status,
    theme: row.theme,
    criticalNumber: row.critical_number,
    startDate: row.start_date?.toISOString?.().slice(0, 10) || row.start_date,
    endDate: row.end_date?.toISOString?.().slice(0, 10) || row.end_date,
    planningStatus: row.planning_status,
    issueRefs: normalizeArray(row.issue_refs),
    decisionRefs: normalizeArray(row.decision_refs),
    openQuestionRefs: normalizeArray(row.open_question_refs),
    preworkRefs: normalizeArray(row.prework_refs),
    weeklyReviewRefs: normalizeArray(row.weekly_review_refs),
    followupRouteRefs: normalizeArray(row.followup_route_refs),
    sourceIds: normalizeArray(row.source_ids),
    evidenceRefs: normalizeArray(row.evidence_refs),
    metadata: parseObject(row.metadata),
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    updatedBy: row.updated_by,
  }
}

function mapTargetRow(row = {}) {
  return {
    targetId: row.target_id,
    quarterKey: row.quarter_key,
    department: row.department,
    owner: row.owner,
    title: row.title,
    metricLabel: row.metric_label,
    targetValue: row.target_value,
    currentValue: row.current_value,
    status: row.status,
    sourceIds: normalizeArray(row.source_ids),
    evidenceRefs: normalizeArray(row.evidence_refs),
    metadata: parseObject(row.metadata),
    sortOrder: Number(row.sort_order || 0),
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }
}

function mapOutputRow(row = {}) {
  return {
    outputId: row.output_id,
    quarterKey: row.quarter_key,
    outputType: row.output_type,
    title: row.title,
    owner: row.owner,
    status: row.status,
    sourceIds: normalizeArray(row.source_ids),
    evidenceRefs: normalizeArray(row.evidence_refs),
    routeRefs: normalizeArray(row.route_refs),
    issueRefs: normalizeArray(row.issue_refs),
    decisionRefs: normalizeArray(row.decision_refs),
    openQuestionRefs: normalizeArray(row.open_question_refs),
    metadata: parseObject(row.metadata),
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }
}

async function loadQuarterInputs(client, { repoRoot = process.cwd(), now = new Date() } = {}) {
  const quarter = resolveBcrewQuarter(now)
  const doc = parseQuarterlyPrioritiesDoc(readQuarterlyPrioritiesDoc(repoRoot))
  const docMatchesCurrent = doc.currentQuarter?.quarter === quarter.quarter && doc.currentQuarter?.year === quarter.year
  const issues = await client.query(
    `
      SELECT issue_id, title, owner, status, resolution_status, source_ids, fact_refs, atom_refs, chunk_refs, route_refs, updated_at
      FROM intelligence_strategic_issues
      WHERE status NOT IN ('ignored', 'rejected')
      ORDER BY
        CASE WHEN resolution_status IN ('unresolved', 'route_pending') THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 12
    `,
  )
  const decisions = await client.query(
    `
      SELECT id, title, status, category, source_ref, updated_at
      FROM decisions
      WHERE status IN ('proposed', 'open', 'accepted', 'locked', 'decided')
      ORDER BY updated_at DESC
      LIMIT 20
    `,
  )
  const questions = await client.query(
    `
      SELECT id, title, owner, status, updated_at
      FROM open_questions
      WHERE status NOT IN ('resolved', 'closed', 'rejected')
      ORDER BY updated_at DESC
      LIMIT 20
    `,
  )
  const routes = await client.query(
    `
      SELECT route_id, route_type, approval_status, destination_table, owner, source_ids, fact_refs, evidence_refs, updated_at
      FROM intelligence_action_routes
      WHERE approval_status IN ('pending', 'approved')
      ORDER BY updated_at DESC
      LIMIT 20
    `,
  )

  return {
    quarter,
    doc,
    docMatchesCurrent,
    issues: issues.rows,
    decisions: decisions.rows,
    questions: questions.rows,
    routes: routes.rows,
  }
}

function buildSeedTargets(inputs = {}) {
  const quarterKey = inputs.quarter.quarterKey
  const targets = (inputs.doc.priorities || []).map(priority => ({
    targetId: idFor('strategy-quarter-target', `${quarterKey}:${priority.title}`),
    quarterKey,
    department: priority.title.toLowerCase().includes('recruiting')
      ? 'Recruiting'
      : priority.title.toLowerCase().includes('brand')
        ? 'Marketing'
        : 'Leadership',
    owner: priority.owner,
    title: priority.title,
    metricLabel: 'Winning / failing indicator',
    targetValue: priority.failingIndicator || 'Owner to confirm target.',
    currentValue: inputs.docMatchesCurrent ? 'Current quarter doc evidence' : 'Imported prior-quarter evidence only',
    status: inputs.docMatchesCurrent ? 'active' : 'watch',
    sourceIds: [STRATEGY_QUARTER_SOURCE_ID, 'SRC-STRATEGY-001'],
    evidenceRefs: [priority.sourceRef],
    metadata: {
      cardId: STRATEGY_QUARTER_CARD_ID,
      docMatchesCurrent: inputs.docMatchesCurrent,
      importedFrom: 'docs/strategy/quarterly-priorities.md',
      sourcePosture: inputs.docMatchesCurrent ? 'current_quarter_doc' : 'prior_quarter_evidence_not_signed_off_current',
    },
    sortOrder: priority.sortOrder,
  }))

  if (targets.length) return targets
  return [{
    targetId: idFor('strategy-quarter-target', `${quarterKey}:owner-update-required`),
    quarterKey,
    department: 'Strategy',
    owner: 'Steve',
    title: `${inputs.quarter.label} owner target update required`,
    metricLabel: 'Quarter target',
    targetValue: 'Owner to set target.',
    currentValue: 'No current quarter target record yet.',
    status: 'watch',
    sourceIds: [STRATEGY_QUARTER_SOURCE_ID],
    evidenceRefs: [],
    metadata: { cardId: STRATEGY_QUARTER_CARD_ID, sourcePosture: 'needs_owner_update' },
    sortOrder: 1,
  }]
}

function buildSeedReviewOutputs(inputs = {}) {
  const quarterKey = inputs.quarter.quarterKey
  const issueOutputs = inputs.issues.slice(0, 8).map(issue => ({
    outputId: idFor('strategy-quarter-output', `${quarterKey}:issue:${issue.issue_id}`),
    quarterKey,
    outputType: 'issue_followup',
    title: normalizeText(issue.title, issue.issue_id),
    owner: normalizeText(issue.owner, 'Strategy'),
    status: ['resolved', 'applied'].includes(issue.resolution_status) ? 'resolved' : 'open',
    sourceIds: normalizeArray([STRATEGY_QUARTER_SOURCE_ID, ...(issue.source_ids || [])]),
    evidenceRefs: normalizeArray([issue.issue_id, ...(issue.fact_refs || []), ...(issue.atom_refs || []), ...(issue.chunk_refs || [])]),
    routeRefs: normalizeArray(issue.route_refs),
    issueRefs: [issue.issue_id],
    decisionRefs: [],
    openQuestionRefs: [],
    metadata: { cardId: STRATEGY_QUARTER_CARD_ID, resolutionStatus: issue.resolution_status, source: 'intelligence_strategic_issues' },
  }))

  const routeOutputs = inputs.routes.slice(0, 5).map(route => ({
    outputId: idFor('strategy-quarter-output', `${quarterKey}:route:${route.route_id}`),
    quarterKey,
    outputType: 'route_followup',
    title: `${normalizeText(route.route_type, 'Route')} requires Strategy review`,
    owner: normalizeText(route.owner, 'Strategy'),
    status: 'review',
    sourceIds: normalizeArray([STRATEGY_QUARTER_SOURCE_ID, ...(route.source_ids || [])]),
    evidenceRefs: normalizeArray([...(route.fact_refs || []), ...(route.evidence_refs || [])]),
    routeRefs: [route.route_id],
    issueRefs: [],
    decisionRefs: [],
    openQuestionRefs: [],
    metadata: { cardId: STRATEGY_QUARTER_CARD_ID, approvalStatus: route.approval_status, destinationTable: route.destination_table },
  }))

  return [...issueOutputs, ...routeOutputs]
}

export function buildStrategyQuarterSeed(inputs = {}) {
  const issueRefs = normalizeArray(inputs.issues.map(row => row.issue_id))
  const decisionRefs = normalizeArray(inputs.decisions.map(row => row.id))
  const openQuestionRefs = normalizeArray(inputs.questions.map(row => row.id))
  const routeRefs = normalizeArray(inputs.routes.map(row => row.route_id))
  const evidenceRefs = normalizeArray([
    'docs/strategy/quarterly-priorities.md',
    'docs/strategy/strategic-issues.md',
    ...issueRefs,
    ...decisionRefs,
    ...openQuestionRefs,
    ...routeRefs,
  ])
  const importedTheme = normalizeText(inputs.doc.currentQuarter?.theme)
  const theme = inputs.docMatchesCurrent
    ? importedTheme
    : `${inputs.quarter.label} needs owner-confirmed theme`
  return {
    context: {
      quarterKey: inputs.quarter.quarterKey,
      sourceId: STRATEGY_QUARTER_SOURCE_ID,
      label: inputs.quarter.label,
      status: 'active',
      theme,
      criticalNumber: inputs.docMatchesCurrent ? 'Owner to confirm critical number' : 'Pending owner update',
      startDate: inputs.quarter.startDate,
      endDate: inputs.quarter.endDate,
      planningStatus: inputs.docMatchesCurrent ? 'review_ready' : 'needs_owner_update',
      issueRefs,
      decisionRefs,
      openQuestionRefs,
      preworkRefs: ['docs/strategy/quarterly-priorities.md', 'docs/strategy/strategic-issues.md'],
      weeklyReviewRefs: [],
      followupRouteRefs: routeRefs,
      sourceIds: [STRATEGY_QUARTER_SOURCE_ID, 'SRC-STRATEGY-001', 'SRC-GDRIVE-001'],
      evidenceRefs,
      metadata: {
        cardId: STRATEGY_QUARTER_CARD_ID,
        quarterRule: 'Benson Crew quarters: Q1 Feb-Apr, Q2 May-Jul, Q3 Aug-Oct, Q4 Nov-Jan.',
        docQuarter: inputs.doc.currentQuarter || null,
        docMatchesCurrent: inputs.docMatchesCurrent,
        importedAt: new Date().toISOString(),
        sourcePosture: inputs.docMatchesCurrent ? 'current_quarter_review_ready' : 'prior_quarter_evidence_needs_owner_update',
      },
    },
    targets: buildSeedTargets(inputs),
    outputs: buildSeedReviewOutputs(inputs),
  }
}

async function loadSnapshotWithClient(client, quarterKey) {
  const contexts = await client.query(
    `
      SELECT *
      FROM strategy_quarter_contexts
      WHERE quarter_key = $1
      LIMIT 1
    `,
    [quarterKey],
  )
  const targets = await client.query(
    `
      SELECT *
      FROM strategy_quarter_targets
      WHERE quarter_key = $1
      ORDER BY sort_order ASC, title ASC
    `,
    [quarterKey],
  )
  const outputs = await client.query(
    `
      SELECT *
      FROM strategy_quarter_review_outputs
      WHERE quarter_key = $1
      ORDER BY updated_at DESC, output_type ASC
    `,
    [quarterKey],
  )
  const facts = await client.query(
    `
      SELECT fact_id, fact_type, title, claim, value, detail, source_id, source_ids, source_ref, metadata, updated_at
      FROM intelligence_synthesis_facts
      WHERE status = 'active'
        AND source_id = $1
      ORDER BY updated_at DESC, title ASC
      LIMIT 20
    `,
    [STRATEGY_QUARTER_SOURCE_ID],
  )

  const context = contexts.rows[0] ? mapContextRow(contexts.rows[0]) : null
  return {
    status: context ? 'ready' : 'missing_context',
    generatedAt: new Date().toISOString(),
    sourceId: STRATEGY_QUARTER_SOURCE_ID,
    currentQuarter: resolveBcrewQuarter(),
    context,
    targets: targets.rows.map(mapTargetRow),
    reviewOutputs: outputs.rows.map(mapOutputRow),
    sourceFacts: facts.rows.map(row => ({
      factId: row.fact_id,
      factType: row.fact_type,
      title: row.title,
      claim: row.claim,
      value: row.value,
      detail: row.detail,
      sourceId: row.source_id,
      sourceIds: normalizeArray(row.source_ids),
      sourceRef: row.source_ref,
      metadata: parseObject(row.metadata),
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    })),
    summary: {
      targetCount: targets.rows.length,
      reviewOutputCount: outputs.rows.length,
      factCount: facts.rows.length,
      unresolvedIssueCount: outputs.rows.filter(row => row.output_type === 'issue_followup' && row.status !== 'resolved').length,
      routeFollowupCount: outputs.rows.filter(row => row.output_type === 'route_followup').length,
      planningStatus: context?.planningStatus || 'missing_context',
    },
  }
}

async function upsertContextWithClient(client, context, actor) {
  const result = await client.query(
    `
      INSERT INTO strategy_quarter_contexts (
        quarter_key, source_id, label, status, theme, critical_number, start_date, end_date,
        planning_status, issue_refs, decision_refs, open_question_refs, prework_refs,
        weekly_review_refs, followup_route_refs, source_ids, evidence_refs, metadata, updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11::text[],$12::text[],$13::text[],$14::text[],$15::text[],$16::text[],$17::text[],$18::jsonb,$19)
      ON CONFLICT (quarter_key) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        label = EXCLUDED.label,
        status = EXCLUDED.status,
        theme = CASE
          WHEN strategy_quarter_contexts.metadata->>'userEdited' = 'true' THEN strategy_quarter_contexts.theme
          ELSE EXCLUDED.theme
        END,
        critical_number = CASE
          WHEN strategy_quarter_contexts.metadata->>'userEdited' = 'true' THEN strategy_quarter_contexts.critical_number
          ELSE EXCLUDED.critical_number
        END,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        planning_status = EXCLUDED.planning_status,
        issue_refs = EXCLUDED.issue_refs,
        decision_refs = EXCLUDED.decision_refs,
        open_question_refs = EXCLUDED.open_question_refs,
        prework_refs = EXCLUDED.prework_refs,
        followup_route_refs = EXCLUDED.followup_route_refs,
        source_ids = EXCLUDED.source_ids,
        evidence_refs = EXCLUDED.evidence_refs,
        metadata = strategy_quarter_contexts.metadata || EXCLUDED.metadata,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `,
    [
      context.quarterKey,
      context.sourceId,
      context.label,
      context.status,
      context.theme,
      context.criticalNumber,
      context.startDate,
      context.endDate,
      context.planningStatus,
      context.issueRefs,
      context.decisionRefs,
      context.openQuestionRefs,
      context.preworkRefs,
      context.weeklyReviewRefs,
      context.followupRouteRefs,
      context.sourceIds,
      context.evidenceRefs,
      JSON.stringify(context.metadata || {}),
      actor,
    ],
  )
  return mapContextRow(result.rows[0])
}

async function upsertTargetsWithClient(client, targets = []) {
  for (const target of targets) {
    await client.query(
      `
        INSERT INTO strategy_quarter_targets (
          target_id, quarter_key, department, owner, title, metric_label, target_value,
          current_value, status, source_ids, evidence_refs, metadata, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11::text[],$12::jsonb,$13)
        ON CONFLICT (target_id) DO UPDATE SET
          quarter_key = EXCLUDED.quarter_key,
          department = EXCLUDED.department,
          owner = EXCLUDED.owner,
          title = EXCLUDED.title,
          metric_label = EXCLUDED.metric_label,
          target_value = EXCLUDED.target_value,
          current_value = EXCLUDED.current_value,
          status = EXCLUDED.status,
          source_ids = EXCLUDED.source_ids,
          evidence_refs = EXCLUDED.evidence_refs,
          metadata = strategy_quarter_targets.metadata || EXCLUDED.metadata,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      [
        target.targetId,
        target.quarterKey,
        target.department,
        target.owner,
        target.title,
        target.metricLabel,
        target.targetValue,
        target.currentValue,
        target.status,
        target.sourceIds,
        target.evidenceRefs,
        JSON.stringify(target.metadata || {}),
        target.sortOrder,
      ],
    )
  }
}

async function upsertOutputsWithClient(client, outputs = []) {
  for (const output of outputs) {
    await client.query(
      `
        INSERT INTO strategy_quarter_review_outputs (
          output_id, quarter_key, output_type, title, owner, status,
          source_ids, evidence_refs, route_refs, issue_refs, decision_refs,
          open_question_refs, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8::text[],$9::text[],$10::text[],$11::text[],$12::text[],$13::jsonb)
        ON CONFLICT (output_id) DO UPDATE SET
          quarter_key = EXCLUDED.quarter_key,
          output_type = EXCLUDED.output_type,
          title = EXCLUDED.title,
          owner = EXCLUDED.owner,
          status = EXCLUDED.status,
          source_ids = EXCLUDED.source_ids,
          evidence_refs = EXCLUDED.evidence_refs,
          route_refs = EXCLUDED.route_refs,
          issue_refs = EXCLUDED.issue_refs,
          decision_refs = EXCLUDED.decision_refs,
          open_question_refs = EXCLUDED.open_question_refs,
          metadata = strategy_quarter_review_outputs.metadata || EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        output.outputId,
        output.quarterKey,
        output.outputType,
        output.title,
        output.owner,
        output.status,
        output.sourceIds,
        output.evidenceRefs,
        output.routeRefs,
        output.issueRefs,
        output.decisionRefs,
        output.openQuestionRefs,
        JSON.stringify(output.metadata || {}),
      ],
    )
  }
}

export function buildStrategyQuarterSourceFacts(snapshot = {}) {
  const context = snapshot.context || {}
  if (!context.quarterKey) return []
  const base = {
    factType: 'source_snapshot',
    sourceId: STRATEGY_QUARTER_SOURCE_ID,
    sourceIds: normalizeArray([STRATEGY_QUARTER_SOURCE_ID, ...(context.sourceIds || [])]),
    asOf: new Date().toISOString(),
    sensitivity: 'neutral',
    minTier: 1,
    status: 'active',
  }
  const contextFacts = [
    {
      ...base,
      factId: idFor('strategy-quarter-fact', `${context.quarterKey}:theme`),
      naturalKey: `strategy-quarter:${context.quarterKey}:theme`,
      title: `${context.label}: quarter theme`,
      claim: `Quarter theme: ${context.theme}.`,
      value: context.theme,
      detail: `Planning status is ${context.planningStatus}; critical number is ${context.criticalNumber}.`,
      sourceRef: `strategy_quarter_contexts:${context.quarterKey}`,
      metadata: { factSubtype: 'strategy_quarter_theme', quarterKey: context.quarterKey, cardId: STRATEGY_QUARTER_CARD_ID },
    },
    {
      ...base,
      factId: idFor('strategy-quarter-fact', `${context.quarterKey}:critical-number`),
      naturalKey: `strategy-quarter:${context.quarterKey}:critical-number`,
      title: `${context.label}: critical number`,
      claim: `Quarter critical number: ${context.criticalNumber}.`,
      value: context.criticalNumber,
      detail: `Quarter runs ${context.startDate} through ${context.endDate}.`,
      sourceRef: `strategy_quarter_contexts:${context.quarterKey}`,
      metadata: { factSubtype: 'strategy_quarter_critical_number', quarterKey: context.quarterKey, cardId: STRATEGY_QUARTER_CARD_ID },
    },
  ]

  const targetFacts = (snapshot.targets || []).slice(0, 8).map(target => ({
    ...base,
    factId: idFor('strategy-quarter-fact', `${target.targetId}:target`),
    naturalKey: `strategy-quarter:${context.quarterKey}:target:${target.targetId}`,
    title: `${context.label}: ${target.title}`,
    claim: `${target.department} target owned by ${target.owner}: ${target.targetValue || target.title}.`,
    value: target.targetValue || null,
    detail: target.currentValue || target.metricLabel || '',
    sourceRef: `strategy_quarter_targets:${target.targetId}`,
    metadata: { factSubtype: 'strategy_quarter_department_target', quarterKey: context.quarterKey, targetId: target.targetId, cardId: STRATEGY_QUARTER_CARD_ID },
  }))

  const outputFacts = (snapshot.reviewOutputs || []).slice(0, 8).map(output => ({
    ...base,
    factId: idFor('strategy-quarter-fact', `${output.outputId}:followup`),
    naturalKey: `strategy-quarter:${context.quarterKey}:output:${output.outputId}`,
    title: `${context.label}: ${output.title}`,
    claim: `${output.outputType.replace(/_/g, ' ')} is ${output.status} and owned by ${output.owner}.`,
    value: output.status,
    detail: [...(output.issueRefs || []), ...(output.routeRefs || []), ...(output.openQuestionRefs || [])].slice(0, 6).join(', '),
    sourceRef: `strategy_quarter_review_outputs:${output.outputId}`,
    metadata: { factSubtype: 'strategy_quarter_review_output', quarterKey: context.quarterKey, outputId: output.outputId, cardId: STRATEGY_QUARTER_CARD_ID },
  }))

  return [...contextFacts, ...targetFacts, ...outputFacts]
}

export async function upsertStrategyQuarterSeed({ actor = 'strategy-quarter-input-layer', repoRoot = process.cwd(), pool = null } = {}) {
  const ownsPool = !pool
  const db = pool || createPool()
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await ensureStrategyQuarterSchemaWithClient(client)
    const inputs = await loadQuarterInputs(client, { repoRoot })
    const seed = buildStrategyQuarterSeed(inputs)
    await upsertContextWithClient(client, seed.context, actor)
    await upsertTargetsWithClient(client, seed.targets)
    await upsertOutputsWithClient(client, seed.outputs)
    await client.query('COMMIT')
    return await getStrategyQuarterSnapshot({ pool: db, quarterKey: seed.context.quarterKey })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    if (ownsPool) await db.end()
  }
}

export async function getStrategyQuarterSnapshot({ pool = null, quarterKey = '', seedIfMissing = false } = {}) {
  const ownsPool = !pool
  const db = pool || createPool()
  const client = await db.connect()
  let released = false
  try {
    await ensureStrategyQuarterSchemaWithClient(client)
    const resolvedQuarterKey = normalizeText(quarterKey, resolveBcrewQuarter().quarterKey)
    let snapshot = await loadSnapshotWithClient(client, resolvedQuarterKey)
    if (snapshot.status === 'missing_context' && seedIfMissing) {
      client.release()
      released = true
      return await upsertStrategyQuarterSeed({ pool: db })
    }
    return snapshot
  } finally {
    if (!released) client.release()
    if (ownsPool) await db.end()
  }
}

export async function updateStrategyQuarterContext(input = {}, actor = 'strategy-quarter-ui') {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureStrategyQuarterSchemaWithClient(client)
    const quarter = resolveBcrewQuarter()
    const quarterKey = normalizeText(input.quarterKey || input.quarter_key, quarter.quarterKey)
    const current = await loadSnapshotWithClient(client, quarterKey)
    if (!current.context) {
      await client.query('ROLLBACK')
      await upsertStrategyQuarterSeed({ actor, pool })
      await client.query('BEGIN')
    }
    const reloaded = await loadSnapshotWithClient(client, quarterKey)
    const context = reloaded.context || {
      quarterKey,
      sourceId: STRATEGY_QUARTER_SOURCE_ID,
      label: quarter.label,
      status: 'active',
      theme: `${quarter.label} needs owner-confirmed theme`,
      criticalNumber: 'Pending owner update',
      startDate: quarter.startDate,
      endDate: quarter.endDate,
      planningStatus: 'needs_owner_update',
      issueRefs: [],
      decisionRefs: [],
      openQuestionRefs: [],
      preworkRefs: [],
      weeklyReviewRefs: [],
      followupRouteRefs: [],
      sourceIds: [STRATEGY_QUARTER_SOURCE_ID],
      evidenceRefs: [],
      metadata: {},
    }
    const next = {
      ...context,
      theme: normalizeText(input.theme, context.theme),
      criticalNumber: normalizeText(input.criticalNumber || input.critical_number, context.criticalNumber),
      planningStatus: normalizeText(input.planningStatus || input.planning_status, context.planningStatus),
      metadata: {
        ...(context.metadata || {}),
        userEdited: true,
        lastOwnerNote: normalizeText(input.ownerNote || input.owner_note),
        updatedFrom: 'strategy_hub_owner_admin_form',
      },
    }
    if (!['needs_owner_update', 'draft', 'review_ready', 'approved', 'stale'].includes(next.planningStatus)) {
      throw new Error(`Unsupported Strategy Quarter planning status: ${next.planningStatus}`)
    }
    const saved = await upsertContextWithClient(client, next, actor)
    await client.query('COMMIT')
    return {
      ok: true,
      context: saved,
      snapshot: await getStrategyQuarterSnapshot({ pool, quarterKey }),
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export function evaluateStrategyQuarterSnapshot(snapshot = {}) {
  const context = snapshot.context || {}
  const targets = snapshot.targets || []
  const outputs = snapshot.reviewOutputs || []
  const facts = snapshot.sourceFacts || []
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(snapshot.status === 'ready', 'Strategy Quarter context exists', snapshot.status)
  add(context.sourceId === STRATEGY_QUARTER_SOURCE_ID, 'context uses SRC-STRATEGY-QUARTER-001', context.sourceId || 'missing')
  add(Boolean(context.quarterKey && context.label && context.startDate && context.endDate), 'context has quarter identity and dates', context.label || 'missing')
  add(Boolean(context.theme && context.criticalNumber), 'context has theme and critical number fields', `${context.theme || 'missing'} / ${context.criticalNumber || 'missing'}`)
  add(['needs_owner_update', 'draft', 'review_ready', 'approved', 'stale'].includes(context.planningStatus), 'context has governed planning status', context.planningStatus || 'missing')
  add(targets.length >= 1, 'department targets are represented', String(targets.length))
  add(outputs.length >= 1, 'review/follow-up outputs are represented', String(outputs.length))
  add((context.sourceIds || []).includes('SRC-STRATEGY-001') && (context.sourceIds || []).includes(STRATEGY_QUARTER_SOURCE_ID), 'context keeps source provenance', (context.sourceIds || []).join(', '))
  add(facts.length >= 3, 'source fact ledger contains Strategy Quarter facts', String(facts.length))
  add(facts.some(fact => fact.metadata?.factSubtype === 'strategy_quarter_theme'), 'source facts include quarter theme subtype', facts.map(fact => fact.metadata?.factSubtype).filter(Boolean).join(', '))
  add(facts.some(fact => fact.metadata?.factSubtype === 'strategy_quarter_department_target'), 'source facts include department target subtype', facts.map(fact => fact.metadata?.factSubtype).filter(Boolean).join(', '))
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      targetCount: targets.length,
      reviewOutputCount: outputs.length,
      factCount: facts.length,
      planningStatus: context.planningStatus || 'missing',
    },
  }
}

export function buildStrategyQuarterDogfoodProof() {
  const healthy = {
    status: 'ready',
    context: {
      quarterKey: 'bcrew-q2-2026',
      sourceId: STRATEGY_QUARTER_SOURCE_ID,
      label: 'Q2 2026 (May-Jul)',
      theme: 'Owner-confirmed strategy theme',
      criticalNumber: 'Recruiting pace',
      startDate: '2026-05-01',
      endDate: '2026-07-31',
      planningStatus: 'review_ready',
      sourceIds: [STRATEGY_QUARTER_SOURCE_ID, 'SRC-STRATEGY-001'],
    },
    targets: [{ title: 'Recruiting engine', owner: 'Steve' }],
    reviewOutputs: [{ title: 'Resolve strategic issue', owner: 'Strategy' }],
    sourceFacts: [
      { metadata: { factSubtype: 'strategy_quarter_theme' } },
      { metadata: { factSubtype: 'strategy_quarter_department_target' } },
      { metadata: { factSubtype: 'strategy_quarter_review_output' } },
    ],
  }
  const evaluate = fixture => evaluateStrategyQuarterSnapshot(fixture).ok
  return {
    ok: evaluate(healthy) &&
      !evaluate({ ...healthy, context: { ...healthy.context, sourceId: 'SRC-STRATEGY-001' } }) &&
      !evaluate({ ...healthy, context: { ...healthy.context, theme: '' } }) &&
      !evaluate({ ...healthy, context: { ...healthy.context, sourceIds: [STRATEGY_QUARTER_SOURCE_ID] } }) &&
      !evaluate({ ...healthy, targets: [] }) &&
      !evaluate({ ...healthy, sourceFacts: [] }),
    rejected: {
      wrongSourceId: !evaluate({ ...healthy, context: { ...healthy.context, sourceId: 'SRC-STRATEGY-001' } }),
      missingTheme: !evaluate({ ...healthy, context: { ...healthy.context, theme: '' } }),
      missingStrategySource: !evaluate({ ...healthy, context: { ...healthy.context, sourceIds: [STRATEGY_QUARTER_SOURCE_ID] } }),
      missingTargets: !evaluate({ ...healthy, targets: [] }),
      missingFacts: !evaluate({ ...healthy, sourceFacts: [] }),
    },
  }
}
