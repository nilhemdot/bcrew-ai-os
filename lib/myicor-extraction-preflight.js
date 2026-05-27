import {
  COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
  COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS,
} from './course-source-auth-boundary.js'
import {
  buildConnectorCredentialRegistrySnapshot,
} from './connector-credential-registry.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from './source-contracts.js'
import {
  SOURCE_CONTRACT_VALIDATION_PROFILES,
  assertSourceContractAllowsExtraction,
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'

export const MYICOR_EXTRACTION_PREFLIGHT_CARD_ID = 'MYICOR-EXTRACTION-PREFLIGHT-001'
export const MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY = 'myicor-extraction-preflight-v1'
export const MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID = 'SRC-MYICRO-001'
export const MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY = 'myicro-access'
export const MYICOR_EXTRACTION_PREFLIGHT_PLAN_PATH = 'docs/process/myicor-extraction-preflight-001-plan.md'
export const MYICOR_EXTRACTION_PREFLIGHT_PACKET_PATH = 'docs/process/myicor-extraction-preflight-001-packet.md'
export const MYICOR_EXTRACTION_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json'
export const MYICOR_EXTRACTION_PREFLIGHT_SCRIPT_PATH = 'scripts/process-myicor-extraction-preflight-check.mjs'
export const MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-myicor-extraction-preflight-closeout.md'
export const MYICOR_EXTRACTION_PREFLIGHT_SPRINT_ID = 'myicor-extraction-preflight-2026-05-18'
export const MYICOR_EXTRACTION_PREFLIGHT_NEXT_CARD_ID = 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001'

export const MYICOR_EXTRACTION_PREFLIGHT_CHANGED_FILES = [
  'lib/myicor-extraction-preflight.js',
  'scripts/process-myicor-extraction-preflight-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  MYICOR_EXTRACTION_PREFLIGHT_PLAN_PATH,
  MYICOR_EXTRACTION_PREFLIGHT_PACKET_PATH,
  MYICOR_EXTRACTION_PREFLIGHT_APPROVAL_PATH,
  MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const MYICOR_EXTRACTION_PREFLIGHT_PROOF_COMMANDS = [
  'node --check lib/myicor-extraction-preflight.js lib/foundation-intelligence-audit-verifier.js scripts/process-myicor-extraction-preflight-check.mjs scripts/foundation-verify.mjs',
  'npm run process:myicor-extraction-preflight-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json --closeoutKey=myicor-extraction-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --closeoutKey=myicor-extraction-preflight-v1',
  'npm run process:foundation-ship -- --card=MYICOR-EXTRACTION-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/MYICOR-EXTRACTION-PREFLIGHT-001.json --closeoutKey=myicor-extraction-preflight-v1 --commitRef=HEAD',
]

export const MYICOR_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES = [
  'No live MyICOR extraction, logged-in app access, authorized browser session, course crawl, lesson navigation, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, or model call.',
  'No private, paid, community, course, Skool, Loom, or authorized-browser access.',
  'No course content, lesson text, transcript text, resource links, screenshots, keyframes, summaries, or raw paid material are copied into repo docs, Postgres, artifacts, Research Inbox, KB, atoms, action routes, vectors, or chat-only closeout.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, backlog mutation from extracted content, vector write, or query-index write.',
  'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'No Drive permissions mutation or Drive request-access email.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
  'No hidden subagents, invisible extraction workers, or real extraction worker launch.',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  privateAuthUsed: false,
  paidAuthUsed: false,
  authorizedBrowserOpened: false,
  sourceCrawlStarted: false,
  lessonNavigationStarted: false,
  transcriptFetched: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  downloadsStarted: false,
  modelCallsStarted: false,
  researchInboxWritten: false,
  kbDraftsCreated: 0,
  atomsCreated: 0,
  synthesisFactsCreated: 0,
  actionRoutesCreated: 0,
  vectorWrites: 0,
  queryIndexWrites: 0,
  backlogMutatedFromContent: false,
  externalWritesStarted: false,
})

const EXPECTED_CONTENT_TYPES = [
  { type: 'course_structure', status: 'planned_not_read' },
  { type: 'lesson_text', status: 'blocked_pending_source_auth_approval' },
  { type: 'resources', status: 'blocked_pending_source_auth_approval' },
  { type: 'transcripts_or_audio_notes', status: 'blocked_pending_source_auth_approval' },
  { type: 'screenshots_or_keyframes', status: 'blocked_pending_source_auth_approval' },
  { type: 'workflow_observations', status: 'blocked_pending_source_auth_approval' },
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function missingFields(row, fields) {
  return fields.filter(field => {
    const value = row?.[field]
    return Array.isArray(value) ? value.length === 0 : !text(value)
  })
}

function sideEffectViolations(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function buildApprovalPacketDraft(overrides = {}) {
  const fields = COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.reduce((acc, field) => {
    acc[field] = 'pending_steve_source_specific_approval'
    return acc
  }, {})
  return {
    packetStatus: 'draft_pending_approval',
    sourceSpecificApprovalGranted: false,
    approvalRef: null,
    fields: {
      ...fields,
      sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
      sourceClass: 'paid_course',
      accessOwner: 'Steve',
      approvedActor: 'pending_approval',
      approvedAccessMethod: 'authorized_browser_session_future_pending_approval',
      proofCommand: 'npm run process:myicor-extraction-preflight-check -- --close-card --json',
    },
    ...overrides,
  }
}

function buildCourseMapSkeleton(overrides = {}) {
  return {
    status: 'not_inspected',
    source: 'repo_truth_metadata_only',
    steveProvidedSkeletonAllowed: true,
    inspectedByCodex: false,
    inspectedLessonCount: 0,
    courseCount: 'unknown_until_approved',
    lessonCount: 'unknown_until_approved',
    resourceCount: 'unknown_until_approved',
    ...overrides,
  }
}

function collectPrivateContentViolations(value, pathParts = []) {
  const violations = []
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      violations.push(...collectPrivateContentViolations(value[index], [...pathParts, String(index)]))
    }
    return violations
  }
  if (!value || typeof value !== 'object') return violations
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key]
    const isContentField = /lessonText|transcriptText|rawCourseContent|copiedCourseContent|courseContentExcerpt|screenshotPath|keyframePath|videoNotes|resourceLinks|sourceBackedSummary/i.test(key)
    const hasValue = Array.isArray(child) ? child.length > 0 : Boolean(text(child))
    if (isContentField && hasValue) violations.push(childPath.join('.'))
    if (child && typeof child === 'object') violations.push(...collectPrivateContentViolations(child, childPath))
  }
  return violations
}

