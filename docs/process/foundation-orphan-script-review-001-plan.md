# FOUNDATION-ORPHAN-SCRIPT-REVIEW-001 Plan

## What

Close the orphan-script audit item without deleting first. V1 records owner-backed keep decisions for the named candidates:

- `scripts/codex-chat.sh`
- `scripts/codex-chat-top.sh`
- `scripts/codex-status.mjs`
- `scripts/generate-doc-indexes.mjs`
- `scripts/inspect-weekly-actuals.mjs`
- `scripts/run-supervised-paid-source-map.mjs`
- `scripts/sync-zoom-text-archive.mjs`

This is a review and guardrail card. It does not move, delete, archive, or thin any script.

## Why

The audit found that orphan/dead-code signal is polluted by local entrypoints, package scripts, manual source diagnostics, and private/runtime state. The failure mode to avoid is treating a zero-incoming file edge as permission to delete a live operator tool or source proof lane.

Useful operator behavior is simple: each named script should have a clear owner, classification, keep/retire/repoint decision, reference evidence, and protected-script guardrail. Then future cleanup can use the registry instead of guessing from a noisy dependency map.

Steve needs speed with quality here: the real workflow is being able to clean up old tooling without worrying that a live Codex status footer, source/browser proof runner, or manual source diagnostic was removed because an import graph looked quiet.

## Acceptance Criteria

- Every named candidate file exists and remains tracked.
- Every named candidate has a decision, owner, classification, and rationale.
- `scripts/codex-status.mjs` is explicitly kept as a protected live operator tool.
- `scripts/run-supervised-paid-source-map.mjs` is explicitly kept as protected source/browser proof lane infrastructure.
- `scripts/sync-zoom-text-archive.mjs` is identified as write-capable/manual archive sync instead of hidden under dead-code language.
- The focused proof checks reference evidence or explicit local-entrypoint posture for every candidate.
- Dogfood rejects a protected delete-first fixture and an unsupported keep decision with no references.
- No script is deleted, archived, renamed, or repointed in this V1.
- Current Sprint advances to the next non-hub tune-up card only after proof passes.

## Definition Of Done

- Add `lib/foundation-orphan-script-review.js` with the candidate manifest, evaluator, dogfood proof, and snapshot proof.
- Add `scripts/process-foundation-orphan-script-review-check.mjs`.
- Add package script `process:foundation-orphan-script-review-check`.
- Add approval and closeout record for `foundation-orphan-script-review-v1`.
- Focused proof, tune-up roadmap proof, builder-memory proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Details

Existing code reused:

- `scripts/process-foundation-tuneup-roadmap-check.mjs` for the live tune-up card definition.
- Current Sprint DB helpers, Plan Critic, approval integrity, process write guard, and build closeout log.
- Git tracked-file truth for whether each candidate still exists and is tracked.

Existing docs, existing scripts, and live backlog truth reused:

- Existing docs: the audit supplement, source-session broker plan, source notes, handoffs, and docs index references that already explain why these scripts exist.
- Existing scripts: the seven named candidate scripts, the tune-up roadmap proof script, and the focused process-check pattern used by the previous tune-up cards.
- Live backlog and Current Sprint: `FOUNDATION-ORPHAN-SCRIPT-REVIEW-001`, `FOUNDATION-TUNEUP-2026-05-29`, and the next non-hub card are read from live state instead of chat memory.

The focused proof scans tracked text files for references to each script path or basename. Local operator entrypoints can be kept with explicit `allowLocalEntrypoint` posture because their correct incoming edge is a human shell command, not a repo import.

The decisions for V1 are:

- keep `codex-chat.sh` as a local operator entrypoint
- keep `codex-chat-top.sh` as its support shim
- keep `codex-status.mjs` as protected live operator status tooling
- keep `generate-doc-indexes.mjs` as manual docs index utility
- keep `inspect-weekly-actuals.mjs` as manual Finance source diagnostic
- keep `run-supervised-paid-source-map.mjs` as protected source/browser proof infrastructure
- keep `sync-zoom-text-archive.mjs` as guarded manual archive sync, with write-capable status named plainly

Gate decision tree by blast radius:

- Static gate: `node --check` for the new library and checker.
- Focused gate: `npm run process:foundation-orphan-script-review-check -- --json` for default iteration because this card is a process/registry review and does not change runtime script behavior.
- Full gate: `foundation:verify` and `process:foundation-ship` before push because the card changes Foundation closeout/process truth and live Current Sprint state.

The proof is behavior-oriented, not substring-only: it calls the candidate evaluator over tracked file records, counts real references or explicit local-entrypoint posture, dogfoods a protected delete-first fixture, and dogfoods an unsupported keep decision with no references. No substring-only proof is accepted; substring-only proof is rejected.

## Risks

Risk: a protected tool is deleted because the dependency map shows zero incoming imports. Repair path: protected scripts must be keep decisions, and the dogfood proof rejects delete-first decisions.

Risk: local operator entrypoints look unused because they are called from a shell, not imported by code. Repair path: explicit local-entrypoint posture is allowed only with owner and behavior signals.

Risk: a write-capable manual utility is mistaken for harmless dead code. Repair path: classify `sync-zoom-text-archive.mjs` as write-capable manual archive sync and leave any future guard tightening to a separate card.

Risk: this turns into cleanup, deletion, verifier archive work, or per-hub restructuring. Repair path: no files are deleted or moved; `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains parked for Steve checkpoint.

## Tests

- `node --check lib/foundation-orphan-script-review.js`
- `node --check scripts/process-foundation-orphan-script-review-check.mjs`
- `npm run process:foundation-orphan-script-review-check -- --json`
- `npm run process:foundation-orphan-script-review-check -- --apply --stage=building_now --json`
- `npm run process:foundation-orphan-script-review-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-ORPHAN-SCRIPT-REVIEW-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ORPHAN-SCRIPT-REVIEW-001.json --closeoutKey=foundation-orphan-script-review-v1 --commitRef=HEAD`

## Not Next

Do not delete, archive, rename, or move the reviewed scripts in this card. Do not delete `scripts/codex-status.mjs`. Do not bulk-delete verifier/approval/plan/check/closeout files. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not work `MEETING-VAULT-ACL-001` Phase B. Do not mutate Drive permissions. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems. Do not touch or weaken `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`, source-session readiness, local-browser route policy, Dev Hub System Truth, `/api/foundation/dev-team-hub`, or any source/browser proof lane.
