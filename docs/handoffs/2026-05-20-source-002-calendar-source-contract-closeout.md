# SOURCE-002 Google Calendar Source Contract Closeout

Card: `SOURCE-002`
Closeout key: `source-002-calendar-source-contract-v1`
Date: 2026-05-20

## What Changed

- Locked `SRC-GCAL-001` as `V1 Source Boundary Locked`.
- Set validation to `Signed Off For Current Reality`.
- Scoped sign-off to delegated read-side Calendar current-window event context.
- Synced source registry, source lifecycle completion, shared communications notes, focused proof, closeout registry, and verifier coverage.

## What It Does

Calendar now explicitly covers:

- delegated Google Workspace Calendar reads,
- governed `calendar-current-day` event archive,
- scheduled `calendar-sync-current` job proof,
- local `calendar_event` artifacts,
- scheduling/cadence context, organizer/status/link metadata, attendee metadata/counts, and event timing.

It explicitly does not cover:

- Calendar writes,
- event creation/update/delete,
- invites or RSVP handling,
- credential/provider mutation,
- broad calendar extraction,
- event descriptions, raw notes, invite bodies, or attachments,
- meeting-note/transcript/decision/discussion truth.

## Proof

- `node --check lib/source-002-calendar-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-002-check.mjs`
- `npm run process:source-002-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-002 --planApprovalRef=docs/process/approvals/SOURCE-002.json --closeoutKey=source-002-calendar-source-contract-v1 --commitRef=HEAD`

## Known Limits

- This does not write to Calendar or send invites.
- This does not mutate Calendar credentials, OAuth scopes, provider config, or Drive permissions.
- This does not approve broad private Calendar extraction.
- This does not make Calendar a replacement for meeting notes, transcripts, decisions, or discussion truth.

## Review Next

Continue `SOURCE-003` or the next safe Foundation card in live sprint order.
