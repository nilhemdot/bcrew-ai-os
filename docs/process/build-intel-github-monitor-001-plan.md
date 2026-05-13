# BUILD-INTEL-GITHUB-MONITOR-001 Plan

## What

Define the first GitHub/public developer-community monitoring shape for Build Intel sources.

## Why

Steve's point is that many future implementation lessons will show up in public repos and communities before we discuss them in chat. AIOS needs a governed way to notice them and route useful lessons to proposals.

## Acceptance Criteria

- Monitoring shape names public GitHub repos, public community posts, allowed metadata, blocked data, cadence, and Research Inbox output.
- GStack is the first seed under `SRC-GITHUB-BUILD-INTEL-001`.
- The proof validates that no private scraping, paid auth, or auto-backlog mutation is allowed.
- The proof calls the actual function path and verifies structured monitor rows, not substring markers.
- A Plan Critic pass row with score at least 9.8 exists before build.

## Definition Of Done

- GitHub/public community monitoring appears in the GStack Build Intel snapshot.
- Research Inbox proposal rows cite public repo path/commit evidence.
- The card closes only after focused proof, backlog hygiene, foundation verifier, and ship gate pass.

## Details

Existing code to reuse: `lib/gstack-build-intel.js`, `lib/research-inbox.js`, source registry/source note patterns, Current Sprint helpers, and verifier/build-log patterns. Existing docs to reuse: `docs/source-registry.md`, `docs/source-notes/github-build-intel.md`, GStack packet, current plan, and current state. Existing scripts to reuse: `process:gstack-build-intel-check`, `backlog:hygiene`, and `foundation:verify`.

The root invariant is: public GitHub/community monitoring should enrich implementation quality while staying proposal-only. The proof should verify source IDs, blocked actions, allowed metadata, generated proposals, and unchanged backlog counts through a real function/API-style path. No substring-only proof is acceptable.

This is a narrow V1 card: define the monitoring shape and seed GStack as the first public repo source; it does not build a scheduled crawler. The behavior proof uses the actual function path, a black-box API-style round-trip over source rows and proposal rows, and a synthetic no-mutation case that rejects weak substring-only proof.

Gate decision tree: static checks are insufficient because this changes source-contract boundaries; the focused gate is `npm run process:gstack-build-intel-check -- --card=BUILD-INTEL-GITHUB-MONITOR-001 --json`; the full gate is required because blast radius includes API-visible output, source registry/source-note doctrine, verifier coverage, and Foundation closeout truth. Final shipping uses `foundation:verify` and `process:foundation-ship`.

Operator value: Steve gets a practical workflow for turning public GitHub/community discoveries into reviewed implementation proposals. This unlocks speed and quality for the team because external implementation lessons enrich existing backlog cards without autonomous backlog mutation.

Speed bound: the focused proof is fast, thin, and proportional to the card; it should run under 2 minutes and avoid broad crawling.

## Risks

- Monitoring can become broad crawling. Repair path: keep V1 manual-first and fail if broad crawl flags appear.
- Public community posts can be noisy. Repair path: score by AIOS fit and default to existing-card enrichment.
- Source identity can blur with marketing content. Repair path: label all rows Build Intel only.

## Tests

- `npm run process:gstack-build-intel-check -- --card=BUILD-INTEL-GITHUB-MONITOR-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not build a scheduled GitHub crawler.
- Do not scrape private communities.
- Do not ingest social feeds broadly.
- Do not auto-create backlog cards.
