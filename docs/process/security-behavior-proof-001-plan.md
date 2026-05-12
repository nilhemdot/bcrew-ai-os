# SECURITY-BEHAVIOR-PROOF-001 Plan

Status: approved for v1 under `security-behavior-proof-v1`
Card: `SECURITY-BEHAVIOR-PROOF-001`
Date: 2026-05-12

## What

Add a focused security behavior proof for the current access posture.

This does not expand access. It proves the current intended behavior at the route boundary: owner-only Foundation/Strategy/shared-comms routes stay owner-only, ops and sales routes admit only their intended roles, unknown users fail closed, admin-token/system stays Tier 1 system access, and subject-person filtering does not leak sensitive content to the person mentioned in the content.

## Why

The audit correction was important: `assertTier` is wired through `authorizeRouteAccess`, so the problem is not a missing library call. The gap is product behavior confidence. Steve needs proof that the live route posture behaves the way the rebuild claims before broad hubs, team access, or Strategy work continues.

The operator value is safer speed: future builder sessions can move to product work without re-litigating whether the security layer is real.

## Acceptance Criteria

- `lib/security-behavior-proof.js` builds a behavior matrix using the actual `findRoutePosture`, `authorizeRouteAccess`, `filterRecordsForActor`, and `buildRedactedCollectionResponse` paths.
- The proof calls actual function path behavior and route-boundary round trips; it does not accept substring-only or string match proof as closeout.
- The matrix covers Steve/owner, ops, sales, unknown user, admin-token/system, anonymous public, and a default unregistered route.
- The proof includes the explicit Tanner subject-person case: Tanner querying intelligence about Tanner must not receive Tier 1-only or sensitive subject content merely because Tanner is the subject.
- Shared communications and Strategy routes remain Tier 1-only for non-owner users until a later filtered-access card closes.
- `scripts/process-security-behavior-proof-check.mjs` runs the focused proof, validates the 9.8 approval, checks live backlog/current sprint state, and emits `SECURITY_BEHAVIOR_PROOF_SUMMARY`.
- The focused proof returns pass with zero findings; if the route matrix, subject-person proof, approval, or sprint closeout fails, it returns revise/blocked and the card stays open.
- Plan Critic scores this SECURITY-BEHAVIOR-PROOF-001 plan at 9.8 or higher before implementation starts.
- Current Sprint moves `SECURITY-BEHAVIOR-PROOF-001` to Done This Sprint and advances the active blocker to `VERIFIER-BEHAVIOR-SWEEP-001`.
- Current plan, current state, Recent Work, package scripts, and `foundation:verify` all name `security-behavior-proof-v1`.

## Definition Of Done

- A route behavior proof fails if an owner-only route admits ops, sales, unknown, or anonymous users.
- A role route proof fails if ops or sales access drifts from the declared posture.
- A default-route proof fails if unregistered protected routes stop failing closed to owner/Tier 1.
- A redaction proof fails if a filtered response leaks suppressed record IDs, suppressed counts, or Tanner subject-person Tier 1 content.
- The card is closed in the live backlog with proof commands and closeout trail.

## Details

Reuse existing work:

- `lib/security-access.js` owns actor context, route posture lookup, route authorization, and redaction helpers.
- `scripts/process-security-002-check.mjs` already proves lower-level Tier 1/Tier 2/Tier 3 helper behavior.
- `lib/foundation-current-sprint.js` owns active sprint order and not-next boundaries.
- `lib/foundation-db.js` owns live backlog truth.
- `lib/approval-integrity.js` owns 9.8 approval validation.
- `scripts/foundation-verify.mjs` owns canonical verifier coverage.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` own command doctrine.

Gate decision for this card: full.

Reason: this card changes security proof code, the live backlog seed, Current Sprint, package scripts, build log, and canonical verifier coverage. The focused proof must be fast, but the closeout still needs the full Foundation ship gate because the blast radius includes security and verifier paths.

Behavior proof shape:

- Route matrix uses request-shaped objects and the real route posture registry rather than checking source substrings.
- Record matrix uses synthetic intelligence records with `minTier`, `sensitivity`, and `subjectPeople` metadata.
- The subject-person case uses `tanner.marsh@bensoncrew.ca` as a Tier 3 actor and suppresses Tier 1 `comp_discussion` and Tier 2 `performance_concern` records about Tanner.
- Substring-only proof is rejected for this card; source markers can only support the behavior proof, not replace it.
- A weak proof that only says `currentState.includes('security-behavior-proof-v1')` is rejected because it does not call the real function path.

## Risks

- Risk: the proof becomes another process artifact and misses behavior.
  - Repair path: the proof calls actual route and redaction functions and includes failure-sensitive synthetic cases; if a behavior case fails, the card stays open.
- Risk: this turns into broad access expansion.
  - Repair path: not-next boundaries keep non-Tier-1 shared-comms, Strategy, and Foundation access blocked until separate filtered-access cards close.
- Risk: the matrix overclaims live HTTP coverage.
  - Repair path: call it route-boundary behavior proof, not full end-to-end Google session proof. A later multi-user browser/session proof can be scoped when real team access is ready.
- Risk: full ship takes too long.
  - Repair path: keep `process:security-behavior-proof-check` focused and use proportional gates for later small edits.

## Tests

```bash
npm run process:security-behavior-proof-check -- --json=true
npm run process:security-002-check
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SECURITY-BEHAVIOR-PROOF-001 --planApprovalRef=docs/process/approvals/SECURITY-BEHAVIOR-PROOF-001.json --closeoutKey=security-behavior-proof-v1 --commitRef=HEAD
```

The focused proof must run behavior, not only markers:

- `buildSyntheticSecurityBehaviorProof`
- `findRoutePosture` plus `authorizeRouteAccess` for route matrix rows
- `filterRecordsForActor` plus `buildRedactedCollectionResponse` for subject-person redaction
- live Current Sprint stage and active blocker checks
- live Backlog lane check
- approval-integrity check

## Not Next

- Do not open shared communications or Strategy routes to non-Tier-1 users.
- Do not change route postures except to fix a proven mismatch.
- Do not build `SECURITY-FILTERED-COMMS-ACCESS-001`.
- Do not build Strategy Hub meeting-ready UI in this card.
- Do not start `VERIFIER-BEHAVIOR-SWEEP-001`, avatar import, Telegram bots, Directors, Marketing pipeline, or broad old-system parity work.
- Do not mutate Google Drive permissions or restart Meeting Vault historical cleanup.
