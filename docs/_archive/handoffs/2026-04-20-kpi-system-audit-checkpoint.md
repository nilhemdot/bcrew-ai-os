# KPI System Audit Checkpoint

Date: 2026-04-20

Purpose: give a clear picture of what `kpi.bensoncrew.ca` actually is, what data it reads, where the logic lives, and what looks brittle.

## Straight answer

- The KPI app is a real production React + Supabase system.
- It is an existing Benson Crew foundation system, not a rebuild target for AI OS.
- It is not the old `BCrew-Buddy` repo.
- The correct KPI repo is `zahnd-team-dashboard`.
- The app is live and readable today.
- The database is active today across the core pipeline tables.
- The architecture is not one clean source of truth yet. It is a working system built on multiple parallel truth layers.

## Why this matters for AI OS

- AI OS should treat this system as a foundational data source.
- We should learn it deeply, read from it cleanly, and identify where it can be extended.
- We should not frame this work as "replace KPI" or "rebuild KPI."
- The right use of this audit is:
  - understand what KPI already does well
  - know which tables and RPCs matter
  - know where old-system ideas can plug into it
  - decide which insights, agents, or cross-checks AI OS should add around it

## Stack

- Frontend: Vite + React + TypeScript + TanStack Query + shadcn/ui + Recharts
- Auth: Supabase Google OAuth
- Data layer: Supabase tables plus Supabase RPCs
- Deploy shape: single-page app with a large frontend bundle

## Core data model

This app is built on several different data layers, not one.

### 1. Org / app identity

- `profiles`
  - app user profile and role model
  - roles seen live:
    - `ADMIN`: 5
    - `AGENT`: 37
    - `EXAGENT`: 10
    - `MANAGER`: 1
    - `NONAGENT`: 2
    - `NONAGENT-ADMIN`: 6
- `users_activity`
  - app usage tracking

### 2. FUB user mapping

- `users`
  - numeric FUB-style user ids and email mapping
  - used as the bridge from app auth user -> FUB userid

### 3. Pipeline / CRM activity

- `persons`
  - the real pipeline people table
  - stages, lead dates, nurture dates, supporter dates, past-client dates
- `appointments`
  - buyer/listing discovery + consult event dates
- `calls`
- `emails`
- `text_messages`
- `tasks`

### 4. Shopping list system

- `leads`
  - separate from `persons`
  - this is the curated shopping-list style lead tracker
  - estimated values, score, signed flag, final price, commission fields

### 5. Deal / finance ledger

- `deal_data`
  - the core executed-deal ledger
  - source, company-vs-agent split, volume, commission, net-to-team, agent portion, expected deposit dates
  - this is the heaviest business table in the app

### 6. Goals

- `goals`
  - per-agent goals
  - live years seen: 2025, 2026
- `company_goals`
  - company goals
  - live years seen: 2025, 2026
- `expansion_goals`
  - separate expansion-planning layer
  - live years seen: 2025, 2026

### 7. Competition system

- `leaderboard_challenges`
- `leaderboard_teams`
- `leaderboard_team_members`
- bulk RPCs for MQY build/perform

## Main route map

### Personal

- `/`
  - personal dashboard shell
- `/goals`
  - personal goal builder
- `/leads`
  - shopping-list management based on `leads`
- `/leads-inbox`
  - pipeline inbox based on `persons`
- `/appointments`
  - appointment pipeline based on `appointments` + `persons`
- `/deals`
  - personal executed deals based on `deal_data`

### Company

- `/company`
  - company dashboard
- `/company-shopping-list`
  - company shopping list based on `leads`
- `/company-leads`
  - company pipeline leads based on `persons` via RPC
- `/company-appointments`
  - company appointments via RPC
- `/company-deals`
  - company deal list based on raw `deal_data`
- `/company-financial`
  - company financial leaderboard based on raw `deal_data`
- `/company-leaderboard`
  - company leaderboard based on `leads`, not `deal_data`

### Other

- `/mqy-perform`
- `/mqy-build`
- `/competitions`
- `/admin`
- `/settings`
- `/agent-dashboards`
- `/all-agents`
- `/agents/:id`

