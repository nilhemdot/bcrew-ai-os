# KPI Dashboard / Supabase

This is the operator note behind `SRC-SUPABASE-001`.

Use this when AI OS needs to read `kpi.bensoncrew.ca` or the Supabase project behind it.

## What It Is

- KPI is an existing Benson Crew foundation system.
- KPI is not a rebuild target for AI OS.
- AI OS should read it, verify it, and build around it.

## Why This Is High Value

This is not just raw FUB mirrored into a dashboard.

This system is already doing special shaping work across:

- FUB-style CRM data
- shopping-list data
- executed-deal / finance data
- goals and target math
- company-level ranking logic

That is why this matters so much for AI OS.

The old failure mode was:

- agents could reach the database
- but they did not know which layer meant what

The new job is:

- teach AI OS the read model clearly
- so future coaches, assistants, and manager agents read the right truth on purpose

## Current State

Already true:

- browser access works
- the correct Lee-provided repo, `/Users/bensoncrew/.inspection/zahnd-team-dashboard`, has been audited
- core tables are updating live
- key company RPCs respond
- AI OS has locked the core read model for the first KPI jobs

Audit basis:

- prior 2026-04-20 deep pass over the live Supabase database and KPI app
- local review of the actual React/Supabase code Lee provided
- review of Supabase generated types, migrations, table reads, and RPC definitions
- 2026-04-26 recheck of actual `.from(...)` and `.rpc(...)` usage before closing `SOURCE-010`

## Foundation Scope Now

This is what belongs in Foundation right now.

- prove the app is readable
- prove the database is readable
- name the truth layers clearly
- document which KPI surface answers which kind of question
- lock the critical AI OS read rules for:
  - linking / identity
  - appointments
  - signed clients
  - executed deals
  - goals / target pacing
  - app usage vs true maintenance

Critical foundation reads:

- `users`
  - bridge from app user to FUB-style user identity
- `persons` + `appointments`
  - pipeline / appointment / signed-activity truth
- `leads`
  - shopping-list truth and signed-client coaching layer
- `deal_data`
  - executed-deal / company-financial truth
- goals tables
  - target math and pace math
- `users_activity`
  - app engagement only, not proof of good data hygiene

## AI OS Core Read Rules

Locked on `2026-04-26` from the `zahnd-team-dashboard` code, Supabase types, migrations, and the prior live database audit.

| AI OS job | Read from | Do not substitute | Notes |
| --- | --- | --- | --- |
| Identity / roster joins | `profiles` + `users` | profile email alone | `profiles` owns app users and roles. `users` owns the FUB-style numeric `userid` bridge used by pipeline/activity tables. |
| Pipeline / CRM lead flow | `persons` + `appointments` + activity tables | `leads` | Use this for lead-inbox, stage, appointment, consult, signed-client, source, call/text/email/task, and pipeline hygiene reads. |
| Shopping List / active-opportunity hygiene | `leads` | `persons` | The table name is misleading. In founder meaning this is the coached Shopping List / active client-opportunity layer, including score, action plan, signed flag, estimated value, and stale-list checks. |
| Executed deals / finance | `deal_data` | `leads` executed fields | Use `deal_data` for executed-deal count, volume credit, commission credit, GCI, agent/company portions, deposit/close timing, and company financial leaderboard reads. |
| Goals / target pacing | `goals`, `company_goals`, `expansion_goals` | static markdown target math | Use personal goals for agent target math, company goals for leadership/company pacing, and expansion goals only when expansion-planning logic is explicit. |
| Company dashboard pacing | `get_company_dashboard_stats` RPC + underlying `persons`, `appointments`, `deal_data` | ad hoc table blends | This RPC intentionally combines pipeline-adjusted lead/consult/signed-client windows with executed-deal finance math. |
| Company pipeline / appointments | `get_company_leads`, `get_company_appointments` RPCs | Shopping List rows | These are company-wide CRM/pipeline reads backed by `persons`, `appointments`, `users`, and `profiles`. |
| Competition / MQY | leaderboard tables + `get_team_mqy_build_metrics`, `get_team_mqy_perform_metrics` RPCs | company financial leaderboard alone | Builder and performer competitions use dedicated RPCs and challenge/team/member tables. |
| Usage / adoption | `users_activity`, `admin_user_activity_reports` | Shopping List update proof | App activity proves login/visibility/usage, not whether an agent maintained the Shopping List correctly. |

Boundary rule:

