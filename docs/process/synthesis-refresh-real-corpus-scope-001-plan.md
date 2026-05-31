# SYNTHESIS-REFRESH-REAL-CORPUS-SCOPE-001 Plan

## Goal

Separate the small synthesis proof scope from the scheduled synthesis refresh scope so daily refresh is configured for the real source corpus instead of the old 8-item `foundation-spine-proof` lane.

## Current Truth

- `process:synthesis-verify-check` is healthy: governed items and decision-grade action routes verify.
- `scripts/intelligence-synthesis-engine-proof.mjs` still passes `itemLimit: 8` and `synthesisScopeKey: 'foundation-spine-proof'` into `runGovernedSynthesis` even when `--refresh=true`.
- Running `intelligence:synthesis-refresh` can call embeddings/model infrastructure and write synthesis rows, so this card must only change configuration and prove the split without executing refresh.

## Scope

- Add `lib/synthesis-refresh-real-corpus-scope.js` as the config owner for proof-mode and refresh-mode synthesis run settings.
- Update `scripts/intelligence-synthesis-engine-proof.mjs` to read `itemLimit`, `synthesisScopeKey`, `runType`, and run id prefix from the config helper.
- Keep proof mode at `foundation-spine-proof` with item limit `8`.
- Move refresh mode to `foundation-real-corpus-refresh` with a larger bounded item limit.
- Add `scripts/process-synthesis-refresh-real-corpus-scope-check.mjs` as a no-run focused proof.

## Acceptance

- `node --check lib/synthesis-refresh-real-corpus-scope.js scripts/intelligence-synthesis-engine-proof.mjs scripts/process-synthesis-refresh-real-corpus-scope-check.mjs` passes.
- `npm run process:synthesis-refresh-real-corpus-scope-check -- --json` passes.
- Dogfood proves proof mode remains small, refresh mode uses a different real-corpus scope, and a bad refresh config using the proof scope fails.
- The focused proof verifies the scheduled job still points to `intelligence:synthesis-refresh`, but does not execute that command.
- `npm run process:synthesis-verify-check -- --json` still passes.
- `npm run foundation:verify -- --json-summary` passes before commit.

## Not Next

- Do not run `intelligence:synthesis-refresh` in this card.
- Do not call embeddings, model/provider routes, live extraction, source sync, transcript fetch, browser work, screenshots, OCR, or downloads from the focused proof.
- Do not propose, approve, apply, reject, snooze, reroute, or mutate action routes.
- Do not create backlog cards from Director, Scoper, Portfolio, or route recommendations.
- Do not send Telegram, email, Slack, Agent Feedback, or any external message.

## Operator Value

The Director can keep a tight proof lane for verification while scheduled refresh is no longer configured to chew only the old 8-item proof scope. This makes the next approved synthesis run point at a real-corpus lane without spending provider/model budget tonight.
