#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const ALLOWLIST = Object.freeze([
  {
    label: 'nightly deep audit report',
    pattern: /^docs\/handoffs\/nightly-deep-audit-\d{4}-\d{2}-\d{2}\.(?:json|md)$/,
  },
  {
    label: 'system health report',
    pattern: /^docs\/handoffs\/system-health-\d{4}-\d{2}-\d{2}\.(?:json|md)$/,
  },
  {
    label: 'YouTube deep visual source note',
    pattern: /^docs\/source-notes\/youtube-deep-visual-review-\d{14}\.md$/,
  },
])

const PROTECTED_REPORT_PATTERN = /^docs\/handoffs\//

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return {
    json: args.json === true || args.json === 'true',
    apply: args.apply === true || args.apply === 'true',
    push: args.push !== 'false' && args.noPush !== true && args['no-push'] !== true,
    selfTest: args.selfTest === true || args['self-test'] === true,
  }
}

function normalizePath(value = '') {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function allowedArtifact(filePath = '') {
  const normalized = normalizePath(filePath)
  return ALLOWLIST.find(entry => entry.pattern.test(normalized)) || null
}

function parseStatusLine(line = '') {
  const status = line.slice(0, 2)
  const filePath = normalizePath(line.slice(3))
  return {
    status,
    filePath,
    tracked: status !== '??',
    deleted: status.includes('D'),
    renamed: status.includes('R') || filePath.includes(' -> '),
    allowed: Boolean(allowedArtifact(filePath)),
    allowlistLabel: allowedArtifact(filePath)?.label || '',
  }
}

async function git(args = [], { allowFailure = false, trim = true } = {}) {
  try {
    const { stdout, stderr } = await execFile('git', args, {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 16,
    })
    return {
      ok: true,
      stdout: trim ? String(stdout || '').trim() : String(stdout || ''),
      stderr: trim ? String(stderr || '').trim() : String(stderr || ''),
    }
  } catch (error) {
    if (!allowFailure) throw error
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
      exitCode: error.code || 1,
    }
  }
}

async function runCommand(command, args = [], { allowFailure = false } = {}) {
  try {
    const { stdout, stderr } = await execFile(command, args, {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 64,
    })
    return { ok: true, stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() }
  } catch (error) {
    if (!allowFailure) throw error
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
      exitCode: error.code || 1,
    }
  }
}

async function getStatusRows() {
  const status = await git(['status', '--porcelain=v1'], { trim: false })
  return status.stdout
    ? status.stdout.split('\n').filter(Boolean).map(parseStatusLine).filter(row => row.filePath)
    : []
}

