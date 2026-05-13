# REVIEW-GATE-UPGRADE-001 Plan

## What

Extract GStack review-gate patterns into AIOS proposal-only review/checklist upgrades.

## Why

AIOS already values proof gates. GStack's review checklists show useful ways to catch production bugs, frontend slop, security issues, and ship gaps, but the right AIOS move is deterministic gates first, not another reviewer-agent org chart.

## Acceptance Criteria

- Review gate scorecard rows cite GStack review, design-review, QA, and ship evidence.
- The output recommends review gates as code/checklists first and records `newAgentRequired=false`.
- The proof validates review-gate recommendations through structured function output.
- The proof rejects substring-only proof and fails if review-gate output writes backlog automatically.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- Review gate upgrade appears in the GStack Build Intel snapshot.
- Related proposals route to `REVIEW-GATE-UPGRADE-001` and verifier/process cards through Research Inbox.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/gstack-build-intel.js`, `lib/research-inbox.js`, Plan Critic, verifier gate tiering, Current Sprint helpers, and build-log patterns. Existing docs to reuse: GStack packet, current plan, current state, and GitHub build intel source note. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: review gates should improve evidence quality without adding agent theater. The proof should validate `gatesAsCodeFirst=true`, `newAgentRequired=false`, path evidence, Research Inbox routing, and unchanged backlog counts. No substring-only proof is acceptable.

This is a narrow V1 card: extract review-gate recommendations as proposal-only checklist/code-first upgrades. It does not create reviewer agents, replace existing ship gates, require browser QA for backend-only work, or open UI polish. The behavior proof uses the actual function path, a black-box API-style round-trip over structured review-gate output, and a synthetic no-backlog-write case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because process/review doctrine can affect future shipping; the focused gate is `npm run process:gstack-build-intel-check -- --card=REVIEW-GATE-UPGRADE-001 --json`; the full gate is required because blast radius includes verifier/process doctrine, API-visible output, build-log closeout, and Foundation verifier coverage. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets stronger quality gates without another reviewer-agent org chart. This unlocks speed and quality for the team because future review upgrades become deterministic proof paths before any LLM judgment is considered.

Speed bound: the focused proof is fast, thin, and proportional to this card; it should run under 2 minutes and avoid another heavy process layer.

## Risks

- Review gates can become process drag. Repair path: keep the focused proof fast and tie gates to changed-file scope.
- Specialist names can become fake agents. Repair path: keep review gates as checklists/proof paths unless LLM judgment is truly required.
- Frontend review can distract from backend sprints. Repair path: only require browser/design review when UI files or UI behavior change.

## Tests

- `npm run process:gstack-build-intel-check -- --card=REVIEW-GATE-UPGRADE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- This V1 is bounded to proposal-only review-gate enrichment.
- Do not create reviewer agents.
- Do not require browser QA for backend-only cards.
- Do not replace existing ship gates.
- Do not open UI polish work from this card.