function resolveRepoTruth({
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  authBoundaryRows = COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS,
  env = process.env,
} = {}) {
  const sourceContract = sourceContracts.find(contract => contract.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID) || null
  const authBoundaryRow = authBoundaryRows.find(row => row.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID) || null
  const connectorRegistry = buildConnectorCredentialRegistrySnapshot({ env, sourceContracts, sourceConnectors })
  const connectorCredential = connectorRegistry.rows.find(row => row.key === MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY) || null
  const validation = evaluateSourceContractValidationLayer({
    sourceContracts,
    sourceConnectors,
    extractionTargets: [],
    profiles: SOURCE_CONTRACT_VALIDATION_PROFILES,
  })
  const sourceValidationRow = validation.rows.find(row => row.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID) || null
  const extractionGate = assertSourceContractAllowsExtraction(MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID, validation)
  return {
    sourceContract,
    authBoundaryRow,
    connectorCredential,
    sourceValidationRow,
    extractionGate,
  }
}

export function buildMyicorExtractionPreflightSnapshot(input = {}) {
  const repoTruth = resolveRepoTruth(input)
  const approvalPacketDraft = buildApprovalPacketDraft(input.approvalPacketDraft)
  const courseMapSkeleton = buildCourseMapSkeleton(input.courseMapSkeleton)
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS, ...(input.sideEffects || {}) }
  const contentArtifacts = clone(input.contentArtifacts || [])
  const findings = []
  const requiredApprovalFieldGaps = missingFields(approvalPacketDraft.fields, COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS)
  const sideEffectsStarted = sideEffectViolations(sideEffects)
  const privateContentViolations = collectPrivateContentViolations(contentArtifacts)
  const courseMapUnsafe = courseMapSkeleton.inspectedByCodex === true ||
    Number(courseMapSkeleton.inspectedLessonCount || 0) > 0 ||
    /browser|crawl|scrape|download|session/i.test(text(courseMapSkeleton.source))

  addFinding(findings, repoTruth.sourceContract?.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID, 'source contract exists', repoTruth.sourceContract?.sourceId || 'missing')
  addFinding(findings, repoTruth.sourceContract?.status === 'Scoped, not connected' && repoTruth.sourceContract?.validation === 'Not Signed Off', 'source contract remains scoped and not signed off', `${repoTruth.sourceContract?.status || 'missing'} / ${repoTruth.sourceContract?.validation || 'missing'}`)
  addFinding(findings, /no credential or content access/i.test(repoTruth.sourceContract?.accessMethod || ''), 'source contract does not allow credential or content access in this slice', repoTruth.sourceContract?.accessMethod || 'missing')
  addFinding(findings, repoTruth.authBoundaryRow?.sourceClass === 'paid_course' && repoTruth.authBoundaryRow?.privateOrPaid === true, 'source-auth row classifies MyICOR as paid/private', `${repoTruth.authBoundaryRow?.sourceClass || 'missing'} private=${repoTruth.authBoundaryRow?.privateOrPaid}`)
  addFinding(findings, repoTruth.authBoundaryRow?.preflightStatus === 'metadata_only_allowed' && repoTruth.authBoundaryRow?.extractionAllowed === false && repoTruth.authBoundaryRow?.approvalRequired === true, 'auth boundary allows metadata-only preflight and blocks extraction', `${repoTruth.authBoundaryRow?.preflightStatus || 'missing'} / allowed=${repoTruth.authBoundaryRow?.extractionAllowed}`)
  addFinding(findings, repoTruth.connectorCredential?.status === 'blocked' && repoTruth.connectorCredential?.safeToUse === false && repoTruth.connectorCredential?.sourceUnlocked === false, 'connector credential remains blocked and not safe to use', `${repoTruth.connectorCredential?.status || 'missing'} / safe=${repoTruth.connectorCredential?.safeToUse}`)
  addFinding(findings, repoTruth.sourceValidationRow?.authPosture === 'owner_authorization_required' && repoTruth.sourceValidationRow?.extractionPosture === 'blocked_until_authorized', 'validation profile blocks extraction until authorization', `${repoTruth.sourceValidationRow?.authPosture || 'missing'} / ${repoTruth.sourceValidationRow?.extractionPosture || 'missing'}`)
  addFinding(findings, repoTruth.extractionGate?.ok === false && /auth|required|blocked|does not allow/i.test(repoTruth.extractionGate?.reason || ''), 'source extraction gate fails closed before approval', repoTruth.extractionGate?.reason || 'missing')
  addFinding(findings, approvalPacketDraft.sourceSpecificApprovalGranted === false && !text(approvalPacketDraft.approvalRef), 'approval packet is a draft, not runtime approval', approvalPacketDraft.packetStatus || 'missing')
  addFinding(findings, requiredApprovalFieldGaps.length === 0, 'approval packet draft names every required approval field', requiredApprovalFieldGaps.join(', ') || `${COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.length} fields`)
  addFinding(findings, courseMapSkeleton.status === 'not_inspected' && !courseMapUnsafe, 'course map stays uninspected metadata skeleton', `${courseMapSkeleton.status} / lessons=${courseMapSkeleton.inspectedLessonCount}`)
  addFinding(findings, privateContentViolations.length === 0, 'no MyICOR course content is copied into the preflight packet', privateContentViolations.join(', ') || 'none')
  addFinding(findings, sideEffectsStarted.length === 0, 'no auth/extraction/model/output side effects occurred', sideEffectsStarted.join(', ') || 'none')

  const ok = findings.every(finding => finding.ok)
  return {
    ok,
    status: ok ? 'ready' : 'blocked',
    cardId: MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
    closeoutKey: MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
    sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
    sourceName: repoTruth.authBoundaryRow?.sourceName || repoTruth.sourceContract?.title || 'Mycro / myICOR Training',
    preflightOnly: true,
    metadataOnly: true,
    privateOrPaid: true,
    approvalRequired: true,
    approvedExtraction: false,
    liveExtractionStarted: false,
    sourceContract: repoTruth.sourceContract,
    authBoundaryRow: repoTruth.authBoundaryRow,
    connectorCredential: repoTruth.connectorCredential,
    sourceValidationRow: repoTruth.sourceValidationRow,
    extractionGate: repoTruth.extractionGate,
    approvalPacketDraft,
    requiredApprovalFields: [...COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS],
    courseMapSkeleton,
    expectedContentTypes: clone(EXPECTED_CONTENT_TYPES),
    artifactPolicy: {
      rawPrivateContentStorage: 'blocked_pending_source_auth_approval',
      screenshotStorage: 'blocked_pending_source_auth_approval',
      transcriptStorage: 'blocked_pending_source_auth_approval',
      metadataPacketStorage: 'repo_doc_allowed',
      downstreamRouting: 'blocked_until_source_specific_approval_and_extraction_to_kb_atom_pipeline',
    },
    sensitivity: {
      privacyTier: 'paid_course_private',
      contentUseBoundary: repoTruth.authBoundaryRow?.contentUseBoundary || '',
      defaultUse: 'internal_learning_only_after_approval',
    },
    extractionPlan: [
      'Keep MyICOR as metadata-only preflight until Steve approves a source-specific packet.',
      'Before runtime: confirm actor, browser profile/session, content-use rights, max scope, storage, redaction, downstream use, proof command, and expiry/review date.',
      'After approval only: run one bounded access proof before any course inventory, lesson extraction, screenshot/keyframe capture, transcript fetch, or atom routing.',
    ],
    sideEffects,
    contentArtifacts,
    findings,
    failures: findings.filter(finding => !finding.ok),
    recommendedNext: MYICOR_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
    notNextBoundaries: MYICOR_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
    summary: {
      sourceContractPresent: Boolean(repoTruth.sourceContract),
      connectorStatus: repoTruth.connectorCredential?.status || 'missing',
      approvalFieldCount: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.length,
      approvalFieldGapCount: requiredApprovalFieldGaps.length,
      unsafeSideEffectCount: sideEffectsStarted.length,
      privateContentViolationCount: privateContentViolations.length,
      courseMapInspected: courseMapSkeleton.inspectedByCodex === true || Number(courseMapSkeleton.inspectedLessonCount || 0) > 0,
    },
  }
}

