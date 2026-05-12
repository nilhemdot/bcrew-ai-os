# VERIFY-GATE-TIERING-001 Plan

Status: done for v1 under `verify-gate-tiering-v1`
Card: `VERIFY-GATE-TIERING-001`
Date: 2026-05-12

## What

Add proportional verification for Foundation work so small, bounded changes do not require the full Foundation ship gate every time.

The gate has three tiers:

1. `static` — syntax/config validation for changed JS/JSON files.
2. `focused` — focused verification for docs, Current Sprint command truth, process proof scripts, Foundation/Ops surface changes, and hook policy.
3. `full` — full Foundation ship gate for server routes, security, database/schema/backlog seed, readiness gates, canonical verifier, package/dependency, extraction, intelligence, source, and runtime substrate changes.

## Why

The rule is still "nothing manual stays trusted." The correction is that not every trusted change needs the same cost. Running `foundation:verify` after every small wording or sprint-overlay change slows the build and encourages bypasses. The system needs automatic proof, but the proof should match the blast radius.

## Acceptance Criteria

- Changed protected Foundation files are classified as `static`, `focused`, or `full`.
- Pre-push still fails closed when protected Foundation paths change without proof.
- Non-full protected changes can pass pre-push with a recorded focused proof.
- Full-risk paths still require `process:foundation-ship` or an explicit bypass with card/reason.
- Current Sprint lists this card before `REBUILD-PLAN-RECONCILE-001`.
- Current plan/state describe proportional verification as the first active step.

## Definition Of Done

- `lib/process-verify-gate-tiering.js` owns file classification and synthetic proof cases.
- `scripts/process-verify-gate-tiering-check.mjs` validates docs, Current Sprint wiring, hook integration, synthetic classification, static checks, and backlog hygiene.
- `lib/process-git-hooks.js` accepts focused proof records for non-full changes and keeps the full gate for full-risk files.
- `package.json` exposes `process:verify-gate-tiering-check`.
- Live Current Sprint and backlog truth include `VERIFY-GATE-TIERING-001`.

## Risks

- If the focused tier is too broad, risky behavior changes could skip the full gate.
- If the full tier is too broad, the team will keep bypassing because every small change is expensive.
- A focused proof is not a product-behavior sweep. It only proves the proportional gate itself and the bounded files it covers.

## Proof Commands

```bash
npm run process:verify-gate-tiering-check
npm run backlog:hygiene -- --json
```

For the commit that records the proof:

```bash
npm run process:verify-gate-tiering-check -- --recordProof=true
```

## Not Next

- Do not weaken the full gate for server, security, database/schema, canonical verifier, readiness, extraction, intelligence, source, or runtime substrate work.
- Do not treat focused verification as a replacement for `VERIFIER-BEHAVIOR-SWEEP-001`.
- Do not build Strategy Hub, Plan Critic, Avatar import, or security matrix behavior in this card.
