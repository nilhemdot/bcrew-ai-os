# KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001 Plan

Status: approved for build
Card: `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`
Sprint: `kpi-health-dynamic-year-contract-2026-05-16`
Closeout key: `kpi-health-dynamic-year-contract-v1`

## What

Replace hardcoded KPI health RPC year windows with a runtime period contract so KPI health probes derive `target_year`, start dates, and end dates from one source-backed selector instead of fixed 2026 literals.

V1 is intentionally narrow: the KPI health module gets a calendar-year period contract, RPC parameter builders, and dogfood proof that a synthetic 2027 runtime generates 2027 windows without editing code.

## Why

The nightly audit caught live-looking KPI health truth pinned to 2026. That is a source-truth drift risk: the system can look healthy while probing stale year windows after a calendar rollover.

Operator value: Steve should not have to remember that KPI health windows need a code edit every January. Foundation should carry the year rule once and let KPI, Sales, Ops, and future hub surfaces read current periods from the same runtime contract.

## Acceptance Criteria

- `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001` has live backlog, Current Sprint, approved plan, and Plan Critic pass truth before build.
- KPI RPC definitions do not embed fixed `target_year: 2026`, `2026-01-01`, or `2026-12-31` live runtime params.
- A focused helper builds KPI health period windows from a runtime date and optional configured year.
- Real KPI health snapshots expose the selected period contract metadata.
- Dogfood proof recreates the audit failure: a frozen/hardcoded 2026 RPC param shape fails the new evaluator, while a synthetic 2027 runtime produces 2027 params without code edits.
- The focused process script is read-only and report-only: no DB writes, no backlog mutation, no sprint mutation, no source mutation, and no provider writes.
- The dogfood rejects substring-only proof. A source search for old 2026 literals can support the regression check, but the card is not accepted unless the actual KPI period function path rejects the frozen 2026 shape and passes a synthetic 2027 runtime.
- Root `foundation:verify` has thin ID-named coverage delegating behavior to the focused KPI health proof path.

## Definition Of Done

- Existing code, existing docs, existing scripts, live backlog, and Current Sprint truth are reused. Existing code reused: `lib/kpi-health.js`, `scripts/kpi-supabase-health.mjs`, `scripts/process-kpi-health-api-cache-check.mjs`, `lib/code-quality-nightly-audit.js`, `scripts/foundation-verify.mjs`, the approval-integrity validator, Plan Critic ledger, live backlog, and Current Sprint overlay. Existing docs reused: `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the existing KPI health API cache plan.
- New focused proof lives in `scripts/process-kpi-health-dynamic-year-contract-check.mjs`; behavior stays in `lib/kpi-health.js`.
- `npm run process:kpi-health-dynamic-year-contract-check -- --json` passes and proves the 2027 rollover dogfood.
- `npm run process:code-quality-nightly-audit-check -- --json` no longer flags live KPI health code for the `hardcoded-kpi-health-year` detector.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001.json --closeoutKey=kpi-health-dynamic-year-contract-v1 --commitRef=HEAD` passes before push.

## Details

Add a `KPI_HEALTH_DYNAMIC_YEAR_CONTRACT` V1 inside the KPI health module. The default selector derives the calendar year from `now`, with an optional `KPI_HEALTH_PERIOD_YEAR` override for controlled audits. The contract returns a year, `periodStart`, `periodEnd`, source/mode metadata, and one function that converts RPC definitions into runtime params.

The old `EXPECTED_KPI_RPCS` array should keep stable RPC names, read rules, dashboard surfaces, and expected columns, but not live hardcoded year-window params. A generated accessor returns runtime RPC definitions with params for the selected period. Existing callers that need names continue to use the same exported symbol, while probe execution uses generated runtime params.

Root invariant: the current KPI period is selected once and then applied consistently to every KPI health RPC. The proof must call real helper behavior; substring-only checks such as "2026 string absent" are rejected as acceptance proof. The dogfood must show both sides: fixed 2026 params are rejected, and a 2027 runtime creates 2027 params.

Gate decision tree: static syntax checks for changed JS, focused proof for dynamic KPI period behavior, code-quality audit proof for detector regression, and full `process:foundation-ship` before push because the card touches source-health code, package scripts, verifier coverage, Current Sprint truth, and Recent Work.

Large-file split posture: `scripts/foundation-verify.mjs` is still over 5,000 lines, so there is no new responsibility added to that monolith. The verifier change is limited to a thin ID-named import/check that delegates to `lib/kpi-health.js` and the focused script. If more verifier behavior is needed, it belongs in a follow-up verifier split card, not in this sprint.

## Risks

- Risk: changing RPC params breaks live KPI reads.
  - Repair path: preserve the same RPC names and param keys; only replace date/year values with generated values.
- Risk: a runtime date rule hides a business-specific year selection need.
  - Repair path: support explicit `KPI_HEALTH_PERIOD_YEAR` override and expose selected mode/source metadata in the health snapshot.
- Risk: this turns into KPI dashboard or Sales Hub feature work.
  - Repair path: no UI feature, no KPI writes, no schema changes, and no hub behavior changes in V1.
- Risk: the verifier monolith grows again.
  - Repair path: keep verifier changes to thin delegated card coverage and continue the existing verifier split queue.

## Tests

Run in order:

```bash
node --check lib/kpi-health.js scripts/process-kpi-health-dynamic-year-contract-check.mjs scripts/kpi-supabase-health.mjs scripts/foundation-verify.mjs
npm run process:kpi-health-dynamic-year-contract-check -- --json
npm run process:code-quality-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001.json --closeoutKey=kpi-health-dynamic-year-contract-v1 --commitRef=HEAD
```

## Not Next

Do not build KPI dashboard features, Sales/Ops/Marketing hub features, Marketing Video Lab wiring, Canva asset-library features, new KPI writes, schema redesign, paid-source auth, Build Intel extraction, Meeting Vault Phase B, Drive permission mutation, or broad Foundation DB/verifier rewrites in this sprint.