export function buildMyicorExtractionPreflightDogfoodProof() {
  const healthy = buildMyicorExtractionPreflightSnapshot()
  const missingSourceContract = buildMyicorExtractionPreflightSnapshot({
    sourceContracts: getSourceContracts().filter(contract => contract.sourceId !== MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID),
  })
  const extractionUnblocked = buildMyicorExtractionPreflightSnapshot({
    authBoundaryRows: COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS.map(row =>
      row.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID
        ? { ...row, extractionAllowed: true, extractionStatus: 'approved', approvalRequired: false }
        : row
    ),
  })
  const missingApprovalField = buildMyicorExtractionPreflightSnapshot({
    approvalPacketDraft: {
      fields: {
        ...buildApprovalPacketDraft().fields,
        contentUseBoundary: '',
      },
    },
  })
  const privateAuthUsed = buildMyicorExtractionPreflightSnapshot({
    sideEffects: { privateAuthUsed: true, paidAuthUsed: true, authorizedBrowserOpened: true },
  })
  const liveExtractionStarted = buildMyicorExtractionPreflightSnapshot({
    sideEffects: { sourceCrawlStarted: true, lessonNavigationStarted: true, transcriptFetched: true },
  })
  const courseContentCopied = buildMyicorExtractionPreflightSnapshot({
    contentArtifacts: [{ lessonText: 'synthetic paid lesson text sentinel' }],
  })
  const inspectedCourseMap = buildMyicorExtractionPreflightSnapshot({
    courseMapSkeleton: { source: 'browser_session_scan', inspectedByCodex: true, inspectedLessonCount: 1 },
  })
  const downstreamWrites = buildMyicorExtractionPreflightSnapshot({
    sideEffects: { researchInboxWritten: true, kbDraftsCreated: 1, atomsCreated: 1, actionRoutesCreated: 1 },
  })
  const modelCalls = buildMyicorExtractionPreflightSnapshot({
    sideEffects: { modelCallsStarted: true },
  })
  const rejectedCases = {
    missingSourceContract: missingSourceContract.ok === false,
    extractionUnblocked: extractionUnblocked.ok === false,
    missingApprovalField: missingApprovalField.ok === false,
    privateAuthUsed: privateAuthUsed.ok === false,
    liveExtractionStarted: liveExtractionStarted.ok === false,
    courseContentCopied: courseContentCopied.ok === false,
    inspectedCourseMap: inspectedCourseMap.ok === false,
    downstreamWrites: downstreamWrites.ok === false,
    modelCalls: modelCalls.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    healthy,
    rejectedCases,
    invariant: 'MyICOR preflight passes only as metadata-only source/auth planning with blocked connector, blocked extraction, complete approval-field draft, uninspected course map, no copied course content, and no auth/extraction/model/output side effects.',
  }
}

