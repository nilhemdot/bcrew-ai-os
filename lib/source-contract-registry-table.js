import crypto from 'node:crypto'

import { getSourceContracts } from './source-contracts.js'

export const SOURCE_CONTRACT_REGISTRY_TABLE_CARD_ID = 'SOURCE-CONTRACT-REGISTRY-TABLE-001'
export const SOURCE_CONTRACT_REGISTRY_TABLE_CLOSEOUT_KEY = 'source-contract-registry-table-v1'
export const SOURCE_CONTRACT_REGISTRY_TABLE_PLAN_PATH = 'docs/process/source-contract-registry-table-001-plan.md'
export const SOURCE_CONTRACT_REGISTRY_TABLE_APPROVAL_PATH = 'docs/process/approvals/SOURCE-CONTRACT-REGISTRY-TABLE-001.json'
export const SOURCE_CONTRACT_REGISTRY_TABLE_SCRIPT_PATH = 'scripts/process-source-contract-registry-table-check.mjs'
export const SOURCE_CONTRACT_REGISTRY_SYNC_SCRIPT_PATH = 'scripts/sync-source-contract-registry.mjs'
export const SOURCE_CONTRACT_REGISTRY_TABLE_SPRINT_ID = 'source-contract-registry-table-2026-05-16'

export const sourceContractRegistrySchemaSql = `
  CREATE TABLE IF NOT EXISTS source_contract_registry (
    source_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    unit_name TEXT,
    source_group TEXT NOT NULL,
    status TEXT NOT NULL,
    validation TEXT,
    owner TEXT,
    location TEXT,
    access_method TEXT,
    last_verified TEXT,
    contract_hash TEXT NOT NULL,
    contract_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT source_contract_registry_source_id_shape
      CHECK (source_id ~ '^[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]{3}$')
  );

  CREATE INDEX IF NOT EXISTS idx_source_contract_registry_group_status
  ON source_contract_registry(source_group, status, active);

  CREATE INDEX IF NOT EXISTS idx_source_contract_registry_synced
  ON source_contract_registry(synced_at DESC);
`

