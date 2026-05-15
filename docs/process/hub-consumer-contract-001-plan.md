# HUB-CONSUMER-CONTRACT-001 Plan

## What

Define `foundation-hub-consumer-contract.v1`, a read-only Foundation contract that Sales, Ops, Marketing, and Strategy hubs can consume without importing Foundation internals.

## Why

Steve needs hubs to build in parallel without corrupting Foundation. Existing work already has connector uptime/source health and a hub work gate; this card reuses those pieces and gives hubs a bounded contract instead of direct access to `lib/foundation-db.js` or verifier/check paths.

## Acceptance Criteria

- `lib/hub-consumer-contract.js` builds read-only contracts for sales, ops, marketing, and strategy.
- Each contract includes source-health rows derived from existing connector uptime data or explicit fixtures.
- Contract validation fails if the payload is writable, missing source-health rows, or exposes unsanitized provider error text.
- `docs/process/hub-consumer-contract.md` documents allowed access, forbidden imports, and shared-file stop lines.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/HUB-CONSUMER-CONTRACT-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `HUB-CONSUMER-CONTRACT-001`.
- Focused proof passes with `npm run process:foundation-ready-safe-hub-lane-check -- --card=HUB-CONSUMER-CONTRACT-001 --json`.
- Full sprint closeout later runs `npm run process:foundation-ship -- --card=HUB-CONSUMER-CONTRACT-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`.

## Details

Reuse existing code: `lib/connector-uptime-monitor.js`, `lib/hub-work-check.js`, `docs/process/hub-file-ownership-matrix.json`, and existing current sprint/backlog truth. Add only the narrow contract module and the focused proof script needed for this v1. The proof is behavior-based: it builds actual contract objects and validates their read-only contract shape.

## Risks

- If hubs import Foundation internals, they can bypass the contract. Not next: hub UI integration and shared route wiring.
- If source-health rows contain raw provider errors, the contract could leak sensitive details. The validation checks sanitized error content.
- If the focused proof is slow, builders will skip it. The proof must stay bounded and avoid full live extraction or paid provider calls.
- Rollback/repair path: if the focused proof fails, keep the card out of Done, do not expose the contract to hub builders, and revise the contract module until the actual function path passes.

## Plan Critic Gate

Decision tree: static syntax checks plus focused proof, then full `process:foundation-ship` at closeout because this touches package/process proof surfaces. Blast radius is bounded to a new module, docs, and proof script. The focused proof calls the actual function path that builds contracts, validates read-only behavior, and rejects invalid payloads; no substring-only proof is accepted. Operator value: Steve and the team can build real hub workflows with source health visible while Foundation remains protected. Speed target: the focused proof is fast and thin, intended to run under 2 minutes by default.

## Tests

- `npm run process:foundation-ready-safe-hub-lane-check -- --card=HUB-CONSUMER-CONTRACT-001 --json`
- `node --check lib/hub-consumer-contract.js`
- Sprint closeout full gate: `npm run process:foundation-ship -- --card=HUB-CONSUMER-CONTRACT-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`
