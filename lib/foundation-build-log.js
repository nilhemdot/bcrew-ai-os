export const FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION = 2

const closeoutRecords = [
  {
    key: 'foundation-surface-sweep-v1',
    backlogIds: ['FOUNDATION-SWEEP-001'],
    match: {
      shortShas: ['7e97658'],
      subjectIncludes: ['Close Foundation surface sweep'],
    },
    systemArea: 'Foundation visibility',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Mapped every Foundation nav page to its backing API, docs, tables, source IDs, and backlog owner, then added stale source-crawl run detection.',
    whatItDoes: 'Lets Runtime Health show whether Foundation surfaces are still backed by live truth and whether a crawl/job has silently rotted.',
    whyItMatters: 'Steve no longer has to discover stale pages or stuck crawl runs by reading code, chat history, or raw database rows.',
    whereItLives: [
      'Foundation > Runtime Health > Foundation Surface Sweep',
      'lib/foundation-surface-map.js',
      'lib/foundation-db.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'passed 99/99 after dashboard restart',
    reviewNext: 'Review Runtime Health when nav pages, source contracts, jobs, docs, or hub links change.',
    knownLimits: [
      'Existing seed/live backlog drift is still reported, not solved.',
      'Health Auditor and Cleanup Agent remain deferred future cards.',
    ],
  },
  {
    key: 'foundation-recent-builds-v2',
    backlogIds: ['FOUNDATION-CHANGELOG-002'],
    match: {
      subjectIncludes: ['FOUNDATION-CHANGELOG-002'],
    },
    systemArea: 'Foundation visibility',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Upgraded Recent Builds from a commit/file list into an operator changelog with closeout records, backlog links, proof commands, review-next notes, and known limits.',
    whatItDoes: 'Groups recent repo work by day and system area so Steve can see what shipped, what it does, where it lives, and what to inspect next.',
    whyItMatters: 'A heavy AI build day has to explain itself through Foundation instead of relying on long chat memory or raw git logs.',
    whereItLives: [
      'Foundation > Recent Builds',
      '/api/foundation/build-log',
      'lib/foundation-build-log.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'passed 103/103 after dashboard restart',
    reviewNext: 'Open Recent Builds and confirm the newest Foundation Visibility group answers what changed, proof, backlog status, and what remains.',
    knownLimits: [
      'This is a repo-truth closeout layer, not a separate build-record database yet.',
      'Older commits without closeout metadata still show derived summaries until major closeouts are backfilled.',
    ],
  },
  {
    key: 'slack-current-day-channel-proof',
    backlogIds: ['EXTRACTION-TEAM-001', 'EXTRACT-CONTROL-001'],
    match: {
      subjectIncludes: ['EXTRACTION-TEAM-001 Slack current-day item proof'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Hardened the Slack current-day extraction lane so each channel writes source_crawl_items, then exposed extraction item summaries and health findings in Runtime Health.',
    whatItDoes: 'Turns a stale or opaque Slack crawl into visible channel-level proof: succeeded channels, skipped channels, failed channel items, stale reaped runs, and schedule mismatches can be inspected from Foundation.',
    whyItMatters: 'A green or failed target run alone is not enough for operations monitoring. Steve needs to see what was actually crawled, what was skipped, and whether stale runner state is still hiding.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control',
      'scripts/sync-slack-archive.mjs',
      'scripts/run-extraction-target.mjs',
      'lib/foundation-db.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run extraction:target -- --target=slack-current-day --force=true --actor=codex-slack-proof',
      'npm run foundation:verify',
    ],
    proofStatus: 'Slack proof run succeeded with 61 channel items; foundation:verify passed 106/106 after dashboard restart.',
    reviewNext: 'Review Runtime Health for extraction targets with failed/skipped items and reconcile the Foundation-job next run against target next_run_at.',
    knownLimits: [
      'This improves one Slack current-day lane; it is not broad Slack history backfill.',
      'Schedule reconciliation, failed-item retry/backoff, and coverage-by-target views remain open.',
      'Drive, email attachment, meeting video, multimodal, Scoper, Strategy UI, Agent Factory, Health Auditor, and Cleanup Agent work remain out of this slice.',
    ],
  },
  {
    key: 'extract-control-schedule-truth',
    backlogIds: ['EXTRACT-CONTROL-001', 'EXTRACT-SCHEDULE-001'],
    match: {
      subjectIncludes: ['EXTRACT-CONTROL-001 reconcile schedule truth'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Reconciled extraction schedule display so scheduled crawl targets use Foundation job runtime as visible next-run truth while target next_run_at is preserved as runner checkpoint metadata.',
    whatItDoes: 'Removes the dual-schedule ambiguity in Runtime Health: operators see the Foundation job schedule for scheduled targets, and the target checkpoint is labeled separately as crawlCheckpointNextRunAt.',
    whyItMatters: 'When a job and target disagree after a stale or manual run, Steve should not have to guess which clock controls the next run.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control',
      'lib/foundation-db.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed 110/110 after dashboard restart.',
    reviewNext: 'Ship coverage-by-target as the next separate EXTRACT-CONTROL-001 slice after checking source_crawl_items shape consistency across Drive, video, attachments, meetings, Gmail, Missive, and Slack.',
    knownLimits: [
      'This is schedule reconciliation only; it does not build coverage-by-target.',
      'Failed-item retry/backoff remains parked in EXTRACT-RETRY-001.',
      'Drive, email, video, Strategy UI, Scoper, Agent Factory, Health Auditor, and Cleanup Agent work remain out of this slice.',
    ],
  },
  {
    key: 'extract-metrics-missive-item-ledger',
    backlogIds: ['EXTRACT-METRICS-001', 'EXTRACT-CONTROL-001'],
    match: {
      subjectIncludes: ['EXTRACT-METRICS-001 normalize Missive item ledger'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Persisted the extraction lane item-shape inspection, then normalized Missive current-day so each selected conversation writes a source_crawl_items row with succeeded/skipped/failed state and reason metadata.',
    whatItDoes: 'Makes Missive visible in Runtime Health at the same item-ledger layer as Gmail, Slack, meetings, Drive, attachments, and video extraction before the coverage-by-target UI is built.',
    whyItMatters: 'Coverage-by-target would be misleading if one successful current-day lane had zero item rows. Operators need to see what Missive inspected, what was already current, what was empty, and whether any conversations failed.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control',
      'scripts/sync-missive-archive.mjs',
      'scripts/run-extraction-target.mjs',
      'docs/audits/2026-04-28-extraction-lane-item-shape.md',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run extraction:target -- --target=missive-current-day --force=true --actor=codex-missive-ledger-proof',
      'npm run foundation:verify',
    ],
    proofStatus: 'Missive proof run succeeded with 100 conversation items, 17 succeeded, 83 skipped, and 0 failed; foundation:verify passed 114/114 after dashboard restart.',
    reviewNext: 'Build the EXTRACT-METRICS-001 coverage-by-target panel and then close EXTRACT-CONTROL-001 v1, leaving retry/backoff in EXTRACT-RETRY-001.',
    knownLimits: [
      'This normalizes Missive item proof; it does not ship the coverage-by-target UI.',
      'Drive content still has 4 failed crawl items that belong to EXTRACT-RETRY-001, not this slice.',
      'No Drive/email/video expansion, Strategy UI, Scoper, Agent Factory, Health Auditor, or Cleanup Agent work is included.',
    ],
  },
  {
    key: 'extract-metrics-coverage-by-target',
    backlogIds: ['EXTRACT-METRICS-001', 'EXTRACT-CONTROL-001', 'FOUNDATION-SURFACE-UPDATES-001'],
    match: {
      subjectIncludes: ['EXTRACT-METRICS-001 build coverage-by-target panel'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added a Runtime Health coverage-by-target panel for extraction targets with last success, last failure, next bite, item totals, top failed/skipped reasons, and remaining backlog indicators where the lane exposes them.',
    whatItDoes: 'Turns the extraction control plane from individual target cards into a per-target operator readout that shows current-day, backfill, corpus, and recovery lanes on the same coverage contract.',
    whyItMatters: 'EXTRACT-CONTROL-001 v1 needed a usable surface for Steve to see what ran, what skipped, what failed, and what remains before choosing retry/backoff or another corpus lane.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control: Coverage By Target',
      '/api/foundation-hub',
      'lib/foundation-db.js',
      'public/foundation.js',
      'scripts/foundation-verify.mjs',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed 117/117 after dashboard restart on localhost:3000.',
    reviewNext: 'Use the coverage panel to pick the next evidence-based extraction slice. Failed-item retry/backoff stays in EXTRACT-RETRY-001; broader Drive/email/video expansion still waits for Runtime Health evidence.',
    knownLimits: [
      'This does not execute retry/backoff for failed items.',
      'Remaining backlog indicators only appear where the current lane already exposes them.',
      'FOUNDATION-SURFACE-UPDATES-001 was added as a follow-up card for app-surface breadcrumbs and updated markers, but it was not built in this slice.',
      'The earlier synthesis snapshot repair in 00c426d remains folded into this closeout as prerequisite verifier/live-state cleanup.',
    ],
  },
  {
    key: 'drive-content-sheets-text-extraction',
    backlogIds: ['DRIVE-CONTENT-001', 'EXTRACTION-TEAM-001', 'RUNTIME-SUPERVISOR-001', 'SYSTEM-010'],
    match: {
      subjectIncludes: ['DRIVE-CONTENT-001 add Drive Sheets text extraction'],
    },
    systemArea: 'Foundation extraction',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added Google Sheets text extraction to the Drive content lane and made the scheduled target retry existing sheet_text_extraction_not_in_v1 skips.',
    whatItDoes: 'Reads bounded Google Sheet values through the Sheets API, stores drive_spreadsheet source artifacts, and clears sheet skipped rows through the same source_crawl_items ledger as Drive Docs/PDF/text extraction.',
    whyItMatters: 'The coverage-by-target panel showed Sheets as the largest actionable Drive content skip. This hardens one missing corpus lane without broad Drive expansion or retry/backoff work.',
    whereItLives: [
      'Foundation > Runtime Health > Extraction Control: Coverage By Target',
      'scripts/extract-drive-content.mjs',
      'scripts/run-extraction-target.mjs',
      'scripts/seed-extraction-control.mjs',
      'lib/google-delegated.js',
      'lib/foundation-db.js',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    proofCommands: [
      'npm run extraction:target -- --target=drive-content-extract-backfill --force=true --actor=codex-drive-sheets-proof',
      'npm run foundation:verify',
    ],
    proofStatus: 'Drive Sheets proof run inspected 5 existing sheet-skipped items, archived 5 drive_spreadsheet artifacts / 308,697 chars, and recorded 0 crawl item failures; foundation:verify passed 120/120 after dashboard restart on localhost:3000.',
    reviewNext: 'Read Runtime Health coverage again. With failed items cleared, choose between remaining Drive content skipped reasons, email image/calendar attachment gaps, video transcript gaps, and Drive corpus backlog indicators.',
    knownLimits: [
      'This reads bounded sheet values; it does not implement Sheets formulas/notes/comments as a full spreadsheet intelligence lane.',
      'Slides, Office files, shortcuts, high-confidence handwriting/screenshots, and Drive media remain separate follow-on lanes.',
      'Retry/backoff remains parked in EXTRACT-RETRY-001 unless failed items reappear in Runtime Health.',
      'SYSTEM-010 served-code/deploy freshness is now explicitly tracked, not solved in this slice.',
    ],
  },
  {
    key: 'kpi-health-supabase-probe',
    backlogIds: ['KPI-HEALTH-001', 'SOURCE-010'],
    match: {
      subjectIncludes: ['KPI-HEALTH-001 add KPI Supabase health probe'],
    },
    systemArea: 'Foundation source health',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added a read-only KPI / Supabase health probe and surfaced it in Foundation Data Sources, with Runtime Health warnings only when unhealthy.',
    whatItDoes: 'Checks the locked KPI read model against live Supabase and the Lee zahnd-team-dashboard repo: 14 load-bearing tables, 5 RPCs, per-source freshness windows, expected columns/output fields, and table/RPC references in the KPI app code or migrations.',
    whyItMatters: 'Steve uses KPI numbers in Sales, finance, Owners pulse, competition, usage, and weekly operator conversations. This catches stale data or schema/code drift before the dashboard silently gives wrong numbers in a meeting.',
    whereItLives: [
      'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health',
      'Foundation > Runtime Health, KPI warning only when unhealthy',
      '/api/source-of-truth > kpiHealth',
      '/api/foundation-hub > kpiHealth',
      'npm run kpi:health',
      'lib/kpi-health.js',
      'scripts/foundation-verify.mjs',
      'docs/source-notes/kpi-dashboard.md',
    ],
    proofCommands: [
      'npm run kpi:health',
      'npm run foundation:verify',
    ],
    proofStatus: 'KPI health probe passed for 14/14 tables and 5/5 RPCs with schema drift healthy; foundation:verify passed on localhost:3000 after dashboard restart.',
    reviewNext: 'Read Action Router pending/apply state, KPI health, synthesis quality, and extraction coverage before picking the next slice. With KPI healthy and failed crawl items still at 0, the likely next area is an Action Router review/apply/resolution slice, not retry/backoff or another corpus lane.',
    knownLimits: [
      'This does not rebuild KPI or create Sales Hub coaching workflows.',
      'This does not apply Action Router routes or improve review UX.',
      'This does not add extraction retry/backoff, Strategy UI, Scoper, or Agent Factory work.',
      'Freshness warnings are surfaced as operator health findings; only broken probe/schema/RPC/read-rule drift fails the script.',
    ],
  },
  {
    key: 'foundation-operator-ux-capture',
    backlogIds: [
      'FOUNDATION-SURFACE-UPDATES-001',
      'ACTION-REVIEW-APPLY-001',
      'RESEARCH-INBOX-001',
      'RUNTIME-HEALTH-SIMPLIFY-001',
    ],
    match: {
      subjectIncludes: ['FOUNDATION-SURFACE-UPDATES-001 capture operator UX backlog'],
    },
    systemArea: 'Foundation planning',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Captured Steve’s plain-English Foundation UX standard, expanded the Recent Work/Overview backlog card, and added the next Action Router review/apply child card plus parked Research Inbox and Runtime Health simplification cards.',
    whatItDoes: 'Turns a long planning conversation into repo truth: Foundation should read like a CEO dashboard for system-building, daily nav should be Overview -> Systems -> Backlog -> Recent Work, done velocity should become visible, and the next build should be Action Router review/apply instead of another extraction lane.',
    whyItMatters: 'This prevents the rebuild plan, UI phase labels, backlog, and chat memory from becoming four competing sources of truth. Steve should be able to see what is next, what shipped, and why without decoding technical terms.',
    whereItLives: [
      'Foundation > Overview, future CEO-dashboard pattern',
      'Foundation > Backlog, ACTION-REVIEW-APPLY-001',
      'Foundation > Recent Work, future collapsed closeout cards',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-db.js',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed after the capture pass; verifier guards the new cards, plain-English standard, nav target, command-order warning, and parked follow-ups.',
    reviewNext: 'Build ACTION-REVIEW-APPLY-001 next: pending routes panel, Approve/Reject, Apply confirmation with destination-record proof, aged-route visibility, verifier coverage, and closeout. After that, stop and re-plan with Steve before auto-picking another Foundation slice.',
    knownLimits: [
      'This captures backlog and plan truth; it does not yet move the nav or build the Recent Work UX.',
      'This does not simplify Runtime Health yet.',
      'This does not build Research Inbox ingestion or Scoper/dev-intelligence.',
      'This does not change Action Router behavior yet; it only creates the child card and next-slice acceptance.',
    ],
  },
  {
    key: 'runtime-supervisor-served-code-trust',
    backlogIds: ['RUNTIME-SUPERVISOR-001', 'SYSTEM-010', 'ACTION-REVIEW-APPLY-001'],
    match: {
      subjectIncludes: ['RUNTIME-SUPERVISOR-001 add served-code trust check'],
    },
    systemArea: 'Foundation runtime',
    status: 'hardened',
    acceptanceState: 'Verified',
    whatChanged: 'Added a served-code trust check so Foundation can prove the dashboard is running the same commit as the current repo.',
    whatItDoes: 'The dashboard captures its server-start commit once at startup, exposes it in Runtime Health, and foundation:verify compares that running commit to repo HEAD. If the dashboard is stale, the verifier prints the exact restart command.',
    whyItMatters: 'Reviewers need verifier output they can trust after a build ships, not only during the minute Codex restarted the dashboard. This protects the measuring stick before the Action Router review/apply UI is built.',
    whereItLives: [
      'Foundation > Runtime Health > Dashboard Code Trust',
      '/api/foundation-hub > runtimeSupervisor.servedCode',
      'server.js startup metadata',
      'scripts/foundation-verify.mjs served-code check',
      'lib/foundation-db.js RUNTIME-SUPERVISOR-001 / SYSTEM-010 backlog truth',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed after dashboard restart on localhost:3000; the verifier now fails if the served dashboard commit does not match repo HEAD.',
    reviewNext: 'Return immediately to ACTION-REVIEW-APPLY-001: Foundation > Backlog > Action Review, pending routes panel, Approve/Reject, Apply confirmation, destination-record proof, aged-route visibility, verifier coverage, and closeout. After that, stop and re-plan with Steve.',
    knownLimits: [
      'This does not add auto-restart-on-push yet; it makes stale served code visible and actionable.',
      'This does not complete all SYSTEM-010 process controls, dead-man checks, or cost controls.',
      'This does not build Action Router review/apply UI yet.',
    ],
  },
  {
    key: 'backlog-hygiene-pass',
    backlogIds: [
      'BACKLOG-HYGIENE-PASS-001',
      'BACKLOG-HYGIENE-001',
      'DEV-PROCESS-AUDIT-001',
      'PROCESS-HOOKS-001',
      'FOUNDATION-SURFACE-UPDATES-001',
      'DOC-AUTHORITY-001',
      'DATA-004',
      'SOURCE-021',
      'SOURCE-021-PROOF-001',
      'SECURITY-001',
      'SECURITY-006',
    ],
    match: {
      subjectIncludes: ['BACKLOG-HYGIENE-PASS-001 clean stale backlog lanes'],
    },
    systemArea: 'Foundation backlog',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Cleaned stale and unclear backlog lanes, split completed proof from remaining work, and created the structural hygiene/process cards before returning to product UI.',
    whatItDoes: 'Moves the backlog closer to being the actual build control plane: done work is no longer left in executing, partial cards keep only the remaining work, inactive security work is scoped instead of pretending to be in progress, and the next prevention cards are explicit.',
    whyItMatters: 'Steve should not have to manually notice stale doing cards. Foundation has to show what is active, done, scoped, and next before Codex builds more features.',
    whereItLives: [
      'Foundation > Backlog, lane/status truth',
      'Foundation > Recent Builds, this closeout',
      'docs/rebuild/current-plan.md, backlog-pulled and 9.8 plan-gate doctrine',
      'docs/rebuild/current-state.md, current command order',
      'lib/foundation-db.js, live/seed backlog card truth',
      'scripts/foundation-verify.mjs, hygiene outcome checks',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed after the hygiene pass; verifier guards the new hygiene/process cards and the cleaned status of the known stale executing cards.',
    reviewNext: 'Plan BACKLOG-HYGIENE-001 next under the 9.8 review gate: automatic findings for stale executing cards, missing closeout proof, and cards whose evidence says done but lane still says active. After hygiene/probe/process gates, return to ACTION-REVIEW-APPLY-001.',
    knownLimits: [
      'This is the one-time cleanup pass, not the autonomous probe.',
      'Recent Builds / Recent Work breadcrumb and link UX remains grouped under FOUNDATION-SURFACE-UPDATES-001.',
      'Pre-commit and post-ship hooks remain scoped under PROCESS-HOOKS-001.',
      'Action Router review/apply UI is still not built.',
    ],
  },
  {
    key: 'backlog-hygiene-probe',
    backlogIds: [
      'BACKLOG-HYGIENE-001',
      'BACKLOG-HYGIENE-PASS-001',
      'DEV-PROCESS-AUDIT-001',
      'PROCESS-HOOKS-001',
    ],
    match: {
      subjectIncludes: ['BACKLOG-HYGIENE-001 add automatic backlog hygiene probe'],
    },
    systemArea: 'Foundation backlog',
    status: 'hardened',
    acceptanceState: 'Verified',
    whatChanged: 'Added an automatic read-only backlog hygiene probe with CLI proof, Foundation API payload, Runtime Health visibility, and verifier coverage.',
    whatItDoes: 'Scans live backlog cards for stale executing work, done cards without proof, executing cards that sound done, scoped cards that sound active, and active P0 cards missing process-gate clarity. Findings explain the card, evidence, and recommended action in plain English.',
    whyItMatters: 'Steve should not be the stale-card detector. Foundation now warns when the backlog stops matching the work before the team drifts into another chat-only plan.',
    whereItLives: [
      'Foundation > Runtime Health > Backlog Hygiene',
      '/api/foundation-hub > backlogHygiene',
      'npm run backlog:hygiene',
      'lib/backlog-hygiene.js',
      'scripts/backlog-hygiene.mjs',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run backlog:hygiene -- --includeSynthetic=true',
      'npm run foundation:verify',
    ],
    proofStatus: 'Backlog hygiene proof includes a synthetic stale executing card finding; foundation:verify guards the CLI, API, Runtime Health panel, closeout, and known-cleaned card regression set.',
    reviewNext: 'Build DEV-PROCESS-AUDIT-001 next, then PROCESS-HOOKS-001, then return to ACTION-REVIEW-APPLY-001 after process enforcement is in place.',
    knownLimits: [
      'Read-only only; it does not auto-move cards.',
      'Pre-commit and post-ship enforcement remains in PROCESS-HOOKS-001.',
      'Recent Builds / Recent Work UX remains in FOUNDATION-SURFACE-UPDATES-001.',
      'Info-level findings are CLI-only in v1 to keep Runtime Health readable.',
    ],
  },
]

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

function unique(values) {
  const seen = new Set()
  return normalizeList(values).filter(value => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractBacklogIds(text) {
  const matches = String(text || '').match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/g)
  return unique(matches || [])
}

function matchesSubject(subject, phrases) {
  const normalizedSubject = String(subject || '').toLowerCase()
  return normalizeList(phrases).some(phrase => normalizedSubject.includes(phrase.toLowerCase()))
}

function closeoutMatchesCommit(closeout, commit = {}) {
  const match = closeout.match || {}
  const sha = String(commit.sha || '')
  const shortSha = String(commit.shortSha || '')
  if (normalizeList(match.shas).some(value => sha === value || sha.startsWith(value))) return true
  if (normalizeList(match.shortShas).some(value => shortSha === value || sha.startsWith(value))) return true
  if (matchesSubject(commit.subject, match.subjectIncludes)) return true
  return false
}

function inferOperatorStatus(subject) {
  if (/(close|closed|done|ship|shipped|accept|accepted|verify|verified)/i.test(subject || '')) {
    return 'shipped'
  }
  if (/(harden|repair|fix|guard|tighten)/i.test(subject || '')) return 'hardened'
  if (/(pin|record|checkpoint|document)/i.test(subject || '')) return 'recorded'
  return 'repo-change'
}

function defaultWhatItDoes(build) {
  const groups = normalizeList(build.fileGroups)
  if (groups.length) return `Updates ${groups.join(', ')}.`
  return 'Updates repo truth.'
}

function defaultWhereItLives(build) {
  const files = normalizeList(build.primaryFiles)
  if (files.length) return files
  const groups = normalizeList(build.fileGroups)
  return groups.length ? groups : ['Repo']
}

export function getFoundationBuildCloseouts() {
  return closeoutRecords.map(record => ({
    ...record,
    backlogIds: normalizeList(record.backlogIds),
    whereItLives: normalizeList(record.whereItLives),
    proofCommands: normalizeList(record.proofCommands),
    knownLimits: normalizeList(record.knownLimits),
  }))
}

export function getFoundationBuildCloseoutValidation() {
  const closeouts = getFoundationBuildCloseouts()
  const requiredTextFields = [
    'key',
    'systemArea',
    'status',
    'acceptanceState',
    'whatChanged',
    'whatItDoes',
    'whyItMatters',
    'proofStatus',
    'reviewNext',
  ]
  const invalid = closeouts.filter(record =>
    requiredTextFields.some(field => !String(record[field] || '').trim()) ||
      !record.backlogIds.length ||
      !record.whereItLives.length ||
      !record.proofCommands.length
  )

  return {
    schemaVersion: FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
    closeoutCount: closeouts.length,
    invalidCloseoutKeys: invalid.map(record => record.key || '<missing-key>'),
    backlogIds: unique(closeouts.flatMap(record => record.backlogIds)),
  }
}

export function enrichFoundationBuildLogCommit(build) {
  const closeout = getFoundationBuildCloseouts().find(record => closeoutMatchesCommit(record, build)) || null
  const closeoutText = closeout
    ? [
        closeout.backlogIds.join(' '),
        closeout.whatChanged,
        closeout.whatItDoes,
        closeout.whyItMatters,
        closeout.reviewNext,
        closeout.knownLimits.join(' '),
      ].join(' ')
    : ''
  const inferredBacklogIds = extractBacklogIds([
    build.subject,
    normalizeList(build.files).join(' '),
    closeoutText,
  ].filter(Boolean).join(' '))
  const backlogIds = unique([
    ...(closeout ? closeout.backlogIds : []),
    ...inferredBacklogIds,
  ])
  const systemArea = closeout?.systemArea || normalizeList(build.areas)[0] || 'Repo'
  const status = closeout?.status || inferOperatorStatus(build.subject)

  return {
    ...build,
    operatorCloseout: Boolean(closeout),
    closeoutKey: closeout?.key || null,
    schemaVersion: closeout ? FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION : null,
    systemArea,
    primaryArea: systemArea,
    operatorStatus: status,
    acceptanceState: closeout?.acceptanceState || (status === 'repo-change' ? 'No v2 closeout attached' : 'Derived from commit'),
    backlogIds,
    whatChanged: closeout?.whatChanged || (build.subject ? `${build.subject}.` : 'Repo update.'),
    whatItDoes: closeout?.whatItDoes || defaultWhatItDoes(build),
    whyItMatters: closeout?.whyItMatters || 'Keeps the active repo moving, but this commit does not yet have a major-build closeout record.',
    whereItLives: closeout?.whereItLives || defaultWhereItLives(build),
    proofCommands: closeout?.proofCommands || [],
    proofStatus: closeout?.proofStatus || 'No explicit proof command attached.',
    reviewNext: closeout?.reviewNext || 'Review changed files only if this commit affects an active surface.',
    knownLimits: closeout?.knownLimits || [],
  }
}

export function attachBacklogCardsToBuilds(builds, backlogItems = []) {
  const backlogMap = new Map((backlogItems || []).map(item => [item.id, item]))
  return (builds || []).map(build => ({
    ...build,
    relatedBacklog: normalizeList(build.backlogIds).map(id => {
      const item = backlogMap.get(id)
      return item
        ? {
            id: item.id,
            title: item.title,
            scope: item.scope || item.team || null,
            lane: item.lane,
            priority: item.priority,
            owner: item.owner || null,
            updatedAt: item.updatedAt || item.updated_at || null,
          }
        : {
            id,
            title: null,
            scope: null,
            lane: null,
            priority: null,
            owner: null,
            updatedAt: null,
          }
    }),
  }))
}

export function summarizeFoundationBuildLog(builds = []) {
  const records = builds || []
  const closeoutBuilds = records.filter(build => build.operatorCloseout)
  const backlogLinked = records.filter(build => normalizeList(build.backlogIds).length)
  const proofLinked = records.filter(build => normalizeList(build.proofCommands).length)
  const reviewNext = records.filter(build => String(build.reviewNext || '').trim())
  const systemAreas = unique(records.map(build => build.systemArea || build.primaryArea || 'Repo'))
  const days = unique(records.map(build => String(build.committedAt || '').slice(0, 10)).filter(Boolean))

  return {
    totalBuilds: records.length,
    closeoutBuilds: closeoutBuilds.length,
    backlogLinkedBuilds: backlogLinked.length,
    proofLinkedBuilds: proofLinked.length,
    reviewNextBuilds: reviewNext.length,
    systemAreas,
    dayCount: days.length,
  }
}

export function groupFoundationBuildLog(builds = []) {
  const dayMap = new Map()
  ;(builds || []).forEach(build => {
    const day = String(build.committedAt || '').slice(0, 10) || 'unknown-date'
    const area = build.systemArea || build.primaryArea || 'Repo'
    if (!dayMap.has(day)) dayMap.set(day, new Map())
    const areaMap = dayMap.get(day)
    if (!areaMap.has(area)) areaMap.set(area, [])
    areaMap.get(area).push(build)
  })

  return Array.from(dayMap.entries()).map(([day, areaMap]) => ({
    day,
    systemGroups: Array.from(areaMap.entries()).map(([systemArea, groupBuilds]) => ({
      systemArea,
      builds: groupBuilds,
    })),
  }))
}
