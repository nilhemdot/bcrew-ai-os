import {
  EXTRACTION_RUNTIME_READINESS_CARD_ID,
  validateExtractionRuntimeQueueItem,
} from './extraction-runtime-readiness.js'
import {
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'

export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID = 'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY = 'extractor-queue-karpathy-kb-video-pack-v1'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH = 'docs/process/extractor-queue-karpathy-kb-video-pack-001-plan.md'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH = 'docs/process/approvals/EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001.json'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH = 'scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-extractor-queue-karpathy-kb-video-pack-closeout.md'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SPRINT_ID = 'extractor-queue-karpathy-kb-video-pack-2026-05-17'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY = 'karpathy-kb-video-pack'
export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'

export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CHANGED_FILES = [
  'lib/extractor-queue-karpathy-kb-video-pack.js',
  'lib/extraction-runtime-readiness.js',
  'lib/source-lifecycle.js',
  'lib/build-intel-watchlist.js',
  'scripts/process-build-intel-intake-check.mjs',
  'lib/foundation-extraction-runtime-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-verifier-control-loop.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-control-plane-records.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'scripts/foundation-verify.mjs',
  'package.json',
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_APPROVAL_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH,
]

export const EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PROOF_COMMANDS = [
  'node --check lib/extractor-queue-karpathy-kb-video-pack.js lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js scripts/process-extractor-queue-karpathy-kb-video-pack-check.mjs scripts/foundation-verify.mjs',
  'npm run process:extractor-queue-karpathy-kb-video-pack-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001.json --closeoutKey=extractor-queue-karpathy-kb-video-pack-v1 --commitRef=HEAD',
]

export const KARPATHY_KB_VIDEO_PACK_SOURCES = [
  {
    sourceKey: 'dream-labs-karpathy-kb-businesses',
    creatorId: 'dream-labs-ai',
    creatorName: 'Dream Labs AI',
    title: "Build Andrej Karpathy's LLM Knowledge Base for Businesses (10x Output!)",
    sourceUrl: 'https://www.youtube.com/watch?v=FAWm7DuFSPc',
    lookupStatus: 'known_public_url_pending_operator_review',
    accessClass: 'public_lookup_required',
    approvalStatus: 'pending_approval',
    extractionStatus: 'not_started',
  },
  {
    sourceKey: 'nate-herk-karpathy-claude-code',
    creatorId: 'nate-herk',
    creatorName: 'Nate Herk',
    title: "Andrej Karpathy Just 10x'd Everyone's Claude Code",
    sourceUrl: 'https://www.youtube.com/watch?v=sboNwYmH3AY',
    lookupStatus: 'known_public_url_pending_operator_review',
    accessClass: 'public_lookup_required',
    approvalStatus: 'pending_approval',
    extractionStatus: 'not_started',
  },
  {
    sourceKey: 'karpathy-llm-wiki-original',
    creatorId: 'andrej-karpathy',
    creatorName: 'Andrej Karpathy',
    title: 'LLM Wiki / Knowledge Base original source note',
    sourceUrl: 'https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f',
    lookupStatus: 'known_public_url_pending_operator_review',
    accessClass: 'public_lookup_required',
    approvalStatus: 'pending_approval',
    extractionStatus: 'not_started',
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

export function buildKarpathyKbVideoPackTarget(overrides = {}) {
  return {
    targetKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY,
    sourceId: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SOURCE_ID,
    title: 'Karpathy LLM Knowledge Base video pack',
    lane: 'corpus_mining',
    targetType: 'public_youtube_video_pack',
    status: 'blocked',
    queueStatus: 'pending_approval',
    priority: 'P0',
    runtimeMode: 'manual',
    cursorState: {
      cursorType: 'explicit_video_pack',
      packetVersion: 1,
      queuedSourceCount: KARPATHY_KB_VIDEO_PACK_SOURCES.length,
    },
    budget: {
      missionMode: 'operator_approved_packet',
      missionUnit: 'public_video_preflight_items',
      maxItemsPerRun: KARPATHY_KB_VIDEO_PACK_SOURCES.length,
      maxRuntimeSeconds: 900,
      maxDailyUsd: 0,
      maxRunUsd: 0,
      maxItemUsd: 0,
      llmBudget: 'none_until_steve_approves_no_auth_no_paid_run',
      requiresFiledOutput: true,
    },
    dedupePolicy: {
      key: 'normalized_source_url:source_key',
      idempotent: true,
    },
    metadata: {
      backlogIds: [EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID, EXTRACTION_RUNTIME_READINESS_CARD_ID],
      approvalStatus: 'pending_approval',
      queueStatus: 'pending_approval',
      blockedReason: 'Steve approval required before any no-auth/no-paid extraction run.',
      nextAction: 'Wait for explicit Steve approval before any crawl, transcript fetch, screenshot capture, summarization, or model call.',
      queuePacketOnly: true,
      noLiveExtraction: true,
      liveRunApproved: false,
      steveApprovalRequiredBeforeRun: true,
      outputTarget: 'research_inbox_proposal',
      sourceCandidates: KARPATHY_KB_VIDEO_PACK_SOURCES,
    },
    notes: 'Queue packet only. Do not crawl, transcribe, summarize, screenshot, or run extraction until Steve explicitly approves a no-auth/no-paid run.',
    ...overrides,
  }
}

export function buildKarpathyKbVideoPackSnapshot({ extractionControlSnapshot = {}, target = null } = {}) {
  const targets = Array.isArray(extractionControlSnapshot.targets) ? extractionControlSnapshot.targets : []
  const liveTarget = target || targets.find(item => item.targetKey === EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY) || null
  const packetTarget = liveTarget || buildKarpathyKbVideoPackTarget()
  const sourceValidation = evaluateSourceContractValidationLayer({
    extractionTargets: [packetTarget],
    sourceRegistryText: 'SOURCE-CONTRACT-VALIDATION-LAYER-001 blocks thin source contracts before connector or extractor work',
    currentStateText: 'SOURCE-CONTRACT-VALIDATION-LAYER-001 keeps source/auth posture explicit before extraction queue work',
  })
  const queueValidation = validateExtractionRuntimeQueueItem(packetTarget, { sourceValidation })
  const sourceCandidates = Array.isArray(packetTarget.metadata?.sourceCandidates)
    ? packetTarget.metadata.sourceCandidates
    : KARPATHY_KB_VIDEO_PACK_SOURCES
  const approvalStatus = normalizeText(packetTarget.queueStatus || packetTarget.metadata?.queueStatus || packetTarget.metadata?.approvalStatus)
  const findings = []

  addFinding(findings, Boolean(liveTarget), 'queue target exists in extraction control', packetTarget.targetKey)
  addFinding(findings, packetTarget.status === 'blocked', 'source crawl target is fail-closed while pending approval', packetTarget.status)
  addFinding(findings, approvalStatus === 'pending_approval', 'queue target approval status stays pending approval', approvalStatus)
  addFinding(findings, packetTarget.runtimeMode === 'manual', 'queue target is manual only', packetTarget.runtimeMode)
  addFinding(findings, !packetTarget.metadata?.foundationJobKey, 'queue target has no scheduled job key', packetTarget.metadata?.foundationJobKey || 'none')
  addFinding(findings, packetTarget.metadata?.noLiveExtraction === true, 'queue target explicitly blocks live extraction', String(packetTarget.metadata?.noLiveExtraction))
  addFinding(findings, packetTarget.metadata?.liveRunApproved !== true, 'queue target has no live-run approval', String(packetTarget.metadata?.liveRunApproved === true))
  addFinding(findings, sourceCandidates.length === 3, 'queue packet contains three source candidates', `${sourceCandidates.length}`)
  addFinding(findings, sourceCandidates.some(item => item.creatorId === 'dream-labs-ai'), 'Dream Labs AI source candidate is queued', sourceCandidates.map(item => item.creatorId).join(', '))
  addFinding(findings, sourceCandidates.some(item => item.creatorId === 'nate-herk'), 'Nate Herk source candidate is queued', sourceCandidates.map(item => item.creatorId).join(', '))
  addFinding(findings, sourceCandidates.some(item => item.creatorId === 'andrej-karpathy'), 'original Karpathy source candidate is queued', sourceCandidates.map(item => item.creatorId).join(', '))
  addFinding(findings, sourceCandidates.every(item => normalizeText(item.sourceUrl)), 'source candidates have lookup URLs', sourceCandidates.map(item => item.sourceUrl || 'missing').join(', '))
  addFinding(findings, sourceCandidates.every(item => item.approvalStatus === 'pending_approval'), 'source candidates stay pending approval', sourceCandidates.map(item => `${item.sourceKey}:${item.approvalStatus}`).join(', '))
  addFinding(findings, queueValidation.ok === true, 'queue target passes readiness shape validation', queueValidation.failures.map(item => item.check).join(', ') || 'valid')
  addFinding(findings, queueValidation.runnable === false, 'pending approval queue target is not runnable', `runnable=${queueValidation.runnable}`)

  return {
    ok: findings.every(finding => finding.ok),
    status: findings.every(finding => finding.ok) ? 'healthy' : 'risk',
    cardId: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CARD_ID,
    closeoutKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_KEY,
    targetKey: EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_TARGET_KEY,
    target: packetTarget,
    sourceCandidates,
    queueValidation,
    findings,
    failures: findings.filter(finding => !finding.ok),
    summary: {
      sourceCandidateCount: sourceCandidates.length,
      status: packetTarget.status,
      approvalStatus,
      runtimeMode: packetTarget.runtimeMode,
      liveRunApproved: packetTarget.metadata?.liveRunApproved === true,
      runnable: queueValidation.runnable,
    },
  }
}

export function buildKarpathyKbVideoPackDogfoodProof() {
  const healthy = buildKarpathyKbVideoPackSnapshot({ target: buildKarpathyKbVideoPackTarget() })
  const activeTarget = buildKarpathyKbVideoPackSnapshot({
    target: buildKarpathyKbVideoPackTarget({ status: 'active', runtimeMode: 'scheduled' }),
  })
  const liveApproved = buildKarpathyKbVideoPackSnapshot({
    target: buildKarpathyKbVideoPackTarget({ metadata: { ...buildKarpathyKbVideoPackTarget().metadata, liveRunApproved: true } }),
  })
  const missingDreamLabs = buildKarpathyKbVideoPackSnapshot({
    target: buildKarpathyKbVideoPackTarget({
      metadata: {
        ...buildKarpathyKbVideoPackTarget().metadata,
        sourceCandidates: KARPATHY_KB_VIDEO_PACK_SOURCES.filter(item => item.creatorId !== 'dream-labs-ai'),
      },
    }),
  })
  const missingUrls = buildKarpathyKbVideoPackSnapshot({
    target: buildKarpathyKbVideoPackTarget({
      metadata: {
        ...buildKarpathyKbVideoPackTarget().metadata,
        sourceCandidates: KARPATHY_KB_VIDEO_PACK_SOURCES.map((item, index) => index === 0 ? { ...item, sourceUrl: '' } : item),
      },
    }),
  })

  return {
    ok: healthy.ok === true &&
      activeTarget.ok === false &&
      liveApproved.ok === false &&
      missingDreamLabs.ok === false &&
      missingUrls.ok === false,
    healthy,
    rejected: {
      activeTarget,
      liveApproved,
      missingDreamLabs,
      missingUrls,
    },
    dogfoodInvariant: 'Karpathy KB video pack passes only as a pending-approval manual queue packet; active/scheduled, live-approved, missing Dream Labs, or missing lookup URL variants fail closed.',
  }
}

export function buildKarpathyKbVideoPackExistingWorkCheck() {
  return {
    existingCode: [
      'lib/extraction-runtime-readiness.js',
      'lib/build-intel-watchlist.js',
      'lib/foundation-source-crawl-store.js',
      'lib/research-inbox.js',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/handoffs/2026-05-17-extraction-runtime-readiness-closeout.md',
      'docs/handoffs/2026-05-17-runtime-memory-build-intel-stab-capture.md',
    ],
    existingScripts: [
      'scripts/process-extraction-runtime-readiness-check.mjs',
      'scripts/seed-extraction-control.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'No live extraction unless separately approved.',
      'No auth-required or paid extraction without Steve approval.',
      'Proposal-only output to Research Inbox/proposed atom state.',
    ],
    reused: [
      'source_crawl_targets extraction control table',
      'extraction runtime readiness queue validator',
      'Build Intel creator watchlist',
      'Research Inbox proposal-only gate',
    ],
    notRebuilt: 'No new extractor runner, no video transcript fetch, no screenshots, no connector/auth work, no atom promotion, and no backlog mutation from extracted content.',
    exactGap: 'The Karpathy KB source packet needed to exist as governed pending-approval queue truth before any extractor or Build Intel preflight work could consume it.',
    overBroadRisk: 'Running extraction directly from chat/video titles would bypass source/auth posture, spend approval, evidence envelope, and proposal-only output gates.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T21:40:00-04:00',
  }
}
