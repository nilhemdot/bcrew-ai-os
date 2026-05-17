# E2E-STAGING-HARNESS-001 Plan

## What

Build a narrow V1 Playwright staging harness for Foundation and hub read surfaces.

V1 adds a local, read-only smoke runner that opens the app through a browser, checks desktop and mobile viewports, records temporary screenshots outside the repo, captures console/page failures, verifies non-empty page content, and probes key read APIs under explicit latency and payload budgets.

## Why

Steve needs hub and Foundation work to move faster without repeating the old pattern where a route compiled but failed in the actual browser. Existing proof scripts catch many code and process issues, but they do not provide one reusable staging lane for "does the page load, render nonblank content, avoid browser errors, and keep hot read APIs inside budget?"

The useful operator behavior for Steve and the team is safer parallel work: Foundation can keep tightening core systems while Sales, Ops, Strategy, Marketing, and Harlan-adjacent lanes get a standard pre-production smoke proof before shared route or UI changes ship. This gives Steve a real workflow he can trust before he asks a hub builder to commit browser-facing work.

## Acceptance Criteria

- `lib/e2e-staging-harness.js` owns the route/API surface list, budgets, Playwright runner, result normalization, and synthetic dogfood proof.
- `scripts/process-e2e-staging-harness-check.mjs` runs the harness against the local dashboard when requested and stays read-only by default.
- Package scripts include `process:e2e-staging-harness-check`.
- The harness checks desktop and mobile viewports for Foundation and hub read pages, captures console/page errors, verifies nonblank body text, and stores screenshots in a temporary OS directory rather than tracked docs.
- The harness checks read APIs including `/api/foundation-hub` and `/api/source-of-truth` with explicit latency and payload budgets.
- Dogfood proof calls the real exported function path and proves a missing content marker, a console error, and an oversized/slow API fixture fail closed.
- Live proof does not require provider credentials, Canva/Fal access, Skool/myICOR auth, or any paid generation.
- Plan Critic has a durable pass row at 9.8+ before build.

## Definition Of Done

- Live backlog card `E2E-STAGING-HARNESS-001` is closed under `e2e-staging-harness-v1`.
- `docs/process/e2e-staging-harness-001-plan.md` and `docs/process/approvals/E2E-STAGING-HARNESS-001.json` exist and validate.
- `lib/e2e-staging-harness.js` exports constants, `runE2eStagingHarness`, `evaluateE2eStagingResults`, and `buildE2eStagingHarnessDogfoodProof`.
- `scripts/process-e2e-staging-harness-check.mjs` validates required artifacts, approval, live backlog, Current Sprint, Plan Critic row, package script, dogfood proof, and optional live browser smoke proof.
- `npm run process:e2e-staging-harness-check -- --json --live` passes locally against the served dashboard.
- `npm run foundation:verify -- --json-summary` passes.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `docs/process/browser-qa-proof-001-plan.md`, the frontend split checks, Foundation ship/fanout gates, `getActiveFoundationCurrentSprint`, `getBacklogItemsByIds`, `getPlanCriticRunsByCardIds`, `validatePlanApprovalFile`, route budget patterns, and hub work coordination boundaries.

Existing docs to reuse: Browser QA proof doctrine, recent frontend split closeouts, Foundation Ready safe hub lane closeout, and the current no-off-scope WIP protocol.

Existing scripts to reuse: `process:foundation-ship`, `foundation:verify`, current process-check artifact validation patterns, and the local dashboard runtime started by supervised launch agents.

Main-session approved active sprint scope: this is the active Foundation main session sprint, not side/hub work. The requested shared files for this card are explicitly limited to `package.json`, `lib/e2e-staging-harness.js`, `scripts/process-e2e-staging-harness-check.mjs`, `docs/process/e2e-staging-harness-001-plan.md`, and `docs/process/approvals/E2E-STAGING-HARNESS-001.json`. No hub chat may commit, push, merge, or ship over this card; any future hub use of the harness must return to the main session if it needs shared route, security, package, process, or Foundation files.

Root invariant: UI/integration readiness is not proven by compilation or source markers. A staging proof must exercise the actual browser and read APIs, then fail closed on visible browser errors, blank renders, missing route availability, slow read APIs, or payload bloat.

Gate decision tree: static proof (`node --check`) is required for the new module and proof script; focused proof (`npm run process:e2e-staging-harness-check -- --json --live`) is required because this card must run the real browser/API path and reject failing fixtures; full proof (`npm run foundation:verify -- --json-summary` and `npm run process:foundation-ship`) is required because this adds package scripts, process doctrine, build closeout records, Playwright dependency wiring, and live sprint/backlog state.

Performance budget: browser page response/readiness should finish under 5 seconds per route locally. `/api/foundation-hub` should remain under 2 seconds and under 1 MB for the default read. `/api/source-of-truth` should remain under 2.5 seconds and under 1 MB for this V1 smoke lane. Any budget miss is a red staging result, not a warning hidden in logs.

Screenshot/storage boundary: screenshots are temporary diagnostic artifacts under the OS temp directory. They are not committed, archived, or copied into `docs/handoffs/` by default. A closeout may summarize paths and metrics only.

Playwright dependency boundary: this card may add the smallest Playwright dependency needed for local smoke checks. It must not add a broad test framework migration, CI runner, visual diff service, or browser automation for private paid-source extraction.

Speed bound: the focused dogfood proof is thin and proportional, and the live local staging run should finish under 2 minutes so it can be used by default before browser-facing changes ship.

## Risks

- Risk: staging proof becomes another slow mandatory gate for backend-only changes.
  - Repair path: keep this as a focused UI/integration proof used when routes, browser files, hub surfaces, or shared app wiring change.
- Risk: screenshots create a new artifact-bloat path.
  - Repair path: write screenshots only to a temp directory and summarize metrics in closeouts.
- Risk: Playwright setup becomes fragile on machines without browsers.
  - Repair path: fail with a clear setup message and keep deterministic dogfood proof separate from live browser proof.
- Risk: the harness goes broad and starts logging into private tools.
  - Repair path: V1 is read-only local dashboard/API smoke only. No paid-source auth, no provider calls, no browser login automation.

## Tests

```bash
node --check lib/e2e-staging-harness.js scripts/process-e2e-staging-harness-check.mjs
npm run process:e2e-staging-harness-check -- --json --live
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=E2E-STAGING-HARNESS-001 --planApprovalRef=docs/process/approvals/E2E-STAGING-HARNESS-001.json --closeoutKey=e2e-staging-harness-v1 --commitRef=HEAD
```

## Not Next

- Do not build hub feature UI.
- Do not wire Marketing Video Lab live routes.
- Do not run Fal, Canva, ElevenLabs, Skool, myICOR, Loom, or any paid/provider workflow.
- Do not add authenticated browser crawling.
- Do not require browser proof for backend-only cards.
- Do not write screenshots or large E2E artifacts into tracked repo docs.
- Do not mutate live backlog, source, sprint, connector, or hub data from the E2E harness.
- Do not work MEETING-VAULT-ACL-001 Phase B or mutate Google Drive permissions.
