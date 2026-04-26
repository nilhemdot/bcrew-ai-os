# FUB / KPI / Deal Data Connection Map

This note captures the live connection proof between Follow Up Boss, Lee's KPI/Supabase system, Owners/Admin Deal Data, and ClickUp Deal Data Entry.

Use this note before building Sales Hub, agent coaches, CRM replacement logic, or strategy answers that depend on lead/opportunity/deal truth.

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
- KPI `persons` matched for FUB-linked Owners groups: `53 / 53`
- KPI `deal_data` matched for FUB-linked Owners groups: `53 / 53`
- KPI `appointments` existed for FUB-linked Owners groups: `37 / 53`
- FUB-linked groups with multiple KPI `persons` rows for the same FUB `PersonID`: `8 / 53`
- FUB-linked groups with `leadclaimeddate` on the active KPI person row: `6 / 53`
- Owners-vs-FUB source mismatches in the audited FUB-linked set: `18 / 53`
- ClickUp Deal Data Entry tasks read: `1647`
- ClickUp tasks with a `Deal #` value: `1210`
- ClickUp `Deal #` matches for the audited FUB-linked Owners groups: `0 / 53`

Important read:

- The FUB -> KPI -> Owners chain is strong where Owners has a FUB link.
- The ClickUp follow-through chain is live as a source, but Trade Number coverage is not yet strong enough for this FUB-linked proof set.
- Missing ClickUp joins should be treated as Ops workflow/data-linkage findings, not as evidence that FUB/KPI/Owners are disconnected.

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
- ClickUp is not yet reliable as an automatic cross-system proof layer for every FUB-linked deal.
- Ops follow-through checks should continue surfacing missing ClickUp joins as findings.
- A cleanup pass should improve `Deal #` coverage on high-value current deal tasks.

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
