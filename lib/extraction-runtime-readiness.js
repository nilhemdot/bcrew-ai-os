import {
  assertSourceContractAllowsExtraction,
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'
import {
  buildMultimodalExtractorContractSnapshot,
} from './multimodal-extractor-contract.js'
import {
  buildResearchInboxContractSnapshot,
  buildResearchInboxPromotionProposal,
} from './research-inbox.js'

export const EXTRACTION_RUNTIME_READINESS_CARD_ID = 'EXTRACTION-RUNTIME-READINESS-001'
export const EXTRACTION_RUNTIME_READINESS_CLOSEOUT_KEY = 'extraction-runtime-readiness-v1'
export const EXTRACTION_RUNTIME_READINESS_PLAN_PATH = 'docs/process/extraction-runtime-readiness-001-plan.md'
export const EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH = 'docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json'
export const EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH = 'scripts/process-extraction-runtime-readiness-check.mjs'
export const EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-extraction-runtime-readiness-closeout.md'
export const EXTRACTION_RUNTIME_READINESS_SPRINT_ID = 'extraction-runtime-readiness-2026-05-17'
export const EXTRACTION_RUNTIME_READINESS_API_PATH = '/api/foundation/extraction-runtime-readiness'

export const EXTRACTION_RUNTIME_READINESS_CHANGED_FILES = [
  'lib/extraction-runtime-readiness.js',
  'lib/foundation-extraction-runtime-verifier.js',
  'lib/foundation-runtime-read-routes.js',
  'lib/foundation-verify-live-api-snapshot.js',
  'lib/security-access.js',
  'server.js',
  'scripts/foundation-verify.mjs',
  EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH,
  EXTRACTION_RUNTIME_READINESS_PLAN_PATH,
  EXTRACTION_RUNTIME_READINESS_APPROVAL_PATH,
  EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH,
]

export const EXTRACTION_RUNTIME_READINESS_PROOF_COMMANDS = [
  'node --check lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js lib/foundation-runtime-read-routes.js scripts/process-extraction-runtime-readiness-check.mjs scripts/foundation-verify.mjs',
  'npm run process:extraction-runtime-readiness-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=EXTRACTION-RUNTIME-READINESS-001 --planApprovalRef=docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json --closeoutKey=extraction-runtime-readiness-v1 --commitRef=HEAD',
]

export const EXTRACTION_RUNTIME_QUEUE_STATUSES = [
  'draft',
  'planned',
  'queued',
  'pending_approval',
  'ready_for_dry_run',
  'active',
  'paused',
  'blocked',
  'complete',
  'running',
  'succeeded',
  'failed',
  'skipped',
]

export const EXTRACTION_RUNTIME_OUTPUT_TARGETS = [
  'research_inbox_proposal',
  'proposed_atom',
]

const AUTH_REQUIRED_POSTURES = new Set([
  'oauth_required',
  'owner_authorization_required',
  'unknown_auth_blocked',
])

const STARTABLE_EXTRACTION_POSTURES = new Set([
  'read_only_manual',
  'governed_extraction_allowed',
  'proposal_only',
])

const ACTIVE_TARGET_STATUSES = new Set(['active', 'running'])
const ACTIVE_RUNTIME_MODES = new Set(['scheduled'])
const RUNNABLE_QUEUE_STATUSES = new Set(['queued', 'ready_for_dry_run', 'active', 'running'])
const PAID_ACCESS_CLASSES = new Set(['authorized_paid_private', 'paid_private'])

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value : []
}

function addFinding(findings, condition, check, detail = '') {
  findings.push({ ok: Boolean(condition), check, detail })
}

function bySourceId(rows = []) {
  const map = new Map()
  for (const row of normalizeList(rows)) {
    const sourceId = normalizeText(row.sourceId || row.source_id)
    if (sourceId) map.set(sourceId, row)
  }
  return map
}

function isActiveTarget(target = {}) {
  return ACTIVE_TARGET_STATUSES.has(target.status) || ACTIVE_RUNTIME_MODES.has(target.runtimeMode || target.runtime_mode)
}

