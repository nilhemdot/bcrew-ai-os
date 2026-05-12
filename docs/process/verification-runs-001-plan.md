# VERIFICATION-RUNS-001 Verification Runs Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `VERIFICATION-RUNS-001`

## What

Build the seventh Foundation Source Once-Over card: a read-only verification run that catches stale research cards, synthesized findings, action routes, and backlog hygiene findings before they become a graveyard.

V1 creates a proposed-only stale-verification report. It does not auto-close cards, archive synthesized items, reject routes, apply decisions, send messages, mutate Drive, or build Reply/Watching Loop.

## Why

The old system had verification runs that stopped stale findings from living forever. The new Foundation has better source/proof infrastructure, but stale research and finding queues can still accumulate unless the system checks them automatically.

Useful operator behavior: Steve can open Foundation and see which research cards, synthesized items, action routes, and backlog hygiene findings need refresh, expiry, promotion, deferral, or owner review.

## Acceptance Criteria

- `lib/verification-runs.js` builds a snapshot from live backlog, research curation, synthesis, Action Router, and backlog hygiene inputs.
- Research cards older than the review threshold are flagged for promote/defer/future-concepts review.
- Synthesized items older than the stale-finding threshold are flagged for refresh, routing, or expiry review.
- Pending/approved action routes older than the stale-route threshold are flagged for review or expiry.
- Backlog hygiene findings are included as verification candidates.
- The summary proves `proposedOnly: true` and `autoExpiredCount: 0`.
- A Foundation job definition exists for the scheduled verification run.
- `/api/foundation/verification-runs` returns the snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same `verificationRuns` payload.
- Foundation UI renders verification runs under Source Lifecycle.
- Plan Critic must return `pass` with score at least 9.8; `revise` blocks closeout until this plan or implementation is repaired.
- The focused proof validates approval, Plan Critic, real function path, synthetic stale/fresh behavior, API/UI/process wiring, current-plan/current-state/build-log fanout, and Current Sprint advancement to `PER-USER-CHANGELOG-001`.

## Definition Of Done

Done means `verification-runs-v1` is closed with:

- valid approval file at `docs/process/approvals/VERIFICATION-RUNS-001.json`;
- verification runs library at `lib/verification-runs.js`;
- API route at `/api/foundation/verification-runs`;
- Source Lifecycle/Foundation Hub payload wiring;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- Foundation job registry entry for scheduled stale verification;
- focused proof at `scripts/process-verification-runs-check.mjs`;
- package script `process:verification-runs-check`;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `PER-USER-CHANGELOG-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing work reused:

- `lib/phase-d-cleanup.js`
- `lib/backlog-hygiene.js`
- `lib/foundation-db.js`
- `lib/intelligence-synthesis.js`
- `lib/intelligence-action-router.js`
- `lib/foundation-current-sprint.js`
- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/verification-runs.js` as the read-only stale verification report builder.
- Consume the existing backlog/research/synthesis/action-router/hygiene snapshots; do not create a new write store in V1.
- Add a scheduled Foundation job definition that runs the focused proof/report command.
- Add the verification runs API and attach the payload to existing Source Lifecycle and Foundation Hub responses.
- Render the stale-verification report in the existing Foundation Source Lifecycle view.
- Advance Source Once-Over to `PER-USER-CHANGELOG-001` after proof passes.

Not Next:

- Do not build Reply Parser or Watching Items.
- Do not auto-close research cards.
- Do not archive synthesized items.
- Do not reject, approve, apply, or reroute action routes.
- Do not build per-user changelog, restricted decision queue, Strategy Hub expansion, Marketing Pipeline, Telegram bots, Directors, or Drive ACL changes in this card.

## Risks

- The report can look like an automatic cleanup system when it is only proposed-only. Repair path: `proposedOnly` stays true, `autoExpiredCount` stays zero, and UI copy says review is required.
- A stale threshold can flag too many old research cards. Repair path: V1 prioritizes candidates and recommends action, but it does not mutate the backlog.
- The card can drift into Reply/Watching Loop. Repair path: this card only detects stale findings; reply parsing and resolution writeback stay explicitly out of scope.
- If the focused proof fails, fix the real snapshot, API, UI, sprint state, or backlog wiring before trying the full gate.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, UI, current sprint, build log, docs, package scripts, Foundation jobs, and canonical verifier coverage.
- Focused gate: `npm run process:verification-runs-check -- --json=true`; this is the fast default loop and should stay under 2 minutes.
- Full gate: `npm run process:foundation-ship -- --card=VERIFICATION-RUNS-001 --planApprovalRef=docs/process/approvals/VERIFICATION-RUNS-001.json --closeoutKey=verification-runs-v1 --commitRef=HEAD`.
- Blast radius: Foundation Source Lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, Foundation job registry, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:verification-runs-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=VERIFICATION-RUNS-001 --planApprovalRef=docs/process/approvals/VERIFICATION-RUNS-001.json --closeoutKey=verification-runs-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real verification runs snapshot function;
- prove stale research is flagged and fresh research is not;
- prove stale synthesized findings are flagged and fresh findings are not;
- prove stale pending/approved action routes are flagged and applied routes are not;
- prove backlog hygiene findings become verification candidates;
- prove V1 is proposed-only with zero auto-expiry;
- prove Current Sprint advances to `PER-USER-CHANGELOG-001`;
- reject substring-only verifier theatre by failing if function/API/UI/script paths are missing.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional, under 2 minutes in normal local runs.
- Run the full ship gate only after the card is committed.
