export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CARD_ID = 'SYNTHESIS-REFRESH-REAL-CORPUS-SCOPE-001'
export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PARENT_CARD_ID = 'SYNTHESIS-ENGINE-001'
export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_CLOSEOUT_KEY = 'synthesis-refresh-real-corpus-scope-v1'
export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_PLAN_PATH = 'docs/process/synthesis-refresh-real-corpus-scope-001-plan.md'
export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_APPROVAL_PATH = 'docs/process/approvals/SYNTHESIS-REFRESH-REAL-CORPUS-SCOPE-001.json'
export const SYNTHESIS_REFRESH_REAL_CORPUS_SCOPE_SCRIPT_PATH = 'scripts/process-synthesis-refresh-real-corpus-scope-check.mjs'
export const SYNTHESIS_ENGINE_RUNNER_PATH = 'scripts/intelligence-synthesis-engine-proof.mjs'

export const SYNTHESIS_PROOF_SCOPE_KEY = 'foundation-spine-proof'
export const SYNTHESIS_REFRESH_SCOPE_KEY = 'foundation-real-corpus-refresh'
export const SYNTHESIS_PROOF_ITEM_LIMIT = 8
export const SYNTHESIS_REFRESH_ITEM_LIMIT = 120
export const SYNTHESIS_REFRESH_SOURCE_IDS = [
  'SRC-GMAIL-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-SLACK-001',
]

export const SYNTHESIS_REFRESH_REAL_CORPUS_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call from the focused proof.',
  'No execution of intelligence:synthesis-refresh in this card.',
  'No action-route proposal, approval, apply, reject, snooze, reroute, or backlog mutation.',
  'No auto-promotion of Director, Scoper, Portfolio, or route recommendations into backlog.',
  'No external write, Telegram send, Agent Feedback auto-send, or Drive permission mutation.',
  'No Harlan runtime, reply parsing, login, source-session resume, or external-action authority.',
]

function normalizeBool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

export function buildSynthesisEngineRunConfig(input = {}) {
  const refreshMode = normalizeBool(input.refreshMode || input.refresh || input.refresh_mode)
  return {
    mode: refreshMode ? 'refresh' : 'proof',
    refreshMode,
    actor: refreshMode ? 'synthesis-engine-refresh' : 'synthesis-engine-proof',
    commandName: refreshMode ? 'npm run intelligence:synthesis-refresh' : 'npm run intelligence:synthesis-proof',
    runIdPrefix: refreshMode ? 'synthesis-engine-refresh' : 'synthesis-engine-proof',
    runType: refreshMode ? 'governed_synthesis' : 'governed_synthesis_proof',
    synthesisScopeKey: refreshMode ? SYNTHESIS_REFRESH_SCOPE_KEY : SYNTHESIS_PROOF_SCOPE_KEY,
    itemLimit: refreshMode ? SYNTHESIS_REFRESH_ITEM_LIMIT : SYNTHESIS_PROOF_ITEM_LIMIT,
    scheduledPromotionSourceIds: refreshMode ? SYNTHESIS_REFRESH_SOURCE_IDS : [],
    proofScope: !refreshMode,
    archivesPreviousItemsInScope: true,
    noDestinationWrites: true,
    actionRouterRunsSeparately: true,
  }
}

