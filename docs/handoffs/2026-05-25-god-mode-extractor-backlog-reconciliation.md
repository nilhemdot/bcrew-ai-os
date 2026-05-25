# God Mode Extractor Backlog Reconciliation

Date: 2026-05-25

## Steve's Correction

Steve pushed back hard that the system was drifting into scattered UI/build ideas before the extraction spine was trustworthy.

The corrected mission for the next lane is:

1. Get approved Dev data sources connected.
2. Bring each extractor as close to God Mode as its source boundary allows.
3. Make the synthesis/router and Dev Intelligence Director excellent, fresh, and evidence-aware.
4. Extract enough source evidence to compare creators and source families side by side.
5. Rank ideas only after the system has enough source coverage.
6. Scope, merge, and queue the strongest opportunities before Steve approval.

The system should not jump into Scoper, parallel-builder UI, or new app surfaces while the extractor/router/director spine is still thin.

## Terminal vs UI Clarification

Codex and Claude Code are currently coding harnesses that work through terminal sessions. The AIOS UI should observe, control, and explain system-owned lanes over time; it should not pretend it already replaces the terminal harness.

The extracted creator ideas around multi-agent work are still useful:

- Simon Scrapes: multi-pane agent workspace grid.
- Matt Pocock: isolated worktree manager / deslop workflow.
- Nate Herk: git worktree agent orchestrator.
- Mark Kashef: governed reusable skills and handoff discipline.

Those inform a future builder-control surface, but they are not the next build until the extraction/intelligence spine is reliable.

## What Is Already Carded

### God Mode Extraction

- `GOD-MODE-EXTRACTOR-PARITY-GATE-001`: defines the minimum God Mode standard. It now requires proof that no source can claim God Mode while comments, hands, resource links, source packets, or evidence fields are missing.
- `SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001`: source-family maturity matrix for YouTube, comments, long courses, GitHub, Skool, MyICOR, Drive/Meet training, Gmail/Missive, Slack, meetings, and system signals. It now requires capability level, model route, blockers, next card, and verifier-backed no-fake-God-Mode coverage.
- `YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001`: adds public comments as evidence, validation, objections, and implementation clues.
- `BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001`: turns video description/resource links into exact approve/deny/annotate packets before any crawl, login, purchase, or deeper read.
- `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001`: catch up approved public YouTube creators, then keep new releases current.
- `YOUTUBE-GOD-MODE-AUTONOMOUS-WATCH-SCHEDULER-001`: no-babysitting public YouTube scheduling under parity, budget, model, long-course, and source-value rules.
- `YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001`: routes oversized training/course videos into a long-watch lane instead of forcing short-video assumptions.
- `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`: parked P0 runtime idea for eyes/hands/brain posture.

### Synthesis, Router, Director, Portfolio

- `INTELLIGENCE-SPINE-QUALITY-EVAL-001`: evaluates extractor/synthesis/director quality before trusting output.
- `SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001`: flags or triggers synthesis after extractor runs so fresh source data is not left unsynthesized.
- `DEV-SOURCE-SLICE-ROUTER-001`: routes only Dev-relevant source signals from the Foundation pool into Dev Intelligence.
- `DEV-INTEL-SOURCE-COVERAGE-001`: shows which source families actively feed Dev and which are blocked or partial.
- `DEV-BUILD-OPPORTUNITY-SCOPER-001`: turns Director recommendations into proposal-only scoped build candidates with proof and source lineage.
- `BUILD-PORTFOLIO-SCRUM-MASTER-001`: merges overlapping scoped ideas, returns thin cards to Scoper, and proposes queue order before Steve approval.
- `BUILD-INTEL-SOURCE-VALUE-GRADER-001`: grades creators/source families by evidence and lane, not vibes.

### Foundation Systems UI / Brain Routes

- `SYSTEM-014`: Brain Fleet / System Control surface. Shows every LLM-powered package with provider, model, effort, status, what it powers, and governed switching.
- `FOUNDATION-IA-UI-RESTRUCTURE`: broader Foundation UI information architecture cleanup.
- `FOUNDATION-UP-CAPABILITY-REGISTRY-001`: done capability registry precedent.

Important drift: `foundation-data-sources-v2` exists in code/routes, but the exact "Foundation data sources V2 page" idea is not represented by one clean direct card. For now, do not create a duplicate card until the current extractor/source-family matrix work decides what belongs on Foundation versus Dev Hub.

### Hardcoding / Audit Safety

