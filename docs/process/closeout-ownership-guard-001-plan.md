# CLOSEOUT-OWNERSHIP-GUARD-001 Plan

## What
Block Foundation closeout records where `backlogIds` and `mentionedBacklogIds` overlap, so owning cards and context cards cannot be smeared together again.

## Why
The route-budget sprint exposed a real ownership boundary issue: a closeout can accidentally claim the same card as both owned and mentioned context. That makes Recent Work and backlog proof less trustworthy. The operator value for Steve's real workflow is clearer accountability: a closeout either owns a card or references it as context, never both. This unlocks speed and quality during Recent Work review because Steve can trust which card actually shipped without decoding process artifacts.

## Acceptance Criteria
- Closeout validation reports invalid records when any normalized backlog ID appears in both `backlogIds` and `mentionedBacklogIds`.
- The guard includes record key, overlapping IDs, and a plain-English failure detail.
- Existing clean closeouts continue to pass.
- Dogfood proof creates a synthetic overlapping closeout and proves validation rejects it.
- Dogfood proof creates a synthetic clean closeout and proves validation accepts it.
- Foundation verifier has ID-named coverage for `CLOSEOUT-OWNERSHIP-GUARD-001`.

## Definition Of Done
- A focused process check validates approval, Plan Critic pass, live backlog/current sprint truth, closeout validation behavior, synthetic failure rejection, and clean-case acceptance.
- `foundation:verify` fails closed if real closeout records contain ownership/context overlap.
- The card moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with closeout proof.
- Full Foundation ship gate passes before commit.

## Details
Reuse existing code, existing docs, existing scripts, live Backlog, Current Sprint, `lib/foundation-build-log.js`, `getFoundationBuildCloseoutValidation()`, `buildSyntheticBuildLogOwnershipProof()`, Recent Work ownership semantics, and the existing Foundation verifier. Add validation behavior in the build-log library, not as a one-off verifier string check.

The focused proof should call a real validation function with synthetic closeout arrays. It must prove a clean record passes and an overlap record fails with the overlapping ID listed. This rejects substring-only proof because the proof inspects validation results, not source text markers.

Gate decision tree: explicitly compare static, focused, and full verification by blast radius. Static proof is insufficient because canonical closeout validation changes. Focused proof is required through `npm run process:foundation-ship-gate-tightening-check -- --card=CLOSEOUT-OWNERSHIP-GUARD-001 --json`; full proof follows with `npm run foundation:verify` and `npm run process:foundation-ship`. The focused proof must stay fast, under 2 minutes, so it is usable by default instead of becoming another heavy gate.

## Risks
The main risk is breaking historical closeouts that intentionally used context IDs loosely. Repair path is to fix the closeout records by moving context-only IDs out of `backlogIds`, not weaken the guard. If a legitimate exception appears, it should become an explicit exception record with owner and expiry, not an implicit overlap.

## Tests
- `npm run process:foundation-ship-gate-tightening-check -- --card=CLOSEOUT-OWNERSHIP-GUARD-001 --json`
- `npm run foundation:verify -- --failures-only`
- `npm run process:foundation-ship -- --card=CLOSEOUT-OWNERSHIP-GUARD-001 --planApprovalRef=docs/process/approvals/CLOSEOUT-OWNERSHIP-GUARD-001.json --closeoutKey=foundation-ship-gate-tightening-v1 --commitRef=HEAD`

## Not Next
Do not rewrite Recent Work UI, backfill every historical closeout, loosen ownership semantics, build hub features, touch Marketing Video Lab work, or create a broad changelog refactor.
