import { Pool } from 'pg'
import { getSheetValues } from './google-delegated.js'

const pool = new Pool({
  host: process.env.BCREW_DB_HOST || '/tmp',
  database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
  user: process.env.BCREW_DB_USER || process.env.USER,
})

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']

const backlogScopeDefinitions = [
  {
    key: 'foundation',
    label: 'Foundation / System',
    shortLabel: 'foundation/system',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'strategic_execution',
    label: 'Strategic Execution',
    shortLabel: 'strategic execution',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    shortLabel: 'marketing',
    queueOwner: 'hub',
    active: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    shortLabel: 'sales',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'operations',
    label: 'Operations',
    shortLabel: 'operations',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'retention',
    label: 'Retention',
    shortLabel: 'retention',
    queueOwner: 'hub',
    active: false,
  },
]

const legacyBacklogScopeMap = {
  dev: 'foundation',
}

const backlogScopeKeys = backlogScopeDefinitions.map(scope => scope.key)
const backlogScopeOrderSql = backlogScopeDefinitions
  .map((scope, index) => `WHEN '${scope.key}' THEN ${index}`)
  .join(' ')

const foundationUserSeed = [
  {
    email: 'ai@bensoncrew.ca',
    name: 'AI',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'crewbert@bensoncrew.ca',
    name: 'Crewbert',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: false,
  },
  {
    email: 'steve.zahnd@bensoncrew.ca',
    name: 'Steve',
    tier: 1,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'nick.bergmann@bensoncrew.ca',
    name: 'Nick',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'carsonc@bensoncrew.ca',
    name: 'Carson',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'ryanc@bensoncrew.ca',
    name: 'Ryan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'blake.berfelz@bensoncrew.ca',
    name: 'Blake',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'scottb@bensoncrew.ca',
    name: 'Scott',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'clare.manalo@bensoncrew.ca',
    name: 'Clare',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'accounting@bensoncrew.ca',
    name: 'Ahsan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'tanner.marsh@bensoncrew.ca',
    name: 'Tanner',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'georgia.huntley@bensoncrew.ca',
    name: 'Georgia',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
]

const backlogSeed = [
  {
    id: 'FOUNDATION-001',
    title: 'Close the Foundation strategy layer against signed-off sources',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Foundation review',
    summary: 'Home, Strategy Packet, and System Strategy are now closed. The remaining strategy-layer work is trust-lock: finish source-backed sign-off, remove provisional assumptions, and keep the closed strategy surfaces aligned with the real signed-off source boundary.',
    whyItMatters: 'The strategy surfaces now read cleanly, but they are only truly done if the source boundary underneath them is explicit and trustworthy.',
    nextAction: 'Carry the closed strategy layer through the source-trust pass: finish SRC-OWNERS-001 and SRC-FINANCE-001, then remove any remaining provisional interpretation or stale assumptions that those sign-offs settle.',
    statusNote: 'This is no longer a wholesale doc rewrite. It is a trust-lock and closeout card for the finished strategy layer.',
  },
  {
    id: 'FOUNDATION-002',
    title: 'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'The `ADMIN ONLY - Deal Data Entry` sign-off is complete. This card now exists to preserve that closure and make sure the remaining Owners Dashboard follow-on work stays attached to the right downstream cards instead of keeping a false "source sign-off still open" story alive.',
    whyItMatters: 'If the backlog keeps claiming the Admin-tab sign-off is unfinished after the source layer marks it signed off, Foundation starts violating its own truth model.',
    nextAction: 'Treat `SRC-OWNERS-001` as closed. Use `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, and `FOUNDATION-003` for the remaining parity, quality, and finance follow-on work.',
    statusNote: 'Closed on 2026-04-16. This card should stay as a closeout record, not an active blocker.',
  },
  {
    id: 'SECURITY-001',
    title: 'Rotate exposed MCP secrets and move local connector config to a safe pattern',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 3,
    source: 'Foundation reset audit',
    summary: 'Treat the committed secrets in `.mcp.json` as a real security incident: rotate the exposed credentials, move the local MCP configuration to env-backed values, and stop storing live secrets in repo-tracked config.',
    whyItMatters: 'A trust-layer rebuild cannot ignore live keys committed in git history. Even if the rest of the architecture is sound, secret leakage is a direct foundation failure.',
    nextAction: 'Identify the exposed keys, rotate them, move the local MCP config to environment-backed values or local-only config, and add the minimum secret-scanning guardrail so this does not happen again.',
    statusNote: 'Parallel to foundation trust work, not after it.',
  },
  {
    id: 'SECURITY-002',
    title: 'Define subject-person redaction and owner-preserving comms access',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: null,
    source: '2026-04-23 auth/tiers/vault spec + founder privacy rule',
    summary: 'Define the cross-comms privacy model so people and their assistants cannot retrieve performance-concern, comp, termination-risk, or undisclosed-feedback content about themselves from meetings, email, Slack, or Missive while still allowing normal summaries and accountable system outputs.',
    whyItMatters: 'Tiers alone do not solve the real leak. Without subject-person redaction and owner-preserving raw-access rules, a future assistant could surface sensitive content about its own owner or grant transcript access that reveals what was said about someone behind their back.',
    nextAction: 'Add schema and workflow design for subject_people + sensitivity tagging, uniform redacted response shape, owner-preserving meeting-note ACL policy, and the access-request flow that returns filtered summaries instead of raw comms.',
    statusNote: 'Spec exists in docs/specs/2026-04-23-auth-tiers-vault.md but nothing is implemented yet. Queue after the current shared-candidate apply flow, not before.',
  },
  {
    id: 'FOUNDATION-003',
    title: 'Finish source sign-off for SRC-FINANCE-001',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Foundation reset audit + Owners Dashboard finance walkthrough',
    summary: 'Turn the current finance walkthrough into a signed-off source contract for Weekly Actuals, Monthly Budget, Cashflow Dash, and the partner-commission normalization boundary.',
    whyItMatters: 'The rebuild now understands the finance hierarchy, but not the fully signed-off workbook logic. Without that closure, finance views stay interpretive instead of trusted.',
    nextAction: 'Use Weekly Actuals as the locked finance root for meaning, keep Cashflow Dash aligned to that root, and finish the remaining helper / KPI / dashboard closeout without reopening the finance-spine doctrine that is already locked.',
    statusNote: 'Weekly Actuals, Monthly Budget, Budget Original, and the monthly / annual rollups are now locked for meaning. The current doctrine is: Weekly Actuals = bookkeeping truth, Cashflow Dash budget overview = management truth after normalization. Remaining work is dashboard closeout and later payment reconciliation.',
  },
  {
    id: 'FOUNDATION-004',
    title: 'Run an operating-truth refinement pass after the core sheet validations',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Freedom / Owners validation closeout',
    summary: 'After the Freedom Sheet and Owners Admin / finance validations are complete, run one explicit pass to refine the company operating truths: promote durable business rules out of validation notes, remove one-off caveats from the wrong places, and lock what belongs in strategy docs versus source notes versus backlog.',
    whyItMatters: 'Critical business logic like roster semantics, recruiter attribution, community revenue meaning, and company-kept revenue rules should not stay fragmented across sheet notes, handoff packets, and founder memory. The system needs one tuned interpretation layer after the source walk-throughs are done.',
    nextAction: 'Once the current sheet validations are closed, review the captured notes across Freedom, Owners, and finance, then tighten `docs/strategy/operating-truths.md`, trim duplicated interpretation from source notes, file any remaining unresolved business-rule gaps as explicit backlog cards, and produce one final Freedom rebuild blueprint so a future agent can rebuild the workbook logic without rereading the full chat history.',
    statusNote: 'Do this after the current source-validation passes, not in the middle of them. The closeout output should include both refined operating truths and a durable rebuild blueprint.',
  },
  {
    id: 'FOUNDATION-VERIFY-001',
    title: 'Add minimal foundation smoke checks and source-health verification',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit',
    summary: 'Add the smallest repeatable verification layer that proves the Foundation app, DB-backed trust layer, critical source reads, and source-truth consistency still work after changes.',
    whyItMatters: 'Right now trust depends too much on manual spot checks. The foundation needs a cheap repeatable proof path before more modules, connectors, or agents get added.',
    nextAction: 'Keep expanding the verification pass only when new source surfaces or new write paths close. Do not reopen this as generic test-sprawl.',
    statusNote: 'Done. `npm run foundation:verify` is live and covers the current baseline: core Foundation APIs, Google health, FUB health, and source-truth consistency checks.',
  },
  {
    id: 'MEMORY-001',
    title: 'Stand up the business memory foundation in PostgreSQL',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Rebuild foundation',
    summary: 'Create the structured store for sessions, decisions, backlog items, parking lot items, and open questions.',
    whyItMatters: 'Volatile work should not live in markdown; the old system already proved that.',
    nextAction: 'Use the live PostgreSQL memory layer as the base for follow-on cards like native memory, activity history, policy output, and verification instead of reopening this foundation card.',
    statusNote: 'Done. The business memory DB, schema, seed data, and Foundation surfaces are live.',
  },
  {
    id: 'MEMORY-002',
    title: 'Enable the OpenClaw native memory baseline',
    team: 'dev',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Memory architecture call',
    summary: 'Enable OpenClaw `memory-core`, `active-memory`, and `dreaming` as the baseline recall layer before layering on heavier external memory systems.',
    whyItMatters: 'This gives Harlan real recall without prematurely adopting a more complex external stack.',
    nextAction: 'Update the OpenClaw config to enable the native memory plugins, restart the gateway cleanly, and run a real recall check using BCrew facts that should persist across sessions.',
    statusNote: 'Do the native baseline first and prove recall before benchmarking Honcho, Hindsight, or any heavier memory layer.',
  },
  {
    id: 'SCHEMA-001',
    title: 'Remove decision-category taxonomy drift',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Align the decision seed data, UI, and canonical validator around one category set so the live trust layer does not violate its own rules.',
    whyItMatters: 'The seed still uses legacy categories like foundation, data, and memory while the live app expects strategy, system, execution, and people. That drift quietly weakens trust.',
    nextAction: 'Keep future decision work aligned to the canonical categories and treat any new category drift as a fresh schema bug instead of reopening this card.',
    statusNote: 'Done. Seed, live rows, and UI now use the canonical decision taxonomy.',
  },
  {
    id: 'SOURCE-001',
    title: 'Revalidate Gmail as a rebuild source contract',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Foundation reset audit',
    summary: 'Prove Gmail read access in the rebuild, define what shared communication truth it owns, and mark the signed-off boundary in the source registry instead of assuming the old-system connection still counts.',
    whyItMatters: 'Email is not just a later sales or ops tool. It is part of the shared cross-hub communication memory layer for decisions, follow-through, meeting prep, and leadership context. If Gmail is assumed instead of revalidated, the system will reason over a communications source that may not actually be ready.',
    nextAction: 'Use the live delegated Gmail reader to define the exact mailbox boundary, search presets, and archive / normalization path the Foundation shared-communications layer should trust first, then decide what still belongs to Missive instead of Gmail.',
    statusNote: 'Delegated Gmail reads are now live in the rebuild for `ai@bensoncrew.ca`, including search, message read, and thread read. The remaining work is signed-off scope and normalization, not basic access.',
  },
  {
    id: 'SOURCE-002',
    title: 'Revalidate Google Calendar as a rebuild source contract',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Prove Calendar access in the rebuild, define which calendars and cadence truths it owns, and capture the exact signed-off boundary for meeting-prep and governance workflows.',
    whyItMatters: 'Calendar is part of the shared communications and cadence memory layer, not just a later department tool. The system cannot safely treat it as live operating truth until the rebuild-specific connection and scope are verified.',
    nextAction: 'Use the live delegated Calendar reader to define the exact primary calendars, event classes, and governance reads the Foundation shared-communications layer should trust first, then decide what should later move into hub-specific workflows.',
    statusNote: 'Delegated Calendar reads are now live in the rebuild for `ai@bensoncrew.ca`, including bounded event listing. The remaining work is signed-off scope and normalization, not basic access.',
  },
  {
    id: 'SOURCE-003',
    title: 'Revalidate Google Drive as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P1',
    rank: 5,
    source: 'Foundation reset audit',
    summary: 'Prove Drive access in the rebuild, define which docs and folders are canonical, and record the signed-off scope for strategy, meeting artifacts, and source-linked supporting material.',
    whyItMatters: 'Drive is part of the shared business memory layer because leadership notes, strategy docs, and working artifacts live there. If Drive scope remains fuzzy, the system will mix canonical material with random readable files.',
    nextAction: 'Keep the delegated Google Workspace Drive path as the canonical standard, run a fresh Drive read path in the rebuild against the real canonical folders and doc classes, and mark what is only readable versus approved for workflow use.',
    statusNote: 'Foundation shared-memory source for docs, notes, and supporting artifacts. Google Workspace should standardize on the delegated path here.',
  },
  {
    id: 'SOURCE-004',
    title: 'Revalidate ClickUp as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Foundation reset audit',
    summary: 'Verify the rebuild can read ClickUp, then lock the workflow boundary it actually owns now: active-agent roster, onboarding, culture workflow, and contract-link monitoring that should re-open governed contract review when links are missing or changed.',
    whyItMatters: 'ClickUp is now proven as the live roster and contract-link source. If that boundary stays fuzzy, contract knowledge will keep living in Steve memory and exception-deal review will never become governed.',
    nextAction: 'Keep the live surfaces explicit: Agent Roster list `901113292355`, Agent Onboarding list `901113487352`, and Culture space / folder `90117028331`. Monitor roster fields `Contract Link`, `Contract Sent`, `Contract Signed`, `Document Status`, `Contract`, and `Special Contract Terms`, then queue contract-registry review when an active agent is missing a link or that link changes.',
    statusNote: 'Readable now. The open work is turning roster contract-link changes into governed review inputs, not rediscovering whether ClickUp matters.',
  },
  {
    id: 'SOURCE-005',
    title: 'Revalidate Slack as a rebuild source contract',
    team: 'dev',
    lane: 'done',
    priority: 'P2',
    rank: 37,
    source: 'Foundation reset audit',
    summary: 'Verify Slack connectivity in the rebuild, define what communication truth it owns, and decide whether it belongs in the Foundation shared communications layer or only as a later notification surface.',
    whyItMatters: 'Slack was present in the old system, but the rebuild should not assume it is part of the trusted communication layer until the connector and scope are revalidated.',
    nextAction: 'Keep the existing bot identity, make the rollout list explicit, and invite it to missing channels that matter starting with accountability. The open work is archive/extraction hardening and coverage, not rediscovering whether Slack is readable.',
    statusNote: 'Readable now. Slack auth, channel listing, channel history, and thread archive are live in the rebuild. Current gap is channel coverage: the bot still needs to be invited to channels it cannot read yet.',
  },
  {
    id: 'SOURCE-006',
    title: 'Revalidate Missive as a rebuild source contract',
    team: 'dev',
    lane: 'scoped',
    priority: 'P2',
    rank: 38,
    source: 'Foundation reset audit',
    summary: 'Verify Missive connectivity in the rebuild and lock its live role as the shared email workspace for inboxes, comments, routing, and internal conversation context.',
    whyItMatters: 'Missive is a real operating source here, not a maybe-tool. If the rebuild cannot read the email threads, internal comments, and @mentions where work is actually getting discussed, the system will miss major operating context.',
    nextAction: 'Use the live Missive bridge to define the exact inboxes, assignment context, and comment surfaces the Foundation shared-communications layer should trust first, then normalize those reads alongside Gmail instead of treating them as separate systems.',
    statusNote: 'Missive reads are now live in the rebuild for org health, inbox conversations, and full thread reads. The remaining work is signed-off scope and normalization, not basic connectivity.',
  },
  {
    id: 'SOURCE-007',
    title: 'Revalidate DataForSEO as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 39,
    source: 'Foundation reset audit',
    summary: 'Verify DataForSEO connectivity in the rebuild, define the SEO truths it can provide, and record whether it should remain part of the new operating surface or stay dormant until marketing expansion.',
    whyItMatters: 'SEO tooling existed in the old stack, but it is not foundation-safe to assume that connection or its business value without a rebuild-specific check.',
    nextAction: 'Confirm DataForSEO access, identify the exact ranking or keyword workflows still worth trusting, and decide whether it belongs in the foundation backlog now or only after marketing restarts.',
    statusNote: 'Useful later, not a blocker for the first trusted loop.',
  },
  {
    id: 'SOURCE-008',
    title: 'Revalidate Follow Up Boss as a rebuild source contract',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 6,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'Prove Follow Up Boss access in the rebuild, lock the Owners-to-FUB join path, and define what CRM truth is safe to trust for attribution, ISA evidence, referral chains, and deal-triggered contact cleanup.',
    whyItMatters: 'Owners closeout now has a live proof case: `T#26100` resolves from the Owners row to a real FUB person with matching address, company-style source context, and ISA evidence. Until that join path and CRM boundary are explicit, attribution and AI review will stay founder-memory work.',
    nextAction: 'Use the proven rows `T#26104`, `T#26098`, `T#26101`, and `T#26100` to lock the join path from Column `BZ` into FUB person records, define required CRM checks for source lineage, ISA tags, referral-chain fields, and contact enrichment, then split those foundation-safe parity reads from later sales-coaching workflows.',
    statusNote: 'FUB is clearly a live foundation source now. The open work is rule lock-in and governed review, not basic access.',
  },
  {
    id: 'SOURCE-009',
    title: 'Revalidate GoHighLevel as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 40,
    source: 'Foundation reset audit',
    summary: 'Verify GoHighLevel connectivity in the rebuild, define what contact or automation truth it still owns, and decide whether it belongs in the trusted system or stays outside the current foundation scope.',
    whyItMatters: 'GoHighLevel was live in the old system, but the rebuild should not inherit that assumption until the connection and business role are explicitly revalidated.',
    nextAction: 'Confirm GHL access on this machine, identify the exact location and automation scopes that matter, and record whether it is active, legacy, or deferred.',
    statusNote: 'Not part of the first trusted loop, but it should not remain ambiguous.',
  },
  {
    id: 'SOURCE-010',
    title: 'Split KPI / Supabase into explicit AI OS source contracts',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Foundation reset audit',
    summary: 'KPI is live and readable. Turn the audit into explicit source contracts so AI OS knows which KPI truth layer to read for pipeline, shopping list, executed deals, goals, competition, app usage, and shopping-list hygiene.',
    whyItMatters: 'The old system failed because agents could reach Supabase without understanding which table told which story. If AI OS keeps treating KPI as one flat source, it will repeat the same mistake and produce conflicting coaching, target, and company-level reads. The extra deep pass also proved that app usage and shopping-list maintenance are related but not the same truth.',
    nextAction: 'Lock the KPI source note, define per-job read rules for `persons` / `appointments`, `leads`, `deal_data`, goals tables, competition tables, and `users_activity`, then formalize the shopping-list hygiene read (`updated_at`, high-score staleness, action-plan completeness, duplicate active rows) and add visible health checks to the Foundation surface.',
    statusNote: 'KPI is a live foundation system now. The open work is semantic split and read discipline, not keep-vs-retire. Shopping List canon is much clearer now, but the system still needs one governed hygiene read instead of mixing session activity with record maintenance.',
  },
  {
    id: 'SOURCE-011',
    title: 'Revalidate Google Ads as a rebuild source contract',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 42,
    source: 'Foundation reset audit',
    summary: 'Verify Google Ads connectivity in the rebuild, define what paid-media truth it would own, and decide whether it belongs in the post-foundation marketing surface or remains out of scope for now.',
    whyItMatters: 'Paid media is meaningful later, but the rebuild should not carry it as an implied live source without a real connector and an explicit operating boundary.',
    nextAction: 'Confirm Google Ads access, identify the MCC or account surfaces that matter, and record whether this source is active, deferred, or waiting on a future marketing phase.',
    statusNote: 'Useful later than the first assistant loop, but still needs a real revalidation card.',
  },
  {
    id: 'SLICE-001',
    title: 'Define and prove the first trusted assistant loop',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 7,
    source: 'Foundation reset audit',
    summary: 'Narrow the rebuild to one assistant loop that is actually trustworthy: strategy docs, Foundation memory, Gmail, Google Calendar, and Google Drive, with explicit boundaries on what is not yet allowed into the loop.',
    whyItMatters: 'The rebuild will fail by widening too early, not by lacking ideas. One trusted loop becomes the proof point that every future connector, memory layer, or agent surface can build on.',
    nextAction: 'Define the allowed tools, source prerequisites, read-write boundaries, and success checks for the first loop, then use that loop as the gate before enabling broader connectors or additional agents.',
    statusNote: 'Proof before scale. No second loop until the first one is trustworthy.',
  },
  {
    id: 'MEMORY-003',
    title: 'Capture full conversations in a browsable archive',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 3,
    source: 'Memory and operating-system direction',
    summary: 'Store full assistant chats, meeting transcripts, and key operating conversations in a structured archive the team can browse later by date, source, participant, topic, and linked decisions.',
    whyItMatters: 'If the raw conversations disappear into chat tools or local logs, we lose lessons learned, implementation history, auditability, and a huge amount of reusable business IP.',
    nextAction: 'Define the archive model: source connector, thread/session ID, participants, timestamps, transcript body, linked decisions/backlog items, redaction rules, and the first ingest paths from Codex sessions, Google Meet transcripts, and core assistant channels.',
    statusNote: 'Archive first. Summaries and lessons can be built on top of it later.',
  },
  {
    id: 'MEMORY-004',
    title: 'Turn archived conversations into lessons learned and reusable IP',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Founder IP capture direction',
    summary: 'Use the archived conversations to extract lessons learned, implementation timelines, case studies, ebook/source material, and reusable training or sales assets without having to reread everything manually.',
    whyItMatters: 'The work of building the system is itself valuable intellectual property. If we capture and organize it well, it becomes proof, training, marketing, and product insight instead of disappearing into old chats.',
    nextAction: 'Define the extraction workflow: lessons-learned records, timeline summaries, quote/clip capture, approval and redaction rules, and how archived conversations roll into content, training, and product packaging.',
    statusNote: 'Depends on MEMORY-003. Do not try to build polished outputs before the archive exists.',
  },
  {
    id: 'MEMORY-005',
    title: 'Implement a temporal truth model for strategy and decisions',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Memory architecture and strategy-truth review',
    summary: 'Track when a strategic fact became true, when it stopped being true, and what superseded it so the system can answer “what is true now?” without losing historical context.',
    whyItMatters: 'A live operating system cannot just keep the latest wording. It needs time-aware truth so decisions, priorities, and strategy shifts do not collapse into one blurry present-tense record.',
    nextAction: 'Define the first temporal schema for decisions and strategy records using fields like valid_from, valid_until, superseded_by, and current_state query rules.',
    statusNote: 'This was part of the early memory architecture discussion and should not get lost just because Graphiti was deferred.',
  },
  {
    id: 'DATA-001',
    title: 'Build a Freedom Sheet source adapter and schema-drift monitor',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet foundation work',
    summary: 'Read the sheet through stable source IDs and detect structural changes instead of hardcoding cell references.',
    whyItMatters: 'If tabs or headers move, the system should notify us and recover instead of silently breaking.',
    nextAction: 'Keep the new structure verifier current as tabs, headers, and critical bridge formulas evolve, then expose its pass/fail state through the data-health surface instead of leaving drift detection hidden in the terminal.',
    statusNote: 'Baseline structure verification is now live via `npm run sheets:verify` and included in `foundation:verify`. Remaining work is adapter design and UI visibility, not blind-read protection.',
  },
  {
    id: 'DATA-003',
    title: 'Render live source-backed values across the system',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 4,
    source: 'Strategy system principle',
    summary: 'Stop trusting markdown to hold live math. Render values from source IDs so updates in source systems flow across the dashboard and supporting docs automatically.',
    whyItMatters: 'If a KPI, milestone path, or assumption changes in the source of truth, the system should update everywhere without manual doc cleanup or stale snapshots.',
    nextAction: 'Define the first live-rendered source cards for BHAG milestones, Agent Engine assumptions, and source badges in supporting strategy views.',
    statusNote: 'This is now a core system principle, not a nice-to-have.',
  },
  {
    id: 'DATA-004',
    title: 'Turn source contracts into structured app metadata',
    team: 'dev',
    lane: 'executing',
    priority: 'P0',
    rank: 5,
    source: 'Foundation audit',
    summary: 'Promote source contracts from markdown-only documentation into structured app metadata that powers source IDs, open/edit actions, and source-aware UI behavior.',
    whyItMatters: 'If source links, statuses, and locations live only in prose or hardcoded frontend logic, the system will drift. Source contracts need to be executable, not just described.',
    nextAction: 'Finish wiring Foundation and doc views to structured source contracts, then use SOURCE-012 to expose that metadata as the visible Data Sources layer with one canonical status model instead of overlapping truth surfaces.',
    statusNote: 'This is the plumbing layer under SOURCE-012. Use it to kill hardcoded source logic and duplicate status truth.',
  },
  {
    id: 'DATA-005',
    title: 'Normalize lead-source lineage between Owners Dashboard and Follow Up Boss',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 7,
    source: 'Owners Dashboard admin tab walkthrough',
    summary: 'Define one canonical lead-source taxonomy and lineage model across the Owners Dashboard and Follow Up Boss so deals can be traced back to a valid source, ground-zero attribution is preserved, and company-versus-agent credit is rule-driven instead of guessed.',
    whyItMatters: 'If lead source, secondary source, ground-zero source, ISA-set status, and FUB IDs are inconsistent, the business cannot trust attribution, company-generated credit, marketing ROI, or coaching signals. Steve called `Import` and `Unspecified` values high-severity operational failures.',
    nextAction: 'Map the current Admin-tab source columns to the FUB model, define valid source values and merge rules, identify which lead sources should force a ground-zero connection chain, and explicitly lock which sources are company, which are agent, and which stay intentionally unresolved pending review. Then design the compliance check that uses Column `BZ`, validated source lineage, and ISA override logic to flag mismatches and surface missing CRM-origin records as database-growth opportunities.',
    statusNote: 'This is one of the highest-value data cleanup layers in the Owners Dashboard because it affects attribution, operations, and future coaching. The rule should be: validated source lineage first, then ISA override, and unresolved cases stay open instead of guessed. `<unspecified>` is allowed only as quarantine while the row is unresolved, not as final attribution truth.',
  },
  {
    id: 'DATA-006',
    title: 'Build Admin-tab data quality rules for the Owners Dashboard deal ledger',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 8,
    source: 'Owners Dashboard admin tab deep audit',
    summary: 'Turn the critical Admin-tab business rules into explicit validations and an AI deal-review flow so new or exception rows can be flagged, fixed in source, and re-reviewed instead of relying on manual spot checks.',
    whyItMatters: 'The deal ledger now drives attribution, company-versus-agent classification, split math, ISA economics, CRM enrichment, and downstream ops follow-through. If those rules stay implicit, every later hub will inherit hidden errors.',
    nextAction: 'Start with the governed checklist proven on `T#26100`: FUB link must resolve, `Import`, `Sphere`, `SOI`, and legacy lowercase `unspecified` are invalid final truth, `<unspecified>` is quarantine only, company-versus-agent must follow source + ISA logic, referral-chain fields must exist when needed, and split math must match the locked contract package. Also flag ISA mismatches in both directions: FUB evidence with no ISA row marker, or ISA row marker with no CRM evidence. Temporary implementation path: keep firm / exception review state in the Admin tab with `CC = AI Review Status`, `CD = THIS ROW ONLY: REVIEW ACTION`, and `CE = AI Findings By System / Suggestions`, using `CD = Review This Deal` as the row-specific re-review trigger. Mirror the same governed pattern into `Listings and Conditional Deals` with `Q = Client Name`, `R = FUB Person URL / ID`, and `S:U` as the conditional review lane so rows can be checked against FUB `Cond` parity before they go firm. Later promote the combined flow into an `Ops Hub -> Deal Review Inbox` with accept / deny / re-review states.',
    statusNote: 'This should become a governed review layer plus source fixes. Start in-sheet if needed, but do not leave it as a one-time cleanup sheet. The temporary sheet pattern now covers both Admin deal rows and conditional rows. Conditional review is now structurally hardened with `Client Name` and `FUB Person URL / ID`, but most live rows still need those fields populated. Also, raw FUB `Cond` counts are not fully trustworthy yet because the live conditional set still contains stale old conditional deals, so governed review must use identity plus stage instead of rough counts or agent-only matching.',
  },
  {
    id: 'DATA-007',
    title: 'Backfill invalid lead-source rows in the Owners Dashboard deal ledger',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 9,
    source: 'Full Admin-tab audit',
    summary: 'Clean the `Lead Source (Bonus System For Having This 100% Complete)` field for the rows currently using invalid or legacy values like lowercase `unspecified`, `Import`, `HomeOptima`, and generic call-source labels, then map those rows to governed Follow Up Boss-compatible source values.',
    whyItMatters: 'The full-tab audit found 984 invalid lead-source rows out of 1504 populated `Deal #` rows. That makes source attribution, marketing ROI, and company-versus-agent credit structurally unreliable.',
    nextAction: 'Pull the invalid-source rows, define the cleanup taxonomy and merge rules, then backfill the worst offenders first. Safe normalizations now include lowercase `unspecified` -> `<unspecified>` quarantine and direct case fixes like `ZahndTeam.ca Call` -> `Zahndteam.ca Call`. Legacy `HomeOptima` should normalize into the governed Home Value Hub / Agent Flyer sources using founder-approved flyer rules, and generic call labels should normalize to the city-specific canonical sources. The Admin-tab dropdown fix is already live; the remaining job is row cleanup plus drift protection.',
    statusNote: 'This is a measurable data-quality crisis, not a cosmetic cleanup. The Admin-tab dropdown is now governed and strict against the approved source list. Initial post-merge read found `84` invalid rows from `2025-06-01` forward. After `58` governed fixes, the remaining queue is `26` rows. The live hard cases are now narrowed to `Import`, generic `For Sale Sign Call`, and generic `Google Search Call`.',
  },
  {
    id: 'DATA-008',
    title: 'Backfill missing Follow Up Boss links in Column BZ',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 10,
    source: 'Full Admin-tab audit',
    summary: 'Populate `Client Follow UP Boss ID` for the historical deal rows that are currently missing CRM linkage so the sheet can be reconciled against Follow Up Boss and used for source-of-truth checks.',
    whyItMatters: 'Only 45 of 1504 rows currently have a populated FUB link. With 1459 rows missing linkage, the system cannot actually reconcile most historical deals to the CRM.',
    nextAction: 'Define the join path from deal rows to FUB people, then backfill the highest-value recent eras first and measure how much coverage improves.',
    statusNote: 'This is required before serious FUB parity checks become possible.',
  },
  {
    id: 'DATA-009',
    title: 'Resolve suspicious duplicate full-credit deal rows in the Admin tab',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 11,
    source: 'Full Admin-tab audit',
    summary: 'Review the known suspicious duplicate trades where the same realtor has multiple rows with `Total = 1` and decide whether they are true duplicates, bad data, or an edge-case workflow that needs explicit rules.',
    whyItMatters: 'The full-tab audit directly confirmed suspicious pairs like `T#25263` and `T#25226`. If those rows are duplicates, they can distort counts, credits, and downstream reporting.',
    nextAction: 'Audit the suspicious duplicate set starting with `T#25263` and `T#25226`, document the cause, and either merge/fix the rows or encode the exception rule.',
    statusNote: 'Do not collapse all duplicate `Deal #` rows blindly. Split-credit rows are legitimate in many cases.',
  },
  {
    id: 'DATA-010',
    title: 'Normalize malformed and non-operational trade identifiers in the Admin tab',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 12,
    source: 'Full Admin-tab audit',
    summary: 'Separate placeholder rows and malformed trade IDs from the operational deal ledger so rollups, seasonality views, and audit checks do not quietly mix forecast rows and naming anomalies into real historical production.',
    whyItMatters: 'The full-tab audit found goal-builder placeholder rows plus malformed or inconsistent trade identifiers like `T23051`, ` T#23012`, numeric-only IDs, `T#20125anotheronewrong`, older `GTA#` variants, and lower-case split suffixes. Without normalization, row counts and grouping logic drift.',
    nextAction: 'Tag the placeholder goal-builder rows explicitly, standardize or map malformed trade IDs, and define which historical naming variants are valid versus which should be normalized or excluded from operational reporting.',
    statusNote: 'This is especially important before we use 2023-to-today deal history for seasonality or KPI rollups.',
  },
  {
    id: 'DATA-011',
    title: 'Audit address parity between Owners Dashboard, Follow Up Boss, and Home Value Hub',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 13,
    source: 'Owners Dashboard column validation',
    summary: 'Define and measure the address-integrity rules across the deal ledger, Follow Up Boss, and Home Value Hub / Home Optima so bought-property records are complete and usable for homeowner follow-up.',
    whyItMatters: 'For buy-side deals, the bought-property address should exist and match across the sheet, Follow Up Boss, and Home Value Hub. If those systems drift, the business loses homeowner-marketing coverage, client-value workflows, and trustworthy address-based coaching or retention signals.',
    nextAction: 'Start with recent buy-side rows, compare `Deal Address` against the linked FUB contact and Home Value Hub record, define the mismatch cases, and quantify how many past clients and supporters are missing Home Value Hub coverage.',
    statusNote: 'Treat Home Value Hub as the internal name and Home Optima as the external/vendor name.',
  },
  {
    id: 'DATA-012',
    title: 'Audit QuickBooks AR completeness from Column D',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 14,
    source: 'Owners Dashboard column validation',
    summary: 'Keep Column `D` as an optional accounting-control field only. If Steve wants it later, define a light verification that the AR / commission side of a deal has been entered into QuickBooks.',
    whyItMatters: 'QuickBooks is compliance / tax reporting, not the operating truth layer. This field is only useful as a low-priority verification check, not as a core rebuild dependency.',
    nextAction: 'Leave this parked unless Steve explicitly wants a lightweight accounting-entry cross-check later.',
    statusNote: 'Low priority. Verification-only, not a target source-of-truth integration.',
  },
  {
    id: 'DATA-013',
    title: 'Audit client identity parity between Owners Dashboard and Follow Up Boss',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 15,
    source: 'Owners Dashboard column validation',
    summary: 'Compare `Client Name` in the Admin tab against the linked Follow Up Boss contact and define the mismatch cases so the team can trust deal-to-person identity across systems.',
    whyItMatters: 'If the client name in the ledger does not line up with the linked FUB record, either FUB was not updated properly or the sheet entry is wrong. That breaks CRM reconciliation, downstream automations, and confidence in any coaching or attribution based on the linked person.',
    nextAction: 'Start with rows that already have a populated `Client Follow UP Boss ID`, compare names, classify mismatch patterns, and define the cleanup ownership between Ops and CRM hygiene.',
    statusNote: 'This pairs naturally with DATA-008, but it is a different integrity problem than missing FUB links.',
  },
  {
    id: 'DATA-014',
    title: 'Operationalize ISA Set Deal and company-versus-agent attribution rules',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 16,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Turn `ISA Set Deal` from an empty placeholder column into a real attribution input and use it to tighten `Company or Agent` logic when source lineage alone is not enough.',
    whyItMatters: 'Steve called out examples where ISA-set business is being recorded in the wrong place and the final `Company or Agent` value is therefore wrong. If ISA-set logic stays informal, company-generated credit will keep drifting and Ops will keep guessing.',
    nextAction: 'Define the valid `ISA Set Deal` states, backfill recent qualifying rows, and encode the rule that agent-sourced leads with an ISA-set override still count as company-generated when appropriate.',
    statusNote: 'This is part of the broader attribution cleanup, but it deserves its own implementation path because the new column is currently unused.',
  },
  {
    id: 'DATA-015',
    title: 'Backfill and enforce Deal or Lease classification',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 17,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Populate `Deal or Lease?` and define when it overrides the old price-threshold heuristic so lease activity stops leaking into buy/sell production analysis.',
    whyItMatters: 'The sheet now has a dedicated `Deal or Lease?` column, but it is currently empty across the audited tab. Until that field is used, the system has to rely on rough proxies like sub-200k pricing, which is good enough for hints but not for trustworthy reporting.',
    nextAction: 'Define the allowed values, backfill the recent periods first, and decide when historical rows should be inferred versus manually corrected.',
    statusNote: 'This will sharpen production counts, coaching metrics, and seasonality views.',
  },
  {
    id: 'DATA-016',
    title: 'Normalize legacy anonymized realtor aliases and departed-agent history',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Owners Dashboard deep audit',
    summary: 'Decide how to handle old anonymized realtor values like `zz -bt` so historical attribution is either mapped cleanly or explicitly treated as irrecoverably anonymized.',
    whyItMatters: 'The Admin tab still contains historical placeholder realtor names from the old direct-from-sheet presentation workflow. If those aliases are left ambiguous, any historical per-agent analysis on departed agents becomes misleading and future migrations may silently preserve junk labels as if they were real people.',
    nextAction: 'Identify whether a reliable alias map exists, decide whether the goal is historical restoration or explicit archival, and then standardize how departed-agent history is represented going forward.',
    statusNote: 'The KPI dashboard removed the original reason for anonymizing names, but the old rows still need a deliberate policy.',
  },
  {
    id: 'DATA-017',
    title: 'Encode brokerage, Real Broker, and Benson Crew eras in deal-ledger reporting',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 19,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Make the Admin-tab reporting and future source contracts explicitly era-aware so historical rows are interpreted using the business rules that were true at the time, not today’s assumptions.',
    whyItMatters: 'The sheet spans at least three real operating eras: brokerage before about 2023-04-01, Real Broker from about 2023-04-01 through 2025-06-30, and Benson Crew from about 2025-07-01 onward. Cobroke fields, lead-source expectations, attribution rules, and commission norms do not mean the same thing across those periods.',
    nextAction: 'Define the canonical era boundaries, tag or infer the era from `Date Firm (Executed)`, and document which columns and rollups should be included, ignored, or reinterpreted in each era before we do serious 2023-to-today seasonality or KPI analysis.',
    statusNote: 'This is a prerequisite for trustworthy historical comparisons.',
  },
  {
    id: 'DATA-018',
    title: 'Queue review when new Follow Up Boss lead sources appear',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 20,
    source: 'Owners closeout + FUB taxonomy review',
    summary: 'Compare each refreshed raw FUB source snapshot against the governed source rules and surface any new, renamed, or reappearing source names for review before Operations starts using them in the Owners ledger.',
    whyItMatters: 'If new raw FUB source names appear silently, the governed dropdown and attribution rules drift immediately. Steve wants new sources surfaced for review and notification instead of silently becoming cleanup debt.',
    nextAction: 'Keep the FUB drift lane aligned with the governed queue model as the source taxonomy evolves, but do not reopen this card unless the drift stops landing in the queue or new source-name cases appear that the current diff model cannot represent.',
    statusNote: 'Done. Raw FUB snapshots, rule diffing, change-event generation, visible Foundation drift panels, and the combined Owners review queue now work together so new/open/legacy FUB source drift lands in a governed inbox instead of hiding in terminal output.',
  },
  {
    id: 'DATA-019',
    title: 'Enforce approved Follow Up Boss lead sources in the Owners Dashboard',
    team: 'dev',
    lane: 'done',
    priority: 'P0',
    rank: 21,
    source: 'Owners closeout + governed dropdown fix',
    summary: 'Treat the Admin-tab dropdown list as a governed final-deal-source surface, not a manual helper list, and keep it synced to the approved taxonomy and quarantine rules.',
    whyItMatters: 'Column `N` is now strict against `Lists!J3:J63`, but if that governed list drifts away from the approved taxonomy, Ops will still be choosing stale or broken values inside a “validated” field.',
    nextAction: 'Keep the governed Owners list explicit and queue-ready, but do not reopen this card unless unexpected values, missing approved values, or duplicates stop being surfaced by the verifier and the combined review queue.',
    statusNote: 'Done. The strict dropdown is live, the canonical governed list is explicit, the verifier is visible, and any future Owners-list drift can now land in the same governed queue instead of relying on manual list maintenance.',
  },
  {
    id: 'DATA-020',
    title: 'Define source freshness rules and stale-data guardrails',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 22,
    source: 'Owners closeout + source maturity model',
    summary: 'Define when governed lists, source reviews, and review lanes are considered fresh enough to trust, stale enough to warn on, or old enough to re-open for review.',
    whyItMatters: 'A controlled source list can still go stale. Steve wants the system to show when lead-source rules, governed dropdowns, or AI review lanes have aged out so the foundation does not get sloppy again.',
    nextAction: 'Keep the first governed freshness rules live for the Owners/FUB layer, then reuse the same pattern later for finance, KPI, and wider source surfaces instead of inventing a second stale-state model.',
    statusNote: 'Done for the first scoped layer. Raw FUB snapshot age, governed-dropdown drift age, Admin/Conditional review-lane age, and the combined Owners inbox age now surface fresh / warning / stale states with explicit thresholds and founder-alert flags.',
  },
  {
    id: 'FINANCE-001',
    title: 'Normalize partner commissions across the Owners Dashboard finance stack',
    team: 'dev',
    lane: 'research',
    priority: 'P0',
    rank: 6,
    source: 'Owners Dashboard finance walkthrough',
    summary: 'Lock the internal finance source contract around `(Input) Weekly Actuals`, `Monthly Budget`, monthly roll-ups, annual roll-ups, and `Cashflow Dash`, then make the partner-commission normalization rule explicit so top-line revenue and owners expense are not overstated.',
    whyItMatters: 'Weekly Actuals is the internal finance truth, but partner commissions are currently backed out at the dashboard layer. If the normalization logic stays implicit or only exists in one layer, monthly and annual reporting can drift away from the real company economics.',
    nextAction: 'Carry the traced source chain all the way through: `ADMIN ONLY - Deal Data Entry` -> `Weekly Actuals` / `Monthly Actuals (Roll Up)` -> `Monthly Budget` / annual roll-ups -> `Cashflow Dash`, then decide where the partner-commission adjustment lives canonically and where it should remain interpretation only.',
    statusNote: 'Weekly Actuals meaning is largely locked. The budget and rollup chain is now confirmed through Monthly Budget, Budget Original, Monthly Actuals, Annual Actuals, and Annual Budget. Normalization doctrine is now locked: Weekly Actuals = bookkeeping truth, Cashflow Dash budget overview = management truth. What remains is dashboard-layer closeout and later payment reconciliation.',
  },
  {
    id: 'FINANCE-002',
    title: 'Build a governed agent split-contract layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Owners Dashboard split validation',
    summary: 'Model agent compensation as governed contract packages backed by ClickUp roster links and signed contract files instead of partially maintained spreadsheet rows and founder memory.',
    whyItMatters: 'The first live proof now exists: Matt Allman roster task `868hre80z` links to a signed contract that proves his normal `50 / 50` split and his ISA `45 / 55` override, including leases. The system needs a governed home for that truth before exception deals can be reviewed safely.',
    nextAction: 'Create starter registry entries from active agents and exception deals. Use ClickUp roster fields plus linked Drive contract folders to lock agent, effective dates, package type, normal split, company-deal split, agent-deal split, ISA override, lease rule, mentor / apprentice rules, cap rules, and incomplete-contract flags. Re-open review only when the contract link or metadata changes.',
    statusNote: 'First proof exists. The open work is promoting proven packages into a governed registry, not proving the concept.',
  },
  {
    id: 'FINANCE-003',
    title: 'Model conditional deals as an optional cashflow scenario layer',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 19,
    source: 'Owners Dashboard conditional deals validation',
    summary: 'Treat conditional deals as a forecast / scenario layer instead of mixing them into firm cash truth. The current workbook tracks conditionally sold deals manually, with condition due dates and expected closing dates, so leadership can see how much money could exist if those deals firm up.',
    whyItMatters: 'Conditional deals are useful for planning, but they are not created cash. If the future cashflow system cannot separate firm cash from conditional scenarios cleanly, leadership will either overtrust soft pipeline or lose visibility into likely near-term upside.',
    nextAction: 'Define the first model for conditional pipeline in cashflow: status, agent, address, split-adjusted volume, commission math, team share, condition due date, expected close date, optional expected cash date, and a cashflow toggle that can include or exclude conditional deals from the projection.',
    statusNote: 'Future-state finance feature, not a replacement for the Admin deal ledger.',
  },
  {
    id: 'ENGINE-001',
    title: 'Make planning attrition a first-class engine input',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Agent Engine rebuild',
    summary: 'Break the planning attrition assumption out of the buried recruiting formula and make it an explicit source-backed input in the BHAG builder or replacement source-of-truth system.',
    whyItMatters: 'Right now the system can show live attrition pressure, but not the planning attrition assumption that drives required recruiting pace. That keeps one of the most important engine assumptions hidden.',
    nextAction: 'Add a visible planning attrition field to the source of truth, then wire it into the Agent Engine and financial interpretation views.',
    statusNote: 'Needed before the engine math is fully explainable and editable in-system.',
  },
  {
    id: 'SYSTEM-001',
    title: 'Write a separate system-strategy doc for the AI OS',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 1,
    source: 'Foundation architecture',
    summary: 'Keep business strategy and system strategy separate so the AI operating model does not leak into company strategy.',
    whyItMatters: 'This keeps the foundation readable for humans and reliable for agents.',
    nextAction: 'Use `docs/system-strategy.md` as the architecture-boundary document and update it only when the real operating model changes.',
    statusNote: 'Base doc exists. This card now records the separation rule and prevents the old hybrid-doc mistake from coming back.',
  },
  {
    id: 'STRATEGY-001',
    title: 'Business Atoms Framework',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 6,
    source: 'Atoms framework design',
    summary: 'Apply the marketing atoms pattern to the whole business so recurring wins, losses, bottlenecks, frustrations, decisions, and assumption risks can be captured as structured strategic signals.',
    whyItMatters: 'Quarterly planning should run on recurring evidence, not vibes. The old marketing system proved that atoms become powerful once they are searchable, tagged, and actually used downstream.',
    nextAction: 'Create business_atoms and atom_hits tables, define tagging and hit logic, and add a dashboard view with weekly, monthly, quarterly, and annual filters. Keep audience and avatar targeting as optional overlays on top of the core atom record: marketing should support the locked 10 RETAIN client avatars and 5 ATTRACT agent avatars, while other hubs can start with simpler audience or pillar tags until they truly need their own persona model.',
    statusNote: 'Atoms should be shared foundation intelligence first, with marketing avatar targeting layered on cleanly instead of forcing every hub into marketing-style avatar logic on day one.',
  },
  {
    id: 'GOV-001',
    title: 'Build governance accountability into the system',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 7,
    source: 'Governance design',
    summary: 'Make the system hold leadership and departments accountable to the strategy, cadence, and execution rules by preparing the room, enforcing the sequence, capturing structured outputs, and surfacing drift instead of only documenting the process.',
    whyItMatters: 'The AI OS should not just help the team work. It should enforce the operating cadence, surface drift, and make follow-through visible.',
    nextAction: 'Define the first governance loop: cadence checks, pre-meeting briefing, agenda enforcement, decision capture, owner/deadline tracking, and escalation rules for misses or drift.',
    statusNote: 'This should behave like an operating partner for governance, not a passive logbook.',
  },
  {
    id: 'PEOPLE-001',
    title: 'Build people accountability and performance intelligence layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 8,
    source: 'Leadership accountability design',
    summary: 'Use calendar attendance, meeting notes, expected outputs, compensation, role expectations, and operating signals to give leadership a grounded view of who is contributing, where accountability is slipping, and where coaching or intervention is needed.',
    whyItMatters: 'Quarterly and monthly reviews should be informed by a third-party system that sees real behavior and outcomes, not just whoever argues best in the room.',
    nextAction: 'Define the people-intelligence model: role expectations, meeting attendance, cadence compliance, output expectations, coaching signals, and guardrails for fair evaluation.',
    statusNote: 'Must be evidence-based and role-based, not vague vibe scoring.',
  },
  {
    id: 'DATA-002',
    title: 'Build source trust scoring layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 9,
    source: 'Foundation system design',
    summary: 'Score each source not just for connectivity, but for recency, completeness, health, and decision-worthiness.',
    whyItMatters: 'A connected source that is stale or broken should not carry the same weight as a healthy source of truth.',
    nextAction: 'Define a first scoring model using connection status, signed-off state, recency, completeness, and schema health, then surface that score beside each source contract in Foundation.',
    statusNote: 'This should explain why a source is In Review, Verified Readable, Partially Signed Off, or decision-safe instead of making those states feel arbitrary.',
  },
  {
    id: 'DECISION-001',
    title: 'Build decision-to-doc traceability',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 10,
    source: 'Foundation system design',
    summary: 'Every strategy-doc change should point back to the exact decision, session, source, or event that justified it.',
    whyItMatters: 'This makes the strategy layer auditable and keeps updates grounded in real evidence.',
    nextAction: 'Keep using the existing pending-doc-update and change-event flow as the single trace path, then build richer visible change history and contradiction cleanup on top of it through `DECISION-002` and `DECISION-003`.',
    statusNote: 'Done for the first live slice. Foundation hub now exposes decision-to-doc traceability, pending doc updates carry linked decision context, and the Decisions / strategy watch surfaces can show affected docs, linked update counts, source context, and approval path without inventing a second trace system.',
  },
  {
    id: 'DECISION-002',
    title: 'Build a strategy change ledger and inline change annotations',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 11,
    source: 'Foundation change-tracking design',
    summary: 'Track every meaningful Foundation strategy change with before/after values, linked decisions, timestamps, participants, affected sections, and visible annotations that show readers what changed and why.',
    whyItMatters: 'Major strategy changes should never disappear into silent edits. Leadership and agents need to see what changed, why it changed, and where the supporting decision lives.',
    nextAction: 'Keep using the current decision-linked ledger and doc-scoped annotations as the live path, then deepen the annotation model only if we need section-level or line-level highlighting later.',
    statusNote: 'Done for the first live slice. Strategy watch panels now show a decision-linked newest-first ledger, proposals carry before/after diff context, and doc-scoped annotations make visible what changed, where it changed, and which decision justified it.',
  },
  {
    id: 'DECISION-003',
    title: 'Build decision conflict detection and cleanup workflow',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 12,
    source: 'Decision governance design',
    summary: 'Continuously scan proposed and locked decisions for overlap, contradiction, supersession, or ambiguity, then flag those conflicts in the system before old and new agreements silently coexist.',
    whyItMatters: 'Running a team depends on clear agreements. If a new agreement changes an old one but the system does not flag it, people will keep citing different versions of the truth and accountability falls apart.',
    nextAction: 'Keep using the live contradiction / traceability queue as the current cleanup path, then deepen the relationship model only if we need more than lock review, missing evidence, missing provenance, broken supersedes links, orphan doc proposals, and overlap review.',
    statusNote: 'Done for the first live slice. Foundation hub now exposes a decision review snapshot, the Decisions / Current State surfaces can show the contradiction queue, and the system can already flag proposed decisions, missing source refs, incomplete provenance, broken supersedes links, orphan doc proposals, and overlap candidates.',
  },
  {
    id: 'DECISION-004',
    title: 'Build a pending decision review and lock-in workflow',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 13,
    source: 'Governance operator design',
    summary: 'Capture statements from meetings, transcripts, chats, and operator workflows that sound like real decisions, then route them into a pending review state instead of pretending they are fully locked before a human confirms them.',
    whyItMatters: 'A lot of contradiction starts when the room thinks a decision was made but nobody later confirms whether it was final, provisional, or only exploratory. The system should help separate “sounds like a decision” from “this is now the live agreement.”',
    nextAction: 'Define the pending-decision pipeline: extraction from meetings and chats, confidence scoring, reviewer assignment by role, statuses like needs verification / ready to lock / rejected / merged into existing decision, contradiction checks against the existing decision log, and how unresolved pending decisions show up in governance cadences.',
    statusNote: 'The right pattern is: detect possible decisions early, keep them visibly reviewable, check them against existing agreements, and only lock them once the right human owner confirms they are real.',
  },
  {
    id: 'DECISION-005',
    title: 'Build a decision provenance and participant model',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 14,
    source: 'Decision accountability design',
    summary: 'The first provenance model is now live in the Foundation system. Decisions can store who owned the call, who confirmed it, who participated, what context it came from, and what evidence supports it.',
    whyItMatters: 'A decision log is only trustworthy if the company can answer who decided, who was in the room, whether it was a group agreement or an owner confirmation, and what context justified the change. Without that provenance, people will dispute the agreement later or treat the log like a thin summary with no accountability weight.',
    nextAction: 'Backfill provenance on the already-locked decisions, then deepen the model with cleaner meeting/session/thread linkage and any later temporal-truth fields that still need to land.',
    statusNote: 'First model is live. Remaining work is backfill plus richer linkage, not blank-sheet design.',
  },
  {
    id: 'DECISION-006',
    title: 'Turn locked decisions into visible policy and SOP artifacts',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 15,
    source: 'Decision-log model review + old strategy/policy history',
    summary: 'Use the canonical decision log to create a visible policy/SOP layer for real operating agreements like expense policy, ownership-pay rules, approval standards, and other recurring company rules so those agreements do not disappear into chats, meeting memory, or stale side docs.',
    whyItMatters: 'A company does not just need a decision log. It also needs the current operating rule people are supposed to follow. If a decision changes the expense policy, ownership-pay handling, or another standing rule, the system should be able to show the current policy artifact, what decision created it, what decision superseded it, and what history sits behind it. Otherwise people keep citing old agreements or asking “where does that actually live?”',
    nextAction: 'Define the first policy/SOP model around concrete artifacts: expense policy, ownership-pay rules, approval standards, and supersession behavior. Decide which decisions emit policy artifacts, how policies trace back to locked decisions, where they live in the UI, and how one new decision cleanly overrides an older rule without losing the history.',
    statusNote: 'Keep one canonical decision system. Policies and SOPs should be linked artifacts generated from that system, not a second disconnected truth layer.',
  },
  {
    id: 'GOV-002',
    title: 'Build meeting effectiveness scoring',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 15,
    source: 'Governance system design',
    summary: 'Track whether meetings happened, produced decisions, created ownership, and actually moved the business forward.',
    whyItMatters: 'A meeting existing on the calendar is not the same as a meeting doing its job.',
    nextAction: 'Define a simple meeting-quality rubric tied to decisions, ownership clarity, and follow-through.',
    statusNote: 'Build after baseline governance accountability is in place.',
  },
  {
    id: 'PEOPLE-002',
    title: 'Define role expectation contracts',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 16,
    source: 'People intelligence design',
    summary: 'Create explicit expectation contracts by role so people accountability is grounded in agreed outputs and behaviors.',
    whyItMatters: 'Fair accountability requires explicit expectations before evaluation.',
    nextAction: 'Define the structure for role expectations, required cadences, output expectations, and quality standards.',
    statusNote: 'Dependency for serious people intelligence.',
  },
  {
    id: 'STRATEGY-002',
    title: 'Build company drift map',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 17,
    source: 'Foundation system design',
    summary: 'Show where the business is drifting from strategy by pillar, department, cadence, and source health.',
    whyItMatters: 'Leadership should be able to see where reality is diverging from the plan before that drift becomes damage.',
    nextAction: 'Define the drift categories and how they roll up into one executive view.',
    statusNote: 'Becomes much more powerful once governance and people intelligence exist.',
  },
  {
    id: 'STRATEGY-003',
    title: 'Deepen Strategic Execution into a live quarterly priorities workspace',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Strategy module design',
    summary: 'Evolve the existing Strategic Execution hub beyond mostly static quarterly docs into a live strategy workspace that holds the current quarter, SMART priorities, milestones, owners, evidence, meeting notes, carry-forward decisions, and archived outcomes.',
    whyItMatters: 'Quarterly priorities are not just text. They are the live operating bridge between annual strategy and the next 90 days of execution, and they need to be collaborative, measurable, and easy for AI to reason over.',
    nextAction: 'Use the existing Strategic Execution surface as the base. Define the quarterly-priorities data model: quarter definition, SMART priority records, milestones, owners, status, carry-forward/archive rules, and how the live execution workspace should render them without pushing quarterly churn back into Foundation.',
    statusNote: 'This is no longer a hypothetical future workspace. It is the next evolution of the Strategic Execution hub that already exists.',
  },
  {
    id: 'STRATEGY-004',
    title: 'Build the AI-assisted strategy planning workflow',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 19,
    source: 'Strategy team system design',
    summary: 'Create the pre-strategy workflow for quarterly planning: ingest prior-quarter pre-work, meeting notes, strategic evidence, atoms, and performance data so AI can help identify the most urgent priorities, propose options, and support carry-forward or stop decisions.',
    whyItMatters: 'The strategy system should help leadership go from evidence to priorities, not just store the final answer. This is the real AI layer for the future strategy team.',
    nextAction: 'Define the quarterly planning pipeline: pre-work collection, evidence ingestion, synthesis prompts, recommendation outputs, review checkpoints, and how final priorities get approved and locked.',
    statusNote: 'This should come after the live quarterly workspace shape is clear.',
  },
  {
    id: 'GOV-003',
    title: 'Build strategy-to-calendar enforcement',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 20,
    source: 'Governance system design',
    summary: 'If the strategy defines a cadence, the system should verify it exists on the calendar and flag gaps before the cadence breaks.',
    whyItMatters: 'Strategy should show up in the calendar, not just in documents.',
    nextAction: 'Map required meetings and review cadences to calendar checks, missing-event alerts, preflight briefing requirements, and post-meeting closeout expectations.',
    statusNote: 'Direct extension of the governance accountability layer and the first preflight check for a live governance operator.',
  },
  {
    id: 'SYSTEM-002',
    title: 'Define modular product architecture around Foundation',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 21,
    source: 'Product architecture insight',
    summary: 'Treat Foundation as the core product and design future team and pillar modules to plug into it instead of forking their own systems.',
    whyItMatters: 'This keeps the AI OS sellable and extensible. Strategy, memory, sources, governance, and accountability should be shared primitives that every future module reuses.',
    nextAction: 'Write the first modular architecture note: Foundation core, shared primitives, and how future modules like Marketing, Strategy Team, People, and Ops attach to it.',
    statusNote: 'Captures the idea that someone may eventually buy one pillar while still depending on the Foundation backbone.',
  },
  {
    id: 'AGENT-001',
    title: 'Define the core agent topology for the AI OS',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 22,
    source: 'Agent system design',
    summary: 'Design the real agent model: Crewbert as orchestrator, Harlan as Steve-facing assistant, department assistants, and how true agents differ from lightweight routed personas.',
    whyItMatters: 'The old system blurred true agents and wrapped personas. We need a clear architecture before building chat surfaces, role-based assistants, or per-user experiences.',
    nextAction: 'Map the minimum viable agent topology: orchestrator, personal assistant, department assistant pattern, and when to use routing versus a dedicated agent runtime.',
    statusNote: 'Important before we promise every leader or agent a full assistant.',
  },
  {
    id: 'UX-001',
    title: 'Add a home-screen chat surface for the main assistant',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 23,
    source: 'Foundation UX direction',
    summary: 'Put a real conversation box on the Foundation home screen so Steve can talk to the main assistant from inside the system instead of treating chat as separate from the OS.',
    whyItMatters: 'The operating system should feel alive and usable from the home screen. The chat surface becomes the front door into strategy, memory, backlog, and source-backed views.',
    nextAction: 'Define the first home chat experience: what assistant it talks to, what context it gets, and how it links into memory, backlog, and source-backed views.',
    statusNote: 'Scope this before building around a final agent identity decision.',
  },
  {
    id: 'PEOPLE-003',
    title: 'Design role-based workspace and assistant experiences',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 22,
    source: 'Product and people-system design',
    summary: 'Different users should see different workspaces, assistants, and accountability layers based on who they are: Steve, leadership, department owners, or agents on the team.',
    whyItMatters: 'If everyone sees the same system, the experience gets noisy and low-trust. Role-aware views are necessary for assistants like Harlan, Chief, or future team-facing copilots.',
    nextAction: 'Define the first role tiers, what each role can see, and what their assistant should help with.',
    statusNote: 'Connect this later to auth, permissions, and people accountability.',
  },
  {
    id: 'DEV-001',
    title: 'Rebuild a lightweight parallel dev loop with worktree isolation',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 23,
    source: 'Old dev-team salvage',
    summary: 'Reuse the strongest pattern from the old system: DB-backed tasks, isolated git worktrees, a scoped builder/reviewer loop, and safe parallel execution.',
    whyItMatters: 'This is how we eventually let 2–5 agents work in parallel without stepping on each other, while keeping the rebuild much lighter than the old Frankenstein.',
    nextAction: 'Document the v2 dev loop: task table, worktree-per-task, small role set (scoper, builder, QA, review loop), and branch ownership rules.',
    statusNote: 'Useful accelerator later, not a current blocker.',
  },
  {
    id: 'DEV-002',
    title: 'Define the research-to-release pipeline and scoped-card standard',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 24,
    source: 'Old dev-team salvage',
    summary: 'Salvage the strongest pipeline pattern from the old system: research finds WHAT is changing, synthesis decides WHY it matters, scoping defines HOW it should be built, ranking decides WHEN it enters the queue, build-and-review proves quality, human review confirms risk, and only then does work push live. The future-state version should also define the trust ladder for when some of that human review can be relaxed.',
    whyItMatters: 'The old system was directionally right when it forced work through quality gates before build. The real value was never “lots of agents.” It was the pipeline discipline that prevented thin ideas from reaching implementation and created the long-term possibility of safe autonomy. If the new system wants to earn autopilot later, it needs a clear research -> synthesis -> scope -> rank -> build/review -> human review -> push-live model first, plus explicit trust thresholds for what can eventually bypass the human gate.',
    nextAction: 'Define the v2 pipeline in plain terms for the new system: stage names, entry/exit criteria, what data each stage must attach, the scoped-card standard (problem/context, why it matters, build shape, acceptance criteria, definition of done, risks, dependencies, blocked reason, verification/test plan, source links), the review-loop quality bar, the human-review checkpoint, and the trust-building path toward selective autonomous push-live later.',
    statusNote: 'Do not rebuild the old dev-team theater. Keep the good part: rich scoped cards, explicit gates, strong review loops, and a trust ladder that earns autonomy instead of assuming it. The website can stay simpler than the full pipeline, but the underlying card standard still needs real build context instead of thin notes.',
  },
  {
    id: 'UX-002',
    title: 'Wire Harlan to one continuous cross-channel assistant',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 25,
    source: 'Foundation assistant product design',
    summary: 'Make Harlan one real assistant identity across web, Telegram, and future channels instead of separate mock chat surfaces. The website chat should continue the same conversation and memory thread no matter where Steve is talking to Harlan.',
    whyItMatters: 'If Harlan feels like separate fake copies in different channels, trust drops immediately. The Foundation viewer should reflect one assistant, one memory spine, and one session history across channels.',
    nextAction: 'Define the shared conversation model, channel identity rules, and memory/session contract for Harlan across web and Telegram.',
    statusNote: 'Current home chat is only a preview. This captures the real product requirement.',
  },
  {
    id: 'UX-003',
    title: 'Align Foundation nav order with strategy review order',
    team: 'dev',
    lane: 'done',
    priority: 'P2',
    rank: 26,
    source: 'Foundation viewer audit',
    summary: 'Keep the Foundation site in the same top-down order we use to review and lock strategy so the website stays a clean viewing layer instead of inventing a new mental model.',
    whyItMatters: 'The website exists to help Steve view the system. If the nav order drifts from the actual strategy packet, review gets harder and the UI starts creating confusion instead of reducing it.',
    nextAction: 'Keep the nav aligned to the current review model as future hubs split out; do not let later additions reintroduce a confusing order.',
    statusNote: 'Done. The Foundation nav now follows the review order and the packet/supporting-doc hierarchy instead of inventing a separate mental model.',
  },
  {
    id: 'UX-004',
    title: 'Create a Foundation UI pattern checklist',
    team: 'dev',
    lane: 'done',
    priority: 'P2',
    rank: 27,
    source: 'Foundation build consistency',
    summary: 'Write down the small layout and component rules that keep Foundation pages consistent as we keep rebuilding them.',
    whyItMatters: 'Without a pattern checklist, small shifts in where intros, source lines, footers, tables, and live snapshot cards sit will keep making the system feel inconsistent even when the data is right.',
    nextAction: 'Keep `docs/superpowers/specs/foundation-ui-patterns.md` current as the live pattern note and treat future approved-section protections as UX-005 work, not a reason to reopen this card.',
    statusNote: 'Done. The Foundation UI pattern checklist now exists as a live internal build note.',
  },
  {
    id: 'UX-005',
    title: 'Protect approved UI sections from drift during moves and refactors',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Strategic Execution move failure',
    summary: 'When a section or card has already been approved, moving it to a new hub should preserve the exact content and layout unless a new explicit redesign is approved.',
    whyItMatters: 'We lost time and trust by reinterpreting an approved section instead of moving it literally. The system needs a guardrail for approved UI so moves do not become accidental rewrites.',
    nextAction: 'Define the first protection mechanism for approved sections: exact component reuse, approved-section registry, or snapshot-based checks for key Foundation and Strategic Execution views.',
    statusNote: 'This is a build-discipline rule derived directly from the Current Quarter move failure.',
  },
  {
    id: 'UX-006',
    title: 'Build smart export packets for Strategy and Foundation',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 28,
    source: 'Foundation home review + strategy export pass',
    summary: 'Replace the current single-file strategy PDF with source-backed export packets that can assemble the business strategy, its supporting docs, and later the full Foundation surface into one polished branded artifact.',
    whyItMatters: 'Leadership will need artifacts that can be downloaded, shared, printed, and reviewed outside the app, but those exports cannot collapse back into stale ad hoc documents. The export system needs to respect the modular strategy architecture while still producing one clean packet when needed.',
    nextAction: 'Define export modes and inclusion rules: strategy packet only, strategy packet plus supporting docs, and eventual full Foundation export with system strategy, source trust, decisions, and closeout state. Decide ordering, branding, appendix behavior, timestamps, and how live source-backed sections should be consolidated without breaking trust or duplicating stale snapshots.',
    statusNote: 'Not a Foundation closeout blocker. Do this after Home, Strategy, and System Strategy are fully buttoned up.',
  },
  {
    id: 'CLEANUP-001',
    title: 'Clean leftover internal references and shared frontend helpers after Foundation closeout',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Frankenstein prevention audit',
    summary: 'The live Foundation files are much cleaner now, but there are still a few internal leftovers: duplicated helper code across the frontend surfaces, historical build notes that reference removed files, and compatibility aliases that should eventually be reviewed instead of living forever by accident.',
    whyItMatters: 'The remaining risk is no longer giant dead live files. It is slower drift: duplicated helper logic, stale internal references, and compatibility glue that nobody re-evaluates. Cleaning that up keeps Foundation tight without wasting time on fake archaeology.',
    nextAction: 'Review the current real candidates: shared helper duplication across `public/doc.js`, `public/foundation.js`, and `public/strategic-execution.js`; historical internal build notes under `docs/superpowers/*`; and the remaining compatibility aliases for removed doc paths. Keep intentional redirects, archive stale build notes when they stop helping, and only delete what no longer serves a real purpose.',
    statusNote: 'This is now a bounded hygiene pass, not a hunt for imaginary dead files.',
  },
  {
    id: 'MANDATE-001',
    title: 'Define dual mandates for departments with dual pillar roles',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 28,
    source: 'Department mandates review',
    summary: 'Departments that support more than one pillar should not be flattened into one vague mandate. Define their overall mandate, then break out the specific mandate they carry inside each pillar they influence.',
    whyItMatters: 'If Marketing, Operations, or other cross-functional teams are described too loosely, ownership gets blurry. The system needs to show what each department is responsible for in Attract, Grow, and Retain when those roles split.',
    nextAction: 'When the mandates pass starts, identify departments with dual roles and define both the overall mandate and the pillar-specific mandates they carry.',
    statusNote: 'Captured during the Agent Engine and mandates review so it is handled intentionally, not as a wording patch.',
  },
  {
    id: 'AGENT-002',
    title: 'Build a live strategic operator across leadership and department cadences',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 29,
    source: 'Leadership meeting agent idea',
    summary: 'Create an agent that sits across leadership, strategy, and key department meetings, prepares the room, keeps the agenda on sequence, asks follow-up questions, captures decisions, turns them into structured work, and can push approved updates into connected systems like backlog, ClickUp, and operating trackers during or immediately after the meeting.',
    whyItMatters: 'Leadership should not have to both run the business and act as the full-time strategy PM layer. A strong strategic operator could protect cadence, improve accountability, spot drift across departments, and close the gap between meeting decisions and real system updates.',
    nextAction: 'Define the MVP: pre-meeting briefing, live presence across core cadences, agenda enforcement, question prompts, decision extraction, owner/deadline tracking, approval rules for in-meeting system updates, post-meeting closeout, and escalation rules when departments miss commitments or drift off strategy.',
    statusNote: 'Start as a disciplined strategic operator across the main business cadences, not a transcript bot, novelty demo, or fully autonomous meeting boss.',
  },
  {
    id: 'AGENT-003',
    title: 'Add voice-triggered live meeting control for Harlan',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Meeting copilot product idea',
    summary: 'Let Harlan join a Google Meet or business cadence as a live strategic operator that can be activated by voice cues such as “Hey Harlan, kick us off” or “Hey Harlan, what are we missing?”',
    whyItMatters: 'If Harlan can be activated naturally in the room, it becomes much easier to use across leadership and department meetings for kickoff, agenda discipline, question prompting, and approved in-meeting actions without turning the meeting into a manual operator workflow.',
    nextAction: 'Define the first live-meeting interaction model: wake phrase or push-to-talk trigger, meeting-room transport, interruption rules, participant awareness, approval gates for live system changes, and when Harlan should speak versus stay silent across the main cadences.',
    statusNote: 'This is a voice/runtime layer on top of AGENT-002, not a replacement for the live strategic operator core.',
  },
  {
    id: 'AGENT-004',
    title: 'Add mission-control and queue safety for the live operator',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Strategic operator runtime design',
    summary: 'Create the runtime safety layer for the live operator: mission-control visibility, queued task routing, duplicate suppression, and approval boundaries so meeting, chat, and follow-up actions do not collide or fail silently.',
    whyItMatters: 'A live operator that can speak, write, delegate, and update systems across channels will lose trust fast if actions overlap, disappear, or fire twice.',
    nextAction: 'Define the first runtime contract: queue semantics, operator session state, channel allowlists, duplicate suppression, approval checkpoints, and the minimum mission-control view needed to supervise live operator actions.',
    statusNote: 'This is runtime trust and observability for AGENT-002/003, not a vanity dashboard project.',
  },
  {
    id: 'AGENT-009',
    title: 'Prepare a v1 strategic planning copilot for the April 22 planning session',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 16,
    source: 'Strategic planning deadline + Mark Kashef meeting-pattern review',
    summary: 'Build the first narrow strategic-planning copilot around the April 22 planning session instead of treating the meeting-agent idea as abstract future work. V1 should prepare the room, prompt sharper questions, capture real decisions and owners, and produce a usable closeout packet after the session.',
    whyItMatters: 'This is the first real prove-it moment for the strategic-operator idea. If the system can materially improve one live planning session, it earns the right to expand into recurring leadership and department cadences. Mark\'s work makes it clear this can be real; the rebuild needs to capture that value without pretending we adopted his full stack.',
    nextAction: 'Scope the April 22 MVP: required pre-read inputs, agenda structure, in-room interaction mode (voice or text-assisted), decision/owner extraction, approval boundary for live updates, and the exact outputs leadership should receive within 24 hours after the session.',
    statusNote: 'This is a narrow trust-building loop for one planning session, not the whole War Room or agent-runtime buildout.',
  },
  {
    id: 'SYSTEM-004',
    title: 'Build a live System Capabilities surface',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 32,
    source: 'Old-system audit + Foundation visibility review',
    summary: 'Create one live place in Foundation that shows what the OS can actually use right now: models, tools, skills, connectors/plugins, and any system-level runtimes that future hubs and agents depend on.',
    whyItMatters: 'The old system had useful capability visibility, but it was trapped in generated docs and stale JSON. In the rebuild, hidden capability state creates the same confusion in a cleaner wrapper: people cannot tell what the system really has, what is connected, what is trusted, or what is still just an idea.',
    nextAction: 'Define the first capabilities schema and UI: model layer, tool layer, skill layer, connector/plugin layer, working status, proof of working state, and which agents or surfaces can access each capability. Drive it from real config and runtime state instead of a hand-maintained inventory doc.',
    statusNote: 'This should become a live operating surface, not another static markdown report.',
  },
  {
    id: 'SYSTEM-005',
    title: 'Build role-based human approval routing across the OS',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Governance review + old write-safety gold',
    summary: 'Replace founder-centric approval assumptions with a role-based human approval model so strategy changes, outbound actions, content approvals, and future agent writes route to the right owner instead of collapsing back onto one person.',
    whyItMatters: 'The system cannot be sellable, scalable, or politically durable if every approval path implicitly routes to Steve. The old backlog had the right instinct here, and the current doctrine already points the same way: the right human owner confirms. That needs to become an explicit operating model, not just wording.',
    nextAction: 'Define approval routing by action type: strategy changes, source sign-off, content approval, outbound communication, department execution, and future agent configuration changes. Name owner roles, fallback rules, escalation rules, and what must be recorded in the audit trail every time an approval happens.',
    statusNote: 'Start with routing doctrine and visibility before automating actual approval flows.',
  },
  {
    id: 'SYSTEM-006',
    title: 'Define what Foundation Operations owns versus what future hubs own',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Foundation Operations review',
    summary: 'Tighten the operating-record model so Foundation Operations clearly owns the root system records, while Strategic Execution, Marketing, departments, and future hubs own their own execution records instead of dumping everything back into Foundation forever.',
    whyItMatters: 'The current root queue is intentionally transitional, but that only works if the boundary is explicit. Without a clean ownership model, the team will keep asking whether a backlog item, decision, question, or policy belongs to Foundation, to a strategy layer, or to a future hub. That confusion turns the root system into a catch-all and eventually recreates the same clutter this rebuild is trying to avoid.',
    nextAction: 'Define the ownership rules and record map for Foundation Operations: what belongs in the canonical decision log, what stays in the root Foundation backlog, what counts as a root open question, what becomes filtered views, what graduates into Strategic Execution, and what moves into future hub-local queues without losing traceability.',
    statusNote: 'The UI can stay simpler for now. The important thing is to lock the ownership model before more hubs and work queues arrive.',
  },
  {
    id: 'SYSTEM-007',
    title: 'Build a searchable Foundation activity explorer beyond the latest audit feed',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Foundation Operations review',
    summary: 'Keep `System Activity` as the short operator feed, but add the fuller audit surface behind it so the team can search, filter, and inspect older change events instead of relying on only the latest page-sized slice.',
    whyItMatters: 'The latest 20 events are enough for quick operator review, but not enough for real audit work once the system gets busier. If the only visible history is a tiny rolling window, conflict cleanup, provenance review, and postmortems will all stay harder than they need to be.',
    nextAction: 'Design the first real activity explorer: event search, date range, actor filter, entity type filter, event-type filter, direct links back to the affected record, and enough metadata visibility that humans can reconstruct what changed without going spelunking through raw DB rows.',
    statusNote: 'Do not turn the default page into a noisy firehose. Keep the main activity page short and readable, then add the explorer as the deeper audit layer.',
  },
  {
    id: 'SYSTEM-008',
    title: 'Deepen System Health into a real diagnostic and alert model',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Foundation Operations review',
    summary: 'Keep the home page as the closeout summary, but evolve `System Health` into the deeper diagnostic layer for trust, memory, verification, connector/runtime state, and future alert conditions.',
    whyItMatters: 'Right now `System Health` is only the first component-status layer. That is fine for the current rebuild, but eventually the team will need a clearer distinction between high-level closeout state on Home and low-level operator diagnostics, degradation reasons, and health warnings in the health view.',
    nextAction: 'Define the health model and view layers: which components belong in health, what counts as live/pending/risk/planned, how source-health and verification failures should surface, what future alerts or warning thresholds matter, and how the page should differ from the simpler home-page summary.',
    statusNote: 'Good enough for now, but it should grow into a true operator diagnostic surface instead of staying a shallow duplicate forever.',
  },
  {
    id: 'SYSTEM-012',
    title: 'Define hub Scopers before building acting agent swarms',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Foundation-to-hub architecture refinement',
    summary: 'Lock the role of a hub Scoper: a reader that consumes approved Foundation intelligence, goes deeper into raw context when needed, and produces scoped work for one hub before any large acting-agent layer is turned on.',
    whyItMatters: 'The old system had the right instinct with directors and scopers, but the architecture became too fragmented. If the rebuild skips this role definition, it will either jump too fast into acting agents or collapse all intelligence work back into one giant assistant.',
    nextAction: 'Define the scoper contract for each future hub: what approved atoms it reads, what raw sources it may reopen, what questions it should answer, what scoped outputs it should produce, and what remains out of bounds until a later acting layer exists.',
    statusNote: 'Foundation ingests and approves. Hub Scopers read, deepen, and scope. Later specialist agents act.',
  },
  {
    id: 'AGENT-005',
    title: 'Define the agent franchise model before building more agents',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Old-system audit + agent-franchise discussion',
    summary: 'Define the contract every real agent must satisfy before it is built or activated: purpose, owner, model, tools, skills, permissions, memory, inputs, outputs, cadence, reports, escalation path, and approval boundary.',
    whyItMatters: 'The old system had good agent ideas but weak enforcement. Agents existed without one consistently enforced contract, which made them hard to trust, hard to compare, and easy to let drift. If we build more agents without a franchise model, we will repeat the same failure in a prettier interface.',
    nextAction: 'Write the first franchise schema and build gate for agents. Include the research-before-build rule: before creating a new role, first study what a world-class version of that role actually does, then encode that into the agent contract instead of guessing from scratch.',
    statusNote: 'This is the build gate for future agents, not just another planning note.',
  },
  {
    id: 'AGENT-006',
    title: 'Build a live Agent Registry from the franchise contract',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Old All Agents + Agent Detail audit',
    summary: 'Create a live registry page for every real and planned agent so the team can see what exists, what each agent is for, who owns it, what it can access, and what contract it is supposed to satisfy.',
    whyItMatters: 'The old All Agents and Agent Detail surfaces were conceptually right: people need a visible registry, not hidden agent definitions scattered across files. But the old implementation went stale because it depended on generated docs and startup JSON. The new system should keep the visibility and kill the staleness.',
    nextAction: 'Define the first registry views: all agents, per-agent detail, owner, status, model, tools, skills, permissions, memory layer, cadence, outputs, source dependencies, and last known operational state. Drive it from the live franchise model and runtime state, not a nightly generated document.',
    statusNote: 'Registry explains what the agent is. Operations will explain what it is doing right now.',
  },
  {
    id: 'AGENT-007',
    title: 'Build a live Agent Operations surface',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Old agent-operations audit + Foundation supervision need',
    summary: 'Create the live operational view for agent runtime state: scheduled, running, degraded, paused, queued, awaiting approval, recently changed, and recently failed.',
    whyItMatters: 'An agent registry is not enough. Humans also need to know what is happening now. The old dashboard had the right instinct with activity, schedule, and status, but the new system should separate static contract from live operations so supervision stays clear instead of noisy.',
    nextAction: 'Define the smallest useful operations surface: status, schedule, last successful run, current queue, blocked approvals, degraded reasons, recent outputs, and recent change events. Keep it live and operational, not a vanity telemetry board.',
    statusNote: 'Start simple. This is supervision and trust, not a giant NOC dashboard.',
  },
  {
    id: 'AGENT-008',
    title: 'Separate agent identity from system repos and define the three-tier agent model',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Claude audit + agent-boundary design discussion',
    summary: 'Codify the operating-model boundary: personal agents can span multiple systems for one human owner, system-dedicated agents can know one system deeply, and coding assistants like Codex and Claude Code stay implementation tools instead of pretending to be business agents. Agent identity, memory, permissions, and channel access should live outside any one project repo.',
    whyItMatters: 'The old system blurred folder docs, agent persona, and coding tools. That makes every repo feel like an agent cage and forces the same architecture debate every session. Clean boundaries are required before an agent registry, agent operations, or cross-project assistants can be trusted.',
    nextAction: 'Define the first external agent identity model (`~/.agents/<name>/` or equivalent registry), map the first examples across the three tiers, and document what belongs in repo docs versus agent identity and runtime config.',
    statusNote: 'This is an architecture-boundary card, not a prompt-writing exercise.',
  },
  {
    id: 'INFRA-003',
    title: 'Define isolated macOS deployment for browser-capable agents',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 42,
    source: 'Claude audit + Mac Mini deployment discussion',
    summary: 'When agents need real browser auth or separated credentials, deploy them with isolated macOS users and sessions instead of piling everything into one shared operator account. The deployment note should cover separate Chrome profiles, Keychains, tokens, logs, dummy-display assumptions, and how to attach for debugging without contaminating another agent session.',
    whyItMatters: 'Headless browser work breaks too often on real auth, and shared sessions blur credentials fast. The deployment boundary matters as much as the prompt boundary once real agents can browse, log in, or act on behalf of different people.',
    nextAction: 'Write the first Mac Mini deployment note: one user per browser-capable agent, session isolation, profile/token boundaries, launchd implications, dummy HDMI/display strategy, and the debug attach path.',
    statusNote: 'Do this before live browser agents, not after the first credential mess.',
  },
  {
    id: 'SYSTEM-011',
    title: 'Define a project registry for cross-project personal agents',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 43,
    source: 'Claude audit + cross-project assistant discussion',
    summary: 'Personal agents like Harlan should know which repos, dashboards, APIs, and credential boundaries they are allowed to reach across Steve\'s systems. Make that explicit in a project registry instead of leaving cross-project reachability as hidden human memory.',
    whyItMatters: 'Cross-project agents are only useful if reachability is visible and governed. Without a registry, roaming agents become either overpowered or mysteriously blind, and every new system turns into manual one-off setup.',
    nextAction: 'Define the first registry schema: system key, local path, repo URL, API base, auth mode, allowed actions, owner, and escalation boundary. Use it later as the routing layer for personal assistants that span multiple systems.',
    statusNote: 'This is the cross-project reachability map for personal agents, not a duplicate of the per-system Agent Registry.',
  },
  {
    id: 'SKOOL-001',
    title: 'Mine Early AI-dopters content for reusable architecture patterns',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 44,
    source: 'Mark Kashef Skool access + ClaudeClaw reference review',
    summary: 'Use the Skool membership and blueprint materials as a structured research source. Extract reusable patterns, implementation lessons, and proven workflows that strengthen bcrew-ai-os without copying code or drifting into a Claude-only architecture.',
    whyItMatters: 'The value is not the hype. It is the fact that somebody built a real working agent runtime with meeting, memory, delegation, and operational layers we can learn from. If we joined and never mine it, we waste both time and signal.',
    nextAction: 'Start with the blueprint kit and the Build-Your-Own ClaudeClaw course. Tag findings as: reusable now, useful later, Claude-specific, or rejected. Route the good parts into existing backlog cards instead of spawning a second architecture track.',
    statusNote: 'Research only. Borrow patterns, not code, and do not let this turn into accidental framework adoption.',
  },
  {
    id: 'SOURCE-014',
    title: 'Close strategy live-input boundary for the full strategy packet',
    team: 'dev',
    lane: 'ranked',
    priority: 'P0',
    rank: 7,
    source: 'rebuild-plan',
    summary: 'Freedom Community, BHAG Builder, and Agent Engine have now been captured deeply for current reality. The remaining strategy-input closeout is to finish the strategy-used Owners slice, align the visible source-layer docs/contracts, and explicitly close the full package boundary before calling strategy done.',
    whyItMatters: 'If the package-level card still says the Freedom inputs are only readable after the walkthrough is done, the backlog starts lying about current reality again. The package is still open, but for a narrower reason now.',
    nextAction: 'Hold the Freedom current-reality capture as locked, finish the strategy-used Owners input slice, then update source contracts, source registry, current-state visibility, and the package closeout note so `SOURCE-014` reflects the true remaining gap.',
    statusNote: 'Narrowed after the Freedom current-reality pass on 2026-04-18 so the card reflects the remaining package-level closeout instead of re-requesting finished walkthrough work.',
  },
  {
    id: 'SOURCE-015',
    title: 'Investigate Real Broker API as a future source-of-truth layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Freedom / Real Broker follow-through',
    summary: 'Validate the Real Broker reZEN / Bolt API as more than a simple reporting feed. The old system already treated it as a candidate source for team roster, cap status, commission history, closed transactions, and downline/network data, with known endpoint patterns and an API key obtained at the time. A key strategic use case is identifying the strongest builders across the combined ownership-group network instead of treating the API as just another stats source.',
    whyItMatters: 'The rebuild should not blindly copy spreadsheet shortcuts for community revenue, cap state, commission logic, or network size if the brokerage platform itself can supply cleaner direct truth. More importantly, this source may be the cleanest path to find the top builders inside the combined Real network so Benson Crew can identify who is really driving growth, build tighter relationships with them, and create higher-value rooms like masterminds around the right people.',
    nextAction: 'On the Mac Mini, verify whether Real Broker credentials still exist and work, test the old candidate endpoints (`/api/v1/agent/{id}/cap-info`, `/api/v1/agent/{id}/commission-history`, `/api/v1/reports/{id}/transactions/closed`, `/api/v1/agents/{id}/network-size-by-tier`), then determine whether Real exposes enough structure to rank the top builders across the combined network and support future mastermind / relationship-building workflows. Map exactly which truths Real can own versus what must stay in Freedom, Owners, or ClickUp.',
    statusNote: 'Not for the middle of the current sheet pass. This is the follow-through card for building a cleaner future source-of-truth layer once validation is done.',
  },
  {
    id: 'SOURCE-016',
    title: 'Define the marketing pillar source map for Benson Crew, Steve Zahnd, and MarketMasters',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Freedom marketing tabs + old performance system review',
    summary: 'Lock the future foundation source map for the four marketing pillars `awareness`, `engagement`, `leads`, and `remarketing` across the lanes that now matter: Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. Use the old performance system and the current Freedom marketing tabs as reference material, not as the final source model.',
    whyItMatters: 'The old system already proved the right shape: normalized KPI storage by brand and pillar, plus explicit remarketing audience tracking. But the live business has moved beyond the old three-lane model. Benson Crew residential, Zahnd Team Ag, Steve personal brand, and MarketMasters should not collapse into one fuzzy Steve/Zahnd bucket. If this source map stays fuzzy, the future marketing rebuild will mix the wrong properties, audiences, SEO, retargeting pools, and lead flows.',
    nextAction: 'Use `docs/source-notes/freedom-marketing.md` plus the old performance collector to lock the live source inventory by brand lane and pillar: verify `GA4`, `Search Console`, `Google Business Profile`, `Google Ads`, `Meta`, `YouTube`, remarketing audiences, and the publishing/distribution surface. Explicitly split what belongs to Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters, including legacy Zahnd-era assets that still generate live traffic or leads. Treat `SRC-PUBLISH-001` as a real SocialPilot validation task now that the enterprise API docs and key exist, but do not mark it connected until the owner/user auth context is proven.',
    statusNote: 'This is no longer a pure theory card. The old system already proved the brand/pillar model and the current gap is connector reality: working auth, account ownership, lane verification, and missing contracts. The lane model also changed: Zahnd Team Ag now needs to be treated as its own pillar, not buried inside Steve or old Zahnd leftovers.',
  },
  {
    id: 'SOURCE-017',
    title: 'Lock KPI and FUB opportunity-hygiene rules before building sales coaches',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 42,
    source: 'KPI deep audit + founder operating truth',
    summary: 'Define one explicit Benson Crew rule model for accidental FUB-created leads, temporary `Delete Lead` cleanup, support-network vs active-lead staging, non-lead homes like `Realtors/Vendors`, `Other Contacts`, and `Trash`, and true opportunity re-entry so future AI coaches do not mistake dirty CRM movement for real pipeline creation.',
    whyItMatters: 'The KPI system can only coach well if it knows the difference between a new human, a bad auto-created lead, and a real new opportunity. If that semantic layer stays in Steve’s head, future assistants will overstate lead creation, understate hygiene problems, and coach from broken pipeline truth.',
    nextAction: 'Use the KPI `How To` rules, FUB stage model, old-system appointment / stage notes, and current founder doctrine to write the explicit opportunity-hygiene contract: when `Delete Lead` is temporary cleanup, which stages are true non-lead homes, how `Possible Supporter` differs from `Supporter/SOI`, how `Realtors/Vendors`, `Other Contacts`, and `Trash` should be treated, how re-entry should be interpreted, and which cases future agents may suggest cleaning before they report KPI performance. Explicitly separate founder-approved doctrine from raw stage-table presence and rough UI badge grouping.',
    statusNote: 'The founder-side meanings are now largely locked. The remaining work is turning that doctrine into a clean governed contract before building FUB cleanup agents, KPI coaches, or any automation that praises new-opportunity counts. Live KPI / Supabase still carries transitional stage rows and rough grouping logic, so the contract must win over naive stage-name reads. Future FUB-manager work should also explicitly own stale stage cleanup for old `Cond` records plus `Pend` / `Close120` lifecycle discipline.',
  },
  {
    id: 'SOURCE-018',
    title: 'Revalidate Google Gemini meeting notes as a foundation source contract',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 43,
    source: 'Shared communications audit + strategy-change review',
    summary: 'Treat Google Workspace meeting notes and transcripts, including the Gemini note-taker output already included in the stack, as a first-class foundation source instead of leaving them spread across memory cards and future operator ideas.',
    whyItMatters: 'Strategy, governance, and people accountability all depend on what was actually said in the room. If meeting capture stays vague, decisions, annotations, and follow-through will keep depending on founder memory and partial summaries.',
    nextAction: 'Use the now-live paginated delegated scan, transcript-gap report, and meeting-class metadata to close the meeting contract: verify the post-default forward flow on each organizer’s most recent meetings, keep widening governed extraction/apply depth, and only then decide whether older pre-2026 artifacts justify a deeper historical pull.',
    statusNote: 'Delegated meeting-note reads now scan the enabled BCrew user list with paginated Drive search, detect standalone transcript docs or embedded transcript sections, archive canonical meeting artifacts into PostgreSQL, mirror organized copies into Crewbert Drive in copy mode, and tag meetings `broadcast` vs `discussion`. Remaining work is forward-looking transcript enforcement verification, privacy/read-side controls, and deeper historical probing, not basic access.',
  },
  {
    id: 'SOURCE-019',
    title: 'Build the shared communications ingestion and synthesis layer',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 44,
    source: 'Shared communications audit + old-system operator pattern',
    summary: 'Read Missive email threads and comments, Google meeting notes, Slack messages, and related Gmail surfaces into one governed extraction layer that can synthesize what work is happening, what decisions were made, and what tasks or ClickUp updates should be proposed.',
    whyItMatters: 'The value is not just source access. The value is turning the places where the team already works into usable intelligence so Steve and Carson do not have to reread everything manually just to understand progress, decisions, and follow-through.',
    nextAction: 'Keep Gmail / Missive / Slack / meeting archives stable, deepen candidate promotion paths, and add read-side subject-person redaction after the first cross-source lane stays usable for strategy prep and operating review. Then close the actual synthesis functions on top: cross-artifact linking, resolution detection, cross-source dedup, staleness scoring, and actionability ranking.',
    statusNote: 'Shared archive is now materially real across Gmail, Missive, Slack, meeting notes, and meeting transcripts, with governed extraction live for all four and first apply paths for task -> backlog, decision -> decision, and blocker -> open question. The missing piece is no longer just “more ingestion.” It is the synthesis layer that decides what is still live, what is already resolved, and what should actually be surfaced.',
  },
  {
    id: 'SOURCE-020',
    title: 'Port and harden the shared communications source adapters',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: 'Shared communications implementation review',
    summary: 'Use the proven old readers as the starting point for the rebuild instead of inventing fresh adapters: port the richer delegated Google readers, port the Missive bridge, and revalidate Slack reads as a read-first source surface.',
    whyItMatters: 'The fastest credible path is not a blank-sheet rebuild of every connector. The old system already proved useful Gmail, Calendar, Drive-export, meeting-note, and Missive read patterns. Reusing those patterns cleanly is lower risk and gets Foundation to a usable shared-intelligence layer faster.',
    nextAction: 'Keep the now-live Google delegated stack, Missive bridge, and Slack reader stable, watch for pagination/regression issues, and harden the remaining rollout gaps before layering more automation on top.',
    statusNote: 'Adapter hardening is no longer hypothetical: Drive pagination is fixed, the meeting backfill now reaches a real multi-month archive, Slack history paginates, and the existing bot covers almost all required ops channels. Remaining adapter work is the last Slack rollout gaps plus older-archive probing, not blank-sheet connector work.',
  },
  {
    id: 'SYNTHESIS-ENGINE-001',
    title: 'Build the continuous synthesis layer on top of extraction',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 46,
    source: 'Shared-comms architecture review + founder pushback on mining without intelligence',
    summary: 'Turn the shared candidate queue into actual intelligence by continuously linking related signals, detecting what has already been resolved, deduping repeated mentions across sources, scoring staleness, and ranking what is truly actionable now.',
    whyItMatters: 'Raw extraction is not the end product. A table with thousands of task, blocker, decision, and atom candidates is just mining residue unless the system can collapse it into a small live set of what is new, unresolved, relevant, and worth attention. This is the layer that makes the archive useful for strategy, operating review, and later hub reasoning.',
    nextAction: 'Write the first synthesis contract and output shape. It must cover: cross-artifact linking, resolution detection against later artifacts and trusted systems like ClickUp/decision ledgers, cross-source dedup, staleness scoring, actionability ranking, and how batch digests versus continuous per-artifact synthesis should coexist. Use old executive/intelligence report, feedback-scout, and director-brief patterns as the shape reference: decisions, action items, bottlenecks, escalation-worthy issues, suggested owner, suggested next action, and ranked findings with evidence. Unify those into one Foundation substrate instead of many disconnected skills.',
    statusNote: 'This is the real gap Steve identified. Archive + extraction are now materially real. The next proof is a synthesis output that surfaces a small ranked live set instead of dumping raw candidates.',
  },
  {
    id: 'COMMS-BACKFILL-001',
    title: 'Make shared-comms historical backfills cursor-based and supervised',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 46,
    source: 'Late-night shared-comms checkpoint + bounded Gmail/Missive runs',
    summary: 'Turn Gmail, Missive, Slack, Drive/Meet, and Zoom historical pulls into resumable backfill jobs with explicit cursor state, oldest/newest coverage, errors, rate-limit handling, and run status instead of relying on one-off manual terminal runs.',
    whyItMatters: 'The archive is now valuable, but Steve needs to know what time window is actually covered. Bounded pulls can look complete while only reaching April 2026. Without durable cursor state, 180-day or merger-era coverage becomes tribal memory and cannot be trusted by Strategy Hub or future briefs.',
    nextAction: 'Define the first backfill-run record model and wire it into the existing scripts: Missive `until` cursor, Gmail mailbox/date-window state, Slack pagination, Drive page tokens, Zoom folder import status, per-run counts, oldest/newest artifact dates, last error, and next safe command. Keep it read/archive only until `SYSTEM-010` supervision exists.',
    statusNote: 'Current archive depth is useful but not historically complete: Gmail and Missive currently reach April 2026, Slack reaches January 2026, meeting artifacts include recovered Zoom chat context back to October 2024, and transcripts reach March 2025. This card owns the difference between “we have a lot” and “we know coverage is complete.”',
  },
  {
    id: 'SYNTHESIS-FACTS-001',
    title: 'Ground synthesis in source-backed KPI, finance, strategy, and operating facts',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 46,
    source: 'Founder clarification on atoms versus decision-grade strategy intelligence',
    summary: 'Feed synthesis with governed source facts from strategy, KPI, finance, Owners, FUB, marketing, and source contracts so strategy packets rank issues against the business reality instead of only summarizing comms candidates.',
    whyItMatters: 'Atoms from meetings and emails are not enough for ownership decisions. Strategy work needs concise facts: KPI breaks, cash/finance exceptions, source-trust gaps, deal/lead-source truth, and signed-off strategy priorities. Those should stay source-backed and traceable, not become loose atom spam.',
    nextAction: 'Extend the synthesis input contract with a source-fact bundle: current priorities, KPI/finance exceptions, Owners/FUB source-trust issues, marketing connector health, and strategy-source status. Each synthesized item should carry evidence plus the metric/source fact that changes the decision, or be suppressed from ownership packets.',
    statusNote: 'The V1 synthesis contract now states the atom boundary. This card turns that doctrine into implementation so the strategy packet becomes a tight decision brief, not another long report.',
  },
  {
    id: 'PLATFORM-INTEL-001',
    title: 'Define the cross-platform intelligence layer for publishing hubs',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 47,
    source: 'Founder authority build + multi-hub content architecture',
    summary: 'Define one Foundation layer for platform-specific publishing intelligence so future hubs do not each reinvent what YouTube, Instagram, TikTok, X, LinkedIn, Skool, SEO, AEO, and Meta currently reward.',
    whyItMatters: 'Publishing hubs will need current format rules, cadence patterns, algorithm changes, and performance lessons. If every hub rediscovers that separately, the system will duplicate work and drift.',
    nextAction: 'Define the minimum source map and storage model for platform intelligence: platform announcements, trusted external trackers, internal post-performance reads, and the normalized facts each publishing hub should be able to consume.',
    statusNote: 'Do not block Sunday strategy prep or current shared-comms work on this. Queue it now so the publishing layer has a real Foundation home later.',
  },
  {
    id: 'CRM-OWNERSHIP-001',
    title: 'Define owner-entity tagging before multi-tenant CRM work',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 48,
    source: 'Founder portability rule + future recruiting CRM design',
    summary: 'Define the owner-entity field and export boundary before the future BCrew AI OS CRM and tenant model land so Steve-owned, BCrew-owned, Real-owned, and shared records do not get mixed by accident.',
    whyItMatters: 'Once CRM records, hub data, and future recruiting flows start writing into one system, retrofitting ownership semantics will be painful. The portability boundary needs to exist before multi-tenant writes become real.',
    nextAction: 'Lock the first owner-entity schema and read/write rules for `steve_personal`, `bcrew_llc`, `real_broker`, `unchained_realtor`, and `shared`, then attach that model to the future multi-tenancy and recruiting-CRM work instead of bolting it on later.',
    statusNote: 'Architectural card only for now. Do not let this sprawl into building the recruiting CRM before the Foundation core and Sunday strategy work are closed.',
  },
  {
    id: 'CRM-RECRUIT-001',
    title: 'Build Steve personal recruiting CRM inside AI OS later',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 48,
    source: 'Unchained Realtor capture-forward discussion + founder CRM boundary',
    summary: 'Future recruiting CRM should live inside BCrew AI OS as Steve’s personal/recruiting lane, not as a separate Unchained Realtor CRM. External funnels should capture and forward leads into one governed people system.',
    whyItMatters: 'Steve does not want to manage two CRMs. Recruiting leads, course/community leads, and team-candidate relationships need one source of truth with owner-entity tagging so Steve-owned records remain portable and BCrew-owned records remain clear.',
    nextAction: 'After Foundation, multi-tenancy, and owner-entity rules are stable, define the first recruiting CRM schema: candidate, source/funnel, relationship state, follow-up cadence, conversation history, ownership entity, export boundary, and how it reads shared intelligence without exposing private team commentary.',
    statusNote: 'Future build only. Do not let this interrupt current shared-comms, synthesis, source-trust, or strategy-foundation work.',
  },
  {
    id: 'CRM-LEGACY-001',
    title: 'Archive and review legacy Houseable CRM code if it becomes available',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 48,
    source: 'Founder note about prior million-dollar CRM build',
    summary: 'If Steve gets the old Houseable/legacy CRM code into Git, archive it as reference material and mine it for useful schema, workflow, and CRM-domain lessons without importing the old runtime blindly.',
    whyItMatters: 'The old CRM may contain paid-for domain knowledge that can reduce future rebuild mistakes, but copying old code into the new OS without review would recreate legacy complexity. It should be preserved as reference, not treated as the target architecture.',
    nextAction: 'When the repo arrives, read the database schema, lead/contact model, task/follow-up flows, permission model, and reporting logic. Produce one source note: salvageable concepts, rejected patterns, and implications for `CRM-RECRUIT-001` or any future FUB-replacement work.',
    statusNote: 'No action until Steve provides the repo. This is a parking card so the idea is not lost.',
  },
  {
    id: 'AVATAR-001',
    title: 'Port and lock the marketing avatar registry from the old system',
    team: 'marketing',
    lane: 'research',
    priority: 'P2',
    rank: 49,
    source: 'Old marketing system avatar docs + future marketing hub design',
    summary: 'Carry forward the real avatar work from the old system instead of rebuilding audience understanding from scratch when the marketing hub starts. The old registry already includes the ten RETAIN avatars and five ATTRACT avatars with real pains, search behavior, language, and content triggers.',
    whyItMatters: 'Avatars are foundational for the marketing hub, but they are not the base schema for every atom in Foundation. They should become a governed overlay that marketing, content, and recruiting layers can use without forcing all shared intelligence into one marketing-shaped model.',
    nextAction: 'Import the old avatar docs into a governed registry, normalize the avatar fields that actually matter for future marketing execution, and explicitly map where Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters share or diverge. Use them later as a marketing overlay on top of shared business atoms.',
    statusNote: 'Low-priority for this block, but the salvageable doctrine is real. Keep it queued so the future marketing hub starts from proven audience truth instead of a blank sheet.',
  },
  {
    id: 'PM-BASE-001',
    title: 'Define the shared project-management base before hub PMs',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 49,
    source: 'ClickUp + meeting-note project-manager discussion',
    summary: 'Define the Foundation project-management substrate that every future hub PM uses: ClickUp read/write, task lifecycle rules, due-date normalization, stale-task detection, atom/candidate-to-task links, and approval boundaries.',
    whyItMatters: 'Each hub should eventually have its own project manager behavior, but those hub PMs should not each reinvent task state, ClickUp access, stale detection, or evidence links. Shared PM infrastructure prevents another swarm of disconnected managers.',
    nextAction: 'Write the base contract first: what Foundation owns, what ClickUp owns, what a hub PM overlay may decide, how meeting/email/Slack commitments update task state, and what must require human approval before writes. Then later define Marketing PM, Sales PM, Recruiting PM, Ops PM, and Retention PM overlays separately.',
    statusNote: 'This is not an acting agent yet. It is the shared task-management substrate future hub PMs will sit on.',
  },
  {
    id: 'FUB-AGENT-TOOLS-001',
    title: 'Backlog future agent-facing FUB tools without mixing them into leadership synthesis',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 49,
    source: 'Founder clarification on FUB client data versus leadership intelligence',
    summary: 'Keep FUB client notes, call transcripts, lead nurture, and transaction context queued for future agent-facing tools, but do not mix that client CRM data into the current leadership shared-comms synthesis unless a specific source-trust or KPI use case requires it.',
    whyItMatters: 'FUB has a lot of valuable data, but most of it is client/agent execution context, not ownership strategy context. Pulling it into the current synthesis layer too early would add noise and privacy risk. It belongs in a later agent-facing or sales hub phase.',
    nextAction: 'When the agent-facing engine phase begins, map FUB notes, calls, transactions, lead nurture, and client timeline reads into explicit use cases: agent assistant, sales manager view, nurture coaching, or future CRM replacement. Until then, keep current FUB work focused on KPI semantics and source-trust contracts.',
    statusNote: 'Queued intentionally after Steve clarified the scope. Current work should not ingest FUB notes just because the API exists.',
  },
  {
    id: 'REPORT-MINING-001',
    title: 'Mine old intelligence and scout reports into doctrine and synthesis patterns',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: 50,
    source: 'Old BCrew Buddy archive review',
    summary: 'Review the old intelligence outputs directly instead of only mining raw source adapters. The archived scout reports, executive briefs, director intel, platform notes, and marketing reports already contain synthesis patterns, durable marketing atoms, and useful doctrine that should inform the rebuild.',
    whyItMatters: 'The old system already knew how to produce useful outputs even when the architecture was messy. If we only port adapters and ignore the best old synthesis/report shapes, we risk relearning the same lessons slowly. This is especially important for marketing atoms, strategy-prep shapes, and the future synthesis engine.',
    nextAction: 'Inventory the highest-signal report families from the old archive, extract the durable doctrine and repeated output patterns, and separate “good synthesis shape” from “old noisy data.” Feed the doctrine into source notes/backlog cards and use the output shapes as reference when building the new synthesis layer and future Strategy/Marketing hubs.',
    statusNote: 'Not a blocker for the current foundation plumbing, but too valuable to leave as a vague memory. The old archive contains real signal and should be mined intentionally, not just remembered.',
  },
  {
    id: 'SOURCE-021',
    title: 'Recover Lee middleware logic for FUB lead semantics',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 46,
    source: 'FUB / KPI audit + founder operating clarification',
    summary: 'Recover or document the original Lee middleware / database logic that sits between raw FUB activity and KPI opportunity semantics so AI OS can explain lead date, lead claimed date, re-entry, and active-client counting without guessing.',
    whyItMatters: 'The current source walkthrough locked the business meaning, but some exact write rules still live upstream in Lee’s old middleware. Without that logic, future AI reads can still get edge cases wrong around true new opportunities, recycled pond leads, claim timing, and whether `Active Client` belongs in the counted opportunity path.',
    nextAction: 'Use the acquired `FUBZahnd` repo as the reference source, extract the actual SQL/stored-procedure rules for `LeadDate`, `LeadDeletedDate`, support/non-lead stages, re-entry record creation, and counted-opportunity semantics, then turn that into one governed source note and one explicit AI read contract for FUB / KPI work.',
    statusNote: 'Access is no longer the blocker. The repo includes the database schema and stored procedures, including `up_InsertPerson.sql`, stage tables, and GSheet retrieval procedures. This should be mined as doctrine, not integrated blind into the rebuild runtime.',
  },
  {
    id: 'SOURCE-012',
    title: 'Make source contracts and connectors visible as separate live layers',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Source-trust review + user confusion around connectors',
    summary: 'Build the next source layer so users can clearly see the difference between a source contract, a technical connector, and a signed-off trusted source instead of collapsing those ideas into one fuzzy label. Use it to collapse duplicate source-truth surfaces into one canonical visible status model.',
    whyItMatters: 'Repeated confusion around “is that a source contract or a connector?” is a signal that the model is not visible enough. The old system had useful data-source maps, but they became stale because they were doc-driven. The rebuild should keep the clarity, make it live, and stop showing overlapping truth surfaces that contradict each other.',
    nextAction: 'Define the first source view for the Data Sources area: source ID, business owner, system owner, source type, connector status, trust status, signed-off boundary, dependent views, and a direct link to the real source. Make it explicit that connector does not equal trust, and choose one canonical status model that aligns contracts, registry, notes, and UI.',
    statusNote: 'This should become the front door to the source layer, not a debugging-only page or another overlapping truth strip.',
  },
  {
    id: 'STRATEGY-005',
    title: 'Define the boundary between Foundation and Strategic Execution',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Foundation architecture review',
    summary: 'Define what stays in Foundation as durable direction and what moves into the next-layer planning module for annual priorities, quarterly sprints, monthly plans, and weekly execution.',
    whyItMatters: 'If Foundation keeps absorbing live strategy execution, it stops being a stable truth layer. If we separate it too early without clear rules, the system becomes confusing.',
    nextAction: 'Write the first boundary note: Foundation = durable vision, values, engine, brands, governance, and mandates. Strategic Execution = annual priorities, quarterly priorities, strategic issues, monthly plans, and weekly follow-through.',
    statusNote: 'This should settle where Quarterly Priorities and Strategic Issues live long term.',
  },
  {
    id: 'STRATEGY-006',
    title: 'Define the hub-overlay model on top of business atoms',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 20,
    source: 'Atoms architecture refinement',
    summary: 'Keep business atoms as shared Foundation evidence, then define how each hub adds its own intelligence lens without forcing every atom into one marketing-style schema.',
    whyItMatters: 'Marketing already has a strong avatar model, but Ops, Strategy, Sales, and Retention will likely need different overlays. If the system collapses those into one universal schema too early, the atom layer will get messy and every hub will fight the same design.',
    nextAction: 'Define the first overlay types on top of `business_atoms`: marketing audience/avatar targeting, strategy issue/decision/blocker framing, ops workflow/handoff/SOP framing, sales objection/stage/coaching framing, and retention engagement/risk framing. Keep overlays optional and additive, not required for base atom creation.',
    statusNote: 'Marketing avatars stay real and important, but they should sit on top of the shared atom model instead of becoming the atom model itself.',
  },
  {
    id: 'MANDATE-002',
    title: 'Separate durable mandates from quarterly execution asks',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Foundation vs execution boundary review',
    summary: 'Keep department mandates durable in Foundation and move quarter-specific asks, focus shifts, and sprint expectations into the execution layer.',
    whyItMatters: 'If mandates change every quarter, they are not mandates. The system needs a clean distinction between a department’s enduring job and the current period’s strategic ask.',
    nextAction: 'Define the rule set for mandates versus quarterly execution expectations before we finalize Department Mandates and the future Strategic Execution module.',
    statusNote: 'Useful before we decide whether departments live partly in Foundation and partly in the next-layer strategy workspace.',
  },
  {
    id: 'SYSTEM-003',
    title: 'Evaluate structured companion records around canonical strategy docs',
    team: 'dev',
    lane: 'parked',
    priority: 'P2',
    rank: 32,
    source: 'Foundation architecture review',
    summary: 'Keep docs and Git as the canonical durable strategy layer, but evaluate later whether structured companion records would help versioning, UI rendering, source linkage, and diff views without replacing docs as the source of durable truth.',
    whyItMatters: 'Current doctrine is clear: durable truth lives in docs/Git and volatile operating memory lives in PostgreSQL. If we ever add structured strategy records, they must support that model instead of creating a second conflicting truth system.',
    nextAction: 'Do not touch this until Foundation trust, verification, and source layers are stable. If reopened later, define a companion-record model that wraps canonical docs instead of replacing them.',
    statusNote: 'Parked. The current doctrine keeps durable strategy in docs and Git.',
  },
  {
    id: 'SYSTEM-009',
    title: 'Make backlog scopes and future hub queues data-driven instead of hardcoded',
    team: 'dev',
    lane: 'done',
    priority: 'P1',
    rank: 35,
    source: 'Codex audit + Foundation Operations architecture review',
    summary: 'The root backlog now uses a data-driven scope registry instead of fixed `dev` / `marketing` labels, so Foundation, Strategic Execution, Marketing, and future hubs can share one queue model without frontend surgery.',
    whyItMatters: 'The rebuild is explicitly modular. If backlog scope and queue ownership stay hardcoded to a tiny set of team labels, every new hub will require UI surgery and the root queue will keep behaving like a temporary hack instead of a real operating model.',
    nextAction: 'Keep the scope registry authoritative, let the API/UI read from it, and expand the active scopes only when a real root queue or hub is ready instead of hardcoding new labels ad hoc.',
    statusNote: 'Done. Canonical backlog scopes are now registry-driven, legacy `dev` items are backfilled to `foundation`, and the Foundation UI/API create, filter, and edit against scope metadata instead of fixed labels.',
  },
  {
    id: 'SYSTEM-010',
    title: 'Add visible process control, kill switches, and decommission workflow for running agents',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Ghost-agent lesson captured 2026-04-15',
    summary: 'Every running scheduler, agent process, automation worker, and orchestration runtime should be visible, stoppable, and cost-tracked from inside the system so ghost processes cannot quietly burn money or keep acting after the team thinks a system is shut down.',
    whyItMatters: 'The old system kept running silently after people thought it was effectively dead. That is a direct trust and cost failure. If the new system cannot show what is running, stop it, and decommission it cleanly, the same problem will come back under a newer name.',
    nextAction: 'Define the first process-control model: one runtime registry, visible process list, stop/pause controls, last activity, active task count, cost-to-date, dead-man switch behavior, and one explicit decommission workflow that stops processes, disables schedules, and records the shutdown.',
    statusNote: 'This is not a vanity ops dashboard. It is a core safety rule for any future live agents, schedulers, or autonomous loops.',
  },
  {
    id: 'MANDATE-003',
    title: 'Add a How We Know measurement layer to department mandates',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Department mandates research review',
    summary: 'Keep the Foundation mandate wording durable, but define the measurable proof layer that shows whether each department is actually executing its mandate in the live system.',
    whyItMatters: 'Without a measurement layer, mandates can stay accurate on paper while the real system fails underneath them.',
    nextAction: 'Define the first How We Know model: primary KPI proof, visibility rules, failure conditions, and where the measurement layer lives in Strategic Execution versus Foundation.',
    statusNote: 'The durable mandate should stay clean; the proof layer belongs in the next operational layer.',
  },
  {
    id: 'EXEC-001',
    title: 'Define a 48-hour blocker escalation rule',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Department mandates research review',
    summary: 'If a P0 or P1 item is blocked by one person for too long, the system should escalate visibly instead of letting the company freeze around that bottleneck.',
    whyItMatters: 'Leadership rescue and silent blockers are recurring failure modes. The system needs a clear escalation rule, not just goodwill.',
    nextAction: 'Define what counts as a blocker, which items qualify, the escalation timeline, who gets notified, and where the escalation shows up in Strategic Execution and meeting prep.',
    statusNote: 'This came directly out of the old-system intelligence and the current leadership-rescue issue.',
  },
  {
    id: 'EXEC-002',
    title: 'Define the BCrew backlog ownership and sprint-cadence model',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Scrum principle review + execution-system design',
    summary: 'Adapt the strongest Scrum principles into a BCrew operating model: one accountable backlog owner per backlog, a visible ordered queue, quarterly focus selected from that queue, weekly sprint-style execution cadence, and regular inspect/adapt loops that keep work moving without turning the company into ceremony theater.',
    whyItMatters: 'The system needs a real execution model, not just a list of tasks. The useful part of Scrum here is clear ownership, transparent backlog management, sprint cadence, inspection, and adaptation. Without that model, the backlog becomes a pile, priorities drift, and AI cannot manage the queue intelligently. The goal is not to cosplay software Scrum across the whole company; it is to translate the best execution principles into a model the business can actually run.',
    nextAction: 'Define the first BCrew execution model in plain terms: annual strategic goals, quarterly focus selection, monthly review/re-order cadence, weekly sprint execution, one accountable backlog owner per surface, how AI supports backlog refinement without owning final order, and how items move from candidate work into committed sprint work and then into done.',
    statusNote: 'Use official Scrum principles as the base and adapt them for business execution. Keep the parts that drive clarity, ownership, and adaptation. Drop ceremony that does not fit the company.',
  },
  {
    id: 'SALES-001',
    title: 'Protect the sales leadership lane from deal-production conflict',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Department mandates research review',
    summary: 'Clarify how much personal production can coexist with sales leadership before coaching cadence, standards, and accountability start to slip.',
    whyItMatters: 'The mandate is clear, but the lane can still fail if leadership work keeps getting crowded out by deals.',
    nextAction: 'Define the operating rule for protected sales leadership time, acceptable production overlap, and what evidence shows the lane is no longer protected.',
    statusNote: 'Useful before we lock the growth-side accountability model.',
  },
  {
    id: 'SALES-002',
    title: 'Turn deal-ledger profitability and negotiation fields into coaching signals',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Owners Dashboard deal-ledger walkthrough',
    summary: 'Use the Admin tab to produce real coaching signals around listing transaction-fee capture, LP/SP performance, commission-rate discipline, and signed-to-paid timing instead of leaving those insights trapped in spreadsheet columns.',
    whyItMatters: 'Steve explicitly called out that agents are giving up on transaction fees, that LP/SP should show whether sellers are getting more and buyers are paying less, and that commission-rate discipline matters. These are exactly the kinds of concrete production signals Sales Leadership should be able to coach against.',
    nextAction: 'Define the first coaching metrics from Columns V through AA plus the timing chain in F through I, then decide which ones belong in agent scorecards, manager coaching prompts, and profitability reporting.',
    statusNote: 'Build this on top of cleaned source data. Do not surface coaching metrics before the underlying attribution and integrity checks are good enough.',
  },
  {
    id: 'SALES-003',
    title: 'Turn KPI maintain-pace questions into a governed assistant query',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 36,
    source: 'Live KPI query walkthrough + founder request',
    summary: 'Productize the repeated sales-coaching question: who is on pace for maintain by cash executed, then signed clients, then apps set. The current answer path works, but it still requires live reverse-engineering across goals, profiles, deal_data, appointments, and pipeline timing.',
    whyItMatters: 'This is exactly the kind of management question Steve, Harlan, future sales assistants, and feedback scouts will ask repeatedly. If the logic stays manual, answers take minutes, can drift between assistants, and are too slow for live coaching or repeated leader review.',
    nextAction: 'Create one governed KPI pace read for AI OS: active roster filter, maintain target math, pipeline-adjusted pace windows, live actuals for cash executed / signed clients / consults set, and ranked output buckets. Expose it as a reusable query or endpoint so assistants can answer in seconds instead of rebuilding the logic ad hoc.',
    statusNote: 'Today the logic is understood and manually proven. Next step is to turn it into a signed-off reusable read for Sales Hub and assistant access.',
  },
  {
    id: 'RETAIN-001',
    title: 'Define weekly retention actions and testimonial ownership',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Department mandates research review',
    summary: 'Turn retention from a vague concept into a visible operating lane with weekly actions, early-risk signals, and a clear owner for testimonials and review capture.',
    whyItMatters: 'Retention is one of the least explicit parts of the current system, and testimonial ownership is falling through the cracks between teams.',
    nextAction: 'Define the weekly retention operating motions, risk signals, testimonial/review ownership, and which parts belong to Retention, Marketing, or Operations.',
    statusNote: 'This should sharpen the RETAIN lane without bloating the Foundation mandate itself.',
  },
  {
    id: 'OPS-001',
    title: 'Map cross-department handoffs in Strategic Execution',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Department mandates review',
    summary: 'Define the key handoff points between departments so the system can show where work, leads, risk, and accountability should pass cleanly from one function to another.',
    whyItMatters: 'Many strategic issues live at the handoff points, not inside one department. If the handoffs stay implicit, blame and drift stay fuzzy.',
    nextAction: 'Draft the first handoff map: Marketing -> Recruiting, Recruiting -> Operations, Sales -> Retention, and any other recurring cross-department transfer points that need clear ownership.',
    statusNote: 'This belongs in Strategic Execution and operating design, not in the durable mandates doc.',
  },
  {
    id: 'PEOPLE-004',
    title: 'Build an org capability and support-gap review layer',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Founder org-design reflection',
    summary: 'Use strategy, meeting history, accountability signals, and real operating output to identify where the organization needs clearer leadership support, better management structure, stronger role fit, or future hiring help.',
    whyItMatters: 'The system should help reveal where the company is structurally weak, where the founder is over-carrying, and where accountable leadership or people support is missing.',
    nextAction: 'Define the first org-capability review: role fit, management load, blocked departments, support gaps, and what should be solved by coaching, redesign, or hiring.',
    statusNote: 'This is not vibe-based HR. It should be grounded in role expectations, evidence, and real operating behavior.',
  },
  {
    id: 'OPS-002',
    title: 'Define team enablement and tool-investment strategy',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Department mandates review',
    summary: 'Define how tools, systems, subscriptions, and internal enablement assets support agent retention, operational leverage, and marketing/recruiting effectiveness without becoming a vague catch-all category.',
    whyItMatters: 'The company is already investing heavily in tools and leverage systems. If that investment stays conceptually fuzzy, ownership, ROI, and strategic fit will stay fuzzy too.',
    nextAction: 'Define the enablement model: which tool investments primarily support Retain, which support Attract, who owns the budget and outcomes, and how the system should measure time-back, leverage, and adoption.',
    statusNote: 'This should likely sit across Operations, Marketing, and Retention rather than becoming its own engine pillar.',
  },
  {
    id: 'PEOPLE-005',
    title: 'Define when shared departments should split as the company scales',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Department mandates review',
    summary: 'Set the future-state criteria for when cross-functional departments should become more specialized teams, such as Attract Marketing vs Retain Marketing or Onboarding vs ongoing Operations.',
    whyItMatters: 'The current structure works only as long as the overlaps are manageable. The system should know what growth conditions trigger a cleaner org split instead of waiting for confusion and overload.',
    nextAction: 'Define the split triggers: workload, pipeline volume, management load, quality drift, backlog pressure, and accountability failure thresholds that justify creating more specialized teams.',
    statusNote: 'Useful for scaling the company without prematurely adding headcount or structure.',
  },
  {
    id: 'ENGINE-002',
    title: 'Separate team membership from counted production roster in the Freedom rebuild',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: null,
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The current Agent Engine counts active roster from start and end dates, while business reality needs a separate production-roster rule. Team membership and counted production roster are not the same thing.',
    whyItMatters: 'Non-producing team members can still belong to the team without counting toward capacity math. If the rebuild keeps one blended status model, roster math and accountability logic will stay muddy.',
    nextAction: 'Define the canonical production-roster state separate from team membership, then rebuild active-headcount logic on that explicit state instead of the current end-date workaround.',
    statusNote: 'Discovered during Freedom Sheet calculator validation on 2026-04-18.',
    owner: 'Steve + System',
  },
  {
    id: 'DATA-021',
    title: 'Replace Freedom hidden Owners mirror with direct ledger dependency in Level 2 rebuild',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: null,
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The Freedom Sheet Agent Engine economics currently depend on a hidden IMPORTRANGE mirror of the Owners Admin ledger. The rebuild should read the canonical ledger directly instead of depending on a hidden spreadsheet copy.',
    whyItMatters: 'The hidden mirror obscures source-of-truth boundaries and duplicates critical economics logic. Leaving it in place would keep the new system dependent on spreadsheet plumbing instead of a clean source layer.',
    nextAction: 'In the Level 2 Freedom rebuild, wire gross-to-team, agent portion, and team portion directly from the canonical Owners ledger source and retire the hidden IMPORTRANGE dependency.',
    statusNote: 'Discovered during Freedom Sheet calculator validation on 2026-04-18.',
    owner: 'System',
  },
  {
    id: 'ENGINE-003',
    title: 'Align Freedom Agent Engine chart-feed windows and labels',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: null,
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The production chart-feed block in `AG:AK` is labeled as rolling 6-month but currently uses a 12-row window. Chart labels and formulas should match so secondary reporting does not drift from the validated engine logic.',
    whyItMatters: 'Even if the core calculator is correct, misleading chart windows create operator confusion and make it harder to trust the sheet during review and later rebuild work.',
    nextAction: 'Review each `AG:AK` chart-feed block, confirm the intended window for each one, and make the formulas and titles agree.',
    statusNote: 'Filed during Freedom deep checkpoint on 2026-04-18.',
    owner: 'System',
  },
  {
    id: 'ENGINE-004',
    title: 'Remove hardcoded split assumptions from Freedom annual-agent earnings helper metrics',
    team: 'dev',
    lane: 'research',
    priority: 'P2',
    rank: null,
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The annual-agent earnings helper block uses hardcoded `0.5` split assumptions for net-to-agent calculations. Those helper metrics should either read source-backed split assumptions or be clearly labeled as rough estimates.',
    whyItMatters: 'If the helper block is used for recruiting or compensation storytelling, hardcoded assumptions can drift away from the validated engine logic and create false confidence.',
    nextAction: 'Decide whether these helper metrics should use the BHAG split assumptions, actual trailing split logic, or stay as explicitly rough recruiting-only estimates.',
    statusNote: 'Filed during Freedom deep checkpoint on 2026-04-18.',
    owner: 'Steve + System',
  },
  {
    id: 'OPS-003',
    title: 'Repair the ops-improvement rollup and remove the dead NPS Scores & Reviews dependency',
    team: 'dev',
    lane: 'scoped',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet ops validation',
    summary: 'Fix the `Data Entry - Ops Cont Improvement` monthly rollup so transaction-management metrics read from the live deal / NPS / review source path instead of the removed `NPS Scores & Reviews` tab, then restore trustworthy monthly OSI inputs.',
    whyItMatters: 'The Ops Satisfaction dashboard cannot be trusted while the master ops rollup contains live `#REF!` errors and stale dependency assumptions.',
    nextAction: 'Replace the dead sheet reference, lock the month-row rules for the ops rollup, and rerun the `Ops Satisfaction` sanity check against the repaired source rows.',
    statusNote: 'This is source-layer repair work, not dashboard polish.',
    owner: null,
  },
  {
    id: 'OPS-004',
    title: 'Collapse duplicated ops bonus rules into one governed model and retire dead legacy paths',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Freedom Sheet ops validation',
    summary: 'The current ops bonus rules are split across feeder tabs, the `Bonus System` sheet, and a local agent-onboarding lookup, with legacy media logic still present. Map the real live incentives and consolidate them into one visible rule set.',
    whyItMatters: 'A fuzzy bonus model creates fake accountability. The company needs one trusted view of what behaviors earn bonuses and which old spreadsheet-era incentives are dead.',
    nextAction: 'Confirm which bonus programs are still live, retire the media bonus path if dead, and design one governed bonus model for onboarding, transaction management, reviews, NPS, and data-quality incentives.',
    statusNote: 'Do this after the source tabs are understood well enough to avoid encoding broken incentives.',
    owner: null,
  },
  {
    id: 'DATA-022',
    title: 'Add a richer Google Sheets reader for cell notes and comments',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Freedom Sheet validation',
    summary: 'The richer Google reader baseline now exists in repo code: sheet values/formulas are still the default path, but we can now explicitly read cell notes via Sheets grid metadata and spreadsheet comments via Drive. The remaining work is to use that richer path intentionally in the source validations and any UI or verification flows that depend on note/comment meaning.',
    whyItMatters: 'Important operating context already lives in notes/comments across Freedom and related sheets. If the system does not deliberately switch to the richer reader where needed, it will keep missing business meaning even though the raw capability now exists.',
    nextAction: 'Keep the new helpers as the baseline richer-reader path, then mark which source validations require them and wire them into the specific validation / verification flows that rely on notes or comments for meaning.',
    statusNote: 'Baseline capability exists now in `lib/google-delegated.js`. This card is no longer about proving feasibility; it is about using the richer reader in the right places.',
    owner: null,
  },
  {
    id: 'RETAIN-002',
    title: 'Turn Agent Satisfaction into a real retention and culture system',
    team: 'dev',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Freedom Agent Satisfaction validation + founder operating truth',
    summary: 'The current Agent Satisfaction sheet is a starting point, not the finished system. It should evolve from a basic survey dashboard into a real retention and culture layer that tracks survey signals, meeting engagement, and the producing agents that matter most.',
    whyItMatters: 'Georgia has changed the program over time, but the dashboard was not kept in sync. If the system cannot absorb those operating changes, the founder ends up carrying the logic again and the retention lane stays weak.',
    nextAction: 'Define the v2 Agent Satisfaction / Retention model: current survey cadence, which meetings count as engagement, which agents matter most, how to use survey folders and attendance signals, and what future telemetry should come from Slack, email, and other behavior to flag retention risk early.',
    statusNote: 'This should sharpen RETAIN work beyond generic testimonials. The immediate goal is to make the current sheet usable as-is, then expand it into a fuller retention system.',
    owner: 'steve',
  },
  {
    id: 'MKT-001',
    title: 'Hold major marketing execution until the foundation is locked',
    team: 'marketing',
    lane: 'parked',
    priority: 'P0',
    rank: 1,
    source: 'Leadership decision',
    summary: 'Do not restart the broader marketing machine until strategy, source contracts, and memory spine are trustworthy.',
    whyItMatters: 'The old system moved too fast and scattered attention before the foundation could hold.',
    nextAction: 'Resume after strategy lock and memory foundation checkpoint.',
    statusNote: 'Intentional pause, not abandonment.',
  },
  {
    id: 'MKT-002',
    title: 'Port the old marketing backlog into the new structured system',
    team: 'marketing',
    lane: 'research',
    priority: 'P1',
    rank: 2,
    source: 'Old system migration',
    summary: 'Review old marketing backlog cards, keep the strong work, and re-sequence it in the new system once the base is stable.',
    whyItMatters: 'There is real value in the old backlog, but it needs structure and truth underneath it.',
    nextAction: 'Pull the highest-value items only after the foundation checkpoint.',
    statusNote: 'Deferred until foundation work settles.',
  },
  {
    id: 'MKT-003',
    title: 'Define MarketMasters data sources and measurement model',
    team: 'marketing',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Strategy support',
    summary: 'Identify how MarketMasters performance will be measured and where those metrics will live.',
    whyItMatters: 'MarketMasters is a strategic vehicle and needs the same source-of-truth discipline as the team engine.',
    nextAction: 'Map current sheets, events, and outreach systems into source IDs.',
    statusNote: 'Scoped, waiting on foundation time.',
  },
]

const decisionsSeed = [
  {
    id: 'DEC-001',
    category: 'system',
    title: 'Canonical strategy stays in docs; volatile operating memory moves to the database',
    status: 'locked',
    summary: 'Business strategy and supporting strategy docs remain the human-readable source of truth. Daily-changing work such as backlog items, decisions, sessions, and parking-lot items belongs in the structured memory layer.',
    rationale: 'The old system already proved that markdown backlogs go stale. We want readable docs and durable operational memory, not one thing pretending to be both.',
    sourceRef: 'Old system backlog lessons + rebuild decisions',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Rebuild session decisions on 2026-04-11',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-002',
    category: 'strategy',
    title: 'North Star distinguishes the team goal from the downline goal',
    status: 'locked',
    summary: 'Benson Crew is building toward a $2B real estate team while growing the combined Benson Crew leadership downline at Real Broker toward 10,000 agents.',
    rationale: 'The $2B target is team production. The 10,000-agent target is the combined leadership downline at Real Broker, not Benson Crew headcount.',
    sourceRef: 'Business strategy lock pass',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Business strategy lock pass',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-003',
    category: 'system',
    title: 'Freedom Sheet sections are now treated as source contracts',
    status: 'locked',
    summary: 'A:E owns team/member data, G:O owns community/downline tracking, P:U owns community revenue, Agent Engine owns live operating assumptions, and BHAG Builder owns long-range targets.',
    rationale: 'The system must reference stable source IDs so the location can change later without breaking every consumer.',
    sourceRef: 'Freedom Sheet verification on 2026-04-12',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Freedom Sheet verification on 2026-04-12',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-004',
    category: 'system',
    title: 'Start with OpenClaw-native memory plus Postgres business memory',
    status: 'locked',
    summary: 'We are not building the full world-class memory layer from scratch first. We are starting with OpenClaw-native memory for agent recall and Postgres for business memory.',
    rationale: 'This gives us a strong baseline quickly, keeps data local, and leaves room to benchmark Honcho or Hindsight later if recall quality still falls short.',
    sourceRef: 'Memory architecture review',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Memory architecture review',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-005',
    category: 'system',
    title: 'Live values come from source contracts, not markdown snapshots',
    status: 'locked',
    summary: 'Strategy docs explain what the numbers mean and which source owns them. The system should render live values from source IDs so changes propagate across the full system.',
    rationale: 'Markdown is good for meaning and rules, but it is the wrong place to act as a live calculator. Source systems own mutable math.',
    sourceRef: 'Strategy lock pass on live source-of-truth rendering',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Strategy lock pass on live source-of-truth rendering',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-006',
    category: 'system',
    title: 'Source contracts must power source access in the UI',
    status: 'locked',
    summary: 'Every source-backed view should use structured source-contract metadata for source IDs, status, and open/edit access instead of hardcoded frontend links.',
    rationale: 'If source access lives in ad hoc UI code, users and agents lose trust quickly and the system drifts away from the real source of truth.',
    sourceRef: 'Foundation audit on 2026-04-13',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Foundation audit on 2026-04-13',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-007',
    category: 'system',
    title: 'The operating system should act as a live strategic operator, not just a passive recorder',
    status: 'locked',
    summary: 'The system should sit across leadership and department cadences, understand what teams are working on, compare activity against strategy and priorities, flag drift or low-value work, and help turn meeting decisions into structured follow-through in connected systems.',
    rationale: 'The point of the operating system is not just to store notes or summarize meetings. It should help keep the business on track in real time by connecting strategy, meetings, accountability, and execution.',
    sourceRef: 'Leadership meeting operator direction on 2026-04-14',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Leadership meeting operator direction on 2026-04-14',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact meeting/session link later if needed.',
  },
]

const parkingLotSeed = [
  {
    id: 'PARK-001',
    title: 'Benchmark Honcho, Hindsight, and MemClaw after the native baseline is live',
    summary: 'We still want a world-class memory system, but we are not blocking the rebuild on the perfect tool choice before the baseline is enabled.',
    owner: 'Dev',
  },
  {
    id: 'PARK-002',
    title: 'Plan how to internalize scattered spreadsheet logic over time',
    summary: 'Some sheet logic will stay external for now, but we want a path to pull fragile source-of-truth math into the system where it makes sense.',
    owner: 'Dev',
  },
]

const openQuestionsSeed = [
  {
    id: 'Q-001',
    title: 'What is the final definition of the live attrition metric in the Agent Engine?',
    summary: 'We improved the formula, but we still need to decide the official business definition we will carry into system logic and reporting.',
    owner: 'Strategy',
  },
  {
    id: 'Q-002',
    title: 'Which external sources should stay external versus be internalized over time?',
    summary: 'We want clear source-of-truth contracts now and a migration path later for sources that are too scattered or brittle.',
    owner: 'Strategy',
  },
  {
    id: 'Q-003',
    title: 'Where should partner commissions be normalized in the finance stack?',
    summary: 'We now know partner commissions are intentionally backed out of top-line revenue and owners expense in `Cashflow Dash`, but we still need the canonical rule for whether that normalization should live in Weekly Actuals, the roll-up layers, or stay only in the dashboard interpretation layer.',
    owner: 'Finance',
  },
  {
    id: 'Q-004',
    title: 'What is the final row grain and unresolved field-definition boundary of the Owners Dashboard Admin tab?',
    summary: 'Trade numbers can repeat when one deal is split across multiple agents, and paid-to-team cash can live on only one row while credits live on several rows. The remaining Admin-tab unknowns now roll up here: the canonical row definition, which legacy-era fields still matter enough to preserve in reporting, and whether malformed or anonymized patterns need explicit mapping rules instead of simple cleanup.',
    owner: 'Operations',
  },
  {
    id: 'Q-005',
    title: 'What are the remaining unresolved Admin-tab field definitions?',
    summary: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns now live under the broader row-grain and field-definition question instead of existing as a duplicate.',
    owner: 'Operations',
    status: 'resolved',
    resolvedAt: '2026-04-15T23:39:57.225Z',
    resolvedBy: 'codex',
    resolutionNote: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns are now tracked under the broader row-grain and field-definition question instead of living as a duplicate.',
  },
]

const memoryStatusSeed = [
  {
    componentKey: 'strategy-docs',
    label: 'Strategy Docs',
    status: 'live',
    detail: 'Canonical strategy and supporting docs live in the repo and are rendered in the dashboard.',
  },
  {
    componentKey: 'business-db',
    label: 'Business Memory DB',
    status: 'live',
    detail: 'PostgreSQL is running locally on the Mac mini and is now backing the first memory/backlog layer.',
  },
  {
    componentKey: 'openclaw-native-memory',
    label: 'OpenClaw Native Memory',
    status: 'pending',
    detail: 'The OpenClaw workspace is pointed at the repo, but native memory plugins still need to be configured and tested.',
  },
  {
    componentKey: 'shared-cross-tool-memory',
    label: 'Advanced Shared Memory',
    status: 'planned',
    detail: 'Honcho, Hindsight, and MemClaw stay on the evaluation path after the native baseline is working.',
  },
  {
    componentKey: 'source-health',
    label: 'Source Health Monitoring',
    status: 'planned',
    detail: 'Freedom Sheet adapters and schema-drift alerts are not wired yet. They are a near-term dev priority.',
  },
]

const BHAG_DOC_PATH = 'docs/strategy/bhag-model.md'
const AGENT_ENGINE_DOC_PATH = 'docs/strategy/agent-engine.md'
const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const TORONTO_TIMEZONE = 'America/Toronto'
const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

const docSourceSnapshotsSeed = [
  {
    id: 'DOCSNAP-001',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2026',
    value: '$310M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-002',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2027',
    value: '$341M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-003',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2028',
    value: '$392M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-004',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2029',
    value: '$471M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-005',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2030',
    value: '$588M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-006',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2031',
    value: '$751M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-007',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2032',
    value: '$960M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-008',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2033',
    value: '$1.23B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-009',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2034',
    value: '$1.57B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-010',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2035',
    value: '$2.0B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-011',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Actual',
    value: '$43.95M YTD',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-012',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Pace',
    value: 'Behind by $41.79M (-48.7%)',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-015',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2026',
    value: '700 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-016',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2027',
    value: '770 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-017',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2028',
    value: '886 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-018',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2029',
    value: '1,063 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-019',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2030',
    value: '1,329 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-020',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2031',
    value: '1,990 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-021',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2032',
    value: '2,980 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-022',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2033',
    value: '4,462 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-023',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2034',
    value: '6,681 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-024',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2035',
    value: '10,000 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-025',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Started 2026',
    value: '643 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-01-01',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-032',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Actual',
    value: '675 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-033',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Pace',
    value: 'Behind by 25 agents (-3.6%)',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 13,
  },
]

function getTorontoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = Number(part.value)
    }
    return acc
  }, {})
}

