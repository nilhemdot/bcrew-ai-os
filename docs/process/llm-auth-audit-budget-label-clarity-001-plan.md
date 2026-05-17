# LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 Plan

## What
Make `LLM-AUTH-AUDIT-001` budget/provider labels honest. The existing `llm-auth-audit` job used a `no_llm` budget label while its proof includes an OpenClaw subscription gateway `actual_model_run` probe. V1 changes that job definition to `model_probe_no_extraction`, adds explicit budget details, and proves `no_llm` cannot hide model/provider probing.

This is Foundation process truth work only. It does not run extraction, rerun the live LLM auth audit job, repair provider accounts, send Agent Feedback, or write to external systems.

## Why
`no_llm` must mean no model/provider probe. If a job performs an OpenClaw subscription auth/model probe, the budget label needs to say that plainly so future builders, verifier checks, and operators do not mistake a provider probe for a no-model path.

This protects the build lane before more extraction/runtime work begins. Foundation should fail closed on misleading budget labels instead of relying on humans to remember that one "no_llm" audit actually touched a model gateway.

Operator value: Steve and future builders can trust budget labels in the real workflow. The card unlocks speed and quality by making provider/model probing visible before runtime or extraction cards depend on it.

## Acceptance Criteria
- `llm-auth-audit` uses the canonical `model_probe_no_extraction` budget label.
- The job definition records `modelProviderProbe: true`, `extraction: false`, `externalWrite: false`, and `agentFeedbackAutoSend: false`.
- The audit script labels the OpenClaw `actual_model_run` probe with the same budget class.
- Runtime LLM auth status exposes the honest budget-label summary.
- Focused proof dogfoods that `no_llm` plus `actual_model_run` fails.
- Focused proof dogfoods that an unlabeled model probe fails.
- Focused proof dogfoods that a scheduled model-probe audit fails.
- Focused proof dogfoods that manual `model_probe_no_extraction` passes.
- Verifier coverage fails if the budget-label standard, process artifacts, or closeout are missing.
- `LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001` has Plan Critic score 10/10 and pass status for this approved plan.
- Proof command `npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json` passes.
- No extraction, provider account repair, live LLM auth audit rerun, Agent Feedback auto-send, ClickUp write, Gmail send, or Drive permission mutation occurs.

## Definition Of Done
- Add `lib/llm-auth-audit-budget-label-clarity.js`.
- Patch `lib/foundation-jobs.js`, `scripts/audit-llm-auth-paths.mjs`, and `lib/llm-auth-audit-proof.js`.
- Add focused proof script `scripts/process-llm-auth-audit-budget-label-clarity-check.mjs`.
- Register `process:llm-auth-audit-budget-label-clarity-check`.
- Add approval JSON, closeout handoff, closeout registry record, and verifier coverage.
- Move the live backlog card and Current Sprint overlay through scoped, sprint ready, building, and done states.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.
- If any command revises or fails, repair the failed budget-label, scaffold, verifier, or artifact invariant before commit.

## Details
Existing work to reuse:

- Existing code: `lib/foundation-jobs.js`, `scripts/audit-llm-auth-paths.mjs`, `lib/llm-auth-audit-proof.js`, `lib/foundation-verify-llm-auth-audit.js`, and `lib/process-write-guard.js`.
- Existing docs: `docs/process/llm-auth-audit-001-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-llm-auth-audit-check.mjs`, `scripts/audit-llm-auth-paths.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: use the live DB card and Current Sprint overlay, not a handoff-only label.

Behavior proof:

- The focused proof calls the actual function path `validateLlmAuthAuditBudgetLabel()`.
- Dogfood uses synthetic weak and healthy job definitions. No substring-only proof is accepted; substring-only proof is rejected.
- API/process behavior comes through `buildLlmAuthAuditStatus()`, Current Sprint readback, Plan Critic rows, package script registration, closeout registry, and full `process:foundation-ship`.
- Source-label checks are used only to prove this label contract is present in the job/audit source; they are not accepted without the function-path dogfood.

Gate decision tree: this card uses static syntax checks for touched modules, focused proof while iterating, targeted repair for any focused failure, full `foundation:verify` once focused proof is green, and full `process:foundation-ship` before push because the blast radius touches Foundation job truth, verifier coverage, package scripts, and process artifacts.

Foundation approved active sprint scope. Requested shared files are declared: `package.json`, `scripts/foundation-verify.mjs`, `lib/foundation-jobs.js`, `lib/foundation-verify-llm-auth-audit.js`, `lib/llm-auth-audit-proof.js`, and `docs/process/*`. This is main-session Foundation process work, not side or hub work.

The budget label standard is narrow:

- `no_llm` is invalid for jobs that require an `actual_model_run` provider probe.
- `model_probe_no_extraction` is valid only when the job is manual/read-only, explicitly says it is not extraction, and forbids external writes and Agent Feedback auto-send.
- The audit script source must visibly label the OpenClaw provider probe with that budget class.
- Historical run metadata is evidence only. This card does not rerun the live LLM auth audit job just to rewrite historical metadata.

File-size and artifact budget:

- `scripts/foundation-verify.mjs` is already over the preferred hand-written module budget, so this card adds only minimal orchestration wiring and keeps behavior in `lib/llm-auth-audit-budget-label-clarity.js`.
- New hand-written module target: under 1,500 lines.
- New proof script target: under 1,500 lines.
- Approval JSON data-record budget: under 5 KB.
- Closeout/report artifact budget: under 12 KB.

Split plan: `docs/rebuild/current-plan.md` is over the 1,500-line watch threshold, so this card keeps it as a thin status wrapper with no new responsibility; durable behavior lives in `lib/llm-auth-audit-budget-label-clarity.js` and focused verifier coverage.

## Risks
The main risk is accidentally treating this as permission to rerun a provider/model audit. That is not approved. This card validates labels, source posture, and process artifacts only.

Another risk is using brittle source checks. The proof may check source labels because this is a budget-label contract, but the dogfood must prove actual bad configurations fail and valid manual model-probe posture passes.

## Tests
- `node --check lib/llm-auth-audit-budget-label-clarity.js lib/foundation-verify-llm-auth-audit.js scripts/process-llm-auth-audit-budget-label-clarity-check.mjs scripts/foundation-verify.mjs`
- `npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --planApprovalRef=docs/process/approvals/LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001.json --closeoutKey=llm-auth-audit-budget-label-clarity-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --closeoutKey=llm-auth-audit-budget-label-clarity-v1`
- `npm run process:foundation-ship -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --planApprovalRef=docs/process/approvals/LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001.json --closeoutKey=llm-auth-audit-budget-label-clarity-v1 --commitRef=HEAD`

## Not Next
Do not run live extraction. Do not rerun the live LLM auth audit job. Do not repair provider accounts. Do not run OAuth. Do not work Harlan, Fal, voice, Canva, OpenHuman, or connector features. Do not mutate Drive permissions. Do not run the live Agent Feedback auto-send job.
