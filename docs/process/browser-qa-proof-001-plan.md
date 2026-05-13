# BROWSER-QA-PROOF-001 Plan

## What

Define the browser QA proof expectation for future Foundation/dashboard frontend work.

## Why

Frontend work cannot be trusted only because code compiles. GStack's browser/design workflow shows that UI changes need real browser proof, screenshots or nonblank checks, viewport checks, and interaction proof when relevant.

## Acceptance Criteria

- Browser QA proof standard states when it applies and when it does not.
- Minimum proof includes real browser route open, desktop/mobile screenshot or equivalent viewport proof, nonblank/overlap check, and primary interaction check.
- The proof cites GStack browser/QA path evidence and validates structured output.
- The proof rejects substring-only checks and does not start broad UI polish.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- Browser QA proof standard appears in the GStack Build Intel snapshot.
- The standard enriches `BROWSER-QA-PROOF-001` and related Foundation UI proof cards through Research Inbox.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/gstack-build-intel.js`, browser-use/in-app browser expectations from Codex instructions, Foundation UI proof patterns, Plan Critic, Current Sprint helpers, and build-log patterns. Existing docs to reuse: GStack packet, current plan, current state, and GitHub build intel source note. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: future UI changes need visual/browser behavior proof, but backend-only foundation work should not be slowed by irrelevant frontend gates. The proof should validate `appliesWhen`, `notRequiredWhen`, `minimumProof`, path evidence, and no backlog mutation through an actual function path. No substring-only proof is acceptable.

This is a narrow V1 card: define the browser QA proof standard only. It does not build UI polish, add a new browser runner, make browser proof mandatory for backend-only changes, or copy GStack browser tooling into AIOS runtime. The behavior proof uses the actual function path, a black-box API-style round-trip over structured browser proof output, and a synthetic no-mutation case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because this becomes future UI proof doctrine; the focused gate is `npm run process:gstack-build-intel-check -- --card=BROWSER-QA-PROOF-001 --json`; the full gate is required because blast radius includes API-visible output, verifier-visible snapshot output, current plan/current state doctrine, and Foundation closeout truth. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets a real workflow for trusting frontend/dashboard work when UI changes resume, while backend-only foundation sprints stay lean. This unlocks speed and quality for the team because visual proof is scoped to the work that needs it.

Speed bound: the focused proof is fast, thin, and proportional to this card; it should run under 2 minutes and avoids another heavy frontend review layer.

## Risks

- Browser QA can become mandatory for non-UI work. Repair path: keep explicit not-required conditions.
- Screenshot-only proof can be fake. Repair path: require nonblank, viewport, and interaction checks where applicable.
- Frontend design pipeline can grow too large. Repair path: route design variants/gallery/diff as a proposed future card, not this V1.

## Tests

- `npm run process:gstack-build-intel-check -- --card=BROWSER-QA-PROOF-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not build UI polish.
- Do not add a new browser runner in this card.
- Do not make browser proof mandatory for backend-only changes.
- Do not copy GStack browser tooling into AIOS runtime.
