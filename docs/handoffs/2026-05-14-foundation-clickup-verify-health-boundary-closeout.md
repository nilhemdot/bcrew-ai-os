# Foundation ClickUp Verify Health Boundary Closeout - 2026-05-14

Closeout key: `foundation-clickup-verify-health-boundary-v1`

Sprint: `foundation-clickup-verify-health-boundary-2026-05-14`

## Cards

- `CLICKUP-VERIFY-FAST-PATH-001`
- `CLICKUP-VERIFY-PAYLOAD-CACHE-001`
- `CLICKUP-DEGRADED-HEALTH-DOGFOOD-001`
- `FOUNDATION-VERIFY-SLOW-BUDGET-001`

## What Changed

- Extracted ClickUp source verification into `lib/clickup-source-verifier.js`.
- Replaced the local unbounded ClickUp verifier script with a bounded wrapper over the shared verifier module.
- Defaulted `clickup:verify` to one task page per list, 8 second request timeout, and concurrent list checks.
- Added per-run list snapshot reuse so duplicate list verification does not repeat vendor reads inside one verifier invocation.
- Added timeout, 500, and 429 dogfood cases that report degraded ClickUp source health with redacted public output.
- Added `FOUNDATION_VERIFY_PROFILE` slow-section budget metadata and over-budget rows with owner/next action.

## Measured Result

Before this sprint, `foundation:verify --profile=true` showed:

- `health:clickup:verify`: about 45 seconds
- full profiled verifier: about 92 seconds

After this sprint:

- `health:clickup:verify`: 2.733 seconds in the final profile proof
- full profiled verifier: 49.427 seconds in the final profile proof
- slow-section budget: 20 seconds
- over-budget sections: none

The slowest remaining sections are now full Foundation Hub diagnostics at about 7.7 seconds and Ops Hub at about 6.9 seconds.

## Proof

- `node --check lib/clickup-source-verifier.js lib/foundation-verify-profile-budget.js scripts/clickup-source-verify.mjs scripts/process-clickup-verify-health-boundary-check.mjs scripts/foundation-verify.mjs scripts/process-foundation-verify-profile-check.mjs`
- `npm run process:clickup-verify-health-boundary-check -- --json`
- `npm run process:foundation-verify-profile-check -- --json`

## Not Changed

- No ClickUp writes.
- No verifier checks skipped or weakened.
- No hub product work.
- No Build Intel or paid-source auth work.
- No broad verifier or Foundation DB refactor.

## Next

Continue with the already named cleanup cadence. The next measured cleanup target is no longer ClickUp verifier drag; it is full Foundation Hub diagnostics and Ops Hub response time, followed by continued monolith splits.
