# Foundation Next Sprint Queue - 2026-05-17

Purpose: give the next builder a clean Foundation-only queue after the overnight verifier split run. Work from repo truth, not stale chat memory.

## Current State

- `server.js`: 4,831 lines
- `lib/foundation-db.js`: 4,734 lines
- `public/foundation.js`: 4,909 lines
- `scripts/foundation-verify.mjs`: 5,375 lines
- `docs/handoffs/nightly-deep-audit-2026-05-17.md` exists locally and was generated at the 3am ET audit window.
- `docs/handoffs/system-health-2026-05-17.md` exists locally and is `risk`.
- Local visual sandbox/mockup assets are intentionally excluded from status through `.git/info/exclude`; do not delete them.

## Engineering Size Standard

This is the standard to wire into Foundation gates:

- `0-1,500` lines: preferred target for hand-written modules.
- `1,500-3,000` lines: acceptable only when cohesive; system health should show watch.
- `>3,000` lines: split plan required before adding more code.
- `>5,000` lines: hard problem for critical source files; should fail Foundation standards unless explicitly exempted with a dated split plan.
- `>10,000` lines: red-zone failure.

Generated files, seed files, closeout registries, report artifacts, and archives need separate budgets. They are not exempt from bloat control; they just use different budgets.

## Sprint 1 - System Health Red-To-Green

Card: `SYSTEM-HEALTH-RED-TO-GREEN-001`

Goal: do not proceed as if Foundation is green while the morning health report is red.

Scope:

- Investigate why `System Health Nightly Audit` is still marked `running` in `system-health-2026-05-17.md`.
- Investigate the failed `Meeting Transcript Extraction Backlog` run.
- Confirm the 2026-05-17 nightly audit run is represented correctly in the job ledger, not just written as a local file.
- Ensure the generated audit and system-health reports are committed as repo truth or intentionally archived by policy.
- Reduce or formally route the `docs/handoffs` hot-doc budget warning.

Acceptance:

- Focused proof recreates a stale/running scheduled job and proves system health flags it loudly.
- Current `system-health` output is green or has only explicitly accepted watch items.
- `foundation:verify`, backlog hygiene, and `process:foundation-ship` pass.
- Closeout states every remaining red/yellow item, if any.

## Sprint 2 - Critical Files Under 5K

Card: `CRITICAL-FILES-UNDER-5K-001`

Goal: finish the emergency monolith cleanup threshold.

Scope:

- Split `scripts/foundation-verify.mjs` below 5,000 lines by real verifier responsibility.
- Confirm `server.js`, `lib/foundation-db.js`, and `public/foundation.js` remain below 5,000.
- Do not split randomly for line count. Root files should become orchestration maps; modules should own coherent jobs.

Acceptance:

- All four critical files are below 5,000 lines.
- Focused proof proves the extracted verifier domain still fails closed on a real synthetic failure.
- Plan Critic rejects adding more code to any critical file over budget without a split plan.
- Closeout includes before/after line counts.

## Sprint 3 - File Size Engineering Standard

Card: `FILE-SIZE-ENGINEERING-STANDARD-001`

Goal: make the size standard enforceable instead of another reminder.

Scope:

- Add size budgets to Plan Critic, system health, and Foundation ship checks.
- Require a split plan for additions to hand-written files over 3,000 lines.
- Reject new hand-written modules over 1,500 lines unless the plan includes a specific cohesion justification.
- Treat critical source files over 5,000 as fail-closed unless explicitly exempted with a dated split plan.
- Add separate budgets for generated data, closeout registries, audit reports, and archives.

Acceptance:

- Dogfood proof: synthesize a plan that adds 100 lines to an over-3K file without a split plan and prove Plan Critic rejects it.
- Dogfood proof: synthesize a new 1,800-line hand-written module without justification and prove Plan Critic rejects it.
- System health shows top oversized files and trend posture.
- `foundation:verify` includes the standard.

## Sprint 4 - Critical Roots Under 3K Phase 1

Card: `CRITICAL-ROOTS-UNDER-3K-PHASE-1`

Goal: move from "not on fire" to cleaner architecture.

Scope:

- Start with the root file closest to risk or hardest for agents to reason about.
- Target root orchestration files below 3,000 lines over staged domain splits.
- Candidate roots: `scripts/foundation-verify.mjs`, `public/foundation.js`, `server.js`, `lib/foundation-db.js`.
- Keep module boundaries meaningful; do not create tiny random files.

Acceptance:

- At least one critical root drops below 3,000 lines.
- No extracted module exceeds 1,500 lines without a cohesion justification.
- Focused proof and full ship gate pass.
- Closeout lists exact remaining roots and next split boundary.

## Sprint 5 - No-Auth Connector Completion

Card: `NO-AUTH-CONNECTOR-COMPLETION-001`

Goal: return to value delivery after the health and standards gates are in place.

Scope:

- Continue missing source contracts and extraction prep that do not require Steve auth.
- Candidate source contracts: Google Sheets, Google Docs, Google Slides, Search Console, Google Analytics, Google Business Profile, Reddit, GitHub, X/Twitter through approved crawl path, generic Web crawl.
- Keep Skool, MyICOR, Loom, SocialPilot, and other auth-required sources out of scope until Steve approves access.

Acceptance:

- Each source has a scoped contract, extraction posture, source-health behavior, and atom-flow proof.
- No live spend or new external auth.
- Source-health surface shows configured/idle/degraded status clearly.

## Stop Conditions

- If system health is red, stop new value work and fix/route the red item.
- If a split would require arbitrary line-count surgery, stop and pick a better domain boundary.
- If a connector requires Steve auth, scope it and move on.
- If context gets large, write a fresh handoff before continuing.
