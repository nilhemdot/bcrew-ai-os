# SRC-FUB-001 Level 2 Validation Packet

Date: 2026-04-17
Status: Ready for Steve review
Source: owner-context FUB snapshot visible in `/foundation#source-apis:fub-lead-source-taxonomy`

This packet is the short review layer for `SRC-FUB-001`.

Use it to describe the current working taxonomy state without reopening the whole architecture conversation.

## What Is Already Locked

- `SRC-FUB-001` is readable in the rebuild and visible in Foundation
- the owner/support and Steve FUB contexts are both healthy
- the source manager is using a real saved snapshot, not fake sample data
- invalid final source placeholders are already being treated as invalid:
  - `<unspecified>`
  - `Sphere`
- the canonical parity rules are now written down in [follow-up-boss.md](../source-notes/follow-up-boss.md)
- company reporting should stay focused on company-owned sources instead of letting agent-branded sources clutter the main company grouping view
- current open-house default is now company unless a clearly agent-owned listing/resource path is proven
- the taxonomy remains editable at any time; open or ungrouped values can be intentional

## What This Review Is For

This review is **not** about:

- whether OpenClaw is right
- whether Harlan should move today
- whether every future agent should be terminal-native

This review **is** about:

- locking the remaining FUB source classifications
- shrinking `ownershipType = unclassified`
- making `SRC-FUB-001` ready for Level 2 sign-off

## Current Snapshot Read

From the current owner-context snapshot after Steve's taxonomy pass:

- total live FUB lead sources: `62`
- current invalid final sources already flagged: `2`
- current sources with any classification still open: `10`
- current sources with ownership still open: `6`
- current sources with marketing still open: `7`
- biggest invalid final source buckets:
  - `<unspecified>`: `13,987`
  - `Sphere`: `610`

That means the main job is not to force every row into a permanent bucket.

The real job is:

- keep company reporting clean
- keep invalid placeholders visible
- let intentionally-open values stay open where that is the right call
- make sure new sources surface for review instead of hiding

## What Steve Already Decided In The Tool

- `Open House` -> company, parked in `Other`
- `Open House – Agent` -> company, parked in `Other`
- `Bought Through Sign Call` -> company
- `FSBO` -> agent
- `<unspecified>` stays invalid
- `Sphere` stays invalid

Those calls are now treated as the current working taxonomy.

## Current Intentionally Flexible State

These are the items still open in the live taxonomy state. Open does **not** automatically mean wrong.

| Source | Count | Current live state | What is still open |
|-------|------:|--------------------|--------------------|
| `Events & Contests` | 451 | ungrouped, ownership open | acceptable to leave open until a stronger rule exists |
| `Cold Call` | 171 | ungrouped/phone-oriented, ownership open | acceptable to leave open until a stronger rule exists |
| `Company Main Call` | 51 | ungrouped, ownership open | acceptable to leave open until a stronger rule exists |
| `FSBO` | 50 | ungrouped, ownership = agent, marketing open | acceptable as an intentionally flexible agent source |
| `Youtube Ad - Chris Amond` | 42 | ungrouped, ownership = agent, marketing open | acceptable as an intentionally flexible agent-branded source |
| `Jeff Thibodeau - Crew Website Newsletter` | 274 | ungrouped, ownership = agent, marketing open | acceptable as an intentionally flexible agent-branded source |
| `Jeff Thibodeau - YouTube Viewer` | 41 | ungrouped, ownership = agent, marketing open | acceptable as an intentionally flexible agent-branded source |
| `Jeff Thibodeau - Facebook` | 38 | ungrouped, ownership = agent, marketing open | acceptable as an intentionally flexible agent-branded source |
| `Apex - Brantford` | 2 | ungrouped, ownership open | acceptable to leave open until more context exists |
| `Expired Listings` | 1 | ungrouped, ownership open | acceptable to leave open until more context exists |
| `<unspecified>` | 13,987 | invalid final source, ownership still technically open | should stay visible and flagged until cleanup/backfill closes |

## Calls That Should Stay Invalid

These should remain invalid final lead sources:

| Source | Count | Why it stays invalid |
|-------|------:|----------------------|
| `<unspecified>` | 13,987 | placeholder, not a true source |
| `Sphere` | 610 | relationship bucket, not a final source |

These need cleanup and normalization, not reclassification into a trusted final source as-is.

## Exact Review Ask For Steve

There is no forced decision pass required right now if the live taxonomy looks the way Steve wants it.

The only standing asks are:

1. confirm that the current flexible/open state is intentional
2. keep invalid placeholders like `<unspecified>` visible
3. decide later only when a source truly needs a stronger rule
4. add visible review when new lead sources appear

## After Steve Signs Off

The next execution sequence is:

1. treat the current taxonomy as the working baseline
2. keep the source manager editable
3. add visible review for newly appearing lead sources
4. move straight into `SRC-FINANCE-001`
