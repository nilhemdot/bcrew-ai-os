# FUBZahnd Middleware Logic

This note captures the Lee-built FUB middleware repo as source evidence for `SOURCE-021`.

Repo reviewed:

- GitHub: `Lee-InvIT/FUBZahnd`
- Local inspection copy: `/Users/bensoncrew/.inspection/FUBZahnd`
- Latest inspected commit: `e6816b2 Add files via upload`

Do not treat this repo as a runtime dependency yet. Treat it as legacy implementation evidence for how raw Follow Up Boss activity became KPI / Supabase opportunity semantics.

## Immediate Security Warning

The checked-in `App.config` contains live-looking integration credentials and connection strings.

Do not quote those values in docs or chat.

Required follow-up:

- rotate or prove retired any FUB API, FUB system-header, SMTP, SQL Server, and Supabase credentials committed in that public repo
- record the rotation result in `SECURITY-006`
- do not reuse this repo as a runnable integration until credentials are externalized

## What The Middleware Did

The system pulled from Follow Up Boss and wrote into a shaped database model for KPI / Ambition-style reporting.

Core FUB entities:

- people
- users
- calls
- text messages
- emails
- appointments
- deals
- person tags

Core database shape:

- `PersonID` = raw Follow Up Boss person ID
- `PID` = internal opportunity / active-person row ID
- `PersonUid` = generated unique ID exposed downstream when a FUB person has multiple internal opportunity records
- `UserID` = FUB user / assigned owner ID
- `Stage.LeadStage` = stage-level boolean that decides whether a stage is part of the lead/opportunity path
- `Stage.ClientStage` = stage-level boolean for client-state grouping

That confirms Steve's operating memory: the system was not just mirroring FUB. It was shaping FUB into an opportunity ledger where the same human can have more than one active-opportunity episode over time.

## Re-Entry Rule

Evidence:

- `Database/fub/Stored Procedures/up_InsertPerson.sql`
- `FUBProcessor.cs` method `InsertPersonToSupabase`
- KPI migration `20250908195859_on_conflict_persons.sql`

Rule:

- if an active record already exists for a FUB `PersonID`
- and the existing record's stage is not a lead stage
- and the new/current FUB stage is a lead stage
- then the old internal person/opportunity row is deactivated
- and a new active row is created for the same FUB `PersonID`

This is the business-critical distinction:

- one human can return as a new opportunity
- a new opportunity is not always a brand-new human
- AI OS must read `PID` / active row semantics, not only FUB `PersonID`

Supabase carries the same structural intent:

- `persons.pid` is the primary key
- `persons.personid` is the FUB person ID
- `persons.personuid` exists
- `ux_persons_personid_active` enforces only one active, non-deleted row per FUB person ID

## Lead Date Rules

Evidence:

- `up_InsertPerson.sql`
- KPI `Leads` page
- KPI `get_company_dashboard_stats` RPC
- KPI `get_company_leads` RPC
- KPI `How To` page

KPI counts leads from `persons`, not from the Shopping List table.

The KPI read rule is:

- count `leadclaimeddate` in the requested date window
- or, when `leadclaimeddate` is null, count `leaddate` in the requested date window
- require active records
- exclude deleted records

The middleware write rule is:

- `LeadDate` is set when the stage is `Lead` or any current stage marked `LeadStage = true`
- `LeadClaimedDate` is set when a record moves from FUB user ID `22` to any non-`22` user

That explains the pond/unclaimed-lead behavior:

- if an agent works older unclaimed leads and accepts five of them, KPI can count five claimed opportunities for that agent
- those are not five brand-new humans
- they are five agent-claimed opportunity episodes from the older/unclaimed pool

Open proof still needed:

- identify live user ID `22` in the current KPI / FUB user table
- verify whether it still represents the pond/unclaimed owner
- verify current live rows still populate `leadclaimeddate` through this rule or through a successor writer

## Stage Date Rules

`up_InsertPerson.sql` stores first-entered dates for many stages. Key mappings:

