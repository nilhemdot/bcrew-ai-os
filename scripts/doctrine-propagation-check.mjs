#!/usr/bin/env node

import process from 'node:process'
import {
  buildDoctrinePropagationStatus,
  DEFAULT_BCREW_FOUNDATION_SKILL_PATH,
} from '../lib/doctrine-propagation.js'

const applyFlag = '--apply'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function isTrue(value) {
  return value === true || value === 'true' || value === '1'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const skillPath = String(args.skillPath || DEFAULT_BCREW_FOUNDATION_SKILL_PATH)
  const apply = isTrue(args.apply)
  const includeSynthetic = args.includeSynthetic !== 'false'

  const status = await buildDoctrinePropagationStatus({
    repoRoot: process.cwd(),
    skillPath,
    apply,
    includeSynthetic,
  })

  console.log('Doctrine propagation check')
  console.log(`  Skill: ${skillPath}`)
  console.log(`  Apply: ${apply ? 'yes' : 'no'} (${applyFlag})`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Doctrines: ${status.doctrineCount}`)
  console.log(`  Private memory files checked: ${status.privateMemoryFileCount}`)
  console.log(`  Critical findings: ${status.summary.criticalFindings}`)
  console.log(`  Warning findings: ${status.summary.warningFindings}`)

  if (status.applied) {
    console.log('  Action: regenerated the marked doctrine section in the skill.')
  }

  const findings = status.findings || []
  if (findings.length) {
    console.log('')
    for (const finding of findings.slice(0, 12)) {
      const severity = String(finding.severity || 'info').toUpperCase()
      console.log(`${severity}: ${finding.issue}`)
      console.log(`  Next: ${finding.recommendedAction}`)
    }
  }

  console.log('')
  console.log(`DOCTRINE_PROPAGATION_SUMMARY ${JSON.stringify({
    status: status.status,
    doctrineCount: status.doctrineCount,
    criticalFindings: status.summary.criticalFindings,
    warningFindings: status.summary.warningFindings,
    generatedSectionPresent: status.generatedSectionPresent,
    applied: status.applied,
  })}`)

  if (status.summary.criticalFindings > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error('Doctrine propagation check failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
