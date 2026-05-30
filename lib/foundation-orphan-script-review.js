export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID = 'FOUNDATION-ORPHAN-SCRIPT-REVIEW-001'
export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY = 'foundation-orphan-script-review-v1'
export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH = 'docs/process/foundation-orphan-script-review-001-plan.md'
export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-ORPHAN-SCRIPT-REVIEW-001.json'
export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_SCRIPT_PATH = 'scripts/process-foundation-orphan-script-review-check.mjs'
export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID = 'FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001'

export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_CHANGED_FILES = [
  'lib/foundation-orphan-script-review.js',
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_SCRIPT_PATH,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'package.json',
]

export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_PROOF_COMMANDS = [
  'node --check lib/foundation-orphan-script-review.js',
  'node --check scripts/process-foundation-orphan-script-review-check.mjs',
  'npm run process:foundation-orphan-script-review-check -- --json',
  'npm run process:foundation-orphan-script-review-check -- --apply --stage=building_now --json',
  'npm run process:foundation-orphan-script-review-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID} --planApprovalRef=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH} --closeoutKey=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID} --closeoutKey=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID} --planApprovalRef=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH} --closeoutKey=${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_NOT_NEXT_BOUNDARIES = [
  'Do not delete or archive the named orphan-script candidates in this card.',
  'Do not delete scripts/codex-status.mjs.',
  'Do not bulk-delete verifier, approval, plan, check, closeout, source/browser proof, route-policy, source-session readiness, or Dev Hub System Truth files.',
  'Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001 or any per-hub folder restructure.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Drive permissions.',
  'Do not start browser sessions, source extraction, source-row mutation, atoms/vectors, credentials, or external writes.',
  'Do not touch or weaken MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001, source-session readiness, local-browser route policy, Dev Hub System Truth, or /api/foundation/dev-team-hub posture.',
]

export const FOUNDATION_ORPHAN_SCRIPT_REVIEW_CANDIDATES = [
  {
    path: 'scripts/codex-chat.sh',
    family: 'codex-chat',
    decision: 'keep_local_operator_tool',
    owner: 'Steve local Codex workflow',
    classification: 'local_operator_entrypoint',
    protected: false,
    allowLocalEntrypoint: true,
    minReferenceCount: 0,
    keepReason: 'Launches Codex in tmux with the live status footer; zero incoming repo edges are expected for this operator entrypoint.',
    expectedSignals: ['tmux', 'codex-status.mjs', 'codex-chat-top.sh'],
  },
  {
    path: 'scripts/codex-chat-top.sh',
    family: 'codex-chat',
    decision: 'keep_support_script',
    owner: 'Steve local Codex workflow',
    classification: 'local_operator_support',
    protected: false,
    allowLocalEntrypoint: false,
    minReferenceCount: 1,
    keepReason: 'Support shim used by codex-chat.sh to detect the new Codex session JSONL and feed the status footer.',
    expectedSignals: ['CODEX_EXEC', 'sessions', 'detect_new_session'],
  },
  {
    path: 'scripts/codex-status.mjs',
    family: 'codex-status',
    decision: 'keep_live_status_tool',
    owner: 'Steve local Codex workflow',
    classification: 'live_operator_tool',
    protected: true,
    allowLocalEntrypoint: false,
    minReferenceCount: 2,
    keepReason: 'Protected live "what is Codex doing" tool used by the local launcher and explicitly guarded by tune-up checks.',
    expectedSignals: ['--footer', 'CODEX_THREAD_ID', 'sessionsDir'],
  },
  {
    path: 'scripts/generate-doc-indexes.mjs',
    family: 'doc-index',
    decision: 'keep_manual_doc_utility',
    owner: 'Foundation docs',
    classification: 'manual_repo_utility',
    protected: false,
    allowLocalEntrypoint: false,
    minReferenceCount: 1,
    keepReason: 'Regenerates docs indexes used for audit/archive navigation; keep as a manual utility, not a runtime dependency.',
    expectedSignals: ['docs/INDEX.md', 'docs/handoffs/INDEX.md', 'docs/audits/INDEX.md'],
  },
  {
    path: 'scripts/inspect-weekly-actuals.mjs',
    family: 'finance-source-diagnostic',
    decision: 'keep_manual_source_diagnostic',
    owner: 'Foundation source contracts',
    classification: 'manual_source_diagnostic',
    protected: false,
    allowLocalEntrypoint: false,
    minReferenceCount: 1,
    keepReason: 'Manual Finance weekly-actuals diagnostic referenced by source notes; keep for source debugging, not scheduled runtime.',
    expectedSignals: ['(Input) Weekly Actuals', 'getSheetGridData', 'SPREADSHEET_ID'],
  },
  {
    path: 'scripts/run-supervised-paid-source-map.mjs',
    family: 'source-browser-proof',
    decision: 'keep_protected_source_browser_proof',
    owner: 'Source Session / Human Web Agent',
    classification: 'protected_source_browser_proof',
    protected: true,
    allowLocalEntrypoint: false,
    minReferenceCount: 2,
    keepReason: 'Part of the source-browser proof lane; it keeps paid-source mapping local, supervised, exact-source, and external-write false.',
    expectedSignals: ['MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001', 'RISKY_URL_PATTERN', 'externalWrites: false', 'auth-needed.json'],
  },
  {
    path: 'scripts/sync-zoom-text-archive.mjs',
    family: 'shared-comms-archive',
    decision: 'keep_guarded_manual_archive_sync',
    owner: 'Shared communications source archive',
    classification: 'manual_archive_sync_write_capable',
    protected: false,
    allowLocalEntrypoint: false,
    minReferenceCount: 1,
    keepReason: 'Historical Zoom transcript/chat import utility; keep with explicit manual-use posture because it can upsert shared communications artifacts when not dry-run.',
    expectedSignals: ['dryRun', 'upsertSharedCommunicationArtifact', 'SRC-MEETINGS-001'],
  },
]

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function text(value) {
  return String(value || '').trim()
}

