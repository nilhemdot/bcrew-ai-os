# SKILL-IMPROVER-GSTACK-ENRICHMENT-001 Plan

## What

Extract GStack skill-discipline patterns into proposal-only AIOS Skill Improver enrichment.

## Why

The old system failed partly because too many tasks became agents/skills instead of code. GStack has useful skill routing and workflow ideas, but AIOS must only adopt patterns that preserve code-first boundaries and reviewability.

## Acceptance Criteria

- The scorecard includes skill routing and specialist workflow evidence from GStack paths.
- Skill Improver enrichment recommends checks for when a skill should exist, stay silent, route to code, and require proof.
- The proof verifies no skill files are written and no GStack skills are copied.
- The proof calls the actual function path and rejects substring-only proof.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- Skill Improver enrichment appears in the GStack Build Intel snapshot.
- Research Inbox proposals route related lessons to `SKILL-IMPROVER-001` / `SKILL-IMPROVER-GSTACK-ENRICHMENT-001`.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/gstack-build-intel.js`, `lib/research-inbox.js`, existing skill instructions, AGENTS rules, Current Sprint helpers, and Plan Critic. Existing docs to reuse: GStack packet, current plan, current state, and GitHub build intel source note. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: skill improvement proposals must reduce drift, not add agent sprawl. The proof should validate `writesSkills=false`, `defaultToCode=true`, proposal-only Research Inbox rows, and no code import through structured function output. No substring-only proof is acceptable.

This is a narrow V1 card: create Skill Improver enrichment proposals only, not active skill edits. It does not write skill files, install GStack skills, create new autonomous agents, or change AGENTS.md. The behavior proof uses the actual function path, a black-box API-style round-trip over enrichment rows, and a synthetic no-write/no-import case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because skill doctrine affects future builder behavior; the focused gate is `npm run process:gstack-build-intel-check -- --card=SKILL-IMPROVER-GSTACK-ENRICHMENT-001 --json`; the full gate is required because blast radius includes skill-improvement doctrine, verifier-visible output, Research Inbox proposal contracts, and Foundation closeout truth. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets a workflow that uses GStack to improve AIOS builder discipline without resurrecting the old agent sprawl. This unlocks speed and quality for the team because future skill changes must justify why they are not deterministic code.

Speed bound: the focused proof is fast, thin, and proportional to this card; it should run under 2 minutes and avoid another heavy skill rewrite lane.

## Risks

- Copying GStack skills could import another operator's assumptions. Repair path: keep all outputs proposal-only and fail if writesSkills becomes true.
- More skills can hide deterministic code work. Repair path: every proposed skill check asks whether the work could be code.
- Skill Improver can be premature. Repair path: route as enrichment for later review, not active mutation.

## Tests

- `npm run process:gstack-build-intel-check -- --card=SKILL-IMPROVER-GSTACK-ENRICHMENT-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- This V1 is bounded to proposal-only enrichment.
- Do not edit active Codex skills.
- Do not install GStack skills.
- Do not create new autonomous agents.
- Do not change AGENTS.md from this card.
