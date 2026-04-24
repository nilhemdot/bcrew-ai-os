# Strategy Change Watch

Date: `2026-04-21`

## What Went Live

The strategy layer now has a visible change-watch surface instead of leaving doc-update tracking buried in Foundation operations.

Visible now:

- overview page shows:
  - strategy packet change queue / history
- strategy packet docs show:
  - doc-scoped change queue / history
- panel content comes from existing trust-layer tables:
  - `pending_doc_updates`
  - `change_events`

## What It Shows

- open strategy doc proposals
- recent strategy doc update events
- packet-level or doc-level scope

## Important Boundary

This is the first visible strategy-change surface.

It is **not** the final inline-annotation system yet.

Still later:

- inline highlights on changed strategy lines
- richer before / after annotation blocks inside the doc view
- contradiction-aware strategy change surfacing
