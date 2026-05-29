export const BUILDER_MEMORY_SYSTEM_CARD_ID = 'BUILDER-MEMORY-SYSTEM-001'
export const BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY = 'builder-memory-system-v1'
export const BUILDER_MEMORY_SYSTEM_PLAN_PATH = 'docs/process/builder-memory-system-001-plan.md'
export const BUILDER_MEMORY_SYSTEM_SCRIPT_PATH = 'scripts/process-builder-memory-system-check.mjs'
export const BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID = 'builder-memory:startup-packet:v1'

export const BUILDER_MEMORY_INPUT_REPORT_IDS = [
  'dev-page:system-truth-cleanup:v1',
  'director:dev-daily-source-review-loop:v1',
  'source-system:extraction-state-ledger:v1',
  'source-system:myicor:mcp-catalog-snapshot:v1',
  'source-system:myicor:approved-lesson-extract-proof:v1',
  'source-system:skool:source-system-map:v1',
]

export const BUILDER_MEMORY_RELEVANT_CARD_IDS = [
  'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
  'SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001',
  'LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001',
  'SOURCE-SESSION-BROKER-001',
  'SOURCE-EXTRACTION-STATE-LEDGER-001',
  'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
  'SKOOL-SOURCE-SYSTEM-MAP-001',
  'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
  'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
  BUILDER_MEMORY_SYSTEM_CARD_ID,
]

function text(value, fallback = '') {
  const output = String(value || '').trim()
  return output || fallback
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  return Number(value || 0)
}

function structured(report = {}) {
  return report?.structuredOutputJson || report?.structured_output_json || {}
}

function reportId(report = {}) {
  return text(report?.reportArtifactId || report?.report_artifact_id)
}

function reportUpdatedAt(report = {}) {
  return text(report?.updatedAt || report?.updated_at || report?.createdAt || report?.created_at)
}

function cardId(card = {}) {
  return text(card.id || card.cardId)
}

function compactCard(card = {}) {
  return {
    id: cardId(card),
    title: text(card.title),
    lane: text(card.lane),
    priority: text(card.priority),
    nextAction: text(card.nextAction || card.next_action),
    statusNote: text(card.statusNote || card.status_note),
  }
}

function reportRef(report = {}) {
  return {
    reportArtifactId: reportId(report),
    title: text(report.title),
    status: text(report.status),
    updatedAt: reportUpdatedAt(report),
  }
}

