# SKOOL-SOURCE-SYSTEM-MAP-001 Plan

## What

Build Skool Source System Map V1 under Human Web Agent V1.

Plain English: Skool should not be a blind browser scrape. The first useful slice is to map the four governed Skool targets already known to the system, prove what is blocked or planned, prove that zero Skool content has been extracted, and define the exact packet/session requirements before any runner can log in, join, crawl a classroom, read member/private material, download files, or post/comment/message.

Doctrine: Do not crawl Skool blindly.

## Why

Steve's operating vision is a source system that remembers what exists, what changed, what was extracted, what was ignored, and what was implemented. Skool is one of the important source families, but it carries access, content-use, community, paid/private, and policy boundaries.

This card creates the map layer before the Hands layer:

`Skool target registry -> access boundary -> ledger state -> exact source packet -> source session broker -> Skool runner -> evidence -> Director review`

## Current Live Truth

The live source crawl target registry currently has four governed Skool targets:

- `skool-corpus-backfill`: blocked access-path/policy lane, source note `docs/source-notes/skool-corpus.md`
- `mark-skool-premium-recordings`: blocked paid/auth/member classroom target
- `mark-skool-claudeclaw-classroom`: blocked paid/auth/member classroom target
- `kia-ai-automations-skool-community-public-check`: planned public-read check, no auth, no community crawl, stop if auth is required

There are currently zero Skool `source_crawl_items` rows and zero extracted Skool content rows.

## Acceptance Criteria

- V1 maps the four governed Skool targets from live `source_crawl_targets`.
- V1 records access boundaries: public-read check, paid/auth/member content, and access-path audit.
- V1 proves zero extracted Skool content rows.
- V1 uses `SOURCE-EXTRACTION-STATE-LEDGER-001` as the state model: discovered/metadata/blocked/extracted/review states must be separate.
- V1 defines exact approved source packet requirements before any runner can operate.
- V1 keeps `FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001` as the later execution lane, not this map slice.
- V1 keeps `SOURCE-SESSION-BROKER-001` as the session/auth layer for any future approved Skool run.
- V1 persists one report artifact: `source-system:skool:source-system-map:v1`.
- V1 marks `SKOOL-SOURCE-SYSTEM-MAP-001` done only after the report artifact, backlog closeout note, current docs, coverage registration, and proof script pass.
- This slice does not start a browser, log in, join, crawl courses/classrooms, read paid/private/member content, read member lists/profiles, download files, post/comment/message, mutate source rows, write atoms/vectors, write externally, use Browserbase, or use Steve's normal Chrome profile.

## Packet Requirements

Before any Skool runner can run, the exact packet must define:

- exact Skool target key and URL
- free/public vs paid/private/member boundary
- content owner and permitted use
- approved account or source identity
- source session state
- allowed surfaces
- allowed artifacts
- max pages, runtime, and cost
- stop conditions

Forbidden without explicit approval:

- login or MFA
- join group
- paid/member/private content read
- classroom/course crawl
- post, comment, message, or reply
- member profile/member list read
- download
- account/profile/credential/payment mutation
- external write

## Implementation Shape

V1 adds:

- `lib/skool-source-system-map.js`
- `scripts/process-skool-source-system-map-check.mjs`
- package script `process:skool-source-system-map-check`
- report artifact `source-system:skool:source-system-map:v1`
- live backlog proof note for `SKOOL-SOURCE-SYSTEM-MAP-001`
- verifier coverage registration for the done card

## Proof

Focused proof:

```bash
node --check lib/skool-source-system-map.js scripts/process-skool-source-system-map-check.mjs
npm run process:skool-source-system-map-check -- --json
npm run process:skool-source-system-map-check -- --apply --json
```

Supporting proof:

```bash
npm run process:source-extraction-state-ledger-check -- --json
npm run process:skool-free-community-god-mode-runner-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No blind Skool crawl.
- No Skool login or MFA.
- No free or paid Skool join action.
- No course/classroom crawl.
- No paid/private/member content extraction.
- No member profile/member list read.
- No downloads.
- No posts, comments, messages, or replies.
- No source row mutation.
- No atom/chunk/vector writes.
- No external writes.
- No Browserbase or hosted-browser fallback.
- No normal Chrome profile use.
