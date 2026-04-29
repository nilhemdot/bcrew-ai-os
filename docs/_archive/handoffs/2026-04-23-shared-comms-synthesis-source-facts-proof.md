# Benson Crew Shared Comms Synthesis

Generated: 2026-04-24T03:12:59.008Z
Model: gpt-5.4
Candidates read: 180

## Executive Summary

Top live signals cluster into four areas: (1) system reliability is degrading, with multiple assistants/intel jobs near or at auto-pause and one ops brief explicitly flagged as stale; (2) KPI and reporting trust is impaired by a live dashboard/rendering outage plus persistent lead-source/FUB attribution drift; (3) finance and cash controls still need leadership attention, including weak reconciliation and unresolved commission-normalization boundaries; and (4) marketing/social tooling is unstable, with recurring SocialPilot disconnects/errors and API access gated behind Enterprise enablement. Strategic context matters: source-backed facts show the team is already behind 2026 pace on both community growth (-25 agents, -3.6%) and team volume (-$41.79M, -48.7%), so data-trust and operating-system issues are more decision-relevant than isolated tactical noise.

## Ranked Live Intelligence

### 1. Automation and intelligence layer is degrading, with one scout already paused and several others near auto-pause

- Type: blocker
- Status: active
- Owner: Steve + foundation/dev owner
- Confidence: 98%
- Sensitivity: performance_concern
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:cf741e69-24db-45b5-94b6-0e4e07833a00:blocker:0a2d7bbd0b006503, SRC-MISSIVE-001:83b8a51c-aaed-4c9d-ae81-a1bb8c07a31d:blocker:dbfc49ca574f9938, SRC-MISSIVE-001:fc6b817e-70f6-43f4-baf5-91ab4ab8e2cb:blocker:fc59e066f1533e83, SRC-GMAIL-001:19dbb4651f7b257e:blocker:d5fa1cc785f46106, SRC-MISSIVE-001:8f4c7d5d-de23-439f-99a3-89ff15bf8560:blocker:6532b66fac0a18c6, SRC-MISSIVE-001:5e683593-ea69-4f7b-a5c7-15a568981ca8:blocker:62ec0719f4f9f7eb, SRC-MISSIVE-001:11b2e89d-61f1-44ab-a47b-9a6ed4f90c1c:blocker:f773cea3b87467bf, SRC-MISSIVE-001:3d24da00-44ab-44c9-bf04-95b637a225fa:blocker:888d09e442f34df3, SRC-MISSIVE-001:a24ca7fa-8a74-4f33-9780-3e819f495dfd:blocker:80b819ac55462e57, SRC-MISSIVE-001:e2b7f540-b3f2-4678-8068-1908582d30d4:blocker:7ade9fa660521d40

Multiple assistants, monitors, and intelligence jobs are failing repeatedly, threatening shared-comms, ops, sales, and marketing visibility.

Why it matters: This is now a system-health issue, not a single broken task. It directly weakens the team’s operating visibility at a moment when source-backed KPI facts already show the business behind plan. It also aligns with backlog priorities around SOURCE-019, SOURCE-020, COMMS-BACKFILL-001, and the first trusted assistant loop.

Recommended next action: Open a same-day reliability triage: unpause the paused scout only after root-cause review, rank the failing jobs by business criticality, and assign recovery owners with a 24-hour status update.

Evidence summary: Missive alerts show Internal Scout: Market & Deals paused after 5 failures, plus Ops Director of Intelligence, Sales Director of Intelligence, email-intel-weekly, Ops Signal Monitor, bcrew-process-enforcer, Marketing Scoper, SEO Strategist, and others at 3–4 consecutive failures and nearing auto-pause.

### 2. Current ops and marketing briefs from the old/stale system should not be trusted for execution

