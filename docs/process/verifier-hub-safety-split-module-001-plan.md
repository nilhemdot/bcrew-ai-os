# VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 Plan

Card: `VERIFIER-HUB-SAFETY-SPLIT-MODULE-001`
Sprint: `verifier-hub-safety-split-module-2026-05-16`
Closeout key: `verifier-hub-safety-split-module-v1`

## What

Extract the hub-safety verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-hub-safety-verifier.js`.

The extracted domain covers:

- `HUB-001` hub work coordination.
- Foundation Ready Safe Hub Lane.
- Foundation Hub backlog thin contract.
- Foundation backlog detail endpoint.

## Why

`scripts/foundation-verify.mjs` is still the only actively dangerous monolith after the overnight cleanup. This card removes a coherent proof domain instead of arbitrary lines: the checks that prove hubs can consume Foundation without corrupting Foundation/process ownership.

Useful operator behavior: this unlocks faster and higher-quality hub work because Steve can inspect one named module to understand whether real hub chats can safely use Foundation read-only data, what blocks shared-file drift, and whether Foundation Hub backlog payloads stay compact enough for hub consumers.

## Acceptance Criteria

- `lib/foundation-hub-safety-verifier.js` owns the hub work, safe hub lane, backlog contract, and backlog detail endpoint verifier checks.
- `scripts/foundation-verify.mjs` delegates to the module and no longer keeps those predicates inline.
- Focused proof dogfoods missing hub ownership matrix, broken shared-file stop line, invalid hub consumer payload, bloated Foundation Hub backlog payload, missing backlog detail payload, and missing root delegation.
- Root verifier line count decreases from the pre-card baseline.
- Live backlog, Current Sprint, Plan Critic run, approval file, closeout record, and Recent Builds all reference `VERIFIER-HUB-SAFETY-SPLIT-MODULE-001`.

## Definition Of Done

- Plan Critic score is at least 9.8.
- `node --check lib/foundation-hub-safety-verifier.js scripts/process-verifier-hub-safety-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js` passes.
- `npm run process:verifier-hub-safety-split-module-check -- --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-HUB-SAFETY-SPLIT-MODULE-001.json --closeoutKey=verifier-hub-safety-split-module-v1 --commitRef=HEAD` passes before push.

## Details

1. Add `lib/foundation-hub-safety-verifier.js` with constants, evaluator, and dogfood proof.
2. Move only the hub-safety verifier predicates out of `scripts/foundation-verify.mjs`.
3. Keep root verifier as a thin delegate that reads sources, passes live payloads, and pushes returned checks.
4. Add `scripts/process-verifier-hub-safety-split-module-check.mjs` as a read-only focused proof.
5. Add package script `process:verifier-hub-safety-split-module-check`.
6. Add closeout registry, current plan/state notes, and approval evidence.

Not next / tight V1 scope:

- No hub UI work.
- No Marketing Video Lab wiring.
- No Canva asset-library behavior.
- No source extraction.
- No Build Intel extraction.
- No paid-source auth.
- No DB schema changes.
- No route behavior changes.
- No Meeting Vault Phase B.
- No Drive permission mutation.

## Risks

- Risk: moving checks drops done-card verifier coverage. Mitigation: add the new module source to verifier coverage aggregation and dogfood that root delegation still names the moved cards.
- Risk: false-green module only checks substrings. Mitigation: dogfood validates broken payloads and missing files/routes fail closed.
- Risk: active Current Sprint progression checks fail after closeout. Mitigation: include the new verifier card in the later-progression blocker list and rerun full `foundation:verify` after closeout.
- Risk: Recent Builds misses the closeout because commit subject matching is too narrow. Mitigation: include the final commit subject matcher in the closeout record before the ship gate.

## Tests

Gate decision: full gate. This card touches the canonical Foundation verifier, package scripts, a focused process proof, and closeout registry. Static or focused-only proof is not enough.

Required commands:

```sh
node --check lib/foundation-hub-safety-verifier.js scripts/process-verifier-hub-safety-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-hub-safety-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-HUB-SAFETY-SPLIT-MODULE-001.json --closeoutKey=verifier-hub-safety-split-module-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 --closeoutKey=verifier-hub-safety-split-module-v1
npm run process:foundation-ship -- --card=VERIFIER-HUB-SAFETY-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-HUB-SAFETY-SPLIT-MODULE-001.json --closeoutKey=verifier-hub-safety-split-module-v1 --commitRef=HEAD
```

## Rollback Or Repair

Rollback is mechanical:

1. Restore the inline hub-safety verifier block in `scripts/foundation-verify.mjs`.
2. Remove `lib/foundation-hub-safety-verifier.js`.
3. Remove the focused proof script and package command.
4. Revert backlog/current sprint closeout state if the card did not ship.

No data migration, auth change, source contract mutation, or hub feature behavior is involved.
