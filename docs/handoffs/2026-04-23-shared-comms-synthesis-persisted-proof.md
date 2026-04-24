# Benson Crew Shared Comms Synthesis

Generated: 2026-04-24T03:09:30.952Z
Model: gpt-5.4
Candidates read: 180

## Executive Summary

Top live issues cluster around three areas: (1) system reliability and source trust in the internal intelligence/automation stack, with one scout already paused and several others near auto-pause; (2) KPI/reporting integrity, with missing deal data across KPI surfaces despite source data appearing intact; and (3) marketing/social operations instability, including recurring SocialPilot disconnects/errors and an API path gated by Enterprise enablement. There are also a few fresh decisions worth locking in operationally, especially billboard continuation and lead-source attribution handling. Older meeting-derived issues were only included where they appear strategically important and plausibly still unresolved; Zoom-chat style artifacts were treated as partial context only.

## Ranked Live Intelligence

### 1. Internal intelligence/monitoring stack is degrading; one scout is already paused and several key jobs are near auto-pause

- Type: blocker
- Status: active
- Owner: Steve / system owner
- Confidence: 98%
- Sensitivity: performance_concern
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:cf741e69-24db-45b5-94b6-0e4e07833a00:blocker:0a2d7bbd0b006503, SRC-MISSIVE-001:83b8a51c-aaed-4c9d-ae81-a1bb8c07a31d:blocker:dbfc49ca574f9938, SRC-GMAIL-001:19dbb4651f7b257e:blocker:d5fa1cc785f46106, SRC-MISSIVE-001:8f4c7d5d-de23-439f-99a3-89ff15bf8560:blocker:6532b66fac0a18c6, SRC-MISSIVE-001:e2b7f540-b3f2-4678-8068-1908582d30d4:blocker:7ade9fa660521d40, SRC-MISSIVE-001:a24ca7fa-8a74-4f33-9780-3e819f495dfd:blocker:80b819ac55462e57, SRC-MISSIVE-001:11b2e89d-61f1-44ab-a47b-9a6ed4f90c1c:blocker:f773cea3b87467bf, SRC-MISSIVE-001:5e683593-ea69-4f7b-a5c7-15a568981ca8:blocker:62ec0719f4f9f7eb

A cluster of AI/monitoring workflows is failing repeatedly, creating an active risk of blind spots in ops, sales, marketing, and internal reporting.

Why it matters: This is a meta-risk: if the scouts and directors keep failing, leadership loses visibility just when the business is relying on automated briefs and monitoring to catch issues early.

Recommended next action: Triage the failing jobs as a single incident: restore the paused scout first, then stabilize the 4-failure jobs, then the 3-failure jobs; publish one owner and ETA list.

Evidence summary: Missive shows repeated failures across Internal Scout: Market & Deals (already paused), Ops Director of Intelligence, Sales Director of Intelligence, SEO Strategist, bcrew-deal-analyst, Internal Scout: Slack & Team Culture, and process-enforcer. Gmail separately confirms email-intel-weekly is at 4 consecutive failures. There is also an explicit stale-data warning in the ops brief.

### 2. Current brief outputs are not fully trustworthy because old-system messages resurfaced and ops intelligence was explicitly stale

- Type: source_trust_issue
- Status: active
- Owner: Steve / system owner
- Confidence: 97%
- Sensitivity: neutral
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001
- Candidate keys: SRC-GMAIL-001:19dbb45bd77f1e8c:blocker:e8c72fb8fad97c96, SRC-GMAIL-001:19dbb45a7e71a8ea:blocker:3e0cbe462f212029, SRC-MISSIVE-001:2fab933b-5615-4551-8995-3337f287f796:blocker:ca46940b48de1f05, SRC-MISSIVE-001:b217104d-247f-433c-9e28-09db3353b05b:decision_candidate:be7a1d25a758209b, SRC-MISSIVE-001:69acf8f2-fadb-44c9-8977-fd837d8c7468:decision_candidate:1d8af509752c0c1e

Leadership was told to ignore at least two surfaced briefs, and another brief explicitly said fresh ops status could not be assessed without reruns.

Why it matters: This undermines confidence in any downstream briefing or decision support and increases the odds of acting on obsolete or duplicated machine-generated output.

