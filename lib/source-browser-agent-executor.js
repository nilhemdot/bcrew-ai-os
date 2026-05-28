import crypto from 'node:crypto'
import path from 'node:path'

import {
  buildCreatorNewsletterIntakePacket,
  runCreatorNewsletterIntake,
} from './creator-newsletter-intake-runner.js'
import {
  buildPublicRepoDeepReviewPacket,
  runPublicRepoDeepReview,
} from './public-repo-deep-review-runner.js'
import {
  runSkoolFreeCommunityGodMode,
} from './skool-free-community-god-mode-runner.js'
import {
  runSourceGodModeExtractor,
} from './source-god-mode-extractor-runtime.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from './source-session-broker.js'
import {
  SOURCE_BROWSER_AGENT_CARD_ID,
  SOURCE_BROWSER_AGENT_ID,
  SOURCE_BROWSER_AGENT_READBACK_VERSION,
  SOURCE_BROWSER_AGENT_RUN_ROOT,
  SOURCE_BROWSER_AGENT_SOURCE_ID,
  SOURCE_BROWSER_AGENT_TARGET_KEY,
  buildSourceBrowserAgentCrawlItemInput,
  planSourceBrowserAgentRun,
} from './source-browser-agent-harness.js'

export const SOURCE_BROWSER_AGENT_EXECUTOR_SCRIPT_PATH = 'scripts/process-source-browser-agent-executor-check.mjs'
export const SOURCE_BROWSER_AGENT_EXECUTOR_VERSION = 'source-browser-agent-executor-v1'
export const SOURCE_BROWSER_AGENT_EXECUTOR_CLOSEOUT_KEY = 'source-browser-agent-executor-v1'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function safeKey(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source'
}

function sideEffects(overrides = {}) {
  return {
    externalRunStarted: false,
    liveBrowserLaunched: false,
    networkFetched: false,
    modelCalled: false,
    manualClicks: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    optedIn: false,
    postedOrMessaged: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    normalChromeProfileUsed: false,
    rawSecretPrinted: false,
    ...overrides,
  }
}

function mergeSideEffects(...values) {
  return values.reduce((acc, value) => {
    for (const [key, raw] of Object.entries(value || {})) {
      acc[key] = acc[key] === true || raw === true
    }
    return acc
  }, sideEffects())
}

function sourceRunHasUnsafeSideEffect(effects = {}) {
  return effects.externalWrites === true ||
    effects.writesBacklog === true ||
    effects.submittedForm === true ||
    effects.downloadedFile === true ||
    effects.purchased === true ||
    effects.postedOrMessaged === true ||
    effects.mutatesCredentials === true ||
    effects.normalChromeProfileUsed === true
}

function usefulSignalText(signal = {}) {
  return text(signal.text || signal.title || signal.aiosUse || signal)
}

function normalizeSourceRuntimeReport(report = {}) {
  return {
    runnerStatus: text(report.status),
    ok: report.ok === true,
    pagesRead: list(report.pages).length,
    handsEvents: list(report.handsEvents).length,
    newsletterCandidates: list(report.newsletterCandidates).length,
    paidGateEvaluations: list(report.paidGateEvaluations).length,
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      depth: page.depth,
      textChars: page.textChars,
      headings: list(page.headings).slice(0, 6),
      blockers: list(page.pageBlockers),
    })).slice(0, 12),
    freeResourceCaptures: list(report.freeResourceCaptures).slice(0, 40),
    fileResourceCandidates: list(report.fileResourceCandidates).slice(0, 40),
    blockers: list(report.blockers).slice(0, 40),
    valueScore: report.brain?.valueScore || null,
    usefulSignals: list(report.brain?.usefulSignals).map(usefulSignalText).filter(Boolean).map(signal => ({ text: signal })).slice(0, 20),
    sourceStackUpdate: report.sourceStackUpdate || null,
    sopCompletion: report.sopCompletion || null,
    artifacts: report.artifacts || {},
    sideEffects: mergeSideEffects(report.sideEffects, {
      externalRunStarted: true,
      liveBrowserLaunched: report.runtime?.mode === 'live_browser',
      networkFetched: report.runtime?.mode === 'live_browser',
    }),
  }
}

