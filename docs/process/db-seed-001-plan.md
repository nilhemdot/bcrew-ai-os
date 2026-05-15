# DB-SEED-001 Plan

Status: approved for build
Card: `DB-SEED-001`
Sprint: `db-seed-2026-05-15`
Closeout key: `db-seed-v1`

## What

Split static backlog seed truth out of the live Foundation DB/migration monolith and add a governed seed-drift proof so seed/live differences are visible without silently repairing live backlog state.

V1 does three bounded things:

- Move `backlogSeed` out of `lib/foundation-db.js` into a dedicated seed module.
- Add a focused seed-governance helper that classifies seed/live drift as report-only review work.
- Add a focused proof script and thin verifier coverage proving `initFoundationDb()` stays schema-only while seed/live drift is classified instead of applied.

## Why

The nightly audit and `DB-SEED-001` card both point at the same Foundation risk: static seed truth, live Postgres truth, and DB migration/init logic still live too close together. The previous `FOUNDATION-DB-INIT-SEED-SPLIT-001` card made `initFoundationDb()` schema-only unless bootstrap is explicit, but the huge backlog seed remains embedded inside the DB file and seed drift can still be misunderstood as something startup should fix.

Root invariant: live Postgres/API is operational truth after bootstrap. `backlogSeed` is bootstrap/default doctrine only. Differences between seed and live backlog must be reported and classified for governed review, never silently repaired by init, verifier, health checks, or report paths.

Useful operator behavior: Steve and the team can use the real workflow of reviewing seed/live drift as a Foundation quality control surface. The useful thing is not a cleaner file by itself; it is faster, safer backlog review where live card truth stays stable, seed defaults are visibly stale when they drift, and no operator has to wonder whether opening the dashboard, running the verifier, or initializing schema will overwrite live card truth.

## Acceptance Criteria

- `backlogSeed` is extracted from `lib/foundation-db.js` into a dedicated module and imported by the DB file.
- `lib/foundation-db.js` no longer defines the giant `const backlogSeed = [` block inline.
- A focused governance helper classifies missing live rows, stable-field mismatches, and mutable-field mismatches as report-only seed review work.
- Dogfood proof recreates the failure mode: seed says a card is `scoped`, live says it is `done`; the proof must classify this as mutable drift and refuse any default overwrite.
- Dogfood proof proves a missing live row becomes a bootstrap candidate, not an automatic live write from a read/check path.
- `initFoundationDb()` remains schema-only by default and requires explicit `includeBootstrapSeed: true` through `bootstrapFoundationDb()` for bootstrap seeding.
- Focused proof script is read-only by default and does not mutate backlog, Current Sprint, files, source truth, or external systems.

## Definition Of Done

- `docs/process/approvals/DB-SEED-001.json` exists and validates at score `>= 9.8`.
- `npm run process:db-seed-check -- --json` passes.
- Dogfood proof proves seed/live mutable drift is report-only and not silently overwritten.
- Dogfood proof proves missing live seed rows are classified as bootstrap candidates only.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=DB-SEED-001 --planApprovalRef=docs/process/approvals/DB-SEED-001.json --closeoutKey=db-seed-v1 --commitRef=HEAD` passes before push.
- Live backlog card is `done`, Current Sprint shows the card in `done_this_sprint`, and closeout key `db-seed-v1` is in the build-log registry.

## Details

Implementation path:

1. Add `lib/foundation-backlog-seed.js` exporting `backlogSeed`.
2. Update `lib/foundation-db.js` to import the seed module, keeping existing bootstrap behavior unchanged.
3. Add `lib/foundation-db-seed-governance.js` with constants, drift classification, report-only governance summary, and synthetic dogfood proof.
4. Add `scripts/process-db-seed-check.mjs` as the focused read-only proof.
5. Register `process:db-seed-check` in `package.json`.
6. Add thin `scripts/foundation-verify.mjs` coverage that delegates behavior proof to the governance helper.
7. Add closeout record and update rebuild docs/current sprint truth.

Existing work reused:

- Existing code: `getBacklogSeedDriftSnapshot()`, `normalizeBacklogScopeKey()`, `mapBacklogRow()`, `initFoundationDb()`, `bootstrapFoundationDb()`, `FOUNDATION-DB-INIT-SEED-SPLIT-001` dogfood proof, Current Sprint helpers, and Plan Critic/build-log patterns.
- Existing docs: `docs/handoffs/nightly-deep-audit-2026-05-14.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `foundation:db-bootstrap`, `backlog:hygiene`, `foundation:verify`, and the current focused proof script pattern.
- Existing policy: live Postgres/API is operational truth; seed files are bootstrap/default doctrine until an explicit migration or approved sync promotes a change.

Split plan for oversized files: `lib/foundation-db.js` is over the active danger line, so this card removes the large backlog seed literal from that file. New behavior lives in small focused modules. `scripts/foundation-verify.mjs` receives only thin delegated coverage.

Actual function path: proof calls `classifyBacklogSeedLiveDrift()`, `buildBacklogSeedGovernanceReport()`, and `buildDbSeedGovernanceDogfoodProof()` directly. Substring-only proof is rejected; source markers can only support the behavior proof.

Gate decision tree: static syntax checks cover changed JS/JSON, focused proof validates real seed governance behavior, and the full ship gate is required because this changes Foundation DB seed ownership, verifier trust, package scripts, docs, Current Sprint truth, and Recent Builds closeout.

## Risks

- Risk: Moving the seed block changes seed behavior.
  - Repair path: the imported `backlogSeed` is byte-preserved from the old inline block except for `export`, and existing bootstrap seeding still receives the same array.
- Risk: This turns into a broad DB rewrite.
  - Repair path: V1 only extracts backlog seed truth and adds governance proof. It does not split every seed table, rewrite schema setup, or redesign migrations.
- Risk: Seed governance becomes another auto-sync path.
  - Repair path: V1 is report-only. Dogfood proves default mutable drift does not become a write.
- Risk: The verifier monolith grows again.
  - Repair path: verifier receives only thin coverage; behavior stays in the focused module and script.

## Tests

Run in order:

```bash
node --check lib/foundation-backlog-seed.js lib/foundation-db-seed-governance.js scripts/process-db-seed-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs
npm run process:db-seed-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DB-SEED-001 --planApprovalRef=docs/process/approvals/DB-SEED-001.json --closeoutKey=db-seed-v1 --commitRef=HEAD
```

Not next: rewriting every seed table, broad Foundation DB rewrite, runtime migrations framework, auto-syncing seed into live backlog, live-state mutation from verifier/check paths, Marketing Video Lab live routes, hub UI, Build Intel extraction, paid-source auth, Meeting Vault Phase B, or Drive permission mutation.
