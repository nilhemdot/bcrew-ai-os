# RUNTIME-FIRST-JOBS-001 Plan

## What

Ship a narrow Foundation runtime activation repair for `RUNTIME-FIRST-JOBS-001`. The previous worker reliability card exposed that the first scheduled job set is visible, but two core current-sync jobs fail before they can even dry-run because the Foundation DB source-crawl store split dropped the public export seam used by `scripts/run-extraction-target.mjs`.

This card repairs that seam, proves the first safe scheduled extraction targets can at least load and dry-run through the governed target runner, and adds verifier coverage so future store splits cannot silently break the worker's first-job lane.

This is not a new scheduler, not new extraction scope, and not a paid-source/auth build.

## Why

The worker is now supervised and visible. The next trust test is whether the first scheduled Foundation jobs are actually runnable. Right now `gmail-sync-current` and `missive-sync-current` fail with:

`SyntaxError: The requested module '../lib/foundation-db.js' does not provide an export named 'finishSourceCrawlTargetRun'`

That means the system is not failing because Gmail or Missive are bad. It is failing because our own split work broke the public DB delegate contract used by the extraction target runner.

Foundation cannot be considered alive if the worker can schedule jobs that fail at import time. This card makes that class of break impossible to miss.

## Acceptance Criteria

- `lib/foundation-source-crawl-store.js` returns the existing `leaseSourceCrawlTarget` and `finishSourceCrawlTargetRun` functions from the store factory.
- `lib/foundation-db.js` re-exports stable delegates for `leaseSourceCrawlTarget` and `finishSourceCrawlTargetRun`.
- `scripts/run-extraction-target.mjs` treats `--dry-run` and `--dryRun` as the same flag before any lease or child command can run.
- `npm run extraction:target -- --target=gmail-current-day --dry-run` succeeds without leasing, running, writing, or calling Gmail.
- `npm run extraction:target -- --target=missive-current-day --dry-run` succeeds without leasing, running, writing, or calling Missive.
- Focused dogfood recreates the old missing-export failure and proves the repaired delegate surface catches it.
- Foundation job definitions still show the first scheduled current-sync lanes as governed `extraction:target` jobs with explicit mutation posture, schedule guard, max runtime, and source IDs.
- The focused proof is read-only: it may run dry-run target commands but must not run live extraction, create atoms, mutate source systems, call paid-source auth, or write backlog/current-sprint state.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/runtime-first-jobs.js` owns constants, first-job export seam evaluation, and synthetic dogfood proof.
- `scripts/process-runtime-first-jobs-check.mjs` proves source-crawl delegate exports, extraction target dry-runs, first-job definitions, Plan Critic, Current Sprint, package script, and route budgets.
- `lib/foundation-runtime-reliability-verifier.js` covers `RUNTIME-FIRST-JOBS-001` through the focused module instead of adding inline verifier logic to the root verifier.
- `scripts/foundation-verify.mjs` only passes source text into the existing runtime reliability verifier.
- Backlog, Current Sprint, current plan/state docs, closeout, Recent Builds, and ship proof agree.

## Details

Existing code to reuse:

- Existing store implementation: `lib/foundation-source-crawl-store.js` already owns `leaseSourceCrawlTarget` and `finishSourceCrawlTargetRun`.
- Existing public DB wrapper: `lib/foundation-db.js` already delegates source-crawl reads and should stay a thin wrapper with no new source-crawl responsibility.
- Existing runner: `scripts/run-extraction-target.mjs` already supports `--dry-run` before leasing the source-crawl target.
- Existing jobs: `lib/foundation-jobs.js` already registers `gmail-sync-current` and `missive-sync-current` as governed `extraction:target` jobs.
- Existing docs and truth: live backlog, Current Sprint, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, Recent Builds closeouts, Plan Critic rows, and Foundation ship gates remain the task truth.
- Existing scripts: reuse `npm run extraction:target`, `npm run foundation:verify`, `npm run backlog:hygiene`, and `npm run process:foundation-ship`.

Operator value:

- Steve gets a clear answer to "are the first scheduled jobs actually alive?" without waiting for a live Gmail or Missive connector run.
- The team sees whether the worker can load current-sync jobs before a business workflow depends on them.
- This unlocks speed and quality by separating our own import/export break from real connector/auth/source failures.

Existing work to preserve:

- `scripts/run-extraction-target.mjs` already has the dry-run branch before leasing a target, but its parser must normalize `--dry-run` to `dryRun`.
- `lib/foundation-source-crawl-store.js` already implements `leaseSourceCrawlTarget` and `finishSourceCrawlTargetRun`; they were just not returned/exported after the store split.
- `lib/foundation-jobs.js` already registers `gmail-sync-current` and `missive-sync-current` as scheduled, governed current-sync jobs through `extraction:target`.
- `RUNTIME-WORKER-001` already exposes due/failed/blocked/stale worker reliability state.

Implementation shape:

- Add the missing store returns and `foundation-db.js` delegate exports.
- Normalize runner CLI flags so the operator-facing `--dry-run` spelling cannot fall through to a live lease/run.
- Add a small `runtime-first-jobs` proof module that checks the export contract and first-job definitions.
- Add a focused check script that runs the two dry-run target commands and validates no live work is performed.
- Add verifier coverage in the runtime reliability verifier with the new module as the source of dogfood.

Split/extraction plan for architecture risk:

- Do not add new inline verifier predicates to `scripts/foundation-verify.mjs`.
- Keep all new logic in `lib/runtime-first-jobs.js` and `scripts/process-runtime-first-jobs-check.mjs`.
- `scripts/foundation-verify.mjs` may only read the new source files and pass them into the existing focused verifier module.
- `lib/foundation-db.js` is under the 5,000-line danger line; only add stable delegate exports for already-extracted source-crawl behavior.
- `lib/foundation-db.js` remains a thin wrapper and no new source-crawl responsibility is added to that file.

Gate decision tree:

- Static gate: `node --check` for changed JS modules and scripts.
- Focused gate: `npm run process:runtime-first-jobs-check -- --json` proves the actual function/API/process path before full shipping.
- Full gate: because this touches runtime, DB export surface, package scripts, and the canonical verifier, final ship must use `npm run process:foundation-ship -- --card=RUNTIME-FIRST-JOBS-001 --planApprovalRef=docs/process/approvals/RUNTIME-FIRST-JOBS-001.json --closeoutKey=runtime-first-jobs-v1 --commitRef=HEAD`.
- Blast radius stays narrow: source-crawl public export seam, first-job dry-run proof, verifier coverage, and closeout docs only.

Check-script apply posture:

- `scripts/process-runtime-first-jobs-check.mjs` is read-only by default and has no `--apply` path.
- Any future live write path in this check must be read-only by default, require explicit `--apply` posture, and block no-flag writes.
- This card does not add `updateBacklogItem()`, `createBacklogItem()`, `upsertFoundationCurrentSprintOverlay()`, raw `INSERT`, raw `UPDATE`, raw `DELETE`, `fs.writeFile`, or any live-state mutation to the focused check.

Speed budget:

- Keep the focused proof fast enough to run by default: under 20 seconds.
- `/api/foundation/jobs` under 2 seconds.
- Default `/api/foundation-hub` under 2 seconds and 800 KB.
- Dry-run target commands must not call connector APIs.

## Risks

- **False green risk:** A dry-run could pass while live extraction still fails later. This card intentionally proves import/runner readiness only; live extraction health stays owned by job runs and source-specific cards.
- **Scope creep risk:** The failure invites a broad extraction sprint. Do not add jobs, change schedules, raise quotas, connect paid sources, or run live extraction here.
- **DB seam risk:** Future store splits can drop delegates again. Verifier coverage must fail if the target runner imports a delegate not provided by `foundation-db.js`.
- **Payload risk:** Do not expand Foundation Hub payload while checking worker/job health.
- **Rollback path:** If delegate repair destabilizes DB exports, revert only the new delegate exports and proof module; do not change source-crawl schema or job schedules.

## Tests

```sh
node --check lib/runtime-first-jobs.js scripts/process-runtime-first-jobs-check.mjs lib/foundation-source-crawl-store.js lib/foundation-db.js lib/foundation-runtime-reliability-verifier.js scripts/foundation-verify.mjs
npm run process:runtime-first-jobs-check -- --json
npm run extraction:target -- --target=gmail-current-day --dry-run
npm run extraction:target -- --target=missive-current-day --dry-run
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=RUNTIME-FIRST-JOBS-001 --planApprovalRef=docs/process/approvals/RUNTIME-FIRST-JOBS-001.json --closeoutKey=runtime-first-jobs-v1 --commitRef=HEAD
```

Not next: no new scheduler framework, no new jobs, no live extraction run, no source credential/auth changes, no paid-source auth, no Build Intel extraction, no hub feature work, no Marketing Video Lab wiring, no Canva asset-library behavior, no Meeting Vault Phase B, no Drive permission mutation, and no auto-restart-on-push install.
