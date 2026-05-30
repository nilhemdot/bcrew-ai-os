import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  GEMINI_WORKSPACE_ROUTE_KEY,
  GEMINI_WORKSPACE_SOURCE,
  readKeychainPassword,
} from './credential-vault.js'

export const GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID = 'GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001'
export const GEMINI_WORKSPACE_EYES_ROUTE_KEY = GEMINI_WORKSPACE_ROUTE_KEY
export const GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY = 'gemini-workspace-eyes-route-proof-v1'
export const GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID = 'proof:gemini-workspace-eyes-route-proof-001'
export const GEMINI_WORKSPACE_EYES_ROUTE_PLAN_PATH = 'docs/process/gemini-workspace-eyes-route-proof-001-plan.md'
export const GEMINI_WORKSPACE_EYES_ROUTE_APPROVAL_PATH = 'docs/process/approvals/GEMINI-WORKSPACE-EYES-ROUTE-PROOF-001.json'
export const GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-23-gemini-workspace-eyes-route-proof-closeout.md'
export const GEMINI_WORKSPACE_EYES_ROUTE_SCRIPT_PATH = 'scripts/process-gemini-workspace-eyes-route-proof-check.mjs'
export const GEMINI_WORKSPACE_EYES_ROUTE_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
export const GEMINI_WORKSPACE_EYES_ROUTE_NEXT_CARD_ID = 'MARK-KASHEF-LAST-50-BASELINE-001'
export const GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const GEMINI_WORKSPACE_EYES_ROUTE_TRANSCRIPT_ARTIFACT_ID = 'SRC-YOUTUBE-INTEL-001:video_transcript:5xrjO38WUYY'
export const GEMINI_WORKSPACE_EYES_ROUTE_API_BASELINE_REPORT_ARTIFACT_ID = 'proof:god-mode-extractor-eyes-quality-loop-001'
export const GEMINI_WORKSPACE_EYES_PROFILE_DIR = path.join(os.homedir(), 'Library/Application Support/Chrome-Isolated/ai-bensoncrew-clean')
export const GEMINI_WORKSPACE_EYES_TARGET_VIDEO = {
  videoId: '5xrjO38WUYY',
  url: 'https://www.youtube.com/watch?v=5xrjO38WUYY',
  creator: 'Mark Kashef',
  title: 'How to Use /goal to Build a Self-Improving OS',
}
export const GEMINI_WORKSPACE_EYES_ROUTE_NOT_NEXT = [
  'Do not run Mark last-50 until this card is closed and the overnight guard remains green.',
  'Do not claim the browser subscription route is production-stable; classify it as experimental until a 3-video pilot passes.',
  'Do not remove the Gemini API fallback from extractor eyes.',
  'Do not automate Steve normal Chrome profile; use only the isolated AI browser profile.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, Loom, paid/private/auth/member/community/comment/course sources from this card.',
  'Do not purchase, download, opt in, book, submit forms, send messages, create backlog cards automatically, or write externally.',
  'Do not mutate credentials, browser profiles, provider config, source systems, or Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this Gemini Workspace eyes proof lane.',
]
export const GEMINI_WORKSPACE_EYES_ROUTE_PROOF_COMMANDS = [
  'node --check lib/credential-vault.js',
  'node --check lib/gemini-workspace-eyes-route-proof.js',
  'node --check scripts/credentials-vault.mjs',
  'node --check scripts/process-credential-vault-session-broker-check.mjs',
  'node --check scripts/process-gemini-workspace-eyes-route-proof-check.mjs',
  'npm run process:credential-vault-session-broker-check -- --verify-db --require-gemini-keychain --json',
  'npm run process:gemini-workspace-eyes-route-proof-check -- --live-browser --use-keychain-login --submit-live-prompt --close-card --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
]
export const GEMINI_WORKSPACE_EYES_ROUTE_CHANGED_FILES = [
  'lib/credential-vault.js',
  'lib/gemini-workspace-eyes-route-proof.js',
  'scripts/credentials-vault.mjs',
  'scripts/process-credential-vault-session-broker-check.mjs',
  GEMINI_WORKSPACE_EYES_ROUTE_SCRIPT_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_PLAN_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_APPROVAL_PATH,
  GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableTextHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function atomInput({
  atomId,
  title,
  content,
  atomType = 'proof_point',
  suggestedAction = '',
  metadata = {},
}) {
  return {
    atomId,
    title,
    content,
    atomType,
    sourceId: GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID,
    artifactId: GEMINI_WORKSPACE_EYES_ROUTE_TRANSCRIPT_ARTIFACT_ID,
    reportArtifactId: GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID,
    modality: 'mixed',
    anchorType: 'youtube_video',
    anchorValue: GEMINI_WORKSPACE_EYES_TARGET_VIDEO.videoId,
    evidenceExcerpt: content.slice(0, 500),
    derivedClaim: content,
    topicRefs: ['god-mode-extractor', 'gemini-workspace', 'subscription-brain', 'build-intel'],
    department: 'foundation',
    pillar: 'build-intel',
    valueRoute: 'dev_team_intelligence',
    contentUseClass: 'internal_build_intel',
    qualityScore: 4,
    relevanceScore: 4,
    sourceConfidence: 0.95,
    extractionConfidence: 0.8,
    sensitivity: 'neutral',
    minTier: 1,
    freshness: 'structural',
    status: 'detected',
    suggestedOwner: 'Foundation Extraction',
    suggestedAction,
    dedupHash: stableTextHash(`${GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY}:${atomId}:${content}`),
    metadata: {
      cardId: GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID,
      closeoutKey: GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY,
      proposalOnly: true,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      ...metadata,
    },
    filedBy: 'gemini-workspace-eyes-route-proof',
  }
}

export function buildGeminiWorkspaceEyesRouteSnapshot({
  generatedAt = new Date().toISOString(),
  liveBrowserProof = null,
  apiBaselineReport = null,
  currentSprint = null,
} = {}) {
  const output = liveBrowserProof?.output || null
  const visualEvidence = list(output?.visualEvidence)
  const buildCandidates = list(output?.buildCandidates)
  const routeWorks = liveBrowserProof?.usedGeminiApi === false &&
    liveBrowserProof?.profileDir === GEMINI_WORKSPACE_EYES_PROFILE_DIR &&
    liveBrowserProof?.submittedPrompt === true &&
    liveBrowserProof?.routeOutcome === 'works' &&
    visualEvidence.length > 0 &&
    buildCandidates.length > 0
  const routePolicy = {
    preferredEyesRoute: routeWorks ? GEMINI_WORKSPACE_EYES_ROUTE_KEY : 'foundation-video-gemini-api',
    fallbackEyesRoute: 'foundation-video-gemini-api',
    subscriptionRouteLevel: routeWorks ? 'level_1_experimental' : 'blocked_or_unproven',
    nextScaleStep: routeWorks ? 'Run a guarded 3-video subscription-eyes pilot before any Mark last-50 scale-up.' : 'Keep Gemini API eyes and open a repair/fallback card before scale-up.',
    costPosture: routeWorks ? 'no_separate_api_bill_for_this_browser_prompt' : 'fallback_api_cost_applies_if_used',
    stabilityPosture: routeWorks ? 'browser_fragile_experimental' : 'not_ready',
  }
  const checks = [
    {
      ok: Boolean(liveBrowserProof),
      check: 'live browser proof exists',
      detail: liveBrowserProof?.routeOutcome || 'missing',
    },
    {
      ok: liveBrowserProof?.usedGeminiApi === false,
      check: 'proof used no Gemini API key',
      detail: liveBrowserProof?.routeKey || 'missing',
    },
    {
      ok: liveBrowserProof?.profileDir === GEMINI_WORKSPACE_EYES_PROFILE_DIR,
      check: 'proof used isolated AI Chrome profile',
      detail: liveBrowserProof?.profileDir || 'missing',
    },
    {
      ok: liveBrowserProof?.submittedPrompt === true,
      check: 'proof submitted one bounded prompt',
      detail: liveBrowserProof?.routeOutcome || 'missing',
    },
    {
      ok: routeWorks,
      check: 'Gemini Workspace subscription route returned structured eyes output',
      detail: `${visualEvidence.length} visual / ${buildCandidates.length} candidates`,
    },
    {
      ok: apiBaselineReport?.reportArtifactId === GEMINI_WORKSPACE_EYES_ROUTE_API_BASELINE_REPORT_ARTIFACT_ID ||
        apiBaselineReport?.report_artifact_id === GEMINI_WORKSPACE_EYES_ROUTE_API_BASELINE_REPORT_ARTIFACT_ID,
      check: 'Gemini API eyes baseline is linked for fallback comparison',
      detail: apiBaselineReport?.reportArtifactId || apiBaselineReport?.report_artifact_id || 'missing',
    },
    {
      ok: currentSprint?.sprint?.sprintId === GEMINI_WORKSPACE_EYES_ROUTE_SPRINT_ID,
      check: 'YouTube to Dev Team sprint remains active',
      detail: currentSprint?.sprint?.sprintId || 'missing',
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    generatedAt,
    cardId: GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID,
    closeoutKey: GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY,
    reportArtifactId: GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID,
    routeKey: GEMINI_WORKSPACE_EYES_ROUTE_KEY,
    account: liveBrowserProof?.account || DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
    video: GEMINI_WORKSPACE_EYES_TARGET_VIDEO,
    sourceIds: [GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID],
    apiBaselineReportArtifactId: GEMINI_WORKSPACE_EYES_ROUTE_API_BASELINE_REPORT_ARTIFACT_ID,
    routePolicy,
    liveBrowserProof: liveBrowserProof ? {
      routeKey: liveBrowserProof.routeKey,
      usedGeminiApi: liveBrowserProof.usedGeminiApi,
      profileDir: liveBrowserProof.profileDir,
      account: liveBrowserProof.account,
      sessionStatus: liveBrowserProof.sessionStatus,
      routeOutcome: liveBrowserProof.routeOutcome,
      promptBoxVisible: liveBrowserProof.promptBoxVisible,
      accountMenuVisible: liveBrowserProof.accountMenuVisible,
      submittedPrompt: liveBrowserProof.submittedPrompt,
      outputParsed: liveBrowserProof.outputParsed,
      outputHash: liveBrowserProof.outputHash,
      screenshotArtifact: liveBrowserProof.screenshotArtifact,
      responseScreenshotArtifact: liveBrowserProof.responseScreenshotArtifact,
      keychainLoginRequested: liveBrowserProof.keychainLoginRequested,
      loginAttemptStatus: liveBrowserProof.loginAttempt?.status || null,
    } : null,
    output: output ? {
      videoId: output.videoId,
      summary: output.summary,
      visualEvidence,
      workflowMoments: list(output.workflowMoments),
      buildCandidates,
      missedByTranscriptOnly: list(output.missedByTranscriptOnly),
      riskBoundaries: list(output.riskBoundaries),
    } : null,
    summary: {
      visualEvidence: visualEvidence.length,
      workflowMoments: list(output?.workflowMoments).length,
      buildCandidates: buildCandidates.length,
      missedByTranscriptOnly: list(output?.missedByTranscriptOnly).length,
      riskBoundaries: list(output?.riskBoundaries).length,
    },
    checks,
    failures,
  }
}

export function buildGeminiWorkspaceEyesRouteWriteSet(snapshot = {}) {
  const output = snapshot.output || {}
  const visualEvidence = list(output.visualEvidence)
  const buildCandidates = list(output.buildCandidates)
  const atomInputs = [
    atomInput({
      atomId: 'atom:gemini-workspace-eyes-route-proof-001:subscription-eyes-works',
      title: 'Gemini subscription browser route can serve as extractor eyes experimentally',
      content: 'The logged-in Gemini Workspace/App browser route returned structured visual evidence and build candidates for the approved Mark Kashef public video without using the Gemini API key.',
      suggestedAction: 'Use the Gemini Workspace browser route as Level 1 experimental eyes for the next small pilot.',
      metadata: {
        routeKey: snapshot.routeKey,
        subscriptionRouteLevel: snapshot.routePolicy?.subscriptionRouteLevel,
        outputHash: snapshot.liveBrowserProof?.outputHash,
      },
    }),
    atomInput({
      atomId: 'atom:gemini-workspace-eyes-route-proof-001:api-fallback-required',
      title: 'Gemini API remains the reliable fallback for extractor eyes',
      atomType: 'workflow',
      content: 'The subscription browser route works, but it is browser-fragile and should not remove the Gemini API fallback from God Mode extractor eyes.',
      suggestedAction: 'Route extractor eyes through subscription first, then fall back to Gemini API on auth, quota, browser, parse, or quality failure.',
      metadata: {
        fallbackEyesRoute: snapshot.routePolicy?.fallbackEyesRoute,
        stabilityPosture: snapshot.routePolicy?.stabilityPosture,
      },
    }),
    atomInput({
      atomId: 'atom:gemini-workspace-eyes-route-proof-001:three-video-pilot-before-last50',
      title: 'Run a guarded 3-video subscription-eyes pilot before Mark last-50',
      atomType: 'action_candidate',
      content: 'The one-video subscription proof passed, but Mark last-50 should wait until the same route proves stability and output quality on three approved public videos under the overnight guard.',
      suggestedAction: 'Start MARK-KASHEF-LAST-50-BASELINE-001 with a 3-video pilot before any 50-video baseline.',
      metadata: {
        nextCardId: GEMINI_WORKSPACE_EYES_ROUTE_NEXT_CARD_ID,
        guardRequired: true,
      },
    }),
    ...buildCandidates.slice(0, 3).map((candidate, index) => atomInput({
      atomId: `atom:gemini-workspace-eyes-route-proof-001:candidate-${index + 1}`,
      title: candidate.title || `Gemini Workspace build candidate ${index + 1}`,
      atomType: 'action_candidate',
      content: `${candidate.whyItMatters || 'Subscription-eyes candidate.'} Recommended next step: ${candidate.recommendedNextStep || 'Review before promotion.'}`,
      suggestedAction: candidate.recommendedNextStep || 'Review before promotion.',
      metadata: {
        confidence: candidate.confidence || 'unknown',
        evidenceTimestamps: list(candidate.evidenceTimestamps),
      },
    })),
  ]
  const hitInputs = atomInputs.map((atom, index) => ({
    hitId: `hit:gemini-workspace-eyes-route-proof-001:${index + 1}`,
    atomId: atom.atomId,
    sourceId: GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID,
    artifactId: GEMINI_WORKSPACE_EYES_ROUTE_TRANSCRIPT_ARTIFACT_ID,
    reportArtifactId: GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID,
    hitType: 'supporting_evidence',
    evidenceRef: `${GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID}#${atom.atomId}`,
    evidenceExcerpt: atom.evidenceExcerpt,
    confidence: 0.9,
    metadata: {
      cardId: GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID,
      closeoutKey: GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY,
      routeKey: snapshot.routeKey,
      outputHash: snapshot.liveBrowserProof?.outputHash,
    },
  }))
  return {
    reportArtifact: {
      reportArtifactId: GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID,
      reportType: 'proof',
      scopeKey: 'youtube-to-dev-team-intelligence',
      department: 'foundation',
      title: 'Gemini Workspace Subscription Eyes Route Proof',
      status: snapshot.ok ? 'generated' : 'failed',
      sourceIds: snapshot.sourceIds || [GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID],
      inputArtifactIds: [
        GEMINI_WORKSPACE_EYES_ROUTE_TRANSCRIPT_ARTIFACT_ID,
        GEMINI_WORKSPACE_EYES_ROUTE_API_BASELINE_REPORT_ARTIFACT_ID,
      ],
      sourceCoverage: [
        {
          sourceId: GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID,
          status: 'covered',
          exactItem: GEMINI_WORKSPACE_EYES_TARGET_VIDEO.url,
        },
      ],
      topFindings: [
        {
          finding: 'The logged-in Gemini Workspace/App browser route worked on the exact approved Mark public video.',
          evidence: {
            routeKey: snapshot.routeKey,
            outputHash: snapshot.liveBrowserProof?.outputHash,
            usedGeminiApi: snapshot.liveBrowserProof?.usedGeminiApi,
          },
        },
        {
          finding: 'The route should be Level 1 experimental, with Gemini API as fallback.',
          evidence: snapshot.routePolicy,
        },
      ],
      actionRequiredItems: [
        {
          actionRequiredId: 'approval:gemini-workspace-eyes-route-proof:three-video-pilot',
          title: 'Run three-video subscription-eyes pilot before Mark last-50',
          reason: 'One-video proof passed, but broad extraction should wait for a small guarded stability/quality pilot.',
          approvedInThisCard: false,
          allowedDecisions: ['approve_three_video_pilot', 'use_api_fallback_only', 'request_more_evidence'],
        },
      ],
      openQuestions: [],
      structuredOutputJson: {
        snapshot,
        routePolicy: snapshot.routePolicy,
        visualEvidence,
        workflowMoments: list(output.workflowMoments),
        buildCandidates,
        reviewRoutes: buildCandidates.map((candidate, index) => ({
          reviewRouteId: `build-intel-review:gemini-workspace-eyes:${index + 1}`,
          sourceId: GEMINI_WORKSPACE_EYES_ROUTE_SOURCE_ID,
          sourceUrl: GEMINI_WORKSPACE_EYES_TARGET_VIDEO.url,
          recommendation: candidate.recommendedNextStep || 'Review before promotion.',
          routingReason: candidate.whyItMatters || '',
          proposalOnly: true,
          writesBacklog: false,
          externalWrites: false,
          requiresSteveReview: true,
          allowedDecisions: ['promote_to_backlog', 'attach_to_existing_card', 'reject', 'needs_more_evidence'],
        })),
        noAutoBacklogPromotion: true,
      },
      metadata: {
        cardId: GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID,
        closeoutKey: GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY,
        routeKey: snapshot.routeKey,
        preferredEyesRoute: snapshot.routePolicy?.preferredEyesRoute,
        fallbackEyesRoute: snapshot.routePolicy?.fallbackEyesRoute,
        subscriptionRouteLevel: snapshot.routePolicy?.subscriptionRouteLevel,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
        privateOrPaidAccess: false,
        credentialMutation: false,
      },
    },
    atomInputs,
    hitInputs,
  }
}

export function verifyGeminiWorkspaceEyesRoutePersistedProof({
  snapshot = {},
  report = null,
  atoms = [],
  hits = [],
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const outputJson = report?.structuredOutputJson || report?.structured_output_json || {}
  add(report?.reportArtifactId === GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID || report?.report_artifact_id === GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID, 'report artifact persisted', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  add(outputJson?.snapshot?.status === snapshot.status, 'report snapshot status matches', outputJson?.snapshot?.status || 'missing')
  add(outputJson?.routePolicy?.preferredEyesRoute === GEMINI_WORKSPACE_EYES_ROUTE_KEY, 'route policy prefers Gemini Workspace eyes', outputJson?.routePolicy?.preferredEyesRoute || 'missing')
  add(outputJson?.routePolicy?.fallbackEyesRoute === 'foundation-video-gemini-api', 'route policy keeps Gemini API fallback', outputJson?.routePolicy?.fallbackEyesRoute || 'missing')
  add(list(atoms).length >= 3, 'Gemini Workspace proof atoms persisted', `${list(atoms).length}`)
  add(list(hits).length >= 3 && list(hits).length === list(atoms).length, 'Gemini Workspace evidence hits persisted for atoms', `${list(hits).length}/${list(atoms).length}`)
  add(list(atoms).some(atom => (atom.atomId || atom.atom_id) === 'atom:gemini-workspace-eyes-route-proof-001:api-fallback-required'), 'API fallback boundary atom persisted', 'fallback atom')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, checks, failed }
}

export function renderGeminiWorkspaceEyesRouteCloseout(snapshot = {}) {
  return `# Gemini Workspace Eyes Route Proof Closeout

Date: ${snapshot.generatedAt}
Card: ${GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID}
Closeout key: ${GEMINI_WORKSPACE_EYES_ROUTE_CLOSEOUT_KEY}
Status: ${snapshot.status}

## What Shipped

- Proved the logged-in Gemini Workspace/App browser route can serve as God Mode Extractor eyes for one exact approved public video.
- Used the isolated AI Chrome profile only: ${GEMINI_WORKSPACE_EYES_PROFILE_DIR}.
- Used no Gemini API key for the live browser prompt.
- Stored only Keychain secret refs and metadata; no raw password is in repo, DB report output, or proof output.
- Persisted report ${GEMINI_WORKSPACE_EYES_ROUTE_REPORT_ARTIFACT_ID}, proposal-only atoms, and evidence hits.
- Classified the route as Level 1 experimental with Gemini API as fallback.

## Result

- Preferred eyes route: ${snapshot.routePolicy?.preferredEyesRoute || 'missing'}
- Fallback eyes route: ${snapshot.routePolicy?.fallbackEyesRoute || 'missing'}
- Subscription route level: ${snapshot.routePolicy?.subscriptionRouteLevel || 'missing'}
- Visual evidence items: ${snapshot.summary?.visualEvidence || 0}
- Workflow moments: ${snapshot.summary?.workflowMoments || 0}
- Build candidates: ${snapshot.summary?.buildCandidates || 0}
- Output hash: ${snapshot.liveBrowserProof?.outputHash || 'missing'}

## Boundaries

${GEMINI_WORKSPACE_EYES_ROUTE_NOT_NEXT.map(item => `- ${item}`).join('\n')}

## Next

Continue ${GEMINI_WORKSPACE_EYES_ROUTE_NEXT_CARD_ID}, but start it with a guarded 3-video subscription-eyes pilot before any Mark last-50 scale-up. If the browser route fails auth, quota, parsing, or quality, fall back to Gemini API eyes.
`
}

async function fileDigest(filePath) {
  const buffer = await fs.readFile(filePath)
  return {
    path: filePath,
    bytes: buffer.byteLength,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  }
}

function parseJsonObject(value = '') {
  const source = String(value || '')
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const balanced = []
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let index = start; index < source.length; index += 1) {
      const char = source[index]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }
      if (char === '"') {
        inString = true
        continue
      }
      if (char === '{') depth += 1
      if (char === '}') depth -= 1
      if (depth === 0) {
        balanced.push(source.slice(start, index + 1))
        break
      }
    }
  }
  const candidates = [
    fenced?.[1],
    ...balanced.reverse(),
    source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1),
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && (
        parsed.videoId ||
        Array.isArray(parsed.visualEvidence) ||
        Array.isArray(parsed.buildCandidates)
      )) return parsed
    } catch {
      // Try the next shape.
    }
  }
  return null
}

