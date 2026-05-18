# Old-System Agent Onboarding Harvest Closeout

Card: `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`

Closeout key: `old-system-agent-onboarding-harvest-v1`

## What Changed

- Added `docs/agents/old-system-agent-onboarding-harvest.md`.
- Added `lib/old-system-agent-onboarding-harvest.js`.
- Added focused proof `scripts/process-old-system-agent-onboarding-harvest-check.mjs`.
- Added plan and approval artifacts.
- Wired runtime reliability verifier coverage and done-card coverage.
- Updated current plan/state to record the old-system harvest and point next to `AGENT-010`.

## What It Does

The harvest promotes only durable lessons from old BCrew-Buddy evidence:

- keep/rebuild/retire decisions
- profile fields
- calibration questions
- coaching loop requirements
- failure and non-engagement handling
- proof requirements for `AGENT-010`

Dogfood rejects missing evidence, missing keep/rebuild/retire disposition, thin profile/question sets, raw private content promotion, runtime launch, live extraction, provider/model calls, external writes, and hidden subagents.

## Proof

```bash
npm run process:old-system-agent-onboarding-harvest-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 --planApprovalRef=docs/process/approvals/OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001.json --closeoutKey=old-system-agent-onboarding-harvest-v1 --commitRef=HEAD
```

## Not Done

This does not implement AGENT-010.

This does not build Harlan UI or launch live agent runtime work.

This does not run live extraction, provider/model calls, external writes, Drive permission mutation, Telegram sends, Gmail sends, ClickUp sends, or Agent Feedback auto-send.

This does not copy raw private transcripts or private profile data into repo truth.

## Next

Continue with `AGENT-010` unless repo truth surfaces a higher P0 repair.
