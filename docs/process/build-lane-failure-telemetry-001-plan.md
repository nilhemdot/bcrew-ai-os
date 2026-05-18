# BUILD-LANE-FAILURE-TELEMETRY-001 Plan

## What
Add a Foundation build-lane failure telemetry layer so failed focused proofs, verifier checks, ship checks, fanout checks, post-ship fanout checks, and backlog hygiene failures are recorded as normalized failure events.

Each event records command, card ID, sprint ID, closeout key, check name, failure class, file/module when known, short detail, timestamp, and a stable fingerprint. The rollup groups repeated fingerprints over 24 hours and 7 days:

- 3 repeats in 24 hours become yellow/watch.
- 5 repeats in 24 hours become red/risk.
- the same fingerprint blocking more than one card becomes red/risk.
- one-off failures stay visible but do not create noise.

This is observability and routing pressure only. It does not weaken any verifier, bypass any check, auto-fix code, or write to external systems.

## Why
The build lane has been losing time to repeated process failures that look unique in the moment but are really the same pattern:

- verifier/control-loop snapshot wiring that disagrees with a working live route;
- Plan Critic or approval metadata repairs after a card is already in motion;
- served-code or Recent Builds fanout drift after a local closeout exists;
- backlog hygiene or ship-gate failures that repeat without a repair card.

Steve needs the system to learn from these repeats. A verifier that fails once is useful. A verifier that fails the same way five times needs to say, plainly, that the process pattern is broken and must be repaired.

Useful operator behavior in the real workflow: Steve can open System Health and see that "verifier snapshot wiring failed 3 times today" or "thin Plan Critic plans failed 5 times today" instead of reading scattered terminal failures. This unlocks speed and quality because builders can route the repeated failure to a repair card instead of hand-fixing the same class of problem every sprint.

## Acceptance Criteria
- `lib/build-lane-failure-telemetry.js` owns the event contract, fingerprinting, classification, 24-hour/7-day rollup, local `.git` log writer, summary writer, and synthetic dogfood proof.
- Failed focused proof/check arrays can be converted to telemetry events.
- Failed command output or thrown ship-gate errors can be converted to telemetry events.
- `process:foundation-ship` records failure telemetry for failed ship-gate substeps.
- `process:ship-check`, `process:fanout-check`, and `process:post-ship-fanout` record failed checks.
- `backlog:hygiene` records critical hygiene failures when they occur.
- System Health includes build-lane failure red/yellow counts and top repeated failure findings.
- The Foundation System Health panel shows repeated build-lane failure status.
- Verifier health live summary checks the package script, dogfood proof, System Health surface, renderer surface, and closeout registry when closed.
- Verifier card-ID coverage includes `BUILD-LANE-FAILURE-TELEMETRY-001`.
- The focused proof dogfoods repeated verifier snapshot wiring failure, repeated thin-plan Plan Critic failure, one-off failure non-escalation, and multi-card served-code/fanout drift.
- Live backlog and Current Sprint metadata are complete before `building_now`.

## Definition Of Done
- Add the telemetry module and focused proof script.
- Register `process:build-lane-failure-telemetry-check`.
- Add plan approval, closeout registry record, and closeout handoff.
- Update current plan/state with the injected P0 build-lane telemetry card and next queue handoff.
- Move the live card through Current Sprint stages and close it under `build-lane-failure-telemetry-v1`.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.

## Details
Existing code to reuse:

- `process-write-guard.js` for explicit apply/close-card posture.
- `foundation_sprints`, `foundation_sprint_items`, `backlog_items`, and `plan_critic_runs` for live process truth.
- `build-lane-reliability.js` for scaffold and Current Sprint metadata validation.
- `foundation-system-health.js` for operator health rollups.
- `foundation-verifier-health-live-summary.js` for hidden health-surface coverage.
- `process:foundation-ship`, `process:ship-check`, `process:fanout-check`, `process:post-ship-fanout`, and `backlog:hygiene`.

Gate decision tree: this is a P0 Foundation process card and uses the full gate. During iteration, use static syntax checks and the focused proof first. Run `foundation:verify` only after focused proof is green, then run full `process:foundation-ship` before push.

Shared-file coordination: this is main-session approved Foundation process work. Steve explicitly injected this P0 card in the main Foundation build lane and approved touching shared Foundation process files for this repair. `requestedSharedFiles` are declared as the ship/check scripts, System Health, verifier health summary, coverage IDs, closeout registry, current plan/state, docs/process artifacts, and `package.json`. No Harlan/Fal/voice/Canva/OpenHuman/mockup work is in scope.

Implementation shape:

- The telemetry module is pure for classification, fingerprinting, extraction, rollup, and dogfood.
- Local event storage lives only in `.git/foundation-build-lane-failure-telemetry.jsonl`; this keeps runtime failure history local and avoids committing noisy logs.
- The System Health snapshot reads telemetry events and surfaces repeated fingerprints as watch/risk rows.
- Process scripts record telemetry only on failure paths and never turn a failing gate green.
- The focused proof validates both behavior and wiring so future missing hooks do not silently pass.
- Verifier/check paths remain read-only by default. The focused process script can create/update the live backlog card, Plan Critic row, and Current Sprint overlay only with explicit `--apply` or `--close-card` write flags through `process-write-guard.js`.

File-size plan:

- New hand-written module stays under 1,500 lines.
- New focused proof script stays under 1,500 lines.
- `scripts/foundation-verify.mjs` remains under the 5,000-line hard guardrail; this card only adds a minimal coverage constant import and does not add new verifier responsibility to the root.
- `lib/foundation-system-health.js`, `lib/foundation-verifier-health-live-summary.js`, and process hook scripts stay under the preferred hand-written module budget where practical; if any touched hand-written file crosses 1,500 lines, the next card must split by domain before adding new responsibility.
- Split plan: `public/foundation-runtime-renderers.js` is already above the preferred 1,500-line budget, so this card touches it only as a thin wrapper display row with no new responsibility; new build-lane telemetry behavior stays in `lib/build-lane-failure-telemetry.js` and System Health data assembly, not in the renderer.
- Approval JSON is a data record budgeted under 80 lines.
- Closeout handoff is a report artifact budgeted under 120 lines.
- Local telemetry JSONL and summary files live under `.git/` and are untracked runtime artifacts; they are not committed repo truth.

## Risks
Telemetry can become another noisy dashboard if it treats every one-off failure as urgent. The mitigation is fingerprint grouping and thresholds: one-offs stay informational, 3 repeats become yellow, and 5 repeats or multi-card blocking becomes red.

Another risk is hiding verifier failures by classifying them as telemetry. The mitigation is explicit: telemetry records failures but does not weaken, skip, demote, or retry any gate.

Repair path: if the focused proof fails, repair the missing event hook, rollup, System Health surface, scaffold metadata, or closeout wiring. Do not move to extraction or feature work until this card ships.

## Tests
- `node --check lib/build-lane-failure-telemetry.js scripts/process-build-lane-failure-telemetry-check.mjs lib/foundation-system-health.js scripts/process-foundation-ship.mjs`
- `npm run process:build-lane-failure-telemetry-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-LANE-FAILURE-TELEMETRY-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-FAILURE-TELEMETRY-001.json --closeoutKey=build-lane-failure-telemetry-v1 --commitRef=HEAD`

## Not Next
Do not run live extraction, transcript fetches, screenshots, crawls, model calls, auth-required or paid runs, connector/OAuth repair, external writes, Drive permission mutation, Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work in this card.
