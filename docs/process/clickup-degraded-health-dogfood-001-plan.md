# CLICKUP-DEGRADED-HEALTH-DOGFOOD-001 Plan

## What

Dogfood ClickUp timeout, 500, and rate-limit failures so the verifier reports governed degraded source health quickly instead of hanging, leaking raw errors, or pretending the source is healthy.

## Why

The old failure pattern was trusting green checks and discovering source failures late. Steve needs ClickUp outages to show up as bounded source-health degradation with owner and repair guidance, not as a slow or confusing Foundation failure.

## Acceptance Criteria

- Synthetic ClickUp timeout, HTTP 500, and HTTP 429 cases are exercised through the real verifier module.
- Public output redacts token-like values and authorization data.
- Degraded ClickUp source health carries provider, source id, connector id, reason, checked time, and fail-soft state.
- The script still exits nonzero when required verification cannot be completed, while `foundation:verify` can classify a governed external outage.
- Dogfood proof uses actual function behavior, not substring-only proof.

## Definition Of Done

- Focused proof proves each synthetic external failure is fast, redacted, and degraded.
- The proof calls the actual function path in the ClickUp source verifier module with API-shaped timeout, 500, and 429 dogfood clients, and it rejects substring-only proof.
- `CLICKUP-DEGRADED-HEALTH-DOGFOOD-001` has a durable Plan Critic pass row with score at least 9.8 before build.
- Proof command `npm run process:clickup-verify-health-boundary-check -- --json` returns pass/revise-style checks and names this card.
- `foundation:verify` recognizes timeout/rate-limit/server-error output as governed external ClickUp degradation instead of an unknown failure.
- Current Sprint doctrine and Plan Critic rows are populated.
- Full ship gate passes before push.

## Details

Reuse existing code: `buildClickUpSourceHealth`, `buildUnavailableClickUpListSnapshot`, `buildClickUpSourceOutageDogfoodProof`, `source-outage-boundary`, `connector-uptime-monitor`, and the new ClickUp source verifier module. Reuse existing docs, existing scripts, live backlog, and Current Sprint truth: `clickup:verify`, `process:source-outage-boundary-check`, `process:foundation-verify-profile-check`, and `process:foundation-ship`.

Gate decision: full. This is verifier/source-health behavior used by Foundation shipping, so focused dogfood plus full ship gate are required. The useful operator behavior for Steve is plain degraded ClickUp source health with speed and quality, not a hanging or false-green gate.

## Risks

- Risk: the degraded path becomes a false green. Repair path: degraded output stays explicit and the direct `clickup:verify` process exits nonzero when required proof cannot be completed.
- Risk: raw vendor errors leak secrets. Repair path: dogfood includes secret-bearing fixtures and checks redaction.
- Risk: timeout handling slows proof. Repair path: synthetic failures do not wait on real network time and live timeouts stay bounded.

## Tests

- Static: `node --check lib/clickup-source-verifier.js scripts/clickup-source-verify.mjs scripts/process-clickup-verify-health-boundary-check.mjs scripts/foundation-verify.mjs`
- Focused: `npm run process:clickup-verify-health-boundary-check -- --json`
- Full: `npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-SLOW-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-SLOW-BUDGET-001.json --closeoutKey=foundation-clickup-verify-health-boundary-v1 --commitRef=HEAD`

## Not Next

- Do not hide ClickUp degradation.
- Do not send ClickUp writes.
- Do not add retries that sleep inside Foundation Hub requests.
- Do not solve every connector in this card.
