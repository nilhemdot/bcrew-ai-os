import {
  HUB_WORK_CHECK_SCRIPT_PATH,
  HUB_WORK_COORDINATION_APPROVAL_PATH,
  HUB_WORK_COORDINATION_CARD_ID,
  HUB_WORK_COORDINATION_CLOSEOUT_KEY,
  HUB_WORK_COORDINATION_PLAN_PATH,
  HUB_WORK_HANDOFF_TEMPLATE_PATH,
  HUB_WORK_OWNERSHIP_MATRIX_PATH,
  HUB_WORK_PROMPT_TEMPLATE_PATH,
  HUB_WORK_PROTOCOL_PATH,
  buildHubWorkDogfoodProof,
  loadHubWorkOwnershipMatrix,
} from './hub-work-check.js'
import {
  FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS,
  FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY,
  FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID,
  buildHubConsumerContract,
  buildHubConsumerFixture,
  validateHubConsumerContractPayload,
} from './hub-consumer-contract.js'
import {
  buildConnectorUptimeSnapshot,
} from './connector-uptime-monitor.js'
import {
  FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY,
  FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION,
  buildFoundationHubBacklogContract,
  buildFoundationHubBacklogContractDogfoodProof,
  validateFoundationHubBacklogContract,
} from './foundation-hub-backlog-contract.js'
import {
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SPRINT_ID,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION,
  buildFoundationHubPayloadBudgetV2DogfoodProof,
  evaluateFoundationHubPayloadBudgetV2,
} from './foundation-hub-payload-budget-v2.js'
import {
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION,
  buildFoundationBacklogDetailEndpointDogfoodProof,
  buildFoundationBacklogDetailPayload,
  validateFoundationBacklogDetailPayload,
} from './foundation-backlog-detail.js'

export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID = 'VERIFIER-HUB-SAFETY-SPLIT-MODULE-001'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-hub-safety-split-module-v1'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-hub-safety-split-module-001-plan.md'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-HUB-SAFETY-SPLIT-MODULE-001.json'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-hub-safety-split-module-check.mjs'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_SPRINT_ID = 'verifier-hub-safety-split-module-2026-05-16'
export const VERIFIER_HUB_SAFETY_SPLIT_MODULE_BEFORE_LINES = 12923

export const FOUNDATION_HUB_SAFETY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = Object.freeze([
  ...FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS,
  FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
])

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summarizeChecks(checks = []) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function includesAll(text = '', values = []) {
  return values.every(value => String(text || '').includes(value))
}

function findCard(foundationHub = {}, cardId = '') {
  return (foundationHub.backlogItems || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], key = '') {
  return (Array.isArray(closeouts) ? closeouts : []).find(closeout => closeout.key === key) || null
}

async function fileExists(input, relativePath) {
  if (typeof input.repoFileExists === 'function') return input.repoFileExists(relativePath)
  return false
}

function activeSprintAtOrPast(input, cardIds = []) {
  if (typeof input.activeSprintAtOrPast === 'function') return input.activeSprintAtOrPast(cardIds)
  const activeId = input.activeFoundationSprint?.sprint?.activeBlockerCardId || null
  if (cardIds.includes(activeId)) return true
  return (Array.isArray(cardIds) ? cardIds : []).every(cardId => findCard(input.foundationHub, cardId)?.lane === 'done')
}

