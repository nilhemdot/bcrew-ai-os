# MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 Plan

## What

Create a source-backed public eval packet for Matt Pocock / Total TypeScript's `mattpocock/skills` repo.

This card verifies public GitHub/source metadata only:

- repo `https://github.com/mattpocock/skills`
- default branch `main`
- inspected commit `67bce91c80cd1020a4f068ced32d0281656842ad`
- MIT license
- lookup-time stars/forks/open issues only, not permanent facts
- root repo shape, `.claude-plugin/plugin.json`, `CLAUDE.md`, `CONTEXT.md`, `docs/adr`, selected public `SKILL.md` files, and helper scripts

This card does not run the `npx skills` installer, install a plugin, link skills, clone/import/copy repo code into AIOS runtime, mutate Claude/Codex config, fetch YouTube transcripts, capture screenshots/keyframes, summarize video/course content, call models, use paid course or private auth, write Research Inbox/KB/atoms/action routes, or implement a skill runtime adapter.

V1 is intentionally narrow and bounded: public source packet, pattern scorecard, blocked/unverified claim record, proof, and closeout only.

Not next: install, copy blindly, import raw skills, create skill symlinks, write `.claude`/Codex config, run public YouTube extraction, use Total TypeScript paid-course auth, open private content, call models, write downstream outputs, mutate external systems, launch hidden subagents, or launch parallel builders.

## Why

Steve flagged this repo as potentially strong agent-engineering source material. Foundation should learn from public working examples, but the old-system failure mode would be copying prompt folders or installing tools before we know the source class, license, transferability, and permission boundary.

Useful operator behavior: Steve can see what the public repo actually proves, which ideas transfer to AIOS, which claims are unverified, and which actions stay blocked. That gives future builders speed without making Steve responsible for catching blind-copy, vendor lock-in, or private/source-auth drift.

## Acceptance Criteria

- `lib/matt-pocock-claude-folder-eval.js` builds a deterministic public GitHub/source eval snapshot for `mattpocock/skills`.
- The snapshot proves the Matt Pocock watchlist entry exists and keeps public GitHub/YouTube separate from paid/course boundaries.
- The packet records repo URL, commit SHA, MIT license, lookup-time star/fork/open issue counts, root tree shape, skill count, plugin-exposed skills, and inspected public files.
- The packet classifies transferable patterns for small composable skills, setup-before-dependent-skills, glossary/ADR markdown memory, deterministic feedback loops, and handoff compaction.
- The packet explicitly records that no 90-day context-retention pattern was found in the public repo scan and treats that claim as blocked/unverified.
- Dogfood rejects missing repo proof, wrong license, installer/plugin/symlink use, raw skill/repo content copy, false 90-day context claim, and downstream writes.
- Focused proof validates live backlog, Plan Critic, Current Sprint, approval, packet doc, verifier coverage, closeout registry, package script, current plan/state, and file budgets.
- Full `foundation:verify` and `process:foundation-ship` pass before push.

## Definition Of Done

Done means `MATT-POCOCK-CLAUDE-FOLDER-EVAL-001` is live `done`, closeout key `matt-pocock-claude-folder-eval-v1` is registered, Current Sprint marks the card `done_this_sprint`, Current Sprint advances `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` in `scoping`, and Recent Builds exposes the closeout after commit.

Command-proven done requires:

- `node --check lib/matt-pocock-claude-folder-eval.js lib/foundation-intelligence-audit-verifier.js scripts/process-matt-pocock-claude-folder-eval-check.mjs scripts/foundation-verify.mjs`
- `npm run process:matt-pocock-claude-folder-eval-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --closeoutKey=matt-pocock-claude-folder-eval-v1`
- `npm run process:foundation-ship -- --card=MATT-POCOCK-CLAUDE-FOLDER-EVAL-001 --planApprovalRef=docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json --closeoutKey=matt-pocock-claude-folder-eval-v1 --commitRef=HEAD`

