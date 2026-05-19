export const VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID = 'VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001'
export const VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY = 'verifier-recent-builds-closeout-split-v1'
export const VERIFIER_RECENT_BUILDS_SPLIT_PLAN_PATH = 'docs/process/verifier-recent-builds-closeout-split-001-plan.md'
export const VERIFIER_RECENT_BUILDS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001.json'
export const VERIFIER_RECENT_BUILDS_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-recent-builds-closeout-split-check.mjs'
export const VERIFIER_RECENT_BUILDS_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-recent-builds-closeout-split-closeout.md'
export const VERIFIER_RECENT_BUILDS_SPLIT_SPRINT_ID = 'verifier-recent-builds-closeout-split-2026-05-15'
export const VERIFIER_RECENT_BUILDS_SPLIT_BEFORE_LINES = 16131
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-recent-builds-orchestration-split-v1'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-recent-builds-orchestration-split-001-plan.md'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-recent-builds-orchestration-split-check.mjs'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-recent-builds-orchestration-split-closeout.md'
export const VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_BEFORE_LINES = 6351

const REQUIRED_CLOSEOUT_BACKLOG_IDS = [
  'FOUNDATION-SWEEP-001',
  'FOUNDATION-CHANGELOG-002',
  'EXTRACTION-TEAM-001',
  'EXTRACT-SCHEDULE-001',
  'EXTRACT-METRICS-001',
  'FOUNDATION-SURFACE-UPDATES-001',
  'DRIVE-CONTENT-001',
  'KPI-HEALTH-001',
  'ACTION-REVIEW-APPLY-001',
  'RESEARCH-INBOX-001',
  'RUNTIME-HEALTH-SIMPLIFY-001',
  'RUNTIME-SUPERVISOR-001',
  'SYSTEM-010',
  'BACKLOG-HYGIENE-PASS-001',
  'BACKLOG-HYGIENE-001',
  'DEV-PROCESS-AUDIT-001',
  'PROCESS-HOOKS-001',
  'PROCESS-FANOUT-001',
  'WORKER-CODE-TRUST-001',
  'VERIFIER-DONE-COVERAGE-001',
  'VERIFIER-ARTIFACT-EXISTS-001',
  'SHEETS-QUOTA-HARDENING-001',
  'POST-SHIP-FAN-OUT-001',
  'EXCEPTION-CURATION-001',
  'DOCTRINE-PROPAGATION-001',
  'DECISION-AUTO-EMIT-001',
  'HIT-LIST-RECONCILE-001',
  'DOC-ARCHIVE-AUTO-001',
  'RESEARCH-CURATION-001',
  'REBUILD-DOCS-RETIRE-001',
  'ARCHIVE-RETIRE-001',
  'RECENT-BUILDS-MULTI-CLOSEOUT-001',
  'FULL-SYSTEM-RE-AUDIT-001',
  'LOCAL-DOC-LINK-001',
  'DOC-AUTHORITY-INDEX-REPAIR-001',
  'DOC-OTHER-TRIAGE-001',
  'DOC-CATEGORIZATION-001',
  'DOCTRINE-PROPAGATION-002',
  'PROCESS-HOOKS-002',
  'SOURCE-021-PROOF-001',
]

