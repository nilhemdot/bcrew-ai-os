# Foundation Merge Queue Protocol

Status: V1 process guardrail.

Owner: Foundation Process.

## Rule
Each completed Foundation card or small card bundle must enter an integration queue before it reaches `main`.

The merge lane serializes pushes to main. Only one merge moves at a time. A builder may keep implementing on its branch only when that branch is not already a long-branch integration risk or an explicitly approved release train.

## Queue Entry
A card or bundle can enter the queue only when:

- branch/worktree is clean
- card closeout exists
- focused proof passed
- full ship/process gate passed
- no approval-required or live external action is falsely marked done
- no blocked/returned card is holding the active sprint hostage
- merge conflict or fast-forward check passes
- commit and push ownership are clear

If any item fails, the queue item is blocked and the closeout must name the exact repair card or owner next action.

## Merge Lane
The merge lane:

- serializes pushes to main
- confirms the branch is synced with its remote before merge
- confirms `main` is current before merge
- prefers fast-forward merge when the branch contains `main`
- records the merge decision, proof commands, and commit refs
- pushes main after merge
- must verify main after merge

If main fails after merge, the queue pauses. No later queue item can merge until the failure is repaired or the merge is reverted under an explicit recovery card.

## Long Branches
A branch more than 20 commits ahead of `main` is a red/risk integration state unless explicitly approved as a release train.

Release-train approval must record:

- why multiple completed cards remain outside `main`
- owner of the train
- expected merge window
- branch/worktree location
- rollback or repair path
- proof that no blocked approval-bound work is being marked done

Without that approval, the branch must stop stacking normal card work and enter merge-readiness.

## Parallel Builders
The default parallel model is visible builders in visible chats, one known repo/worktree/branch per builder, with explicit file/module ownership.

Hidden delegated workers are allowed only when Steve explicitly approves the hidden worker, its repo/worktree/branch, write scope, and integration path. Hidden delegated workers are forbidden for default all-day builder lanes, main merge ownership, provider/auth side effects, live extraction, or external writes.

## Approval Boundaries
The merge queue cannot convert blocked work into done work.

Provider proof, live extraction, paid/private access, Drive mutation, Gmail/ClickUp sends, Slack sends, Agent Feedback sends, and other external writes must remain blocked with owner and next action unless Steve explicitly approves the action and the process gate records the proof.

## Current Branch Application
`foundation/system-health-red-to-green-001` is 108 commits ahead of `origin/main`, so it must stop behaving like an open-ended card train. Its next valid path is merge-readiness:

- get branch verification green
- record what shipped and what remains blocked
- merge to main only if gates stay clean
- verify main after merge

If it is not safe to merge, the closeout must name the blocker and the exact card that fixes it.
