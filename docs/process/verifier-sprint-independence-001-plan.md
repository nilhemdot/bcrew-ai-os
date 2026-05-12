# VERIFIER-SPRINT-INDEPENDENCE-001 Plan

## What
Refactor old sprint verifier checks so they prove shipped artifacts, done lanes, closeout records, and code paths instead of passing because a later sprint is active.

## Why
The verifier must be trusted by Steve as a behavior proof layer. The useful operator behavior is that an old sprint remains verified because its artifacts still exist, not because the active sprint moved on.

## Acceptance Criteria
- `scripts/foundation-verify.mjs` no longer uses a Connector/Routing active-sprint shortcut to pass old Source Once-Over checks.
- Historical sprint checks use done backlog state plus verified closeout records and concrete artifact checks.
- Current active blocker checks remain only for the active sprint.
- The grep proof for the old shortcut returns no matches.
- Full `foundation:verify` runs against the new invariant.

## Definition Of Done
- The active-sprint escape hatch is removed.
- Connector/Routing Truth sprint proof is independent of the active sprint being current.
- Source Once-Over proof is independent of Connector/Routing or Process Repair being active.
- The verifier failure mode is a real missing artifact/closeout/lane, not stale active-blocker state.

## Details
This is a tight V1 card: remove only the active-sprint escape hatch and make old sprint checks prove their own artifacts. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth: `foundationBuildCloseouts`, live backlog items, source lifecycle payloads, current-state/current-plan docs, and existing Foundation verifier checks.

Behavior proof calls the actual verifier function path, reads the real Foundation Hub/API payload, and runs a DB-backed closeout/backlog round-trip. Substring-only proof is rejected, and another `.includes()` escape condition is not acceptable.

Gate decision: full proof is required because the canonical verifier changes. Static and focused checks cover syntax and grep proof, but blast radius requires `npm run foundation:verify` and may require `process:foundation-ship` before closeout.

Operator value for Steve and the team: this unlocks verifier quality without slowing every small card, because historical checks become stable and proportional instead of tied to current sprint churn.

## Risks
Risk is replacing one escape hatch with another. The repair path is to fail the card, leave the old verifier checks red, and scope missing historical artifacts explicitly instead of adding broad bypass logic.

## Tests
- `rg -n "connectorRoutingTruthSprintActive \\|\\| expectedSnippets|expectedCardIds.includes\\(currentSprintActiveBlockerCardId\\) \\|\\| connectorRoutingTruthSprintActive" scripts/foundation-verify.mjs`
- `npm run foundation:verify`
- `npm run backlog:hygiene -- --json`

## Not Next
Do not split the whole verifier in this card, do not reduce source/security checks, do not start product work, do not mutate Drive permissions, do not run `MEETING-VAULT-ACL-001` Phase B, and do not add another current-sprint shortcut.