function normalizeRepoReport(report = {}) {
  const packet = buildPublicRepoDeepReviewPacket(report)
  return {
    runnerStatus: text(report.status),
    ok: report.ok === true,
    pagesRead: number(report.pagesRead, list(report.pages).length),
    handsEvents: 0,
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      pageKind: page.pageKind,
      installOrCloneWarning: page.installOrCloneWarning === true,
      linkBlockers: list(page.linkClassifications).filter(link => link.shouldFollow === false).slice(0, 10),
    })).slice(0, 12),
    freeResourceCaptures: [],
    fileResourceCandidates: [],
    blockers: list(report.blockedLinks).slice(0, 40),
    valueScore: null,
    usefulSignals: list(packet.implementationPatterns).map(pattern => ({
      type: 'repo_implementation_pattern',
      title: pattern.title,
      text: pattern.title,
      patternId: pattern.patternId,
      sourceUrl: pattern.sourceUrl,
      evidenceSnippet: pattern.evidenceSnippet,
    })).slice(0, 20),
    repoReviewPacket: packet,
    implementationPatterns: list(packet.implementationPatterns),
    sopCompletion: {
      sourceFamily: 'public_code_repo',
      readmeSeen: report.sourceCoverage?.readmeSeen === true,
      docsSeen: report.sourceCoverage?.docsSeen === true,
      examplesSeen: report.sourceCoverage?.examplesSeen === true,
      licenseSeen: report.sourceCoverage?.licenseSeen === true,
      implementationPatternCount: packet.implementationPatternCount,
    },
    artifacts: {},
    sideEffects: mergeSideEffects(report.sideEffects, {
      externalRunStarted: true,
      networkFetched: true,
    }),
  }
}

function normalizeNewsletterReport(report = {}) {
  const packet = buildCreatorNewsletterIntakePacket(report)
  return {
    runnerStatus: text(report.status),
    ok: report.ok === true,
    pagesRead: report.url ? 1 : 0,
    handsEvents: 0,
    newsletterCandidates: report.selectedForm ? 1 : 0,
    paidGateEvaluations: 0,
    pageSummaries: [{
      url: report.url,
      title: report.title,
      formCount: number(report.formCount, 0),
      safeFormDetected: Boolean(report.selectedForm),
      submitAllowedNow: report.submitAllowedNow === true,
    }],
    freeResourceCaptures: [],
    fileResourceCandidates: [],
    blockers: list(report.blockers).slice(0, 40),
    valueScore: null,
    usefulSignals: [
      report.plainEnglish,
      packet.nextAction,
    ].map(text).filter(Boolean).map(signal => ({ text: signal })),
    newsletterIntakePacket: packet,
    sourceStackUpdate: {
      sourceId: packet.packetId || report.runId || hostOf(report.url),
      creatorId: hostOf(report.url),
      creatorName: hostOf(report.url),
      sourceFamily: 'creator_newsletters',
      sourceType: 'creator_newsletter',
      url: report.url,
      account: report.sourceIdentity?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      status: report.status,
      terminalState: report.ok === true ? 'completed' : 'blocked',
      toolRoute: 'newsletter:intake',
      nextAction: packet.nextAction,
      surfaces: {
        newsletter: report.ok === true ? 'dry_run_packet_ready' : 'blocked',
        submit: report.submitAllowedNow === true ? 'allowed_local_fixture_only' : 'not_submitted',
      },
    },
    sopCompletion: {
      sourceFamily: 'creator_newsletter',
      publicPageRead: Boolean(report.url),
      safeFormDetected: Boolean(report.selectedForm),
      submittedExternally: report.sideEffects?.externalSignupSubmitted === true,
    },
    artifacts: {},
    sideEffects: mergeSideEffects(report.sideEffects, {
      externalRunStarted: true,
      networkFetched: true,
    }),
  }
}

