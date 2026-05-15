#!/usr/bin/env node

import { Pool } from 'pg'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CONNECTOR_CREDENTIAL_APPROVAL_PATH,
  CONNECTOR_CREDENTIAL_CARD_ID,
  CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
  CONNECTOR_CREDENTIAL_PLAN_PATH,
  CONNECTOR_CREDENTIAL_REQUIRED_KEYS,
  CONNECTOR_CREDENTIAL_SCRIPT_PATH,
  assertNoConnectorCredentialSecrets,
  buildConnectorCredentialRegistrySnapshot,
} from '../lib/connector-credential-registry.js'
import {
  buildSourceConnectorMatrixSnapshot,
} from '../lib/source-connector-matrix.js'
import {
  closeFoundationDb,
  getFoundationSnapshot,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from '../lib/source-contracts.js'

// liveTruthPosture: historical_closeout_only - this proof closes/replays the closed control-plane sprint.
const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const NEXT_CARD_ID = 'LLM-AUTH-AUDIT-001'
const SYNTHETIC_SECRET_SENTINEL = 'SYNTHETIC_CONNECTOR_CREDENTIAL_SECRET_VALUE_DO_NOT_OUTPUT_001'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function syntheticEnv() {
  return {
    ...process.env,
    FUB_SYSTEM_NAME: SYNTHETIC_SECRET_SENTINEL,
    FUB_SYSTEM_KEY: SYNTHETIC_SECRET_SENTINEL,
    CLICKUP_PERSONAL_TOKEN: SYNTHETIC_SECRET_SENTINEL,
    SLACK_BOT_TOKEN: SYNTHETIC_SECRET_SENTINEL,
    MISSIVE_API_TOKEN: SYNTHETIC_SECRET_SENTINEL,
    OPENAI_API_KEY: SYNTHETIC_SECRET_SENTINEL,
    DATAFORSEO_USERNAME: SYNTHETIC_SECRET_SENTINEL,
    DATAFORSEO_PASSWORD: SYNTHETIC_SECRET_SENTINEL,
    SOCIALPILOT_API_KEY: SYNTHETIC_SECRET_SENTINEL,
    REAL_BROKER_API_KEY: SYNTHETIC_SECRET_SENTINEL,
    TELEGRAM_BOT_TOKEN: SYNTHETIC_SECRET_SENTINEL,
    WHATSAPP_ACCESS_TOKEN: SYNTHETIC_SECRET_SENTINEL,
    GOOGLE_ADS_REFRESH_TOKEN: SYNTHETIC_SECRET_SENTINEL,
  }
}

function requiredRows(snapshot) {
  const rowMap = new Map((snapshot.rows || []).map(row => [row.key, row]))
  return CONNECTOR_CREDENTIAL_REQUIRED_KEYS.map(key => rowMap.get(key)).filter(Boolean)
}

function metadataOnlyRows(rows = []) {
  return rows.every(row =>
    row.key &&
    row.connectorId &&
    row.provider &&
    row.credentialClass &&
    row.owner &&
    row.status &&
    row.lastProbeAt &&
    row.lastProbeStatus &&
    Array.isArray(row.sourceIds) &&
    Array.isArray(row.credentialRefNames) &&
    Array.isArray(row.credentialRequirements) &&
    Array.isArray(row.unlockedWorkloads) &&
    typeof row.sourceUnlocked === 'boolean' &&
    typeof row.safeToUse === 'boolean' &&
    typeof row.blockerReason === 'string'
  )
}

async function closeSprintCard() {
  await updateBacklogItem(CONNECTOR_CREDENTIAL_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Continue in order with LLM-AUTH-AUDIT-001; do not repair provider auth or start external extraction from the credential inventory.',
    statusNote: 'Closed on 2026-05-13 under `connector-credential-v1`. V1 adds `lib/connector-credential-registry.js`, `/api/foundation/connector-credential-preflight`, connector-matrix credential status linkage, and `scripts/process-connector-credential-check.mjs`. Proof: `npm run process:connector-credential-check -- --json` verified 27 metadata-only rows, all 25 connector matrix rows linked to credential registry keys, and synthetic credential sentinels absent from output. It does not output raw credential values, rotate auth, run MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, send request-access emails, or start extraction.',
  }, 'codex')

  await updateBacklogItem(NEXT_CARD_ID, {
    lane: 'executing',
    nextAction: 'Building now under control-plane-connector-readiness-2026-05-12. Run fresh model route/auth probes through the approved LLM auth audit path; do not start broad scheduled intelligence jobs or provider-side account changes.',
    statusNote: 'Building Now after the prior ordered card advanced. Scope remains route/auth classification only; proof is still pending.',
  }, 'codex')

  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'done_this_sprint',
            updated_at = NOW()
        WHERE sprint_id = $1
          AND backlog_id = $2
      `,
      [SPRINT_ID, CONNECTOR_CREDENTIAL_CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'building_now',
            updated_at = NOW()
        WHERE sprint_id = $1
          AND backlog_id = $2
      `,
      [SPRINT_ID, NEXT_CARD_ID],
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET active_blocker_card_id = $2,
            metadata = metadata || $3::jsonb,
            updated_at = NOW()
        WHERE sprint_id = $1
          AND status = 'active'
      `,
      [
        SPRINT_ID,
        NEXT_CARD_ID,
        JSON.stringify({
          currentStatus: 'connector_credential_done_llm_auth_audit_building_now',
          nextAction: 'Run LLM-AUTH-AUDIT-001 route/auth probes next; no provider account changes or broad model-job expansion.',
        }),
      ],
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const closeRequested = isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: ['apply', 'close-card', 'mutate-sprint'],
  })
  const findings = []

  await initFoundationDb()
  try {
    const [approvalValidation, foundationSnapshot] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: CONNECTOR_CREDENTIAL_APPROVAL_PATH,
        cardId: CONNECTOR_CREDENTIAL_CARD_ID,
      }),
      getFoundationSnapshot(),
    ])
    const sourceContracts = getSourceContracts()
    const sourceConnectors = getSourceConnectors()
    const registry = buildConnectorCredentialRegistrySnapshot({
      sourceContracts,
      sourceConnectors,
    })
    const syntheticRegistry = buildConnectorCredentialRegistrySnapshot({
      env: syntheticEnv(),
      now: new Date('2026-05-13T00:00:00.000Z'),
      sourceContracts,
      sourceConnectors,
    })
    const secretSafety = assertNoConnectorCredentialSecrets(syntheticRegistry, [SYNTHETIC_SECRET_SENTINEL])
    const matrix = buildSourceConnectorMatrixSnapshot({
      sources: sourceContracts,
      connectors: sourceConnectors,
      extractionControl: foundationSnapshot.extractionControl,
      sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
      intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
      intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
      intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
      sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
      connectorCredentialRegistry: registry,
    })

    const registryKeys = new Set((registry.rows || []).map(row => row.key))
    const missingRequiredKeys = CONNECTOR_CREDENTIAL_REQUIRED_KEYS.filter(key => !registryKeys.has(key))
    const required = requiredRows(registry)
    const matrixRowsWithoutCredential = (matrix.rows || []).filter(row => !row.credentialRegistryKeys?.length)

    addFinding(findings, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan Critic approval file is valid at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || '')
    addFinding(findings, registry.cardId === CONNECTOR_CREDENTIAL_CARD_ID && registry.closeoutKey === CONNECTOR_CREDENTIAL_CLOSEOUT_KEY, 'registry carries card and closeout identifiers')
    addFinding(findings, registry.summary?.rowCount >= 21, 'registry covers required connector classes', `rows=${registry.summary?.rowCount || 0}`)
    addFinding(findings, missingRequiredKeys.length === 0, 'registry includes every required connector credential class', missingRequiredKeys.join(', '))
    addFinding(findings, metadataOnlyRows(required), 'required registry rows have metadata-only fields')
    addFinding(findings, secretSafety.ok, 'synthetic credential sentinel values are not output', JSON.stringify(secretSafety))
    addFinding(findings, required.some(row => row.key === 'fub-api' && row.connectorId === 'CONN-FUB-001'), 'FUB credential class is represented')
    addFinding(findings, required.some(row => row.key === 'kpi-supabase' && row.sourceIds.includes('SRC-SUPABASE-001')), 'KPI Supabase credential class is represented')
    addFinding(findings, ['google-delegated-drive', 'google-delegated-gmail', 'google-delegated-sheets'].every(key => registryKeys.has(key)), 'Google delegated Drive/Gmail/Sheets credential classes are represented')
    addFinding(findings, ['clickup-api', 'slack-api', 'missive-api'].every(key => registryKeys.has(key)), 'ClickUp, Slack, and Missive credential classes are represented')
    addFinding(findings, ['llm-openai-api', 'llm-openclaw', 'llm-claude-code'].every(key => registryKeys.has(key)), 'LLM route credential classes are represented')
    addFinding(findings, ['apify-loom-youtube', 'dataforseo-youtube', 'myicro-access', 'skool-access', 'real-broker', 'socialpilot'].every(key => registryKeys.has(key)), 'media/training/publishing credential classes are represented')
    addFinding(findings, ['ga4', 'gsc', 'gbp', 'telegram-inbound', 'whatsapp'].every(key => registryKeys.has(key)), 'GA/GSC/GBP and inbound messaging credential classes are represented')
    addFinding(findings, matrix.columns.includes('has_credential') && matrix.columns.includes('credential_status'), 'connector matrix consumes credential status columns')
    addFinding(findings, matrixRowsWithoutCredential.length === 0, 'every connector matrix row links to at least one credential registry key', matrixRowsWithoutCredential.map(row => row.key).join(', '))
    addFinding(findings, (matrix.rows || []).some(row => row.sourceId === 'SRC-PUBLISH-001' && row.credentialStatus === 'blocked'), 'SocialPilot stays blocked until owner/user context is validated')
    addFinding(findings, (matrix.rows || []).some(row => row.sourceId === 'SRC-REAL-001' && row.credentialStatus === 'blocked'), 'Real Broker stays blocked until connected')
    addFinding(findings, (registry.rows || []).every(row => !row.presentCredentialRefNames.some(name => name === SYNTHETIC_SECRET_SENTINEL)), 'present credential refs contain names only, never values')

    const summary = {
      status: findings.length ? 'blocked' : 'healthy',
      cardId: CONNECTOR_CREDENTIAL_CARD_ID,
      closeoutKey: CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
      planRef: CONNECTOR_CREDENTIAL_PLAN_PATH,
      scriptRef: CONNECTOR_CREDENTIAL_SCRIPT_PATH,
      registrySummary: registry.summary,
      matrixCredentialSummary: {
        rowCount: matrix.summary?.rowCount || 0,
        credentialCoveredCount: matrix.summary?.credentialCoveredCount || 0,
        credentialAvailableCount: matrix.summary?.credentialAvailableCount || 0,
      },
      missingRequiredKeys,
      matrixRowsWithoutCredential: matrixRowsWithoutCredential.map(row => row.key),
      findings,
    }

    if (summary.status === 'healthy' && closeRequested) {
      assertProcessCheckWriteAllowed({
        argv: process.argv.slice(2),
        scriptPath: CONNECTOR_CREDENTIAL_SCRIPT_PATH,
        operation: 'close connector credential card and mutate sprint state',
        allowedFlags: ['apply', 'close-card', 'mutate-sprint'],
      })
      await closeSprintCard()
    }

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Connector credential preflight proof')
      console.log(`  Card: ${CONNECTOR_CREDENTIAL_CARD_ID}`)
      console.log(`  Closeout: ${CONNECTOR_CREDENTIAL_CLOSEOUT_KEY}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Registry rows: ${summary.registrySummary.rowCount}`)
      for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  const jsonMode = process.argv.includes('--json') || process.argv.includes('--json=true')
  if (jsonMode) {
    console.log(JSON.stringify({
      ok: false,
      cardId: CONNECTOR_CREDENTIAL_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
