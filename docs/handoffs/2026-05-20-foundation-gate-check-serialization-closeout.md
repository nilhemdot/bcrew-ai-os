# FOUNDATION-GATE-CHECK-SERIALIZATION-001 Closeout

Date: 2026-05-20
Closeout key: `foundation-gate-check-serialization-v1`
Card: `FOUNDATION-GATE-CHECK-SERIALIZATION-001`

## What Changed

DB-heavy Foundation proof checks now run through a shared local serialization guard before touching live Foundation DB state:

- `foundation:verify`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `backlog:hygiene`

The guard uses an atomic local lock with owner metadata, owner-token reentry, and stale-lock cleanup. Child proof checks spawned by the active lock owner may re-enter with the inherited owner token so `foundation:verify` can run delegated health scripts without self-deadlocking; unrelated heavy proof attempts still wait. It prevents concurrent proof attempts from creating misleading raw health failures, but it does not catch, downgrade, classify away, or hide real DB/schema/verifier failures.

## Proof

Focused proof:

```sh
npm run process:foundation-gate-check-serialization-check -- --close-card --json
```

Required post-card gates:

```sh
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-GATE-CHECK-SERIALIZATION-001 --planApprovalRef=docs/process/approvals/FOUNDATION-GATE-CHECK-SERIALIZATION-001.json --closeoutKey=foundation-gate-check-serialization-v1 --commitRef=HEAD
```

Dogfood covers:

- two concurrent synthetic heavy-gate attempts do not overlap
- the second attempt waits on the shared local lock
- an owner-token child proof re-enters without waiting or removing the parent lock
- a synthetic permanent DB verifier failure still fails closed and preserves the error message
- System Health remains raw-health-gated, not green by classification

## Current Truth After Close

Current Sprint advances to `BRAIN-FLEET-FOUNDATION-001`.

Brain Fleet v1 scope remains no-auth contract/interface work only:

- reuse existing `llm_credentials` and `llm_routes`
- do not rebuild the LLM router or credential registry
- do not run live provider probes
- do not mutate credentials
- do not start extractor proof, broad extraction, Strategy, or People work

## Known Limits

- This does not make all future Postgres deadlocks impossible.
- This does not make `foundation:verify` differential or faster.
- This does not approve provider probes, provider auth, model calls, extraction, or external writes.
- This does not start Strategy Hub or People work.
