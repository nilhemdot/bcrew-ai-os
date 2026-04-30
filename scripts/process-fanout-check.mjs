#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const requiredCloseoutFields = [
  'whatChanged',
  'whatItDoes',
  'whyItMatters',
  'whereItLives',
  'proofCommands',
  'knownLimits',
  'reviewNext',
]

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeCommandName(value) {
  return normalizeText(value)
    .replace(/^npm\s+run\s+/, '')
    .replace(/\s+--.*$/, '')
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function fileExists(relativePath) {
  if (!relativePath || relativePath.includes('..')) return false
  try {
    const absolutePath = path.resolve(repoRoot, relativePath)
    if (!absolutePath.startsWith(repoRoot)) return false
    const stat = await fs.stat(absolutePath)
    return stat.isFile()
  } catch {
    return false
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(repoRoot, relativePath), 'utf8'))
}

async function getRepoHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 64,
  })
  return normalizeText(stdout).toLowerCase()
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

function closeoutHasField(closeout, field) {
  const value = closeout?.[field]
  if (Array.isArray(value)) return value.length > 0 && value.every(item => normalizeText(item))
  return normalizeText(value).length > 0
}

function extractClaimedFilesFromText(text) {
  const claims = new Set()
  const pattern = /\b(?:scripts|docs|lib|public)\/[A-Za-z0-9._/-]+\.(?:mjs|js|md|html|css|json)\b/g
  for (const match of String(text || '').matchAll(pattern)) {
    claims.add(match[0])
  }
  return Array.from(claims)
}

function extractClaimedNpmScriptsFromText(text) {
  const claims = new Set()
  const scriptPattern = /(?:npm run\s+)?\b([a-z][a-z0-9:-]+)\b/g
  for (const match of String(text || '').matchAll(scriptPattern)) {
    const value = normalizeCommandName(match[1])
    if (!value.includes(':')) continue
    if (/^(http|https|localhost(?::\d+)?|source|status|route|strategy|foundation|runtime|recent|build|proof|process)$/i.test(value)) continue
    claims.add(value)
  }
  return Array.from(claims)
}

function closeoutText(closeout) {
  return [
    closeout?.whatChanged,
    closeout?.whatItDoes,
    closeout?.whyItMatters,
    ...(closeout?.whereItLives || []),
    ...(closeout?.proofCommands || []),
    closeout?.proofStatus,
    closeout?.reviewNext,
    ...(closeout?.knownLimits || []),
  ].filter(Boolean).join('\n')
}

function cardText(card) {
  return [
    card?.title,
    card?.summary,
    card?.whyItMatters,
    card?.nextAction,
    card?.statusNote,
    card?.source,
  ].filter(Boolean).join('\n')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cardId = normalizeText(args.card)
  const closeoutKey = normalizeText(args.closeoutKey)
  const baseUrl = normalizeText(args.baseUrl) || 'http://localhost:3000'
  const checks = []

  console.log('Process fanout check')
  console.log(`  Card: ${cardId || 'missing'}`)
  console.log(`  Closeout: ${closeoutKey || 'missing'}`)

  ensure(checks, cardId, 'card argument is present', cardId || 'missing --card')
  ensure(checks, closeoutKey, 'closeout key argument is present', closeoutKey || 'missing --closeoutKey')

  await assertFoundationDbReadyForReadOnlyGate('process:fanout-check')
  const foundation = await getFoundationSnapshot()
  const card = (foundation.backlogItems || []).find(item => item.id === cardId) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === closeoutKey) || null
  const packageJson = await readJson('package.json')
  const scripts = packageJson.scripts || {}
  const repoHead = await getRepoHead()
  const foundationHub = await fetchJson(baseUrl, '/api/foundation-hub')
  const foundationBuildLog = await fetchJson(baseUrl, '/api/foundation/build-log?limit=60')

  ensure(checks, Boolean(card), 'backlog card exists', card ? `${card.id} / ${card.lane}` : 'missing card')
  ensure(checks, card?.lane === 'done', 'target card is done', card ? card.lane : 'missing card')
  ensure(checks, Boolean(closeout), 'closeout record exists', closeoutKey || 'missing closeout key')
  for (const field of requiredCloseoutFields) {
    ensure(checks, closeoutHasField(closeout, field), `closeout has ${field}`, closeout?.[field] ? 'present' : 'missing')
  }
  ensure(checks, (closeout?.backlogIds || []).includes(cardId), 'closeout links target card', (closeout?.backlogIds || []).join(', ') || 'missing')

  const textToAudit = [cardText(card), closeoutText(closeout)].join('\n')
  const claimedFiles = extractClaimedFilesFromText(textToAudit)
  const missingFiles = []
  for (const relativePath of claimedFiles) {
    if (!await fileExists(relativePath)) missingFiles.push(relativePath)
  }
  ensure(
    checks,
    missingFiles.length === 0,
    'claimed files and docs exist',
    missingFiles.length ? `missing ${missingFiles.join(', ')}` : claimedFiles.join(', ') || 'no file claims',
  )

  const claimedScripts = extractClaimedNpmScriptsFromText(textToAudit)
  const missingScripts = claimedScripts.filter(scriptName => !scripts[scriptName])
  ensure(
    checks,
    missingScripts.length === 0,
    'claimed npm scripts exist',
    missingScripts.length ? `missing ${missingScripts.join(', ')}` : claimedScripts.join(', ') || 'no script claims',
  )

  const runningCommit = normalizeText(foundationHub.runtimeSupervisor?.servedCode?.runningCommit).toLowerCase()
  const runningShort = normalizeText(foundationHub.runtimeSupervisor?.servedCode?.runningShortCommit) || runningCommit.slice(0, 7)
  ensure(
    checks,
    runningCommit && runningCommit === repoHead,
    'dashboard served commit matches repo HEAD',
    runningCommit ? `served=${runningShort} head=${repoHead.slice(0, 7)}` : 'missing served-code metadata',
  )

  const build = (foundationBuildLog.builds || []).find(item => item.closeoutKey === closeoutKey) || null
  ensure(
    checks,
    Boolean(build),
    'Recent Builds exposes this closeout',
    build ? `${build.shortSha} / ${build.acceptanceState}` : 'missing build log entry',
  )
  ensure(
    checks,
    Boolean(build?.proofCommands?.some(command => command.includes('foundation:verify'))),
    'Recent Builds carries verifier proof command',
    (build?.proofCommands || []).join(' | ') || 'missing proof commands',
  )
  ensure(
    checks,
    Boolean(build?.whereItLives?.length),
    'Recent Builds says where the change lives',
    (build?.whereItLives || []).join(', ') || 'missing whereItLives',
  )

  const closeoutCommands = closeout?.proofCommands || []
  ensure(
    checks,
    closeoutCommands.some(command => command.includes('process:fanout-check')),
    'closeout includes process:fanout-check proof',
    closeoutCommands.join(' | ') || 'missing proof commands',
  )
  ensure(
    checks,
    closeoutCommands.some(command => command.includes('process:ship-check')),
    'closeout includes process:ship-check proof',
    closeoutCommands.join(' | ') || 'missing proof commands',
  )
  ensure(
    checks,
    closeoutCommands.some(command => command.includes('foundation:verify')),
    'closeout includes foundation:verify proof',
    closeoutCommands.join(' | ') || 'missing proof commands',
  )

  console.log('')
  for (const check of checks) {
    const prefix = check.ok ? 'PASS' : 'FAIL'
    console.log(`${prefix} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  const failed = checks.filter(check => !check.ok)
  console.log('')
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Process fanout check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
