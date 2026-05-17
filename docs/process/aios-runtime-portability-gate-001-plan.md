# AIOS-RUNTIME-PORTABILITY-GATE-001 Plan

Card: `AIOS-RUNTIME-PORTABILITY-GATE-001`

Closeout key: `aios-runtime-portability-gate-v1`

## What

Define and prove the Foundation-owned runtime portability gate so Claude, Codex, OpenClaw, OpenHuman, Higgsfield-style runtimes, and future agent shells are adapters, not owners of truth.

The gate covers:

- runtime identity
- declared tools
- permissions and write posture
- model/provider route
- auth posture
- cost and spend policy
- logs/transcripts export
- source/compiled-KB truth boundary
- fallback brain
- adapter-only ownership

## Why

Steve wants AIOS to avoid lock-in to one brain, CLI, prompt stack, or subscription path. Foundation must own identity, tools, permission policy, source contracts, model routing, logs, cost policy, memory/compiled knowledge, and fallback behavior before agents consume those capabilities.

Operator value: future Harlan/Codex/OpenClaw/OpenHuman-style work can move faster because every runtime has the same stop/go contract. A runtime can be powerful without becoming the source of truth.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth from `scoping` to `sprint_ready` to `building_now` to `done_this_sprint`.
- `lib/aios-runtime-portability-gate.js` defines the portability contract and validator.
- The contract covers identity, tools, permissions, model/provider route, cost policy, logs/transcripts, and fallback brain.
- Claude/Codex/OpenClaw/OpenHuman/Higgsfield-style runtimes are represented as adapters, not truth owners.
- Dogfood rejects missing identity, runtime-owned truth, missing tool/permission policy, direct model/provider route, missing cost policy, missing logs/transcripts export, missing fallback brain, and unapproved live paid/auth run.
- Valid synthetic adapter contracts pass.
- Focused proof is registered in `package.json`.
- Foundation verifier coverage proves the gate through behavior functions, not substring-only proof.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- No extraction, connector/auth repair, provider probe, model call, paid run, external write, Harlan/Fal/voice/Canva/OpenHuman feature work, Drive permission mutation, or Agent Feedback auto-send occurs.

## Definition Of Done

Done means `AIOS-RUNTIME-PORTABILITY-GATE-001` is a live done card under `aios-runtime-portability-gate-v1`, Current Sprint is closed with complete scaffold metadata, the focused proof passes, the full Foundation ship gate passes, and the commit is pushed.

Done does not mean any new runtime adapter is installed or used. The next build card is `AGENT-STATUS-FRESHNESS-GATE-001`.

## Details

Existing work to reuse:

- Existing code: `lib/foundation-runtime-reliability-verifier.js`, `lib/foundation-knowledge-base-compiler-design.js`, `lib/foundation-knowledge-base-quality-gate.js`, `lib/llm-auth-audit-budget-label-clarity.js`, `lib/build-lane-reliability.js`, and `lib/process-plan-critic.js`.
- Existing docs: `docs/handoffs/2026-05-17-knowledge-base-quality-gate-closeout.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `memory/2026-05-17.md` runtime portability packet.
- Existing scripts: `scripts/process-knowledge-base-quality-gate-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: use the live DB card and overlay, not a handoff-only label.
- Reused policy: Foundation owns source contracts, ingestion permission, compiler rules, quality gates, query interface, model routing, identity, permission policy, cost policy, logs, and fallback routes. Agents and runtimes consume these contracts.

Behavior proof:

- The focused proof calls `buildAiosRuntimePortabilityGate()`, `evaluateAiosRuntimePortabilityGate()`, and `buildAiosRuntimePortabilityGateDogfoodProof()`.
- Dogfood uses synthetic runtime contracts for missing identity, truth-owned runtime, missing permissions, direct model route, missing cost policy, missing logs/transcripts, missing fallback brain, and unapproved paid/auth live run.
- No substring-only proof is accepted; source checks may prove registration only, and they are not accepted without function-path dogfood.
- API/process behavior comes through live backlog readback, Current Sprint metadata, Plan Critic rows, package script registration, closeout registry, verifier coverage, and full `process:foundation-ship`.

Gate decision tree:

- Use fast static syntax checks and focused proof while iterating.
- Target focused proof runtime is under 5 minutes; repair targeted failures instead of running repeated full gates.
- Full `foundation:verify` runs once the focused proof is green, and full `process:foundation-ship` runs before push.
- If proof fails, stop on the focused failure and repair the portability gate or process artifact. Do not close the card or run ship until the bad runtime fixtures fail closed again.
- If the failure reveals missing runtime implementation or auth access, leave it scoped as a follow-up instead of weakening the gate.

Foundation approved active sprint scope. Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-runtime-reliability-verifier.js`, `lib/foundation-hub-backlog-contract.js`, `lib/foundation-build-closeout-cleanup-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. This is Foundation process/runtime contract work, not extractor, hub feature, connector auth, Harlan, Fal, voice, Canva, or OpenHuman feature work.

File-size and artifact budget:

- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.
- Plan artifact budget: under 12 KB.
- No generated data file, extraction run record, model call record, connector auth record, compiled KB page, atom, vector table, or runtime install artifact is created.
- `scripts/foundation-verify.mjs` is over the preferred hand-written module budget, so this card adds only thin coverage import/read wiring.
- `lib/foundation-runtime-reliability-verifier.js` is over the preferred hand-written module budget, so this card adds one bounded portability check and imports behavior from the new module.
- `lib/foundation-hub-backlog-contract.js` keeps default Hub payload under budget by tightening the default summary source text limit; full history remains behind detail routes.
- `lib/foundation-build-closeout-cleanup-records.js` is a registry artifact above the preferred hand-written module budget, so this card adds one record only and does not add behavior there.

Read/write posture:

- Verifier/check read paths must fail closed and report missing artifacts or bad runtime fixtures.
- Live backlog, Plan Critic, and Current Sprint writes are allowed only when the focused proof is invoked with explicit `--apply` or `--close-card`.
- No verifier path may silently seed live state, repair data, run extraction, call providers, mutate runtime config, write external systems, or install runtime adapters just to pass.

## Risks

- Scope drift into runtime implementation, provider probing, auth repair, or model calls. Mitigation: dogfood fails unapproved live paid/auth run and direct provider ownership.
- Scope drift into Harlan/OpenHuman feature work. Mitigation: the gate is Foundation-owned and runtime shells remain adapters only.
- Brittle proof. Mitigation: proof must call the actual validator and dogfood bad fixtures; source checks are registration support only.
- Verifier bloat. Mitigation: new behavior lives in `lib/aios-runtime-portability-gate.js`; existing verifier gets bounded coverage only.

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
node --check lib/aios-runtime-portability-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-aios-runtime-portability-gate-check.mjs scripts/foundation-verify.mjs
npm run process:aios-runtime-portability-gate-check -- --apply --stage=scoping --json
npm run process:aios-runtime-portability-gate-check -- --apply --stage=sprint_ready --json
npm run process:aios-runtime-portability-gate-check -- --apply --stage=building_now --json
```

Then run the final gate set:

```bash
npm run process:aios-runtime-portability-gate-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=AIOS-RUNTIME-PORTABILITY-GATE-001 --planApprovalRef=docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json --closeoutKey=aios-runtime-portability-gate-v1 --commitRef=HEAD
```

Gate choice: static syntax checks and focused proof while iterating; full `foundation:verify` and `process:foundation-ship` once the focused proof is green.