function normalizeSkoolReport(report = {}) {
  return {
    runnerStatus: text(report.status),
    ok: report.ok === true,
    pagesRead: number(report.counts?.pagesRead, list(report.pages).length),
    handsEvents: number(report.counts?.handsEvents, list(report.handsEvents).length),
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    pageSummaries: list(report.pages).map(page => ({
      url: page.url,
      title: page.title,
      textChars: page.textChars,
      headings: list(page.headings).slice(0, 6),
      recentActivityItems: list(page.activityItems).filter(item => item.withinLookback).slice(0, 6),
      safeResourceCandidates: list(page.linkClassifications).filter(link => link.decision === 'safe_external_resource_candidate').slice(0, 10),
      authState: page.authState || null,
    })).slice(0, 12),
    freeResourceCaptures: list(report.pages).flatMap(page => list(page.linkClassifications))
      .filter(link => link.decision === 'safe_external_resource_candidate')
      .slice(0, 40),
    fileResourceCandidates: [],
    blockers: list(report.pages).flatMap(page => list(page.linkClassifications))
      .filter(link => link.blocker)
      .slice(0, 40),
    valueScore: null,
    usefulSignals: [],
    sourceStackUpdate: null,
    sopCompletion: report.sopCompletion || null,
    artifacts: report.artifacts || {},
    sideEffects: mergeSideEffects(report.sideEffects, {
      externalRunStarted: true,
      liveBrowserLaunched: true,
      networkFetched: true,
    }),
    authNeeded: report.authNeeded || null,
  }
}

function normalizeRunnerReport({
  plan = {},
  runnerReport = {},
  runner = '',
} = {}) {
  if (runner === 'source:god-mode') return normalizeSourceRuntimeReport(runnerReport)
  if (runner === 'repo:deep-review') return normalizeRepoReport(runnerReport)
  if (runner === 'newsletter:intake') return normalizeNewsletterReport(runnerReport)
  if (runner === 'skool:free-god-mode') return normalizeSkoolReport(runnerReport)
  return {
    runnerStatus: text(runnerReport.status || plan.status || 'unknown_runner_status'),
    ok: runnerReport.ok === true,
    pagesRead: 0,
    handsEvents: 0,
    newsletterCandidates: 0,
    paidGateEvaluations: 0,
    pageSummaries: [],
    freeResourceCaptures: [],
    fileResourceCandidates: [],
    blockers: list(runnerReport.blockers).slice(0, 40),
    valueScore: null,
    usefulSignals: [],
    sourceStackUpdate: null,
    sopCompletion: null,
    artifacts: runnerReport.artifacts || {},
    sideEffects: sideEffects(),
  }
}