function hasExplicitRuntimeBudget(target = {}) {
  const budget = target.budget || {}
  return Boolean(
    normalizeText(budget.llmBudget || budget.llm_budget || target.llmBudget) &&
      Number(budget.maxRuntimeSeconds || target.maxRuntimeSeconds || 0) > 0 &&
      (
        Number(budget.maxItemsPerRun || target.maxItemsPerRun || 0) > 0 ||
        Number(budget.maxArtifactsPerRun || target.maxArtifactsPerRun || 0) > 0 ||
        Number(budget.dailyMissionQuota || target.dailyMissionQuota || 0) > 0
      ),
  )
}

function hasSpendCaps(item = {}) {
  const costCaps = item.costCaps || item.cost_caps || {}
  if (normalizeText(costCaps.spendClass) === 'none' || normalizeText(costCaps.llmBudget) === 'none') return true
  return Number(costCaps.maxRunUsd) >= 0 &&
    Number(costCaps.maxItemUsd) >= 0 &&
    Number(costCaps.maxDailyUsd) >= 0
}

function sourceBlocksExtraction(row = {}) {
  return !row.ok ||
    AUTH_REQUIRED_POSTURES.has(row.authPosture) ||
    !STARTABLE_EXTRACTION_POSTURES.has(row.extractionPosture)
}

function buildProposalItemFromEnvelope(envelope = {}) {
  return {
    sourceRef: envelope.sourceUrl,
    sourceType: envelope.sourceType || 'youtube',
    whySteveCared: envelope.whySteveCared || 'Extraction runtime readiness proof routes findings to review before backlog or atom promotion.',
    plainEnglishTakeaway: envelope.summary || 'Safe extraction output is proposal-only until Steve/Codex approves promotion.',
    systemFit: envelope.systemFit || 'Foundation-owned extraction readiness, Research Inbox, and proposed atom intake.',
    recommendation: envelope.recommendation || 'Review proposed extraction output before promoting it.',
    owner: envelope.owner || 'Foundation',
    proposedDisposition: envelope.proposedDisposition || 'needs_steve_review',
    status: envelope.status || 'proposal_ready',
    relatedCards: envelope.relatedCards || [EXTRACTION_RUNTIME_READINESS_CARD_ID],
    evidenceLinks: envelope.evidenceLinks || [envelope.sourceUrl].filter(Boolean),
    autoCreateBacklogCard: false,
  }
}

export function buildExtractionRuntimeEvidenceEnvelope(input = {}) {
  return {
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType || 'youtube',
    capturedAt: input.capturedAt || new Date('2026-05-17T12:00:00.000Z').toISOString(),
    transcriptRef: input.transcriptRef || null,
    screenshotRefs: normalizeList(input.screenshotRefs),
    sourceAnchors: normalizeList(input.sourceAnchors),
    modelProvider: input.modelProvider,
    model: input.model,
    costUsd: input.costUsd,
    confidence: input.confidence,
    outputTarget: input.outputTarget || 'research_inbox_proposal',
    proposalOnly: input.proposalOnly !== false,
    writesBacklog: input.writesBacklog === true,
    createsPromotedAtom: input.createsPromotedAtom === true,
    relatedCards: input.relatedCards || [EXTRACTION_RUNTIME_READINESS_CARD_ID],
    evidenceLinks: input.evidenceLinks || [input.sourceUrl].filter(Boolean),
    summary: input.summary || '',
    recommendation: input.recommendation || '',
  }
}

