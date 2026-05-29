# HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001 Plan

## What

Promote the evidence-backed Human Web Agent V1 sprint into live Current Sprint truth.

Plain English: the Dev Director already picked the right next build direction. The watched-video evidence points to a hybrid browser/source agent: exact source packet, route policy, local isolated browser hands, source-session broker, connector-first where safer, extractor output, run memory, and Dev Hub readback. The old YouTube sprint should stop being the command order now that its evidence has produced the top build candidates.

This is a narrow V1 sprint reset for `HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001`. It is a fast process/control-plane card, not a broad extractor rewrite.

## Why

Steve should not have to fight the board while builders read stale sprint truth. The current board still says the active blocker is YouTube creator catch-up, but the Director top three and source evidence say the next work is the browser/extractor system that uses the web like a careful human.

The watched videos are the design input, not a decoration. This sprint begins from the evidence matrix:

- `docs/process/human-web-agent-v1-evidence-matrix-2026-05-29.md`
- `docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md`

Useful operator behavior this unlocks: Steve can open Current Sprint and see the real next build order, with `SOURCE-BROWSER-AGENTIC-RUNTIME-001` actively Building Now and evidence docs explaining why. Builders no longer have to infer the plan from chat or stale YouTube catch-up state.

## Acceptance Criteria

- `HUMAN-WEB-AGENT-V1-2026-05-29` is the live active Current Sprint after the explicit `--apply` command.
- `SOURCE-BROWSER-AGENTIC-RUNTIME-001` is the active blocker and the only Building Now card.
- `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` is not the live active blocker; it remains upstream backlog/source context.
- Current Sprint items have live backlog cards, order, stage, plan refs, definition of done, proof commands, not-next boundaries, and existing-work context.
- The active Building Now card has a durable Plan Critic pass row.
- Sprint metadata links the evidence matrix and sprint scope docs.
- The process check proves real DB/API/function behavior through the actual function path `getActiveFoundationCurrentSprint`, `upsertFoundationCurrentSprintOverlay`, `getBacklogItemsByIds`, `getPlanCriticRunsByCardIds`, and `buildFoundationCurrentSprintStatus`.
- The proof dogfoods the Current Sprint route by writing through the governed helper, reading back the live database, and rejecting the synthetic weak state where the old YouTube sprint or old active blocker remains live.
- Substring-only proof is rejected. Document markers alone do not pass; the check must read back live DB sprint truth and stage-gate status.

## Definition Of Done

- `HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001` has a valid v2 approval at 9.8+ tied to this plan hash.
- Plan Critic passes for this sprint reset and for the active `SOURCE-BROWSER-AGENTIC-RUNTIME-001` Building Now gate.
- The sprint reset script is registered in `package.json`.
- The live Current Sprint API/readback returns `HUMAN-WEB-AGENT-V1-2026-05-29`, active blocker `SOURCE-BROWSER-AGENTIC-RUNTIME-001`, and the expected six-card order.
- Current Sprint dynamic truth and backlog hygiene pass after the reset.
- The first build proof for `SOURCE-BROWSER-AGENTIC-RUNTIME-001` runs after the sprint reset.

## Details

Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth instead of building a second planning system.

Existing code reused:

- `lib/foundation-db.js`
- `lib/foundation-current-sprint.js`
- `lib/foundation-current-sprint-store.js`
- `lib/process-write-guard.js`
- `lib/approval-integrity.js`
- `lib/process-plan-critic.js`
- `lib/source-browser-agent-harness.js`
- `lib/source-browser-agent-executor.js`
- `lib/source-browser-brain-route-policy.js`
- `lib/local-virtual-browser-hands-runtime.js`
- `lib/source-session-broker.js`

