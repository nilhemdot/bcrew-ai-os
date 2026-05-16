import express from 'express'
import { execFile } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  approveActionRoute,
  applyApprovedActionRoute,
  approvePendingDocUpdate,
  closeFoundationDb,
  createBacklogItem,
  createDecision,
  createOpenQuestion,
  createPendingDocUpdate,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  getCanonicalDecisionCategories,
  getLatestChangeEventForEntity,
  getLlmRuntimeSnapshot,
  getSharedCommunicationArchiveSnapshot,
  searchSharedCommunicationArtifactsForContext,
  getSharedCommunicationCandidateSnapshot,
  getSharedCommunicationCoverageSnapshot,
  getSharedCommunicationSynthesisSnapshot,
  getStrategyGoalTruthSnapshot,
  getStrategyHubSnapshot,
  getStrategyOperatingTruthSnapshot,
  getStrategyPreworkCoverageSnapshot,
  getActionRoute,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getFoundationBacklogScopes,
  getDocSourceSnapshot,
  getFoundationBacklogIdPrefixes,
  getFoundationJobRunById,
  getFoundationJobRunSnapshot,
  getFoundationCoreSnapshot,
  getFoundationRuntimeStatus,
  getFoundationSnapshot,
  getFubLeadSourceSnapshot,
  getIntelligenceRetrievalSnapshot,
  getLatestMeetingVaultAutoEnforcementRun,
  listFoundationAcknowledgedStates,
  listFoundationFeedbackItems,
  listFoundationUsers,
  listFubLeadSourceRules,
  getMeetingVaultLegacyExceptions,
  getPendingDocUpdate,
  getRecentChangeEvents,
  initFoundationDb,
  listPendingDocUpdates,
  markPendingDocUpdateApplied,
  markPendingDocUpdateFailed,
  applySharedCommunicationCandidateToBacklog,
  applySharedCommunicationCandidateToDecision,
  applySharedCommunicationCandidateToQuestion,
  rejectPendingDocUpdate,
  recordReviewQueueChange,
  recordSourceDriftChange,
  rejectActionRoute,
  rerouteActionRoute,
  saveFubLeadSourceSnapshot,
  searchIntelligenceEvidenceHybrid,
  saveStrategyHubSnapshot,
  markFoundationJobRunStopped,
  updateSharedCommunicationCandidateStatus,
  upsertFubLeadSourceRule,
  updateBacklogItem,
  updateDecision,
  updateFoundationJobControl,
  updateOpenQuestion,
  upsertSalesListingAssignment,
  getAgentOnboardingFeedbackResponseByTokenHash,
  getAgentOnboardingFeedbackResponseForMilestone,
  upsertAgentOnboardingFeedbackResponse,
} from './lib/foundation-db.js'
import {
  buildFoundationCurrentSprintStatus,
} from './lib/foundation-current-sprint.js'
import {
  attachBacklogCardsToBuilds,
  enrichFoundationBuildLogCommitEntries,
  groupFoundationBuildLog,
  getFoundationBuildCloseouts,
  summarizeFoundationBuildLog,
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
} from './lib/foundation-build-log.js'
import {
  buildFoundationChangeLog,
} from './lib/foundation-change-log.js'
import {
  buildFoundationDailyExecSummary,
} from './lib/foundation-daily-exec-summary.js'
import {
  buildSourceLifecycleStatus,
} from './lib/source-lifecycle.js'
import {
  buildSourceMaturityGridSnapshot,
} from './lib/source-maturity-grid.js'
import {
  buildSourceExtractionCoverageSnapshot,
} from './lib/source-extraction-coverage.js'
import {
  buildSourceCoverageCloseoutSnapshot,
} from './lib/source-coverage-closeout.js'
import {
  buildSourceConnectorMatrixSnapshot,
} from './lib/source-connector-matrix.js'
import {
  buildConnectorCredentialRegistrySnapshot,
} from './lib/connector-credential-registry.js'
import {
  buildSourceHubRoutingMatrixSnapshot,
} from './lib/source-hub-routing-matrix.js'
import {
  buildCreatorWatchlistSnapshot,
} from './lib/build-intel-watchlist.js'
import {
  buildMultimodalExtractorContractSnapshot,
} from './lib/multimodal-extractor-contract.js'
import {
  buildResearchInboxContractSnapshot,
} from './lib/research-inbox.js'
import {
  buildFoundationControlCompressionSnapshot,
} from './lib/foundation-control-compression.js'
import {
  buildImplementationIntelligenceSnapshot,
} from './lib/implementation-intelligence.js'
import {
  buildBuildIntelExtractionImplementationSnapshot,
} from './lib/build-intel-extraction-implementation.js'
import {
  buildGStackBuildIntelSnapshot,
} from './lib/gstack-build-intel.js'
import {
  buildFoundationOperatingReliabilitySnapshot,
} from './lib/connector-uptime-monitor.js'
import {
  loadLatestFoundationEndpointBudgetSnapshot,
} from './lib/foundation-endpoint-budgets.js'
import {
  attachFoundationHubPerformanceMetadata,
  buildFoundationHubSummaryInfo,
  normalizeFoundationHubMode,
} from './lib/foundation-hub-performance.js'
import {
  buildFoundationHubAgentFeedbackDiagnostics,
  buildFoundationHubSourceOutageBoundary,
} from './lib/foundation-hub-full-diagnostics.js'
import { buildBacklogHygieneSnapshot } from './lib/backlog-hygiene.js'
import {
  classifyDocInventoryPath,
  parseDocOtherTriageReport,
  summarizeDocInventoryCategories,
} from './lib/doc-categorization.js'
import { buildDoctrinePropagationStatus } from './lib/doctrine-propagation.js'
import { buildDecisionAutoEmitSummary, scanDecisionAutoEmitCandidates } from './lib/decision-auto-emit.js'
import { buildSyntheticGateReliabilityProof } from './lib/foundation-gate-reliability.js'
import { buildPersonalWorkspaceBoundaryStatus } from './lib/foundation-personal-workspace-boundary.js'
import { buildFoundationIdentitySurface } from './lib/foundation-identity-surface.js'
import { buildCeoDashboardPatternStatus } from './lib/foundation-ceo-dashboard-pattern.js'
import {
  buildFoundationReviewSprintStatus,
  loadFoundationReviewSprintArtifact,
} from './lib/foundation-review-sprint.js'
import {
  buildArchiveRetireStatus,
  buildDocArchiveCleanupStatus,
  buildExceptionCurationStatus,
  buildHitListReconcileStatusFromFile,
  buildResearchCurationStatus,
} from './lib/phase-d-cleanup.js'
import { isDocUpdateAllowlisted } from './lib/doc-allowlist.js'
import { buildPostShipFanoutStatus } from './lib/post-ship-fanout.js'
import {
  fubJsonFetch,
  getFubContextsSummary,
  getFubHealth,
  getFubPerson,
  listFubLeadSources,
  resolveFubContext,
} from './lib/fub.js'
import { getDriveFileMetadata, getGoogleSheetsCacheStats, getSheetValues } from './lib/google-delegated.js'
import { getGroupedSourceSystems, getSourceContracts, getSourceContractsByIds, getSourceConnectors, getSystemServiceAreas } from './lib/source-contracts.js'
import { getFoundationJobDefinitions } from './lib/foundation-jobs.js'
import {
  buildDecommissionDecision,
  buildRuntimeProcessControlSnapshot,
  buildStopDecision,
  getLaunchAgentStatus,
  terminateProcessTree,
} from './lib/runtime-process-control.js'
import {
  isDecisionGradeActionRoute,
  isSynthesisRecordVerified,
} from './lib/synthesis-claim-verification.js'
import {
  buildStrategyMeetingReadySnapshot,
} from './lib/strategy-hub-meeting-ready.js'
import {
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  buildMarketingAvatarImportSnapshot,
} from './lib/marketing-avatar-registry.js'
import {
  MARKETING_SOURCE_MAP_NOTE_PATH,
  buildMarketingSourceMapSnapshot,
} from './lib/marketing-source-map.js'
import {
  buildBrandStackSnapshot,
} from './lib/brand-stack.js'
import {
  buildTierBehavioralCompletionSnapshot,
} from './lib/tier-behavioral-completion.js'
import {
  buildVerificationRunsSnapshot,
} from './lib/verification-runs.js'
import {
  buildPerUserChangelogSnapshot,
} from './lib/per-user-changelog.js'
import {
  buildDecisionRestrictedQueueSnapshot,
  filterGeneralDecisionRecords,
} from './lib/decision-restricted-queue.js'
import {
  buildFoundationUiCompleteSnapshot,
} from './lib/foundation-ui-complete.js'
import {
  buildFoundationCurrentStateSummaryPayload,
} from './lib/foundation-current-state-summary.js'
import { getCachedSafeKpiHealthSnapshot } from './lib/kpi-health.js'
import { buildSourceOfTruthPayload } from './lib/source-of-truth-payload.js'
import {
  compactFoundationJobRunSnapshot,
  compactFoundationReviewSprintSnapshot,
  compactResearchCurationSnapshot,
} from './lib/foundation-hub-summary-payload.js'
import {
  buildFoundationHubBacklogContract,
} from './lib/foundation-hub-backlog-contract.js'
import {
  buildFoundationBacklogDetailPayload,
  validateFoundationBacklogCardId,
} from './lib/foundation-backlog-detail.js'
import { registerFoundationOperatorRoutes } from './lib/foundation-operator-routes.js'
import { registerFoundationSourceRoutes } from './lib/foundation-source-routes.js'
import { registerFoundationBuildIntelRoutes } from './lib/foundation-build-intel-routes.js'
import { registerFubSourceRoutes } from './lib/fub-source-routes.js'
import { registerFoundationRuntimeReadRoutes } from './lib/foundation-runtime-read-routes.js'
import { registerAppPageRoutes } from './lib/app-page-routes.js'
import { registerAuthRoutes } from './lib/auth-routes.js'
import { registerHubReadRoutes } from './lib/hub-read-routes.js'
import { registerStrategySharedCommsRoutes } from './lib/strategy-shared-comms-routes.js'
import { registerFoundationWriteRoutes } from './lib/foundation-write-routes.js'
import { registerAgentFeedbackRoutes } from './lib/agent-feedback-routes.js'
import { buildDocArtifactBloatSnapshot } from './lib/doc-artifact-bloat-guard.js'
import { callEmbedding } from './lib/llm-router.js'
import { buildAgentRosterReviewQueue, CLICKUP_AGENT_ROSTER_LIST_ID } from './lib/agent-roster-review.js'
import { assertAgentFeedbackSecretConfigured, verifyAgentFeedbackToken } from './lib/agent-feedback.js'
import { writeAgentFeedbackToClickUp } from './lib/agent-feedback-clickup.js'
import { buildAgentFeedbackAutoSendReadiness } from './lib/agent-feedback-auto-send.js'
import { buildAgentFeedbackProductionAutoSendDryRunReport } from './lib/agent-feedback-production-autosend-dry-run.js'
import { sendAgentFeedbackResponseNotification } from './lib/agent-feedback-response-notify.js'
import { buildAgentFeedbackReminderReadiness } from './lib/agent-feedback-reminders.js'
import { buildSalesListingInventory } from './lib/sales-listing-inventory.js'
import {
  resolveSalesListingActionPlanState,
  resolveSalesListingCaseStatus,
  resolveSalesListingLeader,
  resolveSalesListingOutcomeStatus,
  sanitizeSalesListingAssignment,
} from './lib/sales-listing-assignments.js'
import { syncSalesListingCasesFromInventory } from './lib/sales-listing-cases.js'
import { buildSalesHubCaseMetadata } from './lib/sales-hub-case-metadata.js'
import { getClickUpListSnapshotSafe } from './lib/clickup.js'
import {
  getAuthUserFromRequest,
  getDefaultRouteForUser,
  isAuthConfigured,
  assertSessionSecretConfigured,
} from './lib/app-auth.js'
import {
  AccessDeniedError,
  authorizeRouteAccess,
  buildAccessContext,
  buildRedactedCollectionResponse,
  deriveActorTier,
  filterRecordsForActor,
  findRoutePosture,
} from './lib/security-access.js'
import { callLlm } from './lib/llm-router.js'
import { runSheetsStructureVerification } from './scripts/sheets-structure-verify.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const fontkit = require('@pdf-lib/fontkit')
const app = express()
const port = process.env.PORT || 3000
const host = process.env.HOST || '127.0.0.1'
const execFileAsync = promisify(execFile)
const adminToken = process.env.ADMIN_TOKEN || process.env.DASHBOARD_API_KEY || ''
app.disable('x-powered-by')

const docsDir = path.join(__dirname, 'docs')
const dashboardStartedAt = new Date().toISOString()
const dashboardRestartCommand = 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.dashboard'
let dashboardRuntimeMetadata = {
  service: 'dashboard',
  status: 'starting',
  startedAt: dashboardStartedAt,
  processId: process.pid,
  runningCommit: null,
  runningShortCommit: null,
  capturedAt: null,
  checkName: 'served-code-equals-HEAD',
  restartCommand: dashboardRestartCommand,
  plainEnglish: 'Dashboard is starting. Foundation has not captured the server-start commit yet.',
}

function normalizeGitSha(value) {
  const sha = String(value || '').trim()
  return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : null
}

async function captureDashboardRuntimeMetadata() {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: __dirname,
      maxBuffer: 1024 * 64,
    })
    const runningCommit = normalizeGitSha(stdout)
    if (!runningCommit) throw new Error('git rev-parse HEAD did not return a commit.')
    const runningShortCommit = runningCommit.slice(0, 7)
    dashboardRuntimeMetadata = {
      service: 'dashboard',
      status: 'live',
      startedAt: dashboardStartedAt,
      processId: process.pid,
      runningCommit,
      runningShortCommit,
      capturedAt: new Date().toISOString(),
      checkName: 'served-code-equals-HEAD',
      restartCommand: dashboardRestartCommand,
      plainEnglish: `Dashboard started from commit ${runningShortCommit}. foundation:verify compares this server-start commit to repo HEAD so reviewers can catch stale dashboard code.`,
    }
  } catch (error) {
    dashboardRuntimeMetadata = {
      ...dashboardRuntimeMetadata,
      status: 'risk',
      capturedAt: new Date().toISOString(),
      plainEnglish: 'Dashboard could not capture its server-start commit. Restart the dashboard and rerun foundation:verify before trusting closeout proof.',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function getDashboardRuntimeMetadata() {
  return {
    ...dashboardRuntimeMetadata,
  }
}

function getMissingWorkerRuntimeMetadata() {
  return {
    serviceKey: 'foundation-worker',
    serviceLabel: 'Foundation Worker',
    status: 'risk',
    startedAt: null,
    processId: null,
    runningCommit: null,
    runningShortCommit: null,
    capturedAt: null,
    checkName: 'worker-startup-code-equals-HEAD',
    restartCommand: 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker',
    plainEnglish: 'Foundation has not captured the worker startup commit yet. Run: launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker to restart the worker, then rerun foundation:verify.',
    metadata: {},
  }
}
const repoRoot = path.resolve(__dirname)
const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
const stratumRegularPath = path.join(__dirname, 'public', 'fonts', 'Stratum1-Regular.otf')
const stratumBoldPath = path.join(__dirname, 'public', 'fonts', 'Stratum1-Bold.otf')
const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || process.env.USERPROFILE || '', '.codex')
const codexSkillsDir = path.join(codexHome, 'skills')
const codexPluginsDir = path.join(codexHome, 'plugins')
const privateLocalMarkdownMeta = {
  'USER.md': {
    role: 'Private human context',
    whyHidden: 'Local-only by policy. This file should not be exposed in the shared web UI by default.',
  },
  'TOOLS.md': {
    role: 'Machine-specific operating notes',
    whyHidden: 'Local-only by policy. This file is tied to this machine and should stay out of the shared web UI by default.',
  },
  'IDENTITY.md': {
    role: 'Local assistant identity state',
    whyHidden: 'Local-only by policy. This file is workspace-private state, not shared system truth.',
  },
  'HEARTBEAT.md': {
    role: 'Local heartbeat checklist',
    whyHidden: 'Local-only by policy. This file is for local assistant behavior, not shared system truth.',
  },
  'MEMORY.md': {
    role: 'Local long-term assistant memory',
    whyHidden: 'Local-only by policy. This file can hold private context and should not be exposed in the shared web UI by default.',
  },
}
const strategyDocs = [
  path.join(docsDir, 'strategy', 'bhag-model.md'),
  path.join(docsDir, 'strategy', 'agent-engine.md'),
  path.join(docsDir, 'strategy', 'quarterly-priorities.md'),
  path.join(docsDir, 'strategy', 'strategic-issues.md'),
  path.join(docsDir, 'strategy', 'governance.md'),
  path.join(docsDir, 'strategy', 'department-mandates.md'),
  path.join(docsDir, 'strategy', 'core-values.md'),
  path.join(docsDir, 'strategy', 'marketmasters.md'),
]
const canonicalDecisionCategories = getCanonicalDecisionCategories()
const backlogIdPrefixes = getFoundationBacklogIdPrefixes()
const backlogScopes = getFoundationBacklogScopes()
const backlogScopeKeys = backlogScopes.map(scope => scope.key)
const FOUNDATION_GOOGLE_USER = 'ai@bensoncrew.ca'
const FUB_LEAD_SOURCE_REFRESH_PAGE_LIMIT = 100
const FUB_LEAD_SOURCE_REFRESH_MAX_PAGES = Math.min(
  5000,
  Math.max(1, Number(process.env.FUB_LEAD_SOURCE_REFRESH_MAX_PAGES) || 1000)
)
const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const OWNERS_LEAD_SOURCE_LIST_RANGE = "'Lists'!J3:J120"
const OWNERS_ADMIN_REVIEW_RANGE = "'ADMIN ONLY - Deal Data Entry'!A1:CE2000"
const OWNERS_CONDITIONAL_REVIEW_RANGE = "'Listings and Conditional Deals'!A1:U500"
const GOVERNED_OWNERS_LEAD_SOURCE_VALUES = [
  '<unspecified>',
  'No Extra Lead Source',
  'AG - Ontario Farmer',
  'Agent Attraction',
  'Agent Flyer - Home Value Hub',
  'Agent Flyer - Home Value Hub – Geo Flyer',
  'Agent HVH – Agent Home Value Site',
  'Agent HVH – Generic Flyer',
  'Agent/Other Referral',
  'Agri - ZTeam.ca Call',
  'Agri For Sale Sign Call',
  'Apex - Brantford',
  'BCrew - YouTube',
  'BCrew Assistant Pond Lead Call',
  'BCrew Google Ads',
  'BCrew Google Search Call Brantfo',
  'BCrew Google Search Call Burling',
  'BCrew Google Search Call Guelph',
  'BCrew Info Email',
  'BCrew Investor Flyer Blasts',
  'BCrew Outdoor Media',
  'BCrew Realtor.ca',
  'BCrew Social Media Call',
  'BensonCrew.ca Call',
  'BensonCrew.ca Lead Capture',
  'BensonCrew.ca/careers Agent Application',
  'Bought Through Sign Call',
  'Branded Website',
  'Builder/Development Projects',
  'Cold Call',
  'Company Main Call',
  'Company Website – Home Value Hub',
  'Company Website – Sign Up',
  'Events & Contests',
  'Expired Listings',
  'Facebook',
  'Family',
  'For Sale Sign Call - Brantford S',
  'For Sale Sign Call - Guelph Surr',
  'FSBO',
  'Introduced',
  'Jeff Thibodeau - Crew Website Newsletter',
  'Jeff Thibodeau - Facebook',
  'Jeff Thibodeau - YouTube Viewer',
  'Luxury Presence',
  'Met - In Person',
  'Met - Social Media',
  'Non Lead Non Contact (Realtors Too)',
  'Ontario Farmer Ad Call',
  'Open House',
  'Open House – Agent',
  'Personal Referral',
  'Powerlink Residential Lead Form',
  'Realtor.ca',
  'ScottBensonTeam.ca',
  'Seller Onboarding - MattAllman.com',
  'Social Media Call',
  'Songbird Laning Lead Capture',
  'Ylopo',
  'Youtube Ad - Chris Amond',
  'zahndteam.ca',
  'Zahndteam.ca Call',
]
const DEFAULT_FUB_LEAD_SOURCE_GROUPS = {
  'Web Leads': [
    'BensonCrew.ca Lead Capture',
    'Company Website – Home Value Hub',
    'Company Website – Home Value Site',
    'Company Website – Sign Up',
    'Luxury Presence',
    'zahndteam.ca',
    'ScottBensonTeam.ca',
    'BCrew Realtor.ca',
    'Realtor.ca',
    'Songbird Laning Lead Capture',
    'Songbird Landing',
    'Brick and Oak Lead Capture',
    'Powerlink Residential Lead Form',
    'Branded Website',
    'Website',
  ],
  'Ads Leads': [
    'BCrew Google Ads',
    'Facebook',
  ],
  'Offline Leads': [
    'BCrew Investor Flyer Blasts',
    'BCrew Info Email',
    'Ontario Farmer Ad Call',
    'BCrew Outdoor Media',
    'Agent HVH – Generic Flyer',
    'Agent Flyer - Home Value Hub – Geo Flyer',
    'Agent Flyer - Home Value Hub',
  ],
  'Phone Leads': [
    'BensonCrew.ca Call',
    'Company Main Call',
    'Zahndteam.ca Call',
    'BCrew Google Search Call Guelph',
    'BCrew Google Search Call Guelph ',
    'BCrew Google Search Call Brantfo',
    'BCrew Brick & Oak Dev Call',
    'BCrew Social Media Call',
    'Social Media Call',
    'For Sale Sign Call - Guelph Surr',
    'For Sale Sign Call - Brantford S',
    'Agri For Sale Sign Call',
  ],
}
const DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP = Object.entries(DEFAULT_FUB_LEAD_SOURCE_GROUPS).reduce((acc, entry) => {
  const group = entry[0]
  const names = entry[1]
  names.forEach(name => {
    acc[name] = group
  })
  return acc
}, {})

function sendApiError(res, statusCode, code, message, details) {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  })
}