export function buildSourceBrowserAgentExecutionCrawlItemInput({
  plan = {},
  runnerReport = null,
  runnerSummary = {},
  row = {},
  batchRunId = '',
  capturedAt = plan.createdAt || new Date().toISOString(),
  executionStatus = '',
} = {}) {
  const item = buildSourceBrowserAgentCrawlItemInput(plan, { batchRunId, capturedAt, row })
  const runner = text(plan.toolRoute?.toolId || runnerSummary.runner || item.metadata?.runner)
  const ok = runnerReport ? runnerSummary.ok === true : false
  const mergedSideEffects = mergeSideEffects(item.metadata?.sideEffects, runnerSummary.sideEffects)
  const sourceStackUpdate = runnerSummary.sourceStackUpdate
    ? {
        ...(item.metadata?.sourceStackUpdate || {}),
        ...runnerSummary.sourceStackUpdate,
        surfaces: {
          ...(item.metadata?.sourceStackUpdate?.surfaces || {}),
          ...(runnerSummary.sourceStackUpdate.surfaces || {}),
        },
      }
    : item.metadata?.sourceStackUpdate || null
  const status = text(executionStatus || (runnerReport ? runnerSummary.runnerStatus : plan.status))
  const artifactId = text(runnerSummary.artifacts?.reportPath || runnerSummary.repoReviewPacket?.packetId || runnerSummary.newsletterIntakePacket?.packetId || item.artifactId)
  return {
    ...item,
    itemType: 'source_browser_agent_execution',
    status: ok ? 'succeeded' : 'failed',
    fingerprint: stableHash({
      sourceId: item.metadata?.sourceBrowserAgentPlan?.sourceId,
      url: item.metadata?.url,
      runner,
      status,
      ok,
      pagesRead: runnerSummary.pagesRead,
      unsafe: sourceRunHasUnsafeSideEffect(mergedSideEffects),
    }),
    lastError: ok ? null : text(plan.stopReason || status || 'source_browser_agent_execution_blocked'),
    artifactId,
    metadata: {
      ...(item.metadata || {}),
      sourceBrowserAgentReadbackVersion: SOURCE_BROWSER_AGENT_READBACK_VERSION,
      sourceBrowserAgentExecutionVersion: SOURCE_BROWSER_AGENT_EXECUTOR_VERSION,
      executionMode: runnerReport ? 'runner_executed' : 'plan_blocked_no_runner',
      runner,
      status,
      runnerStatus: text(runnerSummary.runnerStatus || ''),
      ok,
      pagesRead: number(runnerSummary.pagesRead, 0),
      handsEvents: number(runnerSummary.handsEvents, 0),
      newsletterCandidates: number(runnerSummary.newsletterCandidates, 0),
      paidGateEvaluations: number(runnerSummary.paidGateEvaluations, 0),
      pageSummaries: list(runnerSummary.pageSummaries).slice(0, 12),
      freeResourceCaptures: list(runnerSummary.freeResourceCaptures).slice(0, 40),
      fileResourceCandidates: list(runnerSummary.fileResourceCandidates).slice(0, 40),
      blockers: [
        ...list(item.metadata?.blockers),
        ...list(runnerSummary.blockers),
      ].slice(0, 40),
      valueScore: runnerSummary.valueScore || item.metadata?.valueScore || null,
      usefulSignals: [
        ...list(item.metadata?.usefulSignals),
        ...list(runnerSummary.usefulSignals),
      ].slice(0, 20),
      repoReviewPacket: runnerSummary.repoReviewPacket || null,
      implementationPatterns: list(runnerSummary.implementationPatterns).slice(0, 20),
      newsletterIntakePacket: runnerSummary.newsletterIntakePacket || null,
      sopCompletion: runnerSummary.sopCompletion || null,
      authNeeded: runnerSummary.authNeeded || item.metadata?.authNeeded || null,
      sourceStackUpdate,
      artifacts: runnerSummary.artifacts || item.metadata?.artifacts || {},
      sideEffects: mergedSideEffects,
      unsafeSideEffectDetected: sourceRunHasUnsafeSideEffect(mergedSideEffects),
      noScoperPromotion: true,
      noAutoBacklog: true,
      noExternalWrites: true,
    },
  }
}

export function buildBlockedSourceBrowserAgentExecution({
  plan = {},
  row = {},
  capturedAt = plan.createdAt || new Date().toISOString(),
} = {}) {
  const crawlItem = buildSourceBrowserAgentExecutionCrawlItemInput({
    plan,
    runnerReport: null,
    runnerSummary: {
      runnerStatus: plan.status || 'blocked_before_runner',
      ok: false,
      sideEffects: sideEffects(),
    },
    row,
    capturedAt,
    executionStatus: plan.status || 'blocked_before_runner',
  })
  return {
    ok: false,
    status: 'source_browser_agent_blocked_before_runner',
    plan,
    runner: text(plan.toolRoute?.toolId),
    runnerReport: null,
    crawlItem,
    sideEffects: sideEffects(),
    plainEnglish: 'Source Browser Agent stopped before running a source tool because the plan needed auth, source-session readiness, a clean browser state, or another policy boundary.',
  }
}

