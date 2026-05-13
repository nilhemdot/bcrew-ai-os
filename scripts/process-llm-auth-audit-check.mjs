#!/usr/bin/env node

import process from 'node:process'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  LLM_AUTH_AUDIT_APPROVAL_PATH,
  LLM_AUTH_AUDIT_CARD_ID,
  LLM_AUTH_AUDIT_CLOSEOUT_KEY,
  LLM_AUTH_AUDIT_PLAN_PATH,
  LLM_AUTH_AUDIT_SCRIPT_PATH,
  buildLlmAuthAuditStatus,
} from '../lib/llm-auth-audit-proof.js'
import {
  closeFoundationDb,
  getFoundationJobRunSnapshot,
  getLlmRuntimeSnapshot,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'

const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const NEXT_CARD_ID = 'SOURCE-EXTRACTION-GAP-FOLLOWUP-001'

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

async function closeSprintCard(status) {
  const routeTruth = status.summary.routeTruth || {}
  await updateBacklogItem(LLM_AUTH_AUDIT_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Continue in order with SOURCE-EXTRACTION-GAP-FOLLOWUP-001 as triage only; do not start broad ingestion or provider account changes.',
    statusNote: [
      `Closed on 2026-05-13 under \`${LLM_AUTH_AUDIT_CLOSEOUT_KEY}\`.`,
      'V1 ran `npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof` through the Foundation job ledger and recorded current route/auth truth in `llm_credentials`, `llm_routes`, `llm_route_probes`, and a dry-run `llm_calls` route-selection row.',
      `Current route truth: OpenAI API direct=${routeTruth.openAiApi || 'unknown'}, OpenClaw extraction=${routeTruth.openClawExtraction || 'unknown'}, OpenClaw synthesis=${routeTruth.openClawSynthesis || 'unknown'}, Claude Code subscription=${routeTruth.claudeCodeSynthesis || 'unknown'}, Claude OAuth=${routeTruth.claudeOauth || 'unknown'}, Anthropic API=${routeTruth.anthropicApi || 'unknown'}, Gemini video=${routeTruth.geminiVideo || 'unknown'}.`,
      'Proof: `npm run process:llm-auth-audit-check -- --json` verified a fresh succeeded job run, required route probes, classified route states, direct API fallback guards, and dry-run-only route selection.',
      'It does not rotate credentials, create provider accounts, enable direct spending outside router policy, start broad model jobs, run MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access emails.',
    ].join(' '),
  }, 'codex')

  await updateBacklogItem(NEXT_CARD_ID, {
    lane: 'executing',
    nextAction: 'Building now under control-plane-connector-readiness-2026-05-12. Produce source extraction gap triage only from connector/routing matrices; do not implement broad ingestion.',
    statusNote: 'Building Now after the LLM auth audit card advanced. Scope remains source-gap triage only; proof is still pending.',
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
      [SPRINT_ID, LLM_AUTH_AUDIT_CARD_ID],
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
          currentStatus: 'llm_auth_audit_done_source_extraction_gap_followup_building_now',
          nextAction: 'Build SOURCE-EXTRACTION-GAP-FOLLOWUP-001 as triage only; do not start broad ingestion.',
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
  const skipClose = boolArg(args.skipClose) || boolArg(args['skip-close'])
  const maxAgeHours = Number(args.maxAgeHours || args['max-age-hours'] || 24)
  const findings = []

  await initFoundationDb()
  try {
    const [approvalValidation, llmRuntime, foundationJobs] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: LLM_AUTH_AUDIT_APPROVAL_PATH,
        cardId: LLM_AUTH_AUDIT_CARD_ID,
      }),
      getLlmRuntimeSnapshot({ limit: 50 }),
      getFoundationJobRunSnapshot({ limit: 30 }),
    ])

    addFinding(
      findings,
      approvalValidation.ok &&
        approvalValidation.mode === 'v2' &&
        Number(approvalValidation.approval?.score) >= 9.8 &&
        approvalValidation.approval?.approvedPlanRef === LLM_AUTH_AUDIT_PLAN_PATH,
      'Plan Critic approval file is valid at 9.8+',
      approvalValidation.failures?.map(item => item.check).join(', ') || '',
    )

    const status = buildLlmAuthAuditStatus({
      llmRuntime,
      foundationJobs,
      maxAgeHours,
    })
    findings.push(...status.findings)

    const summary = {
      ...status,
      status: findings.length ? 'blocked' : 'healthy',
      planRef: LLM_AUTH_AUDIT_PLAN_PATH,
      scriptRef: LLM_AUTH_AUDIT_SCRIPT_PATH,
      findings,
    }

    if (summary.status === 'healthy' && !skipClose) await closeSprintCard(summary)

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('LLM auth audit proof')
      console.log(`  Card: ${LLM_AUTH_AUDIT_CARD_ID}`)
      console.log(`  Closeout: ${LLM_AUTH_AUDIT_CLOSEOUT_KEY}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Credentials: ${summary.summary.credentialCount}`)
      console.log(`  Routes: ${summary.summary.routeCount}`)
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
      cardId: LLM_AUTH_AUDIT_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
