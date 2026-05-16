export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-013'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SPRINT_ID = 'foundation-db-drive-meeting-vault-store-split-2026-05-16'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-drive-meeting-vault-store-split-v1'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-drive-meeting-vault-store-split-013-plan.md'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-013.json'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-drive-meeting-vault-store-split-check.mjs'
export const FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES = 6149

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationDriveMeetingVaultStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()

  addCheck(
    checks,
    moduleSource.includes('export function createFoundationDriveMeetingVaultStore') &&
      moduleSource.includes('async function listMeetingRawDriveFileCandidates') &&
      moduleSource.includes('async function recordDriveAccessPreflightRun') &&
      moduleSource.includes('async function getLatestDriveAccessPreflightRun') &&
      moduleSource.includes('async function recordMeetingVaultAclAudit') &&
      moduleSource.includes('async function recordMeetingVaultAutoEnforcementRun') &&
      moduleSource.includes('async function getMeetingVaultLegacyExceptions'),
    'Drive/Meeting Vault store module owns the extracted public behavior',
    'factory and proof-storage functions present',
  )
  addCheck(
    checks,
    moduleSource.includes('function mapDriveAccessPreflightRunRow') &&
      moduleSource.includes('function mapMeetingVaultAclAuditRow') &&
      moduleSource.includes('function mapMeetingVaultEnforcementRunRow') &&
      moduleSource.includes('function mapMeetingVaultLegacyExceptionRow') &&
      moduleSource.includes('drive_access_preflight_runs') &&
      moduleSource.includes('meeting_vault_enforcement_runs'),
    'Drive/Meeting Vault store module owns row mappers and proof tables',
    'run/audit/enforcement/exception mappers and SQL present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-drive-meeting-vault-store.js") &&
      foundationDbSource.includes('createFoundationDriveMeetingVaultStore({') &&
      foundationDbSource.includes('foundationDriveMeetingVaultStore'),
    'foundation-db wires through the dedicated Drive/Meeting Vault store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const listMeetingRawDriveFileCandidates = foundationDriveMeetingVaultStore.listMeetingRawDriveFileCandidates') &&
      foundationDbSource.includes('export const recordDriveAccessPreflightRun = foundationDriveMeetingVaultStore.recordDriveAccessPreflightRun') &&
      foundationDbSource.includes('export const getLatestMeetingVaultAutoEnforcementRun = foundationDriveMeetingVaultStore.getLatestMeetingVaultAutoEnforcementRun'),
    'foundation-db keeps stable public Drive/Meeting Vault delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapDriveAccessPreflightRunRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapMeetingVaultAclAuditRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapMeetingVaultEnforcementRunRow\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+recordDriveAccessPreflightRun\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+recordMeetingVaultAutoEnforcementRun\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted Drive/Meeting Vault behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline Drive/Meeting Vault ownership') &&
      scriptSource.includes('buildSyntheticFoundationDriveMeetingVaultStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('proof-storage') &&
      normalizedPlanSource.includes('no drive permission mutation'),
    'plan documents split/extraction posture and no-Drive-mutation boundary',
    FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    beforeLines > 0 && afterLines > 0 && afterLines < beforeLines,
    'foundation-db.js line count decreases after the split',
    `${beforeLines}->${afterLines}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    beforeLines,
    afterLines,
  }
}

function normalizeLedgerLimit(value, fallback = 5000, max = 5000) {
  return Math.min(max, Math.max(1, Number(value) || fallback))
}

function normalizeOperationTypeList(value) {
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(value?.proposedOperations)
      ? value.proposedOperations
      : []
  return raw
    .map(item => typeof item === 'string' ? item : item?.operationType)
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

export function createFoundationDriveMeetingVaultStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  stableLedgerId,
  mapSourceCrawlItemRows,
} = {}) {
  if (!pool) throw new Error('Foundation Drive/Meeting Vault store requires a pool.')
  if (typeof withFoundationTransaction !== 'function') throw new Error('Foundation Drive/Meeting Vault store requires withFoundationTransaction.')
  if (typeof insertChangeEvent !== 'function') throw new Error('Foundation Drive/Meeting Vault store requires insertChangeEvent.')
  if (typeof stableLedgerId !== 'function') throw new Error('Foundation Drive/Meeting Vault store requires stableLedgerId.')
  if (typeof mapSourceCrawlItemRows !== 'function') throw new Error('Foundation Drive/Meeting Vault store requires mapSourceCrawlItemRows.')

  function mapDriveAccessPreflightRunRow(row) {
    return {
      runId: row.run_id,
      cardId: row.card_id,
      policyVersion: row.policy_version,
      status: row.status,
      actorEmailHash: row.actor_email_hash || null,
      actorCount: Number(row.actor_count || 0),
      candidateCount: Number(row.candidate_count || 0),
      inspectedFileCount: Number(row.inspected_file_count || 0),
      safeCount: Number(row.safe_count || 0),
      repairableCount: Number(row.repairable_count || 0),
      missingAccessCount: Number(row.missing_access_count || 0),
      ownerAmbiguousCount: Number(row.owner_ambiguous_count || 0),
      requestAccessNeededCount: Number(row.request_access_needed_count || 0),
      blockedCount: Number(row.blocked_count || 0),
      dryRunHash: row.dry_run_hash || null,
      summary: row.summary || {},
      createdBy: row.created_by || null,
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    }
  }

  function mapMeetingVaultAclAuditRow(row) {
    return {
      auditId: row.audit_id,
      cardId: row.card_id,
      policyVersion: row.policy_version,
      status: row.status,
      dryRunHash: row.dry_run_hash || null,
      inventoryTotal: Number(row.inventory_total || 0),
      inventoryScanned: Number(row.inventory_scanned || 0),
      inventoryComplete: Boolean(row.inventory_complete),
      phaseAComplete: Boolean(row.phase_a_complete),
      safeCount: Number(row.safe_count || 0),
      unsafeCount: Number(row.unsafe_count || 0),
      missingCrewbertCount: Number(row.missing_crewbert_count || 0),
      missingAccessCount: Number(row.missing_access_count || 0),
      ownerAmbiguousCount: Number(row.owner_ambiguous_count || 0),
      blockedCount: Number(row.blocked_count || 0),
      proposedOperationTypes: row.proposed_operation_types || {},
      summary: row.summary || {},
      createdBy: row.created_by || null,
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    }
  }

  function mapMeetingVaultEnforcementRunRow(row) {
    return {
      runId: row.run_id,
      cardId: row.card_id,
      closeoutKey: row.closeout_key,
      policyVersion: row.policy_version,
      mode: row.mode,
      status: row.status,
      enforcementStartAt: row.enforcement_start_at?.toISOString?.() || row.enforcement_start_at || null,
      processedCount: Number(row.processed_count || 0),
      forwardCount: Number(row.forward_count || 0),
      legacyExceptionCount: Number(row.legacy_exception_count || 0),
      highRiskCount: Number(row.high_risk_count || 0),
      missingCrewbertQueuedCount: Number(row.missing_crewbert_queued_count || 0),
      protectedReviewQueueCount: Number(row.protected_review_queue_count || 0),
      canCloseMeetingVaultAcl: Boolean(row.can_close_meeting_vault_acl),
      reportHash: row.report_hash || null,
      summary: row.summary || {},
      createdBy: row.created_by || null,
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    }
  }

  function mapMeetingVaultLegacyExceptionRow(row) {
    return {
      exceptionId: row.exception_id,
      fileRefHash: row.file_ref_hash || null,
      sourceFileRole: row.source_file_role,
      sensitivityClass: row.sensitivity_class,
      ownerHash: row.owner_hash || null,
      reason: row.reason,
      riskLevel: row.risk_level,
      status: row.status,
      blockerCard: row.blocker_card || null,
      firstSeenAt: row.first_seen_at?.toISOString?.() || row.first_seen_at || null,
      lastSeenAt: row.last_seen_at?.toISOString?.() || row.last_seen_at || null,
      latestReportHash: row.latest_report_hash || null,
      nextAction: row.next_action,
      metadata: row.metadata || {},
    }
  }

  async function listMeetingRawDriveFileCandidates({ limit = 5000 } = {}) {
    const normalizedLimit = normalizeLedgerLimit(limit)
    const artifactResult = await pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title, source_account,
               source_container,
               metadata, artifact_created_at, artifact_updated_at, ingested_at,
               updated_at
        FROM shared_communication_artifacts
        WHERE source_id = 'SRC-MEETINGS-001'
          AND artifact_type = ANY($1::text[])
        ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
        LIMIT $2
      `,
      [['meeting_note', 'meeting_transcript'], normalizedLimit],
    )
    const crawlItemResult = await pool.query(
      `
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        WHERE target_key = 'meetings-current-day'
          OR (
            source_id = 'SRC-MEETINGS-001'
            AND (
              metadata ? 'noteFileId'
              OR metadata ? 'transcriptFileId'
              OR metadata ? 'noteFileIds'
              OR metadata ? 'transcriptFileIds'
              OR metadata ? 'observedFileIds'
            )
          )
        ORDER BY updated_at DESC
        LIMIT $1
      `,
      [normalizedLimit],
    )
    const protectedCandidateSensitivities = new Set([
      'performance_concern',
      'termination_risk',
      'comp_discussion',
      'undisclosed_feedback',
    ])
    const sensitivitySignalsByArtifactId = new Map()
    const artifactIds = artifactResult.rows.map(row => row.artifact_id).filter(Boolean)
    if (artifactIds.length) {
      const signalResult = await pool.query(
        `
          SELECT artifact_id,
                 COALESCE(NULLIF(metadata->>'sensitivity', ''), 'neutral') AS sensitivity,
                 COUNT(*)::int AS total,
                 COUNT(*) FILTER (
                   WHERE jsonb_typeof(metadata->'subjectPeople') = 'array'
                     AND jsonb_array_length(metadata->'subjectPeople') > 0
                 )::int AS subject_people_count,
                 COUNT(*) FILTER (
                   WHERE metadata->>'minTier' = '1'
                      OR metadata->>'min_tier' = '1'
                 )::int AS min_tier_one_count
          FROM shared_communication_candidates
          WHERE artifact_id = ANY($1::text[])
          GROUP BY artifact_id, COALESCE(NULLIF(metadata->>'sensitivity', ''), 'neutral')
        `,
        [artifactIds],
      )
      for (const row of signalResult.rows) {
        const existing = sensitivitySignalsByArtifactId.get(row.artifact_id) || {
          candidateCount: 0,
          protectedCandidateCount: 0,
          subjectPeopleCandidateCount: 0,
          minTierOneCandidateCount: 0,
          sensitivityCounts: {},
        }
        const sensitivity = row.sensitivity || 'neutral'
        const total = Number(row.total || 0)
        existing.candidateCount += total
        existing.sensitivityCounts[sensitivity] = (existing.sensitivityCounts[sensitivity] || 0) + total
        if (protectedCandidateSensitivities.has(sensitivity)) existing.protectedCandidateCount += total
        existing.subjectPeopleCandidateCount += Number(row.subject_people_count || 0)
        existing.minTierOneCandidateCount += Number(row.min_tier_one_count || 0)
        sensitivitySignalsByArtifactId.set(row.artifact_id, existing)
      }
    }

    return {
      artifacts: artifactResult.rows.map(row => ({
        artifactId: row.artifact_id,
        sourceId: row.source_id,
        artifactType: row.artifact_type,
        externalId: row.external_id,
        title: row.title || '',
        sourceAccount: row.source_account || '',
        sourceContainer: row.source_container || '',
        metadata: row.metadata || {},
        sensitivitySignals: sensitivitySignalsByArtifactId.get(row.artifact_id) || {
          candidateCount: 0,
          protectedCandidateCount: 0,
          subjectPeopleCandidateCount: 0,
          minTierOneCandidateCount: 0,
          sensitivityCounts: {},
        },
        artifactCreatedAt: row.artifact_created_at?.toISOString?.() || row.artifact_created_at || null,
        artifactUpdatedAt: row.artifact_updated_at?.toISOString?.() || row.artifact_updated_at || null,
        ingestedAt: row.ingested_at?.toISOString?.() || row.ingested_at || null,
        updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
      })),
      crawlItems: mapSourceCrawlItemRows(crawlItemResult.rows),
    }
  }

  async function recordDriveAccessPreflightRun(input = {}, actor = 'system') {
    const runId = String(input.runId || '').trim() || stableLedgerId('drive-access-preflight')
    const items = Array.isArray(input.items) ? input.items : []
    const summary = input.summary || {}

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO drive_access_preflight_runs (
            run_id, card_id, policy_version, status, actor_email_hash, actor_count,
            candidate_count, inspected_file_count, safe_count, repairable_count,
            missing_access_count, owner_ambiguous_count, request_access_needed_count,
            blocked_count, dry_run_hash, summary, created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17)
          RETURNING *
        `,
        [
          runId,
          input.cardId,
          input.policyVersion,
          input.status,
          input.actorEmailHash || null,
          Number(input.actorCount || 0),
          Number(input.candidateCount || 0),
          Number(input.inspectedFileCount || 0),
          Number(input.safeCount || 0),
          Number(input.repairableCount || 0),
          Number(input.missingAccessCount || 0),
          Number(input.ownerAmbiguousCount || 0),
          Number(input.requestAccessNeededCount || 0),
          Number(input.blockedCount || 0),
          input.dryRunHash,
          JSON.stringify(summary),
          actor,
        ],
      )

      let index = 0
      for (const item of items) {
        index += 1
        const proposedOperationTypes = normalizeOperationTypeList(item.proposedOperationTypes || item.proposedOperations || [])
        await client.query(
          `
            INSERT INTO drive_access_preflight_items (
              item_id, run_id, file_ref_hash, source_account_hash, source_id,
              artifact_id, state, access_plan_action, owner_hash,
              permission_summary, proposed_operation_types, blocker_card, metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::text[],$12,$13::jsonb)
          `,
          [
            `${runId}:${String(index).padStart(4, '0')}`,
            runId,
            item.fileRefHash || null,
            item.sourceAccountHash || null,
            item.sourceId || null,
            item.artifactId || null,
            item.state,
            item.accessRequestPlan?.action || item.accessPlanAction || null,
            item.ownerHash || null,
            JSON.stringify(item.permissionSummary || {}),
            proposedOperationTypes,
            item.accessRequestPlan?.blockerCard || item.blockerCard || null,
            JSON.stringify(item.metadata || {}),
          ],
        )
      }

      await insertChangeEvent(client, {
        eventType: 'drive_access_preflight_recorded',
        entityTable: 'drive_access_preflight_runs',
        entityId: runId,
        actor,
        summary: `Recorded Drive access preflight run ${runId}`,
        metadata: {
          cardId: input.cardId,
          status: input.status,
          dryRunHash: input.dryRunHash,
          inspectedFileCount: Number(input.inspectedFileCount || 0),
        },
      })

      return mapDriveAccessPreflightRunRow(result.rows[0])
    })
  }

  async function getLatestDriveAccessPreflightRun({ cardId = 'DRIVE-ACCESS-REQUEST-001' } = {}) {
    const result = await pool.query(
      `
        SELECT *
        FROM drive_access_preflight_runs
        WHERE card_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [cardId],
    )
    return result.rows[0] ? mapDriveAccessPreflightRunRow(result.rows[0]) : null
  }

  async function recordMeetingVaultAclAudit(input = {}, actor = 'system') {
    const auditId = String(input.auditId || '').trim() || stableLedgerId('meeting-vault-acl')
    const counts = input.counts || {}

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO meeting_vault_acl_audits (
            audit_id, card_id, policy_version, status, dry_run_hash,
            inventory_total, inventory_scanned, inventory_complete, phase_a_complete,
            safe_count, unsafe_count, missing_crewbert_count, missing_access_count,
            owner_ambiguous_count, blocked_count, proposed_operation_types, summary,
            created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18)
          RETURNING *
        `,
        [
          auditId,
          input.cardId,
          input.policyVersion,
          input.status,
          input.dryRunHash,
          Number(input.inventoryTotal || counts.fileCount || 0),
          Number(input.inventoryScanned || 0),
          Boolean(input.inventoryComplete),
          Boolean(input.phaseAComplete),
          Number(input.safeCount ?? counts.safeCount ?? 0),
          Number(input.unsafeCount ?? counts.unsafeCount ?? 0),
          Number(input.missingCrewbertCount ?? counts.missingCrewbertCount ?? 0),
          Number(input.missingAccessCount ?? counts.missingAccessCount ?? 0),
          Number(input.ownerAmbiguousCount ?? counts.ownerAmbiguousCount ?? 0),
          Number(input.blockedCount ?? counts.blockedCount ?? 0),
          JSON.stringify(input.proposedOperationTypes || {}),
          JSON.stringify(input.summary || {}),
          actor,
        ],
      )

      await insertChangeEvent(client, {
        eventType: 'meeting_vault_acl_audit_recorded',
        entityTable: 'meeting_vault_acl_audits',
        entityId: auditId,
        actor,
        summary: `Recorded meeting vault ACL dry-run audit ${auditId}`,
        metadata: {
          cardId: input.cardId,
          status: input.status,
          dryRunHash: input.dryRunHash,
          inventoryTotal: Number(input.inventoryTotal || counts.fileCount || 0),
          inventoryScanned: Number(input.inventoryScanned || 0),
        },
      })

      return mapMeetingVaultAclAuditRow(result.rows[0])
    })
  }

  async function getLatestMeetingVaultAclAudit({ cardId = 'MEETING-VAULT-ACL-001' } = {}) {
    const result = await pool.query(
      `
        SELECT *
        FROM meeting_vault_acl_audits
        WHERE card_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [cardId],
    )
    return result.rows[0] ? mapMeetingVaultAclAuditRow(result.rows[0]) : null
  }

  async function recordMeetingVaultAutoEnforcementRun(input = {}, actor = 'system') {
    const runId = String(input.runId || '').trim() || stableLedgerId('meeting-vault-auto')
    const summary = input.summary || {}
    const counts = summary.summary || summary.counts || {}
    const items = Array.isArray(input.items) ? input.items : []
    const legacyExceptions = Array.isArray(input.legacyExceptions) ? input.legacyExceptions : []

    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          INSERT INTO meeting_vault_enforcement_runs (
            run_id, card_id, closeout_key, policy_version, mode, status,
            enforcement_start_at, processed_count, forward_count,
            legacy_exception_count, high_risk_count, missing_crewbert_queued_count,
            protected_review_queue_count, can_close_meeting_vault_acl, report_hash,
            summary, created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17)
          RETURNING *
        `,
        [
          runId,
          input.cardId,
          input.closeoutKey,
          input.policyVersion,
          input.mode || 'report_only',
          input.status,
          input.enforcementStartAt || null,
          Number(input.processedCount ?? counts.processedCount ?? 0),
          Number(input.forwardCount ?? counts.forwardCount ?? 0),
          Number(input.legacyExceptionCount ?? counts.legacyExceptionCount ?? 0),
          Number(input.highRiskCount ?? counts.publicDomainHighRiskCount ?? 0),
          Number(input.missingCrewbertQueuedCount ?? counts.missingCrewbertQueuedCount ?? 0),
          Number(input.protectedReviewQueueCount ?? counts.protectedReviewQueueCount ?? 0),
          Boolean(input.canCloseMeetingVaultAcl),
          input.reportHash,
          JSON.stringify(summary),
          actor,
        ],
      )

      let index = 0
      for (const item of items) {
        index += 1
        await client.query(
          `
            INSERT INTO meeting_vault_enforcement_items (
              item_id, run_id, file_ref_hash, source_file_role, sensitivity_class,
              owner_hash, action, status, risk_level, reason, blocker_card,
              operation_type, legacy_exception_reason, metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
          `,
          [
            `${runId}:${String(index).padStart(4, '0')}`,
            runId,
            item.fileRefHash || null,
            item.sourceFileRole,
            item.sensitivityClass,
            item.ownerHash || null,
            item.action,
            item.status,
            item.riskLevel,
            item.reason,
            item.blockerCard || null,
            item.operationType || null,
            item.legacyExceptionReason || null,
            JSON.stringify(item.metadata || {}),
          ],
        )
      }

      for (const item of legacyExceptions) {
        const exceptionId = `${runId}:legacy:${String(item.fileRefHash || 'unknown')}:${String(item.legacyExceptionReason || item.reason || 'exception')}`
          .replace(/[^a-zA-Z0-9:_-]+/g, '-')
          .slice(0, 240)
        await client.query(
          `
            INSERT INTO meeting_vault_legacy_exceptions (
              exception_id, file_ref_hash, source_file_role, sensitivity_class,
              owner_hash, reason, risk_level, status, blocker_card,
              latest_report_hash, next_action, metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
            ON CONFLICT (file_ref_hash, reason) DO UPDATE SET
              source_file_role = EXCLUDED.source_file_role,
              sensitivity_class = EXCLUDED.sensitivity_class,
              owner_hash = EXCLUDED.owner_hash,
              risk_level = EXCLUDED.risk_level,
              status = EXCLUDED.status,
              blocker_card = EXCLUDED.blocker_card,
              last_seen_at = NOW(),
              latest_report_hash = EXCLUDED.latest_report_hash,
              next_action = EXCLUDED.next_action,
              metadata = EXCLUDED.metadata
          `,
          [
            exceptionId,
            item.fileRefHash || null,
            item.sourceFileRole,
            item.sensitivityClass,
            item.ownerHash || null,
            item.legacyExceptionReason || item.reason,
            item.riskLevel,
            'open',
            item.blockerCard || null,
            input.reportHash,
            item.reason || 'Review legacy Meeting Vault exception from automatic enforcement report.',
            JSON.stringify(item.metadata || {}),
          ],
        )
      }

      await insertChangeEvent(client, {
        eventType: 'meeting_vault_auto_enforcement_recorded',
        entityTable: 'meeting_vault_enforcement_runs',
        entityId: runId,
        actor,
        summary: `Recorded Meeting Vault auto-enforcement run ${runId}`,
        metadata: {
          cardId: input.cardId,
          status: input.status,
          reportHash: input.reportHash,
          canCloseMeetingVaultAcl: Boolean(input.canCloseMeetingVaultAcl),
        },
      })

      return mapMeetingVaultEnforcementRunRow(result.rows[0])
    })
  }

  async function getLatestMeetingVaultAutoEnforcementRun({ cardId = 'MEETING-VAULT-AUTO-ENFORCEMENT-001' } = {}) {
    const result = await pool.query(
      `
        SELECT *
        FROM meeting_vault_enforcement_runs
        WHERE card_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [cardId],
    )
    return result.rows[0] ? mapMeetingVaultEnforcementRunRow(result.rows[0]) : null
  }

  async function getMeetingVaultLegacyExceptions({ limit = 50, status = 'open' } = {}) {
    const normalizedLimit = Math.min(500, Math.max(1, Number(limit) || 50))
    const values = []
    const filters = []
    if (status) {
      values.push(String(status).trim())
      filters.push(`status = $${values.length}`)
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const result = await pool.query(
      `
        SELECT *
        FROM meeting_vault_legacy_exceptions
        ${whereClause}
        ORDER BY risk_level DESC, last_seen_at DESC
        LIMIT $${values.length + 1}
      `,
      [...values, normalizedLimit],
    )
    return result.rows.map(mapMeetingVaultLegacyExceptionRow)
  }

  return {
    listMeetingRawDriveFileCandidates,
    recordDriveAccessPreflightRun,
    getLatestDriveAccessPreflightRun,
    recordMeetingVaultAclAudit,
    getLatestMeetingVaultAclAudit,
    recordMeetingVaultAutoEnforcementRun,
    getLatestMeetingVaultAutoEnforcementRun,
    getMeetingVaultLegacyExceptions,
  }
}

function buildFakePool() {
  const calls = []
  const now = new Date('2026-05-16T06:00:00.000Z')
  function rowFor(sql, values) {
    calls.push({ sql, values })
    if (sql.includes('FROM shared_communication_artifacts')) {
      return {
        rows: [{
          artifact_id: 'artifact-1',
          source_id: 'SRC-MEETINGS-001',
          artifact_type: 'meeting_note',
          external_id: 'drive-file-1',
          title: 'Weekly meeting',
          source_account: 'meetings@example.com',
          source_container: 'Meetings',
          metadata: { noteFileId: 'drive-file-1' },
          artifact_created_at: now,
          artifact_updated_at: now,
          ingested_at: now,
          updated_at: now,
        }],
      }
    }
    if (sql.includes('FROM source_crawl_items')) {
      return { rows: [{ item_key: 'crawl-1', source_id: 'SRC-MEETINGS-001', target_key: 'meetings-current-day' }] }
    }
    if (sql.includes('FROM shared_communication_candidates')) {
      return { rows: [{ artifact_id: 'artifact-1', sensitivity: 'performance_concern', total: 2, subject_people_count: 1, min_tier_one_count: 1 }] }
    }
    if (sql.includes('INSERT INTO drive_access_preflight_runs') || sql.includes('FROM drive_access_preflight_runs')) {
      return {
        rows: [{
          run_id: values?.[0] || 'drive-run-1',
          card_id: values?.[1] || values?.[0] || 'DRIVE-ACCESS-REQUEST-001',
          policy_version: 'v1',
          status: 'completed',
          actor_email_hash: 'actor-hash',
          actor_count: 1,
          candidate_count: 2,
          inspected_file_count: 2,
          safe_count: 1,
          repairable_count: 1,
          missing_access_count: 0,
          owner_ambiguous_count: 0,
          request_access_needed_count: 0,
          blocked_count: 0,
          dry_run_hash: 'dry-hash',
          summary: { ok: true },
          created_by: 'codex',
          created_at: now,
        }],
      }
    }
    if (sql.includes('INSERT INTO meeting_vault_acl_audits') || sql.includes('FROM meeting_vault_acl_audits')) {
      return {
        rows: [{
          audit_id: values?.[0] || 'acl-audit-1',
          card_id: values?.[1] || values?.[0] || 'MEETING-VAULT-ACL-001',
          policy_version: 'v1',
          status: 'completed',
          dry_run_hash: 'acl-hash',
          inventory_total: 3,
          inventory_scanned: 3,
          inventory_complete: true,
          phase_a_complete: true,
          safe_count: 2,
          unsafe_count: 1,
          missing_crewbert_count: 0,
          missing_access_count: 0,
          owner_ambiguous_count: 0,
          blocked_count: 0,
          proposed_operation_types: { removePublicLinks: 1 },
          summary: { ok: true },
          created_by: 'codex',
          created_at: now,
        }],
      }
    }
    if (sql.includes('INSERT INTO meeting_vault_enforcement_runs') || sql.includes('FROM meeting_vault_enforcement_runs')) {
      return {
        rows: [{
          run_id: values?.[0] || 'meeting-run-1',
          card_id: values?.[1] || values?.[0] || 'MEETING-VAULT-AUTO-ENFORCEMENT-001',
          closeout_key: 'meeting-vault-auto-v1',
          policy_version: 'v1',
          mode: 'report_only',
          status: 'completed',
          enforcement_start_at: now,
          processed_count: 4,
          forward_count: 3,
          legacy_exception_count: 1,
          high_risk_count: 1,
          missing_crewbert_queued_count: 0,
          protected_review_queue_count: 1,
          can_close_meeting_vault_acl: false,
          report_hash: 'report-hash',
          summary: { ok: true },
          created_by: 'codex',
          created_at: now,
        }],
      }
    }
    if (sql.includes('FROM meeting_vault_legacy_exceptions')) {
      return {
        rows: [{
          exception_id: 'legacy-1',
          file_ref_hash: 'file-hash',
          source_file_role: 'meeting_note',
          sensitivity_class: 'protected',
          owner_hash: 'owner-hash',
          reason: 'legacy_public_link',
          risk_level: 'high',
          status: 'open',
          blocker_card: 'MEETING-VAULT-ACL-001',
          first_seen_at: now,
          last_seen_at: now,
          latest_report_hash: 'report-hash',
          next_action: 'review',
          metadata: { ok: true },
        }],
      }
    }
    return { rows: [] }
  }
  return {
    calls,
    async query(sql, values) {
      return rowFor(String(sql || ''), values)
    },
  }
}

export async function buildSyntheticFoundationDriveMeetingVaultStoreBehaviorProof() {
  const fakePool = buildFakePool()
  const changeEvents = []
  const store = createFoundationDriveMeetingVaultStore({
    pool: fakePool,
    stableLedgerId: prefix => `${prefix}-synthetic`,
    mapSourceCrawlItemRows: rows => rows.map(row => ({ itemKey: row.item_key, sourceId: row.source_id, targetKey: row.target_key })),
    insertChangeEvent: async (_client, event) => changeEvents.push(event),
    withFoundationTransaction: async fn => fn(fakePool),
  })

  const candidates = await store.listMeetingRawDriveFileCandidates({ limit: 5 })
  const driveRun = await store.recordDriveAccessPreflightRun({
    cardId: 'DRIVE-ACCESS-REQUEST-001',
    policyVersion: 'v1',
    status: 'completed',
    inspectedFileCount: 2,
    items: [{ fileRefHash: 'file-1', state: 'safe', proposedOperationTypes: ['read'] }],
    dryRunHash: 'dry-hash',
  }, 'codex')
  const latestDriveRun = await store.getLatestDriveAccessPreflightRun()
  const aclAudit = await store.recordMeetingVaultAclAudit({
    cardId: 'MEETING-VAULT-ACL-001',
    policyVersion: 'v1',
    status: 'completed',
    dryRunHash: 'acl-hash',
    inventoryTotal: 3,
    inventoryComplete: true,
    phaseAComplete: true,
  }, 'codex')
  const enforcementRun = await store.recordMeetingVaultAutoEnforcementRun({
    cardId: 'MEETING-VAULT-AUTO-ENFORCEMENT-001',
    closeoutKey: 'meeting-vault-auto-v1',
    policyVersion: 'v1',
    status: 'completed',
    reportHash: 'report-hash',
    items: [{ fileRefHash: 'file-1', sourceFileRole: 'meeting_note', sensitivityClass: 'protected', action: 'review', status: 'queued', riskLevel: 'high', reason: 'protected' }],
    legacyExceptions: [{ fileRefHash: 'file-2', sourceFileRole: 'meeting_note', sensitivityClass: 'protected', legacyExceptionReason: 'legacy_public_link', riskLevel: 'high', reason: 'review' }],
  }, 'codex')
  const latestEnforcementRun = await store.getLatestMeetingVaultAutoEnforcementRun()
  const legacyExceptions = await store.getMeetingVaultLegacyExceptions()

  const checks = []
  addCheck(checks, candidates.artifacts.length === 1 && candidates.artifacts[0].sensitivitySignals.protectedCandidateCount === 2, 'candidate listing preserves artifact sensitivity signals')
  addCheck(checks, candidates.crawlItems[0]?.itemKey === 'crawl-1', 'candidate listing uses injected source-crawl item mapper')
  addCheck(checks, driveRun.runId === 'drive-access-preflight-synthetic' && driveRun.inspectedFileCount === 2, 'Drive Access preflight recording preserves run shape')
  addCheck(checks, latestDriveRun.cardId === 'DRIVE-ACCESS-REQUEST-001', 'Drive Access latest run read preserves run shape')
  addCheck(checks, aclAudit.auditId === 'meeting-vault-acl-synthetic' && aclAudit.inventoryComplete === true, 'Meeting Vault ACL audit recording preserves audit shape')
  addCheck(checks, enforcementRun.runId === 'meeting-vault-auto-synthetic' && enforcementRun.legacyExceptionCount === 1, 'Meeting Vault auto-enforcement recording preserves run shape')
  addCheck(checks, latestEnforcementRun.cardId === 'MEETING-VAULT-AUTO-ENFORCEMENT-001', 'Meeting Vault latest auto-enforcement read preserves run shape')
  addCheck(checks, legacyExceptions[0]?.exceptionId === 'legacy-1' && legacyExceptions[0]?.metadata?.ok === true, 'Meeting Vault legacy exception read preserves exception shape')
  addCheck(checks, changeEvents.some(event => event.eventType === 'drive_access_preflight_recorded') && changeEvents.some(event => event.eventType === 'meeting_vault_auto_enforcement_recorded'), 'recording functions still emit change events')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    queryCount: fakePool.calls.length,
    changeEventCount: changeEvents.length,
  }
}

