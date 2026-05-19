# Foundation Main Chat Checkpoint - 2026-05-15

## Current Repo State

- `origin/main` is at `688ba5d` (`Foundation Route Budget Cleanup`).
- Foundation sprint `foundation-route-budget-cleanup-2026-05-14` is closed under `foundation-route-budget-cleanup-v1`.
- Final ship gate passed after commit:
  - `process:ship-check`: 31/31
  - `process:fanout-check`: 22/22
  - `process:post-ship-fanout`: 8/8
  - `foundation:verify`: 307/307
  - total Foundation ship gate: 47.5s / 300s target
- Dashboard and Foundation worker were restarted and served-code trust matched HEAD during the final gate.

## What Shipped In `688ba5d`

- `/api/source-of-truth` now delegates payload construction to `lib/source-of-truth-payload.js`.
- KPI health on the source-truth hot route now uses a bounded route cache while keeping the live `kpi:health` proof path separate.
- Default `/api/foundation-hub` now uses `lib/foundation-hub-summary-payload.js` to compact heavy summary sections.
- Foundation Hub compaction keeps critical named job rows such as `llm-auth-audit`; it is not just "latest N" because runtime proofs may rely on named job state.
- The route-budget proof script lives at `scripts/process-foundation-route-budget-cleanup-check.mjs`.
- The verifier now has explicit ID-named coverage for:
  - `SOURCE-OF-TRUTH-PERF-BUDGET-001`
  - `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- The route-budget verifier check was split into clearer subchecks so failures report the real cause.

## Latest Measured Route Proof

From the final focused proof:

- `/api/source-of-truth`: 10ms / 134,031 bytes.
- `/api/foundation-hub`: 79ms / 774,641 bytes.
- Dogfood rejects the old `2,489ms` source route failure.
- Dogfood rejects the old `872,726` byte Foundation Hub payload failure.

## Important Lessons From This Chat

- Earlier work was not all fake. Real systems are working: source contracts, KPI/FUB/Google checks, backlog/current sprint DB, atom/retrieval tables, action router, dashboard runtime state, and route-budget measured proof.
- The old problem was uneven proof quality: some checks were too string-based, some verifier paths used to be able to repair state, some gates had brittle exact-count assumptions.
- Treat Foundation failures as useful signal, but keep fixing brittle verifier assumptions when they punish legitimate growth.
- Do not treat "latest N" compaction as safe for runtime truth. Default summaries need "latest N plus critical named rows" when downstream health checks rely on named jobs.
- Closeout metadata must keep ownership clean: `backlogIds` are owned cards, `mentionedBacklogIds` are context cards, and they must not overlap.

## Current Dirty Worktree

Do not stage these unless Steve explicitly asks. They are Marketing Hub work from another chat:

- `docs/marketing/video-lab/README.md`
- `docs/marketing/video-lab/real-tool-implementation-plan.md`
- `public/marketing.html`
- `public/marketing.js`

## Marketing Parallel Work Rule

Marketing chat is allowed to continue only as a real Marketing-owned vertical slice with coordination:

- It may build a real Phase 2A live workflow, not dry-run-only.
- It should be FAL-first behind a provider adapter/router.
- It must include manual Steve approval before spend, one-job-at-a-time, hard spend cap, and env-var-only provider keys.
- It must not commit or push.
- If it needs `server.js`, `package.json`, DB/schema, shared `lib/`, or Foundation/process files, it must stop and show the patch to the Foundation chat first.

## Recommended Next Foundation Sprint

Name: `Foundation Ship Gate + Verifier Tightening Sprint`

Goal: reduce the Foundation friction we just experienced so future sprints fail smaller, clearer, and faster.

Proposed cards:

1. `VERIFY-FAILURE-REPORTER-001`
   - Add a failure-only / JSON summary mode for `foundation:verify`.
   - Acceptance: when a verifier run fails, the operator can get only failing checks plus summary without 600 lines of pass output.
   - Dogfood: run against a synthetic failing check and prove the failure-only report identifies it.

2. `CLOSEOUT-OWNERSHIP-GUARD-001`
   - Block closeout records where `backlogIds` and `mentionedBacklogIds` overlap.
   - Acceptance: guard catches the ownership/context smearing issue that happened during `foundation-route-budget-cleanup-v1`.
   - Dogfood: synthetic closeout with same ID in both lists fails; clean closeout passes.

3. `VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001`
   - Move the route-budget verifier logic added in the last sprint out of `scripts/foundation-verify.mjs` into a focused module.
   - Acceptance: `foundation-verify.mjs` keeps ID-named coverage but delegates detailed route-budget checks to a module.
   - Dogfood: module catches over-latency source route and over-budget Foundation Hub payload.

## Prompt For Fresh Builder Chat

Paste this:

```text
We are in /Users/bensoncrew/bcrew-ai-os.

Read AGENTS.md and the current repo context. Start from origin/main at 688ba5d.

Important: there are unrelated Marketing Hub files in the worktree from another chat:
- docs/marketing/video-lab/README.md
- docs/marketing/video-lab/real-tool-implementation-plan.md
- public/marketing.html
- public/marketing.js

Do not stage, edit, revert, or ship those unless Steve explicitly asks.

Open the next Foundation-only sprint: Foundation Ship Gate + Verifier Tightening Sprint.

Cards:
1. VERIFY-FAILURE-REPORTER-001
2. CLOSEOUT-OWNERSHIP-GUARD-001
3. VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001

Rules:
- Use live backlog/current sprint DB truth.
- Open sprint visibly, cards in Scoping first.
- Doctrine/plan per card.
- Plan Critic >= 9.8 per card before build.
- One Building Now card at a time.
- Dogfood proof per card: recreate or simulate the exact failure mode and prove the new code catches it.
- No hub feature work.
- No Marketing Video Lab work.
- No broad monolith refactor beyond the route-budget verifier module split.
- No verifier/check live-state mutation.
- Commit and push only Foundation/process files after gates pass.

Goal: make verifier failures smaller, clearer, and less brittle so future Foundation and hub work moves faster without hiding real risk.
```