function sendAccessDenied(res, error) {
  if (error instanceof AccessDeniedError) {
    sendApiError(res, error.statusCode || 403, error.code || 'access_denied', error.message, error.details)
    return
  }

  sendApiError(res, 403, 'access_denied', error instanceof Error ? error.message : 'Access denied.')
}

function cacheHeadersNoStore(res) {
  res.setHeader('Cache-Control', 'no-store')
}

const SALES_HUB_CACHE_TTL_MS = Math.max(15, Number(process.env.SALES_HUB_CACHE_TTL_SECONDS || 120)) * 1000
let salesHubCache = {
  payload: null,
  createdAtMs: 0,
  pending: null,
}

function clearSalesHubCache() {
  salesHubCache = {
    payload: null,
    createdAtMs: 0,
    pending: null,
  }
}

async function buildSalesHubPayload() {
  const listingInventory = await buildSalesListingInventory()
  const caseSync = await syncSalesListingCasesFromInventory(listingInventory, {
    actor: 'sales-hub-refresh',
  })
  return {
    status: 'healthy',
    hub: 'sales',
    listingInventory,
    caseSync,
    meta: {
      generatedAt: new Date().toISOString(),
      sourceId: listingInventory.source.sourceId,
      sourceListId: listingInventory.source.listId,
      sourceViewId: listingInventory.source.viewId,
    },
  }
}

async function getSalesHubPayload({ forceRefresh = false } = {}) {
  const now = Date.now()
  const ageMs = salesHubCache.payload ? now - salesHubCache.createdAtMs : null
  if (!forceRefresh && salesHubCache.payload) {
    if (ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS && !salesHubCache.pending) {
      salesHubCache.pending = buildSalesHubPayload()
        .then(payload => {
          salesHubCache.payload = payload
          salesHubCache.createdAtMs = Date.now()
          return payload
        })
        .catch(error => {
          console.warn(`Sales Hub background refresh failed: ${error instanceof Error ? error.message : String(error)}`)
          return null
        })
        .finally(() => {
          salesHubCache.pending = null
        })
    }
    return {
      ...salesHubCache.payload,
      meta: {
        ...salesHubCache.payload.meta,
        cache: {
          status: ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS ? 'stale_background_refresh' : 'hit',
          ageMs,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
          backgroundRefresh: Boolean(ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS),
        },
      },
    }
  }

  if (!forceRefresh && salesHubCache.pending) {
    const payload = await salesHubCache.pending
    return {
      ...payload,
      meta: {
        ...payload.meta,
        cache: {
          status: 'shared_refresh',
          ageMs: 0,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
        },
      },
    }
  }

  salesHubCache.pending = buildSalesHubPayload()
  try {
    const payload = await salesHubCache.pending
    salesHubCache.payload = payload
    salesHubCache.createdAtMs = Date.now()
    return {
      ...payload,
      meta: {
        ...payload.meta,
        cache: {
          status: forceRefresh ? 'forced_refresh' : 'refresh',
          ageMs: 0,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
        },
      },
    }
  } finally {
    salesHubCache.pending = null
  }
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

registerAuthRoutes(app, {
  publicDir: path.join(__dirname, 'public'),
  sendApiError,
  attachRequestAccessContext,
  getRequestAuthUser,
  getLocalDevUser,
})

function tokensMatch(provided, expected) {
  if (!provided || !expected) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function isLocalRequest(req) {
  const remoteAddress = String((req.socket && req.socket.remoteAddress) || req.ip || '').trim().toLowerCase()

  if (
    remoteAddress === '::1' ||
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::ffff:127.0.0.1'
  ) {
    return true
  }

  return false
}

function isLocalHostHeader(req) {
  const hostHeader = String(req.get('host') || '').trim().toLowerCase()
  const hostName = hostHeader.startsWith('[')
    ? hostHeader.slice(1, hostHeader.indexOf(']'))
    : hostHeader.split(':')[0]

  return ['localhost', '127.0.0.1', '::1'].includes(hostName)
}

function isLocalDevRequest(req) {
  return isLocalRequest(req) && isLocalHostHeader(req)
}

function getRequestAuthUser(req) {
  if (req.authUser) return req.authUser
  const user = getAuthUserFromRequest(req)
  if (user) req.authUser = user
  return user
}

function getLocalDevUser(req) {
  if (!isLocalDevRequest(req)) return null
  return {
    email: 'local-dev@bensoncrew.ai',
    name: 'Local Dev',
    role: 'owner',
    tier: 1,
    userType: 'human',
  }
}

const FOUNDATION_USER_CACHE_TTL_MS = 30 * 1000
let foundationUserAccessCache = {
  loadedAtMs: 0,
  byEmail: new Map(),
  pending: null,
}

function normalizeAccessEmail(value) {
  return String(value || '').trim().toLowerCase()
}

async function getFoundationUsersForAccess() {
  const now = Date.now()
  if (foundationUserAccessCache.byEmail.size && now - foundationUserAccessCache.loadedAtMs < FOUNDATION_USER_CACHE_TTL_MS) {
    return foundationUserAccessCache.byEmail
  }
  if (!foundationUserAccessCache.pending) {
    foundationUserAccessCache.pending = listFoundationUsers({ activeOnly: false })
      .then(users => {
        const byEmail = new Map()
        for (const user of users || []) {
          const email = normalizeAccessEmail(user.email)
          if (email) byEmail.set(email, user)
        }
        foundationUserAccessCache = {
          loadedAtMs: Date.now(),
          byEmail,
          pending: null,
        }
        return byEmail
      })
      .catch(error => {
        foundationUserAccessCache.pending = null
        console.warn(`Foundation user access lookup failed: ${error instanceof Error ? error.message : String(error)}`)
        return new Map()
      })
  }
  return foundationUserAccessCache.pending
}

async function getFoundationUserForAccess(email) {
  const normalizedEmail = normalizeAccessEmail(email)
  if (!normalizedEmail) return null
  const byEmail = await getFoundationUsersForAccess()
  return byEmail.get(normalizedEmail) || null
}

async function attachRequestAccessContext(req) {
  req.authUser = getAuthUserFromRequest(req)
  const localDevUser = getLocalDevUser(req)
  const providedToken = req.get('X-Admin-Token') || ''
  const adminTokenValid = Boolean(adminToken && tokensMatch(providedToken, adminToken))
  const authEmail = normalizeAccessEmail(localDevUser?.email || req.authUser?.email)
  const foundationUser = localDevUser || adminTokenValid ? null : await getFoundationUserForAccess(authEmail)
  req.accessContext = buildAccessContext({
    authUser: req.authUser,
    localDevUser,
    adminTokenValid,
    foundationUser,
  })
  return req.accessContext
}

function requireAdminToken(req, res, next) {
  const providedToken = req.get('X-Admin-Token') || ''
  if (!getRequestAuthUser(req) && !isLocalDevRequest(req) && providedToken && !tokensMatch(providedToken, adminToken)) {
    sendApiError(res, 401, 'invalid_admin_token', 'Valid admin token required.')
    return
  }

  if (!getRequestAuthUser(req) && !isLocalDevRequest(req) && !providedToken) {
    const authMessage = isAuthConfigured()
      ? 'Login required.'
      : 'Protected routes are not available outside localhost until AIOS auth is configured.'
    sendApiError(res, isAuthConfigured() ? 401 : 503, isAuthConfigured() ? 'login_required' : 'auth_unconfigured', authMessage)
    return
  }

  try {
    const posture = findRoutePosture(req.method, req.path)
    authorizeRouteAccess(req, posture)
    next()
  } catch (error) {
    sendAccessDenied(res, error)
  }
}

function requirePageAccess(area) {
  return function pageAccessMiddleware(req, res, next) {
    const user = getRequestAuthUser(req) || getLocalDevUser(req)

    if (!user) {
      const nextPath = encodeURIComponent(req.originalUrl || '/')
      res.redirect('/login?next=' + nextPath)
      return
    }

    if (user.role === 'owner') {
      next()
      return
    }

    if (area === 'home') {
      next()
      return
    }

    if (area === 'ops' && user.role === 'ops') {
      next()
      return
    }

    if (area === 'sales' && (user.role === 'sales' || user.role === 'ops')) {
      next()
      return
    }

    res.redirect(getDefaultRouteForUser(user))
  }
}

function isAllowedDocPath(filePath) {
  const normalizedFilePath = path.resolve(filePath)
  const normalizedRepoRoot = repoRoot + path.sep
  if (!normalizedFilePath.startsWith(normalizedRepoRoot)) return false
  if (!normalizedFilePath.endsWith('.md')) return false

  const relativePath = path.relative(repoRoot, normalizedFilePath)
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false
  if (Object.prototype.hasOwnProperty.call(privateLocalMarkdownMeta, relativePath)) return false
  if (
    relativePath.startsWith('memory/') ||
    relativePath.startsWith('node_modules/') ||
    relativePath.startsWith('.git/') ||
    relativePath.startsWith('.openclaw/') ||
    relativePath.startsWith('store/')
  ) {
    return false
  }

  return true
}

function resolveRequestedDoc(requestedPath) {
  if (typeof requestedPath !== 'string' || !requestedPath.trim()) return null
  const resolvedPath = path.resolve(__dirname, requestedPath)
  return isAllowedDocPath(resolvedPath) ? resolvedPath : null
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getDocMeta(filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      exists: true,
      path: path.relative(__dirname, filePath),
      lines: content.split('\n').length,
      updatedAt: stat.mtime.toISOString(),
      daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
    }
  } catch {
    return {
      exists: false,
      path: path.relative(__dirname, filePath),
      lines: 0,
      updatedAt: null,
      daysOld: null,
    }
  }
}

function parseSections(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.slice(3).trim(), body: [] }
      continue
    }

    if (current) current.body.push(line)
  }

  if (current) sections.push(current)

  return sections
    .map(section => ({
      title: section.title,
      content: section.body.join('\n').trim(),
    }))
    .filter(section => section.content)
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatTorontoDate(isoString, includeTime) {
  if (!isoString) return 'Not available'
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date) + (includeTime ? ' ET' : '')
}

function stripInlineMarkdown(text) {
  return String(text || '')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function parsePdfBlocks(markdown) {
  const blocks = []
  const lines = String(markdown || '').split('\n')
  let paragraphLines = []
  let listItems = []
  let listType = null

  function flushParagraph() {
    if (!paragraphLines.length) return
    blocks.push({
      type: 'paragraph',
      text: stripInlineMarkdown(paragraphLines.join(' ').replace(/\s+/g, ' ').trim()),
    })
    paragraphLines = []
  }

  function flushList() {
    if (!listItems.length) return
    blocks.push({
      type: listType,
      items: listItems.map(item => stripInlineMarkdown(item)),
    })
    listItems = []
    listType = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ordered') flushList()
      listType = 'ordered'
      listItems.push(orderedMatch[2])
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      if (listType && listType !== 'unordered') flushList()
      listType = 'unordered'
      listItems.push(line.slice(2))
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

function wrapPdfText(text, font, size, maxWidth) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const words = clean.split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }

    lines.push(line)
    line = word
  }

  if (line) lines.push(line)
  return lines
}

function drawWrappedParagraph(page, text, options) {
  const {
    x,
    y,
    font,
    size,
    color,
    maxWidth,
    lineHeight,
  } = options

  let cursorY = y
  const lines = wrapPdfText(text, font, size, maxWidth)
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: cursorY,
      size,
      font,
      color,
    })
    cursorY -= lineHeight
  }

  return cursorY
}

function drawWrappedListItem(page, label, text, options) {
  const {
    x,
    y,
    font,
    size,
    color,
    maxWidth,
    lineHeight,
  } = options

  const labelWidth = font.widthOfTextAtSize(label, size)
  const gap = 6
  const textX = x + labelWidth + gap
  const textWidth = maxWidth - labelWidth - gap
  const lines = wrapPdfText(text, font, size, textWidth)
  let cursorY = y

  if (!lines.length) return cursorY

  page.drawText(label, {
    x,
    y: cursorY,
    size,
    font,
    color,
  })

  page.drawText(lines[0], {
    x: textX,
    y: cursorY,
    size,
    font,
    color,
  })

  cursorY -= lineHeight

  for (let index = 1; index < lines.length; index += 1) {
    page.drawText(lines[index], {
      x: textX,
      y: cursorY,
      size,
      font,
      color,
    })
    cursorY -= lineHeight
  }

  return cursorY
}

function addStrategyPdfFooter(page, footerText, fonts, palette) {
  const { width } = page.getSize()
  page.drawLine({
    start: { x: 48, y: 40 },
    end: { x: width - 48, y: 40 },
    thickness: 1,
    color: palette.border,
  })

  page.drawText(footerText, {
    x: 48,
    y: 24,
    size: 8.5,
    font: fonts.body,
    color: palette.muted,
  })
}

function addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, totalSections, fonts, palette, continuation) {
  const page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()

  page.drawRectangle({
    x: 0,
    y: height - 96,
    width,
    height: 96,
    color: palette.brandDark,
  })

  page.drawRectangle({
    x: 48,
    y: height - 126,
    width: 8,
    height: 54,
    color: palette.brand,
  })

  page.drawText('BCrew AI OS · Business Strategy', {
    x: 70,
    y: height - 48,
    size: 10,
    font: fonts.heading,
    color: palette.white,
  })

  const sectionLabel = `Section ${String(sectionIndex + 1).padStart(2, '0')} of ${String(totalSections).padStart(2, '0')}${continuation ? ' · Continued' : ''}`
  page.drawText(sectionLabel, {
    x: 70,
    y: height - 78,
    size: 9,
    font: fonts.body,
    color: palette.white,
  })

  page.drawText(section.title, {
    x: 48,
    y: height - 158,
    size: 24,
    font: fonts.heading,
    color: palette.text,
  })

  page.drawLine({
    start: { x: 48, y: height - 176 },
    end: { x: width - 48, y: height - 176 },
    thickness: 1,
    color: palette.border,
  })

  addStrategyPdfFooter(page, `Benson Crew Business Strategy · ${section.title}`, fonts, palette)

  return {
    page,
    cursorY: height - 210,
    contentBottomY: 60,
    contentWidth: width - 96,
  }
}

