# Parallel Builder Merge Lane Enforcement V1

Card: `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`

Closeout key: `parallel-builder-merge-lane-enforcement-v1`

Status: P0 process gate.

## Rule

Parallel builders may run only when the lane table, ownership table, and merge queue are explicit.

Completed cards cannot sit outside `main` as informal branch inventory. Every completed card or tight bundle must enter the merge queue, merge to `main` one at a time, verify `main` after merge, and either continue or pause with a repair card.

This card does not launch parallel builders. It creates the enforcement gate required before that can happen again.

## Lanes

### Main Session

- Owns sprint order, operator status, blocker calls, and lane assignments.
- Works from `main`.
- Does not directly merge worker branches without review/integration lane proof.
- Keeps Current Sprint accurate.

### Worker Branch/Worktree

- One visible builder chat.
- One known worktree.
- One branch.
- One active card or explicit tight bundle.
- One declared file/module ownership list.
- No shared-file edit without a lock.
- No completed card left outside the queue.

### Review/Integration Lane

- Owns merge queue intake.
- Rejects dirty, unproven, unclosed, conflicting, false-done, or approval-bound work.
- Serializes merges to `main`.
- Runs post-merge main verification.
- Pauses the queue if `main` fails and routes the repair card.

## Required Queue Entry

A completed card or bundle can enter the merge queue only with:

- card or bundle id
- builder assignment id
- branch and worktree
- closeout reference
- focused proof reference
- full ship/process gate proof reference
- conflict or fast-forward check result
- approval-bound work classification
- changed files
- post-merge verification requirement
- owner for merge and push

## Hard Blocks

The lane gate rejects:

- two independent builders in the same worktree
- two independent builders on the same branch
- overlapping file ownership without rerouting
- hidden or untracked builders
- completed work missing a merge queue entry
- multiple active merges to `main`
- merged work without post-merge `foundation:verify`
- failing `main` without paused queue and repair card
- more than 20 commits or completed cards stacked outside `main` without explicit release-train approval
- blocked workers continuing on conflicting files

## Blocker Handoff

A blocked worker can continue only when the blocker report names:

- blocked card
- blocker
- what was tried
- needed decision
- safe next card
- blocked file scope
- safe next file scope

The safe next scope must not overlap the blocked scope.

## Post-Merge Rule

After each merge to `main`, run the focused proof for the card or bundle, `backlog:hygiene`, `foundation:verify`, and served-code/main alignment proof when the card touches served surfaces.

If any of those fail, the queue pauses. No later worker branch merges until a repair card is live and the failed main state is resolved.

## Current Dogfood

The focused proof simulates the failure modes that created the prior pileup:

- same worktree
- same branch
- overlapping ownership
- untracked builder
- missing queue entry
- simultaneous merges
- missing post-merge verification
- failed main with no repair route
- 108-card branch pileup
- blocked worker continuing on conflicting files

Each one must fail closed before this card is accepted.
