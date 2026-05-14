# PLAN-STATE-RECONCILE-001 Plan

## What

Reconcile plan, sprint state, docs, and closeout wording after the Operating Reliability sprint so the repo does not end with another “board says doctrine missing” mismatch.

V1 updates only the Current Sprint overlay, closeout handoff, and process docs needed to make sprint truth line up. It does not open the next sprint automatically.

## Why

The immediate pain was not just missing code. It was process drift: sprint board, doctrine, approval files, DB state, and chat plans were out of sync. This card closes that loop deliberately so Steve can trust the board again.

## Acceptance Criteria

- All five sprint cards have populated doctrine in the live Current Sprint overlay.
- Each card has a valid v2 approval file and durable Plan Critic pass row.
- Sprint stages progress through Scoping, Sprint Ready, Building Now, Done This Sprint with timestamps/change events.
- Closeout names the immediate follow-up sprint and explicitly says what is not next.
- Follow-up Sprint B cards stay scoped, not built.
- Dogfood proof checks live DB, docs, approval files, plan critic rows, and closeout presence.

## Definition Of Done

- Current Sprint status is healthy.
- `docs/handoffs/2026-05-14-foundation-operating-reliability-closeout.md` exists.
- Sprint closeout identifies the follow-up “Foundation Verification + Continued Cleanup Sprint.”
- No active sprint is left with done cards and missing doctrine.
- Full ship gate passes before push.

## Details

Reuse:

- Current Sprint overlay helpers.
- Approval integrity validation.
- Plan Critic run ledger.
- Backlog hygiene and foundation ship gates.
- Existing two-sprint scope handoff.

Gate decision for this card: full.

Decision tree: static proof is too weak because live DB sprint state changes; focused proof is required through the actual Current Sprint function path and approval-integrity validators; full proof is required because the blast radius touches Current Sprint truth, closeout docs, approval files, and ship gates. The focused check path is read-only by default, does not repair live state, performs no live-state mutation, and fails closed if sprint doctrine or approval truth is missing. Any sprint-state write happens only through the guarded helper with explicit apply posture outside the read-only check path.

Existing code to reuse: Current Sprint overlay helpers, approval integrity validator, Plan Critic run ledger readers, backlog hygiene, and Foundation ship gates. Existing docs to reuse: the two-sprint scope handoff, all five card plans, and current plan/state docs if reconcile requires them. Existing scripts to reuse: `process:foundation-operating-reliability-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`. Live backlog and Current Sprint truth are the only task truth.

Operator behavior unlocked: Steve can open the sprint board and trust it. The real workflow improvement is that “doctrine missing” becomes a failing condition before closeout, improving speed and quality for the next sprint review.

The focused proof command must be fast, proportional, and target under 2 minutes so sprint-state reconciliation is checked by default.

## Risks

- Risk: reconcile script hides real drift by overwriting state.
  - Repair path: use explicit apply posture and report before/after state in the closeout.
- Risk: follow-up sprint gets opened automatically.
  - Repair path: stop at review; only scope and name the next sprint.
- Risk: sprint stage progression is faked at the end.
  - Repair path: update stages incrementally through the guarded overlay as cards move.

## Tests

```bash
npm run process:foundation-operating-reliability-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PLAN-STATE-RECONCILE-001 --planApprovalRef=docs/process/approvals/PLAN-STATE-RECONCILE-001.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

Focused dogfood must recreate the “doctrine missing” board failure by checking live sprint items and failing if any sprint card is done or sprint_ready without plan ref, definition of done, proof commands, not-next boundaries, and existing-work check.

The proof command must call DB/API behavior and reject substring-only proof. A string marker in a doc cannot prove the board is healthy.

## Not Next

- Do not open the next sprint.
- Do not build Sprint B cards inside this sprint.
- Do not add hub feature work.
- Do not auto-close unrelated backlog cards.
