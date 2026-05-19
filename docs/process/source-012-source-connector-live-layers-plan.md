# SOURCE-012 Source Connector Live Layers Plan

## What

Expose source contracts and connectors as separate live layers in `/api/source-of-truth` and Data Sources.

V1 adds a compact layer model with source status, connector status, trust status, freshness status, drift status, owner, direct source links, dependent systems, and connector IDs. It does not add new connectors or run extraction.

## Why

Extraction should not expand on fuzzy source truth. A working connector means the pipe exists. It does not mean the source is signed off, fresh, trusted, or safe for downstream automation.

Steve needs one visible source model that answers:

- what is the source,
- who owns it,
- whether its meaning is trusted,
- whether the connector is working,
- whether freshness/drift is clear or watch,
- what systems depend on it,
- where the direct source link lives.

## Acceptance Criteria

- `/api/source-of-truth` includes `sourceLayerStatus`.
- `sourceLayerStatus.layers` includes source contracts, connectors, trust, freshness/drift, and dependencies.
- Each source row exposes `sourceId`, `sourceType`, `sourceStatus`, `connectorStatus`, `trustStatus`, `freshnessStatus`, `driftStatus`, `owner`, `directSourceLinks`, `dependentSystems`, and `connectorIds`.
- Each connector row exposes `connectorId`, `connectorStatus`, dependent systems, and a trust boundary.
- Dogfood proves a working connector can support both a trusted source and a scoped/untrusted source without upgrading trust.
- Data Sources renders the layer summary from live API data.
- Current Sprint advances to `SOURCE-018` after closeout.

## Definition Of Done

- `process:source-012-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `source-012-source-connector-live-layers-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing source contracts, connectors, and grouped systems. It adds `lib/source-012-source-connector-layers.js` as the source layer evaluator and wires its output into `buildSourceOfTruthPayload()`.

The UI change is deliberately small: Data Sources shows a compact Source Layers panel above the existing source systems and connector sections. It does not create a second source registry page.

## Reuse Existing Work

Reuse existing code:

- `lib/source-contracts.js`
- `lib/source-of-truth-payload.js`
- `public/foundation-source-registry-renderers.js`
- `public/foundation.js`

Reuse existing docs:

- `docs/source-registry.md`
- `docs/process/frontend-source-registry-renderers-split-001-plan.md`
- `docs/process/connector-routing-truth-2026-05-12-plan.md`

Reuse existing scripts:

- `scripts/foundation-verify.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

The dogfood proof builds two synthetic source contracts attached to one working connector. One source is trusted; one is scoped and not trusted. The proof passes only if the connector status remains separate from trust status.

Live proof checks the real `/api/source-of-truth` payload and fails if source rows or connector rows are missing the canonical layer fields.

## Tests

- `node --check lib/source-012-source-connector-layers.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js public/foundation.js scripts/process-source-012-check.mjs`
- `npm run process:source-012-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-012 --planApprovalRef=docs/process/approvals/SOURCE-012.json --closeoutKey=source-012-source-connector-live-layers-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-012 --closeoutKey=source-012-source-connector-live-layers-v1`
- `npm run process:foundation-ship -- --card=SOURCE-012 --planApprovalRef=docs/process/approvals/SOURCE-012.json --closeoutKey=source-012-source-connector-live-layers-v1 --commitRef=HEAD`

Gate decision tree: static checks are not enough because this changes API payload and browser rendering. Focused proof is `process:source-012-check`. Full verification is required because the blast radius touches source contracts, frontend Data Sources, Current Sprint, package scripts, closeout registry, and `foundation:verify`.

Operator value: this unlocks useful behavior for Steve. He can inspect whether a source is trusted, merely connected, stale/watch, blocked, or depended on by another system without asking a builder to translate connector status.

Speed bound: the focused proof is a thin in-process payload evaluation plus existing fast health gates and should run under 2 minutes.

## Risks

- Risk: this drifts into source extraction. Mitigation: no extraction jobs, no source reads beyond existing local source-contract data, and no external writes.
- Risk: this creates a second source registry. Mitigation: V1 only adds a compact layer panel to the existing Data Sources pages.
- Risk: API payload exceeds route budgets. Mitigation: the layer model is compact and uses summarized rows, not full source note bodies.

Rollback or repair path: if focused proof fails, do not close the card or advance to `SOURCE-018`. Fix the exact failing proof path and rerun `process:source-012-check`. If the live payload or UI behavior regresses after commit, route a `SOURCE-012` repair card or revert the commit before `process:foundation-ship`; do not classify connector/source trust drift as green.

## Not Next

- Do not run live extraction.
- Do not add new source access.
- Do not mutate source data, Drive permissions, credentials, provider config, or external systems.
- Do not start Value Builder split.
- Do not treat connector access as source trust.
