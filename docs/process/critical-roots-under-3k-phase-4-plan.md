# CRITICAL-ROOTS-UNDER-3K-PHASE-4 Plan

Card: `CRITICAL-ROOTS-UNDER-3K-PHASE-4`
Closeout key: `critical-roots-under-3k-phase-4-v1`

## What

Move the remaining Sales Hub route ownership, Owners governance route ownership, and shared FUB lead-source freshness helpers out of `server.js` into focused modules so `server.js` drops below 3,000 lines.

This is a root-file cleanup card. It does not redesign Sales Hub, Owners governance, FUB source routing, or Foundation Hub.

## Why

After Phase 3 and the closeout registry extract, `server.js` remained one of the last critical roots above 3,000 lines. The remaining inline Sales/Owners routes are cohesive enough to extract without behavior redesign.

Useful operator behavior: future builders can inspect Sales Hub and Owners governance route behavior in named modules instead of touching the shared server root. For Steve and the team, the real workflow is faster reviews, clearer file ownership, and less risk that a feature/preflight builder collides with the Foundation server root. This unlocks speed with quality before agent gates resume.

## Acceptance Criteria

- Live backlog card exists with rich context for `CRITICAL-ROOTS-UNDER-3K-PHASE-4`.
- Plan and approval exist.
- `server.js` is below 3,000 lines.
- `scripts/foundation-verify.mjs` remains below 5,000 lines.
- `public/foundation.js` and `lib/foundation-db.js` remain below 3,000 lines.
- Extracted modules stay below 1,500 lines each.
- `server.js` delegates Sales Hub and Owners governance routes through registrars.
- Old inline Sales Hub and Owners governance route handlers are absent from `server.js`.
- Shared FUB lead-source freshness helpers live in a focused helper module and are reused.
- Focused dogfood rejects missing modules, old inline route ownership, missing registrars, weak proof that could call Owners success-path live reads, and weak proof that could call Sales Hub success-path writes.
- Full Foundation verifier and ship gate pass before push.

## Definition Of Done

- `lib/fub-lead-source-governance.js` owns shared FUB/source freshness helpers.
- `lib/owners-governance-routes.js` owns Owners governance routes and queue helpers.
- `lib/sales-hub-routes.js` owns Sales Hub payload cache and mutation routes.
- `server.js` is route registrar wiring for those domains.
- `lib/critical-roots-under-3k-phase-4.js` and `scripts/process-critical-roots-under-3k-phase-4-check.mjs` validate the split.
- Closeout registry, verifier coverage, package script, handoff, backlog card, and Current Sprint metadata are updated.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- Existing code: `server.js` already delegates Foundation, FUB, runtime, auth, hub, write, Agent Feedback, and app-page routes through route registrars.
- Existing code: `lib/fub-source-routes.js` already consumes shared FUB source payload/freshness helpers as injected dependencies.
- Existing code: `lib/sales-listing-inventory.js`, `lib/sales-listing-assignments.js`, `lib/sales-listing-cases.js`, and `lib/sales-hub-case-metadata.js` already own Sales Hub domain logic.
- Existing docs: `docs/process/critical-roots-under-3k-phase-1-plan.md`, Phase 2, Phase 3, and `docs/process/file-size-engineering-standard-001-plan.md` define the size-risk discipline.
- Existing scripts: `process:foundation-ship`, `foundation:verify`, `backlog:hygiene`, `process:ship-check`, and `process:fanout-check` remain the ship path.
- Existing backlog truth: Phase 3 closeout says `server.js` remains above 3,000 lines and should continue only through a cohesive critical-root split.

Implementation details:

- Move shared FUB lead-source drift/freshness helpers into `lib/fub-lead-source-governance.js`.
- Move Owners governance routes and queue helpers into `lib/owners-governance-routes.js`.
- Move Sales Hub payload cache and mutation routes into `lib/sales-hub-routes.js`.
- Keep route registration in `server.js` and preserve the existing dependency boundaries.
- The focused proof does not call Owners success-path live reads or Sales Hub success-path writes. It proves behavior through source ownership, line budgets, and dogfood fixtures.

## Risks

- Risk: route behavior changes while moving code. Mitigation: move cohesive route blocks without changing route bodies, run `node --check`, focused dogfood, full `foundation:verify`, and full `process:foundation-ship` with runtime restart.
- Risk: focused proof accidentally performs live reads/writes. Mitigation: proof checks the boundary text and rejects weak proof that does not explicitly avoid Owners success-path live reads and Sales Hub success-path writes.
- Risk: server root gets smaller by hiding another oversized module. Mitigation: extracted modules must stay below 1,500 lines.
- Risk: verifier/source coverage misses the new card. Mitigation: closeout registry, verifier coverage, package script, and Foundation verifier active progression are updated.

Repair path / rollback: if proof fails or behavior regresses, stop before push, keep the card executing, inspect the failing route/module boundary, and repair the module split. If the extracted route behavior cannot be repaired cleanly, reopen the split plan and revert only this card's route extraction before any push. Do not bypass the ship gate or mark the card done.

## Tests

```bash
node --check server.js lib/fub-lead-source-governance.js lib/owners-governance-routes.js lib/sales-hub-routes.js lib/critical-roots-under-3k-phase-4.js scripts/process-critical-roots-under-3k-phase-4-check.mjs scripts/foundation-verify.mjs
npm run process:critical-roots-under-3k-phase-4-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json --closeoutKey=critical-roots-under-3k-phase-4-v1 --commitRef=HEAD
```

Gate decision tree:

- Static gate: `node --check` for every changed JS module and root.
- Focused gate: `npm run process:critical-roots-under-3k-phase-4-check -- --close-card --json`.
- Full gate: `foundation:verify` and `process:foundation-ship` because this touches `server.js`, package scripts, closeout registry, verifier coverage, and live dashboard served-code proof.

The focused proof is intentionally source/synthetic only and should stay under 2 minutes. Full verification runs once at closeout and again through the ship gate.

## Not Next

- Do not redesign Sales Hub, Owners governance, FUB source routing, or Foundation Hub.
- Do not call Owners success-path live reads from the focused proof.
- Do not call Sales Hub success-path writes from the focused proof.
- Do not run live extraction, paid/auth-required jobs, external sends, Drive permission mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.
- Do not launch parallel builders or hidden subagents.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
