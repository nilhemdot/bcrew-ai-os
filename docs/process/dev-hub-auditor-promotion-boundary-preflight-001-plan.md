# DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub Auditor Promotion Boundary Preflight that turns report-only auditor output into one exact approval-required internal-write-later contract without running audits, writing reports, creating backlog cards, mutating routes, or promoting findings.

## Why

Auditor Flow already shows that audit output lands as reports/checks and does not automatically become work. Steve asked Codex to keep building overnight while parking approval-bound work. This card makes the report-to-work boundary concrete so the next mutation is an exact approval decision, not a vague "promote audit findings" idea.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `auditorPromotionBoundaryPreflight`.
- `/dev` renders an Auditor Promotion Boundary panel with the proposed gate ID, mutation posture, source repair ID, report-only lane count, allowed-later writes, forbidden writes, and zero-write counters.
- The preflight reuses existing Dev Hub truth: `auditorFlowReadback` and `nextRepairQueue`.
- The only proposed gate is `auditor-report-to-work-approval-gate-v1`, targeting `auditor-report-to-work-boundary` and existing router card `AUDIT-FINDING-TO-BACKLOG-ROUTER-001`.
- Every proposed contract stays `status=approval_required`, `approvalRequired=true`, and `mutationPosture=approval_required_internal_write_later`.
- The readback creates zero audit runs, report writes, finding promotions, backlog records, route mutations/applies, Scoper records, Portfolio records, Current Sprint mutations, approval records, model calls, extraction runs, Harlan sends, or external writes.
- The proof fails if any finding is promoted, any backlog/route/destination/control record is written, any audit/report runtime starts, or any contract is no longer approval-required.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-auditor-promotion-boundary-preflight.js` as a compact projection over Auditor Flow and Next Repair Queue.
- Wire `buildDevTeamHubV0Snapshot` to build `auditorPromotionBoundaryPreflight` after `nextRepairQueue` is available.
- Add `public/dev-auditor-promotion-boundary-preflight.js` and a `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-auditor-promotion-boundary-preflight-check.mjs` and `process:dev-hub-auditor-promotion-boundary-preflight-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Promotion drift: scheduled audits must not become quiet backlog writers.
- Route drift: audit promotion must not approve/apply/reject/snooze/reroute action routes.
- Scope drift: this card prepares the boundary only; it does not implement findings or create work.
- False authority risk: the preflight names exact approval text but is not the approval to write.
- Payload risk: keep promotion contracts bounded to one row and input lanes bounded to five rows.

## Tests

```bash
node --check lib/dev-hub-auditor-promotion-boundary-preflight.js scripts/process-dev-hub-auditor-promotion-boundary-preflight-check.mjs public/dev-auditor-promotion-boundary-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-auditor-promotion-boundary-preflight-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-AUDITOR-PROMOTION-BOUNDARY-PREFLIGHT-001.json --closeoutKey=dev-hub-auditor-promotion-boundary-preflight-v1 --commitRef=HEAD
```
