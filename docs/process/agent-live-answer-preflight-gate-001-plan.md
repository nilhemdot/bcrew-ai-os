# AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 Plan

Card: `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001`

Closeout key: `agent-live-answer-preflight-gate-v1`

## What

Create the focused runtime/check contract that blocks or labels operational agent answers unless the agent has a fresh evidence stamp for the relevant live or local source.

The V1 claim classes are:

- system health status
- builder/current sprint status
- repo branch/dirty status
- source freshness
- audit or verifier run status

This card does not launch Harlan, build UI, call models, run live extraction, or implement the capability registry. It makes operational answers fail closed unless they have the preflight proof needed to sound current.

## Why

Steve should not hear an agent report that System Health is green, a builder is blocked, a branch is clean, an audit ran, or a source is fresh from memory or old chat context. The useful operator behavior is simple: current answers need fresh proof; stale or unavailable sources must say blocked or last-known.

This unlocks speed and quality because Steve can trust the answer shape without manually asking "did you actually check live state?"

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth.
- `lib/agent-live-answer-preflight-gate.js` defines claim classes, preflight evidence stamps, evaluator, and dogfood proof.
- Current operational answers require claim class, source lookup, source kind, route/command, source ID, lookup ref, queried-at timestamp, as-of timestamp, and evidence stamp.
- Memory-only current answers fail closed.
- Missing preflight fails closed.
- Stale live reads that sound current fail closed.
- Missing-tool answers that sound current fail closed and require explicit missing-tool wording.
- Unavailable sources without blocked/last-known wording and visible failure state fail closed.
- Fresh live/local answers pass.
- The proof does not run live agent runtime, extraction, provider/model calls, or external writes.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001` is a live done card under `agent-live-answer-preflight-gate-v1`, Current Sprint points next to `AGENT-CAPABILITY-REGISTRY-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is rebuilt or the capability registry exists.

## Risks

- Scope drift into live Harlan/runtime work. Mitigation: V1 scope is a synthetic preflight contract and proof only.
- Scope drift into capability registry work. Mitigation: registry implementation remains `AGENT-CAPABILITY-REGISTRY-001`.
- False confidence from stale memory. Mitigation: memory-only current answers fail closed.
- Over-heavy proof. Mitigation: focused proof stays under 5 minutes and full gates run only after focused proof is green.
- Current Sprint/Drive drift. Mitigation: not-next boundaries explicitly block `MEETING-VAULT-ACL-001` Phase B and Drive permission mutation.

## Details

Existing work to reuse:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-status-freshness-gate-v1`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/personal-agent-onboarding.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Operator behavior:

- Steve gets a current operational answer only when the agent can cite a fresh evidence stamp.
- If the source is stale, unavailable, auth-blocked, or the local tool is missing, the answer must say blocked or last-known and show the next action.
- The gate removes the "trust me, I remembered" answer pattern from operational claims.

Gate decision tree:

- Static gate: `node --check` for the new module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:agent-live-answer-preflight-gate-check -- --close-card --json` proves the claim-class behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 runtime-governance card with verifier and Current Sprint blast radius.
- Speed bound: focused proof should stay under 5 minutes and stay thin enough to use by default.
- Regression path: if stale/memory/missing-preflight fixtures stop failing closed, repair the evaluator or fixture before closeout.

Scope boundaries:

- Tight V1 scope: define claim classes, required lookups, evidence stamps, stale/unavailable wording, missing-tool behavior, and dogfood fixtures only.
- No Harlan UI or feature work.
- No live agent runtime launch.
- No capability registry implementation.
- No live extraction.
- No provider/model call.
- No external send or mutation.
- No Google Drive permission mutation.
- No `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.
- No hidden subagents or parallel builders.

File-size posture:

- New module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- `scripts/foundation-verify.mjs` adds only one bounded current-progress allowlist line and remains under 5,000 lines.

## Tests

```bash
node --check lib/agent-live-answer-preflight-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-live-answer-preflight-gate-check.mjs scripts/foundation-verify.mjs
npm run process:agent-live-answer-preflight-gate-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json --closeoutKey=agent-live-answer-preflight-gate-v1 --commitRef=HEAD
```
