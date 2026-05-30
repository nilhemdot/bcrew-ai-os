# HARLAN-AUTH-LIVE-DELIVERY-002 Plan

Closeout key: `harlan-auth-live-delivery-live-v1`

## What

Build the Harlan Telegram live-delivery slice for Steve-only Foundation notifications.

Plain English: Steve approved the exact live boundary, so this card is no longer preflight-only. Harlan may send notification-only Telegram messages through bot `@harlan_bcrew_bot` to Steve-only chat `8758547582`. Proof paths still do not send; the live runner is explicit, deduped, fail-closed, and uses the OpenClaw bot-token ref instead of raw repo secrets.

## Why

The existing Harlan auth escalation loop proved the dry-run event contract. The tune-up audit caught the real problem: it was built but not wired. This slice turns the notification lane on within the approved Steve-only boundary, without granting broad Harlan runtime authority.

Operator value: build success/failure and future auth-needed events can reach Steve's phone as real notifications instead of sitting in a chat window or requiring manual curl.

## Scope

- Add `lib/harlan-auth-live-delivery.js` with:
  - Steve-only live-approved Telegram delivery contract
  - OpenClaw bot-token ref and explicit Steve chat boundary
  - raw secret rejection
  - proof-path no-send behavior
  - approved live-runner sender
  - dedupe/no-spam policy
  - `DONE`/reverify/resume/fail-closed state proof
- Add `scripts/process-harlan-auth-live-delivery-check.mjs` as the focused proof.
- Add `scripts/harlan-builder-event.mjs` as the reusable builder notification runner.
- Wire `process:foundation-ship` success/failure notifications through the Harlan runner.
- Add the package scripts, closeout record, current docs, approval record, and handoff.
- Keep all non-notification actions blocked.

## Acceptance Criteria

- `HARLAN-AUTH-LIVE-DELIVERY-002` has a 9.8+ approval file and passes Plan Critic.
- The focused proof calls the real module evaluator and dogfood proof.
- Missing Telegram config stays fail-closed.
- Approved Steve-only config can prepare a Telegram `sendMessage` request preview from proof paths with `sendsMessageNow=false`.
- The live runner can send through an injected sender dogfood and through `npm run harlan:builder-event` when live env refs are present.
- Raw Telegram bot token or raw chat ID env values are rejected from the proof path.
- Non-Steve targets are rejected.
- Duplicate auth-needed events create one packet per issue.
- `DONE` triggers silent reverify before resume.
- Timeout or failed readiness remains fail-closed.
- `npm run process:harlan-auth-live-delivery-check -- --json` returns `status: pass` for `HARLAN-AUTH-LIVE-DELIVERY-002`.
- A real builder event can deliver to Steve's phone through the npm runner, not manual curl.
- Plan Critic must return a passing score of at least 9.8 before ship.

## Details

Reuse existing code:

- `lib/harlan-auth-escalation-loop.js` already owns `auth_needed`, blocked-auth, Telegram default channel, `DONE`, reverify, timeout, and no external send from proof paths.
- `lib/source-browser-agent-harness.js` already prepares Harlan operator escalation drafts for stuck/browser/auth-needed source-browser states.
- `lib/source-session-broker.js` already defines source-session auth-needed posture and names this card as the live-delivery continuation.

Reuse existing docs:

- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` already record the Harlan Telegram bridge.
- `docs/_archive/handoffs/2026-05-28-source-browser-harlan-telegram-channel.md` records that Telegram is the default Harlan operator lane and live delivery remains this approval-bound follow-up.

Reuse existing scripts and live backlog truth:

- `scripts/process-harlan-auth-escalation-loop-check.mjs` stays the parent auth-loop proof.
- `process:foundation-ship`, `process:ship-check`, `process:fanout-check`, `backlog:hygiene`, and `foundation:verify` stay the full gates.
- Live backlog card `HARLAN-AUTH-LIVE-DELIVERY-002` is approved for notification-only live delivery. `HARLAN-LIVE-OPERATOR-RUNTIME-002` remains the broader runtime continuation.

Behavior proof must use the actual function path: `evaluateHarlanAuthLiveDeliveryContract()`, `buildHarlanAuthLiveDeliveryDogfoodProof()`, `resolveHarlanTelegramDeliveryConfig()`, `prepareHarlanTelegramDeliveryPacket()`, and `sendHarlanBuilderEventNotification()`. No substring-only proof is accepted; source-text checks are supporting safety checks only and must be paired with dogfood branches that reject weak behavior.

Gate decision tree: static syntax checks are required for changed JS files, the focused proof is required for the Harlan Telegram behavior, and full gates are required because this touches Foundation runtime/auth/operator delivery. Blast radius is limited by Steve-only notification boundaries, and the final ship still uses `process:foundation-ship`.

Speed bound: the focused proof should stay under 2 minutes by default. It must not call external networks except through injected sender dogfood. The live builder-event runner is the only approved path for real Telegram delivery.

## Not Next

- No Telegram bot creation.
- No raw Telegram token or raw chat ID in git, logs, reports, or proof output.
- No broad Telegram inbound bot/source work.
- No recipients except Steve chat `8758547582`.
- No actions beyond notifications.
- No login, signup, source-session resume, MyICOR/Skool extraction, challenge solving, purchase, download, post, comment, message, profile mutation, credential mutation, or normal Chrome profile use.

## Risks

- Risk: proof paths accidentally send live Telegram. Mitigation: proof packet paths keep `sendsMessageNow=false`; process proof uses injected sender dogfood only; the real sender is centralized in `lib/harlan-auth-live-delivery.js`.
- Risk: raw bot tokens leak into repo truth. Mitigation: config uses refs only and the proof rejects token-shaped values.
- Risk: a prepared packet is mistaken for a live send. Mitigation: packet previews stay `approved_live_send_ready_not_sent`; live sends return `sent` only from the approved runner.
- Risk: Steve gets spammed. Mitigation: duplicate issue keys are deduped and one packet per issue is enforced.
- Repair path: if focused proof, backlog hygiene, `foundation:verify`, ship-check, fanout, or `process:foundation-ship` fails, keep the card scoped/executing, repair the exact invariant, and keep live delivery fail-closed or paused until the failure is repaired.

## Proof Commands

```bash
node --check lib/harlan-auth-live-delivery.js scripts/process-harlan-auth-live-delivery-check.mjs lib/foundation-build-closeout-agent-runtime-records.js
node --check scripts/harlan-builder-event.mjs
npm run process:harlan-auth-live-delivery-check -- --json
npm run harlan:builder-event -- --dry-run --eventType=foundation_ship_passed --card=HARLAN-AUTH-LIVE-DELIVERY-002 --status=proof
npm run process:harlan-auth-escalation-loop-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-live-v1 --commitRef=HEAD
```

## Tests

- Static syntax: `node --check lib/harlan-auth-live-delivery.js scripts/process-harlan-auth-live-delivery-check.mjs scripts/harlan-builder-event.mjs lib/foundation-build-closeout-agent-runtime-records.js`.
- Focused behavior: `npm run process:harlan-auth-live-delivery-check -- --json` calls the real module path and dogfoods missing config, approved ref config, raw secret rejection, duplicate suppression, `DONE`/reverify/resume, timeout fail-closed, unsafe send rejection, wrong-target rejection, weak-contract rejection, and injected live-send behavior.
- Parent regression: `npm run process:harlan-auth-escalation-loop-check -- --json` keeps the original auth-needed contract green.
- Live runner dry run: `npm run harlan:builder-event -- --dry-run --eventType=foundation_ship_passed --card=HARLAN-AUTH-LIVE-DELIVERY-002 --status=proof`.
- Full gate: `npm run foundation:verify -- --json-summary` and `npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-live-v1 --commitRef=HEAD`.

## Definition Of Done

- Harlan Telegram live-delivery contract exists and passes dogfood.
- Live send is enabled only for the exact Steve-approved bot/chat boundary.
- Raw secrets are rejected from proof and repo truth.
- Builder ship success/failure events are wired to the live sender.
- Closeout, handoff, current docs, package script, backlog hygiene, `foundation:verify`, and ship gates are green.
- `HARLAN-AUTH-LIVE-DELIVERY-002` remains honest as notification-only live delivery; broader Harlan runtime stays in the continuation card.
