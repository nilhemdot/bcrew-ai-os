# Parallel Builder Operating System V1

Card: `PARALLEL-BUILDER-OPERATING-SYSTEM-001`

Closeout key: `parallel-builder-operating-system-v1`

## Operating Rule

Parallel building is visible by default. Steve should be able to see the orchestrator chat and each builder chat/terminal directly. Hidden subagents are forbidden by default and require explicit Steve approval for the exact bounded use.

This protocol does not launch parallel builders. It defines the rules to use before launch.

## Assignment Rules

- One visible chat per builder.
- One known repo/worktree per builder.
- One branch per independent builder.
- One active card per builder unless the orchestrator explicitly assigns a queue.
- One declared file/module ownership list per builder.
- Shared files require a lock before edit, commit, push, or merge.
- Every builder wraps with dirty state, changed files, commits, proof, blockers, and next action.
- Every restarted builder continues from repo truth before doing new work.
- External side effects require explicit approval and are not part of this card.

Shared files include `package.json`, `package-lock.json`, `server.js`, `scripts/foundation-verify.mjs`, `lib/foundation-verify-coverage-card-ids.js`, `docs/process/*`, `docs/rebuild/*`, `lib/foundation-*`, and `scripts/process-*`.

## Who Owns What

| Builder | Chat | Repo/Worktree | Branch | Active Card | Owns | Shared Locks | Dirty State | Last Proof | Next Report |
|---|---|---|---|---|---|---|---|---|---|
| Orchestrator | visible | /Users/bensoncrew/bcrew-ai-os | foundation/system-health-red-to-green-001 | queue control | assignments, merge order | package/docs/process when locked | clean | foundation:verify | assignment update |
| Foundation Builder A | visible | /Users/bensoncrew/worktrees/foundation-builder-a | foundation/builder-a-card-id | card id | declared files only | none until granted | clean | focused proof | wrap/blocker |
| Feature/Preflight Builder B | visible | /Users/bensoncrew/worktrees/feature-preflight-builder-b | foundation/builder-b-card-id | card id | declared files only | none until granted | clean | focused proof | wrap/blocker |
| Review/Audit Builder C | visible | /Users/bensoncrew/worktrees/review-audit-builder-c | foundation/builder-c-card-id | card id | read-only or declared docs | none until granted | clean | audit proof | wrap/blocker |

## Orchestrator Assignment Format

```text
Builder:
Visible chat:
Repo/worktree:
Branch:
Base commit:
Active card:
File/module ownership:
Shared-file locks:
Forbidden work:
Proof commands:
Commit/push owner:
Merge order:
Wrap report due:
Crash/restart instruction:
```

## Status Report Format

```text
Builder:
Card:
Branch:
Worktree:
Current step:
Changed files:
Dirty state:
Proof run:
Shared locks held:
Blockers:
Next action:
```

## Wrap Report Format

```text
Builder:
Card:
Branch/worktree:
Final dirty state:
Changed files:
Commits:
Proof:
Shared locks released:
Closeout/handoff:
Blockers:
Next safe card:
```

## Blocker Report Format

```text
Builder:
Card:
Blocker:
What I tried:
Files touched:
Dirty state:
Approval needed:
Safe next Foundation-up card:
```

## Merge Order

1. Builder posts wrap report.
2. Orchestrator checks branch, worktree, dirty state, changed files, shared locks, and proof.
3. Shared files merge first only when the lock owner confirms release.
4. Lowest-overlap branches merge before broad shared-file branches.
5. After each merge, orchestrator runs the relevant focused proof and updates the ownership table.
6. Final merge to the main Foundation lane requires clean worktree, closeout, and ship proof.

## Hidden Subagents

Hidden subagents are forbidden by default.

Allowed only when:

- Steve explicitly approves that exact hidden subagent use.
- The work is bounded, sidecar, and not the critical shipping lane.
- The assignment records the approval reference.
- The parent chat remains accountable for integration, proof, and commit/push.

Forbidden when:

- Steve asked for visible builders.
- The worker needs to commit/push directly.
- The worker may touch shared files.
- The worker may need real repo/worktree/branch ownership.
- The work involves side effects, live extraction, auth-required runs, external writes, or dirty-state ambiguity.

## Paste-Ready Prompts

### Orchestrator chat prompt

You are the visible Foundation orchestrator. Do not spawn hidden subagents unless Steve explicitly approves that exact use.

Assign each builder one visible chat, one known worktree, one branch, one active card, declared file/module ownership, shared-file locks, proof commands, and a wrap report requirement.

Before assigning work, post the who-owns-what table. Before merge, require clean status, changed files, proof output, shared-file lock release, and closeout/wrap report.

### Foundation Builder A prompt

Work only in the assigned repo/worktree/branch and only on the assigned Foundation card.

Do not edit files outside the declared ownership list. Request a shared-file lock before touching package.json, docs/process, docs/rebuild, scripts/foundation-verify.mjs, or lib/foundation-* shared surfaces.

Do not spawn hidden subagents. Continue from repo truth after every restart. End with a wrap report that includes dirty state, changed files, commits, proof, blockers, and next action.

### Feature/Preflight Builder B prompt

Work only in the assigned visible worktree and feature/preflight branch. Stay out of the main Foundation lane unless the orchestrator grants a shared lock.

Preflight, scoped feature prep, or proof-only work is allowed; external side effects, live extraction, paid/auth runs, Drive permission mutation, and Agent Feedback auto-send are not.

Report blockers immediately with the blocker format and stop before touching shared files without coordination.

### Review/Audit Builder C prompt

Work as a visible review/audit builder in the assigned worktree/branch. Prefer read-only inspection unless the assignment explicitly declares write scopes.

Do not convert findings into fixes unless the card scopes that repair. Do not launch hidden subagents.

Wrap with findings, evidence paths, proof commands, dirty state, and clear next cards.
