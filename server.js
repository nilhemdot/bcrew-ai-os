import express from 'express'
import { execFile } from 'node:child_process'
import { timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
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
  getBusinessAtomDashboardSnapshot,
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
  listSourceCrawlItems,
  listPendingDocUpdates,
  markPendingDocUpdateApplied,
  markPendingDocUpdateFailed,
  applySharedCommunicationCandidateToBacklog,
  applySharedCommunicationCandidateToDecision,
  applySharedCommunicationCandidateToQuestion,
  rejectPendingDocUpdate,
  recordActionRouteCuration,
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
  buildYoutubeCreatorDailyWatchReadSnapshot,
} from './lib/youtube-creator-daily-watch.js'
import {
  buildMultimodalExtractorContractSnapshot,
} from './lib/multimodal-extractor-contract.js'
import {
  buildExtractionRuntimeReadinessPayload,
} from './lib/extraction-runtime-readiness.js'
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
import { loadSystem004CapabilitiesSurfacePayload } from './lib/system-004-capabilities-surface.js'
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
import { getGoogleSheetsCacheStats } from './lib/google-delegated.js'
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
  buildFoundationBacklogDoneArchivePayload,
  buildFoundationBacklogListPayload,
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
import { registerOwnersGovernanceRoutes } from './lib/owners-governance-routes.js'
import { getSalesHubPayload, registerSalesHubRoutes } from './lib/sales-hub-routes.js'
import {
  buildFubLeadSourcePayload,
  buildSourceWatchFreshness,
  syncFubLeadSourceDriftEvent,
} from './lib/fub-lead-source-governance.js'
import { createServerDocumentStrategySurface } from './lib/server-document-strategy-surface.js'
import { buildDocArtifactBloatSnapshot } from './lib/doc-artifact-bloat-guard.js'
import { callEmbedding } from './lib/llm-router.js'
import { assertAgentFeedbackSecretConfigured, verifyAgentFeedbackToken } from './lib/agent-feedback.js'
import { writeAgentFeedbackToClickUp } from './lib/agent-feedback-clickup.js'
import { buildAgentFeedbackAutoSendReadiness } from './lib/agent-feedback-auto-send.js'
import { buildAgentFeedbackProductionAutoSendDryRunReport } from './lib/agent-feedback-production-autosend-dry-run.js'
import { sendAgentFeedbackResponseNotification } from './lib/agent-feedback-response-notify.js'
import { buildAgentFeedbackReminderReadiness } from './lib/agent-feedback-reminders.js'
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
const {
  isAllowedDocPath,
  resolveRequestedDoc,
  readFileSafe,
  getDocMeta,
  parseSections,
  slugify,
  buildBusinessStrategyPdf,
  getHeadingSection,
  replaceHeadingSection,
  buildSimpleDiff,
  hashText,
  runGit,
  getGitStatusForFile,
  getGitStatus,
  restoreTrackedFile,
  toRelativeDocPath,
  getDocTitle,
  getDocSurfaceMeta,
} = createServerDocumentStrategySurface({
  repoRoot,
  runtimeDir: __dirname,
  privateLocalMarkdownMeta,
  stratumBoldPath,
})
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
const FUB_LEAD_SOURCE_REFRESH_PAGE_LIMIT = 100
const FUB_LEAD_SOURCE_REFRESH_MAX_PAGES = Math.min(
  5000,
  Math.max(1, Number(process.env.FUB_LEAD_SOURCE_REFRESH_MAX_PAGES) || 1000)
)

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
  listFoundationUsers,
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

function getRequestActor(req) {
  const user = req ? getRequestAuthUser(req) || getLocalDevUser(req) : null
  if (user?.email) return user.email
  if (req && tokensMatch(req.get('X-Admin-Token') || '', adminToken)) return 'admin-token'
  return 'system'
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
  const boundedLimit = Math.min(1000, Math.max(1, Number(limit) || 30))
  const { stdout } = await execFileAsync('git', [
    'log',
    `--max-count=${boundedLimit}`,
    '--date=iso-strict',
    '--name-only',
    '--pretty=format:@@BUILD@@%H%x1f%h%x1f%ad%x1f%s',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 2,
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
  getExtractionControlSnapshot,
  listFoundationFeedbackItems,
  listFoundationAcknowledgedStates,
  listSourceCrawlItems,
  searchSharedCommunicationArtifactsForContext,
  getFoundationBuildCloseouts,
  getSourceContracts,
  buildCreatorWatchlistSnapshot,
  buildYoutubeCreatorDailyWatchReadSnapshot,
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

registerOwnersGovernanceRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
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
    const capabilitySurface = await loadSystem004CapabilitiesSurfacePayload({
      repoRoot: __dirname,
      runtimeInventory: { skills, plugins, identity },
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
      capabilitySurface,
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

registerSalesHubRoutes(app, {
  requireAdminToken,
  sendApiError,
  cacheHeadersNoStore,
  getRequestAuthUser,
  getLocalDevUser,
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
  buildExtractionRuntimeReadinessPayload,
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
  getFoundationSnapshot,
  getActionRouterSnapshot,
  getIntelligenceRetrievalSnapshot,
  getBusinessAtomDashboardSnapshot,
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
  recordActionRouteCuration,
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
  buildFoundationBacklogDoneArchivePayload,
  buildFoundationBacklogListPayload,
  getActiveFoundationCurrentSprint,
  buildFoundationCurrentSprintStatus,
  buildFoundationOperatingReliabilitySnapshot,
  loadLatestFoundationEndpointBudgetSnapshot,
  buildDocArtifactBloatSnapshot,
  getSourceContracts,
  getSourceConnectors,
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
