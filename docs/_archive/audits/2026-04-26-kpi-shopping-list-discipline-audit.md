# 2026-04-26 KPI Shopping List Discipline Audit

Purpose: turn the Shopping List coaching doctrine into a repeatable read-only audit for Sales Hub and future agent assistant signals.

This is an aggregate audit. Agent/client-level samples are intentionally left out of this tracked doc.

## Command

```bash
npm run -s kpi:shopping-list -- --topLimit=0 --sampleLimit=0
```

## Connector Proof

- KPI Supabase project: `ayqykfsapzgqmqrrhque.supabase.co`
- Table: `leads`
- Audit mode: read-only

## Live Snapshot

- total Shopping List rows: `673`
- active rows: `293`
- closed rows: `380`
- closed executed rows: `376`
- closed fell-through rows: `4`
- active signed rows: `137`
- active high-score rows (`score >= 7`): `91`
- active stale high-score rows (`7+` and older than `60` days): `16`
- active rows past their score-specific expected window: `36`
- active blank action-plan rows: `49`
- active high-score blank action-plan rows: `17`
- active missing score rows: `0`
- active missing type rows: `0`
- active missing estimated-economics rows: `2`
- duplicate active client clusters: `35`
- duplicate active client rows: `85`
- closed execution drift rows: `1`

Score-window expired rows:

- score `10`: `1`
- score `9`: `5`
- score `8`: `8`
- score `7`: `5`
- score `6`: `5`
- score `5`: `12`

## Interpretation

- The Shopping List is live and useful, but weekly discipline is uneven.
- Blank action plans are not cosmetic. They remove the operating plan from the list that should guide weekly coaching.
- High-score stale rows are high-signal because the KPI app uses active Shopping List rows with `score >= 7` as a key active-opportunity layer.
- Score-specific windows catch some risks earlier than a generic `60+ day` stale check.
- Duplicate active rows should trigger a question first because buy/sell, multiple properties, and separate opportunity paths can be legitimate.

## Source Evidence

The business doctrine is backed by more than Steve's current chat explanation.

Evidence already found in `SRC-MEETINGS-001` includes:

- `Sales Team Meeting - Survey & Shopping List` on `2025-05-27`
- `Weekly Leadership Meeting - Review the Week and Plan The Next` on `2025-01-10`
- `Aidan / Steve` on `2026-04-07`
- `The Morning Huddle` on `2026-04-17`
- Sofia coaching artifacts from January and February `2026`

Those artifacts support the core rule: agents should review active Shopping List clients weekly, keep scores honest, and maintain a specific next action plan for each meaningful opportunity.

## Durable Rules Confirmed

- Shopping List reads come from KPI `leads`, not FUB `persons`.
- Pipeline and appointment reads still come from `persons` and `appointments`.
- Executed-deal finance reads still come from `deal_data` and Owners/Admin.
- KPI-native write opportunities are mainly goals and Shopping List.
- The first Shopping List assistant workflow should collect or suggest action plans, not silently overwrite rows.

## Backlog Impact

- `KPI-SHOPPING-001` now has a repeatable script and live proof.
- `SALES-005` remains the apply-layer destination for future agent-authorized Shopping List writes.
- `SALES-004` should use these signals when defining the daily nugget / agent KPI coach loop.
