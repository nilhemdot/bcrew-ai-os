# GStack Build Intel Extraction Sprint Plan

## What

Run a read-only Foundation sprint that extracts public implementation patterns from the local `garrytan/gstack` mirror into AIOS source maps, pattern scorecards, Research Inbox proposals, skill/review/browser-QA enrichment, and an explicit public developer-community watchlist.

## Why

Steve flagged that public GitHub, Codex Community, Claude Code Community, OpenClaw, and similar sources should teach AIOS how to implement existing ideas better. GStack is useful because it is a mature public AI coding workflow, but the Foundation must absorb lessons without installing it, copying its doctrine, scraping private communities, or creating autonomous dev.

## Acceptance Criteria

- The sprint is visible in live DB before build work starts, with all six cards in Scoping.
- Every card has complete existing-work doctrine and one `plan_critic_runs` pass row at score 9.8 or higher before build.
- The proof inventories the actual local GStack mirror at `/tmp/gstack-research`, records the inspected commit, and generates a source map by path category.
- The pattern scorecard includes skill, review-gate, browser-QA, frontend/design, context, safety, eval, OpenClaw, and public GitHub/community patterns with path evidence.
- Research Inbox proposal rows validate with `proposalOnly=true`, `writesBacklog=false`, and `autoCreateBacklogCard=false`.
- Public developer-community monitoring boundaries cover GitHub, Codex Community, Claude Code Community, and OpenClaw without private scraping or auto-backlog mutation.
- The generated handoff states what to adopt, what to reject, and the next review choice.

## Definition Of Done

- `PUBLIC-DEV-COMMUNITY-WATCHLIST-001`, `GSTACK-EXTRACTION-001`, `BUILD-INTEL-GITHUB-MONITOR-001`, `SKILL-IMPROVER-GSTACK-ENRICHMENT-001`, `REVIEW-GATE-UPGRADE-001`, and `BROWSER-QA-PROOF-001` close under `gstack-build-intel-extraction-v1`.
- `npm run process:gstack-build-intel-check -- --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify` passes.
- `process:foundation-ship` passes after dashboard and worker serve the shipping commit.

## Details

Existing code to reuse: `lib/research-inbox.js`, `lib/implementation-intelligence.js`, `lib/build-intel-extraction-implementation.js`, Current Sprint helpers, Plan Critic, Foundation verifier patterns, and build-log closeout patterns. Existing docs to reuse: `docs/handoffs/2026-05-13-gstack-codebase-extraction-packet.md`, `docs/source-notes/github-build-intel.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the Build Intel direction capture. Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

The root invariant is: public Build Intel can improve AIOS implementation quality only by producing cited, proposal-only findings. The proof must call the actual GStack extraction function path, inspect live/synthetic Research Inbox validation, compare before/after backlog lane counts, and reject substring-only proof.

Gate decision: full Foundation gate, because this sprint touches shared Foundation modules, server route payloads, package scripts, verifier coverage, build log, live backlog closeout, and generated handoff output. The focused proof should stay fast enough for default use, targeting under two minutes before the full ship gate.

## Risks

- GStack can tempt wholesale copying. Repair path: fail closed if code import, install, private scraping, paid auth, or autonomous dev flags become true.
- Public community monitoring can become idea spam. Repair path: route findings to Research Inbox proposals only and default to enriching existing cards before proposing new work.
- Frontend/design lessons can distract from Foundation source/action routing. Repair path: keep design pipeline as a proposal unless Steve chooses it in sprint review.
- Local mirror availability can drift. Repair path: keep generated report/source note as committed evidence, but require the focused proof to inspect the mirror during this sprint.

## Tests

- `npm run process:gstack-build-intel-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=PUBLIC-DEV-COMMUNITY-WATCHLIST-001 --planApprovalRef=docs/process/approvals/PUBLIC-DEV-COMMUNITY-WATCHLIST-001.json --closeoutKey=gstack-build-intel-extraction-v1 --commitRef=HEAD`

## Not Next

- Do not install GStack.
- Do not copy GStack skills wholesale.
- Do not scrape private communities or auth-gated sources.
- Do not auto-create, auto-close, or auto-move backlog cards from public findings.
- Do not open hubs, Directors, Reply/Watching Loop, paid-source extraction, marketing content production, Drive permission mutation, or request-access emails.