- `leads` and `deal_data` both contain execution-ish fields, but they are not the same truth layer.
- AI OS should use `deal_data` for executed-deal and finance truth unless a job explicitly says it is auditing Shopping List execution fields.
- AI OS should use `leads` for Shopping List quality and stale active-opportunity management.

## Not Foundation Yet

These belong to later sales-hub or coaching work, not current foundation closeout:

- perfect coaching prompts for every agent scenario
- full shopping-list operating playbooks
- weekly manager workflows
- every leaderboard / competition interpretation
- every UI habit agents should follow day-to-day
- rebuilding KPI features

Safe rule:

- Foundation locks meaning and read discipline.
- Sales Hub later turns that into coaching, alerts, nudges, and operating workflows.

## Truth Layers

### Pipeline truth

Tables:

- `persons`
- `appointments`
- `users`
- `calls`
- `emails`
- `text_messages`
- `tasks`

Use this for:

- pipeline stage reads
- appointments
- lead-inbox style CRM questions
- follow-up activity
- appointment hygiene and data-entry enforcement

### Shopping-list truth

Table:

- `leads`

Use this for:

- the manual shopping-list coaching surface
- active opportunities / active clients the agent is actively working
- score-based prioritization and re-scoring
- signed-vs-unsigned shopping-list management
- weekly action-plan discipline

Important naming caution:

- the table is named `leads`
- but the founder meaning is broader than raw "leads"
- this is a coached working list, not just a dump of new leads
- parts of the app already reflect that by calling empty active rows `No active clients found`

Shopping-list canon now locked:

- this is the manual active-opportunity / active-client coaching layer
- agents are expected to review it weekly
- agents are expected to re-score opportunities as reality changes
- agents are expected to keep a real action plan on each active record
- the score is not inferred by AI today; it is agent-entered operating judgment

Current score meaning visible in the live app:

- `10` = executed in the next `15` days
- `9` = `15-30` days
- `8` = `30-45` days
- `7` = `45-60` days
- `6` = `60-90` days
- `5` = about `6` months
- `4` = about `12` months
- `3` or below = ice cold / unclear

Important implementation rule:

- pipeline-value surfaces in the KPI app currently treat active shopping-list rows with `score >= 7` as the key active-opportunity layer
- that means stale scoring and empty action plans are not cosmetic issues; they directly weaken the company and agent pipeline read

### Executed-deal / finance truth

Table:

- `deal_data`

Use this for:

- executed deals
- volume
- gross-to-team
- net-to-team
- company financial execution reporting

### Goal truth

Tables:

- `goals`
- `company_goals`
- `expansion_goals`

Use this for:

- maintain goals
- growth goals
- expansion goals
- company targets

### Competition truth

Tables / RPCs:

- `leaderboard_challenges`
- `leaderboard_teams`
- `leaderboard_team_members`
- `get_team_mqy_perform_metrics`
- `get_team_mqy_build_metrics`

Use this for:

- challenge views
- pod / MQY reporting

### App-engagement truth

Tables:

- `users_activity`

Use this for:

- who is logging in
- who is active in the app
- who is not using the system consistently

Do not over-read this table:

- it proves app session activity
- it does **not** prove who updated the shopping list specifically
- total minutes can overstate real engagement if a visible session is left open for a long time
- shopping-list maintenance still has to be read from:
  - `leads.updated_at`
  - score freshness
  - action-plan completeness
  - duplicate / stale record checks

## The Main Rule

Do not treat KPI as one flat source.

Pick the truth layer on purpose for each AI OS job.

## Known Split That Matters

These are both live, and they do **not** tell the same story:

- shopping-list executed outcomes from `leads`
- executed-deal / finance outcomes from `deal_data`

Live 2026 example from the audit:

- `leads` executed count: `44`
- `deal_data` executed count: `108`

So if an agent or report asks for "executed deals," AI OS must choose the layer on purpose.

## AI OS Read Rules

- pipeline and appointment questions:
  - read `persons` + `appointments`
- appointment type / outcome compliance:
  - read `appointments` plus the KPI appointment rule model
- shopping-list quality / stale list questions:
  - read `leads`
- signed-client questions:
  - start from `leads` unless a later signed-off source replaces it
- executed-deal and company-financial questions:
  - read `deal_data`
- goal pacing questions:
  - read goals tables plus the matching activity layer
- app adoption questions:
  - read `users_activity`

## Appointment Hygiene Is A First-Class KPI Surface

