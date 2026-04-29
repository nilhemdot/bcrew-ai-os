#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

const requiredArgs = ['card', 'planApprovalRef', 'closeoutKey']

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function normalize(value) {
  return String(value || '').trim()
}

function buildArg(name, value) {
  return `--${name}=${value}`
}

function printUsage() {
  console.log('Usage:')
  console.log('  npm run process:foundation-ship -- --card=<CARD> --planApprovalRef=<APPROVAL_JSON> --closeoutKey=<CLOSEOUT_KEY> [--commitRef=HEAD]')
  console.log('')
  console.log('Runs, in order:')
  console.log('  1. npm run process:ship-check')
  console.log('  2. npm run process:fanout-check')
  console.log('  3. npm run process:post-ship-fanout')
  console.log('  4. npm run foundation:verify')
}

async function runStep(label, npmArgs) {
  console.log('')
  console.log(`== ${label} ==`)
  const { stdout, stderr } = await execFile('npm', npmArgs, {
    env: process.env,
    maxBuffer: 1024 * 1024 * 12,
  })
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const missing = requiredArgs.filter(key => !normalize(args[key]))
  const commitRef = normalize(args.commitRef) || 'HEAD'

  console.log('Foundation ship gate')
  console.log(`  Card: ${normalize(args.card) || 'missing'}`)
  console.log(`  Closeout: ${normalize(args.closeoutKey) || 'missing'}`)
  console.log(`  Approval: ${normalize(args.planApprovalRef) || 'missing'}`)
  console.log(`  Commit ref: ${commitRef}`)

  if (missing.length) {
    console.error('')
    console.error(`Refusing to run ship gates. Missing required argument(s): ${missing.map(key => `--${key}`).join(', ')}`)
    printUsage()
    process.exitCode = 1
    return
  }

  const shipCheckArgs = [
    'run',
    'process:ship-check',
    '--',
    buildArg('card', args.card),
    buildArg('planApprovalRef', args.planApprovalRef),
    buildArg('closeoutKey', args.closeoutKey),
  ]
  if (normalize(args.baseUrl)) shipCheckArgs.push(buildArg('baseUrl', args.baseUrl))
  if (normalize(args.skipLiveVerifyReason)) {
    shipCheckArgs.push('--skipLiveVerify=true', buildArg('skipLiveVerifyReason', args.skipLiveVerifyReason))
  }
  if (normalize(args.emergencyBypassReason)) {
    shipCheckArgs.push(buildArg('emergencyBypassReason', args.emergencyBypassReason))
  }

  await runStep('process:ship-check', shipCheckArgs)
  await runStep('process:fanout-check', [
    'run',
    'process:fanout-check',
    '--',
    buildArg('card', args.card),
    buildArg('closeoutKey', args.closeoutKey),
  ])
  await runStep('process:post-ship-fanout', [
    'run',
    'process:post-ship-fanout',
    '--',
    buildArg('card', args.card),
    buildArg('closeoutKey', args.closeoutKey),
    buildArg('commitRef', commitRef),
  ])
  await runStep('foundation:verify', ['run', 'foundation:verify'])

  console.log('')
  console.log('Foundation ship gate passed.')
}

main().catch(error => {
  console.error('')
  console.error('Foundation ship gate failed.')
  if (error?.stdout) process.stdout.write(error.stdout)
  if (error?.stderr) process.stderr.write(error.stderr)
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
