# FOUNDATION-PERFORMANCE-001 Plan

## What

Make the Foundation command surface fast enough for daily sprint work.

V1 targets the measured chokepoint from the deep audit: the default `/api/foundation-hub` route. The fix is a summary/detail split:

- Default `/api/foundation-hub` returns a bounded command-surface payload for normal Foundation pages.
- Explicit full/detail mode preserves the existing diagnostic payload for Runtime Health and deep debugging.
- The frontend uses the summary payload for normal pages and requests full detail only where the page actually needs diagnostics.
- A focused proof measures the route before/after and fails if the default route exceeds the latency or payload budget.

## Why

Steve's daily control surface cannot take a minute to load. A 63.5s, 4.5 MB default API is not a polish issue; it makes review, approval, and sprint control feel unreliable.

The deeper engineering issue is that `/api/foundation-hub` became an all-in-one aggregate. That is the same old-system smell: one surface quietly absorbing every responsibility until nobody can reason about it. This card does not split every monolith. It creates the first clean request boundary so normal operator work does not pay for every deep diagnostic every time.

The useful operator behavior is simple: Steve can open Foundation, Backlog, Current Sprint, and Recent Work during a real workflow without waiting on every diagnostic subsystem. This unlocks speed and quality for sprint review because the command surface becomes fast enough to use instead of bypass.

## Acceptance Criteria

- Baseline proof records the current default `/api/foundation-hub` latency and payload size.
- Default `/api/foundation-hub` returns under `2.5s` and under `1,500,000` bytes on the local Mac mini proof run.
- The full diagnostic payload remains available via explicit full/detail request and is used by Runtime Health.
- Normal Foundation pages use the bounded summary payload.
- The response exposes performance metadata: route mode, budget, measured duration, and payload bytes.
- The focused proof calls real local HTTP routes, not substring-only checks.
- Dogfood proof includes a synthetic oversized payload case and proves the budget check fails closed.
- Current Sprint and Recent Work still render against the summary payload.
- No source extraction, Build Intel, product feature, or broad UI redesign ships.

## Definition Of Done

- Sprint board shows `FOUNDATION-PERFORMANCE-001` moving from Scoping to Sprint Ready to Building Now to Done This Sprint with timestamps/proof.
- Plan Critic pass row exists at score `>= 9.8` before build.
- The route implementation has a clear summary/detail boundary.
- The focused proof passes and records before/after timing/payload numbers.
- `foundation:verify` covers this card by ID and checks the focused proof.
- Full `process:foundation-ship` passes before push.

## Details

Existing work to reuse:

- Existing code: `/api/foundation-hub`, `/api/foundation/current-sprint`, `buildFoundationCurrentSprintStatus`, `buildBacklogHygieneSnapshot`, `buildResearchCurationStatus`, `getFoundationSnapshot`, and existing source-of-truth endpoint builders.
- Existing docs: `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`, `docs/handoffs/2026-05-13-code-quality-nightly-audit-report.md`, and this sprint handoff.
- Existing scripts: `npm run backlog:hygiene -- --json`, `npm run foundation:verify`, `npm run process:foundation-ship`, and the existing process-check pattern used by other Foundation cards.
- Live backlog / Current Sprint truth: `FOUNDATION-PERFORMANCE-001` already exists as a scoped P0 card, and the sprint is opened in live DB before build.

Oversized-file rule:

- `server.js`, `lib/foundation-db.js`, `public/foundation.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-build-log.js` are all large-file risk surfaces.
- This sprint may touch them only to connect a narrow performance boundary.
- New performance-budget logic and proof logic should live in a small new module/script instead of expanding the large files more than needed.
- A later monolith-split sprint should continue extracting `foundation-db.js`, `foundation.js`, `foundation-verify.mjs`, and `server.js`; this card is not that broad refactor.

Gate decision tree:

- Static is too weak because this changes live route behavior.
- Focused proof is required because the card needs real API timing and payload checks.
- Full gate is required because the blast radius touches `server.js`, frontend data loading, verifier coverage, package scripts, current sprint state, and build-log closeout.

Reason: this changes the primary Foundation API, frontend data-loading behavior, verifier coverage, current sprint state, and build-log closeout.

## Risks

- Risk: summary mode silently removes data a page needs.
  - Repair path: keep full mode, use it where diagnostics are required, and prove Current Sprint/Recent Work still read the summary payload.
- Risk: performance proof becomes timing-flaky.
  - Repair path: use a generous budget relative to the baseline and measure payload bytes deterministically.
- Risk: this becomes a broad UI or monolith rewrite.
  - Repair path: stop at summary/detail split and focused proof. Queue broader splits separately.
- Risk: stale summary data creates false command truth.
  - Repair path: V1 does not use stale cache as the primary fix. It reduces the work required by the default request.

## Tests

```bash
npm run process:foundation-performance-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-PERFORMANCE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-PERFORMANCE-001.json --closeoutKey=foundation-performance-v1 --commitRef=HEAD
```

The focused proof must:

- Measure default `/api/foundation-hub`.
- Measure explicit full/detail `/api/foundation-hub?view=full`.
- Prove default payload is smaller than full payload.
- Prove default mode stays under budget.
- Prove full mode still includes diagnostic-only keys needed by Runtime Health.
- Prove synthetic oversized payload fails the budget evaluator.
- Use real route/API behavior and an actual budget evaluator. No substring-only proof is accepted; substring-only proof is rejected as insufficient.

## Not Next

- Do not build Build Intel extraction, Skool, myICOR, Loom, YouTube, or GStack work.
- Do not build Strategy, Sales, Marketing, Agent Feedback, or customer hub features.
- Do not run broad frontend redesign.
- Do not split every monolith in this sprint.
- Do not mutate Drive permissions or send request-access emails.
- Do not open the next sprint automatically.
