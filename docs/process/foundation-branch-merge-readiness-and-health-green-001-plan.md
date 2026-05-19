# FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 Plan

Card: `FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001`
Closeout key: `foundation-branch-merge-readiness-health-green-v1`

## What
Build a V1 branch merge-readiness and health-green pass for `foundation/system-health-red-to-green-001`.

This card routes the approval-bound security provider proof honestly, repairs safe health false-red rows, creates the merge-readiness closeout, and applies `FOUNDATION-MERGE-QUEUE-001` before any decision to merge main.

## Why
Steve needs tomorrow morning clean: branch truth verified, system health routed, and no 100-card release train outside `main` unless explicitly approved.

The immediate failure mode is not only a red verifier. The returned `SECURITY-PROVIDER-ROTATION-PROOF-001` card and stale live job rows made the build lane look stuck even after safe no-secret preflight shipped. The branch also needs a merge path instead of continuing to accumulate finished cards.

Operator value: Steve gets a concrete merge decision: safe to merge with proof, or not safe with the exact blocker and repair card. The real workflow this unlocks is morning builder speed with quality: the branch can either integrate cleanly or produce a short blocker route instead of forcing Steve to diagnose stale health rows.

## Acceptance Criteria
- `SECURITY-PROVIDER-ROTATION-PROOF-001` remains scoped/provider-owned and is not the active sprint blocker.
- Approval-bound live extraction/job failures are shown as blocked-by-approval or watch with owner/next action, not falsely marked done.
- Safe verifier/system-health wiring issues are fixed directly.
- `FOUNDATION-MERGE-QUEUE-001` exists, is built, and prevents continued card stacking before integration.
- Focused proof calls actual function paths for Current Sprint status, job-run metadata, closeout lookup, System Health routing, and merge queue dogfood behavior.
- The branch route checks real git origin sync and main-delta state instead of marker-only proof.
- Root `scripts/foundation-verify.mjs` is below the 5,000 line hard guard.
- Hot `docs/handoffs/` bloat risk is reduced by archiving an unreferenced cold handoff.
- Focused proof, backlog hygiene, build-lane telemetry, `foundation:verify`, and full ship gate pass before push.
- Closeout records what shipped, what remains blocked, system-health status, verification proof, and exact merge decision.

## Definition Of Done
- Existing code reused: Current Sprint overlay, live Backlog writes, Plan Critic, approval integrity, System Health rollup, job-run metadata, build-lane telemetry, closeout lookup, and Foundation ship gates.
- Existing docs reused: security provider no-secret preflight plan/closeout, merge queue protocol, current Foundation closeout registry, and prior handoff archive pattern.
- Existing scripts reused as gates: `process:foundation-merge-queue-check`, `process:verification-runs-check`, `process:build-lane-failure-telemetry-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- `lib/foundation-branch-merge-readiness.js` owns the focused dogfood invariant.
- `scripts/process-foundation-branch-merge-readiness-check.mjs` is read-only by default and requires `--apply` or `--close-card` for live Backlog/Current Sprint/job metadata writes.
- No provider-side credential rotation, live extraction, paid/private access, Drive mutation, Gmail/ClickUp sends, Slack sends, Agent Feedback sends, or other external write runs in this card.

## Details
Security routing:

- Keep `SECURITY-PROVIDER-ROTATION-PROOF-001` scoped, not done.
- Preserve the no-secret preflight closeout as useful proof.
- Record that real provider-side proof remains owner/approval-bound.

Health routing:

- Fix verifier wiring that was stale after closeout source splits.
- Route stale live extraction job failure as blocked by approval instead of rerunning it.
- Use read-only scheduled job runs only when safe.

Merge readiness:

- Apply the merge queue rule before adding more normal card work.
- Treat the 108-commit ahead branch as integration risk.
- Decide whether branch can fast-forward merge to main only after gates are green and the worktree is clean.

Gate decision tree:

- static gate: `node --check` for the branch readiness module, merge queue module, System Health, verifier, and verification-runs proof script
- focused gate: `process:foundation-branch-merge-readiness-check` for live Backlog/Current Sprint/job metadata, real closeout lookup, package scripts, and dogfood behavior
- full gate: `foundation:verify` plus `process:foundation-ship` because the card changes live sprint truth, package scripts, closeout registry, system health, and branch merge policy
- blast radius: Foundation process and verifier wiring; no provider call, live extraction, or external-write side effect

Not next:

- Do not rotate, revoke, retire, validate, probe, hash, fingerprint, or quote provider credentials.
- Do not run live extraction, paid/private source access, Drive mutation, Gmail/ClickUp sends, Slack sends, Agent Feedback sends, provider calls, or external writes.
- Do not launch hidden delegated workers or parallel builders.
- Do not merge main until branch gates pass and the merge decision is explicit.

## Risks
Risk: marking approval-bound work done to make the dashboard green. Repair path: the focused proof requires provider proof to remain scoped and meeting extraction reruns to remain blocked by approval.

Risk: another verifier baseline patch hides runtime drift. Repair path: use function/process path checks: live Current Sprint status, job-run metadata, closeout lookup, package scripts, and full Foundation verifier.

Risk: branch stays a release train. Repair path: `FOUNDATION-MERGE-QUEUE-001` classifies long branches as integration risk and blocks more stacking unless a release train is explicitly approved.

## Tests
Run:

```sh
node --check lib/foundation-branch-merge-readiness.js scripts/process-foundation-branch-merge-readiness-check.mjs lib/foundation-merge-queue.js scripts/process-foundation-merge-queue-check.mjs lib/foundation-system-health.js scripts/foundation-verify.mjs scripts/process-verification-runs-check.mjs
npm run process:foundation-merge-queue-check -- --apply --close-card --json
npm run process:foundation-branch-merge-readiness-check -- --apply --close-card --json
npm run process:verification-runs-check -- --json=true
npm run process:build-lane-failure-telemetry-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001.json --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --closeoutKey=foundation-branch-merge-readiness-health-green-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BRANCH-MERGE-READINESS-AND-HEALTH-GREEN-001.json --closeoutKey=foundation-branch-merge-readiness-health-green-v1 --commitRef=HEAD
```
