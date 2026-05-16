# FOUNDATION-CLEANUP-ARC-CLOSEOUT-001 Plan

Card: `FOUNDATION-CLEANUP-ARC-CLOSEOUT-001`
Sprint: `foundation-audit-reliability-2026-05-16`
Closeout key: `foundation-cleanup-arc-closeout-v1`

## What

Write one concise cleanup-arc handoff summarizing the Foundation safety and monolith cleanup work from 2026-05-13 through 2026-05-16, including what is actually done, what remains risky, and what Steve should trust or not trust next.

V1 is a bounded closeout card, not another heavy audit. The handoff must stay concise and point to existing evidence instead of copying it.

## Why

The last several days shipped many hardening and split sprints. Without one summary, the system knowledge lives across scattered closeouts and chat memory. That makes Steve ask the same question repeatedly: "Are we on track, and what is still broken?"

Operator value: tomorrow morning starts with one readable checkpoint instead of hunting through 40 sprint artifacts. The useful real workflow is Steve reading one page to decide the next sprint, improving review speed and decision quality.

## Acceptance Criteria

- A handoff exists at `docs/handoffs/2026-05-16-foundation-cleanup-arc-closeout.md`.
- The handoff is concise and separates:
  - fixed runtime safety issues,
  - completed monolith splits,
  - current file-size status,
  - current audit/scheduler status,
  - remaining Foundation cleanup,
  - explicit not-next boundaries.
- The handoff does not copy long chat transcripts or duplicate every sprint detail.
- The handoff references existing closeout docs instead of restating all evidence.
- The card does not mutate code behavior.

## Definition Of Done

- `FOUNDATION-CLEANUP-ARC-CLOSEOUT-001` closes under `foundation-cleanup-arc-closeout-v1`.
- This plan and `docs/process/approvals/FOUNDATION-CLEANUP-ARC-CLOSEOUT-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- The cleanup-arc handoff exists and is cited in current state/current plan if needed.
- `foundation:verify` and full ship gate pass before push.

## Details

Existing code to reuse:

- current repo files for line counts,
- git history for commit arc,
- live backlog and Current Sprint DB truth,
- existing closeout registry proof paths.

Existing docs to reuse:

- hardening closeouts from 2026-05-13,
- server route split closeouts from 2026-05-15,
- Foundation DB split summaries,
- verifier split closeouts from 2026-05-15 and 2026-05-16,
- nightly audit reports and P0 triage.

Existing code/scripts to reuse:

- `wc -l` / `rg --files` for current file-size status,
- `git log` for sprint arc commits,
- `npm run foundation:verify -- --json-summary`,
- `npm run process:foundation-ship`.

Gate decision tree: static syntax proof first, focused proof through `npm run process:foundation-cleanup-arc-closeout-check -- --json`, then `foundation:verify`, then full ship gate because the blast radius is repo-truth closeout history used by future Foundation planning.

Focused proof is fast, targeted under 2 minutes, read-only by default, and checks actual artifact files and live backlog/current sprint state. It rejects substring-only proof and fails closed if the closeout overclaims Foundation completion.

## Risks

- Risk: summary becomes another bloated doc.
  - Response: keep it under a clear operator-summary budget and queue doc-budget enforcement in `DOC-ARTIFACT-BUDGET-001`.
- Risk: summary overstates "Foundation done."
  - Response: explicitly name remaining cleanup and source/hub work.
- Risk: summary treats stale green checks as real.
  - Response: wait for audit scheduler fix/backfill/run proof before writing final audit status.

Rollback / repair path: if the closeout overclaims, grows too large, or misses a major risk, keep the card open, revise the doc, and rerun focused proof. Do not close the card just because a markdown file exists.

## Tests

```bash
node --check scripts/process-foundation-cleanup-arc-closeout-check.mjs
npm run process:foundation-cleanup-arc-closeout-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-CLEANUP-ARC-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CLEANUP-ARC-CLOSEOUT-001.json --closeoutKey=foundation-cleanup-arc-closeout-v1 --commitRef=HEAD
```

Dogfood proof checks the closeout does not claim all Foundation cleanup is done while verifier, source-of-truth latency, connector completion, or doc-budget work remains.

## Not Next

- Do not write a giant reconstructed transcript.
- Do not create new feature work.
- Do not mutate DB schema, source extraction, hub routes, Canva assets, or Marketing Video Lab wiring.
