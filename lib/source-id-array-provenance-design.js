import {
  SOURCE_ID_CONSTRAINT_CLASSIFICATIONS,
  getSourceIdConstraintContractRows,
} from './source-id-constraint-contract.js'

export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID = 'SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001'
export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY = 'source-id-array-provenance-design-v1'
export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_PLAN_PATH = 'docs/process/source-id-array-provenance-design-001-plan.md'
export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_APPROVAL_PATH = 'docs/process/approvals/SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001.json'
export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SCRIPT_PATH = 'scripts/process-source-id-array-provenance-design-check.mjs'
export const SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SPRINT_ID = 'source-id-array-provenance-design-2026-05-16'
export const SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT = 3

const SOURCE_REGISTRY_TABLE = 'source_contract_registry'
const SOURCE_REGISTRY_COLUMN = 'source_id'
const REQUIRED_IMPLEMENTATION_STEPS = [
  'create_child_table',
  'backfill_from_array',
  'invalid_source_id_preflight',
  'dual_write_application_path',
  'parent_child_parity_verifier',
]

const DESIGN_RECOMMENDATIONS = {
  'intelligence_report_artifacts.source_ids': {
    childTable: 'intelligence_report_artifact_sources',
    parentTable: 'intelligence_report_artifacts',
    parentKey: 'report_artifact_id',
    parentFk: 'report_artifact_id',
    ordinalColumn: 'source_ordinal',
    metadataColumns: ['provenance_role', 'evidence_scope', 'created_at'],
    canonicalEnforcement: 'normalized_child_table',
    triggerRole: 'temporary_compatibility_guard_not_canonical',
    generatedScalarProjection: 'rejected_for_canonical_enforcement',
    laterApplyPosture: 'apply_gated_schema_migration',
    implementationSteps: REQUIRED_IMPLEMENTATION_STEPS,
    rationale: 'Report artifacts can cite many sources, so canonical enforcement needs one child row per source with a source_contract_registry FK and queryable provenance metadata.',
  },
  'intelligence_retrieval_runs.source_ids': {
    childTable: 'intelligence_retrieval_run_sources',
    parentTable: 'intelligence_retrieval_runs',
    parentKey: 'run_id',
    parentFk: 'run_id',
    ordinalColumn: 'source_ordinal',
    metadataColumns: ['retrieval_scope', 'filter_role', 'created_at'],
    canonicalEnforcement: 'normalized_child_table',
    triggerRole: 'temporary_compatibility_guard_not_canonical',
    generatedScalarProjection: 'rejected_for_canonical_enforcement',
    laterApplyPosture: 'apply_gated_schema_migration',
    implementationSteps: REQUIRED_IMPLEMENTATION_STEPS,
    rationale: 'Retrieval runs can span multiple sources, so a child table preserves all contributing source IDs without collapsing the run to one primary source.',
  },
  'shared_communication_synthesized_items.source_ids': {
    childTable: 'shared_communication_synthesized_item_sources',
    parentTable: 'shared_communication_synthesized_items',
    parentKey: 'synthesis_item_id',
    parentFk: 'synthesis_item_id',
    ordinalColumn: 'source_ordinal',
    metadataColumns: ['evidence_role', 'claim_role', 'created_at'],
    canonicalEnforcement: 'normalized_child_table',
    triggerRole: 'temporary_compatibility_guard_not_canonical',
    generatedScalarProjection: 'rejected_for_canonical_enforcement',
    laterApplyPosture: 'apply_gated_schema_migration',
    implementationSteps: REQUIRED_IMPLEMENTATION_STEPS,
    rationale: 'Synthesized items cite multiple evidence sources, so canonical enforcement must make each cited source queryable and FK-backed.',
  },
}

function normalizeRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({
      ...row,
      relation: String(row?.relation || '').trim(),
      table: String(row?.table || '').trim(),
      column: String(row?.column || '').trim(),
      valueShape: String(row?.valueShape || '').trim(),
      classification: String(row?.classification || '').trim(),
    }))
    .filter(row => row.relation)
}