function getTodayTorontoIso() {
  const parts = getTorontoDateParts()
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getDayOfYearToronto() {
  const parts = getTorontoDateParts()
  const start = Date.UTC(parts.year, 0, 1)
  const current = Date.UTC(parts.year, parts.month - 1, parts.day)
  return Math.floor((current - start) / 86400000) + 1
}

function daysInTorontoYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[$,%\s,]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sheetSerialToDate(serial) {
  const numeric = parseNumber(serial)
  if (!Number.isFinite(numeric)) return null
  return new Date(Math.round((numeric - 25569) * 86400 * 1000))
}

function formatCompactCurrency(value) {
  const numeric = parseNumber(value) || 0
  const abs = Math.abs(numeric)

  if (abs >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `$${(numeric / 1_000).toFixed(0)}K`
  return `$${Math.round(numeric)}`
}

function formatAgentCount(value) {
  const numeric = Math.round(parseNumber(value) || 0)
  return `${numeric.toLocaleString('en-CA')} agents`
}

function formatAgentCountPrecise(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} agents`
}

function formatAgentCountCeil(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.ceil(numeric).toLocaleString('en-CA')} agents`
}

function formatMonthlyAgentRate(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} / mo`
}

function formatPercent(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(numeric * 100)}%`
}

function formatCurrencyDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return formatCompactCurrency(Math.abs(numeric))
}

function formatAgentDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(Math.abs(numeric)).toLocaleString('en-CA')} agents`
}

function formatPointDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const points = Math.abs(numeric * 100)
  const rounded = Math.round(points * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} pts`
}

function formatPaceLabel(diff, unitFormatter) {
  const abs = Math.abs(diff)
  const direction = diff >= 0 ? 'Ahead' : 'Behind'
  return `${direction} by ${unitFormatter(abs)}`
}

function formatPaceWithPercent(diff, baseline, unitFormatter) {
  const pct = baseline ? Math.abs(diff) / baseline : 0
  const sign = diff >= 0 ? '+' : '-'
  return `${formatPaceLabel(diff, unitFormatter)} (${sign}${(pct * 100).toFixed(1)}%)`
}

function monthYearToIso(monthName, year) {
  const monthKey = String(monthName || '').trim().toLowerCase()
  const monthIndex = MONTH_INDEX[monthKey]
  const numericYear = parseNumber(year)
  if (monthIndex == null || !numericYear) return getTodayTorontoIso()
  return `${numericYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

function buildBhagYearRows(groupTitle, rows, sourceId, detail, valueFormatter, startYear = 2026) {
  return rows.flatMap((row, index) => {
    const yearLabel = String(startYear + index)
    return [
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: yearLabel,
        value: valueFormatter(row[0]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: `Growth ${yearLabel}`,
        value: formatPercent(row[1]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    ]
  })
}

function buildEngineMetricRow(groupTitle, label, value, detail, sortOrder, sourceId = 'SRC-FREEDOM-ENGINE-001') {
  return {
    docPath: AGENT_ENGINE_DOC_PATH,
    sourceId,
    groupTitle,
    label,
    value,
    detail,
    asOf: getTodayTorontoIso(),
    sortOrder,
  }
}

async function getLiveAgentEngineSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [bhagCalcRes, bhagTargetsRes, engineRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!A22:B31"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Agent Engine'!A1:K10"),
  ])

  const calcRows = bhagCalcRes.values || []
  const calcMap = {}
  calcRows.forEach(row => {
    const key = String(row?.[0] || '').trim()
    if (!key || row?.[1] == null) return
    calcMap[key] = row[1]
  })

  function getCalcMetric(...keys) {
    for (const key of keys) {
      const numeric = parseNumber(calcMap[key])
      if (Number.isFinite(numeric)) return numeric
    }
    return null
  }

  const annualVolumeAverage = getCalcMetric('Annual Volume Average', 'Agent Annual Volume Average')
  const teamSplit = getCalcMetric('Split to Team')
  const monthlyGciAverage = getCalcMetric('Average Monthly GCI', 'Agent Average Monthly GCI')
  const planningAttritionAssumption = getCalcMetric('Planning Attrition Assumption')

  const targetRows = (bhagTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const values = engineRes.values || []
  const requiredRecruitingPace = parseNumber(values[2]?.[1])
  const recruitingSixMonth = parseNumber(values[3]?.[1])
  const attritionRate = parseNumber(values[4]?.[1])
  const avgAdditions = parseNumber(values[5]?.[1])
  const avgAttrition = parseNumber(values[6]?.[1])

  const activeAgents = parseNumber(values[2]?.[4])

  const avgProduction = parseNumber(values[2]?.[7])
  const productionTarget = Number.isFinite(monthlyGciAverage)
    ? monthlyGciAverage
    : parseNumber(values[3]?.[7])

  const actualSplit = parseNumber(values[2]?.[10])
  const targetSplit = parseNumber(values[3]?.[10])

  const currentYearIndex = Math.max(0, Math.min(currentYear - yearStart, targetRows.length - 1))
  const currentYearVolumeTarget = targetRows[currentYearIndex]?.[0]
  const requiredAgentsThisYear = Number.isFinite(currentYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? currentYearVolumeTarget / annualVolumeAverage
    : null
  const requiredAgentsThisYearDisplay = Number.isFinite(requiredAgentsThisYear)
    ? Math.ceil(requiredAgentsThisYear)
    : null

  const nextYear = Math.min(currentYear + 1, yearStart + targetRows.length - 1)
  const nextYearIndex = Math.max(0, nextYear - yearStart)
  const nextYearVolumeTarget = targetRows[nextYearIndex]?.[0]
  const requiredStartAgents = Number.isFinite(nextYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? nextYearVolumeTarget / annualVolumeAverage
    : parseNumber(values[3]?.[4])
  const requiredStartAgentsDisplay = Number.isFinite(requiredStartAgents)
    ? Math.ceil(requiredStartAgents)
    : null

  const recruitingGap = Number.isFinite(requiredRecruitingPace) && Number.isFinite(recruitingSixMonth)
    ? recruitingSixMonth - requiredRecruitingPace
    : null
  const capacityGap = Number.isFinite(activeAgents) && Number.isFinite(requiredStartAgentsDisplay)
    ? activeAgents - requiredStartAgentsDisplay
    : parseNumber(values[4]?.[4])
  const currentYearGap = Number.isFinite(activeAgents) && Number.isFinite(requiredAgentsThisYearDisplay)
    ? activeAgents - requiredAgentsThisYearDisplay
    : null
  const splitGap = Number.isFinite(actualSplit) && Number.isFinite(targetSplit)
    ? actualSplit - targetSplit
    : parseNumber(values[4]?.[10])
  const productionGap = Number.isFinite(avgProduction) && Number.isFinite(productionTarget)
    ? avgProduction - productionTarget
    : null

  const inputsDetail = 'Live productivity and unit-economics assumptions from the Benson Crew BHAG Builder.'
  const pathDetail = 'Required agent counts at the current annual volume average per agent.'
  const requirementBhagDetail = 'What the model needs next, using the BHAG builder and current productivity assumption.'
  const requirementEngineDetail = 'Current recruiting and capacity read from the Freedom KPI Sheet Agent Engine tab.'

  const snapshot = [
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Average Monthly GCI',
      value: `${formatCompactCurrency(monthlyGciAverage)} / mo`,
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Split to Team',
      value: formatPercent(teamSplit),
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
  ]

  targetRows.forEach((row, index) => {
    const yearLabel = String(yearStart + index)
    const requiredAgents = Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
      ? row[0] / annualVolumeAverage
      : null

    snapshot.push(
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: yearLabel,
        value: formatCompactCurrency(row[0]),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: `Required Agents ${yearLabel}`,
        value: formatAgentCountCeil(requiredAgents),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    )
  })

  snapshot.push(
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Current-Year Volume Target',
      value: formatCompactCurrency(currentYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Agents This Year',
      value: formatAgentCountCeil(requiredAgentsThisYearDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Next-Year Volume Target',
      value: formatCompactCurrency(nextYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 3,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Start-of-Year Agents',
      value: formatAgentCountCeil(requiredStartAgentsDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 4,
    },
    buildEngineMetricRow('Current Requirement', 'Current Active Agents', formatAgentCountPrecise(activeAgents), requirementEngineDetail, 5),
    buildEngineMetricRow('Current Requirement', 'Gap This Year', formatPaceWithPercent(currentYearGap, requiredAgentsThisYearDisplay, formatAgentDelta), requirementEngineDetail, 6),
    buildEngineMetricRow('Current Requirement', 'Gap to Next Year', formatPaceWithPercent(capacityGap, requiredStartAgentsDisplay, formatAgentDelta), requirementEngineDetail, 7),
    buildEngineMetricRow('Current Requirement', 'Required Recruiting Pace', formatMonthlyAgentRate(requiredRecruitingPace), requirementEngineDetail, 8),
    buildEngineMetricRow('Current Requirement', 'Current Recruiting Pace', formatMonthlyAgentRate(recruitingSixMonth), requirementEngineDetail, 9),
    buildEngineMetricRow('Current Requirement', 'Current Avg Production / Agent', `${formatCompactCurrency(avgProduction)} / mo`, requirementEngineDetail, 10),
    buildEngineMetricRow('Current Requirement', 'Production Target / Agent', `${formatCompactCurrency(productionTarget)} / mo`, requirementBhagDetail, 11, 'SRC-FREEDOM-BHAG-001'),
    buildEngineMetricRow('Current Requirement', 'Production Gap', formatPaceWithPercent(productionGap, productionTarget, formatCurrencyDelta), requirementEngineDetail, 12),
    buildEngineMetricRow(
      'Current Requirement',
      'Planning Attrition Assumption',
      formatPercent(planningAttritionAssumption),
      'The planning attrition rate now comes from the BHAG builder assumptions and feeds the required recruiting formula.',
      13,
      'SRC-FREEDOM-BHAG-001'
    ),
    buildEngineMetricRow('Current Requirement', 'Live Attrition Pressure', formatPercent(attritionRate), requirementEngineDetail, 14),
    buildEngineMetricRow('Current Requirement', 'Avg Additions / Month', formatMonthlyAgentRate(avgAdditions), requirementEngineDetail, 15),
    buildEngineMetricRow('Current Requirement', 'Avg Attrition / Month', formatMonthlyAgentRate(avgAttrition), requirementEngineDetail, 16),
    buildEngineMetricRow('Current Requirement', 'Actual Split', formatPercent(actualSplit), requirementEngineDetail, 17),
    buildEngineMetricRow('Current Requirement', 'Target Split', formatPercent(targetSplit), requirementEngineDetail, 18),
    buildEngineMetricRow('Current Requirement', 'Split Gap', `${splitGap >= 0 ? 'Above target' : 'Below target'} by ${formatPointDelta(splitGap)}`, requirementEngineDetail, 19),
  )

  return snapshot
}

async function getLiveBhagSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [teamTargetsRes, communityTargetsRes, communityTrackerRes, ownersRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K20:L29"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Data Entry - BCrew Team/Community'!G1:O80"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'ADMIN ONLY - Deal Data Entry'!G:AI"),
  ])

  const teamTargetRows = (teamTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))
  const communityTargetRows = (communityTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const snapshot = []
  snapshot.push(
    ...buildBhagYearRows(
      'Team Goal: $2B',
      teamTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 team target path from the Benson Crew BHAG Builder.',
      formatCompactCurrency,
      yearStart,
    ),
  )

  const teamCurrentTarget = teamTargetRows[currentYear - yearStart]?.[0] || teamTargetRows[0]?.[0] || 0
  const ownersRows = ownersRes.values || []
  const ownersHeader = ownersRows[0] || []
  const volumeIdx = ownersHeader.findIndex(value => String(value).trim() === 'Volume Credit')
  let actualVolumeYtd = 0

  ownersRows.slice(1).forEach(row => {
    const executedDate = sheetSerialToDate(row[0])
    const volumeCredit = parseNumber(row[volumeIdx])
    if (!executedDate || !Number.isFinite(volumeCredit)) return
    if (executedDate.getUTCFullYear() !== currentYear) return
    actualVolumeYtd += volumeCredit
  })

  const targetToDate = teamCurrentTarget * (getDayOfYearToronto() / daysInTorontoYear(currentYear))
  const teamDiff = actualVolumeYtd - targetToDate
  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Should Be',
      value: formatCompactCurrency(targetToDate),
      detail: 'Prorated team target-to-date for the current year, based on Eastern time.',
      asOf: getTodayTorontoIso(),
      sortOrder: 11,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Actual',
      value: `${formatCompactCurrency(actualVolumeYtd)} YTD`,
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Pace',
      value: formatPaceWithPercent(teamDiff, targetToDate, formatCompactCurrency),
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 13,
    },
  )

  snapshot.push(
    ...buildBhagYearRows(
      'Community Goal: 10,000 Agents',
      communityTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 community target path from the Benson Crew BHAG Builder.',
      formatAgentCount,
      yearStart,
    ),
  )

  const communityRows = (communityTrackerRes.values || []).slice(2).map(row => ({
    month: row[0],
    year: parseNumber(row[1]),
    totalCommunity: parseNumber(row[3]),
  }))
  const currentYearCommunityRows = communityRows.filter(row => row.year === currentYear && Number.isFinite(row.totalCommunity) && row.totalCommunity > 0)
  const startedRow = currentYearCommunityRows[0] || null
  const latestRow = currentYearCommunityRows[currentYearCommunityRows.length - 1] || null
  const communityCurrentTarget = communityTargetRows[currentYear - yearStart]?.[0] || communityTargetRows[0]?.[0] || 0
  const communityStarted = startedRow?.totalCommunity || 0
  const actualCommunity = latestRow?.totalCommunity || 0
  const communityTargetToDate = communityStarted + ((communityCurrentTarget - communityStarted) * (getDayOfYearToronto() / daysInTorontoYear(currentYear)))
  const communityDiff = actualCommunity - communityTargetToDate

  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Should Be',
      value: formatAgentCount(communityTargetToDate),
      detail: 'Prorated community target-to-date for the current year, based on Eastern time.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Actual',
      value: formatAgentCount(actualCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 13,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Pace',
      value: formatPaceWithPercent(communityDiff, communityTargetToDate, formatAgentCount),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 14,
    },
  )

  return snapshot
}

async function seedTable(client, tableName, rows, insertSql, valuesBuilder) {
  for (const row of rows) {
    const values = valuesBuilder(row)
    await client.query(insertSql, values)
  }
}

function getBacklogIdPrefixes() {
  return Array.from(new Set(backlogSeed.map(item => String(item.id || '').split('-')[0]).filter(Boolean))).sort()
}

function getBacklogScopes() {
  return backlogScopeDefinitions.map(scope => ({ ...scope }))
}

function normalizeBacklogScopeKey(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  return legacyBacklogScopeMap[normalized] || normalized
}

function mapBacklogRow(row) {
  const scope = normalizeBacklogScopeKey(row.scope ?? row.team)
  return {
    id: row.id,
    title: row.title,
    scope,
    team: scope,
    lane: row.lane,
    priority: row.priority,
    rank: row.rank,
    source: row.source,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? row.whyItMatters,
    nextAction: row.next_action ?? row.nextAction,
    statusNote: row.status_note ?? row.statusNote,
    owner: row.owner,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapFoundationUserRow(row) {
  return {
    email: row.email,
    name: row.name,
    tier: row.tier === null || row.tier === undefined ? null : Number(row.tier),
    userType: row.user_type ?? row.userType,
    active: Boolean(row.active),
    meetingSyncEnabled: Boolean(row.meeting_sync_enabled ?? row.meetingSyncEnabled),
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapDecisionRow(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    status: row.status,
    summary: row.summary,
    rationale: row.rationale,
    sourceRef: row.source_ref ?? row.sourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    confirmedBy: row.confirmed_by ?? row.confirmedBy,
    participantNames: row.participant_names ?? row.participantNames ?? [],
    contextRef: row.context_ref ?? row.contextRef,
    evidenceNotes: row.evidence_notes ?? row.evidenceNotes,
    classifiedAt: row.classified_at ?? row.classifiedAt,
    classifiedBy: row.classified_by ?? row.classifiedBy,
    supersedesIds: row.supersedes_ids ?? row.supersedesIds ?? [],
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapOpenQuestionRow(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    owner: row.owner,
    status: row.status || 'open',
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    resolvedBy: row.resolved_by ?? row.resolvedBy,
    resolutionNote: row.resolution_note ?? row.resolutionNote,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapPendingDocUpdateRow(row) {
  return {
    id: row.id,
    decisionId: row.decision_id ?? row.decisionId,
    decisionTitle: row.decision_title ?? row.decisionTitle,
    decisionCategory: row.decision_category ?? row.decisionCategory,
    decisionStatus: row.decision_status ?? row.decisionStatus,
    decisionSourceRef: row.decision_source_ref ?? row.decisionSourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    decisionConfirmedBy: row.decision_confirmed_by ?? row.decisionConfirmedBy,
    decisionParticipantNames: row.decision_participant_names ?? row.decisionParticipantNames ?? [],
    decisionContextRef: row.decision_context_ref ?? row.decisionContextRef,
    decisionEvidenceNotes: row.decision_evidence_notes ?? row.decisionEvidenceNotes,
    decisionRationale: row.decision_rationale ?? row.decisionRationale,
    targetDocPath: row.target_doc_path ?? row.targetDocPath,
    targetSection: row.target_section ?? row.targetSection,
    summary: row.summary,
    currentText: row.current_text ?? row.currentText,
    proposedText: row.proposed_text ?? row.proposedText,
    proposedDiff: row.proposed_diff ?? row.proposedDiff,
    status: row.status,
    proposedAt: row.proposed_at ?? row.proposedAt,
    proposedBy: row.proposed_by ?? row.proposedBy,
    reviewedAt: row.reviewed_at ?? row.reviewedAt,
    reviewedBy: row.reviewed_by ?? row.reviewedBy,
    appliedAt: row.applied_at ?? row.appliedAt,
    appliedCommit: row.applied_commit ?? row.appliedCommit,
    expiresAt: row.expires_at ?? row.expiresAt,
    metadata: row.metadata || {},
  }
}

function getDecisionTextTokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(function(token) {
      return token.length >= 4 && [
        'that', 'this', 'with', 'from', 'into', 'then', 'than', 'they', 'them',
        'have', 'will', 'when', 'where', 'what', 'which', 'should', 'stays',
        'stay', 'only', 'just', 'real', 'live', 'work', 'works', 'using', 'used',
        'system', 'strategy', 'decision', 'decisions', 'docs', 'doc', 'current',
      ].indexOf(token) === -1
    })
}

function getDecisionKeywordSet(item) {
  const tokens = getDecisionTextTokens((item && item.title) || '').concat(
    getDecisionTextTokens((item && item.summary) || '')
  )
  return Array.from(new Set(tokens))
}

function hasDecisionRelationshipLink(left, right) {
  const leftIds = (left && left.supersedesIds) || []
  const rightIds = (right && right.supersedesIds) || []
  return leftIds.indexOf(right.id) !== -1 || rightIds.indexOf(left.id) !== -1
}

function getDecisionReviewPriority(type) {
  if (type === 'needs_lock') return 0
  if (type === 'missing_source_ref') return 1
  if (type === 'missing_provenance') return 2
  if (type === 'broken_supersedes_link') return 3
  if (type === 'orphan_doc_update') return 4
  if (type === 'possible_relationship') return 5
  return 9
}

function buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges) {
  const decisionList = Array.isArray(decisions) ? decisions : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const changes = Array.isArray(recentChanges) ? recentChanges : []

  const byDecision = {}
  const linkedDecisionIds = new Set()

  decisionList.forEach(function(decision) {
    const linkedUpdates = updates.filter(function(update) {
      return update.decisionId === decision.id
    })
    if (linkedUpdates.length) linkedDecisionIds.add(decision.id)

    const linkedUpdateIds = new Set(linkedUpdates.map(function(update) { return update.id }))
    const decisionEvents = changes.filter(function(change) {
      return change.entityTable === 'decisions' && change.entityId === decision.id
    })
    const docEvents = changes.filter(function(change) {
      if (String(change.eventType || '').indexOf('doc_update_') !== 0) return false
      if (linkedUpdateIds.has(change.entityId)) return true
      return change.metadata && change.metadata.decisionId === decision.id
    })

    const affectedDocs = Array.from(new Set(linkedUpdates.map(function(update) {
      return update.targetDocPath
    }).filter(Boolean))).sort(function(a, b) {
      return a.localeCompare(b)
    })

    const openDocUpdates = linkedUpdates.filter(function(update) {
      return update.status === 'pending' || update.status === 'approved' || update.status === 'failed'
    })
    const appliedDocUpdates = linkedUpdates.filter(function(update) {
      return update.status === 'applied'
    })

    const latestDocTouch = linkedUpdates.slice().sort(function(a, b) {
      return new Date(b.appliedAt || b.reviewedAt || b.proposedAt || 0).getTime() - new Date(a.appliedAt || a.reviewedAt || a.proposedAt || 0).getTime()
    })[0] || null

    const latestDecisionEvent = decisionEvents.slice().sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })[0] || null

    const latestDocEvent = docEvents.slice().sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })[0] || null

    byDecision[decision.id] = {
      decisionId: decision.id,
      linkedDocUpdateCount: linkedUpdates.length,
      openDocUpdateCount: openDocUpdates.length,
      appliedDocUpdateCount: appliedDocUpdates.length,
      affectedDocs,
      latestDecisionEventAt: latestDecisionEvent ? latestDecisionEvent.createdAt : null,
      latestDocEventAt: latestDocEvent ? latestDocEvent.createdAt : null,
      latestApprovalBy: latestDocTouch ? (latestDocTouch.reviewedBy || latestDocTouch.proposedBy || null) : null,
      latestAppliedCommit: latestDocTouch ? (latestDocTouch.appliedCommit || null) : null,
      traceStatus: linkedUpdates.length ? 'linked' : 'unlinked',
    }
  })

  const docs = {}
  updates.forEach(function(update) {
    const key = String(update.targetDocPath || '').trim()
    if (!key) return
    if (!docs[key]) {
      docs[key] = {
        targetDocPath: key,
        linkedDecisionIds: [],
        pendingDocUpdateCount: 0,
        appliedDocUpdateCount: 0,
        latestDocEventAt: null,
      }
    }
    if (update.decisionId && docs[key].linkedDecisionIds.indexOf(update.decisionId) === -1) {
      docs[key].linkedDecisionIds.push(update.decisionId)
    }
    if (update.status === 'applied') docs[key].appliedDocUpdateCount += 1
    if (update.status === 'pending' || update.status === 'approved' || update.status === 'failed') docs[key].pendingDocUpdateCount += 1
  })

  changes.forEach(function(change) {
    if (String(change.eventType || '').indexOf('doc_update_') !== 0) return
    const targetDocPath = change.metadata && change.metadata.targetDocPath
    if (!targetDocPath || !docs[targetDocPath]) return
    const current = docs[targetDocPath].latestDocEventAt
    if (!current || new Date(change.createdAt).getTime() > new Date(current).getTime()) {
      docs[targetDocPath].latestDocEventAt = change.createdAt
    }
  })

  return {
    summary: {
      totalDecisions: decisionList.length,
      linkedDecisions: linkedDecisionIds.size,
      unlinkedDecisions: decisionList.length - linkedDecisionIds.size,
      totalDocUpdates: updates.length,
      linkedDocUpdates: updates.filter(function(update) { return Boolean(update.decisionId) }).length,
      orphanDocUpdates: updates.filter(function(update) { return !update.decisionId }).length,
      affectedDocs: Object.keys(docs).length,
    },
    byDecision,
    byDocPath: docs,
  }
}

function buildDecisionReviewSnapshot(decisions, pendingDocUpdates) {
  const decisionList = Array.isArray(decisions)
    ? decisions.slice().sort(function(a, b) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
    : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const byId = {}
  decisionList.forEach(function(item) {
    byId[item.id] = item
  })

  const reviewItems = []

  decisionList.forEach(function(item) {
    if (item.status === 'proposed') {
      reviewItems.push({
        key: 'proposed-' + item.id,
        tone: 'pending',
        type: 'needs_lock',
        title: item.id + ' still needs lock / cleanup',
        meta: item.category + ' decision',
        detail: 'This decision is still proposed. It needs either a lock, a merge, or a rejection path.',
        relatedDecisionIds: [item.id],
        nextStep: 'Review whether this should lock, merge into an existing decision, or be rejected.',
      })
    }

    if (!item.sourceRef) {
      reviewItems.push({
        key: 'source-ref-' + item.id,
        tone: 'pending',
        type: 'missing_source_ref',
        title: item.id + ' is missing source evidence',
        meta: item.status + ' · ' + item.category,
        detail: 'This decision does not have a source reference yet. That weakens provenance and later review.',
        relatedDecisionIds: [item.id],
        nextStep: 'Add the exact meeting, audit, chat, or source reference that justified this decision.',
      })
    }

    if (item.status === 'locked') {
      const missingParts = []
      if (!item.decisionOwner) missingParts.push('decision owner')
      if (!item.confirmedBy) missingParts.push('confirmed by')
      if (!item.participantNames || !item.participantNames.length) missingParts.push('participants')
      if (!item.contextRef) missingParts.push('context ref')

      if (missingParts.length) {
        reviewItems.push({
          key: 'provenance-' + item.id,
          tone: 'pending',
          type: 'missing_provenance',
          title: item.id + ' has incomplete decision provenance',
          meta: item.category + ' · locked',
          detail: 'Missing: ' + missingParts.join(', ') + '.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fill in the owner, confirmer, participants, and context so this lock has durable provenance.',
        })
      }
    }

    ;(item.supersedesIds || []).forEach(function(targetId) {
      if (!byId[targetId]) {
        reviewItems.push({
          key: 'broken-link-' + item.id + '-' + targetId,
          tone: 'missing',
          type: 'broken_supersedes_link',
          title: item.id + ' points at a missing superseded decision',
          meta: item.status + ' · ' + item.category,
          detail: 'Supersedes target ' + targetId + ' is not present in the live decision log.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fix the supersedes link or remove it if the old decision was referenced by mistake.',
        })
      }
    })
  })

  updates.forEach(function(item) {
    if (item.status === 'pending' && !item.decisionId) {
      reviewItems.push({
        key: 'orphan-doc-' + item.id,
        tone: 'pending',
        type: 'orphan_doc_update',
        title: item.id + ' has no linked decision',
        meta: 'Pending doc proposal',
        detail: 'This doc update proposal is reviewable, but it is not linked back to a decision yet.',
        relatedDecisionIds: [],
        nextStep: 'Link this proposal to the decision that actually justified the doc change.',
      })
    }
  })

  const activeDecisions = decisionList.filter(function(item) {
    return item.status !== 'superseded'
  })

  for (let index = 0; index < activeDecisions.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < activeDecisions.length; compareIndex += 1) {
      const left = activeDecisions[index]
      const right = activeDecisions[compareIndex]
      if (left.category !== right.category) continue
      if (hasDecisionRelationshipLink(left, right)) continue

      const leftTokens = getDecisionKeywordSet(left)
      const rightTokens = getDecisionKeywordSet(right)
      const shared = leftTokens.filter(function(token) {
        return rightTokens.indexOf(token) !== -1
      })

      if (shared.length >= 3) {
        reviewItems.push({
          key: 'overlap-' + left.id + '-' + right.id,
          tone: 'planned',
          type: 'possible_relationship',
          title: left.id + ' and ' + right.id + ' may need an explicit relationship',
          meta: left.category + ' decisions',
          detail: 'Shared terms: ' + shared.slice(0, 5).join(', ') + '. These do not look broken, but they may need an explicit clarify / related / supersedes relationship so the log reads cleanly.',
          relatedDecisionIds: [left.id, right.id],
          nextStep: 'Review whether they should stay separate, get a relationship note, or eventually be linked through clarification or supersession.',
        })
      }
    }
  }

  reviewItems.sort(function(a, b) {
    const priorityDiff = getDecisionReviewPriority(a.type) - getDecisionReviewPriority(b.type)
    if (priorityDiff) return priorityDiff
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  const counts = {
    needsLock: reviewItems.filter(function(item) { return item.type === 'needs_lock' }).length,
    missingSourceRef: reviewItems.filter(function(item) { return item.type === 'missing_source_ref' }).length,
    missingProvenance: reviewItems.filter(function(item) { return item.type === 'missing_provenance' }).length,
    brokenSupersedesLink: reviewItems.filter(function(item) { return item.type === 'broken_supersedes_link' }).length,
    orphanDocUpdate: reviewItems.filter(function(item) { return item.type === 'orphan_doc_update' }).length,
    possibleRelationship: reviewItems.filter(function(item) { return item.type === 'possible_relationship' }).length,
  }

  return {
    total: reviewItems.length,
    status: reviewItems.length ? 'pending' : 'connected',
    counts,
    items: reviewItems,
  }
}

function mapChangeEventRow(row) {
  return {
    id: row.id,
    eventType: row.event_type ?? row.eventType,
    entityTable: row.entity_table ?? row.entityTable,
    entityId: row.entity_id ?? row.entityId,
    actor: row.actor,
    summary: row.summary,
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapSharedCommunicationArtifactRow(row, { includeSensitive = false } = {}) {
  const contentText = row.content_text ?? row.contentText ?? ''
  const mapped = {
    artifactId: row.artifact_id ?? row.artifactId,
    sourceId: row.source_id ?? row.sourceId,
    artifactType: row.artifact_type ?? row.artifactType,
    externalId: row.external_id ?? row.externalId,
    contentHash: row.content_hash ?? row.contentHash ?? '',
    contentLength: contentText.length,
    artifactCreatedAt: row.artifact_created_at ?? row.artifactCreatedAt ?? null,
    artifactUpdatedAt: row.artifact_updated_at ?? row.artifactUpdatedAt ?? null,
    metadata: row.metadata || {},
    ingestedBy: row.ingested_by ?? row.ingestedBy ?? null,
    ingestedAt: row.ingested_at ?? row.ingestedAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }

  if (includeSensitive) {
    mapped.title = row.title || ''
    mapped.sourceAccount = row.source_account ?? row.sourceAccount ?? ''
    mapped.sourceContainer = row.source_container ?? row.sourceContainer ?? ''
    mapped.sourceUrl = row.source_url ?? row.sourceUrl ?? ''
    mapped.participants = Array.isArray(row.participants) ? row.participants : []
    mapped.excerpt = contentText ? contentText.slice(0, 280) : ''
  }

  return mapped
}

function mapSharedCommunicationCandidateRow(row) {
  return {
    candidateKey: row.candidate_key ?? row.candidateKey,
    artifactId: row.artifact_id ?? row.artifactId,
    sourceId: row.source_id ?? row.sourceId,
    candidateType: row.candidate_type ?? row.candidateType,
    status: row.status,
    title: row.title || '',
    summary: row.summary || '',
    ownerHint: row.owner_hint ?? row.ownerHint ?? '',
    evidenceExcerpt: row.evidence_excerpt ?? row.evidenceExcerpt ?? '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function mapSharedCommunicationSynthesisRunRow(row) {
  return {
    runId: row.run_id ?? row.runId,
    title: row.title || '',
    status: row.status,
    model: row.model || '',
    outputPath: row.output_path ?? row.outputPath ?? '',
    candidateLimit: row.candidate_limit ?? row.candidateLimit ?? null,
    candidatesRead: row.candidates_read ?? row.candidatesRead ?? 0,
    daysWindow: row.days_window ?? row.daysWindow ?? null,
    maxItems: row.max_items ?? row.maxItems ?? null,
    sourceCoverage: row.source_coverage || [],
    suppressedPatterns: row.suppressed_patterns || [],
    openQuestions: row.open_questions || [],
    archiveSummary: row.archive_summary || [],
    candidateSummary: row.candidate_summary || [],
    sourceFacts: row.source_facts || {},
    metadata: row.metadata || {},
    generatedAt: row.generated_at ?? row.generatedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function mapSharedCommunicationSynthesizedItemRow(row) {
  return {
    synthesisItemId: row.synthesis_item_id ?? row.synthesisItemId,
    runId: row.run_id ?? row.runId,
    rank: row.rank == null ? null : Number(row.rank),
    itemType: row.item_type ?? row.itemType,
    status: row.status,
    title: row.title || '',
    oneLine: row.one_line ?? row.oneLine ?? '',
    whyItMatters: row.why_it_matters ?? row.whyItMatters ?? '',
    recommendedNextAction: row.recommended_next_action ?? row.recommendedNextAction ?? '',
    suggestedOwner: row.suggested_owner ?? row.suggestedOwner ?? '',
    sourceCount: row.source_count ?? row.sourceCount ?? 0,
    candidateKeys: Array.isArray(row.candidate_keys) ? row.candidate_keys : [],
    sourceIds: Array.isArray(row.source_ids) ? row.source_ids : [],
    evidenceSummary: row.evidence_summary ?? row.evidenceSummary ?? '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    sensitivity: row.sensitivity || 'neutral',
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt ?? null,
  }
}

function mapFubLeadSourceRuleRow(row) {
  return {
    source: row.source_name,
    marketingType: row.marketing_type,
    ownershipType: row.ownership_type,
    flagState: row.flag_state,
    sourceGroup: row.source_group,
    notes: row.notes,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    updatedBy: row.updated_by || null,
  }
}

function mapFubLeadSourceSnapshotRow(row) {
  return {
    contextKey: row.context_key,
    contextLabel: row.context_label,
    sources: Array.isArray(row.payload) ? row.payload : [],
    scan: {
      uniqueSources: Number(row.unique_sources || 0),
      peopleScanned: Number(row.people_scanned || 0),
      pagesScanned: Number(row.pages_scanned || 0),
      truncated: Boolean(row.truncated),
    },
    refreshedAt: row.refreshed_at?.toISOString?.() || row.refreshed_at || null,
    refreshedBy: row.refreshed_by || null,
  }
}

async function withFoundationTransaction(work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original error.
    }
    throw error
  } finally {
    client.release()
  }
}

async function insertChangeEvent(client, event) {
  await client.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      event.eventType,
      event.entityTable,
      event.entityId,
      event.actor,
      event.summary,
      JSON.stringify(event.metadata || {}),
    ]
  )
}

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid ID prefix is required.')

  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )

  const nextNumber = result.rows.reduce((max, row) => {
    return Math.max(max, getNumericSuffix(row.id, normalizedPrefix))
  }, 0) + 1

  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

export async function initFoundationDb() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team TEXT NOT NULL,
        lane TEXT NOT NULL CHECK (lane IN ('research', 'scoped', 'ranked', 'executing', 'parked', 'done')),
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        rank INTEGER,
        source TEXT,
        summary TEXT,
        why_it_matters TEXT,
        next_action TEXT,
        status_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_backlog_team_lane_rank
      ON backlog_items(team, lane, rank, created_at);

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('locked', 'proposed', 'superseded')),
        summary TEXT NOT NULL,
        rationale TEXT,
        source_ref TEXT,
        decision_owner TEXT,
        confirmed_by TEXT,
        participant_names TEXT[],
        context_ref TEXT,
        evidence_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_status_category
      ON decisions(status, category, created_at DESC);

      CREATE TABLE IF NOT EXISTS parking_lot_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS open_questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memory_system_status (
        component_key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('live', 'pending', 'planned', 'risk')),
        detail TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doc_source_snapshots (
        id TEXT PRIMARY KEY,
        doc_path TEXT NOT NULL,
        source_id TEXT NOT NULL,
        group_title TEXT NOT NULL,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        detail TEXT,
        as_of DATE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_doc_source_snapshots_doc_path
      ON doc_source_snapshots(doc_path, group_title, sort_order, created_at);

      CREATE TABLE IF NOT EXISTS fub_lead_source_rules (
        source_name TEXT PRIMARY KEY,
        marketing_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (marketing_type IN ('marketing', 'non_marketing', 'unclassified')),
        ownership_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (ownership_type IN ('company', 'agent', 'referral', 'other', 'unclassified')),
        flag_state TEXT NOT NULL DEFAULT 'none'
          CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate')),
        source_group TEXT,
        notes TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_rules_marketing
      ON fub_lead_source_rules(marketing_type, ownership_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS fub_lead_source_snapshots (
        context_key TEXT PRIMARY KEY,
        context_label TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        unique_sources INTEGER NOT NULL DEFAULT 0,
        people_scanned INTEGER NOT NULL DEFAULT 0,
        pages_scanned INTEGER NOT NULL DEFAULT 0,
        truncated BOOLEAN NOT NULL DEFAULT FALSE,
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        refreshed_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_snapshots_refreshed
      ON fub_lead_source_snapshots(refreshed_at DESC);
    `)

    await client.query(`
      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS supersedes_ids TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS decision_owner TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS participant_names TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS context_ref TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS evidence_notes TEXT;

      UPDATE decisions
      SET classified_at = COALESCE(classified_at, created_at)
      WHERE classified_at IS NULL;

      ALTER TABLE backlog_items
      ADD COLUMN IF NOT EXISTS owner TEXT;

      ALTER TABLE fub_lead_source_rules
      ADD COLUMN IF NOT EXISTS flag_state TEXT NOT NULL DEFAULT 'none';

      ALTER TABLE fub_lead_source_rules
      DROP CONSTRAINT IF EXISTS fub_lead_source_rules_flag_state_check;

      ALTER TABLE fub_lead_source_rules
      ADD CONSTRAINT fub_lead_source_rules_flag_state_check
      CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE open_questions
      DROP CONSTRAINT IF EXISTS open_questions_status_check;

      ALTER TABLE open_questions
      ADD CONSTRAINT open_questions_status_check
      CHECK (status IN ('open', 'resolved'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_by TEXT;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolution_note TEXT;

      UPDATE open_questions
      SET status = COALESCE(status, 'open')
      WHERE status IS NULL;

      CREATE TABLE IF NOT EXISTS pending_doc_updates (
        id TEXT PRIMARY KEY,
        decision_id TEXT REFERENCES decisions(id),
        target_doc_path TEXT NOT NULL,
        target_section TEXT,
        summary TEXT NOT NULL,
        current_text TEXT,
        proposed_text TEXT NOT NULL,
        proposed_diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired', 'failed')),
        proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        proposed_by TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        applied_at TIMESTAMPTZ,
        applied_commit TEXT,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status
      ON pending_doc_updates(status);

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision
      ON pending_doc_updates(decision_id);

      CREATE TABLE IF NOT EXISTS change_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL
          CHECK (event_type IN (
            'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
            'backlog_created', 'backlog_status_changed', 'backlog_updated',
            'question_created', 'question_updated', 'question_resolved', 'question_reopened',
            'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
            'source_drift_detected', 'source_drift_cleared',
            'review_queue_changed', 'review_queue_cleared'
          )),
        entity_table TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_change_events_created_at
      ON change_events(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_change_events_entity
      ON change_events(entity_table, entity_id);

      ALTER TABLE change_events
      DROP CONSTRAINT IF EXISTS change_events_event_type_check;

      ALTER TABLE change_events
      ADD CONSTRAINT change_events_event_type_check
      CHECK (event_type IN (
        'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
        'backlog_created', 'backlog_status_changed', 'backlog_updated',
        'question_created', 'question_updated', 'question_resolved', 'question_reopened',
        'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
        'source_drift_detected', 'source_drift_cleared',
        'review_queue_changed', 'review_queue_cleared'
      ));

      CREATE TABLE IF NOT EXISTS shared_communication_artifacts (
        artifact_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL
          CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread')),
        external_id TEXT NOT NULL,
        title TEXT,
        source_account TEXT,
        source_container TEXT,
        source_url TEXT,
        participants JSONB NOT NULL DEFAULT '[]'::jsonb,
        content_text TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL DEFAULT '',
        artifact_created_at TIMESTAMPTZ,
        artifact_updated_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ingested_by TEXT,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifacts_source
      ON shared_communication_artifacts(source_id, artifact_type, artifact_updated_at DESC, ingested_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_candidates (
        candidate_key TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        candidate_type TEXT NOT NULL
          CHECK (candidate_type IN ('task_candidate', 'decision_candidate', 'blocker', 'feedback_signal', 'atom_candidate')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'duplicate')),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner_hint TEXT,
        evidence_excerpt TEXT,
        confidence NUMERIC(4,3),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_candidates_lookup
      ON shared_communication_candidates(source_id, candidate_type, status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_synthesis_runs (
        run_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed'
          CHECK (status IN ('completed', 'failed')),
        model TEXT NOT NULL,
        output_path TEXT,
        candidate_limit INTEGER,
        candidates_read INTEGER NOT NULL DEFAULT 0,
        days_window INTEGER,
        max_items INTEGER,
        source_coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
        suppressed_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
        open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        archive_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        candidate_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        source_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE shared_communication_synthesis_runs
      ADD COLUMN IF NOT EXISTS source_facts JSONB NOT NULL DEFAULT '{}'::jsonb;

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesis_runs_generated
      ON shared_communication_synthesis_runs(generated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_synthesized_items (
        synthesis_item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES shared_communication_synthesis_runs(run_id) ON DELETE CASCADE,
        rank INTEGER NOT NULL,
        item_type TEXT NOT NULL
          CHECK (item_type IN (
            'decision',
            'blocker',
            'action_item',
            'strategic_issue',
            'pattern',
            'content_atom',
            'source_trust_issue'
          )),
        status TEXT NOT NULL
          CHECK (status IN (
            'new',
            'active',
            'needs_decision',
            'needs_owner',
            'stale_watch',
            'historical_context',
            'likely_resolved'
          )),
        title TEXT NOT NULL,
        one_line TEXT NOT NULL DEFAULT '',
        why_it_matters TEXT NOT NULL DEFAULT '',
        recommended_next_action TEXT NOT NULL DEFAULT '',
        suggested_owner TEXT,
        source_count INTEGER NOT NULL DEFAULT 0,
        candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        evidence_summary TEXT NOT NULL DEFAULT '',
        confidence NUMERIC(4,3),
        sensitivity TEXT NOT NULL DEFAULT 'neutral'
          CHECK (sensitivity IN (
            'neutral',
            'positive',
            'performance_concern',
            'termination_risk',
            'comp_discussion',
            'undisclosed_feedback'
          )),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_run
      ON shared_communication_synthesized_items(run_id, rank ASC);

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_lookup
      ON shared_communication_synthesized_items(item_type, status, rank ASC);

      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier SMALLINT
          CHECK (tier IS NULL OR tier IN (1, 2, 3)),
        user_type TEXT NOT NULL
          CHECK (user_type IN ('human', 'system')),
        active BOOLEAN NOT NULL DEFAULT true,
        meeting_sync_enabled BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_meeting_sync_enabled
      ON users(meeting_sync_enabled, active, user_type, email);
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      DROP CONSTRAINT IF EXISTS shared_communication_artifacts_artifact_type_check;
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      ADD CONSTRAINT shared_communication_artifacts_artifact_type_check
      CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread'));
    `)

    await client.query(`
      ALTER TABLE backlog_items
      DROP CONSTRAINT IF EXISTS backlog_items_team_check;
    `)

    await client.query(`
      UPDATE backlog_items
      SET team = 'foundation'
      WHERE team = 'dev';
    `)

    await client.query(`
      ALTER TABLE backlog_items
      ADD CONSTRAINT backlog_items_team_check
      CHECK (team IN (${backlogScopeKeys.map(scope => `'${scope}'`).join(', ')}));
    `)

    await seedTable(
      client,
      'users',
      foundationUserSeed,
      `
        INSERT INTO users (
          email, name, tier, user_type, active, meeting_sync_enabled, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            tier = EXCLUDED.tier,
            user_type = EXCLUDED.user_type,
            active = EXCLUDED.active,
            meeting_sync_enabled = EXCLUDED.meeting_sync_enabled,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
      `,
      row => [
        row.email,
        row.name,
        row.tier,
        row.userType,
        row.active,
        row.meetingSyncEnabled,
        JSON.stringify(row.metadata || {}),
      ]
    )

    await seedTable(
      client,
      'backlog_items',
      backlogSeed,
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        normalizeBacklogScopeKey(row.scope ?? row.team),
        row.lane,
        row.priority,
        row.rank,
        row.source,
        row.summary,
        row.whyItMatters,
        row.nextAction,
        row.statusNote,
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
          AND title = $8
      `,
      [
        'FOUNDATION-002',
        'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
        'done',
        'The `ADMIN ONLY - Deal Data Entry` sign-off is complete. This card now exists to preserve that closure and make sure the remaining Owners Dashboard follow-on work stays attached to the right downstream cards instead of keeping a false "source sign-off still open" story alive.',
        'If the backlog keeps claiming the Admin-tab sign-off is unfinished after the source layer marks it signed off, Foundation starts violating its own truth model.',
        'Treat `SRC-OWNERS-001` as closed. Use `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, and `FOUNDATION-003` for the remaining parity, quality, and finance follow-on work.',
        'Closed on 2026-04-16. This card should stay as a closeout record, not an active blocker.',
        'Finish source sign-off for SRC-OWNERS-001',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-009',
        'done',
        'The root backlog now uses a data-driven scope registry instead of fixed `dev` / `marketing` labels, so Foundation, Strategic Execution, Marketing, and future hubs can share one queue model without frontend surgery.',
        'Keep the scope registry authoritative, let the API/UI read from it, and expand the active scopes only when a real root queue or hub is ready instead of hardcoding new labels ad hoc.',
        'Done. Canonical backlog scopes are now registry-driven, legacy `dev` items are backfilled to `foundation`, and the Foundation UI/API create, filter, and edit against scope metadata instead of fixed labels.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-001',
        'scoped',
        'Use the live delegated Gmail reader to define the exact mailbox boundary, search presets, and archive / normalization path the Foundation shared-communications layer should trust first, then decide what still belongs to Missive instead of Gmail.',
        'Delegated Gmail reads are now live in the rebuild for `ai@bensoncrew.ca`, including search, message read, and thread read. The remaining work is signed-off scope and normalization, not basic access.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-002',
        'scoped',
        'Use the live delegated Calendar reader to define the exact primary calendars, event classes, and governance reads the Foundation shared-communications layer should trust first, then decide what should later move into hub-specific workflows.',
        'Delegated Calendar reads are now live in the rebuild for `ai@bensoncrew.ca`, including bounded event listing. The remaining work is signed-off scope and normalization, not basic access.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-006',
        'scoped',
        'Use the live Missive bridge to define the exact inboxes, assignment context, and comment surfaces the Foundation shared-communications layer should trust first, then normalize those reads alongside Gmail instead of treating them as separate systems.',
        'Missive reads are now live in the rebuild for org health, inbox conversations, and full thread reads. The remaining work is signed-off scope and normalization, not basic connectivity.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-018',
        'scoped',
        'Use the now-live paginated delegated scan, transcript-gap report, and meeting-class metadata to close the meeting contract: verify the post-default forward flow on each organizer’s most recent meetings, keep widening governed extraction/apply depth, and only then decide whether older pre-2026 artifacts justify a deeper historical pull.',
        'Delegated meeting-note reads now scan the enabled BCrew user list with paginated Drive search, detect standalone transcript docs or embedded transcript sections, archive canonical meeting artifacts into PostgreSQL, mirror organized copies into Crewbert Drive in copy mode, and tag meetings `broadcast` vs `discussion`. Remaining work is forward-looking transcript enforcement verification, privacy/read-side controls, and deeper historical probing, not basic access.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-019',
        'scoped',
        'Keep Gmail / Missive / Slack / meeting archives stable, deepen candidate promotion paths, add read-side subject-person redaction, and close the synthesis functions on top: cross-artifact linking, resolution detection, cross-source dedup, staleness scoring, and actionability ranking.',
        'Shared archive is now materially real across Gmail, Missive, Slack, meeting notes, and meeting transcripts, with governed extraction live for all four, first apply paths for task -> backlog, decision -> decision, and blocker -> open question, plus a first batch synthesis proof. Remaining work is durable backfill control, source-backed fact grounding, read-side privacy/query logic, and turning synthesis from proof into operating layer.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET next_action = $2,
            status_note = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYNTHESIS-ENGINE-001',
        'Use the V1 contract and first shared-comms synthesis proof to build the real substrate: persist synthesized items, link them to candidates/artifacts/source facts, detect resolution/supersession, score staleness, rank actionability, and generate the tighter ownership strategy packet instead of another raw candidate dump.',
        'First proof exists as a batch job and handoff. It successfully grouped multi-source issues like KPI/reporting failure, automation-health degradation, SocialPilot instability, finance reconciliation, and source-trust problems. It is not done until it persists state, grounds against source-backed operating facts, and supports repeatable strategy/leadership briefs.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET next_action = $2,
            status_note = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-020',
        'Keep the now-live Google delegated stack, Missive bridge, and Slack reader stable, watch for pagination/regression issues, and harden the remaining rollout gaps before layering more automation on top.',
        'Adapter hardening is no longer hypothetical: Drive pagination is fixed, the meeting backfill now reaches a real multi-month archive, Slack history paginates, and the existing bot covers almost all required ops channels. Remaining adapter work is the last Slack rollout gaps plus older-archive probing, not blank-sheet connector work.',
      ]
    )

    await seedTable(
      client,
      'decisions',
      decisionsSeed,
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.category,
        row.title,
        row.status,
        row.summary,
        row.rationale,
        row.sourceRef,
        row.decisionOwner ?? null,
        row.confirmedBy ?? null,
        normalizeStringList(row.participantNames),
        row.contextRef ?? null,
        row.evidenceNotes ?? null,
      ]
    )

    for (const row of decisionsSeed) {
      await client.query(
        `
          UPDATE decisions
          SET decision_owner = COALESCE(decision_owner, $2),
              confirmed_by = COALESCE(confirmed_by, $3),
              participant_names = CASE
                WHEN participant_names IS NULL OR cardinality(participant_names) = 0 THEN $4::text[]
                ELSE participant_names
              END,
              context_ref = COALESCE(context_ref, $5),
              evidence_notes = COALESCE(evidence_notes, $6),
              updated_at = CASE
                WHEN decision_owner IS NULL
                  OR confirmed_by IS NULL
                  OR participant_names IS NULL
                  OR cardinality(participant_names) = 0
                  OR context_ref IS NULL
                  OR evidence_notes IS NULL
                THEN NOW()
                ELSE updated_at
              END
          WHERE id = $1
        `,
        [
          row.id,
          row.decisionOwner ?? null,
          row.confirmedBy ?? null,
          normalizeStringList(row.participantNames),
          row.contextRef ?? null,
          row.evidenceNotes ?? null,
        ]
      )
    }

    await seedTable(
      client,
      'parking_lot_items',
      parkingLotSeed,
      `
        INSERT INTO parking_lot_items (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'open_questions',
      openQuestionsSeed,
      `
        INSERT INTO open_questions (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'memory_system_status',
      memoryStatusSeed,
      `
        INSERT INTO memory_system_status (component_key, label, status, detail)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (component_key) DO NOTHING
      `,
      row => [row.componentKey, row.label, row.status, row.detail]
    )

    await client.query(
      `
        DELETE FROM doc_source_snapshots
        WHERE doc_path = $1
      `,
      ['docs/strategy/bhag-model.md']
    )

    await seedTable(
      client,
      'doc_source_snapshots',
      docSourceSnapshotsSeed,
      `
        INSERT INTO doc_source_snapshots (
          id, doc_path, source_id, group_title, label, value, detail, as_of, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          doc_path = EXCLUDED.doc_path,
          source_id = EXCLUDED.source_id,
          group_title = EXCLUDED.group_title,
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          detail = EXCLUDED.detail,
          as_of = EXCLUDED.as_of,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      row => [
        row.id,
        row.docPath,
        row.sourceId,
        row.groupTitle,
        row.label,
        row.value,
        row.detail,
        row.asOf,
        row.sortOrder,
      ]
    )

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original startup error.
    }
    throw error
  } finally {
    client.release()
  }
}

export async function getFoundationSnapshot() {
  const sharedCommunicationsArchive = await getSharedCommunicationArchiveSnapshot({ limit: 10 })
  const sharedCommunicationCandidates = await getSharedCommunicationCandidateSnapshot({
    status: 'pending',
    limit: 10,
    includeItems: false,
  })
  const sharedCommunicationSynthesis = await getSharedCommunicationSynthesisSnapshot({
    limit: 3,
    itemLimit: 12,
  })
  const [backlogResult, decisionsResult, parkingResult, questionsResult, memoryStatusResult, pendingDocUpdatesResult, recentChangesResult, usersResult] =
    await Promise.all([
      pool.query(`
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
               next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
        FROM backlog_items
        ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
                 rank NULLS LAST,
                 created_at ASC
      `),
      pool.query(`
        SELECT id, category, title, status, summary, rationale, source_ref,
               decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
               classified_at, classified_by, supersedes_ids, created_at, updated_at
        FROM decisions
        ORDER BY created_at DESC
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at, updated_at
        FROM parking_lot_items
        ORDER BY created_at ASC
      `),
      pool.query(`
        SELECT id, title, summary, owner, status, resolved_at, resolved_by, resolution_note, created_at, updated_at
        FROM open_questions
        ORDER BY status ASC, created_at ASC
      `),
      pool.query(`
        SELECT component_key AS "componentKey", label, status, detail, updated_at AS "updatedAt"
        FROM memory_system_status
        ORDER BY label ASC
      `),
      pool.query(`
        SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
               d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
               d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
               d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
               p.target_doc_path, p.target_section, p.summary,
               p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
               p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
        FROM pending_doc_updates p
        LEFT JOIN decisions d ON d.id = p.decision_id
        ORDER BY p.proposed_at DESC
      `),
      pool.query(`
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
        FROM users
        WHERE active = true
        ORDER BY user_type ASC, name ASC, email ASC
      `),
    ])

  const decisions = decisionsResult.rows.map(mapDecisionRow)
  const pendingDocUpdates = pendingDocUpdatesResult.rows.map(mapPendingDocUpdateRow)
  const recentChanges = recentChangesResult.rows.map(mapChangeEventRow)

  return {
    backlogItems: backlogResult.rows.map(mapBacklogRow),
    decisions,
    parkingLot: parkingResult.rows,
    openQuestions: questionsResult.rows.map(mapOpenQuestionRow),
    users: usersResult.rows.map(mapFoundationUserRow),
    memoryStatus: memoryStatusResult.rows,
    pendingDocUpdates,
    recentChanges,
    decisionTraceability: buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges),
    decisionReview: buildDecisionReviewSnapshot(decisions, pendingDocUpdates),
    sharedCommunicationsArchive,
    sharedCommunicationCandidates,
    sharedCommunicationSynthesis,
    meta: {
      canonicalDecisionCategories,
      backlogIdPrefixes: getBacklogIdPrefixes(),
      backlogScopes: getBacklogScopes(),
    },
  }
}

function normalizeDecisionIdList(ids, currentId = null) {
  const seen = new Set()
  return (ids || [])
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => value && value !== currentId)
    .filter(value => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function normalizeStringList(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

async function markSupersededDecisions(client, supersedesIds, sourceDecisionId, actor) {
  const normalizedIds = normalizeDecisionIdList(supersedesIds, sourceDecisionId)
  if (!normalizedIds.length) return []

  const existingResult = await client.query(
    `
      SELECT id, status
      FROM decisions
      WHERE id = ANY($1::text[])
    `,
    [normalizedIds]
  )

  const foundIds = new Set(existingResult.rows.map(row => row.id))

  for (const row of existingResult.rows) {
    if (row.status === 'superseded') continue

    await client.query(
      `
        UPDATE decisions
        SET status = 'superseded',
            updated_at = NOW()
        WHERE id = $1
      `,
      [row.id]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_superseded',
      entityTable: 'decisions',
      entityId: row.id,
      actor,
      summary: `Decision ${row.id} superseded by ${sourceDecisionId}`,
      metadata: {
        supersededBy: sourceDecisionId,
      },
    })
  }

  return normalizedIds.filter(id => foundIds.has(id))
}

export function getCanonicalDecisionCategories() {
  return canonicalDecisionCategories.slice()
}

export function getFoundationBacklogIdPrefixes() {
  return getBacklogIdPrefixes()
}

export function getFoundationBacklogScopes() {
  return getBacklogScopes()
}

export async function getRecentChangeEvents(limit = 20) {
  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  )

  return result.rows.map(mapChangeEventRow)
}

export async function getLatestChangeEventForEntity(entityTable, entityId, eventTypes = []) {
  const table = String(entityTable || '').trim()
  const id = String(entityId || '').trim()
  if (!table || !id) return null

  const normalizedEventTypes = Array.isArray(eventTypes)
    ? eventTypes.map(value => String(value || '').trim()).filter(Boolean)
    : []

  const values = [table, id]
  let where = `
      WHERE entity_table = $1
        AND entity_id = $2
  `

  if (normalizedEventTypes.length) {
    values.push(normalizedEventTypes)
    where += `
        AND event_type = ANY($3)
    `
  }

  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ${where}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    values
  )

  return result.rows[0] ? mapChangeEventRow(result.rows[0]) : null
}

export async function getSharedCommunicationArchiveSnapshot({ sourceId, artifactType, limit = 20, includeSensitive = false } = {}) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (artifactType) {
    values.push(String(artifactType).trim())
    filters.push(`artifact_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const [summaryResult, recentResult] = await Promise.all([
    pool.query(
      `
        SELECT source_id, artifact_type, COUNT(*)::int AS total
        FROM shared_communication_artifacts
        ${whereClause}
        GROUP BY source_id, artifact_type
        ORDER BY source_id ASC, artifact_type ASC
      `,
      values
    ),
    pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        ${whereClause}
        ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
        LIMIT $${values.length + 1}
      `,
      [...values, normalizedLimit]
    ),
  ])

  const bySource = {}
  const byType = {}
  let totalArtifacts = 0

  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalArtifacts += count
    bySource[row.source_id] = (bySource[row.source_id] || 0) + count
    byType[row.artifact_type] = (byType[row.artifact_type] || 0) + count
  }

  return {
    totalArtifacts,
    bySource,
    byType,
    items: recentResult.rows.map(row => mapSharedCommunicationArtifactRow(row, { includeSensitive })),
  }
}

export async function listFoundationUsers({
  activeOnly = true,
  meetingSyncEnabled = null,
  userType = null,
} = {}) {
  const values = []
  const filters = []

  if (activeOnly) {
    values.push(true)
    filters.push(`active = $${values.length}`)
  }

  if (meetingSyncEnabled !== null && meetingSyncEnabled !== undefined) {
    values.push(Boolean(meetingSyncEnabled))
    filters.push(`meeting_sync_enabled = $${values.length}`)
  }

  if (userType) {
    values.push(String(userType).trim())
    filters.push(`user_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY user_type ASC, name ASC, email ASC
    `,
    values
  )

  return result.rows.map(mapFoundationUserRow)
}

export async function getSharedCommunicationArtifactsForProcessing({ sourceId, artifactType, limit = 20 } = {}) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (artifactType) {
    values.push(String(artifactType).trim())
    filters.push(`artifact_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT artifact_id, source_id, artifact_type, external_id, title,
             content_text, artifact_updated_at, metadata
      FROM shared_communication_artifacts
      ${whereClause}
      ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
      LIMIT $${values.length + 1}
    `,
    [...values, normalizedLimit]
  )

  return result.rows.map(row => ({
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    externalId: row.external_id,
    title: row.title || '',
    contentText: row.content_text || '',
    artifactUpdatedAt: row.artifact_updated_at ?? null,
    metadata: row.metadata || {},
  }))
}

export async function upsertSharedCommunicationArtifact(input, actor = 'system') {
  const artifactId =
    input.artifactId ||
    `${String(input.sourceId || '').trim()}:${String(input.externalId || '').trim()}`

  if (!artifactId || !input.sourceId || !input.artifactType || !input.externalId) {
    throw new Error('artifactId/sourceId/artifactType/externalId are required for shared communication archive writes.')
  }

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO shared_communication_artifacts (
          artifact_id, source_id, artifact_type, external_id, title,
          source_account, source_container, source_url, participants,
          content_text, content_hash, artifact_created_at, artifact_updated_at,
          metadata, ingested_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15)
        ON CONFLICT (artifact_id) DO UPDATE
        SET title = EXCLUDED.title,
            source_account = EXCLUDED.source_account,
            source_container = EXCLUDED.source_container,
            source_url = EXCLUDED.source_url,
            participants = EXCLUDED.participants,
            content_text = EXCLUDED.content_text,
            content_hash = EXCLUDED.content_hash,
            artifact_created_at = COALESCE(EXCLUDED.artifact_created_at, shared_communication_artifacts.artifact_created_at),
            artifact_updated_at = COALESCE(EXCLUDED.artifact_updated_at, shared_communication_artifacts.artifact_updated_at),
            metadata = EXCLUDED.metadata,
            ingested_by = EXCLUDED.ingested_by,
            ingested_at = NOW(),
            updated_at = CASE
              WHEN shared_communication_artifacts.title IS DISTINCT FROM EXCLUDED.title
                OR shared_communication_artifacts.source_account IS DISTINCT FROM EXCLUDED.source_account
                OR shared_communication_artifacts.source_container IS DISTINCT FROM EXCLUDED.source_container
                OR shared_communication_artifacts.source_url IS DISTINCT FROM EXCLUDED.source_url
                OR shared_communication_artifacts.participants IS DISTINCT FROM EXCLUDED.participants
                OR shared_communication_artifacts.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                OR shared_communication_artifacts.artifact_updated_at IS DISTINCT FROM EXCLUDED.artifact_updated_at
                OR shared_communication_artifacts.metadata IS DISTINCT FROM EXCLUDED.metadata
              THEN NOW()
              ELSE shared_communication_artifacts.updated_at
            END
        RETURNING artifact_id, source_id, artifact_type, external_id, title,
                  source_account, source_container, source_url, participants,
                  content_text, content_hash, artifact_created_at, artifact_updated_at,
                  metadata, ingested_by, ingested_at, updated_at
      `,
      [
        artifactId,
        input.sourceId,
        input.artifactType,
        input.externalId,
        input.title ?? null,
        input.sourceAccount ?? null,
        input.sourceContainer ?? null,
        input.sourceUrl ?? null,
        JSON.stringify(Array.isArray(input.participants) ? input.participants : []),
        input.contentText ?? '',
        input.contentHash ?? '',
        input.artifactCreatedAt ?? null,
        input.artifactUpdatedAt ?? null,
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    return mapSharedCommunicationArtifactRow(result.rows[0])
  })
}

export async function getSharedCommunicationCandidateSnapshot({
  sourceId,
  candidateType,
  status,
  limit = 20,
  includeItems = true,
} = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  if (status) {
    values.push(String(status).trim())
    filters.push(`status = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const summaryResult = await pool.query(
    `
      SELECT candidate_type, status, COUNT(*)::int AS total
      FROM shared_communication_candidates
      ${whereClause}
      GROUP BY candidate_type, status
      ORDER BY candidate_type ASC, status ASC
    `,
    values
  )

  const byType = {}
  const byStatus = {}
  let totalCandidates = 0

  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalCandidates += count
    byType[row.candidate_type] = (byType[row.candidate_type] || 0) + count
    byStatus[row.status] = (byStatus[row.status] || 0) + count
  }

  let items = []
  if (includeItems) {
    const itemsResult = await pool.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        ${whereClause}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $${values.length + 1}
      `,
      [...values, normalizedLimit]
    )
    items = itemsResult.rows.map(mapSharedCommunicationCandidateRow)
  }

  return {
    totalCandidates,
    byType,
    byStatus,
    items,
  }
}

export async function upsertSharedCommunicationCandidate(input) {
  if (!input.candidateKey || !input.artifactId || !input.sourceId || !input.candidateType || !input.title || !input.summary) {
    throw new Error('candidateKey/artifactId/sourceId/candidateType/title/summary are required for shared communication candidate writes.')
  }

  const result = await pool.query(
    `
      INSERT INTO shared_communication_candidates (
        candidate_key, artifact_id, source_id, candidate_type, title, summary,
        owner_hint, evidence_excerpt, confidence, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (candidate_key) DO UPDATE
      SET title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          owner_hint = EXCLUDED.owner_hint,
          evidence_excerpt = EXCLUDED.evidence_excerpt,
          confidence = EXCLUDED.confidence,
          metadata = EXCLUDED.metadata,
          updated_at = CASE
            WHEN shared_communication_candidates.title IS DISTINCT FROM EXCLUDED.title
              OR shared_communication_candidates.summary IS DISTINCT FROM EXCLUDED.summary
              OR shared_communication_candidates.owner_hint IS DISTINCT FROM EXCLUDED.owner_hint
              OR shared_communication_candidates.evidence_excerpt IS DISTINCT FROM EXCLUDED.evidence_excerpt
              OR shared_communication_candidates.confidence IS DISTINCT FROM EXCLUDED.confidence
              OR shared_communication_candidates.metadata IS DISTINCT FROM EXCLUDED.metadata
            THEN NOW()
            ELSE shared_communication_candidates.updated_at
          END
      RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                title, summary, owner_hint, evidence_excerpt, confidence,
                metadata, created_at, updated_at
    `,
    [
      input.candidateKey,
      input.artifactId,
      input.sourceId,
      input.candidateType,
      input.title,
      input.summary,
      input.ownerHint ?? null,
      input.evidenceExcerpt ?? null,
      input.confidence ?? null,
      JSON.stringify(input.metadata || {}),
    ]
  )

  return mapSharedCommunicationCandidateRow(result.rows[0])
}

export async function recordSharedCommunicationSynthesisRun(input, actor = 'system') {
  if (!input.runId || !input.title || !input.model) {
    throw new Error('runId/title/model are required for shared communication synthesis writes.')
  }

  const items = Array.isArray(input.items) ? input.items : []
  return withFoundationTransaction(async client => {
    const runResult = await client.query(
      `
        INSERT INTO shared_communication_synthesis_runs (
          run_id, title, status, model, output_path, candidate_limit,
          candidates_read, days_window, max_items, source_coverage,
          suppressed_patterns, open_questions, archive_summary,
          candidate_summary, source_facts, metadata, generated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17)
        ON CONFLICT (run_id) DO UPDATE
        SET title = EXCLUDED.title,
            status = EXCLUDED.status,
            model = EXCLUDED.model,
            output_path = EXCLUDED.output_path,
            candidate_limit = EXCLUDED.candidate_limit,
            candidates_read = EXCLUDED.candidates_read,
            days_window = EXCLUDED.days_window,
            max_items = EXCLUDED.max_items,
            source_coverage = EXCLUDED.source_coverage,
            suppressed_patterns = EXCLUDED.suppressed_patterns,
            open_questions = EXCLUDED.open_questions,
            archive_summary = EXCLUDED.archive_summary,
            candidate_summary = EXCLUDED.candidate_summary,
            source_facts = EXCLUDED.source_facts,
            metadata = EXCLUDED.metadata,
            generated_at = EXCLUDED.generated_at,
            updated_at = NOW()
        RETURNING run_id, title, status, model, output_path, candidate_limit,
                  candidates_read, days_window, max_items, source_coverage,
                  suppressed_patterns, open_questions, archive_summary,
                  candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
      `,
      [
        input.runId,
        input.title,
        input.status || 'completed',
        input.model,
        input.outputPath || null,
        input.candidateLimit ?? null,
        input.candidatesRead ?? 0,
        input.daysWindow ?? null,
        input.maxItems ?? null,
        JSON.stringify(input.sourceCoverage || []),
        JSON.stringify(input.suppressedPatterns || []),
        JSON.stringify(input.openQuestions || []),
        JSON.stringify(input.archiveSummary || []),
        JSON.stringify(input.candidateSummary || []),
        JSON.stringify(input.sourceFacts || {}),
        JSON.stringify({
          ...(input.metadata || {}),
          recordedBy: actor,
        }),
        input.generatedAt || new Date().toISOString(),
      ]
    )

    await client.query(
      `DELETE FROM shared_communication_synthesized_items WHERE run_id = $1`,
      [input.runId]
    )

    for (const item of items) {
      const itemId = item.synthesisItemId || `${input.runId}:${item.rank}`
      await client.query(
        `
          INSERT INTO shared_communication_synthesized_items (
            synthesis_item_id, run_id, rank, item_type, status, title,
            one_line, why_it_matters, recommended_next_action, suggested_owner,
            source_count, candidate_keys, source_ids, evidence_summary,
            confidence, sensitivity, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[],$13::text[],$14,$15,$16,$17::jsonb)
        `,
        [
          itemId,
          input.runId,
          item.rank,
          item.itemType || item.item_type,
          item.status,
          item.title,
          item.oneLine || item.one_line || '',
          item.whyItMatters || item.why_it_matters || '',
          item.recommendedNextAction || item.recommended_next_action || '',
          item.suggestedOwner || item.suggested_owner || null,
          item.sourceCount ?? item.source_count ?? 0,
          Array.isArray(item.candidateKeys) ? item.candidateKeys : item.candidate_keys || [],
          Array.isArray(item.sourceIds) ? item.sourceIds : item.source_ids || [],
          item.evidenceSummary || item.evidence_summary || '',
          item.confidence ?? null,
          item.sensitivity || 'neutral',
          JSON.stringify(item.metadata || {}),
        ]
      )
    }

    return {
      run: mapSharedCommunicationSynthesisRunRow(runResult.rows[0]),
      itemCount: items.length,
    }
  })
}

export async function getSharedCommunicationSynthesisSnapshot({ limit = 3, itemLimit = 20 } = {}) {
  const normalizedLimit = Math.min(20, Math.max(1, Number(limit) || 3))
  const normalizedItemLimit = Math.min(100, Math.max(1, Number(itemLimit) || 20))

  const runsResult = await pool.query(
    `
      SELECT run_id, title, status, model, output_path, candidate_limit,
             candidates_read, days_window, max_items, source_coverage,
             suppressed_patterns, open_questions, archive_summary,
             candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
      FROM shared_communication_synthesis_runs
      ORDER BY generated_at DESC, created_at DESC
      LIMIT $1
    `,
    [normalizedLimit]
  )

  const runs = runsResult.rows.map(mapSharedCommunicationSynthesisRunRow)
  const latestRunId = runs[0]?.runId || ''
  let latestItems = []

  if (latestRunId) {
    const itemsResult = await pool.query(
      `
        SELECT synthesis_item_id, run_id, rank, item_type, status, title,
               one_line, why_it_matters, recommended_next_action, suggested_owner,
               source_count, candidate_keys, source_ids, evidence_summary,
               confidence, sensitivity, metadata, created_at
        FROM shared_communication_synthesized_items
        WHERE run_id = $1
        ORDER BY rank ASC
        LIMIT $2
      `,
      [latestRunId, normalizedItemLimit]
    )
    latestItems = itemsResult.rows.map(mapSharedCommunicationSynthesizedItemRow)
  }

  return {
    latestRun: runs[0] || null,
    runs,
    latestItems,
  }
}

export async function rejectSharedCommunicationCandidatesByExtractionMethod({
  sourceId,
  candidateType,
  extractionMethods,
  actor = 'system',
  reason = 'Superseded by a newer extraction method.',
} = {}) {
  const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
    .map(value => String(value || '').trim())
    .filter(Boolean)

  if (!normalizedMethods.length) {
    throw new Error('At least one extraction method is required to reject shared communication candidates.')
  }

  const values = []
  const filters = [`status = 'pending'`]

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  values.push(normalizedMethods)
  filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

  values.push(
    JSON.stringify({
      rejectionActor: actor,
      rejectionReason: reason,
      rejectedByCleanup: true,
      rejectedAt: new Date().toISOString(),
    })
  )

  const patchParam = values.length
  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = 'rejected',
          metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
          updated_at = NOW()
      WHERE ${filters.join(' AND ')}
      RETURNING candidate_key
    `,
    values
  )

  return {
    rejected: result.rowCount || 0,
    candidateKeys: result.rows.map(row => row.candidate_key),
  }
}

export async function rejectSharedCommunicationCandidatesForArtifacts({
  sourceId,
  candidateType,
  artifactIds,
  extractionMethods,
  actor = 'system',
  reason = 'Superseded by a newer extraction method.',
} = {}) {
  const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const normalizedArtifactIds = (Array.isArray(artifactIds) ? artifactIds : [artifactIds])
    .map(value => String(value || '').trim())
    .filter(Boolean)

  if (!normalizedMethods.length) {
    throw new Error('At least one extraction method is required to reject shared communication candidates.')
  }
  if (!normalizedArtifactIds.length) {
    return { rejected: 0, candidateKeys: [] }
  }

  const values = []
  const filters = [`status = 'pending'`]

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  values.push(normalizedArtifactIds)
  filters.push(`artifact_id = ANY($${values.length}::text[])`)

  values.push(normalizedMethods)
  filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

  values.push(
    JSON.stringify({
      rejectionActor: actor,
      rejectionReason: reason,
      rejectedByCleanup: true,
      rejectedAt: new Date().toISOString(),
    })
  )

  const patchParam = values.length
  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = 'rejected',
          metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
          updated_at = NOW()
      WHERE ${filters.join(' AND ')}
      RETURNING candidate_key
    `,
    values
  )

  return {
    rejected: result.rowCount || 0,
    candidateKeys: result.rows.map(row => row.candidate_key),
  }
}

export async function updateSharedCommunicationCandidateStatus(
  candidateKey,
  status,
  actor = 'system',
  metadataPatch = {}
) {
  const normalizedStatus = String(status || '').trim()
  const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'applied', 'duplicate'])
  if (!allowedStatuses.has(normalizedStatus)) {
    throw new Error(`Unsupported shared communication candidate status: ${normalizedStatus}`)
  }

  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = $2,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
      WHERE candidate_key = $1
      RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                title, summary, owner_hint, evidence_excerpt, confidence,
                metadata, created_at, updated_at
    `,
    [
      candidateKey,
      normalizedStatus,
      JSON.stringify({
        ...metadataPatch,
        lastStatusActor: actor,
        lastStatusChangedAt: new Date().toISOString(),
      }),
    ]
  )

  const row = result.rows[0]
  if (!row) {
    throw new Error(`Shared communication candidate not found: ${candidateKey}`)
  }

  return mapSharedCommunicationCandidateRow(row)
}

export async function applySharedCommunicationCandidateToBacklog(
  candidateKey,
  backlogInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    if (candidate.candidateType !== 'task_candidate') {
      throw new Error(`Only task candidates can be applied to backlog right now: ${candidate.candidateType}`)
    }

    const backlogId = await getNextPrefixedId(client, 'backlog_items', backlogInput.idPrefix || 'SYSTEM')
    const scope = normalizeBacklogScopeKey(backlogInput.scope ?? backlogInput.team ?? 'foundation')
    const lane = backlogInput.lane || 'scoped'
    const priority = backlogInput.priority || 'P2'
    const source = backlogInput.source || `${candidate.sourceId} shared communications candidate`
    const owner = backlogInput.owner ?? candidate.ownerHint ?? null
    const whyItMatters =
      backlogInput.whyItMatters ||
      `Promoted from shared communications candidate ${candidate.candidateKey} so the work can move into the governed backlog.`
    const nextAction = backlogInput.nextAction || candidate.summary
    const statusNote = backlogInput.statusNote || `Applied from ${candidate.candidateKey}.`

    const backlogResult = await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `,
      [
        backlogId,
        backlogInput.title || candidate.title,
        scope,
        lane,
        priority,
        backlogInput.rank ?? null,
        source,
        backlogInput.summary || candidate.summary,
        whyItMatters,
        nextAction,
        statusNote,
        owner,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'backlog_created',
      entityTable: 'backlog_items',
      entityId: backlogId,
      actor,
      summary: `Created backlog item ${backlogId}: ${backlogInput.title || candidate.title}`,
      metadata: {
        lane,
        priority,
        scope,
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'backlog_item',
          appliedTargetId: backlogId,
        }),
      ]
    )

    return {
      backlogItem: mapBacklogRow(backlogResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function applySharedCommunicationCandidateToDecision(
  candidateKey,
  decisionInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    if (candidate.candidateType !== 'decision_candidate') {
      throw new Error(`Only decision candidates can be applied to decisions right now: ${candidate.candidateType}`)
    }

    const decisionId = await getNextPrefixedId(client, 'decisions', 'DEC')
    const category = canonicalDecisionCategories.includes(decisionInput.category)
      ? decisionInput.category
      : 'execution'
    const supersedesIds = normalizeDecisionIdList(decisionInput.supersedesIds, decisionId)
    const participantNames = normalizeStringList(
      decisionInput.participantNames ?? candidate.metadata?.links?.participants ?? []
    )
    const decisionTitle = decisionInput.title || candidate.title
    const decisionSummary = decisionInput.summary || candidate.summary
    const rationale = Object.prototype.hasOwnProperty.call(decisionInput, 'rationale')
      ? (decisionInput.rationale ?? null)
      : candidate.summary
    const sourceRef =
      decisionInput.sourceRef ||
      `${candidate.sourceId} shared communications candidate ${candidate.candidateKey}`
    const decisionOwner = Object.prototype.hasOwnProperty.call(decisionInput, 'decisionOwner')
      ? (decisionInput.decisionOwner ?? null)
      : (candidate.ownerHint ?? null)
    const confirmedBy = Object.prototype.hasOwnProperty.call(decisionInput, 'confirmedBy')
      ? (decisionInput.confirmedBy ?? null)
      : null
    const contextRef = Object.prototype.hasOwnProperty.call(decisionInput, 'contextRef')
      ? (decisionInput.contextRef ?? null)
      : (candidate.metadata?.artifactTitle || candidate.artifactId || null)
    const evidenceNotes = Object.prototype.hasOwnProperty.call(decisionInput, 'evidenceNotes')
      ? (decisionInput.evidenceNotes ?? null)
      : (candidate.evidenceExcerpt || null)

    const decisionResult = await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
          classified_at, classified_by, supersedes_ids
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
        RETURNING *
      `,
      [
        decisionId,
        category,
        decisionTitle,
        decisionSummary,
        rationale,
        sourceRef,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        evidenceNotes,
        actor,
        supersedesIds,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: decisionId,
      actor,
      summary: `Proposed decision ${decisionId}: ${decisionTitle}`,
      metadata: {
        category,
        supersedesIds,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'decision',
          appliedTargetId: decisionId,
        }),
      ]
    )

    return {
      decision: mapDecisionRow(decisionResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function applySharedCommunicationCandidateToQuestion(
  candidateKey,
  questionInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    if (candidate.candidateType !== 'blocker') {
      throw new Error(`Only blocker candidates can be applied to open questions right now: ${candidate.candidateType}`)
    }

    const questionId = await getNextPrefixedId(client, 'open_questions', 'Q')
    const questionTitle = questionInput.title || candidate.title
    const questionSummary = questionInput.summary || candidate.summary
    const questionOwner = Object.prototype.hasOwnProperty.call(questionInput, 'owner')
      ? (questionInput.owner ?? null)
      : (candidate.ownerHint ?? null)

    const questionResult = await client.query(
      `
        INSERT INTO open_questions (
          id, title, summary, owner, status
        )
        VALUES ($1,$2,$3,$4,'open')
        RETURNING *
      `,
      [questionId, questionTitle, questionSummary, questionOwner]
    )

    await insertChangeEvent(client, {
      eventType: 'question_created',
      entityTable: 'open_questions',
      entityId: questionId,
      actor,
      summary: `Opened question ${questionId}: ${questionTitle}`,
      metadata: {
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'open_question',
          appliedTargetId: questionId,
        }),
      ]
    )

    return {
      question: mapOpenQuestionRow(questionResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function recordSourceDriftChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['source_drift_detected', 'source_drift_cleared'].includes(eventType)) {
      throw new Error('Source drift event type must be source_drift_detected or source_drift_cleared.')
    }
    if (!entityTable) throw new Error('Source drift entity table is required.')
    if (!entityId) throw new Error('Source drift entity id is required.')
    if (!summary) throw new Error('Source drift summary is required.')
    if (!fingerprint) throw new Error('Source drift fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('source_drift_detected', 'source_drift_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

export async function recordReviewQueueChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['review_queue_changed', 'review_queue_cleared'].includes(eventType)) {
      throw new Error('Review queue event type must be review_queue_changed or review_queue_cleared.')
    }
    if (!entityTable) throw new Error('Review queue entity table is required.')
    if (!entityId) throw new Error('Review queue entity id is required.')
    if (!summary) throw new Error('Review queue summary is required.')
    if (!fingerprint) throw new Error('Review queue fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('review_queue_changed', 'review_queue_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

export async function createBacklogItem(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'backlog_items', input.idPrefix)
    const scope = normalizeBacklogScopeKey(input.scope ?? input.team)
    const result = await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `,
      [
        id,
        input.title,
        scope,
        input.lane,
        input.priority,
        input.rank ?? null,
        input.source ?? null,
        input.summary ?? null,
        input.whyItMatters ?? null,
        input.nextAction ?? null,
        input.statusNote ?? null,
        input.owner ?? null,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'backlog_created',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: `Created backlog item ${id}: ${input.title}`,
      metadata: {
        lane: input.lane,
        priority: input.priority,
        scope,
      },
    })

    return mapBacklogRow(result.rows[0])
  })
}