async function buildBusinessStrategyPdf(packet) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const headingFont = await pdfDoc.embedFont(fs.readFileSync(stratumBoldPath))
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bodyBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const fonts = {
    heading: headingFont,
    body: bodyFont,
    bodyBold: bodyBoldFont,
  }

  const palette = {
    brand: rgb(0 / 255, 132 / 255, 201 / 255),
    brandDark: rgb(0 / 255, 95 / 255, 148 / 255),
    text: rgb(10 / 255, 15 / 255, 26 / 255),
    muted: rgb(86 / 255, 97 / 255, 114 / 255),
    border: rgb(220 / 255, 226 / 255, 234 / 255),
    white: rgb(1, 1, 1),
    card: rgb(245 / 255, 248 / 255, 252 / 255),
  }

  pdfDoc.setTitle('Benson Crew Business Strategy')
  pdfDoc.setAuthor('BCrew AI OS')
  pdfDoc.setSubject('Business Strategy')
  pdfDoc.setCreator('BCrew AI OS Foundation')
  pdfDoc.setProducer('BCrew AI OS Foundation')
  pdfDoc.setCreationDate(new Date())
  pdfDoc.setModificationDate(new Date())

  const cover = pdfDoc.addPage([612, 792])
  const { width, height } = cover.getSize()
  const sections = packet.sections || []

  cover.drawRectangle({
    x: 0,
    y: height - 282,
    width,
    height: 282,
    color: palette.brandDark,
  })

  cover.drawText('BCrew AI OS · Foundation', {
    x: 48,
    y: height - 54,
    size: 11,
    font: fonts.heading,
    color: palette.white,
  })

  cover.drawText('Benson Crew', {
    x: 48,
    y: height - 130,
    size: 34,
    font: fonts.heading,
    color: palette.white,
  })

  cover.drawText('Business Strategy', {
    x: 48,
    y: height - 172,
    size: 34,
    font: fonts.heading,
    color: palette.white,
  })

  const subtitleLines = wrapPdfText(
    'Durable business direction for Benson Crew. This PDF is generated from the live Foundation strategy packet.',
    fonts.body,
    12,
    width - 96
  )
  let subtitleY = height - 214
  for (const line of subtitleLines) {
    cover.drawText(line, {
      x: 48,
      y: subtitleY,
      size: 12,
      font: fonts.body,
      color: palette.white,
    })
    subtitleY -= 18
  }

  const metaCards = [
    ['Packet', 'Business Strategy'],
    ['Sections', String(sections.length)],
    ['Updated', formatTorontoDate(packet.meta.updatedAt, true)],
    ['Exported', formatTorontoDate(new Date().toISOString(), true)],
  ]

  const cardWidth = 120
  const cardGap = 10
  metaCards.forEach((entry, index) => {
    const x = 48 + index * (cardWidth + cardGap)
    cover.drawRectangle({
      x,
      y: height - 340,
      width: cardWidth,
      height: 62,
      color: rgb(1, 1, 1),
      opacity: 0.12,
      borderColor: rgb(1, 1, 1),
      borderOpacity: 0.15,
      borderWidth: 1,
    })

    cover.drawText(entry[0], {
      x: x + 12,
      y: height - 306,
      size: 8,
      font: fonts.heading,
      color: palette.white,
    })

    cover.drawText(entry[1], {
      x: x + 12,
      y: height - 324,
      size: 10,
      font: fonts.bodyBold,
      color: palette.white,
      maxWidth: cardWidth - 24,
    })
  })

  cover.drawText('Included Sections', {
    x: 48,
    y: height - 390,
    size: 16,
    font: fonts.heading,
    color: palette.text,
  })

  let tocY = height - 428
  sections.forEach((section, index) => {
    cover.drawRectangle({
      x: 48,
      y: tocY - 8,
      width: width - 96,
      height: 34,
      color: palette.card,
      borderColor: palette.border,
      borderWidth: 1,
    })

    cover.drawText(String(index + 1).padStart(2, '0'), {
      x: 62,
      y: tocY + 3,
      size: 10,
      font: fonts.heading,
      color: palette.brand,
    })

    cover.drawText(section.title, {
      x: 98,
      y: tocY + 2,
      size: 12,
      font: fonts.bodyBold,
      color: palette.text,
    })

    tocY -= 42
  })

  addStrategyPdfFooter(cover, `Benson Crew Business Strategy · Live Foundation export · ${formatTorontoDate(new Date().toISOString(), false)}`, fonts, palette)

  const paragraphSize = 11.5
  const lineHeight = 17
  const blockGap = 12

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex]
    const blocks = parsePdfBlocks(section.content)
    let state = addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, sections.length, fonts, palette, false)

    function ensureSpace(requiredHeight) {
      if (state.cursorY - requiredHeight >= state.contentBottomY) return
      state = addStrategyPdfSectionPage(pdfDoc, section, sectionIndex, sections.length, fonts, palette, true)
    }

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        const lines = wrapPdfText(block.text, fonts.body, paragraphSize, state.contentWidth)
        const blockHeight = Math.max(lineHeight, lines.length * lineHeight)
        ensureSpace(blockHeight)
        state.cursorY = drawWrappedParagraph(state.page, block.text, {
          x: 48,
          y: state.cursorY,
          font: fonts.body,
          size: paragraphSize,
          color: palette.text,
          maxWidth: state.contentWidth,
          lineHeight,
        }) - blockGap
        continue
      }

      if (block.type === 'unordered' || block.type === 'ordered') {
        for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
          const label = block.type === 'ordered' ? `${itemIndex + 1}.` : '-'
          const lines = wrapPdfText(block.items[itemIndex], fonts.body, paragraphSize, state.contentWidth - 24)
          const itemHeight = Math.max(lineHeight, lines.length * lineHeight)
          ensureSpace(itemHeight)
          state.cursorY = drawWrappedListItem(state.page, label, block.items[itemIndex], {
            x: 48,
            y: state.cursorY,
            font: fonts.body,
            size: paragraphSize,
            color: palette.text,
            maxWidth: state.contentWidth,
            lineHeight,
          }) - 6
        }

        state.cursorY -= 6
      }
    }
  }

  return pdfDoc.save()
}

function getHeadingSection(markdown, targetSection) {
  const targetSlug = slugify(targetSection)
  if (!targetSlug) return null

  const lines = markdown.split('\n')
  let start = -1
  let end = lines.length
  let heading = ''

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,3})\s+(.+?)\s*$/)
    if (!match) continue

    const currentSlug = slugify(match[2])
    if (start === -1 && currentSlug === targetSlug) {
      start = index
      heading = match[2].trim()
      continue
    }

    if (start !== -1) {
      end = index
      break
    }
  }

  if (start === -1) return null

  const currentText = lines.slice(start + 1, end).join('\n').trim()
  return {
    start,
    end,
    heading,
    currentText,
  }
}

function replaceHeadingSection(markdown, targetSection, proposedText) {
  const section = getHeadingSection(markdown, targetSection)
  if (!section) return null

  const lines = markdown.split('\n')
  const before = lines.slice(0, section.start + 1)
  const after = lines.slice(section.end)
  const nextBody = String(proposedText || '').trim()
  const bodyLines = nextBody ? ['', ...nextBody.split('\n')] : ['']

  return {
    section,
    content: before.concat(bodyLines, after).join('\n').replace(/\n{3,}/g, '\n\n'),
  }
}

function buildSimpleDiff(currentText, proposedText) {
  return [
    '--- current',
    '+++ proposed',
    '',
    'Current:',
    currentText || '(empty)',
    '',
    'Proposed:',
    proposedText || '(empty)',
  ].join('\n')
}

function hashText(value) {
  return createHash('sha256').update(String(value || '')).digest('hex')
}

async function runGit(args) {
  return execFileAsync('git', args, { cwd: __dirname })
}

async function getGitStatusForFile(relativePath) {
  const { stdout } = await runGit(['status', '--porcelain', '--', relativePath])
  return stdout.trim()
}

async function getGitStatus() {
  const { stdout } = await runGit(['status', '--porcelain'])
  return stdout.trim()
}

async function restoreTrackedFile(relativePath) {
  try {
    await runGit(['restore', '--staged', '--worktree', '--', relativePath])
  } catch {
    // Leave recovery to the caller if restore fails.
  }
}

function toRelativeDocPath(filePath) {
  return path.relative(__dirname, filePath)
}

function getRequestActor(req) {
  const user = req ? getRequestAuthUser(req) || getLocalDevUser(req) : null
  if (user?.email) return user.email
  if (req && tokensMatch(req.get('X-Admin-Token') || '', adminToken)) return 'admin-token'
  return 'system'
}

function getDefaultFubLeadSourceGroup(sourceName) {
  const source = String(sourceName || '').trim()
  if (!source) return null
  if (DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP[source]) return DEFAULT_FUB_LEAD_SOURCE_GROUP_MAP[source]

  const lower = source.toLowerCase()
  if (lower.includes('meta lead ad') || lower.includes('google ads') || lower === 'facebook') return 'Ads Leads'
  if (lower.includes(' call')) return 'Phone Leads'
  if (lower.includes('website') || lower.includes('lead capture') || lower.includes('lead form') || lower.includes('realtor.ca')) return 'Web Leads'
  if (lower.includes('flyer') || lower.includes('outdoor media') || lower.includes('info email')) return 'Offline Leads'
  return null
}

function getDefaultFubMarketingType(sourceName) {
  return getDefaultFubLeadSourceGroup(sourceName) ? 'marketing' : 'unclassified'
}

function getDefaultFubFlagState(sourceName) {
  const lower = String(sourceName || '').trim().toLowerCase()
  if (!lower) return 'none'
  if (lower === '<unspecified>' || lower === 'import') return 'not_canonical'
  if (lower === 'sphere' || lower === 'soi') return 'not_canonical'
  return 'none'
}

function sampleSourceNames(items, limit = 5) {
  return (items || []).slice(0, limit).map(function(item) {
    return item.source
  })
}

function getHoursSince(timestamp) {
  if (!timestamp) return null
  const time = new Date(timestamp).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60))
}

const GOVERNED_WARNING_HOURS = 72
const GOVERNED_STALE_HOURS = 168

function buildGovernedFreshness(event, active, options = {}) {
  const warningHours = options.warningHours || GOVERNED_WARNING_HOURS
  const staleHours = options.staleHours || GOVERNED_STALE_HOURS
  const forcedStatus = options.forcedStatus || ''
  const forcedReason = options.forcedReason || ''
  const ageHours = getHoursSince(event && event.createdAt ? event.createdAt : null)

  let status = active ? 'fresh' : 'clear'
  if (active && ageHours != null && ageHours >= staleHours) status = 'stale'
  else if (active && ageHours != null && ageHours >= warningHours) status = 'warning'

  if (forcedStatus === 'stale') status = 'stale'
  else if (forcedStatus === 'warning' && status !== 'stale') status = 'warning'

  return {
    status,
    label: status === 'clear' ? 'Clear' : status === 'fresh' ? 'Fresh' : status === 'warning' ? 'Warning' : 'Stale',
    lastChangedAt: event && event.createdAt ? event.createdAt : null,
    ageHours,
    warningHours,
    staleHours,
    founderAlert: status === 'stale',
    reason: forcedReason || '',
  }
}

function hashReviewQueueFingerprint(items, stats, extra) {
  return hashText(JSON.stringify({
    stats: stats || {},
    items: (items || []).map(function(item) {
      return [
        item.id,
        item.rowNumber,
        item.reviewStatus,
        item.reviewAction,
        item.findingsPreview,
      ]
    }),
    extra: extra || {},
  }))
}

function buildReviewQueueChangeSummary(label, queue) {
  const openItems = queue && queue.openItems ? queue.openItems : 0
  if (!openItems) return `${label} review queue is clear`
  return `${label} review queue has ${openItems} open item${openItems === 1 ? '' : 's'}`
}

function buildReviewQueueChangeMetadata(label, queue, fingerprint) {
  return {
    fingerprint,
    label,
    stats: {
      totalTrackedRows: queue && queue.totalTrackedRows ? queue.totalTrackedRows : 0,
      openItems: queue && queue.openItems ? queue.openItems : 0,
      queuedReview: queue && queue.queuedReview ? queue.queuedReview : 0,
      needsFixing: queue && queue.needsFixing ? queue.needsFixing : 0,
    },
    samples: (queue && Array.isArray(queue.items) ? queue.items : []).slice(0, 8).map(function(item) {
      return {
        id: item.id,
        title: item.title,
        status: item.reviewStatus,
        action: item.reviewAction,
      }
    }),
  }
}

async function syncReviewQueueEvent(input, actor = 'system') {
  const queue = input && input.queue ? input.queue : null
  if (!queue) return null

  const openItems = queue.openItems || 0
  const fingerprint = hashReviewQueueFingerprint(queue.items || [], {
    totalTrackedRows: queue.totalTrackedRows || 0,
    openItems,
    queuedReview: queue.queuedReview || 0,
    needsFixing: queue.needsFixing || 0,
  }, input.extra || {})

  const eventType = openItems ? 'review_queue_changed' : 'review_queue_cleared'
  return recordReviewQueueChange({
    eventType,
    entityTable: input.entityTable,
    entityId: input.entityId,
    summary: buildReviewQueueChangeSummary(input.label, queue),
    metadata: buildReviewQueueChangeMetadata(input.label, queue, fingerprint),
  }, actor)
}

function buildSourceWatchFreshness(event, active, options = {}) {
  if (options.missing) {
    return {
      status: 'missing',
      label: 'Needs Refresh',
      lastChangedAt: event && event.createdAt ? event.createdAt : null,
      ageHours: getHoursSince(event && event.createdAt ? event.createdAt : null),
      warningHours: options.warningHours || GOVERNED_WARNING_HOURS,
      staleHours: options.staleHours || GOVERNED_STALE_HOURS,
      founderAlert: true,
      reason: options.reason || 'No readable source state is available yet.',
    }
  }

  return buildGovernedFreshness(event, active, options)
}

function buildFubLeadSourceDrift(snapshot, rules) {
  const snapshotSources = snapshot && Array.isArray(snapshot.sources) ? snapshot.sources : []
  const snapshotMap = new Map()
  snapshotSources.forEach(function(item) {
    const source = String(item && item.source || '').trim()
    if (!source) return
    snapshotMap.set(source, {
      source,
      count: Math.max(0, Number(item.count) || 0),
    })
  })

  const ruleMap = new Map()
  ;(rules || []).forEach(function(rule) {
    if (!rule || !rule.source) return
    ruleMap.set(rule.source, rule)
  })

  const needsRules = Array.from(snapshotMap.values())
    .filter(function(item) {
      return !ruleMap.has(item.source)
    })
    .map(function(item) {
      return {
        source: item.source,
        count: item.count,
        defaultFlagState: getDefaultFubFlagState(item.source),
      }
    })
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const openClassification = Array.from(snapshotMap.values())
    .map(function(item) {
      const rule = ruleMap.get(item.source)
      if (!rule) return null
      const openMarketing = rule.marketingType === 'unclassified'
      const openOwnership = rule.ownershipType === 'unclassified'
      if (!openMarketing && !openOwnership) return null
      return {
        source: item.source,
        count: item.count,
        openMarketing,
        openOwnership,
      }
    })
    .filter(Boolean)
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const legacyPresent = Array.from(snapshotMap.values())
    .map(function(item) {
      const rule = ruleMap.get(item.source)
      const flagState = rule ? rule.flagState : getDefaultFubFlagState(item.source)
      if (!flagState || flagState === 'none') return null
      return {
        source: item.source,
        count: item.count,
        flagState,
      }
    })
    .filter(Boolean)
    .sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.source.localeCompare(b.source)
    })

  const governedMissing = (rules || [])
    .filter(function(rule) {
      if (!rule || !rule.source) return false
      if (rule.flagState && rule.flagState !== 'none') return false
      if (rule.marketingType === 'unclassified' || rule.ownershipType === 'unclassified') return false
      return !snapshotMap.has(rule.source)
    })
    .map(function(rule) {
      return {
        source: rule.source,
        sourceGroup: rule.sourceGroup || null,
      }
    })
    .sort(function(a, b) {
      return a.source.localeCompare(b.source)
    })

  const staleThresholdHours = 24
  const ageHours = getHoursSince(snapshot ? snapshot.refreshedAt : null)
  const stale = {
    available: Boolean(snapshot && snapshot.refreshedAt),
    thresholdHours: staleThresholdHours,
    ageHours,
    isStale: ageHours != null && ageHours >= staleThresholdHours,
  }

  const stats = {
    needsRules: needsRules.length,
    openClassification: openClassification.length,
    legacyPresent: legacyPresent.length,
    governedMissing: governedMissing.length,
    stale: stale.isStale ? 1 : 0,
    reviewNow: needsRules.length + openClassification.length + legacyPresent.length + (stale.isStale ? 1 : 0),
  }

  const status = !snapshot
    ? 'no_snapshot'
    : stats.reviewNow
      ? 'review'
      : 'clean'

  const fingerprint = hashText(JSON.stringify({
    contextKey: snapshot ? snapshot.contextKey : 'none',
    status,
    staleBucket: stale.ageHours == null ? null : Math.floor(stale.ageHours / staleThresholdHours),
    needsRules: needsRules.map(function(item) {
      return [item.source, item.count, item.defaultFlagState]
    }),
    openClassification: openClassification.map(function(item) {
      return [item.source, item.count, item.openMarketing, item.openOwnership]
    }),
    legacyPresent: legacyPresent.map(function(item) {
      return [item.source, item.count, item.flagState]
    }),
    governedMissing: governedMissing.map(function(item) {
      return item.source
    }),
  }))

  return {
    status,
    fingerprint,
    stats,
    stale,
    buckets: {
      needsRules,
      openClassification,
      legacyPresent,
      governedMissing,
    },
  }
}

function buildFubLeadSourceDriftSummary(context, drift) {
  const label = context && context.label ? context.label : 'FUB'
  if (!drift || drift.status === 'no_snapshot') {
    return `FUB source drift waiting on the first snapshot for ${label}`
  }
  if (drift.status === 'clean') {
    return `FUB source drift cleared for ${label}`
  }

  const parts = []
  if (drift.stats.needsRules) parts.push(`${drift.stats.needsRules} new name${drift.stats.needsRules === 1 ? '' : 's'}`)
  if (drift.stats.openClassification) parts.push(`${drift.stats.openClassification} open classification${drift.stats.openClassification === 1 ? '' : 's'}`)
  if (drift.stats.legacyPresent) parts.push(`${drift.stats.legacyPresent} legacy / invalid source${drift.stats.legacyPresent === 1 ? '' : 's'}`)
  if (drift.stats.governedMissing) parts.push(`${drift.stats.governedMissing} governed source${drift.stats.governedMissing === 1 ? '' : 's'} not seen now`)
  if (drift.stale && drift.stale.isStale) parts.push('snapshot stale')

  return `FUB source drift on ${label}: ${parts.join(', ')}`
}

function buildFubLeadSourceDriftMetadata(context, drift) {
  return {
    fingerprint: drift.fingerprint,
    context,
    status: drift.status,
    stats: drift.stats,
    stale: drift.stale,
    samples: {
      needsRules: sampleSourceNames(drift.buckets.needsRules),
      openClassification: sampleSourceNames(drift.buckets.openClassification),
      legacyPresent: sampleSourceNames(drift.buckets.legacyPresent),
      governedMissing: sampleSourceNames(drift.buckets.governedMissing),
    },
  }
}

async function syncFubLeadSourceDriftEvent(payload, actor) {
  if (!payload || !payload.snapshot || !payload.snapshot.available || !payload.drift) return null

  const drift = payload.drift
  const statusNeedsReview = drift.status === 'review' || drift.status === 'watch'
  const eventType = statusNeedsReview ? 'source_drift_detected' : 'source_drift_cleared'

  return recordSourceDriftChange({
    eventType,
    entityTable: 'fub_lead_source_snapshots',
    entityId: payload.context && payload.context.key ? payload.context.key : 'unknown',
    summary: buildFubLeadSourceDriftSummary(payload.context, drift),
    metadata: buildFubLeadSourceDriftMetadata(payload.context, drift),
  }, actor)
}