## The biggest architectural truth

The KPI app does not run on one single truth layer.

It has at least three major business-truth systems:

- `persons` + `appointments` + activity tables
  - CRM / pipeline truth
- `leads`
  - shopping-list truth
- `deal_data`
  - executed deal / finance truth

That is why the app works, but also why AI OS needs a careful source-contract view when using it.

## Important split: two different "lead" systems

This is the biggest conceptual split in the app.

### Lead system A: shopping list

- pages:
  - `/leads`
  - `/company-shopping-list`
- table:
  - `leads`
- purpose:
  - active / closed shopping-list style lead management
  - estimated sale price, score, split, signed status

### Lead system B: pipeline CRM

- pages:
  - `/leads-inbox`
  - `/company-leads`
- tables:
  - `persons`
  - plus `users` bridge
- purpose:
  - real CRM-style lead intake, stage, source, pipeline timing

These are not the same dataset.

## Shopping List: what it really is

The extra deep pass closed this much more tightly.

- The table is still named `leads`.
- The founder meaning is **not** "all raw leads."
- This is the manual active-opportunity / active-client coaching layer.
- Agents are expected to re-score it weekly and keep a real action plan on each record.
- The app itself already hints at this:
  - `HowTo.tsx` tells agents to track additional clients in Shopping List
  - `LeadsManagement.tsx` empty state says `No active clients found`
  - older meeting notes say `leads is the shopping list`

Current visible score scale in the app:

- `10` = next `15` days
- `9` = `15-30` days
- `8` = `30-45` days
- `7` = `45-60` days
- `6` = `60-90` days
- `5` = about `6` months
- `4` = about `12` months
- `3` or below = ice cold / unclear

Important implementation detail:

- pipeline-value sections currently treat active Shopping List rows with `score >= 7` as the key active-opportunity layer
- so bad scores, stale scores, and empty action plans directly weaken the pipeline read

## Important split: two different "deal" systems

### Deal system A: shopping-list executed outcomes

- table:
  - `leads`
- used by:
  - `useCompanyMetrics`
  - parts of company leaderboard logic

### Deal system B: executed finance ledger

- table:
  - `deal_data`
- used by:
  - `useDealData`
  - `useCompanyDeals`
  - `useCompanyFinancialMetrics`
  - company dashboard RPCs

These are also not the same dataset.

## Quantified parallel-truth example

For 2026 live data:

- `leads` executed count: 44
- `deal_data` executed count: 108

For 2026 live totals:

- `leads` total final price: 19,996,550
- `deal_data` total volume credit: 52,542,675.43

This is not a small mismatch.

It means different screens can tell different versions of business reality depending on which table they read.

## Where logic lives

### Mostly frontend logic

- personal dashboard target math
- pipeline-adjusted date window math
- shopping-list calculations
- parts of leaderboard ranking logic
- many row-level transforms and filters

### Mostly database-side logic

- `get_company_dashboard_stats`
- `get_company_advanced_analytics`
- `get_company_leads`
- `get_company_appointments`
- `get_team_mqy_perform_metrics`
- `get_team_mqy_build_metrics`
- `update_user_role`

### Mixed model

The app often pulls raw rows, then computes important business meaning in React.
Other screens call an RPC and trust the database to aggregate for them.

That means the KPI app has both:

- frontend business logic
- backend business logic

This is workable, but it increases drift risk.

## Live freshness check

Core tables are updating today.

- `leads`: live today
- `deal_data`: live today
- `appointments`: live today
- `persons`: updated today
- `users`: updated today
- `calls`: live today
- `emails`: live today
- `text_messages`: live today
- `tasks`: updated today

Main RPCs also work live:

- `get_company_dashboard_stats`
- `get_company_advanced_analytics`
- `get_company_leads`
- `get_company_appointments`
- `get_team_mqy_perform_metrics`
- `get_team_mqy_build_metrics`

## Shopping List: live quality snapshot

Audit snapshot date: `2026-04-20`

- active Shopping List rows: `289`
- signed active rows: `135`
- active rows with blank `action_plan`: `47`
- stale active high-score rows (`7+` and older than `60` days): `16`

