# SOURCE-EXTRACTION-COVERAGE-001 Source Extraction Coverage Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `SOURCE-EXTRACTION-COVERAGE-001`

## What

Build the second Foundation Source Once-Over card: source-level extraction coverage for every source contract.

V1 rolls existing extraction-control data up by source:

- governed crawl targets;
- target runs and last success/failure;
- crawl item totals;
- retry eligible/waiting/blocked/exhausted state;
- cursor/next-bite state;
- 24-hour run and item activity;
- deferred or not-required source boundaries.

It does not run new extraction jobs, add new connectors, mutate source permissions, or reopen `EXTRACT-RUN-HARDENING-001`.

## Why

`SOURCE-MATURITY-GRID-001` showed which sources are only partially mature. The next Foundation gap is extraction truth by source.

The system already has extraction coverage by target in Runtime Health. That is useful for debugging, but Steve needs the Foundation Source Lifecycle view to answer a simpler question: for each source, is data flowing, failing, pending, deferred, or intentionally not required?

Useful operator behavior: Steve can open Foundation, scan the source extraction coverage table, and know which source gaps need `SOURCE-COVERAGE-CLOSEOUT-001` decisions without asking for another audit.

## Acceptance Criteria

- `SOURCE-EXTRACTION-COVERAGE-001` stays the active card after `SOURCE-MATURITY-GRID-001` and closes only after source-level coverage exists.
- `lib/source-extraction-coverage.js` builds a row for every source contract.
- Each row has exactly one extraction state: `last_success`, `failure`, `pending`, `deferred`, or `not_required`.
- Rows include target keys, latest success, latest failure, next bite, retry summary, cursor/checkpoint signal, 24-hour run/item counts, top failure/skipped reasons, remaining backlog indicators, and next safe action text where available.
- `/api/foundation/source-extraction-coverage` returns the source-level snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same `sourceExtractionCoverage` payload.
- Foundation UI renders the source-level extraction panel under Source Lifecycle.
- `EXTRACT-RUN-HARDENING-001` remains done and is not reopened or widened.
- Plan Critic must return pass/revise with a passing score of at least 9.8 for this card before the closeout is trusted.
- `npm run process:source-extraction-coverage-check -- --json=true` validates approval, Plan Critic, real snapshot shape, synthetic covered/failure/deferred/not-required proof, API/UI/library wiring, backlog closeout, and Current Sprint advancement to `SOURCE-COVERAGE-CLOSEOUT-001`.

## Definition Of Done

Done means `source-extraction-coverage-v1` is closed with:

- valid approval file at `docs/process/approvals/SOURCE-EXTRACTION-COVERAGE-001.json`;
- source extraction coverage library at `lib/source-extraction-coverage.js`;
- source-level API wiring in `server.js`;
- 24-hour run/item activity surfaced from existing extraction-control data;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-source-extraction-coverage-check.mjs`;
- package script `process:source-extraction-coverage-check`;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `SOURCE-COVERAGE-CLOSEOUT-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `lib/source-contracts.js`
- `lib/source-lifecycle.js`
- `lib/source-maturity-grid.js`
- `lib/foundation-db.js`
- `lib/extraction-run-hardening.js`
- `server.js`
- `public/foundation.js`
- `scripts/process-extract-run-hardening-check.mjs`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/source-extraction-coverage.js` as the single source-level extraction snapshot builder.
- Extend existing extraction-control coverage with 24-hour item/run counts; do not create a new extraction table.
- Add `/api/foundation/source-extraction-coverage` and attach the same payload to source lifecycle and Foundation Hub responses.
- Render the source extraction panel inside the existing Source Lifecycle page, not a new hub.
- Add focused proof that calls the real function path (`buildSourceExtractionCoverageSnapshot`) and API route (`/api/foundation/source-extraction-coverage`), then uses a synthetic weak plan/fixture to reject weak behavior.
- The behavior proof must reject substring-only verifier theatre: a source-substring or string-match marker is not accepted unless the real function/API/process path exists.
- Advance the Source Once-Over sprint to `SOURCE-COVERAGE-CLOSEOUT-001` after closeout.

Not Next:

- Do not run new crawls or extraction jobs from this card.
- Do not add new connectors or widen source ingestion.
- Do not reopen `EXTRACT-RUN-HARDENING-001`.
- Do not fix every source gap; the next card decides/fixes/defers rows.
- Do not build Reply Parser, Watching Items, Strategy Hub expansion, Telegram bots, Directors, or marketing production.
- Do not mutate Drive permissions or send access-request emails.

## Risks

- A source-level rollup can hide target-level detail. Repair path: rows keep target keys, next-safe commands, reasons, and the existing target coverage panel remains intact.
- Missing targets could be mislabeled as okay. Repair path: no-target rows become `failure` unless they have an explicit manual boundary, extracted source-fact proof, or deferred lifecycle status.
- This can drift into ingestion. Repair path: plan and proof reject new extraction runs/connectors and keep the change to visibility plus existing ledger fields.
- If the focused proof fails, repair the actual source extraction snapshot, API route, UI rendering, or sprint advancement before trying the full gate; do not paper over it with status text.
- Full gate is still required because the change touches server, DB snapshot shape, UI, docs, package scripts, and canonical verifier paths.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, DB snapshot shape, UI, package scripts, docs, and canonical verifier coverage.
- Focused gate: `npm run process:source-extraction-coverage-check -- --json=true` is the fast default loop during development and should run in under 2 minutes.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-EXTRACTION-COVERAGE-001 --planApprovalRef=docs/process/approvals/SOURCE-EXTRACTION-COVERAGE-001.json --closeoutKey=source-extraction-coverage-v1 --commitRef=HEAD` runs only after commit.
- Blast radius: Foundation source lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, extraction-control summary fields, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:source-extraction-coverage-check -- --json=true
npm run process:extract-run-hardening-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-EXTRACTION-COVERAGE-001 --planApprovalRef=docs/process/approvals/SOURCE-EXTRACTION-COVERAGE-001.json --closeoutKey=source-extraction-coverage-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real source extraction coverage snapshot function;
- prove every source row has one allowed extraction state;
- prove synthetic covered/failure/deferred/not-required rows classify correctly;
- prove `EXTRACT-RUN-HARDENING-001` remains done;
- prove Current Sprint advances to `SOURCE-COVERAGE-CLOSEOUT-001`;
- reject substring-only verifier theatre by failing if the function/API/UI/script paths are missing.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional; it is the fast gate, not another heavy verifier pass.
- Run the full ship gate only after the card is committed because this is a full-risk Foundation substrate change.