function classifySession(data = {}) {
  if (data.visibleSignInCount > 0 && !data.accountMenuVisible) return 'login_required'
  if (!data.promptBoxVisible) return 'prompt_not_found'
  if (data.accountMenuVisible || data.visibleSignInCount === 0) return 'session_ready'
  return 'session_ambiguous'
}

function classifySubmittedOutput(parsed = null, bodyText = '') {
  if (!parsed) return 'fragile_unstructured_output'
  const visualEvidence = list(parsed.visualEvidence)
  const buildCandidates = list(parsed.buildCandidates)
  if (visualEvidence.length > 0 && buildCandidates.length > 0) return 'works'
  if (/cannot|unable|can't|no access|i don.t have/i.test(bodyText)) return 'blocked_by_gemini_capability'
  return 'fragile_partial_output'
}

export function buildGeminiWorkspaceEyesPrompt({
  video = GEMINI_WORKSPACE_EYES_TARGET_VIDEO,
  apiBaseline = null,
  focusInstruction = '',
} = {}) {
  const baselineSummary = apiBaseline?.summary || apiBaseline?.structuredOutputJson?.snapshot?.summary || {}
  return [
    'You are testing BCrew AI OS God Mode Extractor EYES through the logged-in Gemini browser app.',
    'Do not browse private/auth sources. Do not click purchases, downloads, opt-ins, forms, or external links.',
    'Use only this approved public YouTube video as evidence:',
    `${video.title} by ${video.creator}`,
    video.url,
    text(focusInstruction),
    '',
    'Return ONLY valid JSON with this shape:',
    '{',
    `  "videoId": ${JSON.stringify(video.videoId)},`,
    '  "summary": "short useful summary",',
    '  "visualEvidence": [{ "timestamp": "mm:ss or unknown", "visibleTextOrCode": "", "toolOrSurface": "", "workflowObservation": "", "buildIntelValue": "" }],',
    '  "workflowMoments": [{ "timestamp": "mm:ss or unknown", "moment": "", "transferToAios": "" }],',
    '  "buildCandidates": [{ "title": "", "whyItMatters": "", "recommendedNextStep": "", "evidenceTimestamps": [], "confidence": "low|medium|high" }],',
    '  "missedByTranscriptOnly": [],',
    '  "riskBoundaries": []',
    '}',
    '',
    `API baseline for comparison: ${JSON.stringify(baselineSummary).slice(0, 900)}`,
  ].join('\n')
}

async function inspectGeminiPage(page) {
  return page.evaluate(() => {
    const norm = value => String(value || '').trim().replace(/\s+/g, ' ')
    const visible = element => Boolean(element?.getClientRects?.().length)
    const bodyText = norm(document.body?.innerText || '')
    const promptCandidates = Array.from(document.querySelectorAll([
      'textarea',
      'div[contenteditable="true"]',
      '[aria-label*="prompt" i]',
      '[aria-label*="message" i]',
      'rich-textarea',
    ].join(','))).map(element => ({
      tag: element.tagName,
      aria: element.getAttribute('aria-label') || '',
      role: element.getAttribute('role') || '',
      text: norm(element.textContent || ''),
      visible: visible(element),
    }))
    const signInElements = Array.from(document.querySelectorAll('a,button')).filter(element => {
      const label = norm(element.textContent || element.getAttribute('aria-label') || '')
      return visible(element) && /^sign in$/i.test(label)
    })
    const accountMenuVisible = Array.from(document.querySelectorAll([
      '[aria-label*="Google Account" i]',
      '[aria-label*="Account" i]',
      'a[href*="SignOutOptions"]',
      'button img[src*="googleusercontent"]',
    ].join(','))).some(visible)
    const promptBoxVisible = promptCandidates.some(item => item.visible && (
      /prompt|message/i.test(item.aria) ||
      item.role === 'textbox' ||
      item.tag === 'TEXTAREA' ||
      item.tag === 'RICH-TEXTAREA'
    ))
    return {
      title: document.title || '',
      href: location.href,
      bodyText,
      bodyExcerpt: bodyText.slice(0, 1600),
      promptBoxVisible,
      promptCandidates: promptCandidates.filter(item => item.visible).slice(0, 10),
      visibleSignInCount: signInElements.length,
      accountMenuVisible,
    }
  })
}

async function fillPrompt(page, prompt) {
  const promptBox = page.locator('div[contenteditable="true"][aria-label*="prompt" i]').first()
  if (await promptBox.count()) {
    await promptBox.click({ timeout: 10000 })
    await page.keyboard.insertText(prompt)
    return true
  }
  const textarea = page.locator('textarea').first()
  if (await textarea.count()) {
    await textarea.fill(prompt, { timeout: 10000 })
    return true
  }
  return false
}

async function submitPrompt(page) {
  const send = page.locator('[aria-label*="Send" i]').first()
  if (await send.count()) {
    await send.click({ timeout: 10000 })
    return true
  }
  await page.keyboard.press('Enter')
  return true
}

async function enterGeminiAppIfLanding(page) {
  const chatButton = page.locator('a:has-text("Chat with Gemini"), button:has-text("Chat with Gemini")').first()
  if (await chatButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await chatButton.click({ timeout: 10000 })
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }
}

async function clickFirstVisible(locator) {
  const count = await locator.count().catch(() => 0)
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: 10000 })
      return true
    }
  }
  return false
}

