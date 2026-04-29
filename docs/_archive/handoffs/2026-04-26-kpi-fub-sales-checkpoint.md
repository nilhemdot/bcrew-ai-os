# 2026-04-26 KPI / FUB / Sales Data-Quality Checkpoint

Created: 2026-04-26 12:25 EDT

Purpose: preserve the full conversation review after the source-automation checkpoint, especially the FUB/KPI/Deal connection work, Steve's KPI operating doctrine, the credential/preflight correction, and the next deep-pass sequence.

This is a high-fidelity checkpoint, not a raw transcript export.

## Startup For Next Chat

Use this prompt in a fresh chat:

```text
We are in /Users/bensoncrew/bcrew-ai-os.

Read AGENTS.md, SOUL.md, USER.md, MEMORY.md, memory/2026-04-26.md, memory/2026-04-25.md, docs/handoffs/2026-04-26-source-automation-checkpoint.md, and docs/handoffs/2026-04-26-kpi-fub-sales-checkpoint.md.

Continue from latest main. Do not overwrite uncommitted work. First check git status, foundation verification health, live backlog cards named in this handoff, and source/credential preflight for the job Steve asks for. If a required key/source is missing, stop and say exactly what is missing instead of doing a partial audit.

Default next lane: continue Current State / strategy readiness, unless Steve asks for the next KPI/FUB deep pass.
```

## What Was Already Solid Before This Checkpoint

Source automation checkpoint already proved:

- Gmail and Missive current-day syncs run every `120` minutes.
- Meeting current-day sync is scheduled daily.
- Slack current-day sync is scheduled daily.
- Gmail/Missive/meeting/Slack candidate extraction are scheduled daily quota missions.
- Drive corpus inventory is scheduled daily.
- `foundation:verify` passed `61/61`.

Known source gaps were already promoted:

- `DRIVE-CONTENT-001`: Drive Docs/PDF content extraction is not built yet.
- `EMAIL-ATTACHMENTS-001`: Gmail/Missive attachment extraction is not built yet.
- `MEETING-VIDEO-001`: meeting-linked videos/recordings are not reviewed yet.
- `MULTIMODAL-EXTRACTOR-001`: YouTube/channels, Loom, Skool, Drive/meeting videos, Zoom recordings, demos, screenshots, transcripts, and related training/course material need one governed multimodal extraction contract.
- `EXTRACT-RETIRE-001`: history/corpus jobs need an auto-retire / pause condition when the backlog queue is empty.

Steve explicitly approved multimodal/video extraction in principle. The guardrail is budgeted, observable, quota-controlled execution, not avoiding spend.

## Credential / Key Correction

Steve was right to push hard on this: if he already gave keys, the system should not act as if they are unknown.

What this session proved for the FUB/KPI/Deal audit:

- required connectors for this job were present:
  - Follow Up Boss owner/Steve contexts
  - KPI Supabase
  - delegated Google access for Owners/Admin
  - ClickUp
- no key was missing for the FUB/KPI/Deal connection work

New backlog card:

- `CONNECTOR-CREDENTIAL-001` — Create connector credential inventory and preflight checks
  - no secrets in repo truth
  - track required env var / provider / account owner / last probe / workload unlocked
  - run preflight before deep audits
  - stop with a clear blocker if a required credential is missing

This complements security rotation cards:

- `SECURITY-001`: exposed MCP secret rotation proof.
- `SECURITY-006`: rotate or prove retired credentials exposed in Lee's public `FUBZahnd` repo.

## FUB / KPI / Owners / ClickUp Connection Proof

Durable note:

- `docs/source-notes/fub-kpi-deal-connection-map.md`

Command:

```bash
npm run connection:audit -- --limit=80
```

Live proof on 2026-04-26:

- Owners deal groups read: `1300`
- Owners rows read: `1429`
- Owners groups with direct FUB person ID: `53`
- KPI `persons` matched for FUB-linked Owners groups: `53 / 53`
- KPI `deal_data` matched for FUB-linked Owners groups: `53 / 53`
- KPI `appointments` existed for FUB-linked Owners groups: `37 / 53`
- multiple KPI `persons` rows for same FUB person: `8 / 53`
- active KPI person rows with `leadclaimeddate`: `6 / 53`
- Owners-vs-FUB source mismatches: `18 / 53`

ClickUp nuance:

- ClickUp Deal Data Entry is readable and populated.
- ClickUp tasks read: `1647`
- ClickUp tasks with `Deal #`: `1210`
- full Owners/Admin groups matching ClickUp by `Deal #`: `1097 / 1300`
- FUB-linked audited groups matching ClickUp by `Deal #`: `0 / 53`
- FUB-linked audited groups matching ClickUp by address fallback: `48 / 53`

