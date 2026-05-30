# Agentic Codebase Map - 2026-05-28

Purpose: give the next Codex/Claude/build agent a fast, source-backed map of the repo without relying on long chat memory.

## Read First

1. `AGENTS.md` - workspace rules, local/private file policy, Foundation discipline.
2. `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` - active Foundation/source doctrine. Old handoffs are context until promoted here, into backlog, or into live DB/API truth.
3. `docs/rebuild/current-runtime-map.md` - Foundation/runtime/Harlan/OpenClaw/model-routing boundaries.
4. `docs/source-registry.md` and `lib/source-contracts.js` - source IDs, trust states, connector boundaries.
5. `package.json` - command surface.
6. `server.js`, `lib/dev-team-hub.js`, `public/dev.js` - `/dev` and `/api/foundation/dev-team-hub` readback.
7. `lib/foundation-db.js` and `lib/foundation-source-crawl-store.js` - live Postgres/source-crawl truth.
8. `scripts/foundation-verify.mjs` and `scripts/process-foundation-ship.mjs` - main verifier and ship wrapper.
9. `lib/foundation-jobs.js`, `scripts/foundation-worker.mjs`, and `ops/launchagents/` - scheduled runtime and local services.

## Source/Extractor Surfaces

- YouTube lane: `lib/youtube-creator-daily-watch.js`, `lib/youtube-latest-20-full-watch-runner.js`, `lib/youtube-creator-god-mode-catchup.js`, `lib/youtube-resource-link-resolver.js`.
- YouTube handoff queue: `lib/source-god-mode-youtube-handoff.js`.
- Source Browser Agent: `lib/source-browser-agent-harness.js`, `lib/source-browser-agent-executor.js`, `lib/source-browser-fallback-executor.js`.
- Browser/runtime layer: `lib/source-god-mode-extractor-runtime.js`, `lib/source-agentic-browser-runtime.js`.
- Session/auth layer: `lib/source-session-broker.js`, `lib/source-session-readiness-readback.js`, `lib/source-session-auth-resume-packet.js`.
- Source-specific runners: `lib/public-repo-deep-review-runner.js`, `lib/creator-newsletter-intake-runner.js`, `lib/skool-free-community-god-mode-runner.js`.

## Common Proof Commands

- Dev Hub readback: `npm run process:dev-team-hub-v0-check -- --json`
- YouTube catchup readback: `npm run process:youtube-creator-god-mode-catchup-check -- --json`
- Source handoff: `npm run process:source-god-mode-youtube-handoff-check -- --json`
- Source Browser Agent harness: `npm run process:source-browser-agent-harness-check -- --json`
- Source Browser Agent executor: `npm run process:source-browser-agent-executor-check -- --json`
- Source Browser fallback: `npm run process:source-browser-fallback-executor-check -- --json`
- Repo lane: `npm run process:public-repo-deep-review-runner-check -- --json`
- Newsletter lane: `npm run process:creator-newsletter-intake-runner-check -- --json`
- Free Skool lane: `npm run process:skool-free-community-god-mode-runner-check -- --json`
- Source session readiness: `npm run process:source-session-readiness-check -- --json`
- Grader: `npm run process:build-intel-source-value-grader-check -- --json`
- Foundation verify: `npm run foundation:verify -- --json-summary`

Run DB-heavy gates sequentially, not in parallel: `foundation:verify`, nightly audit, repeated-failure gate, `backlog:hygiene`, and governed health jobs.

## Operating Truth

- Live Postgres/API truth beats docs, seed files, and old handoffs.
- Dev Hub is operator readback, not the source of truth.
- YouTube video full-watch is not full God Mode. Full YouTube source SOP also needs downstream page/resource/repo/newsletter/community/auth-specific lanes.
- Source Browser Agent flow is exact source packet -> isolated session -> observe -> plan -> safe action -> extract -> evaluate -> record -> continue/stop/auth-needed/fail-closed.
- Source Session Broker owns isolated profiles, Keychain refs, auth-needed states, and Harlan/Telegram-style human unblock packets. Do not put raw secrets in repo or chat.

## Gotchas

- Do not repair approval hashes or plan approvals unattended.
- Source checks stay read-only unless an explicit approved write flag is used.
- Do not use normal Chrome profiles, print raw secrets, purchase, download, submit forms, post, message, mutate credentials/profiles, or promote to Scoper from source-browser work.
- YouTube comments remain operator-excluded unless Steve explicitly reverses that.
- After focused Foundation commits, restart `ai.bcrew.dashboard` and `ai.bcrew.foundation-worker`, then rerun `foundation:verify`. Full `process:foundation-ship` handles this automatically.
- Long sessions need real `docs/handoffs/` checkpoints with commands, results, commit, served-code state, blockers, and next cards.

