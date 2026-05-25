# DEV-BUILD-OPPORTUNITY-SCOPER-001 Plan

## What

Build the proposal-only Dev Build Scoper contract for Dev Intelligence Director recommendations.

This is the missing layer between "the Director found a promising idea" and "the Portfolio/Sprint Master can compare scoped build opportunities." It replaces the useful part of the old Implementation Scoper agent with a code-owned contract and proof.

Working name: Dev Build Scoper.

## Why

The Director now ranks build candidates from God Mode extraction and other Foundation intelligence sources. That is not enough to approve work. A ranked idea still needs build scope: what exactly gets built, which existing code it touches, what proof is required, what is not next, what could go wrong, and which source evidence supports it.

Correct flow:

`Director recommendation -> Dev Build Scoper -> Build Portfolio/Sprint Master -> Steve approval/promotion -> queue/sprint`

Plain English: the Director says "this looks valuable." The Dev Build Scoper says "here is what it would actually take to build safely." Portfolio then compares scoped ideas, merges overlap, and proposes queue order.

## Acceptance Criteria

- Reads Director recommendations as inputs only, not approvals.
- Produces proposal-only scoped build candidates.
- Requires source lineage before any candidate can be called scoped.
- Requires at least one raw intelligence atom or evidence hit before any candidate can be called scoped; a Director summary alone is not enough.
- Requires resource link disposition for YouTube/video-derived recommendations when description/resource links exist. Safe public repo/docs links should be resolved by the approved resolver; Skool, Gumroad, short links, downloads, paid, login, opt-in, and private links stay blocked until source-packet approval.
- Requires codebase research refs before any candidate can be called scoped.
- Requires proof refs or proof commands before any candidate can be called scoped.
- Requires acceptance criteria, definition of done, risks, not-next boundaries, and existing work to reuse.
- Returns unresearched or generic candidates for deeper Scoper research.
- Parks paid/private/auth/source-packet candidates before Portfolio promotion.
- Outputs a Portfolio-compatible candidate only when the scope is complete enough.
- Does not make Steve manually chase source links. The Scoper either resolves approved public resource links or names the exact blocker/approval needed.
- Does not create backlog cards, open sprints, approve work, start extraction, call providers, or write externally.

## Definition Of Done

- Add `lib/dev-build-opportunity-scoper.js` as the behavior owner.
- Add `scripts/process-dev-build-opportunity-scoper-check.mjs` as the focused proof.
- Add package script `process:dev-build-scoper-check`.
- Update `docs/rebuild/current-plan.md` so named flow includes Dev Build Scoper before Portfolio.
- Focused proof dogfoods:
  - researched Director candidate becomes a complete scoped portfolio candidate
  - researched-looking candidate without a raw atom/evidence hit is rejected as not truly scoped
  - YouTube/video-derived candidate with unreviewed description/resource links is rejected until link disposition is present
  - unresearched Director candidate returns to Scoper/research
  - paid/auth candidate parks before promotion
  - no output writes backlog, opens sprint, auto-approves, or writes externally

## Relationship To Existing Work

Reuse:

- `lib/dev-team-intelligence-director.js` for Director candidate shape and source trust fields.
- `lib/build-portfolio-scrum-master.js` for the Portfolio completeness gate and portfolio decisions.
- `lib/implementation-intelligence.js` and `docs/process/internal-scoper-001-plan.md` for 7-section scoping doctrine.
- old-system evidence in `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-implementation-scoper/SKILL.md` for the useful role boundary.

This does not replace the Strategic Intelligence Scoper. It is the Dev build-opportunity Scoper for system-build candidates.

## Not Next

- Do not create backlog cards automatically.
- Do not ask Steve to approve raw Director recommendations.
- Do not treat "ready for Scoper" as "ready for sprint."
- Do not run paid/private/auth source extraction.
- Do not turn this into an always-on old-system agent.
- Do not call an LLM/provider in V1 proof.

## Tests

- `node --check lib/dev-build-opportunity-scoper.js`
- `node --check scripts/process-dev-build-opportunity-scoper-check.mjs`
- `node --check scripts/process-dev-build-scoper-evidence-trace-check.mjs`
- `npm run process:dev-build-scoper-check -- --json`
- `npm run process:dev-build-scoper-evidence-trace-check -- --json`
