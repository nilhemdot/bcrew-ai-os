# GATE-RELIABILITY-003 Direct Verifier Deadlock Audit

Closeout: `gate-reliability-direct-verifier-deadlock-v1`

## Review Finding

Independent review accepted `UI-MENU-LAYOUT-POLISH-001`, but direct `npm run foundation:verify` still hit a bounded retry:

- class: `postgres-deadlock`
- subsystem: `postgres`
- result: verifier passed after retry at `214/214`

The UI ship remains valid. This audit captures the follow-up reliability patch.

## Local Evidence

Repo truth before patch:

- `HEAD` / `origin/main`: `005b259`
- Worktree: clean
- UI closeout: `ui-menu-layout-polish-v1`, verified and accepted
- Next expected Phase G card: `RECENT-BUILDS-BILLION-DOLLAR-UI-001`

Dashboard error log evidence showed Postgres deadlocks while starting the Foundation dashboard inside `initFoundationDb()`:

- error code: `40P01`
- routine: `DeadLockReport`
- relation OID `16402`
- relation OID `16389`
- process IDs: `44406`, `44405`, `41252`, `41251`

Safe relation metadata lookup:

| OID | Relation |
| --- | --- |
| `16402` | `decisions` |
| `16389` | `backlog_items` |

This artifact records only Postgres metadata. It does not include row data, source content, private content, or raw table values.

## Root-Cause Decision

The local root-cause path is direct gate scripts using the app startup initializer. `initFoundationDb()` is allowed to create/alter tables and seed/update live Foundation state. That is appropriate for startup and approved initialization, but it is too write-heavy for normal review gates while dashboard and worker are live.

Normal direct verifier proof should be read-only:

- assert the Foundation DB is already initialized
- read live state
- fail closed if required tables are missing
- avoid schema/seed writes during normal review

## Patch

`GATE-RELIABILITY-003` changes direct gate scripts to use read-only DB readiness checks:

- `foundation:verify`
- `process:ship-check`
- `process:fanout-check`
- `process:post-ship-fanout`
- `backlog:hygiene`

App and worker startup still use `initFoundationDb()` as the approved initialization path.

Gate diagnostics now include safe Postgres metadata for deadlock retries:

- Postgres code
- relation OIDs
- process IDs
- routine
- gate label
- retry attempt

## Acceptance Proof To Record

- `npm run process:gate-reliability-check`
- `npm run foundation:verify` repeated at least three times under normal dashboard/worker conditions
- `npm run backlog:hygiene -- --json`
- live `/api/foundation-hub`
- live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=GATE-RELIABILITY-003 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-003.json --closeoutKey=gate-reliability-direct-verifier-deadlock-v1 --commitRef=HEAD`

## Known Limits

- This patch removes write-heavy initialization from direct read-only gate checks. It does not claim future explicit migration or schema-changing paths can never deadlock.
- Future schema-changing builds may need an explicit initialization/migration proof before read-only gates can pass against a fresh DB.
