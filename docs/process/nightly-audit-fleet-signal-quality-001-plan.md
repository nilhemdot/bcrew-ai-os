# NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001 Plan

## What

Sharpen the audit fleet runtime scan so it finds real hardcoded/runtime drift without paging obvious evidence-only files and dogfood fixtures as active issues.

V1 signal quality changes:

- reuse the shared model literal classifier instead of a broad ad hoc model-name regex
- reuse the process-write classifier and report-output classifier instead of a substring-only write guard
- classify backlog seed, closeout registry, verifier coverage, and audit proof fixture literals as owned signals
- keep unowned exact model literals, static UI live truth, real source count literals, unguarded process writes, and comment regressions active
- keep the scan report-only, read-only, no-auto-fix, no-auto-backlog, no browser, no provider, and no external writes

## Why

Steve asked for auditors that find hardcoded bullshit, not noisy reports that make the system look busy. The runtime scan must separate current operational risk from historical proof text so the morning review can route real findings into focused cards.

## Acceptance Criteria

- Runtime scan imports and uses the existing shared model literal classifier.
- Runtime scan imports and uses the existing process-write/report-output classifiers.
- Dogfood proves route-owned model literals, historical seed literals, and scanner fixture literals are owned signals, while unowned model literals, unguarded report writers, and real YouTube comment regressions stay active.
- Real scan no longer emits active findings from seed/closeout/verifier/proof fixture paths.
- Active finding count drops below the noisy first-pass level, with owned signals greater than active findings.
- Base audit-fleet proof still runs the runtime scan.
- No finding is auto-fixed, auto-carded, or written anywhere outside report output.

## Proof

```bash
node --check lib/nightly-audit-fleet-runtime-scan.js scripts/process-nightly-audit-fleet-signal-quality-check.mjs scripts/process-nightly-audit-fleet-runtime-scan-check.mjs scripts/process-nightly-audit-fleet-check.mjs
npm run process:nightly-audit-fleet-signal-quality-check -- --json
npm run process:nightly-audit-fleet-runtime-scan-check -- --json
npm run process:nightly-audit-fleet-check -- --json
npm run process:system-health-nightly-audit-check -- --json
```

## Not Next

- Do not auto-fix any finding.
- Do not auto-create backlog cards from findings.
- Do not hide real runtime model, process-write, static UI, source-count, or comment-regression risks.
- Do not run LLM/deep-review lanes without router and budget approval.
- Do not browse, extract, log into sources, submit forms, download files, purchase, mutate credentials, or write external systems.
