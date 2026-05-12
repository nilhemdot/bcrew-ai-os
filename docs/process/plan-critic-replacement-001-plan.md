# PLAN-CRITIC-REPLACEMENT-001 Plan

Status: done for v1 under `plan-critic-replacement-v1`
Card: `PLAN-CRITIC-REPLACEMENT-001`
Date: 2026-05-12

## What

Build a thin V1 replacement for the old BCrew-Buddy Plan Critic.

This is a fast pre-build gate, not another agent framework. Before durable Foundation build work starts, the plan gets scored against the audit lessons: tight scope, reuse existing work, behavior-not-substring proof, concrete acceptance criteria, rollback or repair path, the gate decision tree, and not-next boundaries.

The output is simple: `pass` or `revise`, a score out of 10, findings, and the selected verification gate.

## Why

Steve wants faster build speed with quality. The audits agreed the system has drifted toward process proof over product behavior. Plan Critic V1 is the small guard that catches weak plans before they become thin cards, substring-only verifier checks, or done-without-behavior closeouts.

The operator value is speed with confidence: the next builder can move faster because the plan has already proven what behavior it will test and what it will not build.

## Acceptance Criteria

- `lib/process-plan-critic.js` defines the scoring schema and `evaluatePlanCriticPlan`.
- `scripts/process-plan-critic-check.mjs` runs a focused proof and emits `PLAN_CRITIC_REPLACEMENT_SUMMARY`.
- `docs/process/foundation-gate-decision-tree.md` gives the one-page rule for `static`, `focused`, and `full` verification.
- The Plan Critic score is at least 9.8 for this approved plan.
- A synthetic strong plan passes.
- A synthetic weak plan that relies on substring-only or string match proof is rejected.
- A synthetic over-broad plan is rejected for missing tight scope and not-next boundaries.
- Current Sprint moves this card to Done This Sprint and advances the active blocker to `SECURITY-BEHAVIOR-PROOF-001`.
- Current plan, current state, Recent Work, live backlog, and verifier coverage all name `plan-critic-replacement-v1`.

## Definition Of Done

- The scoring schema totals 10 points with `behavior_not_substring` as the highest-weight category.
- P0 plans cannot pass without behavior proof through an actual function path, API/route path, focused process path, or synthetic failure case.
- Plans that mention substring-only proof must explicitly reject it or justify it with stronger behavior proof.
- The gate decision tree chooses `static`, `focused`, or `full` from blast radius, not from convenience.
- `PLAN-CRITIC-REPLACEMENT-001` is closed in Backlog with proof commands and closeout trail.
- The focused proof command is fast enough to run before build work.

## Details

Reuse existing code and policy:

- `lib/process-verify-gate-tiering.js` already classifies changed files as `static`, `focused`, or `full`.
- `lib/foundation-current-sprint.js` already owns the active sprint overlay and not-next boundaries.
- `lib/foundation-db.js` already owns live backlog truth.
- `lib/approval-integrity.js` already validates 9.8 approval files.
- `scripts/process-*-check.mjs` is the existing focused proof pattern.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` are the current command docs.

Gate decision for this card: full.

Reason: this implementation changes `lib/foundation-db.js`, `package.json`, and `scripts/foundation-verify.mjs`, so it needs the full Foundation ship gate even though the Plan Critic proof itself is focused.

The V1 scoring schema:

- seven_section_plan: 1.4
- tight_scope_and_not_next: 1.2
- reuse_existing_work: 1.0
- behavior_not_substring: 2.0
- acceptance_and_done_are_concrete: 1.2
- rollback_or_repair_path: 1.0
- gate_decision_tree: 1.0
- operator_value: 0.8
- speed_bounded: 0.4

## Risks

- Risk: the gate becomes another slow ritual.
  - Repair path: keep V1 focused and run it as `npm run process:plan-critic-check`; if it adds too much drag, revise the scoring or move heavy checks into full ship only.
- Risk: the gate becomes text theatre itself.
  - Repair path: the proof calls `evaluatePlanCriticPlan` directly and includes synthetic weak-plan failures; if a weak plan passes, the card reopens.
- Risk: future builders treat this as a generic reviewer persona or Agent Factory.
  - Repair path: not-next boundaries keep V1 limited to pre-build plan scoring.
- Risk: the gate choice is too permissive.
  - Repair path: `docs/process/foundation-gate-decision-tree.md` sends auth, schema, package, server, canonical verifier, runtime, source, extraction, and intelligence changes to full proof.

## Tests

```bash
npm run process:plan-critic-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PLAN-CRITIC-REPLACEMENT-001 --planApprovalRef=docs/process/approvals/PLAN-CRITIC-REPLACEMENT-001.json --closeoutKey=plan-critic-replacement-v1 --commitRef=HEAD
```

The focused proof must run the actual function path, not only source markers:

- `evaluatePlanCriticPlan` on this plan.
- `buildSyntheticPlanCriticProof`.
- live Current Sprint stage and active blocker checks.
- live Backlog lane check.
- approval-integrity check.

## Not Next

- Do not build Agent Factory.
- Do not build a generic reviewer persona.
- Do not build Strategy Hub meeting-ready UI in this card.
- Do not build `SECURITY-BEHAVIOR-PROOF-001`.
- Do not build `VERIFIER-BEHAVIOR-SWEEP-001`.
- Do not build avatar import, Telegram bots, Directors, Marketing pipeline, or broad old-system parity work.
- Do not mutate Google Drive permissions or restart Meeting Vault historical cleanup.
