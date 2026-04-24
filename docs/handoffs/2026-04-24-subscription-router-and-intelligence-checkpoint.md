# Subscription Router And Intelligence Checkpoint

Date: 2026-04-24
Status: active checkpoint

## Why This Checkpoint Exists

Steve caught a real issue: shared intelligence extraction and synthesis had been built around direct OpenAI Responses API calls while paid subscription capacity was mostly idle.

That was not just a cost issue. It was an architecture issue:

- router substrate existed
- consumers were not migrated
- API fallback had become the default path
- the daily intelligence cadence was being blocked on vague "cost telemetry"

This checkpoint records the correction so the next builder does not repeat the same mistake.

## Current Truth

BCrew router owns model routing.

OpenClaw is not the system. OpenClaw is currently the working transport adapter for the ChatGPT/Codex subscription path.

Claude Code / Claude Agent SDK subscription routing should be built as another BCrew-router adapter, not as a separate system and not as blind account rotation.

Direct OpenAI Responses API is fallback-only and now blocked unless an explicit paid-run override is set.

## Commits Shipped In This Slice

- `cea339c` — `Block unguarded direct LLM spend`
- `daa2b9a` — `Track artifact extraction processing attempts`
- `697741e` — `Route shared intelligence through subscription adapter`

All three are pushed to `origin/main`.

## What Changed

### Spend Guard

Added `lib/llm-spend-policy.js`.

Direct OpenAI Responses API now requires:

```bash
LLM_ALLOW_DIRECT_OPENAI_RESPONSES=true
```

Without that flag, extraction/synthesis cannot accidentally burn paid API spend.

`foundation:verify` now checks for unguarded direct OpenAI Responses calls outside the router.

Whisper/audio transcription remains separate because it is not a Responses API path.

### Router Execution

`lib/llm-router.js` now does more than dry-run route selection.

It can:

- select a route from `llm_routes`
- execute OpenClaw/Codex subscription model calls
- log `llm_calls`
- record `estimatedCostUsd=0` for subscription-routed calls
- keep OpenAI Responses API as a guarded fallback path

Actual proof:

- extraction route: `openclaw` / `chatgpt_subscription_gateway`
- synthesis route: `openclaw` / `chatgpt_subscription_gateway`
- model path: `openai-codex/gpt-5.4`
- auth: OpenClaw OAuth profile, not `OPENAI_API_KEY`

### Consumer Migration

Migrated:

- `lib/shared-candidate-extraction.js`
- `scripts/generate-shared-comms-synthesis.mjs`

These now call `callLlm()` instead of directly calling `https://api.openai.com/v1/responses`.

Actual proof:

- one real synthesis run recorded `synth-20260424T203755Z-e6b01782ad`
- one real Gmail extraction run processed a thread through the router
- latest `llm_calls` showed `provider=openclaw`, `authPath=chatgpt_subscription_gateway`, `estimatedCostUsd=0`

### Zero-Candidate Processing Ledger

Added:

- `shared_communication_artifact_processing_runs`

Updated:

- Gmail candidate extraction
- Missive candidate extraction
- meeting transcript candidate extraction
- Intelligence Pipeline coverage

Why:

An artifact that correctly yields zero candidates should not be selected again forever just because it has no active candidates.

Now:

- successful zero-candidate artifacts are marked processed for that extractor version
- failed artifacts remain retryable
- dashboard/API can distinguish processed coverage from candidate-yield coverage

### Composite Intelligence Bite

`shared-comms-intelligence-bite` remains manual for now.

Fixed:

- parent timeout raised from `4200` to `6000` seconds

Reason:

Child job maxes can total more than the old parent timeout.

## Verification

Latest verification:

```bash
npm run foundation:verify
```

Result:

- `24/24` checks passed

Important verified checks:

- no unguarded direct OpenAI Responses API calls outside router
- LLM runtime visible: `7 credentials / 10 routes`
- latest persisted synthesis visible
- extraction processing/candidate depth visible
- Owners/FUB sheet verification still green

## Latest Useful Intelligence Proof

Latest router-backed synthesis:

- `synth-20260424T203755Z-e6b01782ad`
- `5` ranked items
- `20` candidates read
- subscription-routed through `openclaw/chatgpt_subscription_gateway`

Top issues surfaced:

- KPI deal-data display/sync failure
- June cash gap
- SocialPilot access/publishing instability
- Union Street delivery retry
- Loom account migration/access issue

This proves the system is generating useful live intelligence from the archive/candidate pipeline.

## Still Open

Do not call Foundation "done" yet.

Open items:

- Claude Code / Claude Agent SDK subscription adapter under `lib/llm-router.js`
- hub-dedicated capacity lanes: Foundation, Marketing, Strategy, Ops, Sales, Recruiting, Agent Hub, Steve Zahnd, MarketMasters, Steve-owned education/monetization
- daily scheduled `shared-comms-intelligence-bite`
- monitored router proof over a few bounded runs before daily scheduling
- meeting notes current-day scheduling after retry/report confidence
- Drive retry semantics and review/export gates
- subject-person redaction before Strategy Hub or agents can expose sensitive people evidence
- Harlan/Crewbert remain later, after governed runtime/source/privacy loops are stable

## Next Build Order

1. Add Claude Code / Claude Agent SDK subscription adapter to `lib/llm-router.js`.
2. Add hub-capacity registry fields or policy rows so routes are assigned by hub, not blind account rotation.
3. Run monitored bounded extraction/synthesis bites through the router and confirm `llm_calls` remain subscription-routed.
4. Schedule one daily `shared-comms-intelligence-bite` after the route proof stays clean.
5. Continue Drive/meeting retry hardening; do not restart giant manual backfills.

## Rules Locked By This Checkpoint

- BCrew router owns routing.
- OpenClaw is an adapter, not the OS.
- Claude Code subscription path should become another adapter.
- API fallback is allowed only when explicit, logged, and intentional.
- Zero-candidate artifacts must be remembered as processed.
- Daily intelligence is the goal, but scheduling waits for a clean subscription-routed proof, not vague cost debate.
