export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID = 'FOUNDATION-KB-ACTION-REVIEW-SPRINT-001'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY = 'foundation-kb-action-review-sprint-v1'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH = 'docs/process/foundation-kb-action-review-sprint-001-plan.md'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.json'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-foundation-kb-action-review-sprint-closeout.md'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH = 'scripts/process-foundation-kb-action-review-sprint-check.mjs'
export const FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID = 'foundation-kb-action-review-sprint-2026-05-18'

export const FOUNDATION_KB_ACTION_REVIEW_CHILDREN = [
  {
    cardId: 'BUILD-LANE-FAILURE-TELEMETRY-001',
    closeoutKey: 'build-lane-failure-telemetry-v1',
    role: 'build-lane repeated-failure telemetry',
  },
  {
    cardId: 'FOUNDATION-KB-COMPILER-V1-001',
    closeoutKey: 'foundation-kb-compiler-v1',
    role: 'proposal-only KB compiler path',
  },
  {
    cardId: 'ACTION-ROUTE-REVIEW-INBOX-001',
    closeoutKey: 'action-route-review-inbox-v1',
    role: 'read-only action-route review inbox',
  },
  {
    cardId: 'ACTION-ROUTE-PROMOTION-WORKFLOW-001',
    closeoutKey: 'action-route-promotion-workflow-v1',
    role: 'governed internal review workflow',
  },
  {
    cardId: 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001',
    closeoutKey: 'action-route-dedup-staleness-guard-v1',
    role: 'duplicate and stale review-item policy',
  },
]

export const FOUNDATION_KB_ACTION_REVIEW_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, model call, or provider probe.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'No hidden subagent or delegated worker launch.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No automatic deletion, hiding, rejection, snoozing, or external apply of review items.',
]

export const FOUNDATION_KB_ACTION_REVIEW_CHANGED_FILES = [
  'lib/foundation-kb-action-review-sprint.js',
  'scripts/process-foundation-kb-action-review-sprint-check.mjs',
  'lib/foundation-build-closeout-action-route-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  'docs/process/foundation-kb-action-review-sprint-001-plan.md',
  'docs/process/approvals/FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.json',
  'docs/handoffs/2026-05-18-foundation-kb-action-review-sprint-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
]

export const FOUNDATION_KB_ACTION_REVIEW_PROOF_COMMANDS = [
  'node --check lib/foundation-kb-action-review-sprint.js scripts/process-foundation-kb-action-review-sprint-check.mjs',
  'npm run process:foundation-kb-action-review-sprint-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=FOUNDATION-KB-ACTION-REVIEW-SPRINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.json --closeoutKey=foundation-kb-action-review-sprint-v1 --commitRef=HEAD',
]

