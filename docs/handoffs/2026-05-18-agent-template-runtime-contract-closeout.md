# Agent Template Runtime Contract Closeout

Card: `AGENT-TEMPLATE-RUNTIME-CONTRACT-001`

Closeout key: `agent-template-runtime-contract-v1`

## What Changed

- Added `lib/agent-template-runtime-contract.js`.
- Added focused proof `scripts/process-agent-template-runtime-contract-check.mjs`.
- Added plan and approval artifacts.
- Wired runtime reliability verifier coverage and done-card coverage.
- Updated the next-card current-progress allowlist for `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001` without growing `scripts/foundation-verify.mjs` past the 5,000-line guardrail.
- Updated current plan/state to record the shipped runtime template contract.

## What It Does

The template defines the minimum proof every future AIOS agent needs before runtime or feature work expands:

- identity, role, owner, purpose, and permission tier
- source access
- memory scope and private-profile boundary
- tool permissions
- model route and cost policy
- approval posture
- live-answer preflight and capability registry refs
- action routing
- logging and transcript proof
- failure visibility
- onboarding/profile contract
- decommission path

Valid Harlan, Crewbert, and extraction-worker template examples pass. Missing identity/source/memory/tools/approval/preflight/capability/logging/failure/decommission fields, prompt-only templates, runtime launch, live extraction, provider/model calls, external writes, and hidden subagents fail closed.

## Proof

```bash
npm run process:agent-template-runtime-contract-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-TEMPLATE-RUNTIME-CONTRACT-001 --planApprovalRef=docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json --closeoutKey=agent-template-runtime-contract-v1 --commitRef=HEAD
```

## Not Done

This does not build Harlan UI.

This does not launch live agent runtime work.

This does not harvest old BCrew-Buddy onboarding evidence.

This does not run live extraction, provider/model calls, external writes, Drive permission mutation, or Agent Feedback auto-send.

This does not work `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.

## Next

Continue with `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001` unless repo truth surfaces a higher P0 repair.
