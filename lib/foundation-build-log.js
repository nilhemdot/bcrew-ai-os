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
  {
    key: 'dev-process-audit-hook-map',
    backlogIds: [
      'DEV-PROCESS-AUDIT-001',
      'PROCESS-HOOKS-001',
      'BACKLOG-HYGIENE-001',
      'RUNTIME-SUPERVISOR-001',
      'FOUNDATION-SURFACE-UPDATES-001',
      'ACTION-REVIEW-APPLY-001',
    ],
    match: {
      subjectIncludes: ['DEV-PROCESS-AUDIT-001 map failures to hooks'],
    },
    systemArea: 'Foundation process',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Documented the real 2026-04-28 dev-loop failures and converted them into enforceable hook requirements for the next process slice.',
    whatItDoes: 'Maps each failure to exactly one owner: Backlog Hygiene for stale lane findings, Runtime Supervisor for stale served code, Foundation Surface Updates for where-it-lives and plan/backlog UX, and Process Hooks for plan gates, post-ship proof, backlog update proof, and red-verifier stop behavior.',
    whyItMatters: 'Steve should not manually police backlog truth, plan gates, closeouts, dashboard freshness, or verifier trust. The system needs to stop those misses before feature work continues.',
    whereItLives: [
      'docs/audits/2026-04-28-dev-process-audit.md',
      'Foundation > Backlog, DEV-PROCESS-AUDIT-001',
      'Foundation > Backlog, PROCESS-HOOKS-001',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: ['npm run foundation:verify'],
    proofStatus: 'foundation:verify passed after the audit and hook requirements were added; verifier guards the audit file, required failure map, PROCESS-HOOKS-001 acceptance, and Recent Builds closeout.',
    reviewNext: 'Build PROCESS-HOOKS-001 next as narrow enforcement, then return to ACTION-REVIEW-APPLY-001, then stop and re-plan with Steve.',
    knownLimits: [
      'This audit does not build hooks.',
      'This audit does not redesign Recent Builds / Recent Work; that remains in FOUNDATION-SURFACE-UPDATES-001.',
      'This audit does not build Action Router review/apply UI.',
      'This audit creates no new process cards.',
    ],
  },
  {
    key: 'process-hooks-v1',
    backlogIds: [
      'PROCESS-HOOKS-001',
      'DEV-PROCESS-AUDIT-001',
      'ACTION-REVIEW-APPLY-001',
      'FOUNDATION-SURFACE-UPDATES-001',
      'RUNTIME-SUPERVISOR-001',
    ],
    match: {
      subjectIncludes: ['PROCESS-HOOKS-001 add process ship check'],
    },
    systemArea: 'Foundation process',
    status: 'hardened',
    acceptanceState: 'Verified',
    whatChanged: 'Added a v1 process ship check with evidence-based plan approval, closeout validation, served-code trust, and live verifier proof.',
    whatItDoes: 'Checks the target backlog card, plan approval file, approval score, approver, timestamp, seven closeout fields, where-it-lives metadata, proof commands, dashboard served commit, and default foundation:verify before a ship is trusted.',
    whyItMatters: 'Steve should not manually police whether Codex followed the build process. The repo now has a plain-English gate that fails when the ship is missing approval, closeout proof, live dashboard trust, or a green verifier.',
    whereItLives: [
      'scripts/process-ship-check.mjs',
      'docs/process/ship-check.md',
      'docs/process/approvals/PROCESS-HOOKS-001.json',
      'package.json script process:ship-check',
      'Foundation > Backlog, PROCESS-HOOKS-001',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run process:ship-check -- --card=PROCESS-HOOKS-001 --planApprovalRef=docs/process/approvals/PROCESS-HOOKS-001.json --closeoutKey=process-hooks-v1',
      'npm run foundation:verify',
    ],
    proofStatus: 'process:ship-check passed with approval-file evidence and live dashboard served-code proof; foundation:verify passed after dashboard restart.',
    reviewNext: 'Build ACTION-REVIEW-APPLY-001 next, then stop and re-plan with Steve.',
    knownLimits: [
      'V1 is a manual/scripted gate, not auto-installed as a Git hook.',
      'V1 does not redesign Recent Builds / Recent Work; that remains in FOUNDATION-SURFACE-UPDATES-001.',
      'V1 does not auto-move backlog cards.',
      'V1 does not build Action Router review/apply UI.',
    ],
  },
  {
    key: 'action-review-apply-v1',
    backlogIds: [
      'ACTION-REVIEW-APPLY-001',
      'ACTION-ROUTER-001',
      'PROCESS-HOOKS-001',
      'FOUNDATION-SURFACE-UPDATES-001',
    ],
    match: {
      subjectIncludes: ['ACTION-REVIEW-APPLY-001 add Foundation action review'],
    },
    systemArea: 'Foundation Backlog',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added the first Foundation Action Review surface under Backlog and exposed a Foundation action-review API for pending Action Router routes.',
    whatItDoes: 'Shows pending and approved routes in plain English, lets Steve approve or reject with a saved reason, applies approved routes into their destination ledger, and shows destination-record proof after apply.',
    whyItMatters: 'The intelligence spine only creates value when findings become real decisions, backlog work, questions, ignore/snooze records, or owner actions. This closes the first human review/apply loop without expanding Strategy UI or Scoper work.',
    whereItLives: [
      'Foundation > Backlog > Action Review',
      '/api/foundation/action-review',
      '/api/foundation/action-review/:routeId/review',
      'public/foundation.js',
      'public/styles.css',
      'lib/intelligence-action-router.js existing approve/apply helpers',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=ACTION-REVIEW-APPLY-001 --planApprovalRef=docs/process/approvals/ACTION-REVIEW-APPLY-001.json --closeoutKey=action-review-apply-v1',
    ],
    proofStatus: 'Foundation verifier and process gate passed with Action Review API/UI, reject-reason enforcement, destination proof checks, and served-code trust.',
    reviewNext: 'Stop and re-plan with Steve before picking another Foundation slice. Do not auto-pick Strategy UI, Scoper, Agent Factory, corpus expansion, retry/backoff, or more process work.',
    knownLimits: [
      'V1 does not prove high-volume route resolution feedback or recurrence prevention.',
      'V1 does not redesign Recent Work / Recent Builds where-it-lives links; that remains under FOUNDATION-SURFACE-UPDATES-001.',
      'V1 does not add owner reassignment, snooze, or ignore controls to Foundation Action Review; those remain available in Strategy route review where relevant.',
      'V1 does not automate backlog management beyond the existing hygiene probe and process gate.',
    ],
  },
  {
    key: 'process-fanout-v1-repair',
    backlogIds: [
      'PROCESS-FANOUT-001',
      'PROCESS-HOOKS-001',
      'BACKLOG-HYGIENE-001',
      'VERIFIER-DONE-COVERAGE-001',
      'VERIFIER-ARTIFACT-EXISTS-001',
      'WORKER-CODE-TRUST-001',
    ],
    match: {
      subjectIncludes: ['PROCESS-FANOUT-001 repair false-done fanout gate'],
    },
    systemArea: 'Foundation process',
    status: 'repaired',
    acceptanceState: 'Verified',
    whatChanged: 'Repaired PROCESS-FANOUT-001 by adding the actual process fanout check, plain-English doc, npm script, and verifier coverage for claimed artifact existence.',
    whatItDoes: 'Checks that a done card and closeout did not claim missing files, docs, scripts, Recent Builds proof, where-it-lives metadata, verifier proof, or stale served dashboard code.',
    whyItMatters: 'PROCESS-FANOUT-001 was marked done while claiming artifacts that did not exist. This repair makes the card true and prevents that same false-done class from passing quietly again.',
    whereItLives: [
      'scripts/process-fanout-check.mjs',
      'docs/process/ship-fanout.md',
      'package.json script process:fanout-check',
      'Foundation > Backlog, PROCESS-FANOUT-001',
      'scripts/foundation-verify.mjs',
      'lib/foundation-build-log.js closeout process-fanout-v1-repair',
    ],
    proofCommands: [
      'npm run process:fanout-check -- --card=PROCESS-FANOUT-001 --closeoutKey=process-fanout-v1-repair',
      'npm run process:ship-check -- --card=PROCESS-FANOUT-001 --planApprovalRef=docs/process/approvals/PROCESS-FANOUT-001.json --closeoutKey=process-fanout-v1-repair',
      'npm run foundation:verify',
    ],
    proofStatus: 'process:fanout-check, process:ship-check, and foundation:verify passed after the actual script, doc, npm command, and claimed-artifact verifier checks were added.',
    reviewNext: 'Open Wave 2: Cards 1+2 can combine verifier done-card coverage and artifact-exists checks in one chat, while Card 3 worker served-code trust can run in a parallel chat.',
    knownLimits: [
      'V1 is a script gate, not an automatic Git hook.',
      'V1 checks explicit claimed artifacts and the target closeout; it does not yet scan every historical done card for full ID-named verifier coverage.',
      'V1 does not add worker served-code trust; that remains WORKER-CODE-TRUST-001.',
      'V1 does not automate downstream fan-out updates; that remains POST-SHIP-FAN-OUT-001.',
    ],
  },
  {
    key: 'worker-code-trust-v1',
    backlogIds: [
      'WORKER-CODE-TRUST-001',
      'RUNTIME-SUPERVISOR-001',
      'SYSTEM-010',
      'PROCESS-FANOUT-001',
    ],
    match: {
      subjectIncludes: ['WORKER-CODE-TRUST-001 add worker served-code trust'],
    },
    systemArea: 'Foundation runtime',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added worker served-code trust so the supervised Foundation worker reports the code commit it started from.',
    whatItDoes: 'The worker writes its startup commit and process id into DB-backed runtime status. Foundation Hub exposes it, Runtime Health renders it, and foundation:verify compares it to repo HEAD and the LaunchAgent pid.',
    whyItMatters: 'The dashboard already proves it is serving current code. The worker also needs that proof because scheduled jobs can keep running old code in the background.',
    whereItLives: [
      'scripts/foundation-worker.mjs',
      'lib/foundation-db.js table foundation_runtime_status',
      '/api/foundation-hub > runtimeSupervisor.workerCode',
      'Foundation > Runtime Health > Worker Code Trust',
      'scripts/foundation-verify.mjs',
      'docs/process/approvals/WORKER-CODE-TRUST-001.json',
    ],
    proofCommands: [
      'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=WORKER-CODE-TRUST-001 --planApprovalRef=docs/process/approvals/WORKER-CODE-TRUST-001.json --closeoutKey=worker-code-trust-v1',
      'npm run process:fanout-check -- --card=WORKER-CODE-TRUST-001 --closeoutKey=worker-code-trust-v1',
    ],
    proofStatus: 'Worker restart captured the startup commit, Runtime Health exposed Worker Code Trust, process gates passed, and foundation:verify confirmed the worker startup commit and LaunchAgent pid match repo HEAD.',
    reviewNext: 'Complete Wave 2 Chat A after its revised 9.8 plan: VERIFIER-DONE-COVERAGE-001 plus VERIFIER-ARTIFACT-EXISTS-001.',
    knownLimits: [
      'V1 proves the worker startup commit and supervised process id. It does not prove continuous liveness after startup.',
      'Dead-man visibility, auto-restart-on-push, and broader process alarms remain under SYSTEM-010 / RUNTIME-SUPERVISOR-001.',
    ],
  },
  {
    key: 'verifier-done-artifact-gates',
    backlogIds: [
      'VERIFIER-DONE-COVERAGE-001',
      'VERIFIER-ARTIFACT-EXISTS-001',
      'PROCESS-FANOUT-001',
      'PROCESS-HOOKS-001',
      'SHEETS-QUOTA-HARDENING-001',
    ],
    match: {
      subjectIncludes: ['VERIFIER-DONE-COVERAGE-001 add done and artifact verifier gates'],
    },
    systemArea: 'Foundation verifier',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added verifier gates for done-card proof coverage and claimed artifact existence, plus a constrained exception ledger for historical cards.',
    whatItDoes: 'foundation:verify now fails when a done card has no ID-named verifier coverage and no valid exception, or when a done card/closeout claims a missing file, doc, npm script, or simple API route.',
    whyItMatters: 'This blocks the PROCESS-FANOUT-001 false-done failure class at the main Foundation verifier layer, not just in a one-off process script.',
    whereItLives: [
      'scripts/foundation-verify.mjs',
      'docs/process/verifier-exceptions.json',
      'docs/process/approvals/VERIFIER-DONE-COVERAGE-001.json',
      'docs/process/approvals/VERIFIER-ARTIFACT-EXISTS-001.json',
      'Foundation > Backlog, VERIFIER-DONE-COVERAGE-001',
      'Foundation > Backlog, VERIFIER-ARTIFACT-EXISTS-001',
      'Foundation > Recent Work closeout verifier-done-artifact-gates',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=VERIFIER-DONE-COVERAGE-001 --planApprovalRef=docs/process/approvals/VERIFIER-DONE-COVERAGE-001.json --closeoutKey=verifier-done-artifact-gates',
      'npm run process:ship-check -- --card=VERIFIER-ARTIFACT-EXISTS-001 --planApprovalRef=docs/process/approvals/VERIFIER-ARTIFACT-EXISTS-001.json --closeoutKey=verifier-done-artifact-gates',
      'npm run process:fanout-check -- --card=VERIFIER-DONE-COVERAGE-001 --closeoutKey=verifier-done-artifact-gates',
      'npm run process:fanout-check -- --card=VERIFIER-ARTIFACT-EXISTS-001 --closeoutKey=verifier-done-artifact-gates',
    ],
    proofStatus: 'foundation:verify caught the synthetic missing-proof card and synthetic missing file/script/API route, while live done cards passed through ID-named verifier coverage or 24 explicit legacy exceptions.',
    reviewNext: 'Open Wave 3 plan submissions: Card 4 POST-SHIP-FAN-OUT-001, with SHEETS-QUOTA-HARDENING-001 as an optional parallel Card 6.5 before Wave 5 parallel ramp.',
    knownLimits: [
      'V1 starts with 24 open-ended historical exceptions for done cards that predate the ID-named verifier coverage rule.',
      'The verifier counts total and open-ended exceptions; it fails missing fields, expired exceptions, and open-ended exceptions older than 90 days.',
      'Artifact parsing covers explicit files/docs, npm run scripts, and simple API routes. Ambiguous natural-language claims should be rewritten as concrete artifacts before closeout.',
      'SHEETS-QUOTA-HARDENING-001 was added as a scoped follow-up, not built in this slice.',
    ],
  },
  {
    key: 'post-ship-fanout-v1',
    backlogIds: [
      'POST-SHIP-FAN-OUT-001',
      'PROCESS-FANOUT-001',
      'PROCESS-HOOKS-001',
      'EXCEPTION-CURATION-001',
    ],
    match: {
      subjectIncludes: ['POST-SHIP-FAN-OUT-001 add post-ship fanout gate'],
    },
    systemArea: 'Foundation process',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added the post-ship fanout gate and scoped exception curation before the historical verifier exceptions expire.',
    whatItDoes: 'The new gate checks whether a shipped closeout updated the surrounding truth when code touches Backlog, verifier, Foundation UI, rebuild plan/state docs, or npm commands.',
    whyItMatters: 'A ship is not trustworthy if code moves but Backlog, Recent Work, Runtime Health, docs, or verifier proof do not move with it. This makes that drift visible before Steve has to catch it manually.',
    whereItLives: [
      'lib/post-ship-fanout.js',
      'scripts/process-post-ship-fanout.mjs',
      'docs/process/post-ship-fanout.md',
      'docs/process/approvals/POST-SHIP-FAN-OUT-001.json',
      'package.json npm script process:post-ship-fanout',
      'Foundation > Runtime Health > Post-Ship Fanout',
      'Foundation > Backlog, POST-SHIP-FAN-OUT-001',
      'Foundation > Backlog, EXCEPTION-CURATION-001',
      'Foundation > Recent Work closeout post-ship-fanout-v1',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=POST-SHIP-FAN-OUT-001 --planApprovalRef=docs/process/approvals/POST-SHIP-FAN-OUT-001.json --closeoutKey=post-ship-fanout-v1',
      'npm run process:fanout-check -- --card=POST-SHIP-FAN-OUT-001 --closeoutKey=post-ship-fanout-v1',
      'npm run process:post-ship-fanout -- --card=POST-SHIP-FAN-OUT-001 --closeoutKey=post-ship-fanout-v1 --commitRef=7335a8f',
    ],
    proofStatus: 'Post-ship fanout caught the synthetic missing-fanout case, Runtime Health exposed the latest fanout status, process gates passed, and foundation:verify guarded the new card, script, doc, npm command, closeout, and EXCEPTION-CURATION-001 follow-up.',
    reviewNext: 'Wave 4 remains before Phase C: ship DOCTRINE-PROPAGATION-001 and DECISION-AUTO-EMIT-001, then Phase B is complete.',
    knownLimits: [
      'V1 checks and reports missing fanout. It does not auto-edit backlog, docs, or UI metadata.',
      'The v1 rules are intentionally simple and documented in docs/process/post-ship-fanout.md.',
      'EXCEPTION-CURATION-001 is scoped only; it must triage the 24 historical verifier exceptions before 2026-07-27.',
    ],
  },
  {
    key: 'sheets-quota-hardening-v1',
    backlogIds: [
      'SHEETS-QUOTA-HARDENING-001',
      'POST-SHIP-FAN-OUT-001',
      'PROCESS-HOOKS-001',
    ],
    match: {
      subjectIncludes: ['SHEETS-QUOTA-HARDENING-001 add Sheets quota hardening'],
    },
    systemArea: 'Foundation runtime',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added Google Sheets read caching, batchGet support, and Runtime Health visibility for Sheets API quota pressure.',
    whatItDoes: 'Foundation now reuses recent read-only Sheets responses inside a short TTL, exposes cache hit/miss and recent 429 status, and reads Drive spreadsheet tabs through batchGet instead of one request per tab.',
    whyItMatters: 'Parallel ship gates repeatedly read the same Google Sheets sources. This reduces avoidable 429 quota failures without hiding real source failures or caching writes.',
    whereItLives: [
      'lib/google-sheets-cache.js',
      'lib/google-delegated.js',
      'scripts/extract-drive-content.mjs',
      'docs/process/sheets-quota-hardening.md',
      'docs/process/approvals/SHEETS-QUOTA-HARDENING-001.json',
      '/api/foundation-hub > sheetsApiTrust',
      'Foundation > Runtime Health > Sheets API Trust',
      'Foundation > Backlog, SHEETS-QUOTA-HARDENING-001',
      'Foundation > Recent Work closeout sheets-quota-hardening-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=SHEETS-QUOTA-HARDENING-001 --planApprovalRef=docs/process/approvals/SHEETS-QUOTA-HARDENING-001.json --closeoutKey=sheets-quota-hardening-v1',
      'npm run process:fanout-check -- --card=SHEETS-QUOTA-HARDENING-001 --closeoutKey=sheets-quota-hardening-v1',
    ],
    proofStatus: 'Sheets cache syntax and verifier checks passed; Runtime Health exposes Sheets API Trust; Drive Sheets extraction uses batchGet; writes remain uncached and Google API errors are not cached as healthy data.',
    reviewNext: 'Do not open Phase C yet. Wave 4 is DOCTRINE-PROPAGATION-001 and DECISION-AUTO-EMIT-001, then Phase B is complete.',
    knownLimits: [
      'This does not request the Google Cloud quota increase automatically; docs/process/sheets-quota-hardening.md gives the operator checklist.',
      'The cache is intentionally short-lived by default: 30 seconds.',
      'The cache file lives under store/, which is local-only and ignored by git.',
      'If the cache file has a problem, Foundation falls back to live reads and records the cache error in Sheets API Trust.',
    ],
  },
  {
    key: 'doctrine-propagation-v1',
    backlogIds: [
      'DOCTRINE-PROPAGATION-001',
      'POST-SHIP-FAN-OUT-001',
      'PROCESS-HOOKS-001',
      'HIT-LIST-RECONCILE-001',
    ],
    match: {
      subjectIncludes: ['WAVE4 close doctrine propagation and decision auto emit'],
    },
    systemArea: 'Foundation process',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added doctrine propagation so current build rules stay visible in the active bcrew-foundation skill, and scoped hit-list reconciliation as a follow-up.',
    whatItDoes: 'The check regenerates only the marked doctrine section in the local skill, verifies required Foundation doctrines are present, checks private memory files by timestamp only, and flags tier-two surfaces for review instead of auto-editing them.',
    whyItMatters: 'Future builders drift when the skill they load is older than the operating rules Steve approved. This keeps the working skill aligned without leaking private memory into repo truth.',
    whereItLives: [
      'lib/doctrine-propagation.js',
      'scripts/doctrine-propagation-check.mjs',
      'docs/process/doctrine-propagation.md',
      'docs/process/approvals/DOCTRINE-PROPAGATION-001.json',
      'package.json npm script doctrine:propagation-check',
      'bcrew-foundation skill generated doctrine section',
      '/api/foundation-hub > doctrinePropagation',
      'Foundation > Runtime Health > Doctrine Propagation',
      'Foundation > Backlog, DOCTRINE-PROPAGATION-001',
      'Foundation > Backlog, HIT-LIST-RECONCILE-001',
      'Foundation > Recent Work closeout doctrine-propagation-v1',
    ],
    proofCommands: [
      'npm run doctrine:propagation-check -- --apply',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=DOCTRINE-PROPAGATION-001 --planApprovalRef=docs/process/approvals/DOCTRINE-PROPAGATION-001.json --closeoutKey=doctrine-propagation-v1',
      'npm run process:fanout-check -- --card=DOCTRINE-PROPAGATION-001 --closeoutKey=doctrine-propagation-v1',
      'npm run process:post-ship-fanout -- --card=DOCTRINE-PROPAGATION-001 --closeoutKey=doctrine-propagation-v1 --commitRef=483da49',
    ],
    proofStatus: 'Doctrine propagation regenerated the marked skill section, synthetic stale-skill proof passed, Runtime Health exposes Doctrine Propagation, and private memory content is not copied into tracked repo truth.',
    reviewNext: 'DECISION-AUTO-EMIT-001 ships in the same Wave 4 closeout. After both Wave 4 cards are reviewed clean, Phase B is complete and Phase C visibility plans can open.',
    knownLimits: [
      'The hardcoded doctrine source list lives in lib/doctrine-propagation.js as plain-English summaries. New memory entries only trigger review; they do not auto-copy content.',
      'V1 flags SOUL.md, docs/users/steve.md, and future personas for human review instead of editing them automatically.',
      'HIT-LIST-RECONCILE-001 is scoped only; this slice does not ingest Steve’s external Google Doc.',
    ],
  },
  {
    key: 'decision-auto-emit-v1',
    backlogIds: [
      'DECISION-AUTO-EMIT-001',
      'POST-SHIP-FAN-OUT-001',
      'PROCESS-HOOKS-001',
    ],
    match: {
      subjectIncludes: ['DECISION-AUTO-EMIT-001 finalize decision auto emit closeout'],
    },
    systemArea: 'Foundation decisions',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added a dry-run-first decision auto-emitter that finds explicit decision language in commits or checkpoint text.',
    whatItDoes: 'The tool scans for Pin, Park, Defer, Pivot, Lock, Disable, Adopt, and Use X over Y language, classifies candidates into the existing four decision categories, deduplicates by source plus normalized title, and writes proposed decisions only when apply mode is explicitly used.',
    whyItMatters: 'Important decisions should not live only in chat or commit prose. This creates a safe proposed-decision path without automatically locking decisions or expanding the taxonomy.',
    whereItLives: [
      'lib/decision-auto-emit.js',
      'scripts/decision-auto-emit.mjs',
      'docs/process/decision-auto-emit.md',
      'docs/process/approvals/DECISION-AUTO-EMIT-001.json',
      'package.json npm script decision:auto-emit',
      '/api/foundation-hub > decisionAutoEmit',
      'Foundation > Decisions > Auto-Emitted Decisions',
      'Foundation > Backlog, DECISION-AUTO-EMIT-001',
      'Foundation > Recent Work closeout decision-auto-emit-v1',
    ],
    proofCommands: [
      'npm run decision:auto-emit -- --synthetic=true',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=DECISION-AUTO-EMIT-001 --planApprovalRef=docs/process/approvals/DECISION-AUTO-EMIT-001.json --closeoutKey=decision-auto-emit-v1',
      'npm run process:fanout-check -- --card=DECISION-AUTO-EMIT-001 --closeoutKey=decision-auto-emit-v1',
      'npm run process:post-ship-fanout -- --card=DECISION-AUTO-EMIT-001 --closeoutKey=decision-auto-emit-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Synthetic decision proof found proposed candidates, apply mode remains explicit, canonical category checks passed, Foundation Decisions shows Auto-Emitted Decisions, and foundation:verify guards the v1 safety boundaries.',
    reviewNext: 'After DOCTRINE-PROPAGATION-001 and DECISION-AUTO-EMIT-001 both ship, Phase B is complete. Then open Phase C plans for Cards 7-12.',
    knownLimits: [
      'V1 creates proposed decisions only. It does not lock decisions.',
      'V1 does not do broad historical backfill.',
      'V1 can miss decisions that do not use the explicit watched verbs.',
      'Unclear categories default to the closest existing category, usually system, with an evidence note.',
    ],
  },
  {
    key: 'card-reference-command-order-v1',
    backlogIds: [
      'PHANTOM-CARD-CHECK-001',
      'PHASE-NUMBERING-RECONCILE-001',
      'POST-SHIP-FAN-OUT-001',
    ],
    match: {
      subjectIncludes: ['PHANTOM-CARD-CHECK-001 and PHASE-NUMBERING-RECONCILE-001'],
    },
    systemArea: 'Foundation visibility',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added active card-reference trust and replaced the old Foundation phase labels with command-order traceability.',
    whatItDoes: 'The card-reference check scans active rebuild docs and Foundation code for backlog-card IDs that do not exist in the live backlog, proves the scanner with a synthetic phantom card, exposes Runtime Health > Card Reference Trust, and changes the Rebuild Plan UI panel to show the current work order instead of conflicting phase labels.',
    whyItMatters: 'Steve should not have to spot missing cards or decode two phase-numbering systems. If Foundation says a card owns work, that card must exist; if the UI shows a plan, it must match the way Steve actually runs the rebuild.',
    whereItLives: [
      'lib/card-reference-trust.js',
      'docs/process/approvals/PHANTOM-CARD-CHECK-001.json',
      'docs/process/approvals/PHASE-NUMBERING-RECONCILE-001.json',
      '/api/foundation-hub > cardReferenceTrust',
      'Foundation > Runtime Health > Card Reference Trust',
      'Foundation > Rebuild Plan > Command Order ↔ Live Backlog',
      'Foundation > Backlog, PHANTOM-CARD-CHECK-001',
      'Foundation > Backlog, PHASE-NUMBERING-RECONCILE-001',
      'Foundation > Recent Work closeout card-reference-command-order-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=PHANTOM-CARD-CHECK-001 --planApprovalRef=docs/process/approvals/PHANTOM-CARD-CHECK-001.json --closeoutKey=card-reference-command-order-v1',
      'npm run process:ship-check -- --card=PHASE-NUMBERING-RECONCILE-001 --planApprovalRef=docs/process/approvals/PHASE-NUMBERING-RECONCILE-001.json --closeoutKey=card-reference-command-order-v1',
      'npm run process:fanout-check -- --card=PHANTOM-CARD-CHECK-001 --closeoutKey=card-reference-command-order-v1',
      'npm run process:fanout-check -- --card=PHASE-NUMBERING-RECONCILE-001 --closeoutKey=card-reference-command-order-v1',
      'npm run process:post-ship-fanout -- --card=PHANTOM-CARD-CHECK-001 --closeoutKey=card-reference-command-order-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Active card-reference scan is healthy, synthetic phantom-card proof is caught, old Foundation phase labels are removed from the live UI traceability panel, and command-order labels are verifier-guarded.',
    reviewNext: 'Let Tracks 2 and 3 finish Phase C: sub-surface/system-inventory truth, then source-contract/verifier cleanup. Do not start Phase D until all Phase C tracks ship clean.',
    knownLimits: [
      'V1 scans active rebuild docs and Foundation code only. Historical handoffs, audits, specs, and archived docs are intentionally not blocking inputs yet.',
      'The UI command-order view does not replace the Rebuild Plan Phase 0-8 doctrine; it is the operator view of current work order.',
    ],
  },
  {
    key: 'subsurface-inventory-trueup-v1',
    backlogIds: [
      'SUB-SURFACE-MAPPING-001',
      'SYSTEM-INVENTORY-TRUE-UP-001',
      'RECENT-BUILDS-MULTI-CLOSEOUT-001',
      'FOUNDATION-SURFACE-UPDATES-001',
    ],
    match: {
      subjectIncludes: ['SUB-SURFACE-MAPPING-001 and SYSTEM-INVENTORY-TRUE-UP-001'],
    },
    systemArea: 'Foundation inventory',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Expanded the Foundation surface map to specific sub-surfaces and corrected System Inventory plugin discovery to show all nine configured plugin surfaces.',
    whatItDoes: 'The surface map now includes critical Runtime Health panels, Recent Work/Backlog/Data Source sub-surfaces, and Foundation API routes. System Inventory now reads plugin skills from curated, bundled, and primary-runtime plugin caches so Browser Use, Documents, Presentations, and Spreadsheets show alongside the existing connector plugins.',
    whyItMatters: 'Foundation should answer “where does this live?” and “what can this system do?” without forcing Steve to inspect files or chat history.',
    whereItLives: [
      'lib/foundation-surface-map.js',
      'server.js getPluginInventory',
      'docs/process/approvals/SUB-SURFACE-MAPPING-001.json',
      'docs/process/approvals/SYSTEM-INVENTORY-TRUE-UP-001.json',
      '/api/foundation-hub > surfaceFreshnessSweep',
      '/api/system-inventory > plugins',
      'Foundation > Runtime Health > Foundation Surface Sweep',
      'Foundation > Systems > System Inventory > Plugins / MCPs',
      'Foundation > Backlog, SUB-SURFACE-MAPPING-001',
      'Foundation > Backlog, SYSTEM-INVENTORY-TRUE-UP-001',
      'Foundation > Backlog, RECENT-BUILDS-MULTI-CLOSEOUT-001',
      'Foundation > Recent Work closeout subsurface-inventory-trueup-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=SUB-SURFACE-MAPPING-001 --planApprovalRef=docs/process/approvals/SUB-SURFACE-MAPPING-001.json --closeoutKey=subsurface-inventory-trueup-v1',
      'npm run process:ship-check -- --card=SYSTEM-INVENTORY-TRUE-UP-001 --planApprovalRef=docs/process/approvals/SYSTEM-INVENTORY-TRUE-UP-001.json --closeoutKey=subsurface-inventory-trueup-v1',
      'npm run process:fanout-check -- --card=SUB-SURFACE-MAPPING-001 --closeoutKey=subsurface-inventory-trueup-v1',
      'npm run process:fanout-check -- --card=SYSTEM-INVENTORY-TRUE-UP-001 --closeoutKey=subsurface-inventory-trueup-v1',
      'npm run process:post-ship-fanout -- --card=SUB-SURFACE-MAPPING-001 --closeoutKey=subsurface-inventory-trueup-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Surface map covers top-level nav plus critical sub-surfaces/API routes, System Inventory reports nine configured plugin surfaces, and RECENT-BUILDS-MULTI-CLOSEOUT-001 is scoped as a follow-up only.',
    reviewNext: 'Let Track 3 land source-contract cleanup and verifier consolidation. Do not start Phase D until all Phase C tracks ship clean.',
    knownLimits: [
      'System Inventory is config/filesystem-backed in v1, not live MCP introspection.',
      'RECENT-BUILDS-MULTI-CLOSEOUT-001 is scoped only; this slice does not rebuild Recent Work.',
      'Surface-map counts are a guardrail, not the value by themselves. Known critical panels and API route bindings are the real proof.',
    ],
  },
  {
    key: 'source-verifier-cleanup-v1',
    backlogIds: [
      'SOURCE-CONTRACT-CLEANUP-001',
      'VERIFIER-CONSOLIDATION-001',
      'POST-SHIP-FAN-OUT-001',
    ],
    match: {
      subjectIncludes: ['SOURCE-CONTRACT-CLEANUP-001 and VERIFIER-CONSOLIDATION-001'],
    },
    systemArea: 'Foundation trust',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Cleaned active source-contract references and tightened verifier hygiene.',
    whatItDoes: 'The source cleanup declares the active Strategy Quarter and Mycro source IDs as proposed contracts, classifies historical/audit-only source aliases without promoting them into fake truth, exposes Runtime Health > Source Contract Trust, and documents six verifier consolidation patterns plus 11 plain-English message rewrites.',
    whyItMatters: 'Source IDs and verifier failures are part of Foundation trust. They need to point at real records and speak in language an operator can act on.',
    whereItLives: [
      'lib/source-reference-trust.js',
      'lib/source-contracts.js',
      'docs/process/source-contract-cleanup.md',
      'docs/process/verifier-consolidation.md',
      'docs/process/approvals/SOURCE-CONTRACT-CLEANUP-001.json',
      'docs/process/approvals/VERIFIER-CONSOLIDATION-001.json',
      '/api/foundation-hub > sourceReferenceTrust',
      'Foundation > Runtime Health > Source Contract Trust',
      'Foundation > Backlog, SOURCE-CONTRACT-CLEANUP-001',
      'Foundation > Backlog, VERIFIER-CONSOLIDATION-001',
      'Foundation > Recent Work closeout source-verifier-cleanup-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=SOURCE-CONTRACT-CLEANUP-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-CLEANUP-001.json --closeoutKey=source-verifier-cleanup-v1',
      'npm run process:ship-check -- --card=VERIFIER-CONSOLIDATION-001 --planApprovalRef=docs/process/approvals/VERIFIER-CONSOLIDATION-001.json --closeoutKey=source-verifier-cleanup-v1',
      'npm run process:fanout-check -- --card=SOURCE-CONTRACT-CLEANUP-001 --closeoutKey=source-verifier-cleanup-v1',
      'npm run process:fanout-check -- --card=VERIFIER-CONSOLIDATION-001 --closeoutKey=source-verifier-cleanup-v1',
      'npm run process:post-ship-fanout -- --card=SOURCE-CONTRACT-CLEANUP-001 --closeoutKey=source-verifier-cleanup-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Active source-reference scan has zero undeclared source IDs, historical aliases are documented, verifier consolidation evidence is documented, and foundation:verify remains green.',
    reviewNext: 'Phase C is complete after Tracks 1, 2, and 3 are reviewed clean. Open Phase D cleanup only after review.',
    knownLimits: [
      'No new source is connected in this slice. Strategy Quarter and Mycro are proposed contracts only.',
      'Historical audits/specs are classified in docs instead of being treated as active source truth.',
      'Verifier consolidation is narrow v1 hygiene, not a full verifier rewrite.',
    ],
  },
  {
    key: 'doc-archive-research-curation-v1',
    backlogIds: [
      'DOC-ARCHIVE-AUTO-001',
      'RESEARCH-CURATION-001',
    ],
    match: {
      subjectIncludes: ['Phase D cleanup closeouts'],
    },
    systemArea: 'Foundation cleanup',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Moved old handoffs, audits, and research docs into an archive and added a preserved research-card curation surface.',
    whatItDoes: 'The cleanup script moves historical evidence into `docs/_archive/` with a manifest instead of deleting it, while Foundation Backlog shows Research Curation so research-lane cards remain visible and preserved.',
    whyItMatters: 'Active folders should show current truth, not every old checkpoint. Steve still keeps the evidence, but the control plane stops making historical notes look like today’s plan.',
    whereItLives: [
      'scripts/phase-d-cleanup.mjs',
      'lib/phase-d-cleanup.js',
      'docs/process/doc-archive-manifest.json',
      'docs/_archive/README.md',
      'docs/_archive/INDEX.md',
      '/api/foundation-hub > docArchiveCleanup',
      '/api/foundation-hub > researchCuration',
      'Foundation > Runtime Health > Doc Archive Cleanup',
      'Foundation > Backlog > Research Curation',
      'Foundation > Backlog, DOC-ARCHIVE-AUTO-001',
      'Foundation > Backlog, RESEARCH-CURATION-001',
      'Foundation > Recent Work closeout doc-archive-research-curation-v1',
    ],
    proofCommands: [
      'npm run phase-d:cleanup -- --archive --apply',
      'node scripts/generate-doc-indexes.mjs',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=DOC-ARCHIVE-AUTO-001 --planApprovalRef=docs/process/approvals/DOC-ARCHIVE-AUTO-001.json --closeoutKey=doc-archive-research-curation-v1',
      'npm run process:ship-check -- --card=RESEARCH-CURATION-001 --planApprovalRef=docs/process/approvals/RESEARCH-CURATION-001.json --closeoutKey=doc-archive-research-curation-v1',
      'npm run process:fanout-check -- --card=DOC-ARCHIVE-AUTO-001 --closeoutKey=doc-archive-research-curation-v1',
      'npm run process:fanout-check -- --card=RESEARCH-CURATION-001 --closeoutKey=doc-archive-research-curation-v1',
      'npm run process:post-ship-fanout -- --card=DOC-ARCHIVE-AUTO-001 --closeoutKey=doc-archive-research-curation-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Doc archive manifest records 113 preserved files, active evidence folders stay clean, research cards are preserved with zero auto-closures, and Runtime Health exposes the cleanup status.',
    reviewNext: 'Let the rest of Phase D close: rebuild-doc retire, safe-delete manifest, exception curation, hit-list reconcile, and multi-closeout Recent Builds UX. Then open Phase E re-audit.',
    knownLimits: [
      'Archived docs are searchable evidence, not active doctrine unless a current doc or backlog card promotes them.',
      'Research Curation v1 labels and preserves cards; it does not decide what Steve still wants.',
    ],
  },
  {
    key: 'rebuild-docs-archive-retire-v1',
    backlogIds: [
      'REBUILD-DOCS-RETIRE-001',
      'ARCHIVE-RETIRE-001',
    ],
    match: {
      subjectIncludes: ['Phase D cleanup closeouts'],
    },
    systemArea: 'Foundation cleanup',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Retired stale rebuild docs into plan history and ran the only Phase D delete lane with a strict safe-delete allowlist.',
    whatItDoes: '`docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` remain active truth. Old rebuild docs move to `docs/rebuild/plan-history/`. The archive-retire manifest records that no explicit safe-delete archive was present, so nothing was deleted.',
    whyItMatters: 'Cleanup must reduce confusion without creating destructive risk. Historical plan docs remain preserved, and deletion is limited to allowlisted regenerable junk only.',
    whereItLives: [
      'scripts/phase-d-cleanup.mjs',
      'docs/process/rebuild-doc-retire-manifest.json',
      'docs/process/archive-retire-manifest.json',
      'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md',
      'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
      '/api/foundation-hub > archiveRetire',
      'Foundation > Runtime Health > Archive Retire',
      'Foundation > Backlog, REBUILD-DOCS-RETIRE-001',
      'Foundation > Backlog, ARCHIVE-RETIRE-001',
      'Foundation > Recent Work closeout rebuild-docs-archive-retire-v1',
    ],
    proofCommands: [
      'npm run phase-d:cleanup -- --rebuild-retire --archive-retire --apply',
      'node scripts/generate-doc-indexes.mjs',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=REBUILD-DOCS-RETIRE-001 --planApprovalRef=docs/process/approvals/REBUILD-DOCS-RETIRE-001.json --closeoutKey=rebuild-docs-archive-retire-v1',
      'npm run process:ship-check -- --card=ARCHIVE-RETIRE-001 --planApprovalRef=docs/process/approvals/ARCHIVE-RETIRE-001.json --closeoutKey=rebuild-docs-archive-retire-v1',
      'npm run process:fanout-check -- --card=REBUILD-DOCS-RETIRE-001 --closeoutKey=rebuild-docs-archive-retire-v1',
      'npm run process:fanout-check -- --card=ARCHIVE-RETIRE-001 --closeoutKey=rebuild-docs-archive-retire-v1',
      'npm run process:post-ship-fanout -- --card=REBUILD-DOCS-RETIRE-001 --closeoutKey=rebuild-docs-archive-retire-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Two stale rebuild docs are preserved in plan history, active rebuild truth remains current-plan/current-state, and archive-retire deleted 0 files because no safe-delete archive was present.',
    reviewNext: 'Complete Phase D remaining cleanup closeouts, then open FULL-SYSTEM-RE-AUDIT-001. Do not start features before the re-audit.',
    knownLimits: [
      'ARCHIVE-RETIRE-001 is the only delete card. It refuses anything outside the allowlist and records “nothing found” when no safe-delete archive exists.',
      'Safe-delete cleanup did not remove root `node_modules` or any protected reference folders.',
    ],
  },
  {
    key: 'exception-hit-list-curation-v1',
    backlogIds: [
      'EXCEPTION-CURATION-001',
      'HIT-LIST-RECONCILE-001',
    ],
    match: {
      subjectIncludes: ['Phase D cleanup closeouts'],
    },
    systemArea: 'Foundation trust',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Classified all historical verifier exceptions and added a repo-tracked hit-list reconciliation snapshot.',
    whatItDoes: 'Exception Curation records how each of the 24 temporary verifier exceptions should be resolved before the deadline. Hit-List Reconcile compares the imported hit-list snapshot against live Backlog state and warns when the snapshot gets stale.',
    whyItMatters: 'The system now watches two loopholes that caused drift today: verifier exceptions that could become permanent and an external hit list that could drift away from repo state.',
    whereItLives: [
      'lib/phase-d-cleanup.js',
      'docs/process/verifier-exception-curation.json',
      'docs/process/hit-list-snapshot.json',
      '/api/foundation-hub > exceptionCuration',
      '/api/foundation-hub > hitListReconcile',
      'Foundation > Runtime Health > Exception Curation',
      'Foundation > Runtime Health > Hit-List Reconcile',
      'Foundation > Backlog, EXCEPTION-CURATION-001',
      'Foundation > Backlog, HIT-LIST-RECONCILE-001',
      'Foundation > Recent Work closeout exception-hit-list-curation-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=EXCEPTION-CURATION-001 --planApprovalRef=docs/process/approvals/EXCEPTION-CURATION-001.json --closeoutKey=exception-hit-list-curation-v1',
      'npm run process:ship-check -- --card=HIT-LIST-RECONCILE-001 --planApprovalRef=docs/process/approvals/HIT-LIST-RECONCILE-001.json --closeoutKey=exception-hit-list-curation-v1',
      'npm run process:fanout-check -- --card=EXCEPTION-CURATION-001 --closeoutKey=exception-hit-list-curation-v1',
      'npm run process:fanout-check -- --card=HIT-LIST-RECONCILE-001 --closeoutKey=exception-hit-list-curation-v1',
      'npm run process:post-ship-fanout -- --card=EXCEPTION-CURATION-001 --closeoutKey=exception-hit-list-curation-v1 --commitRef=HEAD',
    ],
    proofStatus: 'All 24 verifier exceptions have curation decisions, the 2026-07-27 deadline remains unchanged, and the hit-list snapshot is compared without auto-reading Steve’s private Google Doc.',
    reviewNext: 'Phase E re-audit should confirm the exception cleanup plan and hit-list reconciliation remain green before feature work resumes.',
    knownLimits: [
      'Curation decisions do not clear exceptions by themselves; later work must add real coverage, retire/restructure cards, or re-approve explicitly.',
      'Hit-list snapshot freshness is manual by design. V1 warns after 14 days and does not auto-import private Google Docs.',
    ],
  },
  {
    key: 'recent-builds-multi-closeout-ux-v1',
    backlogIds: [
      'RECENT-BUILDS-MULTI-CLOSEOUT-001',
      'FOUNDATION-SURFACE-UPDATES-001',
    ],
    match: {
      subjectIncludes: ['Phase D cleanup closeouts'],
    },
    systemArea: 'Foundation Recent Work',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Updated Recent Builds so one commit with multiple closeouts renders as a collapsed Multiple Closeouts group instead of hiding extra cards.',
    whatItDoes: 'Recent Builds now groups closeout entries by commit. A coordinated wave can keep one commit while still showing each card closeout with its own proof, where-it-lives links, known limits, and review-next note.',
    whyItMatters: 'Parallel work should not force fake commit splitting just so Recent Work tells the truth. Steve can see one coordinated ship and expand only the closeout he wants to inspect.',
    whereItLives: [
      'public/foundation.js renderBuildCommitGroup',
      'public/foundation.js groupBuildsByCommit',
      '/api/foundation/build-log',
      'Foundation > Recent Work > Multiple Closeouts',
      'Foundation > Backlog, RECENT-BUILDS-MULTI-CLOSEOUT-001',
      'Foundation > Recent Work closeout recent-builds-multi-closeout-ux-v1',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=RECENT-BUILDS-MULTI-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/RECENT-BUILDS-MULTI-CLOSEOUT-001.json --closeoutKey=recent-builds-multi-closeout-ux-v1',
      'npm run process:fanout-check -- --card=RECENT-BUILDS-MULTI-CLOSEOUT-001 --closeoutKey=recent-builds-multi-closeout-ux-v1',
      'npm run process:post-ship-fanout -- --card=RECENT-BUILDS-MULTI-CLOSEOUT-001 --closeoutKey=recent-builds-multi-closeout-ux-v1 --commitRef=HEAD',
    ],
    proofStatus: 'Recent Builds has grouped multi-closeout rendering, and verifier checks that same-commit closeouts remain visible instead of collapsing to only one closeout.',
    reviewNext: 'Phase D is complete after all cleanup closeouts are reviewed clean. Open FULL-SYSTEM-RE-AUDIT-001 next, not feature work.',
    knownLimits: [
      'This is the multi-closeout UX layer only. Broader Recent Work sorting, velocity charting, and deeper plain-English polish stay under FOUNDATION-SURFACE-UPDATES-001.',
    ],
  },
  {
    key: 'full-system-re-audit-v1',
    backlogIds: [
      'FULL-SYSTEM-RE-AUDIT-001',
      'DOC-AUTHORITY-INDEX-REPAIR-001',
      'DOCTRINE-PROPAGATION-002',
      'PROCESS-HOOKS-002',
      'FOUNDATION-SURFACE-UPDATES-001',
      'SOURCE-012',
      'RUNTIME-HEALTH-SIMPLIFY-001',
    ],
    match: {
      subjectIncludes: ['FULL-SYSTEM-RE-AUDIT-001 close Phase E re-audit'],
    },
    systemArea: 'Foundation audit',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Completed the Phase E full-system re-audit after Phases A-D enforcement and cleanup shipped.',
    whatItDoes: 'Consolidates 12 scoped audit passes into one repo-truth artifact with clean/minor-drift/blocker verdicts and a Phase F recommendation.',
    whyItMatters: 'Steve needed proof the cleanup worked before the system resumed action-loop or feature work. The audit says there are no blockers, only follow-up drift cards.',
    whereItLives: [
      'docs/audits/2026-04-29-full-system-re-audit.md',
      'docs/process/approvals/FULL-SYSTEM-RE-AUDIT-001.json',
      'Foundation > Backlog, FULL-SYSTEM-RE-AUDIT-001',
      'Foundation > Recent Work closeout full-system-re-audit-v1',
      'scripts/foundation-verify.mjs',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    proofCommands: [
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=FULL-SYSTEM-RE-AUDIT-001 --planApprovalRef=docs/process/approvals/FULL-SYSTEM-RE-AUDIT-001.json --closeoutKey=full-system-re-audit-v1',
      'npm run process:fanout-check -- --card=FULL-SYSTEM-RE-AUDIT-001 --closeoutKey=full-system-re-audit-v1',
      'npm run process:post-ship-fanout -- --card=FULL-SYSTEM-RE-AUDIT-001 --closeoutKey=full-system-re-audit-v1 --commitRef=HEAD',
    ],
    proofStatus: 'The audit found 0 blockers, 9 minor-drift areas, and 3 clean areas. Phase F recommendation is open with follow-up cards.',
    reviewNext: 'Steve reviews the audit, then Phase F can use the existing Action Review v1 surface or scope the next narrow action-loop child slice. Do not start Strategy UI, Scoper, Agent Factory, corpus expansion, retry/backoff, or another cleanup wave by default.',
    knownLimits: [
      'This audit reports minor drift but does not fix it inside the audit slice.',
      'The consolidated report is repo truth; the parallel agent chat fragments are not separate durable artifacts.',
      'Minor drift follow-ups still need normal 9.8 planning before any build.',
    ],
  },
  {
    key: 'wave-cleanup-a-local-docs-triage-v1',
    backlogIds: [
      'LOCAL-DOC-LINK-001',
      'DOC-AUTHORITY-INDEX-REPAIR-001',
      'DOC-OTHER-TRIAGE-001',
      'FOUNDATION-SURFACE-UPDATES-001',
    ],
    match: {
      subjectIncludes: ['Wave Cleanup A local docs and doc triage'],
    },
    systemArea: 'Foundation cleanup',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Completed Wave Cleanup A: local private docs are clickable only from trusted localhost, doc-authority drift is repaired, and the System Inventory Other bucket has an inspect-only triage report.',
    whatItDoes: 'Adds a privacy-gated `/api/foundation/local-doc/:name` endpoint for five allowlisted local docs, shows eligible local links in Foundation > System Inventory, repairs retired rebuild-doc authority links/statuses, updates Recent Work/KPI overview copy, and writes `docs/process/doc-other-triage.md` for Cleanup B.',
    whyItMatters: 'Steve can inspect private workspace docs quickly on the local machine without exposing private content remotely, and Cleanup B now has concrete doc-triage input instead of another vague cleanup conversation.',
    whereItLives: [
      '/api/foundation/local-doc/:name',
      '/api/system-inventory',
      'Foundation > System Inventory > Local Private',
      'Foundation > Recent Work',
      'docs/process/local-doc-link.md',
      'docs/process/doc-other-triage.md',
      'docs/README.md',
      'docs/INDEX.md',
      'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md',
      'docs/rebuild/plan-history/rebuild-master-plan-2026-04-29-retired.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/process/approvals/LOCAL-DOC-LINK-001.json',
      'docs/process/approvals/DOC-AUTHORITY-INDEX-REPAIR-001.json',
      'docs/process/approvals/DOC-OTHER-TRIAGE-001.json',
      'Foundation > Backlog, LOCAL-DOC-LINK-001',
      'Foundation > Backlog, DOC-AUTHORITY-INDEX-REPAIR-001',
      'Foundation > Backlog, DOC-OTHER-TRIAGE-001',
      'scripts/foundation-verify.mjs',
    ],
    proofCommands: [
      'npm run process:ship-check -- --card=LOCAL-DOC-LINK-001 --planApprovalRef=docs/process/approvals/LOCAL-DOC-LINK-001.json --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:ship-check -- --card=DOC-AUTHORITY-INDEX-REPAIR-001 --planApprovalRef=docs/process/approvals/DOC-AUTHORITY-INDEX-REPAIR-001.json --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:ship-check -- --card=DOC-OTHER-TRIAGE-001 --planApprovalRef=docs/process/approvals/DOC-OTHER-TRIAGE-001.json --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:fanout-check -- --card=LOCAL-DOC-LINK-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:fanout-check -- --card=DOC-AUTHORITY-INDEX-REPAIR-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:fanout-check -- --card=DOC-OTHER-TRIAGE-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1',
      'npm run process:post-ship-fanout -- --card=LOCAL-DOC-LINK-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1 --commitRef=HEAD',
      'npm run process:post-ship-fanout -- --card=DOC-AUTHORITY-INDEX-REPAIR-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1 --commitRef=HEAD',
      'npm run process:post-ship-fanout -- --card=DOC-OTHER-TRIAGE-001 --closeoutKey=wave-cleanup-a-local-docs-triage-v1 --commitRef=HEAD',
      'npm run foundation:verify',
    ],
    proofStatus: 'Verifier covers local success, simulated non-local 403, path traversal 403, non-allowlisted 403, doc-authority repair, 127-row Other triage, and Recent Work/KPI copy cleanup.',
    reviewNext: 'Open Cleanup B using `docs/process/doc-other-triage.md` as input. Do not start Strategy UI, Scoper, Agent Factory, source lifecycle expansion, UI/menu/layout polish, or broader feature work until Steve explicitly re-plans the next Foundation slice.',
    knownLimits: [
      'The local-doc endpoint intentionally serves only five allowlisted repo-root files and does not browse arbitrary local files.',
      'The Other-doc report classifies documents for Cleanup B but does not move, delete, or promote them.',
      'This slice applies narrow Foundation copy cleanup only; broader UI/menu/layout polish remains future Phase G scope.',
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

function enrichFoundationBuildLogCommitWithCloseout(build, closeout = null) {
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

export function enrichFoundationBuildLogCommit(build) {
  const closeout = getFoundationBuildCloseouts().find(record => closeoutMatchesCommit(record, build)) || null
  return enrichFoundationBuildLogCommitWithCloseout(build, closeout)
}

export function enrichFoundationBuildLogCommitEntries(build) {
  const closeouts = getFoundationBuildCloseouts().filter(record => closeoutMatchesCommit(record, build))
  if (!closeouts.length) return [enrichFoundationBuildLogCommitWithCloseout(build, null)]
  return closeouts.map(closeout => enrichFoundationBuildLogCommitWithCloseout(build, closeout))
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
