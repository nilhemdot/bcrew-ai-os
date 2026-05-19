import {
  validateExistingWorkCheck,
} from './foundation-current-sprint.js'

export const BUILD_LANE_RELIABILITY_CARD_ID = 'BUILD-LANE-RELIABILITY-SPRINT-001'
export const BUILD_LANE_RELIABILITY_SPRINT_ID = 'build-lane-reliability-2026-05-17'
export const BUILD_LANE_RELIABILITY_CLOSEOUT_KEY = 'build-lane-reliability-sprint-v1'
export const BUILD_LANE_RELIABILITY_PLAN_PATH = 'docs/process/build-lane-reliability-sprint-001-plan.md'
export const BUILD_LANE_RELIABILITY_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-RELIABILITY-SPRINT-001.json'
export const BUILD_LANE_RELIABILITY_SCRIPT_PATH = 'scripts/process-build-lane-reliability-sprint-check.mjs'
export const BUILD_LANE_RELIABILITY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-build-lane-reliability-sprint-closeout.md'

export const BUILD_LANE_RELIABILITY_SUBCARDS = [
  {
    id: 'CURRENT-SPRINT-SURFACE-API-DRIFT-001',
    title: 'Fix Current Sprint surface/API drift',
    order: 1,
    summary: 'Make Current Sprint and Recent Work expose live sprint truth from the DB instead of an empty or shape-mismatched payload.',
    whyItMatters: 'Steve and builders need the active build surface to show what is actually in flight.',
  },
  {
    id: 'FOUNDATION-CARD-SCAFFOLD-001',
    title: 'Create Foundation card scaffold guard',
    order: 2,
    summary: 'Create one governed scaffold/check path for Foundation cards and active sprint items.',
    whyItMatters: 'Foundation cards should be born with the required process fields instead of being hand-stitched mid-build.',
  },
  {
    id: 'CURRENT-SPRINT-METADATA-STANDARD-GUARD-001',
    title: 'Guard Current Sprint metadata standard',
    order: 3,
    summary: 'Fail thin active sprint metadata before build starts so missing proof, approval, closeout, existing-work, and no-go fields do not surface late.',
    whyItMatters: 'Missing existing-work, not-next, approval, proof, or closeout fields should not be discovered during final ship.',
  },
  {
    id: 'PROOF-DESIGN-BRITTLENESS-GUARD-001',
    title: 'Guard brittle proof design',
    order: 4,
    summary: 'Standardize proof helpers so constants and proof fixtures do not cause false red checks.',
    whyItMatters: 'Proof should test behavior and contracts, not punish harmless source shape.',
  },
  {
    id: 'VERIFY-LOOP-EFFICIENCY-GUARD-001',
    title: 'Guard verify loop efficiency',
    order: 5,
    summary: 'Flag repeated full verifier loops while focused proof is still red.',
    whyItMatters: 'The build lane should spend time building, not rerunning the slowest gate after every tiny edit.',
  },
  {
    id: 'SHIP-GATE-SERVED-CODE-FANOUT-SYNC-001',
    title: 'Guard served-code fanout sync',
    order: 6,
    summary: 'Diagnose stale served-code or Recent Builds API drift before fanout becomes a manual mystery.',
    whyItMatters: 'A local closeout that is not visible in the served API should fail with a clear repair path.',
  },
]

export const BUILD_LANE_RELIABILITY_CARD_IDS = [
  BUILD_LANE_RELIABILITY_CARD_ID,
  ...BUILD_LANE_RELIABILITY_SUBCARDS.map(card => card.id),
]

export const BUILD_LANE_RELIABILITY_NOT_NEXT_BOUNDARIES = [
  'No extractor work, connector work, OAuth, or auth-required extraction.',
  'No Harlan, Fal, voice, Canva, OpenHuman, Foundation UI polish, or root splitting.',
  'Do not rerun the live Agent Feedback auto-send job.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
]

