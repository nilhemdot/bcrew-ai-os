# FUB-SOURCE-ROUTE-SPLIT-001 Plan

## What

Extract the Follow Up Boss source-control route cluster from `server.js` into `lib/fub-source-routes.js`.

V1 moves these admin-gated route handlers without changing their behavior:

- `GET /api/fub/health`
- `GET /api/fub/person`
- `GET /api/fub/lead-sources`
- `POST /api/fub/lead-sources/refresh`
- `PATCH /api/fub/lead-sources`
- `POST /api/fub/request`

`server.js` keeps only the registrar call and shared dependency wiring.

## Why

`server.js` is still over 7,000 lines. The Foundation route split work already moved operator, source, and Build Intel route clusters into focused modules, but the FUB source routes remain inline. That keeps source-system route behavior mixed into the server monolith and makes future FUB/source-health work riskier than it needs to be.

This card is a split/extraction cleanup. It does not build a new FUB feature and does not mutate FUB data. The operator value is that Steve and the team keep the same product behavior for FUB source-health controls in the real Foundation workflow, but the server route owner is smaller, faster to review, and harder to accidentally break while Foundation work continues. It unlocks safer quality work on FUB/source health without making Steve wait on a broad server rewrite.

## Acceptance Criteria

- New module `lib/fub-source-routes.js` owns the six FUB route handlers.
- `server.js` delegates through `registerFubSourceRoutes(app, deps)` and no longer contains the moved inline `app.get/app.post/app.patch` route blocks.
- Route behavior stays compatible for success and validation paths.
- Focused proof hits live local validation routes with latency/payload budgets:
  - invalid FUB context/person/request bodies still return `400` without external mutation.
  - validation probes cover `health`, `person`, `lead-sources/refresh`, `lead-sources` update, and generic `request`.
- Focused proof dogfoods old failure classes: missing registrar module, inline route markers still present in `server.js`, missing route strings in the module, and a mutating proof script must fail.
- Proof script is read-only by default and has no `--apply` path.
- Live backlog, Current Sprint, Plan Critic row, closeout, Recent Builds, and verifier coverage all name `FUB-SOURCE-ROUTE-SPLIT-001` and `fub-source-route-split-v1`.

## Definition Of Done

- `FUB-SOURCE-ROUTE-SPLIT-001` is closed under `fub-source-route-split-v1`.
- `docs/process/fub-source-route-split-001-plan.md` and `docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/fub-source-routes.js` registers the six FUB source routes.
- `scripts/process-fub-source-route-split-check.mjs` passes and proves live route validation plus source ownership.
- `server.js` delegates to the new route module and drops the moved inline FUB route blocks.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the current FUB route handlers in `server.js`, FUB helpers from `lib/fub.js`, FUB lead-source snapshot/rule functions from `lib/foundation-db.js`, `buildFubLeadSourcePayload`, `syncFubLeadSourceDriftEvent`, `buildSourceWatchFreshness`, and the shared server validation helpers.

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, route-split closeouts from 2026-05-15, and AGENTS monolith rules.

Existing scripts to reuse: `scripts/process-server-route-split-check.mjs`, `scripts/process-source-route-split-check.mjs`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Split plan: this card touches `server.js`, a file over 5,000 lines, only to remove a coherent route cluster and add a thin registrar call. The new responsibility lives in `lib/fub-source-routes.js`. No hub UI, no Marketing Video Lab route wiring, no source extraction, no paid auth, and no FUB write/mutation workflow changes are included.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. It may call local API validation paths and read live source snapshots.

Gate decision tree: static proof is required for syntax, focused proof is required first because this is a bounded route ownership split with concrete route probes, and full verification is also required because the blast radius touches `server.js`, `scripts/foundation-verify.mjs`, package scripts, live Current Sprint, and build closeouts. The focused command is `npm run process:fub-source-route-split-check -- --json`; the full canonical ship command is `npm run process:foundation-ship -- --card=FUB-SOURCE-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json --closeoutKey=fub-source-route-split-v1 --commitRef=HEAD`.

## Risks

- Risk: route extraction changes FUB validation behavior.
  - Response path: focused proof hits validation failures for unknown context, missing person input, invalid refresh/update bodies, and disabled generic mutation.
- Risk: proof becomes source-substring theater.
  - Response path: dogfood must reject bad fixtures and live local route probes must pass.
- Risk: this becomes a FUB feature sprint.
  - Response path: only route ownership changes. No new UI, no new FUB data mutation, no new extraction, and no success-path FUB refresh/lead-source sync is called by the proof.
- Risk: server monolith keeps growing despite the split.
  - Response path: `server.js` must lose the moved inline route markers and record line-count delta.
- Risk: proof fails or route behavior regresses.
  - Repair path: keep the card in `building_now`, do not mark the card done, inspect the focused route proof failure, and either repair the module or restore the registrar to the prior inline route behavior before running full Foundation ship. If the full ship gate fails after commit, do not push; repair the failing invariant and rerun the gate against the same card.

## Tests

```bash
node --check lib/fub-source-routes.js scripts/process-fub-source-route-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:fub-source-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FUB-SOURCE-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json --closeoutKey=fub-source-route-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the old failure class by feeding the checker bad source fixtures that a route split could accidentally leave behind: missing module route strings, old inline server route ownership, missing registrar call, and a non-read-only proof script. Substring-only proof is rejected because live local validation routes must also pass without calling FUB refresh or success-path lead-source sync.

## Not Next

- Do not change FUB business logic.
- Do not call live FUB refresh in proof.
- Do not enable generic FUB proxy mutations.
- Do not wire Marketing Video Lab live routes.
- Do not change Sales/Ops/Marketing Hub UI.
- Do not touch auth/session routes.
- Do not build paid-source auth, source extraction, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
