# FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001 Plan

## What

Build a bounded V1 doc consolidation proof for `FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001`. The card classifies tracked markdown into canonical truth, supporting docs, active handoffs/audits, plan history, and archive buckets.

Do not delete docs. Do not move docs. Do not shrink useful social, audit, handoff, source, or process material into a tiny summary in this V1.

## Why

The audit found about 1,492 docs and warned that competing truth can hide inside old handoffs, audits, and process notes. The root cause is not that too many words exist; the root invariant is that the system must know which docs are canonical operating truth and which docs are supporting evidence or archive.

Steve needs speed with quality. The useful operator behavior is a real workflow where a builder can ask "what is current truth?" without deleting reusable content or making Steve reread a year of notes. This V1 unlocks safe morning remap and future doc cleanup by turning doc posture into a fast, proportional focused check.

## Acceptance Criteria

- Tracked markdown is scanned from git truth, not private memory or untracked local state.
- `AGENTS.md`, `SOUL.md`, repo readmes, strategy docs, and rebuild current-state/current-plan docs are explicit canonical paths.
- `docs/_archive/` and `docs/rebuild/plan-history/` remain preserved evidence, not deletion candidates.
- Hot `docs/handoffs/` and `docs/audits/` stay visible as active readback areas instead of being buried.
- Competing current-truth language in non-canonical, non-archive docs is bounded and listed for later review.
- The focused proof dogfoods canonical/archive classification and stale-current detection through the actual function path.
- Current Sprint can move from this card to `FOUNDATION-TUNEUP-REMAP-PROOF-001` only after proof passes.

## Definition Of Done

- Add `lib/foundation-doc-consolidation-truth-archive.js` with the classification snapshot and dogfood proof.
- Add `scripts/process-foundation-doc-consolidation-truth-archive-check.mjs`.
- Add package script `process:foundation-doc-consolidation-truth-archive-check`.
- Add approval and closeout record for `foundation-doc-consolidation-truth-archive-v1`.
- Focused proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

Existing code reused:

- `lib/doc-categorization.js` for the existing doc inventory category model.
- `scripts/process-foundation-tuneup-roadmap-check.mjs` for the live tune-up card definition.
- Current Sprint DB helpers, Plan Critic, approval integrity, process write guard, and build closeout log.
- Git tracked-file truth for the doc inventory boundary.

Existing docs, existing scripts, and live backlog truth reused:

- Existing docs: `AGENTS.md`, `SOUL.md`, `README.md`, `docs/INDEX.md`, `docs/README.md`, `docs/business-strategy.md`, `docs/source-registry.md`, `docs/system-strategy.md`, and `docs/rebuild/*` current truth docs.
- Existing scripts: the tune-up roadmap proof script, builder-memory proof script, backlog hygiene, and Foundation ship gate.
- Live backlog and Current Sprint: `FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001`, `FOUNDATION-TUNEUP-2026-05-29`, and `FOUNDATION-TUNEUP-REMAP-PROOF-001` are read from live state instead of chat memory.

Gate decision tree by blast radius:

- Static gate: `node --check` for the new library and checker.
- Focused gate: `npm run process:foundation-doc-consolidation-truth-archive-check -- --json` for default iteration because this V1 classifies docs and does not mutate doc content.
- Full gate: `foundation:verify` and `process:foundation-ship` before push because the card changes Foundation closeout/process truth and live Current Sprint state.

The proof is behavior-oriented, not substring-only: it calls the actual function path over tracked doc records, validates category summaries, dogfoods canonical/archive fixtures, and rejects weak stale-current posture. No substring-only proof is accepted; substring-only proof is rejected.

## Risks

Risk: old docs get deleted because "archive" is misread as "trash." Repair path: the V1 gate fails closed if archive evidence is not preserved; any actual move/delete must be a separate follow-up with a repointed gate.

Risk: canonical truth is still buried among old handoffs. Repair path: competing current-truth wording is listed as review candidates and moved to a follow-up instead of silently accepted.

Risk: this becomes another paperwork gate. Repair path: the focused proof must run real classification behavior over tracked docs, then full ship verifies Current Sprint, live backlog, and closeout readback.

Risk: this drifts into the per-hub restructure or source/browser cleanup. Repair path: `FOUNDATION-HUB-FOLDER-ISOLATION-001` stays parked, source/browser proof lanes stay untouched, and this card only advances to remap proof.

## Tests

- `node --check lib/foundation-doc-consolidation-truth-archive.js`
- `node --check scripts/process-foundation-doc-consolidation-truth-archive-check.mjs`
- `npm run process:foundation-doc-consolidation-truth-archive-check -- --json`
- `npm run process:foundation-doc-consolidation-truth-archive-check -- --apply --stage=building_now --json`
- `npm run process:foundation-doc-consolidation-truth-archive-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DOC-CONSOLIDATION-TRUTH-ARCHIVE-001.json --closeoutKey=foundation-doc-consolidation-truth-archive-v1 --commitRef=HEAD`

## Not Next

Do not delete docs. Do not move docs between hot folders and `docs/_archive` in this card. Do not collapse useful social, audit, handoff, source, or process material into a tiny summary. Do not bulk-delete verifier/approval/plan/check/closeout files. Do not delete `scripts/codex-status.mjs`. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems. Do not touch or weaken `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`, source-session readiness, local-browser route policy, Dev Hub System Truth, `/api/foundation/dev-team-hub`, or any source/browser proof lane.