This is one of the highest-value controls in the whole system.

Why:

- agents can break conversion reporting just by using the wrong appointment type
- agents can break performance coaching just by using the wrong outcome
- agents should not be allowed to be sloppy here if the KPI system is going to drive coaching

Already visible in the KPI system:

- the `Appointments` page colors outcomes by rule
- the page supports an `(Action Required)` filter
- the Resource Center / `How To` page explains:
  - correct Set / Show / Signed date logic
  - correct appointment outcomes
  - why deleting leads is wrong

AI OS should not invent a new rule set here.

AI OS should learn and enforce the existing Benson Crew rule set:

- correct appointment type
- correct appointment outcome
- correct stage date usage
- visible flags when data entry is wrong

Current operating boundary:

- today, appointment audits are primarily about discovery and consult hygiene
- support-network appointment tracking exists as a future capability, not the current audit priority
- future coaching can still use support-network meetings, go-deep days, and supporter-building activity later

## Opportunity Hygiene And Re-Entry Rules

This is separate from appointment hygiene, but it is just as important.

Why:

- FUB can auto-create a lead when an agent adds a person
- not every added person is a real lead
- fake new leads will pollute KPI coaching if AI OS treats them as true opportunity creation

Current Benson Crew rule model:

- a real new opportunity is not the same thing as a brand-new human added to CRM
- some people belong outside the active lead flow:
  - possible supporters
  - past clients
  - non-contact non-leads
  - realtor / vendor style records
- if an agent adds people and forgets to move them quickly, FUB can leave them as accidental leads
- `Delete Lead` is a temporary hygiene stage for those records
- `Delete Lead` is not the final home for those people
- after the temporary cleanup, the person should be moved into the correct long-term stage

Important re-entry rule:

- a person can leave the lead flow, live in support-network style stages, then re-enter the lead pipeline later
- when that happens, the business may treat that as a new opportunity even though it is not a brand-new human
- AI OS must preserve that distinction when it reads KPI and FUB data

Working AI OS rule:

- do not celebrate raw new-lead counts until stage hygiene is checked
- do not coach from inflated lead creation caused by bad staging
- before using new-opportunity counts as truth, compare:
  - CRM person state
  - current pipeline stage
  - shopping-list state
  - whether the record is really a re-entered opportunity

Founder-confirmed stage rule right now:

- a true new opportunity is currently counted when a person enters any of these active opportunity stages:
  - `Lead`
  - `Hot Lead/Nurture (0-3)`
  - `Warm Nurture (3-6)`
  - `Cold Nurture (6-12)`
  - `Appointment`
  - `Appointment - No Show`
- this applies both to:
  - brand-new people entering the system
  - existing supporters / past clients / non-leads who re-enter the pipeline

Current source stages that can feed that re-entry:

- `Contact - Non Lead/Non Supporter`
- `Possible Supporter`
- `Supporter/SOI`
- `Past Client`

Founder-confirmed cleanup change:

- `Unresponsive` is no longer a real stage
- the two old lost-contact stages were removed
- if someone is given up on and does not belong in a better long-term category, they should land in:
  - `Contact - Non Lead/Non Supporter`

Operational meaning:

- this is now the main catch-all non-lead recycle bucket
- it also feeds the older unclaimed callback pool used by agents when working older leads again

Founder-confirmed support-network meaning:

- `Possible Supporter` is not a generic dead-contact bucket
- it is an active business-building stage
- the agent should work that person, ask the chosen-one questions, and try to convert them into a real supporter
- `Supporter/SOI` means the person is now a confirmed supporter
- `Past Client` is separate and should not automatically be treated as a confirmed supporter

Founder-confirmed non-lead meanings:

- `Realtors/Vendors`
  - real estate agents and vendor-style contacts worth keeping in CRM
  - not supporter-path records
  - not true lead-flow records
- `Other Contacts`
  - people worth keeping in the system
  - not `Possible Supporter`
  - not `Supporter/SOI`
  - not something the founder wants deleted
- `Trash`
  - team-facing soft-delete stage
  - protects the system from agents hard-deleting people
  - true deletion remains an admin / founder action

This matters for KPI because future coaching should not confuse:

- support-network building
- stale non-lead cleanup
- true lead creation

Still open:

- `Active Client` may also be treated as part of the active opportunity path, but this should be confirmed against the underlying KPI database logic
- `Delete Lead` is confirmed as cleanup workflow, not a real opportunity stage

Founder working read right now:

