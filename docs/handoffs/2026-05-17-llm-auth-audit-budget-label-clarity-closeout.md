# LLM Auth Audit Budget Label Clarity Closeout

Card: `LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001`

Closeout key: `llm-auth-audit-budget-label-clarity-v1`

## What Changed
- Changed the `llm-auth-audit` job budget from `no_llm` to `model_probe_no_extraction`.
- Added explicit budget details for the provider model probe, with extraction, external write, and Agent Feedback auto-send all false.
- Labeled the OpenClaw `actual_model_run` probe in the audit script with the same budget class.
- Added `lib/llm-auth-audit-budget-label-clarity.js` for the reusable validation and dogfood cases.
- Wired the budget-label validation into LLM auth runtime status and foundation verifier coverage.
- Added the focused proof, plan, approval, closeout registry record, and live Current Sprint closeout.

## Proof
- `node --check lib/llm-auth-audit-budget-label-clarity.js lib/foundation-verify-llm-auth-audit.js scripts/process-llm-auth-audit-budget-label-clarity-check.mjs scripts/foundation-verify.mjs`
- `npm run process:llm-auth-audit-budget-label-clarity-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --planApprovalRef=docs/process/approvals/LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001.json --closeoutKey=llm-auth-audit-budget-label-clarity-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --closeoutKey=llm-auth-audit-budget-label-clarity-v1`
- `npm run process:foundation-ship -- --card=LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 --planApprovalRef=docs/process/approvals/LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001.json --closeoutKey=llm-auth-audit-budget-label-clarity-v1 --commitRef=HEAD`

## Dogfood
- `no_llm` plus `actual_model_run` fails.
- An unlabeled model probe fails.
- A scheduled model-probe audit fails.
- Manual `model_probe_no_extraction` with read-only/no-extraction/no-external-write posture passes.

## Boundaries
No live extraction, live LLM auth audit rerun, provider account repair, OAuth, Agent Feedback auto-send, Gmail send, ClickUp write, Harlan, Fal, voice, Canva, OpenHuman, connector feature work, or Drive permission mutation ran in this sprint.

Historical `llm-auth-audit` run metadata may still show the old `no_llm` label because this card intentionally did not rerun that provider/model probe. Future job definition and source contracts now carry the honest label.

## Next
Continue the bounded Foundation queue with `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`.
