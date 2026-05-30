# RESEARCH-DISPOSITION-QUEUE-001 Plan

## What

Turn research-lane cards into a proposal-only disposition queue: promote review, keep review, future-concepts review, or kill review.

## Why

The research purge report made the pile visible, but a giant markdown table is not enough for sprint planning. Steve needs a queue that can be filtered, summarized, and reviewed without automatically deleting or moving anything.

## Acceptance Criteria

- Queue generation reads live/synthetic backlog rows where lane is `research`.
- Each disposition row includes card ID, priority, rank, related signal, proposed disposition, reason, and recommended next action.
- Queue summary reports counts by disposition and priority.
- Before/after live backlog lane counts are unchanged after queue generation.
- `RESEARCH-DISPOSITION-QUEUE-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Research disposition queue functions are reusable by the sprint advisor and future review UI.
- Focused proof covers promote-review, keep-review, future-concepts-review, kill-review synthetic cases, and no-mutation behavior.
- Current plan/state document the queue as proposed-only.

## Existing Work To Reuse

Reuse `docs/_archive/handoffs/research-purge-2026-05-13.md`, live backlog rows, backlog monitor counts, Research Inbox proposal-only doctrine, and foundation verifier patterns.

## Details

Existing code to reuse: `getFoundationSnapshot`, backlog monitor patterns, Research Inbox proposal-only conventions, Current Sprint helpers, and the focused `process:implementation-intelligence-check` script. Existing docs to reuse: this plan, the sprint plan, research purge handoff, current plan/state, and build-intel direction capture. Existing backlog truth to reuse: live `research` lane cards and related card/source signals already present in backlog fields.

V1 is bounded to queue generation over live/synthetic rows. The black-box behavior proof must call the actual disposition queue function path, pass synthetic weak plan fixtures for promote/keep/future/kill-review rows, generate live research counts, and compare before/after row counts and lane counts from `getFoundationSnapshot`. It must fail if any row is moved, closed, deleted, or promoted. No substring-only proof is acceptable.

## Root Invariant

Disposition is a review suggestion, not an action. The queue cannot move, delete, close, or promote cards.

## Risks

- "Kill review" may be misread as delete approval. Mitigation: use `kill_review`, not `kill`, and require Steve approval.
- Valuable old research may be pushed future too early. Mitigation: include reason, related signal, and confidence.

## Gate Decision

Gate decision tree: static gate is not enough because this is queue behavior, focused gate proves queue classification and no-mutation behavior, and full gate runs with the sprint because the blast radius touches Foundation backlog review infrastructure and verifier coverage. The focused gate must run in under 2 minutes and inspect function output plus live row-count safety; `process:foundation-ship` remains required before push.

## Repair Path

If lane counts change or any row is mutated, mark the generated queue invalid, restore the changed card, and rerun proof before closeout.

## Operator Value

Operator value: Steve gets a useful real workflow that turns the research pile into a review queue with plain-English recommendations instead of a 100+ row table. This unlocks review speed and backlog quality without destructive cleanup.

## Tests

- `npm run process:implementation-intelligence-check -- --card=RESEARCH-DISPOSITION-QUEUE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not delete research cards.
- Do not auto-move cards to future concepts.
- Do not edit `docs/future-concepts.md`.
- Do not open a research cleanup UI or apply dispositions automatically.
