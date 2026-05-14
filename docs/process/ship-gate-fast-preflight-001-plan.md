# SHIP-GATE-FAST-PREFLIGHT-001 Plan

## Goal

Add a fast Foundation ship preflight that catches stale manual freshness blockers before `process:foundation-ship` reaches the expensive full verifier.

## Existing Work Check

- `scripts/process-foundation-ship.mjs` is the canonical ship wrapper.
- `lib/llm-auth-audit-proof.js` already knows how to classify fresh `LLM-AUTH-AUDIT-001` route/auth truth.
- `scripts/process-llm-auth-audit-check.mjs` already proves the approved refresh path.
- This card extends the existing ship wrapper rather than creating a parallel ship process.

## Implementation

1. Add a focused preflight module for ship freshness checks.
2. Add a `process:foundation-ship-preflight` script.
3. Wire `scripts/process-foundation-ship.mjs` to run the preflight before runtime restart, fanout, or full verifier.
4. Keep the preflight read-only. It may recommend approved refresh commands, but it must not run them automatically.

## Dogfood Proof

Simulate stale or missing `LLM-AUTH-AUDIT-001` freshness and prove the preflight fails in seconds with the exact approved repair command:

`npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof`

## Definition Of Done

- Preflight catches stale LLM auth audit freshness before full verifier.
- Preflight prints an actionable repair command.
- `process:foundation-ship` runs the preflight by default.
- A bypass, if present, requires an explicit reason.
- Focused proof and full Foundation ship gate pass.

## Not Next

- Do not weaken `foundation:verify`.
- Do not auto-run refresh jobs.
- Do not change provider credentials.
- Do not add hub/product features.
- Do not broaden into all possible source-health checks in v1.

## What

Build the narrow V1 card `SHIP-GATE-FAST-PREFLIGHT-001`: a fast, read-only process preflight that runs before the expensive Foundation ship gate steps. The operator behavior is simple: Steve should learn in seconds when a known manual freshness dependency is stale, instead of waiting for `foundation:verify` to fail late.

## Why

The last ship looked done on the sprint board, then spent extra time in verification because stale LLM auth audit truth was found late. This improves speed and quality without weakening proof. The useful thing for Steve is an early, actionable blocker with the approved repair command.

## Acceptance Criteria

- `SHIP-GATE-FAST-PREFLIGHT-001` adds `npm run process:foundation-ship-preflight`.
- The preflight is read-only and does not run repair jobs.
- The preflight checks real DB/job/function behavior through `buildLlmAuthAuditStatus`, not substring-only proof.
- The dogfood proof simulates missing or stale LLM auth audit freshness and rejects it.
- The failure output includes `npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof`.
- `scripts/process-foundation-ship.mjs` runs the preflight before runtime restart, fanout, and full `foundation:verify`.

## Definition Of Done

- Focused proof command passes: `npm run process:foundation-ship-preflight -- --json --dogfood`.
- Full proof command passes: `npm run process:foundation-ship -- --card=<shipping-card> --planApprovalRef=<approval> --closeoutKey=<closeout> --commitRef=HEAD`.
- No substring-only proof is accepted; the dogfood proof must exercise the actual function path and fail closed on stale fixtures.

## Details

Reuse existing code: `scripts/process-foundation-ship.mjs`, `lib/llm-auth-audit-proof.js`, `scripts/process-llm-auth-audit-check.mjs`, `getLlmRuntimeSnapshot`, and `getFoundationJobRunSnapshot`. Reuse existing docs and live backlog/current sprint truth from this sprint. Gate decision: full gate for the final ship because `process:foundation-ship` and verifier-adjacent process code are full-risk; focused proof is allowed before the final full gate.

## Risks

- Risk: the preflight becomes another heavy gate. Bound it to under 10 seconds for normal runs.
- Risk: the preflight silently repairs freshness. Repair path is fail closed with an operator command only.
- Risk: it weakens the verifier. It must not change `foundation:verify` semantics.

## Tests

- Static: `node --check lib/foundation-ship-preflight.js scripts/process-foundation-ship-preflight.mjs scripts/process-foundation-ship.mjs`.
- Focused: `npm run process:foundation-ship-preflight -- --json --dogfood`.
- Full: `npm run foundation:verify` and `npm run process:foundation-ship -- --card=<shipping-card> --planApprovalRef=<approval> --closeoutKey=<closeout> --commitRef=HEAD`.
