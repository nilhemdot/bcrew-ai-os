# VERIFY-FAILURE-REPORTER-001 Plan

## What
Add a failure-only and JSON summary output mode to `foundation:verify` so an operator can rerun a failing verifier and see only failed checks plus a compact summary instead of scanning the full pass stream.

## Why
The latest Foundation sprint proved the ship gate is real, but the failure surface is still too noisy. When one verifier check fails, Steve and future builders should see the blocker, detail, failed count, and rerun command quickly. The operator value for Steve's real workflow is faster diagnosis without weakening the verifier or hiding pass/fail truth. This unlocks speed and quality for every build review because the useful thing is obvious: identify the failing check, fix it, and rerun the right gate. This is Foundation reliability work, not a new hub feature.

## Acceptance Criteria
- `npm run foundation:verify -- --failures-only` suppresses passing check lines and prints failed checks plus the summary.
- `npm run foundation:verify -- --json-summary` emits a machine-readable summary with totals, failed checks, profile metadata when enabled, and exit status behavior unchanged.
- The default `foundation:verify` output remains unchanged for normal full proof runs.
- Dogfood proof runs the reporter against synthetic pass/fail check data and proves the failure-only mode includes the failing check while omitting passing check lines.
- Dogfood proof proves JSON summary carries the failing check and total/pass/fail counts.
- The reporter is reusable library behavior, not inline-only script formatting.

## Definition Of Done
- A focused process check validates approval, Plan Critic pass, live backlog/current sprint truth, reporter behavior, and package script registration.
- `foundation:verify` still exits nonzero on failed checks and zero when all checks pass.
- The card moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with closeout proof.
- Full Foundation ship gate passes before commit.

## Details
Reuse existing code, existing docs, existing scripts, live Backlog, Current Sprint, `scripts/foundation-verify.mjs`, and the existing `ensure/checks` array behavior. Add a small `lib/foundation-verify-reporter.js` module that formats check output and JSON summaries from actual check objects. Wire `scripts/foundation-verify.mjs` to parse `--failures-only` and `--json-summary` while leaving default output alone.

The focused proof should call the real reporter function path with synthetic checks: at least one passing check and one failing check. It must prove default mode includes both, failure-only mode includes only the failure, and JSON summary includes the failure object plus totals. This explicitly rejects substring-only proof because the test must inspect the reporter return values and parsed JSON.

Gate decision tree: explicitly compare static, focused, and full verification by blast radius. Static proof is insufficient because the canonical verifier output path changes. Focused proof is required through `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFY-FAILURE-REPORTER-001 --json`; full proof follows with `npm run foundation:verify` and `npm run process:foundation-ship`. The focused proof must stay fast, under 2 minutes, so it is usable by default instead of becoming another heavy gate.

## Risks
The main risk is accidentally hiding failures or changing the canonical verifier output. Repair path is fail closed: if default output changes unexpectedly or failures disappear from either mode, revert the reporter wiring and keep the old verifier output until the library proof is corrected.

## Tests
- `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFY-FAILURE-REPORTER-001 --json`
- `npm run foundation:verify -- --failures-only`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=VERIFY-FAILURE-REPORTER-001 --planApprovalRef=docs/process/approvals/VERIFY-FAILURE-REPORTER-001.json --closeoutKey=foundation-ship-gate-tightening-v1 --commitRef=HEAD`

## Not Next
Do not reduce verifier coverage, remove pass output from default mode, change source-health behavior, build hub features, touch Marketing Video Lab work, or add autonomous repair behavior.