function array(value) {
  return Array.isArray(value) ? value : []
}

function isDeleteFirstDecision(decision = '') {
  return /^(delete|remove|rm|archive_without_repoint|bulk_delete)/i.test(text(decision))
}

function isKeepDecision(decision = '') {
  return /^keep_/i.test(text(decision))
}

export function evaluateFoundationOrphanScriptCandidate(candidate = {}, record = {}) {
  const checks = []
  const source = text(record.source)
  const references = array(record.references)
  const expectedSignals = array(candidate.expectedSignals)
  const missingSignals = expectedSignals.filter(signal => !source.includes(signal))
  const decision = text(candidate.decision)

  addCheck(checks, record.exists === true, 'candidate file exists', candidate.path || 'missing path')
  addCheck(checks, record.tracked === true, 'candidate file is tracked repo truth', candidate.path || 'missing path')
  addCheck(checks, Boolean(text(candidate.owner)), 'candidate has an owner', candidate.owner || 'missing owner')
  addCheck(checks, Boolean(text(candidate.keepReason)), 'candidate has a keep/retire rationale', candidate.keepReason || 'missing rationale')
  addCheck(checks, !isDeleteFirstDecision(decision), 'candidate is not marked delete-first', decision || 'missing decision')
  addCheck(
    checks,
    !candidate.protected || isKeepDecision(decision),
    'protected candidates are kept',
    `${candidate.path || 'missing path'} -> ${decision || 'missing decision'}`,
  )
  addCheck(
    checks,
    missingSignals.length === 0,
    'candidate source contains expected behavior signals',
    missingSignals.length ? `missing ${missingSignals.join(', ')}` : expectedSignals.join(', '),
  )
  addCheck(
    checks,
    candidate.allowLocalEntrypoint === true || references.length >= Number(candidate.minReferenceCount || 0),
    'candidate has reference evidence or explicit local-entrypoint posture',
    candidate.allowLocalEntrypoint === true
      ? 'local operator entrypoint'
      : `${references.length}/${candidate.minReferenceCount || 0} references`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    path: candidate.path || '',
    decision,
    owner: candidate.owner || '',
    classification: candidate.classification || '',
    protected: Boolean(candidate.protected),
    referenceCount: references.length,
    references,
    checks,
    failed,
  }
}

