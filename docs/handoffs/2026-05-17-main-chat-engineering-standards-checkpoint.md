# Main Chat Engineering Standards Checkpoint

Date: 2026-05-17
Status: checkpoint / backlog capture

## Repo Truth

- Branch: `foundation/system-health-red-to-green-001`
- Latest shipped commit at checkpoint: `d28c2d5 Ship build lane reliability sprint`
- Worktree was clean after the builder closeout.
- `BUILD-LANE-RELIABILITY-SPRINT-001` shipped and pushed.
- `SOURCE-CONTRACT-VALIDATION-LAYER-001` shipped before it.
- `EXTRACTION-RUNTIME-READINESS-001` remains scoped and unshipped.

## What Just Shipped

`BUILD-LANE-RELIABILITY-SPRINT-001` closed the immediate build-lane drag under `build-lane-reliability-sprint-v1`.

Done subcards:

- `FOUNDATION-CARD-SCAFFOLD-001`
- `CURRENT-SPRINT-METADATA-STANDARD-GUARD-001`
- `PROOF-DESIGN-BRITTLENESS-GUARD-001`
- `VERIFY-LOOP-EFFICIENCY-GUARD-001`
- `CURRENT-SPRINT-SURFACE-API-DRIFT-001`
- `SHIP-GATE-SERVED-CODE-FANOUT-SYNC-001`

Builder closeout proof:

- Focused build-lane proof passed.
- Source-contract proof passed.
- Payload budget V2 proof passed.
- Current Sprint split proof passed.
- Backlog hygiene passed: 646 cards, 0 findings.
- `foundation:verify` passed: 447/447.
- Full `process:foundation-ship` passed in 70.6s.
- Fanout passed and Recent Builds exposed the closeout.
- Dashboard and worker served commit matched `d28c2d5`.

## Steve's Engineering Standards Correction

Steve correctly challenged a broader architecture issue:

- Foundation had been fixing file monoliths while allowing the default Foundation Hub/API/page surface to become a payload/page monolith.
- A menu page should not load every Foundation dataset up front.
- Agents should not ingest one huge Foundation Hub payload when a narrow route can answer the question.
- Payload budgets are useful, but failures need section attribution so builders do not spend time guessing.
- Engineering standards must be executable, not remembered manually.

This checkpoint promotes that correction into live backlog truth.

## New Live Cards Captured

The following cards were created/enriched in live backlog from this main-chat review. Backlog hygiene passed afterward with 650 cards and 0 findings.

### `FOUNDATION-ENGINEERING-FITNESS-GATES-001` P0

Create one Foundation engineering standards gate that enforces file-size, API payload, page/surface, agent-route, verification-loop, build-artifact, and runtime-truth budgets before future work creates more debt.

Acceptance direction:

- Files: target under 1,500 lines, warn over 3,000, split plan required over 5,000, red over 10,000.
- APIs: default routes are summary-only, detail routes are separate, full diagnostics only by explicit full view.
- Pages: shell/menu loads first, menu sections fetch their own data.
- Agents: use narrow Foundation routes by task, not broad default payloads.
- Verification: focused proof while building, targeted checks while debugging, one full ship gate at final ship.
- Runtime: served code must match repo HEAD before fanout, current sprint API must match DB, scheduled jobs expose freshness.

### `FOUNDATION-SURFACE-AND-API-BUDGETS-001` P0

Enforce standards across files, default APIs, full diagnostics APIs, page surfaces, and agent route usage so Foundation does not create a new API/page monolith while file monoliths are being split.

Acceptance direction:

- Oversized default API section fails with section attribution.
- Full diagnostics route passes under separate larger budget.
- Default operator routes stay summary-only.
- Agent route guidance proves narrow task-specific routes do not require full Hub payload.

### `FOUNDATION-HUB-DECOMPOSITION-GUARD-001` P0

Prevent default Foundation Hub from becoming an API/page monolith by keeping it summary/command-center only and routing Recent Work, Backlog, Source Registry, Current Sprint, System Health, and diagnostics to dedicated detail routes.