function selectArrayContractRows(contractRows = getSourceIdConstraintContractRows()) {
  return normalizeRows(contractRows).filter(row =>
    row.valueShape === 'array' &&
    row.column === 'source_ids' &&
    row.classification === SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign
  )
}

function addFinding(findings, key, relation, detail) {
  findings.push({ key, relation, detail })
}

export function getSourceIdArrayProvenanceDesignRows({
  contractRows = getSourceIdConstraintContractRows(),
  designRecommendations = DESIGN_RECOMMENDATIONS,
} = {}) {
  return selectArrayContractRows(contractRows).map(row => {
    const recommendation = designRecommendations[row.relation] || {}
    return {
      relation: row.relation,
      table: row.table,
      column: row.column,
      valueShape: row.valueShape,
      classification: row.classification,
      childTable: recommendation.childTable || '',
      parentTable: recommendation.parentTable || row.table,
      parentKey: recommendation.parentKey || '',
      parentFk: recommendation.parentFk || '',
      sourceIdColumn: SOURCE_REGISTRY_COLUMN,
      sourceRegistryTable: recommendation.sourceRegistryTable || SOURCE_REGISTRY_TABLE,
      sourceRegistryColumn: recommendation.sourceRegistryColumn || SOURCE_REGISTRY_COLUMN,
      ordinalColumn: recommendation.ordinalColumn || '',
      metadataColumns: Array.isArray(recommendation.metadataColumns) ? recommendation.metadataColumns : [],
      canonicalEnforcement: recommendation.canonicalEnforcement || '',
      triggerRole: recommendation.triggerRole || '',
      generatedScalarProjection: recommendation.generatedScalarProjection || '',
      laterApplyPosture: recommendation.laterApplyPosture || '',
      implementationSteps: Array.isArray(recommendation.implementationSteps) ? recommendation.implementationSteps : [],
      simpleArrayFkRejected: recommendation.simpleArrayFkRejected !== false,
      rationale: String(recommendation.rationale || '').trim(),
    }
  })
}

