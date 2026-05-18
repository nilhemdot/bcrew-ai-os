# SOURCE-016 Marketing Measurement Source Contracts Plan

Card: `SOURCE-016`

Closeout key: `marketing-measurement-source-contracts-v1`

## What

Close the no-auth source-contract prep slice of `SOURCE-016` by registering GA4, Google Search Console, and Google Business Profile as first-class Foundation source contracts.

This is source-contract truth only. The new source identities must remain blocked from extraction until Steve/source owners approve property/account/location boundaries, auth posture, allowed reads, and cost/spend rules.

## Why

The connector-completion matrix identified `SRC-GA4-001`, `SRC-GSC-001`, and `SRC-GBP-001` as referenced marketing measurement IDs without first-class source contracts. That creates phantom source truth: future connector or extractor work could build on IDs that are not owned, blocked, or validated.

`SOURCE-016` already owns the marketing source map and the split between no-auth source-contract prep versus auth-required provider work. This card closes the no-auth prep slice without touching providers.

## Acceptance Criteria

- The existing live backlog card `SOURCE-016` is reused, enriched, moved through Current Sprint, and closed without creating a duplicate card.
- `SRC-GA4-001`, `SRC-GSC-001`, and `SRC-GBP-001` exist as source contracts with owner, scope, validation posture, boundary note, and source-registry documentation.
- `CONN-GA4-001`, `CONN-GSC-001`, and `CONN-GBP-001` exist as available-pending connector rows, not working/live rows.
- Source-contract validation profiles mark all three new sources as owner-authorization-required and blocked until authorized.
- Source Lifecycle completion marks all three as accepted-blocked with blocker cards and next actions.
- Source Connector Matrix rows for all three move from `missing_contract` to `blocked` and keep auth/extraction approval visible.
- Source-contract registry sync is healthy with 42 active rows after applying the metadata-only sync.
- Ongoing verifier coverage proves the new marketing measurement sources are fail-closed and have no active extraction targets.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.

## Definition Of Done

Done means GA4, Google Search Console, and Google Business Profile are no longer phantom source IDs. They are first-class Foundation source contracts, visible in source registry and connector matrix, synced into `source_contract_registry`, and blocked from extraction until a later approved source/auth card changes that posture.

Done does not mean GA4/GSC/GBP reads are live. It does not mean Google Ads, Meta, or SocialPilot are repaired or approved. It does not start Marketing Hub production.

## Details

Implementation:

- Add a marketing source-contract domain module so `lib/source-contracts.js` stays below the preferred hand-written module budget.
- Register GA4/GSC/GBP source contracts and available-pending connector rows.
- Add validation-layer profiles for GA4/GSC/GBP.
- Add Source Lifecycle accepted-blocked rules.
- Update Source Connector Matrix and its focused proof from "missing contract" to "blocked authorization".
- Add `lib/marketing-measurement-source-contracts.js` as the focused evaluation/dogfood owner.
- Add source-contract verifier coverage.
- Update source registry, current state, current plan, approval, closeout, package script, and closeout registry.

Operator value:

- Foundation no longer shows GA4, Search Console, or Google Business Profile as vague/missing phantom IDs.
- Future builders can see the exact next blocker: owner/source auth approval and account/property/location mapping, not another "where does this source live?" investigation.
- Marketing measurement work gets a safe starting point without accidentally starting provider reads or extraction.

Behavior proof:

- The focused proof calls the actual function path `evaluateMarketingMeasurementSourceContracts()` and `buildMarketingMeasurementSourceContractsDogfoodProof()`, not only markers.
- The evaluator uses real `getSourceContracts()`, `getSourceConnectors()`, `evaluateSourceContractValidationLayer()`, `assertSourceContractAllowsExtraction()`, and `buildSourceConnectorMatrixSnapshot()` paths.
- The proof checks the live `source_contract_registry` snapshot after the apply-gated registry sync.
- Dogfood removes the new contracts, removes the available-pending connector rows, and creates a synthetic active GA4 extraction target; each case must fail.
- The Source Contract verifier imports the same evaluator so this behavior remains covered by `foundation:verify`.
- The plan explicitly rejects substring-only proof and string match verifier theatre; source text checks can prove wiring exists, but pass/fail behavior must come from the actual function path, registry snapshot, verifier path, and dogfood cases.

Gate decision tree:

- Static gate first: `node --check` on changed JS modules and focused proof.
- Focused proof while iterating: `process:source-016-marketing-measurement-source-contracts-check`.
- Sync `source_contract_registry` through the existing apply-gated source-contract registry sync.
- Targeted full-verifier repair only if the full verifier is red.
- Final ship gate: `process:foundation-ship`.
- Speed boundary: keep the focused gate fast and proportional, expected under 2 minutes for normal iteration; do not rerun full `foundation:verify` until focused proof and registry sync are green, unless repairing a specific full-verifier failure.

