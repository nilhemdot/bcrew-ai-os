# KPI-LEAD-VALIDATION-001 Closeout - KPI Lead-Source Validation Audit

Date: 2026-05-20
Closeout key: `kpi-lead-validation-v1`
Card: `KPI-LEAD-VALIDATION-001`
Next card: `INTEL-THREAD-CONTEXT-001`

## What Changed

This closes the KPI/FUB lead-source validation slice as an aggregate-only Foundation proof.

- Added `lib/kpi-lead-validation-audit.js` as the governed read-only aggregate audit for active lead-stage source validation.
- Added `scripts/process-kpi-lead-validation-check.mjs` as the focused proof and close-card writer.
- Added the process plan, approval file, package script, verifier coverage, and closeout registry wiring.
- Promoted the useful April 26 KPI/FUB lead-source audit into live Foundation card truth without copying person-level data into tracked artifacts.

## What It Does

The audit reads live KPI/Supabase `users`, `stages`, and active lead-stage `persons`, joins governed AIOS FUB lead-source rules, and reports aggregate lead-source validation signals:

- active lead-stage person rows
- invalid/generic lead-source rows
- `Import` rows
- `<unspecified>` / `unspecified` rows
- generic `Sphere` rows
- blank/missing source rows
- source labels not present in governed FUB source rules
- flagged governed-rule rows
- invalid/unknown source-group rows
- unclaimed pond lead-stage rows

Latest aggregate live proof during closeout showed:

- active lead-stage people: `16740`
- invalid lead-source rows: `6729`
- Import rows: `4606`
- unspecified rows: `1884`
- Sphere rows: `218`
- not-in-governed-rules rows: `18`
- unclaimed pond lead-stage rows: `5398`

## Why It Matters

Sales leadership cannot trust lead-count or source-attribution reporting if imported contacts, unspecified rows, generic Sphere/SOI, support-network contacts, vendors, or unclaimed pond rows are treated as validated final lead attribution. This card makes fake/non-lead and lead-source validation a repeatable source-backed audit instead of a one-off script or archived report.

## Where It Lives

- `lib/kpi-lead-validation-audit.js`
- `scripts/process-kpi-lead-validation-check.mjs`
- `package.json` script `process:kpi-lead-validation-check`
- `docs/process/kpi-lead-validation-001-plan.md`
- `docs/process/approvals/KPI-LEAD-VALIDATION-001.json`
- `docs/_archive/handoffs/2026-05-20-kpi-lead-validation-closeout.md`
- `lib/foundation-build-closeout-process-gate-records.js`
- `lib/foundation-verify-coverage-card-ids.js`

## Proof Commands

```bash
node --check lib/kpi-lead-validation-audit.js scripts/process-kpi-lead-validation-check.mjs
npm run process:kpi-lead-validation-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=KPI-LEAD-VALIDATION-001 --closeoutKey=kpi-lead-validation-v1
npm run process:foundation-ship -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --commitRef=HEAD
```

## Known Limits

- This is aggregate-only tracked proof. Person-level samples are not written into repo artifacts.
- This does not mutate KPI, FUB, or any source system.
- This does not build FUB cleanup/apply workflows, coaching prompts, manager assignment workflows, or correction queues.
- This does not implement appointment quality or Shopping List discipline. Those remain separate cards.

## Review Next

Continue `INTEL-THREAD-CONTEXT-001` for full thread context evidence proof.
