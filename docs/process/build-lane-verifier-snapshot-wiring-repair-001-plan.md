# BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 Plan

Status: approved for build
Card: `BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001`
Sprint: `build-lane-verifier-snapshot-wiring-repair-2026-05-18`
Closeout key: `build-lane-verifier-snapshot-wiring-repair-v1`

## What

Repair full `foundation:verify` after it went red across unrelated source crawl, intelligence, extraction, Agent Feedback, control-loop, surface/trust, and runtime-reliability lanes.

The primary fix is verifier snapshot wiring: after `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`, verifier modules still treated `lib/foundation-db.js` as the whole DB source. The schema/seed/store tokens now live in `lib/foundation-db-schema-seed-store.js` and focused store modules, so the verifier must build an explicit DB source bundle from current repo truth.

## Why

The DB split should not make 25+ unrelated checks red. The red set exposed stale verifier baseline assumptions, plus a small number of real local runtime-health and approval-bound live-state rows.

Operator value for Steve and the team: this restores a real workflow where builders can run full `foundation:verify`, trust the result, and move faster with better quality. Green means the system is actually healthy, not that a builder bypassed the gate. Red means broken, approval-blocked, or stale wiring with a clear classification and a useful next action.

## Acceptance Criteria

- Exact full verifier failures are classified as stale snapshot/baseline/wiring, real runtime/system-health, or approval-bound side-effect.
- `scripts/foundation-verify.mjs` builds an explicit verifier source bundle that includes split DB root, schema/seed, and focused store modules.
- Core governance, intelligence spine, extraction runtime, Agent Feedback, control loop, operator surface, and runtime reliability verifier inputs use the correct source bundle where they assert DB/schema/store ownership.
- Approval-bound states remain explicit; the card does not rerun live external-write jobs, live extraction, Gmail sends, ClickUp writes, Drive permission mutation, or Agent Feedback reminders.
- Real local runtime-health drift is repaired if safe, such as stale served worker code, without launching live extraction or external writes.
- Focused proof dogfoods the stale root-only source snapshot and proves the aggregate source bundle contains the moved schema/store tokens.
- Full `foundation:verify -- --json-summary` passes before closeout.
- Full `process:foundation-ship` passes before push.

## Definition Of Done

- Live backlog card `BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001` is marked done and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:build-lane-verifier-snapshot-wiring-repair-check -- --json`.
- `node --check`, `backlog:hygiene`, full `foundation:verify`, and full `process:foundation-ship` pass.
- Closeout and Recent Builds identify `build-lane-verifier-snapshot-wiring-repair-v1`.

Gate decision tree: static checks cover changed JS syntax; focused proof covers stale snapshot wiring and failure classification; full verifier and ship gate are mandatory because this card changes the canonical Foundation verifier baseline.

## Details

Existing code to reuse: `scripts/foundation-verify.mjs`, the verifier split modules, `lib/foundation-db-schema-seed-store.js`, focused Foundation store modules, build-lane card scaffold helpers, Plan Critic, approval integrity, Current Sprint overlay, and closeout registry.

Existing docs to reuse: the May 18 audit triage handoff, `docs/process/foundation-db-schema-seed-split-001-plan.md`, existing verifier split plans, and `docs/process/foundation-ship-gate.md`.

Existing scripts to reuse: `npm run foundation:verify -- --json-summary`, `npm run process:foundation-ship`, `npm run backlog:hygiene -- --json`, approval integrity, and the build-lane focused proof script pattern.

Live backlog and Current Sprint truth to reuse: `BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001`, the current active Foundation sprint overlay, Plan Critic rows, build-log closeouts, and DB-backed backlog item state.

Implementation shape:

- Add `lib/foundation-verifier-snapshot-wiring-repair.js` for constants, source-bundle construction, red-row classification, and dogfood proof.
- Update `scripts/foundation-verify.mjs` to construct `foundationDbVerifierSource`, `foundationDbWithBacklogSeedSource`, `sourceCrawlStoreOwnershipSource`, `driveMeetingVaultStoreOwnershipSource`, and `agentFeedbackStoreOwnershipSource` from current split modules.
- Pass the aggregate verifier DB source only to checks that assert DB/schema/store ownership. Preserve the root DB source where structural split checks need the actual root file.
- Add `scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs` as the fast focused proof and live card scaffold.
- Register package script, verifier coverage, closeout registry, plan, approval, and closeout handoff.

Behavior proof must use actual function/API/process paths, not markers. The focused proof calls the real `buildFoundationVerifierSourceBundle`, `classifyFoundationVerifyFailures`, approval validator, Plan Critic evaluator, and Current Sprint/backlog readers. It must reject substring-only proof: no substring-only source marker is accepted unless the actual source-bundle behavior and failure-classification dogfood also pass.

Initial classification from the reproduced red set:

| Classification | Examples | Repair posture |
|---|---|---|
| stale snapshot/baseline/wiring | source crawl ledger, intelligence schema rows, extraction target support, Agent Feedback table proof, SYSTEM-010 DB/store proof | Fix verifier input bundle or stale assumption directly. |
| real runtime/system-health | stale Foundation worker served commit, runtime supervisor service status risk | Repair safe local runtime drift, then rerun verifier. |
| approval-bound side-effect | Action Router pending routes, Strategy Hub hidden operational routes, Agent Feedback send/reminder state | Keep state explicit and fail closed without rerunning live external writes. |

## Risks

- Risk: over-aggregating source text masks a root-file split regression.
  - Repair path: keep structural split checks on the actual root file and only use the aggregate bundle where verifier assertions mean DB/schema/store ownership.
- Risk: approval-bound live state becomes a silent pass.
  - Repair path: the classifier must distinguish approval-bound from broken and preserve explicit pending/blocked details.
- Risk: runtime restart triggers scheduled work.
  - Repair path: only repair safe local stale served-code state; do not manually run live extraction or external-write jobs.
- Risk: this becomes a broad source-lane repair.
  - Repair path: do not auto-fix source crawl, extraction, Agent Feedback, or intelligence data unless the verifier failure is proven safe and in scope.

## Tests

```bash
node --check lib/foundation-verifier-snapshot-wiring-repair.js scripts/foundation-verify.mjs scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs
npm run process:build-lane-verifier-snapshot-wiring-repair-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001.json --closeoutKey=build-lane-verifier-snapshot-wiring-repair-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe root-only verifier snapshot. The old root-only snapshot must miss moved schema/store tokens; the repaired aggregate bundle must include them; red-row classification must have no unknown rows.

## Not Next

- Do not use hidden subagents.
- Do not launch parallel builders.
- Do not weaken, skip, bypass, or demote real verifier failures.
- Do not rerun live external-write jobs.
- Do not run live extraction.
- Do not mutate Google Drive permissions.
- Do not send Agent Feedback auto-send or reminder emails.
- Do not work Meeting Vault Phase B.
- Do not build Harlan, Fal, voice, Canva, OpenHuman, or UI redesign work.
