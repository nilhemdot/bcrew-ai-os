import { createHash, randomUUID } from 'node:crypto'

export const intelligenceAtomSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_report_artifacts (
    report_artifact_id TEXT PRIMARY KEY,
    report_type TEXT NOT NULL
      CHECK (report_type IN (
        'scout_report',
        'director_brief',
        'scoping_card',
        'department_brief',
        'master_synthesis',
        'strategy_packet',
        'proof'
      )),
    scope_key TEXT,
    department TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated'
      CHECK (status IN ('generated', 'reviewed', 'promoted', 'archived', 'failed')),
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    generated_by_job_run_id TEXT,
    intelligence_job_run_id TEXT,
    input_artifact_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    input_candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    input_atom_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    input_fact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
    freshness_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_source_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    stale_source_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    dedup_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    rejected_noise_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_required_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_artifact_id TEXT,
    output_path TEXT,
    structured_output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    promoted_decision_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    promoted_backlog_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    promoted_action_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_report_artifacts_lookup
  ON intelligence_report_artifacts(report_type, status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_report_artifacts_sources
  ON intelligence_report_artifacts USING GIN(source_ids);

  CREATE TABLE IF NOT EXISTS intelligence_atoms (
    atom_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    atom_type TEXT NOT NULL DEFAULT 'observation'
      CHECK (atom_type IN (
        'observation',
        'claim',
        'pattern',
        'decision',
        'risk',
        'correction',
        'content_idea',
        'action_candidate',
        'workflow',
        'proof_point'
      )),
    source_id TEXT NOT NULL,
    artifact_id TEXT REFERENCES shared_communication_artifacts(artifact_id) ON DELETE SET NULL,
    source_crawl_run_id TEXT,
    intelligence_job_run_id TEXT,
    candidate_key TEXT REFERENCES shared_communication_candidates(candidate_key) ON DELETE SET NULL,
    report_artifact_id TEXT REFERENCES intelligence_report_artifacts(report_artifact_id) ON DELETE SET NULL,
    modality TEXT NOT NULL DEFAULT 'text'
      CHECK (modality IN ('text', 'audio', 'video', 'image', 'sheet', 'slide', 'web', 'mixed')),
    anchor_type TEXT,
    anchor_value TEXT,
    evidence_excerpt TEXT NOT NULL DEFAULT '',
    visual_observation TEXT,
    derived_claim TEXT NOT NULL DEFAULT '',
    entity_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    person_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metric_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    topic_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    department TEXT,
    pillar TEXT,
    value_route TEXT,
    content_use_class TEXT,
    audience TEXT,
    avatar_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    avatar_names TEXT,
    platform_fit TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    format_rec TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    emotion TEXT,
    content_type TEXT,
    quality_score INTEGER NOT NULL DEFAULT 0,
    relevance_score INTEGER NOT NULL DEFAULT 0,
    source_confidence NUMERIC(4,3),
    extraction_confidence NUMERIC(4,3),
    sensitivity TEXT NOT NULL DEFAULT 'neutral',
    min_tier INTEGER NOT NULL DEFAULT 1,
    subject_people JSONB NOT NULL DEFAULT '[]'::jsonb,
    freshness TEXT NOT NULL DEFAULT 'evergreen'
      CHECK (freshness IN ('trending', 'seasonal', 'evergreen', 'structural')),
    status TEXT NOT NULL DEFAULT 'detected'
      CHECK (status IN (
        'detected',
        'confirmed',
        'recurring',
        'structural',
        'accepted',
        'rejected',
        'resolved',
        'used',
        'winner',
        'superseded',
        'archived'
      )),
    hit_count INTEGER NOT NULL DEFAULT 0,
    first_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_count INTEGER NOT NULL DEFAULT 0,
    used_in JSONB NOT NULL DEFAULT '[]'::jsonb,
    perf_score NUMERIC,
    perf_notes TEXT,
    dedup_hash TEXT NOT NULL,
    supersedes_atom_id TEXT,
    superseded_by_atom_id TEXT,
    parent_atom_id TEXT,
    suggested_owner TEXT,
    suggested_action TEXT,
    action_router_record_id TEXT,
    accepted_at TIMESTAMPTZ,
    accepted_by TEXT,
    rejected_at TIMESTAMPTZ,
    rejected_by TEXT,
    review_note TEXT,
    expires_at TIMESTAMPTZ,
    stale_after TIMESTAMPTZ,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    filed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_atoms_dedup_active
  ON intelligence_atoms(dedup_hash)
  WHERE status NOT IN ('rejected', 'archived', 'superseded');

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_source
  ON intelligence_atoms(source_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_report
  ON intelligence_atoms(report_artifact_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_entity_refs
  ON intelligence_atoms USING GIN(entity_refs);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_person_refs
  ON intelligence_atoms USING GIN(person_refs);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_metric_refs
  ON intelligence_atoms USING GIN(metric_refs);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atoms_avatar_ids
  ON intelligence_atoms USING GIN(avatar_ids);

  CREATE TABLE IF NOT EXISTS intelligence_atom_hits (
    hit_id TEXT PRIMARY KEY,
    atom_id TEXT NOT NULL REFERENCES intelligence_atoms(atom_id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    artifact_id TEXT REFERENCES shared_communication_artifacts(artifact_id) ON DELETE SET NULL,
    candidate_key TEXT REFERENCES shared_communication_candidates(candidate_key) ON DELETE SET NULL,
    report_artifact_id TEXT REFERENCES intelligence_report_artifacts(report_artifact_id) ON DELETE SET NULL,
    intelligence_job_run_id TEXT,
    hit_type TEXT NOT NULL DEFAULT 'supporting_evidence'
      CHECK (hit_type IN ('supporting_evidence', 'repeat_signal', 'usage', 'performance_feedback', 'correction', 'resolution')),
    evidence_excerpt TEXT NOT NULL DEFAULT '',
    anchor_type TEXT,
    anchor_value TEXT,
    confidence NUMERIC(4,3),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_atom_hits_atom
  ON intelligence_atom_hits(atom_id, occurred_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_atom_hits_source
  ON intelligence_atom_hits(source_id, occurred_at DESC);

  ALTER TABLE intelligence_atoms
  ALTER COLUMN hit_count SET DEFAULT 0;
`

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function mapIntelligenceReportArtifactRow(row) {
  return {
    reportArtifactId: row.report_artifact_id ?? row.reportArtifactId,
    reportType: row.report_type ?? row.reportType,
    scopeKey: row.scope_key ?? row.scopeKey ?? null,
    department: row.department || null,
    title: row.title || '',
    status: row.status,
    sourceIds: Array.isArray(row.source_ids) ? row.source_ids : [],
    generatedByJobRunId: row.generated_by_job_run_id ?? row.generatedByJobRunId ?? null,
    intelligenceJobRunId: row.intelligence_job_run_id ?? row.intelligenceJobRunId ?? null,
    inputArtifactIds: Array.isArray(row.input_artifact_ids) ? row.input_artifact_ids : [],
    inputCandidateKeys: Array.isArray(row.input_candidate_keys) ? row.input_candidate_keys : [],
    inputAtomIds: Array.isArray(row.input_atom_ids) ? row.input_atom_ids : [],
    inputFactRefs: row.input_fact_refs || [],
    sourceCoverage: row.source_coverage || [],
    freshnessWarnings: row.freshness_warnings || [],
    missingSourceWarnings: row.missing_source_warnings || [],
    staleSourceWarnings: row.stale_source_warnings || [],
    dedupSummary: row.dedup_summary || {},
    rejectedNoiseSummary: row.rejected_noise_summary || [],
    topFindings: row.top_findings || [],
    actionRequiredItems: row.action_required_items || [],
    openQuestions: row.open_questions || [],
    contradictions: row.contradictions || [],
    outputArtifactId: row.output_artifact_id ?? row.outputArtifactId ?? null,
    outputPath: row.output_path ?? row.outputPath ?? null,
    structuredOutputJson: row.structured_output_json || {},
    reviewedBy: row.reviewed_by ?? row.reviewedBy ?? null,
    reviewedAt: row.reviewed_at?.toISOString?.() || row.reviewed_at || null,
    promotedDecisionIds: Array.isArray(row.promoted_decision_ids) ? row.promoted_decision_ids : [],
    promotedBacklogIds: Array.isArray(row.promoted_backlog_ids) ? row.promoted_backlog_ids : [],
    promotedActionIds: Array.isArray(row.promoted_action_ids) ? row.promoted_action_ids : [],
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapIntelligenceAtomRow(row) {
  return {
    atomId: row.atom_id ?? row.atomId,
    title: row.title || '',
    content: row.content || '',
    atomType: row.atom_type ?? row.atomType,
    sourceId: row.source_id ?? row.sourceId,
    artifactId: row.artifact_id ?? row.artifactId ?? null,
    sourceCrawlRunId: row.source_crawl_run_id ?? row.sourceCrawlRunId ?? null,
    intelligenceJobRunId: row.intelligence_job_run_id ?? row.intelligenceJobRunId ?? null,
    candidateKey: row.candidate_key ?? row.candidateKey ?? null,
    reportArtifactId: row.report_artifact_id ?? row.reportArtifactId ?? null,
    modality: row.modality || 'text',
    anchorType: row.anchor_type ?? row.anchorType ?? null,
    anchorValue: row.anchor_value ?? row.anchorValue ?? null,
    evidenceExcerpt: row.evidence_excerpt ?? row.evidenceExcerpt ?? '',
    visualObservation: row.visual_observation ?? row.visualObservation ?? null,
    derivedClaim: row.derived_claim ?? row.derivedClaim ?? '',
    entityRefs: Array.isArray(row.entity_refs) ? row.entity_refs : [],
    personRefs: Array.isArray(row.person_refs) ? row.person_refs : [],
    metricRefs: Array.isArray(row.metric_refs) ? row.metric_refs : [],
    topicRefs: Array.isArray(row.topic_refs) ? row.topic_refs : [],
    department: row.department || null,
    pillar: row.pillar || null,
    valueRoute: row.value_route ?? row.valueRoute ?? null,
    contentUseClass: row.content_use_class ?? row.contentUseClass ?? null,
    audience: row.audience || null,
    avatarIds: Array.isArray(row.avatar_ids) ? row.avatar_ids : [],
    avatarNames: row.avatar_names ?? row.avatarNames ?? null,
    platformFit: Array.isArray(row.platform_fit) ? row.platform_fit : [],
    formatRec: Array.isArray(row.format_rec) ? row.format_rec : [],
    emotion: row.emotion || null,
    contentType: row.content_type ?? row.contentType ?? null,
    qualityScore: Number(row.quality_score || 0),
    relevanceScore: Number(row.relevance_score || 0),
    sourceConfidence: row.source_confidence == null ? null : Number(row.source_confidence),
    extractionConfidence: row.extraction_confidence == null ? null : Number(row.extraction_confidence),
    sensitivity: row.sensitivity || 'neutral',
    minTier: Number(row.min_tier || 1),
    subjectPeople: row.subject_people || [],
    freshness: row.freshness || 'evergreen',
    status: row.status,
    hitCount: Number(row.hit_count || 0),
    firstHitAt: row.first_hit_at?.toISOString?.() || row.first_hit_at || null,
    lastHitAt: row.last_hit_at?.toISOString?.() || row.last_hit_at || null,
    usedCount: Number(row.used_count || 0),
    usedIn: row.used_in || [],
    perfScore: row.perf_score == null ? null : Number(row.perf_score),
    perfNotes: row.perf_notes ?? row.perfNotes ?? null,
    dedupHash: row.dedup_hash ?? row.dedupHash,
    supersedesAtomId: row.supersedes_atom_id ?? row.supersedesAtomId ?? null,
    supersededByAtomId: row.superseded_by_atom_id ?? row.supersededByAtomId ?? null,
    parentAtomId: row.parent_atom_id ?? row.parentAtomId ?? null,
    suggestedOwner: row.suggested_owner ?? row.suggestedOwner ?? null,
    suggestedAction: row.suggested_action ?? row.suggestedAction ?? null,
    actionRouterRecordId: row.action_router_record_id ?? row.actionRouterRecordId ?? null,
    acceptedAt: row.accepted_at?.toISOString?.() || row.accepted_at || null,
    acceptedBy: row.accepted_by ?? row.acceptedBy ?? null,
    rejectedAt: row.rejected_at?.toISOString?.() || row.rejected_at || null,
    rejectedBy: row.rejected_by ?? row.rejectedBy ?? null,
    reviewNote: row.review_note ?? row.reviewNote ?? null,
    expiresAt: row.expires_at?.toISOString?.() || row.expires_at || null,
    staleAfter: row.stale_after?.toISOString?.() || row.stale_after || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || null,
    metadata: row.metadata || {},
    filedBy: row.filed_by ?? row.filedBy ?? null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapIntelligenceAtomHitRow(row) {
  return {
    hitId: row.hit_id ?? row.hitId,
    atomId: row.atom_id ?? row.atomId,
    sourceId: row.source_id ?? row.sourceId,
    artifactId: row.artifact_id ?? row.artifactId ?? null,
    candidateKey: row.candidate_key ?? row.candidateKey ?? null,
    reportArtifactId: row.report_artifact_id ?? row.reportArtifactId ?? null,
    intelligenceJobRunId: row.intelligence_job_run_id ?? row.intelligenceJobRunId ?? null,
    hitType: row.hit_type ?? row.hitType,
    evidenceExcerpt: row.evidence_excerpt ?? row.evidenceExcerpt ?? '',
    anchorType: row.anchor_type ?? row.anchorType ?? null,
    anchorValue: row.anchor_value ?? row.anchorValue ?? null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    occurredAt: row.occurred_at?.toISOString?.() || row.occurred_at || null,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
  }
}

function computeIntelligenceAtomDedupHash(input = {}) {
  const basis = [
    input.sourceId || input.source_id || '',
    input.artifactId || input.artifact_id || '',
    input.candidateKey || input.candidate_key || '',
    input.reportArtifactId || input.report_artifact_id || '',
    input.derivedClaim || input.derived_claim || '',
    input.content || '',
    input.evidenceExcerpt || input.evidence_excerpt || '',
  ]
    .map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('|')

  return createHash('sha256').update(basis || randomUUID()).digest('hex')
}

function normalizeIntelligenceReportType(value) {
  const normalized = String(value || 'proof').trim()
  const allowed = new Set(['scout_report', 'director_brief', 'scoping_card', 'department_brief', 'master_synthesis', 'strategy_packet', 'proof'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence report type: ${normalized}`)
  return normalized
}

function normalizeIntelligenceReportStatus(value) {
  const normalized = String(value || 'generated').trim()
  const allowed = new Set(['generated', 'reviewed', 'promoted', 'archived', 'failed'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence report status: ${normalized}`)
  return normalized
}

function normalizeIntelligenceAtomType(value) {
  const normalized = String(value || 'observation').trim()
  const allowed = new Set(['observation', 'claim', 'pattern', 'decision', 'risk', 'correction', 'content_idea', 'action_candidate', 'workflow', 'proof_point'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence atom type: ${normalized}`)
  return normalized
}

function normalizeIntelligenceAtomStatus(value) {
  const normalized = String(value || 'detected').trim()
  const allowed = new Set(['detected', 'confirmed', 'recurring', 'structural', 'accepted', 'rejected', 'resolved', 'used', 'winner', 'superseded', 'archived'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence atom status: ${normalized}`)
  return normalized
}

function normalizeIntelligenceAtomModality(value) {
  const normalized = String(value || 'text').trim()
  const allowed = new Set(['text', 'audio', 'video', 'image', 'sheet', 'slide', 'web', 'mixed'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence atom modality: ${normalized}`)
  return normalized
}

function normalizeIntelligenceAtomFreshness(value) {
  const normalized = String(value || 'evergreen').trim()
  const allowed = new Set(['trending', 'seasonal', 'evergreen', 'structural'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence atom freshness: ${normalized}`)
  return normalized
}

function normalizeIntelligenceAtomHitType(value) {
  const normalized = String(value || 'supporting_evidence').trim()
  const allowed = new Set(['supporting_evidence', 'repeat_signal', 'usage', 'performance_feedback', 'correction', 'resolution'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence atom hit type: ${normalized}`)
  return normalized
}

export function createIntelligenceAtomStore({ pool, withFoundationTransaction, insertChangeEvent, getRegisteredSourceIds }) {
  function assertRegisteredSourceIds(sourceIds, fieldName = 'sourceId') {
    const normalized = normalizeTextArray(sourceIds)
    if (!normalized.length) return normalized
    const registered = new Set(normalizeTextArray(getRegisteredSourceIds?.() || []))
    const missing = normalized.filter(sourceId => !registered.has(sourceId))
    if (missing.length) {
      throw new Error(`${fieldName} contains unregistered source contract IDs: ${missing.join(', ')}`)
    }
    return normalized
  }

  async function upsertIntelligenceReportArtifact(input = {}, actor = 'system') {
    const reportArtifactId = String(input.reportArtifactId || input.report_artifact_id || '').trim()
    if (!reportArtifactId) throw new Error('reportArtifactId is required for intelligence report artifacts.')

    const reportType = normalizeIntelligenceReportType(input.reportType || input.report_type)
    const status = normalizeIntelligenceReportStatus(input.status)
    const sourceIds = assertRegisteredSourceIds(input.sourceIds || input.source_ids, 'sourceIds')
    const inputArtifactIds = normalizeTextArray(input.inputArtifactIds || input.input_artifact_ids)
    const inputCandidateKeys = normalizeTextArray(input.inputCandidateKeys || input.input_candidate_keys)
    const inputAtomIds = normalizeTextArray(input.inputAtomIds || input.input_atom_ids)
    const promotedDecisionIds = normalizeTextArray(input.promotedDecisionIds || input.promoted_decision_ids)
    const promotedBacklogIds = normalizeTextArray(input.promotedBacklogIds || input.promoted_backlog_ids)
    const promotedActionIds = normalizeTextArray(input.promotedActionIds || input.promoted_action_ids)

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO intelligence_report_artifacts (
            report_artifact_id, report_type, scope_key, department, title, status,
            source_ids, generated_by_job_run_id, intelligence_job_run_id,
            input_artifact_ids, input_candidate_keys, input_atom_ids, input_fact_refs,
            source_coverage, freshness_warnings, missing_source_warnings,
            stale_source_warnings, dedup_summary, rejected_noise_summary,
            top_findings, action_required_items, open_questions, contradictions,
            output_artifact_id, output_path, structured_output_json, reviewed_by,
            reviewed_at, promoted_decision_ids, promoted_backlog_ids,
            promoted_action_ids, metadata
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,
            $7::text[],$8,$9,
            $10::text[],$11::text[],$12::text[],$13::jsonb,
            $14::jsonb,$15::jsonb,$16::jsonb,
            $17::jsonb,$18::jsonb,$19::jsonb,
            $20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,
            $24,$25,$26::jsonb,$27,
            $28,$29::text[],$30::text[],
            $31::text[],$32::jsonb
          )
          ON CONFLICT (report_artifact_id) DO UPDATE
          SET report_type = EXCLUDED.report_type,
              scope_key = EXCLUDED.scope_key,
              department = EXCLUDED.department,
              title = EXCLUDED.title,
              status = EXCLUDED.status,
              source_ids = EXCLUDED.source_ids,
              generated_by_job_run_id = EXCLUDED.generated_by_job_run_id,
              intelligence_job_run_id = EXCLUDED.intelligence_job_run_id,
              input_artifact_ids = EXCLUDED.input_artifact_ids,
              input_candidate_keys = EXCLUDED.input_candidate_keys,
              input_atom_ids = EXCLUDED.input_atom_ids,
              input_fact_refs = EXCLUDED.input_fact_refs,
              source_coverage = EXCLUDED.source_coverage,
              freshness_warnings = EXCLUDED.freshness_warnings,
              missing_source_warnings = EXCLUDED.missing_source_warnings,
              stale_source_warnings = EXCLUDED.stale_source_warnings,
              dedup_summary = EXCLUDED.dedup_summary,
              rejected_noise_summary = EXCLUDED.rejected_noise_summary,
              top_findings = EXCLUDED.top_findings,
              action_required_items = EXCLUDED.action_required_items,
              open_questions = EXCLUDED.open_questions,
              contradictions = EXCLUDED.contradictions,
              output_artifact_id = EXCLUDED.output_artifact_id,
              output_path = EXCLUDED.output_path,
              structured_output_json = EXCLUDED.structured_output_json,
              reviewed_by = EXCLUDED.reviewed_by,
              reviewed_at = EXCLUDED.reviewed_at,
              promoted_decision_ids = EXCLUDED.promoted_decision_ids,
              promoted_backlog_ids = EXCLUDED.promoted_backlog_ids,
              promoted_action_ids = EXCLUDED.promoted_action_ids,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
          RETURNING *
        `,
        [
          reportArtifactId,
          reportType,
          input.scopeKey || input.scope_key || null,
          input.department || null,
          String(input.title || '').trim() || reportArtifactId,
          status,
          sourceIds,
          input.generatedByJobRunId || input.generated_by_job_run_id || null,
          input.intelligenceJobRunId || input.intelligence_job_run_id || null,
          inputArtifactIds,
          inputCandidateKeys,
          inputAtomIds,
          JSON.stringify(input.inputFactRefs || input.input_fact_refs || []),
          JSON.stringify(input.sourceCoverage || input.source_coverage || []),
          JSON.stringify(input.freshnessWarnings || input.freshness_warnings || []),
          JSON.stringify(input.missingSourceWarnings || input.missing_source_warnings || []),
          JSON.stringify(input.staleSourceWarnings || input.stale_source_warnings || []),
          JSON.stringify(input.dedupSummary || input.dedup_summary || {}),
          JSON.stringify(input.rejectedNoiseSummary || input.rejected_noise_summary || []),
          JSON.stringify(input.topFindings || input.top_findings || []),
          JSON.stringify(input.actionRequiredItems || input.action_required_items || []),
          JSON.stringify(input.openQuestions || input.open_questions || []),
          JSON.stringify(input.contradictions || []),
          input.outputArtifactId || input.output_artifact_id || null,
          input.outputPath || input.output_path || null,
          JSON.stringify(input.structuredOutputJson || input.structured_output_json || {}),
          input.reviewedBy || input.reviewed_by || null,
          input.reviewedAt || input.reviewed_at || null,
          promotedDecisionIds,
          promotedBacklogIds,
          promotedActionIds,
          JSON.stringify({
            ...(input.metadata || {}),
            recordedBy: actor,
          }),
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_report_artifact_recorded',
        entityTable: 'intelligence_report_artifacts',
        entityId: reportArtifactId,
        actor,
        summary: `Recorded intelligence report artifact ${reportArtifactId}`,
        metadata: {
          reportType,
          status,
          sourceIds,
        },
      })

      return mapIntelligenceReportArtifactRow(result.rows[0])
    })
  }

  async function upsertIntelligenceAtom(input = {}, actor = 'system') {
    const sourceId = String(input.sourceId || input.source_id || '').trim()
    if (!sourceId) throw new Error('sourceId is required for intelligence atoms.')
    assertRegisteredSourceIds([sourceId], 'sourceId')

    const dedupHash = String(input.dedupHash || input.dedup_hash || computeIntelligenceAtomDedupHash(input)).trim()
    const requestedAtomId = String(input.atomId || input.atom_id || `atom-${dedupHash.slice(0, 20)}`).trim()
    const atomType = normalizeIntelligenceAtomType(input.atomType || input.atom_type)
    const status = normalizeIntelligenceAtomStatus(input.status)
    const modality = normalizeIntelligenceAtomModality(input.modality)
    const freshness = normalizeIntelligenceAtomFreshness(input.freshness)

    return withFoundationTransaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`intelligence_atom:${dedupHash}`])
      const existingResult = await client.query(
        `
          SELECT atom_id
          FROM intelligence_atoms
          WHERE dedup_hash = $1
            AND status NOT IN ('rejected', 'archived', 'superseded')
          ORDER BY updated_at DESC
          LIMIT 1
          FOR UPDATE
        `,
        [dedupHash]
      )
      const atomId = existingResult.rows[0]?.atom_id || requestedAtomId

      const result = await client.query(
        `
          INSERT INTO intelligence_atoms (
            atom_id, title, content, atom_type, source_id, artifact_id,
            source_crawl_run_id, intelligence_job_run_id, candidate_key,
            report_artifact_id, modality, anchor_type, anchor_value,
            evidence_excerpt, visual_observation, derived_claim, entity_refs,
            person_refs, metric_refs, topic_refs, department, pillar, value_route,
            content_use_class, audience, avatar_ids, avatar_names, platform_fit,
            format_rec, emotion, content_type, quality_score, relevance_score,
            source_confidence, extraction_confidence, sensitivity, min_tier,
            subject_people, freshness, status, used_in, perf_score, perf_notes,
            dedup_hash, supersedes_atom_id, superseded_by_atom_id, parent_atom_id,
            suggested_owner, suggested_action, action_router_record_id,
            accepted_at, accepted_by, rejected_at, rejected_by, review_note,
            expires_at, stale_after, tags, notes, metadata, filed_by
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,
            $10,$11,$12,$13,
            $14,$15,$16,$17::text[],
            $18::text[],$19::text[],$20::text[],$21,$22,$23,
            $24,$25,$26::text[],$27,$28::text[],
            $29::text[],$30,$31,$32,$33,
            $34,$35,$36,$37,
            $38::jsonb,$39,$40,$41::jsonb,$42,$43,
            $44,$45,$46,$47,
            $48,$49,$50,
            $51,$52,$53,$54,$55,
            $56,$57,$58::text[],$59,$60::jsonb,$61
          )
          ON CONFLICT (atom_id) DO UPDATE
          SET title = EXCLUDED.title,
              content = EXCLUDED.content,
              atom_type = EXCLUDED.atom_type,
              source_id = EXCLUDED.source_id,
              artifact_id = EXCLUDED.artifact_id,
              source_crawl_run_id = EXCLUDED.source_crawl_run_id,
              intelligence_job_run_id = EXCLUDED.intelligence_job_run_id,
              candidate_key = EXCLUDED.candidate_key,
              report_artifact_id = EXCLUDED.report_artifact_id,
              modality = EXCLUDED.modality,
              anchor_type = EXCLUDED.anchor_type,
              anchor_value = EXCLUDED.anchor_value,
              evidence_excerpt = EXCLUDED.evidence_excerpt,
              visual_observation = EXCLUDED.visual_observation,
              derived_claim = EXCLUDED.derived_claim,
              entity_refs = EXCLUDED.entity_refs,
              person_refs = EXCLUDED.person_refs,
              metric_refs = EXCLUDED.metric_refs,
              topic_refs = EXCLUDED.topic_refs,
              department = EXCLUDED.department,
              pillar = EXCLUDED.pillar,
              value_route = EXCLUDED.value_route,
              content_use_class = EXCLUDED.content_use_class,
              audience = EXCLUDED.audience,
              avatar_ids = EXCLUDED.avatar_ids,
              avatar_names = EXCLUDED.avatar_names,
              platform_fit = EXCLUDED.platform_fit,
              format_rec = EXCLUDED.format_rec,
              emotion = EXCLUDED.emotion,
              content_type = EXCLUDED.content_type,
              quality_score = EXCLUDED.quality_score,
              relevance_score = EXCLUDED.relevance_score,
              source_confidence = EXCLUDED.source_confidence,
              extraction_confidence = EXCLUDED.extraction_confidence,
              sensitivity = EXCLUDED.sensitivity,
              min_tier = EXCLUDED.min_tier,
              subject_people = EXCLUDED.subject_people,
              freshness = EXCLUDED.freshness,
              status = EXCLUDED.status,
              used_in = EXCLUDED.used_in,
              perf_score = EXCLUDED.perf_score,
              perf_notes = EXCLUDED.perf_notes,
              dedup_hash = EXCLUDED.dedup_hash,
              supersedes_atom_id = EXCLUDED.supersedes_atom_id,
              superseded_by_atom_id = EXCLUDED.superseded_by_atom_id,
              parent_atom_id = EXCLUDED.parent_atom_id,
              suggested_owner = EXCLUDED.suggested_owner,
              suggested_action = EXCLUDED.suggested_action,
              action_router_record_id = EXCLUDED.action_router_record_id,
              accepted_at = EXCLUDED.accepted_at,
              accepted_by = EXCLUDED.accepted_by,
              rejected_at = EXCLUDED.rejected_at,
              rejected_by = EXCLUDED.rejected_by,
              review_note = EXCLUDED.review_note,
              expires_at = EXCLUDED.expires_at,
              stale_after = EXCLUDED.stale_after,
              tags = EXCLUDED.tags,
              notes = EXCLUDED.notes,
              metadata = EXCLUDED.metadata,
              filed_by = EXCLUDED.filed_by,
              updated_at = NOW()
          RETURNING *
        `,
        [
          atomId,
          String(input.title || '').trim() || atomId,
          input.content || '',
          atomType,
          sourceId,
          input.artifactId || input.artifact_id || null,
          input.sourceCrawlRunId || input.source_crawl_run_id || null,
          input.intelligenceJobRunId || input.intelligence_job_run_id || null,
          input.candidateKey || input.candidate_key || null,
          input.reportArtifactId || input.report_artifact_id || null,
          modality,
          input.anchorType || input.anchor_type || null,
          input.anchorValue || input.anchor_value || null,
          input.evidenceExcerpt || input.evidence_excerpt || '',
          input.visualObservation || input.visual_observation || null,
          input.derivedClaim || input.derived_claim || '',
          normalizeTextArray(input.entityRefs || input.entity_refs),
          normalizeTextArray(input.personRefs || input.person_refs),
          normalizeTextArray(input.metricRefs || input.metric_refs),
          normalizeTextArray(input.topicRefs || input.topic_refs),
          input.department || null,
          input.pillar || null,
          input.valueRoute || input.value_route || null,
          input.contentUseClass || input.content_use_class || null,
          input.audience || null,
          normalizeTextArray(input.avatarIds || input.avatar_ids),
          input.avatarNames || input.avatar_names || null,
          normalizeTextArray(input.platformFit || input.platform_fit),
          normalizeTextArray(input.formatRec || input.format_rec),
          input.emotion || null,
          input.contentType || input.content_type || null,
          Number(input.qualityScore ?? input.quality_score ?? 0),
          Number(input.relevanceScore ?? input.relevance_score ?? 0),
          input.sourceConfidence ?? input.source_confidence ?? null,
          input.extractionConfidence ?? input.extraction_confidence ?? null,
          input.sensitivity || 'neutral',
          Number(input.minTier ?? input.min_tier ?? 1),
          JSON.stringify(input.subjectPeople || input.subject_people || []),
          freshness,
          status,
          JSON.stringify(input.usedIn || input.used_in || []),
          input.perfScore ?? input.perf_score ?? null,
          input.perfNotes || input.perf_notes || null,
          dedupHash,
          input.supersedesAtomId || input.supersedes_atom_id || null,
          input.supersededByAtomId || input.superseded_by_atom_id || null,
          input.parentAtomId || input.parent_atom_id || null,
          input.suggestedOwner || input.suggested_owner || null,
          input.suggestedAction || input.suggested_action || null,
          input.actionRouterRecordId || input.action_router_record_id || null,
          input.acceptedAt || input.accepted_at || null,
          input.acceptedBy || input.accepted_by || null,
          input.rejectedAt || input.rejected_at || null,
          input.rejectedBy || input.rejected_by || null,
          input.reviewNote || input.review_note || null,
          input.expiresAt || input.expires_at || null,
          input.staleAfter || input.stale_after || null,
          normalizeTextArray(input.tags),
          input.notes || null,
          JSON.stringify({
            ...(input.metadata || {}),
            requestedAtomId,
            recordedBy: actor,
          }),
          input.filedBy || input.filed_by || actor,
        ]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_atom_upserted',
        entityTable: 'intelligence_atoms',
        entityId: atomId,
        actor,
        summary: `Upserted intelligence atom ${atomId}`,
        metadata: {
          sourceId,
          atomType,
          status,
          dedupHash,
          requestedAtomId,
          reportArtifactId: input.reportArtifactId || input.report_artifact_id || null,
        },
      })

      return mapIntelligenceAtomRow(result.rows[0])
    })
  }

  async function recordIntelligenceAtomHit(input = {}, actor = 'system') {
    const atomId = String(input.atomId || input.atom_id || '').trim()
    const sourceId = String(input.sourceId || input.source_id || '').trim()
    if (!atomId || !sourceId) throw new Error('atomId and sourceId are required for atom hits.')
    assertRegisteredSourceIds([sourceId], 'sourceId')

    const hitId = String(input.hitId || input.hit_id || `atom-hit-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()
    const hitType = normalizeIntelligenceAtomHitType(input.hitType || input.hit_type)

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO intelligence_atom_hits (
            hit_id, atom_id, source_id, artifact_id, candidate_key,
            report_artifact_id, intelligence_job_run_id, hit_type,
            evidence_excerpt, anchor_type, anchor_value, confidence,
            occurred_at, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
          ON CONFLICT (hit_id) DO UPDATE
          SET atom_id = EXCLUDED.atom_id,
              source_id = EXCLUDED.source_id,
              artifact_id = EXCLUDED.artifact_id,
              candidate_key = EXCLUDED.candidate_key,
              report_artifact_id = EXCLUDED.report_artifact_id,
              intelligence_job_run_id = EXCLUDED.intelligence_job_run_id,
              hit_type = EXCLUDED.hit_type,
              evidence_excerpt = EXCLUDED.evidence_excerpt,
              anchor_type = EXCLUDED.anchor_type,
              anchor_value = EXCLUDED.anchor_value,
              confidence = EXCLUDED.confidence,
              occurred_at = EXCLUDED.occurred_at,
              metadata = EXCLUDED.metadata
          RETURNING *
        `,
        [
          hitId,
          atomId,
          sourceId,
          input.artifactId || input.artifact_id || null,
          input.candidateKey || input.candidate_key || null,
          input.reportArtifactId || input.report_artifact_id || null,
          input.intelligenceJobRunId || input.intelligence_job_run_id || null,
          hitType,
          input.evidenceExcerpt || input.evidence_excerpt || '',
          input.anchorType || input.anchor_type || null,
          input.anchorValue || input.anchor_value || null,
          input.confidence ?? null,
          input.occurredAt || input.occurred_at || new Date().toISOString(),
          JSON.stringify({
            ...(input.metadata || {}),
            recordedBy: actor,
          }),
        ]
      )

      await client.query(
        `
          WITH hit_stats AS (
            SELECT
              COUNT(*)::int AS hit_count,
              MIN(occurred_at) AS first_hit_at,
              MAX(occurred_at) AS last_hit_at
            FROM intelligence_atom_hits
            WHERE atom_id = $1
          )
          UPDATE intelligence_atoms
          SET hit_count = hit_stats.hit_count,
              first_hit_at = COALESCE(hit_stats.first_hit_at, intelligence_atoms.first_hit_at),
              last_hit_at = COALESCE(hit_stats.last_hit_at, intelligence_atoms.last_hit_at),
              updated_at = NOW()
          FROM hit_stats
          WHERE atom_id = $1
        `,
        [atomId]
      )

      await insertChangeEvent(client, {
        eventType: 'intelligence_atom_hit_recorded',
        entityTable: 'intelligence_atom_hits',
        entityId: hitId,
        actor,
        summary: `Recorded ${hitType} hit for intelligence atom ${atomId}`,
        metadata: {
          atomId,
          sourceId,
          hitType,
        },
      })

      return mapIntelligenceAtomHitRow(result.rows[0])
    })
  }

  async function queryIntelligenceAtomsForScoper(filters = {}) {
    const maxTierInput = filters.maxTier ?? filters.max_tier
    const maxTier = Number(maxTierInput)
    if (!Number.isFinite(maxTier) || maxTier < 1) {
      throw new Error('queryIntelligenceAtomsForScoper requires maxTier >= 1.')
    }

    const values = []
    const clauses = []

    function addTextArrayOverlap(column, inputValues) {
      const normalized = normalizeTextArray(inputValues)
      if (!normalized.length) return
      values.push(normalized)
      clauses.push(`${column} && $${values.length}::text[]`)
    }

    function addTextAny(column, inputValues) {
      const normalized = normalizeTextArray(inputValues)
      if (!normalized.length) return
      values.push(normalized)
      clauses.push(`${column} = ANY($${values.length}::text[])`)
    }

    addTextAny('source_id', filters.sourceIds || filters.source_ids)
    addTextAny('artifact_id', filters.artifactIds || filters.artifact_ids)
    addTextAny('candidate_key', filters.candidateKeys || filters.candidate_keys)
    addTextAny('report_artifact_id', filters.reportArtifactIds || filters.report_artifact_ids)
    addTextAny('department', filters.departments)
    addTextAny('pillar', filters.pillars)
    addTextAny('value_route', filters.valueRoutes || filters.value_routes)
    addTextAny('status', filters.statuses)
    addTextArrayOverlap('entity_refs', filters.entityRefs || filters.entity_refs)
    addTextArrayOverlap('person_refs', filters.personRefs || filters.person_refs)
    addTextArrayOverlap('metric_refs', filters.metricRefs || filters.metric_refs)
    addTextArrayOverlap('topic_refs', filters.topicRefs || filters.topic_refs)
    addTextArrayOverlap('avatar_ids', filters.avatarIds || filters.avatar_ids)

    values.push(maxTier)
    clauses.push(`min_tier <= $${values.length}`)

    if (filters.query) {
      values.push(`%${String(filters.query).trim()}%`)
      clauses.push(`(title ILIKE $${values.length} OR content ILIKE $${values.length} OR derived_claim ILIKE $${values.length} OR evidence_excerpt ILIKE $${values.length})`)
    }

    const normalizedLimit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
    values.push(normalizedLimit)

    const result = await pool.query(
      `
        SELECT *
        FROM intelligence_atoms
        ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
        ORDER BY
          CASE status
            WHEN 'winner' THEN 0
            WHEN 'accepted' THEN 1
            WHEN 'structural' THEN 2
            WHEN 'recurring' THEN 3
            WHEN 'confirmed' THEN 4
            ELSE 5
          END,
          quality_score DESC,
          relevance_score DESC,
          hit_count DESC,
          updated_at DESC
        LIMIT $${values.length}
      `,
      values
    )

    return result.rows.map(mapIntelligenceAtomRow)
  }

  async function getIntelligenceAtomSpineSnapshot({ limit = 20 } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const [atomSummaryResult, reportSummaryResult, hitSummaryResult, atomsResult, reportsResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_atoms,
          COUNT(*) FILTER (WHERE status NOT IN ('rejected', 'archived', 'superseded'))::int AS active_atoms,
          COUNT(*) FILTER (WHERE report_artifact_id IS NOT NULL)::int AS atoms_with_report_artifact,
          COUNT(*) FILTER (WHERE array_length(entity_refs, 1) IS NOT NULL OR array_length(person_refs, 1) IS NOT NULL OR array_length(metric_refs, 1) IS NOT NULL OR array_length(avatar_ids, 1) IS NOT NULL)::int AS atoms_with_scoper_query_fields
        FROM intelligence_atoms
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_reports,
          COUNT(*) FILTER (WHERE status IN ('generated', 'reviewed', 'promoted'))::int AS active_reports
        FROM intelligence_report_artifacts
      `),
      pool.query(`
        SELECT COUNT(*)::int AS total_hits
        FROM intelligence_atom_hits
      `),
      pool.query(`
        SELECT *
        FROM intelligence_atoms
        ORDER BY updated_at DESC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT *
        FROM intelligence_report_artifacts
        ORDER BY updated_at DESC
        LIMIT $1
      `, [normalizedLimit]),
    ])

    const byStatusResult = await pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM intelligence_atoms
      GROUP BY status
      ORDER BY count DESC, status ASC
    `)

    const byValueRouteResult = await pool.query(`
      SELECT COALESCE(value_route, 'unrouted') AS value_route, COUNT(*)::int AS count
      FROM intelligence_atoms
      GROUP BY COALESCE(value_route, 'unrouted')
      ORDER BY count DESC, value_route ASC
    `)

    const latestScoperQueryProof = await queryIntelligenceAtomsForScoper({
      statuses: ['accepted', 'confirmed', 'detected', 'recurring', 'structural', 'winner'],
      maxTier: 1,
      limit: 5,
    })

    return {
      generatedAt: new Date().toISOString(),
      totalAtoms: Number(atomSummaryResult.rows[0]?.total_atoms || 0),
      activeAtoms: Number(atomSummaryResult.rows[0]?.active_atoms || 0),
      atomsWithReportArtifact: Number(atomSummaryResult.rows[0]?.atoms_with_report_artifact || 0),
      atomsWithScoperQueryFields: Number(atomSummaryResult.rows[0]?.atoms_with_scoper_query_fields || 0),
      totalReports: Number(reportSummaryResult.rows[0]?.total_reports || 0),
      activeReports: Number(reportSummaryResult.rows[0]?.active_reports || 0),
      totalHits: Number(hitSummaryResult.rows[0]?.total_hits || 0),
      byStatus: byStatusResult.rows.map(row => ({ status: row.status, count: Number(row.count || 0) })),
      byValueRoute: byValueRouteResult.rows.map(row => ({ valueRoute: row.value_route, count: Number(row.count || 0) })),
      recentAtoms: atomsResult.rows.map(mapIntelligenceAtomRow),
      recentReports: reportsResult.rows.map(mapIntelligenceReportArtifactRow),
      latestScoperQueryProof,
    }
  }

  return {
    getIntelligenceAtomSpineSnapshot,
    queryIntelligenceAtomsForScoper,
    recordIntelligenceAtomHit,
    upsertIntelligenceAtom,
    upsertIntelligenceReportArtifact,
  }
}
