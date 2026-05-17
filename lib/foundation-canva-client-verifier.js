import {
  CANVA_CLIENT_CARD_ID,
  CANVA_CLIENT_CLOSEOUT_KEY,
  CANVA_CLIENT_PLAN_PATH,
  CANVA_CLIENT_SCRIPT_PATH,
  CANVA_CLIENT_SPRINT_ID,
  buildCanvaEnvStatus,
  buildSyntheticCanvaClientProof,
  evaluateCanvaClientSource,
} from './canva-client.js'

export {
  CANVA_CLIENT_CARD_ID,
  CANVA_CLIENT_CLOSEOUT_KEY,
  CANVA_CLIENT_PLAN_PATH,
  CANVA_CLIENT_SCRIPT_PATH,
  CANVA_CLIENT_SPRINT_ID,
}

export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID = 'VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-canva-client-split-module-v1'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-canva-client-split-module-001-plan.md'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001.json'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-canva-client-split-module-check.mjs'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SPRINT_ID = 'verifier-canva-client-split-module-2026-05-16'
export const VERIFIER_CANVA_CLIENT_SPLIT_MODULE_BEFORE_LINES = 12734
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-canva-client-orchestration-split-v1'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-canva-client-orchestration-split-001-plan.md'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-canva-client-orchestration-split-check.mjs'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-canva-client-orchestration-split-closeout.md'
export const VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES = 6361

export const CANVA_CLIENT_VERIFIER_CHECK = 'CANVA-CLIENT-001 has governed read-only Canva access and rotation-safe setup'

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function findBacklogCard(backlogItems = [], cardId = '') {
  return (backlogItems || []).find(item => item.id === cardId) || null
}

function findSprintItem(activeSprint = {}, cardId = '') {
  return (activeSprint.items || []).find(item => item.cardId === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey = '') {
  return (closeouts || []).find(item => item.key === closeoutKey) || null
}

function buildCanvaClientDetail({ card, activeSprint, active, closed, envStatus }) {
  if (!card) return 'missing live backlog card'
  return `${CANVA_CLIENT_CARD_ID}:${card.lane}; sprint=${activeSprint?.sprint?.sprintId || 'none'}; active=${Boolean(active)}; closed=${Boolean(closed)}; env=${JSON.stringify(envStatus)}`
}

export async function evaluateFoundationCanvaClientVerifier(input = {}) {
  const {
    activeSprint = {},
    backlogItems = [],
    closeouts = [],
    env = process.env,
    canvaClientSource = '',
    canvaClientScriptSource = '',
    canvaClientPlanSource = '',
    canvaOauthBootstrapSource = '',
    packageJson = {},
    syntheticProof = null,
  } = input
  const checks = []
  const canvaClientCard = findBacklogCard(backlogItems, CANVA_CLIENT_CARD_ID)
  const canvaClientActiveItem = findSprintItem(activeSprint, CANVA_CLIENT_CARD_ID)
  const canvaClientActive = activeSprint?.sprint?.sprintId === CANVA_CLIENT_SPRINT_ID &&
    canvaClientActiveItem &&
    ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(canvaClientActiveItem.stage)
  const canvaClientCloseout = findCloseout(closeouts, CANVA_CLIENT_CLOSEOUT_KEY)
  const canvaClientClosed = canvaClientCard?.lane === 'done' &&
    canvaClientCloseout?.operatorCloseout === true &&
    (canvaClientCloseout.backlogIds || []).includes(CANVA_CLIENT_CARD_ID)
  const canvaClientEnvStatus = buildCanvaEnvStatus(env)
  const canvaClientSourceEvaluation = evaluateCanvaClientSource({
    clientSource: canvaClientSource,
    scriptSource: canvaClientScriptSource,
    planSource: canvaClientPlanSource,
    packageJson,
  })
  const canvaClientSyntheticProof = syntheticProof || await buildSyntheticCanvaClientProof()

  addCheck(
    checks,
    canvaClientCard &&
      (canvaClientActive || canvaClientClosed) &&
      canvaClientEnvStatus.CANVA_CLIENT_ID &&
      canvaClientEnvStatus.CANVA_CLIENT_SECRET &&
      canvaClientEnvStatus.CANVA_REFRESH_TOKEN &&
      canvaClientSourceEvaluation.ok &&
      canvaClientSyntheticProof.ok &&
      packageJson.scripts?.['process:canva-client-check'] === `node --env-file-if-exists=.env ${CANVA_CLIENT_SCRIPT_PATH}` &&
      packageJson.scripts?.['canva:oauth-bootstrap'] === 'node --env-file-if-exists=.env scripts/canva-oauth-bootstrap.mjs' &&
      canvaOauthBootstrapSource.includes('replaceEnvValueLine') &&
      canvaOauthBootstrapSource.includes('refusing_to_write_env_without_apply') &&
      canvaOauthBootstrapSource.includes('code_challenge_method') &&
      canvaClientPlanSource.includes('/folders/{folderId}/items') &&
      canvaClientPlanSource.includes('/brand-templates'),
    CANVA_CLIENT_VERIFIER_CHECK,
    buildCanvaClientDetail({
      card: canvaClientCard,
      activeSprint,
      active: canvaClientActive,
      closed: canvaClientClosed,
      envStatus: canvaClientEnvStatus,
    }),
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length,
      envStatus: canvaClientEnvStatus,
      sourceEvaluationOk: canvaClientSourceEvaluation.ok,
      syntheticProofOk: canvaClientSyntheticProof.ok,
      active: Boolean(canvaClientActive),
      closed: Boolean(canvaClientClosed),
    },
  }
}

