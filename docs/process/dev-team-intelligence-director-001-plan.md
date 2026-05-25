# DEV-TEAM-INTELLIGENCE-DIRECTOR-001 Plan

## What

Build the first narrow Dev Team Intelligence Director V0 for the YouTube-to-Dev-Team sprint.

The Director reads existing Foundation intelligence truth from public YouTube/God Mode extractor reports, atoms, evidence hits, action-required links, Current Sprint, and the AIOS mission in `docs/system-strategy.md`. It produces one source-backed Director report that ranks build candidates against the mission instead of treating every extracted idea as equally important.

## Why

The extractor is now producing useful report/atom/evidence truth, but Steve should not have to read every raw report, every video pool row, or every atom to decide what matters.

The useful loop is:

`approved source -> God Mode extraction -> report/atoms/hits -> Director synthesis -> Scoper -> Build Portfolio/Sprint Master -> scoped backlog candidate -> Steve approval/promotion`

This card creates the Director synthesis layer. It does not create backlog cards automatically.

## Acceptance Criteria

- The Director reads `docs/system-strategy.md`, including the AIOS Mission.
- The Director reads `docs/business-strategy.md`, `docs/rebuild/current-plan.md`, live Current Sprint, and existing intelligence report bundles.
- The Director consumes at least three existing source-backed report artifacts from the YouTube/God Mode extraction lane.
- The Director scores candidates against mission lanes: Foundation/shared truth, God Mode Extractor, reliable agents/execution systems, context continuity, agent/realtor coaching leverage, and approval-gated build path.
- The Director emits top recommended build candidates, strong next/merge candidates, source coverage, approval-required items, open questions, and proof checks.
- Top recommendations remain proposal-only and must go to Scoper plus Build Portfolio/Sprint Master before Steve is asked to approve promotion/build work.
- The Director persists one `director_brief` report artifact, proposal-only atoms for the top recommendations, and supporting evidence hits.
- No backlog cards are created automatically.
- No private/auth/member/course extraction, external writes, purchases, downloads, opt-ins, forms, credential mutation, or browser-profile mutation occurs.

## Definition Of Done

Done means `DEV-TEAM-INTELLIGENCE-DIRECTOR-001` has a focused proof command that builds and persists the first Director report, reads it back from Foundation truth, records proposal-only atoms/hits, proves the AIOS mission is the ranking lens, and leaves Scoper plus Current Sprint/Backlog promotion approval-gated.

## Details

Existing work reused:

- Existing code: `lib/dev-team-hub.js`, `lib/foundation-build-intel-routes.js`, Foundation intelligence report/atom/hit stores, and Current Sprint readers.
- Existing docs: `docs/system-strategy.md`, `docs/business-strategy.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, God Mode source notes, and YouTube sprint handoffs.
- Existing scripts: `scripts/process-mark-kashef-last-50-baseline-check.mjs`, `scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs`, and `scripts/process-dev-team-hub-v0-check.mjs`.
- Live Backlog and Current Sprint remain the task truth. This card reads Current Sprint context but does not advance or close the active Mark card.
- `intelligence_report_artifacts`
- `intelligence_atoms`
- `intelligence_atom_hits`
- Existing God Mode / YouTube report artifacts:
  - `proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY`
  - `batch:mark-kashef-last-50:20260523221531`
  - `proof:god-mode-extractor-eyes-quality-loop-001`
  - `scout:youtube-scout-latest-video-vision-002:mark-kashef-latest-20`
  - `research:god-mode-extractor-research-swarm-001`
  - `extraction:marketing-ai-avatar:xUdKBqP81k8:gemini-workspace-eyes`

New focused code:

- `lib/dev-team-intelligence-director.js`
- `scripts/process-dev-team-intelligence-director-check.mjs`
- `docs/source-notes/dev-team-intelligence-director-2026-05-24.md`

Behavior proof: the focused script calls the real Foundation report bundle read path, live Current Sprint read path, report/atom/hit persistence path, and persisted readback path. It proves the actual function/API/process path through a DB round-trip. Substring-only proof is rejected; marker checks, stale screenshots, and "the report says it exists" are not accepted.

Gate decision tree: static, focused, and full gates are chosen by blast radius. Static gates are syntax-only (`node --check`). The focused gate is `process:dev-team-intelligence-director-check` and proves the real Foundation DB/API round-trip for report bundle reads plus report/atom/hit persistence. Full gates (`foundation:verify`, Current Sprint gate, backlog hygiene, and plan reconcile) still run after persistence before handoff because this touches Foundation intelligence truth.

Operator value: Steve gets a morning-readable ranked build-candidate report that says what matters, why it matters, what source proved it, and what needs approval before it becomes backlog work. The useful product behavior is a real decision surface, not just process artifacts.

Speed boundary: this is a fast, proportional synthesis/report card, not another extractor. The focused proof should run under 3 minutes because it does not call Gemini, crawl YouTube, open Skool, or run broad source extraction.

Repair path: if source bundles are missing, mission scoring is not connected, persistence fails, or readback fails, the card fails closed. Fix the exact failing report/atom path and rerun the focused proof. Do not replace the Director with chat-only summary. A later follow-up can add an LLM synthesis pass only after the deterministic source-backed Director is proven.

## Risks

- Source reports may be missing or stale. Repair path: fail closed and identify the missing report artifact instead of inventing candidates.
- Candidate scoring may overweight keyword matches. Repair path: keep the source evidence visible and let Steve approve or reject promotion before backlog creation.
- The Director could drift into auto-scrum-master behavior. Repair path: V0 stays proposal-only, does not create backlog cards, and leaves duplicate/overlap merge work to `BUILD-PORTFOLIO-SCRUM-MASTER-001`.
- The Director could become a UI rebuild. Repair path: keep V0 to report/atoms/hits and use Dev Hub UI as a separate card.
- The Director could become another expensive model path. Repair path: V0 uses deterministic scoring only and no provider/model call.

## Not Next

Out of scope / do not:

- Do not create automatic backlog cards.
- Do not rebuild the Dev Hub UI.
- Do not run Skool, MyICOR, private/auth/member/course extraction.
- Do not perform external writes.
- Do not call a model/provider in V0 Director scoring.
- Do not work Strategy or People.

## Tests

- `node --check lib/dev-team-intelligence-director.js`
- `node --check scripts/process-dev-team-intelligence-director-check.mjs`
- `npm run process:dev-team-intelligence-director-check -- --apply --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