Recommended next action: Mark deprecated pipelines/senders as disabled at the source, then re-run fresh signed outputs for ops/marketing before using any brief operationally.

Evidence summary: Gmail says the ops intelligence pipeline is running on stale data and cannot answer current questions without fresh scout runs. Separate Gmail/Missive threads say old-system outputs surfaced unexpectedly, and Steve explicitly instructed recipients to ignore the operations and marketing brief threads.

### 3. KPI dashboards are showing missing deal data across pages even though source data appears intact

- Type: blocker
- Status: active
- Owner: Aidan Corcoran
- Confidence: 97%
- Sensitivity: performance_concern
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001
- Candidate keys: SRC-GMAIL-001:blake.berfelz@bensoncrew.ca:19dbc4edf1368b4d:blocker:f8a9021ee48541d6, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbc4eda29726f5:blocker:33f748b71ab77bfc, SRC-GMAIL-001:nick.bergmann@bensoncrew.ca:19dbc4edec42a4b9:blocker:0facc59673c8b6e1, SRC-MISSIVE-001:91887841-f05e-4a88-950b-16a65327ff8f:blocker:741c26f4d0641f59

Steve reported deal data missing across KPI views, while Aidan said Supabase still looks good, pointing to a sync/rendering layer issue rather than raw data loss.

Why it matters: This directly affects trust in management reporting, agent dashboards, and performance visibility. If leadership cannot trust KPI surfaces, decisions and coaching degrade quickly.

Recommended next action: Open an incident on the KPI presentation/sync layer, compare one known-missing deal end-to-end from Supabase to each affected page, and publish scope plus workaround.

Evidence summary: Both Gmail and Missive capture the same thread: Steve says all deal data appears gone across company financials, MQL/performance, and agent dashboards; Aidan says Supabase data still looks good, implying the issue is downstream of source storage.

### 4. SocialPilot publishing is unstable across accounts: disconnects, failed posts, and deleted accounts all hit within the same cycle

- Type: blocker
- Status: active
- Owner: Tanner Marsh with Georgia
- Confidence: 96%
- Sensitivity: neutral
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001, SRC-MEETINGS-001
- Candidate keys: SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19dbad0a3ff81e78:blocker:08a7d3e4884dbcd8, SRC-MISSIVE-001:bb787be8-4a5f-4ee1-a164-0b538435eaa4:blocker:b8f3bd37da94bafa, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19dbcca2906a4449:blocker:94e6304b95ecf220, SRC-GMAIL-001:georgia.huntley@bensoncrew.ca:19dbcca282b67424:blocker:fff304aaa634a414, SRC-GMAIL-001:ryanc@bensoncrew.ca:19dbcca109b9feff:blocker:2555b4356a4562ea, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbcc9cef9727d1:blocker:eaeaee6079078b03, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19dbc0a63377c5a1:blocker:9bd121f562869ec2, SRC-MISSIVE-001:d0af155c-e1e6-4595-bbd1-c4050efbc7d4:blocker:cb9c12c8b83beb6c, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbc0a626b1a7ad:blocker:6e559635ef149063, SRC-GMAIL-001:ryanc@bensoncrew.ca:19dbc0a6204fdc99:blocker:439d158b1caf26fe, SRC-GMAIL-001:georgia.huntley@bensoncrew.ca:19dbc0a635dd8a34:blocker:7fd430baec4ede56, SRC-MEETINGS-001:meeting:tanner steve georgia report out and plan next week 2026 04 17 10 13 edt:meeting_transcript:blocker:25a84c9f40c9c65b

Fresh alerts show account reconnection needs, failed post reviews, and deleted social accounts requiring verification, suggesting a broad social publishing reliability problem.

Why it matters: This can interrupt scheduled posting, reduce campaign reliability, and create hidden gaps in social execution across multiple team-managed accounts.

Recommended next action: Run a single SocialPilot audit today: identify all disconnected/deleted/erroring accounts, confirm intended ownership, reconnect what should be live, and verify next scheduled posts publish successfully.

Evidence summary: Fresh Gmail/Missive alerts show multiple failed posts and disconnected accounts affecting Steve, Tanner, Georgia, and Ryan. A Gmail alert also reports Georgia deleted two social accounts. Meeting context from Apr 17 says recurring Facebook/Instagram disconnects were already creating manual reconnection work.

