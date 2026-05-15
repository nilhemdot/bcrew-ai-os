# SHARED-FILE-INTEGRATION-GATE-001 Plan

## What

Extend the hub-work gate so hub chats can declare `requestedSharedFiles`, and unapproved shared-file requests fail with `integrationRequired: true`.

## Why

Marketing Video Lab needs `server.js` and `lib/security-access.js` route wiring, but hub chats should not edit those files while a Foundation sprint is running. Existing `lib/hub-work-check.js` already classifies changed files; this card reuses it and adds a specific shared-file request lane instead of letting hubs sneak shared edits into commits.

## Acceptance Criteria

- `validateHubWorkManifest` accepts `requestedSharedFiles` and `sharedFileRequests`.
- Unapproved shared-file requests fail with `integrationRequired: true`.
- Coordinated shared-file requests pass only when `coordination.mainSessionApproved` and a reason are present.
- The dogfood case simulates the Marketing Video Lab route request with `server.js` and `lib/security-access.js`.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/SHARED-FILE-INTEGRATION-GATE-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `SHARED-FILE-INTEGRATION-GATE-001`.
- Focused proof passes with `npm run process:foundation-ready-safe-hub-lane-check -- --card=SHARED-FILE-INTEGRATION-GATE-001 --json`.
- Full sprint closeout later runs `npm run process:foundation-ship -- --card=SHARED-FILE-INTEGRATION-GATE-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`.

## Details

Reuse existing code: `classifyHubWorkFile`, `validateHubWorkManifest`, and `buildHubWorkDogfoodProof`. Add one bounded manifest field and focused proof cases. Not next: performing the Marketing route integration, changing auth policy, adding package dependencies, or approving hub commits.

## Risks

- If requested shared files are treated as normal changed files, the gate could be bypassed. The result must expose `integrationRequiredFiles`.
- If coordinated requests do not require a reason, approvals become opaque. The proof checks for the reason.
- If the proof only checks strings, it can become theater. It must call the real validator with failing and passing manifests.
- Rollback/repair path: if unapproved shared-file requests pass, stop the Marketing route integration, keep the card out of Done, and revise the gate until it fails closed.

## Plan Critic Gate

Decision tree: static syntax checks plus focused proof, then full `process:foundation-ship` at closeout because this touches process proof code. Blast radius is bounded to existing code, existing scripts, existing docs, current sprint truth, and live backlog truth. The focused proof calls the actual function path in `validateHubWorkManifest`, simulates a Marketing route request, rejects substring-only proof, and proves both the failing and approved behavior. Operator value: Steve can ask hub chats for real route review requests without letting them edit shared files behind Foundation. Speed target: the proof is fast and thin, intended to run under 2 minutes by default.

## Tests

- `npm run process:foundation-ready-safe-hub-lane-check -- --card=SHARED-FILE-INTEGRATION-GATE-001 --json`
- `npm run process:hub-work-check -- --json`
- Sprint closeout full gate: `npm run process:foundation-ship -- --card=SHARED-FILE-INTEGRATION-GATE-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`
