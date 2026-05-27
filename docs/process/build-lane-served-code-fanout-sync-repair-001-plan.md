# BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 Plan

Card: `BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001`
Closeout key: `build-lane-served-code-fanout-sync-repair-v1`

## What

Repair the build-lane fanout failure path so stale served dashboard code is reported as the root problem instead of also recording misleading Recent Builds closeout failures.

The May 18 direct-builder recovery found the dashboard serving commit `2f2c3a5` while repo `HEAD` was `5681441`. When `process:fanout-check` ran in that state, the stale served `/api/foundation/build-log` could not see newer closeout records, so telemetry recorded repeated `Recent Builds exposes this closeout`, proof-command, and where-it-lives failures. Those symptoms were downstream of stale served code, not separate build-log defects.

## Why

The build lane should route repeated failures to the right repair card. If stale served code fans out into false build-log failures, Steve and builders waste time chasing registry wiring when the right action is to restart the supervised dashboard/worker and rerun fanout.

This card keeps fanout strict. A stale served commit still fails the gate. The repair only prevents dependent Recent Builds checks from being counted as independent failures until served code matches `HEAD`.

## Scope

- Keep `process:fanout-check` failing when dashboard served commit differs from repo `HEAD`.
- Skip dependent Recent Builds checks while served code is stale, with plain-English restart guidance.
- Prove skipped dependent checks are not recorded as extra failure telemetry.
- Prove current served dashboard/worker code matches repo `HEAD` after the bounded runtime refresh.
- Prove representative fanout closeouts are visible through `/api/foundation/build-log` once served code is current.
- Register the repair in backlog, Current Sprint, Recent Work closeout, package scripts, and verifier coverage.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- `scripts/process-fanout-check.mjs` already owns served-code proof, closeout registry lookup, Recent Builds API lookup, and build-lane failure telemetry recording.
- `lib/build-lane-failure-telemetry.js` already ignores checks with `ok: true`, so skipped dependent checks can stay out of failure rollups without weakening the root failure.
- `lib/ship-gate-worker-live-job-pause.js` and `scripts/process-foundation-ship.mjs` already provide the bounded dashboard/worker restart path and worker scheduled-job pause.
- `/api/foundation-hub` already exposes dashboard and worker served-code metadata.
- `/api/foundation/build-log` already exposes Recent Builds closeout, proof-command, and where-it-lives rows when served code is current.
- Reuse `BUILD-LANE-RELIABILITY-SPRINT-001`, `BUILD-LANE-FAILURE-TELEMETRY-001`, and `SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001` as prior process truth.

Operator behavior:

- When a builder runs fanout against stale served code, the terminal should say the dashboard is stale and show the restart path instead of burying that root cause under extra Recent Builds registry-looking failures.
- Once served code is current, fanout should continue checking Recent Builds closeout, verifier proof, and where-it-lives normally.
- For Steve and the team, this unlocks a real workflow improvement: faster, higher-quality triage because the useful thing to do next is obvious from the failing check.

Implementation details:

- Add an explicit `SKIP` row state inside `process:fanout-check`.
- If `dashboard served commit matches repo HEAD` is red, skip the three served-build-log dependent checks with restart guidance.
- Keep the stale served-code check itself red and telemetry-recorded.
- Prove synthetic skipped rows produce only one failure event.
- Keep the focused proof fast and under 1 minute on the normal path; full verifier and ship gate run once at closeout.

## Acceptance Criteria

- Live backlog card exists with rich context.
- Plan and approval exist.
- Focused proof script exists and is registered in `package.json`.
- `process:fanout-check` prints `SKIP` for Recent Builds checks when stale served code is the root failure.
- Dogfood proves skipped Recent Builds checks do not create separate build-lane failure events.
- Dashboard and worker served commits match repo `HEAD`.
- Representative historical fanout cases expose closeout, verifier proof, and where-it-lives through the served build-log API.
- Closeout registry and verifier coverage include the card.
- No live extraction, auth-required or paid run, external write, Drive mutation, Agent Feedback auto-send, or hidden worker/subagent launch occurs.

## Definition Of Done

- `scripts/process-fanout-check.mjs` short-circuits dependent Recent Builds checks when served code is stale.
- `scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs` proves the behavior and manages the live card scaffold.
- `docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json` validates against this plan.
- `docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-build-lane-served-code-fanout-sync-repair-closeout.md` records the closeout.
- Focused proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Tests

```bash
node --check scripts/process-fanout-check.mjs scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs
npm run process:build-lane-served-code-fanout-sync-repair-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json --closeoutKey=build-lane-served-code-fanout-sync-repair-v1 --commitRef=HEAD
```

## Risks

- Risk: skipped rows could hide a real Recent Builds defect. Mitigation: only skip them while served code is stale; once served code matches `HEAD`, the checks run and fail normally.
- Risk: this could be mistaken for permission to skip served-code proof. Mitigation: the served-code mismatch remains a hard failure and the dogfood proves only dependent checks are skipped.
- Risk: the repair could drift into deployment redesign or auto-restart-on-push. Mitigation: this card only changes fanout failure classification; auto-restart remains a separate card.
- Repair path: if focused proof fails, fix the exact fanout skip behavior, approval/closeout wiring, or runtime served-code proof. If full ship fails on stale served code, use the existing worker-pause runtime restart path and rerun the gate.

## Gate Decision Tree

This card touches a process gate, a focused proof script, package scripts, verifier coverage, and closeout registry files, so it uses the full gate path:

- Static syntax checks for changed JS.
- Focused proof while iterating.
- `backlog:hygiene`.
- `foundation:verify`.
- Full `process:foundation-ship` before push.

Do not run repeated full verifier loops while the focused proof is still red.

## Not Next

- Do not launch parallel builders during this card.
- Do not use hidden subagents.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
- Do not run live extraction, provider/model probes, auth-required jobs, paid jobs, external writes, Drive permission mutation, or Agent Feedback auto-send.
- Do not redesign Foundation UI.