export const BUILD_LANE_RELIABILITY_PROOF_COMMANDS = [
  'npm run process:build-lane-reliability-sprint-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${BUILD_LANE_RELIABILITY_CARD_ID} --planApprovalRef=${BUILD_LANE_RELIABILITY_APPROVAL_PATH} --closeoutKey=${BUILD_LANE_RELIABILITY_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const BUILD_LANE_RELIABILITY_CHANGED_FILES = [
  'lib/build-lane-reliability.js',
  'lib/hub-read-routes.js',
  'lib/foundation-current-sprint-verifier.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-build-lane-reliability-sprint-check.mjs',
  'package.json',
  BUILD_LANE_RELIABILITY_PLAN_PATH,
  BUILD_LANE_RELIABILITY_APPROVAL_PATH,
  BUILD_LANE_RELIABILITY_CLOSEOUT_PATH,
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

export function buildBuildLaneExistingWorkCheck(overrides = {}) {
  return {
    existingCode: 'Reuse Current Sprint, backlog, Plan Critic, process write guard, fanout, ship gate, and verifier modules.',
    existingDocs: 'Reuse Foundation sprint system, gate decision tree, payload budget, and source-contract closeout lessons.',
    existingScripts: 'Reuse backlog hygiene, focused proof scripts, approval integrity, foundation verify, and process:foundation-ship.',
    existingPolicy: 'Build-lane work is Foundation process work; no extractor, connector, auth, Harlan, Fal, voice, Canva, or Drive mutation.',
    reused: 'Existing DB-backed backlog/current-sprint tables, plan_critic_runs, change_events, and process gates.',
    notRebuilt: 'No second backlog, new UI framework, connector runtime, auth flow, or root split.',
    exactGap: 'Foundation cards and sprint items are still assembled by hand, so thin metadata and brittle proof patterns waste build time.',
    overBroadRisk: 'Could drift into extractor work, UI polish, Harlan/tooling, or broad process rewrite.',
    readyBy: 'Steve explicitly approved BUILD-LANE-RELIABILITY-SPRINT-001 as P0 reset after source-contract sprint drag.',
    readyAt: '2026-05-17T15:20:00-04:00',
    ...overrides,
  }
}

export function validateBuildLaneCardScaffold(card = {}) {
  const missing = []
  if (!text(card.id)) missing.push('id')
  if (!text(card.title)) missing.push('title')
  if (!['foundation', 'dev'].includes(text(card.scope || card.team))) missing.push('scope')
  if (!['scoped', 'executing', 'done'].includes(text(card.lane))) missing.push('lane')
  if (text(card.priority) !== 'P0') missing.push('priority=P0')
  if (text(card.summary).length < 60) missing.push('summary')
  if (text(card.whyItMatters).length < 60) missing.push('whyItMatters')
  if (text(card.nextAction).length < 40) missing.push('nextAction')
  if (!text(card.owner)) missing.push('owner')
  return {
    ok: missing.length === 0,
    missing,
    cardId: text(card.id),
  }
}

export function validateBuildLaneSprintItemMetadata(item = {}) {
  const missing = []
  const existingWork = validateExistingWorkCheck(item.existingWorkCheck || {})
  if (!text(item.cardId || item.backlogId)) missing.push('cardId')
  if (!Number.isFinite(Number(item.order ?? item.sprintOrder)) || Number(item.order ?? item.sprintOrder) < 1) missing.push('order')
  if (!['scoping', 'sprint_ready', 'building_now', 'returned', 'done_this_sprint'].includes(text(item.stage))) missing.push('stage')
  if (!text(item.planRef)) missing.push('planRef')
  if (!text(item.definitionOfDone)) missing.push('definitionOfDone')
  if (!list(item.proofCommands).length) missing.push('proofCommands')
  if (!list(item.notNextBoundaries).length) missing.push('notNextBoundaries')
  if (!text(item.metadata?.approvalRef)) missing.push('metadata.approvalRef')
  if (!text(item.metadata?.closeoutKey)) missing.push('metadata.closeoutKey')
  if (!existingWork.ok) missing.push(...existingWork.missingFields.map(field => `existingWorkCheck.${field}`))
  const notNextText = list(item.notNextBoundaries).join('\n')
  if (!/MEETING-VAULT-ACL-001 Phase B/.test(notNextText)) missing.push('Meeting Vault Phase B guard')
  if (!/Drive permissions/.test(notNextText)) missing.push('Drive permissions guard')
  return {
    ok: missing.length === 0,
    missing,
    existingWork,
  }
}

export function sourceReferencesCardId({
  source = '',
  cardId = '',
  constantNames = [],
  constantValues = {},
} = {}) {
  const normalizedCardId = text(cardId)
  if (!normalizedCardId) return false
  if (String(source || '').includes(normalizedCardId)) return true
  return list(constantNames).some(name =>
    String(source || '').includes(name) &&
      text(constantValues[name]) === normalizedCardId
  )
}

export function scanForbiddenRuntimeJobs(files = []) {
  const findings = []
  const forbiddenPatterns = [
    /agent-feedback-auto-send-readiness/i,
    /agent-feedback-auto-send/i,
    /gmail[^a-z0-9]+send/i,
    /clickup[^a-z0-9]+write/i,
  ]
  for (const file of list(files)) {
    const filePath = text(file.path)
    const source = String(file.source || '')
    const proofOrFixture = /(^|\/)scripts\/process-.*-check\.mjs$/.test(filePath) ||
      /buildLaneForbiddenPatternFixture/.test(source)
    if (proofOrFixture) continue
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(source)) findings.push({ path: filePath, pattern: String(pattern) })
    }
  }
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function evaluateVerifyLoopEfficiency(events = []) {
  const normalized = list(events).map(event => ({
    type: text(event.type),
    status: text(event.status),
    target: text(event.target),
  }))
  const firstFocusedGreenIndex = normalized.findIndex(event =>
    event.type === 'focused-proof' && event.status === 'pass'
  )
  const fullBeforeFocusedGreen = normalized
    .map((event, index) => ({ event, index }))
    .filter(row => row.event.type === 'foundation-verify-full' && (firstFocusedGreenIndex < 0 || row.index < firstFocusedGreenIndex))
  const repeatedFullBeforeFocusedGreen = fullBeforeFocusedGreen.length > 1
  const invalidFailuresOnly = normalized.some((event, index) => {
    if (event.type !== 'foundation-verify-failures-only') return false
    return !normalized.slice(0, index).some(previous =>
      previous.type === 'foundation-verify-full' && previous.status === 'fail'
    )
  })
  return {
    ok: !repeatedFullBeforeFocusedGreen && !invalidFailuresOnly,
    repeatedFullBeforeFocusedGreen,
    invalidFailuresOnly,
    fullBeforeFocusedGreenCount: fullBeforeFocusedGreen.length,
  }
}

