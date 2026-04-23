# Shared Communications Intelligence

This is the operator note behind:

- `SOURCE-005`
- `SOURCE-006`
- `SOURCE-018`
- `SOURCE-019`

Use it to lock what shared communications should do in Foundation and what should stay out until later hub work.

## What This Layer Owns

Shared communications intelligence owns the cross-hub business context that lives inside:

- Missive
- Gmail
- Google meeting notes / transcripts
- Slack

Its job is not just to read messages.

Its job is to turn those sources into governed business intelligence:

- decision candidates
- task candidates
- blockers
- follow-up signals
- feedback signals
- evidence / atom candidates

## Locked Source Roles

### Missive

Missive is the primary shared email intelligence surface because it carries:

- email body
- internal comments
- `@mentions`
- assignments
- routing context

If a thread exists in Missive, that is the richer read than Gmail.

### Gmail

Gmail is the mailbox fallback and broader Google email layer.

Use it for:

- messages not visible in Missive
- mailbox reads where Missive is not the system of record
- thread context outside the shared Missive workspace

Do **not** treat Gmail as equivalent to Missive for internal comments or assignment context.

### Google Meeting Notes / Transcripts

Google meeting notes are already part of the operating stack.

Use them as the meeting evidence layer for:

- what was said
- who attended
- what actions were suggested
- what decisions may have been made

### Slack

Slack is a team-signal source, not just a notification surface.

Use it for:

- fast decisions
- team friction
- culture wins / misses
- repeated problems
- feedback and escalation signals

## Best Path Forward

Do **not** rebuild the old pattern by starting with a separate acting agent for every surface.

Build one clean shared layer in this order:

1. source reads
2. raw archive
3. normalized communication records
4. extraction candidates
5. human review / approval
6. downstream routing

That means:

1. prove each source read
2. archive the raw thread / note / message with source IDs and participants
3. normalize it into one common model
4. extract structured candidates
5. only then route approved outputs into decisions, backlog, ClickUp, or later hub systems

## Current Implementation Reality

What already exists now:

- current repo now has delegated Google readers in `lib/google-delegated.js` for:
  - Gmail search / read / thread
  - Calendar event listing
  - Drive search
  - Drive folder listing
  - Drive doc export
  - meeting-note verification against both Gemini-note and transcript paths across enabled delegated Drive users
- current repo now has a working Missive bridge in `lib/missive.js` for:
  - inbox
  - messages
  - comments
  - full thread reads
- current repo now has the first governed archive slice for shared communications:
  - Gmail thread artifacts archived in PostgreSQL
  - Missive thread artifacts archived in PostgreSQL
  - meeting-note artifacts archived in PostgreSQL
  - meeting-transcript artifacts archived in PostgreSQL
  - first pending candidate lane extracted transcript-first with Foundation context
- old repo still holds additional Missive search patterns worth borrowing
- old repo already had Slack read patterns through MCP

Best implementation path:

1. keep hardening the now-live Google delegated and Missive readers in the current repo
2. revalidate Slack as read-only first
3. keep all four sources behind one shared normalization layer

Do **not** build four separate new intelligence systems.

Port the working readers, then harden the shared layer above them.

## Foundation Boundary

Foundation should do this now:

- read the source
- archive the raw artifact
- normalize the artifact
- extract candidate signals
- show them in a governed review lane

Foundation should **not** do this yet:

- auto-update ClickUp
- auto-update CRM
- auto-send messages
- auto-close loops without review

Safe rule:

- Foundation reads, structures, and proposes.
- Hubs later act on approved outputs.

## Pillar Map

### Strategy

Use shared communications for:

- pending decisions
- contradiction detection
- carry-forward issues
- strategic blockers
- meeting-evidence for quarterly planning

### Ops

Use shared communications for:

- missed follow-through
- stale routed threads
- unowned tasks
- process failures
- cross-team blockers

### Retention / People

Use shared communications for:

- attendance issues
- unresolved friction
- praise / recognition moments
- coaching flags
- early retention-risk signals from silence, frustration, or missed commitments

### Marketing

Use shared communications for:

- repeated questions
- objections
- success stories
- proof snippets
- founder / team phrasing worth capturing as reusable atoms

### Sales / Coaching

Use shared communications for:

- appointment quality signals
- follow-up misses
- stage hygiene clues
- client objection patterns
- coaching opportunities tied to real conversations

## Archive Rule

This layer should not depend on "today only" reads forever.

Best operating split:

- daily read for urgent work
- rolling recent context for active threads
- durable archive for pattern detection and later retrieval

That is why `MEMORY-003` matters here.

## Extraction Rule

The first extraction types should stay narrow:

- decision candidate
- task candidate
- blocker
- feedback signal
- atom candidate

Do not start with broad freeform summaries only.

The system should produce reviewable units that can later feed:

- `DECISION-004`
- `MEMORY-003`
- `STRATEGY-001`

## Why This Is Foundation

This belongs in Foundation because every later hub uses it:

- strategy
- ops
- retention
- marketing
- sales

The hubs should not each rebuild their own email / meeting / Slack reader.

Foundation should supply one trusted shared intelligence layer that every hub can read from.
