# SOURCE-COVERAGE-CLOSEOUT-001 Source Coverage Closeout Plan

Status: approved at 10.0 on 2026-05-12. Implementation is limited to this plan.

Card: `SOURCE-COVERAGE-CLOSEOUT-001`

## What

Build the third Foundation Source Once-Over card: a source coverage closeout matrix that turns every source maturity/extraction row into a decision.

V1 reads the already-built source maturity grid and source extraction coverage, then assigns each source exactly one decision:

- `covered_for_v1`
- `advance_extraction_gap`
- `advance_maturity_gap`
- `deferred_with_blocker`
- `not_required_for_v1`

It does not run crawls, add connectors, mutate Drive permissions, build product loops, or fix every source-specific gap inside this card.

## Why

The source grid and extraction coverage made the gaps visible. A visible gap without routing is still another audit artifact.

Useful operator behavior: Steve can open Foundation and see which source rows are covered for the current Foundation pass, which ones are intentionally deferred, and which ones route into extraction or maturity follow-up cards.

## Acceptance Criteria

- `lib/source-coverage-closeout.js` builds a closeout row for every source contract.
- Every row has one allowed decision and no unresolved decision state.
- Extraction failures and pending rows route to `SOURCE-EXTRACTION-GAP-FOLLOWUP-001`.
- Maturity gaps that are not extraction failures route to `SOURCE-MATURITY-GAP-FOLLOWUP-001`.
- Deferred rows remain explicitly deferred with a reason.
- Sources that are complete or not required for v1 close without being pulled into broad ingestion.
- `/api/foundation/source-coverage-closeout` returns the closeout snapshot.
- `/api/foundation/source-lifecycle` and `/api/foundation-hub` include the same source coverage closeout payload.
- Foundation UI renders the closeout matrix under Source Lifecycle.
- The focused proof validates approval, Plan Critic, real snapshot behavior, the real function path, the API route shape, synthetic classification, API/UI/library wiring, backlog follow-up cards, build log/current-plan/current-state fanout, and Current Sprint advancement to `MARKETING-SOURCE-MAP-001`.

## Definition Of Done

Done means `source-coverage-closeout-v1` is closed with:

- valid approval file at `docs/process/approvals/SOURCE-COVERAGE-CLOSEOUT-001.json`;
- closeout library at `lib/source-coverage-closeout.js`;
- API route at `/api/foundation/source-coverage-closeout`;
- Source Lifecycle/Foundation Hub payload wiring;
- Foundation UI rendering in `public/foundation.js` and `public/styles.css`;
- focused proof at `scripts/process-source-coverage-closeout-check.mjs`;
- package script `process:source-coverage-closeout-check`;
- follow-up cards `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` and `SOURCE-MATURITY-GAP-FOLLOWUP-001` scoped;
- backlog card moved to done with closeout proof;
- Current Sprint active blocker advanced to `MARKETING-SOURCE-MAP-001`;
- current plan/current state/build log/verifier fanout updated.

## Details

Existing code/docs/scripts reused:

- `lib/source-contracts.js`
- `lib/source-lifecycle.js`
- `lib/source-maturity-grid.js`
- `lib/source-extraction-coverage.js`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `server.js`
- `public/foundation.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Implementation shape:

- Add `lib/source-coverage-closeout.js` as the source decision rollup.
- Add the closeout API and attach the payload to existing Source Lifecycle and Foundation Hub responses.
- Render a scan-friendly decision table in the existing Foundation Source Lifecycle view.
- Behavior proof must call the real function path and API route wiring; a status note, source marker, string match, or substring-only proof is not accepted.
- Scope the extraction and maturity follow-up cards so source-specific work stays visible but does not derail the active sprint.
- Advance Source Once-Over to `MARKETING-SOURCE-MAP-001` only after the closeout proof passes.

Not Next:

- Do not run new extraction jobs.
- Do not add source connectors.
- Do not repair Google Ads, Real Broker, Loom, Skool, Zoom, Drive OCR, Office parsing, or Missive attachments inside this card.
- Do not build Reply Parser, Watching Items, Strategy Hub expansion, Telegram bots, Directors, or marketing production.
- Do not mutate Drive permissions or send access-request emails.

## Risks

- The closeout matrix can look like the gaps are fixed when they are only routed. Repair path: decisions use `advance_*_gap` and next card IDs instead of green labels.
- Follow-up cards can become a graveyard. Repair path: the focused proof requires both follow-up cards and Current Sprint keeps the next active blocker explicit.
- This can drift into broad source repair. Repair path: every source repair stays out of this card unless a separate source-specific follow-up is pulled.
- If the focused proof fails, fix the real snapshot, API, UI, sprint state, or backlog wiring before trying the full gate.

## Gate Decision

Decision-tree result: full gate for ship, focused gate while building.

- Static gate alone is not enough because this changes server/API, UI, current sprint, backlog seeds, build log, docs, package scripts, and canonical verifier coverage.
- Focused gate: `npm run process:source-coverage-closeout-check -- --json=true`; this is the fast default loop and should stay under 2 minutes so it is used instead of bypassed.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-COVERAGE-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/SOURCE-COVERAGE-CLOSEOUT-001.json --closeoutKey=source-coverage-closeout-v1 --commitRef=HEAD`.
- Blast radius: Foundation Source Lifecycle payloads, Foundation Hub payloads, Source Lifecycle UI, Current Sprint, build log, and `foundation:verify`.

## Tests

Run:

```bash
npm run process:source-coverage-closeout-check -- --json=true
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-COVERAGE-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/SOURCE-COVERAGE-CLOSEOUT-001.json --closeoutKey=source-coverage-closeout-v1 --commitRef=HEAD
```

Behavior proof requirements:

- call the real closeout snapshot function;
- call the real function path and prove the API/UI/process wiring exists;
- prove every source row gets one allowed decision;
- prove synthetic covered/extraction-gap/maturity-gap/deferred classification;
- prove routed rows point to the two follow-up cards;
- prove Current Sprint advances to `MARKETING-SOURCE-MAP-001`;
- reject substring-only verifier theatre by failing if the function/API/UI/script paths are missing; no substring-only closeout is accepted.

Speed bound:

- Use the focused proof first while building.
- Keep the focused proof fast and proportional, under 2 minutes in normal local runs.
- Run the full ship gate only after the card is committed.