- Type: source_trust_issue
- Status: active
- Owner: Foundation / system owner
- Confidence: 97%
- Sensitivity: neutral
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001
- Candidate keys: SRC-GMAIL-001:19dbb45bd77f1e8c:blocker:e8c72fb8fad97c96, SRC-GMAIL-001:19dbb45a7e71a8ea:blocker:3e0cbe462f212029, SRC-MISSIVE-001:2fab933b-5615-4551-8995-3337f287f796:blocker:ca46940b48de1f05, SRC-MISSIVE-001:b217104d-247f-433c-9e28-09db3353b05b:decision_candidate:be7a1d25a758209b, SRC-MISSIVE-001:69acf8f2-fadb-44c9-8977-fd837d8c7468:decision_candidate:1d8af509752c0c1e

Leadership explicitly said to ignore surfaced old-system briefs, and one ops brief admitted it was based on stale data.

Why it matters: This is a source-trust boundary problem. If teams act on deprecated or stale brief output, leadership will make decisions off the wrong operating picture. This also validates the importance of source-backed facts and trust-lock backlog work.

Recommended next action: Mark old-system brief channels as deprecated in the visible source layer, suppress their outputs from operational inboxes, and require current-system provenance on any automated brief before distribution.

Evidence summary: A distributed ops brief explicitly stated the ops intelligence pipeline was running on stale data and key questions could not be answered without fresh scout runs. Steve separately instructed teams to ignore both the operations brief and a surfaced marketing brief because the old system had 'come alive somehow.'

### 3. KPI dashboards are showing missing deal data across pages despite source data appearing intact

- Type: blocker
- Status: active
- Owner: Aidan / dev owner
- Confidence: 97%
- Sensitivity: performance_concern
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001
- Candidate keys: SRC-GMAIL-001:blake.berfelz@bensoncrew.ca:19dbc4edf1368b4d:blocker:f8a9021ee48541d6, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbc4eda29726f5:blocker:33f748b71ab77bfc, SRC-MISSIVE-001:91887841-f05e-4a88-950b-16a65327ff8f:blocker:741c26f4d0641f59

The KPI surface appears broken or unsynced, undermining trust in deal, performance, and agent dashboards.

Why it matters: When the dashboard layer is wrong, managers lose trust in coaching, finance, and performance reads. This is especially important because source-backed facts already show the team behind 2026 volume pace, so leadership needs trustworthy execution reporting now.

Recommended next action: Treat this as a sev-1 reporting incident: compare frontend/render layer, spreadsheet/sync path, and recent deploy/config changes against Supabase truth; publish ETA and workaround to leadership.

Evidence summary: Steve reported all deal data looked gone from the KPI system, affecting all pages including company financial views, MQY/performance, and agent deal dashboards. Aidan replied that Supabase data still looked good, pointing to a presentation, sync, or downstream issue rather than source-data loss.

### 4. Lead-source attribution and FUB lineage remain a live data-quality bottleneck

- Type: strategic_issue
- Status: active
- Owner: Carson + Steve + Ops data owner
- Confidence: 96%
- Sensitivity: performance_concern
- Sources: SRC-MEETINGS-001, SRC-MISSIVE-001
- Candidate keys: SRC-MEETINGS-001:meeting:sales leadership meeting 2026 04 14 10 28 edt:meeting_transcript:blocker:f820b8e6d704ef9b, SRC-MEETINGS-001:meeting:operations weekly meeting 2026 04 15 08 58 edt:meeting_transcript:decision_candidate:210d223b0aa9dcf9, SRC-MISSIVE-001:b900c2d5-37a4-49e6-8902-e7ea33b8f0a7:blocker:49624bcc263d73a5, SRC-MISSIVE-001:bd8a9798-cedb-40d0-8240-e23cd88d9b92:blocker:028f23e7e902f798

Unknown or drifting lead sources are still large enough to affect reporting, attribution, and operations decisions.

Why it matters: This is directly validated by source-backed operating facts and recent drift detection. It impacts company-versus-agent credit, ISA attribution, source ROI, and coaching. With 2026 volume behind plan, poor attribution blocks better decision-making on where growth is actually coming from.

Recommended next action: Escalate DATA-005/DATA-007/DATA-008 as one governed cleanup sprint: clear unknown/invalid recent rows first, stabilize FUB taxonomy/drift review, and lock the Owners↔FUB join rules before broader reporting use.

