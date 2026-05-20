export const SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID = 'SOURCE-ID-CONSTRAINT-CONTRACT-001'
export const SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY = 'source-id-constraint-contract-v1'
export const SOURCE_ID_CONSTRAINT_CONTRACT_PLAN_PATH = 'docs/process/source-id-constraint-contract-001-plan.md'
export const SOURCE_ID_CONSTRAINT_CONTRACT_APPROVAL_PATH = 'docs/process/approvals/SOURCE-ID-CONSTRAINT-CONTRACT-001.json'
export const SOURCE_ID_CONSTRAINT_CONTRACT_SCRIPT_PATH = 'scripts/process-source-id-constraint-contract-check.mjs'
export const SOURCE_ID_CONSTRAINT_CONTRACT_SPRINT_ID = 'source-id-constraint-contract-2026-05-16'

export const SOURCE_ID_CONSTRAINT_CLASSIFICATIONS = {
  fkSafeNow: 'fk_safe_now',
  verifierBacked: 'verifier_backed',
  needsSchemaDesign: 'needs_schema_design',
}

export const SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS = [
  'doc_source_snapshots.source_id',
  'shared_communication_artifacts.source_id',
  'shared_communication_candidates.source_id',
  'shared_communication_artifact_processing_runs.source_id',
  'source_crawl_targets.source_id',
  'source_crawl_target_runs.source_id',
  'source_crawl_items.source_id',
  'intelligence_report_artifacts.source_ids',
  'intelligence_atoms.source_id',
  'intelligence_atom_hits.source_id',
  'business_atoms.source_id',
  'atom_hits.source_id',
  'intelligence_retrieval_chunks.source_id',
  'intelligence_retrieval_runs.source_ids',
  'shared_communication_synthesized_items.source_ids',
]

