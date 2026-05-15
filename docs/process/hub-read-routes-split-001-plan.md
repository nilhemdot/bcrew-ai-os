# HUB-READ-ROUTES-SPLIT-001 Plan

## Card

`HUB-READ-ROUTES-SPLIT-001` - Split hub read routes out of `server.js`.

## Goal

Extract only the read-only hub route cluster from `server.js` into `lib/hub-read-routes.js`:

- `GET /api/foundation-hub`
- `GET /api/foundation/current-sprint`
- `GET /api/ops-hub`
- `GET /api/sales-hub`

Behavior must stay unchanged. The split is a server monolith cleanup slice, not hub feature work.

## Existing Work Check

- Existing code: `server.js` currently owns the four read routes inline, while previous route split modules already established the registrar pattern in `lib/fub-source-routes.js`, `lib/foundation-runtime-read-routes.js`, `lib/app-page-routes.js`, and `lib/auth-routes.js`.
- Existing docs: current rebuild docs now name `foundation-server-monolith-closeout-2026-05-15` and the server monolith route-split order.
- Existing scripts: previous route split proofs use live route probes, read-only proof posture, line-count reduction, and verifier coverage.
- Existing policy: AGENTS.md requires dogfood proof, no Drive permission mutation, no hub feature work during Foundation cleanup, and a split plan for files over 5,000 lines.

Reuse the established registrar/check/verifier/closeout pattern. Do not invent a new server framework or rewrite hub payload builders.

## Implementation

1. Add `lib/hub-read-routes.js`.
2. Move the four read route handlers into `registerHubReadRoutes(app, deps)`.
3. Keep `server.js` as a thin registrar call with dependency wiring.
4. Leave every `POST /api/sales-hub/*` route in `server.js` for a separate write-route card.
5. Add `scripts/process-hub-read-routes-split-check.mjs`.
6. Add package script `process:hub-read-routes-split-check`.
7. Add verifier coverage and Recent Builds closeout under `hub-read-routes-split-v1`.
8. Update current plan/state and live backlog/current sprint state.

## Acceptance

- `server.js` no longer owns the four moved `GET` route strings.
- `lib/hub-read-routes.js` owns the four moved read route strings.
- Sales write route strings remain in `server.js`.
- Live route probes prove:
  - `/api/foundation-hub` returns a compact Foundation payload under the established budget.
  - `/api/foundation/current-sprint` returns healthy Current Sprint state.
  - `/api/ops-hub` returns Ops payload shape and source outage metadata.
  - `/api/sales-hub` returns Sales payload shape without forcing a write.
- Dogfood proof rejects missing module, old inline read routes in `server.js`, moved Sales write routes, missing registrar, and weak substring-only proof.
- `server.js` line count decreases from the pre-card baseline of about `6,592`.
- `foundation:verify` passes and carries ID-named verifier coverage for this card.

## Gate Decision

This touches `server.js`, a file over 5,000 lines, and live hub read APIs. The gate is full:

```bash
node --check lib/hub-read-routes.js scripts/process-hub-read-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:hub-read-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=HUB-READ-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/HUB-READ-ROUTES-SPLIT-001.json --closeoutKey=hub-read-routes-split-v1 --commitRef=HEAD
```

## Not Next

- No hub UI changes.
- No Sales write route moves.
- No Marketing Video Lab live route wiring.
- No new source extraction.
- No paid-source auth.
- No MEETING-VAULT-ACL-001 Phase B or Drive permissions work.
- No payload expansion.
- No broad server rewrite.