- `leaddate` = when the lead / person entered the system as a lead
- `leadclaimeddate` = when an agent took ownership of that lead
- this is especially important for older pond / recycle records that later get claimed
- exact write logic still lives in Lee's original middleware / database layer, not the KPI frontend

## What KPI Actually Counts Today

The current KPI YTD lead count is not calculated from `currentstage` string labels at read time.

The audited code path counts:

- `leadclaimeddate` in range
- or `leaddate` in range when `leadclaimeddate` is null

That matters because:

- stage doctrine still matters for business meaning
- but the live KPI lead count is really driven by the date fields being written upstream
- so the next technical question is not just "which stage counts?"
- it is also "which upstream logic writes `leadclaimeddate` / `leaddate` when a person re-enters the pipeline?"

Current safe read:

- use founder doctrine for semantic truth
- use `leadclaimeddate` / `leaddate` for what the KPI app is literally counting today
- do not assume current-stage labels alone explain the metric

Lee middleware proof:

- the `FUBZahnd` repo confirms these date fields were written upstream from FUB stage/owner transitions
- `LeadDate` is set when the person enters `Lead` or any stage marked `LeadStage = true`
- `LeadClaimedDate` is set when a record moves from the old unclaimed/pond owner ID (`22`) to a non-`22` user
- if a non-lead active row re-enters a lead stage, the old row is made inactive and a new active opportunity row is created for the same FUB person
- therefore KPI lead counts can represent agent-claimed recycled opportunities, not only brand-new humans

Reference:

- [FUBZahnd middleware logic](fub-zahnd-middleware.md)
- [FUB / KPI / Deal Data connection map](fub-kpi-deal-connection-map.md)

Live connection proof on `2026-04-26`:

- `53 / 53` FUB-linked Owners deal groups matched KPI `persons` by FUB `personid`
- `53 / 53` matched KPI `deal_data` by `Deal #`
- `37 / 53` had KPI appointment history
- `8 / 53` had multiple KPI `persons` rows for the same FUB person, proving live multiple-opportunity / re-entry behavior
- `6 / 53` had `leadclaimeddate`, proving claimed/recycled lead timing exists live
- live `stages.leadstage = true` includes `Active Client`, `Conditional Deal`, and `Firm Deal`, so coaching must use date/episode context instead of naive current-stage labels

Second-pass live KPI proof on `2026-04-26`:

- active non-deleted KPI `persons`: `81195`
- active lead-stage KPI `persons`: `16657`
- active lead-stage rows with `leaddate`: `16645`
- active non-deleted rows with `leadclaimeddate` and current user not `22`: `2451`
- active rows still owned by user ID `22`: `54779`
- latest sampled `leadclaimeddate` rows were updated on `2026-04-26`

Practical read:

- `leadclaimeddate` is a live field AI OS can read for coaching and attribution.
- It is not limited to rows currently in lead stages, because a claimed opportunity can later move to supporter, past-client, closed, or other stages.
- 2026-05-02 proof confirmed the coaching semantics but paused exact writer ownership: the Lee/FUBZahnd SQL stored procedure explains `LeadDate` and `LeadClaimedDate`, live Supabase still receives current rich date values, and the checked-in direct Supabase helper does not write those rich date fields. AI OS may read and explain the fields, but must not rebuild or write this pipeline until the current production writer/replication path into Supabase is proven.

Future coaching behavior should be:

- flag likely fake leads
- suggest moving them to `Delete Lead` first when that temporary cleanup is appropriate
- then suggest the correct destination stage
- protect pipeline truth before reporting on it
- describe `leaddate` as opportunity-entry timing, `leadclaimeddate` as claim/recycle timing, and `Active Client` as downstream opportunity context rather than fresh lead creation

## Current Implementation Caution

The founder doctrine is now clearer than parts of the live KPI implementation.

Concrete examples:

- `How To` correctly explains:
  - auto-created FUB leads
  - temporary `Delete Lead` cleanup
  - re-entry from supporter / past-client style records
- `How To` also documents support-network outcomes such as:
  - `Show - Supporter Gained!`
  - `Show - SOI/Support Meet Success`
- live appointment rows also contain those support-network style outcomes
- but `appointmentUtils.ts` still only encodes discovery and consult outcome buckets for color / rule handling
- the live `Leads` page still uses a rough urgency grouping:
  - `Lead`, `Appointment`, and `Hot Lead...` => `hot`
  - `Warm Nurture`, `Active Client`, and `Possible Supporter` => `warm`
  - everything else => `cold`