export function validateExtractionRuntimeEvidenceEnvelope(envelope = {}) {
  const findings = []
  addFinding(findings, normalizeText(envelope.sourceId), 'evidence envelope has source ID', envelope.sourceId || 'missing')
  addFinding(findings, normalizeText(envelope.sourceUrl), 'evidence envelope has source URL', envelope.sourceUrl || 'missing')
  addFinding(findings, !Number.isNaN(Date.parse(envelope.capturedAt || '')), 'evidence envelope has timestamp', envelope.capturedAt || 'missing')
  addFinding(
    findings,
    normalizeText(envelope.transcriptRef) || normalizeList(envelope.screenshotRefs).length > 0,
    'evidence envelope has transcript or screenshot evidence',
    envelope.transcriptRef || `${normalizeList(envelope.screenshotRefs).length} screenshot refs`,
  )
  addFinding(findings, normalizeList(envelope.sourceAnchors).length > 0, 'evidence envelope has source anchors', `${normalizeList(envelope.sourceAnchors).length}`)
  addFinding(findings, normalizeText(envelope.modelProvider), 'evidence envelope has model/provider', envelope.modelProvider || 'missing')
  addFinding(findings, normalizeText(envelope.model), 'evidence envelope has model name', envelope.model || 'missing')
  addFinding(findings, Number(envelope.costUsd) >= 0, 'evidence envelope has non-negative cost', String(envelope.costUsd ?? 'missing'))
  addFinding(findings, Number(envelope.confidence) >= 0 && Number(envelope.confidence) <= 1, 'evidence envelope has confidence 0..1', String(envelope.confidence ?? 'missing'))
  addFinding(findings, EXTRACTION_RUNTIME_OUTPUT_TARGETS.includes(envelope.outputTarget), 'evidence envelope output target is governed', envelope.outputTarget || 'missing')
  addFinding(findings, envelope.proposalOnly === true, 'evidence envelope remains proposal-only', String(envelope.proposalOnly))
  addFinding(findings, envelope.writesBacklog !== true, 'evidence envelope does not write backlog', String(envelope.writesBacklog))
  addFinding(findings, envelope.createsPromotedAtom !== true, 'evidence envelope does not create promoted atoms', String(envelope.createsPromotedAtom))

  return {
    ok: findings.every(finding => finding.ok),
    findings,
    failures: findings.filter(finding => !finding.ok),
  }
}

export function validateExtractionRuntimeQueueItem(item = {}, context = {}) {
  const findings = []
  const sourceValidation = context.sourceValidation || { rows: [] }
  const rowsBySourceId = bySourceId(sourceValidation.rows)
  const sourceId = normalizeText(item.sourceId || item.source_id)
  const sourceRow = rowsBySourceId.get(sourceId)
  const permission = sourceId
    ? assertSourceContractAllowsExtraction(sourceId, sourceValidation)
    : { ok: false, reason: 'missing source ID' }
  const active = isActiveTarget(item)
  const accessClass = normalizeText(item.accessClass || item.access_class || item.metadata?.accessClass)
  const paid = PAID_ACCESS_CLASSES.has(accessClass)
  const approvedPaid = item.steveApproval?.approved === true || item.approval?.approved === true
  const status = normalizeText(item.queueStatus || item.metadata?.queueStatus || item.metadata?.approvalStatus || item.status || 'queued')

  addFinding(findings, normalizeText(item.targetKey || item.target_key), 'queue item has target key', item.targetKey || item.target_key || 'missing')
  addFinding(findings, sourceId, 'queue item has source ID', sourceId || 'missing')
  addFinding(findings, EXTRACTION_RUNTIME_QUEUE_STATUSES.includes(status), 'queue item has governed status', status || 'missing')
  addFinding(findings, Boolean(sourceRow), 'queue item source has validation row', sourceId || 'missing')
  addFinding(findings, !active || permission.ok === true, 'active queue item source is allowed by source contract', permission.reason || 'allowed')
  addFinding(findings, !paid || approvedPaid, 'paid/private queue item requires Steve approval', paid ? 'paid/private' : 'not paid/private')
  addFinding(findings, hasExplicitRuntimeBudget(item) || hasSpendCaps(item), 'queue item has explicit runtime/cost caps', JSON.stringify(item.budget || item.costCaps || {}))
  addFinding(findings, normalizeText(item.outputTarget || 'research_inbox_proposal') === 'research_inbox_proposal' || normalizeText(item.outputTarget) === 'proposed_atom', 'queue item output target is proposal-gated', item.outputTarget || 'research_inbox_proposal')
  addFinding(findings, item.liveRunApproved !== true, 'queue item is not a live-run approval in readiness proof', String(item.liveRunApproved === true))

  const blockedBySource = sourceRow ? sourceBlocksExtraction(sourceRow) : true
  return {
    ok: findings.every(finding => finding.ok),
    findings,
    failures: findings.filter(finding => !finding.ok),
    sourceId,
    targetKey: item.targetKey || item.target_key || '',
    sourceAuthPosture: sourceRow?.authPosture || null,
    extractionPosture: sourceRow?.extractionPosture || null,
    blockedBySource,
    paid,
    active,
    runnable: RUNNABLE_QUEUE_STATUSES.has(status) && findings.every(finding => finding.ok) && !blockedBySource && !paid && item.liveRunApproved !== true,
  }
}

