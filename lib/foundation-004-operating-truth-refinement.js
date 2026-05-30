export const FOUNDATION_004_CARD_ID = 'FOUNDATION-004'
export const FOUNDATION_004_NEXT_CARD_ID = 'DATA-001'
export const FOUNDATION_004_CLOSEOUT_KEY = 'foundation-004-operating-truth-refinement-v1'
export const FOUNDATION_004_PLAN_PATH = 'docs/process/foundation-004-operating-truth-refinement-plan.md'
export const FOUNDATION_004_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-004.json'
export const FOUNDATION_004_SCRIPT_PATH = 'scripts/process-foundation-004-check.mjs'
export const FOUNDATION_004_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-foundation-004-operating-truth-refinement-closeout.md'
export const FOUNDATION_004_BLUEPRINT_PATH = 'docs/rebuild/freedom-rebuild-blueprint.md'

export const FOUNDATION_004_REQUIRED_SOURCE_IDS = [
  'SRC-FREEDOM-TEAM-001',
  'SRC-FREEDOM-COMMUNITY-001',
  'SRC-FREEDOM-COMMUNITY-REV-001',
  'SRC-FREEDOM-ENGINE-001',
  'SRC-FREEDOM-BHAG-001',
  'SRC-OWNERS-001',
  'SRC-FINANCE-001',
  'SRC-OWNERS-LISTS-001',
  'SRC-CLICKUP-001',
  'SRC-FUB-001',
]

export const FOUNDATION_004_REQUIRED_BLUEPRINT_LAYERS = [
  'team member source',
  'production roster source',
  'community source',
  'deal-ledger economics source',
  'BHAG assumptions source',
  'engine calculation layer',
  'dashboard read layer',
]

export const FOUNDATION_004_CHANGED_FILES = [
  'lib/foundation-004-operating-truth-refinement.js',
  FOUNDATION_004_SCRIPT_PATH,
  'docs/strategy/operating-truths.md',
  FOUNDATION_004_BLUEPRINT_PATH,
  'docs/source-notes/freedom-sheet.md',
  'docs/source-notes/owners-dashboard.md',
  'docs/source-notes/clickup.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  FOUNDATION_004_PLAN_PATH,
  FOUNDATION_004_APPROVAL_PATH,
  FOUNDATION_004_CLOSEOUT_PATH,
  'package.json',
]

export const FOUNDATION_004_PROOF_COMMANDS = [
  `node --check lib/foundation-004-operating-truth-refinement.js ${FOUNDATION_004_SCRIPT_PATH}`,
  'npm run process:foundation-004-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_004_CARD_ID} --planApprovalRef=${FOUNDATION_004_APPROVAL_PATH} --closeoutKey=${FOUNDATION_004_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_004_CARD_ID} --closeoutKey=${FOUNDATION_004_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_004_CARD_ID} --planApprovalRef=${FOUNDATION_004_APPROVAL_PATH} --closeoutKey=${FOUNDATION_004_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_004_NOT_NEXT = [
  'Do not mutate source spreadsheets, Google Drive permissions, ClickUp tasks, FUB records, or finance ledgers.',
  'Do not run live extraction, paid/provider/browser-auth work, or broad private source reads.',
  'Do not turn Freedom Sheet current process notes into final rebuilt source truth.',
  'Do not treat Owners Dashboard Lists mirror as a write surface.',
  'Do not treat ClickUp as final finance, deal economics, or bonus payout truth.',
  'Do not hardcode live values in strategy docs.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function includesAll(source, tokens = []) {
  const haystack = lower(source)
  return asArray(tokens).every(token => haystack.includes(lower(token)))
}

function sourceRowIsUsable(row = {}) {
  const status = lower(row.status)
  const validation = lower(row.validation)
  return (
    status.includes('signed off') ||
    status.includes('current reality captured') ||
    status.includes('v1 source boundary locked') ||
    status.includes('verified readable')
  ) && (
    validation.includes('signed off') ||
    validation.includes('verified') ||
    validation.includes('readable only')
  )
}

export function evaluateFoundation004Fixture(fixture = {}) {
  const checks = []
  add(checks, fixture.requiredSourceIdsPresent === true, 'required source IDs are present')
  add(checks, fixture.freedomNotFinalTruth === true, 'Freedom is current process map, not final rebuilt source truth')
  add(checks, fixture.ownersListsMirrorBlocked === true, 'Owners Lists mirror is not a write surface')
  add(checks, fixture.clickUpNotFinanceTruth === true, 'ClickUp is workflow/accountability, not final finance truth')
  add(checks, fixture.selfValidationDemoted === true, 'ops self-validation fields are claims, not verified truth')
  add(checks, fixture.unspecifiedQuarantine === true, '<unspecified> is quarantine, not final attribution truth')
  add(checks, fixture.blueprintLayersComplete === true, 'Freedom rebuild blueprint has all target layers')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildFoundation004DogfoodProof() {
  const healthy = evaluateFoundation004Fixture({
    requiredSourceIdsPresent: true,
    freedomNotFinalTruth: true,
    ownersListsMirrorBlocked: true,
    clickUpNotFinanceTruth: true,
    selfValidationDemoted: true,
    unspecifiedQuarantine: true,
    blueprintLayersComplete: true,
  })
  const rejected = {
    missingSourceIds: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: false,
      freedomNotFinalTruth: true,
      ownersListsMirrorBlocked: true,
      clickUpNotFinanceTruth: true,
      selfValidationDemoted: true,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: true,
    }),
    freedomAsFinalTruth: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: true,
      freedomNotFinalTruth: false,
      ownersListsMirrorBlocked: true,
      clickUpNotFinanceTruth: true,
      selfValidationDemoted: true,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: true,
    }),
    ownersMirrorWriteSurface: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: true,
      freedomNotFinalTruth: true,
      ownersListsMirrorBlocked: false,
      clickUpNotFinanceTruth: true,
      selfValidationDemoted: true,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: true,
    }),
    clickUpAsFinanceTruth: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: true,
      freedomNotFinalTruth: true,
      ownersListsMirrorBlocked: true,
      clickUpNotFinanceTruth: false,
      selfValidationDemoted: true,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: true,
    }),
    selfValidationAsVerifiedTruth: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: true,
      freedomNotFinalTruth: true,
      ownersListsMirrorBlocked: true,
      clickUpNotFinanceTruth: true,
      selfValidationDemoted: false,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: true,
    }),
    missingBlueprintLayer: evaluateFoundation004Fixture({
      requiredSourceIdsPresent: true,
      freedomNotFinalTruth: true,
      ownersListsMirrorBlocked: true,
      clickUpNotFinanceTruth: true,
      selfValidationDemoted: true,
      unspecifiedQuarantine: true,
      blueprintLayersComplete: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => !result.ok),
    healthy,
    rejected,
    invariant: 'Operating truth is healthy only when source IDs are explicit, Freedom/Owners/ClickUp roles stay separated, self-validation is demoted to a claim, unresolved attribution is quarantined, and the Freedom rebuild blueprint names every target layer.',
  }
}

