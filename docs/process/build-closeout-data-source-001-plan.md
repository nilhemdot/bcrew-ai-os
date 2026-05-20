# BUILD-CLOSEOUT-DATA-SOURCE-001 Plan

Card: `BUILD-CLOSEOUT-DATA-SOURCE-001`
Closeout key: `build-closeout-data-source-v1`

## What

Move Foundation build closeout history behind a governed data-source boundary.

The prior registry extract made the closeout record files smaller. This card closes the next audit gap: Build Log should not treat operational closeout history as anonymous code-owned data. It must read through a named source contract and data-source module with validation, source registry mirroring, and audit proof.

## Why

The May 19 deep audit flagged `build-closeout-code-owned-data`: closeout history is operational truth that grows every card, but it was still exposed to Build Log as code registry data. That can drift into another hidden monolith where Recent Builds looks correct only because builders remember to edit the right JS file.

For Steve, the practical value is simple: shipped-card history should behave like a source. It needs an owner, source ID, access method, validation, registry mirror, focused proof, and a reusable audit detector. If that boundary breaks, the audit should create live repair work instead of letting report noise accumulate.

Useful operator behavior: Recent Builds and Build Log stay the place Steve inspects shipped work, but closeout history now has source-truth posture. When a future builder breaks the closeout source boundary, the nightly audit names the exact card and proof instead of asking Steve to notice that operational data drifted back into code.

## Existing Work Reused

- Existing code: `lib/foundation-build-log.js` remains the public Build Log behavior surface.
- Existing code: `lib/foundation-build-closeout-records.js` and the scoped `lib/foundation-build-closeout-*-records.js` modules remain the current record storage after `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`.
- Existing code: `lib/source-contract-registry-table.js`, `scripts/sync-source-contract-registry.mjs`, and `getSourceContractRegistrySnapshot()` already provide a Postgres mirror for source contracts.
- Existing code: `lib/code-quality-nightly-audit.js` already owns the deterministic detector for this audit finding.
- Existing code: `lib/deep-audit-findings-closure-gate.js` already routes the May 19 deep-audit findings into live backlog truth.
- Existing scripts: `process:code-quality-nightly-audit-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` remain the gates.
- Existing backlog truth: `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001` is already done and remains the file-size split this card builds on.

## Acceptance Criteria

- Live backlog card remains scoped/executing/done with full context.
- Plan and approval exist and pass approval integrity.
- `lib/build-closeout-data-source.js` owns:
  - `SRC-FOUNDATION-BUILD-CLOSEOUTS-001`
  - closeout source contract
  - record access function
  - record validation
  - runtime source snapshot
  - stale-boundary dogfood proof
- `lib/source-contracts.js` registers the build closeout source contract.
- `source_contract_registry` contains an active synced row for `SRC-FOUNDATION-BUILD-CLOSEOUTS-001`.
- `lib/foundation-build-log.js` reads records through `getBuildCloseoutDataSourceRecords()` instead of importing the raw closeout registry.
- Code-quality audit no longer proposes `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001` or `BUILD-CLOSEOUT-DATA-SOURCE-001` when the data-source boundary is healthy.
- Deep-audit findings closure route marks `build-closeout-code-owned-data` done only under `build-closeout-data-source-v1`.
- Focused dogfood fails for direct code-owned closeout registry access, missing source-contract insertion, missing registry mirror, and stale scoped audit route.
- Current Sprint advances to `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001` after closeout.

## Definition Of Done

- Focused proof passes with `--close-card`.
- Source contract registry sync is applied for the new source contract row.
- Code-quality nightly audit has no build-closeout code-owned data finding.
- System Health is healthy.
- Repeated-failure gate is healthy.
- Backlog hygiene is healthy.
- `foundation:verify` is green.
- `process:foundation-ship` passes and main is clean/pushed.

## Details

Existing work reused:

- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001` already split large closeout record files into focused modules.
- `getFoundationBuildCloseouts()` is the public behavior surface used by Recent Builds.
- `source_contract_registry` already mirrors source contracts into Postgres.
- `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001` already routes May 19 audit findings into live backlog truth.
- `process:code-quality-nightly-audit-check` already carries the deterministic audit route for this finding.

Implementation boundaries:

- This card does not migrate every closeout record into a new Postgres table.
- V1 creates the source contract, data-source access boundary, source registry mirror, and audit detector.
- A later card can move the physical record storage out of repo modules if that becomes the next bottleneck.
- Public Build Log and Recent Builds behavior must stay stable.
- No live extraction, external write, provider call, private broad read, Drive permission mutation, send, or credential change is allowed.

Dogfood:

- A synthetic direct `closeoutRecords` import in Build Log fails.
- A missing source-contract registration fails.
- A missing `source_contract_registry` row fails.
- A stale deep-audit route that stays scoped fails.
- A healthy data-source boundary passes.

Gate decision tree:

- Static gate first: `node --check` on the new module, proof script, Build Log, and code-quality audit.
- Focused gate next: `process:build-closeout-data-source-check -- --close-card --json` because this card mutates backlog, Current Sprint, and the source contract registry only through guarded closeout posture.
- Health gates next: System Health, repeated-failure gate, and backlog hygiene.
- Full gate last: `foundation:verify` and `process:foundation-ship` because this changes source contracts, source registry sync posture, Build Log source access, audit routing, package scripts, and closeout registry.

Rollback or repair path:

- If Build Log behavior changes, revert only the Build Log import boundary and keep the source-contract module in place for repair.
- If the source registry row is missing or stale, rerun `npm run source-contract-registry:sync -- --apply --actor=codex-build-closeout-data-source`.
- If code-quality still proposes the old closeout registry card, repair the evaluator before closing the card.
- If Recent Builds or Build Log loses closeouts, do not close the card; restore `getFoundationBuildCloseouts()` parity and rerun the focused proof.
- If full ship fails from an unrelated repeated failure, repair raw health first, then rerun the card proof.

Speed boundary:

- The focused proof reads local files, local Postgres source registry metadata, and deterministic audit output with endpoint fetch skipped. It should stay fast enough to use during normal card closeout.
- Full `foundation:verify` and `process:foundation-ship` still run once at closeout because the card touches load-bearing source and audit surfaces.

## Risks

- Risk: this becomes a fake paper boundary. Mitigation: Build Log must read through the new source module and the focused proof requires a live source registry row.
- Risk: source contract registry drift after adding the source ID. Mitigation: close-card proof syncs the registry and validates the active row.
- Risk: Recent Builds behavior changes. Mitigation: the public record normalization and validation still run through `getFoundationBuildCloseouts()`.
- Risk: this becomes a full storage migration sprint. Mitigation: V1 only creates the source boundary and proof; DB storage migration is explicitly not next.

## Tests

```bash
node --check lib/build-closeout-data-source.js scripts/process-build-closeout-data-source-check.mjs lib/foundation-build-log.js lib/code-quality-nightly-audit.js
npm run process:build-closeout-data-source-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json --closeoutKey=build-closeout-data-source-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --closeoutKey=build-closeout-data-source-v1
npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json --closeoutKey=build-closeout-data-source-v1 --commitRef=HEAD
```

## Not Next

- Do not redesign Recent Builds or Build Log UI.
- Do not migrate all closeout records into a new DB table in this card.
- Do not delete or rewrite closeout history.
- Do not change closeout matching/enrichment behavior.
- Do not work `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001` in this card.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not start source/value/extraction expansion.
- Do not mutate Drive permissions, send email/messages, rotate credentials, run paid/provider access, or perform private broad extraction.
- No Drive permission mutation.
