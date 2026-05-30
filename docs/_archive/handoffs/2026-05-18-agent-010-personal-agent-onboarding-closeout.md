# AGENT-010 Personal Agent Onboarding Closeout

Card: `AGENT-010`

Closeout key: `personal-agent-onboarding-contract-v1`

## What Changed

- Updated `docs/agents/personal-agent-onboarding.md` to contract v1.
- Added `lib/personal-agent-onboarding-contract.js`.
- Added focused proof `scripts/process-agent-010-check.mjs`.
- Added plan and approval artifacts.
- Wired runtime reliability verifier coverage and done-card coverage.
- Updated current plan/state to record `AGENT-010` and point next to `ROLE-ASSISTANT-CONTRACTS-001`.

## What It Does

The contract defines:

- private profile schema with repo-truth boundary
- privacy tiers
- first useful source-backed read
- calibration interview flow
- daily nugget rules
- feedback and non-response loop
- allowed read-only source lookups
- profile update rules

Dogfood rejects missing profile fields, repo-stored private profile values, raw private values, thin calibration, daily nugget spam, repeated non-response nudges, unsafe source lookups, runtime launch, live extraction, provider/model calls, external writes, and hidden subagents.

The core governance verifier now accepts dated review markers instead of freezing the Personal Agent Onboarding page to the original April 26 review date.

## Proof

```bash
npm run process:agent-010-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-010 --planApprovalRef=docs/process/approvals/AGENT-010.json --closeoutKey=personal-agent-onboarding-contract-v1 --commitRef=HEAD
```

## Not Done

This does not implement Harlan.

This does not build Harlan UI or launch live agent runtime work.

This does not build the private profile storage runtime.

This does not send daily nuggets or roll out team assistants.

This does not run live extraction, provider/model calls, external writes, Drive permission mutation, Telegram sends, Gmail sends, ClickUp sends, or Agent Feedback auto-send.

This does not copy raw private profile values into repo truth.

## Next

Continue with `ROLE-ASSISTANT-CONTRACTS-001` unless repo truth surfaces a higher P0 repair.
