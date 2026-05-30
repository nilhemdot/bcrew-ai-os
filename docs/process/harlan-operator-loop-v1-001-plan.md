# HARLAN-OPERATOR-LOOP-V1-001 Harlan Operator Loop Plan

Card: `HARLAN-OPERATOR-LOOP-V1-001`
Closeout key: `harlan-operator-loop-v1`
Owner: Foundation Agent Runtime
Gate: Full Foundation ship

## What

Build Harlan's first read-only Foundation operator answer loop as a contract and proof. The loop consumes declared source inputs for Current Sprint, build log, system health, nightly audit, build-lane telemetry, backlog, and source/action route truth, then returns the six sections Steve actually needs: what is true now, what changed, what is broken, what is blocked, who owns it, and what happens next.

This is not Harlan runtime launch, UI, voice/avatar, private profile storage, live extraction, provider/model call, external send, Drive mutation, external Harlan home movement, or hidden-worker work.

## Why

Harlan becomes useful only when he can answer current operator questions from live Foundation truth. This card prevents the first loop from becoming a freeform chat claim, stale-memory answer, mock dashboard, runtime launch, or hidden worker.

Useful operator behavior: Steve can ask for the current Foundation picture during a real workflow and get a compact source-backed answer that names the current state, change, broken/blocked items, owners, and next card without sounding current from memory. This unlocks speed and quality because the answer reduces builder confusion before Steve has to inspect several Foundation surfaces himself.

## Acceptance Criteria

- `HARLAN-OPERATOR-LOOP-V1-001` is live done under `harlan-operator-loop-v1`.
- The operator loop declares required inputs for `current-sprint`, `build-log`, `system-health`, `nightly-audit`, `build-lane-telemetry`, `backlog`, and `source-action-routes`.
- The operator answer declares `true-now`, `changed`, `broken`, `blocked`, `owners`, and `next` sections.
- Every current section has source refs to declared fresh inputs.
- Dogfood rejects missing inputs, memory-only current proof, stale inputs, missing section refs, unapproved writes, runtime side effects, hidden workers, missing next action, and unavailable sources that still sound current.
- `BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001` remains next unless live repo truth surfaces a higher P0 repair.

## Definition Of Done

Done means the module, focused proof, Harlan operator-loop doc, closeout record, verifier coverage, package script, current plan/state notes, live backlog row, Current Sprint overlay, focused proof, backlog hygiene, `foundation:verify`, ship check, fanout, and full `process:foundation-ship` all pass and the commit is pushed.

Repair path: if any proof fails or behavior regresses, do not weaken the gate. Fix the broken contract, source wiring, live backlog metadata, or verifier coverage, then rerun the focused proof before full ship. If the behavior cannot be repaired safely in this card, reopen or mark the card blocked and route a follow-up with the failing fixture preserved.

## Details

This reuses existing code, existing docs, existing scripts, and live backlog / Current Sprint truth. Implementation files:

- `lib/harlan-operator-loop.js`
- `scripts/process-harlan-operator-loop-check.mjs`
- `docs/agents/harlan-operator-loop.md`
- `docs/agents/harlan.md`
- `lib/foundation-runtime-reliability-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-agent-runtime-records.js`
- `docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json`
- `docs/_archive/handoffs/2026-05-18-harlan-operator-loop-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Root invariant: Harlan can only sound current when every current answer section is backed by fresh declared source inputs. The proof checks real behavior through the evaluator function path, live backlog/current sprint metadata, closeout artifacts, verifier coverage, and dogfood fixtures that fail closed.

Gate decision tree: static checks are not enough because this touches live backlog/current-sprint truth, verifier coverage, closeout records, and Foundation ship surfaces. Focused proof is used while iterating through `process:harlan-operator-loop-check`; full verification is required for ship through `foundation:verify` and `process:foundation-ship` because the blast radius includes verifier/runtime governance. The focused gate must stay fast and proportional, under 2 minutes, so it is usable by default.

## Risks

- Drift into launching Harlan runtime. Blocked by runtime-start flags and not-next boundaries.
- Stale-memory current answers. Blocked by fresh input and memory-only dogfood.
- New write surface. Mutating next actions require approval and stay disabled.
- Duplicate Foundation Hub UI. This is an answer contract over existing surfaces, not a UI redesign.
- Meeting Vault or Drive scope creep. `MEETING-VAULT-ACL-001` Phase B and Drive permission mutation are explicitly blocked.

## Tests

```bash
node --check lib/harlan-operator-loop.js lib/foundation-runtime-reliability-verifier.js scripts/process-harlan-operator-loop-check.mjs scripts/foundation-verify.mjs
npm run process:harlan-operator-loop-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --closeoutKey=harlan-operator-loop-v1
npm run process:foundation-ship -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --commitRef=HEAD
```
