# MEMORY-002 OpenClaw Native Memory Preflight Plan

Card: `MEMORY-002`
Closeout key: `memory-002-openclaw-native-memory-preflight-v1`

## What
Build a narrow V1, metadata-only OpenClaw native memory preflight. This card does not enable memory. It proves the current local memory posture from read-only CLI metadata, records the approval boundary, and returns `MEMORY-002` pending explicit local-runtime approval before any config mutation, gateway restart, active-memory/dreaming enablement, or private recall proof.

The main session owns these shared Foundation files. No separate chat, side lane, or hub work may commit, push, merge, or ship this card; if the work is ever resumed outside the main session, it must return to the main session before commit, push, merge, or ship.

## Why
Steve needs speed with quality on assistant recall. The useful operator value is knowing whether local OpenClaw memory is healthy enough to approve a runtime enablement step without leaking private memory, calling providers, or letting a Foundation builder silently mutate a high-trust local runtime.

The root invariant is: `MEMORY-002` can only move from scoped/preflight into runtime enablement when the actual local metadata is healthy and explicit local-runtime approval exists. This plan proves that invariant through real OpenClaw CLI behavior and the actual function path `evaluateOpenClawNativeMemoryPreflight`, not by forcing a verifier, dashboard, or sprint marker to pass.

## Acceptance Criteria
- `openclaw config validate --json`, `openclaw plugins list --json`, `openclaw memory status --json`, and `openclaw config get plugins --json` are called as read-only metadata commands.
- `evaluateOpenClawNativeMemoryPreflight` reports healthy memory-core metadata only as `blocked_pending_runtime_approval` unless active-memory/dreaming enablement evidence and explicit approval both exist.
- The dogfood proof rejects runtime mutation, false runtime approval, missing active-memory, and private recall probing through real function behavior; substring-only proof is rejected.
- The focused proof command `npm run process:memory-002-openclaw-native-memory-preflight-check -- --json` is read-only by default, and live backlog/sprint mutation requires explicit `--apply`.
- With `--apply`, live Backlog keeps `MEMORY-002` scoped, Current Sprint marks it returned, and current plan/state record the approval boundary.
- `foundation:verify` passes and `process:foundation-ship` passes before push.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live Backlog truth, Plan Critic, closeout registry, and process write guard are reused.
- `lib/openclaw-native-memory-preflight.js` owns the actual function-path behavior for fail-closed side-effect and private recall guards.
- `scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs` is the focused proof script and remains read-only by default.
- `scripts/process-fanout-check.mjs` and `scripts/process-post-ship-fanout.mjs` validate `blocked-preflight` closeouts without requiring the target card to be marked done.
- `docs/process/approvals/MEMORY-002.json` approves only the metadata preflight/return scope.
- `docs/handoffs/2026-05-18-memory-002-openclaw-native-memory-preflight.md` records no config mutation, no gateway restart, no private recall probe, no provider/model call, and no external-system mutation.
- `MEMORY-002` is not marked done as native memory enablement.

## Details
Scope is tight, bounded, and V1 only:

- Read compact OpenClaw metadata and never read or print private memory content, transcripts, tokens, or session files.
- Verify `memory-core`, `active-memory`, and dreaming capability posture from plugin/config metadata.
- Verify the memory status metadata is healthy: builtin backend, not dirty, FTS/vector available, no reported issues, and counts only.
- Record that `memory-core` is already enabled while active-memory/dreaming enablement, gateway restart, and real private recall proof remain not next.
- Update live state only through explicit `--apply`; no-flag runs are read-only by default and fail closed if asked to imply runtime approval.

Not next:

- Do not mutate OpenClaw runtime config.
- Do not restart the OpenClaw gateway.
- Do not run active-memory recall, dreaming, memory search, promote, index mutation, or recall writes.
- Do not read or print private memory content, transcripts, tokens, or session files.
- Do not call providers or models.
- Do not run live extraction, source crawls, transcript fetches, screenshots, downloads, summarization, vision, or model calls.
- Do not mutate external systems.
- Do not mark `MEMORY-002` done as native memory enablement.

Split/no-new-responsibility plan:

- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` are already large shared status docs. This card adds only short top-status notes and no new responsibility; any further detail belongs in the handoff or the dedicated process plan.
- `lib/foundation-build-closeout-agent-runtime-records.js` receives only a closeout registry row. No new runtime logic goes into that registry.
- `scripts/process-fanout-check.mjs` and `scripts/process-post-ship-fanout.mjs` receive only a narrow blocked-preflight acceptance branch for approval-bound closeouts; they still require normal completed cards to be done.
- New behavior lives in the small dedicated module and focused proof script.

Explicit file-size budget:

- Approval JSON data record stays under 80 lines.
- Handoff report artifact stays under 120 lines.
- Process plan stays under 160 lines.
- New module stays under 300 lines and the focused script stays under 450 lines for this V1.
- Fanout checks stay under 350 lines each; this card adds only the blocked-preflight branches.

Gate decision tree:

- Static gate: `node --check` for the new module and script.
- Focused gate: `npm run process:memory-002-openclaw-native-memory-preflight-check -- --json`, then `--apply --json` for the explicit live-state return.
- Full gate: because this touches package scripts, process checks, live Backlog/Current Sprint state, runtime-boundary docs, fanout validation, and Foundation verification, run `npm run foundation:verify -- --json-summary`, `npm run process:fanout-check -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1`, `npm run process:post-ship-fanout -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD`, and `npm run process:foundation-ship -- --card=MEMORY-002 --planApprovalRef=docs/process/approvals/MEMORY-002.json --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD`.

## Risks
Risk: accidentally treating a disabled active-memory posture as finished enablement. Repair path: fail closed, keep `MEMORY-002` scoped/returned, and require explicit local-runtime approval before any enablement card can proceed.

Risk: leaking private memory by printing raw status/config output. Repair path: compact and redact metadata in the focused proof, reopen the card if raw private content appears, and keep provider/model calls out of scope.

Risk: adding process weight. The focused proof is fast and proportional: four read-only CLI metadata calls plus function-path dogfood, expected to complete well under one minute before the full ship gate.

## Tests
Run:

```sh
node --check lib/openclaw-native-memory-preflight.js scripts/process-memory-002-openclaw-native-memory-preflight-check.mjs
npm run process:memory-002-openclaw-native-memory-preflight-check -- --json
npm run process:memory-002-openclaw-native-memory-preflight-check -- --apply --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=MEMORY-002 --planApprovalRef=docs/process/approvals/MEMORY-002.json --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1
npm run process:post-ship-fanout -- --card=MEMORY-002 --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=MEMORY-002 --planApprovalRef=docs/process/approvals/MEMORY-002.json --closeoutKey=memory-002-openclaw-native-memory-preflight-v1 --commitRef=HEAD
```
