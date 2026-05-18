# SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001 Plan

## Goal

Repair the `SRC-FREEDOM-TEAM-001` and `SRC-FREEDOM-COMMUNITY-REV-001` source maturity atomized-stage gaps by promoting existing active Freedom Sheet source facts into governed `intelligence_atoms` records and supporting atom hits without running extraction, reading/writing Sheets, calling a provider/model, or writing externally.

## What

Build a bounded Freedom Sheet atom-flow repair. The card uses source facts `fact:a76eb15fe718d1eb8dda2a93` for `SRC-FREEDOM-TEAM-001` and `fact:280b56f9991a417bc91ef4be` for `SRC-FREEDOM-COMMUNITY-REV-001`. It creates one accepted atom plus one supporting atom hit per target. It does not claim synthesis, routing, governed apply, or closed-loop completion.

## Why

Live source maturity shows `SRC-FREEDOM-TEAM-001` and `SRC-FREEDOM-COMMUNITY-REV-001` have active source facts but no fresh promoted atom signals, so they block at `atomized`. Foundation should turn existing governed facts into atoms without inventing truth or starting live ingestion.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity or atom infrastructure.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` already established the safe source-maturity child-card repair pattern.
- `SOURCE-MATURITY-ATOM-FLOW-REPAIR-001` already proved the pattern for promoting an existing source fact into an accepted atom and atom hit.
- `lib/source-maturity-grid.js` already marks the `atomized` stage green only when source-backed atom flow exists.
- `lib/intelligence-atoms.js` already owns `upsertIntelligenceAtom` and `recordIntelligenceAtomHit`.
- Live Foundation data already contains active Tier 1 source facts `fact:a76eb15fe718d1eb8dda2a93` and `fact:280b56f9991a417bc91ef4be` for the two target Freedom Sheet sources.

## Scope

- Add `lib/source-maturity-freedom-sheet-atom-flow-repair.js` as the focused Freedom Sheet repair contract, constants, synthetic dogfood proof, and closeout renderer.
- Add `scripts/process-source-maturity-freedom-sheet-atom-flow-repair-check.mjs` as the focused proof and live sprint progression script.
- Target only `SRC-FREEDOM-TEAM-001` / `fact:a76eb15fe718d1eb8dda2a93` and `SRC-FREEDOM-COMMUNITY-REV-001` / `fact:280b56f9991a417bc91ef4be` in V1.
- Create or update one accepted `intelligence_atoms` row and one `intelligence_atom_hits` row from each source fact.
- Keep metadata explicit: card ID, closeout key, target source ID, source fact ID, evidence refs, no live extraction, no external write, no Drive mutation, no model call, and no Sheets read/write.
- Do not create synthesized items, action routes, destination backlog cards, decisions, questions, external actions, connector writes, or provider calls.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No external write.
- No Google Sheets read/write.
- No Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No atom fabrication: every atom must cite an existing active source fact or source-backed evidence row.
- No attempt to mark synthesized, routed, governed-apply, or closed-loop complete.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies both Freedom Sheet targets as real atomized-stage source maturity gaps before mutation.
- The focused proof fails if either bounded source fact is missing, inactive, too restricted, or missing claim text.
- The focused proof writes exactly one stable accepted atom and one stable atom hit for each target source/fact.
- The atom metadata names `SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001` and `source-maturity-freedom-sheet-atom-flow-repair-v1`.
- The atom metadata has `noLiveExtraction=true`, `noExternalWrite=true`, `noDriveMutation=true`, `noModelCall=true`, and `noSheetsReadWrite=true`.
- The source maturity grid shows at least one atom signal for each target after repair and no longer reports `nextGap=atomized` for either source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-freedom-sheet-atom-flow-repair.js` contains the Freedom Sheet repair contract, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-freedom-sheet-atom-flow-repair-check.mjs` performs live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-freedom-sheet-atom-flow-repair-check`.
- The closeout registry names `source-maturity-freedom-sheet-atom-flow-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target facts from `intelligence_synthesis_facts`.
- Build one atom from each target fact claim/detail and evidence ref.
- Persist only through `upsertIntelligenceAtom` and `recordIntelligenceAtomHit` when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove atomSignals changed through the same live source maturity function path that Foundation uses.

## Behavior Proof

Focused proof calls the actual function path:

- `selectFreedomSheetAtomFlowRepairCandidates`
- `buildFreedomSheetAtomsFromFacts`
- `upsertIntelligenceAtom`
- `recordIntelligenceAtomHit`
- `evaluateFreedomSheetAtomFlowRepairs`
- the live source maturity grid after the atom exists

Dogfood cases:

- A source with an atomized-stage gap and no atom fails as unrepaired.
- Missing target source fact fails closed.
- Restricted-tier source fact fails closed.
- The atom must cite the source fact row through `intelligence_synthesis_facts:<fact_id>` even when the source fact has no external URL/ref.
- The atom must cite the source fact.
- The atom must record no live extraction, no external write, no model call, and no Sheets read/write.
- Each target source must have atomSignals >= 1 after repair.
- Each target source must no longer have `nextGap=atomized` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

1. Static syntax check first with `node --check`.
2. Focused proof in scoping and sprint-ready stages to validate plan, approval, backlog/current sprint metadata, and dogfood without atom mutation.
3. Focused proof in building-now stage with `--apply` to create the accepted atom and atom hit from existing source fact evidence.
4. Focused close-card proof to write the closeout and prove the repaired source maturity row.
5. Backlog hygiene.
6. Full `process:foundation-ship` before push.

## Blast Radius

This touches internal Foundation source readiness and atom-flow rows only:

- `intelligence_atoms`
- `intelligence_atom_hits`
- live backlog/current sprint metadata
- source maturity verification surfaces

It does not touch external systems, connectors, OAuth, provider spend, Harlan/Fal/voice/Canva/OpenHuman features, Drive permissions, Google Sheets, or broad UI layout.

## Risks

- If the atom is created without source fact provenance, Foundation could convert stale narrative into false memory. Repair path: fail unless the target source fact exists and the atom metadata cites it.
- If this card claims synthesis/routing/apply completion, the source maturity row could become false green beyond the atom-flow lane. Repair path: only prove atomized-stage movement and leave later lanes to separate cards.
- If the proof reads/writes Google Sheets or starts extraction, this becomes unapproved connector/source work. Repair path: target existing DB fact evidence only and require no-Sheets/no-extraction metadata.
- If the proof only checks markdown strings, prior wiring mistakes can return. Repair path: call the real selector, atom builder, live DB write path, and source maturity grid.

## Tests

- `node --check lib/source-maturity-freedom-sheet-atom-flow-repair.js scripts/process-source-maturity-freedom-sheet-atom-flow-repair-check.mjs`
- `npm run process:source-maturity-freedom-sheet-atom-flow-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-freedom-sheet-atom-flow-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-freedom-sheet-atom-flow-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-freedom-sheet-atom-flow-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001.json --closeoutKey=source-maturity-freedom-sheet-atom-flow-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets the Freedom Sheet source moving through the governed memory spine from existing source truth, without opening any live source, paid run, or external write.

## Speed Bound

The focused proof should stay under 2 minutes because it targets two sources, two facts, two atoms, two atom hits, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