### 5. SocialPilot API/integration path is blocked by vendor gating and unclear enterprise auth requirements

- Type: blocker
- Status: needs_decision
- Owner: Steve with Tanner
- Confidence: 95%
- Sensitivity: neutral
- Sources: SRC-GMAIL-001, SRC-MISSIVE-001
- Candidate keys: SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19cd7d54ab03f90e:blocker:447514a0f584f06d, SRC-MISSIVE-001:6dcb4edf-5f74-4feb-a573-51834e5ec4dd:blocker:901736a010793784

The team cannot complete the planned integration until Enterprise API access is enabled and the exact authentication flow is confirmed.

Why it matters: This blocks third-party integration work and may require a commercial decision, not just a technical one, if Enterprise upgrade/enablement is required.

Recommended next action: Confirm whether the account is already upgraded or still pending enablement, then get the vendor to document the exact auth flow and activation steps in one reply.

Evidence summary: Vendor email says API details can only be shared once full API access is enabled and requires Enterprise. A Missive thread says the team is starting Enterprise API integration but needs confirmation of the exact authentication flow for their account.

### 6. Billboard location is being kept; contract lock-in is the next step

- Type: decision
- Status: needs_owner
- Owner: Steve with Tanner
- Confidence: 96%
- Sensitivity: positive
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:5d5cbc6b-d590-4467-9fd3-d5b73a0e6573:decision_candidate:cc108debbde986be, SRC-GMAIL-001:scottb@bensoncrew.ca:19d40bde7377f6c9:decision_candidate:7992db6ba21a40e7, SRC-GMAIL-001:tanner.marsh@bensoncrew.ca:19d3f4f0c2a4503f:decision_candidate:58058dac3f016910

Leadership approved continuing the billboard placement with Benson Crew creative, but timing matters because the location must be locked in by April 27 or it can be booked by others.

Why it matters: This is a live approved marketing decision with an immediate execution deadline; dropping it now would create preventable media loss or renegotiation churn.

Recommended next action: Send/execute the contract and confirm creative/term details before April 27.

Evidence summary: Both Gmail and Missive capture explicit approval from Steve/Scott to keep the billboard. Gmail adds the timing constraint that right of first refusal expires April 27.

### 7. Lead-source data hygiene remains a material reporting problem despite a new attribution rule

- Type: strategic_issue
- Status: active
- Owner: Carson with sales leadership
- Confidence: 93%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:sales leadership meeting 2026 04 14 10 28 edt:meeting_transcript:blocker:f820b8e6d704ef9b, SRC-MEETINGS-001:meeting:operations weekly meeting 2026 04 15 08 58 edt:meeting_transcript:decision_candidate:210d223b0aa9dcf9

Leadership previously identified 41 deals / $18M with unknown lead sources, and ops has since decided source attribution should be validated with agents rather than trusting CRM defaults.

Why it matters: Lead-source accuracy affects spend allocation, coaching, ISA economics, and strategic planning. The newly agreed process is useful, but the backlog still appears material.

Recommended next action: Assign a cleanup sprint for unknown-source deals since January using the new validation rule, then update the source-of-truth process documentation.

Evidence summary: Apr 14 sales leadership says 41 deals / $18M in volume still have unknown lead sources since January. Apr 15 ops establishes a corrective rule: validate actual source with the agent instead of relying on Follow Up Boss fields that may be misleading.

### 8. Weekly actuals, status reports, and commission expectations are not reconciling cleanly

- Type: blocker
- Status: active
- Owner: Accounting / Ahsan
- Confidence: 94%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:budget review 2026 04 23 09 27 edt:meeting_transcript:blocker:884da3464f695b4c

Budget review identified recurring mismatches between actual collections and status-based reporting, with deal-level and report-level variances called out explicitly.

Why it matters: Financial reporting that does not reconcile creates risk in cash planning, owner confidence, and compensation accuracy.

Recommended next action: Have accounting reconcile the cited variances deal-by-deal and define one canonical reconciliation check to run each week.

Evidence summary: In the Apr 23 budget review, Steve said weekly actuals and status-based commission reporting should reconcile all the time but currently do not, citing specific mismatches including about $1,500 on one deal and a broader variance across reports.

