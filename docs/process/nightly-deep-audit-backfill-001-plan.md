# NIGHTLY-DEEP-AUDIT-BACKFILL-001 Plan

Card: `NIGHTLY-DEEP-AUDIT-BACKFILL-001`
Sprint: `foundation-audit-reliability-2026-05-16`
Closeout key: `nightly-deep-audit-backfill-v1`

## What

Run the existing `nightly-deep-audit` path now and produce a fresh dated markdown and JSON report in `docs/handoffs/`, using the Foundation job runner so the job ledger records the run.

## Why

Only the 2026-05-14 nightly audit report exists. That means the system has had no fresh morning code-health signal for May 15 or May 16 even though the job was scheduled. After the scheduler due fix, we need a real backfill so Steve has current evidence instead of stale assumptions.

Operator value: tomorrow's review starts from a current report and a job-ledger run, not from "the auditor is configured." The useful real workflow is Steve opening one morning health report that reflects the actual repo and app state, improving review speed and code quality.

## Acceptance Criteria

- `nightly-deep-audit` runs through the governed job path or an equivalent job-ledger-recorded path.
- A fresh `docs/handoffs/nightly-deep-audit-{date}.md` and `.json` are written.
- The job run snapshot shows `nightly-deep-audit` latest run as successful or produces an explicit blocker if the job cannot run.
- The report remains report-only: no auto-fixes, no auto-backlog creation, no autonomous dev, no provider spend by default.
- Backlog lane counts do not change during the audit run.
- Any new P0s are summarized in the closeout and routed to proposal-only follow-up, not silently fixed inside this card.

## Definition Of Done

- `NIGHTLY-DEEP-AUDIT-BACKFILL-001` closes under `nightly-deep-audit-backfill-v1`.
- This plan and `docs/process/approvals/NIGHTLY-DEEP-AUDIT-BACKFILL-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- Fresh audit report artifacts exist and are named in the closeout.
- `foundation:verify` and full Foundation ship gate pass before push.

## Details

Root cause / root invariant: audit reliability is proven by a real function path/process path and job-ledger round trip, not by a static report file from a previous day.

Existing code to reuse:

- `scripts/run-foundation-job.mjs`,
- `scripts/process-nightly-deep-audit-upgrade-check.mjs`,
- `lib/nightly-deep-audit-upgrade.js`,
- `lib/foundation-runtime-job-store.js`,
- `lib/foundation-jobs.js`.

Existing docs to reuse:

- `docs/process/nightly-deep-audit-upgrade-001-plan.md`,
- `docs/handoffs/nightly-deep-audit-2026-05-14.md`,
- `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`.

Existing scripts to reuse:

- `npm run foundation:job -- --job=nightly-deep-audit`,
- `npm run process:nightly-deep-audit-upgrade-check -- --json`,
- `npm run foundation:verify -- --json-summary`.

Gate decision tree: static syntax checks first, focused audit/job path proof second through `npm run process:nightly-deep-audit-upgrade-check -- --json --endpointTimeoutMs=8000`, then `foundation:verify`, then full ship gate because the blast radius includes committed audit artifacts, job-ledger evidence, and process truth.

Focused proof is proportional and fast enough to use by default. It calls the real process path, writes only report artifacts by design, keeps backlog lane counts unchanged, and rejects substring-only proof.

## Risks

- Risk: endpoint probes fail because the app is down.
  - Response: restart dashboard/worker through LaunchAgent if needed, then rerun once. If still down, record a blocker rather than writing a fake success.
- Risk: report grows too large and becomes doc bloat.
  - Response: keep the report diff/action oriented and route doc-budget enforcement to `DOC-ARTIFACT-BUDGET-001`.
- Risk: audit findings tempt off-scope fixes.
  - Response: this card writes report evidence only. New work becomes proposal-only backlog.

## Tests

```bash
npm run foundation:job -- --job=nightly-deep-audit --actor=codex-nightly-audit-backfill
npm run process:nightly-deep-audit-upgrade-check -- --json --endpointTimeoutMs=8000
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=NIGHTLY-DEEP-AUDIT-BACKFILL-001 --planApprovalRef=docs/process/approvals/NIGHTLY-DEEP-AUDIT-BACKFILL-001.json --closeoutKey=nightly-deep-audit-backfill-v1 --commitRef=HEAD
```

Dogfood proof is the actual backfill: the repo must contain a new dated report and the job ledger must show that the audit path ran instead of only existing as a definition. If the job path cannot produce that round-trip, the card fails closed.

## Not Next

- Do not fix every audit finding inside this card.
- Do not run live LLM deep review unless explicitly configured later.
- Do not auto-create backlog rows from findings.
- Do not touch hub feature work, Canva writes, paid-source auth, or Build Intel extraction.
