# BUILD-INTEL-OBSERVATION-EXTRACTOR-001 Plan

## What

Extract structured implementation observations from selected Build Intel transcript context and validate them through the multimodal extraction contract.

## Why

Builder videos are valuable because they show how to implement ideas. V1 only has transcript evidence, so it needs to be honest: extract useful implementation observations from text, cite source anchors, and mark missing visual evidence instead of pretending screenshots/keyframes exist.

## Acceptance Criteria

- `BUILD-INTEL-OBSERVATION-EXTRACTOR-001` has a Plan Critic pass row with score at least 9.8 before build.
- The extractor produces structured observations with theme, takeaway, implementation pattern, recommendation, confidence, and source anchor.
- Each output validates as or is wrapped by a multimodal extraction envelope.
- The envelope uses `transcript_text` evidence and explicitly reports screenshots/keyframes as not captured in this no-auth V1.
- The proof fails if any output claims browser screenshot/keyframe evidence without a storage/use boundary.
- The proof calls the actual extractor path, not substring markers.

## Definition Of Done

- A reusable function extracts observations from selected transcript inputs.
- The focused check validates observation count, envelope validation, missing visual evidence notes, and no automatic side effects.
- The backlog card and sprint item close under `build-intel-extraction-implementation-v1`.

## Details

Existing code to reuse: `validateMultimodalExtractionEnvelope`, `lib/multimodal-extractor-contract.js`, selected public transcript context from `searchSharedCommunicationArtifactsForContext`, `buildBuilderLessonLinkerSnapshot`, Current Sprint helpers, and Foundation verifier helpers. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/build-intel-extraction-implementation-2026-05-13-plan.md`, and this plan. Existing scripts to reuse: `process:build-intel-extraction-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog and Current Sprint truth to reuse: `BUILD-INTEL-OBSERVATION-EXTRACTOR-001`, `MULTIMODAL-EXTRACTOR-001`, and `RESEARCH-INBOX-001`.

The root invariant is: transcript-derived Build Intel is useful but incomplete. The behavior proof must call the actual function path and API route through a black-box round trip, validate envelopes, and reject substring-only proof. A synthetic weak case must fail if an observation claims screenshot/keyframe evidence without storage and use boundaries. The system must preserve the transcript-only distinction so future Playwright/screenshot work upgrades evidence instead of rewriting history.

Gate decision tree: static proof is insufficient because this extracts behavior from artifacts and validates envelopes; focused proof is `npm run process:build-intel-extraction-check -- --json`; full proof is required at sprint close with `npm run foundation:verify` and `process:foundation-ship` because the blast radius includes Foundation API/verifier behavior. The focused proof should stay fast, targeting under 2 minutes.

## Risks

- Deterministic extraction can be less nuanced than an LLM. Mitigation: V1 extracts conservative, implementation-oriented observations; future BUILD-SCOPER can add LLM judgment.
- Transcript-only evidence can miss visual stack details. Mitigation: output `visualEvidenceStatus=not_captured_v1` and next work.
- Observations can become action spam. Mitigation: route to proposal-only Research Inbox, not backlog.
- Repair path: if envelope validation fails or visual evidence is overstated, fail closed, leave/reopen the card, and keep observations out of Research Inbox proposals until corrected.
- Operator value: Steve and the team get a useful thing for the real workflow: transcript observations improve implementation quality and unlock faster decisions about when screenshots or paid auth are worth the cost.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not claim screenshot, OCR, or keyframe evidence.
- Do not call an LLM agent for scoping in this sprint.
- Do not create backlog cards automatically.
- Do not build paid/private browser automation.
