# 2026-05-10 Foundation Sprint Capture Handoff

Purpose: preserve the sprint-process and meeting-ACL corrections from Steve's May 10 review so they do not live only in chat.

## Current Truth

- Latest shipped baseline before this capture: `ae8f5ec` for `DRIVE-ACCESS-REQUEST-001`.
- `DRIVE-ACCESS-REQUEST-001` is done for dry-run/preflight only. It sent no emails and made no Google Drive permission mutations.
- `MEETING-VAULT-ACL-001` remains scoped/blocking. Phase B paused; permission mutation is not approved.
- `FOUNDATION-SPRINT-SYSTEM-001` is scoped P0 and owns the Current Sprint overlay/process gates.
- `FOUNDATION-DONE-VELOCITY-001` is scoped P1 and owns the cards-done-per-day/week graph if it cannot be done honestly inside sprint V1.

## Captured Corrections

1. Current Sprint is not a second backlog.
   It is an overlay on live backlog truth with these V1 stages: `scoping`, `sprint_ready`, `building_now`, `done_this_sprint`, and `returned`.

2. Sprint Ready must require an existing-work/doctrine check.
   Required fields: existing code, docs, scripts, policy, reused pieces, not-rebuilt pieces, exact gap, over-broad risk, ready-by, and ready-at.

3. `MEETING-VAULT-ACL-001` must apply existing meeting sensitivity doctrine before any Drive permission mutation packet is approval-ready.
   Training, all-hands, huddles, sales sessions, workshops, and broad team meetings usually stay neutral or positive unless the transcript explicitly contains sensitive people discussion.

4. The strict-policy Phase B packet is evidence only.
   `docs/process/meeting-vault-acl-001-phase-b-approval-packet.md` must not be treated as permission to mutate Drive ACLs.

5. Done velocity is a real requested operator need.
   It should use reliable done-transition or closeout proof dates only, not guessed commit dates or stale seed data.

## Relevant Existing Doctrine

- `scripts/extract-meeting-transcript-candidates.mjs` defines meeting sensitivity prompts and broad-meeting default behavior.
- `lib/shared-candidate-extraction.js` normalizes `subject_people`, `sensitivity`, and `min_tier`.
- `lib/security-access.js` enforces subject-person/tier filtering semantics.
- `scripts/sync-meeting-notes-archive.mjs` preserves meeting sensitivity metadata.

## Not Next

- No Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, researcher, broad corpus/video mining, or real Drive ACL mutation from this capture.
- The next build should either finish/ship `FOUNDATION-SPRINT-SYSTEM-001` after approval or return to the Foundation readiness blocker with the new Sprint Ready rules active.
