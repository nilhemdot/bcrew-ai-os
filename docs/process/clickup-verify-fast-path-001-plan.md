# CLICKUP-VERIFY-FAST-PATH-001 Plan

## What

Build a narrow V1 fast path for `clickup:verify` so `health:clickup:verify` no longer consumes about half of the full Foundation ship gate. The card keeps the same ClickUp source-health intent, but bounds task pagination, request timeout, and list verification concurrency.

## Why

The `foundation-ship-gate-speed-payload-cleanup-v1` profile showed `health:clickup:verify` taking roughly 45 seconds inside a roughly 92 second `foundation:verify` run. Steve needs the Foundation gate to stay trustworthy without becoming slow enough that people work around it.

## Acceptance Criteria

- `clickup:verify` uses shared ClickUp client behavior instead of a local unbounded fetch helper.
- The verifier reads only the bounded data it needs for source-health proof.
- The three configured ClickUp lists are checked concurrently rather than sequentially.
- The default task-page budget is bounded and operator-overridable by environment variable.
- The output still includes the existing human-readable list summary and pass/fail summary.
- No ClickUp writes are introduced.

## Definition Of Done

- The focused process proof shows the ClickUp verifier dogfood fast path uses a bounded number of calls.
- The focused proof calls the actual function path in the ClickUp source verifier module, uses a dogfood fake client, and rejects substring-only proof.
- The live or no-network-safe proof shows the script is bounded by timeout/page settings.
- Current Sprint doctrine and Plan Critic rows are populated.
- `foundation:verify --profile=true` still runs real checks and does not skip ClickUp health proof.

## Details

Reuse existing code: `lib/clickup.js`, `scripts/clickup-source-verify.mjs`, `scripts/foundation-verify.mjs`, `scripts/process-foundation-verify-profile-check.mjs`, `lib/connector-uptime-monitor.js`, and the Foundation current sprint helpers. Reuse existing docs: `docs/handoffs/2026-05-14-foundation-operating-reliability-two-sprint-scope.md` and `docs/handoffs/2026-05-14-foundation-ship-gate-speed-payload-cleanup-closeout.md`. Reuse existing scripts: `clickup:verify`, `process:foundation-verify-profile-check`, `backlog:hygiene`, and `process:foundation-ship`. Reuse live backlog and Current Sprint truth for stage and doctrine.

Gate decision: full. The implementation touches verifier-adjacent source health and process scripts, so the final ship uses `process:foundation-ship`. Focused proof is still required before full ship through a dedicated ClickUp verifier health-boundary check that calls the real function path, dogfoods a weak/unbounded client, and rejects substring-only evidence.

Implementation should extract ClickUp source verification into a small module instead of adding more logic to `scripts/foundation-verify.mjs`. Any touch to `scripts/foundation-verify.mjs` is thin timing-budget/reporting glue only.

## Risks

- Risk: a faster path weakens source-health proof. Repair path: fail closed, reopen this card, and keep the old required field/status assertions in the module.
- Risk: a vendor timeout still hangs the ship gate. Repair path: keep request timeouts and page budgets bounded by defaults and dogfood timeout behavior.
- Risk: this becomes ClickUp feature work. Repair path: V1 is read-only verification only; no ClickUp writes, hub UI, or listing/agent workflow changes.

## Tests

- Static: `node --check lib/clickup-source-verifier.js scripts/clickup-source-verify.mjs scripts/process-clickup-verify-health-boundary-check.mjs scripts/foundation-verify.mjs`
- Focused: `npm run process:clickup-verify-health-boundary-check -- --json`
- Full: `npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-SLOW-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-SLOW-BUDGET-001.json --closeoutKey=foundation-clickup-verify-health-boundary-v1 --commitRef=HEAD`

## Not Next

- Do not skip `clickup:verify`.
- Do not weaken required ClickUp field/status checks.
- Do not write to ClickUp.
- Do not build Sales/Ops Hub features.
- Do not broaden into paid-source auth, Build Intel, or broad monolith refactors.
