# Google Calendar Atom Schedule Closeout

Date: 2026-05-16
Sprint: `gcal-atom-schedule-2026-05-16`
Card: `GCAL-ATOM-SCHEDULE-001`
Closeout key: `gcal-atom-schedule-v1`

## What Changed

Google Calendar is now a governed read-only source lane instead of a readable-only connector note.

- Added `calendar-current-day` extraction target for `SRC-GCAL-001`.
- Added scheduled Foundation job `calendar-sync-current`.
- Added `scripts/sync-calendar-events.mjs` for bounded Calendar event reads.
- Routed the target through `scripts/run-extraction-target.mjs`.
- Added Calendar target seed data, source lifecycle coverage, source completion coverage, and job mutation allowlist coverage.
- Updated connector registry and source registry wording to say Calendar is scheduled as a read-only archive.

## Proof

Commands run:

```bash
npm run extraction:control-seed
npm run calendar:sync-events -- --dryRun=true --json --limit=3
npm run extraction:target -- --target=calendar-current-day --dry-run=true
npm run extraction:target -- --target=calendar-current-day --force=true --actor=codex-gcal-atom-schedule
npm run process:gcal-atom-schedule-check -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=GCAL-ATOM-SCHEDULE-001 --planApprovalRef=docs/process/approvals/GCAL-ATOM-SCHEDULE-001.json --closeoutKey=gcal-atom-schedule-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=GCAL-ATOM-SCHEDULE-001 --closeoutKey=gcal-atom-schedule-v1
npm run process:foundation-ship -- --card=GCAL-ATOM-SCHEDULE-001 --planApprovalRef=docs/process/approvals/GCAL-ATOM-SCHEDULE-001.json --closeoutKey=gcal-atom-schedule-v1 --commitRef=HEAD
```

Focused proof passed. The live bounded archive run selected 9 Calendar events, archived 9 internal artifacts, and recorded 0 crawl item failures.

## Dogfood

The focused proof removes `calendar-current-day` from a synthetic source lifecycle payload and confirms the old failure reappears: Calendar becomes readable but unscheduled and the approved target baseline fails. The real source lifecycle accepts 13 governed targets with Calendar present.

## Boundaries

Not included:

- No Google Calendar writes, invites, event updates, event deletes, or RSVP automation.
- No Calendar descriptions, raw notes, attachments, or body text archived.
- No LLM candidate extraction from Calendar events.
- No Google OAuth scope change or credential rotation.
- No Skool, MyICOR, Loom, paid source extraction, Build Intel implementation, hub feature work, Canva asset mutation, or Drive permission mutation.

## Next

Continue the no-auth connector completion queue only if system health stays clean. Auth-gated source work remains Steve-approval work.
