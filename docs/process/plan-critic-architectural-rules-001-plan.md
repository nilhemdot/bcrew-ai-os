# PLAN-CRITIC-ARCHITECTURAL-RULES-001 Plan

## What

Upgrade Plan Critic with architecture-risk rules so future durable build plans are revised before implementation when they would recreate the rot found in the 2026-05-13 deep audit.

This is a narrow V1 guardrail. It adds deterministic plan checks and dogfood proof. It does not fix `/api/foundation-hub` performance, split monolith files, or refactor the Foundation DB layer in this card.

## Why

Steve is 73 days into AI-assisted coding and should not be expected to smell architectural drift before it hurts. Plan Critic needs to carry more senior-engineer muscle memory: file size risk, write boundaries, verifier trust, and meaningful proof.

The operator value is fewer false greens and fewer surprise rebuild messes. If a plan wants to add to `lib/foundation-db.js`, mutate from a check script, or claim an audit fix, it must explain the split/write/proof boundary before code starts.

This directly supports Steve and the team in the real Foundation build workflow: faster sprint decisions, better quality gates, and fewer hidden engineering risks that only show up after a ship.

## Acceptance Criteria

- Plan Critic rejects a synthetic plan that adds to a file over 5,000 lines without an explicit split/extraction plan.
- Plan Critic rejects a synthetic check-script plan that writes without explicit `--apply` posture.
- Plan Critic rejects a synthetic verifier/check plan that touches live state instead of failing closed.
- Plan Critic rejects a synthetic audit-fix plan that lacks dogfood proof recreating or simulating the original failure.
- Plan Critic rejects a synthetic durable build plan with no focused proof command.
- Plan Critic passes a compliant architecture-risk plan that names the split boundary, read-only verifier posture, dogfood proof, focused proof, and full ship gate.
- The focused proof calls the actual Plan Critic function path, not substring-only source checks.
- Substring-only proof is explicitly rejected; source markers can support proof only when the real `evaluatePlanCriticPlan` behavior also rejects the synthetic bad plans.

## Definition Of Done

- Architectural rule logic lives outside the current monolith where practical.
- `evaluatePlanCriticPlan` includes architecture findings in its result.
- A focused proof script validates the synthetic reject/pass cases and emits operator-readable output.
- A durable Plan Critic pass row exists for this card before build.
- The live backlog card closes with proof commands and closeout trail.
- `foundation:verify` covers this card by ID.

## Details

Reuse existing code, docs, scripts, and live truth:

- `lib/process-plan-critic.js` is the existing Plan Critic function path.
- `scripts/process-plan-critic-check.mjs` is the existing proof pattern.
- `plan_critic_runs` already records pass/revise rows.
- `upsertFoundationCurrentSprintOverlay` already enforces sprint mutation posture.
- `docs/handoffs/2026-05-13-deep-foundation-code-audit.md` names the audit failures.
- `AGENTS.md` now records the senior-engineer rules around file size, verifier trust, dogfood proof, and velocity.

Gate decision tree for this card: static is too weak because code behavior changes, focused proof is required for the Plan Critic rule behavior, and full proof is required before push because the blast radius touches process gates, verifier coverage, and package scripts.

Gate decision for this card: full.

Reason: this card changes Plan Critic behavior, process proof, package scripts, verifier coverage, current sprint state, and build-log closeout. The focused proof is required, but full `process:foundation-ship` is still required before push.

Keep the default proof fast and proportional: the focused command should run in seconds, while full `foundation:verify` and `process:foundation-ship` remain the final ship gate for the full-risk blast radius.

## Risks

- Risk: Plan Critic becomes too strict and blocks valid work.
  - Repair path: keep the rules as targeted critical findings with a compliant-plan positive case; revise only plans matching the audit-risk patterns.
- Risk: Plan Critic becomes text theatre again.
  - Repair path: dogfood each rule with synthetic failing plans and one passing compliant plan through `evaluatePlanCriticPlan`.
- Risk: this drifts into performance or monolith refactor work.
  - Repair path: stop at the guardrail. Performance and split work become later cards.
- Risk: future scripts bypass the architecture context.
  - Repair path: expose a focused proof command and verifier coverage so missing architecture-rule behavior is caught.

## Tests

```bash
npm run process:plan-critic-architectural-rules-check -- --json
npm run process:plan-critic-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PLAN-CRITIC-ARCHITECTURAL-RULES-001 --planApprovalRef=docs/process/approvals/PLAN-CRITIC-ARCHITECTURAL-RULES-001.json --closeoutKey=plan-critic-architectural-rules-v1 --commitRef=HEAD
```

The focused proof must run the actual function path:

- `evaluatePlanCriticPlan` on this approved plan.
- synthetic large-file no-split plan.
- synthetic check-script write-without-apply plan.
- synthetic verifier live-state write plan.
- synthetic audit-fix without dogfood plan.
- synthetic no-focused-proof plan.
- compliant architecture-risk plan.

## Not Next

- Do not fix `/api/foundation-hub` performance in this card.
- Do not split `lib/foundation-db.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, `server.js`, or `lib/foundation-build-log.js` in this card.
- Do not build Build Intel extraction, Skool, myICOR, Loom, YouTube, or GStack work.
- Do not build hub, customer, agent, marketing, or operational product features.
- Do not create autonomous dev behavior.
- Do not mutate Drive permissions or Meeting Vault ACLs.