function buildFubLeadSourcePayload(snapshot, rules, fallbackContext) {
  const ruleMap = new Map()
  rules.forEach(function(rule) {
    ruleMap.set(rule.source, rule)
  })

  const merged = new Map()
  const snapshotSources = snapshot && Array.isArray(snapshot.sources) ? snapshot.sources : []
  snapshotSources.forEach(function(item) {
    const source = String(item && item.source || '').trim()
    if (!source) return
    const rule = ruleMap.get(source)
    merged.set(source, {
      source,
      count: Math.max(0, Number(item.count) || 0),
      marketingType: rule ? rule.marketingType : getDefaultFubMarketingType(source),
      ownershipType: rule ? rule.ownershipType : 'unclassified',
      flagState: rule ? rule.flagState : getDefaultFubFlagState(source),
      sourceGroup: rule ? (rule.sourceGroup || '') : getDefaultFubLeadSourceGroup(source),
      notes: rule ? rule.notes : null,
      updatedAt: rule ? rule.updatedAt : null,
      updatedBy: rule ? rule.updatedBy : null,
    })
  })

  const sources = Array.from(merged.values()).sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count
    return a.source.localeCompare(b.source)
  })

  const context = snapshot
    ? { key: snapshot.contextKey, label: snapshot.contextLabel }
    : fallbackContext

  const drift = buildFubLeadSourceDrift(snapshot, rules)

  return {
    context,
    snapshot: {
      available: Boolean(snapshot),
      refreshedAt: snapshot ? snapshot.refreshedAt : null,
      refreshedBy: snapshot ? snapshot.refreshedBy : null,
    },
    scan: snapshot
      ? snapshot.scan
      : {
          uniqueSources: 0,
          peopleScanned: 0,
          pagesScanned: 0,
          truncated: false,
        },
    stats: {
      totalSources: sources.length,
      marketing: sources.filter(item => item.marketingType === 'marketing').length,
      nonMarketing: sources.filter(item => item.marketingType === 'non_marketing').length,
      unclassified: sources.filter(item => item.marketingType === 'unclassified').length,
      unclassifiedMarketing: sources.filter(item => item.marketingType === 'unclassified').length,
      unclassifiedOwnership: sources.filter(item => item.ownershipType === 'unclassified').length,
      openClassification: sources.filter(item => item.marketingType === 'unclassified' || item.ownershipType === 'unclassified').length,
      company: sources.filter(item => item.ownershipType === 'company').length,
      agent: sources.filter(item => item.ownershipType === 'agent').length,
      referral: sources.filter(item => item.ownershipType === 'referral').length,
      other: sources.filter(item => item.ownershipType === 'other').length,
      invalidCanonical: sources.filter(item => item.flagState === 'not_canonical').length,
      flagged: sources.filter(item => item.flagState && item.flagState !== 'none').length,
    },
    drift,
    sources,
  }
}

function normalizeSheetValue(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeSheetDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const ms = Math.round((numeric - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return normalizeSheetValue(value)
  return date.toISOString().slice(0, 10)
}

function normalizeLowerSheetValue(value) {
  return normalizeSheetValue(value).toLowerCase()
}

function findSheetHeaderIndex(header, name) {
  return header.findIndex(value => normalizeSheetValue(value) === name)
}

function getGovernedOwnersLeadSourceValues() {
  return GOVERNED_OWNERS_LEAD_SOURCE_VALUES.slice()
}

function isAdminReviewTrigger(value) {
  const normalized = normalizeLowerSheetValue(value)
  return normalized === 'review this deal' || normalized === 'review' || normalized === 'rerun'
}

function isConditionalReviewTrigger(value) {
  const normalized = normalizeLowerSheetValue(value)
  return (
    normalized === 'review this conditional' ||
    normalized === 'review this deal' ||
    normalized === 'review' ||
    normalized === 'rerun'
  )
}

function hasOpenReviewStatus(value) {
  const normalized = normalizeLowerSheetValue(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized === 'issues found' || normalized === 'needs re review' || normalized === 'need re review' || normalized === 'not reviewed'
}

function hasOpenReviewAction(value) {
  const normalized = normalizeLowerSheetValue(value)
  return Boolean(normalized) && normalized !== 'no action'
}

const FINDING_SUMMARY_LINE_LIMIT = 24

function summarizeFindings(value, limit = FINDING_SUMMARY_LINE_LIMIT) {
  const text = normalizeSheetValue(value)
  if (!text) return ''
  return text
    .split('\n')
    .map(lineValue => normalizeSheetValue(lineValue))
    .filter(Boolean)
    .slice(0, limit)
    .join(' | ')
}

function classifyAdminIssueLanes(value) {
  const text = normalizeSheetValue(value)
  const lanes = new Set()
  let currentSection = ''

  function addLaneForIssueLine(line, section) {
    const lower = normalizeLowerSheetValue(line)
    if (!lower) return
    if (section === 'result') return

    if (
      section === 'owners' ||
      lower.includes('gross to team') ||
      lower.includes('split deal') ||
      lower.includes('required b:t') ||
      lower.includes('core ag+') ||
      lower.includes('company or agent') ||
      lower.includes('lead source') ||
      lower.includes('source row')
    ) {
      lanes.add('dealData')
    }

    if (
      section === 'fub' ||
      lower.includes('follow up boss') ||
      lower.includes('linked fub') ||
      lower.includes('crm') ||
      lower.includes('past client') ||
      lower.includes('firm deal') ||
      lower.includes('fub stage') ||
      lower.includes('fub source')
    ) {
      lanes.add('crmFub')
    }

    if (
      lower.includes('clickup task') ||
      lower.includes('deal # / trade number') ||
      lower.includes('multiple clickup') ||
      lower.includes('aios admin deal row link') ||
      lower.includes('review evidence link') ||
      lower.includes('fub call / review evidence') ||
      lower.includes('no clickup deal data entry task')
    ) {
      lanes.add('dealWorkflow')
    }

    if (lower.includes('internal onboarding') || lower.includes('internal deal')) {
      lanes.add('internalReview')
    }

    if (lower.includes('nps')) {
      lanes.add('clientNps')
    }

    if (lower.includes('google review')) {
      lanes.add('googleReview')
    }
  }

  text
    .split('\n')
    .map(lineValue => normalizeSheetValue(lineValue))
    .filter(Boolean)
    .forEach(line => {
      const lower = normalizeLowerSheetValue(line)
      const score = line.match(/^(.+?)\s+\((\d+)\/(\d+)\s+passed\)$/i)
      if (score) {
        const label = normalizeLowerSheetValue(score[1])
        currentSection = label.includes('owners')
          ? 'owners'
          : label.includes('fub')
            ? 'fub'
            : label.includes('clickup') || label.includes('freedom')
              ? 'workflow'
              : ''
        const passed = Number(score[2])
        const total = Number(score[3])
        if (Number.isFinite(passed) && Number.isFinite(total) && passed < total) {
          if (currentSection === 'owners') lanes.add('dealData')
          if (currentSection === 'fub') lanes.add('crmFub')
        }
        return
      }

      if (lower === 'result') {
        currentSection = 'result'
        return
      }

      addLaneForIssueLine(line, currentSection)
    })

  if (!lanes.size) lanes.add('dealData')
  return Array.from(lanes)
}

function mergeIssueLanes(base, next) {
  return Array.from(new Set([].concat(base || []).concat(next || []).filter(Boolean)))
}

function buildAdminReviewQueue(rows) {
  const header = rows[0] || []
  const cols = {
    deal: findSheetHeaderIndex(header, 'Deal #'),
    client: findSheetHeaderIndex(header, 'Client Name'),
    realtor: findSheetHeaderIndex(header, 'Realtor'),
    executed: findSheetHeaderIndex(header, 'Date Firm (Executed)'),
    reviewStatus: findSheetHeaderIndex(header, 'AI Review Status'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Findings By System / Suggestions'),
  }

  const rowItems = rows
    .slice(1)
    .map((row, index) => {
      const deal = normalizeSheetValue(row[cols.deal])
      if (!deal) return null

      const reviewStatus = normalizeSheetValue(row[cols.reviewStatus])
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const open = hasOpenReviewStatus(reviewStatus) || hasOpenReviewAction(reviewAction)
      if (!open) return null
      const findings = row[cols.findings]

      return {
        queue: 'admin',
        rowNumber: index + 2,
        id: deal,
        title: deal,
        subtitle: normalizeSheetValue(row[cols.client]) || 'Client missing',
        owner: normalizeSheetValue(row[cols.realtor]) || 'Agent missing',
        executedDate: normalizeSheetDate(row[cols.executed]),
        reviewStatus: reviewStatus || 'Not Reviewed',
        reviewAction: reviewAction || 'No Action',
        queuedForReview: isAdminReviewTrigger(reviewAction),
        needsFixing: normalizeLowerSheetValue(reviewAction) === 'needs fixing' || normalizeLowerSheetValue(reviewStatus) === 'issues found',
        findingsPreview: summarizeFindings(findings),
        issueLanes: classifyAdminIssueLanes(findings),
      }
    })
    .filter(Boolean)
  const itemsByDeal = new Map()

  rowItems.forEach(item => {
    if (!itemsByDeal.has(item.id)) {
      itemsByDeal.set(item.id, {
        ...item,
        rowNumbers: [item.rowNumber],
        owners: item.owner && item.owner !== 'Agent missing' ? [item.owner] : [],
      })
      return
    }

    const existing = itemsByDeal.get(item.id)
    existing.rowNumbers.push(item.rowNumber)
    if (item.owner && item.owner !== 'Agent missing' && !existing.owners.includes(item.owner)) {
      existing.owners.push(item.owner)
    }
    existing.queuedForReview = existing.queuedForReview || item.queuedForReview
    existing.needsFixing = existing.needsFixing || item.needsFixing
    existing.issueLanes = mergeIssueLanes(existing.issueLanes, item.issueLanes)
    if (!existing.findingsPreview && item.findingsPreview) existing.findingsPreview = item.findingsPreview
    if (!existing.subtitle || existing.subtitle === 'Client missing') existing.subtitle = item.subtitle
    if (!existing.executedDate && item.executedDate) existing.executedDate = item.executedDate
  })

  const items = Array.from(itemsByDeal.values()).map(item => {
    const owners = Array.isArray(item.owners) ? item.owners : []
    return {
      ...item,
      owner: owners.length ? owners.join(', ') : item.owner,
      splitRowCount: item.rowNumbers.length,
    }
  })

  return {
    totalTrackedRows: rows.slice(1).filter(row => normalizeSheetValue(row[cols.deal])).length,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildConditionalReviewQueue(rows) {
  if (normalizeSheetValue(rows[0] && rows[0][0]) === 'Conditional Pipeline Forecast - ClickUp Generated') {
    return buildClickUpConditionalForecastQueue(rows)
  }

  const header = rows[1] || []
  const cols = {
    type: findSheetHeaderIndex(header, 'Type'),
    agent: findSheetHeaderIndex(header, 'Agent'),
    address: findSheetHeaderIndex(header, 'Address'),
    status: findSheetHeaderIndex(header, 'Status'),
    clientName: findSheetHeaderIndex(header, 'Client Name'),
    fubLink: findSheetHeaderIndex(header, 'FUB Person URL / ID'),
    reviewStatus: findSheetHeaderIndex(header, 'AI Conditional Review Status'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Conditional Findings / Suggestions'),
  }

  const items = rows
    .slice(2)
    .map((row, index) => {
      const type = normalizeSheetValue(row[cols.type])
      const agent = normalizeSheetValue(row[cols.agent])
      if (!type || !agent) return null

      const reviewStatus = normalizeSheetValue(row[cols.reviewStatus])
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const open = hasOpenReviewStatus(reviewStatus) || hasOpenReviewAction(reviewAction)
      if (!open) return null

      return {
        queue: 'conditional',
        rowNumber: index + 3,
        id: `conditional-row-${index + 3}`,
        title: normalizeSheetValue(row[cols.address]) || normalizeSheetValue(row[cols.clientName]) || `Conditional row ${index + 3}`,
        subtitle: normalizeSheetValue(row[cols.clientName]) || 'Client missing',
        owner: agent,
        conditionalStatus: normalizeSheetValue(row[cols.status]) || 'Status missing',
        reviewStatus: reviewStatus || 'Not Reviewed',
        reviewAction: reviewAction || 'No Action',
        hasFubLink: Boolean(normalizeSheetValue(row[cols.fubLink])),
        queuedForReview: isConditionalReviewTrigger(reviewAction),
        needsFixing: normalizeLowerSheetValue(reviewAction) === 'needs fixing' || normalizeLowerSheetValue(reviewStatus) === 'issues found',
        findingsPreview: summarizeFindings(row[cols.findings]),
        issueLanes: ['conditional'],
      }
    })
    .filter(Boolean)

  return {
    totalTrackedRows: rows.slice(2).filter(row => normalizeSheetValue(row[cols.type]) && normalizeSheetValue(row[cols.agent])).length,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildClickUpConditionalForecastQueue(rows) {
  const headerIndex = rows.findIndex(row => normalizeSheetValue(row && row[0]) === 'Conditional Deal')
  const header = headerIndex >= 0 ? rows[headerIndex] || [] : []
  const cols = {
    deal: findSheetHeaderIndex(header, 'Conditional Deal'),
    side: findSheetHeaderIndex(header, 'Side'),
    agent: findSheetHeaderIndex(header, 'Agent'),
    acceptedOfferDate: findSheetHeaderIndex(header, 'Accepted Offer Date'),
    conditionalDeadline: findSheetHeaderIndex(header, 'Conditional Deadline'),
    closingDate: findSheetHeaderIndex(header, 'Closing Date'),
    expectedTeam: findSheetHeaderIndex(header, 'Expected Team $'),
    depositStatus: findSheetHeaderIndex(header, 'Deposit Status'),
    depositReceivedDate: findSheetHeaderIndex(header, 'Deposit Received Date'),
    tradeNumber: findSheetHeaderIndex(header, 'Trade Number'),
    fubLink: findSheetHeaderIndex(header, 'FUB Link'),
    clickUpUrl: findSheetHeaderIndex(header, 'ClickUp URL'),
    missingData: findSheetHeaderIndex(header, 'Missing / Action Needed'),
    reviewAction: findSheetHeaderIndex(header, 'THIS ROW ONLY: CONDITIONAL REVIEW ACTION'),
    findings: findSheetHeaderIndex(header, 'AI Conditional Findings / Suggestions'),
  }

  const dataStart = headerIndex >= 0 ? headerIndex + 1 : rows.length
  const allItems = rows
    .slice(dataStart)
    .map((row, index) => {
      const title = normalizeSheetValue(row[cols.deal])
      const agent = normalizeSheetValue(row[cols.agent])
      if (!title || !agent) return null

      const missingData = summarizeFindings(row[cols.missingData])
      const conditionalDeadline = normalizeSheetDate(row[cols.conditionalDeadline])
      const closingDate = normalizeSheetDate(row[cols.closingDate])
      const expectedTeam = normalizeSheetValue(row[cols.expectedTeam])
      const tradeNumber = normalizeSheetValue(row[cols.tradeNumber])
      const fubLink = normalizeSheetValue(row[cols.fubLink])
      const missingPieces = []
      if (!closingDate) missingPieces.push('closing date')
      if (!expectedTeam) missingPieces.push('expected team $')
      if (!tradeNumber) missingPieces.push('trade number')
      if (!fubLink) missingPieces.push('FUB link')
      const reviewAction = normalizeSheetValue(row[cols.reviewAction])
      const queuedForReview = isConditionalReviewTrigger(reviewAction)
      const findingsFromSheet = summarizeFindings(row[cols.findings])
      const findings = findingsFromSheet || missingData || (missingPieces.length ? 'Missing: ' + missingPieces.join(', ') : 'Conditional forecast row is complete.')
      const needsFixing = missingPieces.length > 0 || queuedForReview

      return {
        queue: 'conditional',
        rowNumber: dataStart + index + 1,
        id: `conditional-forecast-${dataStart + index + 1}`,
        title,
        subtitle: normalizeSheetValue(row[cols.side]) || 'Conditional',
        owner: agent,
        conditionalDeadline,
        closingDate,
        depositStatus: normalizeSheetValue(row[cols.depositStatus]),
        depositReceivedDate: normalizeSheetDate(row[cols.depositReceivedDate]),
        tradeNumber,
        hasFubLink: Boolean(fubLink),
        clickUpUrl: normalizeSheetValue(row[cols.clickUpUrl]),
        reviewStatus: missingPieces.length ? (queuedForReview ? 'Re-review Still Failing' : 'Missing Data') : (queuedForReview ? 'Ready For Re-review' : 'Ready'),
        reviewAction: queuedForReview ? reviewAction : (missingPieces.length ? 'Needs Fixing' : 'No Action'),
        queuedForReview,
        needsFixing,
        findingsPreview: findings,
        issueLanes: ['conditional'],
      }
    })
    .filter(Boolean)

  const items = allItems.filter(item => item.needsFixing || item.queuedForReview)

  return {
    totalTrackedRows: allItems.length,
    openItems: items.length,
    queuedReview: 0,
    needsFixing: items.length,
    items,
  }
}

function buildFubLeadSourceReviewQueue(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  const stats = payload && payload.stats ? payload.stats : {}
  const items = []

  if (drift && drift.buckets) {
    ;(drift.buckets.needsRules || []).forEach(function(item) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-needs-rule:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Needs Rule',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'New raw FUB source with no governed rule yet.',
        issueLanes: ['fubRules'],
      })
    })

    ;(drift.buckets.openClassification || []).forEach(function(item) {
      const openParts = []
      if (item.openMarketing) openParts.push('marketing open')
      if (item.openOwnership) openParts.push('ownership open')
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-open-classification:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Open Classification',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Governed rule still leaves ' + openParts.join(' + ') + '.',
        issueLanes: ['fubRules'],
      })
    })

    ;(drift.buckets.legacyPresent || []).forEach(function(item) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-legacy:' + item.source,
        title: item.source,
        subtitle: (item.count || 0) + ' contact' + ((item.count || 0) === 1 ? '' : 's'),
        owner: 'FUB taxonomy',
        reviewStatus: 'Legacy Still Live',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Legacy / invalid source is still present in live FUB data.',
        issueLanes: ['fubRules'],
      })
    })

    if (drift.stale && drift.stale.isStale) {
      items.push({
        queue: 'fub-drift',
        rowNumber: null,
        id: 'fub-stale:owner',
        title: 'FUB source snapshot is stale',
        subtitle: Math.floor(drift.stale.ageHours || 0) + ' hour' + (Math.floor(drift.stale.ageHours || 0) === 1 ? '' : 's') + ' old',
        owner: 'FUB taxonomy',
        reviewStatus: 'Stale',
        reviewAction: 'Needs Refresh',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'Refresh the owner-context FUB source snapshot before trusting the queue.',
        issueLanes: ['fubRules'],
      })
    }
  }

  return {
    totalTrackedRows: stats.totalSources || 0,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildOwnersGovernanceReviewQueue(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  const items = []

  if (drift && drift.buckets) {
    ;(drift.buckets.unexpectedInOwnersList || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-unexpected:' + item.value,
        title: item.value,
        subtitle: 'Unexpected dropdown value',
        owner: 'Owners governed list',
        reviewStatus: 'Unexpected',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This value is live in the Owners dropdown but not in the governed approved list.',
        issueLanes: ['ownersLists'],
      })
    })

    ;(drift.buckets.missingFromOwnersList || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-missing:' + item.value,
        title: item.value,
        subtitle: 'Missing approved dropdown value',
        owner: 'Owners governed list',
        reviewStatus: 'Missing',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This approved source is missing from the governed Owners dropdown.',
        issueLanes: ['ownersLists'],
      })
    })

    ;(drift.buckets.duplicates || []).forEach(function(item) {
      items.push({
        queue: 'owners-governance',
        rowNumber: null,
        id: 'owners-duplicate:' + item.value,
        title: item.value,
        subtitle: (item.count || 0) + ' duplicate entries',
        owner: 'Owners governed list',
        reviewStatus: 'Duplicate',
        reviewAction: 'Needs Fixing',
        queuedForReview: true,
        needsFixing: true,
        findingsPreview: 'This approved dropdown value appears more than once in the Owners list.',
        issueLanes: ['ownersLists'],
      })
    })
  }

  return {
    totalTrackedRows: drift && drift.stats ? drift.stats.currentValues || 0 : 0,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
  }
}