function buildHealthyCanvaClientFixture() {
  return {
    activeSprint: { sprint: { sprintId: 'historical-sprint' }, items: [] },
    backlogItems: [{ id: CANVA_CLIENT_CARD_ID, lane: 'done' }],
    closeouts: [{ key: CANVA_CLIENT_CLOSEOUT_KEY, operatorCloseout: true, backlogIds: [CANVA_CLIENT_CARD_ID] }],
    env: {
      CANVA_CLIENT_ID: 'synthetic-client-id',
      CANVA_CLIENT_SECRET: 'synthetic-client-secret',
      CANVA_REFRESH_TOKEN: 'synthetic-refresh-token',
    },
    canvaClientSource: [
      'mintCanvaAccessToken createCanvaClientFromEnv buildSyntheticCanvaClientProof persistCanvaRefreshToken replaceEnvValueLine',
      '/folders/${encodePathPart(folderId)}/items',
      "request('/designs'",
      '/assets/${encodePathPart(assetId)}',
      "request('/brand-templates'",
      'sanitizeCanvaLogValue refreshTokenRotated onRefreshTokenRotated',
    ].join('\n'),
    canvaClientScriptSource: [
      '--live',
      '--update-refresh-token',
      'providerSpendUsd: 0',
      'buildSyntheticCanvaClientProof',
    ].join('\n'),
    canvaClientPlanSource: [
      'no uploads',
      'no exports',
      'no design creation',
      'Google Flow',
      'Canva Connect API',
      '/folders/{folderId}/items',
      '/brand-templates',
    ].join('\n'),
    canvaOauthBootstrapSource: [
      'replaceEnvValueLine',
      'refusing_to_write_env_without_apply',
      'code_challenge_method',
    ].join('\n'),
    packageJson: {
      scripts: {
        'process:canva-client-check': `node --env-file-if-exists=.env ${CANVA_CLIENT_SCRIPT_PATH}`,
        'canva:oauth-bootstrap': 'node --env-file-if-exists=.env scripts/canva-oauth-bootstrap.mjs',
      },
    },
    syntheticProof: { ok: true },
  }
}

