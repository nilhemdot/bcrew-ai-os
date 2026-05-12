import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  buildVerifyGateTieringSummary,
  classifyVerificationGateForFiles,
  VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
} from './process-verify-gate-tiering.js'

const execFile = promisify(execFileCallback)

export const GIT_HOOKS_PATH = '.githooks'
export const FOUNDATION_SHIP_PROOF_PATH = '.git/foundation-ship-proof.json'
export const FOUNDATION_FOCUSED_VERIFY_PROOF_PATH = '.git/foundation-focused-verify-proof.json'
export const PROTECTED_FOUNDATION_PATH_PATTERNS = [
  'docs/rebuild/**',
  'docs/process/**',
  'docs/audits/**',
  'docs/handoffs/**',
  'lib/foundation-*.js',
  'lib/doctrine-propagation.js',
  'lib/backlog-hygiene.js',
  'lib/process-*.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-*.mjs',
  'scripts/*backlog*.mjs',
  'scripts/*doctrine*.mjs',
  'package.json',
  'public/foundation*.html',
  'public/foundation*.js',
  'public/ops*.html',
  'public/ops*.js',
]

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function isZeroSha(value) {
  return /^0+$/.test(String(value || ''))
}

function isJavaScriptFile(filePath) {
  return /\.(mjs|js)$/i.test(filePath)
}

function isJsonFile(filePath) {
  return /\.json$/i.test(filePath)
}

export function isProtectedFoundationPath(filePath) {
  const normalized = normalizePath(filePath)
  if (!normalized) return false
  if (normalized.startsWith('docs/rebuild/')) return true
  if (normalized.startsWith('docs/process/')) return true
  if (normalized.startsWith('docs/audits/')) return true
  if (normalized.startsWith('docs/handoffs/')) return true
  if (/^lib\/foundation-[^/]*\.js$/.test(normalized)) return true
  if (normalized === 'lib/doctrine-propagation.js') return true
  if (normalized === 'lib/backlog-hygiene.js') return true
  if (/^lib\/process-[^/]*\.js$/.test(normalized)) return true
  if (normalized === 'scripts/foundation-verify.mjs') return true
  if (/^scripts\/process-[^/]*\.mjs$/.test(normalized)) return true
  if (/^scripts\/[^/]*backlog[^/]*\.mjs$/.test(normalized)) return true
  if (/^scripts\/[^/]*doctrine[^/]*\.mjs$/.test(normalized)) return true
  if (normalized === 'package.json') return true
  if (/^public\/foundation[^/]*\.(html|js)$/.test(normalized)) return true
  if (/^public\/ops[^/]*\.(html|js)$/.test(normalized)) return true
  return false
}

export function getProtectedFoundationChangedFiles(files = []) {
  return files.map(normalizePath).filter(isProtectedFoundationPath)
}

async function git(args, options = {}) {
  const { stdout } = await execFile('git', args, {
    cwd: options.repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4,
  })
  return String(stdout || '').trim()
}

async function getRepoHead(repoRoot) {
  return git(['rev-parse', 'HEAD'], { repoRoot })
}

async function getStagedFiles(repoRoot) {
  const output = await git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { repoRoot })
  return output ? output.split('\n').map(normalizePath).filter(Boolean) : []
}

async function getChangedFilesForPush(repoRoot, stdinText = '') {
  const files = new Set()
  const lines = String(stdinText || '').split('\n').map(line => line.trim()).filter(Boolean)
  for (const line of lines) {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/)
    if (!localSha || isZeroSha(localSha)) continue
    let baseSha = remoteSha
    if (!baseSha || isZeroSha(baseSha)) {
      try {
        baseSha = await git(['merge-base', localSha, remoteRef || '@{u}'], { repoRoot })
      } catch {
        baseSha = ''
      }
    }
    let diff = ''
    try {
      diff = baseSha
        ? await git(['diff', '--name-only', `${baseSha}..${localSha}`], { repoRoot })
        : await git(['diff-tree', '--no-commit-id', '--name-only', '-r', localSha], { repoRoot })
    } catch {
      diff = ''
    }
    diff.split('\n').map(normalizePath).filter(Boolean).forEach(file => files.add(file))
  }

  if (!files.size) {
    try {
      const upstream = await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { repoRoot })
      const base = await git(['merge-base', 'HEAD', upstream], { repoRoot })
      const diff = await git(['diff', '--name-only', `${base}..HEAD`], { repoRoot })
      diff.split('\n').map(normalizePath).filter(Boolean).forEach(file => files.add(file))
    } catch {
      const diff = await git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'], { repoRoot }).catch(() => '')
      diff.split('\n').map(normalizePath).filter(Boolean).forEach(file => files.add(file))
    }
  }
  return Array.from(files)
}

