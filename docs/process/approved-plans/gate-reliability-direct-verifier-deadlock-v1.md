# Approved Plan: GATE-RELIABILITY-003

Plan score: 9.8/10. Green light from Steve on 2026-04-30.

## Owned Card

- `GATE-RELIABILITY-003`

## Closeout

- `gate-reliability-direct-verifier-deadlock-v1`

## Goal

Eliminate the direct `foundation:verify` Postgres deadlock source found during independent review after `UI-MENU-LAYOUT-POLISH-001`.

The accepted UI polish ship remains valid. This is a narrow gate reliability patch before `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.

## Scope

- Do not start `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.
- Do not broaden into UI/menu/layout work.
- Do not weaken bounded retry or permanent fail-closed behavior.
- Inspect the direct verifier deadlock evidence and root-cause path.
- If the local root cause is confirmed, fix it in this slice.
- Safe diagnostics only: Postgres error metadata, relation names/OIDs, process IDs, gate label, and retry attempt. No row data, source content, or private content.
- Known-limit closeout is allowed only if elimination is genuinely not possible in this slice, and it must name the exact path, reason, owner, and follow-up card.

## Root-Cause Hypothesis

Direct `foundation:verify` currently calls the same `initFoundationDb()` path used by app startup. That path can run schema DDL, seed writes, and card/status updates while the dashboard or worker is live. Independent review saw `class=postgres-deadlock; subsystem=postgres`, and local log evidence maps the deadlocked relation OIDs to core Foundation tables:

- `16402` -> `decisions`
- `16389` -> `backlog_items`

Normal verifier review should read and prove existing Foundation truth. It should not take schema/seed locks unless an explicit approved initialization or migration path is being run.

## Implementation

1. Create or update `GATE-RELIABILITY-003` with full context.
2. Add a safe diagnostic artifact for the review finding.
3. Add a read-only Foundation DB readiness check based on `pg_class` metadata.
4. Change direct verifier and process gate read paths to use read-only readiness checks instead of `initFoundationDb()`:
   - `npm run foundation:verify`
   - `npm run process:ship-check`
   - `npm run process:fanout-check`
   - `npm run process:post-ship-fanout`
   - `npm run backlog:hygiene`
5. Keep app/worker startup initialization intact; this patch does not remove the approved initialization path.
6. Extend gate reliability proof with a deterministic direct-verifier Postgres deadlock fixture that proves:
   - class is `postgres-deadlock`
   - subsystem is `postgres`
   - code is `40P01`
   - relation OIDs and process IDs are surfaced safely
   - permanent failures still fail closed
7. Add verifier coverage, closeout metadata, and current plan/state truth.

## Acceptance

- No recurring direct-verifier `postgres-deadlock` retry under normal dashboard/worker conditions, proven by repeated direct verifier runs.
- If a residual class remains, it is explicitly accepted with precise diagnostic proof and follow-up. This is not expected unless elimination is genuinely blocked.
- Permanent DB/schema/verifier failures still fail closed.
- Closeout owns only `GATE-RELIABILITY-003`.
- Dashboard and worker serve the shipped commit.
- Worktree is clean and pushed.

## Proof

- `npm run process:gate-reliability-check`
- `npm run foundation:verify`
- `npm run foundation:verify`
- `npm run foundation:verify`
- `npm run backlog:hygiene -- --json`
- live `/api/foundation-hub`
- live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=GATE-RELIABILITY-003 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-003.json --closeoutKey=gate-reliability-direct-verifier-deadlock-v1 --commitRef=HEAD`

## Not Scope

- No `RECENT-BUILDS-BILLION-DOLLAR-UI-001`.
- No Recent Work redesign.
- No UI/menu/layout changes.
- No changelog or daily summary.
- No source lifecycle expansion.
- No Strategy, Scoper, Agent Factory, corpus expansion, research cleanup, or new feature lane.

## Known Limits

- This patch removes write-heavy DB initialization from direct read-only gate checks. It does not claim Postgres can never deadlock in future explicit migration, schema, or write-heavy job paths.
- App and worker startup still use `initFoundationDb()` as the approved initialization path.
- Future schema-changing builds may need an explicit migration/initialization proof before read-only gates can pass against a fresh DB.
