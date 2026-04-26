#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { getDefaultAuthUsers, hashPassword } from '../lib/app-auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const envPath = path.join(repoRoot, '.env')
const stateDir = path.join(repoRoot, 'state')
const credentialsPath = path.join(stateDir, 'local-auth-passwords.txt')

function randomPassword() {
  return randomBytes(9).toString('base64url')
}

function upsertEnvValue(source, key, value) {
  const line = `${key}=${value}`
  const matcher = new RegExp(`^${key}=.*$`, 'm')
  if (matcher.test(source)) return source.replace(matcher, line)
  return source.trimEnd() + '\n' + line + '\n'
}

async function readEnvFile() {
  try {
    return await fs.readFile(envPath, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return ''
    throw error
  }
}

async function main() {
  const users = getDefaultAuthUsers().map(user => ({
    ...user,
    password: randomPassword(),
  }))

  const authUsers = users.map(user => ({
    email: user.email,
    name: user.name,
    role: user.role,
    passwordHash: hashPassword(user.password),
  }))

  let envSource = await readEnvFile()
  envSource = upsertEnvValue(envSource, 'AIOS_SESSION_SECRET', randomBytes(32).toString('base64url'))
  envSource = upsertEnvValue(envSource, 'AIOS_AUTH_USERS_JSON', JSON.stringify(authUsers))

  await fs.writeFile(envPath, envSource, { mode: 0o600 })
  await fs.mkdir(stateDir, { recursive: true, mode: 0o700 })
  await fs.writeFile(
    credentialsPath,
    [
      'BCrew AI OS temporary login credentials',
      'Generated locally. Do not commit or share outside the team.',
      '',
      ...users.map(user => `${user.name} <${user.email}> (${user.role}): ${user.password}`),
      '',
    ].join('\n'),
    { mode: 0o600 }
  )

  console.log(`Configured ${users.length} local auth users.`)
  console.log(`Temporary passwords written to ${path.relative(repoRoot, credentialsPath)}.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