Evidence summary: Sales leadership said 41 deals and $18M in volume have unknown lead sources since January. Ops later agreed attribution should be validated by actual origin, not just what FUB currently shows. Source-backed facts reinforce this with recent FUB source drift detection and an open governed Owners review queue.

### 5. Finance reconciliation is still weak, and the commission-normalization boundary remains unsettled

- Type: strategic_issue
- Status: needs_decision
- Owner: Ahsan + Steve
- Confidence: 93%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:budget review 2026 04 23 09 27 edt:meeting_transcript:blocker:884da3464f695b4c, SRC-MEETINGS-001:meeting:budget review 2026 04 23 09 27 edt:meeting_transcript:decision_candidate:35a8f97e63020d0c

Weekly actuals, status reports, and commission handling are not reconciling tightly enough for trusted finance reads.

Why it matters: This maps directly to open question Q-003 and backlog items FOUNDATION-003 and FINANCE-001. Without a canonical normalization rule, leadership risks making cash and profitability decisions off inconsistent views.

Recommended next action: Run a finance sign-off session on Weekly Actuals, monthly rollups, and Cashflow Dash to settle where partner/referral commission normalization lives and what report is canonical for operating decisions.

Evidence summary: In budget review, Steve called out recurring mismatches between expected collections, weekly actuals, and status-based commission income, citing deal-level and report-level variances. The same meeting settled that referral fees should be represented in the monthly budget as offsetting expense entries, but the broader finance normalization boundary is still open in source-backed questions/backlog.

### 6. Cash position remains a leadership risk, with historical warnings still unrebutted by current source-backed pace

- Type: strategic_issue
- Status: stale_watch
- Owner: Steve + Finance
- Confidence: 84%
- Sensitivity: performance_concern
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:weekly owners meeting 2026 04 10 12 58 edt:meeting_transcript:blocker:3e99f6da2c19e62f

Recent meetings showed cash pressure, and current volume pace remains materially behind target.

Why it matters: The most explicit cash-gap discussion is older, but it has not been clearly countered by source-backed performance facts. Current executed volume is still behind plan by $41.79M (-48.7%), so cash stress should remain on the watchlist until finance says otherwise.

Recommended next action: Ask finance to publish a fresh 6-week cash outlook tied to executed/firm pipeline and explicitly mark whether the earlier May payroll-risk discussion is resolved or still live.

Evidence summary: On April 10, Steve said May could begin with limited cash and payroll might need adjustment absent more closings or cash injection. Source-backed operating facts show executed 2026 team volume at $43.95M YTD, behind pace by $41.79M (-48.7%), which increases the relevance of unresolved cash concerns.

### 7. SocialPilot instability is actively disrupting publishing, and integration access is gated

- Type: blocker
- Status: active
- Owner: Tanner
- Confidence: 96%
- Sensitivity: neutral
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001, SRC-MEETINGS-001
- Candidate keys: SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19dbad0a3ff81e78:blocker:08a7d3e4884dbcd8, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19dbc0a63377c5a1:blocker:9bd121f562869ec2, SRC-MISSIVE-001:d0af155c-e1e6-4595-bbd1-c4050efbc7d4:blocker:cb9c12c8b83beb6c, SRC-MISSIVE-001:bb787be8-4a5f-4ee1-a164-0b538435eaa4:blocker:b8f3bd37da94bafa, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19cd7d54ab03f90e:blocker:447514a0f584f06d, SRC-MISSIVE-001:6dcb4edf-5f74-4feb-a573-51834e5ec4dd:blocker:901736a010793784, SRC-MEETINGS-001:meeting:tanner steve georgia report out and plan next week 2026 04 17 10 13 edt:meeting_transcript:blocker:25a84c9f40c9c65b

Posts are erroring, accounts are disconnecting, and API access still depends on Enterprise enablement/auth clarification.

Why it matters: This is now multi-source and recurring, not a one-off vendor email. It blocks social publishing reliability and any deeper integration work. It also aligns with the known source gap for the social publishing platform.

Recommended next action: Assign one owner to do a full SocialPilot stabilization pass: confirm current connected accounts, clear failed posts, verify whether deleted accounts were intentional, and decide whether to upgrade/enable Enterprise API now or stop dependent integration work.