export function evaluateCurrentSprintSurfaceAlignment({
  dbSprint = {},
  apiPayload = {},
  hubPayload = {},
} = {}) {
  const dbItems = list(dbSprint.items)
  const nestedApi = apiPayload.currentSprint || apiPayload
  const apiItems = list(apiPayload.items).length ? list(apiPayload.items) : list(nestedApi.items)
  const hubCurrentSprint = hubPayload.currentSprint || {}
  const hubItems = list(hubCurrentSprint.items)
  const dbIds = dbItems.map(item => text(item.cardId)).filter(Boolean).sort()
  const apiIds = apiItems.map(item => text(item.cardId)).filter(Boolean).sort()
  const hubIds = hubItems.map(item => text(item.cardId)).filter(Boolean).sort()
  const topLevelCompatible = Boolean(apiPayload.sprint || apiPayload.sprintId) && list(apiPayload.items).length === dbItems.length
  return {
    ok: dbIds.length > 0 &&
      dbIds.join(',') === apiIds.join(',') &&
      dbIds.join(',') === hubIds.join(',') &&
      topLevelCompatible,
    dbIds,
    apiIds,
    hubIds,
    topLevelCompatible,
  }
}

export function classifyShipGateFanoutSync({
  localHead = '',
  servedCommit = '',
  localCloseoutExists = false,
  recentBuildsExposeCloseout = false,
} = {}) {
  if (!localCloseoutExists) {
    return { ok: false, status: 'missing_local_closeout', action: 'Add the closeout registry record before fanout.' }
  }
  if (text(localHead) && text(servedCommit) && text(localHead) !== text(servedCommit)) {
    return { ok: false, status: 'stale_served_code', action: 'Restart dashboard/worker, then retry fanout once served commit equals HEAD.' }
  }
  if (!recentBuildsExposeCloseout) {
    return { ok: false, status: 'served_recent_builds_missing_closeout', action: 'Refresh served Recent Builds after commit; if still missing, repair build-log registry wiring.' }
  }
  return { ok: true, status: 'synced', action: 'Fanout can proceed.' }
}

