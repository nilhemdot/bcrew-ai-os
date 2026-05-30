# FOUNDATION-MERGE-QUEUE-001 Plan

Card: `FOUNDATION-MERGE-QUEUE-001`
Closeout key: `foundation-merge-queue-v1`

## What
Build a V1 Foundation merge queue rule and proof path so completed cards or small card bundles enter an integration queue before they reach `main`.

The rule is process-only in this card. It creates the backlog card, protocol doc, focused proof script, approval, and closeout registry record. It does not merge main by itself and does not launch parallel builders.

## Why
The active Foundation health branch is 108 commits ahead of `origin/main`. The "keep going" builder instruction created useful momentum, but it also exposed a missing rule: keep going must not mean delaying integration forever.

Operator value: Steve can see when a branch is ready to merge, when a branch is too long and should stop stacking work, and what exact proof must exist before main is touched. The useful real workflow this unlocks is visible builder speed with quality: Steve can keep multiple branches moving without losing a clean integration path.

## Acceptance Criteria
- Live backlog truth contains `FOUNDATION-MERGE-QUEUE-001`.
- Protocol doc defines the integration queue, merge lane, pre-merge checks, post-merge checks, failure pause behavior, and release-train risk rule.
- Focused proof calls the actual function path `evaluateFoundationMergeQueueEntry`, then dogfoods fail-closed behavior for dirty worktree, missing closeout, missing focused proof, missing full ship gate, false-done approval-bound work, blocked card holding the sprint hostage, merge conflict risk, hidden delegated worker without approval, and failing main after merge.
- The process route uses real git branch state for origin sync and main-delta checks instead of marker-only proof.
- Current branch is classified as not safe for more card stacking before integration because it is a long branch without explicit release-train approval.
- Closeout registry and package script expose the card proof.
- Plan Critic score must pass at 9.8+.
- `foundation:verify` and `process:foundation-ship` must pass before push.

## Definition Of Done
- Existing code reused: `process:foundation-ship`, `process:ship-check`, `process:fanout-check`, `process:post-ship-fanout`, approval integrity, Plan Critic, live Backlog reads/writes, and closeout lookup.
- Existing docs reused: current Foundation process docs, existing closeout registry pattern, and the branch merge-readiness closeout.
- Existing scripts reused as gates: `backlog:hygiene`, `foundation:verify`, and build-lane telemetry.
- `lib/foundation-merge-queue.js` owns the pure evaluator and dogfood behavior proof.
- `scripts/process-foundation-merge-queue-check.mjs` is read-only by default and requires `--apply` or `--close-card` for live Backlog/Plan Critic writes.
- `docs/process/foundation-merge-queue-protocol.md` is the operator protocol.
- `docs/_archive/handoffs/2026-05-19-foundation-merge-queue-closeout.md` records the current branch application and merge boundary.

## Details
Pre-merge requirements:

- branch/worktree clean
- card or bundle closeout exists
- focused proof passed
- full ship/process gate passed
- no approval-required or live external action falsely marked done
- no blocked/returned card holding the active sprint hostage
- merge conflict or fast-forward check passes

Merge lane behavior:

- completed cards enter an integration queue
- the merge lane serializes pushes to main
- main is pushed only after the queued branch passes its checks
- main is verified after merge
- if main fails after merge, the queue pauses and routes repair before another merge

Gate decision tree:

- static gate: `node --check` for the merge queue module and proof script
- focused gate: `process:foundation-merge-queue-check` for actual function behavior, live Backlog/Plan Critic rows, closeout lookup, package script, and current branch route
- full gate: `foundation:verify` plus `process:foundation-ship` because the card changes package scripts, live backlog/process truth, closeout registry, and main integration policy
- blast radius: process and merge policy only; no live merge or external-write side effect

Long branch rule:

- a branch more than 20 commits ahead of main is integration risk unless explicitly approved as a release train
- a branch over that threshold must stop stacking normal card work and enter the merge/readiness path
- the current branch is in that risk class at 108 commits ahead

Not next:

- Do not launch live parallel builders during this card.
- Do not merge main from this card alone.
- Do not run live extraction, paid/private access, provider rotation, Drive mutation, Gmail/ClickUp sends, Slack sends, Agent Feedback sends, or external writes.
- Do not use hidden delegated workers unless Steve explicitly approves the worker, repo/worktree/branch, ownership, and integration path.

## Risks
Risk: the rule becomes another doc reminder. Repair path: focused proof evaluates actual merge-lane state and dogfood failure modes, and package/closeout registry make it part of ship coverage.

Risk: this blocks useful long-lived release trains. Repair path: release trains are allowed only when explicitly approved and recorded, then still must enter the merge lane before main is touched.

Risk: the proof accidentally performs a merge or push. Repair path: this card only evaluates state and writes local repo/backlog/process truth; actual merge remains a later explicit merge-readiness decision.

## Tests
Run:

```sh
node --check lib/foundation-merge-queue.js scripts/process-foundation-merge-queue-check.mjs
npm run process:foundation-merge-queue-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-MERGE-QUEUE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MERGE-QUEUE-001.json --closeoutKey=foundation-merge-queue-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-MERGE-QUEUE-001 --closeoutKey=foundation-merge-queue-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-MERGE-QUEUE-001 --closeoutKey=foundation-merge-queue-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=FOUNDATION-MERGE-QUEUE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MERGE-QUEUE-001.json --closeoutKey=foundation-merge-queue-v1 --commitRef=HEAD
```
