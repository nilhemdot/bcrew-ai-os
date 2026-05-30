#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildLlmCapacityPolicyMetadataUpdates,
  buildLlmCredentialRegistryDogfoodProof,
  buildLlmCredentialRegistryPolicySnapshot,
  LLM_CAPACITY_POLICY_METADATA_KEY,
  LLM_CREDENTIAL_REGISTRY_APPROVAL_PATH,
  LLM_CREDENTIAL_REGISTRY_CARD_ID,
  LLM_CREDENTIAL_REGISTRY_CLOSEOUT_KEY,
  LLM_CREDENTIAL_REGISTRY_PLAN_PATH,
  LLM_CREDENTIAL_REGISTRY_SCRIPT_PATH,
  LLM_CREDENTIAL_REGISTRY_SPRINT_ID,
} from '../lib/llm-credential-registry.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-runtime-jobs-db.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
  PROCESS_CHECK_WRITE_FLAGS,
} from '../lib/process-write-guard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : true
  }
  return args
}

function boolArg(value) {
  return value === true || ['1', 'true', 'yes', 'y'].includes(String(value || '').toLowerCase())
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function stripPolicyMetadata(row = {}) {
  const { [LLM_CAPACITY_POLICY_METADATA_KEY]: _capacityPolicy, ...metadata } = row.metadata || {}
  return metadata
}

async function applyCapacityPolicyMetadata(llmRuntime, actor) {
  const updates = buildLlmCapacityPolicyMetadataUpdates(llmRuntime)
  const credentialResults = []
  const routeResults = []
  for (const credential of llmRuntime.credentials || []) {
    const policy = updates.credentialPolicies.get(credential.credentialKey)
    if (!policy) continue
    credentialResults.push(await upsertLlmCredential({
      credentialKey: credential.credentialKey,
      provider: credential.provider,
      authPath: credential.authPath,
      displayName: credential.displayName,
      accountLabel: credential.accountLabel,
      hubKey: credential.hubKey,
      workloadLane: credential.workloadLane,
      secretRef: credential.secretRef,
      status: credential.status,
      policyClassification: credential.policyClassification,
      allowedWorkloads: credential.allowedWorkloads,
      notes: credential.notes,
      quotaState: credential.quotaState,
      metadata: {
        ...stripPolicyMetadata(credential),
        [LLM_CAPACITY_POLICY_METADATA_KEY]: policy,
      },
    }, actor))
  }
  for (const route of llmRuntime.routes || []) {
    const policy = updates.routePolicies.get(route.routeKey)
    if (!policy) continue
    routeResults.push(await upsertLlmRoute({
      routeKey: route.routeKey,
      workload: route.workload,
      hubKey: route.hubKey,
      priority: route.priority,
      provider: route.provider,
      model: route.model,
      authPath: route.authPath,
      credentialKey: route.credentialKey,
      fallbackRouteKey: route.fallbackRouteKey,
      status: route.status,
      policyClassification: route.policyClassification,
      costCapUsd: route.costCapUsd,
      riskClass: route.riskClass,
      notes: route.notes,
      metadata: {
        ...stripPolicyMetadata(route),
        [LLM_CAPACITY_POLICY_METADATA_KEY]: policy,
      },
    }, actor))
  }
  return {
    credentialRowsUpdated: credentialResults.length,
    routeRowsUpdated: routeResults.length,
  }
}

function scriptIsReadOnlyByDefault(source = '') {
  return source.includes('assertProcessCheckWriteAllowed') &&
    source.includes('PROCESS_CHECK_WRITE_FLAGS.apply') &&
    source.includes('applyCapacityPolicyMetadata') &&
    !/upsertFoundationCurrentSprintOverlay\s*\(|updateBacklogItem\s*\(|createBacklogItem\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items/i.test(source)
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const applyRequested = isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  const checks = []
  const actor = String(args.actor || 'codex-llm-credential-registry').trim()

  const [approvalValidation, cardRows, sprint, proofScriptSource, packageSource] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: LLM_CREDENTIAL_REGISTRY_APPROVAL_PATH,
      cardId: LLM_CREDENTIAL_REGISTRY_CARD_ID,
    }),
    getBacklogItemsByIds([LLM_CREDENTIAL_REGISTRY_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    readRepoFile(LLM_CREDENTIAL_REGISTRY_SCRIPT_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cardRows.find(row => row.id === LLM_CREDENTIAL_REGISTRY_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([LLM_CREDENTIAL_REGISTRY_CARD_ID])
  let llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
  let applied = null

  if (applyRequested) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: LLM_CREDENTIAL_REGISTRY_SCRIPT_PATH,
      operation: 'sync LLM capacity policy metadata into llm_credentials and llm_routes',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    applied = await applyCapacityPolicyMetadata(llmRuntime, actor)
    llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
  }

  const registry = buildLlmCredentialRegistryPolicySnapshot(llmRuntime)
  const dogfood = buildLlmCredentialRegistryDogfoodProof()
  const activeItem = (sprint.items || []).find(item => item.cardId === LLM_CREDENTIAL_REGISTRY_CARD_ID)

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2' && approvalValidation.approval?.approvedPlanRef === LLM_CREDENTIAL_REGISTRY_PLAN_PATH, 'approval file validates', approvalValidation.failures?.map(item => item.check).join(', ') || LLM_CREDENTIAL_REGISTRY_APPROVAL_PATH)
  addCheck(checks, packageJson.scripts?.['process:llm-credential-registry-check'] === 'node --env-file-if-exists=.env scripts/process-llm-credential-registry-check.mjs', 'package script is registered', packageJson.scripts?.['process:llm-credential-registry-check'] || 'missing')
  addCheck(checks, scriptIsReadOnlyByDefault(proofScriptSource), 'focused proof is read-only by default and writes only with --apply', LLM_CREDENTIAL_REGISTRY_SCRIPT_PATH)
  addCheck(checks, dogfood.ok, 'dogfood rejects missing, weak, or secret-shaped policy metadata', dogfood.invariant)
  addCheck(checks, registry.ok, 'live LLM registry capacity policy metadata is complete', JSON.stringify(registry.summary))
  addCheck(checks, registry.summary.credentialPolicyRows >= 5, 'capacity-backed credential rows are policy-backed', String(registry.summary.credentialPolicyRows))
  addCheck(checks, registry.summary.routePolicyRows >= 6, 'capacity-backed route rows are policy-backed', String(registry.summary.routePolicyRows))
  addCheck(checks, llmRuntime.credentialRegistry?.ok === true, 'live LLM runtime snapshot exposes credentialRegistry', JSON.stringify(llmRuntime.credentialRegistry?.summary || null))
  addCheck(checks, Boolean(card), 'live backlog card exists', card?.lane || 'missing')
  addCheck(checks, ['executing', 'done'].includes(card?.lane), 'live backlog card is active or done', card?.lane || 'missing')
  addCheck(checks, card?.priority === 'P0', 'live backlog card keeps P0 priority', card?.priority || 'missing')
  addCheck(checks, sprint.sprint?.sprintId === LLM_CREDENTIAL_REGISTRY_SPRINT_ID || activeItem?.stage === 'done_this_sprint' || card?.lane === 'done', 'Current Sprint points at LLM credential registry sprint or card is closed', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, activeItem?.stage === 'building_now' || activeItem?.stage === 'done_this_sprint' || card?.lane === 'done', 'Current Sprint includes active/done item', activeItem?.stage || card?.lane || 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === LLM_CREDENTIAL_REGISTRY_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: LLM_CREDENTIAL_REGISTRY_CARD_ID,
    closeoutKey: LLM_CREDENTIAL_REGISTRY_CLOSEOUT_KEY,
    applied,
    registrySummary: registry.summary,
    dogfood,
    checks,
    failures,
  }

  if (jsonMode) console.log(JSON.stringify(result, null, 2))
  else {
    console.log('LLM credential registry proof')
    console.log(`  Card: ${LLM_CREDENTIAL_REGISTRY_CARD_ID}`)
    console.log(`  Status: ${result.ok ? 'healthy' : 'blocked'}`)
    for (const check of checks) console.log(`  ${check.ok ? 'PASS' : 'FAIL'} ${check.check}: ${check.detail}`)
  }
  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    const jsonMode = process.argv.includes('--json') || process.argv.includes('--json=true')
    const payload = {
      ok: false,
      cardId: LLM_CREDENTIAL_REGISTRY_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }
    if (jsonMode) console.log(JSON.stringify(payload, null, 2))
    else console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    try { await closeFoundationDb() } catch {}
  })
