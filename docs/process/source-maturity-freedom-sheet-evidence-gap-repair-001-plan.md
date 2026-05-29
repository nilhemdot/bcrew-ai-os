# SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001 Plan

## What

Build a bounded V1 source maturity evidence repair for two Freedom Sheet source rows:

- `SRC-FREEDOM-TEAM-001`
- `SRC-FREEDOM-COMMUNITY-REV-001`

The card adds one governed `intelligence_synthesis_facts` source fact for each source from existing repo truth only:

- `docs/source-notes/freedom-sheet.md`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`
- `lib/source-contracts.js`

Existing code/docs/scripts/backlog truth reused:

- existing code: `lib/source-maturity-grid.js`, `lib/source-maturity-evidence-gap-repair.js`, `lib/intelligence-synthesis-facts.js`, and `lib/source-contracts.js`
- existing scripts: `scripts/process-source-maturity-evidence-gap-repair-check.mjs`, `scripts/process-source-maturity-freedom-team-monitoring-gap-repair-check.mjs`, `scripts/process-source-maturity-freedom-community-rev-monitoring-gap-repair-check.mjs`, and `scripts/foundation-verify.mjs`
- existing docs: Freedom source note, source registry, current state, and the source maturity gap follow-up triage
- live backlog/current sprint: this card creates/reuses the live backlog row and moves it through Current Sprint before writing facts

## Why

Live source maturity shows both Freedom Sheet rows as signed-off, monitored, and blocked at `extracted` because the grid sees no extracted artifact or source fact signal. Existing source evidence is already present in repo truth, so keeping these rows stuck at `extracted` is noise.

Useful operator behavior: Steve and the team get a cleaner source maturity read. These two sources move to the next real gap, which is atom-flow from source facts, without pretending Google Sheets automation or extraction exists.

This unlocks better source queue quality and faster overnight building because the system stops spending time on false extraction blockers.

## Acceptance Criteria

- Live backlog card `SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001` exists.
- Current Sprint item has plan ref, approval ref, closeout key, proof commands, definition of done, existing-work check, and not-next boundaries before `building_now`.
- Focused proof creates exactly one active source fact for `SRC-FREEDOM-TEAM-001`.
- Focused proof creates exactly one active source fact for `SRC-FREEDOM-COMMUNITY-REV-001`.
- The real source maturity grid moves both target rows off `nextGap=extracted`.
- Source facts carry metadata proving no live extraction, no Sheets read/write, no external write, and no Drive mutation.
- The proof rejects substring-only theater: it must reject substring-only proof and must call the real source fact DB write path plus the real source maturity grid.
- The proof must not create atoms, routes, external writes, extraction targets, model calls, or provider calls.
- Package script, closeout registry, done-card verifier coverage, plan, approval, and closeout exist.

## Definition Of Done

- `node --check lib/source-maturity-freedom-sheet-evidence-gap-repair.js scripts/process-source-maturity-freedom-sheet-evidence-gap-repair-check.mjs` passes.
- `npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --apply --stage=scoping --json` passes.
- `npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --apply --stage=sprint_ready --json` passes.
- `npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --apply --stage=building_now --json` passes.
- `npm run process:source-maturity-freedom-sheet-evidence-gap-repair-check -- --close-card --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- Full `process:foundation-ship` passes before push.
- The closeout says this only repairs extracted-stage source fact evidence and does not claim atomized, synthesized, routed, extraction, automation, or apply completion.

## Details

Add:

- `lib/source-maturity-freedom-sheet-evidence-gap-repair.js`
- `scripts/process-source-maturity-freedom-sheet-evidence-gap-repair-check.mjs`
- `docs/process/source-maturity-freedom-sheet-evidence-gap-repair-001-plan.md`
- `docs/process/approvals/SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001.json`
- `docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-freedom-sheet-evidence-gap-repair-closeout.md`

Update:

- `package.json`
- `lib/foundation-build-closeout-source-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`

Gate decision tree:

- Static gate: `node --check` covers the new module and focused proof script.
- Focused gate: `process:source-maturity-freedom-sheet-evidence-gap-repair-check` is used while iterating.
- Full gate: `process:foundation-ship` is required before push because the blast radius touches Foundation source behavior, internal DB source fact rows, Current Sprint, closeout registry, and verifier coverage.
- Do not rerun the full gate repeatedly while debugging; focused proof owns the iteration loop.

Speed bound: the focused proof should stay under 2 minutes because it targets two source IDs, two source facts, one Current Sprint overlay, and one source maturity grid reload. It is proportional and not another heavy all-system loop during iteration.

## Risks

- Risk: the facts are too broad and imply rebuilt Sheet extraction. Repair path: fail closed unless facts cite current-reality source-contract evidence and carry no live extraction / no Sheets read-write metadata.
- Risk: proof only checks markdown strings. Repair path: reject substring-only proof and require the real DB write path plus the real source maturity grid.
- Risk: the card invents atom-flow or routes. Repair path: focused proof fails if atom or route signals appear for these two sources.
- Risk: source evidence is not actually signed off. Repair path: fail closed on missing Freedom source note, source registry row, source contract status, or Current State context.

## Tests

- Synthetic dogfood: missing Freedom source-note evidence fails.
- Synthetic dogfood: valid Freedom current-reality evidence builds two source facts.
- Behavior proof: `upsertSynthesisFactsBundle` persists the facts.
- Behavior proof: source maturity grid shows both target rows move off `nextGap=extracted`.
- Guard proof: no atom, route, model/provider call, extraction target, Sheets read/write, external write, or Drive mutation is introduced.
- Process proof: Plan Critic, approval integrity, live backlog, Current Sprint, closeout registry, done-card coverage, backlog hygiene, and full `process:foundation-ship` pass.
