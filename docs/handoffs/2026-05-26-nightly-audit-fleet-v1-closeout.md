# Nightly Audit Fleet V1 Closeout

Date: 2026-05-26
Card: `NIGHTLY-AUDIT-FLEET-001`
Closeout key: `nightly-audit-fleet-v1`

## What Closed

The specialist audit fleet is now part of the overnight/morning operating loop.

- `lib/nightly-audit-fleet.js` owns the deterministic report-only registry, schedule constants, rollup evaluator, and dogfood proof.
- `lib/foundation-jobs.js` schedules `nightly-audit-fleet` daily at 03:05 America/Toronto.
- `lib/foundation-job-mutation-allowlist.js` allowlists the job as `read_only`.
- `lib/foundation-system-health.js` adds an `auditFleet` rollup before the 05:15 morning report.
- `scripts/process-system-health-nightly-audit-check.mjs` includes the audit fleet in JSON output and focused proof.

## Guardrails

- No auto-fix.
- No auto-created backlog cards.
- No external writes.
- No source-system writes.
- No browser/profile/provider mutation.
- No unbudgeted LLM/deep-review lane.
- Markdown report writes still require the explicit report writer path.

## Proof

```bash
npm run process:nightly-audit-fleet-check -- --json
npm run foundation:job -- --job=nightly-audit-fleet --actor=codex-nightly-audit-fleet-proof --force
npm run process:foundation-job-mutation-allowlist-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
```

## Next

Use the morning System Health `auditFleet` section to review the lanes. Any real finding stays report-only until a separate scoped repair card is approved and proven.