const CONTRACT_ROWS = [
  {
    relation: 'doc_source_snapshots.source_id',
    table: 'doc_source_snapshots',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Doc source snapshots are single-source records and already require a concrete source_id, so they are safe for a future source-contract registry FK.',
  },
  {
    relation: 'shared_communication_artifacts.source_id',
    table: 'shared_communication_artifacts',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Shared communication artifacts have one owning source and use non-null source_id as provenance, so they are safe for a future source-contract registry FK.',
  },
  {
    relation: 'shared_communication_candidates.source_id',
    table: 'shared_communication_candidates',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Shared communication candidates are single-source derivations with non-null source_id, so they are safe for future FK enforcement once source contracts are DB-backed.',
  },
  {
    relation: 'shared_communication_artifact_processing_runs.source_id',
    table: 'shared_communication_artifact_processing_runs',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Artifact processing runs are ledger rows for one source at a time and already require source_id, so a future registry FK is shape-safe.',
  },
  {
    relation: 'source_crawl_targets.source_id',
    table: 'source_crawl_targets',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Source crawl targets point to one configured source contract and already require source_id, so they are safe for future FK enforcement.',
  },
  {
    relation: 'source_crawl_target_runs.source_id',
    table: 'source_crawl_target_runs',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Source crawl target runs are single-target runtime rows with non-null source_id, so they are safe for future registered-source FK enforcement.',
  },
  {
    relation: 'source_crawl_items.source_id',
    table: 'source_crawl_items',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Source crawl items are inventoried under one source and already require source_id, so they are safe for future source registry FK enforcement.',
  },
  {
    relation: 'intelligence_report_artifacts.source_ids',
    table: 'intelligence_report_artifacts',
    column: 'source_ids',
    valueShape: 'array',
    nullability: 'not_null_default_empty_array',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign,
    recommendedEnforcement: 'join_table_or_trigger_plus_verifier_until_redesigned',
    rationale: 'Report artifacts can cite multiple source IDs in a text array; a simple FK cannot enforce each array value without a join table or trigger design.',
  },
  {
    relation: 'intelligence_atoms.source_id',
    table: 'intelligence_atoms',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Intelligence atoms are single-source facts with non-null source_id and are safe for future registered-source FK enforcement.',
  },
  {
    relation: 'intelligence_atom_hits.source_id',
    table: 'intelligence_atom_hits',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Atom hits carry one source reference per hit row and already require source_id, so they are shape-safe for a future registry FK.',
  },
  {
    relation: 'business_atoms.source_id',
    table: 'business_atoms',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Business atoms are single-source planning signals with non-null source_id and direct source contract provenance, so they are shape-safe for registry FK enforcement.',
  },
  {
    relation: 'atom_hits.source_id',
    table: 'atom_hits',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Business atom hits are one-source support rows with non-null source_id, so they are safe for registered-source FK enforcement.',
  },
  {
    relation: 'intelligence_retrieval_chunks.source_id',
    table: 'intelligence_retrieval_chunks',
    column: 'source_id',
    valueShape: 'scalar',
    nullability: 'not_null',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
    recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    rationale: 'Retrieval chunks are single-source chunks with non-null source_id and can move to future registered-source FK enforcement safely.',
  },
  {
    relation: 'intelligence_retrieval_runs.source_ids',
    table: 'intelligence_retrieval_runs',
    column: 'source_ids',
    valueShape: 'array',
    nullability: 'not_null_default_empty_array',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign,
    recommendedEnforcement: 'join_table_or_trigger_plus_verifier_until_redesigned',
    rationale: 'Retrieval runs can span multiple sources in a text array; they need a join table or trigger strategy before database-level source FK enforcement.',
  },
  {
    relation: 'shared_communication_synthesized_items.source_ids',
    table: 'shared_communication_synthesized_items',
    column: 'source_ids',
    valueShape: 'array',
    nullability: 'not_null_default_empty_array',
    classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign,
    recommendedEnforcement: 'join_table_or_trigger_plus_verifier_until_redesigned',
    rationale: 'Synthesized communication items can cite multiple source IDs, so array values stay verifier-backed until a join-table provenance design exists.',
  },
]

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function normalizeContractRows(rows = CONTRACT_ROWS) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({
      ...row,
      relation: String(row?.relation || '').trim(),
      table: String(row?.table || '').trim(),
      column: String(row?.column || '').trim(),
      valueShape: String(row?.valueShape || '').trim(),
      nullability: String(row?.nullability || '').trim(),
      classification: String(row?.classification || '').trim(),
      recommendedEnforcement: String(row?.recommendedEnforcement || '').trim(),
      rationale: String(row?.rationale || '').trim(),
    }))
    .filter(row => row.relation)
}

function addFinding(findings, key, relation, detail) {
  findings.push({ key, relation, detail })
}