export async function buildFoundationDriveMeetingVaultStoreSplitDogfoodProof({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  beforeLines = FOUNDATION_DRIVE_MEETING_VAULT_STORE_PRE_SPLIT_LINES,
  afterLines = countTextLines(foundationDbSource),
} = {}) {
  const healthy = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines,
    afterLines,
  })
  const oldInline = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource: `${foundationDbSource}\nexport async function recordDriveAccessPreflightRun() {}\nfunction mapDriveAccessPreflightRunRow() {}\nfunction mapMeetingVaultAclAuditRow() {}\nfunction mapMeetingVaultEnforcementRunRow() {}\nexport async function recordMeetingVaultAutoEnforcementRun() {}`,
    moduleSource,
    scriptSource,
    planSource,
    beforeLines,
    afterLines,
  })
  const missingModule = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource,
    moduleSource: '',
    scriptSource,
    planSource,
    beforeLines,
    afterLines,
  })
  const missingDelegates = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource: foundationDbSource.replace(/foundationDriveMeetingVaultStore/g, 'missingDriveMeetingVaultStore'),
    moduleSource,
    scriptSource,
    planSource,
    beforeLines,
    afterLines,
  })
  const weakPlan = evaluateFoundationDriveMeetingVaultStoreSplit({
    foundationDbSource,
    moduleSource,
    scriptSource,
    planSource: 'Move stuff.',
    beforeLines,
    afterLines,
  })
  const behavior = await buildSyntheticFoundationDriveMeetingVaultStoreBehaviorProof()

  return {
    ok: healthy.ok && !oldInline.ok && !missingModule.ok && !missingDelegates.ok && !weakPlan.ok && behavior.ok,
    invariant: 'Drive Access / Meeting Vault proof storage must be owned by a focused module, foundation-db must delegate stable exports, and synthetic behavior must preserve returned shapes.',
    healthy,
    behavior,
    rejected: {
      oldInlineDriveMeetingVaultOwnership: !oldInline.ok,
      missingDriveMeetingVaultModule: !missingModule.ok,
      missingFoundationDbDelegates: !missingDelegates.ok,
      weakPlan: !weakPlan.ok,
    },
  }
}
