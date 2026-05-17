# AGENT-STATUS-FRESHNESS-GATE-001 Plan

Card: `AGENT-STATUS-FRESHNESS-GATE-001`

Closeout key: `agent-status-freshness-gate-v1`

## What

Define and prove the Foundation-owned status freshness gate for agents. Any agent reporting current operational status must query live Foundation/API truth first. Memory, notes, handoffs, screenshots, and chat claims can support context, but they must be labeled as last-known, not current truth.

The gate covers:

- fresh live truth source requirement
- as-of timestamp
- source route/source ID
- live-vs-memory labeling
- stale query rejection
- conflict detection
- blocked/scoped/done status precision
- Harlan-style stale operational claims

## Why

Steve should not see an agent claim Harlan, OpenHuman, extraction, voice, Fal, Canva, or any other capability is current/live because a memory note or old chat said so. Current operational status must come from live Foundation/API truth, or the agent must say it only has last-known context.

Operator value: Steve and the team get a real workflow speed and quality unlock: status answers can say "current" only when backed by fresh live Foundation/API truth, while memory/chats/handoffs are clearly labeled last-known. Agents stop sounding certain when their evidence is stale.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/agent-status-freshness-gate.js` defines the status freshness contract and validator.
- A current-status claim requires at least one fresh live truth source with route/source ID, queried-at timestamp, and max-age budget.
- Memory/chat/handoff-only evidence is allowed only as `last_known`.
- Dogfood rejects memory-only current claims, stale live reads, missing as-of timestamp, conflicts with live status, and Harlan-style stale capability claims.
- Valid synthetic live-truth status claims pass.
- Focused proof is registered in `package.json`.
- Foundation verifier coverage proves the gate through behavior functions, not substring-only proof.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- No extraction, connector/auth repair, provider probe, model call, external write, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send occurs.

## Definition Of Done

Done means `AGENT-STATUS-FRESHNESS-GATE-001` is a live done card under `agent-status-freshness-gate-v1`, Current Sprint is closed with complete scaffold metadata, the focused proof passes, the full Foundation ship gate passes, and the commit is pushed.

Done does not mean Harlan or any other agent is built. The next recommended work is a fresh queue decision from Steve, with extractor/runtime expansion only if gates remain green.

## Details

Existing work to reuse:

- Existing code: `lib/aios-runtime-portability-gate.js`, `lib/foundation-runtime-reliability-verifier.js`, `lib/build-lane-reliability.js`, `lib/foundation-current-sprint.js`, and `lib/process-plan-critic.js`.
- Existing docs: `docs/handoffs/2026-05-17-aios-runtime-portability-gate-closeout.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `memory/2026-05-17.md`.
- Existing scripts: `scripts/process-aios-runtime-portability-gate-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: use the live DB card and overlay, not a handoff-only label.
- Reused policy: Foundation/API truth is current operational truth; memory is context unless revalidated live.

Behavior proof:

- The focused proof calls `buildAgentStatusFreshnessGate()`, `evaluateAgentStatusFreshnessGate()`, and `buildAgentStatusFreshnessGateDogfoodProof()`.
- Dogfood uses synthetic claims for memory-only current status, stale live read, missing as-of timestamp, live conflict, stale Harlan-style capability claim, and a healthy live-current claim.
- No substring-only proof is accepted; source checks may prove registration only, and they are not accepted without function-path dogfood.
- API/process behavior comes through live backlog readback, Current Sprint metadata, Plan Critic rows, package script registration, closeout registry, verifier coverage, and full `process:foundation-ship`.

Gate decision tree:

- Use fast static syntax checks and focused proof while iterating.
- Target focused proof runtime is under 5 minutes; repair targeted failures instead of running repeated full gates.
- Full `foundation:verify` runs once the focused proof is green, and full `process:foundation-ship` runs before push.
- If proof fails, stop on the focused failure and repair the freshness gate or process artifact. Do not close the card or run ship until stale status fixtures fail closed again.
- If the failure reveals missing live API status surface, route a follow-up card instead of weakening the gate.

Foundation approved active sprint scope. Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-runtime-reliability-verifier.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. This is Foundation status-truth contract work, not extractor, connector auth, Harlan, Fal, voice, Canva, OpenHuman, or hub feature work.

File-size and artifact budget:

- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.
- Plan artifact budget: under 12 KB.
- No generated data file, extraction run record, model call record, connector auth record, compiled KB page, atom, vector table, or runtime install artifact is created.
- `scripts/foundation-verify.mjs` is over the preferred hand-written module budget, so this card adds only thin coverage import/read wiring.
- `lib/foundation-runtime-reliability-verifier.js` is over the preferred hand-written module budget, so this card adds one bounded status-freshness check and imports behavior from the new module.
- `lib/foundation-build-closeout-cleanup-records.js` is a registry artifact above the preferred hand-written module budget, so this card adds one record only and does not add behavior there.

Read/write posture:

- Verifier/check read paths must fail closed and report missing artifacts or stale status fixtures.
- Live backlog, Plan Critic, and Current Sprint writes are allowed only when the focused proof is invoked with explicit `--apply` or `--close-card`.
- No verifier path may silently seed live state, repair data, run extraction, call providers, mutate runtime config, write external systems, or build agents just to pass.

## Risks

- Scope drift into Harlan/OpenHuman/voice/Fal/Canva feature work. Mitigation: V1 is status truth contract/proof only.
- Scope drift into live extraction or provider calls. Mitigation: no live call is needed; dogfood is synthetic.
- Brittle proof. Mitigation: proof must call the actual validator and dogfood bad fixtures; source checks are registration support only.
- False certainty. Mitigation: memory-only evidence is accepted only as last-known, not current.

Not next:

- No live extraction.
- No auth-required or paid run.
- No provider/model probe.
- No connector/OAuth repair.
- No runtime adapter install.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad UI redesign.
- Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.
- Do not mutate Google Drive permissions.
- No live Agent Feedback auto-send.

## Tests

Use the focused loop first:

```bash
node --check lib/agent-status-freshness-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-status-freshness-gate-check.mjs scripts/foundation-verify.mjs
npm run process:agent-status-freshness-gate-check -- --apply --stage=scoping --json
npm run process:agent-status-freshness-gate-check -- --apply --stage=sprint_ready --json
npm run process:agent-status-freshness-gate-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:agent-status-freshness-gate-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=AGENT-STATUS-FRESHNESS-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json --closeoutKey=agent-status-freshness-gate-v1 --commitRef=HEAD
```

Gate choice: static syntax checks and focused proof while iterating; full `foundation:verify` and `process:foundation-ship` once the focused proof is green.