export function buildFoundationHubSafetyVerifierDogfoodProof({ matrix = null } = {}) {
  const knownCardIds = [
    HUB_WORK_COORDINATION_CARD_ID,
    'MARKETING-VIDEO-LAB-OWNER-ROUTE-INTEGRATION-001',
  ]
  const hubWorkHealthy = buildHubWorkDogfoodProof({ matrix, knownCardIds })
  const missingMatrix = buildHubWorkDogfoodProof({ matrix: {}, knownCardIds })
  const validHubContract = validateHubConsumerContractPayload(buildHubConsumerFixture({ hubKey: 'sales' }))
  const invalidHubContract = validateHubConsumerContractPayload({
    ...buildHubConsumerFixture({ hubKey: 'sales' }),
    readOnly: false,
    mutationPosture: 'write_capable',
  })
  const bloatedBacklog = [{
    id: 'SYNTHETIC-HUB-SAFETY-BLOAT-001',
    title: 'Synthetic bloat',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 1,
    source: 'synthetic',
    summary: 'x'.repeat(5000),
    nextAction: 'x'.repeat(5000),
    statusNote: 'x'.repeat(5000),
  }]
  const compactBacklog = buildFoundationHubBacklogContract({ backlogItems: bloatedBacklog })
  const compactBacklogValidation = validateFoundationHubBacklogContract(compactBacklog)
  const payloadBudgetV2Dogfood = buildFoundationHubPayloadBudgetV2DogfoodProof()
  const brokenBacklogValidation = validateFoundationHubBacklogContract({
    backlogItems: bloatedBacklog,
    backlogContract: {
      contractVersion: 'broken',
      totalItems: 1,
      defaultItemCount: 1,
      rowContract: { requiredFields: ['id', 'title'] },
      fullPayloadCompacted: false,
    },
  })
  const detailDogfood = buildFoundationBacklogDetailEndpointDogfoodProof()
  const missingDetailValidation = validateFoundationBacklogDetailPayload(
    buildFoundationBacklogDetailPayload({ cardId: 'SYNTHETIC-HUB-SAFETY-BLOAT-001', backlogItems: [] }),
  )
  const missingDelegation = evaluateFoundationHubSafetySplitSource({
    foundationVerifySource: '',
    moduleSource: '',
    proofScriptSource: '',
    planSource: '',
    packageScripts: {},
  })

  return {
    ok: hubWorkHealthy.ok === true &&
      missingMatrix.ok === false &&
      validHubContract.ok === true &&
      invalidHubContract.ok === false &&
      compactBacklogValidation.ok === true &&
      compactBacklog.backlogContract.payload.compactRowsBytes < compactBacklog.backlogContract.payload.fullRowsBytes &&
      payloadBudgetV2Dogfood.ok === true &&
      brokenBacklogValidation.ok === false &&
      detailDogfood.ok === true &&
      missingDetailValidation.ok === false &&
      missingDelegation.ok === false,
    hubWorkHealthy,
    missingMatrix,
    validHubContract,
    invalidHubContract,
    compactBacklogValidation,
    payloadBudgetV2Dogfood,
    brokenBacklogValidation,
    detailDogfood,
    missingDetailValidation,
    missingDelegation,
  }
}

export function evaluateFoundationHubSafetySplitSource({
  foundationVerifySource = '',
  moduleSource = '',
  proofScriptSource = '',
  planSource = '',
  packageScripts = {},
} = {}) {
  const checks = []
  addCheck(
    checks,
    foundationVerifySource.includes('evaluateFoundationHubSafetyVerifier') &&
      foundationVerifySource.includes('buildFoundationHubSafetyVerifierDogfoodProof') &&
      !foundationVerifySource.includes('HUB-001 coordinates hub chats without weakening Foundation/process ownership'),
    'root verifier delegates hub-safety checks without keeping old inline predicates',
    foundationVerifySource.includes('evaluateFoundationHubSafetyVerifier') ? 'delegate present' : 'delegate missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
      'buildFoundationHubSafetyVerifierDogfoodProof',
      'evaluateFoundationHubSafetyVerifier',
      'HUB_WORK_COORDINATION_CARD_ID',
      'FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID',
      'FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID',
    ]),
    'hub-safety verifier module names card, dogfood, and moved proof domains',
    moduleSource.includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID) ? 'module markers present' : 'module markers missing',
  )
  addCheck(
    checks,
    includesAll(proofScriptSource, [
      'process:verifier-hub-safety-split-module-check',
      'missing ownership matrix dogfood fails closed',
      'missing root delegation is rejected',
    ]) &&
      packageScripts['process:verifier-hub-safety-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH}`,
    'hub-safety verifier focused proof and package command are registered',
    packageScripts['process:verifier-hub-safety-split-module-check'] || 'missing package script',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
      'full gate',
      'No hub UI work',
      'No Drive permission mutation',
    ]),
    'hub-safety verifier plan keeps full gate and not-next boundaries',
    planSource.includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID) ? 'plan present' : 'plan missing',
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summarizeChecks(checks),
  }
}

