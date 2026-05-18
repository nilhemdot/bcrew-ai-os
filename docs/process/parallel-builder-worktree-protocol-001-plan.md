# PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 Plan

Card: `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`

Closeout key: `parallel-builder-worktree-protocol-v1`

## What

Define and prove the Foundation-owned protocol for safe overnight and parallel builder work. Each builder assignment must declare a dedicated branch, dedicated worktree, base commit, card ID, Current Sprint stage, disjoint write scopes, shared-file coordination, focused proof command, and merge handoff.

The protocol covers:

- one card per branch/worktree
- no shared branch editing from workers
- disjoint write scopes
- explicit shared-file owner and report-before-edit rule
- Current Sprint coordination before build
- merge handoff with changed files and proof
- local mockup/Harlan/Fal/voice/Canva/OpenHuman no-go boundaries
- no external side effects

## Why

Steve wants the system to build all night without needing approval for safe internal work. The useful operator behavior is speed with quality: builders can work in parallel without corrupting repo truth, overwriting each other, touching Steve local assets, or creating mystery conflicts that waste the next morning.

This unlocks real workflow quality for Steve and the team: the next KB/action review sprint can run with clear ownership rules instead of relying on chat memory.

## Acceptance Criteria

- Live backlog card exists and is enriched as P0 Foundation process work.
- Current Sprint moves cleanly from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/parallel-builder-worktree-protocol.js` defines the protocol contract and validator.
- `lib/foundation-verify-process-hardening-runner.js` keeps the root verifier under 5,000 lines by owning process-hardening orchestration wiring.
- If the setup cards push the default Hub payload red, `lib/foundation-hub-backlog-contract.js` may be tightened only as loading architecture: done cards stay as lightweight pointers in the default backlog summary while full/detail routes preserve history.
- Dedicated branches/worktrees with disjoint scopes pass.
- Shared branch edits fail.
- Shared worktree assignments fail.
- Overlapping write scopes fail.
- Missing Current Sprint coordination fails.
- Shared/root file edits without report-before-edit ownership fail.
- Steve local mockup/Harlan/Fal/voice/Canva/OpenHuman scopes fail.
- Live extraction/provider probe/external write attempts fail.
- Focused proof is registered in `package.json`.
- Foundation verifier coverage proves the behavior through function dogfood.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001` is a live done card under `parallel-builder-worktree-protocol-v1`, the protocol dogfood rejects unsafe parallel-builder fixtures, Current Sprint is closed with complete scaffold metadata, the closeout is registered, the full Foundation ship gate passes, and the commit is pushed.

Done does not mean a new worker runtime, new orchestration service, or feature work exists. The next sprint is `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`.

## Details

Existing work to reuse:

- Existing code: `lib/build-lane-reliability.js`, `lib/foundation-current-sprint.js`, `lib/process-plan-critic.js`, `lib/process-write-guard.js`, `lib/auto-deploy-rollback.js`, and `lib/foundation-process-hardening-verifier.js`.
- Existing docs: `docs/handoffs/2026-05-17-main-chat-hard-checkpoint.md`, `docs/handoffs/2026-05-17-build-lane-reliability-sprint-closeout.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-build-lane-reliability-sprint-check.mjs`, `scripts/process-auto-deploy-rollback-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Existing policy: live backlog and Current Sprint are task truth; no local-only mockup assets or external side effects without approval.

Behavior proof:

- The focused proof calls `buildParallelBuilderWorktreeProtocol()`, `evaluateParallelBuilderWorktreeProtocol()`, and `buildParallelBuilderWorktreeProtocolDogfoodProof()`.
- Dogfood uses synthetic assignments for shared worktree collision, shared branch edits, overlapping write scopes, missing Current Sprint stage, uncoordinated shared-file edits, forbidden local/mockup scope, and external side effects.
- Source checks only prove registration. They are not accepted without validator/dogfood behavior.

Gate decision tree:

- Static syntax checks run first.
- Focused proof drives iteration.
- Full `foundation:verify` runs once focused proof is green.
- Full `process:foundation-ship` runs before push.
- If the protocol exposes a real need for live worker creation, route a follow-up card instead of expanding this sprint.

Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-process-hardening-verifier.js`, `lib/foundation-verify-process-hardening-runner.js`, `lib/foundation-hub-backlog-contract.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.

File-size and artifact budget:

- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.
- Plan artifact budget: under 12 KB.
- `scripts/foundation-verify.mjs` was briefly over the 5,000-line hard guardrail during this setup. This sprint includes the smallest clean domain split: process-hardening orchestration wiring moves to `lib/foundation-verify-process-hardening-runner.js`, and focused proof fails if the root verifier remains at or above 5,000 lines.

Split plan: all new verifier behavior lives in `lib/parallel-builder-worktree-protocol.js`, `lib/foundation-verify-process-hardening-runner.js`, and `scripts/process-parallel-builder-worktree-protocol-check.mjs`; `scripts/foundation-verify.mjs` imports/passes source only and receives no new responsibility.

Read/write posture:

- Live backlog, Plan Critic, and Current Sprint writes are allowed only when the focused proof is invoked with explicit `--apply` or `--close-card`.
- Verifier/check paths must not start workers, create worktrees, mutate branches, run extraction, call providers, write external systems, or auto-send Agent Feedback.
- For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

## Risks

- Scope drift into building a full multi-agent worker runtime. Mitigation: V1 is protocol/proof only.
- Scope drift into feature work. Mitigation: Harlan/Fal/voice/Canva/OpenHuman/local mockup scopes fail.
- False confidence from doc-only rules. Mitigation: dogfood calls validator behavior and rejects bad synthetic assignments.
- Slowing the overnight run. Mitigation: keep the gate fast and bounded; use focused proof while iterating.

Not next:

- No live extraction.
- No auth-required or paid run.
- No provider/model probe.
- No connector/OAuth repair.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad UI redesign.
- No Drive permissions mutation.
- No live Agent Feedback auto-send.
- Do not touch Steve local mockup assets.

## Tests

Use the focused loop first:

```bash
node --check lib/parallel-builder-worktree-protocol.js lib/foundation-verify-process-hardening-runner.js scripts/process-parallel-builder-worktree-protocol-check.mjs scripts/foundation-verify.mjs
npm run process:parallel-builder-worktree-protocol-check -- --apply --stage=scoping --json
npm run process:parallel-builder-worktree-protocol-check -- --apply --stage=sprint_ready --json
npm run process:parallel-builder-worktree-protocol-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:parallel-builder-worktree-protocol-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json --closeoutKey=parallel-builder-worktree-protocol-v1 --commitRef=HEAD
```
