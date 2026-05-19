# FOUNDATION-MAIN-INTEGRATION-LOCK-001 Plan

Card: `FOUNDATION-MAIN-INTEGRATION-LOCK-001`
Closeout key: `foundation-main-integration-lock-v1`

## What

Build the main integration lock for the green/main/audit/source activation sprint.

The lock proves that `main` is the integration truth before builders continue: local `main`, `origin/main`, served dashboard code, served Foundation worker code, current sprint closeout truth, and side-branch routing must agree.

## Why

The old builder allowed finished work to stack into a 108-card/108-commit branch before it reached `main`. That is an operating-system failure, not just a messy merge.

The useful workflow this unlocks is fast all-day building where every finished card or tight bundle gets into `main`, is served by the dashboard/worker, and cannot hide on a long-lived branch without a release-train or side-commit route.

Operator value: Steve gets a real workflow for speed with quality. A builder can keep moving only after the system proves the current shipping commit is on `main`, visible in the served dashboard and worker, and not hiding completed Foundation work on a side branch.

## Acceptance Criteria

- Focused proof runs from `main`.
- Local `main` contains `origin/main` before push; after push, `main` and `origin/main` must match.
- Dashboard served commit equals repo `HEAD`.
- Foundation worker startup commit equals repo `HEAD`.
- Worktree is clean when the proof claims integration truth.
- Current green/main/audit/source sprint handoff is present.
- Non-main branches are classified as integrated, preserved-side-commit, wip-non-foundation, or release-train.
- A completed Foundation branch outside `main` without a release-train record fails.
- Dogfood recreates the 108-card pileup and proves it is risk unless merged or release-trained.
- Live Current Sprint advances from this card to `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` only after focused proof passes.

## Definition Of Done

- Existing code reused: served-code trust, worker-code trust, closeout registry, Current Sprint overlay, Plan Critic, approval integrity, and merge queue proof.
- `lib/foundation-main-integration-lock.js` owns the pure lock evaluator and dogfood proof.
- `scripts/process-foundation-main-integration-lock-check.mjs` is read-only by default and requires `--apply` or `--close-card` for live Backlog/Plan Critic/Current Sprint writes.
- `docs/process/foundation-main-integration-side-branches.json` records side-branch routing.
- `docs/handoffs/2026-05-19-foundation-main-integration-lock-closeout.md` records current state and next card.
- Closeout registry includes `foundation-main-integration-lock-v1`.
- Focused proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- Commit is pushed to `main`.

## Details

The lock checks:

- branch is `main`
- local `main` contains `origin/main` before push and matches `origin/main` after push
- worktree is clean
- dashboard served commit equals `HEAD`
- worker served commit equals `HEAD`
- current sprint closeout truth names `FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19`
- every non-main branch has an integration route
- any completed Foundation work outside `main` is blocked unless it is a release train or explicitly preserved side commit

Behavior proof:

- The focused proof calls the actual function path `evaluateFoundationMainIntegrationLock`, not substring-only proof.
- The script reads the real git branch graph and the real `/api/foundation-hub` served-code route.
- The proof rejects weak shapes through dogfood: stale dashboard commit, stale worker commit, dirty worktree, missing closeout truth, unrouted side branch, and a synthetic 108-card Foundation pileup.
- No substring-only marker is accepted as proof that `main` is integration truth.

Allowed side-branch routes:

- `integrated`: branch tip is already an ancestor of `main`
- `preserved-side-commit`: unrelated side work preserved outside Foundation main and not silently mixed
- `wip-non-foundation`: unfinished non-Foundation work that is not claiming completion
- `release-train`: completed work intentionally held outside `main` with owner, reason, merge window, and repair path

Gate decision tree:

- static gate: `node --check` for the module and proof script
- focused gate: main integration lock check with `--close-card`
- live truth gate: backlog hygiene and Current Sprint readback
- full gate: `foundation:verify`
- ship gate: `process:foundation-ship`

## Not Next

- Do not build extractor/source feature work before this lock is green.
- Do not launch parallel builders from this card.
- Do not use hidden workers.
- Do not run live extraction, provider probes, credential repair, Drive mutation, sends, or external writes.
- Do not silently merge preserved side commits into Foundation main.

## Risks

Risk: the lock becomes another report and not a blocking proof. Repair path: the focused proof calls the evaluator, reads real git/served-code state, mutates live sprint only under explicit flags, and is included in ship proof.

Risk: side branches are over-blocked. Repair path: non-main branches can be explicitly routed as preserved side commits, WIP, or release trains, but completed Foundation work cannot be invisible.

Risk: stale served code creates false downstream failures. Repair path: stale dashboard/worker commit is a direct lock failure with the existing restart commands already exposed by runtime supervisor.

## Tests

Run:

```sh
node --check lib/foundation-main-integration-lock.js scripts/process-foundation-main-integration-lock-check.mjs
npm run process:foundation-main-integration-lock-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MAIN-INTEGRATION-LOCK-001.json --closeoutKey=foundation-main-integration-lock-v1 --commitRef=HEAD
```
