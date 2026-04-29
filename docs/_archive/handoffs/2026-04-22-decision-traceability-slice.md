## DECISION-001 - First decision-to-doc traceability slice

Date: 2026-04-22

Purpose: make decisions, doc proposals, and change history readable as one chain instead of three disconnected surfaces.

### What is live now

- `foundation-hub` now exposes `decisionTraceability`
- traceability summarizes:
  - total decisions
  - linked decisions
  - unlinked decisions
  - total doc updates
  - linked doc updates
  - orphan doc updates
  - affected docs
- each decision now has a trace object with:
  - linked doc-update count
  - open linked update count
  - applied linked update count
  - affected docs
  - latest decision event time
  - latest linked doc event time
  - latest review / approval actor
  - latest applied commit
  - trace status

### Pending doc updates now carry linked decision context

- decision title
- decision category
- decision status
- decision source ref
- decision owner
- decision confirmer
- decision participants
- decision context ref
- decision evidence notes
- decision rationale

### Visible UI effects

- Decisions page:
  - each decision can now show its doc-trace block
  - decision cleanup panel now shows decision-to-doc link counts
- strategy change-watch panels:
  - now show whether proposals are linked to decisions or still orphaned
- pending doc update cards:
  - now show the linked decision context instead of only `decisionId`

### Important boundary

- this does **not** mean every decision now has a linked doc update
- current live truth can honestly show `0` linked doc updates when no proposals exist
- the point of this slice is the governed trace path, not forcing fake links

### What stays next

- `DECISION-002`
  - richer visible change ledger and inline annotations
- `DECISION-003`
  - contradiction / overlap detection and cleanup workflow