- the live pipeline hook still counts supporter-style buckets using broad string matching on `currentstage`
- the live `stages` table still contains transitional / legacy rows such as:
  - `Unresponsive`
  - `Appointment - No Show Follow Up`

AI OS rule:

- do not infer canon from raw stage-table presence
- do not infer canon from rough UI badge grouping
- prefer signed-off business doctrine, then use code / DB reads to find drift against that doctrine

This is exactly why `SOURCE-017` exists.

## KPI Agent Error Doctrine

Source evidence:

- live page: `https://kpi.bensoncrew.ca/how-to`
- repo code: `/Users/bensoncrew/.inspection/zahnd-team-dashboard/src/pages/HowTo.tsx`
- outcome rules: `/Users/bensoncrew/.inspection/zahnd-team-dashboard/src/utils/appointmentUtils.ts`
- founder clarification on `2026-04-26`

This is not just training copy. These are the main data-entry failures that make KPI, company goals, and future Sales Hub coaching wrong.

### Appointment Stacking

Agents often book multiple discovery or consultation appointments for the same person because they needed multiple meetings to sign the client or move them forward.

Business rule:

- if it is the same client/opportunity moving toward one signed-client outcome, the agent should usually update/move the original appointment and set the correct outcome
- stacking ten appointment records and one signed-client result makes conversion look like `10%`, even if the real motion was one opportunity that took multiple touches

Repeatable live appointment-quality proof on `2026-04-26`:

- active appointment rows: `3442`
- recent appointment rows used for same-person / same-type stack detection since `2026-01-01`: `799`
- likely same-person / same-type stacks inside a `90` day window: `52` groups
- rows inside those likely stacked groups: `119`
- buy/sell context people detected as likely legitimate exception review: `21`

Audit command:

```bash
npm run -s kpi:data-quality -- --windowDays=90 --since=2026-01-01 --topLimit=5 --sampleLimit=0
```

Coaching rule:

- treat stacked same-person/same-type appointments as a coaching/audit signal, not an automatic failure
- future Sales Hub should flag likely stacking and explain the data consequence to the agent
- the first audit should look for multiple appointments for the same person inside a `60` to `90` day review window, then ask for context rather than assuming fraud/bad entry
- legitimate exceptions include:
  - the client is buying and selling, because that can create two real appointment/outcome tracks and two deals even if the agent met with the client once
  - the client is selling or buying multiple properties
  - there are clearly separate opportunities tied to separate deal paths
- if the follow-up question shows the records are really one opportunity with repeated meetings, coach the agent to move/update the original appointment and outcome instead of creating a new appointment record

### Missing Outcomes

Agents often fail to update appointment outcomes after the meeting.

Live proof on `2026-04-26`:

- active appointment rows missing outcome: `951 / 3442`
- recent appointment rows included in the stacking audit since `2026-01-01`: `799`

Coaching rule:

- missing outcomes corrupt no-show, lost, back-to-nurture, signed-client, consult-held, and company-goal pacing
- this should become an agent-level cleanup signal, not just a company-wide count

### Wrong Outcomes

Agents sometimes use the wrong outcome label even though the How To page spells out the allowed outcome set.

Live proof on `2026-04-26`:

- active appointment rows with non-standard outcomes: `53`
- active appointment rows with a known outcome label used against the wrong appointment-type context: `142`

Coaching rule:

- do not silently count non-standard outcomes as valid wins or losses
- split wrong-outcome cleanup into:
  - labels that are not canonical at all
  - canonical labels used on the wrong appointment type
- normalize only after a governed mapping is approved

### Lead Validation

FUB automatically creates a lead when a person is added. If an agent adds ten people and does not move non-leads out quickly, KPI can count fake leads.

The KPI system already tries to show agents what they did wrong through the lead list / bad-source views, but many agents ignore it.

Live proof on `2026-04-26`:

- repeatable KPI/FUB audit returned `16657` active rows in lead-like stages
- `6726` active lead-stage rows had invalid/generic source values
- `5030` active lead-stage rows had source `Import`
- `1485` active lead-stage rows had source `<unspecified>`
- `208` active lead-stage rows had source `Sphere`
- `3` active lead-stage rows had no source value
- `5095` active lead-stage rows belonged to the pond/unclaimed `Benson Crew Assistant` context
- local KPI code still contains source-validation helpers such as `ALLOWED_LEAD_SOURCES`, `FIX_ALLOWED_SOURCES`, `isValidLeadSource`, `filterDealsBySource`, and `filterAppointmentsBySource`, but those sections are commented out / disabled in `dataFetching.ts`

