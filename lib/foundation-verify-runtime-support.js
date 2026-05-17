import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'
import process from 'node:process'
import {
  buildDoctrinePropagationStatus,
  buildGeneratedDoctrineSection,
} from './doctrine-propagation.js'
import {
  buildFoundationVerifySlowSectionRows,
  getFoundationVerifySlowSectionBudgetMs,
} from './foundation-verify-profile-budget.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const repoRoot = path.resolve(__dirname, '..')

const foundationVerifyTimings = []

export function parseFoundationVerifyArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

export function line(label, value = '') {
  console.log(value ? `${label}: ${value}` : label)
}

export function recordFoundationVerifyTiming(label, startedAt, metadata = {}) {
  foundationVerifyTimings.push({
    label,
    durationMs: Date.now() - startedAt,
    ...metadata,
  })
}

export function buildFoundationVerifyTimingProfile(totalStartedAt) {
  const totalMs = Date.now() - totalStartedAt
  const sections = [...foundationVerifyTimings]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 15)
  const slowSectionBudgetMs = getFoundationVerifySlowSectionBudgetMs()
  const overBudgetSections = buildFoundationVerifySlowSectionRows(foundationVerifyTimings, {
    budgetMs: slowSectionBudgetMs,
  })
  return {
    totalMs,
    sectionCount: foundationVerifyTimings.length,
    slowSectionBudgetMs,
    slowestSections: sections,
    overBudgetSections,
  }
}

export function printFoundationVerifyTimingProfile(profile) {
  const sections = profile?.slowestSections || []
  const overBudgetSections = profile?.overBudgetSections || []
  console.log('')
  line('Foundation verify timing profile', `${Math.round(profile.totalMs)}ms total / ${profile.sectionCount} sections`)
  for (const section of sections) {
    line(`  ${section.label}`, `${Math.round(section.durationMs)}ms`)
  }
  if (overBudgetSections.length) {
    line('  Over budget sections', overBudgetSections.map(section => `${section.label} ${Math.round(section.durationMs)}ms owner=${section.owner}`).join(' | '))
  }
  console.log(`FOUNDATION_VERIFY_PROFILE ${JSON.stringify(profile)}`)
}

export async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

export async function fetchJson(baseUrl, pathname) {
  const startedAt = Date.now()
  try {
    const response = await fetch(new URL(pathname, baseUrl))
    if (!response.ok) {
      throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
    }
    return response.json()
  } finally {
    recordFoundationVerifyTiming(`fetch:${pathname}`, startedAt)
  }
}

export async function fetchTextResponse(baseUrl, pathname, options = {}) {
  const response = await fetch(new URL(pathname, baseUrl), options)
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  }
}

export async function fetchTextResponseWithHostHeader(baseUrl, pathname, hostHeader) {
  const url = new URL(pathname, baseUrl)
  const client = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const request = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        Host: hostHeader,
      },
    }, response => {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          text: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    request.on('error', reject)
    request.end()
  })
}

export async function runHealthScript(scriptName) {
  const startedAt = Date.now()
  try {
    const { stdout, stderr } = await execFile('npm', ['run', '-s', scriptName], {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
    })
    return (stdout || stderr).trim()
  } finally {
    recordFoundationVerifyTiming(`health:${scriptName}`, startedAt)
  }
}

export async function runHealthScriptSafe(scriptName) {
  try {
    const output = await runHealthScript(scriptName)
    return { ok: true, output }
  } catch (error) {
    return {
      ok: false,
      output: [
        error?.stdout,
        error?.stderr,
        error instanceof Error ? error.message : String(error),
      ].filter(Boolean).join('\n').trim(),
    }
  }
}

export async function runHealthScriptWithArgs(scriptName, args = []) {
  const startedAt = Date.now()
  try {
    const { stdout, stderr } = await execFile('npm', ['run', '-s', scriptName, '--', ...args], {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
    })
    return (stdout || stderr).trim()
  } finally {
    recordFoundationVerifyTiming(`health:${scriptName} ${args.join(' ')}`.trim(), startedAt)
  }
}

export async function getCurrentRepoHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 64,
  })
  return String(stdout || '').trim().toLowerCase()
}

