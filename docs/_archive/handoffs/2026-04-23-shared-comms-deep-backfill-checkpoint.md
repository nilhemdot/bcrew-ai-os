# Shared Comms Deep Backfill Checkpoint

Date: 2026-04-23

Type: checkpoint handoff

## Why This File Exists

Shared communications moved from “the pipes basically work” to “there is enough real archive to use.”

This handoff captures what is now true, what is still open, and what the next block should actually do.

## What Closed In This Block

- Google Drive meeting scans no longer stop at the first page of results.
- Slack channel history no longer stops at the first page of results.
- Team-wide meeting archive now reflects a real multi-month delegated backfill instead of a shallow recent slice.
- Transcript gap reporting is durable via `npm run meeting-notes:report-gaps`.
- Crewbert meeting organization is live as a copy-mode mirror into Crewbert Drive.
- Governed shared-candidate extraction is live across meetings, Gmail, Missive, and Slack.

## Commits In This Block

- `8ac0218` — deepen shared comms backfill coverage
- `96f5d59` — widen governed comms extraction passes

Earlier prerequisite commits in the same arc:

- `f0205a7` — expand governed extraction across shared communications
- `fe779ad` — classify meeting shape at capture time
- `56bb2cb` — verify Slack and archive shared threads
- `4315189` — extract Slack candidates into governed queue
- `b61677a` — JWT team-wide meeting pull and canonical artifact model

## Current Archive Reality

Snapshot at checkpoint:

- Meetings:
  - `408` note artifacts
  - `300` transcript artifacts
  - `405` unique meetings
- Slack:
  - `1371` archived threads

Meeting archive month coverage now reaches:

- `2026-04`
- `2026-03`
- `2026-02`
- `2026-01`
- plus one stray `2025-08` artifact

This means the 90-day strategy window is materially covered.

It does **not** yet prove that the archive naturally reaches the merger window in October 2024.

## Current Candidate Reality

Snapshot at checkpoint:

- Meeting candidates pending:
  - `471` task
  - `127` feedback
  - `60` decision
  - `41` blocker
  - `340` atom
- Slack candidates pending:
  - `29` task
  - `3` feedback
  - `1` decision
  - `10` blocker
  - `40` atom

This is enough volume to use for Sunday strategy prep, but it also means the review/apply/read side needs discipline rather than more ingestion sprawl.

## Meeting-System Truth Now

### What the system does

- impersonates the enabled BCrew user list via delegated Google reads
- scans each user’s meeting artifacts
- prefers standalone transcript docs over embedded transcript sections
- archives notes and transcripts into PostgreSQL
- mirrors organized copies into Crewbert Drive in copy mode
- tags meetings as `broadcast` or `discussion`
- extracts governed candidates from transcript text with Foundation context

### What it does not do yet

- enforce subject-person redaction on read/query paths
- strip original Drive ACLs
- guarantee transcript creation for every organizer going forward
- prove merger-era archive depth back to October 2024

## Transcript Gap Reality

Worst owners right now:

- `blake.berfelz@bensoncrew.ca` — `38/119` missing
- `nick.bergmann@bensoncrew.ca` — `36/61` missing
- `steve.zahnd@bensoncrew.ca` — `23/115` missing

Worst recurring series:

- `Leadership Check In - 30 Mins` — `13/13` missing
- `Mustafa & Nick regroup` — `10/10` missing
- `Roland / Blake 1 on 1` — `9/9` missing
- `Budget Review` — `7/14` missing
- `Katlyn & Nick - 1-on-1` — `7/12` missing
- `Nick & John - Sales Leadership prep` — `7/8` missing
- `Mid-Week Marketing Checkin` — `5/5` missing

The likely live problem is no longer “bad adapter reads.”

The likely live problem is organizer/default behavior and per-meeting transcript availability.

## Slack Reality

The existing bot is still the one to use:

- `@bcrew_intel_scout`

What is true now:

- the bot sees the ops Slack workspace well enough to archive at scale
- accountability coverage is satisfied by the actual channel naming variant
- the rollout still needs the last unreadable channels invited instead of treating Slack as universally readable

## Backlog / Doctrine Updates From This Checkpoint

Existing cards tightened:

- `SOURCE-018`
- `SOURCE-019`
- `SOURCE-020`

New architectural backlog cards added:

- `PLATFORM-INTEL-001`
- `CRM-OWNERSHIP-001`

These are real future-architecture cards, but they are **not** the main thing before Sunday.

## Recommended Next Sequence

1. Verify the forward-looking meeting fix.
   - check each organizer’s most recent meetings after the Gemini default change
   - identify who is still failing

2. Use the archive for Sunday strategy prep.
   - meetings + Slack first
   - synthesize open decisions, blockers, recurring themes, contradictions, and strategy evidence

3. Build read-side privacy next.
   - subject-person redaction
   - uniform summary response shape
   - no raw self-sensitive leakage

4. Only then decide whether the merger-era pull should come from:
   - older Google Meet artifacts
   - Gmail/Drive historical founder threads
   - or both

## Important Boundary

Do not confuse “organized Crewbert mirror exists” with “privacy model is done.”

Current Crewbert meeting organization is:

- copy mode
- archive/organization only
- no original-file ACL surgery

That is the correct risk posture until the read-side privacy model is enforced.
