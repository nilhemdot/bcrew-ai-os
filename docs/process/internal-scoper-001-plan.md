# INTERNAL-SCOPER-001 Plan

## What

Build the proposal-only Internal Implementation Scoper that converts thin Foundation cards into 7-section build-ready enrichment proposals.

## Why

The old system had an Implementation Scoper that enriched thin cards before build. The new system has a stronger foundation but still has 82 scoped cards and 115 research cards. Without a scoper, Codex keeps receiving cards that are too thin to build safely.

## Acceptance Criteria

- The scoper reads live or synthetic backlog card rows and returns a proposal, not a mutation.
- Each proposal includes: What, Why, Acceptance Criteria, Definition of Done, Existing Work to Reuse, Proof Plan, and Not Next.
- Proposals include evidence refs, related cards, missing context reasons, confidence, and a `requiresSteveApproval` flag.
- The scoper can enrich a thin card and leave an already build-ready card alone.
- The proof rejects any proposal that tries to auto-open a sprint or auto-update backlog text.
- `INTERNAL-SCOPER-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Reusable scoper functions exist in the implementation-intelligence module.
- Focused proof covers thin-card enrichment, build-ready no-op, and mutation safety.
- Current Sprint stage and backlog lane close only after focused proof, backlog hygiene, and Foundation verifier pass.

## Existing Work To Reuse

Reuse live backlog helpers, Research Inbox proposal conventions, build-log proof records, `docs/_archive/handoffs/research-purge-2026-05-13.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the Plan Critic 7-section scoring doctrine.

## Details

Existing code to reuse: `getFoundationSnapshot`, live backlog row shape, Research Inbox proposal validation, Foundation build closeout records, Current Sprint helpers, and the focused `process:implementation-intelligence-check` script. Existing docs to reuse: this plan, the sprint plan, the research purge handoff, current plan/state, and the Build Intel direction capture handoff. Existing backlog truth to reuse: `INTERNAL-SCOPER-001`, `RESEARCH-INBOX-001`, `THIN-CARD-DETECTOR-001`, and live scoped/research card rows.

V1 is bounded to deterministic proposal generation. It does not call an LLM, write backlog rows, create cards, open sprints, or mark anything approved. The black-box behavior proof must call the actual scoper function path, pass a synthetic weak plan/thin card plus a synthetic build-ready card, inspect returned structured proposal fields, and fail if any output claims `writesBacklog`, `opensSprint`, or `autoApproved`. No substring-only proof is acceptable.

## Root Invariant

Internal Scoper does not build, approve, or mutate. It only produces structured enrichment proposals that Steve+Codex can approve before turning into card text or sprint work.

## Risks

- It could become another autonomous dev agent. Mitigation: no LLM call in v1, no writes, `proposalOnly: true`, and explicit approval fields.
- It could generate generic plans. Mitigation: output must include exact missing fields, source refs, proof commands, and not-next boundaries.

## Gate Decision

Gate decision tree: static gate is not enough because this changes behavior, focused gate proves scoper behavior, and full gate runs with the sprint because the blast radius touches shared Foundation surfaces and verifier coverage. The focused gate must run in under 2 minutes and call the function path directly; the full `process:foundation-ship` gate remains required before push.

## Repair Path

If enrichment is generic or mutation-prone, keep the card in Scoping/Returned and require a narrower deterministic output before closing.

## Operator Value

Operator value: Steve gets a useful real workflow for turning a thin card into a build-ready proposal instead of explaining the same missing context in chat each time. This unlocks better Codex speed and build quality because acceptance/proof/not-next detail exists before implementation.

## Tests

- `npm run process:implementation-intelligence-check -- --card=INTERNAL-SCOPER-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not auto-edit backlog cards.
- Do not run an LLM scoper loop.
- Do not open or rank the next sprint automatically.
