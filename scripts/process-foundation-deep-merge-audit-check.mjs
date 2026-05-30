#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_DEEP_MERGE_AUDIT_APPROVAL_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID,
  FOUNDATION_DEEP_MERGE_AUDIT_CLOSEOUT_KEY,
  FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_PLAN_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_SCRIPT_PATH,
} from '../lib/nightly-deep-audit-constants.js'
import {
  buildNightlyDeepAuditUpgrade,
  renderNightlyDeepAuditUpgradeReport,
  serializeNightlyDeepAuditUpgradeJson,
} from '../lib/nightly-deep-audit-upgrade.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    runLlmReview: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 8000,
    baselineRef: '',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--apply') args.apply = true
    else if (arg === '--runLlmReview' || arg === '--run-llm-review') args.runLlmReview = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
    else if (arg.startsWith('--endpointTimeoutMs=')) args.timeoutMs = Number(arg.slice('--endpointTimeoutMs='.length))
    else if (arg.startsWith('--baselineRef=')) args.baselineRef = arg.slice('--baselineRef='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function uniq(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

async function git(args, options = {}) {
  const { stdout } = await execFile('git', args, {
    cwd: repoRoot,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
  })
  return stdout.trim()
}

async function fileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

async function resolveDefaultBaselineRef() {
  return git(['rev-list', '--before=2026-04-26T00:00:00-04:00', '-1', 'HEAD'])
}

async function buildMergeScope({ baselineRef }) {
  const [baselineCommit, headCommit, commitCountText, changedFilesText, changedCodeFilesText, statText] = await Promise.all([
    git(['rev-parse', baselineRef]),
    git(['rev-parse', 'HEAD']),
    git(['rev-list', '--count', `${baselineRef}..HEAD`]),
    git(['diff', '--name-only', `${baselineRef}..HEAD`], { maxBuffer: 50 * 1024 * 1024 }),
    git(['diff', '--name-only', `${baselineRef}..HEAD`, '--', '*.js', '*.mjs', '*.html', '*.css'], { maxBuffer: 50 * 1024 * 1024 }),
    git(['diff', '--stat', `${baselineRef}..HEAD`, '--', ':!docs/_archive/handoffs/2026-05-19-hot-doc-cleanup'], { maxBuffer: 50 * 1024 * 1024 }),
  ])
  const changedFiles = changedFilesText ? changedFilesText.split(/\r?\n/).filter(Boolean) : []
  const changedCodeFiles = changedCodeFilesText ? changedCodeFilesText.split(/\r?\n/).filter(Boolean) : []
  return {
    baselineRef,
    baselineCommit,
    headCommit,
    commitCount: Number(commitCountText || 0),
    changedFileCount: changedFiles.length,
    changedCodeFileCount: changedCodeFiles.length,
    changedCodeSample: changedCodeFiles.slice(0, 40),
    statTail: statText.split(/\r?\n/).slice(-45).join('\n'),
  }
}

function p0p1Findings(audit = {}) {
  const deterministic = (audit.findings || []).map(finding => ({
    source: 'deterministic',
    severity: finding.severity,
    title: finding.title,
    proposedCard: finding.proposedCard,
    owner: finding.proposedOwner || 'Foundation Builder',
    nextAction: finding.nextAction || finding.title,
  }))
  const senior = (audit.llmReview?.findings || []).map(finding => ({
    source: 'senior_review',
    severity: finding.severity,
    title: finding.title,
    proposedCard: finding.proposedCard,
    owner: finding.owner,
    nextAction: finding.nextAction,
  }))
  return [...deterministic, ...senior]
    .filter(finding => ['P0', 'P1'].includes(String(finding.severity || '').toUpperCase()))
}

function renderMergeAuditReport({ audit, mergeScope, routeRows }) {
  const baseReport = renderNightlyDeepAuditUpgradeReport(audit)
  const routedLines = routeRows.length
    ? routeRows.map(row => `- ${row.severity} ${row.title} -> \`${row.proposedCard || 'missing'}\` (${row.routeStatus})`).join('\n')
    : '- none'
  return `# Foundation Deep Merge Audit - 2026-05-19

Card: \`${FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID}\`
Closeout key: \`${FOUNDATION_DEEP_MERGE_AUDIT_CLOSEOUT_KEY}\`
Report path: \`${FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH}\`
JSON path: \`${FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH}\`

## Merge Scope

- Baseline ref: \`${mergeScope.baselineRef}\`
- Baseline commit: \`${mergeScope.baselineCommit}\`
- Head commit: \`${mergeScope.headCommit}\`
- Commits reviewed: ${mergeScope.commitCount}
- Changed files: ${mergeScope.changedFileCount}
- Changed code files: ${mergeScope.changedCodeFileCount}
- Deep senior review: \`${audit.deepSeniorReviewRollup?.status || 'unknown'}\` (${audit.deepSeniorReviewRollup?.detail || 'no detail'})
- Mutation boundary: report-only audit; no auto-fixes and no automatic backlog writes.

## Routed P0/P1 Findings

${routedLines}

## Changed Code Sample

${mergeScope.changedCodeSample.map(file => `- ${file}`).join('\n') || '- none'}

## Diff Stat Tail

\`\`\`
${mergeScope.statTail || '(empty)'}
\`\`\`

---

${baseReport}
`
}

async function writeAuditArtifacts({ audit, mergeScope, routeRows }) {
  const enriched = {
    ...audit,
    cardId: FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID,
    closeoutKey: FOUNDATION_DEEP_MERGE_AUDIT_CLOSEOUT_KEY,
    reportPath: FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH,
    jsonPath: FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH,
  }
  const markdown = renderMergeAuditReport({ audit: enriched, mergeScope, routeRows })
  const json = {
    ...serializeNightlyDeepAuditUpgradeJson(enriched),
    mergeScope,
    routeRows,
  }
  await fs.mkdir(path.join(repoRoot, 'docs/audits'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH), markdown, 'utf8')
  await fs.writeFile(path.join(repoRoot, FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH), `${JSON.stringify(json, null, 2)}\n`, 'utf8')
  return { markdown, json }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const baselineRef = args.baselineRef || await resolveDefaultBaselineRef()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_DEEP_MERGE_AUDIT_APPROVAL_PATH,
    cardId: FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID,
  })
  const cards = await getBacklogItemsByIds([FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID])
  const card = cards.find(row => row.id === FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID) || null
  const packageJson = await readJson('package.json')
  const mergeScope = await buildMergeScope({ baselineRef })

  let artifact = null
  let routeRows = []
  if (args.apply) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: FOUNDATION_DEEP_MERGE_AUDIT_SCRIPT_PATH,
      operation: 'write Foundation deep merge audit report artifacts',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    })
    const audit = await buildNightlyDeepAuditUpgrade({
      repoRoot,
      baseUrl: args.baseUrl,
      timeoutMs: Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 8000,
      changedSinceRef: baselineRef,
      runLlmReview: args.runLlmReview,
    })
    const proposedCardIds = uniq(p0p1Findings({
      findings: audit.deterministicAudit?.findings || [],
      llmReview: audit.llmReview,
    }).map(finding => finding.proposedCard))
    const proposedCards = proposedCardIds.length ? await getBacklogItemsByIds(proposedCardIds) : []
    const cardMap = new Map(proposedCards.map(row => [row.id, row]))
    routeRows = p0p1Findings({
      findings: audit.deterministicAudit?.findings || [],
      llmReview: audit.llmReview,
    }).map(finding => ({
      ...finding,
      proposedCard: finding.proposedCard || '',
      routeStatus: finding.proposedCard && cardMap.has(finding.proposedCard)
        ? `live_backlog_${cardMap.get(finding.proposedCard).lane}`
        : 'missing_live_backlog_route',
    }))
    artifact = await writeAuditArtifacts({ audit, mergeScope, routeRows })
  } else if (await fileExists(FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH)) {
    const json = await readJson(FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH)
    const markdown = await fs.readFile(path.join(repoRoot, FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH), 'utf8').catch(() => '')
    artifact = { json, markdown }
    routeRows = Array.isArray(json.routeRows) ? json.routeRows : []
  }
  await closeFoundationDb()

  const json = artifact?.json || null
  const markdown = artifact?.markdown || ''
  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(row => row.check).join(', ') || FOUNDATION_DEEP_MERGE_AUDIT_APPROVAL_PATH)
  addCheck(checks, Boolean(card) && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:foundation-deep-merge-audit-check']?.includes(FOUNDATION_DEEP_MERGE_AUDIT_SCRIPT_PATH), 'package script exists', packageJson.scripts?.['process:foundation-deep-merge-audit-check'] || 'missing')
  addCheck(checks, mergeScope.commitCount >= 300 && mergeScope.changedCodeFileCount >= 300, 'merge scope is broad enough for the May 19 audit', `${mergeScope.commitCount} commits / ${mergeScope.changedCodeFileCount} code files`)
  addCheck(checks, Boolean(json) && Boolean(markdown), 'audit artifacts exist or were generated', `${FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH} / ${FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH}`)
  addCheck(checks, json?.deepSeniorReviewRollup?.executed === true && json?.llmReview?.executedThisRun === true, 'deep senior review executed for the one-time merge audit', JSON.stringify(json?.deepSeniorReviewRollup || {}))
  addCheck(checks, json?.endpointMetrics?.length >= 5, 'merge audit captured endpoint metrics', `${json?.endpointMetrics?.length || 0} endpoints`)
  addCheck(
    checks,
    (json?.reviewTargets || []).some(target => target.file === 'server.js') &&
      (json?.reviewTargets || []).some(target => target.file === 'lib/foundation-db.js') &&
      (json?.reviewTargets || []).some(target => target.file === 'scripts/foundation-verify.mjs') &&
      (json?.reviewTargets || []).some(target => target.file === 'public/foundation.js'),
    'merge audit includes high-risk backend/frontend/verifier/db targets',
    (json?.reviewTargets || []).map(target => target.file).slice(0, 12).join(', '),
  )
  addCheck(
    checks,
    routeRows.every(row => row.routeStatus && row.routeStatus !== 'missing_live_backlog_route'),
    'all P0/P1 findings route to live backlog truth',
    routeRows.filter(row => row.routeStatus === 'missing_live_backlog_route').map(row => `${row.title}:${row.proposedCard || 'missing'}`).join(', ') || `${routeRows.length} routed`,
  )
  addCheck(
    checks,
    markdown.includes('Mutation boundary: report-only audit') &&
      markdown.includes('Routed P0/P1 Findings') &&
      markdown.includes('High-Risk Review Packets') &&
      markdown.includes('Deep senior review executed through the approved router'),
    'markdown report states scope, routing, high-risk packets, and executed review truth',
    FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID,
    closeoutKey: FOUNDATION_DEEP_MERGE_AUDIT_CLOSEOUT_KEY,
    mergeScope,
    reportPath: FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH,
    jsonPath: FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH,
    routeRows,
    checks,
    failed,
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation deep merge audit check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
