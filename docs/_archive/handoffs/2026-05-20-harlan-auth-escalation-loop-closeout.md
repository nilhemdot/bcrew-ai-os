# Harlan Auth Escalation Loop Closeout

Date: 2026-05-20
Card: `HARLAN-AUTH-ESCALATION-LOOP-001`
Closeout: `harlan-auth-escalation-loop-v1`

## What Changed

Added the Foundation-owned Harlan auth escalation loop contract and focused proof.

The loop turns provider/extractor/Harlan `auth_needed` into a `blocked-auth` event, prepares a Steve-only Harlan/Telegram/email notification draft, dedups duplicate issue keys, waits for `DONE`, silently re-verifies, resumes only after proof, and fails closed on timeout or failed reverify.

## Where It Lives

- `lib/harlan-auth-escalation-loop.js`
- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `docs/agents/harlan-auth-escalation-loop.md`
- `docs/process/harlan-auth-escalation-loop-001-plan.md`
- `docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json`
- `lib/foundation-build-closeout-agent-runtime-records.js`
- `lib/foundation-runtime-reliability-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`

## Proof

Focused proof dogfoods:

- 2FA/auth-needed -> `blocked-auth`
- dedup/no spam
- timeout/fail-closed
- `DONE` -> silent reverify -> resume
- no credential mutation
- unsafe live external-send rejection
- missing old-system source refs, missing `DONE`, and missing reverify rejection

Closeout proof commands:

- `npm run process:harlan-auth-escalation-loop-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json --closeoutKey=harlan-auth-escalation-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --closeoutKey=harlan-auth-escalation-loop-v1`
- `npm run process:foundation-ship -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json --closeoutKey=harlan-auth-escalation-loop-v1 --commitRef=HEAD`

Old-system source harvest is verified against:

- `/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md`

## Boundaries

No live external messages were sent.

There is no credential mutation, token mutation, browser-profile mutation, provider config mutation, `llm_credentials` mutation, or `llm_routes` mutation.

There is no live provider probe, model call, paid/private source access, browser automation, broad crawl, Strategy work, People work, or extractor runtime.

## Next

Continue `BRAIN-FLEET-QUOTA-LEDGER-001` before any live route probes or extractor proof.
