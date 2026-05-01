# Foundation Verify Health Repair V1

Card: `FOUNDATION-VERIFY-HEALTH-REPAIR-001`
Closeout key: `foundation-verify-health-repair-v1`

## Scope

Repair or classify only the three remaining `foundation:verify` failures after `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`:

- worker startup code trust
- `DAILY-EXEC-SUMMARY-001`
- `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`

## Not In Scope

- production auto-send enablement
- Gmail send
- ClickUp writeback
- gate-speed work
- broader Foundation refactors
- new product surfaces outside the failing verifier paths

## Implementation Plan

1. Restart or repair the Foundation worker if served-code trust is real drift.
2. If the daily summary failure is stale expectation, make the metric date-scoped to the selected summary date.
3. If the Agent Onboarding Feedback failure is stale/current-truth drift, update live source-contract/check wording without rewriting old approval snapshots.
4. Add a focused health repair process check and closeout proof.
5. Keep `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` accepted and `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` scoped.

## Acceptance Criteria

- `foundation:verify` returns fully green.
- `backlog:hygiene` is green.
- Dashboard and worker serve `HEAD`.
- Recent Work closeout is verified.
- Agent Feedback real-user repair remains accepted.
- Production auto-send remains disabled.
- Closeout owns only `FOUNDATION-VERIFY-HEALTH-REPAIR-001`.

## Verifier Plan

- `npm run process:foundation-verify-health-repair-check`
- `npm run process:daily-exec-summary-check`
- `npm run process:agent-onboarding-feedback-system-check`
- `npm run process:agent-feedback-real-user-submit-repair-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:ship-check -- --card=FOUNDATION-VERIFY-HEALTH-REPAIR-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-HEALTH-REPAIR-001.json --closeoutKey=foundation-verify-health-repair-v1`
- `npm run process:fanout-check -- --card=FOUNDATION-VERIFY-HEALTH-REPAIR-001 --closeoutKey=foundation-verify-health-repair-v1`

## Closeout Plan

Update live backlog, current plan/state, proof artifact, build log, package script, focused process check, and verifier coverage. The closeout owns only `FOUNDATION-VERIFY-HEALTH-REPAIR-001`; production auto-send remains a separate next card after this health repair is green.