function buildOwnersLeadSourceGovernance(listValues, _rules, sheetMeta) {
  const currentValues = (listValues || [])
    .flat()
    .map(normalizeSheetValue)
    .filter(Boolean)

  const currentCounts = new Map()
  currentValues.forEach(function(value) {
    currentCounts.set(value, (currentCounts.get(value) || 0) + 1)
  })

  const currentUnique = Array.from(currentCounts.keys()).sort(function(a, b) {
    return a.localeCompare(b)
  })

  const governedValues = getGovernedOwnersLeadSourceValues()
  const governedSet = new Set(governedValues)
  const currentSet = new Set(currentUnique)

  const unexpectedInOwnersList = currentUnique
    .filter(function(value) {
      return !governedSet.has(value)
    })
    .map(function(value) {
      return {
        value,
        count: currentCounts.get(value) || 1,
      }
    })

  const missingFromOwnersList = governedValues
    .filter(function(value) {
      return !currentSet.has(value)
    })
    .map(function(value) {
      return { value }
    })

  const duplicates = currentUnique
    .filter(function(value) {
      return (currentCounts.get(value) || 0) > 1
    })
    .map(function(value) {
      return {
        value,
        count: currentCounts.get(value) || 0,
      }
    })

  const stats = {
    currentValues: currentValues.length,
    uniqueCurrentValues: currentUnique.length,
    governedValues: governedValues.length,
    unexpected: unexpectedInOwnersList.length,
    missing: missingFromOwnersList.length,
    duplicates: duplicates.length,
    reviewNow: unexpectedInOwnersList.length + missingFromOwnersList.length + duplicates.length,
  }

  const status = !currentValues.length
    ? 'no_data'
    : stats.reviewNow
      ? 'review'
      : 'clean'

  const fingerprint = hashText(JSON.stringify({
    status,
    currentUnique,
    unexpected: unexpectedInOwnersList.map(function(item) {
      return [item.value, item.count]
    }),
    missing: missingFromOwnersList.map(function(item) {
      return item.value
    }),
    duplicates: duplicates.map(function(item) {
      return [item.value, item.count]
    }),
  }))

  return {
    status,
    fingerprint,
    stats,
    ownersList: {
      available: currentValues.length > 0,
      modifiedTime: sheetMeta && sheetMeta.modifiedTime ? sheetMeta.modifiedTime : null,
      webViewLink: sheetMeta && sheetMeta.webViewLink ? sheetMeta.webViewLink : null,
    },
    buckets: {
      unexpectedInOwnersList,
      missingFromOwnersList,
      duplicates,
    },
  }
}

function buildOwnersLeadSourceGovernanceSummary(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  if (!drift || drift.status === 'no_data') {
    return 'Owners governed lead-source list drift waiting on readable list data'
  }
  if (drift.status === 'clean') {
    return 'Owners governed lead-source list drift cleared'
  }

  const parts = []
  if (drift.stats.unexpected) parts.push(drift.stats.unexpected + ' unexpected value' + (drift.stats.unexpected === 1 ? '' : 's'))
  if (drift.stats.missing) parts.push(drift.stats.missing + ' missing approved value' + (drift.stats.missing === 1 ? '' : 's'))
  if (drift.stats.duplicates) parts.push(drift.stats.duplicates + ' duplicate value' + (drift.stats.duplicates === 1 ? '' : 's'))
  return 'Owners governed lead-source list drift: ' + parts.join(', ')
}

function buildOwnersLeadSourceGovernanceMetadata(payload) {
  const drift = payload && payload.drift ? payload.drift : null
  return {
    fingerprint: drift ? drift.fingerprint : '',
    status: drift ? drift.status : 'no_data',
    stats: drift ? drift.stats : {},
    ownersList: payload && payload.ownersList ? payload.ownersList : {},
    samples: {
      unexpectedInOwnersList: (drift && drift.buckets ? drift.buckets.unexpectedInOwnersList : []).slice(0, 5).map(function(item) {
        return item.value
      }),
      missingFromOwnersList: (drift && drift.buckets ? drift.buckets.missingFromOwnersList : []).slice(0, 5).map(function(item) {
        return item.value
      }),
      duplicates: (drift && drift.buckets ? drift.buckets.duplicates : []).slice(0, 5).map(function(item) {
        return item.value
      }),
    },
  }
}

async function syncOwnersLeadSourceGovernanceEvent(payload, actor) {
  if (!payload || !payload.drift) return null

  const eventType = payload.drift.status === 'review'
    ? 'source_drift_detected'
    : 'source_drift_cleared'

  return recordSourceDriftChange({
    eventType,
    entityTable: 'owners_sheet_lists',
    entityId: 'SRC-OWNERS-001:lead-source-dropdown',
    summary: buildOwnersLeadSourceGovernanceSummary(payload),
    metadata: buildOwnersLeadSourceGovernanceMetadata(payload),
  }, actor)
}

function validateCategory(value) {
  return canonicalDecisionCategories.includes(value)
}

function validateBacklogPrefix(value) {
  return backlogIdPrefixes.includes(String(value || '').trim().toUpperCase()) || String(value || '').trim().toUpperCase() === 'TASK'
}

function getSupportingStrategyDocs() {
  return strategyDocs.map(filePath => {
    const meta = getDocMeta(filePath)
    const content = readFileSafe(filePath)
    return {
      meta,
      sections: parseSections(content),
    }
  })
}

const strategyAdvisorDocPaths = [
  businessStrategyPath,
  path.join(docsDir, 'system-strategy.md'),
  path.join(docsDir, 'rebuild', 'current-plan.md'),
  path.join(docsDir, 'rebuild', 'current-state.md'),
  path.join(docsDir, 'rebuild', 'intelligence-pipeline.md'),
  path.join(docsDir, 'source-notes', 'google-drive-corpus.md'),
  path.join(docsDir, 'audits', '2026-04-26-scott-pre-strat-visual-review.md'),
  path.join(docsDir, 'source-notes', 'video-link-inventory.md'),
  path.join(docsDir, 'source-notes', 'myicro-training.md'),
  ...strategyDocs,
]

function truncateForPrompt(value, maxLength) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '\n[truncated]'
}

function compactStrategyAdvisorDoc(filePath) {
  const content = readFileSafe(filePath)
  return {
    path: path.relative(__dirname, filePath),
    title: getDocTitle(content, filePath),
    exists: Boolean(content),
    excerpt: truncateForPrompt(content, 2600),
  }
}

function compactStrategyPacketItem(item) {
  return {
    itemType: item.itemType || item.item_type || '',
    title: item.title || '',
    status: item.status || '',
    oneLine: item.oneLine || item.one_line || item.currentReality || item.current_reality || '',
    evidenceSummary: item.evidenceSummary || item.evidence_summary || '',
    recommendedNextAction: item.recommendedNextAction || item.recommended_next_action || item.nextAction || item.next_action || '',
    sourceIds: item.sourceIds || item.source_ids || [],
    ownerHint: item.ownerHint || item.owner_hint || '',
    confidence: item.confidence || null,
  }
}

function compactStrategyBacklogItem(item) {
  return {
    id: item.id,
    title: item.title,
    lane: item.lane,
    priority: item.priority,
    scope: item.scope,
    summary: item.summary,
    whyItMatters: item.whyItMatters,
    nextAction: item.nextAction,
    statusNote: item.statusNote,
  }
}

const strategyAdvisorModeProfiles = {
  fast: {
    label: 'Fast',
    intent: 'live_meeting_fast',
    intelligence: 'smallest source-backed context that can answer live strategy questions quickly',
    requestedReasoningEffort: 'low',
    contextCharLimit: 8000,
    maxOutputTokens: 450,
    timeoutMs: 60000,
    packetItemLimit: 6,
    directArtifactLimit: 4,
    directArtifactExcerptChars: 700,
    backlogLimit: 10,
    decisionLimit: 3,
    openQuestionLimit: 3,
    includeDocSnapshots: false,
  },
  deep: {
    label: 'Deep',
    intent: 'smartest_available_xhigh',
    intelligence: 'widest source-backed context on the smartest runnable subscription route',
    requestedReasoningEffort: 'xhigh',
    contextCharLimit: 75000,
    maxOutputTokens: 2200,
    timeoutMs: 420000,
    packetItemLimit: 36,
    directArtifactLimit: 18,
    directArtifactExcerptChars: 2600,
    backlogLimit: 55,
    decisionLimit: 15,
    openQuestionLimit: 15,
    includeDocSnapshots: true,
  },
}

function getStrategyAdvisorModeProfile(mode) {
  return strategyAdvisorModeProfiles[mode === 'deep' ? 'deep' : 'fast']
}

async function getStrategyAdvisorContext(question = '', { mode = 'fast' } = {}) {
  const profile = getStrategyAdvisorModeProfile(mode)
  const synthesis = await getSharedCommunicationSynthesisSnapshot({
    limit: 1,
    itemLimit: profile.packetItemLimit,
    packetType: 'strategy_evidence_packet_v1',
  })
  const foundation = await getFoundationSnapshot()
  const goalTruth = await getStrategyGoalTruthSnapshot()
  const operatingTruth = await getStrategyOperatingTruthSnapshot()
  const preworkCoverage = await getStrategyPreworkCoverageSnapshot()
  const asksAboutPrework = /\bpre[-\s]?(strat|start|work)\b/i.test(question)
  const directArtifacts = await searchSharedCommunicationArtifactsForContext({
    query: question,
    sourceIds: asksAboutPrework
      ? ['SRC-GDRIVE-001']
      : [
        'SRC-GDRIVE-001',
        'SRC-MEETINGS-001',
        'SRC-GMAIL-001',
        'SRC-MISSIVE-001',
        'SRC-SLACK-001',
        'SRC-YOUTUBE-INTEL-001',
      ],
    artifactTypes: asksAboutPrework
      ? ['drive_document', 'drive_pdf', 'drive_text']
      : [
        'drive_document',
        'drive_pdf',
        'drive_text',
        'meeting_note',
        'meeting_transcript',
        'gmail_thread',
        'gmail_attachment',
        'missive_thread',
        'slack_thread',
        'video_transcript',
      ],
    limit: profile.directArtifactLimit,
    excerptChars: profile.directArtifactExcerptChars,
  })
  const packetJson = synthesis.latestRun?.metadata?.packetJson || {}
  const criticalBacklog = (foundation.backlogItems || [])
    .filter(item => {
      const searchable = `${item.id} ${item.title} ${item.summary} ${item.nextAction} ${item.statusNote}`.toLowerCase()
      return (
        item.priority === 'P0' ||
        searchable.includes('strategy') ||
        searchable.includes('synthesis') ||
        searchable.includes('action router') ||
        searchable.includes('meeting') ||
        searchable.includes('drive') ||
        searchable.includes('kpi') ||
        searchable.includes('fub') ||
        searchable.includes('marketing') ||
        searchable.includes('agent') ||
        searchable.includes('finance')
      )
    })
    .slice(0, profile.backlogLimit)
    .map(compactStrategyBacklogItem)

  const docSnapshots = []
  if (profile.includeDocSnapshots) {
    for (const docPath of [
      'docs/business-strategy.md',
      'docs/strategy/agent-engine.md',
      'docs/strategy/bhag-model.md',
      'docs/strategy/quarterly-priorities.md',
      'docs/strategy/strategic-issues.md',
    ]) {
      try {
        docSnapshots.push(await getDocSourceSnapshot(docPath))
      } catch (error) {
        docSnapshots.push({ docPath, error: error instanceof Error ? error.message : 'snapshot unavailable' })
      }
    }
  }
  const restrictedDecisionQueue = buildDecisionRestrictedQueueSnapshot({
    decisions: foundation.decisions || [],
  })
  const generalDecisions = filterGeneralDecisionRecords(foundation.decisions || [])

  return {
    generatedAt: new Date().toISOString(),
    advisorModeProfile: {
      mode: mode === 'deep' ? 'deep' : 'fast',
      label: profile.label,
      intent: profile.intent,
      intelligence: profile.intelligence,
      requestedReasoningEffort: profile.requestedReasoningEffort,
      rule: mode === 'deep'
        ? 'Use the smartest available subscription route and do the xhigh-style cross-source read.'
        : 'Prioritize live meeting latency. Answer from live truth, direct artifact matches, and packet essentials.',
    },
    doctrine: {
      northStar: 'Benson Crew strategy work should map to Attract, Grow, Retain, finance/cash truth, operating accountability, and Foundation reliability.',
      answerRule: 'Use source-backed facts first, call out inference, then name missing evidence and the next operating move. currentOperatingTruth and currentGoalTruth override packet summaries, meeting chatter, and older notes.',
    },
    currentGoalTruth: goalTruth,
    currentOperatingTruth: operatingTruth,
    directArtifactSearch: {
      query: question,
      rule: 'Use these exact artifact excerpts before packet summaries when Steve asks who said what or asks about a specific person/document.',
      items: directArtifacts,
    },
    preworkReadCoverage: preworkCoverage,
    latestPacket: {
      run: synthesis.latestRun
        ? {
          runId: synthesis.latestRun.runId,
          generatedAt: synthesis.latestRun.generatedAt,
          model: synthesis.latestRun.model,
          provider: synthesis.latestRun.provider,
          candidatesRead: synthesis.latestRun.candidatesRead,
          itemsGenerated: synthesis.latestRun.itemsGenerated,
          metadata: {
            executiveSummary: synthesis.latestRun.metadata?.executiveSummary || '',
            inputSummary: synthesis.latestRun.metadata?.inputSummary || {},
            strategyReadiness: synthesis.latestRun.metadata?.strategyReadiness || {},
          },
        }
        : null,
      items: (synthesis.latestItems || []).map(compactStrategyPacketItem),
      strategicIssues: (packetJson.strategic_issues || []).map(compactStrategyPacketItem).slice(0, 12),
      decisionCandidates: (packetJson.decisionCandidates || packetJson.decision_candidates || []).slice(0, 8),
      openQuestions: (packetJson.open_questions || packetJson.openQuestions || []).slice(0, 10),
      sourceCoverage: (packetJson.source_coverage || packetJson.sourceCoverage || []).slice(0, 12),
    },
    docs: strategyAdvisorDocPaths.map(compactStrategyAdvisorDoc),
    docSourceSnapshots: docSnapshots,
    backlog: criticalBacklog,
    decisions: generalDecisions.slice(0, profile.decisionLimit),
    restrictedDecisionQueue: {
      summary: restrictedDecisionQueue.summary,
      routingRules: restrictedDecisionQueue.routingRules,
    },
    openQuestions: (foundation.openQuestions || []).slice(0, profile.openQuestionLimit),
    runtime: {
      latestSynthesisRun: foundation.sharedCommunicationSynthesis?.latestRun || null,
      extractionControl: foundation.extractionControl?.summary || foundation.extractionControl || null,
      llmRuntime: foundation.llmRuntime?.summary || foundation.llmRuntime || null,
    },
  }
}

function getDocTitle(markdown, filePath) {
  if (markdown) {
    const lines = markdown.split('\n')
    const heading = lines.find(line => line.startsWith('# '))
    if (heading) return heading.slice(2).trim()
  }

  return path.basename(filePath, '.md')
}

