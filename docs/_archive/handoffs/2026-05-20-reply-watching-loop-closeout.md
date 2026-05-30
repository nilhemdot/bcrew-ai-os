# REPLY-WATCHING-LOOP-001 Closeout

Date: 2026-05-20

## What Changed

- Replaced the old Reply Parser / watching_items pattern with a governed action-loop contract.
- Promoted the useful old reply intents while rejecting the old private queue shape.
- Reused Action Route Review Inbox, decisions, open questions, backlog items, synthesized items, and change events as the loop ledgers.
- Proved ambiguous replies, low-confidence resolutions, missing owner/evidence, second queues, and unsafe side effects fail closed.

## Proof

- Total loop items: 76
- Review inbox items: 70
- Open question items: 6
- Unresolved items: 70
- Forbidden second queues: 0
- Missing owner/evidence: 0

## Commands

- `node --check lib/reply-watching-loop.js scripts/process-reply-watching-loop-check.mjs`
- `npm run process:reply-watching-loop-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=REPLY-WATCHING-LOOP-001 --closeoutKey=reply-watching-loop-v1`
- `npm run process:foundation-ship -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --commitRef=HEAD`

## Known Limits

- This does not run live Gmail, Missive, Slack, or Telegram reply ingestion.
- This does not send messages or mutate external systems.
- This does not create a new reply queue table.
- This does not auto-close ambiguous or low-confidence replies.
- This does not build Strategy Hub, People, agent runtime, or extraction features.

## Next

Continue `STRATEGY-QUARTER-001` only after its own plan and proof pass.
