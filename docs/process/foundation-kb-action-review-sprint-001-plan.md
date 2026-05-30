# FOUNDATION-KB-ACTION-REVIEW-SPRINT-001 Plan

Card: `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`

Closeout key: `foundation-kb-action-review-sprint-v1`

## What

Close the Foundation KB/action-review sprint umbrella after verifying that every child card shipped cleanly and that the sprint no longer has ambiguous scoped backlog state.

This is a narrow V1 process closeout card. It does not alter the KB compiler, Review Inbox, promotion workflow, dedupe/staleness policy, source extraction, model routing, or external systems.

## Why

The live child-card truth shows the sprint work is done: build-lane telemetry, KB compiler V1, Action Route Review Inbox, promotion workflow, and dedupe/staleness guard have all shipped. Leaving the parent sprint card in `scoped` makes the next builder re-check old work and creates unclear ownership around what is actually next.

Useful operator behavior: Steve and the next visible builder get one clean answer about this sprint's state. This real workflow unlocks speed and quality because the child work is shipped, the umbrella is closed, and the next queue can start from repo truth without rediscovering old scoped state.

## Acceptance Criteria

- Live backlog card `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` exists and is closed only after proof.
- Child cards are all `done` in live backlog truth:
  - `BUILD-LANE-FAILURE-TELEMETRY-001`
  - `FOUNDATION-KB-COMPILER-V1-001`
  - `ACTION-ROUTE-REVIEW-INBOX-001`
  - `ACTION-ROUTE-PROMOTION-WORKFLOW-001`
  - `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`
- Each child closeout key is registered in the build closeout registry.
- Umbrella closeout key `foundation-kb-action-review-sprint-v1` is registered.
- Current Plan and Current State name the umbrella closeout and preserve the child closeout sequence.
- Focused proof dogfoods the exact failure modes: missing child, stale umbrella, missing closeout, and forbidden hidden-worker/extraction/model side-effect tokens.
- No live extraction, transcript fetch, screenshot capture, crawl, model call, provider probe, auth-required or paid run, external write, Drive permission mutation, Agent Feedback auto-send, hidden subagent, or feature work is launched.
- Backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.

## Definition Of Done

Done means the umbrella card is live `done`, the current sprint overlay records the umbrella closeout, the closeout registry and handoff exist, the focused proof passes, full Foundation verification passes, full ship gate passes, and the commit is pushed.

Done does not mean extraction starts, private sources are accessed, compiled pages are persisted, vectors/query indexes are created, action routes are externally applied, or any child-card behavior is redesigned.

## Details

Existing code, docs, scripts, and policy to reuse:

- Existing code: `lib/foundation-kb-compiler-v1.js`, `lib/action-route-review-inbox.js`, `lib/action-route-promotion-workflow.js`, `lib/action-route-dedup-staleness-guard.js`, and `lib/build-lane-failure-telemetry.js`.
- Existing scripts: `process:foundation-kb-compiler-v1-check`, `process:action-route-review-inbox-check`, `process:action-route-promotion-workflow-check`, and `process:action-route-dedup-staleness-guard-check`.
- Existing docs: the child plans, child approvals, child handoffs, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Live backlog and Current Sprint are task truth. The focused proof reads live card lanes and closeout registry behavior instead of trusting a markdown sentence.

Implementation:

- Add `lib/foundation-kb-action-review-sprint.js` for the umbrella child list, forbidden side-effect tokens, evaluator, and dogfood proof.
- Add `scripts/process-foundation-kb-action-review-sprint-check.mjs` as the focused proof and governed close-card writer.
- Add approval, handoff, package script, closeout registry record, and current plan/state updates.
- Add done-card coverage in `lib/foundation-verify-coverage-card-ids.js` without adding new root-verifier lines; the existing action-route coverage import already covers this umbrella's domain.
- Keep the closeout record in the action-route closeout module because this sprint is the KB/action-review queue and the cleanup registry is already near its preferred size budget.

Not next for V1:

- Do not start live extraction, transcript fetches, screenshots, crawl, summarization, model calls, provider probes, auth-required or paid runs, external writes, Drive permission mutation, Drive permissions work, Agent Feedback auto-send, hidden subagents, delegated workers, Harlan/Fal/voice/Canva/OpenHuman feature work, or `MEETING-VAULT-ACL-001` Phase B.
- Do not auto-delete, hide, reject, snooze, externally apply, or mutate action-route review items.
- Do not redesign the Review Inbox, rerun child implementation cards, or rewrite source-maturity cards.

Proof behavior must call real function paths and live records: live backlog rows, live closeout registry, package script JSON, current plan/state files, and the pure evaluator dogfood. No substring-only proof is accepted. Dogfood rejects weak cases even when the source text says the right phrases.

No-new-responsibility and split plan:

- Main session owns this shared-file closeout. Requested shared files are declared in the changed-file list, and this is main-session approved Foundation process work rather than side work from a hub chat or hidden worker.
- `docs/rebuild/current-plan.md` is above the 1,500-line preferred review threshold, so this card changes one existing sprint paragraph only and adds no new section family or long-form doctrine there.
- New behavior lives in `lib/foundation-kb-action-review-sprint.js`; the process script owns proof/write posture; the closeout registry receives one focused record in the action-route record module; verifier coverage changes only the existing coverage-ID list, not the root verifier.
- `docs/process/approvals/FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.json` is capped under 5 KB as a data record, and `docs/_archive/handoffs/2026-05-18-foundation-kb-action-review-sprint-closeout.md` is capped under 12 KB as the report artifact.
- No existing root file over 3,000 lines receives new responsibility.

## Risks

- Risk: closing the umbrella could hide a child card that is not actually done. Mitigation: focused proof reads live backlog rows and fails if any child lane is not `done`.
- Risk: closing the umbrella could hide missing closeout evidence. Mitigation: focused proof reads the build closeout registry and fails if any child or umbrella closeout key is absent.
- Risk: a broad follow-on could start extraction or side effects during a cleanup closeout. Mitigation: the evaluator scans for hidden worker, extraction, model, and external-write runtime tokens and fails closed.
- Risk: this becomes a process-only string patch. Mitigation: the dogfood proof simulates missing child, stale umbrella, missing closeout, and forbidden side-effect cases.
- Risk: the proof becomes slow enough that future builders skip it. Mitigation: the focused proof is fast and bounded to live backlog/closeout reads plus pure dogfood; it should run in under 2 minutes, with full verification reserved for the final ship gate.
- Repair path: if any check fails, keep the card open, repair the specific missing child/closeout/doc/proof problem, rerun the focused proof, then rerun full `foundation:verify` and ship gate.

## Tests

Static gate:

```bash
node --check lib/foundation-kb-action-review-sprint.js scripts/process-foundation-kb-action-review-sprint-check.mjs
```

Focused gate:

```bash
npm run process:foundation-kb-action-review-sprint-check -- --close-card --json
```

Full gates:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-KB-ACTION-REVIEW-SPRINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.json --closeoutKey=foundation-kb-action-review-sprint-v1 --commitRef=HEAD
```