export function buildExtractionRuntimeReadinessSnapshot(input = {}) {
  const extractionControl = input.extractionControlSnapshot || {}
  const extractionTargets = normalizeList(input.extractionTargets || extractionControl.targets)
  const sourceValidation = input.sourceValidation || evaluateSourceContractValidationLayer({
    extractionTargets,
    sourceRegistryText: 'SOURCE-CONTRACT-VALIDATION-LAYER-001 blocked source contracts must carry blocker, reason, and next action',
    currentStateText: 'SOURCE-CONTRACT-VALIDATION-LAYER-001 thin source contracts now fail closed before connector or extractor work depends on them',
  })
  const researchInboxContract = input.researchInboxContract || buildResearchInboxContractSnapshot()
  const multimodalContract = input.multimodalContract || buildMultimodalExtractorContractSnapshot()
  const queueRows = extractionTargets.map(target => validateExtractionRuntimeQueueItem(target, { sourceValidation }))
  const activeAuthRequiredTargets = queueRows.filter(row => row.active && AUTH_REQUIRED_POSTURES.has(row.sourceAuthPosture))
  const missingSourceRows = queueRows.filter(row => !row.sourceId)
  const activeInvalidRows = queueRows.filter(row => row.active && !row.ok)
  const missingRuntimeBudgets = extractionTargets.filter(target => isActiveTarget(target) && !hasExplicitRuntimeBudget(target) && !hasSpendCaps(target))
  const blockedRows = queueRows.filter(row => row.blockedBySource || !row.ok)
  const runnableRows = queueRows.filter(row => row.runnable)
  const proposalEnvelope = buildExtractionRuntimeEvidenceEnvelope({
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    sourceUrl: 'https://www.youtube.com/watch?v=proposal-only',
    sourceType: 'youtube',
    transcriptRef: 'artifact://transcript/proposal-only',
    screenshotRefs: ['artifact://screenshot/keyframe-001'],
    sourceAnchors: ['00:00-00:45'],
    modelProvider: 'openai',
    model: 'gpt-5.2',
    costUsd: 0,
    confidence: 0.82,
    summary: 'Proposal-only extraction readiness sample.',
    recommendation: 'Review before any backlog or atom promotion.',
  })
  const envelopeValidation = validateExtractionRuntimeEvidenceEnvelope(proposalEnvelope)
  const proposal = buildResearchInboxPromotionProposal(buildProposalItemFromEnvelope(proposalEnvelope))
  const summary = extractionControl.summary || {}
  const findings = []

  addFinding(findings, sourceValidation.ok === true, 'source contract validation passes before runtime readiness', `${sourceValidation.summary?.passed || 0}/${sourceValidation.summary?.contractCount || 0}`)
  addFinding(findings, missingSourceRows.length === 0, 'extraction queue targets are source-bound', missingSourceRows.map(row => row.targetKey || 'missing_target').join(', ') || 'all source-bound')
  addFinding(findings, activeInvalidRows.length === 0, 'active extraction queue targets pass readiness validation', activeInvalidRows.map(row => `${row.sourceId}:${row.targetKey}`).join(', ') || 'all active targets ready')
  addFinding(findings, activeAuthRequiredTargets.length === 0, 'auth-required sources have no active extraction targets', activeAuthRequiredTargets.map(row => `${row.sourceId}:${row.targetKey}`).join(', ') || 'none')
  addFinding(findings, missingRuntimeBudgets.length === 0, 'active extraction targets carry explicit runtime/cost caps', missingRuntimeBudgets.map(target => target.targetKey || target.target_key).join(', ') || 'all capped')
  addFinding(findings, Number(summary.runningRuns || 0) === 0, 'readiness snapshot has no running live extraction', String(summary.runningRuns || 0))
  addFinding(findings, Number(summary.staleActiveRuns || 0) === 0, 'readiness snapshot has no stale active extraction run', String(summary.staleActiveRuns || 0))
  addFinding(findings, researchInboxContract.proposalOnly === true && researchInboxContract.autoMutationAllowed === false, 'Research Inbox is proposal-only output gate', researchInboxContract.status || 'missing')
  addFinding(findings, multimodalContract.contractOnly === true && multimodalContract.extractionStarted === false, 'multimodal extractor contract is not a live extraction run', multimodalContract.status || 'missing')
  addFinding(findings, envelopeValidation.ok === true, 'evidence envelope validates transcript/screenshot/source/model/cost/confidence fields', envelopeValidation.failures.map(finding => finding.check).join(', ') || 'valid')
  addFinding(findings, proposal.ok === true && proposal.proposalOnly === true && proposal.writesBacklog === false, 'proposal output routes to Research Inbox without backlog writes', proposal.disposition || 'missing')

  return {
    status: findings.every(finding => finding.ok) ? 'healthy' : 'risk',
    ok: findings.every(finding => finding.ok),
    cardId: EXTRACTION_RUNTIME_READINESS_CARD_ID,
    route: EXTRACTION_RUNTIME_READINESS_API_PATH,
    generatedAt: new Date().toISOString(),
    summary: {
      targetCount: extractionTargets.length,
      runnableQueueItems: runnableRows.length,
      blockedQueueItems: blockedRows.length,
      activeAuthRequiredTargets: activeAuthRequiredTargets.length,
      runningRuns: Number(summary.runningRuns || 0),
      staleActiveRuns: Number(summary.staleActiveRuns || 0),
      outputTargets: EXTRACTION_RUNTIME_OUTPUT_TARGETS,
      proposalOnly: true,
      writesBacklog: false,
      createsPromotedAtoms: false,
    },
    queueRows,
    findings,
    failures: findings.filter(finding => !finding.ok),
    evidenceEnvelopeSchema: [
      'sourceId',
      'sourceUrl',
      'capturedAt',
      'transcriptRef',
      'screenshotRefs',
      'sourceAnchors',
      'modelProvider',
      'model',
      'costUsd',
      'confidence',
      'outputTarget',
    ],
    outputGate: {
      researchInboxProposal: true,
      proposedAtomState: 'proposed_only',
      writesBacklog: false,
      createsPromotedAtoms: false,
      requiresSteveApprovalForPromotion: true,
    },
  }
}

