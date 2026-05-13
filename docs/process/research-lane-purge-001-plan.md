# RESEARCH-LANE-PURGE-001 Plan

## What

Generate a proposed-only research-lane purge report that classifies stale research cards into promote, keep, kill, or move-to-future-concepts review buckets without changing backlog lanes automatically.

## Why

The research lane is a parking-lot risk. The system needs a reviewable map of old research cards before more source and product work accumulates. This card creates the report, not the deletion.

## Acceptance Criteria

- The report scans live backlog cards where `lane = research`.
- The report includes every research card with card ID, priority, age/update signal, parent or related sprint signal when available, and proposed disposition.
- Dispositions are proposed only and include a reason.
- No backlog card is moved, deleted, or closed by this command.
- Synthetic proof proves the scanner catches stale research and preserves active/recent research.
- `RESEARCH-LANE-PURGE-001` has a Plan Critic pass row with score at least 9.8 before build and a revise row if this plan weakens.

## Definition Of Done

- `docs/handoffs/research-purge-2026-05-13.md` exists and covers the current research lane.
- The focused process check proves proposed-only behavior and no automatic mutation.
- The backlog card and sprint item close only after proof passes.

## Details

Existing code to reuse: live backlog readers, backlog hygiene patterns, Current Sprint helpers, and the current Foundation verifier. Existing database truth to reuse: `backlog_items`, `foundation_sprints`, `foundation_sprint_items`, `plan_critic_runs`, and live backlog lane status. Existing docs to reuse: this plan, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and handoff conventions under `docs/handoffs/`. Existing scripts to reuse: a focused `process:research-lane-purge-check`, `backlog:hygiene`, and `foundation:verify`.

The report is an operator review artifact for Steve tomorrow. It should not create a new source of truth or replace the live backlog. The root invariant is: research cards can be classified for human review without mutating live backlog state. The check should prove behavior through a black-box actual function path over live/synthetic backlog rows, an API-style round-trip fixture for mutation safety, before/after row lane counts, and fail closed if any command tries to auto-delete, auto-close, or auto-move a card. No substring-only proof is acceptable.

Gate decision: focused gate for the report generator and mutation guard, then full gate if shared backlog or verifier code changes. Blast radius is a generated handoff report only. The focused proof should be fast enough to use by default, targeting under 2 minutes, while `process:foundation-ship` remains the full protected-path gate.

## Risks

- A purge report can sound like deletion approval. Mitigation: label every disposition proposed-only.
- Old but valuable research could be misclassified. Mitigation: include reason and preserve card IDs for human review.
- Auto-closing cards would repeat the process-trust problem. Mitigation: prove row counts and lane counts are unchanged after the report run.
- Repair path: if proof fails or a card is mutated, reopen the card, revert the mutation through live backlog repair, and keep the generated report marked invalid until a clean proposed-only run passes.
- Operator value: Steve gets a short review queue for the parked research lane instead of another hidden backlog graveyard, improving decision quality without forcing UI review tonight.

## Tests

- `npm run process:research-lane-purge-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=RESEARCH-LANE-PURGE-001 --planApprovalRef=docs/process/approvals/RESEARCH-LANE-PURGE-001.json --closeoutKey=research-lane-purge-v1 --commitRef=HEAD`

## Not Next

- This is a tight V1 report-only card.
- Do not delete cards.
- Do not auto-move research cards.
- Do not edit `docs/future-concepts.md`.
- Do not open Reply/Watching Loop, Strategy UI, new connectors, or external extraction.
- Do not mutate Drive permissions or send request-access emails.
