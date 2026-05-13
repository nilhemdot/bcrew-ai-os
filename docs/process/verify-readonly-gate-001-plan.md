# VERIFY-READONLY-GATE-001 Plan

## What

Make `npm run foundation:verify` a read-only live-state verifier. It must fail closed when live Foundation state is broken instead of repairing, resetting, seeding, closing, or advancing state before reporting green.

## Why

The deep audit found verifier paths that can call reset/repair behavior before passing. That makes every green check less trustworthy. Foundation cannot move forward while the canonical verifier can mutate the truth it claims to verify.

## Acceptance Criteria

- `foundation:verify` live path does not call `resetFoundationDb()`, seed backlog rows, repair live tables, or advance sprint state.
- DB reset/reliability proof is moved behind an explicit fixture/repair path or a non-default command boundary.
- A dogfood proof recreates or simulates broken live state and proves `foundation:verify` fails closed instead of repair-then-pass.
- The proof calls actual verifier behavior or exported verifier helpers, not substring-only checks.
- `VERIFY-READONLY-GATE-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Read-only verifier posture is enforced in code.
- A focused process proof demonstrates the old failure mode is blocked.
- Foundation verifier coverage names this card and the read-only invariant.
- The sprint item closes only after dogfood proof, backlog hygiene, and ship gates pass.

## Details

Existing code to reuse: `scripts/foundation-verify.mjs`, `lib/foundation-db.js`, existing verifier behavior helpers, `lib/process-git-hooks.js`, and `lib/process-verify-gate-tiering.js`. Existing docs to reuse: `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`, `docs/handoffs/2026-05-13-foundation-runtime-safety-hardening-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. Existing scripts to reuse: `npm run foundation:verify`, a new focused `process:runtime-safety-hardening-check`, `backlog:hygiene`, and `process:foundation-ship`.

Dogfood invariant: if live state is bad, the verifier reports bad live state. It does not make the state good and then report green.

The dogfood proof must exercise black-box verifier behavior through the actual function/process path and a DB-style round-trip against isolated or synthetic broken state. No substring-only proof is acceptable.

Gate decision: static syntax checks for changed JS, focused `process:runtime-safety-hardening-check` proof for the dogfood read-only invariant, then full `process:foundation-ship` because the blast radius touches the canonical Foundation verifier and DB safety posture. Operator value: Steve can trust that a green verifier means the live system was healthy, not quietly repaired mid-check. Speed bound: the focused dogfood proof should target under 2 minutes so it becomes a default sprint gate instead of a bypassed ritual.

## Risks

- Some existing verifier reliability tests may intentionally use reset behavior. Repair path: isolate those tests under fixture-only or explicit repair command names.
- Removing repair fallback can expose existing broken live state. Repair path: fail closed, keep the card in Building Now, and fix the broken state explicitly rather than hiding it.
- A substring-only proof would repeat the audit failure. Repair path: proof must exercise an actual verifier behavior path.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=VERIFY-READONLY-GATE-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=VERIFY-READONLY-GATE-001 --planApprovalRef=docs/process/approvals/VERIFY-READONLY-GATE-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not rewrite the whole verifier.
- Do not make verifier green by repairing live state.
- Do not broaden into hub performance, Build Intel extraction, agents, or frontend route work.
- Do not refactor `scripts/foundation-verify.mjs` wholesale.