| Stage ID | Stored date field | Meaning |
| --- | --- | --- |
| `2` | `LeadDate` | Lead entered |
| `62` | `HotLeadNurtureDate` | Hot nurture |
| `4` | `WarmNurtureDate` | Warm nurture |
| `54` | `ColdNurtureDate` | Cold nurture |
| `56` | `AppointmentSetPreAppFollowUpDate` | Appointment set / pre-app follow-up |
| `55` | `AppointmentNoShowFollowUpDate` | No-show follow-up |
| `57` | `ActiveClientDate` | Active client |
| `7` | `ConditionalDealDate` | Conditional deal |
| `31` | `FirmDealDate` | Firm deal |
| `8` | `ClosedDate` | Closed |
| `39` | `PostCloseDate` | Post-close |
| `34` | `ContactNonLeadNonSupporterDate` | Non-lead / non-supporter bucket |
| `65` | `PossibleSupporterDate` | Possible supporter |
| `10` | `SupporterSOIDate` | Supporter / SOI |
| `9` | `PastClientDate` | Past client |
| `76` | `RealtorsVendorsDate` | Realtor / vendor contact |
| `82` | `OurTeamDate` | Internal team |
| `89` | `AppointmentNoShowDate` | Appointment no-show |
| `91` | `LeadDeletedDate` | Temporary deleted-lead cleanup |

Important caveat:

- exact current opportunity inclusion is controlled by `Stage.LeadStage`, not just the hardcoded stage IDs above
- the FUBZahnd repo includes the `Stage` table schema, but not the seed rows
- therefore `Active Client` cannot be fully settled from the repo alone
- live `stages` rows must be checked before closing the `Active Client` edge case

## Deleted Lead Rule

Evidence:

- `up_InsertPerson.sql`

`LeadDeletedDate` is set when a person enters stage ID `91`.

The stored procedure also contains a cleanup rule:

- if a person remains in stage `91` for more than `15` minutes
- set `Active = 0`

That confirms `Delete Lead` is a temporary cleanup mechanism, not a permanent business stage.

## Activity And First Contact

Evidence:

- `up_InsertCall.sql`
- `up_InsertTextMessage.sql`
- `up_InsertEmail.sql`
- `up_InsertTask.sql`
- `up_InsertAppointment.sql`
- `up_UpdatePersonFirstContact.sql`

Activity inserts update first contact only for active person records when:

- the FUB person is active
- the record was created between `08:00` and `20:30`
- the record is within `7` days of creation
- `FirstContactDate` is still null

This is why speed-of-response and first-touch reporting are a separate read from raw call/text/email counts.

## Appointment Rules

Evidence:

- `up_InsertAppointment.sql`
- KPI appointment pages and RPCs

The middleware maps appointment type + outcome into set/show/won dates.

Main tracked appointment types:

- `Listing Discovery Call`
- `Buyer Discovery Call`
- `Listing Consultation`
- `Buyer Consultation`
- `Support Network Discovery`
- `SOI/Supporter Hang Out/Go Deep Day`

Core win outcomes:

- discovery won when the discovery call outcome moves to consultation
- consultation won when the consult outcome is signed

Current Foundation rule:

- discovery and consultation outcomes are current KPI coaching truth
- support-network appointments are real business evidence, but their exact scoring / coaching role is later Sales Hub work

## Deal Pipeline Rules

Evidence:

- `up_InsertDeal.sql`
- `Deal.sql`

The middleware stores per-stage timestamps for buyer and seller deal pipelines:

- buyer not signed / signed / conditional / executed
- seller shadow / will sell / signed / conditional / executed
- upcoming closings
- closed deals
- post-close

This is separate from the Owners/finance ledger. It is useful CRM follow-up evidence, not the final source for executed-deal finance.

## Important Implementation Drift To Verify

The SQL Server stored procedure writes rich person semantics:

- stage-specific date fields
- `LeadDate`
- `LeadClaimedDate`
- `LeadDeletedDate`
- tag assignment/removal state
- re-entry deactivation and new record creation

The checked-in C# direct Supabase writer appears to write the re-entry active-row behavior, but only basic person fields in `InsertPersonToSupabase`.

2026-05-02 proof pass:

- `Lee-InvIT/FUBZahnd` `origin/main` still points at `e6816b2`; the local inspection copy is not behind the public repo.
- `FUBProcessor.cs` calls `fub.up_InsertPerson` for person events before `InsertPersonToSupabase(person)`.
- `fub.up_InsertPerson` is the checked-in writer that explains the rich date fields:
  - `LeadDate` is written on a new/re-entered row when the current stage is `Lead` or any stage marked `LeadStage = true`.
  - on ordinary updates, `LeadDate` is preserved except when a row newly enters stage `Lead`.
  - `LeadClaimedDate` is written when an existing row moves from user ID `22` to a non-`22` user.
