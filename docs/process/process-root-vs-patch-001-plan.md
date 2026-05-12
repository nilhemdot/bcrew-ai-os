# PROCESS-ROOT-VS-PATCH-001 Plan

## What
Add Plan Critic hardening so repair plans are sent back when they patch a visible symptom without proving the underlying invariant.

## Why
Steve needs Plan Critic to catch the pattern before it lands in code. The useful operator behavior is that a plan adding escape conditions to make a verifier/dashboard check pass must name and prove the root invariant or receive `revise`.

## Acceptance Criteria
- The plan scopes a Plan Critic rule for root-cause proof versus symptom patches.
- Plans that silence a verifier/dashboard failure without proving the invariant are rejected.
- Plans that change a check must explain what the check should prove and how the proof calls real behavior.
- The rule is scoped as a follow-up and does not block the immediate sprint process repair.

## Definition Of Done
- The card has scoped doctrine and a Plan Critic pass row.
- Implementation waits until after `VERIFIER-SPRINT-INDEPENDENCE-001`.
- The future implementation will update Plan Critic scoring and synthetic weak-plan proof.

## Details
This is a tight V1 follow-up card: scope the rule now, implement only after verifier independence. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth: `lib/process-plan-critic.js`, `scripts/process-plan-critic-check.mjs`, `plan_critic_runs`, and existing synthetic strong/weak/broad proof.

Behavior proof must call the actual function path `evaluatePlanCriticPlan`, run a synthetic weak escape-condition plan through a real Plan Critic API/DB round-trip, and prove the result is `revise`. Substring-only proof is rejected; the checker must inspect Plan Critic findings and score.

Gate decision: static proof is enough for this scoping card, focused proof is required for the synthetic Plan Critic update, and full proof is required only if the implementation touches canonical verifier/database/package substrate. The blast radius stays proportional.

Operator value for Steve and the team: this unlocks repair quality by catching symptom patches early without making every fast fix slow or ceremonial.

## Risks
Risk is making Plan Critic vague or annoying. The repair path is a narrow rule: only plans that alter verifiers/dashboard warnings or add bypass conditions need explicit root-invariant proof.

## Tests
- `npm run process:repair-verifier-sprint-check -- --open --json`
- Future implementation proof: `npm run process:plan-critic-check -- --json=true`

## Not Next
Do not implement a broad reviewer framework, do not block all fast fixes, do not build Agent Factory, do not mutate Drive permissions, do not run `MEETING-VAULT-ACL-001` Phase B, and do not use this card to excuse the current skipped process.