export function buildFoundation004Status({
  sourceRows = [],
  sources = {},
} = {}) {
  const checks = []
  const operatingTruths = sources.operatingTruths || ''
  const blueprint = sources.blueprint || ''
  const freedomNote = sources.freedomNote || ''
  const ownersNote = sources.ownersNote || ''
  const clickUpNote = sources.clickUpNote || ''
  const planSource = sources.planSource || ''

  const rowById = new Map(asArray(sourceRows).map(row => [row.source_id || row.sourceId, row]))
  const missingSourceIds = FOUNDATION_004_REQUIRED_SOURCE_IDS.filter(sourceId => !operatingTruths.includes(sourceId))
  const unusableRows = FOUNDATION_004_REQUIRED_SOURCE_IDS
    .map(sourceId => rowById.get(sourceId))
    .filter(row => !sourceRowIsUsable(row))

  add(checks, missingSourceIds.length === 0, 'operating truths cite required signed-off source IDs', missingSourceIds.join(', ') || 'all present')
  add(checks, unusableRows.length === 0, 'required source registry rows are usable current/signed-off truth', unusableRows.map(row => row?.source_id || 'missing').join(', ') || 'all usable')
  add(checks, includesAll(operatingTruths, ['Freedom is current strategy process map', 'not final system-owned truth']), 'operating truths demote Freedom from final rebuilt truth', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['Owners Dashboard Lists mirror', 'not a write surface', 'SRC-OWNERS-LISTS-001']), 'operating truths protect Owners Lists mirror boundary', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['FUB is CRM profile', 'not final deal ledger']), 'operating truths separate FUB from deal ledger truth', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['ClickUp owns workflow', 'not final finance', 'SRC-CLICKUP-001']), 'operating truths separate ClickUp workflow from finance truth', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['claims, not verified truth', 'system-owned validation']), 'operating truths demote ops self-validation fields', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['quarantine, not final attribution truth', '<unspecified>']), 'operating truths lock unresolved attribution quarantine rule', 'docs/strategy/operating-truths.md')
  add(checks, includesAll(operatingTruths, ['Strategy docs own meaning', 'source notes own evidence', 'backlog owns unresolved gaps']), 'operating truths route meaning/evidence/gaps to correct surfaces', 'docs/strategy/operating-truths.md')
  add(checks, FOUNDATION_004_REQUIRED_BLUEPRINT_LAYERS.every(layer => lower(blueprint).includes(lower(layer))), 'Freedom rebuild blueprint includes every target layer', FOUNDATION_004_REQUIRED_BLUEPRINT_LAYERS.join(', '))
  add(checks, includesAll(blueprint, ['source-owned inputs', 'no spreadsheet mutation', 'backlog-owned gaps', 'SRC-FREEDOM-TEAM-001', 'SRC-OWNERS-001', 'SRC-FINANCE-001']), 'Freedom rebuild blueprint records dependencies and not-next boundaries', FOUNDATION_004_BLUEPRINT_PATH)
  add(checks, includesAll(freedomNote, ['Promoted Operating Truths', 'freedom-rebuild-blueprint.md', 'operating-truths.md']), 'Freedom source note points durable interpretation to operating truths and blueprint', 'docs/source-notes/freedom-sheet.md')
  add(checks, includesAll(ownersNote, ['Promoted Operating Truths', 'Owners Dashboard Lists mirror', 'quarantine, not final attribution truth']), 'Owners source note points lineage/list rules to operating truths', 'docs/source-notes/owners-dashboard.md')
  add(checks, includesAll(clickUpNote, ['Promoted Operating Truths', 'workflow/accountability layer', 'not final finance']), 'ClickUp source note points source split to operating truths', 'docs/source-notes/clickup.md')
  add(checks, includesAll(planSource, ['Behavioral Proof', 'dogfood', 'Freedom rebuild blueprint']), 'plan names behavioral proof and rebuild output', FOUNDATION_004_PLAN_PATH)

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: FOUNDATION_004_CARD_ID,
    closeoutKey: FOUNDATION_004_CLOSEOUT_KEY,
    sourceIds: FOUNDATION_004_REQUIRED_SOURCE_IDS,
    checks,
    failed,
  }
}