export async function getLaunchAgentStatus(label) {
  try {
    const { stdout } = await execFile('launchctl', ['list'], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    })
    const line = String(stdout || '').split(/\r?\n/).find(item => item.includes(label)) || ''
    if (!line) return { ok: false, pid: null, status: null, line: '', error: `LaunchAgent ${label} was not listed.` }
    const [pidRaw, statusRaw] = line.trim().split(/\s+/)
    const pid = /^\d+$/.test(pidRaw) ? Number(pidRaw) : null
    return { ok: Boolean(pid), pid, status: statusRaw || null, line, error: pid ? '' : `LaunchAgent ${label} is listed but has no running pid.` }
  } catch (error) {
    return {
      ok: false,
      pid: null,
      status: null,
      line: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function repoFileExists(relativePath) {
  const normalized = String(relativePath || '').trim()
  if (!normalized || normalized.includes('..')) return false
  const absolutePath = path.resolve(repoRoot, normalized)
  if (!absolutePath.startsWith(repoRoot)) return false
  try {
    const stat = await fs.stat(absolutePath)
    return stat.isFile()
  } catch {
    return false
  }
}

export async function verifyPrivateMemorySyntheticProbe() {
  const token = 'WAVE_CLEANUP_B_PRIVATE_MEMORY_SHOULD_NOT_LEAK'
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bcrew-private-memory-probe-'))
  try {
    await fs.mkdir(path.join(tmpRoot, 'memory'), { recursive: true })
    await fs.mkdir(path.join(tmpRoot, 'docs/users'), { recursive: true })
    await fs.mkdir(path.join(tmpRoot, 'docs/agents'), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, 'MEMORY.md'), token, 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'memory/2026-04-29.md'), token, 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'SOUL.md'), 'Be helpful and resourceful. Keep private context respectful.\n', 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'docs/users/steve.md'), 'This is the visible Foundation profile, not local `USER.md`. It carries system-facing preferences and shared Foundation operating expectations.\n', 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'docs/agents/harlan.md'), 'Personal agent. Owner: Steve. Harlan is not the whole BCrew AI OS and not the system orchestrator. Update Trigger: permissions.\n', 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'docs/agents/crewbert.md'), 'System agent. Owner: BCrew AI OS. Crewbert is separate from Harlan and system infrastructure. Update Trigger: permission.\n', 'utf8')
    await fs.writeFile(path.join(tmpRoot, 'docs/agents/personal-agent-onboarding.md'), 'Private-context boundaries, approval boundaries, private profile not committed into this repo, one nugget per day maximum, source-backed.\n', 'utf8')
    const skillPath = path.join(tmpRoot, 'skill.md')
    await fs.writeFile(skillPath, buildGeneratedDoctrineSection({ generatedAt: '2026-04-29T00:00:00.000Z' }), 'utf8')
    const status = await buildDoctrinePropagationStatus({
      repoRoot: tmpRoot,
      skillPath,
      includeSynthetic: false,
    })
    const serialized = JSON.stringify(status)
    return {
      ok: !serialized.includes(token) &&
        status.privateMemorySignalMode === 'metadata-only' &&
        status.summary?.privateMemoryContentCopied === false &&
        (status.privateMemoryStats || []).every(item => item.contentMode === 'metadata-only' && item.contentCopied === false),
      detail: `${status.privateMemoryStats?.filter(item => item.exists).length || 0} synthetic private files / token copied=${serialized.includes(token)}`,
    }
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {})
  }
}

export async function verifyProcessFoundationShipRefusesMissingArgs() {
  try {
    await execFile('node', ['scripts/process-foundation-ship.mjs'], {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 256,
    })
    return { ok: false, detail: 'malformed invocation unexpectedly passed' }
  } catch (error) {
    const output = `${error?.stdout || ''}${error?.stderr || ''}`
    return {
      ok: /Missing required argument\(s\)/.test(output) &&
        !output.includes('== process:ship-check ==') &&
        !output.includes('== process:fanout-check ==') &&
        !output.includes('== process:post-ship-fanout =='),
      detail: output.split('\n').filter(Boolean).slice(0, 4).join(' | '),
    }
  }
}

async function collectCodeFiles(directory) {
  const fullDirectory = path.join(repoRoot, directory)
  const entries = await fs.readdir(fullDirectory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectCodeFiles(relativePath))
      continue
    }
    if (/\.(mjs|js)$/.test(entry.name)) files.push(relativePath)
  }
  return files
}

const directModelHostPatterns = [
  'https://api.openai.com',
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
]

const allowedDirectModelHostFiles = new Set([
  'lib/llm-router.js',
])

const allowedDirectModelHostAuditFiles = new Set([
  'scripts/foundation-verify.mjs',
  'lib/foundation-verify-runtime-support.js',
])

export function evaluateDirectModelHostUsageFixture({ relativePath = '', text = '' } = {}) {
  if (allowedDirectModelHostFiles.has(relativePath) || allowedDirectModelHostAuditFiles.has(relativePath)) {
    return { ok: true, offenders: [] }
  }
  const matchedHosts = directModelHostPatterns.filter(host => String(text || '').includes(host))
  const offenders = matchedHosts.length ? [`${relativePath} (${matchedHosts.join(', ')})`] : []
  return { ok: offenders.length === 0, offenders }
}

export function buildFoundationVerifyRuntimeSupportDogfoodProof() {
  const clean = evaluateDirectModelHostUsageFixture({
    relativePath: 'lib/clean.js',
    text: 'export const ok = true',
  })
  const allowedRouter = evaluateDirectModelHostUsageFixture({
    relativePath: 'lib/llm-router.js',
    text: "fetch('https://api.openai.com/v1/chat/completions')",
  })
  const rejected = evaluateDirectModelHostUsageFixture({
    relativePath: 'lib/unsafe-direct-model-call.js',
    text: "fetch('https://api.openai.com/v1/chat/completions')",
  })
  const ok = clean.ok && allowedRouter.ok && rejected.ok === false && rejected.offenders.length === 1
  return {
    ok,
    clean,
    allowedRouter,
    rejected,
    dogfoodInvariant: ok
      ? 'clean and adapter-owned host references pass; unsafe direct model host reference fails closed'
      : 'direct model host dogfood failed to reject an unsafe host reference',
  }
}

export async function auditDirectModelHostUsage() {
  const codeFiles = [
    ...await collectCodeFiles('lib'),
    ...await collectCodeFiles('scripts'),
  ]
  const offenders = []
  for (const relativePath of codeFiles) {
    const text = await readRepoFile(relativePath)
    const result = evaluateDirectModelHostUsageFixture({ relativePath, text })
    offenders.push(...result.offenders)
  }
  return offenders
}