export function evaluateSourceIdArrayProvenanceDesign({
  contractRows = getSourceIdConstraintContractRows(),
  designRows = null,
  reportOnly = true,
} = {}) {
  const findings = []
  const selectedContractRows = selectArrayContractRows(contractRows)
  const rows = Array.isArray(designRows)
    ? normalizeRows(designRows).map(row => ({
      ...row,
      metadataColumns: Array.isArray(row.metadataColumns) ? row.metadataColumns : [],
      implementationSteps: Array.isArray(row.implementationSteps) ? row.implementationSteps : [],
      simpleArrayFkRejected: row.simpleArrayFkRejected !== false,
    }))
    : getSourceIdArrayProvenanceDesignRows({ contractRows })
  const selectedRelations = selectedContractRows.map(row => row.relation)
  const rowRelations = rows.map(row => row.relation)
  const relationCounts = rowRelations.reduce((counts, relation) => {
    counts[relation] = (counts[relation] || 0) + 1
    return counts
  }, {})

  if (reportOnly !== true) {
    addFinding(findings, 'report_only_boundary', 'design', 'array provenance design must stay report-only in this card')
  }
  if (selectedContractRows.length !== SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT) {
    addFinding(findings, 'wrong_array_relation_count', 'contract', `expected ${SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT}, found ${selectedContractRows.length}`)
  }
  if (rows.length !== SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT) {
    addFinding(findings, 'wrong_design_relation_count', 'design', `expected ${SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT}, found ${rows.length}`)
  }
  for (const relation of selectedRelations) {
    if (!rowRelations.includes(relation)) {
      addFinding(findings, 'missing_array_design_relation', relation, 'selected array-backed contract relation has no design row')
    }
  }
  for (const [relation, count] of Object.entries(relationCounts)) {
    if (count > 1) addFinding(findings, 'duplicate_design_relation', relation, `${count} duplicate rows`)
  }

  for (const row of rows) {
    if (!selectedRelations.includes(row.relation)) {
      addFinding(findings, 'scalar_or_extra_relation_leak', row.relation, 'design row is not one of the array-backed source_ids relations')
    }
    if (row.valueShape !== 'array' || row.column !== 'source_ids' || row.classification !== SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.needsSchemaDesign) {
      addFinding(findings, 'invalid_array_relation_shape', row.relation, 'design rows must be array-backed source_ids relations classified needs_schema_design')
    }
    if (row.canonicalEnforcement !== 'normalized_child_table') {
      addFinding(findings, 'missing_normalized_child_table', row.relation, 'canonical enforcement must be a normalized child table')
    }
    if (!row.childTable || row.childTable === row.table || !/sources$/.test(row.childTable)) {
      addFinding(findings, 'invalid_child_table', row.relation, `childTable=${row.childTable || 'missing'}`)
    }
    if (row.parentTable !== row.table || !row.parentKey || !row.parentFk) {
      addFinding(findings, 'missing_parent_fk_design', row.relation, 'child table must name parent table, parent key, and parent FK column')
    }
    if (row.sourceIdColumn !== SOURCE_REGISTRY_COLUMN || row.sourceRegistryTable !== SOURCE_REGISTRY_TABLE || row.sourceRegistryColumn !== SOURCE_REGISTRY_COLUMN) {
      addFinding(findings, 'missing_source_registry_fk_design', row.relation, 'child table must include source_id FK to source_contract_registry(source_id)')
    }
    if (row.simpleArrayFkRejected !== true || /simple_array_fk|array_fk|direct_fk/i.test(row.canonicalEnforcement)) {
      addFinding(findings, 'unsafe_simple_array_fk_claim', row.relation, 'simple FKs cannot enforce each source_ids array element')
    }
    if (row.generatedScalarProjection !== 'rejected_for_canonical_enforcement') {
      addFinding(findings, 'unsafe_generated_scalar_projection', row.relation, 'generated scalar projection cannot be canonical for multi-source provenance')
    }
    if (row.triggerRole !== 'temporary_compatibility_guard_not_canonical') {
      addFinding(findings, 'trigger_claimed_as_canonical', row.relation, 'trigger-only validation may be temporary but cannot be canonical provenance truth')
    }
    const missingSteps = REQUIRED_IMPLEMENTATION_STEPS.filter(step => !row.implementationSteps.includes(step))
    if (row.laterApplyPosture !== 'apply_gated_schema_migration' || missingSteps.length) {
      addFinding(findings, 'missing_apply_gated_backfill_plan', row.relation, missingSteps.length ? `missing ${missingSteps.join(', ')}` : `laterApplyPosture=${row.laterApplyPosture || 'missing'}`)
    }
    if (!row.ordinalColumn || !row.metadataColumns.length) {
      addFinding(findings, 'missing_queryable_provenance_metadata', row.relation, 'child table design must include ordinal and provenance metadata fields')
    }
    if (String(row.rationale || '').length < 80) {
      addFinding(findings, 'missing_design_rationale', row.relation, 'rationale must explain why the normalized design preserves source provenance')
    }
  }

  return {
    ok: findings.length === 0,
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID,
    closeoutKey: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY,
    mutationPosture: 'report_only',
    expectedRelationCount: SOURCE_ID_ARRAY_PROVENANCE_EXPECTED_RELATION_COUNT,
    selectedRelationCount: selectedContractRows.length,
    designRelationCount: rows.length,
    selectedRelations,
    rows,
    findings,
  }
}

function mutateDesign(relation, patch) {
  return getSourceIdArrayProvenanceDesignRows().map(row =>
    row.relation === relation ? { ...row, ...patch } : row
  )
}

