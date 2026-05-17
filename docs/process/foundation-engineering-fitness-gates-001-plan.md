# FOUNDATION-ENGINEERING-FITNESS-GATES-001 Plan

## What
Ship one P0 Foundation engineering fitness gate before extractor work resumes.

This sprint covers three P0 live cards:

- `FOUNDATION-ENGINEERING-FITNESS-GATES-001`
- `FOUNDATION-SURFACE-AND-API-BUDGETS-001`
- `FOUNDATION-HUB-DECOMPOSITION-GUARD-001`

It also scopes `FOUNDATION-LAZY-SURFACE-LOADING-001` as the immediate follow-up unless it can ship honestly as loading architecture without route or visual redesign. V1 will not mark lazy loading done if the clean route ownership is not present.

## Why
The build-lane reliability sprint fixed card/process assembly, but Steve identified the next failure mode: Foundation can clean up file monoliths while still becoming an API, page, or agent-route monolith.

The useful operator behavior is simple: Foundation should fail fast when a future plan grows an oversized file without a split plan, makes the default Hub carry full diagnostics, loads every page dataset up front, tells agents to use broad routes for detail work, repeats slow full verifier loops, or lets runtime/API truth drift from repo truth.

For Steve and the team, the real workflow value is quality and speed: a builder gets a concrete revise/pass result before spending half an hour on the wrong path, and Steve can trust the building machine to block bloat, drift, and false-green proof before extraction work starts.

This is engineering discipline, not UI polish or feature work.

## Acceptance Criteria
- The three P0 live backlog cards exist, are scaffold-valid, and close under one closeout key.
- `FOUNDATION-LAZY-SURFACE-LOADING-001` remains explicit as the immediate follow-up if clean route ownership is not enough to ship it without visual redesign.
- File standards are executable: preferred hand-written module <= 1,500 lines, watch above 1,500, review above 3,000, split required above 5,000, danger above 10,000.
- Generated files, data records, and report artifacts require explicit budgets.
- Dogfood rejects a plan that adds to an over-budget file without a split plan.
- Default API budgets and diagnostics API budgets are separate.
- Default `/api/foundation-hub` remains summary-only and under the V2 650KB budget with section attribution for oversized default sections.
- Full diagnostics stays on `/api/foundation-hub?view=full` and under the separate 4.2MB diagnostic budget.
- Agent route usage names narrow routes for Current Sprint, Recent Builds, Source Registry, Source Lifecycle, backlog detail, default Hub, and full diagnostics.
- Page loading architecture dogfood rejects all-in-one initial loading.
- Build-lane failures remain covered: thin scaffold fields, repeated full verifies, stale served code, and Current Sprint API drift.
- `foundation:verify` includes verifier coverage for this sprint.
- The focused proof returns `pass` only when `FOUNDATION-ENGINEERING-FITNESS-GATES-001` and the two P0 companion cards are scaffold-valid, Current Sprint metadata is complete, live default Hub stays under budget, full diagnostics stays under the diagnostic budget, and dogfood failures return `revise`/fail as expected.

## Definition Of Done
- Add `lib/foundation-engineering-fitness-gates.js`.
- Add `scripts/process-foundation-engineering-fitness-gates-check.mjs`.
- Register `process:foundation-engineering-fitness-gates-check`.
- Add verifier coverage card IDs and a minimal `foundation:verify` check.
- Add approval JSON, closeout registry record, and closeout handoff.
- Update live backlog/current sprint state through explicit `--apply` and `--close-card` proof posture.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.
- Definition of Done for `FOUNDATION-ENGINEERING-FITNESS-GATES-001`: `npm run process:foundation-engineering-fitness-gates-check -- --json` passes, Plan Critic score is 10/10, `foundation:verify` passes, full ship gate passes, and the three P0 cards are done under `foundation-engineering-fitness-gates-v1`.

## Details
Existing code to reuse:

- `lib/build-lane-reliability.js` for card scaffold, sprint metadata, verify-loop, fanout, and Current Sprint drift validators.
- `lib/foundation-hub-payload-budget-v2.js` for default Hub budget and full-only key detection.
- Existing Foundation Hub routes: `/api/foundation-hub` and `/api/foundation-hub?view=full`.
- Existing narrow routes: `/api/foundation/current-sprint`, `/api/foundation/build-log`, `/api/source-of-truth`, `/api/foundation/source-lifecycle`, and `/api/foundation/backlog/:cardId`.
- Existing live backlog, Plan Critic, Current Sprint overlay, process write guard, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

Implementation shape:

- A pure module owns engineering fitness standards, budget evaluators, Hub decomposition checks, lazy loading architecture checks, and dogfood fixtures.
- A focused proof script reads live state and can mutate backlog/current sprint only with explicit write flags.
- The sprint closes the three P0 standards cards. Lazy surface loading is not falsely closed if it requires route ownership work.
- The root verifier receives a thin integration check only; the detailed standards stay in the focused module.
- The focused proof is read-only by default. It does not repair or seed live state unless `--apply` or `--close-card` is explicitly passed.
- `foundation:verify` has no live state mutation, zero repairs, and fails closed if the engineering fitness coverage disappears.
- requestedSharedFiles are main-session approved and inside active sprint scope: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-verify-coverage-card-ids.js`, `lib/foundation-build-closeout-cleanup-records.js`, `docs/process/*`, and the new focused process script.

File-size plan:

- New hand-written module stays under 1,500 lines.
- New focused proof script stays under 1,500 lines.
- `scripts/foundation-verify.mjs` gets minimal orchestration wiring only.
- Approval JSON is a data record.
- Closeout handoff is a report artifact with an explicit budget under 180 lines.

Gate decision tree by blast radius: static `node --check` for syntax, focused `npm run process:foundation-engineering-fitness-gates-check -- --json` while iterating, targeted checks for exact failures, full `npm run foundation:verify` once after focused proof is green, and full `process:foundation-ship` before push.

## Risks
The main risk is pretending lazy loading shipped when the page still relies on a broad default Hub payload. The mitigation is explicit: if clean loading architecture requires route ownership work, leave `FOUNDATION-LAZY-SURFACE-LOADING-001` scoped as the immediate follow-up.

Another risk is duplicating existing performance gates. The mitigation is to reuse payload budget V2 and build-lane reliability helpers, then add only the cross-surface standards they do not already cover.

Repair path: if this focused proof finds a real red, fix the failing standards gate before extractor work. If lazy loading is the only remaining route-ownership gap, keep it as a scoped follow-up rather than blocking extraction with a UI-loading card.

## Tests
- `node --check lib/foundation-engineering-fitness-gates.js scripts/process-foundation-engineering-fitness-gates-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-engineering-fitness-gates-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-ENGINEERING-FITNESS-GATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENGINEERING-FITNESS-GATES-001.json --closeoutKey=foundation-engineering-fitness-gates-v1 --commitRef=HEAD`

## Not Next
Do not start `EXTRACTION-RUNTIME-READINESS-001` until this ships. Do not build extractor work, connectors, OAuth, auth-required extraction, Harlan, Fal, voice, Canva, OpenHuman, broad visual UI redesign, Drive permission mutation, or the live Agent Feedback auto-send job in this sprint.