Quality issues seen live:

- duplicate active Shopping List records exist for some agent/client pairs
- stale high-score rows still exist
- some high-score rows still have blank action plans

This means the Shopping List system is live and useful, but the coaching discipline on top of it is uneven.

Examples of the exact quality checks that already matter:

- high-score rows with blank action plans
- high-score rows not touched in `60+` days
- duplicate active records for the same agent and client

That is a real future coaching / hygiene surface, not a theoretical one.

## Usage tracking: what it proves and what it does not

The extra pass closed this boundary too.

What is proven:

- `useAuth.tsx` inserts a `users_activity` row on login
- it updates `last_seen_at` every `30` seconds while the tab is visible
- `admin_user_activity_reports` is a usable summary layer for app adoption

What that means:

- we can tell who is entering and using the KPI app
- we can see session count, minutes, and last-active timing

Important caution:

- the minutes figure can overstate real engagement if someone leaves a visible tab open for a long time
- so `last_active`, recency, and repeat usage are more trustworthy than raw minute totals by themselves

What it does **not** mean:

- it does not prove who updated Shopping List specifically
- it does not prove who re-scored opportunities properly
- it does not prove who kept action plans current

Safe current read:

- app adoption = `users_activity` / `admin_user_activity_reports`
- Shopping List maintenance = `leads.updated_at` + score freshness + action-plan quality

## What looks strong

- Production auth is working.
- Core pipeline and finance tables are active.
- Main RPCs are real and return useful data.
- `deal_data` looks like the strongest business ledger in the system.
- `goals` and `company_goals` are structurally clear.
- `expansion_goals` is present and live, not just future scaffolding.
- The app has enough structure to audit and eventually rebuild against.

## What looks brittle

### 1. Parallel truth layers

- `persons`
- `leads`
- `deal_data`

All three matter, and not all screens read the same one.

### 2. Heavy client-side business logic

Several pages fetch broad raw tables and compute meaning in React.

Examples:

- `useCompanyLeads` reads all `leads`
- `useCompanyDeals` reads all `deal_data`
- `usePipelineData` derives pipeline from `persons.currentstage`
- `Leads.tsx` re-runs query logic in the component itself

### 3. Duplicated logic across personal vs company views

There is a lot of repeated logic with slightly different implementations.

Examples:

- `Deals.tsx` vs `CompanyDeals.tsx`
- `Leads.tsx` vs `CompanyLeads.tsx`
- personal dashboard vs company dashboard target logic

### 4. Dirty lint baseline

- build passes
- lint fails with 97 issues
- 80 errors, 17 warnings

Main lint patterns:

- `any` everywhere
- missing hook dependencies
- small logic hygiene issues
- config files using `require`

This does not mean the app is broken.
It does mean maintainability is weaker than it should be.

### 5. Large bundle

- production JS bundle is about 1.65 MB before gzip
- Vite warns on chunk size

Not the biggest business risk, but a real frontend quality issue.

### 6. Strange residue inside code

- `CompanyLeaderboard.tsx` contains a pasted SQL DDL block in the source file comment area

That is not a runtime bug, but it is a sign of sloppy code hygiene.

### 7. Repo health is mixed

- production build passes
- lint fails hard
- local dependency audit in the inspection clone reported 19 vulnerabilities

This is not a reason to panic.
It is a reason not to call the codebase "tight" yet.

### 8. Role gating is visible at the app layer

- admin checks are driven by `profiles.role`
- `useIsAdmin` treats `ADMIN` and `NONAGENT-ADMIN` as admin
- some pages are clearly UI-gated by role checks

What is not verified yet:

- database-side RLS policy quality
- whether every sensitive surface is enforced beyond the frontend

### 9. Shopping List quality discipline is live but uneven

- the system has a real manual working-list model
- the app surfaces stale high-score records
- but live data still shows blank action plans, duplicates, and stale `7+` / `8+` rows

So the model is good.
The human maintenance discipline is not yet tight.

### 10. FUB doctrine is cleaner than the live implementation

The extra pass confirmed:

- founder doctrine says `Unresponsive` and the two `zz - Contact - Lost ...` stages are not current truth
- live `persons.currentstage` data still contains those rows

