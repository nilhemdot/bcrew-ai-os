# SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001 Plan

## Goal

Repair the smallest safe source maturity extracted-stage evidence gap by attaching existing source-backed source fact evidence for `SRC-OWNERS-LISTS-001` without running extraction, reading/writing Google Sheets, mutating Drive permissions, calling providers, or creating atoms.

## What

Build a bounded evidence repair for `SRC-OWNERS-LISTS-001`. The card creates one governed `intelligence_synthesis_facts` source fact from existing repo truth:

- `lib/source-contracts.js` current-reality source contract
- `docs/source-notes/bhag-builder-lists.md`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`

The fact proves the Owners Lists source boundary exists and is current-reality signed off. It does not claim atomized, synthesized, routed, or extracted live content beyond the documented source boundary.

## Why

The source maturity grid shows `SRC-OWNERS-LISTS-001` blocked at `extracted` because no extracted artifacts or source facts are visible. Repo truth already has a signed-off current-reality source boundary for this source. Foundation should use that existing source-backed fact instead of staying red, but it must not fake atom flow or start live extraction.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` scoped `SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001` for extracted-stage maturity rows.
- `SRC-OWNERS-LISTS-001` already exists in `lib/source-contracts.js` as `Signed Off For Current Reality`.
- `docs/source-notes/bhag-builder-lists.md` documents the upstream workbook, `Lists` tab, `IMPORTRANGE` mirror boundary, and write-safety rule.
- `docs/source-registry.md` exposes the source row and status.
- `docs/rebuild/current-state.md` explains that Owners Dashboard `Lists` is a mirror and governed list truth belongs to `SRC-OWNERS-LISTS-001`.
- `lib/intelligence-synthesis-facts.js` already owns governed source fact persistence.
- `lib/source-maturity-grid.js` already treats active source facts as extracted-stage evidence.

## Scope

- Add `lib/source-maturity-evidence-gap-repair.js` as the focused behavior module.
- Add `scripts/process-source-maturity-evidence-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Persist exactly one stable active `source_contract` fact for `SRC-OWNERS-LISTS-001` when the proof runs with explicit write flags.
- Re-read the live source maturity grid and prove `SRC-OWNERS-LISTS-001` no longer blocks at `extracted`.
- Keep atomized, synthesized, and routed gaps separate; this card does not create atoms, synthesized items, action routes, backlog records, decisions, or open questions.
- Add closeout registry and done-card verifier coverage.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No Google Sheets read/write.
- No external write.
- No Google Drive permission mutation.
- No live Agent Feedback auto-send.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No atom fabrication and no attempt to mark atomized/synthesized/routed complete.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies `SRC-OWNERS-LISTS-001` as an extracted-stage maturity gap or already-repaired row.
- The focused proof fails if the source note, source registry row, current-state boundary, or current-reality contract evidence is missing.
- The focused proof persists one stable active source fact with source ID, source refs, `asOf`, privacy tier, and no-live-extraction metadata.
- The source maturity grid shows at least one source fact signal for `SRC-OWNERS-LISTS-001` after repair and no longer reports `nextGap=extracted` for that source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-evidence-gap-repair.js` contains candidate selection, fact builder, evaluator, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-evidence-gap-repair-check.mjs` performs Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-evidence-gap-repair-check`.
- The closeout registry names `source-maturity-evidence-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target source contract from `getSourceContracts()` and require `Current reality captured` / `Signed Off For Current Reality`.
- Read `docs/source-notes/bhag-builder-lists.md` and require the source ID, workbook, `Lists` tab, `IMPORTRANGE`, and "do not write into the Owners Dashboard" boundary.
- Read `docs/source-registry.md` and require the current-reality `SRC-OWNERS-LISTS-001` registry row.
- Read `docs/rebuild/current-state.md` and require the Owners Dashboard mirror boundary.
- Build one stable `source_contract` fact with source ID, natural key, source refs, `asOf=2026-04-24`, min tier, no-live-extraction metadata, no-external-write metadata, and no-Drive-mutation metadata.
- Persist through `upsertSynthesisFactsBundle` only under explicit write flags.
- Re-read `buildSourceMaturityGridSnapshot` after persistence and prove the same live function path moves the target away from `nextGap=extracted`.

## Behavior Proof

Focused proof calls the actual function path:

- `selectSourceMaturityEvidenceRepairCandidate`
- `buildSourceMaturityEvidenceFact`
- `upsertSynthesisFactsBundle`
- `evaluateSourceMaturityEvidenceGapRepair`
- the live source maturity grid before and after the source fact exists

Dogfood cases:

- Missing source note evidence fails closed.
- Missing current-reality source contract fails closed.
- Missing source-registry row fails closed.
- Missing current-state mirror boundary fails closed.
- Source fact must include source ID, source refs, `asOf`, tier, and no-live-extraction/no-external-write metadata.
- The target source must have sourceFactSignals >= 1 after repair.
- The target source must no longer have `nextGap=extracted` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

- Static gate: `node --check` for the focused module, focused proof script, closeout registry, coverage list, and package command surface.
- Focused gate: `process:source-maturity-evidence-gap-repair-check` proves Plan Critic, approval integrity, Current Sprint metadata, candidate selection, source fact persistence, and source maturity grid behavior.
- Full gate: `process:foundation-ship` runs ship-check, fanout, post-ship fanout, and final `foundation:verify` because the card changes Foundation behavior substrate, package command surface, closeout registry, verifier coverage, live backlog/current sprint truth, and DB-backed source facts.
- Blast radius is internal Foundation source readiness only: no external systems, no Sheets write, no provider calls, no live extraction, and no broad UI redesign.

## Risks

- Risk: a repo-doc source fact could falsely imply live extraction happened. Repair path: fail closed unless metadata says no live extraction/no external write/no Drive mutation and the plan/closeout explicitly say this clears only the extracted-stage evidence gap.
- Risk: a source fact could be created without enough source evidence. Repair path: fail closed if source note, registry row, current-state boundary, or current-reality source contract is missing.
- Risk: the card could accidentally fabricate atoms or mark synthesis/routing complete. Repair path: do not create atoms, synthesized items, routes, destination records, decisions, or open questions; route atom-flow/synthesis/routing to follow-up cards.
- Risk: source maturity regresses or proof fails. Repair path: leave the card blocked in Current Sprint with exact failing check, do not ship, and either repair the source fact proof or mark the row blocked/pending instead of inventing evidence.

## Tests

- `node --check lib/source-maturity-evidence-gap-repair.js scripts/process-source-maturity-evidence-gap-repair-check.mjs`
- `npm run process:source-maturity-evidence-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-evidence-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-evidence-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-evidence-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001.json --closeoutKey=source-maturity-evidence-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets one more real source maturity gap closed from existing truth instead of another red row. Foundation becomes better at turning documented source contracts into machine-readable facts while staying honest about what still needs atom flow, synthesis, and routing.

## Speed Bound

The focused proof should stay under 2 minutes because it targets one source fact and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
