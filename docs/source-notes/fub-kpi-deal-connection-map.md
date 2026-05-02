# FUB / KPI / Deal Data Connection Map

This note captures the live connection proof between Follow Up Boss, Lee's KPI/Supabase system, Owners/Admin Deal Data, and ClickUp Deal Data Entry.

Use this note before building Sales Hub, agent coaches, CRM replacement logic, or strategy answers that depend on lead/opportunity/deal truth.

## Foundation Grouped System Map

This note is the grouped Foundation view for the Sales Data / KPI-FUB-Deal system.

It is not a replacement source contract. It connects the individual contracts and source notes so future AI OS work can reason across the whole sales chain without flattening the system into one vague "CRM data" bucket.

Grouped system:

- `SALES-DATA-KPI-FUB-DEAL`

Business job:

- understand and coach the path from person to opportunity to appointment to Shopping List to executed deal to Ops follow-through
- preserve the difference between CRM human identity, KPI opportunity episodes, appointments, active working opportunities, executed deal math, and Ops tasks
- support future Sales Hub, agent KPI coach, source hygiene assistant, and eventual CRM replacement work

Connected source contracts:

| Source ID | Role in grouped system | Detail note |
| --- | --- | --- |
| `SRC-FUB-001` | CRM person/contact truth, stage/source/tag/assigned-user context, referral/source lineage, support-network hygiene | [Follow Up Boss](follow-up-boss.md) |
| `SRC-SUPABASE-001` | KPI app database: `persons`, `appointments`, Shopping List `leads`, `deal_data`, goals, competitions, usage | [KPI Dashboard / Supabase](kpi-dashboard.md) |
| `FUBZahnd` code evidence | Lee middleware implementation proof for FUB -> KPI translation, opportunity re-entry, and `leaddate` / `leadclaimeddate` behavior | [FUBZahnd middleware](fub-zahnd-middleware.md) |
| `SRC-OWNERS-001` | governed transaction ledger, source-row correction surface, split/cash/trade-number deal truth | [Owners Dashboard](owners-dashboard.md) |
| `SRC-OWNERS-LISTS-001` | governed source dropdown/list data and active-agent roster inputs flowing into Owners/Admin | [BHAG Builder Lists](bhag-builder-lists.md) |
| `SRC-CLICKUP-001` | deal workflow/accountability follow-through, conditional forecast inputs, Agent Roster, review/NPS task fields | [ClickUp](clickup.md) |
| `SRC-MEETINGS-001` | coaching doctrine evidence from leadership, sales, and agent coaching calls | [Meeting source boundary](../source-registry.md) |

Repeatable proofs and audits:

- `npm run connection:audit`
- `npm run kpi:data-quality`
- `npm run kpi:shopping-list`
- `npm run deal-review:admin`
- `npm run deal-review:conditional`

Tracked backlog / next work:

- `SOURCE-010` - KPI read rules locked
- `SOURCE-021` - FUB/KPI opportunity semantics
- `SOURCE-017` - FUB source lineage and support-network doctrine
- `KPI-APPT-QUALITY-001` - appointment stacking / outcome hygiene
- `KPI-LEAD-VALIDATION-001` - fake-lead and source validation
- `KPI-SHOPPING-001` - Shopping List weekly discipline
- `KPI-HEALTH-001` - KPI freshness / schema / code drift health
- `OPS-008` - ClickUp Deal Data Entry Trade Number coverage
- `SALES-004` - future agent-facing KPI coach / daily nugget loop
- `SALES-005` - agent-authorized KPI/FUB fix and apply layer
- `CONNECTOR-CREDENTIAL-001` - no-secret connector preflight registry

Read boundary:

- read the individual source notes for per-source meaning
- use this grouped map only when the question crosses systems
- do not create a new source ID just because the business question spans multiple sources
- if a cross-system rule becomes operational, promote it into a script, backlog card, verifier, or source-specific note

## Live Proof Snapshot

Command:

```bash
npm run connection:audit -- --limit=80
```

Run date: `2026-04-26`

Connectors proven live:

- Follow Up Boss owner context
- KPI Supabase project
- Owners Dashboard / Admin sheet through delegated Google access
- ClickUp Deal Data Entry list

Read-only audit results:

- Owners deal groups read: `1300`
- Owners rows read: `1429`
- Owners deal groups with a direct FUB person ID: `53`
- Owners deal groups matching ClickUp by `Deal #` across the full Admin range: `1097`
- KPI `persons` matched for FUB-linked Owners groups: `53 / 53`
- KPI `deal_data` matched for FUB-linked Owners groups: `53 / 53`
- KPI `appointments` existed for FUB-linked Owners groups: `37 / 53`
- FUB-linked groups with multiple KPI `persons` rows for the same FUB `PersonID`: `8 / 53`
- FUB-linked groups with `leadclaimeddate` on the active KPI person row: `6 / 53`
- Owners-vs-FUB source mismatches in the audited FUB-linked set: `18 / 53`
- ClickUp Deal Data Entry tasks read: `1647`
- ClickUp tasks with a `Deal #` value: `1210`
- ClickUp `Deal #` matches for the audited FUB-linked Owners groups: `0 / 53`
- ClickUp address fallback matches for the audited FUB-linked Owners groups: `48 / 53`