export function buildBuildLaneReliabilityDogfoodProof() {
  const completeCard = validateBuildLaneCardScaffold({
    id: 'DOGFOOD-CARD-001',
    title: 'Dogfood card',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    summary: 'A complete dogfood card with enough context to prove scaffold validation accepts healthy cards.',
    whyItMatters: 'The build lane needs cards with real operator value and not just thin labels.',
    nextAction: 'Use this synthetic card only to prove the scaffold validator accepts complete cards.',
    owner: 'Codex',
  })
  const thinCard = validateBuildLaneCardScaffold({
    id: 'DOGFOOD-CARD-002',
    title: 'Thin',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    summary: 'Too thin.',
    whyItMatters: '',
    nextAction: '',
    owner: '',
  })
  const completeItem = validateBuildLaneSprintItemMetadata({
    cardId: 'DOGFOOD-CARD-001',
    order: 1,
    stage: 'building_now',
    planRef: BUILD_LANE_RELIABILITY_PLAN_PATH,
    definitionOfDone: 'Focused proof and ship gate pass.',
    proofCommands: BUILD_LANE_RELIABILITY_PROOF_COMMANDS,
    notNextBoundaries: BUILD_LANE_RELIABILITY_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildBuildLaneExistingWorkCheck(),
    metadata: {
      approvalRef: BUILD_LANE_RELIABILITY_APPROVAL_PATH,
      closeoutKey: BUILD_LANE_RELIABILITY_CLOSEOUT_KEY,
    },
  })
  const thinItem = validateBuildLaneSprintItemMetadata({
    cardId: 'DOGFOOD-CARD-002',
    order: 2,
    stage: 'building_now',
    existingWorkCheck: {},
    notNextBoundaries: [],
    metadata: {},
  })
  const constantCoverage = sourceReferencesCardId({
    source: 'import { DOGFOOD_CARD_ID } from "./cards.js"; checks.push(DOGFOOD_CARD_ID)',
    cardId: 'DOGFOOD-CARD-001',
    constantNames: ['DOGFOOD_CARD_ID'],
    constantValues: { DOGFOOD_CARD_ID: 'DOGFOOD-CARD-001' },
  })
  const missingCoverage = sourceReferencesCardId({
    source: 'checks.push("other")',
    cardId: 'DOGFOOD-CARD-001',
    constantNames: ['DOGFOOD_CARD_ID'],
    constantValues: { DOGFOOD_CARD_ID: 'DOGFOOD-CARD-001' },
  })
  const proofFixtureScan = scanForbiddenRuntimeJobs([
    {
      path: 'scripts/process-build-lane-reliability-sprint-check.mjs',
      source: 'const buildLaneForbiddenPatternFixture = "agent-feedback-auto-send-readiness"',
    },
  ])
  const runtimeForbiddenScan = scanForbiddenRuntimeJobs([
    {
      path: 'scripts/foundation-worker.mjs',
      source: 'runJob("agent-feedback-auto-send-readiness")',
    },
  ])
  const efficientLoop = evaluateVerifyLoopEfficiency([
    { type: 'focused-proof', status: 'fail' },
    { type: 'targeted-check', status: 'pass' },
    { type: 'focused-proof', status: 'pass' },
    { type: 'process-foundation-ship', status: 'pass' },
  ])
  const wasteLoop = evaluateVerifyLoopEfficiency([
    { type: 'focused-proof', status: 'fail' },
    { type: 'foundation-verify-full', status: 'fail' },
    { type: 'foundation-verify-full', status: 'fail' },
    { type: 'focused-proof', status: 'pass' },
  ])
  const staleFanout = classifyShipGateFanoutSync({
    localHead: 'abc123',
    servedCommit: 'old999',
    localCloseoutExists: true,
    recentBuildsExposeCloseout: false,
  })
  const missingCloseout = classifyShipGateFanoutSync({
    localHead: 'abc123',
    servedCommit: 'abc123',
    localCloseoutExists: false,
    recentBuildsExposeCloseout: false,
  })
  const syncedFanout = classifyShipGateFanoutSync({
    localHead: 'abc123',
    servedCommit: 'abc123',
    localCloseoutExists: true,
    recentBuildsExposeCloseout: true,
  })
  const ok = completeCard.ok &&
    thinCard.ok === false &&
    completeItem.ok &&
    thinItem.ok === false &&
    constantCoverage === true &&
    missingCoverage === false &&
    proofFixtureScan.ok === true &&
    runtimeForbiddenScan.ok === false &&
    efficientLoop.ok === true &&
    wasteLoop.ok === false &&
    staleFanout.status === 'stale_served_code' &&
    missingCloseout.status === 'missing_local_closeout' &&
    syncedFanout.ok === true
  return {
    ok,
    completeCard,
    thinCard,
    completeItem,
    thinItem,
    constantCoverage,
    missingCoverage,
    proofFixtureScan,
    runtimeForbiddenScan,
    efficientLoop,
    wasteLoop,
    staleFanout,
    missingCloseout,
    syncedFanout,
    invariant: 'Complete scaffold passes; thin card/item fail; constant coverage passes; proof regex fixtures are ignored; runtime forbidden jobs fail; verify-loop waste fails; fanout drift is classified.',
  }
}