export function buildBuilderMemoryStartupPacket({
  generatedAt = new Date().toISOString(),
  currentSprint = {},
  backlogCards = [],
  devPageSystemTruthReport = {},
  dailySourceReviewReport = {},
  sourceLedgerReport = {},
  myicorCatalogReport = {},
  myicorApprovedLessonExtractReport = {},
  skoolSourceSystemMapReport = {},
} = {}) {
  const sprint = currentSprint?.sprint || {}
  const sprintItems = list(currentSprint?.items)
  const activeCard = sprintItems.find(item => text(item.cardId) === text(sprint.activeBlockerCardId)) || null
  const cards = list(backlogCards).map(compactCard)
  const cardsById = new Map(cards.map(card => [card.id, card]))
  const reports = [
    devPageSystemTruthReport,
    dailySourceReviewReport,
    sourceLedgerReport,
    myicorCatalogReport,
    myicorApprovedLessonExtractReport,
    skoolSourceSystemMapReport,
  ].filter(report => reportId(report))

  const systemTruth = structured(devPageSystemTruthReport)
  const dailyReview = structured(dailySourceReviewReport)
  const ledger = structured(sourceLedgerReport)
  const myicor = structured(myicorCatalogReport)
  const myicorExtract = structured(myicorApprovedLessonExtractReport)
  const myicorSnapshot = myicor.snapshot || myicor
  const skool = structured(skoolSourceSystemMapReport)
  const systemSummary = systemTruth.summary || {}
  const dailySummary = dailyReview.summary || {}
  const ledgerSummary = ledger.summary || {}
  const myicorCounts = myicorSnapshot.counts || {}
  const skoolSummary = skool.summary || {}
  const doneCards = cards.filter(card => card.lane === 'done')
  const scopedCards = cards.filter(card => card.lane === 'scoped')

  const loadOrder = [
    {
      order: 1,
      source: 'AGENTS.md startup files',
      action: 'Follow local startup rules separately for main sessions; private files remain local-only and are not copied into this packet.',
    },
    {
      order: 2,
      source: 'Live Current Sprint',
      action: 'Use active sprint/blocker before choosing work.',
      ref: '/api/foundation/current-sprint',
    },
    {
      order: 3,
      source: 'Dev Page System Truth',
      action: 'Read built/running/blocked system truth before trusting chat claims.',
      ref: 'dev-page:system-truth-cleanup:v1',
    },
    {
      order: 4,
      source: 'Daily Source Review',
      action: 'Use source queues and packet candidates without auto-promoting backlog cards.',
      ref: 'director:dev-daily-source-review-loop:v1',
    },
    {
      order: 5,
      source: 'Backlog Cards',
      action: 'Use live card lane/status as task truth.',
      ref: BUILDER_MEMORY_RELEVANT_CARD_IDS.join(', '),
    },
    {
      order: 6,
      source: 'Current Plan / Current State / Handoff',
      action: 'Use docs for doctrine and handoff context, not as live value source when DB/API disagrees.',
      ref: 'docs/rebuild/current-plan.md; docs/rebuild/current-state.md; docs/handoffs/2026-05-29-human-web-agent-v1-sprint-reset-closeout.md',
    },
  ]

  const guardrails = [
    'Browserbase is parked outside Human Web Agent V1 unless Steve explicitly approves a tiny bakeoff.',
    'Do not use Steve normal Chrome profile; use source-owned isolated sessions only when approved.',
    'Do not run login, MFA, join, purchase, download, post, comment, message, or paid/private extraction without exact approval.',
    'Do not auto-promote Dev Director recommendations into backlog or Scoper.',
    'Do not mutate source rows, write atoms/vectors, delete history, or write externally from builder memory.',
    'Do not treat chat memory, old audits, or stale docs as active truth when live DB/API/report artifacts disagree.',
  ]

  const staleClaimRejectionRules = [
    'Live Postgres/API report artifacts beat markdown snapshots for current counts and lanes.',
    'Recent work and status notes need proof commands; do not accept "worked last night" without readback.',
    'Metadata-only MyICOR/Skool rows are packet candidates, not extracted evidence.',
    'Browser challenge rows are fallback work, not completed source evidence.',
    'Suppressed or implemented-cleared source items remain searchable history; they are not deleted.',
  ]

  const startupChecklist = [
    'Read this startup packet before changing code.',
    'Confirm active blocker and card lane.',
    'Check Dev page systemTruth for built/running/blocked systems.',
    'Check focused proof commands for the target card.',
    'Name any drift between live DB/API, docs, and chat before building.',
    'Keep work scoped to the active card unless Steve explicitly overrides.',
  ]

  return {
    schemaVersion: 1,
    generatedAt,
    cardId: BUILDER_MEMORY_SYSTEM_CARD_ID,
    closeoutKey: BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
    reportArtifactId: BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
    status: 'startup_packet_ready',
    summary: {
      activeSprintId: text(sprint.sprintId),
      activeBlockerCardId: text(sprint.activeBlockerCardId),
      activeCardStage: text(activeCard?.stage),
      relevantCardCount: cards.length,
      doneRelevantCardCount: doneCards.length,
      scopedRelevantCardCount: scopedCards.length,
      reportCount: reports.length,
      systemTruthSystemCount: number(systemSummary.systemCount),
      sourceLedgerItemCount: number(systemSummary.sourceLedgerItemCount || ledgerSummary.itemCount),
      extractedEvidenceCandidateCount: number(systemSummary.extractedEvidenceCandidateCount || dailySummary.extractedEvidenceCandidateCount),
      myicorExtractedEvidenceCount: reportId(myicorApprovedLessonExtractReport) ? 1 : 0,
      myicorExtractedEvidenceTextChars: number(myicorExtract.extraction?.textChars),
      myicorPacketCandidateCount: number(systemSummary.myicorPriorityPacketCount || dailySummary.myicorPacketCandidateCount || list(myicorSnapshot.priorityCandidates).length || myicorCounts.highPriorityCandidateCount),
      skoolTargetCount: number(systemSummary.skoolTargetCount || skoolSummary.targetCount),
      directorCandidateCount: number(systemSummary.directorCandidateCount || dailySummary.existingDirectorCandidateCount),
      privateMemoryIncluded: false,
      chatMemoryAuthoritative: false,
      externalWrites: 0,
      extractionRunsStarted: 0,
      browserSessionsStarted: 0,
    },
    activeSprint: {
      sprintId: text(sprint.sprintId),
      status: text(sprint.status),
      activeBlockerCardId: text(sprint.activeBlockerCardId),
      activeCardTitle: text(activeCard?.title || activeCard?.summary || cardsById.get(text(sprint.activeBlockerCardId))?.title),
      activeCardStage: text(activeCard?.stage),
      nextAction: text(activeCard?.nextAction || cardsById.get(text(sprint.activeBlockerCardId))?.nextAction),
    },
    loadOrder,
    startupChecklist,
    guardrails,
    staleClaimRejectionRules,
    sourceReports: reports.map(reportRef),
    relevantCards: cards,
    builtSystems: list(systemTruth.systems).map(system => ({
      systemId: text(system.systemId),
      title: text(system.title),
      state: text(system.state),
      reportArtifactId: text(system.reportArtifactId),
      nextAction: text(system.nextAction),
    })),
    nextCards: [
      {
        cardId: 'BUILDER-MEMORY-SYSTEM-001',
        status: 'this_v1_packet_closes_startup_memory_foundation',
        nextAction: 'Use packet as the first builder readback before the next exact Skool/MyICOR source packet.',
      },
      {
        cardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
        status: reportId(myicorApprovedLessonExtractReport) ? 'done_exact_extraction_evidence_ready' : 'next_exact_source_packet_candidate',
        nextAction: reportId(myicorApprovedLessonExtractReport)
          ? 'Use source-system:myicor:approved-lesson-extract-proof:v1 as proposal evidence; broaden only through another exact approval.'
          : 'Approve one exact high-value lesson/resource before content extraction.',
      },
      {
        cardId: 'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
        status: 'blocked_until_exact_public_packet_and_session_boundary',
        nextAction: 'Run only approved visible/session-ready free/public Skool packet.',
      },
    ],
    proofCommands: [
      'npm run process:builder-memory-system-check -- --apply --json',
      'npm run process:builder-memory-system-check -- --json',
      'npm run process:dev-page-system-truth-cleanup-check -- --json',
      'npm run process:dev-team-hub-v0-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    privacyBoundary: {
      readsPrivateMemoryFiles: false,
      includesMemoryMd: false,
      includesUserMd: false,
      includesSecrets: false,
      note: 'Main-session AGENTS.md startup still reads local private memory files. This repo report does not copy or publish those files.',
    },
  }
}

