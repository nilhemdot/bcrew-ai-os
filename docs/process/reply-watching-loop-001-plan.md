# REPLY-WATCHING-LOOP-001 Plan

## What

Replace the old BCrew-Buddy Reply Parser / `watching_items` pattern with a governed Foundation action loop contract.

V1 scope:

- Promote the useful old reply parser intent model: resolution, correction, new info, question, acknowledgment, and ambiguous.
- Reuse the existing Action Route Review Inbox, Action Route Promotion Workflow, `intelligence_action_routes`, `decisions`, `open_questions`, `backlog_items`, `intelligence_synthesized_items`, and `change_events`.
- Define loop states: open, needs clarification, handled, snoozed, and rejected.
- Prove future replies can classify into proposed transitions without creating a second private queue or external side effects.
- Close `REPLY-WATCHING-LOOP-001` and advance Current Sprint to `STRATEGY-QUARTER-001`.

Not next:

- Do not rebuild the old SQLite `brief_replies` / `watching_items` tables.
- Do not send emails/messages, mutate external systems, rotate credentials, change provider config, mutate Drive permissions, or run paid/provider/browser-auth work.
- Do not run live Gmail/Missive/Slack reply ingestion from this card.
- Do not auto-close ambiguous replies or low-confidence resolutions.
- Do not build Strategy Hub expansion, People, Harlan, Crewbert, source/extraction, or agent runtime work from this card.

## Why

The old system had a useful loop idea: people reply to briefs, the system interprets the reply, and findings stop living forever. The broken part was the extra private queue and fragile autonomous resolution. Foundation already has better ledgers now. This card keeps the useful behavior and makes the replacement path explicit so future replies land in existing governed truth instead of another hidden graveyard.

Operator value: Steve gets a clear answer to "where do replies and handled/not-handled work go?" The answer is the governed action loop, not a second queue. That improves real workflow quality because surfaced intelligence can become handled, clarified, snoozed, rejected, or kept open with owner/evidence rather than piling up until Steve notices manually.

## Acceptance Criteria

- `lib/reply-watching-loop.js` defines the old-pattern salvage, allowed ledgers, forbidden second-queue tables, reply intent classifier, transition validator, snapshot builder, and dogfood proof.
- The live snapshot reuses Action Route Review Inbox items and open questions.
- The live snapshot reports existing ledgers only and fails if `watching_items`, `brief_replies`, `reply_parser_items`, or `reply_watching_items` exist.
- Every loop item has owner/evidence or the proof fails.
- Ambiguous replies and low-confidence resolutions cannot auto-close work.
- Unsafe flags for external writes, runtime work, Drive mutation, credential/provider changes, or paid/auth work fail closed.
- Current Sprint advances to `STRATEGY-QUARTER-001` only after focused proof is healthy.

## Definition Of Done

- Focused proof is healthy.
- Backlog card is closed with `reply-watching-loop-v1`.
- Current Sprint advances to `STRATEGY-QUARTER-001`.
- System Health is raw green.
- Repeated-failure gate is healthy.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- main is clean and pushed.

## Details

Existing work reused:

- Existing code: `lib/action-route-review-inbox.js`, `lib/action-route-promotion-workflow.js`, `lib/action-route-dedup-staleness-guard.js`, `lib/verification-runs.js`, `lib/foundation-db.js`, `lib/foundation-current-sprint.js`, and `lib/process-plan-critic.js`.
- Existing docs: old BCrew-Buddy reply parser skill, `docs/process/action-route-review-inbox-001-plan.md`, `docs/process/action-route-promotion-workflow-001-plan.md`, `docs/process/action-route-dedup-staleness-guard-001-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-action-route-review-inbox-check.mjs`, `scripts/process-action-route-promotion-workflow-check.mjs`, `scripts/process-action-route-dedup-staleness-guard-check.mjs`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Current Sprint and live backlog truth: `REPLY-WATCHING-LOOP-001` stays active until this proof closes it; `STRATEGY-QUARTER-001` stays scoping until its own plan and proof pass.

Behavior proof:

- `buildReplyWatchingLoopSnapshot()` consumes the real Action Route Review Inbox read model and real open-question rows.
- `validateReplyWatchingLoopTransition()` proves reply classification produces proposed internal transitions only; it never sends, mutates external systems, or creates a second queue.
- Dogfood recreates the old-system failure classes: hidden second queue, missing owner/evidence, ambiguous auto-close, low-confidence resolution auto-close, and external side-effect flags.
- No substring-only proof is accepted. Source snippets are context; the pass/fail invariant is the action-loop state contract over existing ledgers.

## Risks

- The card could rebuild the old queue under a new name.
  - Repair path: fail proof if forbidden queue table names exist or if snapshot source is not the Action Route Review Inbox.
- Reply classification could over-close work.
  - Repair path: ambiguous and low-confidence resolution fixtures fail closed.
- The loop could mutate external systems.
  - Repair path: unsafe flags fail closed and V1 records internal proposed transitions only.
- The card could become Strategy/People/agent feature work.
  - Repair path: not-next boundaries and Current Sprint proof keep this as a Foundation control-loop contract.

## Tests

Gate decision tree uses static, focused, and full verification based on blast radius. Static syntax is not enough because this card closes a live backlog card and advances Current Sprint. Focused proof runs first through `process:reply-watching-loop-check`; full gates run at closeout through `foundation:verify` and `process:foundation-ship`.

Commands:

- `node --check lib/reply-watching-loop.js scripts/process-reply-watching-loop-check.mjs`
- `npm run process:reply-watching-loop-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=REPLY-WATCHING-LOOP-001 --closeoutKey=reply-watching-loop-v1`
- `npm run process:foundation-ship -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --commitRef=HEAD`

Speed budget: focused proof should stay under 2 minutes; full gates run at closeout/ship.