Interpretation:

- ClickUp is not broadly broken.
- The weak spot is task-level `Deal #` / Trade Number coverage in the FUB-linked proof set.
- Treat most of those as "task exists by address but missing/wrong Deal #" before treating them as "task does not exist."

Backlog:

- `OPS-008` now tracks ClickUp Deal Data Entry Trade Number cleanup for linked/current deals.

## Lee FUBZahnd / Opportunity Semantics

Durable note:

- `docs/source-notes/fub-zahnd-middleware.md`

Local inspected repo:

- `/Users/bensoncrew/.inspection/FUBZahnd`

Key understanding:

- FUB `PersonID` is the human.
- KPI `persons.pid` is the opportunity episode.
- A single FUB person can have more than one KPI opportunity episode over time.
- User ID `22` is live as `Benson Crew Assistant`.
- `leadclaimeddate` is set when an opportunity moves from old unclaimed/pond owner `22` to a real agent, according to Lee's SQL evidence.
- `leaddate` and `leadclaimeddate` must be separated before praising lead generation.

Second-pass live KPI proof:

- active non-deleted KPI `persons`: `81195`
- active lead-stage KPI `persons`: `16657`
- active lead-stage rows with `leaddate`: `16645`
- active non-deleted rows with `leadclaimeddate` and current user not `22`: `2451`
- active rows still owned by user ID `22`: `54779`
- latest sampled `leadclaimeddate` rows were updated on `2026-04-26`

Open caution:

- the checked-in C# Supabase writer proves active-row re-entry and basic fields
- it does not fully explain every rich date-field write in the live current system
- current writer ownership remains open before AI OS writes or rebuilds the pipeline

Backlog:

- `SOURCE-021` is still the active P0 for FUB lead semantics writer-path proof and coaching language.

## KPI How-To / Agent Error Doctrine

Durable note:

- `docs/source-notes/kpi-dashboard.md`

Source evidence:

- KPI How-To page: `https://kpi.bensoncrew.ca/how-to`
- local KPI frontend code: `/Users/bensoncrew/.inspection/zahnd-team-dashboard/src/pages/HowTo.tsx`
- outcome rules: `/Users/bensoncrew/.inspection/zahnd-team-dashboard/src/utils/appointmentUtils.ts`
- founder clarification on 2026-04-26

Important: the local code was enough for doctrine/code proof. A live frontend login pass can still be done later to prove exactly what agents see in production.

Steve's critical KPI data-entry failures:

1. Appointment stacking:
   - agents create multiple discovery/consult appointments for one client/opportunity
   - they should usually move/update the original appointment and set the final outcome
   - stacking ten appointments and one signed client makes conversion look like `10%` when the real motion was one opportunity with multiple touches

2. Missing appointment outcomes:
   - agents do not update no-show/lost/signed/back-to-nurture/etc. after the meeting

3. Wrong appointment outcomes:
   - agents choose non-standard or wrong outcomes even though the How-To page explains the allowed choices

4. Lead validation failures:
   - FUB auto-creates leads when people are added
   - agents can add realtors, vendors, support-network contacts, duplicates, or other non-leads
   - if they do not move those records out quickly, KPI can count fake leads
   - KPI exposes lead/source views, but agents often ignore them

5. Shopping List discipline:
   - the Shopping List is critical
   - it must be updated weekly
   - Reilly Mitchell and Sofia Fischman coaching calls explain the intended behavior and should be mined from Drive/meeting archives before final coaching language is locked

Live appointment-quality proof:

- active appointment rows: `3442`
- missing outcomes: `951 / 3442`
- non-standard outcomes: `53`
- same-person/same-appointment-type stacks: `289` groups
- rows inside those stacked groups: `838`
- current-year active appointment rows: `798`
- current-year missing outcomes: `284 / 798`

Live lead-validation proof:

- exact active lead-stage check returned `13005` rows
- source `Import`: `4497`
- source `<unspecified>`: `1647`
- null source: `2`
- KPI code contains source validation helpers, but the relevant sections are commented out / disabled in `dataFetching.ts`

Important caveat:

- source text alone is not enough to accuse an agent
- `Realtor.ca` source is not the same thing as a realtor/person incorrectly left as a lead
- fake-lead detection needs stage, source, tags/person type, owner, timing, and cleanup-window context

Follow-up founder correction after checkpoint:

