export const COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID = 'COURSE-SOURCE-AUTH-BOUNDARY-001'
export const COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY = 'course-source-auth-boundary-v1'
export const COURSE_SOURCE_AUTH_BOUNDARY_PLAN_PATH = 'docs/process/course-source-auth-boundary-001-plan.md'
export const COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_PATH = 'docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json'
export const COURSE_SOURCE_AUTH_BOUNDARY_SCRIPT_PATH = 'scripts/process-course-source-auth-boundary-check.mjs'
export const COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-course-source-auth-boundary-closeout.md'
export const COURSE_SOURCE_AUTH_BOUNDARY_SPRINT_ID = 'course-source-auth-boundary-2026-05-18'
export const COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID = 'EXTRACTION-TEAM-001'

export const COURSE_SOURCE_AUTH_BOUNDARY_CHANGED_FILES = [
  'lib/course-source-auth-boundary.js',
  'scripts/process-course-source-auth-boundary-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'docs/process/course-source-auth-boundary-001-plan.md',
  'docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json',
  'docs/_archive/handoffs/2026-05-18-course-source-auth-boundary-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const COURSE_SOURCE_AUTH_BOUNDARY_PROOF_COMMANDS = [
  'node --check lib/course-source-auth-boundary.js lib/foundation-intelligence-audit-verifier.js scripts/process-course-source-auth-boundary-check.mjs scripts/foundation-verify.mjs',
  'npm run process:course-source-auth-boundary-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --closeoutKey=course-source-auth-boundary-v1',
  'npm run process:foundation-ship -- --card=COURSE-SOURCE-AUTH-BOUNDARY-001 --planApprovalRef=docs/process/approvals/COURSE-SOURCE-AUTH-BOUNDARY-001.json --closeoutKey=course-source-auth-boundary-v1 --commitRef=HEAD',
]

export const COURSE_SOURCE_AUTH_BOUNDARY_REQUIRED_SOURCE_IDS = [
  'SRC-MYICRO-001',
  'SRC-SKOOL-001',
  'SRC-LOOM-001',
  'SRC-YOUTUBE-INTEL-001',
]

export const COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS = [
  'sourceId',
  'sourceClass',
  'accessOwner',
  'approvedActor',
  'approvedAccessMethod',
  'permittedContentTypes',
  'maxScope',
  'artifactStoragePolicy',
  'privacyRedactionPolicy',
  'contentUseBoundary',
  'downstreamUsePolicy',
  'operatorReviewCadence',
  'rollbackOrDeletePlan',
  'proofCommand',
  'expiresAtOrReviewBy',
]

export const COURSE_SOURCE_AUTH_BOUNDARY_CLASS_MATRIX = [
  {
    sourceClass: 'public_no_auth',
    examples: ['Public YouTube videos', 'public blogs', 'public GitHub repos'],
    metadataPreflightAllowed: true,
    privateOrPaid: false,
    extractionDefault: 'blocked_until_packet_approval',
    requiredBeforeExtraction: ['sourceId', 'publicUrl', 'termsPosture', 'runBudget', 'artifactStoragePolicy', 'proofCommand'],
    blockedUntilApproval: ['bulk crawl', 'transcript fetch', 'screenshot/keyframe capture', 'model summarization', 'atom/KB promotion'],
  },
  {
    sourceClass: 'paid_course',
    examples: ['Mycro / myICOR paid training'],
    metadataPreflightAllowed: true,
    privateOrPaid: true,
    extractionDefault: 'blocked',
    requiredBeforeExtraction: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
    blockedUntilApproval: ['login', 'scrape', 'download', 'screenshot/keyframe capture', 'transcript fetch', 'model summarization', 'raw storage', 'downstream sharing'],
  },
  {
    sourceClass: 'private_community',
    examples: ['Skool communities and courses'],
    metadataPreflightAllowed: true,
    privateOrPaid: true,
    extractionDefault: 'blocked',
    requiredBeforeExtraction: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
    blockedUntilApproval: ['login', 'scrape', 'post/comment extraction', 'download', 'screenshot capture', 'member data use', 'downstream sharing'],
  },
  {
    sourceClass: 'private_video_training',
    examples: ['Loom/private trainings/private Zoom replays'],
    metadataPreflightAllowed: true,
    privateOrPaid: true,
    extractionDefault: 'blocked',
    requiredBeforeExtraction: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
    blockedUntilApproval: ['login', 'video download', 'transcript fetch', 'screenshot/keyframe capture', 'vision model calls', 'raw storage', 'downstream sharing'],
  },
]