async function clickGoogleNext(page) {
  const nextButton = page.locator('button:has-text("Next"), div[role="button"]:has-text("Next")')
  if (await clickFirstVisible(nextButton)) return true
  await page.keyboard.press('Enter')
  return true
}

async function attemptGeminiKeychainLogin(page, {
  account = DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
} = {}) {
  const result = {
    attempted: true,
    account,
    status: 'started',
    rawPasswordExposed: false,
    challengeDetected: false,
  }
  let password = ''
  try {
    password = await readKeychainPassword({
      source: GEMINI_WORKSPACE_SOURCE,
      account,
    })
  } catch {
    return {
      ...result,
      status: 'keychain_missing',
    }
  }
  if (!password) {
    return {
      ...result,
      status: 'keychain_empty',
    }
  }

  const signInClicked = await clickFirstVisible(page.locator('a:has-text("Sign in"), button:has-text("Sign in")')).catch(() => false)
  if (!signInClicked && !/accounts\.google\.com/i.test(page.url())) {
    await page.goto('https://accounts.google.com/ServiceLogin?passive=1209600&continue=https%3A%2F%2Fgemini.google.com%2Fapp&followup=https%3A%2F%2Fgemini.google.com%2Fapp&ec=GAZAkgU', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    }).catch(() => null)
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1000)

  const accountPicker = page.getByText(account, { exact: false }).first()
  if (await accountPicker.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accountPicker.click({ timeout: 10000 }).catch(() => null)
  } else {
    const emailInput = page.locator([
      'input#identifierId',
      'input[name="identifier"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
    ].join(',')).first()
    const emailVisible = await emailInput.waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    if (emailVisible) {
      await emailInput.fill(account, { timeout: 10000 })
      await clickGoogleNext(page)
    }
  }

  const passwordInput = page.locator([
    'input[name="Passwd"]',
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[aria-label*="password" i]',
  ].join(',')).first()
  const passwordVisible = await passwordInput.waitFor({ state: 'visible', timeout: 30000 })
    .then(() => true)
    .catch(() => false)
  if (!passwordVisible) {
    const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
    return {
      ...result,
      status: /2-Step|verify|challenge|passkey|security/i.test(text) ? 'challenge_before_password' : 'password_field_missing',
      challengeDetected: /2-Step|verify|challenge|passkey|security/i.test(text),
    }
  }

  await passwordInput.fill(password, { timeout: 10000 })
  password = ''
  await clickGoogleNext(page)
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(8000)

  const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
  if (/2-Step|verify|challenge|passkey|security code|Try another way/i.test(bodyText)) {
    return {
      ...result,
      status: 'challenge_required',
      challengeDetected: true,
    }
  }
  await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null)
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await enterGeminiAppIfLanding(page)
  const sessionData = await inspectGeminiPage(page)
  const sessionStatus = classifySession(sessionData)
  return {
    ...result,
    status: sessionStatus === 'session_ready' ? 'session_ready' : 'login_not_ready',
    sessionStatus,
  }
}

