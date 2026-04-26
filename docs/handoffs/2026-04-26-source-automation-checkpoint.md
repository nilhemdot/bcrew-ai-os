# 2026-04-26 Source Automation Checkpoint

## What Changed

- Promoted priority source lanes to the two-lane doctrine:
  - current-day capture for new material
  - daily quota/history/extraction missions until backlog catches up
- Commit pushed: `5e8e89b Schedule source sync and extraction lanes`.
- `foundation:verify` passed `61/61` after the change.
- `ai.bcrew.foundation-worker` was restarted and picked up the new schedules.

## Live Worker Proof

After restart, the worker successfully ran:

- `meeting-notes-sync-current`: daily current meeting sync, succeeded in `18.7s`; selected `6` recent meetings, archived `6` notes and `5` embedded transcripts, `0` crawl failures.
- `slack-sync-current`: daily Slack current sync, succeeded in `149.6s`; `59` readable channels, `2` skipped because the bot is not a member, `5` net-new Slack artifacts.
- `slack-extract-latest`: daily Slack extraction quota mission, succeeded in `26.1s`; processed `1` unmined current-content thread.
- `drive-corpus-inventory-bite`: daily Drive inventory mission, succeeded in `1.4s`; inspected the next Drive folder, found `2` files, `0` failures.
- `gmail-extract-latest`: daily Gmail extraction quota mission, succeeded in `46.6s`; processed `3` unmined threads and found `1` task candidate.
- `missive-extract-latest`: daily Missive extraction quota mission, succeeded in `45.2s`; processed `3` unmined threads.

At checkpoint time, `meeting-transcripts-extract-backlog` was running as the daily meeting transcript extraction mission.

## Current Source Truth

Working and scheduled:

- Gmail current-day sync every `120` minutes.
- Missive current-day sync every `120` minutes.
- Meeting current-day sync daily.
- Slack current-day sync daily.
- Gmail/Missive/meeting/Slack candidate extraction as daily quota missions.
- Drive corpus inventory as a daily quota mission.

Working but not full content understanding:

- Meeting notes/transcripts are archived, but linked videos/recordings are not reviewed yet.
- Drive folders/files are inventoried, but arbitrary Drive file content is not extracted yet.
- Gmail/Missive body sync works, but attachment content extraction is not built yet.

Known counts from the checkpoint:

- Shared artifacts: `5,932` Gmail threads, `3,958` Missive threads, `1,774` Slack threads, `866` meeting notes, `649` meeting transcripts.
- Meeting transcript coverage: `239/863` historical meetings missing transcript artifacts; recent watch since `2026-04-12` has `62` meetings, `41` with transcripts, `21` missing.
- Video-link inventory: `48` Google Drive links, `39` YouTube, `37` Skool, `11` Loom, `1` Zoom awaiting platform-specific review.

## Backlog Promoted Or Enriched

New urgent P0s:

- `DRIVE-CONTENT-001`: Build Drive Docs and PDF content extraction v1.
- `EMAIL-ATTACHMENTS-001`: Archive and extract Gmail and Missive attachments.
- `MEETING-VIDEO-001`: Review videos and recordings linked from meeting notes.

Enriched:

- `RUNTIME-FIRST-JOBS-001`: first scheduled set now includes current-day, extraction quota, and Drive inventory proof; remaining work is monitoring and stronger controls.
- `EXTRACT-CURRENT-001`: Gmail/Missive/meeting/Slack current-day lanes are scheduled; Drive/Skool/video remain corpus/history lanes.
- `EXTRACT-CONTROL-001`: target/item control now supports scheduled lanes; remaining work is operator-facing coverage truth.
- `EXTRACT-BACKFILL-001` and `COMMS-BACKFILL-001`: daily quota missions exist, but historical completeness still needs coverage windows/cursors.
- `SOURCE-019`: shared archive is real, but full corpus understanding is blocked by attachments, Drive file content, and linked meeting videos.

## Audit Work Still Open

Do not block Steve's Current State work on all of these. Treat them as gates before broader assistant/query/user-facing intelligence:

- `SECURITY-001`: exposed MCP secret rotation proof.
- `SECURITY-002`: subject-person redaction and tiered read access.
- `SECURITY-005`: request audit logs, rate limits, origin/CORS posture.
- `SOURCE-023`: retry/backoff, health checks, redacted errors for connectors.
- `DB-SEED-001`: seed/live policy and concurrent CLI deadlock hardening.
- `SYSTEM-010`: kill switches, process controls, decommission workflow.
- `ACTION-ROUTER-001`: route synthesized intelligence into decisions/tasks/questions/actions and track resolution.

## Recommended Next Move

Continue Current State review. The source automation substrate is now good enough to move forward.

Next build lane after Current State should likely be:

1. `DRIVE-CONTENT-001`
2. `EMAIL-ATTACHMENTS-001`
3. `MEETING-VIDEO-001`

Those three directly determine whether strategy work can see the actual supporting documents, attachments, and videos.