function normalizeText(value) {
  return String(value || '').trim()
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableJson(value) {
  return JSON.stringify(stableValue(value))
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function normalizePayload(contract = {}) {
  return stableValue({
    ...contract,
    sourceId: normalizeText(contract.sourceId),
    title: normalizeText(contract.title),
    unitName: normalizeText(contract.unitName),
    group: normalizeText(contract.group || 'unknown'),
    status: normalizeText(contract.status || 'unknown'),
    validation: normalizeText(contract.validation),
    owner: normalizeText(contract.owner),
    location: normalizeText(contract.location),
    accessMethod: normalizeText(contract.accessMethod),
    lastVerified: normalizeText(contract.lastVerified),
  })
}

export function isValidSourceContractRegistryId(sourceId) {
  return /^[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]{3}$/.test(normalizeText(sourceId))
}

export function buildSourceContractRegistryRows(contracts = getSourceContracts()) {
  return (contracts || []).map(contract => {
    const payload = normalizePayload(contract)
    const sourceId = normalizeText(payload.sourceId)
    const contractHash = sha256(stableJson(payload))
    return {
      sourceId,
      title: normalizeText(payload.title),
      unitName: normalizeText(payload.unitName),
      sourceGroup: normalizeText(payload.group || 'unknown') || 'unknown',
      status: normalizeText(payload.status || 'unknown') || 'unknown',
      validation: normalizeText(payload.validation),
      owner: normalizeText(payload.owner),
      location: normalizeText(payload.location),
      accessMethod: normalizeText(payload.accessMethod),
      lastVerified: normalizeText(payload.lastVerified),
      contractHash,
      contractPayload: payload,
      active: true,
    }
  })
}

export function mapSourceContractRegistryRow(row = {}) {
  return {
    sourceId: row.source_id || row.sourceId,
    title: row.title || '',
    unitName: row.unit_name || row.unitName || '',
    sourceGroup: row.source_group || row.sourceGroup || '',
    status: row.status || '',
    validation: row.validation || '',
    owner: row.owner || '',
    location: row.location || '',
    accessMethod: row.access_method || row.accessMethod || '',
    lastVerified: row.last_verified || row.lastVerified || '',
    contractHash: row.contract_hash || row.contractHash || '',
    contractPayload: row.contract_payload || row.contractPayload || {},
    active: row.active === true || row.active === 'true',
    syncedAt: row.synced_at?.toISOString?.() || row.synced_at || row.syncedAt || null,
    syncedBy: row.synced_by || row.syncedBy || '',
    createdAt: row.created_at?.toISOString?.() || row.created_at || row.createdAt || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || row.updatedAt || null,
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function duplicateValues(values = []) {
  const seen = new Set()
  const duplicates = new Set()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates]
}

export function evaluateSourceContractRegistryTable({
  contracts = getSourceContracts(),
  registryRows = [],
} = {}) {
  const checks = []
  const expectedRows = buildSourceContractRegistryRows(contracts)
  const expectedIds = expectedRows.map(row => row.sourceId)
  const registry = (registryRows || []).map(mapSourceContractRegistryRow)
  const activeRows = registry.filter(row => row.active)
  const rowsById = new Map(activeRows.map(row => [row.sourceId, row]))
  const expectedById = new Map(expectedRows.map(row => [row.sourceId, row]))
  const duplicateContractIds = duplicateValues(expectedIds)
  const duplicateRegistryIds = duplicateValues(activeRows.map(row => row.sourceId))
  const invalidContractIds = expectedIds.filter(sourceId => !isValidSourceContractRegistryId(sourceId))
  const invalidRegistryIds = activeRows.map(row => row.sourceId).filter(sourceId => !isValidSourceContractRegistryId(sourceId))
  const missingIds = expectedIds.filter(sourceId => !rowsById.has(sourceId))
  const extraIds = activeRows.map(row => row.sourceId).filter(sourceId => !expectedById.has(sourceId))
  const staleHashIds = expectedRows
    .filter(expected => rowsById.has(expected.sourceId) && rowsById.get(expected.sourceId).contractHash !== expected.contractHash)
    .map(row => row.sourceId)
  const inactiveCurrentIds = registry
    .filter(row => row.active === false && expectedById.has(row.sourceId))
    .map(row => row.sourceId)
  const missingRequiredIds = expectedRows
    .filter(row => !row.sourceId || !row.title || !row.sourceGroup || !row.status || !row.contractHash)
    .map(row => row.sourceId || '(missing)')

  addCheck(
    checks,
    duplicateContractIds.length === 0,
    'code source contracts have unique source IDs',
    duplicateContractIds.join(', ') || `${expectedRows.length} contracts`,
  )
  addCheck(
    checks,
    invalidContractIds.length === 0,
    'code source contracts use registry-safe source ID shape',
    invalidContractIds.join(', ') || 'all valid',
  )
  addCheck(
    checks,
    missingRequiredIds.length === 0,
    'normalized source contract rows have required metadata',
    missingRequiredIds.join(', ') || 'all rows complete',
  )
  addCheck(
    checks,
    duplicateRegistryIds.length === 0,
    'DB registry active rows have unique source IDs',
    duplicateRegistryIds.join(', ') || `${activeRows.length} active rows`,
  )
  addCheck(
    checks,
    invalidRegistryIds.length === 0,
    'DB registry active rows use source ID check shape',
    invalidRegistryIds.join(', ') || 'all valid',
  )
  addCheck(
    checks,
    missingIds.length === 0,
    'DB registry includes every current source contract',
    missingIds.join(', ') || `${expectedRows.length}/${expectedRows.length} present`,
  )
  addCheck(
    checks,
    extraIds.length === 0,
    'DB registry has no extra active source contracts',
    extraIds.join(', ') || 'no extra active rows',
  )
  addCheck(
    checks,
    inactiveCurrentIds.length === 0,
    'DB registry does not mark current source contracts inactive',
    inactiveCurrentIds.join(', ') || 'all current rows active',
  )
  addCheck(
    checks,
    staleHashIds.length === 0,
    'DB registry hashes match current source contracts',
    staleHashIds.join(', ') || 'hashes current',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      expectedCount: expectedRows.length,
      activeCount: activeRows.length,
      registryCount: registry.length,
      missingCount: missingIds.length,
      extraCount: extraIds.length,
      staleHashCount: staleHashIds.length,
      inactiveCurrentCount: inactiveCurrentIds.length,
    },
  }
}

export function buildSourceContractRegistryTableDogfoodProof() {
  const healthyContracts = getSourceContracts().slice(0, 3)
  const healthyRows = buildSourceContractRegistryRows(healthyContracts)
  const healthy = evaluateSourceContractRegistryTable({
    contracts: healthyContracts,
    registryRows: healthyRows,
  })
  const duplicateSourceId = evaluateSourceContractRegistryTable({
    contracts: [healthyContracts[0], { ...healthyContracts[1], sourceId: healthyContracts[0].sourceId }],
    registryRows: healthyRows,
  })
  const missingRow = evaluateSourceContractRegistryTable({
    contracts: healthyContracts,
    registryRows: healthyRows.slice(1),
  })
  const staleHash = evaluateSourceContractRegistryTable({
    contracts: healthyContracts,
    registryRows: healthyRows.map(row => row.sourceId === healthyRows[0].sourceId ? { ...row, contractHash: 'stale-hash' } : row),
  })
  const inactiveCurrent = evaluateSourceContractRegistryTable({
    contracts: healthyContracts,
    registryRows: healthyRows.map(row => row.sourceId === healthyRows[0].sourceId ? { ...row, active: false } : row),
  })
  const extraActive = evaluateSourceContractRegistryTable({
    contracts: healthyContracts,
    registryRows: [...healthyRows, { ...healthyRows[0], sourceId: 'SRC-EXTRA-999', contractHash: 'extra' }],
  })
  const invalidId = evaluateSourceContractRegistryTable({
    contracts: [{ ...healthyContracts[0], sourceId: 'bad_source' }],
    registryRows: [{ ...healthyRows[0], sourceId: 'bad_source' }],
  })

  return {
    ok: healthy.ok === true &&
      duplicateSourceId.ok === false &&
      missingRow.ok === false &&
      staleHash.ok === false &&
      inactiveCurrent.ok === false &&
      extraActive.ok === false &&
      invalidId.ok === false,
    healthy,
    duplicateSourceId,
    missingRow,
    staleHash,
    inactiveCurrent,
    extraActive,
    invalidId,
    invariant: 'The source-contract registry accepts synced metadata rows and rejects duplicate IDs, missing rows, stale hashes, inactive current rows, extra active rows, and invalid source IDs.',
  }
}

export async function getSourceContractRegistryRowsWithClient(client) {
  const result = await client.query(`
    SELECT source_id, title, unit_name, source_group, status, validation, owner,
           location, access_method, last_verified, contract_hash, contract_payload,
           active, synced_at, synced_by, created_at, updated_at
    FROM source_contract_registry
    ORDER BY source_id ASC
  `)
  return result.rows.map(mapSourceContractRegistryRow)
}

export async function getSourceContractRegistrySnapshotWithClient(client) {
  const registryRows = await getSourceContractRegistryRowsWithClient(client)
  const expectedRows = buildSourceContractRegistryRows()
  return {
    generatedAt: new Date().toISOString(),
    expectedRows,
    registryRows,
    evaluation: evaluateSourceContractRegistryTable({ registryRows }),
  }
}

export async function syncSourceContractRegistryRowsWithClient(client, {
  actor = 'source-contract-registry-sync',
  syncedAt = new Date().toISOString(),
} = {}) {
  const rows = buildSourceContractRegistryRows()
  const sourceIds = rows.map(row => row.sourceId)
  for (const row of rows) {
    await client.query(
      `
        INSERT INTO source_contract_registry (
          source_id, title, unit_name, source_group, status, validation, owner,
          location, access_method, last_verified, contract_hash, contract_payload,
          active, synced_at, synced_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,TRUE,$13,$14)
        ON CONFLICT (source_id) DO UPDATE
        SET title = EXCLUDED.title,
            unit_name = EXCLUDED.unit_name,
            source_group = EXCLUDED.source_group,
            status = EXCLUDED.status,
            validation = EXCLUDED.validation,
            owner = EXCLUDED.owner,
            location = EXCLUDED.location,
            access_method = EXCLUDED.access_method,
            last_verified = EXCLUDED.last_verified,
            contract_hash = EXCLUDED.contract_hash,
            contract_payload = EXCLUDED.contract_payload,
            active = TRUE,
            synced_at = EXCLUDED.synced_at,
            synced_by = EXCLUDED.synced_by,
            updated_at = NOW()
      `,
      [
        row.sourceId,
        row.title,
        row.unitName || null,
        row.sourceGroup,
        row.status,
        row.validation || null,
        row.owner || null,
        row.location || null,
        row.accessMethod || null,
        row.lastVerified || null,
        row.contractHash,
        JSON.stringify(row.contractPayload),
        syncedAt,
        actor,
      ],
    )
  }

  const deactivated = await client.query(
    `
      UPDATE source_contract_registry
      SET active = FALSE,
          synced_at = $2,
          synced_by = $3,
          updated_at = NOW()
      WHERE NOT (source_id = ANY($1::text[]))
        AND active = TRUE
      RETURNING source_id
    `,
    [sourceIds, syncedAt, actor],
  )

  const snapshot = await getSourceContractRegistrySnapshotWithClient(client)
  return {
    syncedAt,
    syncedBy: actor,
    upsertedCount: rows.length,
    deactivatedSourceIds: deactivated.rows.map(row => row.source_id),
    snapshot,
  }
}
