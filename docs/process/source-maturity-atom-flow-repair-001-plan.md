# SOURCE-MATURITY-ATOM-FLOW-REPAIR-001 Plan

## Goal

Repair the smallest safe source maturity atomized-stage gap by promoting an existing governed source fact for `SRC-OWNERS-LISTS-001` into one source-backed `intelligence_atoms` record and supporting atom hit. No extraction, Google Sheets read/write, provider/model call, auth work, paid run, Drive mutation, or external write is approved.

## What

Build a bounded atom-flow repair for `SRC-OWNERS-LISTS-001`. The card uses the active source fact shipped by `SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001` and creates one stable internal atom with:

- source ID
- source fact ID
- evidence excerpt
- privacy tier
- no-live-extraction metadata
- no-external-write metadata
- no-Drive-mutation metadata
- one supporting atom hit

The atom proves the memory spine can consume the existing source-backed fact. It does not claim synthesis, routing, destination writeback, or live extraction.

## Why

The source maturity grid now shows `SRC-OWNERS-LISTS-001` past extracted, but blocked at `atomized` because no fresh promoted `intelligence_atoms` signal exists. Foundation should advance that row from existing governed evidence instead of leaving it red, but only if the atom cites a real fact and the proof fails closed when evidence is missing.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity or atom infrastructure.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` scoped `SOURCE-MATURITY-ATOM-FLOW-REPAIR-001` for atomized-stage maturity rows.
- `SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001` created an active source fact for `SRC-OWNERS-LISTS-001`.
- `lib/intelligence-atoms.js` already owns atom and atom-hit persistence.
- `lib/source-maturity-grid.js` already treats active/fresh `intelligence_atoms` as atomized-stage proof and demotes stale atom-flow.
- `docs/source-notes/bhag-builder-lists.md`, `docs/source-registry.md`, and `docs/rebuild/current-state.md` remain the source evidence for the Owners Lists boundary.

## Scope

- Add `lib/source-maturity-atom-flow-repair.js` as the focused behavior module.
- Add `scripts/process-source-maturity-atom-flow-repair-check.mjs` as the focused proof and live sprint progression script.
- Persist exactly one stable accepted atom and one supporting hit for `SRC-OWNERS-LISTS-001` when explicit write flags are used.
- Re-read the live source maturity grid and prove `SRC-OWNERS-LISTS-001` no longer blocks at `atomized`.
- Keep routed action work separate; this card does not create action routes, backlog destination records, decisions, or open questions.
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
- No atom fabrication: every atom must cite an existing active source fact or source-backed evidence row.
- No attempt to mark synthesized or routed complete.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies `SRC-OWNERS-LISTS-001` as an atomized-stage maturity gap or already-repaired row.
- The focused proof fails if the active source fact is missing.
- The focused proof fails if the only source fact is too restricted for tier-1 Foundation source maturity proof.
- The focused proof persists one stable accepted atom and one supporting hit with source ID, source fact ID, evidence refs, privacy tier, and no-live-extraction metadata.
- The source maturity grid shows at least one fresh atom signal for `SRC-OWNERS-LISTS-001` after repair and no longer reports `nextGap=atomized` for that source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-atom-flow-repair.js` contains candidate selection, atom builder, evaluator, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-atom-flow-repair-check.mjs` performs Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-atom-flow-repair-check`.
- The closeout registry names `source-maturity-atom-flow-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-ATOM-FLOW-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target source maturity row from the same `buildSourceMaturityGridSnapshot` path used by Foundation surfaces.
- Read active source facts for `SRC-OWNERS-LISTS-001` from `intelligence_synthesis_facts`.
- Require an active fact with an ID, claim/detail/value, evidence refs, and tier-1-safe posture.
- Build one stable atom with `atomType=proof_point`, `status=accepted`, `freshness=structural`, and `modality=sheet`.
- Build one stable supporting atom hit that points back to the source fact.
- Persist through `upsertIntelligenceAtom` and `recordIntelligenceAtomHit` only under explicit write flags.
- Re-read `buildSourceMaturityGridSnapshot` after persistence and prove the same live function path moves the target away from `nextGap=atomized`.

## Behavior Proof

Focused proof calls the actual function path:

- `selectSourceMaturityAtomFlowRepairCandidate`
- `buildSourceMaturityAtomFromFact`
- `upsertIntelligenceAtom`
- `recordIntelligenceAtomHit`
- `evaluateSourceMaturityAtomFlowRepair`
- the live source maturity grid before and after the atom exists

Dogfood cases:

- Missing active source fact fails closed.
- Restricted-tier source fact fails closed.
- Source-backed atom must include source ID, source fact ID, tier, evidence excerpt, and no-live-extraction/no-external-write metadata.
- Atom hit must persist.
- The target source must have atomSignals >= 1 after repair.
- The target source must no longer have `nextGap=atomized` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

- Static gate: `node --check` for the focused module, focused proof script, closeout registry, coverage list, and package command surface.
- Focused gate: `process:source-maturity-atom-flow-repair-check` proves Plan Critic, approval integrity, Current Sprint metadata, candidate selection, atom persistence, atom-hit persistence, and source maturity grid behavior.
- Full gate: `process:foundation-ship` runs ship-check, fanout, post-ship fanout, and final `foundation:verify` because the card changes Foundation behavior substrate, package command surface, closeout registry, verifier coverage, live backlog/current sprint truth, and DB-backed atom-flow state.
- Blast radius is internal Foundation source readiness only: no external systems, no Sheets read/write, no provider calls, no live extraction, and no broad UI redesign.

## Risks

- Risk: an atom could imply live extraction happened. Repair path: fail closed unless metadata says no live extraction/no external write/no Drive mutation/no Sheets read/write/no model call.
- Risk: an atom could be created without enough evidence. Repair path: fail closed unless an active source fact with source refs is present.
- Risk: the card could fake synthesis/routing completion. Repair path: do not create synthesized items, action routes, destination records, decisions, or open questions.
- Risk: source maturity regresses or proof fails. Repair path: leave the card blocked in Current Sprint with exact failing check, do not ship, and either repair the atom proof or leave the row visibly blocked.

## Tests

- `node --check lib/source-maturity-atom-flow-repair.js scripts/process-source-maturity-atom-flow-repair-check.mjs`
- `npm run process:source-maturity-atom-flow-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-atom-flow-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-atom-flow-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-atom-flow-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-ATOM-FLOW-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-ATOM-FLOW-REPAIR-001.json --closeoutKey=source-maturity-atom-flow-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets source maturity moving through the actual memory spine instead of another red row. Foundation proves it can turn governed source facts into cited atoms without hiding that routing remains separate work.

## Speed Bound

The focused proof should stay under 2 minutes because it targets one source fact, one atom, one atom hit, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
