# Agent Feedback Real-User Submit Repair Metadata Fallback

Card: `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` repair slice
Closeout: `agent-feedback-real-user-submit-repair-metadata-fallback-v1`

## Problem

The accepted real-user repair proof is metadata-only and archived in `docs/_archive/audits/2026-05-01-agent-feedback-real-user-submit-repair-proof.md`. The live status builder still tried to re-fetch Gmail sent-message metadata and re-probe duplicate submit from the Gmail body later. When that external read was unavailable, `foundation:verify` turned red even though the archived proof already records BCC metadata and duplicate-submit proof without raw emails or tokens.

## Scope

- Parse the archived metadata-only proof artifact.
- Use the artifact as fallback only when it matches the active repair attempt and real browser response token hash prefix.
- Allow fallback for BCC metadata and duplicate-submit clear-message proof only when the artifact says raw emails, raw tokens, and feedback content were not logged.
- Keep live Gmail metadata and live duplicate protection as the preferred proof when available.

## Out Of Scope

- No Gmail send, Gmail mutation, ClickUp mutation, reminder mutation, production auto-send, Georgia target send, or new feedback request.
- No raw token, raw email, or feedback content logging.
- No change to Agent Feedback product behavior or route behavior.

## Proof

- `node --check lib/agent-feedback-real-user-submit-repair.js scripts/process-agent-feedback-real-user-submit-repair-check.mjs`
- `npm run process:agent-feedback-real-user-submit-repair-check -- --includeDuplicateProbe`
- `npm run process:agent-feedback-steve-full-loop-test-check -- --json`
- `npm run process:verifier-agent-feedback-orchestration-split-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-METADATA-FALLBACK-001.json --closeoutKey=agent-feedback-real-user-submit-repair-metadata-fallback-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 --closeoutKey=agent-feedback-real-user-submit-repair-metadata-fallback-v1`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-METADATA-FALLBACK-001.json --closeoutKey=agent-feedback-real-user-submit-repair-metadata-fallback-v1 --commitRef=HEAD`