async function getChangedDiffsForPush(repoRoot, files = [], stdinText = '') {
  const normalizedFiles = getProtectedFoundationChangedFiles(files)
  const diffsByFile = {}
  if (!normalizedFiles.length) return diffsByFile

  async function appendDiff(rangeArgs = []) {
    for (const file of normalizedFiles) {
      const diff = await git(['diff', '--unified=0', ...rangeArgs, '--', file], { repoRoot }).catch(() => '')
      if (diff) diffsByFile[file] = [diffsByFile[file], diff].filter(Boolean).join('\n')
    }
  }

  const lines = String(stdinText || '').split('\n').map(line => line.trim()).filter(Boolean)
  for (const line of lines) {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/)
    if (!localRef || !localSha || isZeroSha(localSha)) continue
    let baseSha = remoteSha
    if (!baseSha || isZeroSha(baseSha)) {
      try {
        baseSha = await git(['merge-base', localSha, remoteRef || '@{u}'], { repoRoot })
      } catch {
        baseSha = ''
      }
    }
    if (baseSha) await appendDiff([`${baseSha}..${localSha}`])
  }

  if (!Object.keys(diffsByFile).length) {
    try {
      const upstream = await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { repoRoot })
      const base = await git(['merge-base', 'HEAD', upstream], { repoRoot })
      await appendDiff([`${base}..HEAD`])
    } catch {
      for (const file of normalizedFiles) {
        const diff = await git(['diff-tree', '--unified=0', '--no-commit-id', '-r', 'HEAD', '--', file], { repoRoot }).catch(() => '')
        if (diff) diffsByFile[file] = diff
      }
    }
  }

  return diffsByFile
}

async function nodeCheck(repoRoot, filePath) {
  await execFile('node', ['--check', filePath], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024,
  })
}

async function jsonCheck(repoRoot, filePath) {
  JSON.parse(await fs.readFile(path.join(repoRoot, filePath), 'utf8'))
}

async function readProofFile(repoRoot) {
  try {
    return JSON.parse(await fs.readFile(path.join(repoRoot, FOUNDATION_SHIP_PROOF_PATH), 'utf8'))
  } catch {
    return { proofs: [] }
  }
}

async function readFocusedProofFile(repoRoot) {
  try {
    return JSON.parse(await fs.readFile(path.join(repoRoot, FOUNDATION_FOCUSED_VERIFY_PROOF_PATH), 'utf8'))
  } catch {
    return { proofs: [] }
  }
}

