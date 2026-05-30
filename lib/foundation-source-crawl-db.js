import { randomUUID } from 'node:crypto'

import {
  getSourceContractRegistrySnapshotWithClient,
  syncSourceContractRegistryRowsWithClient,
} from './source-contract-registry-table.js'
import { createFoundationDriveMeetingVaultStore } from './foundation-drive-meeting-vault-store.js'
import { createFoundationSourceCrawlStore } from './foundation-source-crawl-store.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'
import {
  getFoundationJobScheduleIndex,
} from './foundation-runtime-jobs-db.js'

function stableLedgerId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${prefix}-${timestamp}-${randomUUID().slice(0, 8)}`
}

export async function syncSourceContractRegistryTable(options = {}) {
  return withFoundationTransaction(async client => {
    return syncSourceContractRegistryRowsWithClient(client, options)
  })
}

export async function getSourceContractRegistrySnapshot() {
  return withFoundationTransaction(async client => {
    return getSourceContractRegistrySnapshotWithClient(client)
  })
}

const foundationSourceCrawlStore = createFoundationSourceCrawlStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getFoundationJobScheduleIndex,
})

export const getStaleSourceCrawlTargetRuns = foundationSourceCrawlStore.getStaleSourceCrawlTargetRuns
export const markStaleSourceCrawlTargetRuns = foundationSourceCrawlStore.markStaleSourceCrawlTargetRuns
export const upsertSourceCrawlTarget = foundationSourceCrawlStore.upsertSourceCrawlTarget
export const upsertSourceCrawlItem = foundationSourceCrawlStore.upsertSourceCrawlItem
export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget
export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun
export const listSourceCrawlItems = foundationSourceCrawlStore.listSourceCrawlItems
export const classifySourceCrawlItemRetries = foundationSourceCrawlStore.classifySourceCrawlItemRetries
export const getRetryableSourceCrawlItems = foundationSourceCrawlStore.getRetryableSourceCrawlItems
export const leaseRetryableSourceCrawlItems = foundationSourceCrawlStore.leaseRetryableSourceCrawlItems
export const markSourceCrawlItemAttemptStarted = foundationSourceCrawlStore.markSourceCrawlItemAttemptStarted
export const markSourceCrawlItemAttemptFinished = foundationSourceCrawlStore.markSourceCrawlItemAttemptFinished
export const markStaleSourceCrawlItems = foundationSourceCrawlStore.markStaleSourceCrawlItems
export const getSourceCrawlItemsByExternalId = foundationSourceCrawlStore.getSourceCrawlItemsByExternalId
export const listDriveContentExtractionQueue = foundationSourceCrawlStore.listDriveContentExtractionQueue
export const listVideoContentExtractionQueue = foundationSourceCrawlStore.listVideoContentExtractionQueue
export const getExtractionControlSnapshot = foundationSourceCrawlStore.getExtractionControlSnapshot
export const getExtractionRunHardeningSnapshot = foundationSourceCrawlStore.getExtractionRunHardeningSnapshot
export const getDriveCorpusInventorySnapshot = foundationSourceCrawlStore.getDriveCorpusInventorySnapshot

const foundationDriveMeetingVaultStore = createFoundationDriveMeetingVaultStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  stableLedgerId,
  mapSourceCrawlItemRows: foundationSourceCrawlStore.mapSourceCrawlItemRows,
})

export const listMeetingRawDriveFileCandidates = foundationDriveMeetingVaultStore.listMeetingRawDriveFileCandidates
export const recordDriveAccessPreflightRun = foundationDriveMeetingVaultStore.recordDriveAccessPreflightRun
export const getLatestDriveAccessPreflightRun = foundationDriveMeetingVaultStore.getLatestDriveAccessPreflightRun
export const recordMeetingVaultAclAudit = foundationDriveMeetingVaultStore.recordMeetingVaultAclAudit
export const getLatestMeetingVaultAclAudit = foundationDriveMeetingVaultStore.getLatestMeetingVaultAclAudit
export const recordMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.recordMeetingVaultAutoEnforcementRun
export const getLatestMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.getLatestMeetingVaultAutoEnforcementRun
export const getMeetingVaultLegacyExceptions = foundationDriveMeetingVaultStore.getMeetingVaultLegacyExceptions

function mapSourceMetricRows(rows = []) {
  return rows.map(row => Object.fromEntries(Object.entries({
    sourceId: row.source_id || row.sourceId,
    totalAtoms: row.total_atoms,
    activeAtoms: row.active_atoms,
    latestAtomAt: row.latest_atom_at?.toISOString?.() || row.latest_atom_at || null,
    totalFacts: row.total_facts,
    activeFacts: row.active_facts,
    latestFactAt: row.latest_fact_at?.toISOString?.() || row.latest_fact_at || null,
    totalSynthesizedItems: row.total_synthesized_items,
    activeSynthesizedItems: row.active_synthesized_items,
    latestSynthesizedAt: row.latest_synthesized_at?.toISOString?.() || row.latest_synthesized_at || null,
    totalRoutes: row.total_routes,
    activeRoutes: row.active_routes,
    pendingRoutes: row.pending_routes,
    appliedRoutes: row.applied_routes,
    latestRouteAt: row.latest_route_at?.toISOString?.() || row.latest_route_at || null,
  }).filter(([, value]) => value !== undefined)))
}

export async function getSourceMaturityOperationalMetrics() {
  const [
    atomResult,
    factResult,
    synthesizedResult,
    routeResult,
  ] = await Promise.all([
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_atoms,
             COUNT(*) FILTER (WHERE status <> 'rejected')::integer AS active_atoms,
             MAX(updated_at) AS latest_atom_at
      FROM intelligence_atoms
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_facts,
             COUNT(*) FILTER (WHERE status = 'active')::integer AS active_facts,
             MAX(updated_at) AS latest_fact_at
      FROM intelligence_synthesis_facts
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_synthesized_items,
             COUNT(*) FILTER (WHERE status <> 'archived')::integer AS active_synthesized_items,
             MAX(created_at) AS latest_synthesized_at
      FROM (
        SELECT unnest(source_ids) AS source_id, status, created_at
        FROM intelligence_synthesized_items
        WHERE cardinality(source_ids) > 0
      ) item_sources
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
    pool.query(`
      SELECT source_id,
             COUNT(*)::integer AS total_routes,
             COUNT(*) FILTER (WHERE approval_status <> 'cancelled')::integer AS active_routes,
             COUNT(*) FILTER (WHERE approval_status = 'pending')::integer AS pending_routes,
             COUNT(*) FILTER (WHERE approval_status = 'applied')::integer AS applied_routes,
             MAX(routed_at) AS latest_route_at
      FROM (
        SELECT unnest(source_ids) AS source_id, approval_status, routed_at
        FROM intelligence_action_routes
        WHERE cardinality(source_ids) > 0
      ) route_sources
      GROUP BY source_id
      ORDER BY source_id ASC
    `),
  ])

  return {
    generatedAt: new Date().toISOString(),
    atomsBySource: mapSourceMetricRows(atomResult.rows),
    factsBySource: mapSourceMetricRows(factResult.rows),
    synthesizedItemsBySource: mapSourceMetricRows(synthesizedResult.rows),
    routesBySource: mapSourceMetricRows(routeResult.rows),
  }
}
