# HARLAN-AUTH-LIVE-DELIVERY-002 Plan

Closeout key: `harlan-auth-live-delivery-preflight-v1`

## What

Build the Harlan Telegram live-delivery preflight for auth-needed operator help.

Plain English: when the source-browser or source-session system gets stuck on auth, 2FA, or a human approval step, Harlan must be able to prepare the exact Telegram message for Steve, wait for `DONE`, silently reverify, then resume or fail closed. This slice proves that delivery contract and readiness gate. It does not send a live Telegram message yet.

## Why

The existing Harlan auth escalation loop proves the dry-run event contract, but Steve needs the next layer: Telegram as the real operator lane, no spam, no raw secret leakage, and no pretend-green state when bot/chat config is missing.

Operator value: future MyICOR, Skool, newsletter, and source-browser runs can stop with a clear Telegram operator packet instead of leaving Steve and Codex guessing why the system is stuck.

## Scope

- Add `lib/harlan-auth-live-delivery.js` with:
  - Steve-only Telegram delivery contract
  - metadata-only config refs
  - raw secret rejection
  - blocked-preflight default
  - approved-live-test request preview without sending
  - dedupe/no-spam policy
  - `DONE`/reverify/resume/fail-closed state proof
- Add `scripts/process-harlan-auth-live-delivery-check.mjs` as the focused proof.
- Add the package script, closeout record, current docs, approval record, and handoff.
- Keep the real external Telegram send blocked until Steve approves the exact bot/chat boundary and live test.

## Acceptance Criteria

- `HARLAN-AUTH-LIVE-DELIVERY-002` has a 9.8+ approval file and passes Plan Critic.
- The focused proof calls the real module evaluator and dogfood proof.
- Missing Telegram config stays `blocked_preflight`.
- Approved Steve-only config can prepare a Telegram `sendMessage` request preview, but `sendsMessageNow=false`.
- Raw Telegram bot token or raw chat ID env values are rejected from the proof path.
- Non-Steve targets are rejected.
- Duplicate auth-needed events create one packet per issue.
- `DONE` triggers silent reverify before resume.
- Timeout or failed readiness remains fail-closed.
- `npm run process:harlan-auth-live-delivery-check -- --json` returns `status: pass` for `HARLAN-AUTH-LIVE-DELIVERY-002`.
- Plan Critic must return a passing score of at least 9.8 before ship.

## Details

Reuse existing code:

- `lib/harlan-auth-escalation-loop.js` already owns `auth_needed`, blocked-auth, Telegram default channel, `DONE`, reverify, timeout, and no external send from proof paths.
- `lib/source-browser-agent-harness.js` already prepares Harlan operator escalation drafts for stuck/browser/auth-needed source-browser states.
- `lib/source-session-broker.js` already defines source-session auth-needed posture and names this card as the live-delivery continuation.

Reuse existing docs:

- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` already record the Harlan Telegram bridge.
- `docs/handoffs/2026-05-28-source-browser-harlan-telegram-channel.md` records that Telegram is the default Harlan operator lane and live delivery remains this approval-bound follow-up.

Reuse existing scripts and live backlog truth:

- `scripts/process-harlan-auth-escalation-loop-check.mjs` stays the parent auth-loop proof.
- `process:foundation-ship`, `process:ship-check`, `process:fanout-check`, `backlog:hygiene`, and `foundation:verify` stay the full gates.
- Live backlog card `HARLAN-AUTH-LIVE-DELIVERY-002` stays scoped/blocked-preflight unless a live test is separately approved.

Behavior proof must use the actual function path: `evaluateHarlanAuthLiveDeliveryContract()`, `buildHarlanAuthLiveDeliveryDogfoodProof()`, `resolveHarlanTelegramDeliveryConfig()`, and `prepareHarlanTelegramDeliveryPacket()`. No substring-only proof is accepted; source-text checks are supporting safety checks only and must be paired with dogfood branches that reject weak behavior.

Gate decision tree: static syntax checks are required for changed JS files, the focused proof is required for the Harlan Telegram behavior, and full gates are required because this touches Foundation runtime/auth/operator delivery. Blast radius is limited by no-send/no-network boundaries, but the final ship still uses `process:foundation-ship`.

Speed bound: the focused proof should stay under 2 minutes by default and should not call external networks, models, providers, browsers, Telegram, Skool, MyICOR, or source runners.

## Not Next

- No live Telegram send.
- No Telegram bot creation.
- No raw Telegram token or raw chat ID in git, logs, reports, or proof output.
- No broad Telegram inbound bot/source work.
- No login, signup, source-session resume, MyICOR/Skool extraction, challenge solving, purchase, download, post, comment, message, profile mutation, credential mutation, or normal Chrome profile use.

## Risks

- Risk: the preflight accidentally becomes a live sender. Mitigation: module and focused proof reject `sendNow`, reject proof external-send flags, and scan for network sender implementation tokens.
- Risk: raw bot tokens leak into repo truth. Mitigation: config uses refs only and the proof rejects token-shaped values.
- Risk: the system treats a prepared packet as live delivery. Mitigation: closeout status is `blocked-preflight`, packet status stays `blocked_preflight` or `approved_live_test_prepared_not_sent`, and the handoff says this is not live Telegram delivery.
- Risk: Steve gets spammed. Mitigation: duplicate issue keys are deduped and one packet per issue is enforced.
- Repair path: if focused proof, backlog hygiene, `foundation:verify`, ship-check, fanout, or `process:foundation-ship` fails, keep the card scoped/executing, repair the exact invariant, and do not enable live sending.

## Proof Commands

```bash
node --check lib/harlan-auth-live-delivery.js scripts/process-harlan-auth-live-delivery-check.mjs lib/foundation-build-closeout-agent-runtime-records.js
npm run process:harlan-auth-live-delivery-check -- --json
npm run process:harlan-auth-escalation-loop-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-preflight-v1 --commitRef=HEAD
```

## Tests

- Static syntax: `node --check lib/harlan-auth-live-delivery.js scripts/process-harlan-auth-live-delivery-check.mjs lib/foundation-build-closeout-agent-runtime-records.js`.
- Focused behavior: `npm run process:harlan-auth-live-delivery-check -- --json` calls the real module path and dogfoods missing config, approved ref config, raw secret rejection, duplicate suppression, `DONE`/reverify/resume, timeout fail-closed, unsafe send rejection, wrong-target rejection, and weak-contract rejection.
- Parent regression: `npm run process:harlan-auth-escalation-loop-check -- --json` keeps the original auth-needed contract green.
- Full gate: `npm run foundation:verify -- --json-summary` and `npm run process:foundation-ship -- --card=HARLAN-AUTH-LIVE-DELIVERY-002 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-LIVE-DELIVERY-002.json --closeoutKey=harlan-auth-live-delivery-preflight-v1 --commitRef=HEAD`.

## Definition Of Done

- Harlan Telegram live-delivery preflight contract exists and passes dogfood.
- Live send remains blocked without exact Steve-approved bot/chat boundary.
- Raw secrets are rejected from proof and repo truth.
- Closeout, handoff, current docs, package script, backlog hygiene, `foundation:verify`, and ship gates are green.
- `HARLAN-AUTH-LIVE-DELIVERY-002` remains honest as blocked-preflight unless the one approved Steve-only live Telegram test is separately configured and approved.
