# FOUNDATION-TUNEUP-REMAP-PROOF-001 Plan

## What

Build a bounded V1 before/after remap proof for `FOUNDATION-TUNEUP-REMAP-PROOF-001`. The card reruns the AIOS-owned codebase map, compares audit baseline signals to live repo facts, and closes the overnight tune-up sequence without starting the per-hub folder restructure.

No generated graph is committed; this V1 has a no generated graph boundary. No third-party map plugin is installed. No private memory or local runtime state is read.

## Why

The audit plan only matters if the system can prove the tune-up changed real collision and bloat signals. The root invariant is not "a report says we improved"; the root invariant is that live repo facts show lower shared-file pressure, visible remaining risk, and the next large restructure parked behind a Steve checkpoint.

Steve needs speed with quality. The useful operator behavior is waking up to a current, source-backed before/after read instead of another chat claim. This V1 is a fast, proportional proof that shows what got better, what is still open, and where to stop.

## Acceptance Criteria

- The existing AIOS-owned codebase map runs healthy and remains privacy-safe.
- The map includes critical source-browser/runtime/verifier/dev-hub surfaces.
- Foundation DB facade import pressure is compared against the audit baseline of 551 importers.
- Dev CSS line count is compared against the audit baseline of 4,998 lines and confirms the split CSS modules exist.
- Remaining oversized files are listed as visible risk, not hidden or renamed as done.
- Safe tune-up cards before remap are closed in live backlog.
- `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains scoped/checkpoint-only, not executing.
- Current Sprint advances only to the per-hub checkpoint after the remap proof closes.

## Definition Of Done

- Repair the existing codebase map proof if it has stale script-slice assumptions.
- Add `lib/foundation-tuneup-remap-proof.js` with the before/after snapshot and dogfood proof.
- Add `scripts/process-foundation-tuneup-remap-proof-check.mjs`.
- Add package script `process:foundation-tuneup-remap-proof-check`.
- Add the checkpoint card to the Foundation progression registry so historical sprint checks accept the stopped-at-checkpoint state.
- Add approval and closeout record for `foundation-tuneup-remap-proof-v1`.
- Focused proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

Existing code reused:

- `lib/agentic-codebase-map.js` for the deterministic read-only repo map.
- `scripts/process-agentic-codebase-map-check.mjs` for existing map proof.
- `scripts/process-foundation-tuneup-roadmap-check.mjs` for the ordered tune-up card definitions.
- Current Sprint DB helpers, Plan Critic, approval integrity, process write guard, and build closeout log.
- Git tracked-file truth for code and line-count boundaries.

Existing docs, existing scripts, and live backlog truth reused:

- Existing docs: the tune-up plan, `docs/process/agentic-codebase-map-001-plan.md`, rebuild current plan/state, and source notes about Understand-Anything.
- Existing scripts: agentic map proof, import-ownership proof, oversized file split proof, roadmap proof, builder-memory proof, backlog hygiene, and Foundation ship gate.
- Live backlog and Current Sprint: `FOUNDATION-TUNEUP-REMAP-PROOF-001`, the eight closed safe tune-up cards, and `FOUNDATION-HUB-FOLDER-ISOLATION-001` are read from live state instead of chat memory.

Gate decision tree by blast radius:

- Static gate: `node --check` for changed modules and checker.
- Focused gate: `npm run process:foundation-tuneup-remap-proof-check -- --json` for default iteration because the proof is read-only except explicit live closeout writes.
- Full gate: `foundation:verify` and `process:foundation-ship` before push because the card changes Foundation closeout/process truth, package scripts, and live Current Sprint state.

The proof is behavior-oriented, not substring-only: it runs the actual codebase map function, scans tracked repo files, counts real Foundation DB facade imports, counts real file lines, reads live backlog lanes, and dogfoods unreduced import pressure plus accidentally started per-hub implementation. No substring-only proof is accepted; substring-only proof is rejected.

## Risks

Risk: the proof overclaims the tune-up as finished while wrappers and oversized files remain. Repair path: list remaining size risks and known limits; only claim the measured improvements.

Risk: remap closure starts the per-hub restructure while Steve is asleep. Repair path: close-card sets `FOUNDATION-HUB-FOLDER-ISOLATION-001` to scoped/checkpoint-only with explicit not-next boundaries.

Risk: generated graph or private state leaks into repo truth. Repair path: reuse the AIOS-owned map, exclude private/local/archive paths, and commit no `.understand-anything` artifact.

Risk: this becomes another paperwork receipt. Repair path: focused proof must compare live repo facts to audit baselines and full ship must verify served code, Current Sprint, live backlog, and closeout readback.

## Tests

- `node --check lib/agentic-codebase-map.js`
- `node --check lib/foundation-tuneup-remap-proof.js`
- `node --check scripts/process-foundation-tuneup-remap-proof-check.mjs`
- `npm run process:agentic-codebase-map-check -- --json`
- `npm run process:foundation-tuneup-remap-proof-check -- --json`
- `npm run process:foundation-tuneup-remap-proof-check -- --apply --stage=building_now --json`
- `npm run process:foundation-tuneup-remap-proof-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-TUNEUP-REMAP-PROOF-001 --planApprovalRef=docs/process/approvals/FOUNDATION-TUNEUP-REMAP-PROOF-001.json --closeoutKey=foundation-tuneup-remap-proof-v1 --commitRef=HEAD`

## Not Next

Do not start per-hub folder implementation without Steve checkpoint. Do not delete verifier/approval/plan/check/closeout files. Do not delete `scripts/codex-status.mjs`. Do not move docs, generated graphs, private memory, or local runtime state into tracked repo truth. Do not install Understand-Anything or any third-party code graph plugin in this card. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems. Do not touch or weaken `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`, source-session readiness, local-browser route policy, Dev Hub System Truth, `/api/foundation/dev-team-hub`, or any source/browser proof lane.