- `Import`, `<unspecified>`, generic `Sphere`, `SOI`, and similar placeholders are not valid final lead-source truth.
- `<unspecified>` is quarantine only.
- Generic `Sphere` must be decomposed into a real source path such as Family, Met - In Person, Met - Social Media, Referral, Introduction, or another governed FUB-compatible source.
- If the source is referral or introduction, the assistant should ask who introduced/referred the person, search for that origin person in FUB, and offer to add/connect them when write permissions exist.
- If the source is Met - In Person, ask where/how they met.
- If the source is Met - Social Media, ask which platform and useful context.
- Store the supporting detail in FUB's secondary/source-support fields and preserve Ground Zero so attribution can trace back to the original relationship/source.
- The live `fub_lead_source_rules` row for `Sphere` was corrected to `not_canonical` after this clarification because generic `Sphere` is a relationship bucket, not final attribution.

Follow-up appointment clarification after checkpoint:

- multiple appointments for the same person inside roughly `60` to `90` days should trigger a coaching question, not an automatic failure
- legitimate exceptions include buy+sell clients, multiple properties, or genuinely separate opportunity/deal paths
- buy+sell can count as two appointment/outcome tracks because it leads to two deals, even if the agent met with the client once
- if the context proves the records are really one opportunity with repeated meetings, coach the agent to move/update the original appointment and outcome instead of creating a new appointment record

Backlog created / enriched:

- `KPI-APPT-QUALITY-001` P0 — appointment stacking, missing outcomes, wrong outcomes.
- `KPI-LEAD-VALIDATION-001` P0 — fake/unvalidated leads and lead-source quality.
- `KPI-SHOPPING-001` P1 — Shopping List weekly discipline and coaching-source mining.
- `SALES-004` P1 — future agent-facing KPI coach and daily nugget loop.
- `SALES-005` P1 — agent-authorized KPI/FUB suggested-fix and apply layer.

## Agent Coach / Future CRM Direction

Steve's direction:

- the goal is not only to report problems
- the assistant should help agents understand what is wrong
- eventually, after signup/account connection/API key/permission, it should update things for them
- this is part of the longer path toward replacing scattered CRM/SaaS surfaces like GHL/FUB with a more integrated AI OS

AI OS rule:

- build reliable read/audit signals first
- then produce suggested fixes with evidence
- then add explicit agent-authorized apply/write paths with audit logs, preview, approval boundaries, rollback/escalation, and manager/Ops review where needed
- never silently mutate KPI/FUB/CRM data just because the assistant detected a likely issue

Follow-up write-surface clarification after checkpoint:

- eventually the assistant can help across every connected system where permissions and confidence exist
- v1 should write only where the system is confident
- most KPI production truth is downstream from FUB / Lee's database, so source/stage/contact hygiene should usually write to FUB first and then flow into KPI
- KPI-native write surfaces are mainly goals and Shopping List
- Shopping List is the biggest first KPI-native write opportunity: a Monday-style assistant workflow can ask an agent about clients, collect or suggest action plans, and help push opportunities down the field
- if the current KPI app lacks safe endpoints for this, BCrew owns the code and should ask Aidan/Lee to review and implement the endpoints rather than bypass the application boundary

## Knowledge Bases Updated

Tracked docs updated:

- `docs/source-notes/fub-kpi-deal-connection-map.md`
- `docs/source-notes/fub-zahnd-middleware.md`
- `docs/source-notes/kpi-dashboard.md`
- `docs/source-notes/clickup.md`
- generated indexes:
  - `docs/INDEX.md`
  - `docs/handoffs/INDEX.md`
  - `docs/audits/INDEX.md`

Code / tooling updated:

- `scripts/audit-fub-kpi-deal-connection.mjs`
- `package.json` already exposes `npm run connection:audit`
- `lib/foundation-db.js` seed updated for new/enriched backlog cards

Live DB updated:

- `SOURCE-021`
- `OPS-008`
- `KPI-APPT-QUALITY-001`
- `KPI-LEAD-VALIDATION-001`
- `KPI-SHOPPING-001`
- `SALES-004`
- `SALES-005`
- `CONNECTOR-CREDENTIAL-001`

Local-only memory updated:

- `memory/2026-04-26.md`

## Verification

Latest pushed commits before this checkpoint:

- `60885fe Add FUB KPI deal connection audit`
- `3e608db Deepen KPI sales data-quality audit`

Verified:

- `node --check scripts/audit-fub-kpi-deal-connection.mjs`
- `node --check lib/foundation-db.js`
- `npm run -s connection:audit -- --limit=80`
- `npm run -s foundation:verify` passed `61/61`
- `git diff --check`

