# SOURCE-018 Google Gemini Meeting Notes Contract Closeout

Card: `SOURCE-018`
Closeout key: `source-018-google-gemini-meeting-notes-contract-v1`

## Summary

Closed `SRC-MEETINGS-001` for current Foundation/Steve owner use. The contract now separates current owner-usable meeting-note/transcript archives from future broad raw transcript, team, or agent query access.

## What Changed

- Updated `SRC-MEETINGS-001` to `Signed Off For Current Reality`.
- Kept raw transcript exposure, future broad team/agent query access, Drive permission mutation, meeting-video understanding, and broad historical extraction out of scope.
- Updated source lifecycle completion so Meetings is complete for current owner use while future raw ACL/vault exposure and team/agent query access remain blockers.
- Added focused proof for live meeting target state, governed job status, metadata-only artifact counts, transcript-evidence boundaries, and no Drive mutation.
- Advanced Current Sprint to `EXTRACT-CURRENT-001`.

## Proof

- `node --check lib/source-018-google-gemini-meeting-notes-contract.js lib/source-contracts.js lib/source-lifecycle-completion.js scripts/process-source-018-check.mjs`
- `npm run process:source-018-check -- --apply --close-card --json`
- `npm run source-contract-registry:sync -- --apply --actor=codex-source-018 --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-018 --planApprovalRef=docs/process/approvals/SOURCE-018.json --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-018 --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1`
- `npm run process:foundation-ship -- --card=SOURCE-018 --planApprovalRef=docs/process/approvals/SOURCE-018.json --closeoutKey=source-018-google-gemini-meeting-notes-contract-v1 --commitRef=HEAD`

## Boundaries

- No Drive permission mutation.
- No broad raw transcript read surface.
- No team/agent query access approval.
- No broad historical extraction.
- No external writes, credential mutation, or provider config changes.

## Next

Continue Foundation-only with `EXTRACT-CURRENT-001`.
