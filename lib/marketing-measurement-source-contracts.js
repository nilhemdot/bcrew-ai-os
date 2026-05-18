import {
  getSourceConnectors,
  getSourceContracts,
} from './source-contracts.js'
import {
  assertSourceContractAllowsExtraction,
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'
import {
  buildSourceConnectorMatrixSnapshot,
} from './source-connector-matrix.js'

export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID = 'SOURCE-016'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY = 'marketing-measurement-source-contracts-v1'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH = 'docs/process/source-016-marketing-measurement-source-contracts-plan.md'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH = 'docs/process/approvals/SOURCE-016.json'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SCRIPT_PATH = 'scripts/process-source-016-marketing-measurement-source-contracts-check.mjs'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-016-marketing-measurement-source-contracts-closeout.md'
export const MARKETING_MEASUREMENT_SOURCE_CONTRACTS_SPRINT_ID = 'source-016-marketing-measurement-source-contracts-2026-05-18'

export const MARKETING_MEASUREMENT_NEW_SOURCE_IDS = [
  'SRC-GA4-001',
  'SRC-GSC-001',
  'SRC-GBP-001',
]

export const MARKETING_MEASUREMENT_PROVIDER_DECISION_SOURCE_IDS = [
  'SRC-GADS-001',
  'SRC-META-001',
  'SRC-PUBLISH-001',
]

export const MARKETING_MEASUREMENT_NOT_NEXT_BOUNDARIES = [
  'No live extraction or extraction target creation.',
  'No GA4, Search Console, Google Business Profile, Google Ads, Meta, or SocialPilot provider calls.',
  'No OAuth, provider auth repair, paid-source auth, model calls, screenshots, transcript fetches, or external writes.',
  'No Harlan, Fal, voice, Canva, OpenHuman, Marketing Hub production, or broad UI redesign.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not rerun live Agent Feedback auto-send.',
]

export const MARKETING_MEASUREMENT_PROOF_COMMANDS = [
  'npm run source-contract-registry:sync -- --apply --actor=codex-source-016-marketing-measurement --json',
  'npm run process:source-016-marketing-measurement-source-contracts-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID} --planApprovalRef=${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH} --closeoutKey=${MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const MARKETING_MEASUREMENT_CHANGED_FILES = [
  'lib/source-contracts.js',
  'lib/source-contracts-marketing.js',
  'lib/source-contract-validation-layer.js',
  'lib/source-lifecycle-completion.js',
  'lib/source-connector-matrix.js',
  'lib/marketing-measurement-source-contracts.js',
  'lib/foundation-source-contract-verifier.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-build-closeout-records.js',
  'scripts/process-source-016-marketing-measurement-source-contracts-check.mjs',
  'scripts/process-source-connector-matrix-check.mjs',
  'package.json',
  'docs/source-registry.md',
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_PLAN_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_APPROVAL_PATH,
  MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CLOSEOUT_PATH,
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function byId(rows = [], key = 'sourceId') {
  return new Map(list(rows).map(row => [row?.[key], row]).filter(([id]) => Boolean(id)))
}

function matrixRowBySourceId(matrix, sourceId) {
  return list(matrix?.rows).find(row => row.sourceId === sourceId) || null
}

function validationRowBySourceId(validation, sourceId) {
  return list(validation?.rows).find(row => row.sourceId === sourceId) || null
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function evaluateMarketingMeasurementSourceContracts({
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  extractionTargets = [],
} = {}) {
  const contractsById = byId(sourceContracts)
  const connectorsById = byId(sourceConnectors, 'connectorId')
  const validation = evaluateSourceContractValidationLayer({
    sourceContracts,
    sourceConnectors,
    extractionTargets,
  })
  const matrix = buildSourceConnectorMatrixSnapshot({
    sources: sourceContracts,
    connectors: sourceConnectors,
  })
  const checks = []

  for (const sourceId of MARKETING_MEASUREMENT_NEW_SOURCE_IDS) {
    const contract = contractsById.get(sourceId)
    const validationRow = validationRowBySourceId(validation, sourceId)
    const matrixRow = matrixRowBySourceId(matrix, sourceId)
    const extractionGate = assertSourceContractAllowsExtraction(sourceId, validation)

    addCheck(checks, Boolean(contract), `${sourceId} has a first-class source contract`, contract?.status || 'missing')
    addCheck(
      checks,
      contract?.status === 'Scoped, not connected' && contract?.validation === 'Not Signed Off',
      `${sourceId} is explicit source-contract prep, not fake connected truth`,
      contract ? `${contract.status}/${contract.validation}` : 'missing',
    )
    addCheck(
      checks,
      validationRow?.ok === true &&
        validationRow.authPosture === 'owner_authorization_required' &&
        validationRow.extractionPosture === 'blocked_until_authorized' &&
        validationRow.atomFlowExpectation === 'blocked' &&
        validationRow.blockerCards.includes(MARKETING_MEASUREMENT_SOURCE_CONTRACTS_CARD_ID),
      `${sourceId} validation profile is fail-closed`,
      validationRow ? `${validationRow.authPosture}/${validationRow.extractionPosture}/${validationRow.atomFlowExpectation}` : 'missing',
    )
    addCheck(
      checks,
      extractionGate.ok === false && /auth-required source is blocked/.test(extractionGate.reason || ''),
      `${sourceId} cannot start extraction`,
      extractionGate.reason || 'missing reason',
    )
    addCheck(
      checks,
      matrixRow?.hasContract === true &&
        matrixRow.hasConnector === true &&
        matrixRow.decision === 'blocked' &&
        /authorization/.test(matrixRow.blockedReason || ''),
      `${sourceId} connector matrix moved from missing contract to blocked authorization`,
      matrixRow ? `${matrixRow.decision}/${matrixRow.blockedReason}` : 'missing matrix row',
    )
  }

  for (const connectorId of ['CONN-GA4-001', 'CONN-GSC-001', 'CONN-GBP-001']) {
    const connector = connectorsById.get(connectorId)
    addCheck(
      checks,
      connector?.group === 'available' && /pending/i.test(connector?.status || ''),
      `${connectorId} is registered as available-pending, not working`,
      connector ? `${connector.group}/${connector.status}` : 'missing',
    )
  }

  const googleAdsGate = assertSourceContractAllowsExtraction('SRC-GADS-001', validation)
  const socialPilotGate = assertSourceContractAllowsExtraction('SRC-PUBLISH-001', validation)
  const metaMatrixRow = matrixRowBySourceId(matrix, 'SRC-META-001')
  addCheck(
    checks,
    googleAdsGate.ok === false && /auth-required source is blocked/.test(googleAdsGate.reason || ''),
    'Google Ads remains auth-required blocked',
    googleAdsGate.reason || 'missing reason',
  )
  addCheck(
    checks,
    socialPilotGate.ok === false && /auth-required source is blocked/.test(socialPilotGate.reason || ''),
    'SocialPilot publishing remains auth/owner blocked',
    socialPilotGate.reason || 'missing reason',
  )
  addCheck(
    checks,
    metaMatrixRow?.decision !== 'connected',
    'Meta is not silently promoted to connected marketing measurement truth',
    metaMatrixRow ? metaMatrixRow.decision : 'missing matrix row',
  )
  addCheck(
    checks,
    MARKETING_MEASUREMENT_NEW_SOURCE_IDS.every(sourceId =>
      !list(extractionTargets).some(target => (target.sourceId || target.source_id) === sourceId)
    ),
    'new marketing measurement sources have no extraction targets',
    list(extractionTargets).filter(target => MARKETING_MEASUREMENT_NEW_SOURCE_IDS.includes(target.sourceId || target.source_id)).map(target => target.targetKey || target.target_key).join(', ') || 'none',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0 && validation.ok === true,
    checks,
    failed,
    validation,
    matrix,
    summary: {
      sourceContractCount: sourceContracts.length,
      sourceConnectorCount: sourceConnectors.length,
      newSourceIds: MARKETING_MEASUREMENT_NEW_SOURCE_IDS,
      providerDecisionSourceIds: MARKETING_MEASUREMENT_PROVIDER_DECISION_SOURCE_IDS,
      blockedMarketingMeasurementRows: MARKETING_MEASUREMENT_NEW_SOURCE_IDS
        .map(sourceId => matrixRowBySourceId(matrix, sourceId))
        .filter(row => row?.decision === 'blocked')
        .length,
      activeExtractionTargetCount: list(extractionTargets)
        .filter(target => MARKETING_MEASUREMENT_NEW_SOURCE_IDS.includes(target.sourceId || target.source_id))
        .length,
    },
  }
}

export function buildMarketingMeasurementSourceContractsDogfoodProof() {
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const missingContracts = evaluateMarketingMeasurementSourceContracts({
    sourceContracts: sourceContracts.filter(contract => !MARKETING_MEASUREMENT_NEW_SOURCE_IDS.includes(contract.sourceId)),
    sourceConnectors,
  })
  const missingConnectors = evaluateMarketingMeasurementSourceContracts({
    sourceContracts,
    sourceConnectors: sourceConnectors.filter(connector => !['CONN-GA4-001', 'CONN-GSC-001', 'CONN-GBP-001'].includes(connector.connectorId)),
  })
  const activeExtraction = evaluateMarketingMeasurementSourceContracts({
    sourceContracts,
    sourceConnectors,
    extractionTargets: [
      { sourceId: 'SRC-GA4-001', status: 'active', targetKey: 'synthetic-ga4-live-run' },
    ],
  })
  const healthy = evaluateMarketingMeasurementSourceContracts({ sourceContracts, sourceConnectors })

  return {
    ok: healthy.ok === true &&
      missingContracts.ok === false &&
      missingConnectors.ok === false &&
      activeExtraction.ok === false,
    healthy,
    rejected: {
      missingContracts,
      missingConnectors,
      activeExtraction,
    },
    invariant: 'Marketing measurement source-contract prep passes only when GA4/GSC/GBP source identities and available-pending connector rows exist, remain fail-closed, and do not create active extraction targets.',
  }
}