export function validateSynthesisEngineRunConfig(config = {}) {
  const failures = []
  if (!['proof', 'refresh'].includes(config.mode)) failures.push('mode_missing')
  if (!config.actor) failures.push('actor_missing')
  if (!config.commandName) failures.push('command_missing')
  if (!config.runIdPrefix) failures.push('run_id_prefix_missing')
  if (!config.runType) failures.push('run_type_missing')
  if (!config.synthesisScopeKey) failures.push('scope_key_missing')
  if (!Number.isFinite(Number(config.itemLimit)) || Number(config.itemLimit) < 1) failures.push('item_limit_missing')

  if (config.mode === 'proof') {
    if (config.synthesisScopeKey !== SYNTHESIS_PROOF_SCOPE_KEY) failures.push('proof_scope_mismatch')
    if (Number(config.itemLimit) !== SYNTHESIS_PROOF_ITEM_LIMIT) failures.push('proof_item_limit_mismatch')
    if (config.scheduledPromotionSourceIds?.length) failures.push('proof_has_scheduled_promotion_sources')
  }

  if (config.mode === 'refresh') {
    if (config.synthesisScopeKey !== SYNTHESIS_REFRESH_SCOPE_KEY) failures.push('refresh_scope_mismatch')
    if (config.synthesisScopeKey === SYNTHESIS_PROOF_SCOPE_KEY) failures.push('refresh_uses_proof_scope')
    if (Number(config.itemLimit) <= SYNTHESIS_PROOF_ITEM_LIMIT) failures.push('refresh_item_limit_not_real_corpus')
    if (!Array.isArray(config.scheduledPromotionSourceIds) || config.scheduledPromotionSourceIds.length < 2) failures.push('refresh_sources_missing')
  }

  if (config.noDestinationWrites !== true) failures.push('destination_write_boundary_missing')
  if (config.actionRouterRunsSeparately !== true) failures.push('action_router_boundary_missing')

  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
  }
}

export function validateSynthesisEngineRunnerSource(source = '') {
  const text = String(source || '')
  const failures = []
  if (!text.includes('buildSynthesisEngineRunConfig')) failures.push('runner_does_not_use_config_builder')
  if (!text.includes('synthesisRunConfig.itemLimit')) failures.push('runner_item_limit_not_configured')
  if (!text.includes('synthesisRunConfig.synthesisScopeKey')) failures.push('runner_scope_not_configured')
  if (!text.includes('synthesisRunConfig.runType')) failures.push('runner_run_type_not_configured')
  if (!text.includes('synthesisRunConfig.runIdPrefix')) failures.push('runner_run_id_prefix_not_configured')
  if (text.includes("itemLimit: 8,\n    synthesisScopeKey: 'foundation-spine-proof'")) failures.push('runner_still_hardcodes_proof_limit_and_scope')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
  }
}

export function buildSynthesisRefreshRealCorpusScopeDogfoodProof() {
  const proof = buildSynthesisEngineRunConfig({ refreshMode: false })
  const refresh = buildSynthesisEngineRunConfig({ refreshMode: true })
  const proofValidation = validateSynthesisEngineRunConfig(proof)
  const refreshValidation = validateSynthesisEngineRunConfig(refresh)
  const badRefreshValidation = validateSynthesisEngineRunConfig({
    ...refresh,
    synthesisScopeKey: SYNTHESIS_PROOF_SCOPE_KEY,
    itemLimit: SYNTHESIS_PROOF_ITEM_LIMIT,
  })
  return {
    ok: proofValidation.ok &&
      refreshValidation.ok &&
      badRefreshValidation.ok === false &&
      badRefreshValidation.failures.includes('refresh_uses_proof_scope') &&
      badRefreshValidation.failures.includes('refresh_item_limit_not_real_corpus') &&
      proof.synthesisScopeKey === SYNTHESIS_PROOF_SCOPE_KEY &&
      proof.itemLimit === SYNTHESIS_PROOF_ITEM_LIMIT &&
      refresh.synthesisScopeKey === SYNTHESIS_REFRESH_SCOPE_KEY &&
      refresh.itemLimit > proof.itemLimit &&
      refresh.scheduledPromotionSourceIds.length >= 4 &&
      refresh.noDestinationWrites === true &&
      refresh.actionRouterRunsSeparately === true,
    proof,
    refresh,
    proofValidation,
    refreshValidation,
    badRefreshValidation,
    invariant: 'Proof mode keeps the small foundation-spine proof scope, while scheduled refresh mode uses a separate real-corpus scope and larger bounded item limit without action-router or destination writes.',
  }
}