const FORBIDDEN_RUNTIME_PATTERNS = [
  /spawn_agent\s*\(/,
  /startExtractionRun\s*\(/,
  /fetchTranscript\s*\(/,
  /captureScreenshot\s*\(/,
  /responses\.create\s*\(/,
  /createChatCompletion\s*\(/,
  /sendGmail\s*\(/,
  /writeClickUp\s*\(/,
  /drive\.permissions\b/,
  /agentFeedbackAutoSend\s*\(/,
]

function normalizeText(value) {
  return String(value || '').trim()
}

function findById(rows = [], id = '') {
  return rows.find(row => normalizeText(row?.id || row?.cardId) === id)
}

function closeoutKeys(closeouts = []) {
  return new Set((Array.isArray(closeouts) ? closeouts : []).map(row => normalizeText(row?.key)).filter(Boolean))
}

export function findFoundationKbActionReviewForbiddenRuntimeTokens(source = '') {
  return FORBIDDEN_RUNTIME_PATTERNS
    .filter(pattern => pattern.test(String(source || '')))
    .map(pattern => String(pattern))
}

export function evaluateFoundationKbActionReviewSprintCloseout({
  cards = [],
  closeouts = [],
  currentPlan = '',
  currentState = '',
  packageJson = {},
  sourceText = '',
  requireParentDone = false,
} = {}) {
  const childResults = FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => {
    const card = findById(cards, child.cardId)
    return {
      ...child,
      lane: normalizeText(card?.lane),
      done: normalizeText(card?.lane) === 'done',
    }
  })
  const keys = closeoutKeys(closeouts)
  const missingCloseouts = FOUNDATION_KB_ACTION_REVIEW_CHILDREN
    .filter(child => !keys.has(child.closeoutKey))
    .map(child => child.closeoutKey)
  const parent = findById(cards, FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID)
  const forbiddenTokens = findFoundationKbActionReviewForbiddenRuntimeTokens(sourceText)
  const planStateText = `${currentPlan}\n${currentState}`
  const docsNameEveryChild = FOUNDATION_KB_ACTION_REVIEW_CHILDREN
    .every(child => planStateText.includes(child.cardId) && planStateText.includes(child.closeoutKey))
  const packageScript = packageJson?.scripts?.['process:foundation-kb-action-review-sprint-check']

  const checks = [
    {
      ok: Boolean(parent),
      check: 'umbrella backlog card exists',
      detail: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    },
    {
      ok: !requireParentDone || normalizeText(parent?.lane) === 'done',
      check: 'umbrella card is closed when close-card proof runs',
      detail: parent?.lane || 'missing',
    },
    {
      ok: childResults.every(child => child.done),
      check: 'all KB/action-review child cards are done',
      detail: childResults.map(child => `${child.cardId}:${child.lane || 'missing'}`).join(', '),
    },
    {
      ok: missingCloseouts.length === 0,
      check: 'all child closeout keys are registered',
      detail: missingCloseouts.join(', ') || 'ok',
    },
    {
      ok: keys.has(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY),
      check: 'umbrella closeout key is registered',
      detail: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY,
    },
    {
      ok: docsNameEveryChild && (!requireParentDone || planStateText.includes(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY)),
      check: 'current plan/state name child closeouts and umbrella closeout',
      detail: docsNameEveryChild ? 'docs include child closeouts' : 'missing child closeout doc reference',
    },
    {
      ok: packageScript === `node --env-file-if-exists=.env ${FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH}`,
      check: 'package exposes focused proof script',
      detail: packageScript || 'missing',
    },
    {
      ok: forbiddenTokens.length === 0,
      check: 'closeout introduces no hidden worker, extraction, model, or external-write runtime tokens',
      detail: forbiddenTokens.join(', ') || 'clean',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    childResults,
    missingCloseouts,
    parentLane: normalizeText(parent?.lane),
    forbiddenTokens,
  }
}

export function buildFoundationKbActionReviewSprintDogfoodProof() {
  const goodCards = [
    { id: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID, lane: 'done' },
    ...FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => ({ id: child.cardId, lane: 'done' })),
  ]
  const goodCloseouts = [
    { key: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY },
    ...FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => ({ key: child.closeoutKey })),
  ]
  const goodDocs = FOUNDATION_KB_ACTION_REVIEW_CHILDREN
    .map(child => `${child.cardId} ${child.closeoutKey}`)
    .concat(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY)
    .join('\n')
  const goodPackage = {
    scripts: {
      'process:foundation-kb-action-review-sprint-check': `node --env-file-if-exists=.env ${FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH}`,
    },
  }

  const good = evaluateFoundationKbActionReviewSprintCloseout({
    cards: goodCards,
    closeouts: goodCloseouts,
    currentPlan: goodDocs,
    currentState: goodDocs,
    packageJson: goodPackage,
    requireParentDone: true,
  })
  const missingChild = evaluateFoundationKbActionReviewSprintCloseout({
    cards: goodCards.filter(card => card.id !== 'ACTION-ROUTE-PROMOTION-WORKFLOW-001'),
    closeouts: goodCloseouts,
    currentPlan: goodDocs,
    currentState: goodDocs,
    packageJson: goodPackage,
    requireParentDone: true,
  })
  const staleParent = evaluateFoundationKbActionReviewSprintCloseout({
    cards: goodCards.map(card => card.id === FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID ? { ...card, lane: 'scoped' } : card),
    closeouts: goodCloseouts,
    currentPlan: goodDocs,
    currentState: goodDocs,
    packageJson: goodPackage,
    requireParentDone: true,
  })
  const missingCloseout = evaluateFoundationKbActionReviewSprintCloseout({
    cards: goodCards,
    closeouts: goodCloseouts.filter(record => record.key !== 'action-route-review-inbox-v1'),
    currentPlan: goodDocs,
    currentState: goodDocs,
    packageJson: goodPackage,
    requireParentDone: true,
  })
  const forbiddenRuntime = evaluateFoundationKbActionReviewSprintCloseout({
    cards: goodCards,
    closeouts: goodCloseouts,
    currentPlan: goodDocs,
    currentState: goodDocs,
    packageJson: goodPackage,
    sourceText: [
      'spawn_' + 'agent({});',
      'start' + 'ExtractionRun({});',
      'responses' + '.create({});',
    ].join(' '),
    requireParentDone: true,
  })

  return {
    ok: good.ok &&
      !missingChild.ok &&
      !staleParent.ok &&
      !missingCloseout.ok &&
      !forbiddenRuntime.ok,
    invariant: 'Umbrella closeout passes only when every child card and closeout is done, the umbrella itself is closed, package proof is registered, and hidden worker/extraction/model side-effect tokens are absent.',
    cases: {
      good: good.ok,
      missingChild: missingChild.ok,
      staleParent: staleParent.ok,
      missingCloseout: missingCloseout.ok,
      forbiddenRuntime: forbiddenRuntime.ok,
    },
  }
}
