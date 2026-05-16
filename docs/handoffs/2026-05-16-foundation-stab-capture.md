# Foundation Stab Capture

Date: 2026-05-16
Card: FOUNDATION-STAB-CAPTURE-001
Closeout key: foundation-stab-capture-v1

## Why This Exists

Steve called out the real gap: the nightly code auditor is not enough. Foundation needs system health, scheduled-job staleness, doc/report bloat controls, and WIP boundaries so hidden failures do not rely on Steve noticing them.

This handoff captures the current proposal list into live backlog truth without opening the work.

## Created / Enriched As Proposal-Only

- `SYSTEM-HEALTH-NIGHTLY-AUDIT-001` P0: nightly health rollup for jobs, sources, connectors, atoms/extractions, endpoints, verifier freshness, and code audit status.
- `SCHEDULED-JOB-STALENESS-DASHBOARD-001` P0: first-glance red/yellow/green staleness surface for scheduled jobs.
- `PROCESS-WIP-PROTOCOL-001` P0: stop off-scope shared-file work from bypassing sprint ownership.
- `CONNECTOR-COMPLETION-SPRINT` P0: no-auth connector/source completion prep.
- `DOC-ARTIFACT-BLOAT-GUARD-001` P1: doc/handoff/report/process artifact size and growth budgets. This covers the earlier `DOC-ARTIFACT-BUDGET-001` wording.
- `NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001` P1: keep nightly audit reports diff-only, bounded, and readable.
- `HISTORICAL-VERIFIER-ACTIVE-SPRINT-DECOUPLE-001` P1: sweep historical proof scripts for active-sprint coupling.
- `BUILD-INTEL-EXTRACTION-IMPLEMENTATION` P1: auth-pending YouTube/Skool/myICOR/Loom extraction implementation.
- `E2E-STAGING-HARNESS-001` P1: Playwright staging/UI smoke tests.
- `PILLAR-4-SYSTEM-CAPABILITIES-001` P1: live system-capabilities inventory.
- `PILLAR-5-AGENT-INVENTORY-001` P1: live agent/job inventory with honest status.
- `REPLY-WATCHING-LOOP` P1: brief to reply to finding-resolution loop.
- `MARKETING-PIPELINE-REBUILD` P1: marketing content pipeline on the new Foundation.
- `DEPARTMENT-DIRECTORS-001` P1: department director briefs.
- `MASTER-DIRECTOR-001` P1: cross-department master director synthesis.
- `CANVA-CLIENT-MARKETING-VIDEO-LAB-REVIEW-001` P1: formal review of Canva client / Marketing Video Lab off-scope work.
- `FOUNDATION-IA-UI-RESTRUCTURE` P1: Steve-led Foundation IA/UI walkthrough and restructure.
- `MULTI-WORKER-DISPATCH-001` P2: future multi-worker dispatch protocol.
- `TELEGRAM-BOTS-001` P2: future tier-aware team Telegram bots.

## Existing / Dedupe

- `ACTION-ROUTER-001` already exists and is `done`. It was not recreated.
  ACTION-ROUTER-001 already exists in live backlog and was deduped instead of recreated.

## Not Opened

None of the proposal cards were added to Current Sprint. None were moved to `executing`. They require explicit Steve/Codex sprint approval before build.

## Senior-Engineer Read

Next Foundation build should prioritize `SYSTEM-HEALTH-NIGHTLY-AUDIT-001` and `SCHEDULED-JOB-STALENESS-DASHBOARD-001`. The audit miss was not just a code-auditor bug; it was a missing health surface. Code audit, job freshness, source flow, connector auth, endpoint budgets, and verifier freshness need one operator-visible health rollup.

After that, `PROCESS-WIP-PROTOCOL-001` and doc/report bloat guards prevent the same drift pattern from coming back through parallel hub work or giant unreadable artifacts.