Important read:

- The FUB -> KPI -> Owners chain is strong where Owners has a FUB link.
- The ClickUp follow-through chain is live as a source, and the `Deal #` join works broadly across Owners.
- The weak spot is narrower: the FUB-linked proof set mostly has matching ClickUp tasks by address, but those tasks are missing or mis-keyed on `Deal #`.
- Missing exact ClickUp joins should usually be treated as Trade Number cleanup, not as evidence that the task does not exist.

## Source Roles

| Layer | Owns | Does not own |
| --- | --- | --- |
| Follow Up Boss | CRM human, current stage, source, assigned user, tags, contact context | final deal economics or split truth |
| FUBZahnd middleware | translation from raw FUB people/activity into opportunity rows, stage dates, and lead-claimed logic | current production runtime unless live writer path is separately proven |
| KPI `persons` | opportunity episode truth: `PID`, active row, FUB `PersonID`, current stage, source, `leaddate`, `leadclaimeddate` | final deal economics |
| KPI `appointments` | discovery/consult set-show-signed activity connected to FUB `personid` | final client/deal finance |
| KPI `leads` | Shopping List / active-opportunity management and score/action-plan discipline | raw lead creation or executed-deal finance |
| KPI `deal_data` | executed-deal reporting layer used by KPI dashboards | source correction workflow and sheet review state |
| Owners/Admin | governed transaction ledger: Trade Number, split math, cash, final source-row correction, FUB link | raw CRM stage/activity |
| ClickUp Deal Data Entry | Ops workflow and post-policy follow-through tasks by `Deal #` | final transaction economics or CRM truth |

## Join Keys

Critical joins:

- Owners Admin `Client Follow UP Boss ID` -> FUB person ID.
- FUB person ID -> KPI `persons.personid`.
- KPI active opportunity episode -> `persons.pid`.
- KPI appointment activity -> `appointments.personid`.
- Owners Admin `Deal #` -> KPI `deal_data.deal_number`.
- Owners Admin `Deal #` -> ClickUp Deal Data Entry `Deal #`.

Do not collapse these:

- FUB `PersonID` is the human.
- KPI `persons.pid` is the internal opportunity episode.
- Owners `Deal #` is the transaction.
- ClickUp task ID is the workflow task.

## Live Stage Table Proof

The KPI `stages` table currently has `39` rows.

Rows marked `leadstage = true`:

- `2` — `Lead`
- `4` — `Warm Nurture (3-6)`
- `7` — `Conditional Deal`
- `31` — `Firm Deal`
- `54` — `Cold Nurture (6-12)`
- `55` — `Appointment - No Show Follow Up`
- `56` — `Appointment`
- `57` — `Active Client`
- `62` — `Hot Lead/Nurture (0-3)`

Rows marked `clientstage = true`: `0`

Implication:

- The live KPI stage table treats `Active Client`, `Conditional Deal`, and `Firm Deal` as lead-stage path rows.
- For AI coaching, this does not mean "celebrate every current Active Client as a new lead."
- It means KPI/FUB opportunity history can include those stages inside the same opportunity path. Coaching still needs the `leaddate`, `leadclaimeddate`, `PID`, and current-stage context.

## Pond / Claimed Lead Proof

The live KPI `users` table contains user ID `22`:

- `userid`: `22`
- `username`: `Benson Crew Assistant`
- `active`: `true`

This confirms the Lee middleware rule has a live counterpart:

- when a record moves from user ID `22` to another user, `leadclaimeddate` can be set
- agent-claimed pond/recycle opportunities are not the same as brand-new humans
- Sales Hub and agent coaches must distinguish `leaddate` from `leadclaimeddate`

Second-pass live proof:

- active, non-deleted KPI `persons`: `81195`
- active lead-stage KPI `persons`: `16657`
- active lead-stage rows with `leaddate`: `16645`
- active non-deleted rows with `leadclaimeddate` and current user not `22`: `2451`
- active rows still owned by user `22`: `54779`
- latest sampled `leadclaimeddate` rows were updated on `2026-04-26`

Read implication:

- AI OS can read `leadclaimeddate` as live evidence, not just legacy theory.
- Do not treat `leadclaimeddate` as only current lead-stage evidence. Claimed opportunities can later move into non-lead stages while retaining the claim date.
- 2026-05-02 proof tightened the read/coaching contract and paused the writer-path closeout honestly:
  - `fub.up_InsertPerson` is the checked-in Lee/FUBZahnd writer that explains `LeadDate` and `LeadClaimedDate` semantics.
  - the checked-in direct Supabase helper does not write `leaddate`, `leadclaimeddate`, `activeclientdate`, or other rich stage-date fields.
  - live Supabase is still receiving current rich date values: `102` rows had `leaddate >= 2026-04-27`, `32` rows had `leadclaimeddate >= 2026-04-27`, and `0 / 95` recent active lead-stage rows created since 2026-04-27 were missing `leaddate`.
  - exact production writer/replication path into live Supabase is still the missing proof; do not rebuild or write this pipeline until that path is identified.

Plain-English coaching language:

- Say "new opportunity episode" when `leaddate` is the timing proof.
- Say "claimed/recycled opportunity" or "claimed from the older/unclaimed pool" when `leadclaimeddate` is the timing proof.
- Do not say "the agent created a lead" unless the record proves a brand-new human entered the system as a real opportunity.
- If the current stage is `Active Client`, describe it as downstream active-client context inside the KPI opportunity path. Do not count the current label alone as fresh lead creation.
- Use `PID`, `PersonID`, `leadclaimeddate`, `leaddate`, current stage, and source hygiene together before praising or diagnosing lead generation.

## What The Proof Establishes

For FUB-linked Owners rows, the chain is real:

1. Owners row has `Deal #` and FUB person ID.
2. FUB person is readable.
3. KPI `persons` has the same `personid`.
4. KPI active `persons.pid` carries the opportunity episode.
5. KPI `appointments` can be counted by `personid`.
6. KPI `deal_data` can be joined by `Deal #`.

The strongest current read:

- FUB and KPI are consistent for stage/source on the audited linked set.
- Owners/Admin sometimes disagrees with FUB/KPI on source.
- Multiple KPI `persons` rows for the same FUB person prove re-entry/multiple-episode behavior exists live, not only in old code.
- `leadclaimeddate` exists live on audited rows, proving claimed/recycled opportunity timing is not theoretical.

## Current Gaps

### ClickUp Trade Number Coverage

ClickUp is readable and populated, but the audited FUB-linked Owners set did not join to ClickUp by `Deal #`.

This means:

- ClickUp is still a valid Ops workflow source.
- ClickUp is not broken as a connector or source.
- `1097 / 1300` Owners deal groups match ClickUp by `Deal #`, so the join key works broadly.
- `48 / 53` audited FUB-linked deal groups match ClickUp by address but not `Deal #`.
- Ops follow-through checks should distinguish:
  - task exists by address, but `Deal #` is blank or wrong
  - no task exists by `Deal #` or address
- A cleanup pass should improve `Deal #` coverage on high-value current deal tasks before using ClickUp as hard follow-through proof for Sales/Ops intelligence.

### Owners/FUB Source Drift

The audited FUB-linked set had `18 / 53` Owners-vs-FUB source mismatches.

This means:

- source mismatch is not a rare edge case
- future Sales Hub should not blindly use either source alone for attribution
- source conflicts should route as lineage cleanup or attribution review depending on governed source ownership

## AI Read Contract

When answering sales strategy, production, or coaching questions:

1. Use FUB `PersonID` for the human.
2. Use KPI `persons.pid` for the opportunity episode.
3. Use `leadclaimeddate` first, then `leaddate`, when explaining lead timing.
4. Use KPI `appointments` for discovery/consult movement.
5. Use KPI `leads` only for Shopping List discipline, score, action plan, and active working-opportunity quality.
6. Use KPI `deal_data` and Owners/Admin for executed-deal / finance truth; prefer Owners/Admin when source-row correction, split math, or cash fields conflict.
7. Use ClickUp for Ops follow-through only after the task joins by `Deal #`; otherwise flag the missing join.
8. Compare Owners source against FUB/KPI source before making attribution claims.
9. Do not treat a new opportunity as a brand-new human unless the record proves it.
10. Preserve re-entry: one FUB person can create more than one KPI opportunity episode over time.
11. Treat `Active Client` as part of the KPI opportunity path, not as automatic evidence of a newly created lead.

## First Atom Shape

This connection map suggests the first Sales/CRM atoms should be:

- `crm_person_seen`
- `opportunity_episode_created`
- `opportunity_episode_reentered`
- `opportunity_claimed`
- `stage_entered`
- `appointment_set`
- `appointment_held`
- `client_signed`
- `deal_firmed`
- `deal_closed`
- `cash_collected`
- `lead_source_conflict_detected`
- `clickup_followthrough_missing`
- `coaching_signal_created`

Do not build these atoms as isolated theory. Build them from the join rules above.
