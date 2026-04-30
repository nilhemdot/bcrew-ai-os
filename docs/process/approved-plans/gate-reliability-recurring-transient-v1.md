# Approved Plan: GATE-RELIABILITY-002

Plan approval: Steve directed this narrow reliability patch before `UI-MENU-LAYOUT-POLISH-001`.

## Owned Card

- `GATE-RELIABILITY-002`

## Closeout

- `gate-reliability-recurring-transient-v1`

## Scope

Eliminate or classify the recurring `foundation:verify` transient retry source after the `GATE-RELIABILITY-001` retry pool reset patch.

- Do not start Phase G UI/layout work.
- Inspect the latest verifier retry output/log path and identify the exact transient class.
- Determine whether the source is DB pool cleanup, concurrent gate writes, advisory lock contention, transaction order, launch agent/API overlap, or an external quota/network issue.
- Fix the root local cause if it is in repo code.
- If the cause is external or nondeterministic, add diagnostic output so future retries name the failing subsystem instead of generic transient retry.
- Keep bounded retry behavior.
- Permanent verifier failures must still fail closed.

## Implementation

- Add a real backlog card for `GATE-RELIABILITY-002`.
- Extend the gate reliability helper with retry classification for:
  - Postgres deadlock contention.
  - Foundation DB pool cleanup/lifecycle errors.
  - Network/transport timeouts.
  - External API quota or rate limits.
- Print the retry class and subsystem from `foundation:verify` and `process:foundation-ship`.
- Extend `process:gate-reliability-check` with deterministic proof for the recurring deadlock diagnostic.
- Keep the existing DB-cleanup retry proof and permanent fail-closed proof.
- Add verifier coverage, exact closeout ownership, approval evidence, and current plan/state truth.

## Acceptance

- `npm run foundation:verify` runs repeatedly without recurring transient retries under normal conditions, or the remaining transient class is explicitly diagnosed and accepted with reason.
- `npm run process:gate-reliability-check` covers the new diagnostic case.
- `foundation:verify` still fails closed for permanent DB, schema, and verifier failures.
- Build log closeout owns only `GATE-RELIABILITY-002`.
- Dashboard and worker serve the shipped commit.
- Worktree is clean and pushed.

## Proof

- `npm run process:gate-reliability-check`
- `npm run foundation:verify`
- repeated `npm run foundation:verify`
- `npm run backlog:hygiene -- --json`
- live `/api/foundation-hub` proof
- live `/api/foundation/build-log` proof
- `npm run process:foundation-ship -- --card=GATE-RELIABILITY-002 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-002.json --closeoutKey=gate-reliability-recurring-transient-v1 --commitRef=HEAD`

## Not Scope

- No UI-MENU-LAYOUT-POLISH-001.
- No Recent Work redesign.
- No source expansion.
- No Strategy, Scoper, Agent Factory, corpus, research, or action-review work.

## Known Limits

- If future concurrent gate changes create a new deadlock shape, this patch should classify the retry but may still require a new root-cause fix.
- External quota/network classes are diagnosed, not treated as local code defects.