Existing docs reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/process/source-browser-agentic-runtime-001-plan.md`
- `docs/process/extractor-eyes-hands-brain-runtime-001-plan.md`
- `docs/process/source-browser-brain-route-policy-001-plan.md`
- `docs/process/local-virtual-browser-hands-runtime-001-plan.md`
- `docs/process/source-session-broker-001-plan.md`
- `docs/process/build-opportunity-promotion-gate-001-plan.md`

Existing scripts reused:

- `scripts/process-current-sprint-dynamic-truth-check.mjs`
- `scripts/backlog-hygiene.mjs`
- `scripts/process-source-browser-agent-executor-check.mjs`
- `scripts/process-source-browser-agent-harness-check.mjs`
- `scripts/process-source-browser-brain-route-policy-check.mjs`
- `scripts/process-local-virtual-browser-hands-runtime-check.mjs`
- `scripts/process-source-session-broker-check.mjs`

Root invariant: Current Sprint must describe the actual live build order from live backlog-backed sprint rows, not a stale dashboard label, chat summary, or hardcoded markdown snapshot. The proof must mutate only through the governed Current Sprint overlay helper, then read back the database and stage gate. It must not add an escape hatch, bypass the active blocker, silence warnings, or make an old active sprint pass by condition.

Gate decision tree: static is enough only for syntax checks before the write; focused proof is required for the process check and DB round-trip; full verification is required before final ship because this is a full-risk control-plane write that mutates live `foundation_sprints`, `foundation_sprint_items`, `backlog_items`, and `plan_critic_runs` and updates package/docs. Use focused proof for the script behavior, then run Current Sprint dynamic truth and backlog hygiene. Before final ship, use the full Foundation ship gate if this change is committed/pushed as a completed card.

The gate stays fast: the default focused proof should complete under 2 minutes because it reads existing reports, checks docs/scripts/package state, performs one bounded sprint overlay write only with `--apply`, and runs no live browser, provider, crawler, download, login, or external write.

## Evidence

Reviewed source truth:

- Raw Director report: `director:dev-team-intelligence-director-001:aios-mission-v0`
- Raw ranked Director candidates: 2,319
- Browser Agent support: 32 creators, 162 videos, 218 idea signals, 12 links/resources
- Memory support: 35 creators, 419 videos, 658 idea signals, 12 links/resources
- Extractor support: 35 creators, 179 videos, 260 idea signals, 12 links/resources

The implementation pattern from the evidence:

`source mission packet -> route policy -> browser/session/connector tool -> observe -> plan -> act -> extract -> remember -> prove -> continue/stop/escalate`

## Sprint Order

Sprint id: `HUMAN-WEB-AGENT-V1-2026-05-29`

Sprint goal: Build the first evidence-backed AIOS web worker that can take an exact source packet, use local isolated browser hands or safer connectors, preserve session boundaries, extract source value, remember run state, update source-stack readback, and stop/escalate at real boundaries.

Operator visibility rule: local browser-hands work must support a watchable isolated Chrome/Playwright mode by default, with `--headless` only when explicitly requested. Steve should be able to inspect the run without handing over his normal browser profile, and unattended runs must leave local live-state/screenshot artifacts for review.

Active blocker after sprint reset:

- `SOURCE-BROWSER-AGENTIC-RUNTIME-001`

Initial sprint order:

1. `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001` - parent contract for the full God Mode extractor/source SOP system.
2. `SOURCE-BROWSER-AGENTIC-RUNTIME-001` - first Building Now card; flagship source-browser agent.
3. `SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001` - route policy for deterministic/browser/session/connector/Harlan choices; Browserbase is parked outside sprint.
4. `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001` - local isolated Playwright/Chrome hands runtime.
5. `SOURCE-SESSION-BROKER-001` - session/auth/MFA/Keychain/Harlan broker.
6. `BUILD-OPPORTUNITY-PROMOTION-GATE-001` - keep build promotion approval-gated after source proof.

`YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` remains live backlog context/upstream evidence work, but it is no longer the active sprint blocker.

`BROWSERBASE-ONE-MONTH-BAKEOFF-001` is parked outside this sprint. No Browserbase work, bakeoff, fallback run, browser-minute spend, or model-call spend is approved.

## Existing Work To Reuse

- `lib/source-browser-agent-harness.js`
- `lib/source-browser-agent-executor.js`
- `lib/source-browser-brain-route-policy.js`
- `lib/local-virtual-browser-hands-runtime.js`
- `lib/source-session-broker.js`
- `lib/source-session-readiness-readback.js`
- `lib/dev-source-run-readback.js`
- `scripts/process-source-browser-agent-harness-check.mjs`
- `scripts/process-source-browser-agent-executor-check.mjs`
- `scripts/process-source-browser-brain-route-policy-check.mjs`
- `scripts/process-local-virtual-browser-hands-runtime-check.mjs`
- `scripts/process-source-session-readiness-check.mjs`
- `docs/process/source-browser-agentic-runtime-001-plan.md`
- `docs/process/extractor-eyes-hands-brain-runtime-001-plan.md`
- `docs/process/source-session-broker-001-plan.md`

## Not Next

- Do not keep the stale YouTube sprint as active blocker.
- Do not claim video-only watching is God Mode.
- Do not start Browserbase work; Browserbase is killed/parked outside this sprint.
- Do not use Steve's normal Chrome profile as the default session.
- Do not log in, buy, download, post, comment, message, mutate profiles, send DMs, or make external writes from this sprint reset.
- Do not auto-promote Scoper/backlog cards from Director candidates.
- Do not work `MEETING-VAULT-ACL-001 Phase B`.
- Do not mutate Drive permissions.

## Proof

```bash
npm run process:human-web-agent-v1-sprint-plan-check -- --json
npm run process:human-web-agent-v1-sprint-plan-check -- --apply --json
npm run process:current-sprint-dynamic-truth-check -- --json
npm run backlog:hygiene -- --json
```

First build proof after sprint reset:

```bash
npm run process:source-browser-agent-executor-check -- --json
```

## Tests

Run the focused proof and readback gates:

```bash
npm run process:human-web-agent-v1-sprint-plan-check -- --json
npm run process:human-web-agent-v1-sprint-plan-check -- --apply --json
npm run process:current-sprint-dynamic-truth-check -- --json
npm run backlog:hygiene -- --json
npm run process:source-browser-agent-executor-check -- --json
```

Use `npm run foundation:verify -- --json-summary` or `npm run process:foundation-ship -- --card=HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001 --planApprovalRef=docs/process/approvals/HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001.json --closeoutKey=human-web-agent-v1-sprint-plan` before treating this as shipped repo truth.

## Risks

- The sprint reset could hide unfinished YouTube work. Mitigation: keep YouTube catch-up in backlog context and source evidence, but remove it from active blocker.
- Builders could turn this into a generic browser script. Mitigation: sprint metadata and proof point to the evidence matrix and exact source-packet loop.
- Browserbase could creep back in as an expensive shortcut. Mitigation: Browserbase is out of this sprint; any future revisit needs fresh explicit approval and cost proof.
- Memory could drift into a broad OpenClaw/private-memory rebuild. Mitigation: V1 memory means browser-run state, handoff, blockers, source skills, and next action.
- Proof could fail after the live write. Repair path: fail closed, do not call the sprint healthy, rerun the script after fixing the exact failed check, or reopen the previous active sprint only through the same governed Current Sprint overlay helper with explicit `--apply`.
- If `SOURCE-BROWSER-AGENTIC-RUNTIME-001` regresses, keep it Building Now and attach the regression to that card rather than starting Browserbase or broad external account work.

## Changed Files

- `docs/process/human-web-agent-v1-sprint-plan-001-plan.md`
- `docs/process/human-web-agent-v1-evidence-matrix-2026-05-29.md`
- `docs/process/human-web-agent-v1-sprint-scope-2026-05-29.md`
- `docs/process/approvals/HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001.json`
- `docs/process/source-browser-brain-route-policy-001-plan.md`
- `docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md`
- `lib/source-agentic-browser-runtime.js`
- `lib/source-browser-agent-harness.js`
- `lib/source-browser-brain-route-policy.js`
- `lib/foundation-backlog-seed-chunks/chunk-005.js`
- `scripts/process-human-web-agent-v1-sprint-plan-check.mjs`
- `scripts/process-source-browser-runtime-cost-guardrails-check.mjs`
- `scripts/process-source-browser-agent-harness-check.mjs`
- `scripts/process-source-browser-brain-route-policy-check.mjs`
- `package.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
