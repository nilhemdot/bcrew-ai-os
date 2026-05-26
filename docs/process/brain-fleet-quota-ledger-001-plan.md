# BRAIN-FLEET-QUOTA-LEDGER-001 Plan

Closeout key: `brain-fleet-quota-ledger-v1`

## What

Build the Brain Fleet quota ledger contract before any live route probes or extractor proof. V1 adds a ledger wrapper over the existing `llm_calls` runtime table so every Brain Fleet call records workload, route, model, account label, status, artifact ref, quota/reset posture, failure reason, and stop condition before provider execution can happen.

This is ledger readiness only. It reuses the existing Brain Fleet no-auth route contract, existing LLM router planning truth, `llm_credentials.account_label`, `llm_credentials.quota_state`, and the existing `createLlmCall`/`finishLlmCall` store helpers. It does not create a new router, credential registry, quota store, provider probe runner, or extractor runtime.

## Why

Steve needs governed Build Intel extraction, but the system cannot safely spend subscription/API capacity until each Brain Fleet call is visible and stoppable. Overnight or batch work must stop on auth, quota, rate-limit, and provider failures instead of retrying blindly or burning the same account Steve needs for building.

Operator value: after this card, route use is not invisible. If a future Codex, Gemini, Claude, OpenClaw, or extractor adapter wants to run, it must leave a ledger row that says what workload used which route/model/account, what artifact it touched, what quota/reset truth was known, and why it stopped.

## Acceptance Criteria

- `BRAIN-FLEET-QUOTA-LEDGER-001` has a 9.8+ Plan Critic row and approval file.
- `lib/brain-fleet-quota-ledger.js` records Brain Fleet ledger truth through the existing `llm_calls` table and store helpers.
- Every Brain Fleet ledger record includes workload, hub, route, provider, model, auth path, credential key, account label, status, input/output artifact refs, quota posture, quota reset state if known, explicit unknown quota/reset state if not known, failure reason, and stop condition.
- Auth-needed, rate-limit, quota-exhausted, provider-failure, route-not-runnable, and missing-ledger-truth conditions stop the workload fail-closed.
- The focused proof dogfoods complete ledger rows, missing artifact rejection, missing stop-condition rejection, quota/rate/auth/provider stop decisions, no credential mutation, and no provider execution.
- Close-card proof writes one skipped internal `llm_calls` ledger row as a dry-run proof with `provider_execution_disabled_for_proof`; it does not run live provider probes.
- Current Sprint advances to `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001` only after the ledger proof closes.

## Details

Existing code reused:

- `lib/brain-fleet-foundation.js` remains the no-auth route-contract planner.
- `lib/llm-router.js` remains the route planner/provider-adapter boundary.
- `lib/foundation-llm-runtime-store.js` remains the `llm_calls`, `llm_credentials`, and `llm_routes` store.
- `lib/llm-credential-registry.js` remains credential policy truth.
- `llm_credentials.account_label` and `llm_credentials.quota_state` remain account/quota truth.
- Current Sprint, live backlog, approval integrity, Plan Critic, process write guard, closeout registry, and `process:foundation-ship` remain the process control plane.

Existing docs reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md`
- `docs/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md`

Existing scripts reused:

- `scripts/process-brain-fleet-foundation-check.mjs`
- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship`

Live backlog truth reused:

- `BRAIN-FLEET-QUOTA-LEDGER-001` is the active P0 card.
- `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001` is the next card.
- Strategy/People, broad extraction, and live provider probes remain parked by Current Sprint truth.

Implementation behavior:

- Build `buildBrainFleetLedgerRecord()` for normalized ledger truth.
- Build `validateBrainFleetLedgerRecord()` so missing workload, route, model, account label, artifact, quota posture, failure reason field, or stop condition fails closed.
- Build `recordBrainFleetLedgerCall()` and `finishBrainFleetLedgerCall()` over existing `createLlmCall`/`finishLlmCall`.
- Build `planAndRecordBrainFleetLedgerCall()` so future Brain Fleet adapters can plan through the existing contract and write ledger truth before any provider execution.
- Store ledger truth in `llm_calls.metadata.brainFleetLedger` while preserving existing `llm_calls` top-level workload, route, model, provider, auth path, credential, status, and error columns.
- Keep unknown quota/reset state explicit as `quota.posture = "unknown"` with `resetAt = null`; do not omit it.

