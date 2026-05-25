# SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001 Plan

## What

Create a God Mode maturity plan for every extractor family that feeds Foundation.

Plain English: YouTube is only one source. Meetings, Gmail/Missive, Slack, GitHub, Skool, MyICOR, Google Drive/Meet trainings, communities, and public web links all need a clear extractor capability level so Steve can see what is truly connected and what is still partial.

## Why

The whole AIOS intelligence loop depends on extraction quality. If extractors are weak, the synthesis/router and Directors receive weak signal. If the UI says a source is live but only a thin slice is working, Steve cannot trust the system.

## Extractor Families

Track at least these families:

- YouTube public videos
- YouTube public comments
- YouTube long courses
- public web/resource links
- GitHub/repo intelligence
- Skool free communities
- Skool paid courses/classrooms
- MyICOR paid training
- Google Drive/Meet training recordings/transcripts
- Gmail/Missive
- Slack
- meetings/transcripts
- ClickUp/FUB/KPI/GHL system signals

## Capability Levels

Each family gets a plain-English maturity level:

- `Discovery only` - metadata or link inventory only
- `Readable` - can read/capture text or transcript
- `Eyes/Ears` - can understand video/audio/visuals
- `Hands` - can navigate/click/interact under source rules
- `Brain` - can dedupe/synthesize/rank/route
- `God Mode` - source-appropriate eyes, ears, hands, reading, brain, evidence, and boundaries are all proven

## Acceptance Criteria

- Dev page or Foundation source view shows extractor maturity without jargon.
- Each extractor family has:
  - source owner
  - access boundary
  - current capability level
  - model/brain route
  - cadence
  - latest successful run
  - blockers
  - next card
- The system no longer hides partial extractors behind generic "live" labels.
- Synthesis/router and Director reports include whether source evidence came from discovery-only, readable, eyes/ears, hands, or full God Mode extraction.

## Definition Of Done

- Add a source-family extractor matrix to Foundation/Dev Hub read model.
- Add proof that no extractor can claim God Mode unless the required capability fields are present.
- Add next-card mapping for every partial extractor.

Proof command:

```bash
npm run process:god-mode-extractor-parity-gate-check -- --json
```

## Not Next

- Do not implement every extractor inside this one card.
- Do not approve paid/private/auth crawling.
- Do not mutate external systems.
- Do not turn extractor maturity into fake UI grades; it must come from real proof.
