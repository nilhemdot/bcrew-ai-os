# Agent Capability Registry Closeout

Card: `AGENT-CAPABILITY-REGISTRY-001`

Closeout key: `agent-capability-registry-v1`

## What Changed

- Added `lib/agent-capability-registry.js`.
- Added focused proof `scripts/process-agent-capability-registry-check.mjs`.
- Added plan and approval artifacts.
- Wired runtime reliability verifier coverage and done-card coverage.
- Added the next-card current-progress allowlist for `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` while keeping `scripts/foundation-verify.mjs` under 5,000 lines.
- Updated current plan/state to record the shipped capability registry.

## What It Does

The registry defines the minimum proof an agent needs before claiming it can act:

- agent identity, role, owner, purpose, and permission tier
- tools and local/live source lookups
- source/system refs
- read/write posture
- model route policy
- logging and transcript proof posture
- approval boundaries
- fallback behavior

Declared read-only capability claims pass. Missing tools, missing source refs, missing model route, missing logging, claim-only rows, unknown capability claims, unapproved side-effect claims, and runtime side-effect attempts fail closed.

## Proof

```bash
npm run process:agent-capability-registry-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json --closeoutKey=agent-capability-registry-v1 --commitRef=HEAD
```

Dogfood rejects missing tools, source refs, model route, logging, claim-only capability rows, undeclared capability claims, unapproved write claims, runtime launch, live extraction, provider/model calls, external writes, and hidden subagents.

## Not Done

This does not build Harlan UI.

This does not launch live agent runtime work.

This does not implement the reusable runtime template.

This does not run live extraction, provider/model calls, external writes, Drive permission mutation, or Agent Feedback auto-send.

## Next

Continue with `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` unless repo truth surfaces a higher P0 repair.
