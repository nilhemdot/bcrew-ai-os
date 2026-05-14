# SYSTEM-HEALTH-AUDITOR-001 Plan

## What

Turn the existing deterministic audit loop into an Operating Reliability morning health surface. V1 aggregates connector uptime, runtime activation, code-quality audit posture, verifier posture, and plan/state drift into one report-only status object.

This card does not build an LLM senior-engineer audit. That is `RECURRING-DEEP-AUDIT-001` in the follow-up sprint. This card makes the deterministic health surface real and visible.

## Why

Steve thought the nightly reviewer was already running and reviewing everything. Actual truth: the deterministic scanner exists, but it is manual/report-first, and the deep audit was a one-time run.

Foundation needs a morning surface that says what ran, what is manual, what is stale, and what needs review. This makes the gap visible instead of pretending the reviewer exists.

## Acceptance Criteria

- Morning health snapshot includes connector uptime, runtime activation, code-quality audit job posture, latest current sprint health, and follow-up deep-audit card status.
- Report clearly says deterministic scanner is not the same as recurring senior-engineer deep audit.
- No auto-fixes, no auto backlog mutation, no autonomous dev.
- The code-quality audit job posture is explicit: scheduled if approved in this sprint, otherwise manual with reason.
- Dogfood proof simulates a missing/stale audit report and proves the morning surface reports it as a review item instead of green.

## Definition Of Done

- Morning health builder is deterministic and read-only.
- Foundation Hub full diagnostics include the health surface.
- Process proof validates report-only boundaries and stale/missing audit detection.
- Current Sprint doctrine is populated and the card has a durable Plan Critic pass.
- Full ship gate passes before push.

## Details

Reuse:

- `lib/code-quality-nightly-audit.js` constants and detector output.
- `lib/foundation-jobs.js` job registry.
- `lib/connector-uptime-monitor.js` and runtime activation output.
- `buildFoundationCurrentSprintStatus()` for current sprint health.
- Follow-up scope for `RECURRING-DEEP-AUDIT-001`.

Gate decision for this card: full.

Decision tree: static proof is too weak because health-surface behavior changes; focused proof is required through the actual morning health function path and synthetic stale/missing reports; full proof is required because the blast radius touches Foundation Hub diagnostics, package scripts, process proof, and verifier coverage. Any touch to `server.js` must be a thin payload composition only with no new responsibility in that large route file. Any touch to `scripts/foundation-verify.mjs` must be a thin registration/check only with no new responsibility in the large verifier file. Durable morning health behavior lives in the new module boundary outside the monolith.

Existing code to reuse: `lib/code-quality-nightly-audit.js`, `lib/foundation-jobs.js`, `lib/foundation-current-sprint.js`, and the connector uptime/runtime activation builders. Existing docs to reuse: the 2026-05-13 deep audit, the two-sprint scope handoff, and Current Sprint doctrine. Existing scripts to reuse: `process:code-quality-nightly-audit-check`, `process:foundation-operating-reliability-check`, `foundation:verify`, and `process:foundation-ship`. Live backlog and Current Sprint truth provide card status and follow-up-card status.

Operator behavior unlocked: Steve can see in one morning health report whether the deterministic scanner is manual, whether recurring deep audit is only scoped, and whether connector/runtime health needs attention. This improves speed and quality because the operator stops assuming a reviewer is running when it is not.

The focused proof command must be fast, proportional, and target under 2 minutes so it is useful every morning instead of another heavy report.

## Risks

- Risk: Steve reads the deterministic audit as a deep code review.
  - Repair path: plain-English distinction is required in the payload/report.
- Risk: this silently schedules a job without approval.
  - Repair path: job posture is visible and scheduled mutation guard must pass; no mutating job can be scheduled.
- Risk: health surface turns red forever due stale old reports.
  - Repair path: use bounded finding severity and a clear next action rather than blocking every route.

## Tests

```bash
npm run process:foundation-operating-reliability-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SYSTEM-HEALTH-AUDITOR-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-AUDITOR-001.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

Focused dogfood must recreate the exact confusion from the chat: deterministic scanner exists but is manual, recurring deep audit is not built yet, and the health surface must say that plainly.

The proof command must call real function/API behavior and reject substring-only proof. A `.includes()` check for words like "nightly" or "audit" is not accepted.

## Not Next

- Do not build `RECURRING-DEEP-AUDIT-001` in this sprint.
- Do not run autonomous code-review agents.
- Do not auto-create cards from the audit output.
- Do not do broad frontend polish.
