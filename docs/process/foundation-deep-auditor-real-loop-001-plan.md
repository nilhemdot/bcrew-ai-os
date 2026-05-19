# FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001 Plan

## What

Turn the existing Nightly Deep Audit from a packet-only scanner with strong wording into an honest deep-auditor loop.

The nightly job must either run bounded senior review through an approved route, or explicitly report degraded packet-only mode. It must never present packet generation as a completed deep front/back code audit.

## Why

Steve expected a real deep auditor: changed frontend/backend files, high-risk Foundation surfaces, verifier/check paths, write boundaries, endpoint/payload risks, privacy/source boundaries, and actionable findings.

The repo had useful deterministic scanning, but the LLM/senior-review path was hardcoded as `executedThisRun: false`. That naming gap made the system sound stronger than it was. This card closes that gap and makes the morning report say the truth.

## Acceptance Criteria

- The nightly audit has a real approved-route senior review execution path through the LLM router.
- The scheduled nightly job requests bounded deep review while staying report-only/no-autofix/no-autobacklog.
- Packet-only mode is explicitly degraded and cannot be reported as a completed deep review.
- JSON and markdown reports expose whether deep review executed, degraded, failed closed, or was route-blocked.
- P0/P1 senior findings require owner, next action, and proposed repair card route.
- Dogfood proof rejects packet-only false-green and unrouted P0/P1 findings.
- No autonomous code fixes, provider key changes, Drive permission changes, source-system writes, or backlog mutation happen inside the audit.

## Definition Of Done

- Focused proof passes: `process:foundation-deep-auditor-real-loop-check`.
- Existing nightly audit proof still passes.
- System Health remains green.
- Repeated-failure gate remains healthy.
- Backlog hygiene remains healthy.
- `foundation:verify` passes.
- `process:foundation-ship` passes with this card and closeout key.

## Details

Implementation stays in the existing audit module and a focused process check:

- `lib/nightly-deep-audit-upgrade.js`
- `lib/nightly-deep-audit-constants.js`
- `lib/foundation-jobs.js`
- `scripts/process-nightly-deep-audit-upgrade-check.mjs`
- `scripts/process-foundation-deep-auditor-real-loop-check.mjs`

The execution path uses `callLlm()` only through the policy-aware router. If a route is not runnable or the call fails, the audit fails closed into a degraded report state. It does not fail by pretending a human-equivalent review happened.

P0/P1 findings from senior review become proposed repair routes only. This card does not auto-create backlog rows; the lessons/audit-to-backlog routing layer owns promotion.

## Risks

- Risk: provider spend runs blindly.
  - Guard: scheduled job uses bounded changed/high-risk packets, approved route only, report-only posture, and no direct credential mutation.
- Risk: report still sounds green when deep review did not run.
  - Guard: packet-only mode has degraded status in report JSON and markdown.
- Risk: LLM findings become noise.
  - Guard: P0/P1 findings need owner, next action, and proposed repair card.
- Risk: this becomes autonomous coding.
  - Guard: no auto-fixes, no writeback, no backlog mutation.

## Tests

```bash
node --check lib/nightly-deep-audit-constants.js lib/nightly-deep-audit-upgrade.js scripts/process-nightly-deep-audit-upgrade-check.mjs scripts/process-foundation-deep-auditor-real-loop-check.mjs lib/foundation-jobs.js
npm run process:foundation-deep-auditor-real-loop-check -- --json
npm run process:nightly-deep-audit-upgrade-check -- --json --skipEndpointFetch --no-runLlmReview
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001.json --closeoutKey=foundation-deep-auditor-real-loop-v1 --commitRef=HEAD
```

## Not Next

- Do not run broad feature work in this card.
- Do not auto-fix code.
- Do not auto-create backlog cards.
- Do not mutate credentials, provider config, Drive permissions, or source-system data.
- Do not treat packet-only mode as healthy deep review.
- Do not do the one-time merge audit in this card; that is `FOUNDATION-DEEP-MERGE-AUDIT-001`.
