# AUTO-DEPLOY-ROLLBACK-001 Plan

Status: scoped for v1 approval
Card: AUTO-DEPLOY-ROLLBACK-001
Closeout key: auto-deploy-rollback-v1

## What

Build a guarded Mac mini deploy runner that can fast-forward the local `main` checkout to `origin/main`, restart the supervised dashboard and Foundation worker, health-check the served commit, and roll back to the previous SHA if the new commit fails the health check.

V1 is a real deploy/rollback command with a dry-run default and explicit `--apply=true` mutation mode. It is not a cloud deployment system, not a GitHub Actions migration, and not a broad process supervisor replacement.

## Why

The audits called out the old-system auto-deploy rollback as one of the few missing pieces that directly protects speed. The new ship wrapper already restarts the dashboard and worker during local builds, but the Mac mini still needs a governed path for: pull new git truth, restart services, prove health, and recover if a pulled commit is bad.

Operator value: Steve should not have to notice a stale or broken dashboard and manually remember the recovery sequence. The system should have one command that either deploys cleanly or puts the Mac mini back on the last known-good SHA.

## Acceptance Criteria

- A reusable library models the deploy plan, health proof, and rollback decision without shelling out.
- A deploy runner script defaults to dry-run and requires explicit `--apply=true` before it runs mutating git, install, restart, or rollback steps.
- The runner refuses live deploy when the worktree is dirty, when the target ref is missing, or when the fast-forward plan cannot be proven.
- The live deploy path is ordered: fetch target, fast-forward to target, install dependencies only when package files changed, restart dashboard and worker, wait for health, and record a local proof.
- The failed health rollback path is ordered: reset back to previous SHA, reinstall dependencies if package files changed across the rollback boundary, restart dashboard and worker, wait for health against the previous SHA, and record rollback proof.
- The focused proof rejects substring-only proof by calling the real deploy-plan, health-status, and rollback-decision function paths, including failed-health and dirty-worktree variants.
- Current Sprint moves `AUTO-DEPLOY-ROLLBACK-001` to Done This Sprint without opening Marketing, Telegram, Directors, or broad old-system parity work.

## Definition Of Done

- `lib/auto-deploy-rollback.js` owns the pure deploy plan, health status, rollback decision, and synthetic proof.
- `scripts/auto-deploy-rollback.mjs` implements the guarded dry-run/apply deploy runner.
- `scripts/process-auto-deploy-rollback-check.mjs` validates approval integrity, Plan Critic score, synthetic behavior proof, dry-run behavior, launch agent visibility, backlog/current sprint state, package scripts, current plan/state, Recent Work, and canonical verifier coverage.
- `npm run process:auto-deploy-rollback-check -- --json=true` passes.
- `npm run backlog:hygiene -- --json` stays healthy.
- `npm run process:foundation-ship -- --card=AUTO-DEPLOY-ROLLBACK-001 --planApprovalRef=docs/process/approvals/AUTO-DEPLOY-ROLLBACK-001.json --closeoutKey=auto-deploy-rollback-v1 --commitRef=HEAD` passes.

## Details

Existing work reused:

- Existing `process:foundation-ship` runtime restart path for `ai.bcrew.dashboard` and `ai.bcrew.foundation-worker`.
- Existing served-code/worker-code trust in `/api/foundation-hub` and `foundation:verify`.
- Existing LaunchAgent labels and restart commands already used by ship gates.
- Existing Plan Critic, approval integrity, backlog hygiene, Recent Work, Current Sprint, and canonical Foundation verifier.
- Existing runtime process-control status that already exposes restart/manual proof boundaries.

Deploy runner behavior:

- Default mode is dry-run. It prints the planned current SHA, target SHA, changed files, package-change decision, restart labels, health path, and rollback steps.
- Apply mode requires `--apply=true`. It refuses if the local worktree has uncommitted changes.
- Target defaults to `origin/main` after `git fetch origin main`; callers may pass `--targetRef`.
- Deploy uses `git merge --ff-only <targetRef>` instead of rewriting history.
- Rollback uses the captured previous SHA only after this runner has attempted the deploy and health failed.
- Health checks `/api/foundation-hub` and requires the dashboard and worker startup commits to match the expected SHA.
- Proof is recorded in `.git/auto-deploy-rollback-proof.json` so it stays local and does not pollute repo truth.

Behavior proof:

- The focused proof calls the real function path for deploy plan, health status, and rollback decision.
- The synthetic proof includes a clean fast-forward success case, a failed-health rollback case, a dirty-worktree refusal case, and a no-target refusal case.
- Substring-only proof is rejected; source markers support the behavior proof but cannot replace it.

Gate decision tree: full based on blast radius. This card touches runtime/deploy behavior, package scripts, Current Sprint, backlog seed, Recent Work, and canonical verifier coverage. The focused proof should stay fast, but the final closeout must run the full ship gate.

Rollback or repair path: if the deploy runner or proof fails, keep `AUTO-DEPLOY-ROLLBACK-001` out of done and leave the current `process:foundation-ship` restart behavior as the trusted deployment path. If a live `--apply=true` deploy fails after changing the checkout, the runner must attempt rollback to the captured previous SHA and restart/health-check the previous SHA before exiting.

## Risks

- A deploy tool can destroy local work if it ignores dirty worktrees. V1 must fail closed before any mutating git operation when local changes exist.
- A bad health check can cause false rollback. V1 keeps the health rule narrow: dashboard and worker served commits must match the expected SHA and `/api/foundation-hub` must return healthy enough to expose runtime metadata.
- A periodic auto-pull loop can fight active builder work. V1 builds the safe runner and proof; any always-on LaunchAgent schedule must be separately installed only after the dry-run path is trusted.
- Rollback must not hide failing commits. Local proof records the target SHA, previous SHA, health failure reason, rollback action, and rollback health result.

## Tests

- Behavior proof calls deploy-plan, health-status, and rollback-decision functions and rejects dirty-worktree/no-target/failing-health variants.
- Dry-run command proves the runner can inspect repo state and produce a deploy plan without mutating git, installing dependencies, restarting services, or rolling back.
- Focused proof checks package scripts, launch agent labels, Current Sprint state, backlog lane, current plan/state closeout, Recent Work closeout, and canonical verifier coverage.
- Full ship gate remains required because deploy/runtime code, package scripts, current sprint, backlog, build log, docs, and verifier coverage change.
- Speed bound: `npm run process:auto-deploy-rollback-check -- --json=true` should stay under one minute; live `--apply=true` deploy can be slower because it may fetch, install, restart, and wait for health.

## Not Next

- Do not install a permanent periodic auto-pull LaunchAgent in this card.
- Do not migrate deployment to cloud, GitHub Actions, VPS, Docker, or a new supervisor.
- Do not change Google Drive permissions or restart Meeting Vault historical cleanup.
- Do not build Telegram bots, Directors, Marketing Pipeline, Brand Guardian, or the reply/watching loop here.
- Do not bypass `process:foundation-ship`; the deploy runner complements it for Mac mini pull/recovery, while local builds still close through the ship gate.
