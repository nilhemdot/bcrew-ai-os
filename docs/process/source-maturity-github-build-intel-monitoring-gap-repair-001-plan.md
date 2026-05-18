# SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001 Plan

Card: `SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001`
Closeout key: `source-maturity-github-build-intel-monitoring-gap-repair-v1`

## What

Repair the `SRC-GITHUB-BUILD-INTEL-001` source maturity monitored-stage gap by adding an explicit manual/on-demand monitoring boundary to the existing public GitHub Build Intel source contract.

This is source-contract truth only. It does not run GitHub, clone repositories, extract public repo data, create atoms, create action routes, call a model/provider, or mutate backlog from public repo findings.

## Why

Steve wants speed with quality and fewer recurring false gaps. The useful operator value is direct: the Source Maturity grid should show public GitHub Build Intel as trusted and monitored, then stop at the real next gap, `extracted`, until an approved extraction card exists. This unlocks a real workflow where Steve can scan source maturity and see the next safe approval boundary without asking whether public GitHub extraction already ran.

This keeps Foundation honest. A manual/on-demand monitoring boundary is enough to clear the monitored-stage contract gap, but it must not imply background GitHub crawling, code import, extraction, atoms, routes, or automatic backlog mutation.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- `SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001` locked the source as `Read-Only V1; Source Boundary Locked`.
- `BUILD-INTEL-GITHUB-MONITOR-001` shipped the earlier public GStack Build Intel V1 as manual-first and proposal-only.
- The live source maturity grid now shows `SRC-GITHUB-BUILD-INTEL-001` at `monitored`, meaning it has a trusted source boundary but no visible refresh/monitoring posture.
- Reuse `lib/source-maturity-grid.js`, `lib/source-contract-validation-layer.js`, `lib/source-contract-registry-table.js`, `scripts/sync-source-contract-registry.mjs`, and the existing GitHub Build Intel source note.
- Reuse the build-lane scaffold/current-sprint pattern from the source maturity repair scripts.

Implementation details:

- Add `updateMethod`, `refreshSchedule`, and `manualRefresh` to `SRC-GITHUB-BUILD-INTEL-001` in `lib/source-contracts.js`.
- The monitoring boundary must say manual/on-demand operator review, not a live crawler.
- Update `docs/source-notes/github-build-intel.md` and `docs/source-registry.md` with the same boundary.
- Sync the source contract registry from repo truth.
- Create the focused proof script and live backlog/current sprint scaffold.
- Add verifier done-card coverage and a closeout registry record.

## Acceptance Criteria

- `SRC-GITHUB-BUILD-INTEL-001` keeps `Active Read-Only V1` and `Read-Only V1; Source Boundary Locked`.
- The source contract records a manual/on-demand monitoring boundary.
- Source maturity clears `monitored` and the next real gap remains `extracted`.
- Extracted, atomized, synthesized, and routed stages remain unclaimed unless existing proof exists.
- No live GitHub call, repo clone, scrape, extraction target, atom, route, model/provider call, external write, Drive mutation, Agent Feedback auto-send, or automatic backlog mutation occurs.
- The root invariant is proven: a trusted public source with an explicit manual review boundary is monitored, but a source without extracted evidence is not extracted.
- Acceptance is command-proven by `process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --close-card --json`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

## Definition Of Done

- The acceptance criteria above pass against live repo/DB truth.
- The manual monitoring boundary is visible in source contracts, source note, source registry, and source contract registry sync output.
- The live backlog card moves through Current Sprint with complete scaffold metadata before `building_now`.
- The closeout registry and done-card verifier coverage include `SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001`.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Tests

- Synthetic pre-repair source with trust boundary but no monitoring posture fails at `monitored`.
- Synthetic repaired source with the manual/on-demand boundary passes monitored and fails next at `extracted`.
- Live proof checks the real source contract, validation layer, source contract registry, source maturity grid, source note, and source registry.
- Live proof fails if an active GitHub Build Intel extraction target is introduced.
- The proof uses `buildSourceMaturityGridSnapshot()`, `evaluateSourceContractValidationLayer()`, and `getSourceContractRegistrySnapshot()` as behavior paths.
- Static check: `node --check lib/source-maturity-github-build-intel-monitoring-gap-repair.js scripts/process-source-maturity-github-build-intel-monitoring-gap-repair-check.mjs`.
- Focused check: `npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --close-card --json`.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-github-build-intel-monitoring-gap-repair-v1 --commitRef=HEAD`.

## Risks

- Risk: a manual monitoring repair could be misread as approval for a live GitHub crawler. Mitigation: source contract, docs, Current Sprint metadata, focused proof, and closeout all repeat the no-live-call/no-extraction/no-automatic-backlog-mutation boundary.
- Risk: source maturity could become false-green by clearing downstream stages. Mitigation: dogfood and live proof require `extracted`, `atomized`, and `routed` to remain red.
- Risk: source contract registry drifts from repo source contracts. Mitigation: run the apply-gated source contract registry sync and prove the DB row still matches the locked read-only boundary.
- Repair path: if proof fails, repair the exact source-contract boundary, registry sync, source maturity evaluator input, scaffold metadata, or closeout wiring. Do not run live GitHub/extraction work to make the check pass.

## Gate Decision Tree

This card changes `lib/source-contracts.js`, package scripts, source-maturity proof code, process docs, and closeout registry coverage, so it uses the full gate path:

- Static syntax check for changed JS.
- Focused proof while iterating.
- `backlog:hygiene`.
- `foundation:verify`.
- Full `process:foundation-ship` before push.

The focused proof is fast and expected to complete in under 1 minute on the local machine, with the normal path staying under 5 seconds. It must avoid repeated full verifier loops while iterating. Full verification runs once after the focused proof and registry sync are green, or through the final ship gate.

## Not Next

- No live GitHub calls, repo cloning, scraping, installs, code import, or broad external crawling.
- No live extraction, transcript fetch, screenshot capture, provider/model call, or atom generation.
- No automatic backlog mutation from public repo content.
- No auth-required or paid run.
- No external write, ClickUp write, Gmail send, or Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.

## Proof Commands

```bash
node --check lib/source-maturity-github-build-intel-monitoring-gap-repair.js scripts/process-source-maturity-github-build-intel-monitoring-gap-repair-check.mjs
npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-github-build-intel-monitoring-gap-repair --json
npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --apply --stage=building_now --json
npm run process:source-maturity-github-build-intel-monitoring-gap-repair-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GITHUB-BUILD-INTEL-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-github-build-intel-monitoring-gap-repair-v1 --commitRef=HEAD
```