export async function runGeminiWorkspaceEyesBrowserProof({
  submit = false,
  headless = true,
  useKeychainLogin = false,
  account = DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  profileDir = GEMINI_WORKSPACE_EYES_PROFILE_DIR,
  video = GEMINI_WORKSPACE_EYES_TARGET_VIDEO,
  apiBaseline = null,
  focusInstruction = '',
  screenshotRoot = path.join(os.tmpdir(), 'bcrew-gemini-workspace-eyes-route-proof'),
  now = new Date().toISOString(),
} = {}) {
  const { chromium } = await import('playwright')
  const timestamp = now.replace(/[:.]/g, '-')
  const proofDir = path.join(screenshotRoot, timestamp)
  await fs.mkdir(proofDir, { recursive: true })

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1280, height: 900 },
    args: [
      '--disable-background-networking',
      '--disable-default-apps',
      '--no-first-run',
    ],
  })
  const page = context.pages()[0] || await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  try {
    const response = await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2500)
    await enterGeminiAppIfLanding(page)

    let sessionData = await inspectGeminiPage(page)
    let sessionStatus = classifySession(sessionData)
    let loginAttempt = null
    if (sessionStatus === 'login_required' && useKeychainLogin) {
      loginAttempt = await attemptGeminiKeychainLogin(page, { account })
      sessionData = await inspectGeminiPage(page)
      sessionStatus = classifySession(sessionData)
    }
    const screenshotPath = path.join(proofDir, `${video.videoId}-gemini-session.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => null)
    const screenshotArtifact = await fileDigest(screenshotPath).catch(() => null)

    const base = {
      ok: false,
      cardId: GEMINI_WORKSPACE_EYES_ROUTE_CARD_ID,
      routeKey: GEMINI_WORKSPACE_EYES_ROUTE_KEY,
      usedGeminiApi: false,
      profileDir,
      account,
      video,
      responseStatus: response?.status() || 0,
      finalUrl: page.url(),
      title: sessionData.title,
      sessionStatus,
      routeOutcome: sessionStatus === 'session_ready' ? 'session_ready' : sessionStatus,
      promptBoxVisible: sessionData.promptBoxVisible,
      accountMenuVisible: sessionData.accountMenuVisible,
      visibleSignInCount: sessionData.visibleSignInCount,
      consoleErrorCount: consoleErrors.length,
      bodyExcerpt: sessionData.bodyExcerpt,
      promptCandidates: sessionData.promptCandidates,
      screenshotArtifact,
      submittedPrompt: false,
      keychainLoginRequested: useKeychainLogin,
      loginAttempt,
    }

    if (sessionStatus !== 'session_ready') return base
    if (!submit) return { ...base, ok: true }

    const prompt = buildGeminiWorkspaceEyesPrompt({ video, apiBaseline, focusInstruction })
    const filled = await fillPrompt(page, prompt)
    if (!filled) return { ...base, routeOutcome: 'prompt_fill_failed' }
    await submitPrompt(page)
    await page.waitForTimeout(45000)
    const after = await inspectGeminiPage(page)
    const parsed = parseJsonObject(after.bodyText)
    const routeOutcome = classifySubmittedOutput(parsed, after.bodyText)
    const responseScreenshotPath = path.join(proofDir, `${video.videoId}-gemini-response.png`)
    await page.screenshot({ path: responseScreenshotPath, fullPage: false }).catch(() => null)

    return {
      ...base,
      ok: routeOutcome === 'works',
      routeOutcome,
      submittedPrompt: true,
      outputParsed: Boolean(parsed),
      outputHash: stableTextHash(JSON.stringify(parsed || after.bodyText.slice(0, 4000))),
      output: parsed,
      responseBodyExcerpt: after.bodyText.slice(0, 2200),
      responseScreenshotArtifact: await fileDigest(responseScreenshotPath).catch(() => null),
    }
  } finally {
    await context.close()
  }
}
