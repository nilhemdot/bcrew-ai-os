import fs from 'node:fs'

const LOCAL_KPI_ENV = 'store/kpi-audit.env'
const PAGE_SIZE = 1000

function loadLocalKpiEnv() {
  if (!fs.existsSync(LOCAL_KPI_ENV)) return false
  const lines = fs.readFileSync(LOCAL_KPI_ENV, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
  return true
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim()
}

function getSupabaseUrl() {
  loadLocalKpiEnv()
  return normalizeText(process.env.SUPABASE_URL || process.env.KPI_SUPABASE_URL).replace(/\/+$/, '')
}

function getSupabaseKey() {
  loadLocalKpiEnv()
  return normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.KPI_SUPABASE_SERVICE_ROLE_KEY)
}

function countFromContentRange(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+|\*)$/)
  return match && match[1] !== '*' ? Number(match[1]) : null
}

async function supabaseGetAll(path, options = {}) {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) throw new Error('KPI Supabase credentials are missing.')

  const rows = []
  let total = null
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        Prefer: options.count ? 'count=exact' : undefined,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    })
    const text = await response.text()
    if (!response.ok) {
      let message = text
      try {
        const parsed = JSON.parse(text)
        message = parsed.message || parsed.error || text
      } catch {
        // Keep raw text.
      }
      throw new Error(`KPI Supabase ${path} returned ${response.status}: ${message}`)
    }
    if (total == null) total = countFromContentRange(response.headers.get('content-range'))
    const pageRows = text ? JSON.parse(text) : []
    rows.push(...pageRows)
    if (pageRows.length < PAGE_SIZE) break
    if (total != null && rows.length >= total) break
  }

  return { rows, total: total ?? rows.length }
}

function normalizeAddressKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(road|rd|street|st|avenue|ave|court|ct|drive|dr|crescent|cres|boulevard|blvd|place|pl|lane|ln|unit|apt|suite)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addressTokens(value) {
  return normalizeAddressKey(value).split(' ').filter(token => token.length > 1)
}

function addressNumbers(value) {
  return addressTokens(value).filter(token => /^\d+[a-z]?$/.test(token))
}

function addressMatchScore(left, right) {
  const leftTokens = addressTokens(left)
  const rightTokens = new Set(addressTokens(right))
  if (!leftTokens.length || !rightTokens.size) return 0

  const listingNumbers = addressNumbers(left)
  const shoppingNumbers = new Set(addressNumbers(right))
  if (listingNumbers.length && !listingNumbers.some(number => shoppingNumbers.has(number))) return 0

  let hits = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) hits += 1
  }

  return hits / Math.max(leftTokens.length, rightTokens.size)
}

export async function getActiveKpiShoppingListRows() {
  const result = await supabaseGetAll([
    'leads?select=id,user_id,user_email,client_name_address,list_buy_sold,score,action_plan,first_day_active,updated_at,status,signed',
    'status=eq.active',
    'order=user_email.asc',
  ].join('&'), { count: true })
  return result.rows
}

export function findShoppingListMatch(listing, rows, options = {}) {
  const threshold = options.threshold || 0.45
  const candidates = (rows || [])
    .map(row => ({
      row,
      score: addressMatchScore(listing.title, row.client_name_address),
    }))
    .filter(candidate => candidate.score >= threshold)
    .sort((left, right) => right.score - left.score)

  const best = candidates[0]
  if (!best) {
    return {
      status: 'unmatched',
      confidence: 0,
      reason: 'No safe KPI Shopping List address match. Sales leader should confirm whether this active listing has a Shopping List row.',
    }
  }

  const actionPlan = normalizeText(best.row.action_plan)
  return {
    status: actionPlan ? 'matched_action_plan' : 'matched_missing_action_plan',
    confidence: Number(best.score.toFixed(3)),
    reason: 'Matched by listing address number and street tokens.',
    leadId: best.row.id,
    userEmail: normalizeText(best.row.user_email),
    clientNameAddress: normalizeText(best.row.client_name_address),
    score: best.row.score == null ? null : Number(best.row.score),
    signed: Boolean(best.row.signed),
    updatedAt: normalizeText(best.row.updated_at),
    firstDayActive: normalizeText(best.row.first_day_active),
    hasActionPlan: Boolean(actionPlan),
    actionPlan,
  }
}

export async function buildKpiShoppingListMatchContext(listings) {
  const rows = await getActiveKpiShoppingListRows()
  const staleListings = (listings || []).filter(listing => listing.stale)
  const matches = staleListings.map(listing => findShoppingListMatch(listing, rows))
  return {
    available: true,
    sourceId: 'SRC-SUPABASE-001',
    table: 'leads',
    activeRows: rows.length,
    matchingRule: 'Address number plus street-token match between ClickUp listing title and KPI Shopping List client_name_address.',
    matched: matches.filter(match => match.status !== 'unmatched').length,
    withActionPlan: matches.filter(match => match.status === 'matched_action_plan').length,
    missingActionPlan: matches.filter(match => match.status === 'matched_missing_action_plan').length,
    unmatched: matches.filter(match => match.status === 'unmatched').length,
    rows,
  }
}