Evidence summary: Fresh Gmail and Missive alerts show failed posts, disconnected accounts, and deleted accounts needing review. A live vendor thread says API details require full Enterprise enablement, while another asks to confirm the exact authentication flow for the Enterprise account. Meeting evidence shows recurring Facebook/Instagram disconnect friction that Georgia has been fixing manually.

### 8. Keep the Pattison/Aldershot billboard running with new Benson Crew creative

- Type: decision
- Status: new
- Owner: Steve + Tanner
- Confidence: 97%
- Sensitivity: positive
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:5d5cbc6b-d590-4467-9fd3-d5b73a0e6573:decision_candidate:cc108debbde986be, SRC-GMAIL-001:scottb@bensoncrew.ca:19d40bde7377f6c9:decision_candidate:7992db6ba21a40e7, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19d3f4f0c2a4503f:decision_candidate:58058dac3f016910

Leadership has already decided to keep the billboard placement and proceed with contract/signature follow-through.

Why it matters: This is a clear, recent decision with financial and marketing execution implications. It is worth surfacing because the remaining work is operational follow-through, not more debate.

Recommended next action: Send/execute the renewal contract and confirm creative/timing ownership so the April 27 booking window does not become a last-minute scramble.

Evidence summary: Scott and Steve explicitly confirmed they want to keep the billboard, continue with Benson Crew creative, and requested the contract. A related vendor note said the location must be locked by April 27 or other advertisers can book it.

### 9. Leadership is raising the qualification bar for agents entering or staying in the system

- Type: decision
- Status: needs_owner
- Owner: Nick Bergmann + sales leadership
- Confidence: 92%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:sales leadership meeting 2026 04 21 10 30 edt:meeting_transcript:decision_candidate:f2582d422ed3c917, SRC-MEETINGS-001:meeting:carson nick onboarding discussion 2026 03 04 13 30 est:meeting_transcript:blocker:9b36001bdd02429e, SRC-MEETINGS-001:meeting:carson nick onboarding discussion 2026 03 04 13 30 est:meeting_transcript:blocker:4b4746d6a26053cf

Sales leadership agreed to stop over-accommodating low-effort agents and reconsider brand-new-agent onboarding/mentorship standards.

Why it matters: This is a strategic operating shift that affects recruiting, onboarding, mentorship load, and future retention standards. It also matches a long-running pattern from meetings that onboarding capacity is overloaded and leadership time is being drained.

Recommended next action: Turn the verbal shift into explicit criteria: define minimum standards for entry, mentorship eligibility, probation, and removal from special support paths.

Evidence summary: On April 21 sales leadership agreed they need to stop catering to agents not putting in effort and to rethink onboarding/mentorship standards. This is reinforced by earlier March discussions that leadership lacks time to mentor low-skill recruits and Carson cannot keep absorbing long in-person onboarding for every new agent.

### 10. Lead-source truth should come from validated origin, not blindly from current CRM labels

- Type: decision
- Status: new
- Owner: Carson + Ops
- Confidence: 95%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:operations weekly meeting 2026 04 15 08 58 edt:meeting_transcript:decision_candidate:210d223b0aa9dcf9

Ops decided attribution must be checked against how the agent actually met the client when FUB labels are misleading.

Why it matters: This is an important rule decision because it should drive the cleanup method for Owners/FUB attribution, not just one-off corrections. It strengthens the data-governance path already in backlog.

Recommended next action: Document this as an explicit temporary attribution rule in the source contract and use it to govern current review-queue cleanup until canonical FUB lineage rules are locked.

Evidence summary: Ops agreed they need to reach out to agents to verify true origin because CRM values like branded website or Home Value Hub can misstate how the client actually entered the system.

### 11. Loom access/billing needs cleanup after migration issues and an active trial deadline

- Type: action_item
- Status: needs_owner
- Owner: Clare
- Confidence: 91%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:34a89c3b-722a-4e77-9078-9ba5b12f9b20:blocker:47a7ca7a3acd20ed, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbc8ffd856a1e8:blocker:ebb1b70debb953dc

Account access appears degraded post-migration, and billing must be added by May 7 to avoid fallback to Free.

