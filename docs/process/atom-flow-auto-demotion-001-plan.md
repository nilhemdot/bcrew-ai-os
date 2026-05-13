# ATOM-FLOW-AUTO-DEMOTION-001 Plan

## What

Add a source-truth guardrail that flags or demotes source maturity claims when a source claims extracted or atomized behavior but has no recent promoted `intelligence_atoms` in the expected freshness window.

## Why

The audit found a real stall: artifacts were arriving while promoted atoms had stopped. The source maturity grid can still look healthier than reality if it trusts labels without checking atom flow. This card makes the maturity claim answer to behavior.

## Acceptance Criteria

- A reusable atom-flow status function reads actual source maturity and `intelligence_atoms` state.
- Sources with extracted/atomized claims and zero fresh atoms inside the configured window are marked stale or demoted in the returned maturity truth.
- Sources with fresh atoms restore to healthy atom-flow status.
- Synthetic proof covers stale, restored, not-applicable, and not-yet-extracted cases.
- The proof rejects substring-only checks and calls the actual function path.
- `ATOM-FLOW-AUTO-DEMOTION-001` has a Plan Critic pass row with score at least 9.8 before build and a revise row if this plan weakens.

## Definition Of Done

- Foundation source maturity output includes atom-flow stale/demotion metadata without editing raw source contracts.
- A focused process check proves stale-to-restored behavior.
- Foundation verifier guards the new behavior for this card.
- The backlog card and sprint item close only after proof passes.

## Details

Existing code to reuse: source maturity builders, source contracts, source connector matrix state, `lib/foundation-current-sprint.js`, and the current Foundation verifier. Existing database truth to reuse: `intelligence_atoms`, source crawl/artifact state, live backlog, and Current Sprint stage gates. Existing docs to reuse: this plan, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the source extraction gap triage handoff. Existing scripts to reuse: a focused `process:atom-flow-auto-demotion-check`, `backlog:hygiene`, and `foundation:verify`.

V1 should prefer explicit `atomFlowStatus`, `atomFlowWindowHours`, `lastAtomAt`, and `staleReason` style metadata over permanent contract mutation. The root invariant is: a source cannot claim healthy extracted/atomized behavior when the actual function path and database round-trip show stale promoted atoms. The check should prove real behavior by calling the function, inspecting returned source rows, and using synthetic atom rows to prove stale and restored states. No substring-only proof is acceptable.

Gate decision: focused gate for the card-specific process check, then full gate if verifier or shared source maturity code changes. Blast radius is source-truth metadata only; no external systems are called. The focused proof should be fast enough to use by default, targeting under 2 minutes, while `process:foundation-ship` remains the full protected-path gate.

## Risks

- Low-volume sources may not produce daily atoms. The guardrail should use configured windows and mark stale honestly rather than destroy source state.
- Missing source-to-atom mapping can create false negatives. The proof must document fallback mapping and unknown status.
- A display-only marker would be theater. The proof must inspect returned data from the actual function/API path.
- Repair path: if proof fails or a real source is falsely demoted, the card stays in revise/scoping or reopens, stale metadata fails closed as `unknown`, and raw source contract maturity is not permanently rewritten.
- Operator value: Steve gets a source layer that says "stale atom flow" instead of green-looking source maturity, improving quality before product behavior consumes source truth.

## Tests

- `npm run process:atom-flow-auto-demotion-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=ATOM-FLOW-AUTO-DEMOTION-001 --planApprovalRef=docs/process/approvals/ATOM-FLOW-AUTO-DEMOTION-001.json --closeoutKey=atom-flow-auto-demotion-v1 --commitRef=HEAD`

## Not Next

- Do not create new source contracts.
- Do not start new extraction or crawling.
- Do not repair credentials.
- Do not build Reply/Watching Loop or Strategy UI.
- Do not mutate Drive permissions, run Meeting Vault Phase B, or send request-access emails.
