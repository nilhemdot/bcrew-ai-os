# CODEBASE-DE-SLOP-GATE-001 Plan

## What

Add a V1 "de-slop" pre-build gate that upgrades the existing Plan Critic/code-quality layer so AI-generated work has to answer architecture, locality, proof, and split questions before implementation starts.

This card is inspired by the Matt Pocock de-slop codebase extraction, but it should be built as an AIOS-native quality gate, not as a copied external skill.

## Why

Steve is using AI builders as the main implementation force. That only works if the system catches AI slop before it lands: broad changes, oversized files, invented patterns, shallow patches, missing proof, and UI drift.

The operator value is simple: before Codex, Claude Code, Cursor, or any future builder writes code, the system should make the builder prove it understands the existing code shape and the right proof path.

## Acceptance Criteria

- The gate runs against a proposed build plan and changed-file list before implementation.
- The gate asks or verifies at least these plain-English checks:
  - What existing files/modules/patterns will be reused?
  - Which files are at risk of becoming too large or mixed-purpose?
  - What is the smallest coherent change?
  - What should be split into a module instead of added to a root file?
  - What proof proves behavior, not just text markers?
  - Does this touch UI, and if yes, does it follow the locked design contract?
- The gate reuses existing Plan Critic, file-size standard, code-quality audit, and review-gate code instead of creating a parallel reviewer system.
- The focused proof rejects synthetic sloppy plans:
  - broad vague plan with no changed-file scope
  - plan adding behavior to an over-budget file without split/no-new-responsibility posture
  - plan with no real proof command
  - plan claiming UI work without design-contract/browser proof
  - plan that proposes a new pattern while ignoring an existing local pattern
- The focused proof passes a scoped compliant plan.
- The output is report-only unless an explicit future apply path is approved.

## Definition Of Done

- Add a focused domain module for de-slop gate behavior, or extend the existing Plan Critic architecture module without bloating it.
- Add a focused proof script exposed through `package.json`.
- Add dogfood cases that prove the exact sloppy-plan failure modes are rejected.
- Add a source note reference to `docs/source-notes/matt-pocock-de-slop-codebase-2026-05-25.md`.
- Keep the result readable for Steve in plain English.
- Do not close the card unless `node --check`, focused proof, Plan Critic proof, and the appropriate Foundation ship gate pass.

## Details

Existing code/docs to reuse:

- `lib/process-plan-critic.js`
- `lib/plan-critic-architectural-rules.js`
- `lib/foundation-file-size-standard.js`
- `lib/code-quality-nightly-audit.js`
- `lib/backlog-scrum-master-grooming.js`
- `scripts/process-plan-critic-architectural-rules-check.mjs`
- `scripts/process-code-quality-nightly-audit-check.mjs`
- live backlog/Current Sprint truth for card status, ownership, and closeout posture
- `docs/process/plan-critic-architectural-rules-001-plan.md`
- `docs/process/file-size-engineering-standard-001-plan.md`
- `docs/process/review-gate-upgrade-001-plan.md`
- `docs/specs/bcrew-ui-design-contract.md`

V1 should be a pre-build/report gate. It should not start with a large refactor. It should first make the system better at saying "this plan is too sloppy to build yet" and "here is what must be clarified."

Behavior proof must call the actual function path, not string markers:

- run the proposed plan through `evaluatePlanCriticPlan`
- run synthetic bad plans through the same evaluator
- run any de-slop helper through its exported function directly
- prove substring-only/source-marker proof is rejected
- prove report-only mode does not mutate backlog, sprint, DB, source systems, or external systems

Gate decision tree:

- Static gate: `node --check` for touched modules and scripts.
- Focused gate: `npm run process:codebase-de-slop-gate-check -- --json` once implemented.
- Regression gate: `npm run process:plan-critic-architectural-rules-check -- --json` and `npm run process:code-quality-nightly-audit-check -- --json`.
- Full gate: `npm run process:foundation-ship` before closeout, because this touches Foundation process gates, Plan Critic behavior, code-quality audit posture, and future builder workflow.

Reason: static checks are not enough because this changes the process that decides whether future build plans are safe to implement.

## Risks

- Risk: the gate becomes annoying process theater.
  - Repair path: keep it short, focused, and tied to actual changed files and proof commands.
- Risk: it duplicates Plan Critic.
  - Repair path: reuse Plan Critic as the carrier; this card should strengthen the gate, not fork it.
- Risk: it over-blocks useful fast work.
  - Repair path: only fail hard on durable build work, risky files, UI surfaces, write paths, or missing proof.
- Risk: it becomes an agent instead of a guardrail.
  - Repair path: V1 is deterministic/report-only. LLM-assisted review can be a future layer.

## Tests

```bash
node --check lib/process-plan-critic.js lib/plan-critic-architectural-rules.js lib/foundation-file-size-standard.js
npm run process:plan-critic-architectural-rules-check -- --json
npm run process:code-quality-nightly-audit-check -- --json
npm run process:dev-team-intelligence-director-check -- --json
```

```bash
npm run process:codebase-de-slop-gate-check -- --json
```

## Not Next

- Do not auto-refactor the repo.
- Do not create a new autonomous reviewer agent.
- Do not replace Foundation ship gates.
- Do not copy or install external code/skills from Matt Pocock without a separate source/adapter approval card.
- Do not start broad UI cleanup from this card.
- Do not mutate backlog, sprint, or external systems in V1.
