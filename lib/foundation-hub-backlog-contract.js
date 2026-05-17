export const FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID = 'FOUNDATION-HUB-BACKLOG-CONTRACT-001'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY = 'foundation-hub-backlog-contract-v1'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION = 'foundation-hub-backlog.contract.v1'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_PLAN_PATH = 'docs/process/foundation-hub-backlog-contract-001-plan.md'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-HUB-BACKLOG-CONTRACT-001.json'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH = 'scripts/process-foundation-hub-backlog-contract-check.mjs'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID = 'foundation-hub-backlog-contract-2026-05-15'
export const FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES = 650_000

export const FOUNDATION_HUB_BACKLOG_TEXT_LIMITS = Object.freeze({
  title: 140,
  source: 80,
  summary: 180,
  nextAction: 140,
  statusNote: 140,
  owner: 80,
})

function normalizeText(value) {
  return String(value || '').trim()
}

function byteLengthJson(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function truncateText(value, maxLength) {
  const text = normalizeText(value)
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function countBy(rows = [], field) {
  return rows.reduce((acc, row) => {
    const key = normalizeText(row?.[field]) || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export function compactFoundationHubBacklogItem(item = {}) {
  const scope = normalizeText(item.scope || item.team || 'foundation')
  const row = {
    id: normalizeText(item.id),
    title: truncateText(item.title, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.title),
    scope,
    team: scope,
    lane: normalizeText(item.lane),
    priority: normalizeText(item.priority),
    rank: item.rank ?? null,
    source: truncateText(item.source, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.source),
    summary: truncateText(item.summary, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.summary),
    nextAction: truncateText(item.nextAction, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.nextAction),
    statusNote: truncateText(item.statusNote, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.statusNote),
    owner: truncateText(item.owner, FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.owner),
    updatedAt: item.updatedAt || item.updated_at || null,
  }
  if (!row.nextAction) delete row.nextAction
  if (!row.statusNote) delete row.statusNote
  if (!row.source) delete row.source
  if (!row.owner) delete row.owner
  if (!row.updatedAt) delete row.updatedAt
  return row
}

export function buildFoundationHubBacklogContract({
  backlogItems = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const fullRows = Array.isArray(backlogItems) ? backlogItems : []
  const compactRows = fullRows.map(compactFoundationHubBacklogItem)
  const fullRowsBytes = byteLengthJson(fullRows)
  const compactRowsBytes = byteLengthJson(compactRows)
  const maxRowBytes = compactRows.reduce((max, row) => Math.max(max, byteLengthJson(row)), 0)
  const truncatedFieldCount = fullRows.reduce((count, row) => {
    return count +
      (normalizeText(row.title).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.title ? 1 : 0) +
      (normalizeText(row.source).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.source ? 1 : 0) +
      (normalizeText(row.summary).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.summary ? 1 : 0) +
      (normalizeText(row.nextAction).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.nextAction ? 1 : 0) +
      (normalizeText(row.statusNote).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.statusNote ? 1 : 0) +
      (normalizeText(row.owner).length > FOUNDATION_HUB_BACKLOG_TEXT_LIMITS.owner ? 1 : 0)
  }, 0)

  return {
    backlogItems: compactRows,
    backlogContract: {
      contractVersion: FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION,
      cardId: FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
      closeoutKey: FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY,
      generatedAt,
      totalItems: fullRows.length,
      defaultItemCount: compactRows.length,
      fullDetailPath: '/api/foundation-hub?view=full',
      defaultRoute: '/api/foundation-hub',
      rowContract: {
        requiredFields: [
          'id',
          'title',
          'scope',
          'team',
          'lane',
          'priority',
          'rank',
          'summary',
        ],
        textLimits: FOUNDATION_HUB_BACKLOG_TEXT_LIMITS,
      },
      laneCounts: countBy(compactRows, 'lane'),
      priorityCounts: countBy(compactRows, 'priority'),
      scopeCounts: countBy(compactRows, 'scope'),
      payload: {
        fullRowsBytes,
        compactRowsBytes,
        savedBytes: Math.max(0, fullRowsBytes - compactRowsBytes),
        maxRowBytes,
        truncatedFieldCount,
      },
      fullPayloadCompacted: true,
    },
  }
}

export function validateFoundationHubBacklogContract(payload = {}) {
  const rows = Array.isArray(payload.backlogItems) ? payload.backlogItems : []
  const contract = payload.backlogContract || {}
  const failures = []
  if (contract.contractVersion !== FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION) {
    failures.push('missing_contract_version')
  }
  if (Number(contract.totalItems) !== rows.length || Number(contract.defaultItemCount) !== rows.length) {
    failures.push('row_count_mismatch')
  }
  if (!contract.fullPayloadCompacted) failures.push('not_marked_compacted')
  const requiredFields = contract.rowContract?.requiredFields || []
  for (const row of rows) {
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(row, field)) failures.push(`missing_field:${field}`)
    }
    for (const [field, maxLength] of Object.entries(FOUNDATION_HUB_BACKLOG_TEXT_LIMITS)) {
      if (normalizeText(row[field]).length > maxLength) failures.push(`over_limit:${field}:${row.id || 'unknown'}`)
    }
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    rowCount: rows.length,
    contractVersion: contract.contractVersion || null,
  }
}

export function buildFoundationHubBacklogContractDogfoodProof() {
  const longText = 'x'.repeat(5000)
  const synthetic = [
    {
      id: 'SYNTHETIC-BACKLOG-BLOAT-001',
      title: `Synthetic bloat ${longText}`,
      scope: 'foundation',
      team: 'foundation',
      lane: 'scoped',
      priority: 'P1',
      rank: 1,
      source: longText,
      summary: longText,
      whyItMatters: longText,
      nextAction: longText,
      statusNote: longText,
      owner: `Owner ${longText}`,
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-15T00:00:00.000Z',
    },
  ]
  const contract = buildFoundationHubBacklogContract({ backlogItems: synthetic })
  const validation = validateFoundationHubBacklogContract(contract)
  return {
    ok: validation.ok &&
      contract.backlogContract.payload.compactRowsBytes < contract.backlogContract.payload.fullRowsBytes &&
      contract.backlogContract.payload.truncatedFieldCount >= 6,
    validation,
    fullRowsBytes: contract.backlogContract.payload.fullRowsBytes,
    compactRowsBytes: contract.backlogContract.payload.compactRowsBytes,
    truncatedFieldCount: contract.backlogContract.payload.truncatedFieldCount,
    invariant: 'A pathological backlog row with multi-kilobyte notes is truncated into the default Foundation Hub contract instead of being sent whole.',
  }
}