async function appendBypassLog(repoRoot, entry) {
  const logPath = path.join(repoRoot, '.git/foundation-hook-bypass.log')
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

export async function recordFoundationShipProof({
  repoRoot,
  cardId,
  closeoutKey,
  commitRef = 'HEAD',
} = {}) {
  const root = repoRoot || process.cwd()
  const commitSha = await git(['rev-parse', commitRef], { repoRoot: root })
  const shortSha = await git(['rev-parse', '--short', commitRef], { repoRoot: root })
  const existing = await readProofFile(root)
  const proofs = Array.isArray(existing.proofs) ? existing.proofs : []
  const nextProof = {
    cardId,
    closeoutKey,
    commitSha,
    shortSha,
    passedAt: new Date().toISOString(),
    command: `npm run process:foundation-ship -- --card=${cardId} --closeoutKey=${closeoutKey} --commitRef=${commitRef}`,
  }
  const filtered = proofs.filter(proof =>
    !(proof.cardId === cardId && proof.closeoutKey === closeoutKey && proof.commitSha === commitSha)
  )
  const payload = {
    schemaVersion: 1,
    proofs: [...filtered, nextProof].slice(-50),
  }
  await fs.writeFile(path.join(root, FOUNDATION_SHIP_PROOF_PATH), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return nextProof
}

export async function recordFocusedVerificationProof({
  repoRoot,
  cardId,
  commitRef = 'HEAD',
  changedFiles = [],
  gateLevel = 'focused',
  commands = [VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND],
} = {}) {
  const root = repoRoot || process.cwd()
  const commitSha = await git(['rev-parse', commitRef], { repoRoot: root })
  const shortSha = await git(['rev-parse', '--short', commitRef], { repoRoot: root })
  const existing = await readFocusedProofFile(root)
  const proofs = Array.isArray(existing.proofs) ? existing.proofs : []
  const nextProof = {
    cardId: String(cardId || '').trim() || null,
    commitSha,
    shortSha,
    gateLevel,
    changedFiles: changedFiles.map(normalizePath).filter(Boolean),
    commands: Array.from(new Set(commands.map(command => String(command || '').trim()).filter(Boolean))),
    passedAt: new Date().toISOString(),
  }
  const filtered = proofs.filter(proof =>
    !(proof.cardId === nextProof.cardId && proof.commitSha === commitSha && proof.gateLevel === gateLevel)
  )
  const payload = {
    schemaVersion: 1,
    proofs: [...filtered, nextProof].slice(-50),
  }
  await fs.writeFile(path.join(root, FOUNDATION_FOCUSED_VERIFY_PROOF_PATH), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return nextProof
}

export async function runPreCommitHook({ repoRoot = process.cwd() } = {}) {
  const files = await getStagedFiles(repoRoot)
  const protectedFiles = getProtectedFoundationChangedFiles(files)
  const checked = []
  for (const file of protectedFiles) {
    if (isJavaScriptFile(file)) {
      await nodeCheck(repoRoot, file)
      checked.push(file)
    } else if (isJsonFile(file)) {
      await jsonCheck(repoRoot, file)
      checked.push(file)
    }
  }
  return {
    ok: true,
    mode: 'pre-commit',
    protectedFiles,
    checkedFiles: checked,
    message: 'Pre-commit ran lightweight static checks only.',
  }
}

export async function runPrePushHook({
  repoRoot = process.cwd(),
  stdinText = '',
  env = process.env,
} = {}) {
  const files = await getChangedFilesForPush(repoRoot, stdinText)
  const protectedFiles = getProtectedFoundationChangedFiles(files)
  if (!protectedFiles.length) {
    return {
      ok: true,
      mode: 'pre-push',
      protectedFiles,
      message: 'No protected Foundation paths changed.',
    }
  }

  const head = await getRepoHead(repoRoot)
  const proofFile = await readProofFile(repoRoot)
  const matchingProofs = (proofFile.proofs || []).filter(proof => proof.commitSha === head)
  if (matchingProofs.length) {
    return {
      ok: true,
      mode: 'pre-push',
      protectedFiles,
      proofCount: matchingProofs.length,
      message: `Found ${matchingProofs.length} Foundation ship proof record(s) for HEAD.`,
    }
  }

  const diffsByFile = await getChangedDiffsForPush(repoRoot, protectedFiles, stdinText)
  const gate = classifyVerificationGateForFiles(protectedFiles, { diffsByFile })
  if (!gate.fullVerifyRequired) {
    const focusedProofFile = await readFocusedProofFile(repoRoot)
    const matchingFocusedProofs = (focusedProofFile.proofs || []).filter(proof =>
      proof.commitSha === head &&
      proof.commands?.includes(VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND) &&
      proof.gateLevel === gate.level
    )
    if (matchingFocusedProofs.length) {
      return {
        ok: true,
        mode: 'pre-push',
        protectedFiles,
        focusedProofCount: matchingFocusedProofs.length,
        verificationGate: gate,
        message: `Found focused Foundation verification proof for HEAD. ${buildVerifyGateTieringSummary(gate)}`,
      }
    }
  }

  const bypassReason = String(env.FOUNDATION_HOOK_BYPASS_REASON || '').trim()
  const bypassCard = String(env.FOUNDATION_HOOK_BYPASS_CARD || '').trim()
  if (bypassReason && /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}$/.test(bypassCard)) {
    await appendBypassLog(repoRoot, {
      bypassedAt: new Date().toISOString(),
      head,
      protectedFiles,
      bypassReason,
      bypassCard,
    })
    return {
      ok: true,
      mode: 'pre-push',
      protectedFiles,
      bypass: true,
      verificationGate: gate,
      message: `Bypassed with reason and follow-up card ${bypassCard}.`,
    }
  }

  return {
    ok: false,
    mode: 'pre-push',
    protectedFiles,
    verificationGate: gate,
    message: gate.fullVerifyRequired
      ? `Protected Foundation paths require the full ship gate. ${buildVerifyGateTieringSummary(gate)}. Run process:foundation-ship for the ship, or set FOUNDATION_HOOK_BYPASS_REASON and FOUNDATION_HOOK_BYPASS_CARD for an explicit bypass.`
      : `Protected Foundation paths changed but no focused proof is recorded for HEAD. ${buildVerifyGateTieringSummary(gate)}. Run npm run process:verify-gate-tiering-check -- --recordProof=true, or set FOUNDATION_HOOK_BYPASS_REASON and FOUNDATION_HOOK_BYPASS_CARD for an explicit bypass.`,
  }
}

export async function buildGitHookInstallStatus({ repoRoot = process.cwd() } = {}) {
  let hooksPath = ''
  try {
    hooksPath = await git(['config', '--get', 'core.hooksPath'], { repoRoot })
  } catch {
    hooksPath = ''
  }
  const requiredFiles = ['pre-commit', 'pre-push']
  const files = []
  for (const name of requiredFiles) {
    const filePath = path.join(repoRoot, GIT_HOOKS_PATH, name)
    try {
      const stat = await fs.stat(filePath)
      files.push({
        name,
        exists: true,
        executable: Boolean(stat.mode & 0o111),
      })
    } catch {
      files.push({ name, exists: false, executable: false })
    }
  }
  return {
    hooksPath,
    expectedHooksPath: GIT_HOOKS_PATH,
    active: hooksPath === GIT_HOOKS_PATH,
    files,
    protectedPathPatterns: PROTECTED_FOUNDATION_PATH_PATTERNS,
    focusedProofPath: FOUNDATION_FOCUSED_VERIFY_PROOF_PATH,
    ok: hooksPath === GIT_HOOKS_PATH && files.every(file => file.exists && file.executable),
  }
}

export function buildSyntheticGitHookScopeProof() {
  const protectedSamples = [
    'docs/rebuild/current-plan.md',
    'docs/process/approvals/APPROVAL-FILE-INTEGRITY-001.json',
    'docs/audits/example.md',
    'docs/handoffs/example.md',
    'lib/foundation-build-log.js',
    'lib/doctrine-propagation.js',
    'lib/backlog-hygiene.js',
    'lib/process-example.js',
    'lib/process-verify-gate-tiering.js',
    'scripts/foundation-verify.mjs',
    'scripts/process-ship-check.mjs',
    'scripts/process-verify-gate-tiering-check.mjs',
    'scripts/backlog-hygiene.mjs',
    'scripts/doctrine-propagation-check.mjs',
    'package.json',
    'public/foundation.js',
    'public/foundation.html',
    'public/ops.js',
    'public/ops.html',
  ]
  const unprotectedSamples = [
    'docs/source-notes/example.md',
    'lib/source-contracts.js',
    'public/strategic-execution.js',
    'README.md',
  ]
  return {
    ok: protectedSamples.every(isProtectedFoundationPath) &&
      unprotectedSamples.every(file => !isProtectedFoundationPath(file)),
    protectedSamples,
    unprotectedSamples,
  }
}
