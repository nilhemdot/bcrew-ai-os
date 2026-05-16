# PROCESS-WIP-PROTOCOL-001 Closeout

## Summary

Added a Foundation WIP protocol guard so hub or side-lane work can keep moving only inside owned files. If Canva, Marketing Video Lab, Harlan, Fal, Sales, Ops, Strategy, or another side lane needs shared Foundation files, the plan now has to name main-session coordination before Plan Critic will pass it.

## What Changed

- Added `lib/process-wip-protocol.js` with deterministic file classification, shared stop-and-coordinate paths, hub lane paths, and dogfood fixtures.
- Wired `evaluateProcessWipProtocolPlan()` into `lib/plan-critic-architectural-rules.js`.
- Extended Plan Critic synthetic architecture proof to reject uncoordinated side-work shared-file plans and pass coordinated shared-file plans.
- Added `scripts/process-wip-protocol-check.mjs`.
- Added package script `process:process-wip-protocol-check`.
- Added Recent Work closeout record `process-wip-protocol-v1`.

## Dogfood Proof

The focused proof recreates the failure pattern from this week:

- Marketing/Canva-style side work touches `server.js` and `package.json` without coordination: rejected.
- Harlan/Fal side work touches `lib/security-access.js` without coordination: rejected.
- Hub-owned-only Marketing work stays allowed.
- Shared-file work with main-session approval, requested shared files, `process:hub-work-check`, focused proof, and full ship gate stays allowed.

## Proof Commands

- `npm run process:process-wip-protocol-check -- --json`
- `npm run process:plan-critic-architectural-rules-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=PROCESS-WIP-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PROCESS-WIP-PROTOCOL-001.json --closeoutKey=process-wip-protocol-v1 --commitRef=HEAD`

## Limits

- This does not build Canva, Marketing Video Lab, Fal image editing, Harlan terminal runtime, voice wiring, or hub features.
- This does not stop local untracked mockups or experiments by itself.
- This does not replace `process:hub-work-check`; it makes missing shared-file coordination fail Plan Critic.
- Shared Foundation files still can be changed, but only through main-session ownership, explicit coordination, focused proof, and full ship gate.

## Next

Use this gate before any Harlan runtime, Fal image iteration, Canva client expansion, Marketing Video Lab route wiring, or hub feature work that needs shared substrate files.
