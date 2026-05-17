# VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001 Plan

Sprint: `verifier-agent-feedback-orchestration-split-2026-05-17`
Closeout key: `verifier-agent-feedback-orchestration-split-v1`

## Scope

Move Agent Feedback verifier orchestration out of `scripts/foundation-verify.mjs` and into `lib/foundation-agent-feedback-verifier.js`.

This card owns only the existing Agent Feedback verifier domain:

- Agent Onboarding Feedback system verifier setup;
- Agent Feedback send, auto-send, response notify, reminder, live reminder, company-email, full-loop, real-user repair, and production enablement verifier setup;
- Foundation verify-health repair inputs that exist only to support the Agent Feedback production lane;
- Agent Feedback dogfood fixtures for replay, dry-run side effects, auto-send gating, company-email-only policy, approval gating, and metadata-only proof;
- wrapper-compatible historical `VERIFIER-AGENT-FEEDBACK-SPLIT-MODULE-001` proof;
- new `VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001` closeout self-check.

## Why

`scripts/foundation-verify.mjs` is still above the 5K architecture-risk line. Agent Feedback is a real verifier domain, and its setup was still a large root-owned block. This split keeps the root as orchestration and moves the domain proof setup next to the Agent Feedback verifier module.

## Acceptance

- `lib/foundation-agent-feedback-verifier.js` exports `evaluateFoundationAgentFeedbackVerifierOrchestration`.
- `scripts/foundation-verify.mjs` delegates Agent Feedback through the wrapper.
- The root verifier no longer owns Agent Feedback proof fixtures, done-card coverage arrays, approval/doc reads, status construction, direct evaluator call, or direct check aggregation.
- The historical Agent Feedback module split proof accepts wrapper delegation while still proving the extracted evaluator fails closed.
- The focused proof script is read-only and recreates Agent Feedback verifier failure classes through dogfood fixtures.
- `foundation:verify` keeps the same Agent Feedback PASS/FAIL rows and adds the new orchestration closeout proof.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## Dogfood

Dogfood proof recreates the failure class by feeding the Agent Feedback verifier broken fixtures that must fail:

- replay hardening missing;
- dry-run side effects not blocked;
- auto-send gating weakened;
- company-email-only rule missing;
- production enablement not approval-gated;
- private proof leak risk.

The orchestration dogfood also rejects migration-specific failures:

- missing wrapper;
- missing root delegation;
- old direct root call still present;
- missing closeout;
- no line-count reduction.

Compilation or substring presence alone is not accepted as proof.

## Out Of Scope

- Agent Feedback product behavior changes;
- Gmail, ClickUp, Google, or live send behavior changes;
- production auto-send policy changes;
- app route, DB, source extraction, connector auth, paid call, Canva, Fal, ElevenLabs, voice, Harlan runtime, or hub feature work;
- changing active sprint truth;
- moving unrelated verifier domains such as source contracts, process trust, runtime reliability, Recent Builds, structural assurance, or follow-up backlog assurance.

## Proof Commands

```bash
node --check lib/foundation-agent-feedback-verifier.js
node --check scripts/process-verifier-agent-feedback-orchestration-split-check.mjs
node --check scripts/process-verifier-agent-feedback-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-agent-feedback-orchestration-split-check -- --json
npm run process:verifier-agent-feedback-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-agent-feedback-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-agent-feedback-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-AGENT-FEEDBACK-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-agent-feedback-orchestration-split-v1 --commitRef=HEAD
```
