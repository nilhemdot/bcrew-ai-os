# FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 Plan

Card: `FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001`
Closeout key: `foundation-backlog-seed-chunk-split-v1`

## What

Split the static `lib/foundation-backlog-seed.js` root into bounded chunk modules while preserving the public `backlogSeed` import contract.

This is a root-file cleanup card. It does not change backlog semantics, promote seed changes, repair live Postgres rows, run extraction, or mutate external systems.

## Why

After the DB/schema/store splits and critical roots Phase 4, `lib/foundation-backlog-seed.js` remained above the 3,000-line architecture-risk threshold. The file is static bootstrap/default doctrine, but it is still a collision-heavy root because every seed edit touches one giant module.

Useful operator behavior: the useful thing for the operator is faster, lower-risk seed review in the real workflow. This unlocks speed and quality for Steve and the team because future builders can add or review seed entries in bounded chunk files, while runtime consumers keep importing `backlogSeed` from the same module path. Verifier source checks also keep reading the full seed source bundle, so historical proof does not go false-red just because ownership moved.

## Acceptance Criteria

- Live backlog card exists with rich context for `FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001`.
- Plan and approval exist.
- `lib/foundation-backlog-seed.js` is below 3,000 lines.
- Every seed chunk is below 1,500 lines.
- Existing `import { backlogSeed } from './foundation-backlog-seed.js'` consumers keep working.
- The exported seed row count, first ID, last ID, and unique IDs are preserved.
- Verifier/source proof reads the seed source bundle, not only the aggregator file.
- Focused dogfood rejects:
  - the pre-split monolithic seed root,
  - missing verifier source chunks,
  - duplicate seed IDs.
- No live backlog rows are repaired, overwritten, bootstrapped, or synced by this card.
- Full Foundation verifier and ship gate pass before push.

## Definition Of Done

- `lib/foundation-backlog-seed.js` becomes a small aggregator that preserves the `backlogSeed` export.
- `lib/foundation-backlog-seed-chunks/` owns bounded static seed chunks.
- `lib/foundation-backlog-seed-source.js` owns source-bundle path wiring for verifier/proof scripts.
- Verifier/status helpers and proof scripts that need seed source text read the full source bundle.
- `lib/foundation-backlog-seed-chunk-split.js` and `scripts/process-foundation-backlog-seed-chunk-split-check.mjs` validate the split.
- Closeout registry, verifier coverage, package script, handoff, backlog card, and Current Sprint metadata are updated.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- Existing code: `lib/foundation-db-schema-seed-store.js` imports `backlogSeed` and should keep the same import path.
- Existing code: `lib/foundation-db-seed-governance.js` already defines seed/live drift as report-only.
- Existing code: `scripts/foundation-verify.mjs` already uses a verifier source bundle after the snapshot wiring repair.
- Existing docs: `docs/process/db-seed-001-plan.md` says live Postgres/API is operational truth after bootstrap and seed drift must not silently repair live state.
- Existing docs: critical roots Phase 1-4 define the file-size discipline.
- Existing scripts: `process:foundation-ship`, `foundation:verify`, `backlog:hygiene`, approval integrity, Plan Critic, and process write guard remain the ship path.

Implementation details:

- Mechanically split the existing seed objects into five chunk modules.
- Keep `lib/foundation-backlog-seed.js` as an aggregator exporting `backlogSeed`.
- Add a seed source-bundle helper so source-based verifier checks read the aggregator and chunks together.
- Update focused proof scripts that previously read only `lib/foundation-backlog-seed.js`.
- Do not edit the seed row content except mechanical indentation/ownership movement.

## Risks

- Risk: source-based verifier checks go false-red after the root no longer contains every seed snippet. Mitigation: verifier/proof scripts read the seed source bundle helper.
- Risk: runtime seeding changes because the data split drops or duplicates a row. Mitigation: focused proof imports the real `backlogSeed`, checks row count and unique IDs, and runs `node --check`.
- Risk: this drifts into live backlog repair. Mitigation: proof and plan explicitly reject bootstrap/sync/repair behavior; live writes are limited to this card, Plan Critic row, and Current Sprint metadata through the process write guard.
- Risk: root size moves into oversized chunks. Mitigation: chunks must stay below 1,500 lines.

Repair path / rollback: if proof fails or verifier source bundle coverage regresses, stop before push, keep the card executing, restore the previous seed import contract from git, and repair the chunk/source-bundle wiring. Do not bypass the ship gate or mark the card done.

## Tests

```bash
node --check lib/foundation-backlog-seed.js lib/foundation-backlog-seed-source.js lib/foundation-backlog-seed-chunks/*.js lib/foundation-backlog-seed-chunk-split.js lib/foundation-followup-card-capture.js scripts/process-foundation-backlog-seed-chunk-split-check.mjs scripts/foundation-verify.mjs scripts/process-verification-runs-check.mjs scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs scripts/process-verifier-intelligence-spine-split-module-check.mjs scripts/process-verifier-source-trust-split-module-check.mjs
npm run process:foundation-backlog-seed-chunk-split-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run process:ship-check -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001.json --closeoutKey=foundation-backlog-seed-chunk-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --closeoutKey=foundation-backlog-seed-chunk-split-v1
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001.json --closeoutKey=foundation-backlog-seed-chunk-split-v1 --commitRef=HEAD
```

Gate decision tree:

- Static gate: `node --check` for every changed JS module and script.
- Focused gate: `npm run process:foundation-backlog-seed-chunk-split-check -- --close-card --json`.
- Full gate: `foundation:verify` and `process:foundation-ship` because this touches seed ownership, verifier source wiring, package scripts, closeout registry, and live backlog/current sprint metadata.
- Speed bound: the focused proof is source/local DB only and should stay under 2 minutes; the full verifier runs once before closeout and again through `process:foundation-ship`.

## Not Next

- Do not change backlog card semantics or seed row content.
- Do not bootstrap, repair, sync, or overwrite live Postgres backlog truth.
- Do not run live extraction, paid/auth-required jobs, external sends, Drive permission mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.
- Do not mutate Google Drive permissions.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- Do not launch parallel builders or hidden subagents.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
