# FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001 Plan

## What

Build the first closeout records-as-data slice. V1 adds a reusable JSON artifact loader, migrates the source-newsletter closeout family out of hand-written JS record literals, and proves the existing Build Log/API path still sees the same closeouts.

This is a pilot, not a bulk migration. Larger record groups stay untouched until the loader, validation, source visibility, fanout, and ship gates prove the pattern.

## Why

The audit found roughly 30k lines of closeout records stored as code. The existing `BUILD-CLOSEOUT-DATA-SOURCE-001` card gave the Build Log a source-contract boundary, but the record storage is still JS modules. That means every closeout adds code churn, and cleanup keeps growing files that should be data.

V1 creates useful operator behavior for Steve and the team: Recent Builds keeps showing the same closeouts and proof commands in the real workflow, while future builders get a safe data-artifact path instead of adding more hand-written JS record bodies. This unlocks speed with quality because cleanup can shrink code without making Steve wonder whether build history disappeared. The first slice is intentionally small: one source-newsletter family, one data artifact, one loader, and no history deletion.

## Acceptance Criteria

- `data/foundation-build-closeouts/source-newsletter-records.json` owns the migrated source-newsletter closeout records.
- `lib/foundation-build-closeout-source-newsletter-records.js` remains as a thin compatibility wrapper that exports the same `sourceNewsletterCloseoutRecords` array through the loader.
- The artifact validator rejects malformed closeout records and duplicate closeout keys.
- `getFoundationBuildCloseouts()`, closeout validation, Recent Builds source visibility, registry extract proof, and fanout still find the migrated keys.
- Live backlog/current sprint close this as a V1 pilot and keep larger closeout families as follow-up work.
- `FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001` focused proof returns `status=healthy`, Plan Critic returns `status=pass` with score at or above 9.8, and the closeout remains visible through Recent Builds.

## Definition Of Done

- Add `lib/foundation-build-closeout-data-artifacts.js` and `lib/foundation-closeout-records-data-store.js`.
- Add `scripts/process-foundation-closeout-records-data-store-check.mjs` and package script `process:foundation-closeout-records-data-store-check`.
- Migrate only the source-newsletter closeout family into JSON data.
- Add closeout registry coverage and done-card verifier coverage for this card.
- Focused proof, build-closeout data-source proof, registry-extract proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass; a revise score or missing migrated closeout key means the card is not done.

## Details

Existing code reused:

- `lib/build-closeout-data-source.js` and `lib/foundation-build-log.js` for Build Log closeout read behavior.
- `lib/foundation-build-closeout-records.js` and `lib/foundation-build-closeout-source-records.js` for existing import/spread ownership.
- `lib/foundation-build-log-source.js` for source visibility used by process/fanout checks.
- `lib/build-closeout-registry-extract.js` for registry split and source visibility proof.
- `lib/process-plan-critic.js`, `lib/process-write-guard.js`, and Current Sprint DB helpers for plan/live-state control.

Existing docs/backlog truth reused:

- `docs/process/build-closeout-data-source-001-plan.md`
- `docs/process/build-closeout-registry-extract-001-plan.md`
- Live backlog card `FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001`
- Current sprint `FOUNDATION-TUNEUP-2026-05-29`

Existing scripts reused:

- `npm run process:build-closeout-data-source-check -- --json`
- `npm run process:build-closeout-registry-extract-check -- --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

The focused proof calls real module paths: `loadFoundationBuildCloseoutDataArtifact`, `buildFoundationBuildCloseoutDataArtifactSnapshot`, `getFoundationBuildCloseouts`, `getFoundationBuildCloseoutValidation`, and the Current Sprint readback. It rejects bad data with actual validator calls, not substring checks.

Gate decision: full gate. This touches Build Log closeout storage, package scripts, Current Sprint, and closeout metadata, so static checks alone are insufficient. The focused proof runs first, then the supporting Build Log/data-source checks, then full `foundation:verify`, then `process:foundation-ship`.

## Risks

Risk: JSON migration drops a closeout key and Recent Builds quietly loses history. Repair path: focused proof compares migrated artifact keys against `getFoundationBuildCloseouts()` and fanout checks Recent Builds after served-code restart.

Risk: a future builder treats this as approval to bulk-migrate all closeout groups. Repair path: V1 closeout and Current Sprint say source-newsletter only; larger groups need separate cards and proof.

Risk: source visibility checks still scan only JS files. Repair path: `lib/foundation-build-log-source.js` and registry extract proof include the JSON artifact path.

Risk: data artifacts accept malformed records. Repair path: validator dogfood rejects missing proof commands and duplicate keys.

## Tests

- `node --check lib/foundation-build-closeout-data-artifacts.js`
- `node --check lib/foundation-closeout-records-data-store.js`
- `node --check scripts/process-foundation-closeout-records-data-store-check.mjs`
- `npm run process:foundation-closeout-records-data-store-check -- --json`
- `npm run process:foundation-closeout-records-data-store-check -- --apply --stage=building_now --json`
- `npm run process:foundation-closeout-records-data-store-check -- --close-card --json`
- `npm run process:build-closeout-data-source-check -- --json`
- `npm run process:build-closeout-registry-extract-check -- --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CLOSEOUT-RECORDS-DATA-STORE-001.json --closeoutKey=foundation-closeout-records-data-store-v1 --commitRef=HEAD`

## Not Next

Do not migrate all closeout record families in this card. Do not delete closeout history. Do not delete verifier/approval/plan/check files. Do not delete `scripts/codex-status.mjs`. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems.
