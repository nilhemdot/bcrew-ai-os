# DATA-003 Source-Backed Values Plan

## What

Ship the first live-rendered source cards for strategy values.

`DATA-003` adds a Strategy Overview strip that reads the existing live BHAG and Agent Engine document snapshots instead of copying milestone math into markdown. The cards show BHAG milestones, Agent Engine assumptions, source badges, source actions, as-of dates, and provenance.

Closeout key: `data-003-source-backed-values-v1`.

## Why

Steve should not have to wonder whether the business strategy page is showing live truth or stale prose. Markdown should explain the model. Source-backed rows should carry the numbers.

This card closes the first slice of the rule: live values belong in source systems and source-backed UI views, not markdown snapshots.

## Definition Of Done

- Strategy Overview renders live source-backed value cards for:
  - team BHAG pace
  - community BHAG pace
  - Agent Engine assumptions
  - Agent Engine capacity
- The cards use existing `/api/doc` source snapshots for `docs/strategy/bhag-model.md` and `docs/strategy/agent-engine.md`.
- Each displayed value carries source ID, as-of date, and detail provenance.
- Source badges and source actions stay visible on the cards.
- `/api/source-of-truth` does not gain live Google Sheet reads or payload bloat from this slice.
- The supporting BHAG and Agent Engine doc pages keep their inline source-backed tables.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- Current Sprint advances to `FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001`.

## Acceptance Criteria

- `buildData003LiveSourceBackedValues()` returns at least four cards and at least four required source IDs.
- Required source IDs include `SRC-FREEDOM-BHAG-001`, `SRC-FREEDOM-ENGINE-001`, `SRC-FREEDOM-COMMUNITY-001`, and `SRC-OWNERS-001`.
- Every card has multiple displayed values and at least one source badge.
- Every displayed value preserves `sourceId`, `asOf`, and `detail`.
- Dogfood rejects source rows that drop provenance.
- Strategy Overview fetches both live doc snapshots through `fetchDoc('docs/strategy/bhag-model.md')` and `fetchDoc('docs/strategy/agent-engine.md')`.
- The source-of-truth route remains compact and does not directly call the live BHAG/Agent Engine sheet snapshot builders.

## Details

Reuse the source-backed doc path that already exists:

- `getDocSourceSnapshot('docs/strategy/bhag-model.md')` reads the live BHAG source snapshot.
- `getDocSourceSnapshot('docs/strategy/agent-engine.md')` reads the live Agent Engine source snapshot.
- `/api/doc` returns the markdown, `sourceSnapshot`, and source contracts.
- The BHAG and Agent Engine doc renderers already turn those rows into inline source-backed cards.

This card adds the same source-backed data to Strategy Overview so Steve sees the operating numbers before opening supporting docs.

The focused proof is function/process based. It builds synthetic BHAG and Agent Engine doc payloads, evaluates card models, checks the renderer wiring, checks approval integrity, and closes Current Sprint only under guarded close-card mode.

Behavior proof uses actual function paths: `buildData003LiveSourceBackedValues()`, `evaluateData003SourceBackedValues()`, and `buildData003DogfoodProof()`. It also checks the served renderer wiring that fetches `/api/doc` for the live BHAG and Agent Engine snapshots. Dogfood proof rejects weak source rows that drop provenance, and no weak marker-only proof is accepted as the behavioral gate.

Gate decision tree: static syntax checks run first, focused proof runs second through `process:data-003-check`, and full `foundation:verify` plus `process:foundation-ship` run before push because the blast radius touches Strategy Overview UI, package scripts, closeout registry, live backlog, and Current Sprint truth.

Speed boundary: the focused proof is fast and proportional, targeting under 2 minutes by using synthetic doc payloads and local file reads. Live source reads are left to the existing `/api/doc` path and the full Foundation gates.

## Reuse Existing Work

Existing code reused:

- `lib/foundation-strategy-source-snapshots.js`
- `lib/foundation-strategy-goal-truth.js`
- `lib/foundation-strategy-operating-truth.js`
- `/api/doc` in `server.js`
- `public/foundation-doc-markdown-renderers.js`
- `public/foundation-strategy-renderers.js`

Existing docs reused:

- `docs/business-strategy.md`
- `docs/strategy/bhag-model.md`
- `docs/strategy/agent-engine.md`
- `docs/process/data-002-source-trust-scoring-plan.md`
- `docs/process/intel-scoper-001-plan.md`

Existing cards reused:

- `DATA-002`
- `SOURCE-012`
- `INTEL-SCOPER-001`
- `DECISION-008`

## Operator Value

Strategy Overview now answers:

- What is the team BHAG pace?
- What is the community BHAG pace?
- What assumptions are feeding the Agent Engine?
- What is the current active-agent capacity gap?
- Which sources own those values?

The answer appears as source-backed cards, not prose Steve has to audit manually.

Operator behavior for Steve: open Strategy Overview and see the current BHAG/Agent Engine numbers with source badges before drilling into supporting docs. This unlocks faster strategy review quality without asking Steve to inspect source registry internals.

## Risks

- **Route budget risk:** do not add live Google reads to `/api/source-of-truth`; Strategy Overview uses the existing `/api/doc` live path.
- **Markdown drift risk:** do not add live numbers to markdown; render values from source snapshots.
- **UI noise risk:** keep the cards compact and reusable.
- **Scope creep risk:** no Strategy Hub redesign, extraction, source sync, model calls, browser automation, or new data source.
- **Approval risk:** no external writes, provider calls, Drive permission changes, credentials, or source mutation.

Rollback:

- Remove the Strategy Overview panel wiring while leaving BHAG/Agent Engine supporting doc source cards intact.
- Leave `lib/data-003-source-backed-values.js` unused until repaired if focused proof fails.

## Tests

Focused proof:

- `node --check lib/data-003-source-backed-values.js scripts/process-data-003-check.mjs public/foundation-strategy-renderers.js`
- `npm run process:data-003-check -- --close-card --json`

Full gates:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DATA-003 --closeoutKey=data-003-source-backed-values-v1`
- `npm run process:foundation-ship -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --commitRef=HEAD`

## Not Next

- No source extraction or source sync.
- No browser session, screenshots, OCR, transcription, provider/model call, or broad crawl.
- No source-data mutation.
- No Drive permission mutation.
- No credential or provider config mutation.
- No atom, vector, KB, synthesis, action-route, or backlog mutation from source content.
- No Strategy Hub redesign.
- No Value Builder split.