function getDocSurfaceMeta(relativePath) {
  const exact = {
    'docs/business-strategy.md': {
      surfaceLabel: 'Foundation > Strategy Packet',
      surfaceHref: '/foundation#overview',
      role: 'Canonical business strategy',
      category: 'Strategy & Doctrine',
      usage: 'runtime',
      storageClass: 'Primary surface',
    },
    'docs/system-strategy.md': {
      surfaceLabel: 'Foundation > System Strategy',
      surfaceHref: '/foundation#system-strategy',
      role: 'System doctrine',
      category: 'Strategy & Doctrine',
      usage: 'runtime',
      storageClass: 'Primary surface',
    },
    'docs/users/README.md': {
      surfaceLabel: 'Foundation > Users',
      surfaceHref: '/foundation#users',
      role: 'Visible user registry',
      category: 'People',
      usage: 'runtime',
      storageClass: 'Primary surface',
    },
    'docs/users/steve.md': {
      surfaceLabel: 'Foundation > People > Users > Steve',
      surfaceHref: '/foundation#user-steve',
      role: 'Visible user profile',
      category: 'People',
      usage: 'runtime',
      storageClass: 'Profile doc',
    },
    'docs/agents/README.md': {
      surfaceLabel: 'Foundation > People > Agents',
      surfaceHref: '/foundation#agents',
      role: 'Visible agent layer',
      category: 'People',
      usage: 'runtime',
      storageClass: 'Primary surface',
    },
    'docs/agents/harlan.md': {
      surfaceLabel: 'Foundation > People > Agents > Harlan',
      surfaceHref: '/foundation#agent-harlan',
      role: 'Visible personal-agent profile',
      category: 'People',
      usage: 'runtime',
      storageClass: 'Profile doc',
    },
    'docs/agents/crewbert.md': {
      surfaceLabel: 'Foundation > People > Agents > Crewbert',
      surfaceHref: '/foundation#agent-crewbert',
      role: 'Visible system-agent profile',
      category: 'People',
      usage: 'runtime',
      storageClass: 'Profile doc',
    },
    'docs/source-registry.md': {
      surfaceLabel: 'Foundation > Data Sources > Overview',
      surfaceHref: '/foundation#source-overview',
      role: 'Source layer operator note',
      category: 'Source Layer',
      usage: 'runtime',
      storageClass: 'Operator note',
    },
    'AGENTS.md': {
      surfaceLabel: 'Workspace runtime',
      surfaceHref: '',
      role: 'Workspace operating rules',
      category: 'Workspace Runtime',
      usage: 'runtime',
      storageClass: 'Runtime doc',
    },
    'SOUL.md': {
      surfaceLabel: 'Workspace runtime',
      surfaceHref: '',
      role: 'Assistant identity for this workspace',
      category: 'Workspace Runtime',
      usage: 'runtime',
      storageClass: 'Runtime doc',
    },
    'README.md': {
      surfaceLabel: 'Repo guide',
      surfaceHref: '',
      role: 'Repository overview',
      category: 'Workspace Runtime',
      usage: 'reference',
      storageClass: 'Reference doc',
    },
    'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Retired rebuild decision log',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Decision log',
    },
    'docs/rebuild/current-state.md': {
      surfaceLabel: 'Foundation > Current State',
      surfaceHref: '/foundation#current-state',
      role: 'Current rebuild state',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'State summary',
    },
    'docs/rebuild/current-plan.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Current rebuild plan',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Execution plan',
    },
    'docs/rebuild/intelligence-pipeline.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Archive, extraction, synthesis, action routing, hub, and agent operating model',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Operating model',
    },
    'docs/rebuild/current-runtime-map.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Plain-English runtime map',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Architecture explainer',
    },
    'docs/rebuild/agent-architecture.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Target agent operating model',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Architecture doc',
    },
    'docs/rebuild/doc-cleanup-plan.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Doc authority and evidence consolidation plan',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Operating plan',
    },
    'docs/rebuild/owners-closeout.md': {
      surfaceLabel: 'Foundation > Current State',
      surfaceHref: '/foundation#current-state',
      role: 'Owners package closeout order',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Closeout plan',
    },
    'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Archived rebuild baseline',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Baseline doc',
    },
    'docs/rebuild/README.md': {
      surfaceLabel: 'Foundation > System Strategy > Rebuild Plan',
      surfaceHref: '/foundation#rebuild-plan',
      role: 'Rebuild doc index',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Reference doc',
    },
  }

  if (exact[relativePath]) return exact[relativePath]

  if (relativePath.startsWith('docs/strategy/')) {
    const strategySurfaceMap = {
      'docs/strategy/bhag-model.md': '/foundation#bhag-model',
      'docs/strategy/core-values.md': '/foundation#core-values',
      'docs/strategy/agent-engine.md': '/foundation#agent-engine',
      'docs/strategy/department-mandates.md': '/foundation#departments',
      'docs/strategy/governance.md': '/foundation#governance',
      'docs/strategy/marketmasters.md': '/foundation#marketmasters',
      'docs/strategy/quarterly-priorities.md': '/strategic-execution#quarterly-priorities',
      'docs/strategy/strategic-issues.md': '/strategic-execution#strategic-issues',
    }

    return {
      surfaceLabel: strategySurfaceMap[relativePath]
        ? (strategySurfaceMap[relativePath].startsWith('/foundation')
          ? 'Foundation supporting doc'
          : 'Strategic Execution surface')
        : '',
      surfaceHref: strategySurfaceMap[relativePath] || '',
      role: 'Supporting strategy doc',
      category: 'Strategy & Doctrine',
      usage: 'runtime',
      storageClass: 'Supporting doc',
    }
  }

  if (relativePath.startsWith('docs/source-notes/')) {
    return {
      surfaceLabel: 'Foundation > Data Sources > Overview',
      surfaceHref: '/foundation#source-overview',
      role: 'Detailed source note',
      category: 'Source Layer',
      usage: 'runtime',
      storageClass: 'Storage note',
    }
  }

  if (relativePath.startsWith('docs/audits/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Audit artifact',
      category: 'Audits & Reports',
      usage: 'reference',
      storageClass: 'Audit history',
    }
  }

  if (relativePath.startsWith('docs/handoffs/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Session handoff',
      category: 'Audits & Reports',
      usage: 'reference',
      storageClass: 'Handoff history',
    }
  }

  if (relativePath.startsWith('docs/rebuild/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Rebuild reference',
      category: 'Rebuild',
      usage: 'reference',
      storageClass: 'Planning doc',
    }
  }

  if (relativePath.startsWith('docs/research/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Research artifact',
      category: 'Research & Specs',
      usage: 'reference',
      storageClass: 'Research archive',
    }
  }

  if (relativePath.startsWith('docs/specs/') || relativePath.startsWith('docs/superpowers/specs/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Specification doc',
      category: 'Research & Specs',
      usage: 'reference',
      storageClass: 'Spec',
    }
  }

  if (relativePath.startsWith('docs/superpowers/plans/')) {
    return {
      surfaceLabel: '',
      surfaceHref: '',
      role: 'Plan artifact',
      category: 'Research & Specs',
      usage: 'reference',
      storageClass: 'Plan',
    }
  }

  if (['docs/process/local-doc-link.md', 'docs/process/doc-other-triage.md'].includes(relativePath)) {
    return {
      surfaceLabel: 'Foundation > System Inventory',
      surfaceHref: '/foundation#inventory-docs',
      role: 'Process runbook',
      category: 'Process & Runbooks',
      usage: 'runtime',
      storageClass: 'Process doc',
    }
  }

  return {
    surfaceLabel: '',
    surfaceHref: '',
    role: 'Markdown doc',
    category: 'Other',
    usage: 'reference',
    storageClass: 'Reference doc',
  }
}

function summarizeSkillDescription(markdown) {
  const descriptionMatch = String(markdown || '').match(/description:\s*(.+)/i)
  if (descriptionMatch) return descriptionMatch[1].trim()

  const headingMatch = String(markdown || '').match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  return ''
}

function walkFiles(rootDir, targetFileName, results = []) {
  if (!rootDir || !fs.existsSync(rootDir)) return results

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walkFiles(fullPath, targetFileName, results)
      continue
    }
    if (entry.isFile() && entry.name === targetFileName) {
      results.push(fullPath)
    }
  }

  return results
}

async function getTrackedMarkdownDocs() {
  const { stdout } = await runGit(['ls-files'])
  const triageByPath = parseDocOtherTriageReport(readFileSafe(path.join(repoRoot, 'docs/process/doc-other-triage.md')))
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('.md'))
    .map(relativePath => {
      const absolutePath = path.join(repoRoot, relativePath)
      const content = readFileSafe(absolutePath)
      const meta = getDocMeta(absolutePath)
      const surface = getDocSurfaceMeta(relativePath)
      const category = classifyDocInventoryPath(relativePath, { triageByPath })

      return {
        path: relativePath,
        title: getDocTitle(content, absolutePath),
        openHref: isAllowedDocPath(absolutePath) ? '/doc?path=' + encodeURIComponent(relativePath) : '',
        surfaceLabel: surface.surfaceLabel,
        surfaceHref: surface.surfaceHref,
        role: surface.role,
        category,
        legacyCategory: surface.category,
        usage: surface.usage,
        storageClass: surface.storageClass,
        editMode: isDocUpdateAllowlisted(relativePath) ? 'System apply allowlisted' : 'Manual only',
        updatedAt: meta.updatedAt,
        daysOld: meta.daysOld,
        lines: meta.lines,
      }
    })
}

async function getCurrentRepoHeadCommit() {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: __dirname,
    maxBuffer: 1024 * 64,
  })
  return normalizeGitSha(stdout)
}

function getLocalDocHostGate(req) {
  if (!isLocalRequest(req)) {
    return {
      ok: false,
      reason: 'Local private docs can only be opened from this machine.',
    }
  }

  if (!isLocalHostHeader(req)) {
    return {
      ok: false,
      reason: 'Local private docs can only be opened from localhost, 127.0.0.1, or ::1.',
    }
  }

  return { ok: true, reason: 'Request is from the local machine.' }
}

async function getServedCodeTrustGate() {
  const servedCode = getDashboardRuntimeMetadata()
  if (!servedCode.runningCommit || servedCode.status !== 'live') {
    return {
      ok: false,
      reason: 'Served-code trust is not healthy. Restart the dashboard and rerun foundation:verify before opening private local docs.',
    }
  }

  try {
    const currentHead = await getCurrentRepoHeadCommit()
    if (servedCode.runningCommit !== currentHead) {
      return {
        ok: false,
        reason: 'Served-code trust is stale. Restart the dashboard so served code matches repo HEAD before opening private local docs.',
      }
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'Served-code trust could not compare the running commit to repo HEAD.',
    }
  }

  return { ok: true, reason: 'Served-code trust is healthy.' }
}

async function buildRuntimeProcessControlApiSnapshot(snapshot = null) {
  const foundationSnapshot = snapshot || await getFoundationSnapshot()
  const workerCode = await getFoundationRuntimeStatus('foundation-worker')
  let currentRepoHead = null
  try {
    currentRepoHead = await getCurrentRepoHeadCommit()
  } catch {
    currentRepoHead = null
  }
  const runtimeSupervisor = {
    servedCode: getDashboardRuntimeMetadata(),
    workerCode: workerCode || getMissingWorkerRuntimeMetadata(),
  }
  const [dashboardLaunchAgent, workerLaunchAgent] = await Promise.all([
    getLaunchAgentStatus('ai.bcrew.dashboard'),
    getLaunchAgentStatus('ai.bcrew.foundation-worker'),
  ])

  return buildRuntimeProcessControlSnapshot({
    foundationJobs: foundationSnapshot.foundationJobs,
    llmRuntime: foundationSnapshot.llmRuntime,
    extractionControl: foundationSnapshot.extractionControl,
    runtimeSupervisor,
    launchAgents: {
      dashboard: dashboardLaunchAgent,
      'foundation-worker': workerLaunchAgent,
    },
    currentRepoHead,
  })
}

function resolvePrivateLocalDoc(name) {
  const requestedName = String(name || '').trim()
  if (!Object.prototype.hasOwnProperty.call(privateLocalMarkdownMeta, requestedName)) {
    return {
      ok: false,
      reason: 'Only allowlisted private local docs can be opened.',
    }
  }

  if (requestedName.includes('/') || requestedName.includes('\\') || requestedName.includes('..')) {
    return {
      ok: false,
      reason: 'Path traversal is not allowed for private local docs.',
    }
  }

  const absolutePath = path.resolve(repoRoot, requestedName)
  const relativePath = path.relative(repoRoot, absolutePath)
  if (relativePath !== requestedName || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return {
      ok: false,
      reason: 'Private local docs must resolve inside the repo root.',
    }
  }

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      reason: 'The requested private local doc does not exist on this machine.',
    }
  }

  return {
    ok: true,
    requestedName,
    absolutePath,
    meta: privateLocalMarkdownMeta[requestedName],
  }
}

async function getPrivateLocalDocAccess(req, name) {
  const hostGate = getLocalDocHostGate(req)
  if (!hostGate.ok) return hostGate

  const servedCodeGate = await getServedCodeTrustGate()
  if (!servedCodeGate.ok) return servedCodeGate

  return resolvePrivateLocalDoc(name)
}

async function getPrivateLocalMarkdownDocs(req) {
  const hostGate = getLocalDocHostGate(req)
  const servedCodeGate = hostGate.ok ? await getServedCodeTrustGate() : hostGate
  const canOpenLocalDocs = hostGate.ok && servedCodeGate.ok

  return Object.entries(privateLocalMarkdownMeta)
    .filter(([relativePath]) => fs.existsSync(path.join(repoRoot, relativePath)))
    .map(([relativePath, info]) => ({
      path: relativePath,
      title: path.basename(relativePath, '.md'),
      openHref: canOpenLocalDocs ? '/api/foundation/local-doc/' + encodeURIComponent(relativePath) : '',
      surfaceLabel: 'Local workspace only',
      surfaceHref: '',
      role: info.role,
      category: 'Local-private',
      usage: 'private-local',
      storageClass: 'Private local doc',
      editMode: 'Local file only',
      updatedAt: getDocMeta(path.join(repoRoot, relativePath)).updatedAt,
      daysOld: getDocMeta(path.join(repoRoot, relativePath)).daysOld,
      lines: getDocMeta(path.join(repoRoot, relativePath)).lines,
      whyHidden: info.whyHidden,
      localOpenEligible: canOpenLocalDocs,
      localOpenReason: canOpenLocalDocs ? 'Local open is available on this machine.' : servedCodeGate.reason,
    }))
}

function getSkillInventory() {
  return walkFiles(codexSkillsDir, 'SKILL.md')
    .map(filePath => {
      const relativePath = path.relative(codexSkillsDir, filePath)
      const skillFolder = path.dirname(relativePath)
      const content = readFileSafe(filePath)
      const meta = getDocMeta(filePath)
      return {
        id: skillFolder.replace(/\\/g, '/'),
        title: path.basename(skillFolder),
        scope: skillFolder.startsWith('.system' + path.sep) || skillFolder === '.system'
          ? 'System skill'
          : 'Workspace skill',
        path: filePath.replace(codexHome, '~/.codex'),
        description: summarizeSkillDescription(content),
        updatedAt: meta.updatedAt,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

function getPluginInventory() {
  const grouped = {}
  const pluginTitles = {
    github: 'GitHub',
  }

  walkFiles(codexPluginsDir, 'SKILL.md').forEach(filePath => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const pluginMatch = normalizedPath.match(/\/plugins\/cache\/(?:openai-curated|openai-bundled|openai-primary-runtime)\/([^/]+)\//)
    if (!pluginMatch) return

    const pluginKey = pluginMatch[1]
    if (!grouped[pluginKey]) {
      grouped[pluginKey] = {
        id: pluginKey,
        title: pluginTitles[pluginKey] || pluginKey
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        type: 'Plugin / MCP surface',
        status: 'Installed in local runtime',
        skillCount: 0,
        skills: [],
      }
    }

    const content = readFileSafe(filePath)
    grouped[pluginKey].skillCount += 1
    grouped[pluginKey].skills.push({
      title: path.basename(path.dirname(filePath)),
      description: summarizeSkillDescription(content),
    })
  })

  return Object.values(grouped)
    .sort((a, b) => a.title.localeCompare(b.title))
}

function requireStringField(errors, body, field, label) {
  const value = body[field]
  if (typeof value !== 'string' || !value.trim()) {
    errors[field] = `${label} is required.`
    return null
  }
  return value.trim()
}

function optionalStringField(errors, body, field, label, maxLength) {
  const value = body[field]
  if (value == null || value === '') return null
  if (typeof value !== 'string') {
    errors[field] = `${label} must be text.`
    return null
  }
  const trimmed = value.trim()
  if (maxLength && trimmed.length > maxLength) {
    errors[field] = `${label} must be ${maxLength} characters or fewer.`
    return null
  }
  return trimmed
}

function optionalStringArrayField(errors, body, field, label, maxItems = 25, maxItemLength = 160) {
  if (!Object.prototype.hasOwnProperty.call(body || {}, field)) return undefined
  const value = body[field]
  if (value == null || value === '') return []
  if (!Array.isArray(value)) {
    errors[field] = `${label} must be a list of text values.`
    return undefined
  }

  const normalized = []
  const seen = new Set()

  for (const rawItem of value) {
    if (typeof rawItem !== 'string') {
      errors[field] = `${label} must only contain text values.`
      return undefined
    }
    const trimmed = rawItem.trim()
    if (!trimmed) continue
    if (trimmed.length > maxItemLength) {
      errors[field] = `${label} entries must be ${maxItemLength} characters or fewer.`
      return undefined
    }
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }

  if (normalized.length > maxItems) {
    errors[field] = `${label} must have ${maxItems} entries or fewer.`
    return undefined
  }

  return normalized
}

function optionalNumberField(errors, body, field, label) {
  const value = body[field]
  if (value == null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    errors[field] = `${label} must be a number.`
    return null
  }
  return parsed
}

function getAllowedBodyKeys(body, allowedKeys) {
  return Object.keys(body || {}).filter(key => !allowedKeys.includes(key))
}

function sanitizeFubRequestHeaders(rawHeaders) {
  if (rawHeaders == null) return {}
  if (typeof rawHeaders !== 'object' || Array.isArray(rawHeaders)) {
    throw new Error('FUB headers must be an object.')
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (!key || typeof value === 'undefined' || value === null) continue
    const lowerKey = String(key).toLowerCase()
    if (['authorization', 'host', 'content-length'].includes(lowerKey)) continue
    sanitized[key] = String(value)
  }
  return sanitized
}

function classifyBuildArea(files = [], subject = '') {
  const text = `${subject} ${files.join(' ')}`.toLowerCase()
  const areas = []
  const add = area => {
    if (!areas.includes(area)) areas.push(area)
  }
  if (text.includes('strategic-execution') || text.includes('strategy hub') || text.includes('strategy')) add('Strategy Hub')
  if (text.includes('intelligence-') || text.includes('retrieval') || text.includes('synthesis') || text.includes('action-router')) add('Intelligence spine')
  if (text.includes('foundation-db') || text.includes('foundation-jobs') || text.includes('foundation:verify') || text.includes('foundation-verify')) add('Foundation runtime')
  if (text.includes('sync-clickup') || text.includes('owners-dashboard') || text.includes('conditional forecast') || text.includes('ops')) add('Ops / Owners')
  if (text.includes('docs/specs') || text.includes('manifest') || text.includes('salvage') || text.includes('handoff')) add('Specs / handoffs')
  if (text.includes('source-notes') || text.includes('source contract') || text.includes('source registry')) add('Source truth')
  return areas.length ? areas : ['Repo']
}

function buildChangedFileGroups(files = []) {
  const groups = new Set()
  files.forEach(file => {
    if (file.startsWith('lib/intelligence-')) groups.add('Intelligence modules')
    else if (file.startsWith('lib/')) groups.add('Backend library')
    else if (file.startsWith('public/')) groups.add('UI surface')
    else if (file.startsWith('scripts/')) groups.add('Proof / automation script')
    else if (file.startsWith('docs/specs/')) groups.add('Accepted spec')
    else if (file.startsWith('docs/source-notes/')) groups.add('Source note')
    else if (file.startsWith('docs/')) groups.add('Docs')
    else groups.add('Repo file')
  })
  return Array.from(groups)
}

async function getRecentBuildLog(limit = 30) {
  const boundedLimit = Math.min(500, Math.max(1, Number(limit) || 30))
  const { stdout } = await execFileAsync('git', [
    'log',
    `--max-count=${boundedLimit}`,
    '--date=iso-strict',
    '--name-only',
    '--pretty=format:@@BUILD@@%H%x1f%h%x1f%ad%x1f%s',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024,
  })

  const commits = []
  let current = null
  stdout.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return
    if (line.startsWith('@@BUILD@@')) {
      const [sha, shortSha, committedAt, subject] = line.slice('@@BUILD@@'.length).split('\x1f')
      current = {
        sha,
        shortSha,
        committedAt,
        subject,
        files: [],
      }
      commits.push(current)
      return
    }
    if (current) current.files.push(line.trim())
  })

  const enrichedBuilds = commits.flatMap(commit => {
    const files = commit.files.filter(Boolean)
    return enrichFoundationBuildLogCommitEntries({
      ...commit,
      areas: classifyBuildArea(files, commit.subject),
      fileGroups: buildChangedFileGroups(files),
      fileCount: files.length,
      primaryFiles: files.slice(0, 8),
    })
  })
  const backlogIds = Array.from(new Set(enrichedBuilds.flatMap(build => build.backlogIds || [])))
  const backlogItems = await getBacklogItemsByIds(backlogIds)
  return attachBacklogCardsToBuilds(enrichedBuilds, backlogItems)
}

registerFoundationSourceRoutes(app, {
  requireAdminToken,
  sendApiError,
  sendAccessDenied,
  cacheHeadersNoStore,
  AccessDeniedError,
  buildSourceOfTruthPayload,
  getFoundationSnapshot,
  getExtractionControlSnapshot,
  getSourceContracts,
  getSourceConnectors,
  getGroupedSourceSystems,
  getFoundationJobDefinitions,
  buildSourceLifecycleStatus,
  buildSourceMaturityGridSnapshot,
  buildSourceExtractionCoverageSnapshot,
  buildSourceCoverageCloseoutSnapshot,
  buildSourceConnectorMatrixSnapshot,
  buildConnectorCredentialRegistrySnapshot,
  buildSourceHubRoutingMatrixSnapshot,
  buildMarketingAvatarImportSnapshot,
  buildMarketingSourceMapSnapshot,
  buildBrandStackSnapshot,
  buildTierBehavioralCompletionSnapshot,
  buildBacklogHygieneSnapshot,
  getFoundationBuildCloseouts,
  buildResearchCurationStatus,
  getRecentChangeEvents,
  buildVerificationRunsSnapshot,
  buildPerUserChangelogSnapshot,
  buildDecisionRestrictedQueueSnapshot,
  getActiveFoundationCurrentSprint,
  buildFoundationCurrentSprintStatus,
  buildFoundationUiCompleteSnapshot,
  listFoundationUsers,
  readFileSafe,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_SOURCE_MAP_NOTE_PATH,
  repoRoot: __dirname,
})

registerFoundationBuildIntelRoutes(app, {
  requireAdminToken,
  sendApiError,
  getFoundationSnapshot,
  getActiveFoundationCurrentSprint,
  listFoundationFeedbackItems,
  listFoundationAcknowledgedStates,
  searchSharedCommunicationArtifactsForContext,
  getFoundationBuildCloseouts,
  getSourceContracts,
  buildCreatorWatchlistSnapshot,
  buildMultimodalExtractorContractSnapshot,
  buildResearchInboxContractSnapshot,
  buildFoundationControlCompressionSnapshot,
  buildImplementationIntelligenceSnapshot,
  buildBuildIntelExtractionImplementationSnapshot,
  buildGStackBuildIntelSnapshot,
})

registerFubSourceRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getAllowedBodyKeys,
  requireStringField,
  optionalStringField,
  sanitizeFubRequestHeaders,
  getRequestActor,
  getFubContextsSummary,
  getFubHealth,
  getFubPerson,
  resolveFubContext,
  getFubLeadSourceSnapshot,
  listFubLeadSourceRules,
  buildFubLeadSourcePayload,
  syncFubLeadSourceDriftEvent,
  buildSourceWatchFreshness,
  getLatestChangeEventForEntity,
  listFubLeadSources,
  saveFubLeadSourceSnapshot,
  upsertFubLeadSourceRule,
  fubJsonFetch,
  FUB_LEAD_SOURCE_REFRESH_PAGE_LIMIT,
  FUB_LEAD_SOURCE_REFRESH_MAX_PAGES,
})

