# BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001 Plan

Card: `BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001`
Closeout key: `build-lane-verifier-result-parser-repair-v1`

## What

Repair the build-lane failure telemetry result parser so verifier `PASS` lines are never recorded as failures just because their detail text contains the word `failed`.

This is a narrow V1 card. It fixes parser classification only; it does not rewrite old local telemetry history, change verifier behavior, weaken ship gates, or launch parallel builders.

## Why

The May 18 build-lane telemetry log shows false failure events such as `PASS Slack current-day crawl has channel-level item proof after stale-run recovery -> failed / 62 items / 54 succeeded / 8 skipped / 0 failed`. Those lines are successful verifier checks summarizing source run counts. The parser recorded them because it treated any line ending in `failed` as a failed result.

For Steve and the team, this unlocks a real workflow improvement: System Health and local build-lane telemetry point builders at actual red checks instead of making successful verifier lines look like repeated failures. That improves speed and quality without hiding real failures.

## Acceptance Criteria

- Live backlog card exists with rich context for `BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001`.
- Plan and approval exist.
- `extractBuildLaneFailureEventsFromOutput` ignores `PASS ... 0 failed` and other `PASS` lines.
- The same parser still records real `FAIL ...`, `ERROR ...`, and `Command failed:` lines.
- Dogfood proves the exact false-positive shape from the telemetry log.
- Focused proof script is registered in `package.json`.
- Closeout registry exposes `build-lane-verifier-result-parser-repair-v1`.
- Verifier coverage includes the repair card without increasing the combined verifier source line-count guard.
- Full ship gate passes before push.

## Definition Of Done

- `lib/build-lane-failure-telemetry.js` blocks PASS-line false positives and preserves real failure parsing.
- `scripts/process-build-lane-verifier-result-parser-repair-check.mjs` validates approval, Plan Critic, live backlog/current sprint truth, parser dogfood, package script, closeout registry, verifier coverage, and no hidden worker tooling.
- `docs/process/approvals/BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001.json` validates against this plan.
- `docs/handoffs/2026-05-18-build-lane-verifier-result-parser-repair-closeout.md` records the closeout.
- Focused proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- `lib/build-lane-failure-telemetry.js` owns failure-event extraction, failure class inference, local JSONL telemetry, summary rollups, and dogfood proof.
- `scripts/process-foundation-ship.mjs`, `scripts/process-fanout-check.mjs`, `scripts/process-post-ship-fanout.mjs`, and `scripts/backlog-hygiene.mjs` already record build-lane failures through that parser.
- `lib/foundation-system-health.js` already surfaces build-lane telemetry. This card keeps that surface honest by fixing the source parser.
- `BUILD-LANE-FAILURE-TELEMETRY-001` is the prior closed card for the telemetry layer.
- Reuse Plan Critic, approval integrity, Current Sprint overlay, closeout registry, backlog hygiene, and full Foundation ship gates.

Implementation details:

- Treat explicit `FAIL` and `ERROR` prefixes as failure lines.
- Keep explicit `Command failed:` lines as failures even without a prefix.
- Do not treat lines starting with `PASS` as failures, even if their detail text says `failed`, `0 failed`, or includes failed item counts.
- Prove behavior through the actual function path `extractBuildLaneFailureEventsFromOutput`, not through source markers. No substring-only proof is accepted.
- The focused dogfood uses the real parser function with PASS, FAIL, ERROR, and `Command failed:` output in one round trip.
- Keep the focused proof fast and under 1 minute on the normal path; full verifier and ship gate run once at closeout.

Gate decision tree:

- Static gate: `node --check` for changed JS.
- Focused gate: `npm run process:build-lane-verifier-result-parser-repair-check -- --close-card --json` proves the parser behavior and live card scaffold.
- Full gate: `foundation:verify` and `process:foundation-ship` are required because this changes build-lane process behavior, package scripts, closeout registry, verifier coverage, and telemetry used by System Health.
- Blast radius is bounded to build-lane telemetry parsing; no runtime source extraction, external write, or UI redesign is in scope.

## Risks

- Risk: tightening the parser could miss a real command failure that lacks a `FAIL`/`ERROR` prefix. Mitigation: preserve `Command failed:` and non-PASS `failed` parsing for command-level failures.
- Risk: this could be mistaken for telemetry cleanup. Mitigation: this V1 does not rewrite existing local `.git` telemetry; it only prevents new false positives.
- Risk: adding coverage could trip the verifier source line-count guard. Mitigation: reuse or compress existing coverage constants and prove `foundation:verify` passes.
- Repair path: if dogfood fails, fix the parser condition. If full ship fails on verifier line count, reduce coverage-source line count without weakening the split guard.

## Tests

```bash
node --check lib/build-lane-failure-telemetry.js scripts/process-build-lane-verifier-result-parser-repair-check.mjs
npm run process:build-lane-verifier-result-parser-repair-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001.json --closeoutKey=build-lane-verifier-result-parser-repair-v1 --commitRef=HEAD
```

## Not Next

- Do not launch parallel builders during this card.
- Do not use hidden subagents.
- Do not rewrite historical local telemetry logs.
- Do not weaken, skip, bypass, or demote real verifier, ship, fanout, or backlog hygiene failures.
- Do not run live extraction, provider/model probes, auth-required jobs, paid jobs, external writes, Drive permission mutation, or Agent Feedback auto-send.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
- Do not redesign Foundation UI.