const RECENT_BUILD_CLOSEOUT_EXPECTATIONS = [
  {
    label: 'Recent Builds v2 carries closeout proof for FOUNDATION-SWEEP-001',
    cardId: 'FOUNDATION-SWEEP-001',
    related: [{ id: 'FOUNDATION-SWEEP-001', lanes: ['done'] }],
    exactProof: ['npm run foundation:verify'],
    text: [{ field: 'whatChanged', pattern: /31|Foundation nav|stale/i }],
    requiresReviewNext: true,
    requiresKnownLimits: true,
    missing: 'missing FOUNDATION-SWEEP-001 build closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for FOUNDATION-CHANGELOG-002',
    cardId: 'FOUNDATION-CHANGELOG-002',
    related: [{ id: 'FOUNDATION-CHANGELOG-002', lanes: ['done'] }],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /operator changelog|Recent Builds/i },
      { field: 'combined', pattern: /backlog/i },
    ],
    requiresKnownLimits: true,
    missing: 'missing FOUNDATION-CHANGELOG-002 build closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Slack current-day item proof',
    cardId: 'EXTRACTION-TEAM-001',
    closeoutKey: 'slack-current-day-channel-proof',
    related: [{ id: 'EXTRACTION-TEAM-001', lanes: ['scoped', 'done'] }],
    proofContains: ['--target=slack-current-day'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /Slack current-day|channel/i },
      { field: 'proofStatus', pattern: /61 channel items|foundation:verify/i },
      { field: 'knownLimits', pattern: /broad Slack history|broad backfill/i },
    ],
    missing: 'missing Slack current-day build closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for extraction schedule truth',
    cardId: 'EXTRACT-CONTROL-001',
    closeoutKey: 'extract-control-schedule-truth',
    related: [
      { id: 'EXTRACT-CONTROL-001', lanes: ['scoped', 'done'] },
      { id: 'EXTRACT-SCHEDULE-001', lanes: ['done'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /Foundation job runtime as visible next-run truth/i },
      { field: 'reviewNext', pattern: /coverage-by-target/i },
    ],
    missing: 'missing extraction schedule truth closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Missive current-day item ledger',
    cardId: 'EXTRACT-METRICS-001',
    closeoutKey: 'extract-metrics-missive-item-ledger',
    related: [
      { id: 'EXTRACT-METRICS-001', lanes: ['scoped', 'done'] },
      { id: 'EXTRACT-CONTROL-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['--target=missive-current-day'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /Missive current-day|conversation/i },
      { field: 'proofStatus', pattern: /100 conversation items|foundation:verify/i },
      { field: 'reviewNext', pattern: /coverage-by-target/i },
    ],
    missing: 'missing Missive item-ledger build closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for extraction coverage-by-target',
    cardId: 'EXTRACT-METRICS-001',
    closeoutKey: 'extract-metrics-coverage-by-target',
    related: [
      { id: 'EXTRACT-METRICS-001', lanes: ['done'] },
      { id: 'EXTRACT-CONTROL-001', lanes: ['done'] },
      { id: 'FOUNDATION-SURFACE-UPDATES-001', lanes: ['scoped'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /coverage-by-target|Coverage By Target/i },
      { field: 'whereItLives', pattern: /Runtime Health/i },
      { field: 'reviewNext', pattern: /EXTRACT-RETRY-001/i },
    ],
    missing: 'missing extraction coverage-by-target closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Drive Sheets text extraction',
    cardId: 'DRIVE-CONTENT-001',
    closeoutKey: 'drive-content-sheets-text-extraction',
    related: [
      { id: 'DRIVE-CONTENT-001', lanes: ['scoped'] },
      { id: 'RUNTIME-SUPERVISOR-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['--target=drive-content-extract-backfill'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /Google Sheets|drive_spreadsheet/i },
      { field: 'proofStatus', pattern: /308,697 chars|foundation:verify/i },
      { field: 'knownLimits', pattern: /EXTRACT-RETRY-001/i },
    ],
    missing: 'missing Drive Sheets text extraction closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for KPI health',
    cardId: 'KPI-HEALTH-001',
    closeoutKey: 'kpi-health-supabase-probe',
    related: [
      { id: 'KPI-HEALTH-001', lanes: ['done'] },
      { id: 'SOURCE-010', lanes: ['done'] },
    ],
    exactProof: ['npm run kpi:health', 'npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /KPI \/ Supabase health probe/i },
      { field: 'proofStatus', pattern: /14\/14 tables|5\/5 RPCs|foundation:verify/i },
      { field: 'reviewNext', pattern: /Action Router/i },
    ],
    missing: 'missing KPI health closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Foundation operator UX capture',
    cardId: 'FOUNDATION-SURFACE-UPDATES-001',
    closeoutKey: 'foundation-operator-ux-capture',
    related: [
      { id: 'FOUNDATION-SURFACE-UPDATES-001', lanes: ['scoped'] },
      { id: 'ACTION-REVIEW-APPLY-001', lanes: ['scoped', 'done'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /plain-English Foundation UX standard/i },
      { field: 'whatItDoes', pattern: /Overview -> Systems -> Backlog -> Recent Work/i },
      { field: 'reviewNext', pattern: /ACTION-REVIEW-APPLY-001/i },
    ],
    missing: 'missing Foundation operator UX capture closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for served-code trust',
    cardId: 'RUNTIME-SUPERVISOR-001',
    closeoutKey: 'runtime-supervisor-served-code-trust',
    related: [
      { id: 'RUNTIME-SUPERVISOR-001', lanes: ['scoped', 'done'] },
      { id: 'SYSTEM-010', lanes: ['scoped'] },
      { id: 'ACTION-REVIEW-APPLY-001', lanes: ['scoped', 'done'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatItDoes', pattern: /server-start commit|repo HEAD|restart command/i },
      { field: 'reviewNext', pattern: /ACTION-REVIEW-APPLY-001/i },
      { field: 'knownLimits', pattern: /auto-restart-on-push/i },
    ],
    missing: 'missing served-code trust closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for backlog hygiene pass',
    cardId: 'BACKLOG-HYGIENE-PASS-001',
    closeoutKey: 'backlog-hygiene-pass',
    related: [
      { id: 'BACKLOG-HYGIENE-PASS-001', lanes: ['done'] },
      { id: 'BACKLOG-HYGIENE-001', lanes: ['done'] },
      { id: 'PROCESS-HOOKS-001', lanes: ['scoped', 'done'] },
      { id: 'FOUNDATION-SURFACE-UPDATES-001', lanes: ['scoped'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatChanged', pattern: /stale|unclear|split completed proof/i },
      { field: 'reviewNext', pattern: /BACKLOG-HYGIENE-001/i },
      { field: 'knownLimits', pattern: /FOUNDATION-SURFACE-UPDATES-001/i },
    ],
    missing: 'missing backlog hygiene pass closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for backlog hygiene probe',
    cardId: 'BACKLOG-HYGIENE-001',
    closeoutKey: 'backlog-hygiene-probe',
    related: [
      { id: 'BACKLOG-HYGIENE-001', lanes: ['done'] },
      { id: 'DEV-PROCESS-AUDIT-001', lanes: ['done'] },
      { id: 'PROCESS-HOOKS-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['backlog:hygiene'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatItDoes', pattern: /stale executing|done cards without proof|scoped cards/i },
      { field: 'reviewNext', pattern: /DEV-PROCESS-AUDIT-001/i },
    ],
    missing: 'missing backlog hygiene probe closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for dev-process audit',
    cardId: 'DEV-PROCESS-AUDIT-001',
    closeoutKey: 'dev-process-audit-hook-map',
    related: [
      { id: 'DEV-PROCESS-AUDIT-001', lanes: ['done'] },
      { id: 'PROCESS-HOOKS-001', lanes: ['scoped', 'done'] },
      { id: 'ACTION-REVIEW-APPLY-001', lanes: ['scoped', 'done'] },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatItDoes', pattern: /exactly one owner/i },
      { field: 'reviewNext', pattern: /PROCESS-HOOKS-001/i },
      { field: 'knownLimits', pattern: /creates no new process cards/i },
    ],
    missing: 'missing dev-process audit closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for process ship check',
    cardId: 'PROCESS-HOOKS-001',
    closeoutKey: 'process-hooks-v1',
    related: [
      { id: 'PROCESS-HOOKS-001', lanes: ['done'] },
      { id: 'ACTION-REVIEW-APPLY-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['process:ship-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /approval-file evidence|served-code proof/i },
      { field: 'reviewNext', pattern: /ACTION-REVIEW-APPLY-001/i },
      { field: 'knownLimits', pattern: /manual\/scripted gate/i },
    ],
    missing: 'missing process hooks closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Action Review apply loop',
    cardId: 'ACTION-REVIEW-APPLY-001',
    closeoutKey: 'action-review-apply-v1',
    related: [{ id: 'ACTION-REVIEW-APPLY-001', lanes: ['done'] }],
    proofContains: ['process:ship-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whereItLives', pattern: /Foundation > Backlog > Action Review/i },
      { field: 'proofStatus', pattern: /destination-record proof|process gate/i },
      { field: 'reviewNext', pattern: /Stop and re-plan with Steve/i },
    ],
    missing: 'missing Action Review closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for process fanout repair',
    cardId: 'PROCESS-FANOUT-001',
    closeoutKey: 'process-fanout-v1-repair',
    related: [{ id: 'PROCESS-FANOUT-001', lanes: ['done'] }],
    proofContains: ['process:fanout-check', 'process:ship-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /claimed artifact existence|actual script|npm command/i },
      { field: 'reviewNext', pattern: /Wave 2/i },
      { field: 'knownLimits', pattern: /script gate/i },
    ],
    missing: 'missing process fanout repair closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for worker code trust',
    cardId: 'WORKER-CODE-TRUST-001',
    closeoutKey: 'worker-code-trust-v1',
    related: [{ id: 'WORKER-CODE-TRUST-001', lanes: ['done'] }],
    proofContains: ['launchctl kickstart', 'process:ship-check', 'process:fanout-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /startup commit|LaunchAgent pid|repo HEAD/i },
      { field: 'whereItLives', pattern: /Worker Code Trust/i },
      { field: 'knownLimits', pattern: /continuous liveness/i },
    ],
    missing: 'missing worker code trust closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for done coverage and artifact gates',
    cardId: 'VERIFIER-DONE-COVERAGE-001',
    backlogIds: ['VERIFIER-DONE-COVERAGE-001', 'VERIFIER-ARTIFACT-EXISTS-001'],
    closeoutKey: 'verifier-done-artifact-gates',
    related: [
      { id: 'VERIFIER-DONE-COVERAGE-001', lanes: ['done'] },
      { id: 'VERIFIER-ARTIFACT-EXISTS-001', lanes: ['done'] },
      { id: 'SHEETS-QUOTA-HARDENING-001', lanes: ['scoped', 'done'] },
    ],
    minProofContains: [
      { needle: 'process:ship-check', count: 2 },
      { needle: 'process:fanout-check', count: 2 },
    ],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /24 explicit legacy exceptions/i },
      { field: 'knownLimits', pattern: /90 days/i },
      { field: 'reviewNext', pattern: /POST-SHIP-FAN-OUT-001/i },
    ],
    missing: 'missing verifier done/artifact closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for post-ship fanout',
    cardId: 'POST-SHIP-FAN-OUT-001',
    closeoutKey: 'post-ship-fanout-v1',
    related: [
      { id: 'POST-SHIP-FAN-OUT-001', lanes: ['done'] },
      { id: 'EXCEPTION-CURATION-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['process:post-ship-fanout', 'process:ship-check', 'process:fanout-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /synthetic missing-fanout/i },
      { field: 'knownLimits', pattern: /2026-07-27/i },
      { field: 'reviewNext', pattern: /Phase C/i },
    ],
    missing: 'missing post-ship fanout closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for Sheets quota hardening',
    cardId: 'SHEETS-QUOTA-HARDENING-001',
    closeoutKey: 'sheets-quota-hardening-v1',
    related: [{ id: 'SHEETS-QUOTA-HARDENING-001', lanes: ['done'] }],
    proofContains: ['process:ship-check', 'process:fanout-check'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'whatItDoes', pattern: /batchGet/i },
      { field: 'proofStatus', pattern: /Writes remain uncached|errors are not cached/i },
      { field: 'knownLimits', pattern: /Google Cloud quota increase/i },
      { field: 'reviewNext', pattern: /Phase C/i },
    ],
    missing: 'missing Sheets quota hardening closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for doctrine propagation',
    cardId: 'DOCTRINE-PROPAGATION-001',
    closeoutKey: 'doctrine-propagation-v1',
    related: [
      { id: 'DOCTRINE-PROPAGATION-001', lanes: ['done'] },
      { id: 'HIT-LIST-RECONCILE-001', lanes: ['scoped', 'done'] },
    ],
    proofContains: ['doctrine:propagation-check', 'process:ship-check', 'process:fanout-check', 'process:post-ship-fanout'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /private memory content is not copied/i },
      { field: 'knownLimits', pattern: /hardcoded.*doctrine source list/i },
      { field: 'reviewNext', pattern: /DECISION-AUTO-EMIT-001|Phase C/i },
    ],
    missing: 'missing doctrine propagation closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for decision auto-emit',
    cardId: 'DECISION-AUTO-EMIT-001',
    closeoutKey: 'decision-auto-emit-v1',
    related: [{ id: 'DECISION-AUTO-EMIT-001', lanes: ['done'] }],
    proofContains: ['decision:auto-emit', 'process:ship-check', 'process:fanout-check', 'process:post-ship-fanout'],
    exactProof: ['npm run foundation:verify'],
    text: [
      { field: 'proofStatus', pattern: /proposed candidates/i },
      { field: 'knownLimits', pattern: /does not lock decisions/i },
      { field: 'reviewNext', pattern: /Phase B is complete|Phase C/i },
    ],
    missing: 'missing decision auto-emit closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for doc archive and research curation',
    cardId: 'DOC-ARCHIVE-AUTO-001',
    backlogIds: ['DOC-ARCHIVE-AUTO-001', 'RESEARCH-CURATION-001'],
    closeoutKey: 'doc-archive-research-curation-v1',
    related: [
      { id: 'DOC-ARCHIVE-AUTO-001', lanes: ['done'] },
      { id: 'RESEARCH-CURATION-001', lanes: ['done'] },
    ],
    proofContains: ['phase-d:cleanup', 'process:ship-check', 'process:fanout-check', 'process:post-ship-fanout'],
    text: [{ field: 'proofStatus', pattern: /113 preserved files[\s\S]*zero auto-closures|zero auto-closures[\s\S]*113 preserved files/i }],
    missing: 'missing doc archive/research curation closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for rebuild-doc retire and archive retire',
    cardId: 'REBUILD-DOCS-RETIRE-001',
    backlogIds: ['REBUILD-DOCS-RETIRE-001', 'ARCHIVE-RETIRE-001'],
    closeoutKey: 'rebuild-docs-archive-retire-v1',
    related: [
      { id: 'REBUILD-DOCS-RETIRE-001', lanes: ['done'] },
      { id: 'ARCHIVE-RETIRE-001', lanes: ['done'] },
    ],
    proofContains: ['phase-d:cleanup', 'process:ship-check', 'process:fanout-check', 'process:post-ship-fanout'],
    text: [
      { field: 'proofStatus', pattern: /0 files were deleted|deleted 0 files/i },
      { field: 'knownLimits', pattern: /only delete card/i },
    ],
    missing: 'missing rebuild-doc/archive retire closeout',
  },
  {
    label: 'Recent Builds v2 carries closeout proof for exception curation and hit-list reconcile',
    cardId: 'EXCEPTION-CURATION-001',
    backlogIds: ['EXCEPTION-CURATION-001', 'HIT-LIST-RECONCILE-001'],
    closeoutKey: 'exception-hit-list-curation-v1',
    related: [
      { id: 'EXCEPTION-CURATION-001', lanes: ['done'] },
      { id: 'HIT-LIST-RECONCILE-001', lanes: ['done'] },
    ],
    proofContains: ['process:ship-check', 'process:fanout-check', 'process:post-ship-fanout'],
    text: [
      { field: 'proofStatus', pattern: /24 verifier exceptions/i },
      { field: 'knownLimits', pattern: /does not auto-import private Google Docs/i },
    ],
    missing: 'missing exception/hit-list closeout',
  },
]

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function fieldText(build = {}, field) {
  if (field === 'combined') return [build.whatChanged, build.whatItDoes, build.reviewNext].filter(Boolean).join(' ')
  const value = build[field]
  if (Array.isArray(value)) return value.join(' ')
  return String(value || '')
}

function findBuild(builds = [], expectation = {}) {
  return (builds || []).find(build => {
    const hasCard = (build.backlogIds || []).includes(expectation.cardId)
    if (!hasCard) return false
    if (expectation.closeoutKey) return build.closeoutKey === expectation.closeoutKey
    return true
  }) || null
}

function relatedBacklogOk(build = {}, related = []) {
  return related.every(expectation =>
    (build.relatedBacklog || []).some(item =>
      item.id === expectation.id &&
        (!expectation.lanes || expectation.lanes.includes(item.lane))
    )
  )
}

function proofOk(build = {}, expectation = {}) {
  const commands = build.proofCommands || []
  const exactProofOk = (expectation.exactProof || []).every(command => commands.includes(command))
  const containsOk = (expectation.proofContains || []).every(needle =>
    commands.some(command => command.includes(needle))
  )
  const minContainsOk = (expectation.minProofContains || []).every(rule =>
    commands.filter(command => command.includes(rule.needle)).length >= rule.count
  )
  return exactProofOk && containsOk && minContainsOk
}

function textOk(build = {}, expectation = {}) {
  return (expectation.text || []).every(rule => rule.pattern.test(fieldText(build, rule.field)))
}

function closeoutBuildOk(build, expectation = {}) {
  const expectedBacklogIds = expectation.backlogIds || [expectation.cardId]
  return Boolean(
    build?.operatorCloseout === true &&
      expectedBacklogIds.every(id => (build.backlogIds || []).includes(id)) &&
      relatedBacklogOk(build, expectation.related || []) &&
      proofOk(build, expectation) &&
      textOk(build, expectation) &&
      (!expectation.requiresReviewNext || Boolean(build.reviewNext)) &&
      (!expectation.requiresKnownLimits || Boolean(build.knownLimits?.length))
  )
}

export function evaluateFoundationRecentBuildsVerifier(input = {}) {
  const checks = []
  const {
    foundationBuildCloseoutValidation = {},
    foundationBuildCloseouts = [],
    foundationBuildLog = {},
    foundationFrontendSource = '',
    schemaVersion,
    plainEnglishSweepCardId = 'PLAIN-ENGLISH-SWEEP-001',
    recentBuildsUiCardId = 'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    systemRegistrationSweepCardId = 'SYSTEM-REGISTRATION-SWEEP-001',
  } = input

  const requiredBacklogIds = [
    ...REQUIRED_CLOSEOUT_BACKLOG_IDS,
    plainEnglishSweepCardId,
    recentBuildsUiCardId,
    systemRegistrationSweepCardId,
  ]
  addCheck(
    checks,
    foundationBuildCloseoutValidation.schemaVersion === schemaVersion &&
      (foundationBuildCloseoutValidation.invalidCloseoutKeys || []).length === 0 &&
      requiredBacklogIds.every(id => (foundationBuildCloseoutValidation.backlogIds || []).includes(id)) &&
      foundationBuildCloseouts.every(record =>
        record.whereItLives?.length &&
        record.proofCommands?.length &&
        record.reviewNext &&
        record.whatChanged &&
        record.whatItDoes &&
        record.whyItMatters
      ),
    'Foundation build closeout records satisfy the Recent Builds v2 schema',
    `${foundationBuildCloseoutValidation.closeoutCount || 0} closeouts / invalid=${(foundationBuildCloseoutValidation.invalidCloseoutKeys || []).length}`,
  )

  addCheck(
    checks,
    foundationBuildLog.schemaVersion === schemaVersion &&
      foundationBuildLog.summary?.closeoutBuilds >= 2 &&
      foundationBuildLog.summary?.backlogLinkedBuilds >= 2 &&
      foundationBuildLog.summary?.proofLinkedBuilds >= 2 &&
      Array.isArray(foundationBuildLog.groups) &&
      foundationBuildLog.groups.some(day => Array.isArray(day.systemGroups) && day.systemGroups.length) &&
      includesAll(foundationFrontendSource, [
        'renderBuildGroups',
        'renderBuildBacklogLinks',
        'Grouped by day and system',
        'v2 closeouts',
      ]),
    'api/foundation/build-log exposes operator-readable grouped closeouts',
    foundationBuildLog.summary
      ? `${foundationBuildLog.summary.closeoutBuilds} closeouts / ${foundationBuildLog.summary.backlogLinkedBuilds} backlog-linked / ${foundationBuildLog.summary.proofLinkedBuilds} proof-linked`
      : 'missing build log summary',
  )

  for (const expectation of RECENT_BUILD_CLOSEOUT_EXPECTATIONS) {
    const build = findBuild(foundationBuildLog.builds || [], expectation)
    addCheck(
      checks,
      closeoutBuildOk(build, expectation),
      expectation.label,
      build
        ? `${build.shortSha || 'no-sha'} / ${build.acceptanceState || build.closeoutKey || 'unknown'} / ${build.proofStatus || 'missing proof status'}`
        : expectation.missing,
    )
  }

  return {
    ok: checks.every(check => check.ok),
    cardId: VERIFIER_RECENT_BUILDS_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_RECENT_BUILDS_SPLIT_CLOSEOUT_KEY,
    checks,
  }
}

function findCard(backlogItems = [], cardId = '') {
  return (backlogItems || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey = '') {
  return (closeouts || []).find(record => record.key === closeoutKey) || null
}

export async function evaluateFoundationRecentBuildsVerifierOrchestration(input = {}) {
  const {
    foundationBuildCloseouts = [],
    foundationHub = {},
    foundationRecentBuildsVerifierSource = '',
    foundationVerifyRootSource = input.foundationVerifySource || '',
    packageJson = {},
    repoFileExists = async () => false,
    schemaVersion = 2,
  } = input
  const recentBuildsCloseoutVerifier = evaluateFoundationRecentBuildsVerifier({
    ...input,
    schemaVersion,
  })
  const checks = [...recentBuildsCloseoutVerifier.checks]
  const recentBuildsDogfood = buildFoundationRecentBuildsVerifierDogfoodProof()
  const backlogItems = input.backlogItems || foundationHub.backlogItems || []
  const rootLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const oldRootPatterns = [
    'const recentBuildsCloseoutVerifier = evaluateFoundationRecentBuildsVerifier({',
    'checks.push(...recentBuildsCloseoutVerifier.checks)',
  ]

  const orchestrationCard = findCard(backlogItems, VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CARD_ID)
  const orchestrationCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CLOSEOUT_KEY)
  addCheck(
    checks,
    orchestrationCard &&
      ['executing', 'done'].includes(orchestrationCard.lane) &&
      String(orchestrationCard.statusNote || '').includes(VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      orchestrationCloseout?.operatorCloseout === true &&
      (orchestrationCloseout.backlogIds || []).includes(VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CARD_ID) &&
      recentBuildsDogfood.ok === true &&
      recentBuildsCloseoutVerifier.checks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-recent-builds-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationRecentBuildsVerifierSource.includes('evaluateFoundationRecentBuildsVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationRecentBuildsVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('recentBuildsCloseoutOrchestrationVerifier.checks') &&
      oldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      rootLineCount < VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 moves Recent Builds closeout orchestration into the focused module',
    orchestrationCard
      ? `lane=${orchestrationCard.lane} dogfood=${recentBuildsDogfood.ok ? 'pass' : 'blocked'} recentBuildsChecks=${recentBuildsCloseoutVerifier.checks.filter(check => check.ok).length}/${recentBuildsCloseoutVerifier.checks.length} lines=${VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_BEFORE_LINES}->${rootLineCount}`
      : `missing ${VERIFIER_RECENT_BUILDS_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    recentBuildsCloseoutVerifier,
    dogfood: recentBuildsDogfood,
  }
}

function makeRelated(id, lane = 'done') {
  return { id, lane }
}

function makeSyntheticBuild(expectation = {}) {
  const relatedBacklog = (expectation.related || []).map(item => makeRelated(item.id, (item.lanes || ['done'])[0]))
  const commands = [
    ...(expectation.exactProof || []),
    ...(expectation.proofContains || []).map(needle => `npm run synthetic -- ${needle}`),
    ...(expectation.minProofContains || []).flatMap(rule =>
      Array.from({ length: rule.count }, (_, index) => `npm run synthetic-${index} -- ${rule.needle}`)
    ),
  ]
  return {
    operatorCloseout: true,
    closeoutKey: expectation.closeoutKey || `${expectation.cardId.toLowerCase()}-closeout`,
    shortSha: 'synthetic',
    acceptanceState: 'Verified',
    backlogIds: expectation.backlogIds || [expectation.cardId],
    relatedBacklog,
    proofCommands: commands,
    whatChanged: '31 Foundation nav stale operator changelog Recent Builds Slack current-day channel Foundation job runtime as visible next-run truth Missive current-day conversation coverage-by-target Coverage By Target Google Sheets drive_spreadsheet KPI / Supabase health probe plain-English Foundation UX standard stale unclear split completed proof.',
    whatItDoes: 'Overview -> Systems -> Backlog -> Recent Work server-start commit repo HEAD restart command stale executing done cards without proof scoped cards exactly one owner batchGet.',
    whyItMatters: 'Synthetic Recent Builds proof.',
    whereItLives: ['Runtime Health', 'Foundation > Backlog > Action Review', 'Worker Code Trust'],
    proofStatus: '61 channel items foundation:verify 100 conversation items 308,697 chars 14/14 tables 5/5 RPCs approval-file evidence served-code proof destination-record proof process gate claimed artifact existence actual script npm command startup commit LaunchAgent pid repo HEAD 24 explicit legacy exceptions synthetic missing-fanout Writes remain uncached errors are not cached private memory content is not copied proposed candidates 113 preserved files zero auto-closures 0 files were deleted 24 verifier exceptions.',
    reviewNext: 'coverage-by-target EXTRACT-RETRY-001 Action Router ACTION-REVIEW-APPLY-001 BACKLOG-HYGIENE-001 DEV-PROCESS-AUDIT-001 PROCESS-HOOKS-001 POST-SHIP-FAN-OUT-001 Stop and re-plan with Steve Wave 2 Phase C DECISION-AUTO-EMIT-001 Phase B is complete.',
    knownLimits: [
      'broad Slack history broad backfill EXTRACT-RETRY-001 auto-restart-on-push FOUNDATION-SURFACE-UPDATES-001 creates no new process cards manual/scripted gate script gate continuous liveness 90 days 2026-07-27 Google Cloud quota increase hardcoded doctrine source list does not lock decisions only delete card does not auto-import private Google Docs',
    ],
  }
}

export function buildSyntheticFoundationRecentBuildsVerifierProof() {
  const allRequiredIds = [
    ...REQUIRED_CLOSEOUT_BACKLOG_IDS,
    'PLAIN-ENGLISH-SWEEP-001',
    'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    'SYSTEM-REGISTRATION-SWEEP-001',
  ]
  const closeoutTemplate = id => ({
    key: `${id.toLowerCase()}-closeout`,
    backlogIds: [id],
    whereItLives: ['Synthetic'],
    proofCommands: ['npm run foundation:verify'],
    reviewNext: 'No next action.',
    whatChanged: 'Synthetic change.',
    whatItDoes: 'Synthetic behavior.',
    whyItMatters: 'Synthetic proof.',
  })
  const healthyInput = {
    schemaVersion: 2,
    foundationBuildCloseoutValidation: {
      schemaVersion: 2,
      closeoutCount: allRequiredIds.length,
      invalidCloseoutKeys: [],
      backlogIds: allRequiredIds,
    },
    foundationBuildCloseouts: allRequiredIds.map(closeoutTemplate),
    foundationBuildLog: {
      schemaVersion: 2,
      summary: {
        closeoutBuilds: RECENT_BUILD_CLOSEOUT_EXPECTATIONS.length,
        backlogLinkedBuilds: RECENT_BUILD_CLOSEOUT_EXPECTATIONS.length,
        proofLinkedBuilds: RECENT_BUILD_CLOSEOUT_EXPECTATIONS.length,
      },
      groups: [{ day: 'synthetic', systemGroups: [{ systemArea: 'Synthetic', builds: [] }] }],
      builds: RECENT_BUILD_CLOSEOUT_EXPECTATIONS.map(makeSyntheticBuild),
    },
    foundationFrontendSource: 'renderBuildGroups renderBuildBacklogLinks Grouped by day and system v2 closeouts',
    plainEnglishSweepCardId: 'PLAIN-ENGLISH-SWEEP-001',
    recentBuildsUiCardId: 'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    systemRegistrationSweepCardId: 'SYSTEM-REGISTRATION-SWEEP-001',
  }
  const healthy = evaluateFoundationRecentBuildsVerifier(healthyInput)
  const missingProof = evaluateFoundationRecentBuildsVerifier({
    ...healthyInput,
    foundationBuildLog: {
      ...healthyInput.foundationBuildLog,
      builds: healthyInput.foundationBuildLog.builds.map((build, index) =>
        index === 0 ? { ...build, proofCommands: [] } : build
      ),
    },
  })
  const invalidSchema = evaluateFoundationRecentBuildsVerifier({
    ...healthyInput,
    foundationBuildCloseoutValidation: {
      ...healthyInput.foundationBuildCloseoutValidation,
      invalidCloseoutKeys: ['synthetic-invalid'],
    },
  })
  const missingWhereItLives = evaluateFoundationRecentBuildsVerifier({
    ...healthyInput,
    foundationBuildCloseouts: healthyInput.foundationBuildCloseouts.map((closeout, index) =>
      index === 0 ? { ...closeout, whereItLives: [] } : closeout
    ),
  })

  return {
    ok: healthy.ok === true &&
      missingProof.ok === false &&
      invalidSchema.ok === false &&
      missingWhereItLives.ok === false,
    healthy: {
      ok: healthy.ok,
      checkCount: healthy.checks.length,
      failures: healthy.checks.filter(check => !check.ok).map(check => check.check),
    },
    missingProofRejected: missingProof.ok === false,
    invalidSchemaRejected: invalidSchema.ok === false,
    missingWhereItLivesRejected: missingWhereItLives.ok === false,
  }
}

export const buildFoundationRecentBuildsVerifierDogfoodProof = buildSyntheticFoundationRecentBuildsVerifierProof