Validated-source doctrine:

- `Import`, `<unspecified>`, generic `Sphere`, `SOI`, and similar placeholders are not validated final lead sources
- `<unspecified>` is quarantine only, not final attribution truth
- `Realtor.ca` as a source is not the same thing as a realtor/contact being incorrectly left as a lead
- fake-lead detection needs stage, source, tags/person type, owner, timing, and whether the person was moved out within the allowed cleanup window
- the governed FUB lead-source doctrine lives in `SRC-FUB-001` / `fub_lead_source_rules` and the Follow Up Boss source note; KPI coaching must use that doctrine instead of inventing a separate source list

Coaching rule:

- surface unvalidated leads, wrong lead sources, realtors/vendors/support-network contacts left as leads, and other fake lead inflation
- protect lead pace before using it for coaching praise or company-goal confidence
- do not hard-delete people because that destroys call and appointment history; use the temporary `Delete Lead` / correct-stage workflow where appropriate
- when an agent uses an invalid/generic source, guide them through the FUB correction flow:
  - ask whether the true source was met in person, met through social media, family, referral, introduction, or another governed source
  - if referral/introduction, ask who introduced them and whether that person exists in FUB
  - if the origin person is missing, offer to add/connect them in FUB when write permissions exist
  - if met in person or met on social, ask where / which platform and store that in secondary lead-source information
  - preserve Ground Zero so the original relationship/source is not lost

### Shopping List Weekly Discipline

The Shopping List is critical because it is the manual working-opportunity layer that supplements FUB/KPI.

Founder clarification:

- Shopping List should be updated weekly
- the agent starts with active Shopping List clients because these are closest to money
- a useful review asks what can be done this week to move each client to the next step
- score windows matter: a high-score opportunity sitting too long usually means the score is wrong, the plan is missing, or the deal is stalled
- the Shopping List directly affects leadership's view of company pipeline dollars and where coaching/support should go
- coaching calls with Sofia Fischman, team Shopping List sessions, leadership meetings, morning huddles, and future Reilly Mitchell evidence should be mined before final Sales Hub coaching language is locked

Meeting evidence already found in `SRC-MEETINGS-001`:

- `Sales Team Meeting - Survey & Shopping List` on `2025-05-27`
- `Weekly Leadership Meeting - Review the Week and Plan The Next` on `2025-01-10`
- `Aidan / Steve` on `2026-04-07`
- `The Morning Huddle` on `2026-04-17`
- `Sales Leadership Meeting` / Nick & John prep artifacts around `2026-04-14`
- `Sofia and Steve` coaching artifacts from January and February `2026`

Coaching rule:

- stale high-score Shopping List rows, blank action plans, duplicate active opportunities, and missing weekly updates are pipeline-quality signals
- use score-specific expected windows before waiting for a generic 60-day stale rule:
  - `10`: about `15` days
  - `9`: about `30` days
  - `8`: about `45` days
  - `7`: about `60` days
  - `6`: about `90` days
  - `5`: about `180` days
  - `4`: about `365` days
- duplicate active Shopping List rows should trigger a question first, because buy/sell, multiple properties, or separate opportunity paths can be legitimate
- blank action plans on active opportunities should trigger a practical "what is the next action this week?" prompt
- agent coaching should combine FUB lead validation, appointment outcome hygiene, Shopping List discipline, goals, and executed deal data

### Agent Coach Action Destination

Founder clarification:

- the goal is not only to tell agents what they did wrong
- the assistant should help them understand the issue and eventually update the relevant system for them when they have signed up, connected their account/API key, and granted permission
- most KPI production fields are downstream from FUB / Lee's database, so the first write destination for source/stage/contact hygiene is usually FUB
- KPI's direct write surfaces are mainly goals and Shopping List
- Shopping List is the most important first KPI-native write opportunity: an assistant can run a weekly workflow, ask the agent about each client, suggest or collect action plans, and help push active clients down the field
- if the KPI app lacks endpoints for safe Shopping List or goal writes, the team owns the code and can ask Aidan/Lee to review and implement the needed endpoints

AI OS rule:

- first build reliable read/audit signals
- then produce suggested fixes with clear evidence
- then add explicit agent-authorized apply/write paths with audit logs and approval boundaries
- never silently mutate KPI/FUB/CRM data just because the assistant detected a likely issue