Acceptance direction:

- Oversized `currentSprint`, `recentWork`, `backlog`, and `sourceRegistry` fixtures fail with section attribution.
- Compact default Hub passes.
- Full diagnostics and dedicated endpoints preserve deep detail under separate budgets.
- This is architecture guardrail work, not visual UI redesign.

### `FOUNDATION-LAZY-SURFACE-LOADING-001` P1

Change Foundation frontend/API loading posture so the shell/menu and overview load first, and detail surfaces fetch their own routes on demand.

Acceptance direction:

- Initial Foundation load does not fetch full detail routes.
- Clicking Recent Work fetches build-log/recent-work payload.
- Clicking Backlog fetches backlog payload.
- Clicking Source Registry fetches source payload.
- Clicking System Health fetches health payload.
- Default Hub stays under budget.

## Next Sprint Recommendation

Do `FOUNDATION-ENGINEERING-FITNESS-GATES-001` before `EXTRACTION-RUNTIME-READINESS-001`.

Reason: source-contract validation and build-lane reliability are now green, but Steve identified a still-open engineering-standard gap across APIs/pages/agent payloads. Extraction will add more source and payload pressure. The standards gate should land first so extraction work builds against the right architecture.

## Exact Builder Message

```text
Start from repo truth on branch foundation/system-health-red-to-green-001.

Read:
- docs/handoffs/2026-05-17-build-lane-reliability-sprint-closeout.md
- docs/handoffs/2026-05-17-main-chat-engineering-standards-checkpoint.md

Do not start EXTRACTION-RUNTIME-READINESS-001 yet.

Next sprint is FOUNDATION-ENGINEERING-FITNESS-GATES-001.

Goal:
Make Foundation engineering standards executable across files, APIs, pages, agent route usage, verification loops, build artifacts, and runtime truth so the system does not create new tech debt while shipping.

Include these live cards in the sprint scope:
- FOUNDATION-ENGINEERING-FITNESS-GATES-001
- FOUNDATION-SURFACE-AND-API-BUDGETS-001
- FOUNDATION-HUB-DECOMPOSITION-GUARD-001
- FOUNDATION-LAZY-SURFACE-LOADING-001 if it can be done as loading architecture without visual UI redesign; otherwise scope it as the immediate follow-up.

Core standards:
- hand-written files target under 1,500 lines, warn over 3,000, split plan required over 5,000, red over 10,000
- default APIs are summary-only and budgeted
- full diagnostics APIs have separate larger budgets
- payload budget failures report top oversized sections
- Foundation page shell/menu should not load every dataset up front
- menu/detail surfaces should fetch their own routes on demand
- agents should use narrow task-specific routes instead of broad default Hub payloads
- focused proof while iterating, targeted checks while debugging, full ship gate once at final ship
- served dashboard/worker commit must match repo HEAD before fanout
- Current Sprint API must match DB truth

Dogfood:
- oversized file fixture warns/blocks correctly
- oversized default Hub section fails with section attribution
- compact default Hub passes
- full diagnostics route passes under separate budget
- simulated initial Foundation load does not fetch all detail routes
- simulated menu click fetches only that surface route
- narrow agent route can answer current-sprint/source-health style questions without full Hub payload
- repeated full verify loop is flagged
- stale served-code fanout fails with exact repair reason

Rules:
- No extractor work yet.
- No connector/auth work.
- No Harlan/Fal/voice/Canva/OpenHuman work.
- No broad visual UI redesign.
- No Drive permission mutation.
- No live Agent Feedback auto-send.
- Use focused proof while iterating.
- Full process:foundation-ship before push.
- Commit and push when green.

After this ships, the next recommended sprint is EXTRACTION-RUNTIME-READINESS-001 unless the engineering fitness gate exposes a red blocker.
```

## Verification Run From This Checkpoint

- `npm run backlog:hygiene -- --json`
- Result after new cards/enrichment: healthy, 650 cards, 0 findings.
