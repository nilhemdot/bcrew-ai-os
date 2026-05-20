# SOURCE-002 Google Calendar Source Contract Plan

## What

Close `SOURCE-002` by signing off `SRC-GCAL-001` for current Foundation read-side use.

This card updates Google Calendar from readable / scheduled archive posture to a locked V1 source boundary. The approved current reality is narrow: delegated Google Workspace Calendar reads, governed `calendar-current-day` event archive, scheduled `calendar-sync-current` proof, and local `calendar_event` artifacts.

It does not approve Calendar writes, invites, RSVP handling, event creation/update/delete, credential mutation, broad calendar extraction, Drive permission mutation, or treating Calendar as meeting-note / transcript / discussion truth.

## Why

Calendar is already producing source-backed local artifacts, but the source contract still said `Not Signed Off`. That mismatch makes the source layer less trustworthy than the actual governed lane and leaves future builders guessing whether Calendar owns scheduling context, meeting content, or both.

Steve needs Calendar to be usable as current cadence and scheduling context without turning it into a write-capable assistant, broad private calendar crawler, or replacement for meeting notes and transcripts.

## Acceptance Criteria

- `SRC-GCAL-001` is marked `V1 Source Boundary Locked`.
- `SRC-GCAL-001` validation is `Signed Off For Current Reality`.
- The contract explicitly limits sign-off to delegated read-side current-window event reality.
- The contract explicitly blocks Calendar writes, invites, RSVP handling, event create/update/delete, credential/provider mutation, broad calendar extraction, and meeting-note/transcript conflation.
- `calendar-current-day` is active, scheduled, and latest state succeeded with archived events.
- Latest governed `calendar-sync-current` job succeeded recently.
- Calendar event artifacts exist in PostgreSQL with counts only in proof output.
- The DB `source_contract_registry` row is synced to the updated source contract.
- Current Sprint advances to `SOURCE-003` after closeout.

## Definition Of Done

- `process:source-002-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `source-002-calendar-source-contract-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing source contract registry, source lifecycle completion rules, Calendar extraction target, Foundation job registry, shared communications archive, and Current Sprint overlay.

Existing code reused:

- `lib/source-contracts.js`
- `lib/source-lifecycle-completion.js`
- `lib/source-contract-registry-table.js`
- `lib/foundation-jobs.js`
- `scripts/sync-calendar-events.mjs`
- `scripts/run-extraction-target.mjs`
- `scripts/seed-extraction-control.mjs`

Existing docs reused:

- `docs/source-registry.md`
- `docs/source-notes/shared-communications.md`
- `docs/process/gcal-atom-schedule-001-plan.md`
- `docs/process/source-012-source-connector-live-layers-plan.md`
- `docs/process/source-018-google-gemini-meeting-notes-contract-plan.md`

Existing scripts reused:

- `scripts/process-gcal-atom-schedule-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

The focused proof reads only metadata and counts from local PostgreSQL:

- `source_crawl_targets` for `calendar-current-day`,
- `foundation_job_runs` for latest governed Calendar sync job,
- `shared_communication_artifacts` for `calendar_event` counts,
- `source_contract_registry` for synced source-contract truth.

The proof does not print private event descriptions, raw notes, invite bodies, attachments, participant payloads, source URLs, or raw calendar response payloads.

## Behavioral Proof

Dogfood proof rejects the exact false-greens this card must block:

- connector readability alone cannot become source sign-off,
- missing current-window sync cannot become current Calendar truth,
- missing `calendar_event` artifacts cannot satisfy the V1 event archive boundary,
- Calendar write approval cannot sneak into a read-side source contract,
- Calendar cannot become meeting-note / transcript / discussion truth.

Live proof checks the real source contract, DB registry sync, source lifecycle completion row, latest governed Calendar job, target state, and artifact metadata counts through an actual function path and focused process path. The proof is not a string-match verifier: no substring-only proof is accepted, and the process fails unless the live function/API-backed status, dogfood false-green rejections, and local DB metadata all agree.

## Tests

- `node --check lib/source-002-calendar-source-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-002-check.mjs`
- `npm run process:source-002-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-002 --planApprovalRef=docs/process/approvals/SOURCE-002.json --closeoutKey=source-002-calendar-source-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-002 --closeoutKey=source-002-calendar-source-contract-v1`
- `npm run process:foundation-ship -- --card=SOURCE-002 --planApprovalRef=docs/process/approvals/SOURCE-002.json --closeoutKey=source-002-calendar-source-contract-v1 --commitRef=HEAD`

Gate decision tree: static checks are not enough because this changes source trust semantics, DB registry truth, and Current Sprint progression. Focused proof is `process:source-002-check`. Full verification is required because the blast radius touches source contracts, lifecycle completion, registry sync, package scripts, closeout registry, and `foundation:verify`.

Operator value: Steve can trust Calendar as current source-backed cadence and scheduling context while the system still blocks writes, broad calendar exposure, credential mutation, and meeting-content conflation.

Speed bound: the focused proof is metadata-only plus existing fast health gates and should run under 2 minutes.

## Risks

- Risk: this is misread as approval for Calendar writes. Mitigation: contract, source note, dogfood, and closeout all state no writes/invites/RSVPs/event mutation.
- Risk: this becomes broad private calendar extraction. Mitigation: V1 signs off only the existing bounded current-window lane.
- Risk: Calendar is treated as meeting notes or transcripts. Mitigation: source note and proof preserve meeting notes/transcripts as the discussion-content source.
- Risk: private event content leaks into proof output. Mitigation: proof emits counts/status only.

Rollback or repair path: if focused proof fails, do not close the card or advance to `SOURCE-003`. Fix the exact failing proof path and rerun `process:source-002-check`. If later health shows Calendar jobs degraded, run existing governed repair reruns under the approved repair policy or park the blocked action; do not classify broken workflow health as green.

## Not Next

- Do not create, update, delete, invite, RSVP, or otherwise write to Google Calendar.
- Do not mutate Calendar credentials, OAuth scopes, provider config, or source access.
- Do not approve broad calendar extraction outside the existing current-window target.
- Do not archive event descriptions, raw notes, invite bodies, or attachments.
- Do not treat Calendar as meeting-note, transcript, decision, or discussion truth.
- Do not mutate Drive permissions.