export function evaluateBuildLaneReliabilitySprint({
  cards = [],
  sprint = {},
  apiPayload = {},
  hubPayload = {},
  closeoutRecordsSource = '',
  packageJson = {},
  proofScriptSource = '',
  routeSource = '',
  verifierSource = '',
  coverageSource = '',
} = {}) {
  const checks = []
  const cardMap = new Map(list(cards).map(card => [card.id, card]))
  const missingCards = BUILD_LANE_RELIABILITY_CARD_IDS.filter(id => !cardMap.has(id))
  const scaffoldResults = BUILD_LANE_RELIABILITY_CARD_IDS.map(id => validateBuildLaneCardScaffold(cardMap.get(id) || { id }))
  const sprintItems = list(sprint.items)
  const sprintItemResults = sprintItems.map(validateBuildLaneSprintItemMetadata)
  const dogfood = buildBuildLaneReliabilityDogfoodProof()
  const surface = evaluateCurrentSprintSurfaceAlignment({
    dbSprint: sprint,
    apiPayload,
    hubPayload,
  })

  addCheck(checks, missingCards.length === 0, 'all reliability live backlog cards exist', missingCards.join(', ') || 'complete')
  addCheck(checks, scaffoldResults.every(result => result.ok), 'all reliability cards pass scaffold validation', scaffoldResults.filter(result => !result.ok).map(result => `${result.cardId}:${result.missing.join(',')}`).join('; ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === BUILD_LANE_RELIABILITY_SPRINT_ID, 'active sprint is the build-lane reliability sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItems.length === BUILD_LANE_RELIABILITY_CARD_IDS.length, 'active sprint carries umbrella plus six reliability items', `${sprintItems.length}/${BUILD_LANE_RELIABILITY_CARD_IDS.length}`)
  addCheck(checks, sprintItemResults.every(result => result.ok), 'active sprint items carry full metadata standard', sprintItemResults.filter(result => !result.ok).map(result => result.missing.join(',')).join('; ') || 'complete')
  addCheck(checks, surface.ok, 'Current Sprint API and Hub expose DB truth with top-level compatibility fields', JSON.stringify(surface))
  addCheck(checks, dogfood.ok, 'build-lane reliability dogfood rejects the observed failure modes', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:build-lane-reliability-sprint-check'] === `node --env-file-if-exists=.env ${BUILD_LANE_RELIABILITY_SCRIPT_PATH}`, 'package exposes focused reliability proof', packageJson.scripts?.['process:build-lane-reliability-sprint-check'] || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(BUILD_LANE_RELIABILITY_CLOSEOUT_KEY) && closeoutRecordsSource.includes(BUILD_LANE_RELIABILITY_CARD_ID), 'closeout registry includes reliability sprint', BUILD_LANE_RELIABILITY_CLOSEOUT_KEY)
  addCheck(checks, includesAll(routeSource, ['sprint: currentSprint', 'items: currentSprint.items']), 'current-sprint route exposes compatibility fields', 'top-level sprint/items fields')
  addCheck(checks, verifierSource.includes('sprint: currentSprint') && verifierSource.includes('items: currentSprint.items'), 'verifier requires current-sprint compatibility fields', 'foundation-current-sprint verifier')
  addCheck(checks, coverageSource.includes('BUILD_LANE_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include reliability sprint', 'coverage constant')
  addCheck(checks, scanForbiddenRuntimeJobs([{ path: BUILD_LANE_RELIABILITY_SCRIPT_PATH, source: proofScriptSource }]).ok, 'focused proof does not schedule forbidden runtime jobs', 'proof script is fixture-safe/read-only by default')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      cardCount: BUILD_LANE_RELIABILITY_CARD_IDS.length,
      sprintItemCount: sprintItems.length,
      surface,
      dogfoodOk: dogfood.ok,
    },
  }
}
