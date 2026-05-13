# FOUNDATION-DB-INIT-SEED-SPLIT-001 Plan

## What

Split Foundation DB schema initialization from bootstrap seed, live-data repair, and doc snapshot refresh behavior.

## Why

The deep audit found `initFoundationDb()` doing too many things: schema setup plus live backlog/source/sprint truth updates. A function named init should not rewrite operating truth as a side effect of reports, checks, or server startup.

## Acceptance Criteria

- Schema/init path has a clear name and only performs schema setup.
- Seed/bootstrap behavior is separate and explicitly named.
- Live-data repair behavior is separate and explicitly named.
- Reporting/check commands do not call a path that can rewrite backlog/source/sprint truth as a side effect.
- A dogfood proof calls the schema/init path and proves it does not seed, repair, close cards, or rewrite backlog/source/sprint rows.
- `FOUNDATION-DB-INIT-SEED-SPLIT-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- DB init responsibilities are separated enough that read/report/check callers can use schema readiness without live truth mutation.
- Focused proof compares relevant row/change-event state before and after schema/init.
- Foundation verifier covers the separation boundary.
- Sprint item closes only after dogfood proof and ship gates pass.

## Details

Existing code to reuse: `lib/foundation-db.js`, `initFoundationDb()`, `resetFoundationDb()`, backlog seed blocks, doc source snapshot helpers, and read-only gate code. Existing docs to reuse: deep audit, runtime safety plan, AGENTS.md, current rebuild plan/state. Existing scripts to reuse: `process:runtime-safety-hardening-check`, `backlog:hygiene`, `foundation:verify`, and ship gates.

V1 should not split the entire 18k-line file. It should create clear function boundaries and move callers away from write-heavy init paths where needed.

The dogfood proof must exercise black-box behavior through the actual schema/init function path and a DB-style before/after row or change-event round-trip. No substring-only proof is acceptable.

Gate decision: static syntax checks for changed JS, focused `process:runtime-safety-hardening-check` proof for init-vs-seed separation, then full `process:foundation-ship` because the blast radius touches DB initialization and source/backlog/sprint truth safety. Operator value: Steve can run reports, checks, and startup paths without hidden seed/repair writes changing Foundation truth. Speed bound: the focused proof should target under 2 minutes by using bounded synthetic rows or transaction-scoped observation instead of a full DB rebuild.

## Risks

- Splitting init may break callers that relied on accidental seeding. Repair path: move those callers to explicit seed/repair commands and document the mutation posture.
- A broad refactor would be risky. Repair path: keep the implementation narrow and proof-driven.
- The dogfood proof must use row/change-event observation, not source substring checks.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=FOUNDATION-DB-INIT-SEED-SPLIT-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-DB-INIT-SEED-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-INIT-SEED-SPLIT-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not rewrite the schema system.
- Do not repair live data silently.
- Do not change product behavior or source extraction.
