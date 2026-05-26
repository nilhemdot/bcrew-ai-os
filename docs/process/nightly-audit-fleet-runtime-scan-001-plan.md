# NIGHTLY-AUDIT-FLEET-RUNTIME-SCAN-001 Plan

## What

Upgrade the already-scheduled audit fleet from registry-only proof to a deterministic runtime scan slice.

V1 scans runtime code for the exact failure classes Steve called out overnight:

- hardcoded model names outside route/capability ownership
- schedule and budget literals outside runtime registries
- source/source-family count literals
- static UI copy that pretends to be live status
- process/write-boundary drift, including process checks with unguarded write paths
- YouTube comment regression against the operator-excluded comments decision
- extractor parity violations from the God Mode matrix

## Why

The first audit-fleet card made the lanes visible and scheduled, but a lane existing is not the same thing as an auditor doing work. This slice makes the hardcoded truth/runtime config lane execute a real deterministic scan while keeping the fleet report-only.

## Acceptance Criteria

- Add a reusable runtime-scan module with lane packets and findings.
- Wire the base `process:nightly-audit-fleet-check` proof to run the runtime scan, not only validate the registry.
- Keep the scan read-only, report-only, no-auto-fix, no-auto-backlog, no browser, no provider, and no external writes.
- Dogfood bad fixtures for unowned model literals, static UI truth, unguarded process writes, and YouTube comment regression.
- Keep deeper code-quality, synthesis/director, source coverage, and UI/brand lanes as explicit packet-only statuses until their own focused scanners exist.
- Expose active findings as report output, not as automatic mutation.

## Proof

```bash
node --check lib/nightly-audit-fleet-runtime-scan.js scripts/process-nightly-audit-fleet-runtime-scan-check.mjs scripts/process-nightly-audit-fleet-check.mjs
npm run process:nightly-audit-fleet-runtime-scan-check -- --json
npm run process:nightly-audit-fleet-check -- --json
npm run process:system-health-nightly-audit-check -- --json
```

## Not Next

- Do not auto-fix any finding.
- Do not auto-create backlog cards from findings.
- Do not run LLM/deep-review lanes without router and budget approval.
- Do not browse, extract, log into sources, submit forms, download files, purchase, mutate credentials, or write external systems.
