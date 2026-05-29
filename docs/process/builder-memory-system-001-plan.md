# BUILDER-MEMORY-SYSTEM-001 Plan

Closeout key: `builder-memory-system-v1`

## Goal

Give future Codex/Claude/Harlan builder runs a live startup packet so Steve does not have to restate the Human Web Agent V1 vision, current sprint, source-system state, blockers, and guardrails every session.

## Inputs

- Live Current Sprint from `/api/foundation/current-sprint`
- Live backlog cards for the Human Web Agent/source-system lane
- `dev-page:system-truth-cleanup:v1`
- `director:dev-daily-source-review-loop:v1`
- `source-system:extraction-state-ledger:v1`
- `source-system:myicor:mcp-catalog-snapshot:v1`
- `source-system:skool:source-system-map:v1`
- `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the May 29 handoff as doctrine/handoff references

## Build Slice

- Add a builder-memory startup packet module.
- Add a focused proof/packet command:
  - `npm run process:builder-memory-system-check -- --json`
  - `npm run builder:startup-packet`
- Persist report artifact `builder-memory:startup-packet:v1`.
- Mark `BUILDER-MEMORY-SYSTEM-001` done only after the focused proof applies.

## Boundaries

- Private memory remains local-only. Do not copy `MEMORY.md`, `USER.md`, or `memory/YYYY-MM-DD.md` into repo report truth.
- No Browserbase default.
- No normal Chrome profile.
- No browser session.
- No source extraction.
- No source row mutation.
- No atom/vector write.
- No backlog promotion beyond this card closeout.
- No external write, login, MFA, join, purchase, download, post, comment, message, or paid/private read.

## Acceptance

- Startup packet includes live active sprint/blocker, relevant cards, source reports, proof commands, load order, guardrails, and stale-claim rejection rules.
- Packet says private/chat memory is not repo truth.
- Packet includes source-system counts for source ledger, MyICOR packets, Skool targets, and Director candidate base.
- Proof verifies the module/script do not read private memory files or start browser/extraction/write paths.
- `backlog:hygiene` and `foundation:verify` pass after services restart.