### 9. Bruce Maxwell was approved for the 90-10 split / agreed-client list

- Type: decision
- Status: likely_resolved
- Owner: Clare Manalo
- Confidence: 96%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:52b11c6a-b9ef-4b03-acfe-d27ee5a9892a:decision_candidate:e5c25e7ee346aafc, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbbf43c56f3e16:decision_candidate:11fafa5c01530f4e

Approval appears complete; likely remaining work is database/process execution rather than decision-making.

Why it matters: This is a clean, explicit decision that should be reflected consistently in systems to avoid future compensation or eligibility confusion.

Recommended next action: Verify the database/list update was completed and communicate effective scope if anyone operationally relies on the list.

Evidence summary: Missive and Gmail both capture Steve's approval for Bruce Maxwell on the 90-10/agreed-client list; Gmail adds that Clare said it would be noted in the database.

### 10. Loom access is unstable after Atlassian migration, and billing continuity also needs attention

- Type: blocker
- Status: active
- Owner: Clare with Steve
- Confidence: 93%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:34a89c3b-722a-4e77-9078-9ba5b12f9b20:blocker:47a7ca7a3acd20ed, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19dbc8ffd856a1e8:blocker:ebb1b70debb953dc

Migration-related errors are affecting Loom account access, while a separate notice says Steve’s trial will lapse May 7 without billing details.

Why it matters: This combines immediate access risk for existing Loom content with near-term subscription risk that could further disrupt video access and workflows.

Recommended next action: Use the admin fallback to confirm access to required videos, resolve the support escalation, and decide whether to add billing before May 7.

Evidence summary: Missive says Atlassian migration appears to have broken Loom accounts and tech support escalation is underway; Gmail says the Loom Business + AI trial ends May 7 and requires billing details to avoid fallback to Free.

### 11. Inbound routing quality is showing cracks across leads and support triage

- Type: pattern
- Status: active
- Owner: Carson / ops
- Confidence: 88%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001
- Candidate keys: SRC-MISSIVE-001:b900c2d5-37a4-49e6-8902-e7ea33b8f0a7:blocker:49624bcc263d73a5, SRC-MISSIVE-001:bd8a9798-cedb-40d0-8240-e23cd88d9b92:blocker:028f23e7e902f798, SRC-MISSIVE-001:376b244f-0d8f-47a9-aaa9-d4c03465c99d:blocker:636a8f60a5484ecd

Recent examples include Google Ads leads landing in Catch All and an appraisal request being classified as a non-lead, suggesting routing rules need review.

Why it matters: Misrouted inbound creates missed SLAs, poor lead handling, and hidden leakage in attribution and conversion.

Recommended next action: Audit recent catch-all and forwarded non-lead items, then validate the routing logic for Google Ads and appraisal-type inquiries.

Evidence summary: Missive shows at least two BCrew Google Ads leads in catch-all / not designated area and a separate appraisal request forwarded as a non-lead to support, indicating possible classification/routing problems.

### 12. Leadership is tightening agent qualification/onboarding standards

- Type: strategic_issue
- Status: needs_decision
- Owner: Nick Bergmann / John Kitchens
- Confidence: 92%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:sales leadership meeting 2026 04 21 10 30 edt:meeting_transcript:decision_candidate:f2582d422ed3c917

Sales leadership agreed to stop over-serving low-effort agents and is considering a harder entry bar and reduced mentorship burden.

Why it matters: This is a meaningful strategic shift in recruiting/onboarding philosophy that could affect growth model, support load, and culture.

Recommended next action: Translate the discussion into explicit qualification criteria, mentorship policy, and exceptions before implementation becomes ad hoc.

Evidence summary: Apr 21 sales leadership agreed they should stop catering to agents not putting in effort, reconsider onboarding brand-new agents, and rethink the mentorship program.

### 13. Onboarding coordination remains a recurring process pain point

- Type: strategic_issue
- Status: stale_watch
- Owner: Carson Campbell
- Confidence: 82%
- Sensitivity: neutral
- Sources: SRC-MEETINGS-001
- Candidate keys: SRC-MEETINGS-001:meeting:sales leadership meeting 2026 04 07 09 15 edt:meeting_transcript:blocker:08571f965e108753, SRC-MEETINGS-001:meeting:checklist review 2026 02 13 11 33 est:meeting_transcript:blocker:2a206b07f90895bc