export function evaluateSourceIdConstraintContract({
  contractRows = CONTRACT_ROWS,
  auditedRelations = SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS,
  reportOnly = true,
} = {}) {
  const findings = []
  const rows = normalizeContractRows(contractRows)
  const relationCounts = rows.reduce((counts, row) => {
    counts[row.relation] = (counts[row.relation] || 0) + 1
    return counts
  }, {})
  const rowByRelation = new Map(rows.map(row => [row.relation, row]))
  const audited = unique((Array.isArray(auditedRelations) ? auditedRelations : []).map(relation => String(relation || '').trim()))
  const validClassifications = new Set(Object.values(SOURCE_ID_CONSTRAINT_CLASSIFICATIONS))

  if (reportOnly !== true) {
    addFinding(findings, 'report_only_boundary', 'contract', 'source-ID constraint contract must stay report-only in this card')
  }

  for (const [relation, count] of Object.entries(relationCounts)) {
    if (count > 1) addFinding(findings, 'duplicate_contract_relation', relation, `${count} duplicate rows`)
  }

  for (const relation of audited) {
    if (!rowByRelation.has(relation)) addFinding(findings, 'missing_contract_relation', relation, 'audited DB source relation has no contract row')
  }

  for (const row of rows) {
    if (!audited.includes(row.relation)) {
      addFinding(findings, 'extra_contract_relation', row.relation, 'contract row is not part of the DB constraint audit relation set')
    }
    if (!row.table || !row.column || !row.valueShape || !row.nullability) {
      addFinding(findings, 'incomplete_relation_shape', row.relation, 'table, column, valueShape, and nullability are required')
    }
    if (!validClassifications.has(row.classification)) {
      addFinding(findings, 'invalid_classification', row.relation, `classification=${row.classification || 'missing'}`)
    }
    if (row.valueShape === 'array' && row.classification === SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow) {
      addFinding(findings, 'unsafe_array_fk_claim', row.relation, 'array-backed source IDs cannot be simple FK-safe in V1')
    }
    if (row.classification === SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow &&
      !/registered_source_contract|source.*registry|source-contract/i.test(row.recommendedEnforcement)) {
      addFinding(findings, 'missing_registered_source_enforcement', row.relation, 'FK-safe rows must name registered-source enforcement')
    }
    if (row.classification === SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign &&
      !/join_table|trigger|redesign|schema/i.test(row.recommendedEnforcement)) {
      addFinding(findings, 'missing_schema_design_enforcement', row.relation, 'schema-design rows must name join table, trigger, or redesign posture')
    }
    if (row.rationale.length < 40) {
      addFinding(findings, 'missing_rationale', row.relation, 'rationale must explain why the classification is safe')
    }
  }

  const classificationCounts = rows.reduce((counts, row) => {
    counts[row.classification] = (counts[row.classification] || 0) + 1
    return counts
  }, {})

  return {
    ok: findings.length === 0,
    generatedAt: new Date().toISOString(),
    auditedRelationCount: audited.length,
    contractRelationCount: rows.length,
    classificationCounts,
    rows,
    findings,
  }
}

function mutateRow(relation, patch) {
  return CONTRACT_ROWS.map(row => row.relation === relation ? { ...row, ...patch } : row)
}

export function buildSourceIdConstraintContractDogfoodProof() {
  const valid = evaluateSourceIdConstraintContract()
  const unsafeArrayFk = evaluateSourceIdConstraintContract({
    contractRows: mutateRow('intelligence_report_artifacts.source_ids', {
      classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
      recommendedEnforcement: 'registered_source_contract_fk_after_registry_materialization',
    }),
  })
  const missingRegisteredSourceEnforcement = evaluateSourceIdConstraintContract({
    contractRows: mutateRow('doc_source_snapshots.source_id', {
      recommendedEnforcement: 'future_manual_review',
    }),
  })
  const missingRelation = evaluateSourceIdConstraintContract({
    contractRows: CONTRACT_ROWS.filter(row => row.relation !== 'source_crawl_items.source_id'),
  })
  const mutationPosture = evaluateSourceIdConstraintContract({ reportOnly: false })

  const ok = valid.ok === true &&
    unsafeArrayFk.findings.some(finding => finding.key === 'unsafe_array_fk_claim') &&
    missingRegisteredSourceEnforcement.findings.some(finding => finding.key === 'missing_registered_source_enforcement') &&
    missingRelation.findings.some(finding => finding.key === 'missing_contract_relation') &&
    mutationPosture.findings.some(finding => finding.key === 'report_only_boundary')

  return {
    ok,
    valid: {
      ok: valid.ok,
      auditedRelationCount: valid.auditedRelationCount,
      contractRelationCount: valid.contractRelationCount,
      classificationCounts: valid.classificationCounts,
    },
    unsafeArrayFk: {
      ok: unsafeArrayFk.ok,
      findingKeys: unsafeArrayFk.findings.map(finding => finding.key),
    },
    missingRegisteredSourceEnforcement: {
      ok: missingRegisteredSourceEnforcement.ok,
      findingKeys: missingRegisteredSourceEnforcement.findings.map(finding => finding.key),
    },
    missingRelation: {
      ok: missingRelation.ok,
      findingKeys: missingRelation.findings.map(finding => finding.key),
    },
    mutationPosture: {
      ok: mutationPosture.ok,
      findingKeys: mutationPosture.findings.map(finding => finding.key),
    },
  }
}

export function getSourceIdConstraintContractRows() {
  return CONTRACT_ROWS.map(row => ({ ...row }))
}
