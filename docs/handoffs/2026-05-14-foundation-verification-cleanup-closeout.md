# Foundation Verification + Continued Cleanup Closeout - 2026-05-14

## Sprint

`foundation-verification-cleanup-2026-05-14`

Cards:

- `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001`
- `HUB-PERF-VERIFICATION-001`
- `MONOLITH-SPLIT-CONTINUE-001`
- `RECURRING-DEEP-AUDIT-001`

## What Changed

- Plan Critic architecture dogfood now proves the real `evaluatePlanCriticPlan()` path rejects large-file/no-split plans, mutating check scripts without apply posture, verifier repair plans, missing focused proof, missing audit-fix dogfood, and hot route/API changes without performance budgets.
- Foundation Hub performance was remeasured after the summary-route hardening. Default `/api/foundation-hub` is fast; full diagnostics remains heavy and stays visible as follow-up.
- Closeout records continued moving out of the large registry. New verification-cleanup and prior operating-reliability closeouts now live in `lib/foundation-build-closeout-cleanup-records.js`.
- Recurring senior-engineer deep audit is now a manual, report-only Foundation job contract every 4-6 Foundation sprints or explicit Steve approval. It is not the deterministic nightly scanner and does not mutate backlog/code.

## Proof

- `npm run process:recurring-deep-audit-check -- --json`
- `npm run process:foundation-verification-cleanup-check -- --json`
- `npm run process:foundation-verification-cleanup-check -- --json --no-api`
- `npm run process:plan-critic-architectural-rules-check -- --json`

Measured route truth:

- Default `/api/foundation-hub`: committed baseline 0.073341s / 891,236 bytes; live proof 0.102089s / 891,235 bytes.
- Full `/api/foundation-hub?view=full`: committed baseline 62.386321s / 4,799,862 bytes; live proof 74.840358s / 4,799,826 bytes.

## Known Limits

- Full diagnostics is still too slow for routine operator use. This sprint records and guards that truth; it does not optimize the full diagnostic payload.
- Main monoliths still remain: `lib/foundation-db.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, and `server.js`.
- Recurring deep audit is registered as a manual/report-only cadence. It does not run autonomous review, create backlog cards, or fix code.

## Next

Recommended next cleanup slice: `FOUNDATION-FULL-DIAGNOSTICS-PERF-001`, then `VERIFIER-MONOLITH-SPLIT-CONTINUE-001`, `FOUNDATION-DB-MONOLITH-SPLIT-001`, and `FRONTEND-MONOLITH-SPLIT-001`. Hub work can proceed in separate hub-owned files under the coordination protocol.