export function buildSourceIdArrayProvenanceDesignDogfoodProof() {
  const valid = evaluateSourceIdArrayProvenanceDesign()
  const unsafeArrayFk = evaluateSourceIdArrayProvenanceDesign({
    designRows: mutateDesign('intelligence_report_artifacts.source_ids', {
      canonicalEnforcement: 'simple_array_fk',
      simpleArrayFkRejected: false,
    }),
  })
  const missingChildFk = evaluateSourceIdArrayProvenanceDesign({
    designRows: mutateDesign('intelligence_retrieval_runs.source_ids', {
      sourceRegistryTable: '',
      sourceRegistryColumn: '',
    }),
  })
  const scalarLeak = evaluateSourceIdArrayProvenanceDesign({
    designRows: [
      ...getSourceIdArrayProvenanceDesignRows(),
      {
        relation: 'intelligence_atoms.source_id',
        table: 'intelligence_atoms',
        column: 'source_id',
        valueShape: 'scalar',
        classification: SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow,
        childTable: 'intelligence_atom_sources',
        parentTable: 'intelligence_atoms',
        parentKey: 'atom_id',
        parentFk: 'atom_id',
        sourceIdColumn: SOURCE_REGISTRY_COLUMN,
        sourceRegistryTable: SOURCE_REGISTRY_TABLE,
        sourceRegistryColumn: SOURCE_REGISTRY_COLUMN,
        ordinalColumn: 'source_ordinal',
        metadataColumns: ['created_at'],
        canonicalEnforcement: 'normalized_child_table',
        triggerRole: 'temporary_compatibility_guard_not_canonical',
        generatedScalarProjection: 'rejected_for_canonical_enforcement',
        laterApplyPosture: 'apply_gated_schema_migration',
        implementationSteps: REQUIRED_IMPLEMENTATION_STEPS,
        simpleArrayFkRejected: true,
        rationale: 'Synthetic scalar leak for dogfood only; this must be rejected because scalar source_id relations already use scalar FK enforcement.',
      },
    ],
  })
  const missingBackfill = evaluateSourceIdArrayProvenanceDesign({
    designRows: mutateDesign('shared_communication_synthesized_items.source_ids', {
      implementationSteps: REQUIRED_IMPLEMENTATION_STEPS.filter(step => step !== 'backfill_from_array'),
    }),
  })
  const mutationPosture = evaluateSourceIdArrayProvenanceDesign({ reportOnly: false })
  const wrongCount = evaluateSourceIdArrayProvenanceDesign({
    designRows: getSourceIdArrayProvenanceDesignRows().slice(0, 2),
  })

  const ok = valid.ok === true &&
    unsafeArrayFk.findings.some(finding => finding.key === 'unsafe_simple_array_fk_claim') &&
    missingChildFk.findings.some(finding => finding.key === 'missing_source_registry_fk_design') &&
    scalarLeak.findings.some(finding => finding.key === 'scalar_or_extra_relation_leak') &&
    missingBackfill.findings.some(finding => finding.key === 'missing_apply_gated_backfill_plan') &&
    mutationPosture.findings.some(finding => finding.key === 'report_only_boundary') &&
    wrongCount.findings.some(finding => finding.key === 'wrong_design_relation_count')

  return {
    ok,
    valid: {
      ok: valid.ok,
      selectedRelationCount: valid.selectedRelationCount,
      designRelationCount: valid.designRelationCount,
      selectedRelations: valid.selectedRelations,
    },
    unsafeArrayFk: {
      ok: unsafeArrayFk.ok,
      findingKeys: unsafeArrayFk.findings.map(finding => finding.key),
    },
    missingChildFk: {
      ok: missingChildFk.ok,
      findingKeys: missingChildFk.findings.map(finding => finding.key),
    },
    scalarLeak: {
      ok: scalarLeak.ok,
      findingKeys: scalarLeak.findings.map(finding => finding.key),
    },
    missingBackfill: {
      ok: missingBackfill.ok,
      findingKeys: missingBackfill.findings.map(finding => finding.key),
    },
    mutationPosture: {
      ok: mutationPosture.ok,
      findingKeys: mutationPosture.findings.map(finding => finding.key),
    },
    wrongCount: {
      ok: wrongCount.ok,
      findingKeys: wrongCount.findings.map(finding => finding.key),
    },
    invariant: 'Array-backed source_ids need normalized child-table provenance with source_contract_registry(source_id) FKs; simple array FKs, scalar projection, trigger-only canonical truth, and non-report-only posture are rejected.',
  }
}
