# FOUNDATION-OPERATOR-PULSE-001 Plan

## Goal

Build one concise Steve-facing Foundation operator pulse inside the local Foundation dashboard. The pulse must answer what is green, what needs repair, what needs approval, what shipped recently, and what card should run next without sending external messages or inventing a new manual report.

## Current Truth

- Foundation is now raw-green after the deep auditor, deep merge audit, and old-system research harvest work.
- Steve asked to preserve the gold from the long planning conversations and then keep the sprint moving without babysitting.
- The next extraction cards need a simple operator readout before GOD-mode extraction expands source coverage.
- Existing surfaces already expose System Health, repeated-failure telemetry, Current Sprint, backlog hygiene, build log, and change events, but Steve needs the short answer first.

## Scope

- Add a local admin API at `/api/foundation/operator-pulse`.
- Build the pulse from live Foundation truth: System Health, repeated-failure telemetry, Current Sprint, backlog hygiene, pending approvals, recent builds, recent change events, and live backlog.
- Add a visible panel to Runtime Health near the top so Steve sees the operator readout before diagnostic detail.
- Add focused dogfood proof that the pulse turns red health and repeated failures into repair status, approval-bound rows into review status, and green state into a clear next-card recommendation.
- Keep the surface local/operator-only. No email, Telegram, Slack, public posting, auto-fix, source-system writes, credential mutation, Drive permission mutation, paid/provider access, or browser-auth work.

## Details

The implementation lives in:

- `lib/foundation-operator-pulse.js`
- `lib/foundation-operator-routes.js`
- `public/foundation-data.js`
- `public/foundation-runtime-renderers.js`
- `public/foundation-operations-renderers.js`
- `scripts/process-foundation-operator-pulse-check.mjs`

The focused proof checks:

- approval integrity
- live backlog card state
- package script wiring
- admin-gated API route
- server dependency wiring
- Runtime Health UI placement
- dogfood states for green, red health, repeated-failure risk, and approval review
- local-only boundaries
- required cards for System Health, Repeated Failures, Current Sprint, Backlog Hygiene, and Approvals

## Acceptance

- `npm run process:foundation-operator-pulse-check -- --json` is healthy.
- `/api/foundation/operator-pulse` is admin-gated and source-backed.
- Runtime Health displays the operator pulse above the diagnostic panels.
- The pulse does not send external messages, mutate source systems, mutate credentials, mutate Drive permissions, auto-fix code, or run provider/browser-auth work.
- System Health remains green.
- Repeated-failure gate remains healthy.
- `foundation:verify` passes.
- `process:foundation-ship` passes.

## Not Next

- Do not build `WEB-GODMODE-001` in this card.
- Do not add email, Telegram, Slack, or public sends.
- Do not turn the pulse into a new giant dashboard.
- Do not run broad/private extraction.
- Do not mutate credentials, provider config, Drive permissions, or external systems.
