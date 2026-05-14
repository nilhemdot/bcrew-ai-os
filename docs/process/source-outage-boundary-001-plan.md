# SOURCE-OUTAGE-BOUNDARY-001 Plan

## What

Make external ClickUp read outages fail soft across Foundation and Ops read surfaces. A ClickUp `500 DB_003` must show as degraded source health, not a crashed `/api/foundation-hub?view=full`, crashed `/api/ops-hub`, or blocked Foundation verifier.

## Why

`HUB-001` was ready to ship, but the full gate exposed that ClickUp was returning `500 DB_003` on `/user`, Agent Roster, and Deal Data Entry reads. The vendor failure is not our fault. Letting that failure take down Foundation APIs is our fault. Foundation must distinguish internal code health from external connector uptime.

## Acceptance Criteria

- ClickUp read snapshots have a fail-soft path that returns explicit `sourceHealth.status = degraded`, empty read data, sanitized error metadata, and no token leakage.
- ClickUp write paths still fail hard; this card only changes read/report/dashboard paths.
- Agent Roster review queue reports a source-degraded item instead of pretending the roster is clean when ClickUp is unavailable.
- Agent feedback auto-send, production dry-run, and reminder readiness reports keep serving with explicit ClickUp source-health metadata and no Gmail, ClickUp, or ledger side effects.
- `/api/foundation-hub?view=full` and `/api/ops-hub` return JSON payloads when ClickUp is degraded.
- Dogfood proof recreates the ClickUp `500 DB_003` failure shape and proves the system blocks the crash path, fails closed on sends, and exposes degradation.

## Definition Of Done

- Current Sprint has `SOURCE-OUTAGE-BOUNDARY-001` with populated doctrine and Plan Critic pass at `>=9.8`.
- `lib/clickup.js` exposes safe read snapshots and source-health metadata.
- Foundation/Ops ClickUp-fed reports use safe read snapshots.
- `lib/source-outage-boundary.js` and `scripts/process-source-outage-boundary-check.mjs` prove the exact failure mode.
- `npm run process:source-outage-boundary-check -- --json` passes.
- `foundation:verify` passes while ClickUp is still degraded or healthy.
- Full ship gate passes for the recovery card, then push both `HUB-001` and this recovery card.

## Details

This is a boundary hardening card, not an integration repair. ClickUp may still be down after this ships. That is acceptable if the system exposes it as degraded source health and keeps core Foundation/Ops APIs available.

The nightly code audit remains report-only and manual until approved recurring schedule. This card adds the missing deterministic connector outage boundary proof so future audits can see this failure class. It does not schedule autonomous repair, mutate ClickUp, or hide the outage.

Existing work reused:

- Existing code in `lib/clickup.js` remains the single ClickUp API wrapper; this card adds safe read snapshots beside the existing fail-hard request/write functions.
- `lib/agent-roster-review.js` remains the Agent Roster review queue owner; this card adds source-degraded queue behavior there instead of a parallel queue.
- `lib/agent-feedback-auto-send.js`, `lib/agent-feedback-production-autosend-dry-run.js`, and `lib/agent-feedback-reminders.js` remain the Ops feedback readiness owners; this card changes their read/report input boundary only.
- `server.js` remains the Foundation/Ops API composition layer; this card exposes source outage health in existing payloads.
- Existing scripts `process:foundation-ship`, `process:hub-work-check`, `backlog:hygiene`, and `foundation:verify` remain the ship gates.
- Existing docs are updated only where needed: the plan, approval, sprint handoff, closeout, and the live backlog/current sprint truth.
- Live backlog and Current Sprint stay the work truth; this recovery card is inserted there instead of being only a markdown note.

Behavior proof, not marker proof:

- The focused proof calls `buildUnavailableClickUpListSnapshot()` with a synthetic ClickUp `500 DB_003` error.
- It passes that degraded snapshot through the real Agent Roster queue builder and all three real Ops feedback report builders.
- It asserts the real outputs carry degraded source health, no token leakage, no Gmail side effects, no ClickUp writeback, no reminder ledger write, and no fake “zero issues” roster result.
- It fetches the live `/api/foundation-hub?view=full` and `/api/ops-hub` routes and fails if either returns 500.

Gate decision tree:

- Static syntax/import proof first through the focused process check.
- Focused dogfood proof next through `npm run process:source-outage-boundary-check -- --json`.
- Existing hub gate next through `npm run process:hub-work-check -- --json` because `HUB-001` is still included in the unpushed commit chain.
- Full `foundation:verify` and `process:foundation-ship` last because this touches Foundation APIs, source-health behavior, package scripts, process docs, and verifier-sensitive reports.

Repair path:

- If the focused proof fails, keep the recovery card in Building Now, fix the exact failing boundary, and rerun only `process:source-outage-boundary-check` first.
- If live APIs still return 500, do not push; inspect the remaining stack trace and add safe read handling only to the read/report path that still throws.
- If `foundation:verify` fails on ClickUp source-health semantics, update verifier/status logic to distinguish internal code health from explicit external source degradation. Do not make a blanket bypass.
- If ClickUp recovers mid-sprint, the dogfood synthetic `DB_003` proof remains the regression check.

Operator value:

- Steve can keep working in Foundation/Ops/Sales even when ClickUp has an outage.
- The dashboard says ClickUp is degraded instead of showing a broken Foundation API or fake clean roster counts.
- Future hub builders can continue using Foundation as the substrate without stopping every time one vendor API has a transient 500.

Speed budget:

- `process:source-outage-boundary-check` must be fast and finish in under 1 minute in normal local runtime because its dogfood path is synthetic and only the final API checks hit local routes.
- The heavy full verifier remains reserved for final ship, not repeated for every small repair loop.

## Risks

- A fail-soft path can become fake green if it hides degraded source health. The payload must expose source health plainly.
- Empty degraded snapshots can accidentally look like zero open issues. Agent Roster gets a source-degraded queue item to prevent that.
- Production send paths must not send when source data is unavailable. The dogfood proof checks no Gmail, ClickUp, or ledger side effects.

## Tests

- `npm run process:source-outage-boundary-check -- --json`
- `npm run process:hub-work-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-OUTAGE-BOUNDARY-001 --planApprovalRef=docs/process/approvals/SOURCE-OUTAGE-BOUNDARY-001.json --closeoutKey=source-outage-boundary-v1 --commitRef=HEAD`

## Not Next

- Do not mutate ClickUp.
- Do not repair ClickUp credentials unless the API starts returning auth errors.
- Do not build new Ops/Sales features.
- Do not open Build Intel, hub feature work, paid auth, or broad monolith cleanup.
- Do not make the nightly code audit autonomous.