export const COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS = [
  {
    sourceId: 'SRC-MYICRO-001',
    sourceName: 'Mycro / myICOR Training',
    sourceClass: 'paid_course',
    sourceType: 'paid_course_app',
    accessOwner: 'Steve',
    accessPosture: 'authorized_browser_session_future',
    connectorKey: 'myicro-access',
    sourceContractStatus: 'Scoped, not connected',
    preflightStatus: 'metadata_only_allowed',
    extractionStatus: 'blocked_pending_source_auth_approval',
    extractionAllowed: false,
    approvalRequired: true,
    privateOrPaid: true,
    contentUseBoundary: 'No course content read, copied, summarized, screenshotted, transcribed, stored, or routed until Steve approves exact source class, storage, and downstream use.',
    safePreflightFields: ['source identity', 'owner', 'access method label', 'course map skeleton if Steve provides it', 'risk notes', 'approval packet draft'],
  },
  {
    sourceId: 'SRC-SKOOL-001',
    sourceName: 'Skool courses and communities',
    sourceClass: 'private_community',
    sourceType: 'paid_or_private_community',
    accessOwner: 'Steve',
    accessPosture: 'authorized_browser_session_future',
    connectorKey: 'skool-access',
    sourceContractStatus: 'Gap / not signed off',
    preflightStatus: 'metadata_only_allowed',
    extractionStatus: 'blocked_pending_source_auth_approval',
    extractionAllowed: false,
    approvalRequired: true,
    privateOrPaid: true,
    contentUseBoundary: 'No posts, comments, member data, lessons, videos, screenshots, transcripts, or summaries until source permission and content-use boundary are explicit.',
    safePreflightFields: ['source identity', 'community/course name', 'owner', 'access method label', 'content type map', 'risk notes', 'approval packet draft'],
  },
  {
    sourceId: 'SRC-LOOM-001',
    sourceName: 'Loom / private training video',
    sourceClass: 'private_video_training',
    sourceType: 'private_video_training',
    accessOwner: 'Steve',
    accessPosture: 'approved_export_or_authorized_session_required',
    connectorKey: 'apify-loom-youtube',
    sourceContractStatus: 'Gap / no extractor proof',
    preflightStatus: 'metadata_only_allowed',
    extractionStatus: 'blocked_pending_source_auth_approval',
    extractionAllowed: false,
    approvalRequired: true,
    privateOrPaid: true,
    contentUseBoundary: 'No private video download, transcript fetch, keyframe capture, screenshot, vision model call, raw storage, or downstream sharing until an approved extractor/export path exists.',
    safePreflightFields: ['source identity', 'owner', 'access/export method label', 'content type map', 'risk notes', 'approval packet draft'],
  },
  {
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    sourceName: 'Public YouTube Creator Intelligence',
    sourceClass: 'public_no_auth',
    sourceType: 'public_video',
    accessOwner: 'Steve',
    accessPosture: 'public_no_auth_with_run_approval',
    connectorKey: 'dataforseo-youtube',
    sourceContractStatus: 'Pending revalidation; subtitle v1 exists',
    preflightStatus: 'metadata_only_allowed',
    extractionStatus: 'blocked_until_public_packet_approval',
    extractionAllowed: false,
    approvalRequired: true,
    privateOrPaid: false,
    contentUseBoundary: 'Public metadata can be queued; transcript/keyframe/model extraction still needs a no-auth/no-paid run packet, budget, and proof before execution.',
    safePreflightFields: ['source identity', 'public URL', 'creator/channel', 'content type map', 'transcript availability expectation', 'run budget draft'],
  },
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  liveExtractionStarted: false,
  privateAuthUsed: false,
  paidAuthUsed: false,
  transcriptFetched: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  modelCallsStarted: false,
  rawPrivateContentStored: false,
  researchInboxWritten: false,
  atomsCreated: 0,
  kbDraftsCreated: 0,
  externalWrites: false,
  driveMutation: false,
})