export function evaluateBuilderMemoryStartupPacket(packet = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const summary = packet.summary || {}
  const privacy = packet.privacyBoundary || {}

  add(packet.cardId === BUILDER_MEMORY_SYSTEM_CARD_ID, 'packet is tied to builder memory card', packet.cardId || 'missing')
  add(packet.status === 'startup_packet_ready', 'packet has ready status', packet.status || 'missing')
  add(text(summary.activeSprintId).includes('HUMAN-WEB-AGENT-V1') || text(summary.activeBlockerCardId), 'packet includes active sprint/blocker truth', `${summary.activeSprintId || 'missing'} / ${summary.activeBlockerCardId || 'missing'}`)
  add(number(summary.relevantCardCount) >= 6, 'packet includes relevant backlog cards', String(summary.relevantCardCount || 0))
  add(number(summary.reportCount) >= 6, 'packet includes source-system report references', String(summary.reportCount || 0))
  add(number(summary.sourceLedgerItemCount) > 0, 'packet includes source ledger counts', String(summary.sourceLedgerItemCount || 0))
  add(number(summary.extractedEvidenceCandidateCount) > 0 && number(summary.myicorExtractedEvidenceCount) > 0, 'packet includes exact extracted evidence counts', `${summary.extractedEvidenceCandidateCount || 0}/${summary.myicorExtractedEvidenceCount || 0}`)
  add(number(summary.myicorPacketCandidateCount) > 0 && number(summary.skoolTargetCount) > 0, 'packet includes MyICOR and Skool source-system counts', `${summary.myicorPacketCandidateCount || 0}/${summary.skoolTargetCount || 0}`)
  add(number(summary.directorCandidateCount) > 0, 'packet includes Director candidate base', String(summary.directorCandidateCount || 0))
  add(summary.privateMemoryIncluded === false && summary.chatMemoryAuthoritative === false, 'packet rejects private/chat memory as repo truth', JSON.stringify({ privateMemoryIncluded: summary.privateMemoryIncluded, chatMemoryAuthoritative: summary.chatMemoryAuthoritative }))
  add(number(summary.externalWrites) === 0 && number(summary.extractionRunsStarted) === 0 && number(summary.browserSessionsStarted) === 0, 'packet performs no writes, extraction, or browser sessions', JSON.stringify(summary))
  add(
    privacy.readsPrivateMemoryFiles === false &&
      privacy.includesMemoryMd === false &&
      privacy.includesUserMd === false &&
      privacy.includesSecrets === false,
    'privacy boundary excludes local private memory and secrets',
    JSON.stringify(privacy),
  )
  add(list(packet.loadOrder).length >= 6 && list(packet.startupChecklist).length >= 5, 'packet includes load order and startup checklist', `${list(packet.loadOrder).length}/${list(packet.startupChecklist).length}`)
  add(list(packet.guardrails).some(item => /Browserbase is parked/i.test(item)) && list(packet.guardrails).some(item => /normal Chrome/i.test(item)), 'packet carries browser/source-session guardrails', list(packet.guardrails).join(' | '))
  add(list(packet.staleClaimRejectionRules).some(item => /Live Postgres\/API/i.test(item)), 'packet includes stale-claim rejection rules', list(packet.staleClaimRejectionRules).join(' | '))
  add(list(packet.proofCommands).some(command => command.includes('process:builder-memory-system-check')), 'packet includes focused proof command', list(packet.proofCommands).join('; '))

  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'blocked' : 'healthy', checks, failed }
}

