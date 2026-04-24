# Full Convo Checkpoint — Shared Comms, Atoms, And Foundation Direction

Date: 2026-04-22

Type: reconstructed checkpoint handoff

Raw native transcript export: not available in this repo session

## Why This File Exists

Steve wants long chats saved so future agents can:

- review the thinking
- extract lessons learned
- create content later
- avoid redoing the same architecture debate

This file is the durable reconstructed checkpoint for the current long chat.

## Core User Direction Locked In This Chat

Steve clarified several important boundaries very directly:

### Shared communications

- `Missive` is locked
- `Google Workspace` is locked
- `Google Gemini meeting notes` are already part of the stack
- the job is **not** to pick replacement tools
- the real missing layer is:
  - read
  - synthesize
  - extract
  - propose updates / tasks / decisions

### Foundation vs hub work

- reading emails, Slack, and meeting notes is Foundation intelligence
- using that intelligence to act inside one department is later hub work

### Atoms

- the old marketing atom idea had real value
- the rebuild should preserve the good part
- atoms should become broader business intelligence, not stay marketing-only

### Avatars

- marketing still needs the locked avatar model:
  - `10` RETAIN client avatars
  - `5` ATTRACT agent avatars
- Steve explicitly raised the right architecture question:
  - if marketing needs avatar-aware extraction, what is the matching pattern for the other hubs?

### Scopers

- Steve liked the cleaner pattern:
  - Foundation ingests and approves
  - each hub gets a Scoper that reads atoms through that hub's own lens

## What Was Proven From The Old System

The old system was directionally right on shared intelligence.

Confirmed from old code and skills:

- Missive was the primary email intelligence source
- Gmail was the fallback / broader mailbox layer
- Google meeting notes were already being treated as a real source
- Slack was another real intelligence surface
- the old system already had:
  - email intelligence
  - internal email scout
  - internal meetings scout
  - internal Slack scout
  - feedback scout
  - meeting filer
  - decision codifier

The old system was wrong mainly in fragmentation and sprawl, not in recognizing the raw sources.

## Repo Truth Added In This Chat

### New source note

- [shared-communications.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/shared-communications.md)

This now locks:

- Missive role
- Gmail role
- Google meeting-notes role
- Slack role
- best-path doctrine:
  - one shared ingestion layer
  - not one separate acting agent per source
- implementation bias:
  - port-and-harden
  - not greenfield reinvention

### New source-map handoff

- [2026-04-22-shared-comms-source-map-by-pillar.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-22-shared-comms-source-map-by-pillar.md)

This now maps shared communications to:

- strategy
- ops
- retention / people
- marketing
- sales / coaching

### New atoms / overlays / scopers handoff

- [2026-04-22-atoms-overlays-and-scopers.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-22-atoms-overlays-and-scopers.md)

This now locks:

- Foundation stores shared evidence atoms
- hubs do not rebuild ingestion
- hubs read atoms through overlays
- Scopers are readers / deepeners / scopers, not the ingestion layer and not the acting layer

## Backlog Added / Tightened In This Chat

### Tightened

- `SOURCE-006`
  - Missive read boundary now explicitly treats Missive as the primary email-intelligence surface
- `SOURCE-018`
  - Google meeting-note output now explicitly sits inside the shared comms layer
- `SOURCE-019`
  - now explicitly says:
    - port-and-harden is preferred
    - Foundation reads / normalizes / extracts / reviews
    - later hubs consume approved outputs
- `STRATEGY-001`
  - business atoms now explicitly support avatar targeting as an optional overlay, not a forced base rule

### New cards

- `SOURCE-020`
  - Port and harden the shared communications source adapters
- `STRATEGY-006`
  - Define the hub-overlay model on top of business atoms
- `SYSTEM-012`
  - Define hub Scopers before building acting agent swarms

## Rebuild Direction Locked In

The correct build order is now:

1. port and harden shared communications readers
2. build `business_atoms` + `atom_hits`
3. define overlays
4. lock the marketing avatar registry
5. build the extraction review lane
6. build the first hub Scoper on top of approved atoms

Clean system split:

- Foundation = read, archive, normalize, extract, approve
- Hub overlays = interpret atoms for one domain
- Hub Scoper = read overlays, deepen into raw context, scope work
- later specialists = act

## Key Architectural Answers From This Chat

### Are avatars Foundation?

Answer:

- Foundation should know avatars exist
- but avatars should not be mandatory on every atom
- avatars are the first heavy **marketing overlay**

### What is true for the other hubs?

Answer:

- Marketing uses avatar overlays
- Strategy uses issue / decision / blocker overlays
- Ops uses workflow / SOP / handoff overlays
- Sales uses objection / stage / coaching overlays
- Retention uses engagement / culture / risk overlays

### Are Scopers the right pattern?

Answer:

- yes
- but only after Foundation ingestion and atom approval exists

## Current Verification State

At the end of this chat:

- `npm run foundation:verify`
- result: `15/15` passed

## Important Operational Note

This chat also confirmed a local workflow issue:

- too many short-lived shell sessions were opened during the long turn
- that caused terminal-session warnings
- this is a tooling / session-hygiene issue, not a system-runtime bug

The only intentional long-running local process still visible was:

- `server.js` serving `localhost:3000`

## Recommended Next Step

Start the next chat from:

- `SOURCE-020`

Specifically:

1. port old Google delegated reader patterns into the current repo
2. port the old Missive bridge into the current repo
3. define the normalized shared communications record shape
4. stop before acting agents

## Related Files

- [shared-communications.md](/Users/bensoncrew/bcrew-ai-os/docs/source-notes/shared-communications.md)
- [2026-04-22-shared-comms-source-map-by-pillar.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-22-shared-comms-source-map-by-pillar.md)
- [2026-04-22-atoms-overlays-and-scopers.md](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-22-atoms-overlays-and-scopers.md)
- [current-plan.md](/Users/bensoncrew/bcrew-ai-os/docs/rebuild/current-plan.md)
