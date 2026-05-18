# SOURCE-MATURITY-GITHUB-BUILD-INTEL-TRUST-GAP-REPAIR-001 Plan

## What

Repair the `SRC-GITHUB-BUILD-INTEL-001` trusted-stage source maturity gap by locking the existing public GitHub Build Intel source contract as `Source Boundary Locked`.

This is a source-contract boundary repair only. It does not run GitHub extraction, clone repositories, create atoms, create routes, call providers/models, or mutate backlog from public repo content.

## Why

Live source maturity shows `SRC-GITHUB-BUILD-INTEL-001` blocked at `trusted`. Repo truth already defines this source as public, read-only, and proposal-only through `docs/source-notes/github-build-intel.md`, `docs/source-registry.md`, `lib/source-contracts.js`, the GStack extraction packet, and `/api/foundation/gstack-build-intel`.

The actual gap is that the contract says `Read-Only V1`, while the source maturity trusted-stage gate recognizes signed-off, readable, verified, current-reality, or `Source Boundary Locked` trust boundaries. The useful operator behavior is a cleaner source maturity grid: Steve can see that public GitHub Build Intel is trusted for read-only proposals, while the next real work remains monitored/extraction readiness.

## Acceptance Criteria

- `lib/source-contracts.js` sets `SRC-GITHUB-BUILD-INTEL-001` validation to include `Read-Only V1` and `Source Boundary Locked`.
- `docs/source-notes/github-build-intel.md` records `Trust Boundary: Source Boundary Locked`.
- `docs/source-registry.md` names the same public read-only, proposal-only boundary.
- The live `source_contract_registry` row is synced from repo source contracts and shows `Read-Only V1; Source Boundary Locked`.
- The focused proof calls the real source-contract, source-contract validation, registry, and source-maturity grid paths.
- Synthetic old `Read-Only V1` validation fails trusted.
- Synthetic `Source Boundary Locked` validation passes trusted.
- The live source maturity row clears trusted and its next real gap remains `monitored`.
- The proof fails if monitoring, extraction, atom-flow, synthesis, or routing are faked green.

## Definition Of Done

- `SRC-GITHUB-BUILD-INTEL-001` no longer reports `nextGap=trusted`.
- `SRC-GITHUB-BUILD-INTEL-001` reports `nextGap=monitored`.
- `SRC-GITHUB-BUILD-INTEL-001` keeps its read-only lifecycle label while also satisfying the source maturity trust boundary.
- Source Contract Validation Layer remains `no_auth_internal`, `proposal_only`, `not_applicable` connector, and `proposal_only` atom flow.
- Current Sprint metadata includes existing-work checks, proof commands, approval ref, closeout key, not-next boundaries, Drive mutation guard, and `MEETING-VAULT-ACL-001 Phase B` guard.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Details

Existing code reused:

- `lib/source-contracts.js`
- `lib/source-contract-validation-layer.js`
- `lib/source-maturity-grid.js`
- `lib/source-contract-registry-table.js`
- `lib/gstack-build-intel.js`

Existing docs reused:

- `docs/source-registry.md`
- `docs/source-notes/github-build-intel.md`
- `docs/handoffs/2026-05-13-gstack-build-intel-extraction.md`
- `docs/process/build-intel-github-monitor-001-plan.md`

Existing scripts reused:

- `scripts/sync-source-contract-registry.mjs`
- `scripts/process-gstack-build-intel-check.mjs`
- `scripts/foundation-verify.mjs`

The behavior proof must reject substring-only proof. The focused checker dogfoods a synthetic before/after maturity grid, loads the live Foundation snapshot, calls the actual function path through `getSourceContracts()`, `evaluateSourceContractValidationLayer()`, `getSourceContractRegistrySnapshot()`, and `buildSourceMaturityGridSnapshot()`, then verifies the live source maturity row through the same API/source-surface path used by Foundation surfaces.

## Risks

- Risk: the repair accidentally claims GitHub monitoring or extraction is ready. Repair path: fail the proof unless `nextGap=monitored` remains visible and monitored/extracted/atomized/routed stages are still red.
- Risk: DB registry stays stale after the source-contract code change. Repair path: run `source-contract-registry:sync -- --apply` and fail proof if the live DB row still shows the old validation.
- Risk: public GitHub source work drifts into broad crawling or code import. Repair path: keep not-next boundaries explicit in the card, sprint metadata, source note, and proof.
- Risk: the proof degrades into string theater. Repair path: require synthetic grid failure/pass plus live source-contract validation and live source maturity snapshot checks.

## Tests

- `node --check lib/source-maturity-github-build-intel-trust-gap-repair.js scripts/process-source-maturity-github-build-intel-trust-gap-repair-check.mjs`
- `npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-github-build-intel-trust-gap-repair --json`
- `npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-github-build-intel-trust-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- full `process:foundation-ship`

## Gate Decision

Static checks are not enough because this touches source-contract truth and the live registry. The focused proof is used while iterating because it targets one source ID and should finish in under two minutes. The full ship gate is required before push because source-contract registry, source maturity, Foundation Hub/source surfaces, Recent Builds, and verifier coverage are part of the blast radius.

## Boundaries

- No live GitHub calls, repo cloning, scraping, installs, code import, or broad external crawling.
- No live extraction, transcript fetch, screenshot capture, provider/model call, or atom generation.
- No automatic backlog mutation from public repo content.
- No auth-required or paid run.
- No external write, ClickUp write, Gmail send, or Google Drive permission mutation.
- Do not mutate Drive permissions.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No live Agent Feedback auto-send.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.

## Speed Bound

The focused proof is bounded to one source contract, one registry row, one synthetic grid pair, one live maturity row, and Current Sprint metadata. It should stay fast enough to use during iteration; full verification is reserved for the final ship gate.

## Not Next

- Do not build public GitHub monitoring runtime.
- Do not fetch or clone public repos during this card.
- Do not generate atoms from GitHub content.
- Do not route GitHub findings into action routes.
- Do not auto-create backlog cards from public repo content.
