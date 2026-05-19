# DATA-002 Source Trust Scoring Plan

## What

Build the `DATA-002` source trust scoring layer.

Every source contract in `/api/source-of-truth` gets a 0-100 score, component scores, decision state, plain-English meaning, owner, and next trigger. The score is also attached to `sourceLayerStatus.sourceRows[]` and rendered in Data Sources beside each source contract.

Closeout key: `data-002-source-trust-scoring-v1`.

## Why

Connector access is not source trust. A source can be technically readable while still being stale, unsigned, incomplete, schema-risky, scoped, or blocked.

Steve needs the system to show which sources are decision-safe and which sources need review before extraction, synthesis, Strategy Hub, or future agents rely on them. This removes the mental work of combining connector status, sign-off state, freshness, completeness, and schema health by hand.

## Definition Of Done

- Every current source contract has a bounded 0-100 score.
- Every score has component scores for source trust, connector health, freshness, completeness, and schema health.
- Every score has `decision_safe`, `usable_with_review`, `review_required`, or `not_decision_safe` state.
- Every score has a plain-English meaning and next trigger.
- Readable-only, scoped, unsigned, or blocked sources cannot become decision-safe from connector health alone.
- `/api/source-of-truth` exposes compact source scores and next-trigger codes on `sources[]`, plus aggregate source-layer trust counts on `sourceLayerStatus.summary.sourceTrustScoreSummary`, while staying inside the source-truth route budget.
- Data Sources renders score, decision state, and next trigger.
- Focused proof passes, then full Foundation gates pass.
- Current GOD-mode extraction sprint closes after DATA-002 and opens `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19` with `MEMORY-003` as the active blocker so Current Sprint truth never goes missing.

## Acceptance Criteria

- `buildSourceTrustScoringSnapshot()` returns `healthy` with 42 scored source contracts.
- `evaluateSourceTrustScoringSnapshot()` fails closed if any source is missing score, component score, decision state, plain-English meaning, or next trigger.
- Dogfood proves a signed/current-reality source can become `decision_safe`.
- Dogfood proves a readable-only source with a working connector stays review-gated and does not become `decision_safe`.
- Dogfood proves a blocked/gap source stays `not_decision_safe`.
- `/api/source-of-truth` includes `sourceTrustScoring` summary data and compact `sources[].trustScore`; the full component-score proof stays in the focused process check instead of bloating the default route.
- Data Sources source cards display the score, decision state, and next trigger.
- Closeout proof advances DATA-002 to done, closes the current GOD-mode extraction sprint, and opens the next Foundation sprint around conversation/gold capture instead of leaving a sprintless gap.

## Details

Add `lib/data-002-source-trust-scoring.js` as the scoring owner. The model is local/read-only and uses existing source truth only:

- source contracts from `lib/source-contracts.js`
- source-layer rows from `lib/source-012-source-connector-layers.js`
- KPI/Supabase health from the existing cached KPI health payload
- source-of-truth payload assembly from `lib/source-of-truth-payload.js`

Scoring weights:

- source trust: 30
- connector health: 20
- freshness: 20
- completeness: 15
- schema health: 15

The decision rule is intentionally conservative:

- `decision_safe` requires high score, trusted source status, freshness, and non-blocking drift.
- `usable_with_review` allows strong readable/current evidence but keeps review in the loop.
- `review_required` means useful source evidence exists but trust/freshness/completeness needs hardening.
- `not_decision_safe` covers scoped, blocked, gap, stale, or low-score sources.

## Reuse Existing Work

Reuse existing code:

- `SOURCE-012` source/connector live layers
- `SOURCE-019` shared communications layer proof
- `SOURCE-020` shared communications adapter proof
- `lib/source-of-truth-payload.js`
- `public/foundation-source-registry-renderers.js`

Reuse existing docs:

- `docs/source-registry.md`
- `docs/process/source-012-source-connector-live-layers-plan.md`
- `docs/process/source-019-shared-comms-layer-plan.md`
- `docs/process/source-020-shared-comms-adapters-plan.md`

Reuse existing scripts:

- `scripts/process-source-020-check.mjs` as the closeout proof pattern
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `backlog:hygiene`
- `foundation:verify`

Live backlog and Current Sprint truth reused:

- `DATA-002`
- `SOURCE-012`
- `SOURCE-019`
- `SOURCE-020`

## Operator Value

Operator behavior:

- A source card tells Steve the score, decision state, and next trigger without opening the source registry internals.
- The source-layer summary shows scored count, average score, decision-safe count, and review/blocked count.
- Low-trust sources stay visible instead of becoming hidden warnings.

## Risks

- Fake precision risk: mitigate with component scores, decision states, and plain-English next triggers.
- Connector-overtrust risk: dogfood proves readable-only/gap sources do not become decision-safe from connector health alone.
- Scope creep risk: no extraction, source sync, browser sessions, model calls, screenshots, OCR, transcription, or broad crawl.
- Mutation risk: no source-data, Drive permission, credential, provider config, atom, vector, KB, synthesis, action-route, backlog-content, external-send, or public-exposure mutation.
- UI noise risk: render compact score tags and metadata only; do not redesign Data Sources.

Rollback/repair:

- If scoring payload breaks `/api/source-of-truth`, revert `lib/source-of-truth-payload.js` attachment and leave `lib/data-002-source-trust-scoring.js` unused until fixed.
- If UI rendering regresses, remove the score rendering hooks while keeping API scoring covered by focused proof.
- If dogfood catches connector-overtrust, fix scoring rules before closeout.

## Tests

Focused proof:

- `node --check lib/data-002-source-trust-scoring.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js scripts/process-data-002-check.mjs`
- `npm run process:data-002-check -- --close-card --json`

Dogfood:

- signed/current source becomes decision-safe
- readable-only source with working connector stays review-gated
- blocked/gap source stays not decision-safe
- every live source contract has score, components, decision state, and next trigger

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DATA-002 --planApprovalRef=docs/process/approvals/DATA-002.json --closeoutKey=data-002-source-trust-scoring-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DATA-002 --closeoutKey=data-002-source-trust-scoring-v1`
- `npm run process:foundation-ship -- --card=DATA-002 --planApprovalRef=docs/process/approvals/DATA-002.json --closeoutKey=data-002-source-trust-scoring-v1 --commitRef=HEAD`

Gate decision:

- Static syntax checks first.
- Focused proof owns behavior.
- Full Foundation gates are required because `/api/source-of-truth`, Data Sources, backlog truth, Current Sprint completion state, and next-sprint activation are touched.

Gate speed:

- The focused proof only reads local files, `/api/source-of-truth` construction, and local DB sprint/backlog rows.
- The focused proof is intentionally fast and should complete under 2 minutes; the expensive full verifier remains a ship gate, not the inner development loop.

## Not Next

- No extraction or source sync.
- No browser session, model synthesis, provider call, screenshot, OCR, transcription, or broad crawl.
- No source-data mutation.
- No Drive permission mutation.
- No credential or provider config mutation.
- No atom, vector, KB, synthesis, action-route, or backlog writes from source content.
- No external sends or public exposure.
- No Value Builder split.
