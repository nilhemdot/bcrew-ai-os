export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID = 'FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_KEY = 'foundation-backlog-p0-reality-cleanup-v1'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH = 'docs/process/foundation-backlog-p0-reality-cleanup-001-plan.md'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001.json'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH = 'scripts/process-foundation-backlog-p0-reality-cleanup-check.mjs'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-backlog-p0-reality-cleanup-closeout.md'
export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_NEXT_CARD_ID = 'SYSTEM-010'

export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CHANGED_FILES = [
  'lib/foundation-backlog-p0-reality-cleanup.js',
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PLAN_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH,
  FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_PATH,
]

export const FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_PROOF_COMMANDS = [
  `node --check lib/foundation-backlog-p0-reality-cleanup.js ${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_SCRIPT_PATH}`,
  'npm run process:foundation-backlog-p0-reality-cleanup-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID} --planApprovalRef=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID} --closeoutKey=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID} --planApprovalRef=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_BACKLOG_P0_REALITY_TARGET_CARD_IDS = [
  'SECURITY-001',
  'SECURITY-006',
  'SECURITY-PROVIDER-ROTATION-PROOF-001',
  'MEMORY-002',
  'SECURITY-EDGE-001',
  'SECURITY-FILTERED-COMMS-ACCESS-001',
]

export const FOUNDATION_BACKLOG_P0_REALITY_NOT_NEXT = [
  'Do not start Value Builder split.',
  'Do not rotate provider keys unless real exposure, suspicious access, public sharing, or Steve approval exists.',
  'Do not mutate credentials, Drive permissions, public edge exposure, external systems, or sends.',
  'Do not demote real security risk to make the queue look clean.',
  'Do not treat scary scoped/provider cards as active sprint blockers unless they are the Current Sprint active blocker.',
]

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null)
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function rowText(row = {}) {
  return [
    row.id,
    row.title,
    row.summary,
    row.whyItMatters,
    row.why_it_matters,
    row.statusNote,
    row.status_note,
    row.nextAction,
    row.next_action,
    row.source,
  ].map(text).join(' ')
}

function includesAny(value = '', needles = []) {
  const haystack = lower(value)
  return needles.some(needle => haystack.includes(lower(needle)))
}

function currentSprintCardIds(activeSprint = {}) {
  return new Set(normalizeArray(activeSprint.items).map(item => item.cardId || item.card_id || item.backlogId || item.backlog_id).filter(Boolean))
}

function sprintStageFor(row = {}, activeSprint = {}) {
  const item = normalizeArray(activeSprint.items).find(entry => (entry.cardId || entry.card_id || entry.backlogId || entry.backlog_id) === row.id)
  return item?.stage || ''
}

function hasOwnerThreshold(row = {}) {
  const content = lower(rowText(row))
  return Boolean(text(row.owner)) &&
    Boolean(text(row.nextAction || row.next_action)) &&
    Boolean(text(row.statusNote || row.status_note)) &&
    /(owner|approval|provider|threshold|trigger|not active|blocked|before public|steve|current sprint)/i.test(content)
}

