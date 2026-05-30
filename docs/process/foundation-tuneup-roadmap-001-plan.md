# FOUNDATION-TUNEUP-ROADMAP-001 Plan

## What
Run the Foundation tune-up from the Claude and Codex audit consensus as live backlog and Current Sprint truth. The Foundation DB real split is closed; the current build card is `FOUNDATION-DOC-ARCHIVE-MOVE-001` so the cut wave keeps moving instead of stopping for a full remap after one card. The proof uses real behavior through the actual function path for Current Sprint status, the DB-backed API payload shape, and focused doc/sprint execution, not marker-only checks.

## Why
Steve needs the plan to load automatically from the repo and live database, not from a disappearing chat. The useful operator value is faster dual-lane work with fewer shared-file collisions while the existing working engine stays intact. The re-audit caught a premature stop condition: a full `/understand` remap after the DB split would waste time because the remaining cut-wave counts have not moved yet. This plan keeps remap as the pre-per-hub proof after measured reductions.

## Acceptance Criteria
- The live backlog contains the tune-up epic and phase cards in the agreed order.
- The live Current Sprint is healthy and points at `FOUNDATION-DOC-ARCHIVE-MOVE-001` as the only Building Now card.
- Future phases stay scoped until their specific plan and proof are reviewed; the per-hub folder restructure waits for Steve.
- Full `/understand` remap stays queued until reduction metrics move across the cut wave.
- The focused proof rejects drift in domain import targets, protects `scripts/codex-status.mjs`, and preserves the real source/browser proof lane and honest Dev Hub System Truth posture.

## Definition Of Done
The roadmap repair is done for this slice when the live sprint no longer tells builders to remap after one completed DB card, `FOUNDATION-DOC-ARCHIVE-MOVE-001` is the active cut-wave card, startup memory sees the corrected next action, backlog hygiene is green, and the sprint status is healthy from the real Current Sprint function path.

## Details
Reuse existing code in `getActiveFoundationCurrentSprint`, `upsertFoundationCurrentSprintOverlay`, `buildFoundationCurrentSprintStatus`, `process-write-guard`, and the focused proof scripts. Reuse existing docs and policy from `AGENTS.md`, `CLAUDE.md`, current plan/state, live backlog truth, and the Foundation doctrine that Current Sprint is an overlay on live backlog truth.

The root invariant is not "make the verifier quiet." The check should prove that the live Current Sprint has enough metadata, not-next boundaries, existing-work doctrine, and Plan Critic proof to be healthy while the active card remains narrow. A synthetic weak outcome is a sprint seeded from chat with missing exit criteria, missing Drive/Meeting Vault boundaries, missing existing-work fields, or no Plan Critic row; that must fail instead of being hidden. Dogfood rejects weak sprint seeding and premature hub/remap drift by proving the actual function/API path reports risk until the missing data is fixed.

Gate decision: choose static, focused, or full verification from blast radius. This slice is Foundation control-plane risk because it touches live Current Sprint and roadmap proof. Use the focused roadmap/doc proofs while building, then use `foundation:verify` and the ship path before closeout. The default loop stays fast and proportional: the focused checks run first, and the full gate is reserved for closeout or high-blast-radius changes.

## Risks
The main risk is confusing a proof checkpoint with sprint-ready work. Repair path: keep remap queued until the cut wave has reductions and keep future cards in Scoping until their own plans pass; if a proof fails, fail closed and park the card instead of weakening the gate. Do not use active-sprint or current-blocker shortcuts to force pass. Do not archive verifier/check files until the gate is repointed in the same change.

## Tests
- `npm run process:foundation-tuneup-roadmap-check -- --apply --mutate-sprint --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:foundation-doc-consolidation-truth-archive-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Not Next
Do not run a full `/understand` remap after every individual card. Do not start the per-hub folder restructure before Steve checkpoints. Do not bulk-delete verifier, approval, plan, or check files. Do not delete `scripts/codex-status.mjs`. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not broaden into source extraction, Browserbase, sales, agent feedback, or external writes.
