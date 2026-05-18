# PARALLEL-BUILDER-OPERATING-SYSTEM-001 Plan

Card: `PARALLEL-BUILDER-OPERATING-SYSTEM-001`

Closeout key: `parallel-builder-operating-system-v1`

## What

Create the visible parallel builder operating system Steve requested after the Planck incident. This is the layer above `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`: it defines how the orchestrator assigns multiple visible builder chats, how each builder declares worktree/branch/file ownership, how shared files are locked, how commits/merges are owned, how status/wrap/blocker reports are shaped, and when hidden subagents are forbidden or explicitly allowed.

This card does not launch parallel builders. It creates the protocol, prompts, and proof needed before 2-3 builders run at once.

## Why

Steve wants a real parallel builder operating system by tomorrow. The desired model is visible builder chats in known repos/worktrees/branches, with an orchestrator assigning work and Steve able to see each terminal/chat directly.

The Planck incident exposed the failure mode: a main chat interpreted "new builder" as permission to spawn a hidden delegated worker. That creates confusion and can create repo, branch, integration, dirty-state, and commit/push risk. The system needs durable rules that fail closed before hours are lost to hidden or colliding work.

## Acceptance Criteria

- Live backlog card exists with rich context.
- Plan and approval exist at 9.8+.
- Protocol doc exists.
- Focused proof script exists.
- Verifier and ship coverage exist.
- Protocol outputs paste-ready prompts for:
  - Orchestrator chat
  - Foundation Builder A
  - Feature/Preflight Builder B
  - Review/Audit Builder C
- Protocol outputs a simple "who owns what right now" status table format.
- Dogfood proves these fail closed:
  - same worktree used by two builders
  - same branch used by two independent builders
  - overlapping file ownership
  - hidden subagent spawned without explicit approval
  - builder tries to commit shared files without coordination
  - builder leaves dirty state without wrap report
- Card does not actually launch parallel builders.
- Full Foundation ship gate passes before push.

## Definition Of Done

Done means the card is closed under `parallel-builder-operating-system-v1`, the operating protocol and prompts are in `docs/process/parallel-builder-operating-system-001-protocol.md`, the validator and dogfood live in `lib/parallel-builder-operating-system.js`, the focused proof passes with live backlog/current sprint truth, verifier coverage includes the card, the closeout registry and handoff exist, `foundation:verify` passes, `process:foundation-ship` passes, and the commit is pushed.

Done does not mean any new parallel builder was launched, any new worktree was created, or hidden subagents became default workflow.

## Details

Reuse the existing lower-level work:

- `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001` already proves dedicated worktrees, dedicated branches, disjoint write scopes, Current Sprint coordination, shared-file coordination, and side-effect boundaries.
- `process-write-guard`, Current Sprint overlay, Plan Critic, closeout registry, backlog hygiene, `foundation:verify`, fanout, and `process:foundation-ship` remain the ship path.

The new operating layer adds:

- visible builder chat requirement
- orchestrator assignment format
- one worktree per builder
- one branch per independent builder
- explicit file/module ownership
- shared-file lock protocol
- merge order and commit/push protocol
- status, wrap, and blocker report formats
- crash/restart recovery from repo truth
- hidden-subagent allowed/forbidden rules
- paste-ready prompts for the three-builder model Steve described

No substring-only proof is accepted; substring-only fixtures are rejected. The focused proof calls the actual function path in `lib/parallel-builder-operating-system.js`: `buildParallelBuilderOperatingSystemProtocol()`, `evaluateParallelBuilderOperatingSystem()`, and `buildParallelBuilderOperatingSystemDogfoodProof()`. The dogfood fixtures prove real behavior by passing a healthy visible-builder assignment set and rejecting synthetic bad cases for same worktree, same branch, overlapping ownership, hidden subagent without approval, uncoordinated shared-file commit, and dirty state without wrap report. Source marker checks are secondary only; the card is not accepted unless the actual validator behavior and fail-closed dogfood pass.

The useful operator behavior is concrete: Steve can run a real workflow with an orchestrator and 2-3 visible builders, move with speed and quality, and see who owns each repo/worktree/branch/file before merge. The protocol makes the next launch safer because it tells each builder exactly what to touch, when to stop, how to report, and who owns commit/push/merge.

Gate decision tree:

- Static gate: run `node --check` on the changed JS files before any live write.
- Focused gate: run `npm run process:parallel-builder-operating-system-check -- --close-card --json`; this is the fast default loop and should stay under 2 minutes on a normal local run because it uses synthetic fixtures and repo/source checks, not live builder launches.
- Full gate: because `package.json`, verifier coverage, closeout registry, and Foundation process verifier coverage change, the blast radius requires `npm run foundation:verify` and `npm run process:foundation-ship -- --card=PARALLEL-BUILDER-OPERATING-SYSTEM-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json --closeoutKey=parallel-builder-operating-system-v1 --commitRef=HEAD` before push.

Repair path: if focused proof fails, fix the validator/protocol and rerun focused proof before running full gates. If verifier coverage fails, keep the card in `executing` or reopen it from live backlog truth; do not launch builders until the protocol proof is green. If the operating protocol later regresses, reopen this card or create a follow-up repair card and block visible parallel launch until the failing fixture passes again.

Requested shared files are declared: `package.json`, `lib/parallel-builder-operating-system.js`, `lib/foundation-process-hardening-verifier.js`, `lib/foundation-build-closeout-build-lane-records.js`, `lib/foundation-verify-coverage-card-ids.js`, `scripts/process-parallel-builder-operating-system-check.mjs`, `docs/process/*`, and `docs/handoffs/*`.

## Risks

- Scope drift into launching real parallel builders. Mitigation: this card is protocol/proof only and dogfood asserts `parallelBuildersLaunched` stays false.
- Scope drift into hidden subagents. Mitigation: hidden subagents are forbidden by default and dogfood rejects unapproved hidden spawns.
- Scope drift into feature work. Mitigation: Harlan/Fal/voice/Canva/OpenHuman/live extraction/provider/external-write work remains not next.
- False confidence from doc-only rules. Mitigation: focused proof calls validator behavior and rejects unsafe synthetic operating fixtures.
- Merge conflicts becoming Steve's problem. Mitigation: protocol requires ownership tables, shared-file locks, merge order, and wrap reports before commit/push.

Not next:

- No live extraction.
- No auth-required or paid run.
- No provider/model probe.
- No external write.
- No Drive permission mutation.
- Do not work MEETING-VAULT-ACL-001 Phase B.
- No live Agent Feedback auto-send.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- Do not launch parallel builders during this card.

## Tests

Focused loop:

```bash
node --check lib/parallel-builder-operating-system.js scripts/process-parallel-builder-operating-system-check.mjs lib/foundation-process-hardening-verifier.js
npm run process:parallel-builder-operating-system-check -- --apply --stage=scoping --json
npm run process:parallel-builder-operating-system-check -- --apply --stage=sprint_ready --json
npm run process:parallel-builder-operating-system-check -- --apply --stage=building_now --json
```

Final gates:

```bash
npm run process:parallel-builder-operating-system-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PARALLEL-BUILDER-OPERATING-SYSTEM-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json --closeoutKey=parallel-builder-operating-system-v1 --commitRef=HEAD
```
