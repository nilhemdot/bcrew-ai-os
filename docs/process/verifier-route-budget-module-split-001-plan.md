# VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 Plan

## What
Move the route-budget verifier logic for `/api/source-of-truth` and default `/api/foundation-hub` out of `scripts/foundation-verify.mjs` into a focused verifier module with behavior-level dogfood.

## Why
The route-budget cleanup added useful coverage, but leaving detailed budget logic in the 13K+ line verifier keeps the monolith risk alive. The operator value for Steve's real workflow is a verifier that remains easier to read, profile, and extend without turning every new Foundation check into another inline block. This unlocks speed and quality for future Foundation reliability work because route-budget failures stay small, named, and easy to fix.

## Acceptance Criteria
- Route-budget verifier evaluation lives in a dedicated module outside `scripts/foundation-verify.mjs`.
- `scripts/foundation-verify.mjs` keeps ID-named coverage for `SOURCE-OF-TRUTH-PERF-BUDGET-001` and `FOUNDATION-HUB-PAYLOAD-EXTRACT-001` by delegating to the module.
- Dogfood proof simulates an over-latency source route and proves the module rejects it.
- Dogfood proof simulates an over-budget Foundation Hub payload and proves the module rejects it.
- Dogfood proof accepts healthy synthetic route measurements.
- The split is narrow and does not broaden into a full verifier rewrite.

## Definition Of Done
- A focused process check validates approval, Plan Critic pass, live backlog/current sprint truth, module behavior, dogfood failure rejection, and canonical verifier wiring.
- `foundation:verify` still passes and still reports the route-budget checks.
- `scripts/foundation-verify.mjs` loses the detailed route-budget evaluation block in favor of module delegation.
- The card moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with closeout proof.
- Full Foundation ship gate passes before commit.

## Details
Reuse existing code, existing docs, existing scripts, live Backlog, Current Sprint, `lib/source-of-truth-payload.js`, `lib/foundation-hub-summary-payload.js`, and the current route-budget proof script. Add `lib/foundation-route-budget-verifier.js` to combine route measurements, dogfood proofs, closeout/card checks, and route-budget evaluation into a reusable verifier result.

The focused proof should call the module directly with synthetic route measurements and dogfood data. It must reject the exact old failure modes: the 2,489ms source route and the 872,726 byte Foundation Hub payload. This rejects substring-only proof because the module result must contain failed behavior checks for those measurements.

Gate decision tree: explicitly compare static, focused, and full verification by blast radius. Static proof is insufficient because canonical verifier coverage moves across a module boundary. Focused proof is required through `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 --json`; full proof follows with `npm run foundation:verify` and `npm run process:foundation-ship`. The focused proof must stay fast, under 2 minutes, so it is usable by default instead of becoming another heavy gate.

## Risks
The main risk is moving code without preserving the exact ID-named coverage that ship gates rely on. Repair path is to keep the old inline checks until the module proves equivalent pass/fail behavior. Another risk is broad verifier churn; this card must only split route-budget logic.

## Tests
- `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 --json`
- `npm run foundation:verify -- --failures-only`
- `npm run process:foundation-ship -- --card=VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001.json --closeoutKey=foundation-ship-gate-tightening-v1 --commitRef=HEAD`

## Not Next
Do not perform a broad verifier rewrite, split unrelated verifier sections, change route budgets, build hub features, touch Marketing Video Lab work, or mutate live source data from verifier/check paths.
