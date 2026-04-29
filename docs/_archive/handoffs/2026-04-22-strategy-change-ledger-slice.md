## DECISION-002 - Strategy change ledger first slice

Date: 2026-04-22

Purpose: make strategy changes visibly readable with linked decision context instead of generic recent-change rows.

### What is live now

- strategy watch panels now render a decision-linked newest-first ledger
- each ledger item can show:
  - linked decision id / title
  - target doc
  - target section
  - decision source ref
  - decision context
  - owner / confirmer
  - before / after diff context for proposals
- doc-scoped strategy watch panels now act as the first visible annotation layer

### Important boundary

- this is the first live slice
- it is doc-scoped, not true line-level inline highlighting inside markdown sections
- if deeper inline highlighting is needed later, build it on top of this ledger instead of replacing it

### Why this is enough for now

- readers can now answer:
  - what changed
  - where it changed
  - which decision justified it
  - what source/context backed it
  - who owned / confirmed it

### What stays next

- `DECISION-003`
  - contradiction / overlap cleanup workflow
- later only if needed:
  - section-level or line-level inline highlighting
