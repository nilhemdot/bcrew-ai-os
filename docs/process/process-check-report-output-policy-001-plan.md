# PROCESS-CHECK-REPORT-OUTPUT-POLICY-001 Plan

## What

Add a shared classifier, focused proof, and cleanup migration for process-check scripts that write repo report artifacts.

## Why

The code-quality audit was correctly looking for report-output/write-boundary drift, but the detector was too broad. It counted many process checks that already use the shared `assertProcessCheckWriteAllowed` or `--write-report` posture, so Steve's hardcoded/write-boundary audit lane produced a noisy P1 pile instead of a focused repair queue.

## Acceptance Criteria

- Guarded report writers using `isProcessReportWriteRequested`, `PROCESS_CHECK_WRITE_FLAGS.writeReport`, or the shared process-check write guard do not produce report-output policy findings.
- Default-write scripts that rely on `--no-write`, unguarded report writers, and legacy apply-gated report writers without the shared guard fail the synthetic dogfood fixture.
- The real process-check script surface has zero remaining report-output policy risk rows.
- The existing Code Quality Nightly Audit consumes the shared classifier instead of owning a separate regex.
- A focused proof scans the real process-check script surface and proves all file-writing process checks are behind `--write-report` or the shared process-check write guard.
- No live extraction, paid/auth source access, provider probes, or auto-fixes run for this card.

## Proof

```bash
node --check lib/process-check-report-output-policy.js scripts/process-check-report-output-policy-check.mjs lib/code-quality-nightly-audit.js
npm run process:process-check-report-output-policy-check -- --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not convert markdown reports into operational truth.
- Do not weaken process-check read-only/default-fail-closed behavior.
- Do not change report content semantics beyond explicit output-write posture.
- Do not run Skool, MyICOR, private/auth, form, download, or purchase workflows while Steve is asleep.
