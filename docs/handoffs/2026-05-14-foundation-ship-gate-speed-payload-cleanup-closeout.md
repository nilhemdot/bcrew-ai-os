# Foundation Ship Gate Speed + Payload Cleanup Closeout - 2026-05-14

Closeout key: `foundation-ship-gate-speed-payload-cleanup-v1`

Cards:
- `SHIP-GATE-FAST-PREFLIGHT-001`
- `FOUNDATION-VERIFY-TIMING-001`
- `FOUNDATION-VERIFY-MODULE-SPLIT-002`
- `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001`
- `SHIP-GATE-FRESHNESS-OWNERSHIP-001`

## What Changed

This sprint made the Foundation ship path faster to diagnose and less wasteful:

- Added `process:foundation-ship-preflight`, a read-only preflight that checks manual LLM auth audit freshness before the expensive ship gate.
- Wired the preflight into `process:foundation-ship` before runtime restart, ship-check, fanout, post-ship fanout, and final `foundation:verify`.
- Added verifier timing profiling with a machine-readable `FOUNDATION_VERIFY_PROFILE` line.
- Split the LLM auth audit verifier check into `lib/foundation-verify-llm-auth-audit.js` with its own focused dogfood proof.
- Compacted heavy `sourceLifecycle` and `sharedCommunicationSynthesis` full diagnostics payload sections.
- Tightened full diagnostics payload budgets from about 5.5 MB to 4.2 MB for diagnostics and 4.5 MB for performance warning.

## Dogfood Proof

The preflight dogfood recreates:

- fresh LLM auth audit truth, which passes
- stale LLM auth audit truth, which fails early
- missing LLM auth audit job truth, which fails early
- missing required probe truth, which fails early

Blocked preflight output includes:

- owner: `Foundation Process`
- posture: `manual`
- repair command: `npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof`

The verifier module dogfood accepts an approved healthy LLM auth audit closeout and rejects stale runtime or missing closeout proof.

The payload proof measured `/api/foundation-hub?view=full` against the earlier baseline:

- Baseline: `8.113s / 4,824,662B`
- Current focused proof: about `7.7s / 3,507,207B`
- Reduction: about `1,317,455B`, or `27.3% smaller`

The verifier profile proof runs the real verifier and does not skip checks. The latest measured slow sections were ClickUp verification, full Foundation Hub fetch, Ops Hub fetch, Sheets verification, and source-of-truth fetch.

## Proof Commands

- `node --check lib/foundation-ship-preflight.js scripts/process-foundation-ship-preflight.mjs scripts/process-foundation-ship.mjs scripts/foundation-verify.mjs lib/foundation-verify-llm-auth-audit.js scripts/process-foundation-verify-llm-auth-audit-check.mjs scripts/process-foundation-verify-profile-check.mjs scripts/process-foundation-hub-full-payload-reduce-check.mjs server.js`
- `npm run process:foundation-ship-preflight -- --json --dogfood`
- `npm run process:foundation-ship-preflight -- --json`
- `npm run process:foundation-verify-profile-check -- --json`
- `npm run process:foundation-verify-llm-auth-audit-check -- --json`
- `npm run process:foundation-hub-full-payload-reduce-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:ship-check -- --card=SHIP-GATE-FRESHNESS-OWNERSHIP-001 --planApprovalRef=docs/process/approvals/SHIP-GATE-FRESHNESS-OWNERSHIP-001.json --closeoutKey=foundation-ship-gate-speed-payload-cleanup-v1`
- `npm run process:fanout-check -- --card=SHIP-GATE-FRESHNESS-OWNERSHIP-001 --closeoutKey=foundation-ship-gate-speed-payload-cleanup-v1`
- `npm run process:post-ship-fanout -- --card=SHIP-GATE-FRESHNESS-OWNERSHIP-001 --closeoutKey=foundation-ship-gate-speed-payload-cleanup-v1 --commitRef=HEAD`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SHIP-GATE-FRESHNESS-OWNERSHIP-001 --planApprovalRef=docs/process/approvals/SHIP-GATE-FRESHNESS-OWNERSHIP-001.json --closeoutKey=foundation-ship-gate-speed-payload-cleanup-v1 --commitRef=HEAD`

## Known Limits

- This does not weaken or skip `foundation:verify`.
- This does not auto-run LLM auth audit repair. The freshness row remains manual.
- Full diagnostics is smaller, but still heavy at about 3.5 MB and 7-8 seconds locally.
- ClickUp verification is now measured as the largest verifier drag; it is not fixed by this sprint.
- No hub feature work, Build Intel extraction, paid-source auth, autonomous dev, `MEETING-VAULT-ACL-001` Phase B, or Drive permissions mutation shipped here.

## Recommended Next

Target the measured verifier drag next. The profile points to ClickUp health-script latency first, then full diagnostics and Ops Hub fetches. Continue alternating cleanup sprints with theme sprints so the monolith and performance pile shrinks instead of widening Foundation again.
