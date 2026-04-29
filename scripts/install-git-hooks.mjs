#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import { buildGitHookInstallStatus, GIT_HOOKS_PATH } from '../lib/process-git-hooks.js'

const execFile = promisify(execFileCallback)

async function main() {
  await execFile('git', ['config', 'core.hooksPath', GIT_HOOKS_PATH], {
    cwd: process.cwd(),
    env: process.env,
  })
  const status = await buildGitHookInstallStatus({ repoRoot: process.cwd() })
  console.log('Foundation Git hooks')
  console.log(`  core.hooksPath: ${status.hooksPath || 'unset'}`)
  for (const file of status.files) {
    console.log(`  ${file.name}: ${file.exists ? 'present' : 'missing'} / ${file.executable ? 'executable' : 'not executable'}`)
  }
  if (!status.ok) {
    console.error('Git hooks are not fully installed.')
    process.exitCode = 1
    return
  }
  console.log('Git hooks installed.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
