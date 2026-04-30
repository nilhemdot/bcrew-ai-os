#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  classifyFoundationGateError,
  formatFoundationGateRetryMessage,
  sleep,
} from '../lib/foundation-gate-reliability.js'
import { recordFoundationShipProof } from '../lib/process-git-hooks.js'

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

function formatDuration(ms) {
  const seconds = Math.round(ms / 100) / 10
  return `${seconds}s`
}

function printStepResult(result) {
  console.log('')
  console.log(`== ${result.label} ==`)
  console.log(`Duration: ${formatDuration(result.durationMs)}`)
  if (result.attempts > 1) console.log(`Attempts: ${result.attempts}`)
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
}

async function runStep(label, npmArgs, options = {}) {
  const startedAt = Date.now()
  const retries = Number(options.retries ?? 1)
  let stdoutBuffer = ''
  let stderrBuffer = ''
  let attempt = 0
  while (attempt <= retries) {
    attempt += 1
    try {
      const { stdout, stderr } = await execFile('npm', npmArgs, {
        env: process.env,
        maxBuffer: 1024 * 1024 * 12,
      })
      return {
        label,
        stdout: stdoutBuffer + (stdout || ''),
        stderr: stderrBuffer + (stderr || ''),
        durationMs: Date.now() - startedAt,
        attempts: attempt,
      }
    } catch (error) {
      stdoutBuffer += error?.stdout || ''
      stderrBuffer += error?.stderr || ''
      const diagnostic = classifyFoundationGateError(error)
      if (attempt <= retries && diagnostic.transient) {
        stderrBuffer += `\n${formatFoundationGateRetryMessage(label, {
          label,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts: retries + 1,
          error,
          diagnostic,
        })}\n`
        await sleep(1500 * attempt)
        continue
      }
      error.stdout = stdoutBuffer
      error.stderr = stderrBuffer
      error.durationMs = Date.now() - startedAt
      error.attempts = attempt
      throw error
    }
  }
}

async function runParallelSteps(steps) {
  const settled = await Promise.allSettled(steps.map(step => runStep(step.label, step.npmArgs)))
  const results = []
  const failures = []
  for (let index = 0; index < settled.length; index += 1) {
    const outcome = settled[index]
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value)
    } else {
      const error = outcome.reason
      failures.push({ label: steps[index].label, error })
      results.push({
        label: steps[index].label,
        stdout: error?.stdout || '',
        stderr: error?.stderr || '',
        durationMs: error?.durationMs || 0,
        attempts: error?.attempts || 1,
      })
    }
  }
  for (const result of results) printStepResult(result)
  if (failures.length) {
    const labels = failures.map(item => item.label).join(', ')
    throw new Error(`Parallel gate step(s) failed: ${labels}`)
  }
  return results
}

async function runSequentialSteps(steps) {
  const results = []
  for (const step of steps) {
    const result = await runStep(step.label, step.npmArgs)
    printStepResult(result)
    results.push(result)
  }
  return results
}

async function main() {
  const gateStartedAt = Date.now()
  const args = parseArgs(process.argv.slice(2))
  const missing = requiredArgs.filter(key => !normalize(args[key]))
  const commitRef = normalize(args.commitRef) || 'HEAD'
  const strictShipCheckVerify = args.strictShipCheckVerify === true || args.strictShipCheckVerify === 'true'
  const parallelFanout = args.parallelFanout === true || args.parallelFanout === 'true'
  const targetMs = Number(args.targetMs || 300000)

  console.log('Foundation ship gate')
  console.log(`  Card: ${normalize(args.card) || 'missing'}`)
  console.log(`  Closeout: ${normalize(args.closeoutKey) || 'missing'}`)
  console.log(`  Approval: ${normalize(args.planApprovalRef) || 'missing'}`)
  console.log(`  Commit ref: ${commitRef}`)
  console.log(`  Fanout mode: ${parallelFanout ? 'parallel' : 'sequential'}`)

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
  if (!strictShipCheckVerify && !normalize(args.skipLiveVerifyReason)) {
    shipCheckArgs.push(
      '--skipLiveVerify=true',
      buildArg('skipLiveVerifyReason', 'process:foundation-ship runs final foundation:verify once after fanout gates'),
    )
  }

  const timing = []
  const shipCheck = await runStep('process:ship-check', shipCheckArgs, { retries: 1 })
  printStepResult(shipCheck)
  timing.push(shipCheck)

  const fanoutSteps = [
    {
      label: 'process:fanout-check',
      npmArgs: [
        'run',
        'process:fanout-check',
        '--',
        buildArg('card', args.card),
        buildArg('closeoutKey', args.closeoutKey),
      ],
    },
    {
      label: 'process:post-ship-fanout',
      npmArgs: [
        'run',
        'process:post-ship-fanout',
        '--',
        buildArg('card', args.card),
        buildArg('closeoutKey', args.closeoutKey),
        buildArg('commitRef', commitRef),
      ],
    },
  ]
  const fanoutResults = parallelFanout
    ? await runParallelSteps(fanoutSteps)
    : await runSequentialSteps(fanoutSteps)
  timing.push(...fanoutResults)

  const foundationVerify = await runStep('foundation:verify', ['run', 'foundation:verify'], { retries: 1 })
  printStepResult(foundationVerify)
  timing.push(foundationVerify)

  const totalMs = Date.now() - gateStartedAt
  console.log('')
  console.log('Gate timing summary')
  for (const result of timing) {
    console.log(`  ${result.label}: ${formatDuration(result.durationMs)}`)
  }
  console.log(`  total: ${formatDuration(totalMs)} / target ${formatDuration(targetMs)}`)
  if (Number.isFinite(targetMs) && totalMs > targetMs) {
    console.log('  status: above target; keep the ship result but profile the slow step before the next gate-performance pass.')
  } else {
    console.log('  status: within target')
  }

  const proof = await recordFoundationShipProof({
    repoRoot: process.cwd(),
    cardId: normalize(args.card),
    closeoutKey: normalize(args.closeoutKey),
    commitRef,
  })
  console.log(`  proof: recorded local Foundation ship proof for ${proof.shortSha} / ${proof.cardId}`)

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
