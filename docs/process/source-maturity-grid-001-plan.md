# SOURCE-MATURITY-GRID-001 Source Maturity Grid Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `SOURCE-MATURITY-GRID-001`

## What

Build the first card in the Foundation Source Once-Over sprint: a source maturity grid that renders every source contract across seven stages.

Stages:

- connected
- trusted
- monitored
- extracted
- atomized
- synthesized
- routed

V1 reuses existing source contracts, source lifecycle, extraction control, shared-comms coverage, intelligence atoms, synthesis facts, synthesis items, and Action Router records. It does not ingest new source data.

## Why

Foundation READY currently means owner-only Strategy re-entry is safe. It does not prove Foundation is fully built.

Steve needs one live view that answers: which sources are connected, which are trusted, which are actually extracting, which are becoming atoms, which are synthesized, which are routed, and which gaps are still real.

This converts the next Foundation sprint from chat/audit judgment into source-backed operating truth.

Useful operator behavior: Steve can open Foundation, scan the source grid, and know the next Foundation card without asking another auditor to translate source status.

## Acceptance Criteria

- `SOURCE-MATURITY-GRID-001` exists in live backlog/repo seed and is the first card in the Foundation Source Once-Over sprint.
- `/api/foundation/source-maturity-grid` returns all source contracts with exactly seven stage objects per row.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same source maturity grid payload.
- Foundation UI renders the grid under Source Lifecycle with stage marks, first gap, and top gap details.
- The grid is behavior-proven through `buildSourceMaturityGridSnapshot()` using real Foundation snapshot data and a synthetic proof that rejects incomplete rows.
- `npm run process:source-maturity-grid-check -- --json=true` validates the plan approval, Plan Critic result, API/UI/library paths, real snapshot shape, synthetic proof, backlog closeout, and sprint advancement.
- Plan Critic must return pass/revise with a passing score of at least 9.8 for this card before the closeout is trusted.
- After closeout, Current Sprint advances to `SOURCE-EXTRACTION-COVERAGE-001` as the active blocker.

## Definition Of Done

Done means `source-maturity-grid-v1` is closed with:

- valid approval file at `docs/process/approvals/SOURCE-MATURITY-GRID-001.json`;
- source maturity library at `lib/source-maturity-grid.js`;
- API wiring in `server.js`;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-source-maturity-grid-check.mjs`;
- package script `process:source-maturity-grid-check`;
- Current Sprint seed for the full Foundation Source Once-Over sprint;
- backlog card moved to done with closeout proof;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `lib/source-contracts.js`
- `lib/source-lifecycle.js`
- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `scripts/process-source-lifecycle-completion-check.mjs`
- `scripts/process-extract-run-hardening-check.mjs`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/source-maturity-grid.js` as the single stage-definition/snapshot builder.
- Add operational source metrics in `lib/foundation-db.js` from atoms, synthesis facts, synthesized items, and action routes.
- Attach the grid to Foundation source lifecycle and hub payloads.
- Render the grid in the existing Foundation Source Lifecycle section, not a new hub.
- Add a Source Once-Over sprint seed with ten cards and explicit not-next boundaries.
- Behavior proof calls the actual function path (`buildSourceMaturityGridSnapshot`) and the API route (`/api/foundation/source-maturity-grid`) instead of trusting a status-note marker.
- The focused proof checks a real round-trip through the Foundation snapshot shape plus a synthetic complete/deferred proof; a weak substring-only plan would be rejected.

Not Next:

- Do not build Reply Parser or Watching Items.
- Do not expand Strategy Hub.
- Do not build Telegram bots, Directors, Master Director, scouts, or marketing production operators.
- Do not mutate Drive permissions or send access-request emails.
- Do not fix every source gap from this card.
- Do not claim Foundation fully built just because the grid exists.

## Risks

- The grid can become another dashboard if it does not advance the next card. Repair path: proof must verify Current Sprint active blocker advances to `SOURCE-EXTRACTION-COVERAGE-001`.
- Stage logic can become misleading if it relies on wording only. Repair path: proof must call `buildSourceMaturityGridSnapshot()` and inspect row/stage behavior, not accept substring-only evidence.
- This touches server, DB, UI, verifier, and package scripts, so the gate decision tree classifies it as a full Foundation ship. Docs-only/static is not enough. Use focused proof first for speed, then full ship because blast radius includes server/database/UI/canonical verifier paths.
- Some source rows will be red/yellow. That is expected. This card exposes gaps; later Source Once-Over cards decide/fix them.

## Tests

Run:

```bash
npm run process:source-maturity-grid-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-MATURITY-GRID-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-GRID-001.json --closeoutKey=source-maturity-grid-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real source maturity snapshot function;
- call the real Foundation snapshot path where available;
- prove every row has all seven stages;
- prove synthetic complete/deferred rows classify correctly;
- reject substring-only verifier theatre by failing if the function/API/UI/script paths are missing.

Speed bound:

- The default dev loop is the focused proof command first. It should fail quickly on plan/API/UI/sprint fanout before paying the full ship-gate cost. Full verification still runs before commit/push because this is a full-risk Foundation substrate change.
- The focused proof is the fast gate; the full gate is reserved for ship proof because the blast radius is high.
