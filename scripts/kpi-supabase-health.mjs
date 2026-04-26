#!/usr/bin/env node

import fs from 'node:fs'
import process from 'node:process'

const LOCAL_KPI_ENV = 'store/kpi-audit.env'

const TABLES = [
  'profiles',
  'users',
  'persons',
  'appointments',
  'leads',
  'deal_data',
  'goals',
  'company_goals',
  'expansion_goals',
  'users_activity',
]

function loadLocalEnv(path) {
  if (!fs.existsSync(path)) return false
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key]) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
  return true
}

function normalizeSupabaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('SUPABASE_URL is required for KPI health.')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(raw)) {
    throw new Error('SUPABASE_URL must be a Supabase project URL.')
  }
  return raw
}

function getCredential() {
  const credential = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.KPI_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.KPI_SUPABASE_ANON_KEY ||
      '',
  ).trim()
  if (!credential) {
    throw new Error('A Supabase service-role or anon key is required for KPI health.')
  }
  return credential
}

function parseTotal(contentRange) {
  const raw = String(contentRange || '')
  const match = raw.match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function probeTable(baseUrl, credential, table) {
  const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*`
  const response = await fetch(url, {
    headers: {
      apikey: credential,
      Authorization: `Bearer ${credential}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  const text = await response.text()
  if (!response.ok) {
    let message = text
    try {
      const parsed = JSON.parse(text)
      message = parsed.message || parsed.error || text
    } catch {
      // Keep the raw response message.
    }
    throw new Error(`${table}: ${response.status} ${message}`)
  }
  return {
    table,
    total: parseTotal(response.headers.get('content-range')),
  }
}

async function main() {
  const loadedLocalEnv = loadLocalEnv(LOCAL_KPI_ENV)
  const baseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.KPI_SUPABASE_URL)
  const credential = getCredential()
  const host = new URL(baseUrl).host

  console.log('KPI Supabase health')
  console.log(`  Project: ${host}`)
  console.log(`  Local KPI env: ${loadedLocalEnv ? LOCAL_KPI_ENV : 'not loaded'}`)

  const failures = []
  for (const table of TABLES) {
    try {
      const result = await probeTable(baseUrl, credential, table)
      console.log(`PASS ${result.table}: readable${result.total == null ? '' : ` (${result.total} rows)`}`)
    } catch (error) {
      failures.push(error.message)
      console.log(`FAIL ${error.message}`)
    }
  }

  if (failures.length) {
    throw new Error(`${failures.length} KPI Supabase health check(s) failed.`)
  }
  console.log('KPI Supabase health passed.')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