export function classifyBacklogP0Row(row = {}, { activeSprint = {} } = {}) {
  const activeBlockerCardId = activeSprint.sprint?.activeBlockerCardId || activeSprint.sprint?.active_blocker_card_id || ''
  const sprintIds = currentSprintCardIds(activeSprint)
  const content = rowText(row)
  const lane = text(row.lane)
  const stage = sprintStageFor(row, activeSprint)
  const priority = text(row.priority)
  const inSprint = sprintIds.has(row.id)
  const isActiveBlocker = row.id === activeBlockerCardId
  const providerApproval = includesAny(content, [
    'provider-side',
    'provider side',
    'account owner',
    'approval-bound',
    'blocked pending',
    'explicit local-runtime approval',
    'steve approval',
    'approval required',
  ])
  const exposureGate = includesAny(content, [
    'before public',
    'before exposing',
    'broader external',
    'public edge',
    'before any public exposure',
    'non-tier-1',
    'broaden shared',
  ])
  const credentialSecurity = includesAny(content, [
    'credential',
    'secret',
    'rotation',
    'revocation',
    'exposed',
    'key rotation',
  ])
  const sourceValueWork = includesAny(content, [
    'extraction',
    'strategy',
    'marketing',
    'sales',
    'source',
    'attachment',
    'drive docs',
    'meeting',
    'video',
  ])

  let disposition = 'p0_visible'
  let blocking = false
  const failures = []

  if (priority !== 'P0') failures.push('not P0')

  if (lane === 'done') {
    disposition = 'done_closeout'
  } else if (isActiveBlocker) {
    disposition = 'current_sprint_active_blocker'
    blocking = true
  } else if (inSprint) {
    disposition = 'current_sprint_future_work'
  } else if (providerApproval) {
    disposition = 'approval_bound_not_active'
  } else if (exposureGate) {
    disposition = 'exposure_gate_not_active'
  } else if (credentialSecurity) {
    disposition = 'security_followup_not_active'
  } else if (sourceValueWork) {
    disposition = 'deferred_source_or_value_work'
  } else if (lane === 'ranked') {
    disposition = 'ranked_future_candidate'
  } else if (lane === 'research') {
    disposition = 'research_not_active'
  } else if (lane === 'scoped' || lane === 'parked') {
    disposition = 'scoped_not_active'
  }

  if (lane === 'executing' && !isActiveBlocker && stage !== 'building_now') {
    failures.push('P0 executing outside Current Sprint active blocker')
  }
  if (lane !== 'done' && (providerApproval || exposureGate || credentialSecurity) && !['scoped', 'parked', 'done'].includes(lane) && !isActiveBlocker) {
    failures.push('approval/security gate is in active queue posture without being active blocker')
  }
  if (lane !== 'done' && (providerApproval || exposureGate || credentialSecurity) && !hasOwnerThreshold(row)) {
    failures.push('approval/security P0 row lacks owner/status/next-action reality text')
  }
  if (row.id === 'SECURITY-001' && lane === 'done' && !includesAny(content, ['provider-side proof owned by', 'SECURITY-PROVIDER-ROTATION-PROOF-001'])) {
    failures.push('SECURITY-001 closeout must route remaining provider proof to live cards')
  }

  return {
    id: row.id,
    lane,
    priority,
    title: text(row.title),
    stage,
    disposition,
    blocking,
    providerApproval,
    exposureGate,
    credentialSecurity,
    failures,
    ok: failures.length === 0,
  }
}

export function evaluateBacklogP0Reality({ p0Rows = [], activeSprint = {}, expectedActiveBlockerCardId = '' } = {}) {
  const activeBlockerCardId = activeSprint.sprint?.activeBlockerCardId || activeSprint.sprint?.active_blocker_card_id || ''
  const rows = normalizeArray(p0Rows)
  const p0Ids = new Set(rows.map(row => row.id))
  const dispositions = rows.map(row => classifyBacklogP0Row(row, { activeSprint }))
  const failed = dispositions.filter(row => !row.ok)
  const activeBlockerRow = rows.find(row => row.id === activeBlockerCardId)
  const executingOutsideActive = dispositions.filter(row => row.failures.includes('P0 executing outside Current Sprint active blocker'))
  const activePathRows = dispositions.filter(row => row.blocking || row.stage === 'building_now')
  const failures = [...failed]

  if (!activeBlockerCardId) {
    failures.push({ id: 'current_sprint', failures: ['Current Sprint has no active blocker'] })
  }
  if (expectedActiveBlockerCardId && activeBlockerCardId !== expectedActiveBlockerCardId) {
    failures.push({ id: 'current_sprint', failures: [`expected active blocker ${expectedActiveBlockerCardId}, found ${activeBlockerCardId || 'missing'}`] })
  }
  if (activeBlockerCardId && !p0Ids.has(activeBlockerCardId)) {
    failures.push({ id: activeBlockerCardId, failures: ['active blocker is not a live P0 backlog row'] })
  }
  if (activeBlockerRow && activeBlockerRow.lane === 'done') {
    failures.push({ id: activeBlockerCardId, failures: ['active blocker is already done'] })
  }

  return {
    status: failures.length ? 'risk' : 'healthy',
    ok: failures.length === 0,
    activeBlockerCardId,
    totalP0Count: rows.length,
    activePathCount: activePathRows.length,
    executingOutsideActiveCount: executingOutsideActive.length,
    dispositionCounts: dispositions.reduce((counts, row) => {
      counts[row.disposition] = (counts[row.disposition] || 0) + 1
      return counts
    }, {}),
    rows: dispositions,
    failures,
  }
}

