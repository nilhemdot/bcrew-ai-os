# KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001 Closeout

Closeout key: `kpi-health-dynamic-year-contract-v1`
Sprint: `kpi-health-dynamic-year-contract-2026-05-16`
Card: `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`

## What Changed

- Added a KPI health period contract in `lib/kpi-health.js`.
- Replaced live KPI RPC date/year params with runtime-generated params from the selected period.
- Added optional `KPI_HEALTH_PERIOD_YEAR` override for controlled audits without code edits.
- Added period metadata to KPI health snapshots and the KPI health CLI summary.
- Added `scripts/process-kpi-health-dynamic-year-contract-check.mjs` as the focused read-only proof.
- Added package script `process:kpi-health-dynamic-year-contract-check`.
- Added thin root verifier coverage for the card.

## Behavior Proven

- The default KPI period derives from the runtime calendar year.
- KPI RPCs keep the same names and param keys, but date/year values are generated from one period contract.
- A synthetic future runtime produces future-year KPI params without code edits.
- The old frozen prior-year shape is rejected by the real evaluator.
- The code-quality hardcoded-year detector no longer flags live KPI health code.
- KPI health snapshots expose `periodContract` metadata so operators can see which period was selected.

## Proof

- `node --check lib/kpi-health.js scripts/process-kpi-health-dynamic-year-contract-check.mjs scripts/kpi-supabase-health.mjs scripts/foundation-verify.mjs`
- `npm run process:kpi-health-dynamic-year-contract-check -- --json`
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary` passed `388/388` before closeout.

## Known Limits

- This does not change KPI source data, Supabase schema, KPI dashboard behavior, or Sales/Ops hub behavior.
- This does not add KPI writes or a KPI period UI.
- This does not run paid-source auth, source extraction, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.
- The root verifier remains a large monolith; this card added only thin delegated coverage.

## Review Next

Continue Foundation-only cleanup. Good next slices are `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`, `FOUNDATION-FRONTEND-DOM-BUDGET-001`, another verifier proof-domain split, or a static cache-policy card if the measured `no-store` posture becomes the active frontend performance blocker.