export const buildExtractionRuntimeReadinessPayload = buildExtractionRuntimeReadinessSnapshot

export function buildExtractionRuntimeReadinessDogfoodProof() {
  const sourceValidation = {
    ok: true,
    summary: { passed: 2, contractCount: 2 },
    rows: [
      {
        sourceId: 'SRC-NO-AUTH-001',
        ok: true,
        authPosture: 'no_auth_internal',
        extractionPosture: 'proposal_only',
        findings: [],
        failures: [],
      },
      {
        sourceId: 'SRC-AUTH-REQUIRED-001',
        ok: true,
        authPosture: 'owner_authorization_required',
        extractionPosture: 'blocked_until_authorized',
        findings: [],
        failures: [],
      },
    ],
  }
  const healthyTarget = {
    targetKey: 'public-video-proposal-pack',
    sourceId: 'SRC-NO-AUTH-001',
    status: 'queued',
    runtimeMode: 'manual',
    budget: { llmBudget: 'none', maxItemsPerRun: 1, maxRuntimeSeconds: 120 },
    outputTarget: 'research_inbox_proposal',
  }
  const healthy = buildExtractionRuntimeReadinessSnapshot({
    sourceValidation,
    extractionControlSnapshot: { targets: [healthyTarget], summary: { runningRuns: 0, staleActiveRuns: 0 } },
  })
  const missingOwnerSource = buildExtractionRuntimeReadinessSnapshot({
    sourceValidation: { ...sourceValidation, ok: false, summary: { passed: 1, contractCount: 2 }, rows: sourceValidation.rows },
    extractionControlSnapshot: { targets: [healthyTarget], summary: { runningRuns: 0, staleActiveRuns: 0 } },
  })
  const missingAuthPosture = buildExtractionRuntimeReadinessSnapshot({
    sourceValidation: {
      ...sourceValidation,
      ok: false,
      rows: [{ ...sourceValidation.rows[0], ok: false, authPosture: '', failures: [{ check: 'auth posture is explicit and recognized' }] }],
    },
    extractionControlSnapshot: { targets: [healthyTarget], summary: { runningRuns: 0, staleActiveRuns: 0 } },
  })
  const authRequiredActive = buildExtractionRuntimeReadinessSnapshot({
    sourceValidation,
    extractionControlSnapshot: {
      targets: [{ ...healthyTarget, sourceId: 'SRC-AUTH-REQUIRED-001', status: 'active', runtimeMode: 'scheduled' }],
      summary: { runningRuns: 0, staleActiveRuns: 0 },
    },
  })
  const missingCostCaps = buildExtractionRuntimeReadinessSnapshot({
    sourceValidation,
    extractionControlSnapshot: {
      targets: [{ ...healthyTarget, status: 'active', runtimeMode: 'scheduled', budget: {} }],
      summary: { runningRuns: 0, staleActiveRuns: 0 },
    },
  })
  const paidWithoutApproval = validateExtractionRuntimeQueueItem({
    ...healthyTarget,
    accessClass: 'authorized_paid_private',
  }, { sourceValidation })
  const badEnvelope = validateExtractionRuntimeEvidenceEnvelope({
    sourceId: 'SRC-NO-AUTH-001',
    sourceUrl: 'https://example.com',
    capturedAt: 'not-a-date',
    modelProvider: '',
    model: '',
    costUsd: -1,
    confidence: 2,
    proposalOnly: false,
    writesBacklog: true,
    createsPromotedAtom: true,
    outputTarget: 'backlog_write',
  })
  const goodProposal = buildResearchInboxPromotionProposal(buildProposalItemFromEnvelope({
    sourceUrl: 'https://example.com',
    sourceType: 'youtube',
    relatedCards: [EXTRACTION_RUNTIME_READINESS_CARD_ID],
  }))
  const writingProposal = buildResearchInboxPromotionProposal({
    ...buildProposalItemFromEnvelope({
      sourceUrl: 'https://example.com',
      sourceType: 'youtube',
      relatedCards: [EXTRACTION_RUNTIME_READINESS_CARD_ID],
    }),
    autoCreateBacklogCard: true,
  })

  return {
    ok: healthy.ok === true &&
      missingOwnerSource.ok === false &&
      missingAuthPosture.ok === false &&
      authRequiredActive.ok === false &&
      missingCostCaps.ok === false &&
      paidWithoutApproval.ok === false &&
      badEnvelope.ok === false &&
      goodProposal.ok === true &&
      goodProposal.proposalOnly === true &&
      goodProposal.writesBacklog === false &&
      writingProposal.ok === false &&
      writingProposal.writesBacklog === false,
    healthy,
    rejected: {
      missingOwnerSource,
      missingAuthPosture,
      authRequiredActive,
      missingCostCaps,
      paidWithoutApproval,
      badEnvelope,
    },
    proposalOnlyOutput: goodProposal,
    rejectedBacklogWriteOutput: writingProposal,
    dogfoodInvariant: 'Valid no-auth proposal queue passes; missing source contract readiness, missing auth posture, auth-required active target, missing cost caps, paid/private unapproved target, and bad evidence envelopes fail closed while proposal output stays Research Inbox only.',
  }
}

export function buildExtractionRuntimeReadinessExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contract-validation-layer.js',
      'lib/foundation-source-crawl-store.js',
      'lib/research-inbox.js',
      'lib/multimodal-extractor-contract.js',
      'lib/foundation-runtime-read-routes.js',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'docs/process/source-contract-validation-layer-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-source-contract-validation-layer-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'No live extraction without explicit Steve approval.',
      'No auth-required or paid extraction without explicit Steve approval.',
      'Extraction output stays proposal-only until reviewed.',
    ],
    reused: [
      'source contract validation layer',
      'source_crawl_targets/source_crawl_items extraction control tables',
      'multimodal extractor contract',
      'Research Inbox proposal-only gate',
      'foundation runtime read routes',
    ],
    notRebuilt: 'No new live extractor, no OAuth/auth work, no paid-source access, no atom promotion, and no Harlan/Fal/voice/Canva/OpenHuman feature work.',
    exactGap: 'Foundation lacked a fail-closed readiness contract tying extractor queue rows to source/auth posture, evidence envelope requirements, cost/runtime caps, run health, and proposal-only output.',
    overBroadRisk: 'Starting extractor packets before this layer would create live extraction, auth, spend, or atom/backlog mutation risk without Foundation-owned gates.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T21:24:44-04:00',
  }
}