export async function buildFoundationCanvaClientVerifierDogfoodProof() {
  const healthyFixture = buildHealthyCanvaClientFixture()
  const healthy = await evaluateFoundationCanvaClientVerifier(healthyFixture)
  const missingRefreshToken = await evaluateFoundationCanvaClientVerifier({
    ...healthyFixture,
    env: {
      ...healthyFixture.env,
      CANVA_REFRESH_TOKEN: '',
    },
  })
  const missingRotationBootstrap = await evaluateFoundationCanvaClientVerifier({
    ...healthyFixture,
    canvaOauthBootstrapSource: 'code_challenge_method',
  })
  const writeWrapperExposed = await evaluateFoundationCanvaClientVerifier({
    ...healthyFixture,
    canvaClientSource: `${healthyFixture.canvaClientSource}\ncreateAssetUploadJob`,
  })
  const missingOfficialReadPlan = await evaluateFoundationCanvaClientVerifier({
    ...healthyFixture,
    canvaClientPlanSource: healthyFixture.canvaClientPlanSource.replace('/brand-templates', ''),
  })
  const rejected = {
    missingRefreshToken: missingRefreshToken.checks[0],
    missingRotationBootstrap: missingRotationBootstrap.checks[0],
    writeWrapperExposed: writeWrapperExposed.checks[0],
    missingOfficialReadPlan: missingOfficialReadPlan.checks[0],
  }
  return {
    ok: healthy.ok &&
      Object.values(rejected).every(check => check?.ok === false),
    healthy: healthy.checks[0],
    rejected,
    dogfoodInvariant: 'healthy fixture passes; missing refresh token, missing rotation-safe bootstrap, exposed write wrapper, and missing official read-plan evidence fail closed',
  }
}

export function evaluateFoundationCanvaClientVerifierSplitSource({
  foundationVerifySource = '',
  moduleSource = '',
  proofScriptSource = '',
  planSource = '',
  packageJson = {},
} = {}) {
  const checks = []
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationCanvaClientVerifier') &&
      moduleSource.includes('evaluateFoundationCanvaClientVerifierOrchestration') &&
      moduleSource.includes('buildFoundationCanvaClientVerifierDogfoodProof') &&
      moduleSource.includes(CANVA_CLIENT_VERIFIER_CHECK) &&
      moduleSource.includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID),
    'module owns Canva client verifier functions',
    'Canva client evaluator, dogfood, and split-card constants live in module',
  )
  addCheck(
    checks,
    proofScriptSource.includes('buildFoundationCanvaClientVerifierDogfoodProof') &&
      proofScriptSource.includes('evaluateFoundationCanvaClientVerifierSplitSource') &&
      proofScriptSource.includes('focused proof script is read-only'),
    'focused proof checks dogfood, delegation, and read-only posture',
    VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH,
  )
  addCheck(
    checks,
    planSource.includes('Dogfood proof recreates the Canva verifier failure class') &&
      planSource.includes('No Canva writes') &&
      planSource.includes('Canva refresh token rotation remains guarded'),
    'plan records Canva verifier split acceptance',
    VERIFIER_CANVA_CLIENT_SPLIT_MODULE_PLAN_PATH,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-canva-client-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-canva-client-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    (foundationVerifySource.includes('evaluateFoundationCanvaClientVerifier({') ||
      foundationVerifySource.includes('evaluateFoundationCanvaClientVerifierOrchestration({')) &&
      (foundationVerifySource.includes('canvaClientVerifier.checks') ||
        foundationVerifySource.includes('canvaClientOrchestrationVerifier.checks')) &&
      !foundationVerifySource.includes('const canvaClientEnvStatus = buildCanvaEnvStatus') &&
      !foundationVerifySource.includes('const canvaClientSourceEvaluation = evaluateCanvaClientSource'),
    'root verifier delegates Canva client check',
    'root imports the module, pushes module checks, and no longer owns the old inline Canva client predicate block',
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}

