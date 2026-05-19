# Foundation Job Mutation Allowlist Closeout

Date: 2026-05-15
Card: `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`
Sprint: `foundation-job-mutation-allowlist-2026-05-15`
Closeout key: `foundation-job-mutation-allowlist-v1`

## Result

Accepted for v1.

Scheduled Foundation jobs now have an explicit mutation allowlist posture. Missing allowlist rows, posture mismatches, and explicitly blocked scheduled jobs fail closed before the worker can treat them as runnable.

## What Changed

- Added `lib/foundation-job-mutation-allowlist.js` with the keyed scheduled-job mutation allowlist, report builder, and dogfood proof.
- Updated `lib/foundation-jobs.js` so scheduled job validation calls the allowlist before a job is considered runnable.
- Preserved the existing process-check mutation guard from `PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001`.
- Exposed `mutationAllowlist` on runtime activation rows and compact Foundation Hub job payloads.
- Added `scripts/process-foundation-job-mutation-allowlist-check.mjs`.
- Added thin verifier coverage.
- Added package script `process:foundation-job-mutation-allowlist-check`.

## Proof

Focused proof:

```bash
npm run process:foundation-job-mutation-allowlist-check -- --json
```

Expected focused proof facts:

- `25` real scheduled jobs inspected.
- `24` scheduled jobs allowed by explicit posture.
- `1` scheduled job intentionally blocked: `verification-runs`.
- `0` missing allowlist rows.
- `0` posture mismatches.
- Synthetic missing allowlist job fails closed as `missing_allowlist`.
- Synthetic report-only job that becomes mutating fails closed as `posture_mismatch`.

Full proof:

```bash
node --check lib/foundation-job-mutation-allowlist.js lib/foundation-jobs.js lib/connector-uptime-monitor.js lib/foundation-hub-summary-payload.js scripts/process-foundation-job-mutation-allowlist-check.mjs scripts/foundation-verify.mjs
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-JOB-MUTATION-ALLOWLIST-001 --planApprovalRef=docs/process/approvals/FOUNDATION-JOB-MUTATION-ALLOWLIST-001.json --closeoutKey=foundation-job-mutation-allowlist-v1 --commitRef=HEAD
```

## Operator Behavior

Steve can now inspect runtime/source health and see whether a scheduled job is read-only, report-only, operational-write, external-write, or intentionally blocked. This prevents a job from drifting into unattended writes without a visible policy mismatch.

## Known Limits

- This does not rewrite the scheduler.
- This does not add new scheduled jobs.
- This does not build hub UI, Marketing Video Lab live wiring, Build Intel extraction, paid-source auth, Meeting Vault Phase B, or Drive permission mutation.
- External send jobs still require their existing production guards; this card exposes and gates their scheduled posture, not the full send policy.

## Next

Sprint review/rollover, then continue no-auth Foundation cleanup with `DB-SEED-001` or `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`.
