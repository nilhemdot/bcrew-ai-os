# Implementation Intelligence Sprint Plan

## What

Run a no-auth Foundation sprint that makes existing backlog work easier to build: detect thin cards, propose 7-section internal scoper enrichments, classify research-lane disposition proposals, link builder implementation lessons to existing cards through Research Inbox, and preflight public YouTube implementation-intel candidates without crawling.

## Why

Steve clarified that the YouTube builders mostly teach how to implement ideas he already has. The risk is not just "more ideas"; the risk is thin cards and external lessons that never attach to a buildable Foundation plan. This sprint connects those two layers while preserving the rule that agents propose and Steve+Codex approve.

## Acceptance Criteria

- The sprint is visible in live DB before build work starts.
- All five cards start in Scoping and move through Sprint Ready, Building Now, and Done This Sprint with real stage state.
- Every card has complete existing-work doctrine and one `plan_critic_runs` pass row at score 9.8 or higher before build.
- Thin-card detection uses live and synthetic backlog rows, returns structured missing-field reasons, and does not mutate backlog rows.
- Internal Scoper returns 7-section enrichment proposals with evidence refs, related cards, proof commands, and not-next boundaries.
- Research disposition queue converts research cards into proposed-only review rows and proves lane counts are unchanged.
- Builder lesson linker maps implementation lessons to existing cards and outputs Research Inbox enrichment proposals instead of new backlog cards by default.
- Public YouTube preflight separates public-permitted candidates from paid/auth-required sources and proves no video extraction starts.

## Definition Of Done

- Focused proof passes for all five cards.
- Backlog hygiene and full Foundation verifier pass.
- Current Sprint ends with 5/5 Done This Sprint, no active blocker, and sprint-review next action.
- Build log, current plan/state, API snapshot, and verifier coverage identify the shipped primitives and their proposal-only limits.

## Existing Work To Reuse

Existing code to reuse: live backlog helpers, Current Sprint overlay helpers, Plan Critic, `lib/build-intel-watchlist.js`, `lib/research-inbox.js`, `lib/multimodal-extractor-contract.js`, `lib/foundation-control-compression.js`, source contracts, Foundation snapshot APIs, and verifier/ship-gate patterns.

Existing database truth to reuse: `backlog_items`, `foundation_sprints`, `foundation_sprint_items`, `plan_critic_runs`, live Research Inbox contract, creator watchlist rows, source contracts, and build closeout records.

Existing docs to reuse: `docs/_archive/handoffs/research-purge-2026-05-13.md`, `docs/handoffs/2026-05-13-build-intel-direction-capture.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and previous Build Intel intake plans.

## Root Invariant

AIOS must not claim implementation intelligence because a chat or video mentioned a good idea. Implementation intelligence means the system can show which existing card is thin, what implementation evidence or builder lesson applies, what enrichment is proposed, and what Steve still needs to approve before backlog mutation or extraction.

The proof must call actual functions over live/synthetic rows and inspect structured outputs. Substring-only proof is not acceptable.

## Risks

- Thin-card scoring could become subjective. Mitigation: deterministic checks plus explicit reasons and confidence.
- Research queue could sound like deletion approval. Mitigation: proposed-only rows and unchanged lane-count proof.
- Builder lessons could inflate scope. Mitigation: default disposition is `enrich_existing_card`; proposed new cards require explicit Review Inbox approval later.
- Public YouTube preflight could drift into crawling. Mitigation: no network extraction, no atoms, no screenshots, and `extractionStarted: false` in proof.

## Gate Decision

Focused gate for `process:implementation-intelligence-check`, then full ship gate because this sprint changes shared Foundation modules, server routes, docs, package scripts, and verifier coverage. The focused proof should stay under two minutes. `process:foundation-ship` remains the protected-path gate.

## Repair Path

If focused proof fails, keep or return the failing card in Scoping/Returned and do not close the sprint. If a function mutates backlog or starts extraction, revert that behavior, restore row counts, mark the generated proposal invalid, and rerun the proof before stage progression.

## Operator Value

Steve gets a way to compress the 384-card backlog and attach builder implementation intelligence to existing work without waiting for paid-source auth or creating another autonomous dev layer.

## Tests

- `npm run process:implementation-intelligence-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=INTERNAL-SCOPER-001 --planApprovalRef=docs/process/approvals/INTERNAL-SCOPER-001.json --closeoutKey=implementation-intelligence-v1 --commitRef=HEAD`

## Not Next

- Do not connect Skool, myICOR, Loom, Zoom, or paid/private sources.
- Do not run bulk YouTube extraction or create atoms from videos.
- Do not auto-create, auto-close, or auto-move backlog cards.
- Do not build Directors, Master Director, hubs, Reply/Watching Loop, Telegram bots, or marketing production.
