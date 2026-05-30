#!/usr/bin/env node

import process from 'node:process'
import {
  applyDecisionAutoEmitCandidates,
  buildDecisionAutoEmitSummary,
  scanDecisionAutoEmitCandidates,
} from '../lib/decision-auto-emit.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...parts] = arg.slice(2).split('=')
    result[key] = parts.length ? parts.join('=') : true
  }
  return result
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function normalizeText(value) {
  return String(value || '').trim()
}

function printCandidate(candidate, index) {
  console.log(`  ${index + 1}. ${candidate.title}`)
  console.log(`     Category: ${candidate.category}`)
  console.log(`     Status: proposed`)
  console.log(`     Source: ${candidate.sourceRef}`)
  console.log(`     Why found: ${candidate.evidenceNotes}`)
}

function printScan(scan, applyResult = null) {
  const summary = buildDecisionAutoEmitSummary(scan, applyResult)
  console.log('Decision auto-emit')
  console.log(`  Mode: ${summary.mode}`)
  console.log(`  Inputs scanned: ${summary.inputsScanned}`)
  console.log(`  Candidates found: ${summary.candidateCount}`)
  console.log(`  Categories: strategy ${summary.categories.strategy}, system ${summary.categories.system}, execution ${summary.categories.execution}, people ${summary.categories.people}`)

  if (scan.candidates.length) {
    console.log('\nProposed decisions')
    scan.candidates.forEach(printCandidate)
  } else {
    console.log('\nProposed decisions')
    console.log('  None.')
  }

  if (applyResult) {
    console.log('\nApply result')
    console.log(`  Created: ${applyResult.createdCount}`)
    console.log(`  Skipped as duplicates: ${applyResult.skippedCount}`)
    for (const item of applyResult.created) {
      console.log(`  - Created ${item.decisionId}: ${item.title}`)
    }
    for (const item of applyResult.skipped) {
      console.log(`  - Skipped ${item.title}: ${item.reason}`)
    }
  } else {
    console.log('\nApply result')
    console.log('  Dry run only. Use --apply=true to write proposed decisions.')
  }

  console.log(`\nDECISION_AUTO_EMIT_SUMMARY ${JSON.stringify(summary)}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const synthetic = boolArg(args.synthetic)
  const apply = boolArg(args.apply)
  const options = {
    synthetic,
    foundationSources: boolArg(args.foundationSources),
    text: normalizeText(args.text),
    textFile: normalizeText(args.textFile),
    sourceLabel: normalizeText(args.sourceLabel),
    commitSha: normalizeText(args.commitSha),
    commitRef: normalizeText(args.commitRef),
    fromRef: normalizeText(args.fromRef),
    toRef: normalizeText(args.toRef),
    cwd: normalizeText(args.cwd) || process.cwd(),
    actor: normalizeText(args.actor) || 'decision-auto-emit',
    decisionOwner: normalizeText(args.decisionOwner),
  }

  if (synthetic && apply) {
    throw new Error('Synthetic mode is read-only. Remove --apply=true before running the synthetic proof.')
  }

  const scan = await scanDecisionAutoEmitCandidates(options)
  const applyResult = apply
    ? await applyDecisionAutoEmitCandidates(scan.candidates, options)
    : null
  printScan(scan, applyResult)
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Decision auto-emit failed.')
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
