#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  DOC_ARTIFACT_BLOAT_GUARD_APPROVAL_PATH,
  DOC_ARTIFACT_BLOAT_GUARD_CARD_ID,
  DOC_ARTIFACT_BLOAT_GUARD_CLOSEOUT_KEY,
  DOC_ARTIFACT_BLOAT_GUARD_PLAN_PATH,
  DOC_ARTIFACT_BLOAT_GUARD_SCRIPT_PATH,
  NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_APPROVAL_PATH,
  NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID,
  buildDocArtifactBloatGuardDogfoodProof,
  buildDocArtifactBloatSnapshot,
} from '../lib/doc-artifact-bloat-guard.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(process.cwd(), relativePath))
    return true
  } catch {
    return false
  }
}

async function scriptSourceHasNoWriteApis() {
  const source = await fs.readFile(path.join(process.cwd(), DOC_ARTIFACT_BLOAT_GUARD_SCRIPT_PATH), 'utf8')
  const forbidden = [
    { token: 'fs.writeFile', pattern: /\bfs\.(writeFile|appendFile|rm|unlink|rename|mkdir)\s*\(/ },
    { token: 'updateBacklogItem import', pattern: /\bimport\s+\{[^}]*updateBacklogItem\b/s },
    { token: 'upsertFoundationCurrentSprintOverlay import', pattern: /\bimport\s+\{[^}]*upsertFoundationCurrentSprintOverlay\b/s },
    { token: 'createBacklogItem import', pattern: /\bimport\s+\{[^}]*createBacklogItem\b/s },
    { token: 'SQL backlog/sprint mutation', pattern: /\b(INSERT|UPDATE|DELETE)\s+(INTO\s+)?(backlog_items|foundation_sprints|foundation_sprint_items)\b/i },
  ]
  return forbidden.filter(item => item.pattern.test(source)).map(item => item.token)
}

async function main() {
  const approvalChecks = await Promise.all([
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: DOC_ARTIFACT_BLOAT_GUARD_APPROVAL_PATH,
      cardId: DOC_ARTIFACT_BLOAT_GUARD_CARD_ID,
    }),
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_APPROVAL_PATH,
      cardId: NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID,
    }),
  ])
  const dogfood = buildDocArtifactBloatGuardDogfoodProof()
  const snapshot = await buildDocArtifactBloatSnapshot({ repoRoot: process.cwd() })
  const forbiddenScriptWrites = await scriptSourceHasNoWriteApis()
  const planExists = await fileExists(DOC_ARTIFACT_BLOAT_GUARD_PLAN_PATH)
  const checks = [
    {
      ok: planExists,
      check: 'approved plan exists',
      detail: DOC_ARTIFACT_BLOAT_GUARD_PLAN_PATH,
    },
    {
      ok: approvalChecks.every(result => result.ok),
      check: 'both approval files pass v2 approval integrity',
      detail: approvalChecks.map(result => `${result.approvalRef}:${result.ok ? 'ok' : result.failures.map(failure => failure.check).join('|')}`).join(', '),
    },
    {
      ok: dogfood.ok === true,
      check: 'dogfood proof catches oversized docs and nightly outputs',
      detail: dogfood.dogfoodInvariant,
    },
    {
      ok: snapshot.reportOnly === true && snapshot.readOnly === true && snapshot.autoFixes === false && snapshot.writesBacklog === false,
      check: 'live doc artifact snapshot is report-only and read-only',
      detail: `status=${snapshot.status} findings=${snapshot.findings.length}`,
    },
    {
      ok: forbiddenScriptWrites.length === 0,
      check: 'focused check script has no file/DB write APIs',
      detail: forbiddenScriptWrites.length ? forbiddenScriptWrites.join(', ') : 'no forbidden write APIs found',
    },
    {
      ok: Array.isArray(snapshot.topArtifacts) && snapshot.topArtifacts.some(artifact => normalizePath(artifact.path).startsWith('docs/handoffs/')),
      check: 'live scan includes handoff artifacts',
      detail: `artifactCount=${snapshot.summary.artifactCount}`,
    },
    {
      ok: snapshot.cardIds?.includes(DOC_ARTIFACT_BLOAT_GUARD_CARD_ID) && snapshot.cardIds?.includes(NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID),
      check: 'snapshot preserves both backlog card IDs',
      detail: (snapshot.cardIds || []).join(', '),
    },
    {
      ok: snapshot.closeoutKey === DOC_ARTIFACT_BLOAT_GUARD_CLOSEOUT_KEY,
      check: 'snapshot carries closeout key',
      detail: snapshot.closeoutKey,
    },
  ]
  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardIds: [DOC_ARTIFACT_BLOAT_GUARD_CARD_ID, NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID],
    closeoutKey: DOC_ARTIFACT_BLOAT_GUARD_CLOSEOUT_KEY,
    checks,
    failures,
    dogfood: {
      ok: dogfood.ok,
      checkCount: dogfood.checks.length,
      bloatedStatus: dogfood.bloated.status,
      bloatedFindings: dogfood.bloated.findings.length,
    },
    snapshot: {
      status: snapshot.status,
      summary: snapshot.summary,
      topFindings: snapshot.topFindings.slice(0, 8),
    },
  }
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.ok) {
    console.log(`DOC_ARTIFACT_BLOAT_GUARD_OK ${JSON.stringify(result.snapshot.summary)}`)
  } else {
    console.error(`DOC_ARTIFACT_BLOAT_GUARD_FAILED ${JSON.stringify(failures)}`)
  }
  assert(result.ok, 'doc artifact bloat guard proof failed')
}

main().catch(error => {
  if (jsonMode) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
