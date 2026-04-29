# Shared Communications Tool Audit

Date: 2026-04-22

## Correction

- `Missive` is locked.
- `Google Workspace` is locked.
- `Google Gemini meeting notes` are locked as part of that stack.
- The real open problem is not product choice.
- The real open problem is governed **read + synthesis + extraction**.

## Operating Model

### Google

- Delegated Google Workspace stays the canonical Google access path.
- Gmail, Calendar, Drive, and Google-side meeting-note artifacts should be read through that path where possible.

### Missive

- Missive is the shared inbox and internal email-collaboration layer.
- The rebuild needs to read:
  - email bodies
  - internal comments
  - @mentions
  - assignment / routing state
  - thread context

### Meeting notes

- Meeting notes are not a vague future tool choice.
- They are a locked operating source already present in the Google stack.
- The rebuild needs to read:
  - transcript / notes
  - participants
  - meeting identity
  - action items
  - decision candidates

### Slack

- Slack is another read surface in the same family.
- The rebuild should treat it like Missive and meeting notes:
  - read it
  - synthesize it
  - propose structured outputs

## Missing Layer

The missing layer is:

1. source reads
2. normalization
3. extraction
4. review / approval
5. optional downstream updates like ClickUp

That is the part the old system wanted and the rebuild still needs.

## Backlog Meaning

- `SOURCE-006` = lock Missive read boundary
- `SOURCE-018` = lock Google meeting-note read boundary
- `SOURCE-019` = build the shared communications ingestion and synthesis layer

## What Not To Do

- do not waste time replacing Missive
- do not waste time picking a new meeting-note app
- do not confuse source access with the higher-value synthesis layer
