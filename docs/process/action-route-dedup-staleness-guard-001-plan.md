# ACTION-ROUTE-DEDUP-STALENESS-GUARD-001 Plan

Card: `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`

Closeout key: `action-route-dedup-staleness-guard-v1`

## What

Add the Action Route Review Inbox dedupe and staleness guard so repeated proposed findings are grouped, stale unresolved findings are visible, and every noisy item has a closure next action without deleting history or writing to external systems.

## Why

Steve called out the pattern directly: the system must stop making humans rediscover the same recurring noise. `ACTION-ROUTE-REVIEW-INBOX-001` separated proposed findings from real Backlog work, and `ACTION-ROUTE-PROMOTION-WORKFLOW-001` added governed actions. This card makes unresolved duplicates and stale rows visible as a Foundation quality signal so they can be linked, marked duplicate, rejected, snoozed, assigned, or promoted deliberately.

## Acceptance Criteria

- Live backlog card `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001` exists and moves through Current Sprint correctly.
- Required scaffold metadata is complete before `building_now`.
- `lib/action-route-dedup-staleness-guard.js` owns duplicate grouping, stale classification, thresholds, validator, and dogfood proof.
- Duplicate grouping preserves every review item and links repeated route or semantic clusters instead of hiding or deleting rows.
- Route-derived backlog rows linked to an action route are classified as informational linked duplicates, not new work.
- Staleness thresholds are executable: unresolved items at 3+ days are yellow watch and 7+ days are red risk.
- Every stale item and duplicate cluster carries a next action.
- Review Inbox live payload includes `dedupStaleness`, `dedupeKey`, duplicate cluster IDs, and staleness status.
- Control-loop verifier checks the live Review Inbox dedupe/staleness contract, not only source strings.
- UI shows duplicate/stale status using the existing Review Inbox layout without broad redesign.
- Closeout registry growth goes into an action-route closeout record module instead of pushing the cleanup registry farther over preferred budget.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.

## Definition Of Done

Done means Action Route Review Inbox can show repeated unresolved findings as linked duplicate clusters, stale unresolved findings as yellow/red with next action, every review row remains present, the live route/verifier/UI all carry the same contract, the card is closed under `action-route-dedup-staleness-guard-v1`, and the commit is pushed.

Done does not mean the system auto-rejects, auto-snoozes, hides, deletes, or externally writes any action-route finding. It also does not mean live extraction or connector work starts.

## Details

Existing work to reuse:

- `ACTION-ROUTE-REVIEW-INBOX-001` read model and Foundation page.
- `ACTION-ROUTE-PROMOTION-WORKFLOW-001` review actions for duplicate, link, reject, snooze, assign, answer, confirm, and promote.
- `BUILD-LANE-FAILURE-TELEMETRY-001` repeated-failure doctrine.
- Existing control-loop verifier and live API snapshot wiring.

Implementation:

- Add `lib/action-route-dedup-staleness-guard.js`.
- Attach the guard inside `buildActionRouteReviewInboxSnapshot()`.
- Add dedupe/staleness summary fields to the Review Inbox payload.
- Add existing-layout pills/metrics to the Review Inbox renderer.
- Add control-loop verifier checks for the live API contract.
- Add `lib/foundation-build-closeout-action-route-records.js` and import it from the closeout registry so the existing cleanup registry does not keep growing past the preferred handwritten budget.
- Add focused proof script, package script, approval, closeout, and current plan/state updates.

Gate decision tree:

- Static gate first: `node --check` on the new module, Review Inbox module, control-loop verifier, focused proof, and root verifier.
- Focused gate while iterating: run `process:action-route-dedup-staleness-guard-check` through `scoping`, `sprint_ready`, and `building_now`.
- Targeted full-verifier repair only if the full verifier itself is red.
- Final ship gate: `process:foundation-ship` before push.

Operator value and speed:

- Useful operator behavior: Steve can see repeated proposed findings as clusters and stale unresolved rows as age risk instead of reading the same pile repeatedly.
- The guard points to the proper workflow actions rather than inventing new side effects.
- The proof stays proportional: synthetic dogfood covers duplicate/stale logic, and `foundation:verify` proves live route wiring.

Shared-file and size plan:

- Shared files touched are `scripts/foundation-verify.mjs`, `lib/foundation-verifier-control-loop.js`, `lib/action-route-review-inbox.js`, `public/foundation-action-route-review-inbox-renderers.js`, `package.json`, and the closeout registry.
- Main session approved this overnight Foundation queue and owns the shared-file coordination. If another builder needs these same files, coordinate before commit/push.
- Split plan / no-new-responsibility plan: `lib/action-route-dedup-staleness-guard.js` owns the dedupe/staleness domain. Shared files only attach, display, register, or verify the contract.
- `scripts/foundation-verify.mjs` stays under 5,000 lines with one coverage import only.
- `lib/foundation-build-closeout-cleanup-records.js` is already at the preferred 1,500-line edge, so new action-route closeout records go into `lib/foundation-build-closeout-action-route-records.js`.
- Keep new hand-written module and focused proof under 1,500 lines each.
- Explicit artifact budgets: approval JSON under 5 KB, closeout under 12 KB, plan under 12 KB, and no report artifact/data record may hide missing source proof.

Read/write posture:

- This card is read-model and internal process metadata only.
- It permits Current Sprint/backlog scaffold writes through the focused proof when `--apply` or `--close-card` is explicit.
- It does not permit live extraction, transcript fetches, screenshots, crawl, summarization, model/provider calls, auth-required or paid runs, Gmail/ClickUp/Drive/external writes, Drive permission mutation, Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work.

## Risks

- Risk: duplicate grouping hides history.
  - Mitigation: every review item remains present; clusters link rows and carry review item IDs.
- Risk: stale risk becomes another warning nobody can act on.
  - Mitigation: every stale item and duplicate cluster has a next action tied to existing Review Inbox workflow actions.
- Risk: this drifts into automatic rejection or external writeback.
  - Mitigation: proof scans for extraction/auth/model/external-write tokens and the card has no mutation route changes.
- Risk: verifier only checks source strings.
  - Mitigation: control-loop verifier checks live Review Inbox API fields from the live API snapshot.
- Risk: registry/doc bloat.
  - Mitigation: new action-route closeout registry module instead of expanding the already-full cleanup registry.
- Risk: proof fails or behavior regresses.
  - Repair path: fail closed, keep the card open, repair the exact guard/route/verifier field mismatch, and revise plan/approval if grouping or stale policy cannot preserve history and no-external-write posture.

Not next:

- No auto-delete, auto-hide, auto-reject, or auto-snooze.
- No live extraction.
- No transcript fetches, screenshots, crawl, summarization, model calls, or provider probes.
- No auth-required or paid runs.
- No external writes.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad visual UI redesign.
- No Drive permission mutation.
- No live Agent Feedback auto-send.

## Tests

Focused loop:

```bash
node --check lib/action-route-dedup-staleness-guard.js lib/action-route-review-inbox.js lib/foundation-verifier-control-loop.js scripts/process-action-route-dedup-staleness-guard-check.mjs scripts/foundation-verify.mjs
npm run process:action-route-dedup-staleness-guard-check -- --apply --stage=scoping --json
npm run process:action-route-dedup-staleness-guard-check -- --apply --stage=sprint_ready --json
npm run process:action-route-dedup-staleness-guard-check -- --apply --stage=building_now --json
```

Final gate:

```bash
npm run process:action-route-dedup-staleness-guard-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=ACTION-ROUTE-DEDUP-STALENESS-GUARD-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json --closeoutKey=action-route-dedup-staleness-guard-v1 --commitRef=HEAD
```
