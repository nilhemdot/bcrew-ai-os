# FOUNDATION-USERS-001 Closeout

Generated at: 2026-05-20T11:48:05.948Z

## What Changed

- Added owner-only Foundation user access API/UI.
- DB-backed users can now be added/updated, disabled, role/tiered, and given optional password fallback without editing `.env`.
- Runtime auth now refreshes active DB users into the allow-list while preserving existing default/env auth users.
- Access changes write `foundation_user_access_updated` change events.

## Proof

- Plan Critic: undefined / undefined
- User count: 14
- Active humans: 11
- Google-ready users: 11
- Password fallback users: 6
- Audit events: 0
- Synthetic mutation proof: foundation-users-001-proof@bensoncrew.local disabled=true

## Commands

- `node --check lib/foundation-user-admin.js lib/app-auth.js lib/auth-routes.js lib/foundation-source-routes.js public/foundation-users-renderers.js scripts/process-foundation-users-check.mjs`
- `npm run process:foundation-users-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-USERS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-USERS-001.json --closeoutKey=foundation-users-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-USERS-001 --closeoutKey=foundation-users-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-USERS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-USERS-001.json --closeoutKey=foundation-users-v1 --commitRef=HEAD`

## Known Limits

- This does not send emails, rotate credentials, mutate external systems, change Drive permissions, or expose public routes.
- This does not redesign SECURITY-002 tier/redaction policy.
- Password hashes are stored only as metadata and are never returned to the UI/API.

## Review Next

Continue `DECISION-007` only after its own plan and proof pass.
