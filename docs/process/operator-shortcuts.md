# Operator Shortcuts

This is Steve's prompt cheat sheet for forcing a fresh agent to load the right
AIOS operating protocol before answering. These shortcuts are not magic words.
They are compact commands that tell the agent which repo truth to read first.

## `/dual-track`

Aliases: `/dual track`, `/multi-lane`, `/multi lane build`, `/parallel build`.

Use when Steve wants two or more work lanes active without stepping on each
other.

Agent must do this before answering:

1. Read live repo state:
   - `git status --short --branch`
   - `git worktree list --porcelain`
   - current branch, `HEAD`, and `origin/main`
2. Read the AIOS parallel-builder protocol:
   - `docs/process/foundation-merge-queue-protocol.md`
   - `docs/process/parallel-builder-operating-system-001-protocol.md`
   - `docs/process/parallel-builder-worktree-protocol-001-plan.md`
   - `docs/process/parallel-builder-merge-lane-enforcement-001-plan.md`
3. Check live backlog truth for these cards:
   - `PARALLEL-BUILDER-OPERATING-SYSTEM-001`
   - `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`
   - `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`
   - `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001`
4. State the lane plan in plain English:
   - Builder A worktree, branch, card, write scope
   - Builder B worktree, branch, card, write scope
   - shared files that are locked or forbidden
   - merge order back to `main`
   - proof required before either lane is called shipped

Default rule:

- Parallel work is allowed only through separate worktrees and branches.
- Do not let two builders write the same checkout, same branch, or overlapping
  file scopes.
- One serialized merge lane owns integration back to `main`.

Paste-ready prompt:

```text
/dual-track

Before answering, load AIOS parallel-builder truth:
- git status / HEAD / origin/main
- git worktree list
- docs/process/foundation-merge-queue-protocol.md
- docs/process/parallel-builder-operating-system-001-protocol.md
- docs/process/parallel-builder-worktree-protocol-001-plan.md
- docs/process/parallel-builder-merge-lane-enforcement-001-plan.md
- live backlog rows for PARALLEL-BUILDER-OPERATING-SYSTEM-001,
  PARALLEL-BUILDER-WORKTREE-PROTOCOL-001,
  PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001, and
  EXTRACTION-PARALLEL-WORKER-PROTOCOL-001

Then give me the safe lane plan: worktree, branch, card, write scope, locked
files, merge order, and proof gates. Do not answer from generic caution.
```

## `/builder-status`

Use when Steve asks what the Builder is doing.

Agent must check:

- `git status --short --branch`
- `git log --oneline -5`
- `git worktree list --porcelain`
- Current Sprint API
- System Health
- repeated-failure gate
- live backlog rows for the active blocker and next 3 cards

Answer with:

- current active card
- whether repo is clean, dirty, ahead, or behind
- whether current work is local, committed, pushed, or falsely closed
- whether System Health is green/yellow/red
- whether Steve should interrupt, wait, or send a specific correction

## `/green-check`

Use when Steve wants to know whether the system is fully green.

Agent must run/check sequentially:

- System Health
- repeated-failure gate
- Current Sprint active-card gate
- Foundation plan reconcile
- backlog hygiene if relevant
- `foundation:verify` if a build card is closing
- `process:foundation-ship` only for the lane that owns the build

Answer must distinguish:

- raw green versus classified/excepted green
- transient due/running scheduled jobs versus failed jobs
- repo clean/pushed versus local-only proof

## `/extract-hit-list`

Use when Steve names a video, course, creator, or source that must not get lost.

Agent must:

- check existing watchlist/source contract/backlog truth
- add or enrich the lowest durable layer that fits
- never start extraction unless Steve explicitly approves the run
- record source type, URL/id, creator, approval boundary, and target card

For Build Intel YouTube, default target card is
`YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`.

## `/checkpoint-stab`

Use after a long strategy/build conversation.

Agent must:

- capture new cards or enrich existing cards
- save a handoff if the chat is long enough to lose context
- update AGENTS or process docs only for durable operating rules
- leave private memory local unless Steve explicitly wants repo truth
- report what was saved and where