Why it matters: This is a smaller issue than core system trust, but it is recent, concrete, and has a clear deadline. If unresolved, video access or capture continuity may degrade further.

Recommended next action: Confirm which Loom accounts still work after migration, ensure Steve has admin fallback access, and decide whether to add billing before the May 7 deadline.

Evidence summary: Clare reported Atlassian migration issues seem to have broken Loom accounts and escalated to support, while a separate Gmail alert says Steve’s Loom Business + AI trial ends May 7 unless payment details are added.

### 12. Bruce Maxwell was approved for the 90-10 split / agreed-clients list

- Type: decision
- Status: likely_resolved
- Owner: Clare
- Confidence: 98%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:52b11c6a-b9ef-4b03-acfe-d27ee5a9892a:decision_candidate:e5c25e7ee346aafc, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbbf43c56f3e16:decision_candidate:11fafa5c01530f4e

This approval is explicit and should be treated as settled unless database follow-through is missing.

Why it matters: It is a clear, recent decision that may matter for compensation/admin execution, but it appears straightforward and likely already moving to implementation.

Recommended next action: Verify the database/list update was actually applied; no further leadership attention needed unless there is a discrepancy.

Evidence summary: Both Gmail and Missive versions of the thread state Steve approved Bruce Maxwell for the agreed-client / 90-10 split list and Clare said it would be noted in the database.

## Source Coverage

- SRC-GMAIL-001: 24 read. Useful for fresh vendor alerts, KPI outage confirmation, and old-system/source-trust problems. Caveat: Mailbox is readable but not signed off; email alerts can overstate severity without workflow context.
- SRC-MISSIVE-001: 37 read. Strong for repeated task-failure alerts, external vendor threads, and operational routing issues. Caveat: Readable but not signed off; some alerts are machine-generated and need dedupe.
- SRC-SLACK-001: 11 read. Useful for frontline ops friction and access issues. Caveat: Limited selected coverage; single-message blockers can be situational and low durability.
- SRC-MEETINGS-001: 108 read. Primary source for multi-party decisions, persistent bottlenecks, and leadership context. Caveat: Meeting notes/transcripts are readable but not signed off; Zoom chat artifacts are partial historical context, not authoritative full transcripts.

## Suppressed Patterns

- Routine vendor alert duplicates for the same SocialPilot post error/reconnection event sent to multiple inboxes were deduped into one operational issue.: Same underlying event repeated across recipients; not useful as separate findings.
- Single-message Slack micro-blockers about drafts, field choices, or screenshots.: Too tactical and weakly durable unless repeated or tied to a larger source-trust issue.
- Older one-off meeting blockers from January-February without fresh recurrence.: Kept out unless they clearly reinforce an active strategic pattern; otherwise treated as historical noise.
- Sensitive historical chat artifact containing a secret-like string.: Not repeated verbatim or exposed; only relevant as prior security context already covered by source-backed backlog SECURITY-001.
- Personal availability notes and isolated attendance interruptions.: Low strategic value and not decision-relevant.

## Open Questions

- Which failing automation jobs are business-critical enough to restore first, and which should stay paused until the trusted assistant loop is defined? Why it matters: Without prioritization, the team may waste effort reviving low-value automations while core visibility remains broken.
- What is the canonical finance truth for leadership decisions right now: Weekly Actuals, monthly budget, Cashflow Dash, or a governed combination? Why it matters: The reconciliation problem is active, and leadership needs one answer before using finance numbers for decisions.
- Has the KPI dashboard outage been fixed, or is leadership still operating with broken render/sync layers? Why it matters: If unresolved, any dashboard-driven performance discussion is suspect.
- Should Benson Crew proceed with the SocialPilot Enterprise/API path now, or treat social publishing as a stabilized manual/vendor-managed lane until the foundation is locked? Why it matters: This is both a tooling-cost decision and a dependency decision for marketing automation work.
- Is the April 10 cash-risk conversation now resolved by newer closings, or does finance still see a May liquidity problem? Why it matters: Current pace facts keep the concern relevant, but leadership needs a fresh answer rather than relying on old discussion.
