# VERIFICATION-RUNS-READONLY-SPLIT-001 Plan

Card: `VERIFICATION-RUNS-READONLY-SPLIT-001`
Sprint: `verification-runs-readonly-split-2026-05-16`
Closeout key: `verification-runs-readonly-split-v1`

## 1. Outcome

Make the scheduled `verification-runs` Foundation job safe to run unattended by splitting the old write-capable check posture into:

- a scheduled read-only proof path, and
- an explicit `--apply` lane for the historical closeout writeback behavior.

The system-health report should no longer carry `verification-runs` as an intentional watch row.

## 2. Why It Matters

The first system-health report proved the job surface can show hidden failures, but one row stayed yellow because `verification-runs` was scheduled while still classified as mutating. This is the exact old-system failure pattern Steve called out: a health/check path that can quietly write state cannot be trusted unattended.

## 3. Scope

- Update `scripts/process-verification-runs-check.mjs` so the default scheduled path is read-only and skips backlog/current-sprint writes.
- Keep the old closeout writeback available only behind explicit `--apply`.
- Change the `verification-runs` Foundation job posture from `mutating` to `read_only`.
- Change the mutation allowlist row from blocked to scheduled read-only.
- Update the process-hardening verifier expectations so synthetic mutating/unknown checks remain blocked while the real `verification-runs` job is allowed only because it is now read-only.
- Add a focused proof script that dogfoods the exact failure: running the default verification check must not alter watched live backlog/sprint fingerprints.

## 4. Not In Scope

- No auto-expiry of research cards, synthesized findings, or action routes.
- No Reply/Watching loop.
- No hub feature work.
- No new external source extraction.
- No broad verifier refactor.

## 5. Existing Work To Reuse

- `lib/verification-runs.js`
- `scripts/process-verification-runs-check.mjs`
- `lib/process-write-guard.js`
- `lib/foundation-jobs.js`
- `lib/foundation-job-mutation-allowlist.js`
- `lib/foundation-process-hardening-verifier.js`
- `lib/foundation-system-health.js`
- Existing `VERIFICATION-RUNS-001` closeout and Source Lifecycle UI.

## 6. Dogfood Proof

The focused proof must:

- snapshot watched backlog/current-sprint state before running `scripts/process-verification-runs-check.mjs --json=true`;
- run the default check without any write flags;
- prove the output says `mode: read_only` and `writesSkipped: true`;
- prove the watched live-state fingerprint did not change;
- prove the scheduled job runtime is no longer blocked;
- prove the allowlist classifies `verification-runs` as `allowed_scheduled_read_only`.

If the default check writes anything, this card fails.

## 7. Proof Commands

```bash
npm run process:verification-runs-check -- --json=true
npm run process:verification-runs-readonly-split-check -- --json
npm run process:system-health-nightly-audit-check -- --json --write-report
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFICATION-RUNS-READONLY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFICATION-RUNS-READONLY-SPLIT-001.json --closeoutKey=verification-runs-readonly-split-v1 --commitRef=HEAD
```

## 8. Repair Path

If the default verification check mutates live state, leave the card in Building Now and restore the write guard boundary before rerunning proof. If the scheduler still reports `verification-runs` as blocked, do not weaken the system-health classification; fix the job posture or allowlist row until the read-only proof is genuinely schedulable.
