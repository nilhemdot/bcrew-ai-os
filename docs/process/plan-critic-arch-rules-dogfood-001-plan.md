# PLAN-CRITIC-ARCH-RULES-DOGFOOD-001 Plan

## What

Regression-test and tighten the Plan Critic architectural rules that were added in the previous sprint.

V1 proves the real `evaluatePlanCriticPlan()` path rejects the actual rot patterns Steve is worried about: adding to oversized files without a split plan, writing from check scripts without explicit apply posture, touching verifier/check paths in ways that repair live state, missing focused proof, missing audit-fix dogfood proof, and adding hot endpoint work without a performance budget.

## Why

Steve needs the senior-engineering guardrails to catch architecture risk before he has to smell it himself. He is about 73 days into AI-assisted coding, so file-size risk, performance budgets, verifier trust, and write boundaries must be enforced by the system instead of relying on Steve noticing drift.

The operator value is quality and speed: bad plans get revised before build, and good cleanup plans move faster because the rule is deterministic.

## Acceptance Criteria

- A synthetic large-file plan that adds work to `lib/foundation-db.js` without a split plan returns `revise`.
- A synthetic mutating check script plan without `--apply` returns `revise`.
- A synthetic verifier/check live-state repair plan returns `revise`.
- A synthetic audit-fix plan without dogfood proof returns `revise`.
- A synthetic hot endpoint plan without a performance budget returns `revise`.
- A compliant cleanup plan with split plan, read-only/default apply posture, fail-closed verifier language, focused proof, dogfood proof, and performance budget returns `pass`.
- The proof calls the actual function path, and substring-only proof is rejected.

## Definition Of Done

- Existing code in `lib/process-plan-critic.js` and `lib/plan-critic-architectural-rules.js` is reused.
- New behavior lives in the small architectural-rules module and proof script, not in a monolith.
- `scripts/process-foundation-verification-cleanup-check.mjs` proves the dogfood cases through the real Plan Critic path.
- Current Sprint has doctrine and a durable Plan Critic pass row before implementation.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `evaluatePlanCriticPlan()`, `evaluatePlanCriticArchitecturalRules()`, `ARCHITECTURAL_RULE_FINDING_KEYS`, Plan Critic run ledger, approval integrity, Current Sprint overlay, `foundation:verify`, and the Foundation ship gates.

Existing docs to reuse: the 2026-05-13 deep audit, Plan Critic architectural rules plan, current plan/current state, and the previous hardening closeouts.

Existing scripts to reuse: `process:plan-critic-architectural-rules-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static proof alone is too weak; focused proof is required through the actual function path; full proof is required because this changes Plan Critic behavior, package scripts, verifier coverage, and sprint closeout truth. Blast radius is Foundation process control. The focused proof is fast and proportional because it runs synthetic plans through the real function path under two minutes.

Split plan: any touch to `scripts/foundation-verify.mjs` or `lib/foundation-build-closeout-records.js` is thin registration only. New Plan Critic behavior stays in `lib/plan-critic-architectural-rules.js`, and new proof behavior stays in `scripts/process-foundation-verification-cleanup-check.mjs`. Do not add new responsibilities to the oversized verifier or closeout-record monolith.

## Risks

- Risk: the regression test becomes another green check that does not exercise behavior.
  - Repair path: fail closed unless every synthetic bad plan returns `revise` and the compliant plan returns `pass`.
- Risk: the new performance rule blocks valid endpoint work.
  - Repair path: allow plans that include explicit latency/payload budgets and a route proof command.
- Risk: this drifts into broad Plan Critic redesign.
  - Repair path: keep V1 to deterministic architecture-risk checks only and reopen the card if valid cleanup work cannot pass.

## Tests

```bash
npm run process:foundation-verification-cleanup-check -- --json --no-api
npm run process:plan-critic-architectural-rules-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=RECURRING-DEEP-AUDIT-001 --planApprovalRef=docs/process/approvals/RECURRING-DEEP-AUDIT-001.json --closeoutKey=foundation-verification-cleanup-v1 --commitRef=HEAD
```

Dogfood proof recreates the original failure modes with synthetic bad plans and proves the new code blocks them.

## Not Next

- Do not build hub features.
- Do not build Build Intel extraction.
- Do not rewrite Plan Critic as an agent.
- Do not broadly refactor the verifier.
- Do not touch MEETING-VAULT-ACL-001 Phase B or Drive permissions.
