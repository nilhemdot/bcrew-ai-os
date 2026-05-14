#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

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

function parseProfile(output) {
  const line = String(output || '').split('\n').find(item => item.startsWith('FOUNDATION_VERIFY_PROFILE '))
  if (!line) return null
  try {
    return JSON.parse(line.replace('FOUNDATION_VERIFY_PROFILE ', ''))
  } catch {
    return null
  }
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const startedAt = Date.now()
  const findings = []

  let output = ''
  try {
    const result = await execFile('node', ['--env-file-if-exists=.env', 'scripts/foundation-verify.mjs', '--profile=true'], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 20,
    })
    output = `${result.stdout || ''}${result.stderr || ''}`
  } catch (error) {
    output = `${error?.stdout || ''}${error?.stderr || ''}`
    throw new Error(`profiled foundation:verify failed before profile proof could pass: ${output.split('\n').slice(-12).join(' | ')}`)
  }

  const profile = parseProfile(output)
  const slowestLabels = (profile?.slowestSections || []).map(section => section.label)
  addFinding(findings, Boolean(profile), 'foundation:verify emits machine-readable profile output', 'FOUNDATION_VERIFY_PROFILE line')
  addFinding(findings, Number(profile?.totalMs) > 0, 'profile records total runtime', `${Math.round(profile?.totalMs || 0)}ms`)
  addFinding(findings, Number(profile?.sectionCount) >= 5, 'profile records named section timings', `sections=${profile?.sectionCount || 0}`)
  addFinding(
    findings,
    slowestLabels.some(label => label.startsWith('fetch:/api/foundation-hub?view=full')) ||
      slowestLabels.some(label => label.startsWith('health:')),
    'profile exposes full Foundation Hub fetch or health-script timing',
    slowestLabels.slice(0, 8).join(', '),
  )
  addFinding(
    findings,
    output.includes('Foundation verification passed.'),
    'profile command runs the real verifier and does not skip checks',
    output.split('\n').filter(line => line.includes('Summary')).slice(-1)[0] || 'missing summary',
  )

  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: 'FOUNDATION-VERIFY-TIMING-001',
    durationMs: Date.now() - startedAt,
    profile,
    findings,
  }

  if (jsonMode) console.log(JSON.stringify(summary, null, 2))
  else {
    console.log(`Foundation verify profile check: ${summary.status}`)
    console.log(`  Duration: ${Math.round(summary.durationMs / 1000)}s`)
    console.log(`  Sections: ${profile?.sectionCount || 0}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  const args = parseArgs()
  if (boolArg(args.json)) {
    console.log(JSON.stringify({
      ok: false,
      status: 'error',
      cardId: 'FOUNDATION-VERIFY-TIMING-001',
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exitCode = 1
})
