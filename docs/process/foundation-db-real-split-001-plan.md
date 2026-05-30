# FOUNDATION-DB-REAL-SPLIT-001 Plan

## What

Build the real Foundation DB ownership split after the import-ownership rail pass proved to be shim-only. Move behavior out of `lib/foundation-db.js` into the eight domain import targets, remove `server.js` direct facade usage, and keep the old facade as compatibility only.

This is a bounded V1 repair card, not the per-hub folder restructure.

## Why

The root cause is not missing module names; it is false ownership. The previous card moved imports but left the real DB behavior in one shared facade, so Steve could see a green report while builders still collided on the same file. The root invariant is: a domain import target is only counted as split when its actual function path runs from that domain module or a lower shared core, not from a re-export of `foundation-db.js`.

This unlocks useful operator behavior for Steve: the remap can show whether the system actually got simpler, and the next builder can own a domain file without editing the root facade.

## Acceptance Criteria

- Live Current Sprint points at `FOUNDATION-DB-REAL-SPLIT-001` in `building_now`, and `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains checkpoint-only.
- `server.js` imports domain stores instead of `./lib/foundation-db.js`.
- At least the first real domain extraction slice is implemented in actual modules, not pure `export ... from './foundation-db.js'` shims.
- `lib/foundation-db.js` line count or direct facade import pressure moves down from the re-audit baseline; closeout reports before/after numbers.
- `npm run process:foundation-db-import-ownership-split-check -- --json` and `npm run process:foundation-tuneup-remap-proof-check -- --json` either pass or remain explicitly blocked by named remaining facade-backed domains, not hidden behind `foundation:verify`.
- Runtime behavior proves no regression through focused DB/startup checks before ship, including real API/route behavior through the builder startup packet and Current Sprint function path.

## Definition Of Done

Done means the card has real behavior extraction, not just classification:

- domain modules own executable DB behavior for the extracted slice;
- the compat facade still serves legacy importers;
- `server.js` no longer imports the compat facade;
- red-gate status is honest and wired into focused proof;
- Reduction Mode metrics are reported: `foundation-db.js` lines, direct facade importers, facade-backed domain module count, and server facade status;
- the commit is pushed only after focused proofs and a final `foundation:verify -- --json-summary` attempt.

## Details

Existing code reused:

- `lib/foundation-db-session.js`
- `lib/foundation-backlog-sprint-db.js`
- `lib/foundation-source-crawl-db.js`
- `lib/foundation-intelligence-db.js`
- `lib/foundation-runtime-jobs-db.js`
- `lib/foundation-strategy-docs-db.js`
- `lib/foundation-shared-comms-db.js`
- `lib/foundation-people-sales-db.js`
- store factories already split under `lib/foundation-*-store.js`

Existing docs reused:

- `docs/process/foundation-tuneup-roadmap-001-plan.md`
- `docs/process/foundation-tuneup-remap-proof-001-plan.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Existing scripts reused:

- `scripts/process-foundation-db-import-ownership-split-check.mjs`
- `scripts/process-foundation-tuneup-remap-proof-check.mjs`
- `scripts/process-builder-memory-system-check.mjs`
- `scripts/process-foundation-tuneup-roadmap-check.mjs`

Live backlog and Current Sprint truth reused:

- `FOUNDATION-TUNEUP-ROADMAP-001`
- `FOUNDATION-DB-IMPORT-OWNERSHIP-SPLIT-001`
- `FOUNDATION-TUNEUP-REMAP-PROOF-001`
- `FOUNDATION-HUB-FOLDER-ISOLATION-001`
- live Current Sprint overlay

Implementation order:

1. Seed `REDUCTION-MODE-001`, `FOUNDATION-DB-REAL-SPLIT-001`, the doc/archive lifecycle cards, and the audit-fleet hardening card into live roadmap truth.
2. Extract the shared DB pool/transaction/session core so domain modules do not each create private DB lifecycle logic.
3. Move the lowest-risk domains first: session/core, backlog+sprint, runtime/jobs+LLM, source+crawl, people/feedback/sales.
4. Move remaining domains in smaller follow-up slices if they are still facade-backed: intelligence, shared-comms, strategy/docs.
5. Update the split/remap proofs so they reject shim-only completion and report remaining domain blockers plainly.

Behavior proof is not substring-only. The focused checks must import the actual modules, call real functions, read live DB/API-backed Current Sprint truth, and dogfood a weak shim-only case that must fail closed. String markers can support diagnostics, but no substring-only proof is accepted for closeout.

## Risks

- Risk: circular imports between the compat facade and domain modules. Repair path: keep shared pool/transaction code in `foundation-db-core.js` and let both facade and domains depend downward on core.
- Risk: a domain module accidentally creates a second operational DB lifecycle. Repair path: domain modules share `foundationPoolHandle`, `withFoundationTransaction`, and `insertChangeEvent`.
- Risk: proof turns green while three domains remain shim-backed. Repair path: the split check must list facade-backed domains as blockers until moved or explicitly parked.
- Risk: per-hub restructure starts too early. Repair path: Current Sprint and plan boundaries keep `FOUNDATION-HUB-FOLDER-ISOLATION-001` scoped only.
- Risk: a cleanup card grows the system again. Repair path: Reduction Mode requires before/after metrics and scaffold ownership.

## Tests

Static checks:

```bash
node --check lib/foundation-db-core.js
node --check lib/foundation-db.js
node --check lib/foundation-db-session.js
node --check lib/foundation-backlog-sprint-db.js
node --check lib/foundation-source-crawl-db.js
node --check lib/foundation-intelligence-db.js
node --check lib/foundation-runtime-jobs-db.js
node --check lib/foundation-strategy-docs-db.js
node --check lib/foundation-shared-comms-db.js
node --check lib/foundation-people-sales-db.js
node --check server.js
```

Focused behavior checks:

```bash
npm run process:foundation-tuneup-roadmap-check -- --json
npm run process:foundation-db-import-ownership-split-check -- --json
npm run process:foundation-tuneup-remap-proof-check -- --json
npm run process:builder-memory-system-check -- --json
npm run backlog:hygiene -- --json
```

Final gate:

```bash
npm run foundation:verify -- --json-summary
```

## Gate Decision

Full gate. This touches the DB facade, server imports, package-controlled focused proofs, Current Sprint truth, and runtime DB access. Static checks and focused checks run first; `foundation:verify -- --json-summary` is required before final handoff, with any failure reported instead of hidden.

The focused split/remap checks must stay fast and proportional: default checks should finish under 2 minutes and avoid another heavy all-system loop while iterating. Full `foundation:verify` remains the final gate, not the inner-loop proof.

## Operator Value

Steve gets a build surface that stops claiming a shim pass is a completed split. The next remap should show the difference plainly: fewer direct facade importers, fewer facade-backed domains, and a clear blocker list before per-hub work starts.
