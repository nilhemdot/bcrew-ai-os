# GCAL-ATOM-SCHEDULE-001 Plan

Card: `GCAL-ATOM-SCHEDULE-001`
Sprint: `gcal-atom-schedule-2026-05-16`
Closeout key: `gcal-atom-schedule-v1`

## What

Schedule Google Calendar as a governed, read-only, atom-producing source lane.

This card adds the smallest Calendar current-window extraction path: read bounded Calendar events through the existing delegated Google Workspace client, archive safe event metadata into Foundation shared communication artifacts, register the extraction target, and make the source lifecycle/connector health layers show Calendar as intentionally scheduled. The gate stays fast and proportional: one focused proof plus the full ship gate because this touches source/extraction/runtime truth.

## Why

`SRC-GCAL-001` is readable today, but connector health still says Calendar is not scheduled as an atom-producing source. That is hidden source drift. Calendar should either have an explicit governed schedule or an explicit readiness-only decision. Because credentials are already available and the work is no-auth, the right next move is to schedule the small read-only lane.

Operator value: Steve and the team should be able to trust that meeting cadence and Calendar context can flow into Foundation without asking whether the connector is only theoretically readable.

## Acceptance Criteria

- Add a `calendar-current-day` extraction target for `SRC-GCAL-001` with bounded window, item cap, runtime budget, dedupe policy, and source IDs.
- Add a scheduled Foundation job that runs the Calendar target through `scripts/run-extraction-target.mjs`.
- Add a read-only Calendar sync script that reads events and writes only internal Foundation artifacts/crawl ledger rows.
- Preserve Calendar privacy boundaries: no event descriptions/raw notes, no calendar mutation, no invites, no event updates, no deletes.
- Update source lifecycle/source completion rules so Calendar schedule/freshness is visible instead of hidden in connector notes.
- Update connector credential registry wording so Calendar no longer claims the blocker is lack of atom schedule.
- Focused proof dogfoods the old failure: a synthetic/readable-but-unscheduled Calendar setup fails, while the real scheduled target/job passes.

## Definition Of Done

- Plan Critic score is 9.8+ before build proceeds.
- Current Sprint moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps.
- Focused proof validates approval integrity, Plan Critic, job registration, target registration, read-only posture, lifecycle coverage, and runner dry-run behavior.
- `scripts/process-gcal-atom-schedule-check.mjs` is read-only by default and does not require `--apply` because it never writes live backlog, sprint, DB, files, or source-system state.
- A live or dry-run Calendar target proof is recorded without mutating Google Calendar.
- Full Foundation ship gate passes before push.

## Details

Implementation surfaces:

- Reuse existing code, existing docs, existing scripts, live backlog truth, and Current Sprint truth rather than creating a separate scheduler model.
- `lib/google-delegated.js` may expose additional read-only Calendar fields such as `updated`, `htmlLink`, `organizer`, and `status`.
- `scripts/sync-calendar-events.mjs` reads a bounded event window and archives safe event metadata.
- `scripts/run-extraction-target.mjs` receives the `calendar-current-day` runner.
- `scripts/seed-extraction-control.mjs` seeds the `calendar-current-day` target.
- `lib/foundation-jobs.js` defines the scheduled `calendar-sync-current` job.
- `lib/foundation-job-mutation-allowlist.js` allowlists the scheduled job as internal operational writes only.
- `lib/source-lifecycle.js` and `lib/source-lifecycle-completion.js` treat Calendar as covered by the new target.
- `lib/connector-credential-registry.js` reports Calendar as scheduled for read-only current-window archive.
- `scripts/process-gcal-atom-schedule-check.mjs` owns the focused proof.

Behavior proof:

- The focused proof calls actual function paths and real process paths: `getFoundationJobDefinitions()`, `getExtractionControlSnapshot()`, `buildSourceLifecycleCompletionStatus()`, the Calendar runner dry-run, and `listCalendarEvents()` dry-run behavior.
- It uses a synthetic failing Calendar setup with the target removed to reject the old readable-but-unscheduled failure.
- No substring-only proof is accepted; source text checks are allowed only for the specific Calendar mutation-token guard.
- Gate decision tree: code syntax checks are static where appropriate, the focused proof covers the Calendar invariant, and the full ship gate is required because the blast radius includes source lifecycle, extraction control, runtime jobs, package scripts, and source-health surfaces.

## Risks

- Risk: turning Calendar access into a write-capable assistant lane.
  - Guard: this card only imports the read helper, uses Calendar events list reads, and proof rejects Calendar mutation tokens.
- Risk: storing sensitive meeting notes or descriptions.
  - Guard: archive only summary, start/end, location, attendee count/list, organizer/status/link metadata; no descriptions or raw notes.
- Risk: creating another scheduled job that silently fails.
  - Guard: route through the existing extraction target ledger and Foundation job staleness surfaces.
- Risk: treating a schedule as candidate extraction quality.
  - Guard: this card archives source-backed event artifacts only. LLM candidate extraction or department briefs remain follow-on work.

## Tests

```bash
node --check scripts/sync-calendar-events.mjs
node --check scripts/process-gcal-atom-schedule-check.mjs
npm run extraction:control-seed
npm run calendar:sync-events -- --dryRun=true --json --limit=3
npm run extraction:target -- --target=calendar-current-day --dry-run=true
npm run process:gcal-atom-schedule-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=GCAL-ATOM-SCHEDULE-001 --planApprovalRef=docs/process/approvals/GCAL-ATOM-SCHEDULE-001.json --closeoutKey=gcal-atom-schedule-v1 --commitRef=HEAD
```

## Not Next

- No Google Calendar write, invite, update, delete, or RSVP automation.
- No Skool, MyICOR, Loom, paid source extraction, or Build Intel implementation.
- No Marketing/Hub feature work.
- No broad Google OAuth change or credential rotation.
- No LLM candidate extraction from Calendar events in this card.

## Repair Path

If Calendar event reads fail due provider auth or scope, leave `SRC-GCAL-001` readable-only with a clear source-health blocker and do not fake schedule health. If event privacy is too sensitive for v1, keep the target registered but paused with the decision captured in the backlog and connector registry.
