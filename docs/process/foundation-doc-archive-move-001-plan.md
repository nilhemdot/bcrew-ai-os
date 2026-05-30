# FOUNDATION-DOC-ARCHIVE-MOVE-001 Plan

## What
Move archive-class docs out of the active docs tree into `docs/_archive` without deleting content. V1 scope is narrow and bounded: only tracked active handoff/audit docs that are cold and either unreferenced or repointed in the same change. This card starts the post-split Reduction Mode cut wave. It does not run a full `/understand` remap first; the remap is the proof after the cut wave has measurable reductions.

## Why
The re-audit showed the last doc pass classified the problem but did not reduce active-tree noise. Active docs should carry current operating truth. Historical handoffs, audits, and receipts can stay searchable under `docs/_archive` while git preserves movement history. Operator value: Steve and the team get a smaller active docs tree, faster current-truth review, and less stale-doc drift without losing audit history. This unlocks a real workflow where a fresh builder can scan current docs for the useful thing now, not re-litigate hundreds of old receipts; the quality signal is better and the review speed improves.

## Acceptance Criteria
- Current Sprint points at `FOUNDATION-DOC-ARCHIVE-MOVE-001` instead of a premature remap stop.
- `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains scoped/checkpoint-only.
- A dry-run move list is based on tracked active docs only, excludes local/private memory, and skips files with live code/process references unless the same change repoints those references.
- The applied move preserves files with `git mv` semantics, not deletion.
- Reduction Mode proof shows active doc count went down before this card can claim done.
- Dogfood rejects a synthetic weak move list that tries to move a referenced active doc without repointing references.

## Definition Of Done
This card is done only when archive-class docs have moved into `docs/_archive`, active doc count is lower than the pre-card count, the move manifest exists, focused doc and sprint proofs pass, and the final remap remains queued before any per-hub folder work.

## Details
Reuse existing code in the doc-consolidation classifier, `getActiveFoundationCurrentSprint`, `upsertFoundationCurrentSprintOverlay`, Plan Critic, process write guards, and git tracked-file inventory. Reuse existing docs: `docs/process/doc-archive-manifest.json`, `docs/process/foundation-doc-consolidation-truth-archive-001-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. Reuse existing scripts: `process:foundation-doc-consolidation-truth-archive-check`, `process:foundation-tuneup-roadmap-check`, `backlog:hygiene`, and `foundation:verify`. Reuse live backlog and Current Sprint truth instead of chat memory.

The behavior proof must use real behavior through an actual function path and focused process path: read tracked docs from git, compute the dry-run move list, verify referenced docs stay parked, verify moved files exist at the archive path, and verify active doc count went down through the same API-style payload the checker returns. It must reject substring-only proof; string matches or marker checks are not accepted without the actual file/path/count behavior. Dogfood uses a synthetic weak plan with a referenced doc and proves the move is rejected before any file movement.

Gate decision: static checks for syntax, focused doc/sprint proofs while building, and full `foundation:verify` plus `process:foundation-ship` for closeout because the blast radius touches docs and Current Sprint truth. The default loop stays fast and proportional: the focused proof should run in under 2 minutes and is not another heavy remap.

## Risks
Risk: moving a doc breaks a verifier that reads it by exact path. Repair path: skip referenced docs unless the same change repoints the verifier or closeout registry. Risk: this becomes broad documentation deletion. Repair path: only move files into `docs/_archive`; do not delete content. Risk: this starts the per-hub restructure early. Repair path: keep `FOUNDATION-HUB-FOLDER-ISOLATION-001` scoped until Steve checkpoints after remap.

## Tests
- `npm run process:foundation-tuneup-roadmap-check -- --apply --mutate-sprint --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:foundation-doc-consolidation-truth-archive-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Not Next
Do not run full `/understand` remap before the cut wave has measured reductions. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001` or per-hub folders. Do not delete docs, verifier files, approval files, plan files, check files, closeout records, or `scripts/codex-status.mjs`. Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, Drive permissions, or external systems.