async function runReadySourceBrowserAgentTool({
  plan = {},
  mode = 'live_browser',
  htmlByUrl = {},
  maxPages = 4,
  maxDepth = 1,
  headed = false,
  allowLocalFixture = false,
  allowSourceSessionRun = false,
  fetchImpl = globalThis.fetch,
  rootDir = SOURCE_BROWSER_AGENT_RUN_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const runner = text(plan.runnerCommand?.packageScript || plan.toolRoute?.toolId)
  const url = text(plan.sourcePacket?.url)
  const sourceType = text(plan.sourcePacket?.sourceType || plan.sourcePacket?.sourceFamily)
  if (runner === 'source:god-mode') {
    return runSourceGodModeExtractor({
      url,
      sourceType: sourceType || 'public_or_free_source',
      creatorId: text(plan.sourcePacket?.sourceId || hostOf(url)),
      creatorName: text(plan.sourcePacket?.sourceId || hostOf(url)),
      mode,
      htmlByUrl,
      maxPages,
      maxDepth,
      headed,
      rootDir: path.join(rootDir, 'source-god-mode'),
      now,
    })
  }
  if (runner === 'repo:deep-review') {
    return runPublicRepoDeepReview({
      url,
      allowLocalFixture,
      maxPages,
      maxDepth,
      fetchImpl,
      now,
    })
  }
  if (runner === 'newsletter:intake') {
    return runCreatorNewsletterIntake({
      url,
      account: text(plan.sourcePacket?.account) || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      apply: false,
      allowLocalFixture,
      allowExternalSignup: false,
      fetchImpl,
      now,
    })
  }
  if (runner === 'skool:free-god-mode') {
    if (allowSourceSessionRun !== true) {
      return {
        ok: false,
        status: 'blocked_source_session_execution_not_enabled',
        reason: 'free_skool_requires_approved_source_session_run',
        pages: [],
        counts: { pagesRead: 0, handsEvents: 0 },
        blockers: [{
          type: 'source_session_run_not_enabled',
          reason: 'The agent plan may be ready, but this executor will not run a session-bound Skool community unless allowSourceSessionRun is explicit.',
          nextAction: 'Prove the isolated Skool source session first, then rerun with the source-session lane.',
        }],
        sideEffects: sideEffects(),
      }
    }
    return runSkoolFreeCommunityGodMode({
      url,
      allowLocalFixture,
      headed,
      maxPages,
      maxDepth,
      rootDir: path.join(rootDir, 'skool-free-community'),
      profileDir: path.join(rootDir, 'profiles', safeKey(plan.sourcePacket?.sourceId || url)),
      now,
    })
  }
  return {
    ok: false,
    status: 'blocked_unknown_agent_runner',
    reason: `No execution wrapper exists for ${runner || 'unknown runner'}.`,
    sideEffects: sideEffects(),
  }
}

export async function executeSourceBrowserAgentRun({
  packet = {},
  observation = {},
  mode = 'live_browser',
  htmlByUrl = {},
  maxPages = 4,
  maxDepth = 1,
  headed = false,
  allowLocalFixture = false,
  allowSourceSessionRun = false,
  fetchImpl = globalThis.fetch,
  rootDir = SOURCE_BROWSER_AGENT_RUN_ROOT,
  now = new Date().toISOString(),
  row = {},
  batchRunId = '',
} = {}) {
  const plan = planSourceBrowserAgentRun({
    packet,
    observation,
    now,
  })
  const capturedAt = now
  if (plan.ok !== true || plan.terminalState !== 'completed') {
    return buildBlockedSourceBrowserAgentExecution({ plan, row, capturedAt })
  }

  const runner = text(plan.runnerCommand?.packageScript || plan.toolRoute?.toolId)
  const runnerReport = await runReadySourceBrowserAgentTool({
    plan,
    mode,
    htmlByUrl,
    maxPages,
    maxDepth,
    headed,
    allowLocalFixture,
    allowSourceSessionRun,
    fetchImpl,
    rootDir,
    now,
  })
  const runnerSummary = normalizeRunnerReport({ plan, runnerReport, runner })
  const crawlItem = buildSourceBrowserAgentExecutionCrawlItemInput({
    plan,
    runnerReport,
    runnerSummary,
    row,
    batchRunId,
    capturedAt,
    executionStatus: runnerSummary.runnerStatus,
  })
  const unsafeSideEffectDetected = sourceRunHasUnsafeSideEffect(crawlItem.metadata?.sideEffects || {})
  return {
    ok: runnerSummary.ok === true && unsafeSideEffectDetected === false,
    status: runnerSummary.ok === true && unsafeSideEffectDetected === false
      ? 'source_browser_agent_execution_completed'
      : unsafeSideEffectDetected
        ? 'source_browser_agent_execution_unsafe_side_effect_blocked'
        : 'source_browser_agent_execution_failed',
    plan,
    runner,
    runnerReport,
    runnerSummary,
    crawlItem,
    sideEffects: crawlItem.metadata?.sideEffects || sideEffects(),
    unsafeSideEffectDetected,
    plainEnglish: runnerSummary.ok === true
      ? 'Source Browser Agent planned the exact source packet, ran the selected source tool, and built a source-run ledger item with side-effect truth.'
      : 'Source Browser Agent planned the exact source packet, ran the selected source tool, and recorded the failed/blocked runner result without unsafe side effects.',
  }
}

export function buildSourceBrowserAgentExecutionTargetInput({
  execution = {},
  now = new Date().toISOString(),
} = {}) {
  const item = execution.crawlItem || {}
  return {
    targetKey: SOURCE_BROWSER_AGENT_TARGET_KEY,
    sourceId: SOURCE_BROWSER_AGENT_SOURCE_ID,
    title: 'Source Browser Agent executions',
    lane: 'source-browser-agent',
    targetType: 'source_browser_agent',
    status: 'active',
    priority: 'P0',
    runtimeMode: 'operator_or_scheduler',
    cursorState: {
      lastSourceId: item.metadata?.sourceBrowserAgentPlan?.sourceId || '',
      lastUrl: item.metadata?.url || '',
    },
    budget: {
      exactStartingUrlsOnly: true,
      broadCrawl: false,
      purchases: false,
      formSubmits: false,
      downloads: false,
      commentsOrMessages: false,
      scoperPromotion: false,
    },
    dedupePolicy: { key: 'exact_source_packet', mode: 'append_or_update_exact_source_url_runs', idempotent: true },
    lastRunAt: now,
    lastStatus: execution.status || item.metadata?.status || '',
    inspectedCount: item ? 1 : 0,
    archivedCount: item ? 1 : 0,
    extractedCount: execution.ok === true ? 1 : 0,
    metadata: {
      cardId: SOURCE_BROWSER_AGENT_CARD_ID,
      agentId: SOURCE_BROWSER_AGENT_ID,
      executionVersion: SOURCE_BROWSER_AGENT_EXECUTOR_VERSION,
      sourceBrowserAgentReadbackVersion: SOURCE_BROWSER_AGENT_READBACK_VERSION,
      runner: execution.runner || item.metadata?.runner || '',
      status: execution.status || '',
      sideEffects: execution.sideEffects || sideEffects(),
      unsafeSideEffectDetected: execution.unsafeSideEffectDetected === true,
      noScoperPromotion: true,
      noExternalWrites: true,
      noPurchasesFormsDownloadsPosts: true,
    },
    notes: 'First-class Source Browser Agent executions. Public/repo/newsletter dry-run routes can run; auth/session/pay/private/action rows fail closed until source-session readiness exists.',
  }
}

export async function persistSourceBrowserAgentExecution(execution = {}, deps = {}) {
  if (!execution?.crawlItem) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'missing_source_browser_agent_crawl_item',
      sideEffects: sideEffects(),
    }
  }
  if (typeof deps.upsertSourceCrawlTarget !== 'function') throw new Error('upsertSourceCrawlTarget dependency is required.')
  if (typeof deps.upsertSourceCrawlItem !== 'function') throw new Error('upsertSourceCrawlItem dependency is required.')
  const actor = text(deps.actor || 'source-browser-agent-executor')
  const now = text(deps.now || execution.crawlItem.processedAt || new Date().toISOString())
  const target = await deps.upsertSourceCrawlTarget(
    buildSourceBrowserAgentExecutionTargetInput({ execution, now }),
    actor,
  )
  const item = await deps.upsertSourceCrawlItem(execution.crawlItem, actor)
  return {
    ok: true,
    status: 'source_browser_agent_execution_persisted',
    target,
    item,
    sideEffects: {
      ...sideEffects(),
      internalDbWrite: true,
    },
  }
}