export async function updateBacklogItem(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM backlog_items WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Backlog item not found: ${id}`)

    const nextRow = {
      title: input.title ?? existing.title,
      team: normalizeBacklogScopeKey(input.scope ?? input.team ?? existing.team),
      lane: input.lane ?? existing.lane,
      priority: input.priority ?? existing.priority,
      rank: input.rank ?? existing.rank,
      source: input.source ?? existing.source,
      summary: input.summary ?? existing.summary,
      why_it_matters: input.whyItMatters ?? existing.why_it_matters,
      next_action: input.nextAction ?? existing.next_action,
      status_note: input.statusNote ?? existing.status_note,
      owner: input.owner ?? existing.owner,
    }

    const result = await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            team = $3,
            lane = $4,
            priority = $5,
            rank = $6,
            source = $7,
            summary = $8,
            why_it_matters = $9,
            next_action = $10,
            status_note = $11,
            owner = $12,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextRow.title,
        nextRow.team,
        nextRow.lane,
        nextRow.priority,
        nextRow.rank,
        nextRow.source,
        nextRow.summary,
        nextRow.why_it_matters,
        nextRow.next_action,
        nextRow.status_note,
        nextRow.owner,
      ]
    )

    const laneChanged = existing.lane !== nextRow.lane
    await insertChangeEvent(client, {
      eventType: laneChanged ? 'backlog_status_changed' : 'backlog_updated',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: laneChanged
        ? `Moved backlog item ${id} to ${nextRow.lane}`
        : `Updated backlog item ${id}`,
      metadata: {
        before: {
          scope: normalizeBacklogScopeKey(existing.team),
          lane: existing.lane,
          priority: existing.priority,
          owner: existing.owner,
        },
        after: {
          scope: nextRow.team,
          lane: nextRow.lane,
          priority: nextRow.priority,
          owner: nextRow.owner,
        },
      },
    })

    return mapBacklogRow(result.rows[0])
  })
}

export async function createDecision(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'decisions', 'DEC')
    const supersedesIds = normalizeDecisionIdList(input.supersedesIds, id)
    const participantNames = normalizeStringList(input.participantNames)
    const result = await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
          classified_at, classified_by, supersedes_ids
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
        RETURNING *
      `,
      [
        id,
        input.category,
        input.title,
        input.summary,
        input.rationale ?? null,
        input.sourceRef ?? null,
        input.decisionOwner ?? null,
        input.confirmedBy ?? null,
        participantNames,
        input.contextRef ?? null,
        input.evidenceNotes ?? null,
        actor,
        supersedesIds,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary: `Proposed decision ${id}: ${input.title}`,
      metadata: {
        category: input.category,
        supersedesIds,
        decisionOwner: input.decisionOwner ?? null,
        confirmedBy: input.confirmedBy ?? null,
        participantNames,
        contextRef: input.contextRef ?? null,
      },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function updateDecision(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM decisions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Decision not found: ${id}`)

    const nextCategory = input.category ?? existing.category
    const nextStatus = input.status ?? existing.status
    const nextSupersedesIds = normalizeDecisionIdList(input.supersedesIds ?? existing.supersedes_ids ?? [], id)
    const hasDecisionOwner = Object.prototype.hasOwnProperty.call(input, 'decisionOwner')
    const hasConfirmedBy = Object.prototype.hasOwnProperty.call(input, 'confirmedBy')
    const hasParticipantNames = Object.prototype.hasOwnProperty.call(input, 'participantNames')
    const hasContextRef = Object.prototype.hasOwnProperty.call(input, 'contextRef')
    const hasEvidenceNotes = Object.prototype.hasOwnProperty.call(input, 'evidenceNotes')
    const nextDecisionOwner = hasDecisionOwner ? (input.decisionOwner ?? null) : (existing.decision_owner ?? null)
    const nextConfirmedBy = hasConfirmedBy ? (input.confirmedBy ?? null) : (existing.confirmed_by ?? null)
    const nextParticipantNames = hasParticipantNames
      ? normalizeStringList(input.participantNames)
      : normalizeStringList(existing.participant_names)
    const nextContextRef = hasContextRef ? (input.contextRef ?? null) : (existing.context_ref ?? null)
    const nextEvidenceNotes = hasEvidenceNotes ? (input.evidenceNotes ?? null) : (existing.evidence_notes ?? null)

    const result = await client.query(
      `
        UPDATE decisions
        SET category = $2,
            status = $3,
            rationale = CASE WHEN $4 THEN $5 ELSE rationale END,
            source_ref = CASE WHEN $6 THEN $7 ELSE source_ref END,
            classified_at = CASE WHEN $2 IS DISTINCT FROM category THEN NOW() ELSE classified_at END,
            classified_by = CASE WHEN $2 IS DISTINCT FROM category THEN $8 ELSE classified_by END,
            supersedes_ids = $9,
            decision_owner = $10,
            confirmed_by = $11,
            participant_names = $12,
            context_ref = $13,
            evidence_notes = $14,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextCategory,
        nextStatus,
        Object.prototype.hasOwnProperty.call(input, 'rationale'),
        input.rationale ?? null,
        Object.prototype.hasOwnProperty.call(input, 'sourceRef'),
        input.sourceRef ?? null,
        actor,
        nextSupersedesIds,
        nextDecisionOwner,
        nextConfirmedBy,
        nextParticipantNames,
        nextContextRef,
        nextEvidenceNotes,
      ]
    )

    const shouldApplySupersedes = (nextStatus === 'locked' || existing.status === 'locked') && nextSupersedesIds.length
    const appliedSupersedesIds = shouldApplySupersedes
      ? await markSupersededDecisions(client, nextSupersedesIds, id, actor)
      : []

    let eventType = 'decision_classified'
    let summary = `Updated decision ${id}`

    if (existing.status !== nextStatus && nextStatus === 'locked') {
      eventType = 'decision_locked'
      summary = `Locked decision ${id}`
    } else if (existing.status !== nextStatus && nextStatus === 'superseded') {
      eventType = 'decision_superseded'
      summary = `Superseded decision ${id}`
    } else if (existing.category !== nextCategory) {
      eventType = 'decision_classified'
      summary = `Reclassified decision ${id} as ${nextCategory}`
    }

    if (appliedSupersedesIds.length) {
      summary += ` · supersedes ${appliedSupersedesIds.join(', ')}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: {
          category: existing.category,
          status: existing.status,
          supersedesIds: existing.supersedes_ids || [],
          decisionOwner: existing.decision_owner ?? null,
          confirmedBy: existing.confirmed_by ?? null,
          participantNames: existing.participant_names || [],
          contextRef: existing.context_ref ?? null,
        },
        after: {
          category: nextCategory,
          status: nextStatus,
          supersedesIds: nextSupersedesIds,
          decisionOwner: nextDecisionOwner,
          confirmedBy: nextConfirmedBy,
          participantNames: nextParticipantNames,
          contextRef: nextContextRef,
        },
      },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function createOpenQuestion(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'open_questions', 'Q')
    const result = await client.query(
      `
        INSERT INTO open_questions (
          id, title, summary, owner, status
        )
        VALUES ($1,$2,$3,$4,'open')
        RETURNING *
      `,
      [id, input.title, input.summary, input.owner ?? null]
    )

    await insertChangeEvent(client, {
      eventType: 'question_created',
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary: `Opened question ${id}: ${input.title}`,
      metadata: {},
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function updateOpenQuestion(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM open_questions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Open question not found: ${id}`)

    const nextStatus = input.status ?? existing.status ?? 'open'
    const resolving = existing.status !== 'resolved' && nextStatus === 'resolved'
    const reopening = existing.status === 'resolved' && nextStatus === 'open'

    const result = await client.query(
      `
        UPDATE open_questions
        SET title = COALESCE($2, title),
            summary = COALESCE($3, summary),
            owner = COALESCE($4, owner),
            status = $5,
            resolved_at = CASE
              WHEN $5 = 'resolved' AND resolved_at IS NULL THEN NOW()
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_at
            END,
            resolved_by = CASE
              WHEN $5 = 'resolved' AND resolved_by IS NULL THEN $6
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_by
            END,
            resolution_note = CASE
              WHEN $5 = 'resolved' THEN COALESCE($7, resolution_note)
              WHEN $5 = 'open' THEN NULL
              ELSE resolution_note
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, input.title ?? null, input.summary ?? null, input.owner ?? null, nextStatus, actor, input.resolutionNote ?? null]
    )

    let eventType = 'question_updated'
    let summary = `Updated question ${id}`
    if (resolving) {
      eventType = 'question_resolved'
      summary = `Resolved question ${id}`
    } else if (reopening) {
      eventType = 'question_reopened'
      summary = `Reopened question ${id}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: { status: existing.status || 'open', owner: existing.owner },
        after: { status: nextStatus, owner: input.owner ?? existing.owner },
      },
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function listPendingDocUpdates() {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
             d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
             d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
             d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
             p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      ORDER BY p.proposed_at DESC
    `
  )

  return result.rows.map(mapPendingDocUpdateRow)
}

export async function getPendingDocUpdate(id) {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
             d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
             d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
             d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
             p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      WHERE p.id = $1
    `,
    [id]
  )

  return result.rows[0] ? mapPendingDocUpdateRow(result.rows[0]) : null
}