export function buildBacklogP0RealityDogfoodProof() {
  const activeSprint = {
    sprint: { activeBlockerCardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID },
    items: [
      { cardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID, stage: 'building_now' },
      { cardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_NEXT_CARD_ID, stage: 'scoping' },
    ],
  }
  const baseRows = [
    {
      id: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID,
      priority: 'P0',
      lane: 'executing',
      title: 'Clean live backlog P0 reality',
      owner: 'Foundation Process',
      statusNote: 'Active Current Sprint blocker.',
      nextAction: 'Close focused proof.',
    },
    {
      id: 'SECURITY-PROVIDER-ROTATION-PROOF-001',
      priority: 'P0',
      lane: 'scoped',
      title: 'Prove provider-side rotation or retirement for exposed credentials',
      owner: 'Provider Account Owners / Steve approval',
      statusNote: 'Approval-bound provider-side proof; not active sprint blocker.',
      nextAction: 'Wait for provider/account-owner proof. No unattended broad key rotation.',
    },
    {
      id: 'SECURITY-EDGE-001',
      priority: 'P0',
      lane: 'scoped',
      title: 'Harden public edge auth before exposing AIOS beyond trusted local access',
      owner: 'Foundation Security',
      statusNote: 'Before public exposure gate; not active sprint blocker.',
      nextAction: 'Activate before public exposure.',
    },
    {
      id: 'SOURCE-018',
      priority: 'P0',
      lane: 'scoped',
      title: 'Revalidate Google Gemini meeting notes as a foundation source contract',
      owner: 'Foundation Sources',
      statusNote: 'Deferred source work in approved sprint order.',
      nextAction: 'Run after SOURCE-012.',
    },
  ]
  const healthy = evaluateBacklogP0Reality({
    p0Rows: baseRows,
    activeSprint,
    expectedActiveBlockerCardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID,
  })
  const hiddenExecuting = evaluateBacklogP0Reality({
    p0Rows: [
      ...baseRows,
      {
        id: 'SECURITY-006',
        priority: 'P0',
        lane: 'executing',
        title: 'Rotate exposed credentials',
        owner: 'Provider Account Owners',
        statusNote: 'Provider-side proof required.',
        nextAction: 'Rotate keys.',
      },
    ],
    activeSprint,
    expectedActiveBlockerCardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID,
  })
  const scaryDoneWithoutRoute = evaluateBacklogP0Reality({
    p0Rows: [
      ...baseRows,
      {
        id: 'SECURITY-001',
        priority: 'P0',
        lane: 'done',
        title: 'Rotate exposed MCP secrets and move local connector config to a safe pattern',
        owner: 'Foundation Security',
        statusNote: 'Done.',
        nextAction: 'No next action.',
      },
    ],
    activeSprint,
    expectedActiveBlockerCardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID,
  })
  const activeMismatch = evaluateBacklogP0Reality({
    p0Rows: baseRows,
    activeSprint: { ...activeSprint, sprint: { activeBlockerCardId: 'SOMETHING-ELSE-001' } },
    expectedActiveBlockerCardId: FOUNDATION_BACKLOG_P0_REALITY_CLEANUP_CARD_ID,
  })

  const checks = [
    { ok: healthy.ok, check: 'healthy P0 reality passes', detail: healthy.status },
    { ok: !hiddenExecuting.ok, check: 'hidden executing P0 row fails', detail: hiddenExecuting.failures.map(row => `${row.id}:${row.failures.join('|')}`).join(', ') },
    { ok: !scaryDoneWithoutRoute.ok, check: 'done security scare row without provider-proof route fails', detail: scaryDoneWithoutRoute.failures.map(row => `${row.id}:${row.failures.join('|')}`).join(', ') },
    { ok: !activeMismatch.ok, check: 'active blocker mismatch fails', detail: activeMismatch.failures.map(row => `${row.id}:${row.failures.join('|')}`).join(', ') },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    healthy,
    hiddenExecuting,
    scaryDoneWithoutRoute,
    activeMismatch,
  }
}