export function renderMyicorExtractionPreflightReport(snapshot = buildMyicorExtractionPreflightSnapshot()) {
  const rows = [
    `| Source | ${snapshot.sourceId} / ${snapshot.sourceName} |`,
    `| Source contract | ${snapshot.sourceContract?.status || 'missing'} / ${snapshot.sourceContract?.validation || 'missing'} |`,
    `| Connector | ${MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY} / ${snapshot.summary.connectorStatus} |`,
    `| Preflight posture | ${snapshot.metadataOnly ? 'metadata-only' : 'unsafe'} |`,
    `| Extraction posture | ${snapshot.approvedExtraction ? 'approved' : 'blocked'} |`,
    `| Approval fields | ${snapshot.summary.approvalFieldCount - snapshot.summary.approvalFieldGapCount}/${snapshot.summary.approvalFieldCount} present |`,
    `| Course map | ${snapshot.courseMapSkeleton.status}; inspected lessons ${snapshot.courseMapSkeleton.inspectedLessonCount} |`,
    `| Unsafe side effects | ${snapshot.summary.unsafeSideEffectCount} |`,
    `| Copied course content | ${snapshot.summary.privateContentViolationCount} violations |`,
  ].join('\n')
  const failures = snapshot.failures.length
    ? snapshot.failures.map(failure => `- ${failure.check}: ${failure.detail}`).join('\n')
    : '- none'
  return `# ${MYICOR_EXTRACTION_PREFLIGHT_CARD_ID}

Status: ${snapshot.status}
Closeout key: \`${MYICOR_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY}\`

## Triage

| Field | Value |
| --- | --- |
${rows}

## Expected Content Types

${snapshot.expectedContentTypes.map(row => `- ${row.type}: ${row.status}`).join('\n')}

## Approval Packet Fields

${snapshot.requiredApprovalFields.map(field => `- ${field}: ${snapshot.approvalPacketDraft.fields[field] ? 'present as pending field' : 'missing'}`).join('\n')}

## Failures

${failures}

## Next

Continue \`${snapshot.recommendedNext}\` as source-auth preflight only.`
}
