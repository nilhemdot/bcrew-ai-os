import {
  buildFoundationBacklogDetailPayload,
  buildFoundationBacklogDoneArchivePayload,
  buildFoundationBacklogListPayload,
  buildFoundationDoneSemanticsSummary,
  classifyFoundationDoneSemantics,
  validateFoundationBacklogDetailPayload,
  validateFoundationBacklogDoneArchivePayload,
  validateFoundationBacklogListPayload,
} from './foundation-backlog-detail.js'

export const FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID = 'FOUNDATION-DONE-SEMANTICS-REPAIR-001'
export const FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY = 'foundation-done-semantics-repair-v1'
export const FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH = 'docs/process/foundation-done-semantics-repair-001-plan.md'
export const FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DONE-SEMANTICS-REPAIR-001.json'
export const FOUNDATION_DONE_SEMANTICS_REPAIR_SCRIPT_PATH = 'scripts/process-foundation-done-semantics-repair-check.mjs'
export const FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID = 'FOUNDATION-ORPHAN-SCRIPT-REVIEW-001'

export const FOUNDATION_DONE_SEMANTICS_REPAIR_CHANGED_FILES = [
  'lib/foundation-backlog-detail.js',
  'public/foundation.js',
  'lib/foundation-done-semantics-repair.js',
  FOUNDATION_DONE_SEMANTICS_REPAIR_SCRIPT_PATH,
  FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH,
  FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const FOUNDATION_DONE_SEMANTICS_REPAIR_PROOF_COMMANDS = [
  'node --check lib/foundation-backlog-detail.js',
  'node --check public/foundation.js',
  'node --check lib/foundation-done-semantics-repair.js',
  'node --check scripts/process-foundation-done-semantics-repair-check.mjs',
  'npm run process:foundation-done-semantics-repair-check -- --json',
  'npm run process:foundation-done-semantics-repair-check -- --apply --stage=building_now --json',
  'npm run process:foundation-done-semantics-repair-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID} --planApprovalRef=${FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH} --closeoutKey=${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID} --closeoutKey=${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID} --planApprovalRef=${FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH} --closeoutKey=${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_DONE_SEMANTICS_REPAIR_NOT_NEXT_BOUNDARIES = [
  'Do not rewrite historical done cards or delete their evidence.',
  'Do not mark V1, preflight, blocked, approval-bound, or unclear work as feature-complete.',
  'Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001 or any per-hub folder restructure.',
  'Do not delete verifier, approval, plan, closeout, or process-check files.',
  'Do not delete scripts/codex-status.mjs.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems.',
  'Do not touch or weaken MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001, source-session readiness, local-browser route policy, Dev Hub System Truth, or /api/foundation/dev-team-hub posture.',
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function makeDogfoodCards() {
  return [
    {
      id: 'DOGFOOD-BLOCKED-PREFLIGHT-001',
      title: 'Synthetic blocked preflight',
      scope: 'foundation',
      lane: 'done',
      priority: 'P1',
      summary: 'V1 preflight closed, but live extraction is blocked pending approval.',
      nextAction: 'Wait for approval before live execution.',
      statusNote: 'Metadata-only preflight, no external write.',
    },
    {
      id: 'DOGFOOD-PREFLIGHT-ONLY-001',
      title: 'Synthetic preflight only',
      scope: 'foundation',
      lane: 'done',
      priority: 'P1',
      summary: 'Approval packet and readiness contract only.',
      nextAction: 'Use a packet-gated follow-up for live behavior.',
      statusNote: 'Dry-run proof passed.',
    },
    {
      id: 'DOGFOOD-V1-CONTRACT-001',
      title: 'Synthetic bounded V1',
      scope: 'foundation',
      lane: 'done',
      priority: 'P1',
      summary: 'V1 built as a bounded contract for the first slice.',
      nextAction: 'Continue with the next slice.',
      statusNote: 'Closeout proof exists for the bounded V1.',
    },
    {
      id: 'DOGFOOD-BEHAVIOR-PROVEN-001',
      title: 'Synthetic behavior-proven closeout',
      scope: 'foundation',
      lane: 'done',
      priority: 'P1',
      summary: 'Real data reached a real outcome with owner routing.',
      nextAction: 'Monitor the behavior proof.',
      statusNote: 'Proof passed and closeout recorded.',
    },
    {
      id: 'DOGFOOD-DONE-UNCLEAR-001',
      title: 'Synthetic unclear done',
      scope: 'foundation',
      lane: 'done',
      priority: 'P1',
      summary: 'Moved over without evidence language.',
      nextAction: 'Review before claiming feature complete.',
      statusNote: 'Legacy close signal.',
    },
    {
      id: 'DOGFOOD-NOT-DONE-001',
      title: 'Synthetic active card',
      scope: 'foundation',
      lane: 'executing',
      priority: 'P1',
      summary: 'Still building.',
      nextAction: 'Keep working.',
      statusNote: 'Not done.',
    },
  ]
}

export function buildFoundationDoneSemanticsRepairDogfoodProof() {
  const cards = makeDogfoodCards()
  const byId = Object.fromEntries(cards.map(card => [card.id, classifyFoundationDoneSemantics(card)]))
  const summary = buildFoundationDoneSemanticsSummary(cards.map(card => ({
    ...card,
    doneSemantics: byId[card.id],
  })))

  return {
    ok: byId['DOGFOOD-BLOCKED-PREFLIGHT-001'].status === 'blocked_preflight' &&
      byId['DOGFOOD-BLOCKED-PREFLIGHT-001'].featureCompleteClaimAllowed === false &&
      byId['DOGFOOD-PREFLIGHT-ONLY-001'].status === 'preflight_or_contract' &&
      byId['DOGFOOD-PREFLIGHT-ONLY-001'].featureCompleteClaimAllowed === false &&
      byId['DOGFOOD-V1-CONTRACT-001'].status === 'v1_contract' &&
      byId['DOGFOOD-V1-CONTRACT-001'].featureCompleteClaimAllowed === false &&
      byId['DOGFOOD-BEHAVIOR-PROVEN-001'].status === 'behavior_proven' &&
      byId['DOGFOOD-BEHAVIOR-PROVEN-001'].featureCompleteClaimAllowed === true &&
      byId['DOGFOOD-DONE-UNCLEAR-001'].status === 'done_unclear' &&
      byId['DOGFOOD-DONE-UNCLEAR-001'].explicitReviewCandidate === true &&
      byId['DOGFOOD-NOT-DONE-001'].status === 'not_done' &&
      summary.nonFeatureCompleteDoneItems === 4 &&
      summary.featureCompleteClaimAllowedItems === 1,
    classifications: byId,
    summary,
  }
}

export function buildFoundationDoneSemanticsRepairSnapshot({
  backlogItems = [],
  backlogModuleSource = '',
  foundationUiSource = '',
  packageScripts = {},
  closeoutSource = '',
  coverageSource = '',
} = {}) {
  const checks = []
  const listPayload = buildFoundationBacklogListPayload({ backlogItems })
  const doneArchivePayload = buildFoundationBacklogDoneArchivePayload({ backlogItems, limit: 50 })
  const doneCard = (Array.isArray(backlogItems) ? backlogItems : []).find(item => item?.lane === 'done') || null
  const detailPayload = doneCard
    ? buildFoundationBacklogDetailPayload({ cardId: doneCard.id, backlogItems })
    : null
  const listValidation = validateFoundationBacklogListPayload(listPayload)
  const archiveValidation = validateFoundationBacklogDoneArchivePayload(doneArchivePayload)
  const detailValidation = detailPayload
    ? validateFoundationBacklogDetailPayload(detailPayload)
    : { ok: false, failures: ['no done card fixture available'] }
  const dogfood = buildFoundationDoneSemanticsRepairDogfoodProof()
  const summary = listPayload.summary.doneSemantics || {}
  const statusCounts = summary.countsByStatus || {}
  const limitingStatusCount = [
    'blocked_preflight',
    'blocked_or_waiting',
    'preflight_or_contract',
    'v1_contract',
    'done_unclear',
  ].reduce((total, key) => total + (Number(statusCounts[key]) || 0), 0)

  addCheck(
    checks,
    listValidation.ok === true &&
      archiveValidation.ok === true &&
      detailValidation.ok === true,
    'backlog list, done archive, and detail payloads stay valid',
    `list=${listValidation.ok} archive=${archiveValidation.ok} detail=${detailValidation.ok}`,
  )
  addCheck(
    checks,
    Boolean(detailPayload?.card?.doneSemantics?.status) &&
      detailPayload.card.doneSemantics.featureCompleteClaimAllowed !== undefined,
    'single-card detail exposes done semantics',
    detailPayload?.card?.doneSemantics?.status || 'missing',
  )
  addCheck(
    checks,
    summary.doneItems > 0 &&
      Object.keys(statusCounts).length > 0 &&
      limitingStatusCount > 0 &&
      Number(summary.nonFeatureCompleteDoneItems) >= limitingStatusCount,
    'backlog summary exposes bounded done outcome counts',
    JSON.stringify(statusCounts),
  )
  addCheck(
    checks,
    Array.isArray(summary.reviewCandidateIds) &&
      summary.reviewCandidateIds.length === Number(summary.explicitReviewCandidateItems || 0) &&
      Number(summary.explicitReviewCandidateItems || 0) > 0,
    'readback includes the reviewed candidate list for limiting done language',
    `${summary.explicitReviewCandidateItems || 0} candidates`,
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood rejects V1, preflight, blocked, and unclear feature-complete claims',
    dogfood.ok ? 'bounded done semantics pass' : 'dogfood failed',
  )
  addCheck(
    checks,
    String(foundationUiSource).includes('Done Outcome') &&
      String(foundationUiSource).includes('doneSemantics') &&
      String(foundationUiSource).includes('plainEnglish'),
    'Foundation UI renders done outcome without rewriting cards',
    'renderBacklogAccordionItem shows Done Outcome for done rows',
  )
  addCheck(
    checks,
    String(backlogModuleSource).includes('classifyFoundationDoneSemantics') &&
      String(backlogModuleSource).includes('buildFoundationDoneSemanticsSummary') &&
      String(backlogModuleSource).includes('featureCompleteClaimAllowed'),
    'backlog module owns done semantics classifier and summary',
    'classifier + summary',
  )
  addCheck(
    checks,
    packageScripts['process:foundation-done-semantics-repair-check'] ===
      'node --env-file-if-exists=.env scripts/process-foundation-done-semantics-repair-check.mjs',
    'package exposes focused done-semantics proof',
    packageScripts['process:foundation-done-semantics-repair-check'] || 'missing',
  )
  addCheck(
    checks,
    String(closeoutSource).includes(FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY) &&
      String(coverageSource).includes(FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID),
    'closeout and verifier coverage register the done-semantics card',
    `${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY} / ${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID}`,
  )
  addCheck(
    checks,
    !/(chromium|puppeteer|browserbase|drive\.permissions|gmail|clickup|upsertSourceCrawlItem|upsertIntelligenceAtom|recordIntelligenceAtomHit)\s*\(/i.test([
      backlogModuleSource,
      foundationUiSource,
    ].join('\n')),
    'done-semantics repair has no browser, source, atom, Drive, or external write path',
    'readback-only classifier and UI',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length === 0 ? 'healthy' : 'blocked',
    summary,
    statusCounts,
    dogfood,
    listValidation,
    archiveValidation,
    detailValidation,
    checks,
    failed,
  }
}