This destination is tracked by `SALES-004` and `SALES-005`.

## Audit Snapshot: Shopping List Quality

Date: `2026-04-26`

This is not permanent live truth. It is the current audit snapshot used to understand how healthy the Shopping List discipline is today.

Command:

```bash
npm run -s kpi:shopping-list -- --topLimit=0 --sampleLimit=0
```

Connector proof:

- KPI Supabase project: `ayqykfsapzgqmqrrhque.supabase.co`
- table: `leads`

Live proof:

- total Shopping List rows: `673`
- active shopping-list rows: `293`
- closed rows: `380`
- closed executed rows: `376`
- closed fell-through rows: `4`
- signed active rows: `137`
- active high-score rows (`score >= 7`): `91`
- active stale high-score rows (`7+` and older than `60` days): `16`
- active rows past their score-specific expected window: `36`
- active rows with blank `action_plan`: `49`
- active high-score rows with blank `action_plan`: `17`
- active rows missing score: `0`
- active rows missing type: `0`
- active rows missing estimated economics: `2`
- duplicate active client clusters: `35`
- duplicate active client rows: `85`
- closed execution drift rows: `1`

Active score distribution:

- `10`: `5`
- `9`: `10`
- `8`: `30`
- `7`: `46`
- `6`: `51`
- `5`: `66`
- `4`: `50`
- `3`: `11`
- `2`: `9`
- `1`: `15`

Known quality risks seen live:

- duplicate active shopping-list entries still exist for some agents
- stale `7+` and `8+` rows still exist with empty action plans
- some agents clearly use the app, but that does not prove they are maintaining Shopping List correctly
- score-window expiry catches some issues earlier than the generic stale-high-score check

Useful current operator read:

- `users_activity` tells us who is entering and using the KPI app
- `leads` tells us whether their Shopping List is actually being maintained well
- those are related, but they are not the same truth

Current highest-signal hygiene checks:

- high-score rows with no action plan
- high-score rows not updated in `60+` days
- duplicate active client / opportunity rows for the same agent
- agents with meaningful active-list volume but weak or stale list discipline

## KPI Reads To Lock

These are the core KPI surfaces AI OS should understand and eventually sign off one by one.

Status key:

- `Mapped` = route, source layer, and business job are clear enough to audit next
- `Mixed` = the surface works, but truth-layer risk is already visible

| # | Surface | Main route / surface | Primary read | Why it matters | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Agent goals: 3 levels | `/goals` | `goals` + `expansion_goals` | Maintain, growth, and exponential targets are the base coaching contract for each agent. | Mapped |
| 2 | Manager goal assumptions | `/goal-management` | `goals` + `expansion_goals` | Manager-controlled conversion rates, timing, avg price, avg commission, and avg split shape every downstream target. | Mapped |
| 3 | Company goals | company goal layer | `company_goals` | Company target math drives company pacing, company coaching, and the leadership read. | Mapped |
| 4 | Personal dashboard pacing | `/` | goals + pipeline + analytics hooks | This is the main “am I on track?” surface for each agent. | Mapped |
| 5 | Company dashboard pacing | `/company` | `company_goals` + company RPCs | This is the main “is the company on track?” surface for leadership. | Mapped |
| 6 | Personal shopping list | `/leads` | `leads` | This is where agent-side opportunity quality, score, signed status, and stale list discipline live. | Mapped |
| 7 | Company shopping list | `/company-shopping-list` | `leads` | This is the company-wide shopping-list view, including stale high-score records and signed counts. | Mapped |
| 8 | Personal leads inbox / CRM intake | `/leads-inbox` | `persons` + `users` | This is the real CRM lead-flow layer, not the shopping-list layer. It is also where accidental FUB-created leads and true new-opportunity logic start to separate. | Mapped |
| 9 | Company pipeline leads | `/company-leads` | `persons` + RPCs | This is the company-wide lead pipeline read. | Mapped |
| 10 | Personal appointments | `/appointments` | `appointments` + `persons` + goal timing | Apps set, held, and signed pace live here for the agent. | Mapped |
| 11 | Company appointments | `/company-appointments` | company appointments RPCs | Company appointment pace is one of the clearest company-level execution reads. | Mapped |
| 12 | Appointment hygiene / type + outcome compliance | `Appointments` + `How To` + old rule mapping | `appointments` + rule model | This is the control surface that keeps agent data entry clean enough for real coaching and conversion math. | Mapped |
| 13 | Opportunity hygiene / re-entry control | `Leads Inbox` + `How To` + FUB stage rules | `persons` + stage rules + shopping-list context | This keeps fake leads, support-network records, and re-entered opportunities from corrupting coaching and pipeline math. | Mapped |
| 14 | Personal executed deals | `/deals` | `deal_data` | This is the executed-deal truth the agent should be coached from. | Mapped |
| 15 | Company executed deals | `/company-deals` | `deal_data` | This is the company executed-deal ledger view. | Mapped |
| 16 | Company financial leaderboard | `/company-financial` | `deal_data` | Dollars to company, dollars to agent, volume, and deal counts live here. | Mapped |
| 17 | Company performer leaderboard | `/company-leaderboard` | `leads` | Visible ranking surface, but it is not reading the same executed truth as finance. | Mixed |
| 18 | MQY Build leaderboard | `/mqy-build` | MQY build RPCs | Builder competition / score logic belongs here. | Mapped |
| 19 | MQY Perform leaderboard | `/mqy-perform` | MQY perform RPCs | Performer competition / score logic belongs here. | Mapped |
| 20 | Competitions / pods | `/competitions` | leaderboard tables + `deal_data` | Pod and challenge logic is already a live management surface. | Mapped |
| 21 | Agent / manager control layer | `/agent-dashboards`, `/all-agents`, `/agents/:id`, `/admin` | `profiles` + `users_activity` + mixed production reads | This is how leadership sees who is active, who is slipping, and who is not even using the system. | Mapped |

