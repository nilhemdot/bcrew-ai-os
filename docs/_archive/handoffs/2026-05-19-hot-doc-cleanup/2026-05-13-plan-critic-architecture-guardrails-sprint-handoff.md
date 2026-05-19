# Plan Critic Architecture Guardrails Sprint Handoff - 2026-05-13

Live sprint ID: `plan-critic-architecture-guardrails-2026-05-13`.

## Sprint Goal

Prevent the rebuild from repeating architecture rot by making Plan Critic reject risky plans before implementation.

## Card

1. `PLAN-CRITIC-ARCHITECTURAL-RULES-001`

## Process Guardrail

- The sprint was opened in live DB first with the card in Scoping.
- Doctrine and a Plan Critic pass row must exist before the card moves to Sprint Ready.
- Build only this card.
- Stop at sprint review when it closes.

## Required Dogfood

The focused proof must reject synthetic plans that recreate the deep-audit failure modes:

- adding to a file over 5,000 lines without a split plan
- adding write paths to a check script without explicit `--apply` posture
- touching live state from verifier/check paths
- claiming an audit fix without dogfood proof
- omitting focused proof

The proof must also show a compliant architecture plan still passes.

## Not Next

- No Foundation Hub performance fix.
- No monolith split/refactor.
- No Build Intel extraction.
- No product, hub, customer, or agent feature work.
- No broad verifier rewrite.

