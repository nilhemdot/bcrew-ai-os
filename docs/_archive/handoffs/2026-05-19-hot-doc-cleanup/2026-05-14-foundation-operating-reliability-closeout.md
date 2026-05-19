# Foundation Operating Reliability Closeout - 2026-05-14

Closeout key: `foundation-operating-reliability-v1`

Sprint ID: `foundation-operating-reliability-2026-05-14`

Cards closed:

- `CONNECTOR-UPTIME-MONITOR-001`
- `SOURCE-023`
- `RUNTIME-ACTIVATION-001`
- `SYSTEM-HEALTH-AUDITOR-001`
- `PLAN-STATE-RECONCILE-001`

## What Shipped

This sprint made Foundation source/runtime health visible before a hub or ship gate discovers a broken connector.

- Added `lib/connector-uptime-monitor.js` as the bounded reliability module.
- Added six connector health groups: ClickUp, FUB, Google Workspace, Slack, Missive, and KPI/Supabase.
- Added shared connector failure classification, retry/backoff recommendations, and redacted error output.
- Added a scheduled read-only Foundation job: `connector-uptime-monitor`.
- Added runtime activation states for jobs and connectors: scheduled, manual, paused, blocked, due, stale, failed, healthy, degraded, down.
- Added a report-only morning health surface that explicitly distinguishes the deterministic scanner from the recurring senior-engineer deep audit that is still only a follow-up card.
- Added `foundationOperatingReliability` to the full `/api/foundation-hub?view=full` diagnostics payload.
- Added `scripts/process-foundation-operating-reliability-check.mjs` and package script `process:foundation-operating-reliability-check`.
- Added five card plans, five v2 approval files, and durable Plan Critic pass rows at 10/10.

## Why It Matters

The system now answers the real operator question: "Is ClickUp/FUB/Google/Slack/Missive/KPI healthy enough to trust right now?"

It also answers the runtime question Steve kept asking: "What is actually running, what is manual, what is blocked, and what is stale?"

The morning health surface is intentionally honest. It reports that the deterministic code-quality scanner is manual/report-first and that `RECURRING-DEEP-AUDIT-001` is the missing senior-engineer reviewer cadence. It does not pretend a deep reviewer is running.

## Dogfood Proof

The focused proof recreates the specific failure classes:

- connector `500 DB_003` with token-like values becomes degraded source health with redacted error text
- auth failure becomes down/non-retryable and redacted
- rate-limit failure gets bounded backoff and redaction
- connector snapshot covers all six operating connector groups
- runtime activation distinguishes blocked mutating checks from manual report-only jobs
- morning health reports deterministic scanner vs recurring deep audit correctly
- sprint doctrine is checked from live DB, not a doc substring

## Proof Commands

```bash
node --check lib/connector-uptime-monitor.js
node --check scripts/process-foundation-operating-reliability-check.mjs
npm run process:foundation-operating-reliability-check -- --json --no-api
npm run backlog:hygiene -- --json
npm run process:ship-check -- --card=PLAN-STATE-RECONCILE-001 --planApprovalRef=docs/process/approvals/PLAN-STATE-RECONCILE-001.json --closeoutKey=foundation-operating-reliability-v1
npm run process:fanout-check -- --card=PLAN-STATE-RECONCILE-001 --closeoutKey=foundation-operating-reliability-v1
npm run process:post-ship-fanout -- --card=PLAN-STATE-RECONCILE-001 --closeoutKey=foundation-operating-reliability-v1
npm run foundation:verify
npm run process:foundation-ship -- --card=PLAN-STATE-RECONCILE-001 --planApprovalRef=docs/process/approvals/PLAN-STATE-RECONCILE-001.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

## Known Limits

- This does not repair ClickUp, FUB, Slack, Google, Missive, or Supabase credentials.
- This does not run the recurring LLM/senior-engineer deep audit. That remains `RECURRING-DEEP-AUDIT-001`.
- This does not add Skool, myICOR, Loom, or YouTube extraction.
- This does not build hub UI or Sales/Ops features.
- This does not split the large monoliths beyond the thin reliability module added here.
- The Foundation Hub summary route stays unchanged; the reliability payload is in full diagnostics.

## Next

Stop at sprint review. Do not auto-open the next sprint.

Recommended next sprint: **Foundation Verification + Continued Cleanup Sprint**:

- `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001`
- `HUB-PERF-VERIFICATION-001`
- `MONOLITH-SPLIT-CONTINUE-001`
- `RECURRING-DEEP-AUDIT-001`

That sprint verifies the architecture gate is not theater, measures whether hub performance actually stayed fixed, continues shrinking monoliths, and builds the recurring deep-review cadence Steve expected.