export async function evaluateFoundationHubSafetyVerifier(input = {}) {
  const checks = []
  const repoRoot = input.repoRoot || process.cwd()
  const foundationHub = input.foundationHub || {}
  const foundationBuildCloseouts = input.foundationBuildCloseouts || []
  const packageScripts = input.packageScripts || input.packageJson?.scripts || {}
  const foundationVerifySource = `${input.foundationVerifySource || ''}\n${input.moduleSource || ''}`
  const hubWorkCoordinationCloseout = findCloseout(foundationBuildCloseouts, HUB_WORK_COORDINATION_CLOSEOUT_KEY)
  const foundationReadySafeHubLaneCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY)
  const foundationHubBacklogContractCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY)
  const foundationHubPayloadBudgetV2Closeout = findCloseout(foundationBuildCloseouts, FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY)
  const foundationBacklogDetailEndpointCloseout = findCloseout(foundationBuildCloseouts, FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY)
  const hubWorkCoordinationCard = findCard(foundationHub, HUB_WORK_COORDINATION_CARD_ID)
  const hubWorkOwnershipMatrix = input.hubWorkOwnershipMatrix || await loadHubWorkOwnershipMatrix({ repoRoot })
  const hubWorkDogfood = buildHubWorkDogfoodProof({
    matrix: hubWorkOwnershipMatrix,
    knownCardIds: (foundationHub.backlogItems || []).map(item => item.id),
  })

  addCheck(
    checks,
    hubWorkCoordinationCard &&
      ['scoped', 'done'].includes(hubWorkCoordinationCard.lane) &&
      String(hubWorkCoordinationCard.statusNote || '').includes(HUB_WORK_COORDINATION_CLOSEOUT_KEY) &&
      hubWorkCoordinationCloseout?.operatorCloseout === true &&
      (hubWorkCoordinationCloseout.backlogIds || []).includes(HUB_WORK_COORDINATION_CARD_ID) &&
      hubWorkOwnershipMatrix?.schemaVersion === 1 &&
      hubWorkOwnershipMatrix?.hubs?.sales &&
      hubWorkOwnershipMatrix?.hubs?.ops &&
      hubWorkOwnershipMatrix?.hubs?.strategy &&
      hubWorkDogfood.ok === true &&
      packageScripts['process:hub-work-check'] === `node --env-file-if-exists=.env ${HUB_WORK_CHECK_SCRIPT_PATH}` &&
      await fileExists(input, HUB_WORK_COORDINATION_PLAN_PATH) &&
      await fileExists(input, HUB_WORK_COORDINATION_APPROVAL_PATH) &&
      await fileExists(input, HUB_WORK_PROTOCOL_PATH) &&
      await fileExists(input, HUB_WORK_OWNERSHIP_MATRIX_PATH) &&
      await fileExists(input, HUB_WORK_PROMPT_TEMPLATE_PATH) &&
      await fileExists(input, HUB_WORK_HANDOFF_TEMPLATE_PATH) &&
      foundationVerifySource.includes(HUB_WORK_COORDINATION_CARD_ID) &&
      foundationVerifySource.includes('HUB_WORK_COORDINATION_SPRINT_ID') &&
      foundationVerifySource.includes('buildHubWorkDogfoodProof'),
    'HUB-001 coordinates hub chats without weakening Foundation/process ownership',
    hubWorkCoordinationCard
      ? `lane=${hubWorkCoordinationCard.lane} dogfood=${hubWorkDogfood.ok ? 'pass' : 'fail'} cases=${hubWorkDogfood.cases.length}`
      : `missing ${HUB_WORK_COORDINATION_CARD_ID}`,
  )

  const foundationReadySafeHubLaneCards = FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS
    .map(id => findCard(foundationHub, id))
  const fixtureValidations = ['sales', 'ops', 'marketing', 'strategy'].map(hubKey =>
    validateHubConsumerContractPayload(buildHubConsumerFixture({ hubKey }))
  )
  const connectorUptime = input.connectorUptime || buildConnectorUptimeSnapshot()
  const liveValidations = ['sales', 'ops', 'marketing', 'strategy'].map(hubKey =>
    validateHubConsumerContractPayload(buildHubConsumerContract({
      hubKey,
      connectorUptime,
    }))
  )
  addCheck(
    checks,
    foundationReadySafeHubLaneCards.every(card =>
      card &&
        card.lane === 'done' &&
        String(card.statusNote || '').includes(FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY)
    ) &&
      foundationReadySafeHubLaneCloseout?.operatorCloseout === true &&
      includesAll(foundationReadySafeHubLaneCloseout.backlogIds || [], FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS) &&
      fixtureValidations.every(validation => validation.ok) &&
      liveValidations.every(validation => validation.ok) &&
      hubWorkDogfood.cases.some(testCase =>
        testCase.name === 'hub shared-file request stops for main-session integration' &&
        testCase.ok === true &&
        testCase.actualIntegrationRequired === true
      ) &&
      packageScripts['process:foundation-ready-safe-hub-lane-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-ready-safe-hub-lane-check.mjs' &&
      await fileExists(input, 'lib/hub-consumer-contract.js') &&
      await fileExists(input, 'docs/process/hub-consumer-contract.md') &&
      await fileExists(input, 'docs/process/hub-sandbox-workflow.md') &&
      await fileExists(input, 'fixtures/hubs/marketing/foundation-source-health.json') &&
      await fileExists(input, 'scripts/process-foundation-ready-safe-hub-lane-check.mjs') &&
      String(input.currentPlan || '').includes(FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY) &&
      String(input.currentState || '').includes(FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY) &&
      (input.activeFoundationSprint?.sprint?.sprintId === FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID ||
        activeSprintAtOrPast(input, FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS)) &&
      includesAll(foundationVerifySource, FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS),
    'Foundation Ready Safe Hub Lane lets hubs consume read-only source health without shared-file drift',
    foundationReadySafeHubLaneCards.every(Boolean)
      ? `cards=${foundationReadySafeHubLaneCards.map(card => `${card.id}:${card.lane}`).join(', ')} fixtures=${fixtureValidations.every(validation => validation.ok)} live=${liveValidations.every(validation => validation.ok)}`
      : `missing ${FOUNDATION_READY_SAFE_HUB_LANE_CARD_IDS.filter((id, index) => !foundationReadySafeHubLaneCards[index]).join(', ')}`,
  )

  const foundationHubBacklogContractCard = findCard(foundationHub, FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID)
  const foundationHubBacklogContractDogfood = buildFoundationHubBacklogContractDogfoodProof()
  const foundationHubBacklogRouteValidation = validateFoundationHubBacklogContract({
    backlogItems: input.foundationHubSummary?.backlogItems || [],
    backlogContract: input.foundationHubSummary?.backlogContract || {},
  })
  const foundationHubBacklogContractDoneIds = [
    FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
  ]
  addCheck(
    checks,
    foundationHubBacklogContractCard &&
      foundationHubBacklogContractCard.lane === 'done' &&
      String(foundationHubBacklogContractCard.statusNote || '').includes(FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY) &&
      foundationHubBacklogContractCloseout?.operatorCloseout === true &&
      includesAll(foundationHubBacklogContractCloseout.backlogIds || [], foundationHubBacklogContractDoneIds) &&
      foundationHubBacklogContractDogfood.ok === true &&
      foundationHubBacklogRouteValidation.ok === true &&
      input.foundationHubSummary?.backlogContract?.contractVersion === FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION &&
      input.foundationHubSummary?.backlogContract?.fullPayloadCompacted === true &&
      Number(input.foundationHubSummary?.foundationHubPerformance?.payloadBytes || 0) < FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES &&
      packageScripts['process:foundation-hub-backlog-contract-check'] === `node --env-file-if-exists=.env ${FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH}` &&
      String(input.currentPlan || '').includes(FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY) &&
      String(input.currentState || '').includes(FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY) &&
      (input.activeFoundationSprint?.sprint?.sprintId === FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID ||
        activeSprintAtOrPast(input, foundationHubBacklogContractDoneIds)) &&
      includesAll(foundationVerifySource, foundationHubBacklogContractDoneIds),
    'Foundation Hub default backlog payload uses a thin contract while full diagnostics keep detail',
    foundationHubBacklogContractCard
      ? `lane=${foundationHubBacklogContractCard.lane} dogfood=${foundationHubBacklogContractDogfood.ok ? 'pass' : 'blocked'} routeRows=${input.foundationHubSummary?.backlogItems?.length || 0} bytes=${input.foundationHubSummary?.foundationHubPerformance?.payloadBytes || 'missing'}`
      : `missing ${FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID}`,
  )

  const foundationHubPayloadBudgetV2Card = findCard(foundationHub, FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID)
  const foundationHubPayloadBudgetV2Dogfood = buildFoundationHubPayloadBudgetV2DogfoodProof()
  const foundationHubPayloadBudgetV2Evaluation = evaluateFoundationHubPayloadBudgetV2({
    payload: input.foundationHubSummary || {},
    mode: input.foundationHubSummary?.foundationHubPerformance?.mode || 'summary',
    durationMs: input.foundationHubSummary?.foundationHubPerformance?.durationMs || 0,
    payloadBytes: input.foundationHubSummary?.foundationHubPerformance?.payloadBytes || 0,
  })
  const foundationHubPayloadBudgetV2Closed = foundationHubPayloadBudgetV2Card?.lane === 'done'
  const foundationHubPayloadBudgetV2CloseoutOk = !foundationHubPayloadBudgetV2Closed ||
    (
      String(foundationHubPayloadBudgetV2Card.statusNote || '').includes(FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY) &&
      foundationHubPayloadBudgetV2Closeout?.operatorCloseout === true &&
      (foundationHubPayloadBudgetV2Closeout.backlogIds || []).includes(FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID)
    )
  addCheck(
    checks,
    foundationHubPayloadBudgetV2Card &&
      ['executing', 'done'].includes(foundationHubPayloadBudgetV2Card.lane) &&
      foundationHubPayloadBudgetV2CloseoutOk &&
      foundationHubPayloadBudgetV2Dogfood.ok === true &&
      foundationHubPayloadBudgetV2Evaluation.status === 'healthy' &&
      input.foundationHubSummary?.foundationHubPayloadBudgetV2?.budgetVersion === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION &&
      input.foundationHubSummary?.foundationHubPayloadBudgetV2?.status === 'healthy' &&
      packageScripts['process:foundation-hub-payload-budget-v2-check'] === `node --env-file-if-exists=.env ${FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH}` &&
      (input.activeFoundationSprint?.sprint?.sprintId === FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SPRINT_ID ||
        activeSprintAtOrPast(input, [FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID])) &&
      includesAll(foundationVerifySource, [
        FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
        'buildFoundationHubPayloadBudgetV2DogfoodProof',
        'evaluateFoundationHubPayloadBudgetV2',
      ]),
    'Foundation Hub payload budget V2 keeps summary payload stable without hiding backlog rows',
    foundationHubPayloadBudgetV2Card
      ? `lane=${foundationHubPayloadBudgetV2Card.lane} dogfood=${foundationHubPayloadBudgetV2Dogfood.ok ? 'pass' : 'blocked'} route=${foundationHubPayloadBudgetV2Evaluation.measured.payloadBytes}B status=${foundationHubPayloadBudgetV2Evaluation.status}`
      : `missing ${FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID}`,
  )

  const foundationBacklogDetailEndpointCard = findCard(foundationHub, FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID)
  const foundationBacklogDetailEndpointDogfood = buildFoundationBacklogDetailEndpointDogfoodProof()
  const foundationBacklogDetailEndpointRouteValidation = validateFoundationBacklogDetailPayload(input.foundationBacklogDetailEndpointApi)
  addCheck(
    checks,
    foundationBacklogDetailEndpointCard &&
      foundationBacklogDetailEndpointCard.lane === 'done' &&
      String(foundationBacklogDetailEndpointCard.statusNote || '').includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY) &&
      foundationBacklogDetailEndpointCloseout?.operatorCloseout === true &&
      (foundationBacklogDetailEndpointCloseout.backlogIds || []).includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID) &&
      foundationBacklogDetailEndpointDogfood.ok === true &&
      foundationBacklogDetailEndpointRouteValidation.ok === true &&
      input.foundationBacklogDetailEndpointApi?.contractVersion === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION &&
      input.foundationBacklogDetailEndpointApi?.cardId === FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID &&
      packageScripts['process:foundation-backlog-detail-endpoint-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH}` &&
      (
        String(input.serverSource || '').includes("app.get('/api/foundation/backlog/:cardId'") ||
        (
          String(input.serverSource || '').includes('registerFoundationOperatorRoutes(app') &&
          String(input.foundationOperatorRoutesSource || '').includes("app.get('/api/foundation/backlog/:cardId'") &&
          String(input.foundationOperatorRoutesSource || '').includes('getBacklogItemsByIds([validation.cardId])')
        )
      ) &&
      String(input.currentPlan || '').includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY) &&
      String(input.currentState || '').includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY) &&
      (input.activeFoundationSprint?.sprint?.sprintId === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID ||
        activeSprintAtOrPast(input, [FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID])) &&
      foundationVerifySource.includes(FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID),
    'Foundation backlog detail endpoint returns one full card without reloading full diagnostics',
    foundationBacklogDetailEndpointCard
      ? `lane=${foundationBacklogDetailEndpointCard.lane} dogfood=${foundationBacklogDetailEndpointDogfood.ok ? 'pass' : 'blocked'} route=${input.foundationBacklogDetailEndpointApi?.cardId || 'missing'}`
      : `missing ${FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID}`,
  )

  const splitCard = findCard(foundationHub, VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID)
  const splitSource = evaluateFoundationHubSafetySplitSource({
    foundationVerifySource: input.foundationVerifySource || '',
    moduleSource: input.moduleSource || '',
    proofScriptSource: input.proofScriptSource || '',
    planSource: input.planSource || '',
    packageScripts,
  })
  const splitClosed = splitCard?.lane === 'done'
  const splitCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY)
  const splitCloseoutOk = !splitClosed ||
    (String(splitCard.statusNote || '').includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY) &&
      splitCloseout?.operatorCloseout === true &&
      (splitCloseout.backlogIds || []).includes(VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID) &&
      await fileExists(input, 'docs/handoffs/2026-05-16-verifier-hub-safety-split-module-closeout.md'))
  addCheck(
    checks,
    splitCard &&
      ['executing', 'done'].includes(splitCard.lane) &&
      splitSource.ok === true &&
      splitCloseoutOk &&
      (input.activeFoundationSprint?.sprint?.sprintId === VERIFIER_HUB_SAFETY_SPLIT_MODULE_SPRINT_ID || splitClosed),
    'VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 extracts hub-safety verifier checks into a focused module',
    splitCard
      ? `lane=${splitCard.lane} splitChecks=${splitSource.summary.passed}/${splitSource.summary.total} lines=${VERIFIER_HUB_SAFETY_SPLIT_MODULE_BEFORE_LINES}->${input.foundationVerifyLineCount || 'missing'}`
      : `missing ${VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summarizeChecks(checks),
    details: {
      hubWorkOwnershipMatrix,
      hubWorkDogfood,
      fixtureValidations,
      liveValidations,
      foundationHubBacklogRouteValidation,
      foundationBacklogDetailEndpointRouteValidation,
      splitSource,
    },
  }
}
