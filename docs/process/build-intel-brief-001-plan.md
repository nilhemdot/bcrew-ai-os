# BUILD-INTEL-BRIEF-001 Plan

## What

Generate the first Build Intel brief from extracted public transcript observations and expose it through the Foundation API and a sprint handoff report.

## Why

Steve does not need raw transcript dumps. He needs the system to say what the builder intel means for AIOS implementation: what patterns were found, which existing cards they may enrich, what remains blocked, and what the next sprint should do.

## Acceptance Criteria

- `BUILD-INTEL-BRIEF-001` has a Plan Critic pass row with score at least 9.8 before build.
- The brief is generated from actual Build Intel extraction snapshot data.
- The brief includes top themes, selected artifacts, observation count, proposal count, existing-card enrichment targets, blocked paid-source/auth items, and next recommended sprint.
- The brief is saved at `docs/handoffs/2026-05-13-build-intel-extraction-implementation.md`.
- The brief is not a scheduled daily digest, Director agent, or autonomous sprint planner.
- The proof verifies the handoff exists and matches the API snapshot.

## Definition Of Done

- The Foundation API returns a Build Intel extraction snapshot with brief fields.
- The handoff report exists and is generated from the same snapshot.
- The backlog card and sprint item close under `build-intel-extraction-implementation-v1`.

## Details

Existing code to reuse: Build Intel watchlist, multimodal contract, Research Inbox contract, Implementation Intelligence snapshot, live backlog readers, Current Sprint helpers, and Foundation verifier helpers. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/build-intel-extraction-implementation-2026-05-13-plan.md`, and this plan. Existing scripts to reuse: `process:build-intel-extraction-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog and Current Sprint truth to reuse: `BUILD-INTEL-BRIEF-001`, `RESEARCH-INBOX-001`, `YOUTUBE-SCOUT-001`, and the active sprint overlay.

The root invariant is: this brief is a sprint artifact, not a new autonomous daily brief product. The behavior proof must call the actual function path and API route through a black-box round trip, generate the handoff from the same snapshot, and reject substring-only proof. A synthetic weak case must fail if the brief claims scheduled automation, paid-source content, or autonomous sprint opening.

Gate decision tree: static proof is insufficient because the handoff must match API behavior; focused proof is `npm run process:build-intel-extraction-check -- --json`; full proof is required at sprint close with `npm run foundation:verify` and `process:foundation-ship` because the blast radius includes Foundation API, generated docs, and verifier behavior. The focused proof should stay fast, targeting under 2 minutes.

## Risks

- The brief can be mistaken for operational Directors. Mitigation: label it a sprint artifact and no scheduler.
- The brief can overstate transcript-only evidence. Mitigation: include visual evidence status and blocked next work.
- Handoff can drift from API truth. Mitigation: generate from the same snapshot and verify both.
- Repair path: if API and handoff diverge, fail closed, regenerate the handoff from the snapshot, and leave/reopen the card until the focused proof passes.
- Operator value: Steve and the team get a useful thing for the real workflow: a concise Build Intel brief improves implementation quality and unlocks faster next-sprint decisions instead of raw transcript storage.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not schedule a daily Build Intel brief.
- Do not build Master Director or department directors.
- Do not use the brief to open a sprint automatically.
- Do not include paid/private-source content.
