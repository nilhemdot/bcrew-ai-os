import crypto from 'node:crypto'
import { Pool } from 'pg'

import { getSourceContractRegistrySnapshotWithClient } from './source-contract-registry-table.js'
import {
  SOURCE_ID_CONSTRAINT_CLASSIFICATIONS,
  getSourceIdConstraintContractRows,
} from './source-id-constraint-contract.js'

export const SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID = 'SOURCE-ID-SCALAR-FK-MIGRATION-001'
export const SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY = 'source-id-scalar-fk-migration-v1'
export const SOURCE_ID_SCALAR_FK_MIGRATION_PLAN_PATH = 'docs/process/source-id-scalar-fk-migration-001-plan.md'
export const SOURCE_ID_SCALAR_FK_MIGRATION_APPROVAL_PATH = 'docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json'
export const SOURCE_ID_SCALAR_FK_MIGRATION_APPLY_SCRIPT_PATH = 'scripts/apply-source-id-scalar-fks.mjs'
export const SOURCE_ID_SCALAR_FK_MIGRATION_SCRIPT_PATH = 'scripts/process-source-id-scalar-fk-migration-check.mjs'
export const SOURCE_ID_SCALAR_FK_MIGRATION_SPRINT_ID = 'source-id-scalar-fk-migration-2026-05-16'

const MAX_IDENTIFIER_LENGTH = 63
const SOURCE_REGISTRY_TABLE = 'source_contract_registry'
const SOURCE_REGISTRY_COLUMN = 'source_id'

