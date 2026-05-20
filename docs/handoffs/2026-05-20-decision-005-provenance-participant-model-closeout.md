# DECISION-005 Closeout - Decision Provenance And Participant Model

Generated: 2026-05-20T10:21:02.894Z
Closeout: decision-005-provenance-participant-model-v1

## What Changed

- Added explicit decision provenance fields for direct, route-derived, backfilled, and unknown provenance.
- Added direct meeting/session/thread/artifact refs, source/route/artifact ref arrays, participant roles, and provenance notes.
- Wired the decision store so locked decisions must have an honest provenance posture.
- Backfilled existing locked seed decisions as `backfilled / weak_backfill` instead of pretending they are direct meeting evidence.
- Kept decision outputs proposed/human-controlled; no decision was auto-applied.

## Proof Summary

- Decisions reviewed: 8
- Locked decisions: 7
- Direct provenance rows: 0
- Route-derived rows: 1
- Backfilled rows: 7
- Blocked locked rows: 0
- Dogfood: pass
- Implementation: healthy

## Where It Lives

- `lib/decision-005-provenance-model.js`
- `lib/foundation-db-schema-seed-store.js`
- `lib/foundation-decision-store.js`
- `lib/foundation-write-routes.js`
- `lib/strategy-shared-comms-routes.js`
- `scripts/process-decision-005-check.mjs`
- `docs/process/decision-005-plan.md`
- `docs/process/approvals/DECISION-005.json`

## Proof Commands

- `node --check lib/decision-005-provenance-model.js scripts/process-decision-005-check.mjs lib/foundation-decision-store.js lib/foundation-db-schema-seed-store.js`
- `npm run process:decision-005-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DECISION-005 --planApprovalRef=docs/process/approvals/DECISION-005.json --closeoutKey=decision-005-provenance-participant-model-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DECISION-005 --closeoutKey=decision-005-provenance-participant-model-v1`
- `npm run process:foundation-ship -- --card=DECISION-005 --planApprovalRef=docs/process/approvals/DECISION-005.json --closeoutKey=decision-005-provenance-participant-model-v1 --commitRef=HEAD`

## Known Limits

- Backfilled historical seed decisions remain honest weak backfills until exact session/thread links are found.
- This does not create policy/SOP artifacts; DECISION-006 owns that layer.
- This does not run new private extraction or browser-auth work to discover missing historical links.
- This does not lock/apply proposed decisions without explicit human approval.

## Next

Continue FOUNDATION-SURFACE-UPDATES-001. Decision provenance now distinguishes direct, route-derived, and backfilled truth; the next card can safely handle the current sprint surface update work without treating historical backfills as direct evidence.
