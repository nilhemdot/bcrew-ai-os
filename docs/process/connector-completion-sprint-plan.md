# CONNECTOR-COMPLETION-SPRINT Plan

Card: `CONNECTOR-COMPLETION-SPRINT`
Sprint: `connector-completion-prep-2026-05-16`
Closeout key: `connector-completion-prep-v1`

## What

Inventory and prepare the remaining no-auth source/connector completion work so Foundation can move from "health is green" to "sources are actually ready to feed hubs."

This sprint is prep and staging only. It does not log into paid communities, mutate credentials, change OAuth scopes, write source systems, or start broad extraction. It should produce a clear connector/source gap matrix, no-auth cards that are ready to build, and explicit auth-pending cards for Steve decisions.

## Why

Foundation cleanup only matters if it gets us back to useful source flow. Steve should be able to see which sources are ready, which are idle, which need auth, and which can be advanced without waiting on him.

Operator value: the next build work becomes obvious and safe. No hidden connector counts, no surprise auth changes, and no vague "we need sources" pile.

## Acceptance Criteria

- Inventory source contracts, connector rows, scheduled jobs, credential registry rows, source-health rows, and existing backlog cards into one no-auth connector completion matrix.
- Classify every gap as one of: `ready_no_auth`, `auth_required`, `manual_decision`, `already_scheduled`, `deferred`, or `duplicate/stale`.
- Create or enrich backlog cards only for concrete no-auth next work and explicit auth-pending decisions; do not auto-start extraction.
- Keep paid/source-auth work parked: Skool, MyICOR, paid communities, provider write paths, and new external auth require Steve approval.
- Add focused proof that the sprint is inventory/proposal-only and that it does not mutate credentials, source systems, or external providers.

## Definition Of Done

- `CONNECTOR-COMPLETION-SPRINT` moves through Sprint Ready, Building Now, and Done This Sprint with Plan Critic proof and closeout.
- Plan Critic score is `9.8+` before build proceeds.
- A durable connector completion matrix exists in `docs/handoffs/` and points each gap to a source ID, connector key, current status, blocker, and next card/decision.
- Backlog updates are explicit, limited, and justified by the matrix.
- Full Foundation ship gate passes before push.

## Details

Reuse existing code and data:

- `lib/source-contracts.js`
- `lib/connector-credential-registry.js`
- `lib/connector-uptime-monitor.js`
- `lib/foundation-system-health.js`
- `lib/foundation-jobs.js`
- live backlog via `lib/foundation-db.js`

Expected output:

- `docs/handoffs/2026-05-16-connector-completion-prep-matrix.md`
- `scripts/process-connector-completion-prep-check.mjs`
- backlog/card enrichments for no-auth next work only
- explicit parked/auth-pending notes for paid or credential-gated sources

## Risks

- Risk: turning an inventory sprint into hidden source/auth mutation.
  - Guard: focused proof must reject credential writes, OAuth scope changes, provider calls, and source-system mutations.
- Risk: creating duplicate cards.
  - Guard: matrix must cross-reference existing backlog IDs before adding or enriching.
- Risk: treating paid-source auth work as no-auth work.
  - Guard: any Skool/MyICOR/paid community/provider-write lane is classified `auth_required` or `manual_decision`.

## Tests

```bash
npm run process:connector-completion-prep-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CONNECTOR-COMPLETION-SPRINT --planApprovalRef=docs/process/approvals/CONNECTOR-COMPLETION-SPRINT.json --closeoutKey=connector-completion-prep-v1 --commitRef=HEAD
```

## Repair Path

If the matrix cannot distinguish ready no-auth work from auth-required work, stop and tighten the source/connector status model first. Do not proceed by guessing.