app.get('/api/owners/lead-source-governance', requireAdminToken, async (_req, res) => {
  try {
    const [listResponse, fileMeta, rules] = await Promise.all([
      getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_LEAD_SOURCE_LIST_RANGE),
      getDriveFileMetadata(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID),
      listFubLeadSourceRules(),
    ])

    const drift = buildOwnersLeadSourceGovernance(listResponse.values || [], rules, fileMeta)
    const payload = {
      sourceId: 'SRC-OWNERS-001',
      ownersList: {
        sheetId: OWNERS_SHEET_ID,
        range: OWNERS_LEAD_SOURCE_LIST_RANGE,
        modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
        webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
      },
      drift,
    }

    const syncResult = await syncOwnersLeadSourceGovernanceEvent(payload, 'system')
    const latestEvent = syncResult && syncResult.event
      ? syncResult.event
      : await getLatestChangeEventForEntity('owners_sheet_lists', 'SRC-OWNERS-001:lead-source-dropdown', ['source_drift_detected', 'source_drift_cleared'])
    payload.freshness = buildSourceWatchFreshness(latestEvent, payload.drift.status === 'review', {
      reason: 'Governed Owners dropdown drift has been sitting unchanged.',
    })

    cacheHeadersNoStore(res)
    res.json(payload)
  } catch (error) {
    const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
    sendApiError(
      res,
      statusCode,
      'owners_lead_source_governance_failed',
      error instanceof Error ? error.message : 'Failed to load Owners lead-source governance.'
    )
  }
})

app.get('/api/owners/review-queue', requireAdminToken, async (_req, res) => {
  try {
    const fubContexts = getFubContextsSummary()
    const ownerFubContext = fubContexts.find(function(item) { return item.key === 'owner' }) || { key: 'owner', label: 'Support / Owner account' }

    const [adminResponse, conditionalResponse, fileMeta, fubSnapshot, rules, ownersListResponse, agentRosterSnapshot] = await Promise.all([
      getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_ADMIN_REVIEW_RANGE),
      getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_CONDITIONAL_REVIEW_RANGE),
      getDriveFileMetadata(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID),
      getFubLeadSourceSnapshot('owner'),
      listFubLeadSourceRules(),
      getSheetValues(FOUNDATION_GOOGLE_USER, OWNERS_SHEET_ID, OWNERS_LEAD_SOURCE_LIST_RANGE),
      getClickUpListSnapshotSafe(CLICKUP_AGENT_ROSTER_LIST_ID, { listName: 'Agent Roster' }),
    ])

    const admin = buildAdminReviewQueue(adminResponse.values || [])
    const conditional = buildConditionalReviewQueue(conditionalResponse.values || [])
    const fubLeadSources = buildFubLeadSourcePayload(fubSnapshot, rules, ownerFubContext)
    const ownersGovernancePayload = {
      sourceId: 'SRC-OWNERS-001',
      ownersList: {
        sheetId: OWNERS_SHEET_ID,
        range: OWNERS_LEAD_SOURCE_LIST_RANGE,
        modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
        webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
      },
      drift: buildOwnersLeadSourceGovernance(ownersListResponse.values || [], rules, fileMeta),
    }
    const fubDrift = buildFubLeadSourceReviewQueue(fubLeadSources)
    const ownersGovernance = buildOwnersGovernanceReviewQueue(ownersGovernancePayload)
    const agentRoster = buildAgentRosterReviewQueue(agentRosterSnapshot)
    agentRoster.items = (agentRoster.items || []).map(function(item) {
      return {
        ...item,
        issueLanes: mergeIssueLanes(item.issueLanes, ['agentOnboarding']),
      }
    })
    const combinedQueue = {
      totalTrackedRows: admin.totalTrackedRows + conditional.totalTrackedRows + fubDrift.totalTrackedRows + ownersGovernance.totalTrackedRows + agentRoster.totalTrackedRows,
      openItems: admin.openItems + conditional.openItems + fubDrift.openItems + ownersGovernance.openItems + agentRoster.openItems,
      queuedReview: admin.queuedReview + conditional.queuedReview + fubDrift.queuedReview + ownersGovernance.queuedReview + agentRoster.queuedReview,
      needsFixing: admin.needsFixing + conditional.needsFixing + fubDrift.needsFixing + ownersGovernance.needsFixing + agentRoster.needsFixing,
      items: []
        .concat(admin.items || [])
        .concat(conditional.items || [])
        .concat(fubDrift.items || [])
        .concat(ownersGovernance.items || [])
        .concat(agentRoster.items || []),
    }

    const [adminSync, conditionalSync, combinedSync, fubSync, ownersGovernanceSync, agentRosterSync] = await Promise.all([
      syncReviewQueueEvent({
        entityTable: 'owners_review_queue',
        entityId: 'SRC-OWNERS-001:admin',
        label: 'Owners admin lane',
        queue: admin,
      }, 'system'),
      syncReviewQueueEvent({
        entityTable: 'owners_review_queue',
        entityId: 'SRC-OWNERS-001:conditional',
        label: 'Owners conditional lane',
        queue: conditional,
      }, 'system'),
      syncReviewQueueEvent({
        entityTable: 'owners_review_queue',
        entityId: 'SRC-OWNERS-001:combined',
        label: 'Owners combined governed inbox',
        queue: combinedQueue,
        extra: {
          sectionCounts: {
            admin: admin.openItems,
            conditional: conditional.openItems,
            fubDrift: fubDrift.openItems,
            ownersGovernance: ownersGovernance.openItems,
            agentRoster: agentRoster.openItems,
          },
        },
      }, 'system'),
      syncFubLeadSourceDriftEvent(fubLeadSources, 'system'),
      syncOwnersLeadSourceGovernanceEvent(ownersGovernancePayload, 'system'),
      syncReviewQueueEvent({
        entityTable: 'clickup_review_queue',
        entityId: 'SRC-CLICKUP-001:agent-roster',
        label: 'ClickUp Agent Roster lane',
        queue: agentRoster,
      }, 'system'),
    ])

    admin.freshness = buildSourceWatchFreshness(
      adminSync && adminSync.event
        ? adminSync.event
        : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:admin', ['review_queue_changed', 'review_queue_cleared']),
      admin.openItems > 0,
      { reason: 'Admin deal review findings have been sitting unchanged.' }
    )

    conditional.freshness = buildSourceWatchFreshness(
      conditionalSync && conditionalSync.event
        ? conditionalSync.event
        : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:conditional', ['review_queue_changed', 'review_queue_cleared']),
      conditional.openItems > 0,
      { reason: 'Conditional forecast missing-data items have been sitting unchanged.' }
    )

    fubDrift.freshness = !fubLeadSources.snapshot.available
      ? buildSourceWatchFreshness(
          fubSync && fubSync.event
            ? fubSync.event
            : await getLatestChangeEventForEntity('fub_lead_source_snapshots', ownerFubContext.key, ['source_drift_detected', 'source_drift_cleared']),
          false,
          {
            missing: true,
            reason: 'No saved owner-context FUB snapshot exists yet.',
          }
        )
      : buildSourceWatchFreshness(
          fubSync && fubSync.event
            ? fubSync.event
            : await getLatestChangeEventForEntity('fub_lead_source_snapshots', ownerFubContext.key, ['source_drift_detected', 'source_drift_cleared']),
          fubDrift.openItems > 0,
          {
            forcedStatus: fubLeadSources.drift && fubLeadSources.drift.stale && fubLeadSources.drift.stale.isStale ? 'stale' : '',
            forcedReason: fubLeadSources.drift && fubLeadSources.drift.stale && fubLeadSources.drift.stale.isStale
              ? 'Saved FUB source snapshot is older than 24 hours.'
              : 'FUB taxonomy drift has been sitting unchanged.',
          }
        )
    fubDrift.freshness.snapshotAgeHours = fubLeadSources.drift && fubLeadSources.drift.stale ? fubLeadSources.drift.stale.ageHours : null

    ownersGovernance.freshness = buildSourceWatchFreshness(
      ownersGovernanceSync && ownersGovernanceSync.event
        ? ownersGovernanceSync.event
        : await getLatestChangeEventForEntity('owners_sheet_lists', 'SRC-OWNERS-001:lead-source-dropdown', ['source_drift_detected', 'source_drift_cleared']),
      ownersGovernance.openItems > 0,
      { reason: 'Governed Owners dropdown drift has been sitting unchanged.' }
    )

    agentRoster.freshness = buildSourceWatchFreshness(
      agentRosterSync && agentRosterSync.event
        ? agentRosterSync.event
        : await getLatestChangeEventForEntity('clickup_review_queue', 'SRC-CLICKUP-001:agent-roster', ['review_queue_changed', 'review_queue_cleared']),
      agentRoster.openItems > 0,
      { reason: 'Agent roster accountability findings have been sitting unchanged.' }
    )

    const reviewQueueFreshness = buildSourceWatchFreshness(
      combinedSync && combinedSync.event
        ? combinedSync.event
        : await getLatestChangeEventForEntity('owners_review_queue', 'SRC-OWNERS-001:combined', ['review_queue_changed', 'review_queue_cleared']),
      combinedQueue.openItems > 0,
      { reason: 'The combined Owners governed inbox has been sitting unchanged.' }
    )

    cacheHeadersNoStore(res)
    res.json({
      sourceId: 'SRC-OWNERS-001',
      reviewQueue: {
        status: combinedQueue.openItems ? 'open' : 'clear',
        stats: {
          openItems: combinedQueue.openItems,
          queuedReview: combinedQueue.queuedReview,
          needsFixing: combinedQueue.needsFixing,
        },
        freshness: reviewQueueFreshness,
        freshnessRules: {
          warningHours: GOVERNED_WARNING_HOURS,
          staleHours: GOVERNED_STALE_HOURS,
          fubSnapshotStaleHours: 24,
        },
        ownersSheet: {
          sheetId: OWNERS_SHEET_ID,
          modifiedTime: fileMeta && fileMeta.modifiedTime ? fileMeta.modifiedTime : null,
          webViewLink: fileMeta && fileMeta.webViewLink ? fileMeta.webViewLink : null,
        },
        sections: {
          admin,
          conditional,
          fubDrift,
          ownersGovernance,
          agentRoster,
        },
      },
    })
  } catch (error) {
    const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
    sendApiError(
      res,
      statusCode,
      'owners_review_queue_failed',
      error instanceof Error ? error.message : 'Failed to load Owners review queue.'
    )
  }
})

app.get('/api/foundation/local-doc/:name', async (req, res) => {
  try {
    const access = await getPrivateLocalDocAccess(req, req.params.name)
    if (!access.ok) {
      cacheHeadersNoStore(res)
      res.status(403).json({
        error: 'local_doc_forbidden',
        message: access.reason,
      })
      return
    }

    cacheHeadersNoStore(res)
    res.type('text/markdown').send(fs.readFileSync(access.absolutePath, 'utf8'))
  } catch (error) {
    sendApiError(
      res,
      500,
      'local_doc_failed',
      error instanceof Error ? error.message : 'Failed to open private local doc.'
    )
  }
})

app.get('/api/foundation/local-doc/*', (_req, res) => {
  cacheHeadersNoStore(res)
  res.status(403).json({
    error: 'local_doc_forbidden',
    message: 'Only allowlisted private local docs can be opened.',
  })
})

app.get('/api/system-inventory', requireAdminToken, async (req, res) => {
  try {
    const trackedDocs = await getTrackedMarkdownDocs()
    const privateLocalDocs = await getPrivateLocalMarkdownDocs(req)
    const skills = getSkillInventory()
    const plugins = getPluginInventory()
    const personalWorkspaceBoundary = await buildPersonalWorkspaceBoundaryStatus({
      repoRoot: __dirname,
      includeSynthetic: false,
    })
    const identity = buildFoundationIdentitySurface({
      trackedDocs,
      privateLocalDocs,
      personalWorkspaceBoundary,
      skills,
      plugins,
    })

    cacheHeadersNoStore(res)
    res.json({
      docs: {
        tracked: trackedDocs,
        privateLocal: privateLocalDocs,
        categorySummary: summarizeDocInventoryCategories(trackedDocs.concat(privateLocalDocs)),
      },
      skills,
      plugins,
      identity,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'system_inventory_failed',
      error instanceof Error ? error.message : 'Failed to build system inventory.'
    )
  }
})

app.get('/api/sheets/structure-status', requireAdminToken, async (_req, res) => {
  try {
    const status = await runSheetsStructureVerification()
    cacheHeadersNoStore(res)
    res.json(status)
  } catch (error) {
    sendApiError(
      res,
      500,
      'sheet_structure_status_failed',
      error instanceof Error ? error.message : 'Failed to load sheet structure status.'
    )
  }
})

registerHubReadRoutes(app, {
  requireAdminToken,
  repoRoot: __dirname,
  path,
  sendApiError,
  cacheHeadersNoStore,
  attachFoundationHubPerformanceMetadata,
  buildFoundationHubSummaryInfo,
  normalizeFoundationHubMode,
  getFoundationCoreSnapshot,
  buildFoundationHubBacklogContract,
  buildBacklogHygieneSnapshot,
  getFoundationBuildCloseouts,
  compactFoundationReviewSprintSnapshot,
  buildFoundationReviewSprintStatus,
  loadFoundationReviewSprintArtifact,
  compactResearchCurationSnapshot,
  buildResearchCurationStatus,
  getFoundationJobRunSnapshot,
  compactFoundationJobRunSnapshot,
  getFoundationRuntimeStatus,
  getActiveFoundationCurrentSprint,
  buildFoundationCurrentSprintStatus,
  scanDecisionAutoEmitCandidates,
  buildDecisionAutoEmitSummary,
  getDashboardRuntimeMetadata,
  getMissingWorkerRuntimeMetadata,
  getFoundationSnapshot,
  getCachedSafeKpiHealthSnapshot,
  buildDocArchiveCleanupStatus,
  buildExceptionCurationStatus,
  buildHitListReconcileStatusFromFile,
  buildArchiveRetireStatus,
  buildPostShipFanoutStatus,
  buildDoctrinePropagationStatus,
  buildSyntheticGateReliabilityProof,
  buildPersonalWorkspaceBoundaryStatus,
  buildCeoDashboardPatternStatus,
  getGoogleSheetsCacheStats,
  buildSourceLifecycleStatus,
  getSourceContracts,
  getSourceConnectors,
  getGroupedSourceSystems,
  getFoundationJobDefinitions,
  buildSourceMaturityGridSnapshot,
  buildSourceExtractionCoverageSnapshot,
  buildSourceCoverageCloseoutSnapshot,
  buildSourceConnectorMatrixSnapshot,
  buildSourceHubRoutingMatrixSnapshot,
  buildFoundationHubAgentFeedbackDiagnostics,
  buildFoundationHubSourceOutageBoundary,
  getLatestMeetingVaultAutoEnforcementRun,
  getMeetingVaultLegacyExceptions,
  buildRuntimeProcessControlApiSnapshot,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_SOURCE_MAP_NOTE_PATH,
  readFileSafe,
  buildMarketingAvatarImportSnapshot,
  buildMarketingSourceMapSnapshot,
  buildBrandStackSnapshot,
  buildTierBehavioralCompletionSnapshot,
  buildVerificationRunsSnapshot,
  buildPerUserChangelogSnapshot,
  getRecentChangeEvents,
  buildDecisionRestrictedQueueSnapshot,
  buildFoundationCurrentStateSummaryPayload,
  buildCreatorWatchlistSnapshot,
  buildMultimodalExtractorContractSnapshot,
  buildResearchInboxContractSnapshot,
  listFoundationFeedbackItems,
  listFoundationAcknowledgedStates,
  buildFoundationControlCompressionSnapshot,
  buildImplementationIntelligenceSnapshot,
  searchSharedCommunicationArtifactsForContext,
  buildBuildIntelExtractionImplementationSnapshot,
  buildGStackBuildIntelSnapshot,
  buildFoundationOperatingReliabilitySnapshot,
  loadLatestFoundationEndpointBudgetSnapshot,
  buildDocArtifactBloatSnapshot,
  buildFoundationUiCompleteSnapshot,
  getSalesHubPayload,
})

app.get('/api/foundation/agent-feedback-production-dry-run', requireAdminToken, async (req, res) => {
  try {
    const includeCandidates = String(req.query?.includeCandidates || '').toLowerCase() === 'true'
    const report = await buildAgentFeedbackProductionAutoSendDryRunReport({
      includeCandidates,
    })
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      report,
      summary: report.summary,
      sideEffects: report.sideEffects,
      productionEnablement: report.productionEnablement,
      privacy: report.privacy,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'agent_feedback_production_dry_run_failed',
      error instanceof Error ? error.message : 'Failed to load Agent Feedback production dry-run report.'
    )
  }
})

