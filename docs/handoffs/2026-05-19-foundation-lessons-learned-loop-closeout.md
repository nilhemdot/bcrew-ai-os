# FOUNDATION-LESSONS-LEARNED-LOOP-001 Closeout

Closeout key: `foundation-lessons-learned-loop-v1`

## Summary

`FOUNDATION-LESSONS-LEARNED-LOOP-001` adds the Foundation self-improvement loop.

The important behavior: documentation-only lessons fail. A lesson must become a live/scoped backlog card, verifier rule, Plan Critic rule, Current Sprint gate, durable doctrine, active repair blocker, approval-required exception, or explicit no-op with proof.

## What Changed

- Added `lib/foundation-lessons-learned-loop.js` with reusable lesson-action evaluation, runtime signal routing, local/private memory metadata signal handling, and dogfood proof.
- Added `scripts/process-foundation-lessons-learned-loop-check.mjs`.
- Registered `foundation-lessons-learned-loop` as a scheduled read-only Foundation job at 05:45 America/Toronto.
- Added `process:foundation-lessons-learned-loop-check`.
- Added durable AGENTS doctrine for repeated-failure repair triggers, lessons-not-done-by-documentation, and lane ownership.
- Added a narrow Missive current-sync support fix after closeout proof exposed a raw health blocker: transient per-item archive deadlocks now retry through the existing Foundation gate retry classifier instead of failing the whole scheduled sync on the first transient item.
- Added a narrow Drive content support fix after closeout proof exposed a raw health blocker: Drive-extracted text strips Postgres-incompatible NUL bytes before hash/store, and shared communication artifact writes sanitize text/json payloads at the store boundary.
- Added the explicit read-only mutation allowlist row for the scheduled lessons loop job.
- Added a narrow self-run health proof guard: the scheduled lessons loop may tolerate only its own in-progress scheduled/runtime row while proving recovery, and closeout/apply mode still requires strict System Health.
- Added a narrow full-diagnostics budget support fix: full diagnostics backlog rows keep verifier-needed status/closeout text but trim nonessential timestamp fields.
- Registered this closeout and verifier coverage.
- Advanced Current Sprint to `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001`.

## Privacy Boundary

Local conversation and memory review is `local_private_metadata_only`.

The loop does not copy private transcript excerpts into repo docs and does not use an external model/provider for private chat logs. Any external model use for private conversation review requires explicit Steve approval.

## Proof

- `node --check lib/foundation-lessons-learned-loop.js lib/foundation-jobs.js scripts/sync-missive-archive.mjs scripts/extract-drive-content.mjs lib/foundation-shared-comms-store.js lib/foundation-job-mutation-allowlist.js lib/hub-read-routes.js scripts/process-foundation-lessons-learned-loop-check.mjs`
- `npm run process:foundation-lessons-learned-loop-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-LESSONS-LEARNED-LOOP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-LESSONS-LEARNED-LOOP-001.json --closeoutKey=foundation-lessons-learned-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-LESSONS-LEARNED-LOOP-001 --closeoutKey=foundation-lessons-learned-loop-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-LESSONS-LEARNED-LOOP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-LESSONS-LEARNED-LOOP-001.json --closeoutKey=foundation-lessons-learned-loop-v1 --commitRef=HEAD`

## Known Limits

- This does not run a live LLM deep audit.
- This does not auto-implement lesson output from scheduled runs.
- This does not mutate source systems, Drive permissions, provider credentials, email, Agent Feedback, or external systems.
- Scheduled runs are read-only; explicit closeout mutation remains gated by `--apply --close-card`.

## Next

Continue Foundation-only with `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001`.
