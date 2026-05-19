# FOUNDATION-DEEP-MERGE-AUDIT-001 Plan

## Goal

Run a one-time senior audit of the May 19 Foundation merge using the upgraded deep-auditor loop. This is not feature work. It proves the large merge was reviewed for architecture, privacy, write-boundary, false-green, endpoint, file-size, frontend, backend, verifier, and extraction risks before the next extraction sprint expands.

## Current Truth

- Main is synced after the May 19 Foundation closeout and `FOUNDATION-DEEP-AUDITOR-REAL-LOOP-001`.
- System Health and repeated-failure gates are green.
- The old “nightly deep audit” name was misleading before the previous card: packet-only output could be confused with senior review.
- The upgraded audit can now either execute bounded senior review through an approved route or clearly degrade.
- The next missing proof is the actual one-time deep merge audit over the large 23-day / May 19 change set.

## Scope

- Use the last pre-April-26 audit baseline as the default merge baseline.
- Count commits, changed files, and changed code files in the merge window.
- Run the deterministic audit with endpoint metrics.
- Run the bounded senior-review route, not packet-only mode.
- Review high-risk backend, frontend, verifier, DB, source/extraction, auth/privacy, endpoint, and process-check surfaces.
- Write a durable audit artifact under `docs/audits/`.
- Route every P0/P1 finding to live backlog truth.
- Keep the audit report-only: no code auto-fixes and no automatic backlog mutation.

## Details

The focused proof script is `scripts/process-foundation-deep-merge-audit-check.mjs`.

The audit artifacts are:

- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/audits/2026-05-19-foundation-deep-merge-audit.json`

The script validates:

- approval integrity
- live backlog card state
- broad merge scope
- executed deep senior review
- endpoint metrics captured
- required high-risk review targets included
- P0/P1 findings routed to existing live backlog cards
- report-only/no-autofix boundary

## Acceptance

- `npm run process:foundation-deep-merge-audit-check -- --apply --runLlmReview --json` produces the audit artifacts and executes the senior review route.
- `npm run process:foundation-deep-merge-audit-check -- --json` validates the existing audit artifacts without spending another provider call.
- The audit JSON shows executed senior review, not degraded packet-only mode.
- P0/P1 findings have live backlog routes or the card cannot close.
- System Health remains raw green.
- Repeated-failure gate remains healthy.
- `foundation:verify` passes.
- `process:foundation-ship` passes.

## Not Next

- Do not implement audit findings inside this card.
- Do not start old-system harvest, GOD-mode extraction, Loom, Skool, Mycro, Drive worker, or value work here.
- Do not auto-fix code from the audit.
- Do not auto-create backlog cards without explicit scoped carding.
- Do not run external sends, Drive permission mutation, credential mutation, or paid/provider/browser-auth work.
