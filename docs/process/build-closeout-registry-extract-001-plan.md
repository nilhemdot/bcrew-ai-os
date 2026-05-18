# BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 Plan

Card: `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
Closeout key: `build-closeout-registry-extract-v1`

## What

Extract oversized Foundation build closeout registry record groups into focused modules while preserving the public build-log and Recent Builds behavior.

This is a narrow root-file cleanup card. It does not redesign Recent Builds, delete closeouts, change build-log matching rules, or touch live external systems.

## Why

The next repo-truth cleanup blocker is closeout registry size. `lib/foundation-build-closeout-records.js` and `lib/foundation-build-closeout-overnight-records.js` were both over the 3,000-line architecture-risk threshold. The registry grows every completed card, so leaving large literal record groups in root files recreates the old monolith pattern.

For Steve, this keeps closeout proof inspectable. New cards should add records to a scoped registry module, not push one huge root file toward 5,000+ lines again.

Operator value: this unlocks a real workflow where Steve can open Recent Builds, inspect proof, and trust that each shipped card still has a durable closeout without asking a builder to parse multi-thousand-line registry files. The useful behavior is faster review speed with higher quality: closeout records stay findable, ownership is clear, and future builders have an obvious module to edit.

## Acceptance Criteria

- Live backlog card exists with rich context for `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`.
- Plan and approval exist.
- `lib/foundation-build-closeout-records.js` is reduced below 3,000 lines.
- `lib/foundation-build-closeout-overnight-records.js` is reduced below 3,000 lines.
- Extracted closeout modules stay below 1,500 lines each.
- `getFoundationBuildCloseouts()` still exposes moved representative closeout keys.
- Closeout validation has zero invalid records and zero ownership overlaps.
- Full Foundation verifier source bundling includes every closeout record module so source-backed checks do not lose visibility behind imports.
- Build-log source helper reads every closeout record module so focused proof scripts do not keep scanning only the old root registry file.
- Focused dogfood recreates the failure class: oversized root registry files fail, extracted module shape passes, and missing moved keys fail closed.
- Full ship gate passes before push.

## Definition Of Done

- `lib/foundation-build-closeout-records.js` becomes import/spread orchestration only.
- `lib/foundation-build-closeout-overnight-records.js` imports/spreads extracted route/frontend, DB/process, and verifier/runtime record groups.
- New focused closeout record modules own the moved literal records.
- `scripts/foundation-verify.mjs` includes all closeout record modules in the registry source bundle.
- `lib/foundation-build-log-source.js` includes all closeout record modules in the shared build-log source bundle used by focused proof scripts.
- `lib/build-closeout-registry-extract.js` and `scripts/process-build-closeout-registry-extract-check.mjs` validate the split.
- `lib/foundation-build-closeout-size-records.js` registers `build-closeout-registry-extract-v1`.
- Focused proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- Existing code: `lib/foundation-build-log.js` owns public `getFoundationBuildCloseouts()` behavior.
- Existing code: `lib/foundation-build-closeout-records.js` already delegates to several closeout record modules.
- Existing code: `lib/foundation-build-closeout-registry-split.js` established the registry-split invariant.
- Existing docs: `docs/process/critical-files-under-5k-001-plan.md`, `docs/process/critical-roots-under-3k-phase-1-plan.md`, and `docs/process/file-size-engineering-standard-001-plan.md` define the size-risk discipline.
- Existing scripts: `process:fanout-check`, `process:ship-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` remain the ship path.
- Live backlog and Current Sprint truth are reused through the existing build-lane scaffold and overlay path.

Implementation details:

- Move root inline closeout records into focused modules by topic: source once-over, process gate, doctrine cleanup, control layer, Agent Feedback, and Foundation surface.
- Move large overnight sections into focused route/frontend, DB/process, and verifier/runtime modules.
- Keep the same exported arrays and spread order so public closeout output remains behaviorally stable.
- Include all closeout record module source in the Foundation verifier registry source bundle, because once the root file becomes import/spread orchestration, source-backed checks cannot rely on the root file containing literal record text.
- Include all closeout record module source in `readFoundationBuildLogRegistrySource()` for the same reason. The focused scripts for Agent Feedback, Systems, and follow-up closeouts use that helper to prove closeout keys exist in source, so scanning only `lib/foundation-build-closeout-records.js` becomes a false-red after this split.
- Behavior proof uses `buildBuildCloseoutRegistryExtractSnapshot()` and `getFoundationBuildCloseouts()` to prove line counts, validation, and representative moved keys.
- Substring-only proof is rejected. Source marker checks are allowed only after function-path closeout validation passes.
- The focused proof is designed to stay under 2 minutes; full verifier and ship gate run once at closeout.

Gate decision tree:

- Static gate: `node --check` for changed JS.
- Focused gate: `npm run process:build-closeout-registry-extract-check -- --close-card --json`.
- Full gate: `foundation:verify` and `process:foundation-ship` because this changes closeout registry truth, package scripts, verifier source bundling, and ship/fanout proof.

## Risks

- Risk: moved records disappear from Recent Builds. Mitigation: focused proof calls `getFoundationBuildCloseouts()` and checks representative moved keys.
- Risk: source-backed verifier checks lose visibility into extracted modules. Mitigation: `scripts/foundation-verify.mjs` reads the extracted modules into the registry source bundle.
- Risk: this becomes another large data module. Mitigation: every extracted module stays below 1,500 lines.
- Risk: registry behavior changes. Mitigation: no matching/enrichment logic changes; only literal record ownership changes.

## Tests

```bash
node --check lib/build-closeout-registry-extract.js scripts/process-build-closeout-registry-extract-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-records.js lib/foundation-build-closeout-overnight-records.js lib/foundation-build-closeout-size-records.js
npm run process:build-closeout-registry-extract-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json --closeoutKey=build-closeout-registry-extract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --closeoutKey=build-closeout-registry-extract-v1
npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json --closeoutKey=build-closeout-registry-extract-v1 --commitRef=HEAD
```

## Not Next

- Do not redesign Recent Builds.
- Do not change closeout matching or build-log enrichment behavior.
- Do not delete or rewrite closeout records.
- Do not reduce `scripts/foundation-verify.mjs`, `server.js`, `lib/foundation-db.js`, or `public/foundation.js` in this card.
- Do not launch parallel builders or hidden subagents.
- Do not run live extraction, auth-required jobs, paid jobs, provider/model probes, external writes, Drive permission mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