## Next Deep Pass Completed

After this checkpoint, the first recommended pass was completed.

New durable tooling:

- `scripts/audit-kpi-agent-data-quality.mjs`
- `npm run kpi:data-quality`

Repeatable command:

```bash
npm run -s kpi:data-quality -- --windowDays=90 --since=2026-01-01 --topLimit=5 --sampleLimit=0
```

Live proof captured on `2026-04-26`:

- KPI Supabase and AIOS FUB source-rule connectors were both readable
- `3442` active appointment rows
- `951` missing appointment outcomes
- `53` non-standard outcome labels
- `142` known outcome labels used against the wrong appointment-type context
- `52` likely same-person / same-type appointment stacks covering `119` rows inside the `90` day current-year window
- `21` buy/sell context people detected as legitimate exception review
- `16657` active KPI lead-stage person rows
- `6726` invalid/generic source rows:
  - `Import`: `5030`
  - `<unspecified>`: `1485`
  - `Sphere`: `208`
  - blank: `3`
- `5095` pond/unclaimed lead-stage rows

Durable docs/backlog updated:

- `docs/audits/2026-04-26-kpi-agent-data-quality-audit.md`
- `docs/source-notes/kpi-dashboard.md`
- `KPI-APPT-QUALITY-001`
- `KPI-LEAD-VALIDATION-001`

## Recommended Next Deep Passes

Do not do five broad passes by default. Do three focused deep passes first, then decide if two more are needed.

Recommended order:

1. `KPI-SHOPPING-001` - completed after this checkpoint
   - repeatable live audit exists as `npm run kpi:shopping-list`
   - durable audit exists at `docs/audits/2026-04-26-kpi-shopping-list-discipline-audit.md`
   - Shopping List doctrine is connected to `SRC-MEETINGS-001` evidence and `SRC-SUPABASE-001` `leads`

2. `DRIVE-CONTENT-001` / `EMAIL-ATTACHMENTS-001` / `MEETING-VIDEO-001`
   - prove Docs/PDF/attachments/video extraction with skip reasons, source links, route/cost ledgering, and small daily quotas

Optional fourth:

- `SOURCE-021` writer ownership
  - prove current live writer path for `leaddate`, `leadclaimeddate`, and rich stage dates before rebuilding or writing anything

Optional fifth:

- `SALES-005`
  - design the first agent-authorized fix/apply contract after read-only audits are trusted

## Questions Answered After Checkpoint

1. `Import`, `<unspecified>`, generic `Sphere`, and similar placeholders are not valid final lead-source truth. They should trigger guided correction against the governed FUB source doctrine.
2. Appointment stacking should use a `60` to `90` day review window and ask context. Buy+sell, multiple properties, and separate deal paths are legitimate exceptions; one opportunity with repeated meetings should update/move the original appointment.
3. Future apply can eventually touch every connected system, but v1 should write only to confident surfaces. Most hygiene writes go to FUB; KPI direct writes are mainly goals and Shopping List.

## Next Deep Pass Completed: Shopping List

New durable tooling:

- `scripts/audit-kpi-shopping-list-quality.mjs`
- `npm run kpi:shopping-list`

Repeatable command:

```bash
npm run -s kpi:shopping-list -- --topLimit=0 --sampleLimit=0
```

Live proof captured on `2026-04-26`:

- KPI Supabase `leads` table was readable
- `673` total Shopping List rows
- `293` active rows
- `380` closed rows
- `376` closed executed rows
- `137` active signed rows
- `91` active high-score rows
- `16` active stale high-score rows
- `36` active rows past their score-specific expected window
- `49` active blank action-plan rows
- `17` active high-score blank action-plan rows
- `35` duplicate active client clusters
- `85` duplicate active client rows
- `1` closed execution drift row

Durable docs/backlog updated:

- `docs/source-notes/fub-kpi-deal-connection-map.md`
- `docs/source-notes/kpi-dashboard.md`
- `docs/source-registry.md`
- `docs/audits/2026-04-26-kpi-shopping-list-discipline-audit.md`
- `KPI-SHOPPING-001`

Important structure decision:

- the FUB/KPI/Deal work is now mapped as a grouped source system, not a loose set of notes
- the grouped map is `docs/source-notes/fub-kpi-deal-connection-map.md`
- individual source notes still own source-specific truth
- grouped maps are for cross-system jobs like Sales Hub, agent coaching, source hygiene, and CRM replacement logic
