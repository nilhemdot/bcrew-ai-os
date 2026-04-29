# CEO Dashboard Pattern

Plain English: Foundation surfaces should make the operator decision easy. This is a control pattern, not a UI polish pass.

## Required Page-Level Answers

Every CEO-dashboard-style Foundation surface should answer:

- what changed
- where it lives
- what to review
- what is blocked or at risk
- what is next
- what proof supports confidence

## Required Fields

- `whatChanged`: the meaningful system change, in plain English.
- `whereItLives`: the files, docs, API routes, dashboard surfaces, or source IDs that own it.
- `whatToReview`: the exact artifact or behavior Steve should inspect.
- `blockedOrAtRisk`: the current blocker, risk, stale state, or explicit "none now" state.
- `whatIsNext`: the next card, decision, review, or stop point.
- `proofAndConfidence`: the command, live API, served commit, source, or manual check that supports trust.
- `emptyState`: the empty state message when there is no current work or data.
- `errorState`: the error state message when proof cannot load or is stale.

## Pattern Rules

- Lead with operational truth, not decorative copy.
- Say what to do next.
- Separate owned backlog IDs from incidental context references.
- Link proof to the card that owns it.
- Use live source/API values where values can change.
- Keep private workspace content out of operator surfaces.

## Boundary

`CEO-DASHBOARD-PATTERN-001` defines the pattern before Phase G operator UI work. It does not redesign Foundation pages, polish layouts, or start Phase G Track 2.

Future UI work should use this pattern when redesigning Recent Work, Runtime Health, Daily Exec Summary, System Inventory, or other operator surfaces.

## Manual Artifact Check

For a shipped surface, the reviewer should be able to answer:

- What changed?
- Where does it live?
- What should I review?
- What is blocked?
- What is next?
- What proof makes this trustworthy?

If those answers require reading a chat transcript, the surface has not met the pattern.
