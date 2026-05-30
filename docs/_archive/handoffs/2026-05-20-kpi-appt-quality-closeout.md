# KPI-APPT-QUALITY-001 Closeout - KPI Appointment Quality Audit

Date: 2026-05-20
Closeout key: `kpi-appt-quality-v1`
Card: `KPI-APPT-QUALITY-001`
Next card: `KPI-LEAD-VALIDATION-001`

## What Changed

This closes the KPI appointment quality slice as an aggregate-only Foundation proof.

- Added `lib/kpi-appointment-quality-audit.js` as the governed read-only aggregate audit for KPI appointment outcomes and likely appointment stacking.
- Added `scripts/process-kpi-appt-quality-check.mjs` as the focused proof and close-card writer.
- Added the process plan, approval file, package script, verifier coverage, and closeout registry wiring.
- Promoted the useful April 26 KPI appointment-quality audit into live Foundation card truth without copying person-level data into tracked artifacts.

## What It Does

The audit reads live KPI/Supabase `users` and `appointments` and reports aggregate appointment hygiene signals:

- active appointment rows
- current-year rows used for stack review
- missing appointment outcomes
- non-standard outcome labels
- known outcome labels used against the wrong appointment-type context
- likely same-person same-type appointment stack clusters
- appointment rows inside likely stack clusters
- buy/sell exception context

Latest aggregate live proof during closeout showed:

- active appointments: `3595`
- current-year stack-review appointments: `952`
- missing outcomes: `1010`
- non-standard outcomes: `53`
- wrong outcome/type context: `149`
- likely same-type stack clusters: `70`
- appointment rows inside likely stacks: `159`
- buy/sell exception-context people: `29`

## Why It Matters

Sales leadership needs reliable data-quality signals before coaching, manager review, or apply workflows. This card makes appointment quality a repeatable source-backed audit instead of a one-off script or archived report.

## Where It Lives

- `lib/kpi-appointment-quality-audit.js`
- `scripts/process-kpi-appt-quality-check.mjs`
- `package.json` script `process:kpi-appt-quality-check`
- `docs/process/kpi-appt-quality-001-plan.md`
- `docs/process/approvals/KPI-APPT-QUALITY-001.json`
- `docs/_archive/handoffs/2026-05-20-kpi-appt-quality-closeout.md`
- `lib/foundation-build-closeout-process-gate-records.js`
- `lib/foundation-verify-coverage-card-ids.js`

## Proof Commands

```bash
node --check lib/kpi-appointment-quality-audit.js scripts/process-kpi-appt-quality-check.mjs
npm run process:kpi-appt-quality-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=KPI-APPT-QUALITY-001 --closeoutKey=kpi-appt-quality-v1
npm run process:foundation-ship -- --card=KPI-APPT-QUALITY-001 --planApprovalRef=docs/process/approvals/KPI-APPT-QUALITY-001.json --closeoutKey=kpi-appt-quality-v1 --commitRef=HEAD
```

## Known Limits

- This is aggregate-only tracked proof. Person-level samples are not written into repo artifacts.
- This does not mutate KPI, FUB, or any source system.
- This does not build coaching prompts, manager assignment workflows, or apply controls.
- This does not implement lead-source/fake-lead validation. That remains `KPI-LEAD-VALIDATION-001`.

## Review Next

Continue `KPI-LEAD-VALIDATION-001` for fake-lead and lead-source validation problems, keeping it read-only and separate from appointment-quality signals.
