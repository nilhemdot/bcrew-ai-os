# BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 Plan

## What

Expand the existing Build Intel creator watchlist from repo truth without starting extraction. Add lookup-backed source refs for Dream Labs AI, Nate Herk, Chase AI, Everyday AI / Jordan Wilson, Mark Kashef, Matt Pocock / Total TypeScript, Andrej Karpathy, Aaron Bitwise, and OpenHuman / tinyhumansai.

This is metadata/source-truth work only: source IDs, source URLs, priority, cadence, public/private/auth posture, and no-extraction proof.

Tight V1 scope: register and prove creator/source metadata in the existing watchlist only. This card is not a source crawler, extractor, runtime integration, or agent feature.

Not next: live extraction, crawls, transcript fetches, screenshots/keyframes, summarization, model calls, paid/private/community/course auth, Research Inbox writes, atom creation, backlog mutation from extracted content, OpenHuman install/runtime, Harlan UI/runtime, Meeting Vault Phase B, Drive permission mutation, external writes, hidden subagents, and parallel builders.

## Why

Steve wants AIOS to learn from current agent engineering, memory systems, LLM Wiki, coding-agent portability, OpenHuman, and practical operator AI sources. The existing code has creator names, but several rows still depended on lookup-required placeholders. That blocks safe extractor planning because builders cannot tell which sources are public, which are paid/auth/community, and which are merely registered.

## Acceptance Criteria

- Existing code, existing docs, existing scripts, and live backlog / Current Sprint truth are reused rather than creating a second watchlist.
- The required creator/source rows exist under the existing `SRC-CREATOR-WATCHLIST-001` source ID.
- Each required row has lookup-backed URL refs, source type, access posture, priority, and cadence.
- Paid, private, community, and course-like surfaces remain approval-bound and are not extracted.
- Focused proof dogfoods missing URL, duplicate creator/source, overlapping source URL, extraction approval, live extraction, and paid-auth side-effect failures.
- `foundation:verify` covers the expanded baseline honestly.
- Full `process:foundation-ship` passes before push.
- Acceptance is command-proven for `BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001`, not inferred from a markdown marker.

## Definition Of Done

- `lib/build-intel-watchlist.js` contains the expanded source refs and still reports extraction as not allowed this sprint.
- `lib/build-intel-creator-watchlist-expansion.js` owns the focused snapshot, source-boundary table, dogfood proof, and report renderer.
- `scripts/process-build-intel-creator-watchlist-expansion-check.mjs` validates live backlog/current sprint truth, Plan Critic, approval, docs, package script, verifier coverage, closeout registry, and side-effect boundaries.
- The card closes under `build-intel-creator-watchlist-expansion-v1`.
- Next card is `COURSE-SOURCE-AUTH-BOUNDARY-001` before any private/course extraction.
- Done means the focused proof, verifier coverage, live Current Sprint overlay, closeout registry, backlog card lane, and final ship gate all agree on the same card and closeout key.

## Details

Existing code to reuse: `lib/build-intel-watchlist.js`, `lib/implementation-intelligence.js`, `lib/build-intel-karpathy-llm-kb-preflight.js`, `lib/foundation-verifier-control-loop.js`, `lib/foundation-intelligence-audit-verifier.js`, Current Sprint helpers, Plan Critic helpers, and process write guards.

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the Harlan operator loop closeout, and the Karpathy KB preflight closeout.

Existing scripts to reuse: `process:build-intel-intake-check`, `process:build-intel-karpathy-llm-kb-preflight-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Repair path: keep one canonical watchlist, enrich it with source refs, update baseline checks from the old 24-row assumption to the expanded Build Intel baseline, and add a focused proof that fails closed if a required source lacks a URL or if this registration starts extraction.

Behavior proof: the focused proof must call actual function paths `buildCreatorWatchlistSnapshot()`, `buildBuildIntelCreatorWatchlistExpansionSnapshot()`, `buildBuildIntelCreatorWatchlistExpansionDogfoodProof()`, and `renderBuildIntelCreatorWatchlistExpansionReport()`, then run the process path `npm run process:build-intel-creator-watchlist-expansion-check`. The proof must cover real watchlist behavior and the operator-facing Build Intel source surface, not only source-substring or `.includes()` markers. Substring-only proof is rejected unless backed by function-path proof and synthetic failing cases.

Gate decision tree: static source URL registration is not enough because the root invariant is no extraction side effect. Focused proof must validate lookup-backed refs and dogfood unsafe variants. Full proof must run `foundation:verify` and `process:foundation-ship` because the blast radius includes verifier baseline, Current Sprint truth, and the operator-facing Build Intel surface. Focused proof should stay fast/proportional, under 2 minutes.

Apply posture and read-only rule: the process script is read-only by default. Any live backlog or Current Sprint update requires explicit `--apply` or `--close-card`; no-flag writes are blocked, and verifier/check paths fail closed instead of repairing live state.

Split plan: `docs/rebuild/current-plan.md` is already over the preferred handwritten-file budget, so this card only adds a tiny Current Sprint status note there and keeps new source/watchlist behavior in `lib/build-intel-watchlist.js`, `lib/build-intel-creator-watchlist-expansion.js`, and the focused proof script. No new responsibility, durable doctrine, or broad responsibility is added to the large plan file.

Explicit file-size budget: approval JSON/data records stay under 60 lines, report artifacts and handoffs stay under 120 lines for this card, generated/data/report artifacts stay under 3000 lines, and handwritten modules/scripts stay under the 1500-line preferred budget or require a split/no-new-responsibility plan.

Shared-file coordination: this is main-session Foundation work with active sprint scope; no separate builder, hidden subagent, side lane, hub chat, or parallel worker owns these shared files. The main session owns coordination, commit, push, and ship, and any future side or hub work touching shared files must return to the main session before commit or push.

Operator behavior: Steve should be able to see who is on the watchlist, why they matter, where the public source is, what is paid/auth-bound, and what happens next without a builder silently crawling, extracting, calling models, or installing OpenHuman. The useful real workflow is faster source planning with higher quality: Steve can scan the table, identify public versus approval-bound sources, and move to `COURSE-SOURCE-AUTH-BOUNDARY-001` before any private/course extraction.

## Risks

- The card can drift into live YouTube extraction, transcript fetches, screenshots, OpenHuman install/runtime work, or paid/community/course auth use.
- Ambiguous creator names can create duplicate source IDs or overlapping URLs.
- Updating watchlist counts can accidentally create brittle verifier baselines.
- Public metadata lookup must not be confused with permission to ingest full source content.
- If proof fails, the repair path is to fail closed, revise the plan/watchlist/proof, rerun the focused command, and only then continue to full ship gates.

## Tests

- `node --check lib/build-intel-watchlist.js lib/build-intel-creator-watchlist-expansion.js lib/foundation-verifier-control-loop.js lib/foundation-intelligence-audit-verifier.js scripts/process-build-intel-creator-watchlist-expansion-check.mjs scripts/foundation-verify.mjs`
- `npm run process:build-intel-creator-watchlist-expansion-check -- --apply --json`
- `npm run process:build-intel-creator-watchlist-expansion-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json --closeoutKey=build-intel-creator-watchlist-expansion-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001.json --closeoutKey=build-intel-creator-watchlist-expansion-v1 --commitRef=HEAD`