- `CODEBASE-HARDCODE-AUDIT-001`: done V1 hardcoded live-truth audit.
- `NIGHTLY-AUDIT-FLEET-001`: specialist auditor fleet. It now requires proof for hardcoded truth, extractor parity, synthesis/director quality, source freshness, UI/style, process/write-boundary, and mission-doctrine lanes. It is report-only first and must not auto-fix or auto-create cards.

### Parallel Builder / Multi-Lane Work

- `PARALLEL-BUILDER-OPERATING-SYSTEM-001`: done protocol for visible builder chats, worktrees, file ownership, lock discipline, merge order, and blocker reports.
- `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001`: done protocol for extraction workers.
- `MULTI-WORKER-DISPATCH-001`: scoped later work for dispatching multiple workers.

Important drift: there is no direct "parallel builder mission-control grid" UI card. This should stay parked until extraction/router/director quality is stable, otherwise it becomes a distraction from the actual bottleneck.

Follow-up correction: a report-only parallel builder lane snapshot was briefly exposed on `/dev` as "Active Build Lanes." That was wrong because it rendered hardcoded protocol state as live operator truth. The Dev page must not show builder lanes again until the data comes from real runtime/worker state with current owners, file locks, proof status, and stop paths. Until then, parallel-builder material stays in process docs/checks only.

Parity gate progress: `GOD-MODE-EXTRACTOR-PARITY-GATE-001` now has `npm run process:god-mode-extractor-parity-gate-check -- --json`. The proof covers 13 source families, confirms the current system has zero full-God-Mode claims, and dogfoods that false claims fail for partial YouTube video extraction and paid Skool. The Dev Hub read model now exposes `godModeExtractorParity` for future UI display, while the YouTube lane is labeled truthfully as video intelligence until comments, approved resource follow-up, and browser hands are proven.

## New Source Lead Captured

Steve added Nuno Tavares / Automated Marketer as an ungraded Build Intel source.

Captured in:

- `lib/build-intel-watchlist.js`
- `docs/source-notes/creator-watchlist-reconcile-2026-05-23.md`

Source refs:

- Channel: `https://www.youtube.com/channel/UC58LYmAXBma-jx3hhs0lo5w`
- Video: `https://www.youtube.com/watch?v=L2JKgj7WzU4`
- Site: `https://automatedmarketer.net/`

Status: ungraded P1 Build Intel source. Do not assume quality. Watch/extract with the same source-value grader as everyone else, then classify S/A/B/C/D from evidence.

## Verification During This Checkpoint

Backlog hygiene before enrichment had three warnings:

- `GOD-MODE-EXTRACTOR-PARITY-GATE-001`
- `SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001`
- `NIGHTLY-AUDIT-FLEET-001`

All three were enriched with explicit proof/scope status notes. Current result:

- `npm run backlog:hygiene -- --json`: healthy, 843 cards scanned, 0 findings.
- `node --check lib/build-intel-watchlist.js`: passed.
- Direct watchlist snapshot: ready, 39 total entries, 35 Build Intel entries, Nuno present and not approved for extraction this sprint.

Known unrelated warning:

- `npm run process:build-intel-creator-watchlist-expansion-check -- --json` still fails on old Current Sprint overlay metadata / missing Plan Critic rows for historical sprint items. The watchlist snapshot itself is healthy; do not treat this as caused by Nuno.

## Immediate Game Plan

1. Finish this checkpoint and keep the worktree clean.
2. Run the God Mode extractor parity gate before broad "fully caught up" claims.
3. Build or expose the source-family God Mode maturity matrix so Steve can see which extractors are connected, extracting, synthesizing, routed, blocked, or partial.
4. Fix synthesis/router freshness so every extractor run either triggers a bounded synthesis refresh or clearly shows stale brain output.
5. Run the intelligence spine quality eval against extractor -> synthesis -> Director output.
6. Then run public YouTube catch-up under the best available God Mode lane, including source-value grading and new-release monitoring.
7. Only after enough source coverage exists should Scoper and Portfolio/Sprint Master promote build candidates for Steve approval.

## Not Next

- Do not build the parallel builder UI yet.
- Do not create more duplicate Foundation/Dev pages until the source-family matrix says what belongs where.
- Do not crawl paid/private/auth sources without source packets and explicit approval.
- Do not claim an extractor is God Mode unless the parity gate proves it.
- Do not auto-create backlog cards from extracted ideas before Scoper/Portfolio gates.
