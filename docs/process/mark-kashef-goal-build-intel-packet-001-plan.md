# MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 Plan

## What

Create a source-backed Build Intel packet for Mark Kashef's public `/goal` self-improving OS video and the official Claude Code `/goal` mechanics.

This card verifies public metadata only:

- Mark Kashef YouTube video `5xrjO38WUYY`
- title `How to Use /goal to Build a Self-Improving OS`
- public URL `https://www.youtube.com/watch?v=5xrjO38WUYY`
- channel `Mark Kashef`
- official Claude Code `/goal` docs at `https://code.claude.com/docs/en/goal`

This card does not fetch transcripts, download video, capture screenshots/keyframes, run vision, summarize video content, call models, open Skool, use private auth, write Research Inbox/KB/atoms/action routes, or implement a goal runner.

V1 is intentionally narrow and bounded: source metadata packet, official docs pointer, AIOS transfer map, proof, and closeout only.

Not next: transcript fetch, video download, screenshot/keyframe capture, vision analysis, video summarization, model call, private Skool access, paid content, comments/member data, authorized browser session, community/course crawl, Research Inbox writes, KB page writes, atom writes, synthesis fact writes, action-route writes, vector/query-index writes, backlog mutation from extracted content, `/goal` implementation, Foundation goal runner, Harlan runtime, external writes, Drive/Gmail/ClickUp/Slack/Agent Feedback mutation, hidden subagents, invisible workers, or real extraction worker launch.

## Why

Steve wants a builder operating mode that keeps working until a measurable outcome is done. The Mark Kashef signal and official `/goal` docs are relevant, but Foundation needs a clean source packet first so AIOS learns the transferable pattern without copying Claude-specific behavior or starting unapproved extraction.

Useful operator behavior: Steve can see the exact public source, what is verified, what is not verified, what is blocked, and which follow-up owns evaluation. That unlocks speed and quality because later builders can evaluate goal-driven work from a clean packet instead of re-asking Steve, guessing from chat, or launching extraction.

## Acceptance Criteria

- `lib/mark-kashef-goal-build-intel-packet.js` builds a deterministic public metadata packet for the Mark Kashef `/goal` source.
- The packet proves Mark Kashef exists in the Build Intel creator watchlist and keeps Skool/private content separate.
- The packet proves the YouTube Build Intel queue already includes Mark Kashef while runtime extraction remains approval-bound.
- The exact public video URL, ID, title, channel, duration, and official `/goal` docs are captured.
- Mark-specific workflow claims remain unextracted until a later approved public video extraction run.
- Pattern candidates route to `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`, not direct implementation.
- Dogfood rejects missing source proof, title mismatch, missing official docs, transcript fetch, private Skool access, copied transcript/video content, downstream writes, and direct implementation.
- Focused proof validates live backlog, Plan Critic, Current Sprint, approval, packet doc, verifier coverage, closeout registry, package script, current plan/state, and file budgets.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

Done means `MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001` is live `done`, closeout key `mark-kashef-goal-build-intel-packet-v1` is registered, Current Sprint advances `MATT-POCOCK-CLAUDE-FOLDER-EVAL-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/mark-kashef-goal-build-intel-packet.js lib/foundation-intelligence-audit-verifier.js scripts/process-mark-kashef-goal-build-intel-packet-check.mjs scripts/foundation-verify.mjs`
- `npm run process:mark-kashef-goal-build-intel-packet-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --planApprovalRef=docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json --closeoutKey=mark-kashef-goal-build-intel-packet-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --closeoutKey=mark-kashef-goal-build-intel-packet-v1`
- `npm run process:foundation-ship -- --card=MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001 --planApprovalRef=docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json --closeoutKey=mark-kashef-goal-build-intel-packet-v1 --commitRef=HEAD`

## Details

Existing work to reuse:

- `lib/build-intel-watchlist.js`
- `lib/youtube-build-intel-batch.js`
- `lib/course-source-auth-boundary.js`
- `docs/handoffs/2026-05-17-runtime-memory-build-intel-stab-capture.md`
- `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`

Implementation files:

- `lib/mark-kashef-goal-build-intel-packet.js`
- `scripts/process-mark-kashef-goal-build-intel-packet-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/mark-kashef-goal-build-intel-packet-001-packet.md`
- `docs/process/approvals/MARK-KASHEF-GOAL-BUILD-INTEL-PACKET-001.json`
- `docs/handoffs/2026-05-18-mark-kashef-goal-build-intel-packet-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Large-file posture: this card adds a focused module and focused proof. Existing large verifier/closeout/current docs only receive thin integration lines.

Split plan / no new responsibility plan: `docs/rebuild/current-plan.md` is above the preferred 1,500-line budget, so this card only updates its short Current Sprint section. It does not add new doctrine, append archive evidence, or expand the plan's ownership. `lib/foundation-intelligence-audit-verifier.js` and `lib/foundation-build-closeout-intelligence-records.js` receive only thin imports/checks/records; source behavior stays in the new focused module.

Explicit file-size budget / explicit artifact budgets: approval JSON must stay under 60 lines, the packet under 120 lines, and the handoff under 80 lines. These are data/report artifacts, not growing source-of-truth stores.

Process check write posture: the focused proof script is read-only by default; no-flag writes are blocked; live backlog/current-sprint writes require explicit `--apply` or `--close-card`. The verifier/check behavior does not repair live state to pass, performs zero repairs, and fails closed if repo truth or live truth is wrong.

Shared-file coordination: this is active sprint scope and the main session owns the shared Foundation files for this card. No side lane or hub work is authorized for these files during this ship.

## Risks

- Risk: metadata packet is mistaken for extracted video intelligence. Mitigation: packet explicitly marks transcript, visual workflow, and Mark-specific content claims as unextracted.
- Risk: `/goal` becomes a direct Claude-only implementation. Mitigation: transfer candidates route to `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`.
- Risk: Mark Kashef Skool/private content bleeds into public source work. Mitigation: watchlist and source-auth checks prove Skool remains paid/private and blocked.
- Risk: downstream writes bypass extraction-to-KB/atom gates. Mitigation: dogfood rejects Research Inbox, KB, atom, action-route, vector, and backlog content writes.
- Rollback/repair path: if focused proof, verifier coverage, or full ship fails, leave the card in `executing`, remove closeout/current-plan claims if they were written, repair the source packet or verifier wiring, and rerun `--close-card`. If public source metadata later changes, reopen/follow-up the packet rather than silently editing extracted claims.

## Tests

Gate decision tree: static syntax is required for changed JS/JSON, focused proof is required for the card-specific packet behavior, and full gate is required because blast radius includes package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Final ship uses `process:foundation-ship`, which runs `foundation:verify` after fanout checks.

Behavior proof is actual function path: `buildMarkKashefGoalBuildIntelPacketSnapshot()` reads the real creator watchlist, YouTube Build Intel queue, and course source-auth boundary; dogfood mutates fixtures to recreate unsafe failure modes.

Speed bound: focused proof should run under two minutes and full `process:foundation-ship` should stay within the standard five-minute ship target.