export function buildBuilderMemorySystemDogfoodProof() {
  const packet = buildBuilderMemoryStartupPacket({
    currentSprint: {
      sprint: {
        sprintId: 'HUMAN-WEB-AGENT-V1-2026-05-29',
        status: 'active',
        activeBlockerCardId: 'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
      },
      items: [{
        cardId: 'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
        title: 'Source browser agentic runtime',
        stage: 'building_now',
        nextAction: 'Build local-first source browser runtime.',
      }],
    },
    backlogCards: BUILDER_MEMORY_RELEVANT_CARD_IDS.map(id => ({
      id,
      title: id,
      lane: id === BUILDER_MEMORY_SYSTEM_CARD_ID ? 'scoped' : 'done',
      priority: 'P0',
      next_action: 'Synthetic next action.',
    })),
    devPageSystemTruthReport: {
      reportArtifactId: 'dev-page:system-truth-cleanup:v1',
      status: 'generated',
      structuredOutputJson: {
        summary: {
          systemCount: 6,
          sourceLedgerItemCount: 200,
          extractedEvidenceCandidateCount: 1,
          myicorPriorityPacketCount: 12,
          skoolTargetCount: 4,
          directorCandidateCount: 100,
        },
        systems: [{ systemId: 'source-ledger', title: 'Source Ledger', state: 'built', reportArtifactId: 'source-system:extraction-state-ledger:v1', nextAction: 'Use it.' }],
      },
    },
    dailySourceReviewReport: {
      reportArtifactId: 'director:dev-daily-source-review-loop:v1',
      status: 'generated',
      structuredOutputJson: { summary: { existingDirectorCandidateCount: 100, extractedEvidenceCandidateCount: 1, myicorPacketCandidateCount: 12, skoolPacketTargetCount: 4 } },
    },
    sourceLedgerReport: {
      reportArtifactId: 'source-system:extraction-state-ledger:v1',
      status: 'generated',
      structuredOutputJson: { summary: { itemCount: 200 } },
    },
    myicorCatalogReport: {
      reportArtifactId: 'source-system:myicor:mcp-catalog-snapshot:v1',
      status: 'generated',
      structuredOutputJson: { snapshot: { counts: { highPriorityCandidateCount: 9 }, priorityCandidates: [{ title: 'Agent' }] } },
    },
    myicorApprovedLessonExtractReport: {
      reportArtifactId: 'source-system:myicor:approved-lesson-extract-proof:v1',
      status: 'generated',
      structuredOutputJson: { extraction: { textChars: 18033 } },
    },
    skoolSourceSystemMapReport: {
      reportArtifactId: 'source-system:skool:source-system-map:v1',
      status: 'generated',
      structuredOutputJson: { summary: { targetCount: 4 } },
    },
  })
  const evaluation = evaluateBuilderMemoryStartupPacket(packet)
  return {
    ok: evaluation.ok,
    packet,
    checks: evaluation.checks,
    failureSummary: evaluation.failed.map(item => item.check).join(', '),
  }
}

