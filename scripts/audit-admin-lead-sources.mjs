#!/usr/bin/env node

import process from 'node:process'
import { getSheetValues } from '../lib/google-delegated.js'

const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const ADMIN_RANGE = "'ADMIN ONLY - Deal Data Entry'!A1:CE2000"
const APPROVED_RANGE = "'Lists'!J3:J120"

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function sheetSerialToIso(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function findIndex(header, name) {
  return header.findIndex(value => normalizeText(value) === name)
}

function inferApprovedExtra(extra, approvedSet) {
  if (approvedSet.has(extra)) return extra

  const lower = extra.toLowerCase()
  if (lower === 'branded crew website') return 'Branded Website'
  if (lower === 'homevalue hub') return 'Company Website – Home Value Hub'
  if (lower === 'company website - home value hub') return 'Company Website – Home Value Hub'
  if (lower === 'zahndteam.ca call') return 'Zahndteam.ca Call'

  return ''
}

function suggestCanonicalSource(row, approvedSet) {
  const source = row.source
  const extra = row.extra
  const lowerSource = source.toLowerCase()
  const lowerExtra = extra.toLowerCase()
  const splitToAgent = Number(row.splitToAgent) || 0

  if (!source || source === '<blank>') {
    return {
      suggested: '<unspecified>',
      confidence: 'high',
      reason: 'Blank recent deal row. Use quarantine until the real source is proven.',
    }
  }

  if (lowerSource === 'unspecified') {
    return {
      suggested: '<unspecified>',
      confidence: 'high',
      reason: 'Legacy lowercase placeholder should be normalized to the governed quarantine value.',
    }
  }

  if (source === 'ZahndTeam.ca Call') {
    return {
      suggested: 'Zahndteam.ca Call',
      confidence: 'high',
      reason: 'Case-only normalization to the approved canonical source.',
    }
  }

  if (source === 'For Sale Sign Call') {
    if (lowerExtra.includes('guelph')) {
      return {
        suggested: 'For Sale Sign Call - Guelph Surr',
        confidence: 'medium',
        reason: 'Generic sign-call row includes Guelph context in extra detail.',
      }
    }
    if (lowerExtra.includes('brant')) {
      return {
        suggested: 'For Sale Sign Call - Brantford S',
        confidence: 'medium',
        reason: 'Generic sign-call row includes Brantford context in extra detail.',
      }
    }
    if (lowerExtra.includes('agri')) {
      return {
        suggested: 'Agri For Sale Sign Call',
        confidence: 'medium',
        reason: 'Generic sign-call row includes agri context in extra detail.',
      }
    }
  }

  if (source === 'Google Search Call') {
    if (lowerExtra.includes('guelph')) {
      return {
        suggested: 'BCrew Google Search Call Guelph',
        confidence: 'medium',
        reason: 'Generic Google Search Call includes Guelph context in extra detail.',
      }
    }
    if (lowerExtra.includes('brant')) {
      return {
        suggested: 'BCrew Google Search Call Brantfo',
        confidence: 'medium',
        reason: 'Generic Google Search Call includes Brantford context in extra detail.',
      }
    }
    if (lowerExtra.includes('burl')) {
      return {
        suggested: 'BCrew Google Search Call Burling',
        confidence: 'medium',
        reason: 'Generic Google Search Call includes Burlington context in extra detail.',
      }
    }
  }

  if (source === 'HomeOptima') {
    if (lowerExtra.includes('geo')) {
      return {
        suggested: 'Agent Flyer - Home Value Hub – Geo Flyer',
        confidence: 'medium',
        reason: 'Legacy HomeOptima row includes geo-flyer context.',
      }
    }
    if (lowerExtra.includes('flyer') || Math.abs(splitToAgent - 0.6) < 0.0001) {
      return {
        suggested: 'Agent Flyer - Home Value Hub',
        confidence: 'medium',
        reason: 'Founder rule: flyer-drop / 60% agent rows should normalize to Agent Flyer.',
      }
    }
    return {
      suggested: 'Company Website – Home Value Hub',
      confidence: 'medium',
      reason: 'Legacy HomeOptima rows should usually normalize to the governed company Home Value Hub source unless flyer evidence says otherwise.',
    }
  }

  if (source === 'Import') {
    const approvedExtra = inferApprovedExtra(extra, approvedSet)
    if (approvedExtra) {
      return {
        suggested: approvedExtra,
        confidence: 'medium',
        reason: 'Import is not final truth. Extra detail already points to an approved source.',
      }
    }

    if (lowerExtra === 'sphere' || lowerExtra === 'soi') {
      return {
        suggested: '<unspecified>',
        confidence: 'medium',
        reason: 'Import plus Sphere/SOI is not valid final truth. Quarantine until the relationship path is traced.',
      }
    }
  }

  return {
    suggested: '',
    confidence: 'manual',
    reason: 'Needs manual review.',
  }
}

function toTextReport(payload) {
  const lines = []
  lines.push('Admin lead-source cleanup audit')
  lines.push(`  Scope start: ${payload.start}`)
  lines.push(`  Approved values: ${payload.approvedCount}`)
  lines.push(`  Invalid rows: ${payload.invalidRows.length}`)
  lines.push('')
  lines.push('Invalid source groups')
  for (const group of payload.groups) {
    lines.push(`  - ${group.source}: ${group.count}`)
  }
  lines.push('')
  lines.push('Suggested cleanup buckets')
  for (const bucket of payload.suggestions) {
    lines.push(`  - ${bucket.label}: ${bucket.count}`)
  }
  lines.push('')
  lines.push('Sample rows')
  for (const row of payload.invalidRows.slice(0, 20)) {
    lines.push(
      `  - row ${row.row} ${row.deal} | ${row.executed} | ${row.source} -> ${row.suggested || 'MANUAL'} | ${row.reason}`
    )
  }
  return lines.join('\n')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const start = normalizeText(args.start) || '2025-06-01'
  const format = normalizeText(args.format) || 'text'

  const [adminRes, approvedRes] = await Promise.all([
    getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, ADMIN_RANGE),
    getSheetValues('ai@bensoncrew.ca', OWNERS_SHEET_ID, APPROVED_RANGE),
  ])

  const rows = adminRes.values || []
  const header = rows[0] || []
  const approved = new Set((approvedRes.values || []).flat().map(normalizeText).filter(Boolean))

  const idx = name => findIndex(header, name)
  const indices = {
    deal: idx('Deal #'),
    executed: idx('Date Firm (Executed)'),
    source: idx('Lead Source (Bonus System For Having This 100% Complete)'),
    extra: idx('Extra Lead Source Data'),
    groundZero: idx('Ground Zero'),
    companyOrAgent: idx('Company or Agent'),
    realtor: idx('Realtor'),
    total: idx('Total'),
    dealType: idx('Buy / Sell / Referral'),
    lease: idx('Deal or Lease?'),
    splitToAgent: idx('Split To Agent'),
  }

  const invalidRows = []

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const deal = normalizeText(row[indices.deal])
    if (!deal) continue

    const executed = sheetSerialToIso(row[indices.executed])
    if (!executed || executed < start) continue

    const source = normalizeText(row[indices.source]) || '<blank>'
    if (approved.has(source)) continue

    const record = {
      row: rowIndex + 1,
      deal,
      executed,
      source,
      extra: normalizeText(row[indices.extra]),
      groundZero: normalizeText(row[indices.groundZero]),
      companyOrAgent: normalizeText(row[indices.companyOrAgent]),
      realtor: normalizeText(row[indices.realtor]),
      total: row[indices.total] ?? '',
      dealType: normalizeText(row[indices.dealType]),
      lease: normalizeText(row[indices.lease]),
      splitToAgent: row[indices.splitToAgent] ?? '',
    }

    const suggestion = suggestCanonicalSource(record, approved)
    record.suggested = suggestion.suggested
    record.confidence = suggestion.confidence
    record.reason = suggestion.reason
    invalidRows.push(record)
  }

  const groups = Object.values(
    invalidRows.reduce((acc, row) => {
      acc[row.source] ||= { source: row.source, count: 0 }
      acc[row.source].count += 1
      return acc
    }, {})
  ).sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))

  const suggestions = Object.values(
    invalidRows.reduce((acc, row) => {
      const label = row.suggested ? `${row.suggested} (${row.confidence})` : 'Manual review'
      acc[label] ||= { label, count: 0 }
      acc[label].count += 1
      return acc
    }, {})
  ).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const payload = {
    start,
    approvedCount: approved.size,
    invalidRows,
    groups,
    suggestions,
  }

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  console.log(toTextReport(payload))
}

main().catch(error => {
  console.error('Admin lead-source cleanup audit failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