## Recommended Signoff Order

Do these in this order:

1. goals and target math
2. shopping-list truth
3. pipeline and appointments
4. executed deals and company financial
5. rankings and competitions
6. agent adoption / usage

That order matches how future coaching agents will need to think.

## The First Questions AI OS Should Eventually Answer

Once the top 20 reads are signed off, AI OS should be able to answer:

- which agents are on pace for maintain, growth, or exponential goals
- which agents are on pace for maintain specifically by:
  - cash executed first
  - then signed clients
  - then apps set
- which agents are setting enough appointments
- which agents are getting clients signed
- which agents are executing deals but falling short in pipeline
- which agents have stale or weak shopping lists
- which agents are strongest in builder vs performer views
- which agents are not logging in or not maintaining their list
- whether company pace is on track against company goals

## Good Future Extensions

- company goal watcher
- agent KPI coach
- manager coaching surface
- shopping-list hygiene watcher
- login / adoption watcher
- FUB / KPI cross-checks
- HomeOptima / KPI cross-checks

## `SOURCE-010` Closeout

`SOURCE-010` is no longer about deciding whether KPI exists. It is closed for the current read-rule layer:

1. truth-layer boundaries are locked
2. first AI OS job reads are mapped to the correct tables/RPCs
3. Shopping List meaning, quality checks, and usage-vs-maintenance boundaries are documented

`KPI-HEALTH-001` v1 is now the operational health layer for that read model. It is intentionally read-only and checks the surfaces that would burn Steve in a meeting if they drifted:

- Load-bearing tables: `profiles`, `users`, `persons`, `appointments`, `leads`, `deal_data`, `goals`, `company_goals`, `expansion_goals`, `users_activity`, `admin_user_activity_reports`, `leaderboard_challenges`, `leaderboard_teams`, `leaderboard_team_members`.
- Load-bearing RPCs: `get_company_dashboard_stats`, `get_company_leads`, `get_company_appointments`, `get_team_mqy_build_metrics`, `get_team_mqy_perform_metrics`.
- Freshness windows are per source: current pipeline/activity tables are tight, goal and leaderboard setup tables are slower-moving, and stale windows are visible instead of treated as generic table-read success.
- Lee repo/Supabase schema drift means either live Supabase is missing an expected column/RPC output field or Lee's local `zahnd-team-dashboard` code/migrations no longer reference the expected KPI table/RPC.
- Primary surface: Foundation > Data Sources > APIs / Apps > KPI / Supabase Health.
- Runtime Health only raises a KPI warning if the health probe is unhealthy.
- Proof command: `npm run kpi:health`; build gate: `npm run foundation:verify`.

This still does not rebuild KPI, create Sales Hub coaching, or automate Action Router closure. Those are separate slices.

Audit checkpoint:

- [KPI system audit checkpoint](../handoffs/2026-04-20-kpi-system-audit-checkpoint.md)
