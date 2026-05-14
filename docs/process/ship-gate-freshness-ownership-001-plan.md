# SHIP-GATE-FRESHNESS-OWNERSHIP-001 Plan

## Goal

Make ship-gate freshness ownership explicit so stale manual jobs are visible before they become late verifier failures.

## Existing Work Check

- Foundation jobs already define runtime mode and cadence in `lib/foundation-jobs.js`.
- The LLM auth audit job is manual by design.
- Connector uptime and Runtime Health already expose source health, but ship freshness blockers are not yet summarized as preflight ownership.

## Implementation

1. Add freshness ownership rows for ship-critical freshness checks.
2. Mark each row as manual, scheduled, or source-health degraded.
3. Expose the rows in the ship preflight output.
4. Keep the output actionable with owner, status, max age, and repair command where allowed.

## Dogfood Proof

Simulate stale manual freshness and prove the preflight reports ownership plus the approved repair command instead of producing a mystery late verifier failure.

## Definition Of Done

- Ship preflight exposes freshness ownership.
- Manual checks stay manual and do not auto-mutate.
- Scheduled/source-health-degraded checks are classified separately.
- Full Foundation ship gate passes.

## Not Next

- Do not create autonomous repair.
- Do not schedule manual LLM auth audit without Steve approval.
- Do not hide freshness failures as warnings.

## What

Build the narrow V1 card `SHIP-GATE-FRESHNESS-OWNERSHIP-001`: expose freshness ownership rows in the ship preflight so manual, scheduled, and source-health-degraded checks are not mystery late failures.

## Why

Steve needs useful operator behavior: when a ship is blocked, the system should say who owns the freshness, whether it is manual or scheduled, max age, and the exact next command. This increases speed and quality without creating autonomous repair.

## Acceptance Criteria

- `SHIP-GATE-FRESHNESS-OWNERSHIP-001` adds ownership rows to the preflight output.
- Manual freshness rows stay blocking when stale.
- Scheduled and degraded source-health rows are classified separately.
- Stale manual LLM auth audit shows the approved command and does not run it.
- Reject substring proof: any substring-only proof fails unless actual function behavior and dogfood fixtures also pass.
- The focused proof returns pass/revise style detail with score-like healthy/blocked status for this card.

## Definition Of Done

- Focused proof command passes: `npm run process:foundation-ship-preflight -- --json --dogfood`.
- Preflight output includes owner, posture, status, max age, and repair command where applicable.
- Full ship gate passes.

## Details

Reuse existing code: `lib/foundation-jobs.js`, `lib/llm-auth-audit-proof.js`, `getFoundationJobRunSnapshot`, and the new preflight from `SHIP-GATE-FAST-PREFLIGHT-001`. Reuse live backlog/current sprint truth for card ownership. Gate decision: focused process proof plus full ship gate because this feeds canonical ship behavior.

Also reuse existing docs in `docs/rebuild/current-state.md`, existing scripts in `scripts/process-llm-auth-audit-check.mjs`, live backlog truth for `SHIP-GATE-FRESHNESS-OWNERSHIP-001`, and Current Sprint truth for this sprint. This is a fast bounded preflight surface, not another heavy reviewer.

## Risks

- Risk: ownership rows become warnings that hide blockers. Repair path is to fail closed for stale manual blockers.
- Risk: this schedules manual work. It must not change job runtime mode.
- Risk: output gets noisy. V1 only covers ship-critical freshness.

## Tests

- Static: `node --check lib/foundation-ship-preflight.js scripts/process-foundation-ship-preflight.mjs`.
- Focused: `npm run process:foundation-ship-preflight -- --json --dogfood`.
- Full: `npm run foundation:verify` and final `process:foundation-ship`.