Shared-file and size plan:

- `lib/source-contracts.js` delegates marketing source contracts/connectors into `lib/source-contracts-marketing.js`.
- Split plan / no new responsibility: over-budget shared files remain thin registries or pointers only. This card moves the marketing source-contract responsibility into a new module and does not add a new responsibility to the existing large closeout or current-plan files.
- `scripts/foundation-verify.mjs` is not touched.
- New hand-written modules and focused proof stay below 1,500 lines.
- Shared source files only register, validate, or verify the contract; they do not own live provider behavior.
- `lib/foundation-build-closeout-records.js` is already a large root registry, so this card only adds one import/spread and keeps the actual closeout record in `lib/foundation-build-closeout-source-records.js`.
- `docs/rebuild/current-plan.md` is over the preferred hand-written size, so this card changes only the existing `SOURCE-016` source-map bullet and does not add a new current-plan section.
- Artifact budgets: approval JSON under 8 KB, closeout under 10 KB, plan under 14 KB, and no generated/data/report artifact may hide missing proof.
- Shared-file coordination: this is the main-session approved active sprint scope for the Foundation builder on `foundation/system-health-red-to-green-001`. Steve explicitly approved overnight safe Foundation source/connector work, and the requested shared files are declared by this plan. If another builder needs these shared files, return to the main session before commit, push, merge, or ship.

Read/write posture:

- Allowed internal writes: backlog/current-sprint scaffold rows, Plan Critic row, change event, and source-contract registry sync.
- No external writes.
- No live provider calls.
- No extraction targets.

Repair path:

- If source-contract validation fails, keep `SOURCE-016` open and repair the exact missing owner/auth/extraction/freshness/blocker field.
- If Source Connector Matrix regresses to `missing_contract`, repair the source-contract or connector-row registration; do not weaken the matrix check.
- If registry sync is stale, rerun the apply-gated source-contract registry sync and recheck the registry snapshot.
- If `foundation:verify` finds a source lifecycle or verifier integration miss, repair that verifier path and rerun only the targeted/failing check before the final ship gate.
- If any provider/auth/extraction approval is required, mark the relevant follow-up blocked with owner/action and continue the next safe Foundation card instead of running live access.

## Risks

- Risk: source contracts are mistaken for live source access.
  - Mitigation: status stays `Scoped, not connected`, validation stays `Not Signed Off`, connector status stays available-pending, and extraction gate fails closed.
- Risk: Source Connector Matrix hides the next blocker.
  - Mitigation: rows are blocked with explicit authorization/extraction approval reasons.
- Risk: this becomes Marketing Hub or provider repair.
  - Mitigation: boundaries explicitly forbid Marketing Hub production, OAuth, provider calls, extraction, and external writes.
- Risk: source-contract count drift breaks registry or lifecycle gates.
  - Mitigation: source-contract registry sync and verifier coverage are required proof.

Not next:

- No live extraction.
- No extraction target creation.
- No GA4, Search Console, GBP, Google Ads, Meta, or SocialPilot provider calls.
- No OAuth or provider auth repair.
- No paid-source auth or spend.
- No external writes.
- No model calls, screenshots, transcript fetches, or crawl.
- No Harlan/Fal/voice/Canva/OpenHuman work.
- No Marketing Hub production.
- No broad visual UI redesign.
- No Drive permission mutation.
- No live Agent Feedback auto-send.

## Tests

Focused loop:

```bash
node --check lib/source-contracts.js lib/source-contracts-marketing.js lib/source-contract-validation-layer.js lib/source-lifecycle-completion.js lib/source-connector-matrix.js lib/marketing-measurement-source-contracts.js lib/foundation-source-contract-verifier.js scripts/process-source-connector-matrix-check.mjs scripts/process-source-016-marketing-measurement-source-contracts-check.mjs
npm run process:source-016-marketing-measurement-source-contracts-check -- --apply --stage=scoping --json
npm run process:source-016-marketing-measurement-source-contracts-check -- --apply --stage=sprint_ready --json
npm run source-contract-registry:sync -- --apply --actor=codex-source-016-marketing-measurement --json
npm run process:source-016-marketing-measurement-source-contracts-check -- --apply --stage=building_now --json
```

Final gate:

```bash
npm run process:source-016-marketing-measurement-source-contracts-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SOURCE-016 --planApprovalRef=docs/process/approvals/SOURCE-016.json --closeoutKey=marketing-measurement-source-contracts-v1 --commitRef=HEAD
```
