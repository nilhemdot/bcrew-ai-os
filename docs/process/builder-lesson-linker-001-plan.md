# BUILDER-LESSON-LINKER-001 Plan

## What

Map builder implementation lessons to existing Foundation cards as Research Inbox enrichment proposals.

## Why

Steve clarified that the YouTube builders are mainly useful for how to implement ideas that already exist. The system should attach those lessons to current backlog cards instead of creating uncontrolled new work.

## Acceptance Criteria

- Linker accepts normalized builder lesson inputs with source refs, takeaways, implementation patterns, evidence links, and keywords.
- Linker maps lessons to existing card candidates using deterministic title/summary/keyword matching for v1.
- Output uses Research Inbox `enrich_existing_card` proposals by default.
- New-card proposals are allowed only when no card match passes threshold and remain proposal-only.
- Proof covers matched enrichment, no-match proposal, invalid lesson rejection, and no automatic backlog mutation.
- `BUILDER-LESSON-LINKER-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Reusable linker functions exist and call the Research Inbox proposal path.
- Focused proof verifies that builder lessons enrich existing cards instead of inflating backlog by default.
- The sprint closeout names Build Intel Extraction Implementation as the next source of real lessons, not part of this no-auth sprint.

## Existing Work To Reuse

Reuse `lib/research-inbox.js`, `lib/build-intel-watchlist.js`, thin-card detection, live backlog rows, and multimodal extractor contract fields for evidence and source boundaries.

## Details

Existing code to reuse: Research Inbox validation/proposal functions, creator watchlist entries, multimodal extractor contract fields, live backlog readers, thin-card detector output, and the focused `process:implementation-intelligence-check` script. Existing docs to reuse: this plan, sprint plan, build-intel direction capture, current plan/state, and Build Intel intake plans. Existing backlog truth to reuse: `RESEARCH-INBOX-001`, `CREATOR-WATCHLIST-001`, `MULTIMODAL-EXTRACTOR-001`, `YOUTUBE-SCOUT-001`, and live card titles/summaries.

V1 is bounded to deterministic lesson-to-card matching with proposal-only output. The black-box behavior proof must call the actual linker function path with synthetic builder lessons and a synthetic weak plan/no-match lesson, inspect matched-card scores, inspect the Research Inbox `enrich_existing_card` proposal, inspect a no-match `needs_steve_review`/new-card proposal, and compare live backlog counts before/after. No substring-only proof is acceptable.

## Root Invariant

Builder content improves implementation quality of existing cards first. It does not become an autonomous idea generator.

## Risks

- Deterministic matching can be shallow. Mitigation: v1 includes candidate scores and confidence; future LLM scoping can review, not mutate.
- Lessons may cite paid/private content. Mitigation: source type and access boundary stay in the proposal and paid extraction is blocked in this sprint.

## Gate Decision

Gate decision tree: static gate is not enough because this maps implementation lessons, focused gate proves mapping and Research Inbox output, and full gate runs with the sprint because the blast radius touches Build Intel planning and verifier coverage. The focused gate must run in under 2 minutes and prove behavior through the Research Inbox function path; `process:foundation-ship` remains required before push.

## Repair Path

If mapping is noisy, lower confidence and require human review instead of card enrichment. If any backlog write happens, revert and keep this card open.

## Operator Value

Steve can use builder videos as implementation guidance for existing Foundation work without creating a bigger backlog mess.

## Tests

- `npm run process:implementation-intelligence-check -- --card=BUILDER-LESSON-LINKER-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not run external extraction.
- Do not create backlog cards automatically.
- Do not build an LLM Build Scoper agent in this sprint.
