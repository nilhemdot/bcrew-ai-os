# PUBLIC-DEV-COMMUNITY-WATCHLIST-001 Plan

## What

Define the governed public developer-community Build Intel watchlist for GitHub, Codex Community, Claude Code Community, OpenClaw, and adjacent public AI coding sources.

## Why

Steve wants public builder communities monitored because they show how strong builders implement systems. This card keeps that signal inside Foundation source rules instead of turning it into private scraping, idea spam, or autonomous backlog mutation.

## Acceptance Criteria

- The watchlist includes public GitHub, Codex Community, Claude Code Community, and OpenClaw source IDs.
- Each source names allowed metadata, blocked content, cadence, and proposal-only output.
- The proof calls the actual GStack Build Intel function path and validates source rows from structured output.
- The proof rejects substring-only checks and fails if private scraping or auto-backlog mutation is allowed.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- The watchlist appears in the GStack Build Intel snapshot/API output.
- Research Inbox remains the only output gate for findings.
- Backlog lane counts are unchanged by watchlist generation.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/research-inbox.js`, `lib/gstack-build-intel.js`, Current Sprint helpers, Plan Critic, and verifier/build-log patterns. Existing docs to reuse: `docs/source-notes/github-build-intel.md`, `docs/source-registry.md`, the GStack packet, current plan, and current state. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: public developer-community sources are Build Intel sources, not marketing sources and not private scraping approval. The check should prove behavior through the function output, source IDs, blocked actions, and no-mutation lane counts. No substring-only proof is acceptable.

This is a narrow V1 card: define the watchlist contract and prove it from structured output without building a scheduled crawler. The behavior proof uses the actual function path, a black-box API-style round-trip over the GStack Build Intel snapshot, and a synthetic no-mutation case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because this touches source-boundary doctrine; the focused gate is `npm run process:gstack-build-intel-check -- --card=PUBLIC-DEV-COMMUNITY-WATCHLIST-001 --json`; the full gate is required because blast radius includes server/API-visible output, source registry doctrine, verifier coverage, and Foundation closeout truth. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets a real workflow for monitoring public implementation sources without private scraping or idea spam. This unlocks speed and quality for the team because useful external lessons enter Research Inbox as proposals instead of disappearing in chat.

Speed bound: the focused proof is thin, fast, and proportional to this card; it should run under 2 minutes so it is used by default instead of bypassed.

## Risks

- Public source monitoring can drift into scraping. Repair path: fail closed if any watchlist row allows login-gated scraping.
- GitHub/community sources can create too many new ideas. Repair path: require Research Inbox and default enrichment of existing cards.
- Source rows can be mistaken for active connectors. Repair path: label V1 as manual-first public discovery.

## Tests

- `npm run process:gstack-build-intel-check -- --card=PUBLIC-DEV-COMMUNITY-WATCHLIST-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not scrape private communities.
- Do not add paid auth.
- Do not auto-create backlog cards.
- Do not build a scheduled crawler in this card.