function normalizeText(value) {
  return String(value || '').trim()
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function findClass(sourceClass, classMatrix) {
  return classMatrix.find(row => row.sourceClass === sourceClass) || null
}

function missingFields(row, fields) {
  return fields.filter(field => {
    const value = row?.[field]
    return Array.isArray(value) ? value.length === 0 : !normalizeText(value)
  })
}

export function buildCourseSourceAuthBoundarySnapshot({
  sourceRows = COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS,
  classMatrix = COURSE_SOURCE_AUTH_BOUNDARY_CLASS_MATRIX,
  sideEffects = {},
} = {}) {
  const rows = clone(sourceRows)
  const classes = clone(classMatrix)
  const effects = { ...DEFAULT_SIDE_EFFECTS, ...(sideEffects || {}) }
  const findings = []
  const rowIds = new Set(rows.map(row => row.sourceId))
  const classIds = new Set(classes.map(row => row.sourceClass))
  const requiredRows = COURSE_SOURCE_AUTH_BOUNDARY_REQUIRED_SOURCE_IDS.map(sourceId => rows.find(row => row.sourceId === sourceId) || null)
  const privateRows = rows.filter(row => row.privateOrPaid === true)
  const unsafeApprovedRows = rows.filter(row =>
    row.privateOrPaid === true &&
      (row.extractionAllowed === true || /approved/i.test(row.extractionStatus || '')) &&
      !normalizeText(row.approvalPacketRef)
  )
  const requiredRowFields = [
    'sourceId',
    'sourceName',
    'sourceClass',
    'sourceType',
    'accessOwner',
    'accessPosture',
    'connectorKey',
    'sourceContractStatus',
    'preflightStatus',
    'extractionStatus',
    'contentUseBoundary',
  ]
  const incompleteRows = rows
    .map(row => ({ sourceId: row.sourceId || 'missing', missing: missingFields(row, requiredRowFields) }))
    .filter(row => row.missing.length > 0)
  const unsafeSideEffects = Object.entries(effects)
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
  const classFieldGaps = classes
    .map(row => ({
      sourceClass: row.sourceClass,
      missing: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.filter(field =>
        row.privateOrPaid === true && !(row.requiredBeforeExtraction || []).includes(field)
      ),
    }))
    .filter(row => row.missing.length > 0)

  addFinding(findings, requiredRows.every(Boolean), 'required course/source IDs are represented', COURSE_SOURCE_AUTH_BOUNDARY_REQUIRED_SOURCE_IDS.filter(sourceId => !rowIds.has(sourceId)).join(', ') || `${requiredRows.length} rows`)
  addFinding(findings, ['public_no_auth', 'paid_course', 'private_community', 'private_video_training'].every(value => classIds.has(value)), 'source class matrix covers public, paid course, community, and private video', Array.from(classIds).join(', '))
  addFinding(findings, incompleteRows.length === 0, 'source rows have required boundary fields', incompleteRows.map(row => `${row.sourceId}:${row.missing.join(',')}`).join('; ') || `${rows.length} rows`)
  addFinding(findings, rows.every(row => findClass(row.sourceClass, classes)), 'each source row maps to a source class', rows.map(row => `${row.sourceId}:${row.sourceClass}`).join(', '))
  addFinding(findings, privateRows.every(row => row.approvalRequired === true && row.extractionAllowed === false && /^blocked/.test(row.extractionStatus)), 'private/paid sources are blocked until explicit approval', privateRows.map(row => `${row.sourceId}:${row.extractionStatus}`).join(', '))
  addFinding(findings, rows.every(row => row.preflightStatus === 'metadata_only_allowed' && (row.safePreflightFields || []).length >= 4), 'metadata-only preflight is allowed and bounded', rows.map(row => `${row.sourceId}:${(row.safePreflightFields || []).length}`).join(', '))
  addFinding(findings, classFieldGaps.length === 0, 'private/paid approval packets require full approval fields', classFieldGaps.map(row => `${row.sourceClass}:${row.missing.join(',')}`).join('; ') || `${COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.length} fields`)
  addFinding(findings, classes.filter(row => row.privateOrPaid).every(row => (row.blockedUntilApproval || []).length >= 6), 'private/paid classes name blocked actions', classes.filter(row => row.privateOrPaid).map(row => `${row.sourceClass}:${row.blockedUntilApproval.length}`).join(', '))
  addFinding(findings, unsafeApprovedRows.length === 0, 'private/paid extraction cannot become approved without approval packet ref', unsafeApprovedRows.map(row => row.sourceId).join(', ') || 'blocked')
  addFinding(findings, unsafeSideEffects.length === 0, 'no live extraction/auth/model/output side effects occurred', unsafeSideEffects.join(', ') || 'none')

  const ok = findings.every(finding => finding.ok)
  return {
    ok,
    status: ok ? 'ready' : 'blocked',
    cardId: COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID,
    closeoutKey: COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY,
    recommendedNext: COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID,
    rows,
    classMatrix: classes,
    sideEffects: effects,
    approvalRequiredFields: COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
    metadataOnlyPreflight: true,
    extractionApprovedByThisCard: false,
    paidPrivateExtractionBlocked: true,
    writesBacklog: false,
    opensSprint: false,
    findings,
    failures: findings.filter(finding => !finding.ok),
    summary: {
      sourceCount: rows.length,
      requiredSourceCount: COURSE_SOURCE_AUTH_BOUNDARY_REQUIRED_SOURCE_IDS.length,
      requiredReadyCount: requiredRows.filter(Boolean).length,
      privateOrPaidCount: privateRows.length,
      blockedPrivateOrPaidCount: privateRows.filter(row => row.extractionAllowed === false && /^blocked/.test(row.extractionStatus)).length,
      classCount: classes.length,
      unsafeSideEffectCount: unsafeSideEffects.length,
    },
  }
}

export function buildCourseSourceAuthBoundaryDogfoodProof() {
  const healthy = buildCourseSourceAuthBoundarySnapshot()
  const missingSkool = buildCourseSourceAuthBoundarySnapshot({
    sourceRows: COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS.filter(row => row.sourceId !== 'SRC-SKOOL-001'),
  })
  const missingApprovalField = buildCourseSourceAuthBoundarySnapshot({
    classMatrix: COURSE_SOURCE_AUTH_BOUNDARY_CLASS_MATRIX.map(row =>
      row.sourceClass === 'paid_course'
        ? { ...row, requiredBeforeExtraction: row.requiredBeforeExtraction.filter(field => field !== 'contentUseBoundary') }
        : row
    ),
  })
  const approvedPrivateWithoutPacket = buildCourseSourceAuthBoundarySnapshot({
    sourceRows: COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS.map(row =>
      row.sourceId === 'SRC-MYICRO-001'
        ? { ...row, extractionAllowed: true, extractionStatus: 'approved' }
        : row
    ),
  })
  const liveExtraction = buildCourseSourceAuthBoundarySnapshot({
    sideEffects: { liveExtractionStarted: true, transcriptFetched: true },
  })
  const paidAuth = buildCourseSourceAuthBoundarySnapshot({
    sideEffects: { paidAuthUsed: true, privateAuthUsed: true },
  })
  const downstreamWrites = buildCourseSourceAuthBoundarySnapshot({
    sideEffects: { researchInboxWritten: true, atomsCreated: 1, kbDraftsCreated: 1 },
  })

  return {
    ok: healthy.ok === true &&
      missingSkool.ok === false &&
      missingApprovalField.ok === false &&
      approvedPrivateWithoutPacket.ok === false &&
      liveExtraction.ok === false &&
      paidAuth.ok === false &&
      downstreamWrites.ok === false,
    healthy,
    rejected: {
      missingSkool,
      missingApprovalField,
      approvedPrivateWithoutPacket,
      liveExtraction,
      paidAuth,
      downstreamWrites,
    },
    dogfoodInvariant: 'Course/private source auth passes only when metadata preflight is bounded, private/paid extraction is blocked, approval packet fields are complete, and no auth/extraction/model/output side effects occur.',
  }
}

export function renderCourseSourceAuthBoundaryReport(snapshot = buildCourseSourceAuthBoundarySnapshot()) {
  const rows = snapshot.rows
    .map(row => `| ${row.sourceId} | ${row.sourceClass} | ${row.accessPosture} | ${row.preflightStatus} | ${row.extractionStatus} | ${row.extractionAllowed ? 'approved' : 'blocked'} |`)
    .join('\n')
  const classRows = snapshot.classMatrix
    .map(row => `| ${row.sourceClass} | ${row.privateOrPaid ? 'yes' : 'no'} | ${row.extractionDefault} | ${(row.requiredBeforeExtraction || []).length} | ${(row.blockedUntilApproval || []).join('; ')} |`)
    .join('\n')
  const failureRows = snapshot.failures.length
    ? snapshot.failures.map(failure => `- ${failure.check}: ${failure.detail}`).join('\n')
    : '- none'
  return `# Course Source Auth Boundary Closeout

Card: \`${COURSE_SOURCE_AUTH_BOUNDARY_CARD_ID}\`
Closeout key: \`${COURSE_SOURCE_AUTH_BOUNDARY_CLOSEOUT_KEY}\`

## What Changed

Defined the permission boundary for private, paid, community, course, Loom/private video, and public no-auth Build Intel sources before extraction can run.

## Source Boundary Table

| Source | Class | Access posture | Preflight | Extraction | Status |
| --- | --- | --- | --- | --- | --- |
${rows}

## Approval Matrix

| Class | Private/paid | Default extraction posture | Required fields | Blocked until approval |
| --- | --- | --- | ---: | --- |
${classRows}

## Failures

${failureRows}

## Next

Continue \`${COURSE_SOURCE_AUTH_BOUNDARY_NEXT_CARD_ID}\` for supervised extraction runtime work. MyICOR, Skool, Loom/private training, and course extraction remain blocked until an explicit source-specific approval packet is created and approved.
`
}