Behavior proof, not substring proof:

- The focused proof calls the actual function path: `buildBrainFleetLedgerRecord()`, `validateBrainFleetLedgerRecord()`, `recordBrainFleetLedgerCall()`, `finishBrainFleetLedgerCall()`, `planAndRecordBrainFleetLedgerCall()`, `buildBrainFleetStopDecision()`, and `assertBrainFleetCredentialsUnchanged()`.
- The proof exercises the API/route path by planning through the existing Brain Fleet route contract and then writing a skipped `llm_calls` ledger row only when `--apply` or `--close-card` is explicitly used.
- Dogfood rejects weak behavior: missing artifact, missing stop condition for failed/skipped rows, quota/rate/auth/provider failures that do not stop, credential mutation, and provider execution.
- No substring-only proof is accepted. Source checks may support the proof, but card closeout depends on real function behavior and the live dry-run ledger row.

## Not Next

- Do not run live provider probes.
- Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.
- Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.
- Do not mutate credentials, OAuth tokens, browser profiles, provider config, `llm_credentials`, `llm_routes`, source systems, Drive permissions, email, Telegram, or public systems.
- Do not start model capability registry, route probes, extractor proof, YouTube runtime proof, broad Skool/MyICOR/Loom crawl, Strategy, or People work from this card.
- Do not hide auth, quota, rate-limit, provider, or missing-ledger failures by classification. Green means raw green.

## Risks

- Risk: ledger work turns into provider probing. Mitigation: close-card proof writes only a skipped internal `llm_calls` row and checks for no provider execution, no fetch, and no spawn path.
- Risk: quota unknown becomes missing truth. Mitigation: unknown quota/reset is explicit and validated.
- Risk: future adapters bypass the ledger. Mitigation: the exported `planAndRecordBrainFleetLedgerCall()` is the only Brain Fleet call boundary this card approves; later adapter cards must prove they use it or an equivalent ledger wrapper.
- Risk: failures keep retrying. Mitigation: stop decisions fail closed on auth-needed, rate-limit, quota-exhausted, provider-failure, route-not-runnable, and missing-ledger-truth conditions.
- Repair path: if focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, or `process:foundation-ship` fails, keep this card active, repair the exact failing invariant, and do not start the model capability registry.

## Tests

The focused proof must simulate:

- a planned ledger row with route/model/account/artifact/quota truth
- a succeeded finish update with output artifact truth
- a skipped quota-exhausted ledger row with failure reason and stop condition
- explicit unknown quota/reset posture
- missing artifact rejection
- missing stop condition rejection for failed/skipped records
- auth-needed, rate-limit, quota-exhausted, and provider-failure stop decisions
- no credential mutation
- no provider execution and no live provider probes

Gate decision tree: this is a P0 Foundation runtime/governance card with runtime LLM ledger writes, live sprint truth, closeout registry, package script, and verifier coverage. It needs static syntax checks, focused behavior proof, live dry-run ledger proof, System Health, repeated-failure gate, backlog hygiene, full `foundation:verify`, and `process:foundation-ship`.

Speed boundary: the focused check is fast and proportional, designed to run under 2 minutes by default because it uses synthetic behavior plus one skipped internal ledger row and no provider probes. The heavier checks stay in the final Foundation ship gate.

Operator value: this enables a real workflow Steve can inspect before Build Intel extraction starts. It unlocks safer route probes and later extractor proof with better speed and quality because every call leaves account, model, quota, artifact, and stop-condition truth instead of a chat-only claim.

## Proof Commands

```bash
node --check lib/brain-fleet-quota-ledger.js scripts/process-brain-fleet-quota-ledger-check.mjs
npm run process:brain-fleet-quota-ledger-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BRAIN-FLEET-QUOTA-LEDGER-001 --planApprovalRef=docs/process/approvals/BRAIN-FLEET-QUOTA-LEDGER-001.json --closeoutKey=brain-fleet-quota-ledger-v1 --commitRef=HEAD
```

## Definition Of Done

- Brain Fleet quota ledger module and process proof pass.
- Close-card proof writes a skipped internal `llm_calls` row with complete Brain Fleet ledger metadata and no provider execution.
- Live backlog row and Current Sprint truth are reconciled.
- Closeout registry and verifier coverage include the card.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` are green.
- Main is clean and pushed before the next card proceeds.
