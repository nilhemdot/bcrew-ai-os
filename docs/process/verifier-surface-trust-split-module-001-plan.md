# VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001 Plan

## What

Extract the existing surface/trust verifier predicates from `scripts/foundation-verify.mjs` into `lib/foundation-surface-trust-verifier.js`.

The split keeps the same PASS/FAIL intent for:

- `/api/foundation-hub` core arrays and decision review payload shape
- dashboard served-code trust against current repo `HEAD`
- Foundation worker startup-code trust against current repo `HEAD`
- explicit verifier exception ledger validity and staleness
- done backlog card verifier coverage or approved exception coverage
- claimed file, npm script, and API route existence in done cards and closeouts
- backlog seed/live drift exposure
- DB constraint audit exposure
- Foundation surface map coverage for pages, sub-surfaces, and critical API routes
- surface freshness sweep exposure

The root verifier should delegate these checks to `evaluateFoundationSurfaceTrustVerifier()` and keep only orchestration/wiring.

## Why

`scripts/foundation-verify.mjs` is still above the active danger line at about `13,991` lines. The surface/trust block is a coherent proof domain that guards whether the visible Foundation command surface is trustworthy, current, mapped, and backed by real artifacts.

Leaving these rows inline makes the verifier harder to audit and makes it easier to weaken surface trust while still producing a green check.

Operator value for Steve: served-code trust, artifact-claim trust, done-card proof coverage, and surface freshness now have one focused module. Future failures can be debugged without hunting through the full verifier monolith.

## Acceptance Criteria

- `lib/foundation-surface-trust-verifier.js` exports `evaluateFoundationSurfaceTrustVerifier()` and `buildFoundationSurfaceTrustVerifierDogfoodProof()`.
- `scripts/foundation-verify.mjs` delegates the extracted surface/trust rows to that module.
- `scripts/foundation-verify.mjs` line count is lower than the recorded `13,991` baseline.
- `scripts/process-verifier-surface-trust-split-module-check.mjs` is read-only and registered as `process:verifier-surface-trust-split-module-check`.
- The focused proof validates approval, live backlog, Current Sprint state, durable Plan Critic pass, module delegation, dogfood rejection, package script registration, line-count reduction, and exact closeout when present.
- Dogfood proof recreates the failure class and proves the module fails closed when exceptions are stale, done-card verifier proof is missing, done cards claim missing artifacts/routes/scripts, served code is stale, or surface maps are incomplete.
- `npm run backlog:hygiene -- --json`, `npm run foundation:verify -- --json-summary`, and `process:foundation-ship` pass before push.

## Definition Of Done

- The live backlog card `VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001` is in `done`.
- Current Sprint shows the card in `done_this_sprint` with sprint-review posture.
- The closeout exists at `docs/handoffs/2026-05-16-verifier-surface-trust-split-module-closeout.md`.
- `lib/foundation-build-closeout-overnight-records.js` has a matching closeout record under `verifier-surface-trust-split-module-v1`.
- Dashboard and worker are restarted by `process:foundation-ship` so runtime serves the pushed `HEAD`.
- Only this Foundation card's files are committed and pushed. Unrelated local files, mockup assets, and Codex usage edits remain untouched.

## Details

Files in scope:

- `lib/foundation-surface-trust-verifier.js`
- `scripts/process-verifier-surface-trust-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-surface-trust-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/handoffs/2026-05-16-verifier-surface-trust-split-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

Existing work reused:

- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- Existing verifier split pattern from `lib/foundation-extraction-runtime-verifier.js`.
- Existing focused proof pattern from `scripts/process-verifier-extraction-runtime-split-module-check.mjs`.
- Existing live backlog and Current Sprint helpers.
- Existing approval integrity validation.
- Existing Plan Critic run ledger.
- Existing closeout registry and ship/fanout gates.
- Existing Foundation Hub payloads, runtime supervisor metadata, verifier exception ledger, surface map, and build closeout registry. This card does not rewrite them.

Large-file split plan: this card touches `scripts/foundation-verify.mjs`, which is over 5,000 lines, only to remove one coherent proof domain and replace it with a thin delegation call. No new verifier responsibility may be added to the root file. If the work expands into unrelated verifier checks, stop and open a new card.

Check-script write posture: `scripts/process-verifier-surface-trust-split-module-check.mjs` is read-only by default and has no `--apply` path. It validates live state, files, Plan Critic rows, closeout ownership, and dogfood fixtures only; it must not write DB rows, files, backlog state, or Current Sprint overlays.

Gate decision tree: static syntax checks run first, focused proof runs through the real process path `npm run process:verifier-surface-trust-split-module-check -- --json`, and the full gate runs through `foundation:verify` plus `process:foundation-ship` because the blast radius touches the canonical verifier and surface trust proof.

Behavior proof, not substring proof: the focused command proves real behavior through the actual function path `evaluateFoundationSurfaceTrustVerifier()` and then calls `buildFoundationSurfaceTrustVerifierDogfoodProof()` to prove synthetic broken states fail closed. The proof rejects stale verifier exceptions, missing done-card verifier proof, missing claimed artifacts/routes/scripts, stale served code, and incomplete surface mapping. Substring-only proof is rejected and is not enough to close this card.

Speed boundary: the focused proof stays bounded by reading repo/source surfaces once and using synthetic dogfood fixtures. It should stay under 10 seconds locally and must not run extraction, Drive/Gmail/video crawls, LLM calls, paid source-auth workflows, emails, or hub feature work. The full ship gate remains the slower canonical proof and should stay within the 300-second process budget.

## Risks

- Risk: extraction accidentally changes a PASS/FAIL row. Mitigation: focused proof and full `foundation:verify` validate live behavior after delegation.
- Risk: proof becomes another substring check. Mitigation: dogfood creates failing fixtures for stale exception, missing done proof, missing artifact claims, stale served code, and incomplete surface map.
- Risk: cleanup drifts into surface behavior changes. Mitigation: not-next boundaries explicitly forbid UI redesign, route changes, source auth, connector calls, hub features, and Build Intel work.
- Risk: current sprint/live backlog drift makes the board misleading. Mitigation: update live DB, docs, Plan Critic, and Current Sprint overlay before calling the card done.
- Risk: unrelated dirty files get swept into the commit. Mitigation: stage only scoped files and verify `git status --short` before commit.

Rollback/repair path: if focused proof or full verifier fails, keep the card in `building_now`, repair only the module/root delegation, and rerun focused proof. If behavior changed beyond verifier ownership, revert the behavioral part and keep only extraction wiring.

## Tests

```bash
node --check lib/foundation-surface-trust-verifier.js
node --check scripts/process-verifier-surface-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-surface-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-surface-trust-split-module-v1 --commitRef=HEAD
```
