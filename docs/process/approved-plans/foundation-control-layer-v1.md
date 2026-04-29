# Foundation Control Layer Approved Plan

Approved by: Steve
Approved at: 2026-04-29T23:50:20Z
Plan score: 9.8/10
Approved repo head: `cbbf7bfef826ac98d3cec8d2d3deec42a2eef938`

## Cards

- `GATE-RELIABILITY-001`
- `PERSONAL-WORKSPACE-BOUNDARY-001`
- `DOCTRINE-PROPAGATION-003`
- `DECISION-AUTO-EMIT-002`
- `CEO-DASHBOARD-PATTERN-001`

## Scope

Finish the remaining Foundation control layer before review-queue cleanup or Phase G operator UI.

Do not start Phase G Track 2, UI polish, Strategy, Scoper, Agent Factory, or corpus expansion.

## Build Order

1. `GATE-RELIABILITY-001`: add deterministic injected/fixture errors for transient and permanent gate behavior. Do not depend on causing a real database deadlock. The transient `deadlock detected` case must visibly retry and pass; the permanent DB/schema/verifier failure case must fail closed.
2. `PERSONAL-WORKSPACE-BOUNDARY-001`: define private/local workspace boundaries and prove them with metadata-only for real private files. Use synthetic sentinel fixtures for leak tests. Real private file content must never be copied, quoted, summarized, tokenized, or logged into tracked docs, API JSON, verifier logs, skill output, or closeout proof.
3. `DOCTRINE-PROPAGATION-003`: extend generated doctrine for the remaining control rules: nothing manual, memory is not backlog, pre-commit/ship gate required, metadata-only private proof, reliable gate failures, proposed-only detected decisions, and CEO-dashboard operator questions.
4. `DECISION-AUTO-EMIT-002`: detect explicit pivot, park, adopt, defer, lock, disable, override, or sequence-change language from approved tracked source surfaces. Apply mode writes proposed decision records only unless a separate explicit approval path is present. No silent applied/locked decisions from detected language.
5. `CEO-DASHBOARD-PATTERN-001`: define the control pattern for Foundation surfaces before UI work: what changed, where it lives, what to review, what is blocked, what is next, confidence/proof, empty state, and error state.

## Acceptance

- `GATE-RELIABILITY-001` has deterministic transient/permanent proof and raw `foundation:verify` retries transient gate errors without hiding permanent red failures.
- `PERSONAL-WORKSPACE-BOUNDARY-001` exposes only metadata for real private files and uses synthetic sentinel fixtures for leak tests.
- `DOCTRINE-PROPAGATION-003` regenerates the marked `bcrew-foundation` skill section from repo doctrine without copying private content.
- `DECISION-AUTO-EMIT-002` stays explicit-language-only, private-source-safe, duplicate-safe, and proposed-only in apply mode.
- `CEO-DASHBOARD-PATTERN-001` creates a doctrine/schema pattern only and does not implement Phase G UI polish.

## Proof

- `npm run process:gate-reliability-check`
- `npm run process:personal-workspace-boundary-check`
- `npm run doctrine:propagation-check`
- `npm run decision:auto-emit -- --synthetic=true`
- `npm run decision:auto-emit -- --foundationSources=true`
- `npm run process:approval-integrity-check -- --synthetic=true`
- `npm run process:git-hook-check`
- `npm run foundation:verify`
- live API proof from `/api/foundation-hub`
- live Recent Work proof from `/api/foundation/build-log`
- `npm run process:foundation-ship` once per card

## Closeout

Use closeout key `foundation-control-layer-v1`.

The closeout owns exactly the five card IDs in this plan. Mentioned/context cards may appear only as mentioned backlog IDs, not owned backlog IDs.

Run `npm run process:foundation-ship` once per card unless the wrapper is explicitly upgraded and verified to support multi-card invocation. Shared closeout key is allowed only if each card's proof ownership stays exact.

## Known Limits

- Gate reliability proves deterministic transient handling, not that every future DB deadlock is impossible.
- Privacy protection relies on metadata-only real-file handling plus synthetic sentinel tests; it does not semantically classify every possible secret.
- Decision auto-emit remains explicit-language-only and proposed-only.
- CEO dashboard work is pattern definition, not UI implementation.

## Next Step

After ship, stop for review. Steve chooses the next plan gate: review-queue cleanup or Phase G Track 2. Do not start Phase G Track 2, UI polish, Strategy, Scoper, Agent Factory, or corpus expansion from this bundle.
