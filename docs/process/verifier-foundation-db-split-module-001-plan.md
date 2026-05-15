# VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001 Plan

## Goal

Extract the Foundation-DB split verifier assertions out of `scripts/foundation-verify.mjs` into a focused module without changing the behavior those assertions enforce.

## Existing Work Check

- `SERVER-ROUTE-SPLIT-001` is closed and documented in `docs/handoffs/2026-05-15-server-route-split-closeout.md`.
- Foundation-DB split work is documented in `docs/handoffs/2026-05-15-foundation-db-split-summary.md`.
- `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001` is already closed and covered by the verifier.
- Canva client work is already committed under `fb66e52` and there are no `status.html` files in this worktree.
- `scripts/foundation-verify.mjs` is still over 15K lines, so the next safe cleanup is another verifier module split.

## Scope

Move only the verifier assertions for the closed Foundation-DB split cards:

- `FOUNDATION-DB-MONOLITH-SPLIT-001`
- `FOUNDATION-DB-MONOLITH-SPLIT-002`
- `FOUNDATION-DB-MONOLITH-SPLIT-003`
- `FOUNDATION-DB-MONOLITH-SPLIT-004`
- `FOUNDATION-DB-MONOLITH-SPLIT-005`
- `FOUNDATION-DB-MONOLITH-SPLIT-006`
- `FOUNDATION-DB-MONOLITH-SPLIT-007`
- `FOUNDATION-DB-MONOLITH-SPLIT-008`

## Implementation

1. Add `lib/foundation-db-split-verifier.js`.
2. Add `scripts/process-verifier-foundation-db-split-module-check.mjs`.
3. Replace the inline Foundation-DB split assertion block in `scripts/foundation-verify.mjs` with a delegated module call.
4. Register the focused proof in `package.json`.
5. Add closeout and verifier coverage for the new module split card.

## Acceptance Criteria

- The focused proof passes with the real repo and live DB state.
- Dogfood rejects missing backlog-store, decision-store, seed, source-snapshot, operating-truth, goal-truth, FUB lead-source, and shared-comms coverage split evidence.
- Substring-only proof is rejected: the focused proof must recreate old failure modes and prove the module fails closed when split evidence is missing or inline ownership returns.
- `scripts/foundation-verify.mjs` line count decreases.
- Full `foundation:verify` remains green.
- Foundation ship gate passes before push.

## Not Next

- No broad verifier rewrite.
- No Foundation-DB behavior changes.
- No schema, seed, or live DB data mutation beyond opening/closing this sprint.
- No hub feature work, Canva asset work, paid-source auth, Build Intel extraction, or Drive permission mutation.

## Proof

```bash
node --check lib/foundation-db-split-verifier.js scripts/process-verifier-foundation-db-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-foundation-db-split-module-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001.json --closeoutKey=verifier-foundation-db-split-module-v1 --commitRef=HEAD
```
