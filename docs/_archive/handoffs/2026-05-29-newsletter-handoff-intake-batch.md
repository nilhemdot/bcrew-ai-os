# Newsletter Handoff Intake Batch

Date: 2026-05-29
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `creator-newsletter-handoff-intake-batch-v1`

## What Changed

YouTube-discovered newsletter rows now route through `newsletter:intake` instead of the generic public page reader.

Old generic source-browser page reads no longer satisfy newsletter source-stack readiness. Those rows become `newsletter_intake_upgrade_needed` until a no-submit newsletter intake packet is persisted.

## Live Run

Command:

```bash
npm run source:youtube-handoff -- --apply --json --bucket=creator-newsletters --max-runs=16 --row-limit=1000
```

Result:

- 16 creator-newsletter rows selected.
- 16 source crawl items persisted.
- 3 rows produced `newsletter_intake_ready_dry_run`.
- The remaining rows were parked as blocked or not actual newsletter signup pages.
- No external newsletter signup was submitted.
- No download, purchase, post, message, credential mutation, backlog write, provider call, or Scoper promotion occurred.

## Current Truth

- Source handoff queue is drained again: 0 runnable rows.
- Creator-newsletter readback now shows 3 read and 13 parked.
- The 3 safe forms are ready for the separate live signup plus Gmail confirmation-readback lane.
- This slice does not claim subscribed status or recurring newsletter issue extraction.

## Proof

- `node --check lib/source-god-mode-youtube-handoff.js lib/foundation-build-closeout-source-records.js`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run source:youtube-handoff -- --json --bucket=creator-newsletters --max-runs=20 --row-limit=1000`
- `npm run source:youtube-handoff -- --apply --json --bucket=creator-newsletters --max-runs=16 --row-limit=1000`
- `npm run process:dev-team-hub-v0-check -- --json`

## Next

When Steve is awake or an approved operator policy is active, pick one of the 3 safe newsletter forms for a real live signup, then run Gmail confirmation readback before claiming subscribed status or extracting newsletter issues.
