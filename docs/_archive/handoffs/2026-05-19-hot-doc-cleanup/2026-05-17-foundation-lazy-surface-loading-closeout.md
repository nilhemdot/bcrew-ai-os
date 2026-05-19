# Foundation Lazy Surface Loading Closeout

Card: `FOUNDATION-LAZY-SURFACE-LOADING-001`
Closeout key: `foundation-lazy-surface-loading-v1`
Branch: `foundation/system-health-red-to-green-001`

## What Shipped
- Added read-only `GET /api/foundation/backlog` route ownership.
- Moved Backlog page loading to `fetchFoundationBacklog()` instead of the default Hub.
- Moved Recent Work loading to `fetchFoundationBuildLog()` plus `fetchFoundationCurrentSprint()` instead of the default Hub.
- Kept Source Registry on `/api/source-of-truth`.
- Kept System Health/Diagnostics behind `/api/foundation-hub?view=full`.
- Added lazy-loading focused proof, verifier coverage, plan/approval artifacts, and closeout registry record.

## Proof
- Focused proof: `npm run process:foundation-lazy-surface-loading-check -- --json`
- Close-card focused proof passed with `FOUNDATION-LAZY-SURFACE-LOADING-001:done`.
- Default `/api/foundation-hub`: 627,455 bytes, under the V2 summary budget.
- Backlog list route `/api/foundation/backlog`: 963,111 bytes / 390ms, preserving 650 live backlog rows under the explicit 1.1 MB / 1.5s dedicated route budget.
- Current Sprint route: 22,268 bytes.
- Full diagnostics route: 4,128,878 bytes, under the separate diagnostics budget.
- Backlog hygiene: `npm run backlog:hygiene -- --json`
- Foundation verify: `npm run foundation:verify`
- Ship gate: `npm run process:foundation-ship -- --card=FOUNDATION-LAZY-SURFACE-LOADING-001 --planApprovalRef=docs/process/approvals/FOUNDATION-LAZY-SURFACE-LOADING-001.json --closeoutKey=foundation-lazy-surface-loading-v1 --commitRef=HEAD`

## Boundaries Held
- No extractor runtime work.
- No connector, OAuth, or auth-required extraction work.
- No Harlan, Fal, voice, Canva, OpenHuman, or broad visual UI redesign.
- No `MEETING-VAULT-ACL-001` Phase B or Meeting Vault permission mutation.
- No Google Drive permission mutation.
- No live Agent Feedback auto-send job.

## Next
Recommended next sprint: `EXTRACTION-RUNTIME-READINESS-001`, unless the final ship gate exposes a red engineering-fitness blocker.