export async function createPendingDocUpdate(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'pending_doc_updates', 'DU')
    const result = await client.query(
      `
        INSERT INTO pending_doc_updates (
          id, decision_id, target_doc_path, target_section, summary,
          current_text, proposed_text, proposed_diff, proposed_by, expires_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW() + INTERVAL '72 hours',$10::jsonb)
        RETURNING *
      `,
      [
        id,
        input.decisionId ?? null,
        input.targetDocPath,
        input.targetSection ?? null,
        input.summary,
        input.currentText ?? null,
        input.proposedText,
        input.proposedDiff ?? null,
        actor,
        JSON.stringify(input.metadata || {}),
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'doc_update_proposed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Proposed doc update ${id} for ${input.targetDocPath}`,
      metadata: {
        decisionId: input.decisionId ?? null,
        targetDocPath: input.targetDocPath,
        targetSection: input.targetSection ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function approvePendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_approved',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Approved doc update ${id}`,
      metadata: {
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function rejectPendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = $2
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_rejected',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Rejected doc update ${id}`,
      metadata: {
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateFailed(id, metadata, actor = 'system') {
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'failed',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, JSON.stringify(metadata || {})]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_failed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Doc update ${id} failed during apply`,
      metadata: {
        ...(metadata || {}),
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateApplied(id, appliedCommit, actor = 'system') {
  return withFoundationTransaction(async client => {
    const pendingResult = await client.query(`SELECT * FROM pending_doc_updates WHERE id = $1`, [id])
    const pending = pendingResult.rows[0]
    if (!pending) throw new Error(`Pending doc update not found: ${id}`)

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'applied',
            reviewed_at = COALESCE(reviewed_at, NOW()),
            reviewed_by = COALESCE(reviewed_by, $2),
            applied_at = NOW(),
            applied_commit = $3,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, appliedCommit]
    )

    if (pending.decision_id) {
      await client.query(
        `
          UPDATE decisions
          SET status = CASE WHEN status = 'proposed' THEN 'locked' ELSE status END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [pending.decision_id]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_locked',
        entityTable: 'decisions',
        entityId: pending.decision_id,
        actor,
        summary: `Locked decision ${pending.decision_id}`,
        metadata: { docUpdateId: id },
      })
    }

    await insertChangeEvent(client, {
      eventType: 'doc_update_applied',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Applied doc update ${id}`,
      metadata: {
        appliedCommit,
        decisionId: pending.decision_id ?? null,
        targetDocPath: pending.target_doc_path,
        targetSection: pending.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function getDocSourceSnapshot(docPath) {
  if (docPath === BHAG_DOC_PATH) {
    try {
      return await getLiveBhagSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored BHAG snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (docPath === AGENT_ENGINE_DOC_PATH) {
    try {
      return await getLiveAgentEngineSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored Agent Engine snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const result = await pool.query(
    `
      SELECT doc_path AS "docPath", source_id AS "sourceId", group_title AS "groupTitle",
             label, value, detail, as_of AS "asOf", sort_order AS "sortOrder"
      FROM doc_source_snapshots
      WHERE doc_path = $1
      ORDER BY group_title ASC, sort_order ASC, created_at ASC
    `,
    [docPath]
  )

  return result.rows
}

export async function listFubLeadSourceRules() {
  const result = await pool.query(
    `
      SELECT source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
      FROM fub_lead_source_rules
      ORDER BY source_name ASC
    `
  )

  return result.rows.map(mapFubLeadSourceRuleRow)
}

export async function getFubLeadSourceSnapshot(contextKey) {
  const result = await pool.query(
    `
      SELECT context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
             truncated, refreshed_at, refreshed_by
      FROM fub_lead_source_snapshots
      WHERE context_key = $1
      LIMIT 1
    `,
    [contextKey]
  )

  if (!result.rows.length) return null
  return mapFubLeadSourceSnapshotRow(result.rows[0])
}

export async function upsertFubLeadSourceRule(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const source = String(input.source || '').trim()
    if (!source) throw new Error('Lead source is required.')

    const marketingType = String(input.marketingType || 'unclassified').trim() || 'unclassified'
    const ownershipType = String(input.ownershipType || 'unclassified').trim() || 'unclassified'
    const flagState = String(input.flagState || 'none').trim() || 'none'
    const sourceGroup = input.sourceGroup == null ? null : String(input.sourceGroup).trim() || null
    const notes = input.notes == null ? null : String(input.notes).trim() || null

    const result = await client.query(
      `
        INSERT INTO fub_lead_source_rules (
          source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
        ON CONFLICT (source_name) DO UPDATE SET
          marketing_type = EXCLUDED.marketing_type,
          ownership_type = EXCLUDED.ownership_type,
          flag_state = EXCLUDED.flag_state,
          source_group = EXCLUDED.source_group,
          notes = EXCLUDED.notes,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
      `,
      [source, marketingType, ownershipType, flagState, sourceGroup, notes, actor]
    )

    return mapFubLeadSourceRuleRow(result.rows[0])
  })
}

export async function saveFubLeadSourceSnapshot(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const contextKey = String(input.contextKey || '').trim()
    const contextLabel = String(input.contextLabel || '').trim()
    if (!contextKey) throw new Error('FUB lead-source snapshot context key is required.')
    if (!contextLabel) throw new Error('FUB lead-source snapshot context label is required.')

    const sources = Array.isArray(input.sources)
      ? input.sources
          .map(function(item) {
            var source = String(item && item.source || '').trim()
            if (!source) return null
            return {
              source,
              count: Math.max(0, Number(item.count) || 0),
            }
          })
          .filter(Boolean)
      : []

    const scan = input.scan || {}
    const result = await client.query(
      `
        INSERT INTO fub_lead_source_snapshots (
          context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
          truncated, refreshed_at, refreshed_by
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, NOW(), $8)
        ON CONFLICT (context_key) DO UPDATE SET
          context_label = EXCLUDED.context_label,
          payload = EXCLUDED.payload,
          unique_sources = EXCLUDED.unique_sources,
          people_scanned = EXCLUDED.people_scanned,
          pages_scanned = EXCLUDED.pages_scanned,
          truncated = EXCLUDED.truncated,
          refreshed_at = NOW(),
          refreshed_by = EXCLUDED.refreshed_by
        RETURNING context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
                  truncated, refreshed_at, refreshed_by
      `,
      [
        contextKey,
        contextLabel,
        JSON.stringify(sources),
        Math.max(0, Number(scan.uniqueSources) || sources.length),
        Math.max(0, Number(scan.peopleScanned) || 0),
        Math.max(0, Number(scan.pagesScanned) || 0),
        Boolean(scan.truncated),
        actor,
      ]
    )

    return mapFubLeadSourceSnapshotRow(result.rows[0])
  })
}

export async function closeFoundationDb() {
  await pool.end()
}