async function assertJsonArtifactsParse(rows = []) {
  const jsonRows = rows.filter(row => row.filePath.endsWith('.json'))
  const failures = []
  for (const row of jsonRows) {
    try {
      JSON.parse(await fs.readFile(path.join(repoRoot, row.filePath), 'utf8'))
    } catch (error) {
      failures.push({ filePath: row.filePath, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return failures
}

async function buildCloseoutStatus() {
  const rows = await getStatusRows()
  const allowedRows = rows.filter(row => row.allowed && !row.deleted && !row.renamed)
  const blockedRows = rows.filter(row => !row.allowed || row.deleted || row.renamed)
  const jsonFailures = await assertJsonArtifactsParse(allowedRows)
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const head = await git(['rev-parse', 'HEAD'])
  const originMain = await git(['rev-parse', 'origin/main'], { allowFailure: true })
  const branchOk = branch.stdout === 'main'
  const originKnown = originMain.ok && /^[0-9a-f]{40}$/i.test(originMain.stdout)
  const synced = originKnown && head.stdout === originMain.stdout
  const ok = blockedRows.length === 0 && jsonFailures.length === 0 && branchOk && synced
  return {
    ok,
    status: ok ? (allowedRows.length ? 'ready_to_closeout' : 'clean') : 'blocked',
    branch: branch.stdout,
    branchOk,
    head: head.stdout,
    originMain: originMain.stdout || null,
    synced,
    dirtyCount: rows.length,
    allowedCount: allowedRows.length,
    blockedCount: blockedRows.length,
    jsonFailureCount: jsonFailures.length,
    allowedArtifacts: allowedRows.map(row => ({
      filePath: row.filePath,
      status: row.status.trim() || 'modified',
      type: row.allowlistLabel,
    })),
    blockedRows: blockedRows.map(row => ({
      filePath: row.filePath,
      status: row.status.trim() || 'modified',
      reason: row.deleted
        ? 'deletion is not auto-closed'
        : row.renamed
          ? 'rename is not auto-closed'
          : 'not an allowlisted generated report artifact',
    })),
    jsonFailures,
  }
}

async function applyCloseout({ push = true } = {}) {
  const before = await buildCloseoutStatus()
  if (!before.ok) {
    return {
      ok: false,
      status: 'blocked',
      before,
      applied: false,
      reason: 'Worktree contains non-allowlisted changes, invalid generated JSON, wrong branch, or unsynced main.',
    }
  }
  if (!before.allowedArtifacts.length) {
    return {
      ok: true,
      status: 'clean',
      before,
      applied: false,
      reason: 'No generated artifacts need closeout.',
    }
  }

  const files = before.allowedArtifacts.map(row => row.filePath)
  await git(['add', '--', ...files])
  const diffCheck = await git(['diff', '--cached', '--check'], { allowFailure: true })
  if (!diffCheck.ok) {
    return {
      ok: false,
      status: 'blocked',
      before,
      applied: false,
      reason: diffCheck.stderr || diffCheck.stdout || 'git diff --cached --check failed',
    }
  }

  const protectedFiles = files.filter(file => PROTECTED_REPORT_PATTERN.test(file))
  const stamp = new Date().toISOString().slice(0, 10)
  const commit = await git(['commit', '-m', `Close generated report artifacts ${stamp}`], { allowFailure: true })
  if (!commit.ok) {
    return {
      ok: false,
      status: 'blocked',
      before,
      applied: false,
      reason: commit.stderr || commit.stdout || 'git commit failed',
    }
  }

  const head = await git(['rev-parse', '--short', 'HEAD'])
  let proof = null
  if (protectedFiles.length) {
    proof = await runCommand('npm', ['run', 'process:verify-gate-tiering-check', '--', '--recordProof=true'], { allowFailure: true })
    if (!proof.ok) {
      return {
        ok: false,
        status: 'blocked_after_commit',
        before,
        applied: true,
        pushed: false,
        commit: head.stdout,
        reason: proof.stderr || proof.stdout || 'focused proof failed after generated artifact commit',
      }
    }
  }

  let pushResult = null
  if (push) {
    pushResult = await git(['push'], { allowFailure: true })
    if (!pushResult.ok) {
      return {
        ok: false,
        status: 'blocked_after_commit',
        before,
        applied: true,
        pushed: false,
        commit: head.stdout,
        reason: pushResult.stderr || pushResult.stdout || 'git push failed',
      }
    }
  }

  const after = await buildCloseoutStatus()
  return {
    ok: after.dirtyCount === 0,
    status: after.dirtyCount === 0 ? 'closed' : 'blocked_after_commit',
    before,
    after,
    applied: true,
    pushed: Boolean(push),
    commit: head.stdout,
    protectedFiles,
    proofRecorded: Boolean(proof),
  }
}

function buildSelfTest() {
  const samples = [
    ['docs/handoffs/nightly-deep-audit-2026-05-30.json', true],
    ['docs/handoffs/nightly-deep-audit-2026-05-30.md', true],
    ['docs/handoffs/system-health-2026-05-30.json', true],
    ['docs/source-notes/youtube-deep-visual-review-20260530110600.md', true],
    ['docs/source-notes/other-note.md', false],
    ['scripts/process-audit-finding-to-backlog-router-check.mjs', false],
    ['memory/2026-05-30.md', false],
  ]
  const checks = samples.map(([filePath, expected]) => ({
    ok: Boolean(allowedArtifact(filePath)) === expected,
    filePath,
    expected,
    actual: Boolean(allowedArtifact(filePath)),
  }))
  checks.push({
    ok: parseStatusLine(' D docs/handoffs/system-health-2026-05-30.md').deleted === true,
    filePath: 'deleted generated artifact fixture',
    expected: true,
    actual: parseStatusLine(' D docs/handoffs/system-health-2026-05-30.md').deleted,
  })
  return {
    ok: checks.every(check => check.ok),
    status: checks.every(check => check.ok) ? 'healthy' : 'blocked',
    checks,
  }
}

async function main() {
  const args = parseArgs()
  const result = args.selfTest
    ? buildSelfTest()
    : args.apply
      ? await applyCloseout({ push: args.push })
      : await buildCloseoutStatus()

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Generated artifact closeout: ${result.status}`)
    if (result.reason) console.log(result.reason)
    const artifacts = result.allowedArtifacts || result.before?.allowedArtifacts || []
    for (const artifact of artifacts) console.log(`- ${artifact.filePath}`)
  }
  if (!result.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