export function buildFoundationOrphanScriptReviewDogfoodProof() {
  const healthy = evaluateFoundationOrphanScriptCandidate(
    {
      path: 'scripts/codex-status.mjs',
      decision: 'keep_live_status_tool',
      owner: 'dogfood',
      keepReason: 'protected live tool',
      protected: true,
      minReferenceCount: 1,
      expectedSignals: ['--footer'],
    },
    {
      exists: true,
      tracked: true,
      source: 'const wantsFooter = args.has("--footer")',
      references: ['scripts/codex-chat.sh'],
    },
  )
  const protectedDelete = evaluateFoundationOrphanScriptCandidate(
    {
      path: 'scripts/codex-status.mjs',
      decision: 'delete_first',
      owner: 'dogfood',
      keepReason: 'bad fixture',
      protected: true,
      minReferenceCount: 1,
      expectedSignals: ['--footer'],
    },
    {
      exists: true,
      tracked: true,
      source: 'const wantsFooter = args.has("--footer")',
      references: ['scripts/codex-chat.sh'],
    },
  )
  const missingEvidence = evaluateFoundationOrphanScriptCandidate(
    {
      path: 'scripts/unreferenced.mjs',
      decision: 'keep_manual_utility',
      owner: 'dogfood',
      keepReason: 'bad fixture',
      protected: false,
      minReferenceCount: 1,
      expectedSignals: ['main()'],
    },
    {
      exists: true,
      tracked: true,
      source: 'main()',
      references: [],
    },
  )

  return {
    ok: healthy.ok === true &&
      protectedDelete.ok === false &&
      missingEvidence.ok === false,
    healthy,
    protectedDeleteRejected: protectedDelete.ok === false,
    missingEvidenceRejected: missingEvidence.ok === false,
  }
}

export function buildFoundationOrphanScriptReviewSnapshot({
  fileRecords = {},
  packageScripts = {},
  planSource = '',
  closeoutSource = '',
  coverageSource = '',
  roadmapSource = '',
} = {}) {
  const checks = []
  const evaluations = FOUNDATION_ORPHAN_SCRIPT_REVIEW_CANDIDATES.map(candidate =>
    evaluateFoundationOrphanScriptCandidate(candidate, fileRecords[candidate.path] || {})
  )
  const dogfood = buildFoundationOrphanScriptReviewDogfoodProof()
  const protectedDecisions = evaluations.filter(result => result.protected)
  const decisionsByStatus = evaluations.reduce((acc, result) => {
    acc[result.decision] = (acc[result.decision] || 0) + 1
    return acc
  }, {})
  const writeCapable = evaluations.filter(result => result.classification.includes('write_capable'))

  addCheck(
    checks,
    evaluations.length === FOUNDATION_ORPHAN_SCRIPT_REVIEW_CANDIDATES.length &&
      evaluations.every(result => result.ok),
    'all orphan-script candidates have reviewed keep decisions',
    evaluations.filter(result => !result.ok).map(result => result.path).join(', ') || `${evaluations.length} reviewed`,
  )
  addCheck(
    checks,
    protectedDecisions.length >= 2 &&
      protectedDecisions.every(result => isKeepDecision(result.decision)),
    'protected live/source-browser scripts are kept',
    protectedDecisions.map(result => `${result.path}:${result.decision}`).join(', '),
  )
  addCheck(
    checks,
    writeCapable.length === 1 &&
      writeCapable[0].path === 'scripts/sync-zoom-text-archive.mjs' &&
      writeCapable[0].decision === 'keep_guarded_manual_archive_sync',
    'write-capable archive utility is named and not hidden as dead code',
    writeCapable.map(result => `${result.path}:${result.decision}`).join(', ') || 'missing write-capable classification',
  )
  addCheck(
    checks,
    packageScripts['process:foundation-orphan-script-review-check'] ===
      'node --env-file-if-exists=.env scripts/process-foundation-orphan-script-review-check.mjs',
    'package exposes focused orphan-script review checker',
    packageScripts['process:foundation-orphan-script-review-check'] || 'missing',
  )
  addCheck(
    checks,
    planSource.includes(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID) &&
      planSource.includes('Do not delete') &&
      planSource.includes('codex-status.mjs') &&
      planSource.includes('source/browser proof lane'),
    'plan captures no-delete and protected-lane scope',
    FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
  )
  addCheck(
    checks,
    closeoutSource.includes(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY) &&
      closeoutSource.includes(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID),
    'closeout registry includes orphan-script review closeout',
    FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY,
  )
  addCheck(
    checks,
    coverageSource.includes(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID),
    'verifier coverage card IDs include orphan-script review card',
    FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
  )
  addCheck(
    checks,
    roadmapSource.includes(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID) &&
      roadmapSource.includes('Review orphan-script candidates without deleting first'),
    'tune-up roadmap keeps orphan-script card in sequence',
    FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood rejects protected delete-first and unsupported keep decisions',
    dogfood.ok ? 'healthy' : 'failed',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      candidateCount: evaluations.length,
      protectedCount: protectedDecisions.length,
      writeCapableCount: writeCapable.length,
      decisionsByStatus,
      keepCount: evaluations.filter(result => isKeepDecision(result.decision)).length,
      deleteFirstCount: evaluations.filter(result => isDeleteFirstDecision(result.decision)).length,
    },
    evaluations,
    dogfood,
  }
}
