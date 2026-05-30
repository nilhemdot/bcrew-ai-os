# Synthesis Router Freshness Trigger V1 Closeout

Card: `SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001`
Closeout: `synthesis-router-freshness-trigger-v1`

## What Changed

- Added the source-family freshness snapshot and job classifier in `lib/synthesis-router-freshness-trigger.js`.
- Wired `scripts/run-foundation-job.mjs` so completed Foundation jobs patch freshness metadata into `foundation_job_runs`.
- Added focused proof in `scripts/process-synthesis-router-freshness-trigger-check.mjs`.
- Kept follow-up execution explicit: `SYNTHESIS_FRESHNESS_TRIGGER_AUTORUN=true` is required before synthesis/action-router jobs can auto-run.

## What It Does

The system now compares archive/extractor watermarks against the latest synthesis and Action Router jobs. It reports stale, blocked-by-extractor, waiting-for-extractor, action-router-due, or fresh instead of letting source activity look synthesized when the brain layer has not caught up.

## Proof

```bash
node --check lib/synthesis-router-freshness-trigger.js scripts/process-synthesis-router-freshness-trigger-check.mjs scripts/run-foundation-job.mjs
npm run process:synthesis-router-freshness-trigger-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:ship-check -- --card=SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001 --planApprovalRef=docs/process/approvals/SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001.json --closeoutKey=synthesis-router-freshness-trigger-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001 --closeoutKey=synthesis-router-freshness-trigger-v1
npm run process:foundation-ship -- --card=SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001 --planApprovalRef=docs/process/approvals/SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001.json --closeoutKey=synthesis-router-freshness-trigger-v1 --commitRef=HEAD
```

Focused proof currently shows the live ledger is `waiting_for_extractor`, with runtime-patched freshness metadata present. That is the correct honest state: fresh source work exists, but the tracked extractor/synthesis path is not allowed to pretend the brain layer is fresh.

## Guardrails

- No backlog, decision, destination-ledger, source-system, external, or Git report writes from the trigger.
- No spend by default.
- No synthesis/action-router autorun unless the explicit environment flag is enabled.
- Failed extractors block freshness claims instead of being papered over.

## Next

Repair the source-family extractor jobs that are waiting or blocked, then enable bounded synthesis autorun only after the worker lane is ready for that operating posture.
