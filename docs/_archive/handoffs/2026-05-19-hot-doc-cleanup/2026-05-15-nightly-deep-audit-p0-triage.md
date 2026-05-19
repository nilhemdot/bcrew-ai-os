# Nightly Deep Audit P0 Triage - 2026-05-15

Card: `NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001`
Closeout key: `nightly-deep-audit-p0-triage-v1`
Source audit: `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.md`
Source JSON: `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/nightly-deep-audit-2026-05-14.json`

## Verdict

Server Monolith Closeout remains the right next build sprint.

The audit baseline did not surface a more urgent unhandled runtime-safety blocker than the current cleanup plan. Several P0 findings were already addressed after the baseline audit ran, and the remaining true gaps now have live backlog cards.

## Important Post-Audit State

- `/api/foundation-hub` default route was verified fast after the baseline: earlier 70s+ behavior is no longer current default-route truth.
- `/api/source-of-truth` route budget work is already done under `SOURCE-OF-TRUTH-PERF-BUDGET-001`.
- Plan Critic architectural rules and dogfood are already done.
- Initial frontend, verifier, and foundation-db monolith split slices are already done, but the verifier and DB files remain dangerous by size.
- The 2026-05-14 audit is useful evidence, not current gospel.

## P0 Triage

| Audit Group | Count | Triage | Backlog Routing |
| --- | ---: | --- | --- |
| `process-check-side-effect-risk` | 36 | Real remaining sweep after the apply-boundary fix. | Added `PROCESS-CHECK-READONLY-MODE-001`. |
| `hardcoded-current-sprint-truth` | 8 | Partly addressed by `CURRENT-SPRINT-DYNAMIC-TRUTH-001`; remaining sweep still needed. | Added `LIVE-TRUTH-VERIFY-DECOUPLE-001`. |
| `focused-check-active-sprint-id-assumption` | 1 | Real process drag risk. | Added `SPRINT-CHECK-HISTORICAL-MODE-001`. |
| `foundation-db-schema-seed-store-monolith` | 1 | Covered by existing DB seed and DB split work; avoid duplicate card. | Enriched `DB-SEED-001`; linked to `FOUNDATION-DB-MONOLITH-SPLIT-002`. |
| `foundation-hub-aggregate-overfetch` | 1 | Default hub route addressed; full diagnostics also bounded. | Covered by done cards `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`, `FOUNDATION-PERFORMANCE-001`, and `FOUNDATION-FULL-DIAGNOSTICS-PERF-001`. |
| `foundation-verify-monolith` | 1 | Real remaining cleanup. | Covered by `VERIFIER-MONOLITH-SPLIT-CONTINUE-002`. |
| `scheduled-foundation-job-mutation-risk` | 1 | Real posture/allowlist gap. | Added `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`. |
| `kpi-health-request-path-timeout-risk` | 1 | Real source-health/runtime budget gap. | Added `KPI-HEALTH-API-CACHE-001`. |

## P1/P2 Follow-Up Triage

| Audit Group | Triage | Backlog Routing |
| --- | --- | --- |
| source lifecycle exact counts | Real false-failure risk. | Added `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`. |
| active vs historical verifier mixing | Real verifier maintainability risk. | Added `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`. |
| endpoint budget trend | Real monitoring gap. | Added `FOUNDATION-ENDPOINT-BUDGETS-001`. |
| Foundation UI live-looking summary copy | Real source-truth/UI drift risk. | Added `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`. |
| KPI hardcoded year windows | Real date-rollover risk. | Added `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`. |
| large frontend assets | Real recurring budget gap. | Added `FOUNDATION-FRONTEND-ASSET-BUDGET-001`. |
| heavy DOM rebuild signals | Useful but lower urgency. | Added `FOUNDATION-FRONTEND-DOM-BUDGET-001`. |
| current-state renderer monolith | Already addressed by frontend split work. | Covered by done `FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001`. |
| CSS monolith | Missing from Claude's server-focused list. | Already added `STYLESHEET-MONOLITH-SPLIT-001`. |
| closeout registry monolith | Still over 5K. | Already added `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001`. |

## New Cards Added By This Triage

- `PROCESS-CHECK-READONLY-MODE-001`
- `SPRINT-CHECK-HISTORICAL-MODE-001`
- `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`
- `KPI-HEALTH-API-CACHE-001`
- `FOUNDATION-ENDPOINT-BUDGETS-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`
- `FOUNDATION-FRONTEND-ASSET-BUDGET-001`
- `FOUNDATION-FRONTEND-DOM-BUDGET-001`

## Existing Cards Enriched Or Confirmed

- `DB-SEED-001` enriched with the schema/seed/store audit finding.
- `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` remains the verifier split follow-up.
- `FOUNDATION-DB-MONOLITH-SPLIT-002` remains the foundation DB split follow-up.
- `STYLESHEET-MONOLITH-SPLIT-001` remains queued.
- `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001` remains queued.

## Next Sprint Order

1. Server Monolith Closeout Sprint:
   - `AUTH-ROUTES-SPLIT-001`
   - `HUB-READ-ROUTES-SPLIT-001`
   - `STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001`
   - `FOUNDATION-WRITE-ROUTES-SPLIT-001`
   - `AGENT-FEEDBACK-ROUTES-SPLIT-001`
2. Verifier split continuation.
3. Foundation DB split continuation.
4. CSS and closeout-registry cleanup.
5. Runtime/source-health cards from this triage, unless one becomes the active blocker.

## Not Next

- Do not reopen already-shipped cards just because the baseline audit mentions the old risk.
- Do not implement all 76 findings as one mega-card.
- Do not pull hub features, Build Intel extraction, paid-source auth, or Marketing Video Lab wiring into this cleanup sprint.