- `InsertPersonToSupabase` does **not** write `leaddate`, `leadclaimeddate`, `activeclientdate`, or the other rich stage-date fields. It writes basic person identity, owner, stage, source, contact, update/error state, and active-row re-entry.
- The KPI dashboard repo reads `leadclaimeddate` first, then `leaddate`; it does not contain a richer person-date writer.
- Live Supabase still receives current rich date values: on 2026-05-02, rows existed with `leaddate >= 2026-04-27` and `leadclaimeddate >= 2026-04-27`, and recent active lead-stage rows created since 2026-04-27 were not missing `leaddate`.

Current honest status:

- The field semantics are proven well enough for AI OS reads and coaching language.
- The exact production path that copies or writes the rich date fields into live Supabase is **not** proven from current local access.
- The available evidence points to a Lee/FUBZahnd-compatible upstream writer, but the checked-in direct Supabase helper is not that complete writer.
- Do not rebuild or write this pipeline until one of these is obtained:
  - current production FUB sync runner source or deployment package
  - SQL Server Agent / scheduled job proof for the active `fub.up_InsertPerson` pipeline
  - direct live Postgres metadata/log access proving the Supabase-side writer or replication path
  - Lee confirmation with the current deployed writer path and where it runs

## AI OS Read Contract

Before answering Sales Hub questions about lead generation, opportunity creation, or agent pace:

1. use `persons`, not `leads`, for FUB pipeline lead-flow counts
2. count opportunity timing through `leadclaimeddate` first, then `leaddate`
3. preserve `PersonID` vs `PID` distinction
4. treat non-lead to lead-stage transition as a potential new opportunity episode
5. do not treat raw "new person added" as true opportunity creation
6. do not infer current doctrine from stage names alone; check `Stage.LeadStage` plus founder-approved doctrine
7. use `deal_data` for executed-deal finance, not the FUB deal pipeline

## `SOURCE-021` Status After 2026-05-02 Proof Pass

- current live `stages` rows were queried on `2026-04-26`: `Active Client`, `Conditional Deal`, and `Firm Deal` are marked `leadstage = true`; no rows are marked `clientstage = true`
- user ID `22` was identified in KPI as active `Benson Crew Assistant`
- a live FUB/KPI/Owners proof matched `53 / 53` FUB-linked Owners deal groups to KPI `persons`, and `53 / 53` to KPI `deal_data`
- second-pass live Supabase proof found `16645 / 16657` active lead-stage rows have `leaddate`, `2451` active non-deleted rows have `leadclaimeddate` with current user not `22`, and latest sampled `leadclaimeddate` rows were updated on `2026-04-26`
- read proof for `leaddate` / `leadclaimeddate` is strong enough for AI OS to use those fields in Sales/KPI reads
- 2026-05-02 live Supabase proof found `82403` active non-deleted `persons`, `16647` active lead-stage rows, `16635` active lead-stage rows with `leaddate`, `6013` active non-deleted rows with `leadclaimeddate`, `102` rows with `leaddate >= 2026-04-27`, `32` rows with `leadclaimeddate >= 2026-04-27`, and `0 / 95` recent active lead-stage rows created since 2026-04-27 missing `leaddate`
- 2026-05-02 `Active Client` proof found stage `57` is `leadstage = true` and `clientstage = false`; `310` active `Active Client` rows existed, `308` had `leaddate`, and `16` had `leadclaimeddate`
- coaching language is now locked: `leaddate` means an opportunity episode entered the KPI lead-stage path; `leadclaimeddate` means the opportunity was claimed or ownership changed from the unclaimed/pond path; neither field by itself proves an agent created a brand-new human lead
- `Active Client` belongs to the KPI opportunity path, but coaches must describe it as active-client/downstream opportunity context, not as fresh lead creation
- writer ownership remains paused, not closed: the checked-in C# Supabase writer proves active-row re-entry behavior but does not explain live rich date-field writes; the missing proof is the exact production writer/replication path into live Supabase
- add a governed Sales Hub read that uses this contract instead of reverse-engineering it each time
- runnable proof: `npm run process:source-021-writer-proof-check`

See [FUB / KPI / Deal Data Connection Map](fub-kpi-deal-connection-map.md).
