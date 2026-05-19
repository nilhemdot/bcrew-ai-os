# DB-CONSTRAINT-001 Closeout

Date: 2026-05-16
Sprint: `db-constraint-doc-update-supersedes-2026-05-16`
Closeout key: `db-constraint-doc-update-supersedes-v1`
Status: Verified

## Summary

`DB-CONSTRAINT-001` closes the doc-update decision supersession gap.

Before this slice, applying an approved pending doc update linked to a decision could lock the linked decision without applying that decision's `supersedesIds`. That left the older decision active even though the replacement decision had been locked.

V1 now uses the existing decision supersession path during doc-update apply: the linked decision is locked, its superseded decisions are marked `superseded`, and change events record the applied supersession metadata.

## What Changed

- Added `lockDecisionFromDocUpdate()` inside `lib/foundation-decision-store.js`.
- Reused `markSupersededDecisions()` from the doc-update apply path instead of creating a second decision transition path.
- Added `decision_locked` metadata with `docUpdateId`, `supersedesIds`, and `appliedSupersedesIds`.
- Added `doc_update_applied` metadata with `decisionSupersedesIds` and `appliedSupersedesIds`.
- Added `lib/db-constraint-hardening.js` for constants, source evaluation, and fake-client dogfood proof.
- Added `scripts/process-db-constraint-check.mjs` as the read-only focused proof.
- Added `process:db-constraint-check`.
- Added `DB-CONSTRAINT-001` coverage to `lib/foundation-core-governance-verifier.js`.
- Wired `scripts/process-verifier-core-governance-split-module-check.mjs` and `scripts/foundation-verify.mjs` to pass DB-constraint dogfood into the core-governance verifier.
- Updated rebuild plan/state and Recent Builds closeout registry.

## Dogfood Proof

The focused dogfood recreates the old failure mode with a fake decision store:

- `DEC-NEW` starts as `proposed` and supersedes `DEC-OLD`.
- `DU-NEW` is an approved pending doc update linked to `DEC-NEW`.
- Applying `DU-NEW` locks `DEC-NEW`.
- Applying `DU-NEW` marks `DEC-OLD` as `superseded`.
- `DEC-OTHER` stays unchanged.
- Change events include `decision_superseded`, `decision_locked`, and `doc_update_applied`.
- Applied supersession metadata includes `DEC-OLD`.

## Proof Commands

```sh
node --check lib/foundation-decision-store.js lib/db-constraint-hardening.js scripts/process-db-constraint-check.mjs lib/foundation-core-governance-verifier.js scripts/process-verifier-core-governance-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:db-constraint-check -- --json
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=DB-CONSTRAINT-001 --planApprovalRef=docs/process/approvals/DB-CONSTRAINT-001.json --closeoutKey=db-constraint-doc-update-supersedes-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=DB-CONSTRAINT-001 --closeoutKey=db-constraint-doc-update-supersedes-v1
npm run process:foundation-ship -- --card=DB-CONSTRAINT-001 --planApprovalRef=docs/process/approvals/DB-CONSTRAINT-001.json --closeoutKey=db-constraint-doc-update-supersedes-v1 --commitRef=HEAD
```

## Verified Results

- `process:db-constraint-check` passed 12/12.
- `process:verifier-core-governance-split-module-check` passed 27/27.
- `foundation:verify` passed 405/405 before closeout.

## Boundaries

Not included:

- No live doc-update apply.
- No route redesign.
- No file-write redesign.
- No broad source-ID foreign-key migration.
- No connector auth, paid-source auth, or extraction run.
- No hub feature work.
- No Marketing Video Lab route wiring.
- No Canva asset mutation.
- No Drive permissions mutation, request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Next

Continue no-auth Foundation cleanup. The next DB constraint decision should be whether source-ID checks stay verifier-backed contracts or move into real DB foreign keys in a separate scoped slice.
