# KPI Read Map

Date: 2026-04-20

## Purpose

Turn KPI from one vague “Supabase source” into the exact business reads AI OS should learn first.

## Locked now

- KPI is a foundation system
- KPI is not a rebuild target
- the core KPI reads are now mapped in:
  - [docs/source-notes/kpi-dashboard.md](../source-notes/kpi-dashboard.md)

## The 6 audit groups

1. goals and target math
2. shopping-list truth
3. pipeline and appointments
4. executed deals and finance
5. rankings and competitions
6. app adoption / admin usage

## Why this matters

This is the cleanest path to future:

- agent KPI coaches
- manager assistants
- company goal watchers
- shopping-list hygiene agents
- appointment data-entry / outcome watchdogs
- login / adoption watchers

without repeating the old mistake of letting agents hit Supabase without a semantic map.

## Best next step

Start with the first 5 surfaces:

1. agent goals: 3 levels
2. manager goal assumptions
3. company goals
4. personal dashboard pacing
5. company dashboard pacing

Important addition:

- appointment hygiene is now explicitly in the read stack
- this includes:
  - correct appointment type
  - correct appointment outcome
  - correct Set / Show / Signed date usage
  - visible action-required flags

New addition:

- opportunity hygiene is now separate from appointment hygiene
- this includes:
  - accidental FUB-created leads
  - temporary `Delete Lead` cleanup
  - support-network / past-client / non-lead staging
  - true re-entry into the lead pipeline
  - protecting new-opportunity counts from bad CRM staging

That will lock the target system before we go deeper into pipeline and execution.
