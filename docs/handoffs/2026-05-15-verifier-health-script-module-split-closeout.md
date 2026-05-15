# Verifier Health Script Module Split Closeout

Date: 2026-05-15
Card: `VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001`
Closeout key: `verifier-health-script-module-split-v1`

## What Changed

Extracted the Google/FUB/KPI/backlog/ClickUp/Sheets health-script verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-health-script-verifier.js`.

Also updated the runtime reliability verifier to accept the ClickUp structured-summary token from the new health-script module instead of requiring it to remain in the root verifier file.

## What It Does

`scripts/foundation-verify.mjs` still runs the real health scripts. The new module owns the PASS/FAIL interpretation, including KPI summary parsing, backlog synthetic stale-card proof parsing, and the guarded ClickUp degraded-provider acceptance rule.

Final root verifier line count dropped from 15,517 to 15,484 while preserving the six canonical health-script PASS/FAIL rows.

## Why It Matters

The verifier is still the trust layer. This removes one coherent tail proof domain from a 15K-line monolith so source-health failures are easier to inspect and harder to weaken accidentally.

## Where It Lives

- `lib/foundation-health-script-verifier.js`
- `scripts/process-verifier-health-script-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-health-script-module-check`
- `docs/process/verifier-health-script-module-split-001-plan.md`
- `docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json`

## Proof Commands

- `node --check lib/foundation-health-script-verifier.js scripts/process-verifier-health-script-module-check.mjs scripts/foundation-verify.mjs`
- `npm run process:verifier-health-script-module-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json --closeoutKey=verifier-health-script-module-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --closeoutKey=verifier-health-script-module-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001.json --closeoutKey=verifier-health-script-module-split-v1 --commitRef=HEAD`

## Dogfood

The focused proof calls the exported evaluator and proves:

- healthy synthetic outputs pass;
- missing Google delegated access fails;
- risky KPI health fails;
- missing backlog stale-card synthetic proof fails;
- ClickUp vendor outage passes only with degraded source/connector health;
- ClickUp hard failure without degraded source health fails;
- broken Sheets verification fails.

## Known Limits

- Does not rewrite the whole verifier.
- Does not change Google, FUB, KPI, ClickUp, Sheets, or backlog health script behavior.
- Does not split `lib/foundation-db.js`.
- Does not wire Marketing Video Lab live routes.
- Does not create, mutate, upload, or export Canva assets.
- Does not build hub feature UI, Build Intel extraction, paid-source auth, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue no-auth Foundation cleanup with another bounded verifier module split, a Foundation DB store boundary, or the highest remaining nightly-audit P0 after sprint review.
