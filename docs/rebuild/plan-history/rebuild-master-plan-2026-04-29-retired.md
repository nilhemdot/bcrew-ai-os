# Rebuild Baseline

Last updated: 2026-04-17
Status: Archived baseline inside the live repo

This file preserves the original rebuild baseline so the current repo no longer depends on the old reference repo for rebuild context.

This is not the live execution plan.

Use [current-plan.md](../current-plan.md) for the active execution order.

## Original Baseline

The baseline locked these core ideas:

- Mac Mini instead of VPS split-brain
- foundation first, not agent swarm first
- OpenClaw as the planned runtime for the later agent layer
- model-agnostic doctrine
- strategy docs in Git, operating memory in PostgreSQL
- one machine, one database, one runtime target

## Original Phase Order

1. Business Strategy
2. System Strategy
3. Foundation Infrastructure
4. Intelligence
5. Departments
6. Dev Team
7. Kill old system

## What Changed

The architecture was not replaced.

What changed is execution clarity:

- Foundation is now materially real in code and UI.
- Source contracts are executable in the app.
- PostgreSQL is live as the operating-memory layer.
- The current rebuild sequence now lives in [current-plan.md](current-plan.md) instead of only in chat or the old repo.

## How To Use This File

- use it to remember the original rebuild intent
- do not use it as the live execution checklist
- if this file conflicts with [current-plan.md](../current-plan.md), the current plan wins