That is not a reason to panic.
It is a reason to keep doctrine and implementation clearly separated.

## Current best reading of the KPI system

If I had to describe it simply:

- `profiles` tells the app who people are
- `users` maps those people to FUB-style user ids
- `persons` + `appointments` + activity tables tell the pipeline story
- `leads` tells the shopping-list story
- `deal_data` tells the executed-deal and finance story
- `goals` and `company_goals` drive target math
- `expansion_goals` extends the goal/planning layer
- RPCs power the cleaner company-level aggregate views

## Best source-of-truth candidates

### Strongest current SOTs

- executed deal / financial truth:
  - `deal_data`
- company / agent goals:
  - `goals`
  - `company_goals`
- CRM pipeline truth:
  - `persons`
  - `appointments`

### More secondary / derived

- `leads`
  - useful, but looks more like a managed operating layer than the deepest source truth

## Immediate implications for rebuild work

If this system is going to feed AI OS cleanly, the first important call is:

- which KPI surfaces should be sourced from `deal_data`
- which KPI surfaces should be sourced from `persons`
- what role `leads` should still play

Right now that answer changes page by page.

That does not mean KPI should be rebuilt.
It means AI OS should be explicit about which KPI truth layer it is reading for each job.

## Recommended next audit moves

1. Decide the canonical truth for each KPI surface AI OS wants to consume
   - pipeline
   - shopping list
   - executed deals
   - company financial
   - leaderboard

2. Audit `deal_data` against the KPI screens that still use `leads` for executed metrics

3. Audit `persons` against the lead inbox and appointments flow to define the true CRM truth

4. Decide whether `leads` is:
   - a real source of truth
   - a managed projection
   - or a temporary transitional table

5. Use this map to drive AI OS source contracts and future extension ideas
   - agent coach
   - company goal watcher
   - FUB / HomeOptima cross-checks
   - manager / agent Telegram coaching layers

6. Treat Shopping List hygiene as its own governed read
   - stale `7+` / `8+` records
   - blank action plans
   - duplicate active records
   - app usage vs actual Shopping List maintenance

## What to do now

This is the shortest clean path to get KPI dialed in as a foundation system for AI OS.

### 1. Lock KPI's job in AI OS

- KPI is a foundation system
- KPI is not being rebuilt
- AI OS reads from it, verifies it, and builds around it

### 2. Split KPI into source contracts inside AI OS

Do not treat "KPI" as one source.
Treat it as these source layers:

- KPI pipeline
  - `persons`
  - `appointments`
  - `users`
  - activity tables
- KPI shopping list
  - `leads`
- KPI executed deals / finance
  - `deal_data`
- KPI goals
  - `goals`
  - `company_goals`
  - `expansion_goals`
- KPI competition
  - leaderboard tables
  - MQY RPCs

### 3. For each AI OS job, pick one truth layer on purpose

Examples:

- agent coach:
  - goals + pipeline + deal_data
- company goal watcher:
  - company_goals + company dashboard RPC
- shopping list coach:
  - leads
- finance / execution watcher:
  - deal_data

Do not let one AI OS feature mix `leads` and `deal_data` unless that is intentional and documented.

### 4. Add KPI health checks to AI OS

AI OS should verify:

- key tables are still updating
- key RPCs still respond
- role / profile mapping still works
- truth-layer counts do not drift silently

### 5. Make KPI visible in the foundation site

Add one clean foundation surface for KPI that shows:

- source layer
- what it is used for
- freshness
- trust state
- future extension ideas

### 6. Only then file extension work

Good extension ideas:

- company goal watcher
- agent KPI coach
- manager performance watcher
- FUB / HomeOptima cross-checks
- Telegram coaching agents

Bad next move:

- trying to rebuild KPI inside AI OS

## Current status

- Browser access: working
- KPI login: working
- Correct repo identified: yes
- Repo build: passes
- Repo lint: fails
- Dependency health in inspection clone: 19 vulnerabilities reported by `npm install`
- Live database: active
- Main architecture map: established
- Deep table-by-table data contract audit: not finished yet
