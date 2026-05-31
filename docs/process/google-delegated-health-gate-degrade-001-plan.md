# Google Delegated Health Gate Degrade

Card: `VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001` repair slice
Closeout: `google-delegated-health-gate-degrade-v1`

## Problem

`foundation:verify` can crash before producing health checks when `google:health` fails during delegated impersonation. The live failure is `invalid_grant: No valid verifier for issuer: crewbert-delegation@crewbert.iam.gserviceaccount.com`.

The same credentials still pass a service-account direct Sheets read, and the full Foundation Hub already marks Google Workspace as degraded/not safe to use through connector reliability. The gate should report that exact degraded state instead of making every unrelated Foundation ship impossible.

## Scope

- Capture `google:health` with `runHealthScriptSafe` so the root verifier receives output instead of crashing.
- Only after delegated `google:health` fails, run `google:health -- --user=service-account` as a bounded read-only fallback proof.
- Keep Owners lead-source governance and review-queue APIs alive when delegated impersonation fails by falling back to service-account direct read-only Sheets/Drive access and marking `sourceHealth.status=degraded`.
- Accept the Google health check only when all three conditions are true:
  - delegated health failed with the known auth/`invalid_grant` class,
  - service-account direct Sheets read passed,
  - the live Google Workspace connector is governed degraded/down and `safeToUse=false`.
- Keep normal delegated success green.
- Keep plain missing Google health, ungoverned fallback, broken Sheets, risky KPI, hard ClickUp failures, and missing backlog dogfood red.

## Out Of Scope

- No Google Admin repair, domain-wide delegation repair, OAuth repair, credential rotation, Gmail send/read repair, source sync, extraction, or external writes.
- No change to `npm run google:health` strict behavior as an operator command.
- No change to Owners governance write/apply behavior; this is read-route fail-soft only.
- No auto-promote, route apply, backlog creation from Director/Scoper/Portfolio recommendations, or Harlan/Telegram send.

## Proof

- `node --check lib/foundation-health-script-verifier.js lib/foundation-verifier-health-live-summary.js lib/owners-governance-routes.js scripts/process-verifier-health-script-module-check.mjs scripts/process-google-delegated-health-gate-degrade-check.mjs`
- `npm run process:google-delegated-health-gate-degrade-check -- --json`
- `npm run process:verifier-health-script-module-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/GOOGLE-DELEGATED-HEALTH-GATE-DEGRADE-001.json --closeoutKey=google-delegated-health-gate-degrade-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --closeoutKey=google-delegated-health-gate-degrade-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/GOOGLE-DELEGATED-HEALTH-GATE-DEGRADE-001.json --closeoutKey=google-delegated-health-gate-degrade-v1 --commitRef=HEAD`

## No-Write Boundary

The focused proof is static/read-only and performs no Google API calls. The only live Google reads happen through existing health commands during `foundation:verify`; there are no external writes.