Recent meeting evidence shows duplicate leadership touchpoints waste time, while older meeting context suggests the onboarding path has been fragmented for a while.

Why it matters: This appears to be a persistent process weakness, but the freshest evidence is process-friction commentary rather than a newly escalated incident.

Recommended next action: Confirm whether ops has already standardized scheduling/ownership for onboarding touchpoints; if not, assign one coordinator and one canonical cadence.

Evidence summary: Apr 7 sales leadership says onboarding is inefficient when agents meet multiple leaders without clear scheduling. Older Feb evidence says the onboarding path was fragmented across multiple tools and lacked a clear process.

### 14. Union Street Media communication may be delayed because Gmail could not deliver a reply

- Type: blocker
- Status: needs_owner
- Owner: Steve Zahnd
- Confidence: 90%
- Sensitivity: neutral
- Sources: SRC-MISSIVE-001, SRC-GMAIL-001
- Candidate keys: SRC-MISSIVE-001:ec2c6f50-3277-4ae9-86ef-e8b3958ff611:blocker:f2bc52de894c06dc, SRC-GMAIL-001:steve.zahnd@bensoncrew.ca:19db672858561afd:blocker:c8aa8654ef036f88

A temporary delivery failure may block a vendor clarification/payment thread if time-sensitive.

Why it matters: Likely small, but if the request was urgent this can create unnecessary lag with an external vendor.

Recommended next action: Retry via alternate address/thread or phone if response is needed before Gmail finishes retries.

Evidence summary: Both Missive and Gmail show delivery-delay notices for a message to UnionStreetMedia@tracear.app, with Gmail saying the recipient server did not accept the connection and retries will continue.

## Source Coverage

- SRC-GMAIL-001: 24 read. Fresh operational alerts, vendor notices, KPI issue thread, and explicit decisions captured in email. Caveat: Email contains automated noise and some system-generated alerts; not all threads are signed-off sources.
- SRC-MISSIVE-001: 37 read. High-value blocker/decision traffic including automation failures, vendor exchanges, and shared inbox operational issues. Caveat: Includes many automated task alerts that require grouping rather than one-by-one treatment.
- SRC-SLACK-001: 11 read. Useful for fresh frontline blockers and routing/access issues. Caveat: Limited slice; Slack snippets are narrow context, not full workflow history.
- SRC-MEETINGS-001: 108 read. Best source for strategic patterns, unresolved process problems, and leadership decisions over time. Caveat: Contains historical material; some items may be stale unless reinforced by recent evidence. Zoom chat artifacts are partial historical context only.

## Suppressed Patterns

- Multiple duplicate SocialPilot post-error alerts sent to different recipients: Grouped into one social publishing reliability issue rather than listing each recipient-specific alert.
- Multiple duplicate SocialPilot reconnection alerts sent to different recipients: Grouped into one account disconnect/reconnection issue.
- Long tail of individual AI task failure alerts: Rolled into one stack-reliability incident unless uniquely strategic or already paused.
- Single-person availability notes, minor access hiccups, and likely-resolved one-off interruptions: Suppressed as low strategic value or likely already resolved.
- Old Zoom chat artifacts and older one-off blockers: Used only as partial historical context; not treated as authoritative current state unless reinforced.

## Open Questions

- Who is the incident owner for the failing internal scouts/directors, and is there a single dashboard showing which automations are paused vs near pause? Why it matters: Without named ownership, source trust and operational visibility will continue to degrade.
- Is the KPI issue isolated to rendering/caching, or is there a broken sync between Supabase and downstream dashboard layers? Why it matters: Determines whether this is a fast UI fix or a broader reporting integrity problem.
- Has SocialPilot already been upgraded/enabled for Enterprise API access, or is a commercial approval still pending? Why it matters: Clarifies whether the blocker is procurement, vendor enablement, or integration design.
- Were the deleted SocialPilot accounts intentional cleanup or accidental removal of active publishing channels? Why it matters: Changes whether this is just account hygiene or a live marketing outage.
- Has the billboard contract actually been executed, or is approval recorded but paperwork still outstanding? Why it matters: The April 27 lock-in date creates a real execution deadline.