function sha(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function normalizeIdentifier(value) {
  const normalized = String(value || '').trim()
  if (!/^[a-z_][a-z0-9_]*$/.test(normalized)) {
    throw new Error(`Unsafe SQL identifier: ${value}`)
  }
  return normalized
}

function quoteIdent(value) {
  return `"${normalizeIdentifier(value).replace(/"/g, '""')}"`
}

function scalarFkRows() {
  return getSourceIdConstraintContractRows()
    .filter(row =>
      row.valueShape === 'scalar' &&
      row.column === SOURCE_REGISTRY_COLUMN &&
      row.classification === SOURCE_ID_CONSTRAINT_CLASSIFICATIONS.fkSafeNow
    )
    .map(row => ({ ...row, constraintName: buildSourceIdScalarFkConstraintName(row) }))
}

export function buildSourceIdScalarFkConstraintName(row = {}) {
  const table = normalizeIdentifier(row.table)
  const column = normalizeIdentifier(row.column)
  const base = `fk_srcid_${table}_${column}`
  if (base.length <= MAX_IDENTIFIER_LENGTH) return base
  return `${base.slice(0, MAX_IDENTIFIER_LENGTH - 9)}_${sha(`${table}.${column}`).slice(0, 8)}`
}

export function getSourceIdScalarFkRelations() {
  return scalarFkRows()
}

export function buildSourceIdScalarFkDogfoodProof() {
  const relations = getSourceIdScalarFkRelations()
  const arraysRejected = getSourceIdConstraintContractRows()
    .filter(row => row.valueShape === 'array')
    .every(row => !relations.some(relation => relation.relation === row.relation))
  const namesValid = relations.every(row =>
    row.constraintName.length <= MAX_IDENTIFIER_LENGTH &&
    /^fk_srcid_[a-z0-9_]+$/.test(row.constraintName)
  )
  let unsafeIdentifierRejected = false
  try {
    buildSourceIdScalarFkConstraintName({ table: 'bad-table', column: SOURCE_REGISTRY_COLUMN })
  } catch {
    unsafeIdentifierRejected = true
  }

  return {
    ok: relations.length === 10 && arraysRejected && namesValid && unsafeIdentifierRejected,
    relationCount: relations.length,
    arrayRelationsExcluded: arraysRejected,
    constraintNamesValid: namesValid,
    unsafeIdentifierRejected,
    relations: relations.map(row => ({
      relation: row.relation,
      constraintName: row.constraintName,
    })),
    invariant: 'Only scalar fk_safe_now source_id relations can receive source_contract_registry foreign keys; array-backed source_ids remain excluded.',
  }
}

async function countInvalidReferences(client, relation) {
  const table = quoteIdent(relation.table)
  const column = quoteIdent(relation.column)
  const result = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM ${table} t
    LEFT JOIN ${quoteIdent(SOURCE_REGISTRY_TABLE)} r
      ON r.${quoteIdent(SOURCE_REGISTRY_COLUMN)} = t.${column}
     AND r.active = TRUE
    WHERE t.${column} IS NOT NULL
      AND r.${quoteIdent(SOURCE_REGISTRY_COLUMN)} IS NULL
  `)
  return Number(result.rows[0]?.count || 0)
}

async function getConstraintRows(client, relations) {
  const names = relations.map(row => row.constraintName)
  if (!names.length) return []
  const result = await client.query(
    `
      SELECT
        c.conname,
        c.convalidated,
        rel.relname AS table_name,
        refrel.relname AS references_table,
        array_agg(att.attname::text ORDER BY ord.ordinality) AS columns,
        array_agg(refatt.attname::text ORDER BY ord.ordinality) AS references_columns
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_class refrel ON refrel.oid = c.confrelid
      JOIN unnest(c.conkey) WITH ORDINALITY AS ord(attnum, ordinality) ON TRUE
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ord.attnum
      JOIN unnest(c.confkey) WITH ORDINALITY AS reford(attnum, ordinality) ON reford.ordinality = ord.ordinality
      JOIN pg_attribute refatt ON refatt.attrelid = refrel.oid AND refatt.attnum = reford.attnum
      WHERE c.contype = 'f'
        AND nsp.nspname = 'public'
        AND c.conname = ANY($1::text[])
      GROUP BY c.conname, c.convalidated, rel.relname, refrel.relname
      ORDER BY c.conname
    `,
    [names],
  )
  return result.rows.map(row => ({
    constraintName: row.conname,
    convalidated: row.convalidated === true,
    table: row.table_name,
    referencesTable: row.references_table,
    columns: row.columns || [],
    referencesColumns: row.references_columns || [],
  }))
}

function evaluateConstraints(relations, constraintRows) {
  const byName = new Map((constraintRows || []).map(row => [row.constraintName, row]))
  const rows = relations.map(relation => {
    const row = byName.get(relation.constraintName) || null
    const ok = Boolean(row) &&
      row.convalidated === true &&
      row.table === relation.table &&
      row.referencesTable === SOURCE_REGISTRY_TABLE &&
      row.columns.length === 1 &&
      row.columns[0] === relation.column &&
      row.referencesColumns.length === 1 &&
      row.referencesColumns[0] === SOURCE_REGISTRY_COLUMN
    return {
      relation: relation.relation,
      table: relation.table,
      column: relation.column,
      constraintName: relation.constraintName,
      exists: Boolean(row),
      validated: row?.convalidated === true,
      referencesTable: row?.referencesTable || '',
      referencesColumns: row?.referencesColumns || [],
      ok,
    }
  })
  return {
    ok: rows.every(row => row.ok),
    expectedCount: relations.length,
    existingCount: rows.filter(row => row.exists).length,
    validatedCount: rows.filter(row => row.validated).length,
    rows,
    missing: rows.filter(row => !row.exists).map(row => row.relation),
    invalid: rows.filter(row => row.exists && !row.ok).map(row => row.relation),
  }
}

export async function getSourceIdScalarFkMigrationSnapshotWithClient(client) {
  const relations = getSourceIdScalarFkRelations()
  const registrySnapshot = await getSourceContractRegistrySnapshotWithClient(client)
  const invalidReferences = []
  for (const relation of relations) {
    const invalidCount = await countInvalidReferences(client, relation)
    invalidReferences.push({
      relation: relation.relation,
      table: relation.table,
      column: relation.column,
      invalidCount,
    })
  }
  const constraintRows = await getConstraintRows(client, relations)
  const constraintEvaluation = evaluateConstraints(relations, constraintRows)
  const arrayConstraintRows = constraintRows.filter(row =>
    getSourceIdConstraintContractRows()
      .filter(contractRow => contractRow.valueShape === 'array')
      .some(contractRow => contractRow.table === row.table)
  )

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
    closeoutKey: SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY,
    relations,
    registry: registrySnapshot.evaluation,
    invalidReferences,
    invalidReferenceCount: invalidReferences.reduce((sum, row) => sum + row.invalidCount, 0),
    constraints: constraintEvaluation,
    arrayConstraintRows,
    ok: registrySnapshot.evaluation.ok === true &&
      invalidReferences.every(row => row.invalidCount === 0) &&
      constraintEvaluation.ok === true &&
      arrayConstraintRows.length === 0,
  }
}

export async function getSourceIdScalarFkMigrationSnapshot() {
  const pool = new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
  const client = await pool.connect()
  try {
    return await getSourceIdScalarFkMigrationSnapshotWithClient(client)
  } finally {
    client.release()
    await pool.end()
  }
}

async function addOrValidateConstraint(client, relation) {
  const existing = await getConstraintRows(client, [relation])
  if (!existing.length) {
    await client.query(`
      ALTER TABLE ${quoteIdent(relation.table)}
      ADD CONSTRAINT ${quoteIdent(relation.constraintName)}
      FOREIGN KEY (${quoteIdent(relation.column)})
      REFERENCES ${quoteIdent(SOURCE_REGISTRY_TABLE)}(${quoteIdent(SOURCE_REGISTRY_COLUMN)})
      NOT VALID
    `)
  }
  await client.query(`
    ALTER TABLE ${quoteIdent(relation.table)}
    VALIDATE CONSTRAINT ${quoteIdent(relation.constraintName)}
  `)
}

export async function applySourceIdScalarFksWithClient(client, {
  actor = 'source-id-scalar-fk-migration',
  apply = false,
} = {}) {
  const before = await getSourceIdScalarFkMigrationSnapshotWithClient(client)
  const blockers = []
  if (before.registry.ok !== true) blockers.push('source_contract_registry is not healthy/current')
  if (before.invalidReferenceCount > 0) blockers.push(`${before.invalidReferenceCount} invalid scalar source reference(s)`)
  if (before.relations.length !== 10) blockers.push(`expected 10 scalar FK-safe relations, found ${before.relations.length}`)
  if (before.arrayConstraintRows.length) blockers.push('array-backed source_id relation already has an unexpected simple FK')

  if (blockers.length || !apply) {
    return {
      ok: blockers.length === 0,
      mode: apply ? 'blocked' : 'dry_run',
      actor,
      blockers,
      before,
      applied: [],
      after: before,
    }
  }

  const applied = []
  for (const relation of before.relations) {
    await addOrValidateConstraint(client, relation)
    applied.push({
      relation: relation.relation,
      constraintName: relation.constraintName,
    })
  }
  const after = await getSourceIdScalarFkMigrationSnapshotWithClient(client)
  return {
    ok: after.ok === true,
    mode: 'applied',
    actor,
    blockers: after.ok ? [] : ['post-apply snapshot failed'],
    before,
    applied,
    after,
  }
}