export function buildBuilderMemorySystemReportArtifact(packet = {}) {
  return {
    reportArtifactId: BUILDER_MEMORY_SYSTEM_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
    department: 'foundation',
    title: 'Builder Memory Startup Packet V1',
    status: 'generated',
    sourceIds: ['SRC-YOUTUBE-INTEL-001', 'SRC-MYICRO-001', 'SRC-SKOOL-001'],
    inputArtifactIds: list(packet.sourceReports).map(report => report.reportArtifactId).filter(Boolean),
    sourceCoverage: list(packet.sourceReports).map(report => ({
      sourceId: report.reportArtifactId,
      status: report.status,
      updatedAt: report.updatedAt,
    })),
    topFindings: [
      {
        title: 'Builder startup memory now comes from live sprint/backlog/report truth.',
        detail: `${number(packet.summary?.relevantCardCount)} cards and ${number(packet.summary?.reportCount)} reports are loaded into the startup packet.`,
      },
      {
        title: 'Private memory is explicitly excluded from repo truth.',
        detail: 'The packet does not copy MEMORY.md, USER.md, memory daily files, or secrets.',
      },
      {
        title: 'Stale claims are rejected before build work.',
        detail: 'Live DB/API/report artifacts outrank chat memory, old audits, and stale markdown snapshots.',
      },
    ],
    actionRequiredItems: [
      {
        cardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
        action: 'Use the exact MyICOR extraction proof as proposal evidence before approving any broader or second MyICOR source packet.',
      },
      {
        cardId: 'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
        action: 'Use the startup packet before any exact approved free/public Skool packet run.',
      },
    ],
    structuredOutputJson: packet,
    metadata: {
      cardId: BUILDER_MEMORY_SYSTEM_CARD_ID,
      closeoutKey: BUILDER_MEMORY_SYSTEM_CLOSEOUT_KEY,
      planPath: BUILDER_MEMORY_SYSTEM_PLAN_PATH,
      proofCommand: 'npm run process:builder-memory-system-check -- --apply --json',
      privateMemoryIncluded: false,
      externalWrites: 0,
      extractionRunsStarted: 0,
      browserSessionsStarted: 0,
    },
  }
}