## Details

Existing code to reuse:

- `lib/build-intel-watchlist.js`
- `lib/youtube-build-intel-batch.js`
- `lib/course-source-auth-boundary.js`
- `lib/mark-kashef-goal-build-intel-packet.js`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`

Existing docs/scripts to reuse:

- `docs/process/build-intel-creator-watchlist-expansion-001-plan.md`
- `docs/process/youtube-build-intel-batch-001-plan.md`
- `docs/process/course-source-auth-boundary-001-plan.md`
- `scripts/process-mark-kashef-goal-build-intel-packet-check.mjs`
- `scripts/foundation-verify.mjs`

Implementation files:

- `lib/matt-pocock-claude-folder-eval.js`
- `scripts/process-matt-pocock-claude-folder-eval-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-build-closeout-intelligence-records.js`
- `docs/process/matt-pocock-claude-folder-eval-001-packet.md`
- `docs/process/approvals/MATT-POCOCK-CLAUDE-FOLDER-EVAL-001.json`
- `docs/handoffs/2026-05-18-matt-pocock-claude-folder-eval-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Large-file posture: this card adds a focused module and focused proof. Existing shared verifier, closeout registry, current plan, current state, and package files receive only thin integration lines. The plan includes a split plan and no new responsibility plan and does not add new ownership to over-budget docs or verifier files.

Explicit file-size budget / explicit artifact budgets: approval JSON must stay under 60 lines, the packet under 140 lines, and the handoff under 80 lines. These are data/report artifacts, not growing source-of-truth stores.

Process check write posture: the focused proof script is read-only by default; no-flag writes are blocked; live backlog/current-sprint writes require explicit `--apply` or `--close-card`. The verifier/check behavior does not repair live state to pass, performs zero repairs, and fails closed if repo truth or live truth is wrong.

Shared-file coordination: this is active sprint scope and the main session owns the shared Foundation files for this card. No hidden worker, side lane, or parallel builder owns these files during this ship.

No substring-only proof: verifier and focused proof must call real function paths (`buildMattPocockClaudeFolderEvalSnapshot`, dogfood proof, approval validation, live backlog/current sprint reads) and reject unsafe fixtures; substring checks are only supporting artifact-presence checks.

## Risks

- Risk: the repo is mistaken for an approved install/import. Mitigation: packet, dogfood, and closeout explicitly block installer/plugin/symlink/config/code-import side effects.
- Risk: raw skill text becomes copied prompt doctrine. Mitigation: packet stores source metadata and paraphrased transfer candidates only; dogfood rejects raw skill/repo content copy.
- Risk: a 90-day context claim gets promoted from chat/search noise. Mitigation: packet records it as unverified because the public repo scan did not find it.
- Risk: public YouTube/course content gets extracted under this card. Mitigation: source-auth and side-effect checks keep extraction, paid auth, transcripts, screenshots/keyframes, summaries, and model calls blocked.
- Rollback/repair path: if focused proof, verifier coverage, or full ship fails, leave the card in `executing`, remove closeout/current-plan claims if written, repair the source packet or verifier wiring, and rerun `--close-card`. If public repo metadata changes later, open a follow-up refresh rather than silently rewriting this packet as historical truth.

## Tests

Gate decision tree: static syntax is required for changed JS/JSON, focused proof is required for the source eval behavior, and full gate is required because blast radius includes package script, verifier coverage, closeout records, live sprint/backlog state, and current rebuild docs. Final ship uses `process:foundation-ship`, which runs `foundation:verify` after fanout checks.

Behavior proof is actual function path: `buildMattPocockClaudeFolderEvalSnapshot()` reads the real creator watchlist, YouTube Build Intel queue, and source-auth boundary; dogfood mutates fixtures to recreate unsafe failure modes.

Speed bound: focused proof should run under two minutes and full `process:foundation-ship` should stay within the standard five-minute ship target.