app.post('/api/intelligence/evidence', requireAdminToken, async (req, res) => {
  try {
    const query = String(req.body?.query || '').trim()
    if (!query) {
      sendApiError(res, 400, 'missing_query', 'query is required.')
      return
    }
    const actorTier = deriveActorTier(req)
    const retrievalMaxTier = actorTier === 1 ? 3 : actorTier
    const embedding = await callEmbedding({
      input: query,
      dimensions: 1536,
      metadata: {
        backlogCardId: 'SECURITY-002',
        purpose: 'hybrid_evidence_api_query',
        actor: getRequestActor(req),
      },
    })
    const evidence = await searchIntelligenceEvidenceHybrid({
      ...req.body,
      query,
      queryEmbedding: embedding.embeddings[0],
      maxTier: retrievalMaxTier,
      limit: req.body?.limit,
    })
    const filtered = filterRecordsForActor(evidence.results || [], req, {
      failClosedOnMissingClassification: true,
    })
    cacheHeadersNoStore(res)
    res.json(buildRedactedCollectionResponse({
      actor: req,
      generatedAt: evidence.generatedAt,
      data: {
        ...evidence,
        maxTier: undefined,
        actorTier,
        resultCount: filtered.items.length,
        results: filtered.items,
        embedding: {
          model: embedding.model,
          dimensions: embedding.dimensions,
          callId: embedding.call.callId,
        },
      },
    }))
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      sendAccessDenied(res, error)
      return
    }
    sendApiError(
      res,
      500,
      'intelligence_evidence_failed',
      error instanceof Error ? error.message : 'Failed to retrieve intelligence evidence.'
    )
  }
})

app.post('/api/sales-hub/listing-assignment', requireAdminToken, async (req, res) => {
  try {
    const taskId = String(req.body?.taskId || '').trim()
    const leaderKey = String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
    if (!taskId) {
      sendApiError(res, 400, 'missing_task_id', 'ClickUp task ID is required.')
      return
    }

    const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
    if (leaderKey && !leader) {
      sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
      return
    }

    const listingInventory = await buildSalesListingInventory()
    const listing = (listingInventory.staleListings || []).find(item => item.taskId === taskId)
    if (!listing) {
      sendApiError(res, 404, 'stale_listing_not_found', 'That listing is not in the current stale active listing list.')
      return
    }

    const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
    const existingCaseStatus = listing.salesLeaderAssignment?.caseStatus || ''
    const caseStatus = leader && (!existingCaseStatus || existingCaseStatus === 'identified')
      ? 'assigned'
      : existingCaseStatus || undefined
    const assignment = await upsertSalesListingAssignment({
      clickUpTaskId: listing.taskId,
      listingTitle: listing.title,
      listingUrl: listing.url,
      agentName: listing.agent,
      resetDate: listing.resetDate || null,
      daysSinceReset: listing.daysSinceReset,
      assignedLeaderKey: leader?.key || '',
      assignedLeaderName: leader?.name || '',
      assignedLeaderEmail: leader?.email || '',
      caseStatus,
      metadata: {
        source: 'sales-hub',
        assignmentSurface: '/sales#stale-listings',
      },
    }, actor.email || actor.name || 'sales-hub')

    clearSalesHubCache()
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      taskId: listing.taskId,
      assignment: sanitizeSalesListingAssignment(assignment),
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'sales_assignment_failed',
      error instanceof Error ? error.message : 'Failed to save Sales Hub assignment.'
    )
  }
})

app.post('/api/sales-hub/group-assignment', requireAdminToken, async (req, res) => {
  try {
    const agentName = String(req.body?.agentName || '').trim()
    const leaderKey = String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
    if (!agentName) {
      sendApiError(res, 400, 'missing_agent_name', 'Agent name is required.')
      return
    }
    const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
    if (leaderKey && !leader) {
      sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan Campbell, Blake Berfelz, Nick Bergmann, Scott Benson, or Steve Zahnd.')
      return
    }

    const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
    const listingInventory = await buildSalesListingInventory()
    const group = (listingInventory.groups || []).find(item => item.agent === agentName)
    if (!group) {
      sendApiError(res, 404, 'agent_group_not_found', 'That agent group is not in the current stale active listing list.')
      return
    }

    const updated = []
    for (const listing of group.listings || []) {
      const existingCaseStatus = listing.salesLeaderAssignment?.caseStatus || ''
      updated.push(await upsertSalesListingAssignment({
        clickUpTaskId: listing.taskId,
        listingTitle: listing.title,
        listingUrl: listing.url,
        agentName: listing.agent,
        resetDate: listing.resetDate || null,
        daysSinceReset: listing.daysSinceReset,
        assignedLeaderKey: leader?.key || '',
        assignedLeaderName: leader?.name || '',
        assignedLeaderEmail: leader?.email || '',
        caseStatus: leader && (!existingCaseStatus || existingCaseStatus === 'identified')
          ? 'assigned'
          : existingCaseStatus || undefined,
        metadata: {
          source: 'sales-hub-group-assignment',
          assignmentSurface: '/sales#stale-listings',
          agentName,
        },
      }, actor.email || actor.name || 'sales-hub'))
    }

    clearSalesHubCache()
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      agentName,
      updatedCount: updated.length,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'sales_group_assignment_failed',
      error instanceof Error ? error.message : 'Failed to save Sales Hub group assignment.'
    )
  }
})

app.post('/api/sales-hub/project-case', requireAdminToken, async (req, res) => {
  try {
    const projectKey = String(req.body?.projectKey || '').trim()
    if (!projectKey) {
      sendApiError(res, 400, 'missing_project_key', 'Project key is required.')
      return
    }

    const listingInventory = await buildSalesListingInventory()
    const project = (listingInventory.projectSuggestions || []).find(item => item.key === projectKey)
    if (!project) {
      sendApiError(res, 404, 'project_group_not_found', 'That project suggestion is not in the current GLS opportunity list.')
      return
    }

    const leaderKey = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedLeaderKey')
      ? String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
      : project.assignedLeaderKey || ''
    const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
    if (leaderKey && !leader) {
      sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
      return
    }

    const caseStatus = resolveSalesListingCaseStatus(req.body?.caseStatus || project.caseStatus || 'identified')
    const outcomeStatus = resolveSalesListingOutcomeStatus(req.body?.outcomeStatus || project.outcomeStatus || 'open')
    const actionPlanState = resolveSalesListingActionPlanState(req.body?.actionPlanState || project.actionPlanState || 'unknown')
    const nextCaseStatus = actionPlanState.key === 'yes' && ['identified', 'assigned', 'contacted_agent'].includes(caseStatus.key)
      ? 'action_plan_created'
      : caseStatus.key
    const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
    const staleByTaskId = new Map((listingInventory.staleListings || []).map(item => [item.taskId, item]))
    const updated = []
    for (const member of project.listings || []) {
      const listing = staleByTaskId.get(member.taskId) || member
      updated.push(await upsertSalesListingAssignment({
        clickUpTaskId: member.taskId,
        listingTitle: listing.title || member.title || '',
        listingUrl: listing.url || member.url || '',
        agentName: listing.agent || project.agent || '',
        resetDate: listing.resetDate || null,
        daysSinceReset: listing.daysSinceReset ?? member.daysSinceReset ?? null,
        assignedLeaderKey: leader?.key || '',
        assignedLeaderName: leader?.name || '',
        assignedLeaderEmail: leader?.email || '',
        caseStatus: nextCaseStatus,
        outcomeStatus: outcomeStatus.key,
        actionPlanState: actionPlanState.key,
        actionPlanNoReason: String(req.body?.actionPlanNoReason ?? project.actionPlanNoReason ?? '').trim(),
        actionPlanText: String(req.body?.actionPlanText ?? project.actionPlanText ?? '').trim(),
        metadata: buildSalesHubCaseMetadata({
          source: 'sales-hub-project-case',
          assignmentSurface: '/sales#gls-system',
          projectKey,
          baseAddress: project.baseAddress,
        }, req.body, actor),
      }, actor.email || actor.name || 'sales-hub'))
    }

    clearSalesHubCache()
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      projectKey,
      updatedCount: updated.length,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'sales_project_case_update_failed',
      error instanceof Error ? error.message : 'Failed to update GLS project case.'
    )
  }
})

app.post('/api/sales-hub/listing-case', requireAdminToken, async (req, res) => {
  try {
    const taskId = String(req.body?.taskId || '').trim()
    if (!taskId) {
      sendApiError(res, 400, 'missing_task_id', 'ClickUp task ID is required.')
      return
    }

    const listingInventory = await buildSalesListingInventory()
    const listing = (listingInventory.staleListings || []).find(item => item.taskId === taskId)
    const existingCase = (listingInventory.trackedCases || []).find(item => item.clickUpTaskId === taskId)
    const source = listing || existingCase
    if (!source) {
      sendApiError(res, 404, 'listing_case_not_found', 'That listing case is not tracked yet.')
      return
    }

    const leaderKey = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedLeaderKey')
      ? String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
      : source.assignedLeaderKey || ''
    const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
    if (leaderKey && !leader) {
      sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
      return
    }

    const caseStatus = resolveSalesListingCaseStatus(req.body?.caseStatus || source.caseStatus || 'identified')
    const outcomeStatus = resolveSalesListingOutcomeStatus(req.body?.outcomeStatus || source.outcomeStatus || 'open')
    const actionPlanState = resolveSalesListingActionPlanState(req.body?.actionPlanState || source.actionPlanState || 'unknown')
    const nextCaseStatus = actionPlanState.key === 'yes' && ['identified', 'assigned', 'contacted_agent'].includes(caseStatus.key)
      ? 'action_plan_created'
      : caseStatus.key
    const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
    const assignment = await upsertSalesListingAssignment({
      clickUpTaskId: taskId,
      listingTitle: source.title || source.listingTitle || '',
      listingUrl: source.url || source.listingUrl || '',
      agentName: source.agent || source.agentName || '',
      resetDate: source.resetDate || source.currentResetDate || null,
      daysSinceReset: source.daysSinceReset,
      assignedLeaderKey: leader?.key || '',
      assignedLeaderName: leader?.name || '',
      assignedLeaderEmail: leader?.email || '',
      caseStatus: nextCaseStatus,
      outcomeStatus: outcomeStatus.key,
      actionPlanState: actionPlanState.key,
      actionPlanNoReason: String(req.body?.actionPlanNoReason ?? source.actionPlanNoReason ?? '').trim(),
      actionPlanText: String(req.body?.actionPlanText ?? source.actionPlanText ?? '').trim(),
      metadata: buildSalesHubCaseMetadata({
        source: 'sales-hub-case-update',
        assignmentSurface: '/sales#stale-listings',
      }, req.body, actor),
    }, actor.email || actor.name || 'sales-hub')

    clearSalesHubCache()
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      taskId,
      assignment: sanitizeSalesListingAssignment(assignment),
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'sales_case_update_failed',
      error instanceof Error ? error.message : 'Failed to update Sales Hub listing case.'
    )
  }
})

app.post('/api/sales-hub/sync-cases', requireAdminToken, async (req, res) => {
  try {
    const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
    const listingInventory = await buildSalesListingInventory()
    const sync = await syncSalesListingCasesFromInventory(listingInventory, {
      actor: actor.email || actor.name || 'sales-hub',
    })
    clearSalesHubCache()
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      sync,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'sales_case_sync_failed',
      error instanceof Error ? error.message : 'Failed to sync Sales Hub listing cases.'
    )
  }
})

app.get('/api/ops/agent-feedback-production-dry-run', requireAdminToken, async (req, res) => {
  try {
    const includeCandidates = String(req.query?.includeCandidates || '').toLowerCase() === 'true'
    const report = await buildAgentFeedbackProductionAutoSendDryRunReport({
      includeCandidates,
    })
    cacheHeadersNoStore(res)
    res.json({
      status: 'healthy',
      report,
      summary: report.summary,
      sideEffects: report.sideEffects,
      productionEnablement: report.productionEnablement,
      privacy: report.privacy,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'ops_agent_feedback_production_dry_run_failed',
      error instanceof Error ? error.message : 'Failed to load Ops Agent Feedback production dry-run report.'
    )
  }
})

registerFoundationRuntimeReadRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getFoundationJobRunSnapshot,
  buildRuntimeProcessControlApiSnapshot,
  getLlmRuntimeSnapshot,
  getExtractionControlSnapshot,
})

registerFoundationWriteRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getRequestActor,
  getAllowedBodyKeys,
  requireStringField,
  optionalStringField,
  optionalStringArrayField,
  optionalNumberField,
  validateBacklogPrefix,
  validateCategory,
  backlogScopeKeys,
  createBacklogItem,
  updateBacklogItem,
  createDecision,
  updateDecision,
  createOpenQuestion,
  updateOpenQuestion,
  createPendingDocUpdate,
  approvePendingDocUpdate,
  rejectPendingDocUpdate,
  getPendingDocUpdate,
  markPendingDocUpdateApplied,
  markPendingDocUpdateFailed,
  getFoundationJobRunSnapshot,
  updateFoundationJobControl,
  getFoundationJobRunById,
  getCurrentRepoHeadCommit,
  getDashboardRuntimeMetadata,
  buildStopDecision,
  terminateProcessTree,
  markFoundationJobRunStopped,
  buildRuntimeProcessControlApiSnapshot,
  buildDecommissionDecision,
  resolveRequestedDoc,
  readFileSafe,
  getHeadingSection,
  slugify,
  buildSimpleDiff,
  hashText,
  isDocUpdateAllowlisted,
  toRelativeDocPath,
  getGitStatusForFile,
  getGitStatus,
  runGit,
  replaceHeadingSection,
  restoreTrackedFile,
})

registerStrategySharedCommsRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getRequestActor,
  getAllowedBodyKeys,
  validateCategory,
  optionalStringField,
  optionalStringArrayField,
  getSharedCommunicationArchiveSnapshot,
  getSharedCommunicationCoverageSnapshot,
  getSharedCommunicationCandidateSnapshot,
  getSharedCommunicationSynthesisSnapshot,
  applySharedCommunicationCandidateToBacklog,
  applySharedCommunicationCandidateToDecision,
  applySharedCommunicationCandidateToQuestion,
  updateSharedCommunicationCandidateStatus,
  getStrategyPreworkCoverageSnapshot,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  getActionRouterSnapshot,
  getIntelligenceRetrievalSnapshot,
  saveStrategyHubSnapshot,
  getStrategyHubSnapshot,
  buildStrategyMeetingReadySnapshot,
  isDecisionGradeActionRoute,
  isSynthesisRecordVerified,
  getActionRoute,
  approveActionRoute,
  applyApprovedActionRoute,
  rejectActionRoute,
  rerouteActionRoute,
})

registerFoundationOperatorRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getRecentChangeEvents,
  getRecentBuildLog,
  getFoundationSnapshot,
  getBacklogItemsByIds,
  listPendingDocUpdates,
  buildBacklogHygieneSnapshot,
  getFoundationBuildCloseouts,
  buildFoundationReviewSprintStatus,
  loadFoundationReviewSprintArtifact,
  buildResearchCurationStatus,
  buildFoundationChangeLog,
  buildFoundationDailyExecSummary,
  summarizeFoundationBuildLog,
  groupFoundationBuildLog,
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
  validateFoundationBacklogCardId,
  buildFoundationBacklogDetailPayload,
  readFileSafe,
  repoRoot: __dirname,
})

registerAgentFeedbackRoutes(app, {
  cacheHeadersNoStore,
  sendApiError,
  verifyAgentFeedbackToken,
  getAgentOnboardingFeedbackResponseByTokenHash,
  getAgentOnboardingFeedbackResponseForMilestone,
  upsertAgentOnboardingFeedbackResponse,
  writeAgentFeedbackToClickUp,
  sendAgentFeedbackResponseNotification,
})

app.get('/api/doc', requireAdminToken, async (req, res) => {
  const filePath = resolveRequestedDoc(req.query.path)

  if (!filePath) {
    sendApiError(res, 400, 'invalid_doc_path', 'Invalid doc path.')
    return
  }

  const content = readFileSafe(filePath)

  if (!content) {
    sendApiError(res, 404, 'document_not_found', 'Document not found.')
    return
  }

  try {
    if (path.relative(__dirname, filePath) === 'docs/strategy/bhag-model.md') {
      res.setHeader('Cache-Control', 'no-store')
    }

    const sourceSnapshot = await getDocSourceSnapshot(path.relative(__dirname, filePath))
    const sourceContracts = getSourceContractsByIds(
      Array.from(new Set(sourceSnapshot.map(row => row.sourceId)))
    )
    res.json({
      title: getDocTitle(content, filePath),
      meta: getDocMeta(filePath),
      content,
      sourceSnapshot,
      sourceContracts,
    })
  } catch (error) {
    sendApiError(
      res,
      500,
      'doc_snapshot_load_failed',
      error instanceof Error ? error.message : 'Failed to load document source snapshot.'
    )
  }
})

app.get('/foundation/export/strategy.pdf', requireAdminToken, async (_req, res) => {
  try {
    const businessStrategy = readFileSafe(businessStrategyPath)
    if (!businessStrategy) {
      sendApiError(res, 404, 'strategy_missing', 'Business strategy source file is missing.')
      return
    }

    const packet = {
      meta: getDocMeta(businessStrategyPath),
      sections: parseSections(businessStrategy),
    }

    const pdfBytes = await buildBusinessStrategyPdf(packet)
    cacheHeadersNoStore(res)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=\"benson-crew-business-strategy.pdf\"')
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('Failed to generate business strategy PDF:', error)
    sendApiError(res, 500, 'strategy_pdf_failed', 'Failed to generate the business strategy PDF.')
  }
})

registerAppPageRoutes(app, {
  requirePageAccess,
  sendApiError,
  getRequestAuthUser,
  getLocalDevUser,
  publicDir: path.join(__dirname, 'public'),
})

async function start() {
  assertSessionSecretConfigured()
  assertAgentFeedbackSecretConfigured()
  await captureDashboardRuntimeMetadata()
  await initFoundationDb()

  const server = app.listen(port, host, () => {
    const displayHost = host === '0.0.0.0' ? 'localhost' : host
    console.log(`BCrew AI OS dashboard listening on http://${displayHost}:${port}`)
  })

  let isShuttingDown = false
  const shutdown = async () => {
    if (isShuttingDown) return
    isShuttingDown = true

    try {
      await closeServer(server)
      await closeFoundationDb()
      process.exit(0)
    } catch (error) {
      console.error('Failed to shut down BCrew AI OS dashboard cleanly:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch(error => {
  console.error('Failed to start BCrew AI OS dashboard:', error)
  process.exit(1)
})
