# FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 Plan

## What

Build a narrow read-only detail endpoint for a single Foundation backlog card: `GET /api/foundation/backlog/:cardId`.

The default `/api/foundation-hub` route now carries compact backlog rows. When an operator surface or hub needs the full text for one card, it should request one card by ID instead of falling back to `/api/foundation-hub?view=full`.

## Why

The previous sprint made the default Foundation Hub payload small enough to stay fast. Without a single-card detail path, the next UI or hub that needs `whyItMatters`, full `nextAction`, or closeout notes will be tempted to pull full diagnostics again. This card gives hubs a clean read-only pattern and keeps the payload contract from drifting backward.

Useful operator behavior: Steve and the team get a real workflow for reading one full backlog card quickly. This unlocks a useful thing for hub builders: product behavior where a Sales, Ops, or Marketing hub can request the one card it needs without slowing the whole Foundation command surface, improving speed and quality for review work.

## Acceptance Criteria

- `FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001` has a dedicated module for card-id validation, detail payload shape, validation, and dogfood proof.
- `GET /api/foundation/backlog/:cardId` is admin-gated and reads by ID using existing backlog read helpers.
- The endpoint returns a full single-card payload for a real card and `404` for a missing valid card.
- The endpoint rejects malformed card IDs with `400`.
- The focused proof validates dogfood behavior, live route behavior, Plan Critic, Current Sprint state, package script registration, source wiring, and default hub payload budget.
- The full Foundation verifier covers the endpoint without relying on substring-only proof.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001`.
- Focused proof passes with `npm run process:foundation-backlog-detail-endpoint-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- Full ship gate passes with `npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json --closeoutKey=foundation-backlog-detail-endpoint-v1 --commitRef=HEAD`.

## Details

Existing code to reuse:

- Existing code: `getBacklogItemsByIds`, `requireAdminToken`, `sendApiError`, Foundation Hub payload metadata, build log closeout records, Plan Critic, and Current Sprint store.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the previous `FOUNDATION-HUB-BACKLOG-CONTRACT-001` plan/closeout, and this plan.
- Existing scripts: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the focused `process:*check` proof pattern.
- Live backlog and Current Sprint truth: the proof reads the DB card, active sprint item, and durable Plan Critic row.

Implementation shape:

- Add `lib/foundation-backlog-detail.js` for payload building and validation.
- Add thin server route wiring only; do not add business logic or new responsibility to the `server.js` monolith.
- Add `scripts/process-foundation-backlog-detail-endpoint-check.mjs` as the focused proof.
- Add verifier coverage that calls the module dogfood proof and checks the live endpoint behavior through the focused proof.

Split plan for oversized files: behavior lives in the new module `lib/foundation-backlog-detail.js`; `server.js` gets a thin wrapper route only, `scripts/foundation-verify.mjs` gets a narrow closeout coverage check only, and `lib/foundation-build-closeout-records.js` gets one data record only. No new subsystem is added to those monoliths.

Gate decision: this card touches `server.js`, the canonical verifier, package scripts, and build closeout records, so it uses a focused proof first and the full Foundation ship gate for closeout. Static-only proof is not enough. The focused proof is `npm run process:foundation-backlog-detail-endpoint-check -- --json`; the full gate is `npm run process:foundation-ship ...`.

Behavior proof rule: no substring-only proof. The proof must use the actual function path and live API route round-trip for a real card, a missing valid card, and a malformed card ID. Substring marker checks may support source wiring only; they cannot prove done.

Performance budget: the single-card route should respond under `500ms` locally for a normal card and return under `50KB`. The default `/api/foundation-hub` route must remain under the existing compact route budget.

## Risks

- Risk: adding more code to `server.js`, which is already over the preferred file-size threshold. Mitigation: keep route wiring thin and put contract behavior in `lib/foundation-backlog-detail.js`.
- Risk: exposing too much backlog text to the wrong user. Mitigation: route uses existing `requireAdminToken` boundary, matching other Foundation command APIs.
- Risk: detail endpoint becomes a hidden full snapshot path. Mitigation: route returns exactly one card, not arrays, diagnostics, jobs, or source snapshots.
- Risk: proof fails or the endpoint shape regresses. Repair path is to reopen the card, remove the route wiring if needed, keep the compact default hub route intact, and route any rich-card UI back to `/api/foundation-hub?view=full` until a corrected detail endpoint passes.

## Tests

```text
node --check lib/foundation-backlog-detail.js scripts/process-foundation-backlog-detail-endpoint-check.mjs server.js scripts/foundation-verify.mjs
npm run process:foundation-backlog-detail-endpoint-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json --closeoutKey=foundation-backlog-detail-endpoint-v1 --commitRef=HEAD
```

## Not Next

- No Marketing Video Lab route wiring.
- No hub feature UI.
- No paid-source auth or extraction.
- No broad Foundation frontend rewrite.
- No full diagnostics redesign.
