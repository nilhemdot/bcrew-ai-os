# EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 Plan

## What

Define the V1 visible parallel extraction worker protocol. This is the bridge between the visible parallel-builder operating system and future extractor runtime work.

The protocol defines how multiple visible extraction workers can later process separate source packets without colliding: each worker needs a visible chat, known worktree, dedicated branch, unique source packet, queue item, permission class, artifact root, artifact manifest, file ownership, quality gate, wrap report, import flow, and stop conditions.

This card is protocol/proof only. It does not launch workers or run extraction.

Not-next boundaries: no live extraction workers, public web lookup, YouTube API call, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision, model call, private/paid/community/course auth, Skool/MyICOR/Loom/authorized-browser access, Research Inbox writes, KB page writes, atom writes, synthesis fact writes, action-route writes, vector/query-index writes, backlog mutation from extracted content, external writes, Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, hidden subagents, or invisible workers.

## Why

Steve wants speed from parallel extraction, but speed creates risk if workers share branches, worktrees, source packets, artifact paths, or downstream write ownership. The prior Planck incident also showed that "new builder" can be misread as hidden subagent delegation.

Before any extraction worker runs, the system needs a protocol that fails closed when worker ownership, source permission, artifact path, quality gate, wrap report, or side-effect approval is unclear.

Useful operator behavior: Steve can see which visible extraction worker owns each source packet, branch, worktree, artifact path, and proof before anything runs. This unlocks a real workflow with more speed and quality because parallel extraction can be assigned, paused, wrapped, and merged without Steve having to diagnose hidden worker state or file collisions.

## Acceptance Criteria

- `lib/extraction-parallel-worker-protocol.js` defines visible extraction worker assignments and evaluates protocol safety.
- `docs/process/extraction-parallel-worker-protocol-001-protocol.md` contains assignment, stop-condition, wrap-report, import-flow, and ownership-table formats.
- Healthy fixture declares at least two visible worker assignments with distinct worktrees, branches, source packets, and artifact roots.
- The protocol requires source packet, source ID/ref, queue item, permission class, privacy tier, artifact manifest, file ownership, quality gates, wrap report, and stop conditions.
- Private/paid/course/Skool/MyICOR/Loom/authorized-browser sources require explicit source approval and remain preflight-only until then.
- No worker is launched by this card.
- No live extraction, transcript fetch, crawl, screenshot/keyframe capture, download, model call, downstream write, external write, or hidden subagent starts.
- Dogfood rejects duplicate source packets, overlapping artifact paths, private source without approval, launched worker/live extraction, missing quality gate, missing wrap report, direct downstream writes, hidden subagent, and shared-file commit without lock.
- Focused proof validates live backlog, Plan Critic, Current Sprint, approval, protocol doc, verifier coverage, closeout registry, package script, current plan/state, and file budgets.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

Done means `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001` is live `done`, closeout key `extraction-parallel-worker-protocol-v1` is registered, Current Sprint advances `MYICOR-EXTRACTION-PREFLIGHT-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/extraction-parallel-worker-protocol.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-parallel-worker-protocol-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-parallel-worker-protocol-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --closeoutKey=extraction-parallel-worker-protocol-v1`
- `npm run process:foundation-ship -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `PARALLEL-BUILDER-OPERATING-SYSTEM-001` defines visible builder chats, worktrees, branches, file ownership, shared locks, wrap reports, and hidden-subagent rules.
- `EXTRACTION-TO-KB-ATOM-PIPELINE-001` defines proposal-only routing from extractor artifacts into KB draft, atom, synthesis fact, review inbox, and action-route candidates.
- `YOUTUBE-BUILD-INTEL-BATCH-001` defines metadata-only public YouTube queue specs and keeps runtime extraction blocked.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` defines private/paid/course/community source approval boundaries.
- Current Sprint helpers, Plan Critic, approval integrity, process write guard, fanout check, and Foundation ship gate already exist.

Implementation files:

- `lib/extraction-parallel-worker-protocol.js`
- `scripts/process-extraction-parallel-worker-protocol-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/extraction-parallel-worker-protocol-001-plan.md`
- `docs/process/extraction-parallel-worker-protocol-001-protocol.md`
- `docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json`
- `docs/handoffs/2026-05-18-extraction-parallel-worker-protocol-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Verifier/check posture: `scripts/process-extraction-parallel-worker-protocol-check.mjs` is read-only by default. Live backlog, Plan Critic, and Current Sprint writes require explicit `--apply` or `--close-card` through `process-write-guard.js`. `foundation:verify` remains read-only and must fail closed rather than repair live state.

Large-file posture and split plan: this card touches large shared verifier/docs surfaces only as thin wrapper/source aggregation lines and adds no new responsibility to those large files. All new behavior lives in `lib/extraction-parallel-worker-protocol.js` and `scripts/process-extraction-parallel-worker-protocol-check.mjs`; `lib/foundation-intelligence-audit-verifier.js` only imports/calls the new module, `lib/foundation-build-closeout-intelligence-records.js` only receives a closeout record, and `docs/rebuild/current-plan.md` remains a current-sprint handoff wrapper. Any broader rebuild-plan or verifier split remains separate Foundation cleanup work.

## Risks

- Risk: protocol gets mistaken for runtime approval. Mitigation: snapshot exposes no worker launch and no live extraction approval; dogfood rejects launched worker/live extraction flags.
- Risk: workers collide on source packets or artifact paths. Mitigation: evaluator requires unique source packets, branches, worktrees, and artifact roots.
- Risk: private or paid sources start as normal extraction work. Mitigation: private/paid/course/Skool/MyICOR/Loom/authorized-browser permission classes require source approval and stop at preflight by default.
- Risk: artifacts bypass downstream review. Mitigation: import flow requires `EXTRACTION-TO-KB-ATOM-PIPELINE-001` before any KB/atom/action candidate persists.
- Risk: hidden subagents reappear. Mitigation: hidden subagent dogfood fails closed without explicit approval.
- Rollback/repair path: if focused proof, verifier coverage, or full ship fails, leave the card in `executing`, remove closeout/current-plan claims from the branch if needed, and repair the pure protocol before rerunning `--close-card`.

## Tests

Gate decision tree: full gate is required because this changes a Foundation protocol module, package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Static proof is `node --check`; focused proof is `process:extraction-parallel-worker-protocol-check`; final proof is `process:foundation-ship`.

Behavior proof is actual function path, not substring proof: `buildExtractionParallelWorkerProtocolSnapshot()` calls real validation and `buildExtractionParallelWorkerProtocolDogfoodProof()` mutates fixtures to recreate exact unsafe worker failure modes.

Speed and file-size budget: module and focused proof stay under 1,500 lines each, approval JSON stays under 50 lines, handoff stays under 100 lines, focused proof should run under two minutes, and full ship must stay within the ship target so the gate remains usable by default.