export async function evaluateFoundationCanvaClientVerifierOrchestration(input = {}) {
  const {
    activeSprint = {},
    backlogItems = [],
    closeouts = [],
    currentPlan = '',
    currentState = '',
    foundationCanvaClientVerifierSource = '',
    foundationVerifyRootSource = input.foundationVerifySource || '',
    packageJson = {},
    repoFileExists = async () => false,
    verifierCanvaClientSplitScriptSource = '',
    verifierCanvaClientSplitPlanSource = '',
  } = input
  const canvaClientVerifier = await evaluateFoundationCanvaClientVerifier(input)
  const checks = [...canvaClientVerifier.checks]
  const canvaClientVerifierDogfood = await buildFoundationCanvaClientVerifierDogfoodProof()
  const canvaClientVerifierSplitSource = evaluateFoundationCanvaClientVerifierSplitSource({
    foundationVerifySource: foundationVerifyRootSource,
    moduleSource: foundationCanvaClientVerifierSource,
    proofScriptSource: verifierCanvaClientSplitScriptSource,
    planSource: verifierCanvaClientSplitPlanSource,
    packageJson,
  })
  const findCard = id => (backlogItems || []).find(item => item.id === id) ||
    (activeSprint.items || []).map(item => item.backlog).find(item => item?.id === id) ||
    null
  const findCloseout = key => (closeouts || []).find(closeout => closeout.key === key) || null
  const foundationVerifyLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const verifierCanvaClientSplitModuleCard = findCard(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID)
  const verifierCanvaClientSplitModuleCloseout = findCloseout(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CLOSEOUT_KEY)
  const verifierCanvaClientSplitModuleClosed = verifierCanvaClientSplitModuleCard?.lane === 'done'
  const canvaClientOrchestrationOldRootPatterns = [
    'const canvaClientVerifier = await evaluateFoundationCanvaClientVerifier({',
    'const canvaClientVerifierDogfood = await buildFoundationCanvaClientVerifierDogfoodProof()',
    'const verifierCanvaClientSplitModuleCard =',
  ]

  const canvaClientSplitCloseoutOk = !verifierCanvaClientSplitModuleClosed || (
    String(verifierCanvaClientSplitModuleCard.statusNote || '').includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CLOSEOUT_KEY) &&
    verifierCanvaClientSplitModuleCloseout?.operatorCloseout === true &&
    (verifierCanvaClientSplitModuleCloseout.backlogIds || []).includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID) &&
    await repoFileExists('docs/handoffs/2026-05-16-verifier-canva-client-split-module-closeout.md')
  )
  const canvaClientSplitOk = verifierCanvaClientSplitModuleCard &&
    ['executing', 'done'].includes(verifierCanvaClientSplitModuleCard.lane) &&
    canvaClientSplitCloseoutOk &&
    canvaClientVerifierDogfood.ok === true &&
    canvaClientVerifier.checks.every(check => check.ok) &&
    canvaClientVerifierSplitSource.checks.every(check => check.ok) &&
    currentPlan.includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CLOSEOUT_KEY) &&
    currentState.includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CLOSEOUT_KEY) &&
    (activeSprint.sprint?.sprintId === VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SPRINT_ID || verifierCanvaClientSplitModuleClosed) &&
    foundationCanvaClientVerifierSource.includes(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID)
  addCheck(
    checks,
    canvaClientSplitOk,
    'VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001 extracts Canva client verifier checks into a focused module',
    verifierCanvaClientSplitModuleCard
      ? `lane=${verifierCanvaClientSplitModuleCard.lane} dogfood=${canvaClientVerifierDogfood.ok ? 'pass' : 'blocked'} canvaChecks=${canvaClientVerifier.checks.filter(check => check.ok).length}/${canvaClientVerifier.checks.length} lines=${VERIFIER_CANVA_CLIENT_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID}`,
  )

  const verifierCanvaClientOrchestrationCard = findCard(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierCanvaClientOrchestrationCloseout = findCloseout(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY)
  addCheck(
    checks,
    verifierCanvaClientOrchestrationCard &&
      ['executing', 'done'].includes(verifierCanvaClientOrchestrationCard.lane) &&
      String(verifierCanvaClientOrchestrationCard.statusNote || '').includes(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierCanvaClientOrchestrationCloseout?.operatorCloseout === true &&
      (verifierCanvaClientOrchestrationCloseout.backlogIds || []).includes(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID) &&
      canvaClientVerifierDogfood.ok === true &&
      canvaClientVerifier.checks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-canva-client-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationCanvaClientVerifierSource.includes('evaluateFoundationCanvaClientVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationCanvaClientVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('canvaClientOrchestrationVerifier.checks') &&
      canvaClientOrchestrationOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 moves Canva client orchestration into the focused module',
    verifierCanvaClientOrchestrationCard
      ? `lane=${verifierCanvaClientOrchestrationCard.lane} dogfood=${canvaClientVerifierDogfood.ok ? 'pass' : 'blocked'} canvaChecks=${canvaClientVerifier.checks.filter(check => check.ok).length}/${canvaClientVerifier.checks.length} lines=${VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    canvaClientVerifier,
    dogfood: canvaClientVerifierDogfood,
  }
}
