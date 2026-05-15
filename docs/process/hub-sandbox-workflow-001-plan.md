# HUB-SANDBOX-WORKFLOW-001 Plan

## What

Create a safe sandbox workflow for hub chats using hub-owned files and fixtures while Foundation work is active.

## Why

Steve wants to work on hubs without waiting for every Foundation sprint to finish. Existing work already has `docs/process/hub-file-ownership-matrix.json` and `lib/hub-work-check.js`; this card reuses them and adds fixture ownership so hub chats can do useful UI work without touching shared Foundation state.

## Acceptance Criteria

- `docs/process/hub-sandbox-workflow.md` explains the plan-first, hub-owned, no-commit/no-push workflow.
- Hub-owned fixture paths are represented in the ownership matrix.
- A Marketing fixture exists at `fixtures/hubs/marketing/foundation-source-health.json`.
- Focused proof passes a hub-owned fixture manifest and rejects a manifest that touches `lib/foundation-db.js` without coordination.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/HUB-SANDBOX-WORKFLOW-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `HUB-SANDBOX-WORKFLOW-001`.
- Focused proof passes with `npm run process:foundation-ready-safe-hub-lane-check -- --card=HUB-SANDBOX-WORKFLOW-001 --json`.
- Full sprint closeout later runs `npm run process:foundation-ship -- --card=HUB-SANDBOX-WORKFLOW-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`.

## Details

Reuse existing code and docs: `lib/hub-work-check.js`, `docs/process/hub-work-protocol.md`, and `docs/process/hub-file-ownership-matrix.json`. This is a narrow v1 lane: fixture and hub-owned work only. Not next: committing hub work, pushing hub work, live Marketing provider calls, or Foundation route integration.

## Risks

- If fixture paths are too broad, hub chats could hide Foundation changes in fixture-owned space. Keep patterns hub-scoped.
- If the workflow is only documentation, it can drift. The proof must call `validateHubWorkManifest` directly.
- If we bless shared files here, we recreate the conflict problem. Shared files remain stop-and-coordinate.
- Rollback/repair path: if fixture ownership lets a Foundation file pass, leave the card in Scoping and tighten the matrix before any hub builder uses the lane.

## Plan Critic Gate

Decision tree: static syntax checks plus focused proof, then full `process:foundation-ship` at closeout because package/process proof surfaces are touched. Blast radius is bounded to existing docs, existing scripts, existing code, the current sprint, and live backlog truth. The focused proof calls the actual function path in `validateHubWorkManifest`; it rejects substring-only proof and proves real behavior by passing a hub-owned manifest and failing a Foundation-owned manifest. Operator value: Steve can keep strategy or hub conversations moving while Foundation stays protected for the team. Speed target: the proof is fast and thin, intended to run under 2 minutes by default.

## Tests

- `npm run process:foundation-ready-safe-hub-lane-check -- --card=HUB-SANDBOX-WORKFLOW-001 --json`
- `npm run process:hub-work-check -- --json`
- Sprint closeout full gate: `npm run process:foundation-ship -- --card=HUB-SANDBOX-WORKFLOW-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`
